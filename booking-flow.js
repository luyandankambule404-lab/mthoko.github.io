/**
 * Shared booking flow — search with dates, show totals, open modal with stay pre-filled.
 * Used by rooms and room detail pages.
 */
const KmmBookingFlow = (function () {
  const STAY_FIELD_GROUPS = [
    ["roomSearchCheckIn", "roomSearchCheckOut", "roomSearchGuests"],
    ["detailCheckIn", "detailCheckOut", "detailGuests"],
  ];

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  function readStayFromPage() {
    for (const [checkInId, checkOutId, guestsId] of STAY_FIELD_GROUPS) {
      const checkIn = document.getElementById(checkInId)?.value || "";
      const checkOut = document.getElementById(checkOutId)?.value || "";
      if (checkIn && checkOut) {
        return {
          checkIn,
          checkOut,
          guests: document.getElementById(guestsId)?.value || "2",
        };
      }
    }
    return { checkIn: "", checkOut: "", guests: "2" };
  }

  function pricingLabel(room) {
    if (room.pricing?.totalAmount) {
      const nights = room.pricing.nights ? `${room.pricing.nights} night(s)` : "";
      const total = `R${Math.round(room.pricing.totalAmount).toLocaleString("en-ZA")} total`;
      return { total, nights };
    }
    if (room.pricePerNight) {
      const suffix = /month/i.test(room.roomType || room.name) ? "/month" : "/night";
      return { total: `R${room.pricePerNight}${suffix}`, nights: "" };
    }
    return { total: "Custom quote", nights: "" };
  }

  function renderResultCard(room, stay) {
    const { checkIn, checkOut, guests } = stay;
    const img = room.imageUrl
      ? `<img src="${escapeHtml(room.imageUrl)}" alt="" class="book-result-card__img" loading="lazy" />`
      : "";
    const { total, nights } = pricingLabel(room);
    return `
      <article class="book-result-card">
        ${img}
        <div class="book-result-card__body">
          <span class="room-card__type">${escapeHtml(room.roomType || "")}</span>
          <h3>${escapeHtml(room.name)}</h3>
          <p>${escapeHtml(room.description)}</p>
          <p class="book-result-card__meta">Up to ${room.maxGuests} guests · ${escapeHtml(nights)}</p>
          <p class="book-result-card__price">${escapeHtml(total)}</p>
          <button type="button" class="btn btn--primary btn--block js-book-select"
            data-room-id="${escapeHtml(room.id)}"
            data-package="${escapeHtml(room.name)}"
            data-check-in="${escapeHtml(checkIn)}"
            data-check-out="${escapeHtml(checkOut)}"
            data-guests="${escapeHtml(String(guests))}">Book this room</button>
        </div>
      </article>`;
  }

  function renderResultsGrid(rooms, stay, emptyMessage) {
    if (!rooms.length) {
      return `<p class="book-search-empty">${escapeHtml(
        emptyMessage || "No rooms available for these dates. Try different dates or fewer guests."
      )}</p>`;
    }
    return `<div class="book-search-results">${rooms.map((r) => renderResultCard(r, stay)).join("")}</div>`;
  }

  function bookPageUrl({ roomId, checkIn, checkOut, guests, package: packageName } = {}) {
    const q = new URLSearchParams();
    if (roomId) q.set("roomId", roomId);
    if (packageName) q.set("package", packageName);
    if (checkIn) q.set("checkIn", checkIn);
    if (checkOut) q.set("checkOut", checkOut);
    if (guests) q.set("guests", guests);
    const qs = q.toString();
    return qs ? `rooms.html?${qs}` : "rooms.html";
  }

  async function openRoomBooking(opts = {}) {
    const roomId = opts.roomId || "";
    const packageName = opts.package || opts.packageName || "";
    const price = opts.price || "";
    const eventType = opts.event || opts.eventType || "";
    let { checkIn, checkOut, guests } = opts;

    if (!checkIn || !checkOut) {
      const fromPage = readStayFromPage();
      checkIn = checkIn || fromPage.checkIn;
      checkOut = checkOut || fromPage.checkOut;
      guests = guests || fromPage.guests;
    }

    if (roomId && (!checkIn || !checkOut)) {
      window.location.href = `room-detail.html?id=${encodeURIComponent(roomId)}`;
      return;
    }

    if (!window.KmmBookingUI?.openBookingModal) {
      window.location.href = bookPageUrl({ roomId, checkIn, checkOut, guests, package: packageName });
      return;
    }

    await window.KmmBookingUI.openBookingModal(packageName, price, eventType, roomId, {
      checkIn,
      checkOut,
      guests,
    });
  }

  function bindSelectButtons(root, fallbackStay) {
    if (!root) return;
    root.querySelectorAll(".js-book-select").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openRoomBooking({
          roomId: btn.dataset.roomId,
          package: btn.dataset.package,
          checkIn: btn.dataset.checkIn || fallbackStay?.checkIn,
          checkOut: btn.dataset.checkOut || fallbackStay?.checkOut,
          guests: btn.dataset.guests || fallbackStay?.guests,
        });
      });
    });
  }

  function setMinStayDates(ids = ["roomSearchCheckIn", "roomSearchCheckOut", "detailCheckIn", "detailCheckOut"]) {
    const today = new Date().toISOString().slice(0, 10);
    ids.forEach((id) => document.getElementById(id)?.setAttribute("min", today));
  }

  return {
    escapeHtml,
    readStayFromPage,
    pricingLabel,
    renderResultCard,
    renderResultsGrid,
    bookPageUrl,
    openRoomBooking,
    bindSelectButtons,
    setMinStayDates,
  };
})();
