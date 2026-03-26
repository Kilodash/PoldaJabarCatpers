import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { queryKeys } from '../lib/queryClient';

// ============ DASHBOARD HOOKS ============

/**
 * Hook untuk fetch dashboard stats
 */
export const useDashboardStats = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data?.stats || {
        totalPersonel: 0,
        tidakAktif: 0,
        catpersAktif: 0,
        pernahTercatat: 0,
        belumRps: 0,
        belumRekomendasi: 0,
        perdamaian: 0,
        tidakTerbukti: 0,
        belumSktt: 0,
        belumSktb: 0,
        butuhApproval: 0
      };
    },
    staleTime: 60 * 1000, // 1 menit
    ...options,
  });
};

/**
 * Hook untuk fetch satker statistics
 */
export const useSatkerStats = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.dashboard.satkerStats(),
    queryFn: async () => {
      const res = await api.get('/dashboard/satker-stats');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

// ============ PERSONEL HOOKS ============

/**
 * Hook untuk fetch list personel dengan filters
 */
export const usePersonelList = (filters = {}, options = {}) => {
  const { search = '', category = '', satkerId = null } = filters;
  
  return useQuery({
    queryKey: queryKeys.personel.list({ search, category, satkerId }),
    queryFn: async () => {
      let url = `/personel?search=${encodeURIComponent(search)}`;
      if (category) url += `&category=${category}`;
      if (satkerId) url += `&satkerId=${satkerId}`;
      
      const res = await api.get(url);
      return res.data || [];
    },
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook untuk fetch detail personel
 */
export const usePersonelDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.personel.detail(id),
    queryFn: async () => {
      const res = await api.get(`/personel/${id}`);
      return res.data;
    },
    enabled: !!id,
    ...options,
  });
};

/**
 * Hook untuk fetch history personel
 */
export const usePersonelHistory = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.personel.history(id),
    queryFn: async () => {
      const res = await api.get(`/personel/${id}/history`);
      return res.data || [];
    },
    enabled: !!id,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook untuk create personel
 */
export const useCreatePersonel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/personel', data);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.personel.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
};

/**
 * Hook untuk update personel
 */
export const useUpdatePersonel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/personel/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personel.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.personel.list({}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
};

/**
 * Hook untuk delete/deactivate personel
 */
export const useDeletePersonel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, alasan, statusKeaktifan }) => {
      const res = await api.delete(`/personel/${id}`, {
        data: { alasan, statusKeaktifan }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personel.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
};

/**
 * Hook untuk restore personel
 */
export const useRestorePersonel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, alasan }) => {
      const res = await api.put(`/personel/restore/${id}`, { alasan });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personel.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
};

// ============ USERS HOOKS ============

/**
 * Hook untuk fetch list users (Admin only)
 */
export const useUsersList = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      const res = await api.get('/users?skipAuthStatus=true');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 2 * 60 * 1000, // 2 menit
    ...options,
  });
};

// ============ SATKER HOOKS ============

/**
 * Hook untuk fetch list satker
 */
export const useSatkerList = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.satker.list(),
    queryFn: async () => {
      const res = await api.get('/satker');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 menit (jarang berubah)
    ...options,
  });
};
