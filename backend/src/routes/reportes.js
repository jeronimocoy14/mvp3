const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/reportesController');
 
router.get('/ventas',    verifyToken, ctrl.ventasPorFecha);
router.get('/productos', verifyToken, ctrl.productosMasVendidos);
router.get('/compras',   verifyToken, ctrl.comprasPorFecha);
router.get('/faltantes', verifyToken, ctrl.faltantesFrecuentes);
 
module.exports = router;