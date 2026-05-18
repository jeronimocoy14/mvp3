// ============================================================
// entidades.js — CRUD de Categorías, Proveedores y Clientes
// Usa la API de Google Sheets para todas las operaciones
// ============================================================

// ── Config de secciones ──────────────────────────────────────
// resource: nombre del resource para la API
// fields: { id en el HTML, clave en el objeto de datos }
const SECCIONES = {
  categorias: {
    resource: 'categorias',
    nombre:   'Categoría',
    fields: [
      { inputId: 'categoria-nombre',      key: 'nombre' },
      { inputId: 'categoria-descripcion', key: 'descripcion' }
    ],
    hiddenId:     'categoria-id',
    listId:       'categorias-list',
    buscarId:     'categoria-buscar',
    guardarBtnId: 'categoria-guardar',
    limpiarBtnId: 'categoria-limpiar'
  },
  proveedores: {
    resource: 'proveedores',
    nombre:   'Proveedor',
    fields: [
      { inputId: 'proveedor-nombre',    key: 'nombre' },
      { inputId: 'proveedor-contacto',  key: 'contacto' },
      { inputId: 'proveedor-telefono',  key: 'telefono' }
    ],
    hiddenId:     'proveedor-id',
    listId:       'proveedores-list',
    buscarId:     'proveedor-buscar',
    guardarBtnId: 'proveedor-guardar',
    limpiarBtnId: 'proveedor-limpiar'
  },
  clientes: {
    resource: 'clientes',
    nombre:   'Cliente',
    fields: [
      { inputId: 'cliente-nombre',     key: 'nombre' },
      { inputId: 'cliente-documento',  key: 'documento' },
      { inputId: 'cliente-correo',     key: 'correo' },
      { inputId: 'cliente-telefono',   key: 'telefono' }
    ],
    hiddenId:     'cliente-id',
    listId:       'clientes-list',
    buscarId:     'cliente-buscar',
    guardarBtnId: 'cliente-guardar',
    limpiarBtnId: 'cliente-limpiar'
  }
};

// Cache local de cada sección
const cache = { categorias: [], proveedores: [], clientes: [] };

// ── Mostrar mensaje ──────────────────────────────────────────
function mostrarMensajeEnt(texto, tipo = 'success') {
  const el = document.getElementById('mensaje');
  if (!el) { console.log(texto); return; }
  el.textContent = texto;
  el.className   = `mensaje ${tipo} mostrar`;
  setTimeout(() => el.classList.remove('mostrar'), 3500);
}

// ── Cargar datos desde la API ────────────────────────────────
async function cargarSeccion(sec) {
  const cfg = SECCIONES[sec];
  const listEl = document.getElementById(cfg.listId);
  if (listEl) listEl.innerHTML = '<p>Cargando...</p>';

  try {
    const res = await apiGet(cfg.resource);
    if (!res.success || !Array.isArray(res.data)) throw new Error(res.message || 'Sin datos');
    cache[sec] = res.data.map(item => {
      const obj = { id: String(item.id ?? item.ID ?? '') };
      cfg.fields.forEach(f => { obj[f.key] = item[f.key] ?? ''; });
      return obj;
    });
    renderizarSeccion(sec);
  } catch (err) {
    console.error(`Error cargando ${sec}:`, err);
    if (listEl) listEl.innerHTML = `<p>No se pudo cargar ${cfg.nombre.toLowerCase()}s.</p>`;
  }
}

// ── Render de la lista ───────────────────────────────────────
function renderizarSeccion(sec, filtro = '') {
  const cfg    = SECCIONES[sec];
  const listEl = document.getElementById(cfg.listId);
  if (!listEl) return;

  const datos  = filtro
    ? cache[sec].filter(i => Object.values(i).join(' ').toLowerCase().includes(filtro.toLowerCase()))
    : cache[sec];

  if (!datos.length) {
    listEl.innerHTML = `<p>No hay ${cfg.nombre.toLowerCase()}s registrados.</p>`;
    return;
  }

  listEl.innerHTML = datos.map(item => {
    const detalles = cfg.fields
      .filter(f => f.key !== 'nombre')
      .map(f => item[f.key] ? `<p><strong>${f.key}:</strong> ${item[f.key]}</p>` : '')
      .join('');

    return `
      <div class="entity-card">
        <h4>${item.nombre || '—'}</h4>
        ${detalles}
        <div class="entity-actions">
          <button class="btn btn-secondary" onclick="editarEntidad('${sec}','${item.id}')">Editar</button>
          <button class="btn btn-danger"    onclick="eliminarEntidad('${sec}','${item.id}')">Eliminar</button>
        </div>
      </div>`;
  }).join('');
}

// ── Recolectar datos del formulario ─────────────────────────
function recolectarFormulario(sec) {
  const cfg = SECCIONES[sec];
  const idEl = document.getElementById(cfg.hiddenId);
  const obj  = { id: idEl?.value || String(Date.now()) };
  cfg.fields.forEach(f => {
    const el = document.getElementById(f.inputId);
    obj[f.key] = el ? el.value.trim() : '';
  });
  if (!obj.nombre) {
    mostrarMensajeEnt(`El nombre de la ${cfg.nombre.toLowerCase()} es obligatorio.`, 'error');
    return null;
  }
  return obj;
}

// ── Limpiar formulario ───────────────────────────────────────
function limpiarFormulario(sec) {
  const cfg = SECCIONES[sec];
  cfg.fields.forEach(f => {
    const el = document.getElementById(f.inputId);
    if (el) el.value = '';
  });
  const idEl = document.getElementById(cfg.hiddenId);
  if (idEl) idEl.value = '';
}

// ── Guardar (crear o actualizar) via API ─────────────────────
async function guardarEntidad(sec) {
  const cfg     = SECCIONES[sec];
  const entidad = recolectarFormulario(sec);
  if (!entidad) return;

  mostrarMensajeEnt('Guardando...', 'info');
  try {
    const idEl2 = document.getElementById(cfg.hiddenId);
    const esEdicion = idEl2?.value && String(idEl2.value).length > 0;
    let res;
    if (esEdicion) {
      res = await apiPut(cfg.resource, entidad.id, entidad);
    } else {
      res = await apiPost(cfg.resource, entidad);
    }
    if (!res.success) throw new Error(res.message);
    mostrarMensajeEnt(`${cfg.nombre} guardada correctamente ✓`);
    limpiarFormulario(sec);
    // Pequeña espera para que Apps Script procese antes de releer
    await cargarSeccion(sec);
  } catch (err) {
    console.error(`Error guardando ${sec}:`, err);
    mostrarMensajeEnt(`Error al guardar ${cfg.nombre.toLowerCase()}.`, 'error');
  }
}

// ── Cargar en formulario para edición ────────────────────────
function editarEntidad(sec, id) {
  const cfg  = SECCIONES[sec];
  const item = cache[sec].find(i => String(i.id) === String(id));
  if (!item) return;
  cfg.fields.forEach(f => {
    const el = document.getElementById(f.inputId);
    if (el) el.value = item[f.key] || '';
  });
  const idEl = document.getElementById(cfg.hiddenId);
  if (idEl) idEl.value = item.id;
  document.getElementById(cfg.fields[0].inputId)?.focus();
}

// ── Eliminar via API ─────────────────────────────────────────
async function eliminarEntidad(sec, id) {
  const cfg  = SECCIONES[sec];
  if (!confirm(`¿Eliminar esta ${cfg.nombre.toLowerCase()}?`)) return;

  mostrarMensajeEnt('Eliminando...', 'info');
  try {
    const res2 = await apiDelete(cfg.resource, id);
    if (!res2.success) throw new Error(res2.message);
    mostrarMensajeEnt(`${cfg.nombre} eliminada ✓`);
    await cargarSeccion(sec);
  } catch (err) {
    console.error(`Error eliminando ${sec}:`, err);
    mostrarMensajeEnt(`Error al eliminar ${cfg.nombre.toLowerCase()}.`, 'error');
  }
}

// ── Tabs ─────────────────────────────────────────────────────
function inicializarTabs() {
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel)?.classList.add('active');
    });
  });
}

// ── Buscadores ───────────────────────────────────────────────
function inicializarBuscadores() {
  Object.keys(SECCIONES).forEach(sec => {
    const cfg   = SECCIONES[sec];
    const busEl = document.getElementById(cfg.buscarId);
    if (busEl) busEl.addEventListener('input', () => renderizarSeccion(sec, busEl.value));
  });
}

// ── Botones guardar/limpiar ───────────────────────────────────
function inicializarBotones() {
  Object.keys(SECCIONES).forEach(sec => {
    const cfg = SECCIONES[sec];
    document.getElementById(cfg.guardarBtnId)?.addEventListener('click', () => guardarEntidad(sec));
    document.getElementById(cfg.limpiarBtnId)?.addEventListener('click', () => limpiarFormulario(sec));
  });
}

// ── Exponer al scope global ──────────────────────────────────
window.editarEntidad   = editarEntidad;
window.eliminarEntidad = eliminarEntidad;

// ── Init ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  inicializarTabs();
  inicializarBuscadores();
  inicializarBotones();
  // Cargar las 3 secciones desde la API
  await Promise.all([
    cargarSeccion('categorias'),
    cargarSeccion('proveedores'),
    cargarSeccion('clientes')
  ]);
});
