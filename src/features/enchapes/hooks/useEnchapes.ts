import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  EnchapeProject,
  Nivel,
  Espacio,
  MaterialEnchape,
  Sobrante,
  Segmento,
  Conexion,
} from '../types/enchapes'
import { ACABADOS_CONTINUOS } from '../types/enchapes'
import { computeArea, calcularInstalacion, calcularSobrantesEspacio, patronesParaMaterial } from '../utils/calculations'
import { showNotification } from '../../../shared/hooks/useNotifications'
import { apiService } from '../../../shared/services/api'

const STORAGE_KEY = 'element_enchapes_project'

function uid(prefix: string): string {
  return prefix + '_' + Math.random().toString(36).slice(2, 9)
}

function createDefaultProject(): EnchapeProject {
  const nivId = uid('niv')
  return {
    id: uid('proj'),
    nombre: '',
    propietario: '',
    ubicacion: '',
    niveles: [
      {
        id: nivId,
        nombre: 'Piso 1',
        espacios: [],
        conexiones: [],
      },
    ],
    materiales: [],
    bancoSobrantes: [],
  }
}

function toSnakeProject(p: EnchapeProject) {
  return {
    id: p.id,
    nombre: p.nombre,
    propietario: p.propietario,
    ubicacion: p.ubicacion,
    niveles: p.niveles.map((n) => ({
      id: n.id,
      nombre: n.nombre,
      espacios: n.espacios.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        tipo: e.tipo,
        segmentos: e.segmentos.map((s) => ({ largo: s.largo, ancho: s.ancho })),
        x: e.x,
        y: e.y,
        material_id: e.materialId,
        patron_id: e.patronId,
        ajuste_desperdicio: e.ajusteDesperdicio,
        orientacion_manual: e.orientacionManual,
        filtro_tipo_acabado: e.filtroTipoAcabado,
      })),
      conexiones: n.conexiones.map((c) => ({ id: c.id, a: c.a, b: c.b })),
    })),
    materiales: p.materiales.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      tipo_acabado: m.tipoAcabado,
      formato_largo: m.formatoLargo,
      formato_ancho: m.formatoAncho,
      formato_grosor: m.formatoGrosor,
      color: m.color,
      marca: m.marca,
      categoria: m.categoria,
      m2_caja: m.m2caja,
      peso_caja: m.pesoCaja,
      modo_precio: m.modoPrecio,
      precio_m2: m.precioM2,
      precio_caja: m.precioCaja,
      umbral_sobrante_cm: m.umbralSobranteCm,
    })),
    banco_sobrantes: p.bancoSobrantes.map((s) => ({
      id: s.id,
      material_id: s.materialId,
      ancho: s.ancho,
      alto: s.alto,
      cantidad: s.cantidad,
      origen_nivel_id: s.origenNivelId,
      origen_space_id: s.origenSpaceId,
      patron_id: s.patronId,
      direccion: s.direccion,
      total_cortes: s.totalCortes,
      tramo_index: s.tramoIndex,
      origen: s.origen,
      fecha: s.fecha,
    })),
  }
}

export type EnchapesView = 'wizard' | 'catalogo' | 'visual'

export interface UseEnchapesReturn {
  // Project
  proyecto: EnchapeProject
  updateProyecto: (field: string, value: string) => void

  // Levels
  niveles: Nivel[]
  nivelActivoId: string | null
  addNivel: () => void
  removeNivel: (id: string) => void
  renameNivel: (id: string, name: string) => void
  selectNivel: (id: string) => void

  // Spaces
  addSpace: (tipo?: 'piso' | 'pared') => void
  removeSpace: (spaceId: string) => void
  updateSpace: (spaceId: string, updates: Partial<Espacio>) => void
  updateSegmento: (spaceId: string, idx: number, field: keyof Segmento, value: number) => void
  addSegmento: (spaceId: string) => void
  removeSegmento: (spaceId: string, idx: number) => void
  addAdjacentSpace: (fromId: string | null, tipo?: 'piso' | 'pared') => void

  // Connections
  conexiones: Conexion[]
  addConexion: (a: string, b: string) => void
  removeConexion: (id: string) => void

  // Canvas
  zoomLevel: number
  setZoomLevel: (z: number) => void
  selectedCardId: string | null
  setSelectedCardId: (id: string | null) => void
  updateSpacePosition: (spaceId: string, x: number, y: number) => void

  // Materials
  materiales: MaterialEnchape[]
  addMaterial: (mat: MaterialEnchape) => void
  updateMaterial: (id: string, updates: Partial<MaterialEnchape>) => void
  removeMaterial: (id: string) => void

  // Assignment
  assignMaterial: (spaceId: string, materialId: string | null) => void
  assignPatron: (spaceId: string, patronId: string | null) => void
  updateAjuste: (spaceId: string, val: number) => void
  setOrientacion: (spaceId: string, val: 'largo' | 'ancho' | null) => void
  setFiltroTipo: (spaceId: string, val: string | null) => void

  // Sobrantes
  bancoSobrantes: Sobrante[]
  guardarSobrante: (sob: Omit<Sobrante, 'id' | 'fecha'>) => void
  eliminarSobrante: (id: string) => void

  // View state
  fase: number
  setFase: (f: number) => void
  vista: EnchapesView
  setVista: (v: EnchapesView) => void
  visNivelId: string | null
  setVisNivelId: (id: string | null) => void
  visSpaceId: string | null
  setVisSpaceId: (id: string | null) => void

  // Computed
  getNivelActivo: () => Nivel | undefined
  getEspacio: (id: string) => Espacio | undefined
  getMaterial: (id: string) => MaterialEnchape | undefined
  computeArea: (sp: Espacio) => number
  calcularInstalacion: (sp: Espacio) => ReturnType<typeof calcularInstalacion>
  calcularSobrantes: (sp: Espacio, usarA: boolean) => ReturnType<typeof calcularSobrantesEspacio>
  patronesParaEspacio: (sp: Espacio) => ReturnType<typeof patronesParaMaterial>
  espacioCompleto: (sp: Espacio) => boolean

  // Actions
  saveProject: () => void
  saveToBackend: () => Promise<void>
  isSaving: boolean
  resetProject: () => void
}

export function useEnchapes(): UseEnchapesReturn {
  const [proyecto, setProyecto] = useState<EnchapeProject>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return createDefaultProject()
  })

  const [nivelActivoId, setNivelActivoId] = useState<string | null>(proyecto.niveles[0]?.id || null)
  const [fase, setFase] = useState(1)
  const [vista, setVista] = useState<EnchapesView>('wizard')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [visNivelId, setVisNivelId] = useState<string | null>(proyecto.niveles[0]?.id || null)
  const [visSpaceId, setVisSpaceId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Auto-save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proyecto))
    }, 500)
  }, [proyecto])

  useEffect(() => {
    scheduleSave()
  }, [proyecto, scheduleSave])

  // Project
  const updateProyecto = useCallback((field: string, value: string) => {
    setProyecto((prev) => ({ ...prev, [field]: value }))
  }, [])

  // Levels
  const addNivel = useCallback(() => {
    setProyecto((prev) => {
      const n = prev.niveles.length + 1
      const id = uid('niv')
      const nuevo = { id, nombre: `Piso ${n}`, espacios: [], conexiones: [] }
      return { ...prev, niveles: [...prev.niveles, nuevo] }
    })
    setNivelActivoId((prev) => prev)
  }, [])

  const removeNivel = useCallback((id: string) => {
    setProyecto((prev) => {
      if (prev.niveles.length <= 1) return prev
      const niveles = prev.niveles.filter((n) => n.id !== id)
      return { ...prev, niveles }
    })
    setNivelActivoId((prev) => {
      const stillExists = proyecto.niveles.some((n) => n.id === prev && n.id !== id)
      if (!stillExists) return proyecto.niveles.find((n) => n.id !== id)?.id || null
      return prev
    })
  }, [proyecto.niveles])

  const renameNivel = useCallback((id: string, name: string) => {
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => (n.id === id ? { ...n, nombre: name } : n)),
    }))
  }, [])

  const selectNivel = useCallback((id: string) => {
    setNivelActivoId(id)
    setSelectedCardId(null)
  }, [])

  // Spaces
  const addSpace = useCallback((tipo: 'piso' | 'pared' = 'piso') => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        const x = 60 + (n.espacios.length % 4) * 260
        const y = 60 + Math.floor(n.espacios.length / 4) * 200
        const nuevo: Espacio = {
          id: uid('sp'),
          nombre: tipo === 'pared' ? 'Nueva pared' : 'Nuevo espacio',
          tipo,
          segmentos: [{ largo: 3, ancho: tipo === 'pared' ? 2.4 : 3 }],
          x,
          y,
          ajusteDesperdicio: 0,
        }
        return { ...n, espacios: [...n.espacios, nuevo] }
      }),
    }))
  }, [nivelActivoId])

  const addAdjacentSpace = useCallback((fromId: string | null, tipo?: 'piso' | 'pared') => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        const from = fromId ? n.espacios.find((e) => e.id === fromId) : null
        const x = from ? from.x + 260 : 60
        const y = from ? from.y : 60
        const nuevo: Espacio = {
          id: uid('sp'),
          nombre: tipo === 'pared' && from ? `${from.nombre} - Pared` : 'Nuevo espacio',
          tipo: tipo || 'piso',
          segmentos: [{ largo: 3, ancho: tipo === 'pared' ? 2.4 : 3 }],
          x,
          y,
          ajusteDesperdicio: 0,
        }
        const espacios = [...n.espacios, nuevo]
        const conexiones = from
          ? [...n.conexiones, { id: uid('cx'), a: from.id, b: nuevo.id }]
          : n.conexiones
        return { ...n, espacios, conexiones }
      }),
    }))
  }, [nivelActivoId])

  const removeSpace = useCallback((spaceId: string) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return {
          ...n,
          espacios: n.espacios.filter((e) => e.id !== spaceId),
          conexiones: n.conexiones.filter((c) => c.a !== spaceId && c.b !== spaceId),
        }
      }),
    }))
  }, [nivelActivoId])

  const updateSpace = useCallback((spaceId: string, updates: Partial<Espacio>) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return {
          ...n,
          espacios: n.espacios.map((e) => (e.id === spaceId ? { ...e, ...updates } : e)),
        }
      }),
    }))
  }, [nivelActivoId])

  const updateSegmento = useCallback((spaceId: string, idx: number, field: keyof Segmento, value: number) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return {
          ...n,
          espacios: n.espacios.map((e) => {
            if (e.id !== spaceId) return e
            const segmentos = [...e.segmentos]
            segmentos[idx] = { ...segmentos[idx], [field]: value }
            return { ...e, segmentos }
          }),
        }
      }),
    }))
  }, [nivelActivoId])

  const addSegmento = useCallback((spaceId: string) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return {
          ...n,
          espacios: n.espacios.map((e) =>
            e.id === spaceId ? { ...e, segmentos: [...e.segmentos, { largo: 2, ancho: 2 }] } : e
          ),
        }
      }),
    }))
  }, [nivelActivoId])

  const removeSegmento = useCallback((spaceId: string, idx: number) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return {
          ...n,
          espacios: n.espacios.map((e) => {
            if (e.id !== spaceId) return e
            const segmentos = e.segmentos.filter((_, i) => i !== idx)
            if (segmentos.length === 0) segmentos.push({ largo: 3, ancho: 3 })
            return { ...e, segmentos }
          }),
        }
      }),
    }))
  }, [nivelActivoId])

  // Connections
  const addConexion = useCallback((a: string, b: string) => {
    if (!nivelActivoId || a === b) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        const ya = n.conexiones.some(
          (c) => (c.a === a && c.b === b) || (c.a === b && c.b === a)
        )
        if (ya) return n
        return { ...n, conexiones: [...n.conexiones, { id: uid('cx'), a, b }] }
      }),
    }))
  }, [nivelActivoId])

  const removeConexion = useCallback((id: string) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return { ...n, conexiones: n.conexiones.filter((c) => c.id !== id) }
      }),
    }))
  }, [nivelActivoId])

  // Canvas
  const updateSpacePosition = useCallback((spaceId: string, x: number, y: number) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return {
          ...n,
          espacios: n.espacios.map((e) => (e.id === spaceId ? { ...e, x, y } : e)),
        }
      }),
    }))
  }, [nivelActivoId])

  // Materials
  const addMaterial = useCallback((mat: MaterialEnchape) => {
    setProyecto((prev) => ({
      ...prev,
      materiales: [...prev.materiales, mat],
    }))
  }, [])

  const updateMaterial = useCallback((id: string, updates: Partial<MaterialEnchape>) => {
    setProyecto((prev) => ({
      ...prev,
      materiales: prev.materiales.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }))
  }, [])

  const removeMaterial = useCallback((id: string) => {
    setProyecto((prev) => ({
      ...prev,
      materiales: prev.materiales.filter((m) => m.id !== id),
      niveles: prev.niveles.map((n) => ({
        ...n,
        espacios: n.espacios.map((e) =>
          e.materialId === id ? { ...e, materialId: undefined, patronId: undefined } : e
        ),
      })),
    }))
  }, [])

  // Assignment
  const assignMaterial = useCallback((spaceId: string, materialId: string | null) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return {
          ...n,
          espacios: n.espacios.map((e) =>
            e.id === spaceId
              ? { ...e, materialId: materialId || undefined, patronId: undefined }
              : e
          ),
        }
      }),
    }))
  }, [nivelActivoId])

  const assignPatron = useCallback((spaceId: string, patronId: string | null) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return {
          ...n,
          espacios: n.espacios.map((e) =>
            e.id === spaceId ? { ...e, patronId: patronId || undefined } : e
          ),
        }
      }),
    }))
  }, [nivelActivoId])

  const updateAjuste = useCallback((spaceId: string, val: number) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return {
          ...n,
          espacios: n.espacios.map((e) =>
            e.id === spaceId ? { ...e, ajusteDesperdicio: val } : e
          ),
        }
      }),
    }))
  }, [nivelActivoId])

  const setOrientacion = useCallback((spaceId: string, val: 'largo' | 'ancho' | null) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return {
          ...n,
          espacios: n.espacios.map((e) =>
            e.id === spaceId ? { ...e, orientacionManual: val } : e
          ),
        }
      }),
    }))
  }, [nivelActivoId])

  const setFiltroTipo = useCallback((spaceId: string, val: string | null) => {
    if (!nivelActivoId) return
    setProyecto((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => {
        if (n.id !== nivelActivoId) return n
        return {
          ...n,
          espacios: n.espacios.map((e) =>
            e.id === spaceId ? { ...e, filtroTipoAcabado: val } : e
          ),
        }
      }),
    }))
  }, [nivelActivoId])

  // Sobrantes
  const guardarSobrante = useCallback((sob: Omit<Sobrante, 'id' | 'fecha'>) => {
    const nuevo: Sobrante = {
      ...sob,
      id: uid('sob'),
      fecha: new Date().toISOString().slice(0, 10),
    }
    setProyecto((prev) => ({
      ...prev,
      bancoSobrantes: [...prev.bancoSobrantes, nuevo],
    }))
  }, [])

  const eliminarSobrante = useCallback((id: string) => {
    setProyecto((prev) => ({
      ...prev,
      bancoSobrantes: prev.bancoSobrantes.filter((s) => s.id !== id),
    }))
  }, [])

  // Computed helpers
  const getNivelActivo = useCallback(() => {
    return proyecto.niveles.find((n) => n.id === nivelActivoId)
  }, [proyecto.niveles, nivelActivoId])

  const getEspacio = useCallback(
    (id: string) => {
      return proyecto.niveles.flatMap((n) => n.espacios).find((e) => e.id === id)
    },
    [proyecto.niveles]
  )

  const getMaterial = useCallback(
    (id: string) => proyecto.materiales.find((m) => m.id === id),
    [proyecto.materiales]
  )

  const espacioCompleto = useCallback(
    (sp: Espacio) => {
      if (!sp.materialId) return false
      const mat = getMaterial(sp.materialId)
      if (mat && ACABADOS_CONTINUOS.has(mat.tipoAcabado)) return true
      return !!sp.patronId
    },
    [getMaterial]
  )

  // Actions
  const saveProject = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proyecto))
  }, [proyecto])

  const saveToBackend = useCallback(async () => {
    if (!proyecto.nombre.trim()) {
      showNotification('Atención', 'warning', 'El proyecto debe tener un nombre antes de guardar.')
      return
    }
    setIsSaving(true)
    try {
      const payload = toSnakeProject(proyecto)
      const isNew = !proyecto.createdAt
      if (isNew) {
        const res = await apiService.createTileProject(payload)
        const data = res?.data || res
        if (data?.id) {
          setProyecto((prev) => ({ ...prev, id: data.id, createdAt: data.created_at || new Date().toISOString() }))
        }
        showNotification('Correcto', 'success', 'Proyecto creado y guardado en la nube.')
      } else {
        await apiService.updateTileProject(proyecto.id, payload)
        showNotification('Actualización correcta', 'success', 'Proyecto guardado en la nube.')
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proyecto))
    } catch (err: any) {
      showNotification('Error', 'error', err.message || 'No se pudo guardar en el servidor.')
    } finally {
      setIsSaving(false)
    }
  }, [proyecto])

  const resetProject = useCallback(() => {
    const nuevo = createDefaultProject()
    setProyecto(nuevo)
    setNivelActivoId(nuevo.niveles[0].id)
    setFase(1)
    setVista('wizard')
    localStorage.removeItem(STORAGE_KEY)
    showNotification('Correcto', 'success', 'Se reinició el proyecto de enchapes.')
  }, [])

  return {
    proyecto,
    updateProyecto,
    niveles: proyecto.niveles,
    nivelActivoId,
    addNivel,
    removeNivel,
    renameNivel,
    selectNivel,
    addSpace,
    removeSpace,
    updateSpace,
    updateSegmento,
    addSegmento,
    removeSegmento,
    addAdjacentSpace,
    conexiones: getNivelActivo()?.conexiones || [],
    addConexion,
    removeConexion,
    zoomLevel,
    setZoomLevel,
    selectedCardId,
    setSelectedCardId,
    updateSpacePosition,
    materiales: proyecto.materiales,
    addMaterial,
    updateMaterial,
    removeMaterial,
    assignMaterial,
    assignPatron,
    updateAjuste,
    setOrientacion,
    setFiltroTipo,
    bancoSobrantes: proyecto.bancoSobrantes,
    guardarSobrante,
    eliminarSobrante,
    fase,
    setFase,
    vista,
    setVista,
    visNivelId,
    setVisNivelId,
    visSpaceId,
    setVisSpaceId,
    getNivelActivo,
    getEspacio,
    getMaterial,
    computeArea,
    calcularInstalacion: (sp: Espacio) =>
      calcularInstalacion(sp, getMaterial(sp.materialId || ''), sp.patronId, sp.ajusteDesperdicio),
    calcularSobrantes: (sp: Espacio, usarA: boolean) =>
      calcularSobrantesEspacio(sp, getMaterial(sp.materialId || '')!, usarA),
    patronesParaEspacio: (sp: Espacio) => patronesParaMaterial(sp, getMaterial(sp.materialId || '')!),
    espacioCompleto,
    saveProject,
    saveToBackend,
    isSaving,
    resetProject,
  }
}
