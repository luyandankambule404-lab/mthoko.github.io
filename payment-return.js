(function () {
  const params = new URLSearchParams(window.location.search);
  const reference = params.get("reference") || params.get("trxref") || params.get("ref") || "";

  const loadingEl = document.getElementById("paymentReturnLoading");
  const successEl = document.getElementById("paymentReturnSuccess");
  const errorEl = document.getElementById("paymentReturnError");
  const errorMsg = document.getElementById("paymentReturnErrorMsg");
  const confirmLink = document.getElementById("paymentReturnConfirmLink");

  async function init() {
    if (!reference) {
      loadingEl.hidden = true;
      errorEl.hidden = false;
      if (errorMsg) errorMsg.textContent = "Missing payment reference. Return from Paystack or open your booking confirmation link.";
      return;
    }

    await KmmApi.init();
    if (!KmmApi.isAvailable()) {
      loadingEl.hidden = true;
      errorEl.hidden = false;
      if (errorMsg) {
        errorMsg.textContent = "Server is offline. If you completed payment, contact us with reference: " + reference;
      }
      return;
    }

    try {
      const data = await KmmPayments.verifyReference(reference);
      const payment = data.payment || data;
      const bookingRef = payment.bookingReference || "";
      loadingEl.hidden = true;
      successEl.hidden = false;
      if (confirmLink) {
        confirmLink.href = bookingRef
          ? `confirmation.html?ref=${encodeURIComponent(bookingRef)}`
          : "rooms.html";
      }
    } catch (err) {
      loadingEl.hidden = true;
      errorEl.hidden = false;
      if (errorMsg) errorMsg.textContent = err.message || "Payment verification failed.";
    }
  }

  init();
})();
