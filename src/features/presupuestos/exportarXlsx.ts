import { zipSync, strToU8 } from 'fflate';

/**
 * Generador mínimo de XLSX.
 *
 * Existe para que exportar e importar sean el mismo formato: el servidor solo
 * lee XLSX, así que exportar en CSV obligaba a pasar por Excel a convertir, y
 * el ciclo «exporto → edito precios → reimporto» se rompía por el camino.
 *
 * No se usa una librería de hojas de cálculo porque la más común pesa 309 KB
 * comprimidos —una cuarta parte del bundle— para una acción puntual. Un XLSX
 * es un zip con cinco XML, y `fflate` (8 KB) ya comprime. Aquí solo se escribe
 * lo que hace falta: una hoja, con texto y números. Nada de estilos, fórmulas
 * ni fechas.
 */

/** Caracteres de control que XML 1.0 no admite; se salvan tabulador, salto de
 *  línea y retorno de carro. Se construye con escapes ASCII a propósito: el
 *  rango escrito literal se corrompe al pasar por algunas herramientas y
 *  dejaría de filtrar nada. */
const CONTROL = new RegExp('[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f]', 'g');

/** Escapa lo que XML no admite dentro de un nodo o atributo. */
const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    .replace(CONTROL, '');

/** 0 → A, 25 → Z, 26 → AA. */
function letraColumna(indice: number): string {
  let n = indice + 1;
  let salida = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    salida = String.fromCharCode(65 + resto) + salida;
    n = Math.floor((n - 1) / 26);
  }
  return salida;
}

/**
 * Nombre de hoja válido: Excel rechaza el libro entero si no lo es.
 * Máximo 31 caracteres y sin `[ ] : * ? / \`.
 */
const nombreHojaValido = (n: string) => n.replace(/[[\]:*?/\\]/g, '').slice(0, 31) || 'Hoja1';

export type CeldaXlsx = string | number | null | undefined;

function celda(ref: string, valor: CeldaXlsx): string {
  if (valor === null || valor === undefined || valor === '') return '';
  // Los números van sin tipo (por defecto es numérico); el resto como cadena
  // en línea, que evita tener que mantener la tabla de cadenas compartidas.
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}"><v>${valor}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapar(String(valor))}</t></is></c>`;
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';

/** Construye el libro en memoria. `filas[0]` son los encabezados. */
export function construirXlsx(hoja: string, filas: CeldaXlsx[][]): Uint8Array {
  const nombre = nombreHojaValido(hoja);

  const cuerpo = filas.map((fila, f) => {
    const celdas = fila.map((v, c) => celda(`${letraColumna(c)}${f + 1}`, v)).join('');
    return `<row r="${f + 1}">${celdas}</row>`;
  }).join('');

  const sheet = `${XML}<worksheet xmlns="${NS}"><sheetData>${cuerpo}</sheetData></worksheet>`;

  const workbook = `${XML}<workbook xmlns="${NS}" xmlns:r="${NS_REL}">`
    + `<sheets><sheet name="${escapar(nombre)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const relsLibro = `${XML}<Relationships xmlns="${NS_PKG}">`
    + `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

  const relsRaiz = `${XML}<Relationships xmlns="${NS_PKG}">`
    + `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const tipos = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '</Types>';

  return zipSync({
    '[Content_Types].xml': strToU8(tipos),
    '_rels/.rels': strToU8(relsRaiz),
    'xl/workbook.xml': strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(relsLibro),
    'xl/worksheets/sheet1.xml': strToU8(sheet),
  });
}

/** Construye el libro y lo descarga. */
export function descargarXlsx(nombreArchivo: string, hoja: string, filas: CeldaXlsx[][]) {
  const datos = construirXlsx(hoja, filas);
  // El Blob necesita un ArrayBuffer propio; `datos.buffer` puede ser mayor.
  const blob = new Blob([datos.slice().buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo.replace(/[^\w-]+/g, '-').toLowerCase()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
