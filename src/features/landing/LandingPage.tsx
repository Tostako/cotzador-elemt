import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import logoGold from '../../assets/LOGO ABREVIADO/ELEMENThaus - Logo Abreviado Original 1.png';
import logoWhite from '../../assets/LOGO ABREVIADO/ELEMENThaus - Logo Abreviado White.png';
import casaImage from '../../assets/casa.jpg';
import casa2Image from '../../assets/casa2.png';
import { useStore } from '../../shared/services/store';

const navLinks = [
  { label: 'Inicio', href: '#hero' },
  { label: 'Funciones', href: '#features' },
  { label: 'Servicios', href: '#services' },
  { label: 'Contacto', href: '#cta' },
];

/** Bidirectional scroll reveal - animates in and out */
function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.05, rootMargin: '40px 0px 40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/** For containers with staggered children */
function useStaggerReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.05, rootMargin: '40px 0px 40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

export function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [landingConfig, setLandingConfig] = useState<Record<string, any>>({});
  const [landingImages, setLandingImages] = useState<any[]>([]);
  const [pageReady, setPageReady] = useState(false);

  // Fade in page smoothly after initial paint
  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setPageReady(true);
    });
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLanding() {
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
        // use defaults
      }
    }
    loadLanding();
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

  const heroOverlayOpacity = Math.min(scrollY / 500, 0.85);

  const features = [
    { icon: '📐', title: 'Cotización Inteligente', desc: 'Wizard de 5 pasos con cálculo automático de áreas y precios en tiempo real.' },
    { icon: '🏗️', title: 'Arquitectura Profesional', desc: '8 servicios de diseño especializados para proyectos de construcción de cualquier escala.' },
    { icon: '📋', title: 'Cuentas de Cobro', desc: 'Documentos formales con datos de empresa, plan de pagos, firma y numeración automática.' },
    { icon: '📱', title: '100% Responsive', desc: 'Accede desde cualquier dispositivo, en cualquier momento. Diseño mobile-first.' },
    { icon: '💰', title: 'Precios en Tiempo Real', desc: 'Cálculo instantáneo con descuentos, servicios adicionales y estimaciones de obra.' },
    { icon: '📊', title: 'Historial Completo', desc: 'Guarda, edita y gestiona todas tus cotizaciones con sincronización en la nube.' },
  ];

  const stats = [
    { value: '8', label: 'Servicios' },
    { value: '5', label: 'Pasos' },
    { value: '0s', label: 'Espera' },
    { value: '100%', label: 'Privado' },
  ];

  const particles = [
    { id: 1, size: 300, top: '5%', left: '5%', delay: '0s', duration: '8s', opacity: 0.08 },
    { id: 2, size: 200, top: '60%', right: '8%', delay: '2s', duration: '10s', opacity: 0.06 },
    { id: 3, size: 150, top: '30%', left: '70%', delay: '1s', duration: '12s', opacity: 0.1 },
    { id: 4, size: 250, bottom: '10%', left: '15%', delay: '3s', duration: '9s', opacity: 0.07 },
    { id: 5, size: 180, top: '70%', left: '40%', delay: '4s', duration: '11s', opacity: 0.09 },
    { id: 6, size: 120, top: '15%', right: '20%', delay: '2.5s', duration: '7s', opacity: 0.11 },
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

  const statsReveal = useStaggerReveal<HTMLDivElement>();
  const featuresTitleReveal = useScrollReveal<HTMLDivElement>();
  const featuresListReveal = useStaggerReveal<HTMLDivElement>();
  const featuresImageReveal = useScrollReveal<HTMLDivElement>();
  const servicesTitleReveal = useScrollReveal<HTMLDivElement>();
  const servicesGridReveal = useStaggerReveal<HTMLDivElement>();
  const ctaReveal = useScrollReveal<HTMLDivElement>();
  const footerReveal = useScrollReveal<HTMLElement>();

  return (
    <div
      className="animated-bg"
      style={{
        minHeight: '100vh',
        opacity: pageReady ? 1 : 0,
        transition: 'opacity 0.6s ease-out',
      }}
    >
      {/* Navbar */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img
            src={getImage('logo_abbreviated', logoGold)}
            alt="ELEMENThaus"
            style={{ height: 48, width: 'auto', cursor: 'pointer' }}
            onClick={() => scrollTo('#hero')}
          />

          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {navLinks.map((link) => (
              <span key={link.href} className="landing-nav-link" onClick={() => scrollTo(link.href)}>
                {link.label}
              </span>
            ))}
            <button className="btn btn-small" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')} style={{ width: 'auto', padding: '10px 24px' }}>
              {isAuthenticated ? 'Dashboard →' : 'Ingresar'}
            </button>
          </div>

          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none' }} aria-label="Menú">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
              <span className="hamburger-line" style={{ transform: menuOpen ? 'rotate(45deg) translateY(3.5px)' : undefined }} />
              <span className="hamburger-line" style={{ opacity: menuOpen ? 0 : 1, width: 14 }} />
              <span className="hamburger-line" style={{ transform: menuOpen ? 'rotate(-45deg) translateY(-3.5px)' : undefined }} />
            </div>
          </button>
        </div>

        {menuOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 24, background: 'rgba(15,15,15,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 16, minWidth: 200, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navLinks.map((link) => (
              <span key={link.href} style={{ padding: '10px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 15, color: '#fff' }} onClick={() => scrollTo(link.href)}>
                {link.label}
              </span>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0' }} />
            <button className="btn" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
              {isAuthenticated ? 'Ir al Dashboard' : 'Ingresar'}
            </button>
          </div>
        )}
      </nav>

      {/* Hero with dynamic scroll overlay */}
      <section id="hero" className="hero-section" style={{ padding: '0 24px' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${getImage('hero_bg', casaImage)})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 1 }} />
        <div style={{ position: 'absolute', inset: 0, background: `rgba(10,10,10,${heroOverlayOpacity})`, transition: 'background 0.1s linear', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.6) 50%, rgba(10,10,10,0.85) 100%)', pointerEvents: 'none' }} />

        {particles.map((p) => (
          <div key={p.id} style={{ position: 'absolute', top: p.top, left: p.left, right: p.right, bottom: p.bottom, width: p.size, height: p.size, background: `radial-gradient(circle, rgba(182,148,98,${p.opacity}) 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none', animation: `floatParticle ${p.duration} ease-in-out ${p.delay} infinite` }} />
        ))}

        <div style={{ position: 'relative', zIndex: 1 }} className="animate-reveal-up">
          <img src={getImage('logo_main', logoGold)} alt="ELEMENThaus" style={{ width: 'clamp(220px, 32vw, 380px)', height: 'auto', filter: 'drop-shadow(0 0 30px rgba(182, 148, 98, 0.3))' }} />
        </div>

        <h1 className="hero-title animate-slide-up" style={{ marginTop: 24 }}>
          {getConfig('hero', 'title', 'Cotizador Profesional')}
        </h1>

        <p className="hero-subtitle animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {getConfig('hero', 'subtitle', 'Sistema integral para cotización de proyectos de construcción y arquitectura')}
        </p>

        <div className="animate-reveal-up delay-3" style={{ display: 'flex', gap: 16, marginTop: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn" style={{ width: 'auto', padding: '16px 40px', fontSize: 18 }} onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
            {isAuthenticated ? 'Ir al Dashboard →' : 'Comenzar Ahora →'}
          </button>
          <button className="btn btn-ghost" style={{ width: 'auto', padding: '16px 40px', fontSize: 18 }} onClick={() => scrollTo('#features')}>
            Conocer Más
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: 40, opacity: 0.5, animation: 'bounceArrow 2s ease-in-out infinite', zIndex: 1 }} className="animate-reveal-up delay-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div ref={statsReveal.ref} className={`grid-2 stagger-children ${statsReveal.visible ? 'visible' : ''}`} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {stats.map((stat, i) => (
            <div key={i} className="stat-card scroll-reveal-up">
              <div className="stat-number">{stat.value}</div>
              <p className="small" style={{ marginTop: 8 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div ref={featuresTitleReveal.ref} style={{ textAlign: 'center', marginBottom: 60 }} className={`scroll-reveal-up ${featuresTitleReveal.visible ? 'visible' : ''}`}>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, marginBottom: 16, background: 'linear-gradient(135deg, #ffffff, #b69462)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Todo lo que necesitas
          </h2>
          <p style={{ color: '#999', fontSize: 18, lineHeight: 1.6, maxWidth: 600, margin: '0 auto' }}>
            Herramientas profesionales diseñadas para arquitectos, ingenieros y constructoras
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, alignItems: 'center' }}>
          <div ref={featuresListReveal.ref} className={`stagger-children ${featuresListReveal.visible ? 'visible' : ''}`} style={{ display: 'grid', gap: 20 }}>
            {features.map((feature, i) => (
              <div key={i} className="scroll-reveal-right" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 28, background: 'rgba(182, 148, 98, 0.1)', padding: '12px', borderRadius: 12, border: '1px solid rgba(182, 148, 98, 0.2)', flexShrink: 0 }}>
                  {feature.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{feature.title}</h3>
                  <p className="small" style={{ lineHeight: 1.6 }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div ref={featuresImageReveal.ref} className={`scroll-reveal-scale ${featuresImageReveal.visible ? 'visible' : ''}`}>
            <img src={casaImage} alt="Casa moderna" loading="lazy" style={{ width: '100%', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(182, 148, 98, 0.2)' }} />
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div ref={servicesTitleReveal.ref} style={{ textAlign: 'center', marginBottom: 48 }} className={`scroll-reveal-up ${servicesTitleReveal.visible ? 'visible' : ''}`}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, marginBottom: 12 }}>Servicios Disponibles</h2>
          <p className="small" style={{ fontSize: 16, marginBottom: 8 }}>Cada uno calculado al precio por m² de tu proyecto</p>
          <p className="small" style={{ color: '#b69462', fontSize: 14 }}>También puedes crear tus propios servicios personalizados desde el panel de configuración.</p>
        </div>

        <div ref={servicesGridReveal.ref} className={`grid-2 stagger-children ${servicesGridReveal.visible ? 'visible' : ''}`} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {services.map((s, i) => (
            <div key={i} className="card scroll-reveal-up" style={{ padding: 28 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: 1 }}>{s.n}</span>
              <h4 style={{ fontSize: 18, fontWeight: 600, margin: '12px 0 8px' }}>{s.t}</h4>
              <p className="small" style={{ lineHeight: 1.6 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" style={{ padding: '100px 24px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 200, height: 200, background: 'radial-gradient(circle, rgba(182,148,98,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', animation: 'floatParticle 10s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 250, height: 250, background: 'radial-gradient(circle, rgba(182,148,98,0.05) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', animation: 'floatParticle 8s ease-in-out 2s infinite' }} />

        <div ref={ctaReveal.ref} className={`card-hero scroll-reveal-scale ${ctaReveal.visible ? 'visible' : ''}`} style={{ maxWidth: 800, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${getImage('cta_bg', casa2Image)})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.05 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <img src={logoWhite} alt="ELEMENThaus" loading="lazy" style={{ width: 80, height: 'auto', marginBottom: 24, opacity: 0.9 }} />
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 700, marginBottom: 16 }}>¿Listo para profesionalizar tus cotizaciones?</h2>
            <p style={{ color: '#999', marginBottom: 32, fontSize: 18 }}>Únete a los estudios de arquitectura que ya confían en ELEMENT</p>
            <button className="btn" style={{ width: 'auto', padding: '18px 48px', fontSize: 18 }} onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
              {isAuthenticated ? 'Ir al Dashboard →' : 'Empezar Gratis →'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer ref={footerReveal.ref} style={{ padding: '48px 24px', textAlign: 'center', borderTop: '1px solid var(--color-line)' }} className={`scroll-reveal-fade ${footerReveal.visible ? 'visible' : ''}`}>
        <img src={getImage('logo_white', logoWhite)} alt="ELEMENThaus" loading="lazy" style={{ width: 60, height: 'auto', marginBottom: 16, opacity: 0.8 }} />
        <p className="small">{getConfig('footer', 'company_name', 'ELEMENThaus - Estudio de Diseño & Construcción')} © 2026</p>
        <p className="small" style={{ marginTop: 4 }}>{getConfig('footer', 'tagline', 'Cotizador Profesional · Todos los derechos reservados')}</p>
      </footer>
    </div>
  );
}
