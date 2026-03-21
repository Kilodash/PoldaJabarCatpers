const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Inspecting Production Database Status...');

    try {
        const userCount = await prisma.user.count();
        const satkerCount = await prisma.satker.count();

        console.log(`----------------------------------`);
        console.log(`📊 Statistics:`);
        console.log(`- Total Users: ${userCount}`);
        console.log(`- Total Satker: ${satkerCount}`);
        console.log(`----------------------------------`);

        console.log(`👤 Listing first 10 Users:`);
        const users = await prisma.user.findMany({
            take: 10,
            select: { email: true, role: true, id: true }
        });

        if (users.length === 0) {
            console.log('⚠️  DATABASE KOSONG! Belum ada user sama sekali.');
        } else {
            users.forEach((u, i) => {
                console.log(`${i + 1}. [${u.role}] ${u.email} (ID: ${u.id})`);
            });
        }

        console.log(`----------------------------------`);
        console.log(`🏢 Listing first 5 Satkers:`);
        const satkers = await prisma.satker.findMany({ take: 5 });
        satkers.forEach((s, i) => {
            console.log(`${i + 1}. ${s.nama} (ID: ${s.id})`);
        });

    } catch (error) {
        console.error('❌ Database Inspection Failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
