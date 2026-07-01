import { useStore } from '../../shared/services/store';
import { TourBanner } from '../../shared/components/TourBanner';
import { isTourActiveForRoute } from '../../shared/utils/tour';
import { BackButton } from '../../shared/components/BackButton';
import { Receipt, Building2, User, Signature, Landmark, FileText } from 'lucide-react';

export function CuentaCobroPage() {
  const { config, updateConfig } = useStore();
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
          <div
            className={`checkbox ${config.invoice.company.enabled ? 'checked' : ''}`}
            onClick={() => toggleInvoiceSection('company')}
            style={{ width: 'auto', padding: '8px 12px', margin: 0 }}
          />
        </div>

        {config.invoice.company.enabled ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <p className="small mb-1">Nombre de la empresa</p>
              <input className="input" value={config.invoice.company.name} onChange={(e) => updateInvoiceField('company', 'name', e.target.value)} />
            </div>
            <div>
              <p className="small mb-1">NIT/RUT/RFC</p>
              <input className="input" value={config.invoice.company.nit} onChange={(e) => updateInvoiceField('company', 'nit', e.target.value)} />
            </div>
            <div>
              <p className="small mb-1">Dirección</p>
              <input className="input" value={config.invoice.company.address} onChange={(e) => updateInvoiceField('company', 'address', e.target.value)} />
            </div>
            <div>
              <p className="small mb-1">Teléfono</p>
              <input className="input" value={config.invoice.company.phone} onChange={(e) => updateInvoiceField('company', 'phone', e.target.value)} />
            </div>
            <div>
              <p className="small mb-1">Email</p>
              <input className="input" type="email" value={config.invoice.company.email} onChange={(e) => updateInvoiceField('company', 'email', e.target.value)} />
            </div>
            <div>
              <p className="small mb-1">Sitio web (opcional)</p>
              <input className="input" value={config.invoice.company.website} onChange={(e) => updateInvoiceField('company', 'website', e.target.value)} />
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
          <div
            className={`checkbox ${config.invoice.representative.enabled ? 'checked' : ''}`}
            onClick={() => toggleInvoiceSection('representative')}
            style={{ width: 'auto', padding: '8px 12px', margin: 0 }}
          />
        </div>

        {config.invoice.representative.enabled ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <p className="small mb-1">Nombre completo</p>
              <input className="input" value={config.invoice.representative.name} onChange={(e) => updateInvoiceField('representative', 'name', e.target.value)} />
            </div>
            <div>
              <p className="small mb-1">Cargo</p>
              <input className="input" value={config.invoice.representative.position} onChange={(e) => updateInvoiceField('representative', 'position', e.target.value)} />
            </div>
            <div>
              <p className="small mb-1">Documento de identidad</p>
              <input className="input" value={config.invoice.representative.document} onChange={(e) => updateInvoiceField('representative', 'document', e.target.value)} />
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
          <div
            className={`checkbox ${config.invoice.banking.enabled ? 'checked' : ''}`}
            onClick={() => toggleInvoiceSection('banking')}
            style={{ width: 'auto', padding: '8px 12px', margin: 0 }}
          />
        </div>

        {config.invoice.banking.enabled ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <p className="small mb-1">Banco</p>
              <input className="input" value={config.invoice.banking.bank} onChange={(e) => updateInvoiceField('banking', 'bank', e.target.value)} />
            </div>
            <div>
              <p className="small mb-1">Tipo de cuenta</p>
              <select className="select" value={config.invoice.banking.accountType} onChange={(e) => updateInvoiceField('banking', 'accountType', e.target.value)}>
                <option value="Ahorros">Ahorros</option>
                <option value="Corriente">Corriente</option>
              </select>
            </div>
            <div>
              <p className="small mb-1">Número de cuenta</p>
              <input className="input" value={config.invoice.banking.accountNumber} onChange={(e) => updateInvoiceField('banking', 'accountNumber', e.target.value)} />
            </div>
            <div>
              <p className="small mb-1">Titular de la cuenta</p>
              <input className="input" value={config.invoice.banking.accountHolder} onChange={(e) => updateInvoiceField('banking', 'accountHolder', e.target.value)} />
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
            <p className="small mb-1">Número consecutivo actual</p>
            <input
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
            <p className="small mb-1">Términos y condiciones</p>
            <textarea className="input" rows={3} value={config.invoice.document.terms} onChange={(e) => updateInvoiceField('document', 'terms', e.target.value)} />
          </div>
          <div>
            <p className="small mb-1">Nota al pie (opcional)</p>
            <input className="input" value={config.invoice.document.footerNote} onChange={(e) => updateInvoiceField('document', 'footerNote', e.target.value)} />
          </div>
        </div>
      </div>

      {showTour && <TourBanner />}
    </main>
  );
}
