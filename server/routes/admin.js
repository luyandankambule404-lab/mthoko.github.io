const express = require("express");
const { signToken, requireAdmin } = require("../middleware");
const { db, parseBooking } = require("../db");
const bookingEmails = require("../lib/booking-emails");

const router = express.Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "kmmadmin2025";

router.post("/login", (req, res) => {
  const password = String(req.body?.password || "").trim();
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid password." });
  }
  const token = signToken({ sub: "admin", role: "admin" }, "24h");
  res.json({ ok: true, token });
});

router.get("/session", (req, res) => {
  const { verifyToken } = require("../middleware");
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  res.json({ ok: !!(payload && payload.role === "admin") });
});

router.get("/invoices", requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT i.*, u.email AS user_email, u.name AS user_name
       FROM invoices i
       LEFT JOIN users u ON u.id = i.user_id
       ORDER BY i.created_at DESC`
    )
    .all();

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
      userEmail: r.user_email || "",
      userName: r.user_name || "",
    })),
  });
});

router.delete("/invoices/:id", requireAdmin, (req, res) => {
  const result = db.prepare("DELETE FROM invoices WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Invoice not found." });
  res.json({ ok: true });
});

router.patch("/invoices/:id", requireAdmin, (req, res) => {
  const status = String(req.body?.status || "").trim();
  if (!["paid", "pending", "pay_on_arrival"].includes(status)) {
    return res.status(400).json({ error: "Invalid invoice status." });
  }
  const result = db.prepare("UPDATE invoices SET status = ? WHERE id = ?").run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Invoice not found." });
  const row = db.prepare("SELECT * FROM invoices WHERE id = ?").get(req.params.id);

  if (status === "paid" && row.payment === "online" && row.booking_id) {
    const bookingRow = db.prepare("SELECT * FROM bookings WHERE id = ?").get(row.booking_id);
    if (bookingRow) {
      bookingEmails.handlePaymentReceived(parseBooking(bookingRow), {
        amount: row.amount,
        paymentReference: row.id,
      });
    }
  }

  res.json({
    ok: true,
    invoice: {
      id: row.id,
      userId: row.user_id,
      bookingId: row.booking_id,
      createdAt: row.created_at,
      package: row.package,
      amount: row.amount,
      currency: row.currency,
      payment: row.payment,
      status: row.status,
      guestName: row.guest_name,
    },
  });
});

router.get("/subscriptions", requireAdmin, (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM subscriptions ORDER BY created_at DESC")
    .all();

  res.json({
    subscriptions: rows.map((r) => ({
      email: r.email,
      name: r.name,
      interests: r.interests
        ? r.interests.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      createdAt: r.created_at,
    })),
  });
});

router.get("/stats", requireAdmin, (_req, res) => {
  const { dbPath } = require("../db");
  const invoiceTotals = db
    .prepare(
      `SELECT
         COALESCE(SUM(amount), 0) AS invoiced,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid,
         COALESCE(SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END), 0) AS outstanding
       FROM invoices`
    )
    .get();
  res.json({
    dbPath,
    counts: {
      bookings: db.prepare("SELECT COUNT(*) AS n FROM bookings").get().n,
      users: db.prepare("SELECT COUNT(*) AS n FROM users").get().n,
      subscriptions: db.prepare("SELECT COUNT(*) AS n FROM subscriptions").get().n,
      invoices: db.prepare("SELECT COUNT(*) AS n FROM invoices").get().n,
    },
    invoiceTotals: {
      invoiced: invoiceTotals.invoiced,
      paid: invoiceTotals.paid,
      outstanding: invoiceTotals.outstanding,
    },
  });
});

router.delete("/subscriptions/:email", requireAdmin, (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const result = db.prepare("DELETE FROM subscriptions WHERE email = ?").run(email);
  if (result.changes === 0) return res.status(404).json({ error: "Subscription not found." });
  res.json({ ok: true });
});

module.exports = router;
