import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

const RELOAD_GUARD_KEY = 'element_chunk_reload_guard';

// Errores típicos cuando un chunk (code-splitting) no descarga bien —
// muy común en móvil con redes inestables o justo después de un nuevo deploy
// (el navegador tiene cacheado un index.html viejo que apunta a chunks que ya no existen).
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed|dynamically imported module/i.test(
    message
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);

    if (isChunkLoadError(error)) {
      // Un solo reintento automático (guardado en sessionStorage para no entrar en loop
      // si el chunk sigue sin poder descargarse).
      const alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Algo salió mal</h2>
            <p style={{ color: '#999', marginBottom: 20, fontSize: 14 }}>
              No pudimos cargar esta sección. Verifica tu conexión e inténtalo de nuevo.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                sessionStorage.removeItem(RELOAD_GUARD_KEY);
                window.location.reload();
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
