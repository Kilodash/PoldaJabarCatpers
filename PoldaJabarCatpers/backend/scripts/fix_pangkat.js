const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function toTitleCase(str) {
    if (!str) return str;
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

async function main() {
    const personelList = await prisma.personel.findMany({
        select: { id: true, pangkat: true }
    });

    console.log(`Processing ${personelList.length} personnel records...`);

    let updateCount = 0;

    for (const p of personelList) {
        if (!p.pangkat) continue;

        const newPangkat = toTitleCase(p.pangkat);

        if (newPangkat !== p.pangkat) {
            await prisma.personel.update({
                where: { id: p.id },
                data: { pangkat: newPangkat }
            });
            updateCount++;
        }
    }

    console.log(`Successfully updated "pangkat" format for ${updateCount} records.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
