import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class InteractivePolyhedron {
  constructor(container) {
    // Store debug flag
    this.debug = false;

    // Performance monitoring
    this.performanceStats = {
      frameTime: 0,
      physicsTime: 0,
      renderTime: 0,
      lastFpsUpdate: 0,
      frameCount: 0,
      fps: 0
    };

    // Store container reference
    this.container = container;

    // Check if container exists
    if (!container) {
      console.error('Container #grid-canvas not found');
      return;
    }

    // Get container dimensions
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    // Set up delay before animation starts
    this.startDelay = 2500; // 2.5 seconds delay
    this.startTime = performance.now() + this.startDelay;
    this.isActive = false;

    // Grab smoothness factor (0-1): higher = faster, lower = smoother
    this.grabSmoothness = 0.3;

    // Initialize Three.js scene
    this.scene = new THREE.Scene();

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75, // Field of view
      this.width / this.height, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    this.camera.position.z = 5;

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Initialize physics world
    this.world = new CANNON.World();
    this.world.gravity.set(0, -0.5, 0); // Increased gravity for more natural falling (from -0.2)
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;

    // Initialize raycaster for mouse interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Initialize interaction state
    this.isDragging = false;
    this.isHovering = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.mouseVelocity = { x: 0, y: 0 };
    this.lastMouseMoveTime = 0;
    this.boundaryMeshes = [];

    // Initialize clock for animation
    this.clock = new THREE.Clock();

    // Add event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    container.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    // Use passive: true by default for touch events, but allow preventDefault() when needed
    container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });

    // Add color scheme change listener
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.updatePolyhedronColor.bind(this));

    // Setup scene
    this.addLights();
    this.createPolyhedron();
    this.addBoundaries();

    // Start animation loop
    this.animate();
  }

  addLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Point light (for highlights)
    const pointLight = new THREE.PointLight(0x0088ff, 1, 100);
    pointLight.position.set(0, 0, 5);
    this.scene.add(pointLight);

    // Add a second colored point light for more visual interest
    const pointLight2 = new THREE.PointLight(0xff3366, 0.8, 100);
    pointLight2.position.set(-5, 3, -5);
    this.scene.add(pointLight2);
  }

  createPolyhedron() {
    // Create Three.js geometry
    const radius = 1;
    const detail = 0; // Increase for smoother edges
    const geometry = new THREE.IcosahedronGeometry(radius, detail);

    // Get color from CSS variables (if available)
    let polyhedronColor = 0x1a73e8; // Default blue
    // Declare isDarkMode here so it's available throughout the method
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    try {
      // Use purple color for dark mode
      if (isDarkMode) {
        polyhedronColor = 0x9c27b0; // Purple color for dark mode
        if (this.debug) console.log('Using dark mode purple color:', polyhedronColor.toString(16));
      } else {
        const styles = getComputedStyle(document.documentElement);
        const cssColor = styles.getPropertyValue('--gradient-color1').trim();

        if (cssColor) {
          // Convert CSS color to hex
          const tempElem = document.createElement('div');
          tempElem.style.color = cssColor;
          document.body.appendChild(tempElem);
          const computedColor = getComputedStyle(tempElem).color;
          document.body.removeChild(tempElem);

          // Parse RGB values
          const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            polyhedronColor = (r << 16) | (g << 8) | b;
            if (this.debug) console.log('Using CSS color:', polyhedronColor.toString(16));
          }
        }
      }
    } catch (e) {
      console.log('Error getting CSS color, using default', e);
    }

    // Get background color from CSS
    let backgroundColor = isDarkMode ? 0x121212 : 0xffffff; // Default dark/light background
    try {
      const styles = getComputedStyle(document.documentElement);
      const bgColorStr = styles.getPropertyValue('--bg-color').trim();

      if (bgColorStr) {
        // Convert CSS color to hex
        const tempElem = document.createElement('div');
        tempElem.style.backgroundColor = bgColorStr;
        document.body.appendChild(tempElem);
        const computedColor = getComputedStyle(tempElem).backgroundColor;
        document.body.removeChild(tempElem);

        // Parse RGB values
        const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]);
          const g = parseInt(rgbMatch[2]);
          const b = parseInt(rgbMatch[3]);
          backgroundColor = (r << 16) | (g << 8) | b;
          if (this.debug) console.log('Using background color:', backgroundColor.toString(16));
        }
      }
    } catch (e) {
      console.log('Error getting background color, using default', e);
    }

    // Create material with background color for faces
    const material = new THREE.MeshBasicMaterial({
      color: backgroundColor,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide // Render both sides of faces
    });

    // Create edges geometry to highlight only the outer edges
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: polyhedronColor,
      linewidth: 2
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    // Create mesh
    this.polyhedron = new THREE.Mesh(geometry, material);
    this.polyhedron.add(edges); // Add edges as a child of the polyhedron
    this.scene.add(this.polyhedron);

    // Make the polyhedron slightly larger for easier interaction
    this.polyhedron.scale.set(1.2, 1.2, 1.2);

    // Initially hide the polyhedron until activation
    this.polyhedron.visible = false;
    if (this.polyhedron.material) {
      this.polyhedron.material.transparent = true;
      this.polyhedron.material.opacity = 0;
    }
    if (this.polyhedron.children.length > 0 && this.polyhedron.children[0].material) {
      this.polyhedron.children[0].material.transparent = true;
      this.polyhedron.children[0].material.opacity = 0;
    }

    // Create physics body
    const shape = this.createPolyhedronShape(geometry, radius);
    this.polyhedronBody = new CANNON.Body({
      mass: 5,
      shape: shape,
      position: new CANNON.Vec3(0, 20, 0), // Position far above the viewport until activated
      material: new CANNON.Material({
        friction: 0.3,
        restitution: 0.8
      }),
      linearDamping: 0.05,
      angularDamping: 0.05
    });

    // Initially set the body to sleep until the delay is over
    this.polyhedronBody.sleep();

    // Set initial rotation to zero - will be activated after delay
    this.polyhedronBody.angularVelocity.set(0, 0, 0);

    // Set initial velocity to zero - will be activated after delay
    this.polyhedronBody.velocity.set(0, 0, 0);

    this.world.addBody(this.polyhedronBody);

    if (this.debug) {
      console.log('Polyhedron created with color:', polyhedronColor.toString(16));
      console.log('Polyhedron added to scene:', this.polyhedron);
    }

    // Don't call updatePolyhedronColor here as we've already set the color
  }

  createPolyhedronShape(geometry, radius) {
    // Extract vertices from the geometry
    const vertices = [];
    const positions = geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      vertices.push(new CANNON.Vec3(
        positions[i],
        positions[i + 1],
        positions[i + 2]
      ));
    }

    // Extract faces from the geometry
    const faces = [];
    for (let i = 0; i < positions.length; i += 9) {
      faces.push([i/3, i/3 + 1, i/3 + 2]);
    }

    // Create a convex polyhedron shape
    return new CANNON.ConvexPolyhedron({
      vertices: vertices,
      faces: faces
    });
  }

  addBoundaries() {
    // Create boundary material
    const wallMaterial = new CANNON.Material({
      friction: 0.1,
      restitution: 0.8
    });

    // Create boundary size
    const boundarySize = 10; // Reset to original size
    const boundaryDepth = 0.5;

    // Floor
    const floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundarySize, boundaryDepth, boundarySize)),
      position: new CANNON.Vec3(0, -3, 0), // Reset to original position
      material: wallMaterial
    });
    this.world.addBody(floorBody);
    this.visualizeBoundary(floorBody, boundarySize, boundaryDepth, boundarySize);

    // Ceiling - positioned much higher to allow falling but prevent escape
    const ceilingBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundarySize, boundaryDepth, boundarySize)),
      position: new CANNON.Vec3(0, 20, 0), // Keep this high position
      material: wallMaterial
    });
    this.world.addBody(ceilingBody);
    this.visualizeBoundary(ceilingBody, boundarySize, boundaryDepth, boundarySize);

    // Left wall
    const leftWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundaryDepth, boundarySize, boundarySize)),
      position: new CANNON.Vec3(-5, 0, 0), // Reset to original position
      material: wallMaterial
    });
    this.world.addBody(leftWallBody);
    this.visualizeBoundary(leftWallBody, boundaryDepth, boundarySize, boundarySize);

    // Right wall
    const rightWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundaryDepth, boundarySize, boundarySize)),
      position: new CANNON.Vec3(5, 0, 0), // Reset to original position
      material: wallMaterial
    });
    this.world.addBody(rightWallBody);
    this.visualizeBoundary(rightWallBody, boundaryDepth, boundarySize, boundarySize);

    // Back wall
    const backWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundarySize, boundarySize, boundaryDepth)),
      position: new CANNON.Vec3(0, 0, -5), // Reset to original position
      material: wallMaterial
    });
    this.world.addBody(backWallBody);
    this.visualizeBoundary(backWallBody, boundarySize, boundarySize, boundaryDepth);

    // Front wall
    const frontWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundarySize, boundarySize, boundaryDepth)),
      position: new CANNON.Vec3(0, 0, 5), // Reset to original position
      material: wallMaterial
    });
    this.world.addBody(frontWallBody);
    this.visualizeBoundary(frontWallBody, boundarySize, boundarySize, boundaryDepth);
  }

  // Helper method to visualize a boundary with a wireframe box
  visualizeBoundary(body, width, height, depth) {
    const geometry = new THREE.BoxGeometry(width * 2, height * 2, depth * 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x444444,
      wireframe: true,
      transparent: true,
      opacity: 0, // Set opacity to 0 to make boundaries completely invisible
      wireframeLinewidth: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);

    this.scene.add(mesh);

    if (this.debug) {
      console.log('Boundary visualization added to scene (invisible)');
    }

    // Store reference to update in animation loop
    if (!this.boundaryMeshes) {
      this.boundaryMeshes = [];
    }
    this.boundaryMeshes.push({ mesh, body });
  }

  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
  }

  getMouseCoordinates(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };
  }

  getTouchCoordinates(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: ((event.touches[0].clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.touches[0].clientY - rect.top) / rect.height) * 2 + 1
    };
  }

  onMouseDown(event) {
    // Get mouse coordinates
    const mouseCoords = this.getMouseCoordinates(event);

    // Safety check - if polyhedron doesn't exist yet, return
    if (!this.polyhedron) {
      return;
    }

    // Check if we clicked on the polyhedron
    const isIntersecting = this.checkPolyhedronIntersection(mouseCoords);

    if (isIntersecting) {
      // Start dragging
      this.isDragging = true;
      this.isHovering = true;

      // Update cursor style
      document.body.style.cursor = 'grabbing';

      // Store initial mouse position for velocity calculation
      this.previousMousePosition.x = mouseCoords.x;
      this.previousMousePosition.y = mouseCoords.y;
      this.lastMouseMoveTime = performance.now();

      // Reset velocity
      this.mouseVelocity.x = 0;
      this.mouseVelocity.y = 0;

      // Initialize dragPositions for throw calculation
      this.dragPositions = [{
        time: performance.now(),
        x: event.clientX,
        y: event.clientY
      }];

      // Wake up the physics body
      this.polyhedronBody.wakeUp();

      // Initialize the target position for smooth transition
      // Create a ray from the camera through the mouse position
      this.raycaster.setFromCamera(mouseCoords, this.camera);

      // Calculate the initial target position
      const distance = 4; // Distance from camera
      this.targetPosition = new THREE.Vector3();
      this.targetPosition.copy(this.raycaster.ray.direction);
      this.targetPosition.multiplyScalar(distance);
      this.targetPosition.add(this.camera.position);

      // Snap the polyhedron to the cursor with smooth transition
      this.snapPolyhedronToCursor(mouseCoords);

      if (this.debug) {
        console.log('Started dragging polyhedron');
      }
    }
  }

  checkPolyhedronIntersection(mousePosition) {
    // Safety check - if polyhedron doesn't exist yet, return false
    if (!this.polyhedron) {
      if (this.debug) console.log('Cannot check intersection: polyhedron not initialized');
      return false;
    }

    // Set the raycaster to use the mouse position
    this.raycaster.setFromCamera(mousePosition, this.camera);

    // Check for intersections with the polyhedron
    const intersects = this.raycaster.intersectObject(this.polyhedron, true);

    // Return true if there are any intersections
    return intersects.length > 0;
  }

  onMouseMove(event) {
    // Get mouse coordinates
    const mouseCoords = this.getMouseCoordinates(event);

    // Safety check - if polyhedron doesn't exist yet, return
    if (!this.polyhedron) {
      return;
    }

    // If we're dragging, update the polyhedron position
    if (this.isDragging) {
      this.snapPolyhedronToCursor(mouseCoords);

      // Calculate mouse velocity for throw physics
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastMouseMoveTime;

      if (deltaTime > 0) {
        this.mouseVelocity.x = (mouseCoords.x - this.previousMousePosition.x) / deltaTime * 1000;
        this.mouseVelocity.y = (mouseCoords.y - this.previousMousePosition.y) / deltaTime * 1000;
      }

      this.previousMousePosition.x = mouseCoords.x;
      this.previousMousePosition.y = mouseCoords.y;
      this.lastMouseMoveTime = currentTime;

      // Store position for velocity calculation
      if (!this.dragPositions) {
        this.dragPositions = [];
      }

      this.dragPositions.push({
        time: currentTime,
        x: event.clientX,
        y: event.clientY
      });

      // Keep only the last 5 positions for velocity calculation
      if (this.dragPositions.length > 5) {
        this.dragPositions.shift();
      }
    } else {
      // If not dragging, check if we're hovering over the polyhedron
      const isIntersecting = this.checkPolyhedronIntersection(mouseCoords);

      // Only update if the hover state has changed
      if (isIntersecting !== this.isHovering) {
        this.isHovering = isIntersecting;
        this.highlightPolyhedron(isIntersecting);

        // Update cursor style
        document.body.style.cursor = isIntersecting ? 'grab' : 'auto';
      }
    }
  }

  // Highlight the polyhedron when interacting with it
  highlightPolyhedron(highlight) {
    if (!this.polyhedron) {
      console.log('Cannot highlight: polyhedron not initialized');
      return;
    }

    try {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

      // Define highlight colors based on color scheme
      const normalEdgeColor = isDarkMode ? 0x9c27b0 : 0x1a73e8; // Purple for dark mode, blue for light
      const highlightEdgeColor = isDarkMode ? 0xd500f9 : 0x2979ff; // Brighter purple for dark, brighter blue for light

      // Only update the edge color, not the face color
      if (this.polyhedron.children.length > 0 && this.polyhedron.children[0].material) {
        if (highlight) {
          // Highlight state - brighter color, thicker lines
          this.polyhedron.children[0].material.color.setHex(highlightEdgeColor);
          this.polyhedron.children[0].material.linewidth = 3; // Thicker lines when highlighted

          // Slightly increase scale for visual feedback
          this.polyhedron.scale.set(1.3, 1.3, 1.3);
        } else {
          // Normal state - regular color, normal lines
          this.polyhedron.children[0].material.color.setHex(normalEdgeColor);
          this.polyhedron.children[0].material.linewidth = 2; // Normal linewidth

          // Reset scale
          this.polyhedron.scale.set(1.2, 1.2, 1.2);
        }

        this.polyhedron.children[0].material.needsUpdate = true;

        if (this.debug) {
          console.log(`Polyhedron ${highlight ? 'highlighted' : 'unhighlighted'} with edge color: ${
            highlight ? highlightEdgeColor.toString(16) : normalEdgeColor.toString(16)
          }`);
        }
      } else {
        console.error('Polyhedron edges not found for highlighting');
      }
    } catch (error) {
      console.error('Error highlighting polyhedron:', error);
    }
  }

  onMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;

      // Reset cursor based on hover state
      document.body.style.cursor = this.isHovering ? 'grab' : 'auto';

      // Initialize dragPositions if it doesn't exist
      if (!this.dragPositions) {
        this.dragPositions = [];
      }

      // Calculate throw velocity based on recent movement
      let throwVelocity = this.calculateThrowVelocity();

      // Resume physics with a throw
      this.polyhedronBody.type = CANNON.BODY_TYPES.DYNAMIC;
      this.polyhedronBody.velocity.copy(throwVelocity);

      // Add some random spin for visual interest, but with reduced magnitude
      this.polyhedronBody.angularVelocity.set(
        (Math.random() - 0.5) * 2, // Reduced from 5 to 2
        (Math.random() - 0.5) * 2, // Reduced from 5 to 2
        (Math.random() - 0.5) * 2  // Reduced from 5 to 2
      );
    }
  }

  // Calculate velocity based on recent mouse movements
  calculateThrowVelocity() {
    // Initialize dragPositions if it doesn't exist
    if (!this.dragPositions || this.dragPositions.length < 2) {
      // Default velocity if not enough data
      return new CANNON.Vec3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );
    }

    // Get the most recent positions
    const latest = this.dragPositions[this.dragPositions.length - 1];
    const previous = this.dragPositions[0];

    // Calculate time difference in seconds
    const timeDiff = (latest.time - previous.time) / 1000;
    if (timeDiff === 0) return new CANNON.Vec3(0, 0, 0);

    // Calculate pixel velocity
    const pixelVelocityX = (latest.x - previous.x) / timeDiff;
    const pixelVelocityY = (latest.y - previous.y) / timeDiff;

    // Convert to 3D space
    const velocityX = pixelVelocityX / this.width * 2;
    const velocityY = -pixelVelocityY / this.height * 2; // Invert Y for 3D space

    // Add some randomness to Z velocity
    const velocityZ = (Math.random() - 0.5) * Math.abs(velocityX + velocityY) * 0.5;

    return new CANNON.Vec3(velocityX, velocityY, velocityZ);
  }

  onTouchStart(event) {
    // Get touch coordinates
    const coords = this.getTouchCoordinates(event);
    this.mouse.x = coords.x;
    this.mouse.y = coords.y;

    // Safety check - if polyhedron doesn't exist yet, return
    if (!this.polyhedron) {
      return;
    }

    // Check for intersection with the polyhedron
    const isIntersecting = this.checkPolyhedronIntersection(this.mouse);

    if (isIntersecting) {
      // Only prevent default behavior if we're interacting with the polyhedron
      event.preventDefault();

      if (this.debug) console.log('Polyhedron touched!');

      this.isDragging = true;

      // Add visual feedback
      this.highlightPolyhedron(true);

      // Initialize the target position for smooth transition
      // Create a ray from the camera through the touch position
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Calculate the initial target position
      const distance = 4; // Distance from camera
      this.targetPosition = new THREE.Vector3();
      this.targetPosition.copy(this.raycaster.ray.direction);
      this.targetPosition.multiplyScalar(distance);
      this.targetPosition.add(this.camera.position);

      // Snap polyhedron to touch position with smooth transition
      this.snapPolyhedronToCursor(this.mouse);

      // Store time for velocity calculation
      this.dragStartTime = performance.now();
      this.dragPositions = [{
        time: this.dragStartTime,
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      }];

      // Pause physics while dragging
      this.polyhedronBody.type = CANNON.BODY_TYPES.KINEMATIC;
    }
    // If not touching the polyhedron, allow default behavior (scrolling)
  }

  onTouchMove(event) {
    // Only prevent default and handle the event if we're dragging the polyhedron
    if (this.isDragging) {
      event.preventDefault();

      const coords = this.getTouchCoordinates(event);
      this.mouse.x = coords.x;
      this.mouse.y = coords.y;

      // Snap polyhedron to touch position
      this.snapPolyhedronToCursor(this.mouse);

      // Store position for velocity calculation
      this.dragPositions.push({
        time: performance.now(),
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      });

      // Keep only the last 5 positions for velocity calculation
      if (this.dragPositions.length > 5) {
        this.dragPositions.shift();
      }
    }
    // If not dragging, allow default behavior (scrolling)
  }

  onTouchEnd() {
    if (this.isDragging) {
      this.isDragging = false;

      // Remove visual feedback
      this.highlightPolyhedron(false);

      // Calculate throw velocity based on recent movement
      let throwVelocity = this.calculateThrowVelocity();

      // Resume physics with a throw
      this.polyhedronBody.type = CANNON.BODY_TYPES.DYNAMIC;
      this.polyhedronBody.velocity.copy(throwVelocity);

      // Add some random spin for visual interest, but with reduced magnitude
      this.polyhedronBody.angularVelocity.set(
        (Math.random() - 0.5) * 2, // Reduced from 5 to 2
        (Math.random() - 0.5) * 2, // Reduced from 5 to 2
        (Math.random() - 0.5) * 2  // Reduced from 5 to 2
      );
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const startTime = performance.now();

    // Check if polyhedron exists
    if (!this.polyhedron || !this.polyhedronBody) {
      console.error('Polyhedron or physics body missing in animation loop');
      return;
    }

    // Make sure clock is initialized
    if (!this.clock) {
      console.log('Initializing clock in animation loop');
      this.clock = new THREE.Clock();
    }

    // Check if we should activate the polyhedron
    const currentTime = performance.now();
    if (!this.isActive && currentTime > this.startTime) {
      this.activatePolyhedron();
      this.isActive = true;
    }

    // Handle fade-in animation if the polyhedron is visible but not fully opaque
    if (this.polyhedron.visible &&
        this.polyhedron.material &&
        this.polyhedron.material.opacity < 1.0) {

      // Gradually increase opacity
      this.polyhedron.material.opacity += 0.02;

      // Also increase edge opacity
      if (this.polyhedron.children.length > 0 &&
          this.polyhedron.children[0].material) {
        this.polyhedron.children[0].material.opacity += 0.02;
      }

      // Ensure we don't exceed 1.0 opacity
      if (this.polyhedron.material.opacity >= 1.0) {
        this.polyhedron.material.opacity = 1.0;
        this.polyhedron.material.transparent = false;

        if (this.polyhedron.children.length > 0 &&
            this.polyhedron.children[0].material) {
          this.polyhedron.children[0].material.opacity = 1.0;
          this.polyhedron.children[0].material.transparent = false;
        }
      }

      // Mark materials for update
      this.polyhedron.material.needsUpdate = true;
      if (this.polyhedron.children.length > 0 &&
          this.polyhedron.children[0].material) {
        this.polyhedron.children[0].material.needsUpdate = true;
      }
    }

    // Update physics - measure time
    const physicsStartTime = performance.now();
    const deltaTime = this.clock.getDelta();

    // Only run physics if the polyhedron is active or being dragged
    if (this.isActive || this.isDragging) {
      this.world.step(1/60, deltaTime, 3);

      // Limit angular velocity
      this.limitAngularVelocity();

      // Update mesh position and rotation from physics body
      this.polyhedron.position.copy(this.polyhedronBody.position);
      this.polyhedron.quaternion.copy(this.polyhedronBody.quaternion);

      // Check if polyhedron is out of bounds and reset if needed
      this.checkBounds();

      // Apply a subtle force to keep the polyhedron away from the exact center when not being interacted with
      if (!this.isDragging) {
        this.applySubtleForce();
      }
    }

    this.performanceStats.physicsTime = performance.now() - physicsStartTime;

    // Ensure polyhedron is visible - only update materials when needed
    if (this.polyhedron.material && this.polyhedron.material.needsUpdate) {
      // Make sure opacity is set correctly
      this.polyhedron.material.opacity = 1.0;
      this.polyhedron.material.transparent = false;
      this.polyhedron.material.needsUpdate = false;

      // Make sure edges are visible too
      if (this.polyhedron.children.length > 0 && this.polyhedron.children[0].material) {
        this.polyhedron.children[0].material.opacity = 1.0;
        this.polyhedron.children[0].material.transparent = false;
        this.polyhedron.children[0].material.needsUpdate = false;
      }
    }

    // Update boundary visualizations if they exist - only if they've moved
    if (this.boundaryMeshes && this.isActive) {
      this.boundaryMeshes.forEach(item => {
        if (item.body.sleepState !== CANNON.Body.SLEEPING) {
          item.mesh.position.copy(item.body.position);
          item.mesh.quaternion.copy(item.body.quaternion);
        }
      });
    }

    // Render scene - measure time
    const renderStartTime = performance.now();
    this.renderer.render(this.scene, this.camera);
    this.performanceStats.renderTime = performance.now() - renderStartTime;

    // Update performance stats
    this.performanceStats.frameTime = performance.now() - startTime;
    this.performanceStats.frameCount++;

    if (currentTime - this.performanceStats.lastFpsUpdate > 1000) {
      this.performanceStats.fps = Math.round(
        (this.performanceStats.frameCount * 1000) /
        (currentTime - this.performanceStats.lastFpsUpdate)
      );
      this.performanceStats.frameCount = 0;
      this.performanceStats.lastFpsUpdate = currentTime;

      if (this.debug) {
        console.log(`Performance: ${this.performanceStats.fps} FPS, Frame: ${this.performanceStats.frameTime.toFixed(2)}ms, Physics: ${this.performanceStats.physicsTime.toFixed(2)}ms, Render: ${this.performanceStats.renderTime.toFixed(2)}ms`);
      }
    }
  }

  // New method to limit angular velocity
  limitAngularVelocity() {
    const maxAngularSpeed = 3; // Maximum angular speed in radians per second
    const angVel = this.polyhedronBody.angularVelocity;

    // Calculate current angular speed (magnitude of angular velocity)
    const currentSpeed = Math.sqrt(
      angVel.x * angVel.x +
      angVel.y * angVel.y +
      angVel.z * angVel.z
    );

    // If speed exceeds maximum, scale it down
    if (currentSpeed > maxAngularSpeed) {
      const scaleFactor = maxAngularSpeed / currentSpeed;
      angVel.x *= scaleFactor;
      angVel.y *= scaleFactor;
      angVel.z *= scaleFactor;
    }
  }

  // Apply a subtle force to keep the polyhedron moving in an interesting way
  applySubtleForce() {
    // Don't apply forces if not active yet
    if (!this.isActive) {
      return;
    }

    // Only apply force if the polyhedron is near the center
    const pos = this.polyhedronBody.position;
    const distanceFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

    if (distanceFromCenter < 1.5) {
      // Calculate a force that pushes away from the center, but very gently
      const angle = Math.atan2(pos.z, pos.x) + (Math.random() * 0.1 - 0.05);
      const forceMagnitude = 0.2 * (1.5 - distanceFromCenter); // Reduced from 0.5 to 0.2

      // Apply the force perpendicular to the current position to create orbital movement
      const forceX = forceMagnitude * Math.cos(angle + Math.PI/2);
      const forceZ = forceMagnitude * Math.sin(angle + Math.PI/2);

      this.polyhedronBody.applyForce(
        new CANNON.Vec3(forceX, 0, forceZ),
        this.polyhedronBody.position
      );
    }
  }

  // Add a safety check to reset the polyhedron if it somehow escapes the boundaries
  checkBounds() {
    // Only check bounds if the polyhedron is active
    if (this.isActive) {
      const pos = this.polyhedronBody.position;
      const vel = this.polyhedronBody.velocity;

      // Check for out of bounds or unstable velocity
      if (Math.abs(pos.x) > 10 ||  // Reset to original boundary size
          pos.y > 25 || // Higher than ceiling
          pos.y < -10 || // Reset to original boundary size
          Math.abs(pos.z) > 10 ||  // Reset to original boundary size
          Math.abs(vel.x) > 20 ||
          Math.abs(vel.y) > 20 ||
          Math.abs(vel.z) > 20) {

        if (this.debug) {
          console.log('Polyhedron out of bounds or unstable, resetting position');
          console.log('Position:', pos.x, pos.y, pos.z);
          console.log('Velocity:', vel.x, vel.y, vel.z);
        }

        // Get the viewport height in world coordinates - same calculation as in activatePolyhedron
        const cameraDistance = this.camera.position.z;
        const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
        const visibleHeightAtDistance = 2 * Math.tan(vFOV / 2) * cameraDistance;

        // Position the polyhedron just above the visible area but below the ceiling
        // Same as the initial spawn position in activatePolyhedron
        const startY = Math.min(15, visibleHeightAtDistance / 2 + 5);

        // Reset position to match the initial spawn position
        this.polyhedronBody.position.set(
          (Math.random() - 0.5) * 4, // Reset to original range
          startY, // Position high but below ceiling
          (Math.random() - 0.5) * 3  // Reset to original range
        );

        // Reset velocity to match the initial spawn velocity
        this.polyhedronBody.velocity.set(
          (Math.random() - 0.5) * 0.8, // Slight horizontal drift
          -4, // Strong downward velocity for dramatic falling effect
          (Math.random() - 0.5) * 0.8  // Slight depth drift
        );

        // Add gentle initial rotation - same as in activatePolyhedron
        this.polyhedronBody.angularVelocity.set(
          (Math.random() - 0.5) * 2, // Moderate rotation for visual interest
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        );

        // Wake up the body if it was sleeping
        this.polyhedronBody.wakeUp();
      }
    }
  }

  // Method to smoothly move the polyhedron to the cursor position
  snapPolyhedronToCursor(mouseCoords) {
    // Create a ray from the camera through the mouse position
    this.raycaster.setFromCamera(mouseCoords, this.camera);

    // Calculate a point along the ray at a fixed distance from the camera
    // This gives us a 3D position that corresponds to the cursor
    const distance = 4; // Distance from camera
    const targetPosition = new THREE.Vector3();
    targetPosition.copy(this.raycaster.ray.direction);
    targetPosition.multiplyScalar(distance);
    targetPosition.add(this.camera.position);

    // Initialize target position if this is the first time
    if (!this.targetPosition) {
      this.targetPosition = new THREE.Vector3().copy(targetPosition);
    } else {
      // Update the target position
      this.targetPosition.copy(targetPosition);
    }

    // Use the grabSmoothness property to control the interpolation speed
    // Higher values = faster movement, lower values = smoother but slower
    const lerpFactor = this.grabSmoothness; // Value between 0.1-0.5 is good

    // Calculate the new position by interpolating between current and target
    const newPosition = new THREE.Vector3();
    newPosition.copy(this.polyhedronBody.position);
    newPosition.lerp(this.targetPosition, lerpFactor);

    // Set the polyhedron's position to this interpolated point
    this.polyhedronBody.position.copy(newPosition);

    if (this.debug) {
      console.log('Moving to cursor at:', this.targetPosition);
    }
  }

  // New method to update polyhedron color based on color scheme
  updatePolyhedronColor() {
    if (!this.polyhedron) {
      console.log('Cannot update color: polyhedron not initialized');
      return;
    }

    try {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      let edgeColor = 0x1a73e8; // Default blue

      if (isDarkMode) {
        edgeColor = 0x9c27b0; // Purple for dark mode
        if (this.debug) console.log('Setting dark mode purple color for edges');
      } else {
        try {
          const styles = getComputedStyle(document.documentElement);
          const cssColor = styles.getPropertyValue('--gradient-color1').trim();

          if (cssColor) {
            // Convert CSS color to hex
            const tempElem = document.createElement('div');
            tempElem.style.color = cssColor;
            document.body.appendChild(tempElem);
            const computedColor = getComputedStyle(tempElem).color;
            document.body.removeChild(tempElem);

            // Parse RGB values
            const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
              const r = parseInt(rgbMatch[1]);
              const g = parseInt(rgbMatch[2]);
              const b = parseInt(rgbMatch[3]);
              edgeColor = (r << 16) | (g << 8) | b;
              if (this.debug) console.log('Using CSS color for edges:', edgeColor.toString(16));
            }
          }
        } catch (e) {
          console.log('Error getting CSS color for edges, using default', e);
        }
      }

      // Get background color for faces
      let backgroundColor = isDarkMode ? 0x121212 : 0xffffff; // Default dark/light background
      try {
        const styles = getComputedStyle(document.documentElement);
        const bgColorStr = styles.getPropertyValue('--bg-color').trim();

        if (bgColorStr) {
          // Convert CSS color to hex
          const tempElem = document.createElement('div');
          tempElem.style.backgroundColor = bgColorStr;
          document.body.appendChild(tempElem);
          const computedColor = getComputedStyle(tempElem).backgroundColor;
          document.body.removeChild(tempElem);

          // Parse RGB values
          const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            backgroundColor = (r << 16) | (g << 8) | b;
            if (this.debug) console.log('Using background color for faces:', backgroundColor.toString(16));
          }
        }
      } catch (e) {
        console.log('Error getting background color for faces, using default', e);
      }

      // Update the polyhedron material if it exists
      if (this.polyhedron.material) {
        // Set face color to match background
        this.polyhedron.material.color.setHex(backgroundColor);
        this.polyhedron.material.needsUpdate = true;

        if (this.debug) console.log('Updated face color to match background:', backgroundColor.toString(16));
      } else {
        console.error('Polyhedron material not found');
      }

      // Update the edges color if they exist
      if (this.polyhedron.children.length > 0 && this.polyhedron.children[0].material) {
        this.polyhedron.children[0].material.color.setHex(edgeColor);
        this.polyhedron.children[0].material.needsUpdate = true;

        if (this.debug) console.log('Updated edge color:', edgeColor.toString(16));
      } else {
        console.error('Polyhedron edges not found');
      }
    } catch (error) {
      console.error('Error updating polyhedron color:', error);
    }
  }

  // New method to activate the polyhedron after the delay
  activatePolyhedron() {
    if (this.debug) {
      console.log('Activating polyhedron after delay');
    }

    // Make the polyhedron visible
    this.polyhedron.visible = true;

    // Wake up the physics body
    this.polyhedronBody.wakeUp();

    // Get the viewport height in world coordinates
    const cameraDistance = this.camera.position.z;
    const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
    const visibleHeightAtDistance = 2 * Math.tan(vFOV / 2) * cameraDistance;

    // Position the polyhedron just above the visible area but below the ceiling
    // The ceiling is at y=20, so we'll position it at around y=15
    const startY = Math.min(15, visibleHeightAtDistance / 2 + 5);

    this.polyhedronBody.position.set(
      (Math.random() - 0.5) * 4, // Reset to original range
      startY, // Position high but below ceiling
      (Math.random() - 0.5) * 3  // Reset to original range
    );

    // Add gentle initial rotation
    this.polyhedronBody.angularVelocity.set(
      (Math.random() - 0.5) * 2, // Moderate rotation for visual interest
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );

    // Add a downward velocity to create a falling effect
    this.polyhedronBody.velocity.set(
      (Math.random() - 0.5) * 0.8, // Slight horizontal drift
      -4, // Strong downward velocity for dramatic falling effect
      (Math.random() - 0.5) * 0.8  // Slight depth drift
    );

    // Make the polyhedron visible with a slight fade-in
    if (this.polyhedron.material) {
      this.polyhedron.material.transparent = true;
      this.polyhedron.material.opacity = 0.9;
      this.polyhedron.material.needsUpdate = true;
    }

    // Make edges visible too
    if (this.polyhedron.children.length > 0 && this.polyhedron.children[0].material) {
      this.polyhedron.children[0].material.transparent = true;
      this.polyhedron.children[0].material.opacity = 0.9;
      this.polyhedron.children[0].material.needsUpdate = true;
    }

    if (this.debug) {
      console.log(`Polyhedron activated at position (${this.polyhedronBody.position.x.toFixed(2)}, ${this.polyhedronBody.position.y.toFixed(2)}, ${this.polyhedronBody.position.z.toFixed(2)})`);
      console.log(`Initial velocity: (${this.polyhedronBody.velocity.x.toFixed(2)}, ${this.polyhedronBody.velocity.y.toFixed(2)}, ${this.polyhedronBody.velocity.z.toFixed(2)})`);
    }
  }
}

// Static factory method to create multiple instances
InteractivePolyhedron.createInstances = function(container, count = 1, options = {}) {
  console.log(`Creating ${count} polyhedron instances`);
  const instances = [];

  // Create a shared renderer for all instances
  const width = container.clientWidth;
  const height = container.clientHeight;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Create a shared scene
  const scene = new THREE.Scene();

  // Add lights to the shared scene
  const addLightsToScene = (scene) => {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Point light (for highlights)
    const pointLight = new THREE.PointLight(0x0088ff, 1, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);
  };

  addLightsToScene(scene);

  // Create instances with staggered start times
  for (let i = 0; i < count; i++) {
    // This is just a placeholder for future implementation
    // A full implementation would need to modify the class to support shared resources
    const instance = new InteractivePolyhedron(container);
    instance.startDelay = 2500 + (i * 500); // Stagger start times
    instance.startTime = performance.now() + instance.startDelay;
    instances.push(instance);
  }

  return instances;
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, looking for grid-canvas container...');
  const container = document.querySelector('#grid-canvas');

  if (container) {
    console.log('Grid canvas container found, dimensions:', container.clientWidth, 'x', container.clientHeight);
    try {
      // Clear any existing canvas elements to prevent duplicates
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      console.log('Container cleared of any existing elements');

      // Create the polyhedron with debug mode enabled
      const polyhedron = new InteractivePolyhedron(container);
      polyhedron.debug = true; // Enable debug mode to see console logs
      console.log('Polyhedron initialized successfully with debug mode enabled');

      // Add a click handler to the container to help with mobile devices
      container.addEventListener('click', (event) => {
        console.log('Container clicked at:', event.clientX, event.clientY);
      });

      // Add a test to verify event handling
      container.addEventListener('mousemove', (event) => {
        console.log('Mouse move detected on container');
      }, { once: true }); // Log only once to avoid console spam

      // Expose the polyhedron instance to the global scope for debugging
      window.heroPolyhedron = polyhedron;

    } catch (error) {
      console.error('Error initializing polyhedron:', error);
    }
  } else {
    console.error('Polyhedron container #grid-canvas not found!');
  }
});