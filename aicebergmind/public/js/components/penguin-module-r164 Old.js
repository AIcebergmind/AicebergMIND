/* === PENGUIN MODULE - Three.js 3D Penguin (r164+ compatible) ===
 * - RIMOSSA ogni logica di auto-caricamento di Three.js (usa window.THREE già caricato)
 * - Aggiunto supporto color space r152+ (renderer.outputColorSpace = THREE.SRGBColorSpace)
 * - Fix cleanup eventi + touch
 * - Nessuna dipendenza ESM: esporta in window.PenguinModule
 */

(function () {
  class PenguinModule {
    constructor(config = {}) {
      this.config = {
        containerId: 'penguin-container',
        modelPath: null, // programmatic penguin
        enableAnimation: true,
        enableInteraction: true,
        autoRotate: true,
        enableMobile: false,

        // === NEW: rendering styles ===
        style: 'solid',                     // 'solid' | 'wireframe' | 'dashed' | 'neon'
        wireframeAccent: 0x3ac8f5,          // cyan
        wireframeAccentAlt: 0x5ee4c3,       // mint (per neon/parti alternate)
        edgesThreshold: 28,                 // soglia angoli per EdgesGeometry

        // dashed options
        dash: { size: 0.6, gap: 0.35, speed: 0.002, scale: 1 },

        // neon options (glow finto)
        neon: {
          haloScales: [1.025, 1.012],     // due gusci leggermente più grandi
          haloOpacities: [0.08, 0.15],    // opacità base dei gusci
          pulseSpeed: 0.02,               // velocità del "respiro"
          base: 0.75,                     // opacità base del core line
          amp: 0.22                       // ampiezza del pulse
        },

        ...config
      };

      // Three.js core
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.penguin = null;
      this.mixer = null;

      // Animation
      this.clock = null;
      this.isAnimating = false;
      this.animationId = null;

      // Interaction
      this.mouse = { x: 0, y: 0 };
      this.raycaster = null;
      this.isMouseDown = false;
      this.previousMousePosition = { x: 0, y: 0 };

      // Performance
      this.lastFrameTime = 0;
      this.frameSkip = 0;
      this.maxFPS = 60;

      // Event handlers (per cleanup accurato)
      this.eventHandlers = {
        resize: null,
        mouseMove: null,
        mouseDown: null,
        mouseUp: null,
        click: null,
        touchStart: null,
        touchEnd: null,
        touchMove: null
      };

      // Wireframe containers
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];
      this.neonPulse = { t: 0 };

      this.init();
    }

    // === Init (senza auto-loader) ===
    init() {
      if (typeof window === 'undefined' || typeof window.THREE === 'undefined') {
        console.error('🐧 PenguinModule: Three.js non è caricato. Caricalo PRIMA del modulo.');
        return;
      }
      // Abilita color management moderno (r152+)
      if (window.THREE.ColorManagement) {
        window.THREE.ColorManagement.enabled = true;
      }
      this.initPenguin();
    }

    initPenguin() {
      // Mobile off?
      if (this.isMobileDevice() && !this.config.enableMobile) {
        console.log('🐧 PenguinModule: disabilitato su mobile per performance');
        this.createContainer(); // serve per mostrare il fallback dentro al container
        this.showFallback();
        return;
      }

      this.createContainer();
      if (!this.container) return;

      this.setupScene();
      this.createPenguin();
      
      // Apply rendering style after penguin creation (includes lighting)
      this.applyRenderingStyle(this.config.style);
      
      this.setupCamera();
      this.setupRenderer();
      this.bindEvents();
      this.startAnimation();

      console.log('🐧 PenguinModule initialized (Three r' + (window.THREE?.REVISION || '?') + ')');
    }

    createContainer() {
      this.container = document.getElementById(this.config.containerId);
      if (!this.container) {
        console.error('🐧 PenguinModule: container non trovato:', this.config.containerId);
      }
    }

    setupScene() {
      const THREE = window.THREE;
      this.scene = new THREE.Scene();
      this.scene.background = null; // trasparente
      // Leggera foschia per profondità
      this.scene.fog = new THREE.Fog(0x0f2b3a, 5, 15);

      this.mouse = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();
      this.clock = new THREE.Clock();
    }

    createPenguin() {
      const THREE = window.THREE;
      const penguinGroup = new THREE.Group();

      // Materiali brand AIceberg Mind
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 30,
        specular: 0x222222
      });

      const bellyMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 50,
        specular: 0x444444
      });

      const beakMaterial = new THREE.MeshPhongMaterial({
        color: 0x3ac8f5, // brand cyan
        shininess: 80,
        specular: 0x5ee4c3 // brand mint
      });

      const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        shininess: 100
      });

      // Corpo - più rotondo e simpatico
      const bodyGeometry = new THREE.SphereGeometry(1, 16, 12);
      bodyGeometry.scale(0.85, 1.1, 0.8); // Più rotondetto e meno allungato
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0;
      penguinGroup.add(body);

      // Pancia - più rotonda e prominente per simpatia
      const bellyGeometry = new THREE.SphereGeometry(0.65, 12, 10);
      bellyGeometry.scale(0.8, 1.1, 0.6); // Più rotonda e prominente
      const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
      belly.position.set(0, -0.1, 0.5); // Più in basso e avanti
      penguinGroup.add(belly);

      // Testa - più grande e simpatica
      const headGeometry = new THREE.SphereGeometry(0.65, 12, 10);
      headGeometry.scale(1.0, 0.9, 1.0); // Leggermente più larga che alta
      const head = new THREE.Mesh(headGeometry, bodyMaterial);
      head.position.y = 1.35; // Leggermente più vicina al corpo
      penguinGroup.add(head);

      // Occhi rimossi dal solid - vengono aggiunti solo negli overlay wireframe

      // Becco - più grande e simpatico come un pinguino vero
      const beakGeometry = new THREE.ConeGeometry(0.18, 0.5, 6);
      const beak = new THREE.Mesh(beakGeometry, beakMaterial);
      beak.position.set(0, 1.22, 0.58); // Leggermente più in basso e avanti
      beak.rotation.x = Math.PI / 2;
      penguinGroup.add(beak);

      // Ali - più piccole e proporzionate per aspetto più carino
      const wingGeometry = new THREE.SphereGeometry(0.28, 8, 6);
      wingGeometry.scale(0.35, 0.9, 0.5);

      const leftWing = new THREE.Mesh(wingGeometry, bodyMaterial);
      leftWing.position.set(-0.65, 0.15, 0.1); // Leggermente più in alto e avanti
      leftWing.rotation.z = -0.4; // Più inclinate per simpatia
      penguinGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeometry, bodyMaterial);
      rightWing.position.set(0.65, 0.15, 0.1);
      rightWing.rotation.z = 0.4;
      penguinGroup.add(rightWing);

      // Piedi - più grandi e simpatici (zampe da pinguino vero)
      const footGeometry = new THREE.SphereGeometry(0.22, 8, 6);
      footGeometry.scale(1.8, 0.4, 1.0); // Più larghi e meno allungati

      const leftFoot = new THREE.Mesh(footGeometry, beakMaterial);
      leftFoot.position.set(-0.35, -1.15, 0.4); // Leggermente più larghi
      penguinGroup.add(leftFoot);

      const rightFoot = new THREE.Mesh(footGeometry, beakMaterial);
      rightFoot.position.set(0.35, -1.15, 0.4);
      penguinGroup.add(rightFoot);

      // Coda - piccola e carina
      const tailGeometry = new THREE.SphereGeometry(0.2, 8, 6);
      tailGeometry.scale(0.8, 0.5, 1.0); // Più rotonda
      const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
      tail.position.set(0, -0.2, -0.75); // Leggermente più in alto
      tail.rotation.x = -0.2; // Meno inclinata
      penguinGroup.add(tail);
      
      // Scala/posizione
      penguinGroup.scale.setScalar(0.8);
      penguinGroup.position.y = -0.5;

      // Riferimenti (occhi saranno aggiunti dinamicamente negli overlay)
      this.penguinParts = {
        group: penguinGroup,
        body,
        belly,
        head,
        leftWing,
        rightWing,
        beak,
        tail
      };
      
      // Container per occhi e sopracciglia wireframe (aggiunti dinamicamente)
      this.wireframeEyes = [];
      this.wireframeEyebrows = [];

      this.penguin = penguinGroup;
      this.scene.add(penguinGroup);

      // Animazione idle
      this.setupIdleAnimation();
    }

    setupIdleAnimation() {
      this.breathingTween = { time: 0, speed: 0.025 }; // Respiro più vivace
      this.wingFlapTween = { time: 0, speed: 0.04, amplitude: 0.25 }; // Ali più animate
      this.headBobTween = { time: 0, speed: 0.03, amplitude: 0.12 }; // Testa più vivace
      this.bellyBounceTween = { time: 0, speed: 0.02 }; // Nuovo: pancino che rimbalza
      this.eyebrowTween = { time: 0, speed: 0.035 }; // Nuovo: sopracciglia espressive
    }

    // === RENDERING STYLES ===
    
    applyRenderingStyle(style) {
      // Always apply solid base first for living penguin
      this.applySolidStyle();
      
      // Then apply wireframe overlay if not solid
      switch (style) {
        case 'solid':      /* Already applied above */   break;
        case 'wireframe':  this.applyWireframeOverlay(); break;
        case 'dashed':     this.applyDashedOverlay();    break;
        case 'neon':       this.applyNeonOverlay();      break;
        default:           /* Pure solid */              break;
      }
      this.currentStyle = style;
    }

    changeStyle(newStyle) {
      if (newStyle === this.currentStyle) return;
      
      // Clean up only wireframe overlays (keep solid base)
      this.cleanupWireframeOverlays();
      
      // Apply new style (solid base always maintained)
      this.applyRenderingStyle(newStyle);
      
      console.log('🐧 Style changed from', this.currentStyle, 'to', newStyle);
    }

    addWireframeEyes() {
      const THREE = window.THREE;
      
      // Materiale per occhi wireframe - più visibile
      const eyeMaterial = new THREE.MeshBasicMaterial({
        color: this.config.wireframeAccent,
        transparent: true,
        opacity: 1.0,
        wireframe: true
      });

      // Occhi più grandi e simpatici
      const leftEyeGeometry = new THREE.SphereGeometry(0.18, 8, 6);
      leftEyeGeometry.scale(1.0, 1.2, 1.0); // Leggermente ovali per più espressività
      const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
      leftEye.position.set(-0.22, 1.45, 0.5); // Posizione ottimizzata per nuova testa
      leftEye.renderOrder = 10;
      this.penguin.add(leftEye);
      this.wireframeEyes.push(leftEye);

      // Occhio destro  
      const rightEyeGeometry = new THREE.SphereGeometry(0.18, 8, 6);
      rightEyeGeometry.scale(1.0, 1.2, 1.0);
      const rightEye = new THREE.Mesh(rightEyeGeometry, eyeMaterial.clone());
      rightEye.position.set(0.22, 1.45, 0.5);
      rightEye.renderOrder = 10;
      this.penguin.add(rightEye);
      this.wireframeEyes.push(rightEye);

      // Sopracciglia animate - piccoli archi sopra gli occhi
      this.addWireframeEyebrows();

      console.log('👁️ Wireframe eyes added:', this.wireframeEyes.length);
      console.log('🤨 Wireframe eyebrows added:', this.wireframeEyebrows.length);
    }

    addWireframeEyebrows() {
      const THREE = window.THREE;
      
      // Materiale per sopracciglia
      const eyebrowMaterial = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent,
        transparent: true,
        opacity: 0.9,
        linewidth: 2
      });

      // Geometria arco per sopracciglia
      const createEyebrowGeometry = () => {
        const curve = new THREE.EllipseCurve(
          0, 0,            // center
          0.15, 0.08,      // xRadius, yRadius
          Math.PI * 0.2,   // start angle
          Math.PI * 0.8,   // end angle
          false,           // clockwise
          0                // rotation
        );
        
        const points = curve.getPoints(12);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
      };

      // Sopracciglio sinistro
      const leftEyebrowGeometry = createEyebrowGeometry();
      const leftEyebrow = new THREE.Line(leftEyebrowGeometry, eyebrowMaterial);
      leftEyebrow.position.set(-0.22, 1.62, 0.52); // Sopra l'occhio sinistro
      leftEyebrow.renderOrder = 11;
      this.penguin.add(leftEyebrow);
      this.wireframeEyebrows.push(leftEyebrow);

      // Sopracciglio destro
      const rightEyebrowGeometry = createEyebrowGeometry();
      const rightEyebrow = new THREE.Line(rightEyebrowGeometry, eyebrowMaterial.clone());
      rightEyebrow.position.set(0.22, 1.62, 0.52); // Sopra l'occhio destro
      rightEyebrow.renderOrder = 11;
      this.penguin.add(rightEyebrow);
      this.wireframeEyebrows.push(rightEyebrow);
    }

    cleanupWireframeOverlays() {
      // Clear only wireframe overlays, keep solid base intact
      [...this.wireframeLines, ...this.dashedMaterials, ...this.neonCores, ...this.neonHalos].forEach(item => {
        if (item && item.dispose) item.dispose();
      });
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];

      // Remove wireframe eyes
      this.wireframeEyes.forEach(eye => {
        if (eye.material) eye.material.dispose();
        if (eye.geometry) eye.geometry.dispose();
        if (eye.parent) eye.parent.remove(eye);
      });
      this.wireframeEyes = [];

      // Remove wireframe eyebrows
      this.wireframeEyebrows.forEach(eyebrow => {
        if (eyebrow.material) eyebrow.material.dispose();
        if (eyebrow.geometry) eyebrow.geometry.dispose();
        if (eyebrow.parent) eyebrow.parent.remove(eyebrow);
      });
      this.wireframeEyebrows = [];

      // Remove extended wireframe wings
      if (this.wireframeWings) {
        Object.values(this.wireframeWings).forEach(wing => {
          if (wing.material) wing.material.dispose();
          if (wing.geometry) wing.geometry.dispose();
          if (wing.parent) wing.parent.remove(wing);
        });
        this.wireframeWings = null;
        
        // Clean up references from penguinParts
        delete this.penguinParts.leftWingWireframe;
        delete this.penguinParts.rightWingWireframe;
      }

      // Remove only wireframe/line children from penguin parts
      this.penguin.traverse(obj => {
        if (obj.isMesh) {
          const linesToRemove = obj.children.filter(child => 
            child.type === 'LineSegments' || child.isLineSegments
          );
          linesToRemove.forEach(line => {
            if (line.material) line.material.dispose();
            if (line.geometry) line.geometry.dispose();
            obj.remove(line);
          });
        }
      });
    }

    cleanupCurrentStyle() {
      // Complete cleanup for destruction
      this.scene.children = this.scene.children.filter(obj => !obj.isLight);
      this.cleanupWireframeOverlays();
    }

    applySolidStyle() {
      const THREE = window.THREE;
      
      // Restore original fog
      this.scene.fog = new THREE.Fog(0x0f2b3a, 5, 15);
      
      // Setup solid lighting (original setup)
      const ambientLight = new THREE.AmbientLight(0x5ee4c3, 0.4);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(2, 3, 2);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      this.scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0x3ac8f5, 0.6, 10);
      pointLight.position.set(-2, 2, 2);
      this.scene.add(pointLight);

      const rimLight = new THREE.DirectionalLight(0x5ee4c3, 0.3);
      rimLight.position.set(-1, 1, -1);
      this.scene.add(rimLight);

      // Reset to original materials
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 30,
        specular: 0x222222
      });

      const bellyMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 50,
        specular: 0x444444
      });

      const beakMaterial = new THREE.MeshPhongMaterial({
        color: 0x3ac8f5, // brand cyan
        shininess: 80,
        specular: 0x5ee4c3 // brand mint
      });

      const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        shininess: 100
      });

      // Apply materials to penguin parts using direct references (no eyes in solid)
      if (this.penguinParts.body) this.penguinParts.body.material = bodyMaterial;
      if (this.penguinParts.belly) this.penguinParts.belly.material = bellyMaterial;
      if (this.penguinParts.head) this.penguinParts.head.material = bodyMaterial;
      if (this.penguinParts.beak) this.penguinParts.beak.material = beakMaterial;
      if (this.penguinParts.leftWing) this.penguinParts.leftWing.material = bodyMaterial;
      if (this.penguinParts.rightWing) this.penguinParts.rightWing.material = bodyMaterial;
      if (this.penguinParts.tail) this.penguinParts.tail.material = bodyMaterial;
      
      // Apply to feet (traverse for feet since they're not in penguinParts)
      this.penguin.traverse((obj, index) => {
        if (obj.isMesh && !Object.values(this.penguinParts).includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          obj.material?.dispose?.();
          obj.material = beakMaterial;
        }
      });
    }

    createExtendedWireframeWings() {
      const THREE = window.THREE;
      
      // Create longer wings specifically for wireframe styles - more elongated and visible
      const extendedWingGeometry = new THREE.SphereGeometry(0.28, 8, 6);
      extendedWingGeometry.scale(0.5, 1.2, 0.4); // Longer (0.5 vs 0.35) and taller (1.2 vs 0.9)

      // Create transparent material so only wireframe shows
      const transparentMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
        visible: false // Completely invisible, only wireframe will show
      });

      // Create extended wings
      const leftWingExtended = new THREE.Mesh(extendedWingGeometry.clone(), transparentMaterial);
      leftWingExtended.position.set(-0.75, 0.15, 0.1); // Slightly more outward for visibility
      leftWingExtended.rotation.z = -0.4;
      this.penguinParts.group.add(leftWingExtended);

      const rightWingExtended = new THREE.Mesh(extendedWingGeometry.clone(), transparentMaterial);
      rightWingExtended.position.set(0.75, 0.15, 0.1); // Slightly more outward for visibility  
      rightWingExtended.rotation.z = 0.4;
      this.penguinParts.group.add(rightWingExtended);

      // Store reference to extended wings for wireframe use
      this.wireframeWings = {
        leftWing: leftWingExtended,
        rightWing: rightWingExtended
      };

      // Add wireframe wings to parts that need animation sync
      this.penguinParts.leftWingWireframe = leftWingExtended;
      this.penguinParts.rightWingWireframe = rightWingExtended;

      console.log('🪶 Extended wireframe wings created:', {
        left: !!leftWingExtended,
        right: !!rightWingExtended,
        geometry: 'Extended for better wireframe visibility',
        willAnimate: 'Synced with solid wings'
      });
    }

    applyWireframeOverlay() {
      const THREE = window.THREE;
      this.wirePulse = { t: 0, speed: 0.015, base: 0.85, amp: 0.10 };

      // Add subtle wireframe lighting to enhance the solid base
      const wireAccentLight = new THREE.PointLight(this.config.wireframeAccent, 0.3, 8);
      wireAccentLight.position.set(1, 2, 1);
      this.scene.add(wireAccentLight);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Overlay wireframe lines on top of solid materials
      const lineMat = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent, 
        transparent: true, 
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      // Create longer wings specifically for wireframe styles
      this.createExtendedWireframeWings();

      // Add wireframe to specific parts (now including extended wings!)
      const partsForWireframe = [
        this.penguinParts.body,
        this.penguinParts.belly,    // Explicitly include belly
        this.penguinParts.beak,
        this.wireframeWings?.leftWing || this.penguinParts.leftWing, // Use extended wings if available
        this.wireframeWings?.rightWing || this.penguinParts.rightWing, // Use extended wings if available
        this.penguinParts.tail
      ];

      console.log('🔍 Wireframe parts check:', {
        body: !!this.penguinParts.body,
        belly: !!this.penguinParts.belly,
        beak: !!this.penguinParts.beak
      });

      partsForWireframe.forEach((part, index) => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);
          const lines = new THREE.LineSegments(edges, lineMat.clone());
          lines.frustumCulled = false;
          lines.renderOrder = 2; // Higher render order for belly
          part.add(lines);
          this.wireframeLines.push(lines);
          console.log(`✅ Wireframe added to part ${index}:`, part.constructor.name);
        } else {
          console.log(`❌ Missing part ${index}`);
        }
      });

      // Add wireframe to feet (not in penguinParts)
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForWireframe.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);
          const lines = new THREE.LineSegments(edges, lineMat.clone());
          lines.frustumCulled = false;
          lines.renderOrder = 1;
          obj.add(lines);
          this.wireframeLines.push(lines);
        }
      });
    }

    applyDashedOverlay() {
      const THREE = window.THREE;

      // Add dynamic tech lighting
      const techLight = new THREE.PointLight(this.config.wireframeAccent, 0.4, 6);
      techLight.position.set(-1, 1.5, 2);
      this.scene.add(techLight);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Create longer wings specifically for dashed style
      this.createExtendedWireframeWings();

      // Add dashed to specific parts (including extended wings for better visibility)
      const partsForDashed = [
        this.penguinParts.body,
        this.penguinParts.belly,    // Explicitly include belly
        this.penguinParts.beak,
        this.wireframeWings?.leftWing || this.penguinParts.leftWing, // Use extended wings if available
        this.wireframeWings?.rightWing || this.penguinParts.rightWing, // Use extended wings if available
        this.penguinParts.tail
      ];

      partsForDashed.forEach(part => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);
          
          const dashedMat = new THREE.LineDashedMaterial({
            color: this.config.wireframeAccent,
            transparent: true,
            opacity: 0.85,
            dashSize: this.config.dash.size,
            gapSize: this.config.dash.gap,
            scale: this.config.dash.scale,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          const dashed = new THREE.LineSegments(edges, dashedMat);
          dashed.computeLineDistances();
          dashed.frustumCulled = false;
          dashed.renderOrder = 1; // Above solid
          part.add(dashed);

          this.dashedMaterials.push(dashedMat);
        }
      });

      // Add dashed to feet (not in penguinParts)  
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForDashed.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);
          
          const dashedMat = new THREE.LineDashedMaterial({
            color: this.config.wireframeAccent,
            transparent: true,
            opacity: 0.85,
            dashSize: this.config.dash.size,
            gapSize: this.config.dash.gap,
            scale: this.config.dash.scale,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          const dashed = new THREE.LineSegments(edges, dashedMat);
          dashed.computeLineDistances();
          dashed.frustumCulled = false;
          dashed.renderOrder = 1;
          obj.add(dashed);

          this.dashedMaterials.push(dashedMat);
        }
      });
    }

    applyNeonOverlay() {
      const THREE = window.THREE;
      
      // Add dramatic neon lighting to enhance the solid base
      const neonCore = new THREE.PointLight(this.config.wireframeAccent, 0.6, 5);
      neonCore.position.set(0, 1, 2);
      this.scene.add(neonCore);

      const neonRim = new THREE.PointLight(this.config.wireframeAccentAlt, 0.4, 8);
      neonRim.position.set(-2, 0.5, -1);
      this.scene.add(neonRim);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Create longer wings specifically for neon style
      this.createExtendedWireframeWings();

      // Materiali per "glow" overlay
      const makeHaloMat = (opacity) => new THREE.LineBasicMaterial({
        color: this.config.wireframeAccentAlt,  // mint
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const coreMat = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent,     // cyan
        transparent: true,
        opacity: this.config.neon.base,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      // Add neon to specific parts (including extended wings for spectacular effect)
      const partsForNeon = [
        this.penguinParts.body,
        this.penguinParts.belly,    // Explicitly include belly
        this.penguinParts.beak,
        this.wireframeWings?.leftWing || this.penguinParts.leftWing, // Use extended wings if available
        this.wireframeWings?.rightWing || this.penguinParts.rightWing, // Use extended wings if available
        this.penguinParts.tail
      ];

      partsForNeon.forEach(part => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);

          // CORE neon lines
          const core = new THREE.LineSegments(edges, coreMat.clone());
          core.renderOrder = 3; // Top layer
          core.frustumCulled = false;
          part.add(core);
          this.neonCores.push(core.material);

          // HALO 1 (outer glow)
          const halo1 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[0]));
          halo1.renderOrder = 1;
          halo1.scale.setScalar(this.config.neon.haloScales[0]);
          halo1.frustumCulled = false;
          part.add(halo1);
          this.neonHalos.push(halo1.material);

          // HALO 2 (inner glow)
          const halo2 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[1]));
          halo2.renderOrder = 2;
          halo2.scale.setScalar(this.config.neon.haloScales[1]);
          halo2.frustumCulled = false;
          part.add(halo2);
          this.neonHalos.push(halo2.material);
        }
      });

      // Add neon to feet (not in penguinParts)
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForNeon.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);

          // CORE neon lines
          const core = new THREE.LineSegments(edges, coreMat.clone());
          core.renderOrder = 3;
          core.frustumCulled = false;
          obj.add(core);
          this.neonCores.push(core.material);

          // HALO 1 (outer glow)
          const halo1 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[0]));
          halo1.renderOrder = 1;
          halo1.scale.setScalar(this.config.neon.haloScales[0]);
          halo1.frustumCulled = false;
          obj.add(halo1);
          this.neonHalos.push(halo1.material);

          // HALO 2 (inner glow)
          const halo2 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[1]));
          halo2.renderOrder = 2;
          halo2.scale.setScalar(this.config.neon.haloScales[1]);
          halo2.frustumCulled = false;
          obj.add(halo2);
          this.neonHalos.push(halo2.material);
        }
      });
    }



    setupCamera() {
      const THREE = window.THREE;
      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
      this.camera.position.set(0, 0, 4);
      this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
      const THREE = window.THREE;

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });

      // Color space moderno (r152+)
      if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      }

      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.container.appendChild(this.renderer.domElement);
    }

    bindEvents() {
      // Resize
      this.eventHandlers.resize = () => this.handleResize();
      window.addEventListener('resize', this.eventHandlers.resize, { passive: true });

      if (this.config.enableInteraction) {
        // Mouse
        this.eventHandlers.mouseMove = (e) => this.handleMouseMove(e);
        this.eventHandlers.mouseDown = (e) => this.handleMouseDown(e);
        this.eventHandlers.mouseUp = (e) => this.handleMouseUp(e);
        this.eventHandlers.click = (e) => this.handleClick(e);

        this.container.addEventListener('mousemove', this.eventHandlers.mouseMove);
        this.container.addEventListener('mousedown', this.eventHandlers.mouseDown);
        this.container.addEventListener('mouseup', this.eventHandlers.mouseUp);
        this.container.addEventListener('click', this.eventHandlers.click);

        // Touch (wrappers per avere clientX/Y)
        this.eventHandlers.touchStart = (e) => {
          const t = e.touches && e.touches[0] ? e.touches[0] : e;
          this.handleMouseDown(t);
        };
        this.eventHandlers.touchEnd = (e) => {
          const t = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
          this.handleMouseUp(t);
        };
        this.eventHandlers.touchMove = (e) => {
          const t = e.touches && e.touches[0] ? e.touches[0] : e;
          this.handleMouseMove(t);
        };

        this.container.addEventListener('touchstart', this.eventHandlers.touchStart, { passive: false });
        this.container.addEventListener('touchend', this.eventHandlers.touchEnd, { passive: true });
        this.container.addEventListener('touchmove', this.eventHandlers.touchMove, { passive: false });
      }
    }

    handleResize() {
      if (!this.camera || !this.renderer) return;
      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    handleMouseMove(event) {
      if (!this.container) return;
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Mouse tracking rimosso - pinguino più statico per wireframe
      // Gli overlay wireframe non devono interferire con head/eye tracking
    }

    handleMouseDown(event) {
      this.isMouseDown = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      this.triggerExcitedAnimation();
    }

    handleMouseUp() {
      this.isMouseDown = false;
    }

    handleClick() {
      this.triggerWaveAnimation();
      // Evento custom per integrazione AIceberg Mind
      window.dispatchEvent(new CustomEvent('aimoClick', {
        detail: { position: this.mouse, timestamp: Date.now() }
      }));
    }

    triggerWaveAnimation() {
      if (!this.penguinParts?.leftWing || !this.penguinParts?.rightWing) return;
      const duration = 1000;
      const startTime = Date.now();

      const animateWave = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const wave = Math.sin(progress * Math.PI * 4) * 0.5;

        this.penguinParts.leftWing.rotation.z = -0.3 + wave;
        this.penguinParts.rightWing.rotation.z = 0.3 - wave;

        if (progress < 1) {
          requestAnimationFrame(animateWave);
        } else {
          // Reset
          this.penguinParts.leftWing.rotation.z = -0.3;
          this.penguinParts.rightWing.rotation.z = 0.3;
        }
      };

      animateWave();
    }

    triggerExcitedAnimation() {
      if (!this.penguinParts?.group) return;
      const originalY = this.penguinParts.group.position.y;
      const duration = 500;
      const startTime = Date.now();

      const animateBounce = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const bounce = Math.sin(progress * Math.PI) * 0.2;

        this.penguinParts.group.position.y = originalY + bounce;

        if (progress < 1) requestAnimationFrame(animateBounce);
      };

      animateBounce();
    }

    startAnimation() {
      if (this.isAnimating) return;
      this.isAnimating = true;
      this.animate();
    }

    animate() {
      if (!this.isAnimating) return;

      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastFrameTime;

      // Limita FPS
      if (deltaTime < 1000 / this.maxFPS) {
        this.animationId = requestAnimationFrame(() => this.animate());
        return;
      }
      this.lastFrameTime = currentTime;

      this.updateIdleAnimations();

      // Auto-rotate
      if (this.config.autoRotate && this.penguin && !this.isMouseDown) {
        this.penguin.rotation.y += 0.005;
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      this.animationId = requestAnimationFrame(() => this.animate());
    }

    updateIdleAnimations() {
      if (!this.penguinParts?.body) return;

      // Respiro più vivace
      this.breathingTween.time += this.breathingTween.speed;
      const breathScale = 1 + Math.sin(this.breathingTween.time) * 0.03; // Più pronunciato
      this.penguinParts.body.scale.set(breathScale, breathScale, breathScale);

      // Pancino che rimbalza dolcemente
      if (this.penguinParts.belly) {
        this.bellyBounceTween.time += this.bellyBounceTween.speed;
        const bellyBounce = Math.sin(this.bellyBounceTween.time + Math.PI/3) * 0.02;
        this.penguinParts.belly.scale.set(1 + bellyBounce, 1 + bellyBounce * 0.5, 1 + bellyBounce);
      }

      // Ali più animate e simpatiche - sincronizza solid e wireframe
      this.wingFlapTween.time += this.wingFlapTween.speed;
      const wingFlap = Math.sin(this.wingFlapTween.time) * this.wingFlapTween.amplitude;

      if (this.penguinParts.leftWing && this.penguinParts.rightWing) {
        // Ali solid che si muovono leggermente in modo alternato
        this.penguinParts.leftWing.rotation.x = wingFlap * 0.08;
        this.penguinParts.rightWing.rotation.x = -wingFlap * 0.08;
        this.penguinParts.leftWing.rotation.z = -0.4 + wingFlap * 0.1;
        this.penguinParts.rightWing.rotation.z = 0.4 - wingFlap * 0.1;

        // Sincronizza le ali wireframe estese con le solid
        if (this.wireframeWings && this.wireframeWings.leftWing && this.wireframeWings.rightWing) {
          this.wireframeWings.leftWing.rotation.x = wingFlap * 0.08;
          this.wireframeWings.rightWing.rotation.x = -wingFlap * 0.08;
          this.wireframeWings.leftWing.rotation.z = -0.4 + wingFlap * 0.1;
          this.wireframeWings.rightWing.rotation.z = 0.4 - wingFlap * 0.1;
        }
      }

      // Testa con movimento più dolce (coordinate aggiornate)
      this.headBobTween.time += this.headBobTween.speed;
      const headBob = Math.sin(this.headBobTween.time) * this.headBobTween.amplitude;

      if (this.penguinParts.head && !this.isMouseDown) {
        this.penguinParts.head.position.y = 1.35 + headBob * 0.04; // Coordinate aggiornate
      }

      // Sopracciglia animate - movimento su e giù per espressività
      if (this.wireframeEyebrows && this.wireframeEyebrows.length > 0) {
        this.eyebrowTween.time += this.eyebrowTween.speed;
        const eyebrowMove = Math.sin(this.eyebrowTween.time) * 0.03;
        
        this.wireframeEyebrows.forEach((eyebrow, index) => {
          const baseY = 1.62;
          const phase = index * Math.PI * 0.3; // Leggero sfasamento tra le sopracciglia
          eyebrow.position.y = baseY + Math.sin(this.eyebrowTween.time + phase) * 0.02;
          
          // Leggera rotazione per più espressività
          eyebrow.rotation.z = Math.sin(this.eyebrowTween.time + phase) * 0.1;
        });
      }

      // === WIREFRAME ANIMATIONS ===

      // wireframe pulse
      if (this.wirePulse && this.wireframeLines && this.wireframeLines.length) {
        this.wirePulse.t += this.wirePulse.speed;
        const k = this.wirePulse.base + Math.sin(this.wirePulse.t) * this.wirePulse.amp;
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const opacity = clamp(k, 0.3, 1.0);
        for (const line of this.wireframeLines) {
          if (line.material) line.material.opacity = opacity;
        }
      }

      // dashed scroll
      if (this.dashedMaterials && this.dashedMaterials.length) {
        for (const m of this.dashedMaterials) {
          // r164 supporta dashOffset: crea un movimento "che scorre"
          m.dashOffset = (m.dashOffset ?? 0) - this.config.dash.speed;
          m.needsUpdate = true;
        }
      }

      // NEON pulse (soft)
      if (this.neonCores && this.neonCores.length) {
        this.neonPulse.t += this.config.neon.pulseSpeed;
        const k = this.config.neon.base + Math.sin(this.neonPulse.t) * this.config.neon.amp; // 0..1
        // clamp e applica
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const coreOpacity = clamp(k, 0.45, 1.0);
        const haloOpacity = clamp(k * 0.35, 0.05, 0.35);

        for (const m of this.neonCores) { m.opacity = coreOpacity; }
        for (const m of this.neonHalos) { m.opacity = haloOpacity; }
      }
    }

    showFallback() {
      if (this.container) {
        this.container.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-family:var(--font-display);">
            <div style="font-size:3rem;margin-bottom:0.5rem;">🐧</div>
            <div style="font-size:0.875rem;text-align:center;">AIMo<br><small>3D version disabled on mobile</small></div>
          </div>
        `;
      }
    }

    show() {
      if (this.container) {
        this.container.style.display = 'block';
        this.container.style.opacity = '1';
      }
    }

    hide() {
      if (this.container) {
        this.container.style.opacity = '0';
        setTimeout(() => {
          if (this.container) this.container.style.display = 'none';
        }, 300);
      }
    }

    isMobileDevice() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    stopAnimation() {
      this.isAnimating = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    cleanup() {
      const THREE = window.THREE;
      // Stop
      this.stopAnimation();

      // Remove listeners con mappa esplicita
      const map = {
        mouseMove: 'mousemove',
        mouseDown: 'mousedown',
        mouseUp: 'mouseup',
        click: 'click',
        touchStart: 'touchstart',
        touchEnd: 'touchend',
        touchMove: 'touchmove'
      };

      if (this.eventHandlers.resize) {
        window.removeEventListener('resize', this.eventHandlers.resize);
      }

      Object.keys(map).forEach((key) => {
        const handler = this.eventHandlers[key];
        if (handler && this.container) {
          this.container.removeEventListener(map[key], handler);
        }
      });

      // Dispose Three.js resources
      if (this.scene) {
        this.scene.traverse((obj) => {
          if (obj.isMesh) {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach((m) => m.dispose?.());
              } else {
                obj.material.dispose?.();
              }
            }
          }
        });
      }

      // Dispose wireframe materials
      [...this.wireframeLines, ...this.dashedMaterials, ...this.neonCores, ...this.neonHalos].forEach(item => {
        if (item && item.dispose) item.dispose();
      });
      
      // Clear arrays
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];

      if (this.renderer) {
        this.renderer.dispose?.();
        if (this.renderer.domElement?.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }

      console.log('🐧 PenguinModule cleaned up');
    }
  }

  // Export globale per uso in Astro (script non-module)
  window.PenguinModule = PenguinModule;
})();

























/* === PENGUIN MODULE - Three.js 3D Penguin (r164+ compatible) ===
 * - RIMOSSA ogni logica di auto-caricamento di Three.js (usa window.THREE già caricato)
 * - Aggiunto supporto color space r152+ (renderer.outputColorSpace = THREE.SRGBColorSpace)
 * - Fix cleanup eventi + touch
 * - Nessuna dipendenza ESM: esporta in window.PenguinModule
 */

(function () {
  class PenguinModule {
    constructor(config = {}) {
      this.config = {
        containerId: 'penguin-container',
        modelPath: null, // programmatic penguin
        enableAnimation: true,
        enableInteraction: true,
        autoRotate: false,
        enableMobile: false,

        // === NEW: rendering styles ===
        style: 'solid',                     // 'solid' | 'wireframe' | 'dashed' | 'neon'
        wireframeAccent: 0x3ac8f5,          // cyan
        wireframeAccentAlt: 0x5ee4c3,       // mint (per neon/parti alternate)
        edgesThreshold: 28,                 // soglia angoli per EdgesGeometry

        // dashed options
        dash: { size: 0.6, gap: 0.35, speed: 0.002, scale: 1 },

        // neon options (glow finto)
        neon: {
          haloScales: [1.025, 1.012],     // due gusci leggermente più grandi
          haloOpacities: [0.08, 0.15],    // opacità base dei gusci
          pulseSpeed: 0.02,               // velocità del "respiro"
          base: 0.75,                     // opacità base del core line
          amp: 0.22                       // ampiezza del pulse
        },

        ...config
      };

      // Three.js core
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.penguin = null;
      this.mixer = null;

      // Animation
      this.clock = null;
      this.isAnimating = false;
      this.animationId = null;

      // Interaction
      this.mouse = { x: 0, y: 0 };
      this.raycaster = null;
      this.isMouseDown = false;
      this.previousMousePosition = { x: 0, y: 0 };

      // Performance
      this.lastFrameTime = 0;
      this.frameSkip = 0;
      this.maxFPS = 60;

      // Event handlers (per cleanup accurato)
      this.eventHandlers = {
        resize: null,
        mouseMove: null,
        mouseDown: null,
        mouseUp: null,
        click: null,
        touchStart: null,
        touchEnd: null,
        touchMove: null
      };

      // Wireframe containers
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];
      this.neonPulse = { t: 0 };

      this.init();
    }

    // === Init (senza auto-loader) ===
    init() {
      if (typeof window === 'undefined' || typeof window.THREE === 'undefined') {
        console.error('🐧 PenguinModule: Three.js non è caricato. Caricalo PRIMA del modulo.');
        return;
      }
      // Abilita color management moderno (r152+)
      if (window.THREE.ColorManagement) {
        window.THREE.ColorManagement.enabled = true;
      }
      this.initPenguin();
    }

    initPenguin() {
      // Mobile off?
      if (this.isMobileDevice() && !this.config.enableMobile) {
        console.log('🐧 PenguinModule: disabilitato su mobile per performance');
        this.createContainer(); // serve per mostrare il fallback dentro al container
        this.showFallback();
        return;
      }

      this.createContainer();
      if (!this.container) return;

      this.setupScene();
      this.createPenguin();
      
      // Apply rendering style after penguin creation (includes lighting)
      this.applyRenderingStyle(this.config.style);
      
      this.setupCamera();
      this.setupRenderer();
      this.bindEvents();
      this.startAnimation();

      console.log('🐧 PenguinModule initialized (Three r' + (window.THREE?.REVISION || '?') + ')');
    }

    createContainer() {
      this.container = document.getElementById(this.config.containerId);
      if (!this.container) {
        console.error('🐧 PenguinModule: container non trovato:', this.config.containerId);
      }
    }

    setupScene() {
      const THREE = window.THREE;
      this.scene = new THREE.Scene();
      this.scene.background = null; // trasparente
      // Leggera foschia per profondità
      this.scene.fog = new THREE.Fog(0x0f2b3a, 5, 15);

      this.mouse = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();
      this.clock = new THREE.Clock();
    }

    createPenguin() {
      const THREE = window.THREE;
      const penguinGroup = new THREE.Group();

      // Materiali brand AIceberg Mind
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 30,
        specular: 0x222222
      });

      const bellyMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 50,
        specular: 0x444444
      });

      const beakMaterial = new THREE.MeshPhongMaterial({
        color: 0x3ac8f5, // brand cyan
        shininess: 80,
        specular: 0x5ee4c3 // brand mint
      });

      const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        shininess: 100
      });

      // Materiale speciale per ali con migliore visibilità
      const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a, // Stesso nero del corpo
        shininess: 60,   // Più lucido per catturare la luce
        specular: 0x333333, // Riflessi più evidenti
        emissive: 0x0a0a0a, // Leggera emissione per visibilità
        flatShading: false // Shading smooth per definizione
      });

      // 🍐 CORPO A PERA - LatheGeometry per profilo perfetto!
      const pearProfile = [];
      
      // Definisco il profilo della pera ACCORCIATA come nell'immagine
      // Parte inferiore più corta, zampe più vicine al corpo
      pearProfile.push(new THREE.Vector2(0.05, -0.8));    // Base più alta (era -1.2)
      pearProfile.push(new THREE.Vector2(0.7, -0.8));     // Fondo piatto più alto per zampe vicine
      pearProfile.push(new THREE.Vector2(0.8, -0.7));     // Curva più alta (era -1.1)
      pearProfile.push(new THREE.Vector2(0.9, -0.5));     // Parte larga più alta (era -0.8)
      pearProfile.push(new THREE.Vector2(0.9, -0.2));     // Continua largo più alto (era -0.4)
      pearProfile.push(new THREE.Vector2(0.85, 0.0));     // Restrizione (era -0.1)
      pearProfile.push(new THREE.Vector2(0.75, 0.3));     // Restrizione media (era 0.2)
      pearProfile.push(new THREE.Vector2(0.6, 0.6));      // Parte alta (era 0.5)
      pearProfile.push(new THREE.Vector2(0.5, 0.9));      // Collo della pera (era 0.8)
      pearProfile.push(new THREE.Vector2(0.45, 1.1));     // Quasi in cima (era 1.0)
      pearProfile.push(new THREE.Vector2(0.35, 1.2));     // Sommità (era 1.1)
      pearProfile.push(new THREE.Vector2(0.05, 1.3));     // Punta più alta (era 1.2)
      
      const pearBodyGeometry = new THREE.LatheGeometry(pearProfile, 32); // 32 segmenti per smoothness
      const pearBody = new THREE.Mesh(pearBodyGeometry, bodyMaterial);
      pearBody.position.y = 0.0;
      pearBody.scale.set(0.7, 0.8, 0.7); // Scala finale per proporzioni giuste
      
      penguinGroup.add(pearBody);
      
      console.log('🍐 LatheGeometry pear body created:', {
        method: 'Revolution of custom pear profile',
        segments: 32,
        profilePoints: pearProfile.length,
        shape: 'Wide bottom → Narrow top (true pear!)',
        visible: pearBody.visible
      });

      // 🤍 Pancia - Finisce ESATTAMENTE dove finisce il corpo (Y: -0.8)
      const bellyGeometry = new THREE.SphereGeometry(0.6, 16, 12);
      bellyGeometry.scale(0.8, 1.2, 0.6); // Dimensionata per finire con il corpo, non oltre
      const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
      belly.position.set(0, -0.2, 0.65); // Centrata per finire alla base del corpo (-0.8)
      penguinGroup.add(belly);

      // 🧠 La "testa" ora è parte della pera - solo riferimento logico per animazioni
      const head = pearBody; // La testa è ora parte della pera unificata!

      // Occhi rimossi dal solid - vengono aggiunti solo negli overlay wireframe

      // 🐧 Becco - Nella parte alta della pera, come nell'immagine di riferimento
      const beakGeometry = new THREE.ConeGeometry(0.15, 0.4, 6);
      const beak = new THREE.Mesh(beakGeometry, beakMaterial);
      beak.position.set(0, 0.6, 0.7); // Molto più in alto, parte superiore della pera
      beak.rotation.x = Math.PI / 2;
      penguinGroup.add(beak);

      // 🐧 Ali-Pinne - Con spessore maggiore per visibilità laterale!
      const wingGeometry = new THREE.SphereGeometry(0.35, 8, 6);
      wingGeometry.scale(0.5, 1.4, 0.8); // Spessore aumentato: X da 0.3 → 0.5

      const leftWing = new THREE.Mesh(wingGeometry, wingMaterial); // Materiale speciale per visibilità
      leftWing.position.set(-0.75, -0.1, 0.15); // All'altezza dell'inizio pancia
      leftWing.rotation.z = -0.4; // Inclinazione naturale
      leftWing.rotation.y = -0.1; // Leggero orientamento laterale
      penguinGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeometry, wingMaterial); // Materiale speciale per visibilità
      rightWing.position.set(0.75, -0.1, 0.15); // All'altezza dell'inizio pancia
      rightWing.rotation.z = 0.4; // Inclinazione naturale
      rightWing.rotation.y = 0.1; // Leggero orientamento laterale
      penguinGroup.add(rightWing);

      // 🦶 Zampe - Riportate alla posizione originale
      const footGeometry = new THREE.SphereGeometry(0.25, 8, 6);
      footGeometry.scale(2.0, 0.4, 1.2); // Più larghe e lunghe per zampe realistiche

      const leftFoot = new THREE.Mesh(footGeometry, beakMaterial);
      leftFoot.position.set(-0.3, -0.9, 0.8); // Riportate alla posizione originale
      penguinGroup.add(leftFoot);

      const rightFoot = new THREE.Mesh(footGeometry, beakMaterial);
      rightFoot.position.set(0.3, -0.9, 0.8); // Riportate alla posizione originale
      penguinGroup.add(rightFoot);

      // 🍃 Coda - Adattata alla parte posteriore dell'uovo
      const tailGeometry = new THREE.SphereGeometry(0.18, 8, 6);
      tailGeometry.scale(0.7, 0.45, 0.9); // Proporzionata all'uovo
      const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
      tail.position.set(0, 0.0, -0.7); // Dietro l'uovo, leggermente centrata
      tail.rotation.x = -0.15; // Angolo naturale
      penguinGroup.add(tail);
      
      // Scala/posizione
      penguinGroup.scale.setScalar(0.8);
      penguinGroup.position.y = -0.5;

      // FORZA visibilità ali solid - SEMPRE visibili!
      leftWing.visible = true;
      leftWing.frustumCulled = false; // Non nascondere mai per frustum culling
      rightWing.visible = true; 
      rightWing.frustumCulled = false; // Non nascondere mai per frustum culling

      // Riferimenti (ora con corpo a pera!)
      this.penguinParts = {
        group: penguinGroup,
        body: pearBody,       // 🍐 Corpo a pera 
        belly,                // 🤍 Pancia adattata
        head: pearBody,       // 🧠 Testa = corpo pera (riferimento logico)
        leftWing,             // 🪶 Ali SEMPRE visibili
        rightWing,            // 🪶 Ali SEMPRE visibili
        beak,                 // 🐧 Becco riposizionato
        tail                  // 🍃 Coda dietro la pera
      };
      
      // Container per occhi e sopracciglia wireframe (aggiunti dinamicamente)
      this.wireframeEyes = [];
      this.wireframeEyebrows = [];

      this.penguin = penguinGroup;
      this.scene.add(penguinGroup);

      // Animazione idle
      this.setupIdleAnimation();
    }

    setupIdleAnimation() {
      this.breathingTween = { time: 0, speed: 0.025 }; // Respiro più vivace
      this.wingFlapTween = { time: 0, speed: 0.04, amplitude: 0.25 }; // Ali più animate
      this.headBobTween = { time: 0, speed: 0.03, amplitude: 0.12 }; // Testa più vivace
      this.bellyBounceTween = { time: 0, speed: 0.02 }; // Nuovo: pancino che rimbalza
      this.eyebrowTween = { time: 0, speed: 0.035 }; // Nuovo: sopracciglia espressive
    }

    // === RENDERING STYLES ===
    
    applyRenderingStyle(style) {
      // Always apply solid base first for living penguin
      this.applySolidStyle();
      
      // Then apply wireframe overlay if not solid
      switch (style) {
        case 'solid':      /* Already applied above */   break;
        case 'wireframe':  this.applyWireframeOverlay(); break;
        case 'dashed':     this.applyDashedOverlay();    break;
        case 'neon':       this.applyNeonOverlay();      break;
        default:           /* Pure solid */              break;
      }
      this.currentStyle = style;
    }

    changeStyle(newStyle) {
      if (newStyle === this.currentStyle) return;
      
      // Clean up only wireframe overlays (keep solid base)
      this.cleanupWireframeOverlays();
      
      // Apply new style (solid base always maintained)
      this.applyRenderingStyle(newStyle);
      
      console.log('🐧 Style changed from', this.currentStyle, 'to', newStyle);
    }

    addWireframeEyes() {
      const THREE = window.THREE;
      
      // Materiale per occhi wireframe - più visibile
      const eyeMaterial = new THREE.MeshBasicMaterial({
        color: this.config.wireframeAccent,
        transparent: true,
        opacity: 1.0,
        wireframe: true
      });

      // 👁️ Occhi - Parte medio-alta della pera, sopra il becco
      const leftEyeGeometry = new THREE.SphereGeometry(0.15, 8, 6);
      leftEyeGeometry.scale(1.1, 1.2, 1.0); // Espressivi
      const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
      leftEye.position.set(-0.15, 0.8, 0.65); // Parte alta della pera, sopra il becco
      leftEye.renderOrder = 10;
      this.penguin.add(leftEye);
      this.wireframeEyes.push(leftEye);

      // Occhio destro  
      const rightEyeGeometry = new THREE.SphereGeometry(0.15, 8, 6);
      rightEyeGeometry.scale(1.1, 1.2, 1.0);
      const rightEye = new THREE.Mesh(rightEyeGeometry, eyeMaterial.clone());
      rightEye.position.set(0.15, 0.8, 0.65);
      rightEye.renderOrder = 10;
      this.penguin.add(rightEye);
      this.wireframeEyes.push(rightEye);

      // Sopracciglia animate - piccoli archi sopra gli occhi
      this.addWireframeEyebrows();

      console.log('👁️ Wireframe eyes added:', this.wireframeEyes.length);
      console.log('🤨 Wireframe eyebrows added:', this.wireframeEyebrows.length);
    }

    addWireframeEyebrows() {
      const THREE = window.THREE;
      
      // Materiale per sopracciglia
      const eyebrowMaterial = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent,
        transparent: true,
        opacity: 0.9,
        linewidth: 2
      });

      // Geometria arco per sopracciglia
      const createEyebrowGeometry = () => {
        const curve = new THREE.EllipseCurve(
          0, 0,            // center
          0.15, 0.08,      // xRadius, yRadius
          Math.PI * 0.2,   // start angle
          Math.PI * 0.8,   // end angle
          false,           // clockwise
          0                // rotation
        );
        
        const points = curve.getPoints(12);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
      };

      // 🤨 Sopracciglio sinistro - Sopra i nuovi occhi
      const leftEyebrowGeometry = createEyebrowGeometry();
      const leftEyebrow = new THREE.Line(leftEyebrowGeometry, eyebrowMaterial);
      leftEyebrow.position.set(-0.15, 0.95, 0.67); // Sopra gli occhi alzati
      leftEyebrow.renderOrder = 11;
      this.penguin.add(leftEyebrow);
      this.wireframeEyebrows.push(leftEyebrow);

      // Sopracciglio destro
      const rightEyebrowGeometry = createEyebrowGeometry();
      const rightEyebrow = new THREE.Line(rightEyebrowGeometry, eyebrowMaterial.clone());
      rightEyebrow.position.set(0.15, 0.95, 0.67); // Sopra gli occhi alzati
      rightEyebrow.renderOrder = 11;
      this.penguin.add(rightEyebrow);
      this.wireframeEyebrows.push(rightEyebrow);
    }

    cleanupWireframeOverlays() {
      // Clear only wireframe overlays, keep solid base intact
      [...this.wireframeLines, ...this.dashedMaterials, ...this.neonCores, ...this.neonHalos].forEach(item => {
        if (item && item.dispose) item.dispose();
      });
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];

      // Remove wireframe eyes
      this.wireframeEyes.forEach(eye => {
        if (eye.material) eye.material.dispose();
        if (eye.geometry) eye.geometry.dispose();
        if (eye.parent) eye.parent.remove(eye);
      });
      this.wireframeEyes = [];

      // Remove wireframe eyebrows
      this.wireframeEyebrows.forEach(eyebrow => {
        if (eyebrow.material) eyebrow.material.dispose();
        if (eyebrow.geometry) eyebrow.geometry.dispose();
        if (eyebrow.parent) eyebrow.parent.remove(eyebrow);
      });
      this.wireframeEyebrows = [];

      // Remove extended wireframe wings (NOT solid wings!)
      if (this.wireframeWings) {
        Object.values(this.wireframeWings).forEach(wing => {
          if (wing.material) wing.material.dispose();
          if (wing.geometry) wing.geometry.dispose();
          if (wing.parent) wing.parent.remove(wing);
        });
        this.wireframeWings = null;
        
        // Clean up references from penguinParts
        delete this.penguinParts.leftWingWireframe;
        delete this.penguinParts.rightWingWireframe;
      }

      // Remove only wireframe/line children from penguin parts - NON toccare le ali solid!
      this.penguin.traverse(obj => {
        // SKIP solid wings - non rimuovere mai le ali solid!
        if (obj === this.penguinParts.leftWing || obj === this.penguinParts.rightWing) {
          return; // NON toccare le ali solid!
        }
        
        if (obj.isMesh) {
          const linesToRemove = obj.children.filter(child => 
            child.type === 'LineSegments' || child.isLineSegments
          );
          linesToRemove.forEach(line => {
            if (line.material) line.material.dispose();
            if (line.geometry) line.geometry.dispose();
            obj.remove(line);
          });
        }
      });
    }

    cleanupCurrentStyle() {
      // Complete cleanup for destruction
      this.scene.children = this.scene.children.filter(obj => !obj.isLight);
      this.cleanupWireframeOverlays();
    }

    applySolidStyle() {
      const THREE = window.THREE;
      
      // Restore original fog
      this.scene.fog = new THREE.Fog(0x0f2b3a, 5, 15);
      
      // Setup solid lighting (original setup)
      const ambientLight = new THREE.AmbientLight(0x5ee4c3, 0.4);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(2, 3, 2);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      this.scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0x3ac8f5, 0.6, 10);
      pointLight.position.set(-2, 2, 2);
      this.scene.add(pointLight);

      const rimLight = new THREE.DirectionalLight(0x5ee4c3, 0.3);
      rimLight.position.set(-1, 1, -1);
      this.scene.add(rimLight);

      // Reset to original materials
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 30,
        specular: 0x222222
      });

      const bellyMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 50,
        specular: 0x444444
      });

      const beakMaterial = new THREE.MeshPhongMaterial({
        color: 0x3ac8f5, // brand cyan
        shininess: 80,
        specular: 0x5ee4c3 // brand mint
      });

      const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        shininess: 100
      });

      // Apply materials to penguin parts using direct references (no eyes in solid)
      if (this.penguinParts.body) this.penguinParts.body.material = bodyMaterial;
      if (this.penguinParts.belly) this.penguinParts.belly.material = bellyMaterial;
      if (this.penguinParts.head) this.penguinParts.head.material = bodyMaterial;
      if (this.penguinParts.beak) this.penguinParts.beak.material = beakMaterial;
      // Materiale speciale ali per migliore visibilità
      const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 60,
        specular: 0x333333,
        emissive: 0x0a0a0a,
        flatShading: false
      });
      if (this.penguinParts.leftWing) this.penguinParts.leftWing.material = wingMaterial;
      if (this.penguinParts.rightWing) this.penguinParts.rightWing.material = wingMaterial;
      if (this.penguinParts.tail) this.penguinParts.tail.material = bodyMaterial;
      
      // Apply to feet (traverse for feet since they're not in penguinParts)
      this.penguin.traverse((obj, index) => {
        if (obj.isMesh && !Object.values(this.penguinParts).includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          obj.material?.dispose?.();
          obj.material = beakMaterial;
        }
      });
    }

    createExtendedWireframeWings() {
      const THREE = window.THREE;
      
      // Create extended wings matching the new large flipper style
      const extendedWingGeometry = new THREE.SphereGeometry(0.38, 8, 6);
      extendedWingGeometry.scale(0.35, 1.5, 0.9); // Slightly larger than solid flippers for wireframe visibility

      // Create transparent material so only wireframe shows
      const transparentMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
        visible: false // Completely invisible, only wireframe will show
      });

      // Create extended wings - Large flippers for spectacular wireframe
      const leftWingExtended = new THREE.Mesh(extendedWingGeometry.clone(), transparentMaterial);
      leftWingExtended.position.set(-0.7, 0.3, 0.15); // Match solid flipper position
      leftWingExtended.rotation.z = -0.4; // Match solid flipper rotation
      leftWingExtended.rotation.y = -0.1;
      this.penguinParts.group.add(leftWingExtended);

      const rightWingExtended = new THREE.Mesh(extendedWingGeometry.clone(), transparentMaterial);
      rightWingExtended.position.set(0.7, 0.3, 0.15); // Match solid flipper position  
      rightWingExtended.rotation.z = 0.4; // Match solid flipper rotation
      rightWingExtended.rotation.y = 0.1;
      this.penguinParts.group.add(rightWingExtended);

      // Store reference to extended wings for wireframe use
      this.wireframeWings = {
        leftWing: leftWingExtended,
        rightWing: rightWingExtended
      };

      // Add wireframe wings to parts that need animation sync
      this.penguinParts.leftWingWireframe = leftWingExtended;
      this.penguinParts.rightWingWireframe = rightWingExtended;

      console.log('🪶 Extended wireframe wings created:', {
        left: !!leftWingExtended,
        right: !!rightWingExtended,
        geometry: 'Extended for better wireframe visibility',
        willAnimate: 'Synced with solid wings'
      });
    }

    applyWireframeOverlay() {
      const THREE = window.THREE;
      this.wirePulse = { t: 0, speed: 0.015, base: 0.85, amp: 0.10 };

      // Add subtle wireframe lighting to enhance the solid base
      const wireAccentLight = new THREE.PointLight(this.config.wireframeAccent, 0.3, 8);
      wireAccentLight.position.set(1, 2, 1);
      this.scene.add(wireAccentLight);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Overlay wireframe lines on top of solid materials
      const lineMat = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent, 
        transparent: true, 
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      // Ali wireframe estese DISABILITATE - ali sono sempre e solo solid

      // Add wireframe to specific parts (exclude body/head, belly, and wings)
      const partsForWireframe = [
        // this.penguinParts.body, // RIMOSSO: evita wireframe attorno alla testa pera
        // this.penguinParts.belly, // RIMOSSO: wireframe pancia troppo complicato
        this.penguinParts.beak,
        // Ali RIMOSSE: niente wireframe per le ali
        this.penguinParts.tail
      ];

      console.log('🔍 Wireframe parts check:', {
        body: !!this.penguinParts.body,
        belly: !!this.penguinParts.belly,
        beak: !!this.penguinParts.beak
      });

      partsForWireframe.forEach((part, index) => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);
          const lines = new THREE.LineSegments(edges, lineMat.clone());
          lines.frustumCulled = false;
          lines.renderOrder = 2; // Higher render order for belly
          part.add(lines);
          this.wireframeLines.push(lines);
          console.log(`✅ Wireframe added to part ${index}:`, part.constructor.name);
        } else {
          console.log(`❌ Missing part ${index}`);
        }
      });

      // Add wireframe to feet (not in penguinParts)
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForWireframe.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);
          const lines = new THREE.LineSegments(edges, lineMat.clone());
          lines.frustumCulled = false;
          lines.renderOrder = 1;
          obj.add(lines);
          this.wireframeLines.push(lines);
        }
      });
    }

    applyDashedOverlay() {
      const THREE = window.THREE;

      // Add dynamic tech lighting
      const techLight = new THREE.PointLight(this.config.wireframeAccent, 0.4, 6);
      techLight.position.set(-1, 1.5, 2);
      this.scene.add(techLight);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Ali wireframe estese DISABILITATE - ali sono sempre e solo solid

      // Add dashed to specific parts (exclude body/head, belly, and wings)
      const partsForDashed = [
        // this.penguinParts.body, // RIMOSSO: evita wireframe attorno alla testa pera
        // this.penguinParts.belly, // RIMOSSO: wireframe pancia troppo complicato
        this.penguinParts.beak,
        // Ali RIMOSSE: niente wireframe per le ali
        this.penguinParts.tail
      ];

      partsForDashed.forEach(part => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);
          
          const dashedMat = new THREE.LineDashedMaterial({
            color: this.config.wireframeAccent,
            transparent: true,
            opacity: 0.85,
            dashSize: this.config.dash.size,
            gapSize: this.config.dash.gap,
            scale: this.config.dash.scale,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          const dashed = new THREE.LineSegments(edges, dashedMat);
          dashed.computeLineDistances();
          dashed.frustumCulled = false;
          dashed.renderOrder = 1; // Above solid
          part.add(dashed);

          this.dashedMaterials.push(dashedMat);
        }
      });

      // Add dashed to feet (not in penguinParts)  
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForDashed.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);
          
          const dashedMat = new THREE.LineDashedMaterial({
            color: this.config.wireframeAccent,
            transparent: true,
            opacity: 0.85,
            dashSize: this.config.dash.size,
            gapSize: this.config.dash.gap,
            scale: this.config.dash.scale,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          const dashed = new THREE.LineSegments(edges, dashedMat);
          dashed.computeLineDistances();
          dashed.frustumCulled = false;
          dashed.renderOrder = 1;
          obj.add(dashed);

          this.dashedMaterials.push(dashedMat);
        }
      });
    }

    applyNeonOverlay() {
      const THREE = window.THREE;
      
      // Add dramatic neon lighting to enhance the solid base
      const neonCore = new THREE.PointLight(this.config.wireframeAccent, 0.6, 5);
      neonCore.position.set(0, 1, 2);
      this.scene.add(neonCore);

      const neonRim = new THREE.PointLight(this.config.wireframeAccentAlt, 0.4, 8);
      neonRim.position.set(-2, 0.5, -1);
      this.scene.add(neonRim);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Ali wireframe estese DISABILITATE - ali sono sempre e solo solid

      // Materiali per "glow" overlay
      const makeHaloMat = (opacity) => new THREE.LineBasicMaterial({
        color: this.config.wireframeAccentAlt,  // mint
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const coreMat = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent,     // cyan
        transparent: true,
        opacity: this.config.neon.base,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      // Add neon to specific parts (exclude body/head, belly, and wings)
      const partsForNeon = [
        // this.penguinParts.body, // RIMOSSO: evita wireframe attorno alla testa pera
        // this.penguinParts.belly, // RIMOSSO: wireframe pancia troppo complicato
        this.penguinParts.beak,
        // Ali RIMOSSE: niente wireframe per le ali
        this.penguinParts.tail
      ];

      partsForNeon.forEach(part => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);

          // CORE neon lines
          const core = new THREE.LineSegments(edges, coreMat.clone());
          core.renderOrder = 3; // Top layer
          core.frustumCulled = false;
          part.add(core);
          this.neonCores.push(core.material);

          // HALO 1 (outer glow)
          const halo1 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[0]));
          halo1.renderOrder = 1;
          halo1.scale.setScalar(this.config.neon.haloScales[0]);
          halo1.frustumCulled = false;
          part.add(halo1);
          this.neonHalos.push(halo1.material);

          // HALO 2 (inner glow)
          const halo2 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[1]));
          halo2.renderOrder = 2;
          halo2.scale.setScalar(this.config.neon.haloScales[1]);
          halo2.frustumCulled = false;
          part.add(halo2);
          this.neonHalos.push(halo2.material);
        }
      });

      // Add neon to feet (not in penguinParts)
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForNeon.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);

          // CORE neon lines
          const core = new THREE.LineSegments(edges, coreMat.clone());
          core.renderOrder = 3;
          core.frustumCulled = false;
          obj.add(core);
          this.neonCores.push(core.material);

          // HALO 1 (outer glow)
          const halo1 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[0]));
          halo1.renderOrder = 1;
          halo1.scale.setScalar(this.config.neon.haloScales[0]);
          halo1.frustumCulled = false;
          obj.add(halo1);
          this.neonHalos.push(halo1.material);

          // HALO 2 (inner glow)
          const halo2 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[1]));
          halo2.renderOrder = 2;
          halo2.scale.setScalar(this.config.neon.haloScales[1]);
          halo2.frustumCulled = false;
          obj.add(halo2);
          this.neonHalos.push(halo2.material);
        }
      });
    }



    setupCamera() {
      const THREE = window.THREE;
      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
      this.camera.position.set(0, 0, 4);
      this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
      const THREE = window.THREE;

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });

      // Color space moderno (r152+)
      if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      }

      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.container.appendChild(this.renderer.domElement);
    }

    bindEvents() {
      // Resize
      this.eventHandlers.resize = () => this.handleResize();
      window.addEventListener('resize', this.eventHandlers.resize, { passive: true });

      if (this.config.enableInteraction) {
        // Mouse
        this.eventHandlers.mouseMove = (e) => this.handleMouseMove(e);
        this.eventHandlers.mouseDown = (e) => this.handleMouseDown(e);
        this.eventHandlers.mouseUp = (e) => this.handleMouseUp(e);
        this.eventHandlers.click = (e) => this.handleClick(e);

        this.container.addEventListener('mousemove', this.eventHandlers.mouseMove);
        this.container.addEventListener('mousedown', this.eventHandlers.mouseDown);
        this.container.addEventListener('mouseup', this.eventHandlers.mouseUp);
        this.container.addEventListener('click', this.eventHandlers.click);

        // Touch (wrappers per avere clientX/Y)
        this.eventHandlers.touchStart = (e) => {
          const t = e.touches && e.touches[0] ? e.touches[0] : e;
          this.handleMouseDown(t);
        };
        this.eventHandlers.touchEnd = (e) => {
          const t = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
          this.handleMouseUp(t);
        };
        this.eventHandlers.touchMove = (e) => {
          const t = e.touches && e.touches[0] ? e.touches[0] : e;
          this.handleMouseMove(t);
        };

        this.container.addEventListener('touchstart', this.eventHandlers.touchStart, { passive: false });
        this.container.addEventListener('touchend', this.eventHandlers.touchEnd, { passive: true });
        this.container.addEventListener('touchmove', this.eventHandlers.touchMove, { passive: false });
      }
    }

    handleResize() {
      if (!this.camera || !this.renderer) return;
      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    handleMouseMove(event) {
      if (!this.container) return;
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Controllo rotazione manuale con mouse drag
      if (this.isMouseDown && this.penguin) {
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;
        
        // Rotazione orizzontale (Y axis) e verticale (X axis)
        this.penguin.rotation.y += deltaX * 0.01; // Sensibilità orizzontale
        this.penguin.rotation.x += deltaY * 0.01; // Sensibilità verticale
        
        // Limita la rotazione verticale per evitare capovolgimenti estremi
        this.penguin.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.penguin.rotation.x));
        
        this.previousMousePosition.x = event.clientX;
        this.previousMousePosition.y = event.clientY;
      }
    }

    handleMouseDown(event) {
      this.isMouseDown = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      this.triggerExcitedAnimation();
    }

    handleMouseUp() {
      this.isMouseDown = false;
    }

    handleClick() {
      this.triggerWaveAnimation();
      // Evento custom per integrazione AIceberg Mind
      window.dispatchEvent(new CustomEvent('aimoClick', {
        detail: { position: this.mouse, timestamp: Date.now() }
      }));
    }

    triggerWaveAnimation() {
      if (!this.penguinParts?.leftWing || !this.penguinParts?.rightWing) return;
      const duration = 1000;
      const startTime = Date.now();

      const animateWave = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const wave = Math.sin(progress * Math.PI * 4) * 0.5;

        this.penguinParts.leftWing.rotation.z = -0.3 + wave;
        this.penguinParts.rightWing.rotation.z = 0.3 - wave;

        if (progress < 1) {
          requestAnimationFrame(animateWave);
        } else {
          // Reset
          this.penguinParts.leftWing.rotation.z = -0.3;
          this.penguinParts.rightWing.rotation.z = 0.3;
        }
      };

      animateWave();
    }

    triggerExcitedAnimation() {
      if (!this.penguinParts?.group) return;
      const originalY = this.penguinParts.group.position.y;
      const duration = 500;
      const startTime = Date.now();

      const animateBounce = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const bounce = Math.sin(progress * Math.PI) * 0.2;

        this.penguinParts.group.position.y = originalY + bounce;

        if (progress < 1) requestAnimationFrame(animateBounce);
      };

      animateBounce();
    }

    startAnimation() {
      if (this.isAnimating) return;
      this.isAnimating = true;
      this.animate();
    }

    animate() {
      if (!this.isAnimating) return;

      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastFrameTime;

      // Limita FPS
      if (deltaTime < 1000 / this.maxFPS) {
        this.animationId = requestAnimationFrame(() => this.animate());
        return;
      }
      this.lastFrameTime = currentTime;

      this.updateIdleAnimations();

      // Auto-rotate DISABILITATO - controllo manuale con mouse
      // if (this.config.autoRotate && this.penguin && !this.isMouseDown) {
      //   this.penguin.rotation.y += 0.005;
      // }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      this.animationId = requestAnimationFrame(() => this.animate());
    }

    updateIdleAnimations() {
      if (!this.penguinParts?.body) return;

      // Respiro più vivace
      this.breathingTween.time += this.breathingTween.speed;
      const breathScale = 1 + Math.sin(this.breathingTween.time) * 0.03; // Più pronunciato
      this.penguinParts.body.scale.set(breathScale, breathScale, breathScale);

      // Pancino che rimbalza dolcemente
      if (this.penguinParts.belly) {
        this.bellyBounceTween.time += this.bellyBounceTween.speed;
        const bellyBounce = Math.sin(this.bellyBounceTween.time + Math.PI/3) * 0.02;
        this.penguinParts.belly.scale.set(1 + bellyBounce, 1 + bellyBounce * 0.5, 1 + bellyBounce);
      }

      // Ali più animate e simpatiche - sincronizza solid e wireframe
      this.wingFlapTween.time += this.wingFlapTween.speed;
      const wingFlap = Math.sin(this.wingFlapTween.time) * this.wingFlapTween.amplitude;

      if (this.penguinParts.leftWing && this.penguinParts.rightWing) {
        // 🪶 Ali solid adattate all'uovo - movimento più elegante
        this.penguinParts.leftWing.rotation.x = wingFlap * 0.07;
        this.penguinParts.rightWing.rotation.x = -wingFlap * 0.07;
        this.penguinParts.leftWing.rotation.z = -0.3 + wingFlap * 0.08;
        this.penguinParts.rightWing.rotation.z = 0.3 - wingFlap * 0.08;

        // Sincronizza le ali wireframe estese con le solid
        if (this.wireframeWings && this.wireframeWings.leftWing && this.wireframeWings.rightWing) {
          this.wireframeWings.leftWing.rotation.x = wingFlap * 0.07;
          this.wireframeWings.rightWing.rotation.x = -wingFlap * 0.07;
          this.wireframeWings.leftWing.rotation.z = -0.3 + wingFlap * 0.08;
          this.wireframeWings.rightWing.rotation.z = 0.3 - wingFlap * 0.08;
        }
      }

      // 🍐 Pera con movimento delicato - tutto il corpo si muove come un'unità
      this.headBobTween.time += this.headBobTween.speed;
      const pearBob = Math.sin(this.headBobTween.time) * this.headBobTween.amplitude;

      if (this.penguinParts.body && !this.isMouseDown) {
        this.penguinParts.body.position.y = -0.1 + pearBob * 0.025; // Movimento delicato della pera
      }

      // Sopracciglia animate - movimento su e giù per espressività
      if (this.wireframeEyebrows && this.wireframeEyebrows.length > 0) {
        this.eyebrowTween.time += this.eyebrowTween.speed;
        const eyebrowMove = Math.sin(this.eyebrowTween.time) * 0.03;
        
        this.wireframeEyebrows.forEach((eyebrow, index) => {
          const baseY = 0.95; // Aggiornato per la posizione alta sulla pera
          const phase = index * Math.PI * 0.3; // Leggero sfasamento tra le sopracciglia
          eyebrow.position.y = baseY + Math.sin(this.eyebrowTween.time + phase) * 0.02;
          
          // Leggera rotazione per più espressività
          eyebrow.rotation.z = Math.sin(this.eyebrowTween.time + phase) * 0.1;
        });
      }

      // === WIREFRAME ANIMATIONS ===

      // wireframe pulse
      if (this.wirePulse && this.wireframeLines && this.wireframeLines.length) {
        this.wirePulse.t += this.wirePulse.speed;
        const k = this.wirePulse.base + Math.sin(this.wirePulse.t) * this.wirePulse.amp;
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const opacity = clamp(k, 0.3, 1.0);
        for (const line of this.wireframeLines) {
          if (line.material) line.material.opacity = opacity;
        }
      }

      // dashed scroll
      if (this.dashedMaterials && this.dashedMaterials.length) {
        for (const m of this.dashedMaterials) {
          // r164 supporta dashOffset: crea un movimento "che scorre"
          m.dashOffset = (m.dashOffset ?? 0) - this.config.dash.speed;
          m.needsUpdate = true;
        }
      }

      // NEON pulse (soft)
      if (this.neonCores && this.neonCores.length) {
        this.neonPulse.t += this.config.neon.pulseSpeed;
        const k = this.config.neon.base + Math.sin(this.neonPulse.t) * this.config.neon.amp; // 0..1
        // clamp e applica
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const coreOpacity = clamp(k, 0.45, 1.0);
        const haloOpacity = clamp(k * 0.35, 0.05, 0.35);

        for (const m of this.neonCores) { m.opacity = coreOpacity; }
        for (const m of this.neonHalos) { m.opacity = haloOpacity; }
      }
    }

    showFallback() {
      if (this.container) {
        this.container.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-family:var(--font-display);">
            <div style="font-size:3rem;margin-bottom:0.5rem;">🐧</div>
            <div style="font-size:0.875rem;text-align:center;">AIMo<br><small>3D version disabled on mobile</small></div>
          </div>
        `;
      }
    }

    show() {
      if (this.container) {
        this.container.style.display = 'block';
        this.container.style.opacity = '1';
      }
    }

    hide() {
      if (this.container) {
        this.container.style.opacity = '0';
        setTimeout(() => {
          if (this.container) this.container.style.display = 'none';
        }, 300);
      }
    }

    isMobileDevice() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    stopAnimation() {
      this.isAnimating = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    cleanup() {
      const THREE = window.THREE;
      // Stop
      this.stopAnimation();

      // Remove listeners con mappa esplicita
      const map = {
        mouseMove: 'mousemove',
        mouseDown: 'mousedown',
        mouseUp: 'mouseup',
        click: 'click',
        touchStart: 'touchstart',
        touchEnd: 'touchend',
        touchMove: 'touchmove'
      };

      if (this.eventHandlers.resize) {
        window.removeEventListener('resize', this.eventHandlers.resize);
      }

      Object.keys(map).forEach((key) => {
        const handler = this.eventHandlers[key];
        if (handler && this.container) {
          this.container.removeEventListener(map[key], handler);
        }
      });

      // Dispose Three.js resources
      if (this.scene) {
        this.scene.traverse((obj) => {
          if (obj.isMesh) {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach((m) => m.dispose?.());
              } else {
                obj.material.dispose?.();
              }
            }
          }
        });
      }

      // Dispose wireframe materials
      [...this.wireframeLines, ...this.dashedMaterials, ...this.neonCores, ...this.neonHalos].forEach(item => {
        if (item && item.dispose) item.dispose();
      });
      
      // Clear arrays
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];

      if (this.renderer) {
        this.renderer.dispose?.();
        if (this.renderer.domElement?.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }

      console.log('🐧 PenguinModule cleaned up');
    }
  }

  // Export globale per uso in Astro (script non-module)
  window.PenguinModule = PenguinModule;
})();


































































/* === PENGUIN MODULE - Three.js 3D Penguin (r164+ compatible) ===
 * - RIMOSSA ogni logica di auto-caricamento di Three.js (usa window.THREE già caricato)
 * - Aggiunto supporto color space r152+ (renderer.outputColorSpace = THREE.SRGBColorSpace)
 * - Fix cleanup eventi + touch
 * - Nessuna dipendenza ESM: esporta in window.PenguinModule
 */

(function () {
  class PenguinModule {
    constructor(config = {}) {
      this.config = {
        containerId: 'penguin-container',
        modelPath: null, // programmatic penguin
        enableAnimation: true,
        enableInteraction: true,
        autoRotate: false,
        enableMobile: false,

        // === NEW: rendering styles ===
        style: 'solid',                     // 'solid' | 'wireframe' | 'dashed' | 'neon'
        wireframeAccent: 0x3ac8f5,          // cyan
        wireframeAccentAlt: 0x5ee4c3,       // mint (per neon/parti alternate)
        edgesThreshold: 28,                 // soglia angoli per EdgesGeometry

        // dashed options
        dash: { size: 0.6, gap: 0.35, speed: 0.002, scale: 1 },

        // neon options (glow finto)
        neon: {
          haloScales: [1.025, 1.012],     // due gusci leggermente più grandi
          haloOpacities: [0.08, 0.15],    // opacità base dei gusci
          pulseSpeed: 0.02,               // velocità del "respiro"
          base: 0.75,                     // opacità base del core line
          amp: 0.22                       // ampiezza del pulse
        },

        ...config
      };

      // Three.js core
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.penguin = null;
      this.mixer = null;

      // Animation
      this.clock = null;
      this.isAnimating = false;
      this.animationId = null;

      // Interaction
      this.mouse = { x: 0, y: 0 };
      this.raycaster = null;
      this.isMouseDown = false;
      this.previousMousePosition = { x: 0, y: 0 };

      // Performance
      this.lastFrameTime = 0;
      this.frameSkip = 0;
      this.maxFPS = 60;

      // Event handlers (per cleanup accurato)
      this.eventHandlers = {
        resize: null,
        mouseMove: null,
        mouseDown: null,
        mouseUp: null,
        click: null,
        touchStart: null,
        touchEnd: null,
        touchMove: null
      };

      // Wireframe containers
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];
      this.neonPulse = { t: 0 };

      this.init();
    }

    // === Init (senza auto-loader) ===
    init() {
      if (typeof window === 'undefined' || typeof window.THREE === 'undefined') {
        console.error('🐧 PenguinModule: Three.js non è caricato. Caricalo PRIMA del modulo.');
        return;
      }
      // Abilita color management moderno (r152+)
      if (window.THREE.ColorManagement) {
        window.THREE.ColorManagement.enabled = true;
      }
      this.initPenguin();
    }

    initPenguin() {
      // Mobile off?
      if (this.isMobileDevice() && !this.config.enableMobile) {
        console.log('🐧 PenguinModule: disabilitato su mobile per performance');
        this.createContainer(); // serve per mostrare il fallback dentro al container
        this.showFallback();
        return;
      }

      this.createContainer();
      if (!this.container) return;

      this.setupScene();
      this.createPenguin();
      
      // Apply rendering style after penguin creation (includes lighting)
      this.applyRenderingStyle(this.config.style);
      
      this.setupCamera();
      this.setupRenderer();
      this.bindEvents();
      this.startAnimation();

      console.log('🐧 PenguinModule initialized (Three r' + (window.THREE?.REVISION || '?') + ')');
    }

    createContainer() {
      this.container = document.getElementById(this.config.containerId);
      if (!this.container) {
        console.error('🐧 PenguinModule: container non trovato:', this.config.containerId);
      }
    }

    setupScene() {
      const THREE = window.THREE;
      this.scene = new THREE.Scene();
      this.scene.background = null; // trasparente
      // Leggera foschia per profondità
      this.scene.fog = new THREE.Fog(0x0f2b3a, 5, 15);

      this.mouse = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();
      this.clock = new THREE.Clock();
    }

    createPenguin() {
      const THREE = window.THREE;
      const penguinGroup = new THREE.Group();

      // Materiali brand AIceberg Mind
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 30,
        specular: 0x222222
      });

      const bellyMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 50,
        specular: 0x444444
      });

      const beakMaterial = new THREE.MeshPhongMaterial({
        color: 0x3ac8f5, // brand cyan
        shininess: 80,
        specular: 0x5ee4c3 // brand mint
      });

      const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        shininess: 100
      });

      // Materiale speciale per ali con migliore visibilità
      const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a, // Stesso nero del corpo
        shininess: 60,   // Più lucido per catturare la luce
        specular: 0x333333, // Riflessi più evidenti
        emissive: 0x0a0a0a, // Leggera emissione per visibilità
        flatShading: false // Shading smooth per definizione
      });

      // 🍐 CORPO A PERA - LatheGeometry per profilo perfetto!
      const pearProfile = [];
      
      // Definisco il profilo della pera ACCORCIATA come nell'immagine
      // Parte inferiore più corta, zampe più vicine al corpo
      pearProfile.push(new THREE.Vector2(0.05, -0.8));    // Base più alta (era -1.2)
      pearProfile.push(new THREE.Vector2(0.7, -0.8));     // Fondo piatto più alto per zampe vicine
      pearProfile.push(new THREE.Vector2(0.8, -0.7));     // Curva più alta (era -1.1)
      pearProfile.push(new THREE.Vector2(0.9, -0.5));     // Parte larga più alta (era -0.8)
      pearProfile.push(new THREE.Vector2(0.9, -0.2));     // Continua largo più alto (era -0.4)
      pearProfile.push(new THREE.Vector2(0.85, 0.0));     // Restrizione (era -0.1)
      pearProfile.push(new THREE.Vector2(0.75, 0.3));     // Restrizione media (era 0.2)
      pearProfile.push(new THREE.Vector2(0.6, 0.6));      // Parte alta (era 0.5)
      pearProfile.push(new THREE.Vector2(0.5, 0.9));      // Collo della pera (era 0.8)
      pearProfile.push(new THREE.Vector2(0.45, 1.1));     // Quasi in cima (era 1.0)
      pearProfile.push(new THREE.Vector2(0.35, 1.2));     // Sommità (era 1.1)
      pearProfile.push(new THREE.Vector2(0.05, 1.3));     // Punta più alta (era 1.2)
      
      const pearBodyGeometry = new THREE.LatheGeometry(pearProfile, 32); // 32 segmenti per smoothness
      const pearBody = new THREE.Mesh(pearBodyGeometry, bodyMaterial);
      pearBody.position.y = 0.0;
      pearBody.scale.set(0.7, 0.8, 0.7); // Scala finale per proporzioni giuste
      
      penguinGroup.add(pearBody);
      
      console.log('🍐 LatheGeometry pear body created:', {
        method: 'Revolution of custom pear profile',
        segments: 32,
        profilePoints: pearProfile.length,
        shape: 'Wide bottom → Narrow top (true pear!)',
        visible: pearBody.visible
      });

      // 🤍 Pancia - Finisce ESATTAMENTE dove finisce il corpo (Y: -0.8)
      const bellyGeometry = new THREE.SphereGeometry(0.6, 16, 12);
      bellyGeometry.scale(0.8, 1.2, 0.6); // Dimensionata per finire con il corpo, non oltre
      const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
      belly.position.set(0, -0.2, 0.65); // Centrata per finire alla base del corpo (-0.8)
      penguinGroup.add(belly);

      // 🧠 La "testa" ora è parte della pera - solo riferimento logico per animazioni
      const head = pearBody; // La testa è ora parte della pera unificata!

      // Occhi rimossi dal solid - vengono aggiunti solo negli overlay wireframe

      // 🐧 Becco - Nella parte alta della pera, come nell'immagine di riferimento
      const beakGeometry = new THREE.ConeGeometry(0.15, 0.4, 6);
      const beak = new THREE.Mesh(beakGeometry, beakMaterial);
      beak.position.set(0, 0.6, 0.7); // Molto più in alto, parte superiore della pera
      beak.rotation.x = Math.PI / 2;
      penguinGroup.add(beak);

      // 🐧 Ali-Pinne - Con spessore maggiore per visibilità laterale!
      const wingGeometry = new THREE.SphereGeometry(0.35, 8, 6);
      wingGeometry.scale(0.5, 1.4, 0.8); // Spessore aumentato: X da 0.3 → 0.5

      const leftWing = new THREE.Mesh(wingGeometry, wingMaterial); // Materiale speciale per visibilità
      leftWing.position.set(-0.75, -0.1, 0.15); // All'altezza dell'inizio pancia
      leftWing.rotation.z = -0.4; // Inclinazione naturale
      leftWing.rotation.y = -0.1; // Leggero orientamento laterale
      penguinGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeometry, wingMaterial); // Materiale speciale per visibilità
      rightWing.position.set(0.75, -0.1, 0.15); // All'altezza dell'inizio pancia
      rightWing.rotation.z = 0.4; // Inclinazione naturale
      rightWing.rotation.y = 0.1; // Leggero orientamento laterale
      penguinGroup.add(rightWing);

      // 🦶 Zampe - Riportate alla posizione originale
      const footGeometry = new THREE.SphereGeometry(0.25, 8, 6);
      footGeometry.scale(2.0, 0.4, 1.2); // Più larghe e lunghe per zampe realistiche

      const leftFoot = new THREE.Mesh(footGeometry, beakMaterial);
      leftFoot.position.set(-0.3, -0.9, 0.8); // Riportate alla posizione originale
      penguinGroup.add(leftFoot);

      const rightFoot = new THREE.Mesh(footGeometry, beakMaterial);
      rightFoot.position.set(0.3, -0.9, 0.8); // Riportate alla posizione originale
      penguinGroup.add(rightFoot);

      // 🍃 Coda - Adattata alla parte posteriore dell'uovo
      const tailGeometry = new THREE.SphereGeometry(0.18, 8, 6);
      tailGeometry.scale(0.7, 0.45, 0.9); // Proporzionata all'uovo
      const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
      tail.position.set(0, 0.0, -0.7); // Dietro l'uovo, leggermente centrata
      tail.rotation.x = -0.15; // Angolo naturale
      penguinGroup.add(tail);
      
      // Scala/posizione
      penguinGroup.scale.setScalar(0.8);
      penguinGroup.position.y = -0.5;

      // FORZA visibilità ali solid - SEMPRE visibili!
      leftWing.visible = true;
      leftWing.frustumCulled = false; // Non nascondere mai per frustum culling
      rightWing.visible = true; 
      rightWing.frustumCulled = false; // Non nascondere mai per frustum culling

      // Riferimenti (ora con corpo a pera!)
      this.penguinParts = {
        group: penguinGroup,
        body: pearBody,       // 🍐 Corpo a pera 
        belly,                // 🤍 Pancia adattata
        head: pearBody,       // 🧠 Testa = corpo pera (riferimento logico)
        leftWing,             // 🪶 Ali SEMPRE visibili
        rightWing,            // 🪶 Ali SEMPRE visibili
        beak,                 // 🐧 Becco riposizionato
        tail                  // 🍃 Coda dietro la pera
      };
      
      // Container per occhi e sopracciglia wireframe (aggiunti dinamicamente)
      this.wireframeEyes = [];
      this.wireframeEyebrows = [];

      this.penguin = penguinGroup;
      this.scene.add(penguinGroup);

      // Animazione idle
      this.setupIdleAnimation();
    }

    setupIdleAnimation() {
      this.breathingTween = { time: 0, speed: 0.025 }; // Respiro più vivace
      this.wingFlapTween = { time: 0, speed: 0.04, amplitude: 0.25 }; // Ali più animate
      this.headBobTween = { time: 0, speed: 0.03, amplitude: 0.12 }; // Testa più vivace
      this.bellyBounceTween = { time: 0, speed: 0.02 }; // Nuovo: pancino che rimbalza
      this.eyebrowTween = { time: 0, speed: 0.035 }; // Nuovo: sopracciglia espressive
    }

    // === RENDERING STYLES ===
    
    applyRenderingStyle(style) {
      // Always apply solid base first for living penguin
      this.applySolidStyle();
      
      // Then apply wireframe overlay if not solid
      switch (style) {
        case 'solid':      /* Already applied above */   break;
        case 'wireframe':  this.applyWireframeOverlay(); break;
        case 'dashed':     this.applyDashedOverlay();    break;
        case 'neon':       this.applyNeonOverlay();      break;
        default:           /* Pure solid */              break;
      }
      this.currentStyle = style;
    }

    changeStyle(newStyle) {
      if (newStyle === this.currentStyle) return;
      
      // Clean up only wireframe overlays (keep solid base)
      this.cleanupWireframeOverlays();
      
      // Apply new style (solid base always maintained)
      this.applyRenderingStyle(newStyle);
      
      console.log('🐧 Style changed from', this.currentStyle, 'to', newStyle);
    }

    addWireframeEyes() {
      const THREE = window.THREE;
      
      // Materiale per occhi wireframe - più visibile
      const eyeMaterial = new THREE.MeshBasicMaterial({
        color: this.config.wireframeAccent,
        transparent: true,
        opacity: 1.0,
        wireframe: true
      });

      // 👁️ Occhi - Parte medio-alta della pera, sopra il becco
      const leftEyeGeometry = new THREE.SphereGeometry(0.15, 8, 6);
      leftEyeGeometry.scale(1.1, 1.2, 1.0); // Espressivi
      const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
      leftEye.position.set(-0.15, 0.8, 0.65); // Parte alta della pera, sopra il becco
      leftEye.renderOrder = 10;
      this.penguin.add(leftEye);
      this.wireframeEyes.push(leftEye);

      // Occhio destro  
      const rightEyeGeometry = new THREE.SphereGeometry(0.15, 8, 6);
      rightEyeGeometry.scale(1.1, 1.2, 1.0);
      const rightEye = new THREE.Mesh(rightEyeGeometry, eyeMaterial.clone());
      rightEye.position.set(0.15, 0.8, 0.65);
      rightEye.renderOrder = 10;
      this.penguin.add(rightEye);
      this.wireframeEyes.push(rightEye);

      // Sopracciglia animate - piccoli archi sopra gli occhi
      this.addWireframeEyebrows();

      console.log('👁️ Wireframe eyes added:', this.wireframeEyes.length);
      console.log('🤨 Wireframe eyebrows added:', this.wireframeEyebrows.length);
    }

    addWireframeEyebrows() {
      const THREE = window.THREE;
      
      // Materiale per sopracciglia
      const eyebrowMaterial = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent,
        transparent: true,
        opacity: 0.9,
        linewidth: 2
      });

      // Geometria arco per sopracciglia
      const createEyebrowGeometry = () => {
        const curve = new THREE.EllipseCurve(
          0, 0,            // center
          0.15, 0.08,      // xRadius, yRadius
          Math.PI * 0.2,   // start angle
          Math.PI * 0.8,   // end angle
          false,           // clockwise
          0                // rotation
        );
        
        const points = curve.getPoints(12);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
      };

      // 🤨 Sopracciglio sinistro - Sopra i nuovi occhi
      const leftEyebrowGeometry = createEyebrowGeometry();
      const leftEyebrow = new THREE.Line(leftEyebrowGeometry, eyebrowMaterial);
      leftEyebrow.position.set(-0.15, 0.95, 0.67); // Sopra gli occhi alzati
      leftEyebrow.renderOrder = 11;
      this.penguin.add(leftEyebrow);
      this.wireframeEyebrows.push(leftEyebrow);

      // Sopracciglio destro
      const rightEyebrowGeometry = createEyebrowGeometry();
      const rightEyebrow = new THREE.Line(rightEyebrowGeometry, eyebrowMaterial.clone());
      rightEyebrow.position.set(0.15, 0.95, 0.67); // Sopra gli occhi alzati
      rightEyebrow.renderOrder = 11;
      this.penguin.add(rightEyebrow);
      this.wireframeEyebrows.push(rightEyebrow);
    }

    cleanupWireframeOverlays() {
      // Clear only wireframe overlays, keep solid base intact
      [...this.wireframeLines, ...this.dashedMaterials, ...this.neonCores, ...this.neonHalos].forEach(item => {
        if (item && item.dispose) item.dispose();
      });
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];

      // Remove wireframe eyes
      this.wireframeEyes.forEach(eye => {
        if (eye.material) eye.material.dispose();
        if (eye.geometry) eye.geometry.dispose();
        if (eye.parent) eye.parent.remove(eye);
      });
      this.wireframeEyes = [];

      // Remove wireframe eyebrows
      this.wireframeEyebrows.forEach(eyebrow => {
        if (eyebrow.material) eyebrow.material.dispose();
        if (eyebrow.geometry) eyebrow.geometry.dispose();
        if (eyebrow.parent) eyebrow.parent.remove(eyebrow);
      });
      this.wireframeEyebrows = [];

      // Remove extended wireframe wings (NOT solid wings!)
      if (this.wireframeWings) {
        Object.values(this.wireframeWings).forEach(wing => {
          if (wing.material) wing.material.dispose();
          if (wing.geometry) wing.geometry.dispose();
          if (wing.parent) wing.parent.remove(wing);
        });
        this.wireframeWings = null;
        
        // Clean up references from penguinParts
        delete this.penguinParts.leftWingWireframe;
        delete this.penguinParts.rightWingWireframe;
      }

      // Remove only wireframe/line children from penguin parts - NON toccare le ali solid!
      this.penguin.traverse(obj => {
        // SKIP solid wings - non rimuovere mai le ali solid!
        if (obj === this.penguinParts.leftWing || obj === this.penguinParts.rightWing) {
          return; // NON toccare le ali solid!
        }
        
        if (obj.isMesh) {
          const linesToRemove = obj.children.filter(child => 
            child.type === 'LineSegments' || child.isLineSegments
          );
          linesToRemove.forEach(line => {
            if (line.material) line.material.dispose();
            if (line.geometry) line.geometry.dispose();
            obj.remove(line);
          });
        }
      });
    }

    cleanupCurrentStyle() {
      // Complete cleanup for destruction
      this.scene.children = this.scene.children.filter(obj => !obj.isLight);
      this.cleanupWireframeOverlays();
    }

    applySolidStyle() {
      const THREE = window.THREE;
      
      // Restore original fog
      this.scene.fog = new THREE.Fog(0x0f2b3a, 5, 15);
      
      // Setup solid lighting (original setup)
      const ambientLight = new THREE.AmbientLight(0x5ee4c3, 0.4);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(2, 3, 2);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      this.scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0x3ac8f5, 0.6, 10);
      pointLight.position.set(-2, 2, 2);
      this.scene.add(pointLight);

      const rimLight = new THREE.DirectionalLight(0x5ee4c3, 0.3);
      rimLight.position.set(-1, 1, -1);
      this.scene.add(rimLight);

      // Reset to original materials
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 30,
        specular: 0x222222
      });

      const bellyMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 50,
        specular: 0x444444
      });

      const beakMaterial = new THREE.MeshPhongMaterial({
        color: 0x3ac8f5, // brand cyan
        shininess: 80,
        specular: 0x5ee4c3 // brand mint
      });

      const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        shininess: 100
      });

      // Apply materials to penguin parts using direct references (no eyes in solid)
      if (this.penguinParts.body) this.penguinParts.body.material = bodyMaterial;
      if (this.penguinParts.belly) this.penguinParts.belly.material = bellyMaterial;
      if (this.penguinParts.head) this.penguinParts.head.material = bodyMaterial;
      if (this.penguinParts.beak) this.penguinParts.beak.material = beakMaterial;
      // Materiale speciale ali per migliore visibilità
      const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 60,
        specular: 0x333333,
        emissive: 0x0a0a0a,
        flatShading: false
      });
      if (this.penguinParts.leftWing) this.penguinParts.leftWing.material = wingMaterial;
      if (this.penguinParts.rightWing) this.penguinParts.rightWing.material = wingMaterial;
      if (this.penguinParts.tail) this.penguinParts.tail.material = bodyMaterial;
      
      // Apply to feet (traverse for feet since they're not in penguinParts)
      this.penguin.traverse((obj, index) => {
        if (obj.isMesh && !Object.values(this.penguinParts).includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          obj.material?.dispose?.();
          obj.material = beakMaterial;
        }
      });
    }

    createExtendedWireframeWings() {
      const THREE = window.THREE;
      
      // Create extended wings matching the new large flipper style
      const extendedWingGeometry = new THREE.SphereGeometry(0.38, 8, 6);
      extendedWingGeometry.scale(0.35, 1.5, 0.9); // Slightly larger than solid flippers for wireframe visibility

      // Create transparent material so only wireframe shows
      const transparentMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
        visible: false // Completely invisible, only wireframe will show
      });

      // Create extended wings - Large flippers for spectacular wireframe
      const leftWingExtended = new THREE.Mesh(extendedWingGeometry.clone(), transparentMaterial);
      leftWingExtended.position.set(-0.7, 0.3, 0.15); // Match solid flipper position
      leftWingExtended.rotation.z = -0.4; // Match solid flipper rotation
      leftWingExtended.rotation.y = -0.1;
      this.penguinParts.group.add(leftWingExtended);

      const rightWingExtended = new THREE.Mesh(extendedWingGeometry.clone(), transparentMaterial);
      rightWingExtended.position.set(0.7, 0.3, 0.15); // Match solid flipper position  
      rightWingExtended.rotation.z = 0.4; // Match solid flipper rotation
      rightWingExtended.rotation.y = 0.1;
      this.penguinParts.group.add(rightWingExtended);

      // Store reference to extended wings for wireframe use
      this.wireframeWings = {
        leftWing: leftWingExtended,
        rightWing: rightWingExtended
      };

      // Add wireframe wings to parts that need animation sync
      this.penguinParts.leftWingWireframe = leftWingExtended;
      this.penguinParts.rightWingWireframe = rightWingExtended;

      console.log('🪶 Extended wireframe wings created:', {
        left: !!leftWingExtended,
        right: !!rightWingExtended,
        geometry: 'Extended for better wireframe visibility',
        willAnimate: 'Synced with solid wings'
      });
    }

    applyWireframeOverlay() {
      const THREE = window.THREE;
      this.wirePulse = { t: 0, speed: 0.015, base: 0.85, amp: 0.10 };

      // Add subtle wireframe lighting to enhance the solid base
      const wireAccentLight = new THREE.PointLight(this.config.wireframeAccent, 0.3, 8);
      wireAccentLight.position.set(1, 2, 1);
      this.scene.add(wireAccentLight);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Overlay wireframe lines on top of solid materials
      const lineMat = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent, 
        transparent: true, 
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      // Ali wireframe estese DISABILITATE - ali sono sempre e solo solid

      // Add wireframe to specific parts (exclude body/head, belly, and wings)
      const partsForWireframe = [
        // this.penguinParts.body, // RIMOSSO: evita wireframe attorno alla testa pera
        // this.penguinParts.belly, // RIMOSSO: wireframe pancia troppo complicato
        this.penguinParts.beak,
        // Ali RIMOSSE: niente wireframe per le ali
        this.penguinParts.tail
      ];

      console.log('🔍 Wireframe parts check:', {
        body: !!this.penguinParts.body,
        belly: !!this.penguinParts.belly,
        beak: !!this.penguinParts.beak
      });

      partsForWireframe.forEach((part, index) => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);
          const lines = new THREE.LineSegments(edges, lineMat.clone());
          lines.frustumCulled = false;
          lines.renderOrder = 2; // Higher render order for belly
          part.add(lines);
          this.wireframeLines.push(lines);
          console.log(`✅ Wireframe added to part ${index}:`, part.constructor.name);
        } else {
          console.log(`❌ Missing part ${index}`);
        }
      });

      // Add wireframe to feet (not in penguinParts)
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForWireframe.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);
          const lines = new THREE.LineSegments(edges, lineMat.clone());
          lines.frustumCulled = false;
          lines.renderOrder = 1;
          obj.add(lines);
          this.wireframeLines.push(lines);
        }
      });
    }

    applyDashedOverlay() {
      const THREE = window.THREE;

      // Add dynamic tech lighting
      const techLight = new THREE.PointLight(this.config.wireframeAccent, 0.4, 6);
      techLight.position.set(-1, 1.5, 2);
      this.scene.add(techLight);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Ali wireframe estese DISABILITATE - ali sono sempre e solo solid

      // Add dashed to specific parts (exclude body/head, belly, and wings)
      const partsForDashed = [
        // this.penguinParts.body, // RIMOSSO: evita wireframe attorno alla testa pera
        // this.penguinParts.belly, // RIMOSSO: wireframe pancia troppo complicato
        this.penguinParts.beak,
        // Ali RIMOSSE: niente wireframe per le ali
        this.penguinParts.tail
      ];

      partsForDashed.forEach(part => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);
          
          const dashedMat = new THREE.LineDashedMaterial({
            color: this.config.wireframeAccent,
            transparent: true,
            opacity: 0.85,
            dashSize: this.config.dash.size,
            gapSize: this.config.dash.gap,
            scale: this.config.dash.scale,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          const dashed = new THREE.LineSegments(edges, dashedMat);
          dashed.computeLineDistances();
          dashed.frustumCulled = false;
          dashed.renderOrder = 1; // Above solid
          part.add(dashed);

          this.dashedMaterials.push(dashedMat);
        }
      });

      // Add dashed to feet (not in penguinParts)  
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForDashed.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);
          
          const dashedMat = new THREE.LineDashedMaterial({
            color: this.config.wireframeAccent,
            transparent: true,
            opacity: 0.85,
            dashSize: this.config.dash.size,
            gapSize: this.config.dash.gap,
            scale: this.config.dash.scale,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          const dashed = new THREE.LineSegments(edges, dashedMat);
          dashed.computeLineDistances();
          dashed.frustumCulled = false;
          dashed.renderOrder = 1;
          obj.add(dashed);

          this.dashedMaterials.push(dashedMat);
        }
      });
    }

    applyNeonOverlay() {
      const THREE = window.THREE;
      
      // Add dramatic neon lighting to enhance the solid base
      const neonCore = new THREE.PointLight(this.config.wireframeAccent, 0.6, 5);
      neonCore.position.set(0, 1, 2);
      this.scene.add(neonCore);

      const neonRim = new THREE.PointLight(this.config.wireframeAccentAlt, 0.4, 8);
      neonRim.position.set(-2, 0.5, -1);
      this.scene.add(neonRim);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Ali wireframe estese DISABILITATE - ali sono sempre e solo solid

      // Materiali per "glow" overlay
      const makeHaloMat = (opacity) => new THREE.LineBasicMaterial({
        color: this.config.wireframeAccentAlt,  // mint
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const coreMat = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent,     // cyan
        transparent: true,
        opacity: this.config.neon.base,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      // Add neon to specific parts (exclude body/head, belly, and wings)
      const partsForNeon = [
        // this.penguinParts.body, // RIMOSSO: evita wireframe attorno alla testa pera
        // this.penguinParts.belly, // RIMOSSO: wireframe pancia troppo complicato
        this.penguinParts.beak,
        // Ali RIMOSSE: niente wireframe per le ali
        this.penguinParts.tail
      ];

      partsForNeon.forEach(part => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);

          // CORE neon lines
          const core = new THREE.LineSegments(edges, coreMat.clone());
          core.renderOrder = 3; // Top layer
          core.frustumCulled = false;
          part.add(core);
          this.neonCores.push(core.material);

          // HALO 1 (outer glow)
          const halo1 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[0]));
          halo1.renderOrder = 1;
          halo1.scale.setScalar(this.config.neon.haloScales[0]);
          halo1.frustumCulled = false;
          part.add(halo1);
          this.neonHalos.push(halo1.material);

          // HALO 2 (inner glow)
          const halo2 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[1]));
          halo2.renderOrder = 2;
          halo2.scale.setScalar(this.config.neon.haloScales[1]);
          halo2.frustumCulled = false;
          part.add(halo2);
          this.neonHalos.push(halo2.material);
        }
      });

      // Add neon to feet (not in penguinParts)
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForNeon.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);

          // CORE neon lines
          const core = new THREE.LineSegments(edges, coreMat.clone());
          core.renderOrder = 3;
          core.frustumCulled = false;
          obj.add(core);
          this.neonCores.push(core.material);

          // HALO 1 (outer glow)
          const halo1 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[0]));
          halo1.renderOrder = 1;
          halo1.scale.setScalar(this.config.neon.haloScales[0]);
          halo1.frustumCulled = false;
          obj.add(halo1);
          this.neonHalos.push(halo1.material);

          // HALO 2 (inner glow)
          const halo2 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[1]));
          halo2.renderOrder = 2;
          halo2.scale.setScalar(this.config.neon.haloScales[1]);
          halo2.frustumCulled = false;
          obj.add(halo2);
          this.neonHalos.push(halo2.material);
        }
      });
    }



    setupCamera() {
      const THREE = window.THREE;
      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
      this.camera.position.set(0, 0, 4);
      this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
      const THREE = window.THREE;

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });

      // Color space moderno (r152+)
      if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      }

      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.container.appendChild(this.renderer.domElement);
    }

    bindEvents() {
      // Resize
      this.eventHandlers.resize = () => this.handleResize();
      window.addEventListener('resize', this.eventHandlers.resize, { passive: true });

      if (this.config.enableInteraction) {
        // Mouse
        this.eventHandlers.mouseMove = (e) => this.handleMouseMove(e);
        this.eventHandlers.mouseDown = (e) => this.handleMouseDown(e);
        this.eventHandlers.mouseUp = (e) => this.handleMouseUp(e);
        this.eventHandlers.click = (e) => this.handleClick(e);

        this.container.addEventListener('mousemove', this.eventHandlers.mouseMove);
        this.container.addEventListener('mousedown', this.eventHandlers.mouseDown);
        this.container.addEventListener('mouseup', this.eventHandlers.mouseUp);
        this.container.addEventListener('click', this.eventHandlers.click);

        // Touch (wrappers per avere clientX/Y)
        this.eventHandlers.touchStart = (e) => {
          const t = e.touches && e.touches[0] ? e.touches[0] : e;
          this.handleMouseDown(t);
        };
        this.eventHandlers.touchEnd = (e) => {
          const t = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
          this.handleMouseUp(t);
        };
        this.eventHandlers.touchMove = (e) => {
          const t = e.touches && e.touches[0] ? e.touches[0] : e;
          this.handleMouseMove(t);
        };

        this.container.addEventListener('touchstart', this.eventHandlers.touchStart, { passive: false });
        this.container.addEventListener('touchend', this.eventHandlers.touchEnd, { passive: true });
        this.container.addEventListener('touchmove', this.eventHandlers.touchMove, { passive: false });
      }
    }

    handleResize() {
      if (!this.camera || !this.renderer) return;
      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    handleMouseMove(event) {
      if (!this.container) return;
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Controllo rotazione manuale con mouse drag
      if (this.isMouseDown && this.penguin) {
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;
        
        // Rotazione orizzontale (Y axis) e verticale (X axis)
        this.penguin.rotation.y += deltaX * 0.01; // Sensibilità orizzontale
        this.penguin.rotation.x += deltaY * 0.01; // Sensibilità verticale
        
        // Limita la rotazione verticale per evitare capovolgimenti estremi
        this.penguin.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.penguin.rotation.x));
        
        this.previousMousePosition.x = event.clientX;
        this.previousMousePosition.y = event.clientY;
      }
    }

    handleMouseDown(event) {
      this.isMouseDown = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      this.triggerExcitedAnimation();
    }

    handleMouseUp() {
      this.isMouseDown = false;
    }

    handleClick() {
      this.triggerWaveAnimation();
      // Evento custom per integrazione AIceberg Mind
      window.dispatchEvent(new CustomEvent('aimoClick', {
        detail: { position: this.mouse, timestamp: Date.now() }
      }));
    }

    triggerWaveAnimation() {
      if (!this.penguinParts?.leftWing || !this.penguinParts?.rightWing) return;
      const duration = 1000;
      const startTime = Date.now();

      const animateWave = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const wave = Math.sin(progress * Math.PI * 4) * 0.5;

        this.penguinParts.leftWing.rotation.z = -0.3 + wave;
        this.penguinParts.rightWing.rotation.z = 0.3 - wave;

        if (progress < 1) {
          requestAnimationFrame(animateWave);
        } else {
          // Reset
          this.penguinParts.leftWing.rotation.z = -0.3;
          this.penguinParts.rightWing.rotation.z = 0.3;
        }
      };

      animateWave();
    }

    triggerExcitedAnimation() {
      if (!this.penguinParts?.group) return;
      const originalY = this.penguinParts.group.position.y;
      const duration = 500;
      const startTime = Date.now();

      const animateBounce = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const bounce = Math.sin(progress * Math.PI) * 0.2;

        this.penguinParts.group.position.y = originalY + bounce;

        if (progress < 1) requestAnimationFrame(animateBounce);
      };

      animateBounce();
    }

    startAnimation() {
      if (this.isAnimating) return;
      this.isAnimating = true;
      this.animate();
    }

    animate() {
      if (!this.isAnimating) return;

      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastFrameTime;

      // Limita FPS
      if (deltaTime < 1000 / this.maxFPS) {
        this.animationId = requestAnimationFrame(() => this.animate());
        return;
      }
      this.lastFrameTime = currentTime;

      this.updateIdleAnimations();

      // Auto-rotate DISABILITATO - controllo manuale con mouse
      // if (this.config.autoRotate && this.penguin && !this.isMouseDown) {
      //   this.penguin.rotation.y += 0.005;
      // }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      this.animationId = requestAnimationFrame(() => this.animate());
    }

    updateIdleAnimations() {
      if (!this.penguinParts?.body) return;

      // Respiro più vivace
      this.breathingTween.time += this.breathingTween.speed;
      const breathScale = 1 + Math.sin(this.breathingTween.time) * 0.03; // Più pronunciato
      this.penguinParts.body.scale.set(breathScale, breathScale, breathScale);

      // Pancino che rimbalza dolcemente
      if (this.penguinParts.belly) {
        this.bellyBounceTween.time += this.bellyBounceTween.speed;
        const bellyBounce = Math.sin(this.bellyBounceTween.time + Math.PI/3) * 0.02;
        this.penguinParts.belly.scale.set(1 + bellyBounce, 1 + bellyBounce * 0.5, 1 + bellyBounce);
      }

      // Ali più animate e simpatiche - sincronizza solid e wireframe
      this.wingFlapTween.time += this.wingFlapTween.speed;
      const wingFlap = Math.sin(this.wingFlapTween.time) * this.wingFlapTween.amplitude;

      if (this.penguinParts.leftWing && this.penguinParts.rightWing) {
        // 🪶 Ali solid adattate all'uovo - movimento più elegante
        this.penguinParts.leftWing.rotation.x = wingFlap * 0.07;
        this.penguinParts.rightWing.rotation.x = -wingFlap * 0.07;
        this.penguinParts.leftWing.rotation.z = -0.3 + wingFlap * 0.08;
        this.penguinParts.rightWing.rotation.z = 0.3 - wingFlap * 0.08;

        // Sincronizza le ali wireframe estese con le solid
        if (this.wireframeWings && this.wireframeWings.leftWing && this.wireframeWings.rightWing) {
          this.wireframeWings.leftWing.rotation.x = wingFlap * 0.07;
          this.wireframeWings.rightWing.rotation.x = -wingFlap * 0.07;
          this.wireframeWings.leftWing.rotation.z = -0.3 + wingFlap * 0.08;
          this.wireframeWings.rightWing.rotation.z = 0.3 - wingFlap * 0.08;
        }
      }

      // 🍐 Pera con movimento delicato - tutto il corpo si muove come un'unità
      this.headBobTween.time += this.headBobTween.speed;
      const pearBob = Math.sin(this.headBobTween.time) * this.headBobTween.amplitude;

      if (this.penguinParts.body && !this.isMouseDown) {
        this.penguinParts.body.position.y = -0.1 + pearBob * 0.025; // Movimento delicato della pera
      }

      // Sopracciglia animate - movimento su e giù per espressività
      if (this.wireframeEyebrows && this.wireframeEyebrows.length > 0) {
        this.eyebrowTween.time += this.eyebrowTween.speed;
        const eyebrowMove = Math.sin(this.eyebrowTween.time) * 0.03;
        
        this.wireframeEyebrows.forEach((eyebrow, index) => {
          const baseY = 0.95; // Aggiornato per la posizione alta sulla pera
          const phase = index * Math.PI * 0.3; // Leggero sfasamento tra le sopracciglia
          eyebrow.position.y = baseY + Math.sin(this.eyebrowTween.time + phase) * 0.02;
          
          // Leggera rotazione per più espressività
          eyebrow.rotation.z = Math.sin(this.eyebrowTween.time + phase) * 0.1;
        });
      }

      // === WIREFRAME ANIMATIONS ===

      // wireframe pulse
      if (this.wirePulse && this.wireframeLines && this.wireframeLines.length) {
        this.wirePulse.t += this.wirePulse.speed;
        const k = this.wirePulse.base + Math.sin(this.wirePulse.t) * this.wirePulse.amp;
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const opacity = clamp(k, 0.3, 1.0);
        for (const line of this.wireframeLines) {
          if (line.material) line.material.opacity = opacity;
        }
      }

      // dashed scroll
      if (this.dashedMaterials && this.dashedMaterials.length) {
        for (const m of this.dashedMaterials) {
          // r164 supporta dashOffset: crea un movimento "che scorre"
          m.dashOffset = (m.dashOffset ?? 0) - this.config.dash.speed;
          m.needsUpdate = true;
        }
      }

      // NEON pulse (soft)
      if (this.neonCores && this.neonCores.length) {
        this.neonPulse.t += this.config.neon.pulseSpeed;
        const k = this.config.neon.base + Math.sin(this.neonPulse.t) * this.config.neon.amp; // 0..1
        // clamp e applica
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const coreOpacity = clamp(k, 0.45, 1.0);
        const haloOpacity = clamp(k * 0.35, 0.05, 0.35);

        for (const m of this.neonCores) { m.opacity = coreOpacity; }
        for (const m of this.neonHalos) { m.opacity = haloOpacity; }
      }
    }

    showFallback() {
      if (this.container) {
        this.container.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-family:var(--font-display);">
            <div style="font-size:3rem;margin-bottom:0.5rem;">🐧</div>
            <div style="font-size:0.875rem;text-align:center;">AIMo<br><small>3D version disabled on mobile</small></div>
          </div>
        `;
      }
    }

    show() {
      if (this.container) {
        this.container.style.display = 'block';
        this.container.style.opacity = '1';
      }
    }

    hide() {
      if (this.container) {
        this.container.style.opacity = '0';
        setTimeout(() => {
          if (this.container) this.container.style.display = 'none';
        }, 300);
      }
    }

    isMobileDevice() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    stopAnimation() {
      this.isAnimating = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    cleanup() {
      const THREE = window.THREE;
      // Stop
      this.stopAnimation();

      // Remove listeners con mappa esplicita
      const map = {
        mouseMove: 'mousemove',
        mouseDown: 'mousedown',
        mouseUp: 'mouseup',
        click: 'click',
        touchStart: 'touchstart',
        touchEnd: 'touchend',
        touchMove: 'touchmove'
      };

      if (this.eventHandlers.resize) {
        window.removeEventListener('resize', this.eventHandlers.resize);
      }

      Object.keys(map).forEach((key) => {
        const handler = this.eventHandlers[key];
        if (handler && this.container) {
          this.container.removeEventListener(map[key], handler);
        }
      });

      // Dispose Three.js resources
      if (this.scene) {
        this.scene.traverse((obj) => {
          if (obj.isMesh) {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach((m) => m.dispose?.());
              } else {
                obj.material.dispose?.();
              }
            }
          }
        });
      }

      // Dispose wireframe materials
      [...this.wireframeLines, ...this.dashedMaterials, ...this.neonCores, ...this.neonHalos].forEach(item => {
        if (item && item.dispose) item.dispose();
      });
      
      // Clear arrays
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];

      if (this.renderer) {
        this.renderer.dispose?.();
        if (this.renderer.domElement?.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }

      console.log('🐧 PenguinModule cleaned up');
    }

    // === AIMO BUILDER CUSTOMIZATION METHODS ===

    // Aggiorna scala del corpo
    updateBodyScale(scaleX, scaleY, scaleZ) {
      if (!this.penguinParts?.body) return;
      this.penguinParts.body.scale.set(scaleX, scaleY, scaleZ);
    }

    // Aggiorna posizione del corpo
    updateBodyPosition(posX = null, posY = null, posZ = null) {
      if (!this.penguinParts?.body) return;
      if (posX !== null) this.penguinParts.body.position.x = posX;
      if (posY !== null) this.penguinParts.body.position.y = posY;
      if (posZ !== null) this.penguinParts.body.position.z = posZ;
    }

    // Aggiorna scala della pancia
    updateBellyScale(scaleX, scaleY, scaleZ) {
      if (!this.penguinParts?.belly) return;
      // Creiamo una nuova geometria per evitare accumulo di scaling
      const THREE = window.THREE;
      const newGeometry = new THREE.SphereGeometry(0.6, 16, 12);
      newGeometry.scale(scaleX, scaleY, scaleZ);
      
      // Dispose della vecchia geometria
      this.penguinParts.belly.geometry.dispose();
      this.penguinParts.belly.geometry = newGeometry;
    }

    // Aggiorna posizione della pancia
    updateBellyPosition(posX = null, posY = null, posZ = null) {
      if (!this.penguinParts?.belly) return;
      if (posX !== null) this.penguinParts.belly.position.x = posX;
      if (posY !== null) this.penguinParts.belly.position.y = posY;
      if (posZ !== null) this.penguinParts.belly.position.z = posZ;
    }

    // Aggiorna scala del becco
    updateBeakScale(scaleX, scaleY, scaleZ = 1) {
      if (!this.penguinParts?.beak) return;
      this.penguinParts.beak.scale.set(scaleX, scaleY, scaleZ);
    }

    // Aggiorna posizione del becco
    updateBeakPosition(posX = null, posY = null, posZ = null) {
      if (!this.penguinParts?.beak) return;
      if (posX !== null) this.penguinParts.beak.position.x = posX;
      if (posY !== null) this.penguinParts.beak.position.y = posY;
      if (posZ !== null) this.penguinParts.beak.position.z = posZ;
    }

    // Aggiorna scala delle ali
    updateWingScale(scaleX, scaleY, scaleZ) {
      if (!this.penguinParts?.leftWing || !this.penguinParts?.rightWing) return;
      
      const THREE = window.THREE;
      
      // Crea nuove geometrie per le ali
      const newLeftGeometry = new THREE.SphereGeometry(0.35, 8, 6);
      newLeftGeometry.scale(scaleX, scaleY, scaleZ);
      
      const newRightGeometry = new THREE.SphereGeometry(0.35, 8, 6);
      newRightGeometry.scale(scaleX, scaleY, scaleZ);
      
      // Dispose delle vecchie geometrie
      this.penguinParts.leftWing.geometry.dispose();
      this.penguinParts.rightWing.geometry.dispose();
      
      // Applica le nuove geometrie
      this.penguinParts.leftWing.geometry = newLeftGeometry;
      this.penguinParts.rightWing.geometry = newRightGeometry;
    }

    // Aggiorna posizione delle ali
    updateWingPosition(posX, posY = null, posZ = null) {
      if (!this.penguinParts?.leftWing || !this.penguinParts?.rightWing) return;
      
      if (posY !== null) {
        this.penguinParts.leftWing.position.y = posY;
        this.penguinParts.rightWing.position.y = posY;
      }
      
      if (posZ !== null) {
        this.penguinParts.leftWing.position.z = posZ;
        this.penguinParts.rightWing.position.z = posZ;
      }
      
      // Posizione X è simmetrica
      this.penguinParts.leftWing.position.x = -posX;
      this.penguinParts.rightWing.position.x = posX;
    }

    // Aggiorna rotazione delle ali
    updateWingRotation(rotX = null, rotY = null, rotZ = null) {
      if (!this.penguinParts?.leftWing || !this.penguinParts?.rightWing) return;
      
      if (rotX !== null) {
        this.penguinParts.leftWing.rotation.x = rotX;
        this.penguinParts.rightWing.rotation.x = -rotX; // Simmetrica
      }
      
      if (rotY !== null) {
        this.penguinParts.leftWing.rotation.y = -rotY;
        this.penguinParts.rightWing.rotation.y = rotY; // Simmetrica
      }
      
      if (rotZ !== null) {
        this.penguinParts.leftWing.rotation.z = -rotZ;
        this.penguinParts.rightWing.rotation.z = rotZ; // Simmetrica
      }
    }

    // Aggiorna scala dei piedi
    updateFeetScale(scaleX, scaleY, scaleZ) {
      if (!this.penguin) return;
      
      const THREE = window.THREE;
      
      // Trova e aggiorna i piedi
      this.penguin.traverse((obj) => {
        if (obj.isMesh && !Object.values(this.penguinParts).includes(obj) && obj !== this.penguinParts.group) {
          // Crea nuova geometria per il piede
          const newGeometry = new THREE.SphereGeometry(0.25, 8, 6);
          newGeometry.scale(scaleX, scaleY, scaleZ);
          
          // Dispose della vecchia geometria
          obj.geometry.dispose();
          obj.geometry = newGeometry;
        }
      });
    }

    // Aggiorna posizione dei piedi
    updateFeetPosition(posX, posY = null, posZ = null) {
      if (!this.penguin) return;
      
      let feetCount = 0;
      this.penguin.traverse((obj) => {
        if (obj.isMesh && !Object.values(this.penguinParts).includes(obj) && obj !== this.penguinParts.group) {
          if (posY !== null) obj.position.y = posY;
          if (posZ !== null) obj.position.z = posZ;
          
          // Posizione X è simmetrica
          if (feetCount === 0) {
            obj.position.x = -posX; // Piede sinistro
          } else if (feetCount === 1) {
            obj.position.x = posX; // Piede destro
          }
          feetCount++;
        }
      });
    }

    // Aggiorna colore del corpo
    updateBodyColor(hexColor) {
      if (!this.penguinParts?.body) return;
      const color = parseInt(hexColor.replace('#', ''), 16);
      this.penguinParts.body.material.color.setHex(color);
      
      // Aggiorna anche le ali e la coda se hanno lo stesso materiale
      if (this.penguinParts.leftWing) this.penguinParts.leftWing.material.color.setHex(color);
      if (this.penguinParts.rightWing) this.penguinParts.rightWing.material.color.setHex(color);
      if (this.penguinParts.tail) this.penguinParts.tail.material.color.setHex(color);
    }

    // Aggiorna colore della pancia
    updateBellyColor(hexColor) {
      if (!this.penguinParts?.belly) return;
      const color = parseInt(hexColor.replace('#', ''), 16);
      this.penguinParts.belly.material.color.setHex(color);
    }

    // Aggiorna colore del becco e zampe
    updateBeakColor(hexColor) {
      if (!this.penguinParts?.beak) return;
      const color = parseInt(hexColor.replace('#', ''), 16);
      this.penguinParts.beak.material.color.setHex(color);
      
      // Aggiorna anche i piedi
      this.penguin.traverse((obj) => {
        if (obj.isMesh && !Object.values(this.penguinParts).includes(obj) && obj !== this.penguinParts.group) {
          obj.material.color.setHex(color);
        }
      });
    }

    // Aggiorna colore wireframe
    updateWireframeColor(hexColor) {
      const color = parseInt(hexColor.replace('#', ''), 16);
      this.config.wireframeAccent = color;
      
      // Se siamo in modalità wireframe, aggiorna immediatamente
      if (this.currentStyle !== 'solid') {
        this.changeStyle(this.currentStyle);
      }
    }

    // Esporta configurazione attuale
    exportConfig() {
      const config = {
        // Corpo
        bodyScale: {
          x: this.penguinParts?.body?.scale.x || 0.7,
          y: this.penguinParts?.body?.scale.y || 0.8,
          z: this.penguinParts?.body?.scale.z || 0.7
        },
        bodyPosition: {
          y: this.penguinParts?.body?.position.y || 0.0
        },
        
        // Pancia
        bellyPosition: {
          y: this.penguinParts?.belly?.position.y || -0.2,
          z: this.penguinParts?.belly?.position.z || 0.65
        },
        
        // Becco
        beakScale: {
          x: this.penguinParts?.beak?.scale.x || 1.0,
          y: this.penguinParts?.beak?.scale.y || 1.0
        },
        beakPosition: {
          y: this.penguinParts?.beak?.position.y || 0.6,
          z: this.penguinParts?.beak?.position.z || 0.7
        },
        
        // Ali
        wingPosition: {
          x: Math.abs(this.penguinParts?.rightWing?.position.x || 0.65),
          y: this.penguinParts?.rightWing?.position.y || -0.1
        },
        wingRotation: {
          z: this.penguinParts?.rightWing?.rotation.z || 0.4
        },
        
        // Colori
        bodyColor: '#' + (this.penguinParts?.body?.material.color.getHex() || 0x1a1a1a).toString(16).padStart(6, '0'),
        bellyColor: '#' + (this.penguinParts?.belly?.material.color.getHex() || 0xffffff).toString(16).padStart(6, '0'),
        beakColor: '#' + (this.penguinParts?.beak?.material.color.getHex() || 0x3ac8f5).toString(16).padStart(6, '0'),
        wireframeColor: '#' + (this.config.wireframeAccent || 0x3ac8f5).toString(16).padStart(6, '0'),
        
        // Stile
        style: this.currentStyle || 'solid'
      };
      
      return config;
    }

    // Importa configurazione
    importConfig(config) {
      try {
        // Applica tutte le configurazioni
        if (config.bodyScale) this.updateBodyScale(config.bodyScale.x, config.bodyScale.y, config.bodyScale.z);
        if (config.bodyPosition) this.updateBodyPosition(null, config.bodyPosition.y, null);
        
        if (config.bellyScale) this.updateBellyScale(config.bellyScale.x, config.bellyScale.y, config.bellyScale.z);
        if (config.bellyPosition) this.updateBellyPosition(null, config.bellyPosition.y, config.bellyPosition.z);
        
        if (config.beakScale) this.updateBeakScale(config.beakScale.x, config.beakScale.y);
        if (config.beakPosition) this.updateBeakPosition(null, config.beakPosition.y, config.beakPosition.z);
        
        if (config.wingScale) this.updateWingScale(config.wingScale.x, config.wingScale.y, config.wingScale.z);
        if (config.wingPosition) this.updateWingPosition(config.wingPosition.x, config.wingPosition.y);
        if (config.wingRotation) this.updateWingRotation(null, null, config.wingRotation.z);
        
        if (config.feetScale) this.updateFeetScale(config.feetScale.x, config.feetScale.y, config.feetScale.z);
        if (config.feetPosition) this.updateFeetPosition(config.feetPosition.x, config.feetPosition.y, config.feetPosition.z);
        
        if (config.bodyColor) this.updateBodyColor(config.bodyColor);
        if (config.bellyColor) this.updateBellyColor(config.bellyColor);
        if (config.beakColor) this.updateBeakColor(config.beakColor);
        if (config.wireframeColor) this.updateWireframeColor(config.wireframeColor);
        
        if (config.style) this.changeStyle(config.style);
        
        console.log('🎨 Configuration imported successfully');
        return true;
      } catch (error) {
        console.error('❌ Error importing configuration:', error);
        return false;
      }
    }

    // Reset alla configurazione di default
    resetToDefault() {
      const defaultConfig = {
        bodyScale: { x: 0.7, y: 0.8, z: 0.7 },
        bodyPosition: { y: 0.0 },
        bellyScale: { x: 0.8, y: 1.2, z: 0.6 },
        bellyPosition: { y: -0.2, z: 0.65 },
        beakScale: { x: 1.0, y: 1.0 },
        beakPosition: { y: 0.6, z: 0.7 },
        wingScale: { x: 0.5, y: 1.4, z: 0.8 },
        wingPosition: { x: 0.65, y: -0.1 },
        wingRotation: { z: 0.4 },
        feetScale: { x: 2.0, y: 0.4, z: 1.2 },
        feetPosition: { x: 0.3, y: -0.9, z: 0.8 },
        bodyColor: '#1a1a1a',
        bellyColor: '#ffffff',
        beakColor: '#3ac8f5',
        wireframeColor: '#3ac8f5',
        style: 'solid'
      };
      
      return this.importConfig(defaultConfig);
    }
  }

  // Export globale per uso in Astro (script non-module)
  window.PenguinModule = PenguinModule;
})();




























































/* === PENGUIN MODULE - Three.js 3D Penguin (r164+ compatible) ===
 * - RIMOSSA ogni logica di auto-caricamento di Three.js (usa window.THREE già caricato)
 * - Aggiunto supporto color space r152+ (renderer.outputColorSpace = THREE.SRGBColorSpace)
 * - Fix cleanup eventi + touch
 * - Nessuna dipendenza ESM: esporta in window.PenguinModule
 */

(function () {
  class PenguinModule {
    constructor(config = {}) {
      this.config = {
        containerId: 'penguin-container',
        modelPath: null, // programmatic penguin
        enableAnimation: true,
        enableInteraction: true,
        autoRotate: false,
        enableMobile: false,

        // === NEW: rendering styles ===
        style: 'solid',                     // 'solid' | 'wireframe' | 'dashed' | 'neon'
        wireframeAccent: 0x3ac8f5,          // cyan
        wireframeAccentAlt: 0x5ee4c3,       // mint (per neon/parti alternate)
        edgesThreshold: 28,                 // soglia angoli per EdgesGeometry

        // dashed options
        dash: { size: 0.6, gap: 0.35, speed: 0.002, scale: 1 },

        // neon options (glow finto)
        neon: {
          haloScales: [1.025, 1.012],     // due gusci leggermente più grandi
          haloOpacities: [0.08, 0.15],    // opacità base dei gusci
          pulseSpeed: 0.02,               // velocità del "respiro"
          base: 0.75,                     // opacità base del core line
          amp: 0.22                       // ampiezza del pulse
        },

        ...config
      };

      // Three.js core
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.penguin = null;
      this.mixer = null;

      // Animation
      this.clock = null;
      this.isAnimating = false;
      this.animationId = null;

      // Interaction
      this.mouse = { x: 0, y: 0 };
      this.raycaster = null;
      this.isMouseDown = false;
      this.previousMousePosition = { x: 0, y: 0 };

      // Performance
      this.lastFrameTime = 0;
      this.frameSkip = 0;
      this.maxFPS = 60;

      // Event handlers (per cleanup accurato)
      this.eventHandlers = {
        resize: null,
        mouseMove: null,
        mouseDown: null,
        mouseUp: null,
        click: null,
        touchStart: null,
        touchEnd: null,
        touchMove: null
      };

      // Wireframe containers
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];
      this.neonPulse = { t: 0 };

      this.init();
    }

    // === Init (senza auto-loader) ===
    init() {
      if (typeof window === 'undefined' || typeof window.THREE === 'undefined') {
        console.error('🐧 PenguinModule: Three.js non è caricato. Caricalo PRIMA del modulo.');
        return;
      }
      // Abilita color management moderno (r152+)
      if (window.THREE.ColorManagement) {
        window.THREE.ColorManagement.enabled = true;
      }
      this.initPenguin();
    }

    initPenguin() {
      // Mobile off?
      if (this.isMobileDevice() && !this.config.enableMobile) {
        console.log('🐧 PenguinModule: disabilitato su mobile per performance');
        this.createContainer(); // serve per mostrare il fallback dentro al container
        this.showFallback();
        return;
      }

      this.createContainer();
      if (!this.container) return;

      this.setupScene();
      this.createPenguin();
      
      // Apply rendering style after penguin creation (includes lighting)
      this.applyRenderingStyle(this.config.style);
      
      this.setupCamera();
      this.setupRenderer();
      this.bindEvents();
      this.startAnimation();

      console.log('🐧 PenguinModule initialized (Three r' + (window.THREE?.REVISION || '?') + ')');
    }

    createContainer() {
      this.container = document.getElementById(this.config.containerId);
      if (!this.container) {
        console.error('🐧 PenguinModule: container non trovato:', this.config.containerId);
      }
    }

    setupScene() {
      const THREE = window.THREE;
      this.scene = new THREE.Scene();
      this.scene.background = null; // trasparente
      // Leggera foschia per profondità
      this.scene.fog = new THREE.Fog(0x0f2b3a, 5, 15);

      this.mouse = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();
      this.clock = new THREE.Clock();
    }

    createPenguin() {
      const THREE = window.THREE;
      const penguinGroup = new THREE.Group();

      // Materiali brand AIceberg Mind
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 30,
        specular: 0x222222
      });

      const bellyMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 50,
        specular: 0x444444
      });

      const beakMaterial = new THREE.MeshPhongMaterial({
        color: 0x3ac8f5, // brand cyan
        shininess: 80,
        specular: 0x5ee4c3 // brand mint
      });

      const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        shininess: 100
      });

      // Materiale speciale per ali con migliore visibilità
      const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a, // Stesso nero del corpo
        shininess: 60,   // Più lucido per catturare la luce
        specular: 0x333333, // Riflessi più evidenti
        emissive: 0x0a0a0a, // Leggera emissione per visibilità
        flatShading: false // Shading smooth per definizione
      });

      // 🍐 CORPO A PERA - LatheGeometry per profilo perfetto!
      const pearProfile = [];
      
      // Definisco il profilo della pera ACCORCIATA come nell'immagine
      // Parte inferiore più corta, zampe più vicine al corpo
      pearProfile.push(new THREE.Vector2(0.05, -0.8));    // Base più alta (era -1.2)
      pearProfile.push(new THREE.Vector2(0.7, -0.8));     // Fondo piatto più alto per zampe vicine
      pearProfile.push(new THREE.Vector2(0.8, -0.7));     // Curva più alta (era -1.1)
      pearProfile.push(new THREE.Vector2(0.9, -0.5));     // Parte larga più alta (era -0.8)
      pearProfile.push(new THREE.Vector2(0.9, -0.2));     // Continua largo più alto (era -0.4)
      pearProfile.push(new THREE.Vector2(0.85, 0.0));     // Restrizione (era -0.1)
      pearProfile.push(new THREE.Vector2(0.75, 0.3));     // Restrizione media (era 0.2)
      pearProfile.push(new THREE.Vector2(0.6, 0.6));      // Parte alta (era 0.5)
      pearProfile.push(new THREE.Vector2(0.5, 0.9));      // Collo della pera (era 0.8)
      pearProfile.push(new THREE.Vector2(0.45, 1.1));     // Quasi in cima (era 1.0)
      pearProfile.push(new THREE.Vector2(0.35, 1.2));     // Sommità (era 1.1)
      pearProfile.push(new THREE.Vector2(0.05, 1.3));     // Punta più alta (era 1.2)
      
      const pearBodyGeometry = new THREE.LatheGeometry(pearProfile, 32); // 32 segmenti per smoothness
      const pearBody = new THREE.Mesh(pearBodyGeometry, bodyMaterial);
      pearBody.position.y = 0.0;
      pearBody.scale.set(0.7, 0.8, 0.7); // Scala finale per proporzioni giuste
      
      penguinGroup.add(pearBody);
      
      console.log('🍐 LatheGeometry pear body created:', {
        method: 'Revolution of custom pear profile',
        segments: 32,
        profilePoints: pearProfile.length,
        shape: 'Wide bottom → Narrow top (true pear!)',
        visible: pearBody.visible
      });

      // 🤍 Pancia - Finisce ESATTAMENTE dove finisce il corpo (Y: -0.8)
      const bellyGeometry = new THREE.SphereGeometry(0.6, 16, 12);
      bellyGeometry.scale(0.8, 1.2, 0.6); // Dimensionata per finire con il corpo, non oltre
      const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
      belly.position.set(0, -0.2, 0.65); // Centrata per finire alla base del corpo (-0.8)
      penguinGroup.add(belly);

      // 🧠 La "testa" ora è parte della pera - solo riferimento logico per animazioni
      const head = pearBody; // La testa è ora parte della pera unificata!

      // Occhi rimossi dal solid - vengono aggiunti solo negli overlay wireframe

      // 🐧 Becco - Nella parte alta della pera, come nell'immagine di riferimento
      const beakGeometry = new THREE.ConeGeometry(0.15, 0.4, 6);
      const beak = new THREE.Mesh(beakGeometry, beakMaterial);
      beak.position.set(0, 0.6, 0.7); // Molto più in alto, parte superiore della pera
      beak.rotation.x = Math.PI / 2;
      penguinGroup.add(beak);

      // 🐧 Ali-Pinne - Con spessore maggiore per visibilità laterale!
      const wingGeometry = new THREE.SphereGeometry(0.35, 8, 6);
      wingGeometry.scale(0.5, 1.4, 0.8); // Spessore aumentato: X da 0.3 → 0.5

      const leftWing = new THREE.Mesh(wingGeometry, wingMaterial); // Materiale speciale per visibilità
      leftWing.position.set(-0.75, -0.1, 0.15); // All'altezza dell'inizio pancia
      leftWing.rotation.z = -0.4; // Inclinazione naturale
      leftWing.rotation.y = -0.1; // Leggero orientamento laterale
      penguinGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeometry, wingMaterial); // Materiale speciale per visibilità
      rightWing.position.set(0.75, -0.1, 0.15); // All'altezza dell'inizio pancia
      rightWing.rotation.z = 0.4; // Inclinazione naturale
      rightWing.rotation.y = 0.1; // Leggero orientamento laterale
      penguinGroup.add(rightWing);

      // 🦶 Zampe - Riportate alla posizione originale
      const footGeometry = new THREE.SphereGeometry(0.25, 8, 6);
      footGeometry.scale(2.0, 0.4, 1.2); // Più larghe e lunghe per zampe realistiche

      const leftFoot = new THREE.Mesh(footGeometry, beakMaterial);
      leftFoot.position.set(-0.3, -0.9, 0.8); // Riportate alla posizione originale
      penguinGroup.add(leftFoot);

      const rightFoot = new THREE.Mesh(footGeometry, beakMaterial);
      rightFoot.position.set(0.3, -0.9, 0.8); // Riportate alla posizione originale
      penguinGroup.add(rightFoot);

      // 🍃 Coda - Adattata alla parte posteriore dell'uovo
      const tailGeometry = new THREE.SphereGeometry(0.18, 8, 6);
      tailGeometry.scale(0.7, 0.45, 0.9); // Proporzionata all'uovo
      const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
      tail.position.set(0, 0.0, -0.7); // Dietro l'uovo, leggermente centrata
      tail.rotation.x = -0.15; // Angolo naturale
      penguinGroup.add(tail);
      
      // Scala/posizione
      penguinGroup.scale.setScalar(0.8);
      penguinGroup.position.y = -0.5;

      // FORZA visibilità ali solid - SEMPRE visibili!
      leftWing.visible = true;
      leftWing.frustumCulled = false; // Non nascondere mai per frustum culling
      rightWing.visible = true; 
      rightWing.frustumCulled = false; // Non nascondere mai per frustum culling

      // Riferimenti (ora con corpo a pera!)
      this.penguinParts = {
        group: penguinGroup,
        body: pearBody,       // 🍐 Corpo a pera 
        belly,                // 🤍 Pancia adattata
        head: pearBody,       // 🧠 Testa = corpo pera (riferimento logico)
        leftWing,             // 🪶 Ali SEMPRE visibili
        rightWing,            // 🪶 Ali SEMPRE visibili
        beak,                 // 🐧 Becco riposizionato
        tail                  // 🍃 Coda dietro la pera
      };
      
      // Container per occhi e sopracciglia wireframe (aggiunti dinamicamente)
      this.wireframeEyes = [];
      this.wireframeEyebrows = [];

      this.penguin = penguinGroup;
      this.scene.add(penguinGroup);

      // Animazione idle
      this.setupIdleAnimation();
    }

    setupIdleAnimation() {
      this.breathingTween = { time: 0, speed: 0.025 }; // Respiro più vivace
      this.wingFlapTween = { time: 0, speed: 0.04, amplitude: 0.25 }; // Ali più animate
      this.headBobTween = { time: 0, speed: 0.03, amplitude: 0.12 }; // Testa più vivace
      this.bellyBounceTween = { time: 0, speed: 0.02 }; // Nuovo: pancino che rimbalza
      this.eyebrowTween = { time: 0, speed: 0.035 }; // Nuovo: sopracciglia espressive
    }

    // === RENDERING STYLES ===
    
    applyRenderingStyle(style) {
      // Always apply solid base first for living penguin
      this.applySolidStyle();
      
      // Then apply wireframe overlay if not solid
      switch (style) {
        case 'solid':      /* Already applied above */   break;
        case 'wireframe':  this.applyWireframeOverlay(); break;
        case 'dashed':     this.applyDashedOverlay();    break;
        case 'neon':       this.applyNeonOverlay();      break;
        default:           /* Pure solid */              break;
      }
      this.currentStyle = style;
    }

    changeStyle(newStyle) {
      if (newStyle === this.currentStyle) return;
      
      // Clean up only wireframe overlays (keep solid base)
      this.cleanupWireframeOverlays();
      
      // Apply new style (solid base always maintained)
      this.applyRenderingStyle(newStyle);
      
      console.log('🐧 Style changed from', this.currentStyle, 'to', newStyle);
    }

    addWireframeEyes() {
      const THREE = window.THREE;
      
      // Materiale per occhi wireframe - più visibile
      const eyeMaterial = new THREE.MeshBasicMaterial({
        color: this.config.wireframeAccent,
        transparent: true,
        opacity: 1.0,
        wireframe: true
      });

      // 👁️ Occhi - Parte medio-alta della pera, sopra il becco
      const leftEyeGeometry = new THREE.SphereGeometry(0.15, 8, 6);
      leftEyeGeometry.scale(1.1, 1.2, 1.0); // Espressivi
      const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
      leftEye.position.set(-0.15, 0.8, 0.65); // Parte alta della pera, sopra il becco
      leftEye.renderOrder = 10;
      this.penguin.add(leftEye);
      this.wireframeEyes.push(leftEye);

      // Occhio destro  
      const rightEyeGeometry = new THREE.SphereGeometry(0.15, 8, 6);
      rightEyeGeometry.scale(1.1, 1.2, 1.0);
      const rightEye = new THREE.Mesh(rightEyeGeometry, eyeMaterial.clone());
      rightEye.position.set(0.15, 0.8, 0.65);
      rightEye.renderOrder = 10;
      this.penguin.add(rightEye);
      this.wireframeEyes.push(rightEye);

      // Sopracciglia animate - piccoli archi sopra gli occhi
      this.addWireframeEyebrows();

      console.log('👁️ Wireframe eyes added:', this.wireframeEyes.length);
      console.log('🤨 Wireframe eyebrows added:', this.wireframeEyebrows.length);
    }

    addWireframeEyebrows() {
      const THREE = window.THREE;
      
      // Materiale per sopracciglia
      const eyebrowMaterial = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent,
        transparent: true,
        opacity: 0.9,
        linewidth: 2
      });

      // Geometria arco per sopracciglia
      const createEyebrowGeometry = () => {
        const curve = new THREE.EllipseCurve(
          0, 0,            // center
          0.15, 0.08,      // xRadius, yRadius
          Math.PI * 0.2,   // start angle
          Math.PI * 0.8,   // end angle
          false,           // clockwise
          0                // rotation
        );
        
        const points = curve.getPoints(12);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
      };

      // 🤨 Sopracciglio sinistro - Sopra i nuovi occhi
      const leftEyebrowGeometry = createEyebrowGeometry();
      const leftEyebrow = new THREE.Line(leftEyebrowGeometry, eyebrowMaterial);
      leftEyebrow.position.set(-0.15, 0.95, 0.67); // Sopra gli occhi alzati
      leftEyebrow.renderOrder = 11;
      this.penguin.add(leftEyebrow);
      this.wireframeEyebrows.push(leftEyebrow);

      // Sopracciglio destro
      const rightEyebrowGeometry = createEyebrowGeometry();
      const rightEyebrow = new THREE.Line(rightEyebrowGeometry, eyebrowMaterial.clone());
      rightEyebrow.position.set(0.15, 0.95, 0.67); // Sopra gli occhi alzati
      rightEyebrow.renderOrder = 11;
      this.penguin.add(rightEyebrow);
      this.wireframeEyebrows.push(rightEyebrow);
    }

    cleanupWireframeOverlays() {
      // Clear only wireframe overlays, keep solid base intact
      [...this.wireframeLines, ...this.dashedMaterials, ...this.neonCores, ...this.neonHalos].forEach(item => {
        if (item && item.dispose) item.dispose();
      });
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];

      // Remove wireframe eyes
      this.wireframeEyes.forEach(eye => {
        if (eye.material) eye.material.dispose();
        if (eye.geometry) eye.geometry.dispose();
        if (eye.parent) eye.parent.remove(eye);
      });
      this.wireframeEyes = [];

      // Remove wireframe eyebrows
      this.wireframeEyebrows.forEach(eyebrow => {
        if (eyebrow.material) eyebrow.material.dispose();
        if (eyebrow.geometry) eyebrow.geometry.dispose();
        if (eyebrow.parent) eyebrow.parent.remove(eyebrow);
      });
      this.wireframeEyebrows = [];

      // Remove extended wireframe wings (NOT solid wings!)
      if (this.wireframeWings) {
        Object.values(this.wireframeWings).forEach(wing => {
          if (wing.material) wing.material.dispose();
          if (wing.geometry) wing.geometry.dispose();
          if (wing.parent) wing.parent.remove(wing);
        });
        this.wireframeWings = null;
        
        // Clean up references from penguinParts
        delete this.penguinParts.leftWingWireframe;
        delete this.penguinParts.rightWingWireframe;
      }

      // Remove only wireframe/line children from penguin parts - NON toccare le ali solid!
      this.penguin.traverse(obj => {
        // SKIP solid wings - non rimuovere mai le ali solid!
        if (obj === this.penguinParts.leftWing || obj === this.penguinParts.rightWing) {
          return; // NON toccare le ali solid!
        }
        
        if (obj.isMesh) {
          const linesToRemove = obj.children.filter(child => 
            child.type === 'LineSegments' || child.isLineSegments
          );
          linesToRemove.forEach(line => {
            if (line.material) line.material.dispose();
            if (line.geometry) line.geometry.dispose();
            obj.remove(line);
          });
        }
      });
    }

    cleanupCurrentStyle() {
      // Complete cleanup for destruction
      this.scene.children = this.scene.children.filter(obj => !obj.isLight);
      this.cleanupWireframeOverlays();
    }

    applySolidStyle() {
      const THREE = window.THREE;
      
      // Restore original fog
      this.scene.fog = new THREE.Fog(0x0f2b3a, 5, 15);
      
      // Setup solid lighting (original setup)
      const ambientLight = new THREE.AmbientLight(0x5ee4c3, 0.4);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(2, 3, 2);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      this.scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0x3ac8f5, 0.6, 10);
      pointLight.position.set(-2, 2, 2);
      this.scene.add(pointLight);

      const rimLight = new THREE.DirectionalLight(0x5ee4c3, 0.3);
      rimLight.position.set(-1, 1, -1);
      this.scene.add(rimLight);

      // Reset to original materials
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 30,
        specular: 0x222222
      });

      const bellyMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 50,
        specular: 0x444444
      });

      const beakMaterial = new THREE.MeshPhongMaterial({
        color: 0x3ac8f5, // brand cyan
        shininess: 80,
        specular: 0x5ee4c3 // brand mint
      });

      const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        shininess: 100
      });

      // Apply materials to penguin parts using direct references (no eyes in solid)
      if (this.penguinParts.body) this.penguinParts.body.material = bodyMaterial;
      if (this.penguinParts.belly) this.penguinParts.belly.material = bellyMaterial;
      if (this.penguinParts.head) this.penguinParts.head.material = bodyMaterial;
      if (this.penguinParts.beak) this.penguinParts.beak.material = beakMaterial;
      // Materiale speciale ali per migliore visibilità
      const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 60,
        specular: 0x333333,
        emissive: 0x0a0a0a,
        flatShading: false
      });
      if (this.penguinParts.leftWing) this.penguinParts.leftWing.material = wingMaterial;
      if (this.penguinParts.rightWing) this.penguinParts.rightWing.material = wingMaterial;
      if (this.penguinParts.tail) this.penguinParts.tail.material = bodyMaterial;
      
      // Apply to feet (traverse for feet since they're not in penguinParts)
      this.penguin.traverse((obj, index) => {
        if (obj.isMesh && !Object.values(this.penguinParts).includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          obj.material?.dispose?.();
          obj.material = beakMaterial;
        }
      });
    }

    createExtendedWireframeWings() {
      const THREE = window.THREE;
      
      // Create extended wings matching the new large flipper style
      const extendedWingGeometry = new THREE.SphereGeometry(0.38, 8, 6);
      extendedWingGeometry.scale(0.35, 1.5, 0.9); // Slightly larger than solid flippers for wireframe visibility

      // Create transparent material so only wireframe shows
      const transparentMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
        visible: false // Completely invisible, only wireframe will show
      });

      // Create extended wings - Large flippers for spectacular wireframe
      const leftWingExtended = new THREE.Mesh(extendedWingGeometry.clone(), transparentMaterial);
      leftWingExtended.position.set(-0.7, 0.3, 0.15); // Match solid flipper position
      leftWingExtended.rotation.z = -0.4; // Match solid flipper rotation
      leftWingExtended.rotation.y = -0.1;
      this.penguinParts.group.add(leftWingExtended);

      const rightWingExtended = new THREE.Mesh(extendedWingGeometry.clone(), transparentMaterial);
      rightWingExtended.position.set(0.7, 0.3, 0.15); // Match solid flipper position  
      rightWingExtended.rotation.z = 0.4; // Match solid flipper rotation
      rightWingExtended.rotation.y = 0.1;
      this.penguinParts.group.add(rightWingExtended);

      // Store reference to extended wings for wireframe use
      this.wireframeWings = {
        leftWing: leftWingExtended,
        rightWing: rightWingExtended
      };

      // Add wireframe wings to parts that need animation sync
      this.penguinParts.leftWingWireframe = leftWingExtended;
      this.penguinParts.rightWingWireframe = rightWingExtended;

      console.log('🪶 Extended wireframe wings created:', {
        left: !!leftWingExtended,
        right: !!rightWingExtended,
        geometry: 'Extended for better wireframe visibility',
        willAnimate: 'Synced with solid wings'
      });
    }

    applyWireframeOverlay() {
      const THREE = window.THREE;
      this.wirePulse = { t: 0, speed: 0.015, base: 0.85, amp: 0.10 };

      // Add subtle wireframe lighting to enhance the solid base
      const wireAccentLight = new THREE.PointLight(this.config.wireframeAccent, 0.3, 8);
      wireAccentLight.position.set(1, 2, 1);
      this.scene.add(wireAccentLight);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Overlay wireframe lines on top of solid materials
      const lineMat = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent, 
        transparent: true, 
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      // Ali wireframe estese DISABILITATE - ali sono sempre e solo solid

      // Add wireframe to specific parts (exclude body/head, belly, and wings)
      const partsForWireframe = [
        // this.penguinParts.body, // RIMOSSO: evita wireframe attorno alla testa pera
        // this.penguinParts.belly, // RIMOSSO: wireframe pancia troppo complicato
        this.penguinParts.beak,
        // Ali RIMOSSE: niente wireframe per le ali
        this.penguinParts.tail
      ];

      console.log('🔍 Wireframe parts check:', {
        body: !!this.penguinParts.body,
        belly: !!this.penguinParts.belly,
        beak: !!this.penguinParts.beak
      });

      partsForWireframe.forEach((part, index) => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);
          const lines = new THREE.LineSegments(edges, lineMat.clone());
          lines.frustumCulled = false;
          lines.renderOrder = 2; // Higher render order for belly
          part.add(lines);
          this.wireframeLines.push(lines);
          console.log(`✅ Wireframe added to part ${index}:`, part.constructor.name);
        } else {
          console.log(`❌ Missing part ${index}`);
        }
      });

      // Add wireframe to feet (not in penguinParts)
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForWireframe.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);
          const lines = new THREE.LineSegments(edges, lineMat.clone());
          lines.frustumCulled = false;
          lines.renderOrder = 1;
          obj.add(lines);
          this.wireframeLines.push(lines);
        }
      });
    }

    applyDashedOverlay() {
      const THREE = window.THREE;

      // Add dynamic tech lighting
      const techLight = new THREE.PointLight(this.config.wireframeAccent, 0.4, 6);
      techLight.position.set(-1, 1.5, 2);
      this.scene.add(techLight);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Ali wireframe estese DISABILITATE - ali sono sempre e solo solid

      // Add dashed to specific parts (exclude body/head, belly, and wings)
      const partsForDashed = [
        // this.penguinParts.body, // RIMOSSO: evita wireframe attorno alla testa pera
        // this.penguinParts.belly, // RIMOSSO: wireframe pancia troppo complicato
        this.penguinParts.beak,
        // Ali RIMOSSE: niente wireframe per le ali
        this.penguinParts.tail
      ];

      partsForDashed.forEach(part => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);
          
          const dashedMat = new THREE.LineDashedMaterial({
            color: this.config.wireframeAccent,
            transparent: true,
            opacity: 0.85,
            dashSize: this.config.dash.size,
            gapSize: this.config.dash.gap,
            scale: this.config.dash.scale,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          const dashed = new THREE.LineSegments(edges, dashedMat);
          dashed.computeLineDistances();
          dashed.frustumCulled = false;
          dashed.renderOrder = 1; // Above solid
          part.add(dashed);

          this.dashedMaterials.push(dashedMat);
        }
      });

      // Add dashed to feet (not in penguinParts)  
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForDashed.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);
          
          const dashedMat = new THREE.LineDashedMaterial({
            color: this.config.wireframeAccent,
            transparent: true,
            opacity: 0.85,
            dashSize: this.config.dash.size,
            gapSize: this.config.dash.gap,
            scale: this.config.dash.scale,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          const dashed = new THREE.LineSegments(edges, dashedMat);
          dashed.computeLineDistances();
          dashed.frustumCulled = false;
          dashed.renderOrder = 1;
          obj.add(dashed);

          this.dashedMaterials.push(dashedMat);
        }
      });
    }

    applyNeonOverlay() {
      const THREE = window.THREE;
      
      // Add dramatic neon lighting to enhance the solid base
      const neonCore = new THREE.PointLight(this.config.wireframeAccent, 0.6, 5);
      neonCore.position.set(0, 1, 2);
      this.scene.add(neonCore);

      const neonRim = new THREE.PointLight(this.config.wireframeAccentAlt, 0.4, 8);
      neonRim.position.set(-2, 0.5, -1);
      this.scene.add(neonRim);

      // Add eyes only for wireframe styles
      this.addWireframeEyes();

      // Ali wireframe estese DISABILITATE - ali sono sempre e solo solid

      // Materiali per "glow" overlay
      const makeHaloMat = (opacity) => new THREE.LineBasicMaterial({
        color: this.config.wireframeAccentAlt,  // mint
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const coreMat = new THREE.LineBasicMaterial({
        color: this.config.wireframeAccent,     // cyan
        transparent: true,
        opacity: this.config.neon.base,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      // Add neon to specific parts (exclude body/head, belly, and wings)
      const partsForNeon = [
        // this.penguinParts.body, // RIMOSSO: evita wireframe attorno alla testa pera
        // this.penguinParts.belly, // RIMOSSO: wireframe pancia troppo complicato
        this.penguinParts.beak,
        // Ali RIMOSSE: niente wireframe per le ali
        this.penguinParts.tail
      ];

      partsForNeon.forEach(part => {
        if (part && part.isMesh) {
          const edges = new THREE.EdgesGeometry(part.geometry, this.config.edgesThreshold);

          // CORE neon lines
          const core = new THREE.LineSegments(edges, coreMat.clone());
          core.renderOrder = 3; // Top layer
          core.frustumCulled = false;
          part.add(core);
          this.neonCores.push(core.material);

          // HALO 1 (outer glow)
          const halo1 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[0]));
          halo1.renderOrder = 1;
          halo1.scale.setScalar(this.config.neon.haloScales[0]);
          halo1.frustumCulled = false;
          part.add(halo1);
          this.neonHalos.push(halo1.material);

          // HALO 2 (inner glow)
          const halo2 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[1]));
          halo2.renderOrder = 2;
          halo2.scale.setScalar(this.config.neon.haloScales[1]);
          halo2.frustumCulled = false;
          part.add(halo2);
          this.neonHalos.push(halo2.material);
        }
      });

      // Add neon to feet (not in penguinParts)
      this.penguin.traverse(obj => {
        if (obj.isMesh && obj !== this.penguinParts.head && 
            !partsForNeon.includes(obj) && obj !== this.penguinParts.group) {
          // These are the feet
          const edges = new THREE.EdgesGeometry(obj.geometry, this.config.edgesThreshold);

          // CORE neon lines
          const core = new THREE.LineSegments(edges, coreMat.clone());
          core.renderOrder = 3;
          core.frustumCulled = false;
          obj.add(core);
          this.neonCores.push(core.material);

          // HALO 1 (outer glow)
          const halo1 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[0]));
          halo1.renderOrder = 1;
          halo1.scale.setScalar(this.config.neon.haloScales[0]);
          halo1.frustumCulled = false;
          obj.add(halo1);
          this.neonHalos.push(halo1.material);

          // HALO 2 (inner glow)
          const halo2 = new THREE.LineSegments(edges, makeHaloMat(this.config.neon.haloOpacities[1]));
          halo2.renderOrder = 2;
          halo2.scale.setScalar(this.config.neon.haloScales[1]);
          halo2.frustumCulled = false;
          obj.add(halo2);
          this.neonHalos.push(halo2.material);
        }
      });
    }



    setupCamera() {
      const THREE = window.THREE;
      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
      this.camera.position.set(0, 0, 4);
      this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
      const THREE = window.THREE;

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });

      // Color space moderno (r152+)
      if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      }

      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.container.appendChild(this.renderer.domElement);
    }

    bindEvents() {
      // Resize
      this.eventHandlers.resize = () => this.handleResize();
      window.addEventListener('resize', this.eventHandlers.resize, { passive: true });

      if (this.config.enableInteraction) {
        // Mouse
        this.eventHandlers.mouseMove = (e) => this.handleMouseMove(e);
        this.eventHandlers.mouseDown = (e) => this.handleMouseDown(e);
        this.eventHandlers.mouseUp = (e) => this.handleMouseUp(e);
        this.eventHandlers.click = (e) => this.handleClick(e);

        this.container.addEventListener('mousemove', this.eventHandlers.mouseMove);
        this.container.addEventListener('mousedown', this.eventHandlers.mouseDown);
        this.container.addEventListener('mouseup', this.eventHandlers.mouseUp);
        this.container.addEventListener('click', this.eventHandlers.click);

        // Touch (wrappers per avere clientX/Y)
        this.eventHandlers.touchStart = (e) => {
          const t = e.touches && e.touches[0] ? e.touches[0] : e;
          this.handleMouseDown(t);
        };
        this.eventHandlers.touchEnd = (e) => {
          const t = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
          this.handleMouseUp(t);
        };
        this.eventHandlers.touchMove = (e) => {
          const t = e.touches && e.touches[0] ? e.touches[0] : e;
          this.handleMouseMove(t);
        };

        this.container.addEventListener('touchstart', this.eventHandlers.touchStart, { passive: false });
        this.container.addEventListener('touchend', this.eventHandlers.touchEnd, { passive: true });
        this.container.addEventListener('touchmove', this.eventHandlers.touchMove, { passive: false });
      }
    }

    handleResize() {
      if (!this.camera || !this.renderer) return;
      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    handleMouseMove(event) {
      if (!this.container) return;
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Controllo rotazione manuale con mouse drag
      if (this.isMouseDown && this.penguin) {
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;
        
        // Rotazione orizzontale (Y axis) e verticale (X axis)
        this.penguin.rotation.y += deltaX * 0.01; // Sensibilità orizzontale
        this.penguin.rotation.x += deltaY * 0.01; // Sensibilità verticale
        
        // Limita la rotazione verticale per evitare capovolgimenti estremi
        this.penguin.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.penguin.rotation.x));
        
        this.previousMousePosition.x = event.clientX;
        this.previousMousePosition.y = event.clientY;
      }
    }

    handleMouseDown(event) {
      this.isMouseDown = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      this.triggerExcitedAnimation();
    }

    handleMouseUp() {
      this.isMouseDown = false;
    }

    handleClick() {
      this.triggerWaveAnimation();
      // Evento custom per integrazione AIceberg Mind
      window.dispatchEvent(new CustomEvent('aimoClick', {
        detail: { position: this.mouse, timestamp: Date.now() }
      }));
    }

    triggerWaveAnimation() {
      if (!this.penguinParts?.leftWing || !this.penguinParts?.rightWing) return;
      const duration = 1000;
      const startTime = Date.now();

      const animateWave = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const wave = Math.sin(progress * Math.PI * 4) * 0.5;

        this.penguinParts.leftWing.rotation.z = -0.3 + wave;
        this.penguinParts.rightWing.rotation.z = 0.3 - wave;

        if (progress < 1) {
          requestAnimationFrame(animateWave);
        } else {
          // Reset
          this.penguinParts.leftWing.rotation.z = -0.3;
          this.penguinParts.rightWing.rotation.z = 0.3;
        }
      };

      animateWave();
    }

    triggerExcitedAnimation() {
      if (!this.penguinParts?.group) return;
      const originalY = this.penguinParts.group.position.y;
      const duration = 500;
      const startTime = Date.now();

      const animateBounce = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const bounce = Math.sin(progress * Math.PI) * 0.2;

        this.penguinParts.group.position.y = originalY + bounce;

        if (progress < 1) requestAnimationFrame(animateBounce);
      };

      animateBounce();
    }

    startAnimation() {
      if (this.isAnimating) return;
      this.isAnimating = true;
      this.animate();
    }

    animate() {
      if (!this.isAnimating) return;

      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastFrameTime;

      // Limita FPS
      if (deltaTime < 1000 / this.maxFPS) {
        this.animationId = requestAnimationFrame(() => this.animate());
        return;
      }
      this.lastFrameTime = currentTime;

      this.updateIdleAnimations();

      // Auto-rotate DISABILITATO - controllo manuale con mouse
      // if (this.config.autoRotate && this.penguin && !this.isMouseDown) {
      //   this.penguin.rotation.y += 0.005;
      // }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      this.animationId = requestAnimationFrame(() => this.animate());
    }

    updateIdleAnimations() {
      if (!this.penguinParts?.body) return;

      // Respiro più vivace
      this.breathingTween.time += this.breathingTween.speed;
      const breathScale = 1 + Math.sin(this.breathingTween.time) * 0.03; // Più pronunciato
      this.penguinParts.body.scale.set(breathScale, breathScale, breathScale);

      // Pancino che rimbalza dolcemente
      if (this.penguinParts.belly) {
        this.bellyBounceTween.time += this.bellyBounceTween.speed;
        const bellyBounce = Math.sin(this.bellyBounceTween.time + Math.PI/3) * 0.02;
        this.penguinParts.belly.scale.set(1 + bellyBounce, 1 + bellyBounce * 0.5, 1 + bellyBounce);
      }

      // Ali più animate e simpatiche - sincronizza solid e wireframe
      this.wingFlapTween.time += this.wingFlapTween.speed;
      const wingFlap = Math.sin(this.wingFlapTween.time) * this.wingFlapTween.amplitude;

      if (this.penguinParts.leftWing && this.penguinParts.rightWing) {
        // 🪶 Ali solid adattate all'uovo - movimento più elegante
        this.penguinParts.leftWing.rotation.x = wingFlap * 0.07;
        this.penguinParts.rightWing.rotation.x = -wingFlap * 0.07;
        this.penguinParts.leftWing.rotation.z = -0.3 + wingFlap * 0.08;
        this.penguinParts.rightWing.rotation.z = 0.3 - wingFlap * 0.08;

        // Sincronizza le ali wireframe estese con le solid
        if (this.wireframeWings && this.wireframeWings.leftWing && this.wireframeWings.rightWing) {
          this.wireframeWings.leftWing.rotation.x = wingFlap * 0.07;
          this.wireframeWings.rightWing.rotation.x = -wingFlap * 0.07;
          this.wireframeWings.leftWing.rotation.z = -0.3 + wingFlap * 0.08;
          this.wireframeWings.rightWing.rotation.z = 0.3 - wingFlap * 0.08;
        }
      }

      // 🍐 Pera con movimento delicato - tutto il corpo si muove come un'unità
      this.headBobTween.time += this.headBobTween.speed;
      const pearBob = Math.sin(this.headBobTween.time) * this.headBobTween.amplitude;

      if (this.penguinParts.body && !this.isMouseDown) {
        this.penguinParts.body.position.y = -0.1 + pearBob * 0.025; // Movimento delicato della pera
      }

      // Sopracciglia animate - movimento su e giù per espressività
      if (this.wireframeEyebrows && this.wireframeEyebrows.length > 0) {
        this.eyebrowTween.time += this.eyebrowTween.speed;
        const eyebrowMove = Math.sin(this.eyebrowTween.time) * 0.03;
        
        this.wireframeEyebrows.forEach((eyebrow, index) => {
          const baseY = 0.95; // Aggiornato per la posizione alta sulla pera
          const phase = index * Math.PI * 0.3; // Leggero sfasamento tra le sopracciglia
          eyebrow.position.y = baseY + Math.sin(this.eyebrowTween.time + phase) * 0.02;
          
          // Leggera rotazione per più espressività
          eyebrow.rotation.z = Math.sin(this.eyebrowTween.time + phase) * 0.1;
        });
      }

      // === WIREFRAME ANIMATIONS ===

      // wireframe pulse
      if (this.wirePulse && this.wireframeLines && this.wireframeLines.length) {
        this.wirePulse.t += this.wirePulse.speed;
        const k = this.wirePulse.base + Math.sin(this.wirePulse.t) * this.wirePulse.amp;
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const opacity = clamp(k, 0.3, 1.0);
        for (const line of this.wireframeLines) {
          if (line.material) line.material.opacity = opacity;
        }
      }

      // dashed scroll
      if (this.dashedMaterials && this.dashedMaterials.length) {
        for (const m of this.dashedMaterials) {
          // r164 supporta dashOffset: crea un movimento "che scorre"
          m.dashOffset = (m.dashOffset ?? 0) - this.config.dash.speed;
          m.needsUpdate = true;
        }
      }

      // NEON pulse (soft)
      if (this.neonCores && this.neonCores.length) {
        this.neonPulse.t += this.config.neon.pulseSpeed;
        const k = this.config.neon.base + Math.sin(this.neonPulse.t) * this.config.neon.amp; // 0..1
        // clamp e applica
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const coreOpacity = clamp(k, 0.45, 1.0);
        const haloOpacity = clamp(k * 0.35, 0.05, 0.35);

        for (const m of this.neonCores) { m.opacity = coreOpacity; }
        for (const m of this.neonHalos) { m.opacity = haloOpacity; }
      }
    }

    showFallback() {
      if (this.container) {
        this.container.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-family:var(--font-display);">
            <div style="font-size:3rem;margin-bottom:0.5rem;">🐧</div>
            <div style="font-size:0.875rem;text-align:center;">AIMo<br><small>3D version disabled on mobile</small></div>
          </div>
        `;
      }
    }

    show() {
      if (this.container) {
        this.container.style.display = 'block';
        this.container.style.opacity = '1';
      }
    }

    hide() {
      if (this.container) {
        this.container.style.opacity = '0';
        setTimeout(() => {
          if (this.container) this.container.style.display = 'none';
        }, 300);
      }
    }

    isMobileDevice() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    stopAnimation() {
      this.isAnimating = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    cleanup() {
      const THREE = window.THREE;
      // Stop
      this.stopAnimation();

      // Remove listeners con mappa esplicita
      const map = {
        mouseMove: 'mousemove',
        mouseDown: 'mousedown',
        mouseUp: 'mouseup',
        click: 'click',
        touchStart: 'touchstart',
        touchEnd: 'touchend',
        touchMove: 'touchmove'
      };

      if (this.eventHandlers.resize) {
        window.removeEventListener('resize', this.eventHandlers.resize);
      }

      Object.keys(map).forEach((key) => {
        const handler = this.eventHandlers[key];
        if (handler && this.container) {
          this.container.removeEventListener(map[key], handler);
        }
      });

      // Dispose Three.js resources
      if (this.scene) {
        this.scene.traverse((obj) => {
          if (obj.isMesh) {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach((m) => m.dispose?.());
              } else {
                obj.material.dispose?.();
              }
            }
          }
        });
      }

      // Dispose wireframe materials
      [...this.wireframeLines, ...this.dashedMaterials, ...this.neonCores, ...this.neonHalos].forEach(item => {
        if (item && item.dispose) item.dispose();
      });
      
      // Clear arrays
      this.wireframeLines = [];
      this.dashedMaterials = [];
      this.neonCores = [];
      this.neonHalos = [];

      if (this.renderer) {
        this.renderer.dispose?.();
        if (this.renderer.domElement?.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }

      console.log('🐧 PenguinModule cleaned up');
    }

    // === AIMO BUILDER CUSTOMIZATION METHODS ===

    // Aggiorna scala del corpo
    updateBodyScale(scaleX, scaleY, scaleZ) {
      if (!this.penguinParts?.body) return;
      this.penguinParts.body.scale.set(scaleX, scaleY, scaleZ);
    }

    // Aggiorna posizione del corpo
    updateBodyPosition(posX = null, posY = null, posZ = null) {
      if (!this.penguinParts?.body) return;
      if (posX !== null) this.penguinParts.body.position.x = posX;
      if (posY !== null) this.penguinParts.body.position.y = posY;
      if (posZ !== null) this.penguinParts.body.position.z = posZ;
    }

    // Aggiorna scala della pancia
    updateBellyScale(scaleX, scaleY, scaleZ) {
      if (!this.penguinParts?.belly) return;
      // Creiamo una nuova geometria per evitare accumulo di scaling
      const THREE = window.THREE;
      const newGeometry = new THREE.SphereGeometry(0.6, 16, 12);
      newGeometry.scale(scaleX, scaleY, scaleZ);
      
      // Dispose della vecchia geometria
      this.penguinParts.belly.geometry.dispose();
      this.penguinParts.belly.geometry = newGeometry;
    }

    // Aggiorna posizione della pancia
    updateBellyPosition(posX = null, posY = null, posZ = null) {
      if (!this.penguinParts?.belly) return;
      if (posX !== null) this.penguinParts.belly.position.x = posX;
      if (posY !== null) this.penguinParts.belly.position.y = posY;
      if (posZ !== null) this.penguinParts.belly.position.z = posZ;
    }

    // Aggiorna scala del becco
    updateBeakScale(scaleX, scaleY, scaleZ = 1) {
      if (!this.penguinParts?.beak) return;
      this.penguinParts.beak.scale.set(scaleX, scaleY, scaleZ);
    }

    // Aggiorna posizione del becco
    updateBeakPosition(posX = null, posY = null, posZ = null) {
      if (!this.penguinParts?.beak) return;
      if (posX !== null) this.penguinParts.beak.position.x = posX;
      if (posY !== null) this.penguinParts.beak.position.y = posY;
      if (posZ !== null) this.penguinParts.beak.position.z = posZ;
    }

    // Aggiorna scala delle ali
    updateWingScale(scaleX, scaleY, scaleZ) {
      if (!this.penguinParts?.leftWing || !this.penguinParts?.rightWing) return;
      
      const THREE = window.THREE;
      
      // Crea nuove geometrie per le ali
      const newLeftGeometry = new THREE.SphereGeometry(0.35, 8, 6);
      newLeftGeometry.scale(scaleX, scaleY, scaleZ);
      
      const newRightGeometry = new THREE.SphereGeometry(0.35, 8, 6);
      newRightGeometry.scale(scaleX, scaleY, scaleZ);
      
      // Dispose delle vecchie geometrie
      this.penguinParts.leftWing.geometry.dispose();
      this.penguinParts.rightWing.geometry.dispose();
      
      // Applica le nuove geometrie
      this.penguinParts.leftWing.geometry = newLeftGeometry;
      this.penguinParts.rightWing.geometry = newRightGeometry;
    }

    // Aggiorna posizione delle ali
    updateWingPosition(posX, posY = null, posZ = null) {
      if (!this.penguinParts?.leftWing || !this.penguinParts?.rightWing) return;
      
      if (posY !== null) {
        this.penguinParts.leftWing.position.y = posY;
        this.penguinParts.rightWing.position.y = posY;
      }
      
      if (posZ !== null) {
        this.penguinParts.leftWing.position.z = posZ;
        this.penguinParts.rightWing.position.z = posZ;
      }
      
      // Posizione X è simmetrica
      this.penguinParts.leftWing.position.x = -posX;
      this.penguinParts.rightWing.position.x = posX;
    }

    // Aggiorna rotazione delle ali
    updateWingRotation(rotX = null, rotY = null, rotZ = null) {
      if (!this.penguinParts?.leftWing || !this.penguinParts?.rightWing) return;
      
      if (rotX !== null) {
        this.penguinParts.leftWing.rotation.x = rotX;
        this.penguinParts.rightWing.rotation.x = -rotX; // Simmetrica
      }
      
      if (rotY !== null) {
        this.penguinParts.leftWing.rotation.y = -rotY;
        this.penguinParts.rightWing.rotation.y = rotY; // Simmetrica
      }
      
      if (rotZ !== null) {
        this.penguinParts.leftWing.rotation.z = -rotZ;
        this.penguinParts.rightWing.rotation.z = rotZ; // Simmetrica
      }
    }

    // Aggiorna scala dei piedi
    updateFeetScale(scaleX, scaleY, scaleZ) {
      if (!this.penguin) return;
      
      const THREE = window.THREE;
      
      // Trova e aggiorna i piedi
      this.penguin.traverse((obj) => {
        if (obj.isMesh && !Object.values(this.penguinParts).includes(obj) && obj !== this.penguinParts.group) {
          // Crea nuova geometria per il piede
          const newGeometry = new THREE.SphereGeometry(0.25, 8, 6);
          newGeometry.scale(scaleX, scaleY, scaleZ);
          
          // Dispose della vecchia geometria
          obj.geometry.dispose();
          obj.geometry = newGeometry;
        }
      });
    }

    // Aggiorna posizione dei piedi
    updateFeetPosition(posX, posY = null, posZ = null) {
      if (!this.penguin) return;
      
      let feetCount = 0;
      this.penguin.traverse((obj) => {
        if (obj.isMesh && !Object.values(this.penguinParts).includes(obj) && obj !== this.penguinParts.group) {
          if (posY !== null) obj.position.y = posY;
          if (posZ !== null) obj.position.z = posZ;
          
          // Posizione X è simmetrica
          if (feetCount === 0) {
            obj.position.x = -posX; // Piede sinistro
          } else if (feetCount === 1) {
            obj.position.x = posX; // Piede destro
          }
          feetCount++;
        }
      });
    }

    // Aggiorna colore del corpo
    updateBodyColor(hexColor) {
      if (!this.penguinParts?.body) return;
      const color = parseInt(hexColor.replace('#', ''), 16);
      this.penguinParts.body.material.color.setHex(color);
      
      // Aggiorna anche le ali e la coda se hanno lo stesso materiale
      if (this.penguinParts.leftWing) this.penguinParts.leftWing.material.color.setHex(color);
      if (this.penguinParts.rightWing) this.penguinParts.rightWing.material.color.setHex(color);
      if (this.penguinParts.tail) this.penguinParts.tail.material.color.setHex(color);
    }

    // Aggiorna colore della pancia
    updateBellyColor(hexColor) {
      if (!this.penguinParts?.belly) return;
      const color = parseInt(hexColor.replace('#', ''), 16);
      this.penguinParts.belly.material.color.setHex(color);
    }

    // Aggiorna colore del becco e zampe
    updateBeakColor(hexColor) {
      if (!this.penguinParts?.beak) return;
      const color = parseInt(hexColor.replace('#', ''), 16);
      this.penguinParts.beak.material.color.setHex(color);
      
      // Aggiorna anche i piedi
      this.penguin.traverse((obj) => {
        if (obj.isMesh && !Object.values(this.penguinParts).includes(obj) && obj !== this.penguinParts.group) {
          obj.material.color.setHex(color);
        }
      });
    }

    // Aggiorna colore wireframe
    updateWireframeColor(hexColor) {
      const color = parseInt(hexColor.replace('#', ''), 16);
      this.config.wireframeAccent = color;
      
      // Se siamo in modalità wireframe, aggiorna immediatamente
      if (this.currentStyle !== 'solid') {
        this.changeStyle(this.currentStyle);
      }
    }

    // Esporta configurazione attuale
    exportConfig() {
      const config = {
        // Corpo
        bodyScale: {
          x: this.penguinParts?.body?.scale.x || 0.7,
          y: this.penguinParts?.body?.scale.y || 0.8,
          z: this.penguinParts?.body?.scale.z || 0.7
        },
        bodyPosition: {
          y: this.penguinParts?.body?.position.y || 0.0
        },
        
        // Pancia
        bellyPosition: {
          y: this.penguinParts?.belly?.position.y || -0.2,
          z: this.penguinParts?.belly?.position.z || 0.65
        },
        
        // Becco
        beakScale: {
          x: this.penguinParts?.beak?.scale.x || 1.0,
          y: this.penguinParts?.beak?.scale.y || 1.0
        },
        beakPosition: {
          y: this.penguinParts?.beak?.position.y || 0.6,
          z: this.penguinParts?.beak?.position.z || 0.7
        },
        
        // Ali
        wingPosition: {
          x: Math.abs(this.penguinParts?.rightWing?.position.x || 0.65),
          y: this.penguinParts?.rightWing?.position.y || -0.1
        },
        wingRotation: {
          z: this.penguinParts?.rightWing?.rotation.z || 0.4
        },
        
        // Colori
        bodyColor: '#' + (this.penguinParts?.body?.material.color.getHex() || 0x1a1a1a).toString(16).padStart(6, '0'),
        bellyColor: '#' + (this.penguinParts?.belly?.material.color.getHex() || 0xffffff).toString(16).padStart(6, '0'),
        beakColor: '#' + (this.penguinParts?.beak?.material.color.getHex() || 0x3ac8f5).toString(16).padStart(6, '0'),
        wireframeColor: '#' + (this.config.wireframeAccent || 0x3ac8f5).toString(16).padStart(6, '0'),
        
        // Stile
        style: this.currentStyle || 'solid'
      };
      
      return config;
    }

    // Importa configurazione
    importConfig(config) {
      try {
        // Applica tutte le configurazioni
        if (config.bodyScale) this.updateBodyScale(config.bodyScale.x, config.bodyScale.y, config.bodyScale.z);
        if (config.bodyPosition) this.updateBodyPosition(null, config.bodyPosition.y, null);
        
        if (config.bellyScale) this.updateBellyScale(config.bellyScale.x, config.bellyScale.y, config.bellyScale.z);
        if (config.bellyPosition) this.updateBellyPosition(null, config.bellyPosition.y, config.bellyPosition.z);
        
        if (config.beakScale) this.updateBeakScale(config.beakScale.x, config.beakScale.y);
        if (config.beakPosition) this.updateBeakPosition(null, config.beakPosition.y, config.beakPosition.z);
        
        if (config.wingScale) this.updateWingScale(config.wingScale.x, config.wingScale.y, config.wingScale.z);
        if (config.wingPosition) this.updateWingPosition(config.wingPosition.x, config.wingPosition.y);
        if (config.wingRotation) this.updateWingRotation(null, null, config.wingRotation.z);
        
        if (config.feetScale) this.updateFeetScale(config.feetScale.x, config.feetScale.y, config.feetScale.z);
        if (config.feetPosition) this.updateFeetPosition(config.feetPosition.x, config.feetPosition.y, config.feetPosition.z);
        
        if (config.bodyColor) this.updateBodyColor(config.bodyColor);
        if (config.bellyColor) this.updateBellyColor(config.bellyColor);
        if (config.beakColor) this.updateBeakColor(config.beakColor);
        if (config.wireframeColor) this.updateWireframeColor(config.wireframeColor);
        
        if (config.style) this.changeStyle(config.style);
        
        console.log('🎨 Configuration imported successfully');
        return true;
      } catch (error) {
        console.error('❌ Error importing configuration:', error);
        return false;
      }
    }

    // Reset alla configurazione di default
    resetToDefault() {
      const defaultConfig = {
        bodyScale: { x: 0.7, y: 0.8, z: 0.7 },
        bodyPosition: { y: 0.0 },
        bellyScale: { x: 0.8, y: 1.2, z: 0.6 },
        bellyPosition: { y: -0.2, z: 0.65 },
        beakScale: { x: 1.0, y: 1.0 },
        beakPosition: { y: 0.6, z: 0.7 },
        wingScale: { x: 0.5, y: 1.4, z: 0.8 },
        wingPosition: { x: 0.65, y: -0.1 },
        wingRotation: { z: 0.4 },
        feetScale: { x: 2.0, y: 0.4, z: 1.2 },
        feetPosition: { x: 0.3, y: -0.9, z: 0.8 },
        bodyColor: '#1a1a1a',
        bellyColor: '#ffffff',
        beakColor: '#3ac8f5',
        wireframeColor: '#3ac8f5',
        style: 'solid'
      };
      
      return this.importConfig(defaultConfig);
    }
  }

  // Export globale per uso in Astro (script non-module)
  window.PenguinModule = PenguinModule;
})();























---
import AimoBuilderLayout from '../layouts/AimoBuilderLayout.astro';
---

<AimoBuilderLayout
  title="AIMo Builder - Customize Your Penguin"
  description="Complete customization system to create your personalized AIMo"
>
  <div class="aimo-builder-container">
    <header class="builder-header">
      <h1>🎨 AIMo Builder</h1>
      <p>Customize every detail of your AIMo penguin</p>
    </header>

    <div class="builder-layout">
      <!-- 🐧 VIEWPORT - LEFT -->
      <section class="viewport-section">
        <div class="viewport-square">
          <!-- 🧭 QUICK ACTION BUTTONS -->
          <div class="quick-actions">
            <button id="reset-btn" class="btn btn-secondary">🔄 Reset</button>
            <button id="export-btn" class="btn btn-primary">📤 Export Config</button>
            <button id="import-btn" class="btn btn-primary">📥 Import Config</button>
            <input type="file" id="import-file" accept=".json" style="display: none;">
          </div>

          <div id="aimo-preview" class="penguin-container penguin-viewport" 
               data-interactive="true" data-component-id="aimo-builder">
            <div class="penguin-loading">🐧 Loading AIMo Builder...</div>
          </div>
        </div>

        <div class="viewport-info">
          <p>🖱️ Drag to pan • 🔄 Scroll to zoom • 🎨 Use controls on the right →</p>
        </div>
      </section>

      <!-- ⚙️ CONTROLS - RIGHT (TWO COLUMNS) -->
      <section class="controls-section two-columns">
        <!-- LEFT COLUMN: Style + Colors -->
        <div class="controls-column left-column">
          <!-- Rendering Style -->
          <div class="control-panel">
            <h3>🎭 Rendering Style</h3>
            <div class="control-content">
              <div class="control-group">
                <label>Style:</label>
                <select id="style-select">
                  <option value="solid">Solid</option>
                  <option value="wireframe">Wireframe</option>
                  <option value="dashed">Dashed</option>
                  <option value="neon">Neon</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Colors -->
          <div class="control-panel">
            <h3>🎨 Colors</h3>
            <div class="control-content">
              <div class="control-group">
                <label>Body:</label>
                <input type="color" id="body-color" value="#1a1a1a">
              </div>
              <div class="control-group">
                <label>Belly:</label>
                <input type="color" id="belly-color" value="#ffffff">
              </div>
              <div class="control-group">
                <label>Beak & Feet:</label>
                <input type="color" id="beak-color" value="#3ac8f5">
              </div>
              <div class="control-group">
                <label>Wireframe:</label>
                <input type="color" id="wireframe-color" value="#3ac8f5">
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: All body parts (accordion) -->
        <div class="controls-column right-column">

          <!-- Body -->
          <div class="control-panel collapsed">
            <h3>🍐 Body</h3>
            <div class="control-content">
              <div class="control-group">
                <label>Scale X: <span id="body-scale-x-val">0.70</span></label>
                <input type="range" id="body-scale-x" min="0.6" max="1.0" step="0.01" value="0.7">
              </div>
              <div class="control-group">
                <label>Scale Y: <span id="body-scale-y-val">0.80</span></label>
                <input type="range" id="body-scale-y" min="0.6" max="1.2" step="0.01" value="0.8">
              </div>
              <div class="control-group">
                <label>Scale Z: <span id="body-scale-z-val">0.70</span></label>
                <input type="range" id="body-scale-z" min="0.6" max="1.0" step="0.01" value="0.7">
              </div>
              <div class="control-group">
                <label>Position Y: <span id="body-pos-y-val">0.00</span></label>
                <input type="range" id="body-pos-y" min="-0.5" max="0.5" step="0.01" value="0.0">
              </div>
            </div>
          </div>

          <!-- Belly -->
          <div class="control-panel collapsed">
            <h3>🤍 Belly</h3>
            <div class="control-content">
              <div class="control-group">
                <label>Scale X: <span id="belly-scale-x-val">0.80</span></label>
                <input type="range" id="belly-scale-x" min="0.5" max="1.3" step="0.01" value="0.8">
              </div>
              <div class="control-group">
                <label>Scale Y: <span id="belly-scale-y-val">1.20</span></label>
                <input type="range" id="belly-scale-y" min="0.8" max="1.8" step="0.01" value="1.2">
              </div>
              <div class="control-group">
                <label>Scale Z: <span id="belly-scale-z-val">0.60</span></label>
                <input type="range" id="belly-scale-z" min="0.5" max="1.0" step="0.01" value="0.6">
              </div>
              <div class="control-group">
                <label>Position Y: <span id="belly-pos-y-val">-0.20</span></label>
                <input type="range" id="belly-pos-y" min="-0.6" max="0.4" step="0.01" value="-0.2">
              </div>
              <div class="control-group">
                <label>Position Z: <span id="belly-pos-z-val">0.65</span></label>
                <input type="range" id="belly-pos-z" min="0.5" max="0.9" step="0.01" value="0.65">
              </div>
            </div>
          </div>

          <!-- Beak -->
          <div class="control-panel collapsed">
            <h3>🐧 Beak</h3>
            <div class="control-content">
              <div class="control-group">
                <label>Scale X: <span id="beak-scale-x-val">1.00</span></label>
                <input type="range" id="beak-scale-x" min="0.6" max="1.4" step="0.02" value="1.0">
              </div>
              <div class="control-group">
                <label>Scale Y: <span id="beak-scale-y-val">1.00</span></label>
                <input type="range" id="beak-scale-y" min="0.6" max="1.4" step="0.02" value="1.0">
              </div>
              <div class="control-group">
                <label>Position Y: <span id="beak-pos-y-val">0.60</span></label>
                <input type="range" id="beak-pos-y" min="0.4" max="0.9" step="0.01" value="0.6">
              </div>
              <div class="control-group">
                <label>Position Z: <span id="beak-pos-z-val">0.70</span></label>
                <input type="range" id="beak-pos-z" min="0.6" max="0.9" step="0.01" value="0.7">
              </div>
            </div>
          </div>

          <!-- Wings -->
          <div class="control-panel collapsed">
            <h3>🪶 Wings</h3>
            <div class="control-content">
              <div class="control-group">
                <label>Scale X: <span id="wing-scale-x-val">0.50</span></label>
                <input type="range" id="wing-scale-x" min="0.3" max="1.0" step="0.01" value="0.5">
              </div>
              <div class="control-group">
                <label>Scale Y: <span id="wing-scale-y-val">1.40</span></label>
                <input type="range" id="wing-scale-y" min="1.0" max="2.0" step="0.01" value="1.4">
              </div>
              <div class="control-group">
                <label>Scale Z: <span id="wing-scale-z-val">0.80</span></label>
                <input type="range" id="wing-scale-z" min="0.6" max="1.2" step="0.01" value="0.8">
              </div>
              <div class="control-group">
                <label>Position X: <span id="wing-pos-x-val">0.65</span></label>
                <input type="range" id="wing-pos-x" min="0.6" max="0.9" step="0.01" value="0.65">
              </div>
              <div class="control-group">
                <label>Position Y: <span id="wing-pos-y-val">-0.10</span></label>
                <input type="range" id="wing-pos-y" min="-0.3" max="0.2" step="0.01" value="-0.1">
              </div>
              <div class="control-group">
                <label>Rotation Z: <span id="wing-rot-z-val">0.40</span></label>
                <input type="range" id="wing-rot-z" min="0.2" max="0.6" step="0.01" value="0.4">
              </div>
            </div>
          </div>

          <!-- Feet -->
          <div class="control-panel collapsed">
            <h3>🦶 Feet</h3>
            <div class="control-content">
              <div class="control-group">
                <label>Scale X: <span id="feet-scale-x-val">2.00</span></label>
                <input type="range" id="feet-scale-x" min="1.4" max="2.4" step="0.02" value="2.0">
              </div>
              <div class="control-group">
                <label>Scale Y: <span id="feet-scale-y-val">0.40</span></label>
                <input type="range" id="feet-scale-y" min="0.3" max="0.6" step="0.01" value="0.4">
              </div>
              <div class="control-group">
                <label>Scale Z: <span id="feet-scale-z-val">1.20</span></label>
                <input type="range" id="feet-scale-z" min="1.0" max="1.6" step="0.02" value="1.2">
              </div>
              <div class="control-group">
                <label>Position X: <span id="feet-pos-x-val">0.30</span></label>
                <input type="range" id="feet-pos-x" min="0.2" max="0.5" step="0.01" value="0.3">
              </div>
              <div class="control-group">
                <label>Position Y: <span id="feet-pos-y-val">-0.90</span></label>
                <input type="range" id="feet-pos-y" min="-1.2" max="-0.6" step="0.01" value="-0.9">
              </div>
              <div class="control-group">
                <label>Position Z: <span id="feet-pos-z-val">0.80</span></label>
                <input type="range" id="feet-pos-z" min="0.6" max="1.0" step="0.01" value="0.8">
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  </div>
</AimoBuilderLayout>

<style>
  /* === Layout & tokens (come tua base) === */
  .aimo-builder-container { max-width: 1400px; margin: 0 auto; padding: var(--space-lg); min-height: calc(100vh - 120px); background: var(--bg-primary); }
  .builder-header { text-align: center; margin-bottom: var(--space-lg); }
  .builder-header h1 { color: var(--text-primary); font-family: var(--font-display); font-size: var(--font-size-4xl); margin-bottom: var(--space-xs); font-weight: var(--font-weight-light); }
  .builder-header p { color: var(--text-secondary); font-size: var(--font-size-lg); font-family: var(--font-body); }

  .builder-layout { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); align-items: start; }

  .viewport-section { display: flex; flex-direction: column; gap: var(--space-sm); }
  .viewport-square { aspect-ratio: 1 / 1; width: 100%; max-width: 500px; margin: 0 auto;
    background: radial-gradient(600px 400px at 50% 30%, rgba(94, 228, 195, 0.12), transparent 70%), linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
    border-radius: var(--details-border-radius); padding: var(--space-lg); border: 1px solid var(--border-light); backdrop-filter: blur(10px); box-shadow: var(--shadow-sm); }
  .penguin-viewport { width: 100%; height: 100%; border-radius: 8px; overflow: hidden; position: relative; }

  .viewport-info { text-align: center; padding: var(--space-sm); background: rgba(0, 212, 255, 0.1); border-radius: 8px; border: 1px solid rgba(0, 212, 255, 0.2); }
  .viewport-info p { color: var(--text-secondary); font-size: var(--font-size-sm); margin: 0; font-family: var(--font-body); }

  .quick-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-xs); padding: var(--space-sm); background: rgba(0, 212, 255, 0.05); border-bottom: 1px solid rgba(0, 212, 255, 0.15); }

  .controls-section.two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); height: fit-content; }
  .controls-column { display: flex; flex-direction: column; gap: var(--space-sm); }

  .control-panel { background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-light); border-radius: 0.75rem; overflow: hidden; backdrop-filter: blur(10px); transition: border-color var(--transition-base), background var(--transition-base), transform var(--transition-base); }
  .control-panel:hover { border-color: rgba(255,255,255,.18); background: rgba(255,255,255,.05); transform: translateY(-2px); }
  .control-panel h3 { color: var(--text-primary); font-family: var(--font-display); font-size: var(--font-size-sm); font-weight: var(--font-weight-normal); margin: 0; padding: var(--space-sm); display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: rgba(255,255,255,.02); border-bottom: 1px solid var(--border-light); transition: all var(--timing-base) var(--easing-smooth); user-select: none; }
  .control-panel h3:hover { background: rgba(255,255,255,.04); }
  .control-panel h3::after { content: '▼'; font-size: 0.8rem; transition: transform var(--timing-base) var(--easing-smooth); }
  .control-panel.collapsed h3::after { transform: rotate(-90deg); }
  .control-content { padding: var(--space-sm); transition: all var(--timing-base) var(--easing-smooth); max-height: 300px; overflow: hidden; background: rgba(255,255,255,.01); }
  .control-panel.collapsed .control-content { max-height: 0; padding: 0 var(--space-sm); }

  .control-group { margin-bottom: var(--space-sm); }
  .control-group:last-child { margin-bottom: 0; }
  .control-group label { display: block; color: var(--text-secondary); margin-bottom: var(--space-xs); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); font-family: var(--font-body); }

  .control-group input[type="range"] { width: 100%; height: 6px; border-radius: 3px; background: rgba(0, 212, 255, 0.2); outline: none; -webkit-appearance: none; }
  .control-group input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--brand-cyan); cursor: pointer; border: 2px solid var(--bg-primary); box-shadow: 0 0 8px rgba(0, 212, 255, 0.4); }
  .control-group select, .control-group input[type="color"] { width: 100%; padding: var(--space-xs); background: rgba(10,10,10,.8); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 6px; color: var(--text-primary); font-size: var(--font-size-sm); font-family: var(--font-body); }
  .control-group input[type="color"] { height: 40px; cursor: pointer; }

  .btn { padding: var(--space-xs) var(--space-sm); background: transparent; border: var(--details-border); border-radius: 8px; cursor: pointer; font-family: var(--font-body); font-weight: var(--font-weight-medium); font-size: var(--font-size-xs); transition: all var(--timing-base) var(--easing-smooth); text-decoration: none; display: inline-block; text-align: center; position: relative; overflow: hidden; }
  .btn-primary { background: var(--gradient-brand); color: var(--bg-primary); border: none; }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,212,255,0.3); }
  .btn-secondary { background: var(--details-background); border: var(--details-border); color: var(--brand-cyan); }
  .btn-secondary::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: var(--gradient-brand); transition: left var(--timing-base) var(--easing-smooth); z-index: -1; }
  .btn-secondary:hover { color: var(--bg-primary); }
  .btn-secondary:hover::before { left: 0; }

  @media (max-width: 1200px) { .aimo-builder-container { padding: var(--space-md); } .builder-header h1 { font-size: var(--font-size-3xl); } }
  @media (max-width: 900px) { .builder-layout { grid-template-columns: 1fr; gap: var(--space-md); } }
  @media (max-width: 768px) {
    .aimo-builder-container { padding: var(--space-sm); }
    .controls-section.two-columns { grid-template-columns: 1fr; }
    .builder-header h1 { font-size: var(--font-size-2xl); }
    .quick-actions { grid-template-columns: 1fr; gap: var(--space-xs); }
  }

  .penguin-loading { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); font-family: var(--font-body); font-size: var(--font-size-base); }
</style>

<script type="module">
  // === Three ESM r164 ===
  import * as THREE from 'https://unpkg.com/three@0.164.0/build/three.module.js';
  window.THREE = THREE;

  let aimoInstance = null;
  let currentConfig = null;

  // === Config defaults (allineati al modulo) ===
  const defaultConfig = {
    // Body
    bodyScale: { x: 0.7, y: 0.8, z: 0.7 },
    bodyPosition: { y: 0.0 },
    // Belly
    bellyScale: { x: 0.8, y: 1.2, z: 0.6 },
    bellyPosition: { y: -0.2, z: 0.65 },
    // Beak
    beakScale: { x: 1.0, y: 1.0 },
    beakPosition: { y: 0.6, z: 0.7 },
    // Wings
    wingScale: { x: 0.5, y: 1.4, z: 0.8 },
    wingPosition: { x: 0.65, y: -0.1 },
    wingRotation: { z: 0.4 },
    // Feet
    feetScale: { x: 2.0, y: 0.4, z: 1.2 },
    feetPosition: { x: 0.3, y: -0.9, z: 0.8 },
    // Colors
    bodyColor: '#1a1a1a',
    bellyColor: '#ffffff',
    beakColor: '#3ac8f5',
    wireframeColor: '#3ac8f5',
    // Style
    style: 'solid'
  };

  // === Utils ===
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (n) => Number(n).toFixed(2);

  // Small debounce utility
  function debounce(fn, wait = 16) {
    let t; 
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  // Tween number utility with easeOutQuad
  function tweenNumber(from, to, duration, onUpdate, onComplete) {
    const start = performance.now();
    function step(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - (1 - t) * (1 - t); // easeOutQuad
      onUpdate(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
      else onComplete && onComplete();
    }
    requestAnimationFrame(step);
  }

  // Tween Vector3-like
  function tweenTriple(from, to, duration, apply) {
    const start = performance.now();
    function step(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const e = 1 - (1 - t) * (1 - t);
      const x = from.x + (to.x - from.x) * e;
      const y = from.y + (to.y - from.y) * e;
      const z = from.z + (to.z - from.z) * e;
      apply(x, y, z);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Load PenguinModule (UMD on window)
  function loadPenguinModule() {
    return new Promise((resolve, reject) => {
      if (window.PenguinModule) return resolve();
      const s = document.createElement('script');
      s.src = '/js/penguin-module-r164.js';
      s.defer = true;
      s.onload = () => window.PenguinModule ? resolve() : reject(new Error('PenguinModule not found'));
      s.onerror = () => reject(new Error('PenguinModule load error'));
      document.head.appendChild(s);
    });
  }

  function hexToThreeColor(hex) { return parseInt(hex.replace('#', ''), 16); }

  function initAimoBuilder() {
    try {
      const config = {
        containerId: 'aimo-preview',
        enableInteraction: true,
        enableAnimation: true,
        autoRotate: false,
        enableMobile: false,
        style: defaultConfig.style,
        wireframeAccent: hexToThreeColor(defaultConfig.wireframeColor)
      };

      aimoInstance = new window.PenguinModule(config);
      currentConfig = JSON.parse(JSON.stringify(defaultConfig));

      // Fit in square
      if (aimoInstance?.penguin) {
        aimoInstance.penguin.position.set(0, 0, 0);
        aimoInstance.penguin.scale.setScalar(1.0);
      }
      if (aimoInstance?.camera) {
        aimoInstance.camera.position.set(0, 0.5, 3.5);
        aimoInstance.camera.lookAt(0, 0, 0);
      }

      setupZoomAndPanControls();

      const container = document.getElementById('aimo-preview');
      const loading = container?.querySelector('.penguin-loading');
      if (loading) loading.style.display = 'none';

      initControls();
      setTimeout(initAccordion, 300);

      console.log('🎨 AIMo Builder initialized');
    } catch (err) {
      console.error('Init error:', err);
    }
  }

  // Pan & Zoom controls
  function setupZoomAndPanControls() {
    const container = document.getElementById('aimo-preview');
    if (!container || !aimoInstance?.camera) return;

    let isDragging = false;
    let prev = { x: 0, y: 0 };
    let target = { x: 0, y: 0 };
    let zoom = 3.5;

    const panLimits = { x: 1.5, y: 1.0 };
    const zoomLimits = { min: 2.5, max: 6.0 };

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1.08 : 0.92;
      zoom = clamp(zoom * delta, zoomLimits.min, zoomLimits.max);
      const dir = new window.THREE.Vector3();
      aimoInstance.camera.getWorldDirection(dir);
      aimoInstance.camera.position.copy(dir.multiplyScalar(-zoom).add(new window.THREE.Vector3(target.x, target.y, 0)));
    }, { passive: false });

    container.addEventListener('mousedown', (e) => {
      isDragging = true; prev = { x: e.clientX, y: e.clientY }; container.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = (e.clientX - prev.x) * 0.01;
      const dy = (e.clientY - prev.y) * 0.01;
      target.x = clamp(target.x - dx, -panLimits.x, panLimits.x);
      target.y = clamp(target.y + dy, -panLimits.y, panLimits.y);
      const dir = new window.THREE.Vector3();
      aimoInstance.camera.getWorldDirection(dir);
      aimoInstance.camera.position.copy(dir.multiplyScalar(-zoom).add(new window.THREE.Vector3(target.x, target.y, 0)));
      aimoInstance.camera.lookAt(target.x, target.y, 0);
      prev = { x: e.clientX, y: e.clientY };
    });
    document.addEventListener('mouseup', () => { isDragging = false; container.style.cursor = 'grab'; });

    container.style.cursor = 'grab';
  }

  // === CONTROLS BINDING (with smooth apply) ===
  function bindSlider(id, getTarget, setTarget, applyFn, duration = 200) {
    const el = document.getElementById(id);
    const readout = document.getElementById(id + '-val');
    if (!el) return;

    const onInput = () => {
      const val = parseFloat(el.value);
      if (readout) readout.textContent = fmt(val);
      setTarget(val);

      // Smooth apply using current live values from penguin
      if (!aimoInstance) return;

      applyFn(duration);
    };

    el.addEventListener('input', onInput);
    // Initialize readout
    if (readout) readout.textContent = fmt(el.value);
  }

  function initControls() {
    // STYLE
    const styleSelect = document.getElementById('style-select');
    if (styleSelect) {
      styleSelect.value = currentConfig.style;
      styleSelect.addEventListener('change', (e) => {
        currentConfig.style = e.target.value;
        aimoInstance?.changeStyle?.(currentConfig.style);
      });
    }

    // ========= BODY =========
    bindSlider('body-scale-x',
      () => currentConfig.bodyScale.x,
      (v) => currentConfig.bodyScale.x = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.body.scale;
        const to = { x: currentConfig.bodyScale.x, y: currentConfig.bodyScale.y, z: currentConfig.bodyScale.z };
        tweenTriple({ x: cur.x, y: cur.y, z: cur.z }, to, duration, (x, y, z) => aimoInstance.updateBodyScale(x, y, z));
      });

    bindSlider('body-scale-y',
      () => currentConfig.bodyScale.y,
      (v) => currentConfig.bodyScale.y = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.body.scale;
        const to = { x: currentConfig.bodyScale.x, y: currentConfig.bodyScale.y, z: currentConfig.bodyScale.z };
        tweenTriple({ x: cur.x, y: cur.y, z: cur.z }, to, duration, (x, y, z) => aimoInstance.updateBodyScale(x, y, z));
      });

    bindSlider('body-scale-z',
      () => currentConfig.bodyScale.z,
      (v) => currentConfig.bodyScale.z = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.body.scale;
        const to = { x: currentConfig.bodyScale.x, y: currentConfig.bodyScale.y, z: currentConfig.bodyScale.z };
        tweenTriple({ x: cur.x, y: cur.y, z: cur.z }, to, duration, (x, y, z) => aimoInstance.updateBodyScale(x, y, z));
      });

    bindSlider('body-pos-y',
      () => currentConfig.bodyPosition.y,
      (v) => currentConfig.bodyPosition.y = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.body.position.y;
        tweenNumber(cur, currentConfig.bodyPosition.y, duration, (y) => aimoInstance.updateBodyPosition(null, y, null));
      });

    // ========= BELLY =========
    bindSlider('belly-scale-x',
      () => currentConfig.bellyScale.x,
      (v) => currentConfig.bellyScale.x = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.belly.scale;
        const to = { x: currentConfig.bellyScale.x, y: currentConfig.bellyScale.y, z: currentConfig.bellyScale.z };
        tweenTriple({ x: cur.x, y: cur.y, z: cur.z }, to, duration, (x, y, z) => aimoInstance.updateBellyScale(x, y, z));
      });

    bindSlider('belly-scale-y',
      () => currentConfig.bellyScale.y,
      (v) => currentConfig.bellyScale.y = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.belly.scale;
        const to = { x: currentConfig.bellyScale.x, y: currentConfig.bellyScale.y, z: currentConfig.bellyScale.z };
        tweenTriple({ x: cur.x, y: cur.y, z: cur.z }, to, duration, (x, y, z) => aimoInstance.updateBellyScale(x, y, z));
      });

    bindSlider('belly-scale-z',
      () => currentConfig.bellyScale.z,
      (v) => currentConfig.bellyScale.z = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.belly.scale;
        const to = { x: currentConfig.bellyScale.x, y: currentConfig.bellyScale.y, z: currentConfig.bellyScale.z };
        tweenTriple({ x: cur.x, y: cur.y, z: cur.z }, to, duration, (x, y, z) => aimoInstance.updateBellyScale(x, y, z));
      });

    bindSlider('belly-pos-y',
      () => currentConfig.bellyPosition.y,
      (v) => currentConfig.bellyPosition.y = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.belly.position.y;
        tweenNumber(cur, currentConfig.bellyPosition.y, duration, (y) => aimoInstance.updateBellyPosition(null, y, null));
      });

    bindSlider('belly-pos-z',
      () => currentConfig.bellyPosition.z,
      (v) => currentConfig.bellyPosition.z = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.belly.position.z;
        tweenNumber(cur, currentConfig.bellyPosition.z, duration, (z) => aimoInstance.updateBellyPosition(null, null, z));
      });

    // ========= BEAK =========
    bindSlider('beak-scale-x',
      () => currentConfig.beakScale.x,
      (v) => currentConfig.beakScale.x = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.beak.scale.x;
        tweenNumber(cur, currentConfig.beakScale.x, duration, (x) => aimoInstance.updateBeakScale(x, currentConfig.beakScale.y));
      });

    bindSlider('beak-scale-y',
      () => currentConfig.beakScale.y,
      (v) => currentConfig.beakScale.y = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.beak.scale.y;
        tweenNumber(cur, currentConfig.beakScale.y, duration, (y) => aimoInstance.updateBeakScale(currentConfig.beakScale.x, y));
      });

    bindSlider('beak-pos-y',
      () => currentConfig.beakPosition.y,
      (v) => currentConfig.beakPosition.y = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.beak.position.y;
        tweenNumber(cur, currentConfig.beakPosition.y, duration, (y) => aimoInstance.updateBeakPosition(null, y, null));
      });

    bindSlider('beak-pos-z',
      () => currentConfig.beakPosition.z,
      (v) => currentConfig.beakPosition.z = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.beak.position.z;
        tweenNumber(cur, currentConfig.beakPosition.z, duration, (z) => aimoInstance.updateBeakPosition(null, null, z));
      });

    // ========= WINGS =========
    bindSlider('wing-scale-x',
      () => currentConfig.wingScale.x,
      (v) => currentConfig.wingScale.x = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.leftWing.scale;
        const to = { x: currentConfig.wingScale.x, y: currentConfig.wingScale.y, z: currentConfig.wingScale.z };
        tweenTriple({ x: cur.x, y: cur.y, z: cur.z }, to, duration, (x, y, z) => aimoInstance.updateWingScale(x, y, z));
      });

    bindSlider('wing-scale-y',
      () => currentConfig.wingScale.y,
      (v) => currentConfig.wingScale.y = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.leftWing.scale;
        const to = { x: currentConfig.wingScale.x, y: currentConfig.wingScale.y, z: currentConfig.wingScale.z };
        tweenTriple({ x: cur.x, y: cur.y, z: cur.z }, to, duration, (x, y, z) => aimoInstance.updateWingScale(x, y, z));
      });

    bindSlider('wing-scale-z',
      () => currentConfig.wingScale.z,
      (v) => currentConfig.wingScale.z = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.leftWing.scale;
        const to = { x: currentConfig.wingScale.x, y: currentConfig.wingScale.y, z: currentConfig.wingScale.z };
        tweenTriple({ x: cur.x, y: cur.y, z: cur.z }, to, duration, (x, y, z) => aimoInstance.updateWingScale(x, y, z));
      });

    bindSlider('wing-pos-x',
      () => currentConfig.wingPosition.x,
      (v) => currentConfig.wingPosition.x = v,
      (duration) => {
        const cur = Math.abs(aimoInstance.penguinParts.rightWing.position.x);
        tweenNumber(cur, currentConfig.wingPosition.x, duration, (x) => aimoInstance.updateWingPosition(x, null, null));
      });

    bindSlider('wing-pos-y',
      () => currentConfig.wingPosition.y,
      (v) => currentConfig.wingPosition.y = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.rightWing.position.y;
        tweenNumber(cur, currentConfig.wingPosition.y, duration, (y) => aimoInstance.updateWingPosition(currentConfig.wingPosition.x, y, null));
      });

    bindSlider('wing-rot-z',
      () => currentConfig.wingRotation.z,
      (v) => currentConfig.wingRotation.z = v,
      (duration) => {
        const cur = aimoInstance.penguinParts.rightWing.rotation.z;
        tweenNumber(cur, currentConfig.wingRotation.z, duration, (z) => aimoInstance.updateWingRotation(null, null, z));
      });

    // ========= FEET =========
    bindSlider('feet-scale-x',
      () => currentConfig.feetScale.x,
      (v) => currentConfig.feetScale.x = v,
      (duration) => {
        // read any foot scale.x by inspecting a foot mesh
        // here we just apply target smoothly
        const curX = currentConfig.feetScale.x; // not readable easily → animate by updates
        tweenNumber(curX, currentConfig.feetScale.x, duration, () => aimoInstance.updateFeetScale(currentConfig.feetScale.x, currentConfig.feetScale.y, currentConfig.feetScale.z));
      });

    bindSlider('feet-scale-y',
      () => currentConfig.feetScale.y,
      (v) => currentConfig.feetScale.y = v,
      (duration) => {
        tweenNumber(currentConfig.feetScale.y, currentConfig.feetScale.y, duration, () => aimoInstance.updateFeetScale(currentConfig.feetScale.x, currentConfig.feetScale.y, currentConfig.feetScale.z));
      });

    bindSlider('feet-scale-z',
      () => currentConfig.feetScale.z,
      (v) => currentConfig.feetScale.z = v,
      (duration) => {
        tweenNumber(currentConfig.feetScale.z, currentConfig.feetScale.z, duration, () => aimoInstance.updateFeetScale(currentConfig.feetScale.x, currentConfig.feetScale.y, currentConfig.feetScale.z));
      });

    bindSlider('feet-pos-x',
      () => currentConfig.feetPosition.x,
      (v) => currentConfig.feetPosition.x = v,
      (duration) => {
        // read current abs x of right foot approx by config; smooth-apply
        tweenNumber(0, 1, duration, () => aimoInstance.updateFeetPosition(currentConfig.feetPosition.x, null, null));
      });

    bindSlider('feet-pos-y',
      () => currentConfig.feetPosition.y,
      (v) => currentConfig.feetPosition.y = v,
      (duration) => {
        tweenNumber(0, 1, duration, () => aimoInstance.updateFeetPosition(currentConfig.feetPosition.x, currentConfig.feetPosition.y, null));
      });

    bindSlider('feet-pos-z',
      () => currentConfig.feetPosition.z,
      (v) => currentConfig.feetPosition.z = v,
      (duration) => {
        tweenNumber(0, 1, duration, () => aimoInstance.updateFeetPosition(currentConfig.feetPosition.x, currentConfig.feetPosition.y, currentConfig.feetPosition.z));
      });

    // COLORS (realtime)
    const colorConfigs = [
      { id: 'body-color', key: 'bodyColor', update: () => aimoInstance.updateBodyColor(currentConfig.bodyColor) },
      { id: 'belly-color', key: 'bellyColor', update: () => aimoInstance.updateBellyColor(currentConfig.bellyColor) },
      { id: 'beak-color', key: 'beakColor', update: () => aimoInstance.updateBeakColor(currentConfig.beakColor) },
      { id: 'wireframe-color', key: 'wireframeColor', update: () => aimoInstance.updateWireframeColor(currentConfig.wireframeColor) }
    ];
    colorConfigs.forEach(({ id, key, update }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const onInput = debounce(() => { currentConfig[key] = el.value; update(); }, 12);
      el.addEventListener('input', onInput);
      el.addEventListener('change', onInput);
    });

    // ACTIONS
    document.getElementById('reset-btn')?.addEventListener('click', resetToDefault);
    document.getElementById('export-btn')?.addEventListener('click', exportConfig);
    document.getElementById('import-btn')?.addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file')?.addEventListener('change', importConfig);
  }

  // Accordion init (all closed)
  function initAccordion() {
    const panels = document.querySelectorAll('.control-panel');
    panels.forEach(panel => {
      const header = panel.querySelector('h3');
      const content = panel.querySelector('.control-content');
      if (!header || !content) return;

      // Start collapsed
      panel.classList.add('collapsed');
      content.style.maxHeight = '0px';
      content.style.paddingTop = '0';
      content.style.paddingBottom = '0';

      header.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        if (panel.classList.contains('collapsed')) {
          content.style.maxHeight = '0px';
          content.style.paddingTop = '0';
          content.style.paddingBottom = '0';
        } else {
          content.style.maxHeight = content.scrollHeight + 'px';
          content.style.paddingTop = '0.75rem';
          content.style.paddingBottom = '0.75rem';
        }
      });
    });
  }

  // Reset / Export / Import
  function resetToDefault() {
    currentConfig = JSON.parse(JSON.stringify(defaultConfig));

    // UI sync
    const set = (id, val) => {
      const el = document.getElementById(id);
      const ro = document.getElementById(id + '-val');
      if (el) el.value = val;
      if (ro) ro.textContent = fmt(val);
    };

    set('style-select', currentConfig.style);

    set('body-scale-x', currentConfig.bodyScale.x);
    set('body-scale-y', currentConfig.bodyScale.y);
    set('body-scale-z', currentConfig.bodyScale.z);
    set('body-pos-y', currentConfig.bodyPosition.y);

    set('belly-scale-x', currentConfig.bellyScale.x);
    set('belly-scale-y', currentConfig.bellyScale.y);
    set('belly-scale-z', currentConfig.bellyScale.z);
    set('belly-pos-y', currentConfig.bellyPosition.y);
    set('belly-pos-z', currentConfig.bellyPosition.z);

    set('beak-scale-x', currentConfig.beakScale.x);
    set('beak-scale-y', currentConfig.beakScale.y);
    set('beak-pos-y', currentConfig.beakPosition.y);
    set('beak-pos-z', currentConfig.beakPosition.z);

    set('wing-scale-x', currentConfig.wingScale.x);
    set('wing-scale-y', currentConfig.wingScale.y);
    set('wing-scale-z', currentConfig.wingScale.z);
    set('wing-pos-x', currentConfig.wingPosition.x);
    set('wing-pos-y', currentConfig.wingPosition.y);
    set('wing-rot-z', currentConfig.wingRotation.z);

    set('feet-scale-x', currentConfig.feetScale.x);
    set('feet-scale-y', currentConfig.feetScale.y);
    set('feet-scale-z', currentConfig.feetScale.z);
    set('feet-pos-x', currentConfig.feetPosition.x);
    set('feet-pos-y', currentConfig.feetPosition.y);
    set('feet-pos-z', currentConfig.feetPosition.z);

    const setColor = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setColor('body-color', currentConfig.bodyColor);
    setColor('belly-color', currentConfig.bellyColor);
    setColor('beak-color', currentConfig.beakColor);
    setColor('wireframe-color', currentConfig.wireframeColor);

    // Apply to model via module API (smooth-ish)
    aimoInstance?.importConfig?.(currentConfig);
  }

  function exportConfig() {
    const cfg = aimoInstance?.exportConfig?.() || currentConfig;
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'aimo-config.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importConfig(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        currentConfig = { ...defaultConfig, ...imported };
        // UI sync + apply
        resetToDefault();
      } catch (err) {
        console.error('Import error:', err);
        alert('Invalid configuration file');
      }
    };
    reader.readAsText(file);
  }

  // === Boot ===
  async function initBuilder() {
    try {
      await loadPenguinModule();
      initAimoBuilder();
    } catch (e) {
      console.error('Builder init error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBuilder);
  } else {
    initBuilder();
  }
</script>


































