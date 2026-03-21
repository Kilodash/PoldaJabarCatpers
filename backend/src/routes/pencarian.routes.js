const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { searchPersonelManual, searchPersonelDocument } = require('../controllers/pencarian.controller');

// Setup multer untuk upload file PDF (disimpan sementara di memori buffer)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.pdf') {
            return cb(new Error('Hanya file PDF yang diperbolehkan'));
        }
        cb(null, true);
    }
});

// Middleware auth jika diperlukan (opsional, karena ini bisa public atau internal)
// const { authenticate, authorizeRole } = require('../middlewares/auth.middleware');

// Endpoint: Manual Input
// router.post('/manual', authenticate, searchPersonelManual);
router.post('/manual', searchPersonelManual);

// Endpoint: Upload PDF 
// router.post('/document', authenticate, upload.single('dokumen'), searchPersonelDocument);
router.post('/document', upload.single('dokumen'), searchPersonelDocument);

module.exports = router;
