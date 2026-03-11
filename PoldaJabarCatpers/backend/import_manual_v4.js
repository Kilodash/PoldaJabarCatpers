const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

async function importExcel() {
    console.log('--- MANUAL IMPORT V4 REDO START ---');
    const filePath = 'c:\\Users\\ACER\\OneDrive\\PoldaJabarCatpers\\PoldaJabarCatpers\\backend\\uploads\\Personel_Bermasalah_PoldaJabar_10_Maret_2026.xls';
    
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        const dataRows = rawData.slice(6); // Data begins at row 7
        console.log(`Processing ${dataRows.length} rows.`);

        const officialSatkers = await prisma.satker.findMany();
        const satkerNames = officialSatkers.map(s => ({ id: s.id, name: s.nama.toLowerCase() }));

        const findSatkerId = (excelName, fallbackName) => {
            const getBestMatch = (name) => {
                if (!name) return null;
                const search = name.toLowerCase().trim();
                
                // Match logic (exact, part of, or special handling)
                let match = satkerNames.find(s => s.name === search || s.name.includes(search) || search.includes(s.name));
                if (match) return match.id;

                if (search.includes('brimob')) return satkerNames.find(s => s.name.includes('brimob'))?.id;
                
                if (search.includes('polres') || search.includes('polresta')) {
                    const cleaned = search.replace('polrestabes', '').replace('polresta', '').replace('polres', '').trim();
                    const pMatch = satkerNames.find(s => s.name.includes(cleaned));
                    if (pMatch) return pMatch.id;
                }
                return null;
            };

            const primaryId = getBestMatch(excelName);
            if (primaryId) return primaryId;

            const fallbackId = getBestMatch(fallbackName);
            if (fallbackId) return fallbackId;

            return officialSatkers[0].id; // Absolute fallback
        };

        const monthMap = {
            'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MEI': 4, 'JUN': 5,
            'JUL': 6, 'AGU': 7, 'SEP': 8, 'OKT': 9, 'NOP': 10, 'DES': 11,
            'JANUARI': 0, 'FEBRUARI': 1, 'MARET': 2, 'APRIL': 3, 'MEI': 4, 'JUNI': 5,
            'JULI': 6, 'AGUSTUS': 7, 'SEPTEMBER': 8, 'OKTOBER': 9, 'NOVEMBER': 10, 'NOPEMBER': 10, 'DESEMBER': 11
        };

        const extractDate = (text) => {
            if (!text) return null;
            const regex = /TGL\s+(\d+)\s+([A-Z]+)\s+(\d{4})/i;
            const match = text.match(regex);
            if (match) {
                const day = parseInt(match[1]);
                const monthStr = match[2].toUpperCase();
                const year = parseInt(match[3]);
                const month = monthMap[monthStr];
                if (month !== undefined) {
                    return new Date(year, month, day);
                }
            }
            return null;
        };

        const parseExcelDate = (val) => {
            if (!val) return null;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        let processed = 0;
        let pCreated = 0;

        for (const row of dataRows) {
            const nrpNip = row[3] ? String(row[3]).trim() : null;
            if (!nrpNip) continue;

            const namaLengkap = row[4] ? String(row[4]).trim() : '-';
            const pangkat = row[5] ? String(row[5]).trim() : '-';
            const jabatan = row[8] ? String(row[8]).trim() : '-';
            
            // Satker rujukan kolom N (index 13) fallback AH (index 33)
            const satkerColN = row[13];
            const satkerColAH = row[33];
            const satkerId = findSatkerId(satkerColN, satkerColAH);
            
            const jenisPegawai = nrpNip.startsWith('19') ? 'PNS' : 'POLRI';
            const hukuman = row[25] ? String(row[25]).trim() : null;
            const statusKeaktifan = (hukuman && hukuman.toUpperCase().includes('PTDH')) ? 'TIDAK AKTIF (PTDH)' : 'AKTIF';

            // Create or Find Personel
            let pRecord = await prisma.personel.findUnique({ where: { nrpNip } });
            if (!pRecord) {
                pRecord = await prisma.personel.create({
                    data: {
                        nrpNip, namaLengkap, pangkat, jabatan,
                        satkerId, jenisPegawai, statusKeaktifan,
                        tanggalLahir: new Date('1990-01-01'),
                        tanggalPensiun: new Date('2048-01-01')
                    }
                });
                pCreated++;
            } else if (statusKeaktifan === 'TIDAK AKTIF (PTDH)') {
                await prisma.personel.update({ where: { id: pRecord.id }, data: { statusKeaktifan } });
            }

            // Pelanggaran Data
            const wujudPerbuatan = row[14] ? String(row[14]).trim() : 'Data tidak tersedia';
            
            let jenisDasar = null;
            if (row[18] || row[19]) jenisDasar = 'Hasil Lidik Terbukti';
            else if (row[20] || row[21]) jenisDasar = 'Laporan Provos';
            else if (row[22] || row[23]) jenisDasar = 'Laporan Wabprof';

            const tanggalSurat = extractDate(row[19]) || parseExcelDate(row[2]) || new Date();
            const statusPenyelesaian = (row[24] || row[25]) ? 'SIDANG' : 'PROSES';
            const keteranganSelesai = row[30] ? String(row[30]).trim() : null;
            const createdAt = parseExcelDate(row[1]) || new Date();

            await prisma.pelanggaran.create({
                data: {
                    personelId: pRecord.id,
                    isDraft: false,
                    wujudPerbuatan,
                    jenisDasar,
                    nomorSurat: 'Sesuai Data Excel',
                    tanggalSurat,
                    pangkatSaatMelanggar: pangkat,
                    statusPenyelesaian,
                    hukuman,
                    keteranganSelesai,
                    createdAt
                }
            });

            processed++;
            if (processed % 200 === 0) console.log(`In progress: ${processed}/${dataRows.length}`);
        }

        console.log('--- IMPORT V4 REDO FINISHED ---');
        console.log(`Personel Created: ${pCreated}, Violations: ${processed}`);

    } catch (e) {
        console.error('Failure:', e);
    } finally {
        await prisma.$disconnect();
    }
}
importExcel();
