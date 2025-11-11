// ui.js — обновлён: раскрытие хаба — список авиакомпаний + их хабы; флот показывается только после генерации

/* Данные (приведены упрощённо; оставь/подмени на свои) */
const HUBS = [
  { code: 'EDDF', label: 'Frankfurt' },
  { code: 'EDDM', label: 'Munich' },
  { code: 'EDDH', label: 'Hamburg' },
  { code: 'EFHK', label: 'Helsinki' },
  { code: 'ENBR', label: 'Bergen' },
  { code: 'ENGM', label: 'Oslo' },
  { code: 'EBBR', label: 'Brussels' },
  { code: 'EKCH', label: 'Copenhagen' },
  { code: 'EVRA', label: 'Riga' },
  { code: 'LIRF', label: 'Rome' },
  { code: 'LOWW', label: 'Vienna' },
  { code: 'LSZH', label: 'Zurich' }
];

const AIRLINES = [
  { short: 'SWISS', name: 'Swiss International Air Lines', flag: '🇨🇭', hubs: ['LSZH','EDDF'] },
  { short: 'AUA',  name: 'Austrian Airlines', flag: '🇦🇹', hubs: ['LOWW','EDDF'] },
  { short: 'BT',   name: 'AirBaltic', flag: '🇱🇻', hubs: ['EVRA'] },
  { short: 'SN',   name: 'Brussels Airlines', flag: '🇧🇪', hubs: ['EBBR'] },
  { short: 'EW',   name: 'Eurowings', flag: '🇩🇪', hubs: ['EDDF','EDDM'] },
  { short: 'DISC', name: 'Discover Airlines', flag: '🇩🇪', hubs: ['EDDF'] },
  { short: 'EDW',  name: 'Edelweiss Air', flag: '🇨🇭', hubs: ['LSZH'] },
  { short: 'LHC',  name: 'Lufthansa Cargo', flag: '🇩🇪', hubs: ['EDDF'] },
  { short: 'CLH',  name: 'Lufthansa CityLine', flag: '🇩🇪', hubs: ['EDDF','EDDM'] },
  { short: 'LCA',  name: 'Lufthansa City Airlines', flag: '🇩🇪', hubs: ['EDDF'] },
  { short: 'LHT',  name: 'Lufthansa Technik', flag: '🇩🇪', hubs: ['EDDF'] },
  { short: 'DLA',  name: 'Air Dolomiti', flag: '🇮🇹', hubs: ['EDDF','EDDM'] },
  { short: 'LPJ',  name: 'Lufthansa Private Jet', flag: '🇩🇪', hubs: ['EDDF'] },
  { short: 'AZ',   name: 'ITA Airways', flag: '🇮🇹', hubs: ['LIRF'] },
  { short: 'WIF',  name: 'Widerøe', flag: '🇳🇴', hubs: ['ENBR','ENGM'] },
  { short: 'DY',   name: 'Norwegian Airlines', flag: '🇳🇴', hubs: ['ENGM'] },
  { short: 'AY',   name: 'Finnair', flag: '🇫🇮', hubs: ['EFHK'] },
  { short: 'SAS',  name: 'SAS Scandinavian Airlines', flag: '🇩🇰🇸🇪🇳🇴', hubs: ['EKCH','ENGM'] },
  { short: 'COND', name: 'Condor', flag: '🇩🇪', hubs: ['EDDF','EDDM'] },
  { short: '3S',   name: 'AeroLogic', flag: '🇩🇪', hubs: ['EDDF'] },
  { short: 'XQ',   name: 'SunExpress', flag: '🇹🇷', hubs: ['EDDF','EDDM'] }
];

/* Demo fleet (будет скрыт до генерации) */
const FLEET = [
  { type:'A320', id:'LH-A320-01', base:'EDDF', dist:'6100 km', seats:180, status:'idle' },
  { type:'A321', id:'LH-A321-02', base:'EDDM', dist:'6100 km', seats:200, status:'idle' },
  { type:'E190', id:'LH-E190-01', base:'EDDF', dist:'4000 km', seats:100, status:'idle' },
  { type:'737MAX', id:'LH-737MAX-01', base:'EDDM', dist:'6600 km', seats:190, status:'idle' },
  { type:'B787', id:'LH-787-01', base:'EDDF', dist:'14140 km', seats:270, status:'idle' },
  { type:'A350', id:'LH-A350-01', base:'EDDM', dist:'15000 km', seats:300, status:'idle' }
];

/* State и элементы */
let selectedHubs = new Set();
let selectedDuration = null;
let currentUser = null;
let fleetVisible = false;

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

/* Helper */
function airlinesForHub(code){
  return AIRLINES.filter(a => (a.hubs||[]).includes(code));
}

/* Render hubs: карточка + превью airlines */
function renderHubs(){
  hubsEl.innerHTML = HUBS.map(h => {
    const list = airlinesForHub(h.code);
    const count = list.length;
    const preview = list.slice(0,3).map(a => `${a.flag} ${a.short}`).join(' · ');
    return `
      <div class="hub" data-code="${h.code}">
        <div class="left">
          <div class="code">${h.code}</div>
          <div>
            <div style="font-weight:800">${h.label}</div>
            <div class="meta">${h.code} · ${count} авиакомпаний ${preview? ' · ' + preview : ''}</div>
          </div>
        </div>
        <div class="right"><div class="count">${count}</div></div>
      </div>
    `;
  }).join('');

  hubsEl.querySelectorAll('.hub').forEach(el=>{
    el.addEventListener('click', ()=> onHubClick(el));
  });
}

/* При клике: раскрыть список airlines + показать их хабы (под ними) */
function onHubClick(hubEl){
  const code = hubEl.dataset.code;
  // toggle selection
  if (selectedHubs.has(code)) { selectedHubs.delete(code); hubEl.classList.remove('selected'); }
  else { selectedHubs.add(code); hubEl.classList.add('selected'); }
  updateSummary();

  // если есть уже блок с list — удалить (toggle)
  const existing = hubEl.querySelector('.hub-airlines');
  if (existing) { existing.remove(); return; }

  // создаём блок с полным списком авиакомпаний для этого хаба
  const airlines = airlinesForHub(code);
  const container = document.createElement('div');
  container.className = 'hub-airlines';
  container.style.cssText = 'margin-top:10px;padding:10px;border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,0.02),transparent);border:1px solid rgba(255,255,255,0.03)';
  if (!airlines.length){
    container.innerHTML = '<div class="hub-airline-row muted">Авиакомпаний нет</div>';
    hubEl.appendChild(container);
    return;
  }

  // список авиакомпаний + под каждым их хабы
  container.innerHTML = airlines.map(a => {
    const hubs = (a.hubs||[]).map(h => `<span class="hub-chip">${h}</span>`).join(' ');
    return `<div style="margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="font-weight:800">${a.flag || ''} ${a.name}</div>
        <div class="muted" style="margin-left:8px">(${a.short})</div>
      </div>
      <div class="muted small" style="margin-top:6px">Хабы: ${hubs || '—'}</div>
    </div>`;
  }).join('');

  hubEl.appendChild(container);
}

/* Durations rendering */
function renderDurations(){
  durationsEl.innerHTML = `
    ${[
      {id:'1-2',label:'1–2ч ~ 2ч',val:2},
      {id:'3-4',label:'3–4ч ~ 4ч',val:4},
      {id:'5-6',label:'5–6ч ~ 6ч',val:6},
      {id:'7-8',label:'7–8ч ~ 8ч',val:8},
      {id:'9-10',label:'9–10ч ~ 10ч',val:10},
      {id:'10+',label:'10+ч ~ 15ч',val:15}
    ].map(d=>`<div class="duration" data-id="${d.id}" data-val="${d.val}">${d.label}</div>`).join('')}
  `;
  durationsEl.querySelectorAll('.duration').forEach(el=>{
    el.addEventListener('click', ()=> {
      durationsEl.querySelectorAll('.duration').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
      selectedDuration = Number(el.dataset.val);
      updateSummary();
    });
  });
}

/* FLEET: по умолчанию скрыт; показывается только после генерации */
function renderFleet(show=false, availableFleet=[]){
  fleetListEl.innerHTML = '';
  fleetVisible = !!show;
  if (!show){
    fleetListEl.innerHTML = '<div class="muted small">Флот будет показан после выбора и генерации рейса</div>';
    return;
  }
  // availableFleet — массив объектов самолётов (если не передан — используем демо FLEET)
  const list = (availableFleet && availableFleet.length) ? availableFleet : FLEET;
  fleetListEl.innerHTML = list.map(f => {
    const st = (f.status === 'inFlight') ? 'inflight' : (f.status === 'idle' ? 'idle' : 'out');
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

/* Update summary text */
function updateSummary(){
  const hubs = Array.from(selectedHubs).join(', ') || '—';
  summaryEl.textContent = `Выбрано: ${hubs}${selectedDuration ? ' · ' + selectedDuration + 'ч' : ''}`;
}

/* Generate button: вызывает точку расширения, затем показывает флот под результат */
genBtn.addEventListener('click', ()=> {
  if (!currentUser){
    openLoginModal();
    return;
  }
  if (!selectedHubs.size || !selectedDuration){
    alert('Выберите как минимум один хаб и длительность');
    return;
  }
  const payload = { hubs: Array.from(selectedHubs), duration: selectedDuration, user: currentUser };

  // если у проекта есть функция обработки — вызываем её (интеграция)
  if (window.onGenerateSelected && typeof window.onGenerateSelected === 'function'){
    // ожидаем, что onGenerateSelected может вернуть или промис с availableFleet
    const res = window.onGenerateSelected(payload);
    if (res && typeof res.then === 'function'){
      // асинхронный сценарий: дождаться и отрисовать флот
      res.then(availableFleet => {
        resultArea.hidden = false;
        resultArea.innerHTML = `<div class="card-inner"><strong>Рейс сгенерирован</strong><div class="muted" style="margin-top:8px">Пилот: ${currentUser.callsign||currentUser} · ${payload.hubs.join(', ')} · ${payload.duration}ч</div></div>`;
        renderFleet(true, availableFleet || []);
        prependLog(`Сгенерирован: ${currentUser.callsign||currentUser} · ${payload.hubs.join(', ')} · ${payload.duration}ч`);
      }).catch(err=>{
        alert('Ошибка генерации: ' + (err && err.message ? err.message : String(err)));
      });
    } else {
      // синхронный результат (может вернуть availableFleet или undefined)
      const availableFleet = res && Array.isArray(res) ? res : null;
      resultArea.hidden = false;
      resultArea.innerHTML = `<div class="card-inner"><strong>Рейс сгенерирован</strong><div class="muted" style="margin-top:8px">Пилот: ${currentUser.callsign||currentUser} · ${payload.hubs.join(', ')} · ${payload.duration}ч</div></div>`;
      renderFleet(true, availableFleet || []);
      prependLog(`Сгенерирован: ${currentUser.callsign||currentUser} · ${payload.hubs.join(', ')} · ${payload.duration}ч`);
    }
  } else {
    // fallback demo: показать демо-флот
    resultArea.hidden = false;
    resultArea.innerHTML = `<div class="card-inner"><strong>Демо: Рейс сгенерирован</strong><div class="muted" style="margin-top:8px">Пилот: ${currentUser.callsign||currentUser} · ${payload.hubs.join(', ')} · ${payload.duration}ч</div></div>`;
    renderFleet(true); // отобразить демо FLEET
    prependLog(`Демо-генерация: ${currentUser.callsign||currentUser} · ${payload.hubs.join(', ')} · ${payload.duration}ч`);
  }
});

/* demo/reset/login — упрощённые версии (можно заменить на вашу l ogic) */
demoBtn.addEventListener('click', ()=> {
  // быстрый пресет
  selectedHubs = new Set(['EDDF','EDDM']);
  selectedDuration = 6;
  document.querySelectorAll('.duration').forEach(x=>x.classList.toggle('selected', x.dataset.val==6));
  document.querySelectorAll('.hub').forEach(h=>h.classList.toggle('selected', selectedHubs.has(h.dataset.code)));
  updateSummary();
});

resetBtn.addEventListener('click', ()=> {
  selectedHubs.clear();
  selectedDuration = null;
  document.querySelectorAll('.duration').forEach(x=>x.classList.remove('selected'));
  document.querySelectorAll('.hub').forEach(h=>h.classList.remove('selected'));
  resultArea.hidden = true;
  resultArea.innerHTML = '';
  renderFleet(false);
  updateSummary();
});

/* Простой login modal (demo) — можно заменить на auth.js */
document.getElementById('openLogin')?.addEventListener('click', openLoginModal);
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
  signedUserEl.textContent = user.callsign || user.name || user;
  prependLog(`Login: ${user.callsign || user.name || user}`);
}

/* Лог */
function prependLog(text){
  const el = document.createElement('div'); el.textContent = `${new Date().toLocaleString()} — ${text}`;
  if (logArea) logArea.prepend(el);
}

/* Инициализация */
renderHubs();
renderDurations();
renderFleet(false); // скрываем флот по умолчанию
updateSummary();
