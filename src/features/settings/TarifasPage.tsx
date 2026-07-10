import { useState } from 'react';
import { useStore } from '../../shared/services/store';
import { showNotification } from '../../shared/hooks/useNotifications';
import { useEscapeKey } from '../../shared/hooks/useEscapeKey';
import { TourBanner } from '../../shared/components/TourBanner';
import { isTourActiveForRoute } from '../../shared/utils/tour';
import { BackButton } from '../../shared/components/BackButton';
import { Wallet, Pencil, Trash2 } from 'lucide-react';

export function TarifasPage() {
  const { config, saveService, deleteService } = useStore();
  const showTour = isTourActiveForRoute('/tarifas');

  const [editingService, setEditingService] = useState<{ id: string; name: string; price: number; unit: string } | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', unit: '/m²' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  useEscapeKey(() => setEditingService(null), editingService !== null);
  useEscapeKey(() => setDeleteConfirm(null), deleteConfirm !== null);

  const handleSaveService = () => {
    if (!newService.name.trim() || !newService.price) {
      showNotification('Error', 'error', 'Completa todos los campos.');
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
    showNotification('Correcto', 'success', 'Servicio agregado correctamente.');
  };

  const handleDeleteService = (id: string) => {
    setDeleteConfirm({ id, name: config.services[id].name });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteService(deleteConfirm.id);
      showNotification('Correcto', 'success', 'Servicio eliminado correctamente.');
      setDeleteConfirm(null);
    }
  };

  return (
    <main>
      <BackButton />
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}><Wallet size={28} color="#b69462" /> Tarifas</h1>
      <p className="small">Configurar precios de servicios</p>

      <button type="button" className="btn mt-2 mb-2" onClick={() => setShowServiceForm(!showServiceForm)}>
        {showServiceForm ? '× Cancelar' : '+ Nuevo Servicio'}
      </button>

      {showServiceForm && (
        <div className="inline-form">
          <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600 }}>Nuevo Servicio</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="small mb-1" htmlFor="tarifa-nombre">Nombre del servicio</label>
              <input
                id="tarifa-nombre"
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
              <label className="small mb-1" htmlFor="tarifa-valor">Valor</label>
              <input
                id="tarifa-valor"
                className="input"
                type="number"
                placeholder="Ej: 8500000"
                value={newService.price}
                onChange={(e) => setNewService({ ...newService, price: e.target.value })}
              />
            </div>
            <div className="grid-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowServiceForm(false)}>Cancelar</button>
              <button type="button" className="btn" onClick={handleSaveService}>Guardar</button>
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
                <button type="button"
                  className="btn-small btn-secondary"
                  onClick={() => {
                    setEditingService({ id, ...config.services[id] });
                    setEditPriceValue(config.services[id].price.toString());
                  }}
                  style={{ padding: '6px 12px', gap: 6 }}
                >
                  <Pencil size={14} /> Editar
                </button>
                <button type="button" className="btn-small btn-danger" onClick={() => handleDeleteService(id)}>
                  <Trash2 size={15} />
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
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ marginBottom: 8 }}>Editar Precio</h3>
            <p className="small mb-2" style={{ color: '#b69462', fontWeight: 600 }}>{editingService.name}</p>
            <p className="small mb-2">Unidad: {editingService.unit}</p>
            <div style={{ marginBottom: 24 }}>
              <label className="small mb-1" htmlFor="tarifa-nuevo-precio">Nuevo precio</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#b69462', fontSize: 14, fontWeight: 600 }}>$</span>
                <input
                  id="tarifa-nuevo-precio"
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
                        showNotification('Actualización correcta', 'success', 'Precio actualizado correctamente.');
                        setEditingService(null);
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div className="grid-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingService(null)}>Cancelar</button>
              <button type="button"
                className="btn"
                onClick={() => {
                  const val = parseInt(editPriceValue);
                  if (!isNaN(val) && val >= 0) {
                    saveService(editingService.id, { ...editingService, price: val });
                    showNotification('Actualización correcta', 'success', 'Precio actualizado correctamente.');
                    setEditingService(null);
                  } else {
                    showNotification('Error', 'error', 'Ingresa un valor válido.');
                  }
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <h3 style={{ marginBottom: 8 }}>¿Eliminar servicio?</h3>
            <p className="small mb-2" style={{ color: '#999' }}>
              Vas a eliminar <strong style={{ color: '#fff' }}>{deleteConfirm.name}</strong>.
            </p>
            <p className="small mb-2" style={{ color: '#ff3b30' }}>
              Esta acción no se puede deshacer.
            </p>
            <div className="grid-2" style={{ marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} style={{ gap: 6 }}>
                <Trash2 size={16} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showTour && <TourBanner />}
    </main>
  );
}
