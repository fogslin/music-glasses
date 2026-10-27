/* Music Glasses Docs drawer: BOM, GPIO, wiring SVGs, checklists, copy buttons (derived from the classic guide) */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* file:// in some browsers */ } }
  };
  const CHECK_KEY = "music-glasses-guide-checks-v1";
  const STEPS = [];
  let checks = store.get(CHECK_KEY, {});

  /* ------------------------------------------------------------ BOM (prices from the Music Glasses v1 spec) */
  const BOM = [
    { part: "Adafruit QT Py ESP32 Pico (#5395)", purpose: "MCU: classic Bluetooth (A2DP sink) + BLE, 8 MB flash / 2 MB PSRAM, USB-C. VBAT +/− pads on the back (diode-protected, 3–6 V)", qty: 1, price: "$14.95", lo: 14.95, url: "https://www.adafruit.com/product/5395", vendor: "Adafruit", req: true },
    { part: "Adafruit I2S 3W Class D Amp — MAX98357A (#3006)", purpose: "One per side: I²S DAC + amp. Left: SD→VIN (left channel). Right: 330 kΩ VIN→SD (right channel). GAIN→VIN = 6 dB", qty: 2, price: "$11.90 (2 × $5.95)", lo: 11.90, url: "https://www.adafruit.com/product/3006", vendor: "Adafruit", req: true },
    { part: "Same Sky CMS-151135-18SP-X8 micro speaker", purpose: "15 × 11 × 3.5 mm, 8 Ω, open-ear driver in each hinge pod", qty: 2, price: "$4.70 (2 × $2.35)", lo: 4.70, url: "https://octopart.com/cms-151135-18sp-x8-same+sky-121693938", vendor: "Octopart (Same Sky)", req: true },
    { part: "Adafruit I2S MEMS Microphone Breakout — SPH0645LM4H (#3421)", purpose: "Call mic in the RIGHT ear pod, front-lower edge, port aimed forward-down along the jaw line. I²S, 1.6–3.6 V, 50 Hz–15 kHz, 16.7 × 12.7 mm. (The ICS-43434 #6049 is discontinued; Adafruit lists the SPH0645 as its replacement)", qty: 1, price: "$6.95", lo: 6.95, url: "https://www.adafruit.com/product/3421", vendor: "Adafruit", req: true },
    { part: "Adafruit Micro-Lipo charger USB-C (#4410)", purpose: "LiPo charging from USB-C (100 mA default — right for 120 mAh)", qty: 1, price: "$5.95", lo: 5.95, url: "https://www.adafruit.com/product/4410", vendor: "Adafruit", req: true },
    { part: "LiPo 401230 3.7 V 120 mAh (protected)", purpose: "Cell in the left ear pod. ~1 h of music or ~45–60 min of calls (estimates)", qty: 1, price: "$6.99", lo: 6.99, url: "https://www.amazon.com/dp/B0GDXD64XN", vendor: "Amazon", req: true },
    { part: "LiPo 3.7 V 350 mAh (e.g. Adafruit #2750)", purpose: "Option: ~3 h (estimate), needs a longer left ear pod", qty: "alt.", price: "≈ $6.95", lo: 0, url: "https://www.adafruit.com/product/2750", vendor: "Adafruit", req: false },
    { part: "Copper foil tape, conductive adhesive (#1128)", purpose: "6 touch electrodes (3 per hinge pod), inlaid flush and painted over", qty: 1, price: "$5.95", lo: 5.95, url: "https://www.adafruit.com/product/1128", vendor: "Adafruit", req: true },
    { part: "Donor frame", purpose: "Not needed: you are using your own tortoiseshell frames (spec line kept for reference)", qty: "—", price: "$16.98 (skip)", lo: 0, url: "https://www.amazon.com/dp/B0CGHDYWTV", vendor: "Amazon", req: false },
    { part: "3D-printed pods + lids (resin or PLA)", purpose: "2 slim hinge pods (gold), 2 ear pods (tortoise, right one 15 mm thick with mic port + horn), 4 lids, rim cover strip", qty: "set", price: "~$10 (est.)", lo: 10, url: "", vendor: "print yourself / service", req: true },
    { part: "Sub-miniature slide switch", purpose: "Battery on/off in the right ear pod", qty: 1, price: "~$1 (est.)", lo: 1, url: "", vendor: "generic", req: true },
    { part: "Wire: 36–40 AWG magnet / 32 AWG silicone", purpose: "Rim harness (9 conductors, hidden behind the top rim) + temple runs + 5 short mic leads in the right ear pod", qty: "few m", price: "~$5.50 (est.)", lo: 5.5, url: "", vendor: "generic", req: true },
    { part: "Resistors 330 kΩ + 2 × 100 kΩ", purpose: "Right-channel select; battery-sense divider", qty: 3, price: "~$1 (est.)", lo: 1, url: "", vendor: "generic", req: true },
    { part: "Paint, primer, Kapton tape, heat-shrink, UV resin", purpose: "Non-conductive gold (hinge pods) / tortoise (ear pods, rim cover) finish, insulation, strain relief, foam ring for the mic port", qty: "—", price: "~$10 (est.)", lo: 10, url: "", vendor: "generic", req: true }
  ];
  function renderBOM() {
    const tb = $("#bomTable tbody"); if (!tb) return;
    tb.innerHTML = BOM.map(b => {
      const link = b.url ? `<a href="${b.url}" target="_blank" rel="noopener">${b.vendor}</a>` : `<span class="muted">${b.vendor}</span>`;
      return `<tr><td><b>${b.part}</b><br>${b.req ? '<span class="pill req">core</span>' : '<span class="pill opt">optional / alt.</span>'}</td><td>${b.purpose}</td><td>${b.qty}</td><td class="price">${b.price}</td><td>${link}</td></tr>`;
    }).join("");
    const core = BOM.filter(b => b.req).reduce((a, b) => a + b.lo, 0);
    $("#bomTotal").textContent = `Core build with your own frames: ≈ $${core.toFixed(0)} (≈ $${(core + 16.98).toFixed(0)} including the $16.98 donor frame from the spec). Items marked ~ are estimates; prices exclude tax and shipping.`;
  }

  /* ------------------------------------------------------------ GPIO table (QT Py ESP32 Pico) */
  const GPIO = [
    ["A0", "GPIO26", "DAC2 / ADC2", "I²S BCLK", "Both MAX98357A BCLK + mic BCLK", "Right amp via the right temple, left amp behind the top rim, mic local in the ear pod. 1.41 MHz music / 2.048 MHz calls"],
    ["A1", "GPIO25", "DAC1 / ADC2", "I²S LRC (WS)", "Both MAX98357A LRC + mic LRCL", "44.1 kHz music / 32 kHz calls"],
    ["RX", "GPIO7", "—", "I²S DIN (data out)", "Both MAX98357A DIN", "UART RX pad repurposed as output"],
    ["A2", "GPIO27", "T7", "Touch R1 (front)", "Right pod copper pad 1", "Nearest the hinge"],
    ["SDA", "GPIO4", "T0", "Touch R2 (middle)", "Right pod copper pad 2", "No I²C used — pad is free"],
    ["SCL", "GPIO33", "T8", "Touch R3 (rear)", "Right pod copper pad 3", ""],
    ["TX", "GPIO32", "T9", "Touch L1 (front)", "Left pod copper pad 1", "Over the brow"],
    ["MO", "GPIO13", "T4", "Touch L2 (middle)", "Left pod copper pad 2", "Over the brow"],
    ["SCK", "GPIO14", "T6", "Touch L3 (rear)", "Left pod copper pad 3", "Over the brow"],
    ["SDA1 (STEMMA QT)", "GPIO22", "—", "I²S mic DATA IN", "SPH0645 DOUT (right ear pod)", "Not a strapping pin. Use a STEMMA QT cable end or solder to the connector's SDA leg. Mic BCLK/LRCL share A0/A1 with the amps; SEL → GND (left slot)"],
    ["A3", "GPIO15", "ADC2", "Battery sense", "100 k / 100 k divider from switched VBAT", "Strapping pin: keep the divider high-impedance. ADC2 reads can fail while the radio is busy — the firmware retries"],
    ["MI", "GPIO12", "—", "do not use", "—", "Strapping pin (flash voltage)"],
    ["BOOT", "GPIO0", "—", "boot button only", "—", "Strapping pin"],
    ["5V", "—", "—", "USB 5 V out", "Micro-Lipo 5V in", "Charger only sees power while USB is plugged in"],
    ["GND", "—", "—", "Ground", "Charger GND, amps GND (via harness)", ""],
    ["VBAT + / −", "back pads", "—", "Battery in (3–6 V, diode)", "Slide switch OUT / cell −", "Also feeds both amps' VIN (switched VBAT)"]
  ];
  function renderGPIO() {
    const tb = $("#gpioTable tbody"); if (!tb) return;
    tb.innerHTML = GPIO.map(r => `<tr><td class="pin">${r[0]}</td><td class="pin">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td class="small muted">${r[5]}</td></tr>`).join("");
  }

  /* ------------------------------------------------------------ Wiring SVG generator */
  const COL = { pwr: "#f87171", gnd: "#94a3b8", v33: "#fb7185", sda: "#60a5fa", scl: "#facc15", din: "#4ade80", bclk: "#c084fc", lrc: "#fb923c", io: "#22d3ee", touch: "#f1f5f9", spk: "#f472b6", vb: "#fbbf24" };
  const LEFT = ["A0", "A1", "A2", "A3", "SDA", "SCL", "TX"];
  const RIGHT = ["5V", "GND", "3V", "MO", "MI", "SCK", "RX"];
  const BX = 360, BW = 180, BY = 80, PITCH = 40;
  function pinXY(p) {
    let i = LEFT.indexOf(p); if (i >= 0) return { x: BX, y: BY + 40 + i * PITCH, side: "L" };
    i = RIGHT.indexOf(p); if (i >= 0) return { x: BX + BW, y: BY + 40 + i * PITCH, side: "R" };
    if (p === "VB-") return { x: BX + 60, y: BY + 360, side: "B" };
    if (p === "VB+") return { x: BX + 120, y: BY + 360, side: "B" };
    return null;
  }
  const PIN_LABEL = { A0: "A0·G26", A1: "A1·G25", A2: "A2·T7", A3: "A3·G15", SDA: "SDA·T0", SCL: "SCL·T8", TX: "TX·T9", "5V": "5V", GND: "GND", "3V": "3V", MO: "MO·T4", MI: "MI·G12", SCK: "SCK·T6", RX: "RX·G7" };
  const DIAGRAMS = {
    power: {
      title: "Power: 120 mAh cell → switch → VBAT pads · USB-C charger (right ear pod)", used: ["VB+", "VB-", "5V", "GND", "A3"],
      comps: [
        { id: "bat", label: "LiPo 401230 120 mAh (left ear pod)", x: 40, y: 300, w: 200, h: 90, terms: [["+", "R", 25], ["−", "R", 65]] },
        { id: "div", label: "100 k / 100 k divider", x: 40, y: 100, w: 200, h: 110, terms: [["top", "R", 25], ["mid", "R", 55], ["bot", "R", 85]] },
        { id: "chg", label: "Micro-Lipo #4410", x: 690, y: 90, w: 180, h: 120, terms: [["5V", "L", 25], ["GND", "L", 55], ["BAT", "L", 85]] },
        { id: "sw", label: "Slide switch", x: 690, y: 320, w: 170, h: 70, terms: [["COM", "L", 20], ["OUT", "L", 50]] }
      ],
      wires: [
        { pts: "5V>chg:5V", c: COL.pwr, label: "USB 5V", lane: 0 },
        { pts: "GND>chg:GND", c: COL.gnd, label: "GND", lane: 1 },
        { pts: "bat:+>chg:BAT", c: COL.vb, label: "cell + (over the brow)", via: [[300, 325], [300, 50], [650, 50], [650, 175]], lp: [420, 44] },
        { pts: "chg:BAT>sw:COM", c: COL.vb, src: [690, 175], via: [[668, 175], [668, 340]], label: "", lp: [0, 0] },
        { pts: "sw:OUT>VB+", c: COL.pwr, label: "switched → VBAT +", via: [[620, 370], [620, 505], [480, 505]], lp: [630, 470] },
        { pts: "VB->bat:−", c: COL.gnd, label: "VBAT − → cell −", via: [[420, 525], [280, 525], [280, 365]], lp: [150, 520] },
        { pts: "A3>div:mid", c: COL.io, label: "A3 sense", lane: 0 },
        { pts: "div:top>sw:OUT", c: COL.pwr, src: [240, 125], via: [[262, 125], [262, 62], [680, 62], [680, 370]], dash: true, label: "top ← switched VBAT", lp: [60, 240] },
        { pts: "div:bot>gnd", c: COL.gnd, src: [240, 185], via: [[262, 185]], dst: [262, 200], gnd: true }
      ],
      notes: "Cell + → switch COM → switch OUT → VBAT+ (back pad, diode-protected 3–6 V). The charger's BAT pin sits on the cell side of the switch, so it charges with the switch OFF. One USB-C port (the QT Py's, at the bottom of the right ear pod) both flashes and charges: QT Py 5V → charger 5V. In the build the cell − returns over the brow harness GND (same net as VBAT −). A3 (GPIO15) reads half the battery voltage through the 100 k / 100 k divider. GPIO15 is a strapping pin: the divider holds it near 2 V at boot, which is fine (it only silences boot log output)."
    },
    i2s: {
      title: "I²S stereo: two MAX98357A (L / R by SD pin) + micro-speakers", used: ["A0", "A1", "RX", "GND", "VB+"],
      comps: [
        { id: "ampL", label: "MAX98357A — LEFT pod", x: 40, y: 70, w: 170, h: 200, terms: [["LRC", "R", 25], ["BCLK", "R", 50], ["DIN", "R", 75], ["GAIN", "R", 100], ["SD", "R", 125], ["GND", "R", 150], ["VIN", "R", 175]] },
        { id: "ampR", label: "MAX98357A — RIGHT pod", x: 690, y: 70, w: 170, h: 200, terms: [["LRC", "L", 25], ["BCLK", "L", 50], ["DIN", "L", 75], ["GAIN", "L", 100], ["SD", "L", 125], ["GND", "L", 150], ["VIN", "L", 175]] },
        { id: "spkL", label: "Speaker L 8 Ω", x: 40, y: 380, w: 170, h: 60, terms: [["+", "R", 20], ["−", "R", 44]] },
        { id: "spkR", label: "Speaker R 8 Ω", x: 690, y: 380, w: 170, h: 60, terms: [["+", "L", 20], ["−", "L", 44]] }
      ],
      wires: [
        { pts: "A0>ampR:BCLK", c: COL.bclk, label: "BCLK", via: [[330, 120], [330, 40], [640, 40], [640, 120]], lp: [470, 34] },
        { pts: "A1>ampR:LRC", c: COL.lrc, label: "LRC", via: [[315, 160], [315, 26], [652, 26], [652, 95]], lp: [560, 20] },
        { pts: "RX>ampR:DIN", c: COL.din, label: "DIN", via: [[600, 360], [600, 145]], lp: [604, 300] },
        { pts: "GND>ampR:GND", c: COL.gnd, label: "GND", via: [[582, 160], [582, 220]], lp: [586, 212] },
        { pts: "VB+>ampR:VIN", c: COL.vb, label: "VBAT", via: [[480, 470], [625, 470], [625, 245]], lp: [630, 260] },
        { pts: "ampR:GAIN>ampR:VIN", c: COL.vb, src: [690, 170], via: [[672, 170], [672, 245]], dst: [690, 245], dash: true },
        { pts: "ampR:SD>ampR:VIN", c: COL.io, src: [690, 195], via: [[660, 195], [660, 245]], dst: [690, 245], label: "330 kΩ = R", lp: [700, 300] },
        { pts: "A0>ampL:BCLK", c: COL.bclk, via: [[300, 120]] },
        { pts: "A1>ampL:LRC", c: COL.lrc, via: [[285, 160], [285, 95]] },
        { pts: "RX>ampL:DIN", c: COL.din, label: "DIN (brow)", src: [540, 360], via: [[560, 360], [560, 500], [260, 500], [260, 145]], lp: [300, 494] },
        { pts: "VB+>ampL:VIN", c: COL.vb, label: "VBAT (brow)", via: [[480, 480], [270, 480], [270, 245]], lp: [300, 474] },
        { pts: "ampL:GAIN>ampL:VIN", c: COL.vb, src: [210, 170], via: [[248, 170], [248, 245]], dst: [210, 245], dash: true },
        { pts: "ampL:SD>ampL:VIN", c: COL.io, src: [210, 195], via: [[226, 195], [226, 245]], dst: [210, 245], label: "SD→VIN = L", lp: [60, 300] },
        { pts: "ampL:GND>gnd", c: COL.gnd, src: [210, 220], via: [[238, 220]], dst: [238, 228], gnd: true },
        { pts: "ampR:+>spkR:+", c: COL.spk, src: [860, 140], via: [[885, 140], [885, 340], [660, 340], [660, 400]] },
        { pts: "ampR:−>spkR:−", c: COL.spk, src: [860, 165], via: [[895, 165], [895, 460], [650, 460], [650, 424]] },
        { pts: "ampL:+>spkL:+", c: COL.spk, src: [40, 140], via: [[18, 140], [18, 345], [228, 345], [228, 400]] },
        { pts: "ampL:−>spkL:−", c: COL.spk, src: [40, 165], via: [[8, 165], [8, 462], [240, 462], [240, 424]] }
      ],
      notes: "BCLK = A0 (GPIO26), LRC = A1 (GPIO25), DIN = RX (GPIO7) go to both amps. Channel by SD: left amp SD tied to VIN = left; right amp 330 kΩ VIN→SD = right. GAIN→VIN (dashed) = 6 dB. Amps run from switched VBAT. Speaker outputs are bridged (+/−): never connect either lead to GND."
    },
    mic: {
      title: "Call mic: SPH0645 I²S MEMS in the right ear pod (shares BCLK / LRC with the amps)", used: ["A0", "A1", "3V", "GND"],
      comps: [
        { id: "mic", label: "SPH0645 #3421 (ear pod, port → jaw)", x: 690, y: 120, w: 190, h: 175, terms: [["3V", "L", 25], ["GND", "L", 50], ["BCLK", "L", 75], ["DOUT", "L", 100], ["LRCL", "L", 125], ["SEL", "L", 150]] },
        { id: "qt", label: "STEMMA QT · SDA1", x: 560, y: 460, w: 120, h: 40, terms: [["G22", "R", 20]] },
        { id: "amps", label: "→ both MAX98357A", x: 40, y: 120, w: 170, h: 80, terms: [["BCLK", "R", 25], ["LRC", "R", 55]] }
      ],
      wires: [
        { pts: "3V>mic:3V", c: COL.v33, label: "3V", lane: 0 },
        { pts: "GND>mic:GND", c: COL.gnd, label: "GND", lane: 1 },
        { pts: "A0>mic:BCLK", c: COL.bclk, label: "BCLK (shared)", via: [[330, 120], [330, 40], [640, 40], [640, 195]], lp: [430, 34] },
        { pts: "A1>mic:LRCL", c: COL.lrc, label: "LRCL (shared)", via: [[315, 160], [315, 26], [652, 26], [652, 245]], lp: [520, 20] },
        { pts: "qt:G22>mic:DOUT", c: COL.io, label: "DOUT → GPIO22", via: [[672, 480], [672, 220]], lp: [560, 445] },
        { pts: "mic:SEL>gnd", c: COL.gnd, src: [690, 270], via: [[664, 270]], dst: [664, 280], gnd: true },
        { pts: "A0>amps:BCLK", c: COL.bclk, via: [[300, 120], [300, 145]] },
        { pts: "A1>amps:LRC", c: COL.lrc, via: [[285, 160], [285, 175]] }
      ],
      notes: "Mic BCLK/LRCL ride on the same A0/A1 lines as the amps (all inputs, so sharing is fine); DOUT is the only new GPIO: GPIO22 on the STEMMA QT connector (SDA1). SEL → GND puts the mic in the LEFT slot. During a call the firmware reopens I²S0 full duplex at 32 kHz × 32-bit (BCLK 2.048 MHz, inside the SPH0645's 2.048–4.096 MHz range) and resamples to/from the 8 kHz (CVSD) or 16 kHz (mSBC) HFP stream; music returns to 44.1 kHz TX only. All five leads stay inside the right ear pod: the cross-frame harness is still 9 wires."
    },
    touch: {
      title: "Touch inlays: 3 copper pads per hinge pod (capacitive, ESP32 touch pins)", used: ["A2", "SDA", "SCL", "TX", "MO", "SCK"],
      comps: [
        { id: "r1", label: "R1 front (right pod)", x: 40, y: 80, w: 170, h: 56, terms: [["tab", "R", 28]] },
        { id: "r2", label: "R2 middle", x: 40, y: 170, w: 170, h: 56, terms: [["tab", "R", 28]] },
        { id: "r3", label: "R3 rear", x: 40, y: 260, w: 170, h: 56, terms: [["tab", "R", 28]] },
        { id: "l1", label: "L1 front (left pod)", x: 690, y: 80, w: 170, h: 56, terms: [["tab", "L", 28]] },
        { id: "l2", label: "L2 middle", x: 690, y: 170, w: 170, h: 56, terms: [["tab", "L", 28]] },
        { id: "l3", label: "L3 rear", x: 690, y: 260, w: 170, h: 56, terms: [["tab", "L", 28]] }
      ],
      wires: [
        { pts: "A2>r1:tab", c: COL.touch, label: "T7", lane: 0 },
        { pts: "SDA>r2:tab", c: COL.touch, label: "T0", lane: 1 },
        { pts: "SCL>r3:tab", c: COL.touch, label: "T8", lane: 2 },
        { pts: "TX>l1:tab", c: COL.touch, label: "T9 (brow)", lane: 3 },
        { pts: "MO>l2:tab", c: COL.touch, label: "T4 (brow)", lane: 0 },
        { pts: "SCK>l3:tab", c: COL.touch, label: "T6 (brow)", lane: 1 }
      ],
      notes: "Pads ~11 mm long with 1.5 mm gaps, inlaid flush in a 0.1 mm recess on each pod's outer face and painted with NON-conductive paint. Either pod: tap = play/pause (answer / hang up during a call), long-press 0.8 s on one pad = reject an incoming call, swipe rear→front = volume up, front→rear = volume down (±8 of 127, or ±1 of 15 HFP call volume; the phone's slider follows). Thresholds: trigger at −15 %, release at −10 % of a 64-sample baseline; taps 40–300 ms; 150 ms lockout."
    }
  };
  function compTerm(d, ref) {
    const [cid, tname] = ref.split(":");
    const c = d.comps.find(k => k.id === cid); if (!c) return null;
    const t = c.terms.find(k => k[0] === tname); if (!t) return null;
    const x = t[1] === "L" ? c.x : c.x + c.w;
    return { x, y: c.y + t[2], side: t[1] };
  }
  function endpoint(d, ref) { return ref.includes(":") ? compTerm(d, ref) : pinXY(ref); }
  function buildSVG(key, opts = {}) {
    const d = DIAGRAMS[key]; const mini = !!opts.mini;
    const P = opts.paper ? { title: "#111", board: "#fff", boardS: "#111", usb: "#ddd", usbT: "#111", xt: "#333", xt2: "#666", on: "#111", off: "#ccc", pinOn: "#111", pinOff: "#999", padBox: "#fafafa", padS: "#555", padT: "#555", padOn: "#111", padOff: "#ddd", padTx: "#fff", cFill: "#fff", cS: "#111", cT: "#111", term: "#111", termT: "#222", flow: "#ffffff" }
      : { title: "#cfe0ff", board: "#13213a", boardS: "#3b5384", usb: "#64748b", usbT: "#0b1220", xt: "#93a4c3", xt2: "#5d6f92", on: "#5eead4", off: "#26375a", pinOn: "#e6edf7", pinOff: "#5d6f92", padBox: "#0f1a2e", padS: "#3b5384", padT: "#93a4c3", padOn: "#5eead4", padOff: "#26375a", padTx: "#06121a", cFill: "#121c30", cS: "#a78bfa", cT: "#c4b5fd", term: "#a78bfa", termT: "#dbe7ff", flow: "#ffffff" };
    const ns = 'xmlns="http://www.w3.org/2000/svg"';
    let s = `<svg ${ns} viewBox="0 0 900 540" role="img" aria-label="${d.title}">`;
    const colors = [...new Set(d.wires.map(w => w.c))];
    s += "<defs>" + colors.map((c, i) => `<marker id="ah-${key}-${i}${mini ? "m" : ""}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`).join("") + "</defs>";
    s += `<text x="20" y="30" fill="${P.title}" font-size="17" font-weight="600">${d.title}</text>`;
    // QT Py board
    s += `<rect x="${BX}" y="${BY}" width="${BW}" height="320" rx="14" fill="${P.board}" stroke="${P.boardS}" stroke-width="2"/>`;
    s += `<rect x="${BX + 62}" y="${BY - 14}" width="56" height="26" rx="5" fill="${P.usb}"/><text x="${BX + 90}" y="${BY + 4}" fill="${P.usbT}" font-size="11" text-anchor="middle" font-weight="700">USB-C</text>`;
    s += `<text x="${BX + 90}" y="${BY + 175}" fill="${P.xt}" font-size="13" text-anchor="middle">Adafruit QT Py</text><text x="${BX + 90}" y="${BY + 193}" fill="${P.xt}" font-size="13" text-anchor="middle">ESP32 Pico</text>`;
    s += `<text x="${BX + 90}" y="${BY + 211}" fill="${P.xt2}" font-size="10.5" text-anchor="middle">(top view)</text>`;
    const used = new Set(d.used);
    LEFT.concat(RIGHT).forEach(p => {
      const q = pinXY(p); const on = used.has(p);
      s += `<circle cx="${q.x}" cy="${q.y}" r="${on ? 7 : 5}" fill="${on ? P.on : P.off}" stroke="${opts.paper ? "#fff" : "#0b1220"}" stroke-width="2">${on ? '<animate attributeName="r" values="6;9;6" dur="1.4s" repeatCount="indefinite"/>' : ""}</circle>`;
      const lx = q.side === "L" ? q.x + 14 : q.x - 14;
      s += `<text x="${lx}" y="${q.y + 4}" fill="${on ? P.pinOn : P.pinOff}" font-size="12" text-anchor="${q.side === "L" ? "start" : "end"}" font-family="monospace">${PIN_LABEL[p] || p}</text>`;
    });
    // underside pads
    s += `<rect x="${BX + 20}" y="${BY + 335}" width="${BW - 40}" height="50" rx="8" fill="${P.padBox}" stroke="${P.padS}" stroke-dasharray="4 3"/>`;
    s += `<text x="${BX + 90}" y="${BY + 400}" fill="${P.padT}" font-size="11" text-anchor="middle">back pads: VBAT − / +</text>`;
    ["VB-", "VB+"].forEach(p => { const q = pinXY(p); const on = used.has(p);
      s += `<rect x="${q.x - 16}" y="${q.y - 9}" width="32" height="18" rx="4" fill="${on ? P.padOn : P.padOff}"/><text x="${q.x}" y="${q.y + 4}" font-size="10" text-anchor="middle" fill="${P.padTx}" font-weight="700">${p.replace("VB-", "VB−")}</text>`; });
    // components
    d.comps.forEach(c => {
      s += `<g><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="12" fill="${P.cFill}" stroke="${P.cS}" stroke-width="1.6"/>`;
      s += `<text x="${c.x + c.w / 2}" y="${c.y - 8}" fill="${P.cT}" font-size="13" text-anchor="middle" font-weight="600">${c.label}</text>`;
      c.terms.forEach(t => { const x = t[1] === "L" ? c.x : c.x + c.w; const y = c.y + t[2];
        s += `<circle cx="${x}" cy="${y}" r="5" fill="${P.term}"/><text x="${t[1] === "L" ? x + 10 : x - 10}" y="${y + 4}" fill="${P.termT}" font-size="11.5" text-anchor="${t[1] === "L" ? "start" : "end"}" font-family="monospace">${t[0]}</text>`; });
      s += "</g>";
    });
    // wires
    d.wires.forEach((w, wi) => {
      const [a, b] = w.pts.split(">");
      const A = w.src ? { x: w.src[0], y: w.src[1], side: "X" } : endpoint(d, a);
      const B = w.dst ? { x: w.dst[0], y: w.dst[1], side: "X" } : endpoint(d, b);
      if (!A || !B) return;
      let pts = [[A.x, A.y]];
      if (w.via) pts = pts.concat(w.via);
      else {
        const lane = w.lane || 0;
        const ox = A.side === "L" ? A.x - 40 - lane * 16 : A.side === "R" ? A.x + 40 + lane * 16 : A.x;
        pts.push([ox, A.y]);
        if ((A.side === "L" && B.x < BX) || (A.side === "R" && B.x > BX + BW)) pts.push([ox, B.y]);
        else { const ty = BY - 30 - lane * 10; pts.push([ox, ty]); const bx = B.side === "L" ? B.x - 30 - lane * 12 : B.x + 30 + lane * 12; pts.push([bx, ty]); pts.push([bx, B.y]); }
      }
      pts.push([B.x, B.y]);
      const dstr = "M" + pts.map(p => p.join(",")).join(" L");
      const mi = colors.indexOf(w.c);
      s += `<path d="${dstr}" fill="none" stroke="${w.c}" stroke-opacity=".25" stroke-width="7" stroke-linejoin="round"/>`;
      s += `<path class="draw" style="animation-delay:${wi * 0.18}s" d="${dstr}" fill="none" stroke="${w.c}" stroke-width="2.6" stroke-linejoin="round" ${w.dash ? 'stroke-dasharray="6 5"' : ""} marker-end="url(#ah-${key}-${mi}${mini ? "m" : ""})"/>`;
      s += `<path class="flow" d="${dstr}" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.2"/>`;
      if (w.gnd) { const g = pts[pts.length - 1]; s += `<g stroke="${COL.gnd}" stroke-width="2.2"><line x1="${g[0] - 12}" y1="${g[1] + 8}" x2="${g[0] + 12}" y2="${g[1] + 8}"/><line x1="${g[0] - 7}" y1="${g[1] + 13}" x2="${g[0] + 7}" y2="${g[1] + 13}"/><line x1="${g[0] - 3}" y1="${g[1] + 18}" x2="${g[0] + 3}" y2="${g[1] + 18}"/></g>`; }
      if (w.label && !mini) { const m = w.lp ? [w.lp[0] - 6, w.lp[1] + 6] : pts[Math.min(1, pts.length - 1)]; s += `<text x="${m[0] + 6}" y="${m[1] - 6}" fill="${w.c}" font-size="11" font-weight="600">${w.label}</text>`; }
    });
    s += "</svg>";
    return s;
  }
  function renderWiring(key) {
    const box = $("#wireSvg"); if (!box) return;
    box.innerHTML = buildSVG(key);
    $("#wireNotes").textContent = DIAGRAMS[key].notes;
    $$("#wireTabs .btn").forEach(b => b.classList.toggle("on", b.dataset.k === key));
    const leg = { power: [["Cell +", COL.vb], ["Switched VBAT / 5V", COL.pwr], ["GND", COL.gnd], ["Sense", COL.io]], i2s: [["LRC", COL.lrc], ["BCLK", COL.bclk], ["DIN", COL.din], ["VBAT", COL.vb], ["SD select", COL.io], ["Speaker", COL.spk]], touch: [["Touch", COL.touch]], mic: [["3V", COL.v33], ["GND", COL.gnd], ["BCLK", COL.bclk], ["LRCL", COL.lrc], ["DOUT", COL.io]] }[key];
    $("#wireLegend").innerHTML = leg.map(l => `<span><i style="background:${l[1]}"></i>${l[0]}</span>`).join("");
  }
  function initWiringTabs() {
    const t = $("#wireTabs"); if (!t) return;
    const names = { power: "⚡ Power + charging", i2s: "🔊 I²S stereo audio", touch: "👆 Touch inlays", mic: "🎙 Call mic" };
    t.innerHTML = Object.keys(names).map(k => `<button class="btn sm" data-k="${k}">${names[k]}</button>`).join("");
    t.addEventListener("click", e => { const b = e.target.closest("button"); if (b) renderWiring(b.dataset.k); });
    renderWiring("power");
  }
  /* ------------------------------------------------------------ checkboxes */
  function initChecks() {
    if (!document.getElementById("resetChecks")) return;
    $$("ol.steps").forEach(ol => {
      $$(":scope > li", ol).forEach(li => {
        const id = li.dataset.id; if (!id) return;
        const lab = document.createElement("label"); lab.className = "chk";
        lab.innerHTML = `<input type="checkbox" aria-label="Mark step done"> done`;
        const cb = lab.querySelector("input"); cb.checked = !!checks[id];
        li.classList.toggle("done", cb.checked);
        cb.addEventListener("change", () => { checks[id] = cb.checked; li.classList.toggle("done", cb.checked); store.set(CHECK_KEY, checks); updateProgress(); });
        li.appendChild(lab);
      });
    });
    $("#resetChecks").onclick = () => { if (!confirm("Clear all saved checkboxes?")) return; checks = {}; store.set(CHECK_KEY, checks); $$("ol.steps input").forEach(c => { c.checked = false; c.closest("li").classList.remove("done"); }); updateProgress(); };
    updateProgress();
  }
  function updateProgress() {
    const all = $$("ol.steps > li[data-id]");
    const done = all.filter(li => checks[li.dataset.id]).length + STEPS.filter(s => checks["step-" + s.id]).length;
    const total = all.length + STEPS.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    $("#progTxt").textContent = pct + "%"; $("#progBar").style.width = pct + "%";
    $$("[data-prog]").forEach(sp => { const g = sp.dataset.prog; const items = $$(`ol.steps[data-group="${g}"] > li[data-id]`); const n = items.filter(li => checks[li.dataset.id]).length; sp.textContent = items.length ? `${n}/${items.length}` : ""; });
  }

  /* ------------------------------------------------------------ code copy */
  function initCode() {
    $$(".codeblock").forEach(cb => {
      const btn = cb.querySelector(".copy"); const pre = cb.querySelector("pre");
      btn && btn.addEventListener("click", async () => {
        const txt = pre.textContent; let ok = false;
        try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) {
          const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
          try { ok = document.execCommand("copy"); } catch (e2) { ok = false; } ta.remove();
        }
        btn.textContent = ok ? "✓ Copied" : "Select & copy"; setTimeout(() => btn.textContent = "⧉ Copy", 1600);
      });
      const exp = cb.querySelector(".expand");
      exp && exp.addEventListener("click", () => { cb.classList.toggle("collapsed"); exp.textContent = cb.classList.contains("collapsed") ? "⤢ Expand" : "⤡ Collapse"; });
    });
  }
  window.MG_DOCS = { BOM, GPIO, DIAGRAMS, buildSVG, COL };
  document.addEventListener("DOMContentLoaded", () => {
    renderBOM(); renderGPIO(); initWiringTabs(); initChecks(); initCode();
  });
})();
