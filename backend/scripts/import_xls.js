const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

function parseExcelDate(excelDate) {
    if (!excelDate) return new Date();
    if (typeof excelDate === 'number') {
        const d = new Date((excelDate - (25567 + 1)) * 86400 * 1000);
        return isNaN(d) ? new Date() : d;
    }
    if (typeof excelDate === 'string') {
        const parts = excelDate.split('/');
        if (parts.length === 3) {
            const d = new Date(parts[2], parts[1] - 1, parts[0]);
            return isNaN(d) ? new Date() : d;
        }
        const d2 = new Date(excelDate);
        return isNaN(d2) ? new Date() : d2;
    }
    return new Date();
}

function toTitleCase(str) {
    if (!str) return str;
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

// Convert specific ranks like BRIGPOL to Brigadir, etc
function formatPangkat(rawPangkat) {
    let p = toTitleCase(rawPangkat || '');
    if (p === 'Brigpol') return 'Brigadir';
    if (p === 'Bharatu') return 'Bharatu'; // example
    return p || 'Bripda'; // fallback
}

function extractBirthDateFromNRPNIP(nrpNip, isPNS) {
    if (!nrpNip) return null;
    nrpNip = String(nrpNip).replace(/[^0-9]/g, '');

    if (isPNS && nrpNip.length >= 8) {
        const year = parseInt(nrpNip.substring(0, 4));
        const month = parseInt(nrpNip.substring(4, 6));
        const day = parseInt(nrpNip.substring(6, 8));

        if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return new Date(year, month - 1, day);
        }
    } else if (!isPNS && nrpNip.length >= 4) {
        let yearPart = parseInt(nrpNip.substring(0, 2));
        const month = parseInt(nrpNip.substring(2, 4));
        const year = yearPart > 40 ? 1900 + yearPart : 2000 + yearPart;

        if (month >= 1 && month <= 12) {
            return new Date(year, month - 1, 1);
        } else {
            return new Date(year, 0, 1);
        }
    }
    return new Date('1980-01-01'); // fallback if unparseable
}

async function main() {
    console.log('Starting data import with new mapping rules...');

    // Fetch settings for retirement
    const pnsSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_PNS' } });
    const polriSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_POLRI' } });
    const usiaPensiunPNS = pnsSetting ? parseInt(pnsSetting.value) : 58;
    const usiaPensiunPolri = polriSetting ? parseInt(polriSetting.value) : 58;
    const today = new Date();

    const filePath = 'C:\\Users\\ACER\\OneDrive\\PoldaJabarCatpers\\PoldaJabarCatpers\\backend\\uploads\\Personel_Bermasalah_PoldaJabar_04_Maret_2026.xls';
    const wb = xlsx.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { raw: false, header: 1 });

    let importCount = 0;
    let skipCount = 0;

    for (let i = 4; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0 || !row[3]) {
            skipCount++;
            continue;
        }

        const nrpNip = String(row[3]).trim();
        const namaLengkap = row[4] || 'Tanpa Nama';
        const rawPangkat = row[5] || '';
        const pangkat = formatPangkat(rawPangkat);
        const jenisPegawai = rawPangkat.toUpperCase().includes('PNS') || rawPangkat.toUpperCase().includes('PENGATUR') ? 'PNS' : 'POLRI';

        // Jabatan & Satker mapping
        // Jabatan Saat Dilaporkan = kolom I (8) + J (9)
        const jabatanSaatDilaporkan = `${row[8] || ''} ${row[9] || ''}`.trim() || null;

        // Jabatan Saat Ini = kolom L (11) + M (12)
        const jabatanSaatIni = `${row[11] || ''} ${row[12] || ''}`.trim() || 'Anggota';

        // Satker mapping (User didn't specify which col, assuming N (13) which is Satwil Saat Ini based on context and previous chat)
        const satkerSaatIniName = row[13] || 'Polda Jabar';

        // Calculate birth/retirement dates from NRP to automatically set status
        const birthDate = extractBirthDateFromNRPNIP(nrpNip, jenisPegawai === 'PNS') || new Date('1980-01-01');
        const pensiunAge = jenisPegawai === 'PNS' ? usiaPensiunPNS : usiaPensiunPolri;
        const pensiunDate = new Date(birthDate);
        pensiunDate.setFullYear(pensiunDate.getFullYear() + pensiunAge);

        let statusKeaktifan = 'AKTIF';
        let deletedAt = null;
        let finalNrp = nrpNip;

        if (pensiunDate <= today) {
            statusKeaktifan = 'PENSIUN';
            deletedAt = new Date();
            finalNrp = `DEL_${Date.now()}_${nrpNip}`;
        }

        // 1. Manage Satker
        let satker = await prisma.satker.findFirst({ where: { nama: satkerSaatIniName } });
        if (!satker) {
            satker = await prisma.satker.create({ data: { nama: satkerSaatIniName } });
        }

        // 2. Manage Personel
        let personel = await prisma.personel.findFirst({ where: { nrpNip: finalNrp } });
        if (!personel) {
            personel = await prisma.personel.create({
                data: {
                    jenisPegawai,
                    nrpNip: finalNrp,
                    namaLengkap,
                    pangkat,
                    jabatan: jabatanSaatIni,
                    satkerId: satker.id,
                    tanggalLahir: birthDate,
                    tanggalPensiun: pensiunDate,
                    statusKeaktifan,
                    deletedAt,
                    isDraft: false
                }
            });
        }

        // 3. Manage Violation
        // Wujud Perbuatan = Kolom O (14)
        const wujudPerbuatan = row[14] || 'Tidak diisi';

        // Sidang Check = Y(24), Z(25), AA(26), AB(27)
        const hasSidang = Boolean(row[24] || row[25] || row[26] || row[27]);

        // Rekomendasi Check = AC(28), AD(29)
        const hasRekomendasi = Boolean(row[28] || row[29]);

        let statusPenyelesaian = 'PROSES';
        let tanggalBisaAjukanRps = null;
        let tanggalRekomendasi = null;

        if (hasSidang) {
            statusPenyelesaian = 'MENJALANI_HUKUMAN';
            // In our system, MENJALANI_HUKUMAN usually means they had a sidang and are serving time.

            if (hasRekomendasi) {
                // If they have recommendation, then they have passed the punishment phase
                statusPenyelesaian = 'SIDANG';
                // We use 'SIDANG' to show that the sidang process is complete and RPS is applied
                // "Bisa rekomendasi sejak" is also filled to unlock the UX fields
                // Wait, 'SIDANG' with Rekomendasi filled makes it "Pernah Tercatat" perfectly.
                tanggalBisaAjukanRps = new Date(); // Unlocks the RPS fields for editing
                tanggalRekomendasi = new Date(); // Marks it as having an RPS
            }
        }

        const tglLaporan = parseExcelDate(row[2]);
        const jenisPelanggaran = row[15] || 'Disiplin';
        const hukuman = row[25] || row[27] || row[29] || 'Belum ada putusan';

        await prisma.pelanggaran.create({
            data: {
                personelId: personel.id,
                nomorSurat: 'SP/IMPORT/2026',
                tanggalSurat: tglLaporan,
                wujudPerbuatan,
                jenisDasar: jenisPelanggaran,
                satkerSaatMelanggar: row[9] || null,
                jabatanSaatMelanggar: jabatanSaatDilaporkan,
                isDraft: false,
                statusPenyelesaian,
                jenisSidang: (jenisPelanggaran.toLowerCase().includes('kode etik')) ? 'KKEP' : 'DISIPLIN',
                hukuman,
                tanggalBisaAjukanRps,
                tanggalRekomendasi
            }
        });

        importCount++;
        if (importCount % 200 === 0) {
            console.log(`...imported ${importCount} records`);
        }
    }

    console.log(`\nImport Completed!`);
    console.log(`Successfully Imported: ${importCount}`);
    console.log(`Skipped Rows (Empty or No NRP): ${skipCount}`);
}

main()
    .catch((e) => {
        console.error('Error during import:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
