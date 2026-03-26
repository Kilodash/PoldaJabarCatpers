import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Cookies from 'js-cookie';
import api from '../utils/api';
import { supabase, withTimeout } from '../utils/supabase';

const AuthContext = createContext();
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

// Session check timeout (3 seconds max to prevent stuck loading)
const SESSION_CHECK_TIMEOUT = 3000;
const BACKEND_SYNC_TIMEOUT = 5000;

export const AuthProvider = ({ children }) => {
    // INSTANT UI: Initialize from cookies for immediate render
    const [user, setUser] = useState(() => {
        try {
            const savedUser = Cookies.get('user');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });
    
    // PROGRESSIVE LOADING: Start as NOT loading if we have cached credentials
    // This prevents the "loading forever" issue
    const [loading, setLoading] = useState(() => {
        const hasToken = Cookies.get('token');
        const hasUser = Cookies.get('user');
        // If we have cached data, DON'T show loading - render immediately
        return !hasToken && !hasUser;
    });

    const [sessionVerified, setSessionVerified] = useState(false);
    const mountedRef = useRef(true);
    const syncingRef = useRef(false);

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
        setSessionVerified(true);
        
        Cookies.set('token', data.session.access_token, { expires: 1 });
        Cookies.set('user', JSON.stringify(userData), { expires: 1 });
        
        return { user: userData };
    };

    const logout = useCallback(async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.warn('Supabase signOut error (ignored):', err);
        }
        setUser(null);
        setSessionVerified(false);
        Cookies.remove('token');
        Cookies.remove('user');
    }, []);

    const syncUserWithBackend = useCallback(async (session, isBackground = false) => {
        if (!session || syncingRef.current) return null;
        
        syncingRef.current = true;
        
        try {
            // Use timeout wrapper to prevent infinite waiting
            const res = await withTimeout(
                api.get('/auth/me', {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                }),
                BACKEND_SYNC_TIMEOUT
            );

            const userData = { ...res.data, token: session.access_token };
            
            if (mountedRef.current) {
                setUser(userData);
                setSessionVerified(true);
                Cookies.set('token', session.access_token, { expires: 1 });
                Cookies.set('user', JSON.stringify(userData), { expires: 1 });
            }
            
            return userData;
        } catch (error) {
            console.error("[AUTH_SYNC_FAIL]", error.message);
            
            if (mountedRef.current) {
                // Only clear session on explicit auth errors, not timeouts
                if (error.response?.status === 401 || error.response?.status === 403) {
                    await logout();
                }
                // On timeout/network error with cached user, keep using cached data
                // This ensures app works even if backend is slow
            }
            return null;
        } finally {
            syncingRef.current = false;
        }
    }, [logout]);

    useEffect(() => {
        mountedRef.current = true;
        let authSubscription = null;

        const initializeAuth = async () => {
            try {
                // RACE PATTERN: Don't block UI, set a timeout
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Session check timeout')), SESSION_CHECK_TIMEOUT)
                );

                try {
                    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
                    
                    if (mountedRef.current && session) {
                        // Background sync - don't block UI
                        syncUserWithBackend(session, true);
                    } else if (mountedRef.current && !user) {
                        // No session and no cached user
                        Cookies.remove('token');
                        Cookies.remove('user');
                    }
                } catch (timeoutError) {
                    console.warn('[AUTH] Session check timed out, using cached data if available');
                    // If we have cached user, continue with that
                    // If not, app will show login
                }
            } catch (err) {
                console.error("[AUTH_INIT_ERROR]", err);
            } finally {
                // CRITICAL: Always stop loading state
                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        };

        // Setup auth state listener
        const setupAuthListener = () => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (!mountedRef.current) return;
                
                console.log(`[AUTH_EVENT] ${event}`);

                switch (event) {
                    case 'SIGNED_OUT':
                        setUser(null);
                        setSessionVerified(false);
                        Cookies.remove('token');
                        Cookies.remove('user');
                        break;
                    
                    case 'SIGNED_IN':
                    case 'TOKEN_REFRESHED':
                        if (session) {
                            syncUserWithBackend(session, true);
                        }
                        break;
                    
                    case 'INITIAL_SESSION':
                        // Handled by initializeAuth
                        break;
                    
                    default:
                        break;
                }
            });
            
            return subscription;
        };

        // Initialize immediately if we have cached user (don't wait)
        if (user) {
            setLoading(false);
        }

        // Start async initialization
        initializeAuth();
        authSubscription = setupAuthListener();

        return () => {
            mountedRef.current = false;
            if (authSubscription) {
                authSubscription.unsubscribe();
            }
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, sessionVerified, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
