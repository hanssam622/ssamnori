const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'programs', 'ieon-guides');
const outputPath = path.join(root, 'programs', 'ieon.html');
const sources = [
  ['quick', '이어온-빠른-시작.html'],
  ['manual', '이어온-사용설명서.html'],
  ['classroom', '이어온-수업자료-안내.html'],
];

const documents = Object.fromEntries(sources.map(([id, filename]) => {
  let html = fs.readFileSync(path.join(sourceDir, filename), 'utf8');
  if (id === 'quick') {
    html = html
      .replace('https://claude.ai/artifact/RGmRjoBYH3jqXnGE2sT7kc', '#guide=manual')
      .replace('https://claude.ai/artifact/7jkcum8Q5UWqsd8GRfzvi5', '#guide=classroom');
  }
  const encoded = Buffer.from(html).toString('base64');
  return [id, encoded.match(/.{1,1200}/g).join('\n')];
}));
const tick = String.fromCharCode(96);

const page = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>이어온 설명서 | 쌤노리</title>
  <link rel="icon" href="../assets/ssamnori-logo.png">
  <style>
    :root { color-scheme: dark; font-family: "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #101722; color: #f1f5f9; }
    a { color: inherit; }
    .site-header { background: #10141c; border-bottom: 1px solid #303b4d; }
    .site-header-inner { align-items: center; display: flex; justify-content: space-between; gap: 1rem; margin: auto; max-width: 1160px; min-height: 72px; padding: .75rem 1.5rem; }
    .brand img { display: block; height: 40px; max-width: 145px; object-fit: contain; }
    .back { font-size: .9rem; font-weight: 700; text-decoration: none; }
    .back:hover { text-decoration: underline; }
    .guide-header { align-items: center; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin: auto; max-width: 1160px; padding: 2rem 1.5rem 1.25rem; }
    .guide-header h1 { font-size: clamp(1.55rem, 4vw, 2.25rem); margin: 0; }
    .download { background: #ff861c; border-radius: 6px; color: #182036; display: inline-flex; font-size: .94rem; font-weight: 800; padding: .7rem 1rem; text-decoration: none; }
    .download:hover { background: #ffa046; }
    .guide-tabs { border-bottom: 1px solid #445067; display: flex; gap: .25rem; margin: auto; max-width: 1112px; overflow-x: auto; padding: 0 .25rem; }
    .guide-tab { background: transparent; border: 0; border-bottom: 3px solid transparent; color: #b8c5d7; cursor: pointer; flex: 0 0 auto; font: inherit; font-size: .92rem; font-weight: 700; padding: .85rem 1rem; }
    .guide-tab[aria-selected="true"] { border-bottom-color: #7fa7ff; color: #fff; }
    .guide-tab:hover { color: #fff; }
    .guide-tab:focus-visible, .download:focus-visible, .back:focus-visible { outline: 3px solid #7fa7ff; outline-offset: 3px; }
    .guide-panel { background: #f4f6fa; margin: auto; max-width: 1160px; min-height: 70vh; }
    .guide-panel[hidden] { display: none; }
    .guide-panel iframe { border: 0; display: block; min-height: 70vh; width: 100%; }
    @media (prefers-color-scheme: light) {
      :root { color-scheme: light; }
      body { background: #f4f6fa; color: #172033; }
      .site-header { background: #fff; border-bottom-color: #dbe1ec; }
      .guide-tabs { border-bottom-color: #cbd5e1; }
      .guide-tab { color: #526079; }
      .guide-tab[aria-selected="true"], .guide-tab:hover { color: #164bb1; }
    }
    @media (max-width: 600px) {
      .site-header-inner { min-height: 62px; }
      .brand img { height: 34px; }
      .guide-header { padding-top: 1.4rem; }
      .guide-tab { font-size: .84rem; padding: .75rem .7rem; }
    }
  </style>
  <script src="../analytics.js?v=20260923" defer></script>
</head>
<body>
  <header class="site-header">
    <div class="site-header-inner">
      <a class="brand" href="../index.html" aria-label="쌤노리 홈"><img src="../assets/ssamnori-logo.png" alt="쌤노리"></a>
      <a class="back" href="../index.html">← 목록으로</a>
    </div>
  </header>
  <main>
    <div class="guide-header">
      <h1>이어온 설명서</h1>
      <a class="download btn-download-game" href="https://drive.google.com/uc?export=download&amp;id=17W3fU3Qi5Xg4CSls25aVS_kIwavPYuB_">이어온 다운로드</a>
    </div>
    <nav class="guide-tabs" role="tablist" aria-label="이어온 설명서 목차">
      <button class="guide-tab" type="button" role="tab" id="tab-quick" aria-controls="panel-quick" aria-selected="true" tabindex="0" data-guide="quick">빠른 시작</button>
      <button class="guide-tab" type="button" role="tab" id="tab-manual" aria-controls="panel-manual" aria-selected="false" tabindex="-1" data-guide="manual">사용 설명서</button>
      <button class="guide-tab" type="button" role="tab" id="tab-classroom" aria-controls="panel-classroom" aria-selected="false" tabindex="-1" data-guide="classroom">수업자료 활용 안내</button>
    </nav>
    <section class="guide-panel" id="panel-quick" role="tabpanel" aria-labelledby="tab-quick"><iframe title="이어온 빠른 시작" data-guide="quick"></iframe></section>
    <section class="guide-panel" id="panel-manual" role="tabpanel" aria-labelledby="tab-manual" hidden><iframe title="이어온 사용 설명서" data-guide="manual"></iframe></section>
    <section class="guide-panel" id="panel-classroom" role="tabpanel" aria-labelledby="tab-classroom" hidden><iframe title="이어온 수업자료 활용 안내" data-guide="classroom"></iframe></section>
  </main>
  <script>
    const guideDocuments = {
${Object.entries(documents).map(([id, encoded]) => `      ${id}: ${tick}${encoded}${tick}`).join(',\n')}
    };
    const tabs = [...document.querySelectorAll('.guide-tab')];
    const panels = [...document.querySelectorAll('.guide-panel')];
    const frameFor = (id) => document.querySelector('iframe[data-guide="' + id + '"]');

    function resizeFrame(frame) {
      const doc = frame.contentDocument;
      if (!doc) return;
      frame.style.height = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight) + 'px';
    }

    function selectGuide(id, updateUrl = true) {
      if (!guideDocuments[id]) id = 'quick';
      for (const tab of tabs) {
        const selected = tab.dataset.guide === id;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      }
      for (const panel of panels) panel.hidden = panel.id !== 'panel-' + id;
      if (updateUrl) history.replaceState(null, '', '#' + id);
      requestAnimationFrame(() => resizeFrame(frameFor(id)));
    }

    for (const tab of tabs) {
      tab.addEventListener('click', () => selectGuide(tab.dataset.guide));
      tab.addEventListener('keydown', (event) => {
        const index = tabs.indexOf(tab);
        const next = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length]
          : event.key === 'ArrowLeft' ? tabs[(index + tabs.length - 1) % tabs.length]
          : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : null;
        if (!next) return;
        event.preventDefault();
        next.focus();
        selectGuide(next.dataset.guide);
      });
    }

    for (const frame of document.querySelectorAll('.guide-panel iframe')) {
      frame.addEventListener('load', () => {
        const doc = frame.contentDocument;
        if (!doc) return;
        doc.addEventListener('click', (event) => {
          const link = event.target.closest('a[href^="#guide="]');
          if (!link) return;
          event.preventDefault();
          selectGuide(link.getAttribute('href').slice(7));
          document.querySelector('.guide-tabs').scrollIntoView({ block: 'start' });
        });
        const observer = new ResizeObserver(() => resizeFrame(frame));
        observer.observe(doc.body);
        resizeFrame(frame);
      });
      const encoded = guideDocuments[frame.dataset.guide].replace(/\\s/g, '');
      frame.srcdoc = new TextDecoder().decode(Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)));
    }

    selectGuide(location.hash.slice(1), false);
    window.addEventListener('hashchange', () => selectGuide(location.hash.slice(1), false));
  </script>
</body>
</html>
`;

fs.writeFileSync(outputPath, page);
