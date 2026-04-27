// ============================================================
// GOOGLE AUTH — flujo GIS (popup)
// El tokenClient.requestAccessToken() de GIS funciona en GitHub Pages
// a pesar del header COOP:same-origin porque Google gestiona la
// comunicación internamente, sin depender de window.opener.
// ============================================================
const TOKEN_STORAGE_KEY = 'gestionlab_token';
const USER_STORAGE_KEY  = 'gestionlab_user';

let tokenClient = null;

// ── Sesión persistente en localStorage ──────────────────────

function saveSession(token, user) {
  try {
    const expires = Date.now() + 55 * 60 * 1000; // 55 min (token Google dura 60)
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token, expires }));
    localStorage.setItem(USER_STORAGE_KEY,  JSON.stringify(user));
  } catch(e) {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const { token, expires } = JSON.parse(raw);
    if (Date.now() > expires) { clearSession(); return null; }
    return token;
  } catch(e) { return null; }
}

function loadSavedUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function clearSession() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch(e) {}
}

// ── Carga dinámica del script GIS ────────────────────────────

function _loadGIS() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = resolve;
    s.onerror = () => { console.error('No se pudo cargar GIS'); resolve(); };
    document.head.appendChild(s);
  });
}

// ── initAuth ─────────────────────────────────────────────────

async function initAuth() {
  await _loadGIS();

  if (!window.google?.accounts?.oauth2) {
    showToast('Error al cargar la autenticación de Google. Recarga la página.', 'error');
    _mostrarPantallaLogin();
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope:     SCOPES,
    callback:  _onTokenReceived
  });

  // ¿Sesión guardada válida?
  const savedToken = loadSession();
  const savedUser  = loadSavedUser();
  if (savedToken && savedUser) {
    accessToken = savedToken;
    currentUser = savedUser;
    try {
      await loadAllData();
      showApp();
      return;
    } catch(e) {
      // Si el token ha expirado (401) o hay error de red, limpiamos y pedimos login
      clearSession();
      accessToken = null;
      currentUser = null;
      // El toast ya fue mostrado por authFetch si fue un 401
    }
  }

  _mostrarPantallaLogin();
}

// ── Callback tras login exitoso con Google ────────────────────

async function _onTokenReceived(response) {
  if (response.error) {
    console.error('Error OAuth:', response);
    // access_denied es cuando el usuario cierra el popup, no es un error real
    if (response.error !== 'access_denied') {
      showToast('Error al iniciar sesión: ' + (response.error_description || response.error), 'error');
    }
    _mostrarPantallaLogin();
    return;
  }
  accessToken = response.access_token;
  try {
    await getUserInfo();
    saveSession(accessToken, currentUser);
    await loadAllData();
    showApp();
  } catch(e) {
    console.error('Error tras login:', e);
    showToast('Error cargando datos. Inténtalo de nuevo.', 'error');
    clearSession();
    accessToken = null;
    currentUser = null;
    _mostrarPantallaLogin();
  }
}

// ── signIn ───────────────────────────────────────────────────

function signIn() {
  if (!tokenClient) {
    initAuth();
    return;
  }
  tokenClient.requestAccessToken({ prompt: 'select_account' });
}

// ── signOut ──────────────────────────────────────────────────

function signOut() {
  const tok = accessToken;
  clearSession();
  accessToken = null;
  currentUser = null;
  if (tok) { try { google.accounts.oauth2.revoke(tok, () => {}); } catch(e) {} }
  _mostrarPantallaLogin();
}

// ── getUserInfo ──────────────────────────────────────────────

async function getUserInfo() {
  const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) throw new Error('No se pudo obtener información del usuario');
  currentUser = await r.json();
}

// ── Helpers ──────────────────────────────────────────────────

function _mostrarPantallaLogin() {
  const app  = document.getElementById('app');
  const auth = document.getElementById('auth-screen');
  if (app)  app.style.display  = 'none';
  if (auth) auth.style.display = 'flex';
}

// scheduleTokenRenewal es llamado desde showApp() en ui.js.
// Con GIS no necesitamos timers: authFetch detecta el 401
// automáticamente cuando el token expira de verdad.
function scheduleTokenRenewal() { /* no-op con flujo GIS */ }

// Stub de compatibilidad
function renewTokenPromise() {
  return Promise.reject(new Error('Usar signIn() para renovar'));
}
