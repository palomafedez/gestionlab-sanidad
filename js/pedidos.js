// ============================================================
// SOLICITUDES — RENDER Y LÓGICA
// ============================================================
function renderSolicitudes(filtroEstado = '') {
  const tbody = document.getElementById('tabla-solicitudes');
  if (!tbody) return;
  const rol = getUserRole();
  let items = DATA.solicitudes;
  if (rol === 'Profesor' || rol === 'Alumno') { const miNombre = currentUser?.name||''; items = items.filter(s => s.Solicitante === miNombre); }
  if (filtroEstado) items = items.filter(s => s.Estado === filtroEstado);
  items = [...items].sort((a,b) => new Date(b.Fecha) - new Date(a.Fecha));
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Sin solicitudes</div></div></td></tr>`; return; }
  const estadoBadge   = {'Pendiente':'badge-orange','En pedido':'badge-blue','Recibido':'badge-green','Rechazado':'badge-red'};
  const urgenciaBadge = {'Urgente':'badge-red','Normal':'badge-gray'};
  const puedeGestionar = rol === 'Administrador' || rol === 'Gestor';
  tbody.innerHTML = items.map(s => `<tr>
    <td><strong>${s.ID_Solicitud}</strong></td>
    <td>${s.Material}</td>
    <td>${s.Cantidad_Solicitada}</td>
    <td style="font-size:12px">${s.Solicitante}</td>
    <td style="font-size:12px">${formatDate(s.Fecha)}</td>
    <td><span class="badge ${urgenciaBadge[s.Urgencia]||'badge-gray'}">${s.Urgencia||'Normal'}</span></td>
    <td style="font-size:12px">${s.Proveedor_Requerido||'—'}</td>
    <td><span class="badge ${estadoBadge[s.Estado]||'badge-gray'}">${s.Estado||'Pendiente'}</span></td>
    <td><div class="row-actions">
      ${puedeGestionar ? `<button class="icon-btn" title="Añadir a pedido" onclick="solicitudAPedido('${s.ID_Solicitud}')">🛒</button>` : ''}
      ${puedeGestionar ? `<button class="icon-btn" title="Rechazar" onclick="rechazarSolicitud('${s.ID_Solicitud}')">✕</button>` : ''}
    </div></td>
  </tr>`).join('');
  const pendientes = DATA.solicitudes.filter(s => s.Estado === 'Pendiente').length;
  const badge = document.getElementById('badge-solicitudes');
  if (badge) { badge.textContent = pendientes; badge.style.display = pendientes > 0 ? '' : 'none'; }
}
function filtrarSolicitudesEstado(v) { renderSolicitudes(v); }

// ============================================================
// PEDIDOS — RENDER
// ============================================================
const SECUENCIA_ESTADOS = ['Abierto','Presupuesto solicitado','Presupuesto aprobado','Recepción parcial','Recepción completa'];

function estadoPedidoClass(estado) {
  return {'Abierto':'estado-abierto','Presupuesto solicitado':'estado-presupuesto','Presupuesto aprobado':'estado-aprobado','Recepción parcial':'estado-recepcion','Recepción completa':'estado-completo'}[estado] || 'estado-abierto';
}

function renderPedidos(filtroEstado = '') {
  const cont = document.getElementById('pedidos-lista');
  if (!cont) return;
  let items = [...DATA.pedidos];
  if (filtroEstado) items = items.filter(p => p.Estado === filtroEstado);
  items.sort((a,b) => new Date(b.Fecha_Creacion) - new Date(a.Fecha_Creacion));
  if (!items.length) { cont.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🛒</div><div class="empty-state-title">Sin listas de pedido</div><div class="empty-state-text">Crea la primera lista con el botón superior</div></div>`; return; }
  cont.innerHTML = items.map(p => {
    const lineas   = DATA.lineasPedido.filter(l => l.Pedido === p.ID_Pedido);
    const recibidas = lineas.filter(l => l.Estado_Linea === 'Recibido').length;
    return `<div class="pedido-card" onclick="verDetallePedido('${p.ID_Pedido}')">
      <div class="pedido-card-header">
        <div><div class="pedido-card-title">${p.Nombre_Lista}</div><div class="pedido-card-meta">${p.Proveedor||'Sin proveedor asignado'} · Creado ${formatDate(p.Fecha_Creacion)}</div></div>
        <div style="display:flex;gap:8px;align-items:center" onclick="event.stopPropagation()">
          <span class="estado-pedido ${estadoPedidoClass(p.Estado)}">${p.Estado}</span>
          <button class="icon-btn" title="Cambiar estado" onclick="openModalEstadoPedido('${p.ID_Pedido}')">🔄</button>
        </div>
      </div>
      <div class="pedido-card-stats">
        <div class="pedido-stat"><strong>${lineas.length}</strong> líneas</div>
        <div class="pedido-stat"><strong>${recibidas}</strong> recibidas</div>
        ${p.Numero_Factura ? `<div class="pedido-stat">Factura <strong>${p.Numero_Factura}</strong></div>` : ''}
        ${(() => { const coste = DATA.lineasPedido.filter(l => l.Pedido === p.ID_Pedido).reduce((sum,l) => sum + (parseFloat(l.Precio_Unitario)||0)*(parseFloat(l.Cantidad_Pedida)||0), 0); return coste > 0 ? `<div class="pedido-stat">Total <strong>${coste.toFixed(2)} €</strong></div>` : ''; })()}
      </div>
    </div>`;
  }).join('');
}
function filtrarPedidosEstado(v) { renderPedidos(v); }

function verDetallePedido(pedidoId) {
  const p = DATA.pedidos.find(x => x.ID_Pedido === pedidoId);
  if (!p) return;
  const lineas = DATA.lineasPedido.filter(l => l.Pedido === pedidoId);
  const puedeEditar  = getUserRole() === 'Administrador' || getUserRole() === 'Gestor';
  const puedeAddLinea = p.Estado === 'Abierto' && puedeEditar;
  const cont = document.getElementById('pedido-detalle-contenido');
  cont.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <div><div class="card-title">${p.Nombre_Lista}</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">${p.ID_Pedido}</div></div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="estado-pedido ${estadoPedidoClass(p.Estado)}">${p.Estado}</span>
          ${puedeEditar ? `<button class="btn btn-secondary" onclick="openModalEstadoPedido('${p.ID_Pedido}')">🔄 Estado</button>` : ''}
          ${puedeEditar ? `<button class="btn btn-primary" onclick="abrirGeneradorHoja('${p.ID_Pedido}')">📄 Generar hoja</button>` : ''}
        </div>
      </div>
      <div style="padding:16px 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        <div class="detail-item"><div class="detail-label">Proveedor</div><div class="detail-value">${p.Proveedor||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Creado</div><div class="detail-value">${formatDate(p.Fecha_Creacion)||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Presupuesto</div><div class="detail-value">${formatDate(p.Fecha_Presupuesto)||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Aprobado</div><div class="detail-value">${formatDate(p.Fecha_Aprobacion)||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Nº Factura</div><div class="detail-value">${p.Numero_Factura||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Coste total</div><div class="detail-value">${(() => { const coste = DATA.lineasPedido.filter(l => l.Pedido === pedidoId).reduce((sum,l) => sum + (parseFloat(l.Precio_Unitario)||0)*(parseFloat(l.Cantidad_Pedida)||0), 0); return coste > 0 ? coste.toFixed(2) + ' €' : '—'; })()}</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Líneas del pedido (${lineas.length})</div>
        <div style="display:flex;gap:8px">${puedeAddLinea ? `<button class="btn btn-secondary" onclick="openModalNuevaLinea('${pedidoId}')">+ Añadir línea</button>` : ''}</div>
      </div>
      <div style="padding:12px 16px">
        ${!lineas.length ? `<div class="empty-state" style="padding:24px"><div class="empty-state-icon">📝</div><div class="empty-state-title">Sin líneas todavía</div></div>` :
          lineas.map(l => {
            const estadoLinea = {'Pendiente':'badge-orange','Recibido parcialmente':'badge-blue','Recibido':'badge-green'}[l.Estado_Linea] || 'badge-gray';
            const puedeEliminar = puedeEditar && l.Estado_Linea === 'Pendiente';
            return `<div class="linea-row" style="grid-template-columns:1fr 70px 70px 110px auto">
              <div style="font-weight:500;font-size:13px">${l.Material}</div>
              <div style="text-align:center;font-size:12px;color:var(--text-soft)">Ped: ${l.Cantidad_Pedida}</div>
              <div style="text-align:center;font-size:12px">Rec: ${l.Cantidad_Recibida||'0'}</div>
              <div><span class="badge ${estadoLinea}" style="font-size:10px">${l.Estado_Linea||'Pendiente'}</span></div>
              <div style="display:flex;gap:4px">
                ${puedeEditar && l.Estado_Linea !== 'Recibido' ? `<button class="icon-btn" title="Registrar recepción" onclick="openModalRecepcion('${l.ID_Linea}','${pedidoId}')">📥</button>` : ''}
                ${puedeEliminar ? `<button class="icon-btn danger" title="Eliminar línea" onclick="eliminarLineaPedido('${l.ID_Linea}','${pedidoId}')">🗑️</button>` : ''}
              </div>
            </div>`;
          }).join('')}
      </div>
    </div>`;
  showPage('pedido-detalle');
}

// ============================================================
// MODALES PEDIDOS / SOLICITUDES
// ============================================================
function setSourceSolicitud(source) {
  const esCatalogo = source === 'catalogo';
  document.getElementById('btn-source-catalogo').classList.toggle('active', esCatalogo);
  document.getElementById('btn-source-nuevo').classList.toggle('active', !esCatalogo);
  document.getElementById('sol-catalogo-group').style.display = esCatalogo ? '' : 'none';
  document.getElementById('sol-nuevo-group').style.display = esCatalogo ? 'none' : '';
  document.getElementById('sol-unidad-group').style.display = esCatalogo ? 'none' : '';
}
function setSourceLinea(source) {
  const esCatalogo = source === 'catalogo';
  document.getElementById('btn-lsource-catalogo').classList.toggle('active', esCatalogo);
  document.getElementById('btn-lsource-libre').classList.toggle('active', !esCatalogo);
  document.getElementById('linea-catalogo-group').style.display = esCatalogo ? '' : 'none';
  document.getElementById('linea-libre-group').style.display = esCatalogo ? 'none' : '';
  document.getElementById('linea-libre-unidad-group').style.display = esCatalogo ? 'none' : '';
}

function openModalSolicitud() {
  setSourceSolicitud('catalogo');
  document.getElementById('sol-material-id').value = '';
  document.getElementById('sol-material-selected').style.display = 'none';
  document.getElementById('sol-search').value = '';
  sv('sol-cantidad',''); sv('sol-urgencia','Normal'); sv('sol-fecha-necesidad','');
  sv('sol-motivo',''); sv('sol-obs',''); sv('sol-unidad','');
  const sel = document.getElementById('sol-proveedor');
  sel.innerHTML = '<option value="">Sin preferencia</option>' + DATA.proveedores.filter(p => p.Activo !== 'FALSE').map(p => `<option value="${p.Nombre_Proveedor}">${p.Nombre_Proveedor}</option>`).join('');
  openModal('modal-solicitud');
}

function openModalNuevoPedido() {
  sv('ped-nombre',''); sv('ped-obs','');
  const sel = document.getElementById('ped-proveedor');
  sel.innerHTML = '<option value="">Sin asignar todavía</option>' + DATA.proveedores.filter(p => p.Activo !== 'FALSE').map(p => `<option value="${p.Nombre_Proveedor}">${p.Nombre_Proveedor}</option>`).join('');
  openModal('modal-nuevo-pedido');
}

function openModalNuevaLinea(pedidoId) {
  sv('linea-pedido-id', pedidoId);
  setSourceLinea('catalogo');
  document.getElementById('linea-material-id').value = '';
  document.getElementById('linea-material-selected').style.display = 'none';
  document.getElementById('linea-search').value = '';
  sv('linea-cantidad',''); sv('linea-obs',''); sv('linea-material-libre','');
  openModal('modal-nueva-linea');
}

function openModalEstadoPedido(pedidoId) {
  sv('estado-pedido-id', pedidoId);
  const p = DATA.pedidos.find(x => x.ID_Pedido === pedidoId);
  if (p) sv('estado-pedido-nuevo', p.Estado);
  sv('estado-num-presupuesto',''); sv('estado-num-factura','');
  const selEstado = document.getElementById('estado-pedido-nuevo');
  const actualizarCampos = () => {
    const est = selEstado.value;
    document.getElementById('grupo-num-presupuesto').style.display = est === 'Presupuesto solicitado' || est === 'Presupuesto aprobado' ? '' : 'none';
    document.getElementById('grupo-num-factura').style.display = 'none'; // El nº factura se rellena desde el generador de hoja
    document.getElementById('grupo-proveedor-estado').style.display = !p?.Proveedor ? '' : 'none';
  };
  selEstado.onchange = actualizarCampos; actualizarCampos();
  const selProv = document.getElementById('estado-proveedor');
  selProv.innerHTML = '<option value="">Sin cambios</option>' + DATA.proveedores.filter(x => x.Activo !== 'FALSE').map(x => `<option value="${x.Nombre_Proveedor}">${x.Nombre_Proveedor}</option>`).join('');
  openModal('modal-estado-pedido');
}

function openModalRecepcion(lineaId, pedidoId) {
  sv('rec-linea-id', lineaId); sv('rec-pedido-id', pedidoId); sv('rec-obs','');
  const l = DATA.lineasPedido.find(x => x.ID_Linea === lineaId);
  if (l) { document.getElementById('rec-material-nombre').textContent = l.Material; document.getElementById('rec-cantidad-pedida').textContent = l.Cantidad_Pedida; sv('rec-cantidad', l.Cantidad_Pedida); }
  openModal('modal-recepcion-linea');
}

// ============================================================
// GUARDAR SOLICITUDES
// ============================================================
async function guardarSolicitud() {
  const esNuevo = document.getElementById('btn-source-nuevo').classList.contains('active');
  let materialNombre = '', materialId = '';
  if (esNuevo) {
    materialNombre = v('sol-material-libre');
    const unidad = v('sol-unidad');
    if (!unidad) { showToast('La unidad es obligatoria para material no catalogado', 'error'); return; }
    if (materialNombre) materialNombre = materialNombre + ' [' + unidad + ']';
  } else {
    materialId = document.getElementById('sol-material-id').value;
    const mat = DATA.material.find(m => m.ID_Material === materialId);
    materialNombre = mat ? mat.Nombre : '';
  }
  if (!materialNombre) { showToast('Indica el material', 'error'); return; }
  const cant = v('sol-cantidad');
  if (!cant || parseFloat(cant) <= 0) { showToast('Indica la cantidad', 'error'); return; }

  const id = genId('SOL-');
  const fecha    = new Date().toISOString().split('T')[0];
  const usuario  = currentUser?.name || 'Usuario';
  const urgencia = v('sol-urgencia');
  const fechaNecesidad = v('sol-fecha-necesidad');
  const rowSheet = [id, materialNombre, cant, usuario, fecha, v('sol-motivo') + (fechaNecesidad ? ' · Necesario: ' + fechaNecesidad : ''), v('sol-proveedor'), 'Pendiente', '', urgencia === 'Urgente' ? '⚠️ URGENTE — ' + v('sol-obs') : v('sol-obs')];

  showLoading('Guardando...');
  try {
    await sheetsAppend('Solicitudes', rowSheet);
    const objLocal = { ID_Solicitud: id, Material: materialNombre, Cantidad_Solicitada: cant, Solicitante: usuario, Fecha: fecha, Motivo: v('sol-motivo'), Proveedor_Requerido: v('sol-proveedor'), Estado: 'Pendiente', Lista_Pedido: '', Observaciones: rowSheet[9], Urgencia: urgencia };
    DATA.solicitudes.push(objLocal);
    showToast('Solicitud enviada', 'success');
    closeModal('modal-solicitud'); renderSolicitudes(); updateBadges();
  } catch(e) { showToast('Error guardando', 'error'); console.error(e); }
  hideLoading();
}

async function rechazarSolicitud(solId) {
  if (!confirm('¿Rechazar esta solicitud?')) return;
  const idx = DATA.solicitudes.findIndex(s => s.ID_Solicitud === solId);
  if (idx === -1) return;
  DATA.solicitudes[idx].Estado = 'Rechazado';
  showLoading('Actualizando...');
  try {
    const row = Object.values(DATA.solicitudes[idx]);
    await sheetsUpdate(`Solicitudes!A${idx+2}:J${idx+2}`, row);
    showToast('Solicitud rechazada', 'success'); renderSolicitudes();
  } catch(e) { showToast('Error', 'error'); }
  hideLoading();
}

async function solicitudAPedido(solId) {
  const pedidosAbiertos = DATA.pedidos.filter(p => p.Estado === 'Abierto');
  if (!pedidosAbiertos.length) {
    const sol = DATA.solicitudes.find(s => s.ID_Solicitud === solId);
    if (sol) _pendingSolicitudParaPedido = { tipo: 'sol', solId, matNombre: sol.Material, cantidad: sol.Cantidad_Solicitada };
    openModalNuevoPedido(); return;
  }
  document.getElementById('sel-ped-sol-id').value = solId;
  const lista = document.getElementById('sel-ped-lista');
  lista.innerHTML = pedidosAbiertos.map(p => {
    const nLineas = DATA.lineasPedido.filter(l => l.Pedido === p.ID_Pedido).length;
    return `<div class="pedido-opcion" onclick="confirmarSolicitudAPedido('${p.ID_Pedido}')"><div><div class="pedido-opcion-nombre">${p.Nombre_Lista}</div><div class="pedido-opcion-meta">${p.Proveedor||'Sin proveedor asignado'} · ${nLineas} línea(s)</div></div><span style="color:var(--accent);font-size:18px">→</span></div>`;
  }).join('');
  openModal('modal-seleccionar-pedido');
}

async function confirmarSolicitudAPedido(pedidoId) {
  const solId = document.getElementById('sel-ped-sol-id').value;
  closeModal('modal-seleccionar-pedido');
  const pedido = DATA.pedidos.find(p => p.ID_Pedido === pedidoId);
  const sol    = DATA.solicitudes.find(s => s.ID_Solicitud === solId);
  if (!pedido || !sol) { showToast('Error al añadir al pedido', 'error'); return; }
  const idLinea  = genId('LIN-');
  const rowLinea = [idLinea, pedidoId, sol.Material, sol.Cantidad_Solicitada, '0', 'Pendiente', 'Desde solicitud ' + solId];
  showLoading('Añadiendo al pedido...');
  try {
    await sheetsAppend('Lineas_Pedido', rowLinea);
    DATA.lineasPedido.push(rowToObj(rowLinea, 'lineasPedido'));
    const solIdx = DATA.solicitudes.indexOf(sol);
    sol.Estado = 'En pedido'; sol.Lista_Pedido = pedidoId;
    const rowSol = [sol.ID_Solicitud, sol.Material, sol.Cantidad_Solicitada, sol.Solicitante, sol.Fecha, sol.Motivo, sol.Proveedor_Requerido, 'En pedido', pedidoId, sol.Observaciones];
    await sheetsUpdate(`Solicitudes!A${solIdx+2}:J${solIdx+2}`, rowSol);
    showToast(`Añadido a "${pedido.Nombre_Lista}"`, 'success');
    renderAll();
    // Ofrecer navegación directa al pedido
    if (typeof mostrarToastConAccion === 'function') {
      mostrarToastConAccion(`✓ Añadido a "${pedido.Nombre_Lista}"`, 'Ver pedido', () => verDetallePedido(pedidoId));
    }
  } catch(e) { showToast('Error', 'error'); console.error(e); }
  hideLoading();
}

function solicitudStockAPedido(matId) {
  const mat = DATA.material.find(m => m.ID_Material === matId); if (!mat) return;
  const cantidad = prompt(`¿Cuántas unidades (${mat.Unidad||'uds'}) de "${mat.Nombre}" quieres pedir?`, mat.Stock_Optimo||'');
  if (!cantidad || parseFloat(cantidad) <= 0) return;
  const pedidosAbiertos = DATA.pedidos.filter(p => p.Estado === 'Abierto');
  if (!pedidosAbiertos.length) { _pendingSolicitudParaPedido = { tipo: 'stock', matNombre: mat.Nombre, cantidad }; openModalNuevoPedido(); return; }
  document.getElementById('sel-ped-sol-id').value = '__stock__' + matId + '__' + cantidad;
  const lista = document.getElementById('sel-ped-lista');
  lista.innerHTML = pedidosAbiertos.map(p => {
    const nLineas = DATA.lineasPedido.filter(l => l.Pedido === p.ID_Pedido).length;
    return `<div class="pedido-opcion" onclick="confirmarStockAPedido('${p.ID_Pedido}','${mat.Nombre.replace(/'/g,"\\'")}','${cantidad}')"><div><div class="pedido-opcion-nombre">${p.Nombre_Lista}</div><div class="pedido-opcion-meta">${p.Proveedor||'Sin proveedor'} · ${nLineas} línea(s)</div></div><span style="color:var(--accent);font-size:18px">→</span></div>`;
  }).join('');
  openModal('modal-seleccionar-pedido');
}

async function confirmarStockAPedido(pedidoId, matNombre, cantidad) {
  closeModal('modal-seleccionar-pedido');
  const idLinea = genId('LIN-');
  const row = [idLinea, pedidoId, matNombre, cantidad, '0', 'Pendiente', 'Stock bajo mínimo'];
  showLoading('Añadiendo...');
  try { await sheetsAppend('Lineas_Pedido', row); DATA.lineasPedido.push(rowToObj(row, 'lineasPedido')); showToast(`"${matNombre}" añadido al pedido`, 'success'); renderAll(); }
  catch(e) { showToast('Error', 'error'); }
  hideLoading();
}

// ============================================================
// GUARDAR PEDIDOS
// ============================================================
async function guardarNuevoPedido() {
  const nombre = v('ped-nombre');
  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
  const id = genId('PED-');
  const fecha = new Date().toISOString().split('T')[0];
  const row = [id, nombre, v('ped-proveedor'), fecha, '', '', '', '', '', 'Abierto', '', '', v('ped-obs')];
  showLoading('Creando lista...');
  try {
    await sheetsAppend('Pedidos', row);
    DATA.pedidos.push(rowToObj(row, 'pedidos'));
    closeModal('modal-nuevo-pedido');
    if (_pendingSolicitudParaPedido) {
      const { tipo, solId, matNombre, cantidad } = _pendingSolicitudParaPedido;
      _pendingSolicitudParaPedido = null;
      const idLinea  = genId('LIN-');
      const rowLinea = [idLinea, id, matNombre, cantidad, '0', 'Pendiente', tipo === 'sol' ? 'Desde solicitud ' + solId : 'Stock bajo mínimo'];
      await sheetsAppend('Lineas_Pedido', rowLinea);
      DATA.lineasPedido.push(rowToObj(rowLinea, 'lineasPedido'));
      if (tipo === 'sol') {
        const sol = DATA.solicitudes.find(s => s.ID_Solicitud === solId);
        if (sol) {
          const solIdx = DATA.solicitudes.indexOf(sol);
          sol.Estado = 'En pedido'; sol.Lista_Pedido = id;
          const rowSol = [sol.ID_Solicitud, sol.Material, sol.Cantidad_Solicitada, sol.Solicitante, sol.Fecha, sol.Motivo, sol.Proveedor_Requerido, 'En pedido', id, sol.Observaciones];
          await sheetsUpdate(`Solicitudes!A${solIdx+2}:J${solIdx+2}`, rowSol);
        }
      }
      showToast(`Lista creada y "${matNombre}" añadido`, 'success');
    } else { showToast('Lista creada', 'success'); }
    renderAll();
  } catch(e) { showToast('Error', 'error'); }
  hideLoading();
}

async function guardarLineaPedido() {
  const pedidoId = v('linea-pedido-id');
  const esLibre = document.getElementById('btn-lsource-libre').classList.contains('active');
  let materialNombre = esLibre ? v('linea-material-libre') : (() => { const id = document.getElementById('linea-material-id').value; const mat = DATA.material.find(m => m.ID_Material === id); return mat ? mat.Nombre : ''; })();
  if (!materialNombre) { showToast('Indica el material', 'error'); return; }
  const cant = v('linea-cantidad');
  if (!cant || parseFloat(cant) <= 0) { showToast('Indica la cantidad', 'error'); return; }
  const id = genId('LIN-');
  const row = [id, pedidoId, materialNombre, cant, '0', 'Pendiente', v('linea-obs')];
  showLoading('Guardando...');
  try { await sheetsAppend('Lineas_Pedido', row); DATA.lineasPedido.push(rowToObj(row, 'lineasPedido')); showToast('Línea añadida', 'success'); closeModal('modal-nueva-linea'); verDetallePedido(pedidoId); }
  catch(e) { showToast('Error', 'error'); }
  hideLoading();
}

async function guardarEstadoPedido() {
  const pedidoId = v('estado-pedido-id');
  const nuevoEstado = v('estado-pedido-nuevo');
  const idx = DATA.pedidos.findIndex(p => p.ID_Pedido === pedidoId);
  if (idx === -1) return;
  const p = DATA.pedidos[idx];
  const hoy = new Date().toISOString().split('T')[0];
  p.Estado = nuevoEstado;
  if (nuevoEstado === 'Presupuesto solicitado') p.Fecha_Presupuesto = hoy;
  if (nuevoEstado === 'Presupuesto aprobado')   p.Fecha_Aprobacion = hoy;
  if (nuevoEstado === 'Recepción completa')     p.Fecha_Recepcion_Completa = hoy;
  // Nota: Fecha_Factura se gestiona desde el generador de hoja, no desde este modal
  const numPres = v('estado-num-presupuesto'); if (numPres) p.Numero_Presupuesto = numPres;
  const numFact = v('estado-num-factura');     if (numFact) p.Numero_Factura = numFact;
  const provNew = v('estado-proveedor');       if (provNew) p.Proveedor = provNew;
  const row = [p.ID_Pedido, p.Nombre_Lista, p.Proveedor, p.Fecha_Creacion, p.Fecha_Presupuesto, p.Fecha_Aprobacion, p.Fecha_Pedido_Enviado, p.Fecha_Recepcion_Completa, p.Fecha_Factura, p.Estado, p.Numero_Presupuesto, p.Numero_Factura, p.Observaciones];
  showLoading('Actualizando...');
  try {
    await sheetsUpdate(`Pedidos!A${idx+2}:M${idx+2}`, row);
    showToast('Estado actualizado', 'success');
    closeModal('modal-estado-pedido'); renderPedidos();
    if (document.getElementById('page-pedido-detalle').classList.contains('active')) verDetallePedido(pedidoId);
  } catch(e) { showToast('Error', 'error'); }
  hideLoading();
}

async function guardarRecepcionLinea() {
  const lineaId = v('rec-linea-id'), pedidoId = v('rec-pedido-id');
  const cantRec = parseFloat(v('rec-cantidad')) || 0;
  const idx = DATA.lineasPedido.findIndex(l => l.ID_Linea === lineaId);
  if (idx === -1) return;
  const l = DATA.lineasPedido[idx];
  const cantPed = parseFloat(l.Cantidad_Pedida) || 0;
  const mat = DATA.material.find(m => m.Nombre === l.Material || l.Material.startsWith(m.Nombre));
  if (!mat && cantRec > 0) {
    closeModal('modal-recepcion-linea');
    _pendingRecepcion = { lineaId, pedidoId, cantRec, obs: v('rec-obs') };
    openModalMaterial(); sv('mat-nombre', l.Material);
    setTimeout(() => {
      const footer = document.querySelector('#modal-material .form-footer');
      if (footer && !document.getElementById('aviso-recepcion-pendiente')) {
        const aviso = document.createElement('div');
        aviso.id = 'aviso-recepcion-pendiente';
        aviso.style.cssText = 'grid-column:1/-1;padding:10px 12px;background:var(--warning-light);border-radius:var(--radius-sm);font-size:12px;color:var(--warning);border:1px solid #e8c98a;margin-bottom:4px';
        aviso.innerHTML = '⚠️ Al guardar, se registrará automáticamente la recepción de <strong>' + cantRec + ' uds de ' + l.Material + '</strong> del pedido ' + pedidoId + '.';
        footer.before(aviso);
      }
    }, 100);
    showToast('Este material no está catalogado. Completa su ficha para continuar.', 'error');
    return;
  }
  await _completarRecepcionLinea(idx, l, cantRec, cantPed, pedidoId, mat, v('rec-obs'));
}

async function _completarRecepcionLinea(idx, l, cantRec, cantPed, pedidoId, mat, obs) {
  l.Cantidad_Recibida = String(cantRec);
  l.Estado_Linea = cantRec >= cantPed ? 'Recibido' : (cantRec > 0 ? 'Recibido parcialmente' : 'Pendiente');
  if (obs) l.Observaciones = obs;
  const row = [l.ID_Linea, l.Pedido, l.Material, l.Cantidad_Pedida, l.Cantidad_Recibida, l.Estado_Linea, l.Observaciones];
  showLoading('Registrando recepción...');
  try {
    await sheetsUpdate(`Lineas_Pedido!A${idx+2}:G${idx+2}`, row);
    if (mat && cantRec > 0) {
      const nuevoStock = (parseFloat(mat.Stock_Actual)||0) + cantRec;
      const idxMat = DATA.material.indexOf(mat);
      mat.Stock_Actual = String(nuevoStock);
      await sheetsUpdate(`Material!H${idxMat+2}`, [nuevoStock]);
      const movRow = [genId('MOV-'), mat.Nombre, 'Entrada', cantRec, currentUser?.name||'Usuario', new Date().toISOString().split('T')[0], 'Recepción pedido ' + pedidoId, ''];
      await sheetsAppend('Movimientos', movRow);
      DATA.movimientos.push(rowToObj(movRow, 'movimientos'));
    }
    const todasLineas    = DATA.lineasPedido.filter(x => x.Pedido === pedidoId);
    const todasRecibidas = todasLineas.every(x => x.Estado_Linea === 'Recibido');
    if (todasRecibidas) {
      const pedIdx = DATA.pedidos.findIndex(p => p.ID_Pedido === pedidoId);
      if (pedIdx !== -1 && DATA.pedidos[pedIdx].Estado !== 'Recepción completa' && DATA.pedidos[pedIdx].Estado !== 'Factura recibida') {
        DATA.pedidos[pedIdx].Estado = 'Recepción completa';
        DATA.pedidos[pedIdx].Fecha_Recepcion_Completa = new Date().toISOString().split('T')[0];
        const p = DATA.pedidos[pedIdx];
        const rowP = [p.ID_Pedido, p.Nombre_Lista, p.Proveedor, p.Fecha_Creacion, p.Fecha_Presupuesto, p.Fecha_Aprobacion, p.Fecha_Pedido_Enviado, p.Fecha_Recepcion_Completa, p.Fecha_Factura, p.Estado, p.Numero_Presupuesto, p.Numero_Factura, p.Observaciones];
        await sheetsUpdate(`Pedidos!A${pedIdx+2}:M${pedIdx+2}`, rowP);
        showToast('¡Pedido completo! Estado actualizado automáticamente', 'success');
      }
    } else {
      const pedIdx = DATA.pedidos.findIndex(p => p.ID_Pedido === pedidoId);
      if (pedIdx !== -1 && DATA.pedidos[pedIdx].Estado === 'Presupuesto aprobado') {
        DATA.pedidos[pedIdx].Estado = 'Recepción parcial';
        const p = DATA.pedidos[pedIdx];
        const rowP = [p.ID_Pedido, p.Nombre_Lista, p.Proveedor, p.Fecha_Creacion, p.Fecha_Presupuesto, p.Fecha_Aprobacion, p.Fecha_Pedido_Enviado, p.Fecha_Recepcion_Completa, p.Fecha_Factura, 'Recepción parcial', p.Numero_Presupuesto, p.Numero_Factura, p.Observaciones];
        await sheetsUpdate(`Pedidos!A${pedIdx+2}:M${pedIdx+2}`, rowP);
      }
    }
    // Actualizar estado de la solicitud de origen si la línea queda como Recibido
    if (l.Estado_Linea === 'Recibido') {
      const solOrigen = DATA.solicitudes.find(s => s.Lista_Pedido === pedidoId && (s.Material === l.Material || l.Material.startsWith(s.Material)) && s.Estado !== 'Recibido');
      if (solOrigen) {
        const solIdx = DATA.solicitudes.indexOf(solOrigen);
        solOrigen.Estado = 'Recibido';
        const rowSol = [solOrigen.ID_Solicitud, solOrigen.Material, solOrigen.Cantidad_Solicitada, solOrigen.Solicitante, solOrigen.Fecha, solOrigen.Motivo, solOrigen.Proveedor_Requerido, 'Recibido', solOrigen.Lista_Pedido, solOrigen.Observaciones];
        await sheetsUpdate(`Solicitudes!A${solIdx+2}:J${solIdx+2}`, rowSol);
      }
    }
    showToast('Recepción registrada', 'success');
    closeModal('modal-recepcion-linea');
  } catch(e) { showToast('Error', 'error'); console.error(e); }
  hideLoading();
}

async function eliminarLineaPedido(lineaId, pedidoId) {
  if (!confirm('¿Eliminar esta línea del pedido?')) return;
  const idx = DATA.lineasPedido.findIndex(l => l.ID_Linea === lineaId);
  if (idx === -1) return;
  showLoading('Eliminando...');
  try {
    // Vaciamos la fila en Sheets y la eliminamos del array local
    await sheetsClear(`Lineas_Pedido!A${idx+2}:G${idx+2}`);
    DATA.lineasPedido.splice(idx, 1);
    // Filtrar posibles entradas vacías que puedan quedar en el array
    DATA.lineasPedido = DATA.lineasPedido.filter(l => l.ID_Linea);
    showToast('Línea eliminada', 'success');
    verDetallePedido(pedidoId);
  }
  catch(e) { showToast('Error eliminando', 'error'); console.error(e); }
  hideLoading();
}

// ============================================================
// AVANCE SECUENCIAL DE ESTADO DE PEDIDO
// ============================================================
async function avanceEstadoPedido(pedidoId) {
  const idx = DATA.pedidos.findIndex(p => p.ID_Pedido === pedidoId);
  if (idx === -1) return;
  const p = DATA.pedidos[idx];
  const posActual = SECUENCIA_ESTADOS.indexOf(p.Estado);
  if (posActual === -1 || posActual >= SECUENCIA_ESTADOS.length - 1) {
    showToast('El pedido ya está en el estado final', 'info'); return;
  }
  const nuevoEstado = SECUENCIA_ESTADOS[posActual + 1];
  const hoy = new Date().toISOString().split('T')[0];
  p.Estado = nuevoEstado;
  if (nuevoEstado === 'Presupuesto solicitado') p.Fecha_Presupuesto = hoy;
  if (nuevoEstado === 'Presupuesto aprobado')   p.Fecha_Aprobacion = hoy;
  if (nuevoEstado === 'Recepción completa')      p.Fecha_Recepcion_Completa = hoy;
  const row = [p.ID_Pedido, p.Nombre_Lista, p.Proveedor, p.Fecha_Creacion, p.Fecha_Presupuesto, p.Fecha_Aprobacion, p.Fecha_Pedido_Enviado, p.Fecha_Recepcion_Completa, p.Fecha_Factura, p.Estado, p.Numero_Presupuesto, p.Numero_Factura, p.Observaciones];
  showLoading('Actualizando estado...');
  try {
    await sheetsUpdate(`Pedidos!A${idx+2}:M${idx+2}`, row);
    showToast(`Estado: ${nuevoEstado}`, 'success');
    renderPedidos();
    if (document.getElementById('page-pedido-detalle').classList.contains('active')) verDetallePedido(pedidoId);
  } catch(e) { showToast('Error', 'error'); console.error(e); }
  hideLoading();
}
