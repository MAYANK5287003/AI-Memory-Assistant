from sqlalchemy import create_engine

DATABASE_URL = "postgresql://postgres:1234@localhost:5432/AI_memory"

engine = create_engine(DATABASE_URL)
