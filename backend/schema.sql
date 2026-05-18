-- ============================================================
-- schema.sql — Base de datos POS Papel y Luna MVP3
-- Ejecutar en MySQL: mysql -u root -p papel_luna < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS papel_luna
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE papel_luna;

-- ── Usuarios / Auth ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  usuario    VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,          -- bcrypt hash
  rol        ENUM('admin','cajero') NOT NULL DEFAULT 'cajero',
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usuario admin por defecto (password: admin123)
-- El hash se genera en seed.sql; aquí dejamos el placeholder
-- para que seed.sql lo sobreescriba

-- ── Categorías ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT
);

-- ── Proveedores ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  contacto  VARCHAR(100),
  telefono  VARCHAR(30)
);

-- ── Clientes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  documento  VARCHAR(30),
  correo     VARCHAR(100),
  telefono   VARCHAR(30)
);

-- ── Descuentos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS descuentos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  tipo       ENUM('porcentaje','fijo') NOT NULL,
  valor      DECIMAL(10,2) NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Productos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL,
  precio       DECIMAL(10,2) NOT NULL DEFAULT 0,
  costo        DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock        INT NOT NULL DEFAULT 0,
  categoria_id INT,
  proveedor_id INT,
  imagen       VARCHAR(500),
  creado_en    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
);

-- ── Ventas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  fecha           DATETIME DEFAULT CURRENT_TIMESTAMP,
  cliente_id      INT,
  usuario_id      INT,                         -- cajero que procesó
  metodo_pago     ENUM('Efectivo','Tarjeta','Transferencia','Otro') NOT NULL DEFAULT 'Efectivo',
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  descuento_id    INT,
  descuento_valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0,
  recibido        DECIMAL(10,2) NOT NULL DEFAULT 0,
  cambio          DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado          ENUM('cerrada','corregida','reembolsada') NOT NULL DEFAULT 'cerrada',
  -- Campos de corrección
  corregida_por   INT,                         -- usuario_id que corrigió
  corregida_en    DATETIME,
  motivo_correccion TEXT,
  FOREIGN KEY (cliente_id)   REFERENCES clientes(id)   ON DELETE SET NULL,
  FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)   ON DELETE SET NULL,
  FOREIGN KEY (descuento_id) REFERENCES descuentos(id) ON DELETE SET NULL,
  FOREIGN KEY (corregida_por) REFERENCES usuarios(id)  ON DELETE SET NULL
);

-- ── Ítems de venta ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venta_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  venta_id    INT NOT NULL,
  producto_id INT,
  nombre      VARCHAR(150) NOT NULL,           -- snapshot del nombre
  precio      DECIMAL(10,2) NOT NULL,          -- snapshot del precio
  cantidad    INT NOT NULL DEFAULT 1,
  subtotal    DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (venta_id)    REFERENCES ventas(id)    ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

-- ── Reembolsos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reembolsos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  venta_id        INT NOT NULL,
  usuario_id      INT,
  fecha           DATETIME DEFAULT CURRENT_TIMESTAMP,
  tipo            ENUM('total','parcial') NOT NULL,
  monto           DECIMAL(10,2) NOT NULL,
  motivo          TEXT,
  FOREIGN KEY (venta_id)   REFERENCES ventas(id)   ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reembolso_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  reembolso_id    INT NOT NULL,
  producto_id     INT,
  nombre          VARCHAR(150) NOT NULL,
  cantidad        INT NOT NULL,
  precio          DECIMAL(10,2) NOT NULL,
  retorna_stock   BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (reembolso_id) REFERENCES reembolsos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id)  REFERENCES productos(id)  ON DELETE SET NULL
);

-- ── Compras ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compras (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  fecha        DATETIME DEFAULT CURRENT_TIMESTAMP,
  proveedor_id INT,
  usuario_id   INT,
  total        DECIMAL(10,2) NOT NULL DEFAULT 0,
  nota         TEXT,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)   ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS compra_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  compra_id   INT NOT NULL,
  producto_id INT,
  nombre      VARCHAR(150) NOT NULL,
  cantidad    INT NOT NULL,
  costo       DECIMAL(10,2) NOT NULL,
  subtotal    DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (compra_id)   REFERENCES compras(id)   ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

-- ── Faltantes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faltantes (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL,
  descripcion  TEXT,
  proveedor_id INT,
  tipo         VARCHAR(100),
  cantidad_est INT NOT NULL DEFAULT 1,
  resuelto     BOOLEAN NOT NULL DEFAULT FALSE,
  resuelto_en  DATETIME,
  creado_en    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
);
