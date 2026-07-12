import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Layout } from './Layout';
import { useStore } from '../shared/services/store';
import { isCurrentTokenExpired, handleAuthExpired } from '../shared/services/api';

// Carga diferida por ruta: el bundle inicial se reduce y las dependencias pesadas
// (p. ej. Konva en Planos/Barrederas) solo se descargan al entrar a esas rutas.
const LandingPage = lazy(() => import('../features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('../features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const QuotePage = lazy(() => import('../features/quote/QuotePage').then((m) => ({ default: m.QuotePage })));
const HistoryPage = lazy(() => import('../features/history/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const InvoicePage = lazy(() => import('../features/invoice/InvoicePage').then((m) => ({ default: m.InvoicePage })));
const TarifasPage = lazy(() => import('../features/settings/TarifasPage').then((m) => ({ default: m.TarifasPage })));
const PagosPage = lazy(() => import('../features/settings/PagosPage').then((m) => ({ default: m.PagosPage })));
const CuentaCobroPage = lazy(() => import('../features/settings/CuentaCobroPage').then((m) => ({ default: m.CuentaCobroPage })));
const EstimacionModule = lazy(() => import('../features/settings/EstimacionModule').then((m) => ({ default: m.EstimacionModule })));
const PerfilPage = lazy(() => import('../features/settings/PerfilPage').then((m) => ({ default: m.PerfilPage })));
const MaterialesPage = lazy(() => import('../features/materials/MaterialesPage').then((m) => ({ default: m.MaterialesPage })));
const CategoriaPage = lazy(() => import('../features/materials/CategoriaPage').then((m) => ({ default: m.CategoriaPage })));
const ProductoPage = lazy(() => import('../features/materials/ProductoPage').then((m) => ({ default: m.ProductoPage })));
const PedidosPage = lazy(() => import('../features/materials/PedidosPage').then((m) => ({ default: m.PedidosPage })));
const QuoteInvoicesPage = lazy(() => import('../features/invoice/QuoteInvoicesPage').then((m) => ({ default: m.QuoteInvoicesPage })));
const EnchapesPage = lazy(() => import('../features/enchapes/EnchapesPage').then((m) => ({ default: m.EnchapesPage })));
const PlanosPage = lazy(() => import('../features/planos/PlanosPage').then((m) => ({ default: m.PlanosPage })));
const PlanoEditorPage = lazy(() => import('../features/planos/PlanoEditorPage').then((m) => ({ default: m.PlanoEditorPage })));
const BarrederasPage = lazy(() => import('../features/barrederas/BarrederasPage').then((m) => ({ default: m.BarrederasPage })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const logout = useStore((s) => s.logout);
  const expired = isCurrentTokenExpired();
  useEffect(() => {
    if (expired) {
      handleAuthExpired();
      logout();
    }
  }, [expired, logout]);
  if (!isAuthenticated || expired) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const Fallback = (
  <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
    <div className="app-spinner" />
  </div>
);
const lz = (node: ReactNode) => <Suspense fallback={Fallback}>{node}</Suspense>;
const prot = (node: ReactNode) => (
  <ProtectedRoute>
    <Layout>{lz(node)}</Layout>
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  { path: '/', element: lz(<LandingPage />) },
  { path: '/login', element: lz(<LoginPage />) },
  { path: '/register', element: lz(<RegisterPage />) },
  { path: '/forgot-password', element: lz(<ForgotPasswordPage />) },
  { path: '/dashboard', element: prot(<DashboardPage />) },
  { path: '/quote', element: prot(<QuotePage />) },
  { path: '/history', element: prot(<HistoryPage />) },
  { path: '/invoice/:quoteId', element: prot(<InvoicePage />) },
  { path: '/quotes/:quoteId/invoices', element: prot(<QuoteInvoicesPage />) },
  { path: '/tarifas', element: prot(<TarifasPage />) },
  { path: '/pagos', element: prot(<PagosPage />) },
  { path: '/cuenta-cobro', element: prot(<CuentaCobroPage />) },
  { path: '/estimacion', element: prot(<EstimacionModule />) },
  { path: '/calculadoras/enchapes', element: prot(<EnchapesPage />) },
  { path: '/calculadoras/barrederas', element: prot(<BarrederasPage />) },
  { path: '/calculadoras/barrederas/:planId', element: prot(<BarrederasPage />) },
  { path: '/planos', element: prot(<PlanosPage />) },
  { path: '/planos/nuevo', element: prot(<PlanoEditorPage />) },
  { path: '/planos/:id', element: prot(<PlanoEditorPage />) },
  { path: '/perfil', element: prot(<PerfilPage />) },
  { path: '/materiales', element: prot(<MaterialesPage />) },
  { path: '/materiales/:categoryId', element: prot(<CategoriaPage />) },
  { path: '/materiales/productos/:productId', element: prot(<ProductoPage />) },
  { path: '/materiales/pedidos', element: prot(<PedidosPage />) },
  { path: '/settings', element: <Navigate to="/tarifas" replace /> },
]);
