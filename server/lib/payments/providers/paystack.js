/**
 * Paystack provider (South Africa) — card & bank channels when configured.
 * Set PAYSTACK_SECRET_KEY in server/.env
 */
const PAYSTACK_API = "https://api.paystack.co";

function isConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

async function paystackRequest(path, options = {}) {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!data.status) {
    const err = new Error(data.message || "Paystack request failed.");
    err.code = "PAYSTACK_ERROR";
    throw err;
  }
  return data;
}

async function createIntent({ booking, amount, email }) {
  if (!isConfigured()) {
    return {
      provider: "manual",
      status: "pending",
      providerRef: "",
      checkoutUrl: null,
      instructions: "Online card payments are not configured. Please pay by EFT.",
    };
  }

  const amountKobo = Math.round(amount * 100);
  if (amountKobo < 100) {
    throw new Error("Payment amount too small for card processing.");
  }

  const siteUrl = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const payRef = `${booking.bookingReference}-${Date.now().toString(36)}`;
  const data = await paystackRequest("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: email || booking.email || "guest@kmmlifestyle.co.za",
      amount: amountKobo,
      currency: "ZAR",
      reference: payRef,
      callback_url: `${siteUrl}/payment-return.html?ref=${encodeURIComponent(payRef)}`,
      metadata: {
        booking_id: booking.id,
        booking_reference: booking.bookingReference,
      },
    }),
  });

  return {
    provider: "paystack",
    status: "pending",
    providerRef: data.data.reference,
    checkoutUrl: data.data.authorization_url,
    instructions: "Complete payment securely via Paystack.",
  };
}

async function verifyTransaction(reference) {
  const data = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
  return {
    success: data.data.status === "success",
    amount: data.data.amount / 100,
    reference: data.data.reference,
    metadata: data.data.metadata || {},
  };
}

module.exports = { isConfigured, createIntent, verifyTransaction };
