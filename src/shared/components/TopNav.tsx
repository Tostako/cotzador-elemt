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
  { to: '/history', label: 'Cotizaciones', match: (p) => p.startsWith('/history') },
  { to: '/planos', label: 'Planos', match: (p) => p.startsWith('/planos') },
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
      className="no-print top-nav-bar"
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
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Ir a la página de inicio"
          style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}
        >
          <img
            src={logoPrincipal}
            alt=""
            style={{ height: 40, width: 'auto', opacity: 0.95, display: 'block' }}
          />
        </button>

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
              <button type="button"
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
          <button type="button"
            className="hamburger"
            onClick={onMenuClick}
            aria-label="Abrir menú"
            title="Todas las funciones"
            style={{ color: '#fff' }}
          >
            <Menu size={20} />
          </button>
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
              className="user-menu-trigger"
            >
              <User size={18} />
              <span style={{ fontSize: 14, fontWeight: 600 }} className="hide-mobile">{user?.name || 'Usuario'}</span>
              <ChevronDown size={14} style={{ opacity: 0.6 }} />
            </button>
            {showUserMenu && (
              <div className="dropdown-panel">
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-line)' }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{user?.name}</p>
                  <p className="small" style={{ fontSize: 12 }}>{user?.email}</p>
                </div>
                <button type="button"
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
                <button type="button"
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
