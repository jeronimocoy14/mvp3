// ============================================================
// factura.js — Visualizar recibo de una venta
// BUG CORREGIDO: antes leía de localStorage("ventas") que nunca
// se llenaba. Ahora lee de la API usando el id en la URL.
// ============================================================

const idVenta = new URLSearchParams(location.search).get("id");

function parseItems(items) {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try { return JSON.parse(items) || []; } catch {
      try { return JSON.parse(items.replace(/'/g, '"')) || []; } catch { return []; }
    }
  }
  return [];
}

function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const text = value.trim();
  if (!text || /[A-Za-z]/.test(text)) return 0;
  let cleaned = text.replace(/[^0-9.,-]/g, '');
  if (!cleaned) return 0;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? cleaned.replace(/\./g, '').replace(/,/g, '.')
      : cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/,/g, '.');
  }
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

function mostrarFactura(venta) {
  const metodo    = venta.metodoPago || venta.motododepago || venta.metodo || "";
  const recibido  = parseNumber(venta.recibido ?? venta.Recibido ?? 0);
  const cambio    = parseNumber(venta.cambio ?? venta.Cambio ?? 0);
  const items     = parseItems(venta.items || venta.Items);
  const clienteNombre = venta.clienteNombre || venta.cliente || '';

  let html = `
    <p><strong>Venta:</strong> ${venta.id}</p>
    <p><strong>Fecha:</strong> ${venta.fecha}</p>
    ${clienteNombre ? `<p><strong>Cliente:</strong> ${clienteNombre}</p>` : ''}
    <p><strong>Método:</strong> ${metodo}</p>
    <ul>
  `;

  items.forEach(i => {
    const precio   = parseNumber(i.precio || i.Precio || 0);
    const cantidad = i.cantidad || i.Cantidad || i.cant || 0;
    html += `<li>${i.nombre || i.Nombre || i.producto || 'Producto'} x${cantidad} — ${precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</li>`;
  });

  html += `</ul><h2>Total: ${parseNumber(venta.total).toLocaleString("es-CO", { style: "currency", currency: "COP" })}</h2>`;

  if (String(metodo).toLowerCase().includes('efectivo')) {
    html += `<p><strong>Recibido:</strong> ${recibido.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</p>`;
    html += `<p><strong>Cambio:</strong> ${cambio.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</p>`;
  }

  document.getElementById("factura").innerHTML = html;
}

async function cargarVenta() {
  if (!idVenta) {
    document.getElementById("factura").innerHTML = '<p>No se especificó un ID de venta. <a href="historial.html">Ir al historial</a></p>';
    return;
  }

  try {
    const respuesta = await fetch(`${API_URL}?resource=ventas`);
    const resultado = await respuesta.json();

    if (!resultado.success) throw new Error("Respuesta sin éxito");

    const venta = resultado.data.find(v => String(v.id) === String(idVenta));
    if (!venta) {
      document.getElementById("factura").innerHTML = '<p>No se encontró la venta. <a href="historial.html">Ir al historial</a></p>';
      return;
    }
    mostrarFactura(venta);
  } catch (error) {
    console.error("Error cargando factura:", error);
    document.getElementById("factura").innerHTML = '<p>Error al cargar la venta. <a href="historial.html">Ir al historial</a></p>';
  }
}

// La factura necesita la API_URL de data.js, así que esperamos a que cargue
if (typeof API_URL !== 'undefined') {
  cargarVenta();
} else {
  window.addEventListener('DOMContentLoaded', cargarVenta);
}
