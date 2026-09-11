import FileFitTool from "@/components/filefit-tool";

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="FileFit home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 15V7h8M25 17v8h-8M10 16l4 4 8-10" />
        </svg>
      </span>
      FileFit<span>.</span>
    </a>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#file-tool">Skip to file tools</a>
      <header className="site-header" id="top">
        <Brand />
        <a className="how-link" href="#how-it-works">How it works <span aria-hidden="true">↗</span></a>
      </header>

      <main>
        <section className="intro" aria-labelledby="main-title">
          <p className="eyebrow">LESS FUSS. FILES THAT FIT.</p>
          <h1 id="main-title">The right file.<br className="mobile-break" /> Ready in seconds.</h1>
          <p>Make your photo, signature or PDF the size you need.</p>
        </section>

        <div id="file-tool"><FileFitTool /></div>

        <section className="how-section" id="how-it-works">
          <div className="how-heading"><p className="eyebrow">THAT’S ALL THERE IS TO IT</p><h2>Three steps. One less worry.</h2></div>
          <div className="how-grid">
            <article><span>01</span><h3>Choose your file</h3><p>A photo, your signature, or a PDF. Pick it from your phone or computer.</p></article>
            <article><span>02</span><h3>Tell us what fits</h3><p>Choose a file size. Add exact dimensions only if your form asks for them.</p></article>
            <article><span>03</span><h3>Save it. You’re done.</h3><p>Download your new file. Your original stays exactly as it was.</p></article>
          </div>
        </section>

        <section className="questions" aria-label="Common questions">
          <details><summary>Where do I find the right size?</summary><p>Look beside the upload button on the form you’re filling in. It may say “under 50 KB” or “200 × 230 pixels.” Choose that size here. FileFit checks the settings you enter; the organisation decides whether the image meets its other requirements.</p></details>
          <details><summary>Will my photo still look clear?</summary><p>We keep as much detail as the file-size limit allows. Very small limits can soften an image. Always check your downloaded file before submitting it.</p></details>
          <details><summary>Where is my downloaded file?</summary><p>Look in your device’s Downloads folder or your browser’s download list. FileFit adds “-filefit” to the name so you can tell it apart from the original.</p></details>
        </section>
      </main>

      <footer className="site-footer"><Brand /><span>A little help for your everyday files.</span><span>Free. Simple. Yours.</span></footer>
    </>
  );
}
