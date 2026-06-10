import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../../shared/services/store';

import { safeParseQuoteData } from '../../shared/utils/parseQuoteData';
import { calculateArea, calculatePrice, roundTo50 } from '../../shared/services/calculator';
import type { QuoteFormData, InvoiceRecord } from '../../shared/types';

export function InvoicePage() {
  const navigate = useNavigate();
  const { quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode'); // 'generate'
  const invoiceId = searchParams.get('invoiceId');
  const installmentIndexParam = searchParams.get('installmentIndex');

  const { formData: currentFormData, config, getQuoteById, setFormData, paymentPlans, updateQuote } = useStore();

  const [quotePayments, setQuotePayments] = useState<any[]>([]);
  const [displayFormData, setDisplayFormData] = useState<QuoteFormData | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('0001');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [targetInstallmentIndex, setTargetInstallmentIndex] = useState<number>(0);

  const isGenerateMode = mode === 'generate';

  // Resolve installments for this quote
  const selectedPlan = paymentPlans.find((p) => String(p.id) === String(displayFormData?.paymentPlanId ?? currentFormData.paymentPlanId));
  const planPayments = selectedPlan ? selectedPlan.installments : config.paymentPlan.payments;

  // Load quote and determine what to display
  useEffect(() => {
    if (!quoteId) return;

    const quote = getQuoteById(quoteId);
    if (!quote) {
      loadQuoteFromBackend(quoteId);
      return;
    }

    const data = safeParseQuoteData(quote.data);
    if (!data) return;

    if (isGenerateMode) {
      // Use current quote data (live)
      setDisplayFormData(data);
      const count = (data.invoiceCount || 0) + 1;
      setInvoiceNumber(String(count).padStart(4, '0'));
      setInvoiceDate(new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }));

      // Determine which installment this invoice targets
      const existingInvoices = data.invoices || [];
      let targetIdx = 0;
      if (installmentIndexParam !== null) {
        targetIdx = parseInt(installmentIndexParam, 10) || 0;
      } else {
        // Find first installment without an invoice
        for (let i = 0; i < planPayments.length; i++) {
          if (!existingInvoices.some((inv: InvoiceRecord) => inv.installmentIndex === i)) {
            targetIdx = i;
            break;
          }
        }
      }
      setTargetInstallmentIndex(targetIdx);
    } else if (invoiceId && data.invoices) {
      // Use snapshot from specific invoice
      const inv = data.invoices.find((i: InvoiceRecord) => i.id === invoiceId);
      if (inv) {
        setDisplayFormData(inv.formDataSnapshot);
        setInvoiceNumber(String(inv.number).padStart(4, '0'));
        setInvoiceDate(new Date(inv.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }));
        setTargetInstallmentIndex(inv.installmentIndex);
      } else {
        setDisplayFormData(data);
        setInvoiceNumber('0001');
      }
    } else {
      // Fallback: show current data
      setDisplayFormData(data);
      setInvoiceNumber(String((data.invoiceCount || 0) + 1).padStart(4, '0'));
      setInvoiceDate(new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }));
    }
  }, [quoteId, getQuoteById, isGenerateMode, invoiceId, installmentIndexParam]);

  const loadQuoteFromBackend = async (id: number | string) => {
    try {
      const { apiService, extractData } = await import('../../shared/services/api');
      const res = await apiService.getQuote(id);
      const quote = extractData(res);
      if (quote) {
        const data = safeParseQuoteData(quote.data);
        if (data) {
          setDisplayFormData(data);
          const count = (data.invoiceCount || 0) + 1;
          setInvoiceNumber(String(count).padStart(4, '0'));
          setInvoiceDate(new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }));
        }
      }
    } catch {
      // Silently fail
    }
  };

  // Load payment plans if empty
  useEffect(() => {
    if (paymentPlans.length === 0) {
      const { loadPaymentPlans } = useStore.getState();
      loadPaymentPlans();
    }
  }, [paymentPlans.length]);

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

  // Use displayFormData if available, otherwise fall back to current store formData
  const activeFormData = displayFormData || currentFormData;

  const area = calculateArea(activeFormData);
  const price = calculatePrice(activeFormData, config);
  const inv = config.invoice;
  const totalPrice = roundTo50(price);

  const targetInstallment = planPayments[targetInstallmentIndex];
  const installmentAmount = targetInstallment
    ? roundTo50(totalPrice * targetInstallment.percentage / 100)
    : totalPrice;

  const isPaid = (index: number) => {
    return quotePayments.some((p) => {
      const pIndex = Number(p.installmentIndex ?? p.plan_installment_index ?? -1);
      const pStatus = String(p.status ?? '').toLowerCase();
      return pIndex === index && (pStatus === 'confirmed' || pStatus === 'approved');
    });
  };

  const totalPaid = quotePayments
    .filter((p) => {
      const pStatus = String(p.status ?? '').toLowerCase();
      return pStatus === 'confirmed' || pStatus === 'approved';
    })
    .reduce((sum, p) => sum + (parseFloat(p.transactionAmount ?? p.amount ?? p.transaction_amount ?? 0) || 0), 0);

  const handlePrint = () => window.print();

  const handleFinalize = () => {
    if (!quoteId || !displayFormData) return;

    const installmentName = targetInstallment?.name || `Cuota ${targetInstallmentIndex + 1}`;

    // Create invoice record linked to specific installment
    const newInvoice: InvoiceRecord = {
      id: crypto.randomUUID(),
      number: (displayFormData.invoiceCount || 0) + 1,
      installmentIndex: targetInstallmentIndex,
      createdAt: new Date().toISOString(),
      client: displayFormData.client,
      project: displayFormData.project,
      description: generateDescription(activeFormData, config, area, installmentName),
      totalAmount: installmentAmount,
      status: 'pending',
      formDataSnapshot: { ...displayFormData },
    };

    // Update quote data with new invoice and incremented count
    const updatedData = {
      ...displayFormData,
      invoiceCount: newInvoice.number,
      invoices: [...(displayFormData.invoices || []), newInvoice],
    };

    setFormData(updatedData);
    updateQuote(quoteId, { data: updatedData });

    // Also update via backend to persist
    try {
      import('../../shared/services/api').then(({ apiService }) => {
        apiService.updateQuote(quoteId, { data: updatedData }).catch(() => {});
      });
    } catch {}

    navigate(`/quotes/${quoteId}/invoices`);
  };

  const generateDescription = (data: QuoteFormData, cfg: typeof config, ar: typeof area, installmentName: string): string => {
    const parts: string[] = [];
    if (data.hasCompletePackage) {
      parts.push(cfg.completePackage.name);
    } else {
      data.selectedSubPackages.forEach((id) => {
        const pkg = cfg.subPackages[id];
        if (pkg) parts.push(pkg.name);
      });
      data.selectedServices.forEach((id) => {
        const svc = cfg.services[id];
        if (svc) parts.push(svc.name);
      });
    }
    if (parts.length === 0) parts.push('Servicios profesionales');
    const shortList = parts.slice(0, 2).join(', ');
    const more = parts.length > 2 ? ` y ${parts.length - 2} más` : '';
    return `${installmentName}: ${shortList}${more} — ${ar.total.toFixed(2)}m²`;
  };

  if (!activeFormData.client) {
    return (
      <main>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small">Cargando cotización...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="no-print" style={{ marginBottom: 20 }}>
        <button
          className="btn btn-small btn-secondary"
          onClick={() => navigate(`/quotes/${quoteId}/invoices`)}
        >
          ← Volver a Cuentas de Cobro
        </button>

        <button className="btn btn-small" onClick={handlePrint} style={{ float: 'right' }}>
          🖨️ Imprimir / PDF
        </button>
      </div>

      {/* Installment info banner in generate mode */}
      {isGenerateMode && targetInstallment && (
        <div className="no-print" style={{
          background: 'rgba(182,148,98,0.1)',
          border: '1px solid rgba(182,148,98,0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#b69462' }}>
            Generando cuenta de cobro para: {targetInstallment.name} ({targetInstallment.percentage}%)
          </div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            Monto de esta cuota: ${installmentAmount.toLocaleString('es-CO')} COP
          </div>
        </div>
      )}

      <div
        className="invoice-doc"
        style={{
          background: 'white',
          color: '#000',
          padding: '15px 20px',
          maxWidth: 750,
          margin: '0 auto',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '2px solid #333',
          }}
        >
          <div>
            {inv.company.enabled && inv.company.logo && (
              <img src={inv.company.logo} style={{ maxWidth: 160, maxHeight: 80, marginBottom: 8, display: 'block' }} />
            )}
            {inv.company.enabled && (
              <>
                <div style={{ fontSize: 15, fontWeight: 'bold', color: '#333', lineHeight: 1.2, marginBottom: 3 }}>
                  {inv.company.name}
                </div>
                {inv.company.nit && <div style={{ fontSize: 10, color: '#666', lineHeight: 1.3 }}>NIT: {inv.company.nit}</div>}
                {inv.company.address && <div style={{ fontSize: 10, color: '#666', lineHeight: 1.3 }}>{inv.company.address}</div>}
                {inv.company.phone && <div style={{ fontSize: 10, color: '#666', lineHeight: 1.3 }}>Tel: {inv.company.phone}</div>}
                {inv.company.email && <div style={{ fontSize: 10, color: '#666', lineHeight: 1.3 }}>{inv.company.email}</div>}
                {inv.company.website && <div style={{ fontSize: 10, color: '#666', lineHeight: 1.3 }}>{inv.company.website}</div>}
              </>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 2, lineHeight: 1 }}>
              CUENTA DE COBRO
            </div>
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.2 }}>No. {invoiceNumber}</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 3, lineHeight: 1.2 }}>{invoiceDate}</div>
            {targetInstallment && (
              <div style={{ fontSize: 10, color: '#b69462', marginTop: 4, fontWeight: 600 }}>
                {targetInstallment.name} ({targetInstallment.percentage}%)
              </div>
            )}
          </div>
        </div>

        {/* Client */}
        <div style={{ marginBottom: 10, pageBreakInside: 'avoid' }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, textTransform: 'uppercase' }}>
            Cliente
          </div>
          <div>
            <strong>{activeFormData.client}</strong>
          </div>
          <div style={{ color: '#666' }}>{activeFormData.project}</div>
        </div>

        {/* Services Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            margin: '8px 0',
            tableLayout: 'fixed',
            pageBreakInside: 'avoid',
          }}
        >
          <thead>
            <tr>
              <th style={{ background: '#f5f5f5', padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #ddd', fontSize: 11, lineHeight: 1.2, width: '40%' }}>
                Descripción
              </th>
              <th style={{ background: '#f5f5f5', padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ddd', fontSize: 11, lineHeight: 1.2, width: '20%' }}>
                Cantidad
              </th>
              <th style={{ background: '#f5f5f5', padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ddd', fontSize: 11, lineHeight: 1.2, width: '20%' }}>
                Valor Unit.
              </th>
              <th style={{ background: '#f5f5f5', padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ddd', fontSize: 11, lineHeight: 1.2, width: '20%' }}>
                Valor Total
              </th>
            </tr>
          </thead>
          <tbody>
            {activeFormData.hasCompletePackage && (
              <tr>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, wordWrap: 'break-word', lineHeight: 1.3 }}>{config.completePackage.name}</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'center' }}>{area.total.toFixed(2)} m²</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${config.completePackage.price.toLocaleString('es-CO')}</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${roundTo50(area.total * config.completePackage.price).toLocaleString('es-CO')}</td>
              </tr>
            )}
            {activeFormData.selectedSubPackages.map((id) => {
              const pkg = config.subPackages[id];
              const total = pkg.unit === '/m²' ? area.total * pkg.price : pkg.price;
              return (
                <tr key={id}>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11 }}>{pkg.name}</td>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'center' }}>{pkg.unit === '/m²' ? area.total.toFixed(2) + ' m²' : '1'}</td>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${pkg.price.toLocaleString('es-CO')}</td>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${roundTo50(total).toLocaleString('es-CO')}</td>
                </tr>
              );
            })}
            {activeFormData.selectedServices.map((id) => {
              const service = config.services[id];
              const total = service.unit === '/m²' ? area.total * service.price : service.price;
              return (
                <tr key={id}>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11 }}>{service.name}</td>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'center' }}>{service.unit === '/m²' ? area.total.toFixed(2) + ' m²' : '1'}</td>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${service.price.toLocaleString('es-CO')}</td>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${roundTo50(total).toLocaleString('es-CO')}</td>
                </tr>
              );
            })}
            {activeFormData.additionalServices.map((service) => (
              <tr key={service.id}>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11 }}>{service.name}</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'center' }}>1</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${service.price.toLocaleString('es-CO')}</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${roundTo50(service.price).toLocaleString('es-CO')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div
          style={{
            textAlign: 'right',
            fontSize: 16,
            fontWeight: 'bold',
            margin: '8px 0',
            padding: 10,
            background: '#f5f5f5',
            borderRadius: 6,
            pageBreakInside: 'avoid',
          }}
        >
          {targetInstallment ? (
            <>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                Valor total cotización: ${totalPrice.toLocaleString('es-CO')} COP
              </div>
              <div>
                VALOR CUOTA ({targetInstallment.name}): ${installmentAmount.toLocaleString('es-CO')} COP
              </div>
            </>
          ) : (
            <>VALOR TOTAL: ${totalPrice.toLocaleString('es-CO')} COP</>
          )}
        </div>

        {/* Payment Plan with Payment Status */}
        {planPayments.length > 0 && (
          <div style={{ marginBottom: 10, pageBreakInside: 'avoid' }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, textTransform: 'uppercase' }}>
              Plan de Pagos
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0' }}>
              <thead>
                <tr>
                  <th style={{ background: '#f5f5f5', padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #ddd', fontSize: 11 }}>Concepto</th>
                  <th style={{ background: '#f5f5f5', padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ddd', fontSize: 11 }}>Porcentaje</th>
                  <th style={{ background: '#f5f5f5', padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ddd', fontSize: 11 }}>Valor</th>
                  <th style={{ background: '#f5f5f5', padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ddd', fontSize: 11 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {planPayments.map((payment, i) => {
                  const amount = roundTo50(totalPrice * payment.percentage / 100);
                  const paid = isPaid(i);
                  const isCurrent = i === targetInstallmentIndex;
                  return (
                    <tr key={i} style={{ background: isCurrent ? '#fff8e1' : undefined }}>
                      <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, fontWeight: isCurrent ? 'bold' : undefined }}>
                        {payment.name} {isCurrent && <span style={{ color: '#b69462' }}>←</span>}
                      </td>
                      <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'center' }}>{payment.percentage}%</td>
                      <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>
                        ${amount.toLocaleString('es-CO')}
                      </td>
                      <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'center' }}>
                        {paid ? (
                          <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>✓ Pagado</span>
                        ) : (
                          <span style={{ color: '#e74c3c' }}>⏳ Pendiente</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Payment summary */}
            <div style={{ marginTop: 12, padding: 12, background: '#fafafa', borderRadius: 8, border: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Total Pagado:</span>
                <span style={{ color: '#2ecc71', fontWeight: 600 }}>${Math.round(totalPaid).toLocaleString('es-CO')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Pendiente:</span>
                <span style={{ color: '#e74c3c', fontWeight: 600 }}>${Math.round(totalPrice - totalPaid).toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Terms */}
        {inv.document.terms && (
          <div style={{ marginBottom: 10, pageBreakInside: 'avoid' }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, textTransform: 'uppercase' }}>
              Términos y Condiciones
            </div>
            <div style={{ fontSize: 10, color: '#666', lineHeight: 1.3 }}>{inv.document.terms}</div>
          </div>
        )}

        {/* Banking */}
        {inv.banking.enabled && (
          <div style={{ marginBottom: 10, pageBreakInside: 'avoid' }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, textTransform: 'uppercase' }}>
              Datos Bancarios
            </div>
            <div style={{ fontSize: 10, lineHeight: 1.4 }}>
              <div style={{ marginBottom: 2 }}>
                <strong>Banco:</strong> {inv.banking.bank} | <strong>Tipo de cuenta:</strong> {inv.banking.accountType}
              </div>
              <div>
                <strong>Número de cuenta:</strong> {inv.banking.accountNumber} | <strong>Titular:</strong> {inv.banking.accountHolder}
              </div>
            </div>
          </div>
        )}

        {/* Signature */}
        {inv.representative.enabled && (
          <div style={{ marginTop: 25, textAlign: 'center', pageBreakInside: 'avoid', position: 'relative' }}>
            {inv.representative.signature ? (
              <>
                <div style={{ height: 20 }} />
                <img
                  src={inv.representative.signature}
                  style={{
                    maxWidth: 220,
                    maxHeight: 80,
                    marginBottom: -10,
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    position: 'relative',
                    zIndex: 1,
                  }}
                />
                <div style={{ borderTop: '2px solid #333', width: 260, margin: '0 auto 8px' }} />
              </>
            ) : null}
            <div style={{ fontSize: 12, fontWeight: 'bold', lineHeight: 1.2 }}>{inv.representative.name}</div>
            {inv.representative.position && <div style={{ fontSize: 10, color: '#666', lineHeight: 1.2 }}>{inv.representative.position}</div>}
            {inv.representative.document && <div style={{ fontSize: 10, color: '#666', lineHeight: 1.2 }}>{inv.representative.document}</div>}
          </div>
        )}

        {/* Footer */}
        {inv.document.footerNote && (
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: '#999', lineHeight: 1.2 }}>
            {inv.document.footerNote}
          </div>
        )}
      </div>

      {/* Generate mode: Finalize button */}
      {isGenerateMode && (
        <div className="no-print" style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn" onClick={handleFinalize} style={{ padding: '12px 32px', fontSize: 16 }}>
            ✓ Finalizar y Guardar
          </button>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .wrap { max-width: 100% !important; padding: 10px !important; margin: 0 !important; }
          .invoice-doc { padding: 15px 20px !important; margin: 0 !important; }
        }
      `}</style>
    </main>
  );
}
