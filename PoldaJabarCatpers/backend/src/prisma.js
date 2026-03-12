const { PrismaClient } = require('@prisma/client');

// Global singleton — PENTING untuk Vercel Serverless
// Tanpa ini, setiap invocation membuat koneksi baru → connection exhaustion
const globalForPrisma = globalThis;

// connection_limit=1 mencegah exhaustion di serverless
const getDatabaseUrl = () => {
    const url = process.env.DATABASE_URL || '';
    if (!url || url.includes('connection_limit')) return url;
    return url + (url.includes('?') ? '&' : '?') + 'connection_limit=5&pool_timeout=10';
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
        db: { url: getDatabaseUrl() }
    }
});

// Cache di globalThis agar tidak membuat instance baru di setiap cold start
// CATATAN: bug lama — ini harus selalu di-cache (termasuk production)
globalForPrisma.prisma = prisma;

module.exports = prisma;
