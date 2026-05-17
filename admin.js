// ═══════════════════════════════════════════════════════
// LastStop — admin.js  (lógica del panel de administración)
// ═══════════════════════════════════════════════════════

// ── INIT ───────────────────────────────────────────────
window.addEventListener('load', () => {
  const s = DB.auth.sesion();
  if (!s || s.rol !== 'admin') {
    alert('Acceso solo para administradores');
    window.location = 'index.html';
    return;
  }
  initDashboard();
  renderTablaParaderos();
  renderTablaRutas();
  renderTablaUsuarios();
  renderHorarios();
});

// ── NAV ────────────────────────────────────────────────
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('show'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const key = id.charAt(0).toUpperCase() + id.slice(1);
  document.getElementById('page' + key).classList.add('show');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.textContent.toLowerCase().includes(id.toLowerCase().slice(0, 4)))
      n.classList.add('active');
  });
}

// ── DASHBOARD ──────────────────────────────────────────
function initDashboard() {
  const s = DB.stats.get();

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card blue">  <div class="stat-ico">👥</div><div class="stat-val">${s.totalUsuarios}</div><div class="stat-lbl">Usuarios</div></div>
    <div class="stat-card green"> <div class="stat-ico">🚏</div><div class="stat-val">${s.totalParaderos}</div><div class="stat-lbl">Paraderos</div></div>
    <div class="stat-card amber"> <div class="stat-ico">🗺️</div><div class="stat-val">${s.totalRutas}</div><div class="stat-lbl">Rutas</div></div>
    <div class="stat-card purple"><div class="stat-ico">🏙️</div><div class="stat-val">${s.ciudades}</div><div class="stat-lbl">Ciudades</div></div>
    <div class="stat-card red">   <div class="stat-ico">🔍</div><div class="stat-val">${s.busquedas || 0}</div><div class="stat-lbl">Búsquedas</div></div>
  `;

  // Chart paraderos por ciudad
  const ps      = DB.paraderos.todos().filter(p => p.activo);
  const byCiudad = {};
  ps.forEach(p => byCiudad[p.ciudad] = (byCiudad[p.ciudad] || 0) + 1);
  const maxC = Math.max(...Object.values(byCiudad));
  document.getElementById('chartCiudades').innerHTML = Object.entries(byCiudad).map(([c, n]) => `
    <div class="bar-item">
      <div class="bar-label"><span>${c}</span><span style="color:var(--blue-light);font-weight:700">${n}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(n/maxC*100).toFixed(0)}%;background:var(--blue)"></div></div>
    </div>`).join('');

  // Chart rutas por tipo
  const rs    = DB.rutas.todas().filter(r => r.activo);
  const micros = rs.filter(r => r.tipo === 'micro').length;
  const cols   = rs.filter(r => r.tipo === 'colectivo').length;
  const maxT   = Math.max(micros, cols);
  document.getElementById('chartTipos').innerHTML = `
    <div class="bar-item">
      <div class="bar-label"><span>🚌 Micros</span><span style="color:var(--blue-light);font-weight:700">${micros}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(micros/maxT*100).toFixed(0)}%;background:var(--blue)"></div></div>
    </div>
    <div class="bar-item">
      <div class="bar-label"><span>🚕 Colectivos</span><span style="color:var(--amber-light);font-weight:700">${cols}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(cols/maxT*100).toFixed(0)}%;background:var(--amber)"></div></div>
    </div>`;

  // Activity feed
  document.getElementById('actFeed').innerHTML = [
    { ico: '🟢', bg: 'rgba(34,197,94,.15)',   txt: 'Sistema iniciado correctamente', t: 'Ahora' },
    { ico: '🚏', bg: 'rgba(59,130,246,.15)',  txt: `${s.totalParaderos} paraderos activos en ${s.ciudades} ciudades`, t: 'Hoy' },
    { ico: '👥', bg: 'rgba(139,92,246,.15)',  txt: `${s.usuariosActivos} usuarios activos registrados`, t: 'Hoy' },
    { ico: '🔍', bg: 'rgba(245,158,11,.15)',  txt: `${s.busquedas || 0} búsquedas realizadas en total`, t: 'Total' },
  ].map(a => `<div class="act-item"><div class="act-ico" style="background:${a.bg}">${a.ico}</div><div class="act-text">${a.txt}</div><div class="act-time">${a.t}</div></div>`).join('');
}

// ── TABLA PARADEROS ────────────────────────────────────
let editParaderoId = null;

function renderTablaParaderos() {
  const q    = (document.getElementById('srchParaderos')?.value || '').toLowerCase();
  const lista = DB.paraderos.todos().filter(p =>
    !q || p.nombre.toLowerCase().includes(q) || p.ciudad.toLowerCase().includes(q)
  );
  document.getElementById('tbodyParaderos').innerHTML = lista.map(p => {
    const rutasP = DB.rutas.porParadero(p.id);
    return `<tr>
      <td><b>${p.nombre}</b><br><span style="font-size:11px;color:var(--muted)">${p.direccion}</span></td>
      <td>${p.ciudad}</td>
      <td>${rutasP.map(r => `<span class="badge badge-micro" style="margin:1px">${r.numero}</span>`).join('') || '—'}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</td>
      <td><span class="badge ${p.activo ? 'badge-on' : 'badge-off'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td><div class="td-actions">
        <button class="btn-act btn-edit" onclick="editarParadero('${p.id}')">✏️ Editar</button>
        <button class="btn-act btn-del"  onclick="eliminarParadero('${p.id}')">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');
}

function abrirModalParadero(id = null) {
  editParaderoId = id;
  document.getElementById('mParaderoTitle').textContent = id ? 'Editar Paradero' : 'Agregar Paradero';
  if (id) {
    const p = DB.paraderos.porId(id);
    document.getElementById('mpNombre').value    = p.nombre;
    document.getElementById('mpDireccion').value = p.direccion;
    document.getElementById('mpCiudad').value    = p.ciudad;
    document.getElementById('mpLat').value       = p.lat;
    document.getElementById('mpLng').value       = p.lng;
  } else {
    ['mpNombre','mpDireccion','mpLat','mpLng'].forEach(i => document.getElementById(i).value = '');
  }
  document.getElementById('modalParadero').classList.add('show');
}

function editarParadero(id) { abrirModalParadero(id); }

function guardarParadero() {
  const data = {
    nombre:    document.getElementById('mpNombre').value.trim(),
    direccion: document.getElementById('mpDireccion').value.trim(),
    ciudad:    document.getElementById('mpCiudad').value,
    lat:       parseFloat(document.getElementById('mpLat').value),
    lng:       parseFloat(document.getElementById('mpLng').value),
    rutas:     []
  };
  if (!data.nombre || !data.lat || !data.lng) { showToast('Completa nombre y coordenadas', 'err'); return; }
  editParaderoId ? DB.paraderos.actualizar(editParaderoId, data) : DB.paraderos.agregar(data);
  cerrarModal('modalParadero');
  renderTablaParaderos();
  showToast(editParaderoId ? 'Paradero actualizado' : 'Paradero agregado', 'ok');
}

function eliminarParadero(id) {
  if (!confirm('¿Eliminar este paradero?')) return;
  DB.paraderos.eliminar(id);
  renderTablaParaderos();
  showToast('Paradero eliminado', 'ok');
}

// ── TABLA RUTAS ────────────────────────────────────────
let editRutaId = null;

function renderTablaRutas() {
  const q    = (document.getElementById('srchRutas')?.value || '').toLowerCase();
  const lista = DB.rutas.todas().filter(r =>
    !q || r.numero.toLowerCase().includes(q) || r.nombre.toLowerCase().includes(q) || r.ciudad.toLowerCase().includes(q)
  );
  document.getElementById('tbodyRutas').innerHTML = lista.map(r => `<tr>
    <td><span class="route-dot" style="background:${r.color}"></span><b>${r.numero}</b> ${r.nombre}</td>
    <td>${r.ciudad}</td>
    <td><span class="badge ${r.tipo === 'micro' ? 'badge-micro' : 'badge-col'}">${r.tipo === 'micro' ? '🚌 Micro' : '🚕 Colectivo'}</span></td>
    <td>${r.paraderos.length} paradas</td>
    <td style="font-family:'JetBrains Mono',monospace">${r.frecuencia} min</td>
    <td><span class="badge ${r.activo ? 'badge-on' : 'badge-off'}">${r.activo ? 'Activa' : 'Inactiva'}</span></td>
    <td><div class="td-actions">
      <button class="btn-act btn-edit" onclick="editarRuta('${r.id}')">✏️ Editar</button>
      <button class="btn-act btn-del"  onclick="eliminarRuta('${r.id}')">🗑️</button>
    </div></td>
  </tr>`).join('');
}

function abrirModalRuta(id = null) {
  editRutaId = id;
  document.getElementById('mRutaTitle').textContent = id ? 'Editar Ruta' : 'Agregar Ruta';
  if (id) {
    const r = DB.rutas.porId(id);
    document.getElementById('mrNumero').value     = r.numero;
    document.getElementById('mrNombre').value     = r.nombre;
    document.getElementById('mrCiudad').value     = r.ciudad;
    document.getElementById('mrTipo').value       = r.tipo;
    document.getElementById('mrFrecuencia').value = r.frecuencia;
    document.getElementById('mrColor').value      = r.color || '#3b82f6';
    document.getElementById('mrHlv').value        = (r.horarios?.lv || []).join(',');
    document.getElementById('mrHsa').value        = (r.horarios?.sa || []).join(',');
    document.getElementById('mrHdo').value        = (r.horarios?.do || []).join(',');
  } else {
    ['mrNumero','mrNombre','mrHlv','mrHsa','mrHdo'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('mrFrecuencia').value = 15;
  }
  document.getElementById('modalRuta').classList.add('show');
}

function editarRuta(id) { abrirModalRuta(id); }

function guardarRuta() {
  const parseH = v => v.split(',').map(h => h.trim()).filter(h => /^\d{2}:\d{2}$/.test(h));
  const data = {
    numero:     document.getElementById('mrNumero').value.trim(),
    nombre:     document.getElementById('mrNombre').value.trim(),
    ciudad:     document.getElementById('mrCiudad').value,
    tipo:       document.getElementById('mrTipo').value,
    frecuencia: parseInt(document.getElementById('mrFrecuencia').value) || 15,
    color:      document.getElementById('mrColor').value,
    horarios: {
      lv: parseH(document.getElementById('mrHlv').value),
      sa: parseH(document.getElementById('mrHsa').value),
      do: parseH(document.getElementById('mrHdo').value)
    },
    paraderos: [], trayecto: []
  };
  if (!data.numero || !data.nombre) { showToast('Completa número y nombre', 'err'); return; }
  editRutaId ? DB.rutas.actualizar(editRutaId, data) : DB.rutas.agregar(data);
  cerrarModal('modalRuta');
  renderTablaRutas();
  showToast(editRutaId ? 'Ruta actualizada' : 'Ruta agregada', 'ok');
}

function eliminarRuta(id) {
  if (!confirm('¿Eliminar esta ruta?')) return;
  DB.rutas.eliminar(id);
  renderTablaRutas();
  showToast('Ruta eliminada', 'ok');
}

// ── TABLA USUARIOS ─────────────────────────────────────
function renderTablaUsuarios() {
  const q    = (document.getElementById('srchUsuarios')?.value || '').toLowerCase();
  const lista = DB.usuarios.todos().filter(u =>
    !q || u.nombre.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  );
  document.getElementById('tbodyUsuarios').innerHTML = lista.map(u => `<tr>
    <td>${u.avatar || '👤'} <b>${u.nombre}</b></td>
    <td style="color:var(--muted)">${u.email || '—'}</td>
    <td><span class="badge ${u.rol === 'admin' ? 'badge-admin' : u.rol === 'invitado' ? 'badge-inv' : 'badge-user'}">${u.rol}</span></td>
    <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${u.creado || '—'}</td>
    <td><span class="badge ${u.activo ? 'badge-on' : 'badge-off'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
    <td><div class="td-actions">
      ${u.rol !== 'admin'
        ? `<button class="btn-act ${u.activo ? 'btn-del' : 'btn-tog'}" onclick="toggleUsuario('${u.id}',${!u.activo})">${u.activo ? '🚫 Desactivar' : '✅ Activar'}</button>`
        : '<span style="color:var(--muted);font-size:11px">—</span>'}
    </div></td>
  </tr>`).join('');
}

function toggleUsuario(id, activo) {
  DB.usuarios.actualizar(id, { activo });
  renderTablaUsuarios();
  showToast(activo ? 'Usuario activado' : 'Usuario desactivado', 'ok');
}

// ── HORARIOS ───────────────────────────────────────────
function renderHorarios() {
  const rutas = DB.rutas.todas().filter(r => r.activo);
  document.getElementById('horariosContent').innerHTML = rutas.map(r => {
    const dias = [['lv','Lun – Vie'], ['sa','Sábado'], ['do','Domingo']];
    return `<div class="table-wrap" style="margin-bottom:20px">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <span style="width:12px;height:12px;border-radius:50%;background:${r.color};display:inline-block"></span>
        <b>${r.numero} — ${r.nombre}</b>
        <span class="badge ${r.tipo === 'micro' ? 'badge-micro' : 'badge-col'}" style="margin-left:4px">${r.tipo}</span>
        <span style="color:var(--muted);font-size:12px;margin-left:auto">${r.ciudad} · cada ${r.frecuencia} min</span>
      </div>
      <div style="padding:16px 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        ${dias.map(([k, lbl]) => `<div>
          <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">${lbl}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${(r.horarios?.[k] || []).map(h =>
              `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);color:var(--muted)">${h}</span>`
            ).join('') || '<span style="font-size:12px;color:var(--muted)">Sin horarios</span>'}
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

// ── MODALES ────────────────────────────────────────────
function cerrarModal(id) { document.getElementById(id).classList.remove('show'); }

document.querySelectorAll('.modal-bg').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); })
);

// ── TOAST ──────────────────────────────────────────────
function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 2800);
}
