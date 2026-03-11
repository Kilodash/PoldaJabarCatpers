const express = require('express');
const router = express.Router();
const pelanggaranController = require('../controllers/pelanggaran.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authMiddleware);

// Endpoint untuk upload file multipel (file dasar & file surat selesai)
const cpUpload = upload.fields([
    { name: 'fileDasar', maxCount: 10 },
    { name: 'fileSelesai', maxCount: 10 },
    { name: 'filePutusan', maxCount: 10 },
    { name: 'fileRekomendasi', maxCount: 10 },
    { name: 'fileSktt', maxCount: 10 },
    { name: 'fileSp3', maxCount: 10 },
    { name: 'fileSktb', maxCount: 10 },
    { name: 'fileBanding', maxCount: 10 }
]);

router.post('/', cpUpload, pelanggaranController.createPelanggaran);
router.get('/:id', pelanggaranController.getPelanggaranById);
router.put('/:id', cpUpload, pelanggaranController.updatePelanggaran);
router.delete('/:id', pelanggaranController.deletePelanggaran);

// Approval System
router.post('/approve/:id', pelanggaranController.approvePelanggaran);
router.post('/reject/:id', pelanggaranController.rejectPelanggaran);
router.post('/reset-section/:id', pelanggaranController.resetPelanggaranSection);

module.exports = router;
