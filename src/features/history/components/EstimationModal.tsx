import { useStore } from '../../../shared/services/store';
import type { Quote } from '../../../shared/types';
import { Calculator, Layers, House, Sparkles } from 'lucide-react';
import { useEscapeKey } from '../../../shared/hooks/useEscapeKey';

interface EstimationModalProps {
  quote: Quote;
  estimationType: string;
  onClose: () => void;
  onChangeType: (type: string) => void;
}

export function EstimationModal({ quote, estimationType, onClose, onChangeType }: EstimationModalProps) {
  useEscapeKey(onClose);
  const config = useStore((s) => s.config);

  const getPricePerM2 = () => {
    let price = 0;
    if (estimationType === 'obraNegra') price = config.estimation.obraNegraPrice;
    else if (estimationType === 'obraGris') price = config.estimation.obraGrisPrice;
    else if (estimationType === 'acabados') price = config.estimation.acabadosPrice;
    else {
      const custom = config.estimation.customEstimations?.find((e) => String(e.id) === estimationType);
      if (custom) price = custom.price;
    }
    return price;
  };

  const getTotalCost = () => {
    return quote.area * getPricePerM2();
  };

  const customList = config.estimation.customEstimations ?? [];

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 480 }}>
        <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={18} color="#b69462" /> Estimación de Obra
        </h3>
        <p className="small mb-2" style={{ color: '#b69462', fontWeight: 600 }}>
          {quote.client}
        </p>
        <p className="small mb-2">{quote.project}</p>

        <div className="card" style={{ textAlign: 'center', marginBottom: 20, background: '#0a0a0a' }}>
          <p className="small">Área total construida</p>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#b69462', lineHeight: 1 }}>
            {Number(quote.area).toFixed(0)}
          </div>
          <p className="small">m²</p>
        </div>

        <p className="small mb-1">Tipo de acabado</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <button
            type="button"
            className={`toggle-option ${estimationType === 'obraNegra' ? 'active' : ''}`}
            onClick={() => onChangeType('obraNegra')}
          >
            <Layers size={22} color="#b69462" />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Obra Negra</div>
            <div className="small">Sin acabados</div>
          </button>
          <button
            type="button"
            className={`toggle-option ${estimationType === 'obraGris' ? 'active' : ''}`}
            onClick={() => onChangeType('obraGris')}
          >
            <House size={22} color="#b69462" />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Obra Gris</div>
            <div className="small">Básicos</div>
          </button>
          <button
            type="button"
            className={`toggle-option ${estimationType === 'acabados' ? 'active' : ''}`}
            onClick={() => onChangeType('acabados')}
          >
            <Sparkles size={22} color="#b69462" />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Acabados</div>
            <div className="small">Terminada</div>
          </button>
        </div>

        {customList.length > 0 && (
          <>
            <p className="small mb-1" style={{ marginTop: 8 }}>Mis estimaciones</p>
            <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
              {customList.map((est) => (
                <button
                  type="button"
                  key={est.id}
                  className={`toggle-option ${estimationType === String(est.id) ? 'active' : ''}`}
                  onClick={() => onChangeType(String(est.id))}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{est.name}</div>
                  <div className="small" style={{ color: '#b69462' }}>${Number(est.price).toLocaleString('es-CO')}/m²</div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex-between mb-2" style={{ padding: '12px 0', borderBottom: '1px solid var(--color-line)' }}>
          <span className="small">Precio por m²</span>
          <span style={{ fontWeight: 600 }}>
            ${getPricePerM2().toLocaleString('es-CO')} COP
          </span>
        </div>

        <div className="flex-between" style={{ padding: '16px 0', marginBottom: 24 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Costo estimado total</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#b69462' }}>
            ${getTotalCost().toLocaleString('es-CO')} COP
          </span>
        </div>

        <button type="button" className="btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
