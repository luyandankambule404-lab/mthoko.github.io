/**
 * KMM Lifestyle — bookings via API (SQLite backend).
 */
const KmmBookings = (function () {
  let _bookings = [];
  let _ready = null;
  let _useApi = false;

  function notify() {
    window.dispatchEvent(new CustomEvent("kmm-bookings-updated"));
  }

  async function refresh(options = {}) {
    if (!_useApi) return _bookings;
    const data = await KmmApi.request("/bookings", { auth: "admin" });
    _bookings = data.bookings || [];
    if (!options.silent) notify();
    return _bookings;
  }

  function ready() {
    if (!_ready) {
      _ready = (async () => {
        const ok = await KmmApi.init();
        _useApi = KmmApi.isAvailable();
        if (_useApi && KmmApi.getAdminToken()) {
          await refresh();
        }
        return _useApi;
      })();
    }
    return _ready;
  }

  async function saveBooking(data) {
    const payload = {
      source: data.source || "website",
      package: data.package || "",
      price: data.price || "",
      payment: data.payment || "online",
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      checkIn: data.checkIn || "",
      checkOut: data.checkOut || "",
      guests: data.guests || "",
      notes: data.notes || "",
      eventTypes: data.eventTypes || [],
      userId: data.userId || "",
      status: data.status || "confirmed",
    };

    if (!_useApi) {
      const booking = {
        id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        ...payload,
        eventTypes: payload.eventTypes,
      };
      _bookings.unshift(booking);
      notify();
      if (typeof KmmClient !== "undefined" && KmmClient.isLoggedIn()) {
        await KmmClient.attachBookingToUser(booking, data);
      }
      return booking;
    }

    const res = await KmmApi.request("/bookings", {
      method: "POST",
      body: payload,
      auth: KmmApi.getClientToken() ? "client" : "none",
    });
    const booking = res.booking;
    if (KmmApi.getAdminToken()) {
      _bookings.unshift(booking);
      notify();
    }
    if (typeof KmmClient !== "undefined" && KmmClient.isLoggedIn()) {
      await KmmClient.onBookingCreated(booking);
    }
    return booking;
  }

  function getAll() {
    return [..._bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async function remove(id) {
    if (_useApi) {
      await KmmApi.request(`/bookings/${encodeURIComponent(id)}`, {
        method: "DELETE",
        auth: "admin",
      });
      _bookings = _bookings.filter((b) => b.id !== id);
      notify();
      return;
    }
    _bookings = _bookings.filter((b) => b.id !== id);
    notify();
  }

  async function clearAll() {
    if (_useApi) {
      await KmmApi.request("/bookings", { method: "DELETE", auth: "admin" });
      _bookings = [];
      notify();
      return;
    }
    _bookings = [];
    notify();
  }

  function getStats(bookings) {
    const list = bookings || getAll();
    const today = new Date().toDateString();
    return {
      total: list.length,
      online: list.filter((b) => b.payment === "online").length,
      cash: list.filter((b) => b.payment === "cash").length,
      today: list.filter((b) => new Date(b.createdAt).toDateString() === today).length,
    };
  }

  async function login(password) {
    if (!_useApi) {
      const ADMIN_PASSWORD = "kmmadmin2025";
      if (String(password || "").trim() === ADMIN_PASSWORD) {
        sessionStorage.setItem("kmm_admin_legacy", "1");
        return true;
      }
      return false;
    }
    const res = await KmmApi.request("/admin/login", {
      method: "POST",
      body: { password },
    });
    KmmApi.setAdminToken(res.token);
    await refresh();
    return true;
  }

  function logout() {
    KmmApi.setAdminToken("");
    sessionStorage.removeItem("kmm_admin_legacy");
    _bookings = [];
  }

  function isLoggedIn() {
    if (_useApi) return !!KmmApi.getAdminToken();
    return sessionStorage.getItem("kmm_admin_legacy") === "1";
  }

  function exportCsv(bookings) {
    const list = bookings || getAll();
    const headers = [
      "Date",
      "Name",
      "Email",
      "Phone",
      "Package",
      "Payment",
      "Check-in",
      "Check-out",
      "Guests",
      "Source",
      "Event Types",
      "Notes",
    ];
    const rows = list.map((b) => [
      new Date(b.createdAt).toLocaleString("en-ZA"),
      b.name,
      b.email,
      b.phone,
      b.package,
      b.payment === "cash" ? "Cash" : "Online",
      b.checkIn,
      b.checkOut,
      b.guests,
      b.source,
      (Array.isArray(b.eventTypes) ? b.eventTypes.join("; ") : b.eventTypes || "").replace(/"/g, '""'),
      (b.notes || "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kmm-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    ready,
    refresh,
    saveBooking,
    getAll,
    remove,
    clearAll,
    getStats,
    login,
    logout,
    isLoggedIn,
    exportCsv,
  };
})();
