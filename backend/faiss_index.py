import faiss
import numpy as np
from ai import get_embedding
from sqlalchemy import text
from db import engine

DIMENSION = 384  # embedding size (very important)

index = faiss.IndexFlatL2(DIMENSION)
id_map = []  # maps FAISS index -> memory_id


def build_faiss_index():
    global index, id_map
    index.reset()
    id_map = []

    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, content FROM memories")
        )
        memories = result.fetchall()

    vectors = []

    for mem_id, content in memories:
        emb = np.array(get_embedding(content)).astype("float32")
        vectors.append(emb)
        id_map.append(mem_id)

    if vectors:
        vectors = np.vstack(vectors)
        index.add(vectors)

    print(f"FAISS index built with {len(id_map)} vectors")


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

