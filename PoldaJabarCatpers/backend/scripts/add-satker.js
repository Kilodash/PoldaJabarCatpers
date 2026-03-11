const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const list = [
        'Ditressiber Polda Jabar',
        'Ditres Ppa Dan Ppo Polda Jabar',
        'Rs Polri Sartika Asih Polda Jabar',
    ];
    for (const nama of list) {
        const e = await prisma.satker.findUnique({ where: { nama } });
        if (!e) {
            await prisma.satker.create({ data: { nama } });
            console.log('Created:', nama);
        } else {
            console.log('Exists:', nama);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
