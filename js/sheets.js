// ============================================================
// SHEETS API
// ============================================================
async function sheetsGet(range) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const d = await r.json();
  return d.values || [];
}

async function sheetsAppend(sheet, row) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheet + '!A1')}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] })
    }
  );
}

async function sheetsUpdate(range, row) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] })
    }
  );
}

async function sheetsClear(range) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:clear`,
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
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
