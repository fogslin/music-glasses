/* Music Glasses v1 flat-pack guide — shared geometry (rig coordinates, 1 unit = 100 mm real, shown 10x)
   Same convention as the EDITH guide: the front faces +Z, temples run toward -Z, the wearer's RIGHT side is at -X.
   Frame = the owner's tortoiseshell acetate front (lens ≈ 50 × 42 mm, bridge ≈ 19 mm) with thin gold wire temples (≈ 140 mm)
   and acetate ear tips. Electronics live in printed clip-on pods: slim gold hinge pods set back from the hinge (amp + speaker + touch inlay)
   and tortoise behind-ear pods (MCU, charger, mic on the right; battery on the left), hidden by hair. Nothing electronic on the front. */
(function () {
  "use strict";
  const TX = 0.655, TY = 0.39;                 // wire temple line (hinge height)
  const LX = 0.345, LY = 0.245;                // lens centres (±LX)
  const LENS = { w: 0.50, h: 0.42 };           // 50 × 42 mm lens
  const RIMT = { side: 0.046, top: 0.056, bot: 0.04 };
  const FZ = 0.05;                             // acetate front thickness (5 mm)

  /* soft-panto lens outline for the LEFT lens (+X side, nasal side toward -x), centred on (0,0).
     Super-ellipse, flatter/wider at the top, rounder at the bottom, lower-nasal corner pulled in. */
  function lensPts(w, h, n = 84) {
    const a = w / 2, b = h / 2, out = [];
    for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      const p = s > 0 ? 3.0 : 2.3;
      let x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / p), y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / p);
      x *= 1 + 0.045 * (y / b);                                           // top a touch wider (panto)
      if (x < 0 && y < 0) x += 0.10 * a * Math.pow(-y / b, 2) * Math.pow(-x / a, 1.5);   // nasal-lower corner pulled in
      if (y > 0) y += 0.012 * b * (1 - Math.pow(x / a, 2));                // gently arched brow line
      out.push([x, y]);
    }
    return out;
  }
  const OUTER = { w: LENS.w + 2 * RIMT.side, h: LENS.h + RIMT.top + RIMT.bot, dy: (RIMT.top - RIMT.bot) / 2 };

  /* wire temple centre-line (left side; mirror x for the right) */
  const TPTS = [[0.655, 0.39, -0.035], [0.655, 0.388, -0.30], [0.652, 0.381, -0.75], [0.648, 0.372, -1.0], [0.647, 0.356, -1.10], [0.646, 0.33, -1.17], [0.643, 0.12, -1.40]];
  const TIP_Z = -0.98;                         // wire → acetate ear tip
  function templeAt(sx, z) {
    for (let i = 0; i < TPTS.length - 1; i++) {
      const a = TPTS[i], b = TPTS[i + 1];
      if (z <= a[2] && z >= b[2]) { const u = (a[2] - z) / (a[2] - b[2]); return [sx * (a[0] + (b[0] - a[0]) * u), a[1] + (b[1] - a[1]) * u, z]; }
    }
    const e = z > TPTS[0][2] ? TPTS[0] : TPTS[TPTS.length - 1]; return [sx * e[0], e[1], e[2]];
  }

  /* hinge pod side profile in (u = z, v = y - TY); d = inset */
  function hpProfile(d = 0) {
    const P = [], q = (a, b, c, n) => { for (let i = 1; i <= n; i++) { const t = i / n, k = 1 - t; P.push([k * k * a[0] + 2 * k * t * b[0] + t * t * c[0], k * k * a[1] + 2 * k * t * b[1] + t * t * c[1]]); } };
    const DZ = -0.10;                          // whole pod set 10 mm back from the hinge (invisible from the front)
    const top = 0.026 - d, back = -0.66 + DZ + d, front = -0.07 + DZ - d, bot = -0.185 + d, botB = -0.05 + d;
    P.push([front - 0.03, top]); P.push([back + 0.04, top]);
    q([back + 0.04, top], [back, top], [back, (top + botB) / 2], 4);
    q([back, (top + botB) / 2], [back, botB], [back + 0.04, botB - 0.005], 4);
    q([back + 0.04, botB - 0.005], [-0.50 + DZ, botB - 0.012], [-0.46 + DZ + d * 0.5, -0.16 + d], 7);
    q([-0.46 + DZ + d * 0.5, -0.16 + d], [-0.45 + DZ + d * 0.5, bot], [-0.42 + DZ, bot], 3);
    P.push([front - 0.05, bot]);
    q([front - 0.05, bot], [front, bot], [front, bot + 0.05], 4);
    P.push([front, top - 0.05]);
    q([front, top - 0.05], [front, top], [front - 0.03, top], 4); P.pop();
    return P;
  }
  // 6.2 mm wide, centred 2.2 mm INSIDE the temple line: outer face flush with the end piece (≈ 0.9 mm proud of the wire)
  const HP = { xw: 0.062, xc: -0.022, wall: 0.012, lid: 0.010, z0: -0.17, z1: -0.76 };
  const hpOut = sx => sx * (TX + HP.xc + HP.xw / 2), hpIn = sx => sx * (TX + HP.xc - HP.xw / 2);

  /* ear-tip pods: local frame (x across, y "up" ⟂ tip, z along the tip toward the hinge) */
  const EAR_ROT = -0.74, CA = Math.cos(EAR_ROT), SA = Math.sin(EAR_ROT);
  const EC = { R: [-0.648, 0.225, -1.285], L: [0.6705, 0.225, -1.285] };
  const EP = { R: { len: 0.32, h: 0.24, t: 0.15, r: 0.06 }, L: { len: 0.34, h: 0.16, t: 0.095, r: 0.06 } };
  function ear(side, lx, ly, lz) { const c = EC[side]; return [c[0] + lx, c[1] + ly * CA - lz * SA, c[2] + ly * SA + lz * CA]; }

  /* QT Py ESP32 Pico in the RIGHT ear pod: board on the outer side, pads facing the pod centre, USB-C at the bottom end */
  const QA = ["A0", "A1", "A2", "A3", "SDA", "SCL", "TX"], QB = ["5V", "GND", "3V", "MO", "MI", "SCK", "RX"];
  function qtLocal(n) {
    if (n === "VBAT+") return [-0.045, 0.035, 0.065];
    if (n === "VBAT-") return [-0.045, -0.02, 0.065];
    if (n === "CHG 5V") return [0.021, 0.07, -0.06];
    if (n === "CHG GND") return [0.021, 0.07, -0.03];
    if (n === "CHG BAT") return [0.021, 0.07, 0.02];
    if (n === "SW COM") return [0.0, 0.098, -0.02];
    if (n === "SW OUT") return [0.0, 0.098, 0.012];
    if (n === "QT SDA1") return [0.004, -0.03, 0.118];          // STEMMA QT connector (GPIO22) at the top end of the board
    if (n === "QT 3V") return [0.004, -0.06, 0.118];
    if (n === "QT GND") return [0.004, 0.0, 0.118];
    let i = QA.indexOf(n), top = true; if (i < 0) { i = QB.indexOf(n); top = false; }
    return [-0.012, top ? 0.078 : -0.078, -0.076 + i * 0.0254];
  }
  const pad = n => ear("R", ...qtLocal(n));

  /* hinge pod contents (sx = -1 right, +1 left) */
  const AMP_PINS = ["LRC", "BCLK", "DIN", "GAIN", "SD", "GND", "VIN"];
  const AC = sx => [sx * (TX - 0.008), TY - 0.098, -0.415];
  function ampPin(sx, n) {
    if (n === "+") return [sx * (TX - 0.017), TY - 0.168, -0.39];
    if (n === "-") return [sx * (TX - 0.017), TY - 0.168, -0.435];
    const i = AMP_PINS.indexOf(n); return [sx * (TX - 0.017), TY - 0.028, -0.415 + 0.0762 - i * 0.0254];
  }
  const SPC = sx => [sx * (TX - 0.025), TY - 0.092, -0.252];        // speaker on the INNER face, firing at the ear
  const spkPin = (sx, n) => [sx * (TX - 0.025), TY - (n === "+" ? 0.062 : 0.122), -0.332];
  const PADZ = [-0.435, -0.55, -0.665];        // touch segments front → back (10 mm long, 1.5 mm gaps)
  const padC = (sx, i) => [sx * (TX + 0.0105), TY - 0.01, PADZ[i]];
  const padTab = (sx, i) => [sx * (TX - 0.004), TY + 0.012, PADZ[i] + 0.035];
  /* I²S MEMS mic (RIGHT ear pod, front-lower edge): local -y points forward-DOWN toward the mouth along the jaw line */
  const MIC_L = [0.0, -0.101, 0.06];          // breakout 16.7 × 12.7 mm lying against the lower-front wall, port through the wall
  const micPin = n => { const i = ["3V", "GND", "BCLK", "DOUT", "LRCL", "SEL"].indexOf(n); return ear("R", MIC_L[0] + 0.045, MIC_L[1] + 0.009, MIC_L[2] - 0.0635 + i * 0.0254); };
  /* battery (LEFT ear pod) */
  const batT = s => ear("L", 0.013, s > 0 ? 0.03 : -0.03, 0.15);

  /* wire routing helpers */
  function lane(k) { const ring = Math.floor(k / 8), a = (k % 8) * Math.PI / 4 + ring * Math.PI / 8, r = 0.013 + 0.008 * ring; return [Math.cos(a) * r, Math.sin(a) * r * 0.8 - 0.004]; }
  function alongT(sx, zA, zB, k) {
    const n = Math.max(2, Math.ceil(Math.abs(zB - zA) / 0.11) + 1), [dx, dy] = lane(k), out = [];
    for (let i = 0; i < n; i++) { const z = zA + (zB - zA) * i / (n - 1), p = templeAt(sx, z); out.push([p[0] + sx * dx, p[1] + dy, z]); }
    return out;
  }
  function qtOut(n, k) {               // from a QT Py pad out of the top of the right ear pod onto the temple bundle
    const l = qtLocal(n), pts = [pad(n)];
    if (Math.abs(l[0]) > 0.03) pts.push(ear("R", l[0], 0.105, l[2]), ear("R", 0.0, 0.105, l[2]));
    else pts.push(ear("R", 0.0, l[1] * 0.55, l[2]));
    const [dx, dy] = lane(k); pts.push(ear("R", -dx, 0.03 + dy, 0.10));
    return pts.concat(alongT(-1, -1.21, -1.12, k));
  }
  const BROW_X = [-0.62, -0.55, -0.45, -0.345, -0.22, -0.12, -0.05, 0, 0.05, 0.12, 0.22, 0.345, 0.45, 0.55, 0.62];
  const BROW_Y = [0.468, 0.50, 0.514, 0.519, 0.515, 0.497, 0.480, 0.476, 0.480, 0.497, 0.515, 0.519, 0.514, 0.50, 0.468];
  function brow(k, dir = 1) {          // right hinge pod → BEHIND the top rim (below the brow line) → left hinge pod (dir -1 reverses)
    const dy = (k - 4) * 0.0032, out = [[-TX + 0.004, TY + 0.03, -0.20], [-TX + 0.006, TY + 0.034, -0.08], [-0.63, 0.43 + dy, -0.045]];
    BROW_X.forEach((x, i) => out.push([x, BROW_Y[i] - 0.028 + dy, -0.042]));
    out.push([0.63, 0.43 + dy, -0.045], [TX - 0.006, TY + 0.034, -0.08], [TX - 0.004, TY + 0.03, -0.20]);
    return dir > 0 ? out : out.reverse();
  }
  const C = { red: "#e0453a", gnd: "#3b3b40", bclk: "#8a5cd6", lrc: "#f08a2c", din: "#3cb35a", vin: "#ff6b5e", touch: "#f4f1ea", spk: "#e85d9a", io: "#2bb5c9", mag: "#c9782f" };
  const R = -1, L = 1;
  const toAmp = (sx, pin) => [[sx * (TX - 0.006), TY + 0.006, ampPin(sx, pin)[2] + 0.02], [sx * (TX - 0.012), TY - 0.012, ampPin(sx, pin)[2]], ampPin(sx, pin)];
  const toTab = (sx, i) => [[sx * (TX - 0.003), TY + 0.006, PADZ[i] + 0.02], padTab(sx, i)];
  const rightRun = (k, zEnd) => alongT(R, -1.12, zEnd, k).slice(1);
  const WIRES = {
    // 5 · audio (right amp local to its pod; I²S + power come down the right temple from the QT Py)
    a_bclk: { step: "audio", c: C.bclk, pts: [...qtOut("A0", 0), ...rightRun(0, -0.46), ...toAmp(R, "BCLK")], a: "A0 · BCLK", b: "AMP-R BCLK" },
    a_lrc:  { step: "audio", c: C.lrc,  pts: [...qtOut("A1", 1), ...rightRun(1, -0.46), ...toAmp(R, "LRC")], a: "A1 · LRC", b: "AMP-R LRC" },
    a_din:  { step: "audio", c: C.din,  pts: [...qtOut("RX", 2), ...rightRun(2, -0.46), ...toAmp(R, "DIN")], a: "RX · DIN", b: "AMP-R DIN" },
    a_vin:  { step: "audio", c: C.vin,  pts: [...qtOut("VBAT+", 3), ...rightRun(3, -0.52), ...toAmp(R, "VIN")], a: "VBAT+ (switched)", b: "AMP-R VIN" },
    a_gnd:  { step: "audio", c: C.gnd,  pts: [...qtOut("GND", 4), ...rightRun(4, -0.52), ...toAmp(R, "GND")], a: "GND pad", b: "AMP-R GND" },
    s_rp: { step: "audio", c: C.spk, pts: [ampPin(R, "+"), [R * (TX - 0.018), TY - 0.16, -0.36], spkPin(R, "+")], a: "AMP-R +", b: "SPK-R +" },
    s_rn: { step: "audio", c: C.spk, pts: [ampPin(R, "-"), [R * (TX - 0.019), TY - 0.17, -0.37], spkPin(R, "-")], a: "AMP-R −", b: "SPK-R −" },
    s_lp: { step: "audio", c: C.spk, pts: [ampPin(L, "+"), [L * (TX - 0.018), TY - 0.16, -0.36], spkPin(L, "+")], a: "AMP-L +", b: "SPK-L +" },
    s_ln: { step: "audio", c: C.spk, pts: [ampPin(L, "-"), [L * (TX - 0.019), TY - 0.17, -0.37], spkPin(L, "-")], a: "AMP-L −", b: "SPK-L −" },
    j_sdl: { step: "audio", c: C.vin, pts: [ampPin(L, "SD"), [L * (TX - 0.012), TY - 0.012, -0.44], ampPin(L, "VIN")], a: "AMP-L SD", b: "AMP-L VIN" },
    // 6 · touch (right strip back down the right temple to the QT Py)
    t_r1: { step: "touch", c: C.touch, pts: [...qtOut("A2", 5), ...rightRun(5, PADZ[0] - 0.05), ...toTab(R, 0)], a: "A2 · T7", b: "Pad R1" },
    t_r2: { step: "touch", c: C.touch, pts: [...qtOut("SDA", 6), ...rightRun(6, PADZ[1] - 0.05), ...toTab(R, 1)], a: "SDA · T0", b: "Pad R2" },
    t_r3: { step: "touch", c: C.touch, pts: [...qtOut("SCL", 7), ...rightRun(7, PADZ[2] - 0.05), ...toTab(R, 2)], a: "SCL · T8", b: "Pad R3" },
    // 7 · cross-frame bundle: right temple → brow groove → left hinge pod
    b_bclk: { step: "brow", c: C.bclk, mag: 1, pts: [...qtOut("A0", 8), ...rightRun(8, -0.20).slice(0, -1), ...brow(0), ...toAmp(L, "BCLK")], a: "A0 · BCLK", b: "AMP-L BCLK" },
    b_lrc:  { step: "brow", c: C.lrc, mag: 1, pts: [...qtOut("A1", 9), ...rightRun(9, -0.20).slice(0, -1), ...brow(1), ...toAmp(L, "LRC")], a: "A1 · LRC", b: "AMP-L LRC" },
    b_din:  { step: "brow", c: C.din, mag: 1, pts: [...qtOut("RX", 10), ...rightRun(10, -0.20).slice(0, -1), ...brow(2), ...toAmp(L, "DIN")], a: "RX · DIN", b: "AMP-L DIN" },
    b_vsw:  { step: "brow", c: C.vin, mag: 1, pts: [...qtOut("VBAT+", 11), ...rightRun(11, -0.20).slice(0, -1), ...brow(3), ...toAmp(L, "VIN")], a: "VBAT+ (switched)", b: "AMP-L VIN" },
    b_gnd:  { step: "brow", c: C.gnd, mag: 1, pts: [...qtOut("GND", 12), ...rightRun(12, -0.20).slice(0, -1), ...brow(4), ...toAmp(L, "GND")], a: "GND pad", b: "AMP-L GND" },
    b_t1:   { step: "brow", c: C.touch, mag: 1, pts: [...qtOut("TX", 13), ...rightRun(13, -0.20).slice(0, -1), ...brow(5), ...toTab(L, 0)], a: "TX · T9", b: "Pad L1" },
    b_t2:   { step: "brow", c: C.touch, mag: 1, pts: [...qtOut("MO", 14), ...rightRun(14, -0.20).slice(0, -1), ...brow(6), ...toTab(L, 1)], a: "MO · T4", b: "Pad L2" },
    b_t3:   { step: "brow", c: C.touch, mag: 1, pts: [...qtOut("SCK", 15), ...rightRun(15, -0.20).slice(0, -1), ...brow(7), ...toTab(L, 2)], a: "SCK · T6", b: "Pad L3" },
    // 8 · power: cell (left ear) → left temple → brow → right temple → switch / charger in the right ear pod
    p_cell: { step: "power", c: C.red, mag: 1, pts: [batT(1), ear("L", 0.0, 0.03, 0.17), ...alongT(L, -1.2, -0.20, 0).slice(0, -1), ...brow(8, -1), ...alongT(R, -0.20, -1.21, 16).slice(1), ear("R", 0.0, 0.11, 0.06), pad("SW COM")], a: "LiPo +", b: "SW COM" },
    p_cgnd: { step: "power", c: C.gnd, pts: [batT(-1), ear("L", 0.0, 0.0, 0.17), ...alongT(L, -1.2, -0.54, 1), ...toAmp(L, "GND").slice(1)], a: "LiPo −", b: "AMP-L GND" },
    p_chg: { step: "power", c: C.red, pts: [pad("SW COM"), ear("R", 0.01, 0.085, 0.0), pad("CHG BAT")], a: "SW COM", b: "CHG BAT" },
    p_sw:  { step: "power", c: C.vin, pts: [pad("SW OUT"), ear("R", -0.03, 0.11, 0.04), ear("R", -0.05, 0.08, 0.065), pad("VBAT+")], a: "SW OUT", b: "VBAT+ pad" },
    p_5v:  { step: "power", c: C.red, pts: [pad("5V"), ear("R", 0.0, -0.05, -0.07), ear("R", 0.004, 0.03, -0.065), pad("CHG 5V")], a: "5V pad", b: "CHG 5V" },
    p_cg:  { step: "power", c: C.gnd, pts: [pad("GND"), ear("R", 0.0, -0.04, -0.045), ear("R", 0.004, 0.03, -0.035), pad("CHG GND")], a: "GND pad", b: "CHG GND" },
    // 4b · mic: all five wires stay inside the right ear pod (no extra wire over the brow)
    m_3v:   { step: "mcu", c: C.red,  pts: [pad("3V"), ear("R", 0.03, -0.088, -0.04), ear("R", 0.03, -0.09, 0.05), micPin("3V")], a: "3V pad", b: "MIC 3V" },
    m_gnd:  { step: "mcu", c: C.gnd,  pts: [pad("QT GND"), ear("R", 0.02, -0.04, 0.10), ear("R", 0.0, -0.08, 0.09), micPin("GND")], a: "STEMMA GND", b: "MIC GND" },
    m_bclk: { step: "mcu", c: C.bclk, pts: [pad("A0"), ear("R", 0.01, 0.05, -0.07), ear("R", 0.03, -0.02, 0.0), ear("R", 0.03, -0.08, 0.06), micPin("BCLK")], a: "A0 · BCLK (shared)", b: "MIC BCLK" },
    m_dout: { step: "mcu", c: C.io,   pts: [pad("QT SDA1"), ear("R", 0.02, -0.06, 0.10), micPin("DOUT")], a: "SDA1 · GPIO22", b: "MIC DOUT" },
    m_lrcl: { step: "mcu", c: C.lrc,  pts: [pad("A1"), ear("R", 0.012, 0.05, -0.045), ear("R", 0.035, -0.02, 0.02), ear("R", 0.035, -0.08, 0.07), micPin("LRCL")], a: "A1 · LRC (shared)", b: "MIC LRCL" },
    m_sel:  { step: "mcu", c: C.gnd,  pts: [micPin("SEL"), ear("R", 0.062, -0.085, MIC_L[2] + 0.04), micPin("GND")], a: "MIC SEL", b: "MIC GND (left slot)" }
  };

  // Every physical piece: c = installed centre, s = box size (or r/h), mat = where it waits on the mat, rx = tilt about X (ear pods)
  const ER = ear("R", 0, 0, 0), EL = ear("L", 0, 0, 0);
  const PARTS = {
    frame:  { name: "Your frames", code: "tortoise acetate · wire temples", mat: [0, 0, 0] },
    podR:   { name: "Hinge pod R", code: "slim · gold", c: [R * (TX + HP.xc), TY, -0.465], s: [HP.xw, 0.21, 0.59], mat: [-1.45, 0, -0.95], matRot: [0, 0, -Math.PI / 2] },
    podL:   { name: "Hinge pod L", code: "slim · gold", c: [L * (TX + HP.xc), TY, -0.465], s: [HP.xw, 0.21, 0.59], mat: [1.45, 0, -0.95], matRot: [0, 0, Math.PI / 2] },
    earR:   { name: "Ear pod R", code: "MCU + charger + mic", c: ER, s: [EP.R.t, EP.R.h, EP.R.len], rx: EAR_ROT, mat: [-1.45, 0, -0.50], matRot: [0, 0, -Math.PI / 2] },
    earL:   { name: "Ear pod L", code: "battery", c: EL, s: [EP.L.t, EP.L.h, EP.L.len], rx: EAR_ROT, mat: [1.45, 0, -0.50], matRot: [0, 0, Math.PI / 2] },
    qtpy:   { name: "QT Py ESP32 Pico", code: "#5395 · BT Classic + BLE", c: ear("R", -0.028, 0, 0), s: [0.03, 0.18, 0.22], rx: EAR_ROT, mat: [-1.0, 0, 0.62], matRot: [0, 0, -Math.PI / 2] },
    chg:    { name: "Micro-Lipo charger", code: "#4410 · 100 mA", c: ear("R", 0.040, 0.01, -0.01), s: [0.02, 0.16, 0.19], rx: EAR_ROT, mat: [-0.66, 0, 0.62], matRot: [0, 0, Math.PI / 2] },
    div:    { name: "Battery divider", code: "2 × 100 kΩ → A3", c: ear("R", -0.008, 0.083, 0.0), s: [0.012, 0.012, 0.05], rx: EAR_ROT, mat: [-0.42, 0, 0.66] },
    ampR:   { name: "MAX98357A (R)", code: "I²S amp · R channel", c: AC(R), s: [0.014, 0.17, 0.19], mat: [-1.45, 0, 0.25], matRot: [0, 0, -Math.PI / 2] },
    ampL:   { name: "MAX98357A (L)", code: "I²S amp · L channel", c: AC(L), s: [0.014, 0.17, 0.19], mat: [1.45, 0, 0.25], matRot: [0, 0, Math.PI / 2] },
    mic:    { name: "I²S MEMS mic", code: "SPH0645 #3421 · port → jaw", c: ear("R", ...MIC_L), s: [0.12, 0.012, 0.16], rx: EAR_ROT, mat: [-1.0, 0, 0.98] },
    res:    { name: "330 kΩ resistor", code: "VIN → SD (R amp)", c: [R * (TX - 0.012), TY - 0.022, -0.39], s: [0.012, 0.012, 0.05], mat: [-0.26, 0, 0.66] },
    spkR:   { name: "Speaker R", code: "15×11 mm · 8 Ω 1 W", c: SPC(R), s: [0.035, 0.11, 0.15], mat: [-1.45, 0, -0.12], matRot: [0, 0, -Math.PI / 2] },
    spkL:   { name: "Speaker L", code: "15×11 mm · 8 Ω 1 W", c: SPC(L), s: [0.035, 0.11, 0.15], mat: [1.45, 0, -0.12], matRot: [0, 0, Math.PI / 2] },
    padR1:  { name: "Copper pad R1", code: "A2 · T7", c: padC(R, 0), s: [0.003, 0.05, 0.10], mat: [-0.48, 0, 0.92] },
    padR2:  { name: "Copper pad R2", code: "SDA · T0", c: padC(R, 1), s: [0.003, 0.05, 0.10], mat: [-0.36, 0, 0.92] },
    padR3:  { name: "Copper pad R3", code: "SCL · T8", c: padC(R, 2), s: [0.003, 0.05, 0.10], mat: [-0.24, 0, 0.92] },
    padL1:  { name: "Copper pad L1", code: "TX · T9", c: padC(L, 0), s: [0.003, 0.05, 0.10], mat: [0.24, 0, 0.92] },
    padL2:  { name: "Copper pad L2", code: "MO · T4", c: padC(L, 1), s: [0.003, 0.05, 0.10], mat: [0.36, 0, 0.92] },
    padL3:  { name: "Copper pad L3", code: "SCK · T6", c: padC(L, 2), s: [0.003, 0.05, 0.10], mat: [0.48, 0, 0.92] },
    bat:    { name: "LiPo 401230", code: "3.7 V 120 mAh", c: ear("L", 0.013, 0, -0.02), s: [0.04, 0.12, 0.30], rx: EAR_ROT, mat: [0.15, 0, 0.62], matRot: [0, 0, Math.PI / 2] },
    sw:     { name: "Slide switch", code: "battery line", c: ear("R", 0.0, 0.118, -0.004), s: [0.05, 0.03, 0.08], rx: EAR_ROT, mat: [-0.10, 0, 0.66] },
    batBig: { name: "LiPo 350 mAh", code: "alt · bigger ear pod", mat: [0.62, 0, 0.62] },
    lidR:   { name: "Hinge lid R", code: "inner face · speaker slot", c: [R * (TX + HP.xc - HP.xw / 2 - HP.lid / 2), TY, -0.465], s: [HP.lid, 0.21, 0.59], mat: [1.02, 0, -1.30], matRot: [0, 0, Math.PI / 2] },
    lidL:   { name: "Hinge lid L", code: "inner face · speaker slot", c: [L * (TX + HP.xc - HP.xw / 2 - HP.lid / 2), TY, -0.465], s: [HP.lid, 0.21, 0.59], mat: [1.36, 0, -1.30], matRot: [0, 0, Math.PI / 2] },
    lidER:  { name: "Ear lid R", code: "USB-C slot", c: ear("R", 0.069, 0, 0), s: [0.012, EP.R.h, EP.R.len], rx: EAR_ROT, mat: [1.05, 0, -1.68], matRot: [0, 0, Math.PI / 2] },
    lidEL:  { name: "Ear lid L", code: "snap-fit", c: ear("L", -0.0415, 0, 0), s: [0.012, EP.L.h, EP.L.len], rx: EAR_ROT, mat: [1.42, 0, -1.68], matRot: [0, 0, Math.PI / 2] },
    sleeveR: { name: "Temple sleeve R", code: "heat-shrink · painted", c: [R * 0.65, 0.375, -0.92], s: [0.05, 0.05, 0.5], mat: [1.80, 0, -0.30] },
    sleeveL: { name: "Temple sleeve L", code: "heat-shrink · painted", c: [L * 0.65, 0.375, -0.92], s: [0.05, 0.05, 0.5], mat: [1.88, 0, 0.25] },
    browCap: { name: "Rim cover strip", code: "tortoise · behind the top rim", c: [0, 0.47, -0.042], s: [1.26, 0.03, 0.03], mat: [0, 0, 0.36] },
    plug:   { name: "USB-C plug", code: "5 V", c: ear("R", 0.0, -0.005, -0.205), rx: EAR_ROT, mat: [-1.30, 0, -1.05] }
  };
  const SCREWS = {
    hingeL: { c: [L * TX, TY + 0.034, -0.035], step: "prep", name: "Hinge screw L" },
    hingeR: { c: [R * TX, TY + 0.034, -0.035], step: "prep", name: "Hinge screw R" },
    lR1: { c: [R * (TX - 0.03), TY + 0.027, -0.30], step: "close", name: "Lid screw" },
    lR2: { c: [R * (TX - 0.03), TY + 0.027, -0.65], step: "close", name: "Lid screw" },
    lL1: { c: [L * (TX - 0.03), TY + 0.027, -0.30], step: "close", name: "Lid screw" },
    lL2: { c: [L * (TX - 0.03), TY + 0.027, -0.65], step: "close", name: "Lid screw" }
  };
  const TIN = ["A0", "A1", "A2", "A3", "SDA", "SCL", "TX", "RX", "MO", "SCK", "5V", "GND"];
  window.FLAT_GEO = { TX, TY, LX, LY, LENS, RIMT, OUTER, FZ, TPTS, TIP_Z, templeAt, lensPts, hpProfile, HP, hpOut, hpIn, MIC_L, micPin, EAR_ROT, EC, EP, ear, qtLocal, pad, QA, QB,
    AMP_PINS, AC, ampPin, SPC, spkPin, PADZ, padC, padTab, batT, lane, alongT, brow, BROW_X, BROW_Y, C, WIRES, PARTS, SCREWS, TIN };
})();
