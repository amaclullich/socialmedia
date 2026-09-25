// Chart helpers for static social cards. Every chart must be drawn from verified data only.
// Marks follow the dataviz mark specs: bars <= 48px thick at this 2x-density layout
// (24px on a 540px-wide phone view), 4px rounded data end, square at the baseline,
// hairline recessive grid, direct labels, text in text tokens (never the series colour).
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const C = { ink: '#1F2A30', ink2: '#5F6B76', a: '#00909A', b: '#C24E12', empty: '#D5DEDD', grid: '#D9DEDC', ground: '#FBFAF6' };
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function txt(parent, x, y, s, o = {}) { const t = el('text', { x, y, 'font-size': o.size || 30, 'font-weight': o.weight || 500, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'dominant-baseline': o.baseline || 'alphabetic', 'font-family': o.font || 'Inter' }, parent); t.textContent = s; return t; }
  function barPath(x, y, w, h) { // rounded at the data end (right), square at baseline (left)
    const r = Math.min(8, w / 2, h / 2);
    if (w <= 0) return '';
    return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
  }

  // Horizontal bars. data: [{label, value, display, colour:'a'|'b'|'empty'}]; opts: {max, width, labelWidth, barH, gap, unit, ticks:[...]}
  window.barChart = function (target, data, opts = {}) {
    const W = opts.width || 920, LW = opts.labelWidth || 0, BH = opts.barH || 48, GAP = opts.gap || 70, top = opts.top || 10;
    const max = opts.max || Math.max(...data.map(d => d.value));
    const plotW = W - LW - (opts.valueRoom || 150);
    const labelAbove = LW === 0;
    const rowH = BH + (labelAbove ? 52 : 0) + GAP * 0.4;
    const H = top + data.length * rowH + (opts.ticks ? 50 : 10);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'chartsvg' });
    const x0 = LW;
    if (opts.ticks) {
      opts.ticks.forEach(t => { const x = x0 + plotW * t / max; el('line', { x1: x, y1: top, x2: x, y2: H - 44, stroke: C.grid, 'stroke-width': 2 }, svg); txt(svg, x, H - 10, (opts.tickFmt ? opts.tickFmt(t) : t), { size: 24, fill: C.ink2, anchor: (t === 0 && x0 < 30) ? 'start' : 'middle' }); });
    }
    el('line', { x1: x0, y1: top, x2: x0, y2: H - (opts.ticks ? 44 : 4), stroke: C.ink2, 'stroke-width': 2 }, svg);
    data.forEach((d, i) => {
      const yRow = top + i * rowH;
      const yBar = yRow + (labelAbove ? 50 : 0);
      if (labelAbove) txt(svg, x0 + 4, yRow + 36, d.label, { size: 30, weight: 600 });
      else txt(svg, LW - 20, yBar + BH / 2 + 10, d.label, { size: 30, weight: 600, anchor: 'end' });
      const w = plotW * d.value / max;
      const fill = d.colour === 'b' ? C.b : d.colour === 'empty' ? C.empty : C.a;
      el('path', { d: barPath(x0 + 2, yBar, Math.max(w - 2, 0), BH), fill }, svg);
      txt(svg, x0 + w + 16, yBar + BH / 2 + 11, d.display != null ? d.display : String(d.value), { size: 32, weight: 700 });
    });
    (typeof target === 'string' ? document.querySelector(target) : target).appendChild(svg);
    return svg;
  };

  // 10 x 10 icon array. opts: {filled, total=100, cols=10, size, gap, shape:'square'|'person', fillColour:'a'|'b'}
  window.iconArray = function (target, opts) {
    const total = opts.total || 100, cols = opts.cols || 10, s = opts.size || 38, g = opts.gap || 8;
    const rows = Math.ceil(total / cols);
    const W = cols * s + (cols - 1) * g, H = rows * (opts.shape === 'person' ? s * 1.6 : s) + (rows - 1) * g;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: opts.width || W, height: (opts.width ? opts.width * H / W : H), class: 'iconarray' });
    const fillC = opts.fillColour === 'a' ? C.a : C.b;
    for (let i = 0; i < total; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const on = i < opts.filled;
      const col = on ? fillC : C.empty;
      if (opts.shape === 'person') {
        const h = s * 1.6, x = c * (s + g), y = r * (h + g);
        el('circle', { cx: x + s / 2, cy: y + s * 0.28, r: s * 0.24, fill: col }, svg);
        el('path', { d: `M${x + s * 0.14},${y + h} V${y + s * 0.78} Q${x + s * 0.14},${y + s * 0.6} ${x + s * 0.32},${y + s * 0.6} H${x + s * 0.68} Q${x + s * 0.86},${y + s * 0.6} ${x + s * 0.86},${y + s * 0.78} V${y + h} Z`, fill: col }, svg);
      } else {
        const x = c * (s + g), y = r * (s + g);
        el('rect', { x, y, width: s, height: s, rx: 6, fill: col }, svg);
      }
    }
    (typeof target === 'string' ? document.querySelector(target) : target).appendChild(svg);
    return svg;
  };

  // 100% stacked bar with labelled segments. segs: [{label, value, colour:'a'|'b'|'empty'|'#hex'}]
  window.stackBar = function (target, segs, opts = {}) {
    const W = opts.width || 920, H = opts.height || 90;
    const sum = segs.reduce((a, s) => a + s.value, 0);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H + 60}`, width: W, height: H + 60 });
    let x = 0;
    segs.forEach((s, i) => {
      const w = W * s.value / sum - (i < segs.length - 1 ? 4 : 0);
      const fill = s.colour === 'a' ? C.a : s.colour === 'b' ? C.b : s.colour === 'empty' ? C.empty : (s.colour || C.a);
      el('rect', { x, y: 0, width: Math.max(w, 0), height: H, rx: 8, fill }, svg);
      if (s.label) txt(svg, x + 4, H + 44, s.label, { size: 26, weight: 600, fill: C.ink });
      x += w + 4;
    });
    (typeof target === 'string' ? document.querySelector(target) : target).appendChild(svg);
    return svg;
  };
})();
