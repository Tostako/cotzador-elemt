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

// ── Expiración de sesión ──────────────────────────────────
function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return false;
  const p = parseJwt(token);
  if (!p || typeof p.exp !== 'number') return false; // sin exp → no forzamos logout
  return p.exp * 1000 <= Date.now();
}

/** ¿El token guardado está vencido? (chequeo proactivo en rutas protegidas) */
export function isCurrentTokenExpired(): boolean {
  return isTokenExpired(getToken());
}

/** Limpia la sesión local y avisa a la app para sacar al usuario a login. */
export function handleAuthExpired(): void {
  try { localStorage.removeItem('element_user:v1'); } catch { /* ignore */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:expired'));
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

// Guarda el nuevo access token dentro del objeto de usuario en localStorage.
function saveAccessToken(token: string): void {
  try {
    const raw = localStorage.getItem('element_user:v1');
    const obj = raw ? JSON.parse(raw) : {};
    obj.token = token;
    localStorage.setItem('element_user:v1', JSON.stringify(obj));
  } catch { /* ignore */ }
}

// Refresco single-flight: varias peticiones que caen a 401 a la vez comparten un solo /refresh.
// El refresh token vive en una cookie httpOnly → se envía solo con credentials: 'include'.
let _refreshPromise: Promise<string | null> | null = null;
function refreshAccessToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const res = await fetch(`${baseUrl}/auth/customer/refresh?shop_slug=${SHOP_SLUG}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Shop-Slug': SHOP_SLUG },
        body: '{}',
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      const payload = data?.data ?? data;
      const newAccess: string | undefined = payload?.access_token ?? payload?.token;
      if (!newAccess) return null;
      saveAccessToken(newAccess);
      return newAccess;
    } catch {
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

async function api(path: string, options: RequestInit = {}) {
  const isAuthRoute = path.startsWith('/auth/') || path.startsWith('/public/');
  let token = getToken();

  // Access vencido → intentamos refrescar ANTES de gastar la petición.
  if (token && !isAuthRoute && isTokenExpired(token)) {
    token = await refreshAccessToken();
    if (!token) {
      handleAuthExpired();
      throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
    }
  }

  // shop_slug en la query (auth y demás; las públicas ya lo llevan en el path)
  let finalPath = path;
  if (!path.includes('shop_slug') && !path.startsWith('/public/')) {
    const separator = path.includes('?') ? '&' : '?';
    finalPath = `${path}${separator}shop_slug=${SHOP_SLUG}`;
  }
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const url = `${baseUrl}${finalPath}`;

  // En móvil, una red lenta/inestable puede dejar el fetch colgado indefinidamente.
  // Con timeout, la petición falla con un mensaje claro en vez de bloquear la UI.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  const doFetch = (authToken: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Shop-Slug': SHOP_SLUG,
      ...((options.headers as Record<string, string>) || {}),
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return fetch(url, { ...options, headers, credentials: 'include', signal: controller.signal });
  };

  try {
    let response = await doFetch(token);

    // 401 en ruta autenticada → un intento de refresh + reintento de la misma petición.
    if (response.status === 401 && !isAuthRoute) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await doFetch(newToken);
      }
      if (response.status === 401) {
        // El refresh también falló (cookie vencida/revocada) → sacar al usuario.
        handleAuthExpired();
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
      console.error('[API ERROR]', response.status, error);
      throw new Error(error.error || error.message || `Error HTTP ${response.status}`);
    }

    if (response.status === 204) return null; // sin contenido (p. ej. logout)
    return await response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado en responder. Intenta de nuevo.');
    }
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
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
  // Revoca el refresh token en el server y limpia la cookie httpOnly.
  sessionLogout: () => api('/auth/customer/logout', { method: 'POST', body: '{}' }),
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
