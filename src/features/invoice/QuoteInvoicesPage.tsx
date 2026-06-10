import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../shared/services/store';
import { useAppStore } from '../../shared/hooks/useNotifications';
import { safeParseQuoteData } from '../../shared/utils/parseQuoteData';
import type { InvoiceRecord, Quote } from '../../shared/types';
import { PaymentReceipt } from './PaymentReceipt';

/** Format a local Date as YYYY-MM-DD string (avoids UTC shift issues) */
function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Format a YYYY-MM-DD string for display in 'es-CO' locale (treats it as local midnight) */
function displayDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-CO');
}

export function QuoteInvoicesPage() {
  const navigate = useNavigate();
  const { quoteId } = useParams();
  const showNotification = useAppStore((s) => s.showNotification);
  const { quotes, getQuoteById, config, setFormData, updateQuote, paymentPlans, loadPaymentPlans } = useStore();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [quotePayments, setQuotePayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ installmentIndex: 0, method: 'manual', notes: '', date: '' });
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptInvoice, setReceiptInvoice] = useState<InvoiceRecord | null>(null);

  // Load quote and its invoices
  useEffect(() => {
    if (!quoteId) return;
    const q = getQuoteById(quoteId);
    if (q) {
      setQuote(q);
      const data = safeParseQuoteData(q.data);
      if (data?.invoices) {
        setInvoices(data.invoices);
      } else {
        setInvoices([]);
      }
    }
  }, [quoteId, getQuoteById, quotes]);

  // Load payment plans
  useEffect(() => {
    if (paymentPlans.length === 0) {
      loadPaymentPlans();
    }
  }, [paymentPlans.length, loadPaymentPlans]);

  // Load payments for this quote
  useEffect(() => {
    if (quoteId) {
      loadQuotePayments(quoteId);
    }
  }, [quoteId]);

  const loadQuotePayments = async (id: number | string) => {
    try {
      const { apiService, extractData } = await import('../../shared/services/api');
      const res = await apiService.getQuotePayments(id);
      const payments = extractData(res);
      if (Array.isArray(payments)) {
        setQuotePayments(payments);
      }
    } catch {
      // Silently fail
    }
  };

  const getInstallments = () => {
    if (!quote) return [];
    const data = safeParseQuoteData(quote.data);
    const planId = data?.paymentPlanId;
    const selectedPlan = planId !== undefined
      ? paymentPlans.find((p) => String(p.id) === String(planId))
      : undefined;
    return selectedPlan ? selectedPlan.installments : config.paymentPlan.payments;
  };

  const isInstallmentPaid = (index: number) => {
    return quotePayments.some((p: any) => {
      const pIndex = Number(p.installmentIndex ?? p.plan_installment_index ?? -1);
      const pStatus = String(p.status ?? '').toLowerCase();
      return pIndex === index && (pStatus === 'confirmed' || pStatus === 'approved');
    });
  };

  const getInvoiceStatus = (invoice: InvoiceRecord): 'pending' | 'paid' => {
    return isInstallmentPaid(invoice.installmentIndex) ? 'paid' : 'pending';
  };

  const getPaidAtForInvoice = (invoice: InvoiceRecord): string | undefined => {
    // 1. Use locally stored paidAt on the invoice (set when payment was registered)
    if (invoice.paidAt) return invoice.paidAt;

    // 2. Fallback: find matching backend payment
    const payment = quotePayments.find((p: any) => {
      const pIndex = Number(p.installmentIndex ?? p.plan_installment_index ?? -1);
      const pStatus = String(p.status ?? '').toLowerCase();
      return pIndex === invoice.installmentIndex && (pStatus === 'confirmed' || pStatus === 'approved');
    });
    return payment?.paidAt ?? payment?.createdAt;
  };

  const handleGenerateInvoice = () => {
    if (!quote) return;
    const data = safeParseQuoteData(quote.data);
    if (!data) {
      showNotification('Error al leer los datos de la cotización', 'error');
      return;
    }

    const installments = getInstallments();
    const existingInvoices = data.invoices || [];

    // Find first installment without an invoice
    let targetIdx = 0;
    let found = false;
    for (let i = 0; i < installments.length; i++) {
      if (!existingInvoices.some((inv: InvoiceRecord) => inv.installmentIndex === i)) {
        targetIdx = i;
        found = true;
        break;
      }
    }

    if (!found && installments.length > 0) {
      showNotification('Todas las cuotas ya tienen cuenta de cobro generada', 'warning');
      return;
    }

    if (installments.length === 0) {
      showNotification('No hay plan de pagos configurado', 'error');
      return;
    }

    setFormData(data);
    navigate(`/invoice/${quote.id}?mode=generate&installmentIndex=${targetIdx}`);
  };

  const handleViewInvoice = (invoice: InvoiceRecord) => {
    if (!quote) return;
    navigate(`/invoice/${quote.id}?invoiceId=${invoice.id}`);
  };

  const handleOpenPayment = (invoice: InvoiceRecord) => {
    setSelectedInvoice(invoice);
    const today = formatLocalDate(new Date());

    setPaymentForm({
      installmentIndex: invoice.installmentIndex,
      method: 'manual',
      notes: '',
      date: today,
    });
    setShowPaymentModal(true);
  };

  const handleOpenReceipt = (invoice: InvoiceRecord) => {
    setReceiptInvoice(invoice);
    setShowReceiptModal(true);
  };

  const handleSavePayment = async () => {
    if (!quote || !selectedInvoice) return;

    const installments = getInstallments();
    const selectedInst = installments[paymentForm.installmentIndex];

    if (!selectedInst) {
      showNotification('Selecciona una cuota válida', 'error');
      return;
    }

    if (isInstallmentPaid(paymentForm.installmentIndex)) {
      showNotification('Esta cuota ya está pagada', 'error');
      return;
    }

    const amount = Math.round(quote.price * selectedInst.percentage / 100);

    try {
      const { apiService } = await import('../../shared/services/api');
      await apiService.createQuotePayment(quote.id, {
        installmentIndex: paymentForm.installmentIndex,
        amount,
        method: paymentForm.method,
        notes: paymentForm.notes,
        status: 'confirmed',
        paidAt: paymentForm.date,
      });

      // Update local invoice with paid status and date
      const data = safeParseQuoteData(quote.data);
      if (data && data.invoices) {
        const updatedInvoices = data.invoices.map((inv: InvoiceRecord) => {
          if (inv.installmentIndex === paymentForm.installmentIndex) {
            return { ...inv, status: 'paid' as const, paidAt: paymentForm.date };
          }
          return inv;
        });
        const updatedData = { ...data, invoices: updatedInvoices };
        updateQuote(quote.id, { data: updatedData });
        setInvoices(updatedInvoices);
      }

      showNotification('Pago registrado correctamente', 'success');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      // Reload payments
      loadQuotePayments(quote.id);
    } catch (err: any) {
      showNotification(err.message || 'Error al registrar pago', 'error');
    }
  };

  const statusColors: Record<string, string> = {
    pending: '#e74c3c',
    paid: '#2ecc71',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagada',
  };

  if (!quote) {
    return (
      <main>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small">Cotización no encontrada</p>
          <button className="btn mt-2" onClick={() => navigate('/history')}>
            Volver al Historial
          </button>
        </div>
      </main>
    );
  }

  const installments = getInstallments();
  const missingInvoices = installments.filter((_: any, idx: number) =>
    !invoices.some((inv) => inv.installmentIndex === idx)
  ).length;

  return (
    <main>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>💳 Cuentas de Cobro</h1>
        <button className="btn btn-small btn-secondary" onClick={() => navigate('/history')}>
          ← Volver al Historial
        </button>
      </div>

      {/* Quote info card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex-between">
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>{quote.client}</h3>
            <p className="small">{quote.project}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="small" style={{ color: '#999' }}>Cuotas</div>
            <div style={{ fontWeight: 600 }}>
              {invoices.length} / {installments.length}
            </div>
          </div>
        </div>
        <div className="flex-between mt-1">
          <span className="small">{quote.area.toFixed(0)}m² — ${quote.price.toLocaleString('es-CO')}</span>
          <span className="small" style={{ color: '#999' }}>{quote.date}</span>
        </div>
      </div>

      {/* Generate button */}
      {missingInvoices > 0 && (
        <button className="btn mb-2" onClick={handleGenerateInvoice} style={{ width: '100%' }}>
          ➕ Generar cuenta de cobro ({missingInvoices} pendiente{missingInvoices !== 1 ? 's' : ''})
        </button>
      )}

      {/* Invoices list */}
      {invoices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>No hay cuentas de cobro generadas</p>
          <p className="small mt-1" style={{ color: '#666' }}>Haz clic en "Generar cuenta de cobro" para crear la primera</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {invoices.map((invoice) => {
            const currentStatus = getInvoiceStatus(invoice);
            const paidAt = getPaidAtForInvoice(invoice);
            const installmentName = installments[invoice.installmentIndex]?.name || `Cuota ${invoice.installmentIndex + 1}`;
            const installmentPct = installments[invoice.installmentIndex]?.percentage || 0;

            return (
              <div
                key={invoice.id}
                className="card"
                style={{
                  borderLeft: '3px solid #b69462',
                  cursor: 'pointer',
                }}
              >
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      Cuenta de cobro #{String(invoice.number).padStart(3, '0')}
                    </div>
                    <p className="small" style={{ color: '#999', marginTop: 2 }}>
                      {installmentName} ({installmentPct}%)
                    </p>
                    <p className="small" style={{ color: '#666', marginTop: 2 }}>{invoice.description}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#b69462' }}>
                      ${invoice.totalAmount.toLocaleString('es-CO')}
                    </div>
                    <div
                      className="small"
                      style={{
                        color: statusColors[currentStatus],
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      {statusLabels[currentStatus]}
                    </div>
                  </div>
                </div>

                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <span className="small" style={{ color: '#666' }}>
                    Creada: {new Date(invoice.createdAt).toLocaleDateString('es-CO')}
                  </span>
                  {paidAt && (
                    <span className="small" style={{ color: '#2ecc71' }}>
                      Pagada: {displayDate(paidAt)}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => handleViewInvoice(invoice)}
                  >
                    👁️ Ver
                  </button>
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => handleOpenPayment(invoice)}
                    disabled={currentStatus === 'paid'}
                    style={currentStatus === 'paid' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    {currentStatus === 'paid' ? '✓ Pagada' : '💰 Agregar pago'}
                  </button>
                  <button
                    className="btn btn-small"
                    onClick={() => handleOpenReceipt(invoice)}
                    disabled={currentStatus !== 'paid'}
                    style={currentStatus !== 'paid' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    📄 Recibo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentModal(false); }}
        >
          <div className="modal" style={{ maxWidth: 480, width: '100%' }}>
            <h3 style={{ marginBottom: 12 }}>💰 Registrar Pago</h3>
            <p className="small mb-2" style={{ color: '#999' }}>
              Cuenta de cobro #{String(selectedInvoice.number).padStart(3, '0')} — {selectedInvoice.client}
            </p>
            <p className="small mb-2" style={{ color: '#b69462', fontWeight: 600 }}>
              Cuota: {installments[selectedInvoice.installmentIndex]?.name || `Cuota ${selectedInvoice.installmentIndex + 1}`}
              {' '}({installments[selectedInvoice.installmentIndex]?.percentage || 0}%) —
              {' '}${selectedInvoice.totalAmount.toLocaleString('es-CO')}
            </p>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Fecha de pago</label>
                <input
                  type="date"
                  className="input"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                />
              </div>

              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Método</label>
                <select
                  className="input"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                >
                  <option value="manual">Efectivo / Manual</option>
                  <option value="transfer">Transferencia bancaria</option>
                  <option value="check">Cheque</option>
                </select>
              </div>

              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Notas</label>
                <textarea
                  className="input"
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Opcional..."
                />
              </div>

              <div className="flex-between mt-1">
                <button className="btn btn-small btn-secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancelar
                </button>
                <button className="btn btn-small" onClick={handleSavePayment}>
                  Guardar Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && receiptInvoice && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowReceiptModal(false); }}
        >
          <div className="modal" style={{ maxWidth: 640, width: '100%', padding: 24 }}>
            <PaymentReceipt
              invoice={receiptInvoice}
              config={config}
              paidAt={getPaidAtForInvoice(receiptInvoice)}
              totalPaid={receiptInvoice.totalAmount}
            />
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button className="btn btn-small btn-secondary" onClick={() => setShowReceiptModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
