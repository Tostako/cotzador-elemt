import { useState } from 'react';
import { useStore } from '../../shared/services/store';
import { useAppStore } from '../../shared/hooks/useNotifications';

export function SettingsPage() {
  const showNotification = useAppStore((s) => s.showNotification);
  const { config, quotes, saveService, deleteService, savePayment, deletePayment, updateConfig, clearAllQuotes } = useStore();
  const [activeTab, setActiveTab] = useState<'tarifas' | 'pagos' | 'cuenta-cobro' | 'estimacion'>('tarifas');

  // Service edit modal
  const [editingService, setEditingService] = useState<{ id: string; name: string; price: number; unit: string } | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');

  // Service form
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', unit: '/m²' });

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({ name: '', percentage: '' });

  // Confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSaveService = () => {
    if (!newService.name.trim() || !newService.price) {
      showNotification('Completa todos los campos', 'error');
      return;
    }
    const id = 'custom_' + Date.now();
    saveService(id, {
      name: newService.name.trim(),
      price: parseInt(newService.price) || 0,
      unit: newService.unit,
    });
    setNewService({ name: '', price: '', unit: '/m²' });
    setShowServiceForm(false);
    showNotification('Servicio agregado correctamente', 'success');
  };

  const handleDeleteService = (id: string) => {
    if (window.confirm(`¿Eliminar "${config.services[id].name}"? Esta acción no se puede deshacer.`)) {
      deleteService(id);
      showNotification('Servicio eliminado', 'success');
    }
  };

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

  const handleClearHistory = () => {
    clearAllQuotes();
    setShowClearConfirm(false);
    showNotification('Historial limpiado completamente', 'success');
  };

  return (
    <main>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Ajustes</h1>
      <p className="small">Configuración de la app</p>

      {/* Tab buttons */}
      <div className="grid-2 mt-2">
        <div
          className={`card ${activeTab === 'tarifas' ? 'active' : ''}`}
          onClick={() => setActiveTab('tarifas')}
          style={{ cursor: 'pointer', borderColor: activeTab === 'tarifas' ? '#b69462' : undefined }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>💰 Tarifas</h3>
          <p className="small">Configurar precios</p>
        </div>
        <div
          className={`card ${activeTab === 'pagos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pagos')}
          style={{ cursor: 'pointer', borderColor: activeTab === 'pagos' ? '#b69462' : undefined }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>💳 Plan de Pagos</h3>
          <p className="small">Configurar cuotas</p>
        </div>
      </div>

      <div
        className="card mt-2"
        onClick={() => setActiveTab('cuenta-cobro')}
        style={{ cursor: 'pointer', borderColor: activeTab === 'cuenta-cobro' ? '#b69462' : undefined }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>📋 Cuenta de Cobro</h3>
        <p className="small">Configurar datos para facturación</p>
      </div>

      <div
        className="card mt-2"
        onClick={() => setActiveTab('estimacion')}
        style={{ cursor: 'pointer', borderColor: activeTab === 'estimacion' ? '#b69462' : undefined }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>🏗️ Estimación de Obra</h3>
        <p className="small">Configurar precios de obra negra y obra gris</p>
      </div>

      {/* Tarifas Tab */}
      {activeTab === 'tarifas' && (
        <>
          <button className="btn mt-2 mb-2" onClick={() => setShowServiceForm(!showServiceForm)}>
            {showServiceForm ? '× Cancelar' : '+ Nuevo Servicio'}
          </button>

          {showServiceForm && (
            <div className="inline-form">
              <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600 }}>Nuevo Servicio</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <p className="small mb-1">Nombre del servicio</p>
                  <input
                    className="input"
                    placeholder="Ej: Estudio geotécnico"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  />
                </div>
                <div>
                  <p className="small mb-1">Unidad</p>
                  <select
                    className="select"
                    value={newService.unit}
                    onChange={(e) => setNewService({ ...newService, unit: e.target.value })}
                  >
                    {['/m²', '/obra', '/trabajo', '/unidad', '/imagen'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="small mb-1">Valor</p>
                  <input
                    className="input"
                    type="number"
                    placeholder="Ej: 8500000"
                    value={newService.price}
                    onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  />
                </div>
                <div className="grid-2">
                  <button className="btn btn-secondary" onClick={() => setShowServiceForm(false)}>Cancelar</button>
                  <button className="btn" onClick={handleSaveService}>Guardar</button>
                </div>
              </div>
            </div>
          )}

          <div className="card mt-2">
            <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Servicios Individuales</h3>
            {Object.keys(config.services).map((id) => (
              <div key={id} className="mb-2" style={{ padding: 16, background: '#0a0a0a', borderRadius: 12 }}>
                <div className="flex-between mb-2">
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{config.services[id].name}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      className="btn-small btn-secondary" 
                      onClick={() => {
                        setEditingService({ id, ...config.services[id] });
                        setEditPriceValue(config.services[id].price.toString());
                      }}
                      style={{ padding: '6px 12px' }}
                    >
                      ✏️ Editar
                    </button>
                    {id.startsWith('custom_') && (
                      <button className="btn-small btn-danger" onClick={() => handleDeleteService(id)}>
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#b69462', fontWeight: 700, fontSize: 18 }}>
                    ${config.services[id].price.toLocaleString('es-CO')}
                  </span>
                  <span style={{ color: '#999', fontSize: 14 }}>{config.services[id].unit}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagos Tab */}
      {activeTab === 'pagos' && (
        <>
          <button className="btn mt-2 mb-2" onClick={() => setShowPaymentForm(!showPaymentForm)}>
            {showPaymentForm ? '× Cancelar' : '+ Nuevo Pago'}
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
                </div>
                <div className="grid-2">
                  <button className="btn btn-secondary" onClick={() => setShowPaymentForm(false)}>Cancelar</button>
                  <button className="btn" onClick={handleSavePayment}>Guardar</button>
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 100 }}>
            <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Pagos Actuales</h3>
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
                  type="number"
                  value={payment.percentage}
                  onChange={(e) => {
                    const payments = [...config.paymentPlan.payments];
                    payments[i] = { ...payments[i], percentage: parseInt(e.target.value) || 0 };
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
        </>
      )}

      {/* Cuenta de Cobro Tab */}
      {activeTab === 'cuenta-cobro' && (
        <>
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
                  <input
                    className="input"
                    value={config.invoice.company.name}
                    onChange={(e) => updateInvoiceField('company', 'name', e.target.value)}
                  />
                </div>
                <div>
                  <p className="small mb-1">NIT/RUT/RFC</p>
                  <input
                    className="input"
                    value={config.invoice.company.nit}
                    onChange={(e) => updateInvoiceField('company', 'nit', e.target.value)}
                  />
                </div>
                <div>
                  <p className="small mb-1">Dirección</p>
                  <input
                    className="input"
                    value={config.invoice.company.address}
                    onChange={(e) => updateInvoiceField('company', 'address', e.target.value)}
                  />
                </div>
                <div>
                  <p className="small mb-1">Teléfono</p>
                  <input
                    className="input"
                    value={config.invoice.company.phone}
                    onChange={(e) => updateInvoiceField('company', 'phone', e.target.value)}
                  />
                </div>
                <div>
                  <p className="small mb-1">Email</p>
                  <input
                    className="input"
                    type="email"
                    value={config.invoice.company.email}
                    onChange={(e) => updateInvoiceField('company', 'email', e.target.value)}
                  />
                </div>
                <div>
                  <p className="small mb-1">Sitio web (opcional)</p>
                  <input
                    className="input"
                    value={config.invoice.company.website}
                    onChange={(e) => updateInvoiceField('company', 'website', e.target.value)}
                  />
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
                  <input
                    className="input"
                    value={config.invoice.representative.name}
                    onChange={(e) => updateInvoiceField('representative', 'name', e.target.value)}
                  />
                </div>
                <div>
                  <p className="small mb-1">Cargo</p>
                  <input
                    className="input"
                    value={config.invoice.representative.position}
                    onChange={(e) => updateInvoiceField('representative', 'position', e.target.value)}
                  />
                </div>
                <div>
                  <p className="small mb-1">Documento de identidad</p>
                  <input
                    className="input"
                    value={config.invoice.representative.document}
                    onChange={(e) => updateInvoiceField('representative', 'document', e.target.value)}
                  />
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
                  <input
                    className="input"
                    value={config.invoice.banking.bank}
                    onChange={(e) => updateInvoiceField('banking', 'bank', e.target.value)}
                  />
                </div>
                <div>
                  <p className="small mb-1">Tipo de cuenta</p>
                  <select
                    className="select"
                    value={config.invoice.banking.accountType}
                    onChange={(e) => updateInvoiceField('banking', 'accountType', e.target.value)}
                  >
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                  </select>
                </div>
                <div>
                  <p className="small mb-1">Número de cuenta</p>
                  <input
                    className="input"
                    value={config.invoice.banking.accountNumber}
                    onChange={(e) => updateInvoiceField('banking', 'accountNumber', e.target.value)}
                  />
                </div>
                <div>
                  <p className="small mb-1">Titular de la cuenta</p>
                  <input
                    className="input"
                    value={config.invoice.banking.accountHolder}
                    onChange={(e) => updateInvoiceField('banking', 'accountHolder', e.target.value)}
                  />
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
                  type="number"
                  value={config.invoice.document.consecutiveNumber}
                  onChange={(e) => updateInvoiceField('document', 'consecutiveNumber', parseInt(e.target.value) || 1)}
                />
                <p className="small mt-1" style={{ color: '#999' }}>Se incrementa automáticamente con cada cuenta de cobro</p>
              </div>
              <div>
                <p className="small mb-1">Términos y condiciones</p>
                <textarea
                  className="input"
                  rows={3}
                  value={config.invoice.document.terms}
                  onChange={(e) => updateInvoiceField('document', 'terms', e.target.value)}
                />
              </div>
              <div>
                <p className="small mb-1">Nota al pie (opcional)</p>
                <input
                  className="input"
                  value={config.invoice.document.footerNote}
                  onChange={(e) => updateInvoiceField('document', 'footerNote', e.target.value)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Estimación Tab */}
      {activeTab === 'estimacion' && (
        <div className="card mt-2">
          <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>🏗️ Precios de Estimación</h3>
          <p className="small mb-2" style={{ color: '#999', marginBottom: 24 }}>
            Estos valores se usan para calcular el costo aproximado de construcción según el tipo de acabado.
          </p>

          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ padding: 20, background: '#0a0a0a', borderRadius: 16, border: '1px solid var(--color-line)' }}>
              <div className="flex-between mb-2">
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Obra Negra</h4>
                  <p className="small">Estructura, muros sin acabados, instalaciones básicas</p>
                </div>
                <span style={{ fontSize: 28 }}>🧱</span>
              </div>
              <p className="small mb-1">Precio por m²</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#b69462', fontSize: 14, fontWeight: 600 }}>$</span>
                <input
                  className="input"
                  type="number"
                  value={config.estimation.obraNegraPrice}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    updateConfig({ estimation: { ...config.estimation, obraNegraPrice: val } });
                  }}
                />
              </div>
            </div>

            <div style={{ padding: 20, background: '#0a0a0a', borderRadius: 16, border: '1px solid var(--color-line)' }}>
              <div className="flex-between mb-2">
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Obra Gris</h4>
                  <p className="small">Estructura + acabados en estuco, instalaciones, sin pintura ni pisos finales</p>
                </div>
                <span style={{ fontSize: 28 }}>🏠</span>
              </div>
              <p className="small mb-1">Precio por m²</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#b69462', fontSize: 14, fontWeight: 600 }}>$</span>
                <input
                  className="input"
                  type="number"
                  value={config.estimation.obraGrisPrice}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    updateConfig({ estimation: { ...config.estimation, obraGrisPrice: val } });
                  }}
                />
              </div>
            </div>

            <div style={{ padding: 20, background: '#0a0a0a', borderRadius: 16, border: '1px solid var(--color-line)' }}>
              <div className="flex-between mb-2">
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Acabados</h4>
                  <p className="small">Obra terminada: pintura, pisos finales, baños completos, cocina, carpintería</p>
                </div>
                <span style={{ fontSize: 28 }}>✨</span>
              </div>
              <p className="small mb-1">Precio por m²</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#b69462', fontSize: 14, fontWeight: 600 }}>$</span>
                <input
                  className="input"
                  type="number"
                  value={config.estimation.acabadosPrice}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    updateConfig({ estimation: { ...config.estimation, acabadosPrice: val } });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Edit Modal */}
      {editingService && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingService(null); }}
        >
          <div className="modal">
            <h3 style={{ marginBottom: 8 }}>Editar Precio</h3>
            <p className="small mb-2" style={{ color: '#b69462', fontWeight: 600 }}>{editingService.name}</p>
            <p className="small mb-2">Unidad: {editingService.unit}</p>

            <div style={{ marginBottom: 24 }}>
              <p className="small mb-1">Nuevo precio</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#b69462', fontSize: 14, fontWeight: 600 }}>$</span>
                <input
                  className="input"
                  type="number"
                  autoFocus
                  value={editPriceValue}
                  onChange={(e) => setEditPriceValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt(editPriceValue);
                      if (!isNaN(val) && val >= 0) {
                        saveService(editingService.id, { ...editingService, price: val });
                        showNotification('Precio actualizado', 'success');
                        setEditingService(null);
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid-2">
              <button className="btn btn-secondary" onClick={() => setEditingService(null)}>
                Cancelar
              </button>
              <button
                className="btn"
                onClick={() => {
                  const val = parseInt(editPriceValue);
                  if (!isNaN(val) && val >= 0) {
                    saveService(editingService.id, { ...editingService, price: val });
                    showNotification('Precio actualizado', 'success');
                    setEditingService(null);
                  } else {
                    showNotification('Ingresa un valor válido', 'error');
                  }
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear History */}
      <div className="card mt-2" style={{ border: '2px solid #ff3b30' }}>
        <h3 style={{ color: '#ff3b30', marginBottom: 8 }}>🗑️ Limpiar Historial</h3>
        <p className="small mb-2">Eliminar todas las cotizaciones guardadas ({quotes.length})</p>
        <button
          className="btn btn-danger"
          onClick={() => setShowClearConfirm(true)}
          disabled={quotes.length === 0}
          style={{ opacity: quotes.length === 0 ? 0.5 : 1 }}
        >
          Limpiar Todo el Historial
        </button>
      </div>

      {/* Clear Confirmation */}
      {showClearConfirm && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowClearConfirm(false); }}
        >
          <div className="modal">
            <h3 style={{ marginBottom: 12 }}>Confirmar eliminación</h3>
            <p className="small mb-2">
              Estás a punto de eliminar TODAS las cotizaciones guardadas ({quotes.length} en total). Esta acción no se puede deshacer.
            </p>
            <div className="grid-2">
              <button className="btn btn-secondary" onClick={() => setShowClearConfirm(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleClearHistory}>
                Eliminar Todo
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
