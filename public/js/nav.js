/**
 * Navigation interactions
 * - Mobile hamburger drawer open/close (focus trap + Escape)
 * - Expandable search field
 * - Labels always come from window.__content (locales/content.json)
 */
(function () {
  "use strict";

  const nav = document.getElementById("primary-nav");
  const toggle = document.getElementById("nav-toggle");
  const closeBtn = document.getElementById("nav-close");
  const drawer = document.getElementById("nav-menu");
  const overlay = document.getElementById("nav-overlay");
  const searchForm = document.querySelector(".top-search");
  const searchToggle = document.getElementById("search-toggle");
  const searchInput = document.getElementById("site-search");

  if (!nav || !toggle || !drawer) return;

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function t(path) {
    const dict = window.__content || window.__i18n;
    if (!dict) return "";
    return path.split(".").reduce((acc, key) => acc?.[key], dict) ?? "";
  }

  function openMenu() {
    drawer.classList.add("is-open");
    overlay?.classList.add("is-visible");
    if (overlay) overlay.hidden = false;

    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", t("nav.closeMenu"));

    document.body.style.overflow = "hidden";

    const first = drawer.querySelector(FOCUSABLE);
    first?.focus();
  }

  function closeMenu() {
    drawer.classList.remove("is-open");
    overlay?.classList.remove("is-visible");

    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", t("nav.openMenu"));

    document.body.style.overflow = "";

    window.setTimeout(() => {
      if (overlay && !overlay.classList.contains("is-visible")) {
        overlay.hidden = true;
      }
    }, 200);

    toggle.focus();
  }

  function isMenuOpen() {
    return drawer.classList.contains("is-open");
  }

  function bindNavLinkClosers() {
    drawer.querySelectorAll(".nav-list a").forEach((link) => {
      link.addEventListener("click", () => {
        if (isMenuOpen()) closeMenu();
      });
    });
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isSamePage(url) {
    const path = location.pathname.replace(/\/index\.html$/i, "/") || "/";
    const linkPath = url.pathname.replace(/\/index\.html$/i, "/") || "/";
    return url.origin === location.origin && path === linkPath;
  }

  function scrollToTarget(target, hash) {
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    target.scrollIntoView({ behavior, block: "start" });
    if (hash) {
      history.pushState(null, "", hash);
    }
  }

  function scrollToTop() {
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
    history.pushState(null, "", location.pathname);
  }

  function handleInPageNav(event) {
    const link = event.currentTarget;
    let url;
    try {
      url = new URL(link.href, location.href);
    } catch {
      return;
    }

    if (!isSamePage(url)) return;

    // Home / top of page
    if (!url.hash || url.hash === "#") {
      if (link.dataset.navId === "home" || url.pathname === "/" || url.pathname.endsWith("/")) {
        event.preventDefault();
        const run = () => scrollToTop();
        if (isMenuOpen()) {
          closeMenu();
          window.setTimeout(run, 220);
        } else {
          run();
        }
      }
      return;
    }

    const id = decodeURIComponent(url.hash.slice(1));
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();

    const run = () => scrollToTarget(target, url.hash);
    if (isMenuOpen()) {
      closeMenu();
      window.setTimeout(run, 220);
    } else {
      run();
    }
  }

  function bindSmoothScrollNav() {
    document
      .querySelectorAll(".nav-list a, .site-footer__links a, a.hero-cta, a.about-cta")
      .forEach((link) => {
        link.removeEventListener("click", handleInPageNav);
        link.addEventListener("click", handleInPageNav);
      });
  }

  function scrollToHashOnLoad() {
    if (!location.hash || location.hash === "#") return;
    const id = decodeURIComponent(location.hash.slice(1));
    const target = document.getElementById(id);
    if (!target) return;
    window.setTimeout(() => {
      scrollToTarget(target, location.hash);
    }, 50);
  }

  function initNavScrolling() {
    bindNavLinkClosers();
    bindSmoothScrollNav();
    scrollToHashOnLoad();
  }

  toggle.addEventListener("click", () => {
    isMenuOpen() ? closeMenu() : openMenu();
  });

  closeBtn?.addEventListener("click", closeMenu);
  overlay?.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (isMenuOpen()) {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (searchForm?.classList.contains("is-open")) {
      collapseSearch();
    }
  });

  drawer.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || !isMenuOpen()) return;

    const focusables = Array.from(drawer.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null
    );
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const mq = window.matchMedia("(min-width: 901px)");
  function handleBreakpoint(e) {
    if (e.matches && isMenuOpen()) closeMenu();
  }
  if (mq.addEventListener) {
    mq.addEventListener("change", handleBreakpoint);
  } else {
    mq.addListener(handleBreakpoint);
  }

  function expandSearch() {
    if (!searchForm || !searchInput || !searchToggle) return;

    searchForm.classList.add("is-open");
    searchToggle.setAttribute("aria-expanded", "true");
    searchToggle.setAttribute("aria-label", t("search.submit"));
    searchInput.setAttribute("aria-hidden", "false");
    searchInput.setAttribute("tabindex", "0");
    searchInput.focus();
  }

  function collapseSearch() {
    if (!searchForm || !searchInput || !searchToggle) return;

    searchForm.classList.remove("is-open");
    searchToggle.setAttribute("aria-expanded", "false");
    searchToggle.setAttribute("aria-label", t("search.expand"));
    searchInput.setAttribute("aria-hidden", "true");
    searchInput.setAttribute("tabindex", "-1");
    searchInput.blur();
  }

  searchToggle?.addEventListener("click", () => {
    const open = searchForm.classList.contains("is-open");

    if (!open) {
      expandSearch();
      return;
    }

    if (searchInput.value.trim()) {
      searchForm.requestSubmit?.() || searchForm.submit();
    } else {
      collapseSearch();
    }
  });

  searchForm?.addEventListener("focusout", (event) => {
    if (!searchForm.contains(event.relatedTarget)) {
      window.setTimeout(() => {
        if (!searchForm.contains(document.activeElement)) {
          collapseSearch();
        }
      }, 0);
    }
  });

  // Re-bind after nav items are rendered from content.json
  if (window.__content) {
    initNavScrolling();
  } else {
    document.addEventListener("content:ready", initNavScrolling, {
      once: true,
    });
  }
})();
