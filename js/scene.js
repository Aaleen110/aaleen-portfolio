// scene.js
// Lightweight Three.js "system topology" node fields used behind the hero
// name and the skills section. Built once, reused via createNodeField().
//
// Design intent: Aaleen's day job is routing things — RAG queries across
// vector search vs. structured DB lookups, event pipelines through
// Cloudflare Queues. The hero canvas visualises that literally: nodes,
// edges, and small pulses travelling along them like requests in flight.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hexToRgb(hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

/**
 * Creates an animated node-field scene inside a <canvas>.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} opts
 * @param {number} opts.nodeCount
 * @param {string[]} opts.palette - hex colors for nodes
 * @param {number} opts.pulseCount - traveling pulses along edges (0 to disable)
 * @param {number} opts.neighborLinks - edges per node
 * @param {number} opts.spread - radius of the node cloud
 * @param {number} opts.rotationSpeed
 * @param {boolean} opts.parallax - whether camera reacts to mouse
 */
export function createNodeField(canvas, opts = {}) {
  if (REDUCED_MOTION || !canvas) return null;

  const {
    nodeCount = 46,
    palette = ['#6FA8C9', '#E8601C', '#4FD1C5'],
    pulseCount = 8,
    neighborLinks = 2,
    spread = 5.2,
    rotationSpeed = 0.03,
    parallax = true,
  } = opts;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch (e) {
    return null; // no WebGL — page still works fine without this layer
  }

  const container = canvas.parentElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 8;

  const group = new THREE.Group();
  scene.add(group);

  // ---- Nodes ----
  const positions = new Float32Array(nodeCount * 3);
  const colors = new Float32Array(nodeCount * 3);
  const nodePos = [];

  for (let i = 0; i < nodeCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const r = spread * (0.35 + Math.random() * 0.65);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    const z = r * Math.cos(phi) * 0.6;
    positions.set([x, y, z], i * 3);
    nodePos.push(new THREE.Vector3(x, y, z));

    const col = palette[Math.floor(Math.random() * palette.length)];
    colors.set(hexToRgb(col), i * 3);
  }

  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  nodeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const nodeMat = new THREE.PointsMaterial({
    size: 0.09,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });
  const nodePoints = new THREE.Points(nodeGeo, nodeMat);
  group.add(nodePoints);

  // ---- Edges (connect each node to its nearest neighbours) ----
  const edges = [];
  for (let i = 0; i < nodeCount; i++) {
    const dists = [];
    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      dists.push([j, nodePos[i].distanceTo(nodePos[j])]);
    }
    dists.sort((a, b) => a[1] - b[1]);
    for (let k = 0; k < neighborLinks; k++) {
      if (dists[k]) edges.push([i, dists[k][0]]);
    }
  }

  const linePositions = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], idx) => {
    linePositions.set([nodePos[a].x, nodePos[a].y, nodePos[a].z], idx * 6);
    linePositions.set([nodePos[b].x, nodePos[b].y, nodePos[b].z], idx * 6 + 3);
  });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x6fa8c9, transparent: true, opacity: 0.14 });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  group.add(lines);

  // ---- Traveling pulses along random edges ----
  let pulseMesh = null;
  let pulseState = [];
  if (pulseCount > 0 && edges.length > 0) {
    const pulsePositions = new Float32Array(pulseCount * 3);
    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
    const pulseMat = new THREE.PointsMaterial({
      size: 0.16,
      color: 0xe8601c,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
    });
    pulseMesh = new THREE.Points(pulseGeo, pulseMat);
    group.add(pulseMesh);

    pulseState = Array.from({ length: pulseCount }, () => ({
      edge: edges[Math.floor(Math.random() * edges.length)],
      t: Math.random(),
      speed: 0.15 + Math.random() * 0.25,
    }));
  }

  // ---- Sizing ----
  function resize() {
    const { clientWidth, clientHeight } = container;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // ---- Mouse parallax ----
  const mouse = { x: 0, y: 0 };
  const targetCam = { x: 0, y: 0 };
  function onPointerMove(e) {
    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  }
  if (parallax) window.addEventListener('pointermove', onPointerMove, { passive: true });

  // ---- Visibility gating (pause when offscreen / tab hidden) ----
  let visible = true;
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.05 });
  io.observe(container);

  // ---- Animate ----
  let running = true;
  let last = performance.now();
  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (visible && !document.hidden) {
      group.rotation.y += dt * rotationSpeed;
      group.rotation.x = Math.sin(now * 0.00007) * 0.06;

      if (parallax) {
        targetCam.x += (mouse.x * 0.6 - targetCam.x) * 0.03;
        targetCam.y += (-mouse.y * 0.4 - targetCam.y) * 0.03;
        camera.position.x = targetCam.x;
        camera.position.y = targetCam.y;
        camera.lookAt(0, 0, 0);
      }

      if (pulseMesh) {
        const arr = pulseMesh.geometry.attributes.position.array;
        pulseState.forEach((p, i) => {
          p.t += dt * p.speed;
          if (p.t > 1) { p.t = 0; p.edge = edges[Math.floor(Math.random() * edges.length)]; }
          const a = nodePos[p.edge[0]], b = nodePos[p.edge[1]];
          arr[i * 3] = a.x + (b.x - a.x) * p.t;
          arr[i * 3 + 1] = a.y + (b.y - a.y) * p.t;
          arr[i * 3 + 2] = a.z + (b.z - a.z) * p.t;
        });
        pulseMesh.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    destroy() {
      running = false;
      resizeObserver.disconnect();
      io.disconnect();
      if (parallax) window.removeEventListener('pointermove', onPointerMove);
      nodeGeo.dispose(); nodeMat.dispose();
      lineGeo.dispose(); lineMat.dispose();
      if (pulseMesh) { pulseMesh.geometry.dispose(); pulseMesh.material.dispose(); }
      renderer.dispose();
    },
  };
}
