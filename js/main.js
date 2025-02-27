/**
 * Main JavaScript file for Ki Wooten's portfolio
 * Combines functionality from animations.js and testing.js
 */

document.addEventListener('DOMContentLoaded', function() {
  // =========================================================================
  // UI INTERACTIONS
  // =========================================================================

  // Name animation
  if (document.querySelector('.name')) {
    u('.name').on('click', e => {
      u('.name').addClass('clicked');
      setTimeout(() => {
        u('.name').removeClass('clicked');
      }, 1000);
    });
  }

  // Scroll indicator
  if (document.querySelector('.indicator')) {
    u('.indicator').on('click', e => {
      u('.projects').scroll();
    });
  }

  // Mobile menu toggle
  if (document.querySelector('.modal_button')) {
    u('.modal_button').on('click', e => {
      u('.modal').toggleClass('collapsed');
      u('body').toggleClass('stop_scroll');
      u('.modal_back_btn').toggleClass('switch');
      u('.modal_menu_btn').toggleClass('switch');
    });
  }

  // =========================================================================
  // LAZY LOADING IMAGES
  // =========================================================================

  if ('loading' in HTMLImageElement.prototype) {
    // Browser supports native lazy loading
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.setAttribute('loading', 'lazy');
    });
  } else {
    // Fallback for browsers that don't support lazy loading
    console.log('Browser does not support native lazy loading');
  }

  // =========================================================================
  // SCROLL ANIMATIONS
  // =========================================================================

  // Journey timeline animations with Intersection Observer
  const journeyItems = document.querySelectorAll('.journey_item');

  if (journeyItems.length > 0) {
    if ('IntersectionObserver' in window) {
      const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.2
      };

      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
          }
        });
      }, options);

      journeyItems.forEach(item => {
        observer.observe(item);
      });
    } else {
      // Fallback for browsers that don't support Intersection Observer
      journeyItems.forEach(item => {
        item.classList.add('animate-in');
      });
    }
  }

  // =========================================================================
  // CASE STUDY ACCORDION FUNCTIONALITY
  // =========================================================================

  const accordionHeaders = document.querySelectorAll('.cs_section_header');

  if (accordionHeaders.length > 0) {
    // Initialize accordions
    accordionHeaders.forEach(header => {
      const content = header.nextElementSibling;

      // Set initial max-height
      if (content && content.classList.contains('cs_section_content')) {
        content.style.maxHeight = content.scrollHeight + "px"; // Fully expanded by default

        // Add click event listener to toggle accordion
        header.addEventListener('click', function() {
          // Toggle the rotation of the arrow
          const chevron = this.querySelector('.chev');
          if (chevron) {
            chevron.classList.toggle('chev_rotate');
          }

          // Toggle between expanded and collapsed states
          if (content.style.maxHeight && content.style.maxHeight !== "0px") {
            content.style.maxHeight = "0px"; // Collapse
          } else {
            content.style.maxHeight = content.scrollHeight + "px"; // Expand
          }
        });
      }
    });

    // Navigation click handler for case studies
    document.querySelectorAll('.cs_nav .nav_item').forEach(navItem => {
      navItem.addEventListener('click', function(e) {
        e.preventDefault();

        // Get the target section id from the href
        const targetId = this.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
          // Get the section header and content
          const sectionHeader = targetSection.querySelector('.cs_section_header');
          const sectionContent = targetSection.querySelector('.cs_section_content');
          const chevron = sectionHeader ? sectionHeader.querySelector('.chev') : null;

          // Expand the section if it's collapsed
          if (sectionContent && sectionContent.style.maxHeight === "0px") {
            sectionContent.style.maxHeight = sectionContent.scrollHeight + "px";
            if (chevron) {
              chevron.classList.add('chev_rotate');
            }
          }

          // Smooth scroll to the section
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // =========================================================================
  // IMAGE MODAL FUNCTIONALITY
  // =========================================================================

  const imgModal = document.getElementById('img_modal');

  if (imgModal) {
    const modalImg = document.getElementById('modal_image');

    // Determine which images should be clickable based on the current page
    let clickableImages;

    // About page specific images
    if (document.querySelector('.about')) {
      clickableImages = document.querySelectorAll('.about_pic_image, .sketch_img, .lucky_img');
    }
    // Case study pages - all images except those in modals
    else {
      clickableImages = document.querySelectorAll('img:not(.modal img):not(.image_modal_content):not(.illustration_modal_image)');
    }

    // Add click event to each image
    clickableImages.forEach(img => {
      img.style.cursor = 'pointer'; // Change cursor to indicate clickable
      img.addEventListener('click', function() {
        // Show modal
        imgModal.style.display = "flex";
        modalImg.src = this.src;
        modalImg.alt = this.alt;

        // Add active class after a brief delay to trigger transition
        setTimeout(() => {
          imgModal.classList.add('active');
        }, 10);

        // Prevent scrolling when modal is open
        document.body.style.overflow = 'hidden';
      });
    });

    // Close the modal when clicking outside the image
    imgModal.addEventListener('click', function(event) {
      if (event.target === imgModal) {
        imgModal.classList.remove('active');

        // Wait for transition to complete before hiding
        setTimeout(() => {
          imgModal.style.display = "none";
          // Re-enable scrolling
          document.body.style.overflow = '';
        }, 300);
      }
    });

    // Close on escape key
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && imgModal.classList.contains('active')) {
        imgModal.classList.remove('active');

        // Wait for transition to complete before hiding
        setTimeout(() => {
          imgModal.style.display = "none";
          // Re-enable scrolling
          document.body.style.overflow = '';
        }, 300);
      }
    });
  }

  // =========================================================================
  // ILLUSTRATION MODAL FUNCTIONALITY
  // =========================================================================

  const illustrationModal = document.querySelector('.illustration_modal');

  if (illustrationModal) {
    const modalImage = illustrationModal.querySelector('.illustration_modal_image');
    const modalTitle = illustrationModal.querySelector('.illustration_modal_title');
    const modalText = illustrationModal.querySelector('.illustration_modal_text');
    const modalDate = illustrationModal.querySelector('.illustration_modal_date');
    const modalTools = illustrationModal.querySelector('.illustration_modal_tools');
    const modalClose = illustrationModal.querySelector('.illustration_modal_close');

    // Preload images to avoid delay
    document.querySelectorAll('.works_illustration img').forEach(img => {
      const preloadImage = new Image();
      preloadImage.src = img.src;
    });

    // Open modal when clicking on an illustration
    document.querySelectorAll('.works_illustration').forEach(illustration => {
      illustration.addEventListener('click', (e) => {
        e.preventDefault();

        const img = illustration.querySelector('img');
        const title = illustration.getAttribute('data-title');
        const description = illustration.getAttribute('data-description');
        const year = illustration.getAttribute('data-year');
        const tools = illustration.getAttribute('data-tools');

        // Set modal content
        modalTitle.textContent = title || '';
        modalText.textContent = description || '';
        modalDate.textContent = year ? `Created: ${year}` : '';
        modalTools.textContent = tools ? `Tools: ${tools}` : '';

        // Show modal first with a loading state
        illustrationModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling

        // Load image after modal is visible
        modalImage.style.opacity = '0';
        modalImage.onload = function() {
          modalImage.style.opacity = '1';
        };
        modalImage.onerror = function() {
          console.error('Failed to load image:', img.src);
          modalImage.src = ''; // Clear source on error
          modalImage.alt = 'Image failed to load';
        };

        // Set image source after setting up handlers
        modalImage.src = img.src;
        modalImage.alt = img.alt || title || 'Illustration';
      });
    });

    // Close modal when clicking the close button
    if (modalClose) {
      modalClose.addEventListener('click', (e) => {
        e.preventDefault();
        illustrationModal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
      });
    }

    // Close modal when clicking outside the content
    illustrationModal.addEventListener('click', (e) => {
      if (e.target === illustrationModal) {
        e.preventDefault();
        illustrationModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Close modal with escape key (handled by the global keydown handler)
  }
});