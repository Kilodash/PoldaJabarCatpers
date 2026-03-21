const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storage.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authMiddleware);

// Endpoint to get pre-signed upload URL (Legacy/Back-compat)
router.post('/upload-url', storageController.getUploadUrl);

// New Endpoint: Direct upload relay
router.post('/upload', upload.single('file'), storageController.uploadFile);

module.exports = router;
