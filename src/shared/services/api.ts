// Parse JWT payload without external library
function parseJwt(token: string): any {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Extract data from backend responses (they wrap in { data: ... })
export function extractData(response: any): any {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }
  return response;
}

/**
 * Convert frontend camelCase config → backend snake_case config for PUT /customer-config/me
 */
export function toSaaSConfig(frontendConfig: any): any {
  const saas: any = {};

  if (frontendConfig.services) {
    saas.services = frontendConfig.services;
  }
  if (frontendConfig.subPackages) {
    saas.sub_packages = frontendConfig.subPackages;
  }
  if (frontendConfig.completePackage) {
    saas.complete_package = frontendConfig.completePackage;
  }
  if (frontendConfig.paymentPlan) {
    saas.payment_plan = frontendConfig.paymentPlan;
  }
  if (frontendConfig.invoice) {
    saas.invoice = frontendConfig.invoice;
  }
  if (frontendConfig.estimation) {
    saas.estimation = {
      obra_negra: frontendConfig.estimation.obraNegraPrice,
      obra_gris: frontendConfig.estimation.obraGrisPrice,
      acabados: frontendConfig.estimation.acabadosPrice,
      custom_estimations: frontendConfig.estimation.customEstimations ?? [],
    };
  }

  return saas;
}

/**
 * Convert backend snake_case config → frontend camelCase config
 */
export function fromSaaSConfig(saasConfig: any): any {
  if (!saasConfig || typeof saasConfig !== 'object') return saasConfig;

  const frontend: any = { ...saasConfig };

  if ('sub_packages' in saasConfig) {
    frontend.subPackages = saasConfig.sub_packages;
    delete frontend.sub_packages;
  }
  if ('complete_package' in saasConfig) {
    frontend.completePackage = saasConfig.complete_package;
    delete frontend.complete_package;
  }
  if ('payment_plan' in saasConfig) {
    frontend.paymentPlan = saasConfig.payment_plan;
    delete frontend.payment_plan;
  }

  // Estimation nested keys
  if (saasConfig.estimation && typeof saasConfig.estimation === 'object') {
    frontend.estimation = {
      obraNegraPrice: saasConfig.estimation.obra_negra ?? saasConfig.estimation.obraNegraPrice ?? 0,
      obraGrisPrice: saasConfig.estimation.obra_gris ?? saasConfig.estimation.obraGrisPrice ?? 0,
      acabadosPrice: saasConfig.estimation.acabados ?? saasConfig.estimation.acabadosPrice ?? 0,
      customEstimations: saasConfig.estimation.custom_estimations ?? saasConfig.estimation.customEstimations ?? [],
    };
  }

  return frontend;
}

// Runtime env from Docker (window.__ENV is injected by entrypoint.sh)
const runtimeEnv = (typeof window !== 'undefined' && (window as any).__ENV) || {};

const API_URL = import.meta.env.VITE_API_URL || runtimeEnv.VITE_API_URL || 'http://localhost:3000/api/v1';
export const SHOP_SLUG = import.meta.env.VITE_SHOP_SLUG || runtimeEnv.VITE_SHOP_SLUG || 'elemet-haus';

function getToken() {
  const user = localStorage.getItem('element_user:v1');
  if (!user) return null;
  try {
    return JSON.parse(user).token;
  } catch {
    return null;
  }
}

function buildUserFromToken(token: string) {
  const payload = parseJwt(token);
  if (!payload) return null;
  // Try to preserve existing name from localStorage if JWT has no name
  let existingName = '';
  try {
    const stored = localStorage.getItem('element_user:v1');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.name && parsed.name !== parsed.email && parsed.name !== 'Usuario') {
        existingName = parsed.name;
      }
    }
  } catch {}
  const name = payload.name || payload.customer_name || payload.full_name || payload.first_name || payload.display_name || existingName || 'Usuario';
  return {
    id: payload.customer_id || payload.sub || payload.id || '',
    name,
    email: payload.email || '',
    username: payload.email || payload.username || '',
    token,
    role: payload.role || 'customer',
    profession: payload.profession,
    phone: payload.phone,
    address: payload.address,
  };
}

async function api(path: string, options: RequestInit = {}) {
  const token = getToken();

  // Add shop_slug as query param if not already present and not a public route
  // Auth routes ALSO need shop_slug so the backend can identify the shop
  let finalPath = path;
  if (!path.includes('shop_slug') && !path.startsWith('/public/')) {
    const separator = path.includes('?') ? '&' : '?';
    finalPath = `${path}${separator}shop_slug=${SHOP_SLUG}`;
  }

  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const url = `${baseUrl}${finalPath}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Shop-Slug': SHOP_SLUG,
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
      console.error('[API ERROR]', response.status, error);
      throw new Error(error.error || error.message || `Error HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
    }
    throw err;
  }
}

export const apiService = {
  // ── Auth ──────────────────────────────────────────
  register: (data: any) =>
    api('/auth/customer/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: any) =>
    api('/auth/customer/login', { method: 'POST', body: JSON.stringify(data) }),

  selectShop: (data: any) =>
    api('/auth/select-shop', { method: 'POST', body: JSON.stringify(data) }),

  me: () => api('/auth/me'),
  updateMe: (data: any) => api('/customers/me', { method: 'PATCH', body: JSON.stringify(data) }),
  resetPassword: (data: any) => api('/auth/customer/reset-password', { method: 'PATCH', body: JSON.stringify(data) }),

  buildUserFromToken,

  // Helper: check if token is pending (no shop_id)
  isTokenPending: (token: string) => {
    try {
      const payload = parseJwt(token);
      return !payload?.shop_id || payload.shop_id === '' || payload.sub === 'pending';
    } catch {
      return false;
    }
  },

  // ── Public Landing ──────────────────────────────
  getPublicSiteConfig: () =>
    api(`/public/site-config?shop_slug=${SHOP_SLUG}`),

  getPublicLandingImages: () =>
    api(`/public/landing-images?shop_slug=${SHOP_SLUG}`),

  // ── Quotes (Auth) ───────────────────────────────
  getQuotes: () => api('/quotes'),
  getQuote: (id: number | string) => api(`/quotes/${id}`),
  createQuote: (data: any) => api('/quotes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuote: (id: number | string, data: any) => api(`/quotes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuote: (id: number | string) => api(`/quotes/${id}`, { method: 'DELETE' }),
  selectPaymentPlan: (quoteId: number | string, data: any) => api(`/quotes/${quoteId}/select-plan`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Payment Plans (Auth) ──────────────────────────
  getPaymentPlans: () => api('/payment-plans'),
  getPaymentPlan: (id: number | string) => api(`/payment-plans/${id}`),
  createPaymentPlan: (data: any) => api('/payment-plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePaymentPlan: (id: number | string, data: any) => api(`/payment-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePaymentPlan: (id: number | string) => api(`/payment-plans/${id}`, { method: 'DELETE' }),
  setDefaultPaymentPlan: (id: number | string) => api(`/payment-plans/${id}/default`, { method: 'PATCH' }),

  // ── Quote Payments (Auth) ─────────────────────────
  getQuotePayments: (quoteId: number | string) => api(`/quotes/${quoteId}/payments`),
  createQuotePayment: (quoteId: number | string, data: any) => api(`/quotes/${quoteId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  deleteQuotePayment: (quoteId: number | string, paymentId: number | string) => api(`/quotes/${quoteId}/payments/${paymentId}`, { method: 'DELETE' }),

  // ── Customer Config (Auth) ────────────────────────
  getMyConfig: () => api('/customer-config/me'),
  saveMyConfig: (data: any) => api('/customer-config/me', { method: 'PUT', body: JSON.stringify(data) }),

  // ── Quote Catalog (Materiales) ─────────────────────
  getCatalogCategories: () => api('/quote-catalog/categories'),
  createCatalogCategory: (data: any) => api('/quote-catalog/categories', { method: 'POST', body: JSON.stringify(data) }),
  deleteCatalogCategory: (id: string) => api(`/quote-catalog/categories/${id}`, { method: 'DELETE' }),

  getCatalogProducts: (categoryId?: string) => api(`/quote-catalog/products${categoryId ? `?category_id=${categoryId}` : ''}`),
  createCatalogProduct: (data: any) => api('/quote-catalog/products', { method: 'POST', body: JSON.stringify(data) }),
  deleteCatalogProduct: (id: string) => api(`/quote-catalog/products/${id}`, { method: 'DELETE' }),
  getCatalogProduct: (id: string) => api(`/quote-catalog/products/${id}`),

  addCatalogPrice: (productId: string, data: any) => api(`/quote-catalog/products/${productId}/prices`, { method: 'POST', body: JSON.stringify(data) }),
  updateCatalogPrice: (productId: string, priceId: string, data: any) => api(`/quote-catalog/products/${productId}/prices/${priceId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCatalogPrice: (productId: string, priceId: string) => api(`/quote-catalog/products/${productId}/prices/${priceId}`, { method: 'DELETE' }),

  getCatalogOrders: () => api('/quote-catalog/orders'),
  createCatalogOrder: (data: any) => api('/quote-catalog/orders', { method: 'POST', body: JSON.stringify(data) }),

  // ── Tile Calculator (Enchapes) ────────────────────
  getTileProjects: () => api('/tile-calculator/projects'),
  getTileProject: (id: string) => api(`/tile-calculator/projects/${id}`),
  createTileProject: (data: any) => api('/tile-calculator/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateTileProject: (id: string, data: any) => api(`/tile-calculator/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTileProject: (id: string) => api(`/tile-calculator/projects/${id}`, { method: 'DELETE' }),

  // ── Planos de Casa (plantilla maestra) ────────────
  getHousePlans: () => api('/tile-calculator/house-plans'),
  getHousePlan: (id: string) => api(`/tile-calculator/house-plans/${id}`),
  createHousePlan: (data: any) => api('/tile-calculator/house-plans', { method: 'POST', body: JSON.stringify(data) }),
  updateHousePlan: (id: string, data: any) => api(`/tile-calculator/house-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHousePlan: (id: string) => api(`/tile-calculator/house-plans/${id}`, { method: 'DELETE' }),

  // Derivar plano → calculadoras
  importPlanToTiles: (id: string, data: any) => api(`/tile-calculator/house-plans/${id}/import-to-tiles`, { method: 'POST', body: JSON.stringify(data) }),
  importPlanToGuardaescobas: (id: string, data: any) => api(`/tile-calculator/house-plans/${id}/import-to-guardaescobas`, { method: 'POST', body: JSON.stringify(data) }),
  syncPlanToTiles: (id: string, projectId: string) => api(`/tile-calculator/house-plans/${id}/sync-to-tiles/${projectId}`, { method: 'POST' }),
  syncPlanToGuardaescobas: (id: string, projectId: string) => api(`/tile-calculator/house-plans/${id}/sync-to-guardaescobas/${projectId}`, { method: 'POST' }),

  // ── Barrederas (endpoints backend: guardaescobas) ──
  getGuardaescobasProjects: () => api('/tile-calculator/guardaescobas-projects'),
  getGuardaescobasProject: (id: string) => api(`/tile-calculator/guardaescobas-projects/${id}`),
  createGuardaescobasProject: (data: any) => api('/tile-calculator/guardaescobas-projects', { method: 'POST', body: JSON.stringify(data) }),
  updateGuardaescobasProject: (id: string, data: any) => api(`/tile-calculator/guardaescobas-projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGuardaescobasProject: (id: string) => api(`/tile-calculator/guardaescobas-projects/${id}`, { method: 'DELETE' }),
  calculateGuardaescobas: (id: string) => api(`/tile-calculator/guardaescobas-projects/${id}/calculate`, { method: 'POST' }),
};
