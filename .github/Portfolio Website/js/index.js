$(".toggle").hover(function () {
  $(this).find(".toggleContainer").toggleClass("active");
  $(this).sibling(".toggle").find(".toggleContainer").removeClass("active");
});
