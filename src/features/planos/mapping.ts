// Conversión entre el estado del editor (nodos/muros = polígono) y el JSON del backend de house-plans.
import {
  type Nivel,
  type Espacio,
  type PlanoWall,
  type ColumnaMuro,
  uid,
  newEspacio,
  computeRing,
  shoelaceArea,
  espacioPerimetros,
} from './planoGeometry';

export type PlanoMeta = { nombre: string; propietario: string; ubicacion: string };

const r2 = (n: number) => Math.round(n * 100) / 100;

// Reconstruye las columnas del muro desde el JSON del backend.
// Formato óptimo (plano): { columnas: number, col_ancho: number, col_fondo: number }.
// También tolera formatos viejos: columnas como array de {ancho,fondo} o como número suelto.
function buildColumnas(m: any): ColumnaMuro[] {
  if (Array.isArray(m?.columnas)) {
    return m.columnas.map((c: any) => ({ ancho: Number(c?.ancho) || 0, fondo: Number(c?.fondo) || 0 }));
  }
  const n = Math.max(0, Math.round(Number(m?.columnas) || 0));
  if (n === 0) return [];
  const ancho = Number(m?.col_ancho) || 30;
  const fondo = Number(m?.col_fondo) || 15;
  return Array.from({ length: n }, () => ({ ancho, fondo }));
}

/** Estado del editor → payload para POST/PUT /house-plans. */
export function toBackendPlan(meta: PlanoMeta, niveles: Nivel[]) {
  return {
    nombre: meta.nombre.trim(),
    propietario: meta.propietario.trim(),
    ubicacion: meta.ubicacion.trim(),
    niveles: niveles.map((nv) => ({
      id: nv.id,
      nombre: nv.nombre,
      espacios: nv.espacios.map((e) => toBackendEspacio(e)),
    })),
  };
}

function toBackendEspacio(e: Espacio) {
  const xs = e.nodes.map((n) => n.x);
  const ys = e.nodes.map((n) => n.y);
  const minX = xs.length ? Math.min(...xs) : 0;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxX = xs.length ? Math.max(...xs) : 0;
  const maxY = ys.length ? Math.max(...ys) : 0;
  const ring = computeRing(e.nodes, e.walls);
  const area = ring ? shoelaceArea(ring) : 0;
  const perim = espacioPerimetros(e);
  return {
    id: e.id,
    nombre: e.nombre,
    tipo: e.tipo || 'habitacion',
    // Geometría real (polígono) — EL BACKEND DEBE GUARDAR Y DEVOLVER estos campos:
    nodos: e.nodes.map((n) => ({ id: n.id, x: r2(n.x), y: r2(n.y) })),
    muros: e.walls.map((w) => {
      const cols = w.columnas || [];
      return {
        a: w.a,
        b: w.b,
        abertura: w.opening,
        // Formato plano: cantidad + medidas (cm). Todas las columnas de un muro comparten medida.
        columnas: cols.length,
        col_ancho: r2(cols[0]?.ancho || 0),
        col_fondo: r2(cols[0]?.fondo || 0),
      };
    }),
    // Contorno ordenado (respaldo simple si el backend solo guarda un array de puntos):
    puntos: ring ? ring.map((n) => ({ x: r2(n.x), y: r2(n.y) })) : [],
    // Derivados para compatibilidad con el contrato actual (rectángulo/bbox):
    segmentos: [{ largo: r2(maxX - minX), ancho: r2(maxY - minY) }],
    x: r2(minX),
    y: r2(minY),
    area: r2(area),
    perimetro: r2(perim.total),
    perimetro_muro: r2(perim.conMuro),
  };
}

/** JSON del backend → estado del editor. */
export function fromBackendPlan(plan: any): { meta: PlanoMeta; niveles: Nivel[] } {
  const meta: PlanoMeta = {
    nombre: plan?.nombre ?? '',
    propietario: plan?.propietario ?? '',
    ubicacion: plan?.ubicacion ?? '',
  };
  const nivelesRaw = Array.isArray(plan?.niveles) ? plan.niveles : [];
  let niveles: Nivel[] = nivelesRaw.map((nv: any) => ({
    id: nv?.id || uid(),
    nombre: nv?.nombre || 'Piso',
    espacios: (Array.isArray(nv?.espacios) ? nv.espacios : []).map(fromBackendEspacio),
  }));

  // Invariantes que el editor asume: >=1 nivel, cada nivel >=1 espacio, cada espacio >=1 nodo.
  if (niveles.length === 0) {
    niveles = [{ id: uid(), nombre: 'Planta Baja', espacios: [newEspacio('Habitación 1')] }];
  }
  niveles = niveles.map((nv) => ({
    ...nv,
    espacios: nv.espacios.length ? nv.espacios : [newEspacio('Habitación 1')],
  }));
  return { meta, niveles };
}

function fromBackendEspacio(e: any): Espacio {
  const id = e?.id || uid();
  const nombre = e?.nombre || 'Habitación';
  const tipo = e?.tipo || 'habitacion';

  // 1) Si viene la geometría real (nodos/muros), la reconstruimos.
  if (Array.isArray(e?.nodos) && e.nodos.length) {
    const nodes = e.nodos.map((n: any) => ({ id: n?.id || uid(), x: Number(n?.x) || 0, y: Number(n?.y) || 0 }));
    const walls: PlanoWall[] = (Array.isArray(e?.muros) ? e.muros : []).map((m: any) => ({
      id: uid(),
      a: m?.a,
      b: m?.b,
      opening: !!(m?.abertura ?? m?.apertura ?? m?.opening),
      columnas: buildColumnas(m),
    })).filter((w: PlanoWall) => w.a && w.b);
    return { id, nombre, tipo, nodes, walls };
  }

  // 2) Si vino el contorno como "puntos", reconstruimos el polígono (muros sólidos, se pierde info de aberturas).
  if (Array.isArray(e?.puntos) && e.puntos.length >= 2) {
    const nodes = e.puntos.map((p: any) => ({ id: uid(), x: Number(p?.x) || 0, y: Number(p?.y) || 0 }));
    const walls: PlanoWall[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % nodes.length];
      if (a.id !== b.id) walls.push({ id: uid(), a: a.id, b: b.id, opening: false });
    }
    return { id, nombre, tipo, nodes, walls };
  }

  // 3) Fallback: reconstruir un rectángulo desde segmentos + x/y.
  const seg = Array.isArray(e?.segmentos) ? e.segmentos[0] : undefined;
  const largo = Number(seg?.largo) || 0;
  const ancho = Number(seg?.ancho) || 0;
  const x0 = Number(e?.x) || 0;
  const y0 = Number(e?.y) || 0;
  if (largo > 0 && ancho > 0) {
    const n0 = { id: uid(), x: x0, y: y0 };
    const n1 = { id: uid(), x: x0 + largo, y: y0 };
    const n2 = { id: uid(), x: x0 + largo, y: y0 + ancho };
    const n3 = { id: uid(), x: x0, y: y0 + ancho };
    const nodes = [n0, n1, n2, n3];
    const walls: PlanoWall[] = [
      { id: uid(), a: n0.id, b: n1.id, opening: false },
      { id: uid(), a: n1.id, b: n2.id, opening: false },
      { id: uid(), a: n2.id, b: n3.id, opening: false },
      { id: uid(), a: n3.id, b: n0.id, opening: false },
    ];
    return { id, nombre, tipo, nodes, walls };
  }

  // 3) Último recurso: un solo nodo.
  return { id, nombre, tipo, nodes: [{ id: uid(), x: x0, y: y0 }], walls: [] };
}
