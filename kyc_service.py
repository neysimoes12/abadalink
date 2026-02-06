"""
KYC Verification Service for AbadáLink
Handles document verification and face matching

Supports multiple providers:
- Didit (Free Core KYC)
- AWS Rekognition (fallback, already in project)
- Mock mode for development
"""
import os
import httpx
import logging
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class KYCProvider(str, Enum):
    DIDIT = "didit"
    AWS_REKOGNITION = "aws"
    MOCK = "mock"


class KYCResult(BaseModel):
    success: bool
    provider: str
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    full_name: Optional[str] = None
    face_match_score: Optional[float] = None
    liveness_passed: Optional[bool] = None
    message: str


# Configuration
DIDIT_API_KEY = os.getenv("DIDIT_API_KEY", "")
DIDIT_BASE_URL = "https://api.didit.me/v1"
KYC_PROVIDER = os.getenv("KYC_PROVIDER", "mock")  # didit, aws, mock


class KYCVerificationService:
    def __init__(self):
        self.provider = KYC_PROVIDER
        logger.info(f"KYC Service initialized with provider: {self.provider}")
    
    async def verify_identity(
        self,
        document_front: bytes,
        selfie: bytes,
        document_back: Optional[bytes] = None,
        document_type: str = "id_card"
    ) -> KYCResult:
        """
        Verify user identity using document + selfie
        
        Args:
            document_front: Front of ID document (bytes)
            selfie: User selfie image (bytes)
            document_back: Optional back of document
            document_type: Type of document (id_card, drivers_license, passport)
        
        Returns:
            KYCResult with verification status
        """
        if self.provider == "didit" and DIDIT_API_KEY:
            return await self._verify_with_didit(document_front, selfie, document_back, document_type)
        elif self.provider == "aws":
            return await self._verify_with_aws(document_front, selfie)
        else:
            return await self._verify_mock(document_front, selfie)
    
    async def _verify_with_didit(
        self,
        document_front: bytes,
        selfie: bytes,
        document_back: Optional[bytes],
        document_type: str
    ) -> KYCResult:
        """Verify using Didit API (Free Core KYC)"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                files = {
                    "document_front": ("document.jpg", document_front, "image/jpeg"),
                    "selfie": ("selfie.jpg", selfie, "image/jpeg"),
                }
                if document_back:
                    files["document_back"] = ("document_back.jpg", document_back, "image/jpeg")
                
                data = {
                    "country": "BR",
                    "document_type": document_type,
                }
                
                response = await client.post(
                    f"{DIDIT_BASE_URL}/identity/verify",
                    headers={"Authorization": f"Bearer {DIDIT_API_KEY}"},
                    files=files,
                    data=data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    return KYCResult(
                        success=result.get("status") == "approved",
                        provider="didit",
                        document_type=result.get("document", {}).get("type"),
                        document_number=result.get("document", {}).get("number"),
                        full_name=result.get("document", {}).get("full_name"),
                        face_match_score=result.get("face_match", {}).get("similarity"),
                        liveness_passed=result.get("liveness", {}).get("passed"),
                        message=result.get("message", "Verification complete")
                    )
                else:
                    logger.error(f"Didit API error: {response.status_code} - {response.text}")
                    return KYCResult(
                        success=False,
                        provider="didit",
                        message=f"Verification failed: {response.status_code}"
                    )
                    
        except Exception as e:
            logger.error(f"Didit verification error: {e}")
            return KYCResult(
                success=False,
                provider="didit",
                message=f"Service error: {str(e)}"
            )
    
    async def _verify_with_aws(
        self,
        document_front: bytes,
        selfie: bytes
    ) -> KYCResult:
        """Verify using AWS Rekognition (face comparison only)"""
        try:
            from security_service import IdentityVerifier
            
            verifier = IdentityVerifier()
            is_match = verifier.verify_face(document_front, selfie)
            
            return KYCResult(
                success=is_match,
                provider="aws_rekognition",
                face_match_score=90.0 if is_match else 0.0,
                liveness_passed=None,  # AWS Rekognition doesn't check liveness in basic mode
                message="Faces match!" if is_match else "Faces do not match"
            )
            
        except Exception as e:
            logger.error(f"AWS Rekognition error: {e}")
            return KYCResult(
                success=False,
                provider="aws_rekognition",
                message=f"AWS error: {str(e)}"
            )
    
    async def _verify_mock(
        self,
        document_front: bytes,
        selfie: bytes
    ) -> KYCResult:
        """Mock verification for development"""
        logger.warning("=" * 50)
        logger.warning("🔬 MOCK KYC MODE - Auto-approving verification")
        logger.warning(f"   Document size: {len(document_front)} bytes")
        logger.warning(f"   Selfie size: {len(selfie)} bytes")
        logger.warning("=" * 50)
        
        # Simulate processing delay
        import asyncio
        await asyncio.sleep(1)
        
        # Check if images are valid (at least some bytes)
        if len(document_front) < 1000 or len(selfie) < 1000:
            return KYCResult(
                success=False,
                provider="mock",
                message="Imagens inválidas. Por favor, envie fotos legíveis."
            )
        
        return KYCResult(
            success=True,
            provider="mock",
            document_type="RG",
            document_number="12.345.678-9",
            full_name="Usuário Verificado",
            face_match_score=95.5,
            liveness_passed=True,
            message="✅ Verificação aprovada (MODO DEV)"
        )


# Singleton instance
kyc_service = KYCVerificationService()
