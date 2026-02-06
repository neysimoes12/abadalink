import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { getAccessToken } from "../services/api";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";

export default function Chat() {
    const { partnerId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [partner, setPartner] = useState(null);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!getAccessToken()) {
            navigate("/login");
            return;
        }
        if (partnerId) {
            fetchMessages();
            // Poll for new messages every 3 seconds
            const interval = setInterval(fetchMessages, 3000);
            return () => clearInterval(interval);
        }
    }, [partnerId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async () => {
        try {
            const resp = await api.get(`/chat/${partnerId}`);
            setMessages(resp.data.messages);
            // Get partner info from first message or separately
            if (!partner && resp.data.messages.length > 0) {
                const otherMsg = resp.data.messages.find(m => !m.is_mine);
                if (otherMsg) {
                    // Could fetch partner details here
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        try {
            await api.post("/chat/send", {
                receiver_id: partnerId,
                content: newMessage
            });
            setNewMessage('');
            await fetchMessages();
        } catch (error) {
            console.error(error);
            alert("Erro ao enviar mensagem");
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: '#FAFAFA',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        header: {
            padding: '16px 20px',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            flexShrink: 0
        },
        messagesContainer: {
            flex: 1,
            overflow: 'auto',
            padding: '20px'
        },
        messageBubble: (isMine) => ({
            maxWidth: '75%',
            padding: '10px 14px',
            borderRadius: '18px',
            marginBottom: '8px',
            background: isMine ? 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)' : 'white',
            color: isMine ? 'white' : '#374151',
            alignSelf: isMine ? 'flex-end' : 'flex-start',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            wordBreak: 'break-word'
        }),
        inputContainer: {
            padding: '12px 20px',
            background: 'white',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            borderTop: '1px solid #E5E7EB',
            flexShrink: 0
        },
        input: {
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #E5E7EB',
            borderRadius: '24px',
            fontSize: '14px',
            outline: 'none'
        },
        sendBtn: {
            background: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
                <MessageCircle size={20} color="#F59E0B" />
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Chat</h1>
            </header>

            <div style={styles.messagesContainer}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                            <MessageCircle size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p>Nenhuma mensagem ainda.</p>
                            <p style={{ fontSize: '13px' }}>Envie uma mensagem para começar a conversa!</p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} style={styles.messageBubble(msg.is_mine)}>
                                {msg.content}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div style={styles.inputContainer}>
                <input
                    type="text"
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    style={styles.input}
                />
                <button onClick={handleSend} style={styles.sendBtn}>
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
}
