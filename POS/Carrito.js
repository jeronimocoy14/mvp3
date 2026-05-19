const params        = new URLSearchParams(window.location.search);
const miSesion      = params.get('sesion') || localStorage.getItem(CART_SESSION_KEY) || ('SES-' + Date.now());
 
const metodoSelect    = document.getElementById('metodo');
const recibidoInput   = document.getElementById('recibido');
const cambioSpan      = document.getElementById('cambio');
const efectivoBox     = document.getElementById('efectivo-box');
const clienteSelect   = document.getElementById('cliente-select');
const descuentoSelect = document.getElementById('descuento-select');
 
// ── Descuentos disponibles (cargados desde la API) ───────────
let descuentosDisponibles = [];
 
// ── Cargar clientes ──────────────────────────────────────────
async function cargarClientes() {
  if (!clienteSelect) return;
  clienteSelect.innerHTML = '<option value="">— Sin cliente —</option>';
  try {
    const res = await apiGet('clientes');
    if (res.success && Array.isArray(res.data)) {
      res.data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nombre + (c.documento ? ` (${c.documento})` : '');
        clienteSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.warn('No se pudo cargar clientes:', err);
  }
 
  // Restaurar cliente previo de esta sesión
  const meta = cargarVentasAbiertas().find(v => String(v.id) === String(miSesion));
  if (meta?.clienteId && clienteSelect) clienteSelect.value = meta.clienteId;
}
 
function obtenerClienteSeleccionado() {
  if (!clienteSelect?.value) return { clienteId: '', clienteNombre: 'Sin cliente' };
  const texto = clienteSelect.options[clienteSelect.selectedIndex]?.text || 'Sin cliente';
  const nombre = texto.replace(/\s*\(.*\)$/, '');
  return { clienteId: clienteSelect.value, clienteNombre: nombre };
}
 
// ── Cargar descuentos activos ────────────────────────────────
async function cargarDescuentos() {
  if (!descuentoSelect) return;
  descuentoSelect.innerHTML = '<option value="">— Sin descuento —</option>';
  try {
    const res = await apiGet('descuentos?activos=true');
    if (res.success && Array.isArray(res.data)) {
      descuentosDisponibles = res.data;
      res.data.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.tipo === 'porcentaje'
          ? `${d.nombre} (−${d.valor}%)`
          : `${d.nombre} (−${Number(d.valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })})`;
        descuentoSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.warn('No se pudieron cargar descuentos:', err);
  }
}
 
// ── Obtener descuento seleccionado ───────────────────────────
function obtenerDescuentoSeleccionado() {
  const id = Number(descuentoSelect?.value);
  if (!id) return null;
  return descuentosDisponibles.find(d => d.id === id) || null;
}
 
// ── Calcular descuento en pesos ──────────────────────────────
function calcularValorDescuento(subtotal) {
  const desc = obtenerDescuentoSeleccionado();
  if (!desc) return 0;
  return desc.tipo === 'porcentaje'
    ? subtotal * (desc.valor / 100)
    : Math.min(Number(desc.valor), subtotal); // nunca mayor al subtotal
}
 
// ── Obtener total con descuento ──────────────────────────────
function obtenerSubtotal() {
  return carrito.reduce((s, i) => s + (Number(i.precio) * Number(i.cantidad)), 0);
}
 
function obtenerTotal() {
  const subtotal = obtenerSubtotal();
  const descuento = calcularValorDescuento(subtotal);
  return Math.max(0, subtotal - descuento);
}
 
// ── Método de pago ───────────────────────────────────────────
function actualizarMetodoPago() {
  if (!efectivoBox) return;
  if (metodoSelect?.value === 'Efectivo') {
    efectivoBox.style.display = 'block';
    calcularCambio();
  } else {
    efectivoBox.style.display = 'none';
    if (recibidoInput) recibidoInput.value = '';
    if (cambioSpan)    cambioSpan.textContent = '$0';
  }
}
 
function calcularCambio() {
  if (!recibidoInput || !cambioSpan) return;
  const total  = obtenerTotal();
  const pagado = Number(recibidoInput.value) || 0;
  const cambio = pagado - total;
  cambioSpan.textContent = cambio < 0
    ? `Faltan ${Math.abs(cambio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}`
    : cambio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
}
 
// ── Actualizar el resumen visual de totales ──────────────────
function actualizarResumen() {
  const subtotal       = obtenerSubtotal();
  const valorDescuento = calcularValorDescuento(subtotal);
  const total          = Math.max(0, subtotal - valorDescuento);
  const desc           = obtenerDescuentoSeleccionado();
 
  const fmt = v => v.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
 
  const subtotalEl  = document.getElementById('subtotal-carrito');
  const totalEl     = document.getElementById('total-carrito');
  const lineaDesc   = document.getElementById('linea-descuento');
  const badgeLabel  = document.getElementById('desc-badge-label');
  const valorDescEl = document.getElementById('valor-descuento');
 
  if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
  if (totalEl)    totalEl.textContent    = fmt(total);
 
  if (desc && valorDescuento > 0) {
    if (lineaDesc)   lineaDesc.style.display  = 'flex';
    if (badgeLabel)  badgeLabel.textContent   = desc.tipo === 'porcentaje' ? `${desc.valor}%` : 'fijo';
    if (valorDescEl) valorDescEl.textContent  = `−${fmt(valorDescuento)}`;
  } else {
    if (lineaDesc) lineaDesc.style.display = 'none';
  }
 
  calcularCambio();
}
 
// ── Cargar carrito ───────────────────────────────────────────
async function cargarCarrito() {
  const contenedor = document.getElementById('carrito-lista');
  if (contenedor) contenedor.innerHTML = '<p>Cargando carrito...</p>';
 
  const local = cargarCarritoLocal(miSesion);
  if (local.length) {
    carrito = local;
    render();
    return;
  }
 
  try {
    const res = await apiGet('carrito');
    if (res.success && Array.isArray(res.data)) {
      carrito = res.data
        .filter(i => String(i.id_sesion).trim() === String(miSesion).trim())
        .map(i => ({
          id:       String(i.id_producto ?? ''),
          nombre:   i.nombre  ?? '',
          precio:   Number(i.precio   ?? 0),
          cantidad: Number(i.cantidad ?? 1),
          stock:    0
        }));
      guardarCarritoLocal(miSesion, carrito);
    }
  } catch (err) {
    console.warn('No se pudo cargar carrito desde API:', err);
  }
  render();
}
 
// ── Guardar venta abierta ────────────────────────────────────
function guardarVentaLocal() {
  if (!miSesion || !carrito.length) return;
  const { clienteId, clienteNombre } = obtenerClienteSeleccionado();
  guardarVentaAbiertaMeta(miSesion, {
    total: obtenerTotal(),
    items: carrito,
    clienteId,
    clienteNombre
  });
}
 
// ── Eliminar ítem ────────────────────────────────────────────
async function eliminarDelCarrito(index) {
  const item = carrito[index];
  if (!item) return;
  carrito.splice(index, 1);
  guardarCarritoLocal(miSesion, carrito);
  render();
  try {
    await apiPost('carrito', { resource: 'carrito', id_sesion: miSesion, id_producto: item.id, accion: 'delete' });
  } catch {}
}
 
// ── Ajustar cantidad ─────────────────────────────────────────
async function ajustarCantidadCarrito(index, delta) {
  const item = carrito[index];
  if (!item) return;
  let nueva = Number(item.cantidad) + delta;
  if (nueva <= 0) { await eliminarDelCarrito(index); return; }
  const stock = Number(item.stock) || 0;
  if (stock > 0 && nueva > stock) { nueva = stock; mostrarMensaje(`Máximo ${stock} disponibles.`, 'error'); }
  item.cantidad = nueva;
  guardarCarritoLocal(miSesion, carrito);
  render();
  try {
    await apiPost('carrito', { resource: 'carrito', id_sesion: miSesion, id_producto: item.id, cantidad: nueva, accion: 'update' });
  } catch {}
}
 
// ── Editar ítem ──────────────────────────────────────────────
async function editarItemCarrito(index) {
  const item = carrito[index];
  if (!item) return;
  const valPrecio = await pedirValor(`Nuevo precio para "${item.nombre}":`, item.precio);
  if (valPrecio === null) return;
  const nuevoPrecio = Number(valPrecio);
  if (isNaN(nuevoPrecio) || nuevoPrecio < 0) { mostrarMensaje('Precio inválido.', 'error'); return; }
 
  const valCant = await pedirValor(`Nueva cantidad para "${item.nombre}":`, item.cantidad);
  if (valCant === null) return;
  const nuevaCantidad = Number(valCant);
  if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) { mostrarMensaje('Cantidad inválida.', 'error'); return; }
 
  item.precio   = nuevoPrecio;
  item.cantidad = nuevaCantidad;
  guardarCarritoLocal(miSesion, carrito);
  render();
}
 
// ── Vaciar carrito ───────────────────────────────────────────
async function vaciar_carrito() {
  if (!(await confirmar('¿Vaciar el carrito completo?'))) return;
  carrito = [];
  limpiarCarritoLocal(miSesion);
  borrarVentaAbierta(miSesion);
  render();
  try { await apiPost('carrito', { resource: 'carrito', id_sesion: miSesion, accion: 'vaciar' }); } catch {}
}
 
// ── Cerrar venta ─────────────────────────────────────────────
async function cerrarVenta() {
  if (!carrito.length) { mostrarMensaje('El carrito está vacío.', 'error'); return; }
 
  const metodo = metodoSelect?.value;
  if (!metodo) { mostrarMensaje('Selecciona un método de pago.', 'error'); return; }
 
  const subtotal       = obtenerSubtotal();
  const desc           = obtenerDescuentoSeleccionado();
  const valorDescuento = calcularValorDescuento(subtotal);
  const total          = Math.max(0, subtotal - valorDescuento);
 
  let recibido = 0;
  if (metodo === 'Efectivo') {
    recibido = Number(recibidoInput?.value) || 0;
    if (recibido < total) { mostrarMensaje('El valor recibido es insuficiente.', 'error'); return; }
  }
 
  const { clienteId } = obtenerClienteSeleccionado();
 
  const venta = {
    cliente_id:   clienteId || null,
    metodo_pago:  metodo,
    recibido,
    descuento_id: desc?.id || null,
    items: carrito.map(i => ({
      id:       i.id,
      nombre:   i.nombre,
      precio:   i.precio,
      cantidad: i.cantidad
    }))
  };
 
  mostrarMensaje('Registrando venta...', 'info');
  try {
    const res = await apiPost('ventas', venta);
    if (!res.success) throw new Error(res.message);
 
    carrito = [];
    limpiarCarritoLocal(miSesion);
    borrarVentaAbierta(miSesion);
    localStorage.removeItem(CART_SESSION_KEY);
    render();
    mostrarMensaje('¡Venta registrada correctamente! ✓');
    setTimeout(() => { window.location.href = 'PapelLuna.html'; }, 2000);
  } catch (err) {
    console.error('Error al cerrar venta:', err);
    mostrarMensaje('Error al registrar la venta: ' + err.message, 'error');
  }
}
 
// ── Render del carrito ───────────────────────────────────────
function render() {
  const contenedor = document.getElementById('carrito-lista');
  if (!contenedor) return;
 
  actualizarContadorCarrito();
 
  if (!carrito.length) {
    contenedor.innerHTML = '<p>Tu carrito está vacío.</p>';
    actualizarResumen();
    return;
  }
 
  contenedor.innerHTML = carrito.map((item, i) => {
    const subtotalItem = Number(item.precio) * Number(item.cantidad);
    return `
      <div class="item-carrito">
        <div class="info">
          <h4>${item.nombre}</h4>
          <p>Precio: ${Number(item.precio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
          <div class="cantidad-control">
            <button class="btn btn-secondary btn-cantidad" onclick="ajustarCantidadCarrito(${i}, -1)">−</button>
            <span class="cantidad-valor">${item.cantidad}</span>
            <button class="btn btn-primary btn-cantidad" onclick="ajustarCantidadCarrito(${i}, 1)">+</button>
          </div>
        </div>
        <div class="subtotal">
          Subtotal: ${subtotalItem.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
        </div>
        <div class="acciones">
          <button class="btn btn-secondary" onclick="editarItemCarrito(${i})">Editar</button>
          <button class="btn btn-danger"    onclick="eliminarDelCarrito(${i})">Eliminar</button>
        </div>
      </div>`;
  }).join('');
 
  actualizarResumen();
  guardarVentaLocal();
}
 
// ── Exponer al scope global ──────────────────────────────────
window.vaciar_carrito         = vaciar_carrito;
window.editarItemCarrito      = editarItemCarrito;
window.ajustarCantidadCarrito = ajustarCantidadCarrito;
window.eliminarDelCarrito     = eliminarDelCarrito;
 
// ── Event listeners ──────────────────────────────────────────
metodoSelect?.addEventListener('change', actualizarMetodoPago);
recibidoInput?.addEventListener('input', calcularCambio);
clienteSelect?.addEventListener('change', guardarVentaLocal);
descuentoSelect?.addEventListener('change', actualizarResumen); // recalcular al cambiar descuento
 
document.getElementById('cerrar')?.addEventListener('click', cerrarVenta);
document.getElementById('guardar-venta')?.addEventListener('click', () => {
  guardarVentaLocal();
  mostrarMensaje('Venta guardada. Puedes continuar más tarde. ✓');
});
 
// ── Init ─────────────────────────────────────────────────────
actualizarMetodoPago();
cargarClientes();
cargarDescuentos();
cargarCarrito();