import { useReducer } from 'react';
import { useStore } from '../../shared/services/store';
import { useShallow } from 'zustand/react/shallow';
import { showNotification } from '../../shared/hooks/useNotifications';
import { useEscapeKey } from '../../shared/hooks/useEscapeKey';
import { calculateArea } from '../../shared/services/calculator';
import type { Quote, QuoteFormData } from '../../shared/types';

type State = {
  areaMode: 'dimensions' | 'direct';
  lotShape: 'rectangular' | 'irregular';
  frontal: string;
  posterior: string;
  latIzq: string;
  latDer: string;
  directArea: string;
  occ: number;
  floors: number;
  overhangSize: number;
  facades: { frontal: boolean; posterior: boolean; lateralLeft: boolean; lateralRight: boolean };
  showQuoteModal: boolean;
  lockedFromQuote: boolean;
  selectedQuoteName: string;
};

type Action =
  | { type: 'setField'; field: keyof State; value: State[keyof State] }
  | {
      type: 'loadQuote';
      data: {
        areaMode?: State['areaMode'];
        lotShape?: State['lotShape'];
        frontal?: string | number;
        posterior?: string | number;
        latIzq?: string | number;
        latDer?: string | number;
        directArea?: string | number;
        occ?: number;
        floors?: number;
        overhangSize?: number;
        facades?: State['facades'];
        selectedQuoteName: string;
      };
    }
  | { type: 'unlock' }
  | { type: 'showModal' }
  | { type: 'hideModal' };

const initialState: State = {
  areaMode: 'dimensions',
  lotShape: 'rectangular',
  frontal: '10',
  posterior: '10',
  latIzq: '10',
  latDer: '10',
  directArea: '100',
  occ: 80,
  floors: 1,
  overhangSize: 1.0,
  facades: { frontal: false, posterior: false, lateralLeft: false, lateralRight: false },
  showQuoteModal: false,
  lockedFromQuote: false,
  selectedQuoteName: '',
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setField': {
      const next = { ...state };
      (next as Record<string, unknown>)[action.field] = action.value;
      return next as State;
    }
    case 'loadQuote': {
      const { data } = action;
      return {
        ...state,
        areaMode: data.areaMode || 'dimensions',
        lotShape: data.lotShape || 'rectangular',
        frontal: String(data.frontal || '10'),
        posterior: String(data.posterior || '10'),
        latIzq: String(data.latIzq || '10'),
        latDer: String(data.latDer || '10'),
        directArea: String(data.directArea || '100'),
        occ: data.occ || 80,
        floors: data.floors || 1,
        overhangSize: data.overhangSize ?? 1.0,
        facades: data.facades || { frontal: false, posterior: false, lateralLeft: false, lateralRight: false },
        lockedFromQuote: true,
        selectedQuoteName: data.selectedQuoteName,
        showQuoteModal: false,
      };
    }
    case 'unlock':
      return { ...state, lockedFromQuote: false, selectedQuoteName: '' };
    case 'showModal':
      return { ...state, showQuoteModal: true };
    case 'hideModal':
      return { ...state, showQuoteModal: false };
    default:
      return state;
  }
}

function DimensionInputs({
  state,
  dispatch,
  isDisabled,
}: {
  state: State;
  dispatch: (action: Action) => void;
  isDisabled: boolean;
}) {
  return (
    <div className="card mt-2" style={{ opacity: isDisabled ? 0.7 : 1 }}>
      <h3 className="mb-2 section-title">📏 Dimensiones del Terreno</h3>

      {/* Area mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={`btn btn-small ${state.areaMode === 'dimensions' ? '' : 'btn-secondary'}`}
          onClick={() => {
            if (!isDisabled) dispatch({ type: 'setField', field: 'areaMode', value: 'dimensions' });
          }}
          style={{ flex: 1 }}
          disabled={isDisabled}
        >
          Por Dimensiones
        </button>
        <button
          type="button"
          className={`btn btn-small ${state.areaMode === 'direct' ? '' : 'btn-secondary'}`}
          onClick={() => {
            if (!isDisabled) dispatch({ type: 'setField', field: 'areaMode', value: 'direct' });
          }}
          style={{ flex: 1 }}
          disabled={isDisabled}
        >
          Área Directa
        </button>
      </div>

      {state.areaMode === 'direct' ? (
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="est-area-lote">
            Área del lote (m²)
          </label>
          <input
            id="est-area-lote"
            type="number"
            className="input"
            value={state.directArea}
            step="0.1"
            onChange={(e) => dispatch({ type: 'setField', field: 'directArea', value: e.target.value })}
            disabled={isDisabled}
            style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined}
          />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              className={`btn btn-small ${state.lotShape === 'rectangular' ? '' : 'btn-secondary'}`}
              onClick={() => {
                if (!isDisabled) dispatch({ type: 'setField', field: 'lotShape', value: 'rectangular' });
              }}
              style={{ flex: 1 }}
              disabled={isDisabled}
            >
              Rectangular
            </button>
            <button
              type="button"
              className={`btn btn-small ${state.lotShape === 'irregular' ? '' : 'btn-secondary'}`}
              onClick={() => {
                if (!isDisabled) dispatch({ type: 'setField', field: 'lotShape', value: 'irregular' });
              }}
              style={{ flex: 1 }}
              disabled={isDisabled}
            >
              Irregular
            </button>
          </div>

          <div className="grid-2-responsive">
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="est-frontal">
                Frontal (m)
              </label>
              <input
                id="est-frontal"
                type="number"
                className="input"
                value={state.frontal}
                step="0.1"
                onChange={(e) => dispatch({ type: 'setField', field: 'frontal', value: e.target.value })}
                disabled={isDisabled}
                style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined}
              />
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="est-posterior">
                Posterior (m)
              </label>
              <input
                id="est-posterior"
                type="number"
                className="input"
                value={state.posterior}
                step="0.1"
                onChange={(e) => dispatch({ type: 'setField', field: 'posterior', value: e.target.value })}
                disabled={isDisabled}
                style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined}
              />
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="est-lat-izq">
                Lat. Izquierdo (m)
              </label>
              <input
                id="est-lat-izq"
                type="number"
                className="input"
                value={state.latIzq}
                step="0.1"
                onChange={(e) => dispatch({ type: 'setField', field: 'latIzq', value: e.target.value })}
                disabled={isDisabled}
                style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined}
              />
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="est-lat-der">
                Lat. Derecho (m)
              </label>
              <input
                id="est-lat-der"
                type="number"
                className="input"
                value={state.latDer}
                step="0.1"
                onChange={(e) => dispatch({ type: 'setField', field: 'latDer', value: e.target.value })}
                disabled={isDisabled}
                style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined}
              />
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="est-occ">
          Índice de Ocupación: {state.occ}%
        </label>
        <input
          id="est-occ"
          type="range"
          min={20}
          max={100}
          value={state.occ}
          onChange={(e) => dispatch({ type: 'setField', field: 'occ', value: parseInt(e.target.value) })}
          style={{ width: '100%' }}
          disabled={isDisabled}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="est-pisos">
          Pisos: {state.floors}
        </label>
        <input
          id="est-pisos"
          type="range"
          min={1}
          max={5}
          value={state.floors}
          onChange={(e) => dispatch({ type: 'setField', field: 'floors', value: parseInt(e.target.value) })}
          style={{ width: '100%' }}
          disabled={isDisabled}
        />
      </div>

      {/* Volado y fachadas */}
      {state.floors > 1 && (
        <div className="result-card" style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            🏗️ Volado y Fachadas (pisos superiores)
          </h4>
          <div style={{ marginBottom: 12 }}>
            <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="est-volado">
              Tamaño del volado (m)
            </label>
            <input
              id="est-volado"
              type="number"
              className="input"
              value={state.overhangSize}
              step="0.1"
              min={0}
              onChange={(e) =>
                dispatch({ type: 'setField', field: 'overhangSize', value: parseFloat(e.target.value) || 0 })
              }
              disabled={isDisabled}
              style={isDisabled ? { background: '#1a1a1a', cursor: 'not-allowed' } : undefined}
            />
          </div>
          <div className="grid-2-responsive">
            {[
              { key: 'frontal', label: 'Frontal' },
              { key: 'posterior', label: 'Posterior' },
              { key: 'lateralLeft', label: 'Lateral Izq.' },
              { key: 'lateralRight', label: 'Lateral Der.' },
            ].map(({ key, label }) => (
              <label
                key={key}
                className="toggle-option-row"
                style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.6 : 1 }}
              >
                <input
                  type="checkbox"
                  checked={state.facades[key as keyof typeof state.facades]}
                  onChange={(e) => {
                    if (isDisabled) return;
                    const next = { ...state.facades };
                    (next as Record<string, boolean>)[key] = e.target.checked;
                    dispatch({ type: 'setField', field: 'facades', value: next as State['facades'] });
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
  );
}

// ── Subcomponente: parámetros de área y costos estimados por tipo de obra ──
function EstimationResults({
  area,
  totalArea,
  floors,
  obraNegraPrice,
  obraGrisPrice,
  acabadosPrice,
  obraNegraCost,
  obraGrisCost,
  acabadosCost,
  customEstimations,
}: {
  area: ReturnType<typeof calculateArea>;
  totalArea: number;
  floors: number;
  obraNegraPrice: number;
  obraGrisPrice: number;
  acabadosPrice: number;
  obraNegraCost: number;
  obraGrisCost: number;
  acabadosCost: number;
  customEstimations: { id: number | string; name: string; price: number }[];
}) {
  return (
    <div className="card mt-2">
      <h3 className="mb-2 section-title">📊 Parámetros de Estimación</h3>

      <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <div className="flex-between result-row">
          <span className="small">Área del lote</span>
          <span style={{ fontWeight: 600 }}>{area.lot.toFixed(2)} m²</span>
        </div>
        {floors > 1 && (
          <>
            <div className="flex-between result-row">
              <span className="small">Área primer piso</span>
              <span style={{ fontWeight: 600 }}>{area.first.toFixed(2)} m²</span>
            </div>
            <div className="flex-between result-row">
              <span className="small">Volado</span>
              <span style={{ fontWeight: 600 }}>{area.overhangArea.toFixed(2)} m²</span>
            </div>
            <div className="flex-between result-row">
              <span className="small">Área pisos superiores</span>
              <span style={{ fontWeight: 600 }}>{area.upper.toFixed(2)} m²</span>
            </div>
          </>
        )}
        <div className="flex-between result-row">
          <span className="small">Área construida total</span>
          <span style={{ fontWeight: 700, color: '#b69462' }}>{totalArea.toFixed(2)} m²</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="result-card">
          <div className="flex-between mb-1">
            <h4 style={{ fontSize: 16, fontWeight: 600 }}>🧱 Obra Negra</h4>
            <span style={{ color: '#999', fontSize: 12 }}>${obraNegraPrice.toLocaleString('es-CO')} /m²</span>
          </div>
          <p className="small" style={{ marginBottom: 8 }}>
            Estructura, muros sin acabados, instalaciones básicas
          </p>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#b69462' }}>
            ${obraNegraCost.toLocaleString('es-CO')}
          </div>
        </div>

        <div className="result-card">
          <div className="flex-between mb-1">
            <h4 style={{ fontSize: 16, fontWeight: 600 }}>🔧 Obra Gris</h4>
            <span style={{ color: '#999', fontSize: 12 }}>${obraGrisPrice.toLocaleString('es-CO')} /m²</span>
          </div>
          <p className="small" style={{ marginBottom: 8 }}>
            Estructura + instalaciones + acabados básicos
          </p>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#b69462' }}>
            ${obraGrisCost.toLocaleString('es-CO')}
          </div>
        </div>

        <div className="result-card">
          <div className="flex-between mb-1">
            <h4 style={{ fontSize: 16, fontWeight: 600 }}>✨ Acabados</h4>
            <span style={{ color: '#999', fontSize: 12 }}>${acabadosPrice.toLocaleString('es-CO')} /m²</span>
          </div>
          <p className="small" style={{ marginBottom: 8 }}>
            Obra completa con acabados de alta calidad
          </p>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#b69462' }}>
            ${acabadosCost.toLocaleString('es-CO')}
          </div>
        </div>

        {customEstimations.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#999' }}>
              📋 Estimaciones Personalizadas
            </h4>
            {customEstimations.map((est) => {
              const cost = totalArea * est.price;
              return (
                <div key={est.id} className="result-card" style={{ marginBottom: 12 }}>
                  <div className="flex-between mb-1">
                    <h4 style={{ fontSize: 16, fontWeight: 600 }}>{est.name}</h4>
                    <span style={{ color: '#999', fontSize: 12 }}>
                      ${Number(est.price).toLocaleString('es-CO')} /m²
                    </span>
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
  );
}

// ── Subcomponente: modal para elegir una cotización y cargar sus medidas ──
function QuoteSelectModal({
  quotes,
  onSelect,
  onClose,
}: {
  quotes: Quote[];
  onSelect: (quote: Quote) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  return (
    <div className="modal-overlay">
      <div
        className="modal"
        style={{ maxWidth: 520, width: '100%', maxHeight: '80vh', overflow: 'hidden' }}
      >
        <h3 style={{ marginBottom: 12 }}>📋 Seleccionar Cotización</h3>
        <p className="small mb-2" style={{ color: '#999' }}>
          Elige una cotización para cargar sus medidas
        </p>

        <div
          style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 140px)', display: 'grid', gap: 8 }}
        >
          {quotes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <p className="small" style={{ color: '#999' }}>
                No hay cotizaciones guardadas
              </p>
            </div>
          ) : (
            quotes.map((quote) => (
              <button
                type="button"
                key={quote.id}
                className="card"
                style={{ cursor: 'pointer', padding: 12, width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={() => onSelect(quote)}
              >
                <div className="flex-between mb-1">
                  <span style={{ fontWeight: 600 }}>{quote.client}</span>
                  <span className="small" style={{ color: '#b69462' }}>
                    {Number(quote.area).toFixed(0)}m²
                  </span>
                </div>
                <p className="small" style={{ color: '#999' }}>
                  {quote.project}
                </p>
                <p className="small mt-1" style={{ color: '#666' }}>
                  {quote.date}
                </p>
              </button>
            ))
          )}
        </div>

        <button type="button" className="btn btn-secondary mt-2" onClick={onClose} style={{ width: '100%' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function EstimationCalculatorPage() {
  const { config, quotes, user } = useStore(
    useShallow((s) => ({ config: s.config, quotes: s.quotes, user: s.user }))
  );

  const [state, dispatch] = useReducer(reducer, initialState);

  const formData: QuoteFormData = {
    client: '',
    project: '',
    areaMode: state.areaMode,
    lotShape: state.lotShape,
    frontal: state.frontal,
    posterior: state.posterior,
    latIzq: state.latIzq,
    latDer: state.latDer,
    directArea: state.directArea,
    occ: state.occ,
    floors: state.floors,
    overhangSize: state.overhangSize,
    facades: state.facades,
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
        dispatch({
          type: 'loadQuote',
          data: {
            areaMode: data.areaMode,
            lotShape: data.lotShape,
            frontal: data.frontal,
            posterior: data.posterior,
            latIzq: data.latIzq,
            latDer: data.latDer,
            directArea: data.directArea,
            occ: data.occ,
            floors: data.floors,
            overhangSize: data.overhangSize,
            facades: data.facades,
            selectedQuoteName: `${quote.client} — ${quote.project}`,
          },
        });
        showNotification('Correcto', 'success', `Medidas cargadas desde: ${quote.client} — ${quote.project}`);
      }
    } catch {
      showNotification('Error', 'error', 'Error al leer las medidas de la cotización.');
    }
    dispatch({ type: 'hideModal' });
  };

  const handleUnlock = () => {
    dispatch({ type: 'unlock' });
    showNotification('Correcto', 'success', 'Medidas liberadas. Ahora puedes editar manualmente.');
  };

  // Filter: only user's quotes, and only parent quotes (no versions/children)
  const myQuotes = quotes.filter((q) => {
    const data =
      typeof q.data === 'string'
        ? (() => {
            try {
              return JSON.parse(q.data);
            } catch {
              return null;
            }
          })()
        : q.data;
    const isChild = data?.parentQuoteId != null;
    if (isChild) return false;
    if (q.customerId && user?.id) {
      return q.customerId === user.id;
    }
    // Fallback if backend doesn't send customerId: show all parent quotes
    return true;
  });

  const isDisabled = state.lockedFromQuote;

  return (
    <>
      <p className="small" style={{ marginBottom: 16 }}>
        Calcula el costo aproximado de construcción según las dimensiones del terreno.
      </p>

      {/* Coger cotización */}
      <button
        type="button"
        className="btn btn-secondary mt-2 mb-2"
        onClick={() => dispatch({ type: 'showModal' })}
      >
        📋 Coger Cotización
      </button>

      {/* Locked banner */}
      {state.lockedFromQuote && (
        <div className="locked-banner">
          <div>
            <span style={{ fontWeight: 600, color: '#b69462' }}>🔒 Medidas bloqueadas</span>
            <p className="small" style={{ color: '#999', marginTop: 2 }}>
              {state.selectedQuoteName}
            </p>
          </div>
          <button type="button" className="btn btn-small btn-secondary" onClick={handleUnlock}>
            ✕ Liberar
          </button>
        </div>
      )}

      <DimensionInputs state={state} dispatch={dispatch} isDisabled={isDisabled} />

      {/* Results */}
      <EstimationResults
        area={area}
        totalArea={totalArea}
        floors={state.floors}
        obraNegraPrice={obraNegraPrice}
        obraGrisPrice={obraGrisPrice}
        acabadosPrice={acabadosPrice}
        obraNegraCost={obraNegraCost}
        obraGrisCost={obraGrisCost}
        acabadosCost={acabadosCost}
        customEstimations={customEstimations}
      />

      {/* Quote Selection Modal */}
      {state.showQuoteModal && (
        <QuoteSelectModal
          quotes={myQuotes}
          onSelect={handleSelectQuote}
          onClose={() => dispatch({ type: 'hideModal' })}
        />
      )}
    </>
  );
}
