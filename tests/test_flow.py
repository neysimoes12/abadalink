import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app, get_db
from database_models import Base, User, AbadaListing

# Setup in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables
    Base.metadata.drop_all(bind=engine)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "Service is healthy"}

def test_full_flow():
    # 1. Register Seller
    seller_data = {"name": "Test Seller", "email": "seller@test.com", "cpf": "111"}
    resp = client.post("/users/register", json=seller_data)
    assert resp.status_code == 201
    seller_id = resp.json()["id"]

    # 2. Register Buyer
    buyer_data = {"name": "Test Buyer", "email": "buyer@test.com", "cpf": "222"}
    resp = client.post("/users/register", json=buyer_data)
    assert resp.status_code == 201
    buyer_id = resp.json()["id"]

    # 3. Create Listing
    listing_data = {
        "seller_id": seller_id,
        "event_name": "Test Event",
        "type": "VIP",
        "price": 1000.00
    }
    resp = client.post("/market/list-abada", json=listing_data)
    assert resp.status_code == 201
    listing_id = resp.json()["listing_id"]

    # 4. Verify Identity (Mock)
    # Create dummy image files
    files = {
        'source_image': ('source.jpg', b'fake_image_bytes', 'image/jpeg'),
        'target_image': ('target.jpg', b'fake_image_bytes', 'image/jpeg')
    }
    resp = client.post(f"/users/verify-identity?user_id={seller_id}", files=files)
    assert resp.status_code == 200
    assert resp.json()["is_verified"] is True

    # 5. Buy Item (P2P Mode) -> Fee 9.90
    resp = client.post(f"/market/buy/{listing_id}?buyer_id={buyer_id}&mode=P2P")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "WAITING_PAYMENT"
    # Verify split logic
    financials = data["financials"]
    assert financials["platform_fee"] == 9.90
    assert financials["seller_receive"] == 990.10  # 1000 - 9.90

def test_buy_b2c_logic():
    # Setup new listing for B2C test
    # Need to get seller_id again or reuse? reusing logic from previous test is risky if state not clean, 
    # but we are using shared DB fixture. Let's make a new seller to be safe/clean.
    
    # Register B2C Seller
    seller_data = {"name": "B2C Seller", "email": "b2c@test.com", "cpf": "333"}
    resp = client.post("/users/register", json=seller_data)
    seller_id = resp.json()["id"]

    # Register B2C Buyer
    buyer_data = {"name": "B2C Buyer", "email": "b2cbuyer@test.com", "cpf": "444"}
    resp = client.post("/users/register", json=buyer_data)
    buyer_id = resp.json()["id"]

    # Create Listing
    listing_data = {
        "seller_id": seller_id,
        "event_name": "B2C Event",
        "type": "Camarote",
        "price": 2000.00
    }
    resp = client.post("/market/list-abada", json=listing_data)
    listing_id = resp.json()["listing_id"]

    # Buy Item (B2C Mode) -> Fee 15%
    resp = client.post(f"/market/buy/{listing_id}?buyer_id={buyer_id}&mode=B2C")
    assert resp.status_code == 200
    data = resp.json()
    
    financials = data["financials"]
    # 15% of 2000 = 300
    assert financials["platform_fee"] == 300.00
    # 85% of 2000 = 1700
    assert financials["seller_receive"] == 1700.00
