const express = require('express');
const router = express.Router();
const pengaturanController = require('../controllers/pengaturan.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rbacMiddleware = require('../middleware/rbac.middleware');

// Semua user login bisa GET untuk validasi Form UI
router.get('/', authMiddleware, pengaturanController.getAllPengaturan);
router.get('/:key', authMiddleware, pengaturanController.getPengaturanByKey);

// Hanya ADMIN_POLDA yang bisa menyimpan perubahannya
router.put('/:key', authMiddleware, rbacMiddleware(['ADMIN_POLDA']), pengaturanController.updatePengaturan);

module.exports = router;
