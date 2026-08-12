import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Handshake, Plus, Download, TrendingDown, TrendingUp } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { descargarCsv } from './exportarCsv';
import { grupoDesdeBackend } from './mapeo';
import {
  aNumero, money, diferenciaLinea,
  COLOR_ESTADO_LINEA, ETIQUETA_ESTADO_LINEA,
  type Cotizacion, type EstadoLinea, type LineaCotizacion,
} from './types';

const ESTADOS: EstadoLinea[] = ['PENDIENTE', 'COTIZADO', 'APROBADO', 'RECHAZADO'];

function normalizarLinea(l: any): LineaCotizacion {
  const precio = l.precioCotizado ?? l.precio_cotizado;
  return {
    id: String(l.id ?? l.insumoId ?? l.insumo_id ?? ''),
    insumoId: String(l.insumoId ?? l.insumo_id ?? ''),
    descripcion: l.descripcion ?? l.nombre ?? '',
    unidad: l.unidad ?? '',
    cantidad: aNumero(l.cantidad ?? l.cantidadTotal ?? l.cantidad_total),
    precioPresupuesto: String(l.precioPresupuesto ?? l.precio_presupuesto ?? l.valorUnitario ?? l.valor_unitario ?? '0'),
    proveedor: l.proveedor ?? '',
    precioCotizado: precio === null || precio === undefined ? undefined : String(precio),
    estado: (l.estado ?? 'PENDIENTE') as EstadoLinea,
    observacion: l.observacion ?? '',
  };
}

function normalizarCotizacion(c: any): Cotizacion {
  const lineas = c.lineas ?? c.items ?? c.lines ?? [];
  return {
    id: String(c.id ?? ''),
    nombre: c.nombre ?? 'Cotización',
    creadaEn: c.creadaEn ?? c.creada_en ?? c.createdAt,
    lineas: (Array.isArray(lineas) ? lineas : []).map(normalizarLinea),
  };
}

/**
 * HU-22 · Cotización a proveedores.
 *
 * Nace del consolidado del proyecto: la lista de compras ya está calculada, y
 * lo que falta es preguntarle el precio al proveedor y comparar. Cada línea
 * lleva proveedor, precio ofertado y estado; la diferencia contra el
 * presupuesto se muestra en pesos y en porcentaje para ver de un vistazo dónde
 * se está yendo la plata.
 *
 * Aprobar una línea no toca el maestro de insumos por su cuenta: eso se pide
 * aparte y con confirmación explícita, porque cambiar el precio maestro
 * repercute en todos los APUs que usan ese insumo.
 */
export function CotizacionesPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();

  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [activaId, setActivaId] = useState<string>('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [modalNueva, setModalNueva] = useState(false);
  const [aprobandoMaestro, setAprobandoMaestro] = useState<LineaCotizacion | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = extractData(await apiService.getCotizaciones(projectId));
      const arr = Array.isArray(d) ? d : (d?.items ?? []);
      const lista = (Array.isArray(arr) ? arr : []).map(normalizarCotizacion);
      setCotizaciones(lista);
      setActivaId((id) => (lista.some((c) => c.id === id) ? id : lista[0]?.id ?? ''));
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar las cotizaciones.');
    } finally {
      setCargando(false);
    }
  }, [projectId]);

  useEffect(() => { cargar(); }, [cargar]);

  const activa = useMemo(() => cotizaciones.find((c) => c.id === activaId) ?? null, [cotizaciones, activaId]);

  /** Cambio local inmediato + envío al servidor. Si el envío falla se recarga
   *  para no dejar en pantalla un dato que no quedó guardado. */
  const patchLinea = async (lineaId: string, cambio: Partial<LineaCotizacion>) => {
    if (!activa) return;
    const lineas = activa.lineas.map((l) => (l.id === lineaId ? { ...l, ...cambio } : l));
    setCotizaciones((cs) => cs.map((c) => (c.id === activa.id ? { ...c, lineas } : c)));
    setGuardando(true);
    try {
      await apiService.updateCotizacion(projectId, activa.id, { lineas: [{ id: lineaId, ...cambio }] });
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo guardar el cambio.');
      cargar();
    } finally {
      setGuardando(false);
    }
  };

  const totales = useMemo(() => {
    const ls = activa?.lineas ?? [];
    let base = 0, cotizado = 0, conPrecio = 0;
    for (const l of ls) {
      base += aNumero(l.precioPresupuesto) * l.cantidad;
      const d = diferenciaLinea(l);
      if (d) { cotizado += d.cotizado; conPrecio++; }
      else cotizado += aNumero(l.precioPresupuesto) * l.cantidad; // sin oferta se asume el presupuesto
    }
    const dif = cotizado - base;
    return { base, cotizado, dif, pct: base > 0 ? (dif / base) * 100 : null, conPrecio, total: ls.length };
  }, [activa]);

  const exportar = () => {
    if (!activa) return;
    descargarCsv(`cotizacion-${activa.nombre}`, [
      ['Insumo', 'Unidad', 'Cantidad', 'Precio presupuesto', 'Proveedor', 'Precio cotizado', 'Diferencia', 'Diferencia %', 'Estado', 'Observación'],
      ...activa.lineas.map((l) => {
        const d = diferenciaLinea(l);
        return [
          l.descripcion, l.unidad, l.cantidad, aNumero(l.precioPresupuesto),
          l.proveedor ?? '', l.precioCotizado ?? '',
          d ? Math.round(d.absoluta) : '', d?.pct != null ? d.pct.toFixed(1) : '',
          ETIQUETA_ESTADO_LINEA[l.estado], l.observacion ?? '',
        ];
      }),
    ]);
  };

  if (cargando) return <main><p className="small" style={{ color: '#999' }}>Cargando cotizaciones…</p></main>;

  return (
    <main>
      <div className="flex-between" style={{ marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(20px, 5.5vw, 28px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Handshake size={26} color="#b69462" /> Cotizaciones
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-small btn-secondary" onClick={() => navigate(`/obra/${projectId}/presupuesto`)} style={{ width: 'auto' }}>← Presupuesto</button>
          <button type="button" className="btn btn-small btn-secondary" onClick={exportar} disabled={!activa} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> Exportar
          </button>
          <button type="button" className="btn btn-small" onClick={() => setModalNueva(true)} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Nueva cotización
          </button>
        </div>
      </div>
      <p className="small" style={{ marginBottom: 16 }}>
        Pide precios sobre el consolidado de la obra y compáralos contra lo presupuestado.
      </p>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
          <p className="small" style={{ color: '#8c8578', marginTop: 8 }}>Falta el endpoint de cotizaciones en el servidor.</p>
        </div>
      ) : cotizaciones.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>Todavía no has pedido cotizaciones para esta obra.</p>
          <button type="button" className="btn mt-2" onClick={() => setModalNueva(true)} style={{ width: 'auto' }}>
            Crear la primera cotización
          </button>
        </div>
      ) : (
        <>
          {/* Varias cotizaciones por proyecto: se comparan entre proveedores */}
          {cotizaciones.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {cotizaciones.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActivaId(c.id)}
                  style={{
                    padding: '7px 13px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13,
                    background: c.id === activaId ? 'rgba(182,148,98,0.16)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${c.id === activaId ? 'rgba(182,148,98,0.45)' : 'rgba(255,255,255,0.07)'}`,
                    color: c.id === activaId ? '#e9dcc2' : '#8c8578',
                  }}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}

          {activa && (
            <>
              <div className="card" style={{ marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 14 }}>
                <div>
                  <div className="small" style={{ color: '#8c8578' }}>Presupuestado</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{money(totales.base)}</div>
                </div>
                <div>
                  <div className="small" style={{ color: '#8c8578' }}>Cotizado</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#b69462' }}>{money(totales.cotizado)}</div>
                </div>
                <div>
                  <div className="small" style={{ color: '#8c8578' }}>Diferencia</div>
                  <div style={{ fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 6, color: totales.dif > 0 ? '#ff6b6b' : totales.dif < 0 ? '#4ade80' : '#c0b8a9' }}>
                    {totales.dif > 0 ? <TrendingUp size={16} /> : totales.dif < 0 ? <TrendingDown size={16} /> : null}
                    {money(Math.abs(totales.dif))}
                    {totales.pct != null && <span className="small" style={{ fontWeight: 600 }}>({totales.pct > 0 ? '+' : ''}{totales.pct.toFixed(1)}%)</span>}
                  </div>
                </div>
                <div>
                  <div className="small" style={{ color: '#8c8578' }}>Respondidas</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{totales.conPrecio} / {totales.total}</div>
                </div>
              </div>

              <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 860 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '9px 8px' }}>Insumo</th>
                      <th style={{ textAlign: 'right', padding: '9px 8px' }}>Cant.</th>
                      <th style={{ textAlign: 'right', padding: '9px 8px' }}>Presupuesto</th>
                      <th style={{ textAlign: 'left', padding: '9px 8px' }}>Proveedor</th>
                      <th style={{ textAlign: 'right', padding: '9px 8px' }}>Cotizado</th>
                      <th style={{ textAlign: 'right', padding: '9px 8px' }}>Diferencia</th>
                      <th style={{ textAlign: 'left', padding: '9px 8px' }}>Estado</th>
                      <th style={{ padding: '9px 8px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {activa.lineas.map((l) => {
                      const d = diferenciaLinea(l);
                      return (
                        <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px' }}>
                            {l.descripcion}
                            <span className="small" style={{ color: '#8c8578' }}> · {l.unidad}</span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{l.cantidad.toLocaleString('es-CO')}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#c0b8a9' }}>{money(l.precioPresupuesto)}</td>
                          <td style={{ padding: '8px' }}>
                            <input
                              className="input"
                              defaultValue={l.proveedor}
                              onBlur={(e) => { if (e.target.value !== (l.proveedor ?? '')) patchLinea(l.id, { proveedor: e.target.value }); }}
                              placeholder="Proveedor"
                              style={{ minWidth: 130, padding: '5px 8px' }}
                              aria-label={`Proveedor para ${l.descripcion}`}
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <input
                              className="input"
                              type="number"
                              min={0}
                              step={1}
                              defaultValue={l.precioCotizado ?? ''}
                              onBlur={(e) => {
                                const v = e.target.value;
                                if (v === (l.precioCotizado ?? '')) return;
                                // Poner precio saca la línea de PENDIENTE por sí solo:
                                // marcarla a mano después sería trabajo repetido.
                                patchLinea(l.id, {
                                  precioCotizado: v === '' ? undefined : v,
                                  estado: v !== '' && l.estado === 'PENDIENTE' ? 'COTIZADO' : l.estado,
                                });
                              }}
                              placeholder="—"
                              style={{ width: 110, padding: '5px 8px', textAlign: 'right' }}
                              aria-label={`Precio cotizado de ${l.descripcion}`}
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, color: !d ? '#8c8578' : d.absoluta > 0 ? '#ff6b6b' : d.absoluta < 0 ? '#4ade80' : '#c0b8a9' }}>
                            {!d ? '—' : (
                              <>
                                {d.absoluta > 0 ? '+' : ''}{money(d.absoluta)}
                                {d.pct != null && <div className="small" style={{ fontWeight: 500 }}>{d.pct > 0 ? '+' : ''}{d.pct.toFixed(1)}%</div>}
                              </>
                            )}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <select
                              className="select"
                              value={l.estado}
                              onChange={(e) => patchLinea(l.id, { estado: e.target.value as EstadoLinea })}
                              style={{ padding: '5px 8px', minWidth: 120, color: COLOR_ESTADO_LINEA[l.estado] }}
                              aria-label={`Estado de ${l.descripcion}`}
                            >
                              {ESTADOS.map((e) => <option key={e} value={e}>{ETIQUETA_ESTADO_LINEA[e]}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {/* RN-22.5 · Llevar el precio al maestro es una decisión aparte:
                                afecta a todos los APUs que usan el insumo. */}
                            {l.estado === 'APROBADO' && d && (
                              <button
                                type="button"
                                className="btn btn-small btn-secondary"
                                onClick={() => setAprobandoMaestro(l)}
                                style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
                              >
                                Llevar al maestro
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="small" style={{ color: '#8c8578', marginTop: 10 }}>
                {guardando ? 'Guardando…' : 'Los cambios se guardan al salir de cada campo.'}
              </p>
            </>
          )}
        </>
      )}

      {modalNueva && (
        <ModalNuevaCotizacion
          projectId={projectId}
          onClose={() => setModalNueva(false)}
          onCreada={() => { setModalNueva(false); cargar(); }}
        />
      )}

      {aprobandoMaestro && (
        <ModalLlevarAlMaestro
          linea={aprobandoMaestro}
          onClose={() => setAprobandoMaestro(null)}
          onAplicado={() => { setAprobandoMaestro(null); cargar(); }}
        />
      )}
    </main>
  );
}

/** Crea una cotización a partir del consolidado del proyecto. */
function ModalNuevaCotizacion({
  projectId,
  onClose,
  onCreada,
}: {
  projectId: string;
  onClose: () => void;
  onCreada: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [filas, setFilas] = useState<Array<{ insumoId: string; descripcion: string; unidad: string; cantidad: number; valorUnitario: string; grupo: string }>>([]);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const d: any = extractData(await apiService.getConsolidados(projectId));
        const bruto: any[] = Array.isArray(d) ? d
          : Array.isArray(d?.items) ? d.items
          : Array.isArray(d?.insumos) ? d.insumos
          : Array.isArray(d?.grupos) ? d.grupos.flatMap((g: any) => (g.items ?? []).map((i: any) => ({ grupo: g.tipo ?? g.grupo, ...i }))) : [];
        const fs = bruto.map((i) => ({
          insumoId: String(i.insumoId ?? i.insumo_id ?? i.id ?? ''),
          descripcion: i.descripcion ?? i.nombre ?? '',
          unidad: i.unidad ?? '',
          cantidad: aNumero(i.cantidadTotal ?? i.cantidad_total ?? i.cantidad),
          valorUnitario: String(i.valorUnitario ?? i.valor_unitario ?? '0'),
          grupo: grupoDesdeBackend(i.grupo ?? i.tipo),
        }));
        if (!cancel) {
          setFilas(fs);
          // A un proveedor se le piden materiales, no mano de obra: es la
          // preselección razonable, pero se puede cambiar.
          setElegidos(new Set(fs.filter((f) => f.grupo === 'MATERIALES').map((f) => f.insumoId)));
        }
      } catch {
        if (!cancel) setFilas([]);
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => { cancel = true; };
  }, [projectId]);

  const alternar = (id: string) =>
    setElegidos((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const crear = async () => {
    const lineas = filas.filter((f) => elegidos.has(f.insumoId));
    if (lineas.length === 0) {
      showNotification('Atención', 'warning', 'Elige al menos un insumo para cotizar.');
      return;
    }
    setCreando(true);
    try {
      await apiService.crearCotizacion(projectId, {
        nombre: nombre.trim() || `Cotización ${new Date().toLocaleDateString('es-CO')}`,
        lineas: lineas.map((f) => ({
          insumoId: f.insumoId,
          descripcion: f.descripcion,
          unidad: f.unidad,
          cantidad: f.cantidad,
          precioPresupuesto: f.valorUnitario,
          estado: 'PENDIENTE',
        })),
      });
      showNotification('Creada', 'success', `Cotización con ${lineas.length} insumo(s).`);
      onCreada();
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo crear la cotización.');
    } finally {
      setCreando(false);
    }
  };

  return (
    <FormModal
      title="Nueva cotización"
      subtitle="Elige qué insumos del consolidado vas a pedirle al proveedor."
      maxWidth={620}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          <button type="button" className="btn btn-small" onClick={crear} disabled={creando || cargando} style={{ width: 'auto' }}>
            {creando ? 'Creando…' : `Crear con ${elegidos.size} insumo(s)`}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <label className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre</label>
        <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ferretería El Roble" autoFocus />
      </div>

      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Cargando el consolidado…</p>
      ) : filas.length === 0 ? (
        <p className="small" style={{ color: '#999' }}>
          El consolidado está vacío: agrega actividades al presupuesto antes de cotizar.
        </p>
      ) : (
        <>
          <div className="flex-between" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="small" style={{ color: '#8c8578' }}>{elegidos.size} de {filas.length} seleccionados</span>
            <button type="button" className="btn btn-small btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }}
              onClick={() => setElegidos(elegidos.size === filas.length ? new Set() : new Set(filas.map((f) => f.insumoId)))}>
              {elegidos.size === filas.length ? 'Quitar todos' : 'Seleccionar todos'}
            </button>
          </div>
          <div style={{ display: 'grid', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
            {filas.map((f) => (
              <label key={f.insumoId || f.descripcion} className="small"
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                <input type="checkbox" checked={elegidos.has(f.insumoId)} onChange={() => alternar(f.insumoId)} />
                <span style={{ flex: 1, minWidth: 0 }}>{f.descripcion}</span>
                <span style={{ color: '#8c8578', whiteSpace: 'nowrap' }}>{f.cantidad.toLocaleString('es-CO')} {f.unidad}</span>
                <span style={{ color: '#b69462', whiteSpace: 'nowrap' }}>{money(f.valorUnitario)}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </FormModal>
  );
}

/**
 * RN-22.5 · Actualizar el precio maestro desde una línea aprobada.
 *
 * El impacto se consulta con `/usage`, que es una lectura. Antes esto llamaba
 * al endpoint de precios con `?dryRun=true` creyendo que simulaba, pero el
 * backend no conoce ese parámetro: abrir el diálogo ya cambiaba el precio
 * maestro, sin que nadie hubiera confirmado nada.
 */
function ModalLlevarAlMaestro({
  linea,
  onClose,
  onAplicado,
}: {
  linea: LineaCotizacion;
  onClose: () => void;
  onAplicado: () => void;
}) {
  const [apus, setApus] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const uso: any = extractData(await apiService.getUsoInsumo(linea.insumoId));
        const lista = uso?.apus ?? uso?.items ?? uso;
        if (!cancel) {
          if (Array.isArray(lista)) setApus(lista.length);
          else if (typeof uso?.apus === 'number') setApus(uso.apus);
        }
      } catch {
        if (!cancel) setApus(null);
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => { cancel = true; };
  }, [linea]);

  const aplicar = async () => {
    setAplicando(true);
    setFallo(null);
    try {
      // Solo los campos de CreatePriceDto: `valor` y `motivo`.
      await apiService.setPrecioInsumo(linea.insumoId, {
        valor: aNumero(linea.precioCotizado),
        motivo: `Cotización aprobada${linea.proveedor ? ` · ${linea.proveedor}` : ''}`,
      });
      showNotification('Actualizado', 'success', `El precio maestro de "${linea.descripcion}" quedó en ${money(linea.precioCotizado)}.`);
      onAplicado();
    } catch (e: any) {
      setFallo(e?.message || 'No se pudo actualizar el precio maestro.');
    } finally {
      setAplicando(false);
    }
  };

  return (
    <FormModal
      title="Llevar el precio al maestro"
      subtitle={linea.descripcion}
      maxWidth={520}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          <button type="button" className="btn btn-small" onClick={aplicar} disabled={aplicando || cargando} style={{ width: 'auto' }}>
            {aplicando ? 'Aplicando…' : 'Actualizar precio maestro'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div className="small" style={{ color: '#8c8578' }}>Precio actual</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{money(linea.precioPresupuesto)}</div>
        </div>
        <div style={{ alignSelf: 'center', color: '#8c8578' }}>→</div>
        <div>
          <div className="small" style={{ color: '#8c8578' }}>Precio cotizado</div>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#b69462' }}>{money(linea.precioCotizado)}</div>
        </div>
      </div>

      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Consultando dónde se usa…</p>
      ) : (
        <p className="small" style={{ color: '#d8cbb4' }}>
          {apus != null && `Este cambio afecta a ${apus} APU(s) del catálogo. `}
          El precio se añade a la serie histórica del insumo. Los presupuestos aprobados
          conservan su instantánea; los que estén en borrador se recalculan.
        </p>
      )}

      {fallo && (
        <p className="small" style={{ color: '#ff6b6b', marginTop: 10, wordBreak: 'break-word' }}>{fallo}</p>
      )}
    </FormModal>
  );
}
