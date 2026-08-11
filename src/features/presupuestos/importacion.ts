/**
 * HU-13 · Utilidades compartidas de importación y exportación de hojas de
 * cálculo. Se mantienen aparte de los componentes porque las usan tanto el
 * catálogo de APUs como el maestro de insumos y las cotizaciones.
 */

import type { GrupoRecurso } from './types';

export const GRUPOS_VALIDOS: GrupoRecurso[] = ['MATERIALES', 'MANO_OBRA', 'EQUIPOS', 'TRANSPORTE'];

/** Escapa un campo para CSV: comillas dobladas y todo el valor entrecomillado. */
export const celdaCsv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * Divide una línea CSV respetando las comillas dobles de Excel.
 *
 * No basta con `split(sep)`: una descripción como «Bloque n.º 5, liso» sale
 * entrecomillada desde Excel y partirla por la coma la rompería en dos
 * columnas, desplazando todo el resto de la fila.
 */
export function partirLineaCsv(linea: string, sep: string): string[] {
  const salida: string[] = [];
  let actual = '';
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      // Dos comillas seguidas dentro del campo son una comilla literal.
      if (enComillas && linea[i + 1] === '"') { actual += '"'; i++; }
      else enComillas = !enComillas;
    } else if (c === sep && !enComillas) {
      salida.push(actual); actual = '';
    } else actual += c;
  }
  salida.push(actual);
  return salida.map((s) => s.trim());
}

/** Excel en español separa con punto y coma; el resto del mundo con coma. */
export const detectarSeparador = (cabecera: string) =>
  (cabecera.match(/;/g)?.length ?? 0) >= (cabecera.match(/,/g)?.length ?? 0) ? ';' : ',';

/** "32.000,50" o "$32,000.50" → 32000.5. Devuelve NaN si no hay número. */
export function leerNumero(texto: string): number {
  const limpio = texto.replace(/[^\d.,-]/g, '');
  // Si hay ambos separadores, el último que aparece es el decimal.
  const ultimaComa = limpio.lastIndexOf(',');
  const ultimoPunto = limpio.lastIndexOf('.');
  let normalizado: string;
  if (ultimaComa >= 0 && ultimoPunto >= 0) {
    normalizado = ultimaComa > ultimoPunto
      ? limpio.replace(/\./g, '').replace(',', '.')
      : limpio.replace(/,/g, '');
  } else if (ultimaComa >= 0) {
    // Una sola coma: decimal si deja 1 o 2 cifras detrás, si no es de millares.
    normalizado = limpio.length - ultimaComa - 1 <= 2 ? limpio.replace(',', '.') : limpio.replace(/,/g, '');
  } else {
    normalizado = ultimoPunto >= 0 && limpio.length - ultimoPunto - 1 > 2 ? limpio.replace(/\./g, '') : limpio;
  }
  return parseFloat(normalizado);
}

/**
 * Descarga una tabla como CSV.
 *
 * Separador de punto y coma y BOM al inicio: así es como Excel en español lo
 * abre directamente en columnas, sin pasar por el asistente de importación de
 * texto. Con coma y sin BOM el usuario ve todo en una sola columna y con los
 * acentos rotos.
 */
export function descargarCsv(nombre: string, filas: Array<Array<string | number>>) {
  const texto = '﻿' + filas.map((f) => f.map(celdaCsv).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre.replace(/[^\w-]+/g, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
