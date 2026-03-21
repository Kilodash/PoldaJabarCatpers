const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

async function importExcel() {
    console.log('--- MANUAL EXCEL IMPORT START ---');
    const filePath = 'c:\\Users\\ACER\\OneDrive\\PoldaJabarCatpers\\PoldaJabarCatpers\\backend\\uploads\\Personel_Bermasalah_PoldaJabar_10_Maret_2026.xls';
    
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        const dataRows = rawData.slice(6); // Data starts at row 7 (index 6)
        console.log(`Found ${dataRows.length} rows to process.`);
        
        const officialSatkers = await prisma.satker.findMany();
        const satkerNames = officialSatkers.map(s => ({ id: s.id, name: s.nama.toLowerCase() }));

        const findSatkerId = (excelName) => {
            if (!excelName) return officialSatkers[0].id; // Fallback to first one if empty
            const search = excelName.toLowerCase().trim();
            
            // 1. Exact or include match
            let match = satkerNames.find(s => s.name === search || s.name.includes(search) || search.includes(s.name));
            if (match) return match.id;

            // 2. Special cases for Brimob
            if (search.includes('brimob')) {
                const brimob = satkerNames.find(s => s.name.includes('brimob'));
                if (brimob) return brimob.id;
            }
            
            // 3. Special cases for Polrestabes/Polresta/Polres
            if (search.includes('polres')) {
               const p = satkerNames.find(s => s.name.includes(search.replace('polres', '').trim()));
               if (p) return p.id;
            }

            return officialSatkers[0].id; // Default fallback instead of creating new
        };

        const parseDate = (dateStr) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        };

        let processedCount = 0;
        let createdPersonelCount = 0;

        for (const row of dataRows) {
            if (!row[3]) continue; // Skip if no NRP (Col 4)
            
            const nrpNip = String(row[3]).trim();
            const namaLengkap = row[4] ? String(row[4]).trim() : '-';
            const pangkat = row[5] ? String(row[5]).trim() : '-';
            const kelompok = row[7] ? String(row[7]).trim().toUpperCase() : '';
            
            const jabatanSaatIni = row[11] ? String(row[11]).trim() : '-';
            const satkerSaatIniName = row[12] ? String(row[12]).trim() : null;
            
            const kasus = row[14] ? String(row[14]).trim() : '';
            const jenisPel = row[15] ? String(row[15]).trim() : '';
            const wujudPerbuatan = kasus || 'Data tidak tersedia';
            const jenisDasar = jenisPel || null;
            
            const tglLaporan = parseDate(row[2]) || new Date();
            const tglEntry = parseDate(row[1]) || new Date();
            
            // Hukuman from Sidang (Col 26) and SKHD (Col 28)
            const sidangHukuman = row[25] ? String(row[25]).trim() : null;
            const skhdHukuman = row[27] ? String(row[27]).trim() : null;
            const hukuman = [sidangHukuman, skhdHukuman].filter(Boolean).join(' | ') || null;
            
            const statusRaw = row[31] ? String(row[31]).trim() : 'Proses';
            let statusPenyelesaian = 'PROSES';
            if (statusRaw.toLowerCase().includes('selesai') || statusRaw.toLowerCase() === 'pengawasan' || hukuman) {
                statusPenyelesaian = 'MENJALANI_HUKUMAN';
            }
            
            let statusKeaktifan = 'AKTIF';
            if (hukuman && hukuman.toUpperCase().includes('PTDH')) {
                statusKeaktifan = 'TIDAK AKTIF (PTDH)';
            }
            
            const keterangan = row[30] ? String(row[30]).trim() : null;

            // Satker check (NO NEW CREATION)
            const satkerId = findSatkerId(satkerSaatIniName);
            
            // Personel creation/update
            let personel = await prisma.personel.findUnique({ where: { nrpNip } });
            if (!personel) {
                const jenisPeg = kelompok.includes('PNS') ? 'PNS' : 'POLRI';
                personel = await prisma.personel.create({
                    data: {
                        nrpNip,
                        namaLengkap,
                        pangkat,
                        jabatan: jabatanSaatIni,
                        satkerId,
                        jenisPegawai: jenisPeg,
                        tanggalLahir: new Date('1990-01-01'),
                        tanggalPensiun: new Date('2048-01-01'),
                        statusKeaktifan
                    }
                });
                createdPersonelCount++;
            } else if (statusKeaktifan === 'TIDAK AKTIF (PTDH)') {
                await prisma.personel.update({
                    where: { id: personel.id },
                    data: { statusKeaktifan }
                });
            }

            // Pelanggaran creation
            await prisma.pelanggaran.create({
                data: {
                    personelId: personel.id,
                    isDraft: false,
                    wujudPerbuatan,
                    jenisDasar,
                    nomorSurat: 'Sesuai Data Excel',
                    tanggalSurat: tglLaporan,
                    pangkatSaatMelanggar: pangkat,
                    statusPenyelesaian,
                    hukuman,
                    keteranganSelesai: keterangan,
                    createdAt: tglEntry
                }
            });

            processedCount++;
            if (processedCount % 200 === 0) console.log(`Processed ${processedCount}/${dataRows.length} rows...`);
        }
        
        console.log(`--- IMPORT FINISHED ---`);
        console.log(`Baru: ${createdPersonelCount}, Total Pelanggaran: ${processedCount}`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}
importExcel();
