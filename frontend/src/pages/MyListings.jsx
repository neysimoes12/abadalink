import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { getAccessToken } from "../services/api";
import { ArrowLeft, Trash2, Edit, Ticket, Calendar, MapPin, Repeat, ShoppingBag } from "lucide-react";

export default function MyListings() {
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!getAccessToken()) {
            navigate("/login");
            return;
        }
        fetchListings();
    }, []);

    const fetchListings = async () => {
        try {
            const resp = await api.get("/market/my-listings");
            setListings(resp.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Tem certeza que deseja excluir este anúncio?")) return;

        try {
            await api.delete(`/market/listings/${id}`);
            setListings(listings.filter(l => l.id !== id));
        } catch (error) {
            console.error(error);
            alert("Erro ao excluir anúncio");
        }
    };

    const getTypeIcon = (type) => {
        if (type === 'BLOCO') return <Ticket size={16} />;
        if (type === 'CAMAROTE') return <ShoppingBag size={16} />;
        return <Repeat size={16} />;
    };

    const getTypeColor = (type) => {
        if (type === 'BLOCO') return '#F59E0B';
        if (type === 'CAMAROTE') return '#8B5CF6';
        return '#3B82F6';
    };

    const styles = {
        container: {
            minHeight: '100vh',
            background: '#FAFAFA',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            paddingBottom: '100px'
        },
        header: {
            padding: '20px',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        },
        main: {
            padding: '20px'
        },
        card: {
            background: 'white',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #F3F4F6'
        },
        cardHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '12px'
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '700'
        },
        infoRow: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#6B7280',
            marginBottom: '6px'
        },
        actions: {
            display: 'flex',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #F3F4F6'
        },
        btn: {
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Meus Anúncios</h1>
            </header>

            <main style={styles.main}>
                {listings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Ticket size={48} color="#D1D5DB" style={{ marginBottom: '16px' }} />
                        <h3 style={{ margin: '0 0 8px', color: '#374151' }}>Nenhum anúncio</h3>
                        <p style={{ color: '#9CA3AF', margin: '0 0 20px' }}>Você ainda não criou nenhum anúncio.</p>
                        <button
                            onClick={() => navigate('/sell')}
                            style={{
                                background: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Criar Anúncio
                        </button>
                    </div>
                ) : (
                    listings.map(listing => (
                        <div key={listing.id} style={styles.card}>
                            {listing.image_url && (
                                <img
                                    src={listing.image_url}
                                    alt="Abadá"
                                    style={{
                                        width: '100%',
                                        height: '140px',
                                        objectFit: 'cover',
                                        borderRadius: '12px',
                                        marginBottom: '12px'
                                    }}
                                />
                            )}
                            <div style={styles.cardHeader}>
                                <div>
                                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700' }}>
                                        {listing.event_name}
                                    </h3>
                                    <span style={{
                                        ...styles.badge,
                                        background: `${getTypeColor(listing.type)}20`,
                                        color: getTypeColor(listing.type)
                                    }}>
                                        {getTypeIcon(listing.type)}
                                        {listing.type}
                                    </span>
                                </div>
                                {listing.product_value > 0 && (
                                    <span style={{
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: '#10B981'
                                    }}>
                                        R$ {listing.product_value.toFixed(0)}
                                    </span>
                                )}
                            </div>

                            <div style={styles.infoRow}>
                                <Calendar size={14} />
                                {listing.event_date}
                            </div>
                            <div style={styles.infoRow}>
                                <MapPin size={14} />
                                {listing.circuit}
                            </div>

                            {listing.interest_event_name && (
                                <div style={{
                                    background: '#FEF3C7',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    marginTop: '10px',
                                    fontSize: '12px',
                                    color: '#92400E'
                                }}>
                                    <strong>Quer trocar por:</strong> {listing.interest_event_name}
                                </div>
                            )}

                            <div style={styles.actions}>
                                <button
                                    style={{ ...styles.btn, background: '#FEE2E2', color: '#DC2626' }}
                                    onClick={() => handleDelete(listing.id)}
                                >
                                    <Trash2 size={16} />
                                    Excluir
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
