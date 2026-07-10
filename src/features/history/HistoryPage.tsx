import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../shared/services/store';
import { showNotification } from '../../shared/hooks/useNotifications';
import { safeParseQuoteData } from '../../shared/utils/parseQuoteData';
import type { Quote } from '../../shared/types';
import { BackButton } from '../../shared/components/BackButton';
import { QuoteList } from './components/QuoteList';
import { QuoteOptionsModal } from './components/QuoteOptionsModal';
import { SummaryModal } from './components/SummaryModal';
import { EstimationModal } from './components/EstimationModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';

export function HistoryPage() {
  const navigate = useNavigate();
  const { quotes, paymentPlans, loadPaymentPlans, deleteQuote, setFormData, setQuoteStep, setEditingQuoteId } = useStore();

  useEffect(() => {
    if (paymentPlans.length === 0) {
      loadPaymentPlans();
    }
  }, [paymentPlans.length, loadPaymentPlans]);

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<number | string | null>(null);
  const [showEstimation, setShowEstimation] = useState(false);
  const [estimationQuote, setEstimationQuote] = useState<Quote | null>(null);
  const [estimationType, setEstimationType] = useState<string>('obraNegra');
  const [showSummary, setShowSummary] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<number | string>>(new Set());

  const handleDelete = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuoteToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (quoteToDelete) {
      deleteQuote(quoteToDelete);
      showNotification('Correcto', 'success', 'La cotización fue eliminada correctamente.');
      setShowDeleteConfirm(false);
      setQuoteToDelete(null);
    }
  };

  const handleEdit = async (quote: Quote) => {
    if (quote.status === 'paid' || quote.status === 'completed') {
      showNotification('Atención', 'warning', 'No puedes editar una cotización finalizada.');
      return;
    }
    try {
      const { apiService, extractData } = await import('../../shared/services/api');
      const res = await apiService.getQuotePayments(quote.id);
      const payments = extractData(res);
      if (Array.isArray(payments) && payments.length > 0) {
        const hasConfirmed = payments.some((p: any) => p.status === 'confirmed' || p.status === 'approved');
        if (hasConfirmed) {
          showNotification('Atención', 'warning', 'No puedes editar una cotización con pagos registrados.');
          return;
        }
      }
    } catch {
      // Silently continue
    }
    const data = safeParseQuoteData(quote.data);
    if (!data) {
      showNotification('Error', 'error', 'Error al leer los datos de la cotización.');
      return;
    }
    setFormData(data);
    setQuoteStep(5);
    setEditingQuoteId(quote.id);
    navigate('/quote');
  };

  const handleCloneQuote = (quote: Quote) => {
    const data = safeParseQuoteData(quote.data);
    if (!data) {
      showNotification('Error', 'error', 'Error al leer los datos de la cotización.');
      return;
    }
    setFormData({
      ...data,
      parentQuoteId: quote.id,
      paymentPlanId: undefined,
      invoices: [],
      invoiceCount: 0,
    });
    setQuoteStep(4);
    setEditingQuoteId(null);
    setSelectedQuote(null);
    navigate('/quote');
  };

  const toggleParent = (id: number | string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleView = (quote: Quote) => {
    const data = safeParseQuoteData(quote.data);
    if (!data) {
      showNotification('Error', 'error', 'Error al leer los datos de la cotización.');
      return;
    }
    setFormData(data);
    setSelectedQuote(null);
    setShowSummary(true);
  };

  const handleInvoices = (quote: Quote) => {
    setSelectedQuote(null);
    navigate(`/quotes/${quote.id}/invoices`);
  };

  const handleEstimate = (quote: Quote) => {
    setEstimationQuote(quote);
    setEstimationType('obraNegra');
    setShowEstimation(true);
    setSelectedQuote(null);
  };

  const handleMarkCompleted = (quote: Quote) => {
    useStore.getState().updateQuote(quote.id, { status: 'completed' });
    showNotification('Correcto', 'success', 'La cotización fue marcada como finalizada.');
    setSelectedQuote(null);
  };

  return (
    <main>
      <BackButton />
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Historial</h1>
      <p className="small">{quotes.length} cotizaciones guardadas</p>

      {quotes.length > 0 ? (
        <div className="mt-2">
          <QuoteList
            quotes={quotes}
            expandedParents={expandedParents}
            onToggleParent={toggleParent}
            onDelete={handleDelete}
            onSelectQuote={setSelectedQuote}
          />
        </div>
      ) : (
        <div className="card mt-2" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small">No hay cotizaciones guardadas</p>
          <button type="button" className="btn mt-2" onClick={() => navigate('/quote')}>
            Crear Nueva
          </button>
        </div>
      )}

      {selectedQuote && !showDeleteConfirm && (
        <QuoteOptionsModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onView={handleView}
          onEdit={handleEdit}
          onClone={handleCloneQuote}
          onInvoices={handleInvoices}
          onEstimate={handleEstimate}
          onMarkCompleted={handleMarkCompleted}
        />
      )}

      {showSummary && <SummaryModal onClose={() => setShowSummary(false)} />}

      {showEstimation && estimationQuote && (
        <EstimationModal
          quote={estimationQuote}
          estimationType={estimationType}
          onClose={() => setShowEstimation(false)}
          onChangeType={setEstimationType}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
        />
      )}
    </main>
  );
}
