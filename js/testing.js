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

// Select all section headers (accordions)
var acc = document.querySelectorAll('.section_header');

// Loop through each header
for (let i = 0; i < acc.length; i++) {
  // Set initial state to expanded
  let content = acc[i].nextElementSibling;
  content.style.maxHeight = content.scrollHeight + "px";

  // Add click event to each header
  acc[i].addEventListener('click', function() {
    let content = this.nextElementSibling;

    // Toggle the rotation of the arrow (chevron)
    this.querySelector('.chev').classList.toggle('chev_rotate');

    // Toggle between expanded and collapsed states
    if (content.style.maxHeight && content.style.maxHeight !== "0px") {
      content.style.maxHeight = "0px"; // Collapse
    } else {
      content.style.maxHeight = content.scrollHeight + "px"; // Expand
    }
  });
}

// u(".chev").on('click', e => {
//   u('#overview').addClass('collapsed');
//   u('.chev').addClass('chev_rotate');
// });

// u(".modal_button").on('click', e => {
//   u('.modal').toggleClass('collapsed');
//   u('.chev').addClass('chev_rotate');
// });


// u(".chev").on('click', e => {
//   u('#overview').toggleClass('collapsed');
//   u('.chev').addClass('chev_rotate');
// });js/testing.js


// for (i = 0; i < acc.length; i++) {
//   acc[i].addEventListener("click", function() {
//     this.classList.toggle("active");
//     var cs_section = this.nextElementSibling;
//     if (cs_section.style.maxheight = 100%) {
//       cs_section.style.maxheight = null;
//     } else {
//       cs_section.style.maxheight = "100%";
//     }
//   });
// }

// var modal = document.getElementsByClassName("cs_img_modal");

// var img = document.getElementsByClassName("");

// for (i = 0; i < acc.length; i++) {
//   acc[i].addEventListener("click", function() {
//     u('.chev').toggleClass('chev_rotate')
//     var cs_section_content = this.nextElementSibling;
//     if (cs_section_content.style.maxHeight) {
//       cs_section_content.style.maxHeight = null;
//     } else {
//       cs_section_content.style.maxHeight = cs_section_content.scrollHeight + "px";
//     }
//   });
// }
