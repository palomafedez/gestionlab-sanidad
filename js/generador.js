// ============================================================
// GENERACIÓN FOLLA DE PEDIDO (Word + IA)
// ============================================================
const TEMPLATE_B64 = 'UEsDBBQAAAAIAAAAIQBkXGpQkQEAALsGAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbK2Uy27CMBBF9/2KyNuqNixoVYUs2i4rqBT6Aa49SSwc2/IjlL/vOCFQqBQeXUWKPJl77vUkztvFqpSJBee1NTlJBylJwHBbaNPk5H3+MhydJD4IU4jSGsjJGjxZTC8n87UDn8Q047GpSRuCe6TU8xaU8APrwMRKZZ0SEY+uoU7wrWiAZml6T7k1AUygLEIvedYL8Jq9MsLTMkBtgWFJIZJEFxF+i2aKcnrE2dMkiScBvPY9TAdJSNxHhaqBhC1bCeJfCr3X2bnAl1JWXNifaBXqRKzlNhDQYGGt2YNGSHjhFBOLFhLyBp6CjDlmD2XQzxCGc4OBoHMmZ9/XYPMA5jNqHBORbW4RNKpNmxkqSgpMtbbMeO0F7eFQjHlGTsY5I7F1VsNUQCYP9cL7vv5HJW7jGf5h7IbvPfxU+UX2jlH1VzmRTqNKF4ikWnhVDqKRSm1ADDVLLbhF8Ods6F2g+r3idkh3XL+h0s9NMiE/jGjMrEoFUwHCYGLnGQoJt0zhnH6IYV2AqsLT9C7lBvJCmD5/rSmCU8Oy3dNGpRajX8Mxz1OD0F/qx7VQIAA';

let _genPdfBase64 = null;

function handleGenPdfSelect(input) {
  const file = input.files[0]; if (!file) return;
  document.getElementById('gen-pdf-name').textContent = file.name;
  document.getElementById('gen-pdf-preview').style.display = 'flex';
  document.getElementById('gen-upload-area').style.display = 'none';
  const reader = new FileReader();
  reader.onload = e => { _genPdfBase64 = { name: file.name, data: e.target.result.split(',')[1] }; };
  reader.readAsDataURL(file);
}

function removeGenPdf() {
  _genPdfBase64 = null;
  document.getElementById('gen-pdf-preview').style.display = 'none';
  document.getElementById('gen-upload-area').style.display = '';
  document.getElementById('gen-pdf-input').value = '';
}

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

async function extraerDatosFactura(pdfBase64, lineas) {
  setGenEstado('🤖 Extrayendo datos de la factura con IA...', 'info');
  try {
    const lineaTexto = lineas.map((l,i) => `${i+1}. ${l.Material} (cant: ${l.Cantidad_Pedida})`).join('\n');
    const prompt = `Aquí tienes una factura en PDF y una lista de ítems pedidos.\nExtrae para cada ítem el concepto exacto tal como aparece en la factura, cantidad, precio unitario y total.\nIncluye el IVA como una línea separada si aparece desglosado.\nExtrae también el número de factura, la fecha y el importe total.\n\nÍtems del pedido (para referencia):\n${lineaTexto}\n\nResponde ÚNICAMENTE con JSON válido sin markdown:\n{"num_factura":"","fecha":"DD/MM/YYYY","lineas":[{"concepto":"","cantidad":"","precio":"","total":""}],"importe_total":""}`;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: prompt }
        ]}]
      })
    });
    const data  = await response.json();
    const text  = data.content?.map(c => c.text||'').join('') || '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) { console.error('Error extrayendo datos factura:', e); return null; }
}

function injectTextIntoRow(rowXml, texts) {
  if (!texts || !texts.some(t => t)) return rowXml;
  let idx = 0;
  return rowXml.replace(/<w:p\b.*?<\/w:p>/gs, para => {
    if (idx >= texts.length) return para;
    if (/<w:r[ >]/.test(para)) return para;
    const text = texts[idx++] || '';
    if (!text) return para;
    const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const run  = `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${safe}</w:t></w:r>`;
    return para.slice(0, -'</w:p>'.length) + run + '</w:p>';
  });
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
    let lineasConPrecios = lineas.map(l => ({ concepto: l.Material, cantidad: l.Cantidad_Pedida, precio: '', total: '' }));
    let importeTotal = '', numFactura = p.Numero_Factura || '';
    let fechaDoc = p.Fecha_Factura || p.Fecha_Recepcion_Completa || new Date().toLocaleDateString('es-ES');

    if (_genPdfBase64) {
      const extraido = await extraerDatosFactura(_genPdfBase64.data, lineas);
      if (extraido) {
        if (extraido.lineas?.length) lineasConPrecios = extraido.lineas;
        if (extraido.importe_total) importeTotal = extraido.importe_total;
        if (extraido.num_factura)   numFactura   = extraido.num_factura;
        if (extraido.fecha)         fechaDoc     = extraido.fecha;
        setGenEstado('✅ Datos extraídos de la factura correctamente', 'ok');
      } else {
        setGenEstado('⚠️ No se pudieron extraer datos. Se generará con los datos disponibles.', 'error');
      }
    }

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
      } catch(err) { setGenEstado('Error subiendo a Drive: ' + err.message, 'error'); }
      btn.disabled = false; btn.textContent = 'Generar Word';
    };
    reader.readAsDataURL(docxBlob);
  } catch(e) {
    console.error(e); setGenEstado('Error: ' + e.message, 'error');
    btn.disabled = false; btn.textContent = 'Generar Word';
  }
}
