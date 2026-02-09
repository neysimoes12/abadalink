import os
import uuid
from decimal import Decimal
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from sqlalchemy import create_engine, String, Boolean, Float, ForeignKey, DECIMAL, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

# Load environment variables
load_dotenv()

# Database connection - supports both SQLite (dev) and PostgreSQL (prod)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./abada_v4.db")

# Railway uses postgres://, SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs check_same_thread=False, PostgreSQL doesn't
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True) # WhatsApp
    cpf: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    reputation_score: Mapped[float] = mapped_column(Float, default=0.0)
    
    # KYC (Know Your Customer) Fields
    kyc_status: Mapped[str] = mapped_column(String, default="PENDING")  # PENDING, VERIFIED, REJECTED
    kyc_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    document_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # RG, CNH, PASSPORT
    document_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # MFA (Multi-Factor Authentication) Fields
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # For TOTP apps
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Profile
    profile_image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    listings: Mapped[list["AbadaListing"]] = relationship(back_populates="seller")
    proposals_sent: Mapped[list["SwapProposal"]] = relationship("SwapProposal", foreign_keys="SwapProposal.proposer_id", back_populates="proposer")
    proposals_received: Mapped[list["SwapProposal"]] = relationship("SwapProposal", foreign_keys="SwapProposal.owner_id", back_populates="owner")

class AbadaListing(Base):
    __tablename__ = "abada_listings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    event_name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)  # BLOCO, CAMAROTE
    
    # Standardized Fields
    event_date: Mapped[str] = mapped_column(String, nullable=False) # Quinta, Sexta...
    gender: Mapped[str] = mapped_column(String, nullable=False) # M/F/U
    image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True) # Cloudinary URL
    
    status: Mapped[str] = mapped_column(String, default="AVAILABLE")  # AVAILABLE, SWAPPED
    
    # P2P / Exchange Logic
    accepts_exchange: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Structured Exchange Interest
    interest_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    interest_event_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    interest_event_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    interest_gender: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Negotiation Fields
    product_value: Mapped[float] = mapped_column(Float, default=0.0)
    max_difference: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    seller: Mapped["User"] = relationship(back_populates="listings")
    
    # Proposals where this item is the TARGET (what Proposer wants)
    proposals_targeting: Mapped[list["SwapProposal"]] = relationship("SwapProposal", foreign_keys="SwapProposal.target_listing_id", back_populates="target_listing")
    
    # Proposals where this item is OFFERED (what Proposer gives)
    proposals_offering: Mapped[list["SwapProposal"]] = relationship("SwapProposal", foreign_keys="SwapProposal.offered_listing_id", back_populates="offered_listing")

class SwapProposal(Base):
    __tablename__ = "swap_proposals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    proposer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    
    target_listing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("abada_listings.id"), nullable=False)
    offered_listing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("abada_listings.id"), nullable=False)
    
    status: Mapped[str] = mapped_column(String, default="PENDING")  # PENDING, ACCEPTED, REJECTED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    proposer: Mapped["User"] = relationship("User", foreign_keys=[proposer_id], back_populates="proposals_sent")
    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id], back_populates="proposals_received")
    
    target_listing: Mapped["AbadaListing"] = relationship("AbadaListing", foreign_keys=[target_listing_id], back_populates="proposals_targeting")
    offered_listing: Mapped["AbadaListing"] = relationship("AbadaListing", foreign_keys=[offered_listing_id], back_populates="proposals_offering")

class EventItem(Base):
    __tablename__ = "event_items"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category: Mapped[str] = mapped_column(String, nullable=False) # BLOCO, CAMAROTE
    name: Mapped[str] = mapped_column(String, nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ReferenceItem(Base):
    __tablename__ = "reference_items"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category: Mapped[str] = mapped_column(String, nullable=False) # BLOCO, CAMAROTE, CIRCUIT
    name: Mapped[str] = mapped_column(String, nullable=False)
    neighborhood: Mapped[Optional[str]] = mapped_column(String, nullable=True) # Only for Circuits mainly
    default_circuit: Mapped[Optional[str]] = mapped_column(String, nullable=True) # For Blocos/Camarotes


class Message(Base):
    __tablename__ = "messages"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    receiver_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Soft Delete for each side
    deleted_by_sender: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_by_receiver: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Optional: Link to a match/listing for context
    related_listing_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("abada_listings.id"), nullable=True)


class Block(Base):
    __tablename__ = "blocks"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blocker_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    blocked_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Report(Base):
    __tablename__ = "reports"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    reported_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String, default="PENDING") # PENDING, REVIEWED, RESOLVED


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    endpoint: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    p256dh: Mapped[str] = mapped_column(String, nullable=False)
    auth: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MatchInteraction(Base):
    __tablename__ = "match_interactions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    # The listing the user is interacting WITH (the other person's listing)
    target_listing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("abada_listings.id"), nullable=False)
    # The listing the user is offering (optional, if context is known)
    my_listing_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("abada_listings.id"), nullable=True)
    
    status: Mapped[str] = mapped_column(String, nullable=False) # VIEWED, INTERESTED, DISMISSED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Transaction(Base):
    __tablename__ = "transactions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    seller_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    listing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("abada_listings.id"), nullable=False)
    
    final_value: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String, default="PENDING") # PENDING, DOMPLETED, CANCELLED
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Review(Base):
    __tablename__ = "reviews"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reviewer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    reviewed_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    transaction_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("transactions.id"), nullable=False)
    
    rating: Mapped[int] = mapped_column(Float, nullable=False) # 1-5
    comment: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class VerificationRequest(Base):
    __tablename__ = "verification_requests"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    
    document_type: Mapped[str] = mapped_column(String, nullable=False)
    document_number: Mapped[str] = mapped_column(String, nullable=False)
    
    # In a real app, storing file paths/URLs here
    front_image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    back_image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    selfie_image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    status: Mapped[str] = mapped_column(String, default="PENDING") # PENDING, APPROVED, REJECTED
    admin_notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
