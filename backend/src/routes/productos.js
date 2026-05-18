const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/productosController');

router.get('/',           verifyToken,                        ctrl.listar);
router.get('/:id',        verifyToken,                        ctrl.obtener);
router.post('/',          verifyToken,                        ctrl.crear);
router.put('/:id',        verifyToken,                        ctrl.actualizar);
router.patch('/:id/stock',verifyToken,                        ctrl.restock);
router.delete('/:id',     verifyToken, requireRole('admin'),  ctrl.eliminar);

module.exports = router;
