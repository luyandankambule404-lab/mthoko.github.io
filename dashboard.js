(function () {
  const authScreen = document.getElementById("authScreen");
  const dashboardApp = document.getElementById("dashboardApp");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginError = document.getElementById("loginError");
  const registerError = document.getElementById("registerError");
  const panelTitle = document.getElementById("panelTitle");
  const HIDDEN = "dash-screen--hidden";

  const panelTitleKeys = {
    bookings: "dash.bookings",
    favorites: "dash.favorites",
    profile: "dash.profile",
    invoices: "dash.invoices",
    subscribe: "dash.subscribe",
    loyalty: "dash.loyalty",
    language: "dash.language",
    currency: "dash.currency",
    support: "dash.support",
  };

  function showAuth() {
    authScreen?.classList.remove(HIDDEN);
    authScreen?.removeAttribute("hidden");
    dashboardApp?.classList.add(HIDDEN);
    dashboardApp?.setAttribute("hidden", "");
  }

  async function showDashboard() {
    authScreen?.classList.add(HIDDEN);
    authScreen?.setAttribute("hidden", "");
    dashboardApp?.classList.remove(HIDDEN);
    dashboardApp?.removeAttribute("hidden");
    await KmmClient.ready();
    const user = KmmClient.getCurrentUser();
    const nameEl = document.getElementById("sidebarUserName");
    if (nameEl && user) nameEl.textContent = user.name;
    await renderAll();
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  function switchPanel(panelId) {
    document.querySelectorAll(".dash-nav__item").forEach((btn) => {
      btn.classList.toggle("dash-nav__item--active", btn.dataset.panel === panelId);
    });
    document.querySelectorAll(".dash-panel").forEach((panel) => {
      const active = panel.id === `panel-${panelId}`;
      panel.classList.toggle("dash-panel--active", active);
      panel.hidden = !active;
    });
    if (panelTitle && typeof KmmI18n !== "undefined") {
      panelTitle.textContent = KmmI18n.t(panelTitleKeys[panelId] || "dash.bookings");
    }
  }

  async function renderBookings() {
    const el = document.getElementById("bookingsList");
    if (!el) return;
    let list = [];
    try {
      list = await KmmClient.getMyBookings();
    } catch (err) {
      el.innerHTML = `<div class="dash-empty dash-empty--error">${escapeHtml(err.message || "Could not load bookings.")} Make sure you ran <strong>npm start</strong> and open <a href="http://localhost:3000/dashboard.html">localhost:3000</a>.</div>`;
      return;
    }

    if (!list.length) {
      el.innerHTML = `<div class="dash-empty">No bookings yet. <a href="rooms.html">Book a stay</a> and they'll appear here when you're signed in.</div>`;
      return;
    }

    el.innerHTML = list
      .map((b) => {
        const status = b.status || "confirmed";
        const cancelled = status === "cancelled";
        return `
        <article class="dash-card">
          <div class="dash-card__head">
            <h3>${escapeHtml(b.package)}</h3>
            <span class="dash-badge dash-badge--${cancelled ? "cancelled" : "confirmed"}">${cancelled ? "Cancelled" : "Confirmed"}</span>
          </div>
          <p class="dash-card__meta">
            Check-in: ${escapeHtml(b.checkIn || "—")}<br />
            ${b.checkOut ? `Check-out: ${escapeHtml(b.checkOut)}<br />` : ""}
            Guests: ${escapeHtml(String(b.guests || "—"))} · ${b.payment === "cash" ? "Pay Cash" : "Book Online"}<br />
            Booked: ${formatDate(b.createdAt)}
          </p>
          ${!cancelled ? `<div class="dash-card__actions"><button type="button" class="dash-btn dash-btn--danger js-cancel-booking" data-id="${escapeHtml(b.id)}">Cancel booking</button></div>` : ""}
        </article>`;
      })
      .join("");

    el.querySelectorAll(".js-cancel-booking").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Cancel this booking?")) {
          await KmmClient.cancelBooking(btn.dataset.id);
          await renderBookings();
        }
      });
    });
  }

  async function renderFavorites() {
    const favEl = document.getElementById("favoritesList");
    const catEl = document.getElementById("catalogList");
    if (!favEl || !catEl) return;

    const favorites = KmmClient.getFavorites();
    const catalog = KmmClient.getCatalog();

    favEl.innerHTML = favorites.length
      ? favorites
          .map(
            (p) => `
        <article class="dash-card">
          <div class="dash-card__head">
            <h3>${escapeHtml(p.name)}</h3>
            <span class="dash-badge dash-badge--pending">${escapeHtml(p.price)}</span>
          </div>
          <div class="dash-card__actions">
            <a href="${p.page}" class="dash-btn dash-btn--primary">View &amp; Book</a>
            <button type="button" class="dash-btn dash-btn--ghost js-fav-toggle" data-id="${escapeHtml(p.id)}">Remove</button>
          </div>
        </article>`
          )
          .join("")
      : `<div class="dash-empty">No favorites saved yet. Browse packages below and tap ♥ Save.</div>`;

    catEl.innerHTML = catalog
      .map((p) => {
        const saved = KmmClient.isFavorite(p.id);
        return `
        <div class="dash-catalog__item">
          <h4>${escapeHtml(p.name)}</h4>
          <span>${escapeHtml(p.price)}</span>
          <button type="button" class="dash-btn dash-btn--ghost js-fav-toggle" data-id="${escapeHtml(p.id)}">${saved ? "♥ Saved" : "♡ Save"}</button>
          <a href="${p.page}" class="dash-btn dash-btn--primary" style="font-size:0.8rem">Book</a>
        </div>`;
      })
      .join("");

    document.querySelectorAll(".js-fav-toggle").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await KmmClient.toggleFavorite(btn.dataset.id);
        await renderFavorites();
      });
    });
  }

  function renderProfile() {
    const user = KmmClient.getCurrentUser();
    if (!user) return;
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || "";
    };
    set("profileName", user.name);
    set("profileEmail", user.email);
    set("profilePhone", user.phone);
    set("profileAddress", user.address);
  }

  async function renderInvoices() {
    const el = document.getElementById("invoicesList");
    if (!el) return;
    let list = [];
    try {
      list = await KmmClient.getInvoices();
    } catch (err) {
      el.innerHTML = `<div class="dash-empty dash-empty--error">${escapeHtml(err.message || "Could not load invoices.")}</div>`;
      return;
    }

    if (!list.length) {
      el.innerHTML = `<div class="dash-empty">No invoices yet. Invoices are created when you book while signed in.</div>`;
      return;
    }

    el.innerHTML = list
      .map((inv) => {
        const statusLabel =
          inv.status === "paid"
            ? "Paid"
            : inv.status === "pay_on_arrival"
              ? "Pay on arrival"
              : "Pending";
        const badgeClass =
          inv.status === "paid" ? "paid" : inv.status === "pay_on_arrival" ? "pending" : "pending";
        const amount =
          inv.amount > 0
            ? `${inv.currency === "USD" ? "$" : "R"}${inv.amount.toLocaleString()}`
            : "Custom quote";

        return `
        <article class="dash-card">
          <div class="dash-card__head">
            <h3>Invoice ${escapeHtml(inv.id.slice(-8))}</h3>
            <span class="dash-badge dash-badge--${badgeClass}">${statusLabel}</span>
          </div>
          <p class="dash-card__meta">
            ${escapeHtml(inv.package)}<br />
            Amount: <strong>${amount}</strong><br />
            Date: ${formatDate(inv.createdAt)} · ${inv.payment === "cash" ? "Cash" : "Online"}
          </p>
          <div class="dash-card__actions">
            <button type="button" class="dash-btn dash-btn--ghost js-download-inv" data-id="${escapeHtml(inv.id)}">Download</button>
          </div>
        </article>`;
      })
      .join("");

    el.querySelectorAll(".js-download-inv").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inv = list.find((i) => i.id === btn.dataset.id);
        if (!inv) return;
        const text = [
          "KMM Lifestyle — Invoice",
          "",
          `Invoice ID: ${inv.id}`,
          `Guest: ${inv.guestName}`,
          `Package: ${inv.package}`,
          `Amount: ${inv.amount}`,
          `Status: ${inv.status}`,
          `Date: ${formatDate(inv.createdAt)}`,
        ].join("\n");
        const blob = new Blob([text], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${inv.id}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    });
  }

  const INTEREST_LABELS = {
    rooms: "Rooms & accommodation",
    tours: "Tours & events",
    deals: "Exclusive deals",
  };

  function formatInterests(interests) {
    if (!interests?.length) return "All updates";
    return interests.map((i) => INTEREST_LABELS[i] || i).join(", ");
  }

  async function renderSubscription() {
    const el = document.getElementById("subscribeContent");
    if (!el) return;

    let data;
    try {
      data = await KmmClient.getSubscription();
    } catch (err) {
      el.innerHTML = `<div class="dash-empty dash-empty--error">${escapeHtml(err.message || "Could not load subscription.")}</div>`;
      return;
    }

    const sub = data.subscription;
    const email = data.email || KmmClient.getCurrentUser()?.email || "";
    const name = data.name || KmmClient.getCurrentUser()?.name || "";

    if (sub?.subscribed) {
      el.innerHTML = `
        <article class="dash-card dash-subscribe-status">
          <div class="dash-card__head">
            <h3>You're subscribed</h3>
            <span class="dash-badge dash-badge--confirmed">Active</span>
          </div>
          <p class="dash-card__meta">
            Email: <strong>${escapeHtml(sub.email || email)}</strong><br />
            Interests: ${escapeHtml(formatInterests(sub.interests))}<br />
            Subscribed: ${formatDate(sub.createdAt)}
          </p>
          <div class="dash-card__actions">
            <button type="button" class="dash-btn dash-btn--ghost" id="editSubscribeBtn">Update preferences</button>
            <button type="button" class="dash-btn dash-btn--danger" id="unsubscribeBtn">Unsubscribe</button>
          </div>
        </article>
        <form id="subscribeForm" class="dash-form dash-subscribe-form" hidden>
          ${buildSubscribeFormFields(name, sub.interests, email)}
        </form>`;

      document.getElementById("editSubscribeBtn")?.addEventListener("click", () => {
        document.querySelector(".dash-subscribe-status")?.setAttribute("hidden", "");
        document.getElementById("subscribeForm")?.removeAttribute("hidden");
      });

      document.getElementById("unsubscribeBtn")?.addEventListener("click", async () => {
        if (!confirm("Unsubscribe from KMM Lifestyle updates?")) return;
        const result = await KmmClient.unsubscribe();
        if (result.ok) await renderSubscription();
        else alert(result.error || "Could not unsubscribe.");
      });

      bindSubscribeForm();
      return;
    }

    el.innerHTML = `
      <form id="subscribeForm" class="dash-form dash-subscribe-form">
        ${buildSubscribeFormFields(name, ["rooms", "deals"], email)}
      </form>`;
    bindSubscribeForm();
  }

  function buildSubscribeFormFields(name, interests = [], email = "") {
    const selected = new Set(interests);
    const checked = (value) => (selected.has(value) ? "checked" : "");
    return `
      <label for="subName">Name <span class="optional">(optional)</span></label>
      <input type="text" id="subName" value="${escapeHtml(name)}" placeholder="Your name" />
      <label for="subEmail">Email</label>
      <input type="email" id="subEmail" value="${escapeHtml(email)}" disabled />
      <fieldset class="dash-subscribe__interests">
        <legend>I'm interested in</legend>
        <label class="dash-subscribe__check">
          <input type="checkbox" name="interest" value="rooms" ${checked("rooms")} />
          <span>Rooms &amp; accommodation</span>
        </label>
        <label class="dash-subscribe__check">
          <input type="checkbox" name="interest" value="tours" ${checked("tours")} />
          <span>Tours &amp; events</span>
        </label>
        <label class="dash-subscribe__check">
          <input type="checkbox" name="interest" value="deals" ${checked("deals")} />
          <span>Exclusive deals</span>
        </label>
      </fieldset>
      <label class="dash-subscribe__consent">
        <input type="checkbox" id="subConsent" required />
        <span>I agree to receive updates from KMM Lifestyle. Unsubscribe anytime.</span>
      </label>
      <button type="submit" class="dash-btn dash-btn--primary">Subscribe</button>
      <p class="dash-error" id="subscribeError" hidden></p>
      <p class="dash-success" id="subscribeSuccess" hidden>You're subscribed! Watch your inbox for updates.</p>`;
  }

  function bindSubscribeForm() {
    const form = document.getElementById("subscribeForm");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("subscribeError");
      const successEl = document.getElementById("subscribeSuccess");
      errorEl.hidden = true;
      successEl.hidden = true;

      const consent = document.getElementById("subConsent");
      if (!consent?.checked) {
        errorEl.textContent = "Please agree to receive updates before subscribing.";
        errorEl.hidden = false;
        return;
      }

      const interests = [...form.querySelectorAll('input[name="interest"]:checked')].map(
        (input) => input.value
      );
      const result = await KmmClient.saveSubscription({
        name: document.getElementById("subName")?.value.trim() || "",
        interests,
      });

      if (result.ok) {
        await renderSubscription();
      } else {
        errorEl.textContent = result.error || "Could not save subscription.";
        errorEl.hidden = false;
      }
    });
  }

  async function renderLoyalty() {
    const el = document.getElementById("loyaltyContent");
    if (!el) return;
    const data = await KmmClient.getLoyalty();
    const nextTier =
      data.points < 500 ? 500 : data.points < 1500 ? 1500 : data.points < 3000 ? 3000 : data.points;
    const progress = Math.min(100, (data.points / nextTier) * 100);

    el.innerHTML = `
      <div class="loyalty-card">
        <span style="font-size:0.8rem;color:var(--muted,#a89f94)">Your balance</span>
        <div class="loyalty-card__points">${data.points.toLocaleString()}</div>
        <span style="font-size:0.85rem;color:var(--muted,#a89f94)">points</span>
        <span class="loyalty-card__tier">${data.tier.name} Member · ${data.tier.discount} off</span>
        <div class="loyalty-progress"><div class="loyalty-progress__bar" style="width:${progress}%"></div></div>
        <p style="font-size:0.8rem;color:var(--muted,#a89f94);margin-top:0.75rem">${nextTier - data.points > 0 ? `${nextTier - data.points} points to next tier` : "Top tier reached!"}</p>
      </div>
      <h2 class="dash-subtitle">Recent points</h2>
      <div class="dash-cards">
        ${(data.history || []).slice(0, 8).map((h) => `
          <article class="dash-card">
            <p class="dash-card__meta"><strong>+${h.points}</strong> — ${escapeHtml(h.reason)}<br />${formatDate(h.date)}</p>
          </article>`).join("") || '<div class="dash-empty">Book a stay while signed in to earn loyalty points.</div>'}
      </div>`;
  }

  async function renderAll() {
    renderProfile();
    await Promise.all([
      renderBookings(),
      renderFavorites(),
      renderInvoices(),
      renderSubscription(),
      renderLoyalty(),
    ]);
  }

  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const isLogin = tab.dataset.authTab === "login";
      document.querySelectorAll("[data-auth-tab]").forEach((t) => {
        t.classList.toggle("dash-auth__tab--active", t === tab);
      });
      loginForm.hidden = !isLogin;
      registerForm.hidden = isLogin;
      loginError.hidden = true;
      registerError.hidden = true;
    });
  });

  document.querySelectorAll("[data-social]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const result = await KmmClient.socialLogin(btn.dataset.social);
      if (result.ok) await showDashboard();
      else if (result.error) {
        registerError.textContent = result.error;
        registerError.hidden = false;
      }
    });
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await KmmClient.login(
      document.getElementById("loginEmail").value,
      document.getElementById("loginPassword").value
    );
    if (result.ok) await showDashboard();
    else {
      loginError.textContent = result.error;
      loginError.hidden = false;
    }
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await KmmClient.register({
      name: document.getElementById("regName").value,
      email: document.getElementById("regEmail").value,
      phone: document.getElementById("regPhone").value,
      password: document.getElementById("regPassword").value,
    });
    if (result.ok) await showDashboard();
    else {
      registerError.textContent = result.error;
      registerError.hidden = false;
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    KmmClient.logout();
    showAuth();
  });

  document.querySelectorAll(".dash-nav__item").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchPanel(btn.dataset.panel);
      if (btn.dataset.panel === "subscribe") renderSubscription();
    });
  });

  document.getElementById("profileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await KmmClient.updateProfile({
      name: document.getElementById("profileName").value,
      phone: document.getElementById("profilePhone").value,
      address: document.getElementById("profileAddress").value,
    });
    const success = document.getElementById("profileSuccess");
    success?.removeAttribute("hidden");
    setTimeout(() => success?.setAttribute("hidden", ""), 3000);
    document.getElementById("sidebarUserName").textContent =
      document.getElementById("profileName").value;
  });

  window.addEventListener("kmm-bookings-updated", () => renderBookings());
  window.addEventListener("kmm-client-updated", () => renderAll());
  window.addEventListener("kmm-dash-lang", () => {
    const active = document.querySelector(".dash-nav__item--active");
    if (active) switchPanel(active.dataset.panel);
  });

  (async function init() {
    await KmmClient.ready();
    if (KmmClient.isLoggedIn()) await showDashboard();
    else showAuth();
  })();
})();
