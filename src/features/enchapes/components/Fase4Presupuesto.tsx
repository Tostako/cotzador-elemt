import { useMemo } from 'react'
import type { Nivel, MaterialEnchape } from '../types/enchapes'
import { calcularPresupuesto } from '../utils/calculations'

interface Fase4PresupuestoProps {
  niveles: Nivel[]
  materiales: MaterialEnchape[]
}

function formatCurrency(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CO')
}

export function Fase4Presupuesto({ niveles, materiales }: Fase4PresupuestoProps) {
  const budget = useMemo(() => calcularPresupuesto(niveles, materiales), [niveles, materiales])

  return (
    <div>
      <div className="card">
        <h3 className="section-title" style={{ marginTop: 0 }}>
          💰 Presupuesto
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '10px 8px' }}>Espacio</th>
                <th style={{ textAlign: 'left', padding: '10px 8px' }}>Tipo</th>
                <th style={{ textAlign: 'right', padding: '10px 8px' }}>Área m²</th>
                <th style={{ textAlign: 'right', padding: '10px 8px' }}>Desp. %</th>
                <th style={{ textAlign: 'right', padding: '10px 8px' }}>Comprar m²</th>
                <th style={{ textAlign: 'right', padding: '10px 8px' }}>Cajas</th>
                <th style={{ textAlign: 'right', padding: '10px 8px' }}>Peso kg</th>
                <th style={{ textAlign: 'right', padding: '10px 8px' }}>Costo</th>
              </tr>
            </thead>
            <tbody>
              {budget.lineas.map((linea) => (
                <tr key={linea.espacioId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 8px' }}>{linea.espacioNombre}</td>
                  <td style={{ padding: '10px 8px', textTransform: 'capitalize' }}>{linea.tipo}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(linea.area).toFixed(2)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(linea.desperdicio).toFixed(1)}%</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(linea.areaComprar).toFixed(2)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    {typeof linea.cajas === 'number' ? linea.cajas : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    {linea.peso > 0 ? Number(linea.peso).toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>
                    {linea.costo > 0 ? formatCurrency(linea.costo) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals by material */}
        {Object.values(budget.porMaterial).length > 0 && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <h4 className="section-title" style={{ marginTop: 0 }}>
              Totales por material
            </h4>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              {Object.values(budget.porMaterial).map((tot) => (
                <div key={tot.nombre} className="grand-total">
                  <div style={{ fontWeight: 700, marginBottom: 6, color: '#b69462' }}>{tot.nombre}</div>
                  <div className="small" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                    <span>Área: {Number(tot.area).toFixed(2)} m²</span>
                    <span>Cajas: {tot.cajas}</span>
                    <span>Peso: {Number(tot.peso).toFixed(1)} kg</span>
                    <span style={{ fontWeight: 600 }}>Costo: {formatCurrency(tot.costo)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grand total */}
        <div className="budget-total">
          <div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Total del proyecto</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#b69462' }}>{formatCurrency(budget.granTotal)}</div>
          </div>
          {budget.pesoGranTotal > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Peso total</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{budget.pesoGranTotal.toFixed(1)} kg</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
