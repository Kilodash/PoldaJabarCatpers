const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

// connection_limit lebih kecil (2-3) lebih baik untuk banyak serverless function
// pool_timeout diperbesar ke 20s untuk mengatasi cold start / load DB tinggi
const getDatabaseUrl = () => {
    const url = process.env.DATABASE_URL || '';
    if (!url) return url;
    
    // Hapus parameter lama jika ada untuk menghindari duplikasi
    let cleanUrl = url;
    if (url.includes('connection_limit=')) {
        cleanUrl = url.split('connection_limit=')[0].split('&')[0];
        if (cleanUrl.endsWith('?') || cleanUrl.endsWith('&')) {
            cleanUrl = cleanUrl.slice(0, -1);
        }
    }

    const separator = cleanUrl.includes('?') ? '&' : '?';
    // connection_limit=5 seimbang antara performance & safety di Supabase free/micro
    return `${cleanUrl}${separator}connection_limit=5&pool_timeout=20`;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
        db: { url: getDatabaseUrl() }
    }
});

// Cache instance
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
else globalForPrisma.prisma = prisma; // Tetap simpan di prod untuk serverless

module.exports = prisma;
