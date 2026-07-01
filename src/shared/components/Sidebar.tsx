import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import {
  Home, PencilRuler, Grid3x3, Package, Calculator, History,
  Wrench, Settings, Wallet, User, Receipt, CreditCard,
  LogOut, Building2, ChevronDown,
} from 'lucide-react';
import { useStore } from '../../shared/services/store';

type IconType = ComponentType<{ size?: number | string; strokeWidth?: number }>;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  route: string;
  icon: IconType;
  label: string;
  /** Coincidencia de ruta activa (por defecto igualdad exacta). */
  match?: (path: string) => boolean;
}

interface NavGroup {
  key: string;
  title: string;
  icon: IconType;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    key: 'herramientas',
    title: 'Herramientas',
    icon: Wrench,
    items: [
      { route: '/quote', icon: PencilRuler, label: 'Cotizar' },
      { route: '/calculadoras/enchapes', icon: Grid3x3, label: 'Enchapes' },
      { route: '/materiales', icon: Package, label: 'Materiales', match: (p) => p.startsWith('/materiales') },
      { route: '/estimacion', icon: Calculator, label: 'Estimación de Obra' },
      { route: '/history', icon: History, label: 'Historial' },
    ],
  },
  {
    key: 'configuracion',
    title: 'Configuración',
    icon: Settings,
    items: [
      { route: '/perfil', icon: User, label: 'Perfil' },
      { route: '/cuenta-cobro', icon: Receipt, label: 'Cuenta de Cobro' },
      { route: '/pagos', icon: CreditCard, label: 'Plan de Pagos' },
    ],
  },
];

// Ítem suelto (fuera de los grupos).
const standaloneItems: NavItem[] = [
  { route: '/tarifas', icon: Wallet, label: 'Tarifas' },
];

function itemIsActive(item: NavItem, path: string) {
  return item.match ? item.match(path) : path === item.route;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useStore();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Grupos abiertos: por defecto se abre el que contiene la ruta actual (y Herramientas).
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    for (const g of groups) {
      state[g.key] = g.items.some((it) => itemIsActive(it, location.pathname));
    }
    if (!Object.values(state).some(Boolean)) state['herramientas'] = true;
    return state;
  });

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Al abrir el sidebar, despliega el grupo de la ruta actual.
  useEffect(() => {
    if (!open) return;
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        if (g.items.some((it) => itemIsActive(it, location.pathname))) next[g.key] = true;
      }
      return next;
    });
  }, [open, location.pathname]);

  const handleNavigate = (route: string) => {
    navigate(route);
    onClose();
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <div
        key={item.route}
        className={`sidebar-item ${itemIsActive(item, location.pathname) ? 'active' : ''}`}
        onClick={() => handleNavigate(item.route)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleNavigate(item.route)}
      >
        <span style={{ width: 28, display: 'inline-flex', justifyContent: 'center' }}><Icon size={19} /></span>
        <span>{item.label}</span>
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div className={`sidebar-overlay no-print ${open ? 'open' : ''}`} onClick={onClose} />

      {/* Sidebar */}
      <aside ref={sidebarRef} className={`sidebar no-print ${open ? 'open' : ''}`}>
        {/* Logo header (→ landing) */}
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, cursor: 'pointer' }}
            onClick={() => { navigate('/'); onClose(); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          >
            <Building2 size={22} color="#b69462" />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>ELEMENT</span>
          </div>
          <p className="small" style={{ fontSize: 12, margin: 0 }}>Cotizador Profesional</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
          {/* Home (acceso directo) */}
          {renderItem({ route: '/dashboard', icon: Home, label: 'Home' })}

          {/* Grupos desplegables */}
          {groups.map((group) => {
            const isOpen = !!openGroups[group.key];
            const GroupIcon = group.icon;
            return (
              <div key={group.key} style={{ marginTop: 6 }}>
                <button
                  className="sidebar-group-toggle"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={isOpen}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 22, display: 'inline-flex', justifyContent: 'center' }}><GroupIcon size={16} /></span>
                    <span>{group.title}</span>
                  </span>
                  <ChevronDown
                    size={15}
                    style={{
                      transition: 'transform 0.25s ease',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      opacity: 0.6,
                    }}
                  />
                </button>
                {isOpen && (
                  <div style={{ paddingLeft: 8, marginTop: 2, marginBottom: 4 }}>
                    {group.items.map(renderItem)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Ítems sueltos */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8, paddingTop: 8 }}>
            {standaloneItems.map(renderItem)}
          </div>
        </nav>

        {/* Usuario + Logout */}
        <div style={{ padding: '12px 12px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>
          <div
            className={`sidebar-item ${location.pathname === '/perfil' ? 'active' : ''}`}
            onClick={() => handleNavigate('/perfil')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate('/perfil')}
          >
            <span style={{ width: 28, display: 'inline-flex', justifyContent: 'center' }}><User size={19} /></span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Mi Perfil'}</span>
          </div>
          <div
            className="sidebar-item"
            onClick={() => {
              logout();
              onClose();
              navigate('/login');
            }}
            style={{ color: '#ff3b30' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && (logout(), onClose(), navigate('/login'))}
          >
            <span style={{ width: 28, display: 'inline-flex', justifyContent: 'center' }}><LogOut size={19} /></span>
            <span>Cerrar Sesión</span>
          </div>
        </div>
      </aside>
    </>
  );
}
