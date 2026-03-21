import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 15000, // 15 second timeout
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request interceptor to add token
api.interceptors.request.use(async (config) => {
    let token = Cookies.get('token');

    // Fallback: Try to get token from Supabase session if cookie is missing
    if (!token) {
        try {
            // Dynamically import to avoid circular dependencies
            const { supabase } = await import('./supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                token = session.access_token;
                // Update cookie for next request
                Cookies.set('token', token, { expires: 1 });
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

// Response interceptor with better error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Network error
        if (!error.response) {
            console.error('Network error:', error.message);
            return Promise.reject(new Error('Koneksi ke server gagal. Periksa koneksi internet Anda.'));
        }

        const { status, data } = error.response;

        // Handle specific status codes
        if (status === 401) {
            console.warn('Unauthorized access - clearing session');
            Cookies.remove('token');
            Cookies.remove('user');
            
            // Only redirect if not already on login page
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        } else if (status === 403) {
            console.error('Forbidden access');
        } else if (status === 500) {
            console.error('Server error:', data?.message);
        }

        // Return error with user-friendly message
        const errorMessage = data?.message || error.message || 'Terjadi kesalahan pada server';
        return Promise.reject(new Error(errorMessage));
    }
);

export default api;
