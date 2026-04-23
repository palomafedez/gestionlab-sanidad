// ============================================================
// GENERACIÓN FOLLA DE PEDIDO (Word + IA)
// ============================================================




function abrirGeneradorHoja(pedidoId) {
  sv('gen-pedido-id', pedidoId);
  sv('gen-ciclo',''); sv('gen-modulo','');
  removeGenPdf();
  document.getElementById('gen-estado-container').style.display = 'none';
  actualizarModulos();
  openModal('modal-generar-hoja');
}

function actualizarModulos() {
  const ciclo = v('gen-ciclo');
  const sel   = document.getElementById('gen-modulo');
  const modulos = DATA.ciclosModulos.filter(cm => cm.Ciclo === ciclo).map(cm => cm.Modulo).filter(Boolean);
  sel.innerHTML = '<option value="">— (dejar vacío si es para varios) —</option>' + modulos.map(m => `<option value="${m}">${m}</option>`).join('');
}

function setGenEstado(msg, tipo = 'info') {
  const cont = document.getElementById('gen-estado-container');
  const txt  = document.getElementById('gen-estado-text');
  if (!cont || !txt) return;
  cont.style.display = '';
  const colors     = { info:'var(--accent-light)', error:'var(--danger-light)', ok:'var(--success-light)' };
  const textColors = { info:'var(--accent)',        error:'var(--danger)',       ok:'var(--success)' };
  cont.querySelector('div').style.background = colors[tipo] || colors.info;
  cont.querySelector('div').style.color      = textColors[tipo] || textColors.info;
  txt.innerHTML = msg;
}


function injectTextIntoRow(rowXml, texts) {
  if (!texts || !texts.some(t => t)) return rowXml;
  const cells = rowXml.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) || [];
  if (!cells.length) return rowXml;
  let result = rowXml;
  cells.forEach((cell, idx) => {
    if (idx >= texts.length) return;
    const text = texts[idx];
    if (!text) return;
    const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const run = `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">${safe}</w:t></w:r>`;
    const newCell = cell.replace(/<\/w:p>/, run + '</w:p>');
    result = result.replace(cell, newCell);
  });
  return result;
}

async function generarHojaPedido() {
  const pedidoId = v('gen-pedido-id');
  const ciclo    = v('gen-ciclo');
  if (!ciclo) { showToast('Selecciona el ciclo', 'error'); return; }
  const p = DATA.pedidos.find(x => x.ID_Pedido === pedidoId); if (!p) return;
  const lineas = DATA.lineasPedido.filter(l => l.Pedido === pedidoId);
  const btn = document.getElementById('btn-generar-hoja');
  btn.disabled = true; btn.textContent = '⏳ Generando...';

  try {
    const lineasConPrecios = lineas.map(l => ({ concepto: l.Material, cantidad: l.Cantidad_Pedida, precio: '', total: '' }));
    const importeTotal = '';
    const numFactura = p.Numero_Factura || '';
    const fechaDoc = p.Fecha_Factura || p.Fecha_Recepcion_Completa || new Date().toLocaleDateString('es-ES');

    setGenEstado('📝 Generando documento...', 'info');
    let templateBuffer;
    try {
      const tplResp = await fetch('./assets/templates/Folla%20de%20Pedido%20_%20modelo.docx');
      if (!tplResp.ok) throw new Error('HTTP ' + tplResp.status);
      templateBuffer = await tplResp.arrayBuffer();
    } catch(e) {
      throw new Error('No se pudo cargar la plantilla (' + e.message + '). Comprueba que el archivo existe en assets/templates/.');
    }

    const zip    = await JSZip.loadAsync(templateBuffer);
    let docXml   = await zip.file('word/document.xml').async('string');
    const rows   = docXml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
    const mod    = [...rows];

    if (rows[4])  mod[4]  = injectTextIntoRow(rows[4],  [ciclo, v('gen-modulo'), fechaDoc]);
    if (rows[6])  mod[6]  = injectTextIntoRow(rows[6],  [p.Proveedor||'', '']);
    if (rows[8])  mod[8]  = injectTextIntoRow(rows[8],  ['', numFactura]);
    for (let i = 0; i < 25 && rows[10+i]; i++) {
      if (i < lineasConPrecios.length) {
        const l = lineasConPrecios[i];
        mod[10+i] = injectTextIntoRow(rows[10+i], [String(l.concepto||''), String(l.cantidad||''), String(l.precio||''), String(l.total||'')]);
      }
    }
    if (rows[35]) mod[35] = injectTextIntoRow(rows[35], [importeTotal]);

    let newXml = docXml;
    rows.forEach((old, i) => { if (mod[i] !== old) newXml = newXml.replace(old, mod[i]); });
    zip.file('word/document.xml', newXml);

    const docxBlob = await zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    setGenEstado('☁️ Subiendo a Drive...', 'info');
    const fileName = `Folla_Pedido_${p.Nombre_Lista.replace(/[^a-zA-Z0-9]/g,'_')}_${new Date().toISOString().slice(0,10)}.docx`;
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const base64data = e.target.result.split(',')[1];
        const url = await uploadFileToDrive(base64data, fileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        setGenEstado(`✅ Listo. <a href="${url}" target="_blank" style="color:var(--accent);font-weight:600;text-decoration:underline">📥 Abrir documento en Drive</a>`, 'ok');
        // Marcar Doc_Hoja_Generada automáticamente
        const pedIdx = DATA.pedidos.findIndex(x => x.ID_Pedido === pedidoId);
        if (pedIdx !== -1 && DATA.pedidos[pedIdx].Doc_Hoja_Generada !== 'TRUE') {
          DATA.pedidos[pedIdx].Doc_Hoja_Generada = 'TRUE';
          try { await sheetsUpdate('Pedidos!N' + (pedIdx+2), ['TRUE']); } catch(e) { console.warn('No se pudo marcar Doc_Hoja_Generada', e); }
          if (document.getElementById('page-pedido-detalle').classList.contains('active')) verDetallePedido(pedidoId);
        }
      } catch(err) { setGenEstado('Error subiendo a Drive: ' + err.message, 'error'); }
      btn.disabled = false; btn.textContent = 'Generar Word';
    };
    reader.readAsDataURL(docxBlob);
  } catch(e) {
    console.error(e); setGenEstado('Error: ' + e.message, 'error');
    btn.disabled = false; btn.textContent = 'Generar Word';
  }
}
