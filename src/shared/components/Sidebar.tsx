import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import {
  Home, PencilRuler, Grid3x3, Package, Calculator,
  Settings, Wallet, User, Receipt, CreditCard,
  LogOut, Building2, ChevronDown, DraftingCompass, Frame, FileText, LayoutGrid, ScrollText,
} from 'lucide-react';
import { useStore } from '../../shared/services/store';

type IconType = ComponentType<{ size?: number | string; strokeWidth?: number }>;

interface NavItem {
  route: string;
  icon: IconType;
  label: string;
}

interface SidebarItemProps {
  item: NavItem;
  pathname: string;
  onNavigate: (route: string) => void;
}

function itemIsActive(item: NavItem, pathname: string) {
  if (item.route === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  return pathname.startsWith(item.route);
}

function SidebarItem({ item, pathname, onNavigate }: SidebarItemProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={`sidebar-item ${itemIsActive(item, pathname) ? 'active' : ''}`}
      onClick={() => onNavigate(item.route)}
    >
      <span style={{ width: 28, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}><Icon size={19} /></span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
    </button>
  );
}

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
    key: 'calculadoras',
    title: 'Calculadoras',
    icon: LayoutGrid,
    items: [
      { route: '/planos', icon: DraftingCompass, label: 'Planos', match: (p) => p.startsWith('/planos') },
      { route: '/calculadoras/enchapes', icon: Grid3x3, label: 'Enchapes', match: (p) => p.startsWith('/calculadoras/enchapes') },
      { route: '/calculadoras/barrederas', icon: Frame, label: 'Barrederas', match: (p) => p.startsWith('/calculadoras/barrederas') },
      { route: '/materiales', icon: Package, label: 'Materiales', match: (p) => p.startsWith('/materiales') },
    ],
  },
  {
    key: 'cotizador',
    title: 'Cotizador',
    icon: FileText,
    items: [
      { route: '/quote', icon: PencilRuler, label: 'Cotizar' },
      { route: '/estimacion', icon: Calculator, label: 'Estimaciones de Obra' },
      { route: '/tarifas', icon: Wallet, label: 'Tarifas' },
      { route: '/history', icon: ScrollText, label: 'Cotizaciones' },
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

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Grupos abiertos: por defecto se abre el que contiene la ruta actual (y Herramientas).
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    for (const g of groups) {
      state[g.key] = g.items.some((it) => itemIsActive(it, location.pathname));
    }
    if (!Object.values(state).some(Boolean)) state['calculadoras'] = true;
    return state;
  });

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onCloseRef.current();
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
  }, [open]);

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

  return (
    <>
      {/* Overlay */}
      <div
        className={`sidebar-overlay no-print ${open ? 'open' : ''}`}
        aria-label="Cerrar menú"
      />

      {/* Sidebar */}
      <aside ref={sidebarRef} className={`sidebar no-print ${open ? 'open' : ''}`}>
        {/* Logo header (→ landing) */}
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
          <button
            type="button"
            style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, cursor: 'pointer', border: 'none', background: 'transparent', padding: 0, font: 'inherit', color: 'inherit' }}
            onClick={() => { navigate('/'); onClose(); }}
          >
            <Building2 size={22} color="#b69462" />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>ELEMENT</span>
          </button>
          <p className="small" style={{ fontSize: 12, margin: 0 }}>Cotizador Profesional</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
          {/* Home (acceso directo) */}
          <SidebarItem item={{ route: '/dashboard', icon: Home, label: 'Home' }} pathname={location.pathname} onNavigate={handleNavigate} />

          {/* Grupos desplegables */}
          {groups.map((group) => {
            const isOpen = !!openGroups[group.key];
            const GroupIcon = group.icon;
            return (
              <div key={group.key} style={{ marginTop: 6 }}>
                <button type="button"
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
                    {group.items.map((it) => (
                      <SidebarItem key={it.route} item={it} pathname={location.pathname} onNavigate={handleNavigate} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Usuario + Logout */}
        <div style={{ padding: '12px 12px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>
          <button
            type="button"
            className={`sidebar-item ${location.pathname === '/perfil' ? 'active' : ''}`}
            onClick={() => handleNavigate('/perfil')}
          >
            <span style={{ width: 28, display: 'inline-flex', justifyContent: 'center' }}><User size={19} /></span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Mi Perfil'}</span>
          </button>
          <button
            type="button"
            className="sidebar-item"
            onClick={() => {
              logout();
              onClose();
              navigate('/login');
            }}
            style={{ color: '#ff3b30' }}
          >
            <span style={{ width: 28, display: 'inline-flex', justifyContent: 'center' }}><LogOut size={19} /></span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
