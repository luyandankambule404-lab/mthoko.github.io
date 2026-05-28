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

  function updatePaymentHints(container) {
    const isModal = container === bookingForm;
    const method = getPaymentMethod(
      isModal ? bookingForm : contactForm,
      isModal ? "bookingPayment" : "contactPayment"
    );
    const onlineHint = isModal ? paymentHintOnline : document.getElementById("contactPaymentHintOnline");
    const cashHint = isModal ? paymentHintCash : document.getElementById("contactPaymentHintCash");

    if (onlineHint) onlineHint.hidden = method !== "online";
    if (cashHint) cashHint.hidden = method !== "cash";
  }

  function setMinCheckInDates() {
    const today = new Date().toISOString().split("T")[0];
    ["bookingCheckIn", "checkIn"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.min = today;
    });
  }
  setMinCheckInDates();

  function openBookingModal(packageName, price) {
    if (!bookingModal) return;

    bookingFormWrap?.removeAttribute("hidden");
    bookingSuccess?.setAttribute("hidden", "");
    bookingForm?.reset();

    if (packageName && bookingPackageSelect) {
      const options = [...bookingPackageSelect.options];
      const match = options.find((o) => o.value === packageName || o.text.startsWith(packageName));
      if (match) bookingPackageSelect.value = match.value;
    }

    if (bookingPackageLabel) {
      const selected = bookingPackageSelect?.selectedOptions[0];
      bookingPackageLabel.textContent = price
        ? `${selected?.text || packageName} · ${price}`
        : selected?.text || packageName || "";
    }

    const onlineRadio = bookingForm?.querySelector('input[value="online"]');
    if (onlineRadio) onlineRadio.checked = true;
    updatePaymentHints(bookingForm);

    bookingModal.classList.add("booking-modal--open");
    bookingModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    document.getElementById("bookingName")?.focus();
  }

  function closeBookingModal() {
    bookingModal?.classList.remove("booking-modal--open");
    bookingModal?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    bookingFormWrap?.removeAttribute("hidden");
    bookingSuccess?.setAttribute("hidden", "");
  }

  function showBookingSuccess(payment, packageName) {
    bookingFormWrap?.setAttribute("hidden", "");
    bookingSuccess?.removeAttribute("hidden");

    const textEl = document.getElementById("bookingSuccessText");
    const actionsEl = document.getElementById("bookingSuccessActions");
    if (!textEl || !actionsEl) return;

    if (payment === "cash") {
      textEl.textContent =
        "Your cash booking request was sent via WhatsApp. Pay in cash when you arrive — our team will confirm your reservation shortly.";
      actionsEl.innerHTML = `
        <a href="https://wa.me/${WHATSAPP}" class="btn btn--whatsapp btn--block" target="_blank" rel="noopener">Open WhatsApp</a>
        <a href="tel:+${WHATSAPP}" class="btn btn--ghost btn--block">Call +27 82 622 6770</a>
      `;
    } else {
      textEl.textContent =
        `Your booking for "${packageName}" has been saved. Our team will contact you with payment details — you stay on this site, no redirect needed.`;
      actionsEl.innerHTML = `
        <a href="rooms.html" class="btn btn--primary btn--block">Browse more stays</a>
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
    await KmmBookings.saveBooking(payload);
  }

  async function submitBooking(data, source) {
    try {
      await persistBooking(data, source);
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

    showBookingSuccess(data.payment, data.package);
  }

  document.querySelectorAll(".js-book-open").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openBookingModal(btn.dataset.package, btn.dataset.price);
    });
  });

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

  contactForm?.querySelectorAll('input[name="contactPayment"]').forEach((radio) => {
    radio.addEventListener("change", () => updatePaymentHints(contactForm));
  });
  if (contactForm) updatePaymentHints(contactForm);

  bookingPackageSelect?.addEventListener("change", () => {
    if (bookingPackageLabel) {
      bookingPackageLabel.textContent = bookingPackageSelect.selectedOptions[0]?.text || "";
    }
  });

  bookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      package: bookingPackageSelect?.value || "",
      price: bookingPackageLabel?.textContent?.split("·")[1]?.trim() || "",
      payment: getPaymentMethod(bookingForm, "bookingPayment"),
      name: document.getElementById("bookingName").value.trim(),
      email: document.getElementById("bookingEmail").value.trim(),
      phone: document.getElementById("bookingPhone").value.trim(),
      checkIn: document.getElementById("bookingCheckIn").value,
      checkOut: document.getElementById("bookingCheckOut").value,
      guests: document.getElementById("bookingGuests").value,
      notes: document.getElementById("bookingNotes").value.trim(),
    };

    if (!data.name || !data.email || !data.phone || !data.checkIn) return;

    await submitBooking(data, "booking-modal");
  });

  /* Contact form booking */
  contactForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payment = getPaymentMethod(contactForm, "contactPayment");
    const data = {
      package: document.getElementById("contactPackage").value,
      payment,
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      checkIn: document.getElementById("checkIn").value,
      checkOut: document.getElementById("checkOut").value,
      notes: document.getElementById("message").value.trim(),
    };

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
  });

  /* Scroll reveal */
  const revealEls = document.querySelectorAll(
    ".section__header, .feature-card, .about__grid, .room-card, .gallery__item, .property-card, .tour-card, .event-card, .events__cta, .subscribe__inner > *, .contact__grid"
  );

  revealEls.forEach((el) => el.classList.add("reveal"));

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

  if (galleryTriggers.length && galleryLightbox && galleryLightboxImg) {
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
})();
