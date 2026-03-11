const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const { personelNama, personelNrp } = req.body;
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);

        if (personelNama && personelNrp) {
            cb(null, `${personelNama}_${personelNrp}_${file.fieldname}_${timestamp}${ext}`);
        } else {
            const uniqueSuffix = timestamp + '-' + Math.round(Math.random() * 1e9);
            cb(null, file.fieldname + '-' + uniqueSuffix + ext);
        }
    }
});

const fileFilter = (req, file, cb) => {
    // Hanya menerima PDF dan gambar
    if (
        file.mimetype === 'application/pdf' ||
        file.mimetype.startsWith('image/')
    ) {
        cb(null, true);
    } else {
        cb(new Error('Hanya diperbolehkan format PDF atau Gambar!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Batasan ukuran file 5MB
    },
    fileFilter: fileFilter
});

module.exports = upload;
