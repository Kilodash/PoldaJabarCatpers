import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import api from '../utils/api';
import { supabase } from '../utils/supabase';

const AuthContext = createContext();
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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
        
        // We still use cookies for compatibility with existing api.js interceptor if needed,
        // but Supabase usually handles its own persistence in localStorage.
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
                const { data: { session } } = await supabase.auth.getSession();
                if (isInstanceMounted && session) {
                    await syncUserWithBackend(session);
                }
            } catch (err) {
                console.error("[AUTH_INIT_FAIL]", err);
            } finally {
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
                setUser(userData);
                Cookies.set('token', session.access_token, { expires: 1 });
                Cookies.set('user', JSON.stringify(userData), { expires: 1 });
            } catch (error) {
                console.error("[AUTH_SYNC_FAIL]", error.response?.status, error.message);
                if (error.response?.status === 401) {
                    await supabase.auth.signOut();
                    setUser(null);
                } else if (error.response?.status === 403) {
                    setUser(null);
                }
            }
        };

        checkInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[AUTH_EVENT] ${event}`, session?.user?.email);

            try {
                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    Cookies.remove('token');
                    Cookies.remove('user');
                    return;
                }

                if (session) {
                    await syncUserWithBackend(session);
                } else {
                    setUser(null);
                    Cookies.remove('token');
                    Cookies.remove('user');
                }
            } catch (err) {
                console.error("[AUTH_EVENT_ERROR]", err);
            } finally {
                setLoading(false);
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
