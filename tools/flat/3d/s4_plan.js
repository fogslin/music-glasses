/* ---------------------------------------------------------------- build plan (everything is a pure function of time t) */
const UP = new THREE.Vector3(0, 1, 0);
const PR = {};                      // part runtime
const JOINTS = [], WIRE_RT = {}, SCREW_RT = [], GUIDES = [], LABELS = [], FX = [], CAMKEYS = [];
const ghostMat = new THREE.MeshBasicMaterial({ color: 0xfff6e6, transparent: true, opacity: 0.3, depthWrite: false });
const APPROACH = { frame: [0, 1, 0], podR: [-1, 0.35, 0], podL: [1, 0.35, 0], earR: [-0.6, 1, -0.3], earL: [0.6, 1, -0.3], qtpy: [1, 0.6, 0], chg: [1, 0.6, 0], div: [0.6, 1, 0],
  ampR: [1, 0.4, 0], ampL: [-1, 0.4, 0], spkR: [1, 0.3, 0], spkL: [-1, 0.3, 0], res: [0.5, 1, 0], padR1: [-1, 0.2, 0], padR2: [-1, 0.2, 0], padR3: [-1, 0.2, 0], padL1: [1, 0.2, 0], padL2: [1, 0.2, 0], padL3: [1, 0.2, 0],
  bat: [-1, 0.6, 0], sw: [0, 1, 0], lidR: [1, 0.3, 0], lidL: [-1, 0.3, 0], lidER: [1, 0.4, 0], lidEL: [-1, 0.4, 0], sleeveR: [-0.4, 1, 0], sleeveL: [0.4, 1, 0], browCap: [0, 0.6, -1], mic: [-0.4, -0.7, 0.6], plug: [0, -0.67, -0.74] };
const PIECE_IDS = [];
let appearIdx = 0;
function makePart(id) {
  const def = G.PARTS[id];
  let obj;
  if (id === "frame") obj = frameG;
  else if (id.startsWith("pad")) obj = BUILD.pad();
  else obj = BUILD[id]();
  const world = id === "batBig" || id === "plug";
  if (id !== "frame") (world ? scene : rig).add(obj);
  const rt = { id, obj, def, flights: [], appear: 0, world };
  // mat pose
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(def.matRot || [0, 0, 0])));
  if (id === "frame") { rt.mat = { p: V(0, 1.6, 0.5), q: new THREE.Quaternion() }; }
  else {
    obj.position.set(0, 0, 0); obj.quaternion.copy(q); obj.scale.set(1, 1, 1); obj.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(obj);
    const off = new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2);
    if (rt.world) { /* world parent: rig is identity at build time */ }
    rt.mat = { p: V(def.mat[0] - off.x, MAT_TOP + 0.001 - off.y, def.mat[2] - off.z), q };
  }
  rt.fin = { p: def.c ? V(def.c) : V(0, 0, 0), q: new THREE.Quaternion() };
  // ghost
  if (id !== "batBig") {
    const gsrc = id === "frame" ? frameG : obj;
    const gh = gsrc.clone(true); gh.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } if (o.isSprite) o.visible = false; });
    gh.visible = false; noOL(gh); (world ? scene : rig).add(gh); rt.ghost = gh;
  }
  PR[id] = rt; return rt;
}
Object.keys(G.PARTS).forEach(makePart);

function partPose(rt, t, out) {
  let p = rt.mat.p, q = rt.mat.q, scale = 1, moving = false;
  for (const f of rt.flights) {
    if (t >= f.t1) { p = f.to.p; q = f.to.q; const v = t - f.t1; if (v < 0.28 && f.snap !== false) scale = 1 + 0.07 * Math.sin(Math.PI * v / 0.28); continue; }
    if (t >= f.t0) {
      const u = (t - f.t0) / (f.t1 - f.t0), e = easeIO(u);
      const a = f.from.p, b = f.to.p, ap = f.approach;
      const c1 = a.clone().addScaledVector(UP, f.lift), c2 = b.clone().addScaledVector(ap, f.reach);
      const k = 1 - e; out.p.set(0, 0, 0).addScaledVector(a, k * k * k).addScaledVector(c1, 3 * k * k * e).addScaledVector(c2, 3 * k * e * e).addScaledVector(b, e * e * e);
      out.q.copy(f.from.q).slerp(f.to.q, easeIO2(clamp01(u * 1.35)));
      out.scale = 1; out.moving = true; return out;
    }
    break;
  }
  out.p.copy(p); out.q.copy(q); out.scale = scale; out.moving = moving;
  // appear-drop on the mat during the layout step
  if (t < rt.appear + 0.5 && (!rt.flights.length || t < rt.flights[0].t0)) { const u = clamp01((t - rt.appear) / 0.5); out.p.y += 0.35 * (1 - easeOut(u)) ; }
  return out;
}

function addFlight(rt, t0, t1, from, to, opt = {}) {
  const ap = V(opt.approach || APPROACH[rt.id] || [0, 1, 0]).normalize();
  const dist = from.p.distanceTo(to.p);
  rt.flights.push({ t0, t1, from, to, approach: ap, lift: opt.lift ?? (0.35 + dist * 0.25), reach: opt.reach ?? 0.32, snap: opt.snap });
  rt.flights.sort((a, b) => a.t0 - b.t0);
}

/* step-plan API */
const ironKeys = [], driverKeys = [], tweezKeys = [];
let driverSpin = 0;
function api(stepId) {
  const s0 = S0(stepId);
  const A = {
    s0,
    fly(id, a, b, opt = {}) {
      const rt = PR[id]; addFlight(rt, s0 + a, s0 + b, rt.mat, rt.fin, opt);
      if (!PIECE_IDS.includes(id) && id !== "plug") PIECE_IDS.push(id);
      rt.ghostFrom = s0 + Math.max(0.05, a - 0.9);
      const lbl = opt.label || { name: rt.def.name, code: rt.def.code, n: opt.n || "1/1" };
      LABELS.push({ t0: s0 + a, t1: s0 + b + 1.5, anchor: () => rt.obj.getWorldPosition(_v).add(_lo.set(0, 0.07, 0)), html: `${lbl.name} <code>${lbl.code}</code>${lbl.n ? ` <span class="n">· ${lbl.n}</span>` : ""}` });
      const tip = rt.fin.p.clone(), tail = tip.clone().addScaledVector(V(opt.approach || APPROACH[id] || [0, 1, 0]).normalize(), 0.42);
      GUIDES.push(guideLine([tail, tip], s0 + a, s0 + b + 0.35, rt.world ? scene : rig));
      if (opt.tweezers) carry(rt, s0 + a, s0 + b);
      return A;
    },
    wire(id, a, b) {
      const w = WIRE_RT[id]; w.t0 = s0 + a; w.t1 = s0 + b;
      GUIDES.push(Object.assign(guideLine(w.curve.getPoints(90), s0 + a - 0.7, s0 + b + 0.2, rig), { lead: 0.7 }));
      return A;
    },
    solder(list, a, gap, kind = "joint") {
      const n = list.length;
      list.forEach((j, i) => {
        let pos, label;
        if (typeof j === "string" && WIRE_RT[j.split(":")[0]]) { const [wid, end] = j.split(":"); const w = G.WIRES[wid]; pos = V(end === "a" ? w.pts[0] : w.pts[w.pts.length - 1]); label = end === "a" ? w.a : w.b; }
        else { pos = V(G.pad(j)); label = j + " pad"; }
        const t = s0 + a + i * gap;
        JOINTS.push({ pos, t, label, kind, k: i + 1, n, step: stepId, s0, gap: i ? gap : 1.2 });
      });
      return A;
    },
    screw(id, a, b) { const sc = G.SCREWS[id]; SCREW_RT.push(makeScrew(sc, s0 + a, s0 + b)); return A; },
    cam(a, p, tg) { CAMKEYS.push({ t: s0 + a, p: V(p), tg: V(tg) }); return A; },
    label(a, b, anchor, html, cls) { LABELS.push({ t0: s0 + a, t1: s0 + b, anchor: typeof anchor === "function" ? anchor : () => rig.localToWorld(_v.copy(anchor)), html, cls }); return A; },
    fx(fn) { FX.push(fn); return A; }
  };
  return A;
}
const _v = new THREE.Vector3(), _lo = new THREE.Vector3();

/* wires */
const tubeR = 0.0042;
Object.keys(G.WIRES).forEach(id => {
  const w = G.WIRES[id];
  const curve = new THREE.CatmullRomCurve3(w.pts.map(p => V(p)), false, "catmullrom", 0.25);
  const segs = Math.max(24, w.pts.length * 14);
  const geo = new THREE.TubeGeometry(curve, segs, w.mag ? 0.0028 : tubeR * 0.8, 6, false);
  const m = mesh(geo, M(w.c), true); m.castShadow = false; m.visible = false; rig.add(m);
  WIRE_RT[id] = { id, def: w, curve, mesh: m, segs, t0: 1e9, t1: 1e9 };
});
const headBead = mesh(new THREE.SphereGeometry(0.009, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc46b })); noOL(headBead); rig.add(headBead);

/* guides: red dashed lines (drawn progressively) */
function guideLine(pts, t0, t1, parent) {
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xe0453a, dashSize: 0.022, gapSize: 0.016, transparent: true, opacity: 0.95, depthTest: true }));
  line.computeLineDistances(); line.visible = false; noOL(line); parent.add(line);
  return { line, t0, t1, n: pts.length };
}

/* screws */
function makeScrew(sc, t0, t1) {
  const g = new THREE.Group(); const head = cyl(0.011, 0.011, 0.006, METAL, 12); head.position.y = 0.003; g.add(head);
  const slot = box(0.016, 0.002, 0.003, BLACK); slot.position.y = 0.0065; g.add(slot); const sh = cyl(0.004, 0.003, 0.03, METAL, 8); sh.position.y = -0.015; g.add(sh);
  g.position.copy(V(sc.c)); g.visible = false; rig.add(g);
  const p = V(sc.c);
  driverKeys.push({ t: t0 - 0.55, p: p.clone().add(V(0, 0.22, 0)), spin: driverSpin });
  driverKeys.push({ t: t0, p: p.clone().add(V(0, 0.016, 0)), spin: driverSpin });
  driverSpin += Math.PI * 8;
  driverKeys.push({ t: t1, p: p.clone().add(V(0, 0.004, 0)), spin: driverSpin, lin: true });
  driverKeys.push({ t: t1 + 0.3, p: p.clone().add(V(0, 0.2, 0)), spin: driverSpin });
  LABELS.push({ t0: t0 - 0.4, t1: t1 + 0.5, anchor: () => rig.localToWorld(_v.copy(p)), html: `${sc.name} <code>M1.4</code>`, cls: "joint" });
  return { g, p, t0, t1, step: sc.step };
}

/* tweezers carrying a part */
const _pose = { p: new THREE.Vector3(), q: new THREE.Quaternion(), scale: 1 };
function carry(rt, t0, t1) {
  const off = V(0, 0.018, 0);
  const at0 = partPose(rt, t0 - 0.01, _pose).p.clone();
  tweezKeys.push({ t: t0 - 0.5, p: at0.clone().add(V(0, 0.14, 0)), open: 1 });
  tweezKeys.push({ t: t0 - 0.06, p: at0.clone().add(off), open: 0 });
  for (let i = 1; i <= 8; i++) { const tt = t0 + (t1 - t0) * i / 8; tweezKeys.push({ t: tt, p: partPose(rt, tt, _pose).p.clone().add(off), open: 0, lin: true }); }
  tweezKeys.push({ t: t1 + 0.12, p: rt.fin.p.clone().add(off), open: 1 });
  tweezKeys.push({ t: t1 + 0.45, p: rt.fin.p.clone().add(V(0, 0.14, 0)), open: 1 });
}

/* ------------------------------ the plan, step by step ------------------------------ */
const ER = V(G.ear("R", 0, 0, 0)), EL = V(G.ear("L", 0, 0, 0));
(function plan() {
  // 1 · lay out
  let A = api("layout");
  const order = ["qtpy", "chg", "mic", "div", "res", "sw", "bat", "batBig", "padR1", "padR2", "padR3", "padL1", "padL2", "padL3", "ampR", "spkR", "earR", "podR", "ampL", "spkL", "earL", "podL", "browCap", "lidR", "lidL", "lidER", "lidEL", "sleeveR", "sleeveL", "plug"];
  order.forEach((id, i) => { PR[id].appear = A.s0 + 0.3 + i * 0.15; LABELS.push({ t0: PR[id].appear + 0.2, t1: PR[id].appear + 1.2, anchor: () => PR[id].obj.getWorldPosition(_v).add(_lo.set(0, 0.06, 0)), html: `${G.PARTS[id].name} <code>${G.PARTS[id].code}</code>` }); });
  PR.frame.appear = A.s0 + 5.0;
  A.fly("frame", 5.2, 6.9, { lift: 0.1, reach: 0.6, label: { name: "Your frames", code: "tortoise acetate · gold wire temples", n: "1/1" } })
    .cam(0, [4.0, 3.5, 6.2], [0, 0.3, -0.4]).cam(3.6, [3.7, 2.6, 4.0], [0, 0.15, 0.05]).cam(7.9, [2.1, 1.55, 2.6], [0, 0.25, -0.45]);
  // 2 · prep the frames
  A = api("prep");
  A.label(0.6, 3.2, V(0.345, 0.47, 0.03), "Tortoise acetate <code>clean with IPA</code>").label(0.9, 3.2, V(0.66, 0.36, -0.40), "Gold wire temple <code>Ø ≈ 1.7 mm</code>", "alt")
    .label(1.2, 3.2, V(-0.62, 0.43, 0.03), "Hinge plate + rivets <code>silver</code>", "alt")
    .screw("hingeL", 3.6, 4.7).screw("hingeR", 5.6, 6.7)
    .label(3.4, 5.0, V(0.66, 0.42, -0.04), "Thread-lock <code>hinge stays open</code>")
    .cam(0.2, [0.75, 0.95, 2.15], [0, 0.28, -0.1]).cam(2.9, [0.85, 0.95, 2.05], [0.05, 0.3, -0.15]).cam(3.5, [1.3, 0.85, 0.55], [0.64, 0.38, -0.08]).cam(5.0, [1.25, 0.82, 0.5], [0.64, 0.38, -0.08])
    .cam(5.5, [-1.3, 0.85, 0.55], [-0.64, 0.38, -0.08]).cam(7.9, [-1.25, 0.82, 0.5], [-0.64, 0.38, -0.08]);
  // 3 · pods
  A = api("pods");
  A.fly("podR", 0.4, 2.2, { label: { name: "Hinge pod R", code: "slides over the wire", n: "1/4" } }).fly("earR", 2.0, 3.8, { label: { name: "Ear pod R", code: "clips on the acetate tip", n: "2/4" } })
    .fly("podL", 4.6, 6.4, { label: { name: "Hinge pod L", code: "gold · 17 mm behind the hinge", n: "3/4" } }).fly("earL", 6.2, 8.0, { label: { name: "Ear pod L", code: "tortoise · under the hair", n: "4/4" } })
    .label(2.4, 4.4, V(-0.66, 0.43, -0.7), "Snap clip <code>no glue</code>", "alt")
    .cam(0.2, [-2.0, 1.3, 0.45], [-0.55, 0.3, -0.62]).cam(4.1, [-1.85, 1.15, 0.2], [-0.6, 0.28, -0.75]).cam(4.6, [2.0, 1.3, 0.45], [0.55, 0.3, -0.62]).cam(8.6, [1.85, 1.15, 0.2], [0.6, 0.28, -0.75]).cam(9.9, [2.1, 1.6, 1.4], [0.1, 0.3, -0.6]);
  // 4 · QT Py + charger
  A = api("mcu");
  A.fly("qtpy", 0.4, 2.0).fly("chg", 1.6, 3.0).solder(G.TIN, 3.3, 0.38, "tin").fly("div", 8.0, 9.3, { tweezers: true })
    .label(3.0, 9.8, () => rig.localToWorld(_v.copy(V(G.ear("R", 0.0, -0.005, -0.15)))), "USB-C <code>bottom end</code>", "alt")
    .cam(0.4, [0.15, 0.95, -1.95], [-0.62, 0.24, -1.28]).cam(3.2, [-0.05, 0.75, -1.8], [-0.64, 0.23, -1.29]).cam(9.9, [-0.12, 0.62, -1.68], [-0.65, 0.23, -1.29]);
  // 4b · call mic in the right ear pod
  A = api("mic");
  A.fly("mic", 0.4, 2.2, { tweezers: true })
    .wire("m_3v", 2.6, 3.6).wire("m_gnd", 2.75, 3.75).wire("m_bclk", 2.9, 3.9).wire("m_dout", 3.05, 4.05).wire("m_lrcl", 3.2, 4.2).wire("m_sel", 3.35, 4.35)
    .solder(["m_3v:b", "m_gnd:b", "m_bclk:b", "m_dout:b", "m_lrcl:b", "m_sel:a", "m_gnd:a", "m_dout:a"], 4.6, 0.42)
    .label(2.2, 9.8, () => rig.localToWorld(_v.copy(V(G.ear("R", G.MIC_L[0], -0.15, G.MIC_L[2])))), "Mic port <code>forward-down → jaw line</code>")
    .label(4.4, 9.8, () => rig.localToWorld(_v.copy(V(G.ear("R", 0.0, 0.0, -0.2)))), "~10 cm from the mouth <code>6× gain · horn</code>", "alt")
    .cam(0.2, [0.1, 0.9, -0.7], [-0.64, 0.22, -1.25]).cam(2.4, [0.0, 0.7, -0.62], [-0.65, 0.2, -1.24]).cam(5.0, [-0.05, 0.62, -0.66], [-0.66, 0.18, -1.24]).cam(9.9, [-0.08, 0.6, -0.7], [-0.66, 0.18, -1.25]);
  // 5 · amps + speakers
  A = api("audio");
  A.fly("ampR", 0.3, 1.6).fly("spkR", 1.3, 2.6).fly("res", 2.4, 3.4, { tweezers: true })
    .wire("a_bclk", 3.2, 4.6).wire("a_lrc", 3.3, 4.7).wire("a_din", 3.4, 4.8).wire("a_vin", 3.5, 4.9).wire("a_gnd", 3.6, 5.0).wire("s_rp", 4.4, 5.0).wire("s_rn", 4.5, 5.1)
    .solder(["a_bclk:a", "a_lrc:a", "a_din:a", "a_vin:a", "a_gnd:a", "a_bclk:b", "a_lrc:b", "a_din:b", "a_vin:b", "a_gnd:b", "s_rp:b", "s_rn:b"], 5.2, 0.27)
    .fly("ampL", 8.6, 9.6).fly("spkL", 9.2, 10.2).wire("s_lp", 10.2, 10.8).wire("s_ln", 10.3, 10.9).wire("j_sdl", 10.4, 11.0)
    .solder(["j_sdl:a", "s_lp:b", "s_ln:b"], 11.0, 0.3)
    .label(2.6, 8.4, V(-0.655, 0.37, -0.39), "330 kΩ VIN→SD <code>= right channel</code>", "alt").label(1.6, 8.4, V(-0.63, 0.22, -0.25), "Speaker on the inner face <code>no grille on show</code>")
    .cam(0.2, [0.25, 0.85, 0.15], [-0.62, 0.28, -0.3]).cam(3.0, [0.1, 0.7, 0.0], [-0.64, 0.28, -0.32]).cam(5.0, [0.25, 1.3, -0.35], [-0.6, 0.3, -0.75]).cam(5.6, [0.05, 0.66, -0.08], [-0.64, 0.28, -0.3])
    .cam(8.3, [0.0, 0.64, -0.1], [-0.64, 0.28, -0.3]).cam(8.7, [-0.25, 0.85, 0.15], [0.62, 0.28, -0.3]).cam(11.9, [-0.1, 0.7, 0.0], [0.64, 0.28, -0.3]);
  // 6 · touch electrodes
  A = api("touch");
  const pl = (id, n, code) => ({ tweezers: true, label: { name: "Copper pad", code, n } });
  A.fly("padR1", 0.3, 1.2, pl("padR1", "1/6", "R1 · A2 · T7")).fly("padR2", 1.2, 2.1, pl("padR2", "2/6", "R2 · SDA · T0")).fly("padR3", 2.1, 3.0, pl("padR3", "3/6", "R3 · SCL · T8"))
    .wire("t_r1", 3.2, 4.4).wire("t_r2", 3.35, 4.55).wire("t_r3", 3.5, 4.7)
    .solder(["t_r1:b", "t_r2:b", "t_r3:b"], 4.9, 0.4, "low heat").solder(["t_r1:a", "t_r2:a", "t_r3:a"], 6.1, 0.35)
    .fly("padL1", 7.6, 8.4, pl("padL1", "4/6", "L1 · TX · T9")).fly("padL2", 8.4, 9.2, pl("padL2", "5/6", "L2 · MO · T4")).fly("padL3", 9.2, 10.0, pl("padL3", "6/6", "L3 · SCK · T6"))
    .label(0.4, 7.2, V(-0.68, 0.43, -0.55), "10 × 5 mm · 1.5 mm gaps <code>chevron edges</code>").label(4.0, 7.2, V(-0.68, 0.30, -0.80), "swipe → lens <code>volume +</code>", "alt")
    .cam(0.2, [-1.55, 0.72, -0.2], [-0.68, 0.37, -0.45]).cam(3.0, [-1.45, 0.7, -0.25], [-0.68, 0.37, -0.47]).cam(5.6, [-0.3, 0.9, -2.0], [-0.66, 0.26, -1.2]).cam(7.2, [-0.15, 0.75, -1.85], [-0.65, 0.25, -1.27])
    .cam(7.6, [1.55, 0.72, -0.2], [0.68, 0.37, -0.45]).cam(10.9, [1.45, 0.7, -0.25], [0.68, 0.37, -0.47]);
  // 7 · cross-frame bundle
  A = api("brow");
  ["b_bclk", "b_lrc", "b_din", "b_vsw", "b_gnd", "b_t1", "b_t2", "b_t3"].forEach((w, i) => A.wire(w, 0.6 + i * 0.15, 3.6 + i * 0.15));
  A.solder(["b_bclk:a", "b_lrc:a", "b_din:a", "b_vsw:a", "b_gnd:a", "b_t1:a", "b_t2:a", "b_t3:a"], 4.6, 0.12).solder(["b_bclk:b", "b_lrc:b", "b_din:b", "b_vsw:b", "b_gnd:b", "b_t1:b", "b_t2:b", "b_t3:b"], 6.6, 0.38)
    .label(1.4, 6.0, V(0.0, 0.50, 0.0), "Behind the top rim <code>8 × 0.1 mm magnet wire</code>").label(2.0, 6.0, V(-0.35, 0.49, -0.05), "invisible from the front <code>UV-resin tacks</code>", "alt")
    .cam(0.2, [-1.4, 1.9, 0.8], [-0.2, 0.36, -0.55]).cam(3.2, [-0.5, 1.4, -1.0], [0, 0.44, -0.12]).cam(4.4, [0.0, 1.0, -1.1], [0, 0.44, 0.0]).cam(6.2, [-0.05, 0.7, 0.05], [0.64, 0.3, -0.3]).cam(9.9, [-0.1, 0.66, -0.02], [0.64, 0.3, -0.32]);
  // 8 · battery, charger, switch
  A = api("power");
  A.fly("bat", 0.3, 1.8).fly("sw", 1.6, 2.9, { tweezers: true })
    .wire("p_cell", 3.0, 6.2).wire("p_cgnd", 3.2, 4.4).wire("p_chg", 6.0, 6.5).wire("p_sw", 6.1, 6.6).wire("p_5v", 6.2, 6.7).wire("p_cg", 6.3, 6.8)
    .solder(["p_cell:a", "p_cgnd:a", "p_cgnd:b"], 4.5, 0.45).solder(["p_cell:b", "p_chg:b", "p_sw:a", "p_sw:b", "p_5v:a", "p_5v:b", "p_cg:a", "p_cg:b"], 7.0, 0.42)
    .label(0.5, 6.0, () => PR.batBig.obj.getWorldPosition(_v).add(_lo.set(0, 0.12, 0)), "350 mAh option <code>≈ 3 h · bigger pod</code>", "alt")
    .label(2.0, 4.4, V(0.68, 0.32, -1.18), "120 mAh <code>≈ 1 h play (est.)</code>")
    .label(7.2, 10.8, () => rig.localToWorld(_v.copy(V(G.pad("CHG BAT")))), "Charger <code>100 mA</code>", "alt")
    .cam(0.2, [-0.15, 0.95, -1.95], [0.62, 0.24, -1.28]).cam(2.8, [-0.05, 0.75, -1.8], [0.64, 0.23, -1.29]).cam(3.4, [1.7, 2.7, 0.5], [0, 0.35, -0.6]).cam(6.4, [1.5, 2.5, 0.4], [0, 0.35, -0.65])
    .cam(6.9, [0.05, 0.75, -1.8], [-0.64, 0.23, -1.29]).cam(10.9, [-0.1, 0.62, -1.68], [-0.65, 0.23, -1.29]);
  // 9 · close the pods
  A = api("close");
  A.fly("lidR", 0.3, 1.5).fly("lidER", 1.0, 2.2).fly("lidL", 1.6, 2.8).fly("lidEL", 2.2, 3.4).fly("sleeveR", 2.8, 4.0).fly("sleeveL", 3.2, 4.4).fly("browCap", 3.8, 5.2)
    .screw("lR1", 5.6, 6.2).screw("lR2", 6.3, 6.9).screw("lL1", 7.0, 7.6).screw("lL2", 7.7, 8.3)
    .label(8.0, 9.9, V(-0.68, 0.40, -0.55), "Painted inlay <code>flush · non-conductive</code>")
    .cam(0.2, [0.6, 1.9, 0.9], [0, 0.32, -0.6]).cam(5.2, [0.2, 1.75, 1.2], [0, 0.34, -0.55]).cam(5.6, [-0.4, 1.2, 0.35], [-0.64, 0.38, -0.38]).cam(6.9, [-0.45, 1.15, 0.3], [-0.64, 0.38, -0.4])
    .cam(7.0, [0.4, 1.2, 0.35], [0.64, 0.38, -0.38]).cam(8.2, [0.45, 1.15, 0.3], [0.64, 0.38, -0.4]).cam(8.5, [-1.55, 0.8, -0.15], [-0.68, 0.37, -0.45]).cam(9.9, [-1.45, 0.75, -0.2], [-0.68, 0.37, -0.47]);
  // 10 · flash
  A = api("flash");
  A.fly("plug", 0.6, 2.2, { label: { name: "USB-C", code: "right ear pod", n: "" }, lift: 0.25, reach: 0.25 });
  addFlight(PR.plug, A.s0 + 9.1, A.s0 + 9.9, PR.plug.fin, PR.plug.mat, { approach: [0, 1, 0], lift: 0.25, reach: 0.25, snap: false });
  A.label(2.4, 8.4, () => laptop.localToWorld(_v.set(0, 0.42, -0.2)), "Arduino IDE 2 <code>Adafruit QT Py ESP32 · Default 3MB APP</code>")
    .label(8.4, 9.9, () => rig.localToWorld(_v.copy(ER).add(_lo.set(-0.05, 0.12, 0))), "Muse Glasses <code>discoverable</code>", "alt")
    .cam(0.2, [-1.25, 0.75, -0.55], [-0.8, 0.2, -1.3]).cam(2.4, [-0.4, 1.7, 0.25], [-1.1, 0.25, -1.25]).cam(7.8, [-0.35, 1.55, 0.15], [-1.1, 0.25, -1.25]).cam(8.6, [-1.3, 0.75, -0.6], [-0.75, 0.2, -1.3]).cam(9.9, [-1.25, 0.72, -0.55], [-0.75, 0.2, -1.3]);
  // 11 · pair + play
  A = api("pair");
  A.label(0.4, 3.0, () => PHONE.localToWorld(_v.set(0, 0.42, 0)), "1 · Bluetooth settings <code>“Muse Glasses”</code>")
    .label(3.0, 11, () => rig.localToWorld(_v.copy(V(G.SPC(-1))).add(_lo.set(0, -0.08, 0))), "stereo · R <code>A2DP</code>", "alt")
    .label(3.0, 11, () => rig.localToWorld(_v.copy(V(G.SPC(1))).add(_lo.set(0, -0.08, 0))), "stereo · L <code>A2DP</code>", "alt")
    .label(5.6, 7.6, () => rig.localToWorld(_v.copy(V(G.padC(-1, 1)))), "2 · tap <code>play / pause · answer / hang up</code>")
    .label(7.8, 10.9, () => rig.localToWorld(_v.copy(V(G.padC(-1, 0)))), "3 · swipe → lens <code>volume +</code>")
    .cam(0.2, [1.2, 1.15, 2.6], [0.55, 0.36, 0.1]).cam(3.0, [1.0, 1.05, 2.4], [0.4, 0.34, 0.0]).cam(5.2, [-1.6, 0.85, 0.35], [-0.66, 0.36, -0.45]).cam(10.9, [-1.5, 0.8, 0.25], [-0.66, 0.36, -0.47]);
  // 12 · companion app
  A = api("app");
  A.label(0.6, 4.0, () => PHONE.localToWorld(_v.set(0, 0.42, 0)), "BLE GATT <code>svc 9f3c0001-…</code>")
    .label(4.0, 7.0, () => PHONE.localToWorld(_v.set(0, 0.42, 0)), "Volume <code>9f3c0002 · R/W/N</code>")
    .label(7.0, 10.9, () => PHONE.localToWorld(_v.set(0, 0.42, 0)), "Find my glasses <code>9f3c0008 · play sound</code>")
    .label(1.0, 10.9, () => rig.localToWorld(_v.copy(EL).add(_lo.set(0.05, 0.13, 0))), "Battery <code>0x180F / 0x2A19</code>", "alt")
    .cam(0.2, [1.55, 0.95, 1.75], [1.02, 0.46, 0.4]).cam(5.5, [1.45, 0.9, 1.6], [1.05, 0.44, 0.42]).cam(7.5, [1.9, 1.3, 2.2], [0.55, 0.36, -0.1]).cam(10.9, [2.0, 1.35, 2.3], [0.5, 0.36, -0.15]);
  // 13 · finale
  A = api("done");
  A.cam(1.2, [1.95, 1.25, 2.45], [0, 0.62, -0.62]).cam(9.0, [1.55, 1.05, 2.05], [0, 0.65, -0.62]).cam(13.9, [2.5, 1.65, 3.1], [0, 0.72, -0.8]);
})();
CAMKEYS.sort((a, b) => a.t - b.t);
// per-step joint numbering (k/n) across multiple solder() calls
STEPS.forEach(s => { const js = JOINTS.filter(j => j.step === s.id).sort((a, b) => a.t - b.t); js.forEach((j, i) => { j.k = i + 1; j.n = js.length; j.gap = i ? j.t - js[i - 1].t : 1.2; }); });

/* joint visuals: blob + pulsing ring */
const blobGeo = new THREE.SphereGeometry(0.0085, 10, 8), blobMat = M("#d9dde2");
const ringTex = canvasTex(64, 64, (g) => { g.strokeStyle = "#fff"; g.lineWidth = 6; g.beginPath(); g.arc(32, 32, 24, 0, 7); g.stroke(); });
JOINTS.forEach(j => {
  j.blob = mesh(blobGeo, blobMat, false); j.blob.position.copy(j.pos); j.blob.visible = false; if (j.kind === "tin") j.blob.scale.set(0.6, 0.6, 0.6); rig.add(j.blob);
  j.ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: 0xffb547, transparent: true, depthWrite: false, depthTest: false })); j.ring.position.copy(j.pos); j.ring.visible = false; noOL(j.ring); rig.add(j.ring);
  const x = j.pos.x; const n = Math.abs(x) > 0.5 ? V(-Math.sign(x), 0.75, 0.1) : V(-0.2, 1, 0.35);
  j.q = new THREE.Quaternion().setFromUnitVectors(UP, n.normalize());
});
/* iron keys from joints */
STEPS.forEach(s => {
  const js = JOINTS.filter(j => j.step === s.id).sort((a, b) => a.t - b.t);
  js.forEach((j, i) => {
    const d = i + 1 < js.length ? js[i + 1].t - j.t : 0.6, dp = i ? j.t - js[i - 1].t : 0.6;
    const hover = j.pos.clone().addScaledVector(V(0, 1, 0).applyQuaternion(j.q), 0.07);
    ironKeys.push({ t: j.t - Math.min(0.16, dp * 0.45), p: hover, q: j.q, touch: 0 });
    ironKeys.push({ t: j.t - 0.03, p: j.pos.clone(), q: j.q, touch: 1 });
    ironKeys.push({ t: j.t + Math.min(0.1, d * 0.25), p: j.pos.clone(), q: j.q, touch: 1 });
    ironKeys.push({ t: j.t + Math.min(0.18, d * 0.5), p: hover.clone(), q: j.q, touch: 0 });
  });
});
const IRON_REST = { p: V(1.47, MAT_TOP + 0.075, 0.95), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -1.42)) };
const DRIVER_REST = { p: V(-1.58, MAT_TOP + 0.03, 0.92), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.5, Math.PI / 2)) };
const TWEEZ_REST = { p: V(-1.15, MAT_TOP + 0.01, 0.98), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.3, Math.PI / 2)) };
const DRIVER_Q = new THREE.Quaternion(), TWEEZ_Q = new THREE.Quaternion().setFromUnitVectors(UP, V(0.25, 1, 0.3).normalize());
function finalizeTrack(keys, rest, defQ, gap = 1.3) {
  keys.sort((a, b) => a.t - b.t);
  const out = []; let prev = null;
  const R = t => ({ t, p: rest.p, q: rest.q, rest: true, spin: prev ? prev.spin || 0 : 0, open: 0, touch: 0 });
  keys.forEach(k => { if (!k.q) k.q = defQ; if (!prev || k.t - prev.t > gap) { if (prev) out.push(R(prev.t + 0.6)); out.push(R(k.t - 0.6)); } out.push(k); prev = k; });
  if (prev) out.push(R(prev.t + 0.6));
  return out;
}
const IRON_T = finalizeTrack(ironKeys, IRON_REST, IRON_REST.q, 1.4);
const DRIVER_T = finalizeTrack(driverKeys, DRIVER_REST, DRIVER_Q, 1.4);
const TWEEZ_T = finalizeTrack(tweezKeys, TWEEZ_REST, TWEEZ_Q, 1.0);
const _q = new THREE.Quaternion();
function trackAt(T, t, out) {
  if (!T.length || t <= T[0].t) { const k = T[0]; out.p.copy(k ? k.p : V(0, -5, 0)); out.q.copy(k ? k.q : _q.identity()); out.spin = 0; out.open = 0; out.touch = 0; out.rest = true; return out; }
  let i = 0; while (i < T.length - 1 && T[i + 1].t <= t) i++;
  const a = T[i], b = T[Math.min(i + 1, T.length - 1)];
  if (a === b || t >= b.t) { out.p.copy(a.p); out.q.copy(a.q); out.spin = a.spin || 0; out.open = a.open || 0; out.touch = a.touch || 0; out.rest = !!a.rest; return out; }
  const u = (t - a.t) / (b.t - a.t), e = b.lin ? u : easeIO2(u);
  out.p.copy(a.p).lerp(b.p, e); out.q.copy(a.q).slerp(b.q, e);
  out.spin = (a.spin || 0) + ((b.spin || 0) - (a.spin || 0)) * e; out.open = (a.open || 0) + ((b.open || 0) - (a.open || 0)) * e; out.touch = Math.min(a.touch || 0, b.touch || 0); out.rest = a.rest && b.rest;
  return out;
}

/* counters + hardware inventory */
const HW_EVENTS = [];
JOINTS.forEach(j => { if (j.kind !== "tin") HW_EVENTS.push({ t: j.t, cat: "Solder joints" }); });
const PADS = ["padR1", "padR2", "padR3", "padL1", "padL2", "padL3"];
PADS.forEach(id => HW_EVENTS.push({ t: PR[id].flights[0].t1, cat: "Copper pads" }));
SCREW_RT.forEach(s => HW_EVENTS.push({ t: s.t1, cat: "Screws" }));
Object.values(WIRE_RT).forEach(w => HW_EVENTS.push({ t: w.t1, cat: "Wires" }));
const HW_CATS = ["Solder joints", "Wires", "Copper pads", "Screws"];
const HW_TOTAL = HW_EVENTS.length;
const PIECE_T = PIECE_IDS.map(id => PR[id].flights[0].t1);
function counts(t) {
  const hw = HW_EVENTS.filter(e => e.t <= t).length;
  const pc = PIECE_T.filter(x => x <= t).length;
  const si = FLAT.stepAt(t), s = STEPS[si];
  const js = JOINTS.filter(j => j.step === s.id); const dj = js.filter(j => j.t <= t).length;
  let prog = "";
  if (js.length) prog = js[0].kind === "tin" ? `<b>${dj}</b> of ${js.length} pads tinned` : `<b>${dj}</b> of ${js.length} joints`;
  const sc = SCREW_RT.filter(x => x.step === s.id); if (sc.length) prog += (prog ? " · " : "") + `<b>${sc.filter(x => x.t1 <= t).length}</b> of ${sc.length} screws`;
  if (s.id === "touch") prog = `<b>${PADS.filter(id => PR[id].flights[0].t1 <= t).length}</b> of 6 copper pads · ` + prog;
  if (s.id === "flash") { const p = clamp01((t - S0("flash") - 2) / 6); prog = p >= 1 ? "<b>Done uploading</b>" : `Uploading <b>${Math.round(p * 100)}%</b>`; }
  return { hw, hwT: HW_TOTAL, pc, pcT: PIECE_IDS.length, prog };
}
function hwRows(t) { return HW_CATS.map(c => { const all = HW_EVENTS.filter(e => e.cat === c); return [c, all.filter(e => e.t <= t).length, all.length]; }).concat([["Pieces", PIECE_T.filter(x => x <= t).length, PIECE_IDS.length]]); }
