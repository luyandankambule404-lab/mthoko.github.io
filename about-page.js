/**
 * About page — gallery interior image + photo strip + facilities.
 */
(function () {
  window.KmmAboutPage = true;

  function escapeHtml(str) {
    if (typeof KmmImages !== "undefined") return KmmImages.escapeHtml(str);
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  const resolveImageUrl =
    typeof KmmImages !== "undefined"
      ? KmmImages.resolveUrl
      : (url) => String(url || "").trim();

  const DEFAULT_PHOTOS =
    typeof KmmImages !== "undefined" ? KmmImages.GALLERY_DEFAULTS.slice(0, 6) : [];

  const INTERIOR_FALLBACK =
    DEFAULT_PHOTOS[0]?.url ||
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=900&q=80";

  function bindImgFallback(img, fallbackUrl) {
    img.onerror = function () {
      this.onerror = null;
      if (this.src !== fallbackUrl) this.src = fallbackUrl;
    };
  }

  function setHeroImage(img, url, alt) {
    const resolved = resolveImageUrl(url) || INTERIOR_FALLBACK;
    bindImgFallback(img, INTERIOR_FALLBACK);
    img.src = resolved;
    img.alt = alt || "Interior at KMM Lifestyle";
  }

  function normalizeGalleryItems(items) {
    return (items || [])
      .filter((item) => (item.mediaType || "image") === "image")
      .map((item) => ({
        url: resolveImageUrl(item.url),
        title: item.title || item.category || "Photo",
      }))
      .filter((item) => item.url);
  }

  function showAboutContent() {
    document.querySelectorAll(".about__grid, .about-photos__item").forEach((el) => {
      el.classList.add("reveal", "visible");
    });
  }

  async function loadInterior() {
    const img = document.getElementById("aboutInteriorImg");
    const caption = document.getElementById("aboutInteriorCaption");
    if (!img) return;

    showAboutContent();
    bindImgFallback(img, INTERIOR_FALLBACK);

    if (typeof KmmApi === "undefined") return;
    await KmmApi.init();
    if (!KmmApi.isAvailable()) return;

    try {
      let items = [];
      const property = await KmmApi.request("/gallery?category=property");
      items = normalizeGalleryItems(property.items);
      if (!items.length) {
        const all = await KmmApi.request("/gallery");
        items = normalizeGalleryItems(all.items);
      }
      const item =
        items.find((i) => /interior|room|suite|living|bedroom/i.test(i.title || "")) || items[0];
      if (item?.url) {
        setHeroImage(img, item.url, item.title);
        if (caption) caption.textContent = item.title || "Interior at KMM Lifestyle";
      }
    } catch {
      /* keep HTML fallback */
    }
  }

  function renderPhotoStrip(items) {
    const grid = document.getElementById("aboutPhotosGrid");
    if (!grid) return;

    const display = items.length ? items.slice(0, 6) : DEFAULT_PHOTOS;
    grid.innerHTML = display
      .map(
        (item, index) => `
      <figure class="about-photos__item reveal visible${index === 0 ? " about-photos__item--wide" : ""}">
        <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" />
        <figcaption>${escapeHtml(item.title)}</figcaption>
      </figure>`
      )
      .join("");

    grid.querySelectorAll("img").forEach((imgEl, i) => {
      const fallback = (DEFAULT_PHOTOS[i] || DEFAULT_PHOTOS[0])?.url || INTERIOR_FALLBACK;
      bindImgFallback(imgEl, fallback);
    });
  }

  async function loadPhotoStrip() {
    renderPhotoStrip(DEFAULT_PHOTOS);

    if (typeof KmmApi === "undefined") return;
    await KmmApi.init();
    if (!KmmApi.isAvailable()) return;

    try {
      const data = await KmmApi.request("/gallery");
      const items = normalizeGalleryItems(data.items);
      if (items.length) renderPhotoStrip(items);
    } catch {
      /* keep defaults */
    }
  }

  async function loadFacilities() {
    const grid = document.getElementById("facilitiesGrid");
    if (!grid) return;
    if (typeof KmmApi === "undefined") return;
    await KmmApi.init();
    if (!KmmApi.isAvailable()) return;
    try {
      const data = await KmmApi.request("/facilities");
      const items = data.facilities || [];
      if (!items.length) return;
      grid.innerHTML = items
        .map(
          (f) => `
        <article class="facility-card reveal visible">
          <span class="facility-card__icon" aria-hidden="true">◆</span>
          <h3>${escapeHtml(f.name)}</h3>
          <p>${escapeHtml(f.description)}</p>
        </article>`
        )
        .join("");
    } catch {
      /* keep static fallback */
    }
  }

  showAboutContent();
  loadInterior();
  loadPhotoStrip();
  loadFacilities();
})();
