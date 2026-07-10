import { useNavigate } from 'react-router-dom';
import { useStore } from '../../shared/services/store';
import { showNotification } from '../../shared/hooks/useNotifications';
import { QuoteStep1 } from './QuoteStep1';
import { QuoteStep2 } from './QuoteStep2';
import { QuoteStep3 } from './QuoteStep3';
import { QuoteStep4 } from './QuoteStep4';
import { QuoteStep5 } from './QuoteStep5';
import { calculateArea, calculatePrice } from '../../shared/services/calculator';
import { ArrowLeft, ArrowRight, X, RefreshCw, Save } from 'lucide-react';

export function QuotePage() {
  const navigate = useNavigate();
  const { formData, config, quoteStep, setQuoteStep, resetForm, addQuote, updateQuote, editingQuoteId, setEditingQuoteId } = useStore();

  const isEditing = editingQuoteId !== null;
  const area = calculateArea(formData);
  const price = calculatePrice(formData, config);

  const nextStep = () => {
    if (quoteStep === 1 && (!formData.client.trim() || !formData.project.trim())) {
      showNotification('Atención', 'warning', 'Ingresa el nombre del cliente y el proyecto para continuar.');
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
      showNotification('Actualización correcta', 'success', 'La cotización fue actualizada correctamente.');
      setEditingQuoteId(null);
    } else {
      // POST new quote
      const quote = { id: Date.now(), status: 'draft' as const, ...payload };
      addQuote(quote);
      showNotification('Correcto', 'success', 'La cotización fue guardada correctamente.');
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
          <button type="button" className="btn btn-secondary" onClick={prevStep} style={{ flex: 1, gap: 6 }}>
            <ArrowLeft size={16} /> ATRÁS
          </button>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => { if (isEditing) { setEditingQuoteId(null); resetForm(); } navigate('/dashboard'); }} style={{ flex: 1, gap: 6 }}>
            {isEditing ? <><X size={16} /> CANCELAR</> : <><ArrowLeft size={16} /> INICIO</>}
          </button>
        )}
        {quoteStep < 5 ? (
          <button type="button" className="btn" onClick={nextStep} style={{ flex: 2, gap: 6 }}>
            CONTINUAR <ArrowRight size={16} />
          </button>
        ) : (
          <button type="button" className="btn" onClick={saveQuote} style={{ flex: 2, gap: 6 }}>
            {isEditing ? <><RefreshCw size={16} /> ACTUALIZAR</> : <><Save size={16} /> GUARDAR</>}
          </button>
        )}
      </div>
    </main>
  );
}
