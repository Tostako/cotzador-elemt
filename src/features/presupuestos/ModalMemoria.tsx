import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { aNumero } from './types';

/** Una parte del metrado: "Sala 4,20 × 3,10". */
interface Parte {
  id: string;
  descripcion: string;
  largo: number;
  ancho: number;
  alto: number;
  cantidad: number;
}

const nuevaParte = (): Parte => ({
  id: 'p_' + Math.random().toString(36).slice(2, 9),
  descripcion: '', largo: 0, ancho: 0, alto: 0, cantidad: 1,
});

/** El subtotal ignora las dimensiones en cero: así una parte lineal (solo
 *  largo) o de área (largo × ancho) se escriben en la misma tabla. */
const subtotalParte = (p: Parte) => {
  const dims = [p.largo, p.ancho, p.alto].filter((d) => d > 0);
  const producto = dims.length ? dims.reduce((a, b) => a * b, 1) : 0;
  return producto * (p.cantidad || 0);
};

/**
 * HU-08 · Memoria de cálculo de una actividad.
 *
 * Sirve para defender la cantidad ante un cliente o una interventoría con el
 * soporte del cálculo, no con una afirmación. Pertenece a la actividad dentro
 * del proyecto, no al APU del catálogo: sustenta el metrado de ESTA obra.
 *
 * Si el usuario acepta que la memoria gobierne la cantidad, el campo de
 * cantidad del presupuesto pasa a ser de solo lectura y sale de aquí.
 */
export function ModalMemoria({
  projectId,
  itemId,
  descripcion,
  unidad,
  cantidadActual,
  onClose,
  onGuardado,
}: {
  projectId: string;
  itemId: string;
  descripcion: string;
  unidad: string;
  cantidadActual: number;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [partes, setPartes] = useState<Parte[]>([]);
  const [nota, setNota] = useState('');
  const [gobiernaCantidad, setGobierna] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const d = extractData(await apiService.getMemoria(projectId, itemId));
      const ps = Array.isArray(d?.partes) ? d.partes : [];
      setPartes(ps.map((p: any) => ({
        id: String(p.id ?? 'p_' + Math.random().toString(36).slice(2, 9)),
        descripcion: p.descripcion ?? '',
        largo: aNumero(p.largo), ancho: aNumero(p.ancho), alto: aNumero(p.alto),
        cantidad: aNumero(p.cantidad) || 1,
      })));
      setNota(d?.nota ?? '');
      setGobierna(!!(d?.gobiernaCantidad ?? d?.gobierna_cantidad));
    } catch {
      // Sin memoria previa se empieza con una parte en blanco.
      setPartes([nuevaParte()]);
    } finally {
      setCargando(false);
    }
  }, [projectId, itemId]);

  useEffect(() => { cargar(); }, [cargar]);

  const total = useMemo(() => partes.reduce((s, p) => s + subtotalParte(p), 0), [partes]);

  const patch = (id: string, cambio: Partial<Parte>) =>
    setPartes((ps) => ps.map((p) => (p.id === id ? { ...p, ...cambio } : p)));

  const guardar = async () => {
    // La memoria puede gobernar la cantidad; si no suma nada, no tiene sentido.
    if (gobiernaCantidad && !(total > 0)) {
      showNotification('Atención', 'warning', 'La memoria suma cero: no puede gobernar la cantidad.');
      return;
    }
    setGuardando(true);
    try {
      await apiService.updateMemoria(projectId, itemId, {
        partes: partes
          .filter((p) => p.descripcion.trim() || subtotalParte(p) > 0)
          .map((p) => ({ descripcion: p.descripcion.trim(), largo: p.largo, ancho: p.ancho, alto: p.alto, cantidad: p.cantidad })),
        nota: nota.trim() || undefined,
        gobiernaCantidad,
        // El servidor decide si aplica el total a la cantidad; se manda para
        // que no tenga que recalcularlo.
        total,
      });
      showNotification('Guardada', 'success',
        gobiernaCantidad ? `La cantidad pasa a ser ${total.toFixed(2)} ${unidad}, calculada desde la memoria.` : 'Memoria de cálculo guardada.');
      onGuardado();
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo guardar la memoria.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal
      title="Memoria de cálculo"
      subtitle={descripcion}
      maxWidth={720}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          <button type="button" className="btn btn-small" onClick={guardar} disabled={guardando || cargando} style={{ width: 'auto' }}>
            {guardando ? 'Guardando…' : 'Guardar memoria'}
          </button>
        </>
      }
    >
      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Cargando memoria…</p>
      ) : (
        <>
          <p className="small" style={{ color: '#8c8578', marginBottom: 12 }}>
            Desglosa el metrado por ambiente o por eje. Las medidas en cero se ignoran, así que
            una parte lineal lleva solo el largo y una de área lleva largo y ancho.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>Parte</th>
                  <th style={{ textAlign: 'right', padding: '6px 6px', color: '#8c8578', fontWeight: 500 }}>Largo</th>
                  <th style={{ textAlign: 'right', padding: '6px 6px', color: '#8c8578', fontWeight: 500 }}>Ancho</th>
                  <th style={{ textAlign: 'right', padding: '6px 6px', color: '#8c8578', fontWeight: 500 }}>Alto</th>
                  <th style={{ textAlign: 'right', padding: '6px 6px', color: '#8c8578', fontWeight: 500 }}>Cant.</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: '#8c8578', fontWeight: 500 }}>Subtotal</th>
                  <th style={{ padding: '6px 8px' }} />
                </tr>
              </thead>
              <tbody>
                {partes.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '5px 8px' }}>
                      <input className="input" value={p.descripcion} onChange={(e) => patch(p.id, { descripcion: e.target.value })}
                        placeholder="Sala" style={{ minWidth: 110, padding: '5px 8px' }} aria-label="Descripción de la parte" />
                    </td>
                    {(['largo', 'ancho', 'alto', 'cantidad'] as const).map((campo) => (
                      <td key={campo} style={{ padding: '5px 6px' }}>
                        <input className="input" type="number" min={0} step={0.01} value={p[campo] || ''}
                          onChange={(e) => patch(p.id, { [campo]: parseFloat(e.target.value) || 0 } as Partial<Parte>)}
                          style={{ width: 72, padding: '5px 6px', textAlign: 'right' }}
                          aria-label={`${campo} de ${p.descripcion || 'la parte'}`} />
                      </td>
                    ))}
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>{subtotalParte(p).toFixed(2)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                      <button type="button" onClick={() => setPartes((ps) => ps.filter((x) => x.id !== p.id))}
                        style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 3 }}
                        aria-label="Quitar parte">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className="btn btn-small btn-secondary mt-2" onClick={() => setPartes((ps) => [...ps, nuevaParte()])}
            style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Agregar parte
          </button>

          <div style={{ marginTop: 14 }}>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Nota (opcional)</label>
            <input className="input" value={nota} onChange={(e) => setNota(e.target.value)}
              placeholder="Medido en planos rev. 3, no incluye vanos" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ fontWeight: 700 }}>Total de la memoria</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#b69462' }}>{total.toFixed(2)} {unidad}</span>
          </div>

          {/* RN-08.3 · Si la memoria gobierna, la cantidad deja de escribirse a mano */}
          <label className="small" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={gobiernaCantidad} onChange={(e) => setGobierna(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              <strong>La cantidad se calcula desde esta memoria.</strong>{' '}
              <span style={{ color: '#8c8578' }}>
                El campo del presupuesto pasará a ser de solo lectura
                {total > 0 && cantidadActual !== total ? ` y cambiará de ${cantidadActual} a ${total.toFixed(2)} ${unidad}` : ''}.
              </span>
            </span>
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: '9px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Calculator size={15} color="#8c8578" style={{ flexShrink: 0, marginTop: 1 }} />
            <span className="small" style={{ color: '#8c8578' }}>
              La memoria puede incluirse en el PDF interno. Nunca sale por defecto en el PDF del cliente.
            </span>
          </div>
        </>
      )}
    </FormModal>
  );
}
