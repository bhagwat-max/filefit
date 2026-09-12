# FileFit — Handoff Notes

Last updated: 2026-09-12

## What FileFit is

A privacy-first file-prep tool (Next.js 16 + React 19, App Router, TypeScript).
Everything runs **client-side in the browser** — no file is ever uploaded to a
server. Three original modes: **Photo** (resize/compress), **Signature**
(compress + trim whitespace), **PDF** (compress an existing PDF).

Live: https://filefit-mu.vercel.app/
Repo: https://github.com/bhagwat-max/filefit (branch: `main`, auto-deploys to Vercel on push)

## What changed in this session

1. **WebP as an output format** (previously only JPG/PNG)
   - `src/lib/image-processing.ts`: `ImageFormat` now includes `"image/webp"`.
     WebP uses the same quality binary-search loop as JPEG to hit a target KB
     size, and — like PNG — skips the white-background flatten step since
     WebP supports transparency.
2. **Format picker made visible** (was hidden inside a collapsed
   "Need exact dimensions or a different format?" `<details>` block, which
   almost nobody would click)
   - `src/components/filefit-tool.tsx`: format choice (JPG/PNG/WebP) is now
     its own visible radio-button fieldset, right after the KB-size picker.
     The collapsed `<details>` section now only holds width/height/crop-fit,
     and its label changed to "Need exact dimensions?".
3. **New mode: Image → PDF**
   - New file `src/lib/pdf-processing.ts` — uses the already-installed
     `pdf-lib` package to embed a normalized JPEG into a new one-page PDF.
     Two page-size options: "Fit to A4 page" (centered, with margin) or
     "Match photo size" (page dimensions = photo dimensions, pixels
     converted to points at 96 DPI).
   - `src/components/filefit-tool.tsx`: added `"imageToPdf"` to the
     `ToolMode` union, a 4th sidebar entry, a new icon, and a dedicated
     branch in the adjust-step form and the submit handler.

All three changes: `npx tsc --noEmit` and `npx next build` both pass clean.
(One pre-existing, unrelated TS error in `src/app/layout.tsx` re: `LayoutProps`
— not touched, not caused by this session.)

## Current state / where things stand

- Not yet manually tested by the site owner in a real browser for the
  Image → PDF feature specifically (WebP export and the visible format
  picker have been tested locally and work). **Next step: verify Image → PDF
  in the browser before/after pushing.**
- Not yet pushed to GitHub as of this note — see git status below.

```
$ git status
modified:   src/components/filefit-tool.tsx
modified:   src/lib/image-processing.ts
new file:   src/lib/pdf-processing.ts   (untracked until committed)
```

## Known limitations / things intentionally NOT built yet

- **"PNG/WebP — transparent background" is misleading as worded.** These
  formats only *preserve* existing transparency in the source file — they
  don't remove a background automatically. Real background removal would
  need an ML/segmentation step (discussed: `@imgly/background-removal` or
  similar, to keep everything client-side and preserve the privacy pitch).
  Not implemented. Label could be clarified independently of that bigger
  feature.
- **PDF → image** (the reverse of what was just built) was explicitly
  deferred. Would need a new dependency (`pdfjs-dist`) to rasterize PDF
  pages onto canvas, and a UX decision on multi-page PDFs (all pages? first
  page only? zip of images?). Heavier lift than image → PDF was.
- **Batch upload** (multiple files at once) not built.
- **Passport/exam-photo presets** (India-specific size + dimension combos,
  e.g. "200×230px under 20KB") not built — flagged earlier as a likely
  strong, low-effort differentiator since it maps directly to why people
  search for a tool like this.

## Suggested next priorities (in rough order of value vs. effort)

1. Manually verify Image → PDF in-browser, then push + confirm Vercel deploy.
2. Passport/exam-photo presets — reuses all existing `processImage` logic,
   just adds preset buttons that set width/height/maxKb together.
3. Batch upload — biggest UX lift for "make work so easy" but touches the
   whole file-selection/state model (currently single-file only).
4. Fix or reword the "transparent background" labels so they don't overpromise.
5. PDF → image (bigger lift, needs `pdfjs-dist`).
6. Real background removal (bigger lift, needs an ML dependency).

## How to run this project locally

```
git clone https://github.com/bhagwat-max/filefit.git
cd filefit
npm install
npm run dev
```
Open http://localhost:3000 (or whatever port the terminal prints, if 3000
is already in use by another running instance).

## Architecture quick-reference

- `src/components/filefit-tool.tsx` — the entire UI: mode switcher, file
  picker, per-mode settings form, result screen. All state lives here via
  `useState` (no external state library).
- `src/lib/image-processing.ts` — pure functions, no React. Decodes an
  image via `createImageBitmap`, draws to canvas, and iteratively adjusts
  quality/dimensions to hit a target KB size.
- `src/lib/pdf-processing.ts` — pure functions, no React. Wraps `pdf-lib`
  to embed a normalized JPEG into a new PDF page.
- `src/lib/requirement-parser.ts` — not touched this session; not yet
  reviewed for how it relates to the above (worth checking before building
  the preset feature, in case there's overlap).
