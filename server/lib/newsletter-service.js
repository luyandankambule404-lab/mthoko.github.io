const { sendMail, isConfigured } = require("./email");
const { listActiveDeals } = require("./marketing-service");

function subscriberWantsDeals(interests) {
  const text = String(interests || "").toLowerCase();
  return !text || text.includes("deals") || text.includes("rooms");
}

async function listDealSubscribers(db) {
  const rows = await db.all("SELECT email, name, interests FROM subscriptions ORDER BY created_at DESC");
  return rows.filter((r) => subscriberWantsDeals(r.interests));
}

function buildDealEmail(deal) {
  const subject = `KMM Lifestyle — ${deal.name}`;
  const codeLine = deal.couponCode ? `\nUse code: ${deal.couponCode}` : "";
  const text = [
    `Hi there,`,
    ``,
    `${deal.name} — ${deal.label}`,
    deal.description || "Exclusive offer at KMM Lifestyle.",
    codeLine,
    ``,
    `Book at ${process.env.SITE_URL || "http://localhost:3000"}/rooms.html`,
    ``,
    `KMM Lifestyle · Vanderbijlpark`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hi there,</p>
    <p><strong>${deal.name}</strong> — ${deal.label}</p>
    <p>${deal.description || "Exclusive offer at KMM Lifestyle."}</p>
    ${deal.couponCode ? `<p>Use code: <strong>${deal.couponCode}</strong></p>` : ""}
    <p><a href="${process.env.SITE_URL || "http://localhost:3000"}/rooms.html">Book now</a></p>
    <p>KMM Lifestyle · Vanderbijlpark</p>`;

  return { subject, text, html };
}

/**
 * Email active-deal announcement to newsletter subscribers (deals/rooms interest).
 */
async function broadcastDeals(db, options = {}) {
  if (!isConfigured()) {
    return { sent: 0, failed: 0, skipped: 0, reason: "email_not_configured" };
  }

  const deals = await listActiveDeals(db);
  const deal =
    deals.find((d) => d.id === options.promotionId) || deals[0];
  if (!deal) {
    throw new Error("No active promotion to broadcast.");
  }

  const { subject, text, html } = buildDealEmail(deal);
  const finalSubject = options.subject || subject;

  let recipients;
  if (options.testEmail) {
    recipients = [{ email: String(options.testEmail).trim().toLowerCase(), name: "Test" }];
  } else {
    recipients = await listDealSubscribers(db);
  }

  const result = { sent: 0, failed: 0, skipped: 0, total: recipients.length };
  for (const sub of recipients) {
    try {
      const mail = await sendMail({
        to: sub.email,
        subject: finalSubject,
        text: `Hi ${sub.name || "there"},\n\n${text}`,
        html: `<p>Hi ${sub.name || "there"},</p>${html}`,
      });
      if (mail.sent) result.sent += 1;
      else result.skipped += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}

module.exports = { broadcastDeals, listDealSubscribers, buildDealEmail };
