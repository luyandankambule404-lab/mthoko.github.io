(function () {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("id") || params.get("slug");
  const loading = document.getElementById("roomDetailLoading");
  const content = document.getElementById("roomDetailContent");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function renderCalendar(cal) {
    if (!cal?.days?.length) return "";
    return `
      <h3 class="section__subtitle">Availability — ${cal.year}-${String(cal.month).padStart(2, "0")}</h3>
      <div class="room-calendar" aria-label="Monthly availability">
        ${cal.days
          .map(
            (d) =>
              `<span class="room-calendar__day ${d.available ? "room-calendar__day--ok" : "room-calendar__day--full"}" title="${d.date}">${new Date(d.date).getDate()}</span>`
          )
          .join("")}
      </div>`;
  }

  async function load() {
    if (!roomId) {
      loading.textContent = "Room not specified.";
      return;
    }
    await KmmRooms.ready();
    const room = await KmmRooms.fetchRoom(roomId);
    if (!room) {
      loading.textContent = "Room not found.";
      return;
    }

    const cal = await KmmRooms.getCalendar(room.id);
    const fallbackUrl =
      typeof KmmImages !== "undefined"
        ? KmmImages.effectiveRoomUrl(room)
        : room.imageUrl || room.image_url || "";
    const images = room.images?.length
      ? room.images.map((img) => ({
          ...img,
          url:
            (typeof KmmImages !== "undefined" ? KmmImages.resolveUrl(img.url) : img.url) ||
            fallbackUrl,
        }))
      : fallbackUrl
        ? [{ url: fallbackUrl, alt: room.name }]
        : [];

    loading.hidden = true;
    content.hidden = false;
    document.title = `KMM Lifestyle | ${room.name}`;

    const amenities =
      room.amenityList?.map((a) => `<li>${escapeHtml(a.name)}</li>`).join("") ||
      (room.amenities || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");

    const price =
      room.pricePerNight > 0
        ? `R${room.pricePerNight}${/month/i.test(room.roomType || "") ? "/month" : "/night"}`
        : "Custom quote";

    const amenityNames =
      room.amenityList?.map((a) => a.name).join(", ") || (room.amenities || []).join(", ");
    window.KmmFaqContext = {
      roomName: room.name,
      price,
      amenities: amenityNames,
    };

    const galleryHtml = images
      .map((img) => {
        const opts = {
          webpUrl: img.webpUrl || room.imageWebpUrl || null,
          thumbUrl: img.thumbUrl || null,
        };
        if (typeof KmmImages !== "undefined") {
          return `<div class="room-detail__gallery-item">${KmmImages.roomImage(img.url, img.alt || room.name, "", opts)}</div>`;
        }
        return `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt || room.name)}" loading="lazy" />`;
      })
      .join("");

    content.innerHTML = `
      <a href="rooms.html" class="btn btn--ghost">← All rooms</a>
      <header class="room-detail__header">
        <span class="section__tag">${escapeHtml(room.roomType || "Accommodation")}</span>
        <h1>${escapeHtml(room.name)}</h1>
        <p class="room-detail__price">${escapeHtml(price)} · up to ${room.maxGuests} guests</p>
      </header>
      <div class="room-detail__gallery">${galleryHtml}</div>
      <p class="room-detail__desc">${escapeHtml(room.description)}</p>
      <ul class="room-card__features">${amenities}</ul>
      ${renderCalendar(cal)}
      <form id="roomDetailBookForm" class="book-search-form room-detail__book">
        <h3 class="section__subtitle">Book this room</h3>
        <p class="room-detail__book-hint">Enter your stay dates — we will show your total and open the booking form with everything filled in.</p>
        <div class="book-search-form__row">
          <div>
            <label for="detailCheckIn">Check-in</label>
            <input type="date" id="detailCheckIn" required />
          </div>
          <div>
            <label for="detailCheckOut">Check-out</label>
            <input type="date" id="detailCheckOut" required />
          </div>
          <div>
            <label for="detailGuests">Guests</label>
            <input type="number" id="detailGuests" min="1" max="${room.maxGuests}" value="2" />
          </div>
        </div>
        <button type="submit" class="btn btn--primary">Check availability &amp; book</button>
      </form>
      <div id="roomDetailBookResults" class="book-search-results"></div>
    `;

    KmmBookingFlow.setMinStayDates();
    const bookForm = document.getElementById("roomDetailBookForm");
    const resultsBox = document.getElementById("roomDetailBookResults");

    bookForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const stay = {
        checkIn: document.getElementById("detailCheckIn").value,
        checkOut: document.getElementById("detailCheckOut").value,
        guests: document.getElementById("detailGuests").value,
      };
      resultsBox.innerHTML = "<p class=\"book-search-status\">Checking availability…</p>";
      await KmmRooms.ready();
      if (!KmmApi.isAvailable()) {
        resultsBox.innerHTML =
          '<p class="book-search-empty">Start the server with npm start to book online.</p>';
        return;
      }
      try {
        const data = await KmmRooms.searchRooms({ ...stay, maxPrice: "" });
        const match = (data.rooms || []).find((r) => r.id === room.id);
        if (!match) {
          resultsBox.innerHTML =
            '<p class="book-search-empty">This room is not available for those dates. Try different dates.</p>';
          return;
        }
        resultsBox.innerHTML = KmmBookingFlow.renderResultCard(match, stay);
        KmmBookingFlow.bindSelectButtons(resultsBox, stay);
      } catch (err) {
        resultsBox.innerHTML = `<p class="book-search-empty">${escapeHtml(err.message || "Could not check availability.")}</p>`;
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("checkIn")) document.getElementById("detailCheckIn").value = urlParams.get("checkIn");
    if (urlParams.get("checkOut")) document.getElementById("detailCheckOut").value = urlParams.get("checkOut");
    if (urlParams.get("guests")) document.getElementById("detailGuests").value = urlParams.get("guests");
    if (urlParams.get("checkIn") && urlParams.get("checkOut")) bookForm?.requestSubmit();
  }

  load();
})();
