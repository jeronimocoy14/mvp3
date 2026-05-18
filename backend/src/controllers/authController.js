// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../../config/db');

// ── POST /api/auth/login ──────────────────────────────────────
async function login(req, res) {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE usuario = ? AND activo = TRUE LIMIT 1',
      [usuario.trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }

    const user   = rows[0];
    const valido = await bcrypt.compare(password, user.password);

    if (!valido) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }

    const payload = {
      id:      user.id,
      nombre:  user.nombre,
      usuario: user.usuario,
      rol:     user.rol
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });

    return res.json({
      success: true,
      token,
      usuario: payload
    });

  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────
// Verifica que el token sigue siendo válido y devuelve los datos del usuario
function me(req, res) {
  return res.json({ success: true, usuario: req.usuario });
}

// ── POST /api/auth/cambiar-password ──────────────────────────
// Cualquier usuario puede cambiar su propia contraseña
async function cambiarPassword(req, res) {
  const { passwordActual, passwordNuevo } = req.body;
  const userId = req.usuario.id;

  if (!passwordActual || !passwordNuevo) {
    return res.status(400).json({ success: false, message: 'Faltan campos.' });
  }
  if (passwordNuevo.length < 6) {
    return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const [rows] = await db.query('SELECT password FROM usuarios WHERE id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    const valido = await bcrypt.compare(passwordActual, rows[0].password);
    if (!valido) return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta.' });

    const hash = await bcrypt.hash(passwordNuevo, 10);
    await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hash, userId]);

    return res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error('Error cambiando contraseña:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
}

// ── GET /api/auth/usuarios — solo admin ──────────────────────
async function listarUsuarios(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, usuario, rol, activo, creado_en FROM usuarios ORDER BY id'
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
}

// ── POST /api/auth/usuarios — solo admin ─────────────────────
async function crearUsuario(req, res) {
  const { nombre, usuario, password, rol } = req.body;
  if (!nombre || !usuario || !password) {
    return res.status(400).json({ success: false, message: 'Nombre, usuario y contraseña son requeridos.' });
  }
  if (!['admin', 'cajero'].includes(rol)) {
    return res.status(400).json({ success: false, message: 'Rol inválido. Usa "admin" o "cajero".' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, usuario, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, usuario, hash, rol]
    );
    return res.status(201).json({ success: true, id: result.insertId, message: 'Usuario creado.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Ese nombre de usuario ya existe.' });
    }
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
}

// ── PATCH /api/auth/usuarios/:id — solo admin ────────────────
async function actualizarUsuario(req, res) {
  const { id } = req.params;
  const { nombre, rol, activo, password } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hash, id]);
    }
    if (nombre !== undefined) await db.query('UPDATE usuarios SET nombre  = ? WHERE id = ?', [nombre, id]);
    if (rol    !== undefined) await db.query('UPDATE usuarios SET rol     = ? WHERE id = ?', [rol,    id]);
    if (activo !== undefined) await db.query('UPDATE usuarios SET activo  = ? WHERE id = ?', [activo, id]);
    return res.json({ success: true, message: 'Usuario actualizado.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
}

module.exports = { login, me, cambiarPassword, listarUsuarios, crearUsuario, actualizarUsuario };
