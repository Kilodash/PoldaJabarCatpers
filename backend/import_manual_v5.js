const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

async function importExcel() {
    console.log('--- MANUAL IMPORT V5 (Sesuai Aturan Baru) START ---');
    const filePath = 'c:\\Users\\ACER\\OneDrive\\PoldaJabarCatpers\\PoldaJabarCatpers\\backend\\uploads\\Personel_Bermasalah_PoldaJabar_10_Maret_2026.xls';
    
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // header: 1 means we get an array of arrays (rows of columns based on index)
        const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        const dataRows = rawData.slice(6); // Data begins at row 7 (index 6)
        console.log(`Ditemukan ${dataRows.length} baris data untuk diproses.`);

        const officialSatkers = await prisma.satker.findMany();
        const satkerNames = officialSatkers.map(s => ({ id: s.id, name: s.nama.toLowerCase() }));
        
        // Find Polda Jabar as default fallback
        let poldaJabarId = satkerNames.find(s => s.name === 'polda jabar')?.id;
        if (!poldaJabarId) {
             console.log("Satker 'Polda Jabar' tidak ditemukan! Menggunakan Satker pertama sebagai fallback absolut.");
             poldaJabarId = officialSatkers[0]?.id; 
        }

        const findSatkerId = (excelName) => {
            if (!excelName) return poldaJabarId;
            const search = excelName.toString().toLowerCase().trim();
            
            // Prioritas pengecekan eksplisit Polda Jabar (jika dari excel tertulis mengandung kata polda)
            if (search.includes('polda') || search.includes('mapolda')) {
                 return poldaJabarId;
            }

            // Exact Match atau partial Match
            let match = satkerNames.find(s => s.name === search || s.name.includes(search) || search.includes(s.name));
            if (match) return match.id;

            // Logika spesifik Brimob / Polres
            if (search.includes('brimob')) {
                const b = satkerNames.find(s => s.name.includes('brimob'));
                if (b) return b.id;
            }
            if (search.includes('polres') || search.includes('polresta')) {
                const cleaned = search.replace('polrestabes', '').replace('polresta', '').replace('polres', '').trim();
                const pMatch = satkerNames.find(s => s.name.includes(cleaned));
                if (pMatch) return pMatch.id;
            }

            return poldaJabarId; // Default fallback sesuai instruksi
        };

        const parseExcelDate = (val) => {
            if (!val) return null;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        let processed = 0;
        let personelCreated = 0;
        let personelUpdated = 0;

        for (const row of dataRows) {
            const nrpNip = row[3] ? String(row[3]).trim() : null; // Kolom D
            if (!nrpNip) continue; // Skip jika NRP kosong

            // -- Mapping Personel --
            const namaLengkap = row[4] ? String(row[4]).trim() : '-'; // Kolom E
            const pangkat = row[5] ? String(row[5]).trim() : '-'; // Kolom F
            const jenisPegawai = nrpNip.startsWith('19') ? 'PNS' : 'POLRI';
            
            // Jabatan = Kolom L (11) + M (12)
            const jabatanParts = [
                row[11] ? String(row[11]).trim() : '',
                row[12] ? String(row[12]).trim() : ''
            ].filter(Boolean);
            const jabatan = jabatanParts.length > 0 ? jabatanParts.join(' ') : '-';
            
            // Kesatuan / Satker = Kolom N (13)
            const satkerName = row[13];
            const satkerId = findSatkerId(satkerName);

            // Logika Status Keaktifan Personel (Kolom Z (25) mengandung kata PTDH)
            const kolomZ = row[25] ? String(row[25]).trim().toUpperCase() : '';
            const statusKeaktifan = kolomZ.includes('PTDH') ? 'TIDAK AKTIF (PTDH)' : 'AKTIF';

            // Create or Find Personel
            let pRecord = await prisma.personel.findUnique({ where: { nrpNip } });
            
            if (!pRecord) {
                pRecord = await prisma.personel.create({
                    data: {
                        nrpNip,
                        namaLengkap,
                        pangkat,
                        jabatan,
                        satkerId,
                        jenisPegawai,
                        statusKeaktifan,
                        tanggalLahir: new Date('1990-01-01'), // dummy date
                        tanggalPensiun: new Date('2048-01-01') // dummy date
                    }
                });
                personelCreated++;
            } else {
                // Update jabatan, pangkat, satker, status keaktifan jika data sudah ada
                pRecord = await prisma.personel.update({
                    where: { id: pRecord.id },
                    data: { jabatan, pangkat, satkerId, statusKeaktifan }
                });
                personelUpdated++;
            }

            // -- Mapping Pelanggaran --
            const wujudPerbuatan = row[14] ? String(row[14]).trim() : 'Data tidak tersedia'; // Kolom O
            const pangkatSaatMelanggar = row[5] ? String(row[5]).trim() : '-'; // Kolom F
            
            // Jabatan Saat Melanggar = Kolom I (8) + J (9)
            const jabatanPelanggarParts = [
                row[8] ? String(row[8]).trim() : '',
                row[9] ? String(row[9]).trim() : ''
            ].filter(Boolean);
            const jabatanSaatMelanggar = jabatanPelanggarParts.length > 0 ? jabatanPelanggarParts.join(' ') : '-';
            
            // Satker saat melanggar = Kolom N (13)
            const satkerSaatMelanggarId = findSatkerId(row[13]);
            // Get string name for the satker ID
            const satkerSaatMelanggar = officialSatkers.find(s => s.id === satkerSaatMelanggarId)?.nama || 'Polda Jabar';

            const nomorSurat = 'Data Import tanggal 11 Maret 2025';
            
            // Keterangan Dasar = Kolom T(19), V(21), X(23), Z(25), AE(30)
            const ketParts = [];
            if (row[19]) ketParts.push(`[Terbukti Lapor Propam]: ${String(row[19]).trim()}`);
            if (row[21]) ketParts.push(`[Terbukti Lapor Provos]: ${String(row[21]).trim()}`);
            if (row[23]) ketParts.push(`[Terbukti Lapor Wabprof]: ${String(row[23]).trim()}`);
            if (row[25]) ketParts.push(`[Hukuman Sidang]: ${String(row[25]).trim()}`);
            if (row[30]) ketParts.push(`[Keterangan]: ${String(row[30]).trim()}`);
            
            const keteranganDasar = ketParts.length > 0 ? ketParts.join('\n') : null;

            const jenisSidang = null;
            const nomorSkep = row[27] ? String(row[27]).trim() : null; // Kolom AB
            const hukuman = '-';
            const nomorRekomendasi = row[29] ? String(row[29]).trim() : null; // Kolom AD
            const tanggalRekomendasi = parseExcelDate(row[28]); // Kolom AC

            // Logika Status Penyelesaian
            // Apabila Kolom Z = 'PROSES' status Penyelesaian 'PROSES'
            // Apabila Kolom Z != 'PROSES' status penyelesaian 'SIDANG'
            let statusPenyelesaian = 'SIDANG'; // default if not proses
            if (kolomZ.includes('PROSES')) {
                statusPenyelesaian = 'PROSES';
            }

            await prisma.pelanggaran.create({
                data: {
                    personelId: pRecord.id,
                    isDraft: false,
                    wujudPerbuatan,
                    nomorSurat,
                    tanggalSurat: new Date(), // Using current date as default for required field
                    pangkatSaatMelanggar,
                    jabatanSaatMelanggar,
                    satkerSaatMelanggar,
                    keteranganDasar,
                    jenisSidang,
                    nomorSkep,
                    hukuman,
                    nomorRekomendasi,
                    tanggalRekomendasi,
                    statusPenyelesaian
                }
            });

            processed++;
            if (processed % 100 === 0) console.log(`Proses baris ke-${processed} / ${dataRows.length}`);
        }

        console.log('--- IMPORT V5 FINISHED ---');
        console.log(`Personel Baru: ${personelCreated}, Personel Diupdate: ${personelUpdated}`);
        console.log(`Total Pelanggaran Dimasukkan: ${processed}`);

    } catch (e) {
        console.error('Error saat import:', e);
    } finally {
        await prisma.$disconnect();
    }
}
importExcel();
