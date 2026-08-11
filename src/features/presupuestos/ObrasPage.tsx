import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat, Plus, Trash2, Copy, RotateCcw, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { ETIQUETA_TIPO_OBRA, money, aNumero, type NuevoProyecto, type Proyecto, type TipoObra } from './types';
import { proyectoABackend, proyectoDesdeBackend, proyectosDesdeBackend } from './mapeo';

const hoy = () => new Date().toISOString().slice(0, 10);

const proyectoEnBlanco = (): NuevoProyecto => ({
  nombre: '',
  cliente: '',
  ubicacion: '',
  areaM2: 0,
  tipoObra: 'REMODELACION',
  fecha: hoy(),
  descuento: 0,
});

/** Campos por los que se puede ordenar el listado (RN-03.3). */
type Columna = 'nombre' | 'cliente' | 'fecha' | 'areaM2' | 'costoDirecto' | 'total';

/** HU-01 y HU-03 · Listado de proyectos, duplicado, papelera y creación. */
export function ObrasPage() {
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState<NuevoProyecto>(proyectoEnBlanco);
  const [guardando, setGuardando] = useState(false);
  const [orden, setOrden] = useState<{ campo: Columna; asc: boolean }>({ campo: 'fecha', asc: false });
  const [aEliminar, setAEliminar] = useState<Proyecto | null>(null);
  const [verPapelera, setVerPapelera] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = extractData(await apiService.getObraProyectos());
      setProyectos(proyectosDesdeBackend(data));
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar los proyectos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // El orden se aplica en el cliente sobre lo ya cargado: el listado de
  // proyectos de un usuario es corto y así responde sin ir al servidor.
  const ordenados = useMemo(() => {
    const val = (p: Proyecto) => {
      const v = p[orden.campo];
      if (orden.campo === 'areaM2' || orden.campo === 'costoDirecto' || orden.campo === 'total') return aNumero(v as any);
      return String(v ?? '').toLowerCase();
    };
    return [...proyectos].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va === vb) return 0;
      return (va < vb ? -1 : 1) * (orden.asc ? 1 : -1);
    });
  }, [proyectos, orden]);

  const ordenarPor = (campo: Columna) =>
    setOrden((o) => ({ campo, asc: o.campo === campo ? !o.asc : true }));

  // RN-03.4 · Copia presupuesto, cantidades y AIU; el original no se toca.
  const duplicar = async (p: Proyecto) => {
    const nombre = window.prompt('Nombre del proyecto duplicado:', `${p.nombre} (copia)`);
    if (nombre === null) return;
    try {
      const creado = proyectoDesdeBackend(extractData(await apiService.duplicarObraProyecto(p.id, nombre.trim() || undefined)));
      showNotification('Correcto', 'success', 'Proyecto duplicado con su presupuesto y su AIU.');
      if (creado?.id) navigate(`/obra/${creado.id}/presupuesto`);
      else cargar();
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo duplicar el proyecto.');
    }
  };

  const patch = (p: Partial<NuevoProyecto>) => setForm((f) => ({ ...f, ...p }));

  const abrirNuevo = () => { setForm(proyectoEnBlanco()); setModalAbierto(true); };

  const crear = async () => {
    // El área es obligatoria: divide todos los indicadores de la analítica.
    if (!form.nombre.trim()) {
      showNotification('Atención', 'warning', 'El proyecto necesita un nombre.');
      return;
    }
    if (!(form.areaM2 > 0)) {
      showNotification('Atención', 'warning', 'El área en m² debe ser mayor que cero.');
      return;
    }
    setGuardando(true);
    try {
      // El backend espera area_m2 / tipo_obra y el AIU anidado, no los nombres
      // de la interfaz: la traducción va en mapeo.ts.
      const cuerpo = proyectoABackend({ ...form, nombre: form.nombre.trim() });
      const creado = proyectoDesdeBackend(extractData(await apiService.createObraProyecto(cuerpo)));
      showNotification('Correcto', 'success', 'Proyecto de obra creado.');
      setModalAbierto(false);
      if (creado?.id) navigate(`/obra/${creado.id}/presupuesto`);
      else setProyectos((ps) => [creado, ...ps].filter(Boolean));
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo crear el proyecto.');
    } finally {
      setGuardando(false);
    }
  };

  // RN-03.5 · Borrar un proyecto entero es destructivo de verdad: pide escribir
  // el nombre. No basta un "¿seguro?", que se acepta sin leer.
  const eliminar = async (p: Proyecto) => {
    try {
      await apiService.deleteObraProyecto(p.id);
      setProyectos((ps) => ps.filter((x) => x.id !== p.id));
      setAEliminar(null);
      showNotification('En la papelera', 'success', `"${p.nombre}" se puede recuperar desde la papelera.`);
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo eliminar.');
    }
  };

  return (
    <main>
      <div className="flex-between" style={{ marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(22px, 6vw, 32px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <HardHat size={28} color="#b69462" /> Presupuestos de Obra
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-small btn-secondary" onClick={() => setVerPapelera(true)} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Trash2 size={15} /> Papelera
          </button>
          <button type="button" className="btn btn-small" onClick={abrirNuevo} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Nuevo proyecto
          </button>
        </div>
      </div>
      <p className="small" style={{ marginBottom: 16 }}>
        Presupuesta la obra por capítulos y actividades a partir de análisis de precios unitarios (APU).
      </p>

      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Cargando proyectos…</p>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
          <p className="small" style={{ color: '#8c8578', marginTop: 8 }}>
            El módulo necesita los endpoints de presupuestos de obra en el servidor.
          </p>
        </div>
      ) : proyectos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>Aún no tienes proyectos de obra.</p>
          <button type="button" className="btn mt-2" onClick={abrirNuevo} style={{ width: 'auto' }}>
            Crear mi primer proyecto
          </button>
        </div>
      ) : (
        <>
          {/* Orden por cualquiera de los campos del listado (RN-03.3) */}
          <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="small" style={{ color: '#8c8578' }}>Ordenar por</span>
            {([
              ['fecha', 'Fecha'], ['nombre', 'Nombre'], ['cliente', 'Cliente'],
              ['areaM2', 'Área'], ['costoDirecto', 'Costo directo'], ['total', 'Total'],
            ] as [Columna, string][]).map(([campo, etiqueta]) => {
              const activo = orden.campo === campo;
              return (
                <button
                  key={campo}
                  type="button"
                  onClick={() => ordenarPor(campo)}
                  className="small"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 999,
                    cursor: 'pointer', font: 'inherit',
                    background: activo ? 'rgba(182,148,98,0.16)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${activo ? 'rgba(182,148,98,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: activo ? '#e9dcc2' : '#9b9486',
                  }}
                >
                  {etiqueta}
                  {activo && (orden.asc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {ordenados.map((p) => (
              <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/obra/${p.id}/presupuesto`)}
                  style={{ flex: '1 1 200px', textAlign: 'left', background: 'transparent', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0, minWidth: 0 }}
                >
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{p.nombre || 'Proyecto sin nombre'}</div>
                  <p className="small">{[p.cliente, p.ubicacion].filter(Boolean).join(' · ') || '—'}</p>
                  <p className="small" style={{ color: '#8c8578' }}>
                    {p.areaM2 ? `${p.areaM2} m²` : 'sin área'}
                    {p.tipoObra ? ` · ${ETIQUETA_TIPO_OBRA[p.tipoObra] ?? p.tipoObra}` : ''}
                    {p.fecha ? ` · ${p.fecha}` : ''}
                  </p>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="small" style={{ color: '#8c8578' }}>Costo directo</div>
                    <div className="small" style={{ color: '#c0b8a9' }}>{money(p.costoDirecto)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="small" style={{ color: '#8c8578' }}>Total</div>
                    <div style={{ fontWeight: 700, color: '#b69462' }}>{money(p.total)}</div>
                  </div>
                  <button type="button" className="btn btn-small btn-secondary" onClick={() => duplicar(p)} style={{ width: 'auto' }} aria-label={`Duplicar ${p.nombre}`} title="Duplicar con su presupuesto y AIU">
                    <Copy size={15} />
                  </button>
                  <button type="button" className="btn btn-small btn-danger" onClick={() => setAEliminar(p)} style={{ width: 'auto' }} aria-label={`Eliminar ${p.nombre}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {aEliminar && (
        <ModalEliminarProyecto proyecto={aEliminar} onClose={() => setAEliminar(null)} onConfirmar={() => eliminar(aEliminar)} />
      )}

      {verPapelera && (
        <ModalPapelera onClose={() => setVerPapelera(false)} onRestaurado={() => { setVerPapelera(false); cargar(); }} />
      )}

      {modalAbierto && (
        <FormModal
          title="Nuevo proyecto de obra"
          subtitle="El área en m² es obligatoria: con ella se calculan todos los indicadores por metro cuadrado."
          onClose={() => setModalAbierto(false)}
          footer={
            <>
              <button type="button" className="btn btn-small btn-secondary" onClick={() => setModalAbierto(false)} style={{ width: 'auto' }}>Cancelar</button>
              <button type="button" className="btn btn-small" onClick={crear} disabled={guardando} style={{ width: 'auto' }}>
                {guardando ? 'Creando…' : 'Crear proyecto'}
              </button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre de la obra</label>
              <input className="input" value={form.nombre} onChange={(e) => patch({ nombre: e.target.value })} placeholder="Remodelación apartamento 80 m²" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 12 }}>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Cliente</label>
                <input className="input" value={form.cliente} onChange={(e) => patch({ cliente: e.target.value })} />
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Ubicación</label>
                <input className="input" value={form.ubicacion} onChange={(e) => patch({ ubicacion: e.target.value })} placeholder="Bogotá D.C." />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 12 }}>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Área (m²)</label>
                <input className="input" type="number" min={0} step={0.01} value={form.areaM2 || ''} onChange={(e) => patch({ areaM2: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Tipo de obra</label>
                <select className="select" value={form.tipoObra} onChange={(e) => patch({ tipoObra: e.target.value as TipoObra })}>
                  {Object.entries(ETIQUETA_TIPO_OBRA).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Fecha</label>
                <input className="input" type="date" value={form.fecha} onChange={(e) => patch({ fecha: e.target.value })} />
              </div>
            </div>
          </div>
        </FormModal>
      )}
    </main>
  );
}

/**
 * RN-03.5 · Eliminar un proyecto exige escribir su nombre.
 *
 * Un "¿seguro?" se acepta sin leer. Escribir el nombre obliga a mirar cuál es
 * el proyecto que se está borrando, que es justo el error que se quiere evitar
 * cuando hay varias obras en paralelo con nombres parecidos.
 */
function ModalEliminarProyecto({
  proyecto,
  onClose,
  onConfirmar,
}: {
  proyecto: Proyecto;
  onClose: () => void;
  onConfirmar: () => void;
}) {
  const [texto, setTexto] = useState('');
  const coincide = texto.trim().toLowerCase() === proyecto.nombre.trim().toLowerCase();

  return (
    <FormModal
      title="Eliminar proyecto"
      subtitle="Pasa a la papelera y se puede recuperar desde allí."
      maxWidth={520}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          <button type="button" className="btn btn-small btn-danger" onClick={onConfirmar} disabled={!coincide} style={{ width: 'auto' }}>
            Eliminar
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 9, padding: '10px 12px', borderRadius: 10, marginBottom: 14, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.28)' }}>
        <AlertTriangle size={15} color="#ff6b6b" style={{ flexShrink: 0, marginTop: 1 }} />
        <span className="small" style={{ color: '#d8cbb4' }}>
          Se eliminará el proyecto con todo su presupuesto. No se borra de inmediato: queda en la papelera.
        </span>
      </div>
      <label className="small" style={{ display: 'block', marginBottom: 6 }}>
        Escribe <strong style={{ color: '#f4efe6' }}>{proyecto.nombre}</strong> para confirmar:
      </label>
      <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={proyecto.nombre} autoFocus />
    </FormModal>
  );
}

/** HU-03 · Papelera: proyectos eliminados, recuperables. */
function ModalPapelera({ onClose, onRestaurado }: { onClose: () => void; onRestaurado: () => void }) {
  const [items, setItems] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurando, setRestaurando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setItems(proyectosDesdeBackend(extractData(await apiService.getObraPapelera())));
    } catch (e: any) {
      setItems([]);
      setError(e?.message || 'No se pudo cargar la papelera.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const restaurar = async (p: Proyecto) => {
    setRestaurando(p.id);
    try {
      await apiService.restaurarObraProyecto(p.id);
      showNotification('Restaurado', 'success', `"${p.nombre}" volvió a tus proyectos.`);
      onRestaurado();
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo restaurar.');
    } finally {
      setRestaurando(null);
    }
  };

  return (
    <FormModal
      title="Papelera"
      subtitle="Proyectos eliminados. Se conservan un tiempo antes de depurarse definitivamente."
      maxWidth={560}
      onClose={onClose}
      footer={<button type="button" className="btn btn-small" onClick={onClose} style={{ width: 'auto' }}>Cerrar</button>}
    >
      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Cargando…</p>
      ) : error ? (
        <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
      ) : items.length === 0 ? (
        <p className="small" style={{ color: '#8c8578' }}>La papelera está vacía.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
          {items.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                <p className="small" style={{ color: '#8c8578' }}>
                  {[p.cliente, p.areaM2 ? `${p.areaM2} m²` : null, money(p.total)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button type="button" className="btn btn-small btn-secondary" onClick={() => restaurar(p)} disabled={restaurando === p.id} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RotateCcw size={14} /> {restaurando === p.id ? 'Restaurando…' : 'Restaurar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </FormModal>
  );
}
