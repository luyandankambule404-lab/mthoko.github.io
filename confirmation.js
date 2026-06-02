(function () {
  const WHATSAPP = "27826226770";
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref") || params.get("reference") || "";

  const loadingEl = document.getElementById("confirmationLoading");
  const errorEl = document.getElementById("confirmationError");
  const contentEl = document.getElementById("confirmationContent");

  function statusLabel(status) {
    const map = {
      pending: "Pending approval",
      confirmed: "Confirmed",
      checked_in: "Checked in",
      checked_out: "Checked out",
      cancelled: "Cancelled",
      rejected: "Not approved",
    };
    return map[status] || status || "—";
  }

  function formatPayment(payment) {
    return payment === "cash" ? "Pay cash on arrival" : "Online (EFT / card)";
  }

  function formatPaymentStatus(record) {
    if (!record) return "—";
    if (typeof KmmPayments !== "undefined") return KmmPayments.formatStatus(record.status);
    const map = {
      pending: "Awaiting payment",
      processing: "Processing",
      completed: "Paid",
      failed: "Failed",
      refunded: "Refunded",
      pay_on_arrival: "Pay on arrival",
    };
    return map[record.status] || record.status;
  }

  async function startCardPayment(booking, payBtn) {
    payBtn.disabled = true;
    const originalText = payBtn.textContent;
    payBtn.textContent = "Opening secure checkout…";
    try {
      const result = await KmmPayments.initiateCheckout(booking.id, {
        email: booking.email,
        bookingReference: booking.bookingReference,
      });
      if (result.alreadyPaid) {
        alert("This booking is already paid.");
        window.location.reload();
        return;
      }
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      alert(
        result.instructions ||
          "Card checkout is unavailable. Use the EFT bank details on this page or contact us."
      );
    } catch (err) {
      alert(err.message || "Could not start card payment.");
    } finally {
      payBtn.disabled = false;
      payBtn.textContent = originalText;
    }
  }

  async function init() {
    if (!ref) {
      loadingEl.hidden = true;
      errorEl.hidden = false;
      return;
    }

    await KmmApi.init();
    let booking = null;
    try {
      const data = await KmmApi.request(`/bookings/reference/${encodeURIComponent(ref)}`);
      booking = data.booking || null;
    } catch {
      booking = null;
    }

    loadingEl.hidden = true;
    if (!booking) {
      errorEl.hidden = false;
      return;
    }

    contentEl.hidden = false;
    document.getElementById("confirmGuestName").textContent = booking.name || "Guest";
    document.getElementById("confirmReference").textContent = booking.bookingReference || booking.id;
    document.getElementById("confirmStatus").textContent = statusLabel(booking.status);
    document.getElementById("confirmPackage").textContent = booking.roomName || booking.package || "—";
    document.getElementById("confirmCheckIn").textContent = booking.checkIn || "—";
    document.getElementById("confirmCheckOut").textContent = booking.checkOut || "—";
    document.getElementById("confirmGuests").textContent = booking.guests || "—";
    const totalEl = document.getElementById("confirmTotal");
    if (totalEl) {
      totalEl.textContent =
        booking.totalAmount > 0
          ? `R${Math.round(booking.totalAmount).toLocaleString("en-ZA")}`
          : booking.price || "—";
    }
    document.getElementById("confirmPayment").textContent = formatPayment(booking.payment);
    const payStatusEl = document.getElementById("confirmPaymentStatus");
    if (payStatusEl) {
      payStatusEl.textContent = formatPaymentStatus(booking.paymentRecord);
    }
    document.getElementById("confirmEmail").textContent = booking.email || "—";
    document.getElementById("confirmPhone").textContent = booking.phone || "—";

    const intro = document.getElementById("confirmIntro");
    if (booking.status === "confirmed") {
      intro.textContent = "Your booking is confirmed. We look forward to welcoming you.";
    } else if (booking.status === "pending") {
      intro.textContent =
        booking.payment === "online"
          ? "Your booking is pending approval. Pay by card below or use EFT bank details, then send proof on WhatsApp."
          : "Your booking is pending approval. Our team will confirm your reservation shortly.";
    } else {
      intro.textContent = `Your booking status is: ${statusLabel(booking.status)}.`;
    }

    const bankPanel = document.getElementById("confirmBankPanel");
    const payRecord = booking.paymentRecord;
    const isPaid = payRecord?.status === "completed";
    if (
      bankPanel &&
      booking.payment === "online" &&
      !isPaid &&
      typeof KmmBank !== "undefined"
    ) {
      bankPanel.innerHTML = KmmBank.transferDetailsHtml(booking.bookingReference || booking.id);
      bankPanel.hidden = false;
    } else if (bankPanel) {
      bankPanel.hidden = true;
    }

    const payBtn = document.getElementById("confirmPayOnlineBtn");
    if (payBtn && booking.payment === "online" && !isPaid && typeof KmmPayments !== "undefined") {
      const config = await KmmPayments.getConfig();
      payBtn.hidden = false;
      if (!config.paystackEnabled) {
        payBtn.textContent = "Card payments unavailable";
        payBtn.classList.remove("btn--primary");
        payBtn.classList.add("btn--ghost");
        payBtn.addEventListener("click", () => {
          alert(
            "Card payments are not configured on this site yet. Use EFT bank details above, or contact the administrator to set up Paystack (PAYSTACK_SECRET_KEY in server/.env)."
          );
        });
      } else {
        payBtn.textContent = "Pay with card";
        payBtn.addEventListener("click", () => startCardPayment(booking, payBtn));
      }
    }

    const wa = document.getElementById("confirmWhatsApp");
    if (wa) {
      const summary = booking.roomName || booking.package;
      wa.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
        `Hi KMM Lifestyle, booking ref ${booking.bookingReference || booking.id} for ${summary}. I have completed payment / have a question.`
      )}`;
      if (booking.payment === "cash") wa.textContent = "Contact Us on WhatsApp";
    }
  }

  init();
})();
