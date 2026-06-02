const database = require("./database");
const { parsePayment } = require("./payments/parse-payment");
const { resolveProviderForBooking, paystack } = require("./payments/index");
const { sendMail } = require("./email");
const { isActiveInvoiceClause, CATALOG_AMOUNTS } = require("./invoices");

const PAYMENT_STATUSES = ["pending", "processing", "completed", "failed", "refunded", "pay_on_arrival"];

function mapBookingPaymentToMethod(bookingPayment) {
  if (bookingPayment === "cash") return { method: "cash", provider: "manual" };
  return { method: "eft", provider: process.env.PAYSTACK_SECRET_KEY ? "paystack" : "manual" };
}

function resolvePaymentAmount(booking) {
  const total = Number(booking?.totalAmount) || 0;
  if (total >= 1) return total;
  const catalog = CATALOG_AMOUNTS[booking?.package] || 0;
  if (catalog >= 1) return catalog;
  return 0;
}

function assertCheckoutAccess(booking, { userId, email } = {}) {
  if (!booking) throw new Error("Booking not found.");
  if (booking.payment === "cash") {
    throw new Error("This booking is set to pay cash on arrival.");
  }

  if (userId) {
    if (booking.userId && booking.userId !== userId) {
      throw new Error("Not allowed.");
    }
    if (!booking.userId) {
      const guestEmail = String(email || "")
        .trim()
        .toLowerCase();
      const bookingEmail = String(booking.email || "")
        .trim()
        .toLowerCase();
      if (!guestEmail || guestEmail !== bookingEmail) {
        throw new Error("Use the same email as on your booking to pay by card.");
      }
    }
    return;
  }

  const guestEmail = String(email || booking.email || "")
    .trim()
    .toLowerCase();
  const bookingEmail = String(booking.email || "")
    .trim()
    .toLowerCase();
  if (!guestEmail || !bookingEmail || guestEmail !== bookingEmail) {
    throw new Error("Enter the email address used for this booking to pay by card.");
  }
}

async function getPaymentById(db, id) {
  const row = await db.get(
    `SELECT p.*, b.booking_reference, b.name AS guest_name, b.package
     FROM payments p
     LEFT JOIN bookings b ON b.id = p.booking_id
     WHERE p.id = ?`,
    [id]
  );
  return parsePayment(row);
}

async function getPaymentsForBooking(db, bookingId) {
  const rows = await db.all(
    `SELECT p.*, b.booking_reference, b.name AS guest_name, b.package
     FROM payments p
     LEFT JOIN bookings b ON b.id = p.booking_id
     WHERE p.booking_id = ?
     ORDER BY p.created_at DESC`,
    [bookingId]
  );
  return rows.map(parsePayment);
}

async function getLatestPaymentForBooking(db, bookingId) {
  const rows = await getPaymentsForBooking(db, bookingId);
  return rows[0] || null;
}

async function syncInvoicePaid(db, bookingId, userId) {
  if (!userId) return;
  await db.run(
    `UPDATE invoices SET status = 'paid' WHERE booking_id = ? AND user_id = ? AND ${isActiveInvoiceClause()}`,
    [bookingId, userId]
  );
}

async function notifyPaymentReceived(booking, payment) {
  if (!booking?.email) return;
  await sendMail({
    to: booking.email,
    subject: `KMM Lifestyle — Payment received (${booking.bookingReference})`,
    text: `Hi ${booking.name},\n\nWe have received your payment of R${payment.amount} for booking ${booking.bookingReference}.\n\nThank you,\nKMM Lifestyle`,
  });
}

/**
 * Create payment record when booking is created.
 */
async function createPaymentForBooking(db, booking) {
  const existing = await db.get(
    "SELECT id FROM payments WHERE booking_id = ? AND status NOT IN ('failed', 'refunded')",
    [booking.id]
  );
  if (existing) return getPaymentById(db, existing.id);

  const amount = resolvePaymentAmount(booking);

  const { method, provider } = mapBookingPaymentToMethod(booking.payment);
  const providerImpl = resolveProviderForBooking(booking);
  const intent = await providerImpl.createIntent({
    booking,
    amount,
    method,
    email: booking.email,
  });

  const now = new Date().toISOString();
  const id = database.newId("pay");
  const status =
    booking.payment === "cash" ? "pay_on_arrival" : intent.status || "pending";

  await db.run(
    `INSERT INTO payments (
      id, booking_id, user_id, amount, currency, method, provider, provider_ref, status, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'ZAR', ?, ?, ?, ?, '{}', ?, ?)`,
    [
      id,
      booking.id,
      booking.userId || "",
      amount,
      method,
      intent.provider || provider,
      intent.providerRef || "",
      status,
      now,
      now,
    ]
  );

  return getPaymentById(db, id);
}

/**
 * Admin confirms EFT / manual payment received.
 */
async function confirmPayment(db, paymentId, { reference, note, adminNote } = {}) {
  const payment = await getPaymentById(db, paymentId);
  if (!payment) return null;
  if (payment.status === "completed") return payment;
  if (payment.status === "refunded") {
    throw new Error("Cannot confirm a refunded payment.");
  }

  const bookingService = require("./booking-service");
  const booking = await bookingService.getBookingById(db, payment.bookingId);
  if (!booking) throw new Error("Booking not found.");

  const now = new Date().toISOString();
  const providerRef = reference || payment.providerRef || `EFT-${payment.bookingId}`;

  await db.run(
    `UPDATE payments SET status = 'completed', provider_ref = ?, updated_at = ?, metadata = ?
     WHERE id = ?`,
    [
      providerRef,
      now,
      JSON.stringify({
        ...(payment.metadata || {}),
        confirmedAt: now,
        adminNote: adminNote || note || "",
      }),
      paymentId,
    ]
  );

  if (booking.userId) {
    await syncInvoicePaid(db, payment.bookingId, booking.userId);
  }

  const updated = await getPaymentById(db, paymentId);
  notifyPaymentReceived(booking, updated).catch((e) =>
    console.warn("Payment email failed:", e.message)
  );

  if (booking.userId) {
    try {
      const { createNotification } = require("./notification-service");
      await createNotification(db, booking.userId, {
        type: "payment",
        title: "Payment received",
        body: `R${updated.amount} for booking ${booking.bookingReference}.`,
      });
    } catch (e) {
      console.warn("Payment notification failed:", e.message);
    }
  }

  return updated;
}

/**
 * Confirm by booking id (admin convenience).
 */
async function confirmPaymentByBooking(db, bookingId, options = {}) {
  const payment = await getLatestPaymentForBooking(db, bookingId);
  if (!payment) {
    const bookingService = require("./booking-service");
    const booking = await bookingService.getBookingById(db, bookingId);
    if (!booking) throw new Error("Booking not found.");
    const created = await createPaymentForBooking(db, booking);
    return confirmPayment(db, created.id, options);
  }
  return confirmPayment(db, payment.id, options);
}

/**
 * Refund payment (manual record — gateway refund is provider-specific).
 */
async function refundPayment(db, paymentId, { reason, amount } = {}) {
  const payment = await getPaymentById(db, paymentId);
  if (!payment) return null;
  if (payment.status !== "completed") {
    throw new Error("Only completed payments can be refunded.");
  }

  const now = new Date().toISOString();
  const refundAmount = amount != null ? Number(amount) : payment.amount;

  await db.run(
    `UPDATE payments SET status = 'refunded', updated_at = ?, metadata = ? WHERE id = ?`,
    [
      now,
      JSON.stringify({
        ...(payment.metadata || {}),
        refundedAt: now,
        refundAmount,
        reason: reason || "",
      }),
      paymentId,
    ]
  );

  return getPaymentById(db, paymentId);
}

/**
 * Initialize online checkout (Paystack when configured).
 */
async function initiateCheckout(db, bookingId, options = {}) {
  const userId = options.userId || "";
  let email = options.email || "";
  if (userId && !email) {
    const user = await db.get("SELECT email FROM users WHERE id = ?", [userId]);
    email = user?.email || "";
  }
  const bookingService = require("./booking-service");
  const booking = await bookingService.getBookingById(db, bookingId);
  assertCheckoutAccess(booking, { userId, email });

  let payment = await getLatestPaymentForBooking(db, bookingId);
  if (!payment || payment.status === "refunded") {
    payment = await createPaymentForBooking(db, booking);
  }

  if (payment.status === "completed") {
    return { payment, alreadyPaid: true };
  }

  const amount = resolvePaymentAmount(booking);
  if (amount < 1) {
    return {
      payment,
      checkoutUrl: null,
      instructions:
        "We could not determine a payment amount for this booking. Please pay by EFT or contact us.",
      bankTransfer: true,
    };
  }

  if (payment.amount < 1) {
    await db.run("UPDATE payments SET amount = ?, updated_at = ? WHERE id = ?", [
      amount,
      new Date().toISOString(),
      payment.id,
    ]);
    payment = await getPaymentById(db, payment.id);
  }

  if (!paystack.isConfigured()) {
    return {
      payment,
      checkoutUrl: null,
      paystackEnabled: false,
      instructions:
        "Card payments are not set up on this server yet. Pay by EFT using the bank details on this page, or ask the site owner to add PAYSTACK_SECRET_KEY in server/.env",
      bankTransfer: true,
    };
  }

  const intent = await paystack.createIntent({
    booking,
    amount,
    email: booking.email,
  });

  await db.run(
    `UPDATE payments SET provider = 'paystack', provider_ref = ?, status = 'processing', updated_at = ? WHERE id = ?`,
    [intent.providerRef, new Date().toISOString(), payment.id]
  );

  return {
    payment: await getPaymentById(db, payment.id),
    checkoutUrl: intent.checkoutUrl,
    instructions: intent.instructions,
    paystackEnabled: true,
  };
}

function getPaymentConfig() {
  return {
    paystackEnabled: paystack.isConfigured(),
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
  };
}

/**
 * Verify Paystack return / webhook reference.
 */
async function verifyPaystackPayment(db, reference) {
  const verified = await paystack.verifyTransaction(reference);
  if (!verified.success) {
    throw new Error("Payment was not successful.");
  }

  const row = await db.get("SELECT * FROM payments WHERE provider_ref = ?", [reference]);
  if (!row) {
    const bookingRow = await db.get("SELECT id FROM bookings WHERE booking_reference = ?", [
      reference,
    ]);
    if (bookingRow) {
      return confirmPaymentByBooking(db, bookingRow.id, { reference });
    }
    throw new Error("Payment record not found.");
  }

  return confirmPayment(db, row.id, { reference });
}

async function listAllPayments(db, { status, limit = 100 } = {}) {
  let sql = `
    SELECT p.*, b.booking_reference, b.name AS guest_name, b.package
    FROM payments p
    LEFT JOIN bookings b ON b.id = p.booking_id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    sql += " AND p.status = ?";
    params.push(status);
  }
  sql += " ORDER BY p.created_at DESC LIMIT ?";
  params.push(Number(limit) || 100);

  const rows = await db.all(sql, params);
  return rows.map(parsePayment);
}

async function listPaymentsForUser(db, userId) {
  const rows = await db.all(
    `SELECT p.*, b.booking_reference, b.name AS guest_name, b.package
     FROM payments p
     INNER JOIN bookings b ON b.id = p.booking_id
     WHERE b.user_id = ? OR p.user_id = ?
     ORDER BY p.created_at DESC`,
    [userId, userId]
  );
  return rows.map(parsePayment);
}

module.exports = {
  PAYMENT_STATUSES,
  parsePayment,
  getPaymentById,
  getPaymentsForBooking,
  getLatestPaymentForBooking,
  createPaymentForBooking,
  confirmPayment,
  confirmPaymentByBooking,
  refundPayment,
  initiateCheckout,
  getPaymentConfig,
  resolvePaymentAmount,
  assertCheckoutAccess,
  verifyPaystackPayment,
  listAllPayments,
  listPaymentsForUser,
};
