const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

async function importExcel() {
    console.log('--- EXCEL IMPORT START ---');
    const filePath = 'c:\\Users\\ACER\\OneDrive\\PoldaJabarCatpers\\PoldaJabarCatpers\\backend\\uploads\\Personel_Bermasalah_PoldaJabar_10_Maret_2026.xls';
    
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Read data starting from row 4 (index 3) Since header is at row 4
        // Actually, we can read as array of arrays and slice the data
        const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        // Data starts from index 6 (row 7 in excel viewer), let's check our JSON dump
        // json index 6 corresponds to first data row: "1", "2011-04-01", etc.
        const dataRows = rawData.slice(6);
        
        console.log(`Found ${dataRows.length} rows to process.`);
        
        // Helper to parse dates from Excel string "YYYY-MM-DD"
        const parseDate = (dateStr) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        };

        // Cache for Satker to avoid multiple queries
        const satkerCache = {};
        
        const getOrCreateSatker = async (satkerName) => {
            if (!satkerName) return null;
            const name = satkerName.trim();
            if (satkerCache[name]) return satkerCache[name];
            
            let satker = await prisma.satker.findFirst({ where: { nama: name } });
            if (!satker) {
                satker = await prisma.satker.create({ data: { nama: name } });
            }
            satkerCache[name] = satker;
            return satker;
        };

        let processedCount = 0;
        let createdPersonelCount = 0;

        for (const row of dataRows) {
            // Row is an array of columns 0 to 34
            if (!row[3]) continue; // Skip if no NRP
            
            const nrpNip = String(row[3]).trim();
            const namaLengkap = row[4] ? String(row[4]).trim() : '-';
            const pangkat = row[5] ? String(row[5]).trim() : '-';
            const jenisKelamin = row[6] ? String(row[6]).trim() : '-';
            const kelompok = row[7] ? String(row[7]).trim() : '-'; // Optional mapping
            
            // Satker Saat Ini
            const jabatanSaatIni = row[11] ? String(row[11]).trim() : '-';
            const satkerSaatIniName = row[12] ? String(row[12]).trim() : null;
            // var satwilSaatIni = row[13]; // e.g. Polda Jabar
            
            // Satker Saat Dilaporkan
            const jabatanDilaporkan = row[8] ? String(row[8]).trim() : null;
            const satkerDilaporkanName = row[9] ? String(row[9]).trim() : null;
            
            const kasus = row[14] ? String(row[14]).trim() : '';
            const jenisPel = row[15] ? String(row[15]).trim() : '';
            const wujudPerbuatan = [kasus, jenisPel].filter(Boolean).join(' - ') || 'Data tidak tersedia';
            const jenisDasar = jenisPel || null;
            
            const tglLaporan = parseDate(row[2]) || new Date(); // Fallback to current date
            const tglEntry = parseDate(row[1]) || new Date();
            
            // Sidang & Hukuman & Status
            const penangananPolda = row[16];
            const penangananSatwil = row[17];
            
            // Gather hukuman from all processes
            const hukumanArr = [];
            const rProvosHasil = row[20];
            const rProvosUraian = row[21];
            if (rProvosHasil) hukumanArr.push(`Riksa Provos: ${rProvosHasil} (${rProvosUraian || '-'})`);
            
            const sidangTgl = row[24];
            const sidangPutusan = row[25];
            if (sidangPutusan) hukumanArr.push(`Sidang (${sidangTgl || '-'}): ${sidangPutusan}`);
            
            const skhdTgl = row[26];
            const skhdPutusan = row[27];
            if (skhdPutusan) hukumanArr.push(`SKHD (${skhdTgl || '-'}): ${skhdPutusan}`);
            
            const rekomTgl = row[28];
            const rekomPutusan = row[29];
            if (rekomPutusan) hukumanArr.push(`Rekom: ${rekomPutusan}`);
            
            const hukuman = hukumanArr.length > 0 ? hukumanArr.join(' | ') : null;
            
            const statusRaw = row[31] ? String(row[31]).trim() : 'Proses';
            let statusPenyelesaian = 'PROSES';
            let statusKeaktifan = 'AKTIF';
            
            if (statusRaw.toLowerCase().includes('selesai') || statusRaw.toLowerCase() === 'pengawasan' || hukuman) {
                statusPenyelesaian = 'MENJALANI_HUKUMAN'; 
                // Using MENJALANI_HUKUMAN as a generic completed state for punished records
                // Can also use TIDAK_TERBUKTI if it was not proven, but we don't have explicit not proven status here easily.
            }
            
            // Check PTDH
            if (hukuman && hukuman.toUpperCase().includes('PTDH')) {
                statusKeaktifan = 'TIDAK AKTIF (PTDH)';
            }
            
            const keterangan = row[30] ? String(row[30]).trim() : null;

            // 1. Ensure Satker exists for Personel's current assignment
            const satkerObj = await getOrCreateSatker(satkerSaatIniName || satkerDilaporkanName || 'Satker Tidak Diketahui');
            
            // 2. Find or Create Personel
            let personel = await prisma.personel.findUnique({
                where: { nrpNip: nrpNip }
            });

            if (!personel) {
                // Determine Jenis Pegawai from kelompok or default
                let jenisPeg = "POLRI";
                if (kelompok.toUpperCase().includes('PNS')) jenisPeg = 'PNS';
                
                personel = await prisma.personel.create({
                    data: {
                        nrpNip: nrpNip,
                        namaLengkap: namaLengkap,
                        pangkat: pangkat,
                        jabatan: jabatanSaatIni || jabatanDilaporkan || '-',
                        satkerId: satkerObj.id,
                        jenisPegawai: jenisPeg,
                        tanggalLahir: new Date('1990-01-01'), // Default dummy date
                        tanggalPensiun: new Date('2048-01-01'), // Default dummy date
                        statusKeaktifan: statusKeaktifan
                    }
                });
                createdPersonelCount++;
            } else {
                // If PTDH found in new record, update existing personel
                if (statusKeaktifan === 'TIDAK AKTIF (PTDH)' && personel.statusKeaktifan !== 'TIDAK AKTIF (PTDH)') {
                    await prisma.personel.update({
                        where: { id: personel.id },
                        data: { statusKeaktifan: statusKeaktifan }
                    });
                }
            }

            // 3. Create Pelanggaran Record
            await prisma.pelanggaran.create({
                data: {
                    personelId: personel.id,
                    isDraft: false,
                    wujudPerbuatan: wujudPerbuatan,
                    jenisDasar: jenisDasar,
                    nomorSurat: 'Sesuai Data Excel',
                    tanggalSurat: tglLaporan,
                    pangkatSaatMelanggar: pangkat,
                    jabatanSaatMelanggar: jabatanDilaporkan || null,
                    satkerSaatMelanggar: satkerDilaporkanName || null,
                    statusPenyelesaian: statusPenyelesaian,
                    hukuman: hukuman,
                    keteranganSelesai: keterangan,
                    createdAt: tglEntry, // Set the entry date explicitly
                    // Fill other fields if possible
                    jenisSidang: sidangPutusan ? 'KKEP/DISIPLIN (EXCEL)' : null,
                    tanggalSkep: parseDate(skhdTgl),
                    tanggalRekomendasi: parseDate(rekomTgl)
                }
            });

            processedCount++;
            if (processedCount % 100 === 0) {
                console.log(`Processed ${processedCount}/${dataRows.length} rows...`);
            }
        }
        
        console.log(`--- EXCEL IMPORT FINISHED ---`);
        console.log(`Total Personel Baru Dibuat: ${createdPersonelCount}`);
        console.log(`Total Pelanggaran Diimpor: ${processedCount}`);
        
    } catch (error) {
        console.error('Import Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

importExcel();
