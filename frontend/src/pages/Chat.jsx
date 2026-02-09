import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { getAccessToken } from "../services/api";
import { ArrowLeft, Send, MoreVertical, ShieldAlert, Phone, Video, Image as ImageIcon, Smile } from "lucide-react";

// Mock socket for now, or use real one if implemented
// import { io } from "socket.io-client";

export default function Chat() {
    const { partnerId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [partner, setPartner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const [sending, setSending] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!getAccessToken()) {
            navigate("/login");
            return;
        }
        fetchChat();

        // Poll for new messages every 3s (simple realtime)
        const interval = setInterval(fetchChat, 3000);
        return () => clearInterval(interval);
    }, [partnerId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchChat = async () => {
        try {
            // Fetch messages
            const resp = await api.get(`/api/chat/${partnerId}`);
            setMessages(resp.data.messages || []);

            // Also fetch partner details if not yet known specific endpoint or from messages?
            // Usually we might have a separate endpoint or get it from `Conversations`.
            // Ideally backend returns partner info in `messages` envelope or we fetch profile.
            // For now, let's assume `resp.data.partner` exists or we mock it from message data.
            if (resp.data.partner) {
                setPartner(resp.data.partner);
            } else if (resp.data.messages.length > 0) {
                // Try to deduce partner from a message where sender_id == partnerId
                const msg = resp.data.messages.find(m => m.sender_id === parseInt(partnerId));
                if (msg && msg.sender) {
                    setPartner(msg.sender);
                }
            }

            // If still no partner, we might need to fetch user profile
            if (!partner && !resp.data.partner) {
                try {
                    const userResp = await api.get(`/users/${partnerId}`);
                    setPartner(userResp.data);
                } catch (e) {
                    // Silent fail
                }
            }

        } catch (error) {
            console.error("Error fetching chat", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            await api.post("/api/chat/send", {
                receiver_id: partnerId,
                content: newMessage
            });
            setNewMessage("");
            fetchChat(); // Refresh immediately
        } catch (error) {
            console.error("Error sending message", error);
            alert("Erro ao enviar mensagem");
        } finally {
            setSending(false);
        }
    };

    const handleBlock = async () => {
        if (confirm("Bloquear este usuário?")) {
            try {
                await api.post("/users/block", { blocked_id: partnerId });
                navigate("/conversations");
            } catch (e) {
                alert("Erro ao bloquear");
            }
        }
    };

    const handleReport = async () => {
        const reason = prompt("Motivo da denúncia:");
        if (reason) {
            try {
                await api.post("/users/report", { reported_id: partnerId, reason });
                alert("Denúncia enviada");
            } catch (e) {
                alert("Erro ao denunciar");
            }
        }
    };

    if (loading && !partner) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Carregando...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F8FAFC' }}>
            {/* Header */}
            <header style={{
                padding: '16px 20px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                zIndex: 50,
                position: 'relative'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => navigate("/conversations")} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-main)' }}>
                        <ArrowLeft size={24} />
                    </button>

                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#E2E8F0',
                            overflow: 'hidden',
                            border: '2px solid white',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}>
                            {partner?.profile_image_url ? (
                                <img src={partner.profile_image_url} alt={partner?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>{partner?.name?.charAt(0) || '?'}</div>
                            )}
                        </div>
                        {/* Online Status Dot - Mocked for now */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#10B981',
                            border: '2px solid white'
                        }} />
                    </div>

                    <div>
                        <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, fontFamily: 'var(--font-heading)', color: 'var(--text-main)' }}>
                            {partner?.name || "Usuário"}
                        </h2>
                        <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: '500' }}>Online agora</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {/* <button className="btn btn-ghost" style={{ padding: '8px' }}><Phone size={20} /></button> */}
                    <button
                        className="btn btn-ghost"
                        style={{ padding: '8px', color: 'var(--text-muted)' }}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        <MoreVertical size={20} />
                    </button>

                    {menuOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '60px',
                            right: '20px',
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow-lg)',
                            padding: '8px',
                            minWidth: '150px',
                            flexDirection: 'column',
                            display: 'flex',
                            gap: '4px',
                            animation: 'slideUp 0.2s ease-out'
                        }}>
                            <button
                                onClick={() => { handleReport(); setMenuOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 12px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-main)',
                                    fontSize: '0.9rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                <ShieldAlert size={16} /> Denunciar
                            </button>
                            <button
                                onClick={() => { handleBlock(); setMenuOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 12px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#EF4444',
                                    fontSize: '0.9rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                <ShieldAlert size={16} /> Bloquear
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                {/* Date separator example */}
                <div style={{ textAlign: 'center', margin: '12px 0' }}>
                    <span style={{ background: '#E2E8F0', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', color: '#64748B', fontWeight: '500' }}>Hoje</span>
                </div>

                {messages.map((msg, index) => {
                    const isMe = msg.sender_id !== parseInt(partnerId);
                    // Check if previous message was from same sender to group bubbles
                    const isSequence = index > 0 && messages[index - 1].sender_id === msg.sender_id;

                    return (
                        <div
                            key={msg.id || index}
                            style={{
                                display: 'flex',
                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                marginBottom: isSequence ? '2px' : '10px'
                            }}
                        >
                            {!isMe && !isSequence && (
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#E2E8F0', overflow: 'hidden', marginRight: '8px', marginTop: 'auto' }}>
                                    {partner?.profile_image_url && <img src={partner.profile_image_url} style={{ width: '100%', height: '100%' }} />}
                                </div>
                            )}
                            {!isMe && isSequence && <div style={{ width: '36px' }} />} {/* Placeholder spacing */}

                            <div style={{
                                padding: '10px 16px',
                                background: isMe ? 'linear-gradient(135deg, var(--primary) 0%, #F43F5E 100%)' : 'white',
                                color: isMe ? 'white' : 'var(--text-main)',
                                borderRadius: '20px',
                                borderBottomRightRadius: isMe ? '4px' : '20px',
                                borderBottomLeftRadius: !isMe ? '4px' : '20px',
                                boxShadow: isMe ? '0 4px 15px rgba(225, 29, 72, 0.2)' : '0 2px 5px rgba(0,0,0,0.05)',
                                maxWidth: '75%',
                                position: 'relative',
                                fontSize: '0.95rem',
                                lineHeight: '1.4'
                            }}>
                                {msg.content}
                                <div style={{
                                    fontSize: '0.65rem',
                                    color: isMe ? 'rgba(255,255,255,0.8)' : '#94A3B8',
                                    textAlign: 'right',
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: '4px'
                                }}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isMe && <span>✓✓</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
                onSubmit={handleSendMessage}
                style={{
                    padding: '16px 20px',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'end', // Align bottom to handle multi-line if we used textarea
                    gap: '12px',
                    borderTop: '1px solid #F1F5F9',
                    paddingBottom: '24px' // Safe area for mobile
                }}
            >
                <button type="button" style={{ padding: '10px', borderRadius: '50%', background: '#F1F5F9', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                    <ImageIcon size={20} />
                </button>

                <div style={{ flex: 1, position: 'relative' }}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        style={{
                            width: '100%',
                            padding: '14px 44px 14px 20px',
                            borderRadius: '24px',
                            border: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                            fontFamily: 'var(--font-body)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                    />
                    <button type="button" style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer'
                    }}>
                        <Smile size={20} />
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    style={{
                        padding: '14px',
                        borderRadius: '50%',
                        background: (sending || !newMessage.trim()) ? '#E2E8F0' : 'var(--primary)',
                        color: (sending || !newMessage.trim()) ? '#94A3B8' : 'white',
                        border: 'none',
                        cursor: (sending || !newMessage.trim()) ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: (sending || !newMessage.trim()) ? 'none' : '0 4px 12px rgba(225, 29, 72, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}
