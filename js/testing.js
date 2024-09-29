u(".name").on('click', e => {
  u('.name').toggleClass('bounce');
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

var modal = document.getElementById("img_modal");

var modalImg = document.getElementById("modal_image");

var images = document.querySelectorAll("img"); // You can adjust this selector to target specific images
images.forEach(function(img) {
  img.addEventListener("click", function() {
    modal.style.display = "block"; // Display the modal
    modalImg.src = this.src; // Set the modal image source to the clicked image's source
  });
});