/* ---------------------------------------------------------------- assembly mat + hardware cards */
const MAT_TOP = 0.012;
const matTex = canvasTex(2048, 1736, (g, W, H) => {
  g.fillStyle = "#f2ede3"; g.fillRect(0, 0, W, H);
  const ins = 46; g.strokeStyle = "#c9473a"; g.lineWidth = 10; g.strokeRect(ins, ins, W - 2 * ins, H - 2 * ins);
  g.strokeStyle = "#6f9a5a"; g.lineWidth = 8; g.strokeRect(ins + 22, ins + 22, W - 2 * ins - 44, H - 2 * ins - 44);
  g.strokeStyle = "rgba(120,100,80,.35)"; g.lineWidth = 2; for (let x = ins + 60; x < W - ins - 40; x += 40) { g.beginPath(); g.moveTo(x, ins + 36); g.lineTo(x, ins + 36 + (x % 200 === 0 ? 24 : 12)); g.stroke(); }
  g.fillStyle = "rgba(60,50,40,.55)"; g.font = "800 84px Outfit, Arial"; g.textAlign = "center"; g.save(); g.translate(W * 0.5, H * 0.60); g.fillText("MUSIC GLASSES · BUILD MAT", 0, 0); g.restore();
  g.font = "600 30px 'JetBrains Mono', monospace"; g.fillStyle = "rgba(60,50,40,.45)"; g.fillText("1 square = 10 mm (shown 10×)", W * 0.5, H * 0.60 + 50);
  g.strokeStyle = "rgba(120,100,80,.18)"; g.lineWidth = 1.5; for (let x = 200; x < W - 150; x += 120) for (let y = 220; y < H - 300; y += 120) { g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + 8, y); g.moveTo(x, y - 8); g.lineTo(x, y + 8); g.stroke(); }
});
const MAT_W = 3.9, MAT_D = 3.3, MAT_CZ = -0.3;
const matTopMat = new THREE.MeshLambertMaterial({ map: matTex });
const matMesh = mesh(new THREE.BoxGeometry(MAT_W, 0.012, MAT_D), [M("#e8e1d4"), M("#e8e1d4"), matTopMat, M("#e8e1d4"), M("#e8e1d4"), M("#e8e1d4")], false);
matMesh.position.set(0, 0.006, MAT_CZ); scene.add(matMesh);
const cards = new THREE.Group(); scene.add(cards);
[["12x", "tin"], ["27x", "wire"], ["6x", "screw"], ["6x", "copper"], ["10x", "shrink"], ["1x", "kapton"], ["1x", "flux"], ["1x", "mica paint"]].forEach((c, i) => {
  const t = canvasTex(256, 180, (g, W, H) => { g.fillStyle = "#fbfaf6"; g.fillRect(0, 0, W, H); g.strokeStyle = "#ccc"; g.lineWidth = 3; g.strokeRect(2, 2, W - 4, H - 4);
    g.fillStyle = "#e0453a"; g.fillRect(14, H - 26, 26, 8); g.fillStyle = "#222"; g.font = "800 44px Outfit, Arial"; g.textAlign = "right"; g.fillText(c[0], W - 16, H - 16);
    g.font = "600 30px Outfit, Arial"; g.textAlign = "left"; g.fillStyle = "#555"; g.fillText(c[1], 16, 46);
    g.strokeStyle = "#333"; g.lineWidth = 4; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(40 + k * 34, 92, 9, 0, 7); g.stroke(); } });
  const card = mesh(new THREE.BoxGeometry(0.34, 0.004, 0.24), [M("#fbfaf6"), M("#fbfaf6"), new THREE.MeshLambertMaterial({ map: t }), M("#fbfaf6"), M("#fbfaf6"), M("#fbfaf6")], false);
  card.position.set(-1.58 + i * 0.45, MAT_TOP + 0.002, 1.17); cards.add(card);
});

/* ---------------------------------------------------------------- materials: tortoiseshell acetate (procedural), gold wire, champagne paint */
function drawTortoise(g, W, H, seed) {
  const R = rng(seed);
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#d8bcc0"); bg.addColorStop(0.5, "#e0c6c4"); bg.addColorStop(1, "#d3b4b9");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const blob = (n, col, a0, a1, r0, r1, blur, elong) => {
    g.filter = blur >= 4 ? `blur(${blur}px)` : "none";
    for (let i = 0; i < n; i++) {
      const x = R() * W, y = R() * H, rx = r0 + R() * (r1 - r0), ry = rx * (elong ? 0.35 + R() * 0.55 : 0.7 + R() * 0.3), rot = R() * Math.PI, a = a0 + R() * (a1 - a0);
      g.fillStyle = col.replace("A", a.toFixed(2));
      for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) { const cx = x + ox, cy = y + oy; if (cx < -rx * 2 || cx > W + rx * 2 || cy < -rx * 2 || cy > H + rx * 2) continue; g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, 7); g.fill(); }
    }
  };
  blob(60, "rgba(242,230,224,A)", 0.45, 0.8, 30, 95, 12, false);   // cream / ivory clouds
  blob(90, "rgba(178,132,150,A)", 0.3, 0.55, 20, 60, 9, true);      // rose-mauve haze
  blob(110, "rgba(140,92,84,A)", 0.4, 0.7, 12, 36, 5, true);       // soft brown mottling
  blob(260, "rgba(122,74,62,A)", 0.6, 0.9, 7, 22, 3, true);         // warm brown spots
  blob(200, "rgba(70,40,44,A)", 0.7, 0.95, 3, 11, 1.5, true);       // dark plum cores
  blob(120, "rgba(160,104,120,A)", 0.4, 0.7, 4, 12, 2, true);       // mauve flecks
  blob(90, "rgba(250,240,234,A)", 0.45, 0.8, 3, 9, 1.5, false);     // light specks
  g.filter = "none";
}
const tortTex = canvasTex(1024, 1024, (g, W, H) => drawTortoise(g, W, H, 17));
tortTex.wrapS = tortTex.wrapT = THREE.RepeatWrapping; tortTex.repeat.set(0.95, 0.95);
const tortTipTex = canvasTex(1024, 256, (g, W, H) => drawTortoise(g, W, H, 29));
tortTipTex.wrapS = tortTipTex.wrapT = THREE.RepeatWrapping; tortTipTex.repeat.set(1.2, 0.5);
const ACETATE = new THREE.MeshPhongMaterial({ map: tortTex, shininess: 80, specular: new THREE.Color(0.22, 0.2, 0.2) });
const ACETATE_TIP = new THREE.MeshPhongMaterial({ map: tortTipTex, shininess: 80, specular: new THREE.Color(0.22, 0.2, 0.2) });
const WIREGOLD = new THREE.MeshPhongMaterial({ color: "#dcb68e", shininess: 90, specular: new THREE.Color(0.5, 0.42, 0.32) });
const CHAMP = new THREE.MeshPhongMaterial({ color: "#d9b88e", shininess: 38, specular: new THREE.Color(0.28, 0.25, 0.2) });
const CHAMP2 = new THREE.MeshPhongMaterial({ color: "#cdb48c", shininess: 30, specular: new THREE.Color(0.2, 0.18, 0.15) });
const METAL = M("#b9bec6"), SILVER = new THREE.MeshPhongMaterial({ color: "#d4d8de", shininess: 100, specular: new THREE.Color(0.6, 0.6, 0.6) }), GOLD = M("#d9b45a"), BLACK = M("#1d1d20");
const FRAME2 = CHAMP;
const POD_TORT = new THREE.MeshPhongMaterial({ map: tortTipTex, shininess: 60, specular: new THREE.Color(0.2, 0.18, 0.18) });   // behind-ear pods match the ear tips

/* geometry helpers */
function shapeFrom(pts, cx = 0, cy = 0, sx = 1) { const s = new THREE.Shape(); pts.forEach((p, i) => { const x = cx + sx * p[0], y = cy + p[1]; i ? s.lineTo(x, y) : s.moveTo(x, y); }); s.closePath(); return s; }
function pathFrom(pts, cx = 0, cy = 0, sx = 1) { const s = new THREE.Path(); pts.forEach((p, i) => { const x = cx + sx * p[0], y = cy + p[1]; i ? s.lineTo(x, y) : s.moveTo(x, y); }); s.closePath(); return s; }
// prism along X: profile pts in (z, y) world, spanning x0..x1
function prismX(pts, x0, x1, mat, holePts, bevel = 0.004) {
  const s = shapeFrom(pts); if (holePts) s.holes.push(pathFrom(holePts));
  const d = x1 - x0, b = Math.min(bevel, d * 0.3);
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 6 });
  geo.rotateY(-Math.PI / 2); geo.translate(x1 - b, 0, 0);
  return mesh(geo, mat);
}
function tube(pts, r, mat, seg = 64, rad = 10) { const c = new THREE.CatmullRomCurve3(pts.map(p => V(p)), false, "catmullrom", 0.3); return mesh(new THREE.TubeGeometry(c, seg, r, rad, false), mat); }

/* ---------------------------------------------------------------- glasses rig: THE photo's frames */
const rig = new THREE.Group(); rig.name = "rig"; scene.add(rig);
const frameG = new THREE.Group(); rig.add(frameG);
{
  const O = G.OUTER, Lw = G.LENS;
  const inner = G.lensPts(Lw.w, Lw.h), outer = G.lensPts(O.w, O.h);
  [-1, 1].forEach(sx => {
    const cx = sx * G.LX;
    const shp = shapeFrom(outer, cx, G.LY + O.dy, sx); shp.holes.push(pathFrom(inner, cx, G.LY, sx));
    const d = G.FZ - 0.012;
    const geo = new THREE.ExtrudeGeometry(shp, { depth: d, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3, curveSegments: 8 });
    geo.translate(0, 0, -d / 2); frameG.add(mesh(geo, ACETATE));
    // clear demo lens
    const lg = new THREE.ExtrudeGeometry(shapeFrom(G.lensPts(Lw.w + 0.012, Lw.h + 0.012), cx, G.LY, sx), { depth: 0.006, bevelEnabled: false, curveSegments: 8 }); lg.translate(0, 0, -0.003);
    const lens = mesh(lg, new THREE.MeshPhongMaterial({ color: "#e8f2f6", transparent: true, opacity: 0.16, shininess: 120, specular: new THREE.Color(0.5, 0.5, 0.5), depthWrite: false }), false); noOL(lens); frameG.add(lens);
    // end piece (acetate) + silver hinge plate with two rivets on the front corner
    const end = box(0.05, 0.095, 0.052, ACETATE, 0.014); at(end, sx * 0.637, G.TY + 0.005, -0.012); frameG.add(end);
    const plate = box(0.032, 0.066, 0.005, SILVER, 0.002); at(plate, sx * 0.606, G.TY + 0.012, G.FZ / 2 + 0.004); frameG.add(plate);
    [0.034, -0.012].forEach(dy => { const rv = cyl(0.0075, 0.0075, 0.006, SILVER, 14); at(rv, sx * 0.606, G.TY + 0.012 + dy, G.FZ / 2 + 0.007, Math.PI / 2, 0, 0); frameG.add(rv); });
    // hinge: barrel + block on the temple side
    const barrel = cyl(0.011, 0.011, 0.068, SILVER, 14); at(barrel, sx * G.TX, G.TY, -0.035); frameG.add(barrel);
    const blk = box(0.02, 0.03, 0.04, WIREGOLD, 0.006); at(blk, sx * G.TX, G.TY, -0.06); frameG.add(blk);
    // thin wire temple + acetate ear tip
    const wpts = []; for (let z = -0.05; z >= G.TIP_Z - 0.03; z -= 0.08) wpts.push(G.templeAt(sx, z)); wpts.push(G.templeAt(sx, G.TIP_Z - 0.03));
    frameG.add(tube(wpts, 0.0085, WIREGOLD, 80, 10));
    const tpts = [G.templeAt(sx, G.TIP_Z), G.templeAt(sx, -1.06), G.templeAt(sx, -1.12), G.templeAt(sx, -1.17), G.templeAt(sx, -1.25), G.templeAt(sx, -1.33), G.templeAt(sx, -1.40)];
    frameG.add(tube(tpts, 0.017, ACETATE_TIP, 60, 12));
    const cap = mesh(new THREE.SphereGeometry(0.017, 12, 10), ACETATE_TIP); cap.position.copy(V(tpts[tpts.length - 1])); frameG.add(cap);
    const cone = mesh(new THREE.CylinderGeometry(0.017, 0.0085, 0.05, 12), ACETATE_TIP); const p0 = V(G.templeAt(sx, G.TIP_Z + 0.02)); cone.position.copy(p0); cone.rotation.x = Math.PI / 2; frameG.add(cone);
    // adjustable metal nose pads
    const arm = tube([[sx * 0.052, 0.20, -0.02], [sx * 0.06, 0.19, -0.05], [sx * 0.075, 0.17, -0.07]], 0.004, SILVER, 12, 6); frameG.add(arm);
    const np = mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshPhongMaterial({ color: "#eef1f3", transparent: true, opacity: 0.8, shininess: 90 })); np.scale.set(0.38, 1, 0.65); at(np, sx * 0.083, 0.15, -0.08, 0, sx * 0.45, 0); frameG.add(np);
  });
  // acetate bridge (arch) + slim metal accent bar on top
  const bs = new THREE.Shape(); bs.moveTo(-0.085, 0.478); bs.lineTo(0.085, 0.478); bs.lineTo(0.085, 0.33); bs.quadraticCurveTo(0, 0.445, -0.085, 0.33); bs.closePath();
  const bg = new THREE.ExtrudeGeometry(bs, { depth: G.FZ - 0.016, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3, curveSegments: 10 }); bg.translate(0, 0, -(G.FZ - 0.016) / 2);
  frameG.add(mesh(bg, ACETATE));
  const bar = tube([[-0.07, 0.474, G.FZ / 2 + 0.002], [0, 0.481, G.FZ / 2 + 0.004], [0.07, 0.474, G.FZ / 2 + 0.002]], 0.0045, WIREGOLD, 16, 8); frameG.add(bar);
}

/* ---------------------------------------------------------------- parts (built in installed orientation, centred on their anchor) */
function absGroup(c) { const g = new THREE.Group(), inner = new THREE.Group(); inner.position.set(-c[0], -c[1], -c[2]); g.add(inner); g.userData.inner = inner; return g; }
function rotGroup(rx) { const g = new THREE.Group(), inner = new THREE.Group(); inner.rotation.x = rx || 0; g.add(inner); g.userData.inner = inner; return g; }
function pcb(s, color, r = 0.004) { return box(s[0], s[1], s[2], M(color), r); }
const HPY = pts => pts.map(p => [p[0], p[1] + G.TY]);
function hingeTray(sx) {          // open toward the head; outer wall carries the touch inlay channel
  const def = G.PARTS[sx < 0 ? "podR" : "podL"], g = absGroup(def.c), I = g.userData.inner, H = G.HP;
  const xo = G.hpOut(sx), prof = HPY(G.hpProfile(0)), hole = HPY(G.hpProfile(0.011));
  const wall = sx < 0 ? prismX(prof, xo, xo + H.wall, CHAMP) : prismX(prof, xo - H.wall, xo, CHAMP);
  const rimD = H.xw - H.wall - H.lid;
  const rim = sx < 0 ? prismX(prof, xo + H.wall - 0.002, xo + H.wall + rimD, CHAMP, hole, 0.003) : prismX(prof, xo - H.wall - rimD, xo - H.wall + 0.002, CHAMP, hole, 0.003);
  I.add(wall, rim);
  // tortoise front cap: seen face-on, the pod's front edge reads as part of the acetate end piece, not as a gadget
  const cap = box(H.xw + 0.002, 0.2, 0.022, ACETATE, 0.008); at(cap, sx * (G.TX + H.xc), G.TY - 0.08, H.z0 - 0.006); I.add(cap);
  const ch = box(0.004, 0.058, 0.35, CHAMP2, 0.002); at(ch, xo + sx * 0.0005, G.TY - 0.01, -0.55); I.add(ch);              // inlay channel
  const clip = box(H.xw * 0.7, 0.012, 0.05, CHAMP2, 0.004); at(clip, sx * (G.TX + H.xc), G.TY + 0.026, -0.72); I.add(clip);
  return g;
}
function hingeLid(sx) {
  const def = G.PARTS[sx < 0 ? "lidR" : "lidL"], g = absGroup(def.c), I = g.userData.inner, H = G.HP;
  const xi = G.hpIn(sx), prof = HPY(G.hpProfile(0));
  // inner (head-side) lid in tortoise: any sliver seen through the lens edge reads as the rim, not as a gadget
  I.add(sx < 0 ? prismX(prof, xi - H.lid, xi, POD_TORT, null, 0.003) : prismX(prof, xi, xi + H.lid, POD_TORT, null, 0.003));
  const slot = box(0.004, 0.018, 0.085, M("#2a2622"), 0.004); at(slot, xi, G.TY - 0.128, -0.255); slot.position.x = xi - sx * 0.0005; I.add(slot);
  for (let k = 0; k < 7; k++) { const h = cyl(0.0035, 0.0035, 0.004, M("#2a2622"), 8); at(h, xi - sx * 0.0008, G.TY - 0.098, -0.22 - k * 0.012, 0, 0, Math.PI / 2); I.add(h); }
  return g;
}
function earTray(side) {
  const P = G.EP[side], sx = side === "R" ? -1 : 1, g = rotGroup(G.EAR_ROT), I = g.userData.inner;
  const wall = 0.012, lid = 0.012, ox = sx * P.t / 2;
  const prof = rrPts(P.len, P.h, P.r), hole = rrPts(P.len - 0.022, P.h - 0.022, P.r - 0.011);
  I.add(sx < 0 ? prismX(prof, ox, ox + wall, POD_TORT) : prismX(prof, ox - wall, ox, POD_TORT));
  const rimD = P.t - wall - lid;
  I.add(sx < 0 ? prismX(prof, ox + wall - 0.002, ox + wall + rimD, POD_TORT, hole, 0.003) : prismX(prof, ox - wall - rimD, ox - wall + 0.002, POD_TORT, hole, 0.003));
  const tipX = sx * 0.6445 - G.EC[side][0];
  const sleeve = cyl(0.024, 0.024, P.len + 0.02, CHAMP2, 16); at(sleeve, tipX, 0, 0.0, Math.PI / 2, 0, 0); I.add(sleeve);   // clamp around the acetate tip
  if (side === "R") {
    const usb = box(0.03, 0.05, 0.01, M("#141416"), 0.004); at(usb, -0.028, 0, -P.len / 2 - 0.001); I.add(usb);
    const swin = box(0.03, 0.01, 0.05, M("#141416"), 0.003); at(swin, 0, P.h / 2 + 0.001, -0.004); I.add(swin);
    // mic port: 1 mm hole + short printed horn in the lower-front wall, aimed forward-down along the jaw line
    const horn = cyl(0.012, 0.007, 0.012, M("#3a2a24"), 14); at(horn, G.MIC_L[0], -P.h / 2 - 0.002, G.MIC_L[2]); I.add(horn);
    const hole2 = cyl(0.005, 0.005, 0.004, BLACK, 10); at(hole2, G.MIC_L[0], -P.h / 2 - 0.008, G.MIC_L[2]); I.add(hole2);
  }
  return g;
}
function rrPts(len, h, r, n = 6) { // rounded rect in (z, y), centred
  const pts = [], cs = [[len / 2 - r, h / 2 - r, 0], [-len / 2 + r, h / 2 - r, 90], [-len / 2 + r, -h / 2 + r, 180], [len / 2 - r, -h / 2 + r, 270]];
  cs.forEach(([cx, cy, a0]) => { for (let i = 0; i <= n; i++) { const a = (a0 + i * 90 / n) * Math.PI / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } }); return pts;
}
function earLid(side) {
  const P = G.EP[side], sx = side === "R" ? -1 : 1, g = rotGroup(G.EAR_ROT), I = g.userData.inner, lid = 0.012;
  const prof = rrPts(P.len, P.h, P.r);
  I.add(prismX(prof, -lid / 2, lid / 2, POD_TORT, null, 0.003));
  return g;
}
const padMat = M("#d08a4e", { unique: true, emissive: new THREE.Color(0.06, 0.025, 0.0) });
const BUILD = {
  podR() { return hingeTray(-1); }, podL() { return hingeTray(1); },
  lidR() { return hingeLid(-1); }, lidL() { return hingeLid(1); },
  earR() { return earTray("R"); }, earL() { return earTray("L"); },
  lidER() { return earLid("R"); }, lidEL() { return earLid("L"); },
  qtpy() { const s = G.PARTS.qtpy.s, g = rotGroup(G.EAR_ROT), I = g.userData.inner;
    const b = pcb([0.012, s[1], s[2]], "#1c1c22"); at(b, -0.009, 0, 0); I.add(b);               // board on the outer side, parts face +x (pod centre)
    const mod = box(0.012, 0.085, 0.085, SILVER, 0.003); at(mod, 0.003, 0.0, 0.03); I.add(mod);
    const lt = canvasTex(256, 256, (c, W, H) => { c.fillStyle = "#cfd3d8"; c.fillRect(0, 0, W, H); c.fillStyle = "#333"; c.font = "700 34px 'JetBrains Mono', monospace"; c.fillText("ESP32-", 22, 100); c.fillText("PICO-V3", 22, 145); c.font = "500 24px 'JetBrains Mono', monospace"; c.fillText("02", 22, 185); });
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.075), new THREE.MeshBasicMaterial({ map: lt })); at(lab, 0.0095, 0, 0.03, 0, Math.PI / 2, 0); lab.rotation.z = Math.PI / 2; noOL(lab); I.add(lab);
    const usb = box(0.032, 0.09, 0.075, METAL, 0.012); at(usb, -0.002, 0, -0.085); I.add(usb);
    const neo = box(0.006, 0.02, 0.02, M("#f4f4f4"), 0.003); at(neo, 0.0, -0.05, 0.045); I.add(neo);
    [-0.05, 0.05].forEach(y => { const bt = box(0.006, 0.025, 0.035, M("#e9e5dc"), 0.003); at(bt, -0.001, y, -0.03); I.add(bt); });
    for (let i = 0; i < 7; i++) [-1, 1].forEach(e => { const p = box(0.008, 0.012, 0.014, GOLD); at(p, -0.003, e * 0.078, -0.076 + i * 0.0254); I.add(p); });
    [0.035, -0.02].forEach(y => { const p = box(0.002, 0.016, 0.022, GOLD); at(p, -0.0155, y, 0.065); I.add(p); });   // VBAT +/− on the back
    return g; },
  chg() { const s = G.PARTS.chg.s, g = rotGroup(G.EAR_ROT), I = g.userData.inner;
    const b = pcb([0.008, s[1], s[2]], "#1c1c22"); at(b, 0.006, 0, 0); I.add(b);   // parts face −x (pod centre)
    const usb = box(0.014, 0.075, 0.06, METAL, 0.01); at(usb, -0.002, -0.03, -0.065); I.add(usb);
    const jst = box(0.014, 0.05, 0.04, M("#f1ece1"), 0.004); at(jst, -0.003, -0.04, 0.06); I.add(jst);
    const ic = box(0.004, 0.025, 0.025, BLACK); at(ic, 0.0, 0.03, 0.0); I.add(ic);
    const led = box(0.004, 0.012, 0.012, M("#ffb347", { emissive: new THREE.Color(0.2, 0.1, 0) })); at(led, 0.0, 0.0, 0.05); I.add(led);
    [-0.05, -0.02, 0.03].forEach(z => { const p = box(0.006, 0.012, 0.014, GOLD); at(p, -0.0, 0.07, z); I.add(p); });
    return g; },
  mic() { const s = G.PARTS.mic.s, g = rotGroup(G.EAR_ROT), I = g.userData.inner;
    const b = pcb([s[0], 0.008, s[2]], "#1c1c22"); I.add(b);                                       // breakout, mic on the outward (−y) face
    const can = box(0.035, 0.012, 0.026, SILVER, 0.003); at(can, 0, -0.008, 0); I.add(can);       // SPH0645 can over the port
    const lt = canvasTex(256, 128, (c, W, H) => { c.fillStyle = "#1c1c22"; c.fillRect(0, 0, W, H); c.fillStyle = "#e8e8e8"; c.font = "700 30px 'JetBrains Mono', monospace"; c.fillText("SPH0645", 18, 52); c.font = "500 22px 'JetBrains Mono', monospace"; c.fillText("I2S MIC", 18, 92); });
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), new THREE.MeshBasicMaterial({ map: lt })); at(lab, -0.02, 0.0045, -0.03, -Math.PI / 2, 0, 0); noOL(lab); I.add(lab);
    for (let i = 0; i < 6; i++) { const p = box(0.012, 0.01, 0.012, GOLD); at(p, 0.045, 0.006, -0.0635 + i * 0.0254); I.add(p); }
    return g; },
  div() { const g = rotGroup(G.EAR_ROT), I = g.userData.inner; [-0.012, 0.012].forEach(z => { const r = cyl(0.005, 0.005, 0.03, M("#d9c9a3"), 10); at(r, 0, 0, z, 0, 0, 0); r.rotation.x = Math.PI / 2; I.add(r); }); return g; },
  res() { const g = new THREE.Group(); const r = cyl(0.005, 0.005, 0.034, M("#d9c9a3"), 10); r.rotation.x = Math.PI / 2; g.add(r);
    [-0.008, 0, 0.008].forEach((z, k) => { const b = cyl(0.0053, 0.0053, 0.003, M(["#f08a2c", "#f08a2c", "#f2c230"][k]), 10); at(b, 0, 0, z, Math.PI / 2, 0, 0); g.add(b); }); return g; },
  amp(sx) { const s = G.PARTS.ampR.s, g = new THREE.Group(); const b = pcb([0.006, s[1], s[2]], "#1f2a44"); at(b, sx * 0.004, 0, 0); g.add(b);
    const ic = box(0.004, 0.04, 0.04, BLACK); at(ic, -sx * 0.001, 0.0, 0.0); g.add(ic);
    const tb = box(0.012, 0.03, 0.06, M("#2f7fd0"), 0.004); at(tb, -sx * 0.003, -0.065, 0.0); g.add(tb);
    for (let k = 0; k < 7; k++) { const p = box(0.006, 0.01, 0.012, GOLD); at(p, -sx * 0.002, 0.07, 0.0762 - k * 0.0254); g.add(p); } return g; },
  ampR() { return BUILD.amp(-1); }, ampL() { return BUILD.amp(1); },
  spk(sx) { const s = G.PARTS.spkR.s, g = new THREE.Group(); g.add(box(s[0], s[1], s[2], M("#2c2c32"), 0.012));
    const face = box(0.004, s[1] * 0.78, s[2] * 0.82, M("#9aa0a8"), 0.01); at(face, -sx * (s[0] / 2), 0, 0); g.add(face);
    const cone = cyl(0.03, 0.03, 0.004, M("#5a5e66"), 20); at(cone, -sx * (s[0] / 2 + 0.002), 0, 0, 0, 0, Math.PI / 2); g.add(cone);
    [0.03, -0.03].forEach(y => { const p = box(0.008, 0.012, 0.01, GOLD); at(p, 0, y, -s[2] / 2 - 0.004); g.add(p); }); return g; },
  spkR() { return BUILD.spk(-1); }, spkL() { return BUILD.spk(1); },
  pad() { const g = new THREE.Group(); g.add(box(0.003, 0.05, 0.10, padMat)); return g; },
  bat() { const s = G.PARTS.bat.s, g = rotGroup(G.EAR_ROT), I = g.userData.inner; I.add(box(s[0], s[1], s[2], M("#cfd3d8"), 0.01));
    const lt = canvasTex(512, 200, (c, W, H) => { c.fillStyle = "#3e6fb5"; c.fillRect(0, 0, W, H); c.fillStyle = "#fff"; c.font = "800 54px 'JetBrains Mono', monospace"; c.fillText("401230", 24, 78); c.font = "600 38px 'JetBrains Mono', monospace"; c.fillText("3.7V 120mAh", 24, 140); c.font = "500 24px Outfit"; c.fillText("Li-polymer · protected", 24, 184); });
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(s[2] * 0.82, s[1] * 0.8), new THREE.MeshLambertMaterial({ map: lt })); at(lab, -s[0] / 2 - 0.0015, 0, 0, 0, -Math.PI / 2, 0); I.add(lab);
    const pcm = box(0.03, 0.08, 0.012, M("#2f8a4f")); at(pcm, 0, 0, s[2] / 2 + 0.006); I.add(pcm); return g; },
  batBig() { const g = new THREE.Group(); g.add(box(0.06, 0.2, 0.36, M("#cfd3d8"), 0.012));
    const lt = canvasTex(512, 260, (c, W, H) => { c.fillStyle = "#6b4fa0"; c.fillRect(0, 0, W, H); c.fillStyle = "#fff"; c.font = "800 52px 'JetBrains Mono', monospace"; c.fillText("LiPo 3.7V", 24, 90); c.fillText("350 mAh", 24, 160); c.font = "500 26px Outfit"; c.fillText("option · bigger ear pod", 24, 220); });
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.17), new THREE.MeshLambertMaterial({ map: lt })); at(lab, 0.0315, 0, 0, 0, Math.PI / 2, 0); g.add(lab); return g; },
  sw() { const g = rotGroup(G.EAR_ROT), I = g.userData.inner; I.add(box(0.035, 0.022, 0.07, METAL, 0.004)); const kn = box(0.012, 0.018, 0.016, BLACK, 0.003); at(kn, 0, 0.018, 0.01); I.add(kn);
    [-0.02, 0.012, 0.044].forEach(z => { const p = box(0.006, 0.016, 0.004, GOLD); at(p, 0, -0.018, z - 0.012); I.add(p); }); return g; },
  sleeve(sx) { const def = G.PARTS[sx < 0 ? "sleeveR" : "sleeveL"], g = absGroup(def.c), I = g.userData.inner; const pts = []; for (let z = -0.765; z >= -1.16; z -= 0.06) pts.push(G.templeAt(sx, z)); pts.push(G.templeAt(sx, -1.165));
    I.add(tube(pts.map(p => [p[0], p[1] - 0.004, p[2]]), 0.026, CHAMP, 40, 12)); return g; },
  sleeveR() { return BUILD.sleeve(-1); }, sleeveL() { return BUILD.sleeve(1); },
  browCap() { const def = G.PARTS.browCap, g = absGroup(def.c), I = g.userData.inner; I.add(tube(G.brow(4).slice(2, -2).map(p => [p[0], p[1], p[2] - 0.002]), 0.016, ACETATE, 90, 10)); return g; },
  plug() { const g = rotGroup(G.EAR_ROT), I = g.userData.inner; const b = box(0.06, 0.08, 0.09, M("#2c2c30"), 0.02); at(b, 0, 0, -0.04); I.add(b); const t = box(0.028, 0.07, 0.04, METAL, 0.012); at(t, 0, 0, 0.02); I.add(t); return g; },
  frame() { return null; }
};

/* ---------------------------------------------------------------- tools */
function makeIron() {
  const g = new THREE.Group();
  const tip = mesh(new THREE.ConeGeometry(0.008, 0.06, 12), METAL); at(tip, 0, 0.03, 0, Math.PI, 0, 0); g.add(tip);
  const sh = cyl(0.011, 0.011, 0.22, METAL, 12); at(sh, 0, 0.17, 0); g.add(sh);
  const grip = cyl(0.03, 0.026, 0.32, M("#27384f"), 16); at(grip, 0, 0.44, 0); g.add(grip);
  const ring = cyl(0.033, 0.033, 0.03, M("#f2a03b"), 16); at(ring, 0, 0.3, 0); g.add(ring);
  const cord = cyl(0.008, 0.008, 0.2, BLACK, 6); at(cord, 0, 0.7, 0); g.add(cord);
  const gl = glow(0xff7a2a, 0.12, 0.0); gl.position.set(0, 0.004, 0); g.add(gl); g.userData.glow = gl;
  return g;
}
function makeDriver() {
  const g = new THREE.Group(); const sh = cyl(0.005, 0.005, 0.18, METAL, 8); at(sh, 0, 0.09, 0); g.add(sh);
  const h = cyl(0.026, 0.022, 0.2, M("#d63b2f"), 6); at(h, 0, 0.28, 0); g.add(h); const cap = cyl(0.027, 0.027, 0.03, BLACK, 6); at(cap, 0, 0.39, 0); g.add(cap); return g;
}
function makeTweezers() {
  const g = new THREE.Group(); const a = box(0.008, 0.26, 0.016, METAL, 0.003), b = a.clone();
  const pa = new THREE.Group(), pb = new THREE.Group(); at(a, 0, 0.13, 0); at(b, 0, 0.13, 0); pa.add(a); pb.add(b);
  pa.position.set(0.012, 0, 0); pb.position.set(-0.012, 0, 0); g.add(pa, pb); g.userData.arms = [pa, pb]; return g;
}
const iron = makeIron(), driver = makeDriver(), tweez = makeTweezers();
scene.add(iron, driver, tweez);
const stand = new THREE.Group(); { const b = box(0.22, 0.03, 0.16, BLACK, 0.01); at(b, 0, 0.015, 0); stand.add(b); const sp = box(0.12, 0.025, 0.1, M("#e6c34a"), 0.01); at(sp, -0.04, 0.042, 0); stand.add(sp);
  const coil = mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 18), METAL); at(coil, 0.06, 0.09, 0, 0, Math.PI / 2, 0); stand.add(coil); }
at(stand, 1.55, MAT_TOP, 0.95); scene.add(stand);

/* ---------------------------------------------------------------- laptop + cable */
const laptop = new THREE.Group(); const lid = new THREE.Group();
{ const base = box(0.62, 0.028, 0.42, M("#c9ccd2"), 0.012); at(base, 0, 0.014, 0); laptop.add(base);
  const kb = box(0.54, 0.002, 0.2, M("#2a2c31")); at(kb, 0, 0.029, -0.04); laptop.add(kb);
  const tp = box(0.16, 0.002, 0.09, M("#b8bbc2")); at(tp, 0, 0.029, 0.13); laptop.add(tp);
  const lb = box(0.62, 0.4, 0.016, M("#c9ccd2"), 0.012); at(lb, 0, 0.2, -0.008); lid.add(lb);
  lid.position.set(0, 0.03, -0.21); laptop.add(lid);
}
const lapTex = canvasTex(640, 400, () => {});
const lapScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.35), new THREE.MeshBasicMaterial({ map: lapTex })); at(lapScreen, 0, 0.2, 0.0005); noOL(lapScreen); lid.add(lapScreen);
function drawLaptop(p, done) {
  const g = lapTex.userData.ctx; g.fillStyle = "#1f2428"; g.fillRect(0, 0, 640, 400); g.fillStyle = "#0e7c86"; g.fillRect(0, 0, 640, 42);
  g.fillStyle = "#fff"; g.font = "600 20px Outfit, Arial"; g.fillText("music_glasses.ino — Arduino IDE 2", 16, 28);
  g.font = "16px 'JetBrains Mono', monospace"; const lines = ["#include \"AudioTools.h\"", "#include \"BluetoothA2DPSink.h\"", "#include <BLEDevice.h>  // Bluedroid", "const uint8_t PAD_R[3] = {27, 4, 33};", "void setup() {", "  a2dp.start(\"Muse Glasses\");", "  bleBegin();"];
  lines.forEach((l, i) => { g.fillStyle = i < 3 ? "#7fd0a0" : i < 4 ? "#f3c86b" : "#d7dde3"; g.fillText(l, 20, 80 + i * 26); });
  g.fillStyle = "#11161a"; g.fillRect(0, 280, 640, 120); g.fillStyle = "#d7dde3"; g.font = "15px 'JetBrains Mono', monospace";
  g.fillText(done ? "Done uploading. Hard resetting via RTS pin..." : p > 0 ? "Writing at 0x000" + Math.floor(p * 9) + "a000... (" + Math.round(p * 100) + " %)" : "Board: Adafruit QT Py ESP32 · 3MB APP · 921600", 16, 310);
  g.fillStyle = "#2b3238"; g.fillRect(16, 330, 608, 18); g.fillStyle = done ? "#3cb35a" : "#0e9aa7"; g.fillRect(16, 330, 608 * (done ? 1 : p), 18);
  lapTex.needsUpdate = true;
}
drawLaptop(0, false);
at(laptop, -1.52, MAT_TOP, -1.42, 0, Math.PI / 2 - 0.25, 0); scene.add(laptop);

/* ---------------------------------------------------------------- phone prop (pairing + companion app) */
const PHONE = new THREE.Group();
const PHONE_TEX = canvasTex(360, 720, () => {});
{
  const body = box(0.34, 0.70, 0.03, M("#1b1c20"), 0.04); PHONE.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.64), new THREE.MeshBasicMaterial({ map: PHONE_TEX })); scr.position.z = 0.0155; noOL(scr); PHONE.add(scr);
  const st = box(0.22, 0.03, 0.16, M("#c9ccd2"), 0.01); st.position.set(0, -0.34, -0.06); PHONE.add(st);
  PHONE.position.set(1.12, MAT_TOP + 0.36, 0.52); PHONE.rotation.set(-0.22, -0.38, 0); PHONE.visible = false; scene.add(PHONE);
}
let phoneSig = "";
function drawPhone(mode, sec, vol, playing, eq) {
  const sig = [mode, sec, vol, playing, eq].join("|"); if (sig === phoneSig) return; phoneSig = sig;
  const g = PHONE_TEX.userData.ctx, W = 360, H = 720;
  const app = mode >= 3;
  g.fillStyle = app ? "#16120e" : "#101826"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#e8edf5"; g.font = "600 22px Outfit, Arial"; g.textAlign = "left"; g.fillText("2:13", 22, 38); g.textAlign = "right"; g.fillText("ᛒ  ▮▮▮", W - 22, 38); g.textAlign = "center";
  const title = "Champagne", artist = "Bose Orange";
  if (mode === 0) {
    g.font = "700 30px Outfit, Arial"; g.fillText("Bluetooth", W / 2, 110);
    g.fillStyle = "#1e2a3e"; g.fillRect(24, 160, W - 48, 90); g.fillStyle = "#e8edf5"; g.font = "700 30px Outfit, Arial"; g.textAlign = "left"; g.fillText("Muse Glasses", 44, 204);
    g.font = "500 21px Outfit, Arial"; g.fillStyle = "#5eead4"; g.fillText(sec < 1 ? "Pairing…" : "Connected · audio", 44, 234); g.textAlign = "center";
    g.fillStyle = "#93a4c3"; g.font = "500 18px Outfit, Arial"; g.fillText("pair audio here, not in the app", W / 2, 300);
  } else if (mode === 1 || mode === 2) {
    g.font = "700 26px Outfit, Arial"; g.fillText("Now playing", W / 2, 96);
    const gr = g.createLinearGradient(70, 130, W - 70, 350); gr.addColorStop(0, "#c78a5a"); gr.addColorStop(1, "#6b3f5c"); g.fillStyle = gr; g.fillRect(70, 126, W - 140, W - 140);
    g.fillStyle = "#fff"; g.font = "800 84px Outfit, Arial"; g.fillText("♪", W / 2, 300);
    g.fillStyle = "#e8edf5"; g.font = "700 28px Outfit, Arial"; g.fillText(title, W / 2, 400); g.font = "500 21px Outfit, Arial"; g.fillStyle = "#aab6c8"; g.fillText(artist + "  →  Muse Glasses", W / 2, 432);
    g.fillStyle = "#e8edf5"; g.font = "700 46px Outfit, Arial"; g.fillText(playing ? "❚❚" : "▶", W / 2, 520);
    g.font = "500 18px 'JetBrains Mono', monospace"; g.fillStyle = "#93a4c3"; g.fillText("volume", W / 2, 575);
    g.fillStyle = "#2b3238"; g.fillRect(40, 592, W - 80, 10); g.fillStyle = "#f4a93b"; g.fillRect(40, 592, (W - 80) * vol / 127, 10);
    g.beginPath(); g.fillStyle = "#fff"; g.arc(40 + (W - 80) * vol / 127, 597, 11, 0, 7); g.fill();
    if (mode === 2) { g.fillStyle = "rgba(244,169,59,.95)"; g.fillRect(60, 640, W - 120, 46); g.fillStyle = "#16120e"; g.font = "700 20px Outfit, Arial"; g.fillText(playing ? "swipe on the temple → volume" : "tap → pause", W / 2, 670); }
  } else if (mode === 4) {                       // Find my glasses
    g.fillStyle = "#f4a93b"; g.font = "800 28px Outfit, Arial"; g.textAlign = "left"; g.fillText("Find my glasses", 24, 90);
    g.font = "500 17px 'JetBrains Mono', monospace"; g.fillStyle = "#5eead4"; g.fillText("● in range · RSSI −58 dBm", 24, 120);
    g.textAlign = "center"; const cx = W / 2, cy = 300, warm = 0.55 + 0.1 * Math.sin(sec);
    for (let i = 0; i < 10; i++) { const a0 = Math.PI * (1 + i / 10), a1 = Math.PI * (1 + (i + 0.85) / 10); g.beginPath(); g.strokeStyle = i / 10 < warm ? `hsl(${200 - i * 20},80%,58%)` : "#2a231c"; g.lineWidth = 26; g.arc(cx, cy, 120, a0, a1); g.stroke(); }
    g.fillStyle = "#e8edf5"; g.font = "800 40px Outfit, Arial"; g.fillText("Warmer", cx, cy - 10); g.font = "500 18px Outfit, Arial"; g.fillStyle = "#b9ad9d"; g.fillText("≈ 1–3 m away", cx, cy + 22);
    g.fillStyle = "#231d17"; g.fillRect(20, 350, W - 40, 110); g.textAlign = "left";
    g.fillStyle = "#e8edf5"; g.font = "700 20px Outfit, Arial"; g.fillText("Last seen", 40, 385); g.font = "500 17px Outfit, Arial"; g.fillStyle = "#b9ad9d";
    g.fillText("Connected now", 40, 413); g.fillText("Last disconnect: Home · 2:02 PM", 40, 440);
    g.fillStyle = "#f4a93b"; g.fillRect(40, 490, W - 80, 64); g.fillStyle = "#16120e"; g.font = "800 24px Outfit, Arial"; g.textAlign = "center"; g.fillText("🔔 Play sound", W / 2, 532);
    g.fillStyle = "#93a4c3"; g.font = "500 15px Outfit, Arial"; g.fillText("chimes even if muted · 9f3c0008", W / 2, 590);
  } else {
    g.fillStyle = "#f4a93b"; g.font = "800 28px Outfit, Arial"; g.textAlign = "left"; g.fillText("Muse Glasses", 24, 90);
    g.font = "500 17px 'JetBrains Mono', monospace"; g.fillStyle = "#5eead4"; g.fillText("● BLE connected · audio streaming", 24, 120);
    g.fillStyle = "#d9cbb8"; g.textAlign = "right"; g.fillText("🔋 " + (82 - Math.floor(sec / 4)) + " %", W - 24, 90); g.textAlign = "left";
    g.fillStyle = "#231d17"; g.fillRect(20, 145, W - 40, 190);
    g.fillStyle = "#e8edf5"; g.font = "700 26px Outfit, Arial"; g.fillText(title, 40, 190); g.font = "500 19px Outfit, Arial"; g.fillStyle = "#b9ad9d"; g.fillText(artist, 40, 220);
    g.fillStyle = "#e8edf5"; g.font = "700 36px Outfit, Arial"; g.fillText(playing ? "❚❚" : "▶", 40, 290);
    g.fillStyle = "#3a3128"; g.fillRect(100, 270, W - 140, 8); g.fillStyle = "#f4a93b"; g.fillRect(100, 270, (W - 140) * vol / 127, 8);
    g.font = "500 15px 'JetBrains Mono', monospace"; g.fillStyle = "#b9ad9d"; g.fillText("vol " + vol + "/127", 100, 310);
    g.fillStyle = "#e8edf5"; g.font = "700 22px Outfit, Arial"; g.fillText("EQ preset", 24, 385);
    ["Flat", "Bass+", "Vocal", "Treble"].forEach((n, i) => { const x = 24 + i * 81; g.fillStyle = i === eq ? "#f4a93b" : "#2a231c"; g.fillRect(x, 402, 74, 44); g.fillStyle = i === eq ? "#16120e" : "#e8edf5"; g.font = "700 17px Outfit, Arial"; g.textAlign = "center"; g.fillText(n, x + 37, 430); g.textAlign = "left"; });
    g.fillStyle = "#e8edf5"; g.font = "700 22px Outfit, Arial"; g.fillText("Settings", 24, 500);
    g.font = "500 18px Outfit, Arial"; g.fillStyle = "#b9ad9d"; ["Swipe direction · toward lens = up", "Recalibrate touch", "Firmware 0.1.0"].forEach((s, i) => g.fillText(s, 24, 536 + i * 32));
    g.font = "500 13px 'JetBrains Mono', monospace"; g.fillStyle = "#6f6558"; g.fillText("svc 9f3c0001-2b6e-4c1a-8f5d-6a7e0b1c2d3e", 18, 690);
  }
  g.textAlign = "left"; PHONE_TEX.needsUpdate = true;
}
drawPhone(0, 0, 64, true, 1);
