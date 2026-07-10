import { useEscapeKey } from '../../../shared/hooks/useEscapeKey';

interface DeleteConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ onClose, onConfirm }: DeleteConfirmModalProps) {
  useEscapeKey(onClose);
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3 style={{ marginBottom: 12 }}>Confirmar eliminación</h3>
        <p className="small mb-2">
          Estás a punto de eliminar esta cotización. Esta acción no se puede deshacer.
        </p>
        <div className="grid-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
