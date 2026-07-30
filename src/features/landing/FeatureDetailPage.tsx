import { useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useStore } from '../../shared/services/store';
import { landingFeatures, getFeatureBySlug } from './featuresData';
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from '../../shared/components/SocialIcons';
import logoWhite from '../../assets/LOGO ABREVIADO/ELEMENThaus - Logo Abreviado White.png';

/** Detalle de una función de la landing: título, explicación a fondo y la
 *  imagen del carrusel. La imagen lleva el mismo view-transition-name que la
 *  tarjeta de origen, así que se transforma de una a otra al navegar. */
export function FeatureDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const feature = getFeatureBySlug(slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Slug inventado en la URL → de vuelta a la landing en vez de romper.
  if (!feature) return <Navigate to="/" replace />;

  const others = landingFeatures.filter((f) => f.slug !== feature.slug);

  const goBackToFeatures = () => {
    navigate('/#features', { viewTransition: true });
  };

  return (
    <div className="fd-root">
      <header className="fd-nav">
        <button type="button" className="fd-back" onClick={goBackToFeatures}>
          <ArrowLeft size={17} /> Volver a funciones
        </button>
        <button type="button" className="btn btn-small" style={{ width: 'auto', padding: '9px 22px' }} onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
          {isAuthenticated ? 'Dashboard →' : 'Ingresar'}
        </button>
      </header>

      <main className="fd-main">
        <div className="fd-head">
          <span className="lp-eyebrow">Funciones</span>
          <h1 className="fd-title">{feature.title}</h1>
          <p className="fd-intro">{feature.intro}</p>
        </div>

        <figure className="fd-figure">
          <img src={feature.img} alt={feature.title} />
        </figure>

        <div className="fd-body">
          <div className="fd-text">
            {feature.body.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <aside className="fd-aside">
            <h2 className="fd-aside-title">Qué resuelve</h2>
            <ul className="fd-list">
              {feature.bullets.map((b) => (
                <li key={b}><Check size={16} strokeWidth={2.4} /><span>{b}</span></li>
              ))}
            </ul>
            <button type="button" className="btn" style={{ width: '100%', marginTop: 26 }} onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
              {isAuthenticated ? 'Ir al Dashboard →' : 'Probar gratis →'}
            </button>
          </aside>
        </div>

        <nav className="fd-others">
          <h2 className="fd-others-title">Otras funciones</h2>
          <div className="fd-others-grid">
            {others.map((f) => (
              <button key={f.slug} type="button" className="fd-other" onClick={() => navigate(`/funciones/${f.slug}`, { viewTransition: true })}>
                <img src={f.img} alt="" loading="lazy" />
                <span className="fd-other-scrim" />
                <span className="fd-other-label">{f.title}</span>
              </button>
            ))}
          </div>
        </nav>
      </main>

      <footer className="fd-foot">
        <img src={logoWhite} alt="ELEMENThaus" style={{ height: 30, width: 'auto' }} />
        <span>© 2026 ELEMENT. Todos los derechos reservados.</span>
        <div className="fd-foot-social">
          <a href="https://web.facebook.com/ARQ.RECINTO?locale=es_LA" target="_blank" rel="noopener noreferrer" aria-label="Facebook de ELEMENThaus"><FacebookIcon size={16} /></a>
          <a href="https://www.instagram.com/element.haus/" target="_blank" rel="noopener noreferrer" aria-label="Instagram de ELEMENThaus"><InstagramIcon size={16} /></a>
          <a href="https://wa.me/573184575744" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp +57 318 4575744" title="+57 318 4575744"><WhatsAppIcon size={16} /></a>
          <a href="https://wa.me/573157541417" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp +57 315 7541417" title="+57 315 7541417"><WhatsAppIcon size={16} /></a>
        </div>
      </footer>

      <style>{`
        .fd-root{min-height:100vh;background:#050505;color:#f4efe6;}
        .fd-nav{
          position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;
          gap:16px;padding:14px clamp(18px,4vw,44px);
          background:rgba(8,7,7,0.72);border-bottom:1px solid rgba(255,255,255,0.07);
          backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);
        }
        .fd-back{
          display:inline-flex;align-items:center;gap:8px;background:none;border:none;cursor:pointer;
          color:#c8c0b1;font:inherit;font-size:14px;padding:8px 4px;transition:color .2s ease;
        }
        .fd-back:hover{color:#b69462;}
        .fd-main{max-width:1080px;margin:0 auto;padding:clamp(38px,6vw,72px) clamp(20px,4vw,32px) 90px;}
        .fd-head{max-width:760px;}
        .fd-title{
          font-family:'Manrope',sans-serif;font-weight:800;letter-spacing:-0.02em;line-height:1.05;
          font-size:clamp(2.3rem,6vw,3.8rem);color:#f7f2e8;margin:14px 0 0;
        }
        .fd-intro{color:#a59e90;font-size:clamp(1.02rem,1.6vw,1.2rem);line-height:1.65;margin:18px 0 0;}
        .fd-figure{
          margin:clamp(30px,5vw,48px) 0 0;border-radius:28px;overflow:hidden;background:#111;
          border:1px solid rgba(255,255,255,0.08);box-shadow:0 24px 60px rgba(0,0,0,0.5);
        }
        .fd-figure img{display:block;width:100%;height:auto;}
        .fd-body{
          display:grid;grid-template-columns:minmax(0,1.55fr) minmax(260px,1fr);
          gap:clamp(28px,5vw,56px);margin-top:clamp(34px,5vw,56px);align-items:start;
        }
        .fd-text p{color:#c0b8a9;font-size:16.5px;line-height:1.8;margin:0 0 20px;}
        .fd-text p:last-child{margin-bottom:0;}
        .fd-aside{
          position:sticky;top:86px;padding:28px 26px;border-radius:22px;
          background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01) 55%, rgba(0,0,0,0.1)), rgba(14,13,12,0.5);
          border:1px solid rgba(255,255,255,0.09);
        }
        .fd-aside-title{font-family:'Manrope',sans-serif;font-weight:800;font-size:1.05rem;color:#f7f2e8;margin:0 0 16px;}
        .fd-list{list-style:none;margin:0;padding:0;display:grid;gap:13px;}
        .fd-list li{display:grid;grid-template-columns:20px 1fr;gap:11px;align-items:start;color:#b8b0a1;font-size:14.5px;line-height:1.55;}
        .fd-list svg{color:#b69462;margin-top:2px;}
        .fd-others{margin-top:clamp(56px,8vw,96px);border-top:1px solid rgba(255,255,255,0.08);padding-top:40px;}
        .fd-others-title{font-family:'Manrope',sans-serif;font-weight:800;font-size:1.3rem;color:#f7f2e8;margin:0 0 22px;}
        .fd-others-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;}
        .fd-other{
          position:relative;display:block;padding:0;border:1px solid rgba(255,255,255,0.09);
          border-radius:18px;overflow:hidden;cursor:pointer;background:#111;aspect-ratio:16/10;
          transition:transform .3s var(--ease-lp), border-color .3s ease;
        }
        .fd-other:hover{transform:translateY(-4px);border-color:rgba(182,148,98,0.35);}
        .fd-other img{width:100%;height:100%;object-fit:cover;display:block;}
        .fd-other-scrim{position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.86) 100%);}
        .fd-other-label{
          position:absolute;left:16px;right:16px;bottom:14px;text-align:left;
          font-family:'Manrope',sans-serif;font-weight:700;font-size:15px;color:#f4efe6;
        }
        .fd-foot{
          display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;
          border-top:1px solid rgba(255,255,255,0.08);padding:34px 24px 40px;color:#7c7568;font-size:13px;
        }
        .fd-foot-social{display:flex;gap:9px;}
        .fd-foot-social a{
          display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;
          border-radius:50%;color:#c8c0b1;border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.03);transition:color .2s ease, border-color .2s ease, background .2s ease;
        }
        .fd-foot-social a:hover{color:#0d0c0b;background:#e9dcc2;border-color:#e9dcc2;}
        @media (max-width:820px){
          .fd-body{grid-template-columns:1fr;}
          .fd-aside{position:static;}
        }
        /* Fundido de página completa: se siente como una aparición, no como un salto
           (el morph de un elemento compartido cambiaba de tamaño/posición de golpe). */
        ::view-transition-old(root),
        ::view-transition-new(root){
          animation-duration:.42s;
          animation-timing-function:ease-out;
        }
        @media (prefers-reduced-motion: reduce){
          ::view-transition-group(*),
          ::view-transition-old(*),
          ::view-transition-new(*){animation:none !important;}
        }
      `}</style>
    </div>
  );
}
