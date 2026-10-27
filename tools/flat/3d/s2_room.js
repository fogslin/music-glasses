/* ---------------------------------------------------------------- lights + room */
const hemi = new THREE.HemisphereLight(0xffe2bf, 0x4a3324, 0.85); scene.add(hemi);
const amb = new THREE.AmbientLight(0xfff1e0, 0.25); scene.add(amb);
const sun = new THREE.DirectionalLight(0xffd29a, 2.0);
sun.position.set(5.5, 7.5, 3.0); sun.target.position.set(0, 0, -0.4);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -3.6, right: 3.6, top: 3.6, bottom: -3.6, near: 1, far: 22 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.015; sun.shadow.radius = 4;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xbcd0ff, 0.35); fill.position.set(-4, 3, 5); scene.add(fill);

const room = new THREE.Group(); room.name = "room"; scene.add(room);
const BACK_Z = -4.6, LEFT_X = -5.4, WIN_X = 4.6;
// floor: warm light planks
const floorTex = canvasTex(1024, 1024, (g, W, H) => {
  const R = rng(7); const rows = 16, rh = H / rows;
  for (let r = 0; r < rows; r++) {
    let x = -R() * 300;
    while (x < W) { const len = 260 + R() * 360; const t = 0.9 + R() * 0.16;
      g.fillStyle = `rgb(${Math.round(196 * t)},${Math.round(164 * t)},${Math.round(126 * t)})`; g.fillRect(x, r * rh, len, rh);
      g.fillStyle = "rgba(120,80,40,.10)"; for (let k = 0; k < 5; k++) g.fillRect(x, r * rh + R() * rh, len, 1);
      g.fillStyle = "rgba(90,60,30,.35)"; g.fillRect(x, r * rh, 2, rh); x += len; }
    g.fillStyle = "rgba(90,60,30,.32)"; g.fillRect(0, r * rh, W, 2);
  }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(4, 4);
const floor = mesh(new THREE.PlaneGeometry(20, 20), M("#ffffff", { map: floorTex }), false);
floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0); room.add(floor);
// walls: dark wood slats
const slatTex = canvasTex(1024, 512, (g, W, H) => {
  const R = rng(3); const n = 18, sw = W / n;
  for (let i = 0; i < n; i++) { const t = 0.85 + R() * 0.25; g.fillStyle = `rgb(${Math.round(70 * t)},${Math.round(52 * t)},${Math.round(40 * t)})`; g.fillRect(i * sw, 0, sw, H);
    g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(i * sw, 0, 3, H); g.fillStyle = "rgba(255,220,180,.05)"; g.fillRect(i * sw + 4, 0, 2, H); }
});
slatTex.wrapS = THREE.RepeatWrapping; slatTex.repeat.set(3, 1);
const wallMat = M("#ffffff", { map: slatTex });
const backWall = mesh(new THREE.PlaneGeometry(10.2, 4.4), wallMat, false); at(backWall, -0.3, 2.2, BACK_Z); room.add(backWall);
const leftWall = mesh(new THREE.PlaneGeometry(10, 4.4), wallMat, false); at(leftWall, LEFT_X + 0.0, 2.2, 0.4, 0, Math.PI / 2, 0); room.add(leftWall);
const ceil = mesh(new THREE.PlaneGeometry(10.2, 10), M("#2a211b"), false); at(ceil, -0.3, 4.4, 0.4, Math.PI / 2, 0, 0); room.add(ceil);
const base1 = box(10.2, 0.08, 0.04, M("#2b211a")); at(base1, -0.3, 0.04, BACK_Z + 0.02); room.add(base1);
// neon strips + soft halos
const neonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.82, 0.55).multiplyScalar(2.2) });
const haloTexV = canvasTex(64, 8, (g, W, H) => { const r = g.createLinearGradient(0, 0, W, 0); r.addColorStop(0, "rgba(255,200,130,0)"); r.addColorStop(0.5, "rgba(255,200,130,1)"); r.addColorStop(1, "rgba(255,200,130,0)"); g.fillStyle = r; g.fillRect(0, 0, W, H); });
function neon(len, vertical, x, y, z, ry = 0) {
  const g = new THREE.Group();
  const s = new THREE.Mesh(vertical ? new THREE.BoxGeometry(0.035, len, 0.02) : new THREE.BoxGeometry(len, 0.035, 0.02), neonMat); g.add(s);
  const h = new THREE.Mesh(new THREE.PlaneGeometry(vertical ? 0.9 : len, vertical ? len : 0.9), new THREE.MeshBasicMaterial({ map: haloTexV, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  if (!vertical) h.rotation.z = Math.PI / 2, h.geometry = new THREE.PlaneGeometry(0.9, len);
  h.position.z = -0.005; g.add(h);
  at(g, x, y, z, 0, ry, 0); noOL(g); room.add(g); return g;
}
neon(3.9, true, -2.9, 2.05, BACK_Z + 0.03); neon(3.9, true, 2.35, 2.05, BACK_Z + 0.03);
neon(9.6, false, -0.4, 4.15, BACK_Z + 0.03); neon(9.6, false, -0.4, 0.12, BACK_Z + 0.05);
neon(3.9, true, 0, 2.05, -2.8, Math.PI / 2).position.x = LEFT_X + 0.03;
// window wall (right): mullions + outside dusk
const mull = M("#1c1a19");
[-4.4, -2.5, -0.6, 1.3, 3.2, 5.0].forEach(z => { const m = box(0.09, 4.4, 0.09, mull); at(m, WIN_X, 2.2, z); room.add(m); });
[0.05, 4.3].forEach(y => { const m = box(0.12, 0.1, 9.6, mull); at(m, WIN_X, y, 0.3); room.add(m); });
const sill = box(0.5, 0.18, 9.6, M("#6b4a32")); at(sill, WIN_X - 0.1, 0.09, 0.3); room.add(sill);
const skyTex = canvasTex(16, 512, (g, W, H) => { const r = g.createLinearGradient(0, 0, 0, H); r.addColorStop(0, "#5f6f9a"); r.addColorStop(0.45, "#c99b86"); r.addColorStop(0.72, "#f0c08a"); r.addColorStop(1, "#f6dcae"); g.fillStyle = r; g.fillRect(0, 0, W, H); });
const sky = new THREE.Mesh(new THREE.PlaneGeometry(60, 18), new THREE.MeshBasicMaterial({ map: skyTex })); at(sky, 22, 7, 0, 0, -Math.PI / 2, 0); noOL(sky); room.add(sky);
const ground = mesh(new THREE.PlaneGeometry(40, 40), M("#8a8f4e"), false); ground.rotation.x = -Math.PI / 2; ground.position.set(WIN_X + 20.1, -0.02, 0); room.add(ground);
const path = mesh(new THREE.PlaneGeometry(1.4, 40), M("#cbbfa6"), false); path.rotation.x = -Math.PI / 2; path.position.set(WIN_X + 4.2, -0.01, 0); room.add(path);
{ const R = rng(11); const fol = ["#e2b33f", "#c9a23a", "#9bb04a", "#d9c25a", "#7f9a40"];
  for (let i = 0; i < 26; i++) {
    const x = WIN_X + 2 + R() * 13, z = -9 + R() * 18; if (Math.abs(x - WIN_X - 4.2) < 1) continue;
    const h = 2.2 + R() * 2.2; const t = cyl(0.05, 0.07, h, M("#ece7de"), 6); at(t, x, h / 2, z); room.add(t);
    const c = mesh(new THREE.IcosahedronGeometry(0.75 + R() * 0.6, 0), M(fol[i % fol.length], { flatShading: true })); at(c, x, h + 0.3, z, R(), R(), R()); room.add(c);
    if (R() > 0.5) { const c2 = mesh(new THREE.IcosahedronGeometry(0.5 + R() * 0.3, 0), M(fol[(i + 2) % fol.length], { flatShading: true })); at(c2, x + 0.4, h - 0.2, z + 0.3, R(), R(), 0); room.add(c2); }
  }
  [[WIN_X + 3.4, -1.8], [WIN_X + 3.4, 2.6]].forEach(([x, z]) => { const p = cyl(0.04, 0.05, 2.6, M("#2a2a2a"), 8); at(p, x, 1.3, z); room.add(p);
    const l = box(0.34, 0.26, 0.34, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.85, 0.6).multiplyScalar(1.8) })); at(l, x, 2.7, z); noOL(l); room.add(l);
    const gl = glow(0xffc27a, 1.8, 0.8); gl.position.set(x - 0.2, 2.7, z); room.add(gl); });
}
// props: armchair, side table, vase, floor lamp, books, plant, wall art, crate bench
function armchair() {
  const g = new THREE.Group(); const wood = M("#b8834f"), cush = M("#5c7a46");
  [[-0.36, 0.33], [0.36, 0.33], [-0.36, -0.33], [0.36, -0.33]].forEach(([x, z]) => { const l = box(0.06, 0.42, 0.06, wood, 0.01); at(l, x, 0.21, z); g.add(l); });
  const arms = [-0.39, 0.39].map(x => { const a = box(0.07, 0.05, 0.78, wood, 0.02); at(a, x, 0.64, 0); g.add(a); const p = box(0.05, 0.24, 0.05, wood); at(p, x, 0.52, 0.33); g.add(p); });
  const seat = box(0.72, 0.14, 0.7, cush, 0.05); at(seat, 0, 0.47, 0.02); g.add(seat);
  const back = box(0.7, 0.62, 0.13, cush, 0.05); at(back, 0, 0.82, -0.32, -0.22, 0, 0); g.add(back);
  const bf = box(0.06, 0.8, 0.06, wood); [-0.36, 0.36].forEach(x => { const b = bf.clone(); at(b, x, 0.72, -0.4, -0.22, 0, 0); g.add(b); });
  return g;
}
const chair = armchair(); at(chair, -3.0, 0, 1.9, 0, 0.65, 0); room.add(chair);
const tableG = new THREE.Group();
{ const top = cyl(0.34, 0.34, 0.04, M("#c98a52"), 32); at(top, 0, 0.58, 0); tableG.add(top);
  [0, 1, 2].forEach(i => { const a = i * Math.PI * 2 / 3; const l = cyl(0.018, 0.018, 0.58, M("#b07a46"), 8); at(l, Math.cos(a) * 0.2, 0.29, Math.sin(a) * 0.2, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); tableG.add(l); });
  const pot = cyl(0.07, 0.055, 0.1, M("#c8643c"), 16); at(pot, 0.1, 0.65, 0.05); tableG.add(pot);
  const cac = mesh(new THREE.SphereGeometry(0.06, 10, 8), M("#6f9a4a")); cac.scale.set(1, 1.4, 1); at(cac, 0.1, 0.75, 0.05); tableG.add(cac);
  const cup = cyl(0.04, 0.035, 0.08, M("#efe7da"), 16); at(cup, -0.12, 0.64, -0.06); tableG.add(cup); }
at(tableG, -2.3, 0, 0.9); room.add(tableG);
{ const vase = mesh(new THREE.LatheGeometry([new THREE.Vector2(0.0, 0), new THREE.Vector2(0.12, 0.0), new THREE.Vector2(0.15, 0.25), new THREE.Vector2(0.09, 0.55), new THREE.Vector2(0.07, 0.62), new THREE.Vector2(0.0, 0.62)], 20), M("#f1ede6"));
  const vg = new THREE.Group(); vg.add(vase); const R = rng(5);
  for (let i = 0; i < 5; i++) { const h = 0.9 + R() * 0.5; const st = cyl(0.006, 0.006, h, M("#a8926a"), 5); const a = R() * 6.28, lean = 0.12 + R() * 0.2;
    at(st, Math.cos(a) * lean * h / 2, 0.6 + h / 2, Math.sin(a) * lean * h / 2, Math.sin(a) * lean, 0, -Math.cos(a) * lean); vg.add(st);
    const leaf = mesh(new THREE.SphereGeometry(0.07, 8, 6), M("#e6d7b0", { flatShading: true })); leaf.scale.set(0.8, 2.8, 0.5); at(leaf, Math.cos(a) * lean * h, 0.6 + h, Math.sin(a) * lean * h, Math.sin(a) * lean, a, -Math.cos(a) * lean); vg.add(leaf); }
  at(vg, -2.0, 0, 2.1); room.add(vg); }
{ const lamp = new THREE.Group(); const b = cyl(0.18, 0.2, 0.03, M("#2a2a2a"), 24); at(b, 0, 0.015, 0); lamp.add(b);
  const p = cyl(0.015, 0.015, 1.6, M("#2a2a2a"), 8); at(p, 0, 0.8, 0); lamp.add(p);
  const sh = mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.3, 24, 1, true), M("#efe2c8", { side: THREE.DoubleSide, emissive: new THREE.Color(0.55, 0.42, 0.25) })); at(sh, 0, 1.65, 0); lamp.add(sh);
  const gl = glow(0xffcf8a, 1.6, 0.75); gl.position.set(0, 1.62, 0); lamp.add(gl);
  const pl = new THREE.PointLight(0xffc27a, 1.6, 6, 1.6); pl.position.set(0, 1.5, 0); lamp.add(pl);
  at(lamp, -4.6, 0, -1.2); room.add(lamp); }
function books(x, z, ry, n) { const g = new THREE.Group(); const cols = ["#b5452f", "#e9dcc0", "#5f7a54", "#3e5c86", "#c9a24a", "#8a3b2c"]; let y = 0; const R = rng(Math.round(x * 100 + z * 10));
  for (let i = 0; i < n; i++) { const h = 0.05 + R() * 0.03; const b = box(0.32 + R() * 0.08, h, 0.24 + R() * 0.05, M(cols[(i + n) % cols.length]), 0.006); at(b, (R() - 0.5) * 0.05, y + h / 2, (R() - 0.5) * 0.04, 0, (R() - 0.5) * 0.5, 0); g.add(b); y += h; }
  at(g, x, 0, z, 0, ry, 0); room.add(g); return g; }
books(0.9, -3.9, 0.3, 6); books(1.35, -3.75, -0.4, 3); books(-3.6, 0.0, 0.8, 4);
{ const pg = new THREE.Group(); const pot = cyl(0.2, 0.15, 0.32, M("#f0ece4"), 20); at(pot, 0, 0.16, 0); pg.add(pot); const R = rng(9);
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; const lf = mesh(new THREE.ConeGeometry(0.05, 0.9 + R() * 0.4, 5), M(i % 2 ? "#5f8a43" : "#7aa04f", { flatShading: true })); at(lf, Math.cos(a) * 0.08, 0.7, Math.sin(a) * 0.08, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); pg.add(lf); }
  at(pg, 3.7, 0, -3.6); room.add(pg); }
{ const art = new THREE.Group(); const fr = box(0.9, 0.7, 0.04, M("#c99a5a")); art.add(fr);
  const cv = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshLambertMaterial({ map: canvasTex(400, 300, (g, W, H) => { g.fillStyle = "#efe4cf"; g.fillRect(0, 0, W, H); g.strokeStyle = "#2b2b2b"; g.lineWidth = 10;
    g.beginPath(); g.roundRect(60, 110, 120, 90, 30); g.roundRect(220, 110, 120, 90, 30); g.moveTo(180, 140); g.quadraticCurveTo(200, 120, 220, 140); g.stroke(); g.fillStyle = "#e0453a"; g.beginPath(); g.arc(320, 70, 26, 0, 7); g.fill(); g.fillStyle = "#6f9a4a"; g.fillRect(60, 230, 280, 14); }) }));
  cv.position.z = 0.021; art.add(cv); at(art, 3.25, 2.25, BACK_Z + 0.03); room.add(art); }
{ const t = textPlane("MUSIC LAB", 1.3, 0.2, { color: "rgba(255,236,210,.55)", weight: 700, size: 0.75 }); at(t, 3.2, 1.55, BACK_Z + 0.03); room.add(t); }
{ const bench = new THREE.Group(); const w = M("#8a5c38"); for (let i = 0; i < 3; i++) { const p = box(2.2, 0.06, 0.16, w, 0.01); at(p, 0, 0.32, -0.2 + i * 0.2); bench.add(p); }
  [[-1, 0], [1, 0]].forEach(([x]) => { const l = box(0.08, 0.3, 0.55, w); at(l, x, 0.15, 0); bench.add(l); }); at(bench, 3.65, 0, 0.6, 0, Math.PI / 2, 0); room.add(bench); }
const rug = mesh(new THREE.PlaneGeometry(2.4, 1.6), M("#c9b48f"), false); rug.rotation.x = -Math.PI / 2; at(rug, -2.6, 0.003, 1.4, -Math.PI / 2, 0, 0.5); room.add(rug);

/* floating translucent wall screens: manual page + hardware inventory, and a wireframe hologram of the finished glasses */
function screen(w, h) {
  const tex = canvasTex(768, Math.round(768 * h / w), (g, W, H) => { g.fillStyle = "rgba(40,52,80,.55)"; g.fillRect(0, 0, W, H); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), new THREE.LineBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.85 }));
  const g = new THREE.Group(); g.add(m, border); noOL(g); g.userData.tex = tex; return g;
}
const scrStep = screen(1.5, 1.0); at(scrStep, -2.0, 1.95, BACK_Z + 0.12); room.add(scrStep);
const scrHw = screen(1.1, 1.0); at(scrHw, 0.95, 2.0, BACK_Z + 0.12); room.add(scrHw);
function drawStepScreen(i) {
  const tex = scrStep.userData.tex, c = tex.userData.canvas, g = tex.userData.ctx, W = c.width, H = c.height;
  const img = new Image();
  img.onload = () => {
    g.clearRect(0, 0, W, H); g.fillStyle = "rgba(38,50,78,.62)"; g.fillRect(0, 0, W, H);
    const o = document.createElement("canvas"); o.width = W - 60; o.height = H - 110; const og = o.getContext("2d");
    og.drawImage(img, 0, 0, o.width, o.height); og.globalCompositeOperation = "difference"; og.fillStyle = "#fff"; og.fillRect(0, 0, o.width, o.height);
    g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.9; g.drawImage(o, 30, 80); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    g.fillStyle = "#e9efff"; g.font = "700 40px Outfit, Arial"; g.fillText("STEP " + STEPS[i].n, 30, 54); g.font = "500 26px 'JetBrains Mono', monospace"; g.textAlign = "right"; g.fillText("page " + STEPS[i].page, W - 30, 50); g.textAlign = "left";
    tex.needsUpdate = true;
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(window.FLAT_MANUAL.draw(i, { tag: "wall" }));
}
let hwSig = "";
function drawHwScreen(rows) {
  const sig = JSON.stringify(rows); if (sig === hwSig) return; hwSig = sig;
  const tex = scrHw.userData.tex, c = tex.userData.canvas, g = tex.userData.ctx, W = c.width, H = c.height;
  g.clearRect(0, 0, W, H); g.fillStyle = "rgba(38,50,78,.62)"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#e9efff"; g.font = "700 40px Outfit, Arial"; g.fillText("HARDWARE", 30, 58);
  const tot = rows.reduce((a, r) => [a[0] + r[1], a[1] + r[2]], [0, 0]); g.font = "500 24px 'JetBrains Mono', monospace"; g.textAlign = "right"; g.fillText(`${tot[0]} / ${tot[1]} in`, W - 30, 54); g.textAlign = "left";
  rows.forEach((r, k) => { const y = 110 + k * 82; g.font = "600 24px Outfit, Arial"; g.fillStyle = "#e9efff"; g.fillText(r[0], 30, y + 20);
    const n = Math.min(r[2], 16), bw = 22, gap = 6, x0 = 290; for (let j = 0; j < n; j++) { const on = j < Math.round(r[1] / r[2] * n); g.fillStyle = on ? "#f3d9a6" : "rgba(233,239,255,.18)"; g.fillRect(x0 + j * (bw + gap), y, bw, 26); }
    g.font = "500 20px 'JetBrains Mono', monospace"; g.fillStyle = "#c9d2ea"; g.textAlign = "right"; g.fillText(`${r[1]}/${r[2]}`, W - 24, y + 22); g.textAlign = "left"; });
  tex.needsUpdate = true;
}
