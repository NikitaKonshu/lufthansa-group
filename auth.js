// auth.js — регистрация, вход, сессия, gate (client-only)
// Требует: users.js подключён перед этим файлом.
// Хранение пользователей: localStorage 'lh_users'
// Сессия: localStorage 'lh_session_v2'

const USERS_LS_KEY = 'lh_users';
const SESSION_LS_KEY = 'lh_session_v2';
const SESSION_TTL = 1000 * 60 * 60 * 12; // 12 часов

async function sha256hex(s){
  const enc = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function loadPersistedUsers(){
  try{
    const raw = localStorage.getItem(USERS_LS_KEY);
    const base = window.APP_USERS || [];
    if (!raw) return base;
    const added = JSON.parse(raw);
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
function clearSession(){ localStorage.removeItem(SESSION_LS_KEY); window.CURRENT_USER = null; }

function onAuthSuccess(user){
  saveSession({ callsign: user.callsign, name: user.name, status: user.status || 'pending', isAdmin: user.isAdmin || false });
  window.CURRENT_USER = { callsign: user.callsign, name: user.name, status: user.status || 'pending', isAdmin: user.isAdmin || false };
  // remove gate
  document.getElementById('lh-gate')?.remove();
  // reveal main UI
  const mainUI = document.getElementById('mainUI');
  if (mainUI) {
    mainUI.setAttribute('aria-hidden','false');
    setTimeout(()=> document.body.classList.add('main-ready'), 60);
  }
  setTimeout(()=> {
    const el = document.querySelector('#genBtn, .btn.primary, #openLogin');
    if (el) el.focus();
  }, 220);
  document.dispatchEvent(new Event('lh:auth:ready'));
}

function renderGateModal(){
  // if already exists, keep it
  if (document.getElementById('lh-gate')) return;
  const modal = document.createElement('div');
  modal.id = 'lh-gate';
  modal.setAttribute('role','dialog');
  modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(2,6,10,0.95),rgba(2,6,10,0.95));z-index:99999;padding:20px';
  modal.innerHTML = `
    <div style="max-width:820px;width:100%;border-radius:14px;padding:18px;background:linear-gradient(180deg,#062833,#032431);border:1px solid rgba(255,255,255,0.03);color:var(--text);">
      <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px">
        <div style="width:64px;height:64px;border-radius:12px;background:linear-gradient(180deg,#09323f,#02212a);display:flex;align-items:center;justify-content:center;font-weight:900;color:var(--accent);font-size:22px">LH</div>
        <div>
          <div style="font-weight:900;font-size:20px">Lufthansa Group Virtual</div>
          <div style="color:var(--muted);margin-top:6px">Для продолжения зарегистрируйтесь или войдите.</div>
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

  // trap focus
  const focusable = modal.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0], last = focusable[focusable.length-1];
  first?.focus();
  modal.addEventListener('keydown', (e)=> {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    } else if (e.key === 'Escape') {
      e.preventDefault();
    }
  });

  // handlers
  modal.querySelector('#regSubmit').addEventListener('click', async ()=>{
    const name = modal.querySelector('#regName').value.trim();
    const callsign = modal.querySelector('#regCall').value.trim();
    const pass = modal.querySelector('#regPass').value;
    const msg = modal.querySelector('#regMsg');
    msg.textContent = '';
    if (!name || !callsign || !pass) { msg.textContent = 'Заполните все поля'; return; }

    const all = loadPersistedUsers();
    if (all.find(u=>u.callsign.toLowerCase() === callsign.toLowerCase())) { msg.textContent = 'Позывной занят'; return; }

    const hash = await sha256hex(pass);
    const newUser = { callsign, name, hash, status: 'pending', createdAt: Date.now() };
    savePersistedUser(newUser);
    onAuthSuccess(newUser);
  });

  modal.querySelector('#logSubmit').addEventListener('click', async ()=>{
    const callsign = modal.querySelector('#logCall').value.trim();
    const pass = modal.querySelector('#logPass').value;
    const msg = modal.querySelector('#logMsg');
    msg.textContent = '';
    if (!callsign || !pass) { msg.textContent = 'Заполните оба поля'; return; }

    const all = loadPersistedUsers();
    const u = all.find(x=>x.callsign.toLowerCase() === callsign.toLowerCase());
    if (!u) { msg.textContent = 'Пользователь не найден'; return; }
    const h = await sha256hex(pass);
    if (h !== (u.hash||'')) { msg.textContent = 'Неверный пароль'; return; }
    onAuthSuccess(u);
  });

  modal.querySelector('#logDemo').addEventListener('click', ()=>{
    const demo = (loadPersistedUsers().find(u=>u.callsign==='TEST') || { callsign:'TEST', name:'Demo Pilot', status:'verified', isAdmin:true });
    onAuthSuccess(demo);
  });
}

function showGateIfNeeded(){
  const s = loadSession();
  const mainUI = document.getElementById('mainUI');
  if (s) {
    if (mainUI) mainUI.setAttribute('aria-hidden','false');
    document.body.classList.add('main-ready');
    window.CURRENT_USER = s;
    document.dispatchEvent(new Event('lh:auth:ready'));
    return;
  }
  if (mainUI) mainUI.setAttribute('aria-hidden','true');
  renderGateModal();
}

// expose logout
window.LHAuth = {
  logout: ()=>{ clearSession(); document.body.classList.remove('main-ready'); document.getElementById('mainUI')?.setAttribute('aria-hidden','true'); renderGateModal(); }
};

// run on load
showGateIfNeeded();
