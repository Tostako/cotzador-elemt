import { useState, useRef, useCallback, useMemo } from 'react'
import type { Nivel, Espacio, Conexion, Segmento, MaterialEnchape } from '../types/enchapes'
import { nombreConColor } from '../types/enchapes'
import { computeRing } from '../../planos/planoGeometry'
import { showNotification } from '../../../shared/hooks/useNotifications'

// Polígono (anillo ordenado) de un espacio si trae la geometría del plano; si no, null.
function ringDe(sp: Espacio): { x: number; y: number }[] | null {
  if (Array.isArray(sp.puntos) && sp.puntos.length >= 3) return sp.puntos
  if (Array.isArray(sp.nodos) && sp.nodos.length >= 3 && Array.isArray(sp.muros) && sp.muros.length >= 3) {
    const nodes = sp.nodos.map((n) => ({ id: n.id, x: n.x, y: n.y }))
    const walls = sp.muros.map((m) => ({ id: m.a + '-' + m.b, a: m.a, b: m.b, opening: !!m.abertura }))
    const ring = computeRing(nodes, walls)
    return ring ? ring.map((n) => ({ x: n.x, y: n.y })) : null
  }
  return null
}

interface Fase1CanvasProps {
  niveles: Nivel[]
  nivelActivoId: string | null
  selectNivel: (id: string) => void
  addNivel: () => void
  removeNivel: (id: string) => void
  renameNivel: (id: string, name: string) => void
  espacios: Espacio[]
  conexiones: Conexion[]
  addSpace: (tipo?: 'piso' | 'pared') => void
  removeSpace: (spaceId: string) => void
  updateSpace: (spaceId: string, updates: Partial<Espacio>) => void
  updateSegmento: (spaceId: string, idx: number, field: keyof Segmento, value: number) => void
  addSegmento: (spaceId: string) => void
  removeSegmento: (spaceId: string, idx: number) => void
  addAdjacentSpace: (fromId: string | null, tipo?: 'piso' | 'pared') => void
  addConexion: (a: string, b: string) => void
  removeConexion: (id: string) => void
  selectedCardId: string | null
  setSelectedCardId: (id: string | null) => void
  updateSpacePosition: (spaceId: string, x: number, y: number) => void
  computeArea: (sp: Espacio) => number
  getMaterial: (id: string) => MaterialEnchape | undefined
  readOnly?: boolean
  onEditarPlano?: () => void
}

export function Fase1Canvas({
  niveles,
  nivelActivoId,
  selectNivel,
  addNivel,
  removeNivel,
  renameNivel,
  espacios,
  conexiones,
  addSpace,
  removeSpace,
  updateSpace,
  updateSegmento,
  addSegmento,
  removeSegmento,
  addAdjacentSpace,
  addConexion,
  removeConexion,
  selectedCardId,
  setSelectedCardId,
  updateSpacePosition,
  computeArea,
  getMaterial,
  readOnly = false,
  onEditarPlano,
}: Fase1CanvasProps) {
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)
  const [connectMode, setConnectMode] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const didDrag = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const nivelActivo = useMemo(
    () => niveles.find((n) => n.id === nivelActivoId),
    [niveles, nivelActivoId]
  )

  const areaPisoNivel = useMemo(
    () => espacios.filter((s) => s.tipo === 'piso').reduce((a, s) => a + computeArea(s), 0),
    [espacios, computeArea]
  )
  const areaParedNivel = useMemo(
    () => espacios.filter((s) => s.tipo === 'pared').reduce((a, s) => a + computeArea(s), 0),
    [espacios, computeArea]
  )

  const editingSpace = useMemo(() => espacios.find((s) => s.id === editingSpaceId), [espacios, editingSpaceId])

  // Vista del plano real: si los espacios traen geometría, se dibuja el polígono en vez de los cuadritos.
  const geom = useMemo(() => {
    const items = espacios.map((sp) => ({ sp, ring: ringDe(sp) }))
    const rings = items.filter((i) => i.ring)
    if (rings.length === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const { ring } of rings) for (const p of ring!) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    const w = maxX - minX
    const h = maxY - minY
    const span = Math.max(w, h) || 1
    const pad = span * 0.06
    return { items, viewBox: `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`, span }
  }, [espacios])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, spaceId: string) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'SELECT' || target.isContentEditable) return
      const sp = espacios.find((s) => s.id === spaceId)
      if (!sp) return
      didDrag.current = false
      setDraggingId(spaceId)
      dragOffset.current = { x: e.clientX - sp.x, y: e.clientY - sp.y }
      target.setPointerCapture(e.pointerId)
    },
    [espacios]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId) return
      didDrag.current = true
      updateSpacePosition(draggingId, e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y)
    },
    [draggingId, updateSpacePosition]
  )

  const handlePointerUp = useCallback(() => {
    setDraggingId(null)
  }, [])

  const handleCardClick = useCallback(
    (spaceId: string) => {
      if (didDrag.current) return
      if (connectMode) {
        if (!selectedCardId) {
          setSelectedCardId(spaceId)
        } else if (selectedCardId !== spaceId) {
          addConexion(selectedCardId, spaceId)
          setSelectedCardId(null)
          setConnectMode(false)
          showNotification('Correcto', 'success', 'Espacios conectados')
        }
      } else {
        setEditingSpaceId((prev) => (prev === spaceId ? null : spaceId))
      }
    },
    [connectMode, selectedCardId, setSelectedCardId, addConexion]
  )

  return (
    <div>
      {readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 14px', marginBottom: 14, borderRadius: 10, background: 'rgba(182,148,98,0.12)', border: '1px solid rgba(182,148,98,0.3)' }}>
          <span className="small" style={{ color: '#cabfa9', fontWeight: 600 }}>🔒 La distribución de las habitaciones viene de Planos y no se mueve aquí. Puedes editar valores, materiales y agregar paredes.</span>
          {onEditarPlano && (
            <button type="button" className="toolbar-btn" style={{ marginLeft: 'auto' }} onClick={onEditarPlano}>Ir a Planos →</button>
          )}
        </div>
      )}
      {/* Nivel tabs */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex-gap" style={{ flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <span className="small" style={{ fontWeight: 700 }}>Niveles:</span>
          {niveles.map((n) => (
            <button
              type="button"
              key={n.id}
              onClick={() => selectNivel(n.id)}
              className={n.id === nivelActivoId ? 'level-tab level-tab--active' : 'level-tab'}
            >
              {n.nombre}
            </button>
          ))}
          <button type="button" onClick={addNivel} className="toolbar-btn--outline">
            + Nivel
          </button>
        </div>
        {nivelActivo && (
          <div className="flex-gap" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="input"
              style={{ maxWidth: 200 }}
              value={nivelActivo.nombre}
              onChange={(e) => renameNivel(nivelActivo.id, e.target.value)}
              placeholder="Nombre del nivel"
              aria-label="Nombre del nivel"
            />
            {niveles.length > 1 && (
              <button
                type="button"
                className="toolbar-btn--danger"
                onClick={() => {
                  removeNivel(nivelActivo.id)
                  showNotification('Correcto', 'success', 'Nivel eliminado')
                }}
              >
                Eliminar nivel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Canvas toolbar */}
      <div className="flex-gap" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="toolbar-btn" onClick={() => addSpace('piso')}>
          + Espacio (piso)
        </button>
        <button type="button" className="toolbar-btn--secondary" onClick={() => addSpace('pared')}>
          + Pared
        </button>
        <button
          type="button"
          className={connectMode ? 'toolbar-btn toolbar-btn--connect-active' : 'toolbar-btn toolbar-btn--connect'}
          onClick={() => {
            setConnectMode((v) => {
              const next = !v
              if (next) setSelectedCardId(null)
              else setSelectedCardId(null)
              return next
            })
          }}
        >
          {connectMode ? '🔗 Modo conexión (selecciona 2)' : '🔗 Conectar espacios'}
        </button>
        {selectedCardId && !connectMode && (
          <button
            type="button"
            className="toolbar-btn--secondary"
            onClick={() => addAdjacentSpace(selectedCardId, 'piso')}
          >
            + Adjacente al seleccionado
          </button>
        )}
      </div>

      <div className="ench-grid">
        <div className="ench-canvas">
          {/* Canvas */}
          <div style={{ overflow: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            {geom ? (
              <div style={{ padding: 8 }}>
                <svg viewBox={geom.viewBox} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 540, display: 'block' }}>
                  {geom.items.map(({ sp, ring }) => {
                    if (!ring) return null
                    const isSel = editingSpaceId === sp.id
                    const cx = ring.reduce((a, p) => a + p.x, 0) / ring.length
                    const cy = ring.reduce((a, p) => a + p.y, 0) / ring.length
                    const fill = isSel ? 'rgba(182,148,98,0.35)' : sp.tipo === 'pared' ? 'rgba(96,165,250,0.16)' : 'rgba(52,211,153,0.14)'
                    const stroke = isSel ? '#b69462' : sp.tipo === 'pared' ? '#60a5fa' : '#34d399'
                    return (
                      <g key={sp.id} onClick={() => setEditingSpaceId((prev) => (prev === sp.id ? null : sp.id))} style={{ cursor: 'pointer' }}>
                        <polygon points={ring.map((p) => `${p.x},${p.y}`).join(' ')} fill={fill} stroke={stroke} strokeWidth={geom.span * 0.006} strokeLinejoin="round" />
                        <text x={cx} y={cy} fontSize={geom.span * 0.035} fill="#f4efe6" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none', fontWeight: 600 }}>{sp.nombre || 'Espacio'}</text>
                      </g>
                    )
                  })}
                </svg>
                {geom.items.some((i) => !i.ring) && (
                  <div className="flex-gap" style={{ flexWrap: 'wrap', padding: '10px 4px 4px', alignItems: 'center' }}>
                    <span className="small" style={{ color: 'rgba(255,255,255,0.5)' }}>Otras superficies:</span>
                    {geom.items.filter((i) => !i.ring).map(({ sp }) => (
                      <button type="button" key={sp.id} className={editingSpaceId === sp.id ? 'level-tab level-tab--active' : 'level-tab'} onClick={() => setEditingSpaceId((prev) => (prev === sp.id ? null : sp.id))}>
                        {sp.nombre || 'Espacio'} · {computeArea(sp).toFixed(2)} m²
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
            <div
              style={{ position: 'relative', width: 1600, height: 900, background: 'rgba(255,255,255,0.02)' }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Connection lines */}
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                {conexiones.map((c) => {
                  const a = espacios.find((s) => s.id === c.a)
                  const b = espacios.find((s) => s.id === c.b)
                  if (!a || !b) return null
                  return (
                    <line
                      key={c.id}
                      x1={a.x + 110}
                      y1={a.y + 70}
                      x2={b.x + 110}
                      y2={b.y + 70}
                      stroke="#b69462"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      opacity={0.6}
                    />
                  )
                })}
              </svg>

              {/* Space cards */}
              {espacios.map((sp) => {
                const area = computeArea(sp)
                const isSelected = selectedCardId === sp.id || editingSpaceId === sp.id
                return (
                  <div
                    key={sp.id}
                    tabIndex={0}
                    role="application"
                    aria-label={`Espacio ${sp.nombre || 'sin nombre'}`}
                    className={`space-card ${isSelected ? 'space-card--selected' : ''} ${connectMode ? 'space-card--connect' : ''}`}
                    style={{
                      left: sp.x,
                      top: sp.y,
                      zIndex: isSelected ? 3 : 2,
                      cursor: readOnly ? 'default' : undefined,
                    }}
                    onPointerDown={readOnly ? undefined : (e) => handlePointerDown(e, sp.id)}
                    onClick={readOnly ? undefined : () => handleCardClick(sp.id)}
                    onKeyDown={readOnly ? undefined : (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleCardClick(sp.id)
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{sp.nombre || 'Sin nombre'}</span>
                      <span
                        style={{
                          fontSize: 10,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: sp.tipo === 'pared' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                          color: sp.tipo === 'pared' ? '#60a5fa' : '#34d399',
                          fontWeight: 600,
                        }}
                      >
                        {sp.tipo}
                      </span>
                    </div>
                    <div className="small" style={{ marginBottom: 4 }}>
                      {sp.segmentos.length} tramo{sp.segmentos.length > 1 ? 's' : ''} · {area.toFixed(2)} m²
                    </div>
                    <div className="small" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                      {sp.segmentos.map((seg, segIdx) => (
                        <span key={`${seg.largo}-${seg.ancho}-${segIdx}`}>
                          {seg.largo.toFixed(2)}×{seg.ancho.toFixed(2)}m{segIdx < sp.segmentos.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                    {sp.materialId && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="small" style={{ color: '#b69462', fontSize: 11 }}>
                          🧱 {nombreConColor(getMaterial(sp.materialId)!)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            )}
          </div>
        </div>

        <aside className="ench-side">
          {/* Áreas del nivel */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Áreas de este nivel</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span className="small">Área de piso</span>
              <span style={{ fontWeight: 700, color: '#34d399', fontSize: 17 }}>{areaPisoNivel.toFixed(2)} m²</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="small">Área de pared</span>
              <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: 17 }}>{areaParedNivel.toFixed(2)} m²</span>
            </div>
          </div>

          {/* Editing panel */}
          {editingSpace ? (
            <div className="card" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>✏️ Editar espacio</h3>
                <button
                  type="button"
                  className="toolbar-btn--danger"
                  onClick={() => {
                    removeSpace(editingSpace.id)
                    setEditingSpaceId(null)
                    showNotification('Correcto', 'success', 'Espacio eliminado')
                  }}
                >
                  Eliminar
                </button>
              </div>
              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  marginBottom: 12,
                }}
              >
                <div>
                  <label className="small" htmlFor="esp-nombre">Nombre</label>
                  <input
                    id="esp-nombre"
                    className="input"
                    value={editingSpace.nombre}
                    onChange={(e) => updateSpace(editingSpace.id, { nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="esp-tipo">
                    Tipo
                  </label>
                  <div className="flex-gap">
                    {(['piso', 'pared'] as const).map((t) => {
                      const on = editingSpace.tipo === t
                      return (
                        <button
                          type="button"
                          key={t}
                          id={t === 'piso' ? 'esp-tipo' : undefined}
                          onClick={() => updateSpace(editingSpace.id, { tipo: t })}
                          className={`btn-tipo-toggle ${on ? 'active' : ''}`}
                          style={{
                            border: `1px solid ${on ? '#b69462' : 'rgba(255,255,255,0.12)'}`,
                            background: on ? 'rgba(182,148,98,0.2)' : 'transparent',
                            color: on ? '#b69462' : '#fff',
                          }}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <h4 className="small" style={{ marginTop: 16, marginBottom: 8, fontWeight: 700 }}>
                Dimensiones (metros)
              </h4>
              {editingSpace.segmentos.map((seg, idx) => (
                <div key={`seg-${seg.largo}-${seg.ancho}-${idx}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label className="small" htmlFor={`esp-largo-${idx}`}>Largo</label>
                    <input
                      id={`esp-largo-${idx}`}
                      className="input"
                      type="number"
                      step="0.01"
                      aria-label={`Largo del tramo ${idx + 1}`}
                      value={seg.largo}
                      onChange={(e) => updateSegmento(editingSpace.id, idx, 'largo', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="small" htmlFor={`esp-ancho-${idx}`}>Ancho/Alto</label>
                    <input
                      id={`esp-ancho-${idx}`}
                      className="input"
                      type="number"
                      step="0.01"
                      aria-label={`Ancho del tramo ${idx + 1}`}
                      value={seg.ancho}
                      onChange={(e) => updateSegmento(editingSpace.id, idx, 'ancho', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <button
                    type="button"
                    className="toolbar-btn--danger"
                    onClick={() => removeSegmento(editingSpace.id, idx)}
                    aria-label="Eliminar tramo"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              <button type="button" className="toolbar-btn--outline" onClick={() => addSegmento(editingSpace.id)}>
                + Agregar tramo (forma en L)
              </button>

              <button
                type="button"
                onClick={() => {
                  addAdjacentSpace(editingSpace.id, 'pared')
                  showNotification('Correcto', 'success', 'Superficie de pared agregada y conectada')
                }}
                className="btn-add-pared"
              >
                + Agregar superficie de pared (ej. ducha)
              </button>

              {conexiones.filter((c) => c.a === editingSpace.id || c.b === editingSpace.id).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <span className="small">Conexiones:</span>
                  <div className="flex-gap-sm" style={{ flexWrap: 'wrap', marginTop: 4 }}>
                    {conexiones
                      .filter((c) => c.a === editingSpace.id || c.b === editingSpace.id)
                      .map((c) => {
                        const otherId = c.a === editingSpace.id ? c.b : c.a
                        const other = espacios.find((s) => s.id === otherId)
                        return (
                          <span
                            key={c.id}
                            style={{
                              fontSize: 12,
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: 'rgba(255,255,255,0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            → {other?.nombre || 'Desconocido'}
                            <button
                              type="button"
                              onClick={() => removeConexion(c.id)}
                              style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: 12 }}
                              aria-label="Eliminar conexión"
                            >
                              ✕
                            </button>
                          </span>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ marginTop: 0, color: 'rgba(255,255,255,0.55)' }}>
              Selecciona un espacio en el lienzo para editar su tipo, tramos y dimensiones.
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
