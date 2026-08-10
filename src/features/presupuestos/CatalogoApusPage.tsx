import { useEffect, useMemo, useState } from 'react';
import { Layers, Search, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { ETIQUETA_RECURSO, aNumero, money, type Apu, type Capitulo, type ComponenteApu, type GrupoRecurso } from './types';

/**
 * HU-09 · Base de datos de APUs: consulta, búsqueda y filtro por capítulo.
 *
 * Cuelga de /catalogo y no de /obra/:id porque el catálogo es global, no del
 * proyecto. Que la ruta lo refleje ayuda a entender el alcance de lo que se
 * edita, que es el problema de fondo del hallazgo H-07 (DOC-04 §8).
 */
export function CatalogoApusPage() {
  const [busqueda, setBusqueda] = useState('');
  const [capituloId, setCapituloId] = useState('');
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [apus, setApus] = useState<Apu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  // HU-12 · La copia exige un nombre distinto: dos APUs con la misma
  // descripción son indistinguibles en el buscador del presupuesto.
  const duplicar = async (a: Apu) => {
    const propuesto = window.prompt('Nombre del APU duplicado:', `${a.descripcion} (copia)`);
    if (propuesto === null) return;
    const nombre = propuesto.trim();
    if (!nombre) {
      showNotification('Atención', 'warning', 'El duplicado necesita un nombre.');
      return;
    }
    if (nombre.toLowerCase() === a.descripcion.trim().toLowerCase()) {
      showNotification('Atención', 'warning', 'El nombre debe ser distinto al del APU original.');
      return;
    }
    try {
      await apiService.duplicarApu(a.id, nombre);
      showNotification('Correcto', 'success', 'APU duplicado.');
      setRecarga((n) => n + 1);
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo duplicar el APU.');
    }
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = extractData(await apiService.getCapitulos());
        if (!cancel) setCapitulos(Array.isArray(data) ? data : []);
      } catch {
        /* el filtro por capítulo queda vacío; la búsqueda sigue sirviendo */
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Búsqueda diferida: no se lanza una petición por cada pulsación.
  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      setCargando(true);
      setError(null);
      try {
        const data = extractData(await apiService.getApus({
          q: busqueda || undefined,
          capituloId: capituloId || undefined,
          limit: 100,
        }));
        if (!cancel) setApus(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancel) { setApus([]); setError(e?.message || 'No se pudo cargar el catálogo.'); }
      } finally {
        if (!cancel) setCargando(false);
      }
    }, 300);
    return () => { cancel = true; clearTimeout(t); };
  }, [busqueda, capituloId, recarga]);

  return (
    <main>
      <div className="flex-between" style={{ marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(22px, 6vw, 32px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Layers size={28} color="#b69462" /> Base de APUs
        </h1>
        {/* El contador sale de la misma consulta que la pantalla (H-13) */}
        {!cargando && !error && (
          <span className="small" style={{ color: '#8c8578' }}>
            {apus.length} APU{apus.length === 1 ? '' : 's'}{capituloId ? ' en el capítulo' : ' en el catálogo'}
          </span>
        )}
      </div>
      <p className="small" style={{ marginBottom: 16 }}>
        Análisis de precios unitarios reutilizables entre proyectos. Al agregar uno al presupuesto, el proyecto guarda su propia copia.
      </p>

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8c8578' }} />
          <input
            className="input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por descripción…"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select className="select" value={capituloId} onChange={(e) => setCapituloId(e.target.value)} style={{ flex: '0 1 240px' }} aria-label="Filtrar por capítulo">
          <option value="">Todos los capítulos</option>
          {capitulos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Cargando catálogo…</p>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
          <p className="small" style={{ color: '#8c8578', marginTop: 8 }}>
            El módulo necesita los endpoints del catálogo de APUs en el servidor.
          </p>
        </div>
      ) : apus.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>
            {busqueda || capituloId ? 'Ningún APU coincide con el filtro.' : 'El catálogo de APUs está vacío.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {apus.map((a) => (
            <FilaApu
              key={a.id}
              apu={a}
              abierto={abierto === a.id}
              onAlternar={() => setAbierto((x) => (x === a.id ? null : a.id))}
              onDuplicar={() => duplicar(a)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

/** Fila del catálogo; al desplegarla se carga la composición del APU. */
function FilaApu({ apu, abierto, onAlternar, onDuplicar }: { apu: Apu; abierto: boolean; onAlternar: () => void; onDuplicar: () => void }) {
  const [detalle, setDetalle] = useState<Apu | null>(apu.componentes ? apu : null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!abierto || detalle) return;
    let cancel = false;
    setCargando(true);
    (async () => {
      try {
        const d = extractData(await apiService.getApu(apu.id));
        if (!cancel && d) setDetalle(d);
      } catch {
        /* se muestra sin composición */
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => { cancel = true; };
  }, [abierto, detalle, apu.id]);

  // El costo del APU se agrupa por tipo de recurso, que es como se lee un APU.
  const porGrupo = useMemo(() => {
    const comps = detalle?.componentes ?? [];
    const mapa = new Map<GrupoRecurso, ComponenteApu[]>();
    for (const c of comps) {
      const lista = mapa.get(c.grupo) ?? [];
      lista.push(c);
      mapa.set(c.grupo, lista);
    }
    return Array.from(mapa.entries());
  }, [detalle]);

  return (
    <div className="card">
      <button
        type="button"
        onClick={onAlternar}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'left' }}
      >
        {abierto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{apu.descripcion}</div>
          <p className="small" style={{ color: '#8c8578' }}>{apu.capitulo?.nombre || '—'} · {apu.unidad}</p>
        </div>
        <span style={{ fontWeight: 700, color: '#b69462', whiteSpace: 'nowrap' }}>{money(apu.valorUnitario)}</span>
        {/* HU-12: duplicar para crear una variante sin tocar el original */}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onDuplicar(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onDuplicar(); } }}
          title="Duplicar este APU"
          aria-label={`Duplicar ${apu.descripcion}`}
          style={{ display: 'inline-flex', padding: 6, borderRadius: 8, color: '#8c8578', cursor: 'pointer', flexShrink: 0 }}
        >
          <Copy size={15} />
        </span>
      </button>

      {abierto && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {cargando ? (
            <p className="small" style={{ color: '#999' }}>Cargando composición…</p>
          ) : porGrupo.length === 0 ? (
            <p className="small" style={{ color: '#8c8578' }}>Este APU no tiene componentes registrados.</p>
          ) : (
            porGrupo.map(([grupo, comps]) => {
              const subtotal = comps.reduce((s, c) => s + aNumero(c.subtotal), 0);
              return (
                <div key={grupo} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="small" style={{ fontWeight: 700, color: '#b69462', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
                      {ETIQUETA_RECURSO[grupo] ?? grupo}
                    </span>
                    <span className="small" style={{ fontWeight: 700 }}>{money(subtotal)}</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>Insumo</th>
                          <th style={{ textAlign: 'center', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>Un.</th>
                          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>Rend.</th>
                          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>V. unit.</th>
                          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comps.map((c) => (
                          <tr key={c.insumoId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '6px 8px' }}>{c.descripcion}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', color: '#8c8578' }}>{c.unidad}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{c.cantidad}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#c0b8a9' }}>{money(c.valorUnitario)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{money(c.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
