const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storage.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Endpoint to get pre-signed upload URL
router.post('/upload-url', storageController.getUploadUrl);

module.exports = router;
