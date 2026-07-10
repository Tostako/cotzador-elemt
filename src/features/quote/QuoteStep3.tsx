import { useState } from 'react';
import { useStore } from '../../shared/services/store';
import { calculateArea } from '../../shared/services/calculator';

export function QuoteStep3() {
  const formData = useStore((s) => s.formData);
  const setFormData = useStore((s) => s.setFormData);
  const area = calculateArea(formData);
  const [rawOverhang, setRawOverhang] = useState(String(formData.overhangSize));

  const toggleFacade = (side: 'frontal' | 'posterior' | 'lateralLeft' | 'lateralRight') => {
    setFormData({
      facades: { ...formData.facades, [side]: !formData.facades[side] },
    });
  };

  return (
    <div className="card mt-2" style={{ display: 'grid', gap: 16 }}>
      <div>
        <p className="small mb-1">Número de pisos</p>
        <select
          className="select"
          value={formData.floors}
          onChange={(e) => setFormData({ floors: parseInt(e.target.value) })}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'piso' : 'pisos'}
            </option>
          ))}
        </select>
      </div>

      {formData.floors > 1 && (
        <>
          <div>
            <label className="small mb-1" htmlFor="quote-volado">Tamaño del volado (metros)</label>
            <input
              id="quote-volado"
              className="input"
              type="text"
              inputMode="decimal"
              value={rawOverhang}
              onChange={(e) => {
                const val = e.target.value;
                // Allow empty, digits, and one decimal point
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setRawOverhang(val);
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed)) {
                    setFormData({ overhangSize: parsed });
                  }
                }
              }}
              onBlur={() => {
                const parsed = parseFloat(rawOverhang);
                setRawOverhang(String(isNaN(parsed) ? 0 : parsed));
              }}
            />
          </div>

          <div>
            <p className="small mb-2">Selecciona las fachadas con volado</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { key: 'frontal' as const, label: 'Frontal', value: area.frontal },
                { key: 'posterior' as const, label: 'Posterior', value: area.posterior },
                { key: 'lateralLeft' as const, label: 'Lateral Izquierdo', value: area.latIzq },
                { key: 'lateralRight' as const, label: 'Lateral Derecho', value: area.latDer },
              ].map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={`checkbox ${formData.facades[item.key] ? 'checked' : ''}`}
                  onClick={() => toggleFacade(item.key)}
                  style={{ background: 'transparent', border: 'none', font: 'inherit', color: 'inherit', textAlign: 'left', width: '100%' }}
                >
                  <span>
                    {item.label} ({Number(item.value).toFixed(1)}m)
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', background: '#0a0a0a' }}>
            <p className="small">Área de volado por piso</p>
            <h3 style={{ color: '#b69462' }}>{area.overhangArea.toFixed(2)} m²</h3>
            <p className="small mt-2">Área total piso superior</p>
            <h3>{area.upperFloorArea.toFixed(2)} m²</h3>
          </div>
        </>
      )}

      <div className="card" style={{ textAlign: 'center', background: '#0a0a0a' }}>
        <p className="small">Área Total Estimada</p>
        <h1 style={{ color: '#b69462', fontSize: 32, fontWeight: 700 }}>{area.total.toFixed(2)} m²</h1>
      </div>
    </div>
  );
}
