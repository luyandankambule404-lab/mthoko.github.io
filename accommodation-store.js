/**
 * KMM Rooms store + real-time availability against /api/bookings/availability.
 */
const KmmRooms = (function () {
  const ROOMS = [
    {
      id: "standard-night",
      name: "Standard Night Stay",
      roomType: "Luxury Stay",
      description: "Ideal for solo or couple travelers.",
      pricePerNight: 750,
      totalUnits: 8,
      maxGuests: 2,
      packageAliases: ["Standard Night Stay"],
      imageUrl: "images/IMG-20260527-WA0011.jpg",
      active: true,
    },
    {
      id: "shared-unit",
      name: "Shared Unit Stay",
      roomType: "Shared Stay",
      description: "Great for friends or work teams.",
      pricePerNight: 1400,
      totalUnits: 6,
      maxGuests: 4,
      packageAliases: ["Shared Unit Stay"],
      imageUrl: "images/IMG-20260527-WA0012.jpg",
      active: true,
    },
    {
      id: "weekly-stay",
      name: "Weekly Stay Package",
      roomType: "Weekly Package",
      description: "Hassle-free extended stays.",
      pricePerNight: 750,
      totalUnits: 2,
      maxGuests: 2,
      packageAliases: ["Weekly Stay Package"],
      imageUrl: "images/IMG-20260527-WA0013.jpg",
      active: true,
    },
    {
      id: "monthly-rental",
      name: "Monthly Rental Package",
      roomType: "Monthly Package",
      description: "Exclusive deal for bulk stays.",
      pricePerNight: 8000,
      totalUnits: 2,
      maxGuests: 4,
      packageAliases: ["Monthly Rental Package"],
      imageUrl: "images/IMG-20260527-WA0014.jpg",
      active: true,
    },
    {
      id: "safari-3day",
      name: "3-Day Safari Adventure",
      roomType: "Safari Package",
      description: "Guided 3-day safari experience.",
      pricePerNight: 597,
      totalUnits: 6,
      maxGuests: 6,
      packageAliases: ["3-Day Safari Adventure"],
      imageUrl: "images/IMG-20260527-WA0011.jpg",
      active: true,
    },
    {
      id: "safari-7day",
      name: "7-Day Ultimate Experience",
      roomType: "Safari Package",
      description: "Full week safari package.",
      pricePerNight: 1323,
      totalUnits: 4,
      maxGuests: 6,
      packageAliases: ["7-Day Ultimate Experience"],
      imageUrl: "images/IMG-20260527-WA0012.jpg",
      active: true,
    },
    {
      id: "private-event",
      name: "Private Event / Celebration",
      roomType: "Private Event",
      description: "Venue hire for private celebrations.",
      pricePerNight: 0,
      totalUnits: 2,
      maxGuests: 120,
      packageAliases: ["Private Event / Celebration"],
      imageUrl: "images/IMG-20260527-WA0013.jpg",
      active: true,
    },
  ];

  const byId = new Map(ROOMS.map((r) => [r.id, r]));
  let _ready = null;

  function nightsBetween(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(`${checkIn}T12:00:00`);
    const b = new Date(`${checkOut}T12:00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
    const days = Math.round((b - a) / 86400000);
    return Math.max(0, days);
  }

  function getById(id) {
    const key = String(id || "").trim();
    if (!key) return null;
    return byId.get(key) || null;
  }

  function resolveRoom({ roomId, packageName } = {}) {
    const id = String(roomId || "").trim();
    if (id) {
      const byKey = getById(id);
      if (byKey) return byKey;
    }
    const byPackage = getByPackageName(packageName);
    if (byPackage) return byPackage;
    return null;
  }

  function getAll() {
    return ROOMS.slice();
  }

  function getByPackageName(packageName) {
    const name = String(packageName || "").trim().toLowerCase();
    if (!name) return null;
    return (
      ROOMS.find((r) => r.name.toLowerCase() === name) ||
      ROOMS.find((r) => (r.packageAliases || []).some((p) => p.toLowerCase() === name)) ||
      null
    );
  }

  async function ready() {
    if (!_ready) {
      _ready = (async () => {
        if (typeof KmmApi !== "undefined") {
          await KmmApi.init();
        }
        return true;
      })();
    }
    return _ready;
  }

  async function checkAvailability({ roomId, packageName, checkIn, checkOut, guests }) {
    const room = resolveRoom({ roomId, packageName });
    if (!room) return { available: false, reason: "room_not_found", roomId: roomId || "" };
    if (!checkIn || !checkOut) return { available: false, reason: "dates_required", roomId: room.id };
    if (checkOut <= checkIn) return { available: false, reason: "invalid_dates", roomId: room.id };
    if (Number(guests || 1) > Number(room.maxGuests || 1)) {
      return { available: false, reason: "too_many_guests", roomId: room.id, maxGuests: room.maxGuests };
    }

    if (typeof KmmApi === "undefined") return { available: true, reason: "offline", roomId: room.id };
    await KmmApi.init();
    if (!KmmApi.isAvailable()) return { available: true, reason: "offline", roomId: room.id };

    const q = new URLSearchParams({
      roomId: room.id,
      checkIn,
      checkOut,
      guests: String(guests || 1),
      maxGuests: String(room.maxGuests || 1),
      totalUnits: String(room.totalUnits || 1),
    });
    try {
      const res = await KmmApi.request(`/bookings/availability?${q.toString()}`);
      const available = res.available === true || res.available === "true";
      return {
        ...res,
        available,
        reason: res.reason || (available ? "ok" : "fully_booked"),
        roomId: room.id,
        maxGuests: room.maxGuests,
        totalUnits: room.totalUnits,
      };
    } catch (err) {
      console.warn("Availability check failed:", err.message || err);
      return { available: true, reason: "offline", roomId: room.id };
    }
  }

  async function getQuote({ roomId, packageName, checkIn, checkOut, guests, couponCode }) {
    const room = resolveRoom({ roomId, packageName });
    if (!room) return { pricing: null, coupon: null };
    const availability = await checkAvailability({ roomId: room.id, packageName: room.name, checkIn, checkOut, guests });
    if (!availability.available && availability.reason !== "offline") {
      return { availability, pricing: null, coupon: null };
    }

    const nights = nightsBetween(checkIn, checkOut) || 1;
    const subtotal = nights * Number(room.pricePerNight || 0);
    const discountAmount = couponCode && couponCode.trim().toUpperCase() === "WELCOME10"
      ? Math.round(subtotal * 0.1)
      : 0;
    const totalAmount = Math.max(0, subtotal - discountAmount);
    const breakdown = [
      { label: `${nights} night(s) x R${room.pricePerNight}`, amount: subtotal },
    ];
    if (discountAmount > 0) breakdown.push({ label: "Coupon discount", amount: -discountAmount });
    breakdown.push({ label: "Total", amount: totalAmount, emphasis: true });

    return {
      availability,
      pricing: { nights, subtotal, discountAmount, totalAmount, breakdown },
      coupon: discountAmount > 0 ? { valid: true, code: "WELCOME10" } : null,
    };
  }

  async function searchRooms(params = {}) {
    const checkIn = params.checkIn || "";
    const checkOut = params.checkOut || "";
    const guests = Number(params.guests || 1);
    const filtered = ROOMS.filter((r) => r.active !== false);
    const withAvailability = await Promise.all(
      filtered.map(async (room) => {
        if (!checkIn || !checkOut) return { ...room };
        const availability = await checkAvailability({ roomId: room.id, checkIn, checkOut, guests });
        if (!availability.available && availability.reason !== "offline") return null;
        const quote = await getQuote({ roomId: room.id, checkIn, checkOut, guests });
        return { ...room, availability, pricing: quote.pricing };
      })
    );

    return { rooms: withAvailability.filter(Boolean) };
  }

  async function fetchRoom(roomId) {
    await ready();
    return getById(roomId);
  }

  async function getCalendar(roomId, baseDate = new Date()) {
    const room = getById(roomId);
    if (!room) return null;
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const next = new Date(year, month - 1, day + 1);
      const checkOut = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(
        next.getDate()
      ).padStart(2, "0")}`;
      const av = await checkAvailability({ roomId: room.id, checkIn: date, checkOut, guests: 1 });
      days.push({ date, available: av.available || av.reason === "offline" });
    }
    return { year, month, days };
  }

  return {
    ready,
    getAll,
    getById,
    resolveRoom,
    getByPackageName,
    checkAvailability,
    getQuote,
    searchRooms,
    fetchRoom,
    getCalendar,
  };
})();

window.KmmRooms = KmmRooms;
