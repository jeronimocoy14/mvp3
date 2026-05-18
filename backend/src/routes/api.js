// routes/api.js — Todas las rutas del sistema
const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');

const prodCtrl     = require('../controllers/productosController');
const entCtrl      = require('../controllers/entidadesController');
const ventasCtrl   = require('../controllers/ventasController');
const comprasCtrl  = require('../controllers/comprasController');

// ── Todas las rutas requieren autenticación ───────────────────
router.use(verifyToken);

// ── Productos ────────────────────────────────────────────────
router.get   ('/productos',             prodCtrl.listar);
router.post  ('/productos',             prodCtrl.crear);
router.put   ('/productos/:id',         prodCtrl.actualizar);
router.patch ('/productos/:id/stock',   prodCtrl.restock);
router.delete('/productos/:id',         requireRole('admin'), prodCtrl.eliminar);

// ── Categorías ───────────────────────────────────────────────
router.get   ('/categorias',            entCtrl.categorias.listar);
router.post  ('/categorias',            entCtrl.categorias.crear);
router.put   ('/categorias/:id',        entCtrl.categorias.actualizar);
router.delete('/categorias/:id',        requireRole('admin'), entCtrl.categorias.eliminar);

// ── Proveedores ──────────────────────────────────────────────
router.get   ('/proveedores',           entCtrl.proveedores.listar);
router.post  ('/proveedores',           entCtrl.proveedores.crear);
router.put   ('/proveedores/:id',       entCtrl.proveedores.actualizar);
router.delete('/proveedores/:id',       requireRole('admin'), entCtrl.proveedores.eliminar);

// ── Clientes ─────────────────────────────────────────────────
router.get   ('/clientes',              entCtrl.clientes.listar);
router.post  ('/clientes',             entCtrl.clientes.crear);
router.put   ('/clientes/:id',          entCtrl.clientes.actualizar);
router.delete('/clientes/:id',          requireRole('admin'), entCtrl.clientes.eliminar);

// ── Ventas ───────────────────────────────────────────────────
router.get   ('/ventas',                ventasCtrl.listar);
router.get   ('/ventas/:id',            ventasCtrl.obtener);
router.post  ('/ventas',                ventasCtrl.crear);

// ── Compras ──────────────────────────────────────────────────
router.get   ('/compras',               comprasCtrl.listar);
router.post  ('/compras',               comprasCtrl.crear);

module.exports = router;
