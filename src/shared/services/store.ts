import { create } from 'zustand';
import type { AppConfig, Quote, QuoteFormData, User } from '../types';

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
  updateQuote: (id: number, updates: Partial<Quote>) => void;
  deleteQuote: (id: number) => void;
  clearAllQuotes: () => void;
  getQuoteById: (id: number) => Quote | undefined;

  // Form
  formData: QuoteFormData;
  setFormData: (data: Partial<QuoteFormData>) => void;
  resetForm: () => void;

  // Wizard
  quoteStep: number;
  setQuoteStep: (step: number) => void;

  // Edit mode
  editingQuoteId: number | null;
  setEditingQuoteId: (id: number | null) => void;
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
  completePackage: { name: 'Paquete Completo Premium', price: 14000, unit: '/m²' },
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
  },
};

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('element_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useStore = create<AppState>((set, get) => ({
  user: getStoredUser(),
  isAuthenticated: !!getStoredUser(),
  login: (user) => {
    localStorage.setItem('element_user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('element_user');
    set({ user: null, isAuthenticated: false, quotes: [], config: demoConfig });
  },
  loadFromBackend: async () => {
<<<<<<< Updated upstream
    try {
      const { apiService, extractData } = await import('./api');
      console.log('[STORE] Loading quotes and config from SaaS...');
      const [quotesRes, configRes] = await Promise.all([
=======
    if (isLoadingFromBackend) {
      return;
    }
    isLoadingFromBackend = true;
    try {
      const { apiService, extractData } = await import('./api');
      const [quotesRes, configRes, plansRes] = await Promise.all([
>>>>>>> Stashed changes
        apiService.getQuotes(),
        apiService.getMyConfig(),
      ]);
      const quotes = extractData(quotesRes);
      const rawConfig = extractData(configRes);
<<<<<<< Updated upstream
      console.log('[STORE] Quotes response:', quotes);
      console.log('[STORE] Config raw response:', rawConfig);
=======
      const plans = extractData(plansRes);
>>>>>>> Stashed changes

      if (Array.isArray(quotes)) {
        set({ quotes });
      }

<<<<<<< Updated upstream
=======
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

>>>>>>> Stashed changes
      if (rawConfig && typeof rawConfig === 'object') {
        // Convert backend snake_case → frontend camelCase
        const { fromSaaSConfig } = await import('./api');
        const normalizedConfig = fromSaaSConfig(rawConfig);

        // Merge with demoConfig — use deep merge for nested objects
        const mergedConfig: any = { ...demoConfig, ...normalizedConfig };

        // If backend sent empty nested objects, restore defaults from demoConfig
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

<<<<<<< Updated upstream
        // Extract customer name from config response if present
        const customerName =
          rawConfig.customer?.name ||
          rawConfig.customer_name ||
          rawConfig.name;
        if (customerName) {
          const currentUser = get().user;
          if (currentUser && (!currentUser.name || currentUser.name === 'Usuario')) {
            const updatedUser = { ...currentUser, name: customerName };
            localStorage.setItem('element_user', JSON.stringify(updatedUser));
            set({ user: updatedUser });
            console.log('[STORE] Updated user name from config:', customerName);
=======
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
            localStorage.setItem('element_user', JSON.stringify(updatedUser));
            set({ user: updatedUser });
>>>>>>> Stashed changes
          }
        }
      }
    } catch (e: any) {
      console.error('[STORE] Error loading from SaaS:', e.message || e);
    }
  },

  config: demoConfig,
  updateConfig: (partial) => {
    set((state) => ({ config: { ...state.config, ...partial } }));
    // Sync to SaaS — convert camelCase to snake_case before sending
    try {
      import('./api').then(({ apiService, toSaaSConfig }) => {
        const current = get().config;
        const saasPayload = toSaaSConfig(current);
        apiService.saveMyConfig(saasPayload).catch((err: any) => {
          console.error('[STORE] Error saving config:', err.message || err);
        });
      });
    } catch {}
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

  quotes: [],
  addQuote: (quote) => {
    set((state) => ({ quotes: [quote, ...state.quotes] }));
    // Sync to SaaS — strip temp id, data is already an object
    try {
      import('./api').then(({ apiService, extractData }) => {
        const { id: _tempId, ...serverPayload } = quote;
        apiService.createQuote(serverPayload)
          .then((res) => {
            const created = extractData(res);
            if (created && created.id) {
              // Replace the temp ID with the real server ID
              set((state) => ({
                quotes: state.quotes.map((q) => (q.id === quote.id ? { ...created, data: typeof created.data === 'string' ? created.data : JSON.stringify(created.data) } : q)),
              }));
            }
          })
          .catch(() => {});
      });
    } catch {}
  },
  updateQuote: (id, updates) => {
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    }));
    try {
      import('./api').then(({ apiService }) => {
        apiService.updateQuote(id, updates).catch(() => {});
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
