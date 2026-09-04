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
     Sticky nav row.

     Scrolling down slides rows 1 and 2 (top info bar + branding) out
     of view so only the nav row is left pinned to the top; scrolling
     up brings them back. The slide distance is measured from the live
     layout rather than hard-coded, so it survives any change to the
     rows above the nav.
     --------------------------------------------------------------- */
  function initStickyHeader() {
    var header = document.querySelector("header");
    if (!header) return;
    var nav = header.querySelector("nav");
    if (!nav) return;

    var shift = 0;
    var navHeight = 0;
    var lastY = window.pageYOffset || 0;
    var collapsed = false;
    var ticking = false;

    function desktop() {
      return window.matchMedia("(min-width: 1025px)").matches;
    }

    function measure() {
      /* Distance from the top of the header to the top of the nav row
         is exactly the height of everything above it. */
      var hRect = header.getBoundingClientRect();
      var nRect = nav.getBoundingClientRect();
      /* Both rects move together with the transform, so their
         difference is the untransformed gap either way. */
      shift = Math.round(nRect.top - hRect.top);
      navHeight = Math.round(nRect.height);
      header.style.setProperty("--posh-header-shift", shift + "px");
      /* scroll-margin-top is read on the anchored section, which is not a
         descendant of the header, so the nav height has to live on :root. */
      document.documentElement.style.setProperty("--posh-nav-height", navHeight + "px");
    }

    function setCollapsed(next) {
      if (next === collapsed) return;
      collapsed = next;
      header.classList.toggle("posh-collapsed", collapsed);
      header.setAttribute("aria-expanded", collapsed ? "false" : "true");
    }

    function update() {
      ticking = false;
      if (!desktop() || getComputedStyle(nav).display === "none") {
        setCollapsed(false);
        return;
      }
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;

      /* Near the top of the page always show the full header. */
      if (y <= shift + 8) {
        setCollapsed(false);
      } else if (y > lastY + 4) {
        setCollapsed(true);          /* scrolling down  */
      } else if (y < lastY - 4) {
        setCollapsed(false);         /* scrolling up    */
      }
      lastY = y;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    /* A dropdown is useless once its parent has slid away - opening one
       keeps the header down until the pointer leaves. */
    nav.addEventListener("mouseenter", function () { setCollapsed(false); });

    /* The header is translucent by design (row 1 is rgba(...,0.76) and
       the branding row has no background of its own), which was fine while
       it was static. Now that page content scrolls underneath, give it the
       page's own background colour so the result is what it always looked
       like - not white on pages whose background is off-white. */
    function paintHeaderBase() {
      /* Read the alpha channel rather than pattern-matching the string:
         a fully transparent colour must not be painted onto the header,
         or the rows above the nav go see-through while scrolling. */
      function opaque(colour) {
        if (!colour || colour === "transparent") return false;
        var parts = colour.replace(/\s+/g, "").match(/^rgba?\(([^)]*)\)$/i);
        if (!parts) return true;                 /* a keyword or hex - treat as solid */
        var bits = parts[1].split(",");
        if (bits.length < 4) return true;        /* rgb() has no alpha */
        return parseFloat(bits[3]) > 0;
      }

      var bodyBg = getComputedStyle(document.body).backgroundColor;
      var htmlBg = getComputedStyle(document.documentElement).backgroundColor;
      var base = opaque(bodyBg) ? bodyBg : (opaque(htmlBg) ? htmlBg : "");

      if (base) {
        header.style.backgroundColor = base;
      } else {
        /* Nothing usable on the page - leave the stylesheet's own
           opaque fallback in place instead of overriding it. */
        header.style.removeProperty("background-color");
      }
    }
    paintHeaderBase();

    measure();
    header.classList.add("posh-sticky-ready");
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      setCollapsed(false);
      measure();
    });
    window.addEventListener("load", measure);
  }

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
    document.addEventListener("DOMContentLoaded", function () { init(); initStickyHeader(); landOnHash(); });
  } else {
    init();
    initStickyHeader();
    landOnHash();
  }
})();
