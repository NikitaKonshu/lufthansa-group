// ui.js — улучшённый UI + микровзаимодействия
// Точка расширения: window.onGenerateSelected(payload) — интегрируй сюда генератор рейсов.

const HUBS = [
  { code: 'EDDF', label: 'Frankfurt', count: 9 },
  { code: 'EDDM', label: 'Munich', count: 2 },
  { code: 'EDDH', label: 'Hamburg', count: 1 },
  { code: 'EFHK', label: 'Helsinki', count: 1 },
  { code: 'ENBR', label: 'Bergen', count: 1 },
  { code: 'ENGM', label: 'Oslo', count: 1 },
  { code: 'EBBR', label: 'Brussels', count: 1 },
  { code: 'EKCH', label: 'Copenhagen', count: 1 },
  { code: 'EVRA', label: 'Riga', count: 1 },
  { code: 'LIRF', label: 'Rome', count: 1 },
  { code: 'LOWW', label: 'Vienna', count: 1 },
  { code: 'LSZH', label: 'Zurich', count: 1 }
];

const DURATIONS = [
  { id: '1-2', label: '1–2ч ~ 2ч', val: 2 },
  { id: '3-4', label: '3–4ч ~ 4ч', val: 4 },
  { id: '5-6', label: '5–6ч ~ 6ч', val: 6 },
  { id: '7-8', label: '7–8ч ~ 8ч', val: 8 },
  { id: '9-10', label: '9–10ч ~ 10ч', val: 10 },
  { id: '10+', label: '10+ч ~ 15ч', val: 15 },
];

const FLEET = [
  { type:'A320', id:'LH-A320-01', base:'EDDF', dist:'6100 km', seats:180, status:'inFlight' },
  { type:'A321', id:'LH-A321-02', base:'EDDM', dist:'6100 km', seats:200, status:'idle' },
  { type:'E190', id:'LH-E190-01', base:'EDDF', dist:'4000 km', seats:100, status:'idle' },
  { type:'737MAX', id:'LH-737MAX-01', base:'EDDM', dist:'6600 km', seats:190, status:'idle' },
  { type:'B787', id:'LH-787-01', base:'EDDF', dist:'14140 km', seats:270, status:'idle' },
  { type:'A350', id:'LH-A350-01', base:'EDDM', dist:'15000 km', seats:300, status:'idle' }
];

let selectedHubs = new Set();
let selectedDuration = null;
let currentUser = null;

const hubsEl = document.getElementById('hubs');
const durationsEl = document.getElementById('durations');
const fleetListEl = document.getElementById('fleetList');
const genBtn = document.getElementById('genBtn');
const demoBtn = document.getElementById('demoBtn');
const resetBtn = document.getElementById('resetBtn');
const summaryEl = document.getElementById('summary');
const resultArea = document.getElementById('resultArea');
const signedUserEl = document.getElementById('signedUser');
const logArea = document.getElementById('logArea');

function renderHubs(){
  hubsEl.innerHTML = HUBS.map(h => `
    <div class="hub" data-code="${h.code}">
      <div class="left">
        <div class="code">${h.code}</div>
        <div>
          <div style="font-weight:800">${h.label}</div>
          <div class="meta">${h.code} · ${h.count} авиакомпаний</div>
        </div>
      </div>
      <div class="count">${h.count}</div>
    </div>
  `).join('');
  hubsEl.querySelectorAll('.hub').forEach(el=>{
    el.addEventListener('click', ()=> {
      const code = el.dataset.code;
      if (selectedHubs.has(code)) { selectedHubs.delete(code); el.classList.remove('selected'); }
      else { selectedHubs.add(code); el.classList.add('selected'); }
      updateSummary();
    });
  });
}

function renderDurations(){
  durationsEl.innerHTML = DURATIONS.map(d=>`<div class="duration" data-id="${d.id}" data-val="${d.val}">${d.label}</div>`).join('');
  durationsEl.querySelectorAll('.duration').forEach(el=>{
    el.addEventListener('click', ()=> {
      durationsEl.querySelectorAll('.duration').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
      selectedDuration = Number(el.dataset.val);
      updateSummary();
    });
  });
}

function renderFleet(){
  fleetListEl.innerHTML = FLEET.map(f => {
    const st = f.status === 'inFlight' ? 'inflight' : (f.status === 'idle' ? 'idle' : 'out');
    return `<div class="fleet-item">
      <div class="fleet-left">
        <div class="aircraft">${f.type}</div>
        <div>
          <div style="font-weight:800">${f.type} · ${f.id}</div>
          <div class="fleet-meta">${f.base} · ${f.dist} · ${f.seats} seats</div>
        </div>
      </div>
      <div><div class="status ${st}">${f.status}</div></div>
    </div>`;
  }).join('');
}

function updateSummary(){
  const hubs = Array.from(selectedHubs).join(', ') || '—';
  summaryEl.textContent = `Выбрано: ${hubs}${selectedDuration ? ' · ' + selectedDuration + 'ч' : ''}`;
}

genBtn.addEventListener('click', ()=> {
  if (!currentUser) { openLoginModal(); return; }
  if (!selectedHubs.size || !selectedDuration) { alert('Выберите хаб и длительность'); return; }
  const payload = { hubs: Array.from(selectedHubs), duration: selectedDuration, user: currentUser };
  if (window.onGenerateSelected) { window.onGenerateSelected(payload); }
  else {
    resultArea.hidden = false;
    resultArea.innerHTML = `<div class="card"><strong class="ok">Рейс сгенерирован</strong><div class="muted" style="margin-top:8px">Пилот: ${currentUser.callsign||currentUser} · Хабы: ${payload.hubs.join(', ')} · Длительность: ${payload.duration}ч</div></div>`;
    prependLog(`Рейс: ${currentUser.callsign||currentUser} · ${payload.hubs.join(', ')} · ${payload.duration}ч`);
  }
});

demoBtn.addEventListener('click', ()=> {
  selectedHubs = new Set(['EDDF','EDDM']);
  selectedDuration = 6;
  document.querySelectorAll('.duration').forEach(x=>x.classList.toggle('selected', x.dataset.val==6));
  document.querySelectorAll('.hub').forEach(h=>h.classList.toggle('selected', selectedHubs.has(h.dataset.code)));
  updateSummary();
});

resetBtn.addEventListener('click', ()=> {
  selectedHubs.clear(); selectedDuration = null;
  document.querySelectorAll('.duration').forEach(x=>x.classList.remove('selected'));
  document.querySelectorAll('.hub').forEach(h=>h.classList.remove('selected'));
  resultArea.hidden = true; resultArea.innerHTML = '';
  updateSummary();
});

/* login modal (simple demo) */
document.getElementById('openLogin').addEventListener('click', openLoginModal);
function openLoginModal(){
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(2,6,10,0.6);backdrop-filter:blur(6px);z-index:9999';
  modal.innerHTML = `
    <div style="width:100%;max-width:520px;padding:18px;border-radius:14px;background:linear-gradient(180deg,#062633,#03242f);border:1px solid rgba(255,255,255,0.03)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-weight:800;color:var(--accent)">Вход пилота</div>
        <button id="close" class="btn ghost">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <input id="loginCall" class="input" placeholder="Позывной" style="padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:var(--text)"/>
        <input id="loginPass" type="password" class="input" placeholder="Пароль" style="padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:var(--text)"/>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="loginSubmit" class="btn primary">Войти</button>
          <button id="loginDemo" class="btn ghost">Демо (TEST)</button>
          <div id="loginMsg" style="margin-left:auto;color:var(--muted)"></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#close').addEventListener('click', ()=> modal.remove());
  modal.querySelector('#loginDemo').addEventListener('click', ()=> { performLogin({ callsign:'TEST', name:'Demo Pilot' }); modal.remove(); });
  modal.querySelector('#loginSubmit').addEventListener('click', ()=> {
    const call = modal.querySelector('#loginCall').value.trim();
    if (!call) { modal.querySelector('#loginMsg').textContent = 'Введите позывной'; return; }
    performLogin({ callsign: call, name: call }); modal.remove();
  });
}

function performLogin(user){
  currentUser = user;
  signedUserEl.textContent = user.callsign || user;
  prependLog(`Login: ${user.callsign||user.name||user}`);
}

/* small log */
function prependLog(text){
  const el = document.createElement('div'); el.textContent = `${new Date().toLocaleString()} — ${text}`;
  if (logArea) logArea.prepend(el);
}

/* init */
renderHubs();
renderDurations();
renderFleet();
updateSummary();
