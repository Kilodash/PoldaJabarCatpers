const { PrismaClient } = require('@prisma/client');

// Global singleton pattern — krusial untuk Vercel Serverless
// Mencegah "Too many connections" dengan menggunakan kembali instance yang sudah ada
const prismaClientSingleton = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
    });
};

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

module.exports = prisma;
