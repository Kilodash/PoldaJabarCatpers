const { PrismaClient } = require('@prisma/client');

// Global singleton pattern — penting untuk Vercel Serverless
// Mencegah pembuatan koneksi baru di setiap cold start / invocation
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

module.exports = prisma;
