(function () {
  const loginScreen = document.getElementById("loginScreen");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const loginLoadError = document.getElementById("loginLoadError");
  const bookingsBody = document.getElementById("bookingsBody");
  const invoicesBody = document.getElementById("invoicesBody");
  const subscriptionsBody = document.getElementById("subscriptionsBody");
  const searchInput = document.getElementById("searchInput");
  const filterPayment = document.getElementById("filterPayment");
  const filterPackage = document.getElementById("filterPackage");
  const deleteConfirm = document.getElementById("deleteConfirm");
  const deleteConfirmDetails = document.getElementById("deleteConfirmDetails");
  const deleteConfirmTitle = document.getElementById("deleteConfirmTitle");
  const deleteConfirmText = document.getElementById("deleteConfirmText");
  const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");

  const PACKAGES = [
    "Standard Night Stay",
    "Shared Unit Stay",
    "Weekly Stay Package",
    "Monthly Rental Package",
    "3-Day Safari Adventure",
    "7-Day Ultimate Experience",
    "General Inquiry",
    "Private Event / Celebration",
  ];

  const HIDDEN_CLASS = "admin-screen--hidden";

  function showDashboard() {
    if (!loginScreen || !dashboard) return;
    loginScreen.classList.add(HIDDEN_CLASS);
    loginScreen.setAttribute("hidden", "");
    dashboard.classList.remove(HIDDEN_CLASS);
    dashboard.removeAttribute("hidden");
    render();
  }

  function showLogin() {
    if (!loginScreen || !dashboard) return;
    loginScreen.classList.remove(HIDDEN_CLASS);
    loginScreen.removeAttribute("hidden");
    dashboard.classList.add(HIDDEN_CLASS);
    dashboard.setAttribute("hidden", "");
    if (typeof KmmBookings !== "undefined") {
      KmmBookings.logout();
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function formatEventTypes(eventTypes) {
    if (!eventTypes?.length) return "—";
    const list = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    return list.map((t) => `<span class="badge badge--event">${escapeHtml(t)}</span>`).join(" ");
  }

  function getFilteredBookings() {
    let list = KmmBookings.getAll();
    const q = (searchInput?.value || "").trim().toLowerCase();
    const payment = filterPayment?.value || "";
    const pkg = filterPackage?.value || "";

    if (q) {
      list = list.filter(
        (b) =>
          (b.name || "").toLowerCase().includes(q) ||
          (b.email || "").toLowerCase().includes(q) ||
          (b.phone || "").toLowerCase().includes(q) ||
          (b.package || "").toLowerCase().includes(q)
      );
    }
    if (payment) list = list.filter((b) => b.payment === payment);
    if (pkg) list = list.filter((b) => b.package === pkg);

    return list;
  }

  function updateStats() {
    const stats = KmmBookings.getStats();
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set("statTotal", stats.total);
    set("statToday", stats.today);
    set("statOnline", stats.online);
    set("statCash", stats.cash);
  }

  function populatePackageFilter() {
    if (!filterPackage) return;
    const current = filterPackage.value;
    const all = KmmBookings.getAll();
    const packages = [...new Set([...PACKAGES, ...all.map((b) => b.package)])].filter(Boolean);
    filterPackage.innerHTML =
      '<option value="">All packages</option>' +
      packages.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
    if (current) filterPackage.value = current;
  }

  let renderGen = 0;
  let deleteConfirmResolve = null;
  let invoicesCache = [];
  let subscriptionsCache = [];

  const INTEREST_LABELS = {
    rooms: "Rooms",
    tours: "Tours",
    deals: "Deals",
  };

  function formatInterests(interests) {
    if (!interests?.length) return "—";
    const list = Array.isArray(interests) ? interests : String(interests).split(",");
    return list.map((i) => INTEREST_LABELS[i.trim()] || i.trim()).join(", ");
  }

  function formatAmount(inv) {
    if (!inv.amount || inv.amount <= 0) return "Custom quote";
    const prefix = inv.currency === "USD" ? "$" : "R";
    return `${prefix}${Number(inv.amount).toLocaleString("en-ZA")}`;
  }

  function formatMoney(amount, currency = "ZAR") {
    if (!amount || amount <= 0) return currency === "USD" ? "$0" : "R0";
    const prefix = currency === "USD" ? "$" : "R";
    return `${prefix}${Number(amount).toLocaleString("en-ZA")}`;
  }

  function getInvoiceTotals(invoices) {
    return invoices.reduce(
      (totals, inv) => {
        const amount = Number(inv.amount) || 0;
        if (amount <= 0) return totals;
        totals.invoiced += amount;
        if (inv.status === "paid") totals.paid += amount;
        else totals.outstanding += amount;
        return totals;
      },
      { invoiced: 0, paid: 0, outstanding: 0 }
    );
  }

  function updateInvoiceStats() {
    const totals = getInvoiceTotals(invoicesCache);
    const statTotalPaid = document.getElementById("statTotalPaid");
    const statTotalInvoiced = document.getElementById("statTotalInvoiced");
    const invoiceSummary = document.getElementById("invoiceSummary");

    if (statTotalPaid) statTotalPaid.textContent = formatMoney(totals.paid);
    if (statTotalInvoiced) {
      statTotalInvoiced.textContent = `${formatMoney(totals.invoiced)} invoiced · ${formatMoney(totals.outstanding)} outstanding`;
    }
    if (invoiceSummary) {
      invoiceSummary.textContent = invoicesCache.length
        ? `Total invoiced: ${formatMoney(totals.invoiced)} · Paid: ${formatMoney(totals.paid)} · Outstanding: ${formatMoney(totals.outstanding)}`
        : "Invoices created for signed-in guest bookings.";
    }
  }

  function formatInvoiceStatus(status) {
    if (status === "paid") return { label: "Paid", className: "paid" };
    if (status === "pay_on_arrival") return { label: "Pay on arrival", className: "pay-on-arrival" };
    return { label: "Pending", className: "pending" };
  }

  async function fetchInvoices() {
    if (typeof KmmApi === "undefined" || !KmmApi.getAdminToken()) return [];
    const data = await KmmApi.request("/admin/invoices", { auth: "admin" });
    return data.invoices || [];
  }

  async function fetchSubscriptions() {
    if (typeof KmmApi === "undefined" || !KmmApi.getAdminToken()) return [];
    const data = await KmmApi.request("/admin/subscriptions", { auth: "admin" });
    return data.subscriptions || [];
  }

  async function updateDbNote() {
    const note = document.getElementById("adminDbNote");
    if (!note || typeof KmmApi === "undefined" || !KmmApi.getAdminToken()) return;
    try {
      const stats = await KmmApi.request("/admin/stats", { auth: "admin" });
      note.textContent = `Database: ${stats.dbPath} · Bookings: ${stats.counts.bookings} · Subscribers: ${stats.counts.subscriptions} · Users: ${stats.counts.users} · Invoices: ${stats.counts.invoices} · Paid: ${formatMoney(stats.invoiceTotals?.paid || 0)}`;
    } catch {
      note.textContent = "Database info unavailable. Refresh the page or sign in again.";
    }
  }

  function renderSubscriptionsTable() {
    if (!subscriptionsBody) return;

    const statSubscriptions = document.getElementById("statSubscriptions");
    if (statSubscriptions) statSubscriptions.textContent = subscriptionsCache.length;

    if (!subscriptionsCache.length) {
      subscriptionsBody.innerHTML = `
        <tr class="admin-table__empty">
          <td colspan="5">No subscribers yet. Subscriptions appear when guests sign up on the website or client dashboard.</td>
        </tr>`;
      return;
    }

    subscriptionsBody.innerHTML = subscriptionsCache
      .map(
        (sub) => `
        <tr data-email="${escapeHtml(sub.email)}">
          <td>${formatDate(sub.createdAt)}</td>
          <td>${escapeHtml(sub.name || "—")}</td>
          <td class="admin-table__contact">
            <a href="mailto:${escapeHtml(sub.email)}">${escapeHtml(sub.email)}</a>
          </td>
          <td>${escapeHtml(formatInterests(sub.interests))}</td>
          <td>
            <button type="button" class="admin-btn admin-btn--danger js-delete-sub" data-email="${escapeHtml(sub.email)}">Remove</button>
          </td>
        </tr>`
      )
      .join("");

    subscriptionsBody.querySelectorAll(".js-delete-sub").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const email = btn.dataset.email;
        if (!confirm(`Remove subscription for ${email}?`)) return;
        try {
          await KmmApi.request(`/admin/subscriptions/${encodeURIComponent(email)}`, {
            method: "DELETE",
            auth: "admin",
          });
          subscriptionsCache = subscriptionsCache.filter((s) => s.email !== email);
          renderSubscriptionsTable();
        } catch (err) {
          alert(err.message || "Failed to remove subscription.");
        }
      });
    });
  }

  function downloadInvoice(inv) {
    const text = [
      "KMM Lifestyle — Invoice",
      "",
      `Invoice ID: ${inv.id}`,
      `Guest: ${inv.guestName || inv.userName || "—"}`,
      `Email: ${inv.userEmail || "—"}`,
      `Booking ID: ${inv.bookingId || "—"}`,
      `Package: ${inv.package}`,
      `Amount: ${formatAmount(inv)}`,
      `Payment: ${inv.payment === "cash" ? "Cash" : "Online"}`,
      `Status: ${formatInvoiceStatus(inv.status).label}`,
      `Date: ${formatDate(inv.createdAt)}`,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderInvoicesTable() {
    if (!invoicesBody) return;

    const statInvoices = document.getElementById("statInvoices");
    if (statInvoices) statInvoices.textContent = invoicesCache.length;
    updateInvoiceStats();

    if (!invoicesCache.length) {
      invoicesBody.innerHTML = `
        <tr class="admin-table__empty">
          <td colspan="9">No invoices yet. Invoices appear when signed-in guests make bookings.</td>
        </tr>`;
      return;
    }

    invoicesBody.innerHTML = invoicesCache
      .map((inv) => {
        const status = formatInvoiceStatus(inv.status);
        return `
        <tr data-id="${escapeHtml(inv.id)}">
          <td>${formatDate(inv.createdAt)}</td>
          <td><code class="admin-code">${escapeHtml(inv.id.slice(-10))}</code></td>
          <td class="admin-table__guest">
            <strong>${escapeHtml(inv.guestName || inv.userName || "—")}</strong>
            ${inv.userEmail ? `<span>${escapeHtml(inv.userEmail)}</span>` : ""}
          </td>
          <td>${escapeHtml(inv.package)}</td>
          <td>${escapeHtml(formatAmount(inv))}</td>
          <td>
            <span class="badge badge--${escapeHtml(inv.payment)}">${inv.payment === "cash" ? "Cash" : "Online"}</span>
          </td>
          <td>
            <span class="badge badge--invoice badge--invoice-${status.className}">${status.label}</span>
          </td>
          <td><code class="admin-code">${escapeHtml((inv.bookingId || "—").slice(-10))}</code></td>
          <td>
            <button type="button" class="admin-btn admin-btn--ghost js-download-invoice" data-id="${escapeHtml(inv.id)}">Download</button>
            ${inv.status !== "paid" ? `<button type="button" class="admin-btn admin-btn--ghost js-mark-paid" data-id="${escapeHtml(inv.id)}">Mark paid</button>` : ""}
            <button type="button" class="admin-btn admin-btn--danger js-delete-invoice" data-id="${escapeHtml(inv.id)}">Delete</button>
          </td>
        </tr>`;
      })
      .join("");

    invoicesBody.querySelectorAll(".js-download-invoice").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inv = invoicesCache.find((i) => i.id === btn.dataset.id);
        if (inv) downloadInvoice(inv);
      });
    });

    invoicesBody.querySelectorAll(".js-mark-paid").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const inv = invoicesCache.find((i) => i.id === btn.dataset.id);
        if (!inv) return;
        try {
          const res = await KmmApi.request(`/admin/invoices/${encodeURIComponent(inv.id)}`, {
            method: "PATCH",
            auth: "admin",
            body: { status: "paid" },
          });
          invoicesCache = invoicesCache.map((i) => (i.id === inv.id ? { ...i, ...res.invoice } : i));
          renderInvoicesTable();
          updateDbNote();
        } catch (err) {
          alert(err.message || "Failed to update invoice.");
        }
      });
    });

    invoicesBody.querySelectorAll(".js-delete-invoice").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const inv = invoicesCache.find((i) => i.id === btn.dataset.id);
        if (!inv) return;

        const confirmed = await confirmDeleteItem({
          title: "Delete invoice?",
          message: "This action cannot be undone. The invoice will be permanently removed.",
          detailsHtml: `
            <dt>Guest</dt><dd>${escapeHtml(inv.guestName || inv.userName || "—")}</dd>
            <dt>Package</dt><dd>${escapeHtml(inv.package)}</dd>
            <dt>Amount</dt><dd>${escapeHtml(formatAmount(inv))}</dd>
            <dt>Date</dt><dd>${formatDate(inv.createdAt)}</dd>`,
        });
        if (!confirmed) return;

        try {
          await KmmApi.request(`/admin/invoices/${encodeURIComponent(inv.id)}`, {
            method: "DELETE",
            auth: "admin",
          });
          invoicesCache = invoicesCache.filter((i) => i.id !== inv.id);
          renderInvoicesTable();
          updateDbNote();
        } catch (err) {
          if (err.status === 401) {
            alert("Session expired. Please log in again.");
            showLogin();
          } else {
            alert(err.message || "Failed to delete invoice.");
          }
        }
      });
    });
  }

  function confirmDeleteItem({ title, message, detailsHtml, fallbackMessage }) {
    return new Promise((resolve) => {
      if (!deleteConfirm || !deleteConfirmDetails) {
        resolve(window.confirm(fallbackMessage || message));
        return;
      }

      deleteConfirmResolve = resolve;
      if (deleteConfirmTitle) deleteConfirmTitle.textContent = title;
      if (deleteConfirmText) deleteConfirmText.textContent = message;
      deleteConfirmDetails.innerHTML = detailsHtml;
      deleteConfirm.hidden = false;
      deleteConfirm.setAttribute("aria-hidden", "false");
      deleteConfirmBtn?.focus();
    });
  }

  function confirmDelete(booking) {
    return confirmDeleteItem({
      title: "Delete booking?",
      message: "This action cannot be undone. The booking record will be permanently removed.",
      fallbackMessage: "Delete this booking record?",
      detailsHtml: `
        <dt>Guest</dt><dd>${escapeHtml(booking.name)}</dd>
        <dt>Package</dt><dd>${escapeHtml(booking.package)}</dd>
        <dt>Email</dt><dd>${escapeHtml(booking.email)}</dd>
        <dt>Date</dt><dd>${formatDate(booking.createdAt)}</dd>`,
    });
  }

  function closeDeleteConfirm(confirmed) {
    if (!deleteConfirm) return;
    deleteConfirm.hidden = true;
    deleteConfirm.setAttribute("aria-hidden", "true");
    if (deleteConfirmResolve) {
      deleteConfirmResolve(confirmed);
      deleteConfirmResolve = null;
    }
  }

  function renderTable() {
    updateStats();
    populatePackageFilter();

    const list = getFilteredBookings();

    if (!list.length) {
      bookingsBody.innerHTML = `
          <tr class="admin-table__empty">
            <td colspan="9">No bookings yet. Submit a booking on the main website to see it here.</td>
          </tr>`;
      return;
    }

    bookingsBody.innerHTML = list
      .map(
        (b) => `
        <tr data-id="${escapeHtml(b.id)}">
          <td>${formatDate(b.createdAt)}</td>
          <td class="admin-table__guest">
            <strong>${escapeHtml(b.name)}</strong>
            <span>${escapeHtml(b.source)}</span>
          </td>
          <td class="admin-table__contact">
            <a href="mailto:${escapeHtml(b.email)}">${escapeHtml(b.email)}</a>
            <a href="tel:${escapeHtml(b.phone)}">${escapeHtml(b.phone)}</a>
          </td>
          <td>${escapeHtml(b.package)}</td>
          <td class="admin-table__events">${formatEventTypes(b.eventTypes)}</td>
          <td>
            <span class="badge badge--${escapeHtml(b.payment)}">${b.payment === "cash" ? "Cash" : "Online"}</span>
          </td>
          <td>
            ${b.checkIn ? escapeHtml(b.checkIn) : "—"}
            ${b.checkOut ? `<br /><small>→ ${escapeHtml(b.checkOut)}</small>` : ""}
          </td>
          <td>${escapeHtml(String(b.guests || "—"))}</td>
          <td>
            <button type="button" class="admin-btn admin-btn--danger js-delete" data-id="${escapeHtml(b.id)}">Delete</button>
            ${b.notes ? `<p class="admin-table__notes">${escapeHtml(b.notes)}</p>` : ""}
          </td>
        </tr>`
      )
      .join("");

    bookingsBody.querySelectorAll(".js-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const booking = KmmBookings.getAll().find((b) => b.id === btn.dataset.id);
        if (!booking) return;

        const confirmed = await confirmDelete(booking);
        if (!confirmed) return;

        try {
          await KmmBookings.remove(btn.dataset.id);
        } catch (err) {
          if (err.status === 401) {
            alert("Session expired. Please log in again.");
            showLogin();
          } else {
            alert(err.message || "Failed to delete booking.");
          }
        }
      });
    });
  }

  async function render(options = {}) {
    if (typeof KmmBookings === "undefined" || !bookingsBody) return;

    const gen = ++renderGen;
    try {
      if (!options.skipRefresh && KmmBookings.refresh) {
        await KmmBookings.refresh({ silent: true });
        if (gen !== renderGen) return;
      }
      if (!options.skipRefresh) {
        invoicesCache = await fetchInvoices();
        if (gen !== renderGen) return;
        subscriptionsCache = await fetchSubscriptions();
        if (gen !== renderGen) return;
      }
      renderTable();
      renderInvoicesTable();
      renderSubscriptionsTable();
      updateDbNote();
    } catch (err) {
      console.error("Dashboard render error:", err);
      if (err.status === 401) {
        showLogin();
      }
    }
  }

  async function init() {
    if (typeof KmmBookings === "undefined") {
      if (loginLoadError) loginLoadError.hidden = false;
      return;
    }

    await KmmBookings.ready();

    loginForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (loginError) loginError.hidden = true;

      const passwordInput = document.getElementById("adminPassword");
      const password = passwordInput?.value || "";

      try {
        const ok = await KmmBookings.login(password);
        if (ok) showDashboard();
        else if (loginError) {
          loginError.hidden = false;
          passwordInput?.focus();
        }
      } catch {
        if (loginError) {
          loginError.textContent = "Cannot reach server. Run: cd server && npm start";
          loginError.hidden = false;
        }
      }
    });

    document.getElementById("logoutBtn")?.addEventListener("click", showLogin);
    document.getElementById("refreshBtn")?.addEventListener("click", () => render());
    document.getElementById("exportBtn")?.addEventListener("click", () => {
      KmmBookings.exportCsv(getFilteredBookings());
    });

    deleteConfirmBtn?.addEventListener("click", () => closeDeleteConfirm(true));
    deleteConfirm?.querySelectorAll("[data-confirm-cancel]").forEach((el) => {
      el.addEventListener("click", () => closeDeleteConfirm(false));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && deleteConfirm && !deleteConfirm.hidden) {
        closeDeleteConfirm(false);
      }
    });

    let searchTimer;
    searchInput?.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => render({ skipRefresh: true }), 200);
    });
    filterPayment?.addEventListener("change", () => render({ skipRefresh: true }));
    filterPackage?.addEventListener("change", () => render({ skipRefresh: true }));

    window.addEventListener("kmm-bookings-updated", () => render({ skipRefresh: true }));

    if (KmmBookings.isLoggedIn()) {
      showDashboard();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
