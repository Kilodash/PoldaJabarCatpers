const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const getDatabaseUrl = () => {
    const url = process.env.DATABASE_URL || '';
    if (!url) return url;
    
    // Gunakan URL object agar parsing lebih aman dan robust
    try {
        const dbUrl = new URL(url);
        // Set default pooling params jika belum ada
        if (!dbUrl.searchParams.has('connection_limit')) {
            dbUrl.searchParams.set('connection_limit', '5');
        }
        if (!dbUrl.searchParams.has('pool_timeout')) {
            dbUrl.searchParams.set('pool_timeout', '20');
        }
        // Pastikan pgbouncer=true jika menggunakan port pooler Supabase (6543)
        if (dbUrl.port === '6543' && !dbUrl.searchParams.has('pgbouncer')) {
            dbUrl.searchParams.set('pgbouncer', 'true');
        }
        return dbUrl.toString();
    } catch (e) {
        // Fallback ke string concatenation jika URL invalid
        if (url.includes('connection_limit=')) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}connection_limit=5&pool_timeout=20`;
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
