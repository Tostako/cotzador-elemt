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
  /** Código corto («PRE»). `null` en el servidor si no se dio. */
  codigo?: string;
  /** Posición en el presupuesto impreso. */
  orden?: number;
  /** Solo en el presupuesto: suma de las actividades del capítulo. */
  subtotal?: Importe;
}

// ── Nivel 3: Actividad (APU dentro de un presupuesto) ──────

/**
 * Aviso del servidor. Llega en dos formas según el endpoint: la validación
 * blanda usa `codigo`/`bloqueante`, y el catálogo de APUs `tipo`/`field`. Se
 * admiten las dos para no perder el mensaje, que es lo único imprescindible.
 */
export interface Aviso {
  mensaje: string;
  codigo?: string;
  /** `warning` | `error` en los avisos del catálogo. */
  tipo?: string;
  /** Ruta del campo al que se refiere, p. ej. `componentes.<id>.precio`. */
  campo?: string;
  /** La validación blanda (H-16) nunca bloquea: solo informa. */
  bloqueante?: boolean;
}

/** Instantánea del APU congelada en el proyecto: ya viene enriquecida. */
export interface ComponenteSnapshot {
  insumoId: string;
  descripcion: string;
  unidad: string;
  grupo: GrupoRecurso;
  rendimiento: number;
  valor: Importe;
  subtotal: Importe;
}

export interface ApuSnapshot {
  apuId: string;
  codigo?: string;
  descripcion: string;
  unidad: string;
  valorUnitario: Importe;
  version?: number;
  capturadoEn?: string;
  componentes: ComponenteSnapshot[];
}

export interface ActividadPresupuesto {
  id: string;
  capitulo: Capitulo;
  descripcion: string;
  unidad: string;
  cantidad: string;
  valorUnitario: Importe;
  valorParcial: Importe;
  /** Obligatorio como `If-Match` al cambiar la cantidad (HU-05). */
  etag?: string;
  apuSnapshot?: ApuSnapshot;
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

/**
 * Presupuesto del proyecto ya normalizado.
 *
 * El servidor lo devuelve plano —`items[]` sueltos, sin capítulos— y con el
 * AIU incluido; la agrupación la hace `presupuestoDesdeBackend`.
 */
export interface Presupuesto {
  capitulos: Array<Capitulo & { actividades: ActividadPresupuesto[] }>;
  totales: Totales;
  /** Viene en la misma respuesta: ahorra una petición aparte. */
  aiu?: Aiu;
  avisos?: Aviso[];
}

// ── Nivel 2: APU del catálogo ──────────────────────────────

/**
 * Componente de un APU.
 *
 * El servidor devuelve la fila cruda —`insumo_id` y `rendimiento`, nada más—,
 * así que descripción, unidad, grupo y precio se rellenan cruzando con el
 * maestro de insumos (ver `enriquecerComponentes`). Hasta que se cruzan, esos
 * campos vienen vacíos: por eso son opcionales y no mienten con un valor
 * inventado.
 */
export interface ComponenteApu {
  insumoId: string;
  /** Rendimiento: cantidad de insumo por unidad de actividad. */
  cantidad: number;
  descripcion?: string;
  unidad?: string;
  grupo?: GrupoRecurso;
  valorUnitario?: Importe;
  subtotal?: Importe;
  /** El insumo no está en el maestro: se cita un id que ya no existe. */
  huerfano?: boolean;
}

export type OrigenApu = 'BASE' | 'PERSONALIZADO' | 'GENERADO_IA' | 'IMPORTADO';

export interface Apu {
  id: string;
  descripcion: string;
  unidad: string;
  /** Obligatorio al crear (máx. 30 caracteres). */
  codigo?: string;
  capitulo?: Capitulo;
  origen?: OrigenApu;
  valorUnitario: Importe;
  componentes?: ComponenteApu[];
  /** Los devuelve el servidor: insumos sin precio, sobre todo. */
  avisos?: Aviso[];
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
