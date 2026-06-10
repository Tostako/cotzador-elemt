import { useState } from 'react';
import { useStore } from '../../shared/services/store';
import { useAppStore } from '../../shared/hooks/useNotifications';
import { TourBanner } from '../../shared/components/TourBanner';
import { isTourActiveForRoute } from '../../shared/utils/tour';

export function TarifasPage() {
  const showNotification = useAppStore((s) => s.showNotification);
  const { config, saveService, deleteService } = useStore();
  const showTour = isTourActiveForRoute('/tarifas');

  const [editingService, setEditingService] = useState<{ id: string; name: string; price: number; unit: string } | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', unit: '/m²' });

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

  return (
    <main>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>💰 Tarifas</h1>
      <p className="small">Configurar precios de servicios</p>

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
                <button className="btn-small btn-danger" onClick={() => handleDeleteService(id)}>
                  🗑️
                </button>
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
              <button className="btn btn-secondary" onClick={() => setEditingService(null)}>Cancelar</button>
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

      {showTour && <TourBanner />}
    </main>
  );
}
