import { apiService, extractData } from './api';

/** Producto del catálogo tal como lo devuelve /quote-catalog/products. */
export type ProductoCatalogo = {
  id: string;
  category_id?: string;
  name?: string;
  description?: string | null;
  prices?: Array<{ hardware_store?: string; brand?: string; price?: string | number; notes?: string }>;
  lowest_price?: number | null;
};

/**
 * Trae los productos de UNA categoría del catálogo, buscándola por nombre.
 *
 * El filtrado se repite en el cliente a propósito: `/quote-catalog/products`
 * sin parámetros devuelve todas las categorías juntas (barrederas, cornisas,
 * enchapes…), así que si el backend llegara a ignorar `?category_id=` los
 * materiales de una calculadora aparecerían en las otras. Con el filtro local
 * el resultado es correcto en ambos casos.
 *
 * Devuelve [] si la categoría no existe todavía (nadie ha exportado aún).
 */
export async function productosDeCategoria(nombreCategoria: string): Promise<ProductoCatalogo[]> {
  const objetivo = nombreCategoria.trim().toLowerCase();
  const cats = extractData(await apiService.getCatalogCategories());
  const cat = (Array.isArray(cats) ? cats : []).find(
    (c: any) => String(c?.name || '').trim().toLowerCase() === objetivo
  );
  if (!cat?.id) return [];

  const res = extractData(await apiService.getCatalogProducts(String(cat.id)));
  const todos: ProductoCatalogo[] = Array.isArray(res) ? res : [];
  return todos.filter((p) => String(p?.category_id ?? cat.id) === String(cat.id));
}

/**
 * Precio a usar para un producto: el más barato entre sus ferreterías.
 *
 * Es para lo que sirve tener varios precios por producto, y es el valor que el
 * backend ya calcula en `lowest_price`. Si no viene, se toma el mínimo de
 * `prices` (llegan como cadena, p. ej. "12000.00").
 */
export function precioDe(p: ProductoCatalogo): number {
  if (typeof p.lowest_price === 'number' && p.lowest_price > 0) return p.lowest_price;
  const nums = (p.prices || [])
    .map((x) => Number(x?.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? Math.min(...nums) : 0;
}

/** Separa "Nombre - Color" en sus dos partes (así los guarda el catálogo). */
export function partirNombreColor(nombre: string): { nombre: string; color: string } {
  const i = nombre.lastIndexOf(' - ');
  if (i === -1) return { nombre: nombre.trim(), color: '' };
  return { nombre: nombre.slice(0, i).trim(), color: nombre.slice(i + 3).trim() };
}

const num = (s: string | undefined) => {
  const n = parseFloat(String(s ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Reconstruye los datos que barrederas y cornisas escriben en `description`.
 * Formatos generados por sus `guardarEnCatalogo`:
 *   barrederas metro:    "aluminio · por metro · altura 10 cm"
 *   barrederas cerámica: "aluminio · cerámica 50 cm · 3 tira(s)/cerámica"
 *   cornisas metro:      "poliuretano · por metro · desarrollo 7.5 cm"
 *   cornisas tira:       "poliuretano · tira de 600 cm · desarrollo 7.5 cm"
 */
export function leerDescripcionLineal(desc: string | null | undefined): {
  tipo: string;
  porMetro: boolean;
  largo_cm: number;
  piezas: number;
  altura: number;
} {
  const d = String(desc || '');
  const partes = d.split('·').map((s) => s.trim());
  const tipo = partes[0] || '';
  const porMetro = /por metro/i.test(d);

  const mLargo = d.match(/(?:cer[áa]mica|tira de)\s+([\d.,]+)\s*cm/i);
  const mPiezas = d.match(/([\d.,]+)\s*tira\(s\)/i);
  const mAltura = d.match(/(?:altura|desarrollo)\s+([\d.,]+)\s*cm/i);

  return {
    tipo,
    porMetro,
    largo_cm: mLargo ? num(mLargo[1]) : 0,
    piezas: mPiezas ? Math.max(1, Math.round(num(mPiezas[1]))) : 1,
    altura: mAltura ? num(mAltura[1]) : 0,
  };
}

/**
 * Reconstruye lo que enchapes escribe en `description`:
 *   "Cerámica · Formato 120×120×0.2 cm · Uso: Ambos · Marca: material"
 */
export function leerDescripcionEnchape(desc: string | null | undefined): {
  tipoAcabado: string;
  formatoLargo?: number;
  formatoAncho?: number;
  formatoGrosor?: number;
  categoria: 'Piso' | 'Pared' | 'Ambos';
  marca: string;
} {
  const d = String(desc || '');
  const partes = d.split('·').map((s) => s.trim());
  const mFormato = d.match(/Formato\s+([\d.,]+)×([\d.,]+)(?:×([\d.,]+))?\s*cm/i);
  const mUso = d.match(/Uso:\s*(Piso|Pared|Ambos)/i);
  const mMarca = d.match(/Marca:\s*(.+?)(?:\s*·|$)/i);

  const uso = (mUso?.[1] || 'Ambos') as 'Piso' | 'Pared' | 'Ambos';
  return {
    tipoAcabado: partes[0] || 'Cerámica',
    formatoLargo: mFormato ? num(mFormato[1]) : undefined,
    formatoAncho: mFormato ? num(mFormato[2]) : undefined,
    formatoGrosor: mFormato?.[3] ? num(mFormato[3]) : undefined,
    categoria: uso,
    marca: mMarca ? mMarca[1].trim() : '',
  };
}
