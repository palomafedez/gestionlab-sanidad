// ============================================================
// MATERIAL FUNGIBLE — RENDER
// ============================================================
let _filtroMaterial = '', _filtroMaterialCat = '', _filtroMaterialStock = '', _filtroMaterialUbicacion = '';

function renderMaterial(filtro, cat, stockFiltro, ubicacion) {
  if (filtro !== undefined) _filtroMaterial = filtro;
  if (cat !== undefined) _filtroMaterialCat = cat;
  if (stockFiltro !== undefined) _filtroMaterialStock = stockFiltro;
  if (ubicacion !== undefined) _filtroMaterialUbicacion = ubicacion;

  const cats = [...new Set(DATA.material.map(m => m.Categoria).filter(Boolean))].sort();
  const dl = document.getElementById('categorias-list');
  if (dl) dl.innerHTML = cats.map(c => `<option value="${c}">`).join('');
  const dlUbi = document.getElementById('ubicaciones-datalist');
  if (dlUbi) {
    const opts = DATA.ubicaciones.filter(u => u.Activa !== 'FALSE').map(u => {
      const label = [u.ID_Ubicacion, u.Zona, u.Subzona].filter(Boolean).join(' · ');
      return `<option value="${u.ID_Ubicacion}">${label}</option>`;
    });
    dlUbi.innerHTML = opts.join('');
  }
  const filterCat = document.getElementById('filter-material-cat');
  if (filterCat) {
    const current = filterCat.value;
    filterCat.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    filterCat.value = current;
  }

  let items = DATA.material;
  if (_filtroMaterial)    items = items.filter(m => (m.Nombre + m.Categoria + m.ID_Material + m.Proveedor + m.Referencia_Proveedor).toLowerCase().includes(_filtroMaterial.toLowerCase()));
  if (_filtroMaterialCat) items = items.filter(m => m.Categoria === _filtroMaterialCat);
  if (_filtroMaterialStock === 'bajo') items = items.filter(m => { const s = parseFloat(m.Stock_Actual)||0; const mn = parseFloat(m.Stock_Minimo)||0; return mn > 0 && s <= mn; });
  if (_filtroMaterialStock === 'ok')   items = items.filter(m => { const s = parseFloat(m.Stock_Actual)||0; const mn = parseFloat(m.Stock_Minimo)||0; return s > mn; });
  if (_filtroMaterialUbicacion) {
    const q = _filtroMaterialUbicacion.toLowerCase();
    items = items.filter(m => {
      if ((m.Ubicacion||'').toLowerCase().includes(q)) return true;
      const ubi = DATA.ubicaciones.find(u => u.ID_Ubicacion === m.Ubicacion);
      if (!ubi) return false;
      return (ubi.Zona||'').toLowerCase().includes(q) ||
             (ubi.Subzona||'').toLowerCase().includes(q) ||
             (ubi.Laboratorio_Aula||'').toLowerCase().includes(q) ||
             (ubi.Descripcion_Completa||'').toLowerCase().includes(q);
    });
  }

  const tbody = document.getElementById('tabla-material');
  if (!tbody) return;
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">🧴</div><div class="empty-state-title">Sin material registrado</div><div class="empty-state-text">Añade el primer ítem con el botón superior</div></div></td></tr>`; return; }

  tbody.innerHTML = items.map(m => {
    const stock = parseFloat(m.Stock_Actual)||0, min = parseFloat(m.Stock_Minimo)||0, opt = parseFloat(m.Stock_Optimo)||0;
    const pct   = opt > 0 ? Math.min(100, Math.round(stock/opt*100)) : (min > 0 ? Math.min(100, Math.round(stock/min*100)) : 100);
    const color = stock === 0 ? 'var(--danger)' : (min > 0 && stock <= min ? 'var(--warning)' : 'var(--success)');
    const stockBadge = stock === 0 ? 'badge-red' : (min > 0 && stock <= min ? 'badge-orange' : 'badge-green');
    return `<tr>
      <td><strong>${m.ID_Material}</strong></td>
      <td>${m.Nombre}</td>
      <td><span class="badge badge-gray">${m.Categoria||'—'}</span></td>
      <td style="font-size:12px;color:var(--text-muted)">${m.Ubicacion||'—'}</td>
      <td style="font-size:12px">${m.Unidad||'—'}</td>
      <td><div class="stock-bar-wrap"><div class="stock-bar"><div class="stock-bar-fill" style="width:${pct}%;background:${color}"></div></div><span class="stock-val" style="color:${color}">${stock} ${m.Unidad||''}</span></div></td>
      <td style="font-size:12px;color:var(--text-muted)">${min||'—'} / ${opt||'—'}</td>
      <td><div class="row-actions">
        <button class="icon-btn" onclick="openModalConsumoMaterial('${m.ID_Material}')" title="Registrar consumo">📦</button>
        <button class="icon-btn" onclick="openModalEntradaMaterial('${m.ID_Material}')" title="Registrar entrada">📥</button>
        <button class="icon-btn" onclick="editMaterial(${DATA.material.indexOf(m)})" title="Editar">✏️</button>
      </div></td>
    </tr>`;
  }).join('');
}

function filtrarMaterial(val)          { renderMaterial(val, undefined, undefined); }
function filtrarMaterialCategoria(val) { renderMaterial(undefined, val, undefined); }
function filtrarMaterialStock(val)     { renderMaterial(undefined, undefined, val); }
function filtrarMaterialUbicacion(val) { renderMaterial(undefined, undefined, undefined, val); }

function renderMovimientos(filtroTipo = '') {
  const tbody = document.getElementById('tabla-movimientos');
  if (!tbody) return;
  let items = [...DATA.movimientos];
  if (filtroTipo) items = items.filter(m => m.Tipo === filtroTipo);
  items.sort((a,b) => new Date(b.Fecha) - new Date(a.Fecha));
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-title">Sin movimientos registrados</div></div></td></tr>`; return; }
  tbody.innerHTML = items.map(m => `<tr>
    <td style="font-size:12px;color:var(--text-muted)">${formatDate(m.Fecha)||'—'}</td>
    <td>${m.Material||'—'}</td>
    <td>${m.Tipo==='Entrada'?'<span class="badge badge-green">📥 Entrada</span>':'<span class="badge badge-orange">📦 Salida</span>'}</td>
    <td><strong>${m.Cantidad||'—'}</strong></td>
    <td style="font-size:12px">${m.Usuario||'—'}</td>
    <td style="font-size:12px">${m.Motivo||'—'}</td>
    <td style="font-size:12px;color:var(--text-muted)">${m.Observaciones||'—'}</td>
  </tr>`).join('');
}
function filtrarMovimientosTipo(val) { renderMovimientos(val); }

// ============================================================
// AUTOCOMPLETE MATERIAL
// ============================================================
function buscarMaterialGenerico(query, listId, hiddenId, selectedId) {
  const list = document.getElementById(listId);
  if (!list) return;
  if (!query || query.length < 2) { list.classList.remove('open'); return; }
  const q = query.toLowerCase();
  const resultados = DATA.material.filter(m => m.Nombre.toLowerCase().includes(q) || m.ID_Material.toLowerCase().includes(q) || (m.Categoria||'').toLowerCase().includes(q)).slice(0,10);
  if (!resultados.length) { list.classList.remove('open'); return; }
  list.innerHTML = resultados.map(m => {
    const stock = parseFloat(m.Stock_Actual)||0, min = parseFloat(m.Stock_Minimo)||0;
    const stockClass = stock === 0 || (min > 0 && stock <= min) ? 'low' : 'ok';
    return `<div class="autocomplete-item" onclick="seleccionarMaterial('${m.ID_Material}','${m.Nombre.replace(/'/g,"\\'")}','${listId}','${hiddenId}','${selectedId}')">
      <div><div class="autocomplete-item-name">${m.Nombre}</div><div class="autocomplete-item-meta">${m.Categoria||''} · ${m.Ubicacion||''}</div></div>
      <div class="autocomplete-item-stock ${stockClass}">${stock} ${m.Unidad||''}</div>
    </div>`;
  }).join('');
  list.classList.add('open');
}

function seleccionarMaterial(id, nombre, listId, hiddenId, selectedId) {
  document.getElementById(hiddenId).value = id;
  const mat = DATA.material.find(m => m.ID_Material === id);
  const sel = document.getElementById(selectedId);
  sel.textContent = mat ? nombre + ' · ' + (mat.Unidad||'') + ' · Stock: ' + (mat.Stock_Actual||'0') + ' ' + (mat.Unidad||'') : nombre;
  sel.style.display = 'block';
  const list = document.getElementById(listId);
  list.classList.remove('open');
  const wrap = list.closest('.search-material-wrap');
  if (wrap) wrap.querySelector('input[type="text"]').value = '';
  // Rellenar campo unidades si existe en el contexto (líneas libres)
  const unidadesField = document.getElementById(selectedId.replace('selected','unidades'));
  if (unidadesField && mat) unidadesField.value = mat.Unidad || '';
}

function buscarMaterialSolicitud(val) { buscarMaterialGenerico(val, 'sol-autocomplete', 'sol-material-id', 'sol-material-selected'); }
function buscarMaterialLinea(val)     { buscarMaterialGenerico(val, 'linea-autocomplete', 'linea-material-id', 'linea-material-selected'); }
function buscarMaterialConsumo(val)   { buscarMaterialGenerico(val, 'consumo-autocomplete', 'consumo-material-id', 'consumo-material-selected'); }
function buscarMaterialEntrada(val)   { buscarMaterialGenerico(val, 'entrada-autocomplete', 'entrada-material-id', 'entrada-material-selected'); }

// ============================================================
// AUTOCOMPLETE UBICACIONES (modal material)
// ============================================================
function buscarUbicacionMat(query) {
  const list = document.getElementById('mat-ubicacion-autocomplete');
  if (!list) return;
  if (!query || query.length < 1) { list.classList.remove('open'); return; }
  const q = query.toLowerCase();
  const resultados = DATA.ubicaciones.filter(u => u.Activa !== 'FALSE' && (u.ID_Ubicacion.toLowerCase().includes(q) || (u.Laboratorio_Aula||'').toLowerCase().includes(q) || (u.Zona||'').toLowerCase().includes(q))).slice(0,8);
  if (!resultados.length) { list.classList.remove('open'); return; }
  list.innerHTML = resultados.map(u => `<div class="autocomplete-item" onclick="seleccionarUbicacionMat('${u.ID_Ubicacion}','${(u.Laboratorio_Aula+(u.Zona?' · '+u.Zona:'')).replace(/'/g,"\\'")}')">
    <div><div class="autocomplete-item-name">${u.ID_Ubicacion}</div><div class="autocomplete-item-meta">${u.Laboratorio_Aula||''}${u.Zona?' · '+u.Zona:''}</div></div>
  </div>`).join('');
  list.classList.add('open');
}
function seleccionarUbicacionMat(id, label) {
  document.getElementById('mat-ubicacion').value = id;
  document.getElementById('mat-ubicacion-search').value = '';
  document.getElementById('mat-ubicacion-autocomplete').classList.remove('open');
  document.getElementById('mat-ubicacion-selected-text').textContent = id + ' — ' + label;
  document.getElementById('mat-ubicacion-selected').style.display = 'flex';
}
function clearUbicacionMat() {
  document.getElementById('mat-ubicacion').value = '';
  document.getElementById('mat-ubicacion-search').value = '';
  document.getElementById('mat-ubicacion-selected').style.display = 'none';
}

// Cerrar autocomplete al hacer clic fuera
document.addEventListener('click', e => {
  if (!e.target.closest('.search-material-wrap')) {
    document.querySelectorAll('.autocomplete-list').forEach(l => l.classList.remove('open'));
  }
});

// ============================================================
// MODALES MATERIAL
// ============================================================
function openModalMaterial() {
  editingRow = null;
  document.getElementById('modal-material-title').textContent = 'Nuevo material';
  const matIdField = document.getElementById('mat-id'); if (matIdField) matIdField.readOnly = false;
  ['mat-id','mat-nombre','mat-unidad','mat-ubicacion','mat-referencia','mat-observaciones','mat-ubicacion-search'].forEach(id => sv(id,''));
  sv('mat-categoria',''); sv('mat-stock','0'); sv('mat-minimo','0'); sv('mat-optimo','0'); sv('mat-proveedor','');
  clearUbicacionMat();
  const sel = document.getElementById('mat-proveedor');
  if (sel) sel.innerHTML = '<option value="">Seleccionar...</option>' + DATA.proveedores.filter(p => p.Activo !== 'FALSE').map(p => `<option value="${p.Nombre_Proveedor}">${p.Nombre_Proveedor}</option>`).join('');
  openModal('modal-material');
}

// Abre el modal de catalogación prellenando nombre y unidad desde una recepción pendiente
function openModalMaterialCatalogacion(nombreSugerido, unidadSugerida) {
  openModalMaterial();
  if (nombreSugerido) {
    // Limpiar posibles sufijos como [unidad] del nombre
    const nombreLimpio = nombreSugerido.replace(/\s*\[.*?\]\s*$/, '').trim();
    sv('mat-nombre', nombreLimpio);
    autoIdMaterial(nombreLimpio);
  }
  if (unidadSugerida) sv('mat-unidad', unidadSugerida);
}

function editMaterial(idx) {
  const m = DATA.material[idx];
  editingRow = { sheet: 'Material', rowIndex: idx };
  document.getElementById('modal-material-title').textContent = 'Editar material';
  sv('mat-id',m.ID_Material); sv('mat-nombre',m.Nombre); sv('mat-categoria',m.Categoria);
  const matIdField = document.getElementById('mat-id'); if (matIdField) matIdField.readOnly = true;
  sv('mat-referencia',m.Referencia_Proveedor); sv('mat-unidad',m.Unidad); sv('mat-ubicacion',m.Ubicacion);
  sv('mat-stock',m.Stock_Actual); sv('mat-minimo',m.Stock_Minimo); sv('mat-optimo',m.Stock_Optimo); sv('mat-observaciones',m.Observaciones);
  if (m.Ubicacion) {
    const ubi = DATA.ubicaciones.find(u => u.ID_Ubicacion === m.Ubicacion);
    const label = ubi ? m.Ubicacion + ' — ' + (ubi.Laboratorio_Aula||'') + (ubi.Zona?' · '+ubi.Zona:'') : m.Ubicacion;
    document.getElementById('mat-ubicacion-selected-text').textContent = label;
    document.getElementById('mat-ubicacion-selected').style.display = 'flex';
  } else { clearUbicacionMat(); }
  sv('mat-ubicacion-search','');
  const sel = document.getElementById('mat-proveedor');
  if (sel) { sel.innerHTML = '<option value="">Seleccionar...</option>' + DATA.proveedores.filter(p => p.Activo !== 'FALSE').map(p => `<option value="${p.Nombre_Proveedor}">${p.Nombre_Proveedor}</option>`).join(''); sel.value = m.Proveedor; }
  const gestionAutoChk = document.getElementById('mat-gestion-auto');
  if (gestionAutoChk) {
    const esAuto = m.Gestion_Automatica !== 'FALSE';
    gestionAutoChk.checked = esAuto;
    toggleGestionAutoStock(esAuto);
  }
  openModal('modal-material');
}

function openModalConsumo() {
  document.getElementById('consumo-material-id').value = '';
  document.getElementById('consumo-material-selected').style.display = 'none';
  document.getElementById('consumo-material-selected').textContent = '';
  document.getElementById('consumo-search').value = '';
  const grp = document.getElementById('consumo-search-group');
  if (grp) grp.style.display = '';
  sv('consumo-cantidad',''); sv('consumo-motivo',''); sv('consumo-obs','');
  openModal('modal-consumo');
}
function openModalConsumoMaterial(matId) {
  openModalConsumo();
  const mat = DATA.material.find(m => m.ID_Material === matId);
  if (mat) {
    document.getElementById('consumo-material-id').value = matId;
    const grp = document.getElementById('consumo-search-group');
    if (grp) grp.style.display = 'none';
    const sel = document.getElementById('consumo-material-selected');
    sel.textContent = mat.Nombre + ' · Stock actual: ' + mat.Stock_Actual + ' ' + (mat.Unidad||'');
    sel.style.display = 'block';
  }
}
function openModalEntrada() {
  document.getElementById('entrada-material-id').value = '';
  document.getElementById('entrada-material-selected').style.display = 'none';
  document.getElementById('entrada-material-selected').textContent = '';
  document.getElementById('entrada-search').value = '';
  sv('entrada-cantidad',''); sv('entrada-obs','');
  openModal('modal-entrada');
}
function openModalEntradaMaterial(matId) {
  openModalEntrada();
  const mat = DATA.material.find(m => m.ID_Material === matId);
  if (mat) { document.getElementById('entrada-material-id').value = matId; const sel = document.getElementById('entrada-material-selected'); sel.textContent = mat.Nombre; sel.style.display = 'block'; }
}

// ============================================================
// GUARDAR MATERIAL / CONSUMO / ENTRADA
// ============================================================
function autoIdMaterial(nombre) {
  const idField = document.getElementById('mat-id'); if (!idField) return;
  const currentVal = idField.value;
  const autoPattern = /^[A-Z]{2,3}-\d{2,}$/;
  if (currentVal && !autoPattern.test(currentVal)) return;
  idField.value = generarIdMaterial(nombre);
}
function generarIdMaterial(nombre) {
  if (!nombre) return '';
  const stopWords = ['de','del','la','las','los','el','en','y','a','con','para','por'];
  const palabras = nombre.split(/\s+/).filter(p => p.length > 1 && !stopWords.includes(p.toLowerCase()));
  let prefix = '';
  if (palabras.length >= 2)      prefix = (palabras[0].slice(0,2) + palabras[1].slice(0,1)).toUpperCase();
  else if (palabras.length === 1) prefix = palabras[0].slice(0,3).toUpperCase();
  else                            prefix = nombre.slice(0,3).toUpperCase();
  const existing = DATA.material.map(m => m.ID_Material).filter(id => id.startsWith(prefix+'-')).map(id => parseInt(id.split('-')[1])||0);
  const nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return prefix + '-' + String(nextNum).padStart(2,'0');
}

async function guardarMaterial() {
  const nombre = v('mat-nombre'), cat = v('mat-categoria'), unidad = v('mat-unidad');
  if (!nombre || !cat || !unidad) { showToast('Nombre, categoría y unidad son obligatorios', 'error'); return; }
  const id = (editingRow && editingRow.sheet === 'Material') ? v('mat-id') : generarIdMaterial(nombre);
  const gestionAuto = document.getElementById('mat-gestion-auto') ? document.getElementById('mat-gestion-auto').checked : true;
  const minStock = gestionAuto ? (v('mat-minimo')||'0') : '0';
  const optStock = gestionAuto ? (v('mat-optimo')||'0') : '0';
  const row = [id, nombre, cat, v('mat-referencia'), v('mat-proveedor'), unidad, v('mat-ubicacion'), v('mat-stock')||'0', minStock, optStock, v('mat-observaciones'), gestionAuto ? 'TRUE' : 'FALSE'];

  showLoading('Guardando...');
  try {
    if (editingRow && editingRow.sheet === 'Material') {
      await sheetsUpdate(`Material!A${editingRow.rowIndex+2}:K${editingRow.rowIndex+2}`, row);
      DATA.material[editingRow.rowIndex] = rowToObj(row, 'material');
      showToast('Material actualizado', 'success');
    } else {
      if (DATA.material.find(m => m.ID_Material === id)) { showToast('Ese ID ya existe', 'error'); hideLoading(); return; }
      await sheetsAppend('Material', row);
      DATA.material.push(rowToObj(row, 'material'));
      showToast('Material guardado', 'success');
    }
    const aviso = document.getElementById('aviso-recepcion-pendiente');
    if (aviso) aviso.remove();
    closeModal('modal-material'); editingRow = null;

    if (_pendingRecepcion) {
      const { lineaId, pedidoId, cantRec, obs } = _pendingRecepcion;
      _pendingRecepcion = null;
      const idx = DATA.lineasPedido.findIndex(l => l.ID_Linea === lineaId);
      if (idx !== -1) {
        const l = DATA.lineasPedido[idx];
        const mat = DATA.material.find(m => m.Nombre === l.Material || l.Material.startsWith(m.Nombre));
        const cantPed = parseFloat(l.Cantidad_Pedida)||0;
        if (mat) { showToast('Material catalogado. Registrando recepción...', 'success'); await _completarRecepcionLinea(idx, l, cantRec, cantPed, pedidoId, mat, obs); verDetallePedido(pedidoId); }
      }
    } else {
      renderAll();
    }
  } catch(e) { showToast('Error guardando', 'error'); console.error(e); }
  hideLoading();
}

async function guardarConsumo() {
  const matId = document.getElementById('consumo-material-id').value;
  const cantStr = v('consumo-cantidad');
  if (!matId) { showToast('Selecciona un material', 'error'); return; }
  if (!cantStr || parseFloat(cantStr) <= 0) { showToast('Introduce una cantidad válida', 'error'); return; }
  const mat = DATA.material.find(m => m.ID_Material === matId);
  if (!mat) { showToast('Material no encontrado', 'error'); return; }
  const cantidad = parseFloat(cantStr);
  const nuevoStock = Math.max(0, (parseFloat(mat.Stock_Actual)||0) - cantidad);
  const fecha = new Date().toISOString().split('T')[0];
  const idMov = genId('MOV-');
  showLoading('Registrando...');
  try {
    const rowMov = [idMov, mat.Nombre, 'Salida', cantidad, currentUser?.name||'Usuario', fecha, v('consumo-motivo')||'Consumo', v('consumo-obs')];
    await sheetsAppend('Movimientos', rowMov);
    DATA.movimientos.push(rowToObj(rowMov, 'movimientos'));
    const idx = DATA.material.indexOf(mat);
    mat.Stock_Actual = String(nuevoStock);
    await sheetsUpdate(`Material!H${idx+2}`, [nuevoStock]);
    showToast(`Consumo registrado. Stock: ${nuevoStock} ${mat.Unidad}`, 'success');
    closeModal('modal-consumo'); renderAll();
  } catch(e) { showToast('Error registrando consumo', 'error'); console.error(e); }
  hideLoading();
}

async function guardarEntrada() {
  const matId = document.getElementById('entrada-material-id').value;
  const cantStr = v('entrada-cantidad');
  if (!matId) { showToast('Selecciona un material', 'error'); return; }
  if (!cantStr || parseFloat(cantStr) <= 0) { showToast('Introduce una cantidad válida', 'error'); return; }
  const mat = DATA.material.find(m => m.ID_Material === matId);
  if (!mat) { showToast('Material no encontrado', 'error'); return; }
  const cantidad = parseFloat(cantStr);
  const nuevoStock = (parseFloat(mat.Stock_Actual)||0) + cantidad;
  const fecha = new Date().toISOString().split('T')[0];
  const idMov = genId('MOV-');
  showLoading('Registrando...');
  try {
    const rowMov = [idMov, mat.Nombre, 'Entrada', cantidad, currentUser?.name||'Usuario', fecha, v('entrada-motivo'), v('entrada-obs')];
    await sheetsAppend('Movimientos', rowMov);
    DATA.movimientos.push(rowToObj(rowMov, 'movimientos'));
    const idx = DATA.material.indexOf(mat);
    mat.Stock_Actual = String(nuevoStock);
    await sheetsUpdate(`Material!H${idx+2}`, [nuevoStock]);
    showToast(`Entrada registrada. Stock: ${nuevoStock} ${mat.Unidad}`, 'success');
    closeModal('modal-entrada'); renderAll();
  } catch(e) { showToast('Error registrando entrada', 'error'); console.error(e); }
  hideLoading();
}

// ============================================================
// GESTIÓN AUTOMÁTICA DE STOCK (toggle campos min/opt)
// ============================================================
function toggleGestionAutoStock(checked) {
  const wrap = document.getElementById('mat-stock-auto-fields');
  if (wrap) wrap.style.display = checked ? 'contents' : 'none';
}
