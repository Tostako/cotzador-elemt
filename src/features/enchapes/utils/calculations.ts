import type {
  Espacio,
  MaterialEnchape,
  Segmento,
  PiezasPorPatronResult,
  ResultadoCalculo,
  ResultadoSobrantes,
  Offcut,
  GrupoSobrantes,
} from '../types/enchapes'
import {
  getPatron,
  umbralPorDefecto,
  ACABADOS_CONTINUOS,
  PATRONES_APLICABLES,
  PATRONES,
  FRACCION_TRABADA,
} from '../types/enchapes'

// ============================================================
// Area
// ============================================================

export function computeArea(espacio: Espacio): number {
  return (espacio.segmentos || []).reduce(
    (sum, seg) => sum + (parseFloat(String(seg.largo)) || 0) * (parseFloat(String(seg.ancho)) || 0),
    0
  )
}

export function computeSegmentArea(seg: Segmento): number {
  return (parseFloat(String(seg.largo)) || 0) * (parseFloat(String(seg.ancho)) || 0)
}

// ============================================================
// Piezas por patron (geometria real)
// ============================================================

export function piezasPorPatron(
  L: number,
  A: number,
  pL: number,
  pA: number,
  patronId: string
): PiezasPorPatronResult {
  if (pL <= 0 || pA <= 0 || L <= 0 || A <= 0) {
    return {
      piezasTotales: 0,
      areaComprada: 0,
      areaNecesaria: L * A,
      desperdicioPct: 0,
      desperdicioInstalador: 0,
      filas: 0,
      piezasPorFilaExacta: 0,
      piezasL: 0,
      piezasA: 0,
      utilL: 0,
      utilA: 0,
    }
  }

  const filas = Math.ceil(A / pA)
  const piezasPorFilaExacta = L / pL
  const conReuso = ['trabada50', 'trabada33', 'trabada25'].includes(patronId)

  let piezasTotales: number
  if (!conReuso) {
    piezasTotales = Math.ceil(piezasPorFilaExacta) * filas
  } else {
    const primeraFila = Math.ceil(piezasPorFilaExacta)
    const filasSiguientes = Math.max(filas - 1, 0) * piezasPorFilaExacta
    piezasTotales = primeraFila + Math.ceil(filasSiguientes)
  }

  const areaComprada = piezasTotales * pL * pA
  const areaNecesaria = L * A
  const desperdicioPct = areaNecesaria > 0 ? ((areaComprada - areaNecesaria) / areaNecesaria) * 100 : 0

  // Metodo "instalador": % de desperdicio por direccion
  const piezasL = Math.ceil(L / pL)
  const piezasA = Math.ceil(A / pA)
  const utilL = (L - (piezasL - 1) * pL) / pL
  const utilA = (A - (piezasA - 1) * pA) / pA
  const wasteInstaladorL = (1 - utilL) / piezasL * 100
  const wasteInstaladorA = (1 - utilA) / piezasA * 100
  const desperdicioInstalador = wasteInstaladorL + wasteInstaladorA

  return {
    piezasTotales,
    areaComprada,
    areaNecesaria,
    desperdicioPct,
    desperdicioInstalador,
    filas,
    piezasPorFilaExacta,
    piezasL,
    piezasA,
    utilL,
    utilA,
  }
}

// ============================================================
// Sobrantes / Offcuts
// ============================================================

export function sobrantesDeTramo(L: number, A: number, pL: number, pA: number): Offcut[] {
  const piezasL = Math.ceil(L / pL)
  const piezasA = Math.ceil(A / pA)
  const sobraL = piezasL * pL - L
  const sobraA = piezasA * pA - A
  const offcuts: Offcut[] = []

  if (sobraL > 0.005 && piezasA > 1) {
    offcuts.push({ ancho: sobraL, alto: pA, cantidad: piezasA - 1, origen: 'corte de columna final' })
  }
  if (sobraA > 0.005 && piezasL > 1) {
    offcuts.push({ ancho: pL, alto: sobraA, cantidad: piezasL - 1, origen: 'corte de fila final' })
  }
  if (sobraL > 0.005 && sobraA > 0.005) {
    offcuts.push({ ancho: sobraL, alto: sobraA, cantidad: 1, origen: 'esquina' })
  }
  return offcuts
}

interface GridPiece {
  x: number
  y: number
  w: number
  h: number
  esCorte: boolean
}

export function piezasGridTrabada(L: number, A: number, pL: number, pA: number, fraction: number): GridPiece[] {
  const piezas: GridPiece[] = []
  const nRows = Math.ceil(A / pA)
  for (let r = 0; r < nRows; r++) {
    const y = r * pA
    const h = Math.min(pA, A - y)
    const offset = ((r * fraction) % 1) * pL
    let x = -offset
    while (x < L) {
      const xs = Math.max(x, 0)
      const xe = Math.min(x + pL, L)
      if (xe > xs) {
        piezas.push({ x: xs, y, w: xe - xs, h, esCorte: (xe - xs) < pL - 0.001 })
      }
      x += pL
    }
  }
  return piezas
}

export function sobrantesDeTramoTrabada(
  L: number,
  A: number,
  pL: number,
  pA: number,
  fraction: number
): Offcut[] {
  const piezas = piezasGridTrabada(L, A, pL, pA, fraction)
  const nRows = Math.ceil(A / pA)
  const offcuts: Offcut[] = []
  const filaFinal = piezas.filter((p) => Math.abs(p.y - (nRows - 1) * pA) < 0.0005)

  if (filaFinal.length) {
    const hFila = filaFinal[0].h
    const sobranteV = pA - hFila
    if (sobranteV > 0.005 && filaFinal.length > 1) {
      offcuts.push({
        ancho: pL,
        alto: sobranteV,
        cantidad: filaFinal.length - 1,
        origen: 'corte de fila final',
      })
    }
    const ultPieza = filaFinal.reduce((max, p) => (p.x > max.x ? p : max), filaFinal[0])
    const sobranteH = pL - ultPieza.w
    if (sobranteH > 0.005) {
      offcuts.push({
        ancho: sobranteH,
        alto: ultPieza.h,
        cantidad: 1,
        origen: 'corte final de la última fila',
      })
    }
  }
  return offcuts
}

export function calcularSobrantesEspacio(
  espacio: Espacio,
  material: MaterialEnchape,
  usarA: boolean
): ResultadoSobrantes {
  const patronesSoportados = ['recta', 'trabada50', 'trabada33', 'trabada25']
  if (
    !material ||
    !material.formatoLargo ||
    !material.formatoAncho ||
    !espacio.patronId ||
    !patronesSoportados.includes(espacio.patronId)
  ) {
    return { grupos: [], soportado: false, descartados: 0, umbralCm: 0 }
  }

  const pL = parseFloat(String(material.formatoLargo)) / 100
  const pA = parseFloat(String(material.formatoAncho)) / 100
  const umbralRaw = material.umbralSobranteCm ?? umbralPorDefecto(material.tipoAcabado)
  const umbral = umbralRaw === null || umbralRaw === undefined ? 0 : parseFloat(String(umbralRaw))

  let descartados = 0
  const grupos: GrupoSobrantes[] = []
  const patronId = espacio.patronId

  ;(espacio.segmentos || []).forEach((seg, idx) => {
    const Lraw = parseFloat(String(seg.largo)) || 0
    const Araw = parseFloat(String(seg.ancho)) || 0
    const L = usarA ? Lraw : Araw
    const A2 = usarA ? Araw : Lraw
    if (L <= 0 || A2 <= 0) return

    const todos =
      patronId === 'recta'
        ? sobrantesDeTramo(L, A2, pL, pA)
        : sobrantesDeTramoTrabada(L, A2, pL, pA, FRACCION_TRABADA[patronId])

    const valePena = todos.filter((o) => Math.min(o.ancho, o.alto) * 100 >= umbral)
    descartados += todos.length - valePena.length
    if (valePena.length > 0) {
      grupos.push({
        tramoIndex: idx,
        tramoL: L,
        tramoA: A2,
        esPrincipal: false,
        offcuts: valePena,
      })
    }
  })

  // Marcar tramo principal (el de mayor area)
  if (grupos.length) {
    const segsConArea = (espacio.segmentos || []).map((s, i) => ({
      i,
      area: (parseFloat(String(s.largo)) || 0) * (parseFloat(String(s.ancho)) || 0),
    }))
    const principalIdx = segsConArea.reduce((max, s) => (s.area > max.area ? s : max), segsConArea[0]).i
    grupos.forEach((g) => {
      g.esPrincipal = g.tramoIndex === principalIdx
    })
  }

  return { grupos, soportado: true, descartados, umbralCm: umbral }
}

// ============================================================
// Calculo completo de instalacion
// ============================================================

export function calcularInstalacion(
  espacio: Espacio,
  material: MaterialEnchape | undefined,
  patronId: string | undefined,
  ajusteManual: number
): ResultadoCalculo {
  const segs = (espacio.segmentos || []).map((s) => ({
    largo: parseFloat(String(s.largo)) || 0,
    ancho: parseFloat(String(s.ancho)) || 0,
  }))
  segs.forEach((s: any) => (s.area = s.largo * s.ancho))
  const areaNecesariaTotal = segs.reduce((a: number, s: any) => a + s.area, 0)
  const manual = parseFloat(String(ajusteManual)) || 0

  const sinFormato = !material || !material.formatoLargo || !material.formatoAncho
  if (sinFormato || !patronId || segs.length === 0) {
    const pat = getPatron(patronId || '')
    let desp = pat ? pat.desperdicio : 5
    desp += (segs.length > 1 ? 3 : 0) + manual
    return {
      areaNecesaria: areaNecesariaTotal,
      areaComprada: areaNecesariaTotal * (1 + desp / 100),
      desperdicioPct: desp,
      piezas: null,
      orientacion: null,
      exacto: false,
    }
  }

  const pL = parseFloat(String(material.formatoLargo)) / 100
  const pA = parseFloat(String(material.formatoAncho)) / 100
  if (segs.length === 0 || areaNecesariaTotal <= 0) {
    return { areaNecesaria: 0, areaComprada: 0, desperdicioPct: 0, piezas: 0, orientacion: null, exacto: true }
  }

  const principal = segs.reduce((max: any, s: any) => (s.area > max.area ? s : max), segs[0])
  const orientA = piezasPorPatron(principal.largo, principal.ancho, pL, pA, patronId)
  const orientB = piezasPorPatron(principal.ancho, principal.largo, pL, pA, patronId)

  let usarA: boolean
  if (espacio.orientacionManual === 'largo') usarA = true
  else if (espacio.orientacionManual === 'ancho') usarA = false
  else usarA = orientA.desperdicioPct <= orientB.desperdicioPct

  let totalPiezas = 0
  let totalAreaComprada = 0
  let totalAreaNecesaria = 0
  let totalInstalador = 0

  segs.forEach((s: any) => {
    const L = usarA ? s.largo : s.ancho
    const A2 = usarA ? s.ancho : s.largo
    const r = piezasPorPatron(L, A2, pL, pA, patronId)
    totalPiezas += r.piezasTotales
    totalAreaComprada += r.areaComprada
    totalAreaNecesaria += r.areaNecesaria
    totalInstalador += r.desperdicioInstalador * r.areaNecesaria
  })

  const promedioInstalador = totalAreaNecesaria > 0 ? totalInstalador / totalAreaNecesaria : 0

  const extraCorte = ['diagonal45', 'espina', 'cesta', 'versalles', 'irregular'].includes(patronId)
    ? (getPatron(patronId)!.desperdicio * 0.4)
    : 1.5
  totalAreaComprada *= (1 + extraCorte / 100)
  totalAreaComprada *= (1 + manual / 100)

  let desperdicioPctFinal: number
  if (patronId === 'recta') {
    desperdicioPctFinal = promedioInstalador + manual
    totalAreaComprada = totalAreaNecesaria * (1 + desperdicioPctFinal / 100)
  } else {
    desperdicioPctFinal = totalAreaNecesaria > 0 ? ((totalAreaComprada - totalAreaNecesaria) / totalAreaNecesaria) * 100 : 0
  }

  return {
    areaNecesaria: totalAreaNecesaria,
    areaComprada: totalAreaComprada,
    desperdicioPct: desperdicioPctFinal,
    piezas: Math.ceil(totalPiezas),
    orientacion: usarA
      ? 'Pieza en sentido del lado mayor del tramo principal'
      : 'Pieza girada 90°',
    exacto: true,
  }
}

// ============================================================
// Patrones aplicables a un material
// ============================================================

export interface PatronOpcion {
  id: string
  nombre: string
  desperdicioEstimado: number
  real: boolean
}

export function patronesParaMaterial(espacio: Espacio, material: MaterialEnchape): PatronOpcion[] {
  if (!material) return []
  if (ACABADOS_CONTINUOS.has(material.tipoAcabado)) return []

  const candidatos = PATRONES_APLICABLES[material.tipoAcabado] || PATRONES.map((p) => p.id)
  const tieneFormato = material.formatoLargo && material.formatoAncho

  if (!tieneFormato) {
    return candidatos.map((id) => ({
      id,
      nombre: getPatron(id)!.nombre,
      desperdicioEstimado: getPatron(id)!.desperdicio,
      real: false,
    }))
  }

  const calcs = candidatos.map((id) => {
    const r = calcularInstalacion(espacio, material, id, 0)
    return {
      id,
      nombre: getPatron(id)!.nombre,
      desperdicioEstimado: Math.round(r.desperdicioPct * 10) / 10,
      real: true,
    }
  })

  calcs.sort((a, b) => a.desperdicioEstimado - b.desperdicioEstimado)
  return calcs
}

// ============================================================
// Helpers para SVG
// ============================================================

export interface PiezaSVG {
  x: number
  y: number
  w: number
  h: number
  sobranteH: number
  sobranteV: number
  esCorte: boolean
}

export function piezasGridRecta(L: number, A: number, pL: number, pA: number): PiezaSVG[] {
  const piezas: PiezaSVG[] = []
  const nCols = Math.ceil(L / pL)
  const nRows = Math.ceil(A / pA)
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      const x = c * pL
      const y = r * pA
      const wUsado = Math.min(pL, L - x)
      const hUsado = Math.min(pA, A - y)
      piezas.push({
        x,
        y,
        w: wUsado,
        h: hUsado,
        sobranteH: pL - wUsado,
        sobranteV: pA - hUsado,
        esCorte: wUsado < pL - 0.001 || hUsado < pA - 0.001,
      })
    }
  }
  return piezas
}

// ============================================================
// Generar plano SVG
// ============================================================

export interface PlanoSVGResult {
  svgHtml: string
  nota: string
}

export function generarPlanoSVG(
  L: number,
  A: number,
  pL: number,
  pA: number,
  patronId: string
): PlanoSVGResult {
  const W = 660
  const H = 420
  const pad = 46
  const margenSobrante = 34
  const escala = Math.min((W - 2 * pad - margenSobrante) / L, (H - 2 * pad - margenSobrante) / A)
  const px = (v: number) => v * escala
  const ox = pad
  const oy = pad

  let inner = ''
  let defs = ''
  let nota = ''

  let piezas: any[] | null = null
  let modo = 'grid'

  if (patronId === 'recta') piezas = piezasGridRecta(L, A, pL, pA)
  else if (patronId === 'trabada50') piezas = piezasGridTrabada(L, A, pL, pA, 0.5)
  else if (patronId === 'trabada33') piezas = piezasGridTrabada(L, A, pL, pA, 1 / 3)
  else if (patronId === 'trabada25') piezas = piezasGridTrabada(L, A, pL, pA, 0.25)
  else if (patronId === 'diagonal45') modo = 'diagonal'
  else modo = 'no-soportado'

  if (modo === 'grid' && patronId === 'recta') {
    piezas!.forEach((p: any) => {
      inner += `<rect x="${ox + px(p.x)}" y="${oy + px(p.y)}" width="${px(p.w)}" height="${px(p.h)}" fill="#F1E9DA" stroke="#C4A460" stroke-width="1"/>`
    })

    const sobranteH = piezas!.length ? Math.max(...piezas!.map((p: any) => p.sobranteH)) : 0
    if (sobranteH > 0.002) {
      const ultX = Math.max(...piezas!.map((p: any) => p.x + p.w))
      const sx = ox + px(ultX)
      const sy = oy
      const sw = px(sobranteH)
      const sh = px(A)
      inner += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="#E8956B" stroke="#C9683A" stroke-width="1"/>`
      inner += `<text x="${sx + sw / 2}" y="${sy + sh / 2}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="#7A3D22" transform="rotate(90 ${sx + sw / 2} ${sy + sh / 2})">${Math.round(sobranteH * 100)}cm sobrante</text>`
    }

    const sobranteV = piezas!.length ? Math.max(...piezas!.map((p: any) => p.sobranteV)) : 0
    if (sobranteV > 0.002) {
      const ultY = Math.max(...piezas!.map((p: any) => p.y + p.h))
      const sx = ox
      const sy = oy + px(ultY)
      const sw = px(L)
      const sh = px(sobranteV)
      inner += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="#E8956B" stroke="#C9683A" stroke-width="1"/>`
      inner += `<text x="${sx + sw / 2}" y="${sy + sh / 2}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="#7A3D22">${Math.round(sobranteV * 100)}cm sobrante</text>`
    }
  } else if (modo === 'grid') {
    piezas!.forEach((p: any) => {
      inner += `<rect x="${ox + px(p.x)}" y="${oy + px(p.y)}" width="${px(p.w)}" height="${px(p.h)}" fill="#F1E9DA" stroke="#C4A460" stroke-width="1"/>`
    })
    nota =
      'Este patrón reutiliza los cortes entre filas, así que el plano no resalta piezas "cortadas" individualmente — usa los números de abajo para el desperdicio real.'
  } else if (modo === 'diagonal') {
    defs = `<pattern id="diagPattern" width="${px(pL)}" height="${px(pA)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${px(pL)}" height="${px(pA)}" fill="#F1E9DA" stroke="#C4A460" stroke-width="1"/></pattern>`
    inner = `<rect x="${ox}" y="${oy}" width="${px(L)}" height="${px(A)}" fill="url(#diagPattern)"/>`
    nota = 'Vista aproximada: el patrón diagonal no diferencia los recortes exactos en los bordes todavía.'
  }

  const sinSoporte = modo === 'no-soportado'
  const svgHtml = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;max-height:460px;">
    <defs>${defs}</defs>
    <rect x="0" y="0" width="${W}" height="${H}" fill="#FFFEFC"/>
    ${sinSoporte ? `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="13" fill="#6B6258">Vista previa no disponible aún para este patrón — usa los datos numéricos de Fase 3.</text>`
      : `<g>${inner}</g>
         <rect x="${ox}" y="${oy}" width="${px(L)}" height="${px(A)}" fill="none" stroke="#241F1A" stroke-width="2.5"/>
         <text x="${ox + px(L) / 2}" y="${oy - 14}" text-anchor="middle" font-size="13" font-weight="700" fill="#241F1A">${L.toFixed(2)} m</text>
         <text x="${ox - 14}" y="${oy + px(A) / 2}" text-anchor="middle" font-size="13" font-weight="700" fill="#241F1A" transform="rotate(-90 ${ox - 14} ${oy + px(A) / 2})">${A.toFixed(2)} m</text>`}
  </svg>`

  return { svgHtml, nota }
}

// ============================================================
// Budget helpers
// ============================================================

export interface LineaPresupuesto {
  espacioId: string
  espacioNombre: string
  tipo: 'piso' | 'pared'
  area: number
  materialNombre: string
  desperdicio: number
  areaComprar: number
  cajas: number | string
  costo: number
  peso: number
}

export interface TotalesMaterial {
  nombre: string
  area: number
  cajas: number
  peso: number
  costo: number
}

export function calcularPresupuesto(
  niveles: { espacios: Espacio[] }[],
  materiales: MaterialEnchape[]
): {
  lineas: LineaPresupuesto[]
  porMaterial: Record<string, TotalesMaterial>
  granTotal: number
  pesoGranTotal: number
} {
  const lineas: LineaPresupuesto[] = []
  const porMaterial: Record<string, TotalesMaterial> = {}

  let granTotal = 0
  let pesoGranTotal = 0

  niveles.forEach((nivel) => {
    nivel.espacios.forEach((sp) => {
      const area = computeArea(sp)
      const mat = materiales.find((m) => m.id === sp.materialId)
      let cajas: number | string = '—'
      let costo = 0
      let peso = 0
      let matNombre = 'Sin asignar'
      let desperdicio = 0
      let areaComprar = area

      if (mat && sp.patronId) {
        matNombre = mat.nombre
        const r = calcularInstalacion(sp, mat, sp.patronId, sp.ajusteDesperdicio)
        desperdicio = r.desperdicioPct
        areaComprar = r.areaComprada
        const m2caja = parseFloat(String(mat.m2caja)) || 0
        if (m2caja > 0) cajas = Math.ceil(areaComprar / m2caja)
        const pesoCaja = parseFloat(String(mat.pesoCaja)) || 0
        if (typeof cajas === 'number') peso = cajas * pesoCaja

        if (mat.modoPrecio === 'caja') {
          const precioCaja = parseFloat(String(mat.precioCaja)) || 0
          costo = typeof cajas === 'number' ? cajas * precioCaja : 0
        } else {
          const precioM2 = parseFloat(String(mat.precioM2)) || 0
          costo = areaComprar * precioM2
        }

        granTotal += costo
        pesoGranTotal += peso

        if (!porMaterial[mat.id]) {
          porMaterial[mat.id] = { nombre: mat.nombre, area: 0, cajas: 0, costo: 0, peso: 0 }
        }
        porMaterial[mat.id].area += areaComprar
        if (typeof cajas === 'number') porMaterial[mat.id].cajas += cajas
        porMaterial[mat.id].costo += costo
        porMaterial[mat.id].peso += peso
      }

      lineas.push({
        espacioId: sp.id,
        espacioNombre: sp.nombre,
        tipo: sp.tipo,
        area,
        materialNombre: matNombre,
        desperdicio,
        areaComprar,
        cajas,
        costo,
        peso,
      })
    })
  })

  return { lineas, porMaterial, granTotal, pesoGranTotal }
}
