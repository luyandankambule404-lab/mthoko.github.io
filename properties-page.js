/**
 * Properties page — room photos from API with static fallbacks.
 */
(function () {
  window.KmmPropertiesPage = true;

  const grid = document.querySelector(".properties__grid");
  if (!grid) return;

  const PROPERTY_SECTIONS = [
    {
      roomId: "standard-night",
      title: "Single Unit",
      description:
        "Comfortable & Affordable — perfect for individuals seeking privacy and value.",
      fallbackImage:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
      bookPackage: "Standard Night Stay",
    },
    {
      roomId: "shared-unit",
      title: "Shared Unit",
      description:
        "Cost-Effective Living — ideal for students, colleagues, or friends sharing space.",
      fallbackImage:
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80",
      bookPackage: "Shared Unit Stay",
    },
    {
      roomId: "monthly-rental",
      title: "Monthly Rental (All 18 Units)",
      description:
        "Ideal for Businesses — bulk stays with full facility access and long-term convenience.",
      fallbackImage:
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
      bookPackage: "Monthly Rental Package",
    },
  ];

  const COMMITMENT_HTML = `
    <article class="property-card property-card--commitment reveal visible">
      <div class="property-card__body">
        <span class="section__tag">Our Commitment</span>
        <h3>Quality Accommodation</h3>
        <p>Behind every stay is an expert, experienced team dedicated to maintaining clean, secure, and welcoming environments for all residents.</p>
      </div>
    </article>`;

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  function roomImageUrl(room, fallback) {
    if (typeof KmmImages !== "undefined") {
      return KmmImages.effectiveRoomUrl(room) || fallback;
    }
    const url = String(room?.imageUrl || room?.image_url || "").trim();
    return url || fallback;
  }

  function renderCard(section, room) {
    const img = roomImageUrl(room, section.fallbackImage);
    const alt = room?.name || section.title;
    return `
      <article class="property-card reveal visible">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" width="600" height="220" />
        <div class="property-card__body">
          <h3>${escapeHtml(section.title)}</h3>
          <p>${escapeHtml(room?.description || section.description)}</p>
          <button type="button" class="btn btn--outline btn--sm js-book-open" data-package="${escapeHtml(section.bookPackage)}" style="margin-top:1rem;">Find dates &amp; book</button>
        </div>
      </article>`;
  }

  function renderFromRooms(rooms) {
    const byId = new Map(rooms.map((r) => [r.id, r]));
    const cards = PROPERTY_SECTIONS.map((section) => {
      const room = byId.get(section.roomId) || {
        name: section.title,
        description: section.description,
        imageUrl: section.fallbackImage,
      };
      return renderCard(section, room);
    }).join("");
    grid.innerHTML = cards + COMMITMENT_HTML;
  }

  function renderStaticFallback() {
    const fromDom = [...grid.querySelectorAll(".property-card:not(.property-card--commitment)")];
    if (fromDom.length >= 3) {
      fromDom.forEach((el) => el.classList.add("reveal", "visible"));
      const commitment = grid.querySelector(".property-card--commitment");
      commitment?.classList.add("reveal", "visible");
      return;
    }
    renderFromRooms([]);
  }

  async function loadGalleryFallback() {
    try {
      const data = await KmmApi.request("/gallery?category=property");
      const resolve =
        typeof KmmImages !== "undefined" ? KmmImages.resolveUrl : (u) => String(u || "").trim();
      return (data.items || []).map((i) => resolve(i.url)).filter(Boolean);
    } catch {
      return [];
    }
  }

  async function load() {
    let rooms = [];

    if (typeof KmmRooms !== "undefined") {
      await KmmRooms.ready();
      if (KmmApi.isAvailable()) {
        rooms = KmmRooms.getAll().filter((r) => r.active !== false);
      }
    }

    if (!rooms.length && typeof KmmApi !== "undefined") {
      await KmmApi.init();
      if (KmmApi.isAvailable()) {
        const galleryUrls = await loadGalleryFallback();
        rooms = PROPERTY_SECTIONS.map((section, i) => ({
          id: section.roomId,
          name: section.title,
          description: section.description,
          imageUrl: galleryUrls[i] || section.fallbackImage,
        }));
      }
    }

    if (rooms.length) {
      renderFromRooms(rooms);
      return;
    }

    renderStaticFallback();
  }

  load();
})();
