let nombreInput, precioInput, stockInput, costoInput;
let categoriaInput, proveedorInput, imagenInput, listaContenedor;
let modalOverlay, modalText, modalInput;
let modalCancel, modalAccept, modalCosto, modalPrecio, modalCancelar;
 
let productoEditandoId   = null;
let modalConfirmCallback = null;
let modalPromptCallback  = null;
 
// ── Cargar productos desde la API ────────────────────────────
async function obtenerProductos() {
  if (listaContenedor) listaContenedor.innerHTML = '<p>Cargando productos...</p>';
  try {
    const resultado = await apiGet('productos');
    if (!resultado.success || !Array.isArray(resultado.data)) throw new Error(resultado.message);
    productos = resultado.data.map(p => ({
      id:        String(p.id ?? ''),
      nombre:    p.nombre    ?? '',
      precio:    Number(p.precio ?? 0),
      stock:     Number(p.stock  ?? 0),
      costo:     Number(p.costo  ?? 0),
      categoria: p.categoria ?? '',
      proveedor: p.proveedor ?? '',
      imagen:    p.imagen    ?? ''
    }));
    renderizarTabla();
    cargarDatalistsProductos();
  } catch (err) {
    console.error('Error cargando productos:', err);
    mostrarMensaje('Error al cargar productos desde la API.', 'error');
    if (listaContenedor) listaContenedor.innerHTML = '<p>No se pudo cargar el inventario.</p>';
  }
}
 
// ── Datalists de categorías y proveedores ─────────────────────
async function cargarDatalistsProductos() {
  try {
    const res = await apiGet('categorias');
    const dl  = document.getElementById('categorias-datalist');
    if (dl && res.success && Array.isArray(res.data))
      dl.innerHTML = res.data.map(c => `<option value="${c.nombre}"></option>`).join('');
  } catch {}
  try {
    const res = await apiGet('proveedores');
    const dl  = document.getElementById('proveedores-datalist');
    if (dl && res.success && Array.isArray(res.data))
      dl.innerHTML = res.data.map(p => `<option value="${p.nombre}"></option>`).join('');
  } catch {}
}
 
// ── Crear producto ───────────────────────────────────────────
async function crear() {
  const nombre    = nombreInput?.value.trim();
  const precio    = Number(precioInput?.value);
  const stock     = Number(stockInput?.value)  || 0;
  const costo     = Number(costoInput?.value)  || 0;
  const categoria = categoriaInput?.value.trim() || 'General';
  const proveedor = proveedorInput?.value.trim() || '';
  const imagen    = imagenInput?.value.trim()    || '';
 
  if (!nombre)    { mostrarMensaje('Escribe el nombre del producto.', 'error'); return; }
  if (precio <= 0){ mostrarMensaje('El precio debe ser mayor a 0.',   'error'); return; }
 
  const existente = productos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
  const nuevo = {
    id: existente ? existente.id : String(Date.now()),
    nombre, precio, stock, costo, categoria, proveedor, imagen
  };
 
  mostrarMensaje('Guardando...', 'info');
  let res;
  if (existente) {
    res = await apiPut('productos', existente.id, nuevo);
  } else {
    res = await apiPost('productos', nuevo);
  }
  if (!res.success) throw new Error(res.message);
  mostrarMensaje(existente ? 'Producto actualizado ✓' : 'Producto creado ✓');
  cancelar();
  await new Promise(r => setTimeout(r, 1500));
  await obtenerProductos();
}
 
// ── Sincronizar producto editado ─────────────────────────────
async function sincronizarProducto(producto) {
  mostrarMensaje('Guardando cambios...', 'info');
  const res = await apiPut('productos', producto.id, producto);
  if (!res.success) throw new Error(res.message);
  mostrarMensaje('Producto actualizado ✓');
  await new Promise(r => setTimeout(r, 1500));
  await obtenerProductos();
}
 
// ── Eliminar ─────────────────────────────────────────────────
function eliminar(id) {
  const p = productos.find(p => String(p.id) === String(id));
  if (!p) return;
  mostrarConfirm(`¿Eliminar "${p.nombre}" permanentemente?`, async () => {
    mostrarMensaje('Eliminando...', 'info');
    await apiPost('productos', { id: String(id), action: 'delete' });
    mostrarMensaje('Producto eliminado ✓');
    await new Promise(r => setTimeout(r, 1500));
    await obtenerProductos();
  });
}
 
// ── Restock ──────────────────────────────────────────────────
function restock(id) {
  const p = productos.find(p => String(p.id) === String(id));
  if (!p) return;
  mostrarPrompt(
    `Agregar stock a: ${p.nombre} (actual: ${p.stock})`,
    '',
    async (valor) => {
      const cantidad = Number(valor);
      if (isNaN(cantidad) || cantidad <= 0) { mostrarMensaje('Cantidad inválida.', 'error'); return; }
      const res = await apiPatch(`productos/${p.id}/stock`, { cantidad });
      if (!res.success) throw new Error(res.message);
      mostrarMensaje('Stock actualizado ✓');
      await new Promise(r => setTimeout(r, 500));
      await obtenerProductos();
    }
  );
}
 
// ── Editar ───────────────────────────────────────────────────
function editar(id) {
  const p = productos.find(p => String(p.id) === String(id));
  if (!p) return;
  productoEditandoId = id;
  mostrarEditables(`¿Qué deseas modificar de "${p.nombre}"?`);
}
 
// ── Cancelar formulario ──────────────────────────────────────
function cancelar() {
  [nombreInput, precioInput, stockInput, costoInput,
   categoriaInput, proveedorInput, imagenInput].forEach(el => { if (el) el.value = ''; });
}
 
// ── Render ───────────────────────────────────────────────────
function renderizarTabla() {
  if (!listaContenedor) return;
  if (!productos.length) {
    listaContenedor.innerHTML = '<p>No hay productos registrados. Crea el primero.</p>';
    return;
  }
  listaContenedor.innerHTML = productos.map(p => `
    <div class="producto-item-card">
      <div class="prod-info">
        <h3 class="prod-nombre">${p.nombre}</h3>
        <div class="prod-badges">
          <span class="badge badge-cat">${p.categoria || 'Sin categoría'}</span>
          <span class="badge badge-prov">${p.proveedor || 'Sin proveedor'}</span>
        </div>
        <div class="prod-nums">
          <span>💰 Precio: <strong>${Number(p.precio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong></span>
          <span>📦 Stock: <strong class="${p.stock < 5 ? 'stock-bajo' : ''}">${p.stock}</strong></span>
          <span>🏷️ Costo: <strong>${Number(p.costo || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong></span>
        </div>
      </div>
      <div class="prod-acciones">
        <button class="btn btn-accion btn-restock"    onclick="restock('${p.id}')">📥 Restock</button>
        <button class="btn btn-accion btn-editar-p"   onclick="editarPrecio('${p.id}')">💰 Precio</button>
        <button class="btn btn-accion btn-editar-c"   onclick="editarCosto('${p.id}')">🏷️ Costo</button>
        <button class="btn btn-accion btn-editar-pr"  onclick="editarProveedor('${p.id}')">🏢 Proveedor</button>
        <button class="btn btn-accion btn-eliminar"   onclick="eliminar('${p.id}')">🗑️ Eliminar</button>
      </div>
    </div>`).join('');
}
 
// ── Helpers del modal ─────────────────────────────────────────
function ocultarTodoModal() {
  // Oculta todos los botones/inputs del modal; cada función luego muestra los que necesita
  [modalInput, modalAccept, modalCancel, modalCosto, modalPrecio, modalCancelar]
    .forEach(el => el?.classList.add('oculto'));
  if (modalInput) modalInput.value = '';
}
 
function cerrarModal() {
  modalOverlay?.classList.add('oculto');
  ocultarTodoModal();
  modalConfirmCallback = null;
  modalPromptCallback  = null;
  productoEditandoId   = null;
}
 
// Muestra: input + Aceptar + Cancelar
function mostrarPrompt(texto, defaultValue, onSubmit) {
  ocultarTodoModal();
  modalText.textContent = texto;
  modalInput.value      = defaultValue ?? '';
  modalInput.classList.remove('oculto');
  modalAccept.textContent = 'Aceptar';
  modalAccept.classList.remove('oculto');
  modalCancel.textContent = 'Cancelar';
  modalCancel.classList.remove('oculto');
  modalPromptCallback  = onSubmit;
  modalConfirmCallback = null;
  modalOverlay.classList.remove('oculto');
  setTimeout(() => modalInput.focus(), 50);
}
 
// Muestra: Sí + No (sin input)
function mostrarConfirm(texto, onConfirm) {
  ocultarTodoModal();
  modalText.textContent = texto;
  modalAccept.textContent = 'Sí';
  modalAccept.classList.remove('oculto');
  modalCancel.textContent = 'No';
  modalCancel.classList.remove('oculto');
  modalConfirmCallback = onConfirm;
  modalPromptCallback  = null;
  modalOverlay.classList.remove('oculto');
}
 
// Muestra: Editar Precio + Editar Costo + Cerrar (sin input, sin Aceptar)
function mostrarEditables(texto) {
  ocultarTodoModal();
  modalText.textContent = texto;
  modalCosto.classList.remove('oculto');
  modalPrecio.classList.remove('oculto');
  modalCancelar.classList.remove('oculto');
  modalOverlay.classList.remove('oculto');
}
 
// ── Exponer al scope global ──────────────────────────────────
// Funciones de edición directa por campo
function editarPrecio(id) {
  const p = productos.find(p => String(p.id) === String(id));
  if (!p) return;
  mostrarPrompt(`Nuevo precio para "${p.nombre}":`, p.precio, async (val) => {
    const num = Number(val);
    if (isNaN(num) || num < 0) { mostrarMensaje('Valor inválido.', 'error'); return; }
    await sincronizarProducto({ ...p, precio: num });
  });
}
 
function editarCosto(id) {
  const p = productos.find(p => String(p.id) === String(id));
  if (!p) return;
  mostrarPrompt(`Nuevo costo para "${p.nombre}":`, p.costo, async (val) => {
    const num = Number(val);
    if (isNaN(num) || num < 0) { mostrarMensaje('Valor inválido.', 'error'); return; }
    await sincronizarProducto({ ...p, costo: num });
  });
}
 
function editarProveedor(id) {
  const p = productos.find(p => String(p.id) === String(id));
  if (!p) return;
  mostrarPrompt(`Nuevo proveedor para "${p.nombre}":`, p.proveedor, async (val) => {
    const txt = val.trim();
    if (!txt) { mostrarMensaje('Escribe el nombre del proveedor.', 'error'); return; }
    await sincronizarProducto({ ...p, proveedor: txt });
  });
}
 
window.restock        = restock;
window.editar         = editar;
window.eliminar       = eliminar;
window.cancelar       = cancelar;
window.crear          = crear;
window.editarPrecio   = editarPrecio;
window.editarCosto    = editarCosto;
window.editarProveedor= editarProveedor;
 
// ── Init: todo dentro de DOMContentLoaded ────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Asignar referencias DOM ahora que el HTML está listo
  nombreInput    = document.getElementById('nombre');
  precioInput    = document.getElementById('precio');
  stockInput     = document.getElementById('stock');
  costoInput     = document.getElementById('costo');
  categoriaInput = document.getElementById('categoria');
  proveedorInput = document.getElementById('proveedor');
  imagenInput    = document.getElementById('imagen');
  listaContenedor= document.getElementById('lista');
 
  modalOverlay   = document.getElementById('modal-overlay');
  modalText      = document.getElementById('modal-text');
  modalInput     = document.getElementById('modal-input');
  modalCancel    = document.getElementById('modal-cancel');
  modalAccept    = document.getElementById('modal-accept');
  modalCosto     = document.getElementById('modal-costo');
  modalPrecio    = document.getElementById('modal-precio');
  modalCancelar  = document.getElementById('modal-cancelar');
 
  // Asegurarse de que el modal empiece oculto
  cerrarModal();
 
  // ── Listeners del modal ──────────────────────────────────
  modalAccept?.addEventListener('click', () => {
    if (!modalInput?.classList.contains('oculto')) {
      // Modo prompt
      if (typeof modalPromptCallback === 'function') modalPromptCallback(modalInput.value);
    } else {
      // Modo confirm
      if (typeof modalConfirmCallback === 'function') modalConfirmCallback();
    }
    cerrarModal();
  });
 
  modalCancel?.addEventListener('click',   () => cerrarModal());
  modalCancelar?.addEventListener('click', () => cerrarModal());
 
  modalInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') modalAccept?.click();
    if (e.key === 'Escape') cerrarModal();
  });
 
  modalPrecio?.addEventListener('click', () => {
    const p = productos.find(p => String(p.id) === String(productoEditandoId));
    if (!p) return;
    const id = productoEditandoId;
    cerrarModal();
    mostrarPrompt(`Nuevo precio para "${p.nombre}":`, p.precio, async (val) => {
      const num = Number(val);
      if (isNaN(num) || num < 0) { mostrarMensaje('Valor inválido.', 'error'); return; }
      await sincronizarProducto({ ...p, precio: num });
    });
    productoEditandoId = id; // restaurar después de cerrarModal
  });
 
  modalCosto?.addEventListener('click', () => {
    const p = productos.find(p => String(p.id) === String(productoEditandoId));
    if (!p) return;
    const id = productoEditandoId;
    cerrarModal();
    mostrarPrompt(`Nuevo costo para "${p.nombre}":`, p.costo, async (val) => {
      const num = Number(val);
      if (isNaN(num) || num < 0) { mostrarMensaje('Valor inválido.', 'error'); return; }
      await sincronizarProducto({ ...p, costo: num });
    });
    productoEditandoId = id;
  });
 
  // Botón volver
  document.getElementById('volver')?.addEventListener('click', () => {
    window.location.href = 'PapelLuna.html';
  });
 
  // Cargar datos
  obtenerProductos();
});