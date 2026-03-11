const express = require('express');
const router = express.Router();
const personelController = require('../controllers/personel.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware); // Semua rute personel butuh login

router.post('/', personelController.createPersonel);
router.get('/check/:nrpNip', personelController.checkNrpNipAvailability);
router.get('/', personelController.getAllPersonel);
router.get('/:id', personelController.getPersonelById);
router.put('/:id', personelController.updatePersonel);
router.delete('/:id', personelController.deletePersonel);

// Approval System
router.post('/approve/:id', personelController.approvePersonel);
router.post('/reject/:id', personelController.rejectPersonel);

module.exports = router;
