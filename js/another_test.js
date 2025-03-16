/**
 * RapierPolyhedron - A high-performance interactive 3D polyhedron using Rapier.js physics
 * This is a reimplementation of the original simplihedron.js with focus on performance
 */

// Import Three.js
import * as THREE from 'three';

// Main class for the Rapier-based polyhedron
class RapierPolyhedron {
  /**
   * Create a new RapierPolyhedron instance
   * @param {HTMLElement} container - The container element to render in
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    // Store container reference
    this.container = container;

    // Default options merged with provided options
    this.options = Object.assign({
      startDelay: 2500,           // Delay before animation starts (ms)
      smoothIntro: false,         // Flag for enabling smooth intro animation
      introFadeDuration: 1500,    // Duration of fade-in animation in ms
      color: 0x1a73e8,            // Default color (blue)
      darkModeColor: 0x00c971,    // Dark mode color (green)
      debug: false,               // Debug mode flag
      polyhedronCount: 3,         // Reduced number of polyhedra for better balance
      spawnStaggerMs: 800,        // Time between spawning each polyhedron (ms)
      polyhedronTypes: ['icosahedron', 'dodecahedron', 'octahedron'], // Use different shapes
      horizontalSpacing: 5,       // Increased spacing between polyhedra
      flowDirection: 0.05         // Subtle directional flow (x-axis)
    }, options);

    // Arrays to store multiple polyhedra and their physics bodies
    this.polyhedra = [];
    this.bodies = [];
    this.colliders = [];
    this.polyhedronStartTimes = [];

    // Available polyhedron types and their mapping to THREE.js geometries and physics colliders
    this.polyhedronTypes = {
      'icosahedron': {
        geometry: THREE.IcosahedronGeometry,
        physicsFactor: 1.0  // Scaling factor for physics collider
      },
      'dodecahedron': {
        geometry: THREE.DodecahedronGeometry,
        physicsFactor: 1.0
      },
      'octahedron': {
        geometry: THREE.OctahedronGeometry,
        physicsFactor: 1.0
      },
      'tetrahedron': {
        geometry: THREE.TetrahedronGeometry,
        physicsFactor: 0.8  // Tetrahedron is smaller visually, adjust collider
      },
      'cube': {
        geometry: THREE.BoxGeometry,
        physicsFactor: 0.85  // For box geometry, use a slightly smaller collider
      }
    };

    // Add debug indicator in top-left corner if requested through URL
    this.debugMode = window.location.search.includes('debug=true') || this.options.debug;
    if (this.debugMode) {
      this.setupDebugDisplay();
    }

    // Check for reduced motion preference
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Set up listener for changes to motion preference
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches;
      this.updateMotionSettings();
    });

    // Set up state variables
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.isActive = false;
    this.isDragging = false;
    this.isHovering = false;
    this.startTime = performance.now() + this.options.startDelay;
    this.physicsReady = false;

    // Initialize settings for motion based on preferences
    this.applyForceMultiplier = this.prefersReducedMotion ? 0.3 : 1.0;
    this.dampingFactor = this.prefersReducedMotion ? 0.8 : 0.5;
    this.rotationSpeed = this.prefersReducedMotion ? 0.0 : 0.005;

    // Initialize Three.js (visuals only)
    this.initThreeJs();

    // Set up event listeners
    this.setupEventListeners();

    // Begin loading Rapier.js asynchronously
    this.loadRapierAsync();

    // Start animation loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  /**
   * Update motion settings based on reduced motion preference
   */
  updateMotionSettings() {
    if (this.prefersReducedMotion) {
      // Reduce or eliminate animations
      this.dampingFactor = 0.8;       // Increase damping to reduce motion
      this.applyForceMultiplier = 0.3; // Reduce force of interactions
      this.rotationSpeed = 0.0;       // Eliminate idle rotation

      // Update physics world settings if it exists
      if (this.world) {
        // Lower gravity and flow for reduced motion
        this.world.gravity = {
          x: this.options.flowDirection * 0.5, // Half the flow speed
          y: -0.3,                             // Gentler gravity
          z: 0
        };
      }
    } else {
      // Normal motion settings
      this.dampingFactor = 0.5;       // Default damping
      this.applyForceMultiplier = 1.0; // Full interaction force
      this.rotationSpeed = 0.005;     // Normal idle rotation

      // Reset physics world settings if it exists
      if (this.world) {
        this.world.gravity = {
          x: this.options.flowDirection, // Normal flow
          y: -.5,                       // Normal floaty gravity
          z: 0
        };
      }
    }
  }

  /**
   * Asynchronously load Rapier.js physics engine
   */
  async loadRapierAsync() {
    try {
      console.log('Loading Rapier physics engine...');

      // Dynamic import of Rapier (won't block initial rendering)
      const RAPIER = await import('https://cdn.skypack.dev/@dimforge/rapier3d-compat');

      // Initialize the WASM module
      await RAPIER.init();

      // Store reference to the initialized module
      this.RAPIER = RAPIER;

      // Initialize physics once Rapier is loaded
      this.initPhysics();

      this.physicsReady = true;
      console.log('Rapier physics initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Rapier physics:', error);
    }
  }

  /**
   * Initialize Three.js scene, camera, renderer, and basic visual elements
   */
  initThreeJs() {
    // Scene setup
    this.scene = new THREE.Scene();

    // Initialize camera target
    this.cameraTarget = new THREE.Vector3(-0.30, 1.60, 0);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      44, // FOV
      this.width / this.height,
      0.1,
      1000
    );
    this.camera.position.set(0.60, -0.30, 13.70);
    this.camera.lookAt(this.cameraTarget);

    // Renderer setup with transparency
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance
    this.container.appendChild(this.renderer.domElement);

    // Add lights
    this.addLights();

    // Create visual polyhedron (physics will be added later)
    this.createVisualPolyhedron();

    // Setup raycaster for interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Setup clock for animation timing
    this.clock = new THREE.Clock();

    // Set up camera controls for dev purposes
    this.setupCameraControls();
  }

  /**
   * Set up camera controls panel for development
   */
  setupCameraControls() {
    // Create controls panel - hidden by default
    this.cameraControlsActive = false;

    const controlsPanel = document.createElement('div');
    controlsPanel.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 1000;
      display: none;
      width: 200px;
    `;
    this.container.appendChild(controlsPanel);

    // Create panel title
    const title = document.createElement('div');
    title.textContent = 'Camera Controls';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
    title.style.paddingBottom = '5px';
    controlsPanel.appendChild(title);

    // Helper to create control groups
    const createControlGroup = (label, initialValue, min, max, step, onChange) => {
      const group = document.createElement('div');
      group.style.marginBottom = '8px';

      const labelEl = document.createElement('div');
      labelEl.textContent = label;
      labelEl.style.marginBottom = '3px';

      const controlContainer = document.createElement('div');
      controlContainer.style.display = 'flex';

      const input = document.createElement('input');
      input.type = 'range';
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = initialValue;
      input.style.flex = '1';
      input.style.marginRight = '5px';

      const valueDisplay = document.createElement('div');
      valueDisplay.textContent = initialValue;
      valueDisplay.style.width = '40px';
      valueDisplay.style.textAlign = 'right';

      input.addEventListener('input', () => {
        valueDisplay.textContent = parseFloat(input.value).toFixed(2);
        onChange(parseFloat(input.value));
      });

      controlContainer.appendChild(input);
      controlContainer.appendChild(valueDisplay);

      group.appendChild(labelEl);
      group.appendChild(controlContainer);

      return {
        group,
        input,
        valueDisplay,
        setValue: (val) => {
          input.value = val;
          valueDisplay.textContent = parseFloat(val).toFixed(2);
        }
      };
    };

    // Camera position controls
    const posXControl = createControlGroup('Position X', this.camera.position.x, -20, 20, 0.1,
      (value) => {
        this.camera.position.x = value;
        this.updateCameraTarget();
      }
    );
    controlsPanel.appendChild(posXControl.group);

    const posYControl = createControlGroup('Position Y', this.camera.position.y, -20, 20, 0.1,
      (value) => {
        this.camera.position.y = value;
        this.updateCameraTarget();
      }
    );
    controlsPanel.appendChild(posYControl.group);

    const posZControl = createControlGroup('Position Z', this.camera.position.z, -20, 20, 0.1,
      (value) => {
        this.camera.position.z = value;
        this.updateCameraTarget();
      }
    );
    controlsPanel.appendChild(posZControl.group);

    // Target position controls
    const targetXControl = createControlGroup('Target X', this.cameraTarget.x, -10, 10, 0.1,
      (value) => {
        this.cameraTarget.x = value;
        this.updateCameraTarget();
      }
    );
    controlsPanel.appendChild(targetXControl.group);

    const targetYControl = createControlGroup('Target Y', this.cameraTarget.y, -10, 10, 0.1,
      (value) => {
        this.cameraTarget.y = value;
        this.updateCameraTarget();
      }
    );
    controlsPanel.appendChild(targetYControl.group);

    const targetZControl = createControlGroup('Target Z', this.cameraTarget.z, -10, 10, 0.1,
      (value) => {
        this.cameraTarget.z = value;
        this.updateCameraTarget();
      }
    );
    controlsPanel.appendChild(targetZControl.group);

    // FOV control
    const fovControl = createControlGroup('FOV', this.camera.fov, 20, 100, 1,
      (value) => {
        this.camera.fov = value;
        this.camera.updateProjectionMatrix();
      }
    );
    controlsPanel.appendChild(fovControl.group);

    // Button to copy camera settings
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy Settings';
    copyButton.style.width = '100%';
    copyButton.style.padding = '5px';
    copyButton.style.marginTop = '10px';
    copyButton.style.backgroundColor = '#2a2a2a';
    copyButton.style.color = 'white';
    copyButton.style.border = '1px solid #444';
    copyButton.style.borderRadius = '3px';
    copyButton.style.cursor = 'pointer';

    copyButton.addEventListener('click', () => {
      const settings = {
        camera: {
          position: {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
          },
          target: {
            x: this.cameraTarget.x,
            y: this.cameraTarget.y,
            z: this.cameraTarget.z
          },
          fov: this.camera.fov
        }
      };

      // Format as JavaScript code
      const codeString = `// Camera settings for simplihedron
this.camera = new THREE.PerspectiveCamera(
  ${settings.camera.fov}, // FOV
  this.width / this.height,
  0.1,
  1000
);
this.camera.position.set(${settings.camera.position.x.toFixed(2)}, ${settings.camera.position.y.toFixed(2)}, ${settings.camera.position.z.toFixed(2)});
this.camera.lookAt(${settings.camera.target.x.toFixed(2)}, ${settings.camera.target.y.toFixed(2)}, ${settings.camera.target.z.toFixed(2)});`;

      // Copy to clipboard
      navigator.clipboard.writeText(codeString)
        .then(() => {
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.textContent = 'Copy Settings';
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy settings:', err);
          copyButton.textContent = 'Copy Failed';
          setTimeout(() => {
            copyButton.textContent = 'Copy Settings';
          }, 2000);
        });
    });

    controlsPanel.appendChild(copyButton);

    // Store references
    this.cameraControlsPanel = controlsPanel;
    this.cameraControls = {
      posX: posXControl,
      posY: posYControl,
      posZ: posZControl,
      targetX: targetXControl,
      targetY: targetYControl,
      targetZ: targetZControl,
      fov: fovControl
    };

    // Add keyboard listener to toggle panel (Ctrl+Shift+C)
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
        this.toggleCameraControls();
      }
    });
  }

  /**
   * Toggle camera controls panel visibility
   */
  toggleCameraControls() {
    this.cameraControlsActive = !this.cameraControlsActive;
    this.cameraControlsPanel.style.display = this.cameraControlsActive ? 'block' : 'none';

    // Update sliders to match current camera state
    if (this.cameraControlsActive) {
      this.cameraControls.posX.setValue(this.camera.position.x);
      this.cameraControls.posY.setValue(this.camera.position.y);
      this.cameraControls.posZ.setValue(this.camera.position.z);
      this.cameraControls.targetX.setValue(this.cameraTarget.x);
      this.cameraControls.targetY.setValue(this.cameraTarget.y);
      this.cameraControls.targetZ.setValue(this.cameraTarget.z);
      this.cameraControls.fov.setValue(this.camera.fov);
    }
  }

  /**
   * Update camera to look at the target
   */
  updateCameraTarget() {
    this.camera.lookAt(this.cameraTarget);
  }

  /**
   * Add lights to the scene
   */
  addLights() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Main directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Add colored point lights for visual interest
    const pointLight1 = new THREE.PointLight(0x0088ff, 1, 10);
    pointLight1.position.set(0, 0, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff3366, 0.8, 10);
    pointLight2.position.set(-5, 3, -5);
    this.scene.add(pointLight2);
  }

  /**
   * Create the visual representation of the polyhedron
   * @param {number} index - Index of the polyhedron to create
   */
  createVisualPolyhedron(index = 0) {
    // Determine which polyhedron type to use based on the index
    const typeIndex = index % this.options.polyhedronTypes.length;
    const polyhedronType = this.options.polyhedronTypes[typeIndex];
    const detailLevel = 0; // Keep detail level simple for performance

    // Get the geometry class from our type mapping
    const geometryType = this.polyhedronTypes[polyhedronType] ?
                        this.polyhedronTypes[polyhedronType].geometry :
                        THREE.IcosahedronGeometry;

    // Create the geometry based on the selected type
    const radius = 1.2;
    let geometry;

    // Different geometry types have different constructor arguments
    if (polyhedronType === 'cube') {
      // For cube, use BoxGeometry with equal dimensions
      geometry = new geometryType(radius * 2, radius * 2, radius * 2);
    } else {
      // For regular polyhedra, use standard constructor
      geometry = new geometryType(radius, detailLevel);
    }

    // Determine color based on color scheme
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.color = isDarkMode ? this.options.darkModeColor : this.options.color;

    // Get the background color from the site
    this.bgColor = this.getComputedBackgroundColor();

    // Detect device capabilities and select the appropriate tier
    if (!this.capabilities) {
      this.capabilities = this.detectCapabilities();
      this.materialTier = this.selectMaterialTier();
    }

    // Create material based on the selected tier
    let material;

    // Apply the appropriate tier
    switch(this.materialTier) {
      case 'high':
        // High-tier: Glass effect
        material = new THREE.MeshPhysicalMaterial({
          color: this.bgColor,
          transparent: true,
          opacity: 0.9,
          metalness: 0.1,
          roughness: 0.2,
          transmission: 0.5,
          thickness: 0.5,
          clearcoat: 0.5
        });
        break;

      case 'medium':
        // Medium-tier: Environment mapping
        if (!this.envMap) {
          // Create simple environment map if none exists
          const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
          this.envMap = pmremGenerator.fromScene(new THREE.Scene()).texture;
          pmremGenerator.dispose();
        }

        material = new THREE.MeshStandardMaterial({
          color: this.bgColor,
          metalness: 0.5,
          roughness: 0.5,
          envMap: this.envMap,
          envMapIntensity: 0.5
        });
        break;

      case 'low':
      default:
        // Low-tier: Simple material that ignores lighting
        material = new THREE.MeshBasicMaterial({
          color: this.bgColor,
          transparent: false,
          opacity: 0.9
        });
        break;
    }

    // Create edges geometry and material for wireframe effect
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: this.color,
      transparent: false,
      opacity: 1
    });

    // Create edges mesh
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    // Create main mesh and add edges
    const polyhedron = new THREE.Mesh(geometry, material);
    polyhedron.add(edges);

    // Store the polyhedron type and radius for physics body creation
    if (index === 0) {
      this.currentPolyhedronType = polyhedronType;
      this.currentPolyhedronRadius = radius;
      this.edges = edges; // Reference for velocity-based effects for the first polyhedron
    }

    // Start with polyhedron hidden until animation begins
    polyhedron.visible = false;

    // Add to scene
    this.scene.add(polyhedron);

    // Store in array
    this.polyhedra[index] = polyhedron;

    // If this is the first polyhedron, set up color scheme change listener
    if (index === 0 && !this.colorSchemeListenerSet) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener(
        'change', this.updateColors.bind(this)
      );
      this.colorSchemeListenerSet = true;
    }

    return polyhedron;
  }

  /**
   * Get the computed background color of the container or its parent
   * @returns {number} - The background color as a hex number
   */
  getComputedBackgroundColor() {
    // Try to get the background color from the container or body
    let bgColor;
    const computedStyle = getComputedStyle(this.container);
    let bgColorStr = computedStyle.backgroundColor;

    // If the container has a transparent background, try the document body
    if (bgColorStr === 'rgba(0, 0, 0, 0)' || bgColorStr === 'transparent') {
      bgColorStr = getComputedStyle(document.body).backgroundColor;

      // If body is also transparent, try to get the CSS variable
      if (bgColorStr === 'rgba(0, 0, 0, 0)' || bgColorStr === 'transparent') {
        const bgColorVar = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
        if (bgColorVar) {
          // If it's a hex color
          if (bgColorVar.startsWith('#')) {
            if (this.debugMode) console.log('Using CSS variable for bg color:', bgColorVar);
            return parseInt(bgColorVar.substring(1), 16);
          }
          // If it's an rgb color string
          else if (bgColorVar.startsWith('rgb')) {
            bgColorStr = bgColorVar;
            if (this.debugMode) console.log('Using CSS rgb variable for bg color:', bgColorStr);
          }
        }
      }
    }

    // Convert the CSS color format to hex
    if (bgColorStr.startsWith('rgb')) {
      // Parse the rgb/rgba format
      const rgbValues = bgColorStr.match(/\d+/g);
      if (rgbValues && rgbValues.length >= 3) {
        // Convert to hex format
        const r = parseInt(rgbValues[0]);
        const g = parseInt(rgbValues[1]);
        const b = parseInt(rgbValues[2]);
        bgColor = (r << 16) | (g << 8) | b;
        if (this.debugMode) console.log('Parsed RGB color:', bgColorStr, 'to hex:', '#' + bgColor.toString(16).padStart(6, '0'));
      }
    }

    // Fallback to a default color if parsing fails
    return bgColor || 0xffffff;
  }

  /**
   * Initialize Rapier physics (called after Rapier has loaded)
   */
  initPhysics() {
    // Create physics world with more balanced gravity for a dreamlike falling effect
    this.world = new this.RAPIER.World({
      x: this.options.flowDirection, // Subtle x-axis flow
      y: -1.5,                       // Reduced gravity for more floaty movement
      z: 0
    });

    // Create boundaries (invisible walls and floor)
    this.createBoundaries();

    // Calculate the number of polyhedra to create
    const polyhedronCount = Math.max(1, this.options.polyhedronCount || 1);

    // Create multiple polyhedra with staggered start times
    for (let i = 0; i < polyhedronCount; i++) {
      // Calculate staggered start time for this polyhedron
      const staggerTime = i * (this.options.spawnStaggerMs || 800);
      this.polyhedronStartTimes[i] = this.startTime + staggerTime;

      // Create a polyhedron with initial visibility set to false
      this.createVisualPolyhedron(i);

      // Create physics body for this polyhedron
      this.createPhysicsBody(i);
    }

    // Apply motion settings based on user preferences
    this.updateMotionSettings();
  }

  /**
   * Create invisible boundaries for physics
   */
  createBoundaries() {
    // Create boundary walls to contain the polyhedron within horizontal bounds
    // but allow vertical movement

    // Remove floor and ceiling to allow falling
    // Only create side walls to keep the object from moving too far horizontally

    // Walls
    this.createBoundary({ x: -5, y: 3, z: 0 }, { x: 0.5, y: 30, z: 10 }); // Left
    this.createBoundary({ x: 5, y: 3, z: 0 }, { x: 0.5, y: 30, z: 10 });  // Right
    this.createBoundary({ x: 0, y: 3, z: -5 }, { x: 10, y: 30, z: 0.5 }); // Back
    this.createBoundary({ x: 0, y: 3, z: 5 }, { x: 10, y: 30, z: 0.5 });  // Front
  }

  /**
   * Create a boundary (wall, floor, ceiling)
   * @param {Object} position - Position of the boundary
   * @param {Object} halfExtents - Half-extents of the boundary box
   */
  createBoundary(position, halfExtents) {
    // Create rigid body description - fixed (zero mass)
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);

    // Create the rigid body
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    // Create the collider shape
    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(
      halfExtents.x, halfExtents.y, halfExtents.z
    );

    // Set restitution (bounciness)
    colliderDesc.setRestitution(0.7);

    // Create and attach the collider
    this.world.createCollider(colliderDesc, rigidBody);

    // Create debug visualization if debug mode is enabled
    if (this.options.debug) {
      const geometry = new THREE.BoxGeometry(
        halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2
      );

      const material = new THREE.MeshBasicMaterial({
        color: 0x444444,
        wireframe: true,
        transparent: true,
        opacity: 0.2
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position.x, position.y, position.z);
      this.scene.add(mesh);
    }
  }

  /**
   * Create the physics body for the polyhedron
   * @param {number} index - Index of the polyhedron to create physics for
   */
  createPhysicsBody(index = 0) {
    // Create a dynamic rigid body for the polyhedron
    // Start position higher above the viewport, with increased horizontal spacing
    const spacing = this.options.horizontalSpacing || 5;

    // Determine horizontal position - spread them out more evenly
    // For 3 polyhedra: positions at -spacing, 0, and +spacing
    const horizontalPosition = (index - (this.options.polyhedronCount - 1) / 2) * spacing;

    // Add some vertical staggering too - middle one a bit higher
    const verticalOffset = index === 1 ? 3 : 0;

    const bodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(
        horizontalPosition + (Math.random() * 2 - 1),  // Position + small random variation
        15 + verticalOffset,                          // Start high above viewport with staggering
        (Math.random() * 2) - 1                       // Random z position
      )
      .setLinearDamping(this.dampingFactor)   // Damping to slow linear movement (accessibility-aware)
      .setAngularDamping(this.dampingFactor); // Damping to slow rotation (accessibility-aware)

    const body = this.world.createRigidBody(bodyDesc);

    // Use the polyhedron type that matches the visual polyhedron
    const typeIndex = index % this.options.polyhedronTypes.length;
    const polyhedronType = this.options.polyhedronTypes[typeIndex];

    // Get physics information for this polyhedron type
    const physicsInfo = this.polyhedronTypes[polyhedronType] || this.polyhedronTypes['icosahedron'];
    const physicsFactor = physicsInfo.physicsFactor || 1.0;

    // Base radius for the collider
    const radius = this.currentPolyhedronRadius || 1.2;

    // Create a collider based on the polyhedron type
    let colliderDesc;

    if (polyhedronType === 'cube') {
      // For cube, use a cuboid collider
      const halfExtent = radius * physicsFactor;
      colliderDesc = this.RAPIER.ColliderDesc.cuboid(halfExtent, halfExtent, halfExtent);
    } else {
      // For other shapes, use a ball collider with adjusted radius
      // This is simpler and more performant while still giving reasonable collision behavior
      colliderDesc = this.RAPIER.ColliderDesc.ball(radius * physicsFactor);
    }

    // Set physics properties
    colliderDesc.setRestitution(0.7); // Bounciness
    colliderDesc.setFriction(0.2);    // Friction

    // Create the collider and attach it to the body
    const collider = this.world.createCollider(colliderDesc, body);

    // Apply initial random rotation (reduced or normal based on preference)
    const rotationForce = this.prefersReducedMotion ? 0.5 : 2.0;
    body.setAngvel({
      x: (Math.random() - 0.5) * rotationForce,
      y: (Math.random() - 0.5) * rotationForce,
      z: (Math.random() - 0.5) * rotationForce
    });

    // Store references to the bodies and colliders
    this.bodies[index] = body;
    this.colliders[index] = collider;

    // If this is the first body, keep backward compatibility with existing code
    if (index === 0) {
      this.body = body;
      this.collider = collider;
    }

    return body;
  }

  /**
   * Set up event listeners for interaction
   */
  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Mouse events
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    // Touch events
    this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  /**
   * Get input coordinates from mouse or touch event
   * @param {Event} event - Mouse or touch event
   * @param {boolean} isTouch - Whether the event is a touch event
   * @returns {Object} Normalized coordinates and raw client coordinates
   */
  getInputCoordinates(event, isTouch = false) {
    const rect = this.renderer.domElement.getBoundingClientRect();

    if (isTouch) {
      // Touch event handling
      if (!event.touches || event.touches.length === 0) {
        return { x: 0, y: 0, clientX: 0, clientY: 0 };
      }

      return {
        x: ((event.touches[0].clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.touches[0].clientY - rect.top) / rect.height) * 2 + 1,
        clientX: event.touches[0].clientX,
        clientY: event.touches[0].clientY
      };
    } else {
      return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
        clientX: event.clientX,
        clientY: event.clientY
      };
    }
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    // Update dimensions
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    // Update camera
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  /**
   * Handle mouse down event
   * @param {MouseEvent} event - Mouse event
   */
  onMouseDown(event) {
    const coords = this.getInputCoordinates(event);
    this.startDragging(coords, event.clientX, event.clientY);
  }

  /**
   * Handle mouse move event
   * @param {MouseEvent} event - Mouse event
   */
  onMouseMove(event) {
    const coords = this.getInputCoordinates(event);

    if (this.isDragging) {
      this.updateDragging(coords, event.clientX, event.clientY);
    } else {
      // Update hover state for interactive cursor
      this.updateHoverState(coords);
    }
  }

  /**
   * Handle mouse up event
   */
  onMouseUp() {
    this.endDragging();
  }

  /**
   * Handle touch start event
   * @param {TouchEvent} event - Touch event
   */
  onTouchStart(event) {
    // Prevent default to avoid scrolling while interacting with the polyhedron
    const coords = this.getInputCoordinates(event, true);
    if (this.startDragging(coords, coords.clientX, coords.clientY)) {
      event.preventDefault();
    }
  }

  /**
   * Handle touch move event
   * @param {TouchEvent} event - Touch event
   */
  onTouchMove(event) {
    if (this.isDragging) {
      event.preventDefault();
      const coords = this.getInputCoordinates(event, true);
      this.updateDragging(coords, coords.clientX, coords.clientY);
    }
  }

  /**
   * Handle touch end event
   */
  onTouchEnd() {
    this.endDragging();
  }

  /**
   * Update hover state based on mouse position
   * @param {Object} coords - Normalized mouse coordinates
   */
  updateHoverState(coords) {
    if (!this.isActive) return;

    // Update raycaster with mouse position
    this.mouse.x = coords.x;
    this.mouse.y = coords.y;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Store previous state
    const wasHovering = this.isHovering;
    this.isHovering = false;

    // Check for intersection with any polyhedron
    for (let i = 0; i < this.polyhedra.length; i++) {
      const polyhedron = this.polyhedra[i];
      if (!polyhedron || !polyhedron.visible) continue;

      const intersects = this.raycaster.intersectObject(polyhedron, true);

      if (intersects.length > 0) {
        this.isHovering = true;
        this.hoveringPolyhedronIndex = i;

        // Visual feedback for this specific polyhedron
        if (polyhedron.children.length > 0) {
          const edges = polyhedron.children[0];
          if (edges.material) {
            edges.material.opacity = 1.0; // Enhanced opacity when hovering
          }
        }
      } else {
        // Reset opacity if not hovering over this polyhedron
        if (polyhedron.children.length > 0) {
          const edges = polyhedron.children[0];
          if (edges.material) {
            edges.material.opacity = 0.85; // Normal opacity
          }
        }
      }
    }

    // Only update cursor if the hover state changed
    if (wasHovering !== this.isHovering) {
      // Update cursor style
      document.body.style.cursor = this.isHovering ? 'grab' : 'auto';
    }
  }

  /**
   * Start dragging the polyhedron
   * @param {Object} coords - Normalized mouse coordinates
   * @param {number} clientX - Client X position
   * @param {number} clientY - Client Y position
   * @returns {boolean} Whether dragging started successfully
   */
  startDragging(coords, clientX, clientY) {
    if (!this.isActive || !this.isHovering || !this.physicsReady) return false;

    // Get the index of the polyhedron we're interacting with
    const polyhedronIndex = this.hoveringPolyhedronIndex;
    if (polyhedronIndex === undefined || !this.polyhedra[polyhedronIndex]) return false;

    // Store which polyhedron we're dragging
    this.draggingPolyhedronIndex = polyhedronIndex;

    // References to the polyhedron and its body
    const polyhedron = this.polyhedra[polyhedronIndex];
    const body = this.bodies[polyhedronIndex];

    if (!polyhedron || !body) return false;

    // Update mouse position
    this.mouse.x = coords.x;
    this.mouse.y = coords.y;

    // Cast ray from camera through mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersection with the polyhedron
    const intersects = this.raycaster.intersectObject(polyhedron, true);

    if (intersects.length > 0) {
      this.isDragging = true;

      // Change cursor to grabbing
      document.body.style.cursor = 'grabbing';

      // Store positions for velocity calculation on release
      this.dragPositions = [{
        time: performance.now(),
        x: clientX,
        y: clientY
      }];

      // Store interaction point for better dragging
      this.interactionPoint = intersects[0].point.clone();

      // Store the distance from camera to interaction point
      this.dragDistance = this.camera.position.distanceTo(this.interactionPoint);

      // Store original physics properties to restore later
      this.savedGravity = {
        x: this.world.gravity.x,
        y: this.world.gravity.y,
        z: this.world.gravity.z
      };
      this.savedLinVel = body.linvel();
      this.savedAngVel = body.angvel();

      // Disable gravity while dragging
      this.world.gravity = { x: 0, y: 0, z: 0 };

      // Switch to kinematic mode for smooth dragging
      this.body.setBodyType(this.RAPIER.RigidBodyType.KinematicPositionBased);

      // Stop linear velocity
      this.body.setLinvel({ x: 0, y: 0, z: 0 });

      // Calculate target position
      this.targetPosition = new THREE.Vector3();
      this.updateDragTarget(coords);

      return true;
    }

    return false;
  }

  /**
   * Update the target position for drag movement
   * @param {Object} coords - Normalized mouse coordinates
   */
  updateDragTarget(coords) {
    // Update the raycaster
    this.raycaster.setFromCamera({ x: coords.x, y: coords.y }, this.camera);

    // Calculate the target position along the ray at the stored distance
    this.targetPosition.copy(this.camera.position).add(
      this.raycaster.ray.direction.clone().multiplyScalar(this.dragDistance)
    );

    // Constrain target position to keep within bounds
    this.targetPosition.x = Math.max(-4, Math.min(4, this.targetPosition.x));
    this.targetPosition.y = Math.max(-1.5, Math.min(5, this.targetPosition.y));
    this.targetPosition.z = Math.max(-4, Math.min(3, this.targetPosition.z));
  }

  /**
   * Update dragging based on mouse movement
   * @param {Object} coords - Normalized mouse coordinates
   * @param {number} clientX - Client X position
   * @param {number} clientY - Client Y position
   */
  updateDragging(coords, clientX, clientY) {
    if (!this.isDragging) return;

    // Store position for velocity calculation
    this.dragPositions.push({
      time: performance.now(),
      x: clientX,
      y: clientY
    });

    // Keep only recent positions for better throw velocity calculation
    if (this.dragPositions.length > 5) {
      this.dragPositions.shift();
    }

    // Update target position
    this.updateDragTarget(coords);
  }

  /**
   * End dragging and apply throw velocity
   */
  endDragging() {
    if (!this.isDragging || this.draggingPolyhedronIndex === undefined) return;

    const body = this.bodies[this.draggingPolyhedronIndex];
    if (!body) return;

    this.isDragging = false;

    // Update cursor based on hover state
    document.body.style.cursor = this.isHovering ? 'grab' : 'auto';

    // Calculate throw velocity from drag positions
    const throwVelocity = this.calculateThrowVelocity();

    // Restore physics body to dynamic
    body.setBodyType(this.RAPIER.RigidBodyType.Dynamic);

    // Apply throw velocity
    body.setLinvel(throwVelocity);

    // Restore gravity
    this.world.gravity = this.savedGravity || { x: 0, y: -2.5, z: 0 };

    // Add some random rotation
    const angVel = {
      x: this.savedAngVel.x * 0.3 + (Math.random() - 0.5) * 2,
      y: this.savedAngVel.y * 0.3 + (Math.random() - 0.5) * 2,
      z: this.savedAngVel.z * 0.3 + (Math.random() - 0.5) * 2
    };

    body.setAngvel(angVel);

    // Clear drag-related properties
    this.dragPositions = null;
    this.targetPosition = null;
    this.interactionPoint = null;
    this.draggingPolyhedronIndex = undefined;
  }

  /**
   * Calculate velocity to apply when throwing the polyhedron
   * @returns {Object} Velocity vector to apply
   */
  calculateThrowVelocity() {
    const velocity = { x: 0, y: 0, z: 0 };

    if (!this.dragPositions || this.dragPositions.length < 2) {
      return velocity;
    }

    // Get the most recent and oldest tracked positions
    const latest = this.dragPositions[this.dragPositions.length - 1];
    const oldest = this.dragPositions[0];

    // Calculate time difference in seconds
    const timeDiff = (latest.time - oldest.time) / 1000;

    if (timeDiff > 0) {
      // Calculate pixel velocity
      const pixelVelocityX = (latest.x - oldest.x) / timeDiff;
      const pixelVelocityY = (latest.y - oldest.y) / timeDiff;

      // Convert to world space velocity - scale based on screen size and distance from camera
      // Apply reduced motion scaling if needed
      const velocityFactor = 0.02 * this.applyForceMultiplier;
      const screenSizeFactor = Math.min(this.width, this.height) / 1000;

      // Convert screen velocity to world velocity using the camera's basis vectors
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

      // Calculate world velocity
      velocity.x = (right.x * pixelVelocityX - up.x * pixelVelocityY) * velocityFactor * screenSizeFactor;
      velocity.y = (right.y * pixelVelocityX - up.y * pixelVelocityY) * velocityFactor * screenSizeFactor;
      velocity.z = (right.z * pixelVelocityX - up.z * pixelVelocityY) * velocityFactor * screenSizeFactor;

      // Apply velocity limits to prevent extreme throws
      // Use lower max velocity for reduced motion
      const maxVelocity = this.prefersReducedMotion ? 5 : 10;
      const velocityMagnitude = Math.sqrt(
        velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z
      );

      if (velocityMagnitude > maxVelocity) {
        const scaleFactor = maxVelocity / velocityMagnitude;
        velocity.x *= scaleFactor;
        velocity.y *= scaleFactor;
        velocity.z *= scaleFactor;
      }
    }

    return velocity;
  }

  /**
   * Update colors based on color scheme
   */
  updateColors() {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.color = isDarkMode ? this.options.darkModeColor : this.options.color;

    // Update background color
    this.bgColor = this.getComputedBackgroundColor();

    // Update all polyhedra materials
    for (let i = 0; i < this.polyhedra.length; i++) {
      const polyhedron = this.polyhedra[i];
      if (!polyhedron) continue;

      // Update main mesh color to match background
      if (polyhedron.material) {
        polyhedron.material.color.set(this.bgColor);

        // Update other material properties if using advanced materials
        if (this.materialTier === 'high' && polyhedron.material.transmission !== undefined) {
          // High tier material adjustments
          polyhedron.material.clearcoat = 0.5;
          polyhedron.material.transmission = 0.5;
        } else if (this.materialTier === 'medium' && polyhedron.material.envMap) {
          // Medium tier material adjustments
          polyhedron.material.envMapIntensity = 0.5;
        }
      }

      // Update edge color
      if (polyhedron.children.length > 0) {
        const edges = polyhedron.children[0];
        if (edges.material) {
          edges.material.color.set(this.color);
        }
      }
    }
  }

  /**
   * Activate the polyhedron animation
   */
  activatePolyhedron() {
    if (this.isActive) return;

    // Make polyhedron visible
    this.polyhedron.visible = true;

    // Start fade-in animation
    this.fadeInTime = performance.now();

    // Set fade duration based on animation preferences
    this.fadeInDuration = this.options.smoothIntro ?
      this.options.introFadeDuration : // Use longer fade for smooth intro
      (this.prefersReducedMotion ? 500 : 1000); // Original duration logic

    // If smooth intro is enabled, start with fully transparent polyhedron and floor
    if (this.options.smoothIntro) {
      // Set polyhedron and edges to fully transparent
      if (this.polyhedron.material) {
        this.polyhedron.material.opacity = 0;
      }

      if (this.polyhedron.children.length > 0) {
        const edges = this.polyhedron.children[0];
        if (edges.material) {
          edges.material.opacity = 0;
        }
      }

      // Start with slightly reduced scale for a "grow" effect
      this.polyhedron.scale.set(0.95, 0.95, 0.95);

      // Note: Floor opacity is now handled in createGradientFloor and handleFadeIn
    }

    this.isActive = true;
  }

  /**
   * Handle fade-in animation
   */
  handleFadeIn() {
    if (!this.isActive || !this.fadeInTime) return;

    const elapsedTime = performance.now() - this.fadeInTime;
    let progress = Math.min(elapsedTime / this.fadeInDuration, 1);

    // If reduced motion is preferred, accelerate the fade-in
    if (this.prefersReducedMotion) {
      progress = Math.min(progress * 2, 1); // Twice as fast
    }

    // Update opacity based on progress
    if (this.polyhedron) {
      // Update main material
      if (this.polyhedron.material) {
        this.polyhedron.material.opacity = progress * 0.2; // Semi-transparent body
      }

      // Update edges
      if (this.polyhedron.children.length > 0) {
        const edges = this.polyhedron.children[0];
        if (edges.material) {
          edges.material.opacity = progress;
        }
      }

      // If using smooth intro, also scale up slightly from initial 0.95 to 1.0
      if (this.options.smoothIntro) {
        const scaleProgress = 0.95 + (0.05 * progress);
        this.polyhedron.scale.set(scaleProgress, scaleProgress, scaleProgress);
      }
    }

    // Animate the floor as well if it exists and we're using smooth intro
    if (this.options.smoothIntro && this.gradientFloor && this.gradientFloor.material) {
      // Use the stored target opacity or fall back to calculated value
      const targetOpacity = this.targetFloorOpacity ||
                         (window.matchMedia('(prefers-color-scheme: dark)').matches ? 0.15 : 0.35);

      // Delay the floor slightly so it fades in after the polyhedron starts appearing
      // This creates a more natural progression from nothing to full scene
      const floorProgress = Math.max(0, progress - 0.2) * 1.25; // Delay by 20%, then accelerate slightly
      this.gradientFloor.material.opacity = Math.min(1, floorProgress) * targetOpacity;
    }

    // Animation complete
    if (progress >= 1) {
      this.fadeInTime = null;
    }
  }

  /**
   * Update polyhedron while being dragged
   */
  updateDraggedPolyhedron() {
    if (!this.isDragging || this.draggingPolyhedronIndex === undefined || !this.targetPosition) return;

    const body = this.bodies[this.draggingPolyhedronIndex];
    if (!body) return;

    // Current position
    const current = body.translation();
    const currentPos = new THREE.Vector3(current.x, current.y, current.z);

    // Calculate smooth movement towards target
    const smoothFactor = 0.3; // Higher = faster response
    const newPos = new THREE.Vector3(
      currentPos.x + (this.targetPosition.x - currentPos.x) * smoothFactor,
      currentPos.y + (this.targetPosition.y - currentPos.y) * smoothFactor,
      currentPos.z + (this.targetPosition.z - currentPos.z) * smoothFactor
    );

    // Update physics body position
    body.setTranslation({
      x: newPos.x,
      y: newPos.y,
      z: newPos.z
    });
  }

  /**
   * Main animation loop
   */
  animate() {
    requestAnimationFrame(this.animate);

    const currentTime = performance.now();

    // Check if we should activate any polyhedra
    if (this.physicsReady) {
      // Check each polyhedron
      for (let i = 0; i < this.polyhedra.length; i++) {
        const startTime = this.polyhedronStartTimes[i] || this.startTime;
        // If this polyhedron isn't active yet and its time has come
        if (!this.polyhedra[i].visible && currentTime > startTime) {
          this.activatePolyhedron(i);
        }
      }
    } else if (!this.isActive && currentTime > this.startTime) {
      // Physics isn't ready yet, extend delay
      this.startTime = performance.now() + 500;
    }

    // Handle fade-in animation for all active polyhedra
    this.handleAllFadeIns();

    // Update physics if ready
    if (this.physicsReady && this.world) {
      // Get delta time from clock
      const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time

      // Check for dragging
      if (this.isDragging && this.draggingPolyhedronIndex !== undefined) {
        this.updateDraggedPolyhedron();
      }

      // Step the physics world
      this.world.step();

      // Check if polyhedra need respawning and update positions
      for (let i = 0; i < this.polyhedra.length; i++) {
        if (this.polyhedra[i].visible && this.bodies[i]) {
          // Check for respawn
          this.checkRespawnPolyhedron(i);

          // Update position and rotation
          const position = this.bodies[i].translation();
          const rotation = this.bodies[i].rotation();
          this.polyhedra[i].position.set(position.x, position.y, position.z);
          this.polyhedra[i].quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

          // Update material effects for the first polyhedron
          if (i === 0 && !this.prefersReducedMotion) {
            const velocity = this.bodies[i].linvel();
            const speed = Math.sqrt(
              velocity.x * velocity.x +
              velocity.y * velocity.y +
              velocity.z * velocity.z
            );
            this.updateMaterialEffects(speed);
          }
        }
      }
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);

    // Update debug display if active
    if (this.debugMode) {
      this.updateDebugDisplay();
    }
  }

  /**
   * Activate a specific polyhedron
   * @param {number} index - Index of the polyhedron to activate
   */
  activatePolyhedron(index = 0) {
    if (!this.polyhedra[index] || this.polyhedra[index].visible) return;

    // Make polyhedron visible
    this.polyhedra[index].visible = true;

    // Start fade-in animation
    this.polyhedra[index].fadeInTime = performance.now();

    // Set fade duration based on animation preferences
    this.fadeInDuration = this.options.smoothIntro ?
      this.options.introFadeDuration : // Use longer fade for smooth intro
      (this.prefersReducedMotion ? 500 : 1000); // Original duration logic

    // If smooth intro is enabled, start with fully transparent polyhedron
    if (this.options.smoothIntro) {
      // Set polyhedron material to fully transparent
      if (this.polyhedra[index].material) {
        this.polyhedra[index].material.opacity = 0;
      }

      // Set edges to fully transparent
      if (this.polyhedra[index].children.length > 0) {
        const edges = this.polyhedra[index].children[0];
        if (edges.material) {
          edges.material.opacity = 0;
        }
      }

      // Start with slightly reduced scale for a "grow" effect
      this.polyhedra[index].scale.set(0.95, 0.95, 0.95);
    }

    // If this is the first polyhedron, update global state
    if (index === 0) {
      this.isActive = true;
    }
  }

  /**
   * Handle fade-in animation for all polyhedra
   */
  handleAllFadeIns() {
    for (let i = 0; i < this.polyhedra.length; i++) {
      this.handleFadeIn(i);
    }
  }

  /**
   * Handle fade-in animation for a specific polyhedron
   * @param {number} index - Index of the polyhedron
   */
  handleFadeIn(index = 0) {
    const polyhedron = this.polyhedra[index];
    if (!polyhedron || !polyhedron.visible || !polyhedron.fadeInTime) return;

    const elapsedTime = performance.now() - polyhedron.fadeInTime;
    let progress = Math.min(elapsedTime / this.fadeInDuration, 1);

    // If reduced motion is preferred, accelerate the fade-in
    if (this.prefersReducedMotion) {
      progress = Math.min(progress * 2, 1); // Twice as fast
    }

    // Update opacity based on progress
    if (polyhedron) {
      // Update main material
      if (polyhedron.material) {
        polyhedron.material.opacity = progress * 0.2; // Semi-transparent body
      }

      // Update edges
      if (polyhedron.children.length > 0) {
        const edges = polyhedron.children[0];
        if (edges.material) {
          edges.material.opacity = progress;
        }
      }

      // If using smooth intro, also scale up slightly from initial 0.95 to 1.0
      if (this.options.smoothIntro) {
        const scaleProgress = 0.95 + (0.05 * progress);
        polyhedron.scale.set(scaleProgress, scaleProgress, scaleProgress);
      }
    }

    // Animation complete
    if (progress >= 1) {
      polyhedron.fadeInTime = null;
    }
  }

  /**
   * Detect device capabilities for material tier selection
   * @returns {Object} Device capabilities
   */
  detectCapabilities() {
    return {
      // Check if device is likely high-performance
      highPerformance: this.isHighPerformanceDevice(),
      // Check if device supports WebGL2
      webgl2: !!window.WebGL2RenderingContext &&
              !!this.renderer.capabilities.isWebGL2,
      // Check maximum texture size as performance proxy
      maxTextureSize: this.renderer.capabilities.maxTextureSize,
      // Mobile detection
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      // GPU memory limit detection (rough estimate)
      gpuMemory: this.estimateGPUMemory()
    };
  }

  /**
   * Estimate if device is high performance
   * @returns {boolean} Whether the device is likely high performance
   */
  isHighPerformanceDevice() {
    // Simple heuristic based on hardware concurrency (CPU cores)
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const highPerformanceCPU = hardwareConcurrency >= 4;

    // Check for mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Check for recent Safari/Chrome/Firefox
    const isModernBrowser = (
      (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') &&
       parseInt(navigator.userAgent.match(/Version\/(\d+)/)?.[1] || '0', 10) >= 14) ||
      (navigator.userAgent.includes('Chrome') &&
       parseInt(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '0', 10) >= 80) ||
      (navigator.userAgent.includes('Firefox') &&
       parseInt(navigator.userAgent.match(/Firefox\/(\d+)/)?.[1] || '0', 10) >= 80)
    );

    // Return high performance if: not mobile AND (good CPU OR modern browser)
    return !isMobile && (highPerformanceCPU || isModernBrowser);
  }

  /**
   * Estimate available GPU memory (very rough approximation)
   * @returns {string} 'high', 'medium', or 'low'
   */
  estimateGPUMemory() {
    // WebGL context attributes
    const gl = this.renderer.getContext();

    // Try to get extension information if available
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'medium'; // Default if can't detect

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    // Look for indicators of high-end GPUs
    const isHighEnd = /NVIDIA|AMD|RTX|GTX|Radeon/i.test(renderer);
    const isLowEnd = /Intel|HD Graphics|Iris|Mobile|Mali|Adreno/i.test(renderer);

    // See if max textures and max texture size indicate capabilities
    const maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    // Combine factors
    if (isHighEnd || (maxTextureUnits >= 16 && maxTextureSize >= 8192)) {
      return 'high';
    } else if (isLowEnd || maxTextureSize <= 4096) {
      return 'low';
    } else {
      return 'medium';
    }
  }

  /**
   * Select appropriate material tier based on capabilities and preferences
   * @returns {string} 'high', 'medium', or 'low'
   */
  selectMaterialTier() {
    // Always respect reduced motion preference
    if (this.prefersReducedMotion) {
      return 'low';
    }

    // Check if we're on a battery-powered device and if battery is low
    let isBatteryLow = false;
    if ('getBattery' in navigator) {
      try {
        navigator.getBattery().then(battery => {
          isBatteryLow = battery.level < 0.2;
        });
      } catch (e) {
        // Ignore errors with battery API
      }
    }

    // Low power mode detection (where available)
    const isLowPowerMode = window.matchMedia &&
                           window.matchMedia('(prefers-reduced-data: reduce)').matches;

    // If battery is low or in low power mode, drop to low tier
    if (isBatteryLow || isLowPowerMode) {
      return 'low';
    }

    // Select tier based on capabilities
    if (this.capabilities.highPerformance &&
        this.capabilities.webgl2 &&
        this.capabilities.gpuMemory === 'high') {
      return 'high';
    } else if (!this.capabilities.isMobile &&
              this.capabilities.gpuMemory !== 'low') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Update material based on velocity for dynamic effects
   * @param {number} speed - Current speed of the polyhedron
   */
  updateMaterialEffects(speed) {
    if (!this.polyhedron || !this.polyhedron.material) return;

    switch(this.materialTier) {
      case 'high':
        // Update glass material properties based on motion
        this.polyhedron.material.clearcoat = Math.min(0.5 + (speed * 2), 1.0);
        this.polyhedron.material.transmission = Math.min(0.5 + speed, 0.9);
        break;

      case 'medium':
        // Update environment mapping intensity
        if (this.polyhedron.material.envMap) {
          this.polyhedron.material.envMapIntensity = 0.5 + (speed * 5);
        }
        break;

      case 'low':
      default:
        // Just update edge colors for the basic tier
        if (this.edges && this.edges.material) {
          const pulseIntensity = Math.min(0.85 + speed * 5, 1.3);
          const baseColor = new THREE.Color(this.color);
          const brightColor = new THREE.Color(this.color).multiplyScalar(1.3);
          this.edges.material.color.lerpColors(baseColor, brightColor, pulseIntensity);
        }
        break;
    }
  }

  /**
   * Creates a subtle circular gradient floor that blends with the background
   * This provides spatial reference without breaking the visual flow
   */
  createGradientFloor() {
    // Create a circular plane for the floor - sized to match the physics boundary
    const floorRadius = 5; // Match the physics boundary width (10 units across)
    const floorGeometry = new THREE.CircleGeometry(floorRadius, 64);

    // Get the current background color
    const bgColor = this.getComputedBackgroundColor();
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (this.debugMode) {
      console.log('Creating gradient floor:');
      console.log('Background color:', '#' + new THREE.Color(bgColor).getHexString());
      console.log('Dark mode:', isDarkMode);
    }

    // Create a simpler implementation without shaders to avoid WebGL warnings
    // Use a radial texture instead of shader code
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Create a radial gradient
    const gradient = ctx.createRadialGradient(
      size/2, size/2, 0,            // Inner circle (center point, 0 radius)
      size/2, size/2, size/2 * 0.9  // Outer circle (90% of radius)
    );

    // Get base color as hex
    const baseColor = '#' + new THREE.Color(bgColor).getHexString();

    // Create gradient colors based on theme
    let centerColor;
    if (isDarkMode) {
      // For dark mode, significantly higher contrast center
      centerColor = new THREE.Color(bgColor).multiplyScalar(1.8);
    } else {
      // For light mode, make center MUCH darker for better visibility
      centerColor = new THREE.Color(bgColor).multiplyScalar(0.4);
    }
    const centerColorHex = '#' + centerColor.getHexString();

    // Set gradient stops
    gradient.addColorStop(0, centerColorHex);
    gradient.addColorStop(0.7, baseColor);
    gradient.addColorStop(1, baseColor);

    // Fill the canvas
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Set initial opacity based on theme and animation settings
    // Store the target opacity so we can animate to it
    this.targetFloorOpacity = isDarkMode ? 0.15 : 0.35; // Increased opacity for better visibility

    // Initial opacity is 0 if using smooth intro, otherwise target opacity
    const initialOpacity = this.options.smoothIntro ? 0 : this.targetFloorOpacity;

    // Create material with the gradient texture
    const floorMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: initialOpacity,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // Create and position the floor mesh
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Lay flat
    floor.position.y = -1.5; // Adjusted to match where the polyhedron actually rests
    floor.renderOrder = -1; // Render before other objects

    // Add to scene
    this.scene.add(floor);
    this.gradientFloor = floor;

    // Update floor when color scheme changes
    this.setupFloorThemeUpdates();

    // Update debug display if active
    if (this.debugMode) {
      this.updateDebugDisplay();
    }
  }

  /**
   * Sets up listeners to update the floor when theme changes
   */
  setupFloorThemeUpdates() {
    if (!this.gradientFloor) return;

    // Listen for color scheme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.updateFloorColors();
    });
  }

  /**
   * Updates floor colors when theme changes
   */
  updateFloorColors() {
    if (!this.gradientFloor) return;

    const bgColor = this.getComputedBackgroundColor();
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Create canvas for texture
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Create a radial gradient
    const gradient = ctx.createRadialGradient(
      size/2, size/2, 0,            // Inner circle (center)
      size/2, size/2, size/2 * 0.9  // Outer circle
    );

    // Get base color as hex
    const baseColor = '#' + new THREE.Color(bgColor).getHexString();

    // Create gradient colors with higher contrast for better visibility
    let centerColor;
    if (isDarkMode) {
      // For dark mode, much brighter center
      centerColor = new THREE.Color(bgColor).multiplyScalar(1.8);
    } else {
      // For light mode, much darker center
      centerColor = new THREE.Color(bgColor).multiplyScalar(0.4);
    }
    const centerColorHex = '#' + centerColor.getHexString();

    // Update gradient stops
    gradient.addColorStop(0, centerColorHex);
    gradient.addColorStop(0.7, baseColor);
    gradient.addColorStop(1, baseColor);

    // Fill the canvas
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Update material
    const material = this.gradientFloor.material;
    material.map = texture;

    // Set target opacity (but don't change current opacity during animation)
    this.targetFloorOpacity = isDarkMode ? 0.15 : 0.35; // Increased contrast

    // Only update actual opacity if not in the middle of a fade animation
    if (!this.fadeInTime || !this.options.smoothIntro) {
      material.opacity = this.targetFloorOpacity;
    }

    if (this.debugMode) {
      this.updateDebugDisplay();
    }
  }

  /**
   * Creates a debug display in the top-left corner
   */
  setupDebugDisplay() {
    // Create container for debug info
    this.debugDisplay = document.createElement('div');
    this.debugDisplay.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      max-width: 250px;
      pointer-events: none;
    `;
    this.container.appendChild(this.debugDisplay);
  }

  /**
   * Updates the debug display with current values
   */
  updateDebugDisplay() {
    if (!this.debugDisplay) return;

    const bgColor = this.getComputedBackgroundColor();
    const bgColorHex = '#' + new THREE.Color(bgColor).getHexString();

    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Calculate center color based on current logic
    let centerColor;
    if (isDarkMode) {
      centerColor = new THREE.Color(bgColor).multiplyScalar(1.2);
    } else {
      centerColor = new THREE.Color(bgColor).multiplyScalar(0.65);
    }
    const centerColorHex = '#' + centerColor.getHexString();

    // Get current interaction info
    let interactionInfo = '';
    if (this.isDragging && this.draggingPolyhedronIndex !== undefined) {
      interactionInfo = `Dragging polyhedron #${this.draggingPolyhedronIndex}`;
    } else if (this.isHovering && this.hoveringPolyhedronIndex !== undefined) {
      interactionInfo = `Hovering polyhedron #${this.hoveringPolyhedronIndex}`;
    }

    // Get position info for the first polyhedron
    let positionInfo = 'N/A';
    if (this.bodies && this.bodies[0]) {
      const pos = this.bodies[0].translation();
      positionInfo = `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
    }

    // Build debug info HTML
    this.debugDisplay.innerHTML = `
      <div style="margin-bottom:5px;font-weight:bold;">Polyhedron Debug</div>
      <div>Type: ${this.currentPolyhedronType || 'icosahedron'}</div>
      <div>Detail Level: ${this.options.polyhedronDetailLevel}</div>
      <div>Count: ${this.polyhedra.length}</div>
      <div>Position: ${positionInfo}</div>
      <div>Interaction: ${interactionInfo}</div>
      <div>Theme: ${isDarkMode ? 'Dark Mode' : 'Light Mode'}</div>
      <div style="display:flex;align-items:center;margin:5px 0;">
        Detected BG: <span style="display:inline-block;width:12px;height:12px;background:${bgColorHex};margin:0 5px;border:1px solid white;"></span>${bgColorHex}
      </div>
      <div style="display:flex;align-items:center;margin:5px 0;">
        Color: <span style="display:inline-block;width:12px;height:12px;background:${centerColorHex};margin:0 5px;border:1px solid white;"></span>${centerColorHex}
      </div>
      <div>Gravity: ${this.world ? this.world.gravity.y.toFixed(2) : 'N/A'}</div>
    `;
  }

  /**
   * Check if the polyhedron is out of the viewport and respawn if needed
   * @param {number} index - Index of the polyhedron to check
   */
  checkRespawnPolyhedron(index = 0) {
    if (!this.physicsReady || !this.bodies[index]) return;

    // Get current position
    const position = this.bodies[index].translation();

    // Define viewport bounds with some extra padding
    const lowerBound = -15; // Threshold below which we consider the object out of view
    const upperSpawnPoint = 15; // Position to respawn above the viewport

    // If polyhedron has fallen below the lower bound
    if (position.y < lowerBound) {
      // Get the proper horizontal position for this index to maintain formation
      const spacing = this.options.horizontalSpacing || 5;
      const horizontalPosition = (index - (this.options.polyhedronCount - 1) / 2) * spacing;

      // Add vertical staggering for visual interest
      const verticalOffset = index === 1 ? 3 : 0;

      // Respawn the polyhedron above the viewport
      this.bodies[index].setTranslation({
        x: horizontalPosition + (Math.random() * 2 - 1), // Horizontal position + small variation
        y: upperSpawnPoint + verticalOffset,             // Above viewport with staggering
        z: (Math.random() * 2) - 1                       // Random z position
      });

      // Apply random rotation
      this.bodies[index].setAngvel({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2
      });

      // Reset linear velocity for a fresh drop
      this.bodies[index].setLinvel({ x: 0, y: 0, z: 0 });

      if (this.debugMode) {
        console.log(`Polyhedron ${index} (${this.options.polyhedronTypes[index % this.options.polyhedronTypes.length]}) respawned above viewport`);
      }
    }
  }

  /**
   * Change the polyhedron type
   * @param {string} newType - The new polyhedron type ('icosahedron', 'dodecahedron', 'octahedron', 'tetrahedron', 'cube')
   * @param {number} detailLevel - Detail level for the geometry (optional)
   * @returns {boolean} Whether the type was changed successfully
   */
  changePolyhedronType(newType, detailLevel = 0) {
    // Check if the requested type exists
    if (!this.polyhedronTypes[newType]) {
      console.error(`Polyhedron type '${newType}' not supported. Available types:`, Object.keys(this.polyhedronTypes));
      return false;
    }

    // Store the new type in options
    this.options.polyhedronType = newType;
    this.options.polyhedronDetailLevel = detailLevel;

    // Remove the old polyhedron from the scene
    if (this.polyhedron) {
      this.scene.remove(this.polyhedron);
    }

    // Create a new visual polyhedron
    this.createVisualPolyhedron();

    // If physics is ready, update the physics body too
    if (this.physicsReady && this.body) {
      // Remove the old collider
      if (this.collider) {
        this.world.removeCollider(this.collider, true);
      }

      // Create a new collider
      this.createPhysicsBody();
    }

    // Make sure the polyhedron is visible if the animation is active
    if (this.isActive) {
      this.polyhedron.visible = true;
    }

    if (this.debugMode) {
      console.log(`Changed polyhedron type to ${newType} with detail level ${detailLevel}`);
    }

    return true;
  }

  /**
   * Get an array of available polyhedron types
   * @returns {string[]} Array of available polyhedron types
   */
  getAvailablePolyhedronTypes() {
    return Object.keys(this.polyhedronTypes);
  }
}

// Export for use in main.js
export default RapierPolyhedron;