const { db, parseBooking } = require("../db");
const paystack = require("./payments/providers/paystack");
const bookingEmails = require("./booking-emails");

const CATALOG_AMOUNTS = {
  "Standard Night Stay": 750,
  "Shared Unit Stay": 1400,
  "Weekly Stay Package": 5250,
  "Monthly Rental Package": 8000,
  "3-Day Safari Adventure": 597,
  "7-Day Ultimate Experience": 1323,
};

function newPaymentId() {
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parsePayment(row) {
  if (!row) return null;
  let metadata = {};
  try {
    metadata = JSON.parse(row.metadata || "{}");
  } catch {
    metadata = {};
  }
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id || "",
    amount: Number(row.amount || 0),
    currency: row.currency || "ZAR",
    method: row.method || "",
    provider: row.provider || "",
    providerRef: row.provider_ref || "",
    status: row.status || "pending",
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bookingReference: row.booking_reference || "",
    guestName: row.guest_name || "",
    package: row.package || "",
  };
}

function getBookingById(bookingId) {
  const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
  return parseBooking(row);
}

function getBookingByReference(ref) {
  const row = db
    .prepare("SELECT * FROM bookings WHERE id = ? OR booking_reference = ?")
    .get(ref, ref);
  return parseBooking(row);
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

function getPaymentById(id) {
  const row = db
    .prepare(
      `SELECT p.*, b.booking_reference, b.name AS guest_name, b.package
       FROM payments p
       LEFT JOIN bookings b ON b.id = p.booking_id
       WHERE p.id = ?`
    )
    .get(id);
  return parsePayment(row);
}

function getLatestPaymentForBooking(bookingId) {
  const row = db
    .prepare(
      `SELECT p.*, b.booking_reference, b.name AS guest_name, b.package
       FROM payments p
       LEFT JOIN bookings b ON b.id = p.booking_id
       WHERE p.booking_id = ?
       ORDER BY p.created_at DESC
       LIMIT 1`
    )
    .get(bookingId);
  return parsePayment(row);
}

function createPaymentForBooking(booking) {
  const existing = db
    .prepare(
      `SELECT id FROM payments WHERE booking_id = ? AND status NOT IN ('failed', 'refunded')`
    )
    .get(booking.id);
  if (existing) return getPaymentById(existing.id);

  const amount = resolvePaymentAmount(booking);
  const now = new Date().toISOString();
  const id = newPaymentId();
  const status = booking.payment === "cash" ? "pay_on_arrival" : "pending";
  const provider = paystack.isConfigured() ? "paystack" : "manual";

  db.prepare(
    `INSERT INTO payments (
      id, booking_id, user_id, amount, currency, method, provider, provider_ref, status, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'ZAR', ?, ?, '', ?, '{}', ?, ?)`
  ).run(
    id,
    booking.id,
    booking.userId || "",
    amount,
    booking.payment === "cash" ? "cash" : "card",
    provider,
    status,
    now,
    now
  );

  return getPaymentById(id);
}

function markPaymentCompleted(paymentId, { reference, adminNote } = {}) {
  const payment = getPaymentById(paymentId);
  if (!payment) return null;
  if (payment.status === "completed") return payment;

  const booking = getBookingById(payment.bookingId);
  if (!booking) throw new Error("Booking not found.");

  const now = new Date().toISOString();
  const providerRef = reference || payment.providerRef || `PAID-${payment.bookingId}`;

  db.prepare(
    `UPDATE payments SET status = 'completed', provider_ref = ?, updated_at = ?, metadata = ? WHERE id = ?`
  ).run(
    providerRef,
    now,
    JSON.stringify({
      ...(payment.metadata || {}),
      confirmedAt: now,
      adminNote: adminNote || "",
    }),
    paymentId
  );

  if (booking.userId) {
    db.prepare(
      `UPDATE invoices SET status = 'paid' WHERE booking_id = ? AND user_id = ? AND status != 'paid'`
    ).run(booking.id, booking.userId);
  }

  const updated = getPaymentById(paymentId);
  bookingEmails.handlePaymentReceived(booking, {
    amount: updated.amount,
    paymentReference: providerRef,
  });
  return updated;
}

function getPaymentConfig() {
  return {
    paystackEnabled: paystack.isConfigured(),
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
  };
}

function initiateCheckout(bookingId, options = {}) {
  const userId = options.userId || "";
  let email = options.email || "";
  if (userId && !email) {
    const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId);
    email = user?.email || "";
  }

  const booking = getBookingById(bookingId);
  assertCheckoutAccess(booking, { userId, email });

  let payment = getLatestPaymentForBooking(bookingId);
  if (!payment || payment.status === "refunded") {
    payment = createPaymentForBooking(booking);
  }

  if (payment.status === "completed") {
    return { payment, alreadyPaid: true };
  }

  const amount = resolvePaymentAmount(booking);
  if (amount < 1) {
    return {
      payment,
      checkoutUrl: null,
      paystackEnabled: paystack.isConfigured(),
      instructions:
        "We could not determine a payment amount for this booking. Please pay by EFT or contact us.",
      bankTransfer: true,
    };
  }

  if (payment.amount < 1) {
    const now = new Date().toISOString();
    db.prepare("UPDATE payments SET amount = ?, updated_at = ? WHERE id = ?").run(amount, now, payment.id);
    payment = getPaymentById(payment.id);
  }

  if (!paystack.isConfigured()) {
    return {
      payment,
      checkoutUrl: null,
      paystackEnabled: false,
      instructions:
        "Card payments are not set up on this server yet. Add PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY to server/.env (see server/.env.example).",
      bankTransfer: true,
    };
  }

  const intent = paystack.createIntent({
    booking,
    amount,
    email: booking.email,
  });

  return intent.then((intentResult) => {
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE payments SET provider = 'paystack', provider_ref = ?, status = 'processing', updated_at = ? WHERE id = ?`
    ).run(intentResult.providerRef, now, payment.id);

    return {
      payment: getPaymentById(payment.id),
      checkoutUrl: intentResult.checkoutUrl,
      instructions: intentResult.instructions,
      paystackEnabled: true,
    };
  });
}

async function verifyPaystackPayment(reference) {
  const verified = await paystack.verifyTransaction(reference);
  if (!verified.success) {
    throw new Error("Payment was not successful.");
  }

  const row = db.prepare("SELECT * FROM payments WHERE provider_ref = ?").get(reference);
  if (!row) {
    throw new Error("Payment record not found for this reference.");
  }

  return markPaymentCompleted(row.id, { reference });
}

function listAllPayments({ status, limit = 100 } = {}) {
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
  return db.prepare(sql).all(...params).map(parsePayment);
}

function listPaymentsForUser(userId) {
  const rows = db
    .prepare(
      `SELECT p.*, b.booking_reference, b.name AS guest_name, b.package
       FROM payments p
       INNER JOIN bookings b ON b.id = p.booking_id
       WHERE b.user_id = ? OR p.user_id = ?
       ORDER BY p.created_at DESC`
    )
    .all(userId, userId);
  return rows.map(parsePayment);
}

function confirmPayment(paymentId, options = {}) {
  return markPaymentCompleted(paymentId, options);
}

function confirmPaymentByBooking(bookingId, options = {}) {
  let payment = getLatestPaymentForBooking(bookingId);
  if (!payment) {
    const booking = getBookingById(bookingId);
    if (!booking) throw new Error("Booking not found.");
    payment = createPaymentForBooking(booking);
  }
  return markPaymentCompleted(payment.id, options);
}

function refundPayment(paymentId, { reason, amount } = {}) {
  const payment = getPaymentById(paymentId);
  if (!payment) return null;
  if (payment.status !== "completed") {
    throw new Error("Only completed payments can be refunded.");
  }
  const now = new Date().toISOString();
  const refundAmount = amount != null ? Number(amount) : payment.amount;
  db.prepare(`UPDATE payments SET status = 'refunded', updated_at = ?, metadata = ? WHERE id = ?`).run(
    now,
    JSON.stringify({
      ...(payment.metadata || {}),
      refundedAt: now,
      refundAmount,
      reason: reason || "",
    }),
    paymentId
  );
  return getPaymentById(paymentId);
}

module.exports = {
  parsePayment,
  getLatestPaymentForBooking,
  getPaymentConfig,
  initiateCheckout,
  verifyPaystackPayment,
  listAllPayments,
  listPaymentsForUser,
  confirmPayment,
  confirmPaymentByBooking,
  refundPayment,
  resolvePaymentAmount,
  createPaymentForBooking,
};
