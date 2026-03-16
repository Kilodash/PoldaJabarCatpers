const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.get('/diag-db', authController.diagDb);

module.exports = router;
