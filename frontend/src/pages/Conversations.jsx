import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { getAccessToken } from "../services/api";
import { ArrowLeft, MessageCircle, ChevronRight, Ban, Trash2, Flag, User } from "lucide-react";

// Helper to format time
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

const ConversationItem = ({ item, onDelete, onClick }) => {
    return (
        <div
            className="card"
            style={{
                background: 'var(--surface)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                borderRadius: '20px',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '12px',
                border: item.unread_count > 0 ? '1px solid var(--primary)' : '1px solid transparent',
                transition: 'transform 0.2s',
                position: 'relative'
            }}
            onClick={() => onClick(item)}
        >
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
                <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                    {item.partner_avatar ? (
                        <img
                            src={item.partner_avatar.startsWith('http') ? item.partner_avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${item.partner_avatar}`}
                            alt={item.partner_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <User size={24} color="#94A3B8" />
                    )}
                </div>
                {item.is_online && (
                    <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        border: '2px solid white'
                    }} />
                )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                    <h3 style={{
                        fontWeight: item.unread_count > 0 ? '700' : '600',
                        fontSize: '1rem',
                        color: 'var(--text-main)',
                        fontFamily: 'var(--font-heading)',
                        margin: 0
                    }}>
                        {item.partner_name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: item.unread_count > 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: item.unread_count > 0 ? '600' : '400' }}>
                        {formatTime(item.last_message_time)}
                    </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: item.unread_count > 0 ? 'var(--text-body)' : 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '180px',
                        fontWeight: item.unread_count > 0 ? '600' : '400'
                    }}>
                        {item.last_message || 'Inicie a conversa!'}
                    </p>
                    {item.unread_count > 0 && (
                        <div style={{
                            background: 'var(--primary)',
                            color: 'white',
                            borderRadius: '12px',
                            padding: '0 8px',
                            height: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(225, 29, 72, 0.2)'
                        }}>
                            {item.unread_count}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Action Integrated */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                }}
                style={{
                    border: 'none',
                    background: '#FEE2E2',
                    color: '#EF4444',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginLeft: '4px',
                    transition: 'all 0.2s'
                }}
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
};

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
            const resp = await api.get("/api/chat/conversations");
            setConversations(resp.data.conversations);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action, item) => {
        if (action === 'delete') {
            if (confirm("Tem certeza que deseja excluir esta conversa?")) {
                try {
                    await api.delete(`/api/chat/conversations/${item.partner_id}`);
                    fetchConversations();
                } catch (e) {
                    alert("Erro ao excluir");
                }
            }
        }
        else if (action === 'block') {
            if (confirm(`Deseja bloquear ${item.partner_name}?`)) {
                try {
                    await api.post("/users/block", { blocked_id: item.partner_id });
                    fetchConversations();
                    alert("Usuário bloqueado");
                } catch (e) {
                    alert("Erro ao bloquear");
                }
            }
        }
        else if (action === 'report') {
            const reason = prompt("Qual o motivo da denúncia?");
            if (reason) {
                try {
                    await api.post("/users/report", {
                        reported_id: item.partner_id,
                        reason: reason,
                        description: "Denúncia via chat"
                    });
                    alert("Denúncia enviada. Vamos analisar.");
                } catch (e) {
                    alert("Erro ao denunciar");
                }
            }
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header className="header" style={{ marginBottom: '24px' }}>
                <button onClick={() => navigate('/market')} className="btn btn-ghost">
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Conversas</h1>
                <div style={{ width: 24 }} />
            </header>

            <main>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
                ) : conversations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <div style={{
                            background: 'var(--surface)',
                            display: 'inline-flex',
                            padding: '24px',
                            borderRadius: '50%',
                            marginBottom: '24px',
                            boxShadow: 'var(--shadow-md)'
                        }}>
                            <MessageCircle size={48} color="var(--primary)" style={{ opacity: 0.8 }} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', color: 'var(--text-main)', fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>Nenhuma conversa</h3>
                        <p style={{ margin: 0 }}>Suas conversas com outros usuários aparecerão aqui.</p>
                    </div>
                ) : (
                    conversations.map(conv => (
                        <ConversationItem
                            key={conv.partner_id}
                            item={conv}
                            onDelete={(item) => handleAction('delete', item)}
                            onClick={() => navigate(`/chat/${conv.partner_id}`)}
                        />
                    ))
                )}
            </main>
        </div>
    );
}
