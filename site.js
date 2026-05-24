const canvas = document.getElementById("singularity-webgl");
const pointer = { x: 0, y: 0 };

window.addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

function makeSPath(count = 130) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const t = (i / (count - 1)) * Math.PI * 2.35;
    const radius = 1.28 - i / count * 0.28;
    const x = Math.sin(t) * radius * 0.68;
    const y = Math.cos(t * 0.62) * 1.05;
    const z = Math.cos(t) * 0.24;
    points.push({ x, y, z });
  }
  return points;
}

function initCanvasFallback() {
  const ctx = canvas.getContext("2d");
  canvas.dataset.engine = "canvas-fallback";
  let width = 0;
  let height = 0;
  const path = makeSPath(160);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(3, 7, 19, 0.88)";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width * 0.73 + pointer.x * 28, height * 0.46 - pointer.y * 22);
    ctx.scale(Math.min(width, height) * 0.18, Math.min(width, height) * 0.18);
    ctx.rotate(pointer.x * 0.12 + Math.sin(time * 0.0004) * 0.06);
    ctx.lineWidth = 0.018;
    ctx.strokeStyle = "rgba(86, 226, 255, 0.88)";
    ctx.shadowColor = "rgba(29, 102, 255, 0.95)";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    path.forEach((p, index) => {
      const px = p.x + Math.sin(time * 0.001 + index * 0.08) * 0.018;
      const py = p.y + p.z * 0.2;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    canvas.dataset.rendered = "true";
    canvas.dataset.nonemptyPixels = "fallback";
    ctx.restore();
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
}

function initThree(THREE) {
  canvas.dataset.engine = "three.js r160";
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const group = new THREE.Group();
  group.position.set(1.75, 0.05, 0);
  scene.add(group);

  const material = new THREE.LineBasicMaterial({
    color: 0x56e2ff,
    transparent: true,
    opacity: 0.92
  });

  const glowMaterial = new THREE.LineBasicMaterial({
    color: 0x1d66ff,
    transparent: true,
    opacity: 0.32
  });

  const sPoints = makeSPath(170).map((p) => new THREE.Vector3(p.x, p.y, p.z));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(sPoints), material);
  const glow = new THREE.Line(new THREE.BufferGeometry().setFromPoints(sPoints.map((p) => p.clone().multiplyScalar(1.035))), glowMaterial);
  line.scale.setScalar(1.25);
  glow.scale.setScalar(1.45);
  group.add(glow, line);

  const ringMaterial = new THREE.LineBasicMaterial({ color: 0x8a7cff, transparent: true, opacity: 0.22 });
  for (let i = 0; i < 4; i += 1) {
    const curve = new THREE.EllipseCurve(0, 0, 1.6 + i * 0.26, 1.6 + i * 0.26, 0, Math.PI * 2);
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(180).map((p) => new THREE.Vector3(p.x, p.y, -0.22 - i * 0.06))), ringMaterial);
    ring.rotation.x = 0.85 + i * 0.08;
    ring.rotation.y = 0.18 + i * 0.1;
    group.add(ring);
  }

  const particleCount = 520;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 13;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 2] = -Math.random() * 5;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({ color: 0x7bc7ff, size: 0.014, transparent: true, opacity: 0.58 })
  );
  scene.add(particles);

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", resize);

  function animate(time) {
    const t = time * 0.001;
    group.rotation.x += ((pointer.y * 0.22) - group.rotation.x) * 0.035;
    group.rotation.y += ((pointer.x * 0.34) - group.rotation.y) * 0.035;
    group.rotation.z = Math.sin(t * 0.42) * 0.045;
    particles.rotation.y = t * 0.025;
    particles.rotation.x = pointer.y * 0.035;
    renderer.render(scene, camera);
    if (!canvas.dataset.rendered) {
      const gl = renderer.getContext();
      const sample = new Uint8Array(4 * 16 * 16);
      const x = Math.max(0, Math.floor(canvas.width * 0.66));
      const y = Math.max(0, Math.floor(canvas.height * 0.44));
      gl.readPixels(x, y, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, sample);
      let lit = 0;
      for (let i = 0; i < sample.length; i += 4) {
        if (sample[i] || sample[i + 1] || sample[i + 2] || sample[i + 3]) lit += 1;
      }
      canvas.dataset.rendered = "true";
      canvas.dataset.nonemptyPixels = String(lit);
    }
    requestAnimationFrame(animate);
  }

  animate(0);
}

try {
  const THREE = await import("https://unpkg.com/three@0.160.0/build/three.module.js");
  initThree(THREE);
} catch {
  initCanvasFallback();
}
