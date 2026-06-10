import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from '../features/landing/LandingPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { QuotePage } from '../features/quote/QuotePage';
import { HistoryPage } from '../features/history/HistoryPage';
import { InvoicePage } from '../features/invoice/InvoicePage';
import { TarifasPage } from '../features/settings/TarifasPage';
import { PagosPage } from '../features/settings/PagosPage';
import { CuentaCobroPage } from '../features/settings/CuentaCobroPage';
import { EstimacionPage } from '../features/settings/EstimacionPage';
import { QuoteInvoicesPage } from '../features/invoice/QuoteInvoicesPage';
import { EstimationCalculatorPage } from '../features/calculator/EstimationCalculatorPage';
import { Layout } from './Layout';
import { useStore } from '../shared/services/store';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/quote',
    element: <ProtectedRoute><Layout><QuotePage /></Layout></ProtectedRoute>,
  },
  {
    path: '/history',
    element: <ProtectedRoute><Layout><HistoryPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/invoice/:quoteId',
    element: <ProtectedRoute><Layout><InvoicePage /></Layout></ProtectedRoute>,
  },
  {
    path: '/quotes/:quoteId/invoices',
    element: <ProtectedRoute><Layout><QuoteInvoicesPage /></Layout></ProtectedRoute>,
  },
  // Config items now have their own routes
  {
    path: '/tarifas',
    element: <ProtectedRoute><Layout><TarifasPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/pagos',
    element: <ProtectedRoute><Layout><PagosPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/cuenta-cobro',
    element: <ProtectedRoute><Layout><CuentaCobroPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/estimacion',
    element: <ProtectedRoute><Layout><EstimacionPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/calculadoras/estimaciones',
    element: <ProtectedRoute><Layout><EstimationCalculatorPage /></Layout></ProtectedRoute>,
  },
  // Redirect old /settings to /tarifas
  {
    path: '/settings',
    element: <Navigate to="/tarifas" replace />,
  },
]);
