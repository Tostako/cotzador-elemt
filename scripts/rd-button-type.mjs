// ─────────────────────────────────────────────────────────────
// Codemod: agrega type="button" a todo <button> que no tenga type.
// Seguro para este proyecto porque NO hay ningún <form> (un botón sin
// type nunca envía nada). Arregla la regla react-doctor/button-has-type.
//
// Uso (desde element-cotizador/):
//   node scripts/rd-button-type.mjs
// ─────────────────────────────────────────────────────────────
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
let totalButtons = 0;
let totalAdded = 0;
const touched = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) processFile(p);
  }
}

function processFile(file) {
  const src = readFileSync(file, 'utf8');
  let out = '';
  let i = 0;
  let changed = false;

  while (i < src.length) {
    const idx = src.indexOf('<button', i);
    if (idx === -1) { out += src.slice(i); break; }

    // ¿Es una etiqueta real? El char siguiente debe ser espacio, > o /
    const nextCh = src[idx + 7];
    if (!/[\s>/]/.test(nextCh)) {
      out += src.slice(i, idx + 7);
      i = idx + 7;
      continue;
    }

    // Buscar el '>' que cierra la etiqueta de apertura, respetando
    // expresiones {…} y strings "…" '…' `…`
    let j = idx + 7, depth = 0, quote = null, end = -1;
    while (j < src.length) {
      const c = src[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'" || c === '`') {
        quote = c;
      } else if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) { end = j; break; }
      j++;
    }
    if (end === -1) { out += src.slice(i); break; }

    totalButtons++;
    const tag = src.slice(idx, end + 1);
    if (/\btype\s*=/.test(tag)) {
      out += src.slice(i, end + 1); // ya tiene type: no tocar
    } else {
      out += src.slice(i, idx) + '<button type="button"' + src.slice(idx + 7, end + 1);
      totalAdded++;
      changed = true;
    }
    i = end + 1;
  }

  if (changed) {
    writeFileSync(file, out);
    touched.push(file);
  }
}

walk(ROOT);
console.log(`Botones encontrados: ${totalButtons}`);
console.log(`type="button" agregado: ${totalAdded}`);
console.log(`Archivos modificados: ${touched.length}`);
touched.forEach((f) => console.log('  · ' + f));
