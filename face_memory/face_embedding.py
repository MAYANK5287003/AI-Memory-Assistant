# face_embedding.py

import torch
import numpy as np
from PIL import Image
from facenet_pytorch import InceptionResnetV1

# Load FaceNet model (CPU only)
model = InceptionResnetV1(
    pretrained="vggface2"
).eval()


def get_face_embedding(face_image_path: str):
    """
    Generate a 512-D normalized face embedding from a cropped face image.

    Args:
        face_image_path (str): path to cropped face image

    Returns:
        np.ndarray (512,) float32 normalized embedding
        or None if image cannot be processed
    """

    try:
        img = Image.open(face_image_path).convert("RGB")
    except Exception:
        return None

    # FaceNet input size
    img = img.resize((160, 160))

    img_np = np.asarray(img).astype("float32") / 255.0
    img_tensor = torch.from_numpy(img_np).permute(2, 0, 1).unsqueeze(0)

    with torch.no_grad():
        embedding = model(img_tensor)

    emb = embedding.cpu().numpy()[0]

    # L2 normalize (CRITICAL for cosine similarity)
    norm = np.linalg.norm(emb)
    if norm == 0:
        return None

    emb = emb / norm
    return emb.astype("float32")
