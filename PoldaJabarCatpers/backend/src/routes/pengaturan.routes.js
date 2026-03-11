const express = require('express');
const router = express.Router();
const pengaturanController = require('../controllers/pengaturan.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rbacMiddleware = require('../middleware/rbac.middleware');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Semua user login bisa GET untuk validasi Form UI
router.get('/', authMiddleware, pengaturanController.getAllPengaturan);

// Fitur Ekspor, Template, Impor (Hanya Admin Polda)
router.get('/export', authMiddleware, rbacMiddleware(['ADMIN_POLDA']), pengaturanController.exportData);
router.get('/template', authMiddleware, rbacMiddleware(['ADMIN_POLDA']), pengaturanController.downloadTemplate);
router.post('/import', authMiddleware, rbacMiddleware(['ADMIN_POLDA']), upload.single('file'), pengaturanController.importData);

router.get('/scan-pensiun', authMiddleware, rbacMiddleware(['ADMIN_POLDA']), pengaturanController.scanPensiun);
router.post('/bulk-pensiun', authMiddleware, rbacMiddleware(['ADMIN_POLDA']), pengaturanController.bulkUpdatePensiun);

router.get('/:key', authMiddleware, pengaturanController.getPengaturanByKey);

// Hanya ADMIN_POLDA yang bisa menyimpan perubahannya
router.put('/:key', authMiddleware, rbacMiddleware(['ADMIN_POLDA']), pengaturanController.updatePengaturan);

module.exports = router;
