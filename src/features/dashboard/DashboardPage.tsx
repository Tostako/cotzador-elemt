import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PencilRuler, History, Receipt, Building2,
  Wallet, CreditCard, User, Calculator, Package,
  TrendingUp, FileText, DraftingCompass, Frame, Grid3x3,
} from 'lucide-react';
import { useStore } from '../../shared/services/store';

import logoSinBaner from '../../assets/LOGO SIN BANER/ELEMENThaus - Transparent White.png';

export function DashboardPage() {
  const navigate = useNavigate();
  const { quotes, user } = useStore();
  const [showWelcome, setShowWelcome] = useState(() => {
    const hasSeenTour = localStorage.getItem('element_tour_seen');
    const isTourActive = localStorage.getItem('element_tour_active') === 'true';
    return !isTourActive && !hasSeenTour;
  });
  const [tourActive, setTourActive] = useState(() => {
    return localStorage.getItem('element_tour_active') === 'true';
  });



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

  const features = [
    { icon: PencilRuler, title: 'Nueva cotización', desc: 'Crea una cotización profesional', route: '/quote', accent: '#b69462', featured: true },
    { icon: DraftingCompass, title: 'Planos', desc: 'Diseña plantillas de casa', route: '/planos', accent: '#60a5fa', featured: true },
    { icon: FileText, title: 'Cotizaciones', desc: `${quotes.length} guardadas`, route: '/history', accent: '#34d399' },
    { icon: Grid3x3, title: 'Enchapes', desc: 'Pisos y paredes', route: '/calculadoras/enchapes', accent: '#f59e0b' },
    { icon: Frame, title: 'Barrederas', desc: 'Cálculo por perímetro', route: '/calculadoras/barrederas', accent: '#c084fc' },
    { icon: Package, title: 'Materiales', desc: 'Catálogo y pedidos', route: '/materiales', accent: '#f472b6' },
    { icon: Calculator, title: 'Estimaciones de obra', desc: 'Precios por m²', route: '/estimacion', accent: '#5e5ce6' },
    { icon: Wallet, title: 'Tarifas', desc: 'Servicios y paquetes', route: '/tarifas', accent: '#34c759' },
  ];

  const recentQuotes = quotes.slice(0, 3);

  // ── Métricas del negocio ──
  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
  const totalValue = quotes.reduce((sum, q) => sum + (Number(q.price) || 0), 0);
  const avgValue = quotes.length ? totalValue / quotes.length : 0;
  const now = new Date();
  const thisMonthCount = quotes.filter((q) => {
    const d = new Date(`${q.date}T00:00:00`);
    return !isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const metrics = [
    { icon: TrendingUp, value: money(totalValue), label: 'Valor total cotizado' },
    { icon: FileText, value: String(quotes.length), label: 'Cotizaciones' },
    { icon: Calculator, value: money(avgValue), label: 'Promedio por cotización' },
    { icon: History, value: String(thisMonthCount), label: 'Cotizado este mes' },
  ];

  return (
    <main>
      {/* Welcome Modal */}
      {showWelcome && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal modal-welcome">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Building2 size={52} color="#b69462" strokeWidth={1.5} /></div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
              ¡Bienvenido a ELEMENT Cotizador!
            </h2>
            <p style={{ fontSize: 15, color: '#aaa', lineHeight: 1.6, marginBottom: 28 }}>
              Antes de crear tu primera cotización, te recomendamos configurar tu cuenta.
              Te guiaremos por 5 zonas clave para que todo quede listo.
            </p>

            <div style={{ display: 'grid', gap: 10, marginBottom: 24, textAlign: 'left' }}>
              <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Wallet size={22} color="#b69462" />
                <div>
                  <div style={{ fontWeight: 600 }}>Tarifas</div>
                  <div className="small" style={{ color: '#999' }}>Precios de servicios y paquetes</div>
                </div>
              </div>
              <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <CreditCard size={22} color="#b69462" />
                <div>
                  <div style={{ fontWeight: 600 }}>Plan de Pagos</div>
                  <div className="small" style={{ color: '#999' }}>Define cómo te pagan</div>
                </div>
              </div>
              <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Receipt size={22} color="#b69462" />
                <div>
                  <div style={{ fontWeight: 600 }}>Cuenta de Cobro</div>
                  <div className="small" style={{ color: '#999' }}>Términos y numeración</div>
                </div>
              </div>
              <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Calculator size={22} color="#b69462" />
                <div>
                  <div style={{ fontWeight: 600 }}>Estimación de Obra</div>
                  <div className="small" style={{ color: '#999' }}>Precios por m² y estimaciones personalizadas</div>
                </div>
              </div>
              <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <User size={22} color="#b69462" />
                <div>
                  <div style={{ fontWeight: 600 }}>Perfil</div>
                  <div className="small" style={{ color: '#999' }}>Logo y firma digital</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={skipWelcome} style={{ flex: 1 }}>
                Saltar
              </button>
              <button type="button" className="btn" onClick={startConfig} style={{ flex: 1 }}>
                Configurar mi cuenta →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tour Final Message */}
      {tourActive && !showWelcome && (
        <div className="tour-final-msg" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#b69462', marginBottom: 4 }}>
              🎉 ¡Configuración completada!
            </h3>
            <p className="small" style={{ color: '#ccc' }}>
              Tu cuenta está lista. Ya puedes crear tu primera cotización profesional.
            </p>
          </div>
          <button type="button" className="btn" onClick={() => navigate('/quote')}>
            Crear cotización →
          </button>
        </div>
      )}

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-glow" />
        <img src={logoSinBaner} alt="" className="home-hero-logo" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="home-eyebrow">ELEMENThaus · Cotizador</span>
          <h1 className="home-title">Hola {user?.name?.trim() || 'Usuario'} 👋</h1>
          <p className="home-sub">Tu estudio para cotizar, calcular materiales y cerrar proyectos, todo en un solo lugar.</p>
          <div className="home-cta-row">
            <button type="button" className="home-cta" onClick={() => navigate('/quote')}><PencilRuler size={18} /> Nueva cotización</button>
            <button type="button" className="home-cta ghost" onClick={() => navigate('/history')}><FileText size={17} /> Ver cotizaciones</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="home-stats">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="home-stat">
              <span className="home-stat-ic"><Icon size={20} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="home-stat-val">{m.value}</div>
                <div className="home-stat-lbl">{m.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explora — accesos rápidos (bento) */}
      <div className="home-section-head"><h2>Explora</h2></div>
      <div className="bento">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <button
              type="button"
              key={f.title}
              className={`bento-tile${f.featured ? ' lg' : ''}`}
              onClick={() => navigate(f.route)}
              style={{ ['--accent' as string]: f.accent } as CSSProperties}
            >
              <span className="bento-ic"><Icon size={f.featured ? 26 : 22} strokeWidth={1.9} /></span>
              <span className="bento-txt">
                <span className="bento-title">{f.title}</span>
                <span className="bento-desc">{f.desc}</span>
              </span>
              <span className="bento-arrow">→</span>
            </button>
          );
        })}
      </div>

      {/* Recent Activity */}
      {recentQuotes.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Cotizaciones Recientes</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {recentQuotes.map((quote) => (
              <button
                type="button"
                key={quote.id}
                className="card"
                onClick={() => navigate('/history')}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit' }}
              >
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>{quote.client}</h3>
                  <p className="small">{quote.project}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, color: '#b69462' }}>
                    ${Number(quote.price).toLocaleString('es-CO')}
                  </span>
                  <p className="small">{quote.date}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .home-hero{position:relative;overflow:hidden;border-radius:22px;padding:38px 32px;margin-bottom:22px;
          background:linear-gradient(135deg, rgba(182,148,98,0.18), rgba(255,255,255,0.02) 62%);
          border:1px solid rgba(255,255,255,0.09);}
        .home-hero-glow{position:absolute;top:-130px;right:-90px;width:380px;height:380px;border-radius:50%;
          background:radial-gradient(circle, rgba(182,148,98,0.38), transparent 70%);filter:blur(24px);pointer-events:none;}
        .home-hero-logo{position:absolute;right:20px;bottom:-14px;width:160px;height:auto;opacity:0.12;pointer-events:none;user-select:none;}
        .home-eyebrow{font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#b69462;font-weight:700;}
        .home-title{font-size:clamp(1.9rem,4vw,2.8rem);font-weight:800;margin:10px 0 6px;line-height:1.05;}
        .home-sub{color:#b8b0a2;font-size:15px;margin-bottom:24px;max-width:520px;line-height:1.55;}
        .home-cta-row{display:flex;gap:12px;flex-wrap:wrap;}
        .home-cta{display:inline-flex;align-items:center;gap:8px;border:none;cursor:pointer;font:inherit;font-weight:700;
          padding:12px 20px;border-radius:12px;background:#b69462;color:#1a1712;
          transition:transform .15s ease, box-shadow .15s ease;box-shadow:0 6px 20px rgba(182,148,98,0.28);}
        .home-cta:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(182,148,98,0.4);}
        .home-cta.ghost{background:rgba(255,255,255,0.06);color:#f4efe6;box-shadow:none;border:1px solid rgba(255,255,255,0.12);}
        .home-cta.ghost:hover{background:rgba(255,255,255,0.1);transform:translateY(-2px);}
        .home-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:32px;}
        .home-stat{display:flex;align-items:center;gap:12px;padding:16px;border-radius:14px;
          background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);}
        .home-stat-ic{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:11px;
          background:rgba(182,148,98,0.14);color:#b69462;flex-shrink:0;}
        .home-stat-val{font-size:20px;font-weight:800;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .home-stat-lbl{font-size:12.5px;color:#8c8578;}
        .home-section-head{display:flex;align-items:center;justify-content:space-between;margin:4px 0 14px;}
        .home-section-head h2{font-size:20px;font-weight:700;}
        .bento{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:36px;}
        .bento-tile{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;text-align:left;cursor:pointer;font:inherit;color:inherit;
          padding:18px;border-radius:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);
          transition:transform .16s ease, border-color .16s ease, background .16s ease;}
        .bento-tile:hover{transform:translateY(-4px);border-color:color-mix(in srgb, var(--accent) 55%, transparent);background:rgba(255,255,255,0.05);}
        .bento-tile.lg{grid-column:span 2;padding:22px;}
        .bento-ic{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:13px;flex-shrink:0;
          background:color-mix(in srgb, var(--accent) 16%, transparent);color:var(--accent);}
        .bento-tile.lg .bento-ic{width:54px;height:54px;}
        .bento-txt{display:flex;flex-direction:column;min-width:0;}
        .bento-title{font-weight:700;font-size:15px;}
        .bento-tile.lg .bento-title{font-size:18px;}
        .bento-desc{font-size:12.5px;color:#8c8578;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .bento-arrow{margin-left:auto;color:var(--accent);opacity:0;transform:translateX(-6px);transition:all .16s ease;font-size:18px;font-weight:700;flex-shrink:0;}
        .bento-tile:hover .bento-arrow{opacity:1;transform:translateX(0);}
        @media (max-width:900px){.bento{grid-template-columns:repeat(2,1fr);} .bento-tile.lg{grid-column:span 2;}}
        @media (max-width:560px){.bento{grid-template-columns:1fr;} .bento-tile.lg{grid-column:span 1;}}
      `}</style>
    </main>
  );
}
