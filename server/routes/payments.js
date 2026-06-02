const express = require("express");
const crypto = require("crypto");
const paymentCore = require("../lib/payments-core");
const { requireClient, optionalClient, requireAdmin } = require("../middleware");

const router = express.Router();

router.get("/config", (_req, res) => {
  res.json({ ok: true, ...paymentCore.getPaymentConfig() });
});

router.post("/initiate", optionalClient, async (req, res) => {
  try {
    const bookingId = String(req.body?.bookingId || "").trim();
    const bookingReference = String(req.body?.bookingReference || "").trim();
    const email = String(req.body?.email || "").trim();

    let id = bookingId;
    if (!id && bookingReference) {
      const { db, parseBooking } = require("../db");
      const row = db
        .prepare("SELECT * FROM bookings WHERE id = ? OR booking_reference = ?")
        .get(bookingReference, bookingReference);
      const booking = parseBooking(row);
      if (!booking) return res.status(404).json({ error: "Booking not found." });
      id = booking.id;
    }
    if (!id) return res.status(400).json({ error: "bookingId or bookingReference is required." });

    const result = await paymentCore.initiateCheckout(id, {
      userId: req.userId,
      email,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("Payment initiate:", err);
    res.status(400).json({ error: err.message || "Could not start checkout." });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const reference = String(req.body?.reference || req.query?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "reference is required." });
    const payment = await paymentCore.verifyPaystackPayment(reference);
    res.json({ ok: true, payment });
  } catch (err) {
    console.error("Payment verify:", err);
    res.status(400).json({ error: err.message || "Payment verification failed." });
  }
});

function paystackWebhookHandler(req, res) {
  (async () => {
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
      await paymentCore.verifyPaystackPayment(event.data.reference);
    }
    res.send("OK");
  })().catch((err) => {
    console.error("Paystack webhook:", err);
    res.status(500).send("Webhook error.");
  });
}

router.get("/mine", requireClient, (req, res) => {
  try {
    const payments = paymentCore.listPaymentsForUser(req.userId);
    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load payments." });
  }
});

router.get("/", requireAdmin, (req, res) => {
  try {
    const payments = paymentCore.listAllPayments({
      status: req.query.status,
      limit: req.query.limit,
    });
    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load payments." });
  }
});

router.post("/:id/confirm", requireAdmin, (req, res) => {
  try {
    const payment = paymentCore.confirmPayment(req.params.id, {
      reference: req.body?.reference,
      adminNote: req.body?.adminNote || req.body?.note,
    });
    if (!payment) return res.status(404).json({ error: "Payment not found." });
    res.json({ ok: true, payment });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

router.post("/booking/:bookingId/confirm", requireAdmin, (req, res) => {
  try {
    const payment = paymentCore.confirmPaymentByBooking(req.params.bookingId, {
      reference: req.body?.reference,
      adminNote: req.body?.note,
    });
    res.json({ ok: true, payment });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

router.post("/:id/refund", requireAdmin, (req, res) => {
  try {
    const payment = paymentCore.refundPayment(req.params.id, {
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
module.exports.paystackWebhookHandler = paystackWebhookHandler;
