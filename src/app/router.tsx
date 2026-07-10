import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from '../features/landing/LandingPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { QuotePage } from '../features/quote/QuotePage';
import { HistoryPage } from '../features/history/HistoryPage';
import { InvoicePage } from '../features/invoice/InvoicePage';
import { TarifasPage } from '../features/settings/TarifasPage';
import { PagosPage } from '../features/settings/PagosPage';
import { CuentaCobroPage } from '../features/settings/CuentaCobroPage';
import { EstimacionModule } from '../features/settings/EstimacionModule';
import { PerfilPage } from '../features/settings/PerfilPage';
import { MaterialesPage } from '../features/materials/MaterialesPage';
import { CategoriaPage } from '../features/materials/CategoriaPage';
import { ProductoPage } from '../features/materials/ProductoPage';
import { PedidosPage } from '../features/materials/PedidosPage';
import { QuoteInvoicesPage } from '../features/invoice/QuoteInvoicesPage';
import { EnchapesPage } from '../features/enchapes/EnchapesPage';
import { PlanosPage } from '../features/planos/PlanosPage';
import { PlanoEditorPage } from '../features/planos/PlanoEditorPage';
import { BarrederasPage } from '../features/barrederas/BarrederasPage';
// import { EstimationCalculatorPage } from '../features/calculator/EstimationCalculatorPage';
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
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
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
    element: <ProtectedRoute><Layout><EstimacionModule /></Layout></ProtectedRoute>,
  },
  {
    path: '/calculadoras/enchapes',
    element: <ProtectedRoute><Layout><EnchapesPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/calculadoras/barrederas',
    element: <ProtectedRoute><Layout><BarrederasPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/calculadoras/barrederas/:planId',
    element: <ProtectedRoute><Layout><BarrederasPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/planos',
    element: <ProtectedRoute><Layout><PlanosPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/planos/nuevo',
    element: <ProtectedRoute><Layout><PlanoEditorPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/planos/:id',
    element: <ProtectedRoute><Layout><PlanoEditorPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/perfil',
    element: <ProtectedRoute><Layout><PerfilPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/materiales',
    element: <ProtectedRoute><Layout><MaterialesPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/materiales/:categoryId',
    element: <ProtectedRoute><Layout><CategoriaPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/materiales/productos/:productId',
    element: <ProtectedRoute><Layout><ProductoPage /></Layout></ProtectedRoute>,
  },
  {
    path: '/materiales/pedidos',
    element: <ProtectedRoute><Layout><PedidosPage /></Layout></ProtectedRoute>,
  },
  // Redirect old /settings to /tarifas
  {
    path: '/settings',
    element: <Navigate to="/tarifas" replace />,
  },
]);
