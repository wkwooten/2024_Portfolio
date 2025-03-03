import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Log the available CANNON constructors for debugging
console.log('CANNON library loaded:', !!CANNON);
console.log('CANNON version:', CANNON.version);
console.log('Available CANNON constructors:',
  Object.keys(CANNON).filter(key => typeof CANNON[key] === 'function'));

class InteractivePolyhedron {
  constructor(container) {
    // Setup container
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.camera.position.z = 6; // Adjusted for better interaction
    this.camera.position.y = 0.5; // Reduced upward angle for better raycasting

    console.log('Camera position set to:', this.camera.position);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true // Transparent background
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Physics world with improved settings
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -0.2, 0), // Greatly reduced gravity for space-like feel
      allowSleep: true, // Allow bodies to sleep when they come to rest
      quatNormalizeFast: false, // More accurate quaternion normalization
      quatNormalizeSkip: 0 // Don't skip normalization steps
    });

    // Set solver iterations for more stable physics
    this.world.solver.iterations = 10;
    this.world.solver.tolerance = 0.01;

    // Lighting
    this.addLights();

    // Create polyhedron
    this.createPolyhedron();

    // Force the polyhedron to be in front of the camera
    if (this.polyhedronBody) {
      // Position it directly in front of the camera
      this.polyhedronBody.position.set(0, 0, 0);
      this.polyhedronBody.velocity.set(0, 0, 0); // Reset velocity

      // Update the mesh position immediately
      this.polyhedron.position.copy(this.polyhedronBody.position);
      this.polyhedron.quaternion.copy(this.polyhedronBody.quaternion);

      console.log('Forced polyhedron position:', this.polyhedronBody.position);

      // Now add a slight upward velocity to make it move
      this.polyhedronBody.velocity.set(
        0, // No horizontal velocity
        2, // Upward velocity
        0  // No depth velocity
      );

      console.log('Set initial velocity:', this.polyhedronBody.velocity);

      // Add a visible floor for reference
      this.addVisibleFloor();
    }

    // Add walls to contain the polyhedron
    this.addBoundaries();

    // Mouse interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isDragging = false;
    this.isHovering = false; // Track if we're hovering over the polyhedron
    this.previousMousePosition = {
      x: 0,
      y: 0
    };

    // Debug flag - set to true to see console logs for interaction debugging
    this.debug = false;

    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));

    // Animation
    this.clock = new THREE.Clock();
    this.animate();

    // Log for debugging
    console.log('InteractivePolyhedron constructor completed');
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

    console.log('Lights added to scene');
  }

  createPolyhedron() {
    console.log('Creating polyhedron...');

    // Create Three.js geometry
    const radius = 1;
    const detail = 0; // Increase for smoother edges
    const geometry = new THREE.DodecahedronGeometry(radius, detail);

    console.log('Geometry created:', geometry);

    // Create wireframe material
    const material = new THREE.MeshBasicMaterial({
      color: 0x1a73e8,
      wireframe: true,
      wireframeLinewidth: 2 // Browser compatibility: most browsers limit this to 1
    });

    console.log('Material created:', material);

    // Create a second material for edges to make them more visible
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: 0x1a73e8,
      linewidth: 2 // Browser compatibility: most browsers limit this to 1
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    console.log('Edges created:', edges);

    // Create mesh
    this.polyhedron = new THREE.Mesh(geometry, material);
    this.polyhedron.add(edges); // Add edges as a child of the polyhedron
    this.scene.add(this.polyhedron);

    console.log('Polyhedron added to scene:', this.polyhedron);

    // Make the polyhedron slightly larger for easier interaction
    this.polyhedron.scale.set(1.2, 1.2, 1.2);

    // Create physics body with a sphere shape for better stability
    try {
      console.log('Creating physics body...');

      // Create a sphere shape
      const shape = new CANNON.Sphere(radius * 1.2);
      console.log('Shape created:', shape);

      // Create the body
      this.polyhedronBody = new CANNON.Body({
        mass: 5,
        material: new CANNON.Material({
          friction: 0.3,
          restitution: 0.7
        }),
        linearDamping: 0.05, // Reduced damping for more floaty movement
        angularDamping: 0.05 // Reduced damping for more persistent rotation
      });

      // Add the shape to the body
      this.polyhedronBody.addShape(shape);

      // Set initial position
      this.polyhedronBody.position.set(0, 0, 0);

      console.log('Physics body created:', this.polyhedronBody);

      // Add some initial rotation
      this.polyhedronBody.angularVelocity.set(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );

      // Add to world
      this.world.addBody(this.polyhedronBody);
      console.log('Body added to world');

    } catch (error) {
      console.error('Error creating physics body:', error);

      // Fallback to a box shape if sphere fails
      try {
        console.log('Falling back to box shape');
        const boxShape = new CANNON.Box(new CANNON.Vec3(radius, radius, radius));

        this.polyhedronBody = new CANNON.Body({
          mass: 5,
          material: new CANNON.Material({
            friction: 0.3,
            restitution: 0.7
          }),
          linearDamping: 0.05, // Reduced damping for more floaty movement
          angularDamping: 0.05 // Reduced damping for more persistent rotation
        });

        this.polyhedronBody.addShape(boxShape);
        this.polyhedronBody.position.set(0, 0, 0);
        this.world.addBody(this.polyhedronBody);

      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }

    console.log('Polyhedron creation complete');
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
    this.visualizeBoundary(floorBody, boundarySize * 2, boundaryDepth * 2, boundarySize * 2);

    // Ceiling
    const ceilingBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundarySize, boundaryDepth, boundarySize)),
      position: new CANNON.Vec3(0, 3, 0), // Positioned relative to camera view
      material: wallMaterial
    });
    this.world.addBody(ceilingBody);
    this.visualizeBoundary(ceilingBody, boundarySize * 2, boundaryDepth * 2, boundarySize * 2);

    // Left wall
    const leftWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundaryDepth, boundarySize, boundarySize)),
      position: new CANNON.Vec3(-4, 0, 0), // Positioned relative to camera view
      material: wallMaterial
    });
    this.world.addBody(leftWallBody);
    this.visualizeBoundary(leftWallBody, boundaryDepth * 2, boundarySize * 2, boundarySize * 2);

    // Right wall
    const rightWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundaryDepth, boundarySize, boundarySize)),
      position: new CANNON.Vec3(4, 0, 0), // Positioned relative to camera view
      material: wallMaterial
    });
    this.world.addBody(rightWallBody);
    this.visualizeBoundary(rightWallBody, boundaryDepth * 2, boundarySize * 2, boundarySize * 2);

    // Front wall (closer to camera)
    const frontWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundarySize, boundarySize, boundaryDepth)),
      position: new CANNON.Vec3(0, 0, 3), // Positioned relative to camera view
      material: wallMaterial
    });
    this.world.addBody(frontWallBody);
    this.visualizeBoundary(frontWallBody, boundarySize * 2, boundarySize * 2, boundaryDepth * 2);

    // Back wall (further from camera)
    const backWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(boundarySize, boundarySize, boundaryDepth)),
      position: new CANNON.Vec3(0, 0, -3), // Positioned relative to camera view
      material: wallMaterial
    });
    this.world.addBody(backWallBody);
    this.visualizeBoundary(backWallBody, boundarySize * 2, boundarySize * 2, boundaryDepth * 2);
  }

  // Helper method to visualize a boundary with a wireframe box
  visualizeBoundary(body, width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({
      color: 0x444444,
      wireframe: true,
      transparent: true,
      opacity: 0.25, // Reduced opacity for more subtle boundaries
      wireframeLinewidth: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);

    this.scene.add(mesh);

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
      this.renderer.domElement.style.cursor = 'grabbing'; // Change cursor to grabbing
      this.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };

      // Store time for velocity calculation
      this.dragStartTime = performance.now();
      this.dragPositions = [{
        time: this.dragStartTime,
        x: event.clientX,
        y: event.clientY
      }];

      // Pause physics while dragging
      this.polyhedronBody.type = CANNON.BODY_TYPES.KINEMATIC;

      // Snap the polyhedron to the cursor position in 3D space
      this.snapPolyhedronToCursor(coords);
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
    // Get mouse coordinates for raycasting
    const coords = this.getMouseCoordinates(event);
    this.mouse.x = coords.x;
    this.mouse.y = coords.y;

    // Check if we're hovering over the polyhedron
    const isIntersecting = this.checkPolyhedronIntersection(this.mouse);

    // Update cursor style based on hover state
    if (isIntersecting && !this.isDragging) {
      this.renderer.domElement.style.cursor = 'grab';
      this.isHovering = true;
    } else if (this.isDragging) {
      this.renderer.domElement.style.cursor = 'grabbing';
    } else if (!isIntersecting && !this.isDragging) {
      this.renderer.domElement.style.cursor = 'auto';
      this.isHovering = false;
    }

    // Handle dragging logic
    if (this.isDragging) {
      // Instead of calculating deltas, directly snap to the cursor position
      this.snapPolyhedronToCursor(coords);

      this.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };

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

  onMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;

      // Reset cursor based on whether we're still hovering
      if (this.isHovering) {
        this.renderer.domElement.style.cursor = 'grab';
      } else {
        this.renderer.domElement.style.cursor = 'auto';
      }

      // Calculate throw velocity based on recent movement
      let throwVelocity = this.calculateThrowVelocity();

      // Resume physics with a throw
      this.polyhedronBody.type = CANNON.BODY_TYPES.DYNAMIC;
      this.polyhedronBody.velocity.copy(throwVelocity);

      // Add some random spin for visual interest
      this.polyhedronBody.angularVelocity.set(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
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
      // No cursor change needed for touch, but we'll set it for consistency
      this.renderer.domElement.style.cursor = 'grabbing';

      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };

      // Store time for velocity calculation
      this.dragStartTime = performance.now();
      this.dragPositions = [{
        time: this.dragStartTime,
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      }];

      // Pause physics while dragging
      this.polyhedronBody.type = CANNON.BODY_TYPES.KINEMATIC;

      // Snap the polyhedron to the touch position
      this.snapPolyhedronToCursor(coords);
    }
  }

  onTouchMove(event) {
    event.preventDefault();
    if (this.isDragging) {
      const coords = this.getTouchCoordinates(event);

      // Directly snap to the touch position
      this.snapPolyhedronToCursor(coords);

      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };

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
      // Reset cursor
      this.renderer.domElement.style.cursor = 'auto';

      // Calculate throw velocity based on recent movement
      let throwVelocity = this.calculateThrowVelocity();

      // Resume physics with a throw
      this.polyhedronBody.type = CANNON.BODY_TYPES.DYNAMIC;
      this.polyhedronBody.velocity.copy(throwVelocity);

      // Add some random spin for visual interest
      this.polyhedronBody.angularVelocity.set(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // Update physics
    const deltaTime = this.clock.getDelta();

    // Limit delta time to prevent large jumps in physics simulation
    const maxDeltaTime = 1/30; // Cap at 30 FPS equivalent
    const clampedDeltaTime = Math.min(deltaTime, maxDeltaTime);

    try {
      // Step the physics world
      this.world.step(1/60, clampedDeltaTime, 3);

      // Debug log every 100 frames
      if (this.debug && Math.random() < 0.01) {
        console.log('Physics position:', this.polyhedronBody.position);
        console.log('Physics velocity:', this.polyhedronBody.velocity);
        this.checkVisibility();
      }

      // Update mesh position and rotation from physics body
      if (this.polyhedron && this.polyhedronBody) {
        this.polyhedron.position.copy(this.polyhedronBody.position);
        this.polyhedron.quaternion.copy(this.polyhedronBody.quaternion);
      } else {
        console.error('Polyhedron or polyhedronBody is undefined in animate');
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

      // Render scene
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      console.error('Error in animate method:', error);
    }
  }

  // Helper function to check if the polyhedron is visible
  checkVisibility() {
    if (!this.polyhedron) {
      console.error('Polyhedron is undefined in checkVisibility');
      return;
    }

    // Get the screen position of the polyhedron
    const vector = new THREE.Vector3();
    const widthHalf = this.width / 2;
    const heightHalf = this.height / 2;

    // Get world position and project to screen
    this.polyhedron.getWorldPosition(vector);
    vector.project(this.camera);

    // Convert to screen coordinates
    const x = (vector.x * widthHalf) + widthHalf;
    const y = -(vector.y * heightHalf) + heightHalf;

    // Check if on screen
    const isVisible = (
      x >= 0 && x <= this.width &&
      y >= 0 && y <= this.height &&
      vector.z > -1 && vector.z < 1
    );

    console.log('Polyhedron screen position:', { x, y, z: vector.z });
    console.log('Is polyhedron visible on screen:', isVisible);

    // If not visible, log camera and polyhedron positions
    if (!isVisible) {
      console.log('Camera position:', this.camera.position);
      console.log('Polyhedron position:', this.polyhedron.position);
      console.log('Distance from camera:', this.camera.position.distanceTo(this.polyhedron.position));
    }

    return isVisible;
  }

  // Add a safety check to reset the polyhedron if it somehow escapes the boundaries
  checkBounds() {
    if (!this.polyhedronBody) {
      console.error('polyhedronBody is undefined in checkBounds');
      return;
    }

    const pos = this.polyhedronBody.position;
    const vel = this.polyhedronBody.velocity;
    const boundaryLimit = 8; // Increased from 10 to catch issues earlier

    // Check if the polyhedron is out of bounds
    if (Math.abs(pos.x) > boundaryLimit ||
        Math.abs(pos.y) > boundaryLimit ||
        Math.abs(pos.z) > boundaryLimit ||
        // Also check for unrealistic velocities that might indicate physics issues
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

  addVisibleFloor() {
    // Create a visible floor
    const floorGeometry = new THREE.BoxGeometry(10, 0.1, 10);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.position.set(0, -3, 0);
    this.scene.add(floorMesh);
  }

  // New method to snap the polyhedron to the cursor position
  snapPolyhedronToCursor(mouseCoords) {
    // Create a ray from the camera through the mouse position
    this.raycaster.setFromCamera(mouseCoords, this.camera);

    // Calculate a point along the ray at a fixed distance from the camera
    // This distance should be similar to where the polyhedron typically sits
    const distance = 5; // Distance from camera
    const vector = new THREE.Vector3();
    vector.copy(this.raycaster.ray.direction);
    vector.multiplyScalar(distance);
    vector.add(this.camera.position);

    // Move the polyhedron to this position
    this.polyhedronBody.position.copy(vector);
    this.polyhedron.position.copy(vector);

    if (this.debug) {
      console.log('Snapped polyhedron to cursor at position:', vector);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('#polyhedron-container');

  if (container) {
    try {
      const polyhedron = new InteractivePolyhedron(container);
      console.log('Polyhedron initialized successfully');
    } catch (error) {
      console.error('Error initializing polyhedron:', error);
    }
  } else {
    console.error('Polyhedron container not found!');
  }
});

export default InteractivePolyhedron;