import os
from sqlalchemy import create_engine, inspect
from app.config import DATABASE_URL

print("DATABASE_URL:", DATABASE_URL)
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

try:
    columns = inspector.get_columns("tasks")
    print("Columns in 'tasks' table:")
    for col in columns:
        print(f" - {col['name']}: {col['type']}")
except Exception as e:
    print("Error:", e)
