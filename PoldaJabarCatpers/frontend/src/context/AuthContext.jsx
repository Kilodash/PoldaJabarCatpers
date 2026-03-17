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
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[AUTH_EVENT] ${event}`, session?.user?.email);
            
            if (session) {
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
                        // Truly invalid token, sign out
                        await supabase.auth.signOut();
                        setUser(null);
                    } else if (error.response?.status === 403) {
                        // User exists in Supabase but NOT in Prisma
                        // We still set user to SOMETHING but maybe with a 'NO_PROFILE' flag
                        // Or just null to trigger login redirect
                        setUser(null);
                    }
                }
            } else {
                setUser(null);
                Cookies.remove('token');
                Cookies.remove('user');
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
