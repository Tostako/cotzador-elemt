import { useNavigate } from 'react-router-dom';
import {
  endTour,
  setTourStep,
  getCurrentTourStep,
  tourSteps,
} from '../utils/tour';

export function TourBanner() {
  const navigate = useNavigate();
  const current = getCurrentTourStep();
  if (!current) return null;

  const currentIndex = tourSteps.findIndex((s) => s.step === current.step);
  const isLast = currentIndex === tourSteps.length - 1;

  const next = () => {
    if (isLast) {
      endTour();
      navigate('/dashboard');
    } else {
      const nextStep = tourSteps[currentIndex + 1];
      setTourStep(nextStep.step);
      navigate(nextStep.route);
    }
  };

  const skip = () => {
    endTour();
  };

  return (
    <>
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.97) 100%)',
        borderTop: '2px solid #b69462',
        padding: '16px 20px',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {tourSteps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= currentIndex ? '#b69462' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        <div className="flex-between" style={{ alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#b69462', marginBottom: 6 }}>
              {current.title}
            </h4>
            <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.5, margin: 0 }}>
              {current.description}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-small" onClick={next}>
              {isLast ? '¡Finalizar!' : 'Siguiente zona →'}
            </button>
            <button
              onClick={skip}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Omitir tour
            </button>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#444', marginTop: 8, textAlign: 'right' }}>
          Zona {currentIndex + 1} de {tourSteps.length}
        </div>
      </div>
    </div>
    {/* Spacer so content doesn't get hidden behind the fixed banner */}
    <div style={{ height: 160 }} />
    </>
  );
}
