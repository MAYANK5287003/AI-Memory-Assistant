import pytesseract
from PIL import Image
import re

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def extract_ocr_chunks(image_path):
    img = Image.open(image_path)

    df = pytesseract.image_to_data(
        img,
        output_type=pytesseract.Output.DATAFRAME
    )

    df = df.dropna()
    df = df[df.text.str.strip() != ""]

    # group by block
    blocks = {}
    for _, row in df.iterrows():
        blocks.setdefault(row["block_num"], []).append(row)

    # merge small blocks
    merged = []
    buffer = []
    for block in blocks.values():
        text = " ".join(r["text"] for r in block)
        if len(text.split()) < 5:
            buffer.extend(block)
        else:
            if buffer:
                merged.append(buffer)
                buffer = []
            merged.append(block)
    if buffer:
        merged.append(buffer)

    chunks = []

    for block in merged:
        # group by line
        lines = {}
        for r in block:
            lines.setdefault(r["line_num"], []).append(r)

        line_info = []
        for words in lines.values():
            text = " ".join(w["text"] for w in words)
            height = sum(w["height"] for w in words) / len(words)
            line_info.append((text.strip(), height))

        if not line_info:
            continue

        heights = sorted(h for _, h in line_info)
        median = heights[len(heights) // 2]

        heading = None
        body_lines = []

        first_text, first_height = line_info[0]

        if first_height >= median * 1.3 or (
            len(first_text) <= 40 and len(first_text.split()) <= 5
        ):
            heading = first_text
            body_lines = [t for t, _ in line_info[1:]]
        else:
            body_lines = [t for t, _ in line_info]

        body = " ".join(body_lines)
        body = re.sub(r"\s+", " ", body).strip()

        # chunk safely
        start = 0
        while start < len(body):
            end = min(start + 450, len(body))
            split = body.rfind(".", start, end)
            if split <= start:
                split = body.rfind(" ", start, end)
            if split <= start:
                split = end
            chunk = body[start:split].strip()
            if len(chunk) > 20:
                chunks.append({
                    "heading": heading,
                    "content": chunk
                })
            start = split

    return chunks
