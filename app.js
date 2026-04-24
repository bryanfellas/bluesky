const API_KEY = "9ab17852f086bf8da37bef15dc178a72";
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const IS_DEMO  = API_KEY === 'COLOQUE_SUA_CHAVE_AQUI';

let unit      = 'C';
let state     = null;
let fromGeo   = false;
let clockTZ   = null;
let clockInterval = null;

const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function toggleTheme() {
  const html = document.documentElement;
  html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  if (state) render(state);
}

function startClock(timezone, cityName) {
  clockTZ = timezone;
  const cityEl = document.getElementById('clockCity');
  if (cityEl && cityName) cityEl.textContent = cityName;
  if (clockInterval) clearInterval(clockInterval);
  tickClock();
  clockInterval = setInterval(tickClock, 1000);
}

function tickClock() {
  const el = document.getElementById('clockTime');
  if (!el) return;
  const now = clockTZ
    ? new Date(new Date().toLocaleString('en-US', { timeZone: clockTZ }))
    : new Date();
  el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function dateStr() {
  const n = new Date();
  return `${DAYS[n.getDay()]}, ${n.getDate()} de ${MONTHS[n.getMonth()]} · ${pad(n.getHours())}:${pad(n.getMinutes())}`;
}

function pad(n) { return String(n).padStart(2, '0'); }
function toF(c) { return Math.round(c * 9 / 5 + 32); }
function T(c)   { return unit === 'C' ? Math.round(c) : toF(c); }
function fmt(c) { return `${T(c)}°`; }

function weatherIcon(code) {
  const map = {
    '01d':'☀️','01n':'🌙','02d':'⛅','02n':'🌙',
    '03d':'☁️','03n':'☁️','04d':'☁️','04n':'☁️',
    '09d':'🌧️','09n':'🌧️','10d':'🌦️','10n':'🌧️',
    '11d':'⛈️','11n':'⛈️','13d':'❄️','13n':'❄️',
    '50d':'🌫️','50n':'🌫️'
  };
  return map[code] || map[code?.slice(0,2)+'d'] || '🌡️';
}

function heroBg(code) {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const p = code?.slice(0, 2);
  const light = {
    '01':'#fff8e8','02':'#eef4fc','03':'#eaf0f8',
    '04':'#e4eaf3','09':'#deeaf7','10':'#deeaf7',
    '11':'#eae8f5','13':'#eef3ff','50':'#eeeeee'
  };
  const dk = {
    '01':'#1a160a','02':'#0c1520','03':'#0e161e',
    '04':'#0c1118','09':'#0a1320','10':'#0a1320',
    '11':'#110d24','13':'#0c1226','50':'#0e0e0e'
  };
  return (dark ? dk[p] : light[p]) || (dark ? '#0e1120' : '#f0f4ff');
}

function decoColor(code) {
  const p = code?.slice(0, 2);
  const map = {
    '01':'#f6c21c','02':'#4285f4','03':'#90a4ae',
    '04':'#78909c','09':'#1a56db','10':'#1a56db',
    '11':'#5c35cc','13':'#90caf9','50':'#b0bec5'
  };
  return map[p] || '#4285f4';
}

function showErr(msg) {
  const el = document.getElementById('err');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

function setUnit(u) {
  unit = u;
  document.getElementById('bC').className = u === 'C' ? 'on' : '';
  document.getElementById('bF').className = u === 'F' ? 'on' : '';
  if (state) render(state);
}

function showLoading(msg) {
  document.getElementById('root').innerHTML = `<div class="geo-status"><div class="geo-spin"></div><br>${msg}</div>`;
}

function getGeo() {
  if (!navigator.geolocation) { showErr('Geolocalização não disponível neste navegador.'); return; }
  showLoading('Detectando sua localização...');
  fromGeo = true;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      if (IS_DEMO) { loadDemo('Sua Localização', true); return; }
      try {
        const [cur, fc] = await Promise.all([
          fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt_br`).then(r => r.json()),
          fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt_br`).then(r => r.json())
        ]);
        state = { cur, fc };
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        startClock(tz, cur.name);
        render(state);
      } catch {
        showErr('Erro ao buscar dados de localização.');
        document.getElementById('root').innerHTML = '';
      }
    },
    () => {
      showErr('Permissão negada. Busque uma cidade manualmente.');
      document.getElementById('root').innerHTML = `<div class="empty"><div class="empty-icon">📍</div><p>Localização negada.<br>Digite uma cidade na busca acima.</p></div>`;
      fromGeo = false;
    }
  );
}

async function search() {
  const city = document.getElementById('inp').value.trim();
  if (!city) return;
  fromGeo = false;
  showLoading('Buscando...');
  if (IS_DEMO) { loadDemo(city, false); return; }
  try {
    const [cur, fc] = await Promise.all([
      fetch(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=pt_br`).then(r => r.json()),
      fetch(`${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=pt_br`).then(r => r.json())
    ]);
    if (cur.cod !== 200) {
      showErr('Cidade não encontrada. Tente outro nome.');
      document.getElementById('root').innerHTML = '';
      return;
    }
    state = { cur, fc };
    const offsetSec = cur.timezone;
    const tzName = offsetToTZ(offsetSec);
    startClock(tzName, cur.name);
    render(state);
  } catch {
    showErr('Erro de conexão. Verifique sua API Key.');
  }
}

function offsetToTZ(offsetSeconds) {
  const h = Math.floor(Math.abs(offsetSeconds) / 3600);
  const m = Math.floor((Math.abs(offsetSeconds) % 3600) / 60);
  const sign = offsetSeconds >= 0 ? '+' : '-';
  return `Etc/GMT${sign === '+' ? '-' : '+'}${h}`;
}

function render({ cur, fc }) {
  const ico  = cur.weather[0].icon;
  const bg   = heroBg(ico);
  const deco = decoColor(ico);

  const geoTag = fromGeo
    ? `<div class="geo-tag"><svg width="9" height="9" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="2" fill="currentColor"/><line x1="5" y1="0" x2="5" y2="3" stroke="currentColor" stroke-width="1.5"/><line x1="5" y1="7" x2="5" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="0" y1="5" x2="3" y2="5" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="1.5"/></svg>Sua localização</div>`
    : '';

  const hourlyHTML = fc.list.slice(0, 8).map((h, i) => {
    const d   = new Date(h.dt * 1000);
    const lbl = i === 0 ? 'Agora' : `${pad(d.getHours())}h`;
    return `<div class="hr ${i === 0 ? 'now' : ''}"><div class="hr-t">${lbl}</div><div class="hr-ic">${weatherIcon(h.weather[0].icon)}</div><div class="hr-tp">${fmt(h.main.temp)}</div></div>`;
  }).join('');

  const daily = {};
  fc.list.forEach(h => {
    const d = new Date(h.dt * 1000);
    const k = d.toDateString();
    if (!daily[k]) daily[k] = { temps: [], icon: h.weather[0].icon, desc: h.weather[0].description, d };
    daily[k].temps.push(h.main.temp);
  });

  const forecastHTML = Object.values(daily).slice(0, 5).map((d, i) => {
    const max = Math.max(...d.temps);
    const min = Math.min(...d.temps);
    const lbl = i === 0 ? 'Hoje' : DAYS[d.d.getDay()];
    return `<div class="fc-row"><div class="fc-day">${lbl}</div><div class="fc-ic">${weatherIcon(d.icon)}</div><div class="fc-dc">${d.desc}</div><div class="fc-tp">${fmt(max)} <span>${fmt(min)}</span></div></div>`;
  }).join('');

  const sunrise = new Date(cur.sys.sunrise * 1000);
  const sunset  = new Date(cur.sys.sunset * 1000);
  const srStr   = `${pad(sunrise.getHours())}:${pad(sunrise.getMinutes())}`;
  const ssStr   = `${pad(sunset.getHours())}:${pad(sunset.getMinutes())}`;
  const vis     = cur.visibility ? `${(cur.visibility / 1000).toFixed(1)} km` : '—';

  document.getElementById('root').innerHTML = `
    <div class="hero" style="background:${bg}">
      <div class="hero-deco" style="background:${deco}"></div>
      <div class="hero-deco-2" style="background:${deco}"></div>
      <div class="hero-deco-3" style="background:${deco}"></div>
      <div class="hero-top">
        <div>
          <div class="city-nm">${cur.name}, ${cur.sys.country}</div>
          <div class="city-dt">${dateStr()}</div>
          ${geoTag}
        </div>
        <div class="w-icon">${weatherIcon(ico)}</div>
      </div>
      <div class="temp-block">
        <div><span class="temp-big">${T(cur.main.temp)}</span><span class="temp-unit-label">°${unit}</span></div>
        <div class="temp-desc">${cur.weather[0].description}</div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-ico">🌡️</div><div class="stat-lbl">Sensação</div><div class="stat-val">${fmt(cur.main.feels_like)}</div></div>
        <div class="stat"><div class="stat-ico">💧</div><div class="stat-lbl">Umidade</div><div class="stat-val">${cur.main.humidity}%</div></div>
        <div class="stat"><div class="stat-ico">💨</div><div class="stat-lbl">Vento</div><div class="stat-val">${Math.round(cur.wind.speed * 3.6)} km/h</div></div>
      </div>
    </div>
    <div class="extra">
      <div class="extra-card">
        <div class="sec-lbl">Nascer & pôr do sol</div>
        <div class="extra-val">☀️</div>
        <div class="extra-sub">↑ ${srStr} &nbsp;·&nbsp; ↓ ${ssStr}</div>
      </div>
      <div class="extra-card">
        <div class="sec-lbl">Visibilidade</div>
        <div class="extra-val" style="font-size:1.5rem">${vis}</div>
        <div class="extra-sub">Pressão: ${cur.main.pressure} hPa</div>
      </div>
    </div>
    <div class="card">
      <div class="sec-lbl">Próximas horas</div>
      <div class="hourly">${hourlyHTML}</div>
    </div>
    <div class="card">
      <div class="sec-lbl">Previsão para 5 dias</div>
      ${forecastHTML}
    </div>`;
}

function loadDemo(city, geo = false) {
  fromGeo = geo;
  const now = Math.floor(Date.now() / 1000);
  const fakeCur = {
    name: city,
    sys:  { country: 'BR', sunrise: now - 21600, sunset: now + 21600 },
    weather: [{ icon: '02d', description: 'parcialmente nublado' }],
    main: { temp: 26, feels_like: 28, humidity: 65, pressure: 1012 },
    wind: { speed: 3.8 },
    visibility: 10000,
    timezone: -10800
  };
  const icons = ['02d','03d','10d','10d','01d','02d','01d','01d'];
  const temps = [26, 25, 24, 22, 21, 22, 24, 26];
  const fakeList = temps.map((t, i) => ({
    dt: now + i * 10800,
    main: { temp: t },
    weather: [{ icon: icons[i], description: 'variado' }]
  }));
  for (let d = 1; d <= 4; d++) {
    [28, 27, 23, 25].forEach((t, j) => {
      fakeList.push({ dt: now + d * 86400 + j * 21600, main: { temp: t + d }, weather: [{ icon: ['01d','02d','10d','02d','01d'][d], description: 'variado' }] });
    });
  }
  state = { cur: fakeCur, fc: { list: fakeList } };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  startClock(tz, city);
  render(state);
}

getGeo();
