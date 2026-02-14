from sqlalchemy import text
from db import engine
from db import engine
print("ENGINE URL:", engine.url)


def init_db():
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL;"))


        # -------- memories --------
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT
        );
        """))

        # -------- documents --------
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            file_path TEXT,
            file_type TEXT
        );
        """))

        # -------- document_memories --------
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS document_memories (
            document_id INTEGER,
            memory_id INTEGER
        );
        """))

        # -------- faces --------
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS faces (
            id TEXT PRIMARY KEY,
            image_path TEXT,
            label TEXT,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        """))

        conn.commit()

    print("✅ SQLite tables ready")
