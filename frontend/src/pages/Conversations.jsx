import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { getAccessToken } from "../services/api";
import { ArrowLeft, MessageCircle, ChevronRight } from "lucide-react";

export default function Conversations() {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!getAccessToken()) {
            navigate("/login");
            return;
        }
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            const resp = await api.get("/chat/conversations");
            setConversations(resp.data.conversations);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}min`;
        if (diffHrs < 24) return `${diffHrs}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString('pt-BR');
    };

    const styles = {
        container: {
            minHeight: '100vh',
            background: '#FAFAFA',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            transition: 'transform 0.1s',
        },
        avatar: {
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Conversas</h1>
            </header>

            <main style={styles.main}>
                {conversations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <MessageCircle size={48} color="#D1D5DB" style={{ marginBottom: '16px' }} />
                        <h3 style={{ margin: '0 0 8px', color: '#374151' }}>Nenhuma conversa</h3>
                        <p style={{ color: '#9CA3AF', margin: 0 }}>Suas conversas com outros usuários aparecerão aqui.</p>
                    </div>
                ) : (
                    conversations.map(conv => (
                        <div
                            key={conv.partner_id}
                            style={styles.card}
                            onClick={() => navigate(`/chat/${conv.partner_id}`)}
                        >
                            <div style={styles.avatar}>
                                {conv.partner_avatar ? (
                                    <img
                                        src={conv.partner_avatar.startsWith('http') ? conv.partner_avatar : `http://localhost:8000${conv.partner_avatar}`}
                                        alt={conv.partner_name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '18px', color: '#9CA3AF' }}>
                                        {conv.partner_name?.charAt(0) || 'U'}
                                    </span>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: '700', fontSize: '15px' }}>{conv.partner_name}</span>
                                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{formatTime(conv.last_message_time)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{
                                        margin: 0,
                                        fontSize: '13px',
                                        color: '#6B7280',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '200px'
                                    }}>
                                        {conv.last_message || 'Sem mensagens'}
                                    </p>
                                    {conv.unread_count > 0 && (
                                        <span style={{
                                            background: '#F59E0B',
                                            color: 'white',
                                            borderRadius: '10px',
                                            padding: '2px 8px',
                                            fontSize: '11px',
                                            fontWeight: 'bold'
                                        }}>
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <ChevronRight size={20} color="#D1D5DB" />
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
