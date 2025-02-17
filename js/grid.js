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
    this.perspective = 2500;
    this.rotationX = -77;
    this.rotationZ = 0;
    this.maxDist = 400;     // Increased for wider effect area
    this.maxForce = 100;    // Increased for more pronounced waves
    this.dampening = 0.15;  // New: controls how quickly points return
    this.waveSpeed = 0.08;  // New: controls wave movement speed
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

    // Add extra columns to ensure coverage
    this.cols = Math.floor(width / this.spacing) + 8;  // Increased from 6 to 8
    this.rows = Math.floor(height / this.spacing) + 6;

    // Calculate the total grid width and height
    const totalWidth = this.cols * this.spacing;
    const totalHeight = this.rows * this.spacing;

    // Adjust offsets to better center the grid
    const offsetX = -(totalWidth / 2) + this.spacing;  // Add spacing offset
    const offsetY = -(totalHeight / 2) + this.spacing * 2;  // Add more vertical offset

    this.points = [];

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const x = j * this.spacing + offsetX;
        const y = i * this.spacing + offsetY;
        const z = 0;
        this.points.push(new Point(x, y, z));
      }
    }
  }

  project(point) {
    // Add fluid-like wave transformation
    const time = performance.now() * 0.0003;

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

    // Apply perspective with adjusted centering
    const scale = this.perspective / (this.perspective + z1);
    const x3 = x2 * scale + this.canvas.width / 2 + this.spacing / 2;  // Add half spacing offset
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
        // Smoother easing function
        const easeOutQuad = Math.cos(normalizedDist * Math.PI) * 0.5 + 0.5;
        const force = easeOutQuad * this.maxForce;
        // Smoother force application
        const targetZ = point.baseZ + force;
        point.z += (targetZ - point.z) * this.waveSpeed;
      } else {
        // Gentler return to base position
        const returnForce = (point.z - point.baseZ) * this.dampening;
        point.z -= returnForce;
      }

      return projected;
    });

    // Draw connections
    this.ctx.lineWidth = 2;

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

          // Enhanced distance fade calculation
          const centerX = (projected.x + projectedRight.x) / 2;
          const centerY = (projected.y + projectedRight.y) / 2;
          const normalizedY = Math.abs(centerY - this.canvas.height) / this.canvas.height;
          const normalizedX = Math.abs(centerX - this.canvas.width / 2) / (this.canvas.width / 2);
          const distanceFromTop = Math.sqrt(normalizedY * normalizedY + normalizedX * normalizedX * 0.3);
          const distanceFade = Math.max(0, Math.pow(1 - (avgZ + this.perspective) / (this.perspective * 1.8), 1.2));
          const topFade = Math.max(0, 1 - Math.pow(distanceFromTop, 3));

          const baseOpacity = Math.min(0.4, 0.28 + zFactor * 1.1) * distanceFade * topFade;

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

          // Enhanced distance fade calculation for vertical lines
          const centerX = (projected.x + projectedBottom.x) / 2;
          const centerY = (projected.y + projectedBottom.y) / 2;
          const normalizedY = Math.abs(centerY - this.canvas.height) / this.canvas.height;
          const normalizedX = Math.abs(centerX - this.canvas.width / 2) / (this.canvas.width / 2);
          const distanceFromTop = Math.sqrt(normalizedY * normalizedY + normalizedX * normalizedX * 0.3);
          const distanceFade = Math.max(0, Math.pow(1 - (avgZ + this.perspective) / (this.perspective * 1.8), 1.2));
          const topFade = Math.max(0, 1 - Math.pow(distanceFromTop, 3));

          const baseOpacity = Math.min(0.4, 0.28 + zFactor * 1.1) * distanceFade * topFade;

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

      // Enhanced distance fade calculation for points
      const normalizedY = Math.abs(projected.y - this.canvas.height) / this.canvas.height;
      const normalizedX = Math.abs(projected.x - this.canvas.width / 2) / (this.canvas.width / 2);
      const distanceFromTop = Math.sqrt(normalizedY * normalizedY + normalizedX * normalizedX * 0.3);
      const distanceFade = Math.max(0, Math.pow(1 - (projected.z + this.perspective) / (this.perspective * 1.5), 1.5));
      const topFade = Math.max(0, 1 - Math.pow(distanceFromTop, 3));

      const size = Math.max(2, projected.scale * 3 * (1 + zFactor * 0.6));
      const opacity = Math.min(0.45, 0.35 + zFactor * 0.3) * distanceFade * topFade;

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

  // Check if screen width is greater than 62.5rem (1000px)
  if (window.innerWidth <= 1000) {
    console.log('Screen size too small for grid, disabling...');
    container.style.display = 'none';
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

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}