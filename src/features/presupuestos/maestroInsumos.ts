import { apiService, extractData } from '../../shared/services/api';
import { insumosDesdeBackend } from './mapeo';
import type { Insumo } from './types';

/**
 * Maestro de insumos indexado por id, en memoria.
 *
 * Hace falta porque los componentes de un APU llegan como filas crudas —solo
 * `insumo_id` y `rendimiento`—: la descripción, la unidad, el grupo y el precio
 * hay que cruzarlos contra el maestro. Sin esto, la composición de un APU se ve
 * en blanco y a cero.
 *
 * Se cachea a nivel de módulo porque el catálogo se consulta al desplegar cada
 * APU: pedirlo por fila sería una petición por clic sobre datos que no cambian
 * mientras se navega.
 */
let cache: Promise<Map<string, Insumo>> | null = null;

async function cargar(): Promise<Map<string, Insumo>> {
  // Se pide una página amplia: el cruce falla en silencio si el insumo del APU
  // quedó fuera por paginación, y se vería como «Insumo no encontrado».
  const d = extractData(await apiService.getInsumos({ perPage: 500 }));
  return new Map(insumosDesdeBackend(d).map((i) => [i.id, i]));
}

export function maestroInsumos(): Promise<Map<string, Insumo>> {
  if (!cache) {
    cache = cargar().catch((e) => {
      // Un fallo no debe dejar la caché envenenada: el siguiente intento
      // vuelve a pedirlo.
      cache = null;
      throw e;
    });
  }
  return cache;
}

/** Invalida la caché. Se llama tras tocar precios o crear insumos. */
export function olvidarMaestroInsumos() {
  cache = null;
}
