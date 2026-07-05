import { useState } from 'react';
import { useStore } from '../../shared/services/store';
import type { AreaResult } from '../../shared/types';
import { CreditCard, TriangleAlert, Check, Settings, ClipboardCheck } from 'lucide-react';

interface QuoteStep5Props {
  area: AreaResult;
  price: number;
}

export function QuoteStep5({ area, price }: QuoteStep5Props) {
  const { formData, config, setFormData } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '' });

  const basePrice = price + (formData.discount || 0);
  const finalPrice = price;

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

  return (
    <>
      <div className="card mt-2">
        <h3 className="mb-1" style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{formData.client}</h3>
        <p className="small">{formData.project}</p>
        <p className="small mt-1">Área: {area.total.toFixed(2)} m²</p>
      </div>

<<<<<<< Updated upstream
=======
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
              <div style={{ marginTop: 8, fontSize: 12, color: '#b69462', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Seleccionado</div>
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
                <div style={{ marginTop: 8, fontSize: 12, color: '#b69462', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Seleccionado</div>
              )}
            </div>
          </div>
        ))}
      </div>

>>>>>>> Stashed changes
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
                  ${Number(service.price).toLocaleString('es-CO')}
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
            type="number"
            step={100}
            value={formData.discount || 0}
            onChange={(e) => setFormData({ discount: parseInt(e.target.value) || 0 })}
            placeholder="0"
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
<<<<<<< Updated upstream
=======
        {selectedPlan ? (
          <p className="small mb-2" style={{ color: '#b69462', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ClipboardCheck size={15} /> Plan seleccionado: <strong style={{ marginLeft: 2 }}>{selectedPlan.name}</strong> ({planPayments.length} cuotas)
          </p>
        ) : (
          <p className="small mb-2" style={{ color: '#999', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Settings size={15} /> Usando configuración manual
          </p>
        )}
>>>>>>> Stashed changes
        <div style={{ display: 'grid', gap: 10 }}>
          {config.paymentPlan.payments.map((payment, i) => (
            <div key={i} className="flex-between">
              <span>
                {payment.percentage}% {payment.name}
              </span>
              <span style={{ fontWeight: 600 }}>
                ${Math.round(finalPrice * payment.percentage / 100).toLocaleString('es-CO')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
