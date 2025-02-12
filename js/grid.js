class Point {
  constructor(x, y, baseZ) {
    this.x = x;
    this.y = y;
    this.baseZ = baseZ;
    this.z = baseZ;
    this.origX = x;
    this.origY = y;
    this.origZ = baseZ;
  }
}

class Grid {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.points = [];
    this.spacing = 120;
    this.rows = 0;
    this.cols = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.perspective = 1000;
    this.rotationX = -77;
    this.rotationZ = 0;
    this.maxDist = 400; // Increased interaction radius
    this.maxForce = 100; // Reduced maximum force
    this.animate = this.animate.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleResize = this.handleResize.bind(this);

    // Performance optimizations
    this.projectedPoints = [];
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.resizeTimeout = null;

    // Create gradients
    this.createGradients();
    this.init();

    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('resize', this.debounceResize.bind(this));
    requestAnimationFrame(this.animate);
  }

  createGradients() {
    // Get computed styles to access CSS variables
    const styles = getComputedStyle(document.documentElement);
    const vibesGradient = styles.getPropertyValue('--vibes').trim();

    // Parse the linear-gradient to get colors
    const colorMatch = vibesGradient.match(/linear-gradient\(45deg,\s*([^,]+),\s*([^)]+)\)/);
    if (colorMatch) {
      this.color1 = colorMatch[1].trim();
      this.color2 = colorMatch[2].trim();
    } else {
      // Fallback colors if CSS variable isn't available
      this.color1 = '#FB8B24';
      this.color2 = '#E36414';
    }
  }

  init() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    this.cols = Math.floor(width / this.spacing) + 4;
    this.rows = Math.floor(height / this.spacing) + 4;

    this.points = [];
    const offsetX = -this.spacing * 2;
    const offsetY = -this.spacing * 2;

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const x = (j * this.spacing + offsetX) - width / 2;
        const y = height / 2 - (i * this.spacing + offsetY);
        const z = 0;
        this.points.push(new Point(x, y, z));
      }
    }
  }

  project(point) {
    // Apply rotation around X axis
    const cosX = Math.cos(this.rotationX * Math.PI / 180);
    const sinX = Math.sin(this.rotationX * Math.PI / 180);
    const y1 = point.y * cosX - point.z * sinX;
    const z1 = point.y * sinX + point.z * cosX;

    // Apply rotation around Z axis
    const cosZ = Math.cos(this.rotationZ * Math.PI / 180);
    const sinZ = Math.sin(this.rotationZ * Math.PI / 180);
    const x2 = point.x * cosZ - y1 * sinZ;
    const y2 = point.x * sinZ + y1 * cosZ;

    // Apply perspective
    const scale = this.perspective / (this.perspective + z1);
    const x3 = x2 * scale + this.canvas.width / 2;
    const y3 = y2 * scale + this.canvas.height / 2;

    return { x: x3, y: y3, scale, z: z1 };
  }

  drawGrid() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.ctx.clearRect(0, 0, width, height);

    // Pre-calculate all projections once
    this.projectedPoints = this.points.map(point => {
      const projected = this.project(point);
      const dx = this.mouseX - projected.x;
      const dy = this.mouseY - projected.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.maxDist) {
        // Smoother easing function for force calculation
        const normalizedDist = dist / this.maxDist;
        const easeOutQuad = 1 - normalizedDist * normalizedDist;
        const force = easeOutQuad * this.maxForce;

        // Apply force with distance-based dampening
        point.z = point.baseZ + force * Math.exp(-dist / (this.maxDist * 0.5));
      } else {
        // Smooth transition back to base position
        const returnForce = (point.z - point.baseZ) * 0.1;
        point.z = point.z - returnForce;
      }

      return projected;
    });

    // Draw connections
    this.ctx.lineWidth = 1;

    // Batch similar opacity connections to reduce gradient creation
    const opacityBatches = new Map();

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const idx = i * this.cols + j;
        const projected = this.projectedPoints[idx];
        const point = this.points[idx];

        if (j < this.cols - 1) {
          const rightPoint = this.points[idx + 1];
          const projectedRight = this.projectedPoints[idx + 1];

          const zFactor = (point.z + rightPoint.z) / 800;
          const avgZ = (projected.z + projectedRight.z) / 2;
          const distanceFade = Math.max(0, Math.pow(1 - (avgZ + this.perspective) / (this.perspective * 1.8), 1.2));
          const baseOpacity = Math.min(0.4, 0.28 + zFactor * 1.1) * distanceFade;

          const roundedOpacity = Math.round(baseOpacity * 25) / 25;

          if (!opacityBatches.has(roundedOpacity)) {
            opacityBatches.set(roundedOpacity, []);
          }
          opacityBatches.get(roundedOpacity).push({
            start: { x: projected.x, y: projected.y },
            end: { x: projectedRight.x, y: projectedRight.y }
          });
        }

        // Similar batching for vertical lines...
        if (i < this.rows - 1) {
          const bottomPoint = this.points[idx + this.cols];
          const projectedBottom = this.projectedPoints[idx + this.cols];

          const zFactor = (point.z + bottomPoint.z) / 800;
          const avgZ = (projected.z + projectedBottom.z) / 2;
          const distanceFade = Math.max(0, Math.pow(1 - (avgZ + this.perspective) / (this.perspective * 1.8), 1.2));
          const baseOpacity = Math.min(0.4, 0.28 + zFactor * 1.1) * distanceFade;

          const roundedOpacity = Math.round(baseOpacity * 25) / 25;

          if (!opacityBatches.has(roundedOpacity)) {
            opacityBatches.set(roundedOpacity, []);
          }
          opacityBatches.get(roundedOpacity).push({
            start: { x: projected.x, y: projected.y },
            end: { x: projectedBottom.x, y: projectedBottom.y }
          });
        }
      }
    }

    // Draw batched lines
    for (const [opacity, lines] of opacityBatches) {
      const hex = Math.floor(opacity * 255).toString(16).padStart(2, '0');
      this.ctx.strokeStyle = `${this.color1}${hex}`;
      this.ctx.beginPath();

      for (const line of lines) {
        this.ctx.moveTo(line.start.x, line.start.y);
        this.ctx.lineTo(line.end.x, line.end.y);
      }

      this.ctx.stroke();
    }

    // Batch points by similar properties
    const pointBatches = new Map();

    this.projectedPoints.forEach((projected, idx) => {
      const point = this.points[idx];
      const zFactor = (point.z + 400) / 600;
      const distanceFade = Math.max(0, Math.pow(1 - (projected.z + this.perspective) / (this.perspective * 1.5), 1.5));
      const size = Math.max(2, projected.scale * 3 * (1 + zFactor * 0.6));
      const opacity = Math.min(0.45, 0.35 + zFactor * 0.3) * distanceFade;

      const roundedSize = Math.round(size);
      const roundedOpacity = Math.round(opacity * 30) / 30;
      const key = `${roundedSize}_${roundedOpacity}`;

      if (!pointBatches.has(key)) {
        pointBatches.set(key, []);
      }
      pointBatches.get(key).push({ x: projected.x, y: projected.y });
    });

    // Draw batched points
    for (const [key, points] of pointBatches) {
      const [size, opacity] = key.split('_').map(Number);
      const hex = Math.floor(opacity * 255).toString(16).padStart(2, '0');
      this.ctx.fillStyle = `${this.color1}${hex}`;

      this.ctx.beginPath();
      for (const point of points) {
        this.ctx.moveTo(point.x, point.y);
        this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      }
      this.ctx.fill();
    }

    // Monitor performance
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFrameTime >= 1000) {
      console.log(`FPS: ${this.frameCount}`);
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }

  handleMouseMove(e) {
    // Get actual mouse position relative to viewport
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  handleResize() {
    this.init();
  }

  animate() {
    this.drawGrid();
    requestAnimationFrame(this.animate);
  }

  // Add debounced resize handler
  debounceResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => {
      this.init();
    }, 100);
  }
}

// Initialize the grid when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing grid...');
  const container = document.querySelector('#grid-canvas');

  if (!container) {
    console.error('Grid container not found!');
    return;
  }

  console.log('Container found, creating canvas...');
  const canvas = document.createElement('canvas');

  // Set initial dimensions
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  container.appendChild(canvas);

  // Create grid instance
  try {
    const grid = new Grid(canvas);
    console.log('Grid initialized successfully');
  } catch (error) {
    console.error('Error initializing grid:', error);
  }
});