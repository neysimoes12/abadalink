import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Heart, MessageCircle, User, PlusCircle } from 'lucide-react';

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Only show on main tabs
    // Only show on main tabs
    const showNav = ['/market', '/market/', '/matches', '/matches/', '/conversations', '/conversations/', '/profile', '/profile/', '/'].includes(location.pathname);

    if (!showNav) return null;

    const navItems = [
        { path: '/market', icon: <ShoppingBag size={24} />, label: 'Market' },
        { path: '/matches', icon: <Heart size={24} />, label: 'Matches' },
        { path: '/sell', icon: <PlusCircle size={40} color="#E11D48" fill="white" />, label: 'Vender', isFloating: true },
        { path: '/conversations', icon: <MessageCircle size={24} />, label: 'Chat' },
        { path: '/profile', icon: <User size={24} />, label: 'Perfil' },
    ];

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            width: 'calc(100% - 32px)',
            maxWidth: '400px',
        }}>
            <nav style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)',
                borderRadius: '24px',
                padding: '12px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid rgba(255,255,255,0.5)'
            }}>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/market');

                    if (item.isFloating) {
                        return (
                            <div
                                key={item.label}
                                style={{
                                    marginTop: '-40px',
                                    cursor: 'pointer',
                                    filter: 'drop-shadow(0 4px 10px rgba(225, 29, 72, 0.3))'
                                }}
                                onClick={() => navigate(item.path)}
                            >
                                <div style={{
                                    background: 'var(--primary)',
                                    borderRadius: '50%',
                                    width: '56px',
                                    height: '56px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '4px solid #F8FAFC'
                                }}>
                                    <PlusCircle size={28} color="white" />
                                </div>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                padding: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isActive ? 'scale(1.1)' : 'scale(1)'
                            }}
                        >
                            {item.icon}
                            {/* <span style={{ fontSize: '0.65rem', fontWeight: isActive ? '600' : '400' }}>{item.label}</span> */}
                            {isActive && (
                                <div style={{
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    marginTop: '2px'
                                }} />
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default BottomNav;
