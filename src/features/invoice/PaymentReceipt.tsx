import { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { InvoiceRecord, AppConfig } from '../../shared/types';

interface PaymentReceiptProps {
  invoice: InvoiceRecord;
  config: AppConfig;
  paidAt?: string;
  totalPaid?: number;
}

export function PaymentReceipt({ invoice, config, paidAt, totalPaid }: PaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`recibo-pago-${String(invoice.number).padStart(3, '0')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  const inv = config.invoice;
  const receiptDate = paidAt
    ? new Date(`${paidAt}T00:00:00`).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <div
        ref={receiptRef}
        style={{
          background: 'white',
          color: '#000',
          padding: '30px 40px',
          maxWidth: 600,
          margin: '0 auto',
          fontFamily: 'Arial, sans-serif',
          border: '1px solid #ddd',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
            paddingBottom: 12,
            borderBottom: '2px solid #333',
          }}
        >
          <div>
            {inv.company.enabled && inv.company.logo && (
              <img
                src={inv.company.logo}
                style={{ maxWidth: 140, maxHeight: 70, marginBottom: 8, display: 'block' }}
              />
            )}
            {inv.company.enabled && (
              <>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>{inv.company.name}</div>
                {inv.company.nit && <div style={{ fontSize: 9, color: '#666' }}>NIT: {inv.company.nit}</div>}
                {inv.company.address && <div style={{ fontSize: 9, color: '#666' }}>{inv.company.address}</div>}
              </>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>RECIBO DE PAGO</div>
            <div style={{ fontSize: 12, color: '#666' }}>CC #{String(invoice.number).padStart(3, '0')}</div>
            <div style={{ fontSize: 9, color: '#666', marginTop: 4 }}>{receiptDate}</div>
          </div>
        </div>

        {/* Payment Info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>RECIBIMOS DE:</div>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>{invoice.client}</div>
          <div style={{ fontSize: 11, color: '#666' }}>{invoice.project}</div>
        </div>

        {/* Amount Box */}
        <div
          style={{
            background: '#f8f8f8',
            border: '2px solid #2ecc71',
            borderRadius: 8,
            padding: 16,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>
            VALOR RECIBIDO
          </div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#2ecc71' }}>
            ${(totalPaid ?? invoice.totalAmount).toLocaleString('es-CO')} COP
          </div>
        </div>

        {/* Concept */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>CONCEPTO:</div>
          <div style={{ fontSize: 11, color: '#333', lineHeight: 1.4 }}>{invoice.description}</div>
        </div>

        {/* Logo footer */}
        {inv.company.enabled && inv.company.logo && (
          <div style={{ textAlign: 'center', marginTop: 30, marginBottom: 20 }}>
            <img
              src={inv.company.logo}
              style={{ maxWidth: 120, maxHeight: 60, opacity: 0.4 }}
            />
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 30, fontSize: 9, color: '#999' }}>
          Este documento certifica el pago recibido. Conserve este recibo para futuras referencias.
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button className="btn btn-small" onClick={handleDownloadPDF}>
          📄 Descargar PDF
        </button>
      </div>
    </div>
  );
}
