const prisma = require('../prisma');
const pdfParse = require('pdf-parse');
const fs = require('fs');

// Helper untuk mengekstrak NRP/NIP beserta namanya dari textarea
const parseManualInput = (inputString) => {
    const lines = inputString.split('\n');
    const results = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        let nrpNip = '';
        let extractedName = '';
        let digitsOnly = line.replace(/\D/g, '');

        if (digitsOnly.length >= 18) {
            nrpNip = digitsOnly.substring(0, 18);
            let digitCount = 0;
            let lastDigitIndex = 0;
            for (let i = 0; i < line.length; i++) {
                if (/\d/.test(line[i])) {
                    digitCount++;
                    if (digitCount === 18) {
                        lastDigitIndex = i;
                        break;
                    }
                }
            }
            extractedName = line.substring(lastDigitIndex + 1).replace(/^[,|\-\s+]+/, '').trim();
        } else if (digitsOnly.length >= 8) {
            nrpNip = digitsOnly.substring(0, 8);
            let digitCount = 0;
            let lastDigitIndex = 0;
            for (let i = 0; i < line.length; i++) {
                if (/\d/.test(line[i])) {
                    digitCount++;
                    if (digitCount === 8) {
                        lastDigitIndex = i;
                        break;
                    }
                }
            }
            extractedName = line.substring(lastDigitIndex + 1).replace(/^[,|\-\s+]+/, '').trim();
        }

        if (nrpNip) {
            results.push({
                nrpNip: nrpNip,
                inputName: extractedName ? extractedName.trim() : ''
            });
        }
    }
    return results;
};

// Helper untuk validasi kesesuaian nama (Simple string comparison)
const checkNameMismatch = (dbName, inputName) => {
    if (!inputName || inputName.trim() === '') return false; // Abaikan jika input nama kosong

    const normalizedDb = dbName.toLowerCase().replace(/[^a-z]/g, '');
    const normalizedInput = inputName.toLowerCase().replace(/[^a-z]/g, '');

    // Jika input nama terkandung di dalam nama DB atau sebaliknya, dianggap cocok (simple case)
    if (normalizedDb.includes(normalizedInput) || normalizedInput.includes(normalizedDb)) {
        return false; // Tidak mismatch
    }

    return true; // Mismatch
};

const searchPersonelManual = async (req, res) => {
    try {
        const { textInput } = req.body;
        if (!textInput) {
            return res.status(400).json({ message: 'Input teks tidak boleh kosong' });
        }

        const parsedData = parseManualInput(textInput);
        if (parsedData.length === 0) {
            return res.status(400).json({ message: 'Tidak ditemukan format NRP/NIP yang valid pada input.' });
        }

        const nrpNips = parsedData.map(p => p.nrpNip);

        // Ambil data personil (termasuk yang tidak aktif / sudah dihapus)
        const personels = await prisma.personel.findMany({
            where: {
                OR: [
                    { nrpNip: { in: nrpNips }, deletedAt: null },
                    {
                        OR: nrpNips.map(nrp => ({
                            nrpNip: { contains: `_${nrp}`, mode: 'insensitive' },
                            deletedAt: { not: null }
                        }))
                    }
                ]
            },
            include: {
                satker: true,
                pelanggaran: {
                    where: { deletedAt: null }
                }
            }
        });

        const results = parsedData.map(inputData => {
            const foundPersonel = personels.find(p => p.nrpNip === inputData.nrpNip || p.nrpNip.endsWith(`_${inputData.nrpNip}`));

            if (!foundPersonel) {
                return {
                    nrpNip: inputData.nrpNip,
                    inputName: inputData.inputName,
                    found: false,
                    message: "Data tidak ditemukan di database"
                };
            }

            const nameMismatch = checkNameMismatch(foundPersonel.namaLengkap, inputData.inputName);

            return {
                nrpNip: inputData.nrpNip,
                inputName: inputData.inputName,
                found: true,
                nameMismatch: nameMismatch,
                personel: foundPersonel
            };
        });

        res.json({
            message: "Pencarian manual selesai",
            data: results
        });

    } catch (error) {
        console.error("Error searchPersonelManual:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

const searchPersonelDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File dokumen harus diunggah.' });
        }

        // Ekstraksi teks dari PDF menggunakan buffer (memoryStorage)
        const dataBuffer = req.file.buffer;
        const data = await pdfParse(dataBuffer);
        const pdfText = data.text;

        if (!pdfText || pdfText.trim() === '') {
            return res.status(400).json({ message: 'Gagal mengekstrak teks atau dokumen kosong.' });
        }

        // Cari semua kemunculan NRP/NIP (8 atau 18 digit) tanpa batas word khusus agar tidak terpancung karakter spasi/tanda baca
        const regexNrpnip = /(?<!\d)(\d{8}|\d{18})(?!\d)/g;
        let matches = [];
        let match;
        while ((match = regexNrpnip.exec(pdfText)) !== null) {
            matches.push(match[1]);
        }

        // Hilangkan duplikasi NIP/NRP dari hasil ekstrak
        const uniqueNrpNips = [...new Set(matches)];

        if (uniqueNrpNips.length === 0) {
            return res.status(400).json({ message: 'Tidak ditemukan format NIP atau NRP yang valid di dalam dokumen.' });
        }

        const personels = await prisma.personel.findMany({
            where: {
                OR: [
                    { nrpNip: { in: uniqueNrpNips }, deletedAt: null },
                    {
                        OR: uniqueNrpNips.map(nrp => ({
                            nrpNip: { contains: `_${nrp}`, mode: 'insensitive' },
                            deletedAt: { not: null }
                        }))
                    }
                ]
            },
            include: {
                satker: true,
                pelanggaran: {
                    where: { deletedAt: null }
                }
            }
        });

        // Karena sulit mengekstrak nama pasangannya dari PDF secara akurat tanpa struktur pasti,
        // kita akan mengecek apakah "NamaLengkap" DB muncul di teks PDF secara global (berdekatan).
        // Jika tidak muncul, kita flag nameMismatch.
        const normalizedPdfText = pdfText.toLowerCase().replace(/[^a-z0-9]/g, ' ');

        const results = uniqueNrpNips.map(nrpNip => {
            const foundPersonel = personels.find(p => p.nrpNip === nrpNip || p.nrpNip.endsWith(`_${nrpNip}`));

            if (!foundPersonel) {
                return {
                    nrpNip: nrpNip,
                    inputName: "Otomatis PDF",
                    found: false,
                    message: "Data tidak ditemukan di database"
                };
            }

            // Cek apakah minimal nama panggilannya (word term) ada di PDF
            const personWords = foundPersonel.namaLengkap.toLowerCase().split(' ').filter(w => w.length > 3);
            let nameMismatch = true;

            if (personWords.length === 0) {
                // Nama terlalu pendek, default aja match
                const cleanName = foundPersonel.namaLengkap.toLowerCase().replace(/[^a-z]/g, '');
                if (normalizedPdfText.includes(cleanName)) {
                    nameMismatch = false;
                }
            } else {
                // Cek apakah ada minimal salah satu kata dari nama ada di dokumen
                const foundAnyWord = personWords.some(word => normalizedPdfText.includes(word));
                nameMismatch = !foundAnyWord;
            }

            return {
                nrpNip: nrpNip,
                inputName: "Otomatis dari PDF",
                found: true,
                nameMismatch,
                personel: foundPersonel
            };
        });

        res.json({
            message: "Pencarian dokumen selesai",
            data: results,
            extractedTextSnippet: pdfText.substring(0, 200) + '...' // sekadar info debug
        });

    } catch (error) {
        console.error("Error searchPersonelDocument:", error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memproses dokumen.' });
    }
};

module.exports = {
    searchPersonelManual,
    searchPersonelDocument
};
