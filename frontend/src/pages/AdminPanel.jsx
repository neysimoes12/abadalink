import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ArrowLeft, Plus, Edit2, Trash2, Shield, Users, Calendar, MapPin, Search, Upload, Ban, CheckCircle, Download } from "lucide-react";

export default function AdminPanel() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('events'); // 'events' or 'users'
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [eventFormData, setEventFormData] = useState({
        category: 'BLOCO',
        name: '',
        day: 'Quinta',
        gender: 'UNISSEX'
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'events') {
                const resp = await api.get('/api/admin/events');
                setEvents(resp.data);
            } else {
                const resp = await api.get('/api/admin/users');
                setUsers(resp.data);
            }
        } catch (error) {
            console.error("Access denied or server error", error);
            if (error.response?.status === 403 || error.response?.status === 401) {
                alert("Acesso restrito a administradores.");
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingEvent) {
                await api.put(`/api/admin/events/${editingEvent.id}`, eventFormData);
            } else {
                await api.post('/api/admin/events', eventFormData);
            }
            setIsEventModalOpen(false);
            setEditingEvent(null);
            setEventFormData({ category: 'BLOCO', name: '' });
            fetchData();
        } catch (error) {
            alert("Erro ao salvar evento");
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!confirm("Excluir este evento permanentemente?")) return;
        try {
            await api.delete(`/api/admin/events/${id}`);
            fetchData();
        } catch (error) {
            alert("Erro ao excluir");
        }
    };

    const handleLogoUpload = async (eventId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post(`/api/admin/events/${eventId}/logo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchData();
        } catch (error) {
            alert("Erro no upload da logo");
        }
    };

    const handleToggleBlock = async (user) => {
        const action = user.is_blocked ? 'desbloquear' : 'bloquear';
        if (!confirm(`Deseja ${action} ${user.name}?`)) return;

        try {
            await api.post(`/api/admin/users/${user.id}/block`, null, {
                params: { blocked: !user.is_blocked }
            });
            fetchData();
        } catch (error) {
            alert("Erro ao alterar status do usuário");
        }
    };

    const handleExportUsers = () => {
        if (!users || users.length === 0) {
            alert("Nenhum usuário para exportar.");
            return;
        }

        const headers = ["ID", "Nome", "Email", "Telefone", "CPF", "Tipo Documento", "Número Documento", "Status", "Admin", "Verificado", "Data Criação"];
        const csvContent = [
            headers.join(","),
            ...users.map(u => [
                u.id,
                `"${u.name}"`,
                u.email,
                u.phone || '',
                u.cpf,
                u.document_type || '',
                u.document_number || '',
                u.is_blocked ? "BLOQUEADO" : "ATIVO",
                u.is_admin ? "SIM" : "NÃO",
                u.is_verified ? "SIM" : "NÃO",
                u.created_at || ''
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "usuarios_abadalink.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const styles = {
        container: { minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif', paddingBottom: '40px' },
        header: { padding: '20px', background: 'white', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #E5E7EB' },
        nav: { display: 'flex', background: 'white', borderBottom: '1px solid #E5E7EB', padding: '0 20px' },
        navItem: (active) => ({
            padding: '16px 24px',
            fontSize: '14px',
            fontWeight: '600',
            color: active ? '#2563EB' : '#6B7280',
            borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }),
        content: { padding: '24px' },
        table: { width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
        th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #F3F4F6', color: '#6B7280', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
        td: { padding: '16px', borderBottom: '1px solid #F3F4F6', fontSize: '14px' },
        fab: { position: 'fixed', bottom: '24px', right: '24px', background: '#2563EB', color: 'white', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)', border: 'none', cursor: 'pointer' },
        modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
        modalContent: { background: 'white', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px' },
        inputGroup: { marginBottom: '16px' },
        label: { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' },
        input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none' }
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={24} /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={24} color="#2563EB" />
                    <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>ADMIN PANEL</h1>
                </div>
            </header>

            <nav style={styles.nav}>
                <div style={styles.navItem(activeTab === 'events')} onClick={() => setActiveTab('events')}><Calendar size={18} /> Eventos</div>
                <div style={styles.navItem(activeTab === 'users')} onClick={() => setActiveTab('users')}><Users size={18} /> Usuários</div>
            </nav>

            <main style={styles.content}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Carregando dados...</div>
                ) : activeTab === 'events' ? (
                    <>
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Gerenciar Base de Eventos</h2>
                            <button onClick={() => { setEditingEvent(null); setIsEventModalOpen(true); }} className="btn" style={{ background: '#2563EB', color: 'white', fontSize: '13px' }}>+ Novo Evento</button>
                        </div>

                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Logo/ID</th>
                                    <th style={styles.th}>Evento</th>
                                    <th style={styles.th}>Dia</th>
                                    <th style={styles.th}>Gênero</th>
                                    <th style={styles.th}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map(event => (
                                    <tr key={event.id}>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {event.logo_url ? (
                                                    <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${event.logo_url}`} style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} alt="logo" />
                                                ) : (
                                                    <div style={{ width: '32px', height: '32px', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}><Upload size={14} color="#9CA3AF" /></div>
                                                )}
                                                <input type="file" onChange={(e) => handleLogoUpload(event.id, e.target.files[0])} style={{ display: 'none' }} id={`logo-${event.id}`} />
                                                <label htmlFor={`logo-${event.id}`} style={{ fontSize: '10px', color: '#2563EB', cursor: 'pointer' }}>Upload</label>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ fontWeight: '700' }}>{event.name}</div>
                                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{event.category}</div>
                                        </td>
                                        <td style={styles.td}>
                                            <div>{event.day}</div>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{ padding: '4px 8px', background: '#F3F4F6', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{event.gender}</span>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => { setEditingEvent(event); setEventFormData(event); setIsEventModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                                <button onClick={() => handleDeleteEvent(event.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9CA3AF' }} />
                                <input
                                    style={{ ...styles.input, paddingLeft: '40px' }}
                                    placeholder="Buscar por nome ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                            <button onClick={handleExportUsers} style={{ background: '#10B981', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                <Download size={16} /> Exportar CSV
                            </button>
                        </div>

                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Usuário</th>
                                    <th style={styles.th}>CPF</th>
                                    <th style={styles.th}>Documento</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td style={styles.td}>
                                            <div style={{ fontWeight: '700' }}>{user.name}</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{user.email}</div>
                                        </td>
                                        <td style={styles.td}>{user.cpf}</td>
                                        <td style={styles.td}>
                                            <div style={{ fontSize: '12px' }}>{user.document_type || '-'}</div>
                                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{user.document_number}</div>
                                        </td>
                                        <td style={styles.td}>
                                            {user.is_blocked ? (
                                                <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '12px' }}>BLOQUEADO</span>
                                            ) : (
                                                <span style={{ color: '#10B981', fontWeight: 'bold', fontSize: '12px' }}>ATIVO</span>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => handleToggleBlock(user)}
                                                style={{
                                                    border: 'none',
                                                    background: user.is_blocked ? '#D1FAE5' : '#FEE2E2',
                                                    color: user.is_blocked ? '#059669' : '#DC2626',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {user.is_blocked ? 'Desbloquear' : 'Bloquear'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </main>

            {isEventModalOpen && (
                <div style={styles.modal}>
                    <div style={styles.modalContent} className="animate-slideUp">
                        <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                        <form onSubmit={handleEventSubmit}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Categoria</label>
                                <select style={styles.input} value={eventFormData.category} onChange={e => setEventFormData({ ...eventFormData, category: e.target.value })}>
                                    <option value="BLOCO">Bloco</option>
                                    <option value="CAMAROTE">Camarote</option>
                                </select>
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Nome do Bloco/Camarote</label>
                                <input style={styles.input} value={eventFormData.name} onChange={e => setEventFormData({ ...eventFormData, name: e.target.value })} required />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                                <button type="button" onClick={() => setIsEventModalOpen(false)} style={{ flex: 1, padding: '12px', border: '1px solid #D1D5DB', borderRadius: '8px', background: 'white' }}>Cancelar</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#2563EB', color: 'white', fontWeight: 'bold' }}>Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
