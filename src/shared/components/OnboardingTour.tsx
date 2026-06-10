import { useState } from 'react';

interface TourStep {
  title: string;
  description: string;
  icon: string;
}

const tourSteps: TourStep[] = [
  {
    icon: '🏗️',
    title: '¡Bienvenido a ELEMENT Cotizador!',
    description: 'Tu herramienta profesional para crear cotizaciones de construcción de forma rápida y organizada. Te guiaremos por las funcionalidades principales.',
  },
  {
    icon: '💰',
    title: 'Configurar Tarifas',
    description: 'En Configuración → Tarifas puedes personalizar los precios de tus servicios, paquetes y servicios adicionales. Define tu propia lista de precios por m² o por unidad.',
  },
  {
    icon: '💳',
    title: 'Plan de Pagos',
    description: 'Crea planes de pago reutilizables (ej: 30%-30%-40%) para usar en todas tus cotizaciones. También puedes configurar uno manualmente al crear cada cotización.',
  },
  {
    icon: '📋',
    title: 'Cuenta de Cobro',
    description: 'Configura los datos de tu empresa, sube tu logo y firma digital, y define los términos que aparecerán en cada cuenta de cobro que generes.',
  },
  {
    icon: '🏗️',
    title: 'Estimación de Obra',
    description: 'Define precios por m² para obra negra, obra gris y acabados. También puedes crear estimaciones personalizadas (ej: primer piso, sótano).',
  },
  {
    icon: '📐',
    title: 'Crear Cotizaciones',
    description: 'El wizard de 5 pasos te guía: datos del cliente, dimensiones del terreno, volados, selección de servicios y resumen con plan de pagos.',
  },
  {
    icon: '📂',
    title: 'Historial y Gestión',
    description: 'Guarda, edita, clona versiones, registra pagos, genera cuentas de cobro y realiza estimaciones de obra desde el historial de cotizaciones.',
  },
  {
    icon: '🎉',
    title: '¡Listo para comenzar!',
    description: 'Ya conoces las funcionalidades principales. Comienza creando tu primera cotización o configura tus datos en el menú lateral. ¡Éxito en tus proyectos!',
  },
];

export function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const isFirst = currentStep === 0;
  const isLast = currentStep === tourSteps.length - 1;

  const next = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const prev = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const step = tourSteps[currentStep];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid rgba(182,148,98,0.2)',
          borderRadius: 20,
          padding: '32px 28px',
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
          {tourSteps.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === currentStep ? '#b69462' : 'rgba(255,255,255,0.15)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <div style={{ fontSize: 56, marginBottom: 16, lineHeight: 1 }}>{step.icon}</div>

        {/* Title */}
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#fff' }}>
          {step.title}
        </h2>

        {/* Description */}
        <p
          className="small"
          style={{
            color: '#aaa',
            lineHeight: 1.6,
            marginBottom: 28,
            fontSize: 14,
          }}
        >
          {step.description}
        </p>

        {/* Step counter */}
        <div style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>
          Paso {currentStep + 1} de {tourSteps.length}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {!isFirst && (
            <button className="btn btn-secondary" onClick={prev} style={{ flex: 1 }}>
              ← Anterior
            </button>
          )}
          <button className="btn" onClick={next} style={{ flex: 1 }}>
            {isLast ? '¡Comenzar!' : 'Siguiente →'}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onComplete}
            style={{
              marginTop: 16,
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Saltar tour
          </button>
        )}
      </div>
    </div>
  );
}
