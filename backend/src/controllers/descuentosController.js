const db = require('../../config/db');
 
// GET /api/descuentos
async function listar(req, res) {
  try {
    const soloActivos = req.query.activos === 'true';
    const sql = soloActivos
      ? 'SELECT * FROM descuentos WHERE activo = TRUE ORDER BY nombre'
      : 'SELECT * FROM descuentos ORDER BY activo DESC, nombre';
    const [rows] = await db.query(sql);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error obteniendo descuentos.' });
  }
}
 
// GET /api/descuentos/:id
async function obtener(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM descuentos WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Descuento no encontrado.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
}
 
// POST /api/descuentos
async function crear(req, res) {
  const { nombre, tipo, valor, descripcion } = req.body;
 
  if (!nombre?.trim())             return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
  if (!['porcentaje', 'fijo'].includes(tipo)) return res.status(400).json({ success: false, message: 'Tipo debe ser "porcentaje" o "fijo".' });
  if (Number(valor) <= 0)          return res.status(400).json({ success: false, message: 'El valor debe ser mayor a 0.' });
  if (tipo === 'porcentaje' && Number(valor) > 100) return res.status(400).json({ success: false, message: 'El porcentaje no puede superar 100.' });
 
  try {
    const [result] = await db.query(
      'INSERT INTO descuentos (nombre, tipo, valor, descripcion, activo) VALUES (?, ?, ?, ?, TRUE)',
      [nombre.trim(), tipo, Number(valor), descripcion?.trim() || null]
    );
    res.status(201).json({ success: true, id: result.insertId, message: 'Descuento creado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error creando descuento.' });
  }
}
 
// PUT /api/descuentos/:id
async function actualizar(req, res) {
  const { nombre, tipo, valor, descripcion, activo } = req.body;
 
  if (!nombre?.trim())             return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
  if (!['porcentaje', 'fijo'].includes(tipo)) return res.status(400).json({ success: false, message: 'Tipo debe ser "porcentaje" o "fijo".' });
  if (Number(valor) <= 0)          return res.status(400).json({ success: false, message: 'El valor debe ser mayor a 0.' });
  if (tipo === 'porcentaje' && Number(valor) > 100) return res.status(400).json({ success: false, message: 'El porcentaje no puede superar 100.' });
 
  try {
    const [result] = await db.query(
      'UPDATE descuentos SET nombre = ?, tipo = ?, valor = ?, descripcion = ?, activo = ? WHERE id = ?',
      [nombre.trim(), tipo, Number(valor), descripcion?.trim() || null, activo !== false, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Descuento no encontrado.' });
    res.json({ success: true, message: 'Descuento actualizado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error actualizando descuento.' });
  }
}
 
// DELETE /api/descuentos/:id
async function eliminar(req, res) {
  try {
    // No eliminar si hay ventas que lo referencian
    const [ventas] = await db.query('SELECT COUNT(*) AS total FROM ventas WHERE descuento_id = ?', [req.params.id]);
    if (ventas[0].total > 0) {
      return res.status(409).json({
        success: false,
        message: `No se puede eliminar: el descuento está en ${ventas[0].total} venta(s). Desactívalo en su lugar.`
      });
    }
    const [result] = await db.query('DELETE FROM descuentos WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Descuento no encontrado.' });
    res.json({ success: true, message: 'Descuento eliminado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error eliminando descuento.' });
  }
}
 
// PATCH /api/descuentos/:id/toggle — activar/desactivar
async function toggle(req, res) {
  try {
    const [rows] = await db.query('SELECT activo FROM descuentos WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Descuento no encontrado.' });
    const nuevoEstado = !rows[0].activo;
    await db.query('UPDATE descuentos SET activo = ? WHERE id = ?', [nuevoEstado, req.params.id]);
    res.json({ success: true, activo: nuevoEstado, message: nuevoEstado ? 'Descuento activado.' : 'Descuento desactivado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
}
 
module.exports = { listar, obtener, crear, actualizar, eliminar, toggle };