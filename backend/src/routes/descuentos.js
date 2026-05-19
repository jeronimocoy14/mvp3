const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/descuentosController');
 
// Cualquier usuario autenticado puede consultar descuentos activos (para aplicar al vender)
router.get('/',        verifyToken, ctrl.listar);
router.get('/:id',     verifyToken, ctrl.obtener);
 
// Solo admin puede crear, editar o eliminar descuentos
router.post('/',               verifyToken, requireRole('admin'), ctrl.crear);
router.put('/:id',             verifyToken, requireRole('admin'), ctrl.actualizar);
router.delete('/:id',          verifyToken, requireRole('admin'), ctrl.eliminar);
router.patch('/:id/toggle',    verifyToken, requireRole('admin'), ctrl.toggle);
 
module.exports = router;