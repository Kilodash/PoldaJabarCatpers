const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/stats', authMiddleware, dashboardController.getDashboardStats);
router.get('/satker-stats', authMiddleware, dashboardController.getSatkerStats);

module.exports = router;
