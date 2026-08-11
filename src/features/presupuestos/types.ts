/**
 * Modelo de dominio del módulo de Presupuestos de Obra (APU).
 *
 * Jerarquía de seis niveles (DOC-01 §3):
 *   Insumo → APU → Actividad → Capítulo → Presupuesto → Proyecto
 *
 * Los importes llegan del servidor como cadena para no perder precisión con
 * los decimales; se convierten a número solo para mostrarlos o graficarlos.
 */

/** Importe monetario. Llega como cadena ("58696983.45") desde la API. */
export type Importe = string;

export type TipoObra = 'REMODELACION' | 'OBRA_NUEVA' | 'ADECUACION' | 'AMPLIACION' | 'MANTENIMIENTO';

export type GrupoRecurso = 'MATERIALES' | 'MANO_OBRA' | 'EQUIPOS' | 'TRANSPORTE';

export const ETIQUETA_RECURSO: Record<GrupoRecurso, string> = {
  MATERIALES: 'Materiales',
  MANO_OBRA: 'Mano de obra',
  EQUIPOS: 'Equipos',
  TRANSPORTE: 'Transporte',
};

export const ETIQUETA_TIPO_OBRA: Record<TipoObra, string> = {
  REMODELACION: 'Remodelación',
  OBRA_NUEVA: 'Obra nueva',
  ADECUACION: 'Adecuación',
  AMPLIACION: 'Ampliación',
  MANTENIMIENTO: 'Mantenimiento',
};

// ── Nivel 6: Proyecto ──────────────────────────────────────

export interface Proyecto {
  id: string;
  nombre: string;
  cliente?: string;
  ubicacion?: string;
  /** Obligatorio: es el divisor de todos los indicadores por m². */
  areaM2: number;
  tipoObra?: TipoObra;
  fecha?: string;
  descuento?: number;
  estado?: 'BORRADOR' | 'APROBADO' | 'ARCHIVADO';
  costoDirecto?: Importe;
  total?: Importe;
  creadoEn?: string;
  /** Control de concurrencia optimista. */
  version?: number;
}

export interface NuevoProyecto {
  nombre: string;
  cliente?: string;
  ubicacion?: string;
  areaM2: number;
  tipoObra?: TipoObra;
  fecha?: string;
  descuento?: number;
}

// ── Nivel 4: Capítulo ──────────────────────────────────────

export interface Capitulo {
  id: string;
  nombre: string;
  /** Solo en el presupuesto: suma de las actividades del capítulo. */
  subtotal?: Importe;
}

// ── Nivel 3: Actividad (APU dentro de un presupuesto) ──────

export interface Aviso {
  codigo: string;
  mensaje: string;
  /** La validación blanda (H-16) nunca bloquea: solo informa. */
  bloqueante: boolean;
}

export interface ActividadPresupuesto {
  id: string;
  capitulo: Capitulo;
  descripcion: string;
  unidad: string;
  cantidad: string;
  valorUnitario: Importe;
  valorParcial: Importe;
  /** Instantánea del APU congelada en el proyecto (H-07). */
  apuSnapshotId?: string;
  avisos?: Aviso[];
  /** H-08 · La actividad tiene memoria de cálculo que sustenta el metrado. */
  tieneMemoria?: boolean;
  /** H-08 · La memoria gobierna la cantidad: el campo pasa a solo lectura. */
  cantidadDesdeMemoria?: boolean;
}

export interface Totales {
  costoDirecto: Importe;
  aiu?: Importe;
  total: Importe;
}

/** Respuesta de GET /projects/:id/budget: actividades agrupadas por capítulo. */
export interface Presupuesto {
  capitulos: Array<Capitulo & { actividades: ActividadPresupuesto[] }>;
  totales: Totales;
}

// ── Nivel 2: APU del catálogo ──────────────────────────────

export interface ComponenteApu {
  insumoId: string;
  descripcion: string;
  unidad: string;
  grupo: GrupoRecurso;
  /** Rendimiento: cantidad de insumo por unidad de actividad. */
  cantidad: number;
  valorUnitario: Importe;
  subtotal: Importe;
}

export interface Apu {
  id: string;
  descripcion: string;
  unidad: string;
  capitulo?: Capitulo;
  valorUnitario: Importe;
  componentes?: ComponenteApu[];
}

// ── Nivel 1: Insumo ────────────────────────────────────────

export interface Insumo {
  id: string;
  descripcion: string;
  unidad: string;
  grupo: GrupoRecurso;
  valorUnitario: Importe;
  /** Cuántos APUs lo usan; sirve para medir el impacto de un cambio. */
  usoEnApus?: number;
}

// ── Cierre financiero ──────────────────────────────────────

export interface Aiu {
  administracionPct: number;
  imprevistosPct: number;
  utilidadPct: number;
  ivaAplica: boolean;
  ivaPct: number;
  descuento?: number;
  /** Calculados por el servidor. */
  costoDirecto?: Importe;
  administracion?: Importe;
  imprevistos?: Importe;
  utilidad?: Importe;
  aiuTotal?: Importe;
  iva?: Importe;
  total?: Importe;
}

/** AIU de arranque de un proyecto nuevo: los porcentajes habituales en obra.
 *  Se usan al crear (el formulario no los pide) y como respaldo si el servidor
 *  aún no tiene valores guardados. Crear con 0/0/0 daría un total igual al
 *  costo directo, que nadie quiere. */
export const AIU_POR_DEFECTO: Aiu = {
  administracionPct: 15,
  imprevistosPct: 3,
  utilidadPct: 5,
  ivaAplica: false,
  ivaPct: 19,
  descuento: 0,
};

// ── Cotización a proveedores (H-22) ────────────────────────

export type EstadoLinea = 'PENDIENTE' | 'COTIZADO' | 'APROBADO' | 'RECHAZADO';

export const ETIQUETA_ESTADO_LINEA: Record<EstadoLinea, string> = {
  PENDIENTE: 'Pendiente',
  COTIZADO: 'Cotizado',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

/** Color por estado; el mismo que usa el panel para no inventar semáforos nuevos. */
export const COLOR_ESTADO_LINEA: Record<EstadoLinea, string> = {
  PENDIENTE: '#8c8578',
  COTIZADO: '#5aa9e6',
  APROBADO: '#4ade80',
  RECHAZADO: '#ff6b6b',
};

export interface LineaCotizacion {
  id: string;
  insumoId: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  /** Precio del insumo en el presupuesto: la referencia contra la que se compara. */
  precioPresupuesto: Importe;
  proveedor?: string;
  /** Lo que ofrece el proveedor. Vacío mientras está PENDIENTE. */
  precioCotizado?: Importe;
  estado: EstadoLinea;
  observacion?: string;
}

export interface Cotizacion {
  id: string;
  nombre: string;
  creadaEn?: string;
  lineas: LineaCotizacion[];
}

/** Diferencia de una línea contra el presupuesto. `null` si aún no hay precio. */
export const diferenciaLinea = (l: LineaCotizacion) => {
  if (l.precioCotizado === undefined || l.precioCotizado === '') return null;
  const base = aNumero(l.precioPresupuesto) * (l.cantidad || 0);
  const cotizado = aNumero(l.precioCotizado) * (l.cantidad || 0);
  const absoluta = cotizado - base;
  // Sin base no hay porcentaje posible: dividir por cero daría Infinity.
  return { base, cotizado, absoluta, pct: base > 0 ? (absoluta / base) * 100 : null };
};

// ── Marca de la empresa (H-25) ─────────────────────────────

export interface Marca {
  nombreEmpresa: string;
  nit?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  sitioWeb?: string;
  /** URL del logo ya subido, no el archivo. */
  logoUrl?: string;
  /** Limitado a la paleta validada por contraste: no es un selector libre. */
  colorAcento: string;
  plantillaDocumento?: string;
}

/** Paleta cerrada de acentos. Todos validados sobre el fondo oscuro de los
 *  documentos, así que ninguna elección puede producir un PDF ilegible. */
export const ACENTOS_MARCA: Array<{ valor: string; nombre: string }> = [
  { valor: '#b69462', nombre: 'Arena' },
  { valor: '#c0752f', nombre: 'Terracota' },
  { valor: '#7a8b6f', nombre: 'Oliva' },
  { valor: '#4a6fa5', nombre: 'Azul obra' },
  { valor: '#8c6a9e', nombre: 'Ciruela' },
  { valor: '#3f3f46', nombre: 'Grafito' },
];

// ── Analítica (panel principal) ────────────────────────────

export interface ResumenAnalitica {
  computedAt?: string;
  estadoVacio?: boolean;
  actividades: number;
  costoDirecto: Importe;
  aiu: { valor: Importe; pct: number };
  total: Importe;
  /** null si el proyecto no tiene área registrada. */
  costoPorM2: Importe | null;
  recursos: Array<{ tipo: GrupoRecurso; valor: Importe; pct: number; porM2?: Importe | null }>;
  capitulos: Array<{ id: string; nombre: string; valor: Importe; pct: number; actividades: number }>;
}

// ── Utilidades ─────────────────────────────────────────────

/** Cadena de importe → número. Devuelve 0 si no es convertible. */
export const aNumero = (v: Importe | number | null | undefined): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

/** Formato de moneda colombiana, sin decimales (como en los documentos). */
export const money = (v: Importe | number | null | undefined): string =>
  '$' + Math.round(aNumero(v)).toLocaleString('es-CO');
