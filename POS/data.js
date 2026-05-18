let productos = [];
let carrito   = [];

// Claves localStorage
const CART_SESSION_KEY    = 'papel_luna_sesion';
const CART_PREFIX         = 'papel_luna_cart_';
const VENTAS_ABIERTAS_KEY = 'papel_luna_ventas_abiertas';

// ── GET autenticado ──────────────────────────────────────────
async function apiGet(resource) {
  const token = localStorage.getItem('pl_token');
  const resp  = await fetch(`${BACKEND_URL}/api/${resource}`, {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
  if (resp.status === 401) { localStorage.removeItem('pl_token'); localStorage.removeItem('pl_usuario'); window.location.replace('login.html'); return null; }
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// ── POST autenticado ─────────────────────────────────────────
async function apiPost(resource, body) {
  const token = localStorage.getItem('pl_token');
  const resp  = await fetch(`${BACKEND_URL}/api/${resource}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(body)
  });
  if (resp.status === 401) { localStorage.removeItem('pl_token'); localStorage.removeItem('pl_usuario'); window.location.replace('login.html'); return null; }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

// ── PUT autenticado ──────────────────────────────────────────
async function apiPut(resource, idOrBody, body) {
  // Soporta apiPut('categorias', id, body) y apiPut('categorias/id', body)
  let url, payload;
  if (body !== undefined) {
    url     = `${BACKEND_URL}/api/${resource}/${idOrBody}`;
    payload = body;
  } else {
    url     = `${BACKEND_URL}/api/${resource}`;
    payload = idOrBody;
  }
  const token = localStorage.getItem('pl_token');
  const resp  = await fetch(url, {
    method:  'PUT',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(payload)
  });
  if (resp.status === 401) { localStorage.removeItem('pl_token'); localStorage.removeItem('pl_usuario'); window.location.replace('login.html'); return null; }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

// ── DELETE autenticado ───────────────────────────────────────
async function apiDelete(resource, id) {
  // Soporta apiDelete('categorias', id) y apiDelete('categorias/id')
  const url   = id !== undefined ? `${BACKEND_URL}/api/${resource}/${id}` : `${BACKEND_URL}/api/${resource}`;
  const token = localStorage.getItem('pl_token');
  const resp  = await fetch(url, {
    method:  'DELETE',
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  if (resp.status === 401) { localStorage.removeItem('pl_token'); localStorage.removeItem('pl_usuario'); window.location.replace('login.html'); return null; }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

// ── PATCH autenticado ────────────────────────────────────────
async function apiPatch(resource, body) {
  const token = localStorage.getItem('pl_token');
  const resp  = await fetch(`${BACKEND_URL}/api/${resource}`, {
    method:  'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(body)
  });
  if (resp.status === 401) { localStorage.removeItem('pl_token'); localStorage.removeItem('pl_usuario'); window.location.replace('login.html'); return null; }
  return resp.json();
}

// ── LocalStorage helpers ─────────────────────────────────────
function lsGet(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Carrito por sesión ───────────────────────────────────────
function getCartKey(sesion)            { return `${CART_PREFIX}${sesion}`; }
function cargarCarritoLocal(s)         { return lsGet(getCartKey(s), []); }
function guardarCarritoLocal(s, items) { lsSet(getCartKey(s), items); }
function limpiarCarritoLocal(s)        { localStorage.removeItem(getCartKey(s)); }

// ── Ventas abiertas ──────────────────────────────────────────
function cargarVentasAbiertas() { return lsGet(VENTAS_ABIERTAS_KEY, []); }

function guardarVentaAbiertaMeta(sesion, meta) {
  const lista = cargarVentasAbiertas();
  const idx   = lista.findIndex(v => String(v.id) === String(sesion));
  const reg   = {
    id:            sesion,
    fecha:         meta.fecha         || new Date().toLocaleString('es-CO'),
    total:         Number(meta.total) || 0,
    items:         meta.items         || [],
    clienteId:     meta.clienteId     || '',
    clienteNombre: meta.clienteNombre || 'Sin cliente',
    actualizado:   new Date().toISOString()
  };
  if (idx >= 0) lista[idx] = reg; else lista.push(reg);
  lsSet(VENTAS_ABIERTAS_KEY, lista);
}

function borrarVentaAbierta(sesion) {
  lsSet(VENTAS_ABIERTAS_KEY,
    cargarVentasAbiertas().filter(v => String(v.id) !== String(sesion)));
}

// ── UI helpers ───────────────────────────────────────────────
function actualizarContadorCarrito() {
  const el = document.getElementById('contador-carrito');
  if (el) el.textContent = carrito.reduce((s, i) => s + (Number(i.cantidad) || 0), 0);
}

function mostrarMensaje(texto, tipo = 'success') {
  const el = document.getElementById('mensaje');
  if (!el) return;
  el.textContent = texto;
  el.className   = `mensaje ${tipo} mostrar`;
  setTimeout(() => el.classList.remove('mostrar'), 3500);
}

// ── Modal de confirmación (reemplaza confirm() nativo) ────────
// Uso: confirmar('¿Seguro?').then(ok => { if(ok) ... })
// O con await: if (await confirmar('¿Seguro?')) { ... }
function confirmar(mensaje) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-overlay');
    const texto   = document.getElementById('confirm-texto');
    const btnSi   = document.getElementById('confirm-si');
    const btnNo   = document.getElementById('confirm-no');

    if (!overlay) { resolve(window.confirm(mensaje)); return; }

    texto.textContent = mensaje;
    overlay.classList.remove('oculto');

    function cerrar(val) {
      overlay.classList.add('oculto');
      btnSi.removeEventListener('click', onSi);
      btnNo.removeEventListener('click', onNo);
      resolve(val);
    }
    const onSi = () => cerrar(true);
    const onNo = () => cerrar(false);
    btnSi.addEventListener('click', onSi);
    btnNo.addEventListener('click', onNo);
  });
}

// ── Modal global (reemplaza confirm() y prompt() nativos) ─────
// Inyecta el overlay en el body si no existe
function _getModalGlobal() {
  let el = document.getElementById('_modal-global');
  if (!el) {
    el = document.createElement('div');
    el.id = '_modal-global';
    el.style.cssText = `
      position:fixed;inset:0;background:rgba(16,24,40,.5);
      display:flex;align-items:center;justify-content:center;z-index:99999;`;
    el.innerHTML = `
      <div style="background:#fff;border-radius:24px;padding:28px;width:min(92vw,400px);
                  box-shadow:0 28px 50px rgba(16,24,40,.18);">
        <p id="_modal-msg" style="margin:0 0 20px;font-size:1rem;color:#111;font-weight:600;
                                   font-family:inherit;line-height:1.5;"></p>
        <input id="_modal-inp" type="text" style="display:none;width:100%;padding:12px 14px;
               border:1px solid #d1d5db;border-radius:14px;margin-bottom:18px;
               font-size:.95rem;font-family:inherit;box-sizing:border-box;">
        <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
          <button id="_modal-cancel" style="padding:11px 20px;border-radius:14px;border:none;
                  background:#f3f4f6;color:#111;font-weight:700;cursor:pointer;font-family:inherit;">
            Cancelar</button>
          <button id="_modal-ok" style="padding:11px 20px;border-radius:14px;border:none;
                  background:linear-gradient(135deg,#5c56ff,#3c8cff);color:#fff;
                  font-weight:700;cursor:pointer;font-family:inherit;">
            Aceptar</button>
        </div>
      </div>`;
    document.body.appendChild(el);
  }
  return el;
}

function confirmar(mensaje) {
  return new Promise(resolve => {
    const overlay = _getModalGlobal();
    document.getElementById('_modal-msg').textContent = mensaje;
    const inp = document.getElementById('_modal-inp');
    inp.style.display = 'none'; inp.value = '';
    overlay.style.display = 'flex';

    const ok     = document.getElementById('_modal-ok');
    const cancel = document.getElementById('_modal-cancel');
    ok.textContent     = 'Aceptar';
    cancel.textContent = 'Cancelar';

    const cleanup = () => { overlay.style.display = 'none'; ok.onclick = null; cancel.onclick = null; };
    ok.onclick     = () => { cleanup(); resolve(true);  };
    cancel.onclick = () => { cleanup(); resolve(false); };
  });
}

function pedirValor(mensaje, valorPorDefecto = '') {
  return new Promise(resolve => {
    const overlay = _getModalGlobal();
    document.getElementById('_modal-msg').textContent = mensaje;
    const inp = document.getElementById('_modal-inp');
    inp.style.display = 'block'; inp.value = valorPorDefecto;
    overlay.style.display = 'flex';
    setTimeout(() => inp.focus(), 50);

    const ok     = document.getElementById('_modal-ok');
    const cancel = document.getElementById('_modal-cancel');
    ok.textContent     = 'Aceptar';
    cancel.textContent = 'Cancelar';

    const cleanup = () => { overlay.style.display = 'none'; ok.onclick = null; cancel.onclick = null; inp.onkeydown = null; };
    ok.onclick       = () => { cleanup(); resolve(inp.value); };
    cancel.onclick   = () => { cleanup(); resolve(null); };
    inp.onkeydown    = e => { if (e.key === 'Enter') ok.click(); if (e.key === 'Escape') cancel.click(); };
  });
}

