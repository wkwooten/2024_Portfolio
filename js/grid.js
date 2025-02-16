// Please note this entirely ai generated code. While I directed the ai to make this, I do not have the javascript knowledge to do it myself. I'm using it as a reference to learn how to make my own grid.

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
    this.maxDist = 300; // Increased interaction radius
    this.maxForce = 75; // Reduced maximum force
    this.animate = this.animate.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.updateColor = this.updateColor.bind(this);

    // Performance optimizations
    this.projectedPoints = [];
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.resizeTimeout = null;

    // Initialize color and add color scheme listener
    this.updateColor();
    window.matchMedia('(prefers-color-scheme: dark)').addListener(this.updateColor);

    this.init();

    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('resize', this.debounceResize.bind(this));
    requestAnimationFrame(this.animate);
  }

  updateColor() {
    const styles = getComputedStyle(document.documentElement);
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Use gradient_color2 from CSS variables for each mode
    this.color = isDarkMode ? '#a02cff' : '#1a73e8';
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
    // Add fluid-like wave transformation
    const time = performance.now() * 0.0003; // Slower time factor for more fluid motion

    // Primary wave components with phase differences
    const phase1 = Math.sin(point.x * 0.006 + point.y * 0.004 + time) * 30;
    const phase2 = Math.cos(point.x * 0.004 - point.y * 0.006 + time * 1.3) * 25;

    // Create circular ripple effect
    const distance = Math.sqrt(point.x * point.x + point.y * point.y);
    const ripple = Math.sin(distance * 0.01 - time * 2) * 20 * Math.exp(-distance * 0.001);

    // Combine waves with fluid-like interaction
    const fluidMotion = phase1 + phase2 + ripple;
    const waveX = fluidMotion * Math.sin(point.x * 0.003);
    const waveY = fluidMotion * Math.cos(point.y * 0.003);

    // Apply rotation around X axis
    const cosX = Math.cos(this.rotationX * Math.PI / 180);
    const sinX = Math.sin(this.rotationX * Math.PI / 180);
    const y1 = (point.y + waveY) * cosX - (point.z + waveX) * sinX;
    const z1 = (point.y + waveY) * sinX + (point.z + waveX) * cosX;

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
        const normalizedDist = dist / this.maxDist;
        const easeOutQuad = 1 - normalizedDist * normalizedDist;
        const force = easeOutQuad * this.maxForce;
        point.z = point.baseZ + force * Math.exp(-dist / (this.maxDist * 0.5));
      } else {
        const returnForce = (point.z - point.baseZ) * 0.1;
        point.z = point.z - returnForce;
      }

      return projected;
    });

    // Draw connections
    this.ctx.lineWidth = 1;

    // Batch similar opacity connections
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
      this.ctx.strokeStyle = `${this.color}${hex}`;
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
      this.ctx.fillStyle = `${this.color}${hex}`;

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