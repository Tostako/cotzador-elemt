import { AIU_POR_DEFECTO, type Aiu, type GrupoRecurso, type Insumo, type NuevoProyecto, type Proyecto, type TipoObra } from './types';

/**
 * Traducción entre el modelo de la interfaz y el contrato del backend.
 *
 * El backend mezcla convenciones: los campos del proyecto van en snake_case
 * (area_m2, tipo_obra) pero los del AIU en camelCase con el prefijo delante
 * (pctAdministracion). En vez de arrastrar eso por las pantallas, la
 * conversión vive aquí y la interfaz usa un solo estilo.
 *
 * Las lecturas aceptan ambas convenciones a propósito: si el backend cambia
 * o devuelve algo distinto de lo que recibe, no se pierden campos en silencio
 * —que es exactamente el fallo que ya tuvimos con los materiales de enchapes—.
 */

/** Lee un campo probando varios nombres, en orden de preferencia. */
const campo = (o: any, ...nombres: string[]) => {
  for (const n of nombres) {
    if (o?.[n] !== undefined && o?.[n] !== null) return o[n];
  }
  return undefined;
};

const num = (v: any, porDefecto = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : porDefecto;
};

// ── Grupo de recurso ───────────────────────────────────────

/**
 * El backend usa el singular en materiales y equipos: `MATERIAL`, `MANO_OBRA`,
 * `EQUIPO`, `TRANSPORTE`. La interfaz usa el plural.
 *
 * ⚠️ El mensaje de error del validador **no** es fiable como referencia: dice
 * «must be one of: MATERIAL, MANO OBRA, …» con un espacio, pero mandar
 * `MANO OBRA` se rechaza y `MANO_OBRA` se acepta. Los valores de aquí están
 * comprobados contra el servidor, no copiados del mensaje.
 *
 * La traducción vive aquí y no en las pantallas: si el contrato cambia otra
 * vez, se toca un sitio. Y `grupoDesdeBackend` acepta las dos convenciones a
 * propósito, porque un grupo que no se reconoce no rompe nada visible —
 * simplemente deja la etiqueta en blanco y el insumo desaparece de su sección
 * del consolidado, que es el fallo silencioso que ya nos costó caro con los
 * materiales de enchapes.
 */
const GRUPO_A_BACKEND: Record<GrupoRecurso, string> = {
  MATERIALES: 'MATERIAL',
  MANO_OBRA: 'MANO_OBRA',
  EQUIPOS: 'EQUIPO',
  TRANSPORTE: 'TRANSPORTE',
};

export const grupoABackend = (g: GrupoRecurso | string): string =>
  GRUPO_A_BACKEND[g as GrupoRecurso] ?? String(g);

/** Normaliza para comparar: mayúsculas, guiones a espacios, sin espacios de más.
 *  No hace falta quitar tildes: ningún nombre de grupo lleva. */
const normalizar = (v: unknown) =>
  String(v ?? '').toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Backend (o CSV escrito a mano) → interfaz. Tolera singular, plural y guion. */
export function grupoDesdeBackend(v: unknown): GrupoRecurso {
  const n = normalizar(v);
  if (n.startsWith('MATERIAL')) return 'MATERIALES';
  if (n.startsWith('MANO')) return 'MANO_OBRA';
  if (n.startsWith('EQUIPO')) return 'EQUIPOS';
  if (n.startsWith('TRANSPORTE')) return 'TRANSPORTE';
  // Sin correspondencia se cae a materiales: es el grupo mayoritario y deja
  // el insumo visible, en vez de esconderlo en una sección que no existe.
  return 'MATERIALES';
}

/** ¿Este texto nombra un grupo real? Lo usa la importación para rechazar filas. */
export function esGrupoValido(v: unknown): boolean {
  return /^(MATERIAL(ES)?|MANO( DE)? OBRA|EQUIPO(S)?|TRANSPORTE(S)?)$/.test(normalizar(v));
}

/**
 * Insumo del maestro.
 *
 * El precio llega como `precio_vigente`, no como `valorUnitario`: leerlo por el
 * nombre equivocado no da error, deja toda la columna de precios en cero. Se
 * aceptan los dos nombres para no depender de que el contrato no cambie.
 */
export const insumoDesdeBackend = (d: any): Insumo => ({
  ...d,
  id: String(d?.id ?? ''),
  descripcion: d?.descripcion ?? '',
  unidad: d?.unidad ?? '',
  grupo: grupoDesdeBackend(d?.grupo),
  valorUnitario: String(campo(d, 'precio_vigente', 'precioVigente', 'valorUnitario', 'valor_unitario') ?? '0'),
  usoEnApus: campo(d, 'usoEnApus', 'uso_en_apus', 'apus'),
});

export const insumosDesdeBackend = (d: any): Insumo[] =>
  (Array.isArray(d) ? d : (d?.items ?? d?.data ?? [])).map(insumoDesdeBackend);

/**
 * Página del maestro de insumos.
 *
 * La respuesta es `{ items, total, page, per_page, total_pages }`. Quedarse
 * solo con `items` hace que el contador de la pantalla muestre el tamaño de la
 * página —20— en vez del total real del catálogo.
 */
export function paginaInsumosDesdeBackend(d: any): { items: Insumo[]; total: number; paginas: number } {
  const items = insumosDesdeBackend(d);
  return {
    items,
    total: Number(campo(d, 'total') ?? items.length) || items.length,
    paginas: Number(campo(d, 'total_pages', 'totalPages') ?? 1) || 1,
  };
}

// ── AIU ────────────────────────────────────────────────────

/** Interfaz → backend: pctAdministracion, pctImprevistos, pctUtilidad, pctIva. */
export function aiuABackend(a: Partial<Aiu>) {
  return {
    pctAdministracion: a.administracionPct ?? 0,
    pctImprevistos: a.imprevistosPct ?? 0,
    pctUtilidad: a.utilidadPct ?? 0,
    ivaAplica: a.ivaAplica ?? false,
    pctIva: a.ivaPct ?? 19,
    // El backend admite calcular el IVA sobre distintas bases; se fija TOTAL,
    // que es como lo calcula el resumen financiero de la pantalla.
    baseIva: 'TOTAL' as const,
    descuento: a.descuento ?? 0,
  };
}

/** Backend → interfaz. Acepta las dos convenciones por si cambia el contrato. */
export function aiuDesdeBackend(d: any): Aiu {
  return {
    administracionPct: num(campo(d, 'pctAdministracion', 'administracionPct', 'administracion_pct'), 0),
    imprevistosPct: num(campo(d, 'pctImprevistos', 'imprevistosPct', 'imprevistos_pct'), 0),
    utilidadPct: num(campo(d, 'pctUtilidad', 'utilidadPct', 'utilidad_pct'), 0),
    ivaAplica: !!campo(d, 'ivaAplica', 'iva_aplica'),
    ivaPct: num(campo(d, 'pctIva', 'ivaPct', 'iva_pct'), 19),
    descuento: num(campo(d, 'descuento'), 0),
    costoDirecto: campo(d, 'costoDirecto', 'costo_directo'),
    aiuTotal: campo(d, 'aiuTotal', 'aiu_total'),
    total: campo(d, 'total'),
  };
}

// ── Proyecto ───────────────────────────────────────────────

/** Interfaz → backend: area_m2 y tipo_obra en snake_case, AIU anidado. */
export function proyectoABackend(p: NuevoProyecto, aiu?: Partial<Aiu>) {
  return {
    nombre: p.nombre,
    cliente: p.cliente || undefined,
    ubicacion: p.ubicacion || undefined,
    area_m2: p.areaM2,
    tipo_obra: p.tipoObra,
    fecha: p.fecha,
    // El descuento no va suelto: pertenece al bloque de AIU. Y si no se pasan
    // porcentajes se usan los de arranque, no ceros: crear un proyecto con
    // 0/0/0 daría un total igual al costo directo.
    aiu: aiuABackend({ ...AIU_POR_DEFECTO, ...aiu, descuento: p.descuento ?? aiu?.descuento ?? 0 }),
  };
}

/** Backend → interfaz. Acepta snake_case y camelCase. */
export function proyectoDesdeBackend(d: any): Proyecto {
  return {
    id: String(campo(d, 'id') ?? ''),
    nombre: campo(d, 'nombre') ?? '',
    cliente: campo(d, 'cliente'),
    ubicacion: campo(d, 'ubicacion'),
    areaM2: num(campo(d, 'area_m2', 'areaM2'), 0),
    tipoObra: campo(d, 'tipo_obra', 'tipoObra') as TipoObra | undefined,
    fecha: campo(d, 'fecha'),
    descuento: num(campo(d, 'descuento') ?? campo(d, 'aiu')?.descuento, 0),
    estado: campo(d, 'estado'),
    costoDirecto: campo(d, 'costoDirecto', 'costo_directo'),
    total: campo(d, 'total'),
    creadoEn: campo(d, 'creadoEn', 'creado_en', 'created_at'),
    version: campo(d, 'version'),
  };
}

/** Lista de proyectos: tolera array directo o envuelto con paginación. */
export function proyectosDesdeBackend(d: any): Proyecto[] {
  const arr = Array.isArray(d) ? d : (d?.items ?? d?.data ?? d?.results ?? []);
  return (Array.isArray(arr) ? arr : []).map(proyectoDesdeBackend);
}
