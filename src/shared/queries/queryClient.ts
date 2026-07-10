import { QueryClient } from '@tanstack/react-query';

// Cliente único de React Query: caché compartida + dedupe automático de requests.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 45_000, // 45s "fresco" → no re-pide al navegar de ida y vuelta
      gcTime: 5 * 60_000, // 5 min en caché tras dejar de usarse
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
