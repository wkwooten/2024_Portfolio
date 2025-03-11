/**
 * hero-sizing.js
 * This script adjusts the hero section height to account for the navbar,
 * ensuring the hero fits perfectly in the viewport without causing scrolling.
 * Only runs on desktop devices (min-width: 992px).
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the CSS variable with default value
  document.documentElement.style.setProperty('--adjusted-viewport-height', '100vh');

  // Function to check if we're on desktop
  function isDesktop() {
    return window.innerWidth >= 992;
  }

  // Function to update the hero height (only on desktop)
  function updateHeroHeight() {
    if (!isDesktop()) {
      // Reset to default value on mobile
      document.documentElement.style.setProperty('--adjusted-viewport-height', '100vh');
      return;
    }

    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const navbarHeight = navbar.offsetHeight;
    // Set the CSS variable to viewport height minus navbar height
    document.documentElement.style.setProperty(
      '--adjusted-viewport-height',
      `${window.innerHeight - navbarHeight}px`
    );
  }

  // Run on page load after a slight delay to ensure all elements are rendered
  setTimeout(updateHeroHeight, 100);

  // Update on window resize
  window.addEventListener('resize', updateHeroHeight);

  // Update on orientation change (for mobile devices)
  // Still listen for this event in case a tablet rotates to desktop width
  window.addEventListener('orientationchange', function() {
    // Short delay to allow browser to complete orientation change
    setTimeout(updateHeroHeight, 200);
  });
});