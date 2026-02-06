"""
Email Service for AbadáLink
Handles sending OTP codes and notifications via email
Uses Resend (free tier: 3000 emails/month) or SMTP
"""
import os
import smtplib
import secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory OTP storage (in production, use Redis)
otp_store: dict[str, dict] = {}

# Email configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "noreply@abadalink.com")

# OTP Settings
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5


def generate_otp() -> str:
    """Generate a secure 6-digit OTP code"""
    return ''.join(secrets.choice('0123456789') for _ in range(OTP_LENGTH))


def store_otp(user_id: str, email: str) -> str:
    """
    Generate and store OTP for a user
    Returns the OTP code
    """
    otp_code = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    otp_store[user_id] = {
        "code": otp_code,
        "email": email,
        "expires": expiry,
        "attempts": 0
    }
    
    logger.info(f"OTP generated for user {user_id[:8]}..., expires at {expiry}")
    return otp_code


def verify_otp(user_id: str, code: str) -> tuple[bool, str]:
    """
    Verify OTP code for a user
    Returns (success: bool, message: str)
    """
    if user_id not in otp_store:
        return False, "Nenhum código solicitado. Solicite um novo código."
    
    stored = otp_store[user_id]
    
    # Check expiry
    if datetime.utcnow() > stored["expires"]:
        del otp_store[user_id]
        return False, "Código expirado. Solicite um novo código."
    
    # Check attempts (max 3)
    if stored["attempts"] >= 3:
        del otp_store[user_id]
        return False, "Muitas tentativas. Solicite um novo código."
    
    # Verify code
    if stored["code"] != code:
        otp_store[user_id]["attempts"] += 1
        remaining = 3 - otp_store[user_id]["attempts"]
        return False, f"Código incorreto. {remaining} tentativas restantes."
    
    # Success - remove from store
    del otp_store[user_id]
    return True, "Código verificado com sucesso!"


def send_otp_email(to_email: str, otp_code: str, user_name: str = "Usuário") -> bool:
    """
    Send OTP code via email
    Returns True if sent successfully
    """
    subject = "🎭 AbadáLink - Código de Verificação"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f001a; color: #ffffff; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1a0033, #050505); border-radius: 20px; padding: 40px; border: 1px solid rgba(255,215,0,0.2); }}
            .logo {{ text-align: center; font-size: 32px; font-weight: bold; margin-bottom: 20px; }}
            .logo span {{ color: #FFD700; }}
            .otp-box {{ background: rgba(255,215,0,0.1); border: 2px dashed #FFD700; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0; }}
            .otp-code {{ font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FFD700; }}
            .info {{ color: #948a9e; font-size: 14px; text-align: center; }}
            .warning {{ color: #ff6b6b; font-size: 12px; margin-top: 20px; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo"><span>ABADA</span>LINK</div>
            <p>Olá, <strong>{user_name}</strong>!</p>
            <p>Use o código abaixo para verificar sua identidade:</p>
            
            <div class="otp-box">
                <div class="otp-code">{otp_code}</div>
            </div>
            
            <p class="info">Este código é válido por <strong>{OTP_EXPIRY_MINUTES} minutos</strong>.</p>
            
            <p class="warning">⚠️ Não compartilhe este código com ninguém. O AbadáLink nunca solicitará seu código por telefone ou mensagem.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    AbadáLink - Código de Verificação
    
    Olá, {user_name}!
    
    Seu código de verificação é: {otp_code}
    
    Este código é válido por {OTP_EXPIRY_MINUTES} minutos.
    
    Não compartilhe este código com ninguém.
    """
    
    # Check if SMTP is configured
    if not SMTP_USER or not SMTP_PASSWORD:
        # DEV MODE: Log the code instead of sending
        logger.warning("=" * 50)
        logger.warning("📧 DEV MODE - Email would be sent to: " + to_email)
        logger.warning(f"📧 OTP Code: {otp_code}")
        logger.warning("=" * 50)
        return True
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"AbadáLink <{SENDER_EMAIL}>"
        msg["To"] = to_email
        
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        
        logger.info(f"OTP email sent to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


def send_verification_success_email(to_email: str, user_name: str = "Usuário") -> bool:
    """Send email confirming successful identity verification"""
    subject = "✅ AbadáLink - Identidade Verificada!"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f001a; color: #ffffff; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1a0033, #050505); border-radius: 20px; padding: 40px; border: 1px solid rgba(0,230,118,0.3); }}
            .logo {{ text-align: center; font-size: 32px; font-weight: bold; margin-bottom: 20px; }}
            .logo span {{ color: #FFD700; }}
            .success-box {{ background: rgba(0,230,118,0.1); border: 1px solid #00E676; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }}
            .checkmark {{ font-size: 48px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo"><span>ABADA</span>LINK</div>
            
            <div class="success-box">
                <div class="checkmark">✅</div>
                <h2 style="color: #00E676; margin: 10px 0;">Verificação Concluída!</h2>
            </div>
            
            <p>Olá, <strong>{user_name}</strong>!</p>
            <p>Sua identidade foi verificada com sucesso. Agora você pode:</p>
            <ul>
                <li>Anunciar abadás para troca ou venda</li>
                <li>Enviar propostas de troca</li>
                <li>Negociar com outros usuários verificados</li>
            </ul>
            
            <p>Bom Carnaval! 🎭</p>
        </div>
    </body>
    </html>
    """
    
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"📧 DEV MODE - Verification success email to: {to_email}")
        return True
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"AbadáLink <{SENDER_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
        return False
