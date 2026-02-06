import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getAccessToken } from '../services/api';
import { ArrowLeft, Repeat, Ticket, Check, Star, ShoppingBag, ShoppingCart, MessageCircle } from 'lucide-react';

export default function Matches() {
    const navigate = useNavigate();
    const [matches, setMatches] = useState({
        perfect_exchange: [],
        sale_buy: [],
        exchange_buy: [],
        partial: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!getAccessToken()) {
            navigate('/login');

            return;
        }
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        try {
            const response = await api.get('/market/my-matches');
            // The backend returns a flat list sorted by type, let's group them for better UI
            const allMatches = response.data.matches;

            const grouped = {
                perfect_exchange: allMatches.filter(m => m.match_type === 'PERFECT'),
                sale_buy: allMatches.filter(m => m.match_type === 'SALE_BUY'), // Pending backend support for this type in my-matches endpoint, currently it returns PARTIAL
                partial: allMatches.filter(m => m.match_type === 'PARTIAL')
            };

            setMatches(grouped);
        } catch (error) {
            console.error("Erro ao buscar matches:", error);
        } finally {
            setLoading(false);
        }
    };

    const MatchCard = ({ match, type }) => (
        <div className="card animate-slideUp" style={{ marginBottom: '16px', borderLeft: `4px solid ${getColor(type)}` }}>
            <div className="card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getIcon(type)}
                        <span style={{ fontWeight: '700', color: getColor(type) }}>
                            {getTitle(type)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {match.matched_listing.seller?.profile_image_url ? (
                            <img
                                src={match.matched_listing.seller.profile_image_url.startsWith('http') ? match.matched_listing.seller.profile_image_url : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${match.matched_listing.seller.profile_image_url}`}
                                alt={match.matched_listing.seller.name}
                                style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '10px', color: '#6B7280' }}>
                                    {match.matched_listing.seller?.name?.charAt(0) || 'U'}
                                </span>
                            </div>
                        )}
                        <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                            {match.matched_listing.seller?.name || 'Vendedor'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* MEU LADO */}
                    <div style={{ flex: 1, padding: '8px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '4px' }}>VOCÊ TEM</p>
                        <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{match.my_listing.event_name}</p>
                    </div>

                    <Repeat size={20} style={{ color: 'var(--gray-400)' }} />

                    {/* OUTRO LADO */}
                    <div style={{ flex: 1, padding: '8px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '4px' }}>ELE TEM</p>
                        <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{match.matched_listing.event_name}</p>
                    </div>
                </div>

                {match.reason && (
                    <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                        ✨ {match.reason}
                    </div>
                )}

                <button
                    className="btn w-full mt-4"
                    style={{ background: getColor(type), color: 'white' }}
                    onClick={() => navigate(`/chat/${match.matched_listing.seller_id}`)}
                >
                    <MessageCircle size={18} style={{ marginRight: '8px' }} />
                    Entrar em Contato
                </button>
            </div>
        </div>
    );

    const getColor = (type) => {
        switch (type) {
            case 'PERFECT': return 'var(--gold)'; // Gold/Pink gradient usually
            case 'SALE_BUY': return 'var(--green)';
            default: return 'var(--blue)';
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'PERFECT': return <Star size={18} fill="currentColor" />;
            case 'SALE_BUY': return <ShoppingBag size={18} />;
            default: return <Repeat size={18} />;
        }
    };

    const getTitle = (type) => {
        switch (type) {
            case 'PERFECT': return 'Match Perfeito!';
            case 'SALE_BUY': return 'Venda Garantida';
            default: return 'Interesse Mútuo';
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '80px' }}>
            <header className="header" style={{ marginBottom: '20px' }}>
                <button className="btn btn-ghost" onClick={() => navigate('/market')}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Seus Matches</h1>
                <div style={{ width: 24 }} />
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
            ) : (
                <div style={{ padding: '0 20px' }}>

                    {matches.perfect_exchange.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px' }}>🔥 Matches Perfeitos</h2>
                            {matches.perfect_exchange.map((m, i) => (
                                <MatchCard key={i} match={m} type="PERFECT" />
                            ))}
                        </div>
                    )}

                    {matches.partial.length > 0 && (
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px' }}>🎯 Possíveis Trocas</h2>
                            {matches.partial.map((m, i) => (
                                <MatchCard key={i} match={m} type="PARTIAL" />
                            ))}
                        </div>
                    )}

                    {matches.perfect_exchange.length === 0 && matches.partial.length === 0 && (
                        <div className="empty-state">
                            <Ticket size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                            <h3>Nenhum match ainda</h3>
                            <p>Anuncie mais abadás ou aguarde novos interessados!</p>
                            <button className="btn btn-primary mt-4" onClick={() => navigate('/sell')}>
                                Criar Novo Anúncio
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
