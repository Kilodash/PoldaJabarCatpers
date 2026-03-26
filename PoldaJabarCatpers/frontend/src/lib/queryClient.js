import { QueryClient } from '@tanstack/react-query';

// Create a query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data dianggap fresh selama 30 detik
      staleTime: 30 * 1000,
      // Cache data selama 5 menit
      gcTime: 5 * 60 * 1000,
      // Retry 2 kali untuk network errors
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Refetch saat window focus (jika data stale)
      refetchOnWindowFocus: true,
      // Jangan refetch saat reconnect (biar tidak spam)
      refetchOnReconnect: false,
      // Refetch saat mount jika stale
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations 1 kali
      retry: 1,
    },
  },
});

// Query keys factory untuk konsistensi
export const queryKeys = {
  // Dashboard
  dashboard: {
    all: ['dashboard'] ,
    stats: () => [...queryKeys.dashboard.all, 'stats'],
    satkerStats: () => [...queryKeys.dashboard.all, 'satker-stats'],
  },
  // Personel
  personel: {
    all: ['personel'],
    list: (filters) => [...queryKeys.personel.all, 'list', filters],
    detail: (id) => [...queryKeys.personel.all, 'detail', id],
    history: (id) => [...queryKeys.personel.all, 'history', id],
  },
  // Users
  users: {
    all: ['users'],
    list: () => [...queryKeys.users.all, 'list'],
  },
  // Satker
  satker: {
    all: ['satker'],
    list: () => [...queryKeys.satker.all, 'list'],
  },
};
