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
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const refreshIntervalRef = useRef(null);

    const fetchDashboardData = useCallback(async (isSilent = false) => {
        if (!user) return;

        if (!isSilent) setStatsLoading(true);

        try {
            const [resStats, resSatkerStats] = await Promise.all([
                api.get('/dashboard/stats'),
                api.get('/dashboard/satker-stats')
            ]);

            if (resStats.data?.stats) {
                setStats(resStats.data.stats);
            }
            if (resSatkerStats.data) {
                setSatkerStatsList(Array.isArray(resSatkerStats.data) ? resSatkerStats.data : []);
            }
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Gagal mengambil data dashboard", error);
        } finally {
            if (!isSilent) setStatsLoading(false);
        }
    }, [user]);

    // Start background refresh when user is logged in
    useEffect(() => {
        if (user) {
            // Initial fetch if we don't have data yet
            if (!lastUpdated) {
                fetchDashboardData();
            }

            // Set up 60s interval
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = setInterval(() => {
                fetchDashboardData(true);
            }, 60000);
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
        loading: statsLoading,
        lastUpdated,
        refresh: () => fetchDashboardData(true)
    };

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
};
