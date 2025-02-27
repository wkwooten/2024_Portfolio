u(".name").on('click', e => {
  u('.name').addClass('clicked');
  setTimeout(() => {
    u('.name').removeClass('clicked');
  }, 1000); // Adjust timing to match animation duration
});

u(".indicator").on('click', e => {
  u('.projects').scroll();
});

u(".modal_button").on('click', e => {
  u(".modal").toggleClass("collapsed");
  u("body").toggleClass("stop_scroll");
  u(".modal_back_btn").toggleClass("switch");
  u(".modal_menu_btn").toggleClass("switch");
});


u(".indicator").on('click', e => {
  u('.projects').scroll();
});

u(".name").on('click', e => {
  u('name').addClass('bounce');
});

// Switch to using window.onload
window.onload = function() {
  // Your accordion logic goes here

  // Select all section headers (accordions)
  var acc = document.querySelectorAll('.cs_section_header');

  // Loop through each accordion header
  for (let i = 0; i < acc.length; i++) {
    let content = acc[i].nextElementSibling;

    // Set initial max-height after all content is loaded
    content.style.maxHeight = content.scrollHeight + "px"; // Fully expanded by default

    // Add click event listener to toggle accordion
    acc[i].addEventListener('click', function() {
      // Toggle the rotation of the arrow (chevron)
      this.querySelector('.chev').classList.toggle('chev_rotate');

      // Toggle between expanded and collapsed states
      if (content.style.maxHeight && content.style.maxHeight !== "0px") {
        content.style.maxHeight = "0px"; // Collapse
      } else {
        content.style.maxHeight = content.scrollHeight + "px"; // Expand dynamically
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', function() {
  // Navigation click handler
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
        const chevron = sectionHeader.querySelector('.chev');

        // Expand the section if it's collapsed
        if (sectionContent.style.maxHeight === "0px") {
          sectionContent.style.maxHeight = sectionContent.scrollHeight + "px";
          chevron.classList.add('chev_rotate');
        }

        // Smooth scroll to the section
        targetSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Get the modal
  const modal = document.getElementById("img_modal");
  const modalImg = document.getElementById("modal_image");
  const images = document.querySelectorAll('img:not(.modal img)'); // Exclude modal images

  // Attach click event to all images
  images.forEach(function(img) {
    img.addEventListener('click', function() {
      modal.style.display = "flex";
      modalImg.src = this.src;
      // Add active class after a brief delay to trigger transition
      setTimeout(() => {
        modal.classList.add('active');
      }, 10);
    });
  });

  // Close the modal when clicking outside the image
  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.classList.remove('active');
      // Wait for transition to complete before hiding
      setTimeout(() => {
        modal.style.display = "none";
      }, 300);
    }
  });

  // Close modal with escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === "flex") {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = "none";
      }, 300);
    }
  });
});

// Illustration Modal Functionality
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.querySelector('.illustration_modal');
  if (!modal) return; // Exit if modal doesn't exist on this page

  const modalImage = modal.querySelector('.illustration_modal_image');
  const modalTitle = modal.querySelector('.illustration_modal_title');
  const modalText = modal.querySelector('.illustration_modal_text');
  const modalDate = modal.querySelector('.illustration_modal_date');
  const modalTools = modal.querySelector('.illustration_modal_tools');
  const modalClose = modal.querySelector('.illustration_modal_close');

  // Preload images to avoid delay
  document.querySelectorAll('.works_illustration img').forEach(img => {
    const preloadImage = new Image();
    preloadImage.src = img.src;
  });

  // Open modal when clicking on an illustration
  document.querySelectorAll('.works_illustration').forEach(illustration => {
    illustration.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent default behavior

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
      modal.classList.add('active');
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
      modal.classList.remove('active');
      document.body.style.overflow = ''; // Restore scrolling
    });
  }

  // Close modal when clicking outside the content
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      e.preventDefault();
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // Close modal with escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});