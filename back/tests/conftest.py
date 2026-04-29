"""
Shared test fixtures for SOC Simulator backend tests.

Key design decisions:
- SQLite in-memory DB replaces PostgreSQL for complete isolation.
- MongoDB's security_logs_collection is replaced with unittest.mock.AsyncMock.
- FastAPI dependency overrides ensure all routes use test DB.
- A seeded CEO user + PM user + valid JWT tokens are available to all tests.
- simulation_manager is reset before each test to prevent state leakage.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from sqlalchemy import create_engine, event, StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# ── 1. In-Memory SQLite Setup ────────────────────────────────────────
# Use StaticPool to share a single in-memory connection across all requests.
# Without this, each ORM session opens a NEW connection and gets an empty DB.
TEST_DATABASE_URL = "sqlite://"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable foreign key support in SQLite (disabled by default)
@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """Dependency override for database.get_db."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── 2. MongoDB Mock (AsyncMock — no external library needed) ─────────
mock_security_logs = MagicMock()
mock_security_logs.insert_one = AsyncMock()
mock_logs_cursor = MagicMock()
mock_logs_cursor.to_list = AsyncMock(return_value=[])
mock_find_cursor = MagicMock()
mock_find_cursor.sort = MagicMock(return_value=mock_find_cursor)
mock_find_cursor.limit = MagicMock(return_value=mock_find_cursor)
mock_security_logs.find = MagicMock(return_value=mock_find_cursor)


# ── 3. App Factory ───────────────────────────────────────────────────
@pytest.fixture(scope="session")
def app():
    """Create a FastAPI app instance with all dependencies overridden."""
    # Patch MongoDB at the source (database module) BEFORE importing other modules
    with patch("database.security_logs_collection", mock_security_logs):
        # Import models first to register all tables on Base
        from database import Base, get_db
        import models  # noqa: F401 — force table registration

        # Create all tables in the test SQLite DB
        Base.metadata.create_all(bind=test_engine)

        from main import app as fastapi_app

        # Override the get_db dependency globally
        fastapi_app.dependency_overrides[get_db] = override_get_db

        yield fastapi_app

        # Cleanup: drop all tables after all tests complete
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="session")
def client(app):
    """Synchronous test client for the FastAPI app."""
    with TestClient(app) as c:
        yield c


# ── 4. Seed Test Users ───────────────────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
def seed_test_users(app):
    """Create test users in the SQLite database.

    Seeds:
    - testceo (CEO role, no 2FA) — for auth + equipment + simulation tests
    - testpm (PM role, no 2FA) — for RBAC tests (403 Forbidden)
    """
    import models
    import auth_utils

    db = TestSessionLocal()
    try:
        existing = db.query(models.User).filter(
            models.User.username.in_(["testceo", "testpm"])
        ).all()
        existing_usernames = {u.username for u in existing}

        if "testceo" not in existing_usernames:
            user = models.User(
                username="testceo",
                password_hash=auth_utils.hash_password("testpass123"),
                role="CEO",
                is_2fa_enabled=False,
            )
            db.add(user)

        if "testpm" not in existing_usernames:
            user = models.User(
                username="testpm",
                password_hash=auth_utils.hash_password("testpass123"),
                role="PM",
                is_2fa_enabled=False,
            )
            db.add(user)

        db.commit()
    finally:
        db.close()


@pytest.fixture(scope="session")
def auth_token():
    """Generate a valid JWT token for the test CEO user."""
    import auth_utils
    return auth_utils.create_access_token({"sub": "testceo", "role": "CEO"})


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    """HTTP headers with Bearer token for authenticated requests."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="session")
def pm_token():
    """Generate a valid JWT token for the test PM user (RBAC tests)."""
    import auth_utils
    return auth_utils.create_access_token({"sub": "testpm", "role": "PM"})


@pytest.fixture(scope="session")
def pm_headers(pm_token):
    """HTTP headers with Bearer token for PM user (RBAC tests)."""
    return {"Authorization": f"Bearer {pm_token}"}


# ── 5. Seed Equipment ────────────────────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
def seed_equipment(app, seed_test_users):
    """Seed a minimal set of equipment for API tests."""
    import models

    db = TestSessionLocal()
    try:
        if db.query(models.Equipment).count() == 0:
            equipment = [
                models.Equipment(id=1, name="Test Router", type="Network", ip_address="192.168.1.1", status="Online"),
                models.Equipment(id=2, name="Test Server", type="Server", ip_address="192.168.1.10", status="Online"),
                models.Equipment(id=3, name="Test DB", type="Database", ip_address="192.168.1.20", status="Offline"),
            ]
            db.add_all(equipment)
            db.commit()
    finally:
        db.close()


# ── 6. Reset simulation_manager before each test ─────────────────────
@pytest.fixture(autouse=True)
def reset_simulation_manager():
    """Reset the global simulation_manager to a clean state before each test.

    This prevents tests from interfering with each other via shared state.
    """
    from simulation_endpoints import simulation_manager
    simulation_manager.is_running = False
    simulation_manager.is_paused = False
    simulation_manager.speed_multiplier = 1.0
    simulation_manager.active_attacks.clear()
    simulation_manager.financial_exposure = 0.0
    simulation_manager.cumulative_financial_by_type = {}
    simulation_manager.attack_history = {}
    yield
    # Cleanup after test
    simulation_manager.is_running = False
    simulation_manager.is_paused = False