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