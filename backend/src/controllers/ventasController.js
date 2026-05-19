const db = require('../../config/db');
 
// GET /api/ventas
async function listar(req, res) {
  try {
    const [ventas] = await db.query(`
      SELECT v.*,
             c.nombre  AS clienteNombre,
             u.nombre  AS cajeroNombre,
             uc.nombre AS corregidaPorNombre,
             d.nombre  AS descuentoNombre,
             d.tipo    AS descuentoTipo
      FROM ventas v
      LEFT JOIN clientes   c  ON v.cliente_id    = c.id
      LEFT JOIN usuarios   u  ON v.usuario_id    = u.id
      LEFT JOIN usuarios   uc ON v.corregida_por = uc.id
      LEFT JOIN descuentos d  ON v.descuento_id  = d.id
      ORDER BY v.fecha DESC
    `);
    for (const v of ventas) {
      const [items] = await db.query('SELECT * FROM venta_items WHERE venta_id = ?', [v.id]);
      v.items = items;
    }
    res.json({ success: true, data: ventas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error obteniendo ventas.' });
  }
}
 
// GET /api/ventas/:id
async function obtener(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT v.*, c.nombre AS clienteNombre, u.nombre AS cajeroNombre,
             uc.nombre AS corregidaPorNombre,
             d.nombre  AS descuentoNombre, d.tipo AS descuentoTipo
      FROM ventas v
      LEFT JOIN clientes   c  ON v.cliente_id    = c.id
      LEFT JOIN usuarios   u  ON v.usuario_id    = u.id
      LEFT JOIN usuarios   uc ON v.corregida_por = uc.id
      LEFT JOIN descuentos d  ON v.descuento_id  = d.id
      WHERE v.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Venta no encontrada.' });
    const [items] = await db.query('SELECT * FROM venta_items WHERE venta_id = ?', [req.params.id]);
    rows[0].items = items;
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
}
 
// POST /api/ventas — cerrar venta
async function crear(req, res) {
  const { cliente_id, metodo_pago, items, descuento_id, recibido = 0 } = req.body;
  const usuario_id = req.usuario.id;
 
  if (!items?.length) return res.status(400).json({ success: false, message: 'La venta debe tener al menos un producto.' });
  if (!metodo_pago)   return res.status(400).json({ success: false, message: 'Método de pago requerido.' });
 
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
 
    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.precio) * Number(item.cantidad);
    }
 
    let descuento_valor = 0;
    if (descuento_id) {
      const [desc] = await conn.query('SELECT * FROM descuentos WHERE id = ? AND activo = TRUE', [descuento_id]);
      if (desc.length) {
        descuento_valor = desc[0].tipo === 'porcentaje'
          ? subtotal * (desc[0].valor / 100)
          : Number(desc[0].valor);
      }
    }
 
    const total  = Math.max(0, subtotal - descuento_valor);
    const cambio = metodo_pago === 'Efectivo' ? Math.max(0, Number(recibido) - total) : 0;
 
    const [ventaResult] = await conn.query(
      `INSERT INTO ventas (cliente_id, usuario_id, metodo_pago, subtotal, descuento_id, descuento_valor, total, recibido, cambio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cliente_id || null, usuario_id, metodo_pago, subtotal, descuento_id || null, descuento_valor, total, recibido, cambio]
    );
    const ventaId = ventaResult.insertId;
 
    for (const item of items) {
      const subtotalItem = Number(item.precio) * Number(item.cantidad);
      await conn.query(
        `INSERT INTO venta_items (venta_id, producto_id, nombre, precio, cantidad, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ventaId, item.id || item.producto_id || null, item.nombre, item.precio, item.cantidad, subtotalItem]
      );
      if (item.id || item.producto_id) {
        await conn.query(
          'UPDATE productos SET stock = GREATEST(0, stock - ?) WHERE id = ?',
          [item.cantidad, item.id || item.producto_id]
        );
      }
    }
 
    await conn.commit();
    res.status(201).json({ success: true, id: ventaId, total, cambio, message: 'Venta registrada.' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Error registrando venta.' });
  } finally {
    conn.release();
  }
}
 
// PUT /api/ventas/:id/corregir — corrección de venta cerrada (solo admin)
async function corregir(req, res) {
  const { cliente_id, metodo_pago, items, descuento_id, recibido = 0 } = req.body;
  const ventaId    = req.params.id;
  const usuario_id = req.usuario.id;
 
  if (!items?.length) return res.status(400).json({ success: false, message: 'La venta debe tener al menos un producto.' });
  if (!metodo_pago)   return res.status(400).json({ success: false, message: 'Método de pago requerido.' });
 
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
 
    // Verificar que la venta existe
    const [ventaRows] = await conn.query('SELECT * FROM ventas WHERE id = ?', [ventaId]);
    if (!ventaRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Venta no encontrada.' });
    }
    const ventaOriginal = ventaRows[0];
 
    // Restaurar stock de los items originales
    const [itemsOriginales] = await conn.query('SELECT * FROM venta_items WHERE venta_id = ?', [ventaId]);
    for (const item of itemsOriginales) {
      if (item.producto_id) {
        await conn.query(
          'UPDATE productos SET stock = stock + ? WHERE id = ?',
          [item.cantidad, item.producto_id]
        );
      }
    }
 
    // Eliminar items originales
    await conn.query('DELETE FROM venta_items WHERE venta_id = ?', [ventaId]);
 
    // Recalcular con los nuevos items
    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.precio) * Number(item.cantidad);
    }
 
    let descuento_valor = 0;
    if (descuento_id) {
      const [desc] = await conn.query('SELECT * FROM descuentos WHERE id = ?', [descuento_id]);
      if (desc.length) {
        descuento_valor = desc[0].tipo === 'porcentaje'
          ? subtotal * (desc[0].valor / 100)
          : Number(desc[0].valor);
      }
    }
 
    const total  = Math.max(0, subtotal - descuento_valor);
    const cambio = metodo_pago === 'Efectivo' ? Math.max(0, Number(recibido) - total) : 0;
 
    // Actualizar la venta con marca de corrección
    await conn.query(
      `UPDATE ventas SET
         cliente_id      = ?,
         metodo_pago     = ?,
         subtotal        = ?,
         descuento_id    = ?,
         descuento_valor = ?,
         total           = ?,
         recibido        = ?,
         cambio          = ?,
         corregida_por   = ?,
         fecha_correccion = NOW()
       WHERE id = ?`,
      [
        cliente_id || ventaOriginal.cliente_id,
        metodo_pago,
        subtotal,
        descuento_id || null,
        descuento_valor,
        total,
        recibido,
        cambio,
        usuario_id,
        ventaId
      ]
    );
 
    // Insertar nuevos items y descontar stock
    for (const item of items) {
      const subtotalItem = Number(item.precio) * Number(item.cantidad);
      await conn.query(
        `INSERT INTO venta_items (venta_id, producto_id, nombre, precio, cantidad, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ventaId, item.producto_id || item.id || null, item.nombre, item.precio, item.cantidad, subtotalItem]
      );
      if (item.producto_id || item.id) {
        await conn.query(
          'UPDATE productos SET stock = GREATEST(0, stock - ?) WHERE id = ?',
          [item.cantidad, item.producto_id || item.id]
        );
      }
    }
 
    await conn.commit();
    res.json({ success: true, message: 'Venta corregida correctamente.', total, cambio });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al corregir la venta.' });
  } finally {
    conn.release();
  }
}
 
module.exports = { listar, obtener, crear, corregir };