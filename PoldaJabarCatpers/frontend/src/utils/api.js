import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
    const token = Cookies.get('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    if (error.response && error.response.status === 401) {
        const isLoginPage = window.location.pathname === '/login';

        // Clear local storage/cookies IMMEDIATELY
        Cookies.remove('token');
        Cookies.remove('user');
        localStorage.removeItem('supabase.auth.token');

        if (!isLoginPage) {
            // Only redirect if not already on login page to avoid loops
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});

export default api;
