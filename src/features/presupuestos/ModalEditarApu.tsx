import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Trash2, Plus, Search, Upload } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { componentesDesdeBackend, enriquecerComponentes, insumosDesdeBackend } from './mapeo';
import { maestroInsumos } from './maestroInsumos';
import { ETIQUETA_RECURSO, aNumero, money, type ComponenteApu, type GrupoRecurso, type Insumo } from './types';

/** Impacto que devuelve el dryRun de promover al catálogo. */
interface ImpactoPromocion {
  proyectosActivos: number;
  presupuestosBorrador: number;
  presupuestosAprobados: number;
  variacionUnitaria?: string;
  /** Va en la cabecera `x-confirmation-token` al publicar. */
  confirmationToken?: string;
  /** El APU no difiere del global: no hay nada que publicar. */
  sinCambios: boolean;
}

/**
 * El servicio responde `{ dry_run, ...impacto, confirmado }`, o sea con los
 * campos del impacto en la raíz, y mezcla convenciones de nombres. Se leen las
 * dos formas —anidada y plana, snake y camel— para no quedarnos con ceros si
 * el contrato no es exactamente el que suponemos.
 */
function impactoDesdeBackend(d: any): ImpactoPromocion {
  const i = d?.impacto ?? d ?? {};
  const leer = (...nombres: string[]) => {
    for (const n of nombres) {
      if (i?.[n] !== undefined && i?.[n] !== null) return i[n];
      if (d?.[n] !== undefined && d?.[n] !== null) return d[n];
    }
    return undefined;
  };
  const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  return {
    proyectosActivos: num(leer('proyectosActivos', 'proyectos_activos')),
    presupuestosBorrador: num(leer('presupuestosBorrador', 'presupuestos_borrador')),
    presupuestosAprobados: num(leer('presupuestosAprobados', 'presupuestos_aprobados')),
    variacionUnitaria: leer('variacionUnitaria', 'variacion_unitaria'),
    // El servicio lo llama `confirmation_token`; los otros nombres son red de
    // seguridad. Es un JSON base64url firmado, con 5 min de vida: si el
    // usuario se demora entre analizar y publicar, hay que volver a analizar.
    confirmationToken: d?.confirmation_token ?? d?.confirmationToken ?? d?.token,
    sinCambios: !!(d?.sin_cambios ?? d?.sinCambios),
  };
}

/** Fila editable: del APU solo se cambia el rendimiento, nunca el precio. */
interface FilaComponente {
  insumoId: string;
  descripcion: string;
  unidad: string;
  grupo: GrupoRecurso;
  rendimiento: number;
  valorUnitario: string;
}

const ORDEN: GrupoRecurso[] = ['MATERIALES', 'MANO_OBRA', 'EQUIPOS', 'TRANSPORTE'];

const desdeComponentes = (comps: ComponenteApu[] = []): FilaComponente[] =>
  comps.map((c) => ({
    insumoId: c.insumoId,
    // Tras enriquecer con el maestro estos campos ya vienen; el respaldo es
    // para el insumo que ya no existe, que se marca en vez de dejarse en blanco.
    descripcion: c.descripcion ?? 'Insumo no encontrado',
    unidad: c.unidad ?? '',
    grupo: c.grupo ?? 'MATERIALES',
    rendimiento: aNumero(c.cantidad),
    valorUnitario: String(c.valorUnitario ?? '0'),
  }));

/**
 * HU-11 · Editar el APU de una actividad, con alcance explícito.
 *
 * Implementa la decisión H-07, que corrige el fallo más caro del aplicativo
 * analizado: allí editar un APU desde un presupuesto modificaba la base y se
 * llevaba por delante todos los demás proyectos, sin avisar.
 *
 * Aquí hay dos acciones distintas y separadas a propósito:
 *   · Guardar    → toca solo la copia de ESTE proyecto (PUT sobre la instantánea)
 *   · Promover   → publica la versión al catálogo global (permiso admin, y con
 *                  análisis de impacto previo antes de confirmar)
 */
export function ModalEditarApu({
  projectId,
  itemId,
  descripcionInicial,
  onClose,
  onGuardado,
}: {
  projectId: string;
  itemId: string;
  descripcionInicial: string;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [descripcion, setDescripcion] = useState(descripcionInicial);
  const [filas, setFilas] = useState<FilaComponente[]>([]);
  const [unidad, setUnidad] = useState('');
  const [divergeDelCatalogo, setDiverge] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Promoción al catálogo: siempre en dos pasos.
  const [impacto, setImpacto] = useState<ImpactoPromocion | null>(null);
  const [promoviendo, setPromoviendo] = useState(false);

  // Alta de componentes
  const [buscandoInsumo, setBuscandoInsumo] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [insumos, setInsumos] = useState<Insumo[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // Los componentes llegan crudos (`insumo_id` + `rendimiento`): hay que
      // cruzarlos con el maestro para tener nombre, unidad, grupo y precio.
      const [d, maestro] = await Promise.all([
        apiService.getActividadApu(projectId, itemId).then(extractData),
        maestroInsumos().catch(() => new Map()),
      ]);
      setFilas(desdeComponentes(enriquecerComponentes(componentesDesdeBackend(d?.componentes), maestro)));
      setUnidad(d?.unidad ?? '');
      if (d?.descripcion) setDescripcion(d.descripcion);
      setDiverge(!!d?.divergeDelCatalogo);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el APU de esta actividad.');
    } finally {
      setCargando(false);
    }
  }, [projectId, itemId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Buscador de insumos para agregar componentes (diferido).
  useEffect(() => {
    if (!buscandoInsumo) return;
    let cancel = false;
    const t = setTimeout(async () => {
      try {
        const d = extractData(await apiService.getInsumos({ q: busqueda || undefined }));
        if (!cancel) setInsumos(insumosDesdeBackend(d));
      } catch {
        if (!cancel) setInsumos([]);
      }
    }, 300);
    return () => { cancel = true; clearTimeout(t); };
  }, [buscandoInsumo, busqueda]);

  // El costo se recalcula en vivo con los precios del maestro, para que el
  // usuario vea el efecto de cada rendimiento antes de guardar.
  const porGrupo = useMemo(() => {
    const mapa = new Map<GrupoRecurso, FilaComponente[]>();
    for (const f of filas) {
      const l = mapa.get(f.grupo) ?? [];
      l.push(f);
      mapa.set(f.grupo, l);
    }
    return ORDEN.filter((g) => mapa.has(g)).map((g) => [g, mapa.get(g)!] as const);
  }, [filas]);

  const costoUnitario = filas.reduce((s, f) => s + f.rendimiento * aNumero(f.valorUnitario), 0);

  const cambiarRendimiento = (insumoId: string, v: number) =>
    setFilas((fs) => fs.map((f) => (f.insumoId === insumoId ? { ...f, rendimiento: v } : f)));

  const quitar = (insumoId: string) => setFilas((fs) => fs.filter((f) => f.insumoId !== insumoId));

  const agregar = (i: Insumo) => {
    if (filas.some((f) => f.insumoId === i.id)) {
      showNotification('Atención', 'warning', 'Ese insumo ya está en el APU.');
      return;
    }
    setFilas((fs) => [...fs, {
      insumoId: i.id, descripcion: i.descripcion, unidad: i.unidad,
      grupo: i.grupo, rendimiento: 1, valorUnitario: String(i.valorUnitario ?? '0'),
    }]);
    setBuscandoInsumo(false);
    setBusqueda('');
  };

  /** Alcance de proyecto: solo la instantánea de esta actividad. */
  const guardar = async () => {
    if (!descripcion.trim()) {
      showNotification('Atención', 'warning', 'El APU necesita una descripción.');
      return;
    }
    // Guardar sin componentes deja el costo en cero: se pide confirmación.
    if (filas.length === 0 && !window.confirm('Este APU se quedará sin componentes y su costo será cero. ¿Continuar?')) return;
    if (filas.some((f) => !(f.rendimiento > 0)) &&
        !window.confirm('Hay componentes con rendimiento en cero. ¿Guardar de todos modos?')) return;

    setGuardando(true);
    try {
      await apiService.updateActividadApu(projectId, itemId, {
        descripcion: descripcion.trim(),
        // Solo rendimientos: los precios los pone el servidor desde el maestro.
        componentes: filas.map((f) => ({ insumoId: f.insumoId, rendimiento: f.rendimiento })),
      });
      showNotification('Guardado', 'success', 'El APU se actualizó solo en este proyecto.');
      onGuardado();
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo guardar el APU.');
    } finally {
      setGuardando(false);
    }
  };

  /** Paso 1: consultar a quién afectaría. Con dryRun el servicio no escribe. */
  const analizarPromocion = async () => {
    setPromoviendo(true);
    try {
      const d = impactoDesdeBackend(extractData(await apiService.promoverApu(projectId, itemId, { dryRun: true })));
      if (d.sinCambios) {
        // El servicio corta antes de escribir cuando no hay diferencia.
        showNotification('Sin cambios', 'info', 'Este APU ya es igual al del catálogo: no hay nada que publicar.');
        return;
      }
      setImpacto(d);
    } catch (e: any) {
      // 403 = no tiene permiso de administración de catálogo.
      showNotification('Error', 'error', e?.message || 'No se pudo calcular el impacto.');
    } finally {
      setPromoviendo(false);
    }
  };

  /** Paso 2: publicar, con el token que devolvió el análisis en la cabecera. */
  const promover = async () => {
    if (!impacto) return;
    if (!impacto.confirmationToken) {
      // Sin token el servicio responde 422; mejor decir por qué que dejarlo fallar.
      showNotification('Falta la confirmación', 'error',
        'El análisis no devolvió el token de confirmación. Vuelve a calcular el impacto.');
      return;
    }
    setPromoviendo(true);
    try {
      await apiService.promoverApu(projectId, itemId, { confirmationToken: impacto.confirmationToken });
      showNotification('Publicado', 'success', 'El APU se promovió al catálogo como versión nueva.');
      setImpacto(null);
      onGuardado();
    } catch (e: any) {
      // El token vive 5 minutos. Un 422 aquí casi siempre es que caducó, no
      // que falte confirmar: mandar a "volver a analizar" ahorra el atasco.
      if (e?.status === 422) {
        setImpacto(null);
        showNotification('Confirmación caducada', 'warning',
          'La confirmación vence a los 5 minutos. Vuelve a calcular el impacto y publica de seguido.');
      } else {
        showNotification('Error', 'error', e?.message || 'No se pudo promover al catálogo.');
      }
    } finally {
      setPromoviendo(false);
    }
  };

  return (
    <FormModal
      title="Editar APU de la actividad"
      subtitle="Los cambios afectan solo a este proyecto, salvo que lo promuevas al catálogo."
      maxWidth={720}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto', marginRight: 'auto' }}>Cancelar</button>
          <button type="button" className="btn btn-small btn-secondary" onClick={analizarPromocion} disabled={promoviendo || cargando} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Upload size={14} /> Promover al catálogo…
          </button>
          <button type="button" className="btn btn-small" onClick={guardar} disabled={guardando || cargando} style={{ width: 'auto' }}>
            {guardando ? 'Guardando…' : 'Guardar en este proyecto'}
          </button>
        </>
      }
    >
      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Cargando composición…</p>
      ) : error ? (
        <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
      ) : (
        <>
          {/* El alcance se dice explícitamente: es el punto de toda la historia. */}
          <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 10, marginBottom: 14, background: 'rgba(182,148,98,0.09)', border: '1px solid rgba(182,148,98,0.24)' }}>
            <AlertTriangle size={15} color="#b69462" style={{ flexShrink: 0, marginTop: 1 }} />
            <span className="small" style={{ color: '#d8cbb4' }}>
              Estás editando la copia de <strong>este proyecto</strong>. El catálogo y los demás proyectos no cambian.
              {divergeDelCatalogo && ' Esta actividad ya difiere de la versión del catálogo.'}
            </span>
          </div>

          <div style={{ display: 'grid', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Descripción</label>
              <input className="input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </div>
            {unidad && (
              <p className="small" style={{ color: '#8c8578' }}>
                Unidad: <strong>{unidad}</strong> — no se puede cambiar en un APU ya usado, porque invalidaría la cantidad de obra.
              </p>
            )}
          </div>

          {porGrupo.length === 0 ? (
            <p className="small" style={{ color: '#8c8578', marginBottom: 12 }}>Este APU no tiene componentes.</p>
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
                                onChange={(e) => cambiarRendimiento(f.insumoId, parseFloat(e.target.value) || 0)}
                                style={{ width: 92, padding: '5px 7px', textAlign: 'right' }}
                                aria-label={`Rendimiento de ${f.descripcion}`}
                              />
                            </td>
                            {/* El precio no se edita aquí: pertenece al maestro de insumos. */}
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#8c8578' }}>{money(f.valorUnitario)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{money(f.rendimiento * aNumero(f.valorUnitario))}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                              <button type="button" onClick={() => quitar(f.insumoId)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 3 }} aria-label={`Quitar ${f.descripcion}`}>
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

          {/* Agregar componente */}
          {!buscandoInsumo ? (
            <button type="button" className="btn btn-small btn-secondary" onClick={() => setBuscandoInsumo(true)} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Agregar insumo
            </button>
          ) : (
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#8c8578' }} />
                <input className="input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar insumo del maestro…" style={{ paddingLeft: 34 }} autoFocus />
              </div>
              <div style={{ display: 'grid', gap: 6, maxHeight: 170, overflowY: 'auto' }}>
                {insumos.length === 0 ? (
                  <p className="small" style={{ color: '#8c8578' }}>Sin resultados.</p>
                ) : insumos.map((i) => (
                  <button key={i.id} type="button" onClick={() => agregar(i)}
                    style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', font: 'inherit', color: 'inherit', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{i.descripcion} <span className="small" style={{ color: '#8c8578' }}>· {i.unidad}</span></span>
                    <span className="small" style={{ color: '#b69462', fontWeight: 700 }}>{money(i.valorUnitario)}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn-small btn-secondary mt-2" onClick={() => setBuscandoInsumo(false)} style={{ width: 'auto' }}>Cerrar</button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ fontWeight: 700 }}>Costo unitario del APU</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#b69462' }}>{money(costoUnitario)}{unidad ? ` / ${unidad}` : ''}</span>
          </div>

          {/* Promoción al catálogo: el impacto se muestra ANTES de publicar. */}
          {impacto && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <AlertTriangle size={16} color="#ff9500" />
                <strong style={{ fontSize: 14 }}>Esto cambia el catálogo global</strong>
              </div>
              <ul style={{ listStyle: 'none', display: 'grid', gap: 6, margin: 0, padding: 0 }}>
                <li className="small">Afecta a <strong>{impacto.proyectosActivos}</strong> proyecto(s) activo(s)</li>
                <li className="small">Recalcula <strong>{impacto.presupuestosBorrador}</strong> presupuesto(s) en borrador</li>
                {impacto.presupuestosAprobados > 0 && (
                  <li className="small" style={{ color: '#8c8578' }}>
                    {impacto.presupuestosAprobados} aprobado(s) no se recalculan: solo reciben aviso de versión nueva
                  </li>
                )}
                {impacto.variacionUnitaria && (
                  <li className="small">Variación unitaria: <strong>{impacto.variacionUnitaria}</strong></li>
                )}
              </ul>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-small btn-secondary" onClick={() => setImpacto(null)} style={{ width: 'auto' }}>Cancelar</button>
                <button type="button" className="btn btn-small" onClick={promover} disabled={promoviendo} style={{ width: 'auto' }}>
                  {promoviendo ? 'Publicando…' : 'Confirmar y publicar'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </FormModal>
  );
}
