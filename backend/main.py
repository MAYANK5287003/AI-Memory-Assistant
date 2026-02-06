from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from pathlib import Path
import numpy as np

# =========================
# CORE MODULES
# =========================
from db import engine
from ai import get_embedding
from text_cleaner import clean_text
from file_text_extractor import (
    extract_text_from_pdf,
    extract_text_from_excel,
)
from faiss_index import search_faiss
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

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
FACE_IMG_DIR.mkdir(parents=True, exist_ok=True)

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
    return {"status": "memory saved"}

def text_search_pipeline(query: str):
    query_vec = np.array(get_embedding(query)).astype("float32")
    memory_ids = search_faiss(query, top_k=5)

    best_score = -1
    best_text = None

    with engine.connect() as conn:
        for mid in memory_ids:
            row = conn.execute(
                text("SELECT content FROM memories WHERE id=:id"),
                {"id": mid},
            ).fetchone()
            if not row:
                continue
            vec = np.array(get_embedding(row[0])).astype("float32")
            score = np.dot(query_vec, vec) / (
                np.linalg.norm(query_vec) * np.linalg.norm(vec)
            )
            if score > best_score:
                best_score = score
                best_text = row[0]

    return best_text or "I don’t have enough information yet."

# =========================
# FILE UPLOAD (PDF / EXCEL / IMAGE OCR)
# =========================
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as f:
        f.write(await file.read())

    name = file.filename.lower()

    texts = []

    if name.endswith(".pdf"):
        texts.append(extract_text_from_pdf(str(file_path)))

    elif name.endswith((".xls", ".xlsx")):
        texts.append(extract_text_from_excel(str(file_path)))

    else:
        ocr_chunks = extract_ocr_chunks(str(file_path))
        texts.extend([c["content"] for c in ocr_chunks])

    with engine.connect() as conn:
        for t in texts:
            t = clean_text(t)
            if len(t) > 20:
                conn.execute(
                    text("INSERT INTO memories (content) VALUES (:c)"),
                    {"c": t},
                )
        conn.commit()

    return {"status": "file processed", "chunks_added": len(texts)}

# =========================
# SMART QUERY
# =========================
class SmartQueryRequest(BaseModel):
    query: str

@app.post("/smart-query")
def smart_query(request: SmartQueryRequest):
    route = query_router.detect_route(request.query)

    if route in (QueryRoute.TEXT, QueryRoute.OCR, QueryRoute.HYBRID):
        return {
            "route": route.name,
            "answer": text_search_pipeline(request.query)
        }

    return {
        "route": "FACE",
        "message": "Please upload an image for face search"
    }
