const express = require("express");
const { db, parseBooking } = require("../db");
const { requireClient, optionalClient, requireAdmin } = require("../middleware");

const router = express.Router();

function newId() {
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function insertBooking(data) {
  const id = newId();
  const createdAt = new Date().toISOString();
  const eventTypes = JSON.stringify(
    Array.isArray(data.eventTypes) ? data.eventTypes : data.eventTypes ? [data.eventTypes] : []
  );
  db.prepare(
    `INSERT INTO bookings (
      id, created_at, source, package, price, payment, name, email, phone,
      check_in, check_out, guests, notes, event_types, user_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    createdAt,
    data.source || "website",
    data.package || "",
    data.price || "",
    data.payment || "online",
    data.name || "",
    data.email || "",
    data.phone || "",
    data.checkIn || "",
    data.checkOut || "",
    String(data.guests || ""),
    data.notes || "",
    eventTypes,
    data.userId || "",
    data.status || "confirmed"
  );
  return parseBooking(db.prepare("SELECT * FROM bookings WHERE id = ?").get(id));
}

function getLoyaltyTier(points) {
  if (points >= 3000) return { name: "Platinum", discount: "15%" };
  if (points >= 1500) return { name: "Gold", discount: "10%" };
  if (points >= 500) return { name: "Silver", discount: "5%" };
  return { name: "Bronze", discount: "0%" };
}

function awardLoyalty(userId, amount, reason) {
  if (!userId) return;
  const pts = Math.max(50, Math.round((amount || 50) * 0.1));
  const row = db.prepare("SELECT points FROM loyalty WHERE user_id = ?").get(userId);
  if (!row) {
    db.prepare("INSERT INTO loyalty (user_id, points) VALUES (?, ?)").run(userId, pts);
  } else {
    db.prepare("UPDATE loyalty SET points = points + ? WHERE user_id = ?").run(pts, userId);
  }
  db.prepare(
    `INSERT INTO loyalty_history (id, user_id, points, reason, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(`lh-${Date.now()}`, userId, pts, reason, new Date().toISOString());
}

function createInvoice(userId, booking, catalogAmount, payment) {
  const existing = db
    .prepare("SELECT id FROM invoices WHERE booking_id = ? AND user_id = ?")
    .get(booking.id, userId);
  if (existing) return;
  const user = db.prepare("SELECT name FROM users WHERE id = ?").get(userId);
  const amount = catalogAmount || 0;
  db.prepare(
    `INSERT INTO invoices (id, user_id, booking_id, created_at, package, amount, currency, payment, status, guest_name)
     VALUES (?, ?, ?, ?, ?, ?, 'ZAR', ?, ?, ?)`
  ).run(
    `inv-${Date.now()}`,
    userId,
    booking.id,
    new Date().toISOString(),
    booking.package,
    amount,
    payment,
    payment === "cash" ? "pay_on_arrival" : "pending",
    user?.name || booking.name
  );
}

const CATALOG_AMOUNTS = {
  "Standard Night Stay": 750,
  "Shared Unit Stay": 1400,
  "Monthly Rental Package": 8000,
  "3-Day Safari Adventure": 597,
  "7-Day Ultimate Experience": 1323,
};

router.get("/mine", requireClient, (req, res) => {
  try {
    const rows = db.transaction(() => {
      const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.userId);

      if (user?.email) {
        db.prepare(
          `UPDATE bookings SET user_id = ? WHERE (user_id IS NULL OR user_id = '') AND LOWER(email) = LOWER(?)`
        ).run(req.userId, user.email);
      }

      return db
        .prepare(
          `SELECT * FROM bookings
           WHERE user_id = ? OR LOWER(email) = LOWER(?)
           ORDER BY created_at DESC`
        )
        .all(req.userId, user?.email || "");
    })();

    res.json({ bookings: rows.map(parseBooking) });
  } catch (err) {
    console.error("Bookings /mine error:", err);
    const locked = err.code === "SQLITE_BUSY" || /database is locked/i.test(err.message);
    res.status(locked ? 503 : 500).json({
      error: locked ? "Database is busy. Please try again in a moment." : "Could not load bookings.",
    });
  }
});

router.post("/", optionalClient, (req, res) => {
  try {
    const data = { ...(req.body || {}) };
    if (req.userId) {
      data.userId = req.userId;
      const user = db.prepare("SELECT email, name, phone FROM users WHERE id = ?").get(req.userId);
      if (user) {
        data.email = data.email || user.email;
        data.name = data.name || user.name;
        data.phone = data.phone || user.phone;
      }
    }
    const booking = insertBooking(data);
    if (data.userId) {
      const amount = CATALOG_AMOUNTS[data.package] || 50;
      awardLoyalty(data.userId, amount, `Booking: ${booking.package}`);
      createInvoice(data.userId, booking, amount, booking.payment);
    }
    res.status(201).json({ ok: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save booking." });
  }
});

router.get("/", requireAdmin, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM bookings ORDER BY created_at DESC")
    .all();
  res.json({ bookings: rows.map(parseBooking) });
});

router.patch("/:id/cancel", requireClient, (req, res) => {
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.userId);
  const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Booking not found." });
  const owns =
    row.user_id === req.userId ||
    (user?.email && row.email.toLowerCase() === user.email.toLowerCase());
  if (!owns) return res.status(403).json({ error: "Not allowed." });
  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ ok: true, booking: parseBooking(db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id)) });
});

router.delete("/:id", requireAdmin, (req, res) => {
  const result = db.prepare("DELETE FROM bookings WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Booking not found." });
  res.json({ ok: true });
});

router.delete("/", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM bookings").run();
  res.json({ ok: true });
});

module.exports = router;
