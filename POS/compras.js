let compraItems     = [];
let productosCompra = [];

// ── Referencias DOM ──────────────────────────────────────────
const productoInput  = document.getElementById('producto-compra');
const cantidadInput  = document.getElementById('cantidad-compra');
const costoInput     = document.getElementById('costo-compra');
const proveedorInput = document.getElementById('proveedor-compra');
const notaInput      = document.getElementById('nota-compra');
const tablaCuerpo    = document.querySelector('#tabla-compra tbody');
const totalLabel     = document.getElementById('total-compra');
const mensajeBox     = document.getElementById('mensaje');

function mostrarMensajeC(texto, tipo = 'success') {
  if (!mensajeBox) { alert(texto); return; }
  mensajeBox.textContent = texto;
  mensajeBox.className   = `mensaje ${tipo} mostrar`;
  setTimeout(() => mensajeBox.classList.remove('mostrar'), 3500);
}

// ── Cargar productos y proveedores desde la API ──────────────
async function cargarDatosCompra() {
  // Productos
  try {
    const res = await apiGet('productos');
    if (res.success && Array.isArray(res.data)) {
      productosCompra = res.data;
      const dl = document.getElementById('productos-compra');
      if (dl) dl.innerHTML = productosCompra.map(p => `<option value="${p.nombre}"></option>`).join('');
    }
  } catch (err) { console.warn('No se pudo cargar productos para compra:', err); }

  // Proveedores
  try {
    const res = await apiGet('proveedores');
    if (res.success && Array.isArray(res.data)) {
      const dl = document.getElementById('proveedores-compra');
      if (dl) dl.innerHTML = res.data.map(p => `<option value="${p.nombre}"></option>`).join('');
    }
  } catch (err) { console.warn('No se pudo cargar proveedores:', err); }
}

// ── Calcular y mostrar total ─────────────────────────────────
function calcularTotal() {
  const total = compraItems.reduce((s, i) => s + Number(i.costo) * Number(i.cantidad), 0);
  if (totalLabel) totalLabel.textContent = `Total: ${total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}`;
  return total;
}

// ── Render de la tabla de ítems ──────────────────────────────
function renderizarTablaCompra() {
  if (!tablaCuerpo) return;
  tablaCuerpo.innerHTML = compraItems.map((item, idx) => `
    <tr>
      <td>${item.producto}</td>
      <td>${item.cantidad}</td>
      <td>${Number(item.costo).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
      <td>${(Number(item.costo) * Number(item.cantidad)).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
      <td>
        <button class="btn btn-secondary" onclick="editarItemCompra(${idx})">Editar</button>
        <button class="btn btn-danger"    onclick="eliminarItemCompra(${idx})">Eliminar</button>
      </td>
    </tr>`).join('');
  calcularTotal();
}

// ── Agregar ítem a la compra ─────────────────────────────────
function agregarItemCompra() {
  const producto  = productoInput?.value.trim();
  const cantidad  = Number(cantidadInput?.value);
  const costo     = Number(costoInput?.value);
  const proveedor = proveedorInput?.value.trim();

  if (!producto)      { mostrarMensajeC('Escribe el nombre del producto.',    'error'); return; }
  if (cantidad <= 0)  { mostrarMensajeC('La cantidad debe ser mayor a 0.',    'error'); return; }
  if (costo    <= 0)  { mostrarMensajeC('El costo debe ser mayor a 0.',       'error'); return; }
  if (!proveedor)     { mostrarMensajeC('Selecciona o escribe un proveedor.', 'error'); return; }

  compraItems.push({ producto, cantidad, costo, proveedor, nota: notaInput?.value.trim() || '' });

  // Limpiar inputs de ítem
  if (productoInput)  productoInput.value  = '';
  if (cantidadInput)  cantidadInput.value  = '';
  if (costoInput)     costoInput.value     = '';
  if (notaInput)      notaInput.value      = '';

  renderizarTablaCompra();
}

// ── Editar ítem ──────────────────────────────────────────────
async function editarItemCompra(idx) {
  const item = compraItems[idx];
  if (!item) return;

  const vProd = await pedirValor('Producto:', item.producto);
  if (vProd === null) return;

  const vCant = await pedirValor('Cantidad:', item.cantidad);
  if (vCant === null) return;

  const vCosto = await pedirValor('Costo unitario:', item.costo);
  if (vCosto === null) return;

  const nuevoProducto = vProd.trim();
  const nuevaCantidad = Number(vCant);
  const nuevoCosto    = Number(vCosto);

  if (!nuevoProducto || nuevaCantidad <= 0 || nuevoCosto <= 0) {
    mostrarMensajeC('Valores inválidos.', 'error'); return;
  }
  compraItems[idx] = { ...item, producto: nuevoProducto, cantidad: nuevaCantidad, costo: nuevoCosto };
  renderizarTablaCompra();
}

// ── Eliminar ítem ────────────────────────────────────────────
function eliminarItemCompra(idx) {
  compraItems.splice(idx, 1);
  renderizarTablaCompra();
}

// ── Registrar compra via API ──────────────────────────────────
async function registrarCompra() {
  if (!compraItems.length) { mostrarMensajeC('Agrega al menos un producto.', 'error'); return; }
  const proveedorNombre = proveedorInput?.value.trim();
  if (!proveedorNombre) { mostrarMensajeC('Selecciona un proveedor.', 'error'); return; }

  // Buscar proveedor_id por nombre
  let proveedor_id = null;
  try {
    const res = await apiGet('proveedores');
    if (res?.success) {
      const prov = res.data.find(p => p.nombre.toLowerCase() === proveedorNombre.toLowerCase());
      proveedor_id = prov?.id || null;
    }
  } catch {}

  // Formato correcto para el backend Node.js
  const compra = {
    proveedor_id,
    nota:  notaInput?.value.trim() || '',
    items: compraItems.map(i => ({
      producto_id: i.producto_id || null,
      nombre:      i.producto,
      cantidad:    i.cantidad,
      costo:       i.costo
    }))
  };

  mostrarMensajeC('Registrando compra...', 'info');
  try {
    const res = await apiPost('compras', compra);
    if (!res?.success) throw new Error(res?.message || 'Error');
    mostrarMensajeC('Compra registrada correctamente ✓ (stock actualizado)');
    compraItems = [];
    renderizarTablaCompra();
    if (proveedorInput) proveedorInput.value = '';
    if (notaInput)      notaInput.value      = '';
  } catch (err) {
    console.error('Error registrando compra:', err);
    mostrarMensajeC(err.message || 'Error al registrar la compra.', 'error');
  }
}

// ── Limpiar todo ─────────────────────────────────────────────
function limpiarCompra() {
  compraItems = [];
  if (productoInput)  productoInput.value  = '';
  if (cantidadInput)  cantidadInput.value  = '';
  if (costoInput)     costoInput.value     = '';
  if (proveedorInput) proveedorInput.value = '';
  if (notaInput)      notaInput.value      = '';
  renderizarTablaCompra();
}

// ── Exponer al scope global ──────────────────────────────────
window.editarItemCompra   = editarItemCompra;
window.eliminarItemCompra = eliminarItemCompra;

// ── Event listeners ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('agregar-compra')?.addEventListener('click',   agregarItemCompra);
  document.getElementById('registrar-compra')?.addEventListener('click', registrarCompra);
  document.getElementById('vaciar-compra')?.addEventListener('click',    limpiarCompra);
  document.getElementById('limpiar-compra')?.addEventListener('click',   limpiarCompra);
  cargarDatosCompra();
  renderizarTablaCompra();
});
