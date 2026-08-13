import { useCallback, useEffect, useState } from 'react';
import { LayoutTemplate, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { plantillasDesdeBackend } from './mapeo';
import { money, type Plantilla } from './types';

/** Solo las propias se pueden tocar; las del sistema vienen precargadas. */
const esPropia = (p: Plantilla) => (p.origen ?? 'PROPIA') === 'PROPIA';

/**
 * HU-02 · Arrancar el presupuesto desde una plantilla precargada.
 *
 * Si el presupuesto ya tiene actividades hay que elegir entre reemplazar y
 * agregar: el servidor nunca decide por el usuario, y sin `modo` responde 409.
 * Al aplicarla no queda vínculo con la plantilla — editarla después no afecta
 * al proyecto.
 */
export function ModalPlantillas({
  projectId,
  presupuestoTieneContenido,
  onClose,
  onAplicada,
}: {
  projectId: string;
  presupuestoTieneContenido: boolean;
  onClose: () => void;
  /** Recibe la respuesta del servidor: trae el undoToken para poder revertir. */
  onAplicada: (res?: any) => void;
}) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elegida, setElegida] = useState<Plantilla | null>(null);
  const [modo, setModo] = useState<'REEMPLAZAR' | 'AGREGAR'>('AGREGAR');
  const [aplicando, setAplicando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setPlantillas(plantillasDesdeBackend(extractData(await apiService.getPlantillas())));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar las plantillas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const borrar = async (p: Plantilla) => {
    // Aplicar una plantilla no deja vínculo con el proyecto, así que borrarla
    // no afecta a nada ya creado. Aun así se confirma: no hay deshacer.
    if (!window.confirm(`¿Eliminar la plantilla "${p.nombre}"?\n\nLos proyectos que ya la usaron no cambian.`)) return;
    try {
      await apiService.deletePlantilla(p.id);
      showNotification('Eliminada', 'success', `Se eliminó "${p.nombre}".`);
      if (elegida?.id === p.id) setElegida(null);
      cargar();
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo eliminar la plantilla.');
    }
  };

  const renombrar = async (p: Plantilla) => {
    const nombre = window.prompt('Nuevo nombre de la plantilla:', p.nombre);
    if (nombre === null || !nombre.trim() || nombre.trim() === p.nombre) return;
    try {
      await apiService.updatePlantilla(p.id, { nombre: nombre.trim() });
      showNotification('Guardada', 'success', 'Nombre actualizado.');
      cargar();
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo renombrar la plantilla.');
    }
  };

  const aplicar = async () => {
    if (!elegida) return;
    if (modo === 'REEMPLAZAR' && presupuestoTieneContenido) {
      if (!window.confirm('Se eliminarán las actividades actuales del presupuesto. ¿Continuar?')) return;
    }
    setAplicando(true);
    try {
      const res = extractData(await apiService.aplicarPlantilla(projectId, elegida.id, modo));
      const cargadas = res?.actividadesCargadas ?? 0;
      const omitidas = res?.actividadesOmitidas?.length ?? 0;
      // Una plantilla con un APU eliminado del catálogo no falla: lo omite y
      // lo reporta, así que hay que avisarlo en vez de dar por bueno el total.
      if (omitidas > 0) {
        showNotification('Aplicada con omisiones', 'warning',
          `${cargadas} actividad(es) cargada(s), ${omitidas} omitida(s) porque su APU ya no está en el catálogo.`);
      } else {
        showNotification('Correcto', 'success', `${cargadas} actividad(es) cargada(s) desde la plantilla.`);
      }
      onAplicada(res);
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo aplicar la plantilla.');
    } finally {
      setAplicando(false);
    }
  };

  return (
    <FormModal
      title="Arrancar desde una plantilla"
      subtitle="Carga capítulos y actividades ya costeados, valorizados con los precios de hoy."
      maxWidth={640}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          <button type="button" className="btn btn-small" onClick={aplicar} disabled={!elegida || aplicando} style={{ width: 'auto' }}>
            {aplicando ? 'Aplicando…' : 'Aplicar plantilla'}
          </button>
        </>
      }
    >
      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Cargando plantillas…</p>
      ) : error ? (
        <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
      ) : plantillas.length === 0 ? (
        <p className="small" style={{ color: '#999' }}>No hay plantillas disponibles.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
          {plantillas.map((p) => {
            const activa = elegida?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setElegida(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  padding: '11px 13px', borderRadius: 10, cursor: 'pointer', font: 'inherit', color: 'inherit',
                  background: activa ? 'rgba(182,148,98,0.14)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${activa ? 'rgba(182,148,98,0.45)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <LayoutTemplate size={17} color="#b69462" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    {p.nombre}
                    {p.codigo && <span className="small" style={{ color: '#8c8578', fontWeight: 500 }}>{p.codigo}</span>}
                    {/* Distinguir las del sistema evita que alguien busque por
                        qué no puede borrar una que no es suya. */}
                    {!esPropia(p) && (
                      <span className="small" style={{ padding: '1px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', color: '#8c8578', fontWeight: 500 }}>
                        del sistema
                      </span>
                    )}
                  </div>
                  <p className="small" style={{ color: '#8c8578' }}>
                    {[p.areaReferencia ? `${p.areaReferencia} m²` : null,
                      p.actividades ? `${p.actividades} actividades` : null,
                      p.alcance].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                {p.valorReferencia && (
                  <span style={{ fontWeight: 700, color: '#b69462', whiteSpace: 'nowrap' }}>{money(p.valorReferencia)}</span>
                )}
                {esPropia(p) && (
                  <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
                    <span role="button" tabIndex={0} title="Renombrar"
                      onClick={(e) => { e.stopPropagation(); renombrar(p); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); renombrar(p); } }}
                      style={{ padding: 5, borderRadius: 7, color: '#8c8578', cursor: 'pointer' }}>
                      <Pencil size={14} />
                    </span>
                    <span role="button" tabIndex={0} title="Eliminar"
                      onClick={(e) => { e.stopPropagation(); borrar(p); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); borrar(p); } }}
                      style={{ padding: 5, borderRadius: 7, color: '#ff6b6b', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* El modo solo importa si ya hay algo que se pueda perder. */}
      {elegida && presupuestoTieneContenido && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={15} color="#ff9500" />
            <span className="small" style={{ color: '#d8cbb4' }}>El presupuesto ya tiene actividades. Elige qué hacer:</span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <label className="small" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
              <input type="radio" name="modo-plantilla" checked={modo === 'AGREGAR'} onChange={() => setModo('AGREGAR')} style={{ marginTop: 3 }} />
              <span><strong>Agregar</strong> — se suman a las que ya tienes.</span>
            </label>
            <label className="small" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
              <input type="radio" name="modo-plantilla" checked={modo === 'REEMPLAZAR'} onChange={() => setModo('REEMPLAZAR')} style={{ marginTop: 3 }} />
              <span><strong>Reemplazar</strong> — se borran las actuales y quedan solo las de la plantilla.</span>
            </label>
          </div>
        </div>
      )}
    </FormModal>
  );
}
