document.querySelector(".loading-box").style.display = "flex";

setTimeout(() => {
  const loadingBox = document.querySelector(".loading-box");
  loadingBox.style.opacity = "0";

  setTimeout(() => {
    loadingBox.style.display = "none";
  }, 300); // 0.3s
}, 1000); // 1s
