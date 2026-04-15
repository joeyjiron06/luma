let nav;
let isScrolled = false;
let prevIsScrolled = false;

function init() {
  nav = document.getElementById("main-nav");

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function onScroll() {
  prevIsScrolled = isScrolled;

  if (window.scrollY > 10) {
    isScrolled = true;
  } else {
    isScrolled = false;
  }

  if (prevIsScrolled !== isScrolled) {
    scrollChanged();
  }
}

function scrollChanged() {
  if (isScrolled) {
    nav.classList.add("bg-black/50", "backdrop-blur-md", "border-white/5");
    nav.classList.remove("border-transparent");
  } else {
    nav.classList.remove("bg-black/50", "backdrop-blur-md", "border-white/5");
    nav.classList.add("border-transparent");
  }
}

if (document.readyState === "complete") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
