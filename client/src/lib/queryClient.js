import { QueryClient } from '@tanstack/react-query'

/**
 * TanStack Query caches server data, so moving between pages is instant and
 * the same data isn't fetched twice. It also handles loading/error states.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Retry only server/network errors. A 401/403/404 won't fix itself.
      retry: (count, error) => (error?.status === 0 || error?.status >= 500) && count < 2,
    },
  },
})
