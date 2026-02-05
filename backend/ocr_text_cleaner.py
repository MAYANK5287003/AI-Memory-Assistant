import re

def clean_ocr_text(text: str) -> str:
    if not text:
        return ""

    # 1. Normalize whitespace
    text = re.sub(r"\s+", " ", text)

    # 2. Fix merged words (camelCase / OCR joins)
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)

    # 3. Add line breaks after punctuation (readability)
    text = re.sub(r"([.!?])\s+", r"\1\n", text)

    # 4. Remove non-ASCII junk characters
    text = re.sub(r"[^\x00-\x7F]+", " ", text)

    # 5. Remove very short noise lines
    lines = [
        line.strip()
        for line in text.split("\n")
        if len(line.strip()) > 10
    ]

    # 6. Rebuild clean text
    cleaned_text = "\n".join(lines)

    return cleaned_text.strip()
