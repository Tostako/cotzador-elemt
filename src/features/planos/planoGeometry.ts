// Tipos y helpers de geometría compartidos por el editor de planos y el mapeo backend.

export type PlanoNode = { id: string; x: number; y: number };
// Una columna adosada al muro: ancho (a lo largo del muro) y saliente/fondo (lo que sobresale al cuarto), en cm.
export type ColumnaMuro = { ancho: number; fondo: number };
export type PlanoWall = { id: string; a: string; b: string; opening: boolean; columnas?: ColumnaMuro[] };
export type Espacio = {
  id: string;
  nombre: string;
  tipo: string; // 'habitacion' por defecto
  nodes: PlanoNode[];
  walls: PlanoWall[];
};
export type Nivel = { id: string; nombre: string; espacios: Espacio[] };
export type Dir = 'N' | 'S' | 'E' | 'W';

export const SNAP_M = 0.2;
export const DIRV: Record<Dir, { x: number; y: number }> = {
  N: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
};
export const ROOM_COLORS = ['#b69462', '#60a5fa', '#34d399', '#f59e0b', '#c084fc', '#f472b6'];

export const uid = () => Math.random().toString(36).slice(2, 9);

export function newEspacio(nombre: string, origin = { x: 0, y: 0 }): Espacio {
  return { id: uid(), nombre, tipo: 'habitacion', nodes: [{ id: uid(), x: origin.x, y: origin.y }], walls: [] };
}

/** Anillo ordenado de nodos si el espacio es un polígono cerrado simple; si no, null. */
export function computeRing(nodes: PlanoNode[], walls: PlanoWall[]): PlanoNode[] | null {
  if (nodes.length < 3 || walls.length < 3) return null;
  const adj = new Map<string, string[]>();
  for (const w of walls) {
    (adj.get(w.a) ?? adj.set(w.a, []).get(w.a)!).push(w.b);
    (adj.get(w.b) ?? adj.set(w.b, []).get(w.b)!).push(w.a);
  }
  for (const n of nodes) if ((adj.get(n.id)?.length ?? 0) !== 2) return null;
  const start = nodes[0].id;
  const order = [start];
  let prev: string | null = null;
  let cur = start;
  for (let guard = 0; guard < nodes.length + 1; guard++) {
    const next = adj.get(cur)!.find((x) => x !== prev);
    if (next === undefined) return null;
    if (next === start) {
      return order.length === nodes.length ? order.map((id) => nodes.find((n) => n.id === id)!) : null;
    }
    if (order.includes(next)) return null;
    order.push(next);
    prev = cur;
    cur = next;
  }
  return null;
}

export function shoelaceArea(ring: PlanoNode[]): number {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function wallLength(nodes: PlanoNode[], w: PlanoWall): number {
  const a = nodes.find((n) => n.id === w.a);
  const b = nodes.find((n) => n.id === w.b);
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}

export function espacioArea(e: Espacio): number {
  const ring = computeRing(e.nodes, e.walls);
  return ring ? shoelaceArea(ring) : 0;
}

export function espacioPerimetros(e: Espacio): { total: number; conMuro: number } {
  const total = e.walls.reduce((s, w) => s + wallLength(e.nodes, w), 0);
  const conMuro = e.walls.filter((w) => !w.opening).reduce((s, w) => s + wallLength(e.nodes, w), 0);
  return { total, conMuro };
}

/** Total de columnas marcadas en los muros del espacio. */
export function espacioColumnas(e: Espacio): number {
  return e.walls.reduce((s, w) => s + (w.columnas?.length || 0), 0);
}

/** Perímetro extra (m) que aportan las columnas: cada una suma 2 × saliente. */
export function espacioColumnasExtra(e: Espacio): number {
  return e.walls.reduce(
    (s, w) => s + (w.columnas || []).reduce((ss, c) => ss + (2 * (c.fondo || 0)) / 100, 0),
    0
  );
}
