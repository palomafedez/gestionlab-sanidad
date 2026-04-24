// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  setText('stat-equipos', DATA.equipos.length);

  const hoy  = new Date();
  const en30 = new Date(); en30.setDate(hoy.getDate() + 30);
  const preventivos = DATA.equipos.filter(e => e.Fecha_Proximo_Preventivo && new Date(e.Fecha_Proximo_Preventivo) <= en30);
  setText('stat-preventivos', preventivos.length);

  const incAbiertas = DATA.incidencias.filter(i => i.Estado === 'Abierta' || i.Estado === 'En gestión');
  setText('stat-incidencias', incAbiertas.length);

  const alertas = document.getElementById('alertas-container');
  if (!alertas) return;
  alertas.innerHTML = '';

  const vencidos  = DATA.equipos.filter(e => e.Fecha_Proximo_Preventivo && new Date(e.Fecha_Proximo_Preventivo) < hoy);
  const averiados = DATA.equipos.filter(e => e.Estado_Operativo === 'Averiado' || e.Estado_Operativo === 'Fuera de servicio');

  if (averiados.length) alertas.innerHTML += `<div class="alert-banner danger"><div class="alert-icon">🔴</div><div class="alert-content"><div class="alert-title">${averiados.length} equipo(s) fuera de servicio o averiado(s)</div><div class="alert-text">${averiados.map(e => e.ID_Activo + ' – ' + (e.Tipo_Equipo||'') + ' ' + (e.Marca||'')).join(' · ')}</div></div></div>`;
  if (vencidos.length)  alertas.innerHTML += `<div class="alert-banner danger"><div class="alert-icon">🔴</div><div class="alert-content"><div class="alert-title">${vencidos.length} equipo(s) con mantenimiento preventivo vencido</div><div class="alert-text">${vencidos.map(e => e.ID_Activo + ' – ' + (e.Tipo_Equipo||'') + ' ' + (e.Marca||'')).join(' · ')}</div></div></div>`;
  if (incAbiertas.length) alertas.innerHTML += `<div class="alert-banner"><div class="alert-icon">⚠️</div><div class="alert-content"><div class="alert-title">${incAbiertas.length} incidencia(s) pendiente(s) de resolución</div><div class="alert-text">${incAbiertas.map(i => i.ID_Incidencia + ' · ' + i.Equipo).join(' – ')}</div></div></div>`;

  const solPendientes = DATA.solicitudes.filter(s => s.Estado === 'Pendiente');
  if (solPendientes.length && puedeHacer('gestionarPedidos')) {
    alertas.innerHTML += `<div class="alert-banner" style="cursor:pointer" onclick="showPage('solicitudes')"><div class="alert-icon">📋</div><div class="alert-content"><div class="alert-title">${solPendientes.length} solicitud(es) de material pendiente(s) de gestión</div><div class="alert-text">${solPendientes.slice(0,4).map(s => s.Material + ' · ' + s.Solicitante).join(' – ')}${solPendientes.length > 4 ? ' y ' + (solPendientes.length-4) + ' más...' : ''}</div></div></div>`;
  }

  // Stock bajo mínimo — usa helpers de config.js (soporta lotes por ubicación)
  const bajominimo = DATA.material.filter(m => stockBajoMinimo(m));
  setText('stat-stock-bajo', bajominimo.length);

  const alertasStock = document.getElementById('alertas-stock-container');
  if (!alertasStock) return;
  alertasStock.innerHTML = '';
  if (bajominimo.length) {
    const criticos = bajominimo.filter(m => getStockTotal(m) === 0);
    const bajos    = bajominimo.filter(m => getStockTotal(m) > 0);
    const puedeGestionar = puedeHacer('gestionarPedidos');
    const renderItemsStock = items => items.slice(0,5).map(m =>
      `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:8px">${m.Nombre} (${getStockTotal(m)} ${m.Unidad||''})${puedeGestionar ? `<button class="btn btn-secondary" style="padding:2px 8px;font-size:11px" onclick="event.stopPropagation();solicitudStockAPedido('${m.ID_Material}')">+ Pedido</button>` : ''}</span>`
    ).join('');
    if (criticos.length) alertasStock.innerHTML += `<div class="alert-banner danger"><div class="alert-icon">🔴</div><div class="alert-content"><div class="alert-title">${criticos.length} material(es) sin stock</div><div class="alert-text" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:4px">${renderItemsStock(criticos)}${criticos.length > 5 ? ' y ' + (criticos.length-5) + ' más...' : ''}</div></div></div>`;
    if (bajos.length)    alertasStock.innerHTML += `<div class="alert-banner"><div class="alert-icon">🟡</div><div class="alert-content"><div class="alert-title">${bajos.length} material(es) por debajo del mínimo</div><div class="alert-text" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:4px">${renderItemsStock(bajos)}${bajos.length > 5 ? ' y ' + (bajos.length-5) + ' más...' : ''}</div></div></div>`;
  }

  // Tabla próximos preventivos
  const proximos = DATA.equipos.filter(e => e.Fecha_Proximo_Preventivo).sort((a,b) => new Date(a.Fecha_Proximo_Preventivo) - new Date(b.Fecha_Proximo_Preventivo)).slice(0, 8);
  const tbody = document.getElementById('tabla-proximos');
  if (!proximos.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Sin preventivos programados</div><div class="empty-state-text">Asigna fechas de próximo preventivo en el inventario</div></div></td></tr>`; return; }
  tbody.innerHTML = proximos.map(e => {
    const f = new Date(e.Fecha_Proximo_Preventivo);
    const diffDias = Math.ceil((f - hoy) / 86400000);
    let badge, estado;
    if (diffDias < 0)      { badge = 'badge-red';    estado = 'Vencido hace ' + Math.abs(diffDias) + 'd'; }
    else if (diffDias <= 7) { badge = 'badge-red';    estado = 'En ' + diffDias + ' días'; }
    else if (diffDias <= 30){ badge = 'badge-orange'; estado = 'En ' + diffDias + ' días'; }
    else                   { badge = 'badge-green';  estado = 'En ' + diffDias + ' días'; }
    return `<tr><td><strong>${e.ID_Activo}</strong></td><td>${e.Tipo_Equipo||'—'} ${e.Marca ? '· ' + e.Marca : ''}</td><td>${e.Ubicacion||'—'}</td><td>${formatDate(e.Fecha_Proximo_Preventivo)}</td><td><span class="badge ${badge}">${estado}</span></td></tr>`;
  }).join('');
}

// ============================================================
// EQUIPOS — RENDER
// ============================================================
let _filtroEquipos = '', _filtroEquiposEstado = '';

function renderEquipos(filtro, filtroEstado) {
  if (filtro !== undefined) _filtroEquipos = filtro;
  if (filtroEstado !== undefined) _filtroEquiposEstado = filtroEstado;
  const tbody = document.getElementById('tabla-equipos');
  let items = DATA.equipos;
  if (_filtroEquipos) items = items.filter(e => JSON.stringify(e).toLowerCase().includes(_filtroEquipos.toLowerCase()));
  if (_filtroEquiposEstado) items = items.filter(e => e.Estado_Operativo === _filtroEquiposEstado);

  if (!items.length) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">🔬</div><div class="empty-state-title">Sin equipos registrados</div><div class="empty-state-text">Añade el primer equipo con el botón superior</div></div></td></tr>`; return; }

  tbody.innerHTML = items.map(e => {
    const estadoBadge = {'Operativo':'badge-green','En mantenimiento':'badge-orange','Averiado':'badge-red','Fuera de servicio':'badge-gray'}[e.Estado_Operativo] || 'badge-gray';
    const proxPreventivo = e.Fecha_Proximo_Preventivo ? (() => {
      const diffDias = Math.ceil((new Date(e.Fecha_Proximo_Preventivo) - new Date()) / 86400000);
      if (diffDias < 0)    return `<span class="badge badge-red">Vencido</span>`;
      if (diffDias <= 30)  return `<span class="badge badge-orange">${formatDate(e.Fecha_Proximo_Preventivo)}</span>`;
      return `<span class="text-muted">${formatDate(e.Fecha_Proximo_Preventivo)}</span>`;
    })() : '<span class="text-muted">—</span>';
    const expandId = 'eq-expand-' + e.ID_Activo.replace(/[^a-zA-Z0-9]/g,'_');
    const manualLink = e.Manual_Ficha_Tecnica ? `<a href="${e.Manual_Ficha_Tecnica}" target="_blank" class="icon-btn" title="Ver manual">📄</a>` : '';
    return `<tr style="cursor:pointer" onclick="toggleEquipoExpand('${expandId}')">
      <td><strong>${e.ID_Activo}</strong></td>
      <td>${e.Tipo_Equipo||'—'}</td>
      <td>${[e.Marca,e.Modelo].filter(Boolean).join(' · ')||'—'}</td>
      <td>${e.Ubicacion||'—'}</td>
      <td>${e.Responsable||'—'}</td>
      <td><span class="badge ${estadoBadge}"><span class="dot"></span>${e.Estado_Operativo||'—'}</span></td>
      <td>${proxPreventivo}</td>
      <td onclick="event.stopPropagation()"><div class="row-actions">
        ${manualLink}
        ${puedeHacer('editarEquipos') ? `<button class="icon-btn" onclick="editEquipo(${DATA.equipos.indexOf(e)})" title="Editar">✏️</button>` : ''}
        ${puedeHacer('crearIntervenciones') ? `<button class="icon-btn" onclick="openModalIntervencionEquipo('${e.ID_Activo}')" title="Nueva intervención">🔧</button>` : ''}
        <button class="icon-btn" onclick="openModalIncidenciaEquipo('${e.ID_Activo}')" title="Reportar incidencia">⚠️</button>
      </div></td>
    </tr>
    <tr class="equipo-row-expand" id="${expandId}"><td colspan="8"><div class="equipo-expand-inner">${buildIntervencionesEquipo(e.ID_Activo)}</div></td></tr>`;
  }).join('');
}

function toggleEquipoExpand(id) { const row = document.getElementById(id); if (row) row.classList.toggle('open'); }

function buildIntervencionesEquipo(equipoId) {
  const ints = DATA.intervenciones.filter(i => i.Equipo && i.Equipo.startsWith(equipoId)).sort((a,b) => new Date(b.Fecha_Realizacion||b.Fecha_Planificada) - new Date(a.Fecha_Realizacion||a.Fecha_Planificada)).slice(0,8);
  if (!ints.length) return `<div style="font-size:12px;color:var(--text-muted);padding:4px 0">Sin intervenciones registradas para este equipo.</div>`;
  const tipoBadge = {'Preventivo':'badge-green','Correctivo':'badge-red','Calibración':'badge-blue','Verificación funcional':'badge-blue','Limpieza':'badge-gray','Sustitución de pieza':'badge-orange','Control de temperatura':'badge-blue'};
  return `<div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">Últimas intervenciones</div>
    <div class="intervenciones-mini-header"><span>Tipo</span><span>Fecha</span><span>Descripción</span><span>Resultado</span></div>
    ${ints.map(i => `<div class="intervencion-mini-row">
      <span><span class="badge ${tipoBadge[i.Tipo]||'badge-gray'}" style="font-size:10px">${i.Tipo||'—'}</span></span>
      <span>${formatDate(i.Fecha_Realizacion)||formatDate(i.Fecha_Planificada)||'—'}</span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${i.Descripcion_Actuacion||''}">${i.Descripcion_Actuacion||'—'}</span>
      <span>${i.Resultado||'—'}${i.Observaciones ? ' · <em>' + i.Observaciones + '</em>' : ''}</span>
    </div>`).join('')}`;
}

function filtrarEquipos(val)       { renderEquipos(val, undefined); }
function filtrarEquiposEstado(val) { renderEquipos(undefined, val); }

// ============================================================
// INTERVENCIONES — RENDER
// ============================================================
function renderIntervenciones(filtroTipo = '') {
  const tbody = document.getElementById('tabla-intervenciones');
  let items = DATA.intervenciones;
  if (filtroTipo) items = items.filter(i => i.Tipo === filtroTipo);
  items = [...items].sort((a,b) => new Date(b.Fecha_Realizacion||b.Fecha_Planificada) - new Date(a.Fecha_Realizacion||a.Fecha_Planificada));
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">🔧</div><div class="empty-state-title">Sin intervenciones registradas</div></div></td></tr>`; return; }
  const tipoBadge = {'Preventivo':'badge-green','Correctivo':'badge-red','Calibración':'badge-blue','Verificación funcional':'badge-blue','Limpieza':'badge-gray','Sustitución de pieza':'badge-orange','Control de temperatura':'badge-blue'};
  tbody.innerHTML = items.map(i => {
    const pdfLink = i.URL_Adjunto ? `<a href="${i.URL_Adjunto}" target="_blank" title="${i.Nombre_Adjunto||'Ver documento'}" style="color:var(--accent);font-size:16px">📄</a>` : '<span class="text-muted">—</span>';
    return `<tr>
      <td><strong>${i.ID_Intervencion}</strong></td>
      <td>${i.Equipo||'—'}</td>
      <td><span class="badge ${tipoBadge[i.Tipo]||'badge-gray'}">${i.Tipo||'—'}</span></td>
      <td>${formatDate(i.Fecha_Realizacion)||formatDate(i.Fecha_Planificada)||'—'}</td>
      <td>${i.Realizado_Por||i.Tecnico_Externo||'—'}</td>
      <td>${i.Resultado||'—'}</td>
      <td>${i.Equipo_Operativo_Tras_Intervencion==='Sí'?'<span class="badge badge-green">Sí</span>':i.Equipo_Operativo_Tras_Intervencion==='No'?'<span class="badge badge-red">No</span>':'—'}</td>
      <td>${pdfLink}</td>
      <td><div class="row-actions"><button class="icon-btn" onclick="editIntervencion(${DATA.intervenciones.indexOf(i)})" title="Editar">✏️</button></div></td>
    </tr>`;
  }).join('');
}
function filtrarIntervencionesTipo(val) { renderIntervenciones(val); }

// ============================================================
// INCIDENCIAS — RENDER
// ============================================================
function renderIncidencias(filtroEstado = '') {
  const tbody = document.getElementById('tabla-incidencias');
  const rol = getUserRole();
  let items = DATA.incidencias;
  if (rol === 'Profesor') { const miNombre = currentUser?.name || ''; items = items.filter(i => i.Reportado_Por === miNombre); }
  if (filtroEstado) items = items.filter(i => i.Estado === filtroEstado);
  items = [...items].sort((a,b) => new Date(b.Fecha_Hora) - new Date(a.Fecha_Hora));
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">Sin incidencias pendientes</div></div></td></tr>`; return; }
  const estadoBadge  = {'Abierta':'badge-red','En gestión':'badge-orange','Resuelta':'badge-green','Cerrada':'badge-gray'};
  const impactoBadge = {'Equipo fuera de servicio':'badge-red','Uso limitado':'badge-orange','No bloquea':'badge-gray'};
  tbody.innerHTML = items.map(i => `<tr>
    <td><strong>${i.ID_Incidencia}</strong></td>
    <td>${i.Equipo||'—'}</td>
    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.Descripcion_Problema||'—'}</td>
    <td><span class="badge ${impactoBadge[i.Impacto]||'badge-gray'}">${i.Impacto||'—'}</span></td>
    <td>${i.Urgencia==='Urgente'?'<span class="badge badge-red">Urgente</span>':'<span class="badge badge-gray">Normal</span>'}</td>
    <td>${i.Reportado_Por||'—'}</td>
    <td>${formatDate(i.Fecha_Hora)||'—'}</td>
    <td><span class="badge ${estadoBadge[i.Estado]||'badge-gray'}">${i.Estado||'—'}</span></td>
    <td><div class="row-actions">
      ${puedeHacer('gestionarIncidencias') ? `<button class="icon-btn" onclick="cambiarEstadoIncidencia(${DATA.incidencias.indexOf(i)})" title="Cambiar estado">🔄</button>` : ''}
      ${puedeHacer('crearIntervenciones')  ? `<button class="icon-btn" onclick="crearIntervencionDesdeIncidencia('${i.ID_Incidencia}','${i.Equipo}')" title="Crear intervención">🔧</button>` : ''}
    </div></td>
  </tr>`).join('');
}
function filtrarIncidenciasEstado(val) { renderIncidencias(val); }

// ============================================================
// MODALES EQUIPOS
// ============================================================
function openModalEquipo() {
  editingRow = null; pendingEqFileBase64 = null;
  document.getElementById('modal-equipo-title').textContent = 'Nuevo equipo';
  ['eq-id','eq-marca','eq-modelo','eq-serie','eq-fecha-adq','eq-ultimo-preventivo','eq-observaciones','eq-periodicidad-custom'].forEach(id => sv(id,''));
  ['eq-tipo','eq-ubicacion','eq-responsable','eq-financiacion','eq-proveedor-compra','eq-proveedor-sat'].forEach(id => sv(id,''));
  sv('eq-estado','Operativo'); sv('eq-periodicidad','Anual'); sv('eq-pdf-url','');
  document.getElementById('eq-pdf-preview').style.display = 'none';
  document.getElementById('eq-pdf-name').textContent = '';
  if (document.getElementById('eq-pdf-input')) document.getElementById('eq-pdf-input').value = '';
  togglePeriodicidadCustom('Anual');
  poblarSelects(); openModal('modal-equipo');
}

function editEquipo(idx) {
  const e = DATA.equipos[idx];
  editingRow = { sheet: 'Equipos', rowIndex: idx };
  pendingEqFileBase64 = null;
  document.getElementById('modal-equipo-title').textContent = 'Editar equipo';
  poblarSelects();
  sv('eq-id',e.ID_Activo); sv('eq-tipo',e.Tipo_Equipo); sv('eq-marca',e.Marca);
  sv('eq-modelo',e.Modelo); sv('eq-serie',e.Numero_Serie); sv('eq-ubicacion',e.Ubicacion);
  sv('eq-responsable',e.Responsable); sv('eq-fecha-adq',e.Fecha_Adquisicion);
  sv('eq-financiacion',e.Origen_Financiacion); sv('eq-proveedor-compra',e.Proveedor_Compra);
  sv('eq-proveedor-sat',e.Proveedor_Servicio_Tecnico); sv('eq-estado',e.Estado_Operativo);
  sv('eq-periodicidad',e.Periodicidad_Mantenimiento); sv('eq-periodicidad-custom',e.Periodicidad_Custom||'');
  togglePeriodicidadCustom(e.Periodicidad_Mantenimiento);
  sv('eq-ultimo-preventivo',e.Fecha_Ultimo_Preventivo); sv('eq-observaciones',e.Observaciones);
  sv('eq-pdf-url',e.Manual_Ficha_Tecnica||'');
  if (e.Manual_Ficha_Tecnica) { document.getElementById('eq-pdf-preview').style.display = 'flex'; document.getElementById('eq-pdf-name').textContent = 'Manual adjunto (ver 📄)'; }
  else document.getElementById('eq-pdf-preview').style.display = 'none';
  openModal('modal-equipo');
}

function togglePeriodicidadCustom(val) {
  const group = document.getElementById('eq-periodicidad-custom-group');
  if (group) group.style.display = val === 'Personalizada' ? 'flex' : 'none';
}

function openModalIntervencion() {
  editingRow = null; pendingFileBase64 = null; removeFile();
  ['int-equipo','int-realizado-por','int-proveedor','int-tecnico-ext','int-fecha-plan','int-fecha-real','int-descripcion','int-observaciones'].forEach(id => sv(id,''));
  sv('int-tipo','Preventivo'); sv('int-origen','Planificado'); sv('int-resultado','Resuelto'); sv('int-operativo','Sí'); sv('int-actualiza-preventivo','Sí');
  poblarSelects(); openModal('modal-intervencion');
}

function openModalIntervencionEquipo(equipoId) {
  openModalIntervencion();
  setTimeout(() => { const sel = document.getElementById('int-equipo'); const opt = Array.from(sel.options).find(o => o.value.startsWith(equipoId)); if (opt) sel.value = opt.value; }, 50);
}

function openModalIncidencia() {
  editingRow = null;
  ['inc-equipo','inc-descripcion'].forEach(id => sv(id,''));
  sv('inc-impacto','No bloquea'); sv('inc-urgencia','Normal');
  poblarSelects(); openModal('modal-incidencia');
}

function openModalIncidenciaEquipo(equipoId) {
  openModalIncidencia();
  setTimeout(() => { const sel = document.getElementById('inc-equipo'); const opt = Array.from(sel.options).find(o => o.value.startsWith(equipoId)); if (opt) sel.value = opt.value; }, 50);
}

function crearIntervencionDesdeIncidencia(incId, equipo) {
  openModalIntervencion();
  sv('int-origen','Incidencia reportada'); sv('int-tipo','Correctivo');
  setTimeout(() => { const sel = document.getElementById('int-equipo'); const opt = Array.from(sel.options).find(o => o.value.startsWith(equipo.split(' – ')[0])); if (opt) sel.value = opt.value; }, 50);
}

// ============================================================
// ADJUNTOS EQUIPOS / INTERVENCIONES
// ============================================================
function handleFileSelect(input) {
  const file = input.files[0]; if (!file) return;
  document.getElementById('int-pdf-name').textContent = file.name;
  document.getElementById('int-pdf-preview').style.display = 'flex';
  const reader = new FileReader();
  reader.onload = e => { pendingFileBase64 = { name: file.name, type: file.type, data: e.target.result.split(',')[1] }; };
  reader.readAsDataURL(file);
}
function removeFile() {
  pendingFileBase64 = null;
  document.getElementById('int-pdf-preview').style.display = 'none';
  document.getElementById('int-pdf-name').textContent = '';
  document.getElementById('int-pdf-input').value = '';
  document.getElementById('int-pdf-url').value = '';
}
function handleEqFileSelect(input) {
  const file = input.files[0]; if (!file) return;
  document.getElementById('eq-pdf-name').textContent = file.name;
  document.getElementById('eq-pdf-preview').style.display = 'flex';
  const reader = new FileReader();
  reader.onload = e => { pendingEqFileBase64 = { name: file.name, type: file.type, data: e.target.result.split(',')[1] }; };
  reader.readAsDataURL(file);
}
function removeEqFile() {
  pendingEqFileBase64 = null;
  document.getElementById('eq-pdf-preview').style.display = 'none';
  document.getElementById('eq-pdf-name').textContent = '';
  document.getElementById('eq-pdf-input').value = '';
  document.getElementById('eq-pdf-url').value = '';
}

// ============================================================
// GUARDAR EQUIPOS / INTERVENCIONES / INCIDENCIAS
// ============================================================
function calcProximoPreventivo(ultimoPreventivo, periodicidad) {
  if (!ultimoPreventivo || periodicidad === 'Personalizada') return '';
  const d = new Date(ultimoPreventivo);
  const meses = {'Mensual':1,'Trimestral':3,'Semestral':6,'Anual':12}[periodicidad];
  if (!meses) return '';
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().split('T')[0];
}

async function guardarEquipo() {
  const id = v('eq-id'); const tipo = v('eq-tipo'); const marca = v('eq-marca');
  if (!id || !tipo) { showToast('ID y tipo son obligatorios', 'error'); return; }
  if (!marca)       { showToast('La marca es obligatoria', 'error'); return; }

  const ultimo = v('eq-ultimo-preventivo');
  const periodicidad = v('eq-periodicidad');
  const periodicidadCustom = periodicidad === 'Personalizada' ? v('eq-periodicidad-custom') : '';
  const proximo = calcProximoPreventivo(ultimo, periodicidad);

  let manualUrl = v('eq-pdf-url') || '';
  if (pendingEqFileBase64) {
    showLoading('Subiendo manual...');
    try { manualUrl = await uploadFileToDrive(pendingEqFileBase64.data, pendingEqFileBase64.name, pendingEqFileBase64.type); }
    catch(e) { showToast('Error subiendo el PDF. Guardando sin él.', 'error'); }
    pendingEqFileBase64 = null;
  }

  const row = [id, tipo, marca, v('eq-modelo'), v('eq-serie'), v('eq-ubicacion'), v('eq-responsable'), v('eq-fecha-adq'), v('eq-financiacion'), v('eq-proveedor-compra'), v('eq-proveedor-sat'), v('eq-estado'), periodicidad, periodicidadCustom, ultimo, proximo, manualUrl, v('eq-observaciones')];

  showLoading('Guardando...');
  try {
    if (editingRow && editingRow.sheet === 'Equipos') {
      await sheetsUpdate(`Equipos!A${editingRow.rowIndex + 2}:R${editingRow.rowIndex + 2}`, row);
      DATA.equipos[editingRow.rowIndex] = rowToObj(row, 'equipos');
      showToast('Equipo actualizado', 'success');
    } else {
      await sheetsAppend('Equipos', row);
      DATA.equipos.push(rowToObj(row, 'equipos'));
      showToast('Equipo guardado', 'success');
    }
    closeModal('modal-equipo'); renderAll();
  } catch(e) { showToast('Error guardando', 'error'); console.error(e); }
  hideLoading(); editingRow = null;
}

async function guardarIntervencion() {
  const equipo = v('int-equipo'); const desc = v('int-descripcion');
  if (!equipo || !desc) { showToast('Equipo y descripción son obligatorios', 'error'); return; }

  const id = genId('INT-');
  const fechaReal = v('int-fecha-real') || new Date().toISOString().split('T')[0];
  let urlAdjunto = v('int-pdf-url') || '', nombreAdjunto = '';

  if (pendingFileBase64) {
    showLoading('Subiendo documento...');
    try { urlAdjunto = await uploadFileToDrive(pendingFileBase64.data, pendingFileBase64.name, pendingFileBase64.type); nombreAdjunto = pendingFileBase64.name; }
    catch(e) { showToast('Error subiendo el PDF. Revisa permisos de Drive.', 'error'); hideLoading(); return; }
  }

  const tipo = v('int-tipo');
  const row = [id, equipo, tipo, v('int-origen'), v('int-fecha-plan'), fechaReal, v('int-realizado-por'), v('int-tecnico-ext'), v('int-proveedor'), desc, v('int-resultado'), v('int-operativo'), urlAdjunto, '', v('int-actualiza-preventivo'), v('int-observaciones'), nombreAdjunto];

  showLoading('Guardando...');
  try {
    await sheetsAppend('Intervenciones', row);
    DATA.intervenciones.push(rowToObj(row, 'intervenciones'));

    if (v('int-actualiza-preventivo') === 'Sí' && tipo === 'Preventivo') {
      const equipoId = equipo.split(' – ')[0];
      const eqIdx = DATA.equipos.findIndex(e => e.ID_Activo === equipoId);
      if (eqIdx !== -1) {
        const eq = DATA.equipos[eqIdx];
        const nuevo = calcProximoPreventivo(fechaReal, eq.Periodicidad_Mantenimiento);
        if (nuevo) {
          eq.Fecha_Ultimo_Preventivo = fechaReal; eq.Fecha_Proximo_Preventivo = nuevo;
          const eqRow = [eq.ID_Activo, eq.Tipo_Equipo, eq.Marca, eq.Modelo, eq.Numero_Serie, eq.Ubicacion, eq.Responsable, eq.Fecha_Adquisicion, eq.Origen_Financiacion, eq.Proveedor_Compra, eq.Proveedor_Servicio_Tecnico, eq.Estado_Operativo, eq.Periodicidad_Mantenimiento, eq.Periodicidad_Custom, eq.Fecha_Ultimo_Preventivo, eq.Fecha_Proximo_Preventivo, eq.Manual_Ficha_Tecnica, eq.Observaciones];
          await sheetsUpdate(`Equipos!A${eqIdx + 2}:R${eqIdx + 2}`, eqRow);
        }
      }
    }
    pendingFileBase64 = null;
    showToast('Intervención registrada', 'success');
    closeModal('modal-intervencion'); renderAll();
  } catch(e) { showToast('Error guardando', 'error'); console.error(e); }
  hideLoading();
}

function editIntervencion(idx) {
  const i = DATA.intervenciones[idx];
  editingRow = { sheet: 'Intervenciones', rowIndex: idx };
  poblarSelects();
  sv('int-equipo',i.Equipo); sv('int-tipo',i.Tipo); sv('int-origen',i.Origen);
  sv('int-fecha-plan',i.Fecha_Planificada); sv('int-fecha-real',i.Fecha_Realizacion);
  sv('int-realizado-por',i.Realizado_Por); sv('int-tecnico-ext',i.Tecnico_Externo);
  sv('int-proveedor',i.Proveedor); sv('int-descripcion',i.Descripcion_Actuacion);
  sv('int-resultado',i.Resultado); sv('int-operativo',i.Equipo_Operativo_Tras_Intervencion);
  sv('int-actualiza-preventivo',i.Actualiza_Proximo_Preventivo); sv('int-observaciones',i.Observaciones);
  sv('int-pdf-url',i.URL_Adjunto||'');
  if (i.URL_Adjunto) { document.getElementById('int-pdf-preview').style.display = 'flex'; document.getElementById('int-pdf-name').textContent = i.Nombre_Adjunto || 'Documento adjunto'; }
  else document.getElementById('int-pdf-preview').style.display = 'none';
  openModal('modal-intervencion');
}

async function guardarIncidencia() {
  const equipo = v('inc-equipo'); const desc = v('inc-descripcion');
  if (!equipo || !desc) { showToast('Equipo y descripción son obligatorios', 'error'); return; }
  const id = genId('INC-');
  const row = [id, equipo, currentUser?.name || 'Usuario', new Date().toISOString().replace('T',' ').slice(0,16), desc, v('inc-impacto'), v('inc-urgencia'), 'Abierta', ''];
  showLoading('Guardando...');
  try {
    await sheetsAppend('Incidencias', row);
    DATA.incidencias.push(rowToObj(row, 'incidencias'));
    showToast('Incidencia reportada', 'success');
    closeModal('modal-incidencia'); renderAll();
  } catch(e) { showToast('Error guardando', 'error'); }
  hideLoading();
}

async function cambiarEstadoIncidencia(idx) {
  const i = DATA.incidencias[idx];
  const estados = ['Abierta','En gestión','Resuelta','Cerrada'];
  const next = estados[(estados.indexOf(i.Estado) + 1) % estados.length];
  if (!confirm(`¿Cambiar estado de "${i.ID_Incidencia}" a "${next}"?`)) return;
  i.Estado = next;
  const row = [i.ID_Incidencia, i.Equipo, i.Reportado_Por, i.Fecha_Hora, i.Descripcion_Problema, i.Impacto, i.Urgencia, i.Estado, i.Intervencion_Generada];
  showLoading('Actualizando...');
  try { await sheetsUpdate(`Incidencias!A${idx + 2}:I${idx + 2}`, row); showToast('Estado actualizado', 'success'); renderAll(); }
  catch(e) { showToast('Error', 'error'); }
  hideLoading();
}
