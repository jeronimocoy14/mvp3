const urlParams    = new URLSearchParams(window.location.search);
let ID_SESION      = urlParams.get('sesion');

// Si no viene sesión en la URL, crear una nueva automáticamente
if (!ID_SESION) {
  ID_SESION = 'SES-' + Date.now();
  // Actualizar URL sin recargar para que el botón "Carrito" lleve a la sesión correcta
  history.replaceState(null, '', `?sesion=${ID_SESION}`);
}

// Cargar carrito de ESTA sesión
carrito = cargarCarritoLocal(ID_SESION);
actualizarContadorCarrito();

const cantidadesProducto = {};

// ── Cargar productos desde la API ────────────────────────────
async function obtenerProductos() {
  const catalogo = document.getElementById('catalogo');
  if (catalogo) catalogo.innerHTML = '<p>Cargando catálogo...</p>';
  try {
    const resultado = await apiGet('productos');
    if (!resultado.success || !Array.isArray(resultado.data)) throw new Error(resultado.message);
    productos = resultado.data.map(p => ({
      id:        String(p.id ?? ''),
      nombre:    p.nombre    ?? 'Sin nombre',
      precio:    Number(p.precio ?? 0),
      stock:     Number(p.stock  ?? 0),
      costo:     Number(p.costo  ?? 0),
      categoria: p.categoria ?? 'General',
      proveedor: p.proveedor ?? '',
      imagen:    p.imagen    || 'https://placehold.co/250x180?text=Producto'
    }));
    renderProductos(productos);
  } catch (err) {
    console.error('Error cargando productos:', err);
    if (catalogo) catalogo.innerHTML = '<p>No se pudieron cargar los productos.</p>';
  }
}

// ── Render del catálogo ──────────────────────────────────────
function renderProductos(lista) {
  const catalogo = document.getElementById('catalogo');
  if (!catalogo) return;
  if (!lista.length) { catalogo.innerHTML = '<p>No hay productos disponibles.</p>'; return; }

  catalogo.innerHTML = lista.map(p => {
    const id       = String(p.id);
    const cant     = cantidadesProducto[id] || 1;
    const stock    = Number(p.stock);
    const sinStock = stock === 0;
    return `
      <div class="card ${sinStock ? 'sin-stock' : ''}">
        <img src="${p.imagen}" alt="${p.nombre}" onerror="this.src='https://placehold.co/250x180?text=Producto'">
        <h3>${p.nombre}</h3>
        <p class="precio">${Number(p.precio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
        <p class="stock-label">Stock: <strong class="${stock < 5 ? 'stock-bajo' : ''}">${stock}</strong></p>
        <div class="cantidad-control">
          <button class="btn btn-secondary btn-cantidad" onclick="ajustarCantidad('${id}', -1)" ${cant <= 1 ? 'disabled' : ''}>−</button>
          <span id="cant-${id}" class="cantidad-valor">${cant}</span>
          <button class="btn btn-primary btn-cantidad"  onclick="ajustarCantidad('${id}', 1)"  ${sinStock || (stock > 0 && cant >= stock) ? 'disabled' : ''}>+</button>
        </div>
        <button class="btn btn-primary btn-agregar" onclick="agregarAlCarrito('${id}')" ${sinStock ? 'disabled' : ''}>
          ${sinStock ? 'Sin stock' : 'Agregar'}
        </button>
      </div>`;
  }).join('');
}

// ── Buscador ─────────────────────────────────────────────────
document.getElementById('buscador')?.addEventListener('input', function() {
  const txt = this.value.toLowerCase();
  renderProductos(productos.filter(p =>
    p.nombre.toLowerCase().includes(txt) || p.categoria.toLowerCase().includes(txt)
  ));
});

// ── Ajustar cantidad ─────────────────────────────────────────
function ajustarCantidad(id, delta) {
  const p     = productos.find(p => p.id === id);
  if (!p) return;
  const stock = Number(p.stock);
  let nueva   = (cantidadesProducto[id] || 1) + delta;
  if (nueva < 1) nueva = 1;
  if (stock > 0 && nueva > stock) { nueva = stock; mostrarMensaje(`Máximo ${stock} disponibles.`, 'error'); }
  cantidadesProducto[id] = nueva;
  const el = document.getElementById(`cant-${id}`);
  if (el) el.textContent = nueva;
}

// ── Agregar al carrito de ESTA sesión ─────────────────────────
async function agregarAlCarrito(id) {
  const p = productos.find(p => p.id === id);
  if (!p) return;
  const stock    = Number(p.stock);
  const cantidad = cantidadesProducto[id] || 1;

  const existente = carrito.find(i => String(i.id) === id);
  if (existente) {
    const nuevo = existente.cantidad + cantidad;
    existente.cantidad = stock > 0 ? Math.min(nuevo, stock) : nuevo;
  } else {
    carrito.push({ id: p.id, nombre: p.nombre, precio: p.precio, stock: p.stock, cantidad });
  }

  guardarCarritoLocal(ID_SESION, carrito);
  cantidadesProducto[id] = 1;
  const el = document.getElementById(`cant-${id}`);
  if (el) el.textContent = '1';
  actualizarContadorCarrito();

  // Actualizar meta de esta venta abierta
  guardarVentaAbiertaMeta(ID_SESION, {
    total:         carrito.reduce((s, i) => s + i.precio * i.cantidad, 0),
    items:         carrito,
    clienteId:     '',
    clienteNombre: 'Sin cliente'
  });
  renderVentasAbiertas();
  mostrarMensaje(`"${p.nombre}" agregado ✓`);

  try {
    await apiPost('carrito', {
      resource: 'carrito', id_sesion: ID_SESION,
      id_producto: p.id, nombre: p.nombre, precio: p.precio, cantidad
    });
  } catch {}
}

// ── Panel de ventas abiertas ──────────────────────────────────
function renderVentasAbiertas() {
  const banner = document.getElementById('venta-abierta-banner');
  if (!banner) return;
  const lista = cargarVentasAbiertas();
  if (!lista.length) { banner.classList.add('oculto'); banner.innerHTML = ''; return; }

  banner.classList.remove('oculto');
  banner.innerHTML = `
    <div class="panel-card">
      <h3>Ventas abiertas (${lista.length})</h3>
      <div class="open-sale-list">
        ${lista.map(v => `
          <div class="open-sale-item">
            <strong>${v.id}</strong>
            <span class="cliente-tag">${v.clienteNombre || 'Sin cliente'}</span>
            <span>${v.items?.length || 0} producto(s)</span>
            <span>${Number(v.total).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
            <button class="btn btn-secondary" onclick="continuarVenta('${v.id}')">Continuar</button>
            <button class="btn btn-danger"    onclick="descartarVenta('${v.id}')">Descartar</button>
          </div>`).join('')}
      </div>
    </div>`;
}

// Continuar una venta abierta: ir al carrito de esa sesión
function continuarVenta(sesion) {
  window.location.href = `Carrito.html?sesion=${sesion}`;
}

// Descartar una venta abierta
async function descartarVenta(sesion) {
  if (!(await confirmar('¿Descartar esta venta? Se perderán los productos del carrito.'))) return;
  limpiarCarritoLocal(sesion);
  borrarVentaAbierta(sesion);
  renderVentasAbiertas();
  mostrarMensaje('Venta descartada.');
}

// Ir al carrito de la sesión actual
function verCarrito() {
  window.location.href = `Carrito.html?sesion=${ID_SESION}`;
}

// ── Exponer al scope global ──────────────────────────────────
window.ajustarCantidad  = ajustarCantidad;
window.agregarAlCarrito = agregarAlCarrito;
window.continuarVenta   = continuarVenta;
window.descartarVenta   = descartarVenta;
window.verCarrito       = verCarrito;

// ── Init ─────────────────────────────────────────────────────
renderVentasAbiertas();
document.addEventListener('DOMContentLoaded', obtenerProductos);
