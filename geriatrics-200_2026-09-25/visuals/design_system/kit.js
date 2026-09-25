/* kit.js : drawn-illustration kit for the Geriatrics 200 collection.
   Plain browser script, no modules, no network. Exposes window.Kit.
   Every function returns SVG markup (a string). Compose with Kit.scene(w, h, [...]) or Kit.draw(target, w, h, [...]).
   Style: flat colour, one even dark outline (#1F2A30, Kit.LW scene units, default 3) on every shape.
   Coordinates: y grows downwards. Every person and every piece of furniture is placed by a FLOOR point (x, y):
   x is the body centre (standing) or the seated hip (seats), y is the floor line. Small objects sit on a surface point.
   Scale 1 = a standing adult about 400 units tall. See KIT.md for the full reference and the composition rules. */
(function () {
  'use strict';
  const OL = '#1F2A30';
  const Kit = { version: '1.0', LW: 3 };
  let UID = 0;

  /* ------------------------------------------------------------------ palettes */
  Kit.C = {
    deep: '#0F3C4F', teal: '#15535B', mint: '#DCEBEA', pale: '#B9CDCC', orange: '#C24E12', gold: '#D9A441', sand: '#EFE6D6',
    white: '#FFFFFF', light: '#D9DEDC', grey: '#5F6B76', slate: '#3B4A52', ink: '#1F2A30', offwhite: '#FBFAF6',
    mustard: '#C99A2E', plum: '#6B4E6E', sage: '#8FA98F', brick: '#A0522D', navy: '#243B55',
    // extra muted tones used for uniforms and variety
    paleblue: '#A9C4DA', lilac: '#B7A7CB', green: '#3F6553', cream: '#F3EDDF', oat: '#D9CCB4', denim: '#50708E',
    charcoal: '#343B40', rose: '#C98B86', stone: '#B5AB9C'
  };
  Kit.SKIN = { light: '#F4D9C6', fair: '#EBC3A5', medium: '#D6A27E', olive: '#C08B63', tan: '#A66F4B', brown: '#82532F', dark: '#613C23', deep: '#462A19' };
  Kit.HAIR = { white: '#F4F2ED', silver: '#D4D6D4', grey: '#A6ABAD', saltpepper: '#8F9497', darkgrey: '#6E7477', black: '#1F1C1B', dark: '#302722', brown: '#5C3C28', auburn: '#8D4B2B', blonde: '#D8B87C', sandy: '#B99A6B' };
  Kit.PROP = {
    wood: '#C9A07A', woodDk: '#9E7652', woodLt: '#E0C4A2', metal: '#B9C3C7', metalDk: '#7E8B92', steel: '#98A4AA',
    mattress: '#F1F5F4', linen: '#FFFFFF', rubber: '#353E43', tyre: '#2B3338', glass: '#E3F1F2', water: '#BEDFE3',
    red: '#C8362B', paper: '#D9C29B', plastic: '#F4F6F5', tile: '#F6F8F7'
  };
  const PR = Kit.PROP;

  /* ------------------------------------------------------------------ colour helpers */
  function rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  /* shade(c, f): f < 1 darkens, f > 1 lightens towards white */
  function shade(h, f) { if (!/^#/.test(h)) return h; const [r, g, b] = rgb(h); return f <= 1 ? hex(r * f, g * f, b * f) : hex(r + (255 - r) * (f - 1), g + (255 - g) * (f - 1), b + (255 - b) * (f - 1)); }
  Kit.shade = shade;
  const cc = v => (v == null ? v : (Kit.C[v] || Kit.PROP[v] || v));
  const skinCol = v => Kit.SKIN[v] || v;
  const hairCol = v => Kit.HAIR[v] || Kit.C[v] || v;

  /* ------------------------------------------------------------------ geometry */
  const R = Math.PI / 180;
  const P = (x, y) => ({ x, y });
  const add = (a, b) => P(a.x + b.x, a.y + b.y);
  const sub = (a, b) => P(a.x - b.x, a.y - b.y);
  const mul = (a, k) => P(a.x * k, a.y * k);
  const lerp = (a, b, t) => P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  const len = a => Math.hypot(a.x, a.y);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const nrm = a => { const l = len(a) || 1; return P(a.x / l, a.y / l); };
  const rot = (v, d) => { const c = Math.cos(d * R), s = Math.sin(d * R); return P(v.x * c - v.y * s, v.x * s + v.y * c); }; // +d = clockwise on screen
  const upv = (d, l = 1) => P(Math.sin(d * R) * l, -Math.cos(d * R) * l); // angle from straight up, + leans forward (+x)
  const angUp = v => Math.atan2(v.x, -v.y) / R;
  const angDeg = v => Math.atan2(v.y, v.x) / R;
  const perpF = v => P(-v.y, v.x); // rotate 90 deg clockwise: for an upward spine tangent this is the front
  const n1 = v => Math.round(v * 10) / 10;
  const pt = p => n1(p.x) + ',' + n1(p.y);
  const flat = a => (Array.isArray(a) ? a.reduce((m, x) => m.concat(flat(x)), []) : [a]);

  function capsule(A, B, r1, r2) {
    const d = sub(B, A), L = len(d);
    if (L < Math.abs(r1 - r2) + 0.01) { const r = Math.max(r1, r2), c = r1 >= r2 ? A : B; return circP(c, r); }
    const u = mul(d, 1 / L), n = P(-u.y, u.x), s = (r1 - r2) / L, c = Math.sqrt(Math.max(0, 1 - s * s));
    const m1 = add(mul(n, c), mul(u, s)), m2 = add(mul(n, -c), mul(u, s));
    const a1 = add(A, mul(m1, r1)), b1 = add(B, mul(m1, r2)), a2 = add(A, mul(m2, r1)), b2 = add(B, mul(m2, r2));
    return `M${pt(a1)}L${pt(b1)}A${n1(r2)} ${n1(r2)} 0 ${s < 0 ? 1 : 0} 0 ${pt(b2)}L${pt(a2)}A${n1(r1)} ${n1(r1)} 0 ${s > 0 ? 1 : 0} 0 ${pt(a1)}Z`;
  }
  function circP(c, r) { return `M${n1(c.x - r)},${n1(c.y)}a${n1(r)},${n1(r)} 0 1 0 ${n1(2 * r)},0a${n1(r)},${n1(r)} 0 1 0 ${n1(-2 * r)},0Z`; }
  function rrP(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); return `M${n1(x + r)},${n1(y)}H${n1(x + w - r)}A${r} ${r} 0 0 1 ${n1(x + w)},${n1(y + r)}V${n1(y + h - r)}A${r} ${r} 0 0 1 ${n1(x + w - r)},${n1(y + h)}H${n1(x + r)}A${r} ${r} 0 0 1 ${n1(x)},${n1(y + h - r)}V${n1(y + r)}A${r} ${r} 0 0 1 ${n1(x + r)},${n1(y)}Z`; }
  function ellP(c, rx, ry, a) { const u = rot(P(rx, 0), a || 0), p1 = add(c, u), p2 = sub(c, u); return `M${pt(p1)}A${n1(rx)} ${n1(ry)} ${n1(a || 0)} 1 0 ${pt(p2)}A${n1(rx)} ${n1(ry)} ${n1(a || 0)} 1 0 ${pt(p1)}Z`; }
  /* Catmull-Rom through points, as cubic beziers */
  function smooth(pts, closed, k) {
    k = k == null ? 1 : k; const n = pts.length; if (n < 2) return '';
    const g = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    let d = 'M' + pt(pts[0]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      const c1 = add(p1, mul(sub(p2, p0), k / 6)), c2 = sub(p2, mul(sub(p3, p1), k / 6));
      d += 'C' + pt(c1) + ' ' + pt(c2) + ' ' + pt(p2);
    }
    return d + (closed ? 'Z' : '');
  }
  function hull(points) {
    const p = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], hi = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  /* two-bone inverse kinematics; bend -1 puts the joint on the counter-clockwise side */
  function ik(root, target, l1, l2, bend) {
    const d0 = dist(root, target);
    const d = Math.max(Math.abs(l1 - l2) + 0.5, Math.min(l1 + l2 - 0.4, d0));
    const base = Math.atan2(target.y - root.y, target.x - root.x);
    const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const ang = base + bend * a;
    const m = P(root.x + Math.cos(ang) * l1, root.y + Math.sin(ang) * l1);
    return { m, end: add(m, mul(nrm(sub(target, m)), l2)) };
  }
  Kit.geom = { P, add, sub, mul, lerp, rot, dist, capsule, smooth, ik };

  /* ------------------------------------------------------------------ pen: outlined primitives */
  function pen(lw) {
    const o = `stroke="${OL}" stroke-width="${n1(lw * 2)}" paint-order="stroke" stroke-linejoin="round" stroke-linecap="round"`;
    const g = {
      lw,
      /* filled path with outline */
      p: (d, f, ex) => `<path d="${d}" fill="${f}" ${o}${ex || ''}/>`,
      r: (x, y, w, h, rx, f, ex) => `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="${n1(rx || 0)}" fill="${f}" ${o}${ex || ''}/>`,
      c: (cx, cy, r, f, ex) => `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" fill="${f}" ${o}${ex || ''}/>`,
      e: (cx, cy, rx, ry, f, a) => `<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${f}" ${o}${a ? ` transform="rotate(${n1(a)} ${n1(cx)} ${n1(cy)})"` : ''}/>`,
      /* thick outlined stroke through points (tubes, legs of furniture) */
      l: (pts, w, f, cap) => { const d = 'M' + pts.map(pt).join('L'); return g.ld(d, w, f, cap); },
      ld: (d, w, f, cap) => `<path d="${d}" fill="none" stroke="${OL}" stroke-width="${n1(w + 2 * lw)}" stroke-linecap="${cap || 'round'}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${f}" stroke-width="${n1(w)}" stroke-linecap="${cap || 'round'}" stroke-linejoin="round"/>`,
      /* thin interior detail line, no outline */
      t: (d, f, w) => `<path d="${d}" fill="none" stroke="${f || OL}" stroke-width="${n1(w || lw * 0.75)}" stroke-linecap="round" stroke-linejoin="round"/>`,
      /* several shapes merged into one silhouette with a single outline */
      m: (ds, f) => { const a = ds.filter(Boolean); return `<g fill="${OL}" stroke="${OL}" stroke-width="${n1(lw * 2)}" stroke-linejoin="round">${a.map(d => `<path d="${d}"/>`).join('')}</g><g fill="${f}">${a.map(d => `<path d="${d}"/>`).join('')}</g>`; },
      /* flat fill, no outline */
      f: (d, f, ex) => `<path d="${d}" fill="${f}"${ex || ''}/>`
    };
    return g;
  }
  Kit.pen = pen;
  const G = (inner, tr) => `<g transform="${tr}">${inner}</g>`;
  const T = (x, y, s, fx) => `translate(${n1(x)},${n1(y)})` + (s !== 1 || fx === -1 ? ` scale(${Math.round(fx * s * 1000) / 1000},${Math.round(s * 1000) / 1000})` : '');
  const shadowEl = (cx, w, y) => `<ellipse cx="${n1(cx)}" cy="${n1(y || 0)}" rx="${n1(w)}" ry="${n1(Math.max(5, w * 0.09))}" fill="${OL}" opacity=".10"/>`;

  /* ================================================================== PEOPLE */
  const LEN = { thigh: 100, shin: 94, ank: 16, spine: 115, upper: 74, fore: 64 };
  Kit.dims = {
    standingHeight: 400, chairSeat: 103, armchairSeat: 112, armchairArm: 154, sofaSeat: 100, stoolSeat: 106, wheelchairSeat: 114,
    hospitalBedTop: 140, domesticBedTop: 118, tableTop: 168, bedsideTop: 184, overBedTop: 212, counterTop: 205, frameHandle: 188,
    commodeSeat: 112, toiletSeat: 96, deskTop: 168
  };

  const ROLES = {
    nurse: { top: 'navy', bottom: 'navy', topStyle: 'tunic', trim: 'white', extras: ['lanyard'], shoes: '#2A3136' },
    hca: { top: 'paleblue', bottom: 'navy', topStyle: 'tunic', trim: 'navy', extras: ['lanyard'], shoes: '#2A3136' },
    hca_lilac: { top: 'lilac', bottom: 'navy', topStyle: 'tunic', trim: 'plum', extras: ['lanyard'], shoes: '#2A3136' },
    doctor: { top: '#DCE7EF', bottom: 'slate', topStyle: 'shirt', extras: ['lanyard'], shoes: '#3A2E28' },
    physio: { top: 'teal', bottom: 'navy', topStyle: 'polo', trim: 'white', shoes: '#F2F2EE' },
    care_worker: { top: 'plum', bottom: 'charcoal', topStyle: 'tunic', trim: 'white', extras: ['lanyard'], shoes: '#2A3136' },
    pharmacist: { top: '#F3F5F4', bottom: 'charcoal', topStyle: 'tunic', trim: 'teal', extras: ['lanyard'], shoes: '#2A3136' },
    ot: { top: 'green', bottom: 'navy', topStyle: 'tunic', trim: 'white', extras: ['lanyard'], shoes: '#2A3136' },
    paramedic: { top: 'green', bottom: 'green', topStyle: 'polo', trim: '#2E4A3D', shoes: '#1F2426' }
  };
  Kit.ROLES = ROLES;

  function config(o) {
    const role = (o.role && ROLES[o.role]) || {};
    const ex = new Set([].concat(role.extras || [], o.extras || []));
    if (o.noLanyard) ex.delete('lanyard');
    const age = o.age || 'adult';
    const c = { o, age, sex: o.sex || null, extras: ex, view: o.view || 'side' };
    c.skin = skinCol(o.skin || 'medium');
    c.hairName = o.hair || (age === 'older' ? 'grey' : 'dark');
    c.hair = hairCol(c.hairName);
    c.hairStyle = o.hairStyle || (c.sex === 'f' ? 'bob' : 'short');
    c.topStyle = o.topStyle || role.topStyle || (ex.has('uniform') ? 'tunic' : 'plain');
    c.top = cc(o.top || role.top || 'teal');
    c.trim = cc(o.trim || role.trim || 'white');
    c.sleeves = o.sleeves || role.sleeves || (['tunic', 'polo', 'shirt'].includes(c.topStyle) ? 'short' : 'long');
    c.bottom = cc(o.bottom || role.bottom || 'slate');
    c.bottomStyle = o.bottomStyle || 'trousers';
    c.legs = cc(o.legs || c.skin);
    c.shoes = cc(o.shoes || role.shoes || (age === 'older' ? '#5B4A40' : '#2F383D'));
    c.shoeStyle = o.shoeStyle || 'shoe';
    c.cardigan = ex.has('cardigan') ? cc(o.cardigan || 'oat') : null;
    c.apron = ex.has('apron');
    c.build = o.build || 'medium';
    c.bw = { slim: 0.88, medium: 1, broad: 1.17 }[c.build] || 1;
    c.tilt = o.tilt || 0; c.lean = o.lean || 0;
    c.lanyard = cc(o.lanyardColour || 'teal');
    c.frameCol = cc(o.frameColour);
    return c;
  }

  /* ---------------- rig: joints of one figure, facing right, floor at y = 0 ---------------- */
  function makeRig(c, hip, t, curve, tilt) {
    const r = { c, hip, t, curve, tilt: tilt + c.tilt, legs: {}, arms: {}, under: '', mid: '', over: '', held: '', shadow: null };
    const top = add(hip, upv(t, LEN.spine));
    const bn = P(-Math.cos(t * R), -Math.sin(t * R));
    const ctrl = add(lerp(hip, top, 0.5), mul(bn, curve));
    const B = u => { const v = 1 - u; return P(v * v * hip.x + 2 * v * u * ctrl.x + u * u * top.x, v * v * hip.y + 2 * v * u * ctrl.y + u * u * top.y); };
    const Bd = u => nrm(add(mul(sub(ctrl, hip), 2 * (1 - u)), mul(sub(top, ctrl), 2 * u)));
    r.tan = u => Bd(Math.max(0, Math.min(1, u)));
    r.at = u => (u < 0 ? add(hip, mul(Bd(0), u * LEN.spine)) : u > 1 ? add(top, mul(Bd(1), (u - 1) * LEN.spine)) : B(u));
    r.fn = u => perpF(r.tan(u));
    r.S = add(r.at(0.95), mul(r.fn(0.95), -2));
    const tt = r.tan(1);
    r.N = add(top, mul(tt, 12));
    r.ha = angUp(tt) + r.tilt;
    r.H = add(add(r.N, upv(r.ha, 35)), mul(r.fn(1), c.age === 'older' ? 2.5 : 0));
    r.leg = (w, ankle, foot) => { const k = ik(r.hip, ankle, LEN.thigh, LEN.shin, -1); r.legs[w] = { hip: r.hip, knee: k.m, ankle: k.end, foot: foot || 0 }; };
    r.legK = (w, knee, ankle, foot) => { const kn = add(r.hip, mul(nrm(sub(knee, r.hip)), LEN.thigh)); const an = add(kn, mul(nrm(sub(ankle, kn)), LEN.shin)); r.legs[w] = { hip: r.hip, knee: kn, ankle: an, foot: foot || 0 }; };
    r.arm = (w, hand, bend) => { const k = ik(r.S, hand, LEN.upper, LEN.fore, bend == null ? 1 : bend); r.arms[w] = { sh: r.S, el: k.m, hand: k.end }; };
    r.armFK = (w, a, flex) => { const base = mul(r.tan(0.95), -1); const e = add(r.S, mul(rot(base, -a), LEN.upper)); r.arms[w] = { sh: r.S, el: e, hand: add(e, mul(rot(base, -(a + flex)), LEN.fore)) }; };
    return r;
  }
  /* point on top of a thigh, fraction f from hip to knee, lifted by lift */
  function onThigh(L, f, lift) { const d = nrm(sub(L.knee, L.hip)); let n = P(d.y, -d.x); if (n.y > 0) n = mul(n, -1); return add(lerp(L.hip, L.knee, f), mul(n, lift)); }

  /* ---------------- head, hair and face-free details ---------------- */
  const HS = 1.08; // head scale: slightly larger than life reads better at phone size
  const HEAD_SIDE = 'M1,-29C15,-29 25,-19 25,-5C25,6 23,14 18,21C13,27 6,29 -1,28C-9,27 -16,23 -20,16C-25,8 -27,-3 -25,-12C-22,-23 -12,-29 1,-29Z';
  /* hair: [shapes], plus optional strand lines (drawn inside) so hair never reads as a helmet */
  const HAIR_SIDE = {
    short: ['M21,-18C18,-32 -4,-36 -18,-29C-29,-22 -31,-6 -26,8C-24,13 -21,16 -18,17L-13,13C-12,6 -10,-2 -7,-8C-4,-11 1,-11 3,-8L4,-2L8,-2L9,-10C12,-13 17,-15 21,-18Z'],
    pixie: ['M22,-15C21,-33 -6,-39 -21,-30C-32,-22 -33,-4 -27,10C-25,15 -20,17 -16,15C-15,8 -12,0 -8,-6C-4,-10 2,-10 6,-9C12,-9 18,-11 22,-15Z'],
    cropped: ['M19,-20C15,-31 -5,-33 -18,-27C-27,-20 -28,-5 -24,8L-15,10C-13,2 -10,-5 -6,-9C-2,-11 2,-10 3,-7L4,-3L7,-3L8,-10C11,-15 15,-18 19,-20Z'],
    balding: ['M6,-8C1,-15 -10,-18 -20,-16C-27,-11 -29,2 -26,10C-24,14 -21,17 -18,17L-13,13C-12,6 -10,-2 -7,-7C-4,-10 1,-10 3,-7L4,1L7,1Z'],
    bun: ['M21,-15C19,-32 -4,-37 -19,-29C-28,-23 -30,-8 -25,6L-16,8C-14,0 -10,-7 -5,-10C2,-13 12,-12 21,-15Z', 'circle:-27,-15,11'],
    ponytail: ['M21,-15C19,-32 -4,-37 -19,-29C-28,-23 -30,-8 -25,6L-16,8C-14,0 -10,-7 -5,-10C2,-13 12,-12 21,-15Z', 'M-24,-20C-34,-18 -38,-6 -38,8C-38,22 -34,34 -30,42C-26,40 -26,30 -27,20C-28,8 -26,-4 -20,-12Z'],
    long: ['M21,-16C18,-33 -7,-39 -22,-28C-32,-19 -32,-2 -31,14C-30,30 -31,44 -27,54C-20,58 -12,57 -7,52C-10,40 -10,26 -8,14C-6,4 -3,-5 3,-10C9,-13 15,-13 21,-16Z'],
    bob: ['M22,-13C20,-33 -7,-39 -22,-29C-33,-20 -33,0 -30,16C-28,23 -20,27 -10,26C-11,16 -9,5 -3,-3C3,-9 13,-9 22,-13Z'],
    wavy: ['M22,-14C19,-33 -8,-39 -23,-28C-33,-18 -32,-2 -33,10C-34,20 -28,28 -31,37C-25,44 -14,42 -9,35C-12,27 -9,18 -9,10C-8,0 -4,-7 3,-10C9,-12 15,-11 22,-14Z'],
    curly: 'CURLY', coily: 'COILY',
    headscarf: ['M17,-20C11,-36 -16,-39 -29,-25C-38,-13 -37,11 -33,27C-30,42 -34,54 -40,64L26,64C28,52 26,40 20,31C14,31 8,27 8,20C9,9 11,-4 17,-20Z']
  };
  const STRANDS_SIDE = {
    short: 'M15,-24C5,-30 -8,-29 -17,-20M-2,-31C-12,-29 -22,-20 -24,-6', pixie: 'M16,-24C4,-31 -10,-29 -19,-18M2,-32C-12,-31 -24,-20 -26,-4',
    cropped: '', balding: 'M-6,-14C-14,-13 -21,-8 -23,2', bun: 'M15,-24C4,-30 -10,-29 -20,-20M8,-31C-4,-34 -16,-28 -22,-21',
    ponytail: 'M15,-24C4,-30 -10,-29 -20,-20M-32,-2C-33,12 -31,26 -29,36', long: 'M13,-25C0,-31 -14,-25 -21,-10C-24,6 -22,26 -19,46', bob: 'M15,-24C1,-30 -14,-25 -21,-8C-23,2 -22,14 -19,22',
    wavy: 'M14,-25C0,-31 -14,-25 -21,-10C-24,2 -18,14 -23,26', headscarf: 'M-2,-34C-16,-30 -28,-16 -30,4M-26,30C-22,42 -24,52 -30,60'
  };
  const HEAD_FRONT = 'M0,-28C13,-28 22,-17 22,-2C22,14 13,28 0,28C-13,28 -22,14 -22,-2C-22,-17 -13,-28 0,-28Z';
  const HAIR_FRONT = {
    short: ['M-24,4C-27,-17 -15,-32 0,-32C15,-32 27,-17 24,4L21,4C21,-5 20,-10 17,-14C9,-19 -9,-19 -17,-14C-20,-10 -21,-5 -21,4Z'],
    pixie: ['M-25,8C-28,-16 -16,-33 0,-33C16,-33 28,-16 25,8C23,0 22,-6 18,-11C10,-15 -4,-18 -12,-13C-18,-10 -21,-4 -22,6Z'],
    cropped: ['M-23,0C-25,-17 -14,-30 0,-30C14,-30 25,-17 23,0L21,0C21,-8 19,-12 16,-16C8,-20 -8,-20 -16,-16C-19,-12 -21,-8 -21,0Z'],
    balding: ['M-24,8C-26,-2 -24,-12 -19,-17C-17,-10 -18,-2 -18,8Z', 'M24,8C26,-2 24,-12 19,-17C17,-10 18,-2 18,8Z'],
    bun: ['circle:0,-32,10', 'M-24,4C-26,-16 -15,-31 0,-31C15,-31 26,-16 24,4C22,-2 21,-8 17,-13C9,-18 -9,-18 -17,-13C-21,-8 -22,-2 -24,4Z'],
    ponytail: ['M-24,4C-26,-16 -15,-31 0,-31C15,-31 26,-16 24,4C22,-2 21,-8 17,-13C9,-18 -9,-18 -17,-13C-21,-8 -22,-2 -24,4Z'],
    long: ['M-20,-13C-12,-19 12,-19 20,-13C23,-4 22,14 22,40L31,45C34,20 31,-4 27,-17C21,-31 -21,-31 -27,-17C-31,-4 -34,20 -31,45L-22,40C-22,14 -23,-4 -20,-13Z'],
    bob: ['M-20,-12C-12,-19 12,-19 20,-12C23,-4 23,10 24,20C27,24 31,20 30,14C32,-4 30,-20 22,-27C12,-34 -12,-34 -22,-27C-30,-20 -32,-4 -30,14C-31,20 -27,24 -24,20C-23,10 -23,-4 -20,-12Z'],
    wavy: ['M-20,-12C-12,-19 12,-19 20,-12C23,-2 21,14 25,30C29,36 34,30 31,22C34,6 31,-14 24,-24C14,-35 -14,-35 -24,-24C-31,-14 -34,6 -31,22C-34,30 -29,36 -25,30C-21,14 -23,-2 -20,-12Z'],
    curly: 'CURLY', coily: 'COILY',
    headscarf: ['M0,-37C21,-37 32,-21 32,1C32,21 31,33 41,60L-41,60C-31,33 -32,21 -32,1C-32,-21 -21,-37 0,-37ZM0,-22C-11,-22 -16,-12 -16,0C-16,13 -9,23 0,23C9,23 16,13 16,0C16,-12 11,-22 0,-22Z']
  };
  const STRANDS_FRONT = {
    short: 'M-6,-30C-2,-24 6,-22 14,-24', pixie: 'M-4,-31C0,-24 8,-20 16,-20', bun: 'M0,-30V-19M-10,-28C-8,-22 -5,-19 -2,-18M10,-28C8,-22 5,-19 2,-18', ponytail: 'M0,-30V-19M-10,-28C-8,-22 -5,-19 -2,-18M10,-28C8,-22 5,-19 2,-18',
    long: 'M-2,-29C-1,-24 0,-21 0,-19M-26,-6C-27,10 -26,26 -26,38M26,-6C27,10 26,26 26,38', bob: 'M-2,-31C-1,-26 0,-22 0,-19M-26,-4C-27,6 -26,14 -26,18M26,-4C27,6 26,14 26,18',
    wavy: 'M-2,-31C-1,-26 0,-22 0,-19M-27,-2C-28,10 -25,20 -28,28M27,-2C28,10 25,20 28,28', balding: '', cropped: '', headscarf: 'M-20,-26C-28,-12 -28,10 -26,28M20,-26C28,-12 28,10 26,28'
  };
  function curls(front, big) {
    const out = [], rr = big ? 11.5 : 9, rad = big ? 27 : 24.5;
    const a0 = front ? -200 : -212, a1 = front ? 20 : -36, step = big ? 21 : 19;
    for (let a = a0; a <= a1 + 0.1; a += step) { const x = Math.cos(a * R) * rad, y = Math.sin(a * R) * rad - (big ? 3 : 2); out.push(circP(P(x, y), rr)); }
    // core fill so no skin shows between curls
    out.push(front ? `M-24,2C-27,-20 -14,-${big ? 33 : 31} 0,-${big ? 33 : 31}C14,-${big ? 33 : 31} 27,-20 24,2Z` : `M20,-16C16,-33 -8,-37 -23,-27C-31,-18 -31,0 -25,14L-12,10C-12,-2 -6,-8 2,-12Z`);
    return out;
  }
  function hairShapes(style, front) {
    const tab = front ? HAIR_FRONT : HAIR_SIDE;
    let v = tab[style] || tab.short;
    if (v === 'CURLY') return curls(front, false);
    if (v === 'COILY') return curls(front, true);
    return v.map(s => { if (s.startsWith('circle:')) { const [x, y, r] = s.slice(7).split(',').map(Number); return circP(P(x, y), r); } return s; });
  }
  function hairMarkup(c, g, front) {
    const ds = hairShapes(c.hairStyle, front);
    let s = c.hairStyle === 'headscarf' && front ? `<path d="${ds[0]}" fill="${c.hair}" fill-rule="evenodd" stroke="${OL}" stroke-width="${n1(g.lw * 2)}" paint-order="stroke" stroke-linejoin="round"/>` : g.m(ds, c.hair);
    const st = (front ? STRANDS_FRONT : STRANDS_SIDE)[c.hairStyle];
    if (st) { const [hr, hg, hb] = rgb(c.hair); const lum = (0.3 * hr + 0.59 * hg + 0.11 * hb) / 255; s += g.t(st, lum < 0.28 ? shade(c.hair, 1.45) : shade(c.hair, 0.78), 1.7); }
    if (c.hairName === 'saltpepper' && c.hairStyle !== 'headscarf') {
      const id = 'kh' + (++UID);
      const strokes = [];
      for (let i = 0; i < 16; i++) { const x = -30 + (i * 37) % 60, y = -34 + (i * 23) % 60; strokes.push(`M${x},${y}l${i % 2 ? 5 : 4},${i % 3 ? 3 : -2}`); }
      s += `<clipPath id="${id}">${ds.map(d => `<path d="${d}"/>`).join('')}</clipPath><g clip-path="url(#${id})" fill="none" stroke-linecap="round"><path d="${strokes.filter((x, i) => i % 2).join('')}" stroke="#3C4245" stroke-width="2.2"/><path d="${strokes.filter((x, i) => !(i % 2)).join('')}" stroke="#E4E6E5" stroke-width="2.2"/></g>`;
    }
    return s;
  }
  function headSide(r, c, g) {
    let s = g.p(HEAD_SIDE, c.skin);
    const earHidden = ['long', 'bob', 'headscarf', 'wavy'].includes(c.hairStyle);
    if (!earHidden) s += g.e(-3, 1, 5, 8, shade(c.skin, 0.93));
    if (c.extras.has('beard')) s += g.p('M-7,5C-6,16 1,27 12,27C19,26 23,20 25,9C21,14 14,16 8,14C2,12 -3,9 -7,5Z', c.o.beardColour ? hairCol(c.o.beardColour) : c.hair);
    s += hairMarkup(c, g, false);
    if (c.extras.has('hearing_aid') && c.hairStyle !== 'headscarf') s += g.p('M-9,-9C-13,-6 -14,2 -12,8C-11,10 -8,10 -8,8C-9,3 -8,-3 -6,-7C-5,-9 -7,-10 -9,-9Z', '#9AA5AB') + g.t('M-7,-8C-4,-11 0,-8 -1,-3', OL, 1.6);
    if (c.extras.has('glasses')) s += g.t('M-2,-3L19,-4', OL, 2.4) + g.r(18, -8.5, 8, 11, 3, 'rgba(227,241,242,.9)');
    return G(s, `translate(${pt(r.H)}) rotate(${n1(r.ha)}) scale(${HS})`);
  }
  function headFront(H, c, g, tilt) {
    let s = '';
    const earHidden = ['long', 'bob', 'headscarf', 'wavy'].includes(c.hairStyle);
    if (!earHidden) s += g.e(-21.5, 2, 5, 8, shade(c.skin, 0.93)) + g.e(21.5, 2, 5, 8, shade(c.skin, 0.93));
    s += g.p(HEAD_FRONT, c.skin);
    if (c.extras.has('beard')) s += g.p('M-21,4C-20,20 -10,29 0,29C10,29 20,20 21,4C16,12 8,15 0,15C-8,15 -16,12 -21,4Z', c.o.beardColour ? hairCol(c.o.beardColour) : c.hair);
    s += hairMarkup(c, g, true);
    if (c.extras.has('hearing_aid') && !earHidden) s += g.p('M24,-9C28,-8 29,-2 28,4C27,6 25,6 25,4C26,0 25,-4 23,-7Z', '#9AA5AB');
    if (c.extras.has('glasses')) s += g.r(-16, -6, 12, 8, 3, 'rgba(227,241,242,.75)') + g.r(4, -6, 12, 8, 3, 'rgba(227,241,242,.75)') + g.t('M-4,-2.5Q0,-5 4,-2.5M-16,-3H-21M16,-3H21', OL, 2);
    return G(s, `translate(${pt(H)}) rotate(${n1(tilt || 0)}) scale(${HS})`);
  }

  /* ---------------- side-view body parts ---------------- */
  const SHOE = 'M-15,3C-16,-5 -9,-9 -1,-9L9,-6C20,-2 36,0 42,7C45,11 44,16 39,16L-11,16C-15,16 -16,9 -15,3Z';
  const SLIPPER = 'M-14,8C-15,2 -10,-1 -3,-2L9,-6C20,-3 36,0 42,7C45,11 44,16 39,16L-10,16C-14,16 -15,12 -14,8Z';
  function shoeSide(L, c, g, far) {
    const d = c.shoeStyle === 'slipper' ? SLIPPER : SHOE;
    const col = far ? shade(c.shoes, 0.85) : c.shoes;
    return G(g.p(d, col) + g.t('M-12,12.5L41,12.5', shade(col, 0.7), 1.6), `translate(${pt(L.ankle)}) rotate(${n1(L.foot)})`);
  }
  function legRadii(c) { const bw = c.bw, sk = c.bottomStyle === 'skirt'; return sk ? [17 * bw, 12.5 * bw, 9 * Math.sqrt(bw)] : [21 * bw, 16.5 * bw, 12.5 * Math.sqrt(bw)]; }
  function legShapes(L, c) { const [a, b, d] = legRadii(c); return [capsule(L.hip, L.knee, a, b), capsule(L.knee, L.ankle, b, d)]; }
  function pelvisShape(r, c) { const n = r.fn(0), a = angDeg(n); return ellP(add(r.hip, mul(n, -3)), 28 * c.bw, 24, a); }
  function armSide(A, c, g, far) {
    if (!A) return '';
    const bw = c.bw, top = c.cardigan || c.top;
    const sleeve = far ? shade(top, 0.84) : top, skin = far ? shade(c.skin, 0.9) : c.skin;
    const r1 = 11.5 * bw, r2 = 9.8 * bw, r3 = 8 * Math.sqrt(bw);
    const upper = capsule(A.sh, A.el, r1, r2), lower = capsule(A.el, A.hand, r2, r3);
    const fd = nrm(sub(A.hand, A.el)), hc = add(A.hand, mul(fd, 6));
    const handD = ellP(hc, 10.5, 8.5, angDeg(fd));
    if (c.sleeves === 'long' || c.cardigan) return g.m([upper, lower], sleeve) + g.p(handD, skin);
    const se = lerp(A.sh, A.el, 0.52), ud = nrm(sub(A.el, A.sh)), n = P(-ud.y, ud.x);
    let s = g.m([upper, lower, handD], skin) + g.p(capsule(A.sh, se, r1 + 2.5, r1 + 2), sleeve);
    if (['tunic', 'polo'].includes(c.topStyle)) { const e = add(se, mul(ud, r1 * 0.2)); s += g.t(`M${pt(add(e, mul(n, r1 + 1)))}L${pt(add(e, mul(n, -r1 - 1)))}`, far ? shade(c.trim, 0.85) : c.trim, 2.4); }
    return s;
  }
  function torsoOutline(r, c, inset, hemU) {
    const bw = c.bw, belly = (c.build === 'broad' ? 9 : c.build === 'slim' ? -2 : 0) + (c.age === 'older' ? 3 : 0), fem = c.sex === 'f' ? 3 : 0;
    const hem = hemU != null ? hemU : (c.topStyle === 'tunic' ? -0.2 : c.cardigan ? -0.2 : -0.12);
    const rows = [[hem, 29, 26], [0.08, 28, 25.5], [0.4, 22, 24 + belly], [0.7, 24, 28 + fem], [0.92, 22, 23], [1.02, 17, 15], [1.1, 10, 8]];
    const front = [], back = [];
    rows.forEach(([u, b, f]) => { const p = r.at(u), n = r.fn(u); front.push(add(p, mul(n, f * bw - (inset || 0) * (u > 1 ? 0.3 : 1)))); back.unshift(add(p, mul(n, -b * bw))); });
    return { d: smooth(front.concat(back), false) + 'Z', front, back };
  }
  function torsoSide(r, c, g) {
    const t = torsoOutline(r, c, 0);
    let s = g.p(t.d, c.top);
    const F = (u, off) => add(r.at(u), mul(r.fn(u), off * c.bw));
    const st = c.topStyle, tr = c.trim;
    if (st === 'tunic') {
      s += g.p(`M${pt(F(1.06, 9))}L${pt(F(0.84, 24))}L${pt(F(0.99, 19))}Z`, c.skin) + g.t(`M${pt(F(1.07, 7))}L${pt(F(0.84, 24))}`, tr, 2.6);
      s += g.t(`M${pt(F(1.08, -8))}Q${pt(F(1.13, 0))} ${pt(F(1.07, 7))}`, tr, 2.6);
      const a = F(0.72, 12), b = F(0.58, 12), n = r.fn(0.65); s += g.t(`M${pt(a)}L${pt(add(a, mul(n, 12)))}M${pt(a)}L${pt(b)}L${pt(add(b, mul(n, 12)))}`, shade(c.top, 0.72), 1.8);
    } else if (st === 'polo' || st === 'shirt') {
      s += g.p(`M${pt(F(1.1, -9))}L${pt(F(1.02, 16))}L${pt(F(0.93, 21))}L${pt(F(1.02, 5))}Z`, st === 'polo' ? c.trim === '#FFFFFF' ? shade(c.top, 0.9) : c.trim : shade(c.top, 0.93));
      if (st === 'shirt') for (let u = 0.84; u > 0.05; u -= 0.2) { const q = F(u, u > 0.3 && u < 0.5 ? 20 : 20); s += `<circle cx="${n1(q.x)}" cy="${n1(q.y)}" r="1.8" fill="${shade(c.top, 0.62)}"/>`; }
    }
    if (c.apron) s += g.p(smooth([F(0.9, 18), F(0.7, 28), F(0.4, 25), F(0.1, 29), F(-0.35, 31), F(-0.35, 8), F(0.1, 4), F(0.5, 6), F(0.88, 8)], false) + 'Z', 'rgba(255,255,255,.92)');
    if (c.cardigan) {
      const k = torsoOutline(r, c, 6);
      s += g.p(k.d, c.cardigan);
      for (let u = 0.72; u > -0.05; u -= 0.22) { const q = F(u, (u > 0.3 && u < 0.5 ? 22 : 20) - 7); s += `<circle cx="${n1(q.x)}" cy="${n1(q.y)}" r="2.6" fill="${shade(c.cardigan, 0.6)}"/>`; }
    }
    if (c.extras.has('lanyard')) {
      const a = F(1.05, -6), card = F(0.66, 23);
      s += g.t(`M${pt(a)}Q${pt(F(0.95, 12))} ${pt(card)}`, c.lanyard, 3.2);
      s += G(g.r(-4, -2, 9, 15, 2, '#FFFFFF'), `translate(${pt(card)}) rotate(${n1(r.t)})`);
    }
    return s;
  }
  function skirtSide(r, c, g) {
    const pts = [];
    const pc = add(r.hip, mul(r.fn(0), -3));
    for (let a = 0; a < 360; a += 30) pts.push(add(pc, P(Math.cos(a * R) * 27 * c.bw, Math.sin(a * R) * 24)));
    const drop = c.o.skirtLength === 'midi' ? 42 : 18;
    ['near', 'far'].forEach(w => { const L = r.legs[w]; if (!L) return; const sd = nrm(sub(L.ankle, L.knee)); const k = add(L.knee, mul(sd, drop)); for (let a = 0; a < 360; a += 45) pts.push(add(k, P(Math.cos(a * R) * 19 * c.bw, Math.sin(a * R) * 8))); pts.push(add(L.knee, P(0, -18))); });
    const h = hull(pts);
    return g.p(smooth(h, true, 0.55), c.bottom);
  }
  function neckSide(r, c, g) { const a = r.at(0.98), b = add(r.H, rot(P(-5, 19), r.ha)); return g.p(capsule(a, b, 10 * Math.sqrt(c.bw), 10), c.skin); }

  function drawSide(r, c, g) {
    let s = r.under;
    const sk = c.bottomStyle === 'skirt';
    const legCol = sk ? c.legs : c.bottom;
    if (r.arms.far && !r.farArmLate) s += armSide(r.arms.far, c, g, true);
    if (r.legs.far) s += g.m(legShapes(r.legs.far, c), shade(legCol, 0.84)) + shoeSide(r.legs.far, c, g, true);
    if (r.arms.far && r.farArmLate) s += armSide(r.arms.far, c, g, true);
    if (r.legs.near) s += g.m([sk ? null : pelvisShape(r, c)].concat(legShapes(r.legs.near, c)), legCol) + shoeSide(r.legs.near, c, g, false);
    if (sk) s += skirtSide(r, c, g);
    s += r.afterLegs || '';
    s += neckSide(r, c, g);
    s += torsoSide(r, c, g);
    s += headSide(r, c, g);
    s += r.mid + r.held;
    s += armSide(r.arms.near, c, g, false);
    s += r.over;
    return s;
  }

  /* ---------------- front view ---------------- */
  function frontRig(c, seated, sh) {
    const hipY = seated ? -(sh + 21) : -209;
    const r = { front: true, c, hipY, under: '', mid: '', over: '', held: '' };
    r.at = u => P(0, hipY - u * LEN.spine);
    r.S = [P(-35 * c.bw, hipY - 0.94 * LEN.spine), P(35 * c.bw, hipY - 0.94 * LEN.spine)];
    r.H = P(0, hipY - LEN.spine - 12 - 35);
    const hw = 17 * c.bw;
    if (seated) {
      r.legs = [-1, 1].map(s => ({ hip: P(s * hw, hipY), knee: P(s * (hw + 4), hipY + 20), ankle: P(s * (hw + 5), -16) }));
      r.arms = [-1, 1].map((s, i) => { const sh0 = r.S[i]; const el = P(s * 45 * c.bw, sh0.y + 70); return { sh: sh0, el, hand: P(s * 21, hipY + 2) }; });
    } else {
      r.legs = [-1, 1].map(s => ({ hip: P(s * hw, hipY), knee: P(s * (hw + 0.5), -113), ankle: P(s * (hw + 1), -16) }));
      r.arms = [-1, 1].map((s, i) => { const sh0 = r.S[i]; const el = P(s * (43 * c.bw + 1), sh0.y + 73); return { sh: sh0, el, hand: P(s * (45 * c.bw + 2), sh0.y + 136) }; });
    }
    r.seated = seated;
    return r;
  }
  function drawFront(r, c, g) {
    const bw = c.bw, sk = c.bottomStyle === 'skirt';
    let s = r.under;
    const [ra, rb, rc] = legRadii(c);
    const legs = [];
    r.legs.forEach(L => { legs.push(capsule(L.hip, L.knee, r.seated ? ra + 1.5 : ra, rb)); legs.push(capsule(L.knee, L.ankle, rb, rc)); });
    const pelvis = r.seated ? ellP(P(0, r.hipY - 4), 38 * bw, 17, 0) : `M${-37 * bw},${r.hipY - 16}L${37 * bw},${r.hipY - 16}L${30 * bw},${r.hipY + 22}L${-30 * bw},${r.hipY + 22}Z`;
    s += g.m([sk ? null : pelvis].concat(legs), sk ? c.legs : c.bottom);
    r.legs.forEach((L, i) => { const sx = i ? 1 : -1; s += G(g.p('M-13,2C-14,-8 -7,-11 0,-11C7,-11 14,-8 13,2L14,10C14,14 -14,14 -14,10Z', c.shoes), `translate(${n1(L.ankle.x + sx * 3)},${n1(L.ankle.y + 2)})`); });
    if (sk) {
      const y0 = r.hipY - 14, y1 = r.seated ? r.hipY + 20 : -96;
      s += g.p(r.seated ? `M${-38 * bw},${y0}L${38 * bw},${y0}C${46 * bw},${y0 + 10} ${48 * bw},${y1 - 6} ${46 * bw},${y1 + 4}L${-46 * bw},${y1 + 4}C${-48 * bw},${y1 - 6} ${-46 * bw},${y0 + 10} ${-38 * bw},${y0}Z` : `M${-37 * bw},${y0}L${37 * bw},${y0}L${48 * bw},${y1}L${-48 * bw},${y1}Z`, c.bottom);
    }
    // neck and torso
    s += g.p(capsule(r.at(0.98), P(0, r.H.y + 14), 10, 10), c.skin);
    const belly = (c.build === 'broad' ? 5 : 0) + (c.age === 'older' ? 2 : 0);
    const hem = c.topStyle === 'tunic' || c.cardigan ? -0.2 : -0.12;
    const rows = [[r.seated ? Math.max(hem, 0.02) : hem, 38], [0.12, 37], [0.42, 33 + belly], [0.74, 37], [0.93, 41], [1.02, 34], [1.1, 12]];
    const right = rows.map(([u, w]) => P(w * bw * (u > 1.05 ? 1 / bw : 1), r.at(u).y));
    const left = right.slice().reverse().map(p => P(-p.x, p.y));
    const tor = smooth(right.concat(left), false) + 'Z';
    s += g.p(tor, c.top);
    const ny = r.at(1.08).y, st = c.topStyle;
    if (st === 'tunic') {
      s += g.p(`M-10,${ny}L10,${ny}L0,${ny + 28}Z`, c.skin) + g.t(`M-12,${ny - 1}L0,${ny + 30}L12,${ny - 1}`, c.trim, 3);
      s += g.t(`M${14 * bw},${ny + 48}h${16 * bw}v${16}h${-16 * bw}Z`, shade(c.top, 0.7), 1.8);
    } else if (st === 'polo' || st === 'shirt') {
      const cl = st === 'polo' && c.trim !== '#FFFFFF' ? c.trim : shade(c.top, 0.9);
      s += g.p(`M-12,${ny - 2}L-3,${ny + 14}L-16,${ny + 12}Z`, cl) + g.p(`M12,${ny - 2}L3,${ny + 14}L16,${ny + 12}Z`, cl);
      if (st === 'polo') s += g.t(`M0,${ny + 4}V${ny + 26}`, shade(c.top, 0.7), 1.8);
      else s += g.t(`M0,${ny + 8}V${r.at(-0.05).y}`, shade(c.top, 0.72), 1.6);
    } else {
      s += g.t(`M-11,${ny + 1}Q0,${ny + 9} 11,${ny + 1}`, shade(c.top, 0.7), 2);
    }
    if (c.apron) s += g.p(`M-24,${ny + 16}L24,${ny + 16}L32,${r.at(-0.35).y}L-32,${r.at(-0.35).y}Z`, 'rgba(255,255,255,.92)');
    if (c.cardigan) {
      const inner = 9;
      const R1 = right.map((p, i) => i < rows.length - 1 ? p : P(p.x + 2, p.y));
      const panel = s2 => smooth(R1.map(p => P(s2 * p.x, p.y)), false) + `L${s2 * inner},${r.at(1.02).y + 8}L${s2 * inner},${r.at(hem).y}Z`;
      s += g.p(panel(1), c.cardigan) + g.p(panel(-1), c.cardigan);
      for (let u = 0.7; u > -0.05; u -= 0.22) s += `<circle cx="${n1(inner + 4)}" cy="${n1(r.at(u).y)}" r="2.6" fill="${shade(c.cardigan, 0.6)}"/>`;
    }
    if (c.extras.has('lanyard')) { const cy = r.at(0.62).y; s += g.t(`M-12,${ny}L-2,${cy}M12,${ny}L2,${cy}`, c.lanyard, 3.2) + g.r(-8, cy, 16, 21, 2, '#FFFFFF'); }
    // arms
    const top = c.cardigan || c.top;
    r.arms.forEach(A => {
      const r1 = 12.5 * bw, r2 = 10.5 * bw, r3 = 8.5 * Math.sqrt(bw);
      const up = capsule(A.sh, A.el, r1, r2), lo = capsule(A.el, A.hand, r2, r3);
      const fd = nrm(sub(A.hand, A.el)), hd = ellP(add(A.hand, mul(fd, 6)), 10.5, 8.5, angDeg(fd));
      if (c.sleeves === 'long' || c.cardigan) s += g.m([up, lo], top) + g.p(hd, c.skin);
      else { s += g.m([up, lo, hd], c.skin) + g.p(capsule(A.sh, lerp(A.sh, A.el, 0.52), r1 + 2.5, r1 + 2), top); }
    });
    s += r.mid + r.held;
    s += headFront(r.H, c, g, c.tilt);
    s += r.over;
    return s;
  }

  /* ---------------- poses ---------------- */
  const SEATS = {
    chair: { h: 103, back: true }, armchair: { h: 112, back: true, arm: 154 }, sofa: { h: 100, back: true, arm: 142 },
    stool: { h: 106 }, commode: { h: 112, back: true, arm: 160 }, bed_edge: { h: 118 }, none: { h: 103 }
  };
  function seatOf(c) { const name = c.o.seat || (c.defSeat || 'chair'); const si = Object.assign({ name }, SEATS[name] || SEATS.chair); if (c.o.seatHeight) si.h = c.o.seatHeight; return si; }
  function handsOnLap(r) { r.arm('far', onThigh(r.legs.far, 0.62, 22)); r.arm('near', onThigh(r.legs.near, 0.66, 22)); }

  const POSES = {};
  POSES.standing = (c, g) => {
    if (c.view === 'front') { const r = frontRig(c, false); r.shadow = [0, 50]; return r; }
    const old = c.age === 'older';
    const r = makeRig(c, P(0, old ? -208 : -209.5), (old ? 3 : 1) + c.lean, old ? 5 : 1, old ? 5 : 0);
    r.leg('far', P(-7, -16)); r.leg('near', P(5, -16));
    r.armFK('far', 5, 14); r.armFK('near', -3, 10);
    r.shadow = [0, 52];
    return r;
  };
  POSES.walking = (c, g) => {
    const old = c.age === 'older';
    const st = c.o.stride != null ? c.o.stride : (old ? 0.42 : 0.6), dx = st * 72;
    const hipY = -17 - Math.sqrt(192.5 * 192.5 - dx * dx);
    const r = makeRig(c, P(0, hipY), (old ? 5 : 4) + c.lean, old ? 5 : 1, old ? 5 : 0);
    r.leg('near', P(dx, -17), -6);
    r.leg('far', P(-dx + 4, -26), 16);
    r.armFK('near', -16 * st / 0.6, 16); r.armFK('far', 15 * st / 0.6, 28);
    r.shadow = [0, 70];
    return r;
  };
  POSES.stick = (c, g) => {
    const st = c.o.stride != null ? c.o.stride : 0.34, dx = st * 72;
    const hipY = -17 - Math.sqrt(192.5 * 192.5 - dx * dx);
    const r = makeRig(c, P(0, hipY), 6 + c.lean, 5, 5);
    r.leg('far', P(dx, -17), -5);
    r.leg('near', P(-dx + 4, -23), 11);
    const hand = P(30, -190), tip = P(dx + 32, 0);
    r.arm('near', hand); r.armFK('far', -8, 16);
    r.mid = D.stick(g, { hand: r.arms.near.hand, tip, type: c.o.stickType, colour: c.o.stickColour });
    r.shadow = [10, 70];
    return r;
  };
  POSES.walking_frame = (c, g) => {
    const type = c.o.frame || 'standard';
    if (type === 'rollator') {
      const r = makeRig(c, P(0, -207.5), 7 + c.lean, 4, 5);
      r.leg('near', P(14, -16)); r.leg('far', P(-16, -16));
      const bx = 62;
      r.arm('far', P(bx - 16, -192)); r.arm('near', P(bx - 20, -190));
      r.under = G(D.walking_frame(g, { type, far: true, colour: c.frameCol }), 'translate(' + (bx + 8) + ',-5)');
      r.mid = G(D.walking_frame(g, { type, colour: c.frameCol }), 'translate(' + bx + ',0)');
      r.shadow = [50, 100];
      return r;
    }
    const r = makeRig(c, P(0, -207), 9 + c.lean, 4, 6);
    r.leg('near', P(20, -16)); r.leg('far', P(-12, -16));
    const bx = 34, hh = Kit.dims.frameHandle;
    r.arm('far', P(bx + 24, -hh - 7)); r.arm('near', P(bx + 16, -hh - 3));
    r.under = G(D.walking_frame(g, { type, far: true, colour: c.frameCol }), `translate(${bx + 9},-5)`);
    r.mid = G(D.walking_frame(g, { type, colour: c.frameCol }), `translate(${bx},0)`);
    r.shadow = [50, 100];
    return r;
  };
  POSES.seated_side = (c, g) => {
    const si = seatOf(c);
    const old = c.age === 'older';
    const r = makeRig(c, P(0, -si.h - 21), (si.back ? -7 : 3) + c.lean, old ? 5 : 2, (old ? 7 : 4));
    const fx = si.h > 112 ? 80 : 88;
    r.leg('far', P(fx - 6, -16)); r.leg('near', P(fx + 4, -16));
    r.farArmLate = true;
    if (si.arm && c.o.hands !== 'lap') { r.arm('far', P(56, -si.arm - 11)); r.arm('near', P(50, -si.arm - 9)); } else handsOnLap(r);
    seatLayers(r, c, g, si);
    r.shadow = [30, 80];
    return r;
  };
  POSES.seated_front = (c, g) => {
    const si = seatOf(c);
    const r = frontRig(c, true, si.h);
    if (si.name !== 'none' && si.name !== 'bed_edge') { const fn = D[si.name === 'commode' ? 'commode' : si.name]; if (fn) r.under = fn(g, { view: 'front', colour: c.o.seatColour }); }
    r.shadow = [0, 60];
    return r;
  };
  POSES.seated_talking = (c, g) => {
    const si = seatOf(c);
    const r = makeRig(c, P(4, -si.h - 21), 13 + c.lean, 3, -9);
    r.leg('far', P(84, -16)); r.leg('near', P(95, -16));
    r.farArmLate = true;
    r.arm('far', onThigh(r.legs.far, 0.9, 20));
    r.armFK('near', 34, 96);
    seatLayers(r, c, g, si);
    r.shadow = [30, 80];
    return r;
  };
  POSES.rising = (c, g) => {
    c.defSeat = 'armchair';
    const si = seatOf(c);
    const r = makeRig(c, P(30, -si.h - 40), 40 + c.lean, 4, -22);
    r.leg('far', P(58, -16)); r.leg('near', P(66, -16));
    r.farArmLate = true;
    if (c.o.hands === 'crossed') { const ch = add(r.at(0.72), mul(r.fn(0.72), 30)); r.arm('far', add(ch, P(2, -8))); r.arm('near', add(ch, P(-4, 6))); }
    else if (si.arm) { r.arm('far', P(52, -si.arm - 11)); r.arm('near', P(46, -si.arm - 9)); }
    else { r.arm('far', onThigh(r.legs.far, 0.85, 18)); r.arm('near', onThigh(r.legs.near, 0.85, 18)); }
    seatLayers(r, c, g, si);
    r.shadow = [40, 80];
    return r;
  };
  POSES.kneeling = (c, g) => {
    const r = makeRig(c, P(0, -114), 5 + c.lean, 2, 6);
    const downNear = c.o.knee !== 'far';
    const down = downNear ? 'near' : 'far', upL = downNear ? 'far' : 'near';
    r.legK(down, P(-4, -15), P(-94, -12), 180);
    r.leg(upL, P(86, -16), 0);
    r.farArmLate = true;
    if (c.o.reach === false) r.arm('near', onThigh(r.legs[upL], 0.95, 22));
    else r.armFK('near', 42, 22);
    r.arm('far', onThigh(r.legs[upL], 0.6, 20));
    r.shadow = [0, 90];
    return r;
  };
  POSES.reaching_up = (c, g) => {
    const tip = c.o.tiptoe !== false;
    const r = makeRig(c, P(0, tip ? -214 : -209), -4 + c.lean, 0, -22);
    r.leg('near', P(5, tip ? -24 : -16), tip ? 14 : 0); r.leg('far', P(-7, tip ? -24 : -16), tip ? 14 : 0);
    r.arm('near', P(36, -436));
    r.armFK('far', -6, 18);
    r.shadow = [0, 52];
    return r;
  };
  POSES.on_floor = (c, g) => {
    if (c.o.variant === 'lying') {
      const r = makeRig(c, P(0, -26), -88 + c.lean, 0, 8);
      r.leg('near', P(118, -15), -40); r.leg('far', P(188, -14), -82);
      r.armFK('near', 10, 8); r.armFK('far', 8, 6);
      r.shadow = [-20, 150];
      return r;
    }
    const r = makeRig(c, P(0, -25), -26 + c.lean, 3, 24);
    r.leg('near', P(76, -15), -8); r.leg('far', P(180, -15), -58);
    r.arm('far', P(-86, -11), 1);
    const kn = r.legs.near.knee; r.arm('near', add(kn, P(-2, -22)));
    r.shadow = [40, 140];
    return r;
  };
  POSES.lying_bed = (c, g) => {
    const B = bedInfo(c);
    const hip = P(B.hipX, -B.mt - 24);
    const r = makeRig(c, hip, -84 + c.lean, 0, 14);
    r.leg('far', P(hip.x + 182, -B.mt - 14), -80); r.leg('near', P(hip.x + 189, -B.mt - 15), -84);
    r.armFK('near', 8, 6);
    r.armFK('far', 6, 8);
    bedLayers(r, c, g, B, 0.8);
    return r;
  };
  POSES.sitting_up_bed = (c, g) => {
    const B = bedInfo(c, true);
    const hip = P(B.hingeX + 15, -B.mt - 24);
    const r = makeRig(c, hip, -(90 - B.back) + c.lean, 3, 8);
    r.leg('far', P(hip.x + 182, -B.mt - 14), -80); r.leg('near', P(hip.x + 188, -B.mt - 15), -82);
    if (c.o.hands === 'reach') { r.armFK('near', 70, 10); r.arm('far', onThigh(r.legs.far, 0.6, 30)); }
    else { r.arm('near', onThigh(r.legs.near, 0.55, 34)); r.arm('far', onThigh(r.legs.far, 0.4, 32)); }
    bedLayers(r, c, g, B, 0.3);
    return r;
  };
  POSES.wheelchair = (c, g) => {
    const r = makeRig(c, P(0, -Kit.dims.wheelchairSeat - 21), -2 + c.lean, 3, 3);
    r.leg('far', P(100, -46)); r.leg('near', P(109, -46));
    r.farArmLate = true;
    if (c.o.hands === 'rims') { r.arm('near', P(20, -127)); r.arm('far', P(26, -131)); }
    else handsOnLap(r);
    r.under = D.wheelchair(g, { part: 'back', colour: c.frameCol });
    r.mid = D.wheelchair(g, { part: 'front', colour: c.frameCol });
    r.shadow = [30, 110];
    return r;
  };
  POSES.pushing = (c, g) => { // standing behind a wheelchair or trolley, both hands forward on handles
    const r = makeRig(c, P(0, -208), 10 + c.lean, 3, 6);
    r.leg('near', P(18, -16)); r.leg('far', P(-22, -20), 8);
    r.arm('near', P(56, -222)); r.arm('far', P(60, -226));
    r.shadow = [0, 60];
    return r;
  };
  POSES.arm_in_arm = POSES.walking;
  Kit.poses = Object.keys(POSES);

  function seatLayers(r, c, g, si) {
    if (!si || si.name === 'none' || si.name === 'bed_edge') return;
    const o = { colour: c.o.seatColour };
    if (si.name === 'armchair') { r.under = D.armchair(g, Object.assign({ part: 'back' }, o)); r.mid = D.armchair(g, Object.assign({ part: 'front' }, o)); }
    else if (si.name === 'sofa') { r.under = D.sofa(g, Object.assign({ view: 'side', part: 'back' }, o)); r.mid = D.sofa(g, Object.assign({ view: 'side', part: 'front' }, o)); }
    else if (si.name === 'commode') { r.under = D.commode(g, Object.assign({ part: 'back' }, o)); r.mid = D.commode(g, Object.assign({ part: 'front' }, o)); }
    else if (D[si.name]) r.under = D[si.name](g, o);
  }
  function bedInfo(c, sitting) {
    const o = c.o, type = o.bed || 'hospital';
    const mt = o.bedHeight || (type === 'domestic' ? Kit.dims.domesticBedTop : Kit.dims.hospitalBedTop);
    return { type, mt, hipX: -6, hingeX: -72, back: sitting ? (o.backrest || 60) : 0, rails: o.rails || (type === 'hospital' ? 'down' : 'none'), draw: type !== 'none' };
  }
  function bedLayers(r, c, g, B, fromU) {
    const bo = { type: B.type, height: B.mt, backrest: B.back, rails: B.rails, colour: c.o.bedColour, blanket: c.o.blanket };
    if (B.draw) r.under = D.bed(g, Object.assign({ part: 'back' }, bo));
    if (B.back) {
      const dd = P(-Math.cos(B.back * R), -Math.sin(B.back * R)), p0 = P(B.hingeX, -B.mt);
      const k = (r.H.x - p0.x) * dd.x + (r.H.y - p0.y) * dd.y, pp = add(p0, mul(dd, k - 14));
      r.under += D.pillow(g, { _inner: true, x: pp.x, y: pp.y, angle: B.back, w: 84, thick: 34 });
    } else r.under += D.pillow(g, { _inner: true, x: r.H.x - 2, y: -B.mt, w: 104 });
    if (c.o.blanket !== false) r.mid = blanketOver(r, c, g, B, fromU);
    if (B.draw) r.over = D.bed(g, Object.assign({ part: 'front' }, bo));
  }
  function blanketOver(r, c, g, B, fromU) {
    const col = cc(c.o.blanket || (B.type === 'domestic' ? 'sage' : '#DDE8EE'));
    const fnB = r.fn(0.5);
    const topOf = (L, f, rad) => { const d = nrm(sub(L.b, L.a)); let n = P(d.y, -d.x); if (n.y > 0) n = mul(n, -1); return add(lerp(L.a, L.b, f), mul(n, rad + 7)); };
    const pts = [];
    const u0 = fromU;
    [u0, u0 - 0.15, 0.4, 0.15].filter((u, i, a) => u <= u0 && (i === 0 || u < a[i - 1])).forEach(u => pts.push(add(r.at(u), mul(r.fn(u), 30 * c.bw))));
    const Ln = r.legs.near, [ra, rb, rcx] = legRadii(c);
    pts.push(topOf({ a: Ln.hip, b: Ln.knee }, 0.3, ra));
    pts.push(topOf({ a: Ln.hip, b: Ln.knee }, 1, rb));
    pts.push(topOf({ a: Ln.knee, b: Ln.ankle }, 0.6, (rb + rcx) / 2));
    const toe = add(Ln.ankle, rot(P(40, 4), Ln.foot));
    pts.push(add(toe, P(4, -8)));
    const footX = B.draw ? 222 : toe.x + 30;
    const topY = -B.mt;
    pts.push(P(Math.min(footX - 6, toe.x + 26), topY - 4));
    const drape = B.type === 'domestic' ? 62 : 46;
    const x0 = pts[0].x;
    let d = smooth(pts, false, 0.9);
    d += `L${n1(footX)},${n1(topY)}L${n1(footX)},${n1(topY + drape)}`;
    const wav = [];
    for (let x = footX; x >= x0 - 8; x -= 36) wav.push(P(x, topY + drape + (Math.round((footX - x) / 36) % 2 ? 4 : 0)));
    d += wav.map(p => 'L' + pt(p)).join('');
    d += `L${n1(x0 - 8)},${n1(pts[0].y + 6)}Z`;
    let s = g.p(d, col);
    // folded top edge
    if (B.type !== 'domestic' && fromU > 0.5) {
      const a = pts[0], b = lerp(pts[0], pts[1] || pts[0], 0.6);
      s += g.p(`M${pt(add(a, P(-8, 4)))}L${pt(add(b, P(0, -2)))}L${n1(b.x + 2)},${n1(topY + drape)}L${n1(a.x - 8)},${n1(topY + drape)}Z`, '#FFFFFF');
    }
    return s;
  }

  /* ---------------- public: person ---------------- */
  Kit.person = function (o = {}) {
    const c = config(o);
    const s = o.scale == null ? 1 : o.scale, fx = o.facing === 'left' ? -1 : 1;
    const g = pen(Kit.LW / s);
    const pose = POSES[o.pose || 'standing'] ? (o.pose || 'standing') : 'standing';
    const r = POSES[pose](c, g);
    const toLocal = q => P((q.x - (o.x || 0)) / (s * fx), (q.y - (o.y || 0)) / s);
    if (o.hands && !r.front) ['near', 'far'].forEach(w => { const h = o.hands[w]; if (h && typeof h === 'object') r.arm(w, toLocal(h), h.bend || 1); });
    if (o.hold && !r.front && r.arms.near) r.held = held(g, o.hold, r.arms.near);
    let body = r.front ? drawFront(r, c, g) : drawSide(r, c, g);
    const sh = o.shadow === false || !r.shadow ? '' : shadowEl(r.shadow[0], r.shadow[1], 2);
    return G(sh + body, T(o.x || 0, o.y || 0, s, fx));
  };
  /* scene position of a named joint, e.g. to aim another person's hand at it */
  Kit.joint = function (o, name) {
    const c = config(o), s = o.scale == null ? 1 : o.scale, fx = o.facing === 'left' ? -1 : 1;
    const r = POSES[o.pose || 'standing'](c, pen(1));
    const map = { head: r.H, shoulder: r.S, hip: r.hip, nearHand: r.arms && r.arms.near && r.arms.near.hand, farHand: r.arms && r.arms.far && r.arms.far.hand, nearElbow: r.arms && r.arms.near && r.arms.near.el, nearKnee: r.legs && r.legs.near && r.legs.near.knee };
    const p = map[name]; if (!p || r.front) return null;
    return P((o.x || 0) + p.x * s * fx, (o.y || 0) + p.y * s);
  };
  function held(g, what, A) {
    const fd = nrm(sub(A.hand, A.el)), hc = add(A.hand, mul(fd, 6));
    const tr = `translate(${pt(hc)})`;
    switch (what) {
      case 'cup': return G(D.cup(g, { s: 0.8 }), tr + ' translate(-8,14)');
      case 'glass': return G(D.glass(g, { s: 0.8 }), tr + ' translate(-6,16)');
      case 'phone': return G(g.r(-6, -18, 13, 24, 3, '#2F3A40'), tr + ` rotate(${n1(angDeg(fd) - 90)})`);
      case 'notepad': return G(D.notepad(g, { s: 0.55 }), tr + ' translate(-10,4)');
      case 'bag': return G(D.bag_of_medicines(g, { s: 0.6 }), tr + ' translate(-2,52)');
      case 'pill_organiser': return G(D.pill_organiser(g, { s: 0.42 }), tr + ' translate(2,6)');
      case 'tablet_box': return G(D.medicine_bottle(g, { type: 'box', s: 0.8 }), tr + ' translate(0,12)');
      default: return '';
    }
  }
  /* two walkers arm in arm: a = far person (drawn first), b = near person. b may use pose 'stick'. */
  Kit.linkArms = function (a, b) {
    const s = b.scale == null ? 1 : b.scale, fx = b.facing === 'left' ? -1 : 1;
    const A = Object.assign({ pose: 'walking' }, a, { facing: b.facing, scale: s });
    if (A.x == null) A.x = (b.x || 0) + 84 * s * fx;
    if (A.y == null) A.y = (b.y || 0) - 3 * s;
    // A's near arm: elbow bent, forearm forward at waist height
    const cA = config(A), gA = pen(Kit.LW / s), rA = POSES[A.pose](cA, gA);
    rA.armFK('near', -4, 84);
    const ar = rA.arms.near, target = lerp(ar.el, ar.hand, 0.55);
    const scenePt = P(A.x + target.x * s * fx, A.y + (target.y - 12) * s);
    const B = Object.assign({ pose: 'walking' }, b);
    B.hands = Object.assign({}, b.hands || {}, { far: scenePt });
    const aMark = (() => { const body = drawSide(rA, cA, gA); return G(shadowEl(rA.shadow[0], rA.shadow[1], 2) + body, T(A.x, A.y, s, fx)); })();
    return aMark + Kit.person(B);
  };

  /* ================================================================== PROPS */
  const D = {};
  Kit.draws = D;
  function prop(name, fn) {
    D[name] = fn;
    Kit[name] = function (o = {}) { const s = o.scale == null ? 1 : o.scale; const g = pen(Kit.LW / s); return G(fn(g, o), T(o.x || 0, o.y || 0, s, o.facing === 'left' ? -1 : 1)); };
  }

  /* ---- seating ---- */
  prop('chair', (g, o) => {
    const w = cc(o.colour) || PR.wood, dk = shade(w, 0.8), pad = o.cushion ? cc(o.cushion) : null;
    if (o.view === 'front') {
      let s = g.l([P(-40, -100), P(-42, -208)], 9, dk) + g.l([P(40, -100), P(42, -208)], 9, dk);
      s += g.r(-48, -214, 96, 22, 6, w) + g.r(-42, -160, 84, 10, 4, w);
      s += g.l([P(-40, -94), P(-40, -2)], 9, dk) + g.l([P(40, -94), P(40, -2)], 9, dk);
      s += g.l([P(-46, -94), P(-46, 0)], 10, w) + g.l([P(46, -94), P(46, 0)], 10, w);
      s += g.r(-54, -104, 108, 12, 4, w);
      if (pad) s += g.r(-50, -112, 100, 10, 5, pad);
      return s;
    }
    let s = g.l([P(-40, 0), P(-38, -98), P(-49, -208)], 9, dk);
    s += g.r(-57, -214, 17, 38, 6, w) + g.r(-51, -160, 13, 14, 4, w);
    s += g.l([P(-38, -34), P(60, -34)], 5, dk);
    s += g.l([P(60, -92), P(61, 0)], 9, w);
    s += g.r(-48, -103, 114, 10, 4, w);
    if (pad) s += g.r(-42, -111, 104, 10, 5, pad);
    return s;
  });
  prop('stool', (g, o) => { const w = cc(o.colour) || PR.wood, dk = shade(w, 0.8); return g.l([P(-30, -98), P(-36, 0)], 8, dk) + g.l([P(30, -98), P(36, 0)], 8, w) + g.l([P(-33, -40), P(33, -40)], 5, dk) + g.r(-42, -106, 84, 10, 5, w); });
  prop('armchair', (g, o) => {
    const f = cc(o.colour) || Kit.C.teal, fd = shade(f, 0.82), fl = shade(f, 1.12), w = PR.woodDk;
    const part = o.part || 'all';
    if (o.view === 'front') {
      let s = g.p('M-66,-300C-66,-314 66,-314 66,-300L64,-96L-64,-96Z', f);
      s += g.p('M-66,-296C-86,-292 -92,-268 -90,-240L-84,-160L-64,-150Z', fd) + g.p('M66,-296C86,-292 92,-268 90,-240L84,-160L64,-150Z', fd);
      s += g.l([P(-70, -30), P(-72, 0)], 9, w) + g.l([P(70, -30), P(72, 0)], 9, w);
      s += g.r(-80, -92, 160, 64, 10, fd);
      s += g.r(-66, -114, 132, 28, 10, fl);
      s += g.r(-92, -166, 30, 136, 12, f) + g.r(62, -166, 30, 136, 12, f);
      return s;
    }
    let back = '';
    back += g.l([P(-60, -30), P(-62, 0)], 9, w) + g.l([P(70, -30), P(72, 0)], 9, w);
    back += G(g.r(-15, -104, 30, 212, 13, f), 'translate(-54,-196) rotate(-4)');
    back += g.p('M-46,-298C-28,-298 -17,-287 -15,-270C-13,-250 -24,-234 -40,-222Z', fd);
    back += g.r(-66, -90, 146, 62, 10, fd);
    back += g.r(-42, -114, 124, 28, 11, fl);
    let front = g.r(60, -150, 16, 64, 5, w) + g.r(-46, -164, 124, 20, 10, f);
    return part === 'back' ? back : part === 'front' ? front : back + front;
  });
  prop('sofa', (g, o) => {
    const f = cc(o.colour) || Kit.C.sage, fd = shade(f, 0.83), fl = shade(f, 1.1), w = PR.woodDk;
    const seats = o.seats || 3, W = seats * 110 + 70, hw = W / 2;
    if (o.view === 'side') {
      const part = o.part || 'all';
      let back = g.l([P(-56, -24), P(-58, 0)], 8, w) + g.l([P(74, -24), P(76, 0)], 8, w);
      back += G(g.r(-16, -98, 32, 196, 14, f), 'translate(-56,-150) rotate(-8)');
      back += g.r(-68, -80, 150, 58, 10, fd) + g.r(-44, -104, 128, 26, 11, fl);
      const front = g.r(-60, -150, 142, 30, 14, f) + g.r(56, -130, 26, 104, 10, f);
      return part === 'back' ? back : part === 'front' ? front : back + front;
    }
    let s = g.l([P(-hw + 22, -24), P(-hw + 20, 0)], 9, w) + g.l([P(hw - 22, -24), P(hw - 20, 0)], 9, w);
    s += g.r(-hw + 20, -236, W - 40, 150, 22, f);
    for (let i = 0; i < seats; i++) s += g.r(-hw + 36 + i * 110, -224, 104, 118, 18, fl);
    s += g.r(-hw + 10, -84, W - 20, 62, 12, fd);
    for (let i = 0; i < seats; i++) s += g.r(-hw + 36 + i * 110, -110, 104, 30, 12, fl);
    s += g.r(-hw, -152, 44, 130, 18, f) + g.r(hw - 44, -152, 44, 130, 18, f);
    return s;
  });

  /* ---- beds ---- */
  prop('bed', (g, o) => {
    const type = o.type || 'hospital', part = o.part || 'all';
    if (type === 'domestic') {
      const mt = o.height || Kit.dims.domesticBedTop, f = cc(o.colour) || Kit.C.pale, head = shade(f, 0.85);
      let back = g.r(-238, -270, 22, 262, 10, head) + g.l([P(-212, -20), P(-212, 0)], 8, PR.woodDk) + g.l([P(212, -20), P(212, 0)], 8, PR.woodDk);
      back += g.r(-220, -mt + 32, 440, mt - 52, 8, f);
      back += g.r(-220, -mt, 440, 34, 12, PR.mattress);
      return part === 'front' ? '' : back;
    }
    const mt = o.height || Kit.dims.hospitalBedTop, beta = o.backrest || 0, hx = -72, pl = mt - 36;
    const frame = cc(o.colour) || '#8D999F', dk = shade(frame, 0.8), board = '#D7E3E2';
    let b = '';
    b += g.r(-238, -mt - 66, 22, mt + 6, 9, board) + g.r(216, -mt - 44, 22, mt - 14, 9, board);
    [-196, 196].forEach(x => { b += g.r(x - 8, -36, 16, 16, 3, dk) + g.c(x, -11, 11, PR.tyre) + g.c(x, -11, 3.5, PR.metal); });
    b += g.r(-206, -44, 412, 12, 5, dk);
    b += g.r(-132, -pl + 6, 20, pl - 50, 4, frame) + g.r(112, -pl + 6, 20, pl - 50, 4, frame);
    // backrest section pivots about the mattress top at the hinge, so its surface passes through (hx, -mt)
    const piv = P(hx, -mt), secL = hx + 214;
    const rp = pts => 'M' + pts.map(q => pt(add(piv, rot(q, beta)))).join('L') + 'Z';
    b += g.m([rrP(hx, -pl, 214 - hx, 9, 3), beta ? rp([P(-secL, 36), P(0, 36), P(0, 45), P(-secL, 45)]) : rrP(-214, -pl, secL, 9, 3)], frame);
    b += g.m([rrP(hx - 2, -mt, 216 - hx, 36, 10), beta ? rp([P(-secL, 0), P(0, 0), P(0, 36), P(-secL, 36)]) : rrP(-214, -mt, secL + 4, 36, 10), beta ? circP(P(hx, -mt + 18), 18) : null], PR.mattress);
    b += g.c(hx, -pl + 4, 6, dk);
    let f = '';
    const rails = o.rails || 'down';
    if (rails !== 'none') {
      const up = rails === 'up';
      const rail = (x0, x1) => { const y1 = up ? -64 : 40, y0 = up ? -12 : 62; let s = g.r(x0, y1, x1 - x0, 10, 5, PR.metal) + g.r(x0, y0 - 10, x1 - x0, 9, 4, PR.metal); for (let x = x0 + 16; x < x1 - 8; x += (x1 - x0 - 16) / 3) s += g.l([P(x, y1 + 8), P(x, y0 - 8)], 4, PR.metal); return s; };
      f += G(rail(-126, 6), `translate(${hx},${-mt}) rotate(${n1(beta)})`);
      f += G(rail(20, 184), `translate(0,${-mt})`);
    }
    return part === 'back' ? b : part === 'front' ? f : b + f;
  });
  prop('pillow', (g, o) => {
    // (x, y) = the middle of the pillow's underside; angle tilts it (used against a raised backrest)
    const w = o.w || 100, f = o.colour ? cc(o.colour) : PR.linen;
    const th = o.thick || 26; const d = `M${-w / 2},-2C${-w / 2 - 2},${-th} ${w / 2 + 2},${-th} ${w / 2},-2C${w / 2 + 3},0 ${w / 2},1 ${w / 2 - 6},1L${-w / 2 + 6},1C${-w / 2},1 ${-w / 2 - 3},0 ${-w / 2},-2Z`;
    return (o.x || o.y || o.angle) && o._inner ? G(g.p(d, f), `translate(${n1(o.x || 0)},${n1(o.y || 0)}) rotate(${n1(o.angle || 0)})`) : g.p(d, f);
  });
  prop('blanket', (g, o) => {
    const f = cc(o.colour) || Kit.C.sage, w = o.w || 120;
    if (o.type === 'spread') return g.r(-w / 2, -8, w, 8, 3, f);
    let s = '';
    for (let i = 0; i < 3; i++) s += g.r(-w / 2, -14 - i * 14, w, 14, 6, i === 1 ? shade(f, 1.12) : f);
    return s + g.t(`M${-w / 2 + 8},-21H${w / 2 - 8}`, shade(f, 0.75), 1.6);
  });
  prop('bedside_table', (g, o) => {
    const f = cc(o.colour) || '#E4ECEB', h = Kit.dims.bedsideTop, w = o.w || 96;
    let s = g.r(-w / 2 + 6, -26, 14, 14, 3, PR.rubber) + g.r(w / 2 - 20, -26, 14, 14, 3, PR.rubber) + g.c(-w / 2 + 13, -8, 8, PR.tyre) + g.c(w / 2 - 13, -8, 8, PR.tyre);
    s += g.r(-w / 2, -h + 8, w, h - 30, 6, f);
    s += g.r(-w / 2 - 4, -h, w + 8, 12, 4, shade(f, 1.1));
    s += g.t(`M${-w / 2 + 8},${-h + 50}H${w / 2 - 8}`, shade(f, 0.7), 2) + g.r(-14, -h + 28, 28, 6, 3, Kit.C.grey);
    s += g.r(-w / 2 + 8, -h + 60, w - 16, h - 94, 4, shade(f, 1.05)) + g.r(w / 2 - 22, -h + 80, 6, 30, 3, Kit.C.grey);
    return s;
  });
  prop('over_bed_table', (g, o) => {
    const h = o.height || Kit.dims.overBedTop, f = cc(o.colour) || '#E8E1D3', m = PR.metalDk;
    let s = g.r(-40, -22, 110, 10, 4, m) + g.c(-32, -8, 8, PR.tyre) + g.c(62, -8, 8, PR.tyre);
    s += g.r(52, -h + 6, 14, h - 26, 4, PR.metal);
    s += g.r(-96, -h, 170, 13, 5, f);
    return s;
  });

  /* ---- mobility ---- */
  prop('walking_frame', (g, o) => {
    const type = o.type || 'standard', far = !!o.far;
    const m = far ? shade(cc(o.colour) || PR.metal, 0.82) : (cc(o.colour) || PR.metal), grip = far ? '#3E474C' : '#4E5A61', hh = o.height || Kit.dims.frameHandle;
    if (type === 'rollator') {
      let s = g.l([P(0, -19), P(-4, -150), P(-10, -hh)], 7, m) + g.l([P(116, -19), P(-2, -150)], 7, m);
      s += g.l([P(-10, -hh), P(-34, -hh + 2)], 11, grip) + g.t(`M-16,${-hh + 9}Q-30,${-hh + 14} -38,${-hh + 8}`, OL, 2.4);
      if (!far) { s += g.r(2, -150, 88, 9, 4, Kit.C.slate) + g.p('M8,-140L84,-140L76,-98L16,-98Z', 'rgba(185,205,204,.55)') + g.t('M14,-124H80M12,-110H78M32,-140L30,-98M54,-140L54,-98', OL, 1.4); }
      s += g.c(0, -19, 18, PR.tyre) + g.c(0, -19, 6, m) + g.c(116, -19, 18, PR.tyre) + g.c(116, -19, 6, m);
      return s;
    }
    let s = g.ld(`M0,${type === 'wheeled' ? -2 : -6}L4,${-hh + 16}Q5,${-hh} 20,${-hh}L84,${-hh}Q98,${-hh} 98,${-hh + 16}L101,${type === 'wheeled' ? -26 : -6}`, 7, m);
    s += g.l([P(2, -78), P(100, -78)], 5, m);
    s += g.l([P(12, -hh), P(54, -hh)], 12, grip);
    if (!far) s += g.c(98, -128, 5.5, m);
    s += g.r(-5, -12, 11, 13, 4, PR.rubber);
    s += type === 'wheeled' ? g.l([P(101, -28), P(104, -14)], 6, m) + g.c(104, -13, 13, PR.tyre) + g.c(104, -13, 4, m) : g.r(96, -12, 11, 13, 4, PR.rubber);
    return s;
  });
  prop('stick', (g, o) => {
    // either {hand, tip} points (used by poses) or standalone at (x,y)=tip with angle and length
    const hand = o.hand || rot(P(0, -(o.length || 190)), o.angle || 0), tip = o.tip || P(0, 0);
    const col = cc(o.colour) || '#7B5335', type = o.type || 'crook';
    const u = nrm(sub(hand, tip)), f = P(-u.y, u.x);
    const q = (a, b) => add(add(hand, mul(u, a)), mul(f, b));
    let s = g.l([tip, add(hand, mul(u, 6))], 7, col);
    if (type === 'derby') s += g.ld(`M${pt(q(4, -4))}C${pt(q(12, -6))} ${pt(q(14, 20))} ${pt(q(6, 26))}`, 9, col);
    else if (type === 'offset') s += g.ld(`M${pt(q(2, 0))}L${pt(q(14, 6))}L${pt(q(14, 30))}`, 8, col);
    else s += g.ld(`M${pt(q(4, 0))}C${pt(q(22, 0))} ${pt(q(26, 26))} ${pt(q(8, 28))}`, 7, col);
    s += g.l([add(tip, mul(u, 2)), add(tip, mul(u, 12))], 10, PR.rubber, 'butt');
    return s;
  });
  prop('wheelchair', (g, o) => {
    const part = o.part || 'all', fr = cc(o.colour) || '#4F5E67', sl = '#2E373C', frd = shade(fr, 0.8);
    const ax = P(-10, -68);
    const wheel = (c, dark) => {
      const tyre = dark ? '#262C30' : PR.tyre, mt = dark ? PR.metalDk : PR.metal;
      let s = `<circle cx="${n1(c.x)}" cy="${n1(c.y)}" r="64" fill="none" stroke="${OL}" stroke-width="${n1(9 + 2 * g.lw)}"/><circle cx="${n1(c.x)}" cy="${n1(c.y)}" r="64" fill="none" stroke="${tyre}" stroke-width="9"/>`;
      s += `<circle cx="${n1(c.x)}" cy="${n1(c.y)}" r="58.5" fill="none" stroke="${mt}" stroke-width="2.5"/>`;
      let sp = ''; for (let a = 0; a < 360; a += 30) { const e = add(c, rot(P(58, 0), a + 8)); sp += `M${pt(c)}L${pt(e)}`; }
      s += `<path d="${sp}" stroke="${dark ? '#8E999F' : '#AAB4B9'}" stroke-width="1.3" fill="none"/>`;
      s += `<circle cx="${n1(c.x)}" cy="${n1(c.y)}" r="53" fill="none" stroke="${OL}" stroke-width="${n1(3.5 + 2 * g.lw)}"/><circle cx="${n1(c.x)}" cy="${n1(c.y)}" r="53" fill="none" stroke="${mt}" stroke-width="3.5"/>`;
      return s + g.c(c.x, c.y, 7, mt);
    };
    const castor = (c, dark) => g.l([P(c.x, c.y), P(c.x - 4, -64)], 5, dark ? frd : fr) + g.c(c.x, c.y, 18, dark ? '#262C30' : PR.tyre) + g.c(c.x, c.y, 5, PR.metal);
    let back = '';
    back += G(wheel(ax, true) + castor(P(100, -18), true), 'translate(8,-4)');
    back += g.l([P(-28, -114), P(-34, -234), P(-58, -237)], 6, frd) + g.l([P(-50, -237), P(-64, -238)], 9, '#23292C');
    back += g.r(-42, -226, 15, 108, 5, sl);
    back += g.r(-32, -121, 118, 9, 4, sl);
    back += g.r(104, -30, 48, 6, 2, frd);
    let front = '';
    front += wheel(ax, false);
    front += g.l([P(-26, -112), P(86, -112)], 6, fr) + g.l([P(86, -112), P(98, -66)], 6, fr) + g.l([P(98, -64), P(0, -64)], 5, fr);
    front += g.l([P(88, -108), P(114, -34)], 5, fr);
    front += g.l([P(-18, -170), P(-18, -114)], 5, fr) + g.l([P(52, -170), P(52, -114)], 5, fr) + g.r(-26, -178, 88, 10, 5, sl);
    front += castor(P(100, -18), false);
    return part === 'back' ? back : part === 'front' ? front : back + front;
  });

  /* ---- bedside and tabletop objects (y = the surface they stand on) ---- */
  prop('call_bell', (g, o) => {
    const a = o.angle || 0, col = o.colour ? cc(o.colour) : '#E9EDEC';
    let s = '';
    if (o.cable !== false) {
      const to = o.cableTo || P(80, 30);
      s += g.ld(`M0,4C0,24 ${n1(to.x * 0.3)},${n1(to.y + 10)} ${n1(to.x * 0.6)},${n1(to.y)}S${n1(to.x)},${n1(to.y - 6)} ${n1(to.x)},${n1(to.y)}`, 3.5, '#5B6770');
    }
    const body = g.r(-15, -62, 30, 66, 14, col) + g.c(0, -40, 10.5, PR.red) + g.c(0, -40, 5, shade(PR.red, 1.25)) + g.t('M-7,-14H7M-7,-6H7', shade(col, 0.7), 2);
    s += G(body, `rotate(${n1(a)})`);
    return s;
  });
  prop('glasses', (g, o) => {
    const fr = cc(o.colour) || '#3B4A52';
    if (o.folded) return g.r(-26, -12, 52, 12, 5, 'rgba(227,241,242,.9)') + g.t('M-24,-10H24', fr, 2.6);
    return g.t('M-30,-14L-40,-22M30,-14L40,-22', fr, 2.8) + g.r(-31, -24, 26, 18, 7, 'rgba(227,241,242,.9)') + g.r(5, -24, 26, 18, 7, 'rgba(227,241,242,.9)') + g.t('M-5,-18Q0,-22 5,-18', fr, 2.8) + g.t('M-28,-24H-8M8,-24H28', fr, 2.2);
  });
  prop('hearing_aid', (g, o) => {
    // behind-the-ear aid drawn large as an object: body, clear ear hook, thin tube and dome
    const col = cc(o.colour) || '#A7B1B6';
    let s = g.ld('M-4,-78C4,-98 30,-100 38,-80C44,-64 40,-50 34,-40', 5, 'rgba(214,230,232,.95)');
    s += g.ld('M34,-40C28,-28 30,-14 42,-8', 2.4, 'rgba(214,230,232,.95)');
    s += g.e(46, -6, 8, 6, 'rgba(236,242,242,.95)', -25);
    s += g.p('M-8,-80C0,-84 6,-76 6,-62C6,-40 -2,-16 -16,-4C-24,2 -32,-2 -30,-10C-22,-24 -18,-44 -18,-60C-18,-72 -14,-78 -8,-80Z', col);
    s += g.c(-6, -66, 3.5, shade(col, 0.6)) + g.t('M-26,-14C-18,-18 -12,-24 -10,-30', shade(col, 0.7), 1.8);
    return s;
  });
  prop('pill_organiser', (g, o) => {
    const rows = o.rows || 1, cols = 7, cw = 26, rh = rows === 1 ? 30 : 22, W = cols * cw + 12, H = rows * rh + 12;
    const lids = ['#DCEBEA', '#EFE6D6', '#B9CDCC', '#F1D9A7'];
    const open = o.open === 'all' ? null : new Set(o.open || []);
    const pills = o.pills == null ? 3 : o.pills;
    const isOpen = i => open === null || open.has(i);
    const pc = ['#FFFFFF', '#D9A441', '#C98B86', '#FFFFFF', '#B9CDCC'];
    let s = g.r(-W / 2, -H, W, H, 6, '#F7F8F7');
    for (let rr = 0; rr < rows; rr++) for (let k = 0; k < cols; k++) {
      const i = rr * cols + k, x = -W / 2 + 6 + k * cw, y = -H + 6 + rr * rh;
      if (isOpen(i)) {
        s += g.r(x + 1, y + 1, cw - 2, rh - 2, 4, '#E6ECEB');
        const n = typeof pills === 'function' ? pills(i) : Array.isArray(pills) ? pills[i] || 0 : pills;
        for (let p = 0; p < n; p++) s += g.e(x + 7 + (p % 2) * 11, y + rh - 8 - Math.floor(p / 2) * 7, 4.5, 3, pc[(i + p) % pc.length]);
        if (rr === 0) s += g.r(x + 2, y - 10, cw - 4, 7, 3, lids[rr % 4]);
      } else s += g.r(x + 1, y + 1, cw - 2, rh - 2, 4, lids[rr % 4]) + g.t(`M${x + 9},${y + rh - 6}H${x + cw - 9}`, shade(lids[rr % 4], 0.75), 2);
    }
    return s;
  });
  prop('medicine_bottle', (g, o) => {
    if (o.type === 'box') { const f = cc(o.colour) || '#FFFFFF'; return g.r(-24, -34, 48, 34, 3, f) + g.r(-24, -34, 48, 9, 2, cc(o.band) || Kit.C.teal); }
    if (o.type === 'blister') return g.r(-26, -40, 52, 40, 4, '#DDE3E4') + [0, 1, 2].map(r2 => [0, 1].map(k => g.e(-12 + k * 24, -32 + r2 * 12, 7, 4, '#FFFFFF')).join('')).join('');
    const f = o.colour ? cc(o.colour) : '#B8651F';
    return g.r(-18, -58, 36, 58, 7, f) + g.r(-14, -74, 28, 18, 4, '#F6F7F6') + g.t('M-10,-70H10M-10,-64H10', '#C9CFCF', 1.6) + g.r(-14, -44, 28, 26, 2, '#FFFFFF');
  });
  prop('cup', (g, o) => { const f = cc(o.colour) || Kit.C.teal; return g.ld('M16,-30C30,-30 30,-10 14,-11', 5, f) + g.p('M-17,-40L17,-40L15,-4C15,-1 13,0 10,0L-10,0C-13,0 -15,-1 -15,-4Z', f) + g.t('M-15,-34H15', shade(f, 1.25), 2); });
  prop('glass', (g, o) => { const lvl = o.level == null ? 0.6 : o.level; const top = -46, wy = n1(top + (1 - lvl) * 44); return g.f(`M${-15 + (1 - lvl) * 1.6},${wy}L${15 - (1 - lvl) * 1.6},${wy}L13,-3L-13,-3Z`, PR.water) + g.p('M-17,-46L17,-46L14,-2C14,-1 13,0 12,0L-12,0C-13,0 -14,-1 -14,-2Z', 'none') + g.t('M-9,-38L-7,-10', '#FFFFFF', 3); });
  prop('water_jug', (g, o) => {
    const lid = cc(o.lid) || Kit.C.teal, lvl = o.level == null ? 0.7 : o.level;
    let s = g.p('M-26,-78L24,-78L28,-6C28,-2 25,0 21,0L-21,0C-25,0 -28,-2 -28,-6Z', 'rgba(232,242,243,.95)');
    s += g.f(`M${-26.5},${n1(-6 - 66 * lvl)}L${26.5},${n1(-6 - 66 * lvl)}L27,-6C27,-3 25,-2 21,-2L-21,-2C-25,-2 -27,-3 -27,-6Z`, PR.water);
    s += g.p('M-26,-78L-26,-78', 'none') + g.ld('M26,-66C44,-64 46,-30 28,-24', 6, 'rgba(232,242,243,.95)');
    s += g.p('M-30,-86L26,-86C30,-86 32,-82 30,-78L-30,-78C-34,-78 -34,-86 -30,-86Z', lid) + g.p('M26,-86L40,-92L38,-82L28,-78Z', lid);
    s += g.p('M-28,-78L24,-78L28,-6C28,-2 25,0 21,0L-21,0C-25,0 -28,-2 -28,-6Z', 'none');
    return s;
  });
  prop('plate_meal', (g, o) => {
    let s = g.e(0, -8, 56, 13, '#FFFFFF') + g.e(0, -9, 42, 8.5, '#F1F2EF');
    if (o.food !== false) s += g.e(-18, -12, 13, 7, '#EFD9A2') + g.e(-6, -14, 11, 6, '#F4E4B8') + g.e(16, -12, 14, 6, Kit.C.brick) + g.p('M-2,-8C2,-16 10,-17 12,-11C8,-8 4,-6 -2,-8Z', Kit.C.sage);
    return s;
  });
  prop('tray', (g, o) => { const w = o.w || 170; return g.p(`M${-w / 2},-10L${w / 2},-10L${w / 2 - 8},0L${-w / 2 + 8},0Z`, cc(o.colour) || '#8FA0A6') + g.r(-w / 2 - 4, -14, 12, 6, 3, shade(cc(o.colour) || '#8FA0A6', 0.8)) + g.r(w / 2 - 8, -14, 12, 6, 3, shade(cc(o.colour) || '#8FA0A6', 0.8)); });
  prop('kettle', (g, o) => {
    const f = cc(o.colour) || '#E9ECEB';
    return g.r(-34, -10, 68, 10, 4, Kit.C.slate) + g.p('M-28,-12L-24,-74C-23,-82 23,-82 24,-74L28,-12Z', f) + g.ld('M22,-70C44,-70 46,-24 26,-22', 8, Kit.C.slate) + g.p('M-24,-62L-44,-72L-42,-62L-26,-50Z', f) + g.r(-8, -86, 16, 8, 3, Kit.C.slate) + g.r(-18, -60, 8, 30, 3, 'rgba(190,223,227,.9)');
  });
  prop('phone', (g, o) => {
    if (o.type === 'landline') return g.r(-30, -26, 60, 26, 8, '#E8ECEB') + g.p('M-34,-30C-34,-44 -24,-42 -20,-36L20,-36C24,-42 34,-44 34,-30C30,-26 -30,-26 -34,-30Z', '#E8ECEB') + [0, 1, 2].map(r2 => [0, 1, 2].map(k => g.r(-15 + k * 11, -21 + r2 * 6, 7, 3.6, 1.5, '#AAB3B7')).join('')).join('');
    return G(g.r(-16, -58, 32, 58, 6, '#2F3A40') + g.r(-12, -52, 24, 44, 2, '#51606A') + g.r(-4, -5, 8, 2.4, 1.2, '#51606A'), o.flat ? 'rotate(0)' : '');
  });
  prop('notepad', (g, o) => {
    let s = g.r(-30, -80, 60, 80, 4, '#FFFFFF');
    for (let y = -62; y < -6; y += 11) s += g.t(`M-20,${y}H20`, '#B9CDCC', 1.8);
    for (let x = -22; x <= 22; x += 11) s += `<circle cx="${x}" cy="-80" r="3" fill="none" stroke="${OL}" stroke-width="2"/>`;
    return s;
  });
  prop('bag_of_medicines', (g, o) => {
    const f = cc(o.colour) || '#F2EDE2';
    return g.p('M-32,-92L32,-92L36,-4C36,-1 34,0 31,0L-31,0C-34,0 -36,-1 -36,-4Z', f) + g.p('M-34,-92L34,-92L32,-104L-32,-104Z', shade(f, 0.92)) + g.t('M-30,-92H30', shade(f, 0.7), 2) + g.r(-4, -100, 8, 4, 1, Kit.C.grey) + g.t('M-28,-80L-24,-8M26,-80L22,-8', shade(f, 0.85), 1.6);
  });

  /* ---- furniture and fittings ---- */
  prop('table', (g, o) => {
    const w = o.w || 260, h = o.height || Kit.dims.tableTop, f = cc(o.colour) || PR.wood, dk = shade(f, 0.82);
    return g.l([P(-w / 2 + 16, -h + 12), P(-w / 2 + 16, 0)], 10, dk) + g.l([P(w / 2 - 16, -h + 12), P(w / 2 - 16, 0)], 10, f) + g.r(-w / 2 + 6, -h + 10, w - 12, 16, 3, dk) + g.r(-w / 2, -h, w, 12, 4, f);
  });
  prop('desk', (g, o) => { const w = o.w || 280, h = Kit.dims.deskTop, f = cc(o.colour) || PR.woodLt; return g.r(w / 2 - 110, -h + 10, 100, h - 10, 4, shade(f, 0.92)) + g.t(`M${w / 2 - 104},${-h + 60}H${w / 2 - 16}M${w / 2 - 104},${-h + 110}H${w / 2 - 16}`, shade(f, 0.7), 2) + g.l([P(-w / 2 + 14, -h + 8), P(-w / 2 + 14, 0)], 9, shade(f, 0.8)) + g.r(-w / 2, -h, w, 12, 4, f); });
  prop('door', (g, o) => {
    const w = o.w || 190, h = o.h || 460, f = cc(o.colour) || '#F7F5EF', fr = '#FFFFFF';
    let s = g.r(-w / 2 - 14, -h - 14, w + 28, h + 14, 3, fr);
    if (o.open) { s += g.r(-w / 2, -h, w, h, 1, '#6E7A80') + g.p(`M${-w / 2},${-h}L${-w / 2 + w * 0.45},${-h + 24}L${-w / 2 + w * 0.45},-6L${-w / 2},0Z`, f); return s; }
    s += g.r(-w / 2, -h, w, h, 1, f);
    s += g.r(-w / 2 + 22, -h + 24, w - 44, h * 0.38, 3, shade(f, 0.95)) + g.r(-w / 2 + 22, -h + 50 + h * 0.38, w - 44, h * 0.46, 3, shade(f, 0.95));
    s += g.r(w / 2 - 34, -232, 10, 26, 3, Kit.C.grey) + g.l([P(w / 2 - 29, -226), P(w / 2 - 58, -226)], 6, Kit.C.grey);
    return s;
  });
  prop('window', (g, o) => {
    const w = o.w || 240, h = o.h || 250, fr = '#FFFFFF', sky = cc(o.sky) || '#DDEEF0';
    let s = g.r(-w / 2 - 10, -h - 10, w + 20, h + 20, 3, fr) + g.r(-w / 2, -h, w, h, 1, sky);
    if (o.view !== false) s += g.f(`M${-w / 2},-${n1(h * 0.28)}C${-w / 4},-${n1(h * 0.36)} ${w / 5},-${n1(h * 0.25)} ${w / 2},-${n1(h * 0.33)}V0H${-w / 2}Z`, '#C5DCCB') ;
    s += g.l([P(0, -h), P(0, 0)], 8, fr) + g.l([P(-w / 2, -h * 0.62), P(w / 2, -h * 0.62)], 7, fr);
    s += g.r(-w / 2 - 22, 4, w + 44, 14, 3, fr);
    if (o.curtains) {
      const cf = cc(o.curtains === true ? 'mustard' : o.curtains), cw = w * 0.28;
      s += g.l([P(-w / 2 - 40, -h - 26), P(w / 2 + 40, -h - 26)], 5, Kit.C.grey);
      s += g.p(`M${-w / 2 - 44},${-h - 22}H${-w / 2 - 44 + cw + 10}C${-w / 2 - 44 + cw},${-h / 2} ${-w / 2 - 44 + cw + 16},${-20} ${-w / 2 - 44 + cw + 6},40H${-w / 2 - 44}Z`, cf);
      s += g.p(`M${w / 2 + 44},${-h - 22}H${w / 2 + 44 - cw - 10}C${w / 2 + 44 - cw},${-h / 2} ${w / 2 + 44 - cw - 16},${-20} ${w / 2 + 44 - cw - 6},40H${w / 2 + 44}Z`, cf);
      s += g.t(`M${-w / 2 - 30},${-h}V30M${-w / 2 - 16},${-h}V30M${w / 2 + 30},${-h}V30M${w / 2 + 16},${-h}V30`, shade(cf, 0.8), 2);
    }
    return s;
  });
  prop('stairs', (g, o) => {
    const n = o.steps || 6, rH = 41, tD = 58, f = cc(o.colour) || '#D8C6AA', car = cc(o.carpet);
    let d = `M0,0`; for (let i = 0; i < n; i++) d += `V${-(i + 1) * rH}H${(i + 1) * tD}`;
    d += `V0Z`;
    let s = g.p(d, f);
    for (let i = 0; i < n; i++) s += g.t(`M${i * tD},${-(i + 1) * rH + 5}H${(i + 1) * tD}`, shade(f, 0.78), 2);
    if (car) for (let i = 0; i < n; i++) s += g.r(i * tD, -(i + 1) * rH, tD + 2, 8, 2, car);
    if (o.rail !== false) {
      const top = n * tD, hgt = 205;
      s += g.l([P(-14, 0), P(-14, -hgt - 34)], 12, PR.woodDk);
      for (let i = 1; i < n; i++) s += g.l([P(i * tD - tD / 2, -i * rH), P(i * tD - tD / 2, -i * rH - hgt + 16)], 4, '#FFFFFF');
      s += g.l([P(-14, -hgt - 10), P(top - 10, -n * rH - hgt + 28)], 9, PR.woodDk);
    }
    return s;
  });
  prop('rug', (g, o) => {
    // seen from a low angle: a flat quadrilateral on the floor; curled: true lifts the front-right corner
    const w = o.w || 300, dp = o.depth || 44, f = cc(o.colour) || Kit.C.brick, b = cc(o.border) || Kit.C.gold, und = shade(f, 1.4);
    const A = P(-w / 2, 0), B = P(w / 2, 0), C = P(w / 2 + 26, -dp), Dd = P(-w / 2 + 26, -dp);
    let s = '';
    if (o.curled) {
      const B1 = P(w / 2 - 74, 0), B2 = lerp(B, C, 0.62), tip = P(w / 2 - 40, -dp - 38);
      s += g.p(`M${pt(A)}L${pt(B1)}L${pt(B2)}L${pt(C)}L${pt(Dd)}Z`, f);
      s += g.t(`M${pt(add(A, P(16, -7)))}L${pt(add(B1, P(-6, -7)))}M${pt(add(Dd, P(12, 7)))}L${pt(add(C, P(-14, 7)))}`, b, 3);
      s += `<path d="M${pt(B1)}L${pt(B2)}L${pt(add(tip, P(8, 30)))}Z" fill="${OL}" opacity=".12"/>`;
      s += g.p(`M${pt(B1)}C${pt(add(B1, P(4, -18)))} ${pt(add(tip, P(-18, 6)))} ${pt(tip)}L${pt(add(tip, P(10, -2)))}C${pt(add(tip, P(20, 14)))} ${pt(add(B2, P(4, -14)))} ${pt(B2)}Z`, und);
    } else {
      s += g.p(`M${pt(A)}L${pt(B)}L${pt(C)}L${pt(Dd)}Z`, f);
      s += g.t(`M${pt(add(A, P(16, -7)))}L${pt(add(B, P(-8, -7)))}M${pt(add(Dd, P(12, 7)))}L${pt(add(C, P(-14, 7)))}`, b, 3);
    }
    return s;
  });
  prop('lamp', (g, o) => {
    const sh = cc(o.shade) || Kit.C.cream;
    if (o.type === 'table') return g.e(0, -4, 24, 5, Kit.C.slate) + g.l([P(0, -6), P(0, -70)], 6, Kit.C.slate) + g.p('M-30,-64L30,-64L20,-108L-20,-108Z', sh);
    return g.e(0, -5, 36, 7, Kit.C.slate) + g.l([P(0, -8), P(0, -330)], 7, Kit.C.slate) + g.p('M-44,-316L44,-316L30,-384L-30,-384Z', sh);
  });
  prop('grab_rail', (g, o) => {
    const L = o.length || 130, a = o.angle || 0, col = cc(o.colour) || '#F2F4F3';
    return G(g.r(-L / 2 - 8, -12, 14, 24, 4, shade(col, 0.88)) + g.r(L / 2 - 6, -12, 14, 24, 4, shade(col, 0.88)) + g.l([P(-L / 2, 0), P(L / 2, 0)], 11, col) + g.l([P(-L / 2 + 2, 10), P(-L / 2 + 2, 0)], 9, col) + g.l([P(L / 2 - 2, 10), P(L / 2 - 2, 0)], 9, col), `rotate(${a})`);
  });
  prop('toilet_with_grab_rails', (g, o) => {
    // side view, user faces right; cistern against the back wall at the left
    const w = '#FBFBFA', w2 = '#EEF1F0';
    let s = '';
    if (o.rails !== false) {
      s += G(D.grab_rail(g, { length: 170 }), 'translate(10,-186)');
      s += G(D.grab_rail(g, { length: 130, angle: -90 }), 'translate(120,-250)');
    }
    s += g.r(-96, -206, 44, 112, 8, w) + g.r(-100, -214, 52, 12, 4, w2) + g.r(-82, -222, 18, 8, 3, '#D5DCDC');
    s += g.p('M-60,-94L50,-94C58,-94 58,-84 52,-78C38,-64 26,-50 20,-28L16,0L-34,0L-38,-40C-48,-56 -58,-70 -60,-94Z', w);
    s += g.r(-64, -104, 122, 12, 6, w2);
    if (o.raised) s += g.r(-60, -132, 114, 28, 8, '#FFFFFF') + g.r(-56, -140, 106, 10, 5, w2);
    return s;
  });
  prop('raised_toilet_seat', (g, o) => {
    let s = g.p('M-58,-4L54,-4C60,-4 62,-12 60,-20L56,-40L-60,-40L-62,-12C-62,-6 -61,-4 -58,-4Z', '#FFFFFF') + g.r(-62, -48, 122, 10, 5, '#F2F4F3') + g.p('M34,-40L58,-40L56,-26C48,-26 40,-30 34,-40Z', '#E4E9E8');
    if (o.arms) s += g.l([P(-44, -44), P(-44, -100), P(36, -100), P(36, -44)], 8, '#D9E0E0');
    return s;
  });
  prop('commode', (g, o) => {
    const part = o.part || 'all', m = '#C9D1D4', pad = cc(o.colour) || Kit.C.teal;
    let back = g.l([P(-44, 0), P(-42, -110), P(-50, -228)], 7, m) + g.r(-60, -222, 18, 70, 7, pad) + g.l([P(64, -110), P(66, 0)], 7, m) + g.l([P(-43, -40), P(65, -40)], 5, m);
    back += g.p('M-26,-98L40,-98L36,-60L-22,-60Z', '#F3F5F4') + g.r(-30, -102, 72, 8, 3, '#DDE3E3');
    back += g.r(-46, -120, 116, 12, 6, pad);
    const front = g.l([P(-40, -160), P(60, -160), P(62, -112)], 7, m) + g.r(-38, -166, 90, 10, 5, pad);
    if (o.view === 'front') return g.l([P(-50, 0), P(-48, -228)], 7, m) + g.l([P(50, 0), P(48, -228)], 7, m) + g.r(-44, -224, 88, 60, 8, pad) + g.r(-60, -120, 120, 12, 6, pad) + g.l([P(-62, -160), P(-62, -112)], 7, m) + g.l([P(62, -160), P(62, -112)], 7, m) + g.r(-70, -166, 22, 10, 5, pad) + g.r(48, -166, 22, 10, 5, pad);
    return part === 'back' ? back : part === 'front' ? front : back + front;
  });
  prop('shoes', (g, o) => {
    const f = cc(o.colour) || (o.type === 'slippers' ? Kit.C.plum : '#5B4A40');
    const d = o.type === 'slippers' ? SLIPPER : SHOE;
    return G(g.p(d, shade(f, 0.85)), 'translate(18,-16)') + G(g.p(d, f), 'translate(-6,-16)');
  });
  prop('slippers', (g, o) => D.shoes(g, Object.assign({ type: 'slippers' }, o)));
  prop('front_door_step', (g, o) => {
    const dc = cc(o.colour) || Kit.C.navy, wall = cc(o.wall) || '#E6DCCB', steps = o.steps || 1;
    let s = g.r(-170, -560, 340, 560, 2, wall);
    const sy = -steps * 34;
    s += g.r(-112, sy - 470, 224, 470, 2, '#FFFFFF') + g.r(-98, sy - 456, 196, 456, 1, dc);
    s += g.r(-78, sy - 430, 156, 150, 3, shade(dc, 1.1)) + g.r(-78, sy - 262, 156, 220, 3, shade(dc, 1.1));
    s += g.r(62, sy - 250, 10, 34, 3, Kit.C.gold);
    for (let i = 0; i < steps; i++) s += g.r(-140 + i * 12, -(i + 1) * 34, 280 - i * 24, 34, 2, '#C9C3B8');
    if (o.rail) s += g.l([P(150, 0), P(150, -200)], 7, Kit.C.slate) + g.l([P(150, -190), P(126, -190)], 7, Kit.C.slate);
    return s;
  });
  prop('radiator', (g, o) => {
    const w = o.w || 200, h = 110, f = '#F6F7F6';
    let s = g.r(-w / 2, -h - 30, w, h, 6, f);
    for (let x = -w / 2 + 14; x < w / 2 - 6; x += 16) s += g.t(`M${x},${-h - 22}V-38`, '#D2D8D8', 3);
    return s + g.r(w / 2 - 4, -44, 14, 10, 3, '#C9D0D2') + g.l([P(w / 2 + 6, -40), P(w / 2 + 6, 0)], 5, '#C9D0D2');
  });
  prop('plant', (g, o) => {
    const pot = cc(o.pot) || Kit.C.brick, lf = cc(o.colour) || Kit.C.sage, dl = shade(lf, 0.78);
    const leaf = (a, l, c2) => G(g.p(`M0,0C${l * 0.3},-${l * 0.25} ${l * 0.75},-${l * 0.2} ${l},0C${l * 0.75},${l * 0.2} ${l * 0.3},${l * 0.25} 0,0Z`, c2), `rotate(${a})`);
    let s = '';
    [-150, -120, -95, -70, -40, -170, -10].forEach((a, i) => { s += G(leaf(a, 64 + (i % 3) * 14, i % 2 ? lf : dl), 'translate(0,-64)'); });
    return s + g.p('M-30,-66L30,-66L24,0L-24,0Z', pot) + g.r(-34, -72, 68, 12, 3, shade(pot, 1.1));
  });
  prop('bookshelf', (g, o) => {
    const w = o.w || 200, h = o.h || 320, f = cc(o.colour) || PR.wood, shelves = 4;
    const bc = ['#15535B', '#C99A2E', '#6B4E6E', '#8FA98F', '#A0522D', '#243B55', '#B9CDCC', '#EFE6D6', '#5F6B76'];
    let s = g.r(-w / 2, -h, w, h, 3, f);
    const sh = (h - 20) / shelves;
    for (let i = 0; i < shelves; i++) {
      const y0 = -h + 12 + i * sh, bot = y0 + sh - 8;
      s += g.r(-w / 2 + 8, y0, w - 16, sh - 8, 1, shade(f, 0.72));
      let x = -w / 2 + 12, k = i * 3;
      while (x < w / 2 - 30) { const bw = 12 + (k * 7) % 12, bh = sh - 22 - (k * 5) % 16; s += g.r(x, bot - bh, bw, bh, 1.5, bc[k % bc.length]); x += bw + 2; k++; }
      if (i % 2 === 0) s += G(g.r(-7, -(sh - 26), 14, sh - 26, 1.5, bc[(k + 2) % bc.length]), `translate(${n1(w / 2 - 22)},${n1(bot)}) rotate(14)`);
    }
    return s;
  });
  prop('kitchen_counter', (g, o) => {
    const w = o.w || 420, h = Kit.dims.counterTop, f = cc(o.colour) || Kit.C.mint, top = cc(o.top) || '#C9B79C';
    let s = g.r(-w / 2 + 6, -18, w - 12, 18, 2, shade(f, 0.8));
    const n = Math.max(2, Math.round(w / 110)), dw = (w - 8) / n;
    for (let i = 0; i < n; i++) { const x = -w / 2 + 4 + i * dw; s += g.r(x, -h + 16, dw - 4, h - 34, 3, f) + g.r(x + dw - 24, -h + 44, 6, 32, 3, Kit.C.grey); }
    s += g.r(-w / 2 - 8, -h, w + 16, 16, 3, top);
    if (o.sink) s += g.r(-40, -h - 2, 80, 6, 2, '#C9D0D2') + g.ld(`M20,${-h}V${-h - 40}Q20,${-h - 52} 8,${-h - 52}H-6`, 6, '#AEB8BD');
    if (o.wallUnits) { for (let i = 0; i < n; i++) { const x = -w / 2 + 4 + i * dw; s += g.r(x, -h - 250, dw - 4, 130, 3, f) + g.r(x + dw - 24, -h - 150, 6, 26, 3, Kit.C.grey); } }
    return s;
  });
  prop('shelf', (g, o) => { // wall shelf or cupboard for reaching_up scenes; (x,y) = floor below
    const w = o.w || 200, y = -(o.height || 440), f = cc(o.colour) || PR.woodLt;
    if (o.cupboard) return g.r(-w / 2, y - 120, w, 120, 4, f) + g.t(`M0,${y - 114}V${y - 6}`, shade(f, 0.7), 2) + g.r(-14, y - 30, 6, 20, 3, Kit.C.grey) + g.r(8, y - 30, 6, 20, 3, Kit.C.grey);
    return g.r(-w / 2, y, w, 12, 3, f) + g.p(`M${-w / 2 + 20},${y + 12}L${-w / 2 + 20},${y + 40}L${-w / 2 + 44},${y + 12}Z`, shade(f, 0.85)) + g.p(`M${w / 2 - 20},${y + 12}L${w / 2 - 20},${y + 40}L${w / 2 - 44},${y + 12}Z`, shade(f, 0.85));
  });
  prop('curtain', (g, o) => { // hospital bay curtain on a ceiling track; (x,y) = floor point at its centre
    const w = o.w || 200, h = o.h || 560, f = cc(o.colour) || '#BFD6D3';
    let s = g.r(-w / 2 - 30, -h - 30, w + 60, 8, 3, Kit.C.grey);
    let d = `M${-w / 2},${-h - 22}`; for (let x = -w / 2; x < w / 2; x += 25) d += `Q${x + 12.5},${-h - 12} ${x + 25},${-h - 22}`;
    d += `L${w / 2 + 6},-40`; for (let x = w / 2; x > -w / 2; x -= 25) d += `Q${x - 12.5},-30 ${x - 25},-40`; d += 'Z';
    s += g.p(d, f);
    for (let x = -w / 2 + 25; x < w / 2; x += 25) s += g.t(`M${x},${-h - 14}L${x + 3},-44`, shade(f, 0.84), 2);
    return s;
  });
  prop('tree', (g, o) => { const f = cc(o.colour) || Kit.C.sage, h = o.h || 420; return g.l([P(0, 0), P(0, -h * 0.5)], 16, PR.woodDk) + g.p(`M0,${-h}C${h * 0.26},${-h} ${h * 0.34},${-h * 0.74} ${h * 0.26},${-h * 0.56}C${h * 0.2},${-h * 0.42} ${-h * 0.2},${-h * 0.42} ${-h * 0.26},${-h * 0.56}C${-h * 0.34},${-h * 0.74} ${-h * 0.26},${-h} 0,${-h}Z`, f); });
  prop('bench', (g, o) => { const w = o.w || 260; return g.l([P(-w / 2 + 20, 0), P(-w / 2 + 20, -100)], 8, Kit.C.slate) + g.l([P(w / 2 - 20, 0), P(w / 2 - 20, -100)], 8, Kit.C.slate) + g.r(-w / 2, -104, w, 12, 3, PR.wood) + g.r(-w / 2, -176, w, 12, 3, PR.wood) + g.r(-w / 2, -150, w, 12, 3, PR.wood) + g.l([P(-w / 2 + 20, -100), P(-w / 2 + 16, -180)], 7, Kit.C.slate) + g.l([P(w / 2 - 20, -100), P(w / 2 - 16, -180)], 7, Kit.C.slate); });
  Kit.props = Object.keys(D);
  /* key points of a placed prop, in scene coordinates, e.g. Kit.anchor('table', {x, y, scale}).top */
  Kit.anchor = function (name, o = {}) {
    const s = o.scale == null ? 1 : o.scale, fx = o.facing === 'left' ? -1 : 1, X = o.x || 0, Y = o.y || 0, dm = Kit.dims;
    const bt = o.height || (o.type === 'domestic' ? dm.domesticBedTop : dm.hospitalBedTop);
    const tab = {
      chair: { seat: P(10, -dm.chairSeat) }, armchair: { seat: P(20, -dm.armchairSeat), arm: P(24, -dm.armchairArm - 10), armFront: P(66, -dm.armchairArm - 10) },
      sofa: { seat: P(0, -dm.sofaSeat) }, stool: { seat: P(0, -dm.stoolSeat) },
      bed: { top: P(0, -bt), head: P(-190, -bt), foot: P(190, -bt), footEnd: P(230, -bt) },
      bedside_table: { top: P(0, -dm.bedsideTop), left: P(-30, -dm.bedsideTop), right: P(30, -dm.bedsideTop) }, over_bed_table: { top: P(-14, -(o.height || dm.overBedTop)) },
      table: { top: P(0, -(o.height || dm.tableTop)) }, desk: { top: P(0, -dm.deskTop) }, kitchen_counter: { top: P(0, -dm.counterTop) },
      wheelchair: { handles: P(-60, -237), seat: P(20, -dm.wheelchairSeat), footplate: P(128, -30) },
      walking_frame: { grip: P(30, -dm.frameHandle) }, shelf: { top: P(0, -(o.height || 440)) }, window: { sill: P(0, 10) }
    }[name] || {};
    const out = {};
    Object.keys(tab).forEach(k => { const q = tab[k]; out[k] = P(X + q.x * s * fx, Y + q.y * s); });
    return out;
  };

  /* ================================================================== ROOMS */
  const ROOMS = {
    home_living: { wall: '#EFE6D6', floor: '#D8C2A4', floor2: '#CDB595', skirt: '#FFFFFF', boards: true, dado: '#E5D9C4' },
    home_bedroom: { wall: '#E2ECE9', floor: '#D9CDBB', floor2: '#D0C3AF', skirt: '#FFFFFF' },
    kitchen: { wall: '#F5F2EB', floor: '#D3DBD8', floor2: '#C6D0CD', skirt: '#E6EAE9', tiles: 'floor' },
    bathroom: { wall: '#E3EEED', floor: '#C8D6D4', floor2: '#BCCBC9', skirt: '#FFFFFF', tiles: 'wall' },
    hospital_bay: { wall: '#E4EFED', floor: '#CAD6D3', floor2: '#BECBC8', skirt: '#B9CDCC', trunking: true },
    care_home_lounge: { wall: '#F1E9DB', floor: '#B8C6BC', floor2: '#ADBCB1', skirt: '#FFFFFF', dado: '#E5DAC6', lower: '#E8DDC9' },
    gp_room: { wall: '#F1F3F0', floor: '#C7D0CD', floor2: '#BBC5C2', skirt: '#D9DEDC' },
    outdoors_street: { street: true }
  };
  Kit.rooms = Object.keys(ROOMS);
  Kit.room = function (type, o = {}) {
    const w = o.w || 1000, h = o.h || 800, fy = o.floor == null ? Math.round(h * 0.78) : o.floor, R0 = ROOMS[type] || ROOMS.home_living;
    const X0 = -600, W = w + 1200, lw = Kit.LW;
    const rect = (y, hh, f) => `<rect x="${X0}" y="${n1(y)}" width="${W}" height="${n1(hh)}" fill="${f}"/>`;
    const line = (y, f, sw) => `<rect x="${X0}" y="${n1(y - sw / 2)}" width="${W}" height="${n1(sw)}" fill="${f}"/>`;
    let s = '';
    if (R0.street) {
      s += rect(-600, fy + 600, cc(o.sky) || '#DDEBEA');
      // far houses and hedge (plain shapes, no signs)
      const hy = fy - (o.houseHeight || Math.round(h * 0.42));
      for (let x = -200; x < w + 200; x += 260) s += `<path d="M${x},${fy - 60}V${hy + 40}L${x + 110},${hy - 30}L${x + 220},${hy + 40}V${fy - 60}Z" fill="${x % 520 === 0 ? '#E7DCC9' : '#D6E1DF'}" stroke="${OL}" stroke-width="${lw}" stroke-linejoin="round" opacity=".9"/>`;
      s += `<rect x="${X0}" y="${fy - 74}" width="${W}" height="48" rx="20" fill="#9DB59C" stroke="${OL}" stroke-width="${lw * 2}" paint-order="stroke"/>`;
      s += rect(fy - 30, 30, '#C9C7BE') + line(fy - 30, OL, lw);
      s += rect(fy, 600, '#DADBD5') + line(fy, OL, lw);
      for (let x = -40; x < w + 40; x += 150) s += `<path d="M${x},${fy + 4}L${x - 30},${fy + 70}" stroke="#C3C5BE" stroke-width="3"/>`;
      s += rect(fy + 70, 16, '#BFC1BA') + line(fy + 70, OL, lw) + rect(fy + 86, 600, '#9CA6A9') + line(fy + 86, OL, lw);
      return s;
    }
    s += rect(-600, fy + 600, cc(o.wall) || R0.wall);
    if (R0.lower) s += rect(fy - Math.round(h * 0.3), Math.round(h * 0.3), R0.lower);
    if (R0.dado) s += line(fy - Math.round(h * 0.3), R0.dado, 10) + line(fy - Math.round(h * 0.3) - 5, OL, lw * 0.7) + line(fy - Math.round(h * 0.3) + 5, OL, lw * 0.7);
    if (R0.tiles === 'wall') { const ty = fy - Math.round(h * 0.34); s += rect(ty, fy - ty, '#F2F6F5'); let d = ''; for (let y = ty + 40; y < fy; y += 40) d += `M${X0},${y}H${X0 + W}`; for (let x = -40; x < w + 40; x += 40) d += `M${x},${ty}V${fy}`; s += `<path d="${d}" stroke="#D3DEDD" stroke-width="2"/>` + line(ty, OL, lw); }
    if (R0.trunking) { const ty = fy - Math.round(h * 0.62); s += `<rect x="${X0}" y="${ty}" width="${W}" height="34" fill="#F8F9F7" stroke="${OL}" stroke-width="${lw}"/>` + line(ty + 17, '#E3E8E6', 3); }
    s += rect(fy, 600, cc(o.floorColour) || R0.floor);
    s += rect(fy + Math.round((h - fy) * 0.55), 600, R0.floor2);
    if (R0.boards) { let d = ''; for (let y = fy + 24; y < h + 40; y += 30) d += `M${X0},${y}H${X0 + W}`; s += `<path d="${d}" stroke="${shade(R0.floor, 0.9)}" stroke-width="2"/>`; }
    if (R0.tiles === 'floor') { let d = ''; for (let y = fy + 30; y < h + 40; y += 36) d += `M${X0},${y}H${X0 + W}`; s += `<path d="${d}" stroke="${shade(R0.floor, 0.9)}" stroke-width="2"/>`; }
    s += `<rect x="${X0}" y="${fy - 18}" width="${W}" height="18" fill="${R0.skirt}" stroke="${OL}" stroke-width="${lw}"/>`;
    s += line(fy, OL, lw);
    return s;
  };

  /* ================================================================== SCENE */
  Kit.shadow = (x, y, w) => shadowEl(x, w, y);
  Kit.at = (x, y, s, markup, flip) => G(markup, T(x, y, s == null ? 1 : s, flip ? -1 : 1));
  Kit.scene = function (w, h, children, o = {}) {
    const body = flat(children || []).filter(Boolean).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="${o.fit || 'xMidYMid slice'}"${o.cls ? ` class="${o.cls}"` : ''}${o.style ? ` style="${o.style}"` : ''} aria-hidden="true">${o.bg ? `<rect x="-2000" y="-2000" width="${w + 4000}" height="${h + 4000}" fill="${cc(o.bg)}"/>` : ''}${body}</svg>`;
  };
  Kit.draw = function (target, w, h, children, o) {
    const svg = Kit.scene(w, h, children, o);
    const els = typeof target === 'string' ? document.querySelectorAll(target) : [target];
    els.forEach(el => { if (el) el.innerHTML = svg; });
    return svg;
  };

  window.Kit = Kit;
})();
