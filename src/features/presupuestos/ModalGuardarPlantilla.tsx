import { useMemo, useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { apiService, type ApiError } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { codigoSugerido } from './mapeo';
import { money, type Presupuesto, type Proyecto } from './types';

/**
 * HU-02 · Guardar el presupuesto actual como plantilla.
 *
 * Es como nace una plantilla de verdad: montas una obra tipo, funciona, y la
 * reutilizas. No hay editor de plantillas aparte —sería duplicar el editor de
 * presupuestos—: para cambiar una, se aplica a un proyecto, se ajusta y se
 * vuelve a guardar.
 *
 * Solo se guarda el APU y la cantidad de cada actividad. Los precios no: el
 * `valor_referencia` lo recalcula el servidor con los precios vigentes cada
 * vez que se consulta, que es lo que hace útil una plantilla vieja.
 */
export function ModalGuardarPlantilla({
  proyecto,
  presupuesto,
  onClose,
  onGuardada,
}: {
  proyecto: Proyecto | null;
  presupuesto: Presupuesto | null;
  onClose: () => void;
  onGuardada: () => void;
}) {
  // Solo para mostrar cuántas se van a copiar: el que las copia es el
  // servidor, a partir de `project_id`.
  const totalActividades = useMemo(
    () => (presupuesto?.capitulos ?? []).reduce((s, c) => s + (c.actividades?.length ?? 0), 0),
    [presupuesto],
  );

  const [nombre, setNombre] = useState(proyecto?.nombre ?? '');
  const [codigo, setCodigo] = useState(() => codigoSugerido(proyecto?.nombre ?? '', 20));
  const [alcance, setAlcance] = useState('');
  const [area, setArea] = useState(String(proyecto?.areaM2 ?? ''));
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const guardar = async () => {
    if (!nombre.trim()) {
      showNotification('Falta el nombre', 'warning', 'La plantilla necesita un nombre.');
      return;
    }
    if (!codigo.trim()) {
      showNotification('Falta el código', 'warning', 'La plantilla necesita un código.');
      return;
    }
    setGuardando(true);
    setFallo(null);
    try {
      // Se manda `project_id` y el servidor copia los items. Antes se extraían
      // los `apu_id` del snapshot de cada actividad, y bastaba con que un item
      // no lo trajera para quedarse sin actividades y recibir un
      // ACTIVIDADES_REQUERIDAS que no explicaba nada.
      await apiService.crearPlantilla({
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        alcance: alcance.trim() || undefined,
        area_referencia: area.trim() ? Number(area) : undefined,
        project_id: proyecto?.id,
      });
      showNotification('Guardada', 'success', `"${nombre.trim()}" ya está disponible como plantilla.`);
      onGuardada();
    } catch (e) {
      // Los códigos del servidor dicen exactamente qué corregir; el mensaje
      // genérico deja al usuario adivinando.
      const err = e as ApiError;
      const porCodigo: Record<string, string> = {
        PLANTILLA_CODIGO_EXISTENTE: `Ya existe una plantilla con el código "${codigo.trim()}". Usa otro.`,
        PLANTILLA_SIN_ACTIVIDADES: 'El presupuesto no tiene actividades que copiar.',
        ACTIVIDADES_REQUERIDAS: 'No se pudo identificar el proyecto de origen. Recarga y vuelve a intentarlo.',
      };
      setFallo((err?.codigo && porCodigo[err.codigo]) || err?.message || 'No se pudo guardar la plantilla.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal
      title="Guardar como plantilla"
      subtitle="Reutiliza este presupuesto como punto de partida de otras obras."
      maxWidth={520}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          <button type="button" className="btn btn-small" onClick={guardar} disabled={guardando || totalActividades === 0} style={{ width: 'auto' }}>
            {guardando ? 'Guardando…' : `Guardar ${totalActividades} actividad(es)`}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre *</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Local comercial 50 m²" autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 12 }}>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Código *</label>
            <input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="LOCAL-50" />
          </div>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Área de referencia (m²)</label>
            <input className="input" type="number" min={0} step={0.01} value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Alcance</label>
          <input className="input" value={alcance} onChange={(e) => setAlcance(e.target.value)}
            placeholder="Adecuación comercial: pisos, pintura y eléctrico" />
        </div>

        <div style={{ padding: '11px 13px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex-between" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="small" style={{ color: '#8c8578' }}>Se guardarán</span>
            <span style={{ fontWeight: 700 }}>{totalActividades} actividad(es)</span>
          </div>
          <p className="small" style={{ color: '#8c8578', marginTop: 6 }}>
            Solo el APU y la cantidad de cada una. El valor se recalcula con los precios
            vigentes cada vez que consultes la plantilla, así que no envejece.
            {presupuesto?.totales?.costoDirecto && ` Hoy sería ${money(presupuesto.totales.costoDirecto)} de costo directo.`}
          </p>
        </div>

        {totalActividades === 0 && (
          <div style={{ display: 'flex', gap: 9, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)' }}>
            <LayoutTemplate size={15} color="#ff6b6b" style={{ flexShrink: 0, marginTop: 1 }} />
            <p className="small" style={{ color: '#ffb4b4' }}>
              No hay actividades que guardar. Agrega alguna al presupuesto primero.
            </p>
          </div>
        )}

        {fallo && (
          <p className="small" style={{ color: '#ff6b6b', wordBreak: 'break-word' }}>{fallo}</p>
        )}
      </div>
    </FormModal>
  );
}
