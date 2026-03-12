const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const getDatabaseUrl = () => {
    const url = process.env.DATABASE_URL || '';
    if (!url) return url;
    
    // Gunakan URL object agar parsing lebih aman dan robust
    try {
        const dbUrl = new URL(url);
        
        // PAKSA pgbouncer=true untuk semua koneksi serverless agar tidak error "prepared statement s1 already exists"
        // Ini kritikal saat menggunakan Supabase Connection Pooler (port 6543)
        if (!dbUrl.searchParams.has('pgbouncer')) {
            dbUrl.searchParams.set('pgbouncer', 'true');
        }

        // Set default pooling params jika belum ada
        if (!dbUrl.searchParams.has('connection_limit')) {
            dbUrl.searchParams.set('connection_limit', '5');
        }
        if (!dbUrl.searchParams.has('pool_timeout')) {
            dbUrl.searchParams.set('pool_timeout', '20');
        }
        return dbUrl.toString();
    } catch (e) {
        // Fallback ke string concatenation jika URL invalid
        let finalUrl = url;
        if (!finalUrl.includes('pgbouncer=')) {
            const sep = finalUrl.includes('?') ? '&' : '?';
            finalUrl += `${sep}pgbouncer=true`;
        }
        if (!finalUrl.includes('connection_limit=')) {
            finalUrl += `&connection_limit=5&pool_timeout=20`;
        }
        return finalUrl;
    }
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
        db: { url: getDatabaseUrl() }
    }
});

// Pre-connect: Mulai inisialisasi koneksi segera saat modul dimuat
// Ini membantu mengurangi latency pada request pertama (cold start/warmup)
prisma.$connect()
    .then(() => { if (process.env.NODE_ENV !== 'production') console.log('Prisma pre-connected successfully'); })
    .catch((err) => console.error('Prisma pre-connect warning:', err.message));

// Cache instance
globalForPrisma.prisma = prisma;

module.exports = prisma;
