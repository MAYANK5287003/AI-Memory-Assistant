# face_index.py

import faiss
import numpy as np
import os
import pickle

EMBEDDING_DIM = 512
INDEX_PATH = "storage/face_faiss.index"
META_PATH = "storage/face_faiss_meta.pkl"

# In-memory mappings
face_ids = []  # index -> face_id

def create_index():
    return faiss.IndexFlatIP(EMBEDDING_DIM)


def load_index():
    if os.path.exists(INDEX_PATH) and os.path.exists(META_PATH):
        index = faiss.read_index(INDEX_PATH)
        with open(META_PATH, "rb") as f:
            global face_ids
            face_ids = pickle.load(f)
        return index
    else:
        return create_index()


def save_index(index):
    faiss.write_index(index, INDEX_PATH)
    with open(META_PATH, "wb") as f:
        pickle.dump(face_ids, f)


def add_face_embedding(index, face_id: str, embedding: np.ndarray):
    """
    embedding must be shape (512,) and L2-normalized
    """
    embedding = embedding.reshape(1, -1).astype("float32")
    index.add(embedding)
    face_ids.append(face_id)


def search_similar_faces(index, query_embedding, top_k=5):
    query_embedding = query_embedding.reshape(1, -1).astype("float32")
    scores, indices = index.search(query_embedding, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue
        results.append({
            "face_id": face_ids[idx],
            "similarity": float(score)
        })

    return results
