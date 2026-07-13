import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from '../shared/components/TopNav';
import { Sidebar } from '../shared/components/Sidebar';
import { Toaster } from 'sileo';
import { useStore } from '../shared/services/store';
import { showNotification } from '../shared/hooks/useNotifications';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const loadFromBackend = useStore((s) => s.loadFromBackend);
  const hasLoadedInitialData = useStore((s) => s.hasLoadedInitialData);

  // Sesión expirada (token vencido o 401 del backend) → sacar al usuario.
  useEffect(() => {
    const onExpired = () => {
      const st = useStore.getState();
      if (!st.isAuthenticated) return; // ya salió
      st.logout();
      showNotification('Sesión expirada', 'warning', 'Vuelve a iniciar sesión.');
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [navigate]);

  // Carga quotes/config desde el SaaS una sola vez por sesión (no en cada navegación:
  // Layout se remonta en cada cambio de ruta protegida, así que sin el guard de
  // hasLoadedInitialData se repetía la petición cada vez que el usuario navegaba).
  useEffect(() => {
    if (isAuthenticated && !hasLoadedInitialData) {
      // Small delay to ensure auth state + localStorage are fully propagated
      const timer = setTimeout(() => {
        const stored = localStorage.getItem('element_user:v1');
        if (stored) {
          loadFromBackend();
        } else {
          useStore.setState({ hasLoadedInitialData: true });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, hasLoadedInitialData, loadFromBackend]);

  // Mientras no haya terminado la primera carga, evitamos mostrar la página con
  // datos vacíos/demo — eso es lo que se sentía como "hay que navegar para que cargue".
  const showContent = !isAuthenticated || hasLoadedInitialData;

  return (
    <>
      <Toaster position="top-center" theme="dark" />
      <TopNav onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="wrap">
        {showContent ? children : (
          <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
            <div className="app-spinner" />
          </div>
        )}
      </div>
    </>
  );
}
