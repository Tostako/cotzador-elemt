import { useStore } from '../../shared/services/store';
import { calculateArea } from '../../shared/services/calculator';
import { Ruler, PencilRuler } from 'lucide-react';

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
          <p className="small mb-1">Área primer piso (m²)</p>
          <input
            className="input"
            type="number"
            value={formData.directArea}
            step="0.1"
            onChange={(e) => setFormData({ directArea: e.target.value })}
          />
        </div>
      )}

<<<<<<< Updated upstream
      {/* DIAGRAMA DEL TERRENO - NUEVO DISEÑO ESPACIOSO */}
      <div className="card" style={{ padding: '40px 32px' }}>
        <p className="small mb-4" style={{ color: '#b69462', fontSize: 14, fontWeight: 600 }}>
          📐 Ingresa las dimensiones del terreno:
        </p>

        {/* TOP: FRONTAL */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          marginBottom: 24,
        }}>
          <label style={{ 
            fontSize: 13, 
            color: '#999', 
            textTransform: 'uppercase', 
            letterSpacing: '1px',
            marginBottom: 8,
            fontWeight: 600,
          }}>
            Frontal
          </label>
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
            <span style={{ 
              position: 'absolute', 
              right: 12, 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#b69462',
              fontSize: 14,
            }}>m</span>
          </div>
        </div>
=======
      {/* DIAGRAMA DEL TERRENO */}
      <div className="card lot-card">
        {formData.areaMode === 'direct' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p className="small mb-2" style={{ color: '#b69462', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Ruler size={15} /> Modo Área Directa
            </p>
            <p className="small" style={{ color: '#999' }}>
              Las dimensiones del terreno se calculan automáticamente desde el área ingresada.
            </p>
          </div>
        ) : (
          <>
            <p className="small mb-4" style={{ color: '#b69462', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PencilRuler size={15} /> Ingresa las dimensiones del terreno:
            </p>
>>>>>>> Stashed changes

        {/* MIDDLE: SIDES + LOT DIAGRAM */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 40,
          marginBottom: 24,
        }}>
          {/* LEFT: LAT IZQ */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            minWidth: 100,
          }}>
            <label style={{ 
              fontSize: 13, 
              color: '#999', 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              marginBottom: 8,
              fontWeight: 600,
            }}>
              Lat Izq
            </label>
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
              <span style={{ 
                position: 'absolute', 
                right: 12, 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#b69462',
                fontSize: 14,
              }}>m</span>
            </div>
          </div>

          {/* CENTER: LOT DIAGRAM */}
          <div style={{ 
            width: 220, 
            height: 220, 
            minWidth: 220,
            minHeight: 220,
            border: '3px solid #b69462',
            borderRadius: 8,
            background: 'rgba(182, 148, 98, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 0 30px rgba(182, 148, 98, 0.1), inset 0 0 30px rgba(182, 148, 98, 0.05)',
          }}>
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
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            minWidth: 100,
          }}>
            {formData.lotShape === 'irregular' ? (
              <>
                <label style={{ 
                  fontSize: 13, 
                  color: '#999', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  marginBottom: 8,
                  fontWeight: 600,
                }}>
                  Lat Der
                </label>
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
                  <span style={{ 
                    position: 'absolute', 
                    right: 12, 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: '#b69462',
                    fontSize: 14,
                  }}>m</span>
                </div>
              </>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px 12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 12,
                border: '1px dashed rgba(255,255,255,0.1)',
              }}>
                <label style={{ 
                  fontSize: 12, 
                  color: '#666', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  fontWeight: 600,
                }}>
                  Lat Der
                </label>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#666', marginTop: 8 }}>
                  = {formData.latIzq}m
                </div>
                <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Igual a Lat Izq</p>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM: POSTERIOR */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
        }}>
          {formData.lotShape === 'irregular' ? (
            <>
              <label style={{ 
                fontSize: 13, 
                color: '#999', 
                textTransform: 'uppercase', 
                letterSpacing: '1px',
                marginBottom: 8,
                fontWeight: 600,
              }}>
                Posterior
              </label>
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
                <span style={{ 
                  position: 'absolute', 
                  right: 12, 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#b69462',
                  fontSize: 14,
                }}>m</span>
              </div>
            </>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '16px 24px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              border: '1px dashed rgba(255,255,255,0.1)',
            }}>
              <label style={{ 
                fontSize: 12, 
                color: '#666', 
                textTransform: 'uppercase', 
                letterSpacing: '1px',
                fontWeight: 600,
              }}>
                Posterior
              </label>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#666', marginTop: 8 }}>
                = {formData.frontal}m
              </div>
              <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Igual a Frontal</p>
            </div>
          )}
        </div>

        {/* Connector lines visualization */}
        <div style={{ 
          marginTop: 32, 
          padding: 20, 
          background: 'rgba(182, 148, 98, 0.05)', 
          borderRadius: 16,
          border: '1px solid rgba(182, 148, 98, 0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Frontal</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{formData.frontal}m</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Lateral Izq</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{formData.latIzq}m</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                {formData.lotShape === 'rectangular' ? 'Posterior (=Frontal)' : 'Posterior'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {formData.lotShape === 'rectangular' ? formData.frontal : formData.posterior}m
              </div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                {formData.lotShape === 'rectangular' ? 'Lat Der (=Lat Izq)' : 'Lat Der'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {formData.lotShape === 'rectangular' ? formData.latIzq : formData.latDer}m
              </div>
            </div>
          </div>
        </div>
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
