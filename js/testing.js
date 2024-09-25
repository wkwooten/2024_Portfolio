// function toggle(el) {
//   if (el.style.display == 'none') {
//     el.style.display = '';
//   } else {
//     el.style.display = 'none';
//   }
// }


u(".modal_button").on('click', e => {
  u(".modal").toggleClass("collapsed");
  u("body").toggleClass("stop_scroll");
  u(".modal_back_btn").toggleClass("switch");
  u(".modal_menu_btn").toggleClass("switch");
});


u(".indicator").on('click', e => {
  u('.projects').scroll();
});

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


// el.classList.toggle(className);

// chev.addEventListener('click', () => {});

var acc = document.getElementsByClassName("section_header");
var i;

for (i = 0; i < acc.length; i++) {
  acc[i].addEventListener("click", function () {
    u('.chev').toggleClass('chev_rotate')
    var cs_section_content = this.nextElementSibling;
    if (cs_section_content.style.maxHeight) {
      cs_section_content.style.maxHeight = null;
    } else {
      cs_section_content.style.maxHeight = cs_section_content.scrollHeight + "px";
    }
  });
}

// for (i = 0; i < acc.length; i++) {
//   acc[i].addEventListener("click", function() {
//     this.classList.toggle("active");

//     var cs_section = this.nextElementSibling;
//     if (cs_section.style.display === "block") {
//       cs_section.style.display = "none";
//     } else {
//       cs_section.style.display = "block";
//     }
//   });
// }


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
