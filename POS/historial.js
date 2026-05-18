// ============================================================
// historial.js — Historial de ventas (historial.html)
// Carga todas las ventas desde la API de Google Sheets
// ============================================================

const btnVolver = document.getElementById('volver');
if (btnVolver) btnVolver.onclick = () => { window.location.href = 'PapelLuna.html'; };

function parseItems(items) {
  if (Array.isArray(items)) return items;
  try { const p = JSON.parse(items); return Array.isArray(p) ? p : []; }
  catch { return []; }
}

function renderVentas(ventas) {
  const contenedor = document.getElementById('ventas');
  if (!contenedor) return;

  if (!ventas.length) {
    contenedor.innerHTML = '<p>No hay ventas registradas aún.</p>';
    return;
  }

  contenedor.innerHTML = ventas.map(v => {
    const items  = parseItems(v.items || []);
    const total  = Number(v.total   || 0);
    const recibido = Number(v.recibido || 0);
    const cambio   = Number(v.cambio   || 0);
    const metodo   = String(v.motododepago || v.metododepago || v.metodopago || v.metodo || v['método de pago'] || v.payment_method || '—');
    const esEfectivo = metodo.toLowerCase().includes('efectivo');

    const itemsHtml = items.map(i =>
      `<li>${i.nombre || i.producto || 'Producto'} — ${Number(i.cantidad || 0)} × ${Number(i.precio || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</li>`
    ).join('');

    return `
      <div class="venta-card">
        <div class="venta-header">
          <strong>${v.id || 'Venta'}</strong>
          <span>${v.fecha || '—'}</span>
        </div>
        ${v.clienteNombre ? `<p>Cliente: <strong>${v.clienteNombre}</strong></p>` : ''}
        <p>Método: <strong>${metodo}</strong></p>
        <p>Total: <strong>${total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong></p>
        ${esEfectivo ? `
          <p>Recibido: <strong>${recibido.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong></p>
          <p>Cambio:   <strong>${cambio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong></p>` : ''}
        <details>
          <summary>Ver productos</summary>
          <ul>${itemsHtml || '<li>Sin detalle</li>'}</ul>
        </details>
      </div>`;
  }).join('');
}

async function cargarHistorial() {
  const contenedor = document.getElementById('ventas');
  if (contenedor) contenedor.innerHTML = '<p>Cargando historial...</p>';

  try {
    const res = await apiGet('ventas');
    if (!res.success) throw new Error(res.message || 'Error en la API');
    // Log para ver los keys exactos que devuelve la API
    if (res.data?.length) console.log('Keys de venta:', Object.keys(res.data[0]));
    renderVentas(res.data || []);
  } catch (err) {
    console.error('Error cargando historial:', err);
    mostrarMensaje('No se pudo cargar el historial de ventas.', 'error');
    if (contenedor) contenedor.innerHTML = '<p>Error al cargar el historial.</p>';
  }
}

cargarHistorial();
