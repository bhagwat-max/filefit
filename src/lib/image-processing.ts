export type ImageFormat = "image/jpeg" | "image/png";
export type ImageFit = "contain" | "cover";

export type ProcessImageOptions = {
  file: File;
  maxKb: number | null;
  width: number | null;
  height: number | null;
  fit: ImageFit;
  format: ImageFormat;
  trimSignature: boolean;
};

export type ProcessedImage = {
  blob: Blob;
  width: number;
  height: number;
  extension: "jpg" | "png";
  dimensionsReduced: boolean;
};

const MAX_EDGE = 8000;
const MAX_PIXELS = 16_000_000;

function canvasToBlob(canvas: HTMLCanvasElement, type: ImageFormat, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Your browser could not save this image. Try smaller dimensions.")),
      type,
      quality,
    );
  });
}

function outputDimensions(
  sourceWidth: number,
  sourceHeight: number,
  requestedWidth: number | null,
  requestedHeight: number | null,
) {
  const values = [requestedWidth, requestedHeight];
  for (const value of values) {
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > MAX_EDGE)) {
      throw new Error("Enter a whole number from 1 to 8,000 for each dimension.");
    }
  }

  const width =
    requestedWidth ??
    (requestedHeight
      ? Math.max(1, Math.round((sourceWidth * requestedHeight) / sourceHeight))
      : sourceWidth);
  const height =
    requestedHeight ??
    (requestedWidth
      ? Math.max(1, Math.round((sourceHeight * requestedWidth) / sourceWidth))
      : sourceHeight);

  if (width > MAX_EDGE || height > MAX_EDGE || width * height > MAX_PIXELS) {
    throw new Error("Use dimensions below 8,000 pixels and 16 million pixels in total.");
  }

  return {
    width,
    height,
    exact: requestedWidth !== null || requestedHeight !== null,
  };
}

function getPlacement(
  sourceWidth: number,
  sourceHeight: number,
  destinationWidth: number,
  destinationHeight: number,
  fit: ImageFit,
) {
  const scale =
    fit === "cover"
      ? Math.max(destinationWidth / sourceWidth, destinationHeight / sourceHeight)
      : Math.min(destinationWidth / sourceWidth, destinationHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (destinationWidth - width) / 2,
    y: (destinationHeight - height) / 2,
    width,
    height,
  };
}

function trimWhiteSpace(source: HTMLCanvasElement) {
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Your browser could not read this signature.");

  const { width, height } = source;
  const pixels = context.getImageData(0, 0, width, height).data;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const visible = pixels[index + 3] > 40;
      const darkEnough = Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) < 225;
      if (visible && darkEnough) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < left) return source;
  const padding = Math.max(3, Math.round(Math.max(right - left, bottom - top) * 0.04));
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);

  const trimmed = document.createElement("canvas");
  trimmed.width = right - left + 1;
  trimmed.height = bottom - top + 1;
  trimmed
    .getContext("2d")
    ?.drawImage(
      source,
      left,
      top,
      trimmed.width,
      trimmed.height,
      0,
      0,
      trimmed.width,
      trimmed.height,
    );
  return trimmed;
}

async function decodeImage(file: File) {
  const bitmap = await createImageBitmap(file);
  if (
    bitmap.width > MAX_EDGE ||
    bitmap.height > MAX_EDGE ||
    bitmap.width * bitmap.height > MAX_PIXELS
  ) {
    bitmap.close();
    throw new Error("Choose an image under 8,000 pixels on each side and 16 million pixels in total.");
  }
  return bitmap;
}

export async function processImage(options: ProcessImageOptions): Promise<ProcessedImage> {
  const bitmap = await decodeImage(options.file);
  let source = document.createElement("canvas");
  source.width = bitmap.width;
  source.height = bitmap.height;
  source.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();

  if (options.trimSignature) source = trimWhiteSpace(source);

  const requested = outputDimensions(source.width, source.height, options.width, options.height);
  const maxBytes = options.maxKb === null ? null : options.maxKb * 1000;
  let outputWidth = requested.width;
  let outputHeight = requested.height;
  const output = document.createElement("canvas");

  const encode = async (width: number, height: number, quality: number) => {
    output.width = width;
    output.height = height;
    const context = output.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    context.clearRect(0, 0, width, height);
    if (options.format === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const placement = getPlacement(source.width, source.height, width, height, options.fit);
    context.drawImage(source, placement.x, placement.y, placement.width, placement.height);
    return canvasToBlob(output, options.format, quality);
  };

  let blob: Blob | null = null;
  for (let attempt = 0; attempt < 22; attempt += 1) {
    blob = await encode(outputWidth, outputHeight, 0.94);
    if (!maxBytes || blob.size <= maxBytes) break;

    if (options.format === "image/jpeg") {
      const lowest = await encode(outputWidth, outputHeight, 0.08);
      if (lowest.size <= maxBytes) {
        let best = lowest;
        let low = 0.08;
        let high = 0.94;
        for (let index = 0; index < 8; index += 1) {
          const quality = (low + high) / 2;
          const trial = await encode(outputWidth, outputHeight, quality);
          if (trial.size <= maxBytes) {
            best = trial;
            low = quality;
          } else {
            high = quality;
          }
        }
        blob = best;
        break;
      }
      blob = lowest;
    }

    if (requested.exact || (outputWidth === 1 && outputHeight === 1)) {
      throw new Error(
        "That file-size limit is too small for these exact dimensions. Increase the KB limit, reduce the dimensions, or use JPG.",
      );
    }

    const factor = Math.min(
      0.85,
      Math.max(0.35, Math.sqrt(maxBytes / blob.size) * 0.9),
    );
    outputWidth = Math.max(1, Math.floor(outputWidth * factor));
    outputHeight = Math.max(1, Math.round((requested.height * outputWidth) / requested.width));
  }

  if (!blob || (maxBytes && blob.size > maxBytes)) {
    throw new Error("That size is too small for this file. Try a larger KB limit or choose JPG.");
  }

  source.width = 1;
  source.height = 1;
  output.width = 1;
  output.height = 1;

  return {
    blob,
    width: outputWidth,
    height: outputHeight,
    extension: options.format === "image/png" ? "png" : "jpg",
    dimensionsReduced:
      outputWidth !== requested.width || outputHeight !== requested.height,
  };
}
