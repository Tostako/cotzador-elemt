// ============================================================
// Calculadora de Enchapes — Domain Types
// ============================================================

export interface EnchapeProject {
  id: string
  nombre: string
  propietario: string
  ubicacion: string
  niveles: Nivel[]
  materiales: MaterialEnchape[]
  bancoSobrantes: Sobrante[]
  createdAt?: string
  updatedAt?: string
}

export interface Nivel {
  id: string
  nombre: string
  espacios: Espacio[]
  conexiones: Conexion[]
}

export interface Espacio {
  id: string
  nombre: string
  tipo: 'piso' | 'pared'
  segmentos: Segmento[]
  x: number
  y: number
  materialId?: string
  patronId?: string
  ajusteDesperdicio: number
  orientacionManual?: 'largo' | 'ancho' | null
  filtroTipoAcabado?: string | null
  // Geometría real del plano (opcional; si el backend la envía se dibuja el polígono en vez del cuadrito).
  nodos?: { id: string; x: number; y: number }[]
  muros?: { a: string; b: string; abertura?: boolean }[]
  puntos?: { x: number; y: number }[]
}

export interface Segmento {
  largo: number
  ancho: number
}

export interface Conexion {
  id: string
  a: string
  b: string
}

export interface MaterialEnchape {
  id: string
  nombre: string
  tipoAcabado: string
  formatoLargo?: number
  formatoAncho?: number
  formatoGrosor?: number
  color?: string
  marca?: string
  categoria: 'Ambos' | 'Piso' | 'Pared'
  m2caja?: number
  pesoCaja?: number
  modoPrecio: 'm2' | 'caja'
  precioM2?: number
  precioCaja?: number
  umbralSobranteCm?: number | null
}

export interface Sobrante {
  id: string
  materialId: string
  materialNombre?: string
  ancho: number
  alto: number
  cantidad: number
  origenNivelId: string
  origenSpaceId: string
  patronId: string
  patronNombre?: string
  direccion: string
  totalCortes?: number
  tramoIndex: number
  origen: string
  fecha: string
}

export interface PatronInstalacion {
  id: string
  nombre: string
  desperdicio: number
  recomendado: string
}

export interface ResultadoCalculo {
  areaNecesaria: number
  areaComprada: number
  desperdicioPct: number
  piezas: number | null
  orientacion: string | null
  exacto: boolean
}

export interface Offcut {
  ancho: number
  alto: number
  cantidad: number
  origen: string
}

export interface GrupoSobrantes {
  tramoIndex: number
  tramoL: number
  tramoA: number
  esPrincipal: boolean
  offcuts: Offcut[]
}

export interface ResultadoSobrantes {
  grupos: GrupoSobrantes[]
  soportado: boolean
  descartados: number
  umbralCm: number
}

export interface PiezasPorPatronResult {
  piezasTotales: number
  areaComprada: number
  areaNecesaria: number
  desperdicioPct: number
  desperdicioInstalador: number
  filas: number
  piezasPorFilaExacta: number
  piezasL: number
  piezasA: number
  utilL: number
  utilA: number
}

// ============================================================
// Constants
// ============================================================

export const TIPOS_ACABADO: string[] = [
  'Cerámica',
  'Porcelanato',
  'Piedra Natural (Mármol/Granito/Travertino)',
  'Madera Maciza (Duela)',
  'Piso Laminado',
  'SPC (Vinílico Rígido)',
  'Vinílico Flexible (LVT)',
  'Microcemento',
  'Resina Epóxica',
  'Concreto Pulido',
  'Alfombra / Carpeta',
  'Bambú',
]

export const ACABADOS_CONTINUOS = new Set([
  'Microcemento',
  'Resina Epóxica',
  'Concreto Pulido',
])

export const PATRONES: PatronInstalacion[] = [
  { id: 'recta', nombre: 'Recta / Junta corrida (a hilo)', desperdicio: 5, recomendado: 'Sirve para casi todos los materiales y formatos rectangulares grandes.' },
  { id: 'trabada50', nombre: 'Trabada 1/2 (a la española, ladrillo 50%)', desperdicio: 8, recomendado: 'Porcelanato, cerámica, SPC y laminado rectangular.' },
  { id: 'trabada33', nombre: 'Trabada 1/3', desperdicio: 10, recomendado: 'Porcelanato rectangular y madera/laminado de tablas largas.' },
  { id: 'trabada25', nombre: 'Trabada 1/4', desperdicio: 8, recomendado: 'Formatos grandes rectificados (porcelanato XL).' },
  { id: 'diagonal45', nombre: 'Diagonal 45°', desperdicio: 15, recomendado: 'Cerámica y porcelanato cuadrado; amplía visualmente espacios pequeños.' },
  { id: 'espina', nombre: 'Espina de pescado (Herringbone)', desperdicio: 20, recomendado: 'Madera, laminado y SPC en formato de tabla/listón.' },
  { id: 'cesta', nombre: 'Cesta / Basket weave', desperdicio: 15, recomendado: 'Madera y mosaico.' },
  { id: 'versalles', nombre: 'Versalles (combinación de formatos)', desperdicio: 12, recomendado: 'Piedra natural y porcelanato imitación piedra.' },
  { id: 'irregular', nombre: 'Espacio irregular / muchos cortes', desperdicio: 12, recomendado: 'Cualquier material en espacios con ángulos o formas en L.' },
]

export const PATRONES_APLICABLES: Record<string, string[]> = {
  'Cerámica': ['recta', 'trabada50', 'diagonal45', 'trabada33', 'irregular'],
  'Porcelanato': ['recta', 'trabada50', 'trabada33', 'trabada25', 'diagonal45', 'irregular'],
  'Piedra Natural (Mármol/Granito/Travertino)': ['versalles', 'recta', 'irregular'],
  'Madera Maciza (Duela)': ['espina', 'recta', 'trabada33', 'cesta', 'trabada50'],
  'Piso Laminado': ['recta', 'trabada50', 'trabada33', 'espina'],
  'SPC (Vinílico Rígido)': ['recta', 'trabada50', 'trabada33', 'espina'],
  'Vinílico Flexible (LVT)': ['recta', 'trabada50', 'espina'],
  'Bambú': ['espina', 'recta', 'trabada33'],
  'Alfombra / Carpeta': ['recta', 'irregular'],
}

export const FRACCION_TRABADA: Record<string, number> = {
  trabada50: 0.5,
  trabada33: 1 / 3,
  trabada25: 0.25,
}

// Rigidos: piezas pequeñas son inmanejables / se rompen
// Planchas: necesitan mas longitud para verse bien
export const RIGIDOS = new Set([
  'Cerámica',
  'Porcelanato',
  'Piedra Natural (Mármol/Granito/Travertino)',
])

export const PLANCHAS = new Set([
  'Madera Maciza (Duela)',
  'Piso Laminado',
  'SPC (Vinílico Rígido)',
  'Vinílico Flexible (LVT)',
  'Bambú',
  'Alfombra / Carpeta',
])

export function umbralPorDefecto(tipoAcabado: string): number | null {
  if (RIGIDOS.has(tipoAcabado)) return 10
  if (PLANCHAS.has(tipoAcabado)) return 15
  return null
}

export function getPatron(id: string): PatronInstalacion | undefined {
  return PATRONES.find((p) => p.id === id)
}

export function nombreConColor(m: MaterialEnchape): string {
  return m.color ? `${m.nombre} - ${m.color}` : m.nombre
}
