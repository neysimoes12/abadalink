import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getAccessToken } from '../services/api';
import { Search, Home, User, Plus, Ticket, Calendar, MapPin, Heart, Repeat, ShoppingBag, ShoppingCart, Filter, MessageCircle, X, Check } from 'lucide-react';

export default function Marketplace() {
    const [listings, setListings] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState('EXCHANGE'); // 'EXCHANGE', 'SALE', or 'BUY'
    const [showFilters, setShowFilters] = useState(false);
    const [filterDay, setFilterDay] = useState('');
    const [filterType, setFilterType] = useState('');
    const navigate = useNavigate();

    const currentUserId = localStorage.getItem('userId');
    const isLoggedIn = !!getAccessToken();

    useEffect(() => {
        fetchListings();
    }, []);

    const fetchListings = async () => {
        try {
            const response = await api.get('/market/listings');
            setListings(response.data);
        } catch (error) {
            console.error("Erro ao buscar abadás:", error);
        }
    };

    const handleAction = async (item) => {
        if (!isLoggedIn) {
            navigate('/login', { state: { returnTo: '/market', itemId: item.id } });
            return;
        }
        if (item.seller_id === currentUserId) {
            alert("Este é seu próprio anúncio!");
            return;
        }

        const isTrade = item.interest_event_name && item.type !== 'PROCURA';

        // Direct interest flow:
        // 1. Record "INTERESTED" status
        // 2. Open Chat
        try {
            await api.post('/market/matches/interaction', {
                target_listing_id: item.id,
                action: 'INTERESTED'
            });
            navigate(`/chat/${item.seller_id}`);
            setSelectedItem(null);
        } catch (error) {
            console.error("Failed to record interest", error);
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                navigate('/login', { state: { returnTo: '/market', itemId: item.id } });
            } else {
                alert("Erro ao registrar interesse. Tente novamente.");
            }
        }
    };

    // Filter Logic - Now Sorting/Prioritization
    const tradeListingsRaw = listings.filter(item => item.interest_event_name && item.type !== 'PROCURA');
    const saleListingsRaw = listings.filter(item => !item.interest_event_name && item.type !== 'PROCURA');
    const buyListingsRaw = listings.filter(item => item.type === 'PROCURA');

    let currentListings = activeTab === 'EXCHANGE' ? tradeListingsRaw : activeTab === 'SALE' ? saleListingsRaw : buyListingsRaw;

    const getMatchScore = (item) => {
        let score = 0;
        if (searchTerm) {
            // Prioritize exact event name match, but also check interest
            if (item.event_name === searchTerm) score += 100;
            else if (item.interest_event_name === searchTerm) score += 50;
        }
        if (filterType && item.type === filterType) score += 20;
        if (filterDay && item.event_date?.includes(filterDay)) score += 10;
        return score;
    };

    if (searchTerm || filterType || filterDay) {
        currentListings = [...currentListings].sort((a, b) => {
            const scoreA = getMatchScore(a);
            const scoreB = getMatchScore(b);
            return scoreB - scoreA; // Descending score
        });
    }

    const getPlaceholderImage = (eventName, type) => {
        // ... (existing code omitted for brevity in instruction, but keeping logic)
    };

    const EventLogo = ({ name, size = 26 }) => {
        if (!name) return null;
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = ['#F59E0B', '#EC4899', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4'];
        const color = colors[Math.abs(hash) % colors.length];
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        return (
            <div style={{
                width: size,
                height: size,
                borderRadius: '8px',
                background: color,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${size / 2}px`,
                fontWeight: '900',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                border: '2px solid white'
            }}>
                {initials}
            </div>
        );
    };

    return (
        <div className="app-container">
            {/* Header */}
            <header style={{
                height: 'var(--header-height)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1.5rem',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                position: 'sticky',
                top: 0,
                zIndex: 50
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src="/logo.png" alt="AbadáMatch" style={{ height: '70px', objectFit: 'contain' }} />
                </div>
            </header>

            <div style={{ padding: '1.5rem' }}>
                {/* Search & Filter */}
                {/* Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', marginBottom: '1rem' }}>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        style={{
                            padding: '10px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text-main)',
                            fontWeight: '500',
                            fontSize: '0.9rem',
                            outline: 'none',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        <option value="">Tipo</option>
                        <option value="BLOCO">Bloco</option>
                        <option value="CAMAROTE">Camarote</option>
                    </select>

                    <select
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            padding: '10px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text-main)',
                            fontWeight: '500',
                            fontSize: '0.9rem',
                            outline: 'none',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        <option value="">Evento</option>
                        {[...new Set(listings
                            .filter(item => !filterType || item.type === filterType)
                            .map(item => item.event_name)
                        )].sort().map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>

                    <select
                        value={filterDay}
                        onChange={e => setFilterDay(e.target.value)}
                        style={{
                            padding: '10px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text-main)',
                            fontWeight: '500',
                            fontSize: '0.9rem',
                            outline: 'none',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        <option value="">Dia</option>
                        <option value="Quinta">Quinta</option>
                        <option value="Sexta">Sexta</option>
                        <option value="Sábado">Sábado</option>
                        <option value="Domingo">Domingo</option>
                        <option value="Segunda">Segunda</option>
                        <option value="Terça">Terça</option>
                    </select>
                </div>

                {(searchTerm || filterDay || filterType) && (
                    <button
                        onClick={() => { setSearchTerm(''); setFilterDay(''); setFilterType(''); }}
                        className="btn"
                        style={{
                            background: '#FEE2E2',
                            color: '#DC2626',
                            fontSize: '0.875rem',
                            padding: '0.5rem',
                            width: '100%',
                            marginBottom: '1.5rem',
                            justifyContent: 'center'
                        }}
                    >
                        Limpar Filtros
                    </button>
                )}

                {/* Tabs */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                    background: 'var(--surface)',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)'
                }}>
                    {[
                        { id: 'EXCHANGE', icon: Repeat, label: 'Trocas', count: tradeListingsRaw.length },
                        { id: 'SALE', icon: ShoppingBag, label: 'Vendas', count: saleListingsRaw.length },
                        { id: 'BUY', icon: ShoppingCart, label: 'Compras', count: buyListingsRaw.length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '0.5rem',
                                borderRadius: 'calc(var(--radius) - 4px)',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.2s',
                                gap: '4px'
                            }}
                        >
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Listings Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '24px',
                    paddingBottom: '100px'
                }}>
                    {currentListings.map((item, index) => (
                        <div
                            key={item.id}
                            className="card animate-slide-up"
                            style={{
                                animationDelay: `${index * 0.05}s`,
                                padding: '0',
                                border: 'none',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow-md)',
                                background: 'var(--surface)',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            {/* Card Image Area - Large & Vertical */}
                            <div style={{
                                width: '100%',
                                aspectRatio: '4/3',
                                position: 'relative',
                                backgroundColor: '#f1f5f9'
                            }}>
                                <img
                                    src={item.image_url || getPlaceholderImage(item.event_name, item.type)}
                                    alt={item.event_name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />

                                {/* Seller Avatar Badge - Overlapping Image */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-16px',
                                    right: '16px',
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    border: '3px solid var(--surface)',
                                    background: 'var(--surface)',
                                    boxShadow: 'var(--shadow-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 10
                                }}>
                                    {item.seller?.profile_image_url ? (
                                        <img
                                            src={item.seller.profile_image_url}
                                            alt={item.seller.name}
                                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <User size={24} color="var(--text-muted)" />
                                    )}
                                </div>

                                {/* Type Badge (Optional - kept minimal) */}
                                {item.type === 'PROCURA' && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '12px',
                                        background: 'rgba(0,0,0,0.6)',
                                        backdropFilter: 'blur(4px)',
                                        color: 'white',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600'
                                    }}>
                                        PROCURA
                                    </div>
                                )}
                            </div>

                            {/* Card Content */}
                            <div style={{ padding: '20px 16px 16px 16px' }}>
                                {/* Title & Price Row */}
                                <div style={{ marginBottom: '8px' }}>
                                    <h3 style={{
                                        fontSize: '1.125rem',
                                        fontWeight: '700',
                                        fontFamily: 'var(--font-heading)',
                                        color: 'var(--text-main)',
                                        lineHeight: '1.3',
                                        marginBottom: '4px'
                                    }}>
                                        {item.type === 'PROCURA' ? 'Procurando...' : item.event_name}
                                    </h3>

                                    {activeTab === 'SALE' && item.product_value > 0 && (
                                        <div style={{
                                            fontSize: '1.25rem',
                                            fontWeight: '800',
                                            color: 'var(--primary)',
                                            marginTop: '4px'
                                        }}>
                                            R$ {item.product_value.toLocaleString('pt-BR')}
                                        </div>
                                    )}
                                </div>

                                {/* Details / Interest */}
                                <div style={{ minHeight: '40px', marginBottom: '16px' }}>
                                    {item.type === 'PROCURA' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-body)' }}>
                                            <Search size={16} color="var(--secondary)" />
                                            <span style={{ fontWeight: '500' }}>{item.interest_event_name}</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                <Calendar size={14} />
                                                <span>{item.event_date?.split('/')[0] || 'Data a definir'}</span>
                                            </div>

                                            {item.interest_event_name && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    background: '#F1F5F9',
                                                    padding: '8px 12px',
                                                    borderRadius: '12px',
                                                    marginTop: '4px'
                                                }}>
                                                    <Repeat size={16} color="var(--secondary)" />
                                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-body)' }}>
                                                        Troca por <strong>{item.interest_event_name}</strong>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action Button */}
                                <button
                                    className="btn"
                                    style={{
                                        width: '100%',
                                        background: (item.interest_event_name && item.type !== 'PROCURA') ? 'var(--primary)' : 'var(--secondary)',
                                        color: 'white',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        boxShadow: 'none', // Flat style inside card
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAction(item);
                                    }}
                                >
                                    {(item.interest_event_name && item.type !== 'PROCURA') ? (
                                        <>
                                            <Repeat size={20} />
                                            Vamos Trocar?
                                        </>
                                    ) : item.type === 'PROCURA' ? (
                                        <>
                                            <Check size={20} />
                                            Eu tenho!
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingBag size={20} />
                                            Tenho Interesse
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {currentListings.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                        <div style={{ background: 'var(--bg)', display: 'inline-flex', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                            {activeTab === 'EXCHANGE' ? <Repeat size={32} /> : activeTab === 'SALE' ? <ShoppingBag size={32} /> : <ShoppingCart size={32} />}
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
                            Nada por aqui ainda
                        </h3>
                        <p style={{ fontSize: '0.875rem' }}>Seja o primeiro a criar um anúncio nesta categoria!</p>
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            {/* Bottom Nav removed - handled globally */}

            {/* Modal removed as requested */}
        </div>
    );
}
