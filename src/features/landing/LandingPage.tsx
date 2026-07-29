import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { Calculator, X, DraftingCompass, Frame, Droplet, Zap, Camera, Video, FileCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import logoGold from '../../assets/LOGO ABREVIADO/ELEMENThaus - Logo Abreviado Original 1.png';
import logoWhite from '../../assets/LOGO ABREVIADO/ELEMENThaus - Logo Abreviado White.png';
import logoPrincipal from '../../assets/LogoPrincipal.png';
import casaRelleno1 from '../../assets/casa_relleno1.webp';
import { useStore } from '../../shared/services/store';
import { ScrollSequence } from './ScrollSequence';

// Secuencia de la portada (ordenada por nombre: frame_01..frame_64), en WebP.
const portadaMap = import.meta.glob('../../assets/portada_webp/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const portadaFrames = Object.keys(portadaMap).sort().map((k) => portadaMap[k]);

// Imágenes del carrusel de Funciones. Se importan una por una (y no con un glob)
// porque los nombres no ordenan solos: "CARUSELL5" en mayúsculas quedaría primero.
import carrusel1 from '../../assets/interior_webp/carrusell1.webp';
import carrusel2 from '../../assets/interior_webp/carrusell2.webp';
import carrusel3 from '../../assets/interior_webp/carrusell3.webp';
import carrusel4 from '../../assets/interior_webp/carrusell4.webp';
import carrusel5 from '../../assets/interior_webp/CARUSELL5.webp';
const carruselImgs = [carrusel1, carrusel2, carrusel3, carrusel4, carrusel5];

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

/** Reveal-on-scroll (once) */
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
      style={{ width: 'auto', padding: '16px 38px', fontSize: 16, transition: 'transform .25s var(--ease-lp), background-color .2s ease, box-shadow .25s ease, color .2s ease' }}
    >
      {children}
    </button>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 40);
  const [menuOpen, setMenuOpen] = useState(false);
  const [landingConfig, setLandingConfig] = useState<Record<string, any>>({});
  const [landingImages, setLandingImages] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  // En móvil no montamos las secuencias por scroll (64 imágenes) para no saturar memoria/CPU.
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);

  const progressRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const heroOverlayRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setIsMobile(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  // Bloquea el scroll del body mientras el menú móvil está abierto.
  // Sin esto, en Safari/Chrome de iOS el body sigue haciendo scroll detrás
  // del overlay fixed y el menú "pierde" su fondo (bug clásico de iOS).
  useEffect(() => {
    if (!menuOpen) return;
    const scrollY = window.scrollY;
    const { body } = document;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen]);

  // Barra de progreso + color de fondo (todo por refs, sin re-render por frame).
  useEffect(() => {
    const reduce = reduceMotion();
    const bgStart = [26, 23, 20];
    const bgEnd = [5, 5, 6];
    const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const sp = docH > 0 ? Math.min(y / docH, 1) : 0;
      const s = y > 40;
      setScrolled((prev) => (prev === s ? prev : s));
      if (progressRef.current) progressRef.current.style.width = `${sp * 100}%`;
      const t = reduce ? 1 : sp;
      if (contentRef.current) {
        contentRef.current.style.backgroundColor = `rgb(${lerp(bgStart[0], bgEnd[0], t)}, ${lerp(bgStart[1], bgEnd[1], t)}, ${lerp(bgStart[2], bgEnd[2], t)})`;
      }
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

  // Las 5 funciones más importantes, cada una con su imagen del carrusel (en orden 1..5).
  const featuresCarousel = [
    { title: 'Planos de casa', desc: 'Dibuja la vivienda por niveles y habitaciones en un editor CAD; de ahí salen todos los cálculos.' },
    { title: 'Cotización inteligente', desc: 'Asistente de 5 pasos con cálculo automático de área y precio en vivo.' },
    { title: 'Enchapes y barrederas', desc: 'Pisos, paredes y perímetros por tramos, con desperdicio y número de piezas.' },
    { title: 'Estimación de obra', desc: 'Costo de construcción por m²: obra negra, gris y acabados.' },
    { title: 'Cuentas de cobro', desc: 'Documentos formales con firma, numeración, plan de pagos y registro de abonos.' },
  ].map((f, i) => ({ ...f, img: carruselImgs[i] }));

  const services = [
    { icon: DraftingCompass, t: 'Diseño Arquitectónico', d: 'Planos arquitectónicos completos con normativa local.' },
    { icon: Frame, t: 'Diseño Estructural', d: 'Cálculo de estructuras, cimentación y mampostería.' },
    { icon: Droplet, t: 'Instalaciones Hidrosanitarias', d: 'Redes de agua, desagüe y sistemas sanitarios.' },
    { icon: Zap, t: 'Diseño Eléctrico', d: 'Planos eléctricos, iluminación y tableros.' },
    { icon: Camera, t: 'Renders 3D', d: 'Visualización fotorealista de tu proyecto.' },
    { icon: Video, t: 'Recorrido 3D', d: 'Tour virtual interactivo para tus clientes.' },
    { icon: Calculator, t: 'Presupuesto de obra', d: 'Desglose detallado de costos de construcción.' },
    { icon: FileCheck, t: 'Licencias', d: 'Trámites de licencias de construcción.' },
  ];

  const steps = [
    { t: 'Diseña el plano', d: 'Dibuja la vivienda por niveles y habitaciones en el editor; el área y el perímetro se calculan solos.' },
    { t: 'Calcula materiales', d: 'Enchapes, barrederas y catálogo salen del mismo plano, con desperdicio y número de piezas.' },
    { t: 'Cotiza el proyecto', d: 'Elige servicios, aplica tarifas y estimaciones de obra con precio en vivo.' },
    { t: 'Genera la cuenta de cobro', d: 'Documento formal con firma, numeración y datos de la empresa.' },
    { t: 'Controla los pagos', d: 'Plan por cuotas, registro de abonos y estado de cada cobro.' },
  ];

  const proc = useSectionProgress<HTMLDivElement>();
  const activeStep = Math.min(steps.length - 1, Math.floor(proc.progress * steps.length));

  // Portada: el hero se desvanece a medida que avanza la secuencia
  const heroProgress = (p: number) => {
    const el = heroOverlayRef.current;
    if (!el) return;
    el.style.opacity = String(Math.max(1 - p * 2.4, 0));
    el.style.transform = `translateY(${p * -36}px)`;
  };

  const scrollCarousel = (dir: 1 | -1) => {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.querySelector('.lp-carousel-card') as HTMLElement | null;
    const amount = (card?.offsetWidth || 400) + 20;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <div className="lp-root" style={{ minHeight: '100vh', opacity: ready ? 1 : 0, transition: 'opacity .7s ease' }}>
      <div className="lp-grain" />
      <div className="scroll-progress-bar" ref={progressRef} style={{ width: 0 }} />

      {/* Nav */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <button type="button" onClick={() => scrollTo('#hero')} style={{ border: 'none', background: 'transparent', padding: 0 }}>
            <img src={getImage('logo_abbreviated', logoPrincipal)} alt="ELEMENThaus" style={{ height: 48, width: 'auto', display: 'block' }} />
          </button>
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
            {navLinks.map((l) => (
              <button key={l.href} type="button" className="landing-nav-link" onClick={() => scrollTo(l.href)} style={{ border: 'none', background: 'transparent' }}>{l.label}</button>
            ))}
            <button type="button" className="btn btn-small" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')} style={{ width: 'auto', padding: '10px 26px', marginLeft: 8 }}>
              {isAuthenticated ? 'Dashboard →' : 'Ingresar'}
            </button>
          </div>
          <button type="button" className="hamburger show-mobile" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
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
              <button type="button" className="lp-mm-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
                <X size={22} />
              </button>
            </div>
            <nav className="lp-mm-links">
              {navLinks.map((l, i) => (
                <button type="button"
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
              <button type="button" className="btn" style={{ width: '100%' }} onClick={() => { setMenuOpen(false); navigate(isAuthenticated ? '/dashboard' : '/login'); }}>
                {isAuthenticated ? 'Ir al Dashboard →' : 'Ingresar'}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* PORTADA — móvil: imagen estática; escritorio: secuencia por scroll */}
      {isMobile ? (
        <section id="hero" style={{ position: 'relative', minHeight: '100svh', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <img src={portadaFrames[portadaFrames.length - 1] || logoGold} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="eager" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,7,7,0.55) 0%, rgba(7,7,7,0.92) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 22px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src={getImage('logo_main', logoGold)} alt="ELEMENThaus" style={{ width: 'clamp(130px, 42vw, 190px)', height: 'auto', filter: 'drop-shadow(0 0 30px rgba(182,148,98,0.4))' }} />
            <span className="lp-eyebrow" style={{ marginTop: 22, fontSize: 12, letterSpacing: '0.3em' }}>Construcción · Arquitectura · Ingeniería</span>
            <h1 className="lp-hero-title">Del plano a la cuenta de cobro</h1>
            <p className="lp-hero-sub">{getConfig('hero', 'subtitle', 'La plataforma integral para tu estudio: diseña planos, calcula materiales, cotiza y cobra.')}</p>
            <div className="lp-hero-cta">
              <button type="button" className="btn" style={{ width: 'auto' }} onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>{isAuthenticated ? 'Ir al Dashboard →' : 'Comenzar ahora →'}</button>
              <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={() => scrollTo('#proc')}>Conocer más</button>
            </div>
          </div>
        </section>
      ) : (
      <ScrollSequence id="hero" frames={portadaFrames} heightVh={480} dim={0.4} onProgress={heroProgress} priority>
        <div className="lp-mesh" style={{ width: 520, height: 520, top: '-8%', left: '-6%', background: 'radial-gradient(circle, rgba(182,148,98,0.22), transparent 60%)' }} />
        <div ref={heroOverlayRef} className="lp-hero-overlay">
          <img src={getImage('logo_main', logoGold)} alt="ELEMENThaus" style={{ width: 'clamp(130px, 16vw, 210px)', height: 'auto', filter: 'drop-shadow(0 0 30px rgba(182,148,98,0.4))' }} />
          <span className="lp-eyebrow" style={{ marginTop: 26, fontSize: 13, letterSpacing: '0.32em' }}>Construcción · Arquitectura · Ingeniería</span>
          <h1 className="lp-hero-title">Del plano a la cuenta de cobro</h1>
          <p className="lp-hero-sub">
            {getConfig('hero', 'subtitle', 'La plataforma integral para tu estudio: diseña planos, calcula materiales, cotiza y cobra, todo en un solo lugar.')}
          </p>
          <div className="lp-hero-cta">
            <MagneticButton onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>{isAuthenticated ? 'Ir al Dashboard →' : 'Comenzar ahora →'}</MagneticButton>
            <MagneticButton ghost onClick={() => scrollTo('#proc')}>Conocer más</MagneticButton>
          </div>
        </div>
        <div className="lp-scroll-hint">Desliza para explorar ↓</div>
      </ScrollSequence>
      )}

      {/* Lámina de contenido */}
      <div className="lp-content" ref={contentRef} style={{ backgroundColor: 'rgb(26, 23, 20)' }}>

        {/* Cómo funciona — en escritorio se monta (sticky) sobre el final de la portada,
            con fondo negro liquid glass, como una lámina que se desliza encima (parallax). */}
        <div id="proc" ref={proc.ref} style={isMobile ? undefined : { position: 'relative', zIndex: 6, minHeight: '260vh', marginTop: '-100vh' }}>
        <section
          className={isMobile ? undefined : 'lp-proc-stack'}
          style={isMobile
            ? { position: 'relative', padding: '104px 0 88px' }
            : { position: 'sticky', top: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '96px 0' }}
        >
          <div className="lp-wrap">
            <Reveal>
              <span className="lp-eyebrow">Cómo funciona</span>
              <h2 className="lp-display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', maxWidth: 840, marginTop: 18, color: '#f4efe6' }}>
                Del plano a la cuenta de cobro, sin complicarte
              </h2>
              <p style={{ color: '#a59e90', maxWidth: 660, marginTop: 18, fontSize: 17, lineHeight: 1.7 }}>
                ELEMENT reúne todo el flujo de un estudio de arquitectura y construcción en un solo lugar: diseñas el
                plano de la casa, calculas los materiales (enchapes, barrederas, catálogo y estimación de obra),
                cotizas el proyecto y emites la cuenta de cobro con su plan de pagos —{' '}
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
                {steps.map((st) => {
                  const stepIdx = steps.indexOf(st);
                  return (
                    <div key={st.t} className={`lp-time-step ${stepIdx <= activeStep ? 'on' : ''}`}>
                      <div className="lp-time-dot" />
                      <div className="lp-display" style={{ fontSize: 20, color: stepIdx <= activeStep ? '#f4efe6' : '#7c7568', transition: 'color .4s' }}>
                        {String(stepIdx + 1).padStart(2, '0')} · {st.t}
                      </div>
                      <p style={{ color: '#8c8578', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>{st.d}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        </div>

        {/* FUNCIONES — carrusel con las 5 funciones principales sobre frames de la secuencia interior */}
        <section id="features" style={{ padding: '90px 0 70px' }}>
          <div className="lp-wrap">
            <Reveal>
              <span className="lp-eyebrow">Funciones</span>
              <h2 className="lp-display" style={{ fontSize: 'clamp(2.1rem, 5vw, 3.2rem)', marginTop: 16, color: '#f4efe6', maxWidth: 720 }}>
                Todo lo que necesita tu estudio, en un solo lugar
              </h2>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <div className="lp-carousel-wrap">
              <div className="lp-carousel" ref={carouselRef}>
                {featuresCarousel.map((f) => (
                  <div key={f.title} className="lp-carousel-card">
                    <img src={f.img} alt="" loading="lazy" />
                    <div className="lp-carousel-scrim" />
                    <div className="lp-carousel-caption">
                      <h3>{f.title}</h3>
                      <p>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="lp-carousel-nav lp-carousel-nav--prev" onClick={() => scrollCarousel(-1)} aria-label="Función anterior"><ChevronLeft size={20} /></button>
              <button type="button" className="lp-carousel-nav lp-carousel-nav--next" onClick={() => scrollCarousel(1)} aria-label="Función siguiente"><ChevronRight size={20} /></button>
            </div>
          </Reveal>
        </section>

        {/* Servicios: sección grande, fondo negro, grilla de tarjetas */}
        <section id="services" className="lp-services-section">
          <div className="lp-wrap">
            <Reveal>
              <span className="lp-eyebrow">Servicios</span>
              <h2 className="lp-display" style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', marginTop: 16, color: '#f7f2e8', maxWidth: 800 }}>
                {getConfig('services', 'title', 'Los servicios de tu estudio, en una plataforma')}
              </h2>
              <p style={{ color: '#9b9486', maxWidth: 600, marginTop: 16, fontSize: 17, lineHeight: 1.7 }}>
                Cotiza y gestiona cualquiera de tus servicios de diseño y construcción. También puedes crear los tuyos
                propios desde el panel de configuración.
              </p>
            </Reveal>
            <div className="lp-services-grid">
              {services.map((s, i) => {
                const Icon = s.icon;
                return (
                  <Reveal key={s.t} delay={i * 50} y={20}>
                    <div className="lp-service-card">
                      <span className="lp-service-ic"><Icon size={26} strokeWidth={1.6} /></span>
                      <h3>{s.t}</h3>
                      <p>{s.d}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" style={{ position: 'relative', padding: '80px 24px 110px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Reveal>
              <div className="lp-cta" style={{ padding: 'clamp(40px, 7vw, 92px) clamp(28px, 5vw, 70px)', textAlign: 'center' }}>
                <img src={getImage('features', casaRelleno1)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 130%, rgba(182,148,98,0.38), transparent 60%)' }} />
                <div className="cta-glow" style={{ position: 'absolute', inset: 0, borderRadius: 32, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h2 className="lp-display" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', color: '#f7f2e8', maxWidth: 760, margin: '0 auto' }}>
                    {getConfig('cta', 'title', '¿Listo para llevar tu estudio a otro nivel?')}
                  </h2>
                  <p style={{ color: '#cabfa9', maxWidth: 520, margin: '22px auto 0', fontSize: 17, lineHeight: 1.6 }}>
                    {getConfig('cta', 'subtitle', 'Únete a los profesionales que ya diseñan, calculan y cobran sus proyectos con ELEMENT.')}
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
                <button key={l.href} type="button" className="landing-nav-link" onClick={() => scrollTo(l.href)} style={{ border: 'none', background: 'transparent', fontSize: 13 }}>{l.label}</button>
              ))}
            </div>
          </div>
        </footer>
      </div>{/* /lp-content */}

      <style>{`
        .lp-hero-overlay{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 24px;will-change:opacity,transform;}
        .lp-hero-title{font-family:'Manrope',sans-serif;font-weight:800;font-size:clamp(2.2rem,6vw,4.4rem);color:#f7f2e8;margin:16px 0 0;line-height:1.03;letter-spacing:-0.02em;}
        .lp-hero-sub{color:#c8c0b1;max-width:560px;margin:18px auto 0;font-size:clamp(1rem,2vw,1.22rem);line-height:1.6;}
        .lp-hero-cta{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:34px;}
        .lp-scroll-hint{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);z-index:2;color:#b3ac9d;font-size:13px;letter-spacing:.08em;pointer-events:none;animation:lpHintBob 1.8s ease-in-out infinite;}
        @keyframes lpHintBob{0%,100%{transform:translateX(-50%) translateY(0);}50%{transform:translateX(-50%) translateY(7px);}}
        /* "Cómo funciona": en escritorio se pega (sticky) y se desliza sobre el final
           de la portada, con fondo negro liquid glass — efecto parallax de láminas. */
        .lp-proc-stack{
          border-radius:44px 44px 0 0;
          background:
            radial-gradient(55% 45% at 25% 12%, rgba(182,148,98,0.10), transparent 60%),
            linear-gradient(180deg, rgba(12,11,10,0.82) 0%, rgba(6,6,7,0.96) 45%, #050505 100%);
          backdrop-filter:blur(34px) saturate(150%);
          -webkit-backdrop-filter:blur(34px) saturate(150%);
          box-shadow:0 -40px 90px rgba(0,0,0,0.6);
          z-index:6;
        }
        .lp-proc-stack > .lp-wrap{width:100%;}
        .lp-carousel-wrap{position:relative;margin-top:52px;padding:0 24px;}
        .lp-carousel{display:flex;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 4px 24px;scrollbar-width:none;}
        .lp-carousel::-webkit-scrollbar{display:none;}
        /* Las imágenes del carrusel son horizontales (16:9 y 4:3), así que la tarjeta
           también lo es: un recorte cuadrado les cortaría demasiado. */
        .lp-carousel-card{
          position:relative;flex:0 0 auto;width:min(760px, 88vw);aspect-ratio:16/10;
          border-radius:32px;overflow:hidden;scroll-snap-align:start;background:#111;
        }
        .lp-carousel-card img{width:100%;height:100%;object-fit:cover;display:block;}
        .lp-carousel-scrim{position:absolute;inset:0;background:linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.88) 100%);}
        .lp-carousel-caption{position:absolute;left:0;right:0;bottom:0;padding:32px 34px;}
        .lp-carousel-caption h3{font-family:'Manrope',sans-serif;font-weight:800;font-size:clamp(1.4rem,2vw,1.75rem);color:#f7f2e8;letter-spacing:-0.01em;}
        .lp-carousel-caption p{color:#d8d2c4;margin:10px 0 0;font-size:15.5px;line-height:1.55;max-width:440px;}
        .lp-carousel-nav{
          position:absolute;top:50%;transform:translateY(-50%);z-index:2;
          width:52px;height:52px;border-radius:50%;display:grid;place-items:center;
          background:rgba(20,19,18,0.6);border:1px solid rgba(255,255,255,0.14);color:#f4efe6;cursor:pointer;
          backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
          transition:background .2s ease;
        }
        .lp-carousel-nav:hover{background:rgba(182,148,98,0.28);}
        .lp-carousel-nav--prev{left:6px;}
        .lp-carousel-nav--next{right:6px;}
        @media (max-width:860px){.lp-carousel-nav{display:none;}}
        .lp-services-section{background:#050505;padding:120px 24px 130px;}
        .lp-services-grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:22px;margin-top:48px;}
        .lp-service-card{
          padding:32px 26px;border-radius:24px;
          background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01) 50%, rgba(0,0,0,0.1)), rgba(14,13,12,0.5);
          border:1px solid rgba(255,255,255,0.08);
          transition:transform .3s var(--ease-lp), border-color .3s ease;
        }
        .lp-service-card:hover{transform:translateY(-4px);border-color:rgba(182,148,98,0.3);}
        .lp-service-ic{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:15px;background:rgba(182,148,98,0.14);color:#d9b877;border:1px solid rgba(182,148,98,0.3);margin-bottom:18px;}
        .lp-service-card h3{font-family:'Manrope',sans-serif;font-weight:800;font-size:1.15rem;color:#f7f2e8;letter-spacing:-0.01em;}
        .lp-service-card p{color:#a59e90;margin:10px 0 0;font-size:14px;line-height:1.6;}
      `}</style>
    </div>
  );
}
