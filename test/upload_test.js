const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function test() {
    // 1. Buat PDF dummy
    const pdfPath = path.join(__dirname, 'dummy.pdf');
    const doc = new PDFDocument();

    await new Promise((resolve) => {
        const stream = fs.createWriteStream(pdfPath);
        stream.on('finish', resolve);
        doc.pipe(stream);

        doc.fontSize(12).text(`Kepada : 1. KOMPOL CANDRA KIRANA PUTRA, S.I.K., S.H., M.Si., CPHR. NRP 87041658 KASUBBIDPAMINAL
2. KOMPOL HENRI SINAGA, S.H. NRP 68120435
KAURBINPAM SUBBIDPAMINAL
3.  IPDA DELTA SAEFUL ANWAR NRP 87081518
PAMA URBINPAM SUBBIDPAMINAL
4. AIPTU RONALD NABABAN, S.H. NRP 82121030
BA URBINPAM SUBBIDPAMINAL
5. BRIPTU CAHYO TRI YUDANTHO, S.H., M.H NRP 98030426
BA URBINPAM SUBBIDPAMINAL
6.  BRIPTU ASCRI CHANDRA PRATIWI, S.H NRP 99090248
BA URBINPAM SUBBIDPAMINAL`);
        doc.end();
    });

    console.log("PDF created");

    // Tunggu file system sync
    await new Promise(r => setTimeout(r, 1000));

    // 2. Upload PDF
    const formData = new FormData();
    formData.append('dokumen', fs.createReadStream(pdfPath));

    try {
        const response = await axios.post('http://localhost:5000/api/pencarian/document', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });
        console.log("API Response:", JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error("API Error:", e.response ? e.response.data : e.message);
    }
}

test();
