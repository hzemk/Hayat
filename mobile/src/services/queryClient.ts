import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import axios from 'axios';

function isAuthError(err: unknown) {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err) => {
      if (isAuthError(err)) return; // handled by interceptor + auth gate
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      if (isAuthError(err)) return;
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, err) => {
        if (isAuthError(err)) return false;
        return failureCount < 1;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});
