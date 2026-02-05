from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from pathlib import Path
import numpy as np
from image_ocr import extract_text_from_image
from faiss_index import build_faiss_index, search_faiss
from db import engine
from ai import get_embedding
from text_cleaner import clean_text
from file_text_extractor import (
    extract_text_from_pdf,
    extract_text_from_excel,
)

# ---------------- APP SETUP ----------------

app = FastAPI()
build_faiss_index()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- BASIC ROUTE ----------------

@app.get("/")
def home():
    return {"message": "AI Memory Assistant backend running"}

# ---------------- TEXT MEMORY ----------------

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

# ---------------- SEMANTIC SEARCH ----------------
@app.get("/search")
def search_memory(query: str):
    query_vec = np.array(get_embedding(query)).astype("float32")

    # 1️⃣ Get TOP-5 candidates from FAISS
    memory_ids = search_faiss(query, top_k=5)

    if not memory_ids:
        return {"query": query, "best_match": None}

    best_score = -1
    best_text = None

    with engine.connect() as conn:
        for mem_id in memory_ids:
            result = conn.execute(
                text("SELECT content FROM memories WHERE id = :id"),
                {"id": mem_id},
            )
            row = result.fetchone()
            if not row:
                continue

            mem_text = row[0]
            mem_vec = np.array(get_embedding(mem_text)).astype("float32")

            # 2️⃣ Re-rank using cosine similarity
            score = np.dot(query_vec, mem_vec) / (
                np.linalg.norm(query_vec) * np.linalg.norm(mem_vec)
            )

            if score > best_score:
                best_score = score
                best_text = mem_text

    # 3️⃣ Confidence threshold
    if best_score < 0.35:
        return {
            "query": query,
            "best_match": "I don’t have enough information to answer this yet."
        }

    return {
        "query": query,
        "best_match": best_text
    }


def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# ---------------- FILE UPLOAD ----------------

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    BASE_DIR = Path(__file__).resolve().parent.parent
    upload_dir = BASE_DIR / "storage" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename

    # save file to disk
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # detect file type
    filename_lower = file.filename.lower()
    if filename_lower.endswith(".pdf"):
        file_type = "pdf"
    elif filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls"):
        file_type = "excel"
    else:
        file_type = "image"

    # ---------------- STORE DOCUMENT ----------------
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

    # ---------------- EXTRACT TEXT ----------------
    extracted_text = ""

    if file_type == "pdf":
        extracted_text = extract_text_from_pdf(str(file_path))

    elif file_type == "excel":
        extracted_text = extract_text_from_excel(str(file_path))

    # (image OCR comes in Phase 2 Step 4)

    # ---------------- CLEAN + STORE MEMORY ----------------
    cleaned_text = clean_text(extracted_text)

    if cleaned_text:
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    INSERT INTO memories (content)
                    VALUES (:content)
                    RETURNING id
                """),
                {"content": cleaned_text},
            )
            memory_id = result.scalar()

            conn.execute(
                text("""
                    INSERT INTO document_memories (document_id, memory_id)
                    VALUES (:doc_id, :mem_id)
                """),
                {
                    "doc_id": document_id,
                    "mem_id": memory_id,
                },
            )
            conn.commit()

    return {
        "status": "file uploaded",
        "filename": file.filename,
        "file_type": file_type,
        "document_id": document_id,
    }
