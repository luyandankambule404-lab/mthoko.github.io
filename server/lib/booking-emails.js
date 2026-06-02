const { sendMail } = require("./email");
const { parseBooking } = require("../db");

const REMINDER_TYPE = "check_in_reminder";

function siteUrl() {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function confirmationUrl(booking) {
  const ref = encodeURIComponent(booking.bookingReference || booking.id);
  return `${siteUrl()}/confirmation.html?ref=${ref}`;
}

function formatStayDate(value) {
  if (!value) return "—";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(booking, amount) {
  const n = Number(amount) || Number(booking.totalAmount) || 0;
  if (n >= 1) return `R${Math.round(n).toLocaleString("en-ZA")}`;
  return booking.price || "—";
}

function paymentLabel(payment) {
  return payment === "cash" ? "Pay cash on arrival" : "Online (EFT / card)";
}

function newJobId() {
  return `em-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function reminderSendAt(checkIn) {
  if (!checkIn) return null;
  const checkInDate = new Date(`${checkIn}T00:00:00`);
  if (Number.isNaN(checkInDate.getTime())) return null;

  const sendAt = new Date(checkInDate);
  sendAt.setDate(sendAt.getDate() - 1);
  sendAt.setHours(9, 0, 0, 0);

  const now = Date.now();
  if (sendAt.getTime() <= now) {
    const soon = new Date(now + 5 * 60 * 1000);
    return soon.toISOString();
  }
  return sendAt.toISOString();
}

function buildConfirmationText(booking) {
  const ref = booking.bookingReference || booking.id;
  const url = confirmationUrl(booking);
  const payNote =
    booking.payment === "online"
      ? "Complete payment online (card or EFT) from your confirmation page."
      : "Payment is due on arrival (cash).";

  return `Hi ${booking.name || "Guest"},

Thank you for booking with KMM Lifestyle.

Booking reference: ${ref}
Package: ${booking.package || "—"}
Check-in: ${formatStayDate(booking.checkIn)}
Check-out: ${formatStayDate(booking.checkOut)}
Guests: ${booking.guests || "1"}
Payment: ${paymentLabel(booking.payment)}

${payNote}

View your booking: ${url}

Questions? Reply to this email or WhatsApp +27 82 622 6770.

Warm regards,
KMM Lifestyle
Plot 64 Nannescol, Vanderbijlpark`;
}

function buildReceiptText(booking, { amount, paymentReference }) {
  const ref = booking.bookingReference || booking.id;
  return `Hi ${booking.name || "Guest"},

This is your payment receipt for KMM Lifestyle.

Booking reference: ${ref}
Amount paid: ${formatAmount(booking, amount)}
Payment reference: ${paymentReference || ref}
Package: ${booking.package || "—"}
Check-in: ${formatStayDate(booking.checkIn)}
Check-out: ${formatStayDate(booking.checkOut)}

View booking: ${confirmationUrl(booking)}

Thank you for your payment.

KMM Lifestyle`;
}

function buildReminderText(booking) {
  const ref = booking.bookingReference || booking.id;
  return `Hi ${booking.name || "Guest"},

This is a friendly reminder that your stay at KMM Lifestyle is coming up soon.

Booking reference: ${ref}
Check-in: ${formatStayDate(booking.checkIn)}
Check-out: ${formatStayDate(booking.checkOut)}
Package: ${booking.package || "—"}

We look forward to welcoming you. If your plans have changed, please contact us as soon as possible.

WhatsApp: +27 82 622 6770
Email: info@kmmlifestyle.co.za

See you soon,
KMM Lifestyle`;
}

async function sendBookingConfirmationEmail(booking) {
  if (!booking?.email) return { ok: false, skipped: "no_email" };
  return sendMail({
    to: booking.email,
    subject: `Booking confirmed — ${booking.bookingReference || booking.id} | KMM Lifestyle`,
    text: buildConfirmationText(booking),
  });
}

async function sendPaymentReceiptEmail(booking, details = {}) {
  if (!booking?.email) return { ok: false, skipped: "no_email" };
  if (booking.payment !== "online") return { ok: false, skipped: "not_online_payment" };

  return sendMail({
    to: booking.email,
    subject: `Payment receipt — ${booking.bookingReference || booking.id} | KMM Lifestyle`,
    text: buildReceiptText(booking, details),
  });
}

function scheduleCheckInReminder(db, booking) {
  if (!booking?.email || !booking?.checkIn || !booking?.id) return;

  const existing = db
    .prepare(
      `SELECT id FROM email_jobs
       WHERE booking_id = ? AND type = ? AND status IN ('pending', 'sent')`
    )
    .get(booking.id, REMINDER_TYPE);
  if (existing) return;

  const sendAt = reminderSendAt(booking.checkIn);
  if (!sendAt) return;

  db.prepare(
    `INSERT INTO email_jobs (id, booking_id, type, to_email, send_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  ).run(
    newJobId(),
    booking.id,
    REMINDER_TYPE,
    booking.email,
    sendAt,
    new Date().toISOString()
  );
}

async function sendCheckInReminderEmail(booking) {
  if (!booking?.email) return { ok: false, skipped: "no_email" };
  return sendMail({
    to: booking.email,
    subject: `Check-in reminder — ${formatStayDate(booking.checkIn)} | KMM Lifestyle`,
    text: buildReminderText(booking),
  });
}

async function processDueEmailJobs(db) {
  const now = new Date().toISOString();
  const due = db
    .prepare(
      `SELECT * FROM email_jobs
       WHERE status = 'pending' AND send_at <= ?
       ORDER BY send_at ASC
       LIMIT 20`
    )
    .all(now);

  for (const job of due) {
    try {
      const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(job.booking_id);
      if (!row) {
        db.prepare(
          `UPDATE email_jobs SET status = 'cancelled', sent_at = ? WHERE id = ?`
        ).run(now, job.id);
        continue;
      }

      const booking = parseBooking(row);
      if (booking.status === "cancelled") {
        db.prepare(
          `UPDATE email_jobs SET status = 'cancelled', sent_at = ? WHERE id = ?`
        ).run(now, job.id);
        continue;
      }

      if (job.type === REMINDER_TYPE) {
        await sendCheckInReminderEmail(booking);
      }

      db.prepare(
        `UPDATE email_jobs SET status = 'sent', sent_at = ? WHERE id = ?`
      ).run(now, job.id);
    } catch (err) {
      console.warn(`Email job ${job.id} failed:`, err.message);
      db.prepare(
        `UPDATE email_jobs SET status = 'failed', sent_at = ? WHERE id = ?`
      ).run(now, job.id);
    }
  }
}

function handleBookingCreated(db, booking) {
  if (!booking?.email) return;

  sendBookingConfirmationEmail(booking).catch((err) =>
    console.warn("Booking confirmation email failed:", err.message)
  );

  scheduleCheckInReminder(db, booking);
}

function handlePaymentReceived(booking, details = {}) {
  if (!booking?.email || booking.payment !== "online") return;

  sendPaymentReceiptEmail(booking, details).catch((err) =>
    console.warn("Payment receipt email failed:", err.message)
  );
}

module.exports = {
  sendBookingConfirmationEmail,
  sendPaymentReceiptEmail,
  sendCheckInReminderEmail,
  scheduleCheckInReminder,
  processDueEmailJobs,
  handleBookingCreated,
  handlePaymentReceived,
};
