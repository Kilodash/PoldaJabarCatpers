const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

async function importExcel() {
    console.log('--- IMPORT PERNAH BERMASALAH START ---');
    const filePath = 'c:\\Users\\ACER\\OneDrive\\PoldaJabarCatpers\\PoldaJabarCatpers\\backend\\uploads\\Personel_Pernah_Bermasalah_PoldaJabar_10_Maret_2026.xls';
    
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // header: 1 means array of arrays
        const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        const dataRows = rawData.slice(6); // Data begins at row 7 (index 6)
        console.log(`Ditemukan ${dataRows.length} baris data untuk diproses.`);

        const officialSatkers = await prisma.satker.findMany();
        const satkerNames = officialSatkers.map(s => ({ id: s.id, name: s.nama.toLowerCase() }));
        
        let poldaJabarId = satkerNames.find(s => s.name === 'polda jabar')?.id;
        if (!poldaJabarId) {
             console.log("Satker 'Polda Jabar' tidak ditemukan! Menggunakan Satker pertama sebagai fallback absolut.");
             poldaJabarId = officialSatkers[0]?.id; 
        }

        const findSatkerId = (excelName) => {
            if (!excelName) return poldaJabarId;
            const search = excelName.toString().toLowerCase().trim();
            
            if (search.includes('polda') || search.includes('mapolda')) {
                 return poldaJabarId;
            }
            
            let match = satkerNames.find(s => s.name === search || s.name.includes(search) || search.includes(s.name));
            if (match) return match.id;

            if (search.includes('brimob')) {
                const b = satkerNames.find(s => s.name.includes('brimob'));
                if (b) return b.id;
            }
            if (search.includes('polres') || search.includes('polresta')) {
                const cleaned = search.replace('polrestabes', '').replace('polresta', '').replace('polres', '').trim();
                const pMatch = satkerNames.find(s => s.name.includes(cleaned));
                if (pMatch) return pMatch.id;
            }

            return poldaJabarId;
        };

        const parseExcelDate = (val) => {
            if (!val) return null;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        let processed = 0;
        let personelCreated = 0;
        let personelUpdated = 0;
        
        // Tracking untuk rekapitulasi akhir
        const stats = {
            ptdh: 0,
            pensiun: 0,
            tidakAktif: 0,
            aktif: 0
        };

        for (const row of dataRows) {
            let nrpNip = row[3] ? String(row[3]).trim().replace(/\s+/g, '') : null; // Kolom D
            if (!nrpNip) continue;

            // -- Evaluasi Tipe & Validitas NRP/NIP --
            let jenisPegawai = 'POLRI'; // Default
            let isValid = false;
            let isPensiun = false;

            const isPNS = nrpNip.startsWith('19') && nrpNip.length >= 10;
            
            if (isPNS) {
                 jenisPegawai = 'PNS';
                 isValid = nrpNip.length === 18;
                 
                 // Cek pensiun PNS (Umur 58)
                 if (isValid) {
                     const birthYear = parseInt(nrpNip.substring(0, 4));
                     if (!isNaN(birthYear) && (2026 - birthYear) >= 58) {
                         isPensiun = true;
                     }
                 }
            } else {
                 isValid = nrpNip.length === 8 && /^\d+$/.test(nrpNip);
                 
                 // Cek pensiun POLRI (Umur 58)
                 if (isValid) {
                     let birthYearSuffix = parseInt(nrpNip.substring(0, 2));
                     let birthYear = birthYearSuffix < 50 ? 2000 + birthYearSuffix : 1900 + birthYearSuffix;
                     if (!isNaN(birthYear) && (2026 - birthYear) >= 58) {
                         isPensiun = true;
                     }
                 }
            }

            // -- Mapping Personel --
            const namaLengkap = row[4] ? String(row[4]).trim() : '-'; // Kolom E
            const pangkat = row[5] ? String(row[5]).trim() : '-'; // Kolom F
            
            if (pangkat.toUpperCase().includes('PURN')) {
                isPensiun = true;
            }
            
            // Jabatan = Kolom L (11) + M (12)
            const jabatanParts = [
                row[11] ? String(row[11]).trim() : '',
                row[12] ? String(row[12]).trim() : ''
            ].filter(Boolean);
            const jabatan = jabatanParts.length > 0 ? jabatanParts.join(' ') : '-';
            
            // Kesatuan / Satker = Kolom N (13)
            const satkerName = row[13];
            const satkerId = findSatkerId(satkerName);

            // -- Logika Status Keaktifan (Urutkan Prioritas) --
            const kolomZ = row[25] ? String(row[25]).trim().toUpperCase() : '';
            const isPtdh = kolomZ.includes('PTDH');
            
            let statusKeaktifan = 'AKTIF';
            if (isPtdh) {
                statusKeaktifan = 'TIDAK AKTIF (PTDH)';
                stats.ptdh++;
            } else if (isPensiun) {
                statusKeaktifan = 'PENSIUN';
                stats.pensiun++;
            } else if (!isValid) {
                statusKeaktifan = 'TIDAK AKTIF'; // Tidak valid
                stats.tidakAktif++;
            } else {
                stats.aktif++;
            }

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
                // Jangan override status keaktifan yang sudah lebih buruk (misal sebelumnya di V5 sudah PTDH, jangan ditimpa pensiun/aktif)
                let newStatus = pRecord.statusKeaktifan;
                
                // Prioritas: PTDH > PENSIUN > TIDAK AKTIF > AKTIF
                const valMap = { 'TIDAK AKTIF (PTDH)': 4, 'PENSIUN': 3, 'TIDAK AKTIF': 2, 'AKTIF': 1 };
                const currentVal = valMap[pRecord.statusKeaktifan] || 1;
                const incomingVal = valMap[statusKeaktifan] || 1;
                
                if (incomingVal > currentVal) {
                    newStatus = statusKeaktifan;
                }

                pRecord = await prisma.personel.update({
                    where: { id: pRecord.id },
                    data: { jabatan, pangkat, satkerId, statusKeaktifan: newStatus }
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

            // OTOMATIS SELESAI
            const statusPenyelesaian = 'SELESAI';

            await prisma.pelanggaran.create({
                data: {
                    personelId: pRecord.id,
                    isDraft: false,
                    wujudPerbuatan,
                    nomorSurat,
                    tanggalSurat: new Date(), 
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

        console.log('--- IMPORT PERNAH BERMASALAH FINISHED ---');
        console.log(`Personel Baru: ${personelCreated}, Personel Diupdate: ${personelUpdated}`);
        console.log(`Total Pelanggaran Dimasukkan: ${processed}`);
        
        console.log('\n--- RINGKASAN DATA MASUK (Evaluasi Baris) ---');
        console.log(`- Terdeteksi PTDH: ${stats.ptdh}`);
        console.log(`- Terdeteksi PENSIUN (Umur>=58 / PURN): ${stats.pensiun}`);
        console.log(`- Terdeteksi TIDAK AKTIF (NRP Tidak Valid): ${stats.tidakAktif}`);
        console.log(`- Terdeteksi AKTIF: ${stats.aktif}`);

    } catch (e) {
        console.error('Error saat import:', e);
    } finally {
        await prisma.$disconnect();
    }
}
importExcel();
