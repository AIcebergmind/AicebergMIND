<canvas id="klein-canvas"></canvas>
<script>
(function () {
  const { Scene, PerspectiveCamera, WebGLRenderer, Color, Vector3,
          BufferGeometry, LineSegments, LineBasicMaterial, AdditiveBlending } = THREE;

  // --- Parametrizzazione Klein (u∈[0,2π], v∈[0,2π]) ---
  function klein(u, v) {
    // formula adattata dalla demo three.js
    // scala ridotta per stare nella camera
    const a = 2; 
    const cu = Math.cos(u), su = Math.sin(u);
    const cv = Math.cos(v), sv = Math.sin(v);

    let x, y, z;
    if (u < Math.PI) {
      x = 3 * cu * (1 + su) + a * (1 - cu / 2) * cu * cv;
      z = -8 * su - a * (1 - cu / 2) * su * cv;
    } else {
      x = 3 * cu * (1 + su) + a * (1 - cu / 2) * cv;
      z = -8 * su;
    }
    y = -a * (1 - cu / 2) * sv;
    return new Vector3(x, y, z).multiplyScalar(0.08);
  }

  // --- Genera griglia e linee ---
  function makeKleinWire(rows = 80, cols = 160) {
    const pts = [];
    // linee lungo u
    for (let i = 0; i <= rows; i++) {
      const u = (i / rows) * Math.PI * 2;
      for (let j = 0; j < cols; j++) {
        const v1 = (j / cols) * Math.PI * 2;
        const v2 = ((j + 1) / cols) * Math.PI * 2;
        pts.push(klein(u, v1), klein(u, v2));
      }
    }
    // linee lungo v
    for (let j = 0; j <= cols; j++) {
      const v = (j / cols) * Math.PI * 2;
      for (let i = 0; i < rows; i++) {
        const u1 = (i / rows) * Math.PI * 2;
        const u2 = ((i + 1) / rows) * Math.PI * 2;
        pts.push(klein(u1, v), klein(u2, v));
      }
    }
    const geo = new BufferGeometry().setFromPoints(pts);
    return geo;
  }

  const canvas = document.getElementById('klein-canvas');
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 4);

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new Color(0x000000), 1);

  const material = new LineBasicMaterial({
    color: 0x00d4ff,      // brand-cyan
    transparent: true,
    opacity: 0.9,
    blending: AdditiveBlending
  });

  const wire = new LineSegments(makeKleinWire(), material);
  scene.add(wire);

  // alone “glow” semplice via duplicato più spesso e opaco
  const glow = new LineSegments(wire.geometry.clone(), new LineBasicMaterial({
    color: 0x5ee4c3,      // brand-mint
    transparent: true,
    opacity: 0.12
  }));
  glow.scale.set(1.02, 1.02, 1.02);
  scene.add(glow);

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  // animazione
  let t = 0;
  (function animate(){
    t += 0.005;
    wire.rotation.set(0.15 + t*0.2, t*0.35, 0);
    glow.rotation.copy(wire.rotation);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  })();
})();
</script>