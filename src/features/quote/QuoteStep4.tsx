import { useStore } from '../../shared/services/store';
import { calculateArea, calculatePrice } from '../../shared/services/calculator';

export function QuoteStep4() {
  const { formData, config, setFormData } = useStore();
  const area = calculateArea(formData);
  const price = calculatePrice(formData, config);

  const toggleService = (id: string) => {
    const index = formData.selectedServices.indexOf(id);
    if (index > -1) {
      setFormData({ selectedServices: formData.selectedServices.filter((s) => s !== id) });
    } else {
      setFormData({ selectedServices: [...formData.selectedServices, id] });
    }
  };

  const toggleSubPackage = (id: string) => {
    const index = formData.selectedSubPackages.indexOf(id);
    if (index > -1) {
      setFormData({ selectedSubPackages: formData.selectedSubPackages.filter((s) => s !== id) });
    } else {
      setFormData({
        selectedSubPackages: [...formData.selectedSubPackages, id],
        selectedServices: formData.selectedServices.filter((s) => s !== 'elec' && s !== 'hydro'),
      });
    }
  };

  const toggleCompletePackage = () => {
    setFormData({
      hasCompletePackage: !formData.hasCompletePackage,
      selectedServices: formData.hasCompletePackage ? [] : [],
      selectedSubPackages: formData.hasCompletePackage ? [] : [],
    });
  };

  return (
    <>
      <div className="card mt-2">
        <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Paquete Completo</h3>
        <div
          className={`service-item ${formData.hasCompletePackage ? 'selected' : ''}`}
          onClick={toggleCompletePackage}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{config.completePackage.name}</div>
            <div className="small">
              ${config.completePackage.price.toLocaleString('es-CO')}
              {config.completePackage.unit}
            </div>
          </div>
        </div>
      </div>

      {!formData.hasCompletePackage && (
        <>
          {Object.keys(config.subPackages).length > 0 && (
            <div className="card">
              <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Sub-Paquetes</h3>
              {Object.keys(config.subPackages).map((id) => (
                <div
                  key={id}
                  className={`service-item ${formData.selectedSubPackages.includes(id) ? 'selected' : ''}`}
                  onClick={() => toggleSubPackage(id)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{config.subPackages[id].name}</div>
                    <div className="small">
                      ${config.subPackages[id].price.toLocaleString('es-CO')}
                      {config.subPackages[id].unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Servicios Individuales</h3>
            {Object.keys(config.services).map((id) => {
              if (formData.selectedSubPackages.includes('installations') && (id === 'elec' || id === 'hydro')) {
                return null;
              }
              return (
                <div
                  key={id}
                  className={`service-item ${formData.selectedServices.includes(id) ? 'selected' : ''}`}
                  onClick={() => toggleService(id)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{config.services[id].name}</div>
                    <div className="small">
                      ${config.services[id].price.toLocaleString('es-CO')}
                      {config.services[id].unit}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="card">
        <div className="flex-between mb-1">
          <span className="small">Área total</span>
          <span className="small">{area.total.toFixed(2)} m²</span>
        </div>
        <div className="flex-between mt-2" style={{ paddingTop: 12, borderTop: '1px solid var(--color-line)' }}>
          <span style={{ fontWeight: 600 }}>Valor Total</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#b69462' }}>
            ${price.toLocaleString('es-CO')}
          </span>
        </div>
      </div>
    </>
  );
}
