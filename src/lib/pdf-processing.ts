import { PDFDocument } from "pdf-lib";

export type PdfPageOption = "a4" | "match";

export type ImageToPdfOptions = {
  file: File;
  pageSize: PdfPageOption;
};

export type ImageToPdfResult = {
  blob: Blob;
  pageWidth: number;
  pageHeight: number;
};

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const PAGE_MARGIN_PT = 24;
const PIXELS_TO_POINTS = 72 / 96;

async function normalizeToJpeg(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not read this photo.");
  // Flatten onto white first: JPEG has no alpha channel, and pdf-lib needs a plain JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Your browser could not prepare this photo."))),
      "image/jpeg",
      0.92,
    );
  });

  return {
    bytes: await blob.arrayBuffer(),
    width: canvas.width,
    height: canvas.height,
  };
}

export async function convertImageToPdf(options: ImageToPdfOptions): Promise<ImageToPdfResult> {
  const { bytes, width, height } = await normalizeToJpeg(options.file);

  const pdfDoc = await PDFDocument.create();
  const image = await pdfDoc.embedJpg(bytes);

  let pageWidth: number;
  let pageHeight: number;
  let drawWidth: number;
  let drawHeight: number;
  let x: number;
  let y: number;

  if (options.pageSize === "match") {
    pageWidth = width * PIXELS_TO_POINTS;
    pageHeight = height * PIXELS_TO_POINTS;
    drawWidth = pageWidth;
    drawHeight = pageHeight;
    x = 0;
    y = 0;
  } else {
    pageWidth = A4_WIDTH_PT;
    pageHeight = A4_HEIGHT_PT;
    const availableWidth = pageWidth - PAGE_MARGIN_PT * 2;
    const availableHeight = pageHeight - PAGE_MARGIN_PT * 2;
    const scale = Math.min(availableWidth / width, availableHeight / height);
    drawWidth = width * scale;
    drawHeight = height * scale;
    x = (pageWidth - drawWidth) / 2;
    y = (pageHeight - drawHeight) / 2;
  }

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });

  const savedBytes = await pdfDoc.save();
  return {
    blob: new Blob([Uint8Array.from(savedBytes).buffer], { type: "application/pdf" }),
    pageWidth,
    pageHeight,
  };
}
