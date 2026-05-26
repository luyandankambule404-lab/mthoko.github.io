/**
 * Fixes profile photo on GitHub Pages (repo: mthoko.github.io).
 * Photo file is at /profile.png — live HTML may still say images/profile.png.
 */
(function () {
  function profilePhotoUrl() {
    if (!location.hostname.endsWith("github.io")) {
      return "images/profile.png";
    }
    const repo = location.pathname.split("/").filter(Boolean)[0];
    if (!repo) return "profile.png";
    return `${location.origin}/${repo}/profile.png`;
  }

  function applyProfilePhoto() {
    const url = profilePhotoUrl();
    document.querySelectorAll("img[src*='profile']").forEach((img) => {
      img.src = url;
      img.removeAttribute("srcset");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyProfilePhoto);
  } else {
    applyProfilePhoto();
  }
})();
