// Sileo Toast Notifications — Usar esta API para todas las notificaciones del proyecto
// Docs: https://www.npmjs.com/package/sileo

import { sileo } from 'sileo';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Muestra una notificación toast con Sileo.
 * Usa siempre esta función en lugar de alert() o console.log() para feedback al usuario.
 *
 * Ejemplos:
 *   showNotification('Guardado', 'success', 'Los cambios se guardaron correctamente.');
 *   showNotification('Error', 'error', 'No se pudo conectar con el servidor.');
 *   showNotification('Atención', 'warning');
 *   showNotification('Info', 'info');
 *
 * Para peticiones async usar sileoPromise() en su lugar.
 */
export function showNotification(
  message: string,
  type: NotificationType = 'success',
  description?: string
) {
  sileo.show({
    title: message,
    description,
    type,
    position: 'top-center',
    duration: 4000,
  });
}

/**
 * Wrapper para peticiones async con estados de carga/éxito/error automáticos.
 *
 * Ejemplo:
 *   await sileoPromise(
 *     apiService.saveData(payload),
 *     { loading: 'Guardando...', success: 'Guardado', error: 'Error al guardar' }
 *   );
 */
export async function sileoPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error: string }
): Promise<T | undefined> {
  return sileo.promise(promise, {
    loading: { title: messages.loading, position: 'top-center' },
    success: { title: messages.success, position: 'top-center' },
    error: { title: messages.error, position: 'top-center' },
  }) as Promise<T | undefined>;
}

// Re-exportar sileo para uso directo cuando se necesite personalización avanzada
export { sileo };

// Re-exportar Toaster para el layout
export { Toaster } from 'sileo';
