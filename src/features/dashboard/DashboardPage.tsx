import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../shared/services/store';

import logoSinBaner from '../../assets/LOGO SIN BANER/ELEMENThaus - Transparent White.png';

export function DashboardPage() {
  const navigate = useNavigate();
  const { quotes, config, user } = useStore();
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  // Detect first time
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('element_tour_seen');
    const isTourActive = localStorage.getItem('element_tour_active') === 'true';
    
    if (isTourActive) {
      setTourActive(true);
    } else if (!hasSeenTour) {
      setShowWelcome(true);
    }
  }, []);



  const startConfig = () => {
    localStorage.setItem('element_tour_active', 'true');
    localStorage.setItem('element_tour_step', '1');
    setShowWelcome(false);
    setTourActive(true);
    navigate('/tarifas');
  };

  const skipWelcome = () => {
    localStorage.setItem('element_tour_seen', 'true');
    setShowWelcome(false);
  };

  const quickActions = [
    { icon: '📐', title: 'Nueva Cotización', desc: 'Crear cotización profesional', color: '#b69462', route: '/quote' },
    { icon: '⚙️', title: 'Ajustes', desc: 'Configurar tarifas y pagos', color: '#999', route: '/settings' },
    { icon: '📂', title: 'Historial', desc: `${quotes.length} cotizaciones guardadas`, color: '#34c759', route: '/history' },
    { icon: '📋', title: 'Cuenta de Cobro', desc: 'Generar factura profesional', color: '#ff9500', route: '/history' },
  ];

  const recentQuotes = quotes.slice(0, 3);

  return (
    <main>
      {/* Welcome Modal */}
      {showWelcome && (
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
              padding: '40px 32px',
              maxWidth: 460,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏗️</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
              ¡Bienvenido a ELEMENT Cotizador!
            </h2>
            <p style={{ fontSize: 15, color: '#aaa', lineHeight: 1.6, marginBottom: 28 }}>
              Antes de crear tu primera cotización, te recomendamos configurar tu cuenta. 
              Te guiaremos por 4 zonas clave para que todo quede listo.
            </p>

            <div style={{ display: 'grid', gap: 10, marginBottom: 24, textAlign: 'left' }}>
              <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>💰</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Tarifas</div>
                  <div className="small" style={{ color: '#999' }}>Precios de servicios y paquetes</div>
                </div>
              </div>
              <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>💳</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Plan de Pagos</div>
                  <div className="small" style={{ color: '#999' }}>Define cómo te pagan</div>
                </div>
              </div>
              <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>📋</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Cuenta de Cobro</div>
                  <div className="small" style={{ color: '#999' }}>Logo, firma y datos de tu empresa</div>
                </div>
              </div>
              <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>🏗️</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Estimación de Obra</div>
                  <div className="small" style={{ color: '#999' }}>Precios por m² y estimaciones personalizadas</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={skipWelcome} style={{ flex: 1 }}>
                Saltar
              </button>
              <button className="btn" onClick={startConfig} style={{ flex: 1 }}>
                Configurar mi cuenta →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tour Final Message */}
      {tourActive && !showWelcome && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(182,148,98,0.15) 0%, rgba(182,148,98,0.05) 100%)',
            border: '1px solid rgba(182,148,98,0.3)',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#b69462', marginBottom: 4 }}>
              🎉 ¡Configuración completada!
            </h3>
            <p className="small" style={{ color: '#ccc' }}>
              Tu cuenta está lista. Ya puedes crear tu primera cotización profesional.
            </p>
          </div>
          <button className="btn" onClick={() => navigate('/quote')}>
            Crear cotización →
          </button>
        </div>
      )}

      {/* Header with logo */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 32,
        paddingBottom: 24,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, marginBottom: 8 }}>
            Hola {user?.name?.trim() || 'Usuario'} 👋
          </h1>
          <p className="small" style={{ fontSize: 16 }}>
            Bienvenido a ELEMENThaus Cotizador
          </p>
        </div>
        <img 
          src={logoSinBaner} 
          alt="ELEMENThaus" 
          style={{ 
            width: 120, 
            height: 'auto',
            opacity: 0.7,
          }} 
        />
      </div>

      {/* Quick Actions Grid */}
      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', marginBottom: 40 }}>
        {quickActions.map((action, i) => (
          <div
            key={i}
            className="feature-card"
            onClick={() => navigate(action.route)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>{action.icon}</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{action.title}</h3>
            <p className="small">{action.desc}</p>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                background: action.color,
                opacity: 0.5,
              }}
            />
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      {recentQuotes.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Cotizaciones Recientes</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {recentQuotes.map((quote) => (
              <div
                key={quote.id}
                className="card"
                onClick={() => navigate('/history')}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>{quote.client}</h3>
                  <p className="small">{quote.project}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, color: '#b69462' }}>
                    ${quote.price.toLocaleString('es-CO')}
                  </span>
                  <p className="small">{quote.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-number">{quotes.length}</div>
          <p className="small">Cotizaciones</p>
        </div>
        <div className="stat-card">
          <div className="stat-number">{Object.keys(config.services).length || 8}</div>
          <p className="small">Servicios</p>
        </div>
        <div className="stat-card">
          <div className="stat-number">{config.paymentPlan.payments.length}</div>
          <p className="small">Pagos Configurados</p>
        </div>
      </div>
    </main>
  );
}
