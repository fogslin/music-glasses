/* Music Glasses v1 flat-pack guide — 3D (ES module). Procedural geometry only (incl. the tortoiseshell texture); no external models or textures. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const FLAT = window.FLAT, G = FLAT.GEO, STEPS = FLAT.STEPS, TOTAL = FLAT.TOTAL;
const SI = Object.fromEntries(STEPS.map((s, i) => [s.id, i]));
const S0 = id => STEPS[SI[id]].start;
const V = (a, b, c) => Array.isArray(a) ? new THREE.Vector3(a[0], a[1], a[2]) : new THREE.Vector3(a, b, c);
const clamp01 = x => Math.max(0, Math.min(1, x));
const easeIO = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;   // power3.inOut
const easeIO2 = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;      // power2.inOut
const easeOut = u => 1 - Math.pow(1 - u, 3);
const win = (t, a, b) => clamp01((t - a) / (b - a));
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

const canvas = document.getElementById("scene");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
  if (!renderer.capabilities.isWebGL2) throw new Error("WebGL2 required");
} catch (e) {
  const n = document.getElementById("ui-noGL"); n.hidden = false;
  n.textContent = "This browser couldn't start WebGL 2, so the 3D room can't play. The manual, timeline and Docs & code still work.";
  document.getElementById("ui-loading").remove();
  throw e;
}
const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
renderer.setPixelRatio(DPR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.03, 90);
camera.position.set(5.6, 3.6, 6.4);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.target.set(0, 0.3, -0.3);
controls.minDistance = 0.4; controls.maxDistance = 14; controls.maxPolarAngle = Math.PI * 0.49;
controls.addEventListener("start", () => { if (!FLAT.freeCam) { FLAT.freeCam = true; document.body.classList.add("freecam"); } });

const NO_OUTLINE = [];
const noOL = obj => { obj.traverse(o => { if (o.isMesh || o.isLine || o.isPoints || o.isSprite) NO_OUTLINE.push(o); }); return obj; };
const matCache = new Map();
function M(color, o = {}) {
  const uniq = !!o.unique; const oo = Object.assign({}, o); delete oo.unique;
  const key = color + JSON.stringify(oo);
  if (!uniq && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshLambertMaterial(Object.assign({ color }, oo));
  if (!uniq) matCache.set(key, m);
  return m;
}
function mesh(geo, mat, shadow = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; }
function box(w, h, d, mat, r) { return mesh(r ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2) * 0.999) : new THREE.BoxGeometry(w, h, d), mat); }
function cyl(rt, rb, h, mat, seg = 24) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); }
function at(o, x, y, z, rx = 0, ry = 0, rz = 0) { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; }
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.canvas = c; t.userData.ctx = g; return t;
}
const glowTex = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
function glow(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1); noOL(s); return s;
}
function roundRectShape(w, h, r) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function textPlane(text, w, h, opt = {}) {
  const pxW = opt.px || 512, pxH = Math.round(pxW * h / w);
  const t = canvasTex(pxW, pxH, (g, W, H) => { if (opt.bg) { g.fillStyle = opt.bg; g.fillRect(0, 0, W, H); } g.fillStyle = opt.color || "#111"; g.font = `${opt.weight || 800} ${Math.round(H * (opt.size || 0.6))}px Outfit, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, W / 2, H / 2 + 2); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: opt.opacity ?? 1 }));
  return noOL(m);
}

/* point-sprite shader for sparks + smoke (per-point alpha and size) */
function makePoints(n, color, additive) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute("alpha", new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute("size", new THREE.BufferAttribute(new Float32Array(n), 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uScale: { value: innerHeight * DPR * 0.5 }, uMap: { value: glowTex } },
    vertexShader: `attribute float alpha; attribute float size; varying float vA; uniform float uScale;
      void main(){ vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform sampler2D uMap; varying float vA;
      void main(){ float a = texture2D(uMap, gl_PointCoord).a * vA; if (a < 0.01) discard; gl_FragColor = vec4(uColor, a); }`,
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
  });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; noOL(p); p.userData.n = n; return p;
}
