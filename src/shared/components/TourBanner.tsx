import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  endTour,
  setTourStep,
  getCurrentTourStep,
  tourSteps,
} from '../utils/tour';

export function TourBanner() {
  const navigate = useNavigate();
  const current = getCurrentTourStep();
  const [isMobile, setIsMobile] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile && current) {
      setShowIntro(true);
    } else {
      setShowIntro(false);
    }
  }, [isMobile, current]);

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
      setShowIntro(true);
      navigate(nextStep.route);
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      const prevStep = tourSteps[currentIndex - 1];
      setTourStep(prevStep.step);
      setShowIntro(true);
      navigate(prevStep.route);
    }
  };

  const skip = () => {
    endTour();
  };

  const enterZone = () => {
    setShowIntro(false);
  };

  // Mobile intro modal
  if (isMobile && showIntro) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            background: '#0f0f0f',
            border: '1px solid rgba(182,148,98,0.25)',
            borderRadius: 24,
            padding: '36px 28px',
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
          }}
        >
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
            {tourSteps.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i <= currentIndex ? '#b69462' : 'rgba(255,255,255,0.15)',
                  transition: 'background 0.3s ease',
                }}
              />
            ))}
          </div>

          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#b69462', marginBottom: 12 }}>
            {current.title}
          </h3>
          <p style={{ fontSize: 15, color: '#ccc', lineHeight: 1.6, marginBottom: 32 }}>
            {current.description}
          </p>

          <button className="btn" style={{ width: '100%', marginBottom: 12 }} onClick={enterZone}>
            Entrar a configurar
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            {currentIndex > 0 && (
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={prev}>
                ← Anterior
              </button>
            )}
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={skip}
            >
              Omitir tour
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#444', marginTop: 16 }}>
            Zona {currentIndex + 1} de {tourSteps.length}
          </p>
        </div>
      </div>
    );
  }

  // Desktop banner (or mobile after entering zone)
  return (
    <>
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: isMobile ? 'rgba(10,10,10,0.95)' : 'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.97) 100%)',
        borderTop: isMobile ? '1px solid rgba(182,148,98,0.3)' : '2px solid #b69462',
        padding: isMobile ? '10px 16px' : '16px 20px',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Progress - hidden on mobile after entering zone */}
        {!isMobile && (
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
        )}

        {/* Mobile compact: only prev/next buttons */}
        {isMobile ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {currentIndex > 0 && (
              <button className="btn btn-small btn-secondary" style={{ flex: 1 }} onClick={prev}>
                ← Anterior
              </button>
            )}
            <button className="btn btn-small" style={{ flex: 1 }} onClick={next}>
              {isLast ? '¡Finalizar!' : 'Siguiente →'}
            </button>
            <button
              onClick={skip}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                fontSize: 12,
                cursor: 'pointer',
                padding: '8px 4px',
              }}
            >
              Omitir
            </button>
          </div>
        ) : (
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
        )}

        {!isMobile && (
          <div style={{ fontSize: 11, color: '#444', marginTop: 8, textAlign: 'right' }}>
            Zona {currentIndex + 1} de {tourSteps.length}
          </div>
        )}
      </div>
    </div>
    {/* Spacer so content doesn't get hidden behind the fixed banner */}
    <div style={{ height: isMobile ? 80 : 160 }} />
    </>
  );
}
