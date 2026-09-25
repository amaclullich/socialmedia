#!/usr/bin/env node
// Render every .card in one or more post HTML files to PNG at 2x, and run layout checks.
// Usage: node render.js <file.html> [more.html ...]     (writes to ../png/, text to ../png/text/)
//        node render.js --all                           (every ../src/G*.html)
// Prints a JSON report per file. Exit code 0 even when checks fail; read the report.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DS = __dirname;
const SRC = path.join(DS, '..', 'src');
const OUT = path.join(DS, '..', 'png');
const TXT = path.join(OUT, 'text');
const MAX_BYTES = 1900000;
const EXEC = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;

async function renderFile(browser, file) {
  const id = path.basename(file, '.html');
  const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(file), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => window.__ready !== false, null, { timeout: 15000 }).catch(() => errors.push('window.__ready stayed false'));
  await page.waitForTimeout(150);

  const checks = await page.evaluate(() => {
    const out = { fonts: { montserrat800: document.fonts.check('800 40px Montserrat'), inter400: document.fonts.check('400 40px Inter') }, cards: [] };
    const cards = [...document.querySelectorAll('.card')];
    cards.forEach((card, i) => {
      const cr = card.getBoundingClientRect();
      const problems = [];
      card.querySelectorAll('*').forEach(el => {
        if (el.closest('.bleed')) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        const tag = el.tagName.toLowerCase();
        if (['tspan'].includes(tag)) return;
        if (r.right > cr.right + 1 || r.bottom > cr.bottom + 1 || r.left < cr.left - 1 || r.top < cr.top - 1) {
          problems.push(`outside card: <${tag} class="${el.getAttribute('class') || ''}"> ${Math.round(r.left - cr.left)},${Math.round(r.top - cr.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        const cs = getComputedStyle(el);
        if ((cs.overflow === 'hidden' || cs.overflowY === 'hidden') && !el.classList.contains('card') && !el.classList.contains('art') && !el.classList.contains('scene') && !el.classList.contains('panelbox')) {
          if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) problems.push(`clipped content in <${tag} class="${el.getAttribute('class') || ''}">`);
        }
        const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length);
        if (hasText) {
          const fs = parseFloat(cs.fontSize);
          if (fs < 22 && tag !== 'text') problems.push(`small text ${fs}px: "${el.textContent.trim().slice(0, 40)}"`);
        }
      });
      // text inside SVG
      card.querySelectorAll('svg text').forEach(t => {
        const fs = parseFloat(getComputedStyle(t).fontSize);
        const scale = t.getScreenCTM() ? t.getScreenCTM().a : 1;
        if (fs * scale < 20) problems.push(`small svg text ${(fs * scale).toFixed(1)}px: "${t.textContent.trim().slice(0, 40)}"`);
        const r = t.getBoundingClientRect();
        if (r.right > cr.right + 1 || r.bottom > cr.bottom + 1 || r.left < cr.left - 1 || r.top < cr.top - 1) problems.push(`svg text outside card: "${t.textContent.trim().slice(0, 40)}"`);
        const svgEl = t.ownerSVGElement; if (svgEl) { const sr = svgEl.getBoundingClientRect(); if (r.left < sr.left - 1 || r.right > sr.right + 1 || r.top < sr.top - 1 || r.bottom > sr.bottom + 1) problems.push(`svg text clipped by its svg: "${t.textContent.trim().slice(0, 40)}"`); }
      });
      const content = card.querySelector('.content');
      if (content && content.scrollHeight > content.clientHeight + 2) problems.push(`content overflows by ${content.scrollHeight - content.clientHeight}px`);
      const text = card.innerText + '\n' + [...card.querySelectorAll('svg text')].map(t => t.textContent).join('\n');
      const bad = [];
      if (/[—–]/.test(text)) bad.push('em or en dash');
      if (/!/.test(text)) bad.push('exclamation mark');
      if (/ - /.test(text)) bad.push('spaced hyphen');
      out.cards.push({ index: i + 1, id: card.id || null, problems, bad_chars: bad, text });
    });
    return out;
  });

  const cards = await page.$$('.card');
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(TXT, { recursive: true });
  const files = [];
  for (let i = 0; i < cards.length; i++) {
    const name = cards.length === 1 ? `${id}.png` : `${id}_${i + 1}.png`;
    const p = path.join(OUT, name);
    await cards[i].screenshot({ path: p, type: 'png' });
    const bytes = fs.statSync(p).size;
    const rec = { file: name, bytes };
    if (bytes > MAX_BYTES) {
      const jp = p.replace(/\.png$/, '.jpg');
      await cards[i].screenshot({ path: jp, type: 'jpeg', quality: 92 });
      rec.jpeg = path.basename(jp); rec.jpeg_bytes = fs.statSync(jp).size;
    }
    files.push(rec);
  }
  fs.writeFileSync(path.join(TXT, `${id}.txt`), checks.cards.map(c => `--- card ${c.index} ---\n${c.text.trim()}`).join('\n\n') + '\n');
  await page.close();
  const problems = checks.cards.flatMap(c => c.problems.map(p => `card ${c.index}: ${p}`).concat(c.bad_chars.map(b => `card ${c.index}: ${b}`)));
  if (!checks.fonts.montserrat800 || !checks.fonts.inter400) problems.push('web fonts not loaded');
  return { id, cards: cards.length, files, errors, problems, ok: problems.length === 0 && errors.length === 0 };
}

(async () => {
  let files = process.argv.slice(2);
  if (files[0] === '--all') files = fs.readdirSync(SRC).filter(f => /^G\d{3}\.html$/.test(f)).sort().map(f => path.join(SRC, f));
  if (!files.length) { console.error('usage: node render.js <file.html> | --all'); process.exit(2); }
  const browser = await chromium.launch({ executablePath: EXEC });
  const reports = [];
  for (const f of files) {
    try { reports.push(await renderFile(browser, f)); }
    catch (e) { reports.push({ id: path.basename(f, '.html'), ok: false, errors: [String(e)] }); }
  }
  await browser.close();
  console.log(JSON.stringify(reports, null, 1));
})();
