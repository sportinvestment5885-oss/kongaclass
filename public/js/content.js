/**
 * Website content loader
 * Sources:
 *   /locales/content.json  → site chrome (meta, nav, location, social, actions)
 *   /locales/home.json     → homepage (hero + services)
 *   /locales/booking.json  → online booking page copy + schedule
 *
 * - Fills [data-content] text nodes
 * - Fills [data-content-attr] attributes
 * - Applies SEO meta / Open Graph / JSON-LD
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

  function upsertMeta(attr, key, value) {
    if (value == null || value === "") return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", String(value));
  }

  function upsertLink(rel, href) {
    if (!href) return;
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  }

  function absoluteUrl(siteUrl, path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const base = (siteUrl || "https://kongakittivel.hu").replace(/\/$/, "");
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  }

  function applySeo(content) {
    const meta = content.meta || {};
    const onBookingPage = /foglalas/i.test(location.pathname);
    const siteUrl = (meta.siteUrl || "https://kongakittivel.hu").replace(
      /\/$/,
      ""
    );
    const title = onBookingPage
      ? content.booking?.documentTitle || meta.documentTitle
      : meta.documentTitle;
    const description = onBookingPage
      ? content.booking?.description || meta.description
      : meta.description;
    const canonical = onBookingPage ? `${siteUrl}/foglalas` : `${siteUrl}/`;
    const ogImage = absoluteUrl(siteUrl, meta.ogImage);

    if (title) document.title = title;
    if (meta.lang) document.documentElement.lang = meta.lang;

    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", meta.keywords);
    upsertMeta("name", "author", meta.siteTitle || "Konga Kittivel");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("property", "og:image:alt", meta.ogImageAlt);
    upsertMeta("property", "og:site_name", meta.siteTitle || "Konga Kittivel");
    upsertMeta("property", "og:locale", "hu_HU");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage);
    upsertLink("canonical", canonical);

    const jsonLdEl = document.getElementById("seo-jsonld");
    if (jsonLdEl && !onBookingPage) {
      const sameAs = [];
      if (content.social?.facebook?.href) sameAs.push(content.social.facebook.href);
      const payload = {
        "@context": "https://schema.org",
        "@type": "SportsActivityLocation",
        name: meta.siteTitle || "Konga Kittivel",
        alternateName: "Konga® edzés Baja",
        description:
          meta.description ||
          "Konga® edzések Baján – tánc, box, kardió és alakformálás.",
        url: `${siteUrl}/`,
        image: ogImage,
        email: meta.email || undefined,
        address: {
          "@type": "PostalAddress",
          streetAddress: meta.streetAddress || "Szegedi út 9",
          addressLocality: meta.addressLocality || "Baja",
          postalCode: meta.postalCode || "6500",
          addressCountry: meta.addressCountry || "HU",
        },
        geo: meta.geo
          ? {
              "@type": "GeoCoordinates",
              latitude: meta.geo.latitude,
              longitude: meta.geo.longitude,
            }
          : undefined,
        sameAs,
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: "Tuesday",
            opens: "19:30",
            closes: "20:30",
          },
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: "Thursday",
            opens: "19:30",
            closes: "20:30",
          },
        ],
        potentialAction: {
          "@type": "ReserveAction",
          target: `${siteUrl}/foglalas`,
          name: "Online foglalás",
        },
      };
      jsonLdEl.textContent = JSON.stringify(payload);
    }
  }

  function applyStaticContent(content) {
    document.documentElement.lang = content.meta?.lang || "hu";

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

  function facebookIconSvg() {
    return `<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true" focusable="false"><path fill="currentColor" d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.48h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z"/></svg>`;
  }

  function renderFacebookLinks(content) {
    const fb = content.social?.facebook;
    const mounts = document.querySelectorAll("[data-social-facebook]");
    if (!fb?.href || !mounts.length) return;

    mounts.forEach((el) => {
      el.href = fb.href;
      el.target = "_blank";
      el.rel = "noopener noreferrer";
      el.setAttribute("aria-label", fb.label || "Facebook");
      el.innerHTML = facebookIconSvg();
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
    applySeo(content);
    applyStaticContent(content);
    renderNav(content);
    renderFacebookLinks(content);
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
