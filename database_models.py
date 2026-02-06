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
    circuit: Mapped[str] = mapped_column(String, nullable=False) # Dodô, Osmar, Batatinha
    event_date: Mapped[str] = mapped_column(String, nullable=False) # Quinta, Sexta...
    gender: Mapped[str] = mapped_column(String, nullable=False) # M/F/U
    
    status: Mapped[str] = mapped_column(String, default="AVAILABLE")  # AVAILABLE, SWAPPED
    
    # P2P / Exchange Logic
    accepts_exchange: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Structured Exchange Interest
    interest_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    interest_event_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    interest_circuit: Mapped[Optional[str]] = mapped_column(String, nullable=True)
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
    
    # Optional: Link to a match/listing for context
    related_listing_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("abada_listings.id"), nullable=True)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    endpoint: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    p256dh: Mapped[str] = mapped_column(String, nullable=False)
    auth: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


