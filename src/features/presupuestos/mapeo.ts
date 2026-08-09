import { AIU_POR_DEFECTO, type Aiu, type NuevoProyecto, type Proyecto, type TipoObra } from './types';

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
