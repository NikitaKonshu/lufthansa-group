// auth.js — упрощённая авторизация без регистрации
// Ожидает, что users.js подключён перед этим файлом.
// Блокирует основной UI (#mainUI) до успешного логина.
// Сессия хранится в localStorage 'lh_session_v2'.

const SESSION_LS_KEY = 'lh_session_v2';
const SESSION_TTL = 1000 * 60 * 60 * 12; // 12 часов

async function sha256hex(s){
  const enc = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function loadUsers(){
  // users.js (repo) + optional persisted added users (we keep persisted disabled by default)
  return window.APP_USERS || [];
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

/* show login-only gate (no registration) */
function renderLoginGate(){
  if (document.getElementById('lh-gate')) return;
  const modal = document.createElement('div');
  modal.id = 'lh-gate';
  modal.setAttribute('role','dialog');
  modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(2,6,10,0.95),rgba(2,6,10,0.95));z-index:99999;padding:20px';
  modal.innerHTML = `
    <div style="max-width:520px;width:100%;border-radius:14px;padding:18px;background:linear-gradient(180deg,#062833,#032431);border:1px solid rgba(255,255,255,0.03);color:var(--text);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div style="font-weight:900;font-size:18px">Lufthansa Group Virtual</div>
          <div style="color:var(--muted);margin-top:6px">Войдите, пожалуйста. Доступ возможен только для предварительно добавленных пилотов.</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px">
        <input id="logCall" placeholder="Позывной" class="input" style="padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:var(--text)"/>
        <input id="logPass" placeholder="Пароль" type="password" class="input" style="padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:var(--text)"/>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="logSubmit" class="btn primary">Войти</button>
          <button id="logDemo" class="btn ghost">Демо (TEST)</button>
          <div id="logMsg" class="small muted" style="margin-left:8px"></div>
        </div>
      </div>

      <div style="margin-top:12px;color:var(--muted);font-size:13px">Примечание: регистрация отключена. Новый пользователь может быть добавлен только вручную в users.js в репозитории.</div>
    </div>
  `;
  document.body.appendChild(modal);

  // focus trap (simple)
  const focusable = modal.querySelectorAll('button, input');
  const first = focusable[0], last = focusable[focusable.length-1];
  first?.focus();
  modal.addEventListener('keydown', (e)=> {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    } else if (e.key === 'Escape') { e.preventDefault(); }
  });

  modal.querySelector('#logSubmit').addEventListener('click', async ()=>{
    const callsign = modal.querySelector('#logCall').value.trim();
    const pass = modal.querySelector('#logPass').value;
    const msg = modal.querySelector('#logMsg');
    msg.textContent = '';
    if (!callsign || !pass) { msg.textContent = 'Заполните оба поля'; return; }

    const users = loadUsers();
    const u = users.find(x=>x.callsign.toLowerCase() === callsign.toLowerCase());
    if (!u) { msg.textContent = 'Пользователь не найден'; return; }
    if (!u.hash) { msg.textContent = 'Вход закрыт для этого пользователя (нет хэша)'; return; }
    const h = await sha256hex(pass);
    if (h !== u.hash) { msg.textContent = 'Неверный пароль'; return; }
    // success
    onAuthSuccess(u);
  });

  modal.querySelector('#logDemo').addEventListener('click', ()=>{
    // демо-кнопка логинит TEST даже если у TEST пустой хэш
    const users = loadUsers();
    const demo = users.find(u=>u.callsign==='TEST') || { callsign:'TEST', name:'Demo Pilot', status:'verified', isAdmin:true };
    onAuthSuccess(demo);
  });
}

/* on successful auth: reveal UI */
function onAuthSuccess(user){
  saveSession({ callsign: user.callsign, name: user.name, status: user.status || 'pending', isAdmin: user.isAdmin || false });
  window.CURRENT_USER = { callsign: user.callsign, name: user.name, status: user.status || 'pending', isAdmin: user.isAdmin || false };
  document.getElementById('lh-gate')?.remove();
  const mainUI = document.getElementById('mainUI');
  if (mainUI) {
    mainUI.setAttribute('aria-hidden','false');
    setTimeout(()=> document.body.classList.add('main-ready'), 60);
  }
  setTimeout(()=> { const el = document.querySelector('#genBtn, .btn.primary'); if (el) el.focus(); }, 220);
  document.dispatchEvent(new Event('lh:auth:ready'));
}

/* show gate if no session */
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
  renderLoginGate();
}

/* expose logout */
window.LHAuth = {
  logout: ()=>{ clearSession(); document.body.classList.remove('main-ready'); document.getElementById('mainUI')?.setAttribute('aria-hidden','true'); renderLoginGate(); }
};

// run
showGateIfNeeded();
