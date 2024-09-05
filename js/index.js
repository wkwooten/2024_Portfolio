// $(".toggle").hover(function () {
//   $(this).find(".toggleContainer").toggleClass("active");
//   $(this).sibling(".toggle").find(".toggleContainer").removeClass("active");
// });

console.log("test");

$(".name").on("click", function () {
  $(".name").addclass(".animate__fadeIn");
});


$(".hamburger_menu").on("click", function () {
  $(".modal").show();
  $(".hamburger_menu").hide();
  $(".modal_back").show();
});

$(".modal_back").on("click", function () {
  $(".modal").hide();
  $(".hamburger_menu").show();
  $(".modal_back").hide();
});

$(".side_nav_close").on("click", function () {
  $(".side_nav_container").show();
});

$(".side_nav_close").on("click", function () {
  $(".side_nav_container").hide();
});