const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/ventasController');

router.get('/',    verifyToken, ctrl.listar);
router.get('/:id', verifyToken, ctrl.obtener);
router.post('/',   verifyToken, ctrl.crear);

module.exports = router;
