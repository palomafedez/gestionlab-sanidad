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

  const bajominimo = DATA.material.filter(m => stockBajoMinimo(m));
  setText('stat-stock-bajo', bajominimo.length);

  const alertasStock = document.getElementById('alertas-stock-container');
  if (!alertasStock) return;
  alertasStock.innerHTML = '';
  if (bajominimo.length) {
    const criticos = bajominimo.filter(m => getStockTotal(m) === 0);
    const bajos    = bajominimo.filter(m => getStockTotal(m) > 0);
    const puedeGestionar = puedeHacer('gestionarPedidos');
    const renderItemsStock = items => items.slice(0,5).map(m => {
      const stock = getStockTotal(m);
      const opt   = parseFloat(m.Stock_Optimo) || 0;
      const falta = opt > 0 ? Math.max(0, opt - stock) : 0;
      const solPedido = DATA.solicitudes.find(s => s.Material === m.Nombre && (s.Estado === 'En pedido' || s.Estado === 'En camino'));
      const btnPedido = puedeGestionar
        ? (solPedido && solPedido.Lista_Pedido
            ? `<button class="btn btn-secondary" style="padding:2px 8px;font-size:11px" onclick="event.stopPropagation();verDetallePedido('${solPedido.Lista_Pedido}')">Ver pedido</button>`
            : `<button class="btn btn-secondary" style="padding:2px 8px;font-size:11px" onclick="event.stopPropagation();solicitudStockAPedido('${m.ID_Material}',${falta||''})">+ Pedido${falta ? ' (' + falta + ')' : ''}</button>`)
        : '';
      return `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:8px">${m.Nombre} (${stock} ${m.Unidad||''}) ${btnPedido}</span>`;
    }).join('');
    if (criticos.length) alertasStock.innerHTML += `<div class="alert-banner danger"><div class="alert-icon">🔴</div><div class="alert-content"><div class="alert-title">${criticos.length} material(es) sin stock</div><div class="alert-text" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:4px">${renderItemsStock(criticos)}${criticos.length > 5 ? ' y ' + (criticos.length-5) + ' más...' : ''}</div></div></div>`;
    if (bajos.length)    alertasStock.innerHTML += `<div class="alert-banner"><div class="alert-icon">🟡</div><div class="alert-content"><div class="alert-title">${bajos.length} material(es) por debajo del mínimo</div><div class="alert-text" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:4px">${renderItemsStock(bajos)}${bajos.length > 5 ? ' y ' + (bajos.length-5) + ' más...' : ''}</div></div></div>`;
  }

  // Alertas específicas de zona común (almacén central)
  const alertasZC = DATA.material
    .map(m => ({ m, lotes: getLotesZonaComunBajoMinimo(m) }))
    .filter(({ lotes }) => lotes.length > 0);
  if (alertasZC.length) {
    const puedeGestionar = puedeHacer('gestionarPedidos');
    const itemsZC = alertasZC.slice(0, 6).map(({ m, lotes }) => {
      const stock = lotes.reduce((s, l) => s + (parseFloat(l.Stock_Local) || 0), 0);
      const solPedido = DATA.solicitudes.find(s => s.Material === m.Nombre && (s.Estado === 'En pedido' || s.Estado === 'En camino'));
      const opt   = parseFloat(m.Stock_Optimo) || 0;
      const total = getStockTotal(m);
      const falta = opt > 0 ? Math.max(0, opt - total) : 0;
      const btnPedido = puedeGestionar
        ? (solPedido && solPedido.Lista_Pedido
            ? `<button class="btn btn-secondary" style="padding:2px 8px;font-size:11px" onclick="event.stopPropagation();verDetallePedido('${solPedido.Lista_Pedido}')">Ver pedido</button>`
            : `<button class="btn btn-secondary" style="padding:2px 8px;font-size:11px" onclick="event.stopPropagation();solicitudStockAPedido('${m.ID_Material}',${falta||''})">+ Pedido${falta ? ' (' + falta + ')' : ''}</button>`)
        : '';
      return `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:8px">${m.Nombre} (zona común: ${stock} ${m.Unidad||''}) ${btnPedido}</span>`;
    }).join('');
    alertasStock.innerHTML += `<div class="alert-banner" style="border-left:3px solid var(--accent);background:var(--accent-light)"><div class="alert-icon">🏬</div><div class="alert-content"><div class="alert-title" style="color:var(--accent)">${alertasZC.length} material(es) bajo mínimo en la zona común (almacén)</div><div class="alert-text" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:4px">${itemsZC}${alertasZC.length > 6 ? ' y ' + (alertasZC.length-6) + ' más...' : ''}</div></div></div>`;
  }

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
  const ints = DATA.intervenciones.filter(i => i.Equipo && i.Equipo.startsWith(equipoId))
    .sort((a,b) => new Date(b.Fecha_Realizacion||b.Fecha_Planificada) - new Date(a.Fecha_Realizacion||a.Fecha_Planificada))
    .slice(0,8);
  if (!ints.length) return `<div style="font-size:12px;color:var(--text-muted);padding:4px 0">Sin intervenciones registradas para este equipo.</div>`;
  const tipoBadge = {'Preventivo':'badge-green','Correctivo':'badge-red','Calibración':'badge-blue','Verificación funcional':'badge-blue','Limpieza':'badge-gray','Sustitución de pieza':'badge-orange','Control de temperatura':'badge-blue'};
  const estadoBadgeInt = {'Planificada':'badge-blue','En gestión':'badge-orange','Cerrada':'badge-green','Pendiente factura':'badge-red'};
  return `<div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">Últimas intervenciones</div>
    <div class="intervenciones-mini-header"><span>Tipo</span><span>Estado</span><span>Fecha</span><span>Descripción</span><span>Resultado</span><span></span></div>
    ${ints.map(i => {
      const intIdx = DATA.intervenciones.indexOf(i);
      const puedeRegistrar = puedeHacer('crearIntervenciones') && (i.Estado === 'Planificada' || i.Estado === 'En gestión' || !i.Estado);
      const btnLabel = i.Estado === 'Planificada' ? '🔧 Ejecutar' : '📋 Añadir actuación';
      return `<div class="intervencion-mini-row">
        <span><span class="badge ${tipoBadge[i.Tipo]||'badge-gray'}" style="font-size:10px">${i.Tipo||'—'}</span></span>
        <span>${i.Estado ? `<span class="badge ${estadoBadgeInt[i.Estado]||'badge-gray'}" style="font-size:10px">${i.Estado}</span>` : '—'}</span>
        <span>${formatDate(i.Fecha_Realizacion)||formatDate(i.Fecha_Planificada)||'—'}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${i.Descripcion_Actuacion||''}">${i.Descripcion_Actuacion||i.Descripcion_Planificada||'—'}</span>
        <span>${i.Resultado||'—'}${i.Observaciones ? ' · <em>' + i.Observaciones + '</em>' : ''}</span>
        <span>${puedeRegistrar ? `<button class="btn btn-secondary" style="padding:2px 8px;font-size:11px" onclick="event.stopPropagation();openModalActuacionDerivada(${intIdx})">${btnLabel}</button>` : ''}</span>
      </div>`;
    }).join('')}`;
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
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon">🔧</div><div class="empty-state-title">Sin intervenciones registradas</div></div></td></tr>`; return; }
  const tipoBadge  = {'Preventivo':'badge-green','Correctivo':'badge-red','Calibración':'badge-blue','Verificación funcional':'badge-blue','Limpieza':'badge-gray','Sustitución de pieza':'badge-orange','Control de temperatura':'badge-blue'};
  const estadoBadge = {'Planificada':'badge-blue','En gestión':'badge-orange','Cerrada':'badge-green','Pendiente factura':'badge-red'};
  tbody.innerHTML = items.map(i => {
    const pdfLink = i.URL_Adjunto ? `<a href="${i.URL_Adjunto}" target="_blank" title="${i.Nombre_Adjunto||'Ver documento'}" style="color:var(--accent);font-size:16px">📄</a>` : '<span class="text-muted">—</span>';
    const intIdx  = DATA.intervenciones.indexOf(i);
    const puedeRegistrar = puedeHacer('crearIntervenciones') && (i.Estado === 'Planificada' || i.Estado === 'En gestión' || !i.Estado);
    const btnLabel = i.Estado === 'Planificada' ? '🔧 Ejecutar' : '📋 Añadir actuación';
    return `<tr>
      <td><strong>${i.ID_Intervencion}</strong></td>
      <td>${i.Equipo||'—'}</td>
      <td><span class="badge ${tipoBadge[i.Tipo]||'badge-gray'}">${i.Tipo||'—'}</span></td>
      <td>${i.Estado ? `<span class="badge ${estadoBadge[i.Estado]||'badge-gray'}">${i.Estado}</span>` : '—'}</td>
      <td>${formatDate(i.Fecha_Realizacion)||formatDate(i.Fecha_Planificada)||'—'}</td>
      <td>${i.Realizado_Por||i.Tecnico_Externo||'—'}</td>
      <td>${i.Resultado||'—'}</td>
      <td>${i.Equipo_Operativo_Tras_Intervencion==='Sí'?'<span class="badge badge-green">Sí</span>':i.Equipo_Operativo_Tras_Intervencion==='No'?'<span class="badge badge-red">No</span>':'—'}</td>
      <td>${pdfLink}</td>
      <td><div class="row-actions">
        ${puedeRegistrar ? `<button class="btn btn-secondary" style="padding:2px 8px;font-size:11px" onclick="openModalActuacionDerivada(${intIdx})">${btnLabel}</button>` : ''}
        ${puedeHacer('crearIntervenciones') ? `<button class="icon-btn" onclick="editIntervencion(${intIdx})" title="Editar directamente">✏️</button>` : ''}
      </div></td>
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
  // Ocultar incidencias archivadas a menos que se filtre explícitamente
  if (filtroEstado !== 'Archivada') items = items.filter(i => i.Estado !== 'Archivada');
  items = [...items].sort((a,b) => new Date(b.Fecha_Hora) - new Date(a.Fecha_Hora));
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">Sin incidencias pendientes</div></div></td></tr>`; return; }
  const estadoBadge  = {'Abierta':'badge-red','En gestión':'badge-orange','Resuelta':'badge-green','Cerrada':'badge-gray'};
  const impactoBadge = {'Equipo fuera de servicio':'badge-red','Uso limitado':'badge-orange','No bloquea':'badge-gray'};
  tbody.innerHTML = items.map(i => {
    const incIdx = DATA.incidencias.indexOf(i);
    // Botón contextual según estado e intervención enlazada
    let btnAccion = '';
    if (puedeHacer('crearIntervenciones')) {
      if (i.Estado === 'Abierta') {
        btnAccion = `<button class="btn btn-secondary" style="padding:2px 8px;font-size:11px" onclick="abrirPlanificacion('${i.ID_Incidencia}','${i.Equipo}')">Responder</button>`;
      } else if ((i.Estado === 'En gestión') && i.Intervencion_Generada) {
        const intEnl = DATA.intervenciones.find(x => x.ID_Intervencion === i.Intervencion_Generada);
        const intIdx = intEnl ? DATA.intervenciones.indexOf(intEnl) : -1;
        btnAccion = intIdx >= 0
          ? `<button class="btn btn-secondary" style="padding:2px 8px;font-size:11px" onclick="openModalActuacionDerivada(${intIdx})">Ver / Actuar</button>`
          : `<span class="text-muted" style="font-size:11px">${i.Intervencion_Generada}</span>`;
      }
    }
    if (!btnAccion && puedeHacer('gestionarIncidencias') && i.Estado !== 'Resuelta' && i.Estado !== 'Cerrada') {
      btnAccion = `<button class="icon-btn" onclick="cambiarEstadoIncidencia(${incIdx})" title="Cambiar estado">🔄</button>`;
    }
    return `<tr>
      <td><strong>${i.ID_Incidencia}</strong></td>
      <td>${i.Equipo||'—'}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.Descripcion_Problema||'—'}</td>
      <td><span class="badge ${impactoBadge[i.Impacto]||'badge-gray'}">${i.Impacto||'—'}</span></td>
      <td>${i.Urgencia==='Urgente'?'<span class="badge badge-red">Urgente</span>':'<span class="badge badge-gray">Normal</span>'}</td>
      <td>${i.Reportado_Por||'—'}</td>
      <td>${formatDate(i.Fecha_Hora)||'—'}</td>
      <td><span class="badge ${estadoBadge[i.Estado]||'badge-gray'}">${i.Estado||'—'}</span></td>
      <td><div class="row-actions">${btnAccion}</div></td>
    </tr>`;
  }).join('');
}
function filtrarIncidenciasEstado(val) { renderIncidencias(val); }
