import { create } from 'zustand';
import type { AppConfig, Quote, QuoteFormData, User, SavedPaymentPlan } from '../types';

// Guardado de config con debounce: evita pegarle al backend en cada tecla.
let _saveConfigTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveConfig(getConfig: () => AppConfig, wait = 600) {
  if (_saveConfigTimer) clearTimeout(_saveConfigTimer);
  _saveConfigTimer = setTimeout(() => {
    _saveConfigTimer = null;
    import('./api').then(({ apiService, toSaaSConfig }) => {
      apiService.saveMyConfig(toSaaSConfig(getConfig())).catch((err: any) => {
        console.error('[STORE] Error saving config:', err?.message || err);
      });
    });
  }, wait);
}

export interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  loadFromBackend: () => Promise<void>;

  // Config
  config: AppConfig;
  updateConfig: (config: Partial<AppConfig>) => void;
  saveService: (id: string, service: { name: string; price: number; unit: string }) => void;
  deleteService: (id: string) => void;
  savePayment: (payment: { name: string; percentage: number }) => void;
  deletePayment: (index: number) => void;

  // Quotes
  quotes: Quote[];
  addQuote: (quote: Quote) => void;
  updateQuote: (id: number | string, updates: Partial<Quote>) => void;
  deleteQuote: (id: number | string) => void;
  clearAllQuotes: () => void;
  getQuoteById: (id: number | string) => Quote | undefined;

  // Payment Plans
  paymentPlans: SavedPaymentPlan[];
  loadPaymentPlans: () => Promise<void>;
  createPaymentPlan: (plan: Omit<SavedPaymentPlan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePaymentPlan: (id: number | string, plan: Partial<SavedPaymentPlan>) => Promise<void>;
  deletePaymentPlan: (id: number | string) => Promise<void>;
  setDefaultPaymentPlan: (id: number | string) => Promise<void>;

  // Form
  formData: QuoteFormData;
  setFormData: (data: Partial<QuoteFormData>) => void;
  resetForm: () => void;

  // Wizard
  quoteStep: number;
  setQuoteStep: (step: number) => void;

  // Edit mode
  editingQuoteId: number | string | null;
  setEditingQuoteId: (id: number | string | null) => void;
}

const defaultFormData: QuoteFormData = {
  client: '',
  project: '',
  areaMode: 'dimensions',
  lotShape: 'rectangular',
  frontal: '10',
  posterior: '10',
  latIzq: '10',
  latDer: '10',
  directArea: '100',
  occ: 80,
  floors: 2,
  overhangSize: 1.0,
  facades: { frontal: false, posterior: false, lateralLeft: false, lateralRight: false },
  selectedServices: [],
  selectedSubPackages: [],
  hasCompletePackage: false,
  discount: 0,
  additionalServices: [],
  paymentPlanId: undefined,
  invoices: [],
};

const demoConfig: AppConfig = {
  services: {
    arch: { name: 'Diseño Arquitectónico', price: 7000, unit: '/m²' },
    struct: { name: 'Diseño Estructural', price: 4000, unit: '/m²' },
    hydro: { name: 'Instalaciones Hidrosanitarias', price: 2500, unit: '/m²' },
    elec: { name: 'Diseño Eléctrico', price: 2500, unit: '/m²' },
    render: { name: 'Renders 3D', price: 1500, unit: '/m²' },
    tour: { name: 'Recorrido 3D', price: 2000, unit: '/m²' },
    budget: { name: 'Presupuesto', price: 1000, unit: '/m²' },
    license: { name: 'Licencias', price: 1500, unit: '/m²' },
  },
  subPackages: {
    installations: { name: 'Instalaciones (Eléctrico + Hidrosanitario)', price: 4500, unit: '/m²' },
  },
  completePackage: { name: 'Paquete Técnico Completo', price: 14000, unit: '/m²' },
  paymentPlan: {
    payments: [
      { name: 'Firma', percentage: 50 },
      { name: 'Revisión 1', percentage: 20 },
      { name: 'Revisión 2', percentage: 20 },
      { name: 'Entrega', percentage: 10 },
    ],
  },
  invoice: {
    company: {
      enabled: true,
      name: '',
      nit: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      logo: '',
    },
    representative: {
      enabled: true,
      name: '',
      position: '',
      document: '',
      signature: '',
    },
    banking: {
      enabled: true,
      bank: '',
      accountType: '',
      accountNumber: '',
      accountHolder: '',
    },
    document: {
      consecutiveNumber: 1,
      terms: '',
      footerNote: '',
    },
  },
  estimation: {
    obraNegraPrice: 1500000,
    obraGrisPrice: 2800000,
    acabadosPrice: 4200000,
    customEstimations: [],
  },
};

// Key de sesión versionada: si algún día cambia la forma del objeto User,
// se sube el sufijo (v2, v3…) y los datos viejos se ignoran sin romper.
export const USER_KEY = 'element_user:v1';
const LEGACY_USER_KEY = 'element_user';

const getStoredUser = (): User | null => {
  try {
    let raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      // Migración única desde la key sin versión (no desloguea a usuarios actuales)
      const legacy = localStorage.getItem(LEGACY_USER_KEY);
      if (legacy) {
        localStorage.setItem(USER_KEY, legacy);
        localStorage.removeItem(LEGACY_USER_KEY);
        raw = legacy;
      }
    }
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

let isLoadingFromBackend = false;

export const useStore = create<AppState>((set, get) => ({
  user: getStoredUser(),
  isAuthenticated: !!getStoredUser(),
  login: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem(USER_KEY);
    set({ user: null, isAuthenticated: false, quotes: [], config: demoConfig });
  },
  loadFromBackend: async () => {
    if (isLoadingFromBackend) {
      return;
    }
    isLoadingFromBackend = true;
    try {
      const { apiService, extractData } = await import('./api');
      const [quotesRes, configRes, plansRes] = await Promise.all([
        apiService.getQuotes(),
        apiService.getMyConfig().catch(() => null),
        apiService.getPaymentPlans().catch(() => null),
      ]);
      const quotes = extractData(quotesRes);
      const rawConfig = extractData(configRes);
      const plans = extractData(plansRes);

      if (Array.isArray(quotes)) {
        set({ quotes });
      }

      if (Array.isArray(plans) && plans.length > 0) {
        set({ paymentPlans: plans });
      } else if (Array.isArray(plans) && plans.length === 0) {
        // El usuario no tiene planes de pago en la BD: sembrar el plan default
        try {
          const defaultInstallments = demoConfig.paymentPlan.payments.map((p, i) => ({
            name: p.name,
            percentage: p.percentage,
            order: i + 1,
          }));
          const createRes = await apiService.createPaymentPlan({
            name: 'Plan de pagos estándar',
            description: 'Plan de pagos predeterminado',
            installments: defaultInstallments,
            isDefault: true,
          });
          const createdPlan = extractData(createRes);
          if (createdPlan && createdPlan.id) {
            set({ paymentPlans: [createdPlan] });
          } else {
            set({ paymentPlans: [] });
          }
        } catch (seedErr: any) {
          console.error('[STORE] No se pudo crear el plan default:', seedErr.message || seedErr);
          set({ paymentPlans: [] });
        }
      }

      if (rawConfig && typeof rawConfig === 'object') {
        const { fromSaaSConfig } = await import('./api');
        const normalizedConfig = fromSaaSConfig(rawConfig);

        const mergedConfig: any = { ...demoConfig, ...normalizedConfig };

        if (!mergedConfig.paymentPlan?.payments?.length) {
          mergedConfig.paymentPlan = demoConfig.paymentPlan;
        }
        if (!mergedConfig.invoice?.company?.name) {
          mergedConfig.invoice = demoConfig.invoice;
        }
        if (!mergedConfig.estimation?.obraNegraPrice) {
          mergedConfig.estimation = demoConfig.estimation;
        }
        if (!mergedConfig.services || Object.keys(mergedConfig.services).length === 0) {
          mergedConfig.services = demoConfig.services;
        }
        if (!mergedConfig.subPackages || Object.keys(mergedConfig.subPackages).length === 0) {
          mergedConfig.subPackages = demoConfig.subPackages;
        }
        if (!mergedConfig.completePackage?.price) {
          mergedConfig.completePackage = demoConfig.completePackage;
        }

        set({ config: mergedConfig });

        // Extract customer info (phone, address) from the nested customer object
        const customerData = rawConfig?.customer;
        if (customerData && typeof customerData === 'object') {
          const { user: currentUser } = get();
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              phone: customerData.phone || currentUser.phone,
              address: customerData.address || currentUser.address,
              name: customerData.name || currentUser.name,
              email: customerData.email || currentUser.email,
              profession: customerData.address || currentUser.profession,
            };
            localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
            set({ user: updatedUser });
          }
        }
      }
    } catch (e: any) {
      console.error('[STORE] Error loading from backend:', e.message || e);
    } finally {
      isLoadingFromBackend = false;
    }
  },

  config: demoConfig,
  updateConfig: (partial) => {
    set((state) => ({ config: { ...state.config, ...partial } }));
    // Sync a SaaS con debounce (no en cada cambio de campo).
    debouncedSaveConfig(() => get().config);
  },
  saveService: (id, service) => {
    set((state) => ({
      config: { ...state.config, services: { ...state.config.services, [id]: service } },
    }));
    // Sync to SaaS
    try {
      import('./api').then(({ apiService, toSaaSConfig }) => {
        const current = get().config;
        apiService.saveMyConfig({ services: toSaaSConfig(current).services }).catch(() => {});
      });
    } catch {}
  },
  deleteService: (id) => {
    set((state) => {
      const services = { ...state.config.services };
      delete services[id];
      return { config: { ...state.config, services } };
    });
    // Sync to SaaS — send services without the deleted key
    try {
      import('./api').then(({ apiService, toSaaSConfig }) => {
        const current = get().config;
        apiService.saveMyConfig({ services: toSaaSConfig(current).services }).catch(() => {});
      });
    } catch {}
  },
  savePayment: (payment) => {
    set((state) => ({
      config: {
        ...state.config,
        paymentPlan: { payments: [...state.config.paymentPlan.payments, payment] },
      },
    }));
    // Sync to SaaS
    try {
      import('./api').then(({ apiService, toSaaSConfig }) => {
        const current = get().config;
        apiService.saveMyConfig({ payment_plan: toSaaSConfig(current).payment_plan }).catch(() => {});
      });
    } catch {}
  },
  deletePayment: (index) => {
    set((state) => ({
      config: {
        ...state.config,
        paymentPlan: {
          payments: state.config.paymentPlan.payments.filter((_, i) => i !== index),
        },
      },
    }));
    // Sync to SaaS
    try {
      import('./api').then(({ apiService, toSaaSConfig }) => {
        const current = get().config;
        apiService.saveMyConfig({ payment_plan: toSaaSConfig(current).payment_plan }).catch(() => {});
      });
    } catch {}
  },

  paymentPlans: [],
  loadPaymentPlans: async () => {
    try {
      const { apiService, extractData } = await import('./api');
      const res = await apiService.getPaymentPlans();
      const plans = extractData(res);
      if (Array.isArray(plans)) {
        set({ paymentPlans: plans });
      }
    } catch (e: any) {
      console.error('[STORE] Error loading payment plans:', e.message || e);
    }
  },
  createPaymentPlan: async (plan) => {
    try {
      const { apiService, extractData } = await import('./api');
      const res = await apiService.createPaymentPlan(plan);
      const created = extractData(res);
      if (created) {
        set((state) => ({ paymentPlans: [created, ...state.paymentPlans] }));
      }
    } catch (e: any) {
      console.error('[STORE] Error creating payment plan:', e.message || e);
      throw e;
    }
  },
  updatePaymentPlan: async (id, plan) => {
    try {
      const { apiService, extractData } = await import('./api');
      const res = await apiService.updatePaymentPlan(id, plan);
      const updated = extractData(res);
      if (updated) {
        set((state) => ({
          paymentPlans: state.paymentPlans.map((p) => (p.id === id ? updated : p)),
        }));
      }
    } catch (e: any) {
      console.error('[STORE] Error updating payment plan:', e.message || e);
      throw e;
    }
  },
  deletePaymentPlan: async (id) => {
    try {
      const { apiService } = await import('./api');
      await apiService.deletePaymentPlan(id);
      set((state) => ({ paymentPlans: state.paymentPlans.filter((p) => p.id !== id) }));
    } catch (e: any) {
      console.error('[STORE] Error deleting payment plan:', e.message || e);
      throw e;
    }
  },
  setDefaultPaymentPlan: async (id) => {
    try {
      const { apiService, extractData } = await import('./api');
      const res = await apiService.setDefaultPaymentPlan(id);
      const updated = extractData(res);
      if (updated) {
        set((state) => ({
          paymentPlans: state.paymentPlans.map((p) => ({
            ...p,
            isDefault: p.id === id,
          })),
        }));
      }
    } catch (e: any) {
      console.error('[STORE] Error setting default payment plan:', e.message || e);
      throw e;
    }
  },

  quotes: [],
  addQuote: (quote) => {
    set((state) => ({ quotes: [quote, ...state.quotes] }));
    // Sync to SaaS — strip temp id, data is already an object
    try {
      import('./api').then(async ({ apiService, extractData }) => {
        const { id: _tempId, ...serverPayload } = quote;
        try {
          const res = await apiService.createQuote(serverPayload);
          const created = extractData(res);
          if (created && created.id) {
            // Replace the temp ID with the real server ID
            set((state) => ({
              quotes: state.quotes.map((q) => (q.id === quote.id ? { ...created, data: typeof created.data === 'string' ? created.data : JSON.stringify(created.data) } : q)),
            }));

            // Assign payment plan if one was selected
            const paymentPlanId =
              typeof serverPayload.data === 'object' && serverPayload.data !== null
                ? (serverPayload.data as any).paymentPlanId
                : undefined;
            if (paymentPlanId) {
              await apiService.selectPaymentPlan(created.id, { payment_plan_id: paymentPlanId });
            }
          }
        } catch {
          // Silently fail
        }
      });
    } catch {}
  },
  updateQuote: (id, updates) => {
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    }));
    try {
      import('./api').then(async ({ apiService }) => {
        try {
          await apiService.updateQuote(id, updates);

          // Assign payment plan if one was selected
          const paymentPlanId =
            typeof updates.data === 'object' && updates.data !== null
              ? (updates.data as any).paymentPlanId
              : (updates as any).paymentPlanId;
          if (paymentPlanId) {
            await apiService.selectPaymentPlan(id, { payment_plan_id: paymentPlanId });
          }
        } catch {
          // Silently fail
        }
      });
    } catch {}
  },
  deleteQuote: (id) => {
    set((state) => ({ quotes: state.quotes.filter((q) => q.id !== id) }));
    try {
      import('./api').then(({ apiService }) => {
        apiService.deleteQuote(id).catch(() => {});
      });
    } catch {}
  },
  clearAllQuotes: () => set({ quotes: [] }),
  getQuoteById: (id) => get().quotes.find((q) => q.id === id),

  formData: { ...defaultFormData },
  setFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  resetForm: () => set({ formData: { ...defaultFormData } }),

  quoteStep: 1,
  setQuoteStep: (step) => set({ quoteStep: step }),

  editingQuoteId: null,
  setEditingQuoteId: (id) => set({ editingQuoteId: id }),
}));
