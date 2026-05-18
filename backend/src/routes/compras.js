const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/comprasController');

router.get('/',  verifyToken, ctrl.listar);
router.post('/', verifyToken, ctrl.crear);

module.exports = router;
