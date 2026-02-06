import { useState, useEffect, Component } from "react";
import { useNavigate } from "react-router-dom";
import api, { getAccessToken } from "../services/api";
import { ArrowLeft, Check, ChevronDown, Repeat, ShoppingBag, ShoppingCart, DollarSign, Ticket } from "lucide-react";

// Error Boundary to prevent white screen
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Sell Page Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                    <h2>Algo deu errado.</h2>
                    <p style={{ color: 'red' }}>{this.state.error && this.state.error.toString()}</p>
                    <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}>
                        Tentar Novamente
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function SellContent() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [mode, setMode] = useState("EXCHANGE");

    const [types] = useState(["BLOCO", "CAMAROTE"]);
    const [circuits] = useState(["BARRA ONDINA", "CAMPO GRANDE"]);
    const [days] = useState(["Quinta", "Sexta", "Sábado", "Domingo", "Segunda", "Terça"]);
    const [genders] = useState(["Masculino", "Feminino", "Unissex"]);

    const [interestOptions, setInterestOptions] = useState([]);

    const [formData, setFormData] = useState({
        type: "BLOCO",
        event_name: "",
        circuit: "BARRA ONDINA",
        event_date: "Sexta",
        gender: "Unissex",
        product_value: "",
        interest_event_name: []
    });

    const [availableOptions, setAvailableOptions] = useState([]);

    useEffect(() => {
        // Fetch Admin Options
        api.get("/admin/options").then(resp => {
            const data = resp.data;
            setAvailableOptions(data);

            // Build interest options dynamically
            const blocos = data.filter(i => i.category === 'BLOCO').map(i => i.name);
            const camarotes = data.filter(i => i.category === 'CAMAROTE').map(i => i.name);

            setInterestOptions([
                { category: "Blocos", items: blocos },
                { category: "Camarotes", items: camarotes }
            ]);
        }).catch(err => console.error("Failed to load options", err));
    }, []);

    const handleInterestToggle = (item) => {
        setFormData(prev => {
            const current = prev.interest_event_name || [];
            if (current.includes(item)) {
                return { ...prev, interest_event_name: current.filter(i => i !== item) };
            } else {
                return { ...prev, interest_event_name: [...current, item] };
            }
        });
    };

    const handleSubmit = async () => {
        if (!getAccessToken()) {
            navigate('/login', { state: { returnTo: '/sell' } });
            return;
        }
        setLoading(true);
        try {
            if (mode !== 'BUY' && !formData.event_name) {
                alert("Selecione o nome do evento.");
                setLoading(false);
                return;
            }

            const payload = {
                ...formData,
                interest_event_name: (formData.interest_event_name || []).join(", "),
                product_value: parseFloat(formData.product_value) || 0,
                type: mode === 'BUY' ? 'PROCURA' : formData.type,
                status: "AVAILABLE",
                ...(mode === 'BUY' ? { event_name: "Procura-se", circuit: "N/A", event_date: "N/A", gender: "N/A" } : {})
            };

            await api.post("/market/list-abada", payload);
            setSuccess(true);
            setTimeout(() => navigate('/market'), 2000);
        } catch (error) {
            console.error(error);
            alert("Erro ao criar anúncio.");
        } finally {
            setLoading(false);
        }
    };

    const getThemeColor = () => {
        if (mode === 'EXCHANGE') return '#F59E0B'; // Gold
        if (mode === 'SALE') return '#10B981'; // Emerald
        if (mode === 'BUY') return '#3B82F6'; // Blue
        return '#333';
    };

    const getGradient = () => {
        if (mode === 'EXCHANGE') return 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)';
        if (mode === 'SALE') return 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
        if (mode === 'BUY') return 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)';
        return '#333';
    };

    // Inline Styles with Mobile Optimization
    const styles = {
        container: {
            minHeight: '100vh',
            background: '#FAFAFA',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            flexDirection: 'column',
        },
        // Max-width wrapper to simulate mobile app on desktop
        mobileWrapper: {
            width: '100%',
            maxWidth: '480px',
            margin: '0 auto',
            background: '#FAFAFA',
            minHeight: '100vh',
            boxShadow: '0 0 50px rgba(0,0,0,0.05)', // Subtle shadow on desktop
            paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
            position: 'relative'
        },
        header: {
            padding: 'calc(30px + env(safe-area-inset-top)) 20px 40px',
            background: getGradient(),
            color: 'white',
            borderRadius: '0 0 30px 30px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        },
        main: {
            padding: '0 20px',
            marginTop: '-30px',
        },
        card: {
            background: 'white',
            padding: '24px',
            borderRadius: '24px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.02)'
        },
        input: { width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', fontSize: '16px', background: '#F9FAFB', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' },
        select: { width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', fontSize: '16px', background: '#F9FAFB', marginBottom: '12px', appearance: 'none' },
        btn: { width: '100%', padding: '20px', borderRadius: '20px', border: 'none', background: getGradient(), color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.15)' }
    };

    return (
        <div style={styles.container}>
            <div style={styles.mobileWrapper}>
                <header style={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', color: 'white', marginRight: '15px', backdropFilter: 'blur(5px)' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <span style={{ fontWeight: '600', letterSpacing: '0.5px' }}>NOVO ANÚNCIO</span>
                    </div>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', textAlign: 'center', letterSpacing: '-0.5px' }}>
                        {mode === 'EXCHANGE' ? 'Trocar Abadá' : mode === 'SALE' ? 'Vender Abadá' : 'Comprar Abadá'}
                    </h1>
                </header>

                <main style={styles.main}>

                    {/* Mode Switcher */}
                    <div style={{ display: 'flex', background: 'white', padding: '6px', borderRadius: '18px', marginBottom: '24px', boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}>
                        {[
                            { id: 'EXCHANGE', icon: Repeat, label: 'Troca' },
                            { id: 'SALE', icon: ShoppingBag, label: 'Venda' },
                            { id: 'BUY', icon: ShoppingCart, label: 'Compra' }
                        ].map(m => (
                            <button key={m.id} onClick={() => setMode(m.id)}
                                style={{
                                    flex: 1, border: 'none', background: 'transparent', padding: '12px', cursor: 'pointer', borderRadius: '14px',
                                    color: mode === m.id ? 'black' : '#9CA3AF',
                                    background: mode === m.id ? '#F3F4F6' : 'transparent',
                                    fontWeight: mode === m.id ? 'bold' : 'normal',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '12px',
                                    transition: 'all 0.2s ease'
                                }}>
                                <m.icon size={20} />
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {mode !== 'BUY' && (
                        <div style={styles.card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #F3F4F6' }}>
                                <div style={{ background: `${getThemeColor()}20`, padding: '8px', borderRadius: '10px' }}>
                                    <Ticket size={20} color={getThemeColor()} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>O que você tem</h3>
                            </div>

                            <div style={{ display: 'flex', background: '#F3F4F6', padding: '4px', borderRadius: '14px', marginBottom: '15px' }}>
                                {types.map(t => (
                                    <button key={t} onClick={() => setFormData({ ...formData, type: t })}
                                        style={{ flex: 1, border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', background: formData.type === t ? 'white' : 'transparent', fontWeight: 'bold', fontSize: '13px', boxShadow: formData.type === t ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
                                        {t}
                                    </button>
                                ))}
                            </div>

                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Evento</label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    style={styles.select}
                                    value={formData.event_name}
                                    onChange={e => setFormData({ ...formData, event_name: e.target.value })}
                                >
                                    <option value="">Selecione...</option>
                                    {availableOptions
                                        .filter(opt => opt.category === formData.type)
                                        .map(opt => (
                                            <option key={opt.id} value={opt.name}>{opt.name}</option>
                                        ))
                                    }
                                </select>
                                <ChevronDown size={16} color="#9CA3AF" style={{ position: 'absolute', right: 12, top: 18, pointerEvents: 'none' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Dia</label>
                                    <div style={{ position: 'relative' }}>
                                        <select style={styles.select} value={formData.event_date} onChange={e => setFormData({ ...formData, event_date: e.target.value })}>
                                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <ChevronDown size={16} color="#9CA3AF" style={{ position: 'absolute', right: 12, top: 18, pointerEvents: 'none' }} />
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Circuito</label>
                                    <div style={{ position: 'relative' }}>
                                        <select style={styles.select} value={formData.circuit} onChange={e => setFormData({ ...formData, circuit: e.target.value })}>
                                            {circuits.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown size={16} color="#9CA3AF" style={{ position: 'absolute', right: 12, top: 18, pointerEvents: 'none' }} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '5px' }}>
                                {genders.map(g => (
                                    <button key={g} onClick={() => setFormData({ ...formData, gender: g })}
                                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: formData.gender === g ? '2px solid #333' : '1px solid #F3F4F6', background: formData.gender === g ? '#333' : 'white', color: formData.gender === g ? 'white' : '#6B7280', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {(mode === 'EXCHANGE' || mode === 'BUY') && (
                        <div style={styles.card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #F3F4F6' }}>
                                <div style={{ background: `${getThemeColor()}20`, padding: '8px', borderRadius: '10px' }}>
                                    <ShoppingCart size={20} color={getThemeColor()} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>{mode === 'EXCHANGE' ? 'Interesse de Troca' : 'O que Procura?'}</h3>
                            </div>

                            {interestOptions.map((cat, idx) => (
                                <div key={idx} style={{ marginBottom: '15px' }}>
                                    <p style={{ fontSize: '11px', fontWeight: '800', color: '#9CA3AF', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat.category}</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {cat.items.map(item => {
                                            const active = formData.interest_event_name.includes(item);
                                            return (
                                                <button key={item} onClick={() => handleInterestToggle(item)}
                                                    style={{ padding: '10px 16px', borderRadius: '24px', border: active ? `1px solid ${getThemeColor()}` : '1px solid #E5E7EB', background: active ? getThemeColor() : 'white', color: active ? 'white' : '#4B5563', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', transform: active ? 'scale(1.05)' : 'scale(1)' }}>
                                                    {item}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={styles.card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ background: `${getThemeColor()}20`, padding: '8px', borderRadius: '10px' }}>
                                <DollarSign size={20} color={getThemeColor()} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>Valores</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>{mode === 'SALE' ? 'Preço de venda' : 'Diferença em dinheiro'}</p>
                            </div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '20px', top: '22px', fontSize: '20px', fontWeight: 'bold', color: '#9CA3AF' }}>R$</span>
                            <input type="number" placeholder="0,00" style={{ ...styles.input, paddingLeft: '55px', fontSize: '24px', fontWeight: 'bold', marginBottom: 0 }}
                                value={formData.product_value} onChange={e => setFormData({ ...formData, product_value: e.target.value })} />
                        </div>
                    </div>

                    <button onClick={handleSubmit} style={styles.btn} disabled={loading}>
                        {loading ? 'Calculando...' : 'FINALIZAR'}
                    </button>

                </main>
            </div>

            {success && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', padding: '40px', borderRadius: '30px', textAlign: 'center', width: '80%', maxWidth: '320px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: 70, height: 70, background: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Check size={36} color="white" strokeWidth={3} />
                        </div>
                        <h3 style={{ fontSize: '22px', fontWeight: 'bold' }}>Tudo Pronto!</h3>
                        <p style={{ color: '#6B7280' }}>Seu anúncio foi publicado.</p>
                    </div>
                </div>
            )}

        </div>
    );
}

export default function Sell() {
    return (
        <ErrorBoundary>
            <SellContent />
        </ErrorBoundary>
    );
}
