/* Music Glasses flat-pack guide — UI controller (classic script; owns the build clock) */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const G = window.FLAT_GEO, FS = window.FLAT_STEPS, M = window.FLAT_MANUAL;
  const STEPS = FS.STEPS, TOTAL = FS.TOTAL;
  const qs = new URLSearchParams(location.search);
  const st = { t: 0, playing: qs.get("play") !== "0", view: qs.get("view") === "drawing" ? "drawing" : "room", step: -1, page: 1, manual: false, docs: false, speed: +(qs.get("speed") || 1), dragging: false };
  if (qs.get("step")) st.t = STEPS[Math.max(0, Math.min(STEPS.length - 1, +qs.get("step") - 1))].start + 0.01;
  if (qs.get("t")) st.t = Math.max(0, Math.min(TOTAL - 0.01, +qs.get("t")));
  const listeners = [];
  const stepAt = t => { for (let i = STEPS.length - 1; i >= 0; i--) if (t >= STEPS[i].start) return i; return 0; };
  const FLAT = window.FLAT = {
    GEO: G, STEPS, TOTAL, PIECES: FS.PIECES,
    get t() { return st.t; }, get playing() { return st.playing; }, get view() { return st.view; }, get step() { return st.step; },
    freeCam: false,
    seek(t) { st.t = Math.max(0, Math.min(TOTAL - 0.001, t)); tick(0, true); },
    goStep(i) { i = (i + STEPS.length) % STEPS.length; FLAT.seek(STEPS[i].start + 0.001); },
    play(on) { st.playing = on === undefined ? !st.playing : !!on; syncPlay(); },
    setView(v) { st.view = v; document.body.classList.toggle("drawing", v === "drawing"); document.body.classList.toggle("room", v !== "drawing"); $$("[data-view]").forEach(b => b.classList.toggle("on", b.dataset.view === v)); },
    onStep(cb) { listeners.push(cb); },
    stepAt
  };

  /* ---------------- timeline ---------------- */
  function buildTimeline() {
    const ticks = $("#ui-ticks"), marks = $("#ui-tickmarks");
    let h = "", m = "";
    for (let i = 0; i <= STEPS.length; i++) {
      const t = i === 0 ? 0 : STEPS[i - 1].end; const pct = t / TOTAL * 100;
      h += `<button style="left:${pct}%" data-i="${i}" aria-label="Jump to step ${Math.max(1, i)}">${i}</button>`;
      m += `<i style="left:${pct}%"></i>`;
    }
    ticks.innerHTML = h; marks.innerHTML = m;
    ticks.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const i = +b.dataset.i; FLAT.goStep(Math.max(0, i - 1)); });
    const track = $("#ui-track");
    const toT = e => { const r = track.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * TOTAL; };
    let wasPlaying = false;
    track.addEventListener("pointerdown", e => { st.dragging = true; wasPlaying = st.playing; st.playing = false; track.setPointerCapture(e.pointerId); FLAT.seek(toT(e)); syncPlay(); });
    track.addEventListener("pointermove", e => { if (st.dragging) FLAT.seek(toT(e)); });
    const end = () => { if (!st.dragging) return; st.dragging = false; st.playing = wasPlaying; syncPlay(); };
    track.addEventListener("pointerup", end); track.addEventListener("pointercancel", end);
    track.addEventListener("keydown", e => { if (e.key === "ArrowRight") FLAT.seek(st.t + 2); if (e.key === "ArrowLeft") FLAT.seek(st.t - 2); });
  }
  function syncPlay() {
    const b = $("#ui-play"); b.classList.toggle("on", st.playing);
    b.innerHTML = st.playing ? '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>';
    b.setAttribute("aria-label", st.playing ? "Pause" : "Play");
  }

  /* ---------------- step card / manual card ---------------- */
  function setStepUI(i) {
    const s = STEPS[i];
    $("#ui-cStep").textContent = s.n; $("#ui-cStepT").textContent = "/" + STEPS.length;
    $("#ui-stTitle").textContent = `STEP ${s.n} · ${s.title.toUpperCase()}`;
    $("#ui-stBody").innerHTML = s.card;
    $("#ui-pTitle").textContent = s.title; $("#ui-pSub").textContent = `step ${s.n} of ${STEPS.length} · page ${s.page}`;
    $("#ui-mPage").textContent = s.page;
    $("#ui-mImg").innerHTML = M.draw(i, { tag: "c" });
    $$("#ui-ticks button").forEach(b => b.classList.toggle("cur", +b.dataset.i === s.n));
    listeners.forEach(cb => { try { cb(i, s); } catch (e) { console.error(e); } });
    if (st.manual && $("#ui-follow").checked) showPage(s.page);
  }
  let lastHud = "";
  function tick(dt, force) {
    if (st.playing && !st.dragging && dt) { st.t += dt * st.speed; if (st.t >= TOTAL) st.t = 0; }
    const i = stepAt(st.t);
    if (i !== st.step || force) { const changed = i !== st.step; st.step = i; if (changed || force) setStepUI(i); }
    const pct = st.t / TOTAL * 100;
    $("#ui-fill").style.width = pct + "%"; $("#ui-knob").style.left = pct + "%";
    $("#ui-track").setAttribute("aria-valuenow", Math.round(st.t));
    // counters (3D module reports exact counts; fallback = step granular)
    let c = window.MG3D && window.MG3D.counts ? window.MG3D.counts(st.t) : null;
    if (!c) { let pc = 0; STEPS.forEach((s, k) => { if (k < i || (k === i && st.t > s.start + s.dur * 0.5)) pc += s.parts.length; }); c = { hw: 0, hwT: 0, pc, pcT: FS.PIECES, prog: "" }; }
    const hud = `${c.hw}|${c.hwT}|${c.pc}|${c.pcT}|${c.prog}`;
    if (hud !== lastHud) {
      lastHud = hud;
      $("#ui-cHw").textContent = c.hw; $("#ui-cHwT").textContent = "/" + c.hwT;
      $("#ui-cPc").textContent = c.pc; $("#ui-cPcT").textContent = "/" + c.pcT;
      $("#ui-stProg").innerHTML = c.prog ? c.prog : "";
    }
  }
  let last = performance.now();
  function loop(now) { const dt = Math.min(0.1, (now - last) / 1000); last = now; tick(dt); requestAnimationFrame(loop); }

  /* ---------------- manual viewer ---------------- */
  const APPX = [
    { title: "Parts list", key: "bom" }, { title: "GPIO map", key: "gpio" }, { title: "Docs & code", key: "docs" }
  ];
  const NPAGES = 1 + STEPS.length + APPX.length;
  function pageHTML(p) {
    if (p === 1) {
      return `<div class="pg-num">MUSIC</div><h2>Music Glasses Mark 1 — assembly manual</h2>
        <div class="pg-art">${M.draw(STEPS.length - 1, { w: 640, h: 380, tag: "cover" })}</div>
        <p>Your own tortoiseshell frames, normal-looking from the front · Adafruit QT Py ESP32 Pico · SPH0645 I²S call mic · 2× MAX98357A · 2× 15×11 mm micro-speakers · copper-tape touch inlays · 120 mAh LiPo · Bluetooth A2DP + HFP calls + BLE app with Find my glasses.</p>
        <ol class="pg-toc">${STEPS.map(s => `<li><a href="#" data-page="${s.page}">${s.n}. ${s.title}</a><span>p.${s.page}</span></li>`).join("")}
        ${APPX.map((a, k) => `<li><a href="#" data-page="${1 + STEPS.length + k + 1}">${a.title}</a><span>p.${1 + STEPS.length + k + 1}</span></li>`).join("")}</ol>`;
    }
    const si = p - 2;
    if (si >= 0 && si < STEPS.length) {
      const s = STEPS[si];
      const D = window.MG_DOCS;
      const wiring = s.diagram && D ? `<h3>Wiring</h3><div class="pg-wire">${D.buildSVG(s.diagram, { paper: true })}</div><p class="small">${D.DIAGRAMS[s.diagram].notes}</p>` : "";
      const solder = s.solder ? `<h3>Solder points <span class="cnt">${s.solder.length}x</span></h3><div class="chips">${s.solder.map(x => `<span>● ${x}</span>`).join("")}</div>` : "";
      return `<div class="pg-num">${s.n}</div><h2>${s.title}</h2>
        <div class="pg-art">${M.draw(si, { w: 640, h: 420, tag: "pg" })}</div>
        <p class="lead">${s.card}</p><ul>${s.details.map(d => `<li>${d}</li>`).join("")}</ul>${solder}${wiring}
        <p><button class="pg-play" data-step="${si}">▶ Play step ${s.n} in 3D</button></p>`;
    }
    const a = APPX[p - 2 - STEPS.length];
    const D = window.MG_DOCS;
    if (a.key === "bom" && D) return `<div class="pg-num">A</div><h2>Parts list</h2><p class="small">Prices from the Music Glasses spec + the Mark 1 mic (USD, before tax / shipping); items marked ~ are estimates.</p><table class="pg-table"><tr><th>Part</th><th>Qty</th><th>≈ Price</th><th>Link</th></tr>${D.BOM.map(b => `<tr><td><b>${b.part}</b><br><small>${b.purpose}</small></td><td>${b.qty}</td><td>${b.price}</td><td>${b.url ? `<a href="${b.url}" target="_blank" rel="noopener">${b.vendor}</a>` : b.vendor}${b.url2 ? ` · <a href="${b.url2}" target="_blank" rel="noopener">${b.vendor2 || "alt"}</a>` : ""}</td></tr>`).join("")}</table>`;
    if (a.key === "gpio" && D) return `<div class="pg-num">B</div><h2>GPIO map</h2><table class="pg-table"><tr><th>Pin</th><th>GPIO</th><th>Use</th><th>Connects to</th></tr>${D.GPIO.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[3]}</td><td>${r[4]}<br><small>${r[5]}</small></td></tr>`).join("")}</table>`;
    return `<div class="pg-num">C</div><h2>Docs &amp; code</h2><p>Everything from the spec — parts &amp; prices, the QT Py pin map, wiring diagrams, the cross-frame harness, touch tuning, the Bluetooth stack, phone calls (HFP) and the mic, the full Arduino firmware, the Flutter companion-app skeleton with its GATT table and Find my glasses — lives in the Docs drawer, with copy buttons on every file.</p>
      <div class="pg-links">${[["beginner", "New to this? Start here"], ["overview", "Overview & features"], ["frames", "Frames & pods"], ["parts", "Parts & prices"], ["gpio", "QT Py pin map"], ["wiring", "Wiring diagrams"], ["harness", "Cross-frame harness"], ["touch", "Touch inlays & gestures"], ["audio", "Audio & Bluetooth stack"], ["calls", "Phone calls & mic"], ["power", "Battery & charging"], ["firmware", "Firmware (Arduino)"], ["app", "Companion app (Flutter)"], ["gatt", "GATT table"], ["find", "Find my glasses"], ["order", "Build order"], ["risks", "Risks & caveats"], ["sources", "Sources"]].map(([id, t]) => `<button data-doc="${id}">${t} →</button>`).join("")}</div>`;
  }
  function showPage(p) {
    st.page = Math.max(1, Math.min(NPAGES, p));
    $("#ui-mvPage").innerHTML = pageHTML(st.page);
    $("#ui-mvNum").textContent = `${st.page} / ${NPAGES}`;
    $("#ui-mvPage").scrollTop = 0;
  }
  function openManual(on) {
    st.manual = on === undefined ? !st.manual : on;
    document.body.classList.toggle("manual-open", st.manual);
    if (st.manual) showPage(STEPS[Math.max(0, st.step)].page);
  }
  function openDocs(on, id) {
    st.docs = on === undefined ? !st.docs : on;
    document.body.classList.toggle("docs-open", st.docs);
    $$("[data-piece]").forEach(b => b.classList.toggle("on", (b.dataset.piece === "docs") === st.docs));
    if (st.docs && id) { const el = document.getElementById(id); if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }
  }

  function initUI() {
    buildTimeline(); syncPlay(); FLAT.setView(st.view);
    $("#ui-play").onclick = () => FLAT.play();
    $("#ui-prev").onclick = () => FLAT.goStep(st.step - 1);
    $("#ui-next").onclick = () => FLAT.goStep(st.step + 1);
    $$("[data-view]").forEach(b => b.onclick = () => FLAT.setView(b.dataset.view));
    $$("[data-piece]").forEach(b => b.onclick = () => openDocs(b.dataset.piece === "docs"));
    $("#ui-openManual").onclick = () => openManual(true);
    $("#ui-mImg").onclick = () => openManual(true);
    $("#ui-iManual").onclick = () => openManual();
    $("#ui-mvClose").onclick = () => openManual(false);
    $("#ui-mvPrev").onclick = () => showPage(st.page - 1);
    $("#ui-mvNext").onclick = () => showPage(st.page + 1);
    $("#ui-mvPage").addEventListener("click", e => {
      const a = e.target.closest("[data-page]"); if (a) { e.preventDefault(); showPage(+a.dataset.page); return; }
      const pl = e.target.closest("[data-step]"); if (pl) { FLAT.goStep(+pl.dataset.step); FLAT.play(true); return; }
      const d = e.target.closest("[data-doc]"); if (d) openDocs(true, d.dataset.doc);
    });
    $("#ui-docsClose").onclick = () => openDocs(false);
    $("#ui-cornerDocs").onclick = () => openDocs(true);
    $("#ui-newbie").onclick = () => openDocs(true, "beginner");
    $("#docs").addEventListener("click", e => { const a = e.target.closest("a[href^='#']"); if (!a) return; const el = document.getElementById(a.getAttribute("href").slice(1)); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); } });
    $("#ui-docsNav").addEventListener("click", e => { const a = e.target.closest("a[href^='#']"); if (!a) return; e.preventDefault(); const el = document.getElementById(a.getAttribute("href").slice(1)); el && el.scrollIntoView({ behavior: "smooth", block: "start" }); });
    $("#ui-iFit").onclick = () => { FLAT.freeCam = false; document.body.classList.remove("freecam"); };
    $("#ui-iCam").onclick = () => { FLAT.freeCam = !FLAT.freeCam; document.body.classList.toggle("freecam", FLAT.freeCam); };
    $("#ui-iHelp").onclick = () => $("#ui-help").classList.toggle("show");
    $("#ui-helpClose").onclick = () => $("#ui-help").classList.remove("show");
    $("#ui-toggleLeft").onclick = () => document.body.classList.toggle("left-collapsed");
    document.addEventListener("keydown", e => {
      const tg = e.target; if (tg && tg.closest && tg.closest("input,textarea,select,[contenteditable],#ui-music")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "ArrowRight" || k === "]") { FLAT.goStep(st.step + 1); e.preventDefault(); }
      else if (k === "ArrowLeft" || k === "[") { FLAT.goStep(st.step - 1); e.preventDefault(); }
      else if (k === " ") { FLAT.play(); e.preventDefault(); }
      else if (/^[0-9]$/.test(k)) { const n = +k; FLAT.goStep(n === 0 ? 9 : n - 1); }
      else if (k === "V" && e.shiftKey) FLAT.setView(st.view === "room" ? "drawing" : "room");
      else if (k === "K" && e.shiftKey) openDocs();
      else if (k === "m" || k === "M") openManual();
      else if (k === "Escape") { openManual(false); openDocs(false); $("#ui-help").classList.remove("show"); }
      else if (st.manual && (k === "PageDown")) showPage(st.page + 1);
      else if (st.manual && (k === "PageUp")) showPage(st.page - 1);
    });
    if (qs.get("manual") === "1") openManual(true);
    if (qs.get("docs")) openDocs(true, qs.get("docs"));
    tick(0, true);
    requestAnimationFrame(loop);
    document.body.dataset.ui = "ready";
  }
  document.addEventListener("DOMContentLoaded", initUI);
})();
