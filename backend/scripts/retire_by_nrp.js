const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function extractBirthDateFromNRPNIP(nrpNip, isPNS) {
    if (!nrpNip) return null;
    nrpNip = String(nrpNip).replace(/[^0-9]/g, '');

    if (isPNS && nrpNip.length >= 8) {
        // NIP format: YYYYMMDDYYYYMM...
        // e.g. 19700101... -> born 1970-01-01
        const year = parseInt(nrpNip.substring(0, 4));
        const month = parseInt(nrpNip.substring(4, 6));
        const day = parseInt(nrpNip.substring(6, 8));

        if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return new Date(year, month - 1, day);
        }
    } else if (!isPNS && nrpNip.length >= 4) {
        // NRP format: YYMM....
        // e.g. 7001... -> born 1970-01
        let yearPart = parseInt(nrpNip.substring(0, 2));
        const month = parseInt(nrpNip.substring(2, 4));

        // Assume anything above 40 is 19XX, else 20XX
        const year = yearPart > 40 ? 1900 + yearPart : 2000 + yearPart;
        // Default day to 1st of month
        if (month >= 1 && month <= 12) {
            return new Date(year, month - 1, 1);
        }
    }
    return null;
}

async function main() {
    // 1. Fetch settings for retirement age
    const pnsSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_PNS' } });
    const polriSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_POLRI' } });

    const usiaPensiunPNS = pnsSetting ? parseInt(pnsSetting.value) : 58;
    const usiaPensiunPolri = polriSetting ? parseInt(polriSetting.value) : 58;

    const today = new Date();

    // 2. Process all active personnel
    const activePersonel = await prisma.personel.findMany({
        where: {
            statusKeaktifan: 'AKTIF',
            deletedAt: null
        }
    });

    console.log(`Processing ${activePersonel.length} active personnel to check for retirement...`);

    let retiredCount = 0;
    let updateCount = 0;

    for (const p of activePersonel) {
        let isPNS = p.jenisPegawai === 'PNS';
        let birthDate = extractBirthDateFromNRPNIP(p.nrpNip, isPNS);

        if (birthDate) {
            const pensiunAge = isPNS ? usiaPensiunPNS : usiaPensiunPolri;

            // Calculate exact retirement date
            const pensiunDate = new Date(birthDate);
            pensiunDate.setFullYear(pensiunDate.getFullYear() + pensiunAge);

            let dataToUpdate = {
                tanggalLahir: birthDate,
                tanggalPensiun: pensiunDate
            };

            // If they are past retirement date, mark as retired
            if (pensiunDate <= today) {
                dataToUpdate.statusKeaktifan = 'PENSIUN';
                dataToUpdate.deletedAt = new Date();
                dataToUpdate.nrpNip = `DEL_${Date.now()}_${p.nrpNip}`;
                retiredCount++;
            }

            await prisma.personel.update({
                where: { id: p.id },
                data: dataToUpdate
            });
            updateCount++;

            if (updateCount % 100 === 0) console.log(`...processed ${updateCount}`);
        }
    }

    console.log(`\nFinished processing!`);
    console.log(`Dates corrected for: ${updateCount}`);
    console.log(`Successfully moved to PENSIUN (Inactive): ${retiredCount}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
