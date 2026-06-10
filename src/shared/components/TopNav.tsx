import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../shared/services/store';
import logoAbbreviated from '../../assets/LOGO ABREVIADO/ELEMENThaus - Logo Abreviado White.png';

interface TopNavProps {
  onMenuClick?: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // No mostrar en landing, login, register
  const hideNavPaths = ['/', '/login', '/register'];
  if (hideNavPaths.includes(location.pathname)) return null;

  return (
    <header
      className="no-print"
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        background: 'rgba(10, 10, 10, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo + Home */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <img
            src={logoAbbreviated}
            alt="ELEMENThaus"
            style={{
              width: 40,
              height: 'auto',
              opacity: 0.9,
            }}
          />
          <div
            style={{
              width: 1,
              height: 24,
              background: 'rgba(255,255,255,0.15)',
            }}
          />
          <span
            style={{
              fontSize: 14,
              color: '#b69462',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🏠</span>
            <span className="hide-mobile">Inicio</span>
          </span>
        </div>

        {/* Center: Page Title */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 14,
            color: '#999',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
          className="hide-mobile"
        >
          {location.pathname === '/dashboard' && 'Dashboard'}
          {location.pathname === '/quote' && 'Nueva Cotización'}
          {location.pathname === '/history' && 'Historial'}
          {location.pathname.startsWith('/invoice') && 'Cuenta de Cobro'}
          {location.pathname === '/tarifas' && 'Tarifas'}
          {location.pathname === '/pagos' && 'Plan de Pagos'}
          {location.pathname === '/cuenta-cobro' && 'Cuenta de Cobro'}
          {location.pathname === '/estimacion' && 'Estimación de Obra'}
        </div>

        {/* Right: Hamburger + User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="hamburger"
            onClick={onMenuClick}
            aria-label="Abrir menú"
            style={{ color: '#fff' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <span className="hamburger-line" />
              <span className="hamburger-line" style={{ width: 14 }} />
              <span className="hamburger-line" />
            </div>
          </button>
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                background: 'rgba(182, 148, 98, 0.1)',
                borderRadius: 12,
                border: '1px solid rgba(182, 148, 98, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: 18 }}>👤</span>
              <span style={{ fontSize: 14, fontWeight: 600 }} className="hide-mobile">{user?.name || 'Usuario'}</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
            </div>
            {showUserMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-line)',
                  borderRadius: 16,
                  padding: 8,
                  minWidth: 180,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  zIndex: 100,
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-line)' }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{user?.name}</p>
                  <p className="small" style={{ fontSize: 12 }}>{user?.email}</p>
                </div>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                    navigate('/login');
                  }}
                  style={{
                    width: '100%',
                    marginTop: 8,
                    justifyContent: 'flex-start',
                    padding: '8px 12px',
                  }}
                >
                  🚪 Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </header>
  );
}
