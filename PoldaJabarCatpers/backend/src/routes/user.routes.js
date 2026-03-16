const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rbacMiddleware = require('../middleware/rbac.middleware');

// Rute publik (semua user yang login bisa akses)
router.put('/change-password', authMiddleware, userController.changeSelfPassword);

// Halaman Manajemen User mutlak hanya ADMIN_POLDA
router.use(authMiddleware, rbacMiddleware(['ADMIN_POLDA']));

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post('/:id/reset-password', userController.adminResetPassword);
router.post('/:id/toggle-status', userController.toggleUserStatus);

module.exports = router;
