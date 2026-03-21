import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 10000, // 10 second timeout to prevent infinite hangs
});

// Request interceptor to add token
api.interceptors.request.use(async (config) => {
    let token = Cookies.get('token');

    // Fallback: Try to get token from Supabase session if cookie is missing
    if (!token) {
        try {
            // Dynamically import to avoid circular dependencies if any
            const { supabase } = await import('./supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                token = session.access_token;
            }
        } catch (err) {
            console.error('Error fetching session in interceptor:', err);
        }
    }

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
}, (error) => {
    if (error.response && error.response.status === 401) {
        console.warn('Unauthorized access - removing session');
        Cookies.remove('token');
        Cookies.remove('user');
        // window.location.href = '/login'; // Disabled to prevent redirect loops
    }
    return Promise.reject(error);
});

export default api;
