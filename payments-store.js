/**
 * KMM Lifestyle — payments API client.
 */
const KmmPayments = (function () {
  let _config = null;

  function formatStatus(status) {
    const map = {
      pending: "Awaiting payment",
      processing: "Processing",
      completed: "Paid",
      failed: "Failed",
      refunded: "Refunded",
      pay_on_arrival: "Pay on arrival",
    };
    return map[status] || status || "—";
  }

  function formatAmount(payment) {
    const n = Number(payment?.amount) || 0;
    return `R${Math.round(n).toLocaleString("en-ZA")}`;
  }

  async function getConfig() {
    if (_config) return _config;
    try {
      await KmmApi.init();
      if (!KmmApi.isAvailable()) {
        _config = { paystackEnabled: false, publicKey: "" };
        return _config;
      }
      const data = await KmmApi.request("/payments/config");
      _config = {
        paystackEnabled: Boolean(data.paystackEnabled),
        publicKey: data.publicKey || "",
      };
    } catch {
      _config = { paystackEnabled: false, publicKey: "" };
    }
    return _config;
  }

  async function listMine() {
    const data = await KmmApi.request("/payments/mine", { auth: "client" });
    return data.payments || [];
  }

  async function listAll(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const data = await KmmApi.request(`/payments${q}`, { auth: "admin" });
    return data.payments || [];
  }

  async function confirmPayment(paymentId, body = {}) {
    return KmmApi.request(`/payments/${encodeURIComponent(paymentId)}/confirm`, {
      method: "POST",
      auth: "admin",
      body,
    });
  }

  async function confirmByBooking(bookingId, body = {}) {
    return KmmApi.request(`/payments/booking/${encodeURIComponent(bookingId)}/confirm`, {
      method: "POST",
      auth: "admin",
      body,
    });
  }

  async function refundPayment(paymentId, body = {}) {
    return KmmApi.request(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: "POST",
      auth: "admin",
      body,
    });
  }

  async function initiateCheckout(bookingId, options = {}) {
    const body = {
      bookingId: bookingId || "",
      bookingReference: options.bookingReference || "",
      email: options.email || "",
    };
    const auth = KmmApi.getClientToken() ? "client" : "none";
    return KmmApi.request("/payments/initiate", {
      method: "POST",
      auth,
      body,
    });
  }

  async function verifyReference(reference) {
    return KmmApi.request("/payments/verify", {
      method: "POST",
      body: { reference },
    });
  }

  return {
    formatStatus,
    formatAmount,
    getConfig,
    listMine,
    listAll,
    confirmPayment,
    confirmByBooking,
    refundPayment,
    initiateCheckout,
    verifyReference,
  };
})();
