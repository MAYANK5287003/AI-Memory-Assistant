from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from pathlib import Path
import numpy as np
import shutil
from datetime import datetime


# =========================
# CORE MODULES
# =========================
from db import engine
from init_db import init_db
from ai import get_embedding
from text_cleaner import clean_text
from document_grounding import extract_pdf_chunks
from text_chunker import chunk_text
from file_text_extractor import (
    extract_text_from_pdf,
    extract_text_from_excel,
)
from faiss_index import search_faiss, build_faiss_index
from layout_ocr import extract_ocr_chunks


# =========================
# FACE MEMORY (PHASE 4)
# =========================
from face_detection import detect_and_crop_faces
from face_embedding import get_face_embedding
from face_index import (
    load_index,
    add_face_embedding,
    search_similar_faces,
)
from label_propagation import LabelPropagation

# =========================
# SMART QUERY ROUTER
# =========================
from query_router import SmartQueryRouter, QueryRoute

# =========================
# APP SETUP
# =========================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# INIT SYSTEMS
# =========================
face_index = load_index()
label_manager = LabelPropagation()
query_router = SmartQueryRouter()

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
FACE_IMG_DIR = BASE_DIR / "storage" / "face_images"
PHOTO_DIR = BASE_DIR / "storage" / "photos"
UNLABELED_DIR = PHOTO_DIR / "unlabelled"

PHOTO_DIR.mkdir(parents=True, exist_ok=True)
UNLABELED_DIR.mkdir(parents=True, exist_ok=True)


UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
FACE_IMG_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/files/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads"
)
app.mount(
    "/files/face_images",
    StaticFiles(directory=FACE_IMG_DIR),
    name="face_images",
)
app.mount(
    "/files/photos",
    StaticFiles(directory=PHOTO_DIR),
    name="photos",
)

#make database tables
init_db()
# Build FAISS at startup
build_faiss_index()

# =========================
# BASIC ROUTE
# =========================
@app.get("/")
def home():
    return {"message": "AI Memory Assistant running (Phases 1–5)"}

# =========================
# TEXT MEMORY
# =========================
class MemoryRequest(BaseModel):
    content: str

@app.post("/memory")
def add_memory(request: MemoryRequest):
    with engine.connect() as conn:
        conn.execute(
            text("INSERT INTO memories (content) VALUES (:c)"),
            {"c": request.content},
        )
        conn.commit()

    build_faiss_index()
    return {"status": "memory saved"}

def text_search_pipeline(query: str):
    query_vec = np.array(get_embedding(query)).astype("float32")
    memory_ids = search_faiss(query, top_k=5)

    if not memory_ids:
        return {
            "answer": "I don’t have enough information yet.",
            "evidence": None
        }

    best_score = -1
    best_row = None

    with engine.connect() as conn:
        for mid in memory_ids:
            row = conn.execute(
                text("""
                    SELECT 
                        m.id,
                        m.content,
                        d.id AS document_id,
                        d.filename
                    FROM memories m
                    LEFT JOIN document_memories dm ON dm.memory_id = m.id
                    LEFT JOIN documents d ON d.id = dm.document_id
                    WHERE m.id = :id
                """),
                {"id": mid},
            ).fetchone()

            if not row:
                continue

            mem_vec = np.array(get_embedding(row.content)).astype("float32")
            score = np.dot(query_vec, mem_vec) / (
                np.linalg.norm(query_vec) * np.linalg.norm(mem_vec)
            )

            if score > best_score:
                best_score = score
                best_row = row

    if best_score < 0.25 or not best_row:
        return {
            "answer": "I don’t have enough information yet.",
            "evidence": None
        }
 
    evidence = None

    if best_row and best_row.filename:
        evidence = {
            "document_id": best_row.document_id,
            "filename": best_row.filename,
            "file_url": f"http://127.0.0.1:8000/files/uploads/{best_row.filename}",
            "file_type": (
                "image" if best_row.filename.lower().endswith((".png", ".jpg", ".jpeg"))
                else "pdf" if best_row.filename.lower().endswith(".pdf")
                else "excel"
            ),
            "chunk": best_row.content
        }

    return {
        "answer": best_row.content,
        "evidence": evidence
    }
    

# =========================
# FILE UPLOAD (PDF / EXCEL / IMAGE OCR)
# =========================
@app.post("/face/upload")
async def upload_face(file: UploadFile = File(...)):

    original_image_path = UNLABELED_DIR / file.filename
    image_path = original_image_path


    with open(image_path, "wb") as f:
        f.write(await file.read())

    faces = detect_and_crop_faces(str(image_path))
    if not faces:
        return {"error": "No face detected"}

    from face_index import save_index

    response_faces = []

    for face in faces:

        emb = get_face_embedding(face["face_path"])
        if emb is None:
            continue

        results = search_similar_faces(face_index, emb, top_k=1)

        label = None
        unmatched = True

        if results and results[0]["similarity"] > 0.75:
            unmatched = False

            with engine.connect() as conn:
                row = conn.execute(
                    text("SELECT label FROM faces WHERE id=:id"),
                    {"id": results[0]["face_id"]},
                ).fetchone()

                if row:
                    label = row[0]
                
                    if label:
                        label_folder = PHOTO_DIR / label.lower()
                        label_folder.mkdir(parents=True, exist_ok=True)

                        new_path = label_folder / image_path.name

                        if original_image_path.exists() and not new_path.exists():
                            shutil.copy2(original_image_path, new_path)



        

        add_face_embedding(face_index, face["face_id"], emb)

        with engine.connect() as conn:
            conn.execute(
                text("""
                    INSERT INTO faces (id, image_path, label)
                    VALUES (:id, :path, :label)
                """),
                {
                    "id": face["face_id"],
                    "path": str(image_path),
                    "label": label,
                },
            )
            conn.commit()

        response_faces.append({
            "face_id": face["face_id"],
            "unmatched": unmatched,
            "label": label,
            "crop_url": f"http://127.0.0.1:8000/files/face_images/{Path(face['face_path']).name}"
        })

    save_index(face_index)

    return {"faces": response_faces}



class FaceLabelRequest(BaseModel):
    cluster_id: str
    label: str

@app.post("/face/label")
def label_face(req: FaceLabelRequest):

    with engine.connect() as conn:

        row = conn.execute(
            text("SELECT image_path FROM faces WHERE id=:id"),
            {"id": req.cluster_id}
        ).fetchone()

        if row:
            image_path = Path(row[0])
            label_folder = PHOTO_DIR / req.label.lower()
            label_folder.mkdir(parents=True, exist_ok=True)

            new_path = label_folder / image_path.name

            if image_path.exists() and not new_path.exists():
                shutil.copy2(image_path, new_path)


            conn.execute(
                text("""
                    UPDATE faces
                    SET label=:label, image_path=:path
                    WHERE id=:id
                """),
                {
                    "label": req.label,
                    "path": str(new_path),
                    "id": req.cluster_id
                },
            )

        conn.commit()

    return {"status": "label saved"}



@app.get("/face/search-by-label")
def search_face_by_label(label: str):
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT image_path
                FROM faces
                WHERE LOWER(label) = LOWER(:label)
            """),
            {"label": label},
        ).fetchall()

    images = []
    for r in rows:
        filename = Path(r[0]).name
        images.append(
            f"http://127.0.0.1:8000/files/photos/{label.lower()}/{filename}"
        )


    return {"images": images}



@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as f:
        f.write(await file.read())

    filename = file.filename.lower()

    # 1️⃣ INSERT DOCUMENT
    with engine.connect() as conn:
        # detect file type
        if filename.endswith(".pdf"):
            file_type = "pdf"
        elif filename.endswith((".xls", ".xlsx")):
            file_type = "excel"
        else:
            file_type = "image"

        result = conn.execute(
            text("""
                INSERT INTO documents (filename, file_path, file_type)
                VALUES (:f, :p, :t)
            """),
            {
                "f": file.filename,
                "p": str(file_path),
                "t": file_type,
            },
        )

        document_id = result.lastrowid
        conn.commit()

    texts = []



    if filename.endswith(".pdf"):

        pdf_chunks = extract_pdf_chunks(str(file_path))

        for chunk in pdf_chunks:
            content = chunk["content"]

            # small safety clean
            content = clean_text(content)

            if len(content) > 40:
                texts.append(content)



    elif filename.endswith((".xls", ".xlsx")):
        texts.append(extract_text_from_excel(str(file_path)))

    else:
        ocr_chunks = extract_ocr_chunks(str(file_path))
        texts.extend([c["content"] for c in ocr_chunks])

    # 2️⃣ STORE MEMORIES + LINK
    with engine.connect() as conn:
        for t in texts:
            t = clean_text(t)
            if len(t) < 20:
                continue

            result = conn.execute(
                text("""
                    INSERT INTO memories (content)
                    VALUES (:c)
                """),
                {"c": t},
            )
            memory_id = result.lastrowid

            conn.execute(
                text("""
                    INSERT INTO document_memories (document_id, memory_id)
                    VALUES (:d, :m)
                """),
                {"d": document_id, "m": memory_id},
            )

        conn.commit()

    # 3️⃣ REBUILD FAISS
    build_faiss_index()

    return {
        "status": "file processed",
        "document_id": document_id,
        "chunks_added": len(texts),
    }

# =========================
# SMART QUERY
# =========================
class SmartQueryRequest(BaseModel):
    query: str

@app.post("/smart-query")
def smart_query(request: SmartQueryRequest):
    route = query_router.detect_route(request.query)

    if route in (QueryRoute.TEXT, QueryRoute.OCR, QueryRoute.HYBRID):
        result = text_search_pipeline(request.query)

        return {
            "route": route,
            "answer": result["answer"],
            "evidence": result["evidence"]
        }

    return {
        "route": "FACE",
        "message": "Please upload an image for face search"
    }
