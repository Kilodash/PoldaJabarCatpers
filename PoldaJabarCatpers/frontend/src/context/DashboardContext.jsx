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

export const DashboardProvider = ({ children }) => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
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
    });
    const [satkerStatsList, setSatkerStatsList] = useState([]);
    const [pelanggaranList, setPelanggaranList] = useState([]); // Pre-fetched data
    const [usersList, setUsersList] = useState([]); // Pre-fetched user accounts
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [satkerLoading, setSatkerLoading] = useState(false); // Separate loading for satker stats
    const [usersLoading, setUsersLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const refreshIntervalRef = useRef(null);

    const fetchUsersBackground = useCallback(async () => {
        if (!user || user.role !== 'ADMIN_POLDA') return;
        try {
            setUsersLoading(true);
            const res = await api.get('/users?skipAuthStatus=true');
            setUsersList(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Gagal pre-fetch daftar user", error);
        } finally {
            setUsersLoading(false);
        }
    }, [user]);

    const fetchDashboardData = useCallback(async (isSilent = false, currentUser = null) => {
        const activeUser = currentUser || user;
        if (!activeUser) return null;

        if (!isSilent) setStatsLoading(true);

        try {
            // Priority 1: Fetch main stats first (for stat cards)
            const resStats = await api.get('/dashboard/stats');

            if (resStats.data?.stats) {
                setStats(resStats.data.stats);
            }

            setLastUpdated(new Date());

            // Priority 2: Fetch satker stats in background (non-blocking)
            fetchSatkerStatsBackground();

            // Priority 3: Trigger user pre-fetch if admin (low priority)
            if (activeUser.role === 'ADMIN_POLDA') {
                setTimeout(() => fetchUsersBackground(), 500);
            }

            return { stats: resStats.data?.stats };
        } catch (error) {
            console.error("Gagal mengambil data dashboard", error);
            throw error;
        } finally {
            if (!isSilent) setStatsLoading(false);
        }
    }, [user]);

    const fetchSatkerStatsBackground = useCallback(async () => {
        if (!user) return;
        try {
            setSatkerLoading(true);
            const resSatkerStats = await api.get('/dashboard/satker-stats');
            if (resSatkerStats.data) {
                setSatkerStatsList(Array.isArray(resSatkerStats.data) ? resSatkerStats.data : []);
            }
        } catch (error) {
            console.error("Gagal mengambil satker stats", error);
        } finally {
            setSatkerLoading(false);
        }
    }, [user]);

    const fetchPelanggaranBackground = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api.get('/personel?search=');
            setPelanggaranList(res.data);
        } catch (error) {
            console.error("Gagal pre-fetch data pelanggaran", error);
        }
    }, [user]);

    // Start background refresh when user is logged in
    useEffect(() => {
        if (user) {
            // Initial fetch if we don't have data yet
            if (!lastUpdated) {
                fetchDashboardData();
            }

            // Set up 5-minute interval (increased from 60s to reduce load)
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = setInterval(() => {
                fetchDashboardData(true);
            }, 300000); // 5 minutes instead of 60 seconds
        } else {
            // Clear interval if user logs out
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
            // Reset state
            setStats({
                totalPersonel: 0, tidakAktif: 0, catpersAktif: 0, pernahTercatat: 0, belumRps: 0, belumRekomendasi: 0, perdamaian: 0,
                tidakTerbukti: 0, belumSktt: 0, belumSktb: 0, butuhApproval: 0
            });
            setSatkerStatsList([]);
            setUsersList([]);
            setLastUpdated(null);
        }

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
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
