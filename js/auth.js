// ============================================================
// GOOGLE AUTH — con sesión persistente
// ============================================================
const TOKEN_STORAGE_KEY = 'gestionlab_token';
const USER_STORAGE_KEY  = 'gestionlab_user';

function saveSession(token, user) {
  try {
    const expires = Date.now() + 55 * 60 * 1000;
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token, expires }));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
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

function loadGoogleScripts() {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const check = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts) {
          clearInterval(check); resolve();
        }
      }, 50);
      setTimeout(() => { clearInterval(check); reject(new Error('Timeout')); }, 10000);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function initAuth() {
  try {
    await loadGoogleScripts();
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (resp) => {
        if (resp.error) {
          if (resp.error === 'interaction_required' || resp.error === 'user_cancelled') {
            document.getElementById('auth-screen').style.display = 'flex';
            return;
          }
          showToast('Error de autenticación: ' + resp.error, 'error'); return;
        }
        accessToken = resp.access_token;
        await getUserInfo();
        saveSession(accessToken, currentUser);
        await loadAllData();
        showApp();
      }
    });

    const savedToken = loadSession();
    if (savedToken) {
      const savedUser = loadSavedUser();
      if (savedUser) {
        accessToken = savedToken;
        currentUser = savedUser;
        await loadAllData();
        showApp();
        scheduleTokenRenewal();
        return;
      }
    }
    tokenClient.requestAccessToken({ prompt: '' });
  } catch(e) {
    console.error('Error iniciando auth:', e);
    document.getElementById('auth-screen').style.display = 'flex';
  }
}

function scheduleTokenRenewal() {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return;
  const { expires } = JSON.parse(raw);
  const msUntilRenewal = expires - Date.now() - 5 * 60 * 1000;
  if (msUntilRenewal > 0) {
    setTimeout(() => { tokenClient.requestAccessToken({ prompt: '' }); }, msUntilRenewal);
  }
}

function signIn() { tokenClient.requestAccessToken({ prompt: 'select_account consent' }); }

function signOut() {
  clearSession();
  google.accounts.oauth2.revoke(accessToken, () => {
    accessToken = null; currentUser = null;
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
  });
}

async function getUserInfo() {
  const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  currentUser = await r.json();
  saveSession(accessToken, currentUser);
}
