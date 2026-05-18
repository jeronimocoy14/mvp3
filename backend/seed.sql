-- ============================================================
-- seed.sql — Datos iniciales (usuarios por defecto)
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

USE papel_luna;

-- Contraseñas hasheadas con bcrypt (rounds=10):
-- admin123  → $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- cajero123 → $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- (Estos hashes son de ejemplo; el servidor los regenera en arranque si no existen)

INSERT IGNORE INTO usuarios (nombre, usuario, password, rol) VALUES
  ('Administrador',  'admin',  '$2b$10$Yp1xH0bqv8Nq.K9P2R3KiOZhDQ3lDYr2E4z6MtW8vX1nS5cJyLaW6', 'admin'),
  ('Cajero Principal','cajero', '$2b$10$Yp1xH0bqv8Nq.K9P2R3KiOZhDQ3lDYr2E4z6MtW8vX1nS5cJyLaW6', 'cajero');

-- IMPORTANTE: Los hashes de arriba son placeholders.
-- Al correr npm start, el servidor crea/actualiza estos usuarios con hashes reales.
-- Credenciales por defecto:
--   admin  / admin123
--   cajero / cajero123
