$(".loading-box").css("display", "flex");

setTimeout(() => {
  $(".loading-box").css("opacity", "0");

  setTimeout(() => {
    $(".loading-box").css("display", "none");
  }, 300);
}, 1000);