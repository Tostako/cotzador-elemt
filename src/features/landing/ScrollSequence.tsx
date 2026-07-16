import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Secuencia de imágenes controlada por scroll (estilo "scrollytelling").
 * - Precarga todos los frames y los dibuja en un <canvas> según el avance del scroll.
 * - No usa estado de React por frame (todo va por refs) para evitar re-renders → fluido.
 * - `onProgress(p)` (0..1) permite animar overlays sin re-render.
 */
export function ScrollSequence({
  frames,
  heightVh,
  dim = 0.3,
  onProgress,
  children,
  id,
  className,
  priority = false,
}: {
  frames: string[];
  heightVh: number;
  dim?: number;
  onProgress?: (p: number) => void;
  children?: ReactNode;
  id?: string;
  className?: string;
  /** true para la secuencia visible al cargar (hero): empieza a precargar de inmediato.
   *  Las demás esperan a estar cerca del viewport para no competir por ancho de banda. */
  priority?: boolean;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const lastFrame = useRef(-1);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dibuja el frame idx (cover). Si aún no cargó, mantiene el anterior.
    const draw = (idx: number, force = false) => {
      const i = Math.max(0, Math.min(idx, frames.length - 1));
      const img = imagesRef.current[i];
      if (!img || !img.complete || img.naturalWidth === 0) return;
      if (i === lastFrame.current && !force) return;
      lastFrame.current = i;
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    const resize = () => {
      // dpr limitado a 1.5 → menos píxeles que dibujar por frame = más fluido.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      draw(lastFrame.current < 0 ? 0 : lastFrame.current, true);
    };

    // Precarga + pre-decodificación de frames, por lotes (evita un "aluvión" de 64 requests
    // simultáneos que compiten por ancho de banda/CPU y hacen ver el scroll entrecortado).
    imagesRef.current = new Array(frames.length);
    lastFrame.current = -1;
    let loadCancelled = false;
    const BATCH = 8;
    let next = 0;
    const loadBatch = () => {
      if (loadCancelled) return;
      const end = Math.min(next + BATCH, frames.length);
      for (; next < end; next++) {
        const idx = next;
        const im = new Image();
        im.decoding = 'async';
        (im as unknown as { fetchPriority?: string }).fetchPriority = idx < BATCH ? 'high' : 'low';
        im.src = frames[idx];
        im.decode?.().then(() => { if (idx === 0) draw(0, true); }).catch(() => { /* se dibuja al cargar */ });
        if (idx === 0) im.onload = () => draw(0, true);
        imagesRef.current[idx] = im;
      }
      if (next < frames.length) {
        const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
        if (ric) ric(loadBatch, { timeout: 200 });
        else window.setTimeout(loadBatch, 24);
      }
    };
    if (priority) {
      loadBatch();
    }
    // Las secuencias no prioritarias solo empiezan a descargar cuando están por
    // entrar en pantalla (así el hero no compite con ellas por la red al cargar la página).
    const io = priority
      ? null
      : new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              loadBatch();
              io?.disconnect();
            }
          },
          { rootMargin: '800px 0px 800px 0px' }
        );
    io?.observe(section);

    let ticking = false;
    const update = () => {
      ticking = false;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const dist = r.height - vh;
      const p = dist > 0 ? Math.min(Math.max(-r.top / dist, 0), 1) : 0;
      onProgressRef.current?.(p);
      draw(Math.round(p * (frames.length - 1)));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    resize();
    update();
    // Reintento por si el primer frame tarda en decodificar
    const t = window.setTimeout(() => draw(lastFrame.current < 0 ? 0 : lastFrame.current, true), 120);

    return () => {
      loadCancelled = true;
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      window.clearTimeout(t);
    };
  }, [frames, priority]);

  return (
    <section id={id} ref={sectionRef} className={className} style={{ position: 'relative', height: `${heightVh}vh` }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
        {dim > 0 && <div style={{ position: 'absolute', inset: 0, background: `rgba(5,5,6,${dim})`, pointerEvents: 'none' }} />}
        {children}
      </div>
    </section>
  );
}
