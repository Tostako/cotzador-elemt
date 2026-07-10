import type { Quote } from '../../../shared/types';
import { FileText, Pencil, Copy, Receipt, Calculator, CircleCheck } from 'lucide-react';
import { useEscapeKey } from '../../../shared/hooks/useEscapeKey';

interface QuoteOptionsModalProps {
  quote: Quote;
  onClose: () => void;
  onView: (quote: Quote) => void;
  onEdit: (quote: Quote) => void;
  onClone: (quote: Quote) => void;
  onInvoices: (quote: Quote) => void;
  onEstimate: (quote: Quote) => void;
  onMarkCompleted: (quote: Quote) => void;
}

export function QuoteOptionsModal({
  quote,
  onClose,
  onView,
  onEdit,
  onClone,
  onInvoices,
  onEstimate,
  onMarkCompleted,
}: QuoteOptionsModalProps) {
  useEscapeKey(onClose);
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3 style={{ marginBottom: 12 }}>{quote.client}</h3>
        <p className="small mb-2">{quote.project}</p>
        <div style={{ display: 'grid', gap: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={() => onView(quote)} style={{ gap: 8 }}>
            <FileText size={16} /> Ver Resumen
          </button>
          {(quote.status !== 'paid' && quote.status !== 'completed') && (
            <button type="button" className="btn btn-secondary" onClick={() => onEdit(quote)} style={{ gap: 8 }}>
              <Pencil size={16} /> Editar
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => onClone(quote)} style={{ gap: 8 }}>
            <Copy size={16} /> Nueva cotización
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ gap: 8 }}
            onClick={() => onInvoices(quote)}
          >
            <Receipt size={16} /> Cuentas de Cobro
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ gap: 8 }}
            onClick={() => onEstimate(quote)}
          >
            <Calculator size={16} /> Realizar Estimación
          </button>
          {(quote.status !== 'paid' && quote.status !== 'completed') && (
            <button
              type="button"
              className="btn"
              style={{ background: '#34c759', gap: 8 }}
              onClick={() => onMarkCompleted(quote)}
            >
              <CircleCheck size={16} /> Marcar como Finalizada
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
