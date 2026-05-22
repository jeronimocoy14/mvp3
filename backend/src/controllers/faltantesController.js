const db = require('../../config/db');
 
// GET /api/faltantes?resuelto=false&proveedor_id=1&tipo=papeleria
async function listar(req, res) {
  try {
    const { resuelto, proveedor_id, tipo } = req.query;
    let sql = `
      SELECT f.*, p.nombre AS proveedorNombre
      FROM faltantes f
      LEFT JOIN proveedores p ON f.proveedor_id = p.id
      WHERE 1=1
    `;
    const params = [];
 
    if (resuelto !== undefined) {
      sql += ' AND f.resuelto = ?';
      params.push(resuelto === 'true' ? 1 : 0);
    }
    if (proveedor_id) {
      sql += ' AND f.proveedor_id = ?';
      params.push(proveedor_id);
    }
    if (tipo) {
      sql += ' AND f.tipo = ?';
      params.push(tipo);
    }
 
    sql += ' ORDER BY f.creado_en DESC';
 
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error obteniendo faltantes.' });
  }
}
 
// POST /api/faltantes
async function crear(req, res) {
  const { nombre, descripcion, proveedor_id, tipo, cantidad_est } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ success: false, message: 'El nombre del producto es obligatorio.' });
 
  try {
    const [result] = await db.query(
      `INSERT INTO faltantes (nombre, descripcion, proveedor_id, tipo, cantidad_est)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre.trim(), descripcion || null, proveedor_id || null, tipo || null, cantidad_est || 1]
    );
    res.status(201).json({ success: true, id: result.insertId, message: 'Faltante registrado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error registrando faltante.' });
  }
}
 
// PUT /api/faltantes/:id
async function actualizar(req, res) {
  const { nombre, descripcion, proveedor_id, tipo, cantidad_est } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
 
  try {
    const [result] = await db.query(
      `UPDATE faltantes SET nombre=?, descripcion=?, proveedor_id=?, tipo=?, cantidad_est=?
       WHERE id = ? AND resuelto = FALSE`,
      [nombre.trim(), descripcion || null, proveedor_id || null, tipo || null, cantidad_est || 1, req.params.id]
    );
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: 'Faltante no encontrado o ya está resuelto.' });
    res.json({ success: true, message: 'Faltante actualizado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error actualizando faltante.' });
  }
}
 
// PATCH /api/faltantes/:id/resolver
async function resolver(req, res) {
  try {
    const [result] = await db.query(
      `UPDATE faltantes SET resuelto = TRUE, resuelto_en = NOW()
       WHERE id = ? AND resuelto = FALSE`,
      [req.params.id]
    );
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: 'Faltante no encontrado o ya estaba resuelto.' });
    res.json({ success: true, message: 'Faltante marcado como resuelto.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error resolviendo faltante.' });
  }
}
 
// DELETE /api/faltantes/:id
async function eliminar(req, res) {
  try {
    const [result] = await db.query('DELETE FROM faltantes WHERE id = ?', [req.params.id]);
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: 'Faltante no encontrado.' });
    res.json({ success: true, message: 'Faltante eliminado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error eliminando faltante.' });
  }
}
 
module.exports = { listar, crear, actualizar, resolver, eliminar };