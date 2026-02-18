from sqlalchemy import create_engine
from pathlib import Path


# AI-Memory-Assistant/
BASE_DIR = Path(__file__).resolve().parent.parent

# storage folder OUTSIDE backend/frontend
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(exist_ok=True)
DB_PATH = STORAGE_DIR / "AI_memory.db"

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

