/**
 * Pull-tab navigation system for Ki Wooten's portfolio
 * Adds elastic drag-to-navigate functionality with tactile feedback
 */

document.addEventListener('DOMContentLoaded', function() {
  // Constants
  const THRESHOLD = 100; // Pixels to drag before triggering navigation
  const RESISTANCE = 0.5; // Lower values create more resistance to dragging
  const MAX_STRETCH = THRESHOLD * 1.2; // Maximum pixels allowed for stretching

  // Get all menu buttons in the mobile navigation
  const menuButtons = document.querySelectorAll('.modal_nav_button');

  menuButtons.forEach(button => {
    // Touch tracking variables
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let hasReachedThreshold = false;

    // Create visual indicator for pull progress
    const indicator = document.createElement('div');
    indicator.className = 'pull-indicator';
    button.appendChild(indicator);

    // Handle touch/mouse start
    function handleStart(e) {
      startX = getClientX(e);
      isDragging = true;
      hasReachedThreshold = false;
      button.classList.add('dragging');

      // Prevent default only for mouse to avoid disrupting touch scrolling
      if (e.type === 'mousedown') {
        e.preventDefault();
      }
    }

    // Handle touch/mouse move
    function handleMove(e) {
      if (!isDragging) return;

      currentX = getClientX(e);
      const rawDistance = currentX - startX;

      // Only allow dragging to the right with increasing resistance
      if (rawDistance > 0) {
        // Apply elastic resistance - the further you pull, the harder it gets
        const dragDistance = Math.pow(rawDistance, RESISTANCE) * 2;
        const cappedDistance = Math.min(dragDistance, MAX_STRETCH);

        // Apply transform with elastic effect
        button.style.transform = `translateX(${cappedDistance}px)`;

        // Update indicator
        const progress = Math.min(dragDistance / THRESHOLD, 1);
        indicator.style.opacity = progress;
        indicator.style.width = `${progress * 100}%`;

        // Provide haptic feedback when crossing threshold
        if (dragDistance >= THRESHOLD && !hasReachedThreshold) {
          hasReachedThreshold = true;
          if (window.navigator.vibrate) {
            window.navigator.vibrate(20);
          }
        }

        // Prevent scrolling when actively dragging horizontally
        if (Math.abs(rawDistance) > 10) { // Small threshold to distinguish from scrolling
          e.preventDefault();
        }
      }
    }

    // Handle touch/mouse end
    function handleEnd(e) {
      if (!isDragging) return;
      isDragging = false;

      const dragDistance = currentX - startX;
      const elasticDistance = Math.pow(dragDistance, RESISTANCE) * 2;

      if (elasticDistance >= THRESHOLD) {
        // Navigate to target page
        const targetUrl = button.getAttribute('href');
        if (targetUrl) {
          // Add a small delay to allow the elastic animation to be visible
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 100);
        }
      } else {
        // Animate back to original position with elastic bounce
        button.classList.remove('dragging');
        button.classList.add('returning');
        button.style.transform = 'translateX(0)';
        indicator.style.opacity = 0;

        // Remove the returning class after animation completes
        setTimeout(() => {
          button.classList.remove('returning');
          button.style.transform = '';
        }, 400); // Match to CSS transition duration
      }
    }

    // Helper to get clientX from either mouse or touch event
    function getClientX(e) {
      return e.touches ? e.touches[0].clientX : e.clientX;
    }

    // Add event listeners
    button.addEventListener('touchstart', handleStart, { passive: true });
    button.addEventListener('mousedown', handleStart);

    button.addEventListener('touchmove', handleMove, { passive: false });
    button.addEventListener('mousemove', handleMove);

    button.addEventListener('touchend', handleEnd);
    button.addEventListener('mouseup', handleEnd);
    button.addEventListener('mouseleave', handleEnd);

    // Preserve normal click behavior
    button.addEventListener('click', function(e) {
      // If we were dragging, prevent the default click
      if (isDragging || hasReachedThreshold) {
        e.preventDefault();
      }
    });
  });
});