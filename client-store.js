/**
 * KMM Lifestyle — client accounts via API (SQLite backend).
 */
const KmmClient = (function () {
  const PACKAGE_CATALOG = [
    { id: "standard-night", name: "Standard Night Stay", price: "R750/night", amount: 750, page: "rooms.html" },
    { id: "shared-unit", name: "Shared Unit Stay", price: "R1400/night", amount: 1400, page: "rooms.html" },
    { id: "weekly", name: "Weekly Stay Package", price: "Pay Weekly", amount: 0, page: "rooms.html" },
    { id: "monthly", name: "Monthly Rental Package", price: "R8000/month", amount: 8000, page: "rooms.html" },
    { id: "safari-3", name: "3-Day Safari Adventure", price: "R199/night", amount: 597, page: "tours.html" },
    { id: "ultimate-7", name: "7-Day Ultimate Experience", price: "R189/night", amount: 1323, page: "tours.html" },
    { id: "private-event", name: "Private Event / Celebration", price: "Custom quote", amount: 0, page: "events.html" },
  ];

  let _user = null;
  let _favoriteIds = [];
  let _ready = null;
  let _useApi = false;

  function notify() {
    window.dispatchEvent(new CustomEvent("kmm-client-updated"));
  }

  async function loadFavorites() {
    if (!_useApi || !_user) {
      _favoriteIds = [];
      return;
    }
    const data = await KmmApi.request("/client/favorites", { auth: "client" });
    _favoriteIds = data.ids || [];
  }

  function ready() {
    if (!_ready) {
      _ready = (async () => {
        await KmmApi.init();
        _useApi = KmmApi.isAvailable();
        if (_useApi && KmmApi.getClientToken()) {
          try {
            const { user } = await KmmApi.request("/auth/me", { auth: "client" });
            _user = user;
            await loadFavorites();
          } catch {
            KmmApi.setClientToken("");
            _user = null;
          }
        }
        return _useApi;
      })();
    }
    return _ready;
  }

  function getCurrentUser() {
    return _user;
  }

  function offlineMessage() {
    const host = window.location.hostname;
    if (host.endsWith("github.io")) {
      return "Sign-in needs the KMM server. On your PC, open the lifestyle folder in a terminal and run: npm start — then use http://localhost:3000/dashboard.html";
    }
    return "Server is offline. In the project folder run: npm start — then open http://localhost:3000/dashboard.html";
  }

  async function ensureApi() {
    if (_useApi) return true;
    await KmmApi.checkHealth();
    _useApi = KmmApi.isAvailable();
    return _useApi;
  }

  async function register({ name, email, phone, password }) {
    if (!(await ensureApi())) return { ok: false, error: offlineMessage() };
    try {
      const res = await KmmApi.request("/auth/register", {
        method: "POST",
        body: { name, email, phone, password },
      });
      KmmApi.setClientToken(res.token);
      _user = res.user;
      await loadFavorites();
      return { ok: true, user: _user };
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message };
    }
  }

  async function login(email, password) {
    if (!(await ensureApi())) return { ok: false, error: offlineMessage() };
    try {
      const res = await KmmApi.request("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      KmmApi.setClientToken(res.token);
      _user = res.user;
      await loadFavorites();
      return { ok: true, user: _user };
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message };
    }
  }

  function logout() {
    KmmApi.setClientToken("");
    _user = null;
    _favoriteIds = [];
  }

  function isLoggedIn() {
    return !!_user;
  }

  async function updateProfile(updates) {
    if (!_user || !_useApi) return false;
    const res = await KmmApi.request("/auth/profile", {
      method: "PATCH",
      auth: "client",
      body: updates,
    });
    _user = res.user;
    notify();
    return true;
  }

  function getCatalog() {
    return PACKAGE_CATALOG;
  }

  function findCatalogItem(packageName) {
    return (
      PACKAGE_CATALOG.find((p) => p.name === packageName) ||
      PACKAGE_CATALOG.find((p) => packageName?.includes(p.name))
    );
  }

  function getFavorites() {
    return PACKAGE_CATALOG.filter((p) => _favoriteIds.includes(p.id));
  }

  function isFavorite(packageId) {
    return _favoriteIds.includes(packageId);
  }

  async function toggleFavorite(packageId) {
    if (!_user) return { ok: false, error: "Please sign in first." };
    if (!_useApi) return { ok: false, error: "Server is offline." };
    const res = await KmmApi.request(`/client/favorites/${encodeURIComponent(packageId)}`, {
      method: "POST",
      auth: "client",
    });
    if (res.favorited) _favoriteIds.push(packageId);
    else _favoriteIds = _favoriteIds.filter((id) => id !== packageId);
    notify();
    return { ok: true, favorited: res.favorited };
  }

  async function getMyBookings() {
    if (!_useApi) return [];
    if (!_user) throw new Error("Not signed in.");
    const data = await KmmApi.request("/bookings/mine", { auth: "client" });
    return data.bookings || [];
  }

  async function cancelBooking(bookingId) {
    if (!_user || !_useApi) return;
    await KmmApi.request(`/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: "PATCH",
      auth: "client",
    });
    window.dispatchEvent(new CustomEvent("kmm-bookings-updated"));
  }

  async function onBookingCreated() {
    notify();
  }

  function getLoyaltyTier(points) {
    if (points >= 3000) return { name: "Platinum", discount: "15%" };
    if (points >= 1500) return { name: "Gold", discount: "10%" };
    if (points >= 500) return { name: "Silver", discount: "5%" };
    return { name: "Bronze", discount: "0%" };
  }

  async function getLoyalty() {
    if (!_user || !_useApi) return { points: 0, tier: getLoyaltyTier(0), history: [] };
    const data = await KmmApi.request("/client/loyalty", { auth: "client" });
    return { ...data, tier: getLoyaltyTier(data.points) };
  }

  async function socialLogin(provider) {
    if (!(await ensureApi())) return { ok: false, error: offlineMessage() };
    try {
      const res = await KmmApi.request("/auth/social", {
        method: "POST",
        body: { provider },
      });
      KmmApi.setClientToken(res.token);
      _user = res.user;
      await loadFavorites();
      return { ok: true, user: _user };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function getInvoices() {
    if (!_useApi) return [];
    if (!_user) throw new Error("Not signed in.");
    const data = await KmmApi.request("/client/invoices", { auth: "client" });
    return data.invoices || [];
  }

  async function getSubscription() {
    if (!_useApi) return { subscription: null, email: _user?.email || "", name: _user?.name || "" };
    if (!_user) throw new Error("Not signed in.");
    return KmmApi.request("/client/subscription", { auth: "client" });
  }

  async function saveSubscription({ name, interests }) {
    if (!_user || !_useApi) return { ok: false, error: "Not signed in." };
    try {
      const res = await KmmApi.request("/client/subscription", {
        method: "POST",
        auth: "client",
        body: { name, interests },
      });
      notify();
      return { ok: true, subscription: res.subscription };
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message };
    }
  }

  async function unsubscribe() {
    if (!_user || !_useApi) return { ok: false, error: "Not signed in." };
    try {
      await KmmApi.request("/client/subscription", { method: "DELETE", auth: "client" });
      notify();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message };
    }
  }

  return {
    PACKAGE_CATALOG,
    ready,
    getCatalog,
    register,
    login,
    logout,
    isLoggedIn,
    getCurrentUser,
    updateProfile,
    getFavorites,
    isFavorite,
    toggleFavorite,
    getMyBookings,
    cancelBooking,
    onBookingCreated,
    findCatalogItem,
    getLoyalty,
    socialLogin,
    getInvoices,
    getSubscription,
    saveSubscription,
    unsubscribe,
  };
})();
