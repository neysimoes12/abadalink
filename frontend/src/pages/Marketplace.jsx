import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getAccessToken } from '../services/api';
import { Search, Home, User, Plus, Ticket, Calendar, MapPin, Heart, Repeat, ShoppingBag, ShoppingCart, X, Filter } from 'lucide-react';

export default function Marketplace() {
    const [listings, setListings] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState('EXCHANGE'); // 'EXCHANGE', 'SALE', or 'BUY'
    const [showFilters, setShowFilters] = useState(false);
    const [filterDay, setFilterDay] = useState('');
    const [filterCircuit, setFilterCircuit] = useState('');
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

    const handleAction = (item) => {
        if (!isLoggedIn) {
            navigate('/login', { state: { returnTo: '/market', itemId: item.id } });
            return;
        }
        if (item.seller_id === currentUserId) {
            alert("Este é seu próprio anúncio!");
            return;
        }

        // Different action based on type
        if (item.type === 'PROCURA') {
            alert(`Usuário quer comprar: ${item.interest_event_name}\nEntre em contato!`);
        } else {
            alert(`Proposta para: ${item.event_name}\nID: ${item.id}`);
        }
        setSelectedItem(null);
    };

    // Filter by search term AND advanced filters
    const searchFiltered = listings.filter(item => {
        // Text search
        const matchesSearch = item.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.interest_event_name && item.interest_event_name.toLowerCase().includes(searchTerm.toLowerCase()));

        // Day filter
        const matchesDay = !filterDay || item.event_date?.includes(filterDay);

        // Circuit filter
        const matchesCircuit = !filterCircuit || item.circuit?.toLowerCase().includes(filterCircuit.toLowerCase());

        // Type filter
        const matchesType = !filterType || item.type === filterType;

        return matchesSearch && matchesDay && matchesCircuit && matchesType;
    });

    // Separate by type
    const tradeListings = searchFiltered.filter(item => item.interest_event_name && item.type !== 'PROCURA');
    const saleListings = searchFiltered.filter(item => !item.interest_event_name && item.type !== 'PROCURA');
    const buyListings = searchFiltered.filter(item => item.type === 'PROCURA');

    const currentListings = activeTab === 'EXCHANGE' ? tradeListings : activeTab === 'SALE' ? saleListings : buyListings;

    // Placeholder images for cards
    const getPlaceholderImage = (type, index) => {
        const colors = ['FFD700', 'FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7'];
        return `https://placehold.co/300x200/${colors[index % colors.length]}/white?text=${type}`;
    };

    return (
        <div className="container">
            {/* Header */}
            <header className="header">
                <div className="logo">
                    <div className="logo-icon">
                        <Ticket size={18} />
                    </div>
                    <span className="logo-text">ABADA<span>LINK</span></span>
                </div>
            </header>

            {/* Search */}
            <div className="search-container">
                <div className="search-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            className="search-bar"
                            placeholder="Buscar evento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            background: showFilters || filterDay || filterCircuit || filterType ? 'var(--gold)' : 'white',
                            color: showFilters || filterDay || filterCircuit || filterType ? 'white' : '#6B7280',
                            border: '1px solid #E5E7EB',
                            borderRadius: '12px',
                            padding: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div style={{
                    padding: '12px 20px',
                    background: 'white',
                    margin: '0 20px 12px',
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <select
                            value={filterDay}
                            onChange={e => setFilterDay(e.target.value)}
                            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px' }}
                        >
                            <option value="">Dia</option>
                            <option value="Quinta">Quinta</option>
                            <option value="Sexta">Sexta</option>
                            <option value="Sábado">Sábado</option>
                            <option value="Domingo">Domingo</option>
                            <option value="Segunda">Segunda</option>
                            <option value="Terça">Terça</option>
                        </select>
                        <select
                            value={filterCircuit}
                            onChange={e => setFilterCircuit(e.target.value)}
                            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px' }}
                        >
                            <option value="">Circuito</option>
                            <option value="Barra">Barra-Ondina</option>
                            <option value="Campo">Campo Grande</option>
                        </select>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px' }}
                        >
                            <option value="">Tipo</option>
                            <option value="BLOCO">Bloco</option>
                            <option value="CAMAROTE">Camarote</option>
                        </select>
                    </div>
                    {(filterDay || filterCircuit || filterType) && (
                        <button
                            onClick={() => { setFilterDay(''); setFilterCircuit(''); setFilterType(''); }}
                            style={{ width: '100%', padding: '8px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Limpar Filtros
                        </button>
                    )}
                </div>
            )}

            {/* Tabs - 3 options */}
            <div style={{
                display: 'flex',
                padding: '0 20px',
                marginBottom: '16px',
                gap: '6px'
            }}>
                <button
                    onClick={() => setActiveTab('EXCHANGE')}
                    style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        background: activeTab === 'EXCHANGE' ? 'linear-gradient(135deg, var(--gold) 0%, #EC4899 100%)' : 'var(--gray-100)',
                        color: activeTab === 'EXCHANGE' ? 'white' : 'var(--gray-500)',
                        transition: 'all 0.2s'
                    }}
                >
                    <Repeat size={16} />
                    Trocas
                    <span style={{
                        background: activeTab === 'EXCHANGE' ? 'rgba(255,255,255,0.3)' : 'var(--gray-200)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '0.7rem'
                    }}>
                        {tradeListings.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('SALE')}
                    style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        background: activeTab === 'SALE' ? 'var(--green)' : 'var(--gray-100)',
                        color: activeTab === 'SALE' ? 'white' : 'var(--gray-500)',
                        transition: 'all 0.2s'
                    }}
                >
                    <ShoppingBag size={16} />
                    Vendas
                    <span style={{
                        background: activeTab === 'SALE' ? 'rgba(255,255,255,0.3)' : 'var(--gray-200)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '0.7rem'
                    }}>
                        {saleListings.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('BUY')}
                    style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        background: activeTab === 'BUY' ? 'var(--blue)' : 'var(--gray-100)',
                        color: activeTab === 'BUY' ? 'white' : 'var(--gray-500)',
                        transition: 'all 0.2s'
                    }}
                >
                    <ShoppingCart size={16} />
                    Compras
                    <span style={{
                        background: activeTab === 'BUY' ? 'rgba(255,255,255,0.3)' : 'var(--gray-200)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '0.7rem'
                    }}>
                        {buyListings.length}
                    </span>
                </button>
            </div>

            {/* Cards Grid */}
            <div className="cards-grid">
                {currentListings.map((item, index) => (
                    <div
                        key={item.id}
                        className="card animate-slideUp"
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => setSelectedItem(item)}
                    >
                        <img
                            src={getPlaceholderImage(item.type, index)}
                            alt={item.event_name}
                            className="card-image"
                        />
                        <div className="card-content">
                            {item.type === 'PROCURA' ? (
                                <>
                                    <h3 className="card-title" style={{ color: 'var(--blue)' }}>
                                        🔎 Procurando
                                    </h3>
                                    <p className="card-date" style={{ fontSize: '0.85rem' }}>
                                        {item.interest_event_name?.split(', ').slice(0, 2).join(', ')}
                                        {item.interest_event_name?.split(', ').length > 2 && ' ...'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h3 className="card-title">{item.event_name}</h3>
                                    <p className="card-date">{item.event_date}</p>
                                </>
                            )}
                            <div className="card-footer">
                                {item.product_value > 0 && (
                                    <span className="price-tag">
                                        R$ {item.product_value.toFixed(0)}
                                    </span>
                                )}
                                {item.type !== 'PROCURA' && (
                                    <span className={`badge ${item.type === 'BLOCO' ? 'badge-bloco' : 'badge-camarote'}`}>
                                        {item.type}
                                    </span>
                                )}
                                {item.type === 'PROCURA' && (
                                    <span className="badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
                                        COMPRA
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {currentListings.length === 0 && (
                <div className="empty-state animate-fadeIn">
                    <div className="empty-state-icon">
                        {activeTab === 'EXCHANGE' ? <Repeat size={40} /> : activeTab === 'SALE' ? <ShoppingBag size={40} /> : <ShoppingCart size={40} />}
                    </div>
                    <h3 className="empty-state-title">
                        {activeTab === 'EXCHANGE' ? 'Nenhuma troca disponível' : activeTab === 'SALE' ? 'Nenhuma venda disponível' : 'Nenhuma procura registrada'}
                    </h3>
                    <p className="empty-state-text">Seja o primeiro a anunciar!</p>
                </div>
            )}

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <button className="nav-item active">
                    <Home size={22} />
                    <span>Home</span>
                </button>
                <button className="nav-item">
                    <Search size={22} />
                </button>
                <button
                    className="nav-fab"
                    onClick={() => isLoggedIn ? navigate('/sell') : navigate('/login')}
                >
                    <Plus size={28} />
                </button>
                <button
                    className="nav-item"
                    onClick={() => isLoggedIn ? navigate('/matches') : navigate('/login')}
                >
                    <Heart size={22} />
                    <span style={{ fontSize: '0.6rem' }}>Matches</span>
                </button>
                <button
                    className="nav-item"
                    onClick={() => isLoggedIn ? navigate('/profile') : navigate('/login')}
                >
                    <User size={22} />
                </button>
            </nav>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="modal-overlay animate-fadeIn" onClick={() => setSelectedItem(null)}>
                    <div className="modal-content animate-slideUp" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {selectedItem.type === 'PROCURA' ? (
                                <span className="badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
                                    <ShoppingCart size={10} style={{ marginRight: '4px' }} /> PROCURA
                                </span>
                            ) : (
                                <>
                                    <span className={`badge ${selectedItem.type === 'BLOCO' ? 'badge-bloco' : 'badge-camarote'}`}>
                                        {selectedItem.type}
                                    </span>
                                    {selectedItem.interest_event_name && (
                                        <span className="badge badge-troca">
                                            <Repeat size={10} style={{ marginRight: '4px' }} /> Troca
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        {selectedItem.type === 'PROCURA' ? (
                            <>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--blue)' }}>
                                    🔎 Usuário Quer Comprar
                                </h2>

                                <div style={{
                                    background: 'var(--blue-light)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    marginBottom: '16px'
                                }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--blue)', fontWeight: '600', marginBottom: '8px' }}>
                                        Abadás procurados:
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {selectedItem.interest_event_name?.split(', ').map((name, i) => (
                                            <span key={i} style={{
                                                background: 'white',
                                                padding: '6px 12px',
                                                borderRadius: '16px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600'
                                            }}>
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {selectedItem.product_value > 0 && (
                                    <div style={{
                                        background: 'var(--green-light)',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        marginBottom: '16px',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '4px' }}>
                                            Orçamento disponível:
                                        </p>
                                        <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--green)' }}>
                                            R$ {selectedItem.product_value.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
                                    {selectedItem.event_name}
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', color: 'var(--gray-600)' }}>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={16} /> {selectedItem.event_date}
                                    </p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MapPin size={16} /> Circuito {selectedItem.circuit}
                                    </p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <User size={16} /> {selectedItem.gender}
                                    </p>
                                </div>

                                {selectedItem.product_value > 0 && (
                                    <div style={{
                                        background: 'var(--green-light)',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        marginBottom: '16px',
                                        textAlign: 'center'
                                    }}>
                                        <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--green)' }}>
                                            R$ {selectedItem.product_value.toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                {selectedItem.interest_event_name && (
                                    <div style={{
                                        background: '#FEF3C7',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        marginBottom: '16px'
                                    }}>
                                        <p style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Heart size={12} /> Quer trocar por:
                                        </p>
                                        <p style={{ fontWeight: '700' }}>{selectedItem.interest_event_name}</p>
                                        {selectedItem.interest_type && (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                                                {selectedItem.interest_type} • {selectedItem.interest_event_date}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        <button
                            className="btn btn-primary w-full"
                            onClick={() => handleAction(selectedItem)}
                        >
                            {selectedItem.type === 'PROCURA'
                                ? 'TENHO O QUE PROCURA!'
                                : selectedItem.interest_event_name
                                    ? 'PROPOR TROCA'
                                    : 'QUERO COMPRAR'}
                        </button>

                        <button
                            className="btn btn-ghost w-full mt-4"
                            onClick={() => setSelectedItem(null)}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
