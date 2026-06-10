import { useState, useEffect } from 'react';
import { useStore } from '../../shared/services/store';
import type { AreaResult } from '../../shared/types';

interface QuoteStep5Props {
  area: AreaResult;
  price: number;
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

  // Debug
  console.log('[QuoteStep5] plan:', { selectedPlanId, selectedPlanName: selectedPlan?.name, planPaymentsCount: planPayments.length, paymentPlansCount: paymentPlans.length });

  const handleSelectPlan = (planId: number | undefined) => {
    setFormData({ paymentPlanId: planId });
  };

  // Radio indicator component
  const RadioIndicator = ({ checked }: { checked: boolean }) => (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: checked ? '2px solid #b69462' : '2px solid rgba(255,255,255,0.3)',
        background: checked ? '#b69462' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.2s ease',
      }}
    >
      {checked && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#000' }} />
      )}
    </div>
  );

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
        <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📋 Plan de Pagos</h3>
        {hasPayments ? (
          <div style={{ padding: 12, background: 'rgba(255,193,7,0.1)', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(255,193,7,0.3)' }}>
            <p className="small" style={{ color: '#ffc107', fontWeight: 600 }}>
              ⚠️ Esta cotización tiene pagos registrados. El plan de pagos no puede modificarse.
            </p>
          </div>
        ) : (
          <p className="small mb-2" style={{ color: '#999' }}>Elige uno de tus planes guardados o usa la configuración manual</p>
        )}

        {/* Opción: configuración manual actual */}
        <div
          onClick={() => !hasPayments && handleSelectPlan(undefined)}
          style={{
            padding: 16,
            borderRadius: 12,
            border: isPlanSelected(undefined) ? '2px solid #b69462' : '1px solid rgba(255,255,255,0.1)',
            background: isPlanSelected(undefined) ? 'rgba(182,148,98,0.08)' : 'rgba(255,255,255,0.03)',
            cursor: hasPayments ? 'not-allowed' : 'pointer',
            opacity: hasPayments ? 0.6 : 1,
            marginBottom: 12,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <RadioIndicator checked={isPlanSelected(undefined)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Configuración actual</div>
            <div className="small" style={{ color: '#999' }}>
              {config.paymentPlan.payments.length} cuotas definidas manualmente
            </div>
            {isPlanSelected(undefined) && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#b69462', fontWeight: 600 }}>✓ Seleccionado</div>
            )}
          </div>
        </div>

        {/* Planes guardados */}
        {paymentPlans.length === 0 && (
          <p className="small" style={{ color: '#666', textAlign: 'center', padding: 12 }}>
            No tienes planes guardados. Crea uno en <strong>Configuración → Plan de Pagos</strong>.
          </p>
        )}

        {paymentPlans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => !hasPayments && handleSelectPlan(plan.id)}
            style={{
              padding: 16,
              borderRadius: 12,
              border: isPlanSelected(plan.id) ? '2px solid #b69462' : '1px solid rgba(255,255,255,0.1)',
              background: isPlanSelected(plan.id) ? 'rgba(182,148,98,0.08)' : 'rgba(255,255,255,0.03)',
              cursor: hasPayments ? 'not-allowed' : 'pointer',
              opacity: hasPayments ? 0.6 : 1,
              marginBottom: 12,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
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
                <div style={{ marginTop: 8, fontSize: 12, color: '#b69462', fontWeight: 600 }}>✓ Seleccionado</div>
              )}
            </div>
          </div>
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
                <p className="small mb-1">Nombre del servicio</p>
                <input
                  className="input"
                  placeholder="Ej: Estudio de suelos"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                />
              </div>
              <div>
                <p className="small mb-1">Valor</p>
                <input
                  className="input"
                  type="number"
                  placeholder="Ej: 3500000"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                />
              </div>
              <div className="grid-2">
                <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button className="btn" onClick={addAdditionalService}>
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
                  ${service.price.toLocaleString('es-CO')}
                  {service.unit}
                </div>
              </div>
              <button className="btn-small btn-danger" onClick={() => removeAdditionalService(i)}>
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

        <button className="btn btn-small btn-secondary mt-2" onClick={() => setShowForm(!showForm)}>
          {showForm ? '× Cancelar' : '+ Agregar Servicio Adicional'}
        </button>
      </div>

      <div className="card">
        <div className="flex-between mb-2">
          <span>Valor base</span>
          <span style={{ fontWeight: 600 }}>${basePrice.toLocaleString('es-CO')}</span>
        </div>

        <div>
          <p className="small mb-1">Descuento (ajuste de valor)</p>
          <input
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
          <p className="small mb-2" style={{ color: '#b69462' }}>
            📋 Plan seleccionado: <strong>{selectedPlan.name}</strong> ({planPayments.length} cuotas)
          </p>
        ) : (
          <p className="small mb-2" style={{ color: '#999' }}>
            ⚙️ Usando configuración manual
          </p>
        )}
        <div style={{ display: 'grid', gap: 10 }}>
          {planPayments.length > 0 ? (
            planPayments.map((payment, i) => (
              <div key={i} className="flex-between">
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
