import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../shared/services/store';
import { safeParseQuoteData } from '../../shared/utils/parseQuoteData';
import { calculateArea, calculatePrice, roundTo50 } from '../../shared/services/calculator';
<<<<<<< Updated upstream
import logoBlack from '../../assets/LOGO SIN BANER/ELEMENThaus - Transparent Black.png';
=======
import type { QuoteFormData, InvoiceRecord } from '../../shared/types';
import { ArrowLeft, Printer, Check } from 'lucide-react';
>>>>>>> Stashed changes

export function InvoicePage() {
  const navigate = useNavigate();
  const { quoteId } = useParams();
  const { formData, config, getQuoteById, setFormData } = useStore();

  // If formData is empty (refresh/direct navigation), load from the quote ID in the URL
  useEffect(() => {
    if (!formData.client && quoteId) {
      const quote = getQuoteById(Number(quoteId));
      if (quote) {
        const data = safeParseQuoteData(quote.data);
        if (data) setFormData(data);
      }
    }
  }, [formData.client, quoteId, getQuoteById, setFormData]);
  const area = calculateArea(formData);
  const price = calculatePrice(formData, config);
  const inv = config.invoice;
<<<<<<< Updated upstream
  const invoiceNumber = (inv.document.consecutiveNumber - 1).toString().padStart(4, '0');
  const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
=======
  const totalPrice = roundTo50(price);

  const targetInstallment = planPayments[targetInstallmentIndex];
  const installmentAmount = targetInstallment
    ? roundTo50(totalPrice * targetInstallment.percentage / 100)
    : totalPrice;

  const PAID_STATUSES = ['confirmed', 'approved', 'paid'];

  const isPaid = (index: number) => {
    return quotePayments.some((p) => {
      const pIndex = Number(p.installmentIndex ?? p.installment_index ?? p.plan_installment_index ?? -1);
      const pStatus = String(p.status ?? 'confirmed').toLowerCase();
      return pIndex === index && PAID_STATUSES.includes(pStatus);
    });
  };

  const totalPaid = quotePayments
    .filter((p) => {
      const pStatus = String(p.status ?? 'confirmed').toLowerCase();
      return PAID_STATUSES.includes(pStatus);
    })
    .reduce((sum, p) => sum + (parseFloat(p.transactionAmount ?? p.amount ?? p.transaction_amount ?? 0) || 0), 0);
>>>>>>> Stashed changes

  const handlePrint = () => window.print();

  return (
    <main>
<<<<<<< Updated upstream
      <div className="no-print" style={{ marginBottom: 20 }}>
        <button className="btn btn-small btn-secondary" onClick={() => navigate('/history')}>
          ← Volver al Historial
        </button>
        <button className="btn btn-small" onClick={handlePrint} style={{ float: 'right' }}>
          🖨️ Imprimir / PDF
=======
      <div className="no-print" style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className="btn btn-small btn-secondary"
          onClick={() => navigate(`/quotes/${quoteId}/invoices`)}
          style={{ flex: '1 1 auto', minWidth: 140, gap: 6 }}
        >
          <ArrowLeft size={15} /> Volver a Cuentas de Cobro
        </button>

        <button className="btn btn-small" onClick={handlePrint} style={{ flex: '1 1 auto', minWidth: 140, gap: 6 }}>
          <Printer size={15} /> Imprimir / PDF
>>>>>>> Stashed changes
        </button>
      </div>

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
            {inv.company.enabled && (
              <img src={inv.company.logo || logoBlack} style={{ maxWidth: 160, maxHeight: 80, marginBottom: 8, display: 'block' }} />
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
            <div style={{ fontSize: 10, color: '#666', marginTop: 3, lineHeight: 1.2 }}>{today}</div>
          </div>
        </div>

        {/* Client */}
        <div style={{ marginBottom: 10, pageBreakInside: 'avoid' }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, textTransform: 'uppercase' }}>
            Cliente
          </div>
          <div>
            <strong>{formData.client}</strong>
          </div>
          <div style={{ color: '#666' }}>{formData.project}</div>
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
            {formData.hasCompletePackage && (
              <tr>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, wordWrap: 'break-word', lineHeight: 1.3 }}>{config.completePackage.name}</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'center' }}>{area.total.toFixed(2)} m²</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${config.completePackage.price.toLocaleString('es-CO')}</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${roundTo50(area.total * config.completePackage.price).toLocaleString('es-CO')}</td>
              </tr>
            )}
            {formData.selectedSubPackages.map((id) => {
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
            {formData.selectedServices.map((id) => {
              const service = config.services[id];
              const total = service.unit === '/m²' ? area.total * service.price : service.price;
              return (
                <tr key={id}>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11 }}>{service.name}</td>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'center' }}>{service.unit === '/m²' ? area.total.toFixed(2) + ' m²' : '1'}</td>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${Number(service.price).toLocaleString('es-CO')}</td>
                  <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${roundTo50(total).toLocaleString('es-CO')}</td>
                </tr>
              );
            })}
            {formData.additionalServices.map((service) => (
              <tr key={service.id}>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11 }}>{service.name}</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'center' }}>1</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${Number(service.price).toLocaleString('es-CO')}</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>${roundTo50(service.price).toLocaleString('es-CO')}</td>
              </tr>
            ))}
            {formData.discount > 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right', fontWeight: 'bold' }}>Descuento</td>
                <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right', color: '#ff3b30' }}>
                  -${formData.discount.toLocaleString('es-CO')}
                </td>
              </tr>
            )}
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
          VALOR TOTAL: ${roundTo50(price).toLocaleString('es-CO')} COP
        </div>

        {/* Payment Plan */}
        {config.paymentPlan.payments.length > 0 && (
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
                </tr>
              </thead>
              <tbody>
<<<<<<< Updated upstream
                {config.paymentPlan.payments.map((payment, i) => (
                  <tr key={i}>
                    <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11 }}>{payment.name}</td>
                    <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'center' }}>{payment.percentage}%</td>
                    <td style={{ padding: 6, border: '1px solid #ddd', fontSize: 11, textAlign: 'right' }}>
                      ${roundTo50(roundTo50(price) * payment.percentage / 100).toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
=======
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
                          <span style={{ color: '#2ecc71', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={13} /> Pagado</span>
                        ) : (
                          <span style={{ color: '#e74c3c', display: 'inline-flex', alignItems: 'center', gap: 4 }}>⏳ Pendiente</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
>>>>>>> Stashed changes
              </tbody>
            </table>
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
          <div style={{ marginTop: 15, textAlign: 'center', pageBreakInside: 'avoid' }}>
            {inv.representative.signature && (
              <img
                src={inv.representative.signature}
                style={{ maxWidth: 160, maxHeight: 50, marginBottom: 6, display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
              />
            )}
            {!inv.representative.signature && <div style={{ height: 40 }} />}
            <div style={{ borderTop: '2px solid #333', width: 220, margin: '0 auto 8px' }} />
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

<<<<<<< Updated upstream
=======
      {/* Generate mode: Finalize button */}
      {isGenerateMode && (
        <div className="no-print" style={{ marginTop: 20 }}>
          <button className="btn" onClick={handleFinalize} style={{ width: '100%', padding: '12px 32px', fontSize: 16, gap: 8 }}>
            <Check size={17} /> Finalizar y Guardar
          </button>
        </div>
      )}

>>>>>>> Stashed changes
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
