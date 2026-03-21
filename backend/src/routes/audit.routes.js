const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rbacMiddleware = require('../middleware/rbac.middleware');

// Hanya ADMIN_POLDA yang diizinkan mengakses menu pengaturan Audit
router.get('/', authMiddleware, rbacMiddleware(['ADMIN_POLDA']), auditController.getAllAuditLogs);

module.exports = router;
