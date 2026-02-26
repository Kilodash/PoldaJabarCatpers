import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import api from '../utils/api';

const AuthContext = createContext();
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        setUser(res.data.user);
        Cookies.set('token', res.data.token, { expires: 1 }); // expires in 1 day
        Cookies.set('user', JSON.stringify(res.data.user), { expires: 1 });
        return res.data;
    };

    const logout = () => {
        setUser(null);
        Cookies.remove('token');
        Cookies.remove('user');
    };

    useEffect(() => {
        const loadUser = async () => {
            const token = Cookies.get('token');
            if (token) {
                try {
                    const res = await api.get('/auth/me');
                    setUser({ ...res.data, token });
                } catch (error) {
                    console.error("Token tidak valid atau kadaluarsa", error);
                    logout();
                }
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
