// routes/auth.js
const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

// Pública
router.post('/login', ctrl.login);

// Autenticadas
router.get('/me',                  verifyToken,                          ctrl.me);
router.post('/cambiar-password',   verifyToken,                          ctrl.cambiarPassword);

// Solo admin
router.get('/usuarios',            verifyToken, requireRole('admin'),    ctrl.listarUsuarios);
router.post('/usuarios',           verifyToken, requireRole('admin'),    ctrl.crearUsuario);
router.patch('/usuarios/:id',      verifyToken, requireRole('admin'),    ctrl.actualizarUsuario);

module.exports = router;
