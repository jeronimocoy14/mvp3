// controllers/productosController.js
const db = require('../../config/db');

async function listar(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.nombre, p.precio, p.costo, p.stock, p.imagen,
             c.nombre AS categoria, pr.nombre AS proveedor,
             p.categoria_id, p.proveedor_id
      FROM productos p
      LEFT JOIN categorias  c  ON p.categoria_id = c.id
      LEFT JOIN proveedores pr ON p.proveedor_id  = pr.id
      ORDER BY p.nombre
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error obteniendo productos.' });
  }
}

async function obtener(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT p.*, c.nombre AS categoria, pr.nombre AS proveedor
      FROM productos p
      LEFT JOIN categorias  c  ON p.categoria_id = c.id
      LEFT JOIN proveedores pr ON p.proveedor_id  = pr.id
      WHERE p.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
}

async function crear(req, res) {
  const { nombre, precio, costo = 0, stock = 0, categoria, proveedor, imagen = '' } = req.body;
  if (!nombre || precio == null) {
    return res.status(400).json({ success: false, message: 'Nombre y precio son requeridos.' });
  }
  try {
    const categoria_id = await resolverOCrearCategoria(categoria);
    const proveedor_id = await resolverProveedor(proveedor);
    const [result] = await db.query(
      `INSERT INTO productos (nombre, precio, costo, stock, categoria_id, proveedor_id, imagen)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, precio, costo, stock, categoria_id, proveedor_id, imagen]
    );
    res.status(201).json({ success: true, id: result.insertId, message: 'Producto creado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error creando producto.' });
  }
}

async function actualizar(req, res) {
  const { nombre, precio, costo, stock, categoria, proveedor, imagen } = req.body;
  const { id } = req.params;
  try {
    const [exist] = await db.query('SELECT id FROM productos WHERE id = ?', [id]);
    if (!exist.length) return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    const categoria_id = await resolverOCrearCategoria(categoria);
    const proveedor_id = await resolverProveedor(proveedor);
    await db.query(
      `UPDATE productos SET nombre=?, precio=?, costo=?, stock=?, categoria_id=?, proveedor_id=?, imagen=? WHERE id=?`,
      [nombre, precio, costo ?? 0, stock ?? 0, categoria_id, proveedor_id, imagen ?? '', id]
    );
    res.json({ success: true, message: 'Producto actualizado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error actualizando producto.' });
  }
}

async function eliminar(req, res) {
  try {
    const [result] = await db.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    res.json({ success: true, message: 'Producto eliminado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error eliminando producto.' });
  }
}

async function restock(req, res) {
  const { cantidad } = req.body;
  if (!cantidad || cantidad <= 0) return res.status(400).json({ success: false, message: 'Cantidad inválida.' });
  try {
    await db.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [cantidad, req.params.id]);
    res.json({ success: true, message: `Stock actualizado (+${cantidad}).` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
}

async function resolverOCrearCategoria(nombre) {
  if (!nombre) return null;
  const [rows] = await db.query('SELECT id FROM categorias WHERE nombre = ?', [nombre]);
  if (rows.length) return rows[0].id;
  const [result] = await db.query('INSERT INTO categorias (nombre) VALUES (?)', [nombre]);
  return result.insertId;
}

async function resolverProveedor(nombre) {
  if (!nombre) return null;
  const [rows] = await db.query('SELECT id FROM proveedores WHERE nombre = ?', [nombre]);
  return rows.length ? rows[0].id : null;
}

module.exports = { listar, obtener, crear, actualizar, eliminar, restock };
