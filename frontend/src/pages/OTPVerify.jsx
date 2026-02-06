import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { setupPushNotifications } from '../services/push';
import { ArrowLeft, Loader, RefreshCw, Sparkles, CheckCircle, Ticket } from 'lucide-react';

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
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="animate-fadeIn" style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', margin: '0 auto 16px',
                        background: 'var(--green-light)', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <CheckCircle size={48} style={{ color: 'var(--green)' }} />
                    </div>
                    <p style={{ fontWeight: '700', fontSize: '1.25rem' }}>Verificado!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px' }}>
                <button className="btn btn-ghost" onClick={() => navigate('/login')}>
                    <ArrowLeft size={18} />
                    Voltar
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                {/* Logo */}
                <div className="logo" style={{ marginBottom: '32px' }}>
                    <div className="logo-icon" style={{ width: '48px', height: '48px' }}>
                        <Ticket size={24} />
                    </div>
                </div>

                <h1 style={{ fontSize: '1.5rem', marginBottom: '8px', textAlign: 'center' }}>
                    Verificar Email
                </h1>
                <p style={{ color: 'var(--gray-500)', marginBottom: '32px', textAlign: 'center' }}>
                    Enviamos um código para <span style={{ color: 'var(--gold)', fontWeight: '600' }}>{email}</span>
                </p>

                {/* Dev Code */}
                {devCode && (
                    <div style={{
                        background: '#FEF3C7',
                        border: '1px solid #FCD34D',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                        textAlign: 'center',
                        width: '100%',
                        maxWidth: '320px'
                    }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontSize: '0.7rem', fontWeight: '700', color: '#D97706',
                            marginBottom: '8px'
                        }}>
                            <Sparkles size={12} /> MODO DEV
                        </div>
                        <p style={{ fontSize: '1.75rem', fontFamily: 'monospace', fontWeight: '800', letterSpacing: '0.3em' }}>
                            {devCode}
                        </p>
                    </div>
                )}

                {/* OTP Inputs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }} onPaste={handlePaste}>
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
                                borderRadius: '12px',
                                border: `2px solid ${error ? '#DC2626' : digit ? 'var(--gold)' : 'var(--gray-200)'}`,
                                background: 'white',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                        />
                    ))}
                </div>

                {error && (
                    <p style={{ color: '#DC2626', fontSize: '0.875rem', marginBottom: '16px' }}>
                        {error}
                    </p>
                )}

                <button
                    className="btn btn-primary"
                    onClick={() => handleVerify(code.join(''))}
                    disabled={loading || code.join('').length < 6}
                    style={{ width: '100%', maxWidth: '320px', marginBottom: '16px' }}
                >
                    {loading ? <Loader size={22} style={{ animation: 'spin 1s linear infinite' }} /> : 'Verificar'}
                </button>

                <button
                    className="btn btn-ghost"
                    onClick={handleResend}
                    disabled={countdown > 0 || resending}
                >
                    {resending ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
                    {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar código'}
                </button>
            </div>
        </div>
    );
}
