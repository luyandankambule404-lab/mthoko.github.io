/** Default property photos from /images/ — used when DB has no gallery rows. */
const GALLERY_IMAGES = [
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
].map((file, sortOrder) => ({
  category: "property",
  title: `KMM Lifestyle — photo ${sortOrder + 1}`,
  url: `/images/${file}`,
  sortOrder,
}));

const ROOM_IMAGES = {
  "standard-night": "/images/IMG-20260527-WA0011.jpg",
  "shared-unit": "/images/IMG-20260527-WA0012.jpg",
  "weekly-stay": "/images/IMG-20260527-WA0015.jpg",
  "monthly-rental": "/images/IMG-20260527-WA0020.jpg",
  "safari-3day": "/images/IMG-20260527-WA0019.jpg",
  "safari-7day": "/images/IMG-20260527-WA0022.jpg",
  "private-event": "/images/IMG-20260527-WA0018.jpg",
};

function isValidImageUrl(url) {
  const u = String(url || "").trim();
  if (!u) return false;
  if (/^https?:\/\//i.test(u)) return true;
  if (u.startsWith("/uploads/")) return true;
  if (/^\/images\//i.test(u) || /^images\//i.test(u)) return true;
  return false;
}

module.exports = { GALLERY_IMAGES, ROOM_IMAGES, isValidImageUrl };
