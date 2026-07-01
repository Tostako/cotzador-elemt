import { useState, useRef, useCallback, useMemo } from 'react'
import { useEnchapes } from './hooks/useEnchapes'
import type { MaterialEnchape } from './types/enchapes'
import { TIPOS_ACABADO, ACABADOS_CONTINUOS, getPatron, nombreConColor } from './types/enchapes'
import { generarPlanoSVG, calcularPresupuesto } from './utils/calculations'
import { showNotification } from '../../shared/hooks/useNotifications'
import { BackButton } from '../../shared/components/BackButton';
import { Grid3x3 } from 'lucide-react';

function makeBlankMaterial(): MaterialEnchape {
  return {
    id: 'mat_' + Math.random().toString(36).slice(2, 9),
    nombre: '',
    tipoAcabado: TIPOS_ACABADO[0],
    categoria: 'Ambos',
    modoPrecio: 'm2',
    umbralSobranteCm: 10,
  }
}

export function EnchapesPage() {
  const enchapes = useEnchapes()
  const {
    proyecto, updateProyecto, niveles, nivelActivoId,
    addNivel, removeNivel, renameNivel, selectNivel,
    addSpace, removeSpace, updateSpace, updateSegmento, addSegmento, removeSegmento, addAdjacentSpace,
    conexiones, addConexion, removeConexion,
    selectedCardId, setSelectedCardId, updateSpacePosition,
    materiales, addMaterial, updateMaterial, removeMaterial,
    assignMaterial, assignPatron, updateAjuste, setOrientacion,
    bancoSobrantes, eliminarSobrante,
    fase, setFase,
    getNivelActivo, getMaterial, espacioCompleto, computeArea, calcularInstalacion, patronesParaEspacio,
    saveToBackend, isSaving, resetProject,
  } = enchapes

  const nivelActivo = getNivelActivo()
  const espacios = nivelActivo?.espacios || []

  // Áreas por tipo en el nivel activo (para el panel derecho)
  const areaPisoNivel = useMemo(
    () => espacios.filter((s) => s.tipo === 'piso').reduce((a, s) => a + computeArea(s), 0),
    [espacios, computeArea]
  )
  const areaParedNivel = useMemo(
    () => espacios.filter((s) => s.tipo === 'pared').reduce((a, s) => a + computeArea(s), 0),
    [espacios, computeArea]
  )

  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null)
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [connectMode, setConnectMode] = useState(false)
  const [previewSpaceId, setPreviewSpaceId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const didDrag = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const [matForm, setMatForm] = useState<MaterialEnchape>(makeBlankMaterial())
  const [exportingCatalogo, setExportingCatalogo] = useState(false)

  // ── Canvas drag ──
  const handlePointerDown = useCallback((e: React.PointerEvent, spaceId: string) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'SELECT' || target.isContentEditable) return
    const sp = espacios.find((s) => s.id === spaceId)
    if (!sp) return
    didDrag.current = false
    setDraggingId(spaceId)
    dragOffset.current = { x: e.clientX - sp.x, y: e.clientY - sp.y }
    target.setPointerCapture(e.pointerId)
  }, [espacios])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingId) return
    didDrag.current = true
    updateSpacePosition(draggingId, e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y)
  }, [draggingId, updateSpacePosition])

  const handlePointerUp = useCallback(() => {
    setDraggingId(null)
  }, [])

  const handleCardClick = useCallback((spaceId: string) => {
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
  }, [connectMode, selectedCardId, setSelectedCardId, addConexion])

  const editingSpace = useMemo(() => espacios.find((s) => s.id === editingSpaceId), [espacios, editingSpaceId])

  // ── Fase 4 budget ──
  const budget = useMemo(() => {
    if (fase !== 4) return null
    return calcularPresupuesto(niveles, materiales)
  }, [fase, niveles, materiales])

  // ── Helpers ──
  const handleSaveMaterial = useCallback(() => {
    if (!matForm.nombre.trim()) {
      showNotification('Atención', 'warning', 'El nombre del material es obligatorio')
      return
    }
    if (editingMaterialId) {
      updateMaterial(editingMaterialId, matForm)
      showNotification('Actualización correcta', 'success', 'Material actualizado')
    } else {
      addMaterial(matForm)
      showNotification('Correcto', 'success', 'Material agregado al catálogo')
    }
    setMatForm(makeBlankMaterial())
    setShowAddMaterial(false)
    setEditingMaterialId(null)
  }, [matForm, editingMaterialId, updateMaterial, addMaterial])

  const handleEditMaterial = useCallback((m: MaterialEnchape) => {
    setMatForm({ ...m })
    setEditingMaterialId(m.id)
    setShowAddMaterial(true)
  }, [])

  const handleDeleteMaterial = useCallback((id: string) => {
    removeMaterial(id)
    showNotification('Correcto', 'success', 'Material eliminado')
  }, [removeMaterial])

  const handleAssignMaterial = useCallback((spaceId: string, materialId: string) => {
    assignMaterial(spaceId, materialId || null)
    const mat = getMaterial(materialId)
    if (mat && ACABADOS_CONTINUOS.has(mat.tipoAcabado)) {
      assignPatron(spaceId, null)
    }
  }, [assignMaterial, getMaterial, assignPatron])

  // Guarda los materiales del catálogo de enchapes en la función "Materiales"
  // usando SOLO la API pública del catálogo (no modifica ese feature).
  const guardarEnMateriales = useCallback(async () => {
    if (materiales.length === 0) {
      showNotification('Atención', 'warning', 'No hay materiales para guardar')
      return
    }
    setExportingCatalogo(true)
    try {
      const { apiService, extractData } = await import('../../shared/services/api')

      // 1) Categoría destino: buscar "Enchapes" o crearla
      const norm = (s: any) => String(s ?? '').trim().toLowerCase()
      const findEnchapesCat = (list: any): string | undefined =>
        Array.isArray(list) ? list.find((c: any) => norm(c.name) === 'enchapes')?.id : undefined

      let catId = findEnchapesCat(extractData(await apiService.getCatalogCategories().catch(() => null)))
      if (!catId) {
        const created = extractData(
          await apiService.createCatalogCategory({ name: 'Enchapes', description: 'Materiales de la calculadora de enchapes' })
        )
        catId = created?.id ?? findEnchapesCat(extractData(await apiService.getCatalogCategories().catch(() => null)))
      }
      if (!catId) {
        showNotification('Error', 'error', 'No se pudo crear u obtener la categoría "Enchapes"')
        return
      }

      // 2) Cada material → producto + precio
      let ok = 0
      let fail = 0
      for (const m of materiales) {
        try {
          const partes: string[] = [m.tipoAcabado]
          if (m.formatoLargo && m.formatoAncho) {
            partes.push(`Formato ${m.formatoLargo}×${m.formatoAncho}${m.formatoGrosor ? `×${m.formatoGrosor}` : ''} cm`)
          }
          if (m.categoria) partes.push(`Uso: ${m.categoria}`)
          if (m.marca) partes.push(`Marca: ${m.marca}`)

          const prodRes = await apiService.createCatalogProduct({
            category_id: catId,
            name: nombreConColor(m),
            description: partes.join(' · '),
          })
          const prodId = extractData(prodRes)?.id

          const precioM2 = m.modoPrecio === 'm2'
            ? (m.precioM2 || 0)
            : (m.m2caja ? Math.round((m.precioCaja || 0) / m.m2caja) : (m.precioCaja || 0))

          if (prodId && precioM2 > 0) {
            await apiService.addCatalogPrice(prodId, {
              hardware_store: (m.marca || '').trim() || 'Enchapes',
              brand: (m.marca || '').trim() || m.tipoAcabado,
              price: precioM2,
              notes: 'Importado de Enchapes' + (m.modoPrecio === 'caja' ? ' (precio por caja → m²)' : ''),
            })
          }
          ok++
        } catch {
          fail++
        }
      }

      showNotification(
        fail ? 'Parcial' : 'Correcto',
        fail ? 'warning' : 'success',
        `${ok} material(es) guardado(s) en Materiales${fail ? `, ${fail} con error` : ''}`
      )
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo guardar en Materiales')
    } finally {
      setExportingCatalogo(false)
    }
  }, [materiales])

  const formatCurrency = (n: number) => {
    return '$' + Math.round(n).toLocaleString('es-CO')
  }

  // ── Phase tabs ──
  const phaseLabels = ['1. Recolección', '2. Resumen', '3. Materiales', '4. Presupuesto']

  return (
    <main>
      <BackButton />
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}><Grid3x3 size={28} color="#b69462" /> Calculadora de Enchapes</h1>
      <p className="small">Calcula materiales, desperdicio y presupuesto para pisos y paredes</p>

      {/* Project info */}
      <div className="card mt-2" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Proyecto</label>
          <input className="input" value={proyecto.nombre} onChange={(e) => updateProyecto('nombre', e.target.value)} placeholder="Nombre del proyecto" />
        </div>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Propietario</label>
          <input className="input" value={proyecto.propietario} onChange={(e) => updateProyecto('propietario', e.target.value)} placeholder="Propietario" />
        </div>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Ubicación</label>
          <input className="input" value={proyecto.ubicacion} onChange={(e) => updateProyecto('ubicacion', e.target.value)} placeholder="Ubicación" />
        </div>
      </div>

      {/* Phase navigator */}
      <div style={{ display: 'flex', gap: 8, marginTop: 24, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {phaseLabels.map((label, idx) => {
          const phase = idx + 1
          const active = fase === phase
          return (
            <button
              key={phase}
              onClick={() => setFase(phase)}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                background: active ? '#b69462' : 'rgba(255,255,255,0.06)',
                color: active ? '#111' : '#fff',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          )
        })}
        <button
          onClick={saveToBackend}
          disabled={isSaving}
          style={{
            marginLeft: 'auto',
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 13,
            background: isSaving ? 'rgba(182,148,98,0.3)' : '#b69462',
            color: '#111',
            opacity: isSaving ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          {isSaving ? '💾 Guardando...' : '💾 Guardar proyecto'}
        </button>
        <button
          onClick={resetProject}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
            background: 'transparent',
            color: '#ff3b30',
          }}
        >
          🗑️ Reiniciar proyecto
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════
          FASE 1 — RECOLECCIÓN
      ═══════════════════════════════════════════════════ */}
      {fase === 1 && (
        <div>
          {/* Nivel tabs */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              <span className="small" style={{ fontWeight: 700 }}>Niveles:</span>
              {niveles.map((n) => (
                <button
                  key={n.id}
                  onClick={() => selectNivel(n.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: n.id === nivelActivoId ? 'rgba(182,148,98,0.2)' : 'rgba(255,255,255,0.03)',
                    color: n.id === nivelActivoId ? '#b69462' : '#fff',
                    cursor: 'pointer',
                    fontWeight: n.id === nivelActivoId ? 700 : 400,
                  }}
                >
                  {n.nombre}
                </button>
              ))}
              <button
                onClick={addNivel}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px dashed rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: '#b69462',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + Nivel
              </button>
            </div>
            {nivelActivo && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="input"
                  style={{ maxWidth: 200 }}
                  value={nivelActivo.nombre}
                  onChange={(e) => renameNivel(nivelActivo.id, e.target.value)}
                  placeholder="Nombre del nivel"
                />
                {niveles.length > 1 && (
                  <button
                    onClick={() => {
                      removeNivel(nivelActivo.id)
                      showNotification('Correcto', 'success', 'Nivel eliminado')
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,59,48,0.3)',
                      background: 'rgba(255,59,48,0.1)',
                      color: '#ff3b30',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Eliminar nivel
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Canvas toolbar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button
              className="btn"
              onClick={() => addSpace('piso')}
              style={{ padding: '10px 16px', borderRadius: 8, background: '#b69462', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              + Espacio (piso)
            </button>
            <button
              className="btn"
              onClick={() => addSpace('pared')}
              style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontWeight: 600 }}
            >
              + Pared
            </button>
            <button
              className="btn"
              onClick={() => {
                setConnectMode((v) => {
                  const next = !v
                  if (next) setSelectedCardId(null)
                  else setSelectedCardId(null)
                  return next
                })
              }}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                background: connectMode ? 'rgba(182,148,98,0.2)' : 'rgba(255,255,255,0.08)',
                color: connectMode ? '#b69462' : '#fff',
                border: `1px solid ${connectMode ? '#b69462' : 'rgba(255,255,255,0.1)'}`,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {connectMode ? '🔗 Modo conexión (selecciona 2)' : '🔗 Conectar espacios'}
            </button>
            {selectedCardId && !connectMode && (
              <button
                className="btn"
                onClick={() => addAdjacentSpace(selectedCardId, 'piso')}
                style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontWeight: 600 }}
              >
                + Adjacente al seleccionado
              </button>
            )}
          </div>

          <div className="ench-grid">
          <div className="ench-canvas">
          {/* Canvas */}
          <div style={{ overflow: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div
              style={{ position: 'relative', width: 1600, height: 900, background: 'rgba(255,255,255,0.02)' }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Connection lines */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
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
                    style={{
                      position: 'absolute',
                      left: sp.x,
                      top: sp.y,
                      width: 220,
                      padding: 12,
                      background: isSelected ? 'rgba(182,148,98,0.18)' : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${isSelected ? '#b69462' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 10,
                      boxShadow: isSelected ? '0 0 0 3px rgba(182,148,98,0.25), 0 10px 28px rgba(182,148,98,0.20)' : 'none',
                      cursor: connectMode ? 'crosshair' : 'grab',
                      zIndex: isSelected ? 3 : 2,
                      userSelect: 'none',
                      transition: 'box-shadow 0.2s, border-color 0.2s, background 0.2s',
                    }}
                    onPointerDown={(e) => handlePointerDown(e, sp.id)}
                    onClick={() => handleCardClick(sp.id)}
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
                      {sp.segmentos.map((seg, i) => (
                        <span key={i}>{seg.largo.toFixed(2)}×{seg.ancho.toFixed(2)}m{i < sp.segmentos.length - 1 ? ', ' : ''}</span>
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
          </div>

          </div>{/* /ench-canvas */}

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
                  onClick={() => {
                    removeSpace(editingSpace.id)
                    setEditingSpaceId(null)
                    showNotification('Correcto', 'success', 'Espacio eliminado')
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,59,48,0.3)',
                    background: 'rgba(255,59,48,0.1)',
                    color: '#ff3b30',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Eliminar
                </button>
              </div>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 12 }}>
                <div>
                  <label className="small">Nombre</label>
                  <input
                    className="input"
                    value={editingSpace.nombre}
                    onChange={(e) => updateSpace(editingSpace.id, { nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>Tipo</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['piso', 'pared'] as const).map((t) => {
                      const on = editingSpace.tipo === t
                      return (
                        <button
                          key={t}
                          onClick={() => updateSpace(editingSpace.id, { tipo: t })}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            fontSize: 13,
                            border: `1px solid ${on ? '#b69462' : 'rgba(255,255,255,0.12)'}`,
                            background: on ? 'rgba(182,148,98,0.2)' : 'transparent',
                            color: on ? '#b69462' : '#fff',
                            transition: 'all 0.2s',
                          }}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <h4 className="small" style={{ marginTop: 16, marginBottom: 8, fontWeight: 700 }}>Dimensiones (metros)</h4>
              {editingSpace.segmentos.map((seg, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label className="small">Largo</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={seg.largo}
                      onChange={(e) => updateSegmento(editingSpace.id, idx, 'largo', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="small">Ancho/Alto</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={seg.ancho}
                      onChange={(e) => updateSegmento(editingSpace.id, idx, 'ancho', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <button
                    onClick={() => removeSegmento(editingSpace.id, idx)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid rgba(255,59,48,0.3)',
                      background: 'rgba(255,59,48,0.1)',
                      color: '#ff3b30',
                      cursor: 'pointer',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
              <button
                onClick={() => addSegmento(editingSpace.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px dashed rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: '#b69462',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                + Agregar tramo (forma en L)
              </button>

              <button
                onClick={() => {
                  addAdjacentSpace(editingSpace.id, 'pared')
                  showNotification('Correcto', 'success', 'Superficie de pared agregada y conectada')
                }}
                style={{
                  display: 'block',
                  marginTop: 10,
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px dashed rgba(96,165,250,0.4)',
                  background: 'transparent',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                + Agregar superficie de pared (ej. ducha)
              </button>

              {conexiones.filter((c) => c.a === editingSpace.id || c.b === editingSpace.id).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <span className="small">Conexiones:</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
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
                              onClick={() => removeConexion(c.id)}
                              style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: 12 }}
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
          </div>{/* /ench-grid */}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          FASE 2 — RESUMEN
      ═══════════════════════════════════════════════════ */}
      {fase === 2 && (
        <div>
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>📊 Resumen de áreas</h3>
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
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{computeArea(sp).toFixed(2)}</td>
                              <td style={{ padding: '10px 8px', color: mat ? '#b69462' : 'rgba(255,255,255,0.4)' }}>
                                {mat ? nombreConColor(mat) : '—'}
                              </td>
                            </tr>
                          )
                        })}
                        <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                          <td colSpan={3} style={{ padding: '10px 8px', fontWeight: 700 }}>Total {nivel.nombre}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#b69462' }}>{totalNivel.toFixed(2)} m²</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
            <div style={{ borderTop: '2px solid #b69462', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700 }}>
              <span>Total proyecto</span>
              <span style={{ color: '#b69462' }}>
                {niveles.reduce((sum, n) => sum + n.espacios.reduce((s, sp) => s + computeArea(sp), 0), 0).toFixed(2)} m²
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          FASE 3 — MATERIALES
      ═══════════════════════════════════════════════════ */}
      {fase === 3 && (
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
          {/* Material catalog */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>📦 Catálogo de materiales</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={guardarEnMateriales}
                  disabled={exportingCatalogo || materiales.length === 0}
                  title="Guardar estos materiales en la sección Materiales"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(182,148,98,0.4)',
                    background: 'transparent',
                    color: '#b69462',
                    cursor: exportingCatalogo || materiales.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                    opacity: exportingCatalogo || materiales.length === 0 ? 0.5 : 1,
                  }}
                >
                  {exportingCatalogo ? 'Guardando…' : '💾 Guardar en Materiales'}
                </button>
                <button
                  onClick={() => {
                    setShowAddMaterial((v) => !v)
                    if (showAddMaterial) {
                      setMatForm(makeBlankMaterial())
                      setEditingMaterialId(null)
                    }
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#b69462',
                    color: '#111',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {showAddMaterial ? 'Cancelar' : '+ Material'}
                </button>
              </div>
            </div>

            {showAddMaterial && (
              <div style={{ marginBottom: 16, padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ marginTop: 0, marginBottom: 12 }}>{editingMaterialId ? 'Editar material' : 'Nuevo material'}</h4>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                  <div>
                    <label className="small">Nombre</label>
                    <input className="input" value={matForm.nombre} onChange={(e) => setMatForm((m) => ({ ...m, nombre: e.target.value }))} />
                  </div>
                  <div>
                    <label className="small">Tipo de acabado</label>
                    <select className="input" value={matForm.tipoAcabado} onChange={(e) => setMatForm((m) => ({ ...m, tipoAcabado: e.target.value }))}>
                      {TIPOS_ACABADO.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="small">Formato largo (cm)</label>
                    <input className="input" type="number" value={matForm.formatoLargo || ''} onChange={(e) => setMatForm((m) => ({ ...m, formatoLargo: parseFloat(e.target.value) || undefined }))} />
                  </div>
                  <div>
                    <label className="small">Formato ancho (cm)</label>
                    <input className="input" type="number" value={matForm.formatoAncho || ''} onChange={(e) => setMatForm((m) => ({ ...m, formatoAncho: parseFloat(e.target.value) || undefined }))} />
                  </div>
                  <div>
                    <label className="small">Grosor (mm)</label>
                    <input className="input" type="number" value={matForm.formatoGrosor || ''} onChange={(e) => setMatForm((m) => ({ ...m, formatoGrosor: parseFloat(e.target.value) || undefined }))} />
                  </div>
                  <div>
                    <label className="small">Color</label>
                    <input className="input" value={matForm.color || ''} onChange={(e) => setMatForm((m) => ({ ...m, color: e.target.value }))} />
                  </div>
                  <div>
                    <label className="small">Marca</label>
                    <input className="input" value={matForm.marca || ''} onChange={(e) => setMatForm((m) => ({ ...m, marca: e.target.value }))} />
                  </div>
                  <div>
                    <label className="small">Categoría</label>
                    <select className="input" value={matForm.categoria} onChange={(e) => setMatForm((m) => ({ ...m, categoria: e.target.value as MaterialEnchape['categoria'] }))}>
                      <option value="Ambos">Ambos</option>
                      <option value="Piso">Piso</option>
                      <option value="Pared">Pared</option>
                    </select>
                  </div>
                  <div>
                    <label className="small">m² por caja</label>
                    <input className="input" type="number" step="0.01" value={matForm.m2caja || ''} onChange={(e) => setMatForm((m) => ({ ...m, m2caja: parseFloat(e.target.value) || undefined }))} />
                  </div>
                  <div>
                    <label className="small">Peso caja (kg)</label>
                    <input className="input" type="number" step="0.1" value={matForm.pesoCaja || ''} onChange={(e) => setMatForm((m) => ({ ...m, pesoCaja: parseFloat(e.target.value) || undefined }))} />
                  </div>
                  <div>
                    <label className="small">Modo precio</label>
                    <select className="input" value={matForm.modoPrecio} onChange={(e) => setMatForm((m) => ({ ...m, modoPrecio: e.target.value as 'm2' | 'caja' }))}>
                      <option value="m2">Por m²</option>
                      <option value="caja">Por caja</option>
                    </select>
                  </div>
                  {matForm.modoPrecio === 'm2' ? (
                    <div>
                      <label className="small">Precio m²</label>
                      <input className="input" type="number" value={matForm.precioM2 || ''} onChange={(e) => setMatForm((m) => ({ ...m, precioM2: parseFloat(e.target.value) || undefined }))} />
                    </div>
                  ) : (
                    <div>
                      <label className="small">Precio caja</label>
                      <input className="input" type="number" value={matForm.precioCaja || ''} onChange={(e) => setMatForm((m) => ({ ...m, precioCaja: parseFloat(e.target.value) || undefined }))} />
                    </div>
                  )}
                  <div>
                    <label className="small">Umbral sobrante (cm)</label>
                    <input className="input" type="number" value={matForm.umbralSobranteCm || ''} onChange={(e) => setMatForm((m) => ({ ...m, umbralSobranteCm: parseFloat(e.target.value) || undefined }))} />
                  </div>
                </div>
                <button
                  onClick={handleSaveMaterial}
                  style={{
                    marginTop: 12,
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#b69462',
                    color: '#111',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {editingMaterialId ? 'Guardar cambios' : 'Agregar material'}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {materiales.length === 0 && (
                <p className="small" style={{ color: 'rgba(255,255,255,0.4)' }}>No hay materiales en el catálogo. Agrega uno para empezar.</p>
              )}
              {materiales.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{nombreConColor(m)}</div>
                    <div className="small" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {m.tipoAcabado} · {m.formatoLargo && m.formatoAncho ? `${m.formatoLargo}×${m.formatoAncho}cm` : 'Sin formato'}
                      {' · '}
                      {m.modoPrecio === 'm2' ? `$${m.precioM2}/m²` : `$${m.precioCaja}/caja`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleEditMaterial(m)}
                      style={{ background: 'none', border: 'none', color: '#b69462', cursor: 'pointer', fontSize: 13 }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteMaterial(m.id)}
                      style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: 13 }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Space assignment */}
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>🎯 Asignación por espacio</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {niveles.flatMap((n) => n.espacios).length === 0 && (
                <p className="small" style={{ color: 'rgba(255,255,255,0.4)' }}>No hay espacios. Ve a Fase 1 para crearlos.</p>
              )}
              {niveles.flatMap((n) => n.espacios.map((sp) => ({ ...sp, nivelNombre: n.nombre }))).map((sp) => {
                const mat = sp.materialId ? getMaterial(sp.materialId) : null
                const patrones = mat ? patronesParaEspacio(sp) : []
                const calc = mat && sp.patronId ? calcularInstalacion(sp) : null
                const completo = espacioCompleto(sp)
                return (
                  <div
                    key={sp.id}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: completo ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${completo ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{sp.nombre || 'Sin nombre'}</span>
                        <span className="small" style={{ marginLeft: 8, color: 'rgba(255,255,255,0.4)' }}>
                          {sp.nivelNombre} · {computeArea(sp).toFixed(2)} m² · {sp.tipo}
                        </span>
                      </div>
                      {completo && <span style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>✓ Listo</span>}
                    </div>

                    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                      <div>
                        <label className="small">Material</label>
                        <select
                          className="input"
                          value={sp.materialId || ''}
                          onChange={(e) => handleAssignMaterial(sp.id, e.target.value)}
                        >
                          <option value="">— Sin asignar —</option>
                          {materiales
                            .filter((m) => m.categoria === 'Ambos' || m.categoria === (sp.tipo === 'piso' ? 'Piso' : 'Pared'))
                            .map((m) => (
                              <option key={m.id} value={m.id}>{nombreConColor(m)}</option>
                            ))}
                        </select>
                      </div>

                      {mat && !ACABADOS_CONTINUOS.has(mat.tipoAcabado) && (
                        <div>
                          <label className="small">Patrón</label>
                          <select
                            className="input"
                            value={sp.patronId || ''}
                            onChange={(e) => assignPatron(sp.id, e.target.value || null)}
                          >
                            <option value="">— Seleccionar —</option>
                            {patrones.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre} {p.real ? `(~${p.desperdicioEstimado}%)` : `(${getPatron(p.id)?.desperdicio}%)`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {mat && !ACABADOS_CONTINUOS.has(mat.tipoAcabado) && sp.patronId && (
                        <div>
                          <label className="small">Orientación</label>
                          <select
                            className="input"
                            value={sp.orientacionManual || ''}
                            onChange={(e) => {
                              const val = e.target.value as 'largo' | 'ancho' | ''
                              setOrientacion(sp.id, val === '' ? null : val)
                            }}
                          >
                            <option value="">Automática</option>
                            <option value="largo">Lado mayor</option>
                            <option value="ancho">Lado menor</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="small">Ajuste desperdicio (%)</label>
                        <input
                          className="input"
                          type="number"
                          step="0.5"
                          value={sp.ajusteDesperdicio}
                          onChange={(e) => updateAjuste(sp.id, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    {calc && calc.exacto && (
                      <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.02)', fontSize: 13 }}>
                        <span className="small">
                          Área necesaria: <strong>{calc.areaNecesaria.toFixed(2)} m²</strong> · Comprar: <strong>{calc.areaComprada.toFixed(2)} m²</strong> · Desperdicio: <strong>{calc.desperdicioPct.toFixed(1)}%</strong>
                          {calc.piezas != null && ` · Piezas: ${calc.piezas}`}
                          {calc.orientacion && ` · ${calc.orientacion}`}
                        </span>
                      </div>
                    )}

                    {/* Preview button */}
                    {mat && sp.patronId && mat.formatoLargo && mat.formatoAncho && (
                      <button
                        onClick={() => setPreviewSpaceId((prev) => (prev === sp.id ? null : sp.id))}
                        style={{
                          marginTop: 10,
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid rgba(182,148,98,0.3)',
                          background: 'rgba(182,148,98,0.08)',
                          color: '#b69462',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {previewSpaceId === sp.id ? 'Ocultar plano' : '👁️ Ver plano'}
                      </button>
                    )}

                    {/* SVG Preview */}
                    {previewSpaceId === sp.id && mat && sp.patronId && mat.formatoLargo && mat.formatoAncho && (
                      <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {(() => {
                          const principal = sp.segmentos.reduce((max, seg) => {
                            const area = seg.largo * seg.ancho
                            return area > max.area ? { seg, area } : max
                          }, { seg: sp.segmentos[0], area: 0 })
                          const { svgHtml, nota } = generarPlanoSVG(
                            principal.seg.largo,
                            principal.seg.ancho,
                            mat.formatoLargo! / 100,
                            mat.formatoAncho! / 100,
                            sp.patronId
                          )
                          return (
                            <div>
                              <div dangerouslySetInnerHTML={{ __html: svgHtml }} />
                              {nota && (
                                <p className="small" style={{ padding: '8px 12px', margin: 0, background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.5)' }}>
                                  {nota}
                                </p>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          FASE 4 — PRESUPUESTO
      ═══════════════════════════════════════════════════ */}
      {fase === 4 && budget && (
        <div>
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>💰 Presupuesto</h3>
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
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{typeof linea.cajas === 'number' ? linea.cajas : '—'}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{linea.peso > 0 ? Number(linea.peso).toFixed(1) : '—'}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{linea.costo > 0 ? formatCurrency(linea.costo) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals by material */}
            {Object.values(budget.porMaterial).length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ marginBottom: 12 }}>Totales por material</h4>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                  {Object.values(budget.porMaterial).map((tot) => (
                    <div
                      key={tot.nombre}
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
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
            <div
              style={{
                marginTop: 24,
                padding: 20,
                borderRadius: 12,
                background: 'rgba(182,148,98,0.1)',
                border: '1px solid rgba(182,148,98,0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
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
      )}

      {/* Banco de sobrantes (visible en Fase 3 y 4) */}
      {(fase === 3 || fase === 4) && bancoSobrantes.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>♻️ Banco de sobrantes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bancoSobrantes.map((sob) => (
              <div
                key={sob.id}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span className="small">
                  {sob.materialNombre} · {sob.ancho.toFixed(2)}×{sob.alto.toFixed(2)}m · {sob.cantidad} pieza{sob.cantidad > 1 ? 's' : ''}
                  {' · '}{sob.origen}
                </span>
                <button
                  onClick={() => eliminarSobrante(sob.id)}
                  style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: 12 }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
