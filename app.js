// ═══════════════════════════════════════════════════════
// LastStop — app.js  (lógica principal de index.html)
// ═══════════════════════════════════════════════════════

// ── STATE ──────────────────────────────────────────────
let uLat = -34.1703, uLng = -70.7444;
let ciudad = 'Rancagua', filtro = 'bus', radio = 1000;
let paraderosFiltrados = [], selId = null;
let map, uMarker, radioCircle;
let stopMarkers = [], trayectoLayers = [];
let mostrarTrayectos = false, pickerActivo = false;
let htabActual = 'lv';

const CITY_COORDS = {
  'Santiago':    [-33.4569, -70.6483],
  'Rancagua':    [-34.1703, -70.7444],
  'Valparaíso':  [-33.0472, -71.6127],
  'Concepción':  [-36.8201, -73.0444],
  'Temuco':      [-38.7359, -72.5904]
};

// ── AUTH UI ────────────────────────────────────────────
function showTab(t) {
  document.querySelectorAll('.auth-tab').forEach((x, i) => x.classList.toggle('active', i === (t === 'login' ? 0 : 1)));
  document.getElementById('panLogin').classList.toggle('show', t === 'login');
  document.getElementById('panRegistro').classList.toggle('show', t === 'registro');
}

function doLogin() {
  const e = document.getElementById('loginEmail').value.trim();
  const p = document.getElementById('loginPass').value;
  const u = DB.auth.login(e, p);
  if (!u) { showAuthErr('loginErr', 'Email o contraseña incorrectos'); return; }
  entrar(u);
}

function doRegistro() {
  const n = document.getElementById('regNombre').value.trim();
  const e = document.getElementById('regEmail').value.trim();
  const p = document.getElementById('regPass').value;
  if (!n || !e || !p) { showAuthErr('regErr', 'Completa todos los campos'); return; }
  if (p.length < 4)   { showAuthErr('regErr', 'La contraseña debe tener al menos 4 caracteres'); return; }
  const r = DB.auth.registro(n, e, p);
  if (r.error) { showAuthErr('regErr', r.error); return; }
  entrar(r);
}

function doInvitado() { entrar(DB.auth.invitado()); }

function showAuthErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function entrar(u) {
  document.getElementById('authOv').classList.add('gone');
  document.getElementById('userAv').textContent   = u.avatar || '👤';
  document.getElementById('userName').textContent = u.nombre;
  document.getElementById('umNombre').textContent = `${u.avatar || '👤'} ${u.nombre}`;
  if (u.rol === 'admin') {
    document.getElementById('umAdmin').style.display    = 'flex';
    document.getElementById('btnAdminHdr').style.display = 'flex';
  }
  initApp();
}

function doLogout() { DB.auth.logout(); location.reload(); }

function toggleMenu() {
  document.getElementById('userMenu').classList.toggle('show');
}

document.addEventListener('click', e => {
  if (!e.target.closest('#userPill') && !e.target.closest('#userMenu'))
    document.getElementById('userMenu').classList.remove('show');
});

// ── INIT ───────────────────────────────────────────────
window.addEventListener('load', () => {
  const s = DB.auth.sesion();
  if (s) entrar(s);
});

function initApp() {
  initMap(uLat, uLng);
  cargarParaderos();
  pedirGPS();
}

// ── GPS ────────────────────────────────────────────────
function pedirGPS() {
  if (!navigator.geolocation || location.protocol === 'file:') { setPill('off'); return; }
  setPill('search');
  navigator.geolocation.getCurrentPosition(pos => {
    uLat = pos.coords.latitude;
    uLng = pos.coords.longitude;
    setPill('ok');
    detectarCiudad();
    map.flyTo([uLat, uLng], 15, { duration: 1 });
    uMarker.setLatLng([uLat, uLng]);
    radioCircle.setLatLng([uLat, uLng]);
    cargarParaderos();
  }, () => setPill('off'), { timeout: 10000, enableHighAccuracy: true });
}

function activarGPS() { pedirGPS(); }
function centrarEnMi() { if (map) map.flyTo([uLat, uLng], 15, { duration: .8 }); }

function setPill(s) {
  const p = document.getElementById('gpsPill');
  const l = document.getElementById('gpsLbl');
  p.className = 'gps-pill';
  if (s === 'ok')     { p.classList.add('gps-ok');  l.textContent = 'GPS activo'; }
  else if (s === 'search') { p.classList.add('gps-ok');  l.textContent = 'Buscando...'; }
  else                { p.classList.add('gps-off'); l.textContent = 'Sin GPS'; }
}

function detectarCiudad() {
  let best = 'Rancagua', min = Infinity;
  for (const [n, [la, ln]] of Object.entries(CITY_COORDS)) {
    const d = Math.hypot(uLat - la, uLng - ln);
    if (d < min) { min = d; best = n; }
  }
  ciudad = best;
  document.getElementById('citySel').value = best;
}

// ── MAP ────────────────────────────────────────────────
function initMap(lat, lng) {
  map = L.map('map', { zoomControl: true }).setView([lat, lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  radioCircle = L.circle([lat, lng], {
    radius: radio, color: '#3b82f6', fillColor: '#3b82f6',
    fillOpacity: .05, weight: 1.5, dashArray: '6 4'
  }).addTo(map);

  const uIco = L.divIcon({
    html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 7px rgba(59,130,246,.2)"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], className: ''
  });
  uMarker = L.marker([lat, lng], { icon: uIco, zIndexOffset: 2000 }).addTo(map);
  uMarker.bindPopup('<div style="color:#f0f2f8;font-weight:700;font-size:13px;padding:8px 12px">📍 Tu ubicación</div>');

  // Click en mapa para seleccionar ubicación exacta
  map.on('click', e => {
    if (!pickerActivo) return;
    uLat = e.latlng.lat;
    uLng = e.latlng.lng;
    uMarker.setLatLng([uLat, uLng]);
    radioCircle.setLatLng([uLat, uLng]);
    togglePicker();
    cargarParaderos();
    map.flyTo([uLat, uLng], 15, { duration: .5 });
  });
}

// ── PICKER DE UBICACIÓN ────────────────────────────────
function togglePicker() {
  pickerActivo = !pickerActivo;
  const p = document.getElementById('locPicker');
  p.classList.toggle('picking', pickerActivo);
  p.textContent = pickerActivo
    ? '🎯 Haz clic en el mapa para ubicarte'
    : '📌 Seleccionar ubicación en mapa';
  map.getContainer().style.cursor = pickerActivo ? 'crosshair' : '';
}

// ── RADIUS ─────────────────────────────────────────────
function updateRadius(v) {
  radio = parseInt(v);
  document.getElementById('radiusVal').textContent =
    radio >= 1000 ? `${(radio / 1000).toFixed(1)} km` : `${radio} m`;
  if (radioCircle) radioCircle.setRadius(radio);
  cargarParaderos();
}

// ── CARGAR PARADEROS ───────────────────────────────────
function cargarParaderos() {
  limpiarMarkers();
  limpiarTrayectos();

  const cercanos = DB.paraderos.cercanos(uLat, uLng, radio);

  paraderosFiltrados = cercanos.filter(p => {
    const rutasP = DB.rutas.porParadero(p.id);
    if (filtro === 'bus') return rutasP.some(r => r.tipo === 'micro');
    if (filtro === 'col') return rutasP.some(r => r.tipo === 'colectivo');
    return true;
  }).filter(p => {
    const q = document.getElementById('srchInput').value.toLowerCase();
    if (!q) return true;
    const rutasP = DB.rutas.porParadero(p.id);
    return p.nombre.toLowerCase().includes(q) ||
      rutasP.some(r => r.numero.toLowerCase().includes(q) || r.nombre.toLowerCase().includes(q));
  });

  document.getElementById('countLabel').textContent =
    `${paraderosFiltrados.length} paradero${paraderosFiltrados.length !== 1 ? 's' : ''}`;

  renderLista();
  renderMarkers();
  DB.stats.registrarBusqueda();
}

// ── RENDER LISTA ───────────────────────────────────────
function renderLista() {
  const list = document.getElementById('stopList');
  if (!paraderosFiltrados.length) {
    list.innerHTML = `<div class="empty"><div class="eico">🚏</div><span>Sin paraderos en ${radio >= 1000 ? (radio/1000).toFixed(1)+' km' : radio+' m'}.<br>Amplía el radio o cambia de ciudad.</span></div>`;
    return;
  }
  list.innerHTML = paraderosFiltrados.map((p, i) => {
    const rutasP = DB.rutas.porParadero(p.id);
    const prox   = rutasP.length ? Math.min(...rutasP.map(r => DB.rutas.minutosProximo(r.id))) : 99;
    const tc     = prox <= 5 ? 'var(--green)' : prox <= 15 ? 'var(--amber)' : 'var(--muted)';
    const dist   = p.distancia >= 1000 ? `${(p.distancia/1000).toFixed(1)} km` : `${p.distancia} m`;
    const chips  = rutasP.slice(0, 5).map(r =>
      `<span class="chip ${r.tipo === 'colectivo' ? 'cc' : 'cm'}">${r.tipo === 'colectivo' ? '🚕' : '🚌'} ${r.numero}</span>`
    ).join('');
    return `<div class="sc${selId === p.id ? ' sel' : ''}" onclick="selectParadero('${p.id}')" style="animation-delay:${i*40}ms">
      <div class="sc-top"><div class="sc-name">🚏 ${p.nombre}</div><div class="sc-dist">${dist}</div></div>
      <div class="chips">${chips || '<span style="font-size:10px;color:var(--muted)">Sin rutas</span>'}</div>
      ${prox < 99 ? `<div class="sc-next" style="color:${tc}">⏱ Próximo en ${prox} min</div>` : ''}
    </div>`;
  }).join('');
}

// ── MARKERS ────────────────────────────────────────────
function limpiarMarkers() { stopMarkers.forEach(m => map && map.removeLayer(m)); stopMarkers = []; }

function mkIcon(tipo, sel) {
  const col = tipo === 'colectivo' ? '#d97706' : '#2563eb';
  const emo = tipo === 'colectivo' ? '🚕' : '🚌';
  const sz  = sel ? 44 : 36;
  return L.divIcon({
    html: `<div style="width:${sz}px;height:${sz}px;background:${col};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid rgba(255,255,255,.3);box-shadow:0 4px 14px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);display:block;font-size:${sel?18:15}px">${emo}</span></div>`,
    iconSize: [sz, sz], iconAnchor: [sz/2, sz], className: ''
  });
}

function renderMarkers() {
  limpiarMarkers();
  paraderosFiltrados.forEach(p => {
    const rutasP = DB.rutas.porParadero(p.id);
    const tipoP  = rutasP.some(r => r.tipo === 'colectivo') && rutasP.every(r => r.tipo === 'colectivo') ? 'colectivo' : 'micro';
    const m = L.marker([p.lat, p.lng], { icon: mkIcon(tipoP, p.id === selId) }).addTo(map);

    const rows = rutasP.slice(0, 4).map(r => {
      const min = DB.rutas.minutosProximo(r.id);
      const tc  = min <= 5 ? 'ts' : min <= 15 ? 'tm' : 'tl';
      return `<div class="pop-row"><span>${r.tipo === 'colectivo' ? '🚕' : '🚌'}</span><span class="pop-num ${r.tipo === 'colectivo' ? 'pc' : 'pm'}">${r.numero}</span><span class="pop-desc">${r.nombre}</span><span class="pop-min ${tc}">${min < 99 ? min+'m' : '—'}</span></div>`;
    }).join('');

    m.bindPopup(`<div class="pop"><div class="pop-name">🚏 ${p.nombre}</div>${rows || '<div style="font-size:12px;color:var(--muted)">Sin rutas</div>'}</div>`, { maxWidth: 280 });
    m.on('click', () => selectParadero(p.id));
    stopMarkers.push(m);
  });
}

// ── TRAYECTOS ──────────────────────────────────────────
function limpiarTrayectos() { trayectoLayers.forEach(l => map && map.removeLayer(l)); trayectoLayers = []; }

function toggleTrayectos() {
  mostrarTrayectos = !mostrarTrayectos;
  document.getElementById('btnTrayecto').classList.toggle('act', mostrarTrayectos);
  mostrarTrayectos ? dibujarTrayectos() : limpiarTrayectos();
}

function dibujarTrayectos(rutaHighlight = null) {
  limpiarTrayectos();
  if (!mostrarTrayectos && !rutaHighlight) return;
  const rutas = rutaHighlight ? [rutaHighlight] : DB.rutas.porCiudad(ciudad);
  rutas.forEach(r => {
    if (!r.trayecto || r.trayecto.length < 2) return;
    const l = L.polyline(r.trayecto, {
      color: r.color || '#3b82f6',
      weight: rutaHighlight ? 6 : 3,
      opacity: rutaHighlight ? .9 : .6,
      dashArray: r.tipo === 'colectivo' ? '8 4' : null
    }).addTo(map);
    l.bindTooltip(`<b>${r.numero}</b> ${r.nombre}`, { sticky: true });
    trayectoLayers.push(l);
  });
}

// ── SELECT PARADERO ────────────────────────────────────
function selectParadero(id) {
  selId = id;
  const p = DB.paraderos.porId(id); if (!p) return;
  map.flyTo([p.lat, p.lng], 17, { duration: .7 });
  renderLista();
  renderMarkers();

  const idx = paraderosFiltrados.findIndex(x => x.id === id);
  if (idx >= 0 && stopMarkers[idx]) stopMarkers[idx].openPopup();

  const rutasP = DB.rutas.porParadero(id);
  renderDetalle(p, rutasP);
  if (mostrarTrayectos) dibujarTrayectos();
}

// ── RENDER DETALLE ─────────────────────────────────────
function renderDetalle(p, rutasP) {
  const dbar = document.getElementById('dbar');
  dbar.classList.remove('closed');
  dbar.classList.add('open');
  htabActual = 'lv';
  actualizarDetalleConTab(p, rutasP, htabActual);
}

function actualizarDetalleConTab(p, rutasP, tab) {
  const ahora = new Date();
  const hhmm  = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
  const micro  = rutasP.filter(r => r.tipo === 'micro');
  const col    = rutasP.filter(r => r.tipo === 'colectivo');

  const rowsRuta = (rts) => rts.map((r, i) => {
    const min  = DB.rutas.minutosProximo(r.id);
    const prox = DB.rutas.proximoHorario(r.id);
    const isM  = r.tipo === 'micro';
    const tc   = min <= 5 ? 'var(--green)' : min <= 15 ? 'var(--amber)' : 'var(--muted)';
    const hoys = r.horarios?.[tab] || [];
    const chips = hoys.map(h =>
      `<span class="h-chip${h >= hhmm && tab === 'lv' ? ' proximo' : ''}">${h}</span>`
    ).join('');
    return `<div class="dr" style="animation-delay:${i*60}ms">
      <div class="dico ${isM ? 'im' : 'ic'}">${isM ? '🚌' : '🚕'}</div>
      <div class="dinfo">
        <div class="dname ${isM ? 'nm' : 'nc'}">${isM ? 'Bus' : 'Ruta'} ${r.numero} — ${r.nombre}</div>
        <div class="ddesc">Frecuencia: cada ${r.frecuencia} min</div>
        <div class="h-grid">${chips}</div>
        <button class="btn-trayecto${mostrarTrayectos ? ' act' : ''}" onclick="verTrayecto('${r.id}')">🗺️ Ver trayecto</button>
      </div>
      <div class="dtime">
        ${min < 99
          ? `<div class="dtime-min" style="color:${tc}">${min}m</div><div class="dtime-lbl">próximo</div><div class="dtime-hora">${prox || ''}</div>`
          : '<div class="dtime-min" style="color:var(--muted)">—</div>'}
      </div>
    </div>`;
  }).join('');

  document.getElementById('dbarInner').innerHTML = `
    <div class="dh">
      <div class="dh-info">
        <div class="dh-t">🚏 <em>${p.nombre}</em></div>
        <div class="dh-addr">📍 ${p.direccion}</div>
      </div>
      <button class="dh-x" onclick="cerrarDetalle()">✕</button>
    </div>
    <div class="h-tabs">
      <button class="h-tab${tab === 'lv' ? ' act' : ''}" onclick="cambiarTab('${p.id}','lv')">Lun–Vie</button>
      <button class="h-tab${tab === 'sa' ? ' act' : ''}" onclick="cambiarTab('${p.id}','sa')">Sábado</button>
      <button class="h-tab${tab === 'do' ? ' act' : ''}" onclick="cambiarTab('${p.id}','do')">Domingo</button>
    </div>
    ${micro.length ? `<div class="dl">🚌 Micros / Buses</div>${rowsRuta(micro)}` : ''}
    ${col.length   ? `<div class="dl">🚕 Colectivos</div>${rowsRuta(col)}` : ''}
    ${!rutasP.length ? '<div class="empty" style="height:60px"><span>Sin rutas registradas</span></div>' : ''}
  `;
}

function cambiarTab(pid, tab) {
  htabActual = tab;
  const p     = DB.paraderos.porId(pid);
  const rutasP = DB.rutas.porParadero(pid);
  actualizarDetalleConTab(p, rutasP, tab);
}

function cerrarDetalle() {
  selId = null;
  document.getElementById('dbar').classList.remove('open');
  document.getElementById('dbar').classList.add('closed');
  renderLista();
  renderMarkers();
  limpiarTrayectos();
  if (mostrarTrayectos) dibujarTrayectos();
}

function verTrayecto(rutaId) {
  limpiarTrayectos();
  mostrarTrayectos = true;
  document.getElementById('btnTrayecto').classList.add('act');
  const r = DB.rutas.porId(rutaId);
  if (r) dibujarTrayectos(r);
}

// ── EVENTS ─────────────────────────────────────────────
document.getElementById('citySel').addEventListener('change', e => {
  ciudad = e.target.value;
  const [lat, lng] = CITY_COORDS[ciudad];
  uLat = lat; uLng = lng;
  map.flyTo([lat, lng], 14, { duration: 1 });
  uMarker.setLatLng([lat, lng]);
  radioCircle.setLatLng([lat, lng]);
  cerrarDetalle();
  cargarParaderos();
});

document.querySelectorAll('.ftab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.ftab').forEach(x => x.className = 'ftab');
  filtro = t.dataset.f;
  t.className = `ftab on-${filtro}`;
  cargarParaderos();
}));

document.getElementById('srchInput').addEventListener('input', () => cargarParaderos());
