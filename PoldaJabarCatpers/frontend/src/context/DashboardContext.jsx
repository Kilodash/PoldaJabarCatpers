import React, { createContext, useContext, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { 
  useDashboardStats, 
  useSatkerStats, 
  useUsersList 
} from '../hooks/useApi';
import { queryKeys } from '../lib/queryClient';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

// Default stats structure
const defaultStats = {
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

export const DashboardProvider = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN_POLDA';

  // React Query hooks untuk data fetching dengan caching
  const { 
    data: stats = defaultStats, 
    isLoading: statsLoading,
    error: statsError,
    dataUpdatedAt: statsUpdatedAt
  } = useDashboardStats({
    enabled: !!user, // Hanya fetch jika user sudah login
    refetchInterval: 5 * 60 * 1000, // Auto-refresh setiap 5 menit
  });

  const { 
    data: satkerStatsList = [], 
    isLoading: satkerLoading,
  } = useSatkerStats({
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000,
  });

  const { 
    data: usersList = [], 
    isLoading: usersLoading,
  } = useUsersList({
    enabled: !!user && isAdmin, // Hanya fetch untuk admin
    refetchInterval: 5 * 60 * 1000,
  });

  // Manual refresh functions
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.satkerStats() });
  }, [queryClient]);

  const refreshSatkerStats = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.satkerStats() });
  }, [queryClient]);

  const refreshUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
  }, [queryClient]);

  // Prefetch function untuk pelanggaran (on-demand)
  const refreshPelanggaran = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.personel.all });
  }, [queryClient]);

  // Convert dataUpdatedAt to Date object
  const lastUpdated = statsUpdatedAt ? new Date(statsUpdatedAt) : null;

  const value = {
    // Data
    stats,
    satkerStatsList,
    pelanggaranList: [], // Deprecated - gunakan usePersonelList hook langsung
    usersList,
    
    // Loading states
    loading: statsLoading,
    satkerLoading,
    usersLoading,
    
    // Metadata
    lastUpdated,
    fetchError: statsError?.message || null,
    
    // Actions
    refresh,
    refreshSatkerStats,
    refreshPelanggaran,
    refreshUsers,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
