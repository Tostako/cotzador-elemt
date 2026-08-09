import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat, Plus, Trash2 } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { ETIQUETA_TIPO_OBRA, money, type NuevoProyecto, type Proyecto, type TipoObra } from './types';
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

/** HU-01 · Listado de proyectos de obra y creación de uno nuevo. */
export function ObrasPage() {
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState<NuevoProyecto>(proyectoEnBlanco);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = extractData(await apiService.getObraProyectos());
        if (!cancel) setProyectos(proyectosDesdeBackend(data));
      } catch (e: any) {
        if (!cancel) setError(e?.message || 'No se pudieron cargar los proyectos.');
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

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

  const eliminar = async (p: Proyecto) => {
    if (!window.confirm(`¿Eliminar el proyecto "${p.nombre}"?`)) return;
    try {
      await apiService.deleteObraProyecto(p.id);
      setProyectos((ps) => ps.filter((x) => x.id !== p.id));
      showNotification('Correcto', 'success', 'Proyecto eliminado.');
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
        <button type="button" className="btn btn-small" onClick={abrirNuevo} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Nuevo proyecto
        </button>
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
        <div style={{ display: 'grid', gap: 12 }}>
          {proyectos.map((p) => (
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
                </p>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="small" style={{ color: '#8c8578' }}>Total</div>
                  <div style={{ fontWeight: 700, color: '#b69462' }}>{money(p.total)}</div>
                </div>
                <button type="button" className="btn btn-small btn-danger" onClick={() => eliminar(p)} style={{ width: 'auto' }} aria-label="Eliminar proyecto">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
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
