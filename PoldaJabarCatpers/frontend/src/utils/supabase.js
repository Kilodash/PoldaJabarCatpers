import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Timeout wrapper for any promise
export const withTimeout = (promise, ms, fallbackValue = null) => {
    return Promise.race([
        promise,
        new Promise((resolve, reject) => {
            setTimeout(() => {
                if (fallbackValue !== null) {
                    resolve(fallbackValue);
                } else {
                    reject(new Error(`Operation timed out after ${ms}ms`));
                }
            }, ms);
        })
    ]);
};

// Create a mock supabase client for when config is missing
const createMockClient = () => ({
    auth: {
        getSession: async () => {
            console.warn('[SUPABASE] Not configured - returning null session');
            return { data: { session: null }, error: null };
        },
        onAuthStateChange: (callback) => {
            // Immediately notify with null session to prevent hanging
            setTimeout(() => callback('INITIAL_SESSION', null), 0);
            return { 
                data: { 
                    subscription: { 
                        unsubscribe: () => {} 
                    } 
                } 
            };
        },
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ 
            data: null, 
            error: new Error('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY') 
        })
    }
});

// Validate and create client
let supabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE] CRITICAL: Missing configuration! Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    supabaseClient = createMockClient();
} else {
    try {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                // Optimize for faster initial load
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false, // Faster - no URL parsing
                storage: {
                    // Use localStorage with fallback
                    getItem: (key) => {
                        try {
                            return localStorage.getItem(key);
                        } catch {
                            return null;
                        }
                    },
                    setItem: (key, value) => {
                        try {
                            localStorage.setItem(key, value);
                        } catch {
                            // Ignore storage errors
                        }
                    },
                    removeItem: (key) => {
                        try {
                            localStorage.removeItem(key);
                        } catch {
                            // Ignore storage errors
                        }
                    }
                }
            },
            global: {
                // Add timeout to fetch requests
                fetch: (url, options) => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
                    
                    return fetch(url, {
                        ...options,
                        signal: controller.signal
                    }).finally(() => clearTimeout(timeoutId));
                }
            }
        });
    } catch (error) {
        console.error('[SUPABASE] Failed to create client:', error);
        supabaseClient = createMockClient();
    }
}

export const supabase = supabaseClient;
