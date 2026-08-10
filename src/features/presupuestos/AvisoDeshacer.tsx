import { useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';
import { apiService } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';

/**
 * HU-07 · Aviso flotante con opción de deshacer (decisión H-09).
 *
 * El borrado es lógico y el servidor devuelve un token con diez segundos de
 * vigencia. En vez de pedir confirmación *antes* —que interrumpe el trabajo en
 * cada eliminación— se ejecuta la acción y se ofrece revertirla después, que es
 * el patrón que respeta el ritmo de quien está presupuestando.
 *
 * El endpoint /undo es genérico: sirve igual para eliminar una actividad,
 * limpiar el presupuesto o aplicar una plantilla.
 */
export function AvisoDeshacer({
  token,
  mensaje,
  expiraEn,
  onDeshecho,
  onCerrar,
}: {
  token: string;
  mensaje: string;
  /** Marca de tiempo ISO que manda el servidor; si no viene se asumen 10 s. */
  expiraEn?: string;
  onDeshecho: () => void;
  onCerrar: () => void;
}) {
  const [restantes, setRestantes] = useState(() => {
    if (!expiraEn) return 10;
    const s = Math.ceil((new Date(expiraEn).getTime() - Date.now()) / 1000);
    return Number.isFinite(s) && s > 0 ? Math.min(s, 60) : 10;
  });
  const [deshaciendo, setDeshaciendo] = useState(false);

  // La cuenta atrás es visible a propósito: el usuario debe saber que la
  // ventana para revertir se está cerrando.
  useEffect(() => {
    if (restantes <= 0) { onCerrar(); return; }
    const t = setTimeout(() => setRestantes((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [restantes, onCerrar]);

  const deshacer = async () => {
    setDeshaciendo(true);
    try {
      await apiService.deshacer(token);
      showNotification('Deshecho', 'success', 'La acción se revirtió.');
      onDeshecho();
    } catch (e: any) {
      // 410 = el token expiró · 409 = el estado cambió y ya no se puede revertir
      const msg = String(e?.message || '');
      showNotification(
        'No se pudo deshacer',
        'warning',
        /410|expir/i.test(msg) ? 'Pasó el tiempo para deshacer esta acción.'
          : /409/.test(msg) ? 'El presupuesto cambió desde entonces y ya no se puede revertir.'
          : msg || 'Intenta de nuevo.'
      );
      onCerrar();
    } finally {
      setDeshaciendo(false);
    }
  };

  return (
    <div
      role="status"
      style={{
        position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 3000,
        display: 'flex', alignItems: 'center', gap: 14, maxWidth: 'min(520px, calc(100vw - 32px))',
        padding: '12px 14px 12px 18px', borderRadius: 14,
        background: 'rgba(20,19,18,0.92)', border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
        backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)',
      }}
    >
      <span className="small" style={{ flex: 1, minWidth: 0, color: '#e9e3d6' }}>{mensaje}</span>
      <button
        type="button"
        onClick={deshacer}
        disabled={deshaciendo}
        className="btn btn-small"
        style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
      >
        <Undo2 size={14} /> {deshaciendo ? 'Deshaciendo…' : `Deshacer (${restantes})`}
      </button>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar aviso"
        style={{ background: 'none', border: 'none', color: '#8c8578', cursor: 'pointer', padding: 4, lineHeight: 0, flexShrink: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
