/**
 * hero-sizing.js
 * This script adjusts the hero section height to account for the navbar,
 * ensuring the hero fits perfectly in the viewport without causing scrolling.
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the CSS variable
  document.documentElement.style.setProperty('--adjusted-viewport-height', '100vh');

  // Function to update the hero height
  function updateHeroHeight() {
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
  window.addEventListener('orientationchange', function() {
    // Short delay to allow browser to complete orientation change
    setTimeout(updateHeroHeight, 200);
  });
});