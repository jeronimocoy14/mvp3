const db = require('../../config/db');
 
// GET /api/reportes/ventas?desde=2026-01-01&hasta=2026-12-31
async function ventasPorFecha(req, res) {
  const { desde, hasta } = req.query;
  if (!desde || !hasta)
    return res.status(400).json({ success: false, message: 'Parámetros "desde" y "hasta" son requeridos.' });
 
  try {
    const [resumen] = await db.query(`
      SELECT
        COUNT(*)                        AS total_ventas,
        COALESCE(SUM(total), 0)         AS ingresos_totales,
        COALESCE(AVG(total), 0)         AS ticket_promedio,
        COALESCE(SUM(descuento_valor), 0) AS descuentos_aplicados
      FROM ventas
      WHERE DATE(fecha) BETWEEN ? AND ?
        AND estado != 'reembolsada'
    `, [desde, hasta]);
 
    const [porDia] = await db.query(`
      SELECT
        DATE(fecha)          AS dia,
        COUNT(*)             AS ventas,
        COALESCE(SUM(total), 0) AS total
      FROM ventas
      WHERE DATE(fecha) BETWEEN ? AND ?
        AND estado != 'reembolsada'
      GROUP BY DATE(fecha)
      ORDER BY dia ASC
    `, [desde, hasta]);
 
    const [porMetodo] = await db.query(`
      SELECT
        metodo_pago,
        COUNT(*)             AS cantidad,
        COALESCE(SUM(total), 0) AS total
      FROM ventas
      WHERE DATE(fecha) BETWEEN ? AND ?
        AND estado != 'reembolsada'
      GROUP BY metodo_pago
    `, [desde, hasta]);
 
    res.json({ success: true, data: { resumen: resumen[0], porDia, porMetodo } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error generando reporte de ventas.' });
  }
}
 
// GET /api/reportes/productos?desde=2026-01-01&hasta=2026-12-31&limite=10
async function productosMasVendidos(req, res) {
  const { desde, hasta, limite = 10 } = req.query;
  if (!desde || !hasta)
    return res.status(400).json({ success: false, message: 'Parámetros "desde" y "hasta" son requeridos.' });
 
  try {
    const [rows] = await db.query(`
      SELECT
        vi.nombre,
        vi.producto_id,
        SUM(vi.cantidad)               AS unidades_vendidas,
        SUM(vi.subtotal)               AS ingresos_generados,
        COUNT(DISTINCT vi.venta_id)    AS aparece_en_ventas
      FROM venta_items vi
      INNER JOIN ventas v ON vi.venta_id = v.id
      WHERE DATE(v.fecha) BETWEEN ? AND ?
        AND v.estado != 'reembolsada'
      GROUP BY vi.producto_id, vi.nombre
      ORDER BY unidades_vendidas DESC
      LIMIT ?
    `, [desde, hasta, Number(limite)]);
 
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error generando reporte de productos.' });
  }
}
 
// GET /api/reportes/compras?desde=2026-01-01&hasta=2026-12-31
async function comprasPorFecha(req, res) {
  const { desde, hasta } = req.query;
  if (!desde || !hasta)
    return res.status(400).json({ success: false, message: 'Parámetros "desde" y "hasta" son requeridos.' });
 
  try {
    const [resumen] = await db.query(`
      SELECT
        COUNT(*)                     AS total_compras,
        COALESCE(SUM(total), 0)      AS gasto_total,
        COALESCE(AVG(total), 0)      AS promedio_por_compra
      FROM compras
      WHERE DATE(fecha) BETWEEN ? AND ?
    `, [desde, hasta]);
 
    const [porProveedor] = await db.query(`
      SELECT
        COALESCE(p.nombre, 'Sin proveedor') AS proveedor,
        COUNT(c.id)                          AS compras,
        COALESCE(SUM(c.total), 0)            AS total
      FROM compras c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      WHERE DATE(c.fecha) BETWEEN ? AND ?
      GROUP BY c.proveedor_id, p.nombre
      ORDER BY total DESC
    `, [desde, hasta]);
 
    const [detalle] = await db.query(`
      SELECT
        c.id, c.fecha, c.total, c.nota,
        p.nombre AS proveedor,
        u.nombre AS usuario
      FROM compras c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      LEFT JOIN usuarios    u ON c.usuario_id   = u.id
      WHERE DATE(c.fecha) BETWEEN ? AND ?
      ORDER BY c.fecha DESC
    `, [desde, hasta]);
 
    res.json({ success: true, data: { resumen: resumen[0], porProveedor, detalle } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error generando reporte de compras.' });
  }
}
 
// GET /api/reportes/faltantes
async function faltantesFrecuentes(req, res) {
  try {
    const [frecuentes] = await db.query(`
      SELECT
        nombre,
        tipo,
        COUNT(*)        AS veces_registrado,
        SUM(cantidad_est) AS cantidad_total_solicitada,
        MAX(creado_en)  AS ultimo_registro
      FROM faltantes
      GROUP BY nombre, tipo
      ORDER BY veces_registrado DESC, cantidad_total_solicitada DESC
      LIMIT 20
    `);
 
    const [pendientes] = await db.query(`
      SELECT f.*, p.nombre AS proveedorNombre
      FROM faltantes f
      LEFT JOIN proveedores p ON f.proveedor_id = p.id
      WHERE f.resuelto = FALSE
      ORDER BY f.creado_en DESC
    `);
 
    const [stats] = await db.query(`
      SELECT
        COUNT(*)                              AS total_registrados,
        SUM(CASE WHEN resuelto = FALSE THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN resuelto = TRUE  THEN 1 ELSE 0 END) AS resueltos
      FROM faltantes
    `);
 
    res.json({ success: true, data: { stats: stats[0], frecuentes, pendientes } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error generando reporte de faltantes.' });
  }
}
 
module.exports = { ventasPorFecha, productosMasVendidos, comprasPorFecha, faltantesFrecuentes };