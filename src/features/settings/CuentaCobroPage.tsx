import { useRef } from 'react';
import { useStore } from '../../shared/services/store';
import { useAppStore } from '../../shared/hooks/useNotifications';
import { TourBanner } from '../../shared/components/TourBanner';
import { isTourActiveForRoute } from '../../shared/utils/tour';

export function CuentaCobroPage() {
  const { config, updateConfig } = useStore();
  const showNotification = useAppStore((s) => s.showNotification);
  const showTour = isTourActiveForRoute('/cuenta-cobro');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    section: 'company' | 'representative',
    field: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Solo se permiten archivos de imagen', 'error');
      return;
    }

    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      showNotification('La imagen no debe superar 1MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateInvoiceField(section, field, reader.result as string);
      showNotification('Imagen cargada correctamente', 'success');
    };
    reader.onerror = () => {
      showNotification('Error al leer la imagen', 'error');
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (section: 'company' | 'representative', field: string) => {
    updateInvoiceField(section, field, '');
    if (section === 'company' && logoInputRef.current) {
      logoInputRef.current.value = '';
    }
    if (section === 'representative' && signatureInputRef.current) {
      signatureInputRef.current.value = '';
    }
  };

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
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>📋 Cuenta de Cobro</h1>
      <p className="small">Configurar datos para facturación</p>

      {/* Company */}
      <div className="card mt-2">
        <div className="flex-between mb-2">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>🏢 Datos de la Empresa</h3>
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

            {/* Logo upload */}
            <div>
              <p className="small mb-1">Logo de la empresa</p>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'company', 'logo')}
                style={{ display: 'none' }}
              />
              {config.invoice.company.logo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={config.invoice.company.logo}
                    alt="Logo preview"
                    style={{ maxHeight: 60, maxWidth: 120, objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-small btn-secondary" onClick={() => logoInputRef.current?.click()}>
                      Cambiar
                    </button>
                    <button className="btn btn-small btn-danger" onClick={() => clearImage('company', 'logo')}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-small btn-secondary" onClick={() => logoInputRef.current?.click()}>
                  📷 Subir logo
                </button>
              )}
              <p className="small mt-1" style={{ color: '#999' }}>Máximo 1MB. JPG, PNG o SVG.</p>
            </div>
          </div>
        ) : (
          <p className="small" style={{ color: '#999' }}>Desactivado - No aparecerá en la cuenta de cobro</p>
        )}
      </div>

      {/* Representative */}
      <div className="card">
        <div className="flex-between mb-2">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>👤 Representante Legal</h3>
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

            {/* Signature upload */}
            <div>
              <p className="small mb-1">Firma digital</p>
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'representative', 'signature')}
                style={{ display: 'none' }}
              />
              {config.invoice.representative.signature ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={config.invoice.representative.signature}
                    alt="Signature preview"
                    style={{ maxHeight: 60, maxWidth: 160, objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#fff' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-small btn-secondary" onClick={() => signatureInputRef.current?.click()}>
                      Cambiar
                    </button>
                    <button className="btn btn-small btn-danger" onClick={() => clearImage('representative', 'signature')}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-small btn-secondary" onClick={() => signatureInputRef.current?.click()}>
                  ✍️ Subir firma
                </button>
              )}
              <p className="small mt-1" style={{ color: '#999' }}>Máximo 1MB. JPG o PNG con fondo transparente preferible.</p>
            </div>
          </div>
        ) : (
          <p className="small" style={{ color: '#999' }}>Desactivado - No aparecerá en la cuenta de cobro</p>
        )}
      </div>

      {/* Banking */}
      <div className="card">
        <div className="flex-between mb-2">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>🏦 Datos Bancarios</h3>
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
        <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📄 Configuración del Documento</h3>
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
