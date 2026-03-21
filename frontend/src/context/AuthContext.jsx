import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import api from '../utils/api';
import { supabase } from '../utils/supabase';

const AuthContext = createContext();
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // OPTIMIZED: Initialize from cookies for instant render
    const [user, setUser] = useState(() => {
        const savedUser = Cookies.get('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    
    // OPTIMIZED: Don't block if we have cached user data
    const [loading, setLoading] = useState(() => {
        const hasToken = Cookies.get('token');
        const hasUser = Cookies.get('user');
        // Only show loading if no cached data exists
        return !(hasToken && hasUser);
    });

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // After Supabase login, fetch profile from our backend to get role/satker
        const res = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${data.session.access_token}` }
        });

        const userData = { ...res.data, token: data.session.access_token };
        setUser(userData);
        
        Cookies.set('token', data.session.access_token, { expires: 1 });
        Cookies.set('user', JSON.stringify(userData), { expires: 1 });
        
        return { user: userData };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        Cookies.remove('token');
        Cookies.remove('user');
    };

    useEffect(() => {
        let isInstanceMounted = true;

        const checkInitialSession = async () => {
            try {
                // OPTIMIZED: If we have cached user, verify in background
                const hasCache = Cookies.get('token') && Cookies.get('user');
                
                const { data: { session } } = await supabase.auth.getSession();
                
                if (isInstanceMounted && session) {
                    // Only sync if no cache or cache verification needed
                    if (!hasCache) {
                        await syncUserWithBackend(session);
                    } else {
                        // Verify in background, don't block UI
                        syncUserWithBackend(session).catch(err => {
                            console.error("[BACKGROUND_SYNC_FAIL]", err);
                            // On error, clear cache and force re-auth
                            if (isInstanceMounted) {
                                setUser(null);
                                Cookies.remove('token');
                                Cookies.remove('user');
                            }
                        });
                    }
                } else if (isInstanceMounted) {
                    // No session found, clear state
                    setUser(null);
                    Cookies.remove('token');
                    Cookies.remove('user');
                }
            } catch (err) {
                console.error("[AUTH_INIT_FAIL]", err);
                // On error, clear cached data
                if (isInstanceMounted) {
                    setUser(null);
                    Cookies.remove('token');
                    Cookies.remove('user');
                }
            } finally {
                // OPTIMIZED: Set loading to false immediately
                if (isInstanceMounted) setLoading(false);
            }
        };

        const syncUserWithBackend = async (session) => {
            if (!session) return;
            try {
                const res = await api.get('/auth/me', {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });

                const userData = { ...res.data, token: session.access_token };
                if (isInstanceMounted) {
                    setUser(userData);
                    Cookies.set('token', session.access_token, { expires: 1 });
                    Cookies.set('user', JSON.stringify(userData), { expires: 1 });
                }
            } catch (error) {
                console.error("[AUTH_SYNC_FAIL]", error.response?.status, error.message);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    await supabase.auth.signOut();
                    if (isInstanceMounted) {
                        setUser(null);
                        Cookies.remove('token');
                        Cookies.remove('user');
                    }
                }
                throw error;
            }
        };

        // Start session check (optimized to not block if cached)
        checkInitialSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[AUTH_EVENT] ${event}`, session?.user?.email);

            try {
                if (event === 'SIGNED_OUT') {
                    if (isInstanceMounted) {
                        setUser(null);
                        Cookies.remove('token');
                        Cookies.remove('user');
                    }
                    return;
                }

                if (session && isInstanceMounted) {
                    await syncUserWithBackend(session);
                } else if (isInstanceMounted) {
                    setUser(null);
                    Cookies.remove('token');
                    Cookies.remove('user');
                }
            } catch (err) {
                console.error("[AUTH_EVENT_ERROR]", err);
            } finally {
                if (isInstanceMounted) setLoading(false);
            }
        });

        return () => {
            isInstanceMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
