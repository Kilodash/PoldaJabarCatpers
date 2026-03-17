const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[SUPABASE_DEBUG] URL:', supabaseUrl ? 'EXISTS' : 'MISSING');
console.log('[SUPABASE_DEBUG] Anon Key:', supabaseAnonKey ? 'EXISTS' : 'MISSING');
console.log('[SUPABASE_DEBUG] Service Role Key:', supabaseServiceRoleKey ? 'EXISTS' : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('--- [SUPABASE_CONFIG_ERROR] ---');
    console.error('SUPABASE_URL or SUPABASE_ANON_KEY is missing!');
    console.error('-------------------------------');
}

// Client for general use (respects RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Client for administrative tasks (bypasses RLS)
const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

console.log('[SUPABASE_DEBUG] Admin Client Initialized:', !!supabaseAdmin);

module.exports = {
    supabase,
    supabaseAdmin
};
