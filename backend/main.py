from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from pathlib import Path
import numpy as np

# ---------- EXISTING MODULES ----------
from db import engine
from ai import get_embedding
from text_cleaner import clean_text
from file_text_extractor import (
    extract_text_from_pdf,
    extract_text_from_excel,
)

# ---------- FACE MEMORY (PHASE 4) ----------
from face_detection import detect_and_crop_faces
from face_embedding import get_face_embedding
from face_index import (
    load_index,
    add_face_embedding,
    search_similar_faces,
)
from face_clustering import cluster_face_embeddings
from label_propagation import LabelPropagation

# ---------- APP SETUP ----------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- INIT MEMORY SYSTEMS ----------
# Text FAISS already handled in your faiss_index module
face_index = load_index()
label_manager = LabelPropagation()

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
FACE_IMG_DIR = BASE_DIR / "storage" / "face_images"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
FACE_IMG_DIR.mkdir(parents=True, exist_ok=True)

# ---------- BASIC ROUTE ----------
@app.get("/")
def home():
    return {"message": "AI Memory Assistant backend running"}

# ======================================================
#                    TEXT MEMORY
# ======================================================

class MemoryRequest(BaseModel):
    content: str

@app.post("/memory")
def add_memory(request: MemoryRequest):
    with engine.connect() as conn:
        conn.execute(
            text("INSERT INTO memories (content) VALUES (:content)"),
            {"content": request.content},
        )
        conn.commit()
    return {"status": "memory saved"}

# ---------- SEMANTIC SEARCH (TEXT) ----------
@app.get("/search")
def search_memory(query: str):
    query_vec = np.array(get_embedding(query)).astype("float32")

    from faiss_index import search_faiss
    memory_ids = search_faiss(query, top_k=5)

    if not memory_ids:
        return {"query": query, "best_match": None}

    best_score = -1
    best_text = None

    with engine.connect() as conn:
        for mem_id in memory_ids:
            row = conn.execute(
                text("SELECT content FROM memories WHERE id = :id"),
                {"id": mem_id},
            ).fetchone()

            if not row:
                continue

            mem_text = row[0]
            mem_vec = np.array(get_embedding(mem_text)).astype("float32")

            score = np.dot(query_vec, mem_vec) / (
                np.linalg.norm(query_vec) * np.linalg.norm(mem_vec)
            )

            if score > best_score:
                best_score = score
                best_text = mem_text

    if best_score < 0.35:
        return {
            "query": query,
            "best_match": "I don’t have enough information to answer this yet."
        }

    return {"query": query, "best_match": best_text}

# ======================================================
#                    FILE UPLOAD
# ======================================================

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as f:
        f.write(await file.read())

    filename_lower = file.filename.lower()
    if filename_lower.endswith(".pdf"):
        file_type = "pdf"
        extracted_text = extract_text_from_pdf(str(file_path))
    elif filename_lower.endswith((".xls", ".xlsx")):
        file_type = "excel"
        extracted_text = extract_text_from_excel(str(file_path))
    else:
        file_type = "image"
        extracted_text = ""

    with engine.connect() as conn:
        result = conn.execute(
            text("""
                INSERT INTO documents (filename, file_path, file_type)
                VALUES (:filename, :file_path, :file_type)
                RETURNING id
            """),
            {
                "filename": file.filename,
                "file_path": str(file_path),
                "file_type": file_type,
            },
        )
        document_id = result.scalar()
        conn.commit()

    cleaned_text = clean_text(extracted_text)

    if cleaned_text:
        with engine.connect() as conn:
            mem_id = conn.execute(
                text("INSERT INTO memories (content) VALUES (:c) RETURNING id"),
                {"c": cleaned_text},
            ).scalar()

            conn.execute(
                text("""
                    INSERT INTO document_memories (document_id, memory_id)
                    VALUES (:d, :m)
                """),
                {"d": document_id, "m": mem_id},
            )
            conn.commit()

    return {
        "status": "file uploaded",
        "filename": file.filename,
        "document_id": document_id,
    }

# ======================================================
#                  FACE MEMORY (PHASE 4)
# ======================================================

@app.post("/face/upload")
async def upload_face_image(file: UploadFile = File(...)):
    image_path = FACE_IMG_DIR / file.filename

    with open(image_path, "wb") as f:
        f.write(await file.read())

    faces = detect_and_crop_faces(str(image_path))
    if not faces:
        return {"status": "no face detected"}

    added = []
    for face in faces:
        emb = get_face_embedding(face["face_path"])
        if emb is None:
            continue
        add_face_embedding(face_index, face["face_id"], emb)
        added.append(face["face_id"])

    return {"status": "faces indexed", "count": len(added)}

@app.post("/face/search")
async def search_face(file: UploadFile = File(...)):
    query_path = FACE_IMG_DIR / f"query_{file.filename}"

    with open(query_path, "wb") as f:
        f.write(await file.read())

    faces = detect_and_crop_faces(str(query_path))
    if not faces:
        return {"status": "no face detected"}

    emb = get_face_embedding(faces[0]["face_path"])
    results = search_similar_faces(face_index, emb, top_k=10)

    return {"matches": results}

# ---------- LABEL MANAGEMENT ----------

class LabelRequest(BaseModel):
    cluster_id: int
    label: str

@app.post("/face/label")
def set_label(req: LabelRequest):
    label_manager.set_label(req.cluster_id, req.label)
    return {"status": "label assigned"}

@app.post("/face/label/rename")
def rename_label(req: LabelRequest):
    label_manager.rename_label(req.cluster_id, req.label)
    return {"status": "label renamed"}

@app.post("/face/label/remove")
def remove_label(cluster_id: int):
    label_manager.remove_label(cluster_id)
    return {"status": "label removed"}
