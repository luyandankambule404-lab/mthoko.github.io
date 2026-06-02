const express = require("express");
const { db, parseBooking } = require("../db");
const { requireClient, optionalClient, requireAdmin } = require("../middleware");
const bookingEmails = require("../lib/booking-emails");
const paymentCore = require("../lib/payments-core");

const router = express.Router();

function newId() {
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newReference() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(2, 12);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `KMM-${stamp}-${rand}`;
}

function insertBooking(data) {
  const id = newId();
  const bookingReference = newReference();
  const createdAt = new Date().toISOString();
  const eventTypes = JSON.stringify(
    Array.isArray(data.eventTypes) ? data.eventTypes : data.eventTypes ? [data.eventTypes] : []
  );
  const totalAmount =
    Number(data.totalAmount) > 0 ? Number(data.totalAmount) : CATALOG_AMOUNTS[data.package] || 0;
  db.prepare(
    `INSERT INTO bookings (
      id, created_at, source, package, price, payment, name, email, phone,
      check_in, check_out, guests, notes, event_types, user_id, status, room_id, booking_reference, total_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    data.status || "confirmed",
    data.roomId || PACKAGE_TO_ROOM_ID[data.package] || "",
    bookingReference,
    totalAmount
  );
  const booking = parseBooking(db.prepare("SELECT * FROM bookings WHERE id = ?").get(id));
  if (booking.payment === "online") {
    try {
      paymentCore.createPaymentForBooking(booking);
    } catch (err) {
      console.warn("Payment record not created:", err.message);
    }
  }
  return booking;
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
  "Weekly Stay Package": 5250,
  "Monthly Rental Package": 8000,
  "3-Day Safari Adventure": 597,
  "7-Day Ultimate Experience": 1323,
};

const PACKAGE_TO_ROOM_ID = {
  "Standard Night Stay": "standard-night",
  "Shared Unit Stay": "shared-unit",
  "Weekly Stay Package": "weekly-stay",
  "Monthly Rental Package": "monthly-rental",
  "3-Day Safari Adventure": "safari-3day",
  "7-Day Ultimate Experience": "safari-7day",
  "Private Event / Celebration": "private-event",
};

const ROOM_PACKAGE_NAMES = Object.entries(PACKAGE_TO_ROOM_ID).reduce((acc, [pkg, id]) => {
  if (!acc[id]) acc[id] = [];
  acc[id].push(pkg);
  return acc;
}, {});

function normalizedDate(value) {
  return String(value || "").trim();
}

function countOverlappingBookings(roomId, checkIn, checkOut) {
  const packageNames = ROOM_PACKAGE_NAMES[roomId] || [];
  const statusClause = `status IN ('pending', 'confirmed', 'checked_in')`;
  const dateClause = `check_in < ? AND check_out > ?`;

  if (!packageNames.length) {
    return db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM bookings WHERE room_id = ? AND ${statusClause} AND ${dateClause}`
      )
      .get(roomId, checkOut, checkIn);
  }

  const placeholders = packageNames.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM bookings
       WHERE ${statusClause} AND ${dateClause}
         AND (room_id = ? OR (COALESCE(room_id, '') = '' AND package IN (${placeholders})))`
    )
    .get(checkOut, checkIn, roomId, ...packageNames);
}

router.get("/availability", (req, res) => {
  try {
    const roomId = String(req.query.roomId || "").trim();
    const checkIn = normalizedDate(req.query.checkIn);
    const checkOut = normalizedDate(req.query.checkOut);
    const guests = Number(req.query.guests || 1);
    const maxGuests = Number(req.query.maxGuests || 99);
    const totalUnits = Math.max(1, Number(req.query.totalUnits || 1));

    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({ error: "roomId, checkIn and checkOut are required." });
    }
    if (checkOut <= checkIn) {
      return res.json({ available: false, reason: "invalid_dates", roomId });
    }
    if (guests > maxGuests) {
      return res.json({ available: false, reason: "too_many_guests", roomId, maxGuests });
    }

    const row = countOverlappingBookings(roomId, checkIn, checkOut);
    const bookedUnits = Number(row?.cnt || 0);
    const availableUnits = Math.max(0, totalUnits - bookedUnits);
    return res.json({
      available: availableUnits > 0,
      reason: availableUnits > 0 ? "ok" : "fully_booked",
      roomId,
      bookedUnits,
      availableUnits,
      totalUnits,
      maxGuests,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not check availability." });
  }
});

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

router.get("/reference/:ref", (req, res) => {
  const ref = String(req.params.ref || "").trim();
  if (!ref) return res.status(400).json({ error: "Reference is required." });
  const row = db
    .prepare("SELECT * FROM bookings WHERE id = ? OR booking_reference = ?")
    .get(ref, ref);
  if (!row) return res.status(404).json({ error: "Booking not found." });
  const booking = parseBooking(row);
  booking.paymentRecord = paymentCore.getLatestPaymentForBooking(booking.id);
  res.json({ booking });
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
    bookingEmails.handleBookingCreated(db, booking);
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

/** Admin marks an online booking as paid — sends payment receipt email. */
router.post("/:id/payment-received", requireAdmin, (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Booking not found." });
    const booking = parseBooking(row);
    if (booking.payment !== "online") {
      return res.status(400).json({ error: "Receipt emails are only sent for online payments." });
    }
    const amount = Number(req.body?.amount) || booking.totalAmount || 0;
    const paymentReference = String(req.body?.reference || booking.bookingReference || booking.id);
    bookingEmails.handlePaymentReceived(booking, { amount, paymentReference });
    if (booking.userId) {
      db.prepare(
        `UPDATE invoices SET status = 'paid' WHERE booking_id = ? AND user_id = ? AND status != 'paid'`
      ).run(booking.id, booking.userId);
    }
    res.json({ ok: true, message: "Payment receipt email queued." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not send payment receipt." });
  }
});

module.exports = router;
