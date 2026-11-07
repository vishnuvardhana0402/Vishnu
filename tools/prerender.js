/* Prerender: writes the link-preview tags into index.html and a real HTML page for every route, so LinkedIn,
   WhatsApp, Slack, X and search crawlers (which do not run JavaScript) get a title, a description, an image and the
   page's words.

   Run it after any change to the case studies:
     1. serve the folder that holds this repo as /vishnuvardhana0402/Vishnu/preview-2/ (for example: mkdir -p /tmp/srv && ln -s "$PWD" /tmp/srv/Vishnu
        && cd /tmp/srv && python3 -m http.server 8770)
     2. node tools/prerender.js http://127.0.0.1:8770/vishnuvardhana0402/Vishnu/preview-2/
   It needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium). */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const SITE = 'https://vishnuvardhana0402.github.io/vishnuvardhana0402/Vishnu/preview-2/';
const NAME = 'Vishnuvardhana Chary Sriramoju';
const ROOT = path.resolve(__dirname, '..');
const ROUTES = [
  { hash: '#/', path: '', title: `${NAME} | Product Designer`, image: 'og/home.jpg',
    desc: 'Vishnuvardhana Chary Sriramoju - Product Designer, Hyderabad. I design AI-native products: agents, prediction, voice and the workflows between them. Case study: VE.AI (AI browser).' },
  { hash: '#/case', path: 'case/ve-browser/', title: `Ve Browser: an AI browser that stays one step ahead | ${NAME}`, image: 'og/ve-browser.jpg',
    desc: 'Case study: Ve Browser, a proactive AI that sees your whole working day, works out what comes next and has it ready, from the Dynamic Notch to the AI Browser. Designed from first idea to final screen.' },
  { hash: '#/more', path: 'more/', title: `More projects | ${NAME}`, image: 'og/more.jpg',
    desc: 'More projects by Vishnuvardhana Chary Sriramoju: Vijayeesam, WanderWise travel app, EduBridge dashboard and Tata Neu app redesign.' },
];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const meta = r => [
  `<meta name="description" content="${esc(r.desc)}">`,
  `<link rel="canonical" href="${SITE}${r.path}">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:site_name" content="${esc(NAME)}">`,
  `<meta property="og:title" content="${esc(r.title)}">`,
  `<meta property="og:description" content="${esc(r.desc)}">`,
  `<meta property="og:url" content="${SITE}${r.path}">`,
  `<meta property="og:image" content="${SITE}${r.image}">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta property="og:image:alt" content="${esc(r.title)}">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:title" content="${esc(r.title)}">`,
  `<meta name="twitter:description" content="${esc(r.desc)}">`,
  `<meta name="twitter:image" content="${SITE}${r.image}">`,
].join('\n');

// the words of one route, read from the running app
async function words(page, base, r) {
  await page.goto(base + 'index.html' + r.hash); await page.waitForTimeout(3500);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 700) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(25); }
  return page.evaluate(() => {
    const host = document.getElementById('yp-page'), out = [], seen = new Set();
    const clean = t => t.replace(/\s+/g, ' ').trim().replace(/(\S+?)\1{2,}/g, '$1');
    host.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,figcaption,[data-case],.tt-sr').forEach(e => {
      if (e.closest('#site-foot,#btt,footer.vnx,nav,[aria-hidden="true"]')) return;
      if (e.matches('[data-case]')) {   // a project card: its name as the link, its line beneath
        const rows = e.querySelectorAll('[data-case-text]'), name = clean((e.querySelector('.hcw') || {}).textContent || '');
        const line = rows[1] && rows[1].children[1] ? clean(rows[1].children[1].textContent) : '';
        if (name) { out.push(['h2', name]); out.push(['a', name, e.href]); if (line) out.push(['p', line]); }
        return; }
      if (e.closest('[data-case]') || e.querySelector('h1,h2,h3,h4,p,li')) return;
      const t = clean(e.getAttribute('aria-label') || e.innerText || e.textContent || '');
      const tag = e.tagName.toLowerCase();
      if (!t || seen.has(t)) return;
      if (e.classList.contains('tt-sr')) { seen.add(t); out.push(['p', t]); return; }   // a stat, e.g. "17 modules"
      if (!/^h\d$/.test(tag) && t.split(' ').length < 4) return;   // stray interface labels
      seen.add(t); out.push([tag, t]);
    });
    return out;
  });
}

function page(r, blocks, depth) {
  const up = '../'.repeat(depth);
  const body = blocks.map(([t, x, href]) => {
    if (t === 'a') { const u = new URL(href); const own = /^https?:\/\/(127\.|localhost)/.test(href);
      const rel = own ? up + u.pathname.replace(/^\/Vishnu\//, '') : href;
      return `<p><a href="${esc(rel)}"${own ? '' : ' target="_blank" rel="noopener"'}>${own ? 'View case' : /behance/.test(href) ? 'View case on Behance' : 'Visit site'}</a></p>`; }
    return `<${t}>${esc(x)}</${t}>`; }).join('\n');
  const others = ROUTES.filter(o => o.path && o !== r).map(o => `<li><a href="${up}${o.path}">${esc(o.title.split(' | ')[0])}</a></li>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400..700&display=swap">
<title>${esc(r.title)}</title>
${meta(r)}
<script>/* visitors with JavaScript get the full, animated page at once */
(function () { var b = location.pathname.replace(/index\\.html$/, "").replace(/(case\\/[^/]+|more)\\/?$/, ""), h = location.hash;
  location.replace(b + (/^#\\//.test(h) ? h : "${r.hash}")); })();</script>
<style>body{margin:0;background:#0d0d11;color:#e9e7e2;font:17px/1.6 'Google Sans',system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:48px 20px 80px}
a{color:#fff}h1{font-size:2.2em;line-height:1.15}h2{margin-top:2em}blockquote{margin:1.2em 0;font-size:1.2em;color:#fff}header,footer{font-size:15px;opacity:.85}</style>
</head>
<body>
<header><a href="${up}">${esc(NAME)}</a> · Product Designer, Hyderabad</header>
<main>
${body}
<h2>More case studies</h2>
<ul>${others}</ul>
</main>
<footer><a href="mailto:vishnuvardhana0402@gmail.com">Email</a> · <a href="${up}vishnuvardhan-sriramoju-resume.pdf" target="_blank" rel="noopener">Resume</a> · <a href="https://www.linkedin.com/in/vishnuvardhana0402" target="_blank" rel="noopener">LinkedIn</a></footer>
</body>
</html>
`;
}

(async () => {
  const base = process.argv[2] || 'http://127.0.0.1:8770/vishnuvardhana0402/Vishnu/preview-2/';
  // 1. the home page's tags
  const idx = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(idx, 'utf8');
  const block = `<!--OG start-->\n${meta(ROUTES[0])}\n<!--OG end-->`;
  html = /<!--OG start-->[\s\S]*?<!--OG end-->/.test(html) ? html.replace(/<!--OG start-->[\s\S]*?<!--OG end-->/, block) : html.replace('<!--OG-->', block);
  fs.writeFileSync(idx, html);
  // 2. one prerendered page per route
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const r of ROUTES.slice(1)) {
    let blocks = await words(pg, base, r);
    if (r.hash === '#/more') blocks = [['h1', 'More projects']].concat(blocks);
    const dir = path.join(ROOT, r.path); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), page(r, blocks, r.path.split('/').filter(Boolean).length));
    console.log(r.path, blocks.length, 'blocks');
  }
  await b.close();
  // 3. a 404 that sends unknown addresses home, and a sitemap
  fs.writeFileSync(path.join(ROOT, '404.html'), `<!doctype html><meta charset="utf-8"><title>${esc(NAME)}</title><meta name="robots" content="noindex">
<script>location.replace("/vishnuvardhana0402/Vishnu/preview-2/");</script><p><a href="/vishnuvardhana0402/Vishnu/preview-2/">Go to the portfolio</a></p>\n`);
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    ROUTES.map(r => `  <url><loc>${SITE}${r.path}</loc></url>`).join('\n') + `\n</urlset>\n`);
})();
