"use client";

import { ChangeEvent, DragEvent, FormEvent, useMemo, useRef, useState } from "react";
import { processImage, type ImageFit, type ImageFormat } from "@/lib/image-processing";

type ToolMode = "photo" | "signature" | "pdf";
type Stage = "choose" | "adjust" | "ready";

const TOOL_COPY: Record<
  ToolMode,
  { label: string; detail: string; title: string; description: string; defaultSize: string }
> = {
  photo: {
    label: "Photo",
    detail: "Resize or change format",
    title: "Let’s resize your photo.",
    description: "Start by choosing the photo you want to use.",
    defaultSize: "100",
  },
  signature: {
    label: "Signature",
    detail: "Get it ready for a form",
    title: "Let’s get your signature ready.",
    description: "Choose a clear photo or scan of your signature.",
    defaultSize: "20",
  },
  pdf: {
    label: "PDF",
    detail: "Try a smaller file",
    title: "Let’s try a smaller PDF.",
    description: "Choose your PDF. We’ll check if it can be made smaller.",
    defaultSize: "none",
  },
};

function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    photo: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
    signature: <><path d="M3 19c5-2 12-13 8-15-4-2-7 18 0 14 3-2 3-6 2-5-3 2-2 7 2 5l3-2 3 1"/><path d="M3 22h18"/></>,
    pdf: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 14h8M8 17h5"/></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 16v4h16v-4"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function humanSize(bytes: number) {
  return bytes < 1_000_000
    ? `${(bytes / 1000).toFixed(1)} KB`
    : `${(bytes / 1_000_000).toFixed(2)} MB`;
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "file";
}

export default function FileFitTool() {
  const [mode, setMode] = useState<ToolMode>("photo");
  const [stage, setStage] = useState<Stage>("choose");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileDimensions, setFileDimensions] = useState<{ width: number; height: number } | null>(null);
  const [targetSize, setTargetSize] = useState("100");
  const [customSize, setCustomSize] = useState("150");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [fit, setFit] = useState<ImageFit>("contain");
  const [format, setFormat] = useState<ImageFormat>("image/jpeg");
  const [trimSignature, setTrimSignature] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    url: string;
    name: string;
    before: number;
    after: number;
    meta: string;
    note: string;
    title: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const copy = TOOL_COPY[mode];
  const accept = mode === "pdf" ? "application/pdf,.pdf" : "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

  const selectedMaxKb = useMemo(() => {
    if (targetSize === "none") return null;
    return Number(targetSize === "custom" ? customSize : targetSize);
  }, [targetSize, customSize]);

  function clearResult() {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    if (file) setStage("adjust");
  }

  function reset(nextMode = mode) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setPreviewUrl(null);
    setFileDimensions(null);
    setResult(null);
    setError("");
    setStage("choose");
    setWidth("");
    setHeight("");
    setFit("contain");
    setFormat("image/jpeg");
    setTargetSize(TOOL_COPY[nextMode].defaultSize);
    setCustomSize("150");
    setTrimSignature(true);
    if (inputRef.current) inputRef.current.value = "";
  }

  function changeMode(nextMode: ToolMode) {
    if (busy || nextMode === mode) return;
    reset(nextMode);
    setMode(nextMode);
  }

  async function readImageDimensions(selected: File) {
    const bitmap = await createImageBitmap(selected);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  async function selectFile(selected?: File) {
    if (!selected || busy) return;
    setError("");
    if (!selected.size) return setError("That file is empty. Choose another file.");
    if (selected.size > 25_000_000) return setError("That file is over 25 MB. Choose a smaller file.");

    const isPdf = selected.type === "application/pdf" || /\.pdf$/i.test(selected.name);
    if (mode === "pdf" && !isPdf) return setError("Choose a PDF, or select Photo for an image.");
    if (mode !== "pdf" && !["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      return setError("Choose a JPG, PNG or WebP image.");
    }

    setBusy(true);
    try {
      let nextPreview: string | null = null;
      let dimensions: { width: number; height: number } | null = null;
      if (mode !== "pdf") {
        dimensions = await readImageDimensions(selected);
        if (dimensions.width > 8000 || dimensions.height > 8000 || dimensions.width * dimensions.height > 16_000_000) {
          throw new Error("Choose an image under 8,000 pixels on each side and 16 million pixels in total.");
        }
        nextPreview = URL.createObjectURL(selected);
      } else {
        const header = new TextDecoder().decode(await selected.slice(0, 1024).arrayBuffer());
        if (!header.includes("%PDF-")) throw new Error("This file does not look like a readable PDF.");
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (result?.url) URL.revokeObjectURL(result.url);
      setFile(selected);
      setPreviewUrl(nextPreview);
      setFileDimensions(dimensions);
      setResult(null);
      setStage("adjust");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "We could not open that file.");
    } finally {
      setBusy(false);
    }
  }

  function openPicker() {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  }

  async function processPdf(selected: File) {
    const { PDFDocument } = await import("pdf-lib");
    let document;
    try {
      document = await PDFDocument.load(await selected.arrayBuffer(), { updateMetadata: false });
    } catch (problem) {
      if (/encrypt|password/i.test(String(problem))) {
        throw new Error("This PDF is password-protected. Save an unlocked copy and try again.");
      }
      throw new Error("We could not read this PDF. Export a fresh copy from the app that created it.");
    }
    const bytes = await document.save({ useObjectStreams: true, addDefaultPage: false });
    const smaller = bytes.length < selected.size;
    return {
      blob: smaller ? new Blob([Uint8Array.from(bytes).buffer], { type: "application/pdf" }) : selected,
      title: smaller ? "Your smaller PDF is ready." : "Your PDF is already compact.",
      meta: `${document.getPageCount()} page${document.getPageCount() === 1 ? "" : "s"} · PDF`,
      note: smaller
        ? "The PDF structure was optimised without lowering image quality. Check it before submitting."
        : "We could not reduce it without changing its content, so the download keeps your original file.",
      extension: "pdf",
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    clearResult();
    setError("");
    setBusy(true);

    try {
      if (selectedMaxKb !== null && (!Number.isFinite(selectedMaxKb) || selectedMaxKb < 1 || selectedMaxKb > 25_000)) {
        throw new Error("Enter a maximum size between 1 and 25,000 KB.");
      }

      let blob: Blob;
      let title: string;
      let meta: string;
      let note: string;
      let extension: string;

      if (mode === "pdf") {
        const pdf = await processPdf(file);
        ({ blob, title, meta, note, extension } = pdf);
      } else {
        const image = await processImage({
          file,
          maxKb: selectedMaxKb,
          width: width.trim() ? Number(width) : null,
          height: height.trim() ? Number(height) : null,
          fit,
          format,
          trimSignature: mode === "signature" && trimSignature,
        });
        blob = image.blob;
        title = "Your file is ready.";
        meta = `${image.width} × ${image.height} pixels · ${image.extension.toUpperCase()}`;
        note = `${selectedMaxKb ? `Fits your ${selectedMaxKb} KB limit. ` : ""}${image.dimensionsReduced ? "Pixel dimensions were reduced to meet the limit. " : ""}Check the downloaded file before submitting it.`;
        extension = image.extension;
      }

      const url = URL.createObjectURL(blob);
      setResult({
        url,
        name: `${baseName(file.name)}-filefit.${extension}`,
        before: file.size,
        after: blob.size,
        meta,
        note,
        title,
      });
      setStage("ready");
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong. Try another file.");
    } finally {
      setBusy(false);
    }
  }

  function handleDrag(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.type === "dragenter" || event.type === "dragover") setDragging(true);
    if (event.type === "dragleave" || event.type === "drop") setDragging(false);
    if (event.type === "drop") {
      if (event.dataTransfer.files.length > 1) setError("Choose one file at a time.");
      else void selectFile(event.dataTransfer.files[0]);
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    void selectFile(event.target.files?.[0]);
  }

  return (
    <section className="workspace" aria-label="File preparation tool">
      <aside className="tool-sidebar">
        <p className="section-label">WHAT DO YOU NEED?</p>
        <div className="tool-list" role="group" aria-label="Choose a file tool">
          {(Object.keys(TOOL_COPY) as ToolMode[]).map((tool) => (
            <button key={tool} className={`tool-choice ${tool === mode ? "active" : ""}`} type="button" onClick={() => changeMode(tool)} aria-pressed={tool === mode} disabled={busy}>
              <span className="tool-choice-icon"><Icon name={tool} /></span>
              <span><strong>{TOOL_COPY[tool].label}</strong><small>{TOOL_COPY[tool].detail}</small></span>
              {tool === mode && <span className="selected-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
        <div className="privacy-note">
          <Icon name="shield" size={20} />
          <div><strong>Your files stay yours.</strong><p>Everything happens on your device. Files are never uploaded.</p></div>
        </div>
      </aside>

      <div className="tool-main">
        <ol className="progress-steps" aria-label="Your progress">
          {["Choose file", "Adjust size", "Download"].map((label, index) => {
            const number = index + 1;
            const current = stage === "choose" ? 1 : stage === "adjust" ? 2 : 3;
            return <li key={label} className={number === current ? "current" : number < current ? "done" : ""} aria-current={number === current ? "step" : undefined}><span>{number < current ? "✓" : number}</span>{label}</li>;
          })}
        </ol>

        <div className="tool-heading">
          <div><h2>{copy.title}</h2><p>{copy.description}</p></div>
          <span className="free-badge">100% free</span>
        </div>

        {stage === "choose" && (
          <div className={`drop-zone ${dragging ? "dragging" : ""}`} onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrag}>
            <span className="upload-icon"><Icon name="upload" size={28} /></span>
            <h3>Choose your {copy.label.toLowerCase()}</h3>
            <p>or drag and drop it here</p>
            <button type="button" className="primary-button choose-button" onClick={openPicker} disabled={busy}><Icon name="upload" size={20} />{busy ? "Opening file…" : `Choose ${copy.label.toLowerCase()}`}</button>
            <small>{mode === "pdf" ? "PDF files" : "JPG, PNG or WebP"} · Up to 25 MB</small>
          </div>
        )}

        <input ref={inputRef} className="visually-hidden" type="file" accept={accept} onChange={handleInput} />

        {stage !== "choose" && file && (
          <>
            <div className="selected-file">
              <div className="file-preview">
                {/* Object URLs are local, so Next image optimisation does not apply. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {previewUrl ? <img src={previewUrl} alt="Preview of your selected file" /> : <Icon name="pdf" size={34} />}
              </div>
              <div className="file-copy"><strong>{file.name}</strong><p>{humanSize(file.size)}{fileDimensions ? ` · ${fileDimensions.width} × ${fileDimensions.height} pixels` : " · PDF document"}</p></div>
              <button type="button" className="text-button" onClick={openPicker} disabled={busy}>Change file</button>
            </div>

            {stage === "adjust" && (
              <form className="settings-form" onSubmit={handleSubmit} onChange={clearResult}>
                {mode === "pdf" ? (
                  <div className="pdf-message"><h3>Smaller, when possible. Same pages.</h3><p>FileFit will optimise the PDF structure without lowering image quality. Some PDFs are already compact, so their size may stay the same.</p><p>Password-protected PDFs need an unlocked copy first.</p></div>
                ) : (
                  <>
                    <fieldset className="size-fieldset">
                      <legend>How small does it need to be?</legend>
                      <p className="field-help">Choose the maximum file size allowed by your form.</p>
                      <div className="size-options">
                        {["20", "50", "100", "200", "custom", "none"].map((size) => (
                          <label key={size}><input type="radio" name="targetSize" value={size} checked={targetSize === size} onChange={() => setTargetSize(size)} /><span>{size === "custom" ? "Other size" : size === "none" ? "No limit" : `${size} KB`}</span></label>
                        ))}
                      </div>
                      {targetSize === "custom" && <label className="custom-size">Maximum size in KB<input type="number" min="1" max="25000" inputMode="numeric" value={customSize} onChange={(event) => setCustomSize(event.target.value)} required /></label>}
                    </fieldset>

                    {mode === "signature" && <label className="trim-option"><input type="checkbox" checked={trimSignature} onChange={(event) => setTrimSignature(event.target.checked)} />Remove empty white space around my signature</label>}

                    <details className="advanced-options">
                      <summary>Need exact dimensions or a different format?</summary>
                      <div className="advanced-grid">
                        <label>Width (pixels)<input type="number" min="1" max="8000" inputMode="numeric" placeholder="Keep original" value={width} onChange={(event) => setWidth(event.target.value)} /></label>
                        <label>Height (pixels)<input type="number" min="1" max="8000" inputMode="numeric" placeholder="Keep original" value={height} onChange={(event) => setHeight(event.target.value)} /></label>
                        <label>Fit the image<select value={fit} onChange={(event) => setFit(event.target.value as ImageFit)}><option value="contain">Keep the whole image</option><option value="cover">Crop from the centre</option></select></label>
                        <label>Save as<select value={format} onChange={(event) => setFormat(event.target.value as ImageFormat)}><option value="image/jpeg">JPG — smaller file</option><option value="image/png">PNG — transparent background</option></select></label>
                      </div>
                      <p className="field-help">Leave dimensions blank to keep the proportions. With two dimensions, “Keep the whole image” adds space instead of cutting anything off.</p>
                    </details>
                  </>
                )}

                <button className="primary-button process-button" type="submit" disabled={busy}>{busy ? "Working on your file…" : mode === "pdf" ? "Make my PDF smaller" : `Make my ${copy.label.toLowerCase()} fit`}<Icon name="arrow" size={20} /></button>
              </form>
            )}
          </>
        )}

        {error && <div className="error-message" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Close error"><Icon name="close" size={18} /></button></div>}

        {stage === "ready" && result && (
          <div className="result-card" ref={resultRef} tabIndex={-1}>
            <div className="result-heading"><span><Icon name="check" /></span><div><h3>{result.title}</h3><p>{humanSize(result.before)} → {humanSize(result.after)} · {result.meta}</p></div></div>
            <p>{result.note}</p>
            <a className="primary-button download-button" href={result.url} download={result.name}><Icon name="download" size={20} />Download file</a>
            <button className="text-button another-button" type="button" onClick={() => reset()}>Choose another file</button>
          </div>
        )}

        <div className="trust-row"><span><Icon name="check" size={16} />No sign-up</span><span><Icon name="check" size={16} />No watermarks</span><span><Icon name="shield" size={16} />Private by design</span></div>
      </div>
    </section>
  );
}
