import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { Mail, ArrowRight, Loader, ArrowLeft, Ticket } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const returnTo = location.state?.returnTo || '/market';

    const [email, setEmail] = useState('');
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

        setLoading(true);
        setError('');

        try {
            let response;
            try {
                response = await api.post('/auth/send-otp', { email });
            } catch (err) {
                if (err.response?.status === 404) {
                    await api.post('/users/register', {
                        email,
                        name: email.split('@')[0],
                        cpf: generateCPF() // Use random valid CPF to avoid duplicates
                    });
                    response = await api.post('/auth/send-otp', { email });
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
        <div className="container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px' }}>
                <button className="btn btn-ghost" onClick={() => navigate('/market')}>
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
                    Entrar no <span style={{ color: 'var(--gold)' }}>AbadáLink</span>
                </h1>
                <p style={{ color: 'var(--gray-500)', marginBottom: '32px', textAlign: 'center' }}>
                    Digite seu email para continuar
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '320px' }}>
                    <div className="input-icon-wrapper" style={{ marginBottom: '16px' }}>
                        <Mail size={20} />
                        <input
                            type="email"
                            className="input"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    {error && (
                        <p style={{ color: '#DC2626', fontSize: '0.875rem', textAlign: 'center', marginBottom: '16px' }}>
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={loading || !email.trim()}
                    >
                        {loading ? (
                            <Loader size={22} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <>
                                Continuar
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <p style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'center' }}>
                    Enviaremos um código de verificação para seu email
                </p>
            </div>
        </div>
    );
}
