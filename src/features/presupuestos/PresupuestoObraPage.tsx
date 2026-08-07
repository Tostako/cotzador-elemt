import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HardHat, Plus, ChevronDown, ChevronRight, Trash2, Search, LayoutDashboard } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { ResumenFinanciero } from './ResumenFinanciero';
import { money, aNumero, type Aiu, type Apu, type Presupuesto, type Proyecto } from './types';

const AIU_INICIAL: Aiu = {
  administracionPct: 15,
  imprevistosPct: 3,
  utilidadPct: 5,
  ivaAplica: false,
  ivaPct: 19,
  costoDirecto: '0',
};

/** HU-04, HU-05, HU-06, HU-16 · Presupuesto de obra por capítulos. */
export function PresupuestoObraPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [aiu, setAiu] = useState<Aiu>(AIU_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const [guardandoAiu, setGuardandoAiu] = useState(false);
  const [modalActividad, setModalActividad] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [proy, pres, aiuRes] = await Promise.all([
        apiService.getObraProyecto(projectId).then(extractData).catch(() => null),
        apiService.getPresupuesto(projectId).then(extractData),
        apiService.getAiu(projectId).then(extractData).catch(() => null),
      ]);
      setProyecto(proy || null);
      setPresupuesto(pres || { capitulos: [], totales: { costoDirecto: '0', total: '0' } });
      if (aiuRes) setAiu({ ...AIU_INICIAL, ...aiuRes });
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el presupuesto.');
    } finally {
      setCargando(false);
    }
  }, [projectId]);

  useEffect(() => { cargar(); }, [cargar]);

  // El costo directo del presupuesto manda sobre el que traiga el AIU:
  // es el que se recalcula con cada cambio de cantidad.
  const costoDirecto = presupuesto?.totales?.costoDirecto ?? aiu.costoDirecto ?? '0';
  const aiuVigente = useMemo(() => ({ ...aiu, costoDirecto }), [aiu, costoDirecto]);

  // Guardado diferido del AIU: mientras el usuario teclea un porcentaje no se
  // dispara una petición por pulsación.
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cambiarAiu = (patch: Partial<Aiu>) => {
    setAiu((a) => ({ ...a, ...patch }));
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      setGuardandoAiu(true);
      try {
        const res = extractData(await apiService.updateAiu(projectId, { ...aiu, ...patch }));
        if (res) setAiu((a) => ({ ...a, ...res }));
      } catch {
        /* se conserva el valor local; el usuario ve el cálculo igualmente */
      } finally {
        setGuardandoAiu(false);
      }
    }, 700);
  };
  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  const alternarCapitulo = (id: string) =>
    setColapsados((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const cambiarCantidad = async (itemId: string, cantidad: number) => {
    if (!(cantidad > 0)) {
      showNotification('Atención', 'warning', 'La cantidad debe ser mayor que cero.');
      return;
    }
    try {
      await apiService.updateActividadCantidad(projectId, itemId, cantidad);
      await cargar(); // el servidor devuelve la cascada; se relee para no desincronizar
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo actualizar la cantidad.');
    }
  };

  const eliminarActividad = async (itemId: string, descripcion: string) => {
    if (!window.confirm(`¿Eliminar "${descripcion}" del presupuesto?`)) return;
    try {
      await apiService.deleteActividad(projectId, itemId);
      showNotification('Correcto', 'success', 'Actividad eliminada.');
      cargar();
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo eliminar.');
    }
  };

  if (cargando) return <main><p className="small" style={{ color: '#999' }}>Cargando presupuesto…</p></main>;

  if (error) {
    return (
      <main>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
          <p className="small" style={{ color: '#8c8578', marginTop: 8 }}>
            El módulo necesita los endpoints de presupuestos de obra en el servidor.
          </p>
          <button type="button" className="btn btn-small mt-2" onClick={() => navigate('/obra')} style={{ width: 'auto' }}>← Volver a proyectos</button>
        </div>
      </main>
    );
  }

  const capitulos = presupuesto?.capitulos ?? [];
  const vacio = capitulos.every((c) => (c.actividades?.length ?? 0) === 0);

  return (
    <main>
      <div className="flex-between" style={{ marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(20px, 5.5vw, 28px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <HardHat size={26} color="#b69462" /> {proyecto?.nombre || 'Presupuesto de obra'}
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-small btn-secondary" onClick={() => navigate('/obra')} style={{ width: 'auto' }}>← Proyectos</button>
          <button type="button" className="btn btn-small btn-secondary" onClick={() => navigate(`/obra/${projectId}/panel`)} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <LayoutDashboard size={15} /> Panel
          </button>
          <button type="button" className="btn btn-small" onClick={() => setModalActividad(true)} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Agregar actividad
          </button>
        </div>
      </div>
      <p className="small" style={{ marginBottom: 16 }}>
        {[proyecto?.cliente, proyecto?.ubicacion, proyecto?.areaM2 ? `${proyecto.areaM2} m²` : null].filter(Boolean).join(' · ') || '—'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ gridColumn: '1 / -1', display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 2.2fr) minmax(min(280px, 100%), 1fr)' }} className="presup-layout">
          {/* Tabla del presupuesto */}
          <div style={{ minWidth: 0 }}>
            {vacio ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <p className="small" style={{ color: '#999' }}>El presupuesto está vacío.</p>
                <button type="button" className="btn mt-2" onClick={() => setModalActividad(true)} style={{ width: 'auto' }}>
                  Agregar la primera actividad
                </button>
              </div>
            ) : (
              capitulos.map((cap) => {
                const cerrado = colapsados.has(cap.id);
                return (
                  <div key={cap.id} className="card" style={{ marginBottom: 14 }}>
                    <button
                      type="button"
                      onClick={() => alternarCapitulo(cap.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0, marginBottom: cerrado ? 0 : 12 }}
                    >
                      {cerrado ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                      <span style={{ fontWeight: 700, fontSize: 16, flex: 1, textAlign: 'left' }}>{cap.nombre}</span>
                      <span className="small" style={{ color: '#8c8578' }}>{cap.actividades?.length ?? 0} act.</span>
                      <span style={{ fontWeight: 700, color: '#b69462' }}>{money(cap.subtotal)}</span>
                    </button>

                    {!cerrado && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Actividad</th>
                              <th style={{ textAlign: 'center', padding: '10px 8px' }}>Un.</th>
                              <th style={{ textAlign: 'right', padding: '10px 8px' }}>Cantidad</th>
                              <th style={{ textAlign: 'right', padding: '10px 8px' }}>V. unitario</th>
                              <th style={{ textAlign: 'right', padding: '10px 8px' }}>V. parcial</th>
                              <th style={{ padding: '10px 8px' }} />
                            </tr>
                          </thead>
                          <tbody>
                            {(cap.actividades ?? []).map((a) => (
                              <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '10px 8px' }}>{a.descripcion}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'center', color: '#8c8578' }}>{a.unidad}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                  <input
                                    className="input"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    defaultValue={aNumero(a.cantidad)}
                                    onBlur={(e) => {
                                      const v = parseFloat(e.target.value);
                                      if (v !== aNumero(a.cantidad)) cambiarCantidad(a.id, v);
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                    style={{ width: 90, padding: '6px 8px', textAlign: 'right' }}
                                    aria-label={`Cantidad de ${a.descripcion}`}
                                  />
                                </td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#c0b8a9' }}>{money(a.valorUnitario)}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#b69462' }}>{money(a.valorParcial)}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                  <button type="button" onClick={() => eliminarActividad(a.id, a.descripcion)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 4 }} aria-label="Eliminar actividad">
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Resumen financiero — siempre visible */}
          <div style={{ minWidth: 0 }}>
            <ResumenFinanciero aiu={aiuVigente} areaM2={proyecto?.areaM2} onChange={cambiarAiu} guardando={guardandoAiu} />
          </div>
        </div>
      </div>

      {modalActividad && (
        <ModalAgregarActividad
          projectId={projectId}
          onClose={() => setModalActividad(false)}
          onAgregada={() => { setModalActividad(false); cargar(); }}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .presup-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

/** HU-04 · Catálogo de APUs para agregar una actividad al presupuesto. */
function ModalAgregarActividad({
  projectId,
  onClose,
  onAgregada,
}: {
  projectId: string;
  onClose: () => void;
  onAgregada: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [apus, setApus] = useState<Apu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState<Apu | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [agregando, setAgregando] = useState(false);

  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const data = extractData(await apiService.getApus({ q: busqueda || undefined, limit: 50 }));
        if (!cancel) setApus(Array.isArray(data) ? data : []);
      } catch {
        if (!cancel) setApus([]);
      } finally {
        if (!cancel) setCargando(false);
      }
    }, 300);
    return () => { cancel = true; clearTimeout(t); };
  }, [busqueda]);

  const agregar = async () => {
    if (!seleccionado) return;
    const cant = parseFloat(cantidad);
    if (!(cant > 0)) {
      showNotification('Atención', 'warning', 'La cantidad debe ser mayor que cero.');
      return;
    }
    setAgregando(true);
    try {
      await apiService.addActividad(projectId, { apuId: seleccionado.id, cantidad: cant, siExiste: 'SUMAR' });
      showNotification('Correcto', 'success', 'Actividad agregada al presupuesto.');
      onAgregada();
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo agregar la actividad.');
    } finally {
      setAgregando(false);
    }
  };

  const total = seleccionado ? aNumero(seleccionado.valorUnitario) * (parseFloat(cantidad) || 0) : 0;

  return (
    <FormModal
      title="Agregar actividad al presupuesto"
      subtitle="Elige un APU del catálogo e indica la cantidad de obra."
      maxWidth={680}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          <button type="button" className="btn btn-small" onClick={agregar} disabled={!seleccionado || agregando} style={{ width: 'auto' }}>
            {agregando ? 'Agregando…' : 'Agregar al presupuesto'}
          </button>
        </>
      }
    >
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8c8578' }} />
        <input
          className="input"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar actividad en el catálogo…"
          style={{ paddingLeft: 36 }}
          autoFocus
        />
      </div>

      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Buscando…</p>
      ) : apus.length === 0 ? (
        <p className="small" style={{ color: '#999' }}>No hay APUs que coincidan.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
          {apus.map((a) => {
            const activo = seleccionado?.id === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSeleccionado(a)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%',
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer', font: 'inherit', color: 'inherit',
                  background: activo ? 'rgba(182,148,98,0.14)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${activo ? 'rgba(182,148,98,0.45)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{a.descripcion}</div>
                  <p className="small" style={{ color: '#8c8578' }}>{a.capitulo?.nombre || '—'} · {a.unidad}</p>
                </div>
                <span style={{ fontWeight: 700, color: '#b69462', whiteSpace: 'nowrap' }}>{money(a.valorUnitario)}</span>
              </button>
            );
          })}
        </div>
      )}

      {seleccionado && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Cantidad de obra ({seleccionado.unidad})</label>
            <input className="input" type="number" min={0} step={0.01} value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={{ width: 120 }} />
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="small" style={{ color: '#8c8578' }}>Valor parcial</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#b69462' }}>{money(total)}</div>
          </div>
        </div>
      )}
    </FormModal>
  );
}
