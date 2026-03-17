import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Frontend Supabase Config Missing! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables.');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: (cb) => {
                // Instantly call with null session to prevent hanging
                cb('SIGNED_OUT', null);
                return { data: { subscription: { unsubscribe: () => { } } } };
            },
            signOut: async () => { },
            signInWithPassword: async () => ({ error: new Error('Supabase not configured') })
        }
    };
