const express = require('express');
const router = express.Router();
const satkerController = require('../controllers/satker.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rbacMiddleware = require('../middleware/rbac.middleware');

// Hanya ADMIN_POLDA yang boleh membuat, mengedit, dan menghapus Satker
router.post('/', authMiddleware, rbacMiddleware(['ADMIN_POLDA']), satkerController.createSatker);
router.put('/:id', authMiddleware, rbacMiddleware(['ADMIN_POLDA']), satkerController.updateSatker);
router.delete('/:id', authMiddleware, rbacMiddleware(['ADMIN_POLDA']), satkerController.deleteSatker);

// Semua role boleh melihat daftar Satker
router.get('/', authMiddleware, satkerController.getAllSatker);

module.exports = router;
