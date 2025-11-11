// ui.js — обновлён: привязка авиакомпаний к хабам и рендер списка при клике.
// Точка расширения: window.onGenerateSelected(payload)

// Список хабов (как раньше)
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

// Список авиакомпаний (как ты прислал) — сокращённо для кода, с flag/label
const AIRLINES = [
  { short: 'SWISS', name: 'Swiss International Air Lines', flag: '🇨🇭' },
  { short: 'AUA', name: 'Austrian Airlines', flag: '🇦🇹' },
  { short: 'BT',  name: 'AirBaltic', flag: '🇱🇻' },
  { short: 'SN',  name: 'Brussels Airlines', flag: '🇧🇪' },
  { short: 'EW',  name: 'Eurowings', flag: '🇩🇪' },
  { short: 'DISC',name: 'Discover Airlines', flag: '🇩🇪' },
  { short: 'EDW', name: 'Edelweiss Air', flag: '🇨🇭' },
  { short: 'LHC', name: 'Lufthansa Cargo', flag: '🇩🇪' },
  { short: 'CLH', name: 'Lufthansa CityLine', flag: '🇩🇪' },
  { short: 'LCA', name: 'Lufthansa City Airlines', flag: '🇩🇪' },
  { short: 'LHT', name: 'Lufthansa Technik', flag: '🇩🇪' },
  { short: 'DLA', name: 'Air Dolomiti', flag: '🇮🇹' },
  { short: 'LPJ', name: 'Lufthansa Private Jet', flag: '🇩🇪' },
  { short: 'AZ',  name: 'ITA Airways', flag: '🇮🇹' },
  { short: 'WIF', name: 'Widerøe', flag: '🇳🇴' },
  { short: 'DY',  name: 'Norwegian Airlines', flag: '🇳🇴' },
  { short: 'AY',  name: 'Finnair', flag: '🇫🇮' },
  { short: 'SAS', name: 'SAS Scandinavian Airlines', flag: '🇩🇰🇸🇪🇳🇴' },
  { short: 'COND',name: 'Condor', flag: '🇩🇪' },
  { short: '3S',  name: 'AeroLogic', flag: '🇩🇪' },
  { short: 'XQ',  name: 'SunExpress', flag: '🇹🇷' }
];

// Привязка: для каждого хаба — какие авиакомпании там представлены.
// Это примерный mapping; ты можешь подкорректировать под свои данные.
const HUB_AIRLINE_MAP = {
  EDDF: ['SWISS','LHC','CLH','DLA','3S','COND','EUROWINGS','DISC','LPJ'],  // Frankfurt — много
  EDDM: ['EW','DISC','AUA','DLA','A350','LPJ'].filter(Boolean), // Munich (корректируй по желанию)
  EDDH: ['COND','LHC'],
  EFHK: ['AY'],
  ENBR: ['WIF'],
  ENGM: ['WIF','SAS'],
  EBBR: ['SN'],
  EKCH: ['SAS','BT'],
  EVRA: ['BT'],
  LIRF: ['AZ'],
  LOWW: ['AUA'],
  LSZH: ['SWISS','EDW']
};

// Остальные данные (durations, fleet) оставляем без изменений
const DURATIONS = [
  { id: '1-2', label: '1–2ч ~ 2ч', val: 2 },
  { id: '3-4', label: '3–4ч ~ 4ч', val: 4 },
  { id: '5-6', label: '5–6ч ~ 6ч', val: 6 },
  { id: '7-8', label: '7–8ч ~ 8ч', val: 8 },
  { id: '9-10', label: '9–10ч ~ 10ч', val: 10 },
  { id: '10+', label: '10+ч ~ 15ч', val: 15 },
];

// Demo fleet (оставил без изменений)
const FLEET = [
  { type:'A320', id:'LH-A320-01', base:'EDDF', dist:'6100 km', seats:180, status:'inFlight' },
  { type:'A321', id:'LH-A321-02', base:'EDDM', dist:'6100 km', seats:200, status:'idle' },
  { type:'E190', id:'LH-E190-01', base:'EDDF', dist:'4000 km', seats:100, status:'idle' },
  { type:'737MAX', id:'LH-737MAX-01', base:'EDDM', dist:'6600 km', seats:190, status:'idle' },
  { type:'B787', id:'LH-787-01', base:'EDDF', dist:'14140 km', seats:270, status:'idle' },
  { type:'A350', id:'LH-A350-01', base:'EDDM', dist:'15000 km', seats:300, status:'idle' }
];

/* state + elements (как раньше) */
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

/* Helper — найти полное имя авиакомпании по short */
function airlineByShort(s){
  return AIRLINES.find(a=>a.short===s) || null;
}

/* Render: хабы теперь учитывают HUB_AIRLINE_MAP */
function renderHubs(){
  hubsEl.innerHTML = HUBS.map(h => {
    const alist = HUB_AIRLINE_MAP[h.code] || [];
    const count = alist.length;
    // компактная подсказка (показать до 3 в карточке)
    const preview = alist.slice(0,3).map(s => {
      const a = airlineByShort(s);
      return a ? `${a.flag || ''} ${a.name}` : s;
    }).join(' · ');
    return `
      <div class="hub" data-code="${h.code}">
        <div class="left">
          <div class="code">${h.code}</div>
          <div>
            <div style="font-weight:800">${h.label}</div>
            <div class="meta">${h.code} · ${count} авиакомпаний ${preview? ' · ' + preview : ''}</div>
          </div>
        </div>
        <div class="right">
          <div class="count">${count}</div>
        </div>
      </div>
    `;
  }).join('');
  hubsEl.querySelectorAll('.hub').forEach(el=>{
    el.addEventListener('click', async ()=> {
      const code = el.dataset.code;
      // toggle selection
      if (selectedHubs.has(code)) { selectedHubs.delete(code); el.classList.remove('selected'); }
      else { selectedHubs.add(code); el.classList.add('selected'); }
      updateSummary();
      // show full airline list in a compact popup under the hub
      showAirlineListForHub(el, code);
    });
  });
}

/* Показываем/обновляем всплывающий список авиакомпаний под карточкой хаба */
function showAirlineListForHub(hubEl, hubCode){
  // если уже есть блок внутри — toggle remove
  const existing = hubEl.querySelector('.hub-airlines');
  if (existing){
    existing.remove();
    return;
  }
  const alist = HUB_AIRLINE_MAP[hubCode] || [];
  const listHtml = alist.length ? alist.map(s => {
    const a = airlineByShort(s);
    return `<div class="hub-airline-row"><span class="flag">${a?.flag||''}</span> <strong>${a?.name||s}</strong> <span class="muted">(${s})</span></div>`;
  }).join('') : '<div class="hub-airline-row muted">Авиакомпаний нет</div>';
  const container = document.createElement('div');
  container.className = 'hub-airlines';
  container.style.cssText = 'margin-top:10px;padding:10px;border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,0.02),transparent);border:1px solid rgba(255,255,255,0.03)';
  container.innerHTML = listHtml;
  hubEl.appendChild(container);
}

/* Render durations, fleet, interactions — как было */
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

/* summary + generate logic */
function updateSummary(){
  const hubs = Array.from(selectedHubs).join(', ') || '—';
  summaryEl.textContent = `Выбрано: ${hubs}${selectedDuration ? ' · ' + selectedDuration + 'ч' : ''}`;
}

genBtn.addEventListener('click', ()=> {
  if (!currentUser) { openLoginModal(); return; }
  if (!selectedHubs.size || !selectedDuration) { alert('Выберите как минимум один хаб и длительность'); return; }
  const payload = { hubs: Array.from(selectedHubs), duration: selectedDuration, user: currentUser };
  if (window.onGenerateSelected && typeof window.onGenerateSelected === 'function') {
    window.onGenerateSelected(payload);
  } else {
    resultArea.hidden = false;
    resultArea.innerHTML = `<div class="card-inner"><strong>Рейс сгенерирован</strong><div class="muted" style="margin-top:8px">Пилот: ${currentUser.callsign || currentUser || '—'} · Хабы: ${payload.hubs.join(', ')} · Длительность: ${payload.duration}ч</div></div>`;
  }
});

/* demo/reset/login — оставлены без изменений (используй версии из текущего ui.js) */
// ... (оставляем demoBtn, resetBtn, login modal и остальной код, как в предыдущей версии ui.js)


// Инициализация (вызвать после загрузки DOM)
renderHubs();
renderDurations();
renderFleet();
updateSummary();
