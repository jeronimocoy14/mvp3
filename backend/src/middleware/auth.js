// middleware/auth.js — Verificación de JWT y control de roles
const jwt = require('jsonwebtoken');

/**
 * verifyToken
 * Extrae el JWT del header Authorization: Bearer <token>
 * Si es válido, agrega req.usuario con { id, nombre, rol }
 */
function verifyToken(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token requerido. Inicia sesión.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario   = payload;   // { id, nombre, usuario, rol }
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'La sesión expiró. Inicia sesión nuevamente.'
      : 'Token inválido.';
    return res.status(401).json({ success: false, message: msg });
  }
}

/**
 * requireRole(...roles)
 * Uso: router.delete('/ruta', verifyToken, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ success: false, message: 'No autenticado.' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}.`
      });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
