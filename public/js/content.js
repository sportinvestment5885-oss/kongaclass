/**
 * Website content loader
 * Sources:
 *   /locales/content.json  → site chrome (meta, nav, location, search, actions)
 *   /locales/home.json     → homepage (hero + services)
 *   /locales/booking.json  → online booking modal copy + schedule
 *
 * - Fills [data-content] text nodes
 * - Fills [data-content-attr] attributes
 * - Renders lists from JSON (nav items, service cards)
 */
(function () {
  "use strict";

  const CONTENT_URL = "/locales/content.json";
  const HOME_URL = "/locales/home.json";
  const BOOKING_URL = "/locales/booking.json";

  function getByPath(obj, path) {
    return path.split(".").reduce((acc, key) => {
      if (acc == null) return undefined;
      return acc[key];
    }, obj);
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return res.json();
  }

  function applyStaticContent(content) {
    document.documentElement.lang = content.meta?.lang || "hu";

    const onBookingPage = /foglalas/i.test(location.pathname);
    if (onBookingPage && content.booking?.documentTitle) {
      document.title = content.booking.documentTitle;
    } else if (content.meta?.documentTitle) {
      document.title = content.meta.documentTitle;
    }

    document.querySelectorAll("[data-content]").forEach((el) => {
      const key = el.getAttribute("data-content");
      const value = getByPath(content, key);
      if (value == null || typeof value === "object") return;
      el.textContent = value;
    });

    document.querySelectorAll("[data-content-attr]").forEach((el) => {
      const pairs = el.getAttribute("data-content-attr").split(",");
      pairs.forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (!attr || !key) return;
        const value = getByPath(content, key);
        if (value == null || typeof value === "object") return;
        el.setAttribute(attr, String(value));
      });
    });
  }

  function renderNav(content) {
    const lists = document.querySelectorAll("[data-content-list='nav.items']");
    const items = content.nav?.items;
    if (!lists.length || !Array.isArray(items)) return;

    const onBookingPage = /foglalas/i.test(location.pathname);

    lists.forEach((list) => {
      list.replaceChildren();
      items.forEach((item) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        let href = item.href || "#";
        if (item.id === "home") {
          href = "/";
        } else if (onBookingPage && href.startsWith("#") && href.length > 1) {
          href = `/${href}`;
        }
        a.href = href;
        a.textContent = item.label || "";
        if (item.id) a.dataset.navId = item.id;
        li.appendChild(a);
        list.appendChild(li);
      });
    });
  }

  function renderServices(content) {
    const section = document.getElementById("services-section");
    const mount = document.querySelector("[data-content-list='services.items']");
    const services = content.services;
    const items = services?.items;
    if (!mount || !Array.isArray(items)) return;

    if (section && services.ariaLabel) {
      section.setAttribute("aria-label", services.ariaLabel);
    }

    mount.replaceChildren();

    items.forEach((item) => {
      const article = document.createElement("article");
      article.className = "service-card";
      if (item.id) article.dataset.serviceId = item.id;

      const variant = item.iconVariant === "green" ? "green" : "orange";
      const text = item.description || services.description || "";

      article.innerHTML = `
        <div class="service-icon service-icon--${variant}" aria-hidden="true">
          <img src="/images/img1.png" alt="" width="24" height="24" />
        </div>
        <h3 class="service-title"></h3>
        <p class="service-text"></p>
      `;

      article.querySelector(".service-title").textContent = item.title || "";
      article.querySelector(".service-text").textContent = text;

      mount.appendChild(article);
    });
  }

  function renderAbout(content) {
    const about = content.about;
    if (!about) return;

    const parasMount = document.querySelector(
      "[data-content-list='about.paragraphs']"
    );
    if (parasMount && Array.isArray(about.paragraphs)) {
      parasMount.replaceChildren();
      about.paragraphs.forEach((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        parasMount.appendChild(p);
      });
    }

    const statsMount = document.querySelector(
      "[data-content-list='about.stats']"
    );
    if (statsMount && Array.isArray(about.stats)) {
      statsMount.replaceChildren();
      about.stats.forEach((stat) => {
        const div = document.createElement("div");
        div.className = "about-stat";
        const value = document.createElement("p");
        value.className = "about-stat__value";
        value.textContent = stat.value || "";
        const label = document.createElement("p");
        label.className = "about-stat__label";
        label.textContent = stat.label || "";
        div.append(value, label);
        statsMount.appendChild(div);
      });
    }
  }

  function renderGallery(content) {
    const mount = document.querySelector("[data-content-list='gallery.items']");
    const section = document.querySelector(".gallery-section");
    const moreBtn = document.getElementById("gallery-more-btn");
    const items = content.gallery?.items;
    if (!mount || !Array.isArray(items)) return;

    const imageSvg = `<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
    const videoSvg = `<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor"/></svg>`;

    const hasExtra = items.some((item) => item.extra);
    let expanded = false;

    mount.replaceChildren();
    items.forEach((item) => {
      const card = document.createElement("div");
      const aspect = item.aspect === "wide" ? "wide" : "portrait";
      const hasMedia = Boolean(item.src);
      card.className = `gallery-card gallery-card--${aspect}${hasMedia ? " gallery-card--media" : ""}${item.extra ? " gallery-card--extra" : ""}`;
      if (item.id) card.dataset.galleryId = item.id;
      if (item.extra) card.hidden = true;

      const isVideo = item.type === "video";

      if (hasMedia && isVideo) {
        const video = document.createElement("video");
        video.className = "gallery-card__media";
        video.playsInline = true;
        video.controls = !item.autoplay;
        if (item.loop) video.loop = true;
        if (item.muted || item.autoplay) video.muted = true;
        if (item.label) video.setAttribute("aria-label", item.label);

        if (item.extra) {
          video.dataset.src = item.src;
          video.preload = "none";
        } else {
          video.src = item.src;
          video.preload = item.autoplay ? "auto" : "metadata";
          if (item.autoplay) video.autoplay = true;
        }

        card.appendChild(video);
        if (item.label) {
          const label = document.createElement("p");
          label.className = "gallery-card__caption";
          label.textContent = item.label;
          card.appendChild(label);
        }
      } else if (hasMedia && !isVideo) {
        const img = document.createElement("img");
        img.className = "gallery-card__media";
        img.src = item.src;
        img.alt = item.label || "";
        img.loading = "lazy";
        card.appendChild(img);
        if (item.label) {
          const label = document.createElement("p");
          label.className = "gallery-card__caption";
          label.textContent = item.label;
          card.appendChild(label);
        }
      } else {
        card.innerHTML = `
          ${isVideo ? videoSvg : imageSvg}
          <p class="gallery-card__label"></p>
          <span class="gallery-card__hint"></span>
        `;
        card.querySelector(".gallery-card__label").textContent = item.label || "";
        card.querySelector(".gallery-card__hint").textContent = item.hint || "";
      }

      mount.appendChild(card);
    });

    function setExpanded(next) {
      expanded = next;
      section?.classList.toggle("gallery-section--expanded", expanded);
      moreBtn?.setAttribute("aria-expanded", expanded ? "true" : "false");

      const extras = mount.querySelectorAll(".gallery-card--extra");
      extras.forEach((card) => {
        card.hidden = !expanded;
        if (expanded) {
          const video = card.querySelector("video[data-src]");
          if (video && !video.src) {
            video.src = video.dataset.src;
            video.preload = "metadata";
          }
        } else {
          const video = card.querySelector("video");
          if (video) {
            video.pause();
            video.currentTime = 0;
          }
        }
      });

      const cta = content.gallery?.cta;
      if (moreBtn && cta) {
        moreBtn.textContent = expanded
          ? cta.labelLess || "Kevesebb"
          : cta.label || "Több kép és videó";
      }

      if (expanded) {
        const firstExtra = mount.querySelector(".gallery-card--extra");
        if (firstExtra) {
          requestAnimationFrame(() => {
            firstExtra.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
      }
    }

    if (moreBtn) {
      if (!hasExtra) {
        moreBtn.hidden = true;
      } else {
        moreBtn.hidden = false;
        moreBtn.textContent =
          content.gallery?.cta?.label || "Több kép és videó";
        moreBtn.onclick = (event) => {
          event.preventDefault();
          setExpanded(!expanded);
        };
      }
    }
  }

  function applyContent(content) {
    applyStaticContent(content);
    renderNav(content);
    renderServices(content);
    renderAbout(content);
    renderGallery(content);

    const yearEl = document.getElementById("site-year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    window.__content = content;
    window.__i18n = content;
    document.dispatchEvent(
      new CustomEvent("content:ready", { detail: content })
    );
  }

  Promise.all([
    fetchJson(CONTENT_URL),
    fetchJson(HOME_URL),
    fetchJson(BOOKING_URL),
  ])
    .then(([site, home, bookingFile]) => {
      applyContent({ ...site, ...home, ...bookingFile });
    })
    .catch((err) => {
      console.error("[content]", err);
    });
})();
