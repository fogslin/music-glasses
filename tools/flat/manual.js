/* Music Glasses flat-pack guide — IKEA-style 2D line-art generator (pure SVG, from the same geometry as the 3D scene) */
(function () {
  "use strict";
  const G = window.FLAT_GEO, F = window.FLAT_STEPS;
  const VIEWS = { F: [-0.55, 0.62, 1.0], R: [-1.0, 0.62, 0.42], Ri: [0.95, 0.75, -0.15], T: [-0.15, 1.0, 0.55], Rb: [-1.0, 0.7, -0.55], Rbi: [0.75, 0.8, -0.7], Lbi: [-0.75, 0.8, -0.7] };
  const HIDE = { Ri: 1, Rbi: 1, Lbi: -1 };          // inner views: drop the near (opposite) side
  const hidden = (view, x) => HIDE[view] && Math.sign(x) === HIDE[view] && Math.abs(x) > 0.3;
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function basis(key) {
    const V = norm(VIEWS[key] || VIEWS.F);
    const X = norm(cross([0, 1, 0], V)); const Y = cross(V, X);
    return { V, X, Y };
  }
  function rrect(w, h, r, n = 5) { // rounded rect outline points (2D, centred)
    const pts = []; const cs = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]];
    cs.forEach(([cx, cy, a0]) => { for (let i = 0; i <= n; i++) { const a = (a0 + i * 90 / n) * Math.PI / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } });
    return pts;
  }
  function boxFaces(c, s, st, rotX) {
    const hx = s[0] / 2, hy = s[1] / 2, hz = s[2] / 2;
    const ca = Math.cos(rotX || 0), sa = Math.sin(rotX || 0);
    const P = (x, y, z) => { const yy = y * ca - z * sa, zz = y * sa + z * ca; return [c[0] + x, c[1] + yy, c[2] + zz]; };
    const N = (x, y, z) => [x, y * ca - z * sa, y * sa + z * ca];
    return [
      { p: [P(hx, -hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), P(hx, -hy, hz)], n: N(1, 0, 0) },
      { p: [P(-hx, -hy, -hz), P(-hx, -hy, hz), P(-hx, hy, hz), P(-hx, hy, -hz)], n: N(-1, 0, 0) },
      { p: [P(-hx, hy, -hz), P(-hx, hy, hz), P(hx, hy, hz), P(hx, hy, -hz)], n: N(0, 1, 0) },
      { p: [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz)], n: N(0, -1, 0) },
      { p: [P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)], n: N(0, 0, 1) },
      { p: [P(-hx, -hy, -hz), P(-hx, hy, -hz), P(hx, hy, -hz), P(hx, -hy, -hz)], n: N(0, 0, -1) }
    ].map(f => Object.assign(f, st));
  }
  function cylFaces(c, r, h, axis, st, n = 16) {
    const out = []; const ring = (o) => { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * r;
      pts.push(axis === "x" ? [c[0] + o, c[1] + u, c[2] + v] : axis === "y" ? [c[0] + u, c[1] + o, c[2] + v] : [c[0] + u, c[1] + v, c[2] + o]); } return pts; };
    const A = ring(-h / 2), B = ring(h / 2), ax = axis === "x" ? [1, 0, 0] : axis === "y" ? [0, 1, 0] : [0, 0, 1];
    out.push(Object.assign({ p: B, n: ax }, st)); out.push(Object.assign({ p: A.slice().reverse(), n: ax.map(v => -v) }, st));
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; const m = [(A[i][0] + A[j][0]) / 2 - c[0], (A[i][1] + A[j][1]) / 2 - c[1], (A[i][2] + A[j][2]) / 2 - c[2]];
      const nn = axis === "x" ? [0, m[1], m[2]] : axis === "y" ? [m[0], 0, m[2]] : [m[0], m[1], 0];
      out.push(Object.assign({ p: [A[i], A[j], B[j], B[i]], n: norm(nn), side: true }, st)); }
    return out;
  }
  function prismFaces(pts, x0, x1, st) {   // profile in (z, y), extruded along x
    const out = [];
    out.push(Object.assign({ p: pts.map(q => [x1, q[1], q[0]]), n: [1, 0, 0] }, st));
    out.push(Object.assign({ p: pts.map(q => [x0, q[1], q[0]]).reverse(), n: [-1, 0, 0] }, st));
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const dz = b[0] - a[0], dy = b[1] - a[1];
      out.push(Object.assign({ p: [[x0, a[1], a[0]], [x1, a[1], a[0]], [x1, b[1], b[0]], [x0, b[1], b[0]]], n: norm([0, -dz, dy].map((v, k) => k === 0 ? 0 : v)), side: true }, st)); }
    return out;
  }
  function frameFaces(st, lenses, view) {
    const O = G.OUTER, out = [];
    const inner = G.lensPts(G.LENS.w, G.LENS.h, 48), outer = G.lensPts(O.w, O.h, 48);
    [-1, 1].forEach(sx => {
      const cx = sx * G.LX;
      [G.FZ / 2, -G.FZ / 2].forEach(z => out.push(Object.assign({ p: outer.map(q => [cx + sx * q[0], G.LY + O.dy + q[1], z]), hole: inner.map(q => [cx + sx * q[0], G.LY + q[1], z]), n: [0, 0, Math.sign(z)] }, st)));
      if (lenses) out.push({ p: inner.map(q => [cx + sx * q[0] * 0.98, G.LY + q[1] * 0.98, 0.004]), n: [0, 0, 1], fill: "#eef2f4", stroke: "#111", sw: 0.9, lens: true });
      if (hidden(view, sx)) return;
      out.push(...boxFaces([sx * 0.637, G.TY + 0.005, -0.012], [0.05, 0.095, 0.05], st));
      out.push(...boxFaces([sx * 0.652, 0.382, -0.51], [0.017, 0.017, 0.94], st));                       // thin wire temple
      out.push(...boxFaces([sx * 0.647, 0.36, -1.085], [0.034, 0.034, 0.18], st));
      out.push(...boxFaces([sx * 0.645, 0.225, -1.285], [0.034, 0.034, 0.31], st, G.EAR_ROT));          // acetate ear tip
    });
    out.push(...boxFaces([0, 0.44, 0], [0.17, 0.07, 0.04], st)); // bridge
    return out;
  }
  function partFaces(id, st) {
    const p = G.PARTS[id]; if (!p || !p.c) return [];
    const H = G.HP, prof = G.hpProfile(0).map(q => [q[0], q[1] + G.TY]);
    if (id === "podR" || id === "podL") { const sx = id === "podR" ? -1 : 1, xo = sx * (G.TX + H.xw / 2), xi = sx * (G.TX - H.xw / 2) + sx * H.lid; return prismFaces(prof, Math.min(xo, xi), Math.max(xo, xi), st); }
    if (id === "lidR" || id === "lidL") { const sx = id === "lidR" ? -1 : 1, xi = sx * (G.TX - H.xw / 2); return prismFaces(prof, Math.min(xi, xi + sx * H.lid), Math.max(xi, xi + sx * H.lid), st); }
    if (id === "sleeveR" || id === "sleeveL") return boxFaces(p.c, [0.05, 0.05, 0.5], st);
    if (id === "browCap") return boxFaces([0, 0.52, -0.01], [1.24, 0.026, 0.026], st);
    if (id === "plug" || id === "batBig") return [];
    return boxFaces(p.c, p.s, st, p.rx || 0);
  }
  function installedBefore(k) { const set = new Set(); F.STEPS.forEach((s, i) => { if (i < k) s.parts.forEach(p => set.add(p)); }); return set; }
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  function callout(type) {
    const L = (d, w = 1.6, extra = "") => `<path d="${d}" fill="none" stroke="#111" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
    const T = (x, y, t, s = 11, a = "middle", wt = 700) => `<text x="${x}" y="${y}" font-size="${s}" text-anchor="${a}" font-weight="${wt}" fill="#111">${esc(t)}</text>`;
    switch (type) {
      case "iron": return L("M-48 18 H40 M-48 30 H40") + `<rect x="-22" y="10" width="22" height="8" fill="#fff" stroke="#111" stroke-width="1.4"/>` + `<ellipse cx="-11" cy="9" rx="9" ry="4" fill="#ddd" stroke="#111" stroke-width="1.3"/>` +
        `<path d="M-8 4 L30 -38 L44 -26 L2 10 Z" fill="#fff" stroke="#111" stroke-width="1.5"/><path d="M30 -38 L52 -60 L62 -50 L44 -26" fill="#111"/>` + L("M-26 -6 q-6 -10 2 -18 q8 -8 0 -18", 1.2) + T(-34, 48, "≈1 s · 340 °C", 10);
      case "cam": return `<rect x="-38" y="-10" width="30" height="34" rx="3" fill="#fff" stroke="#111" stroke-width="1.5"/><circle cx="-23" cy="7" r="9" fill="#fff" stroke="#111" stroke-width="1.5"/><circle cx="-23" cy="7" r="4" fill="#111"/>` +
        L("M-8 14 C 10 14 14 30 34 30", 3) + `<rect x="26" y="20" width="22" height="18" fill="#fff" stroke="#111" stroke-width="1.5"/>` + L("M-20 -40 v18 M-26 -28 l6 6 l6 -6", 2) + T(0, -44, "click", 10);
      case "hud": return `<rect x="-40" y="-46" width="60" height="10" fill="#fff" stroke="#111" stroke-width="1.5"/><ellipse cx="-10" cy="-27" rx="14" ry="4" fill="#fff" stroke="#111" stroke-width="1.3"/>` +
        `<rect x="-26" y="-18" width="32" height="32" fill="#fff" stroke="#111" stroke-width="1.5"/>` + L("M-26 14 L6 -18", 1.3) + L("M-10 -36 V-2 H44", 1.4, 'stroke-dasharray="4 3"') +
        L("M40 -8 q10 6 0 12 M36 -2 h0", 2) + T(14, 38, "45°", 10);
      case "x": return `<circle cx="-22" cy="-6" r="16" fill="#fff" stroke="#111" stroke-width="1.5"/><circle cx="-22" cy="-6" r="6" fill="none" stroke="#111" stroke-width="1.2"/>` +
        L("M-6 -6 H22 V16") + L("M12 16 H32 M16 21 H28 M20 26 H24", 1.6) + L("M-46 -44 L46 44 M46 -44 L-46 44", 3.2);
      case "foil": return [0, 1, 2].map(i => `<rect x="${-44 + i * 32}" y="-8" width="24" height="18" fill="#fff" stroke="#111" stroke-width="1.5"/>`).join("") +
        L("M-20 -20 h8 M-20 -24 v8 M-12 -24 v8", 1) + L("M-32 -8 V-30 C -32 -40 20 -40 20 -30", 1.2) + T(-4, 34, "8–10 mm", 10) + L("M-44 22 h24 M-20 22 l-4 -3 M-20 22 l-4 3", 1.2);
      case "hinge": return `<rect x="-46" y="-8" width="40" height="16" fill="#fff" stroke="#111" stroke-width="1.5"/><rect x="6" y="-8" width="40" height="16" fill="#fff" stroke="#111" stroke-width="1.5"/>` +
        `<circle cx="0" cy="0" r="7" fill="#fff" stroke="#111" stroke-width="1.5"/>` + L("M-40 14 C -10 14 -14 36 0 36 C 14 36 10 14 40 14", 1.6) + L("M22 -30 a26 26 0 0 0 -44 0 M-22 -30 l2 -8 M-22 -30 l8 -2", 1.5) + T(0, -40, "20×", 10);
      case "screw": return `<circle cx="0" cy="-4" r="20" fill="#fff" stroke="#111" stroke-width="1.6"/>` + L("M-12 -4 H12 M0 -16 V8", 2.4) + L("M30 -30 a40 40 0 0 1 0 52 M30 22 l-8 0 M30 22 l2 -8", 1.6) + `<rect x="-6" y="18" width="12" height="20" fill="#fff" stroke="#111" stroke-width="1.4"/>` + L("M-6 24 l12 -4 M-6 30 l12 -4 M-6 36 l12 -4", 1);
      case "usb": return `<rect x="-46" y="-12" width="40" height="24" rx="6" fill="#fff" stroke="#111" stroke-width="1.5"/><rect x="-6" y="-7" width="22" height="14" rx="5" fill="#fff" stroke="#111" stroke-width="1.5"/>` +
        L("M-46 0 H-60") + `<rect x="22" y="-14" width="26" height="28" fill="#eee" stroke="#111" stroke-width="1.5"/><rect x="28" y="-6" width="16" height="12" rx="5" fill="#fff" stroke="#111" stroke-width="1.3"/>` + L("M0 -28 h22 M22 -28 l-5 -4 M22 -28 l-5 4", 1.6);
      case "laptop": return `<path d="M-40 -34 H34 V12 H-40 Z" fill="#fff" stroke="#111" stroke-width="1.6"/><path d="M-50 12 H44 L52 22 H-58 Z" fill="#fff" stroke="#111" stroke-width="1.6"/>` +
        `<rect x="-30" y="-6" width="54" height="7" fill="#fff" stroke="#111" stroke-width="1.2"/><rect x="-30" y="-6" width="38" height="7" fill="#111"/>` + L("M-30 -24 h40 M-30 -17 h28", 1.2) + T(-3, 40, "Upload", 10);
      case "lens": return `<path d="${"M" + rrect(70, 52, 16).map(q => (q[0]) + " " + (q[1] - 2)).join(" L") + "Z"}" fill="#eef2f4" stroke="#111" stroke-width="1.6"/>` + L("M-14 -40 v20 M-20 -27 l6 7 l6 -7", 2) +
        `<circle cx="38" cy="-38" r="7" fill="#fff" stroke="#111" stroke-width="1.4"/>` + L("M38 -50 v-4 M50 -38 h4 M46 -46 l3 -3 M26 -46 l-3 -3", 1.2) + T(0, 40, "click", 10);
      case "check": return L("M-26 0 L-6 20 L30 -24", 6);
      case "clip": return `<rect x="-44" y="-6" width="88" height="6" rx="3" fill="#fff" stroke="#111" stroke-width="1.5"/>` + `<path d="M-30 -30 h60 v20 a8 8 0 0 1 -8 8 h-44 a8 8 0 0 1 -8 -8 z" fill="#fff" stroke="#111" stroke-width="1.6"/>` +
        L("M0 -52 v14 M-6 -44 l6 6 l6 -6", 2) + `<path d="M-10 -10 q10 10 20 0" fill="none" stroke="#111" stroke-width="1.4"/>` + T(0, 36, "click", 10);
      case "brow": return `<path d="M-50 4 C -40 -26 -12 -26 -4 -8 Q0 -2 4 -8 C 12 -26 40 -26 50 4" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/>` +
        [0, 1, 2].map(i => `<path d="M-48 ${-4 - i * 3} C -40 ${-32 - i * 3} -12 ${-32 - i * 3} -4 ${-14 - i * 3} Q0 ${-8 - i * 3} 4 ${-14 - i * 3} C 12 ${-32 - i * 3} 40 ${-32 - i * 3} 48 ${-4 - i * 3}" fill="none" stroke="#111" stroke-width="0.9"/>`).join("") + T(0, 32, "8 wires", 10);
      case "paint": return [0, 1, 2].map(i => `<rect x="${-44 + i * 31}" y="0" width="26" height="14" fill="#fff" stroke="#111" stroke-width="1.4"/>`).join("") +
        `<path d="M-50 -2 H50" stroke="#111" stroke-width="1" stroke-dasharray="3 2"/>` + `<path d="M14 -46 l18 18 l-26 26 l-18 -18 z" fill="#fff" stroke="#111" stroke-width="1.5"/>` + L("M-12 -2 l-8 8", 2.4) + T(0, 36, "flush", 10);
      case "phone": return `<rect x="-40" y="-40" width="40" height="72" rx="7" fill="#fff" stroke="#111" stroke-width="1.6"/>` + T(-20, 0, "ᛒ", 16) + L("M10 -10 a14 14 0 0 1 0 20 M18 -18 a26 26 0 0 1 0 36 M26 -26 a38 38 0 0 1 0 52", 1.6);
      case "app": return `<rect x="-26" y="-44" width="52" height="88" rx="8" fill="#fff" stroke="#111" stroke-width="1.6"/>` + L("M-16 -28 h32 M-16 -10 h32", 1.2) + `<rect x="-16" y="4" width="14" height="10" fill="#111"/><rect x="2" y="4" width="14" height="10" fill="#fff" stroke="#111"/>` + L("M-16 26 h20", 3) + T(0, 58, "BLE", 10);
      default: return "";
    }
  }

  /** Draw the line-art page for step k. Returns an SVG string. */
  function draw(k, opt = {}) {
    const s = F.STEPS[k]; const W = opt.w || 480, H = opt.h || 330;
    const B = basis(s.view);
    const before = installedBefore(k);
    const cur = new Set(s.parts);
    const faces = [];
    const base = { fill: "#fff", stroke: "#111", sw: 1.15 };
    const hl = { fill: "#ecebe7", stroke: "#111", sw: 2.0 };
    faces.push(...frameFaces(Object.assign({}, k <= 1 ? hl : base), true, s.view));
    Object.keys(G.PARTS).forEach(id => {
      if (id === "frame") return;
      const inB = before.has(id), inC = cur.has(id);
      if (!inB && !inC) return;
      if (G.PARTS[id].c && hidden(s.view, G.PARTS[id].c[0])) return;
      partFaces(id, inC ? hl : base).forEach(f => { f.bias = 0.03; faces.push(f); });
    });
    // painter's sort (hidden-line by white fill)
    const vis = faces.filter(f => dot(f.n, B.V) > 0.02 || f.lens);
    vis.forEach(f => { f.depth = f.p.reduce((a, q) => a + dot(q, B.V), 0) / f.p.length + (f.bias || 0); });
    vis.sort((a, b) => a.depth - b.depth);
    const pr = q => [dot(q, B.X), -dot(q, B.Y)];
    // focus box
    let focus = [];
    const pushP = q => focus.push(pr(q));
    const wiresNow = s.wires.map(id => G.WIRES[id]);
    if (cur.size && k > 0) {
      s.parts.forEach(id => { const p = G.PARTS[id]; if (p.c) { const sz = p.s || [p.r * 2, p.r * 2, p.r * 2]; [-1, 1].forEach(a => [-1, 1].forEach(b => [-1, 1].forEach(c => pushP([p.c[0] + a * sz[0] / 2, p.c[1] + b * sz[1] / 2, p.c[2] + c * sz[2] / 2])))); } });
      wiresNow.forEach(w => w.pts.forEach(pushP));
      if (s.id === "mcu") G.TIN.forEach(n => pushP(G.pad(n)));
    }
    if (s.id === "flash") { pushP(G.ear("R", 0, 0.2, 0.2)); pushP(G.ear("R", 0, -0.2, -0.3)); pushP([-0.75, 0.4, -0.9]); }
    if (s.id === "prep") { pushP([-0.72, 0.5, 0.05]); pushP([0.72, 0.5, 0.05]); pushP([0, 0.0, -0.3]); }
    if (s.id === "brow") { focus = []; pushP([-0.75, 0.55, 0.05]); pushP([0.75, 0.55, 0.05]); pushP([-0.7, 0.3, -1.3]); pushP([0.7, 0.3, -0.4]); }
    if (s.id === "power") { focus = []; pushP(G.ear("L", 0, 0.12, 0.2)); pushP(G.ear("L", 0, -0.12, -0.2)); pushP([0.7, 0.45, -0.7]); }
    if (!focus.length) { vis.forEach(f => f.p.forEach(pushP)); }
    let x0 = Math.min(...focus.map(q => q[0])), x1 = Math.max(...focus.map(q => q[0])), y0 = Math.min(...focus.map(q => q[1])), y1 = Math.max(...focus.map(q => q[1]));
    const minSpan = s.minSpan || 0.75; const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    if (x1 - x0 < minSpan) { x0 = mx - minSpan / 2; x1 = mx + minSpan / 2; }
    if (y1 - y0 < minSpan * 0.6) { y0 = my - minSpan * 0.3; y1 = my + minSpan * 0.3; }
    const padF = Math.max(x1 - x0, y1 - y0) * 0.12 + 0.03; x0 -= padF; x1 += padF; y0 -= padF; y1 += padF;
    // keep aspect, leave room on the right for the callout
    const cw = W * (s.callout && s.callout !== "qty" ? 0.70 : 0.94), ch = H * (s.callout === "qty" ? 0.72 : 0.86);
    const sc = Math.min(cw / (x1 - x0), ch / (y1 - y0));
    const ox = (s.callout && s.callout !== "qty" ? W * 0.03 : W * 0.03) + (cw - (x1 - x0) * sc) / 2 - x0 * sc;
    const oy = H * 0.10 + (ch - (y1 - y0) * sc) / 2 - y0 * sc;
    const P2 = q => { const a = pr(q); return [(a[0] * sc + ox).toFixed(1), (a[1] * sc + oy).toFixed(1)]; };
    const path = pts => "M" + pts.map(q => P2(q).join(" ")).join(" L") + "Z";
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="lineart" role="img" aria-label="Manual illustration, step ${s.n}: ${esc(s.title)}"><rect width="${W}" height="${H}" fill="#fff"/>`;
    svg += `<defs><clipPath id="clip${k}${opt.tag || ""}"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs><g clip-path="url(#clip${k}${opt.tag || ""})">`;
    const sw = f => (f.sw * Math.min(1.6, Math.max(0.7, sc / 260))).toFixed(2);
    vis.forEach(f => {
      const d = path(f.p) + (f.hole ? " " + path(f.hole.slice().reverse()) : "");
      svg += `<path d="${d}" fill="${f.fill}" fill-rule="evenodd" stroke="${f.stroke}" stroke-width="${sw(f)}" stroke-linejoin="round"/>`;
      if (f.lens) { const c0 = P2(f.p[0]), c1 = P2(f.p[Math.floor(f.p.length / 2)]); svg += `<path d="M${c0[0]} ${c0[1]} L${c1[0]} ${c1[1]}" stroke="#bbb" stroke-width="0.8" opacity=".5"/>`; }
    });
    // wires: earlier steps thin, current step bold (hidden once pods are closed)
    const podsIdx = F.STEPS.findIndex(x => x.id === "close");
    Object.keys(G.WIRES).forEach(id => {
      const w = G.WIRES[id]; const wi = F.STEPS.findIndex(x => x.id === w.step);
      if (wi > k || (k >= podsIdx && wi < k)) return;
      if (HIDE[s.view] && w.pts.every(q => hidden(s.view, q[0]))) return;
      const now = wi === k;
      svg += `<path d="M${w.pts.map(q => P2(q).join(" ")).join(" L")}" fill="none" stroke="#111" stroke-width="${now ? 1.7 : 0.8}" stroke-linejoin="round" ${now ? "" : 'opacity=".55"'}/>`;
    });
    // solder joints for this step
    const joints = [];
    if (s.id === "mcu") G.TIN.forEach(n => joints.push(G.pad(n)));
    wiresNow.forEach(w => { if (w.a) joints.push(w.pts[0]); if (w.b) joints.push(w.pts[w.pts.length - 1]); });
    joints.forEach(q => { if (hidden(s.view, q[0])) return; const a = P2(q); svg += `<circle cx="${a[0]}" cy="${a[1]}" r="3" fill="#111"/>`; });
    // IKEA arrow towards the new part
    let target = null;
    if (cur.size && k > 0) { const id = s.parts[0]; const p = G.PARTS[id]; if (p && p.c) target = P2(p.c).map(Number); }
    if (s.id === "prep") target = P2([-G.TX, G.TY + 0.03, -0.035]).map(Number);
    if (s.id === "flash") target = P2(G.ear("R", 0, 0, -0.15)).map(Number);
    if (s.id === "brow") target = P2([0, 0.5, 0]).map(Number);
    if (target && s.callout !== "check") {
      const [tx, ty] = target, ax = tx - 46, ay = ty - 52;
      svg += `<path d="M${ax} ${ay} L${tx - 9} ${ty - 11}" stroke="#111" stroke-width="3.2" fill="none"/><path d="M${tx - 2} ${ty - 2} L${tx - 16} ${ty - 8} L${tx - 9} ${ty - 16} Z" fill="#111"/>`;
    }
    svg += `</g>`;
    // callout circle
    if (s.callout && s.callout !== "qty") {
      const cx = W - 78, cy = H * 0.36, r = 64;
      if (target) svg += `<path d="M${cx - r * 0.8} ${cy + r * 0.6} L${target[0]} ${target[1]}" stroke="#111" stroke-width="1" fill="none"/>`;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#111" stroke-width="1.6"/><g transform="translate(${cx} ${cy})">${callout(s.callout)}</g>`;
      const nJ = joints.length; if (nJ) svg += `<text x="${cx}" y="${cy + r + 18}" font-size="13" font-weight="800" text-anchor="middle" fill="#111">${nJ}x</text>`;
    }
    if (s.callout === "qty" && s.bom) {
      const n = s.bom.length, cw2 = (W - 30) / n;
      s.bom.forEach((b, i) => { const x = 15 + i * cw2; svg += `<rect x="${x + 4}" y="${H - 58}" width="${cw2 - 8}" height="30" rx="3" fill="#fff" stroke="#111" stroke-width="1.1"/><text x="${x + cw2 / 2}" y="${H - 39}" font-size="9" text-anchor="middle" fill="#111">${esc(b[1].split(" ")[0])}</text><text x="${x + cw2 / 2}" y="${H - 14}" font-size="12" font-weight="800" text-anchor="middle" fill="#111">${b[0]}</text>`; });
    }
    svg += `<text x="14" y="36" font-size="30" font-weight="800" fill="#111" font-family="Inter,system-ui,sans-serif">${s.n}</text>`;
    svg += `</svg>`;
    return svg;
  }
  const cache = {};
  window.FLAT_MANUAL = { draw: (k, o) => { const key = k + JSON.stringify(o || {}); return cache[key] || (cache[key] = draw(k, o)); } };
})();
