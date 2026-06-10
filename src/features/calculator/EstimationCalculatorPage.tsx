import { useState } from 'react';
import { useStore } from '../../shared/services/store';
import { useAppStore } from '../../shared/hooks/useNotifications';
import { calculateArea } from '../../shared/services/calculator';
import type { Quote, QuoteFormData } from '../../shared/types';

export function EstimationCalculatorPage() {
  const showNotification = useAppStore((s) => s.showNotification);
  const { config, quotes, user } = useStore();

  const [areaMode, setAreaMode] = useState<'dimensions' | 'direct'>('dimensions');
  const [lotShape, setLotShape] = useState<'rectangular' | 'irregular'>('rectangular');
  const [frontal, setFrontal] = useState('10');
  const [posterior, setPosterior] = useState('10');
  const [latIzq, setLatIzq] = useState('10');
  const [latDer, setLatDer] = useState('10');
  const [directArea, setDirectArea] = useState('100');
  const [occ, setOcc] = useState(80);
  const [floors, setFloors] = useState(1);
  const [overhangSize, setOverhangSize] = useState(1.0);
  const [facades, setFacades] = useState({ frontal: false, posterior: false, lateralLeft: false, lateralRight: false });
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [lockedFromQuote, setLockedFromQuote] = useState(false);
  const [selectedQuoteName, setSelectedQuoteName] = useState('');

  const formData: QuoteFormData = {
    client: '',
    project: '',
    areaMode,
    lotShape,
    frontal,
    posterior,
    latIzq,
    latDer,
    directArea,
    occ,
    floors,
    overhangSize,
    facades,
    selectedServices: [],
    selectedSubPackages: [],
    hasCompletePackage: false,
    discount: 0,
    additionalServices: [],
  };

  const area = calculateArea(formData);

  const { obraNegraPrice, obraGrisPrice, acabadosPrice, customEstimations } = config.estimation;

  const totalArea = area.total;
  const obraNegraCost = totalArea * obraNegraPrice;
  const obraGrisCost = totalArea * obraGrisPrice;
  const acabadosCost = totalArea * acabadosPrice;

  const handleSelectQuote = (quote: Quote) => {
    try {
      const data = typeof quote.data === 'string' ? JSON.parse(quote.data) : quote.data;
      if (data) {
        setAreaMode(data.areaMode || 'dimensions');
        setLotShape(data.lotShape || 'rectangular');
        setFrontal(String(data.frontal || '10'));
        setPosterior(String(data.posterior || '10'));
        setLatIzq(String(data.latIzq || '10'));
        setLatDer(String(data.latDer || '10'));
        setDirectArea(String(data.directArea || '100'));
        setOcc(data.occ || 80);
        setFloors(data.floors || 1);
        setOverhangSize(data.overhangSize ?? 1.0);
        setFacades(data.facades || { frontal: false, posterior: false, lateralLeft: false, lateralRight: false });
        setLockedFromQuote(true);
        setSelectedQuoteName(`${quote.client} — ${quote.project}`);
        showNotification(`Medidas cargadas desde: ${quote.client} — ${quote.project}`, 'success');
      }
    } catch {
      showNotification('Error al leer las medidas de la cotización', 'error');
    }
    setShowQuoteModal(false);
  };

  const handleUnlock = () => {
    setLockedFromQuote(false);
    setSelectedQuoteName('');
    showNotification('Medidas liberadas. Ahora puedes editar manualmente.', 'success');
  };

  // Filter: only user's quotes, and only parent quotes (no versions/children)
  const myQuotes = quotes.filter((q) => {
    const data = typeof q.data === 'string' ? (() => { try { return JSON.parse(q.data); } catch { return null; } })() : q.data;
    const isChild = data?.parentQuoteId != null;
    if (isChild) return false;
    if (q.customerId && user?.id) {
      return q.customerId === user.id;
    }
    // Fallback if backend doesn't send customerId: show all parent quotes
    return true;
  });

  const isDisabled = lockedFromQuote;

  return (
    <main>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>📐 Calculadora de Estimaciones</h1>
      <p className="small">Calcula el costo aproximado de construcción según las dimensiones del terreno</p>

      {/* Coger cotización */}
      <button className="btn btn-secondary mt-2 mb-2" onClick={() => setShowQuoteModal(true)}>
        📋 Coger Cotización
      </button>

      {/* Locked banner */}
      {lockedFromQuote && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(182,148,98,0.12)',
            border: '1px solid rgba(182,148,98,0.3)',
            borderRadius: 12,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <span style={{ fontWeight: 600, color: '#b69462' }}>🔒 Medidas bloqueadas</span>
            <p className="small" style={{ color: '#999', marginTop: 2 }}>{selectedQuoteName}</p>
          </div>
          <button className="btn btn-small btn-secondary" onClick={handleUnlock}>
            ✕ Liberar
          </button>
        </div>
      )}

      {/* Dimensions inputs */}
      <div className="card mt-2" style={{ opacity: isDisabled ? 0.7 : 1 }}>
        <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📏 Dimensiones del Terreno</h3>

        {/* Area mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className={`btn btn-small ${areaMode === 'dimensions' ? '' : 'btn-secondary'}`}
            onClick={() => { if (!isDisabled) setAreaMode('dimensions'); }}
            style={{ flex: 1 }}
            disabled={isDisabled}
          >
            Por Dimensiones
          </button>
          <button
            className={`btn btn-small ${areaMode === 'direct' ? '' : 'btn-secondary'}`}
            onClick={() => { if (!isDisabled) setAreaMode('direct'); }}
            style={{ flex: 1 }}
            disabled={isDisabled}
          >
            Área Directa
          </button>
        </div>

        {areaMode === 'direct' ? (
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Área del lote (m²)</label>
            <input
              type="number"
              className="input"
              value={directArea}
              step="0.1"
              onChange={(e) => setDirectArea(e.target.value)}
              disabled={isDisabled}
              style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined}
            />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                className={`btn btn-small ${lotShape === 'rectangular' ? '' : 'btn-secondary'}`}
                onClick={() => { if (!isDisabled) setLotShape('rectangular'); }}
                style={{ flex: 1 }}
                disabled={isDisabled}
              >
                Rectangular
              </button>
              <button
                className={`btn btn-small ${lotShape === 'irregular' ? '' : 'btn-secondary'}`}
                onClick={() => { if (!isDisabled) setLotShape('irregular'); }}
                style={{ flex: 1 }}
                disabled={isDisabled}
              >
                Irregular
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Frontal (m)</label>
                <input type="number" className="input" value={frontal} step="0.1" onChange={(e) => setFrontal(e.target.value)} disabled={isDisabled} style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined} />
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Posterior (m)</label>
                <input type="number" className="input" value={posterior} step="0.1" onChange={(e) => setPosterior(e.target.value)} disabled={isDisabled} style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined} />
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Lat. Izquierdo (m)</label>
                <input type="number" className="input" value={latIzq} step="0.1" onChange={(e) => setLatIzq(e.target.value)} disabled={isDisabled} style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined} />
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Lat. Derecho (m)</label>
                <input type="number" className="input" value={latDer} step="0.1" onChange={(e) => setLatDer(e.target.value)} disabled={isDisabled} style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined} />
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Índice de Ocupación: {occ}%</label>
          <input
            type="range"
            min={20}
            max={100}
            value={occ}
            onChange={(e) => setOcc(parseInt(e.target.value))}
            style={{ width: '100%' }}
            disabled={isDisabled}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Pisos: {floors}</label>
          <input
            type="range"
            min={1}
            max={5}
            value={floors}
            onChange={(e) => setFloors(parseInt(e.target.value))}
            style={{ width: '100%' }}
            disabled={isDisabled}
          />
        </div>

        {/* Volado y fachadas */}
        {floors > 1 && (
          <div style={{ marginTop: 20, padding: 16, background: '#0a0a0a', borderRadius: 12, border: '1px solid var(--color-line)' }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🏗️ Volado y Fachadas (pisos superiores)</h4>
            <div style={{ marginBottom: 12 }}>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Tamaño del volado (m)</label>
              <input
                type="number"
                className="input"
                value={overhangSize}
                step="0.1"
                min={0}
                onChange={(e) => setOverhangSize(parseFloat(e.target.value) || 0)}
                disabled={isDisabled}
                style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { key: 'frontal', label: 'Frontal' },
                { key: 'posterior', label: 'Posterior' },
                { key: 'lateralLeft', label: 'Lateral Izq.' },
                { key: 'lateralRight', label: 'Lateral Der.' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: '#111',
                    borderRadius: 8,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.6 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={facades[key as keyof typeof facades]}
                    onChange={(e) => {
                      if (isDisabled) return;
                      setFacades((prev) => ({ ...prev, [key]: e.target.checked }));
                    }}
                    disabled={isDisabled}
                  />
                  <span className="small">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="card mt-2">
        <h3 className="mb-2" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📊 Parámetros de Estimación</h3>

        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <div className="flex-between" style={{ padding: '12px 16px', background: '#0a0a0a', borderRadius: 12 }}>
            <span className="small">Área del lote</span>
            <span style={{ fontWeight: 600 }}>{area.lot.toFixed(2)} m²</span>
          </div>
          {floors > 1 && (
            <>
              <div className="flex-between" style={{ padding: '12px 16px', background: '#0a0a0a', borderRadius: 12 }}>
                <span className="small">Área primer piso</span>
                <span style={{ fontWeight: 600 }}>{area.first.toFixed(2)} m²</span>
              </div>
              <div className="flex-between" style={{ padding: '12px 16px', background: '#0a0a0a', borderRadius: 12 }}>
                <span className="small">Volado</span>
                <span style={{ fontWeight: 600 }}>{area.overhangArea.toFixed(2)} m²</span>
              </div>
              <div className="flex-between" style={{ padding: '12px 16px', background: '#0a0a0a', borderRadius: 12 }}>
                <span className="small">Área pisos superiores</span>
                <span style={{ fontWeight: 600 }}>{area.upper.toFixed(2)} m²</span>
              </div>
            </>
          )}
          <div className="flex-between" style={{ padding: '12px 16px', background: '#0a0a0a', borderRadius: 12 }}>
            <span className="small">Área construida total</span>
            <span style={{ fontWeight: 700, color: '#b69462' }}>{totalArea.toFixed(2)} m²</span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {/* Fixed estimations */}
          <div style={{ padding: 16, background: '#0a0a0a', borderRadius: 12, border: '1px solid var(--color-line)' }}>
            <div className="flex-between mb-1">
              <h4 style={{ fontSize: 16, fontWeight: 600 }}>🧱 Obra Negra</h4>
              <span style={{ color: '#999', fontSize: 12 }}>${obraNegraPrice.toLocaleString('es-CO')} /m²</span>
            </div>
            <p className="small" style={{ marginBottom: 8 }}>Estructura, muros sin acabados, instalaciones básicas</p>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#b69462' }}>
              ${obraNegraCost.toLocaleString('es-CO')}
            </div>
          </div>

          <div style={{ padding: 16, background: '#0a0a0a', borderRadius: 12, border: '1px solid var(--color-line)' }}>
            <div className="flex-between mb-1">
              <h4 style={{ fontSize: 16, fontWeight: 600 }}>🔧 Obra Gris</h4>
              <span style={{ color: '#999', fontSize: 12 }}>${obraGrisPrice.toLocaleString('es-CO')} /m²</span>
            </div>
            <p className="small" style={{ marginBottom: 8 }}>Estructura + instalaciones + acabados básicos</p>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#b69462' }}>
              ${obraGrisCost.toLocaleString('es-CO')}
            </div>
          </div>

          <div style={{ padding: 16, background: '#0a0a0a', borderRadius: 12, border: '1px solid var(--color-line)' }}>
            <div className="flex-between mb-1">
              <h4 style={{ fontSize: 16, fontWeight: 600 }}>✨ Acabados</h4>
              <span style={{ color: '#999', fontSize: 12 }}>${acabadosPrice.toLocaleString('es-CO')} /m²</span>
            </div>
            <p className="small" style={{ marginBottom: 8 }}>Obra completa con acabados de alta calidad</p>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#b69462' }}>
              ${acabadosCost.toLocaleString('es-CO')}
            </div>
          </div>

          {/* Custom estimations */}
          {customEstimations.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#999' }}>📋 Estimaciones Personalizadas</h4>
              {customEstimations.map((est) => {
                const cost = totalArea * est.price;
                return (
                  <div
                    key={est.id}
                    style={{
                      padding: 16,
                      background: '#0a0a0a',
                      borderRadius: 12,
                      border: '1px solid var(--color-line)',
                      marginBottom: 12,
                    }}
                  >
                    <div className="flex-between mb-1">
                      <h4 style={{ fontSize: 16, fontWeight: 600 }}>{est.name}</h4>
                      <span style={{ color: '#999', fontSize: 12 }}>${est.price.toLocaleString('es-CO')} /m²</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#b69462' }}>
                      ${cost.toLocaleString('es-CO')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quote Selection Modal */}
      {showQuoteModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowQuoteModal(false); }}
        >
          <div className="modal" style={{ maxWidth: 520, width: '100%', maxHeight: '80vh', overflow: 'hidden' }}>
            <h3 style={{ marginBottom: 12 }}>📋 Seleccionar Cotización</h3>
            <p className="small mb-2" style={{ color: '#999' }}>Elige una cotización para cargar sus medidas</p>

            <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 140px)', display: 'grid', gap: 8 }}>
              {myQuotes.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 24 }}>
                  <p className="small" style={{ color: '#999' }}>No hay cotizaciones guardadas</p>
                </div>
              ) : (
                myQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="card"
                    style={{ cursor: 'pointer', padding: 12 }}
                    onClick={() => handleSelectQuote(quote)}
                  >
                    <div className="flex-between mb-1">
                      <span style={{ fontWeight: 600 }}>{quote.client}</span>
                      <span className="small" style={{ color: '#b69462' }}>{quote.area.toFixed(0)}m²</span>
                    </div>
                    <p className="small" style={{ color: '#999' }}>{quote.project}</p>
                    <p className="small mt-1" style={{ color: '#666' }}>{quote.date}</p>
                  </div>
                ))
              )}
            </div>

            <button className="btn btn-secondary mt-2" onClick={() => setShowQuoteModal(false)} style={{ width: '100%' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
