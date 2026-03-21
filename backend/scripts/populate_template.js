const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

function extractBirthDateFromNRPNIP(nrpNipRaw, isPns) {
    const nrp = String(nrpNipRaw).replace(/\D/g, '');
    let tglLahir = new Date('1980-01-01');

    if (isPns && nrp.length >= 18) {
        const y = nrp.substring(0, 4);
        const m = nrp.substring(4, 6);
        const d = nrp.substring(6, 8);
        tglLahir = new Date(`${y}-${m}-${d}`);
    } else if (!isPns && nrp.length >= 8) {
        const y = nrp.substring(0, 2);
        const m = nrp.substring(2, 4);
        let year = parseInt(y);
        let month = parseInt(m);
        year = year > 50 ? 1900 + year : 2000 + year;
        if (month > 0 && month <= 12) {
            tglLahir = new Date(`${year}-${month.toString().padStart(2, '0')}-01`);
        }
    }

    if (isNaN(tglLahir)) tglLahir = new Date('1980-01-01');

    const day = String(tglLahir.getDate()).padStart(2, '0');
    const month = String(tglLahir.getMonth() + 1).padStart(2, '0');
    const year = tglLahir.getFullYear();

    return `${day}/${month}/${year}`;
}

const sourceFile = path.join(__dirname, '../uploads/Personel_Bermasalah_PoldaJabar_04_Maret_2026.xls');
const destFile = path.join(__dirname, '../uploads/template_import_catpers.xlsx');

const wbSource = xlsx.readFile(sourceFile);
const sheetSource = wbSource.Sheets[wbSource.SheetNames[0]];

// Start from row index 5 (0-indexed, so row 6 which is actual data based on preview)
// We already saw the header is at index 3 and 4, so data starts at index 5.
const rows = xlsx.utils.sheet_to_json(sheetSource, { header: 1 });
const dataRows = rows.slice(5).filter(row => row && row[3] && row[4] && row[3].toString().trim() !== '');

const headers = [
    ['TEMPLATE IMPORT DATA PERSONEL & PELANGGARAN'],
    ['Petunjuk: Kolom dengan tanda (*) wajib diisi. Jangan mengubah urutan kolom.'],
    [],
    ['JENIS PEGAWAI (POLRI/PNS)*', 'NRP/NIP*', 'NAMA LENGKAP*', 'PANGKAT*', 'JABATAN*', 'SATKER/UNIT*', 'TANGGAL LAHIR (DD/MM/YYYY)*', 'WUJUD PERBUATAN', 'DASAR PENCATATAN', 'JENIS SIDANG (DISIPLIN/KKEP)', 'HUKUMAN', 'STATUS PENYELESAIAN (PROSES/MENJALANI_HUKUMAN/SIDANG/PERDAMAIAN/TIDAK_TERBUKTI)', 'TANGGAL REKOMENDASI (DD/MM/YYYY)', 'KETERANGAN']
];

const mappedData = dataRows.map(row => {
    // Indexes:
    // 3: NRP
    // 4: Nama
    // 5: Pangkat
    // 11: Jabatan Saat Ini (or 8 for Jabatan Saat Dilaporkan) -> Use 11 or 8
    // 12: Satker Saat Ini
    // 14: Kasus/Pasal -> Wujud Perbuatan
    // 15: Jenis Pelanggaran -> Dasar Pencatatan
    // 25: Sidang Penyelesaian -> Hukuman (if available) or 27 (SKHD Penyelesaian)
    // 28: Rekom Tanggal
    // 30: Keterangan
    // 31: Status => Status Penyelesaian

    let nrpRaw = String(row[3]).trim();
    if (nrpRaw.includes('E+')) {
        // handle exponent, though usually it's read by xlsx as a number, if string and E+, fix it.
        nrpRaw = BigInt(row[3]).toString();
    }

    // For PNS, NIPs are often read as scientific notation if not formatted cleanly. xlsx often reads it as a Number. 
    // We already do String() which might result in exponent. Let's rely on standard parsing, or format it to BigInt.
    try {
        if (typeof row[3] === 'number') {
            nrpRaw = BigInt(row[3]).toString();
        } else if (String(row[3]).toUpperCase().includes('E')) {
            nrpRaw = BigInt(Math.round(Number(row[3]))).toString(); // Try our best
        } else {
            nrpRaw = String(row[3]).replace(/[^0-9]/g, ''); // Ensure only digits
        }
    } catch (e) {
        nrpRaw = String(row[3]).replace(/\D/g, ''); // fallback
    }

    const isPns = String(row[5]).toUpperCase().includes('PNS') || nrpRaw.length >= 18;
    const jenisPegawai = isPns ? 'PNS' : 'POLRI';

    const tglLahir = extractBirthDateFromNRPNIP(nrpRaw, jenisPegawai === 'PNS');

    const nama = row[4] || '-';
    // Fix Pangkat Casing (e.g. BRIPDA -> Bripda)
    let pangkat = String(row[5] || '-');
    pangkat = pangkat.charAt(0).toUpperCase() + pangkat.slice(1).toLowerCase();

    const jabatan = row[11] || row[8] || '-'; // Jabatan saat ini atau saat dilaporkan
    const satker = row[12] || row[9] || '-'; // Satker saat ini atau saat dilaporkan

    const wujudPerbuatan = row[14] || '-';
    const dasarPencatatan = row[15] || '-';

    let hukuman = row[27] || row[25] || ''; // SKHD penyelesaian or Sidang penyelesaian
    let rawStatus = row[31] || ''; // Status field in excel
    let statusPenyelesaian = 'PROSES';

    // Map status from person_bermasalah format to our format:
    // PROSES/MENJALANI_HUKUMAN/SIDANG/PERDAMAIAN/TIDAK_TERBUKTI
    if (rawStatus.toUpperCase().includes('SELESAI') || rawStatus.toUpperCase().includes('SIDANG')) {
        statusPenyelesaian = 'SIDANG';
    } else if (rawStatus.toUpperCase().includes('HUKUM')) {
        statusPenyelesaian = 'MENJALANI_HUKUMAN';
    } else if (rawStatus.toUpperCase().includes('TIDAK TERBUKTI')) {
        statusPenyelesaian = 'TIDAK_TERBUKTI';
    }

    let jenisSidang = 'DISIPLIN';
    if (String(dasarPencatatan).toUpperCase().includes('KKEP') || String(wujudPerbuatan).toUpperCase().includes('KODE ETIK')) {
        jenisSidang = 'KKEP';
    }

    // Rekom tanggal -> format to DD/MM/YYYY. Usually comes as standard string or number in excel
    let tglRekom = '';
    const rawRekom = row[28];
    if (rawRekom) {
        if (typeof rawRekom === 'number') {
            const date = new Date((rawRekom - (25567 + 1)) * 86400 * 1000);
            tglRekom = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        } else {
            // raw string might be DD/MM/YYYY or YYYY-MM-DD
            tglRekom = rawRekom;
        }
    }

    const keterangan = row[30] || '-';

    return [
        jenisPegawai,
        nrpRaw,
        nama,
        pangkat,
        jabatan,
        satker,
        tglLahir,
        wujudPerbuatan,
        dasarPencatatan,
        jenisSidang,
        hukuman,
        statusPenyelesaian,
        tglRekom,
        keterangan
    ];
});

const finalData = [...headers, ...mappedData];

const wbNew = xlsx.utils.book_new();
const wsNew = xlsx.utils.aoa_to_sheet(finalData);
xlsx.utils.book_append_sheet(wbNew, wsNew, "Template");

xlsx.writeFile(wbNew, destFile);

console.log(`Successfully mapped ${mappedData.length} records to ${destFile}`);
