const btnVolver = document.getElementById('volver');
if (btnVolver) btnVolver.onclick = () => { window.location.href = 'PapelLuna.html'; };
 
const fmt = v => Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
 
// ── Estado del modal de corrección ───────────────────────────
let ventaCorrigiendo  = null;
let itemsCorreccion   = [];
let productosCache    = [];
let descuentosCache   = [];
 
function parseItems(items) {
  if (Array.isArray(items)) return items;
  try { const p = JSON.parse(items); return Array.isArray(p) ? p : []; }
  catch { return []; }
}
 
// ── Render principal de ventas ────────────────────────────────
function renderVentas(ventas) {
  const contenedor = document.getElementById('ventas');
  if (!contenedor) return;
 
  if (!ventas.length) {
    contenedor.innerHTML = '<p>No hay ventas registradas aún.</p>';
    return;
  }
 
  const usuario   = Auth.getUsuario();
  const esAdmin   = usuario?.rol === 'admin';
 
  contenedor.innerHTML = ventas.map(v => {
    const items      = parseItems(v.items || []);
    const total      = Number(v.total          || 0);
    const subtotal   = Number(v.subtotal       || 0);
    const recibido   = Number(v.recibido       || 0);
    const cambio     = Number(v.cambio         || 0);
    const descValor  = Number(v.descuento_valor|| 0);
    const metodo     = v.metodo_pago || '—';
    const esEfectivo = metodo.toLowerCase().includes('efectivo');
    const fueCorregida = !!v.corregida_por;
 
    const itemsHtml = items.map(i =>
      `<li>${i.nombre || 'Producto'} — ${Number(i.cantidad || 0)} × ${fmt(i.precio)}
       <span style="color:#666"> = ${fmt(Number(i.precio||0)*Number(i.cantidad||0))}</span></li>`
    ).join('');
 
    // Badge de estado
    const badgeCorregida = fueCorregida
      ? `<span class="badge-corregida">✏️ Corregida por ${v.corregidaPorNombre || 'admin'}
           ${v.fecha_correccion ? '· ' + new Date(v.fecha_correccion).toLocaleString('es-CO') : ''}
         </span>`
      : '';
 
    // Sección de descuento
    const descuentoHtml = descValor > 0 ? `
      <div class="venta-descuento">
        🏷️ Descuento${v.descuentoNombre ? ` <em>${v.descuentoNombre}</em>` : ''}:
        <strong>−${fmt(descValor)}</strong>
        ${subtotal > 0 ? `<span style="color:#999;font-size:.85rem"> (subtotal: ${fmt(subtotal)})</span>` : ''}
      </div>` : '';
 
    // Sección de efectivo
    const efectivoHtml = esEfectivo && recibido > 0 ? `
      <div class="venta-efectivo">
        💵 Recibido: <strong>${fmt(recibido)}</strong>
        &nbsp;·&nbsp; Cambio: <strong>${fmt(cambio)}</strong>
      </div>` : '';
 
    return `
      <div class="venta-card ${fueCorregida ? 'venta-corregida' : ''}">
        <div class="venta-header">
          <div>
            <strong>#${v.id}</strong>
            ${badgeCorregida}
          </div>
          <span class="venta-fecha">${v.fecha ? new Date(v.fecha).toLocaleString('es-CO') : '—'}</span>
        </div>
 
        <div class="venta-meta">
          ${v.clienteNombre ? `<span>👤 ${v.clienteNombre}</span>` : ''}
          ${v.cajeroNombre  ? `<span>🧾 ${v.cajeroNombre}</span>`  : ''}
          <span>💳 ${metodo}</span>
        </div>
 
        ${descuentoHtml}
        ${efectivoHtml}
 
        <div class="venta-total">
          Total: <strong>${fmt(total)}</strong>
        </div>
 
        <details>
          <summary>Ver productos (${items.length})</summary>
          <ul class="venta-items">${itemsHtml || '<li>Sin detalle</li>'}</ul>
        </details>
 
        ${esAdmin ? `
          <div class="venta-acciones">
            <button class="btn btn-secondary btn-sm" onclick="abrirCorreccion(${v.id})">
              ✏️ Corregir venta
            </button>
          </div>` : ''}
      </div>`;
  }).join('');
}
 
// ── Cargar historial ─────────────────────────────────────────
async function cargarHistorial() {
  const contenedor = document.getElementById('ventas');
  if (contenedor) contenedor.innerHTML = '<p>Cargando historial...</p>';
  try {
    const res = await apiGet('ventas');
    if (!res.success) throw new Error(res.message || 'Error en la API');
    renderVentas(res.data || []);
  } catch (err) {
    console.error('Error cargando historial:', err);
    mostrarMensaje('No se pudo cargar el historial de ventas.', 'error');
    if (contenedor) contenedor.innerHTML = '<p>Error al cargar el historial.</p>';
  }
}
 
// ════════════════════════════════════════════════════════════
// MÓDULO DE CORRECCIÓN DE VENTAS
// ════════════════════════════════════════════════════════════
 
async function abrirCorreccion(ventaId) {
  // Cargar la venta completa
  mostrarMensaje('Cargando venta...', 'info');
  try {
    const res = await apiGet(`ventas/${ventaId}`);
    if (!res.success) throw new Error(res.message);
    ventaCorrigiendo = res.data;
    itemsCorreccion  = ventaCorrigiendo.items.map(i => ({ ...i }));
 
    // Cargar productos y descuentos para los selects
    const [resProd, resDesc] = await Promise.all([
      apiGet('productos'),
      apiGet('descuentos')
    ]);
    productosCache  = resProd.data  || [];
    descuentosCache = resDesc.data  || [];
 
    mostrarMensaje('');
    renderModalCorreccion();
    document.getElementById('modal-correccion').classList.remove('oculto');
  } catch (err) {
    mostrarMensaje('Error cargando venta: ' + err.message, 'error');
  }
}
 
function renderModalCorreccion() {
  const v = ventaCorrigiendo;
 
  // Encabezado
  document.getElementById('corr-titulo').textContent = `Corrigiendo venta #${v.id}`;
  document.getElementById('corr-original').innerHTML =
    `Fecha original: ${new Date(v.fecha).toLocaleString('es-CO')} · Cajero: ${v.cajeroNombre || '—'}`;
 
  // Cliente select
  const clienteSel = document.getElementById('corr-cliente');
  clienteSel.innerHTML = '<option value="">— Sin cliente —</option>';
  // (clientes se cargan aparte si se necesitan — usamos el existente)
  const optCliente = document.createElement('option');
  if (v.clienteNombre) {
    optCliente.value = v.cliente_id;
    optCliente.textContent = v.clienteNombre;
    optCliente.selected = true;
    clienteSel.appendChild(optCliente);
  }
 
  // Método de pago
  document.getElementById('corr-metodo').value = v.metodo_pago || '';
 
  // Recibido (solo efectivo)
  document.getElementById('corr-recibido').value = v.recibido || '';
  actualizarEfectivoCorreccion();
 
  // Descuento select
  const descSel = document.getElementById('corr-descuento');
  descSel.innerHTML = '<option value="">— Sin descuento —</option>';
  descuentosCache.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.tipo === 'porcentaje' ? `${d.nombre} (−${d.valor}%)` : `${d.nombre} (−${fmt(d.valor)})`;
    if (d.id === v.descuento_id) opt.selected = true;
    descSel.appendChild(opt);
  });
 
  renderItemsCorreccion();
}
 
function renderItemsCorreccion() {
  const cont = document.getElementById('corr-items');
  cont.innerHTML = itemsCorreccion.map((item, i) => `
    <div class="corr-item">
      <span class="corr-item-nombre">${item.nombre}</span>
      <div class="corr-item-controles">
        <label style="font-size:.8rem">Precio</label>
        <input type="number" min="0" value="${item.precio}"
          onchange="itemsCorreccion[${i}].precio = Number(this.value); recalcularCorreccion()">
        <label style="font-size:.8rem">Cantidad</label>
        <input type="number" min="1" value="${item.cantidad}"
          onchange="itemsCorreccion[${i}].cantidad = Number(this.value); recalcularCorreccion()">
        <button class="btn btn-danger btn-sm" onclick="eliminarItemCorreccion(${i})">✕</button>
      </div>
    </div>
  `).join('');
  recalcularCorreccion();
}
 
function eliminarItemCorreccion(i) {
  itemsCorreccion.splice(i, 1);
  renderItemsCorreccion();
}
 
// Agregar producto a la corrección
function agregarProductoCorreccion() {
  const sel = document.getElementById('corr-producto-nuevo');
  const id  = Number(sel.value);
  if (!id) return;
  const prod = productosCache.find(p => Number(p.id) === id);
  if (!prod) return;
 
  const yaExiste = itemsCorreccion.findIndex(i => Number(i.producto_id) === id);
  if (yaExiste >= 0) {
    itemsCorreccion[yaExiste].cantidad += 1;
  } else {
    itemsCorreccion.push({
      producto_id: prod.id,
      nombre:      prod.nombre,
      precio:      prod.precio,
      cantidad:    1
    });
  }
  sel.value = '';
  renderItemsCorreccion();
}
 
// Poblar select de productos para agregar
function poblarSelectProductos() {
  const sel = document.getElementById('corr-producto-nuevo');
  sel.innerHTML = '<option value="">— Agregar producto —</option>';
  productosCache.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.nombre} (stock: ${p.stock})`;
    sel.appendChild(opt);
  });
}
 
function actualizarEfectivoCorreccion() {
  const metodo   = document.getElementById('corr-metodo').value;
  const boxEfect = document.getElementById('corr-efectivo-box');
  boxEfect.style.display = metodo === 'Efectivo' ? 'block' : 'none';
  recalcularCorreccion();
}
 
function recalcularCorreccion() {
  const subtotal    = itemsCorreccion.reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0);
  const descId      = Number(document.getElementById('corr-descuento').value);
  const desc        = descuentosCache.find(d => d.id === descId);
  const descValor   = desc
    ? (desc.tipo === 'porcentaje' ? subtotal * (desc.valor / 100) : Number(desc.valor))
    : 0;
  const total       = Math.max(0, subtotal - descValor);
  const metodo      = document.getElementById('corr-metodo').value;
  const recibido    = metodo === 'Efectivo' ? Number(document.getElementById('corr-recibido').value) || 0 : 0;
  const cambio      = metodo === 'Efectivo' ? Math.max(0, recibido - total) : 0;
 
  document.getElementById('corr-resumen').innerHTML = `
    <div class="resumen-linea">Subtotal: <strong>${fmt(subtotal)}</strong></div>
    ${descValor > 0 ? `<div class="resumen-linea" style="color:#c62828">Descuento: <strong>−${fmt(descValor)}</strong></div>` : ''}
    <div class="resumen-linea" style="font-weight:800;font-size:1.1rem">Total: <strong>${fmt(total)}</strong></div>
    ${metodo === 'Efectivo' ? `<div class="resumen-linea">Cambio: <strong>${fmt(cambio)}</strong></div>` : ''}
  `;
}
 
async function guardarCorreccion() {
  if (!itemsCorreccion.length) {
    mostrarMensaje('La venta debe tener al menos un producto.', 'error'); return;
  }
  const metodo = document.getElementById('corr-metodo').value;
  if (!metodo) { mostrarMensaje('Selecciona un método de pago.', 'error'); return; }
 
  const descId    = Number(document.getElementById('corr-descuento').value) || null;
  const clienteId = document.getElementById('corr-cliente').value || null;
  const recibido  = metodo === 'Efectivo'
    ? Number(document.getElementById('corr-recibido').value) || 0
    : 0;
 
  const subtotal  = itemsCorreccion.reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0);
  const desc      = descuentosCache.find(d => d.id === descId);
  const descValor = desc
    ? (desc.tipo === 'porcentaje' ? subtotal * (desc.valor / 100) : Number(desc.valor))
    : 0;
  const total     = Math.max(0, subtotal - descValor);
 
  if (metodo === 'Efectivo' && recibido < total) {
    mostrarMensaje('El valor recibido es insuficiente.', 'error'); return;
  }
 
  if (!(await confirmar(`¿Guardar corrección de venta #${ventaCorrigiendo.id}?\nEsto modificará el inventario y los totales.`))) return;
 
  mostrarMensaje('Guardando corrección...', 'info');
  try {
    const res = await apiPut('ventas', `${ventaCorrigiendo.id}/corregir`, {
      cliente_id:   clienteId,
      metodo_pago:  metodo,
      descuento_id: descId,
      recibido,
      items: itemsCorreccion.map(i => ({
        producto_id: i.producto_id || i.id || null,
        nombre:      i.nombre,
        precio:      Number(i.precio),
        cantidad:    Number(i.cantidad)
      }))
    });
    if (!res.success) throw new Error(res.message);
    mostrarMensaje('¡Venta corregida correctamente! ✓');
    cerrarModalCorreccion();
    cargarHistorial();
  } catch (err) {
    mostrarMensaje('Error: ' + err.message, 'error');
  }
}
 
function cerrarModalCorreccion() {
  document.getElementById('modal-correccion').classList.add('oculto');
  ventaCorrigiendo = null;
  itemsCorreccion  = [];
}
 
// Exponer funciones al scope global
window.abrirCorreccion          = abrirCorreccion;
window.cerrarModalCorreccion    = cerrarModalCorreccion;
window.guardarCorreccion        = guardarCorreccion;
window.eliminarItemCorreccion   = eliminarItemCorreccion;
window.agregarProductoCorreccion= agregarProductoCorreccion;
window.actualizarEfectivoCorreccion = actualizarEfectivoCorreccion;
window.recalcularCorreccion     = recalcularCorreccion;
window.itemsCorreccion          = itemsCorreccion;
 
// ── Init ─────────────────────────────────────────────────────
cargarHistorial();