import faiss
import numpy as np
from ai import get_embedding
from sqlalchemy import text
from db import STORAGE_DIR, engine
from pathlib import Path
import os

APP_DATA = Path(os.getenv("APPDATA", Path.home()))
BASE_DIR = APP_DATA / "AI_Memory_Assistant"
STORAGE_DIR = BASE_DIR / "storage"
FAISS_FILE = STORAGE_DIR / "faiss.index"
IDMAP_FILE = STORAGE_DIR / "faiss_ids.npy"

DIMENSION = 384  # embedding size (very important)

index = faiss.IndexFlatL2(DIMENSION)
id_map = []  # maps FAISS index -> memory_id


def build_faiss_index(force_rebuild=False):
    global index, id_map

    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    # ⚡ FAST PATH — load existing index
    if FAISS_FILE.exists() and IDMAP_FILE.exists() and not force_rebuild:
        print("⚡ Loading FAISS from disk...")
        index = faiss.read_index(str(FAISS_FILE))
        id_map = np.load(IDMAP_FILE).tolist()
        print(f"Loaded {len(id_map)} vectors instantly")
        return

    # 🐢 FIRST RUN — build index
    print("🐢 Building FAISS first time...")

    index.reset()
    id_map = []

    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, content FROM memories"))
        memories = result.fetchall()

    vectors = []

    for mem_id, content in memories:
        emb = np.array(get_embedding(content)).astype("float32")
        vectors.append(emb)
        id_map.append(mem_id)

    if vectors:
        vectors = np.vstack(vectors)
        index.add(vectors)

    # ✅ SAVE TO DISK
    faiss.write_index(index, str(FAISS_FILE))
    np.save(IDMAP_FILE, np.array(id_map))

    print(f"FAISS built & saved with {len(id_map)} vectors")

def search_faiss(query: str, top_k: int = 3):
    if index.ntotal == 0:
        return []

    query_vec = np.array(get_embedding(query)).astype("float32").reshape(1, -1)
    distances, indices = index.search(query_vec, top_k)

    results = []
    for idx in indices[0]:
        if idx != -1 and idx < len(id_map):
            results.append(id_map[idx])

    return results

