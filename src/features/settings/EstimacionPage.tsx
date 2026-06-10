import { useState } from 'react';
import { useStore } from '../../shared/services/store';
import { useAppStore } from '../../shared/hooks/useNotifications';
import { TourBanner } from '../../shared/components/TourBanner';
import { isTourActiveForRoute } from '../../shared/utils/tour';
import type { CustomEstimation } from '../../shared/types';

export function EstimacionPage() {
  const { config, updateConfig } = useStore();
  const showNotification = useAppStore((s) => s.showNotification);
  const showTour = isTourActiveForRoute('/estimacion');
  const [showForm, setShowForm] = useState(false);
  const [newEstimation, setNewEstimation] = useState({ name: '', price: '' });

  const customEstimations = config.estimation.customEstimations ?? [];

  const addCustomEstimation = () => {
    if (!newEstimation.name.trim() || !newEstimation.price) {
      showNotification('Ingresa nombre y precio por m²', 'warning');
      return;
    }
    const price = parseInt(newEstimation.price) || 0;
    if (price <= 0) {
      showNotification('El precio debe ser mayor a 0', 'warning');
      return;
    }
    const estimation: CustomEstimation = {
      id: Date.now(),
      name: newEstimation.name.trim(),
      price,
    };
    updateConfig({
      estimation: {
        ...config.estimation,
        customEstimations: [...customEstimations, estimation],
      },
    });
    setNewEstimation({ name: '', price: '' });
    setShowForm(false);
    showNotification('Estimación creada correctamente', 'success');
  };

  const deleteCustomEstimation = (id: number | string) => {
    updateConfig({
      estimation: {
        ...config.estimation,
        customEstimations: customEstimations.filter((e) => e.id !== id),
      },
    });
    showNotification('Estimación eliminada', 'success');
  };

  const updatePrice = (key: 'obraNegraPrice' | 'obraGrisPrice' | 'acabadosPrice', val: string) => {
    if (val === '') {
      updateConfig({ estimation: { ...config.estimation, [key]: 0 } });
    } else if (/^\d*$/.test(val)) {
      updateConfig({ estimation: { ...config.estimation, [key]: parseInt(val) || 0 } });
    }
  };

  return (
    <main>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>🏗️ Estimación de Obra</h1>
      <p className="small">Configurar precios de obra negra, obra gris, acabados y estimaciones personalizadas</p>

      {/* Fixed estimations */}
      <div className="card mt-2">
        <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>🏗️ Precios Estándar</h3>
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
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={config.estimation.obraNegraPrice === 0 ? '' : String(config.estimation.obraNegraPrice || '')}
                onChange={(e) => updatePrice('obraNegraPrice', e.target.value)}
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
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={config.estimation.obraGrisPrice === 0 ? '' : String(config.estimation.obraGrisPrice || '')}
                onChange={(e) => updatePrice('obraGrisPrice', e.target.value)}
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
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={config.estimation.acabadosPrice === 0 ? '' : String(config.estimation.acabadosPrice || '')}
                onChange={(e) => updatePrice('acabadosPrice', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Custom estimations */}
      <div className="card" style={{ marginBottom: 100 }}>
        <div className="flex-between mb-2">
          <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600 }}>📐 Mis Estimaciones Personalizadas</h3>
          <button className="btn btn-small" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancelar' : '➕ Crear Estimación'}
          </button>
        </div>
        <p className="small mb-2" style={{ color: '#999' }}>
          Crea estimaciones personalizadas con tu propio nombre y precio por m².
        </p>

        {showForm && (
          <div style={{ padding: 16, background: '#0a0a0a', borderRadius: 12, marginBottom: 16, border: '1px solid var(--color-line)' }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <p className="small mb-1">Nombre de la estimación</p>
                <input
                  className="input"
                  placeholder="Ej: Primer piso, Sótano, Remodelación..."
                  value={newEstimation.name}
                  onChange={(e) => setNewEstimation({ ...newEstimation, name: e.target.value })}
                />
              </div>
              <div>
                <p className="small mb-1">Precio por m²</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#b69462', fontSize: 14, fontWeight: 600 }}>$</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={newEstimation.price}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) {
                        setNewEstimation({ ...newEstimation, price: val });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="grid-2">
                <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button className="btn" onClick={addCustomEstimation}>
                  Guardar Estimación
                </button>
              </div>
            </div>
          </div>
        )}

        {customEstimations.length === 0 ? (
          <p className="small" style={{ color: '#666', textAlign: 'center', padding: 24 }}>
            No has creado estimaciones personalizadas aún.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {customEstimations.map((est) => (
              <div
                key={est.id}
                className="flex-between"
                style={{
                  padding: 14,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{est.name}</div>
                  <div className="small" style={{ color: '#b69462' }}>
                    ${est.price.toLocaleString('es-CO')} / m²
                  </div>
                </div>
                <button
                  className="btn-small btn-danger"
                  onClick={() => deleteCustomEstimation(est.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTour && <TourBanner />}
    </main>
  );
}
