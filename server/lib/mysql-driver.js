const mysql = require("mysql2/promise");
const { DEFAULT_ROOMS } = require("./room-catalog");

let pool = null;

async function createPool() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "kmm_lifestyle",
    waitForConnections: true,
    connectionLimit: 10,
    timezone: "Z",
  });
  return pool;
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(64) DEFAULT '',
      password_hash VARCHAR(255) DEFAULT '',
      address TEXT,
      provider VARCHAR(64) DEFAULT '',
      created_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id VARCHAR(64) PRIMARY KEY,
      slug VARCHAR(128) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      room_type VARCHAR(128) DEFAULT '',
      price_per_night DECIMAL(10,2) NOT NULL DEFAULT 0,
      max_guests INT NOT NULL DEFAULT 2,
      total_units INT NOT NULL DEFAULT 1,
      amenities JSON,
      image_url VARCHAR(512) DEFAULT '',
      active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(64) PRIMARY KEY,
      booking_reference VARCHAR(32) UNIQUE,
      created_at DATETIME NOT NULL,
      source VARCHAR(64) DEFAULT 'website',
      package VARCHAR(255) DEFAULT '',
      room_id VARCHAR(64) DEFAULT '',
      price VARCHAR(64) DEFAULT '',
      payment VARCHAR(32) DEFAULT 'online',
      name VARCHAR(255) DEFAULT '',
      email VARCHAR(255) DEFAULT '',
      phone VARCHAR(64) DEFAULT '',
      check_in DATE NULL,
      check_out DATE NULL,
      guests VARCHAR(16) DEFAULT '',
      notes TEXT,
      event_types JSON,
      user_id VARCHAR(64) DEFAULT '',
      status VARCHAR(32) DEFAULT 'pending',
      INDEX idx_bookings_room_dates (room_id, check_in, check_out),
      INDEX idx_bookings_status (status),
      INDEX idx_bookings_reference (booking_reference)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id VARCHAR(64) NOT NULL,
      package_id VARCHAR(64) NOT NULL,
      PRIMARY KEY (user_id, package_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      booking_id VARCHAR(64) NOT NULL,
      created_at DATETIME NOT NULL,
      package VARCHAR(255) DEFAULT '',
      amount DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(8) DEFAULT 'ZAR',
      payment VARCHAR(32) DEFAULT 'online',
      status VARCHAR(32) DEFAULT 'pending',
      guest_name VARCHAR(255) DEFAULT '',
      deleted_at DATETIME NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS loyalty (
      user_id VARCHAR(64) PRIMARY KEY,
      points INT DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS loyalty_history (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      points INT NOT NULL,
      reason VARCHAR(255) DEFAULT '',
      created_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      email VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) DEFAULT '',
      interests TEXT,
      created_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS invoice_dismissals (
      user_id VARCHAR(64) NOT NULL,
      booking_id VARCHAR(64) NOT NULL,
      PRIMARY KEY (user_id, booking_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  for (const room of DEFAULT_ROOMS) {
    await pool.query(
      `INSERT IGNORE INTO rooms (
        id, slug, name, description, room_type, price_per_night, max_guests, total_units,
        amenities, image_url, active, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
      [
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
      ]
    );
  }
}

async function all(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return { changes: result.affectedRows, insertId: result.insertId };
}

function getInfo() {
  return {
    driver: "mysql",
    dbPath: `${process.env.DB_HOST}/${process.env.DB_NAME || "kmm_lifestyle"}`,
  };
}

module.exports = {
  createPool,
  initSchema,
  all,
  get,
  run,
  getInfo,
  getPool: () => pool,
};
