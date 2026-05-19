const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/ventasController');
 
router.get('/',              verifyToken,                       ctrl.listar);
router.get('/:id',           verifyToken,                       ctrl.obtener);
router.post('/',             verifyToken,                       ctrl.crear);
router.put('/:id/corregir',  verifyToken, requireRole('admin'), ctrl.corregir); // solo admin puede corregir
 
module.exports = router;