// ui.js — интерфейс: хабы, длительности, генератор, рандомайзер
// Загружается после auth.js; рендерится после события 'lh:auth:ready'.

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
  { short: 'DLA',  name: 'Air Dolomiti', flag: '🇮🇹', hubs: ['EDDF','EDDM'] },
  { short: 'AZ',   name: 'ITA Airways', flag: '🇮🇹', hubs: ['LIRF'] },
  { short: 'WIF',  name: 'Widerøe', flag: '🇳🇴', hubs: ['ENBR','ENGM'] },
  { short: 'DY',   name: 'Norwegian Airlines', flag: '🇳🇴', hubs: ['ENGM'] },
  { short: 'AY',   name: 'Finnair', flag: '🇫🇮', hubs: ['EFHK'] },
  { short: 'SAS',  name: 'SAS Scandinavian Airlines', flag: '🇩🇰🇸🇪🇳🇴', hubs: ['EKCH','ENGM'] },
  { short: 'COND', name: 'Condor', flag: '🇩🇪', hubs: ['EDDF','EDDM'] },
  { short: '3S',   name: 'AeroLogic', flag: '🇩🇪', hubs: ['EDDF'] },
  { short: 'XQ',   name: 'SunExpress', flag: '🇹🇷', hubs: ['EDDF','EDDM'] }
];

const FLEET = [
  { type:'A320', id:'LH-A320-01', base:'EDDF', rangeKm:6100, dist:'6100 km', seats:180, status:'idle' },
  { type:'A321', id:'LH-A321-02', base:'EDDM', rangeKm:6100, dist:'6100 km', seats:200, status:'idle' },
  { type:'E190', id:'LH-E190-01', base:'EDDF', rangeKm:4000, dist:'4000 km', seats:100, status:'idle' },
  { type:'737MAX', id:'LH-737MAX-01', base:'EDDM', rangeKm:6600, dist:'6600 km', seats:190, status:'idle' },
  { type:'B787', id:'LH-787-01', base:'EDDF', rangeKm:14140, dist:'14140 km', seats:270, status:'idle' },
  { type:'A350', id:'LH-A350-01', base:'EDDM', rangeKm:15000, dist:'15000 km', seats:300, status:'idle' }
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

function airlinesForHub(code){ return AIRLINES.filter(a => (a.hubs||[]).includes(code)); }
function estimateRequiredRange(hours){ const speed = 820; const buffer = 1.15; return Math.ceil(hours * speed * buffer); }
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr; }

function renderHubs(){
  if (!hubsEl) return;
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
  hubsEl.querySelectorAll('.hub').forEach(el=> el.addEventListener('click', ()=> onHubClick(el)));
}

function renderDurations(){
  if (!durationsEl) return;
  durationsEl.innerHTML = [
    {id:'1-2',label:'1–2ч ~ 2ч',val:2},
    {id:'3-4',label:'3–4ч ~ 4ч',val:4},
    {id:'5-6',label:'5–6ч ~ 6ч',val:6},
    {id:'7-8',label:'7–8ч ~ 8ч',val:8},
    {id:'9-10',label:'9–10ч ~ 10ч',val:10},
    {id:'10+',label:'10+ч ~ 15ч',val:15}
  ].map(d=>`<div class="duration" data-id="${d.id}" data-val="${d.val}">${d.label}</div>`).join('');
  durationsEl.querySelectorAll('.duration').forEach(el=>{
    el.addEventListener('click', ()=> {
      durationsEl.querySelectorAll('.duration').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
      selectedDuration = Number(el.dataset.val);
      updateSummary();
    });
  });
}

function renderFleet(list){
  if (!fleetListEl) return;
  if (!list || !list.length){
    fleetListEl.innerHTML = '<div class="muted small">Флот будет показан после генерации рейса</div>';
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

function onHubClick(hubEl){
  const code = hubEl.dataset.code;
  if (selectedHubs.has(code)){ selectedHubs.delete(code); hubEl.classList.remove('selected'); }
  else { selectedHubs.add(code); hubEl.classList.add('selected'); }
  updateSummary();

  const existing = hubEl.querySelector('.hub-airlines');
  if (existing){ existing.remove(); return; }

  const airlines = airlinesForHub(code);
  const container = document.createElement('div');
  container.className = 'hub-airlines';
  container.style.cssText = 'margin-top:10px;padding:10px;border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,0.02),transparent);border:1px solid rgba(255,255,255,0.03)';
  if (!airlines.length){ container.innerHTML = '<div class="hub-airline-row muted">Авиакомпаний нет</div>'; hubEl.appendChild(container); return; }

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

function updateSummary(){
  const hubs = Array.from(selectedHubs).join(', ') || '—';
  summaryEl.textContent = `Выбрано: ${hubs}${selectedDuration ? ' · ' + selectedDuration + 'ч' : ''}`;
}

function estimateRequiredRange(hours){ const speed = 820; const buffer = 1.15; return Math.ceil(hours * speed * buffer); }

function randomizeAircraft({ hubs=[], duration }){
  const requiredKm = estimateRequiredRange(duration);
  let candidates = FLEET.filter(f => f.rangeKm >= requiredKm && f.status === 'idle');
  if (hubs && hubs.length){
    const byBase = candidates.filter(f => hubs.includes(f.base));
    if (byBase.length) candidates = byBase;
  }
  if (!candidates.length) candidates = FLEET.filter(f => f.rangeKm >= requiredKm && f.status === 'idle');
  if (!candidates.length) return [];
  shuffle(candidates);
  const chosen = candidates[0];
  chosen.status = 'inFlight';
  return [chosen];
}

genBtn?.addEventListener('click', async ()=>{
  currentUser = window.CURRENT_USER || null;
  if (!currentUser){ document.dispatchEvent(new CustomEvent('request:auth')); return; }
  if (!selectedHubs.size || !selectedDuration){ alert('Выберите как минимум один хаб и длительность'); return; }
  const payload = { hubs: Array.from(selectedHubs), duration: selectedDuration, user: currentUser };

  let chosen = [];
  if (window.onGenerateSelected && typeof window.onGenerateSelected === 'function'){
    try {
      const res = window.onGenerateSelected(payload);
      if (res && typeof res.then === 'function'){ chosen = await res; }
      else chosen = res || randomizeAircraft(payload);
    } catch(e){
      console.error(e);
      chosen = randomizeAircraft(payload);
    }
  } else {
    chosen = randomizeAircraft(payload);
  }

  if (!chosen || !chosen.length){
    resultArea.hidden = false;
    resultArea.innerHTML = `<div class="card-inner"><strong>Нет доступного флота</strong><div class="muted" style="margin-top:8px">Попробуйте другую длительность или хаб</div></div>`;
    renderFleet([]);
    prependLog(`Генерация: нет доступного флота (user: ${currentUser?.callsign||'—'})`);
    return;
  }

  resultArea.hidden = false;
  const s = chosen.map(f => `${f.type} ${f.id} (${f.base})`).join(', ');
  resultArea.innerHTML = `<div class="card-inner"><strong>Рейс сгенерирован</strong><div class="muted" style="margin-top:8px">Назначен самолёт: ${s}</div></div>`;
  renderFleet(chosen);
  prependLog(`Генерация: ${currentUser?.callsign||'—'} → ${s}`);
});

demoBtn?.addEventListener('click', ()=> {
  selectedHubs = new Set(['EDDF','EDDM']);
  selectedDuration = 6;
  document.querySelectorAll('.duration').forEach(x=>x.classList.toggle('selected', x.dataset.val==6));
  document.querySelectorAll('.hub').forEach(h=>h.classList.toggle('selected', selectedHubs.has(h.dataset.code)));
  updateSummary();
});

resetBtn?.addEventListener('click', ()=> {
  selectedHubs.clear(); selectedDuration = null;
  document.querySelectorAll('.duration').forEach(x=>x.classList.remove('selected'));
  document.querySelectorAll('.hub').forEach(h=>h.classList.remove('selected'));
  resultArea.hidden = true; resultArea.innerHTML = '';
  renderFleet([]);
  updateSummary();
});

function prependLog(text){
  const el = document.createElement('div'); el.textContent = `${new Date().toLocaleString()} — ${text}`;
  if (logArea) logArea.prepend(el);
}

document.addEventListener('lh:auth:ready', ()=> {
  currentUser = window.CURRENT_USER || null;
  renderHubs();
  renderDurations();
  renderFleet([]);
  updateSummary();
});
