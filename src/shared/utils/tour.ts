// Tour state management
const TOUR_STEP_KEY = 'element_tour_step';
const TOUR_ACTIVE_KEY = 'element_tour_active';

export interface TourStep {
  step: number;
  route: string;
  title: string;
  description: string;
}

export const tourSteps: TourStep[] = [
  {
    step: 1,
    route: '/tarifas',
    title: '💰 Zona 1: Tarifas',
    description: 'Configura los precios de tus servicios, paquetes y servicios adicionales. Define cuánto cobras por m² o por unidad. Estos precios se usarán automáticamente en tus cotizaciones.',
  },
  {
    step: 2,
    route: '/pagos',
    title: '💳 Zona 2: Plan de Pagos',
    description: 'Crea planes de pago reutilizables (ej: 30% anticipo, 30% en obra, 40% final). Luego podrás aplicarlos con un clic al crear cotizaciones.',
  },
  {
    step: 3,
    route: '/cuenta-cobro',
    title: '📋 Zona 3: Cuenta de Cobro',
    description: 'Ingresa los datos de tu empresa, sube tu logo y firma digital. Esto aparecerá en cada cuenta de cobro que generes para tus clientes.',
  },
  {
    step: 4,
    route: '/estimacion',
    title: '🏗️ Zona 4: Estimación de Obra',
    description: 'Define precios por m² para obra negra, obra gris y acabados. También puedes crear estimaciones personalizadas como "Primer piso" o "Sótano".',
  },
];

export function startTour() {
  localStorage.setItem(TOUR_ACTIVE_KEY, 'true');
  localStorage.setItem(TOUR_STEP_KEY, '1');
}

export function endTour() {
  localStorage.removeItem(TOUR_ACTIVE_KEY);
  localStorage.removeItem(TOUR_STEP_KEY);
  localStorage.setItem('element_tour_seen', 'true');
}

export function skipTour() {
  localStorage.removeItem(TOUR_ACTIVE_KEY);
  localStorage.removeItem(TOUR_STEP_KEY);
  localStorage.setItem('element_tour_seen', 'true');
}

export function getTourState(): { active: boolean; step: number } {
  const active = localStorage.getItem(TOUR_ACTIVE_KEY) === 'true';
  const step = parseInt(localStorage.getItem(TOUR_STEP_KEY) || '0', 10);
  return { active, step };
}

export function setTourStep(step: number) {
  localStorage.setItem(TOUR_STEP_KEY, String(step));
}

export function getCurrentTourStep(): TourStep | undefined {
  const { step } = getTourState();
  return tourSteps.find((s) => s.step === step);
}

export function isTourActiveForRoute(route: string): boolean {
  const { active, step } = getTourState();
  if (!active) return false;
  const currentStep = tourSteps.find((s) => s.step === step);
  return currentStep?.route === route;
}
