import * as THREE from "three";

/* ============================================================
   PERSISTENT PARTICLE MESH
   A single particle system that morphs shape as the user scrolls:
   chaos cloud -> sphere -> grid -> helix -> burst/dissolve
   This is the site's signature element, not decoration.
   ============================================================ */

const canvas = document.getElementById("webgl");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 8;

/* ---------- particle count scales with device ---------- */
const isMobile = window.innerWidth < 760;
const COUNT = isMobile ? 1400 : 3600;

/* ---------- shape generators ---------- */
function shapeChaos(i, arr) {
  arr[i * 3] = (Math.random() - 0.5) * 14;
  arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
  arr[i * 3 + 2] = (Math.random() - 0.5) * 14;
}

function shapeSphere(i, arr) {
  const phi = Math.acos(-1 + (2 * i) / COUNT);
  const theta = Math.sqrt(COUNT * Math.PI) * phi;
  const r = 3.4;
  arr[i * 3] = r * Math.cos(theta) * Math.sin(phi);
  arr[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
  arr[i * 3 + 2] = r * Math.cos(phi);
}

function shapeGrid(i, arr) {
  const side = Math.ceil(Math.cbrt(COUNT));
  const spacing = 0.85;
  const x = i % side;
  const y = Math.floor(i / side) % side;
  const z = Math.floor(i / (side * side));
  arr[i * 3] = (x - side / 2) * spacing;
  arr[i * 3 + 1] = (y - side / 2) * spacing;
  arr[i * 3 + 2] = (z - side / 2) * spacing;
}

function shapeHelix(i, arr) {
  const t = i / COUNT;
  const turns = 8;
  const angle = t * Math.PI * 2 * turns;
  const r = 2.6 + Math.sin(t * Math.PI * 2 * 3) * 0.4;
  arr[i * 3] = Math.cos(angle) * r;
  arr[i * 3 + 1] = (t - 0.5) * 12;
  arr[i * 3 + 2] = Math.sin(angle) * r;
}

function shapeBurst(i, arr) {
  const phi = Math.acos(-1 + (2 * i) / COUNT);
  const theta = Math.sqrt(COUNT * Math.PI) * phi;
  const r = 6.5 + Math.random() * 3;
  arr[i * 3] = r * Math.cos(theta) * Math.sin(phi);
  arr[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
  arr[i * 3 + 2] = r * Math.cos(phi);
}

const generators = [shapeChaos, shapeSphere, shapeGrid, shapeHelix, shapeBurst];

/* ---------- build position sets for each shape ---------- */
const positionSets = generators.map((gen) => {
  const arr = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) gen(i, arr);
  return arr;
});

/* ---------- geometry / material ---------- */
const geometry = new THREE.BufferGeometry();
const current = new Float32Array(positionSets[0]);
geometry.setAttribute("position", new THREE.BufferAttribute(current, 3));

const colorA = new THREE.Color(0x6c5dd3);
const colorB = new THREE.Color(0xff6b4a);
const colors = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  const mix = Math.random();
  const c = colorA.clone().lerp(colorB, mix < 0.85 ? 0 : Math.random());
  colors[i * 3] = c.r;
  colors[i * 3 + 1] = c.g;
  colors[i * 3 + 2] = c.b;
}
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
  size: isMobile ? 0.045 : 0.055,
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const points = new THREE.Points(geometry, material);
scene.add(points);

/* ---------- ambient depth: a soft wireframe icosahedron behind the cloud ---------- */
const ico = new THREE.Mesh(
  new THREE.IcosahedronGeometry(4.6, 1),
  new THREE.MeshBasicMaterial({
    color: 0x6c5dd3,
    wireframe: true,
    transparent: true,
    opacity: 0.05,
  })
);
scene.add(ico);

/* ============================================================
   SCROLL-DRIVEN MORPH TARGET
   Sections map to shape indices. We lerp between the two
   nearest shapes based on scroll progress.
   ============================================================ */
const shapeOrder = [0, 1, 2, 3, 4]; // chaos, sphere, grid, helix, burst
let scrollProgress = 0; // 0..1 across whole page

function getScrollProgress() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  return max > 0 ? window.scrollY / max : 0;
}

/* mouse parallax */
const mouse = { x: 0, y: 0 };
window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

/* touch parallax (light) */
window.addEventListener(
  "touchmove",
  (e) => {
    const t = e.touches[0];
    if (!t) return;
    mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (t.clientY / window.innerHeight) * 2 - 1;
  },
  { passive: true }
);

const tmpArr = new Float32Array(COUNT * 3);

function updateMorph(progress) {
  const segments = shapeOrder.length - 1;
  const scaled = progress * segments;
  const idx = Math.min(Math.floor(scaled), segments - 1);
  const localT = scaled - idx;

  const from = positionSets[shapeOrder[idx]];
  const to = positionSets[shapeOrder[idx + 1]];

  // ease
  const t = localT * localT * (3 - 2 * localT);

  for (let i = 0; i < COUNT * 3; i++) {
    tmpArr[i] = from[i] + (to[i] - from[i]) * t;
  }
  geometry.attributes.position.array.set(tmpArr);
  geometry.attributes.position.needsUpdate = true;
}

/* ============================================================
   RENDER LOOP
   ============================================================ */
const clock = new THREE.Clock();
let targetRotY = 0;
let currentRotY = 0;

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  scrollProgress = getScrollProgress();
  updateMorph(scrollProgress);

  // gentle continuous rotation + mouse-reactive tilt
  targetRotY = elapsed * 0.05 + mouse.x * 0.4;
  currentRotY += (targetRotY - currentRotY) * 0.04;
  points.rotation.y = currentRotY;
  points.rotation.x += (mouse.y * 0.2 - points.rotation.x) * 0.03;

  ico.rotation.y = -currentRotY * 0.6;
  ico.rotation.x = points.rotation.x * 0.6;

  // camera drift
  camera.position.x += (mouse.x * 0.6 - camera.position.x) * 0.03;
  camera.position.y += (-mouse.y * 0.4 - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);

  // subtle breathing scale on the point cloud
  const breathe = 1 + Math.sin(elapsed * 0.6) * 0.015;
  points.scale.setScalar(breathe);

  renderer.render(scene, camera);
}

if (reduceMotion) {
  // static render, no animation loop, no rotation
  updateMorph(0);
  renderer.render(scene, camera);
  window.addEventListener("scroll", () => {
    updateMorph(getScrollProgress());
    renderer.render(scene, camera);
  });
} else {
  animate();
}

/* ============================================================
   RESIZE
   ============================================================ */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ============================================================
   EASTER EGG: click the void 5 times fast -> burst + color shift
   ============================================================ */
let clickCount = 0;
let clickTimer = null;
window.addEventListener("click", (e) => {
  // ignore clicks on interactive elements
  if (e.target.closest("a, button")) return;
  clickCount++;
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => (clickCount = 0), 700);
  if (clickCount >= 5) {
    clickCount = 0;
    triggerBurst();
  }
});

function triggerBurst() {
  const original = new Float32Array(geometry.attributes.position.array);
  let t = 0;
  function pulse() {
    t += 0.05;
    const s = 1 + Math.sin(t * Math.PI) * 0.8;
    points.scale.setScalar(s);
    material.size = (isMobile ? 0.045 : 0.055) * (1 + Math.sin(t * Math.PI) * 2);
    if (t < 1) requestAnimationFrame(pulse);
    else {
      points.scale.setScalar(1);
      material.size = isMobile ? 0.045 : 0.055;
    }
  }
  pulse();
}

export { getScrollProgress };
