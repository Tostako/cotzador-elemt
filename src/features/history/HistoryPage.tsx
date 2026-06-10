import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../shared/services/store';
import { useAppStore } from '../../shared/hooks/useNotifications';
import { safeParseQuoteData } from '../../shared/utils/parseQuoteData';
import { calculateArea, calculatePrice } from '../../shared/services/calculator';
import type { Quote } from '../../shared/types';

export function HistoryPage() {
  const navigate = useNavigate();
  const showNotification = useAppStore((s) => s.showNotification);
  const { quotes, config, formData, paymentPlans, loadPaymentPlans, deleteQuote, setFormData, setQuoteStep, setEditingQuoteId } = useStore();

  // Load payment plans on mount (needed to resolve quote's selected plan in summary)
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

  const statusColors: Record<string, string> = {
    draft: '#999999',
    completed: '#34c759',
    paid: '#34c759',
    sent: '#ff9500',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Borrador',
    completed: 'Finalizada',
    paid: 'Pagada',
    sent: 'Enviada',
  };

  const handleDelete = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuoteToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (quoteToDelete) {
      deleteQuote(quoteToDelete);
      showNotification('Cotización eliminada', 'success');
      setShowDeleteConfirm(false);
      setQuoteToDelete(null);
    }
  };

  const handleEdit = async (quote: Quote) => {
    if (quote.status === 'paid' || quote.status === 'completed') {
      showNotification('No puedes editar una cotización finalizada', 'warning');
      return;
    }
    // Check if quote has payments
    try {
      const { apiService, extractData } = await import('../../shared/services/api');
      const res = await apiService.getQuotePayments(quote.id);
      const payments = extractData(res);
      if (Array.isArray(payments) && payments.length > 0) {
        const hasConfirmed = payments.some((p: any) => p.status === 'confirmed' || p.status === 'approved');
        if (hasConfirmed) {
          showNotification('No puedes editar una cotización con pagos registrados', 'warning');
          return;
        }
      }
    } catch {
      // Silently continue
    }
    const data = safeParseQuoteData(quote.data);
    if (!data) {
      showNotification('Error al leer los datos de la cotización', 'error');
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
      showNotification('Error al leer los datos de la cotización', 'error');
      return;
    }
    // Precargar datos base, pero resetear plan de pagos, cuentas de cobro y contador
    setFormData({
      ...data,
      parentQuoteId: quote.id,
      paymentPlanId: undefined,
      invoices: [],
      invoiceCount: 0,
    });
    setQuoteStep(4);
    setEditingQuoteId(null); // Es nueva, no edición
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
      showNotification('Error al leer los datos de la cotización', 'error');
      return;
    }
    setFormData(data);
    setSelectedQuote(null); // Close options modal
    setShowSummary(true);   // Open summary modal
  };

  return (
    <main>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Historial</h1>
      <p className="small">{quotes.length} cotizaciones guardadas</p>

      {quotes.length > 0 ? (
        <div className="mt-2">
          {(() => {
            // Group quotes into parents and children
            const parentQuotes: Quote[] = [];
            const childQuotes: Quote[] = [];
            quotes.forEach((q) => {
              const d = safeParseQuoteData(q.data);
              if (d?.parentQuoteId) {
                childQuotes.push(q);
              } else {
                parentQuotes.push(q);
              }
            });

            return parentQuotes.map((parent) => {
              const status = parent.status === 'paid' || parent.status === 'completed' ? 'completed' : 'draft';
              const children = childQuotes.filter((c) => {
                const d = safeParseQuoteData(c.data);
                return String(d?.parentQuoteId) === String(parent.id);
              });
              const hasChildren = children.length > 0;
              const isExpanded = expandedParents.has(parent.id);

              return (
                <div key={parent.id}>
                  {/* Parent quote */}
                  <div
                    className="history-item"
                    onClick={() => setSelectedQuote(parent)}
                    style={{ position: 'relative' }}
                  >
                    {hasChildren && (
                      <button
                        className="btn-small btn-secondary"
                        onClick={(e) => { e.stopPropagation(); toggleParent(parent.id); }}
                        style={{
                          position: 'absolute',
                          right: 40,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          padding: '4px 8px',
                          fontSize: 12,
                        }}
                      >
                        {isExpanded ? '▲' : '▼'} {children.length}
                      </button>
                    )}
                    <div className="flex-between mb-1">
                      <h3 style={{ fontSize: 18, fontWeight: 600 }}>{parent.client}</h3>
                      <button
                        className="btn-small btn-danger"
                        onClick={(e) => handleDelete(parent.id, e)}
                      >
                        ×
                      </button>
                    </div>
                    <p className="small">{parent.project}</p>
                    <div className="flex-between" style={{ marginTop: 8 }}>
                      <span className="small" style={{ color: statusColors[status], fontWeight: 600 }}>
                        ● {statusLabels[status]}
                      </span>
                      <span className="small">
                        {parent.area.toFixed(0)}m² - ${parent.price.toLocaleString('es-CO')}
                      </span>
                    </div>
                    <p className="small mt-1">{parent.date}</p>
                  </div>

                  {/* Children quotes */}
                  {isExpanded && hasChildren && (
                    <div style={{ marginLeft: 20, marginTop: 4, marginBottom: 4 }}>
                      {children.map((child) => {
                        const childStatus = child.status === 'paid' || child.status === 'completed' ? 'completed' : 'draft';
                        return (
                          <div
                            key={child.id}
                            className="history-item"
                            onClick={() => setSelectedQuote(child)}
                            style={{
                              borderLeft: '3px solid #b69462',
                              marginBottom: 8,
                              paddingLeft: 16,
                            }}
                          >
                            <div className="flex-between mb-1">
                              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{child.client}</h3>
                              <button
                                className="btn-small btn-danger"
                                onClick={(e) => handleDelete(child.id, e)}
                              >
                                ×
                              </button>
                            </div>
                            <p className="small">{child.project}</p>
                            <div className="flex-between" style={{ marginTop: 8 }}>
                              <span className="small" style={{ color: statusColors[childStatus], fontWeight: 600 }}>
                                ● {statusLabels[childStatus]}
                              </span>
                              <span className="small">
                                {child.area.toFixed(0)}m² - ${child.price.toLocaleString('es-CO')}
                              </span>
                            </div>
                            <p className="small mt-1">{child.date}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className="card mt-2" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small">No hay cotizaciones guardadas</p>
          <button className="btn mt-2" onClick={() => navigate('/quote')}>
            Crear Nueva
          </button>
        </div>
      )}

      {/* Quote Options Modal */}
      {selectedQuote && !showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedQuote(null); }}
        >
          <div className="modal">
            <h3 style={{ marginBottom: 12 }}>{selectedQuote.client}</h3>
            <p className="small mb-2">{selectedQuote.project}</p>
            <div style={{ display: 'grid', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => handleView(selectedQuote)}>
                📄 Ver Resumen
              </button>
              {(selectedQuote.status !== 'paid' && selectedQuote.status !== 'completed') && (
                <button className="btn btn-secondary" onClick={() => handleEdit(selectedQuote)}>
                  ✏️ Editar
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => handleCloneQuote(selectedQuote)}>
                🔄 Nueva cotización
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedQuote(null);
                  navigate(`/quotes/${selectedQuote.id}/invoices`);
                }}
              >
                💳 Cuentas de Cobro
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEstimationQuote(selectedQuote);
                  setEstimationType('obraNegra');
                  setShowEstimation(true);
                  setSelectedQuote(null);
                }}
              >
                🏗️ Realizar Estimación
              </button>
              {(selectedQuote.status !== 'paid' && selectedQuote.status !== 'completed') && (
                <button
                  className="btn"
                  style={{ background: '#34c759' }}
                  onClick={() => {
                    useStore.getState().updateQuote(selectedQuote.id, { status: 'completed' });
                    showNotification('Cotización marcada como finalizada', 'success');
                    setSelectedQuote(null);
                  }}
                >
                  ✓ Marcar como Finalizada
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedQuote(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummary && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSummary(false); }}
        >
          <div className="modal" style={{ maxWidth: 540, width: '100%', padding: 24 }}>
            <h3 style={{ marginBottom: 2, fontSize: 18, fontWeight: 700 }}>📄 Resumen</h3>
            <p className="small" style={{ color: '#b69462', fontWeight: 600, marginBottom: 16 }}>
              {formData.client} — {formData.project}
            </p>

            {/* Bento Grid Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {/* Area Total — Large */}
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

              {/* Services Count */}
              <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                <p className="small" style={{ color: '#999', fontSize: 11 }}>Servicios</p>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
                  {formData.selectedServices.length + formData.selectedSubPackages.length + (formData.hasCompletePackage ? 1 : 0)}
                </div>
              </div>

              {/* Pisos */}
              <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                <p className="small" style={{ color: '#999', fontSize: 11 }}>Pisos</p>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{formData.floors}</div>
              </div>

              {/* Selected Services List — Compact */}
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

              {/* Additional Services — Compact */}
              {formData.additionalServices.length > 0 && (
                <div className="card" style={{ padding: 14, gridColumn: '1 / -1' }}>
                  <p className="small" style={{ color: '#999', fontSize: 11, marginBottom: 6 }}>Adicionales</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {formData.additionalServices.map((svc: any) => (
                      <span key={svc.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                        {svc.name} <span style={{ color: '#b69462' }}>${svc.price.toLocaleString('es-CO')}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Total — Full Width */}
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

              {/* Payment Plan — Horizontal */}
              {(() => {
                const selectedPlan = formData.paymentPlanId !== undefined
                  ? paymentPlans.find((p) => String(p.id) === String(formData.paymentPlanId))
                  : undefined;
                const planPayments = selectedPlan ? selectedPlan.installments : config.paymentPlan.payments;
                if (planPayments.length === 0) return null;
                return (
                  <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: `repeat(${Math.min(planPayments.length, 4)}, 1fr)`, gap: 8 }}>
                    {planPayments.map((payment: any, i: number) => (
                      <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
                        <p className="small" style={{ color: '#999', fontSize: 10, marginBottom: 2 }}>{payment.name}</p>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#b69462' }}>
                          ${Math.round(calculatePrice(formData, config) * payment.percentage / 100).toLocaleString('es-CO')}
                        </div>
                        <div className="small" style={{ fontSize: 10, color: '#666' }}>{payment.percentage}%</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <button className="btn" onClick={() => setShowSummary(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Estimation Modal */}
      {showEstimation && estimationQuote && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEstimation(false); }}
        >
          <div className="modal" style={{ maxWidth: 480 }}>
            <h3 style={{ marginBottom: 8 }}>🏗️ Estimación de Obra</h3>
            <p className="small mb-2" style={{ color: '#b69462', fontWeight: 600 }}>
              {estimationQuote.client}
            </p>
            <p className="small mb-2">{estimationQuote.project}</p>

            {/* Area display */}
            <div className="card" style={{ textAlign: 'center', marginBottom: 20, background: '#0a0a0a' }}>
              <p className="small">Área total construida</p>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#b69462', lineHeight: 1 }}>
                {estimationQuote.area.toFixed(0)}
              </div>
              <p className="small">m²</p>
            </div>

            {/* Fixed estimations */}
            <p className="small mb-1">Tipo de acabado</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              <div
                className={`toggle-option ${estimationType === 'obraNegra' ? 'active' : ''}`}
                onClick={() => setEstimationType('obraNegra')}
              >
                <span style={{ fontSize: 20 }}>🧱</span>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Obra Negra</div>
                <div className="small">Sin acabados</div>
              </div>
              <div
                className={`toggle-option ${estimationType === 'obraGris' ? 'active' : ''}`}
                onClick={() => setEstimationType('obraGris')}
              >
                <span style={{ fontSize: 20 }}>🏠</span>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Obra Gris</div>
                <div className="small">Básicos</div>
              </div>
              <div
                className={`toggle-option ${estimationType === 'acabados' ? 'active' : ''}`}
                onClick={() => setEstimationType('acabados')}
              >
                <span style={{ fontSize: 20 }}>✨</span>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Acabados</div>
                <div className="small">Terminada</div>
              </div>
            </div>

            {/* Custom estimations */}
            {(() => {
              const customList = config.estimation.customEstimations ?? [];
              if (customList.length === 0) return null;
              return (
                <>
                  <p className="small mb-1" style={{ marginTop: 8 }}>Mis estimaciones</p>
                  <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                    {customList.map((est) => (
                      <div
                        key={est.id}
                        className={`toggle-option ${estimationType === String(est.id) ? 'active' : ''}`}
                        onClick={() => setEstimationType(String(est.id))}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{est.name}</div>
                        <div className="small" style={{ color: '#b69462' }}>${est.price.toLocaleString('es-CO')}/m²</div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            {/* Price per m² */}
            <div className="flex-between mb-2" style={{ padding: '12px 0', borderBottom: '1px solid var(--color-line)' }}>
              <span className="small">Precio por m²</span>
              <span style={{ fontWeight: 600 }}>
                ${(() => {
                  let price = 0;
                  if (estimationType === 'obraNegra') price = config.estimation.obraNegraPrice;
                  else if (estimationType === 'obraGris') price = config.estimation.obraGrisPrice;
                  else if (estimationType === 'acabados') price = config.estimation.acabadosPrice;
                  else {
                    const custom = config.estimation.customEstimations?.find((e) => String(e.id) === estimationType);
                    if (custom) price = custom.price;
                  }
                  return price.toLocaleString('es-CO');
                })()} COP
              </span>
            </div>

            {/* Total */}
            <div className="flex-between" style={{ padding: '16px 0', marginBottom: 24 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Costo estimado total</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#b69462' }}>
                ${(() => {
                  let price = 0;
                  if (estimationType === 'obraNegra') price = config.estimation.obraNegraPrice;
                  else if (estimationType === 'obraGris') price = config.estimation.obraGrisPrice;
                  else if (estimationType === 'acabados') price = config.estimation.acabadosPrice;
                  else {
                    const custom = config.estimation.customEstimations?.find((e) => String(e.id) === estimationType);
                    if (custom) price = custom.price;
                  }
                  return (estimationQuote.area * price).toLocaleString('es-CO');
                })()} COP
              </span>
            </div>

            <button className="btn" onClick={() => setShowEstimation(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <div className="modal">
            <h3 style={{ marginBottom: 12 }}>Confirmar eliminación</h3>
            <p className="small mb-2">
              Estás a punto de eliminar esta cotización. Esta acción no se puede deshacer.
            </p>
            <div className="grid-2">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
