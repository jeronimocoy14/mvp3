const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/faltantesController');
 
router.get('/',            verifyToken,                       ctrl.listar);
router.post('/',           verifyToken,                       ctrl.crear);
router.put('/:id',         verifyToken,                       ctrl.actualizar);
router.patch('/:id/resolver', verifyToken,                   ctrl.resolver);
router.delete('/:id',      verifyToken, requireRole('admin'), ctrl.eliminar);
 
module.exports = router;