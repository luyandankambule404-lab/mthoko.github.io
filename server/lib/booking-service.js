const { parseBooking, parseRoom } = require("./parsers");
const { DEFAULT_ROOMS, PACKAGE_TO_ROOM } = require("./room-catalog");
const { notifyBookingCreated, notifyBookingStatus } = require("./email");
const { calculatePricing, formatZar } = require("./pricing");

/** Statuses that block room inventory */
const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "checked_in"];

const ALL_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "rejected",
];

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateBookingReference(db) {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KMM-${y}${m}${d}-${suffix}`;
}

function resolveRoomId(data) {
  if (data.roomId) return data.roomId;
  if (data.package && PACKAGE_TO_ROOM[data.package]) return PACKAGE_TO_ROOM[data.package];
  return "";
}

async function getRooms(db, { activeOnly = true } = {}) {
  const roomService = require("./room-service");
  return roomService.listRooms(db, { activeOnly });
}

async function getRoomById(db, roomId) {
  const row = await db.get("SELECT * FROM rooms WHERE id = ?", [roomId]);
  return parseRoom(row);
}

async function getRoomByPackage(db, packageName) {
  const roomId = PACKAGE_TO_ROOM[packageName];
  if (!roomId) return null;
  return getRoomById(db, roomId);
}

async function countOverlappingBookings(db, roomId, checkIn, checkOut, excludeBookingId) {
  let sql = `
    SELECT COUNT(*) AS cnt FROM bookings
    WHERE room_id = ?
    AND status IN ('pending', 'confirmed')
    AND check_in < ?
    AND check_out > ?
  `;
  const params = [roomId, checkOut, checkIn];
  if (excludeBookingId) {
    sql += " AND id != ?";
    params.push(excludeBookingId);
  }
  const row = await db.get(sql, params);
  return Number(row?.cnt || 0);
}

async function checkAvailability(db, { roomId, packageName, checkIn, checkOut, guests, excludeBookingId }) {
  const resolvedRoomId = roomId || PACKAGE_TO_ROOM[packageName] || "";
  if (!resolvedRoomId) {
    return { available: true, room: null, reason: "no_room_mapping" };
  }
  if (!checkIn || !checkOut) {
    return { available: false, room: null, reason: "dates_required" };
  }
  if (checkOut <= checkIn) {
    return { available: false, room: null, reason: "invalid_dates" };
  }

  const room = await getRoomById(db, resolvedRoomId);
  if (!room || !room.active) {
    return { available: false, room, reason: "room_not_found" };
  }
  if (Number(guests || 1) > room.maxGuests) {
    return { available: false, room, reason: "too_many_guests", maxGuests: room.maxGuests };
  }

  const booked = await countOverlappingBookings(db, resolvedRoomId, checkIn, checkOut, excludeBookingId);
  const available = booked < room.totalUnits;

  return {
    available,
    room,
    bookedUnits: booked,
    totalUnits: room.totalUnits,
    reason: available ? "ok" : "fully_booked",
  };
}

async function getBookingByReference(db, reference) {
  const row = await db.get(
    `SELECT b.*, r.name AS room_name
     FROM bookings b
     LEFT JOIN rooms r ON r.id = b.room_id
     WHERE b.booking_reference = ? OR b.id = ?`,
    [reference, reference]
  );
  return parseBooking(row);
}

async function getBookingById(db, id) {
  const row = await db.get(
    `SELECT b.*, r.name AS room_name
     FROM bookings b
     LEFT JOIN rooms r ON r.id = b.room_id
     WHERE b.id = ?`,
    [id]
  );
  return parseBooking(row);
}

async function searchAvailableRooms(db, { checkIn, checkOut, guests, maxPrice }) {
  if (!checkIn || !checkOut) {
    return { rooms: [], reason: "dates_required" };
  }
  if (checkOut <= checkIn) {
    return { rooms: [], reason: "invalid_dates" };
  }

  const roomService = require("./room-service");
  const rooms = await roomService.listRooms(db, { activeOnly: true });
  const guestCount = Number(guests || 1);
  const results = [];

  for (const room of rooms) {
    if (maxPrice && room.pricePerNight > Number(maxPrice)) continue;
    const availability = await checkAvailability(db, {
      roomId: room.id,
      checkIn,
      checkOut,
      guests: guestCount,
    });
    if (!availability.available) continue;

    const pricing = calculatePricing({ room, checkIn, checkOut });
    results.push({
      ...room,
      available: true,
      bookedUnits: availability.bookedUnits,
      totalUnits: availability.totalUnits,
      pricing,
    });
  }

  results.sort((a, b) => (a.pricing?.totalAmount || 0) - (b.pricing?.totalAmount || 0));
  return { rooms: results, checkIn, checkOut, guests: guestCount };
}

async function getBookingQuote(
  db,
  { roomId, packageName, checkIn, checkOut, guests, discountAmount, couponCode, userId }
) {
  const resolvedRoomId = roomId || PACKAGE_TO_ROOM[packageName] || "";
  const availability = await checkAvailability(db, {
    roomId: resolvedRoomId,
    packageName,
    checkIn,
    checkOut,
    guests,
  });
  const room = availability.room || (resolvedRoomId ? await getRoomById(db, resolvedRoomId) : null);

  let totalDiscount = Number(discountAmount) || 0;
  let coupon = null;

  if (couponCode && room && checkIn && checkOut) {
    const { validateCoupon } = require("./coupon-service");
    const prelim = calculatePricing({ room, checkIn, checkOut, discountAmount: 0 });
    const validated = await validateCoupon(db, couponCode, {
      subtotal: prelim.subtotal,
      userId,
    });
    if (validated.valid) {
      totalDiscount += validated.discountAmount;
      coupon = validated;
    } else {
      coupon = { valid: false, error: validated.error };
    }
  }

  const pricing =
    room && checkIn && checkOut
      ? calculatePricing({
          room,
          checkIn,
          checkOut,
          discountAmount: totalDiscount,
          couponCode: coupon?.code || couponCode || "",
        })
      : null;

  return { availability, pricing, coupon };
}

async function listBookings(db) {
  const rows = await db.all(
    `SELECT b.*, r.name AS room_name
     FROM bookings b
     LEFT JOIN rooms r ON r.id = b.room_id
     ORDER BY b.created_at DESC`
  );
  return rows.map(parseBooking);
}

async function createBooking(db, data) {
  const roomId = resolveRoomId(data);
  const room = roomId ? await getRoomById(db, roomId) : null;
  const checkIn = data.checkIn || "";
  const checkOut = data.checkOut || "";

  if (roomId && checkIn && checkOut) {
    const availability = await checkAvailability(db, {
      roomId,
      checkIn,
      checkOut,
      guests: data.guests,
    });
    if (!availability.available) {
      const err = new Error(
        availability.reason === "too_many_guests"
          ? `This room allows a maximum of ${availability.maxGuests} guests.`
          : "Selected dates are not available for this room. Please choose different dates."
      );
      err.code = "NOT_AVAILABLE";
      err.details = availability;
      throw err;
    }
  } else if (roomId && checkIn && !checkOut) {
    const err = new Error("Check-out date is required for accommodation bookings.");
    err.code = "CHECKOUT_REQUIRED";
    throw err;
  }

  let bookingReference = generateBookingReference(db);
  for (let i = 0; i < 5; i += 1) {
    const exists = await db.get("SELECT id FROM bookings WHERE booking_reference = ?", [bookingReference]);
    if (!exists) break;
    bookingReference = generateBookingReference(db);
  }

  const id = newId("b");
  const createdAt = new Date().toISOString();
  const eventTypes = JSON.stringify(
    Array.isArray(data.eventTypes) ? data.eventTypes : data.eventTypes ? [data.eventTypes] : []
  );
  const status = data.status || "pending";

  let couponId = data.couponId || data.coupon_id || "";
  let discountAmount = Number(data.discountAmount) || 0;

  if (data.couponCode && room && checkIn && checkOut) {
    const { validateCoupon, redeemCoupon } = require("./coupon-service");
    const prelim = calculatePricing({ room, checkIn, checkOut, discountAmount: 0 });
    const validated = await validateCoupon(db, data.couponCode, {
      subtotal: prelim.subtotal,
      userId: data.userId,
    });
    if (!validated.valid) {
      const err = new Error(validated.error || "Invalid coupon.");
      err.code = "INVALID_COUPON";
      throw err;
    }
    discountAmount += validated.discountAmount;
    couponId = validated.couponId;
  }

  const pricing =
    room && checkIn && checkOut
      ? calculatePricing({
          room,
          checkIn,
          checkOut,
          discountAmount,
          couponCode: data.couponCode,
        })
      : null;

  const price =
    data.price ||
    pricing?.priceLabel ||
    (room?.pricePerNight ? `${formatZar(room.pricePerNight)}/night` : "") ||
    "";

  await db.run(
    `INSERT INTO bookings (
      id, booking_reference, created_at, source, package, room_id, price, payment,
      name, email, phone, check_in, check_out, guests, notes, event_types, user_id, status,
      subtotal, tax_amount, fee_amount, discount_amount, total_amount, coupon_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      bookingReference,
      createdAt,
      data.source || "website",
      data.package || room?.name || "",
      roomId,
      price,
      data.payment || "online",
      data.name || "",
      data.email || "",
      data.phone || "",
      checkIn,
      checkOut,
      String(data.guests || ""),
      data.notes || "",
      eventTypes,
      data.userId || "",
      status,
      pricing?.subtotal ?? 0,
      pricing?.taxAmount ?? 0,
      pricing?.feeAmount ?? 0,
      pricing?.discountAmount ?? 0,
      pricing?.totalAmount ?? 0,
      couponId,
    ]
  );

  const booking = await getBookingById(db, id);

  if (couponId && data.userId) {
    try {
      const { redeemCoupon } = require("./coupon-service");
      await redeemCoupon(db, couponId, data.userId, id);
    } catch (err) {
      console.warn("Coupon redeem failed:", err.message);
    }
  }
  notifyBookingCreated(booking).catch((err) => console.warn("Email notify failed:", err.message));

  try {
    const { createPaymentForBooking } = require("./payment-service");
    await createPaymentForBooking(db, booking);
  } catch (err) {
    console.warn("Payment record creation failed:", err.message);
  }

  if (booking.userId) {
    try {
      const { createNotification } = require("./notification-service");
      await createNotification(db, booking.userId, {
        type: "booking",
        title: "Booking received",
        body: `Your request ${booking.bookingReference} is pending approval.`,
      });
    } catch (err) {
      console.warn("Notification failed:", err.message);
    }
  }

  return booking;
}

async function updateBookingStatus(db, id, status) {
  if (!ALL_STATUSES.includes(status)) {
    throw new Error("Invalid booking status.");
  }
  const existing = await getBookingById(db, id);
  if (!existing) return null;

  const terminalFrom = ["cancelled", "rejected", "checked_out"];
  if (terminalFrom.includes(existing.status) && status !== existing.status) {
    throw new Error(`Cannot change status from ${existing.status}.`);
  }

  if (status === "confirmed" && existing.roomId && existing.checkIn && existing.checkOut) {
    const availability = await checkAvailability(db, {
      roomId: existing.roomId,
      checkIn: existing.checkIn,
      checkOut: existing.checkOut,
      guests: existing.guests,
      excludeBookingId: id,
    });
    if (!availability.available) {
      const err = new Error("Cannot confirm — room is no longer available for these dates.");
      err.code = "NOT_AVAILABLE";
      throw err;
    }
  }

  const now = new Date().toISOString();
  let sql = "UPDATE bookings SET status = ?";
  const params = [status];

  if (status === "checked_in") {
    sql += ", checked_in_at = ?";
    params.push(now);
  }
  if (status === "checked_out") {
    sql += ", checked_out_at = ?";
    params.push(now);
  }

  sql += " WHERE id = ?";
  params.push(id);

  await db.run(sql, params);
  const booking = await getBookingById(db, id);
  notifyBookingStatus(booking, existing.status).catch((err) => console.warn("Email notify failed:", err.message));

  if (booking.userId && status !== existing.status) {
    try {
      const { createNotification } = require("./notification-service");
      const labels = {
        confirmed: "confirmed",
        checked_in: "checked in",
        checked_out: "checked out",
        cancelled: "cancelled",
        rejected: "not approved",
      };
      const label = labels[status] || status;
      await createNotification(db, booking.userId, {
        type: "booking",
        title: `Booking ${label}`,
        body: `${booking.bookingReference} — ${booking.roomName || booking.package}`,
      });
    } catch (err) {
      console.warn("Notification failed:", err.message);
    }
  }

  return booking;
}

async function upsertRoom(db, room) {
  const existing = await db.get("SELECT id FROM rooms WHERE id = ?", [room.id]);
  const amenities = JSON.stringify(room.amenities || []);
  if (existing) {
    await db.run(
      `UPDATE rooms SET slug = ?, name = ?, description = ?, room_type = ?, price_per_night = ?,
       max_guests = ?, total_units = ?, amenities = ?, image_url = ?, active = ?, sort_order = ?
       WHERE id = ?`,
      [
        room.slug,
        room.name,
        room.description || "",
        room.roomType || room.room_type || "",
        room.pricePerNight ?? room.price_per_night ?? 0,
        room.maxGuests ?? room.max_guests ?? 2,
        room.totalUnits ?? room.total_units ?? 1,
        amenities,
        room.imageUrl || room.image_url || "",
        room.active === false ? 0 : 1,
        room.sortOrder ?? room.sort_order ?? 0,
        room.id,
      ]
    );
  } else {
    await db.run(
      `INSERT INTO rooms (
        id, slug, name, description, room_type, price_per_night, max_guests, total_units,
        amenities, image_url, active, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        room.id,
        room.slug,
        room.name,
        room.description || "",
        room.roomType || room.room_type || "",
        room.pricePerNight ?? room.price_per_night ?? 0,
        room.maxGuests ?? room.max_guests ?? 2,
        room.totalUnits ?? room.total_units ?? 1,
        amenities,
        room.imageUrl || room.image_url || "",
        room.active === false ? 0 : 1,
        room.sortOrder ?? room.sort_order ?? 0,
        new Date().toISOString(),
      ]
    );
  }
  return getRoomById(db, room.id);
}

async function seedRooms(db) {
  for (const room of DEFAULT_ROOMS) {
    const existing = await db.get("SELECT id FROM rooms WHERE id = ?", [room.id]);
    if (!existing) {
      await db.run(
        `INSERT INTO rooms (
          id, slug, name, description, room_type, price_per_night, max_guests, total_units,
          amenities, image_url, active, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          room.id,
          room.slug,
          room.name,
          room.description,
          room.room_type,
          room.price_per_night,
          room.max_guests,
          room.total_units,
          room.amenities,
          room.image_url || "",
          room.sort_order,
          new Date().toISOString(),
        ]
      );
    }
  }
}

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  ALL_STATUSES,
  PACKAGE_TO_ROOM,
  generateBookingReference,
  getRooms,
  getRoomById,
  getRoomByPackage,
  checkAvailability,
  searchAvailableRooms,
  getBookingQuote,
  getBookingByReference,
  getBookingById,
  listBookings,
  createBooking,
  updateBookingStatus,
  upsertRoom,
  seedRooms,
};
