/**
 * Gallery page — show photos immediately, then refresh from API.
 */
(function () {
  window.KmmGalleryPage = true;

  const grid = document.getElementById("galleryGrid") || document.querySelector(".gallery__grid");
  const lightbox = document.getElementById("galleryLightbox");
  const lightboxImg = document.getElementById("galleryLightboxImg");
  const lightboxCaption = document.getElementById("galleryLightboxCaption");
  const prevBtn = document.getElementById("galleryPrev");
  const nextBtn = document.getElementById("galleryNext");

  if (!grid) return;

  const FALLBACK_GALLERY =
    typeof KmmImages !== "undefined" && KmmImages.GALLERY_DEFAULTS.length
      ? KmmImages.GALLERY_DEFAULTS
      : [...grid.querySelectorAll(".gallery__trigger img")].map((img) => ({
          url: img.src,
          title: img.alt || "Photo",
        }));

  let slides = [];

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

  function normalizeItems(items) {
    return (items || [])
      .filter((item) => (item.mediaType || "image") !== "video")
      .map((item) => ({
        url: resolveImageUrl(item.url),
        title: item.title || item.category || "Photo",
      }))
      .filter((item) => item.url);
  }

  function layoutClass(index, total) {
    if (index === 0 && total > 3) return "gallery__item--wide";
    if (index === 4 && total > 5) return "gallery__item--tall";
    return "";
  }

  function fallbackForIndex(index) {
    const list = FALLBACK_GALLERY.length ? FALLBACK_GALLERY : [];
    return list[index % list.length]?.url || "";
  }

  function bindImgFallback(img, index) {
    const fallback = fallbackForIndex(index);
    if (!fallback) return;
    img.addEventListener("error", function onErr() {
      img.removeEventListener("error", onErr);
      if (img.src !== fallback) img.src = fallback;
    });
  }

  function renderItems(items) {
    const list = items.length ? items : FALLBACK_GALLERY;
    const display = list.length ? list : FALLBACK_GALLERY;
    if (!display.length) {
      grid.innerHTML =
        '<p class="gallery-empty">Photos could not be loaded. Start the site with <strong>npm start</strong> and open <strong>http://localhost:3000/gallery.html</strong>, or add images in Admin → Gallery.</p>';
      return;
    }

    slides = display;

    grid.innerHTML = display
      .map((item, i) => {
        const extra = layoutClass(i, display.length);
        return `
        <figure class="gallery__item reveal visible${extra ? ` ${extra}` : ""}">
          <button type="button" class="gallery__trigger" data-index="${i}" aria-label="View ${escapeHtml(item.title)}">
            <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" />
          </button>
        </figure>`;
      })
      .join("");

    grid.querySelectorAll("img").forEach((img, i) => bindImgFallback(img, i));
    bindTriggers();
  }

  function readStaticFromDom() {
    return [...grid.querySelectorAll(".gallery__trigger img")]
      .map((img) => ({
        url: resolveImageUrl(img.getAttribute("src") || img.src),
        title: img.alt || "Photo",
      }))
      .filter((item) => item.url);
  }

  function openLightbox(index) {
    if (!lightbox || !slides.length) return;
    let current = index;

    function show() {
      const item = slides[current];
      if (lightboxImg) {
        lightboxImg.src = item.url;
        lightboxImg.alt = item.title || "";
      }
      if (lightboxCaption) lightboxCaption.textContent = item.title || "";
    }

    show();
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    function close() {
      lightbox.hidden = true;
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      document.onkeydown = null;
    }

    lightbox.querySelectorAll("[data-gallery-close]").forEach((el) => {
      el.onclick = close;
    });
    if (prevBtn) {
      prevBtn.onclick = () => {
        current = (current - 1 + slides.length) % slides.length;
        show();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        current = (current + 1) % slides.length;
        show();
      };
    }
    document.onkeydown = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prevBtn?.click();
      if (e.key === "ArrowRight") nextBtn?.click();
    };
  }

  function bindTriggers() {
    grid.querySelectorAll(".gallery__trigger").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openLightbox(Number(btn.dataset.index) || 0);
      });
    });
  }

  async function loadRoomPhotos() {
    if (typeof KmmRooms === "undefined") return [];
    await KmmRooms.ready();
    if (!KmmApi.isAvailable()) return [];
    return KmmRooms.getAll()
      .filter((r) => r.active !== false)
      .map((r) => ({
        url: typeof KmmImages !== "undefined" ? KmmImages.effectiveRoomUrl(r) : resolveImageUrl(r.imageUrl),
        title: r.name,
      }))
      .filter((item) => item.url);
  }

  function mergeUniquePhotos(...lists) {
    const seen = new Set();
    const out = [];
    for (const list of lists) {
      for (const item of list) {
        if (!item?.url || seen.has(item.url)) continue;
        seen.add(item.url);
        out.push(item);
      }
    }
    return out;
  }

  async function loadFromApi() {
    const staticItems = readStaticFromDom();
    renderItems(staticItems.length ? staticItems : FALLBACK_GALLERY);

    if (typeof KmmApi === "undefined") return;
    await KmmApi.init();
    if (!KmmApi.isAvailable()) return;

    try {
      const [galleryRes, roomPhotos] = await Promise.all([
        KmmApi.request("/gallery"),
        loadRoomPhotos(),
      ]);
      const galleryItems = normalizeItems(galleryRes.items);
      const merged = mergeUniquePhotos(galleryItems, roomPhotos, staticItems, FALLBACK_GALLERY);
      renderItems(merged.length ? merged : FALLBACK_GALLERY);
    } catch {
      /* keep static render */
    }
  }

  loadFromApi();
})();