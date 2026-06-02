const database = require("./database");
const { processUploadedImage } = require("./image-processor");

function parseItem(row) {
  if (!row) return null;
  let url = String(row.url || "").trim();
  if (url.startsWith("/")) {
    const site = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
    url = `${site}${url}`;
  }
  return {
    id: row.id,
    category: row.category || "property",
    title: row.title || "",
    url,
    mediaType: row.media_type || "image",
    sortOrder: Number(row.sort_order) || 0,
    active: row.active === 1 || row.active === true,
    createdAt: row.created_at,
  };
}

async function listGallery(db, { category, activeOnly = true } = {}) {
  let sql = "SELECT * FROM gallery_items WHERE 1=1";
  const params = [];
  if (activeOnly) {
    sql += " AND active = 1";
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  sql += " ORDER BY sort_order ASC, created_at DESC";
  const rows = await db.all(sql, params);
  return rows.map(parseItem);
}

async function listCategories(db) {
  const rows = await db.all(
    `SELECT DISTINCT category FROM gallery_items WHERE active = 1 ORDER BY category`
  );
  return rows.map((r) => r.category).filter(Boolean);
}

async function createItem(db, data) {
  const id = database.newId("gal");
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO gallery_items (id, category, title, url, media_type, sort_order, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      id,
      data.category || "property",
      data.title || "",
      data.url,
      data.mediaType || "image",
      Number(data.sortOrder) || 0,
      now,
    ]
  );
  return (await listGallery(db, { activeOnly: false })).find((i) => i.id === id);
}

async function updateItem(db, id, data) {
  const row = await db.get("SELECT * FROM gallery_items WHERE id = ?", [id]);
  if (!row) return null;
  await db.run(
    `UPDATE gallery_items SET category = ?, title = ?, url = ?, media_type = ?, sort_order = ?, active = ?
     WHERE id = ?`,
    [
      data.category ?? row.category,
      data.title ?? row.title,
      data.url ?? row.url,
      data.mediaType ?? row.media_type,
      data.sortOrder != null ? Number(data.sortOrder) : row.sort_order,
      data.active != null ? (data.active ? 1 : 0) : row.active,
      id,
    ]
  );
  return parseItem(await db.get("SELECT * FROM gallery_items WHERE id = ?", [id]));
}

async function deleteItem(db, id) {
  const result = await db.run("DELETE FROM gallery_items WHERE id = ?", [id]);
  return result.changes > 0;
}

async function attachUploadedImage(db, id, filePath, publicUrl) {
  await processUploadedImage(filePath);
  return updateItem(db, id, { url: publicUrl });
}

module.exports = {
  listGallery,
  listCategories,
  createItem,
  updateItem,
  deleteItem,
  attachUploadedImage,
  parseItem,
};
