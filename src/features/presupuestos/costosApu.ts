import { useEffect, useState } from 'react';
import { apiService, extractData } from '../../shared/services/api';
import { apuDesdeBackend } from './mapeo';
import { aNumero, type Apu } from './types';

/**
 * Costos unitarios de los APUs del listado.
 *
 * `GET /catalog/apus` no devuelve el costo: solo lo calcula el detalle
 * (`costo_unitario` en `GET /catalog/apus/:id`). Por eso la lista mostraba $0
 * en todas las filas hasta desplegarlas una a una.
 *
 * Esto lo rellena pidiendo el detalle de los que falten, en tandas para no
 * lanzar cien peticiones a la vez, y cachea por id a nivel de módulo: al
 * buscar o filtrar no se vuelve a pedir lo ya conocido.
 *
 * Es un apaño del cliente, no la solución buena: lo correcto es que el listado
 * devuelva el costo y esto desaparezca. Está escrito para eso — en cuanto la
 * lista traiga `costo_unitario`, no se pide ningún detalle.
 */
const cache = new Map<string, string>();

/** Se llama al cambiar precios o composiciones: los costos dejan de valer. */
export function olvidarCostosApu() {
  cache.clear();
}

const TANDA = 6;

export function useCostosApu(apus: Apu[]): {
  costo: (apu: Apu) => string | undefined;
  cargando: boolean;
} {
  const [, refrescar] = useState(0);
  const [cargando, setCargando] = useState(false);

  // La clave es la lista de ids: si cambia la búsqueda, se reevalúa qué falta.
  const ids = apus.map((a) => a.id).join(',');

  useEffect(() => {
    // Si el listado ya trae el costo no hay nada que pedir.
    const faltan = apus.filter((a) => aNumero(a.valorUnitario) === 0 && !cache.has(a.id));
    if (faltan.length === 0) return;

    let cancel = false;
    setCargando(true);
    (async () => {
      for (let i = 0; i < faltan.length && !cancel; i += TANDA) {
        const tanda = await Promise.all(faltan.slice(i, i + TANDA).map(async (a) => {
          try {
            const d = apuDesdeBackend(extractData(await apiService.getApu(a.id)));
            return [a.id, d.valorUnitario] as const;
          } catch {
            // Un fallo puntual no debe reintentarse en bucle: se cachea el
            // cero y la fila queda como está.
            return [a.id, '0'] as const;
          }
        }));
        if (cancel) return;
        tanda.forEach(([id, v]) => cache.set(id, v));
        // Se refresca por tandas para que los costos vayan apareciendo en vez
        // de esperar a que terminen los cien.
        refrescar((n) => n + 1);
      }
      if (!cancel) setCargando(false);
    })();

    return () => { cancel = true; setCargando(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  return {
    /** `undefined` mientras no se sabe: pintar $0 sería afirmar que vale cero. */
    costo: (apu: Apu) => {
      const propio = aNumero(apu.valorUnitario);
      if (propio > 0) return apu.valorUnitario;
      return cache.get(apu.id);
    },
    cargando,
  };
}
