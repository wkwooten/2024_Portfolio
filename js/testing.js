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
  // Select all section headers (accordions)
  var acc = document.querySelectorAll('.cs_section_header');
  var sections = {};  // Store references to sections and their elements

  // Loop through each accordion header
  for (let i = 0; i < acc.length; i++) {
    let content = acc[i].nextElementSibling;
    let chevron = acc[i].querySelector('.chev');
    let sectionId = acc[i].parentElement.id;

    // Store references for easy access
    sections[sectionId] = {
      content: content,
      chevron: chevron
    };

    // Set initial state - expanded
    content.style.maxHeight = content.scrollHeight + "px";
    chevron.classList.add('chev_rotate');

    // Add click event listener to toggle accordion
    acc[i].addEventListener('click', function() {
      // Toggle the rotation of the arrow (chevron)
      chevron.classList.toggle('chev_rotate');

      // Toggle between expanded and collapsed states
      if (content.style.maxHeight && content.style.maxHeight !== "0px") {
        content.classList.add('fade-out');
        setTimeout(() => {
          content.style.maxHeight = "0px"; // Collapse
        }, 50);
      } else {
        content.classList.remove('fade-out');
        content.style.maxHeight = content.scrollHeight + "px"; // Expand
      }
    });
  }

  // Handle navigation clicks
  const navLinks = document.querySelectorAll('.cs_nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();

      // Get the target section id from the href
      const targetId = this.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);

      if (targetSection && sections[targetId]) {
        // Expand the section if it's collapsed
        const { content, chevron } = sections[targetId];
        content.classList.remove('fade-out');
        content.style.maxHeight = content.scrollHeight + "px";
        chevron.classList.add('chev_rotate');

        // Scroll to the target section smoothly
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        // Update URL without page reload
        history.pushState(null, '', `#${targetId}`);
      }
    });
  });

  // Handle initial hash in URL
  if (window.location.hash) {
    const targetId = window.location.hash.substring(1);
    const targetSection = document.getElementById(targetId);

    if (targetSection && sections[targetId]) {
      const { content, chevron } = sections[targetId];

      // Ensure section is expanded
      content.style.maxHeight = content.scrollHeight + "px";
      chevron.classList.add('chev_rotate');

      setTimeout(() => {
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }
};

document.addEventListener('DOMContentLoaded', function() {
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
const modal = document.querySelector('.illustration_modal');
const modalImage = modal.querySelector('.illustration_modal_image');
const modalTitle = modal.querySelector('.illustration_modal_title');
const modalText = modal.querySelector('.illustration_modal_text');
const modalClose = modal.querySelector('.illustration_modal_close');

// Open modal when clicking on an illustration
document.querySelectorAll('.works_illustration').forEach(illustration => {
  illustration.addEventListener('click', () => {
    const img = illustration.querySelector('img');
    const title = illustration.getAttribute('data-title');
    const description = illustration.getAttribute('data-description');

    modalImage.src = img.src;
    modalImage.alt = img.alt;
    modalTitle.textContent = title;
    modalText.textContent = description;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
  });
});

// Close modal when clicking the close button
modalClose.addEventListener('click', () => {
  modal.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
});

// Close modal when clicking outside the content
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
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

// Case Study Navigation
document.addEventListener('DOMContentLoaded', function() {
  // Get all navigation links
  const navLinks = document.querySelectorAll('.cs_nav a');

  // Add click event listener to each link
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();

      // Get the target section id from the href
      const targetId = this.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        // Get the section content and chevron
        const sectionHeader = targetSection.querySelector('.cs_section_header');
        const content = sectionHeader.nextElementSibling;
        const chevron = sectionHeader.querySelector('.chev');

        // Always expand the section when navigating to it
        content.style.maxHeight = content.scrollHeight + "px";
        chevron.classList.add('chev_rotate');

        // Scroll to the target section smoothly
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        // Update URL without page reload
        history.pushState(null, '', `#${targetId}`);
      }
    });
  });

  // Handle initial hash in URL
  if (window.location.hash) {
    const targetSection = document.querySelector(window.location.hash);
    if (targetSection) {
      // Get the section content and chevron
      const sectionHeader = targetSection.querySelector('.cs_section_header');
      const content = sectionHeader.nextElementSibling;
      const chevron = sectionHeader.querySelector('.chev');

      // Ensure section is expanded
      content.style.maxHeight = content.scrollHeight + "px";
      chevron.classList.add('chev_rotate');

      setTimeout(() => {
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }
});