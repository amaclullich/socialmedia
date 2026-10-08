/* Shared helper for C15 cards: grouped horizontal bars, solid (A) vs hatched pale (B). */
window.pairBars = function (target, o) {
  const W = o.width || 920, LW = o.labelWidth || 0, BH = o.barH || 46, G = 10, VR = o.valueRoom || 190, INK = '#1F2A30';
  const plotW = W - LW - VR, max = o.max, X = v => LW + plotW * v / max;
  const T = (x, y, s, z, w, f, a) => `<text x="${x}" y="${y}" font-family="Inter" font-size="${z}" font-weight="${w}" fill="${f || INK}" text-anchor="${a || 'start'}">${s}</text>`;
  let y = 6, h = '<defs><pattern id="hb" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#DCEBEA"/><line x1="0" y1="0" x2="0" y2="12" stroke="#00909A" stroke-width="4"/></pattern></defs>';
  const gridTop = y, body = [];
  o.groups.forEach(g => {
    y += 40; body.push(T(LW + 12, y, g.title, 32, 800, '#15535B'));
    if (g.tag) { const tw = g.tag.length * 15 + 36; body.push(`<rect x="${W - tw}" y="${y - 32}" width="${tw}" height="44" rx="22" fill="#fff" stroke="#5F6B76" stroke-width="2.5" ${g.tagDash ? 'stroke-dasharray="6 5"' : ''}/>` + T(W - tw / 2, y - 2, g.tag, 24, 700, '#1F2A30', 'middle')); }
    y += 12;
    g.rows.forEach(r => {
      const w = X(r.v) - X(0);
      body.push(r.style === 'b' ? `<rect x="${X(0)}" y="${y}" width="${w}" height="${BH}" fill="url(#hb)" stroke="#00909A" stroke-width="3"/>` : `<rect x="${X(0)}" y="${y}" width="${w}" height="${BH}" fill="#0F6F78"/>`);
      if (r.label) body.push(T(LW - 16, y + BH / 2 + 10, r.label, 27, 600, INK, 'end'));
      body.push(r.inside ? T(X(r.v) - 14, y + BH / 2 + 11, r.disp, 32, 700, '#fff', 'end') : T(X(r.v) + 14, y + BH / 2 + 11, r.disp, 32, 700));
      if (r.extra) body.push(r.extra(X, y, BH));
      y += BH + G;
    });
    y += 22;
  });
  const gridBot = y - 12;
  let grid = '';
  o.ticks.forEach(t => { grid += `<line x1="${X(t)}" y1="${gridTop}" x2="${X(t)}" y2="${gridBot}" stroke="#D9DEDC" stroke-width="2"/>` + T(X(t), gridBot + 34, t, 24, 500, '#5F6B76', 'middle'); });
  if (o.axis) grid += T(X(0) + plotW / 2, gridBot + 72, o.axis, 26, 600, '#5F6B76', 'middle');
  const H = gridBot + (o.axis ? 84 : 46);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.innerHTML = h + grid + `<line x1="${X(0)}" y1="${gridTop}" x2="${X(0)}" y2="${gridBot}" stroke="#5F6B76" stroke-width="2.5"/>` + body.join('');
  document.querySelector(target).appendChild(svg); return svg;
};
