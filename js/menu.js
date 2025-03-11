/**
 * Mobile menu functionality for Ki Wooten's portfolio
 * Handles menu toggle and SVG animation states
 */

document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu elements
  const menuBtn = document.querySelector('.modal_menu_btn');
  const backBtn = document.querySelector('.modal_back_btn');
  const modal = document.getElementById('mobile-menu');
  const navFull = document.querySelector('.nav_full');

  // Animation timing constants
  const ANIMATION_DURATION = 800; // ms
  const ANIMATION_DELAY_SHORT = 10; // ms
  const ANIMATION_DELAY_MEDIUM = 50; // ms

  // Set accurate navbar height for positioning
  function updateNavbarHeight() {
    if (navFull) {
      const navHeight = navFull.offsetHeight;
      // Set the CSS variable for use in stylesheets
      document.documentElement.style.setProperty('--navbar-height', navHeight + 'px');

      // Update main content margin to match navbar height
      // const mainContent = document.getElementById('main-content');
      // if (mainContent) {
      //   mainContent.style.marginTop = `${navHeight}px`;
      // }

      // Directly position the menu below the navbar
      if (modal) {
        // Set top position to exactly match navbar height
        modal.style.top = navHeight + 'px';
        // Set height to fill remaining viewport
        modal.style.height = `calc(100vh - ${navHeight}px)`;
        // Use CSS variable for z-index
        modal.style.zIndex = "var(--z-index-menu)";
      }
    }
  }

  // Initial measurement
  updateNavbarHeight();

  // Update on resize
  window.addEventListener('resize', updateNavbarHeight);

  // Also update on scroll to ensure everything stays in position
  window.addEventListener('scroll', function() {
    // Ensure navbar stays above menu using CSS variable
    if (navFull) {
      navFull.style.zIndex = "var(--z-index-navbar)";
    }
  });

  if (menuBtn && backBtn && modal) {
    // Define SVG states
    const svgStates = {
      // 1. Initialize (hamburger menu)
      hamburger: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <title>Open Menu</title>
          <g fill="none" stroke="currentColor" stroke-dasharray="16" stroke-dashoffset="16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
            <path d="M5 5h14">
              <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="16;0" />
            </path>
            <path d="M5 12h14">
              <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.2s" dur="0.2s" values="16;0" />
            </path>
            <path d="M5 19h14">
              <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.2s" values="16;0" />
            </path>
          </g>
        </svg>`,

      // 2. Menu to close (hamburger to X)
      menuToClose: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <title>Close Menu</title>
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5L12 5L19 5M5 12H19M5 19L12 19L19 19">
            <animate fill="freeze" attributeName="d" dur="0.4s" values="M5 5L12 5L19 5M5 12H19M5 19L12 19L19 19;M5 5L12 12L19 5M12 12H12M5 19L12 12L19 19"/>
          </path>
        </svg>`,

      // 3. Close to menu (X to hamburger)
      closeToMenu: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <title>Open Menu</title>
          <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
            <path d="M5 5L19 19M5 19L19 5">
              <animate fill="freeze" attributeName="d" dur="0.4s" values="M5 5L19 19M5 19L19 5;M5 5L19 5M5 19L19 19"/>
            </path>
            <path d="M12 12H12" opacity="0">
              <animate fill="freeze" attributeName="d" begin="0.2s" dur="0.4s" values="M12 12H12;M5 12H19"/>
              <set fill="freeze" attributeName="opacity" begin="0.2s" to="1"/>
            </path>
          </g>
        </svg>`
    };

    // Set initial state
    let menuState = 'closed'; // Can be 'closed' or 'open'

    // Function to disable scrolling
    function disableScroll() {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.touchAction = 'none'; // Prevents scrolling on touch devices
    }

    // Function to enable scrolling
    function enableScroll() {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
    }

    // Open menu event
    menuBtn.addEventListener('click', function() {
      // Only proceed if menu is closed
      if (menuState === 'closed') {
        // First update the state
        menuState = 'open';

        // Update navbar height in case it changed
        updateNavbarHeight();

        // Prepare for animation by ensuring visibility
        modal.style.visibility = 'visible';

        // Add class for animation and apply initial styles
        modal.classList.add('open');
        setTimeout(() => {
          // Trigger animation with explicit transform
          modal.style.transform = 'translateY(0)';
        }, ANIMATION_DELAY_SHORT);

        menuBtn.classList.add('switch');
        backBtn.classList.remove('switch');

        // Update ARIA attributes
        modal.setAttribute('aria-hidden', 'false');
        menuBtn.setAttribute('aria-expanded', 'true');
        backBtn.setAttribute('aria-expanded', 'false');

        // Show menu-to-close animation (hamburger to X)
        backBtn.innerHTML = svgStates.menuToClose;

        // Disable scrolling
        disableScroll();
      }
    });

    // Close menu event
    backBtn.addEventListener('click', function() {
      // Only proceed if menu is open
      if (menuState === 'open') {
        // First update the state so subsequent code knows we're closing
        menuState = 'closed';

        // Start the close animation
        modal.style.transform = `translateY(calc(-100% - ${navFull.offsetHeight}px))`;

        // Update classes after a slight delay to ensure animation is visible
        setTimeout(() => {
          modal.classList.remove('open');
          menuBtn.classList.remove('switch');
          backBtn.classList.add('switch');
        }, ANIMATION_DELAY_MEDIUM);

        // Update ARIA attributes
        modal.setAttribute('aria-hidden', 'true');
        menuBtn.setAttribute('aria-expanded', 'false');
        backBtn.setAttribute('aria-expanded', 'true');

        // Show close-to-menu animation (X to hamburger)
        menuBtn.innerHTML = svgStates.closeToMenu;

        // Enable scrolling
        enableScroll();
      }
    });

    // Initialize with hamburger menu (only once at the start)
    menuBtn.innerHTML = svgStates.hamburger;
  }
});
