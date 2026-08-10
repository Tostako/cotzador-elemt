import { useEffect, useState } from 'react';
import { LayoutTemplate, AlertTriangle } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { money } from './types';

interface Plantilla {
  id: string;
  nombre: string;
  descripcion?: string;
  areaM2?: number;
  actividades?: number;
  valorReferencia?: string;
}

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

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const d = extractData(await apiService.getPlantillas());
        const arr = Array.isArray(d) ? d : (d?.items ?? []);
        if (!cancel) {
          setPlantillas((Array.isArray(arr) ? arr : []).map((p: any) => ({
            id: String(p.id ?? ''),
            nombre: p.nombre ?? 'Plantilla',
            descripcion: p.descripcion,
            areaM2: p.areaM2 ?? p.area_m2,
            actividades: p.actividades ?? p.actividadesCount,
            valorReferencia: p.valorReferencia ?? p.valor_referencia,
          })));
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || 'No se pudieron cargar las plantillas.');
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

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
                  <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                  <p className="small" style={{ color: '#8c8578' }}>
                    {[p.areaM2 ? `${p.areaM2} m²` : null, p.actividades ? `${p.actividades} actividades` : null, p.descripcion]
                      .filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                {p.valorReferencia && (
                  <span style={{ fontWeight: 700, color: '#b69462', whiteSpace: 'nowrap' }}>{money(p.valorReferencia)}</span>
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
