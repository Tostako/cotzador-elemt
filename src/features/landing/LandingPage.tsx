import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, type ReactNode, type CSSProperties, type ComponentType } from 'react';
import { PencilRuler, Receipt, CreditCard, Calculator, Package, Grid3x3, Wallet, X } from 'lucide-react';
import logoGold from '../../assets/LOGO ABREVIADO/ELEMENThaus - Logo Abreviado Original 1.png';
import logoWhite from '../../assets/LOGO ABREVIADO/ELEMENThaus - Logo Abreviado White.png';
import logoPrincipal from '../../assets/LogoPrincipal.png';
import casaImage from '../../assets/casa.jpg';
import casa2Image from '../../assets/casa2.png';
import { useStore } from '../../shared/services/store';

const navLinks = [
  { label: 'Inicio', href: '#hero' },
  { label: 'Cómo funciona', href: '#proc' },
  { label: 'Funciones', href: '#features' },
  { label: 'Servicios', href: '#services' },
  { label: 'Contacto', href: '#cta' },
];

function reduceMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Reveal-on-scroll (defaults to once) */
function useReveal<T extends HTMLElement>(once = true) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);
  return { ref, visible };
}

/** Progress (0..1) of an element travelling through the viewport */
function useSectionProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height + vh * 0.6;
      const seen = vh * 0.8 - r.top;
      setProgress((prev) => {
        const next = Math.max(0, Math.min(seen / total, 1));
        // Evita re-render si el cambio es imperceptible (<0.5%)
        return Math.abs(next - prev) < 0.005 ? prev : next;
      });
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return { ref, progress };
}

function Reveal({
  children,
  delay = 0,
  y = 32,
  x = 0,
  style,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  style?: CSSProperties;
  className?: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal-dir ${className}`}
      style={{
        transform: visible ? 'none' : `translate3d(${x}px, ${y}px, 0)`,
        opacity: visible ? 1 : 0,
        transition: `transform .85s var(--ease-lp) ${delay}ms, opacity .85s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Bento cell with cursor-tracking gold glow */
function BentoCell({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <div ref={ref} className="lp-cell" style={style} onMouseMove={onMove}>
      {children}
    </div>
  );
}

/** Magnetic button built on the existing .btn styles */
function MagneticButton({
  children,
  onClick,
  ghost = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  ghost?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || reduceMotion()) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.25}px, ${y * 0.4}px)`;
  };
  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = '';
  };
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`btn ${ghost ? 'btn-ghost' : ''} lp-mag`}
      style={{ width: 'auto', padding: '17px 42px', fontSize: 17, transition: 'transform .25s var(--ease-lp), background-color .2s ease, box-shadow .25s ease, color .2s ease' }}
    >
      {children}
    </button>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [landingConfig, setLandingConfig] = useState<Record<string, any>>({});
  const [landingImages, setLandingImages] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      setScrollY(y);
      setScrolled(y > 40);
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docH > 0 ? Math.min(y / docH, 1) : 0);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { apiService, extractData } = await import('../../shared/services/api');
        const [configRes, imagesRes] = await Promise.all([
          apiService.getPublicSiteConfig().catch(() => null),
          apiService.getPublicLandingImages().catch(() => null),
        ]);
        if (cancelled) return;
        setLandingConfig(extractData(configRes) || {});
        setLandingImages(extractData(imagesRes) || []);
      } catch {
        /* defaults */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getConfig = (section: string, key: string, fallback: string) => {
    const sec = landingConfig[section];
    if (sec && typeof sec === 'object' && key in sec) return sec[key];
    return fallback;
  };
  const getImage = (type: string, fallback: string) => {
    const img = landingImages.find((i) => i.type === type && i.active);
    return img?.url || fallback;
  };
  const scrollTo = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const reduce = reduceMotion();
  const par = (f: number) => (reduce ? 0 : scrollY * f);
  const heroOpacity = reduce ? 1 : Math.max(1 - scrollY / 760, 0);

  // Fondo enlazado al scroll: grafito cálido (combina con el dorado) → negro profundo
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const bgStart = [26, 23, 20]; // #1a1714 grafito cálido
  const bgEnd = [5, 5, 6]; // #050506 negro profundo
  const t = reduce ? 1 : scrollProgress;
  const bgColor = `rgb(${lerp(bgStart[0], bgEnd[0], t)}, ${lerp(bgStart[1], bgEnd[1], t)}, ${lerp(bgStart[2], bgEnd[2], t)})`;

  const features: {
    icon: ComponentType<{ size?: number | string; strokeWidth?: number }>;
    title: string;
    desc: string;
    span: CSSProperties;
    big?: boolean;
  }[] = [
    { icon: PencilRuler, title: 'Cotización inteligente', desc: 'Asistente de 5 pasos: cliente, áreas, servicios y resumen, con cálculo automático de área y precio en vivo.', span: { gridColumn: 'span 3', gridRow: 'span 2' } as CSSProperties, big: true },
    { icon: Receipt, title: 'Cuentas de cobro', desc: 'Documentos formales con datos de empresa, representante, banco, firma, numeración y registro de pagos.', span: { gridColumn: 'span 3' } as CSSProperties },
    { icon: CreditCard, title: 'Planes de pago', desc: 'Planes por cuotas configurables, con abonos y estado de pago por cada cuenta de cobro.', span: { gridColumn: 'span 3' } as CSSProperties },
    { icon: Calculator, title: 'Estimación de obra', desc: 'Costo de construcción por m² —obra negra, gris y acabados— más tus propias estimaciones.', span: { gridColumn: 'span 2' } as CSSProperties },
    { icon: Package, title: 'Catálogo de materiales', desc: 'Materiales por categoría, precios por ferretería, mejor precio y listas de pedidos.', span: { gridColumn: 'span 2' } as CSSProperties },
    { icon: Grid3x3, title: 'Calculadora de enchapes', desc: 'Pisos y paredes por tramos, patrones de instalación, desperdicio y aprovechamiento de sobrantes.', span: { gridColumn: 'span 2' } as CSSProperties },
    { icon: Wallet, title: 'Tarifas configurables', desc: 'Define los precios de tus servicios y paquetes; el cotizador los aplica al instante.', span: { gridColumn: 'span 6' } as CSSProperties },
  ];

  const services = [
    { n: '01', t: 'Diseño Arquitectónico', d: 'Planos arquitectónicos completos con normativa local.' },
    { n: '02', t: 'Diseño Estructural', d: 'Cálculo de estructuras, cimentación y mampostería.' },
    { n: '03', t: 'Instalaciones Hidrosanitarias', d: 'Redes de agua, desagüe y sistemas sanitarios.' },
    { n: '04', t: 'Diseño Eléctrico', d: 'Planos eléctricos, iluminación y tableros.' },
    { n: '05', t: 'Renders 3D', d: 'Visualización fotorealista de tu proyecto.' },
    { n: '06', t: 'Recorrido 3D', d: 'Tour virtual interactivo para tus clientes.' },
    { n: '07', t: 'Presupuesto', d: 'Desglose detallado de costos de construcción.' },
    { n: '08', t: 'Licencias', d: 'Trámites de licencias de construcción.' },
  ];

  const steps = [
    { t: 'Elige el servicio', d: 'Selecciona entre 8 servicios de diseño o crea el tuyo propio.' },
    { t: 'Define áreas y medidas', d: 'Ingresa metros, niveles y parámetros; el área se calcula sola.' },
    { t: 'Ajusta precios', d: 'Aplica descuentos, adicionales y estimaciones de obra en vivo.' },
    { t: 'Genera la cotización', d: 'Documento profesional listo para enviar a tu cliente.' },
    { t: 'Emite la cuenta de cobro', d: 'Plan de pagos, firma y numeración automática.' },
  ];

  const proc = useSectionProgress<HTMLDivElement>();
  const activeStep = Math.min(steps.length - 1, Math.floor(proc.progress * steps.length));

  return (
    <div className="lp-root" style={{ minHeight: '100vh', opacity: ready ? 1 : 0, transition: 'opacity .7s ease' }}>
      <div className="lp-grain" />
      <div className="scroll-progress-bar" style={{ width: `${scrollProgress * 100}%` }} />

      {/* Nav */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src={getImage('logo_abbreviated', logoPrincipal)} alt="ELEMENThaus" style={{ height: 48, width: 'auto', cursor: 'pointer' }} onClick={() => scrollTo('#hero')} />
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
            {navLinks.map((l) => (
              <span key={l.href} className="landing-nav-link" onClick={() => scrollTo(l.href)}>{l.label}</span>
            ))}
            <button className="btn btn-small" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')} style={{ width: 'auto', padding: '10px 26px', marginLeft: 8 }}>
              {isAuthenticated ? 'Dashboard →' : 'Ingresar'}
            </button>
          </div>
          <button className="hamburger show-mobile" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
              <span className="hamburger-line" style={{ transform: menuOpen ? 'rotate(45deg) translateY(3.5px)' : undefined }} />
              <span className="hamburger-line" style={{ opacity: menuOpen ? 0 : 1, width: 14 }} />
              <span className="hamburger-line" style={{ transform: menuOpen ? 'rotate(-45deg) translateY(-3.5px)' : undefined }} />
            </div>
          </button>
        </div>
        {menuOpen && (
          <div className="lp-mobile-menu" role="dialog" aria-modal="true">
            <div className="lp-mm-top">
              <img src={getImage('logo_abbreviated', logoPrincipal)} alt="ELEMENThaus" style={{ height: 38, width: 'auto' }} />
              <button className="lp-mm-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
                <X size={22} />
              </button>
            </div>

            <nav className="lp-mm-links">
              {navLinks.map((l, i) => (
                <button
                  key={l.href}
                  className="lp-mm-link"
                  style={{ animationDelay: `${0.06 + i * 0.06}s` }}
                  onClick={() => scrollTo(l.href)}
                >
                  <span className="lp-mm-idx">0{i + 1}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </nav>

            <div className="lp-mm-foot">
              <button className="btn" style={{ width: '100%' }} onClick={() => { setMenuOpen(false); navigate(isAuthenticated ? '/dashboard' : '/login'); }}>
                {isAuthenticated ? 'Ir al Dashboard →' : 'Ingresar'}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section
        id="hero"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100vh', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden', padding: '120px 24px 90px' }}
      >
        <div style={{ position: 'absolute', inset: '-12% 0', backgroundImage: `url(${getImage('hero_bg', casaImage)})`, backgroundSize: 'cover', backgroundPosition: 'center', transform: `translate3d(0, ${par(0.3)}px, 0) scale(${1.06 + (reduce ? 0 : scrollY / 3200)})`, willChange: 'transform' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,7,7,0.5) 0%, rgba(7,7,7,0.72) 45%, rgba(7,7,7,0.97) 100%)' }} />
        <div className="lp-mesh" style={{ width: 520, height: 520, top: '-8%', left: '-6%', background: 'radial-gradient(circle, rgba(182,148,98,0.30), transparent 60%)' }} />
        <div className="lp-mesh" style={{ width: 440, height: 440, bottom: '-12%', right: '-5%', background: 'radial-gradient(circle, rgba(212,175,55,0.22), transparent 60%)', animationDelay: '-7s' }} />
        <div className="lp-ghost" style={{ bottom: '3%', transform: `translate3d(-50%, ${par(-0.05)}px, 0)` }}>ELEMENT</div>

        <div style={{ position: 'relative', zIndex: 2, transform: `translate3d(0, ${par(0.12)}px, 0)`, opacity: heroOpacity }}>
          <div className="animate-reveal-up" style={{ textAlign: 'center' }}>
            <img src={getImage('logo_main', logoGold)} alt="ELEMENThaus" style={{ display: 'block', margin: '0 auto', width: 'clamp(160px, 20vw, 260px)', height: 'auto', filter: 'drop-shadow(0 0 34px rgba(182,148,98,0.38))' }} />
          </div>
          <div className="animate-slide-up" style={{ marginTop: 36, display: 'flex', justifyContent: 'center' }}>
            <span className="lp-eyebrow" style={{ fontSize: 14, letterSpacing: '0.34em' }}>Construcción · Arquitectura · Ingeniería</span>
          </div>
          <p className="animate-slide-up" style={{ animationDelay: '0.15s', fontSize: 'clamp(1.2rem, 2.4vw, 1.65rem)', color: '#b3ac9d', maxWidth: 700, margin: '32px auto 0', lineHeight: 1.6 }}>
            {getConfig('hero', 'subtitle', 'Sistema integral para cotización de proyectos de construcción y arquitectura, con cuentas de cobro profesionales.')}
          </p>
          <div className="animate-reveal-up delay-3" style={{ display: 'flex', gap: 16, marginTop: 42, flexWrap: 'wrap', justifyContent: 'center' }}>
            <MagneticButton onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>{isAuthenticated ? 'Ir al Dashboard →' : 'Comenzar ahora →'}</MagneticButton>
            <MagneticButton ghost onClick={() => scrollTo('#features')}>Conocer más</MagneticButton>
          </div>
        </div>

      </section>

      {/* Espaciador para la portada fija */}
      <div aria-hidden="true" style={{ height: '100vh' }} />

      {/* Lámina de contenido que sube por encima de la portada al hacer scroll */}
      <div className="lp-content" style={{ backgroundColor: bgColor }}>

      {/* Objetivo + Proceso */}
      <section id="proc" ref={proc.ref} style={{ position: 'relative', padding: '104px 0 88px' }}>
        <div className="lp-wrap">
          <Reveal>
            <span className="lp-eyebrow">Cómo funciona</span>
            <h2 className="lp-display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', maxWidth: 840, marginTop: 18, color: '#f4efe6' }}>
              Cotiza como un estudio profesional, sin complicarte
            </h2>
            <p style={{ color: '#a59e90', maxWidth: 660, marginTop: 18, fontSize: 17, lineHeight: 1.7 }}>
              El objetivo de ELEMENT es reunir todo el proceso de cotización de proyectos de arquitectura y
              construcción en un solo lugar. Eliges el servicio, defines las medidas y la app calcula áreas y
              precios al instante; luego genera la cotización, la cuenta de cobro y el plan de pagos —{' '}
              <strong style={{ color: '#cabfa9', fontWeight: 600 }}>sin hojas de cálculo ni fórmulas manuales</strong>.
            </p>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 56, alignItems: 'start', marginTop: 56 }}>
            <Reveal>
              <h3 className="lp-display" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', color: '#f4efe6' }}>
                El proceso, paso a paso
              </h3>
              <p style={{ color: '#9b9486', maxWidth: 440, marginTop: 14, fontSize: 16, lineHeight: 1.6 }}>
                Un recorrido lineal, claro y rápido. En cinco pasos pasas de la idea a un documento
                profesional listo para enviar a tu cliente.
              </p>
              <div style={{ marginTop: 34 }}>
                <MagneticButton onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
                  {isAuthenticated ? 'Crear cotización →' : 'Probar gratis →'}
                </MagneticButton>
              </div>
            </Reveal>

            <div className="lp-time">
              <div className="lp-time-line" />
              <div className="lp-time-fill" style={{ height: `${proc.progress * 100}%` }} />
              {steps.map((st, i) => (
                <div key={i} className={`lp-time-step ${i <= activeStep ? 'on' : ''}`}>
                  <div className="lp-time-dot" />
                  <div className="lp-display" style={{ fontSize: 20, color: i <= activeStep ? '#f4efe6' : '#7c7568', transition: 'color .4s' }}>
                    {String(i + 1).padStart(2, '0')} · {st.t}
                  </div>
                  <p style={{ color: '#8c8578', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>{st.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features — bento */}
      <section id="features" style={{ position: 'relative', padding: '88px 0' }}>
        <div className="lp-wrap">
          <Reveal>
            <span className="lp-eyebrow">Funciones</span>
            <h2 className="lp-display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', maxWidth: 780, marginTop: 18, color: '#f4efe6' }}>
              {getConfig('features', 'title', 'Todo lo que necesitas para cotizar')}
            </h2>
            <p style={{ color: '#9b9486', maxWidth: 560, marginTop: 14, fontSize: 16, lineHeight: 1.6 }}>
              {getConfig('features', 'subtitle', 'Un sistema completo diseñado para profesionales de la construcción.')}
            </p>
          </Reveal>

          <div className="lp-bento" style={{ marginTop: 48 }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
              <Reveal key={i} delay={i * 70} style={f.span}>
                <BentoCell style={{ height: '100%', minHeight: f.big ? 330 : undefined }}>
                  {f.big && (
                    <img src={getImage('features', casa2Image)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18, zIndex: 0 }} />
                  )}
                  <div style={{ position: 'relative', zIndex: 1, color: '#b69462' }} className="lp-cell-icon"><Icon size={30} strokeWidth={1.75} /></div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="lp-cell-title">{f.title}</div>
                    <div className="lp-cell-desc">{f.desc}</div>
                  </div>
                </BentoCell>
              </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services — interactive list */}
      <section id="services" style={{ position: 'relative', padding: '88px 0' }}>
        <div className="lp-wrap">
          <Reveal>
            <span className="lp-eyebrow">Servicios</span>
            <h2 className="lp-display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', maxWidth: 780, marginTop: 18, color: '#f4efe6' }}>
              {getConfig('services', 'title', 'Ocho servicios, un solo flujo')}
            </h2>
            <p style={{ color: '#9b9486', maxWidth: 580, marginTop: 14, fontSize: 16, lineHeight: 1.6 }}>
              También puedes crear tus propios servicios personalizados desde el panel de configuración.
            </p>
          </Reveal>

          <div style={{ marginTop: 42 }}>
            {services.map((s, i) => (
              <Reveal key={i} delay={i * 45} y={18}>
                <div className="lp-srow">
                  <div className="lp-sn">{s.n}</div>
                  <div className="lp-st">{s.t}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 26, justifyContent: 'flex-end' }}>
                    <span className="lp-sd">{s.d}</span>
                    <span className="lp-arrow">→</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" style={{ position: 'relative', padding: '80px 24px 110px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div className="lp-cta" style={{ padding: 'clamp(40px, 7vw, 92px) clamp(28px, 5vw, 70px)', textAlign: 'center' }}>
              <img src={getImage('features', casa2Image)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 130%, rgba(182,148,98,0.38), transparent 60%)' }} />
              <div className="cta-glow" style={{ position: 'absolute', inset: 0, borderRadius: 32, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h2 className="lp-display" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', color: '#f7f2e8', maxWidth: 760, margin: '0 auto' }}>
                  {getConfig('cta', 'title', '¿Listo para cotizar mejor?')}
                </h2>
                <p style={{ color: '#cabfa9', maxWidth: 520, margin: '22px auto 0', fontSize: 17, lineHeight: 1.6 }}>
                  {getConfig('cta', 'subtitle', 'Únete a los profesionales que ya cotizan sus proyectos con ELEMENT.')}
                </p>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 38 }}>
                  <MagneticButton onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
                    {isAuthenticated ? 'Ir al Dashboard →' : 'Crear cuenta gratis'}
                  </MagneticButton>
                  <MagneticButton ghost onClick={() => navigate('/login')}>Iniciar sesión</MagneticButton>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '58px 24px 50px' }}>
        <div className="lp-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={logoWhite} alt="ELEMENThaus" style={{ height: 34, width: 'auto' }} />
            <span style={{ fontSize: 13, color: '#7c7568' }}>© 2026 ELEMENT. Todos los derechos reservados.</span>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {navLinks.map((l) => (
              <span key={l.href} className="landing-nav-link" style={{ fontSize: 13 }} onClick={() => scrollTo(l.href)}>{l.label}</span>
            ))}
          </div>
        </div>
      </footer>
      </div>{/* /lp-content */}
    </div>
  );
}
