import { useStore } from '../../shared/services/store';
import { calculateArea } from '../../shared/services/calculator';

export function QuoteStep2() {
  const { formData, setFormData } = useStore();
  const area = calculateArea(formData);

  const updateSide = (side: 'frontal' | 'posterior' | 'latIzq' | 'latDer', value: string) => {
    setFormData({ [side]: value });
  };

  return (
    <>
      <div className="card mt-2">
        <p className="small mb-2">¿Cómo quieres ingresar el área?</p>
        <div className="grid-2">
          <div
            className={`toggle-option ${formData.areaMode === 'dimensions' ? 'active' : ''}`}
            onClick={() => setFormData({ areaMode: 'dimensions' })}
          >
            Dimensiones
          </div>
          <div
            className={`toggle-option ${formData.areaMode === 'direct' ? 'active' : ''}`}
            onClick={() => setFormData({ areaMode: 'direct' })}
          >
            Área Directa
          </div>
        </div>
      </div>

      {formData.areaMode === 'dimensions' && (
        <div className="card">
          <p className="small mb-2">Forma del lote</p>
          <div className="grid-2">
            <div
              className={`toggle-option ${formData.lotShape === 'rectangular' ? 'active' : ''}`}
              onClick={() => setFormData({ lotShape: 'rectangular' })}
            >
              Rectangular
            </div>
            <div
              className={`toggle-option ${formData.lotShape === 'irregular' ? 'active' : ''}`}
              onClick={() => setFormData({ lotShape: 'irregular' })}
            >
              Irregular
            </div>
          </div>
        </div>
      )}

      {formData.areaMode === 'direct' && (
        <div className="card">
          <p className="small mb-1">Área del lote (m²)</p>
          <input
            className="input"
            type="number"
            value={formData.directArea}
            step="0.1"
            onChange={(e) => setFormData({ directArea: e.target.value })}
          />
          <p className="small mt-1" style={{ color: '#999' }}>
            El área del primer piso se calculará automáticamente según el índice de ocupación.
          </p>
        </div>
      )}

      {/* DIAGRAMA DEL TERRENO */}
      <div className="card lot-card">
        {formData.areaMode === 'direct' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p className="small mb-2" style={{ color: '#b69462', fontSize: 14, fontWeight: 600 }}>
              📏 Modo Área Directa
            </p>
            <p className="small" style={{ color: '#999' }}>
              Las dimensiones del terreno se calculan automáticamente desde el área ingresada.
            </p>
          </div>
        ) : (
          <>
            <p className="small mb-4" style={{ color: '#b69462', fontSize: 14, fontWeight: 600 }}>
              📐 Ingresa las dimensiones del terreno:
            </p>

            {/* TOP: POSTERIOR */}
            <div className="lot-dim lot-dim-top">
              {formData.lotShape === 'irregular' ? (
                <>
                  <label className="lot-label">Posterior</label>
                  <div style={{ position: 'relative', width: 120 }}>
                    <input
                      type="number"
                      className="input"
                      value={formData.posterior}
                      step="0.1"
                      onChange={(e) => updateSide('posterior', e.target.value)}
                      style={{
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: 18,
                        color: '#b69462',
                        borderColor: '#b69462',
                        padding: '12px 8px',
                      }}
                    />
                    <span className="lot-unit">m</span>
                  </div>
                </>
              ) : (
                <div className="lot-readonly">
                  <label className="lot-label ro">Posterior</label>
                  <div className="lot-ro-value">= {formData.frontal}m</div>
                  <p className="lot-ro-hint">Igual a Frontal</p>
                </div>
              )}
            </div>

            {/* MIDDLE: SIDES + LOT DIAGRAM */}
            <div className="lot-middle">
              {/* LEFT: LAT IZQ */}
              <div className="lot-side">
                <label className="lot-label">Lat Izq</label>
                <div style={{ position: 'relative', width: 100 }}>
                  <input
                    type="number"
                    className="input"
                    value={formData.latIzq}
                    step="0.1"
                    onChange={(e) => updateSide('latIzq', e.target.value)}
                    style={{
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: 18,
                      color: '#b69462',
                      borderColor: '#b69462',
                      padding: '12px 8px',
                    }}
                  />
                  <span className="lot-unit">m</span>
                </div>
              </div>

              {/* CENTER: LOT DIAGRAM */}
              <div className="lot-box">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: '#999', marginBottom: 4 }}>Lote</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#b69462' }}>
                    {area.lot.toFixed(1)}m²
                  </div>
                </div>

                {/* Corner decorations */}
                <div style={{ position: 'absolute', top: -2, left: -2, width: 16, height: 16, borderTop: '3px solid #b69462', borderLeft: '3px solid #b69462' }} />
                <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderTop: '3px solid #b69462', borderRight: '3px solid #b69462' }} />
                <div style={{ position: 'absolute', bottom: -2, left: -2, width: 16, height: 16, borderBottom: '3px solid #b69462', borderLeft: '3px solid #b69462' }} />
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderBottom: '3px solid #b69462', borderRight: '3px solid #b69462' }} />
              </div>

              {/* RIGHT: LAT DER */}
              <div className="lot-side">
                {formData.lotShape === 'irregular' ? (
                  <>
                    <label className="lot-label">Lat Der</label>
                    <div style={{ position: 'relative', width: 100 }}>
                      <input
                        type="number"
                        className="input"
                        value={formData.latDer}
                        step="0.1"
                        onChange={(e) => updateSide('latDer', e.target.value)}
                        style={{
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: 18,
                          color: '#b69462',
                          borderColor: '#b69462',
                          padding: '12px 8px',
                        }}
                      />
                      <span className="lot-unit">m</span>
                    </div>
                  </>
                ) : (
                  <div className="lot-readonly">
                    <label className="lot-label ro">Lat Der</label>
                    <div className="lot-ro-value">= {formData.latIzq}m</div>
                    <p className="lot-ro-hint">Igual a Lat Izq</p>
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM: FRONTAL */}
            <div className="lot-dim lot-dim-bottom">
              <label className="lot-label">Frontal</label>
              <div style={{ position: 'relative', width: 120 }}>
                <input
                  type="number"
                  className="input"
                  value={formData.frontal}
                  step="0.1"
                  onChange={(e) => updateSide('frontal', e.target.value)}
                  style={{
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: 18,
                    color: '#b69462',
                    borderColor: '#b69462',
                    padding: '12px 8px',
                  }}
                />
                <span className="lot-unit">m</span>
              </div>
            </div>

            {/* Connector lines visualization */}
            <div className="lot-connector">
              <div className="lot-connector-inner">
                <div>
                  <div className="lot-conn-label">Frontal</div>
                  <div className="lot-conn-value">{formData.frontal}m</div>
                </div>
                <div className="lot-conn-line" />
                <div>
                  <div className="lot-conn-label">Lateral Izq</div>
                  <div className="lot-conn-value">{formData.latIzq}m</div>
                </div>
                <div className="lot-conn-line" />
                <div>
                  <div className="lot-conn-label">
                    {formData.lotShape === 'rectangular' ? 'Posterior (=Frontal)' : 'Posterior'}
                  </div>
                  <div className="lot-conn-value">
                    {formData.lotShape === 'rectangular' ? formData.frontal : formData.posterior}m
                  </div>
                </div>
                <div className="lot-conn-line" />
                <div>
                  <div className="lot-conn-label">
                    {formData.lotShape === 'rectangular' ? 'Lat Der (=Lat Izq)' : 'Lat Der'}
                  </div>
                  <div className="lot-conn-value">
                    {formData.lotShape === 'rectangular' ? formData.latIzq : formData.latDer}m
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <style>{`
          .lot-card { padding: 40px 32px; }
          .lot-dim { display: flex; flex-direction: column; align-items: center; margin-bottom: 24px; }
          .lot-label { font-size: 13px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
          .lot-unit { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #b69462; font-size: 14px; }
          .lot-readonly { text-align: center; padding: 16px 24px; background: rgba(255,255,255,0.03); border-radius: 12; border: 1px dashed rgba(255,255,255,0.1); }
          .lot-label.ro { font-size: 12px; color: #666; }
          .lot-ro-value { font-size: 20px; font-weight: 700; color: #666; margin-top: 8px; }
          .lot-ro-hint { font-size: 11px; color: #555; margin-top: 4px; }
          .lot-middle { display: flex; align-items: center; justify-content: center; gap: 40px; margin-bottom: 24px; }
          .lot-side { display: flex; flex-direction: column; align-items: center; min-width: 100px; }
          .lot-box { width: 220px; height: 220px; min-width: 220px; min-height: 220px; border: 3px solid #b69462; border-radius: 8px; background: rgba(182, 148, 98, 0.08); display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 0 30px rgba(182, 148, 98, 0.1), inset 0 0 30px rgba(182, 148, 98, 0.05); }
          .lot-connector { margin-top: 32px; padding: 20px; background: rgba(182, 148, 98, 0.05); border-radius: 16px; border: 1px solid rgba(182, 148, 98, 0.15); }
          .lot-connector-inner { display: flex; justify-content: space-around; text-align: center; }
          .lot-conn-label { font-size: 12px; color: #999; margin-bottom: 4px; }
          .lot-conn-value { font-size: 18px; font-weight: 700; color: #fff; }
          .lot-conn-line { width: 1px; background: rgba(255,255,255,0.1); }

          @media (max-width: 640px) {
            .lot-card { padding: 24px 12px !important; }
            .lot-middle {
              display: grid !important;
              grid-template-columns: 1fr auto 1fr !important;
              gap: 8px !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .lot-side { min-width: auto !important; width: 100%; }
            .lot-box { width: 120px !important; height: 120px !important; min-width: 120px !important; min-height: 120px !important; }
            .lot-dim { margin-bottom: 12px; }
            .lot-connector-inner { flex-direction: column !important; gap: 12px !important; }
            .lot-conn-line { width: 100% !important; height: 1px !important; }
          }
        `}</style>
      </div>

      <div className="card">
        <div>
          <p className="small mb-1">
            Índice de ocupación: <span style={{ color: '#b69462', fontWeight: 700 }}>{formData.occ}%</span>
          </p>
          <input
            type="range"
            min={50}
            max={100}
            value={formData.occ}
            onChange={(e) => setFormData({ occ: parseInt(e.target.value) })}
          />
        </div>

        <div className="card mt-2" style={{ textAlign: 'center', background: '#0a0a0a' }}>
          <p className="small">Área del lote</p>
          <h1 style={{ fontSize: 32, fontWeight: 700 }}>{area.lot.toFixed(2)} m²</h1>
          <p className="small mt-2">Área primer piso</p>
          <h3 style={{ color: '#b69462', fontSize: 18, fontWeight: 600 }}>{area.first.toFixed(2)} m²</h3>
        </div>
      </div>
    </>
  );
}
