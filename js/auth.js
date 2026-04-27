// ============================================================
// GOOGLE AUTH — flujo redirect (no popup)
// Razón: GitHub Pages envía Cross-Origin-Opener-Policy: same-origin,
// lo que impide que el popup de Google devuelva el token vía postMessage.
// Con redirect el token llega en el hash de la URL — sin popups,
// sin COOP, funciona en escritorio y móvil.
// ============================================================
const TOKEN_STORAGE_KEY = 'gestionlab_token';
const USER_STORAGE_KEY  = 'gestionlab_user';

// ── Sesión persistente en localStorage ──────────────────────

function saveSession(token, user) {
  try {
    const expires = Date.now() + 55 * 60 * 1000;
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

// ── Redirect URI de retorno ──────────────────────────────────

function getRedirectUri() {
  return window.location.origin + window.location.pathname.replace(/\/$/, '') + '/';
}

// ── initAuth ─────────────────────────────────────────────────

async function initAuth() {
  // 1) ¿Volvemos de OAuth? Token en hash: #access_token=...
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const token  = params.get('access_token');
    history.replaceState(null, '', window.location.pathname);
    if (token) {
      accessToken = token;
      try {
        await getUserInfo();
        saveSession(accessToken, currentUser);
        await loadAllData();
        showApp();
        _scheduleTokenRenewal();
      } catch(e) {
        console.error('Error tras OAuth redirect:', e);
        _mostrarPantallaLogin();
      }
      return;
    }
  }

  // 2) ¿Sesión guardada válida?
  const savedToken = loadSession();
  const savedUser  = loadSavedUser();
  if (savedToken && savedUser) {
    accessToken = savedToken;
    currentUser = savedUser;
    try {
      await loadAllData();
      showApp();
      _scheduleTokenRenewal();
    } catch(e) {
      clearSession();
      _mostrarPantallaLogin();
    }
    return;
  }

  // 3) Sin sesión
  _mostrarPantallaLogin();
}

// ── signIn ───────────────────────────────────────────────────

function signIn() {
  const params = new URLSearchParams({
    client_id:              CLIENT_ID,
    redirect_uri:           getRedirectUri(),
    response_type:          'token',
    scope:                  SCOPES,
    include_granted_scopes: 'true',
    prompt:                 'select_account'
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ── signOut ──────────────────────────────────────────────────

function signOut() {
  clearSession();
  accessToken = null;
  currentUser = null;
  _mostrarPantallaLogin();
}

// ── getUserInfo ──────────────────────────────────────────────

async function getUserInfo() {
  const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) throw new Error('No se pudo obtener información del usuario');
  currentUser = await r.json();
  saveSession(accessToken, currentUser);
}

// ── authFetch ────────────────────────────────────────────────

async function authFetch(url, options = {}) {
  options.headers = { ...options.headers, Authorization: `Bearer ${accessToken}` };
  const r = await fetch(url, options);
  if (r.status === 401 || r.status === 403) {
    clearSession();
    showToast('Sesión expirada. Redirigiendo al login...', 'error');
    setTimeout(() => signIn(), 1800);
    throw new Error('Sesión expirada');
  }
  return r;
}

// ── Renovación programada ────────────────────────────────────

function _scheduleTokenRenewal() {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return;
  try {
    const { expires } = JSON.parse(raw);
    const msAviso   = expires - Date.now() - 5 * 60 * 1000;
    const msExpira  = expires - Date.now();
    if (msAviso  > 0) setTimeout(() => showToast('La sesión expira en 5 minutos. Guarda tu trabajo.', 'warning'), msAviso);
    if (msExpira > 0) setTimeout(() => { clearSession(); showToast('Sesión expirada. Redirigiendo...', 'error'); setTimeout(() => signIn(), 1800); }, msExpira);
  } catch(e) {}
}

// ── Helpers ──────────────────────────────────────────────────

function _mostrarPantallaLogin() {
  const app  = document.getElementById('app');
  const auth = document.getElementById('auth-screen');
  if (app)  app.style.display  = 'none';
  if (auth) auth.style.display = 'flex';
}

// Stub de compatibilidad (el flujo redirect no usa renovación silenciosa)
function renewTokenPromise() {
  return Promise.reject(new Error('Flujo redirect: sin renovación silenciosa'));
}
