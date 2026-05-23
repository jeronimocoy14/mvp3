// ============================================================
// auth.js — Módulo de autenticación del frontend
// Incluir ANTES que cualquier otro script en todas las páginas
// ============================================================

const BACKEND_URL  = 'https://mvp3-ktgx.onrender.com';   // ← cambiar por tu URL de Render en producción
const TOKEN_KEY    = 'pl_token';
const USUARIO_KEY  = 'pl_usuario';

const Auth = (() => {

  // ── Guardar sesión ──────────────────────────────────────────
  function guardarSesion(token, usuario) {
    localStorage.setItem(TOKEN_KEY,    token);
    localStorage.setItem(USUARIO_KEY,  JSON.stringify(usuario));
  }

  // ── Obtener token ───────────────────────────────────────────
  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  }

  // ── Obtener usuario actual ──────────────────────────────────
  function getUsuario() {
    try { return JSON.parse(localStorage.getItem(USUARIO_KEY)); }
    catch { return null; }
  }

  // ── Está logueado ───────────────────────────────────────────
  function estaLogueado() {
    return !!getToken() && !!getUsuario();
  }

  // ── Es admin ────────────────────────────────────────────────
  function esAdmin() {
    const u = getUsuario();
    return u?.rol === 'admin';
  }

  // ── Login ───────────────────────────────────────────────────
  async function login(usuario, password) {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ usuario, password })
      });
      const data = await resp.json();
      if (data.success && data.token) {
        guardarSesion(data.token, data.usuario);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error de red en login:', err);
      return false;
    }
  }

  // ── Logout ──────────────────────────────────────────────────
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    window.location.replace('login.html');
  }

  // ── fetch autenticado ────────────────────────────────────────
  // Úsalo en lugar de fetch() para llamadas al backend
  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    const resp = await fetch(`${BACKEND_URL}${path}`, { ...options, headers });

    // Si el token expiró, redirigir al login
    if (resp.status === 401) {
      logout();
      return null;
    }
    return resp.json();
  }

  // ── Guard: requiere login ────────────────────────────────────
  // Llamar al inicio de cada página protegida
  function requireLogin() {
    if (!estaLogueado()) {
      window.location.replace('login.html');
      return false;
    }
    return true;
  }

  // ── Guard: requiere admin ────────────────────────────────────
  function requireAdmin() {
    if (!requireLogin()) return false;
    if (!esAdmin()) {
      alert('Acceso denegado. Solo los administradores pueden acceder a esta sección.');
      history.back();
      return false;
    }
    return true;
  }

  // ── Renderizar info del usuario en el header ─────────────────
  function renderUserBadge() {
    const usuario = getUsuario();
    if (!usuario) return;

    const badge = document.getElementById('user-badge');
    if (badge) {
      badge.innerHTML = `
        <span class="user-nombre">${usuario.nombre}</span>
        <span class="user-rol badge-rol-${usuario.rol}">${usuario.rol}</span>
        <button class="btn-logout" onclick="Auth.logout()">Salir</button>`;
    }

    // Ocultar elementos marcados como solo-admin si el usuario es cajero
    if (!esAdmin()) {
      document.querySelectorAll('[data-solo-admin]').forEach(el => {
        el.style.display = 'none';
      });
    }
  }

  return {
    login, logout, estaLogueado, esAdmin,
    getToken, getUsuario, apiFetch,
    requireLogin, requireAdmin, renderUserBadge
  };
})();

// Auto-renderizar badge cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => Auth.renderUserBadge());
