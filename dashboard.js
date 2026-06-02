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
    messages: "dash.messages",
    support: "dash.support",
  };

  let bookingTab = "upcoming";
  let bookingsCache = [];

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

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function isUpcomingBooking(b) {
    if (["cancelled", "rejected", "checked_out"].includes(b.status)) return false;
    const today = todayIso();
    if (b.checkOut && b.checkOut < today) return false;
    if (!b.checkIn && !b.checkOut) return ["pending", "confirmed", "checked_in"].includes(b.status);
    return true;
  }

  function statusLabel(s) {
    return (
      {
        pending: "Pending",
        confirmed: "Confirmed",
        checked_in: "Checked in",
        checked_out: "Checked out",
        cancelled: "Cancelled",
        rejected: "Rejected",
      }[s] || s
    );
  }

  function bookingCardHtml(b) {
    const status = b.status || "pending";
    const canCancel = bookingTab === "upcoming" && ["pending", "confirmed"].includes(status);
    const ref = b.bookingReference || b.id;
    const total =
      b.totalAmount > 0 ? `R${Math.round(b.totalAmount).toLocaleString("en-ZA")}` : "";
    return `
        <article class="dash-card">
          <div class="dash-card__head">
            <h3>${escapeHtml(b.roomName || b.package)}</h3>
            <span class="dash-badge dash-badge--${escapeHtml(status)}">${statusLabel(status)}</span>
          </div>
          <p class="dash-card__meta">
            Ref: ${escapeHtml(ref)}<br />
            Check-in: ${escapeHtml(b.checkIn || "—")}<br />
            ${b.checkOut ? `Check-out: ${escapeHtml(b.checkOut)}<br />` : ""}
            Guests: ${escapeHtml(String(b.guests || "—"))} · ${b.payment === "cash" ? "Pay Cash" : "Book Online"}<br />
            ${total ? `Total: <strong>${total}</strong><br />` : ""}
            Booked: ${formatDate(b.createdAt)}
          </p>
          <div class="dash-card__actions">
            <a href="confirmation.html?ref=${encodeURIComponent(ref)}" class="dash-btn dash-btn--ghost">View details</a>
            ${canCancel ? `<button type="button" class="dash-btn dash-btn--danger js-cancel-booking" data-id="${escapeHtml(b.id)}">Cancel booking</button>` : ""}
          </div>
        </article>`;
  }

  function renderBookingsList() {
    const el = document.getElementById("bookingsList");
    if (!el) return;

    const filtered = bookingsCache.filter((b) =>
      bookingTab === "upcoming" ? isUpcomingBooking(b) : !isUpcomingBooking(b)
    );

    if (!bookingsCache.length) {
      el.innerHTML = `<div class="dash-empty">No bookings yet. <a href="rooms.html">Book a stay</a> and they'll appear here when you're signed in.</div>`;
      return;
    }

    if (!filtered.length) {
      el.innerHTML = `<div class="dash-empty">No ${bookingTab === "upcoming" ? "upcoming" : "past"} bookings.</div>`;
      return;
    }

    el.innerHTML = filtered.map(bookingCardHtml).join("");

    el.querySelectorAll(".js-cancel-booking").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Cancel this booking?")) {
          await KmmClient.cancelBooking(btn.dataset.id);
          await renderBookings();
        }
      });
    });
  }

  async function renderBookings() {
    const el = document.getElementById("bookingsList");
    if (!el) return;
    try {
      bookingsCache = await KmmClient.getMyBookings();
    } catch (err) {
      el.innerHTML = `<div class="dash-empty dash-empty--error">${escapeHtml(err.message || "Could not load bookings.")} Make sure you ran <strong>npm start</strong> and open <a href="http://localhost:3000/dashboard.html">localhost:3000</a>.</div>`;
      return;
    }
    renderBookingsList();
  }

  async function renderNotifications() {
    const listEl = document.getElementById("notifyList");
    const badge = document.getElementById("notifyBadge");
    if (!listEl) return;

    let data;
    try {
      data = await KmmClient.getNotifications();
    } catch {
      listEl.innerHTML = `<li class="dash-notify__empty">Could not load</li>`;
      return;
    }

    const unread = data.unread || 0;
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread > 9 ? "9+" : String(unread);
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    }

    const items = data.notifications || [];
    if (!items.length) {
      listEl.innerHTML = `<li class="dash-notify__empty">No notifications yet</li>`;
      return;
    }

    listEl.innerHTML = items
      .map(
        (n) => `
      <li class="dash-notify__item ${n.unread ? "dash-notify__item--unread" : ""}" data-id="${escapeHtml(n.id)}" data-type="${escapeHtml(n.type)}">
        <strong>${escapeHtml(n.title)}</strong>
        <span>${escapeHtml(n.body || "")}</span>
        <span style="display:block;margin-top:0.25rem;font-size:0.7rem">${formatDate(n.createdAt)}</span>
      </li>`
      )
      .join("");

    listEl.querySelectorAll(".dash-notify__item").forEach((li) => {
      li.addEventListener("click", async () => {
        await KmmClient.markNotificationRead(li.dataset.id);
        if (li.dataset.type === "message") switchPanel("messages");
        else if (li.dataset.type === "booking") switchPanel("bookings");
        else if (li.dataset.type === "payment") switchPanel("invoices");
        closeNotifyPanel();
        await renderNotifications();
      });
    });
  }

  function closeNotifyPanel() {
    document.getElementById("notifyPanel")?.setAttribute("hidden", "");
    document.getElementById("notifyBellBtn")?.setAttribute("aria-expanded", "false");
  }

  function setupNotifications() {
    const btn = document.getElementById("notifyBellBtn");
    const panel = document.getElementById("notifyPanel");
    if (!btn || !panel || btn.dataset.bound) return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) await renderNotifications();
    });

    document.getElementById("notifyMarkAll")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      await KmmClient.markAllNotificationsRead();
      await renderNotifications();
    });

    document.addEventListener("click", (e) => {
      if (!document.getElementById("dashNotify")?.contains(e.target)) closeNotifyPanel();
    });
  }

  async function renderMessages() {
    const inbox = document.getElementById("messagesInbox");
    if (!inbox) return;

    let messages = [];
    try {
      messages = await KmmClient.getMessages();
    } catch (err) {
      inbox.innerHTML = `<div class="dash-empty dash-empty--error">${escapeHtml(err.message || "Could not load messages.")}</div>`;
      return;
    }

    if (!messages.length) {
      inbox.innerHTML = `<div class="dash-empty">No messages yet.</div>`;
      return;
    }

    inbox.innerHTML = messages
      .map(
        (m) => `
      <div class="dash-inbox__msg ${m.fromStaff ? "dash-inbox__msg--staff" : "dash-inbox__msg--user"}">
        ${escapeHtml(m.body)}
        <time>${formatDate(m.createdAt)}</time>
      </div>`
      )
      .join("");

    inbox.scrollTop = inbox.scrollHeight;
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

    const verifyBanner = document.getElementById("emailVerifyBanner");
    const resendBtn = document.getElementById("resendVerifyBtn");
    if (user.emailVerified) {
      verifyBanner?.setAttribute("hidden", "");
      resendBtn?.setAttribute("hidden", "");
    } else {
      if (verifyBanner) {
        verifyBanner.textContent = "Your email is not verified. Check your inbox or resend the link.";
        verifyBanner.removeAttribute("hidden");
      }
      resendBtn?.removeAttribute("hidden");
    }

    const twoFaStatus = document.getElementById("twoFaStatus");
    const setupBtn = document.getElementById("twoFaSetupBtn");
    const disableForm = document.getElementById("twoFaDisableForm");
    const setupPanel = document.getElementById("twoFaSetup");
    if (user.totpEnabled) {
      if (twoFaStatus) twoFaStatus.textContent = "Two-factor authentication is enabled.";
      setupBtn?.setAttribute("hidden", "");
      setupPanel?.setAttribute("hidden", "");
      disableForm?.removeAttribute("hidden");
    } else {
      if (twoFaStatus) twoFaStatus.textContent = "Two-factor authentication is off.";
      setupBtn?.removeAttribute("hidden");
      disableForm?.setAttribute("hidden", "");
    }
  }

  async function renderPayments() {
    const el = document.getElementById("paymentsList");
    if (!el || typeof KmmPayments === "undefined") return;
    let list = [];
    try {
      list = await KmmPayments.listMine();
    } catch {
      el.innerHTML = "";
      return;
    }
    if (!list.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = `
      <h3 class="dash-subtitle">Payments</h3>
      ${list
        .map(
          (p) => `
        <article class="dash-card">
          <div class="dash-card__head">
            <h3>${escapeHtml(p.bookingReference || p.bookingId)}</h3>
            <span class="dash-badge dash-badge--${p.status === "completed" ? "paid" : "pending"}">${escapeHtml(KmmPayments.formatStatus(p.status))}</span>
          </div>
          <p class="dash-card__meta">
            ${escapeHtml(p.package || "Booking")} · ${KmmPayments.formatAmount(p)}<br />
            ${escapeHtml(p.method)} · ${formatDate(p.createdAt)}
          </p>
          ${
            p.status !== "completed" && p.status !== "refunded" && p.method !== "cash"
              ? `<div class="dash-card__actions"><button type="button" class="dash-btn dash-btn--primary js-pay-booking" data-booking="${escapeHtml(p.bookingId)}">Pay now</button></div>`
              : ""
          }
        </article>`
        )
        .join("")}`;

    el.querySelectorAll(".js-pay-booking").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          const user = KmmClient.getCurrentUser();
          const result = await KmmPayments.initiateCheckout(btn.dataset.booking, {
            email: user?.email,
          });
          if (result.checkoutUrl) window.location.href = result.checkoutUrl;
          else alert(result.instructions || "Use EFT on your confirmation page.");
        } catch (err) {
          alert(err.message || "Could not start payment.");
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  async function renderInvoices() {
    const el = document.getElementById("invoicesList");
    if (!el) return;
    await renderPayments();
    let list = [];
    try {
      list = await KmmClient.getInvoices();
    } catch (err) {
      el.innerHTML = `<div class="dash-empty dash-empty--error">${escapeHtml(err.message || "Could not load invoices.")}</div>`;
      return;
    }

    if (!list.length) {
      el.innerHTML = `<div class="dash-empty">No invoices yet. Invoices are created when you book while signed in.</div>`;
      document.getElementById("deleteAllInvoicesBtn")?.setAttribute("hidden", "");
      return;
    }

    document.getElementById("deleteAllInvoicesBtn")?.removeAttribute("hidden");

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
            <a href="invoice-print.html?id=${encodeURIComponent(inv.id)}" class="dash-btn dash-btn--ghost" target="_blank" rel="noopener">Print / PDF</a>
            <button type="button" class="dash-btn dash-btn--danger js-delete-inv" data-id="${escapeHtml(inv.id)}">Delete</button>
          </div>
        </article>`;
      })
      .join("");

    el.querySelectorAll(".js-delete-inv").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const inv = list.find((i) => i.id === btn.dataset.id);
        if (!inv) return;
        if (!confirm(`Delete invoice for "${inv.package}"? This cannot be undone.`)) return;
        try {
          await KmmClient.deleteInvoice(inv.id);
          renderInvoices();
        } catch (err) {
          alert(err.message || "Could not delete invoice.");
        }
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

    let dealsHtml = "";
    if (typeof KmmApi !== "undefined" && KmmApi.isAvailable()) {
      try {
        const dealsRes = await KmmApi.request("/marketing/deals");
        const deals = dealsRes.deals || [];
        if (deals.length) {
          dealsHtml = `
        <div class="loyalty-deals" style="margin-top:1.25rem">
          <h2 class="dash-subtitle">Member offers</h2>
          <div class="dash-cards">
            ${deals
              .slice(0, 3)
              .map(
                (d) => `
              <article class="dash-card">
                <p><strong>${escapeHtml(d.name)}</strong> — ${escapeHtml(d.label)}</p>
                ${d.couponCode ? `<p class="dash-card__meta">Code: <code>${escapeHtml(d.couponCode)}</code></p>` : ""}
                <p class="dash-card__meta">${escapeHtml(d.description || "")}</p>
              </article>`
              )
              .join("")}
          </div>
          <p class="dash-card__meta" style="margin-top:0.5rem">Your ${data.tier.name} tier includes ${data.tier.discount} off eligible stays — mention at booking.</p>
        </div>`;
        }
      } catch {
        /* optional */
      }
    }

    el.innerHTML = `
      <div class="loyalty-card">
        <span style="font-size:0.8rem;color:var(--muted,#a89f94)">Your balance</span>
        <div class="loyalty-card__points">${data.points.toLocaleString()}</div>
        <span style="font-size:0.85rem;color:var(--muted,#a89f94)">points</span>
        <span class="loyalty-card__tier">${data.tier.name} Member · ${data.tier.discount} off</span>
        <div class="loyalty-progress"><div class="loyalty-progress__bar" style="width:${progress}%"></div></div>
        <p style="font-size:0.8rem;color:var(--muted,#a89f94);margin-top:0.75rem">${nextTier - data.points > 0 ? `${nextTier - data.points} points to next tier` : "Top tier reached!"}</p>
      </div>
      ${dealsHtml}
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
    setupNotifications();
    await Promise.all([
      renderBookings(),
      renderFavorites(),
      renderInvoices(),
      renderSubscription(),
      renderLoyalty(),
      renderNotifications(),
      renderMessages(),
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

  let pending2faToken = "";

  const twoFaForm = document.getElementById("twoFaForm");

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await KmmClient.login(
      document.getElementById("loginEmail").value,
      document.getElementById("loginPassword").value
    );
    if (result.ok && result.requires2fa) {
      pending2faToken = result.pendingToken;
      loginForm.hidden = true;
      twoFaForm?.removeAttribute("hidden");
      loginError.hidden = true;
      return;
    }
    if (result.ok) await showDashboard();
    else {
      loginError.textContent = result.error;
      loginError.hidden = false;
    }
  });

  twoFaForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const twoFaError = document.getElementById("twoFaError");
    const result = await KmmClient.verify2fa(
      pending2faToken,
      document.getElementById("twoFaCode").value
    );
    if (result.ok) {
      pending2faToken = "";
      await showDashboard();
    } else {
      twoFaError.textContent = result.error;
      twoFaError.hidden = false;
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

  document.getElementById("deleteAllInvoicesBtn")?.addEventListener("click", async () => {
    if (!confirm("Delete all your invoices? This cannot be undone.")) return;
    try {
      await KmmClient.deleteAllInvoices();
      renderInvoices();
    } catch (err) {
      alert(err.message || "Could not delete all invoices.");
    }
  });

  document.querySelectorAll("[data-booking-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      bookingTab = tab.dataset.bookingTab;
      document.querySelectorAll("[data-booking-tab]").forEach((t) => {
        t.classList.toggle("dash-tabs__btn--active", t === tab);
      });
      renderBookingsList();
    });
  });

  document.getElementById("messageForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bodyEl = document.getElementById("messageBody");
    const text = bodyEl?.value.trim();
    if (!text) return;
    try {
      await KmmClient.sendMessage(text);
      bodyEl.value = "";
      await renderMessages();
      await renderNotifications();
    } catch (err) {
      alert(err.message || "Could not send message.");
    }
  });

  document.querySelectorAll(".dash-nav__item").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchPanel(btn.dataset.panel);
      if (btn.dataset.panel === "subscribe") renderSubscription();
      if (btn.dataset.panel === "messages") renderMessages();
    });
  });

  document.getElementById("resendVerifyBtn")?.addEventListener("click", async () => {
    const result = await KmmClient.resendVerification();
    alert(result.message || result.error || "Done.");
  });

  document.getElementById("twoFaSetupBtn")?.addEventListener("click", async () => {
    const result = await KmmClient.setup2fa();
    if (!result.ok) {
      alert(result.error);
      return;
    }
    document.getElementById("twoFaSecret").textContent = result.secret;
    document.getElementById("twoFaUri").textContent = result.otpauthUrl;
    document.getElementById("twoFaSetup")?.removeAttribute("hidden");
    document.getElementById("twoFaSetupBtn")?.setAttribute("hidden", "");
  });

  document.getElementById("twoFaConfirmBtn")?.addEventListener("click", async () => {
    const code = document.getElementById("twoFaConfirmCode").value;
    const result = await KmmClient.confirm2fa(code);
    alert(result.ok ? "Two-factor authentication enabled." : result.error);
    if (result.ok) renderProfile();
  });

  document.getElementById("twoFaDisableForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await KmmClient.disable2fa(
      document.getElementById("twoFaDisablePassword").value,
      document.getElementById("twoFaDisableCode").value
    );
    alert(result.ok ? "2FA disabled." : result.error);
    if (result.ok) renderProfile();
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
    if (window.location.hostname.endsWith("github.io")) {
      document.getElementById("githubHostingNote")?.removeAttribute("hidden");
    }
    await KmmClient.ready();
    if (KmmClient.isLoggedIn()) await showDashboard();
    else showAuth();
  })();
})();
