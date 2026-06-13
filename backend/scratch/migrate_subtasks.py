from sqlalchemy import create_engine, text
from app.config import DATABASE_URL

print("Connecting to:", DATABASE_URL)
engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    print("Adding points column to subtasks...")
    conn.execute(text("ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 10"))
    print("Migration completed successfully!")
