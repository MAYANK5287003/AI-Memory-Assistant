# face_detection.py

import cv2
from mtcnn import MTCNN
from PIL import Image
import uuid
import os

# Initialize detector once
detector = MTCNN()

# Directory to store cropped faces
FACE_DIR = "storage/faces"
os.makedirs(FACE_DIR, exist_ok=True)


def detect_and_crop_faces(image_path: str):
    """
    Detects faces in an image and saves cropped face images.

    Returns:
        List of dicts with face_id, face_path, confidence
    """

    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"❌ Could not read image: {image_path}")

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = detector.detect_faces(rgb)

    faces = []

    for r in results:
        x, y, w, h = r["box"]

        # Skip very small faces
        if w < 40 or h < 40:
            continue

        crop = rgb[y:y + h, x:x + w]

        face_id = str(uuid.uuid4())
        face_path = os.path.join(FACE_DIR, f"{face_id}.jpg")

        Image.fromarray(crop).save(face_path)

        faces.append({
            "face_id": face_id,
            "face_path": face_path,
            "confidence": float(r["confidence"])
        })

    return faces
