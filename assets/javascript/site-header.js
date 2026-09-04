/* =========================================================
   POSH — SHARED SITE HEADER BEHAVIOUR
   Mobile menu panel + mobile dropdown toggles.
   Loaded on every page so the header behaves identically
   everywhere. Safe to load more than once.
   ========================================================= */
(function () {
  "use strict";

  if (window.__poshHeaderInit) return;
  window.__poshHeaderInit = true;

  function init() {
    var menuBtn = document.getElementById("menuBtn");
    var closeBtn = document.getElementById("closeMenu");
    var mobileMenu = document.getElementById("mobileMenu");
    var mobilePanel = document.getElementById("mobilePanel");

    if (!menuBtn || !mobileMenu || !mobilePanel) return;

    function openMobile() {
      mobileMenu.classList.remove("hidden");
      setTimeout(function () {
        mobilePanel.classList.remove("-translate-x-full");
      }, 10);
    }

    function closeMobile() {
      mobilePanel.classList.add("-translate-x-full");
      setTimeout(function () {
        mobileMenu.classList.add("hidden");
      }, 300);
    }

    menuBtn.addEventListener("click", openMobile);
    if (closeBtn) closeBtn.addEventListener("click", closeMobile);

    mobileMenu.addEventListener("click", function (e) {
      if (e.target === mobileMenu) closeMobile();
    });

    /* Close the panel again once a link inside it is followed */
    mobilePanel.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest("a[href]") : null;
      if (link) closeMobile();
    });

    /* Never leave the desktop overlay open when resizing up to desktop */
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1024 && !mobileMenu.classList.contains("hidden")) {
        closeMobile();
      }
    });
  }

  /* Accordion toggle used by the mobile menu's dropdown buttons.
     Exposed globally because the markup calls it via onclick. */
  window.toggleDropdown = function (id, btn) {
    var list = document.getElementById(id);
    if (!list) return;
    list.classList.toggle("open");
    if (btn) btn.classList.toggle("active");
  };

  /* ---------------------------------------------------------------
     Landing on a #section link.

     These pages keep growing while their images decode, so the browser
     performs its jump long before the final layout exists - you get a
     sudden lurch a second or two after the page appears. Do the scroll
     ourselves once everything has settled, and do it smoothly.
     --------------------------------------------------------------- */
  function landOnHash() {
    if (window.__poshHashLanding) return;
    var id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    window.__poshHashLanding = true;

    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var settle = function () {
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      window.__poshHashLanding = false;
    };

    if (document.readyState === "complete") {
      requestAnimationFrame(settle);
    } else {
      window.addEventListener("load", function () { setTimeout(settle, 60); }, { once: true });
    }
  }

  window.addEventListener("hashchange", function () {
    window.__poshHashLanding = false;
    landOnHash();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); landOnHash(); });
  } else {
    init();
    landOnHash();
  }
})();
