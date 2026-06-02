(function () {
  const header = document.getElementById("header");
  const menuToggle = document.getElementById("menuToggle");
  const nav = document.getElementById("nav");
  const slides = document.querySelectorAll(".hero__slide");
  const dots = document.querySelectorAll(".hero__dot");
  const testimonialTrack = document.getElementById("testimonialTrack");
  const testPrev = document.getElementById("testPrev");
  const testNext = document.getElementById("testNext");
  const contactForm = document.getElementById("contactForm");
  const subscribeForm = document.getElementById("subscribeForm");
  const subscribeSuccess = document.getElementById("subscribeSuccess");
  const subscribeError = document.getElementById("subscribeError");
  const subscribeAgain = document.getElementById("subscribeAgain");
  const footerSubscribe = document.getElementById("footerSubscribe");
  const bookingModal = document.getElementById("bookingModal");
  const bookingForm = document.getElementById("bookingForm");
  const bookingFormWrap = document.getElementById("bookingFormWrap");
  const bookingSuccess = document.getElementById("bookingSuccess");
  const bookingPackageSelect = document.getElementById("bookingPackage");
  const bookingPackageLabel = document.getElementById("bookingPackageLabel");
  const paymentHintOnline = document.getElementById("paymentHintOnline");
  const paymentHintCash = document.getElementById("paymentHintCash");
  const yearEl = document.getElementById("year");

  const SUBSCRIBE_KEY = "kmm_subscribed_emails";
  const WHATSAPP = "27826226770";
  const EVENT_TYPES = [
    "Birthday Party",
    "Anniversary",
    "Bridal Shower",
    "Baby Shower",
    "Graduation",
    "Engagement Party",
    "Corporate Event",
    "Team Building",
    "Family Reunion",
    "Memorial / Tribute",
    "Holiday Celebration",
    "Private Dinner",
  ];
  const PRIVATE_EVENT_PACKAGE = "Private Event / Celebration";
  function bankDetails() {
    return window.KMM_BANK || { accountNumber: "1053189672" };
  }

  function transferDetailsHtml(reference) {
    if (typeof KmmBank !== "undefined") return KmmBank.transferDetailsHtml(reference);
    const b = bankDetails();
    return `<div class="booking-modal__transfer-details"><p><strong>Account Number:</strong> ${b.accountNumber}</p></div>`;
  }

  let slideIndex = 0;
  let slideTimer;

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Header scroll */
  function onScroll() {
    if (header) header.classList.toggle("header--scrolled", window.scrollY > 40);
  }
  if (header) {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Mobile menu */
  menuToggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("nav--open");
    menuToggle.setAttribute("aria-expanded", open);
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("nav--open");
      menuToggle?.setAttribute("aria-expanded", "false");
    });
  });

  /* Hero slider */
  function goToSlide(i) {
    slideIndex = (i + slides.length) % slides.length;
    slides.forEach((s, idx) => {
      s.classList.toggle("hero__slide--active", idx === slideIndex);
    });
    dots.forEach((d, idx) => {
      d.classList.toggle("hero__dot--active", idx === slideIndex);
    });
  }

  function startSlider() {
    clearInterval(slideTimer);
    slideTimer = setInterval(() => goToSlide(slideIndex + 1), 6000);
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      goToSlide(Number(dot.dataset.go));
      startSlider();
    });
  });

  if (slides.length) startSlider();

  /* Testimonials scroll */
  function scrollTestimonials(dir) {
    if (!testimonialTrack) return;
    const card = testimonialTrack.querySelector(".testimonial-card");
    const gap = 24;
    const amount = (card?.offsetWidth || 380) + gap;
    testimonialTrack.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  testPrev?.addEventListener("click", () => scrollTestimonials(-1));
  testNext?.addEventListener("click", () => scrollTestimonials(1));

  /* Subscription helpers */
  function getSubscribedEmails() {
    try {
      return JSON.parse(localStorage.getItem(SUBSCRIBE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  async function saveSubscription(email, name, interests) {
    if (typeof KmmApi !== "undefined" && KmmApi.isAvailable()) {
      const res = await KmmApi.request("/subscribe", {
        method: "POST",
        body: { email, name, interests },
      });
      return !!res.alreadySubscribed;
    }
    const list = getSubscribedEmails();
    const normalized = email.toLowerCase();
    const exists = list.includes(normalized);
    if (!exists) {
      list.push(normalized);
      localStorage.setItem(SUBSCRIBE_KEY, JSON.stringify(list));
    }
    return exists;
  }

  function isAlreadySubscribed(email) {
    return getSubscribedEmails().includes(email.toLowerCase());
  }

  function showSubscribeSuccess() {
    subscribeForm?.setAttribute("hidden", "");
    subscribeSuccess?.removeAttribute("hidden");
    subscribeError?.setAttribute("hidden", "");
  }

  function resetSubscribeForm() {
    subscribeForm?.reset();
    subscribeForm?.removeAttribute("hidden");
    subscribeSuccess?.setAttribute("hidden", "");
    subscribeError?.setAttribute("hidden", "");
    const consent = document.getElementById("subscribeConsent");
    const roomCheck = subscribeForm?.querySelector('input[value="rooms"]');
    const dealsCheck = subscribeForm?.querySelector('input[value="deals"]');
    if (roomCheck) roomCheck.checked = true;
    if (dealsCheck) dealsCheck.checked = true;
    if (consent) consent.checked = false;
  }

  async function handleSubscribe(email, name, interests) {
    if (typeof KmmApi !== "undefined") await KmmApi.init();
    const already = await saveSubscription(email, name, interests);

    if (already) {
      subscribeError.textContent = "This email is already subscribed. Thank you!";
      subscribeError.removeAttribute("hidden");
      showSubscribeSuccess();
      return;
    }

    const interestText = interests.length ? interests.join(", ") : "General updates";
    const body = [
      "New newsletter subscription",
      "",
      name ? `Name: ${name}` : "",
      `Email: ${email}`,
      `Interests: ${interestText}`,
      `Date: ${new Date().toLocaleString("en-ZA")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const subject = encodeURIComponent("KMM Lifestyle — New Subscription");
    const mailBody = encodeURIComponent(body);
    window.location.href = `mailto:info@kmmlifestyle.co.za?subject=${subject}&body=${mailBody}`;

    showSubscribeSuccess();
  }

  subscribeForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    subscribeError?.setAttribute("hidden", "");

    const email = document.getElementById("subscribeEmail").value.trim();
    const name = document.getElementById("subscribeName").value.trim();
    const consent = document.getElementById("subscribeConsent");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      subscribeError.textContent = "Please enter a valid email address.";
      subscribeError.removeAttribute("hidden");
      return;
    }

    if (!consent?.checked) {
      subscribeError.textContent = "Please agree to receive updates before subscribing.";
      subscribeError.removeAttribute("hidden");
      return;
    }

    const interests = [...subscribeForm.querySelectorAll('input[name="interest"]:checked')].map(
      (el) => el.value
    );

    handleSubscribe(email, name, interests);
  });

  subscribeAgain?.addEventListener("click", resetSubscribeForm);

  footerSubscribe?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("footerEmail").value.trim();
    if (!email) return;

    const mainEmail = document.getElementById("subscribeEmail");
    if (mainEmail) mainEmail.value = email;

    window.location.href = "subscribe.html";
  });

  /* Booking — payment & messaging */
  function getPaymentMethod(formEl, radioName) {
    return formEl?.querySelector(`input[name="${radioName}"]:checked`)?.value || "online";
  }

  function formatPaymentLabel(method) {
    return method === "cash" ? "Pay Cash (on arrival)" : "Book Online";
  }

  function buildBookingDetails(data) {
    const lines = [
      "KMM Lifestyle — Booking Request",
      "",
      `Package: ${data.package}`,
      data.price ? `Rate: ${data.price}` : "",
      `Payment: ${formatPaymentLabel(data.payment)}`,
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone}`,
      data.checkIn ? `Check-in: ${data.checkIn}` : "",
      data.checkOut ? `Check-out: ${data.checkOut}` : "",
      data.guests ? `Guests: ${data.guests}` : "",
      data.eventTypes?.length
        ? `Event type(s): ${Array.isArray(data.eventTypes) ? data.eventTypes.join(", ") : data.eventTypes}`
        : "",
      data.notes ? `Notes: ${data.notes}` : "",
      "",
      `Submitted: ${new Date().toLocaleString("en-ZA")}`,
    ];
    return lines.filter(Boolean).join("\n");
  }

  function openWhatsApp(text) {
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  function getLoggedInUser() {
    if (typeof KmmClient === "undefined" || !KmmClient.isLoggedIn()) return null;
    return KmmClient.getCurrentUser();
  }

  function setGuestFieldRequirements(fields, required) {
    fields.forEach((el) => {
      if (!el) return;
      if (required) el.setAttribute("required", "");
      else el.removeAttribute("required");
    });
  }

  function applyGuestFieldsForBooking() {
    const user = getLoggedInUser();
    const hint = document.getElementById("bookingSignedInHint");
    const guestFields = document.getElementById("bookingGuestFields");
    const nameEl = document.getElementById("bookingName");
    const emailEl = document.getElementById("bookingEmail");
    const phoneEl = document.getElementById("bookingPhone");
    const fields = [nameEl, emailEl, phoneEl];

    if (user) {
      if (nameEl) nameEl.value = user.name || "";
      if (emailEl) emailEl.value = user.email || "";
      if (phoneEl) phoneEl.value = user.phone || "";
      document.getElementById("bookingSignedInName").textContent = user.name || "Guest";
      document.getElementById("bookingSignedInEmail").textContent = user.email || "";
      hint?.removeAttribute("hidden");
      guestFields?.setAttribute("hidden", "");
      setGuestFieldRequirements(fields, false);
    } else {
      hint?.setAttribute("hidden", "");
      guestFields?.removeAttribute("hidden");
      setGuestFieldRequirements(fields, true);
    }
  }

  function applyGuestFieldsForContact() {
    if (!contactForm) return;
    const user = getLoggedInUser();
    const hint = document.getElementById("contactSignedInHint");
    const guestFields = document.getElementById("contactGuestFields");
    const nameEl = document.getElementById("name");
    const emailEl = document.getElementById("email");
    const phoneEl = document.getElementById("phone");
    const fields = [nameEl, emailEl, phoneEl];

    if (user) {
      if (nameEl) nameEl.value = user.name || "";
      if (emailEl) emailEl.value = user.email || "";
      if (phoneEl) phoneEl.value = user.phone || "";
      document.getElementById("contactSignedInName").textContent = user.name || "Guest";
      document.getElementById("contactSignedInEmail").textContent = user.email || "";
      hint?.removeAttribute("hidden");
      guestFields?.setAttribute("hidden", "");
      setGuestFieldRequirements(fields, false);
    } else {
      hint?.setAttribute("hidden", "");
      guestFields?.removeAttribute("hidden");
      setGuestFieldRequirements(fields, true);
    }
  }

  function getBookingGuestData() {
    const user = getLoggedInUser();
    if (user) {
      return {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      };
    }
    return {
      name: document.getElementById("bookingName")?.value.trim() || "",
      email: document.getElementById("bookingEmail")?.value.trim() || "",
      phone: document.getElementById("bookingPhone")?.value.trim() || "",
    };
  }

  function getContactGuestData() {
    const user = getLoggedInUser();
    if (user) {
      return {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      };
    }
    return {
      name: document.getElementById("name")?.value.trim() || "",
      email: document.getElementById("email")?.value.trim() || "",
      phone: document.getElementById("phone")?.value.trim() || "",
    };
  }

  function updatePaymentHints(container) {
    const isModal = container === bookingForm;
    const method = getPaymentMethod(
      isModal ? bookingForm : contactForm,
      isModal ? "bookingPayment" : "contactPayment"
    );
    const onlineHint = isModal ? paymentHintOnline : document.getElementById("contactPaymentHintOnline");
    const cashHint = isModal ? paymentHintCash : document.getElementById("contactPaymentHintCash");
    const transferPanel = isModal
      ? document.getElementById("bookingTransferPanel")
      : document.getElementById("contactTransferPanel");

    if (onlineHint) {
      onlineHint.hidden = method !== "online";
      if (method === "online") {
        onlineHint.textContent =
          "After booking, pay by card on your confirmation page, or use EFT bank details below.";
      }
    }
    if (cashHint) cashHint.hidden = method !== "cash";
    if (transferPanel) {
      transferPanel.hidden = method !== "online";
      if (method === "online") {
        transferPanel.innerHTML = transferDetailsHtml("Use your name + check-in date");
      }
    }
  }

  function setMinCheckInDates() {
    const today = new Date().toISOString().split("T")[0];
    ["bookingCheckIn", "checkIn"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.min = today;
    });
  }
  setMinCheckInDates();

  const bookingAvailabilityPanel = document.getElementById("bookingAvailabilityPanel");
  const bookingPriceSummary = document.getElementById("bookingPriceSummary");
  const bookingPriceLines = document.getElementById("bookingPriceLines");
  const bookingPriceTotal = document.getElementById("bookingPriceTotal");
  let availabilityTimer = null;
  let lastBookingPricing = null;

  function getSelectedRoomId(selectEl) {
    const sel = selectEl?.selectedOptions?.[0];
    return sel?.dataset?.roomId || (typeof KmmRooms !== "undefined" ? KmmRooms.getByPackageName(sel?.value || "")?.id : "") || "";
  }

  function getAvailabilityPanel(formKind) {
    return formKind === "modal"
      ? bookingAvailabilityPanel
      : document.getElementById("contactAvailabilityPanel");
  }

  function renderFormAvailability(panel, { status, message, meta = "" }) {
    if (!panel) return;
    const badge = panel.querySelector("[data-availability-badge]");
    const msg = panel.querySelector("[data-availability-message]");
    const metaEl = panel.querySelector("[data-availability-meta]");

    panel.classList.remove(
      "form-availability--ok",
      "form-availability--bad",
      "form-availability--loading",
      "form-availability--idle"
    );
    panel.classList.add(`form-availability--${status}`);

    const badgeText = {
      ok: "Available",
      bad: "Unavailable",
      loading: "Checking…",
      idle: "Live",
    };
    if (badge) badge.textContent = badgeText[status] || "Live";
    if (msg) msg.textContent = message;
    if (metaEl) {
      if (meta) {
        metaEl.textContent = meta;
        metaEl.hidden = false;
      } else {
        metaEl.textContent = "";
        metaEl.hidden = true;
      }
    }
  }

  function renderPriceSummary(pricing) {
    if (!bookingPriceSummary || !pricing || !pricing.breakdown?.length) {
      bookingPriceSummary?.setAttribute("hidden", "");
      lastBookingPricing = null;
      return;
    }
    lastBookingPricing = pricing;
    bookingPriceSummary.removeAttribute("hidden");
    if (bookingPriceLines) {
      bookingPriceLines.innerHTML = pricing.breakdown
        .map((line) => {
          const cls = line.emphasis ? " booking-price-summary__line--total" : "";
          const amt = line.amount < 0 ? `-R${Math.abs(line.amount)}` : `R${Math.round(line.amount)}`;
          return `<li class="booking-price-summary__line${cls}"><span>${line.label}</span><span>${amt}</span></li>`;
        })
        .join("");
    }
    if (bookingPriceTotal) {
      bookingPriceTotal.textContent = `Total: R${Math.round(pricing.totalAmount).toLocaleString("en-ZA")}`;
    }
  }

  async function refreshBookingPrice() {
    if (typeof KmmRooms === "undefined") return;
    const checkIn = document.getElementById("bookingCheckIn")?.value || "";
    const checkOut = document.getElementById("bookingCheckOut")?.value || "";
    const guests = document.getElementById("bookingGuests")?.value || "1";
    const roomId = getSelectedRoomId(bookingPackageSelect);
    const packageName = bookingPackageSelect?.value || "";

    if (!roomId || !checkIn || !checkOut) {
      renderPriceSummary(null);
      return;
    }

    await KmmRooms.ready();
    const couponCode = document.getElementById("bookingCoupon")?.value?.trim() || "";
    const quote = await KmmRooms.getQuote({ roomId, packageName, checkIn, checkOut, guests, couponCode });
    if (quote.coupon && quote.coupon.valid === false) {
      renderPriceSummary(null);
      renderFormAvailability(bookingAvailabilityPanel, {
        status: "bad",
        message: quote.coupon.error || "Invalid coupon code for these dates.",
      });
      return;
    }
    if (quote.pricing) {
      lastBookingPricing = quote.pricing;
      renderPriceSummary(quote.pricing);
    } else renderPriceSummary(null);
  }

  async function refreshAvailabilityHint(formKind) {
    const isModal = formKind === "modal";
    const panel = getAvailabilityPanel(formKind);
    if (!panel) return;

    const packageSelect = isModal ? bookingPackageSelect : contactPackageSelect;
    const checkIn = document.getElementById(isModal ? "bookingCheckIn" : "checkIn")?.value || "";
    const checkOut = document.getElementById(isModal ? "bookingCheckOut" : "checkOut")?.value || "";
    const guests = document.getElementById(isModal ? "bookingGuests" : "contactGuests")?.value || "1";
    const roomId = getSelectedRoomId(packageSelect);
    const packageName = packageSelect?.value || "";

    if (!roomId || packageName === "General Inquiry") {
      renderFormAvailability(panel, {
        status: "idle",
        message: "Select an accommodation package to check live room availability.",
      });
      return;
    }

    if (!checkIn || !checkOut) {
      renderFormAvailability(panel, {
        status: "idle",
        message: "Choose check-in and check-out dates to see live availability.",
      });
      return;
    }

    renderFormAvailability(panel, {
      status: "loading",
      message: "Checking availability for your selected dates…",
    });

    if (typeof KmmRooms === "undefined") {
      renderFormAvailability(panel, {
        status: "idle",
        message: "Start the server (npm start) to enable live availability checks.",
      });
      return;
    }

    await KmmRooms.ready();
    let result;
    try {
      result = await KmmRooms.checkAvailability({ roomId, packageName, checkIn, checkOut, guests });
    } catch (err) {
      renderFormAvailability(panel, {
        status: "idle",
        message: "Live availability is offline. You can still submit your booking request.",
      });
      if (isModal) refreshBookingPrice();
      return;
    }

    const unitsMeta =
      result.totalUnits != null
        ? `${result.availableUnits ?? "—"} of ${result.totalUnits} unit(s) available · max ${result.maxGuests} guests`
        : "";

    const isAvailable = result.available === true || result.reason === "ok";

    if (isAvailable) {
      renderFormAvailability(panel, {
        status: "ok",
        message: "Great news — your selected room is available for these dates.",
        meta: unitsMeta,
      });
    } else if (result.reason === "too_many_guests") {
      renderFormAvailability(panel, {
        status: "bad",
        message: `Guest count is too high for this room (max ${result.maxGuests} guests).`,
        meta: unitsMeta,
      });
    } else if (result.reason === "fully_booked") {
      renderFormAvailability(panel, {
        status: "bad",
        message: "These dates are fully booked. Please choose different dates.",
        meta: unitsMeta,
      });
    } else if (result.reason === "invalid_dates") {
      renderFormAvailability(panel, {
        status: "bad",
        message: "Check-out must be after check-in.",
      });
    } else if (result.reason === "room_not_found") {
      renderFormAvailability(panel, {
        status: "bad",
        message: "This package is not set up for live availability. Choose a room package or contact us.",
      });
    } else if (result.reason === "offline") {
      renderFormAvailability(panel, {
        status: "idle",
        message: "Live availability is offline. You can still submit your booking request.",
      });
    } else {
      renderFormAvailability(panel, {
        status: "idle",
        message: "Availability could not be confirmed right now. Try again in a moment.",
      });
    }

    if (isModal) refreshBookingPrice();
  }

  function scheduleAvailabilityCheck(formKind) {
    clearTimeout(availabilityTimer);
    availabilityTimer = setTimeout(() => refreshAvailabilityHint(formKind), 350);
  }

  ["bookingCheckIn", "bookingCheckOut", "bookingGuests"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => scheduleAvailabilityCheck("modal"));
    document.getElementById(id)?.addEventListener("input", () => scheduleAvailabilityCheck("modal"));
  });
  ["checkIn", "checkOut"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => scheduleAvailabilityCheck("contact"));
    document.getElementById(id)?.addEventListener("input", () => scheduleAvailabilityCheck("contact"));
  });
  bookingPackageSelect?.addEventListener("change", () => scheduleAvailabilityCheck("modal"));

  const bookingEventTypeRow = document.getElementById("bookingEventTypeRow");
  const bookingEventTypeSelect = document.getElementById("bookingEventType");
  const contactEventTypeRow = document.getElementById("contactEventTypeRow");
  const contactEventTypeSelect = document.getElementById("contactEventType");
  const contactPackageSelect = document.getElementById("contactPackage");
  contactPackageSelect?.addEventListener("change", () => scheduleAvailabilityCheck("contact"));

  if (typeof KmmRooms !== "undefined") KmmRooms.ready();
  if (document.getElementById("contactForm")) scheduleAvailabilityCheck("contact");

  let selectedEventName = null;

  function isPrivateEventPackage(packageName) {
    return packageName === PRIVATE_EVENT_PACKAGE;
  }

  function populateEventTypeSelect(selectEl) {
    if (!selectEl || selectEl.options.length > 1) return;
    EVENT_TYPES.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      selectEl.appendChild(opt);
    });
  }

  populateEventTypeSelect(bookingEventTypeSelect);
  populateEventTypeSelect(contactEventTypeSelect);

  function bookingSummaryLabel(packageName, eventType) {
    if (eventType) return `${eventType} (${packageName})`;
    return packageName;
  }

  function updateBookingEventTypeRow(packageName, eventType) {
    if (!bookingEventTypeRow || !bookingEventTypeSelect) return;
    const show = isPrivateEventPackage(packageName);
    bookingEventTypeRow.hidden = !show;
    bookingEventTypeSelect.required = show;
    if (show && eventType) bookingEventTypeSelect.value = eventType;
    else if (!show) bookingEventTypeSelect.value = "";
  }

  function updateContactEventTypeRow() {
    if (!contactEventTypeRow || !contactEventTypeSelect) return;
    const packageName = contactPackageSelect?.value || "";
    const show = isPrivateEventPackage(packageName);
    contactEventTypeRow.hidden = !show;
    contactEventTypeSelect.required = show;
    if (!show) contactEventTypeSelect.value = "";
  }

  function selectEventCard(eventName) {
    selectedEventName = eventName || null;
    document.querySelectorAll(".js-event-card").forEach((card) => {
      const selected = card.dataset.event === eventName;
      card.classList.toggle("event-card--selected", selected);
      card.setAttribute("aria-pressed", selected ? "true" : "false");
    });

    const label = document.getElementById("eventsSelectedLabel");
    const btn = document.getElementById("eventsBookSelectedBtn");
    if (label) {
      label.textContent = selectedEventName
        ? `Selected: ${selectedEventName}. Click below to complete your booking.`
        : "Tap an event above to select it.";
    }
    if (btn) btn.disabled = !selectedEventName;
  }

  function initEventsPage() {
    if (document.body.dataset.page !== "events") return;

    document.querySelectorAll(".js-event-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".js-book-open")) return;
        selectEventCard(card.dataset.event);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (e.target.closest(".js-book-open")) return;
        e.preventDefault();
        selectEventCard(card.dataset.event);
      });
    });

    document.getElementById("eventsBookSelectedBtn")?.addEventListener("click", () => {
      if (!selectedEventName) return;
      openBookingModal(PRIVATE_EVENT_PACKAGE, "Custom quote", selectedEventName);
    });
  }

  function formatRoomPackageLabel(room) {
    if (!room?.name) return "";
    if (!room.pricePerNight) return room.name;
    const suffix = /month/i.test(room.roomType || room.name) ? "/month" : "/night";
    return `${room.name} — R${room.pricePerNight}${suffix}`;
  }

  function ensureBookingRoomOption(roomId, packageName, price) {
    if (!bookingPackageSelect || !roomId) return;
    const room =
      typeof KmmRooms !== "undefined" ? KmmRooms.getById(roomId) : null;
    const name = room?.name || packageName || "";
    if (!name) return;

    let opt = [...bookingPackageSelect.options].find(
      (o) => o.dataset.roomId === roomId || o.value === name
    );
    if (!opt) {
      opt = document.createElement("option");
      opt.value = name;
      opt.dataset.roomId = roomId;
      opt.textContent = price || formatRoomPackageLabel(room) || name;
      bookingPackageSelect.appendChild(opt);
    }
    bookingPackageSelect.value = opt.value;
  }

  function applyStayToBookingForm(stay = {}) {
    const { checkIn, checkOut, guests } = stay;
    const checkInEl = document.getElementById("bookingCheckIn");
    const checkOutEl = document.getElementById("bookingCheckOut");
    const guestsEl = document.getElementById("bookingGuests");
    if (checkIn && checkInEl) checkInEl.value = checkIn;
    if (checkOut && checkOutEl) checkOutEl.value = checkOut;
    if (guests && guestsEl) guestsEl.value = guests;
    if (checkIn || checkOut) {
      bookingPackageSelect?.dispatchEvent(new Event("change"));
      checkInEl?.dispatchEvent(new Event("change"));
    }
  }

  async function openBookingModal(packageName, price, eventType, roomId, stay = {}) {
    if (!bookingModal) return;

    bookingFormWrap?.removeAttribute("hidden");
    bookingSuccess?.setAttribute("hidden", "");
    bookingForm?.reset();

    if (typeof KmmClient !== "undefined") await KmmClient.ready();
    if (typeof KmmRooms !== "undefined") await KmmRooms.ready();

    if (roomId) {
      ensureBookingRoomOption(roomId, packageName, price);
    } else if (packageName && bookingPackageSelect) {
      const options = [...bookingPackageSelect.options];
      const match = options.find(
        (o) =>
          o.value === packageName ||
          o.text.startsWith(packageName) ||
          o.dataset.roomId === packageName
      );
      if (match) bookingPackageSelect.value = match.value;
    }

    applyStayToBookingForm(stay);

    const resolvedPackage = bookingPackageSelect?.value || packageName || "";
    updateBookingEventTypeRow(resolvedPackage, eventType);
    if (eventType) selectEventCard(eventType);

    if (bookingPackageLabel) {
      const selected = bookingPackageSelect?.selectedOptions[0];
      let label = selected?.text || packageName || "";
      if (eventType) label += ` · ${eventType}`;
      if (price) label += ` · ${price}`;
      bookingPackageLabel.textContent = label;
    }

    const onlineRadio = bookingForm?.querySelector('input[value="online"]');
    if (onlineRadio) onlineRadio.checked = true;
    updatePaymentHints(bookingForm);
    applyGuestFieldsForBooking();
    scheduleAvailabilityCheck("modal");

    bookingModal.classList.add("booking-modal--open");
    bookingModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    const focusTarget =
      stay.checkIn && stay.checkOut
        ? document.getElementById(getLoggedInUser() ? "bookingNotes" : "bookingName")
        : getLoggedInUser()
          ? document.getElementById("bookingCheckIn")
          : document.getElementById("bookingName");
    focusTarget?.focus();
  }

  function closeBookingModal() {
    bookingModal?.classList.remove("booking-modal--open");
    bookingModal?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    bookingFormWrap?.removeAttribute("hidden");
    bookingSuccess?.setAttribute("hidden", "");
  }

  function showBookingSuccess(payment, packageName, bookingRef, eventType) {
    bookingFormWrap?.setAttribute("hidden", "");
    bookingSuccess?.removeAttribute("hidden");

    const textEl = document.getElementById("bookingSuccessText");
    const actionsEl = document.getElementById("bookingSuccessActions");
    if (!textEl || !actionsEl) return;

    if (payment === "cash") {
      textEl.textContent =
        "Your cash booking request was sent via WhatsApp. Pay in cash when you arrive — our team will confirm your reservation shortly.";
      const reference = bookingRef || "KMM-BOOKING";
      actionsEl.innerHTML = `
        <a href="confirmation.html?ref=${encodeURIComponent(reference)}" class="btn btn--primary btn--block">View Booking Confirmation</a>
        <a href="https://wa.me/${WHATSAPP}" class="btn btn--whatsapp btn--block" target="_blank" rel="noopener">Open WhatsApp</a>
        <a href="tel:+${WHATSAPP}" class="btn btn--ghost btn--block">Call +27 82 622 6770</a>
      `;
    } else {
      const summary = bookingSummaryLabel(packageName, eventType);
      const reference = bookingRef || "KMM-BOOKING";
      textEl.textContent =
        `Your booking for "${summary}" has been received (ref ${reference}). Complete payment by bank transfer (EFT). Our team will approve your reservation shortly.`;
      actionsEl.innerHTML = `
        ${transferDetailsHtml(reference)}
        <a href="confirmation.html?ref=${encodeURIComponent(reference)}" class="btn btn--primary btn--block">View Booking Confirmation</a>
        <a href="confirmation.html?ref=${encodeURIComponent(reference)}&pay=card" class="btn btn--outline btn--block" id="bookingSuccessPayCard">Pay with card</a>
        <a href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
          `Hi KMM Lifestyle, I have completed EFT payment for ${summary}. Reference: ${reference}.`
        )}" class="btn btn--whatsapp btn--block" target="_blank" rel="noopener">I Have Paid (Send Proof on WhatsApp)</a>
        <a href="dashboard.html" class="btn btn--ghost btn--block">View My Account</a>
      `;
    }
  }

  async function persistBooking(data, source) {
    if (typeof KmmBookings === "undefined") return;
    await KmmBookings.ready();
    if (typeof KmmClient !== "undefined") await KmmClient.ready();
    if (typeof KmmApi !== "undefined" && !KmmApi.isAvailable()) {
      throw new Error(
        "Booking server is not running. In VS Code terminal run: npm start — then open http://localhost:3000"
      );
    }
    const payload = { ...data, source: source || "booking-modal" };
    if (typeof KmmClient !== "undefined" && KmmClient.isLoggedIn()) {
      const user = KmmClient.getCurrentUser();
      payload.userId = user.id;
      payload.email = user.email;
      payload.name = payload.name || user.name;
      payload.phone = payload.phone || user.phone;
    }
    return KmmBookings.saveBooking(payload);
  }

  async function submitBooking(data, source) {
    let savedBooking;
    try {
      savedBooking = await persistBooking(data, source);
    } catch (err) {
      alert(err.message || "Could not save your booking. Please try again.");
      return;
    }

    if (data.payment === "cash") {
      const body = buildBookingDetails(data);
      openWhatsApp(
        `Hi KMM Lifestyle, I'd like to book "${data.package}" and pay CASH on arrival.\n\n${body}`
      );
    }

    showBookingSuccess(
      data.payment,
      data.package,
      savedBooking?.bookingReference || savedBooking?.id,
      data.eventTypes?.[0] || ""
    );
  }

  document.addEventListener("click", (e) => {
    const selectBtn = e.target.closest(".js-book-select");
    if (selectBtn) {
      e.preventDefault();
      if (typeof KmmBookingFlow !== "undefined") {
        KmmBookingFlow.openRoomBooking({
          roomId: selectBtn.dataset.roomId,
          package: selectBtn.dataset.package,
          checkIn: selectBtn.dataset.checkIn,
          checkOut: selectBtn.dataset.checkOut,
          guests: selectBtn.dataset.guests,
        });
      }
      return;
    }

    const btn = e.target.closest(".js-book-open");
    if (!btn) return;
    e.preventDefault();
    if (btn.dataset.event) selectEventCard(btn.dataset.event);

    const roomId = btn.dataset.roomId || "";
    if (roomId && typeof KmmBookingFlow !== "undefined") {
      const stay = KmmBookingFlow.readStayFromPage();
      KmmBookingFlow.openRoomBooking({
        roomId,
        package: btn.dataset.package,
        price: btn.dataset.price,
        event: btn.dataset.event,
        checkIn: btn.dataset.checkIn || stay.checkIn,
        checkOut: btn.dataset.checkOut || stay.checkOut,
        guests: btn.dataset.guests || stay.guests,
      });
      return;
    }

    const stay =
      typeof KmmBookingFlow !== "undefined" ? KmmBookingFlow.readStayFromPage() : {};
    openBookingModal(
      btn.dataset.package,
      btn.dataset.price,
      btn.dataset.event,
      roomId,
      stay
    );
  });

  initEventsPage();

  bookingModal?.querySelectorAll("[data-book-close]").forEach((el) => {
    el.addEventListener("click", closeBookingModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && bookingModal?.classList.contains("booking-modal--open")) {
      closeBookingModal();
    }
  });

  bookingForm?.querySelectorAll('input[name="bookingPayment"]').forEach((radio) => {
    radio.addEventListener("change", () => updatePaymentHints(bookingForm));
  });
  if (bookingForm) updatePaymentHints(bookingForm);

  contactForm?.querySelectorAll('input[name="contactPayment"]').forEach((radio) => {
    radio.addEventListener("change", () => updatePaymentHints(contactForm));
  });
  if (contactForm) updatePaymentHints(contactForm);

  document.getElementById("bookingCoupon")?.addEventListener("change", () => refreshBookingPrice());

  bookingPackageSelect?.addEventListener("change", () => {
    updateBookingEventTypeRow(bookingPackageSelect.value);
    scheduleAvailabilityCheck("modal");
    if (bookingPackageLabel) {
      const selected = bookingPackageSelect.selectedOptions[0];
      let label = selected?.text || "";
      const eventType = bookingEventTypeSelect?.value;
      if (eventType) label += ` · ${eventType}`;
      bookingPackageLabel.textContent = label;
    }
  });

  bookingEventTypeSelect?.addEventListener("change", () => {
    if (bookingPackageLabel && bookingPackageSelect) {
      let label = bookingPackageSelect.selectedOptions[0]?.text || "";
      const eventType = bookingEventTypeSelect.value;
      if (eventType) label += ` · ${eventType}`;
      bookingPackageLabel.textContent = label;
    }
    if (bookingEventTypeSelect?.value) selectEventCard(bookingEventTypeSelect.value);
  });

  contactPackageSelect?.addEventListener("change", () => {
    updateContactEventTypeRow();
    scheduleAvailabilityCheck("contact");
  });
  if (contactForm) updateContactEventTypeRow();

  bookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const packageName = bookingPackageSelect?.value || "";
    const eventType = bookingEventTypeSelect?.value || "";
    const guest = getBookingGuestData();

    if (isPrivateEventPackage(packageName) && !eventType) {
      alert("Please select the event type you are booking.");
      bookingEventTypeSelect?.focus();
      return;
    }

    const data = {
      package: packageName,
      roomId: getSelectedRoomId(bookingPackageSelect),
      price: lastBookingPricing?.priceLabel || bookingPackageLabel?.textContent?.split("·")[1]?.trim() || "",
      totalAmount: lastBookingPricing?.totalAmount,
      payment: getPaymentMethod(bookingForm, "bookingPayment"),
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      checkIn: document.getElementById("bookingCheckIn").value,
      checkOut: document.getElementById("bookingCheckOut").value,
      guests: document.getElementById("bookingGuests").value,
      notes: document.getElementById("bookingNotes").value.trim(),
      eventTypes: eventType ? [eventType] : [],
      couponCode: document.getElementById("bookingCoupon")?.value?.trim() || "",
    };

    if (!data.name || !data.email || !data.phone || !data.checkIn || !data.checkOut) {
      if (!data.checkOut) alert("Please select a check-out date.");
      return;
    }

    if (data.roomId && typeof KmmRooms !== "undefined") {
      await KmmRooms.ready();
      const availability = await KmmRooms.checkAvailability({
        roomId: data.roomId,
        packageName: data.package,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
      });
      if (!availability.available && availability.reason !== "offline") {
        alert(availability.reason === "too_many_guests"
          ? `This room allows a maximum of ${availability.maxGuests} guests.`
          : "Selected dates are not available. Please choose different dates.");
        return;
      }
    }

    await submitBooking(data, "booking-modal");
  });

  /* Contact form booking */
  contactForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payment = getPaymentMethod(contactForm, "contactPayment");
    const packageName = contactPackageSelect?.value || "";
    const eventType = contactEventTypeSelect?.value || "";

    if (isPrivateEventPackage(packageName) && !eventType) {
      alert("Please select the event type you are booking.");
      contactEventTypeSelect?.focus();
      return;
    }

    const data = {
      package: packageName,
      roomId: getSelectedRoomId(contactPackageSelect),
      payment,
      ...getContactGuestData(),
      checkIn: document.getElementById("checkIn").value,
      checkOut: document.getElementById("checkOut").value,
      guests: document.getElementById("contactGuests")?.value || "1",
      notes: document.getElementById("message").value.trim(),
      eventTypes: eventType ? [eventType] : [],
    };

    if (data.roomId && typeof KmmRooms !== "undefined") {
      await KmmRooms.ready();
      const availability = await KmmRooms.checkAvailability({
        roomId: data.roomId,
        packageName: data.package,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
      });
      if (!availability.available && availability.reason !== "offline") {
        alert(
          availability.reason === "too_many_guests"
            ? `This room allows a maximum of ${availability.maxGuests} guests.`
            : "Selected dates are not available. Please choose different dates."
        );
        return;
      }
    }

    try {
      await persistBooking(data, "contact-form");
    } catch (err) {
      alert(err.message || "Could not save your booking. Please try again.");
      return;
    }

    if (payment === "cash") {
      const body = buildBookingDetails(data);
      openWhatsApp(`Hi KMM Lifestyle, I'd like to book and pay CASH on arrival.\n\n${body}`);
    }

    const btn = document.getElementById("contactSubmitBtn");
    const originalText = btn?.textContent;
    if (btn) {
      btn.textContent = payment === "cash" ? "Booking saved · WhatsApp opened ✓" : "Booking saved ✓";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 4000);
    }

    if (payment === "online") {
      const b = bankDetails();
      alert(
        `Booking saved. Pay by EFT: ${b.accountHolder}, ${b.bankName}, account ${b.accountNumber}, branch ${b.branchCode}. Use your booking reference as payment reference.`
      );
    }
  });

  /* Scroll reveal */
  const revealEls = document.querySelectorAll(
    ".section__header, .feature-card, .about__grid, .room-card, .gallery__item, .property-card, .tour-card, .event-card, .events__cta, .subscribe__inner > *, .contact__grid"
  );

  const skipRevealHide =
    document.body.dataset.page === "properties" ||
    document.body.dataset.page === "gallery" ||
    document.body.dataset.page === "about" ||
    window.KmmGalleryPage ||
    window.KmmPropertiesPage ||
    window.KmmAboutPage;

  revealEls.forEach((el) => {
    el.classList.add("reveal");
    if (
      skipRevealHide &&
      (el.classList.contains("property-card") ||
        el.classList.contains("gallery__item") ||
        el.classList.contains("about__grid"))
    ) {
      el.classList.add("visible");
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach((el) => observer.observe(el));

  /* Gallery lightbox */
  const galleryLightbox = document.getElementById("galleryLightbox");
  const galleryLightboxImg = document.getElementById("galleryLightboxImg");
  const galleryLightboxCaption = document.getElementById("galleryLightboxCaption");
  const galleryPrev = document.getElementById("galleryPrev");
  const galleryNext = document.getElementById("galleryNext");
  const galleryTriggers = document.querySelectorAll(".gallery__trigger");
  let galleryIndex = 0;
  let galleryPhotos = [];

  if (
    document.body.dataset.page !== "gallery" &&
    !window.KmmGalleryPage &&
    galleryTriggers.length &&
    galleryLightbox &&
    galleryLightboxImg
  ) {
    galleryPhotos = [...galleryTriggers].map((btn) => {
      const img = btn.querySelector("img");
      return {
        src: img?.src || "",
        alt: img?.alt || "",
      };
    });

    function showGalleryPhoto(index) {
      if (!galleryPhotos.length) return;
      galleryIndex = (index + galleryPhotos.length) % galleryPhotos.length;
      const photo = galleryPhotos[galleryIndex];
      galleryLightboxImg.src = photo.src.replace(/w=\d+/, "w=1400");
      galleryLightboxImg.alt = photo.alt;
      if (galleryLightboxCaption) galleryLightboxCaption.textContent = photo.alt;
    }

    function openGallery(index) {
      showGalleryPhoto(index);
      galleryLightbox.hidden = false;
      galleryLightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("gallery-lightbox-open");
      galleryLightbox.querySelector(".gallery-lightbox__close")?.focus();
    }

    function closeGallery() {
      galleryLightbox.hidden = true;
      galleryLightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("gallery-lightbox-open");
      galleryLightboxImg.removeAttribute("src");
    }

    galleryTriggers.forEach((btn, index) => {
      btn.addEventListener("click", () => openGallery(index));
    });

    galleryPrev?.addEventListener("click", () => showGalleryPhoto(galleryIndex - 1));
    galleryNext?.addEventListener("click", () => showGalleryPhoto(galleryIndex + 1));

    galleryLightbox.querySelectorAll("[data-gallery-close]").forEach((el) => {
      el.addEventListener("click", closeGallery);
    });

    document.addEventListener("keydown", (e) => {
      if (galleryLightbox.hidden) return;
      if (e.key === "Escape") closeGallery();
      if (e.key === "ArrowLeft") showGalleryPhoto(galleryIndex - 1);
      if (e.key === "ArrowRight") showGalleryPhoto(galleryIndex + 1);
    });
  }

  (async function initGuestAutofill() {
    if (typeof KmmClient === "undefined") return;
    await KmmClient.ready();
    applyGuestFieldsForContact();
    window.addEventListener("kmm-client-updated", () => {
      applyGuestFieldsForContact();
      if (bookingModal?.classList.contains("booking-modal--open")) {
        applyGuestFieldsForBooking();
      }
    });
  })();

  window.KmmBookingUI = {
    openBookingModal,
    openBookingForRoom:
      typeof KmmBookingFlow !== "undefined"
        ? KmmBookingFlow.openRoomBooking
        : (opts) => openBookingModal(opts.package, opts.price, opts.event, opts.roomId, opts),
  };
})();
