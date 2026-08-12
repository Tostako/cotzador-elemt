/**
 * HU-13 · Exportación a hoja de cálculo.
 *
 * Solo salida. La importación no pasa por aquí: el archivo se sube tal cual y
 * lo parsea el servidor, así que no hay nada que leer en el cliente.
 */

/** Escapa un campo para CSV: comillas dobladas y todo el valor entrecomillado. */
export const celdaCsv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

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
