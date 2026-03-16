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

    // Fetch full user profile from backend (role, satker, etc.)
    const fetchUserProfile = async (token) => {
        try {
            // Include token in header manually if the interceptor hasn't caught it yet
            const res = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        } catch (error) {
            console.error("Gagal mengambil profil user:", error);
            return null;
        }
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        const session = data.session;
        const profile = await fetchUserProfile(session.access_token);

        const userData = { ...profile, token: session.access_token };
        setUser(userData);

        Cookies.set('token', session.access_token, { expires: 1 });
        Cookies.set('user', JSON.stringify(userData), { expires: 1 });

        return { user: userData, token: session.access_token };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        Cookies.remove('token');
        Cookies.remove('user');
    };

    useEffect(() => {
        // Handle initial session check
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    const profile = await fetchUserProfile(session.access_token);
                    if (profile) {
                        const userData = { ...profile, token: session.access_token };
                        setUser(userData);
                        Cookies.set('token', session.access_token, { expires: 1 });
                        Cookies.set('user', JSON.stringify(userData), { expires: 1 });
                    } else {
                        await logout();
                    }
                } else {
                    setUser(null);
                    Cookies.remove('token');
                    Cookies.remove('user');
                }
            } catch (error) {
                console.error("Auth init error:", error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            try {
                if (event === 'SIGNED_IN' && session) {
                    const profile = await fetchUserProfile(session.access_token);
                    const userData = { ...profile, token: session.access_token };
                    setUser(userData);
                    Cookies.set('token', session.access_token, { expires: 1 });
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    Cookies.remove('token');
                    Cookies.remove('user');
                }
            } catch (error) {
                console.error("Auth change error:", error);
            }
        });

        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
