import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

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

// API timeout for dashboard requests
const DASHBOARD_API_TIMEOUT = 10000;

export const DashboardProvider = ({ children }) => {
    const { user } = useAuth();
    const [stats, setStats] = useState(defaultStats);
    const [satkerStatsList, setSatkerStatsList] = useState([]);
    const [pelanggaranList, setPelanggaranList] = useState([]);
    const [usersList, setUsersList] = useState([]);
    
    // Loading states - start as false for instant UI
    const [statsLoading, setStatsLoading] = useState(false);
    const [satkerLoading, setSatkerLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [fetchError, setFetchError] = useState(null);

    const refreshIntervalRef = useRef(null);
    const mountedRef = useRef(true);
    const fetchingRef = useRef(false);

    // Fetch users in background (Admin only)
    const fetchUsersBackground = useCallback(async () => {
        if (!user || user.role !== 'ADMIN_POLDA' || !mountedRef.current) return;
        
        try {
            setUsersLoading(true);
            const res = await api.get('/users?skipAuthStatus=true', {
                timeout: DASHBOARD_API_TIMEOUT
            });
            if (mountedRef.current) {
                setUsersList(Array.isArray(res.data) ? res.data : []);
            }
        } catch (error) {
            console.warn("[Dashboard] Failed to fetch users:", error.message);
        } finally {
            if (mountedRef.current) {
                setUsersLoading(false);
            }
        }
    }, [user]);

    // Fetch satker stats in background
    const fetchSatkerStatsBackground = useCallback(async () => {
        if (!user || !mountedRef.current) return;
        
        try {
            setSatkerLoading(true);
            const res = await api.get('/dashboard/satker-stats', {
                timeout: DASHBOARD_API_TIMEOUT
            });
            if (mountedRef.current && res.data) {
                setSatkerStatsList(Array.isArray(res.data) ? res.data : []);
            }
        } catch (error) {
            console.warn("[Dashboard] Failed to fetch satker stats:", error.message);
        } finally {
            if (mountedRef.current) {
                setSatkerLoading(false);
            }
        }
    }, [user]);

    // Main dashboard data fetch with priority loading
    const fetchDashboardData = useCallback(async (isSilent = false, currentUser = null) => {
        const activeUser = currentUser || user;
        if (!activeUser || !mountedRef.current || fetchingRef.current) return null;

        fetchingRef.current = true;
        
        if (!isSilent) {
            setStatsLoading(true);
        }
        setFetchError(null);

        try {
            // PRIORITY 1: Fetch main stats first (for stat cards)
            const resStats = await api.get('/dashboard/stats', {
                timeout: DASHBOARD_API_TIMEOUT
            });

            if (mountedRef.current && resStats.data?.stats) {
                setStats(resStats.data.stats);
                setLastUpdated(new Date());
            }

            // PRIORITY 2: Fetch satker stats in background (non-blocking)
            if (mountedRef.current) {
                // Use setTimeout to make it truly non-blocking
                setTimeout(() => {
                    if (mountedRef.current) {
                        fetchSatkerStatsBackground();
                    }
                }, 100);
            }

            // PRIORITY 3: Fetch users if admin (low priority)
            if (activeUser.role === 'ADMIN_POLDA' && mountedRef.current) {
                setTimeout(() => {
                    if (mountedRef.current) {
                        fetchUsersBackground();
                    }
                }, 500);
            }

            return { stats: resStats.data?.stats };
        } catch (error) {
            console.error("[Dashboard] Failed to fetch data:", error.message);
            if (mountedRef.current) {
                setFetchError(error.message);
            }
            return null;
        } finally {
            fetchingRef.current = false;
            if (!isSilent && mountedRef.current) {
                setStatsLoading(false);
            }
        }
    }, [user, fetchSatkerStatsBackground, fetchUsersBackground]);

    // Fetch pelanggaran data (on-demand)
    const fetchPelanggaranBackground = useCallback(async () => {
        if (!user || !mountedRef.current) return;
        
        try {
            const res = await api.get('/personel?search=', {
                timeout: DASHBOARD_API_TIMEOUT
            });
            if (mountedRef.current) {
                setPelanggaranList(res.data || []);
            }
        } catch (error) {
            console.warn("[Dashboard] Failed to fetch pelanggaran:", error.message);
        }
    }, [user]);

    // Initialize and setup auto-refresh
    useEffect(() => {
        mountedRef.current = true;

        if (user) {
            // Initial fetch only if we don't have data yet
            if (!lastUpdated) {
                fetchDashboardData();
            }

            // Setup 5-minute auto-refresh (reduced frequency for better performance)
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
            
            refreshIntervalRef.current = setInterval(() => {
                if (mountedRef.current && !document.hidden) {
                    fetchDashboardData(true); // Silent refresh
                }
            }, 300000); // 5 minutes
        } else {
            // Clear interval on logout
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
            
            // Reset state
            setStats(defaultStats);
            setSatkerStatsList([]);
            setUsersList([]);
            setPelanggaranList([]);
            setLastUpdated(null);
            setFetchError(null);
        }

        return () => {
            mountedRef.current = false;
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [user, lastUpdated, fetchDashboardData]);

    // Visibility change handler - refresh when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && user && lastUpdated) {
                const timeSinceUpdate = Date.now() - lastUpdated.getTime();
                // Refresh if data is older than 3 minutes
                if (timeSinceUpdate > 180000) {
                    fetchDashboardData(true);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [user, lastUpdated, fetchDashboardData]);

    const value = {
        stats,
        satkerStatsList,
        pelanggaranList,
        usersList,
        loading: statsLoading,
        satkerLoading,
        usersLoading,
        lastUpdated,
        fetchError,
        refresh: (u) => fetchDashboardData(true, u),
        refreshSatkerStats: fetchSatkerStatsBackground,
        refreshPelanggaran: fetchPelanggaranBackground,
        refreshUsers: fetchUsersBackground
    };

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
};
