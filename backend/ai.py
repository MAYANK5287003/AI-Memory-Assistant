from sentence_transformers import SentenceTransformer

model = None   # not loaded at import


def get_model():
    global model

    if model is None:
        print("🤖 Loading embedding model first time...")
        model = SentenceTransformer("all-MiniLM-L6-v2")

    return model


def get_embedding(text: str):
    return get_model().encode(text)