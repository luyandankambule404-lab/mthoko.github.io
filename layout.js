/* Shared header, footer, booking modal — loaded on public site pages */
(function () {
  const page = document.body.dataset.page || "home";
  const WHATSAPP_PAGES = new Set(["contact"]);
  const logoSrc = () =>
    typeof KmmPaths !== "undefined" ? KmmPaths.logoUrl() : "assets/logo.png";
  const logoFallbacks = () =>
    typeof KmmPaths !== "undefined"
      ? KmmPaths.logoCandidates()
      : ["assets/logo.png", "images/logo.png", "profile.png"];

  if (!document.querySelector('link[rel="icon"]')) {
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/png";
    favicon.href = logoSrc();
    document.head.appendChild(favicon);
  }

  function bindLogoFallback(img) {
    const candidates = logoFallbacks();
    let index = 0;
    img.onerror = function () {
      index += 1;
      if (index < candidates.length) {
        this.src = candidates[index];
      } else {
        this.onerror = null;
      }
    };
  }

  const navItems = [
    { id: "home", href: "index.html", label: "Home" },
    { id: "about", href: "about.html", label: "About" },
    { id: "rooms", href: "rooms.html", label: "Rooms" },
    { id: "gallery", href: "gallery.html", label: "Gallery" },
    { id: "properties", href: "properties.html", label: "Properties" },
    { id: "tours", href: "tours.html", label: "Tours" },
    { id: "events", href: "events.html", label: "Events" },
    { id: "reviews", href: "reviews.html", label: "Reviews" },
    { id: "subscribe", href: "subscribe.html", label: "Subscribe" },
    { id: "contact", href: "contact.html", label: "Contact" },
  ];

  const navLinksHtml = navItems
    .map(
      (item) =>
        `<a href="${item.href}" class="${page === item.id ? "nav__active" : ""}" data-i18n="nav.${item.id === "reviews" ? "reviews" : item.id}">${item.label}</a>`
    )
    .join("");
  const navHtml = `${navLinksHtml}
      <div class="nav__mobile-actions">
        <a href="dashboard.html" class="btn btn--header" data-i18n="btn.account">My Account</a>
        <a href="admin.html" class="btn btn--header" data-i18n="btn.admin">Admin</a>
        <button type="button" class="btn btn--header js-book-open" data-i18n="btn.book">Book Now</button>
      </div>`;

  const headerHtml = `
  <header class="header" id="header">
    <div class="container header__inner">
      <a href="index.html" class="logo" aria-label="KMM Lifestyle Home">
        <img src="${logoSrc()}" alt="KMM Lifestyle" class="logo__img" width="150" height="48" />
      </a>
      <nav class="nav" id="nav" aria-label="Main navigation">${navHtml}</nav>
      <div class="header__actions">
        <a href="dashboard.html" class="btn btn--header" data-i18n="btn.account">My Account</a>
        <a href="admin.html" class="btn btn--header" data-i18n="btn.admin">Admin</a>
        <button type="button" class="btn btn--header js-book-open" data-i18n="btn.book">Book Now</button>
      </div>
      <button class="menu-toggle" id="menuToggle" aria-label="Toggle menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>`;

  const footerHtml = `
  <footer class="footer">
    <div class="container footer__grid">
      <div class="footer__brand">
        <a href="index.html" class="logo" aria-label="KMM Lifestyle Home">
          <img src="${logoSrc()}" alt="KMM Lifestyle" class="logo__img logo__img--footer" width="130" height="42" />
        </a>
        <p>Premium accommodation solutions with comfortable single and shared units. Tenant satisfaction is our priority.</p>
        <form class="footer__subscribe" id="footerSubscribe" aria-label="Quick newsletter signup">
          <label for="footerEmail" class="visually-hidden">Email for newsletter</label>
          <input type="email" id="footerEmail" placeholder="Your email" required />
          <button type="submit" class="btn btn--primary">Join</button>
        </form>
      </div>
      <div>
        <h4>Useful Links</h4>
        <ul>
          <li><a href="properties.html">Single Units</a></li>
          <li><a href="properties.html">Shared Units</a></li>
          <li><a href="rooms.html">Monthly Rentals</a></li>
          <li><a href="about.html">About Us</a></li>
          <li><a href="contact.html">Contact Us</a></li>
          <li><a href="subscribe.html">Subscribe</a></li>
        </ul>
      </div>
      <div>
        <h4>Services</h4>
        <ul>
          <li><a href="rooms.html">Standard Stay</a></li>
          <li><a href="rooms.html">Weekly Packages</a></li>
          <li><a href="tours.html">Safari Tours</a></li>
          <li><a href="events.html">Events &amp; Celebrations</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li>Plot 64 Nannescol, Vanderbijlpark</li>
          <li><a href="mailto:info@kmmlifestyle.co.za">info@kmmlifestyle.co.za</a></li>
          <li><a href="tel:+27826226770">+27 82 622 6770</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom container">
      <p>&copy; <span id="year"></span> KMM Lifestyle. All rights reserved.</p>
      <p>Designed for premium hospitality in South Africa.</p>
    </div>
  </footer>`;

  const bookingModalHtml = `
  <div class="booking-modal" id="bookingModal" aria-hidden="true" role="dialog" aria-labelledby="bookingModalTitle">
    <div class="booking-modal__overlay" data-book-close></div>
    <div class="booking-modal__dialog">
      <button type="button" class="booking-modal__close" data-book-close aria-label="Close booking form">&times;</button>
      <div id="bookingFormWrap">
        <span class="section__tag">Reserve Your Stay</span>
        <h2 class="booking-modal__title" id="bookingModalTitle">Complete Your <em>Booking</em></h2>
        <p class="booking-modal__package" id="bookingPackageLabel"></p>
        <form class="booking-modal__form" id="bookingForm">
          <div class="form-row">
            <label for="bookingPackage">Package</label>
            <select id="bookingPackage" name="package" required>
              <option value="Standard Night Stay" data-room-id="standard-night">Standard Night Stay — R750/night</option>
              <option value="Shared Unit Stay" data-room-id="shared-unit">Shared Unit Stay — R1400/night</option>
              <option value="Weekly Stay Package" data-room-id="weekly-stay">Weekly Stay Package</option>
              <option value="Monthly Rental Package" data-room-id="monthly-rental">Monthly Rental — R8000/month</option>
              <option value="3-Day Safari Adventure" data-room-id="safari-3day">3-Day Safari Adventure</option>
              <option value="7-Day Ultimate Experience" data-room-id="safari-7day">7-Day Ultimate Experience</option>
              <option value="Private Event / Celebration" data-room-id="private-event">Private Event / Celebration</option>
            </select>
          </div>
          <div class="form-row" id="bookingEventTypeRow" hidden>
            <label for="bookingEventType">Event type</label>
            <select id="bookingEventType" name="eventType">
              <option value="">Select an event</option>
            </select>
          </div>
          <fieldset class="payment-picker">
            <legend>How would you like to pay?</legend>
            <div class="payment-picker__options">
              <label class="payment-option">
                <input type="radio" name="bookingPayment" value="online" checked />
                <span class="payment-option__box"><strong>Book Online</strong><small>Pay by card (Paystack) or EFT after booking</small></span>
              </label>
              <label class="payment-option">
                <input type="radio" name="bookingPayment" value="cash" />
                <span class="payment-option__box"><strong>Pay Cash</strong><small>Pay in cash on arrival</small></span>
              </label>
            </div>
          </fieldset>
          <p class="payment-hint" id="paymentHintOnline">Pay by EFT using the bank details below.</p>
          <p class="payment-hint" id="paymentHintCash" hidden>Cash payments are made at check-in.</p>
          <div id="bookingTransferPanel" class="booking-transfer-panel"></div>
          <div class="form-row form-row--half">
            <div><label for="bookingCheckIn">Check-in</label><input type="date" id="bookingCheckIn" required /></div>
            <div><label for="bookingCheckOut">Check-out</label><input type="date" id="bookingCheckOut" required /></div>
          </div>
          <p class="availability-hint" id="bookingAvailabilityHint" hidden></p>
          <div class="booking-price-summary" id="bookingPriceSummary" hidden>
            <h3 class="booking-price-summary__title">Price estimate</h3>
            <ul class="booking-price-summary__lines" id="bookingPriceLines"></ul>
            <p class="booking-price-summary__total" id="bookingPriceTotal"></p>
          </div>
          <p class="booking-signed-in-hint" id="bookingSignedInHint" hidden>
            Booking as <strong id="bookingSignedInName"></strong> · <span id="bookingSignedInEmail"></span>
          </p>
          <div id="bookingGuestFields">
            <div class="form-row"><label for="bookingName">Full Name</label><input type="text" id="bookingName" required placeholder="Your name" /></div>
            <div class="form-row"><label for="bookingEmail">Email</label><input type="email" id="bookingEmail" required placeholder="you@email.com" /></div>
            <div class="form-row"><label for="bookingPhone">Phone / WhatsApp</label><input type="tel" id="bookingPhone" required placeholder="+27 82 000 0000" /></div>
          </div>
          <div class="form-row"><label for="bookingGuests">Guests</label><input type="number" id="bookingGuests" min="1" max="20" value="1" /></div>
          <div class="form-row"><label for="bookingCoupon">Coupon code <span class="optional">(optional)</span></label><input type="text" id="bookingCoupon" placeholder="e.g. WELCOME10" autocomplete="off" /></div>
          <div class="form-row"><label for="bookingNotes">Notes <span class="optional">(optional)</span></label><textarea id="bookingNotes" rows="2"></textarea></div>
          <button type="submit" class="btn btn--primary btn--block" id="bookingSubmitBtn">Confirm Booking</button>
        </form>
      </div>
      <div class="booking-modal__success" id="bookingSuccess" hidden>
        <div class="subscribe__success-icon" aria-hidden="true">✓</div>
        <h3>Booking request sent!</h3>
        <p id="bookingSuccessText"></p>
        <div class="booking-modal__success-actions" id="bookingSuccessActions"></div>
        <button type="button" class="btn btn--ghost" data-book-close>Close</button>
      </div>
    </div>
  </div>`;

  const whatsappFabHtml = WHATSAPP_PAGES.has(page)
    ? `<a href="https://wa.me/27826226770?text=Hi%2C%20I%27d%20like%20to%20inquire%20about%20KMM%20Lifestyle" class="whatsapp-fab" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  </a>`
    : "";

  const faqWidgetHtml =
    page !== "dashboard" && page !== "admin"
      ? `<aside class="faq-widget" id="faqWidget" aria-label="Help assistant">
    <button type="button" class="faq-widget__toggle" id="faqToggle" aria-expanded="false">?</button>
    <div class="faq-widget__panel" id="faqPanel" hidden>
      <h3 class="faq-widget__title">Ask KMM</h3>
      <form id="faqForm">
        <input type="text" id="faqQuestion" placeholder="Ask about check-in, payments…" required />
        <div class="faq-widget__actions">
          <button type="submit" class="btn btn--primary btn--sm" data-faq-mode="faq">Ask</button>
          <button type="button" class="btn btn--ghost btn--sm" id="faqSuggestBtn">Find rooms</button>
        </div>
      </form>
      <p class="faq-widget__error" id="faqError" hidden></p>
      <p class="faq-widget__answer" id="faqAnswer" hidden></p>
      <div class="faq-widget__rooms" id="faqRoomSuggestions" hidden></div>
    </div>
  </aside>`
      : "";

  const extrasHtml = bookingModalHtml + whatsappFabHtml + faqWidgetHtml;

  const headerEl = document.getElementById("site-header");
  const footerEl = document.getElementById("site-footer");
  const extrasEl = document.getElementById("site-extras");

  if (headerEl) headerEl.innerHTML = headerHtml;
  if (footerEl) footerEl.innerHTML = footerHtml;
  if (extrasEl) extrasEl.innerHTML = extrasHtml;

  document.querySelectorAll(".logo__img").forEach(bindLogoFallback);

  if (typeof KmmI18n !== "undefined") {
    KmmI18n.apply();
  }

  document.getElementById("faqToggle")?.addEventListener("click", () => {
    const panel = document.getElementById("faqPanel");
    const btn = document.getElementById("faqToggle");
    if (!panel) return;
    const open = panel.hidden;
    panel.hidden = !open;
    btn?.setAttribute("aria-expanded", open ? "true" : "false");
  });

  function escapeFaqHtml(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  function renderFaqRoomSuggestions(rooms) {
    const box = document.getElementById("faqRoomSuggestions");
    if (!box) return;
    if (!rooms?.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.innerHTML = rooms
      .map(
        (r) => `
      <a class="faq-widget__room" href="room-detail.html?id=${encodeURIComponent(r.id)}">
        <strong>${escapeFaqHtml(r.name)}</strong>
        <span>${r.pricePerNight ? `R${r.pricePerNight}/night` : "Quote"} · ${r.maxGuests} guests</span>
      </a>`
      )
      .join("");
    box.hidden = false;
  }

  async function runFaqAssistant(mode) {
    const input = document.getElementById("faqQuestion");
    const answerEl = document.getElementById("faqAnswer");
    const errorEl = document.getElementById("faqError");
    const question = input?.value.trim();
    if (!question) return;
    errorEl.hidden = true;
    answerEl.hidden = true;
    renderFaqRoomSuggestions([]);
    if (typeof KmmApi === "undefined" || !(await KmmApi.init()) || !KmmApi.isAvailable()) {
      errorEl.textContent = "Start the server (npm start) to use the assistant.";
      errorEl.hidden = false;
      return;
    }
    try {
      const ctx = window.KmmFaqContext || {};
      const isSuggest = mode === "suggest";
      const path = isSuggest ? "/search/suggest" : "/search/faq";
      const body = isSuggest
        ? { question }
        : {
            question,
            roomName: ctx.roomName || "",
            price: ctx.price || "",
            amenities: ctx.amenities || "",
          };
      const data = await KmmApi.request(path, { method: "POST", body });
      answerEl.textContent = data.answer || "No answer.";
      answerEl.hidden = false;
      if (isSuggest) renderFaqRoomSuggestions(data.rooms);
    } catch (err) {
      errorEl.textContent = err.message || "Could not get an answer.";
      errorEl.hidden = false;
    }
  }

  document.getElementById("faqForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    runFaqAssistant("faq");
  });

  document.getElementById("faqSuggestBtn")?.addEventListener("click", () => {
    runFaqAssistant("suggest");
  });

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const s = document.createElement("script");
    s.src = src;
    s.defer = true;
    document.body.appendChild(s);
  }

  loadScript("seo.js");
  loadScript("pwa-register.js");
  if (page !== "dashboard" && page !== "admin") {
    loadScript("faq-chat.js");
  }
})();
