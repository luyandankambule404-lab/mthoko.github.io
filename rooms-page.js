/**
 * Dynamic rooms grid — book flow matches book.html when dates are set.
 * Dynamic rooms grid — search with dates, book via modal.
(function () {
  const grid = document.querySelector(".rooms__grid") || document.getElementById("roomsGrid");
  const form = document.getElementById("roomSearchForm");
  if (!grid) return;

  KmmBookingFlow?.setMinStayDates?.();

  function escapeHtml(str) {
    return KmmBookingFlow?.escapeHtml(str) || String(str || "");
  }

  function readSearchStay() {
    return {
      checkIn: document.getElementById("roomSearchCheckIn")?.value || "",
      checkOut: document.getElementById("roomSearchCheckOut")?.value || "",
      guests: document.getElementById("roomSearchGuests")?.value || "2",
    };
  }

  function formatPrice(room) {
    if (!room.pricePerNight) return "Custom quote";
    const isMonthly = /month/i.test(room.roomType || room.name);
    return `R${room.pricePerNight}<small>${isMonthly ? "/month" : "/night"}</small>`;
  }

  function featureList(room) {
    if (room.amenityList?.length) {
      return room.amenityList.map((a) => `<li>${escapeHtml(a.name)}</li>`).join("");
    }
    return (room.amenities || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  }

  function renderBrowseCard(room, index) {
    const imgUrl = room.imageUrl;
    const imgOpts = {
      webpUrl: room.imageWebpUrl || room.webpUrl || null,
      thumbUrl: room.thumbUrl || null,
    };
    const img =
      typeof KmmImages !== "undefined" && imgUrl
        ? `<div class="room-card__media">${KmmImages.roomImage(imgUrl, room.name, "", imgOpts)}</div>`
        : imgUrl
          ? `<div class="room-card__media"><img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(room.name)}" loading="lazy" decoding="async" /></div>`
          : "";
    const featured = index === 1 ? '<span class="room-card__badge">Popular</span>' : "";
    const priceLabel = formatPrice(room);
    const rating =
      room.avgRating > 0
        ? `<p class="room-card__rating">★ ${room.avgRating} (${room.reviewCount} review${room.reviewCount !== 1 ? "s" : ""})</p>`
        : "";
    const bookHref = KmmBookingFlow.bookPageUrl({ roomId: room.id });
    return `
      <article class="room-card${index === 1 ? " room-card--featured" : ""}">
        ${featured}
        ${img}
        <div class="room-card__top">
          <span class="room-card__type">${escapeHtml(room.roomType || "Accommodation")}</span>
          <span class="room-card__price">${priceLabel}</span>
        </div>
        <h3><a href="room-detail.html?id=${encodeURIComponent(room.id)}">${escapeHtml(room.name)}</a></h3>
        ${rating}
        <p class="room-card__sub">${escapeHtml(room.description)}</p>
        <p class="room-card__meta">Up to ${room.maxGuests} guests · ${room.totalUnits} unit(s)</p>
        <ul class="room-card__features">${featureList(room)}</ul>
        <a href="${bookHref}" class="btn btn--primary btn--block">Find dates &amp; book</a>
        <a href="room-detail.html?id=${encodeURIComponent(room.id)}" class="btn btn--ghost btn--block" style="margin-top:0.5rem;text-align:center;">View details</a>
      </article>`;
  }

    const imgUrl =
      typeof KmmImages !== "undefined"
        ? KmmImages.effectiveRoomUrl(room)
        : room.imageUrl || room.image_url || "";

    const imgOpts = {
      webpUrl: room.imageWebpUrl || room.webpUrl || null,
      thumbUrl: room.thumbUrl || null,
    };

    const img = imgUrl
      ? `<div class="room-card__media">${
          typeof KmmImages !== "undefined"
            ? KmmImages.roomImage(imgUrl, room.name, "", imgOpts)
            : `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(room.name)}" loading="lazy" decoding="async" />`
        }</div>`
      : "";
    const statNums = document.querySelectorAll(".hero__stats--page .stat__num");
    if (statNums[0]) statNums[0].textContent = String(rooms.reduce((s, r) => s + (r.totalUnits || 0), 0));
    const prices = rooms.map((r) => r.pricePerNight || 0).filter((p) => p > 0);
    if (statNums[1] && prices.length) statNums[1].textContent = `R${Math.min(...prices)}`;
  }

  async function runSearch(params) {
    if (typeof KmmRooms === "undefined") return;
    await KmmRooms.ready();
    if (!KmmApi.isAvailable()) return;

    const stay = {
      checkIn: params.checkIn || "",
    return `

      <article class="room-card${index === 1 ? " room-card--featured" : ""}">

        ${featured}

        ${img}

        <div class="room-card__top">

          <span class="room-card__type">${escapeHtml(room.roomType || "Accommodation")}</span>

          <span class="room-card__price">${priceLabel}</span>

        </div>

        <h3><a href="room-detail.html?id=${encodeURIComponent(room.id)}">${escapeHtml(room.name)}</a></h3>

        ${rating}

        <p class="room-card__sub">${escapeHtml(room.description)}</p>

        <p class="room-card__meta">Up to ${room.maxGuests} guests · ${room.totalUnits} unit(s)</p>

        <ul class="room-card__features">${featureList(room)}</ul>

        <button type="button" class="btn btn--primary btn--block js-book-open" data-room-id="${escapeHtml(room.id)}" data-package="${escapeHtml(room.name)}">Find dates &amp; book</button>
  }

  async function loadDefault() {
    if (typeof KmmRooms === "undefined") return;
    const ok = await KmmRooms.ready();
    if (!ok) return;
    const rooms = KmmRooms.getAll().filter((r) => r.active);
    if (!rooms.length) return;
    renderRooms(
      rooms.map((r) => ({
        ...r,
        avgRating: r.avgRating || 0,
        reviewCount: r.reviewCount || 0,
      })),
      null
    );
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      runSearch({
        q: document.getElementById("roomSearchQ")?.value,
        roomType: document.getElementById("roomSearchType")?.value,
        minPrice: document.getElementById("roomSearchMinPrice")?.value,
        maxPrice: document.getElementById("roomSearchMaxPrice")?.value,
        minRating: document.getElementById("roomSearchMinRating")?.value,
        checkIn: document.getElementById("roomSearchCheckIn")?.value,
        checkOut: document.getElementById("roomSearchCheckOut")?.value,
        guests: document.getElementById("roomSearchGuests")?.value,
      });
    });
    document.getElementById("roomSearchReset")?.addEventListener("click", () => {
      form.reset();
      loadDefault();
      const status = document.getElementById("roomSearchStatus");
      if (status) status.textContent = "";
    });
  }

  loadDefault();
})();
