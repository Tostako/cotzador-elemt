import { useEffect, useState } from 'react';
import { Boxes, Search, AlertTriangle, Upload, Download } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { ModalImportar } from './ModalImportar';
import { grupoABackend, paginaInsumosDesdeBackend } from './mapeo';
import { olvidarMaestroInsumos } from './maestroInsumos';
import { olvidarCostosApu } from './costosApu';
import { descargarXlsx } from './exportarXlsx';
import { ETIQUETA_RECURSO, aNumero, money, type GrupoRecurso, type Insumo } from './types';

/** Qué se va a mover al cambiar el precio. Se arma en el cliente. */
interface Impacto {
  valorActual: number;
  valorPropuesto: number;
  variacionPct: number;
  superaUmbral: boolean;
  /** APUs que usan el insumo, según /catalog/supplies/:id/usage. */
  apus: number;
  /** El endpoint de uso puede no existir todavía; entonces no se sabe. */
  usoDesconocido: boolean;
}

/** Por encima de esto se pide confirmación reforzada: un salto así casi
 *  siempre es un dedazo (un cero de más) y no una subida real. */
const UMBRAL_VARIACION_PCT = 25;

/**
 * HU-14 · Maestro de insumos con precio propagable.
 *
 * El precio no se sobrescribe: cada cambio añade un registro a la serie
 * histórica (`POST .../prices` con `{ valor, motivo }`).
 *
 * El impacto se calcula aquí, no en el servidor. El DOC-05 preveía un `dryRun`
 * que devolvía el impacto y un `confirmationToken`, pero el backend real no lo
 * implementa: `CreatePriceDto` solo acepta `valor`, `vigente_desde`, `usuario`,
 * `motivo` y `origen`. Llamarlo con `?dryRun=true` no simulaba nada — creaba el
 * precio. Así que la vista previa se arma con `/usage` (una lectura) y el
 * cambio se aplica en una sola escritura, cuando el usuario confirma.
 */
export function InsumosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [grupo, setGrupo] = useState<'' | GrupoRecurso>('');
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [viendoUso, setViendoUso] = useState<Insumo | null>(null);
  const [modalImportar, setModalImportar] = useState(false);
  const [total, setTotal] = useState(0);

  /**
   * HU-13 · Exporta el recorte visible en el **mismo formato que acepta la
   * importación**: hoja «Insumos», columnas exactas y el grupo en la
   * convención del backend. Así el archivo que sale se puede reimportar tal
   * cual, que es como se editan precios en masa desde Excel.
   */
  const exportar = () => {
    if (insumos.length === 0) return;
    descargarXlsx('insumos', 'Insumos', [
      ['descripcion', 'unidad', 'grupo', 'precio'],
      ...insumos.map((i) => {
        const precio = aNumero(i.valorUnitario);
        // Un insumo sin precio sale con la celda vacía, no con un cero: al
        // reimportar, vacío lo deja como está y 0 lo pondría a cero.
        return [i.descripcion, i.unidad, grupoABackend(i.grupo), precio > 0 ? precio : ''];
      }),
    ]);
  };

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      // El filtro también viaja con el nombre del backend, no con el de la
      // interfaz. Y se pide una página grande: con las 20 por defecto el
      // maestro se veía truncado sin ningún aviso.
      const data = extractData(await apiService.getInsumos({
        q: busqueda || undefined,
        grupo: grupo ? grupoABackend(grupo) : undefined,
        perPage: 200,
      }));
      const pagina = paginaInsumosDesdeBackend(data);
      setInsumos(pagina.items);
      setTotal(pagina.total);
      // Los precios que se ven aquí son los que usa la composición de los APUs:
      // si cambian, la caché del maestro deja de ser cierta.
      olvidarMaestroInsumos();
      // Los costos de los APUs se calculan con estos precios: si cambian, los
      // que estuvieran cacheados dejan de ser ciertos.
      olvidarCostosApu();
    } catch (e: any) {
      setInsumos([]);
      setError(e?.message || 'No se pudo cargar el maestro de insumos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      if (cancel) return;
      await cargar();
    }, 300);
    return () => { cancel = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, grupo]);

  return (
    <main>
      <div className="flex-between" style={{ marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(22px, 6vw, 32px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Boxes size={28} color="#b69462" /> Insumos
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {!cargando && !error && (
            <span className="small" style={{ color: '#8c8578' }}>
              {/* Si el total supera lo cargado hay que decirlo, no dejar creer
                  que el catálogo se acaba en lo que se ve. */}
              {total > insumos.length
                ? `${insumos.length} de ${total} insumos`
                : `${insumos.length} insumo${insumos.length === 1 ? '' : 's'}`}
            </span>
          )}
          <button type="button" className="btn btn-small btn-secondary" onClick={() => setModalImportar(true)} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Upload size={15} /> Importar
          </button>
          <button type="button" className="btn btn-small btn-secondary" onClick={exportar} disabled={insumos.length === 0} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> Exportar
          </button>
        </div>
      </div>
      <p className="small" style={{ marginBottom: 16 }}>
        Maestro único de precios. Al cambiar uno se recalculan todos los APUs que lo usan y los presupuestos en borrador.
      </p>

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8c8578' }} />
          <input className="input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar insumo…" style={{ paddingLeft: 36 }} />
        </div>
        <select className="select" value={grupo} onChange={(e) => setGrupo(e.target.value as '' | GrupoRecurso)} style={{ flex: '0 1 200px' }} aria-label="Filtrar por grupo">
          <option value="">Todos los grupos</option>
          {(Object.keys(ETIQUETA_RECURSO) as GrupoRecurso[]).map((g) => (
            <option key={g} value={g}>{ETIQUETA_RECURSO[g]}</option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Cargando insumos…</p>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
          <p className="small" style={{ color: '#8c8578', marginTop: 8 }}>El módulo necesita los endpoints del maestro de insumos.</p>
        </div>
      ) : insumos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>{busqueda || grupo ? 'Ningún insumo coincide.' : 'El maestro de insumos está vacío.'}</p>
        </div>
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Descripción</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px' }}>Un.</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Grupo</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Uso en APUs</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Valor unitario</th>
                  <th style={{ padding: '10px 8px' }} />
                </tr>
              </thead>
              <tbody>
                {insumos.map((i) => (
                  <tr key={i.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 8px' }}>{i.descripcion}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: '#8c8578' }}>{i.unidad}</td>
                    <td style={{ padding: '10px 8px', color: '#8c8578' }}>{ETIQUETA_RECURSO[i.grupo] ?? i.grupo}</td>
                    {/* HU-15 · El contador es accionable: lleva a la lista concreta */}
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      {(i.usoEnApus ?? 0) > 0 ? (
                        <button
                          type="button"
                          onClick={() => setViendoUso(i)}
                          style={{ background: 'none', border: 'none', color: '#b69462', cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }}
                          title="Ver en qué APUs se usa"
                        >
                          {i.usoEnApus}
                        </button>
                      ) : (
                        <span style={{ color: '#8c8578' }}>{i.usoEnApus ?? '—'}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#b69462' }}>{money(i.valorUnitario)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      <button type="button" className="btn btn-small btn-secondary" onClick={() => setEditando(i)} style={{ width: 'auto' }}>
                        Cambiar precio
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viendoUso && <ModalUsoInsumo insumo={viendoUso} onClose={() => setViendoUso(null)} />}

      {modalImportar && (
        <ModalImportar
          tipo="INSUMOS"
          onClose={() => setModalImportar(false)}
          onImportado={() => { setModalImportar(false); cargar(); }}
        />
      )}

      {editando && (
        <ModalCambioPrecio
          insumo={editando}
          onClose={() => setEditando(null)}
          onAplicado={() => { setEditando(null); cargar(); }}
        />
      )}
    </main>
  );
}

/**
 * HU-15 · Dónde se usa un insumo.
 *
 * Convierte el contador «uso en APUs» en información accionable: la lista
 * concreta de APUs con su rendimiento, y por separado lo que se vería afectado
 * en el proyecto activo. Sirve para decidir con criterio antes de tocar un
 * precio.
 */
function ModalUsoInsumo({ insumo, onClose }: { insumo: Insumo; onClose: () => void }) {
  const [uso, setUso] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const d = extractData(await apiService.getUsoInsumo(insumo.id));
        if (!cancel) setUso(d);
      } catch (e: any) {
        if (!cancel) setError(e?.message || 'No se pudo consultar el uso.');
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => { cancel = true; };
  }, [insumo.id]);

  const apus: any[] = Array.isArray(uso?.apus) ? uso.apus : [];

  return (
    <FormModal
      title="Dónde se usa este insumo"
      subtitle={insumo.descripcion}
      maxWidth={560}
      onClose={onClose}
      footer={<button type="button" className="btn btn-small" onClick={onClose} style={{ width: 'auto' }}>Cerrar</button>}
    >
      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Consultando…</p>
      ) : error ? (
        <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
      ) : (
        <>
          <p className="small" style={{ color: '#8c8578', marginBottom: 12 }}>
            Aparece en <strong style={{ color: '#f4efe6' }}>{uso?.totalApus ?? apus.length}</strong> APU(s) del catálogo.
            Cambiar su precio los recalcula todos.
          </p>

          {apus.length === 0 ? (
            <p className="small" style={{ color: '#8c8578' }}>Ningún APU lo usa: se puede eliminar sin impacto.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {apus.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>{a.descripcion}</span>
                  <span className="small" style={{ color: '#8c8578', whiteSpace: 'nowrap' }}>
                    rend. <strong style={{ color: '#c0b8a9' }}>{a.rendimiento}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}

          {uso?.enProyectoActivo && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="small" style={{ color: '#8c8578' }}>
                En el proyecto activo afecta a <strong style={{ color: '#f4efe6' }}>{uso.enProyectoActivo.actividades}</strong> actividad(es),
                por un valor de <strong style={{ color: '#b69462' }}>{money(uso.enProyectoActivo.valorAfectado)}</strong>.
              </p>
            </div>
          )}
        </>
      )}
    </FormModal>
  );
}

/** Cambio de precio en dos fases: primero el impacto, después la confirmación. */
function ModalCambioPrecio({ insumo, onClose, onAplicado }: { insumo: Insumo; onClose: () => void; onAplicado: () => void }) {
  const [valor, setValor] = useState(String(aNumero(insumo.valorUnitario)));
  const [motivo, setMotivo] = useState('');
  const [impacto, setImpacto] = useState<Impacto | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [confirmacionReforzada, setConfirmacionReforzada] = useState('');
  // El aviso flotante se va solo y deja al usuario sin saber qué pasó; el
  // motivo del rechazo se queda escrito en el modal.
  const [fallo, setFallo] = useState<{ mensaje: string; status?: number } | null>(null);

  const nuevoValor = parseFloat(valor);
  const valido = Number.isFinite(nuevoValor) && nuevoValor >= 0;

  const analizar = async () => {
    if (!valido) {
      showNotification('Atención', 'warning', 'El valor debe ser un número mayor o igual a cero.');
      return;
    }
    setAnalizando(true);
    setFallo(null);
    const actual = aNumero(insumo.valorUnitario);
    // Solo lectura: mirar el impacto no puede cambiar nada.
    let apus = insumo.usoEnApus ?? 0;
    let usoDesconocido = insumo.usoEnApus === undefined;
    try {
      const uso: any = extractData(await apiService.getUsoInsumo(insumo.id));
      const lista = uso?.apus ?? uso?.items ?? uso;
      if (Array.isArray(lista)) { apus = lista.length; usoDesconocido = false; }
      else if (typeof uso?.apus === 'number') { apus = uso.apus; usoDesconocido = false; }
    } catch {
      // Sin /usage no se puede decir a cuántos APUs afecta, pero el cambio de
      // precio sigue siendo posible: se avisa en vez de bloquear.
    }
    const variacionPct = actual > 0 ? ((nuevoValor - actual) / actual) * 100 : 0;
    setImpacto({
      valorActual: actual,
      valorPropuesto: nuevoValor,
      variacionPct,
      superaUmbral: Math.abs(variacionPct) > UMBRAL_VARIACION_PCT,
      apus,
      usoDesconocido,
    });
    setAnalizando(false);
  };

  const aplicar = async () => {
    if (!impacto) return;
    setAplicando(true);
    setFallo(null);
    try {
      // Solo lo que acepta CreatePriceDto: un campo de más lo rechaza el
      // ValidationPipe con 400 si tiene forbidNonWhitelisted.
      await apiService.setPrecioInsumo(insumo.id, {
        valor: nuevoValor,
        motivo: motivo.trim() || undefined,
      });
      showNotification('Correcto', 'success', 'Precio actualizado y propagado.');
      onAplicado();
    } catch (e: any) {
      setFallo({ mensaje: e?.message || 'No se pudo aplicar el cambio.', status: e?.status });
    } finally {
      setAplicando(false);
    }
  };

  // Una variación fuerte exige escribir el nombre del insumo antes de aplicar.
  const necesitaRefuerzo = impacto?.superaUmbral === true;
  const refuerzoOk = !necesitaRefuerzo || confirmacionReforzada.trim().toLowerCase() === insumo.descripcion.trim().toLowerCase();

  return (
    <FormModal
      title="Cambiar precio del insumo"
      subtitle={insumo.descripcion}
      maxWidth={560}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          {!impacto ? (
            <button type="button" className="btn btn-small" onClick={analizar} disabled={!valido || analizando} style={{ width: 'auto' }}>
              {analizando ? 'Calculando…' : 'Ver impacto'}
            </button>
          ) : (
            <button type="button" className="btn btn-small" onClick={aplicar} disabled={aplicando || !refuerzoOk} style={{ width: 'auto' }}>
              {aplicando ? 'Aplicando…' : 'Confirmar y aplicar'}
            </button>
          )}
        </>
      }
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 12 }}>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Precio actual</label>
            <div className="input" style={{ display: 'flex', alignItems: 'center', color: '#8c8578' }}>{money(insumo.valorUnitario)}</div>
          </div>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Nuevo precio</label>
            <input
              className="input"
              type="number"
              min={0}
              step={1}
              value={valor}
              onChange={(e) => { setValor(e.target.value); setImpacto(null); }}
              autoFocus
            />
          </div>
        </div>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Motivo del cambio</label>
          <input
            className="input"
            value={motivo}
            onChange={(e) => { setMotivo(e.target.value); setImpacto(null); }}
            placeholder="Actualización proveedor agosto"
          />
          <p className="small" style={{ color: '#8c8578', marginTop: 4 }}>
            Queda registrado con tu usuario y la fecha: el precio es una serie histórica, no se sobrescribe.
          </p>
        </div>

        {fallo && (
          <div style={{ display: 'flex', gap: 9, padding: '11px 13px', borderRadius: 11, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.28)' }}>
            <AlertTriangle size={16} color="#ff6b6b" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ minWidth: 0 }}>
              <p className="small" style={{ color: '#ffb4b4', wordBreak: 'break-word' }}>{fallo.mensaje}</p>
              {fallo.status === 404 && (
                <p className="small" style={{ color: '#8c8578', marginTop: 5 }}>
                  El backend todavía no tiene <code>POST /costos/catalog/supplies/:id/prices</code>.
                  No es un problema del formulario: no hay dónde guardar el cambio.
                </p>
              )}
            </div>
          </div>
        )}

        {impacto && (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: impacto.superaUmbral ? 'rgba(255,149,0,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${impacto.superaUmbral ? 'rgba(255,149,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {impacto.superaUmbral && <AlertTriangle size={16} color="#ff9500" />}
              <strong style={{ fontSize: 14 }}>
                {money(impacto.valorActual)} → {money(impacto.valorPropuesto)}{' '}
                <span style={{ color: impacto.variacionPct >= 0 ? '#34d399' : '#ff6b6b' }}>
                  ({impacto.variacionPct >= 0 ? '+' : ''}{impacto.variacionPct.toFixed(2)} %)
                </span>
              </strong>
            </div>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, margin: 0, padding: 0 }}>
              {impacto.usoDesconocido ? (
                <li className="small" style={{ color: '#8c8578' }}>
                  No se pudo consultar en cuántos APUs se usa este insumo.
                </li>
              ) : (
                <li className="small">Afecta a <strong>{impacto.apus}</strong> APU(s) del catálogo</li>
              )}
              <li className="small" style={{ color: '#8c8578' }}>
                Los presupuestos en borrador se recalculan; los aprobados conservan su precio congelado.
              </li>
              <li className="small" style={{ color: '#8c8578' }}>
                Se añade a la serie histórica: el precio anterior no se borra.
              </li>
            </ul>

            {necesitaRefuerzo && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,149,0,0.2)' }}>
                <label className="small" style={{ display: 'block', marginBottom: 6, color: '#ff9500' }}>
                  La variación supera el umbral. Escribe el nombre del insumo para confirmar:
                </label>
                <input className="input" value={confirmacionReforzada} onChange={(e) => setConfirmacionReforzada(e.target.value)} placeholder={insumo.descripcion} />
              </div>
            )}
          </div>
        )}
      </div>
    </FormModal>
  );
}
