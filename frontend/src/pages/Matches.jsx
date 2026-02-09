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

    const [error, setError] = useState(null);

    const fetchMatches = async () => {
        try {
            setError(null);
            const response = await api.get('/market/my-matches');
            // The backend returns a flat list sorted by type, let's group them for better UI
            const allMatches = response.data.matches;

            const grouped = {
                perfect_exchange: allMatches.filter(m => m.match_type === 'PERFECT'),
                sale_buy: allMatches.filter(m => m.match_type === 'SALE_BUY'),
                partial: allMatches.filter(m => m.match_type === 'PARTIAL'),
                same_event: allMatches.filter(m => m.match_type === 'SAME_EVENT')
            };

            setMatches(grouped);
        } catch (error) {
            console.error("Erro ao buscar matches:", error);
            setError(error.message || "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    };

    const recordView = async (match) => {
        if (!match.is_new) return;
        try {
            await api.post('/market/matches/interaction', {
                target_listing_id: match.matched_listing.id,
                action: 'VIEWED'
            });
            // Optimistic update
            const updateMatchInList = (list) => list.map(m =>
                m.matched_listing.id === match.matched_listing.id ? { ...m, is_new: false, status: 'VIEWED' } : m
            );

            setMatches(prev => ({
                perfect_exchange: updateMatchInList(prev.perfect_exchange),
                sale_buy: updateMatchInList(prev.sale_buy),
                partial: updateMatchInList(prev.partial),
                same_event: updateMatchInList(prev.same_event || [])
            }));
        } catch (error) {
            console.error("Failed to record view", error);
        }
    };

    // Helper colors conforming to new palette
    const getColor = (t) => {
        switch (t) {
            case 'PERFECT': return '#F59E0B'; // Amber
            case 'SAME_EVENT': return '#8B5CF6'; // Purple
            default: return '#3B82F6'; // Blue
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
            ) : error ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--error)' }}>
                    <h3>Erro ao carregar matches</h3>
                    <p>{error}</p>
                    <button className="btn mt-4" style={{ border: '1px solid var(--border)' }} onClick={fetchMatches}>Tentar Novamente</button>
                </div>
            ) : (
                <div style={{ padding: '0 20px' }}>

                    {matches.perfect_exchange.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>🔥 Matches Perfeitos</h2>
                            {matches.perfect_exchange.map((m, i) => (
                                <MatchCard key={i} match={m} type="PERFECT" />
                            ))}
                        </div>
                    )}

                    {matches.same_event?.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', color: '#8B5CF6', fontFamily: 'var(--font-heading)' }}>🎉 Match de Folia</h2>
                            {matches.same_event.map((m, i) => (
                                <MatchCard key={i} match={m} type="SAME_EVENT" />
                            ))}
                        </div>
                    )}

                    {matches.partial.length > 0 && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>🎯 Possíveis Trocas</h2>
                            {matches.partial.map((m, i) => (
                                <MatchCard key={i} match={m} type="PARTIAL" />
                            ))}
                        </div>
                    )}

                    {matches.perfect_exchange.length === 0 && matches.partial.length === 0 && (!matches.same_event || matches.same_event.length === 0) && (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: 'var(--text-muted)'
                        }}>
                            <div style={{
                                background: 'var(--surface)',
                                display: 'inline-flex',
                                padding: '24px',
                                borderRadius: '50%',
                                marginBottom: '24px',
                                boxShadow: 'var(--shadow-md)'
                            }}>
                                <Ticket size={48} color="var(--primary)" style={{ opacity: 0.8 }} />
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '8px' }}>Nenhum match ainda</h3>
                            <p style={{ marginBottom: '24px' }}>Anuncie mais abadás ou aguarde novos interessados!</p>
                            <button
                                className="btn"
                                style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 4px 15px rgba(225, 29, 72, 0.3)' }}
                                onClick={() => navigate('/sell')}
                            >
                                Criar Novo Anúncio
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const MatchCard = ({ match, type }) => {
    const navigate = useNavigate();

    // Helper colors conforming to new palette
    const getColor = (t) => {
        switch (t) {
            case 'PERFECT': return '#F59E0B'; // Amber
            case 'SAME_EVENT': return '#8B5CF6'; // Purple
            default: return '#3B82F6'; // Blue
        }
    };

    const borderColor = getColor(type);

    return (
        <div className="card animate-slide-up"
            style={{
                marginBottom: '20px',
                padding: '20px',
                border: 'none',
                borderRadius: '24px',
                boxShadow: 'var(--shadow-md)',
                position: 'relative',
                background: 'var(--surface)',
                overflow: 'visible'
            }}>

            {match.is_new && (
                <div style={{
                    position: 'absolute',
                    top: -10,
                    right: 20,
                    background: 'var(--primary)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 10px rgba(225, 29, 72, 0.3)',
                    letterSpacing: '0.5px'
                }}>
                    NOVO
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{
                    padding: '8px',
                    borderRadius: '12px',
                    background: `${borderColor}15`,
                    color: borderColor
                }}>
                    {type === 'PERFECT' ? <Star size={20} fill="currentColor" /> :
                        type === 'SAME_EVENT' ? <Ticket size={20} /> : <Repeat size={20} />}
                </div>
                <span style={{ fontWeight: '700', color: borderColor, fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {type === 'PERFECT' ? 'Match Perfeito' :
                        type === 'SAME_EVENT' ? 'Mesmo Evento' : 'Interesse Mútuo'}
                </span>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '20px'
            }}>
                {/* My Item */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>VOCÊ</div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)', lineHeight: '1.2' }}>
                        {match.my_listing.event_name}
                    </div>
                </div>

                <div style={{ color: 'var(--text-muted)' }}><Repeat size={20} /></div>

                {/* Their Item */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>ELE(A)</div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)', lineHeight: '1.2' }}>
                        {match.matched_listing.event_name}
                    </div>
                </div>
            </div>

            <button
                className="btn"
                style={{
                    background: borderColor,
                    color: 'white',
                    borderRadius: '16px',
                    width: '100%',
                    boxShadow: `0 4px 15px ${borderColor}40`,
                    marginTop: '8px',
                    cursor: 'pointer'
                }}
                onClick={() => {
                    navigate(`/chat/${match.matched_listing.seller?.id}`);
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <MessageCircle size={20} />
                    <span>Combinar Troca</span>
                </div>
            </button>
        </div>
    );
};
