import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Trash2, Plus, Search } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { ETIQUETA_RECURSO, aNumero, money, type Capitulo, type GrupoRecurso, type Insumo } from './types';

/** Componente en composición: el usuario aporta el rendimiento, nunca el precio. */
interface FilaNueva {
  insumoId: string;
  descripcion: string;
  unidad: string;
  grupo: GrupoRecurso;
  rendimiento: number;
  valorUnitario: string;
}

const ORDEN: GrupoRecurso[] = ['MATERIALES', 'MANO_OBRA', 'EQUIPOS', 'TRANSPORTE'];

/** Unidades habituales en presupuesto de obra colombiano. */
const UNIDADES = ['M2', 'M3', 'ML', 'UND', 'KG', 'GL', 'HR', 'DIA', 'GLB'];

/**
 * HU-10 · Crear un APU nuevo componiéndolo con insumos del maestro.
 *
 * Un APU es una receta: por cada unidad de la actividad, cuánto se consume de
 * cada insumo. El rendimiento es lo único que aporta el ingeniero de su propia
 * experiencia; el precio lo aporta el maestro. Por eso la pantalla separa los
 * dos conceptos y aquí no se edita ningún precio: para eso está HU-14, donde
 * el cambio queda visible para todos los APUs afectados.
 */
export function ModalNuevoApu({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [descripcion, setDescripcion] = useState('');
  const [unidad, setUnidad] = useState('M2');
  const [capituloId, setCapituloId] = useState('');
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [filas, setFilas] = useState<FilaNueva[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Buscador del maestro de insumos
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cargandoInsumos, setCargandoInsumos] = useState(false);

  // Alta de insumo desde el propio flujo (RN-10.3)
  const [creandoInsumo, setCreandoInsumo] = useState(false);
  const [nuevoInsumo, setNuevoInsumo] = useState({ descripcion: '', unidad: 'UND', grupo: 'MATERIALES' as GrupoRecurso, valorUnitario: 0 });

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const d = extractData(await apiService.getCapitulos());
        if (!cancel) setCapitulos(Array.isArray(d) ? d : []);
      } catch {
        /* el selector queda vacío; se avisa al intentar guardar */
      }
    })();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!buscando) return;
    let cancel = false;
    setCargandoInsumos(true);
    const t = setTimeout(async () => {
      try {
        const d = extractData(await apiService.getInsumos({ q: busqueda || undefined }));
        if (!cancel) setInsumos(Array.isArray(d) ? d : []);
      } catch {
        if (!cancel) setInsumos([]);
      } finally {
        if (!cancel) setCargandoInsumos(false);
      }
    }, 300);
    return () => { cancel = true; clearTimeout(t); };
  }, [buscando, busqueda]);

  const porGrupo = useMemo(() => {
    const mapa = new Map<GrupoRecurso, FilaNueva[]>();
    for (const f of filas) {
      const l = mapa.get(f.grupo) ?? [];
      l.push(f);
      mapa.set(f.grupo, l);
    }
    return ORDEN.filter((g) => mapa.has(g)).map((g) => [g, mapa.get(g)!] as const);
  }, [filas]);

  // El costo se muestra en vivo mientras se compone (RN-10.5).
  const costo = filas.reduce((s, f) => s + f.rendimiento * aNumero(f.valorUnitario), 0);

  const agregar = (i: Insumo) => {
    setFilas((fs) => {
      // Insumo repetido: se consolida en una línea sumando rendimientos, en vez
      // de dejar dos filas del mismo insumo que confundirían el análisis.
      const ya = fs.find((f) => f.insumoId === i.id);
      if (ya) {
        showNotification('Consolidado', 'info', 'Ese insumo ya estaba: se sumó el rendimiento.');
        return fs.map((f) => (f.insumoId === i.id ? { ...f, rendimiento: f.rendimiento + 1 } : f));
      }
      return [...fs, {
        insumoId: i.id, descripcion: i.descripcion, unidad: i.unidad,
        grupo: i.grupo, rendimiento: 1, valorUnitario: String(i.valorUnitario ?? '0'),
      }];
    });
    setBuscando(false);
    setBusqueda('');
  };

  const crearInsumo = async () => {
    if (!nuevoInsumo.descripcion.trim()) {
      showNotification('Atención', 'warning', 'El insumo necesita una descripción.');
      return;
    }
    try {
      const creado = extractData(await apiService.createInsumo({
        descripcion: nuevoInsumo.descripcion.trim(),
        unidad: nuevoInsumo.unidad,
        grupo: nuevoInsumo.grupo,
        valorUnitario: nuevoInsumo.valorUnitario,
      }));
      showNotification('Correcto', 'success', 'Insumo creado en el maestro.');
      // Queda en el maestro y disponible para cualquier otro APU.
      if (creado?.id) {
        agregar({ id: String(creado.id), descripcion: nuevoInsumo.descripcion.trim(), unidad: nuevoInsumo.unidad,
                  grupo: nuevoInsumo.grupo, valorUnitario: String(nuevoInsumo.valorUnitario) });
      }
      setCreandoInsumo(false);
      setNuevoInsumo({ descripcion: '', unidad: 'UND', grupo: 'MATERIALES', valorUnitario: 0 });
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo crear el insumo.');
    }
  };

  const guardar = async () => {
    // RN-10.1: descripción, unidad y capítulo son obligatorios.
    if (!descripcion.trim()) return showNotification('Falta la descripción', 'warning', 'El APU necesita una descripción.');
    if (!unidad) return showNotification('Falta la unidad', 'warning', 'Indica la unidad de medida del APU.');
    if (!capituloId) return showNotification('Falta el capítulo', 'warning', 'Elige el capítulo al que pertenece.');
    if (filas.length === 0) return showNotification('Sin componentes', 'warning', 'Agrega al menos un insumo.');
    // RN-10.4
    if (filas.some((f) => !(f.rendimiento > 0))) {
      return showNotification('Rendimiento inválido', 'warning', 'Todos los componentes necesitan un rendimiento mayor que cero.');
    }
    // RN-10.6: advierte sin bloquear, porque casi siempre es un olvido.
    const sinManoObra = !filas.some((f) => f.grupo === 'MANO_OBRA');
    const sinMateriales = !filas.some((f) => f.grupo === 'MATERIALES');
    if (sinManoObra || sinMateriales) {
      const falta = sinManoObra && sinMateriales ? 'mano de obra ni materiales' : sinManoObra ? 'mano de obra' : 'materiales';
      if (!window.confirm(`Este APU no tiene ${falta}. Suele ser un olvido. ¿Guardarlo de todas formas?`)) return;
    }

    setGuardando(true);
    try {
      await apiService.createApu({
        descripcion: descripcion.trim(),
        unidad,
        capituloId,
        // Solo rendimientos: el precio lo pone el servidor desde el maestro.
        componentes: filas.map((f) => ({ insumoId: f.insumoId, rendimiento: f.rendimiento })),
      });
      showNotification('Correcto', 'success', 'APU creado en el catálogo con origen Personalizado.');
      onCreado();
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo crear el APU.');
    } finally {
      setGuardando(false);
    }
  };

  const sinManoObra = filas.length > 0 && !filas.some((f) => f.grupo === 'MANO_OBRA');
  const sinMateriales = filas.length > 0 && !filas.some((f) => f.grupo === 'MATERIALES');

  return (
    <FormModal
      title="Nuevo APU"
      subtitle="Compón la receta con insumos del maestro. Tú pones el rendimiento; el precio lo pone el maestro."
      maxWidth={720}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          <button type="button" className="btn btn-small" onClick={guardar} disabled={guardando} style={{ width: 'auto' }}>
            {guardando ? 'Creando…' : 'Crear APU'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Descripción de la actividad</label>
          <input className="input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Cielo raso en drywall" autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 12 }}>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Unidad de medida</label>
            <select className="select" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Capítulo</label>
            <select className="select" value={capituloId} onChange={(e) => setCapituloId(e.target.value)}>
              <option value="">Elige un capítulo…</option>
              {capitulos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Composición */}
      {porGrupo.length === 0 ? (
        <p className="small" style={{ color: '#8c8578', marginBottom: 12 }}>Todavía no hay componentes.</p>
      ) : (
        porGrupo.map(([g, comps]) => {
          const sub = comps.reduce((s, f) => s + f.rendimiento * aNumero(f.valorUnitario), 0);
          return (
            <div key={g} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="small" style={{ fontWeight: 700, color: '#b69462', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
                  {ETIQUETA_RECURSO[g] ?? g}
                </span>
                <span className="small" style={{ fontWeight: 700 }}>{money(sub)}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>Insumo</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>Un.</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>Rendimiento</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>V. unit.</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>Subtotal</th>
                      <th style={{ padding: '6px 8px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map((f) => (
                      <tr key={f.insumoId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '6px 8px' }}>{f.descripcion}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#8c8578' }}>{f.unidad}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            step={0.0001}
                            value={f.rendimiento}
                            onChange={(e) => setFilas((fs) => fs.map((x) => (x.insumoId === f.insumoId ? { ...x, rendimiento: parseFloat(e.target.value) || 0 } : x)))}
                            style={{ width: 92, padding: '5px 7px', textAlign: 'right' }}
                            aria-label={`Rendimiento de ${f.descripcion}`}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#8c8578' }}>{money(f.valorUnitario)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{money(f.rendimiento * aNumero(f.valorUnitario))}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <button type="button" onClick={() => setFilas((fs) => fs.filter((x) => x.insumoId !== f.insumoId))}
                            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 3 }} aria-label={`Quitar ${f.descripcion}`}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* Aviso de composición incompleta: informa, no bloquea (RN-10.6) */}
      {(sinManoObra || sinMateriales) && (
        <div style={{ display: 'flex', gap: 8, padding: '9px 11px', borderRadius: 9, marginBottom: 12, background: 'rgba(255,149,0,0.09)', border: '1px solid rgba(255,149,0,0.28)' }}>
          <AlertTriangle size={15} color="#ff9500" style={{ flexShrink: 0, marginTop: 1 }} />
          <span className="small" style={{ color: '#d8cbb4' }}>
            Este APU no tiene {sinManoObra && sinMateriales ? 'mano de obra ni materiales' : sinManoObra ? 'mano de obra' : 'materiales'}. Suele ser un olvido, pero puedes guardarlo igual.
          </span>
        </div>
      )}

      {/* Agregar componente: siempre desde el maestro (RN-10.2) */}
      {!buscando && !creandoInsumo && (
        <button type="button" className="btn btn-small btn-secondary" onClick={() => setBuscando(true)} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Agregar insumo
        </button>
      )}

      {buscando && (
        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#8c8578' }} />
            <input className="input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en el maestro de insumos…" style={{ paddingLeft: 34 }} autoFocus />
          </div>
          <div style={{ display: 'grid', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {cargandoInsumos ? (
              <p className="small" style={{ color: '#8c8578' }}>Buscando…</p>
            ) : insumos.length === 0 ? (
              <p className="small" style={{ color: '#8c8578' }}>Ningún insumo coincide.</p>
            ) : insumos.map((i) => (
              <button key={i.id} type="button" onClick={() => agregar(i)}
                style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', font: 'inherit', color: 'inherit', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {i.descripcion} <span className="small" style={{ color: '#8c8578' }}>· {i.unidad} · {ETIQUETA_RECURSO[i.grupo] ?? i.grupo}</span>
                </span>
                <span className="small" style={{ color: '#b69462', fontWeight: 700 }}>{money(i.valorUnitario)}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-small btn-secondary" onClick={() => setBuscando(false)} style={{ width: 'auto' }}>Cerrar</button>
            {/* RN-10.3: si no existe, se crea aquí y queda en el maestro */}
            <button type="button" className="btn btn-small btn-secondary" onClick={() => { setBuscando(false); setCreandoInsumo(true); setNuevoInsumo((n) => ({ ...n, descripcion: busqueda })); }} style={{ width: 'auto' }}>
              ¿No está? Crear insumo
            </button>
          </div>
        </div>
      )}

      {creandoInsumo && (
        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(182,148,98,0.25)' }}>
          <p className="small" style={{ fontWeight: 700, marginBottom: 10 }}>Nuevo insumo</p>
          <p className="small" style={{ color: '#8c8578', marginBottom: 10 }}>
            Queda guardado en el maestro y disponible para cualquier otro APU, no solo para este.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Descripción</label>
              <input className="input" value={nuevoInsumo.descripcion} onChange={(e) => setNuevoInsumo((n) => ({ ...n, descripcion: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(120px, 100%), 1fr))', gap: 10 }}>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Unidad</label>
                <select className="select" value={nuevoInsumo.unidad} onChange={(e) => setNuevoInsumo((n) => ({ ...n, unidad: e.target.value }))}>
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Grupo</label>
                <select className="select" value={nuevoInsumo.grupo} onChange={(e) => setNuevoInsumo((n) => ({ ...n, grupo: e.target.value as GrupoRecurso }))}>
                  {ORDEN.map((g) => <option key={g} value={g}>{ETIQUETA_RECURSO[g]}</option>)}
                </select>
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Precio unitario</label>
                <input className="input" type="number" min={0} step={1} value={nuevoInsumo.valorUnitario || ''} onChange={(e) => setNuevoInsumo((n) => ({ ...n, valorUnitario: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-small btn-secondary" onClick={() => setCreandoInsumo(false)} style={{ width: 'auto' }}>Cancelar</button>
            <button type="button" className="btn btn-small" onClick={crearInsumo} style={{ width: 'auto' }}>Crear y agregar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <span style={{ fontWeight: 700 }}>Costo del APU</span>
        <span style={{ fontWeight: 800, fontSize: 18, color: '#b69462' }}>{money(costo)} / {unidad}</span>
      </div>
    </FormModal>
  );
}
