from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from pydantic import BaseModel, field_validator
from typing import Annotated, Optional
import uuid
import os
import json
from datetime import datetime

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database_models import engine, Base, User, AbadaListing, SwapProposal, ReferenceItem, Message, PushSubscription
from email_service import store_otp, verify_otp, send_otp_email
from auth_service import (
    create_tokens, get_current_user_id, get_current_admin_from_token,
    get_optional_user_id, validate_cpf, TokenResponse
)

# Initialize Database Tables
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Startup Error: Could not connect to database: {e}")
    # We continue so that at least /health works
    pass

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="AbadáLink P2P API", version="2.1.0")

# Add rate limit error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration - PRODUCTION READY
# Explicitly allowing production domains to avoid env var issues
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177").split(",")
ALLOWED_ORIGINS.extend([
    "https://abadalink.vercel.app",
    "https://www.abadalink.vercel.app",
    "https://web-production-ffe3.up.railway.app"
])

# Add production domains if configured
PROD_DOMAIN = os.getenv("PROD_DOMAIN")
if PROD_DOMAIN:
    ALLOWED_ORIGINS.extend([
        f"https://{PROD_DOMAIN}",
        f"https://www.{PROD_DOMAIN}"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

# Dependency for DB Session
def get_db():
    with Session(engine) as session:
        yield session


# ============ Pydantic Schemas ============

class UserCreate(BaseModel):
    name: str
    email: str
    cpf: str
    
    @field_validator('cpf')
    @classmethod
    def validate_cpf_format(cls, v):
        if not validate_cpf(v):
            raise ValueError('CPF inválido')
        return ''.join(filter(str.isdigit, v))  # Store only digits


class AbadaListingCreate(BaseModel):
    event_name: str
    type: str  # BLOCO, CAMAROTE
    circuit: str
    event_date: str
    gender: str
    
    # Interest Fields (Optional for Sale Mode)
    interest_type: Optional[str] = None
    interest_event_name: Optional[str] = None
    interest_circuit: Optional[str] = None
    interest_event_date: Optional[str] = None
    interest_gender: Optional[str] = None

    # Negotiation
    product_value: float = 0.0
    max_difference: float = 0.0


class SwapProposalCreate(BaseModel):
    target_listing_id: uuid.UUID
    offered_listing_id: uuid.UUID


class ReferenceItemCreate(BaseModel):
    category: str
    name: str
    neighborhood: Optional[str] = None
    default_circuit: Optional[str] = None


class OTPRequest(BaseModel):
    email: str


class OTPVerify(BaseModel):
    email: str
    code: str


# ============ Health & Info ============

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.1.0", "message": "Service is healthy"}


# ============ Authentication ============

# MVP_MODE: If True, ALL emails can login with code 123456
MVP_MODE = os.getenv("MVP_MODE", "true").lower() == "true"
MASTER_CODE = "123456"

@app.post("/auth/send-otp")
@limiter.limit("5/minute")  # Rate limit: 5 requests per minute
def send_otp(request: Request, otp_request: OTPRequest, db: Session = Depends(get_db)):
    """Send OTP code to user's email for authentication"""
    user = db.query(User).filter(User.email == otp_request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # MVP Mode - Skip email sending, allow master code
    if MVP_MODE:
        return {"message": f"MVP: Use o código {MASTER_CODE}", "email": user.email, "dev_code": MASTER_CODE}

    # Generate and store OTP
    otp_code = store_otp(str(user.id), user.email)
    
    # Send email
    success = send_otp_email(user.email, otp_code, user.name)
    
    if not success:
        # In MVP Mode, we don't want to crash if email fails
        if MVP_MODE:
             return {"message": f"MVP: Email falhou, use {MASTER_CODE}", "email": user.email, "dev_code": MASTER_CODE}
        raise HTTPException(status_code=500, detail="Erro ao enviar email")
    
    response = {"message": "Código enviado para seu email", "email": user.email}
    
    # DEV MODE ONLY - Remove in production
    if os.getenv("DEV_MODE") == "true":
        response["dev_code"] = otp_code
    
    return response


@app.post("/auth/verify-otp", response_model=None)
@limiter.limit("10/minute")
def verify_otp_endpoint(request: Request, otp_verify: OTPVerify, db: Session = Depends(get_db)):
    """Verify OTP code and return JWT tokens"""
    user = db.query(User).filter(User.email == otp_verify.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # MVP Mode Check
    if MVP_MODE and otp_verify.code == MASTER_CODE:
        success = True
        message = "Acesso MVP liberado"
    else:
        success, message = verify_otp(str(user.id), otp_verify.code)

    
    if not success:

        raise HTTPException(status_code=400, detail=message)
    
    # Mark email as verified if first time
    if not user.email_verified:
        user.email_verified = True
        db.commit()
    
    # Create JWT tokens
    tokens = create_tokens(str(user.id), user.email, user.is_admin)
    
    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_admin": user.is_admin,
            "email_verified": user.email_verified,
            "kyc_status": user.kyc_status,
        },
        "tokens": tokens.model_dump(),
        "message": message
    }


@app.post("/auth/refresh")
@limiter.limit("10/minute")
def refresh_token(request: Request, refresh_token: str, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    from auth_service import decode_token, create_access_token
    
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token de refresh inválido")
    
    user_id = payload.get("sub")
    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    
    new_access_token = create_access_token(str(user.id), user.email, user.is_admin)
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


# ============ User Management ============

@app.post("/users/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
def register_user(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check existing
    stmt = select(User).where((User.email == user.email) | (User.cpf == user.cpf))
    existing_user = db.execute(stmt).scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Usuário já existe.")

    new_user = User(
        name=user.name,
        email=user.email,
        cpf=user.cpf
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"id": new_user.id, "name": new_user.name}


@app.get("/users/me")
def get_current_user(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get current authenticated user"""
    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_admin": user.is_admin,
        "is_verified": user.is_verified,
        "email_verified": user.email_verified,
        "kyc_status": user.kyc_status,
        "profile_image_url": user.profile_image_url
    }


@app.get("/users/{user_id}")
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get user public profile"""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


# ============ KYC Verification ============

@app.post("/users/verify-identity")
@limiter.limit("3/hour")
async def verify_identity(
    request: Request,
    document_front: UploadFile = File(...),
    selfie: UploadFile = File(...),
    document_back: UploadFile = None,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """KYC verification endpoint - requires authentication"""
    from kyc_service import kyc_service
    
    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.kyc_status == "VERIFIED":
        return {"message": "Usuário já verificado", "kyc_status": "VERIFIED"}

    try:
        doc_front_bytes = await document_front.read()
        selfie_bytes = await selfie.read()
        doc_back_bytes = await document_back.read() if document_back else None
    except Exception:
        raise HTTPException(status_code=400, detail="Erro ao processar imagens")

    result = await kyc_service.verify_identity(
        document_front=doc_front_bytes,
        selfie=selfie_bytes,
        document_back=doc_back_bytes
    )
    
    if result.success:
        user.kyc_status = "VERIFIED"
        user.kyc_verified_at = datetime.utcnow()
        user.is_verified = True
        if result.document_type:
            user.document_type = result.document_type
        if result.document_number:
            user.document_number = result.document_number
        db.commit()
        
        from email_service import send_verification_success_email
        send_verification_success_email(user.email, user.name)
        
        return {
            "message": result.message,
            "kyc_status": "VERIFIED",
            "face_match_score": result.face_match_score,
            "provider": result.provider
        }
    else:
        user.kyc_status = "REJECTED"
        db.commit()
        
        return {
            "message": result.message,
            "kyc_status": "REJECTED",
            "provider": result.provider
        }


@app.post("/users/me/avatar")
def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Upload user avatar"""
    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    
    # Save file
    import shutil
    from pathlib import Path
    
    upload_dir = Path("frontend/public/uploads/avatars")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{user_id}_{int(datetime.utcnow().timestamp())}.{file_ext}"
    file_path = upload_dir / filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update user profile
    # URL relative to frontend public
    image_url = f"/uploads/avatars/{filename}"
    user.profile_image_url = image_url
    db.commit()
    
    return {"message": "Avatar updated", "url": image_url}


# ============ Marketplace ============

@app.get("/market/listings")
def get_listings(db: Session = Depends(get_db)):
    """Get all available listings - public endpoint"""
    return db.query(AbadaListing).filter(AbadaListing.status == "AVAILABLE").all()


@app.post("/market/list-abada", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
def list_abada(
    request: Request,
    listing: AbadaListingCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new listing - requires authentication"""
    seller = db.get(User, uuid.UUID(user_id))
    if not seller:
        raise HTTPException(status_code=404, detail="User not found")

    new_listing = AbadaListing(
        seller_id=uuid.UUID(user_id),
        event_name=listing.event_name,
        type=listing.type,
        circuit=listing.circuit,
        event_date=listing.event_date,
        gender=listing.gender,
        interest_type=listing.interest_type,
        interest_event_name=listing.interest_event_name,
        interest_circuit=listing.interest_circuit,
        interest_event_date=listing.interest_event_date,
        interest_gender=listing.interest_gender,
        product_value=listing.product_value,
        max_difference=listing.max_difference,
        status="AVAILABLE",
        accepts_exchange=True
    )
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)
    
    return {"listing_id": new_listing.id, "status": new_listing.status}


@app.get("/market/my-listings")
def get_my_listings(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get listings owned by authenticated user"""
    return db.query(AbadaListing).filter(
        AbadaListing.seller_id == uuid.UUID(user_id),
        AbadaListing.status == "AVAILABLE"
    ).all()


@app.delete("/market/listings/{listing_id}")
def delete_listing(
    listing_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a listing - only owner can delete"""
    listing = db.get(AbadaListing, listing_id)
    if not listing:
        raise HTTPException(404, "Listing not found")
    
    if str(listing.seller_id) != user_id:
        raise HTTPException(403, "You can only delete your own listings")
    
    db.delete(listing)
    db.commit()
    return {"message": "Listing deleted", "id": str(listing_id)}


@app.post("/market/propose-swap", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/hour")
def propose_swap(
    request: Request,
    proposal: SwapProposalCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Propose a swap - requires authentication"""
    proposer = db.get(User, uuid.UUID(user_id))
    if not proposer:
        raise HTTPException(404, "Proposer not found")

    target = db.get(AbadaListing, proposal.target_listing_id)
    if not target or target.status != "AVAILABLE":
        raise HTTPException(400, "Target listing not available")

    offered = db.get(AbadaListing, proposal.offered_listing_id)
    if not offered or offered.status != "AVAILABLE":
        raise HTTPException(400, "Offered listing not available")
    
    if offered.seller_id != uuid.UUID(user_id):
        raise HTTPException(403, "You can only offer your own items")

    new_proposal = SwapProposal(
        proposer_id=uuid.UUID(user_id),
        owner_id=target.seller_id,
        target_listing_id=target.id,
        offered_listing_id=offered.id,
        status="PENDING"
    )
    db.add(new_proposal)
    db.commit()
    db.refresh(new_proposal)

    return {"proposal_id": new_proposal.id, "message": "Proposal sent!"}


# ============ Matching System ============

@app.get("/market/matches")
def get_all_matches(db: Session = Depends(get_db)):
    """Get all potential matches across all listings - public endpoint
    
    Match types:
    - PERFECT_EXCHANGE: Both users want to trade with each other
    - SALE_BUY: Seller has what buyer wants
    - PARTIAL: One-sided interest
    """
    # Get all available listings
    all_listings = db.query(AbadaListing).filter(
        AbadaListing.status == "AVAILABLE"
    ).all()
    
    # Separate by type
    exchange_listings = [l for l in all_listings if l.interest_event_name and l.type != "PROCURA"]
    sale_listings = [l for l in all_listings if not l.interest_event_name and l.type != "PROCURA"]
    buy_listings = [l for l in all_listings if l.type == "PROCURA"]
    
    matches = []
    processed_pairs = set()
    
    # 1. EXCHANGE ↔ EXCHANGE matches
    for listing_a in exchange_listings:
        a_has = listing_a.event_name
        a_wants = [x.strip() for x in (listing_a.interest_event_name or "").split(",")]
        
        for listing_b in exchange_listings:
            if listing_a.id == listing_b.id or listing_a.seller_id == listing_b.seller_id:
                continue
            
            pair_key = tuple(sorted([str(listing_a.id), str(listing_b.id)]))
            if pair_key in processed_pairs:
                continue
            
            b_has = listing_b.event_name
            b_wants = [x.strip() for x in (listing_b.interest_event_name or "").split(",")]
            
            a_has_what_b_wants = a_has in b_wants or any(a_has in w for w in b_wants)
            b_has_what_a_wants = b_has in a_wants or any(b_has in w for w in a_wants)
            
            if a_has_what_b_wants and b_has_what_a_wants:
                processed_pairs.add(pair_key)
                matches.append({
                    "match_type": "PERFECT_EXCHANGE",
                    "description": "Troca perfeita! Ambos querem o que o outro tem.",
                    "listing_a": {
                        "id": listing_a.id, "event_name": listing_a.event_name,
                        "type": listing_a.type, "wants": listing_a.interest_event_name,
                        "seller_id": listing_a.seller_id
                    },
                    "listing_b": {
                        "id": listing_b.id, "event_name": listing_b.event_name,
                        "type": listing_b.type, "wants": listing_b.interest_event_name,
                        "seller_id": listing_b.seller_id
                    }
                })
            elif a_has_what_b_wants or b_has_what_a_wants:
                processed_pairs.add(pair_key)
                matches.append({
                    "match_type": "PARTIAL_EXCHANGE",
                    "description": "Match parcial - um lado tem interesse.",
                    "listing_a": {"id": listing_a.id, "event_name": listing_a.event_name, "wants": listing_a.interest_event_name},
                    "listing_b": {"id": listing_b.id, "event_name": listing_b.event_name, "wants": listing_b.interest_event_name}
                })
    
    # 2. SALE ↔ BUY matches (Seller has what buyer wants)
    for sale in sale_listings:
        sale_has = sale.event_name
        
        for buy in buy_listings:
            if sale.seller_id == buy.seller_id:
                continue
            
            pair_key = tuple(sorted([str(sale.id), str(buy.id)]))
            if pair_key in processed_pairs:
                continue
            
            buy_wants = [x.strip() for x in (buy.interest_event_name or "").split(",")]
            
            if sale_has in buy_wants or any(sale_has in w for w in buy_wants):
                processed_pairs.add(pair_key)
                matches.append({
                    "match_type": "SALE_BUY",
                    "description": f"Vendedor tem {sale_has} que comprador quer!",
                    "seller_listing": {
                        "id": sale.id, "event_name": sale.event_name,
                        "type": sale.type, "price": sale.product_value,
                        "circuit": sale.circuit, "event_date": sale.event_date,
                        "seller_id": sale.seller_id
                    },
                    "buyer_listing": {
                        "id": buy.id, "wants": buy.interest_event_name,
                        "budget": buy.product_value, "seller_id": buy.seller_id
                    }
                })
    
    # 3. EXCHANGE ↔ BUY matches (Exchanger has what buyer wants)
    for exchange in exchange_listings:
        exchange_has = exchange.event_name
        
        for buy in buy_listings:
            if exchange.seller_id == buy.seller_id:
                continue
            
            pair_key = tuple(sorted([str(exchange.id), str(buy.id)]))
            if pair_key in processed_pairs:
                continue
            
            buy_wants = [x.strip() for x in (buy.interest_event_name or "").split(",")]
            
            if exchange_has in buy_wants or any(exchange_has in w for w in buy_wants):
                processed_pairs.add(pair_key)
                matches.append({
                    "match_type": "EXCHANGE_BUY",
                    "description": f"Quem quer trocar tem {exchange_has} que comprador quer!",
                    "exchanger_listing": {
                        "id": exchange.id, "event_name": exchange.event_name,
                        "wants": exchange.interest_event_name,
                        "seller_id": exchange.seller_id
                    },
                    "buyer_listing": {
                        "id": buy.id, "wants": buy.interest_event_name,
                        "budget": buy.product_value, "seller_id": buy.seller_id
                    }
                })
    
    # Sort: perfect exchanges first, then sale/buy, then partial
    priority = {"PERFECT_EXCHANGE": 0, "SALE_BUY": 1, "EXCHANGE_BUY": 2, "PARTIAL_EXCHANGE": 3}
    matches.sort(key=lambda x: priority.get(x["match_type"], 9))
    
    return {
        "total_matches": len(matches),
        "by_type": {
            "perfect_exchange": len([m for m in matches if m["match_type"] == "PERFECT_EXCHANGE"]),
            "sale_buy": len([m for m in matches if m["match_type"] == "SALE_BUY"]),
            "exchange_buy": len([m for m in matches if m["match_type"] == "EXCHANGE_BUY"]),
            "partial": len([m for m in matches if m["match_type"] == "PARTIAL_EXCHANGE"])
        },
        "matches": matches
    }



@app.get("/market/my-matches")
def get_my_matches(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get matches for current user's listings"""
    # Get user's listings
    my_listings = db.query(AbadaListing).filter(
        AbadaListing.seller_id == uuid.UUID(user_id),
        AbadaListing.status == "AVAILABLE"
    ).all()
    
    if not my_listings:
        return {"matches": [], "message": "Você não tem anúncios ativos"}
    
    # Get all other available listings with interests
    other_listings = db.query(AbadaListing).filter(
        AbadaListing.status == "AVAILABLE",
        AbadaListing.seller_id != uuid.UUID(user_id)
    ).all()
    
    matches = []
    
    for my_listing in my_listings:
        my_has = my_listing.event_name
        my_wants = [x.strip() for x in (my_listing.interest_event_name or "").split(",") if x.strip()]
        
        for other in other_listings:
            other_has = other.event_name
            other_wants = [x.strip() for x in (other.interest_event_name or "").split(",") if x.strip()]
            
            # Check matches
            i_have_what_they_want = my_has in other_wants or any(my_has in w for w in other_wants)
            they_have_what_i_want = other_has in my_wants or any(other_has in w for w in my_wants)
            
            if i_have_what_they_want and they_have_what_i_want:
                match_type = "PERFECT"
            elif i_have_what_they_want or they_have_what_i_want:
                match_type = "PARTIAL"
            else:
                continue
            
            # Get seller info
            seller = db.get(User, other.seller_id)
            
            matches.append({
                "match_type": match_type,
                "my_listing": {
                    "id": my_listing.id,
                    "event_name": my_listing.event_name,
                    "wants": my_listing.interest_event_name
                },
                "matched_listing": {
                    "id": other.id,
                    "event_name": other.event_name,
                    "type": other.type,
                    "circuit": other.circuit,
                    "event_date": other.event_date,
                    "gender": other.gender,
                    "wants": other.interest_event_name,
                    "product_value": other.product_value,
                    "seller": {
                        "id": seller.id if seller else None,
                        "name": seller.name if seller else "Desconhecido",
                        "is_verified": seller.is_verified if seller else False
                    }
                },
                "reason": "Match perfeito! Vocês querem trocar exatamente." if match_type == "PERFECT" else "Match parcial - um dos lados tem interesse."
            })
    
    # Sort: perfect first
    matches.sort(key=lambda x: 0 if x["match_type"] == "PERFECT" else 1)
    
    return {
        "total": len(matches),
        "perfect": len([m for m in matches if m["match_type"] == "PERFECT"]),
        "matches": matches
    }


@app.get("/market/listing/{listing_id}/matches")
def get_listing_matches(listing_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get matches for a specific listing"""
    listing = db.get(AbadaListing, listing_id)
    if not listing:
        raise HTTPException(404, "Listing not found")
    
    my_has = listing.event_name
    my_wants = [x.strip() for x in (listing.interest_event_name or "").split(",") if x.strip()]
    
    # Find compatible listings
    others = db.query(AbadaListing).filter(
        AbadaListing.status == "AVAILABLE",
        AbadaListing.id != listing_id,
        AbadaListing.seller_id != listing.seller_id
    ).all()
    
    matches = []
    
    for other in others:
        other_has = other.event_name
        other_wants = [x.strip() for x in (other.interest_event_name or "").split(",") if x.strip()]
        
        i_have_what_they_want = my_has in other_wants or any(my_has in w for w in other_wants)
        they_have_what_i_want = other_has in my_wants or any(other_has in w for w in my_wants)
        
        # Also check for BUY listings that want what this listing has
        if other.type == "PROCURA":
            if my_has in other_wants or any(my_has in w for w in other_wants):
                matches.append({
                    "match_type": "BUYER",
                    "listing": {
                        "id": other.id,
                        "wants": other.interest_event_name,
                        "budget": other.product_value
                    },
                    "reason": "Comprador interessado no seu abadá!"
                })
                continue
        
        if i_have_what_they_want and they_have_what_i_want:
            matches.append({
                "match_type": "PERFECT",
                "listing": {
                    "id": other.id,
                    "event_name": other.event_name,
                    "type": other.type,
                    "circuit": other.circuit,
                    "event_date": other.event_date,
                    "wants": other.interest_event_name
                },
                "reason": "Match perfeito para troca!"
            })
        elif they_have_what_i_want:
            matches.append({
                "match_type": "PARTIAL",
                "listing": {
                    "id": other.id,
                    "event_name": other.event_name,
                    "type": other.type,
                    "wants": other.interest_event_name
                },
                "reason": f"Tem {other_has} que você quer!"
            })
    
    matches.sort(key=lambda x: {"PERFECT": 0, "BUYER": 1, "PARTIAL": 2}.get(x["match_type"], 3))
    
    return {"listing_id": listing_id, "matches": matches, "total": len(matches)}

@app.get("/admin/options")
def get_options(category: str = None, db: Session = Depends(get_db)):
    """Get reference options - public endpoint"""
    query = db.query(ReferenceItem)
    if category:
        query = query.filter(ReferenceItem.category == category)
    return query.all()


@app.post("/admin/options", status_code=status.HTTP_201_CREATED)
def create_option(
    item: ReferenceItemCreate,
    admin_id: str = Depends(get_current_admin_from_token),
    db: Session = Depends(get_db)
):
    """Create reference option - admin only"""
    exists = db.query(ReferenceItem).filter(
        ReferenceItem.category == item.category,
        ReferenceItem.name == item.name
    ).first()
    
    if exists:
        raise HTTPException(400, "Option already exists")

    new_item = ReferenceItem(
        category=item.category,
        name=item.name,
        neighborhood=item.neighborhood,
        default_circuit=item.default_circuit
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@app.put("/admin/options/{item_id}")
def update_option(
    item_id: uuid.UUID,
    item: ReferenceItemCreate,
    admin_id: str = Depends(get_current_admin_from_token),
    db: Session = Depends(get_db)
):
    """Update reference option - admin only"""
    db_item = db.get(ReferenceItem, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db_item.category = item.category
    db_item.name = item.name
    db_item.neighborhood = item.neighborhood
    db_item.default_circuit = item.default_circuit
    db.commit()
    db.refresh(db_item)
    return db_item


@app.delete("/admin/options/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_option(
    item_id: uuid.UUID,
    admin_id: str = Depends(get_current_admin_from_token),
    db: Session = Depends(get_db)
):
    """Delete reference option - admin only"""
    db_item = db.get(ReferenceItem, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(db_item)
    db.commit()
    return None


# ============ Chat Endpoints ============

class MessageCreate(BaseModel):
    receiver_id: uuid.UUID
    content: str
    related_listing_id: Optional[uuid.UUID] = None


@app.get("/chat/conversations")
def get_conversations(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get list of conversations for current user"""
    current_user = uuid.UUID(user_id)
    
    # Find all unique users this user has chatted with
    sent = db.query(Message.receiver_id).filter(Message.sender_id == current_user).distinct()
    received = db.query(Message.sender_id).filter(Message.receiver_id == current_user).distinct()
    
    partner_ids = set()
    for row in sent:
        partner_ids.add(row[0])
    for row in received:
        partner_ids.add(row[0])
    
    conversations = []
    for partner_id in partner_ids:
        partner = db.get(User, partner_id)
        if not partner:
            continue
        
        # Get last message
        last_msg = db.query(Message).filter(
            or_(
                (Message.sender_id == current_user) & (Message.receiver_id == partner_id),
                (Message.sender_id == partner_id) & (Message.receiver_id == current_user)
            )
        ).order_by(Message.created_at.desc()).first()
        
        # Count unread
        unread_count = db.query(Message).filter(
            Message.sender_id == partner_id,
            Message.receiver_id == current_user,
            Message.is_read == False
        ).count()
        
        conversations.append({
            "partner_id": str(partner_id),
            "partner_name": partner.name,
            "partner_avatar": partner.profile_image_url,
            "last_message": last_msg.content if last_msg else None,
            "last_message_time": last_msg.created_at.isoformat() if last_msg else None,
            "unread_count": unread_count
        })
    
    # Sort by last message time
    conversations.sort(key=lambda x: x["last_message_time"] or "", reverse=True)
    return {"conversations": conversations}


@app.get("/chat/{partner_id}")
def get_chat_messages(
    partner_id: uuid.UUID, 
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    """Get messages between current user and partner"""
    current_user = uuid.UUID(user_id)
    
    messages = db.query(Message).filter(
        or_(
            (Message.sender_id == current_user) & (Message.receiver_id == partner_id),
            (Message.sender_id == partner_id) & (Message.receiver_id == current_user)
        )
    ).order_by(Message.created_at.asc()).all()
    
    # Mark as read
    db.query(Message).filter(
        Message.sender_id == partner_id,
        Message.receiver_id == current_user,
        Message.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    return {
        "messages": [
            {
                "id": str(m.id),
                "sender_id": str(m.sender_id),
                "content": m.content,
                "created_at": m.created_at.isoformat(),
                "is_mine": m.sender_id == current_user
            }
            for m in messages
        ]
    }


@app.post("/chat/send")
def send_message(
    msg: MessageCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Send a message to another user"""
    new_msg = Message(
        sender_id=uuid.UUID(user_id),
        receiver_id=msg.receiver_id,
        content=msg.content,
        related_listing_id=msg.related_listing_id
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    
    return {
        "id": str(new_msg.id),
        "content": new_msg.content,
        "created_at": new_msg.created_at.isoformat()
    }


# ============ Push Notifications ============

# VAPID keys (generate your own for production!)
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "YOUR_PRIVATE_KEY")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U")
VAPID_CLAIMS = {"sub": "mailto:contato@abadalink.com"}


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: dict  # Contains p256dh and auth


@app.post("/push/subscribe")
def subscribe_to_push(
    subscription: PushSubscriptionCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Store user's push subscription"""
    # Check if endpoint already exists
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == subscription.endpoint
    ).first()
    
    if existing:
        # Update existing
        existing.user_id = uuid.UUID(user_id)
        existing.p256dh = subscription.keys.get("p256dh", "")
        existing.auth = subscription.keys.get("auth", "")
    else:
        # Create new
        new_sub = PushSubscription(
            user_id=uuid.UUID(user_id),
            endpoint=subscription.endpoint,
            p256dh=subscription.keys.get("p256dh", ""),
            auth=subscription.keys.get("auth", "")
        )
        db.add(new_sub)
    
    db.commit()
    return {"status": "subscribed"}


def send_push_to_user(user_id: uuid.UUID, title: str, body: str, url: str = "/", db: Session = None):
    """Send push notification to all subscriptions of a user"""
    try:
        from pywebpush import webpush, WebPushException
        
        subscriptions = db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id
        ).all()
        
        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh,
                            "auth": sub.auth
                        }
                    },
                    data=json.dumps({
                        "title": title,
                        "body": body,
                        "url": url
                    }),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims=VAPID_CLAIMS
                )
            except WebPushException as e:
                print(f"Push failed for {sub.endpoint}: {e}")
                # Remove invalid subscriptions
                if e.response and e.response.status_code in [404, 410]:
                    db.delete(sub)
                    db.commit()
    except ImportError:
        print("pywebpush not installed, skipping push notification")


# Add json import at top of file
import json


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting app on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, workers=1)
