import { useMemo } from 'react'
import type { Nivel, Espacio, MaterialEnchape } from '../types/enchapes'
import { nombreConColor } from '../types/enchapes'

interface Fase2ResumenProps {
  niveles: Nivel[]
  computeArea: (sp: Espacio) => number
  getMaterial: (id: string) => MaterialEnchape | undefined
}

export function Fase2Resumen({ niveles, computeArea, getMaterial }: Fase2ResumenProps) {
  const totalProyecto = useMemo(
    () => niveles.reduce((sum, n) => sum + n.espacios.reduce((s, sp) => s + computeArea(sp), 0), 0),
    [niveles, computeArea]
  )

  return (
    <div>
      <div className="card">
        <h3 className="section-title" style={{ marginTop: 0 }}>
          📊 Resumen de áreas
        </h3>
        {niveles.map((nivel) => {
          const totalNivel = nivel.espacios.reduce((sum, sp) => sum + computeArea(sp), 0)
          return (
            <div key={nivel.id} style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 10, color: '#b69462' }}>{nivel.nombre}</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 8px' }}>Espacio</th>
                      <th style={{ textAlign: 'left', padding: '10px 8px' }}>Tipo</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px' }}>Tramos</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px' }}>Área (m²)</th>
                      <th style={{ textAlign: 'left', padding: '10px 8px' }}>Material</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nivel.espacios.map((sp) => {
                      const mat = sp.materialId ? getMaterial(sp.materialId) : null
                      return (
                        <tr key={sp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 8px' }}>{sp.nombre || 'Sin nombre'}</td>
                          <td style={{ padding: '10px 8px', textTransform: 'capitalize' }}>{sp.tipo}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>{sp.segmentos.length}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>
                            {computeArea(sp).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', color: mat ? '#b69462' : 'rgba(255,255,255,0.4)' }}>
                            {mat ? nombreConColor(mat) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                      <td colSpan={3} style={{ padding: '10px 8px', fontWeight: 700 }}>
                        Total {nivel.nombre}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#b69462' }}>
                        {totalNivel.toFixed(2)} m²
                      </td>
                      <td aria-hidden="true" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
        <div
          style={{
            borderTop: '2px solid #b69462',
            marginTop: 12,
            paddingTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          <span>Total proyecto</span>
          <span style={{ color: '#b69462' }}>{totalProyecto.toFixed(2)} m²</span>
        </div>
      </div>
    </div>
  )
}
