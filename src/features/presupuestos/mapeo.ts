import {
  AIU_POR_DEFECTO,
  type ActividadPresupuesto, type Aiu, type Apu, type ApuSnapshot, type Aviso,
  type Capitulo, type ComponenteApu, type GrupoRecurso, type Insumo,
  type NuevoProyecto, type OrigenApu, type Plantilla, type Presupuesto,
  type Proyecto, type TipoObra,
} from './types';

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
 * Lista que puede llegar pelada o envuelta en paginación.
 *
 * `supplies` responde `{ items, total, … }` y otras rutas devuelven el array
 * directo. Un `Array.isArray(d) ? d : []` deja la lista vacía sin avisar
 * cuando acierta la forma equivocada — y una lista vacía parece un catálogo
 * sin datos, no un error de lectura.
 */
export const listaDesdeBackend = (d: any): any[] =>
  Array.isArray(d) ? d : (d?.items ?? d?.data ?? d?.results ?? []);

/** Capítulos del catálogo, ordenados por `orden` si el servidor lo manda. */
export function capitulosDesdeBackend(d: any): Capitulo[] {
  const items = listaDesdeBackend(d).map((c: any) => ({
    id: String(campo(c, 'id') ?? ''),
    nombre: campo(c, 'nombre', 'name') ?? '',
    // `codigo` llega null si no se dio: se normaliza a undefined para que las
    // pantallas puedan usar `?? '—'` sin que salga «null».
    codigo: campo(c, 'codigo', 'code') ?? undefined,
    orden: campo(c, 'orden', 'order') ?? undefined,
  }));
  // El orden de los capítulos no es cosmético: es el del presupuesto impreso.
  // Los que no lo traen van al final, y entre ellos por nombre.
  return items.sort((a, b) => {
    const oa = a.orden ?? Number.MAX_SAFE_INTEGER;
    const ob = b.orden ?? Number.MAX_SAFE_INTEGER;
    return oa !== ob ? oa - ob : a.nombre.localeCompare(b.nombre, 'es');
  });
}

/**
 * APU nuevo → backend.
 *
 * Dos exigencias del DTO que no se ven venir: `codigo` es obligatorio y como
 * mucho 30 caracteres, y los componentes llevan **`insumo_id`** en snake_case
 * aunque el resto del cuerpo vaya en camelCase.
 */
export function apuABackend(a: {
  descripcion: string;
  unidad: string;
  codigo: string;
  capituloId?: string;
  origen?: OrigenApu;
  componentes: Array<{ insumoId: string; rendimiento: number }>;
}) {
  return {
    descripcion: a.descripcion,
    unidad: a.unidad,
    codigo: a.codigo.slice(0, 30),
    // El campo es `chapter_id`, en inglés y snake_case, aunque el resto del
    // cuerpo vaya en español. Mandarlo como `capituloId` no da error: el
    // capítulo se pierde en silencio y el APU queda suelto.
    ...(a.capituloId ? { chapter_id: a.capituloId } : {}),
    origen: a.origen ?? 'PERSONALIZADO',
    componentes: a.componentes.map((c) => ({
      insumo_id: c.insumoId,
      rendimiento: c.rendimiento,
    })),
  };
}

/**
 * Componentes tal como los devuelve el servidor: filas crudas con `insumo_id`
 * y `rendimiento`, sin descripción ni precio. Se completan con
 * `enriquecerComponentes` cruzando contra el maestro de insumos.
 */
export function componentesDesdeBackend(d: any): ComponenteApu[] {
  return listaDesdeBackend(d).map((c: any) => ({
    insumoId: String(campo(c, 'insumo_id', 'insumoId') ?? ''),
    cantidad: num(campo(c, 'rendimiento', 'cantidad'), 0),
    // Si algún día el servidor los enriquece, se aprovechan sin cambiar nada.
    descripcion: campo(c, 'descripcion', 'nombre'),
    unidad: campo(c, 'unidad'),
    grupo: campo(c, 'grupo') ? grupoDesdeBackend(campo(c, 'grupo')) : undefined,
    valorUnitario: campo(c, 'valorUnitario', 'valor_unitario', 'precio_vigente'),
    subtotal: campo(c, 'subtotal'),
  }));
}

/**
 * Rellena descripción, unidad, grupo y precio de cada componente con los datos
 * del maestro, y calcula el subtotal como rendimiento × precio.
 *
 * Un componente cuyo insumo ya no está en el maestro se marca como huérfano en
 * vez de mostrarse en blanco: una fila vacía parece un fallo de carga, y esto
 * es un dato que falta de verdad.
 */
export function enriquecerComponentes(
  componentes: ComponenteApu[],
  maestro: Map<string, Insumo>,
): ComponenteApu[] {
  return componentes.map((c) => {
    const insumo = maestro.get(c.insumoId);
    if (!insumo) {
      return { ...c, huerfano: true, descripcion: c.descripcion ?? 'Insumo no encontrado', grupo: c.grupo ?? 'MATERIALES' };
    }
    const precio = num(c.valorUnitario ?? insumo.valorUnitario, 0);
    return {
      ...c,
      descripcion: c.descripcion ?? insumo.descripcion,
      unidad: c.unidad ?? insumo.unidad,
      grupo: c.grupo ?? insumo.grupo,
      valorUnitario: String(precio),
      subtotal: c.subtotal ?? String(precio * c.cantidad),
    };
  });
}

/**
 * Presupuesto del proyecto → interfaz.
 *
 * La respuesta es **plana**: `{ costo_directo, total, aiu, items[], avisos }`.
 * No hay `capitulos` ni `totales`, que es lo que leía la pantalla — y como
 * `[].every()` devuelve `true`, un presupuesto lleno se daba por vacío y
 * parecía que las actividades se habían perdido. Estaban guardadas.
 *
 * Los items vienen sueltos, sin capítulo. Si alguno lo trae se agrupa por él;
 * si no, todo va a un único grupo sin nombre, que es más honesto que inventar
 * una jerarquía que el servidor no da.
 */
export function presupuestoDesdeBackend(d: any): Presupuesto {
  const items = listaDesdeBackend(campo(d, 'items', 'actividades') ?? d);

  const actividades: ActividadPresupuesto[] = items.map((i: any) => {
    const snap = campo(i, 'apu_snapshot', 'apuSnapshot');
    const idCap = campo(i, 'chapter_id', 'capitulo_id', 'capituloId');
    const nomCap = campo(i, 'capitulo_nombre', 'capituloNombre')
      ?? (typeof campo(i, 'capitulo') === 'object' ? campo(campo(i, 'capitulo'), 'nombre') : campo(i, 'capitulo'));
    return {
      id: String(campo(i, 'item_id', 'id') ?? ''),
      capitulo: { id: String(idCap ?? ''), nombre: nomCap ?? '' },
      descripcion: campo(i, 'descripcion') ?? '',
      unidad: campo(i, 'unidad') ?? '',
      cantidad: String(campo(i, 'cantidad') ?? '0'),
      valorUnitario: String(campo(i, 'valor_unitario', 'valorUnitario') ?? '0'),
      valorParcial: String(campo(i, 'subtotal', 'valorParcial', 'valor_parcial') ?? '0'),
      // El `PATCH` lo exige como If-Match; sin él, cambiar la cantidad falla.
      etag: campo(i, 'etag'),
      apuSnapshot: snap ? apuSnapshotDesdeBackend(snap) : undefined,
      tieneMemoria: campo(i, 'tieneMemoria', 'tiene_memoria'),
      cantidadDesdeMemoria: campo(i, 'cantidadDesdeMemoria', 'cantidad_desde_memoria'),
    };
  });

  // Agrupación por capítulo conservando el orden de llegada.
  const porCapitulo = new Map<string, Capitulo & { actividades: ActividadPresupuesto[] }>();
  for (const a of actividades) {
    const clave = a.capitulo.id || a.capitulo.nombre || '';
    const grupo = porCapitulo.get(clave)
      ?? { id: a.capitulo.id, nombre: a.capitulo.nombre || 'Sin capítulo', actividades: [] };
    grupo.actividades.push(a);
    porCapitulo.set(clave, grupo);
  }
  const capitulos = Array.from(porCapitulo.values()).map((c) => ({
    ...c,
    subtotal: String(c.actividades.reduce((s, a) => s + num(a.valorParcial), 0)),
  }));

  return {
    capitulos,
    totales: {
      costoDirecto: String(campo(d, 'costo_directo', 'costoDirecto') ?? '0'),
      aiu: campo(d, 'aiu_valor', 'aiuValor'),
      total: String(campo(d, 'total') ?? '0'),
    },
    aiu: campo(d, 'aiu') ? aiuDesdeBackend(campo(d, 'aiu')) : undefined,
    avisos: d?.avisos ? avisosDesdeBackend(d.avisos) : undefined,
  };
}

/** La instantánea sí llega enriquecida: no hace falta cruzarla con el maestro. */
export function apuSnapshotDesdeBackend(d: any): ApuSnapshot {
  return {
    apuId: String(campo(d, 'apu_id', 'apuId') ?? ''),
    codigo: campo(d, 'codigo'),
    descripcion: campo(d, 'descripcion') ?? '',
    unidad: campo(d, 'unidad') ?? '',
    valorUnitario: String(campo(d, 'valor_unitario', 'valorUnitario') ?? '0'),
    version: campo(d, 'version'),
    capturadoEn: campo(d, 'capturado_en', 'capturadoEn'),
    componentes: listaDesdeBackend(campo(d, 'componentes')).map((c: any) => ({
      insumoId: String(campo(c, 'insumo_id', 'insumoId') ?? ''),
      descripcion: campo(c, 'descripcion') ?? '',
      unidad: campo(c, 'unidad') ?? '',
      grupo: grupoDesdeBackend(campo(c, 'grupo')),
      rendimiento: num(campo(c, 'rendimiento', 'cantidad'), 0),
      valor: String(campo(c, 'valor', 'valor_unitario', 'valorUnitario') ?? '0'),
      subtotal: String(campo(c, 'subtotal') ?? '0'),
    })),
  };
}

/**
 * Plantillas del catálogo.
 *
 * El listado usa `alcance` y `area_referencia`, no `descripcion` ni `area_m2`:
 * leerlas por el nombre equivocado dejaba las tarjetas medio en blanco.
 * `actividades` aquí es el **conteo**, no el array.
 */
export function plantillasDesdeBackend(d: any): Plantilla[] {
  return listaDesdeBackend(d).map((p: any) => ({
    id: String(campo(p, 'id') ?? ''),
    codigo: campo(p, 'codigo') ?? '',
    nombre: campo(p, 'nombre') ?? 'Plantilla',
    alcance: campo(p, 'alcance', 'descripcion') ?? undefined,
    areaReferencia: campo(p, 'area_referencia', 'areaReferencia') !== undefined
      ? num(campo(p, 'area_referencia', 'areaReferencia'))
      : undefined,
    valorReferencia: campo(p, 'valor_referencia', 'valorReferencia'),
    actividades: typeof campo(p, 'actividades') === 'number' ? campo(p, 'actividades') : undefined,
    origen: campo(p, 'origen'),
  }));
}

/** Avisos del servidor; el mensaje es lo único que siempre viene. */
export function avisosDesdeBackend(d: any): Aviso[] {
  return listaDesdeBackend(d)
    .map((a: any) => ({
      mensaje: campo(a, 'mensaje', 'message', 'texto') ?? '',
      tipo: campo(a, 'tipo', 'type'),
      codigo: campo(a, 'codigo', 'code'),
      campo: campo(a, 'field', 'campo'),
      bloqueante: !!campo(a, 'bloqueante', 'blocking'),
    }))
    .filter((a) => a.mensaje);
}

/** Marcas diacríticas combinantes. Se construye con escapes ASCII a propósito:
 *  el rango escrito literal se corrompe al pasar por algunas herramientas. */
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * APU del catálogo → interfaz.
 *
 * El valor unitario se busca por varios nombres a propósito: con los insumos
 * el precio venía en `precio_vigente` y leerlo como `valorUnitario` dejó toda
 * la columna en cero sin dar un solo error. Aquí el riesgo es el mismo.
 */
export function apuDesdeBackend(d: any): Apu {
  const cap = campo(d, 'capitulo', 'chapter');
  const idCapitulo = campo(d, 'chapter_id', 'capitulo_id', 'capituloId');
  const nombreCapitulo = campo(d, 'capitulo_nombre', 'capituloNombre');
  return {
    ...d,
    id: String(campo(d, 'id') ?? ''),
    descripcion: campo(d, 'descripcion', 'nombre') ?? '',
    unidad: campo(d, 'unidad') ?? '',
    codigo: campo(d, 'codigo') ?? undefined,
    origen: campo(d, 'origen'),
    capitulo: cap && typeof cap === 'object'
      ? { id: String(campo(cap, 'id') ?? ''), nombre: campo(cap, 'nombre', 'name') ?? '' }
      // Sin objeto anidado, el APU solo trae `chapter_id`: el nombre lo pone
      // quien lo pinte, cruzando con la lista de capítulos.
      : idCapitulo || nombreCapitulo
        ? { id: String(idCapitulo ?? ''), nombre: nombreCapitulo ?? '' }
        : undefined,
    valorUnitario: String(
      campo(d, 'costo_unitario', 'costoUnitario', 'valorUnitario', 'valor_unitario', 'precioUnitario', 'precio_unitario', 'total') ?? '0'
    ),
    componentes: d?.componentes ? componentesDesdeBackend(d.componentes) : undefined,
    avisos: d?.avisos ? avisosDesdeBackend(d.avisos) : undefined,
  };
}

export const apusDesdeBackend = (d: any): Apu[] => listaDesdeBackend(d).map(apuDesdeBackend);

/**
 * Actividad nueva del presupuesto → backend.
 *
 * `AddItemDto` espera **`apu_id`** en snake_case con un UUID v4, y `cantidad`.
 * Mandar `apuId` deja el campo indefinido y el servidor responde «Apu_id no
 * tiene un formato válido», que suena a id mal formado y no a nombre de campo
 * equivocado — que es lo que realmente pasa.
 */
export function actividadABackend(a: { apuId: string; cantidad: number; capituloId?: string }) {
  return {
    apu_id: a.apuId,
    cantidad: a.cantidad,
    ...(a.capituloId ? { chapter_id: a.capituloId } : {}),
  };
}

/** Código a partir de la descripción, para no pedírselo al usuario dos veces. */
export function codigoSugerido(descripcion: string, maximo = 30): string {
  const limpio = descripcion
    .normalize('NFD').replace(DIACRITICOS, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return limpio.slice(0, maximo).replace(/-+$/, '') || 'APU';
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
