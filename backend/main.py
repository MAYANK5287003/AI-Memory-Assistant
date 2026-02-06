from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from pathlib import Path
import numpy as np

# =========================
# CORE MODULES (PHASE 1–3)
# =========================
from db import engine
from ai import get_embedding
from text_cleaner import clean_text
from file_text_extractor import (
    extract_text_from_pdf,
    extract_text_from_excel,
)
from faiss_index import search_faiss

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
# SMART QUERY ROUTER (PHASE 5)
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

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
FACE_IMG_DIR.mkdir(parents=True, exist_ok=True)

# =========================
# BASIC ROUTE
# =========================
@app.get("/")
def home():
    return {"message": "AI Memory Assistant running (Phases 1–5)"}

# ======================================================
# PHASE 1–3: TEXT MEMORY
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

def text_search_pipeline(query: str):
    query_vec = np.array(get_embedding(query)).astype("float32")
    memory_ids = search_faiss(query, top_k=5)

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

            mem_vec = np.array(get_embedding(row[0])).astype("float32")
            score = np.dot(query_vec, mem_vec) / (
                np.linalg.norm(query_vec) * np.linalg.norm(mem_vec)
            )

            if score > best_score:
                best_score = score
                best_text = row[0]

    if best_score < 0.35:
        return "I don’t have enough information to answer this yet."

    return best_text

# ======================================================
# PHASE 2: FILE UPLOAD (PDF / EXCEL / OCR STORAGE)
# ======================================================

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as f:
        f.write(await file.read())

    filename_lower = file.filename.lower()
    extracted_text = ""

    if filename_lower.endswith(".pdf"):
        extracted_text = extract_text_from_pdf(str(file_path))
    elif filename_lower.endswith((".xls", ".xlsx")):
        extracted_text = extract_text_from_excel(str(file_path))

    cleaned_text = clean_text(extracted_text)

    if cleaned_text:
        with engine.connect() as conn:
            conn.execute(
                text("INSERT INTO memories (content) VALUES (:c)"),
                {"c": cleaned_text},
            )
            conn.commit()

    return {"status": "file uploaded"}

# ======================================================
# PHASE 4: FACE MEMORY
# ======================================================

@app.post("/face/upload")
async def upload_face_image(file: UploadFile = File(...)):
    image_path = FACE_IMG_DIR / file.filename

    with open(image_path, "wb") as f:
        f.write(await file.read())

    faces = detect_and_crop_faces(str(image_path))
    added = []

    for face in faces:
        emb = get_face_embedding(face["face_path"])
        if emb is not None:
            add_face_embedding(face_index, face["face_id"], emb)
            added.append(face["face_id"])

    return {"faces_indexed": len(added)}

def face_search_pipeline(file: UploadFile):
    query_path = FACE_IMG_DIR / f"query_{file.filename}"

    with open(query_path, "wb") as f:
        f.write(file.file.read())

    faces = detect_and_crop_faces(str(query_path))
    if not faces:
        return []

    emb = get_face_embedding(faces[0]["face_path"])
    return search_similar_faces(face_index, emb, top_k=10)

# ======================================================
# PHASE 5: SMART QUERY ROUTER (MAIN ENTRY)
# ======================================================

class SmartQueryRequest(BaseModel):
    query: str

@app.post("/smart-query")
def smart_query(request: SmartQueryRequest):
    route = query_router.detect_route(request.query)

    # -------- TEXT --------
    if route == QueryRoute.TEXT:
        answer = text_search_pipeline(request.query)
        return {"route": "TEXT", "answer": answer}

    # -------- OCR --------
    if route == QueryRoute.OCR:
        answer = text_search_pipeline(request.query)
        return {"route": "OCR", "answer": answer}

    # -------- HYBRID --------
    if route == QueryRoute.HYBRID:
        answer = text_search_pipeline(request.query)
        return {
            "route": "HYBRID",
            "answer": answer,
            "note": "Answer derived from combined text + OCR memories"
        }

    # -------- FACE --------
    return {
        "route": "FACE",
        "message": "Please upload an image for face search"
    }
