const express = require('express');
const router = express.Router();
const pelanggaranController = require('../controllers/pelanggaran.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authMiddleware);

// Endpoint untuk upload file multipel (file dasar & file surat selesai)
const cpUpload = upload.fields([
    { name: 'fileDasar', maxCount: 1 },
    { name: 'fileSelesai', maxCount: 1 },
    { name: 'filePutusan', maxCount: 1 },
    { name: 'fileRekomendasi', maxCount: 1 }
]);

router.post('/', cpUpload, pelanggaranController.createPelanggaran);
router.get('/:id', pelanggaranController.getPelanggaranById);
router.put('/:id', cpUpload, pelanggaranController.updatePelanggaran);
router.delete('/:id', pelanggaranController.deletePelanggaran);

// Approval System
router.post('/approve/:id', pelanggaranController.approvePelanggaran);
router.post('/reject/:id', pelanggaranController.rejectPelanggaran);

module.exports = router;
