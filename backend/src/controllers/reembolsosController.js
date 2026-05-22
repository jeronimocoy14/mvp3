const db = require('../../config/db');
 
// GET /api/reembolsos — listar todos los reembolsos
async function listar(req, res) {
  try {
    const [reembolsos] = await db.query(`
      SELECT r.*,
             v.total        AS ventaTotal,
             v.fecha        AS ventaFecha,
             u.nombre       AS usuarioNombre
      FROM reembolsos r
      LEFT JOIN ventas    v ON r.venta_id   = v.id
      LEFT JOIN usuarios  u ON r.usuario_id = u.id
      ORDER BY r.fecha DESC
    `);
    for (const r of reembolsos) {
      const [items] = await db.query(
        'SELECT * FROM reembolso_items WHERE reembolso_id = ?', [r.id]
      );
      r.items = items;
    }
    res.json({ success: true, data: reembolsos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error obteniendo reembolsos.' });
  }
}
 
// GET /api/reembolsos/venta/:ventaId — reembolsos de una venta específica
async function porVenta(req, res) {
  try {
    const [reembolsos] = await db.query(
      `SELECT r.*, u.nombre AS usuarioNombre
       FROM reembolsos r
       LEFT JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.venta_id = ?
       ORDER BY r.fecha DESC`,
      [req.params.ventaId]
    );
    for (const r of reembolsos) {
      const [items] = await db.query(
        'SELECT * FROM reembolso_items WHERE reembolso_id = ?', [r.id]
      );
      r.items = items;
    }
    res.json({ success: true, data: reembolsos });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
}
 
// POST /api/reembolsos — crear reembolso (parcial o total)
// Body esperado:
// {
//   venta_id: number,
//   tipo: 'total' | 'parcial',
//   motivo: string,
//   items: [
//     { producto_id, nombre, cantidad, precio, retorna_stock: true|false }
//   ]
// }
async function crear(req, res) {
  const { venta_id, tipo, motivo, items } = req.body;
  const usuario_id = req.usuario.id;
 
  // Validaciones básicas
  if (!venta_id) return res.status(400).json({ success: false, message: 'venta_id es requerido.' });
  if (!['total', 'parcial'].includes(tipo))
    return res.status(400).json({ success: false, message: 'tipo debe ser "total" o "parcial".' });
  if (!items?.length)
    return res.status(400).json({ success: false, message: 'Debes seleccionar al menos un producto para reembolsar.' });
 
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
 
    // Verificar que la venta existe y está en estado reembolsable
    const [ventaRows] = await conn.query('SELECT * FROM ventas WHERE id = ?', [venta_id]);
    if (!ventaRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Venta no encontrada.' });
    }
    const venta = ventaRows[0];
 
    if (venta.estado === 'reembolsada') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Esta venta ya fue reembolsada completamente.' });
    }
 
    // Obtener items originales de la venta para validar cantidades
    const [itemsOriginales] = await conn.query(
      'SELECT * FROM venta_items WHERE venta_id = ?', [venta_id]
    );
 
    // Validar que los items a reembolsar existen en la venta y las cantidades son válidas
    for (const itemR of items) {
      const original = itemsOriginales.find(
        o => o.producto_id === itemR.producto_id || o.nombre === itemR.nombre
      );
      if (!original) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `El producto "${itemR.nombre}" no pertenece a esta venta.`
        });
      }
      if (Number(itemR.cantidad) <= 0 || Number(itemR.cantidad) > Number(original.cantidad)) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Cantidad inválida para "${itemR.nombre}". Máximo: ${original.cantidad}.`
        });
      }
    }
 
    // Calcular monto del reembolso
    // Si es total: devolver exactamente el total de la venta (ya incluye descuento aplicado)
    // Si es parcial: sumar precio × cantidad de los ítems seleccionados
    const montoItems = items.reduce(
      (sum, i) => sum + Number(i.precio) * Number(i.cantidad), 0
    );
 
    let monto;
    if (tipo === 'total') {
      // En reembolso total siempre se devuelve lo que el cliente pagó (total con descuento)
      monto = Number(venta.total);
    } else {
      // En reembolso parcial se devuelve el valor proporcional de los ítems
      // Si la venta tenía descuento, aplicar la misma proporción al parcial
      const subtotalOriginal = Number(venta.subtotal) || montoItems;
      const factorDescuento  = subtotalOriginal > 0 ? Number(venta.total) / subtotalOriginal : 1;
      monto = Math.round(montoItems * factorDescuento);
    }
 
    // Validar que el parcial no supere el total pagado
    if (monto > Number(venta.total)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `El monto del reembolso (${monto}) supera el total de la venta (${venta.total}).`
      });
    }
 
    // Insertar registro de reembolso
    const [reembolsoResult] = await conn.query(
      'INSERT INTO reembolsos (venta_id, usuario_id, tipo, monto, motivo) VALUES (?, ?, ?, ?, ?)',
      [venta_id, usuario_id, tipo, monto, motivo || null]
    );
    const reembolsoId = reembolsoResult.insertId;
 
    // Insertar items del reembolso y actualizar stock si corresponde
    for (const item of items) {
      const retornaStock = item.retorna_stock !== false; // default true
 
      await conn.query(
        `INSERT INTO reembolso_items
           (reembolso_id, producto_id, nombre, cantidad, precio, retorna_stock)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [reembolsoId, item.producto_id || null, item.nombre, item.cantidad, item.precio, retornaStock]
      );
 
      // Devolver stock al inventario si el producto existe y retorna_stock = true
      if (retornaStock && item.producto_id) {
        await conn.query(
          'UPDATE productos SET stock = stock + ? WHERE id = ?',
          [item.cantidad, item.producto_id]
        );
      }
    }
 
    // Actualizar estado de la venta
    // Si es reembolso total → 'reembolsada'; si es parcial → dejarla como está (cerrada/corregida)
    if (tipo === 'total') {
      await conn.query(
        "UPDATE ventas SET estado = 'reembolsada' WHERE id = ?",
        [venta_id]
      );
    }
 
    await conn.commit();
    res.status(201).json({
      success: true,
      id: reembolsoId,
      monto,
      message: tipo === 'total'
        ? 'Reembolso total registrado. Venta marcada como reembolsada.'
        : 'Reembolso parcial registrado.'
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Error registrando reembolso.' });
  } finally {
    conn.release();
  }
}
 
module.exports = { listar, porVenta, crear };