// auth.js — регистрация, вход, сессии. Блокирует UI до входа/рег-ии.
// Использует localStorage: keys 'lh_users' и 'lh_session_v2'.
// Хэши паролей — SHA-256 в hex (клиент вычисляет перед сохранением).

const USERS_LS_KEY = 'lh_users';
const SESSION_LS_KEY = 'lh_session_v2';
const SESSION_TTL = 1000 * 60 * 60 * 12; // 12 часов

// util: sha256 -> hex
async function sha256hex(s){
  const enc = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function loadPersistedUsers(){
  try {
    const raw = localStorage.getItem(USERS_LS_KEY);
    const base = window.APP_USERS || [];
    if (!raw) return base;
    const added = JSON.parse(raw);
    // merge: base (file) + added (registered)
    const calls = new Set(base.map(u=>u.callsign));
    const merged = base.slice();
    for (const u of added) if (!calls.has(u.callsign)) merged.push(u);
    return merged;
  } catch { return window.APP_USERS || []; }
}

function savePersistedUser(obj){
  const raw = localStorage.getItem(USERS_LS_KEY);
  const arr = raw ? JSON.parse(raw) : [];
  arr.push(obj);
  localStorage.setItem(USERS_LS_KEY, JSON.stringify(arr));
}

function saveSession(session){
  session.expires = Date.now() + SESSION_TTL;
  localStorage.setItem(SESSION_LS_KEY, JSON.stringify(session));
}
function loadSession(){
  const raw = localStorage.getItem(SESSION_LS_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (Date.now() > s.expires) { localStorage.removeItem(SESSION_LS_KEY); return null; }
    return s;
  } catch { localStorage.removeItem(SESSION_LS_KEY); return null; }
}
function clearSession(){ localStorage.removeItem(SESSION_LS_KEY); }

/* UI gate: если нет сессии — показываем полноэкранную модаль регистрации/логина/приветствия */
function showGateIfNeeded(){
  const s = loadSession();
  if (s) { window.CURRENT_USER = s; document.dispatchEvent(new Event('lh:auth:ready')); return; }
  renderGateModal();
}

function renderGateModal(){
  // full-screen gate
  const modal = document.createElement('div');
  modal.id = 'lh-gate';
  modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(2,6,10,0.85),rgba(2,6,10,0.85));z-index:99999;padding:20px';
  modal.innerHTML = `
    <div style="max-width:820px;width:100%;border-radius:14px;padding:18px;background:linear-gradient(180deg,#062833,#032431);border:1px solid rgba(255,255,255,0.03);color:var(--text);">
      <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px">
        <div style="width:64px;height:64px;border-radius:12px;background:linear-gradient(180deg,#09323f,#02212a);display:flex;align-items:center;justify-content:center;font-weight:900;color:var(--accent);font-size:22px">LH</div>
        <div>
          <div style="font-weight:900;font-size:20px">Lufthansa Group Virtual</div>
          <div style="color:var(--muted);margin-top:6px">Для продолжения зарегистрируйтесь или войдите. Проект остаётся client-only.</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="padding:12px;border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,0.02),transparent);">
          <div style="font-weight:800;margin-bottom:8px">Регистрация</div>
          <input id="regName" placeholder="Имя" class="input" style="margin-bottom:8px"/>
          <input id="regCall" placeholder="Позывной" class="input" style="margin-bottom:8px"/>
          <input id="regPass" placeholder="Пароль" type="password" class="input" style="margin-bottom:8px"/>
          <div style="display:flex;gap:8px;align-items:center">
            <button id="regSubmit" class="btn primary">Зарегистрироваться</button>
            <div id="regMsg" class="small muted" style="margin-left:8px"></div>
          </div>
        </div>
        <div style="padding:12px;border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,0.02),transparent);">
          <div style="font-weight:800;margin-bottom:8px">Вход</div>
          <input id="logCall" placeholder="Позывной" class="input" style="margin-bottom:8px"/>
          <input id="logPass" placeholder="Пароль" type="password" class="input" style="margin-bottom:8px"/>
          <div style="display:flex;gap:8px;align-items:center">
            <button id="logSubmit" class="btn ghost">Войти</button>
            <button id="logDemo" class="btn ghost">Демо (TEST)</button>
            <div id="logMsg" class="small muted" style="margin-left:8px"></div>
          </div>
        </div>
      </div>

      <div style="margin-top:12px;color:var(--muted);font-size:13px">Примечание: это client-only демо. Зарегистрированные пользователи сохраняются локально в вашем браузере (localStorage).</div>
    </div>
  `;
  document.body.appendChild(modal);

  // handlers
  document.getElementById('regSubmit').addEventListener('click', async ()=>{
    const name = document.getElementById('regName').value.trim();
    const callsign = document.getElementById('regCall').value.trim();
    const pass = document.getElementById('regPass').value;
    const msg = document.getElementById('regMsg');
    msg.textContent = '';
    if (!name || !callsign || !pass) { msg.textContent = 'Заполните все поля'; return; }

    const all = loadPersistedUsers();
    if (all.find(u=>u.callsign.toLowerCase() === callsign.toLowerCase())) { msg.textContent = 'Позывной занят'; return; }

    const hash = await sha256hex(pass);
    const newUser = { callsign, name, hash, status: 'pending', createdAt: Date.now() };
    savePersistedUser(newUser);
    saveSession({ callsign, name, status: 'pending' });
    window.CURRENT_USER = { callsign, name, status: 'pending' };
    msg.textContent = 'Готово — вы зарегистрированы';
    // close gate and notify
    document.getElementById('lh-gate')?.remove();
    document.dispatchEvent(new Event('lh:auth:ready'));
  });

  document.getElementById('logSubmit').addEventListener('click', async ()=>{
    const callsign = document.getElementById('logCall').value.trim();
    const pass = document.getElementById('logPass').value;
    const msg = document.getElementById('logMsg');
    msg.textContent = '';
    if (!callsign || !pass) { msg.textContent = 'Заполните оба поля'; return; }

    const all = loadPersistedUsers();
    const u = all.find(x=>x.callsign.toLowerCase() === callsign.toLowerCase());
    if (!u) { msg.textContent = 'Пользователь не найден'; return; }
    const h = await sha256hex(pass);
    if (h !== (u.hash||'')) { msg.textContent = 'Неверный пароль'; return; }
    saveSession({ callsign: u.callsign, name: u.name, status: u.status });
    window.CURRENT_USER = { callsign: u.callsign, name: u.name, status: u.status };
    msg.textContent = 'Вход выполнен';
    document.getElementById('lh-gate')?.remove();
    document.dispatchEvent(new Event('lh:auth:ready'));
  });

  document.getElementById('logDemo').addEventListener('click', ()=>{
    // demo: TEST user from users.js (if present) or quick demo object
    const demo = (loadPersistedUsers().find(u=>u.callsign==='TEST') || { callsign:'TEST', name:'Demo Pilot', status:'verified' });
    saveSession({ callsign: demo.callsign, name: demo.name, status: demo.status });
    window.CURRENT_USER = demo;
    document.getElementById('lh-gate')?.remove();
    document.dispatchEvent(new Event('lh:auth:ready'));
  });
}

/* init: run on load */
showGateIfNeeded();

/* helper to expose logout */
window.LHAuth = {
  logout: ()=>{ clearSession(); window.CURRENT_USER = null; showGateIfNeeded(); }
};
