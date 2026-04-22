// ============================================================
// PROVEEDORES — RENDER
// ============================================================
function renderProveedores() {
  const tbody = document.getElementById('tabla-proveedores');
  if (!DATA.proveedores.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🏢</div><div class="empty-state-title">Sin proveedores registrados</div></div></td></tr>`; return; }
  const rol = getUserRole();
  const puedeEditar = rol === 'Administrador' || rol === 'Gestor';
  tbody.innerHTML = DATA.proveedores.map(p => {
    const tipos = (p.Tipo_Proveedor||'').split(',').map(t => t.trim()).filter(Boolean);
    const tiposBadges = tipos.map(t => `<span class="badge badge-gray" style="margin-right:3px">${t}</span>`).join('');
    return `<tr>
      <td><strong>${p.Nombre_Proveedor||'—'}</strong></td>
      <td>${tiposBadges||'—'}</td>
      <td>${p.Persona_Contacto||'—'}</td>
      <td>${p.Email_Contacto ? `<a href="mailto:${p.Email_Contacto}" style="color:var(--accent)">${p.Email_Contacto}</a>` : '—'}</td>
      <td>${p.Telefono||'—'}</td>
      <td>${p.Activo !== 'FALSE' ? '<span class="badge badge-green">Activo</span>' : '<span class="badge badge-gray">Inactivo</span>'}</td>
      <td><div class="row-actions">${puedeEditar ? `<button class="icon-btn" onclick="editProveedor(${DATA.proveedores.indexOf(p)})">✏️</button>` : ''}</div></td>
    </tr>`;
  }).join('');
}

// ============================================================
// UBICACIONES — RENDER
// ============================================================
function renderUbicaciones() {
  const cont = document.getElementById('ubicaciones-agrupadas');
  const rol = getUserRole();
  const puedeEditar = rol === 'Administrador' || rol === 'Gestor';
  const btnNuevaUbi = document.getElementById('btn-nueva-ubicacion');
  if (btnNuevaUbi) btnNuevaUbi.style.display = puedeEditar ? '' : 'none';
  if (!cont) return;
  if (!DATA.ubicaciones.length) { cont.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📍</div><div class="empty-state-title">Sin ubicaciones registradas</div></div>`; return; }

  const grupos = {};
  DATA.ubicaciones.forEach(u => { const lab = u.Laboratorio_Aula||'Sin asignar'; if (!grupos[lab]) grupos[lab] = []; grupos[lab].push(u); });

  cont.innerHTML = Object.entries(grupos).map(([lab, items], gi) => {
    const totalMat = items.reduce((s,u) => s + DATA.material.filter(m => m.Ubicacion === u.ID_Ubicacion).length, 0);
    const grupoId = 'ubg' + gi;
    const rows = items.map(u => {
      const matsAqui = DATA.material.filter(m => m.Ubicacion === u.ID_Ubicacion);
      const matCell = matsAqui.length ? `<span class="badge badge-blue" style="cursor:pointer" onclick="verMaterialUbicacion('${u.ID_Ubicacion}')">${matsAqui.length} ítem(s)</span>` : `<span style="font-size:12px;color:var(--text-muted)">—</span>`;
      return `<div class="ubi-row">
        <strong style="font-size:12px">${u.ID_Ubicacion}</strong>
        <span style="color:var(--text-soft);font-size:13px">${u.Zona||'—'}</span>
        <span style="font-size:12px;color:var(--text-muted)">${u.Subzona||u.Descripcion_Completa||'—'}</span>
        <div>${matCell}</div>
        <div>${u.Activa !== 'FALSE' ? '<span class="badge badge-green">Activa</span>' : '<span class="badge badge-gray">Inactiva</span>'}</div>
        <div class="row-actions">${puedeEditar ? `<button class="icon-btn" onclick="editUbicacion(${DATA.ubicaciones.indexOf(u)})">✏️</button>` : ''}</div>
      </div>`;
    }).join('');
    return `<div class="ubi-grupo">
      <div class="ubi-grupo-header" onclick="toggleUbiGrupo('${grupoId}')">
        <span class="ubi-grupo-toggle" id="tog-${grupoId}">▶</span>
        <span>🏛️ ${lab}</span>
        <span class="ubi-grupo-count"><span class="badge badge-gray">${items.length} zona(s)</span>${totalMat > 0 ? `<span class="badge badge-blue" style="margin-left:4px">${totalMat} ítem(s)</span>` : ''}</span>
      </div>
      <div class="ubi-grupo-rows" id="${grupoId}">
        <div style="display:grid;grid-template-columns:140px 1fr 1fr 80px 80px auto;gap:8px;padding:6px 20px;background:var(--surface2);font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid var(--border)">
          <span>ID</span><span>Zona</span><span>Subzona / Descripción</span><span>Material</span><span>Estado</span><span></span>
        </div>
        ${rows}
      </div>
    </div>`;
  }).join('');
}

function toggleUbiGrupo(id) {
  const rows = document.getElementById(id);
  const tog  = document.getElementById('tog-' + id);
  if (!rows) return;
  const isOpen = rows.classList.toggle('open');
  if (tog) tog.textContent = isOpen ? '▼' : '▶';
}

function verMaterialUbicacion(ubicacionId) {
  _filtroMaterial = ''; _filtroMaterialCat = ''; _filtroMaterialStock = '';
  showPage('material');
  const searchInput = document.getElementById('search-material');
  if (searchInput) { searchInput.value = ubicacionId; filtrarMaterial(ubicacionId); }
}

// ============================================================
// USUARIOS — RENDER
// ============================================================
function renderUsuarios() {
  const tbody = document.getElementById('tabla-usuarios');
  if (!DATA.usuarios.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Sin usuarios registrados</div></div></td></tr>`; return; }
  const rolBadge = {'Administrador':'badge-red','Gestor':'badge-orange','Profesor':'badge-blue','Alumno':'badge-gray'};
  tbody.innerHTML = DATA.usuarios.map(u => `<tr>
    <td><strong>${u.Nombre||'—'}</strong></td>
    <td>${u.Email||'—'}</td>
    <td><span class="badge ${rolBadge[u.Rol]||'badge-gray'}">${u.Rol||'—'}</span></td>
    <td>${u.Activo !== 'FALSE' ? '<span class="badge badge-green">Activo</span>' : '<span class="badge badge-gray">Inactivo</span>'}</td>
    <td><div class="row-actions"><button class="icon-btn" onclick="editUsuario(${DATA.usuarios.indexOf(u)})">✏️</button></div></td>
  </tr>`).join('');
}

// ============================================================
// MODALES PROVEEDORES / UBICACIONES / USUARIOS
// ============================================================
function openModalProveedor() { editingRow = null; ['prov-nombre','prov-contacto','prov-email','prov-telefono','prov-web','prov-observaciones'].forEach(id => sv(id,'')); clearTiposProveedor(); openModal('modal-proveedor'); }
function openModalUbicacion() { editingRow = null; ['ubi-id','ubi-lab','ubi-zona','ubi-subzona','ubi-desc'].forEach(id => sv(id,'')); openModal('modal-ubicacion'); }
function openModalUsuario()   { editingRow = null; ['usr-nombre','usr-email'].forEach(id => sv(id,'')); sv('usr-rol','Profesor'); openModal('modal-usuario'); }

function editProveedor(idx) {
  const p = DATA.proveedores[idx];
  editingRow = { sheet: 'Proveedores', rowIndex: idx };
  sv('prov-nombre',p.Nombre_Proveedor); setTiposProveedor(p.Tipo_Proveedor);
  sv('prov-contacto',p.Persona_Contacto); sv('prov-email',p.Email_Contacto);
  sv('prov-telefono',p.Telefono); sv('prov-web',p.Web); sv('prov-observaciones',p.Observaciones);
  openModal('modal-proveedor');
}
function editUbicacion(idx) {
  const u = DATA.ubicaciones[idx];
  editingRow = { sheet: 'Ubicaciones', rowIndex: idx };
  sv('ubi-id',u.ID_Ubicacion); sv('ubi-lab',u.Laboratorio_Aula); sv('ubi-zona',u.Zona); sv('ubi-subzona',u.Subzona); sv('ubi-desc',u.Descripcion_Completa);
  openModal('modal-ubicacion');
}
function editUsuario(idx) {
  const u = DATA.usuarios[idx];
  editingRow = { sheet: 'Usuarios', rowIndex: idx };
  sv('usr-nombre',u.Nombre); sv('usr-email',u.Email); sv('usr-rol',u.Rol);
  openModal('modal-usuario');
}

// ============================================================
// MULTI-SELECT TIPOS PROVEEDOR
// ============================================================
function getTiposProveedorSeleccionados() {
  return Array.from(document.querySelectorAll('#prov-tipos-group input[type="checkbox"]:checked')).map(c => c.value).join(', ');
}
function setTiposProveedor(tiposStr) {
  const tipos = (tiposStr||'').split(',').map(t => t.trim());
  document.querySelectorAll('#prov-tipos-group input[type="checkbox"]').forEach(cb => { cb.checked = tipos.includes(cb.value); });
}
function clearTiposProveedor() {
  document.querySelectorAll('#prov-tipos-group input[type="checkbox"]').forEach(cb => cb.checked = false);
}

// ============================================================
// GUARDAR PROVEEDORES / UBICACIONES / USUARIOS
// ============================================================
async function guardarProveedor() {
  const nombre = v('prov-nombre');
  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
  const tipos = getTiposProveedorSeleccionados();
  const id = genId('PRV-');
  const row = [id, nombre, tipos, v('prov-contacto'), v('prov-email'), v('prov-telefono'), v('prov-web'), v('prov-observaciones'), 'TRUE'];
  showLoading('Guardando...');
  try {
    if (editingRow && editingRow.sheet === 'Proveedores') {
      await sheetsUpdate(`Proveedores!A${editingRow.rowIndex+2}:I${editingRow.rowIndex+2}`, row);
      DATA.proveedores[editingRow.rowIndex] = rowToObj(row, 'proveedores');
      showToast('Proveedor actualizado', 'success');
    } else {
      await sheetsAppend('Proveedores', row);
      DATA.proveedores.push(rowToObj(row, 'proveedores'));
      showToast('Proveedor guardado', 'success');
    }
    closeModal('modal-proveedor'); renderAll();
  } catch(e) { showToast('Error guardando', 'error'); }
  hideLoading(); editingRow = null;
}

async function guardarUbicacion() {
  const id = v('ubi-id'), lab = v('ubi-lab');
  if (!id || !lab) { showToast('ID y laboratorio/aula son obligatorios', 'error'); return; }
  const row = [id, lab, v('ubi-zona'), v('ubi-subzona'), v('ubi-desc'), 'TRUE'];
  showLoading('Guardando...');
  try {
    if (editingRow && editingRow.sheet === 'Ubicaciones') {
      await sheetsUpdate(`Ubicaciones!A${editingRow.rowIndex+2}:F${editingRow.rowIndex+2}`, row);
      DATA.ubicaciones[editingRow.rowIndex] = rowToObj(row, 'ubicaciones');
      showToast('Ubicación actualizada', 'success');
    } else {
      await sheetsAppend('Ubicaciones', row);
      DATA.ubicaciones.push(rowToObj(row, 'ubicaciones'));
      showToast('Ubicación guardada', 'success');
    }
    closeModal('modal-ubicacion'); renderAll();
  } catch(e) { showToast('Error guardando', 'error'); }
  hideLoading(); editingRow = null;
}

async function guardarUsuario() {
  const nombre = v('usr-nombre'), email = v('usr-email');
  if (!nombre || !email) { showToast('Nombre y email son obligatorios', 'error'); return; }
  const id = genId('USR-');
  const row = [id, nombre, email, v('usr-rol'), 'TRUE'];
  showLoading('Guardando...');
  try {
    if (editingRow && editingRow.sheet === 'Usuarios') {
      await sheetsUpdate(`Usuarios!A${editingRow.rowIndex+2}:E${editingRow.rowIndex+2}`, row);
      DATA.usuarios[editingRow.rowIndex] = rowToObj(row, 'usuarios');
      showToast('Usuario actualizado', 'success');
    } else {
      await sheetsAppend('Usuarios', row);
      DATA.usuarios.push(rowToObj(row, 'usuarios'));
      showToast('Usuario guardado', 'success');
    }
    closeModal('modal-usuario'); renderAll();
  } catch(e) { showToast('Error guardando', 'error'); }
  hideLoading(); editingRow = null;
}
