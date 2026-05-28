const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const os = require("os");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.KMM_DATA_DIR
  ? path.join(process.env.KMM_DATA_DIR, "kmm.db")
  : path.join(dataDir, "kmm.db");

const appDataDbPath = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
  "kmm-lifestyle",
  "kmm.db"
);

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
    status TEXT DEFAULT 'confirmed'
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
`);

function mergeTable(source, dest, table) {
  const cols = source.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.length) return 0;

  const colNames = cols.map((c) => c.name);
  const rows = source.prepare(`SELECT * FROM ${table}`).all();
  if (!rows.length) return 0;

  const placeholders = colNames.map(() => "?").join(", ");
  const insert = dest.prepare(
    `INSERT OR REPLACE INTO ${table} (${colNames.join(", ")}) VALUES (${placeholders})`
  );

  let count = 0;
  const txn = dest.transaction(() => {
    for (const row of rows) {
      insert.run(...colNames.map((c) => row[c]));
      count++;
    }
  });
  txn();
  return count;
}

function syncFromAppData() {
  if (!fs.existsSync(appDataDbPath)) return;
  if (path.resolve(appDataDbPath) === path.resolve(dbPath)) return;

  try {
    const source = new Database(appDataDbPath, { readonly: true });
    source.pragma("busy_timeout = 5000");

    const tables = [
      "subscriptions",
      "users",
      "bookings",
      "favorites",
      "invoices",
      "loyalty",
      "loyalty_history",
    ];

    let total = 0;
    for (const table of tables) {
      try {
        total += mergeTable(source, db, table);
      } catch {
        /* table may be missing in older databases */
      }
    }

    source.close();
    if (total > 0) {
      console.log(`Synced ${total} record(s) into project database: ${dbPath}`);
    }
  } catch (err) {
    console.warn("AppData sync skipped:", err.message);
  }
}

syncFromAppData();

function parseBooking(row) {
  if (!row) return null;
  let eventTypes = [];
  try {
    eventTypes = JSON.parse(row.event_types || "[]");
  } catch {
    eventTypes = [];
  }
  return {
    id: row.id,
    createdAt: row.created_at,
    source: row.source,
    package: row.package,
    price: row.price,
    payment: row.payment,
    name: row.name,
    email: row.email,
    phone: row.phone,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: row.guests,
    notes: row.notes,
    eventTypes,
    userId: row.user_id,
    status: row.status,
  };
}

function userPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    provider: row.provider || "",
    createdAt: row.created_at,
  };
}

module.exports = { db, parseBooking, userPublic, dbPath };
