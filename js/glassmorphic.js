// Glassmorphic Hero Overlay Interaction
(function() {
  // Configuration
  const GLASS_CONFIG = {
    default: {
      opacity: 0.7,
      blur: '8px'
    },
    hover: {
      opacity: 0.5,
      blur: '6px'
    },
    interaction: {
      opacity: 0.3,
      blur: '4px'
    }
  };

  // Setup function
  function setupGlassmorphicOverlay() {
    const overlay = document.querySelector('.glassmorphic-overlay');
    if (!overlay) return;

    // Feature detection for backdrop-filter
    const hasBackdropFilter = CSS.supports('backdrop-filter', 'blur(1px)') ||
                            CSS.supports('-webkit-backdrop-filter', 'blur(1px)');

    if (!hasBackdropFilter) {
      // Fallback for browsers without support
      overlay.style.backdropFilter = 'none';
      overlay.style.webkitBackdropFilter = 'none';
      overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    }

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      overlay.style.transition = 'none';
    }

    // Set initial state
    updateGlassmorphicState('default');
  }

  // Theme integration function
  function updateGlassmorphicTheme(isDarkMode) {
    const overlay = document.querySelector('.glassmorphic-overlay');
    if (!overlay) return;

    if (isDarkMode) {
      overlay.style.background = 'linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.1) 100%)';
      overlay.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    } else {
      overlay.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)';
      overlay.style.borderColor = 'rgba(255, 255, 255, 0.18)';
    }
  }

  // State update function
  function updateGlassmorphicState(state) {
    const overlay = document.querySelector('.glassmorphic-overlay');
    if (!overlay) return;

    const config = GLASS_CONFIG[state];
    if (!config) return;

    overlay.style.opacity = config.opacity;
    overlay.style.backdropFilter = `blur(${config.blur})`;
    overlay.style.webkitBackdropFilter = `blur(${config.blur})`;
  }

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', setupGlassmorphicOverlay);

  // Check for dark mode
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (isDarkMode) {
    updateGlassmorphicTheme(true);
  }

  // Export functions
  window.glassmorph = {
    updateState: updateGlassmorphicState,
    updateTheme: updateGlassmorphicTheme
  };
})();
