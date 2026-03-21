const prisma = require('./src/prisma');
require('dotenv').config();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                satkerId: true
            }
        });
        console.log('--- USERS IN LOCAL DB ---');
        console.log(JSON.stringify(users, null, 2));
        console.log('-------------------------');
    } catch (err) {
        console.error('Error fetching users:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
