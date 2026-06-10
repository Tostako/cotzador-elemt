import { useState, useEffect } from 'react';
import { useStore } from '../../shared/services/store';
import { useAppStore } from '../../shared/hooks/useNotifications';
import { TourBanner } from '../../shared/components/TourBanner';
import { isTourActiveForRoute } from '../../shared/utils/tour';
import type { SavedPaymentPlan } from '../../shared/types';

export function PagosPage() {
  const showNotification = useAppStore((s) => s.showNotification);
  const {
    config,
    savePayment,
    deletePayment,
    updateConfig,
    paymentPlans,
    loadPaymentPlans,
    createPaymentPlan,
    updatePaymentPlan,
    deletePaymentPlan,
    setDefaultPaymentPlan,
  } = useStore();
  const showTour = isTourActiveForRoute('/pagos');

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({ name: '', percentage: '' });

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SavedPaymentPlan | null>(null);
  const [planForm, setPlanForm] = useState({ name: '', description: '', installments: [{ name: '', percentage: '' }] });

  useEffect(() => {
    loadPaymentPlans();
  }, [loadPaymentPlans]);

  // ── Local payment plan (config) handlers ─────────────────
  const handleSavePayment = () => {
    if (!newPayment.name.trim() || !newPayment.percentage) {
      showNotification('Completa todos los campos', 'error');
      return;
    }
    const pct = parseInt(newPayment.percentage);
    if (pct <= 0 || pct > 100) {
      showNotification('Porcentaje debe estar entre 1 y 100', 'error');
      return;
    }
    const newTotal = paymentTotal + pct;
    if (newTotal > 100) {
      showNotification(`No se puede agregar. El total quedaría en ${newTotal}% (máximo 100%)`, 'error');
      return;
    }
    if (config.paymentPlan.payments.length >= 10) {
      showNotification('Máximo 10 pagos permitidos', 'warning');
      return;
    }
    savePayment({ name: newPayment.name.trim(), percentage: pct });
    setNewPayment({ name: '', percentage: '' });
    setShowPaymentForm(false);
    showNotification('Pago agregado correctamente', 'success');
  };

  const paymentTotal = config.paymentPlan.payments.reduce((sum, p) => sum + p.percentage, 0);

  // ── Saved payment plans handlers ─────────────────────────
  const resetPlanForm = () => {
    setPlanForm({ name: '', description: '', installments: [{ name: '', percentage: '' }] });
    setEditingPlan(null);
  };

  const addInstallmentField = () => {
    setPlanForm((prev) => ({ ...prev, installments: [...prev.installments, { name: '', percentage: '' }] }));
  };

  const removeInstallmentField = (idx: number) => {
    setPlanForm((prev) => ({ ...prev, installments: prev.installments.filter((_, i) => i !== idx) }));
  };

  const updateInstallment = (idx: number, field: 'name' | 'percentage', value: string) => {
    setPlanForm((prev) => {
      const inst = [...prev.installments];
      inst[idx] = { ...inst[idx], [field]: value };
      return { ...prev, installments: inst };
    });
  };

  const validatePlan = () => {
    if (!planForm.name.trim()) return 'El nombre del plan es requerido';
    const parsed = planForm.installments
      .filter((i) => i.name.trim() && i.percentage)
      .map((i, order) => ({
        name: i.name.trim(),
        percentage: parseFloat(i.percentage),
        order: order + 1,
      }));
    if (parsed.length === 0) return 'Debes agregar al menos una cuota';
    const total = parsed.reduce((sum, i) => sum + i.percentage, 0);
    if (Math.abs(total - 100) > 0.1) return `Las cuotas deben sumar 100%. Actual: ${total.toFixed(2)}%`;
    return null;
  };

  const handleSavePlan = async () => {
    const error = validatePlan();
    if (error) {
      showNotification(error, 'error');
      return;
    }
    const installments = planForm.installments
      .filter((i) => i.name.trim() && i.percentage)
      .map((i, order) => ({ name: i.name.trim(), percentage: parseFloat(i.percentage), order: order + 1 }));

    try {
      if (editingPlan) {
        await updatePaymentPlan(editingPlan.id, { name: planForm.name, description: planForm.description, installments });
        showNotification('Plan actualizado', 'success');
      } else {
        await createPaymentPlan({ name: planForm.name, description: planForm.description, installments, isDefault: false });
        showNotification('Plan creado', 'success');
      }
      resetPlanForm();
      setShowPlanForm(false);
    } catch (e: any) {
      showNotification(e.message || 'Error al guardar plan', 'error');
    }
  };

  const handleEditPlan = (plan: SavedPaymentPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      installments: plan.installments.map((i) => ({ name: i.name, percentage: String(i.percentage) })),
    });
    setShowPlanForm(true);
  };

  const handleDeletePlan = async (id: number) => {
    if (!window.confirm('¿Eliminar este plan de pagos?')) return;
    try {
      await deletePaymentPlan(id);
      showNotification('Plan eliminado', 'success');
    } catch (e: any) {
      showNotification(e.message || 'Error al eliminar', 'error');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultPaymentPlan(id);
      showNotification('Plan marcado como predeterminado', 'success');
    } catch (e: any) {
      showNotification(e.message || 'Error', 'error');
    }
  };

  return (
    <main>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>💳 Plan de Pagos</h1>
      <p className="small">Configurar cuotas, condiciones de pago y guardar planes reutilizables</p>

      {/* ── SAVED PLANS ─────────────────────────────── */}
      <div className="card mt-2" style={{ marginBottom: 24 }}>
        <div className="flex-between mb-2">
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>📁 Mis Planes Guardados</h3>
          <button className="btn btn-small" onClick={() => { resetPlanForm(); setShowPlanForm(!showPlanForm); }}>
            {showPlanForm ? '× Cancelar' : '+ Nuevo Plan'}
          </button>
        </div>

        {showPlanForm && (
          <div className="inline-form mb-2">
            <h4 className="mb-2" style={{ fontWeight: 600 }}>{editingPlan ? 'Editar Plan' : 'Crear Plan'}</h4>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <p className="small mb-1">Nombre del plan</p>
                <input className="input" placeholder="Ej: 50/30/20 Estándar" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
              </div>
              <div>
                <p className="small mb-1">Descripción <span style={{ opacity: 0.5 }}>(opcional)</span></p>
                <input className="input" placeholder="Ej: Plan usado para clientes corporativos" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
              </div>

              <div>
                <p className="small mb-1">Cuotas (deben sumar 100%)</p>
                {planForm.installments.map((inst, idx) => (
                  <div key={idx} className="flex-between mb-1" style={{ gap: 8 }}>
                    <input
                      className="input"
                      style={{ flex: 2 }}
                      placeholder="Nombre"
                      value={inst.name}
                      onChange={(e) => updateInstallment(idx, 'name', e.target.value)}
                    />
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      type="number"
                      placeholder="%"
                      value={inst.percentage}
                      onChange={(e) => updateInstallment(idx, 'percentage', e.target.value)}
                    />
                    <button className="btn btn-danger btn-small" style={{ width: 40 }} onClick={() => removeInstallmentField(idx)}>×</button>
                  </div>
                ))}
                <div className="flex-between mt-1" style={{ padding: '8px 0' }}>
                  <button className="btn btn-ghost btn-small" onClick={addInstallmentField}>+ Agregar cuota</button>
                  {(() => {
                    const total = planForm.installments.reduce((sum, i) => sum + (parseFloat(i.percentage) || 0), 0);
                    return (
                      <span className="small" style={{ color: Math.abs(total - 100) < 0.1 ? '#2ecc71' : '#ff3b30', fontWeight: 600 }}>
                        Suma: {total.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="grid-2">
                <button className="btn btn-secondary" onClick={() => setShowPlanForm(false)}>Cancelar</button>
                <button className="btn" onClick={handleSavePlan}>Guardar Plan</button>
              </div>
            </div>
          </div>
        )}

        {paymentPlans.length === 0 && (
          <p className="small" style={{ color: '#666' }}>No tienes planes guardados. Crea uno para reutilizarlo en tus cotizaciones.</p>
        )}

        {paymentPlans.map((plan) => (
          <div key={plan.id} className="mb-2" style={{ padding: 16, background: '#0a0a0a', borderRadius: 12, border: plan.isDefault ? '1px solid #b69462' : '1px solid transparent' }}>
            <div className="flex-between mb-1">
              <div>
                <span style={{ fontWeight: 600 }}>{plan.name}</span>
                {plan.isDefault && <span style={{ marginLeft: 8, fontSize: 11, color: '#b69462', background: 'rgba(182,148,98,0.15)', padding: '2px 8px', borderRadius: 8 }}>Predeterminado</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!plan.isDefault && (
                  <button className="btn btn-small btn-ghost" onClick={() => handleSetDefault(plan.id)}>★ Default</button>
                )}
                <button className="btn btn-small" onClick={() => handleEditPlan(plan)}>Editar</button>
                <button className="btn btn-small btn-danger" onClick={() => handleDeletePlan(plan.id)}>Eliminar</button>
              </div>
            </div>
            {plan.description && <p className="small" style={{ color: '#999', marginBottom: 4 }}>{plan.description}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {plan.installments.map((i) => (
                <span key={i.order} className="small" style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8 }}>
                  {i.name}: <strong>{i.percentage}%</strong>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── LOCAL PAYMENT CONFIG (current quote defaults) ── */}
      <button className="btn mt-2 mb-2" onClick={() => setShowPaymentForm(!showPaymentForm)}>
        {showPaymentForm ? '× Cancelar' : '+ Nuevo Pago (cotización actual)'}
      </button>

        {showPaymentForm && (
          <div className="inline-form">
            <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600 }}>Nuevo Pago</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <p className="small mb-1">Nombre del pago</p>
                <input
                  className="input"
                  placeholder="Ej: Avance 50%"
                  value={newPayment.name}
                  onChange={(e) => setNewPayment({ ...newPayment, name: e.target.value })}
                />
              </div>
              <div>
                <p className="small mb-1">Porcentaje</p>
                <input
                  className="input"
                  type="number"
                  placeholder="Ej: 25"
                  min={1}
                  max={100}
                  value={newPayment.percentage}
                  onChange={(e) => setNewPayment({ ...newPayment, percentage: e.target.value })}
                />
                <p className="small mt-1" style={{ color: paymentTotal + (parseInt(newPayment.percentage) || 0) > 100 ? '#ff3b30' : '#999' }}>
                  Total con este pago: {paymentTotal + (parseInt(newPayment.percentage) || 0)}% (debe ser 100%)
                </p>
              </div>
              <div className="grid-2">
                <button className="btn btn-secondary" onClick={() => setShowPaymentForm(false)}>Cancelar</button>
                <button className="btn" onClick={handleSavePayment}>Guardar</button>
              </div>
            </div>
          </div>
        )}

      <div className="card" style={{ marginBottom: 100 }}>
        <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Pagos Actuales (Cotización)</h3>
        <p className="small mb-2" style={{ color: '#999' }}>Suma total debe ser 100%</p>

        {config.paymentPlan.payments.map((payment, i) => (
          <div key={i} className="mb-2" style={{ padding: 12, background: '#0a0a0a', borderRadius: 12 }}>
            <div className="flex-between mb-2">
              <span style={{ fontWeight: 600 }}>Pago {i + 1}</span>
              <button
                className="btn-small btn-danger"
                onClick={() => {
                  if (window.confirm(`¿Eliminar pago "${payment.name}"?`)) {
                    deletePayment(i);
                    showNotification('Pago eliminado', 'success');
                  }
                }}
              >
                ×
              </button>
            </div>
            <p className="small mb-1">Nombre</p>
            <input
              className="input mb-1"
              value={payment.name}
              onChange={(e) => {
                const payments = [...config.paymentPlan.payments];
                payments[i] = { ...payments[i], name: e.target.value };
                updateConfig({ paymentPlan: { payments } });
              }}
            />
            <p className="small mb-1">Porcentaje</p>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={payment.percentage === 0 ? '' : String(payment.percentage || '')}
              onChange={(e) => {
                const val = e.target.value;
                let newPct = 0;
                if (val === '') {
                  newPct = 0;
                } else if (/^\d*$/.test(val)) {
                  newPct = parseInt(val) || 0;
                } else {
                  return;
                }
                const currentTotalWithoutThis = config.paymentPlan.payments.reduce((sum, p, idx) => idx === i ? sum : sum + p.percentage, 0);
                if (currentTotalWithoutThis + newPct > 100) {
                  showNotification(`El total no puede superar 100%. Actual sin este: ${currentTotalWithoutThis}%`, 'error');
                  return;
                }
                const payments = [...config.paymentPlan.payments];
                payments[i] = { ...payments[i], percentage: newPct };
                updateConfig({ paymentPlan: { payments } });
              }}
            />
          </div>
        ))}

        <div className="flex-between mt-2" style={{ paddingTop: 12, borderTop: '1px solid var(--color-line)' }}>
          <span style={{ fontWeight: 600 }}>Total:</span>
          <span style={{ fontWeight: 600, color: paymentTotal === 100 ? '#b69462' : '#ff3b30' }}>
            {paymentTotal}%
          </span>
        </div>
      </div>

      {showTour && <TourBanner />}
    </main>
  );
}
