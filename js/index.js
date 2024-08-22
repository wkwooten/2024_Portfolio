// $(".toggle").hover(function () {
//   $(this).find(".toggleContainer").toggleClass("active");
//   $(this).sibling(".toggle").find(".toggleContainer").removeClass("active");
// });

console.log("test");

$(".hamburger_menu").on("click", function () {
  $(".modal").show();
});

$(".modal_menu").on("click", function () {
  $(".modal").hide();
});
