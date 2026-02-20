from pypdf import PdfReader
import pandas as pd

def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    text = ""

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"

    return text.strip()


def extract_text_from_excel(file_path: str) -> str:
    dfs = pd.read_excel(file_path, sheet_name=None)
    text = ""

    for sheet_name, df in dfs.items():
        text += f"Sheet: {sheet_name}\n"
        text += df.to_string(index=False)
        text += "\n\n"

    return text.strip()
