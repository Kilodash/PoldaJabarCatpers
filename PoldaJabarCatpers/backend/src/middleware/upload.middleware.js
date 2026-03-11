const multer = require('multer');
const path = require('path');

// Use memory storage for serverless execution / Supabase upload
const storage = multer.memoryStorage();

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
