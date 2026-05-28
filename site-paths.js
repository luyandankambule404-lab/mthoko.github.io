/* Resolve asset URLs for localhost and GitHub Pages project sites */
(function () {
  function getSiteBase() {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "";

    const parts = window.location.pathname.split("/").filter(Boolean);
    if (host.endsWith("github.io") && parts.length && !parts[0].includes(".")) {
      return "/" + parts[0] + "/";
    }
    return "";
  }

  function assetUrl(relativePath) {
    const clean = String(relativePath || "").replace(/^\//, "");
    return getSiteBase() + clean;
  }

  const LOGO_CANDIDATES = ["assets/logo.png", "images/logo.png", "profile.png"];

  function logoUrl() {
    return assetUrl(LOGO_CANDIDATES[0]);
  }

  function logoCandidates() {
    return LOGO_CANDIDATES.map(assetUrl);
  }

  function applyLogo(img) {
    const candidates = logoCandidates();
    let index = 0;
    img.src = candidates[0];
    img.onerror = function () {
      index += 1;
      if (index < candidates.length) {
        this.src = candidates[index];
      } else {
        this.onerror = null;
      }
    };
  }

  function initLogos() {
    document.querySelectorAll("[data-kmm-logo]").forEach(applyLogo);
    const favicon = document.querySelector('link[data-kmm-logo]');
    if (favicon) favicon.href = logoUrl();
  }

  window.KmmPaths = {
    getSiteBase,
    assetUrl,
    logoUrl,
    logoCandidates,
    initLogos,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLogos);
  } else {
    initLogos();
  }
})();
