/* WEATHER — live weather in the pixel-art dock at the bottom of the desktop.
   Data: Open-Meteo (no API key). Scene is drawn on a tiny canvas and scaled
   up with image-rendering:pixelated so every "pixel" is a chunky block. */

const WEATHER_REFRESH_MS = 10 * 60 * 1000;
const DEFAULT_PLACE = { name: 'Dhaka', country: 'Bangladesh', latitude: 23.7104, longitude: 90.40744 };
const DHAKA_LABEL = `${DEFAULT_PLACE.name}, ${DEFAULT_PLACE.country}`;

// WMO weather codes -> label + which animation to play
const WEATHER_CODES = {
  0: ['Clear Sky', 'clear'],
  1: ['Mainly Clear', 'clear'],
  2: ['Partly Cloudy', 'cloudy'],
  3: ['Overcast', 'overcast'],
  45: ['Fog', 'fog'],
  48: ['Freezing Fog', 'fog'],
  51: ['Light Drizzle', 'rain'],
  53: ['Drizzle', 'rain'],
  55: ['Heavy Drizzle', 'rain'],
  56: ['Freezing Drizzle', 'rain'],
  57: ['Freezing Drizzle', 'rain'],
  61: ['Light Rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy Rain', 'rain'],
  66: ['Freezing Rain', 'rain'],
  67: ['Freezing Rain', 'rain'],
  71: ['Light Snow', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy Snow', 'snow'],
  77: ['Snow Grains', 'snow'],
  80: ['Rain Showers', 'rain'],
  81: ['Rain Showers', 'rain'],
  82: ['Violent Showers', 'rain'],
  85: ['Snow Showers', 'snow'],
  86: ['Snow Showers', 'snow'],
  95: ['Thunderstorm', 'storm'],
  96: ['Thunderstorm + Hail', 'storm'],
  99: ['Thunderstorm + Hail', 'storm']
};

const PALETTE = {
  day: { sky: ['#6fd3f5', '#8fe0f7', '#b6ecfb'], hill: '#2f7d4f', hillDark: '#1f5c39', ground: '#3f8f5b' },
  night: { sky: ['#0b1030', '#141b4a', '#1e2a63'], hill: '#1b3a55', hillDark: '#12283b', ground: '#1d3f45' }
};

const weatherCanvas = document.getElementById('weatherCanvas');
const weatherCtx = weatherCanvas.getContext('2d');
weatherCtx.imageSmoothingEnabled = false;

const W = weatherCanvas.width;
const H = weatherCanvas.height;
const HORIZON = H - 12;

let sceneKind = 'clear';
let isDay = true;
let sceneFrame = 0;
let sceneAnimationId = null;
let refreshTimer = null;
let currentPlace = null;
let flashUntil = -1;
let nextFlash = 240;

const clouds = [];
const drops = [];
const flakes = [];
const stars = [];

function seedScene() {
  for (let i = 0; i < 4; i++) {
    clouds.push({ x: Math.random() * W, y: 6 + Math.random() * 18, w: 14 + Math.random() * 12, speed: 0.05 + Math.random() * 0.12 });
  }
  for (let i = 0; i < 60; i++) {
    drops.push({ x: Math.random() * W, y: Math.random() * HORIZON, len: 2 + Math.floor(Math.random() * 3), speed: 1.6 + Math.random() * 1.6 });
  }
  for (let i = 0; i < 40; i++) {
    flakes.push({ x: Math.random() * W, y: Math.random() * HORIZON, speed: 0.25 + Math.random() * 0.35, drift: Math.random() * Math.PI * 2 });
  }
  for (let i = 0; i < 34; i++) {
    stars.push({ x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * (HORIZON - 14)), phase: Math.random() * Math.PI * 2 });
  }
}

function px(x, y, w, h, color) {
  weatherCtx.fillStyle = color;
  weatherCtx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawSky(palette) {
  const bands = palette.sky;
  const bandHeight = Math.ceil(HORIZON / bands.length);
  bands.forEach((color, i) => px(0, i * bandHeight, W, bandHeight, color));
}

function drawSun() {
  const cx = W - 24;
  const cy = 16;
  const pulse = Math.sin(sceneFrame / 30) > 0 ? 1 : 0;

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + sceneFrame / 120;
    const r = 10 + pulse;
    px(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 2, 2, '#ffe066');
  }
  px(cx - 5, cy - 3, 10, 6, '#ffd21f');
  px(cx - 3, cy - 5, 6, 10, '#ffd21f');
  px(cx - 3, cy - 3, 4, 4, '#fff3a8');
}

function drawMoon() {
  const cx = W - 24;
  const cy = 15;
  px(cx - 5, cy - 3, 10, 6, '#e8eefc');
  px(cx - 3, cy - 5, 6, 10, '#e8eefc');
  px(cx - 1, cy - 4, 5, 8, '#b9c6ea');
  px(cx + 1, cy - 3, 5, 6, '#0b1030');
}

function drawStars() {
  stars.forEach(s => {
    const twinkle = Math.sin(sceneFrame / 18 + s.phase);
    if (twinkle > -0.2) px(s.x, s.y, 1, 1, twinkle > 0.7 ? '#ffffff' : '#9fb4e8');
  });
}

function drawCloud(cloud, color) {
  const { x, y, w } = cloud;
  px(x, y + 3, w, 4, color);
  px(x + 3, y, w - 8, 4, color);
  px(x + w - 6, y + 1, 5, 3, color);
}

function drawClouds(count, color, speedScale) {
  for (let i = 0; i < count; i++) {
    const cloud = clouds[i % clouds.length];
    cloud.x -= cloud.speed * speedScale;
    if (cloud.x + cloud.w < 0) cloud.x = W + Math.random() * 20;
    drawCloud(cloud, color);
  }
}

function drawRain(intensity, color) {
  for (let i = 0; i < intensity; i++) {
    const d = drops[i];
    d.y += d.speed;
    d.x -= 0.6;
    if (d.y > HORIZON) {
      d.y = -2;
      d.x = Math.random() * W;
      px(d.x, HORIZON - 1, 2, 1, color); // splash on the ground
    }
    if (d.x < 0) d.x = W;
    px(d.x, d.y, 1, d.len, color);
  }
}

function drawSnow() {
  flakes.forEach(f => {
    f.y += f.speed;
    f.drift += 0.05;
    if (f.y > HORIZON) {
      f.y = -1;
      f.x = Math.random() * W;
    }
    px(f.x + Math.sin(f.drift) * 3, f.y, 1, 1, '#ffffff');
  });
}

function drawFog() {
  for (let i = 0; i < 5; i++) {
    const y = 12 + i * 7;
    const offset = (sceneFrame / (5 + i * 3)) % (W * 2);
    weatherCtx.fillStyle = 'rgba(226,236,240,0.35)';
    weatherCtx.fillRect(-W + offset, y, W, 3);
    weatherCtx.fillRect(offset, y, W, 3);
  }
}

function drawLightning() {
  if (sceneFrame > nextFlash) {
    flashUntil = sceneFrame + 4;
    nextFlash = sceneFrame + 120 + Math.floor(Math.random() * 240);
  }
  if (sceneFrame > flashUntil) return;

  weatherCtx.fillStyle = 'rgba(255,255,255,0.55)';
  weatherCtx.fillRect(0, 0, W, HORIZON);

  const x = W / 2 - 14;
  px(x, 10, 2, 6, '#fff7b0');
  px(x - 2, 16, 2, 6, '#fff7b0');
  px(x, 22, 2, 6, '#fff7b0');
  px(x - 2, 28, 2, 5, '#fff7b0');
}

function drawGround(palette) {
  // rolling pixel hills behind the ground strip
  for (let x = 0; x < W; x++) {
    const h = 4 + Math.round(Math.sin(x / 9) * 2 + Math.sin(x / 4) * 1);
    px(x, HORIZON - h, 1, h, palette.hill);
  }
  px(0, HORIZON, W, H - HORIZON, palette.ground);
  for (let x = 0; x < W; x += 2) px(x, HORIZON, 1, 1, palette.hillDark);
}

function drawScene() {
  const palette = isDay ? PALETTE.day : PALETTE.night;
  drawSky(palette);

  if (!isDay) drawStars();

  if (sceneKind === 'clear') {
    isDay ? drawSun() : drawMoon();
    drawClouds(1, isDay ? '#ffffff' : '#3d4a80', 1);
  } else if (sceneKind === 'cloudy') {
    isDay ? drawSun() : drawMoon();
    drawClouds(3, isDay ? '#ffffff' : '#3d4a80', 1);
  } else if (sceneKind === 'overcast') {
    drawClouds(4, isDay ? '#d8e2e6' : '#2e3765', 1.4);
  } else if (sceneKind === 'fog') {
    drawClouds(2, isDay ? '#dfe8ea' : '#2e3765', 0.6);
    drawFog();
  } else if (sceneKind === 'rain') {
    drawClouds(4, isDay ? '#9fb0b8' : '#242c58', 1.6);
    drawRain(40, isDay ? '#8fd6ff' : '#5f8fd0');
  } else if (sceneKind === 'snow') {
    drawClouds(4, isDay ? '#cfdbe0' : '#2b3462', 1.2);
    drawSnow();
  } else if (sceneKind === 'storm') {
    drawClouds(4, isDay ? '#6f7f8a' : '#1c2350', 2);
    drawRain(60, '#7fc2ff');
    drawLightning();
  }

  drawGround(palette);
}

function sceneLoop() {
  sceneFrame++;
  drawScene();
  sceneAnimationId = requestAnimationFrame(sceneLoop);
}

function startScene() {
  if (sceneAnimationId !== null) return;
  sceneLoop();
}

function stopScene() {
  cancelAnimationFrame(sceneAnimationId);
  sceneAnimationId = null;
}

// ---------- data ----------

function setStatus(text) {
  document.getElementById('weather-status').textContent = text;
}

function renderReadout(place, current) {
  const [label, kind] = WEATHER_CODES[current.weather_code] || ['Unknown', 'cloudy'];
  sceneKind = kind;
  isDay = current.is_day === 1;

  document.getElementById('weather-place').textContent =
    (place.country ? `${place.name}, ${place.country}` : place.name).toUpperCase();
  document.getElementById('weather-temp').textContent = `${Math.round(current.temperature_2m)}°C`;
  document.getElementById('weather-condition').textContent = label.toUpperCase();
  document.getElementById('weather-feels').textContent = `${Math.round(current.apparent_temperature)}°C`;
  document.getElementById('weather-humidity').textContent = `${current.relative_humidity_2m}%`;
  document.getElementById('weather-wind').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  document.getElementById('weather-cycle').textContent = isDay ? 'DAY' : 'NIGHT';

  const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  setStatus(`SYNCED ${stamp} · OPEN-METEO`);
}

async function fetchWeather(place) {
  setStatus('CONNECTING TO SATELLITE…');

  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${place.latitude}&longitude=${place.longitude}`
    + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m'
    + '&timezone=auto';

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentPlace = place;
    renderReadout(place, data.current);
  } catch (err) {
    setStatus('SIGNAL LOST — RETRY LATER');
    console.error('Weather fetch failed', err);
  }
}

async function searchPlace(query) {
  setStatus('SCANNING MAP…');

  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const hit = data.results && data.results[0];
    if (!hit) {
      setStatus(`NO SUCH PLACE: ${query.toUpperCase()}`);
      return;
    }
    await fetchWeather({ name: hit.name, country: hit.country, latitude: hit.latitude, longitude: hit.longitude });
  } catch (err) {
    setStatus('MAP LOOKUP FAILED');
    console.error('Geocoding failed', err);
  }
}

// ---------- wiring ----------

seedScene();
document.getElementById('weather-place').textContent = DHAKA_LABEL.toUpperCase();

const searchForm = document.getElementById('weather-search');

searchForm.addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('weather-query');
  const query = input.value.trim();
  if (!query) return;
  searchPlace(query);
  input.value = '';
});

// "BD" jumps back to the Bangladesh default
document.getElementById('weather-reset').addEventListener('click', () => fetchWeather(DEFAULT_PLACE));

// The dock is always on screen, so only pause while the tab is in the background
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopScene();
    clearInterval(refreshTimer);
  } else {
    startScene();
    startRefreshTimer();
    if (currentPlace) fetchWeather(currentPlace);
  }
});

function startRefreshTimer() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => currentPlace && fetchWeather(currentPlace), WEATHER_REFRESH_MS);
}

startScene();
startRefreshTimer();
fetchWeather(DEFAULT_PLACE); // Bangladesh on every load; the city input takes it anywhere
