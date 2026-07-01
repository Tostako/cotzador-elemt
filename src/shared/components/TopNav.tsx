import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Menu, User, ChevronDown, LogOut } from 'lucide-react';
import { useStore } from '../../shared/services/store';
import logoPrincipal from '../../assets/LogoPrincipal.png';

interface TopNavProps {
  onMenuClick?: () => void;
}

/** Enlaces rápidos de funciones en el navbar. */
const navLinks: { to: string; label: string; match: (p: string) => boolean }[] = [
  { to: '/dashboard', label: 'Home', match: (p) => p === '/dashboard' },
  { to: '/quote', label: 'Cotizar', match: (p) => p === '/quote' },
  { to: '/tarifas', label: 'Tarifas', match: (p) => p === '/tarifas' },
  { to: '/calculadoras/enchapes', label: 'Enchapes', match: (p) => p.startsWith('/calculadoras/enchapes') },
  { to: '/materiales', label: 'Materiales', match: (p) => p.startsWith('/materiales') },
];

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
        padding: '14px 24px',
      }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Left: Logo (→ landing) */}
        <img
          src={logoPrincipal}
          alt="ELEMENThaus"
          title="Ir a la página de inicio"
          onClick={() => navigate('/')}
          style={{ height: 40, width: 'auto', opacity: 0.95, cursor: 'pointer', flexShrink: 0 }}
        />

        {/* Center: function links */}
        <nav
          className="hide-mobile"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {navLinks.map((link) => {
            const active = link.match(location.pathname);
            return (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className="topnav-link"
                data-active={active ? 'true' : 'false'}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Hamburger + User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="hamburger"
            onClick={onMenuClick}
            aria-label="Abrir menú"
            title="Todas las funciones"
            style={{ color: '#fff' }}
          >
            <Menu size={20} />
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
              <User size={18} />
              <span style={{ fontSize: 14, fontWeight: 600 }} className="hide-mobile">{user?.name || 'Usuario'}</span>
              <ChevronDown size={14} style={{ opacity: 0.6 }} />
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
                  minWidth: 200,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  zIndex: 100,
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-line)' }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{user?.name}</p>
                  <p className="small" style={{ fontSize: 12 }}>{user?.email}</p>
                </div>
                <button
                  className="sidebar-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/perfil');
                  }}
                  style={{ width: '100%', marginTop: 8, justifyContent: 'flex-start', padding: '10px 12px', gap: 10 }}
                >
                  <User size={17} />
                  <span>Mi Perfil</span>
                </button>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                    navigate('/login');
                  }}
                  style={{
                    width: '100%',
                    marginTop: 4,
                    justifyContent: 'flex-start',
                    padding: '8px 12px',
                    gap: 8,
                  }}
                >
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .topnav-link {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          padding: 7px 14px;
          border-radius: 10px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .topnav-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.06);
        }
        .topnav-link[data-active="true"] {
          color: #b69462;
          background: rgba(182,148,98,0.12);
        }
        @media (max-width: 860px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </header>
  );
}
