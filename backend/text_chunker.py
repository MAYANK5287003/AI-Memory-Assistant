def chunk_text(text: str, max_chars: int = 400):
    if not text:
        return []

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + max_chars
        chunk = text[start:end].strip()
        if len(chunk) > 50:  # avoid tiny junk
            chunks.append(chunk)
        start = end

    return chunks
