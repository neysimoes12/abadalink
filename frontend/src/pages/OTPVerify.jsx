import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { setupPushNotifications } from '../services/push';
import { ArrowLeft, Loader, RefreshCw, Sparkles, CheckCircle, Mail } from 'lucide-react';

export default function OTPVerify() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';
    const returnTo = location.state?.returnTo || '/market';
    const [devCode, setDevCode] = useState(location.state?.devCode || '');

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const inputRefs = useRef([]);

    useEffect(() => {
        if (!email) {
            navigate('/login');
            return;
        }
        inputRefs.current[0]?.focus();
    }, [email, navigate]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleChange = (index, value) => {
        if (value && !/^\d$/.test(value)) return;
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        setError('');

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
        if (index === 5 && value) {
            handleVerify(newCode.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d+$/.test(pastedData)) {
            const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
            setCode(newCode);
            if (pastedData.length === 6) handleVerify(pastedData);
        }
    };

    const handleVerify = async (fullCode) => {
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/verify-otp', { email, code: fullCode });
            const { user, tokens } = response.data;

            setSuccess(true);

            // Store JWT tokens
            if (tokens) {
                localStorage.setItem('accessToken', tokens.access_token);
                localStorage.setItem('refreshToken', tokens.refresh_token);

                // Setup push notifications (non-blocking)
                setupPushNotifications(tokens.access_token).catch(err => {
                    console.log('Push setup skipped:', err);
                });
            }

            // Store user info
            localStorage.setItem('userId', user.id);
            localStorage.setItem('userName', user.name);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('kycStatus', user.kyc_status);
            localStorage.setItem('isAdmin', user.is_admin ? 'true' : 'false');

            setTimeout(() => {
                if (user.kyc_status === 'PENDING') {
                    navigate('/verify-identity');
                } else {
                    navigate(returnTo);
                }
            }, 1000);

        } catch (err) {
            setError(err.response?.data?.detail || 'Código inválido');
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;
        setResending(true);
        setError('');

        try {
            const response = await api.post('/auth/send-otp', { email });
            setCountdown(60);
            setCode(['', '', '', '', '', '']);
            setDevCode(response.data.dev_code || '');
            inputRefs.current[0]?.focus();
        } catch (err) {
            setError('Erro ao reenviar');
        } finally {
            setResending(false);
        }
    };

    if (success) {
        return (
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--background)' }}>
                <div className="animate-scale-in" style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '100px', height: '100px', margin: '0 auto 24px',
                        background: '#DCFCE7', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 0 10px #F0FDF4'
                    }}>
                        <CheckCircle size={56} style={{ color: '#16A34A' }} />
                    </div>
                    <h2 style={{ fontWeight: '800', fontSize: '1.75rem', color: '#16A34A', marginBottom: '8px' }}>Verificado!</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Entrando na folia...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '24px', background: 'var(--background)' }}>
            {/* Header */}
            <div>
                <button className="btn btn-ghost" onClick={() => navigate('/login')} style={{ paddingLeft: 0, color: 'var(--text-muted)' }}>
                    <ArrowLeft size={18} />
                    <span style={{ marginLeft: '8px' }}>Voltar</span>
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                <div className="animate-slide-up card" style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '32px',
                    borderRadius: '32px',
                    boxShadow: 'var(--shadow-lg)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px', height: '64px',
                        background: '#F0F9FF', borderRadius: '24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px',
                        color: 'var(--primary)'
                    }}>
                        <Mail size={32} />
                    </div>

                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>
                        Verifique seu Email
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: '1.5' }}>
                        Enviamos um código para<br />
                        <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>{email}</span>
                    </p>

                    {/* Dev Code */}
                    {devCode && (
                        <div style={{
                            background: '#FFFBEB',
                            border: '1px solid #FCD34D',
                            borderRadius: '16px',
                            padding: '16px',
                            marginBottom: '32px',
                            animation: 'pulse 2s infinite'
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                fontSize: '0.75rem', fontWeight: '800', color: '#D97706',
                                marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px'
                            }}>
                                <Sparkles size={14} /> MODO DEV
                            </div>
                            <div style={{ fontSize: '2rem', fontFamily: 'monospace', fontWeight: '800', letterSpacing: '0.2em', color: '#B45309' }}>
                                {devCode}
                            </div>
                        </div>
                    )}

                    {/* OTP Inputs */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }} onPaste={handlePaste}>
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                disabled={loading}
                                style={{
                                    width: '48px',
                                    height: '56px',
                                    textAlign: 'center',
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    borderRadius: '16px',
                                    border: `2px solid ${error ? '#DC2626' : digit ? 'var(--primary)' : '#E2E8F0'}`,
                                    background: digit ? '#FFF1F2' : '#F8FAFC',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    color: 'var(--text-main)'
                                }}
                                className="otp-input"
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="animate-shake" style={{ color: '#DC2626', fontSize: '0.9rem', marginBottom: '24px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <button
                        className="btn"
                        onClick={() => handleVerify(code.join(''))}
                        disabled={loading || code.join('').length < 6}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '20px',
                            background: 'var(--primary)',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '1rem',
                            boxShadow: '0 4px 15px rgba(225, 29, 72, 0.4)',
                            opacity: (loading || code.join('').length < 6) ? 0.7 : 1,
                            cursor: (loading || code.join('').length < 6) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? <Loader size={22} className="animate-spin animate-center-self" style={{ margin: '0 auto' }} /> : 'Verificar Código'}
                    </button>

                    <div style={{ marginTop: '24px' }}>
                        <button
                            onClick={handleResend}
                            disabled={countdown > 0 || resending}
                            style={{
                                background: 'none', border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: '0.9rem',
                                cursor: (countdown > 0 || resending) ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                margin: '0 auto'
                            }}
                        >
                            {resending ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            {countdown > 0 ? `Reenviar em ${countdown}s` : 'Não recebeu? Reenviar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
