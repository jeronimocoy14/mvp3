# POS Papel y Luna — MVP 3

## Estructura del proyecto

```
/
├── backend/          ← Node.js + Express + MySQL
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/auth.js
│   │   ├── controllers/authController.js
│   │   └── middleware/auth.js
│   ├── config/db.js
│   ├── schema.sql
│   ├── seed.sql
│   └── package.json
│
└── POS/              ← Frontend (archivos HTML/CSS/JS)
    ├── login.html    ← Página de entrada
    ├── auth.js       ← Módulo de autenticación frontend
    ├── data.js       ← Config API y utilidades
    └── ...
```

## Instalación local

### 1. Base de datos MySQL
```bash
mysql -u root -p < backend/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Editar .env con tus credenciales de MySQL
npm install
npm run dev
```

El servidor arranca en `http://localhost:3001`  
Crea automáticamente los usuarios por defecto al arrancar.

### 3. Frontend
Abre con Live Server (VS Code) o cualquier servidor estático.  
La primera página es `login.html`.

## Credenciales por defecto
| Usuario | Contraseña | Rol   |
|---------|-----------|-------|
| admin   | admin123  | admin |
| cajero  | cajero123 | cajero|

## Despliegue en Render (backend)

1. Subir el repositorio a GitHub
2. En Render → New Web Service → conectar repo
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Agregar las variables de entorno del `.env`
7. Usar una base de datos MySQL externa (PlanetScale, Aiven, Railway, etc.)

## Variables de entorno necesarias (.env)
```
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=papel_luna
JWT_SECRET=clave_muy_segura_aqui
JWT_EXPIRES_IN=8h
PORT=3001
FRONTEND_URL=https://tu-frontend.netlify.app
```

## Control de acceso por rol

### Solo admin (`data-solo-admin`)
- Eliminar productos
- Ver/crear usuarios
- Correcciones de ventas

### Cajero
- Nueva venta
- Carrito / cerrar venta
- Ver historial (lectura)
- Compras

Para ocultar un elemento al cajero, agregar el atributo:
```html
<button data-solo-admin>Solo admins ven esto</button>
```
