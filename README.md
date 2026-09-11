# FileFit

FileFit is a simple, privacy-first website for preparing photos, signatures and PDFs for online forms.

## Current tools

- Photo resizing by file-size limit and optional exact dimensions
- Signature resizing with optional white-space trimming
- PDF structural optimisation
- JPG and PNG output
- All file processing runs inside the visitor's browser

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Main files

- `src/app/page.tsx` — page content
- `src/app/globals.css` — complete design and responsive styling
- `src/components/filefit-tool.tsx` — tool interface and PDF processing
- `src/lib/image-processing.ts` — image resizing and compression

Run `npm run build` before pushing changes. Vercel deploys updates from the `main` branch.
