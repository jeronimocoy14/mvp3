require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
 
const app = express();
 
// ── CORS: permite el frontend desde cualquier origen local ────
const origenesPermitidos = [
  process.env.FRONTEND_URL,
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);
 
app.use(cors({
  origin: function(origin, callback) {
    // Permitir peticiones sin origin (archivos locales, curl, Postman)
    if (!origin) return callback(null, true);
    if (origenesPermitidos.includes(origin)) return callback(null, true);
    // En desarrollo, permitir cualquier localhost / 127.0.0.1
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS no permitido para: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 
// ── Rutas ────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/descuentos',  require('./routes/descuentos'));
app.use('/api/productos',   require('./routes/productos'));
app.use('/api/ventas',      require('./routes/ventas'));
app.use('/api/compras',     require('./routes/compras'));
app.use('/api/reembolsos',  require('./routes/reembolsos'));
app.use('/api/faltantes',  require('./routes/faltantes'));
app.use('/api/reportes',   require('./routes/reportes'));
app.use('/api',             require('./routes/entidades'));   // /api/categorias, /api/proveedores, /api/clientes
 
// Ruta dummy para /api/carrito (el frontend la llama pero no es crítica)
app.post('/api/carrito', (req, res) => res.json({ success: true }));
 
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
 
app.use((req, res) => res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.path}` }));
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});
 
async function seedUsuarios() {
  const db = require('../config/db');
  const usuarios = [
    { nombre: 'Administrador',    usuario: 'admin',  password: 'admin123',  rol: 'admin'  },
    { nombre: 'Cajero Principal', usuario: 'cajero', password: 'cajero123', rol: 'cajero' }
  ];
  for (const u of usuarios) {
    const [rows] = await db.query('SELECT id FROM usuarios WHERE usuario = ?', [u.usuario]);
    if (!rows.length) {
      const hash = await bcrypt.hash(u.password, 10);
      await db.query(
        'INSERT INTO usuarios (nombre, usuario, password, rol) VALUES (?, ?, ?, ?)',
        [u.nombre, u.usuario, hash, u.rol]
      );
      console.log(`👤 Usuario creado: ${u.usuario} (${u.rol})`);
    }
  }
}
 
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Endpoints disponibles:
  POST   /api/auth/login
  GET    /api/productos
  POST   /api/productos
  PUT    /api/productos/:id
  PATCH  /api/productos/:id/stock
  DELETE /api/productos/:id
  GET    /api/ventas
  POST   /api/ventas
  PUT    /api/ventas/:id/corregir
  GET    /api/compras
  POST   /api/compras
  GET    /api/reembolsos
  GET    /api/reembolsos/venta/:ventaId
  POST   /api/reembolsos
  GET/POST/PUT/DELETE /api/categorias
  GET/POST/PUT/DELETE /api/proveedores
  GET/POST/PUT/DELETE /api/clientes`);
  try { await seedUsuarios(); } catch (err) {
    console.warn('⚠️  No se pudieron crear usuarios:', err.message);
  }
});