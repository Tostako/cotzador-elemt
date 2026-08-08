import { AlertTriangle } from 'lucide-react';
import { money, aNumero, type Aiu } from './types';

/**
 * HU-16 · Resumen financiero: costo directo, AIU editable, IVA y total.
 *
 * Sigue el principio "el dinero siempre a la vista" (DOC-04 §1): los
 * porcentajes se editan aquí mismo y el total se recalcula al instante, para
 * poder negociar el precio sin cambiar de pantalla. Cada porcentaje muestra
 * también su importe en pesos, y bajo el total va el costo por m².
 */
export function ResumenFinanciero({
  aiu,
  areaM2,
  onChange,
  guardando,
  sinGuardar,
}: {
  aiu: Aiu;
  areaM2?: number;
  onChange: (patch: Partial<Aiu>) => void;
  guardando?: boolean;
  /** El cálculo es correcto pero el servidor no aceptó el guardado. */
  sinGuardar?: boolean;
}) {
  const costoDirecto = aNumero(aiu.costoDirecto);
  // Se calcula en el cliente para que el usuario vea el efecto mientras teclea;
  // el servidor manda y su respuesta sobrescribe estos valores al guardar.
  const admin = costoDirecto * (aiu.administracionPct || 0) / 100;
  const imprev = costoDirecto * (aiu.imprevistosPct || 0) / 100;
  const util = costoDirecto * (aiu.utilidadPct || 0) / 100;
  const aiuTotal = admin + imprev + util;
  const base = costoDirecto + aiuTotal - (aiu.descuento || 0);
  const iva = aiu.ivaAplica ? base * (aiu.ivaPct || 0) / 100 : 0;
  const total = base + iva;
  const pctAiu = costoDirecto > 0 ? (aiuTotal / costoDirecto) * 100 : 0;
  const porM2 = areaM2 && areaM2 > 0 ? total / areaM2 : null;

  const fila = (etiqueta: string, valor: number, campo: 'administracionPct' | 'imprevistosPct' | 'utilidadPct', importe: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <label className="small" style={{ flex: '1 1 auto', color: '#a59e90' }}>{etiqueta}</label>
      <input
        className="input"
        type="number"
        min={0}
        max={100}
        step={0.5}
        value={valor}
        onChange={(e) => onChange({ [campo]: parseFloat(e.target.value) || 0 } as Partial<Aiu>)}
        style={{ width: 68, padding: '6px 8px', textAlign: 'right' }}
        aria-label={etiqueta}
      />
      <span className="small" style={{ color: '#8c8578' }}>%</span>
      <span className="small" style={{ width: 110, textAlign: 'right', color: '#c0b8a9' }}>{money(importe)}</span>
    </div>
  );

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="flex-between" style={{ marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Resumen financiero</h3>
        {guardando && <span className="small" style={{ color: '#8c8578' }}>Guardando…</span>}
      </div>

      {/* Sin este aviso, el usuario ve el total recalculado y da por hecho que
          quedó guardado, cuando el servidor no lo aceptó. */}
      {sinGuardar && !guardando && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 11px', marginBottom: 12, borderRadius: 9, background: 'rgba(255,149,0,0.09)', border: '1px solid rgba(255,149,0,0.28)' }}>
          <AlertTriangle size={15} color="#ff9500" style={{ flexShrink: 0, marginTop: 1 }} />
          <span className="small" style={{ color: '#d8cbb4' }}>
            El cálculo es correcto, pero no se pudo guardar en el servidor. Al recargar volverán los valores anteriores.
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
        <span className="small" style={{ color: '#a59e90' }}>Costo directo</span>
        <span style={{ fontWeight: 700 }}>{money(costoDirecto)}</span>
      </div>

      {fila('Administración', aiu.administracionPct, 'administracionPct', admin)}
      {fila('Imprevistos', aiu.imprevistosPct, 'imprevistosPct', imprev)}
      {fila('Utilidad', aiu.utilidadPct, 'utilidadPct', util)}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="small" style={{ color: '#a59e90' }}>AIU total <span style={{ color: '#8c8578' }}>({pctAiu.toFixed(1)} %)</span></span>
        <span style={{ fontWeight: 700 }}>{money(aiuTotal)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
        <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, color: '#a59e90', cursor: 'pointer' }}>
          <input type="checkbox" checked={aiu.ivaAplica} onChange={(e) => onChange({ ivaAplica: e.target.checked })} />
          IVA
        </label>
        <input
          className="input"
          type="number"
          min={0}
          max={100}
          step={1}
          value={aiu.ivaPct}
          onChange={(e) => onChange({ ivaPct: parseFloat(e.target.value) || 0 })}
          disabled={!aiu.ivaAplica}
          style={{ width: 68, padding: '6px 8px', textAlign: 'right' }}
          aria-label="Porcentaje de IVA"
        />
        <span className="small" style={{ color: '#8c8578' }}>%</span>
        <span className="small" style={{ width: 110, textAlign: 'right', color: '#c0b8a9' }}>{money(iva)}</span>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: 12, marginTop: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700 }}>Total proyecto</span>
          <span style={{ fontWeight: 800, fontSize: 20, color: '#b69462' }}>{money(total)}</span>
        </div>
        {porM2 !== null && (
          <div className="small" style={{ textAlign: 'right', color: '#8c8578', marginTop: 4 }}>
            {money(porM2)} / m²
          </div>
        )}
      </div>
    </div>
  );
}
