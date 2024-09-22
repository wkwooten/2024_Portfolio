u(".name").on('click', e => {
  u(".modal").show();
});

u(".indicator").on('click', e => {
  u('.projects').scroll();
});

u(".chev").on('click', e => {
  u('#overview').addClass('collapsed');
  u('.chev').addClass('chev_rotate');
});

// u(".chev").on('click', e => {
//   u('#overview').removeClass('collapsed');
//   u('.chev').removeClass('chev_rotate');
// });

// if ("")