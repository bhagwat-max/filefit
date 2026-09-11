export function outputDimensions(sourceWidth, sourceHeight, width, height) {
  for (const n of [sourceWidth, sourceHeight]) if (!Number.isInteger(n) || n < 1) throw new Error('The image dimensions could not be read.');
  for (const n of [width, height]) if (n !== null && (!Number.isInteger(n) || n < 1 || n > 8000)) throw new Error('Enter a whole number from 1 to 8,000 for each dimension.');
  const w = width ?? (height ? Math.max(1, Math.round(sourceWidth * height / sourceHeight)) : sourceWidth);
  const h = height ?? (width ? Math.max(1, Math.round(sourceHeight * width / sourceWidth)) : sourceHeight);
  if (w > 8000 || h > 8000 || w * h > 16000000) throw new Error('Please use dimensions below 8,000 pixels and 16 million pixels in total.');
  return { width: w, height: h, exact: width !== null || height !== null };
}
export function placement(sw, sh, dw, dh, fit) {
  const scale = fit === 'cover' ? Math.max(dw / sw, dh / sh) : Math.min(dw / sw, dh / sh);
  const width = sw * scale, height = sh * scale;
  return { x: (dw - width) / 2, y: (dh - height) / 2, width, height };
}
export async function fitFile({ width, height, exact, maxBytes, lossless, encode }) {
  let w = width, h = height;
  for (let attempt = 0; attempt < 22; attempt++) {
    let blob = await encode(w, h, .94);
    if (!maxBytes || blob.size <= maxBytes) return { blob, width: w, height: h };
    if (!lossless) {
      const lowBlob = await encode(w, h, .08);
      if (lowBlob.size <= maxBytes) {
        let best = lowBlob, low = .08, high = .94;
        for (let i = 0; i < 8; i++) {
          const q = (low + high) / 2;
          const trial = await encode(w, h, q);
          if (trial.size <= maxBytes) { best = trial; low = q; } else high = q;
        }
        return { blob: best, width: w, height: h };
      }
      blob = lowBlob;
    }
    if (exact || (w === 1 && h === 1)) break;
    const factor = Math.min(.85, Math.max(.35, Math.sqrt(maxBytes / blob.size) * .9));
    w = Math.max(1, Math.floor(w * factor)); h = Math.max(1, Math.round(height * w / width));
  }
  throw new Error(exact ? 'This size limit is too small for those exact dimensions. Choose a larger KB limit, reduce the dimensions, or try JPG.' : 'That limit is too small for this file. Choose a larger KB limit or try JPG.');
}
