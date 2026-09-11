import { outputDimensions, placement, fitFile } from './core.js';
const $ = id => document.getElementById(id);
const config = {
  photo: { title: 'Let’s resize your photo.', description: 'Start by choosing the photo you want to use.', noun: 'photo', size: '100' },
  signature: { title: 'Let’s get your signature ready.', description: 'Choose a clear photo or scan of your signature.', noun: 'signature', size: '20' },
  pdf: { title: 'Let’s try a smaller PDF.', description: 'Choose your PDF. We’ll check if it can be made smaller.', noun: 'PDF', size: 'none' }
};
let mode = 'photo', file = null, bitmap = null, previewUrl = null, outputUrl = null, busy = false, pdfModule;
const tools = [...document.querySelectorAll('[data-tool]')];
const humanSize = n => n < 1000000 ? `${(n / 1000).toFixed(1)} KB` : `${(n / 1000000).toFixed(2)} MB`;
const showError = message => { $('error').textContent = message; $('error').hidden = false; };
const clearError = () => { $('error').hidden = true; $('error').textContent = ''; };
function setStep(step) {
  document.querySelectorAll('.steps li').forEach((li, i) => {
    li.classList.toggle('current', i === step - 1); li.classList.toggle('done', i < step - 1);
    if (i === step - 1) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
}
function invalidate() {
  if (outputUrl) URL.revokeObjectURL(outputUrl);
  outputUrl = null; $('result').hidden = true; $('download').removeAttribute('href');
  if (file) setStep(2);
  clearError();
}
function releaseInput() {
  bitmap?.close?.(); bitmap = null;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null; $('preview').removeAttribute('src'); file = null;
}
function reset(focus = false) {
  if (busy) return;
  invalidate(); releaseInput(); $('file-input').value = ''; $('editor').hidden = true; $('dropzone').hidden = false;
  $('status').hidden = true; setStep(1); if (focus) $('choose').focus();
}
function selectTool(next, focus = false) {
  if (!config[next]) throw new Error('Choose photo, signature or pdf.');
  if (busy) throw new Error('Please wait for the current file to finish.');
  reset(); mode = next; const c = config[mode];
  tools.forEach(button => { const selected = button.dataset.tool === mode; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); });
  $('tool-title').textContent = c.title; $('tool-description').textContent = c.description;
  $('upload-heading').textContent = `Choose your ${c.noun}`; $('choose-label').textContent = `Choose ${c.noun}`;
  $('process-label').textContent = mode === 'pdf' ? 'Make my PDF smaller' : `Make my ${c.noun} fit`;
  $('accepted').textContent = mode === 'pdf' ? 'PDF files · Up to 25 MB' : 'JPG, PNG or WebP · Up to 25 MB';
  $('file-input').accept = mode === 'pdf' ? 'application/pdf,.pdf' : 'image/jpeg,image/png,image/webp';
  $('image-settings').hidden = mode === 'pdf'; $('pdf-settings').hidden = mode !== 'pdf'; $('trim-row').hidden = mode !== 'signature';
  $('settings').reset(); document.querySelector(`input[name="size"][value="${c.size}"]`).checked = true;
  $('custom-size-row').hidden = true; $('custom-size').required = false; $('more-options').open = false; $('format-note').hidden = true;
  if (focus) $('choose').focus();
  return { tool: mode, step: 'choose_file' };
}
function setBusy(value, message = '') {
  busy = value; document.body.classList.toggle('busy', value);
  for (const control of document.querySelectorAll('button, #settings input, #settings select, #file-input')) control.disabled = value;
  $('status').hidden = !value; $('status').textContent = message;
  $('process-label').textContent = value ? 'Working on your file…' : mode === 'pdf' ? 'Make my PDF smaller' : `Make my ${config[mode].noun} fit`;
}
async function loadPdf() { return pdfModule ??= import('./vendor/pdf-lib.js'); }
async function readImage(input) {
  const url = URL.createObjectURL(input);
  const image = new Image(); image.decoding = 'async';
  try { image.src = url; await image.decode(); return image; } finally { URL.revokeObjectURL(url); }
}
async function chooseFile(input) {
  if (busy || !input) return;
  clearError();
  if (input.size > 25000000) { showError('That file is over 25 MB. Please choose a smaller file.'); return; }
  if (!input.size) { showError('That file is empty. Please choose another file.'); return; }
  const isPdf = input.type === 'application/pdf' || /\.pdf$/i.test(input.name);
  if (mode === 'pdf' && !isPdf) { showError('Please choose a PDF, or select Photo for an image.'); return; }
  if (mode !== 'pdf' && !['image/jpeg', 'image/png', 'image/webp'].includes(input.type) && !/\.(jpe?g|png|webp)$/i.test(input.name)) { showError('Please choose a JPG, PNG or WebP image. Use the PDF tool for PDF files.'); return; }
  invalidate(); releaseInput(); $('editor').hidden = true; $('dropzone').hidden = false;
  setBusy(true, 'Opening your file on this device…');
  try {
    if (mode !== 'pdf') {
      const decoded = await readImage(input);
      if (decoded.naturalWidth * decoded.naturalHeight > 16000000 || decoded.naturalWidth > 8000 || decoded.naturalHeight > 8000) throw new Error('This image is too large to process comfortably. Please use an image under 16 million pixels and 8,000 pixels on each side.');
      bitmap = decoded;
      previewUrl = URL.createObjectURL(input); $('preview').src = previewUrl;
    } else {
      const header = new TextDecoder().decode(await input.slice(0, 1024).arrayBuffer());
      if (!header.includes('%PDF-')) throw new Error('This file does not look like a readable PDF. Please choose another PDF.');
    }
    file = input; $('file-name').textContent = input.name;
    $('file-meta').textContent = humanSize(input.size) + (bitmap ? ` · ${bitmap.naturalWidth} × ${bitmap.naturalHeight} pixels` : ' · PDF document');
    $('preview').hidden = mode === 'pdf'; $('pdf-icon').hidden = mode !== 'pdf';
    $('editor').hidden = false; $('dropzone').hidden = true; setStep(2);
  } catch (error) { releaseInput(); showError(error.message?.includes('decode') ? 'We couldn’t open that image. Please try a JPG or PNG copy.' : error.message || 'We couldn’t open that file. Please try another.'); }
  finally { setBusy(false); }
  if (file) { const focusTarget = mode === 'pdf' ? $('process') : document.querySelector('input[name="size"]:checked'); focusTarget.focus({ preventScroll: true }); }
}
function sourceCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = bitmap.naturalWidth; canvas.height = bitmap.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: mode === 'signature' });
  ctx.drawImage(bitmap, 0, 0);
  if (mode !== 'signature' || !$('trim').checked) return canvas;
  const { width, height } = canvas, data = ctx.getImageData(0, 0, width, height).data;
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i + 3] > 40 && Math.min(data[i], data[i + 1], data[i + 2]) < 225) {
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left) return canvas;
  const pad = Math.max(3, Math.round(Math.max(right - left, bottom - top) * .04));
  left = Math.max(0, left - pad); top = Math.max(0, top - pad); right = Math.min(width - 1, right + pad); bottom = Math.min(height - 1, bottom + pad);
  const trimmed = document.createElement('canvas'); trimmed.width = right - left + 1; trimmed.height = bottom - top + 1;
  trimmed.getContext('2d').drawImage(canvas, left, top, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
  canvas.width = canvas.height = 1; return trimmed;
}
async function canvasBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The browser couldn’t save that image. Try smaller dimensions.')), mime, quality));
}
async function processImage() {
  const chosen = document.querySelector('input[name="size"]:checked').value;
  const kb = chosen === 'none' ? null : Number(chosen === 'custom' ? $('custom-size').value : chosen);
  if (kb !== null && (!Number.isFinite(kb) || kb < 1 || kb > 25000)) throw new Error('Enter a maximum file size between 1 and 25,000 KB.');
  const readDimension = id => $(id).value.trim() ? Number($(id).value) : null;
  const source = sourceCanvas();
  try {
    const dimensions = outputDimensions(source.width, source.height, readDimension('width'), readDimension('height'));
    const format = $('format').value;
    const canvas = document.createElement('canvas'); let lastW = 0, lastH = 0;
    const encode = async (width, height, quality) => {
      if (width !== lastW || height !== lastH) {
        canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d');
        if (format !== 'image/png') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height); }
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        const p = placement(source.width, source.height, width, height, $('fit').value);
        ctx.drawImage(source, p.x, p.y, p.width, p.height); lastW = width; lastH = height;
      }
      const blob = await canvasBlob(canvas, format === 'image/png' ? 'image/png' : 'image/jpeg', quality);
      if (format !== 'application/pdf') return blob;
      const { PDFDocument } = await loadPdf(); const doc = await PDFDocument.create();
      const image = await doc.embedJpg(await blob.arrayBuffer()); const page = doc.addPage([width * .75, height * .75]);
      page.drawImage(image, { x: 0, y: 0, width: width * .75, height: height * .75 });
      return new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
    };
    const result = await fitFile({ ...dimensions, maxBytes: kb === null ? null : kb * 1000, lossless: format === 'image/png', encode });
    canvas.width = canvas.height = 1;
    const reduced = result.width !== dimensions.width || result.height !== dimensions.height;
    return { ...result, extension: format === 'application/pdf' ? 'pdf' : format === 'image/png' ? 'png' : 'jpg', note: `${kb ? `Fits your ${kb} KB limit. ` : ''}${reduced ? 'Pixel dimensions were reduced to meet the size limit. ' : ''}Check your downloaded file before submitting it.`, title: 'Your file is ready.' };
  } finally { source.width = source.height = 1; }
}
async function processPdf() {
  const { PDFDocument } = await loadPdf(); let doc;
  try { doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false }); }
  catch (error) { if (/encrypt|password/i.test(String(error))) throw new Error('This PDF is password-protected. Please save an unlocked copy, then try again.'); throw new Error('We couldn’t read this PDF. Please export a fresh copy from the app that created it.'); }
  const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
  const smaller = bytes.length < file.size;
  return { blob: smaller ? new Blob([bytes], { type: 'application/pdf' }) : file, extension: 'pdf', pages: doc.getPageCount(), title: smaller ? 'Your smaller PDF is ready.' : 'Your PDF is already compact.', note: smaller ? 'The PDF structure was optimised. Image quality was not reduced. Check the downloaded file before submitting it.' : 'We couldn’t reduce it without changing the content. You can download the original here.' };
}
async function processFile() {
  if (busy || !file) throw new Error('Choose a file first.');
  invalidate(); setBusy(true, mode === 'pdf' ? 'Checking your PDF. Larger files may take a moment…' : 'Finding the best fit. This may take a moment…');
  try {
    await new Promise(resolve => setTimeout(resolve, 40));
    const result = mode === 'pdf' ? await processPdf() : await processImage();
    outputUrl = URL.createObjectURL(result.blob); const base = file.name.replace(/\.[^.]+$/, '') || 'file';
    $('download').href = outputUrl; $('download').download = `${base}-filefit.${result.extension}`;
    $('result-title').textContent = result.title;
    $('result-meta').textContent = `${humanSize(file.size)} → ${humanSize(result.blob.size)} · ${result.width ? `${result.width} × ${result.height} pixels · ` : `${result.pages} page${result.pages === 1 ? '' : 's'} · `}${result.extension.toUpperCase()}`;
    $('result-note').textContent = result.note; $('result').hidden = false; setStep(3);
    $('result').focus({ preventScroll: true }); $('result').scrollIntoView({ block: 'nearest', behavior: 'instant' });
    return { status: 'ready', bytes: result.blob.size, format: result.extension, width: result.width ?? null, height: result.height ?? null };
  } catch (error) { showError(error.message || 'Something went wrong. Try a smaller file or a different format.'); throw error; }
  finally { setBusy(false); }
}
tools.forEach(button => button.addEventListener('click', () => selectTool(button.dataset.tool)));
$('choose').addEventListener('click', () => $('file-input').click());
$('change-file').addEventListener('click', () => { $('file-input').value = ''; $('file-input').click(); });
$('file-input').addEventListener('change', e => chooseFile(e.target.files[0]));
$('start-over').addEventListener('click', () => reset(true));
$('settings').addEventListener('submit', e => { e.preventDefault(); processFile().catch(() => {}); });
$('settings').addEventListener('input', () => { invalidate(); const custom = document.querySelector('input[name="size"]:checked').value === 'custom'; $('custom-size-row').hidden = !custom; $('custom-size').required = custom;
  $('format-note').hidden = $('format').value === 'image/jpeg';
  $('format-note').textContent = $('format').value === 'image/png' ? 'PNG files can be larger. A very small size limit may need fewer pixels. JPG is often a better fit for forms.' : 'Your image will become a single-page PDF. The file-size limit still applies.';
});
for (const event of ['dragenter', 'dragover']) $('dropzone').addEventListener(event, e => { e.preventDefault(); if (!busy) $('dropzone').classList.add('dragging'); });
for (const event of ['dragleave', 'drop']) $('dropzone').addEventListener(event, e => { e.preventDefault(); $('dropzone').classList.remove('dragging'); });
$('dropzone').addEventListener('drop', e => { if (e.dataTransfer.files.length > 1) showError('Choose one file at a time.'); else chooseFile(e.dataTransfer.files[0]); });
window.addEventListener('dragover', e => e.preventDefault()); window.addEventListener('drop', e => e.preventDefault());
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const registry = document.modelContext;
  const list = [
    { name: 'select_file_tool', description: 'Select photo, signature or PDF preparation. Clears the current file and result. The user must choose a local file next.', inputSchema: { type: 'object', properties: { tool: { type: 'string', enum: ['photo', 'signature', 'pdf'] } }, required: ['tool'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute(input) { if (!input || !config[input.tool] || Object.keys(input).some(k => k !== 'tool')) throw new Error('A valid tool is required.'); return selectTool(input.tool); } },
    { name: 'prepare_selected_file', description: 'Process the local file already selected by the user using the visible settings. Makes a download link available; does not download it automatically.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false }, execute(input) { if (!input || Object.keys(input).length) throw new Error('No arguments are accepted.'); return processFile(); } }
  ];
  for (const tool of list) { try { Promise.resolve(registry.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
