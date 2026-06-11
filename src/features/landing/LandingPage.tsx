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
    { icon: '🏗️', title: 'Materiales', desc: 'Gestiona tu catálogo de materiales con precios por ferretería y lista de pedidos.' },
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

          <div className="hide-mobile" style={{ alignItems: 'center', gap: 32 }}>
            {navLinks.map((link) => (
              <span key={link.href} className="landing-nav-link" onClick={() => scrollTo(link.href)}>
                {link.label}
              </span>
            ))}
            <button className="btn btn-small" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')} style={{ width: 'auto', padding: '10px 24px' }}>
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

        {/* Mobile menu drawer */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 z-[98]" onClick={() => setMenuOpen(false)} />
            <div
              className="fixed top-0 right-0 bottom-0 w-[min(280px,80vw)] bg-[rgba(10,10,10,0.98)] border-l border-white/10 z-[99] pt-20 px-6 flex flex-col gap-4"
              style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              {navLinks.map((link) => (
                <span key={link.href} className="text-base font-medium cursor-pointer py-3" onClick={() => scrollTo(link.href)}>
                  {link.label}
                </span>
              ))}
              <div className="border-t border-white/10 my-2" />
              <button className="btn" onClick={() => { setMenuOpen(false); navigate(isAuthenticated ? '/dashboard' : '/login'); }}>
                {isAuthenticated ? 'Ir al Dashboard' : 'Ingresar'}
              </button>
            </div>
          </>
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
      <div style={{ padding: '60px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div ref={statsReveal.ref} className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          {stats.map((stat, i) => (
            <div
              key={i}
              className="scroll-reveal-up"
              style={{
                transitionDelay: `${i * 100}ms`,
                transform: statsReveal.visible ? 'translateY(0)' : 'translateY(30px)',
                opacity: statsReveal.visible ? 1 : 0,
                transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease',
              }}
            >
              <div style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#b69462', marginBottom: 8 }}>{stat.value}</div>
              <div style={{ fontSize: 14, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div ref={featuresTitleReveal.ref} className="scroll-reveal-up" style={{ textAlign: 'center', marginBottom: 60, transform: featuresTitleReveal.visible ? 'translateY(0)' : 'translateY(30px)', opacity: featuresTitleReveal.visible ? 1 : 0, transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, marginBottom: 16 }}>
              {getConfig('features', 'title', 'Todo lo que necesitas para cotizar')}
            </h2>
            <p style={{ fontSize: 18, color: '#999', maxWidth: 600, margin: '0 auto' }}>
              {getConfig('features', 'subtitle', 'Un sistema completo diseñado para profesionales de la construcción')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            <div ref={featuresListReveal.ref} style={{ display: 'grid', gap: 20 }}>
              {features.map((f, i) => (
                <div
                  key={i}
                  className="scroll-reveal-up"
                  style={{
                    transitionDelay: `${i * 100}ms`,
                    transform: featuresListReveal.visible ? 'translateY(0)' : 'translateY(30px)',
                    opacity: featuresListReveal.visible ? 1 : 0,
                    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease',
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                    padding: '16px 20px',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</span>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{f.title}</h3>
                    <p style={{ fontSize: 14, color: '#999', lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div ref={featuresImageReveal.ref} className="scroll-reveal-scale" style={{ transform: featuresImageReveal.visible ? 'scale(1)' : 'scale(0.95)', opacity: featuresImageReveal.visible ? 1 : 0, transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease' }}>
              <img
                src={getImage('features', casa2Image)}
                alt="Constructora"
                style={{ width: '100%', borderRadius: 24, boxShadow: '0 40px 80px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" style={{ padding: '100px 24px', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div ref={servicesTitleReveal.ref} className="scroll-reveal-up" style={{ textAlign: 'center', marginBottom: 60, transform: servicesTitleReveal.visible ? 'translateY(0)' : 'translateY(30px)', opacity: servicesTitleReveal.visible ? 1 : 0, transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, marginBottom: 16 }}>
              {getConfig('services', 'title', 'Servicios disponibles')}
            </h2>
            <p style={{ fontSize: 18, color: '#999', maxWidth: 600, margin: '0 auto' }}>
              También puedes crear tus propios servicios personalizados desde el panel de configuración
            </p>
          </div>

          <div ref={servicesGridReveal.ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {services.map((s, i) => (
              <div
                key={i}
                className="scroll-reveal-up"
                style={{
                  transitionDelay: `${i * 80}ms`,
                  transform: servicesGridReveal.visible ? 'translateY(0)' : 'translateY(30px)',
                  opacity: servicesGridReveal.visible ? 1 : 0,
                  transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease',
                  padding: '24px 20px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#b69462', marginBottom: 12 }}>{s.n}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{s.t}</h3>
                <p style={{ fontSize: 13, color: '#999', lineHeight: 1.5 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" style={{ padding: '120px 24px', textAlign: 'center' }}>
        <div ref={ctaReveal.ref} className="scroll-reveal-up" style={{ maxWidth: 600, margin: '0 auto', transform: ctaReveal.visible ? 'translateY(0)' : 'translateY(30px)', opacity: ctaReveal.visible ? 1 : 0, transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, marginBottom: 20 }}>
            {getConfig('cta', 'title', '¿Listo para empezar?')}
          </h2>
          <p style={{ fontSize: 18, color: '#999', marginBottom: 40 }}>
            {getConfig('cta', 'subtitle', 'Únete a cientos de profesionales que ya usan ELEMENT para cotizar sus proyectos')}
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn" style={{ width: 'auto', padding: '16px 40px', fontSize: 18 }} onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
              {isAuthenticated ? 'Ir al Dashboard →' : 'Crear Cuenta Gratis'}
            </button>
            <button className="btn btn-ghost" style={{ width: 'auto', padding: '16px 40px', fontSize: 18 }} onClick={() => navigate('/login')}>
              Iniciar Sesión
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer ref={footerReveal.ref} style={{ padding: '40px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', opacity: footerReveal.visible ? 1 : 0, transition: 'opacity 0.6s ease' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={logoWhite} alt="ELEMENThaus" style={{ height: 32, width: 'auto' }} />
            <span style={{ fontSize: 14, color: '#999' }}>© 2026 ELEMENT. Todos los derechos reservados.</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {navLinks.map((link) => (
              <span key={link.href} className="landing-nav-link" style={{ fontSize: 13 }} onClick={() => scrollTo(link.href)}>
                {link.label}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
