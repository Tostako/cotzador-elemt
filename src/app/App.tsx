import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { queryClient } from '../shared/queries/queryClient';
import { ErrorBoundary } from './ErrorBoundary';

export function App() {
  useEffect(() => {
    // Ya montamos bien: si más adelante falla un chunk, que pueda reintentar de nuevo.
    sessionStorage.removeItem('element_chunk_reload_guard');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
