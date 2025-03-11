/**
 * Image Modal Script
 * Handles the functionality for the image modal overlay
 */

document.addEventListener('DOMContentLoaded', function() {
  // Get the modal element
  const modal = document.getElementById('img_modal');
  const modalImg = document.getElementById('modal_image');

  // Get all images that should be clickable to open in modal
  const images = document.querySelectorAll('.sketch_img, .about_pic_image, .lucky_img');

  // Add click event to each image
  images.forEach(img => {
    img.addEventListener('click', function() {
      modal.style.display = "flex";
      modalImg.src = this.src;
      modalImg.alt = this.alt;
      document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open

      // Set focus on the modal for accessibility
      modal.setAttribute('aria-hidden', 'false');
      modalImg.focus();
    });
  });

  // Close the modal when clicking on it
  modal.addEventListener('click', function() {
    closeModal();
  });

  // Close modal with Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && modal.style.display === 'flex') {
      closeModal();
    }
  });

  // Function to close the modal
  function closeModal() {
    modal.style.display = "none";
    document.body.style.overflow = ''; // Restore scrolling
    modal.setAttribute('aria-hidden', 'true');
  }
});