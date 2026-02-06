# document_grounding.py

from typing import List, Dict
import re

# ---------- IMAGE OCR ----------
import pytesseract
from PIL import Image

# ---------- PDF ----------
import fitz  # PyMuPDF


# =========================================================
# IMAGE GROUNDING (OCR + LAYOUT + BBOX)
# =========================================================

def extract_image_chunks(image_path: str) -> List[Dict]:
    """
    Extract text chunks from an image with bounding boxes.

    Returns:
    [
      {
        "content": "...",
        "bbox": [x1, y1, x2, y2]
      }
    ]
    """

    img = Image.open(image_path)

    df = pytesseract.image_to_data(
        img,
        output_type=pytesseract.Output.DATAFRAME
    )

    df = df.dropna()
    df = df[df.text.str.strip() != ""]

    chunks = []

    words = []
    x1 = y1 = 1e9
    x2 = y2 = 0

    for _, row in df.iterrows():
        text = row["text"]
        left, top, width, height = (
            int(row["left"]),
            int(row["top"]),
            int(row["width"]),
            int(row["height"]),
        )

        words.append(text)

        x1 = min(x1, left)
        y1 = min(y1, top)
        x2 = max(x2, left + width)
        y2 = max(y2, top + height)

        # Chunk break (sentence or size)
        joined = " ".join(words)
        if text.endswith((".", "!", "?")) or len(joined) > 400:
            cleaned = clean_text(joined)

            if len(cleaned) > 20:
                chunks.append({
                    "content": cleaned,
                    "bbox": [x1, y1, x2, y2],
                })

            # reset
            words = []
            x1 = y1 = 1e9
            x2 = y2 = 0

    # leftover
    if words:
        cleaned = clean_text(" ".join(words))
        if len(cleaned) > 20:
            chunks.append({
                "content": cleaned,
                "bbox": [x1, y1, x2, y2],
            })

    return chunks


# =========================================================
# PDF GROUNDING (PAGE + BBOX)
# =========================================================

def extract_pdf_chunks(pdf_path: str) -> List[Dict]:
    """
    Extract text chunks from PDF with page number and bounding boxes.

    Returns:
    [
      {
        "content": "...",
        "page": 0,
        "bbox": [x1, y1, x2, y2]
      }
    ]
    """

    doc = fitz.open(pdf_path)
    chunks = []

    for page_index, page in enumerate(doc):
        blocks = page.get_text("blocks")

        for block in blocks:
            x1, y1, x2, y2, text, *_ = block

            text = clean_text(text)

            if len(text) < 20:
                continue

            chunks.append({
                "content": text,
                "page": page_index,
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
            })

    return chunks


# =========================================================
# TEXT CLEANING (shared)
# =========================================================

def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x00-\x7F]+", " ", text)
    return text.strip()
