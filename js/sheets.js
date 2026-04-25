// ============================================================
// SHEETS API
// ============================================================

// ----------------------------------------------------------------
// authFetch — wrapper central para todas las llamadas a la API.
// Inyecta el Bearer token, y si recibe un 401 intenta renovar el
// token una vez antes de rendirse y redirigir al login.
// ----------------------------------------------------------------
async function authFetch(url, options = {}) {
  options.headers = { ...options.headers, Authorization: `Bearer ${accessToken}` };
  let r = await fetch(url, options);
  if (r.status === 401) {
    try {
      await renewTokenPromise();
      options.headers.Authorization = `Bearer ${accessToken}`;
      r = await fetch(url, options);
    } catch(e) {
      // La renovación falló — sesión expirada, volver al login
      clearSession();
      document.getElementById('app').style.display = 'none';
      document.getElementById('auth-screen').style.display = 'flex';
      throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
    }
  }
  return r;
}

async function sheetsGet(range) {
  const r = await authFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`
  );
  const d = await r.json();
  return d.values || [];
}

async function sheetsAppend(sheet, row) {
  await authFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheet + '!A1')}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] })
    }
  );
}

async function sheetsUpdate(range, row) {
  await authFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] })
    }
  );
}

async function sheetsClear(range) {
  await authFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:clear`,
    { method: 'POST' }
  );
}

// ============================================================
// HELPERS MATERIAL_UBICACIONES
// ============================================================

/**
 * Actualiza el Stock_Local de un lote existente.
 * loteIndex: posición en DATA.materialUbicaciones (0-based → fila = loteIndex + 2)
 */
async function actualizarStockLocal(loteIndex, nuevoStock) {
  const fila = loteIndex + 2;
  await sheetsUpdate(`Material_Ubicaciones!D${fila}`, [String(nuevoStock)]);
  DATA.materialUbicaciones[loteIndex].Stock_Local = String(nuevoStock);
}

/**
 * Añade un nuevo lote a Material_Ubicaciones y lo registra en DATA.
 * Devuelve el objeto lote creado.
 */
async function añadirLote(idMaterial, idUbicacion, stockLocal, stockMin, stockOpt) {
  const id = genId('LU');
  const row = [id, idMaterial, idUbicacion, String(stockLocal), String(stockMin || 0), String(stockOpt || 0)];
  await sheetsAppend('Material_Ubicaciones', row);
  const lote = rowToObj(row, 'materialUbicaciones');
  DATA.materialUbicaciones.push(lote);
  return lote;
}

/**
 * Elimina un lote de Material_Ubicaciones (pone fila en blanco).
 * En Sheets no hay borrado real de filas via API REST sin Batchupdate,
 * así que vaciamos los valores. La fila vacía se ignora en loadAllData (filtro r[0]).
 */
async function eliminarLote(loteIndex) {
  const fila = loteIndex + 2;
  await sheetsUpdate(`Material_Ubicaciones!A${fila}:F${fila}`, ['', '', '', '', '', '']);
  DATA.materialUbicaciones.splice(loteIndex, 1);
}

// ============================================================
// CARGAR TODOS LOS DATOS
// ============================================================
async function loadAllData() {
  showLoading('Cargando datos...');
  try {
    const [equipos, intervenciones, incidencias, proveedores, ubicaciones, usuarios,
           material, movimientos, solicitudes, pedidos, lineasPedido, ciclosModulos,
           materialUbicaciones] = await Promise.all([
      sheetsGet('Equipos!A2:R'),
      sheetsGet('Intervenciones!A2:R'),
      sheetsGet('Incidencias!A2:I'),
      sheetsGet('Proveedores!A2:I'),
      sheetsGet('Ubicaciones!A2:F'),
      sheetsGet('Usuarios!A2:E'),
      sheetsGet('Material!A2:L'),
      sheetsGet('Movimientos!A2:H'),
      sheetsGet('Solicitudes!A2:J'),
      sheetsGet('Pedidos!A2:M'),
      sheetsGet('Lineas_Pedido!A2:H'),
      sheetsGet('Ciclos_Modulos!A2:B'),
      sheetsGet('Material_Ubicaciones!A2:F')
    ]);

    const toObj = (rows, type) => rows.filter(r => r.length && r[0]).map(r => rowToObj(r, type));

    DATA.equipos             = toObj(equipos,             'equipos');
    DATA.intervenciones      = toObj(intervenciones,      'intervenciones');
    DATA.incidencias         = toObj(incidencias,         'incidencias');
    DATA.proveedores         = toObj(proveedores,         'proveedores');
    DATA.ubicaciones         = toObj(ubicaciones,         'ubicaciones');
    DATA.usuarios            = toObj(usuarios,            'usuarios');
    DATA.material            = toObj(material,            'material');
    DATA.movimientos         = toObj(movimientos,         'movimientos');
    DATA.solicitudes         = toObj(solicitudes,         'solicitudes');
    DATA.pedidos             = toObj(pedidos,             'pedidos');
    DATA.lineasPedido        = toObj(lineasPedido,        'lineasPedido');
    DATA.ciclosModulos       = toObj(ciclosModulos,       'ciclosModulos');
    DATA.materialUbicaciones = toObj(materialUbicaciones, 'materialUbicaciones');

    renderAll();
  } catch(e) {
    showToast('Error cargando datos. Comprueba los permisos del Sheet.', 'error');
    console.error(e);
  }
  hideLoading();
}
