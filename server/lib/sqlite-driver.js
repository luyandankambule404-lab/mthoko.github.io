const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { DEFAULT_ROOMS } = require("./room-catalog");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.KMM_DATA_DIR
  ? path.join(process.env.KMM_DATA_DIR, "kmm.db")
  : path.join(dataDir, "kmm.db");

let sqliteDb = null;

function ensureColumn(db, table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function createSqliteDb() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 10000");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT DEFAULT '',
      password_hash TEXT DEFAULT '',
      address TEXT DEFAULT '',
      provider TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      room_type TEXT DEFAULT '',
      price_per_night REAL NOT NULL DEFAULT 0,
      max_guests INTEGER NOT NULL DEFAULT 2,
      total_units INTEGER NOT NULL DEFAULT 1,
      amenities TEXT DEFAULT '[]',
      image_url TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      source TEXT DEFAULT 'website',
      package TEXT DEFAULT '',
      price TEXT DEFAULT '',
      payment TEXT DEFAULT 'online',
      name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      check_in TEXT DEFAULT '',
      check_out TEXT DEFAULT '',
      guests TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      event_types TEXT DEFAULT '[]',
      user_id TEXT DEFAULT '',
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL,
      package_id TEXT NOT NULL,
      PRIMARY KEY (user_id, package_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      booking_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      package TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'ZAR',
      payment TEXT DEFAULT 'online',
      status TEXT DEFAULT 'pending',
      guest_name TEXT DEFAULT '',
      deleted_at TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS loyalty (
      user_id TEXT PRIMARY KEY,
      points INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS loyalty_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      points INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      email TEXT PRIMARY KEY,
      name TEXT DEFAULT '',
      interests TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoice_dismissals (
      user_id TEXT NOT NULL,
      booking_id TEXT NOT NULL,
      PRIMARY KEY (user_id, booking_id)
    );
  `);

  ensureColumn(db, "bookings", "room_id", "TEXT DEFAULT ''");
  ensureColumn(db, "bookings", "booking_reference", "TEXT DEFAULT ''");
  ensureColumn(db, "invoices", "deleted_at", "TEXT DEFAULT ''");

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
    CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings(room_id, check_in, check_out);
  `);

  for (const room of DEFAULT_ROOMS) {
    const existing = db.prepare("SELECT id FROM rooms WHERE id = ?").get(room.id);
    if (!existing) {
      db.prepare(
        `INSERT INTO rooms (
          id, slug, name, description, room_type, price_per_night, max_guests, total_units,
          amenities, image_url, active, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      ).run(
        room.id,
        room.slug,
        room.name,
        room.description,
        room.room_type,
        room.price_per_night,
        room.max_guests,
        room.total_units,
        room.amenities,
        room.image_url || "",
        room.sort_order,
        new Date().toISOString()
      );
    }
  }

  return db;
}

function applyMigrations(db) {
  ensureColumn(db, "bookings", "room_id", "TEXT DEFAULT ''");
  ensureColumn(db, "bookings", "booking_reference", "TEXT DEFAULT ''");
  ensureColumn(db, "invoices", "deleted_at", "TEXT DEFAULT ''");
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_dismissals (
      user_id TEXT NOT NULL,
      booking_id TEXT NOT NULL,
      PRIMARY KEY (user_id, booking_id)
    );
  `);
}

function initSqlite() {
  if (!sqliteDb) sqliteDb = createSqliteDb();
  applyMigrations(sqliteDb);
  return sqliteDb;
}

function all(sql, params = []) {
  return Promise.resolve(sqliteDb.prepare(sql).all(...params));
}

function get(sql, params = []) {
  return Promise.resolve(sqliteDb.prepare(sql).get(...params) || null);
}

function run(sql, params = []) {
  const info = sqliteDb.prepare(sql).run(...params);
  return Promise.resolve({ changes: info.changes, insertId: info.lastInsertRowid });
}

function getSyncDb() {
  return sqliteDb;
}

function getInfo() {
  return { driver: "sqlite", dbPath };
}

module.exports = {
  initSqlite,
  all,
  get,
  run,
  getSyncDb,
  getInfo,
  dbPath,
};
