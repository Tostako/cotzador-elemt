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

/** Prefijo del módulo de Presupuestos de Obra: el backend lo publica bajo
 *  /api/v1/costos/... (p. ej. @Controller('costos/projects')). API_URL ya
 *  aporta /api/v1, así que aquí solo va /costos. */
const PRESUP_BASE = '/costos';

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

/** Error de la API con el estado a mano, para distinguir "no existe" de "lo rechazó". */
export interface ApiError extends Error {
  status: number;
  /** Motivos de validación tal cual los devolvió el servidor. */
  motivos: string[];
}

/**
 * Construye el mensaje a partir del cuerpo de error.
 *
 * NestJS responde `{ message: [...detalles...], error: 'Bad Request' }`. Antes
 * se leía `error` primero, así que el usuario veía "Bad Request" y los motivos
 * reales —el campo que falla y por qué— se perdían. Aquí manda `message`, que
 * es lo único que permite corregir el problema; `error` queda de reserva.
 */
function construirError(status: number, path: string, cuerpo: any): ApiError {
  const bruto = cuerpo?.message ?? cuerpo?.error;
  const motivos = Array.isArray(bruto)
    ? bruto.map(String)
    : typeof bruto === 'string' && bruto
      ? [bruto]
      : [];

  let mensaje = motivos.join(' · ');
  // Un 404 sin cuerpo útil es casi siempre una ruta que aún no existe: decirlo
  // ahorra buscar el fallo en el formulario.
  if (!mensaje) {
    mensaje = status === 404
      ? `El servidor no tiene la ruta ${path} (404).`
      : `Error HTTP ${status}`;
  } else if (status === 404) {
    mensaje += ` (404 en ${path})`;
  }

  const e = new Error(mensaje) as ApiError;
  e.status = status;
  e.motivos = motivos;
  return e;
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

  // shop_slug en la query (auth y demás; las públicas ya lo llevan en el path).
  // El módulo de presupuestos de obra queda fuera: resuelve el tenant desde el
  // JWT y no lee este parámetro, así que ensuciaría la URL sin aportar nada.
  let finalPath = path;
  const necesitaShopSlug =
    !path.includes('shop_slug') && !path.startsWith('/public/') && !path.startsWith(`${PRESUP_BASE}/`);
  if (necesitaShopSlug) {
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
      console.error('[API ERROR]', response.status, path, error);
      throw construirError(response.status, path, error);
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

  // ── Cornisas de techo ──────────────────────────────
  // Espejo de los de guardaescobas. Pendientes de crear en el backend:
  // hasta entonces "Guardar obra" en Cornisas devolverá error; el resto de la
  // calculadora (elegir plano, materiales, cálculo) funciona sin ellos.
  getCornisasProjects: () => api('/tile-calculator/cornisas-projects'),
  getCornisasProject: (id: string) => api(`/tile-calculator/cornisas-projects/${id}`),
  createCornisasProject: (data: any) => api('/tile-calculator/cornisas-projects', { method: 'POST', body: JSON.stringify(data) }),
  updateCornisasProject: (id: string, data: any) => api(`/tile-calculator/cornisas-projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCornisasProject: (id: string) => api(`/tile-calculator/cornisas-projects/${id}`, { method: 'DELETE' }),
  importPlanToCornisas: (id: string, data: any) => api(`/tile-calculator/house-plans/${id}/import-to-cornisas`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Presupuestos de Obra / APU (DOC-05) ───────────────
  // La especificación escribe las rutas como "/v1/projects"; aquí van sin ese
  // prefijo porque API_URL ya termina en /api/v1. Si el backend las publica en
  // otra base, se cambia PRESUP_BASE y no hay que tocar las pantallas.
  //
  // Proyectos de obra — HU-01, HU-03
  getObraProyectos: (params?: { estado?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.estado) qs.set('estado', params.estado);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const s = qs.toString();
    return api(`${PRESUP_BASE}/projects${s ? `?${s}` : ''}`);
  },
  getObraProyecto: (id: string) => api(`${PRESUP_BASE}/projects/${id}`),
  createObraProyecto: (data: any) => api(`${PRESUP_BASE}/projects`, { method: 'POST', body: JSON.stringify(data) }),
  /** `version` viaja como If-Match para el control de concurrencia optimista. */
  updateObraProyecto: (id: string, data: any, version?: number | string) =>
    api(`${PRESUP_BASE}/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...(version != null ? { headers: { 'If-Match': String(version) } } : {}),
    }),
  /** Borrado lógico: mueve el proyecto a la papelera (H-09). */
  deleteObraProyecto: (id: string) => api(`${PRESUP_BASE}/projects/${id}`, { method: 'DELETE' }),
  restaurarObraProyecto: (id: string) => api(`${PRESUP_BASE}/projects/${id}/restaurar`, { method: 'POST' }),
  /** HU-03 · Copia presupuesto, cantidades y parámetros de AIU. */
  duplicarObraProyecto: (id: string, nombre?: string) =>
    api(`${PRESUP_BASE}/projects/${id}/duplicate`, { method: 'POST', body: JSON.stringify(nombre ? { nombre } : {}) }),
  // Ojo: el backend escribe la ruta "paperera", no "papelera".
  getObraPapelera: () => api(`${PRESUP_BASE}/projects/paperera`),

  // Presupuesto — HU-04, HU-05, HU-06, HU-07
  getPresupuesto: (projectId: string) => api(`${PRESUP_BASE}/projects/${projectId}/budget`),
  addActividad: (projectId: string, data: any) =>
    api(`${PRESUP_BASE}/projects/${projectId}/budget/items`, { method: 'POST', body: JSON.stringify(data) }),
  /** Solo se acepta el campo `cantidad`; cualquier otro devuelve 422. */
  updateActividadCantidad: (projectId: string, itemId: string, cantidad: number) =>
    api(`${PRESUP_BASE}/projects/${projectId}/budget/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ cantidad }) }),
  deleteActividad: (projectId: string, itemId: string) =>
    api(`${PRESUP_BASE}/projects/${projectId}/budget/items/${itemId}`, { method: 'DELETE' }),
  getActividadApu: (projectId: string, itemId: string) =>
    api(`${PRESUP_BASE}/projects/${projectId}/budget/items/${itemId}/apu`),
  /** HU-11 · Alcance de PROYECTO: edita la instantánea, el catálogo no se toca.
   *  El cuerpo solo lleva rendimientos; los precios salen del maestro. */
  updateActividadApu: (projectId: string, itemId: string, data: any) =>
    api(`${PRESUP_BASE}/projects/${projectId}/budget/items/${itemId}/apu`, { method: 'PUT', body: JSON.stringify(data) }),
  /** HU-11 · Alcance de CATÁLOGO: publica la versión del proyecto como versión
   *  nueva del APU global. Acción distinta, permiso distinto (admin_catalogo). */
  /**
   * Promueve el APU de la actividad al catálogo global.
   *
   * El controlador no tiene `@Body()`: `dryRun` va por query y el token de
   * confirmación por la cabecera `x-confirmation-token`. Mandarlo en el cuerpo
   * —como se hacía antes— no llega al `@Headers()` y el servicio responde 422
   * CONFIRMACION_REQUERIDA.
   *
   * Con `dryRun` el servicio devuelve el análisis y no escribe. Si el APU no
   * difiere del global, responde `sin_cambios` sin tocar nada.
   */
  promoverApu: (projectId: string, itemId: string, opciones?: { dryRun?: boolean; confirmationToken?: string }) =>
    api(`${PRESUP_BASE}/projects/${projectId}/budget/items/${itemId}/apu/promote${opciones?.dryRun ? '?dryRun=true' : ''}`, {
      method: 'POST',
      headers: opciones?.confirmationToken ? { 'x-confirmation-token': opciones.confirmationToken } : undefined,
    }),

  // Cierre financiero — HU-16
  getAiu: (projectId: string) => api(`${PRESUP_BASE}/projects/${projectId}/aiu`),
  updateAiu: (projectId: string, data: any) =>
    api(`${PRESUP_BASE}/projects/${projectId}/aiu`, { method: 'PUT', body: JSON.stringify(data) }),

  // Catálogo — HU-09, HU-14
  getApus: (params?: { q?: string; capituloId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.capituloId) qs.set('capituloId', params.capituloId);
    if (params?.limit) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return api(`${PRESUP_BASE}/catalog/apus${s ? `?${s}` : ''}`);
  },
  getApu: (id: string) => api(`${PRESUP_BASE}/catalog/apus/${id}`),
  getCapitulos: () => api(`${PRESUP_BASE}/catalog/chapters`),
  /**
   * Maestro de insumos. Responde paginado:
   * `{ items, total, page, per_page, total_pages }` con `per_page` 20 por
   * defecto, así que sin pedir más solo llegan los primeros veinte.
   */
  getInsumos: (params?: { q?: string; grupo?: string; page?: number; perPage?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.grupo) qs.set('grupo', params.grupo);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.perPage) qs.set('per_page', String(params.perPage));
    const s = qs.toString();
    return api(`${PRESUP_BASE}/catalog/supplies${s ? `?${s}` : ''}`);
  },
  /**
   * Añade un precio a la serie histórica del insumo. **Escribe siempre.**
   *
   * `CreatePriceDto` acepta `{ valor }` obligatorio y `vigente_desde`,
   * `usuario`, `motivo`, `origen` opcionales. Cualquier otro campo lo rechaza
   * el ValidationPipe. No hay `dryRun`: el DOC-05 lo preveía pero el backend
   * no lo implementa, y pasarlo no simulaba nada — creaba el precio.
   */
  setPrecioInsumo: (supplyId: string, data: { valor: number; motivo?: string; origen?: string; usuario?: string; vigente_desde?: string }) =>
    api(`${PRESUP_BASE}/catalog/supplies/${supplyId}/prices`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** Serie histórica de precios del insumo. */
  getPreciosInsumo: (supplyId: string) => api(`${PRESUP_BASE}/catalog/supplies/${supplyId}/prices`),
  getUsoInsumo: (supplyId: string) => api(`${PRESUP_BASE}/catalog/supplies/${supplyId}/usage`),
  /** Alta de insumo. Se usa también desde la composición de un APU: el insumo
   *  queda en el maestro, no dentro del APU (RN-10.3). */
  createInsumo: (data: any) => api(`${PRESUP_BASE}/catalog/supplies`, { method: 'POST', body: JSON.stringify(data) }),

  // Analítica — HU-17, HU-18, HU-19
  getAnalitica: (projectId: string) => api(`${PRESUP_BASE}/projects/${projectId}/analytics/summary`),
  /** Consolidado por grupo: la lista de compras de la obra. */
  getConsolidados: (projectId: string) => api(`${PRESUP_BASE}/projects/${projectId}/analytics/consolidated`),

  // Plantillas de proyecto — HU-02
  getPlantillas: () => api(`${PRESUP_BASE}/templates`),
  /** `modo` es obligatorio si el presupuesto ya tiene actividades: el servidor
   *  nunca decide por el usuario entre reemplazar y agregar. */
  aplicarPlantilla: (projectId: string, templateId: string, modo: 'REEMPLAZAR' | 'AGREGAR') =>
    api(`${PRESUP_BASE}/projects/${projectId}/apply-template`, {
      method: 'POST',
      body: JSON.stringify({ templateId, modo }),
    }),

  // APUs del catálogo — HU-10, HU-11, HU-12
  createApu: (data: any) => api(`${PRESUP_BASE}/catalog/apus`, { method: 'POST', body: JSON.stringify(data) }),
  updateApu: (id: string, data: any) => api(`${PRESUP_BASE}/catalog/apus/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  /** Proyectos y presupuestos que se verían afectados por editar el APU. */
  getImpactoApu: (id: string) => api(`${PRESUP_BASE}/catalog/apus/${id}/impact`),
  duplicarApu: (id: string, descripcion: string) =>
    api(`${PRESUP_BASE}/catalog/apus/${id}/duplicate`, { method: 'POST', body: JSON.stringify({ descripcion }) }),

  // Documentos — HU-20, HU-21. Generación asíncrona: devuelve 202 + id y hay
  // que consultar el estado hasta que pase de GENERANDO a LISTO.
  generarDocumento: (projectId: string, data: any) =>
    api(`${PRESUP_BASE}/projects/${projectId}/documents`, { method: 'POST', body: JSON.stringify(data) }),
  getDocumento: (docId: string) => api(`${PRESUP_BASE}/documents/${docId}`),
  getDocumentos: (projectId: string) => api(`${PRESUP_BASE}/projects/${projectId}/documents`),

  // Deshacer — HU-07 (token válido 10 s)
  deshacer: (undoToken: string) => api(`${PRESUP_BASE}/undo/${undoToken}`, { method: 'POST' }),

  // Memorias de cálculo — HU-08. Pertenecen a la actividad del proyecto, no al
  // APU del catálogo: sustentan la cantidad de obra de ESTA obra.
  getMemoria: (projectId: string, itemId: string) =>
    api(`${PRESUP_BASE}/projects/${projectId}/budget/items/${itemId}/memoria`),
  updateMemoria: (projectId: string, itemId: string, data: any) =>
    api(`${PRESUP_BASE}/projects/${projectId}/budget/items/${itemId}/memoria`, { method: 'PUT', body: JSON.stringify(data) }),

  // Cotización a proveedores — HU-22
  getCotizaciones: (projectId: string) => api(`${PRESUP_BASE}/projects/${projectId}/quotations`),
  crearCotizacion: (projectId: string, data: any) =>
    api(`${PRESUP_BASE}/projects/${projectId}/quotations`, { method: 'POST', body: JSON.stringify(data) }),
  updateCotizacion: (projectId: string, quotationId: string, data: any) =>
    api(`${PRESUP_BASE}/projects/${projectId}/quotations/${quotationId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Importación / exportación Excel — HU-13. La importación es en dos pasos:
  // se sube, se revisan los errores y solo entonces se confirma.
  importarApus: (data: any) => api(`${PRESUP_BASE}/catalog/apus/import`, { method: 'POST', body: JSON.stringify(data) }),
  importarInsumos: (data: any) => api(`${PRESUP_BASE}/catalog/supplies/import`, { method: 'POST', body: JSON.stringify(data) }),
  erroresImportacion: (jobId: string) => api(`${PRESUP_BASE}/catalog/imports/${jobId}/errors`),
  confirmarImportacion: (jobId: string) => api(`${PRESUP_BASE}/catalog/imports/${jobId}/confirm`, { method: 'POST' }),

  // Marca — HU-25. Se guarda en el servidor y se asocia a la organización,
  // no al navegador, y nunca afecta a cálculos ni presupuestos.
  getMarca: () => api(`${PRESUP_BASE}/org/branding`),
  updateMarca: (data: any) => api(`${PRESUP_BASE}/org/branding`, { method: 'PUT', body: JSON.stringify(data) }),
  getPlantillasDocumento: () => api(`${PRESUP_BASE}/org/document-templates`),
};
