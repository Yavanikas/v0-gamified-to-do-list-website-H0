from sqlalchemy import create_engine, text
from app.config import DATABASE_URL

print("Connecting to:", DATABASE_URL)
engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    print("Adding bonus_points column...")
    conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS bonus_points INTEGER NOT NULL DEFAULT 50"))
    print("Adding bonus_reason column...")
    conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS bonus_reason TEXT"))
    print("Migration completed successfully!")
