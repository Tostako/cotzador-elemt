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

  // Load quotes and config from SaaS on mount if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      // Small delay to ensure auth state + localStorage are fully propagated
      const timer = setTimeout(() => {
        const stored = localStorage.getItem('element_user:v1');
        if (stored) {
          loadFromBackend();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loadFromBackend]);

  return (
    <>
      <Toaster position="top-center" theme="dark" />
      <TopNav onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="wrap">
        {children}
      </div>
    </>
  );
}
