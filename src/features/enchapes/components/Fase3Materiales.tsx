import { useState, useCallback, useMemo } from 'react'
import { Save, Package, Target, Eye } from 'lucide-react'
import type { Nivel, Espacio, MaterialEnchape, ResultadoCalculo } from '../types/enchapes'
import { TIPOS_ACABADO, ACABADOS_CONTINUOS, getPatron, nombreConColor } from '../types/enchapes'
import type { PatronOpcion } from '../utils/calculations'
import { generarPlanoSVG } from '../utils/calculations'
import { showNotification } from '../../../shared/hooks/useNotifications'
import { MaterialForm } from './MaterialForm'

// Biblioteca de materiales de enchape reutilizable entre proyectos (navegador).
const LIB_KEY = 'enchapes_materiales_lib_v1'
function loadLib(): MaterialEnchape[] {
  try {
    const raw = localStorage.getItem(LIB_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch { /* ignore */ }
  return []
}

interface Fase3MaterialesProps {
  niveles: Nivel[]
  materiales: MaterialEnchape[]
  getMaterial: (id: string) => MaterialEnchape | undefined
  computeArea: (sp: Espacio) => number
  espacioCompleto: (sp: Espacio) => boolean
  calcularInstalacion: (sp: Espacio) => ResultadoCalculo
  patronesParaEspacio: (sp: Espacio) => PatronOpcion[]
  assignMaterial: (spaceId: string, materialId: string | null) => void
  assignPatron: (spaceId: string, patronId: string | null) => void
  updateAjuste: (spaceId: string, val: number) => void
  setOrientacion: (spaceId: string, val: 'largo' | 'ancho' | null) => void
  addMaterial: (mat: MaterialEnchape) => void
  updateMaterial: (id: string, updates: Partial<MaterialEnchape>) => void
  removeMaterial: (id: string) => void
}

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

export function Fase3Materiales({
  niveles,
  materiales,
  getMaterial,
  computeArea,
  espacioCompleto,
  calcularInstalacion,
  patronesParaEspacio,
  assignMaterial,
  assignPatron,
  updateAjuste,
  setOrientacion,
  addMaterial,
  updateMaterial,
  removeMaterial,
}: Fase3MaterialesProps) {
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null)
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [matForm, setMatForm] = useState<MaterialEnchape>(makeBlankMaterial())
  const [exportingCatalogo, setExportingCatalogo] = useState(false)
  const [previewSpaceId, setPreviewSpaceId] = useState<string | null>(null)
  const [lib, setLib] = useState<MaterialEnchape[]>(() => loadLib())

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

  const handleDeleteMaterial = useCallback(
    (id: string) => {
      removeMaterial(id)
      showNotification('Correcto', 'success', 'Material eliminado')
    },
    [removeMaterial]
  )

  const handleAssignMaterial = useCallback(
    (spaceId: string, materialId: string) => {
      assignMaterial(spaceId, materialId || null)
      const mat = getMaterial(materialId)
      if (mat && ACABADOS_CONTINUOS.has(mat.tipoAcabado)) {
        assignPatron(spaceId, null)
      }
    },
    [assignMaterial, getMaterial, assignPatron]
  )

  const guardarEnMateriales = useCallback(async () => {
    if (materiales.length === 0) {
      showNotification('Atención', 'warning', 'No hay materiales para guardar')
      return
    }
    setExportingCatalogo(true)
    try {
      const { apiService, extractData } = await import('../../../shared/services/api')

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

      let ok = 0
      let fail = 0
      for (const m of materiales) {
        try {
          const partes: string[] = [m.tipoAcabado]
          if (m.formatoLargo && m.formatoAncho) {
            partes.push(
              `Formato ${m.formatoLargo}×${m.formatoAncho}${m.formatoGrosor ? `×${m.formatoGrosor}` : ''} cm`
            )
          }
          if (m.categoria) partes.push(`Uso: ${m.categoria}`)
          if (m.marca) partes.push(`Marca: ${m.marca}`)

          const prodRes = await apiService.createCatalogProduct({
            category_id: catId,
            name: nombreConColor(m),
            description: partes.join(' · '),
          })
          const prodId = extractData(prodRes)?.id

          const precioM2 =
            m.modoPrecio === 'm2'
              ? m.precioM2 || 0
              : m.m2caja
                ? Math.round((m.precioCaja || 0) / m.m2caja)
                : m.precioCaja || 0

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

      // Guarda también en la biblioteca local (reutilizable en otros proyectos).
      try {
        const existing = loadLib()
        const byName = new Map(existing.map((m) => [nombreConColor(m).toLowerCase(), m]))
        for (const m of materiales) byName.set(nombreConColor(m).toLowerCase(), m)
        const merged = Array.from(byName.values())
        localStorage.setItem(LIB_KEY, JSON.stringify(merged))
        setLib(merged)
      } catch { /* ignore */ }

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

  const allSpaces = useMemo(
    () => niveles.flatMap((n) => n.espacios.map((sp) => ({ ...sp, nivelNombre: n.nombre }))),
    [niveles]
  )

  return (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
      {/* Material catalog */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <h3 className="section-title" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Package size={18} /> Catálogo de materiales
          </h3>
          <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
            {lib.length > 0 && (
              <select
                className="input"
                value=""
                onChange={(e) => {
                  const m = lib.find((x) => x.id === e.target.value)
                  if (m) {
                    addMaterial({ ...m, id: 'mat_' + Math.random().toString(36).slice(2, 9) })
                    showNotification('Correcto', 'success', 'Material cargado desde tus guardados')
                  }
                }}
                style={{ maxWidth: 210 }}
                title="Cargar un material guardado"
              >
                <option value="">+ Desde guardados…</option>
                {lib.map((m) => (
                  <option key={m.id} value={m.id}>{nombreConColor(m)}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={guardarEnMateriales}
              disabled={exportingCatalogo || materiales.length === 0}
              title="Guardar estos materiales en la sección Materiales y en tus guardados"
              className="btn-export-catalogo"
              style={{ cursor: exportingCatalogo || materiales.length === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Save size={15} /> {exportingCatalogo ? 'Guardando…' : 'Guardar en Materiales'}
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => {
                setShowAddMaterial((v) => !v)
                if (showAddMaterial) {
                  setMatForm(makeBlankMaterial())
                  setEditingMaterialId(null)
                }
              }}
            >
              {showAddMaterial ? 'Cancelar' : '+ Material'}
            </button>
          </div>
        </div>

        {showAddMaterial && (
          <MaterialForm
            matForm={matForm}
            setMatForm={setMatForm}
            editingMaterialId={editingMaterialId}
            onSave={handleSaveMaterial}
          />
        )}

        <div className="flex-gap" style={{ flexDirection: 'column' }}>
          {materiales.length === 0 && (
            <p className="small" style={{ color: 'rgba(255,255,255,0.4)' }}>
              No hay materiales en el catálogo. Agrega uno para empezar.
            </p>
          )}
          {materiales.map((m) => (
            <div key={m.id} className="material-card">
              <div>
                <div style={{ fontWeight: 600 }}>{nombreConColor(m)}</div>
                <div className="small" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {m.tipoAcabado} ·{' '}
                  {m.formatoLargo && m.formatoAncho ? `${m.formatoLargo}×${m.formatoAncho}cm` : 'Sin formato'}
                  {' · '}
                  {m.modoPrecio === 'm2' ? `$${m.precioM2}/m²` : `$${m.precioCaja}/caja`}
                </div>
              </div>
              <div className="flex-gap-sm">
                <button
                  type="button"
                  onClick={() => handleEditMaterial(m)}
                  style={{ background: 'none', border: 'none', color: '#b69462', cursor: 'pointer', fontSize: 13 }}
                >
                  Editar
                </button>
                <button
                  type="button"
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
        <h3 className="section-title" style={{ marginTop: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Target size={18} /> Asignación por espacio
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {allSpaces.length === 0 && (
            <p className="small" style={{ color: 'rgba(255,255,255,0.4)' }}>
              No hay espacios. Ve a Fase 1 para crearlos.
            </p>
          )}
          {allSpaces.map((sp) => {
            const mat = sp.materialId ? getMaterial(sp.materialId) : null
            const patrones = mat ? patronesParaEspacio(sp) : []
            const calc = mat && sp.patronId ? calcularInstalacion(sp) : null
            const completo = espacioCompleto(sp)
            return (
              <div
                key={sp.id}
                className={`assignment-card ${completo ? 'assignment-card--complete' : ''}`}
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
                    <label className="small" htmlFor="asig-material">Material</label>
                    <select
                      id="asig-material"
                      className="input"
                      value={sp.materialId || ''}
                      onChange={(e) => handleAssignMaterial(sp.id, e.target.value)}
                    >
                      <option value="">— Sin asignar —</option>
                      {materiales
                        .filter((m) => m.categoria === 'Ambos' || m.categoria === (sp.tipo === 'piso' ? 'Piso' : 'Pared'))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {nombreConColor(m)}
                          </option>
                        ))}
                    </select>
                  </div>

                  {mat && !ACABADOS_CONTINUOS.has(mat.tipoAcabado) && (
                    <div>
                      <label className="small" htmlFor="asig-patron">Patrón</label>
                      <select
                        id="asig-patron"
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
                      <label className="small" htmlFor="asig-orientacion">Orientación</label>
                      <select
                        id="asig-orientacion"
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
                    <label className="small" htmlFor="asig-ajuste">Ajuste desperdicio (%)</label>
                    <input
                      id="asig-ajuste"
                      className="input"
                      type="number"
                      step="0.5"
                      value={sp.ajusteDesperdicio}
                      onChange={(e) => updateAjuste(sp.id, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {calc && calc.exacto && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      fontSize: 13,
                    }}
                  >
                    <span className="small">
                      Área necesaria: <strong>{calc.areaNecesaria.toFixed(2)} m²</strong> · Comprar:{' '}
                      <strong>{calc.areaComprada.toFixed(2)} m²</strong> · Desperdicio:{' '}
                      <strong>{calc.desperdicioPct.toFixed(1)}%</strong>
                      {calc.piezas != null && ` · Piezas: ${calc.piezas}`}
                      {calc.orientacion && ` · ${calc.orientacion}`}
                    </span>
                  </div>
                )}

                {mat && sp.patronId && mat.formatoLargo && mat.formatoAncho && (
                  <button
                    type="button"
                    className="preview-btn"
                    onClick={() => setPreviewSpaceId((prev) => (prev === sp.id ? null : sp.id))}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Eye size={14} /> {previewSpaceId === sp.id ? 'Ocultar plano' : 'Ver plano'}
                  </button>
                )}

                {previewSpaceId === sp.id && mat && sp.patronId && mat.formatoLargo && mat.formatoAncho && (
                  <div
                    style={{
                      marginTop: 10,
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {(() => {
                      const principal = sp.segmentos.reduce(
                        (max, seg) => {
                          const area = seg.largo * seg.ancho
                          return area > max.area ? { seg, area } : max
                        },
                        { seg: sp.segmentos[0], area: 0 }
                      )
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
                            <p
                              className="small"
                              style={{
                                padding: '8px 12px',
                                margin: 0,
                                background: 'rgba(255,255,255,0.02)',
                                color: 'rgba(255,255,255,0.5)',
                              }}
                            >
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
  )
}
