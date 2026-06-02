/**
 * Versioned schema migrations (SQLite + MySQL).
 * Additive only — safe for existing production databases.
 */
const fs = require("fs");
const path = require("path");

const MIGRATIONS = [
  { version: 1, name: "rbac", sqlite: "001_rbac_sqlite.sql", mysql: "001_rbac_mysql.sql" },
  {
    version: 2,
    name: "rooms_media",
    sqlite: "002_rooms_media_sqlite.sql",
    mysql: "002_rooms_media_mysql.sql",
  },
  {
    version: 3,
    name: "payments_reviews",
    sqlite: "003_payments_reviews_sqlite.sql",
    mysql: "003_payments_reviews_mysql.sql",
  },
  {
    version: 4,
    name: "comms_marketing",
    sqlite: "004_comms_marketing_sqlite.sql",
    mysql: "004_comms_marketing_mysql.sql",
  },
  {
    version: 5,
    name: "audit_ops",
    sqlite: "005_audit_ops_sqlite.sql",
    mysql: "005_audit_ops_mysql.sql",
  },
];

function database() {
  return require("./database");
}

async function ensureMigrationsTable() {
  if (database().getDriver() === "mysql") {
    await database().run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INT PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        applied_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } else {
    const sqlite = database().getSyncDb();
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `);
  }
}

async function getAppliedVersions() {
  await ensureMigrationsTable();
  const rows = await database().all("SELECT version FROM schema_migrations ORDER BY version");
  return new Set(rows.map((r) => r.version));
}

function loadSql(filename) {
  const filePath = path.join(__dirname, "..", "migrations", filename);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function splitStatements(sql) {
  return sql
    .split(";")
    .map((s) => s.replace(/^\s*--[^\n]*\n?/gm, "").trim())
    .filter((s) => s.length > 0);
}

async function applySqliteMigration(migration) {
  const sql = loadSql(migration.sqlite);
  if (!sql) return;
  const sqlite = database().getSyncDb();
  for (const statement of splitStatements(sql)) {
    sqlite.exec(statement);
  }
}

async function applyMysqlMigration(migration) {
  const sql = loadSql(migration.mysql);
  if (!sql) return;
  for (const statement of splitStatements(sql)) {
    await database().run(statement);
  }
}

async function ensureColumn(table, column, sqliteDef, mysqlDef) {
  if (database().getDriver() === "mysql") {
    const cols = await database().all(
      `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    if (!cols.some((c) => c.name === column)) {
      await database().run(`ALTER TABLE ${table} ADD COLUMN ${column} ${mysqlDef}`);
    }
    return;
  }
  const sqlite = database().getSyncDb();
  const existing = sqlite.prepare(`PRAGMA table_info(${table})`).all();
  if (!existing.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqliteDef}`);
  }
}

async function ensureUserSecurityColumns() {
  await ensureColumn("users", "email_verified_at", "TEXT", "DATETIME NULL");
  await ensureColumn("users", "password_reset_token", "TEXT", "VARCHAR(255) NULL");
  await ensureColumn("users", "password_reset_expires", "TEXT", "DATETIME NULL");
  await ensureColumn("users", "email_verification_token", "TEXT", "VARCHAR(255) NULL");
  await ensureColumn("users", "email_verification_expires", "TEXT", "DATETIME NULL");
  await ensureColumn("users", "totp_secret", "TEXT", "VARCHAR(255) NULL");
  await ensureColumn("users", "totp_enabled", "INTEGER NOT NULL DEFAULT 0", "TINYINT(1) NOT NULL DEFAULT 0");
  await ensureColumn("users", "deleted_at", "TEXT", "DATETIME NULL");
}

async function ensureRoomExtensionColumns() {
  await ensureColumn("rooms", "room_type_id", "TEXT DEFAULT ''", "VARCHAR(64) DEFAULT ''");
  await ensureColumn("rooms", "deleted_at", "TEXT DEFAULT ''", "DATETIME NULL");
}

async function ensureBookingPricingColumns() {
  const cols = [
    ["subtotal", "REAL NOT NULL DEFAULT 0", "DECIMAL(12,2) NOT NULL DEFAULT 0"],
    ["tax_amount", "REAL NOT NULL DEFAULT 0", "DECIMAL(12,2) NOT NULL DEFAULT 0"],
    ["fee_amount", "REAL NOT NULL DEFAULT 0", "DECIMAL(12,2) NOT NULL DEFAULT 0"],
    ["discount_amount", "REAL NOT NULL DEFAULT 0", "DECIMAL(12,2) NOT NULL DEFAULT 0"],
    ["total_amount", "REAL NOT NULL DEFAULT 0", "DECIMAL(12,2) NOT NULL DEFAULT 0"],
    ["coupon_id", "TEXT DEFAULT ''", "VARCHAR(64) DEFAULT ''"],
    ["checked_in_at", "TEXT DEFAULT ''", "DATETIME NULL"],
    ["checked_out_at", "TEXT DEFAULT ''", "DATETIME NULL"],
  ];
  for (const [name, sqliteDef, mysqlDef] of cols) {
    await ensureColumn("bookings", name, sqliteDef, mysqlDef);
  }
}

async function seedRoles() {
  const roles = [
    { slug: "super_admin", name: "Super Admin", description: "Full system access" },
    { slug: "admin", name: "Admin", description: "Property administration" },
    { slug: "manager", name: "Manager", description: "Operations management" },
    { slug: "receptionist", name: "Receptionist", description: "Front desk operations" },
    { slug: "customer", name: "Customer", description: "Guest account" },
  ];
  const now = new Date().toISOString();
  for (const role of roles) {
    const existing = await database().get("SELECT id FROM roles WHERE slug = ?", [role.slug]);
    if (existing) continue;
    await database().run(
      `INSERT INTO roles (id, slug, name, description, created_at) VALUES (?, ?, ?, ?, ?)`,
      [`role-${role.slug}`, role.slug, role.name, role.description, now]
    );
  }
}

async function seedPermissions() {
  const permissions = [
    { slug: "bookings.read", name: "View bookings", module: "bookings" },
    { slug: "bookings.write", name: "Manage bookings", module: "bookings" },
    { slug: "rooms.read", name: "View rooms", module: "rooms" },
    { slug: "rooms.write", name: "Manage rooms", module: "rooms" },
    { slug: "users.read", name: "View users", module: "users" },
    { slug: "users.write", name: "Manage users", module: "users" },
    { slug: "invoices.read", name: "View invoices", module: "invoices" },
    { slug: "invoices.write", name: "Manage invoices", module: "invoices" },
    { slug: "reviews.moderate", name: "Moderate reviews", module: "reviews" },
    { slug: "reports.read", name: "View reports", module: "reports" },
  ];
  const now = new Date().toISOString();
  const permIds = {};

  for (const perm of permissions) {
    let row = await database().get("SELECT id FROM permissions WHERE slug = ?", [perm.slug]);
    if (!row) {
      const id = `perm-${perm.slug.replace(/\./g, "-")}`;
      await database().run(
        `INSERT INTO permissions (id, slug, name, module, created_at) VALUES (?, ?, ?, ?, ?)`,
        [id, perm.slug, perm.name, perm.module, now]
      );
      permIds[perm.slug] = id;
    } else {
      permIds[perm.slug] = row.id;
    }
  }

  const adminRole = await database().get("SELECT id FROM roles WHERE slug = ?", ["admin"]);
  const superRole = await database().get("SELECT id FROM roles WHERE slug = ?", ["super_admin"]);
  for (const roleId of [adminRole?.id, superRole?.id].filter(Boolean)) {
    for (const permId of Object.values(permIds)) {
      await database().insertOrIgnore("role_permissions", ["role_id", "permission_id"], [
        roleId,
        permId,
      ]);
    }
  }
}

async function seedAmenities() {
  const items = [
    { slug: "wifi", name: "Free Wi-Fi", icon: "wifi" },
    { slug: "parking", name: "Parking", icon: "parking" },
    { slug: "ac", name: "Air Conditioning", icon: "ac" },
    { slug: "tv", name: "TV", icon: "tv" },
    { slug: "kitchen", name: "Kitchenette", icon: "kitchen" },
    { slug: "security", name: "24/7 Security", icon: "security" },
    { slug: "laundry", name: "Laundry", icon: "laundry" },
    { slug: "housekeeping", name: "Housekeeping", icon: "housekeeping" },
  ];
  const now = new Date().toISOString();
  let order = 0;
  for (const item of items) {
    const existing = await database().get("SELECT id FROM amenities WHERE slug = ?", [item.slug]);
    if (existing) continue;
    await database().run(
      `INSERT INTO amenities (id, slug, name, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [`amenity-${item.slug}`, item.slug, item.name, item.icon, order++, now]
    );
  }
}

async function seedRoomTypes() {
  const types = [
    { slug: "standard", name: "Standard Room", description: "Comfortable single/double occupancy" },
    { slug: "shared", name: "Shared Unit", description: "Shared accommodation unit" },
    { slug: "suite", name: "Suite", description: "Premium suite accommodation" },
    { slug: "event", name: "Event Space", description: "Private events and celebrations" },
  ];
  const now = new Date().toISOString();
  let order = 0;
  for (const t of types) {
    const existing = await database().get("SELECT id FROM room_types WHERE slug = ?", [t.slug]);
    if (existing) continue;
    await database().run(
      `INSERT INTO room_types (id, slug, name, description, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [`rtype-${t.slug}`, t.slug, t.name, t.description, order++, now]
    );
  }
}

const { GALLERY_IMAGES, ROOM_IMAGES, isValidImageUrl } = require("./site-images");

async function seedGallery() {
  const countRow = await database().get("SELECT COUNT(*) AS n FROM gallery_items");
  if (Number(countRow?.n) > 0) return;

  const now = new Date().toISOString();
  for (const item of GALLERY_IMAGES) {
    await database().run(
      `INSERT INTO gallery_items (id, category, title, url, media_type, sort_order, active, created_at)
       VALUES (?, ?, ?, ?, 'image', ?, 1, ?)`,
      [database().newId("gal"), item.category, item.title, item.url, item.sortOrder, now]
    );
  }
}

/** Restore missing or broken room and gallery image URLs from defaults. */
async function restoreSiteImages() {
  const db = database();
  for (const [roomId, url] of Object.entries(ROOM_IMAGES)) {
    await db.run(`UPDATE rooms SET image_url = ? WHERE id = ?`, [url, roomId]);
  }

  const galleryRows = await db.all(
    "SELECT id, title, url, sort_order FROM gallery_items WHERE active = 1 ORDER BY sort_order ASC, created_at ASC"
  );
  for (let i = 0; i < galleryRows.length; i += 1) {
    const row = galleryRows[i];
    if (isValidImageUrl(row.url)) continue;
    const fallback = GALLERY_IMAGES[i % GALLERY_IMAGES.length];
    await db.run("UPDATE gallery_items SET url = ?, title = ? WHERE id = ?", [
      fallback.url,
      row.title || fallback.title,
      row.id,
    ]);
  }

  const titles = new Set(
    (await db.all("SELECT title FROM gallery_items WHERE active = 1")).map((r) => r.title)
  );
  const now = new Date().toISOString();
  for (const item of GALLERY_IMAGES) {
    if (titles.has(item.title)) continue;
    await db.run(
      `INSERT INTO gallery_items (id, category, title, url, media_type, sort_order, active, created_at)
       VALUES (?, ?, ?, ?, 'image', ?, 1, ?)`,
      [db.newId("gal"), item.category, item.title, item.url, item.sortOrder, now]
    );
    titles.add(item.title);
  }

  await migrateRoomPrimaryImages();
}

async function seedFacilities() {
  const items = [
    { name: "Reception", description: "24-hour front desk", icon: "reception" },
    { name: "Garden", description: "Outdoor relaxation area", icon: "garden" },
    { name: "Braai Area", description: "Communal braai facilities", icon: "braai" },
    { name: "CCTV", description: "Property-wide security cameras", icon: "cctv" },
  ];
  const now = new Date().toISOString();
  let order = 0;
  for (const item of items) {
    const existing = await database().get("SELECT id FROM facilities WHERE name = ?", [item.name]);
    if (existing) continue;
    await database().run(
      `INSERT INTO facilities (id, name, description, icon, sort_order, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [database().newId("fac"), item.name, item.description, item.icon, order++, now]
    );
  }
}

/** Copy rooms.image_url into room_images when empty (one-time data migration). */
async function migrateRoomPrimaryImages() {
  const rooms = await database().all(
    "SELECT id, image_url FROM rooms WHERE image_url IS NOT NULL AND image_url != ''"
  );
  for (const room of rooms) {
    const hasImage = await database().get("SELECT id FROM room_images WHERE room_id = ? LIMIT 1", [
      room.id,
    ]);
    if (hasImage) continue;
    await database().run(
      `INSERT INTO room_images (id, room_id, url, alt, sort_order, is_primary, created_at)
       VALUES (?, ?, ?, '', 0, 1, ?)`,
      [database().newId("rimg"), room.id, room.image_url, new Date().toISOString()]
    );
  }
}

async function runPostMigrationSeeds() {
  await ensureUserSecurityColumns();
  try {
    await seedRoles();
    await seedPermissions();
  } catch (err) {
    if (!/no such table|doesn't exist/i.test(err.message)) {
      console.warn("RBAC seed:", err.message);
    }
  }
  try {
    await ensureRoomExtensionColumns();
    await seedRoomTypes();
    await seedAmenities();
    await migrateRoomPrimaryImages();
  } catch (err) {
    if (!/no such table|doesn't exist/i.test(err.message)) {
      console.warn("Rooms seed:", err.message);
    }
  }
  try {
    await ensureBookingPricingColumns();
  } catch (err) {
    if (!/no such table|doesn't exist/i.test(err.message)) {
      console.warn("Bookings columns:", err.message);
    }
  }
  try {
    await seedFacilities();
  } catch (err) {
    if (!/no such table|doesn't exist/i.test(err.message)) {
      console.warn("Facilities seed:", err.message);
    }
  }
  try {
    await seedGallery();
    await restoreSiteImages();
  } catch (err) {
    if (!/no such table|doesn't exist/i.test(err.message)) {
      console.warn("Gallery seed:", err.message);
    }
  }
}

async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedVersions();
  const isMysql = database().getDriver() === "mysql";

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    if (isMysql) {
      await applyMysqlMigration(migration);
    } else {
      await applySqliteMigration(migration);
    }
    await database().run(
      "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
      [migration.version, migration.name, new Date().toISOString()]
    );
    console.log(`Migration ${migration.version} (${migration.name}) applied.`);
  }

  await runPostMigrationSeeds();
}

module.exports = { runMigrations };
