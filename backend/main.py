from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from pathlib import Path
import numpy as np

# ⭐ UPDATED
import shutil
from datetime import datetime

# =========================
# CORE MODULES
# =========================
from db import engine
from init_db import init_db
from ai import get_embedding
from text_cleaner import clean_text
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

# ⭐ UPDATED — new folder for FULL photos
PHOTO_DIR = BASE_DIR / "storage" / "photos"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
FACE_IMG_DIR.mkdir(parents=True, exist_ok=True)
PHOTO_DIR.mkdir(parents=True, exist_ok=True)  # ⭐ UPDATED

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

# ⭐ UPDATED — serve full images
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

    if best_score < 0.35 or not best_row:
        return {
            "answer": "I don’t have enough information yet.",
            "evidence": None
        }

    return {
        "answer": best_row.content,
        "evidence": {
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
        if best_row.document_id else None
    }


# =========================
# FILE UPLOAD (PDF / EXCEL / IMAGE OCR)
# =========================
@app.post("/face/upload")
async def upload_face(file: UploadFile = File(...)):

    # ⭐ UPDATED — save FULL image in photos folder
    image_path = PHOTO_DIR / file.filename

    with open(image_path, "wb") as f:
        f.write(await file.read())

    faces = detect_and_crop_faces(str(image_path))
    if not faces:
        return {"error": "No face detected"}

    face = faces[0]
    emb = get_face_embedding(face["face_path"])
    if emb is None:
        return {"error": "Face embedding failed"}

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

    add_face_embedding(face_index, face["face_id"], emb)

    with engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO faces (id, image_path, label, created_at)
                VALUES (:id, :path, :label, :time)
            """),
            {
                "id": face["face_id"],
                "path": str(image_path),   # ⭐ UPDATED — FULL image saved
                "label": label,
                "time": datetime.utcnow().isoformat()  # ⭐ UPDATED
            },
        )
        conn.commit()

    return {
        "unmatched": unmatched,
        "cluster_id": face["face_id"] if unmatched else None,
        "label": label,
    }


class FaceLabelRequest(BaseModel):
    cluster_id: str
    label: str

@app.post("/face/label")
def label_face(req: FaceLabelRequest):
    with engine.connect() as conn:

        # ⭐ UPDATED — create folder per label
        label_folder = PHOTO_DIR / req.label.lower()
        label_folder.mkdir(parents=True, exist_ok=True)

        row = conn.execute(
            text("SELECT image_path FROM faces WHERE id=:id"),
            {"id": req.cluster_id}
        ).fetchone()

        if row:
            old_path = Path(row[0])
            new_path = label_folder / old_path.name

            if old_path.exists():
                shutil.move(old_path, new_path)

            conn.execute(
                text("""
                    UPDATE faces
                    SET label = :label,
                        image_path = :path
                    WHERE id = :id
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
            f"http://127.0.0.1:8000/files/photos/{label.lower()}/{filename}"  # ⭐ UPDATED
        )

    return {"images": images}
