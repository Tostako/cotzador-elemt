import { useNavigate } from 'react-router-dom';
import { useStore } from '../../shared/services/store';
import { useAppStore } from '../../shared/hooks/useNotifications';
import { QuoteStep1 } from './QuoteStep1';
import { QuoteStep2 } from './QuoteStep2';
import { QuoteStep3 } from './QuoteStep3';
import { QuoteStep4 } from './QuoteStep4';
import { QuoteStep5 } from './QuoteStep5';
import { calculateArea, calculatePrice } from '../../shared/services/calculator';

export function QuotePage() {
  const navigate = useNavigate();
  const showNotification = useAppStore((s) => s.showNotification);
  const { formData, config, quoteStep, setQuoteStep, resetForm, addQuote, updateQuote, editingQuoteId, setEditingQuoteId } = useStore();

  const isEditing = editingQuoteId !== null;
  const area = calculateArea(formData);
  const price = calculatePrice(formData, config);

  const nextStep = () => {
    if (quoteStep === 1 && (!formData.client.trim() || !formData.project.trim())) {
      showNotification('Ingresa nombre de cliente y proyecto', 'warning');
      return;
    }
    setQuoteStep(quoteStep + 1);
  };

  const prevStep = () => {
    if (isEditing && quoteStep === 1) {
      // Cancel edit and go back
      setEditingQuoteId(null);
      resetForm();
    }
    setQuoteStep(quoteStep - 1);
  };

  const saveQuote = () => {
    const payload = {
      date: new Date().toISOString().split('T')[0],
      client: formData.client,
      project: formData.project,
      area: area.total,
      price: price,
      data: formData, // Send as object, NOT string — SaaS expects JSONB
    };

    if (isEditing) {
      // PATCH existing quote
      updateQuote(editingQuoteId, payload);
      showNotification('¡Cotización actualizada correctamente!', 'success');
      setEditingQuoteId(null);
    } else {
      // POST new quote
      const quote = { id: Date.now(), status: 'draft' as const, ...payload };
      addQuote(quote);
      showNotification('¡Cotización guardada correctamente!', 'success');
    }

    resetForm();
    setQuoteStep(1);
    navigate('/history');
  };

  return (
    <main>
      <div className="step-indicator">Paso {quoteStep} de 5</div>
      <h1>
        {quoteStep === 1 && 'Datos del cliente'}
        {quoteStep === 2 && 'Área del terreno'}
        {quoteStep === 3 && 'Área de volados'}
        {quoteStep === 4 && 'Servicios'}
        {quoteStep === 5 && 'Resumen'}
      </h1>

      {quoteStep === 1 && <QuoteStep1 />}
      {quoteStep === 2 && <QuoteStep2 />}
      {quoteStep === 3 && <QuoteStep3 />}
      {quoteStep === 4 && <QuoteStep4 />}
      {quoteStep === 5 && <QuoteStep5 area={area} price={price} />}

      <div className="flex-between mt-2" style={{ gap: 12 }}>
        {quoteStep > 1 ? (
          <button className="btn btn-secondary" onClick={prevStep} style={{ flex: 1 }}>
            ← ATRÁS
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={() => { if (isEditing) { setEditingQuoteId(null); resetForm(); } navigate('/dashboard'); }} style={{ flex: 1 }}>
            {isEditing ? '✕ CANCELAR' : '← INICIO'}
          </button>
        )}
        {quoteStep < 5 ? (
          <button className="btn" onClick={nextStep} style={{ flex: 2 }}>
            CONTINUAR →
          </button>
        ) : (
          <button className="btn" onClick={saveQuote} style={{ flex: 2 }}>
            {isEditing ? '↻ ACTUALIZAR' : 'GUARDAR'}
          </button>
        )}
      </div>
    </main>
  );
}
