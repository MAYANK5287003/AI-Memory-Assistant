import re

def clean_text(text: str) -> str:
    # remove extra whitespace
    text = re.sub(r"\s+", " ", text)

    # remove very short junk lines
    lines = [line.strip() for line in text.split(".") if len(line.strip()) > 20]

    return ". ".join(lines)
