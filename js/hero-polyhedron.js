import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class InteractivePolyhedron {
  constructor(container) {
    // Store debug flag
    this.debug = false;

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
    this.world.gravity.set(0, -0.2, 0); // Reduced gravity for space-like feel
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
    container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));

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
    const geometry = new THREE.DodecahedronGeometry(radius, detail);

    // Get color from CSS variables (if available)
    let polyhedronColor = 0x1a73e8; // Default blue
    try {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

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

    // Create wireframe material with explicit color
    const material = new THREE.MeshBasicMaterial({
      color: polyhedronColor,
      wireframe: true,
      wireframeLinewidth: 1,
      transparent: false,
      opacity: 1.0
    });

    // Create a second material for edges to make them more visible
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: polyhedronColor,
      linewidth: 1
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    // Create mesh
    this.polyhedron = new THREE.Mesh(geometry, material);
    this.polyhedron.add(edges); // Add edges as a child of the polyhedron
    this.scene.add(this.polyhedron);

    // Make the polyhedron slightly larger for easier interaction
    this.polyhedron.scale.set(1.2, 1.2, 1.2);

    // Create physics body
    const shape = this.createPolyhedronShape(geometry, radius);
    this.polyhedronBody = new CANNON.Body({
      mass: 5,
      shape: shape,
      position: new CANNON.Vec3(0, 0, 0), // Start at center
      material: new CANNON.Material({
        friction: 0.3,
        restitution: 0.8
      }),
      linearDamping: 0.05, // Reduced damping for more floaty movement
      angularDamping: 0.05 // Reduced damping for more persistent rotation
    });

    // Add some initial rotation and a slight upward velocity to keep it visible
    this.polyhedronBody.angularVelocity.set(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    );

    // Add a slight upward velocity to counteract initial gravity
    this.polyhedronBody.velocity.set(
      (Math.random() - 0.5) * 2,
      2, // Initial upward velocity
      (Math.random() - 0.5) * 2
    );

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
    // Use fixed boundary size relative to camera position
    const boundarySize = 5; // Larger boundary size to match camera view
    const boundaryDepth = 0.5;

    // Create invisible walls to contain the polyhedron
    const wallMaterial = new CANNON.Material({
      friction: 0.1,
      restitution: 0.8 // Higher restitution for bouncier collisions
    });

    // Floor - positioned lower to be visible
    const floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundarySize, boundaryDepth, boundarySize)),
      position: new CANNON.Vec3(0, -3, 0), // Positioned relative to camera view
      material: wallMaterial
    });
    this.world.addBody(floorBody);
    this.visualizeBoundary(floorBody, boundarySize, boundaryDepth, boundarySize);

    // Ceiling
    const ceilingBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundarySize, boundaryDepth, boundarySize)),
      position: new CANNON.Vec3(0, 3, 0), // Positioned relative to camera view
      material: wallMaterial
    });
    this.world.addBody(ceilingBody);
    this.visualizeBoundary(ceilingBody, boundarySize, boundaryDepth, boundarySize);

    // Left wall
    const leftWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundaryDepth, boundarySize, boundarySize)),
      position: new CANNON.Vec3(-4, 0, 0), // Positioned relative to camera view
      material: wallMaterial
    });
    this.world.addBody(leftWallBody);
    this.visualizeBoundary(leftWallBody, boundaryDepth, boundarySize, boundarySize);

    // Right wall
    const rightWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundaryDepth, boundarySize, boundarySize)),
      position: new CANNON.Vec3(4, 0, 0), // Positioned relative to camera view
      material: wallMaterial
    });
    this.world.addBody(rightWallBody);
    this.visualizeBoundary(rightWallBody, boundaryDepth, boundarySize, boundarySize);

    // Front wall (closer to camera)
    const frontWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundarySize, boundarySize, boundaryDepth)),
      position: new CANNON.Vec3(0, 0, 3), // Positioned relative to camera view
      material: wallMaterial
    });
    this.world.addBody(frontWallBody);
    this.visualizeBoundary(frontWallBody, boundarySize, boundarySize, boundaryDepth);

    // Back wall (further from camera)
    const backWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundarySize, boundarySize, boundaryDepth)),
      position: new CANNON.Vec3(0, 0, -3), // Positioned relative to camera view
      material: wallMaterial
    });
    this.world.addBody(backWallBody);
    this.visualizeBoundary(backWallBody, boundarySize, boundarySize, boundaryDepth);
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
    event.preventDefault(); // Prevent default behavior

    const coords = this.getMouseCoordinates(event);
    this.mouse.x = coords.x;
    this.mouse.y = coords.y;

    // Check for intersection with the polyhedron
    if (this.checkPolyhedronIntersection(this.mouse)) {
      if (this.debug) console.log('Polyhedron clicked!');

      this.isDragging = true;

      // Change cursor to grabbing
      this.renderer.domElement.style.cursor = 'grabbing';

      // Snap polyhedron to cursor position
      this.snapPolyhedronToCursor(this.mouse);

      // Store time for velocity calculation
      this.dragStartTime = performance.now();
      this.dragPositions = [{
        time: this.dragStartTime,
        x: event.clientX,
        y: event.clientY
      }];

      // Pause physics while dragging
      this.polyhedronBody.type = CANNON.BODY_TYPES.KINEMATIC;
    }
  }

  // Helper method to check for polyhedron intersection with improved detection
  checkPolyhedronIntersection(mousePosition) {
    this.raycaster.setFromCamera(mousePosition, this.camera);
    const intersects = this.raycaster.intersectObject(this.polyhedron);

    if (this.debug) {
      console.log('Mouse position:', mousePosition);
      console.log('Intersects:', intersects.length);
    }

    // If direct intersection, return true
    if (intersects.length > 0) {
      return true;
    }

    // If no direct intersection, try with a slightly expanded detection radius
    // This makes it easier to click/touch the polyhedron
    const expandedRaycaster = new THREE.Raycaster();

    // Try multiple slightly offset rays to improve hit detection
    const offsets = [
      { x: 0.05, y: 0 },
      { x: -0.05, y: 0 },
      { x: 0, y: 0.05 },
      { x: 0, y: -0.05 },
      { x: 0.05, y: 0.05 },
      { x: -0.05, y: -0.05 }
    ];

    for (const offset of offsets) {
      const offsetPosition = {
        x: mousePosition.x + offset.x,
        y: mousePosition.y + offset.y
      };

      expandedRaycaster.setFromCamera(offsetPosition, this.camera);
      const expandedIntersects = expandedRaycaster.intersectObject(this.polyhedron);

      if (expandedIntersects.length > 0) {
        if (this.debug) console.log('Expanded intersection detected');
        return true;
      }
    }

    return false;
  }

  onMouseMove(event) {
    const coords = this.getMouseCoordinates(event);
    this.mouse.x = coords.x;
    this.mouse.y = coords.y;

    // Check for hover state and update cursor
    const isIntersecting = this.checkPolyhedronIntersection(this.mouse);

    if (isIntersecting && !this.isDragging) {
      if (!this.isHovering) {
        // First time hovering - add visual feedback
        this.highlightPolyhedron(true);
      }
      this.isHovering = true;
      this.renderer.domElement.style.cursor = 'grab';
    } else if (!this.isDragging) {
      if (this.isHovering) {
        // No longer hovering - remove visual feedback
        this.highlightPolyhedron(false);
      }
      this.isHovering = false;
      this.renderer.domElement.style.cursor = 'auto';
    }

    if (this.isDragging) {
      // Snap polyhedron to cursor position
      this.snapPolyhedronToCursor(this.mouse);

      // Store position for velocity calculation (keep last 5 positions)
      this.dragPositions.push({
        time: performance.now(),
        x: event.clientX,
        y: event.clientY
      });

      // Keep only the last 5 positions for velocity calculation
      if (this.dragPositions.length > 5) {
        this.dragPositions.shift();
      }
    }
  }

  // Highlight the polyhedron when interacting with it
  highlightPolyhedron(highlight) {
    if (!this.polyhedron) return;

    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (highlight) {
      // Highlight colors
      const highlightColor = isDarkMode ? 0xd500f9 : 0x2979ff; // Brighter purple for dark mode, bright blue for light
      this.polyhedron.material.color.setHex(highlightColor);

      // Update edges color if they exist
      if (this.polyhedron.children.length > 0) {
        this.polyhedron.children[0].material.color.setHex(highlightColor);
      }

      // Scale up slightly for visual feedback
      this.polyhedron.scale.set(1.3, 1.3, 1.3);
    } else {
      // Reset to normal color
      this.updatePolyhedronColor();

      // Reset scale
      this.polyhedron.scale.set(1.2, 1.2, 1.2);
    }
  }

  onMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;

      // Reset cursor based on hover state
      this.renderer.domElement.style.cursor = this.isHovering ? 'grab' : 'auto';

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
    if (this.dragPositions.length < 2) {
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
    event.preventDefault();
    const coords = this.getTouchCoordinates(event);
    this.mouse.x = coords.x;
    this.mouse.y = coords.y;

    // Check for intersection with the polyhedron
    if (this.checkPolyhedronIntersection(this.mouse)) {
      if (this.debug) console.log('Polyhedron touched!');

      this.isDragging = true;

      // Add visual feedback
      this.highlightPolyhedron(true);

      // Snap polyhedron to touch position
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
  }

  onTouchMove(event) {
    event.preventDefault();
    if (this.isDragging) {
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

    // Check if polyhedron exists
    if (!this.polyhedron || !this.polyhedronBody) {
      console.error('Polyhedron or physics body missing in animation loop');
      return;
    }

    // Update physics
    const deltaTime = this.clock.getDelta();
    this.world.step(1/60, deltaTime, 3);

    // Limit angular velocity
    this.limitAngularVelocity();

    // Update mesh position and rotation from physics body
    this.polyhedron.position.copy(this.polyhedronBody.position);
    this.polyhedron.quaternion.copy(this.polyhedronBody.quaternion);

    // Ensure polyhedron is visible
    if (this.polyhedron.material) {
      // Make sure opacity is set correctly
      this.polyhedron.material.opacity = 1.0;
      this.polyhedron.material.transparent = false;
      this.polyhedron.material.needsUpdate = true;

      // Make sure edges are visible too
      if (this.polyhedron.children.length > 0 && this.polyhedron.children[0].material) {
        this.polyhedron.children[0].material.opacity = 1.0;
        this.polyhedron.children[0].material.transparent = false;
        this.polyhedron.children[0].material.needsUpdate = true;
      }
    }

    // Update boundary visualizations if they exist
    if (this.boundaryMeshes) {
      this.boundaryMeshes.forEach(item => {
        item.mesh.position.copy(item.body.position);
        item.mesh.quaternion.copy(item.body.quaternion);
      });
    }

    // Check if polyhedron is out of bounds and reset if needed
    this.checkBounds();

    // Apply a subtle force to keep the polyhedron away from the exact center when not being interacted with
    if (!this.isDragging) {
      this.applySubtleForce();
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);
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
    // Only apply force if the polyhedron is near the center
    const pos = this.polyhedronBody.position;
    const distanceFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

    if (distanceFromCenter < 1.5) {
      // Calculate a force that pushes away from the center, but not too strongly
      const angle = Math.atan2(pos.z, pos.x) + (Math.random() * 0.2 - 0.1);
      const forceMagnitude = 0.5 * (1.5 - distanceFromCenter);

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
    const pos = this.polyhedronBody.position;
    const vel = this.polyhedronBody.velocity;

    // Check for out of bounds or unstable velocity
    if (Math.abs(pos.x) > 8 ||
        Math.abs(pos.y) > 8 ||
        Math.abs(pos.z) > 8 ||
        Math.abs(vel.x) > 20 ||
        Math.abs(vel.y) > 20 ||
        Math.abs(vel.z) > 20) {

      if (this.debug) {
        console.log('Polyhedron out of bounds or unstable, resetting position');
        console.log('Position:', pos.x, pos.y, pos.z);
        console.log('Velocity:', vel.x, vel.y, vel.z);
      }

      // Reset position to center
      this.polyhedronBody.position.set(0, 0, 0);

      // Reset velocity with a slight upward component
      this.polyhedronBody.velocity.set(0, 1.5, 0);

      // Add some gentle rotation
      this.polyhedronBody.angularVelocity.set(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );

      // Wake up the body if it was sleeping
      this.polyhedronBody.wakeUp();
    }
  }

  // New method to snap the polyhedron to the cursor position
  snapPolyhedronToCursor(mouseCoords) {
    // Create a ray from the camera through the mouse position
    this.raycaster.setFromCamera(mouseCoords, this.camera);

    // Calculate a point along the ray at a fixed distance from the camera
    // This gives us a 3D position that corresponds to the cursor
    const distance = 4; // Distance from camera
    const vector = new THREE.Vector3();
    vector.copy(this.raycaster.ray.direction);
    vector.multiplyScalar(distance);
    vector.add(this.camera.position);

    // Set the polyhedron's position to this point
    this.polyhedronBody.position.copy(vector);

    if (this.debug) {
      console.log('Snapping to cursor at:', vector);
    }
  }

  // New method to update polyhedron color based on color scheme
  updatePolyhedronColor() {
    if (!this.polyhedron) {
      console.log('Cannot update color: polyhedron not initialized');
      return;
    }

    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let newColor = 0x1a73e8; // Default blue

    if (isDarkMode) {
      newColor = 0x9c27b0; // Purple for dark mode
      if (this.debug) console.log('Setting dark mode purple color');
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
            newColor = (r << 16) | (g << 8) | b;
            if (this.debug) console.log('Using CSS color:', newColor.toString(16));
          }
        }
      } catch (e) {
        console.log('Error getting CSS color, using default', e);
      }
    }

    // Ensure the material exists before updating
    if (this.polyhedron.material) {
      this.polyhedron.material.color.setHex(newColor);

      // Update edges color if they exist
      if (this.polyhedron.children.length > 0 && this.polyhedron.children[0].material) {
        this.polyhedron.children[0].material.color.setHex(newColor);
      }

      if (this.debug) {
        console.log('Updated polyhedron color to', newColor.toString(16), 'for', isDarkMode ? 'dark mode' : 'light mode');
      }
    } else {
      console.error('Polyhedron material not found');
    }
  }
}

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

    } catch (error) {
      console.error('Error initializing polyhedron:', error);
    }
  } else {
    console.error('Polyhedron container #grid-canvas not found!');
  }
});