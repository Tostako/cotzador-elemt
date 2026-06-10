import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { TopNav } from '../shared/components/TopNav';
import { Sidebar } from '../shared/components/Sidebar';
import { NotificationContainer } from '../shared/hooks/useNotifications';
import { useStore } from '../shared/services/store';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const loadFromBackend = useStore((s) => s.loadFromBackend);

  // Load quotes and config from SaaS on mount if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      // Small delay to ensure auth state + localStorage are fully propagated
      const timer = setTimeout(() => {
        const stored = localStorage.getItem('element_user');
        if (stored) {
          loadFromBackend();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loadFromBackend]);

  return (
    <>
      <NotificationContainer />
      <TopNav onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="wrap">
        {children}
      </div>
    </>
  );
}
