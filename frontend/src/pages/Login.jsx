import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { Mail, ArrowRight, Loader, ArrowLeft, Phone } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const returnTo = location.state?.returnTo || '/market';

    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isNewUser, setIsNewUser] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Helper to generate a valid random CPF for testing/MVP
    const generateCPF = () => {
        const rnd = (n) => Math.round(Math.random() * n);
        const mod = (dividend, divisor) => Math.round(dividend - (Math.floor(dividend / divisor) * divisor));
        const n = Array(9).fill(0).map(() => rnd(9));

        let d1 = n.reduce((acc, val, idx) => acc + val * (10 - idx), 0);
        d1 = 11 - mod(d1, 11);
        if (d1 >= 10) d1 = 0;

        let d2 = n.reduce((acc, val, idx) => acc + val * (11 - idx), 0) + d1 * 2;
        d2 = 11 - mod(d2, 11);
        if (d2 >= 10) d2 = 0;

        return [...n, d1, d2].join('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        if (isNewUser && !phone.trim()) {
            setError('WhatsApp é obrigatório para novos usuários');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let response;
            try {
                // Try to send OTP (checks if user exists)
                response = await api.post('/auth/send-otp', { email });
            } catch (err) {
                if (err.response?.status === 404) {
                    // User not found
                    if (!isNewUser) {
                        // First time seeing this email -> Show phone input
                        setIsNewUser(true);
                        setLoading(false);
                        return; // Stop here and wait for user to fill phone
                    } else {
                        // User already saw phone input and clicked Continue -> Register
                        await api.post('/users/register', {
                            email,
                            name: email.split('@')[0],
                            cpf: generateCPF(), // Use random valid CPF to avoid duplicates
                            phone: phone
                        });
                        // Now send OTP again
                        response = await api.post('/auth/send-otp', { email });
                    }
                } else {
                    throw err;
                }
            }

            navigate('/verify-otp', {
                state: { email, devCode: response.data.dev_code, returnTo }
            });

        } catch (err) {
            setError(err.response?.data?.detail || 'Erro ao enviar código');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            padding: '24px',
            background: 'var(--background)'
        }}>
            {/* Header */}
            <div>
                <button
                    className="btn btn-ghost"
                    style={{ paddingLeft: 0, color: 'var(--text-muted)' }}
                    onClick={() => navigate('/market')}
                >
                    <ArrowLeft size={20} />
                    <span style={{ marginLeft: '8px' }}>Voltar para o Marketplace</span>
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                {/* Logo */}
                <div className="animate-slide-up" style={{ marginBottom: '32px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '24px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, #F59E0B 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 20px rgba(225, 29, 72, 0.3)',
                        marginBottom: '16px',
                        margin: '0 auto'
                    }}>
                        <span style={{ fontSize: '32px' }}>🎭</span>
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '2rem',
                        fontWeight: '800',
                        color: 'var(--text-main)',
                        textAlign: 'center',
                        marginBottom: '8px'
                    }}>
                        AbadáMatch
                    </h1>
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Entre na folia com segurança</p>
                </div>

                <div className="card animate-slide-up" style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '32px',
                    borderRadius: '32px',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
                            {isNewUser ? 'Criar sua conta' : 'Acesse sua conta'}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {isNewUser ? 'Preencha seus dados para continuar' : 'Digite seu e-mail para receber o código'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <Mail size={20} style={{ position: 'absolute', left: '20px', color: 'var(--text-muted)' }} />
                                <input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '16px 16px 16px 52px',
                                        borderRadius: '20px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--background)',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        fontFamily: 'var(--font-body)'
                                    }}
                                    className="input-focus-effect"
                                />
                            </div>
                        </div>

                        {isNewUser && (
                            <div className="animate-slide-up" style={{ marginBottom: '20px' }}>
                                <div style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    <Phone size={20} style={{ position: 'absolute', left: '20px', color: 'var(--text-muted)' }} />
                                    <input
                                        type="tel"
                                        placeholder="WhatsApp (com DDD)"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        autoFocus
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '16px 16px 16px 52px',
                                            borderRadius: '20px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--background)',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            fontFamily: 'var(--font-body)'
                                        }}
                                        className="input-focus-effect"
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="animate-shake" style={{
                                background: '#FEF2F2',
                                color: '#EF4444',
                                padding: '12px',
                                borderRadius: '16px',
                                fontSize: '0.875rem',
                                textAlign: 'center',
                                marginBottom: '20px',
                                border: '1px solid #FECACA',
                                fontWeight: '500'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn"
                            disabled={loading || !email.trim()}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '20px',
                                background: 'var(--primary)',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '1rem',
                                boxShadow: '0 4px 15px rgba(225, 29, 72, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            {loading ? (
                                <Loader size={22} className="animate-spin" />
                            ) : (
                                <>
                                    {isNewUser ? 'Cadastrar' : 'Continuar'}
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {!isNewUser && (
                    <p style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px', lineHeight: '1.5' }}>
                        Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade da folia. 🎉
                    </p>
                )}
            </div>

            <style>{`
                .input-focus-effect:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.1);
                }
            `}</style>
        </div>
    );
}
