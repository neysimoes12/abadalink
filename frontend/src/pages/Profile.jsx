import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { getAccessToken } from "../services/api";
import { ArrowLeft, Camera, User, LogOut } from "lucide-react";

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!getAccessToken()) {
            navigate("/login");
            return;
        }
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const resp = await api.get("/users/me");
            setUser(resp.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try {
            await api.post("/users/me/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            await loadUser(); // Reload to get new URL
        } catch (error) {
            console.error(error);
            alert("Erro ao enviar foto");
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    if (loading) return <div className="p-8 text-center">Carregando...</div>;

    const styles = {
        container: {
            minHeight: '100vh',
            background: '#FAFAFA',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            paddingBottom: '80px'
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
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '20px'
        },
        avatarContainer: {
            position: 'relative',
            width: '120px',
            height: '120px',
            marginBottom: '20px'
        },
        avatar: {
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '4px solid white',
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
        },
        uploadBtn: {
            position: 'absolute',
            bottom: '0',
            right: '0',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Meu Perfil</h1>
            </header>

            <main style={styles.main}>
                <div style={styles.avatarContainer}>
                    {user?.profile_image_url ? (
                        <img
                            src={user.profile_image_url.startsWith('http') ? user.profile_image_url : `http://localhost:8000${user.profile_image_url}`}
                            alt="Profile"
                            style={styles.avatar}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://ui-avatars.com/api/?name=" + user.name.replace(" ", "+");
                            }}
                        />
                    ) : (
                        <div style={{ ...styles.avatar, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={48} color="#9CA3AF" />
                        </div>
                    )}

                    <label style={styles.uploadBtn}>
                        {uploading ? '...' : <Camera size={18} />}
                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} disabled={uploading} />
                    </label>
                </div>

                <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 5px' }}>{user?.name}</h2>
                <p style={{ color: '#6B7280', margin: 0 }}>{user?.email}</p>

                {user?.is_verified && (
                    <span style={{
                        marginTop: '10px',
                        background: '#DEF7EC',
                        color: '#03543F',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}>
                        ✓ Identidade Verificada
                    </span>
                )}

                <div style={{ width: '100%', marginTop: '40px' }}>
                    <button onClick={() => navigate('/my-listings')} style={{
                        width: '100%',
                        padding: '15px',
                        background: '#F3F4F6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        marginBottom: '12px'
                    }}>
                        📋 Meus Anúncios
                    </button>
                    <button onClick={handleLogout} style={{
                        width: '100%',
                        padding: '15px',
                        background: '#FEE2E2',
                        color: '#991B1B',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        cursor: 'pointer'
                    }}>
                        <LogOut size={20} />
                        Sair da Conta
                    </button>
                </div>
            </main>
        </div>
    );
}
