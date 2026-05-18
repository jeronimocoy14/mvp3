// controllers/comprasController.js
const db = require('../../config/db');

async function listar(req, res) {
  try {
    const [compras] = await db.query(`
      SELECT c.*, p.nombre AS proveedorNombre, u.nombre AS usuarioNombre
      FROM compras c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      LEFT JOIN usuarios    u ON c.usuario_id   = u.id
      ORDER BY c.fecha DESC
    `);
    for (const c of compras) {
      const [items] = await db.query('SELECT * FROM compra_items WHERE compra_id = ?', [c.id]);
      c.items = items;
    }
    res.json({ success: true, data: compras });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error obteniendo compras.' });
  }
}

async function crear(req, res) {
  const { proveedor_id, nota, items } = req.body;
  const usuario_id = req.usuario.id;

  if (!items?.length) {
    return res.status(400).json({ success: false, message: 'La compra debe tener al menos un producto.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const total = items.reduce((s, i) => s + Number(i.costo) * Number(i.cantidad), 0);

    const [result] = await conn.query(
      'INSERT INTO compras (proveedor_id, usuario_id, total, nota) VALUES (?, ?, ?, ?)',
      [proveedor_id || null, usuario_id, total, nota || '']
    );
    const compraId = result.insertId;

    for (const item of items) {
      const subtotal    = Number(item.costo) * Number(item.cantidad);
      const producto_id = item.producto_id || null;

      await conn.query(
        `INSERT INTO compra_items (compra_id, producto_id, nombre, cantidad, costo, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [compraId, producto_id, item.nombre, item.cantidad, item.costo, subtotal]
      );

      // Solo actualizar stock si el producto existe en la BD
      if (producto_id) {
        await conn.query(
          'UPDATE productos SET stock = stock + ?, costo = ? WHERE id = ?',
          [item.cantidad, item.costo, producto_id]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ success: true, id: compraId, message: 'Compra registrada y stock actualizado.' });
  } catch (err) {
    await conn.rollback();
    console.error('Error en compra:', err);
    res.status(500).json({ success: false, message: 'Error registrando compra: ' + err.message });
  } finally {
    conn.release();
  }
}

module.exports = { listar, crear };
