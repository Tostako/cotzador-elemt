import { useNavigate, useLocation } from 'react-router-dom';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const isActive = (route: string) => {
    if (route === '/dashboard' && path === '/') return false;
    return path === route;
  };

  const tabs = [
    { route: '/dashboard', icon: '🏠', label: 'Inicio' },
    { route: '/quote', icon: '📐', label: 'Cotizar' },
    { route: '/history', icon: '📂', label: 'Historial' },
    { route: '/settings', icon: '⚙️', label: 'Ajustes' },
  ];

  if (path === '/') return null;

  return (
    <nav className="tab">
      {tabs.map((tab) => (
        <div
          key={tab.route}
          className={`tab-item ${isActive(tab.route) ? 'active' : ''}`}
          onClick={() => navigate(tab.route)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </div>
      ))}
    </nav>
  );
}
