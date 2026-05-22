const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/reembolsosController');
 
// Cualquier usuario autenticado puede ver reembolsos
router.get('/',                  verifyToken, ctrl.listar);
router.get('/venta/:ventaId',    verifyToken, ctrl.porVenta);
 
// Cualquier usuario autenticado puede crear un reembolso (cajero también puede)
// Si quieres restringirlo solo a admin, agrega: requireRole('admin')
router.post('/',                 verifyToken, ctrl.crear);
 
module.exports = router;