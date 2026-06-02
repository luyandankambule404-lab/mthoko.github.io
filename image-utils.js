/**
 * Image helpers — local /images/ photos and URL resolution.
 */
const KmmImages = (function () {
  const LOCAL_FILES = [
    "IMG-20260527-WA0011.jpg",
    "IMG-20260527-WA0012.jpg",
    "IMG-20260527-WA0013.jpg",
    "IMG-20260527-WA0014.jpg",
    "IMG-20260527-WA0015.jpg",
    "IMG-20260527-WA0016.jpg",
    "IMG-20260527-WA0017.jpg",
    "IMG-20260527-WA0018.jpg",
    "IMG-20260527-WA0019.jpg",
    "IMG-20260527-WA0020.jpg",
    "IMG-20260527-WA0021.jpg",
    "IMG-20260527-WA0022.jpg",
  ];

  function localPath(file) {
    return `images/${file}`;
  }

  function localAt(index) {
    const file = LOCAL_FILES[((index % LOCAL_FILES.length) + LOCAL_FILES.length) % LOCAL_FILES.length];
    return localPath(file);
  }

  const GALLERY_DEFAULTS = LOCAL_FILES.map((file, index) => ({
    url: localPath(file),
    title: `KMM Lifestyle — photo ${index + 1}`,
  }));

  const ROOM_DEFAULTS = {
    "standard-night": localAt(0),
    "shared-unit": localAt(1),
    "weekly-stay": localAt(4),
    "monthly-rental": localAt(9),
    "safari-3day": localAt(8),
    "safari-7day": localAt(11),
    "private-event": localAt(7),
  };

  const HERO_SLIDES = [localAt(0), localAt(4), localAt(8)];

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  function apiOrigin() {
    if (typeof KmmApi === "undefined" || !KmmApi.apiBase) return "";
    const base = KmmApi.apiBase();
    return base ? base.replace(/\/api\/?$/i, "") : "";
  }

  function resolveUrl(url) {
    const u = String(url || "").trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith("//")) return `${window.location.protocol}${u}`;
    if (u.startsWith("/")) {
      const origin = apiOrigin() || window.location.origin;
      const base =
        typeof KmmPaths !== "undefined" ? KmmPaths.getSiteBase().replace(/\/$/, "") : "";
      if (apiOrigin() && u.startsWith("/uploads")) {
        return `${apiOrigin()}${u}`;
      }
      return `${origin}${base}${u}`;
    }
    if (/^uploads\//i.test(u)) {
      const origin = apiOrigin() || window.location.origin;
      return `${origin}/${u.replace(/^\//, "")}`;
    }
    if (/^images\//i.test(u) && typeof KmmPaths !== "undefined") {
      return KmmPaths.assetUrl(u);
    }
    return u;
  }

  function roomDefaultUrl(roomId) {
    return resolveUrl(ROOM_DEFAULTS[roomId] || GALLERY_DEFAULTS[0].url);
  }

  function effectiveRoomUrl(room) {
    const raw = room?.imageUrl || room?.image_url || "";
    return resolveUrl(raw) || roomDefaultUrl(room?.id);
  }

  function webpUrl(url) {
    if (!url || /\.webp(\?|$)/i.test(url)) return null;
    return url.replace(/\.(jpe?g|png)(\?.*)?$/i, ".webp$2");
  }

  function roomImage(url, alt, className = "", opts = {}) {
    const resolved = resolveUrl(url);
    if (!resolved) return "";
    const cls = className ? ` class="${escapeHtml(className)}"` : "";
    const webp = opts.webpUrl || webpUrl(resolved);
    const thumb = opts.thumbUrl || null;
    if (thumb || (webp && webp !== resolved)) {
      const sources = thumb
        ? `<source srcset="${escapeHtml(thumb)}" type="image/webp" media="(max-width: 767px)" />
        <source srcset="${escapeHtml(webp || thumb)}" type="image/webp" />`
        : `<source srcset="${escapeHtml(webp)}" type="image/webp" />`;
      return `<picture>
        ${sources}
        <img src="${escapeHtml(resolved)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"${cls} />
      </picture>`;
    }
    return `<img src="${escapeHtml(resolved)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"${cls} />`;
  }

  function applyHomeHeroSlideshow() {
    if (document.body.dataset.page !== "home") return;
    document.querySelectorAll(".hero .hero__bg").forEach((bg, i) => {
      const src = resolveUrl(HERO_SLIDES[i] || HERO_SLIDES[0]);
      bg.style.setProperty("--bg", `url('${src}')`);
      bg.style.backgroundImage = `url('${src}')`;
      bg.style.backgroundSize = "cover";
      bg.style.backgroundPosition = "center";
    });
  }

  return {
    GALLERY_DEFAULTS,
    ROOM_DEFAULTS,
    HERO_SLIDES,
    LOCAL_FILES,
    localAt,
    escapeHtml,
    resolveUrl,
    roomDefaultUrl,
    effectiveRoomUrl,
    roomImage,
    webpUrl,
    applyHomeHeroSlideshow,
  };
})();
