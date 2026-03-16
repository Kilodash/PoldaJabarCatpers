import { createContext, useContext, useState, useEffect, useRef } from 'react';
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
            console.log(`[AUTH_DIAGNOSTIC] Fetching profile for token...`);
            const res = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`[AUTH_DIAGNOSTIC] Profile fetched successfully:`, res.data?.email);
            return res.data;
        } catch (error) {
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;
            console.error(`[AUTH_DIAGNOSTIC] FAILED to fetch profile. Status: ${status}, Msg: ${message}`);

            if (status === 401) {
                Cookies.remove('token');
                Cookies.remove('user');
                localStorage.removeItem('supabase.auth.token');
            }
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

        if (!profile) {
            await logout();
            throw new Error('Profil user tidak ditemukan di database lokal.');
        }

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

    const isInitialMount = useRef(true);

    useEffect(() => {
        if (!isInitialMount.current) return;
        isInitialMount.current = false;

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

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                const profile = await fetchUserProfile(session.access_token);
                if (profile) {
                    const userData = { ...profile, token: session.access_token };
                    setUser(userData);
                    Cookies.set('token', session.access_token, { expires: 1 });
                } else {
                    await logout();
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                Cookies.remove('token');
                Cookies.remove('user');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const forceReset = () => {
        Cookies.remove('token');
        Cookies.remove('user');
        localStorage.clear();
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {loading ? (
                <div style={{
                    height: '100vh',
                    width: '100vw',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: '#f8fafc'
                }}>
                    <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', marginBottom: '1rem' }}></div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>Memverifikasi Sesi...</div>
                    <button
                        onClick={forceReset}
                        style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#64748b', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        Masalah saat memuat? Klik untuk reset
                    </button>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
