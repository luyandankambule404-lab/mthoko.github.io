const express = require("express");
const crypto = require("crypto");
const database = require("../lib/database");
const paymentService = require("../lib/payment-service");
const bookingService = require("../lib/booking-service");
const { requireClient, optionalClient, requireAdmin } = require("../middleware");

const router = express.Router();

router.get("/mine", requireClient, async (req, res) => {
  try {
    const payments = await paymentService.listPaymentsForUser(database, req.userId);
    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load payments." });
  }
});

router.get("/booking/:bookingId", requireClient, async (req, res) => {
  try {
    const booking = await bookingService.getBookingById(database, req.params.bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (booking.userId && booking.userId !== req.userId) {
      const user = await database.get("SELECT email FROM users WHERE id = ?", [req.userId]);
      if (!user?.email || booking.email?.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(403).json({ error: "Not allowed." });
      }
    }
    const payments = await paymentService.getPaymentsForBooking(database, req.params.bookingId);
    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load payments." });
  }
});

router.get("/config", (_req, res) => {
  res.json({ ok: true, ...paymentService.getPaymentConfig() });
});

router.post("/initiate", optionalClient, async (req, res) => {
  try {
    const bookingId = String(req.body?.bookingId || "").trim();
    const bookingReference = String(req.body?.bookingReference || "").trim();
    const email = String(req.body?.email || "").trim();

    let id = bookingId;
    if (!id && bookingReference) {
      const booking = await bookingService.getBookingByReference(database, bookingReference);
      if (!booking) return res.status(404).json({ error: "Booking not found." });
      id = booking.id;
    }
    if (!id) return res.status(400).json({ error: "bookingId or bookingReference is required." });

    const result = await paymentService.initiateCheckout(database, id, {
      userId: req.userId,
      email,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not start checkout." });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const reference = String(req.body?.reference || req.query?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "reference is required." });
    const payment = await paymentService.verifyPaystackPayment(database, reference);
    res.json({ ok: true, payment });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Payment verification failed." });
  }
});

router.post("/webhook/paystack", async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return res.status(503).send("Paystack not configured.");

    const signature = req.headers["x-paystack-signature"];
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (hash !== signature) {
      return res.status(401).send("Invalid signature.");
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    if (event.event === "charge.success" && event.data?.reference) {
      await paymentService.verifyPaystackPayment(database, event.data.reference);
    }
    res.send("OK");
  } catch (err) {
    console.error("Paystack webhook:", err);
    res.status(500).send("Webhook error.");
  }
});

router.get("/", requireAdmin, async (req, res) => {
  try {
    const payments = await paymentService.listAllPayments(database, {
      status: req.query.status,
      limit: req.query.limit,
    });
    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load payments." });
  }
});

router.post("/:id/confirm", requireAdmin, async (req, res) => {
  try {
    const payment = await paymentService.confirmPayment(database, req.params.id, {
      reference: req.body?.reference,
      note: req.body?.note,
      adminNote: req.body?.adminNote,
    });
    if (!payment) return res.status(404).json({ error: "Payment not found." });
    res.json({ ok: true, payment });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

router.post("/booking/:bookingId/confirm", requireAdmin, async (req, res) => {
  try {
    const payment = await paymentService.confirmPaymentByBooking(database, req.params.bookingId, {
      reference: req.body?.reference,
      note: req.body?.note,
    });
    res.json({ ok: true, payment });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

router.post("/:id/refund", requireAdmin, async (req, res) => {
  try {
    const payment = await paymentService.refundPayment(database, req.params.id, {
      reason: req.body?.reason,
      amount: req.body?.amount,
    });
    if (!payment) return res.status(404).json({ error: "Payment not found." });
    res.json({ ok: true, payment });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not refund payment." });
  }
});

module.exports = router;
