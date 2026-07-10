import { useStore } from '../../shared/services/store';
import { TourBanner } from '../../shared/components/TourBanner';
import { isTourActiveForRoute } from '../../shared/utils/tour';
import { BackButton } from '../../shared/components/BackButton';
import { Receipt, Building2, User, Signature, Landmark, FileText } from 'lucide-react';

export function CuentaCobroPage() {
  const config = useStore((s) => s.config);
  const updateConfig = useStore((s) => s.updateConfig);
  const showTour = isTourActiveForRoute('/cuenta-cobro');

  const updateInvoiceField = (section: 'company' | 'representative' | 'banking' | 'document', field: string, value: string | number) => {
    updateConfig({
      invoice: {
        ...config.invoice,
        [section]: {
          ...config.invoice[section],
          [field]: value,
        },
      },
    });
  };

  const toggleInvoiceSection = (section: 'company' | 'representative' | 'banking') => {
    updateConfig({
      invoice: {
        ...config.invoice,
        [section]: {
          ...config.invoice[section],
          enabled: !config.invoice[section].enabled,
        },
      },
    });
  };

  return (
    <main>
      <BackButton />
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}><Receipt size={28} color="#b69462" /> Cuenta de Cobro</h1>
      <p className="small">Configurar datos para facturación</p>

      {/* Company */}
      <div className="card mt-2">
        <div className="flex-between mb-2">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={18} color="#b69462" /> Datos de la Empresa</h3>
          <button
            type="button"
            aria-label="Activar datos de la empresa"
            className={`checkbox ${config.invoice.company.enabled ? 'checked' : ''}`}
            onClick={() => toggleInvoiceSection('company')}
            style={{ width: 'auto', padding: '8px 12px', margin: 0, background: 'none', border: 'none', cursor: 'pointer' }}
          ></button>
        </div>

        {config.invoice.company.enabled ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="small mb-1" htmlFor="cc-nombre">Nombre de la empresa</label>
              <input id="cc-nombre" className="input" value={config.invoice.company.name} onChange={(e) => updateInvoiceField('company', 'name', e.target.value)} />
            </div>
            <div>
              <label className="small mb-1" htmlFor="cc-nit">NIT/RUT/RFC</label>
              <input id="cc-nit" className="input" value={config.invoice.company.nit} onChange={(e) => updateInvoiceField('company', 'nit', e.target.value)} />
            </div>
            <div>
              <label className="small mb-1" htmlFor="cc-direccion">Dirección</label>
              <input id="cc-direccion" className="input" value={config.invoice.company.address} onChange={(e) => updateInvoiceField('company', 'address', e.target.value)} />
            </div>
            <div>
              <label className="small mb-1" htmlFor="cc-telefono">Teléfono</label>
              <input id="cc-telefono" className="input" value={config.invoice.company.phone} onChange={(e) => updateInvoiceField('company', 'phone', e.target.value)} />
            </div>
            <div>
              <label className="small mb-1" htmlFor="cc-email">Email</label>
              <input id="cc-email" className="input" type="email" value={config.invoice.company.email} onChange={(e) => updateInvoiceField('company', 'email', e.target.value)} />
            </div>
            <div>
              <label className="small mb-1" htmlFor="cc-website">Sitio web (opcional)</label>
              <input id="cc-website" className="input" value={config.invoice.company.website} onChange={(e) => updateInvoiceField('company', 'website', e.target.value)} />
            </div>
            <p className="small" style={{ color: '#b69462', padding: '8px 0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={14} /> Logo: configura tu logo en <strong>Perfil</strong>.
            </p>
          </div>
        ) : (
          <p className="small" style={{ color: '#999' }}>Desactivado - No aparecerá en la cuenta de cobro</p>
        )}
      </div>

      {/* Representative */}
      <div className="card">
        <div className="flex-between mb-2">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><User size={18} color="#b69462" /> Representante Legal</h3>
          <button
            type="button"
            aria-label="Activar representante legal"
            className={`checkbox ${config.invoice.representative.enabled ? 'checked' : ''}`}
            onClick={() => toggleInvoiceSection('representative')}
            style={{ width: 'auto', padding: '8px 12px', margin: 0, background: 'none', border: 'none', cursor: 'pointer' }}
          ></button>
        </div>

        {config.invoice.representative.enabled ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="small mb-1" htmlFor="cc-rep-nombre">Nombre completo</label>
              <input id="cc-rep-nombre" className="input" value={config.invoice.representative.name} onChange={(e) => updateInvoiceField('representative', 'name', e.target.value)} />
            </div>
            <div>
              <label className="small mb-1" htmlFor="cc-rep-cargo">Cargo</label>
              <input id="cc-rep-cargo" className="input" value={config.invoice.representative.position} onChange={(e) => updateInvoiceField('representative', 'position', e.target.value)} />
            </div>
            <div>
              <label className="small mb-1" htmlFor="cc-rep-documento">Documento de identidad</label>
              <input id="cc-rep-documento" className="input" value={config.invoice.representative.document} onChange={(e) => updateInvoiceField('representative', 'document', e.target.value)} />
            </div>
            <p className="small" style={{ color: '#b69462', padding: '8px 0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Signature size={14} /> Firma digital: configura tu firma en <strong>Perfil</strong>.
            </p>
          </div>
        ) : (
          <p className="small" style={{ color: '#999' }}>Desactivado - No aparecerá en la cuenta de cobro</p>
        )}
      </div>

      {/* Banking */}
      <div className="card">
        <div className="flex-between mb-2">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><Landmark size={18} color="#b69462" /> Datos Bancarios</h3>
          <button
            type="button"
            aria-label="Activar datos bancarios"
            className={`checkbox ${config.invoice.banking.enabled ? 'checked' : ''}`}
            onClick={() => toggleInvoiceSection('banking')}
            style={{ width: 'auto', padding: '8px 12px', margin: 0, background: 'none', border: 'none', cursor: 'pointer' }}
          ></button>
        </div>

        {config.invoice.banking.enabled ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="small mb-1" htmlFor="cc-banco">Banco</label>
              <input id="cc-banco" className="input" value={config.invoice.banking.bank} onChange={(e) => updateInvoiceField('banking', 'bank', e.target.value)} />
            </div>
            <div>
              <label className="small mb-1" htmlFor="cc-tipo-cuenta">Tipo de cuenta</label>
              <select id="cc-tipo-cuenta" className="select" value={config.invoice.banking.accountType} onChange={(e) => updateInvoiceField('banking', 'accountType', e.target.value)}>
                <option value="Ahorros">Ahorros</option>
                <option value="Corriente">Corriente</option>
              </select>
            </div>
            <div>
              <label className="small mb-1" htmlFor="cc-cuenta-numero">Número de cuenta</label>
              <input id="cc-cuenta-numero" className="input" value={config.invoice.banking.accountNumber} onChange={(e) => updateInvoiceField('banking', 'accountNumber', e.target.value)} />
            </div>
            <div>
              <label className="small mb-1" htmlFor="cc-cuenta-titular">Titular de la cuenta</label>
              <input id="cc-cuenta-titular" className="input" value={config.invoice.banking.accountHolder} onChange={(e) => updateInvoiceField('banking', 'accountHolder', e.target.value)} />
            </div>
          </div>
        ) : (
          <p className="small" style={{ color: '#999' }}>Desactivado - No aparecerá en la cuenta de cobro</p>
        )}
      </div>

      {/* Document Config */}
      <div className="card" style={{ marginBottom: 100 }}>
        <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} color="#b69462" /> Configuración del Documento</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="small mb-1" htmlFor="cc-consecutivo">Número consecutivo actual</label>
            <input
              id="cc-consecutivo"
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="1"
              value={config.invoice.document.consecutiveNumber === 1 ? '' : String(config.invoice.document.consecutiveNumber || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  updateInvoiceField('document', 'consecutiveNumber', 1);
                } else if (/^\d*$/.test(val)) {
                  updateInvoiceField('document', 'consecutiveNumber', parseInt(val) || 1);
                }
              }}
            />
            <p className="small mt-1" style={{ color: '#999' }}>Se incrementa automáticamente con cada cuenta de cobro</p>
          </div>
          <div>
            <label className="small mb-1" htmlFor="cc-terminos">Términos y condiciones</label>
            <textarea id="cc-terminos" className="input" rows={3} value={config.invoice.document.terms} onChange={(e) => updateInvoiceField('document', 'terms', e.target.value)} />
          </div>
          <div>
            <label className="small mb-1" htmlFor="cc-nota-pie">Nota al pie (opcional)</label>
            <input id="cc-nota-pie" className="input" value={config.invoice.document.footerNote} onChange={(e) => updateInvoiceField('document', 'footerNote', e.target.value)} />
          </div>
        </div>
      </div>

      {showTour && <TourBanner />}
    </main>
  );
}
