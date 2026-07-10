import { useState, useEffect } from 'react';
import { useStore } from '../../shared/services/store';
import type { AreaResult } from '../../shared/types';
import { CreditCard, TriangleAlert, Check, Settings, ClipboardCheck } from 'lucide-react';

interface QuoteStep5Props {
  area: AreaResult;
  price: number;
}

function RadioIndicator({ checked }: { checked: boolean }) {
  return (
    <div
      className="radio-indicator"
      style={{
        border: checked ? '2px solid #b69462' : '2px solid rgba(255,255,255,0.3)',
        background: checked ? '#b69462' : 'transparent',
      }}
    >
      {checked && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
    </div>
  );
}

export function QuoteStep5({ area, price }: QuoteStep5Props) {
  const { formData, config, setFormData, paymentPlans, loadPaymentPlans, editingQuoteId } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '' });
  const [hasPayments, setHasPayments] = useState(false);

  useEffect(() => {
    loadPaymentPlans();
  }, [loadPaymentPlans]);

  // Check if editing quote already has payments
  useEffect(() => {
    if (editingQuoteId) {
      const loadPayments = async () => {
        try {
          const { apiService, extractData } = await import('../../shared/services/api');
          const res = await apiService.getQuotePayments(editingQuoteId);
          const payments = extractData(res);
          if (Array.isArray(payments) && payments.length > 0) {
            const confirmed = payments.some((p: any) => p.status === 'confirmed' || p.status === 'approved');
            setHasPayments(confirmed);
          }
        } catch {
          // Silently fail
        }
      };
      loadPayments();
    } else {
      setHasPayments(false);
    }
  }, [editingQuoteId]);

  const basePrice = price + (formData.discount || 0);
  const finalPrice = price;

  // Determine selected plan ID: formData.paymentPlanId or undefined (manual)
  const selectedPlanId = formData.paymentPlanId;

  // Derive payment plan for THIS quote
  const selectedPlan = selectedPlanId !== undefined
    ? paymentPlans.find((p) => String(p.id) === String(selectedPlanId))
    : undefined;
  const planPayments = selectedPlan ? selectedPlan.installments : config.paymentPlan.payments;

  const handleSelectPlan = (planId: number | undefined) => {
    setFormData({ paymentPlanId: planId });
  };

  const addAdditionalService = () => {
    if (!newService.name.trim() || !newService.price) return;
    setFormData({
      additionalServices: [
        ...formData.additionalServices,
        {
          id: Date.now().toString(),
          name: newService.name.trim(),
          price: parseInt(newService.price) || 0,
          unit: '/unidad',
        },
      ],
    });
    setNewService({ name: '', price: '' });
    setShowForm(false);
  };

  const removeAdditionalService = (index: number) => {
    setFormData({
      additionalServices: formData.additionalServices.filter((_, i) => i !== index),
    });
  };

  const isPlanSelected = (planId: number | undefined) => {
    if (planId === undefined) return selectedPlanId === undefined;
    return String(selectedPlanId) === String(planId);
  };

  return (
    <>
      <div className="card mt-2">
        <h3 className="mb-1" style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{formData.client}</h3>
        <p className="small">{formData.project}</p>
        <p className="small mt-1">Área: {area.total.toFixed(2)} m²</p>
      </div>

      {/* Plan de pagos */}
      <div className="card">
        <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><CreditCard size={18} color="#b69462" /> Plan de Pagos</h3>
        {hasPayments ? (
          <div style={{ padding: 12, background: 'rgba(255,193,7,0.1)', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(255,193,7,0.3)' }}>
            <p className="small" style={{ color: '#ffc107', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TriangleAlert size={15} /> Esta cotización tiene pagos registrados. El plan de pagos no puede modificarse.
            </p>
          </div>
        ) : (
          <p className="small mb-2" style={{ color: '#999' }}>Elige uno de tus planes guardados o usa la configuración manual</p>
        )}

        {/* Opción: configuración manual actual */}
        <button
          type="button"
          disabled={hasPayments}
          onClick={() => handleSelectPlan(undefined)}
          className="plan-select-btn"
          style={{
            border: isPlanSelected(undefined) ? '2px solid #b69462' : '1px solid rgba(255,255,255,0.1)',
            background: isPlanSelected(undefined) ? 'rgba(182,148,98,0.08)' : 'rgba(255,255,255,0.03)',
            cursor: hasPayments ? 'not-allowed' : 'pointer',
            opacity: hasPayments ? 0.6 : 1,
          }}
        >
          <RadioIndicator checked={isPlanSelected(undefined)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Configuración actual</div>
            <div className="small" style={{ color: '#999' }}>
              {config.paymentPlan.payments.length} cuotas definidas manualmente
            </div>
            {isPlanSelected(undefined) && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#b69462', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Seleccionado</div>
            )}
          </div>
        </button>

        {/* Planes guardados */}
        {paymentPlans.length === 0 && (
          <p className="small" style={{ color: '#666', textAlign: 'center', padding: 12 }}>
            No tienes planes guardados. Crea uno en <strong>Configuración → Plan de Pagos</strong>.
          </p>
        )}

        {paymentPlans.map((plan) => (
          <button
            type="button"
            key={plan.id}
            disabled={hasPayments}
            onClick={() => handleSelectPlan(plan.id)}
            className="plan-select-btn"
            style={{
              border: isPlanSelected(plan.id) ? '2px solid #b69462' : '1px solid rgba(255,255,255,0.1)',
              background: isPlanSelected(plan.id) ? 'rgba(182,148,98,0.08)' : 'rgba(255,255,255,0.03)',
              cursor: hasPayments ? 'not-allowed' : 'pointer',
              opacity: hasPayments ? 0.6 : 1,
            }}
          >
            <RadioIndicator checked={isPlanSelected(plan.id)} />
            <div style={{ flex: 1 }}>
              <div className="flex-between" style={{ marginBottom: 4 }}>
                <div style={{ fontWeight: 600 }}>{plan.name}</div>
                {plan.isDefault && (
                  <span style={{ fontSize: 11, color: '#b69462', background: 'rgba(182,148,98,0.15)', padding: '2px 8px', borderRadius: 8 }}>
                    Predeterminado
                  </span>
                )}
              </div>
              {plan.description && (
                <div className="small" style={{ color: '#999', marginBottom: 8 }}>{plan.description}</div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {plan.installments.map((i) => (
                  <span key={i.order} className="small" style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8 }}>
                    {i.name}: <strong>{i.percentage}%</strong>
                  </span>
                ))}
              </div>
              {isPlanSelected(plan.id) && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#b69462', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Seleccionado</div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="card">
        <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Servicios Adicionales</h3>
        <p className="small mb-2" style={{ color: '#999' }}>
          Agrega servicios extras no incluidos en los paquetes
        </p>

        {showForm && (
          <div className="inline-form">
            <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600 }}>Nuevo Servicio Adicional</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label className="small mb-1" htmlFor="quote-add-name">Nombre del servicio</label>
                <input
                  id="quote-add-name"
                  className="input"
                  placeholder="Ej: Estudio de suelos"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                />
              </div>
              <div>
                <label className="small mb-1" htmlFor="quote-add-price">Valor</label>
                <input
                  id="quote-add-price"
                  className="input"
                  type="number"
                  placeholder="Ej: 3500000"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                />
              </div>
              <div className="grid-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn" onClick={addAdditionalService}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {formData.additionalServices.length > 0 ? (
          formData.additionalServices.map((service, i) => (
            <div key={service.id} className="additional-service-item">
              <div>
                <div style={{ fontWeight: 600 }}>{service.name}</div>
                <div className="small">
                  ${Number(service.price).toLocaleString('es-CO')}
                  {service.unit}
                </div>
              </div>
              <button type="button" className="btn-small btn-danger" onClick={() => removeAdditionalService(i)}>
                ×
              </button>
            </div>
          ))
        ) : (
          !showForm && (
            <p className="small" style={{ color: '#999', padding: 12, background: '#0a0a0a', borderRadius: 12 }}>
              No hay servicios adicionales
            </p>
          )
        )}

        <button type="button" className="btn btn-small btn-secondary mt-2" onClick={() => setShowForm(!showForm)}>
          {showForm ? '× Cancelar' : '+ Agregar Servicio Adicional'}
        </button>
      </div>

      <div className="card">
        <div className="flex-between mb-2">
          <span>Valor base</span>
          <span style={{ fontWeight: 600 }}>${basePrice.toLocaleString('es-CO')}</span>
        </div>

        <div>
          <label className="small mb-1" htmlFor="quote-discount">Descuento (ajuste de valor)</label>
          <input
            id="quote-discount"
            className="input"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={formData.discount === 0 ? '' : String(formData.discount || '')}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setFormData({ discount: 0 });
              } else if (/^\d*$/.test(val)) {
                setFormData({ discount: parseInt(val) || 0 });
              }
            }}
          />
          <p className="small mt-1" style={{ color: '#999' }}>
            Ej: 7800 para redondear valores
          </p>
        </div>

        <div className="flex-between mt-2" style={{ paddingTop: 12, borderTop: '1px solid var(--color-line)' }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Valor Final</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#b69462' }}>
            ${finalPrice.toLocaleString('es-CO')}
          </span>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Plan de Pagos</h3>
        {selectedPlan ? (
          <p className="small mb-2" style={{ color: '#b69462', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ClipboardCheck size={15} /> Plan seleccionado: <strong style={{ marginLeft: 2 }}>{selectedPlan.name}</strong> ({planPayments.length} cuotas)
          </p>
        ) : (
          <p className="small mb-2" style={{ color: '#999', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Settings size={15} /> Usando configuración manual
          </p>
        )}
        <div style={{ display: 'grid', gap: 10 }}>
          {planPayments.length > 0 ? (
            planPayments.map((payment) => (
              <div key={payment.name} className="flex-between">
                <span>
                  {payment.percentage}% {payment.name}
                </span>
                <span style={{ fontWeight: 600 }}>
                  ${Math.round(finalPrice * payment.percentage / 100).toLocaleString('es-CO')}
                </span>
              </div>
            ))
          ) : (
            <p className="small" style={{ color: '#999' }}>No hay cuotas configuradas</p>
          )}
        </div>
      </div>
    </>
  );
}
