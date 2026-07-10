import { useStore } from '../../../shared/services/store';
import { useShallow } from 'zustand/react/shallow';
import { calculateArea, calculatePrice } from '../../../shared/services/calculator';
import { FileText } from 'lucide-react';
import { useEscapeKey } from '../../../shared/hooks/useEscapeKey';

interface SummaryModalProps {
  onClose: () => void;
}

export function SummaryModal({ onClose }: SummaryModalProps) {
  useEscapeKey(onClose);
  const { formData, config, paymentPlans } = useStore(
    useShallow((s) => ({ formData: s.formData, config: s.config, paymentPlans: s.paymentPlans }))
  );

  const selectedPlan = formData.paymentPlanId !== undefined
    ? paymentPlans.find((p) => String(p.id) === String(formData.paymentPlanId))
    : undefined;
  const planPayments = selectedPlan ? selectedPlan.installments : config.paymentPlan.payments;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 540, width: '100%', padding: 24 }}>
        <h3 style={{ marginBottom: 2, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color="#b69462" /> Resumen
        </h3>
        <p className="small" style={{ color: '#b69462', fontWeight: 600, marginBottom: 16 }}>
          {formData.client} — {formData.project}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div className="card" style={{ padding: 16, textAlign: 'center', gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'left' }}>
              <p className="small" style={{ color: '#999', marginBottom: 2 }}>Área Total</p>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#b69462' }}>
                {calculateArea(formData).total.toFixed(2)} m²
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="small" style={{ color: '#666', fontSize: 11 }}>Lote {calculateArea(formData).lot.toFixed(0)}m²</p>
              <p className="small" style={{ color: '#666', fontSize: 11 }}>1er {calculateArea(formData).first.toFixed(0)}m²</p>
              {calculateArea(formData).upper > 0 && (
                <p className="small" style={{ color: '#666', fontSize: 11 }}>Sup. {calculateArea(formData).upper.toFixed(0)}m²</p>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 14, textAlign: 'center' }}>
            <p className="small" style={{ color: '#999', fontSize: 11 }}>Servicios</p>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
              {formData.selectedServices.length + formData.selectedSubPackages.length + (formData.hasCompletePackage ? 1 : 0)}
            </div>
          </div>

          <div className="card" style={{ padding: 14, textAlign: 'center' }}>
            <p className="small" style={{ color: '#999', fontSize: 11 }}>Pisos</p>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{formData.floors}</div>
          </div>

          {formData.selectedServices.length > 0 && (
            <div className="card" style={{ padding: 14, gridColumn: '1 / -1' }}>
              <p className="small" style={{ color: '#999', fontSize: 11, marginBottom: 6 }}>Servicios</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {formData.selectedServices.map((id: string) => {
                  const svc = config.services[id];
                  return (
                    <span key={id} style={{ background: 'rgba(182,148,98,0.1)', padding: '4px 10px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(182,148,98,0.2)' }}>
                      {svc?.name || id}
                    </span>
                  );
                })}
                {formData.selectedSubPackages.map((id: string) => {
                  const pkg = config.subPackages[id];
                  return (
                    <span key={id} style={{ background: 'rgba(182,148,98,0.1)', padding: '4px 10px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(182,148,98,0.2)' }}>
                      {pkg?.name || id}
                    </span>
                  );
                })}
                {formData.hasCompletePackage && (
                  <span style={{ background: 'rgba(182,148,98,0.15)', padding: '4px 10px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(182,148,98,0.3)', fontWeight: 600 }}>
                    {config.completePackage.name}
                  </span>
                )}
              </div>
            </div>
          )}

          {formData.additionalServices.length > 0 && (
            <div className="card" style={{ padding: 14, gridColumn: '1 / -1' }}>
              <p className="small" style={{ color: '#999', fontSize: 11, marginBottom: 6 }}>Adicionales</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {formData.additionalServices.map((svc: any) => (
                  <span key={svc.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                    {svc.name} <span style={{ color: '#b69462' }}>${Number(svc.price).toLocaleString('es-CO')}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 16, gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p className="small" style={{ color: '#999' }}>Valor Total</p>
              {formData.discount > 0 && (
                <p className="small" style={{ color: '#ff3b30', fontSize: 11 }}>Descuento -${formData.discount.toLocaleString('es-CO')}</p>
              )}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#b69462' }}>
              ${calculatePrice(formData, config).toLocaleString('es-CO')} COP
            </div>
          </div>

          {planPayments.length > 0 && (
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: `repeat(${Math.min(planPayments.length, 4)}, 1fr)`, gap: 8 }}>
              {planPayments.map((payment: any) => (
                <div key={payment.name} className="card" style={{ padding: 12, textAlign: 'center' }}>
                  <p className="small" style={{ color: '#999', fontSize: 10, marginBottom: 2 }}>{payment.name}</p>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#b69462' }}>
                    ${Math.round(calculatePrice(formData, config) * payment.percentage / 100).toLocaleString('es-CO')}
                  </div>
                  <div className="small" style={{ fontSize: 10, color: '#666' }}>{payment.percentage}%</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
