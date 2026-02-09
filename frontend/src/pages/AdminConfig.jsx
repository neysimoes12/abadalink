import React, { useState, useEffect } from 'react';
import api, { getAccessToken, clearTokens } from '../services/api';
import { Plus, Settings, MapPin, Tag, Pencil, X, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CIRCUITS = [];

// Sort function defined outside to be safe
const safeSort = (a, b) => (a.name || '').localeCompare(b.name || '');

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-red-500 p-10 flex flex-col items-center justify-center">
                    <h1 className="text-3xl font-bold mb-4">Ocorreu um erro no render.</h1>
                    <div className="bg-gray-900 p-6 rounded border border-red-900 max-w-2xl w-full overflow-auto">
                        <pre className="whitespace-pre-wrap font-mono text-sm">{this.state.error?.toString()}</pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
                    >
                        Recarregar Página
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function AdminConfigContent() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [editingId, setEditingId] = useState(null);

    // 3 BOXES FORM
    const [formData, setFormData] = useState({
        category: 'BLOCO',
        name: '',
    });

    useEffect(() => {
        checkAdminAccess();
    }, []);

    const checkAdminAccess = async () => {
        try {
            const token = getAccessToken();
            const isAdmin = localStorage.getItem('isAdmin') === 'true';

            if (!token) {
                navigate('/login');
                return;
            }

            if (!isAdmin) {
                alert('Acesso restrito a administradores');
                navigate('/');
                return;
            }

            fetchItems();
        } catch (error) {
            console.error(error);
            navigate('/login');
        }
    };

    const fetchItems = async () => {
        try {
            const res = await api.get('/admin/options');
            if (Array.isArray(res.data)) {
                setItems(res.data);
            }
        } catch (e) { console.error(e); }
    };

    const handleEdit = (item) => {

        // PREVENT CRASH: Ensure item exists
        if (!item) return;

        console.log("Editing:", item);
        setEditingId(item.id);
        setFormData({
            category: item.category || 'BLOCO',
            name: item.name || '',
        });
        // Removed window.scroll to prevent interference
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ category: 'BLOCO', name: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        try {
            const payload = {
                ...formData
            };

            if (editingId) {
                await api.put(`/admin/options/${editingId}`, payload);
                alert("✅ Atualizado com sucesso!");
            } else {
                await api.post('/admin/options', payload);
                alert("✅ Cadastrado com sucesso!");
            }
            handleCancelEdit();
            fetchItems();
        } catch (error) {
            console.error("Update/Create Error:", error);
            console.error("Response Data:", error.response?.data);

            let errorMsg = "Falha ao salvar";
            if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                errorMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
            } else if (error.message) {
                errorMsg = error.message;
            }
            alert("Erro: " + errorMsg);
        }
    };

    const handleDelete = async (item) => {
        const confirmDelete = window.confirm(`⚠️ Tem certeza que deseja DELETAR "${item.name}"?\n\nEssa ação não pode ser desfeita.`);
        if (!confirmDelete) return;

        try {
            await api.delete(`/admin/options/${item.id}`);
            alert("🗑️ Item deletado com sucesso!");
            fetchItems();
        } catch (error) {
            console.error(error);
            alert("Erro ao deletar: " + (error.response?.data?.detail || "Falha"));
        }
    };

    // Safe Derived State
    const blocos = items.filter(i => i.category === 'BLOCO').sort(safeSort);
    const camarotes = items.filter(i => i.category === 'CAMAROTE').sort(safeSort);

    return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
            <div className="w-full max-w-4xl">
                <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Settings className="text-purple-500" /> Painel Administrativo
                    </h1>
                    <button onClick={() => navigate('/market')} className="text-gray-500 hover:text-white">
                        Voltar ao Marketplace
                    </button>
                </div>

                {/* FORM CONTAINER */}
                <div className={`premium-card mb-10 border transition-colors ${editingId ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-secondary/20'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <div className={`text-xl font-bold flex items-center gap-2 ${editingId ? 'text-yellow-500' : 'text-secondary'}`}>
                            {editingId ? (
                                <span className="flex items-center gap-2"><Pencil size={20} /> Editando Opção</span>
                            ) : (
                                <span className="flex items-center gap-2"><Plus size={20} /> Adicionar Nova Opção</span>
                            )}
                        </div>
                        {editingId && (
                            <button onClick={handleCancelEdit} type="button" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm bg-gray-800 px-3 py-1 rounded-full">
                                <X size={14} /> Cancelar Edição
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-900/50 p-6 rounded-lg border border-gray-800">

                        {/* BOX 1: TIPO */}
                        <div>
                            <label className="block text-xs font-bold mb-2 text-gray-400 uppercase tracking-wider">1. Tipo</label>
                            <select
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg h-12 px-3 text-white focus:border-secondary focus:outline-none"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="BLOCO">BLOCO</option>
                                <option value="CAMAROTE">CAMAROTE</option>
                            </select>
                        </div>

                        {/* BOX 2: NOME */}
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold mb-2 text-gray-400 uppercase tracking-wider">2. Nome</label>
                            <input
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg h-12 px-3 text-white focus:border-secondary focus:outline-none placeholder-gray-600"
                                placeholder="Ex: Coruja"
                            />
                        </div>

                        <button type="submit" className={`h-12 flex justify-center items-center gap-2 font-bold rounded-lg shadow-lg transition-all ${editingId
                            ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-900/20'
                            : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20'
                            }`}>
                            {editingId ? (
                                <span className="flex items-center gap-2"><Save size={20} /> ATUALIZAR</span>
                            ) : (
                                <span className="flex items-center gap-2"><Plus size={20} /> CADASTRAR</span>
                            )}
                        </button>
                    </form>
                </div>

                {/* DATA DISPLAY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Lista de Blocos */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
                        <div className="bg-gradient-to-r from-blue-900 to-gray-900 p-4 border-b border-gray-800">
                            <h3 className="font-bold text-lg text-blue-200 flex items-center gap-2">
                                <Tag size={18} /> Blocos Cadastrados
                            </h3>
                        </div>
                        <div className="h-[300px] overflow-auto p-4 space-y-2">
                            {blocos.map(item => (
                                <div key={item.id} className={`flex justify-between items-center p-3 rounded border transition-colors ${editingId === item.id ? 'bg-yellow-900/20 border-yellow-500/50' : 'bg-black/40 border-gray-800'}`}>
                                    <span className="font-bold text-gray-200">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="text-gray-500 hover:text-yellow-400 p-1 rounded hover:bg-gray-800 transition-colors"
                                            title="Editar"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item)}
                                            className="text-gray-500 hover:text-red-500 p-1 rounded hover:bg-gray-800 transition-colors"
                                            title="Deletar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {blocos.length === 0 && <p className="text-gray-600 text-center py-4">Nenhum bloco cadastrado.</p>}


                        </div>
                    </div>

                    {/* Lista de Camarotes */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
                        <div className="bg-gradient-to-r from-purple-900 to-gray-900 p-4 border-b border-gray-800">
                            <h3 className="font-bold text-lg text-purple-200 flex items-center gap-2">
                                <Tag size={18} /> Camarotes Cadastrados
                            </h3>
                        </div>
                        <div className="h-[300px] overflow-auto p-4 space-y-2">
                            {camarotes.map(item => (
                                <div key={item.id} className={`flex justify-between items-center p-3 rounded border transition-colors ${editingId === item.id ? 'bg-yellow-900/20 border-yellow-500/50' : 'bg-black/40 border-gray-800'}`}>
                                    <span className="font-bold text-gray-200">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="text-gray-500 hover:text-yellow-400 p-1 rounded hover:bg-gray-800 transition-colors"
                                            title="Editar"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item)}
                                            className="text-gray-500 hover:text-red-500 p-1 rounded hover:bg-gray-800 transition-colors"
                                            title="Deletar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {camarotes.length === 0 && <p className="text-gray-600 text-center py-4">Nenhum camarote cadastrado.</p>}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function AdminConfig() {
    return (
        <ErrorBoundary>
            <AdminConfigContent />
        </ErrorBoundary>
    );
}
