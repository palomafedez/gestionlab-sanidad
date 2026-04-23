// ============================================================
// MATERIAL FUNGIBLE — RENDER
// ============================================================
let _filtroMaterial = '', _filtroMaterialCat = '', _filtroMaterialStock = '', _filtroMaterialUbicacion = '';

function renderMaterial(filtro, cat, stockFiltro, ubicacion) {
  if (filtro    !== undefined) _filtroMaterial         = filtro;
  if (cat       !== undefined) _filtroMaterialCat      = cat;
  if (stockFiltro !== undefined) _filtroMaterialStock  = stockFiltro;
  if (ubicacion !== undefined) _filtroMaterialUbicacion = ubicacion;

  // Poblar datalist ubicaciones
  const dlUbi = document.getElementById('ubicaciones-datalist');
  if (dlUbi) {
    dlUbi.innerHTML = DATA.ubicaciones.filter(u => u.Activa !== 'FALSE').map(u => {
      const label = [u.ID_Ubicacion, u.Zona, u.Subzona].filter(Boolean).join(' · ');
      return `<option value="${u.ID_Ubicacion}">${label}</option>`;
    }).join('');
  }

  // Poblar filtro de categorías
  const cats = [...new Set(DATA.material.map(m => m.Categoria).filter(Boolean))].sort();
  const filterCat = document.getElementById('filter-material-cat');
  if (filterCat) {
    const current = filterCat.value;
    filterCat.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    filterCat.value = current;
  }

  let items = DATA.material;

  // Filtro texto
  if (_filtroMaterial) {
    const q = _filtroMaterial.toLowerCase();
    items = items.filter(m => (m.Nombre + m.Categoria + m.ID_Material + m.Proveedor + m.Referencia_Proveedor).toLowerCase().includes(q));
  }

  // Filtro categoría
  if (_filtroMaterialCat) items = items.filter(m => m.Categoria === _filtroMaterialCat);

  // Filtro stock — usa helpers de config.js
  if (_filtroMaterialStock === 'bajo') items = items.filter(m => stockBajoMinimo(m));
  if (_filtroMaterialStock === 'ok')   items = items.filter(m => !stockBajoMinimo(m));

  // Filtro ubicación — busca también en lotes
  if (_filtroMaterialUbicacion) {
    const q = _filtroMaterialUbicacion.toLowerCase();
    items = items.filter(m => {
      // Comprobar campo Ubicacion heredado
      if ((m.Ubicacion||'').toLowerCase().includes(q)) return true;
      const ubi = DATA.ubicaciones.find(u => u.ID_Ubicacion === m.Ubicacion);
      if (ubi && ((ubi.Zona||'').toLowerCase().includes(q) || (ubi.Subzona||'').toLowerCase().includes(q) || (ubi.Laboratorio_Aula||'').toLowerCase().includes(q))) return true;
      // Comprobar lotes
      return getMatUbics(m.ID_Material).some(l => (l.ID_Ubicacion||'').toLowerCase().includes(q) || getNombreUbicacion(l.ID_Ubicacion).toLowerCase().includes(q));
    });
  }

  const tbody = document.getElementById('tabla-material');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">🧴</div><div class="empty-state-title">Sin material registrado</div><div class="empty-state-text">Añade el primer ítem con el botón superior</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(m => renderFilaMaterial(m)).join('');
}

function renderFilaMaterial(m) {
  const lotes  = getMatUbics(m.ID_Material);
  const stock  = getStockTotal(m);
  const minTot = getStockMinTotal(m);
  const opt    = parseFloat(m.Stock_Optimo) || 0;
  const pct    = opt > 0 ? Math.min(100, Math.round(stock / opt * 100)) : (minTot > 0 ? Math.min(100, Math.round(stock / minTot * 100)) : 100);
  const color  = stock === 0 ? 'var(--danger)' : (minTot > 0 && stock <= minTot ? 'var(--warning)' : 'var(--success)');
  const idx    = DATA.material.indexOf(m);

  // Indicador de multi-ubicación
  const multiUbi = lotes.length > 0;
  const ubiLabel = multiUbi
    ? `<span style="font-size:11px;color:var(--accent);font-weight:500">${lotes.length} ubicación${lotes.length > 1 ? 'es' : ''}</span>`
    : `<span style="font-size:12px;color:var(--text-muted)">${m.Ubicacion || '—'}</span>`;

  const rowId = `mat-row-${m.ID_Material.replace(/[^a-zA-Z0-9]/g,'-')}`;

  let html = `<tr class="equipo-row${multiUbi ? ' expandable' : ''}" id="${rowId}" ${multiUbi ? `onclick="toggleMatUbics('${m.ID_Material}')" style="cursor:pointer"` : ''}>
    <td><strong>${m.ID_Material}</strong></td>
    <td>${multiUbi ? `<span class="expand-icon" id="expand-mat-${m.ID_Material.replace(/[^a-zA-Z0-9]/g,'-')}">▶</span> ` : ''}${m.Nombre}</td>
    <td><span class="badge badge-gray">${m.Categoria || '—'}</span></td>
    <td>${ubiLabel}</td>
    <td style="font-size:12px">${m.Unidad || '—'}</td>
    <td>
      <div class="stock-bar-wrap">
        <div class="stock-bar"><div class="stock-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="stock-val" style="color:${color}">${stock} ${m.Unidad || ''}</span>
      </div>
    </td>
    <td style="font-size:12px;color:var(--text-muted)">${minTot || '—'} / ${opt || '—'}</td>
    <td onclick="event.stopPropagation()"><div class="row-actions">
      <button class="icon-btn" onclick="openModalConsumoMaterial('${m.ID_Material}')" title="Registrar consumo">📦</button>
      <button class="icon-btn" onclick="openModalEntradaMaterial('${m.ID_Material}')" title="Registrar entrada">📥</button>
      <button class="icon-btn" onclick="editMaterial(${idx})" title="Editar">✏️</button>
    </div></td>
  </tr>`;

  // Sub-filas por ubicación (ocultas inicialmente)
  if (multiUbi) {
    html += lotes.map((l, li) => {
      const sLocal  = parseFloat(l.Stock_Local)  || 0;
      const mnLocal = parseFloat(l.Stock_Minimo_Local) || 0;
      const opLocal = parseFloat(l.Stock_Optimo_Local) || 0;
      const pctL  = opLocal > 0 ? Math.min(100, Math.round(sLocal / opLocal * 100)) : (mnLocal > 0 ? Math.min(100, Math.round(sLocal / mnLocal * 100)) : 100);
      const colL  = sLocal === 0 ? 'var(--danger)' : (mnLocal > 0 && sLocal <= mnLocal ? 'var(--warning)' : 'var(--success)');
      const loteIdx = DATA.materialUbicaciones.indexOf(l);
      return `<tr class="mat-ubic-row" id="mat-ubic-${m.ID_Material.replace(/[^a-zA-Z0-9]/g,'-')}-${li}" style="display:none;background:var(--surface2)">
        <td></td>
        <td style="padding-left:28px;font-size:12px;color:var(--text-soft)">📍 ${getNombreUbicacion(l.ID_Ubicacion)}</td>
        <td></td>
        <td style="font-size:11px;color:var(--text-muted)">${l.ID_Ubicacion}</td>
        <td style="font-size:12px">${m.Unidad || '—'}</td>
        <td>
          <div class="stock-bar-wrap">
            <div class="stock-bar"><div class="stock-bar-fill" style="width:${pctL}%;background:${colL}"></div></div>
            <span class="stock-val" style="color:${colL}">${sLocal} ${m.Unidad || ''}</span>
          </div>
        </td>
        <td style="font-size:12px;color:var(--text-muted)">${mnLocal || '—'} / ${opLocal || '—'}</td>
        <td><div class="row-actions">
          <button class="icon-btn" onclick="openModalConsumoLote('${m.ID_Material}','${l.ID_Ubicacion}')" title="Consumo en esta ubicación">📦</button>
          <button class="icon-btn" onclick="openModalEntradaLote('${m.ID_Material}','${l.ID_Ubicacion}')" title="Entrada en esta ubicación">📥</button>
        </div></td>
      </tr>`;
    }).join('');
  }

  return html;
}

function toggleMatUbics(idMaterial) {
  const safeId = idMaterial.replace(/[^a-zA-Z0-9]/g, '-');
  const expandIcon = document.getElementById(`expand-mat-${safeId}`);
  const lotes = getMatUbics(idMaterial);
  const firstRow = document.getElementById(`mat-ubic-${safeId}-0`);
  if (!firstRow) return;
  const isOpen = firstRow.style.display !== 'none';
  lotes.forEach((_, i) => {
    const row = document.getElementById(`mat-ubic-${safeId}-${i}`);
    if (row) row.style.display = isOpen ? 'none' : '';
  });
  if (expandIcon) expandIcon.textContent = isOpen ? '▶' : '▼';
}

function filtrarMaterial(val)          { renderMaterial(val, undefined, undefined); }
function filtrarMaterialCategoria(val) { renderMaterial(undefined, val, undefined); }
function filtrarMaterialStock(val)     { renderMaterial(undefined, undefined, val); }
function filtrarMaterialUbicacion(val) { renderMaterial(undefined, undefined, undefined, val); }

// ============================================================
// RENDER MOVIMIENTOS
// ============================================================
function renderMovimientos(filtroTipo = '') {
  const tbody = document.getElementById('tabla-movimientos');
  if (!tbody) return;
  let items = [...DATA.movimientos];
  if (filtroTipo) items = items.filter(m => m.Tipo === filtroTipo);
  items.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-title">Sin movimientos registrados</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(m => `<tr>
    <td style="font-size:12px;color:var(--text-muted)">${formatDate(m.Fecha) || '—'}</td>
    <td>${m.Material || '—'}</td>
    <td>${m.Tipo === 'Entrada' ? '<span class="badge badge-green">📥 Entrada</span>' : '<span class="badge badge-orange">📦 Salida</span>'}</td>
    <td><strong>${m.Cantidad || '—'}</strong></td>
    <td style="font-size:12px">${m.Usuario || '—'}</td>
    <td style="font-size:12px">${m.Motivo || '—'}</td>
    <td style="font-size:12px;color:var(--text-muted)">${m.Observaciones || '—'}</td>
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
  const resultados = DATA.material.filter(m =>
    m.Nombre.toLowerCase().includes(q) ||
    m.ID_Material.toLowerCase().includes(q) ||
    (m.Categoria || '').toLowerCase().includes(q)
  ).slice(0, 10);
  if (!resultados.length) { list.classList.remove('open'); return; }
  list.innerHTML = resultados.map(m => {
    const stock = getStockTotal(m);
    const min   = getStockMinTotal(m);
    const stockClass = stock === 0 || (min > 0 && stock <= min) ? 'low' : 'ok';
    return `<div class="autocomplete-item" onclick="seleccionarMaterial('${m.ID_Material}','${m.Nombre.replace(/'/g,"\\'")}','${listId}','${hiddenId}','${selectedId}')">
      <div><div class="autocomplete-item-name">${m.Nombre}</div><div class="autocomplete-item-meta">${m.Categoria || ''} · ${m.Ubicacion || ''}</div></div>
      <div class="autocomplete-item-stock ${stockClass}">${stock} ${m.Unidad || ''}</div>
    </div>`;
  }).join('');
  list.classList.add('open');
}

function seleccionarMaterial(id, nombre, listId, hiddenId, selectedId) {
  document.getElementById(hiddenId).value = id;
  const mat = DATA.material.find(m => m.ID_Material === id);
  const stock = mat ? getStockTotal(mat) : 0;
  const sel = document.getElementById(selectedId);
  sel.textContent = mat ? nombre + ' · ' + (mat.Unidad || '') + ' · Stock: ' + stock + ' ' + (mat.Unidad || '') : nombre;
  sel.style.display = 'block';
  document.getElementById(listId).classList.remove('open');
  const wrap = document.getElementById(listId).closest('.search-material-wrap');
  if (wrap) wrap.querySelector('input[type="text"]').value = '';
  const unidadesField = document.getElementById(selectedId.replace('selected', 'unidades'));
  if (unidadesField && mat) unidadesField.value = mat.Unidad || '';
}

function buscarMaterialSolicitud(val) { buscarMaterialGenerico(val, 'sol-autocomplete',    'sol-material-id',     'sol-material-selected'); }
function buscarMaterialLinea(val)     { buscarMaterialGenerico(val, 'linea-autocomplete',  'linea-material-id',   'linea-material-selected'); }
function buscarMaterialConsumo(val)   { buscarMaterialGenerico(val, 'consumo-autocomplete','consumo-material-id', 'consumo-material-selected'); }
function buscarMaterialEntrada(val)   { buscarMaterialGenerico(val, 'entrada-autocomplete','entrada-material-id', 'entrada-material-selected'); }

// ============================================================
// AUTOCOMPLETE UBICACIONES (modal material)
// ============================================================
function buscarUbicacionMat(query) {
  const list = document.getElementById('mat-ubicacion-autocomplete');
  if (!list) return;
  if (!query || query.length < 1) { list.classList.remove('open'); return; }
  const q = query.toLowerCase();
  const resultados = DATA.ubicaciones.filter(u =>
    u.Activa !== 'FALSE' &&
    (u.ID_Ubicacion.toLowerCase().includes(q) ||
     (u.Laboratorio_Aula || '').toLowerCase().includes(q) ||
     (u.Zona || '').toLowerCase().includes(q))
  ).slice(0, 8);
  if (!resultados.length) { list.classList.remove('open'); return; }
  list.innerHTML = resultados.map(u => `<div class="autocomplete-item" onclick="seleccionarUbicacionMatLote('${u.ID_Ubicacion}','${(u.Laboratorio_Aula + (u.Zona ? ' · ' + u.Zona : '')).replace(/'/g,"\\'")}')">
    <div><div class="autocomplete-item-name">${u.ID_Ubicacion}</div><div class="autocomplete-item-meta">${u.Laboratorio_Aula || ''}${u.Zona ? ' · ' + u.Zona : ''}</div></div>
  </div>`).join('');
  list.classList.add('open');
}

// La función original se mantiene para compatibilidad si hay otras referencias
function seleccionarUbicacionMat(id, label) {
  seleccionarUbicacionMatLote(id, label);
}

function clearUbicacionMat() {
  document.getElementById('mat-ubicacion').value = '';
  document.getElementById('mat-ubicacion-search').value = '';
  document.getElementById('mat-ubicacion-selected').style.display = 'none';
}

// Cerrar autocomplete al hacer clic fuera
document.addEventListener('click', e => {
  if (!e.target.closest('.search-material-wrap') && !e.target.closest('#mat-lotes-container')) {
    document.querySelectorAll('.autocomplete-list').forEach(l => l.classList.remove('open'));
  }
});

// ============================================================
// GESTIÓN DE LOTES POR UBICACIÓN EN EL MODAL
// ============================================================

// Estado temporal de lotes mientras el modal está abierto
let _lotesTemp = [];   // [{ id, ID_Ubicacion, Stock_Local, Stock_Minimo_Local, Stock_Optimo_Local, _nuevo, _loteIdx }]
let _loteEditandoIdx = null;  // índice en _lotesTemp del lote cuyo autocomplete está activo

function renderLotesModal() {
  const container = document.getElementById('mat-lotes-container');
  if (!container) return;

  if (!_lotesTemp.length) {
    container.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:8px 0">Sin ubicaciones asignadas. Usa el campo de abajo para añadir.</div>`;
  } else {
    container.innerHTML = _lotesTemp.map((l, i) => {
      const nombre = getNombreUbicacion(l.ID_Ubicacion);
      return `<div class="lote-row" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:6px;flex-wrap:wrap">
        <span style="flex:1;font-size:13px;font-weight:500">📍 ${nombre}</span>
        <label style="font-size:11px;color:var(--text-muted)">Stock</label>
        <input type="number" min="0" value="${l.Stock_Local||0}" style="width:70px" onchange="_lotesTemp[${i}].Stock_Local=this.value" oninput="_lotesTemp[${i}].Stock_Local=this.value">
        <label style="font-size:11px;color:var(--text-muted)">Mín</label>
        <input type="number" min="0" value="${l.Stock_Minimo_Local||0}" style="width:60px" onchange="_lotesTemp[${i}].Stock_Minimo_Local=this.value" oninput="_lotesTemp[${i}].Stock_Minimo_Local=this.value">
        <label style="font-size:11px;color:var(--text-muted)">Ópt</label>
        <input type="number" min="0" value="${l.Stock_Optimo_Local||0}" style="width:60px" onchange="_lotesTemp[${i}].Stock_Optimo_Local=this.value" oninput="_lotesTemp[${i}].Stock_Optimo_Local=this.value">
        <button class="icon-btn" onclick="_eliminarLoteTemp(${i})" title="Quitar ubicación" style="color:var(--danger)">🗑</button>
      </div>`;
    }).join('');
  }
}

function _eliminarLoteTemp(i) {
  _lotesTemp.splice(i, 1);
  renderLotesModal();
}

// Se llama desde el autocomplete de ubicación del modal
function seleccionarUbicacionMatLote(id, label) {
  // Comprobar que no está ya añadida
  if (_lotesTemp.some(l => l.ID_Ubicacion === id)) {
    showToast('Esta ubicación ya está añadida', 'error');
    document.getElementById('mat-ubicacion-autocomplete').classList.remove('open');
    document.getElementById('mat-ubicacion-search').value = '';
    return;
  }
  _lotesTemp.push({ ID_Ubicacion: id, Stock_Local: '0', Stock_Minimo_Local: '0', Stock_Optimo_Local: '0', _nuevo: true });
  document.getElementById('mat-ubicacion').value = id;   // mantener compatibilidad campo oculto
  document.getElementById('mat-ubicacion-search').value = '';
  document.getElementById('mat-ubicacion-autocomplete').classList.remove('open');
  renderLotesModal();
}

// ============================================================
// MODALES MATERIAL
// ============================================================
function openModalMaterial() {
  editingRow = null;
  _lotesTemp = [];
  document.getElementById('modal-material-title').textContent = 'Nuevo material';
  const matIdField = document.getElementById('mat-id'); if (matIdField) matIdField.readOnly = false;
  ['mat-id','mat-nombre','mat-unidad','mat-ubicacion','mat-referencia','mat-observaciones','mat-ubicacion-search'].forEach(id => sv(id, ''));
  sv('mat-categoria', ''); sv('mat-stock', '0'); sv('mat-minimo', '0'); sv('mat-optimo', '0'); sv('mat-proveedor', '');
  clearUbicacionMat();
  const sel = document.getElementById('mat-proveedor');
  if (sel) sel.innerHTML = '<option value="">Seleccionar...</option>' + DATA.proveedores.filter(p => p.Activo !== 'FALSE').map(p => `<option value="${p.Nombre_Proveedor}">${p.Nombre_Proveedor}</option>`).join('');
  renderLotesModal();
  openModal('modal-material');
}

function openModalMaterialCatalogacion(nombreSugerido, unidadSugerida) {
  openModalMaterial();
  if (nombreSugerido) {
    const nombreLimpio = nombreSugerido.replace(/\s*\[.*?\]\s*$/, '').trim();
    sv('mat-nombre', nombreLimpio);
    autoIdMaterial(nombreLimpio);
  }
  if (unidadSugerida) sv('mat-unidad', unidadSugerida);
}

function editMaterial(idx) {
  const m = DATA.material[idx];
  editingRow = { sheet: 'Material', rowIndex: idx };
  _lotesTemp = getMatUbics(m.ID_Material).map((l, li) => ({
    ID_Ubicacion: l.ID_Ubicacion,
    Stock_Local: l.Stock_Local,
    Stock_Minimo_Local: l.Stock_Minimo_Local,
    Stock_Optimo_Local: l.Stock_Optimo_Local,
    _nuevo: false,
    _loteIdx: DATA.materialUbicaciones.indexOf(l)
  }));

  document.getElementById('modal-material-title').textContent = 'Editar material';
  sv('mat-id', m.ID_Material); sv('mat-nombre', m.Nombre); sv('mat-categoria', m.Categoria);
  const matIdField = document.getElementById('mat-id'); if (matIdField) matIdField.readOnly = true;
  sv('mat-referencia', m.Referencia_Proveedor); sv('mat-unidad', m.Unidad);
  sv('mat-ubicacion', m.Ubicacion);
  sv('mat-stock', m.Stock_Actual); sv('mat-minimo', m.Stock_Minimo); sv('mat-optimo', m.Stock_Optimo);
  sv('mat-observaciones', m.Observaciones);

  if (m.Ubicacion) {
    const ubi = DATA.ubicaciones.find(u => u.ID_Ubicacion === m.Ubicacion);
    const label = ubi ? m.Ubicacion + ' — ' + (ubi.Laboratorio_Aula || '') + (ubi.Zona ? ' · ' + ubi.Zona : '') : m.Ubicacion;
    document.getElementById('mat-ubicacion-selected-text').textContent = label;
    document.getElementById('mat-ubicacion-selected').style.display = 'flex';
  } else { clearUbicacionMat(); }

  sv('mat-ubicacion-search', '');
  const sel = document.getElementById('mat-proveedor');
  if (sel) {
    sel.innerHTML = '<option value="">Seleccionar...</option>' + DATA.proveedores.filter(p => p.Activo !== 'FALSE').map(p => `<option value="${p.Nombre_Proveedor}">${p.Nombre_Proveedor}</option>`).join('');
    sel.value = m.Proveedor;
  }
  const gestionAutoChk = document.getElementById('mat-gestion-auto');
  if (gestionAutoChk) {
    const esAuto = m.Gestion_Automatica !== 'FALSE';
    gestionAutoChk.checked = esAuto;
    toggleGestionAutoStock(esAuto);
  }
  renderLotesModal();
  openModal('modal-material');
}

function openModalConsumo() {
  document.getElementById('consumo-material-id').value = '';
  document.getElementById('consumo-material-selected').style.display = 'none';
  document.getElementById('consumo-material-selected').textContent = '';
  document.getElementById('consumo-search').value = '';
  const grp = document.getElementById('consumo-search-group');
  if (grp) grp.style.display = '';
  sv('consumo-cantidad', ''); sv('consumo-motivo', ''); sv('consumo-obs', '');
  // Ocultar selector de ubicación hasta que se elija material
  const ubiGrp = document.getElementById('consumo-ubicacion-group');
  if (ubiGrp) ubiGrp.style.display = 'none';
  openModal('modal-consumo');
}

function openModalConsumoMaterial(matId) {
  openModalConsumo();
  const mat = DATA.material.find(m => m.ID_Material === matId);
  if (!mat) return;
  document.getElementById('consumo-material-id').value = matId;
  const grp = document.getElementById('consumo-search-group');
  if (grp) grp.style.display = 'none';
  const stock = getStockTotal(mat);
  const sel = document.getElementById('consumo-material-selected');
  sel.textContent = mat.Nombre + ' · Stock actual: ' + stock + ' ' + (mat.Unidad || '');
  sel.style.display = 'block';
  // Mostrar selector de ubicación si tiene lotes
  _mostrarSelectorUbicConsumo(matId);
}

/** Abre el consumo directamente en una ubicación concreta (botón de sub-fila) */
function openModalConsumoLote(matId, idUbicacion) {
  openModalConsumoMaterial(matId);
  // Pre-seleccionar la ubicación
  const sel = document.getElementById('consumo-ubicacion-sel');
  if (sel) { sel.value = idUbicacion; }
}

function _mostrarSelectorUbicConsumo(matId) {
  const ubiGrp = document.getElementById('consumo-ubicacion-group');
  if (!ubiGrp) return;
  const lotes = getMatUbics(matId);
  if (lotes.length <= 1) { ubiGrp.style.display = 'none'; return; }
  const sel = document.getElementById('consumo-ubicacion-sel');
  if (sel) {
    sel.innerHTML = lotes.map(l => {
      const s = parseFloat(l.Stock_Local) || 0;
      return `<option value="${l.ID_Ubicacion}">${getNombreUbicacion(l.ID_Ubicacion)} (stock: ${s} ${DATA.material.find(m => m.ID_Material === matId)?.Unidad || ''})</option>`;
    }).join('');
  }
  ubiGrp.style.display = '';
}

function openModalEntrada() {
  document.getElementById('entrada-material-id').value = '';
  document.getElementById('entrada-material-selected').style.display = 'none';
  document.getElementById('entrada-material-selected').textContent = '';
  document.getElementById('entrada-search').value = '';
  sv('entrada-cantidad', ''); sv('entrada-obs', '');
  const ubiGrp = document.getElementById('entrada-ubicacion-group');
  if (ubiGrp) ubiGrp.style.display = 'none';
  openModal('modal-entrada');
}

function openModalEntradaMaterial(matId) {
  openModalEntrada();
  const mat = DATA.material.find(m => m.ID_Material === matId);
  if (!mat) return;
  document.getElementById('entrada-material-id').value = matId;
  const sel = document.getElementById('entrada-material-selected');
  sel.textContent = mat.Nombre;
  sel.style.display = 'block';
  _mostrarSelectorUbicEntrada(matId);
}

/** Abre la entrada directamente en una ubicación concreta (botón de sub-fila) */
function openModalEntradaLote(matId, idUbicacion) {
  openModalEntradaMaterial(matId);
  const sel = document.getElementById('entrada-ubicacion-sel');
  if (sel) { sel.value = idUbicacion; }
}

function _mostrarSelectorUbicEntrada(matId) {
  const ubiGrp = document.getElementById('entrada-ubicacion-group');
  if (!ubiGrp) return;
  const lotes = getMatUbics(matId);
  if (lotes.length <= 1) { ubiGrp.style.display = 'none'; return; }
  const sel = document.getElementById('entrada-ubicacion-sel');
  if (sel) {
    sel.innerHTML = lotes.map(l => {
      const s = parseFloat(l.Stock_Local) || 0;
      return `<option value="${l.ID_Ubicacion}">${getNombreUbicacion(l.ID_Ubicacion)} (stock: ${s} ${DATA.material.find(m => m.ID_Material === matId)?.Unidad || ''})</option>`;
    }).join('');
  }
  ubiGrp.style.display = '';
}

// ============================================================
// GUARDAR MATERIAL (con lotes)
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
  if (palabras.length >= 2)       prefix = (palabras[0].slice(0, 2) + palabras[1].slice(0, 1)).toUpperCase();
  else if (palabras.length === 1) prefix = palabras[0].slice(0, 3).toUpperCase();
  else                            prefix = nombre.slice(0, 3).toUpperCase();
  const existing = DATA.material.map(m => m.ID_Material).filter(id => id.startsWith(prefix + '-')).map(id => parseInt(id.split('-')[1]) || 0);
  const nextNum  = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return prefix + '-' + String(nextNum).padStart(2, '0');
}

async function guardarMaterial() {
  const nombre = v('mat-nombre'), cat = v('mat-categoria'), unidad = v('mat-unidad');
  if (!nombre || !cat || !unidad) { showToast('Nombre, categoría y unidad son obligatorios', 'error'); return; }
  const id = (editingRow && editingRow.sheet === 'Material') ? v('mat-id') : generarIdMaterial(nombre);
  const gestionAuto = document.getElementById('mat-gestion-auto') ? document.getElementById('mat-gestion-auto').checked : true;

  // Si hay lotes, los min/opt globales se calculan como suma de los locales
  const stockGlobal = _lotesTemp.length
    ? String(_lotesTemp.reduce((s, l) => s + (parseFloat(l.Stock_Local) || 0), 0))
    : (v('mat-stock') || '0');
  const minStock = _lotesTemp.length
    ? String(_lotesTemp.reduce((s, l) => s + (parseFloat(l.Stock_Minimo_Local) || 0), 0))
    : (gestionAuto ? (v('mat-minimo') || '0') : '0');
  const optStock = _lotesTemp.length
    ? String(_lotesTemp.reduce((s, l) => s + (parseFloat(l.Stock_Optimo_Local) || 0), 0))
    : (gestionAuto ? (v('mat-optimo') || '0') : '0');

  // Ubicacion principal: primera de los lotes, o el campo heredado
  const ubicPrincipal = _lotesTemp.length ? _lotesTemp[0].ID_Ubicacion : v('mat-ubicacion');

  const row = [id, nombre, cat, v('mat-referencia'), v('mat-proveedor'), unidad, ubicPrincipal, stockGlobal, minStock, optStock, v('mat-observaciones'), gestionAuto ? 'TRUE' : 'FALSE'];

  showLoading('Guardando...');
  try {
    if (editingRow && editingRow.sheet === 'Material') {
      await sheetsUpdate(`Material!A${editingRow.rowIndex + 2}:L${editingRow.rowIndex + 2}`, row);
      DATA.material[editingRow.rowIndex] = rowToObj(row, 'material');
    } else {
      if (DATA.material.find(m => m.ID_Material === id)) { showToast('Ese ID ya existe', 'error'); hideLoading(); return; }
      await sheetsAppend('Material', row);
      DATA.material.push(rowToObj(row, 'material'));
    }

    // Guardar/actualizar lotes
    for (const lote of _lotesTemp) {
      if (lote._nuevo) {
        await añadirLote(id, lote.ID_Ubicacion, lote.Stock_Local, lote.Stock_Minimo_Local, lote.Stock_Optimo_Local);
      } else if (lote._loteIdx !== undefined) {
        const l = DATA.materialUbicaciones[lote._loteIdx];
        if (l && (l.Stock_Local !== lote.Stock_Local || l.Stock_Minimo_Local !== lote.Stock_Minimo_Local || l.Stock_Optimo_Local !== lote.Stock_Optimo_Local)) {
          // Actualizar las tres columnas D, E, F
          const fila = lote._loteIdx + 2;
          await sheetsUpdate(`Material_Ubicaciones!D${fila}:F${fila}`, [lote.Stock_Local, lote.Stock_Minimo_Local, lote.Stock_Optimo_Local]);
          DATA.materialUbicaciones[lote._loteIdx].Stock_Local         = lote.Stock_Local;
          DATA.materialUbicaciones[lote._loteIdx].Stock_Minimo_Local  = lote.Stock_Minimo_Local;
          DATA.materialUbicaciones[lote._loteIdx].Stock_Optimo_Local  = lote.Stock_Optimo_Local;
        }
      }
    }

    showToast(editingRow ? 'Material actualizado' : 'Material guardado', 'success');
    const aviso = document.getElementById('aviso-recepcion-pendiente');
    if (aviso) aviso.remove();
    closeModal('modal-material'); editingRow = null; _lotesTemp = [];

    if (_pendingRecepcion) {
      const { lineaId, pedidoId, cantRec, obs } = _pendingRecepcion;
      _pendingRecepcion = null;
      const idx = DATA.lineasPedido.findIndex(l => l.ID_Linea === lineaId);
      if (idx !== -1) {
        const l = DATA.lineasPedido[idx];
        const mat = DATA.material.find(m => m.Nombre === l.Material || l.Material.startsWith(m.Nombre));
        const cantPed = parseFloat(l.Cantidad_Pedida) || 0;
        if (mat) { showToast('Material catalogado. Registrando recepción...', 'success'); await _completarRecepcionLinea(idx, l, cantRec, cantPed, pedidoId, mat, obs); verDetallePedido(pedidoId); }
      }
    } else {
      renderAll();
    }
  } catch(e) { showToast('Error guardando', 'error'); console.error(e); }
  hideLoading();
}

// ============================================================
// GUARDAR CONSUMO / ENTRADA
// (lógica de ubicación completa en Paso 3 — aquí versión transitoria)
// ============================================================
async function guardarConsumo() {
  const matId   = document.getElementById('consumo-material-id').value;
  const cantStr = v('consumo-cantidad');
  if (!matId)  { showToast('Selecciona un material', 'error'); return; }
  if (!cantStr || parseFloat(cantStr) <= 0) { showToast('Introduce una cantidad válida', 'error'); return; }
  const mat = DATA.material.find(m => m.ID_Material === matId);
  if (!mat) { showToast('Material no encontrado', 'error'); return; }
  const cantidad = parseFloat(cantStr);

  // Detectar si hay lotes y qué ubicación se ha seleccionado
  const lotes = getMatUbics(matId);
  const ubiSel = document.getElementById('consumo-ubicacion-sel')?.value || '';

  showLoading('Registrando...');
  try {
    const fecha = new Date().toISOString().split('T')[0];
    const idMov = genId('MOV-');
    const rowMov = [idMov, mat.Nombre, 'Salida', cantidad, currentUser?.name || 'Usuario', fecha, v('consumo-motivo') || 'Consumo', v('consumo-obs')];
    await sheetsAppend('Movimientos', rowMov);
    DATA.movimientos.push(rowToObj(rowMov, 'movimientos'));

    if (lotes.length > 0 && ubiSel) {
      // Descontar del lote seleccionado
      const loteIdx = DATA.materialUbicaciones.findIndex(l => l.ID_Material === matId && l.ID_Ubicacion === ubiSel);
      if (loteIdx !== -1) {
        const nuevoLocal = Math.max(0, (parseFloat(DATA.materialUbicaciones[loteIdx].Stock_Local) || 0) - cantidad);
        await actualizarStockLocal(loteIdx, nuevoLocal);
      }
      // Recalcular stock global
      const nuevoTotal = getStockTotal(mat);
      const matIdx = DATA.material.indexOf(mat);
      mat.Stock_Actual = String(nuevoTotal);
      await sheetsUpdate(`Material!H${matIdx + 2}`, [nuevoTotal]);
    } else {
      // Sin lotes: comportamiento original
      const nuevoStock = Math.max(0, (parseFloat(mat.Stock_Actual) || 0) - cantidad);
      const matIdx = DATA.material.indexOf(mat);
      mat.Stock_Actual = String(nuevoStock);
      await sheetsUpdate(`Material!H${matIdx + 2}`, [nuevoStock]);
    }

    showToast(`Consumo registrado. Stock: ${getStockTotal(mat)} ${mat.Unidad}`, 'success');
    closeModal('modal-consumo'); renderAll();
  } catch(e) { showToast('Error registrando consumo', 'error'); console.error(e); }
  hideLoading();
}

async function guardarEntrada() {
  const matId   = document.getElementById('entrada-material-id').value;
  const cantStr = v('entrada-cantidad');
  if (!matId)  { showToast('Selecciona un material', 'error'); return; }
  if (!cantStr || parseFloat(cantStr) <= 0) { showToast('Introduce una cantidad válida', 'error'); return; }
  const mat = DATA.material.find(m => m.ID_Material === matId);
  if (!mat) { showToast('Material no encontrado', 'error'); return; }
  const cantidad = parseFloat(cantStr);

  const lotes = getMatUbics(matId);
  const ubiSel = document.getElementById('entrada-ubicacion-sel')?.value || '';

  showLoading('Registrando...');
  try {
    const fecha = new Date().toISOString().split('T')[0];
    const idMov = genId('MOV-');
    const rowMov = [idMov, mat.Nombre, 'Entrada', cantidad, currentUser?.name || 'Usuario', fecha, v('entrada-motivo'), v('entrada-obs')];
    await sheetsAppend('Movimientos', rowMov);
    DATA.movimientos.push(rowToObj(rowMov, 'movimientos'));

    if (lotes.length > 0 && ubiSel) {
      const loteIdx = DATA.materialUbicaciones.findIndex(l => l.ID_Material === matId && l.ID_Ubicacion === ubiSel);
      if (loteIdx !== -1) {
        const nuevoLocal = (parseFloat(DATA.materialUbicaciones[loteIdx].Stock_Local) || 0) + cantidad;
        await actualizarStockLocal(loteIdx, nuevoLocal);
      }
      const nuevoTotal = getStockTotal(mat);
      const matIdx = DATA.material.indexOf(mat);
      mat.Stock_Actual = String(nuevoTotal);
      await sheetsUpdate(`Material!H${matIdx + 2}`, [nuevoTotal]);
    } else {
      const nuevoStock = (parseFloat(mat.Stock_Actual) || 0) + cantidad;
      const matIdx = DATA.material.indexOf(mat);
      mat.Stock_Actual = String(nuevoStock);
      await sheetsUpdate(`Material!H${matIdx + 2}`, [nuevoStock]);
    }

    showToast(`Entrada registrada. Stock: ${getStockTotal(mat)} ${mat.Unidad}`, 'success');
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
