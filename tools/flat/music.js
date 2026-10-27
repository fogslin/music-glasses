/* Music Glasses guide — "Now playing while you build": official Spotify artist embeds (no audio is bundled).
   Artist IDs verified 2026-10-24 against open.spotify.com/artist/<id> page titles. The iframe loads only when the panel is opened. */
(function () {
  "use strict";
  const ARTISTS = [
    { name: "Tate McRae", id: "45dkTj5sMRSjrmBSBeiHym" },
    { name: "Sam Barber", id: "08GfvCW09pv2QP4y9sle2a" },
    { name: "Noah Kahan", id: "2RQXRUsr4IW1f3mKyKsy4B" },
    { name: "Maroon 5", id: "04gDigrS5kc9YWfZHwBETP" }
  ];
  const $ = s => document.querySelector(s);
  let cur = 0, open = false;
  function load(i) {
    cur = i; const a = ARTISTS[i];
    const box = $("#ui-musFrame"); if (!box) return;
    box.innerHTML = `<iframe title="Spotify: ${a.name}" src="https://open.spotify.com/embed/artist/${a.id}?utm_source=generator&theme=0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    document.querySelectorAll("#ui-musTabs button").forEach((b, k) => { b.classList.toggle("on", k === i); b.setAttribute("aria-selected", k === i ? "true" : "false"); });
    $("#ui-musOpen").href = `https://open.spotify.com/artist/${a.id}`;
    $("#ui-musPillTxt").textContent = open ? "Hide music" : `Music · ${a.name}`;
  }
  function setOpen(on) {
    open = on;
    $("#ui-music").classList.toggle("open", on);
    $("#ui-musPill").setAttribute("aria-expanded", on ? "true" : "false");
    if (on && !$("#ui-musFrame iframe")) load(cur);       // lazy: no Spotify request until first open
    $("#ui-musPillTxt").textContent = on ? "Hide music" : ($("#ui-musFrame iframe") ? `Music · ${ARTISTS[cur].name}` : "Music while you build");
  }
  function syncNarrow() {                                  // on phones keep the pill above the bottom timeline panel
    const pr = document.querySelector(".pr"); if (pr) document.documentElement.style.setProperty("--prh", pr.offsetHeight + 8 + "px");
  }
  document.addEventListener("DOMContentLoaded", () => {
    const tabs = $("#ui-musTabs"); if (!tabs) return;
    tabs.innerHTML = ARTISTS.map((a, i) => `<button role="tab" aria-selected="false" data-i="${i}">${a.name}</button>`).join("");
    tabs.addEventListener("click", e => { const b = e.target.closest("button"); if (b) load(+b.dataset.i); });
    $("#ui-musPill").addEventListener("click", () => setOpen(!open));
    $("#ui-musClose").addEventListener("click", () => setOpen(false));
    syncNarrow(); window.addEventListener("resize", syncNarrow);
    const q = new URLSearchParams(location.search);
    if (q.get("music") === "1") setOpen(true);
  });
  window.MG_MUSIC = { ARTISTS, open: () => setOpen(true), close: () => setOpen(false), select: load };
})();
