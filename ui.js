// ui.js — полный, с randomizeAircraft и блокировкой интерфейса до аутентификации
// Предполагается, что auth.js загружён до ui.js

// данные (hubs, airlines, fleet) — как в предыдущем файле; добавляем поле rangeKm для самолётов (макс дальность)
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

// краткий AIRLINES — см. ранее; каждая airline имеет hubs[]
const AIRLINES = [ /* ... (как в предыдущем файле) ... */ ];

// Флот: добавил rangeKm — максимально практическая дальность
const FLEET = [
  { type:'A320', id:'LH-A320-01', base:'EDDF', rangeKm:6100, dist:'6100 km', seats:180, status:'idle' },
  { type:'A321', id:'LH-A321-02', base:'EDDM', rangeKm:6100, dist:'6100 km', seats:200, status:'idle' },
  { type:'E190', id:'LH-E190-01', base:'EDDF', rangeKm:4000, dist:'4000 km', seats:100, status:'idle' },
  { type:'737MAX', id:'LH-737MAX-01', base:'EDDM', rangeKm:6600, dist:'6600 km', seats:190, status:'idle' },
  { type:'B787', id:'LH-787-01', base:'EDDF', rangeKm:14140, dist:'14140 km', seats:270, status:'idle' },
  { type:'A350', id:'LH-A350-01', base:'EDDM', rangeKm:15000, dist:'15000 km', seats:300, status:'idle' }
];

// state & elements
let selectedHubs = new Set();
let selectedDuration = null;
let availableFleet = []; // вычисляется после генерации
let currentUser = window.CURRENT_USER || null;

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

// helper: estimate required distance from duration (ч)
// используем среднюю крейсерскую скорость 820 km/h и запас 1.15
function estimateRequiredRange(hours){
  const speed = 820;
  const buffer = 1.15;
  return Math.ceil(hours * speed * buffer);
}

// randomizer: выбирает подходящий самолет(ы) по требованиям:
// - rangeKm >= requiredKm
// - base ∈ selectedHubs (если в selectedHubs пусто — игнорируем базу)
// - status === 'idle'
// Возвращает массив подходящих самолетов (рандомный порядок, можно взять первый)
function randomizeAircraft({ hubs=[], duration }){
  const requiredKm = estimateRequiredRange(duration);
  // фильтр
  let candidates = FLEET.filter(f => f.rangeKm >= requiredKm && f.status === 'idle');
  if (hubs && hubs.length){
    candidates = candidates.filter(f => hubs.includes(f.base));
  }
  // если нет кандидатов с базой — расширяем поиск (любая база)
  if (!candidates.length){
    candidates = FLEET.filter(f => f.rangeKm >= requiredKm && f.status === 'idle');
  }
  // если по-прежнему нет — возвращаем пустой массив (нет доступных)
  if (!candidates.length) return [];

  // shuffle
  for (let i = candidates.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  // пометим выбранный самолет как занятый (локально) — изменим статус
  const selected = candidates[0];
  selected.status = 'inFlight';
  return [selected];
}

// render hub, durations, fleet (fleet скрыт до генерации)
function renderHubs(){ /* copy implementation from previous ui.js (render hubs with airline preview) */ }
function renderDurations(){ /* copy implementation from previous ui.js */ }

// render fleet accepts list; if empty -> show message
function renderFleet(list){
  if (!list || !list.length){
    fleetListEl.innerHTML = '<div class="muted small">Нет доступных самолётов для выбранных параметров</div>';
    return;
  }
  fleetListEl.innerHTML = list.map(f => {
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

// update summary and signed user
function updateSummary(){
  signedUserEl.textContent = (window.CURRENT_USER && window.CURRENT_USER.callsign) || (currentUser && currentUser.callsign) || '—';
  const hubs = Array.from(selectedHubs).join(', ') || '—';
  summaryEl.textContent = `Выбрано: ${hubs}${selectedDuration ? ' · ' + selectedDuration + 'ч' : ''}`;
}

// generate logic: вызывает randomizer, рендерит результат и флот
genBtn.addEventListener('click', async ()=>{
  // ensure auth ready
  currentUser = window.CURRENT_USER || loadFromLocalSession();
  if (!currentUser){
    // запросим вход
    document.dispatchEvent(new CustomEvent('request:auth'));
    return;
  }
  if (!selectedHubs.size || !selectedDuration){
    alert('Выберите хаб и длительность');
    return;
  }
  const payload = { hubs: Array.from(selectedHubs), duration: selectedDuration, user: currentUser };
  // попробуем вызвать внешний hook, если он есть
  if (window.onGenerateSelected && typeof window.onGenerateSelected === 'function'){
    // если внешний hook вернёт Promise с availableFleet — используем его
    try {
      const res = window.onGenerateSelected(payload);
      if (res && typeof res.then === 'function'){
        const available = await res;
        availableFleet = available && available.length ? available : randomizeAircraft(payload);
      } else {
        availableFleet = (Array.isArray(res) && res.length) ? res : randomizeAircraft(payload);
      }
    } catch (e){
      console.error(e);
      availableFleet = randomizeAircraft(payload);
    }
  } else {
    availableFleet = randomizeAircraft(payload);
  }

  // render result and fleet
  if (!availableFleet.length){
    resultArea.hidden = false;
    resultArea.innerHTML = `<div class="card-inner"><strong>Нет доступного флота</strong><div class="muted" style="margin-top:8px">Попробуйте другую длительность или хаб</div></div>`;
    renderFleet([]);
    prependLog(`Генерация: нет доступного флота (user: ${currentUser.callsign || '—'})`);
    return;
  }

  resultArea.hidden = false;
  const s = availableFleet.map(f => `${f.type} ${f.id} (${f.base})`).join(', ');
  resultArea.innerHTML = `<div class="card-inner"><strong>Рейс сгенерирован</strong><div class="muted" style="margin-top:8px">Назначен самолёт: ${s}</div></div>`;
  renderFleet(availableFleet);
  prependLog(`Генерация: ${currentUser.callsign || '—'} → ${s}`);
});

// demo/reset/login handlers (используй из auth.js)
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
  renderFleet([]); // скрыть флот
  updateSummary();
});

/* small log */
function prependLog(msg){
  const node = document.createElement('div'); node.textContent = `${new Date().toLocaleString()} — ${msg}`;
  if (logArea) logArea.prepend(node);
}

/* init — wait for auth ready event from auth.js */
document.addEventListener('lh:auth:ready', ()=> {
  currentUser = window.CURRENT_USER || null;
  // render UI now (safe to show)
  renderHubs();
  renderDurations();
  renderFleet([]); // empty until generation
  updateSummary();
});

// if the page loaded and auth already ready, init immediately
if (loadSession()) {
  document.dispatchEvent(new Event('lh:auth:ready'));
}
