import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface FormModalProps {
  title: string;
  /** Texto de apoyo bajo el título. */
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Botones de acción fijos al pie (no scrollean con el contenido). */
  footer?: ReactNode;
  maxWidth?: number;
}

/**
 * Modal con formulario dentro: encabezado fijo, cuerpo scrolleable y pie con acciones.
 * Se cierra con Escape, con la X o tocando fuera.
 *
 * A diferencia de `Modal`, no exige un `message` y sirve para formularios largos:
 * en móvil el cuerpo scrollea solo y el pie queda siempre visible.
 */
export function FormModal({ title, subtitle, onClose, children, footer, maxWidth = 560 }: FormModalProps) {
  useEscapeKey(onClose);

  // Bloquea el scroll del fondo mientras el modal está abierto. Sin esto, en
  // Safari/Chrome de iOS la página sigue desplazándose detrás del overlay.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, []);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth, maxHeight: '86vh', padding: 0, display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 14px', borderBottom: '1px solid var(--color-line)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{title}</h3>
            {subtitle && <p className="small" style={{ color: '#8c8578', marginTop: 4 }}>{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ background: 'none', border: 'none', color: '#9b9486', cursor: 'pointer', padding: 4, lineHeight: 0, flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>{children}</div>

        {footer && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', padding: '14px 22px 20px', borderTop: '1px solid var(--color-line)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
