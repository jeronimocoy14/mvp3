// controllers/entidadesController.js — Categorías, Proveedores, Clientes
const db = require('../../config/db');

// ── Factory: genera CRUD genérico para una tabla ─────────────
function crudFactory(tabla, campos) {
  return {
    async listar(req, res) {
      try {
        const [rows] = await db.query(`SELECT * FROM ${tabla} ORDER BY nombre`);
        res.json({ success: true, data: rows });
      } catch (err) {
        res.status(500).json({ success: false, message: `Error obteniendo ${tabla}.` });
      }
    },

    async crear(req, res) {
      const valores = campos.map(c => req.body[c] ?? null);
      const placeholders = campos.map(() => '?').join(', ');
      try {
        const [result] = await db.query(
          `INSERT INTO ${tabla} (${campos.join(', ')}) VALUES (${placeholders})`,
          valores
        );
        res.status(201).json({ success: true, id: result.insertId, message: 'Creado correctamente.' });
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(409).json({ success: false, message: 'Ya existe un registro con ese nombre.' });
        res.status(500).json({ success: false, message: 'Error creando registro.' });
      }
    },

    async actualizar(req, res) {
      const sets   = campos.map(c => `${c} = ?`).join(', ');
      const valores = [...campos.map(c => req.body[c] ?? null), req.params.id];
      try {
        const [result] = await db.query(`UPDATE ${tabla} SET ${sets} WHERE id = ?`, valores);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'No encontrado.' });
        res.json({ success: true, message: 'Actualizado correctamente.' });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Error actualizando.' });
      }
    },

    async eliminar(req, res) {
      try {
        const [result] = await db.query(`DELETE FROM ${tabla} WHERE id = ?`, [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'No encontrado.' });
        res.json({ success: true, message: 'Eliminado correctamente.' });
      } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2')
          return res.status(409).json({ success: false, message: 'No se puede eliminar: tiene registros asociados.' });
        res.status(500).json({ success: false, message: 'Error eliminando.' });
      }
    }
  };
}

const categorias = crudFactory('categorias', ['nombre', 'descripcion']);
const proveedores = crudFactory('proveedores', ['nombre', 'contacto', 'telefono']);
const clientes    = crudFactory('clientes',    ['nombre', 'documento', 'correo', 'telefono']);

module.exports = { categorias, proveedores, clientes };
