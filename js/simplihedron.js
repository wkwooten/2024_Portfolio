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
      color: 0x1a73e8,            // Default color (blue)
      darkModeColor: 0x00c971,    // Dark mode color (green)
      debug: false                // Debug mode flag
    }, options);

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
        // Increase gravity to make objects settle faster
        this.world.gravity = { x: 0, y: -9.8 * 1.5, z: 0 };
      }
    } else {
      // Normal motion settings
      this.dampingFactor = 0.5;       // Default damping
      this.applyForceMultiplier = 1.0; // Full interaction force
      this.rotationSpeed = 0.005;     // Normal idle rotation

      // Reset physics world settings if it exists
      if (this.world) {
        this.world.gravity = { x: 0, y: -0.5, z: 0 }; // Normal gravity
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

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      55, // FOV
      this.width / this.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 3.9, 7.5);
    this.camera.lookAt(0, 0, 0);

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
   */
  createVisualPolyhedron() {
    // Create the geometry - icosahedron for interesting shape
    const radius = 1.2;
    const geometry = new THREE.IcosahedronGeometry(radius, 0);

    // Determine color based on color scheme
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.color = isDarkMode ? this.options.darkModeColor : this.options.color;

    // Get the background color from the site
    this.bgColor = this.getComputedBackgroundColor();

    // Detect device capabilities and select the appropriate tier
    this.capabilities = this.detectCapabilities();
    this.materialTier = this.selectMaterialTier();

    // Create material based on the selected tier
    let material;

    // Apply the appropriate tier
    switch(this.materialTier) {
      case 'high':
        // High-tier: Glass effect
        material = new THREE.MeshPhysicalMaterial({
          color: this.bgColor,
          transparent: true,
          opacity: 0.7,
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
        // Low-tier: Simple material
        material = new THREE.MeshStandardMaterial({
          color: this.bgColor,
          metalness: 0.2,
          roughness: 0.8
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
    this.polyhedron = new THREE.Mesh(geometry, material);
    this.polyhedron.add(edges);

    // Reference for velocity-based effects
    this.edges = edges;

    // Start with polyhedron hidden until animation begins
    this.polyhedron.visible = false;

    // Add to scene
    this.scene.add(this.polyhedron);

    // Listen for color scheme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener(
      'change', this.updateColors.bind(this)
    );
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
      }
    }

    // Fallback to a default color if parsing fails
    return bgColor || 0xffffff;
  }

  /**
   * Initialize Rapier physics (called after Rapier has loaded)
   */
  initPhysics() {
    // Create physics world with gravity
    this.world = new this.RAPIER.World({ x: 0, y: -0.5, z: 0 });

    // Create boundaries (invisible walls and floor)
    this.createBoundaries();

    // Create the polyhedron physics body
    this.createPhysicsBody();

    // Apply motion settings based on user preferences
    this.updateMotionSettings();
  }

  /**
   * Create invisible boundaries for physics
   */
  createBoundaries() {
    // Create boundary walls to contain the polyhedron

    // Floor - slightly below the visible area
    this.createBoundary({ x: 0, y: -2, z: 0 }, { x: 10, y: 0.5, z: 10 });

    // Ceiling - to prevent flying too high
    this.createBoundary({ x: 0, y: 10, z: 0 }, { x: 10, y: 0.5, z: 10 });

    // Walls
    this.createBoundary({ x: -5, y: 3, z: 0 }, { x: 0.5, y: 5, z: 10 }); // Left
    this.createBoundary({ x: 5, y: 3, z: 0 }, { x: 0.5, y: 5, z: 10 });  // Right
    this.createBoundary({ x: 0, y: 3, z: -5 }, { x: 10, y: 5, z: 0.5 }); // Back
    this.createBoundary({ x: 0, y: 3, z: 5 }, { x: 10, y: 5, z: 0.5 });  // Front
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
   */
  createPhysicsBody() {
    // Create a dynamic rigid body for the polyhedron
    const bodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 4, 0) // Start position
      .setLinearDamping(this.dampingFactor)   // Damping to slow linear movement (accessibility-aware)
      .setAngularDamping(this.dampingFactor); // Damping to slow rotation (accessibility-aware)

    this.body = this.world.createRigidBody(bodyDesc);

    // Create a collider for the polyhedron
    // Using a ball collider for best performance
    const radius = 1.2; // Same as visual radius
    const colliderDesc = this.RAPIER.ColliderDesc.ball(radius);

    // Set physics properties
    colliderDesc.setRestitution(0.7); // Bounciness
    colliderDesc.setFriction(0.2);    // Friction

    // Create the collider and attach it to the body
    this.collider = this.world.createCollider(colliderDesc, this.body);

    // Apply initial random rotation (reduced or normal based on preference)
    const rotationForce = this.prefersReducedMotion ? 0.5 : 2.0;
    this.body.setAngvel({
      x: (Math.random() - 0.5) * rotationForce,
      y: (Math.random() - 0.5) * rotationForce,
      z: (Math.random() - 0.5) * rotationForce
    });
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
   * Get standardized input coordinates from mouse or touch event
   * @param {Event} event - Mouse or touch event
   * @param {boolean} isTouch - Whether this is a touch event
   * @returns {Object} Normalized coordinates and client position
   */
  getInputCoordinates(event, isTouch = false) {
    const rect = this.renderer.domElement.getBoundingClientRect();

    if (isTouch && event.touches.length > 0) {
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
    if (!this.isActive || !this.polyhedron) return;

    // Update raycaster with mouse position
    this.mouse.x = coords.x;
    this.mouse.y = coords.y;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersection with polyhedron
    const intersects = this.raycaster.intersectObject(this.polyhedron, true);

    // Store previous state to detect changes
    const wasHovering = this.isHovering;
    this.isHovering = intersects.length > 0;

    // Only update if the hover state changed
    if (wasHovering !== this.isHovering) {
      // Update cursor style
      document.body.style.cursor = this.isHovering ? 'grab' : 'auto';

      // Visual feedback - adjust opacity when hovering
      if (this.polyhedron.children.length > 0) {
        const edges = this.polyhedron.children[0];

        if (edges.material) {
          // Enhance opacity when hovering (100% vs 85%)
          edges.material.opacity = this.isHovering ? 1.0 : 0.85;
        }
      }
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
    if (!this.isActive || !this.polyhedron || !this.body) return false;

    // Update mouse position
    this.mouse.x = coords.x;
    this.mouse.y = coords.y;

    // Cast ray from camera through mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersection with polyhedron
    const intersects = this.raycaster.intersectObject(this.polyhedron, true);

    if (intersects.length > 0) {
      this.isDragging = true;
      this.isHovering = true;

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
      this.savedLinVel = this.body.linvel();
      this.savedAngVel = this.body.angvel();

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
    if (!this.isDragging || !this.body) return;

    this.isDragging = false;

    // Update cursor based on hover state
    document.body.style.cursor = this.isHovering ? 'grab' : 'auto';

    // Calculate throw velocity from drag positions
    const throwVelocity = this.calculateThrowVelocity();

    // Restore physics body to dynamic
    this.body.setBodyType(this.RAPIER.RigidBodyType.Dynamic);

    // Apply throw velocity
    this.body.setLinvel(throwVelocity);

    // Restore gravity
    this.world.gravity = this.savedGravity || { x: 0, y: -0.5, z: 0 };

    // Add some random rotation
    const angVel = {
      x: this.savedAngVel.x * 0.3 + (Math.random() - 0.5) * 2,
      y: this.savedAngVel.y * 0.3 + (Math.random() - 0.5) * 2,
      z: this.savedAngVel.z * 0.3 + (Math.random() - 0.5) * 2
    };

    this.body.setAngvel(angVel);

    // Clear drag-related properties
    this.dragPositions = null;
    this.targetPosition = null;
    this.interactionPoint = null;
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

    // Update polyhedron materials
    if (this.polyhedron) {
      // Update main mesh color to match background
      if (this.polyhedron.material) {
        this.polyhedron.material.color.set(this.bgColor);

        // Update other material properties if using advanced materials
        if (this.materialTier === 'high' && this.polyhedron.material.transmission !== undefined) {
          // High tier material adjustments
          this.polyhedron.material.clearcoat = 0.5;
          this.polyhedron.material.transmission = 0.5;
        } else if (this.materialTier === 'medium' && this.polyhedron.material.envMap) {
          // Medium tier material adjustments
          this.polyhedron.material.envMapIntensity = 0.5;
        }
      }

      // Update edge color
      if (this.polyhedron.children.length > 0) {
        const edges = this.polyhedron.children[0];
        if (edges.material && !this.isHovering) {
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

    // Use shorter duration for reduced motion
    this.fadeInDuration = this.prefersReducedMotion ? 500 : 1000; // 0.5 or 1 second fade-in

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
    if (!this.isDragging || !this.body || !this.targetPosition) return;

    // Current position
    const current = this.body.translation();
    const currentPos = new THREE.Vector3(current.x, current.y, current.z);

    // Calculate smooth movement towards target
    const smoothFactor = 0.3; // Higher = faster response
    const newPos = new THREE.Vector3(
      currentPos.x + (this.targetPosition.x - currentPos.x) * smoothFactor,
      currentPos.y + (this.targetPosition.y - currentPos.y) * smoothFactor,
      currentPos.z + (this.targetPosition.z - currentPos.z) * smoothFactor
    );

    // Update physics body position
    this.body.setTranslation({
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

    // Check if we should activate the polyhedron
    if (!this.isActive && currentTime > this.startTime) {
      // Only activate if physics is ready or we don't need it yet
      if (this.physicsReady) {
        this.activatePolyhedron();
      } else {
        // Extend delay if physics isn't ready yet
        this.startTime = performance.now() + 500;
      }
    }

    // Handle fade-in animation
    this.handleFadeIn();

    // Update physics if ready
    if (this.physicsReady && this.world && this.body) {
      // Get delta time from clock
      const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time

      // Update dragged position if being dragged
      if (this.isDragging) {
        this.updateDraggedPolyhedron();
      }

      // Step the physics world
      this.world.step();

      // Calculate velocity magnitude for material effects
      if (this.isActive && !this.prefersReducedMotion) {
        const velocity = this.body.linvel();
        const speed = Math.sqrt(
          velocity.x * velocity.x +
          velocity.y * velocity.y +
          velocity.z * velocity.z
        );

        // Update material effects based on speed
        this.updateMaterialEffects(speed);
      }

      // Update polyhedron position and rotation from physics
      const position = this.body.translation();
      const rotation = this.body.rotation();

      this.polyhedron.position.set(position.x, position.y, position.z);
      this.polyhedron.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);
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
}

// Export for use in main.js
export default RapierPolyhedron;