// Intersection Observer for scroll animations
document.addEventListener('DOMContentLoaded', function() {
    // Function to check if browser supports Intersection Observer
    if ('IntersectionObserver' in window) {
        // Select all journey items
        const journeyItems = document.querySelectorAll('.journey_item');

        // Create observer options
        const options = {
            root: null, // Use viewport as root
            rootMargin: '0px', // No margin
            threshold: 0.2 // Trigger when 20% of the element is visible
        };

        // Create observer
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                // If element is in viewport
                if (entry.isIntersecting) {
                    // Add animation class
                    entry.target.classList.add('animate-in');
                    // Stop observing once animated
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        // Observe each journey item
        journeyItems.forEach(item => {
            observer.observe(item);
        });
    } else {
        // Fallback for browsers that don't support Intersection Observer
        const journeyItems = document.querySelectorAll('.journey_item');
        journeyItems.forEach(item => {
            item.classList.add('animate-in');
        });
    }
});

// Add lazy loading for images
document.addEventListener('DOMContentLoaded', function() {
    if ('loading' in HTMLImageElement.prototype) {
        // Browser supports native lazy loading
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.setAttribute('loading', 'lazy');
        });
    } else {
        // Fallback for browsers that don't support lazy loading
        // You could add a lazy loading library here if needed
        console.log('Browser does not support native lazy loading');
    }
});

// Image Modal Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get the modal
    const modal = document.getElementById('img_modal');
    const modalImg = document.getElementById('modal_image');

    // Get all images that should be clickable
    const clickableImages = document.querySelectorAll('.about_pic_image, .sketch_img, .lucky_img');

    // Add click event to each image
    clickableImages.forEach(img => {
        img.style.cursor = 'pointer'; // Change cursor to indicate clickable
        img.addEventListener('click', function() {
            modal.classList.add('active');
            modalImg.src = this.src;
            modalImg.alt = this.alt;

            // Prevent scrolling when modal is open
            document.body.style.overflow = 'hidden';
        });
    });

    // Close the modal when clicking outside the image
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.remove('active');
            // Re-enable scrolling
            document.body.style.overflow = '';
        }
    });

    // Close on escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            // Re-enable scrolling
            document.body.style.overflow = '';
        }
    });
});