const express = require("express");
const path = require("path");
const fs = require("fs");
const database = require("../lib/database");

const router = express.Router();
const siteRoot = path.join(__dirname, "..", "..");

const STATIC_PAGES = [
  "",
  "index.html",
  "about.html",
  "rooms.html",
  "gallery.html",
  "contact.html",
  "reviews.html",
  "subscribe.html",
  "properties.html",
  "tours.html",
  "events.html",
  "dashboard.html",
];

function siteUrl() {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

router.get("/sitemap.xml", async (_req, res) => {
  const base = siteUrl();
  const urls = STATIC_PAGES.filter(Boolean).map((p) => {
    const loc = p ? `${base}/${p}` : `${base}/`;
    return `  <url><loc>${loc}</loc><changefreq>weekly</changefreq></url>`;
  });

  try {
    await database.ensureReady();
    const rooms = await database.all(
      "SELECT id FROM rooms WHERE active = 1 AND (deleted_at IS NULL OR deleted_at = '')"
    );
    for (const room of rooms) {
      urls.push(
        `  <url><loc>${base}/room-detail.html?id=${encodeURIComponent(room.id)}</loc><changefreq>weekly</changefreq></url>`
      );
    }
  } catch {
    /* static pages only */
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
  res.type("application/xml").send(xml);
});

router.get("/robots.txt", (_req, res) => {
  const base = siteUrl();
  res.type("text/plain").send(
    `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`
  );
});

module.exports = router;
