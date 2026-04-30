import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import motor.motor_asyncio

# --- PostgreSQL Configuration ---
# Format: postgresql://username:password@host:port/database_name
# In Docker, host is the service name (e.g., "postgres"). Falls back to localhost for local dev.
POSTGRES_URL = os.getenv(
    "POSTGRES_URL",
    "postgresql://admin:170273@localhost:5432/expert_system"
)

# Setup SQLAlchemy engine and session
engine = create_engine(POSTGRES_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get a PostgreSQL session for our API routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- MongoDB Configuration ---
# Format: mongodb://username:password@host:port
# In Docker, host is the service name (e.g., "mongodb"). Falls back to localhost for local dev.
MONGO_URL = os.getenv(
    "MONGO_URL",
    "mongodb://admin:170273@localhost:27017"
)

# Setup Motor client for async MongoDB operations
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
# We select a specific database within MongoDB called 'expert_telemetry'
mongo_db = mongo_client["expert_telemetry"] 

# We will store security events and sensor data in this specific collection
security_logs_collection = mongo_db["security_logs"]