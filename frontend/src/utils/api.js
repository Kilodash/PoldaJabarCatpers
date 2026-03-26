import axios from 'axios';
import Cookies from 'js-cookie';

// Create axios instance with optimized config
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 15000, // 15 second timeout for cold starts
    headers: {
        'Content-Type': 'application/json'
    }
});

// Token cache to avoid async lookups
let cachedToken = null;

// Sync request interceptor (NO async operations!)
api.interceptors.request.use((config) => {
    // First try cached token
    let token = cachedToken || Cookies.get('token');
    
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        cachedToken = token; // Update cache
    }
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor with retry logic for cold starts
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Retry once on network errors (cold start)
        if (!error.response && !originalRequest._retry) {
            originalRequest._retry = true;
            console.warn('[API] Network error, retrying once...');
            
            // Wait 1 second before retry (gives time for cold start)
            await new Promise(resolve => setTimeout(resolve, 1000));
            return api(originalRequest);
        }
        
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            console.warn('[API] Unauthorized - clearing session');
            cachedToken = null;
            Cookies.remove('token');
            Cookies.remove('user');
        }
        
        // Handle 504 Gateway Timeout (serverless cold start)
        if (error.response?.status === 504 && !originalRequest._retry504) {
            originalRequest._retry504 = true;
            console.warn('[API] Gateway timeout, retrying...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return api(originalRequest);
        }
        
        return Promise.reject(error);
    }
);

// Update token cache when login/logout
export const setApiToken = (token) => {
    cachedToken = token;
};

export const clearApiToken = () => {
    cachedToken = null;
};

export default api;
