const router  = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { categorias, proveedores, clientes } = require('../controllers/entidadesController');

// Categorías
router.get('/categorias',       verifyToken, categorias.listar);
router.post('/categorias',      verifyToken, categorias.crear);
router.put('/categorias/:id',   verifyToken, categorias.actualizar);
router.delete('/categorias/:id',verifyToken, requireRole('admin'), categorias.eliminar);

// Proveedores
router.get('/proveedores',       verifyToken, proveedores.listar);
router.post('/proveedores',      verifyToken, proveedores.crear);
router.put('/proveedores/:id',   verifyToken, proveedores.actualizar);
router.delete('/proveedores/:id',verifyToken, requireRole('admin'), proveedores.eliminar);

// Clientes
router.get('/clientes',       verifyToken, clientes.listar);
router.post('/clientes',      verifyToken, clientes.crear);
router.put('/clientes/:id',   verifyToken, clientes.actualizar);
router.delete('/clientes/:id',verifyToken, clientes.eliminar);

module.exports = router;
