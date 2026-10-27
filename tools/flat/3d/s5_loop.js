/* ---------------------------------------------------------------- hologram: wireframe of the finished glasses */
const holo = new THREE.Group(); const holoInner = new THREE.Group(); holo.add(holoInner);
{
  const lineMat = new THREE.LineBasicMaterial({ color: 0xf3f6ff, transparent: true, opacity: 0.75 });
  const add = (o, parentM) => { o.updateMatrixWorld(true); o.traverse(m => { if (m.isMesh && !m.material.transparent && m.geometry) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 28), lineMat); e.applyMatrix4(m.matrixWorld); holoInner.add(e); } }); };
  // temporarily pose every installable part at its final place
  Object.values(PR).forEach(rt => { if (rt.id === "batBig" || rt.id === "plug" || rt.id === "frame") return; rt.obj.position.copy(rt.fin.p); rt.obj.quaternion.copy(rt.fin.q); });
  add(frameG); Object.values(PR).forEach(rt => { if (!["batBig", "plug", "frame"].includes(rt.id)) add(rt.obj); });
  noOL(holo); holoInner.position.set(0, 0, 0.65);
  holo.scale.setScalar(1.0); holo.position.set(-0.45, 2.75, -3.55); room.add(holo);
}

/* ---------------------------------------------------------------- post: outlines + tone mapping */
const sparks = makePoints(260, 0xffb050, true), smoke = makePoints(140, 0xcfc7bd, false);
rig.add(sparks, smoke);
const chargeGlow = glow(0xffa030, 0.12, 0); chargeGlow.position.copy(V(G.ear("R", 0.062, -0.04, -0.07))); rig.add(chargeGlow);
const statusGlow = glow(0x3a8bff, 0.10, 0); statusGlow.position.copy(V(G.ear("R", 0.062, -0.05, 0.05))); rig.add(statusGlow);
/* sound / touch rings */
const RINGS = [0, 1, 2, 3, 4].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: 0x5eead4, transparent: true, depthWrite: false, depthTest: false })); s.visible = false; noOL(s); rig.add(s); return s; });
function ring(s, pos, t, on, color, size = 1) { s.visible = on; if (!on) return; const ph = (t * 1.4) % 1; s.position.copy(pos); s.scale.setScalar((0.05 + ph * 0.09) * size); s.material.opacity = 1 - ph; s.material.color.set(color); }
const SPK_OUT = [V(G.SPC(-1)).add(V(0.04, -0.06, -0.02)), V(G.SPC(1)).add(V(-0.04, -0.06, -0.02))];
const PADW = [0, 1, 2].map(i => V(G.padC(-1, i)).add(V(-0.01, 0, 0)));
const COPPER = new THREE.Color("#d08a4e"), PAINT = new THREE.Color("#d9c39f");
let rtColor, rtNormal;
function makeTargets() {
  const w = Math.max(2, Math.floor(innerWidth * DPR)), h = Math.max(2, Math.floor(innerHeight * DPR));
  rtColor && rtColor.dispose(); rtNormal && rtNormal.dispose();
  rtColor = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  rtNormal = new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h) });
  post.uniforms.uRes.value.set(w, h);
}
const post = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: null }, tNormal: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uNear: { value: camera.near }, uFar: { value: camera.far },
    uDraw: { value: 0 }, uThick: { value: Math.max(1, DPR * 0.85) }, uExposure: { value: 0.92 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tColor, tNormal, tDepth; uniform vec2 uRes; uniform float uNear, uFar, uDraw, uThick, uExposure; varying vec2 vUv;
    float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
    vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec2 px = uThick / uRes;
      vec3 n0 = texture2D(tNormal, vUv).xyz * 2.0 - 1.0;
      float d0 = lin(texture2D(tDepth, vUv).x);
      float dl = lin(texture2D(tDepth, vUv - vec2(px.x, 0.0)).x), dr = lin(texture2D(tDepth, vUv + vec2(px.x, 0.0)).x);
      float dd = lin(texture2D(tDepth, vUv - vec2(0.0, px.y)).x), du = lin(texture2D(tDepth, vUv + vec2(0.0, px.y)).x);
      vec3 nl = texture2D(tNormal, vUv - vec2(px.x, 0.0)).xyz * 2.0 - 1.0, nr = texture2D(tNormal, vUv + vec2(px.x, 0.0)).xyz * 2.0 - 1.0;
      vec3 nd = texture2D(tNormal, vUv - vec2(0.0, px.y)).xyz * 2.0 - 1.0, nu = texture2D(tNormal, vUv + vec2(0.0, px.y)).xyz * 2.0 - 1.0;
      float en = max(max(1.0 - dot(n0, nl), 1.0 - dot(n0, nr)), max(1.0 - dot(n0, nd), 1.0 - dot(n0, nu)));
      float lap = max(abs(dl + dr - 2.0 * d0), abs(dd + du - 2.0 * d0)) / d0;
      float edge = max(smoothstep(0.16, 0.42, en), smoothstep(0.004, 0.014, lap));
      edge *= 1.0 - smoothstep(10.0, 28.0, d0) * 0.6;
      vec3 col = texture2D(tColor, vUv).rgb;
      col = srgb(aces(col * uExposure));
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(0.62 + 0.38 * l), uDraw * 0.88);
      vec3 ink = mix(vec3(0.075, 0.06, 0.055), vec3(0.16), uDraw);
      col = mix(col, ink, edge * 0.9);
      vec2 q = vUv - 0.5; col *= 1.0 - dot(q, q) * 0.45 * (1.0 - uDraw);
      gl_FragColor = vec4(col, 1.0);
    }`,
  depthTest: false, depthWrite: false
});
const postScene = new THREE.Scene(); const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
const normalMat = new THREE.MeshNormalMaterial();
const BG_ROOM = new THREE.Color("#1d1611"), BG_DRAW = new THREE.Color("#ffffff");
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 820 ? 48 : 36; camera.updateProjectionMatrix(); makeTargets();
  sparks.material.uniforms.uScale.value = smoke.material.uniforms.uScale.value = innerHeight * DPR * 0.5;
}
addEventListener("resize", resize); resize();

/* ---------------------------------------------------------------- labels (HTML pills) */
const labelLayer = document.getElementById("ui-labels"); const labelPool = new Map();
function showLabels(list) {
  const seen = new Set(); const W = innerWidth, H = innerHeight;
  list.slice(0, 9).forEach((L, i) => {
    const key = L.key; seen.add(key);
    let el = labelPool.get(key); if (!el) { el = document.createElement("div"); el.className = "lbl " + (L.cls || ""); el.innerHTML = L.html; labelLayer.appendChild(el); labelPool.set(key, el); }
    const p = L.pos.clone().project(camera);
    const vis = p.z < 1 && p.x > -1.05 && p.x < 1.05 && p.y > -1.05 && p.y < 1.05;
    el.style.opacity = vis ? "1" : "0";
    el.style.transform = `translate(${((p.x + 1) / 2 * W).toFixed(1)}px, ${((1 - p.y) / 2 * H).toFixed(1)}px) translate(-6px,-50%)`;
  });
  labelPool.forEach((el, key) => { if (!seen.has(key)) { el.remove(); labelPool.delete(key); } });
}

/* ---------------------------------------------------------------- per-frame evaluation */
const tmpPose = { p: new THREE.Vector3(), q: new THREE.Quaternion(), scale: 1 }, toolPose = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
const camP = new THREE.Vector3(), camT = new THREE.Vector3(), _w = new THREE.Vector3(), _spinQ = new THREE.Quaternion();
const RIG_C = new THREE.Vector3(0, 0, -0.65);
let lastStepDrawn = -1, hwTimer = 0;
function directorAt(t) {
  const K = CAMKEYS; if (t <= K[0].t) { camP.copy(K[0].p); camT.copy(K[0].tg); pullBack(); return; }
  let i = 0; while (i < K.length - 1 && K[i + 1].t <= t) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)]; if (a === b) { camP.copy(a.p); camT.copy(a.tg); pullBack(); return; }
  const e = easeIO2(clamp01((t - a.t) / (b.t - a.t))); camP.copy(a.p).lerp(b.p, e); camT.copy(a.tg).lerp(b.tg, e);
  pullBack();
}
const _cd = new THREE.Vector3();
function pullBack() { // close-ups get a little more air so the panels never cover the subject
  _cd.copy(camP).sub(camT); const len = _cd.length();
  let k = 1 + 0.45 * clamp01((3.2 - len) / 2); if (camera.aspect < 1) k *= 1 + 0.9 * (1 - camera.aspect); camP.copy(camT).addScaledVector(_cd, k);
}
function evaluate(t, dt) {
  const tPods = S0("close") + 5.0, tDone = S0("done");
  // rig (finale lift + turntable)
  const u = t - tDone;
  if (u > 0) {
    const lift = 0.42 * easeIO2(clamp01(u / 2.5)); const w = 0.45; const ang = u < 0.5 ? 0 : u < 2.5 ? w * (u - 0.5) * (u - 0.5) / 4 : w * (u - 1.5);
    rig.rotation.set(0, ang, 0); const rc = RIG_C.clone().applyAxisAngle(UP, ang); rig.position.set(RIG_C.x - rc.x, lift, RIG_C.z - rc.z);
  } else { rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); }
  // parts
  Object.values(PR).forEach(rt => {
    const vis = t >= rt.appear;
    rt.obj.visible = vis;
    if (!vis) { if (rt.ghost) rt.ghost.visible = false; return; }
    partPose(rt, t, tmpPose); rt.obj.position.copy(tmpPose.p); rt.obj.quaternion.copy(tmpPose.q); rt.obj.scale.setScalar(tmpPose.scale);
    if (rt.ghost) {
      const f = rt.flights[0]; const on = f && t >= (rt.ghostFrom ?? f.t0) && t < f.t1 && rt.id !== "plug";
      rt.ghost.visible = !!on; if (on) { rt.ghost.position.copy(rt.fin.p); rt.ghost.quaternion.copy(rt.fin.q); ghostMat.opacity = 0.22 + 0.14 * Math.sin(t * 6); }
    }
  });
  // wires
  let head = null;
  Object.values(WIRE_RT).forEach(w => {
    const on = t >= w.t0 && t < tPods; w.mesh.visible = on;
    if (on) { const f = clamp01((t - w.t0) / (w.t1 - w.t0)); w.mesh.geometry.setDrawRange(0, Math.max(1, Math.floor(f * w.segs)) * 6 * 6); if (f < 1 && f > 0) head = w.curve.getPoint(f); }
  });
  headBead.visible = !!head; if (head) headBead.position.copy(head);
  // guides
  GUIDES.forEach(g => {
    const on = t >= g.t0 && t < g.t1; g.line.visible = on;
    if (on) { const f = g.lead ? clamp01((t - g.t0) / g.lead) : clamp01((t - g.t0) / 0.35); g.line.geometry.setDrawRange(0, Math.max(2, Math.ceil(f * g.n))); g.line.material.opacity = 0.95 * (1 - clamp01((t - g.t1 + 0.3) / 0.3)); }
  });
  // joints, sparks, smoke
  const sp = sparks.geometry.attributes, sm = smoke.geometry.attributes; let ns = 0, nm = 0;
  JOINTS.forEach((j, ji) => {
    const s0 = j.s0;
    j.blob.visible = t >= j.t && t < tPods; if (j.blob.visible) { const g = clamp01((t - j.t) / 0.18); j.blob.scale.setScalar((j.kind === "tin" ? 0.6 : 1) * (0.3 + 0.7 * g)); }
    const ringOn = t >= s0 + 0.5 && t < j.t; j.ring.visible = ringOn;
    if (ringOn) { const ph = (t * 1.6 + ji * 0.13) % 1; const near = t > j.t - j.gap - 0.2; j.ring.scale.setScalar((near ? 0.05 : 0.032) * (0.7 + ph * 0.8)); j.ring.material.opacity = (near ? 1 : 0.55) * (1 - ph); }
    const age = t - j.t + 0.03;
    if (age > 0 && age < 0.55) { const R = rng(ji * 7919 + 13);
      for (let k = 0; k < 16 && ns < sparks.userData.n; k++) { const vx = (R() - 0.5) * 0.9, vy = 0.35 + R() * 0.8, vz = (R() - 0.5) * 0.9, a = age * (0.7 + R() * 0.6);
        sp.position.setXYZ(ns, j.pos.x + vx * a, j.pos.y + vy * a - 2.2 * a * a, j.pos.z + vz * a); sp.alpha.setX(ns, Math.max(0, 1 - a / 0.5)); sp.size.setX(ns, 0.012); ns++; } }
    if (age > 0 && age < 1.7) { const R = rng(ji * 104729 + 7);
      for (let k = 0; k < 5 && nm < smoke.userData.n; k++) { const a = age - k * 0.12; if (a < 0) continue; const dx = (R() - 0.5) * 0.06;
        sm.position.setXYZ(nm, j.pos.x + dx + Math.sin(a * 3 + k) * 0.015, j.pos.y + 0.02 + a * 0.16, j.pos.z + dx * 0.5); sm.alpha.setX(nm, 0.42 * (1 - a / 1.5) * clamp01(a / 0.15)); sm.size.setX(nm, 0.03 + a * 0.06); nm++; } }
  });
  for (let k = ns; k < sparks.userData.n; k++) sp.alpha.setX(k, 0); for (let k = nm; k < smoke.userData.n; k++) sm.alpha.setX(k, 0);
  sp.position.needsUpdate = sp.alpha.needsUpdate = sp.size.needsUpdate = true; sm.position.needsUpdate = sm.alpha.needsUpdate = sm.size.needsUpdate = true;
  // screws
  SCREW_RT.forEach(s => { const on = t >= s.t0 - 0.45; s.g.visible = on; if (!on) return; const f = clamp01((t - s.t0) / (s.t1 - s.t0));
    const pre = clamp01((t - s.t0 + 0.45) / 0.45); s.g.position.copy(s.p).add(_w.set(0, 0.045 * (1 - pre) + 0.012 * (1 - f), 0)); s.g.rotation.y = f * Math.PI * 8; });
  // tools
  trackAt(IRON_T, t, toolPose); iron.position.copy(toolPose.p); iron.quaternion.copy(toolPose.q);
  iron.userData.glow.material.opacity = toolPose.rest ? 0.25 : 0.55 + 0.45 * toolPose.touch; iron.userData.glow.scale.setScalar(toolPose.touch ? 0.075 : 0.05);
  trackAt(DRIVER_T, t, toolPose); driver.position.copy(toolPose.p); driver.quaternion.copy(toolPose.q).multiply(_spinQ.setFromAxisAngle(UP, toolPose.spin || 0));
  trackAt(TWEEZ_T, t, toolPose); tweez.position.copy(toolPose.p); tweez.quaternion.copy(toolPose.q);
  const op = toolPose.open || 0; tweez.userData.arms[0].rotation.z = -0.05 - op * 0.12; tweez.userData.arms[1].rotation.z = 0.05 + op * 0.12;
  // special effects
  const sFl = S0("flash"), sPa = S0("pair"), sAp = S0("app"), sCl = S0("close");
  const lidU = easeIO2(win(t, sFl + 0.3, sFl + 1.6)); lid.rotation.x = 1.5708 + (-0.32 - 1.5708) * lidU;
  if (t >= sFl && t < sFl + 10) { const p = clamp01((t - sFl - 2) / 6); drawLaptopThrottled(p, t >= sFl + 8); } else if (t < sFl) drawLaptopThrottled(0, false); else drawLaptopThrottled(1, true);
  cable.visible = t >= sFl + 2.2 && t < sFl + 9.2;
  if (cable.visible) { const f = clamp01((t - sFl - 2.2) / 0.8) * (1 - clamp01((t - sFl - 8.8) / 0.4)); cable.geometry.setDrawRange(0, Math.max(1, Math.floor(f * cableSegs)) * 36); }
  chargeGlow.material.opacity = t > sFl + 2.4 && t < sFl + 8.8 ? (Math.sin(t * 5) > 0 ? 0.9 : 0.1) : 0;
  const on = t > sFl + 8.4;
  statusGlow.material.opacity = on ? (t < sPa + 1 ? (Math.sin(t * 9) > 0 ? 0.9 : 0.1) : 0.35 + 0.25 * Math.sin(t * 2)) : 0;
  // painted inlay: copper → champagne once the strips are painted
  const pu = easeIO2(win(t, sCl + 8.0, sCl + 9.4)); padMat.color.copy(COPPER).lerp(PAINT, pu); padMat.emissive.setRGB(0.06 * (1 - pu), 0.025 * (1 - pu), 0);
  // phone + music
  const ph = t >= sPa && t < sAp + STEPS[SI.app].dur;
  PHONE.visible = ph;
  let playing = true, vol = 64;
  if (ph) {
    const u = t - sPa;
    if (t < sAp) {
      playing = !(u > 6.0 && u < 7.4); vol = u < 7.8 ? 64 : Math.min(96, 64 + 8 * Math.floor((u - 7.8) / 0.75));
      drawPhone(u < 3 ? 0 : u < 5.4 ? 1 : 2, Math.floor(u), vol, playing, 0);
    } else { const v = t - sAp; vol = 96; drawPhone(v < 7.0 ? 3 : 4, Math.floor(v), vol, true, v < 4.5 ? 0 : 1); }
  }
  const uPa = t - sPa, music = ph && uPa > 3.0 && !(uPa > 6.0 && uPa < 7.4);
  ring(RINGS[0], SPK_OUT[0], t, music, 0x5eead4); ring(RINGS[1], SPK_OUT[1], t + 0.5, music, 0x5eead4);
  ring(RINGS[2], PADW[1], t * 1.6, t >= sPa + 5.6 && t < sPa + 6.3, 0xffb547, 0.7);
  const sw = t - sPa - 7.8, swk = sw >= 0 && sw < 3 ? 2 - Math.floor((sw % 0.75) / 0.25) : -1;   // back → front, toward the lens
  ring(RINGS[3], PADW[Math.max(0, swk)], t * 2, swk >= 0, 0xffb547, 0.6);
  ring(RINGS[4], V(G.ear("L", 0.06, 0.1, 0)), t * 0.8, t >= sAp && t < sAp + 11, 0x18a6c4, 0.8);
  // labels
  const L = [];
  LABELS.forEach((lb, i) => { if (t >= lb.t0 && t < lb.t1) L.push({ key: "l" + i, html: lb.html, cls: lb.cls, pos: lb.anchor().clone() }); });
  const si = FLAT.stepAt(t), stp = STEPS[si];
  JOINTS.forEach((j, i) => { if (j.step !== stp.id) return; if (t >= j.t - Math.min(j.gap, 1.0) + 0.05 && t < j.t + 0.4) L.push({ key: "j" + i, cls: "joint", pos: rig.localToWorld(j.pos.clone()), html: `${j.label} <code>${j.kind === "tin" ? "TIN" : j.kind === "low heat" ? "LOW HEAT" : "JOINT"}</code> <span class="n">· ${j.k}/${j.n}</span>` }); });
  L.sort((a, b) => (a.cls === "joint" ? -1 : 0) - (b.cls === "joint" ? -1 : 0));
  showLabels(L);
  // wall screens
  if (si !== lastStepDrawn) { lastStepDrawn = si; drawStepScreen(si); }
  hwTimer -= dt; if (hwTimer <= 0) { hwTimer = 0.25; drawHwScreen(hwRows(t)); }
  holo.rotation.y = t * 0.25;
}
let lapSig = "";
function drawLaptopThrottled(p, done) { const sig = done ? "d" : (Math.round(p * 50)).toString(); if (sig !== lapSig) { lapSig = sig; drawLaptop(p, done); } }
let hudSig = "";
function hudText(a, b) { const s = a + b; if (s !== hudSig) { hudSig = s; drawHud(a, b); } }
// USB cable from the laptop to the plug
const cableSegs = 90;
laptop.updateMatrixWorld(true);
const lapPortW = laptop.localToWorld(V(0.31, 0.018, 0.06));
const plugRear = V(G.ear("R", 0.0, -0.005, -0.27));
const cable = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([lapPortW, lapPortW.clone().add(V(0.12, 0, 0.1)), V(-1.02, 0.03, -1.2), V(-0.82, 0.04, -1.5), V(-0.68, 0.02, -1.52), plugRear]), cableSegs, 0.009, 6, false), M("#2a2a2e"));
cable.visible = false; scene.add(cable);

/* ---------------------------------------------------------------- render loop */
function render() {
  const drawing = FLAT.view === "drawing";
  room.visible = !drawing; scene.background = drawing ? BG_DRAW : BG_ROOM; post.uniforms.uDraw.value = drawing ? 1 : 0;
  renderer.setRenderTarget(rtColor); renderer.render(scene, camera);
  // normal + depth pass (outline sources only)
  const hidden = []; NO_OUTLINE.forEach(o => { if (o.visible) { o.visible = false; hidden.push(o); } });
  const bg = scene.background; scene.background = null; scene.overrideMaterial = normalMat; renderer.setClearColor(0x000000, 1);
  const sh = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(rtNormal); renderer.render(scene, camera);
  renderer.shadowMap.autoUpdate = sh; scene.overrideMaterial = null; scene.background = bg; hidden.forEach(o => o.visible = true);
  post.uniforms.tColor.value = rtColor.texture; post.uniforms.tNormal.value = rtNormal.texture; post.uniforms.tDepth.value = rtNormal.depthTexture;
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}
let prevT = -1, prevNow = performance.now(), frames = 0;
FLAT.onStep(() => { if (FLAT.playing && FLAT.freeCam) { FLAT.freeCam = false; document.body.classList.remove("freecam"); } });
function frame(now) {
  const dt = Math.min(0.1, (now - prevNow) / 1000); prevNow = now;
  const t = FLAT.t;
  evaluate(t, dt);
  directorAt(t);
  if (!FLAT.freeCam) { const k = Math.abs(t - prevT) > 0.5 || prevT < 0 ? 1 : 1 - Math.pow(0.0001, dt); camera.position.lerp(camP, k); controls.target.lerp(camT, k); camera.lookAt(controls.target); }
  else controls.update();
  prevT = t;
  render(); frames++;
  if (frames === 2) { const l = document.getElementById("ui-loading"); l && l.remove(); document.body.dataset.three = "ready"; }
  requestAnimationFrame(frame);
}
window.MG3D = { THREE, counts, scene, camera, renderer, rig, PR, JOINTS, renderOnce: () => { evaluate(FLAT.t, 0); directorAt(FLAT.t); camera.position.copy(camP); controls.target.copy(camT); camera.lookAt(camT); render(); }, version: "mg-flat-1" };
requestAnimationFrame(frame);
