const express = require("express");
const { db } = require("../db");
const { requireClient } = require("../middleware");

const router = express.Router();

const PACKAGE_CATALOG = [
  { id: "standard-night", name: "Standard Night Stay", price: "R750/night", amount: 750, page: "rooms.html" },
  { id: "shared-unit", name: "Shared Unit Stay", price: "R1400/night", amount: 1400, page: "rooms.html" },
  { id: "weekly", name: "Weekly Stay Package", price: "Pay Weekly", amount: 0, page: "rooms.html" },
  { id: "monthly", name: "Monthly Rental Package", price: "R8000/month", amount: 8000, page: "rooms.html" },
  { id: "safari-3", name: "3-Day Safari Adventure", price: "R199/night", amount: 597, page: "tours.html" },
  { id: "ultimate-7", name: "7-Day Ultimate Experience", price: "R189/night", amount: 1323, page: "tours.html" },
  { id: "private-event", name: "Private Event / Celebration", price: "Custom quote", amount: 0, page: "events.html" },
];

function getLoyaltyTier(points) {
  if (points >= 3000) return { name: "Platinum", discount: "15%" };
  if (points >= 1500) return { name: "Gold", discount: "10%" };
  if (points >= 500) return { name: "Silver", discount: "5%" };
  return { name: "Bronze", discount: "0%" };
}

router.get("/catalog", (_req, res) => {
  res.json({ catalog: PACKAGE_CATALOG });
});

router.get("/favorites", requireClient, (req, res) => {
  const ids = db
    .prepare("SELECT package_id FROM favorites WHERE user_id = ?")
    .all(req.userId)
    .map((r) => r.package_id);
  res.json({
    favorites: PACKAGE_CATALOG.filter((p) => ids.includes(p.id)),
    ids,
  });
});

router.post("/favorites/:packageId", requireClient, (req, res) => {
  const packageId = req.params.packageId;
  const exists = db
    .prepare("SELECT 1 FROM favorites WHERE user_id = ? AND package_id = ?")
    .get(req.userId, packageId);
  if (exists) {
    db.prepare("DELETE FROM favorites WHERE user_id = ? AND package_id = ?").run(
      req.userId,
      packageId
    );
    return res.json({ ok: true, favorited: false });
  }
  db.prepare("INSERT INTO favorites (user_id, package_id) VALUES (?, ?)").run(
    req.userId,
    packageId
  );
  res.json({ ok: true, favorited: true });
});

const CATALOG_AMOUNTS = {
  "Standard Night Stay": 750,
  "Shared Unit Stay": 1400,
  "Monthly Rental Package": 8000,
  "3-Day Safari Adventure": 597,
  "7-Day Ultimate Experience": 1323,
};

function syncInvoicesFromBookings(userId) {
  const user = db.prepare("SELECT name, email FROM users WHERE id = ?").get(userId);
  const bookings = db
    .prepare(
      `SELECT * FROM bookings WHERE user_id = ? OR LOWER(email) = LOWER(?)`
    )
    .all(userId, user?.email || "");

  for (const b of bookings) {
    const exists = db
      .prepare("SELECT id FROM invoices WHERE booking_id = ? AND user_id = ?")
      .get(b.id, userId);
    if (exists) continue;
    const amount = CATALOG_AMOUNTS[b.package] || 0;
    db.prepare(
      `INSERT INTO invoices (id, user_id, booking_id, created_at, package, amount, currency, payment, status, guest_name)
       VALUES (?, ?, ?, ?, ?, ?, 'ZAR', ?, ?, ?)`
    ).run(
      `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      b.id,
      b.created_at,
      b.package,
      amount,
      b.payment,
      b.payment === "cash" ? "pay_on_arrival" : "pending",
      user?.name || b.name
    );
  }
}

router.get("/invoices", requireClient, (req, res) => {
  syncInvoicesFromBookings(req.userId);
  const rows = db
    .prepare("SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.userId);
  res.json({
    invoices: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      bookingId: r.booking_id,
      createdAt: r.created_at,
      package: r.package,
      amount: r.amount,
      currency: r.currency,
      payment: r.payment,
      status: r.status,
      guestName: r.guest_name,
    })),
  });
});

router.get("/loyalty", requireClient, (req, res) => {
  const row = db.prepare("SELECT points FROM loyalty WHERE user_id = ?").get(req.userId);
  const points = row?.points || 0;
  const history = db
    .prepare(
      `SELECT points, reason, created_at AS date FROM loyalty_history
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
    )
    .all(req.userId);
  res.json({
    points,
    tier: getLoyaltyTier(points),
    history,
  });
});

function parseSubscription(row) {
  if (!row) return null;
  return {
    email: row.email,
    name: row.name,
    interests: row.interests
      ? row.interests.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    createdAt: row.created_at,
    subscribed: true,
  };
}

router.get("/subscription", requireClient, (req, res) => {
  const user = db.prepare("SELECT email, name FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });
  const row = db
    .prepare("SELECT * FROM subscriptions WHERE email = ?")
    .get(String(user.email).toLowerCase());
  res.json({
    subscription: parseSubscription(row),
    email: user.email,
    name: user.name,
  });
});

router.post("/subscription", requireClient, (req, res) => {
  const user = db.prepare("SELECT email, name FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  const email = String(user.email).toLowerCase();
  const name = String(req.body?.name || user.name || "").trim();
  const interests = Array.isArray(req.body?.interests)
    ? req.body.interests.join(", ")
    : String(req.body?.interests || "");
  const existing = db.prepare("SELECT email FROM subscriptions WHERE email = ?").get(email);

  if (existing) {
    db.prepare("UPDATE subscriptions SET name = ?, interests = ? WHERE email = ?").run(
      name,
      interests,
      email
    );
  } else {
    db.prepare(
      `INSERT INTO subscriptions (email, name, interests, created_at) VALUES (?, ?, ?, ?)`
    ).run(email, name, interests, new Date().toISOString());
  }

  const row = db.prepare("SELECT * FROM subscriptions WHERE email = ?").get(email);
  res.json({ ok: true, subscription: parseSubscription(row) });
});

router.delete("/subscription", requireClient, (req, res) => {
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });
  db.prepare("DELETE FROM subscriptions WHERE email = ?").run(String(user.email).toLowerCase());
  res.json({ ok: true });
});

module.exports = router;
