/**
 * Homepage active promotions / deals strip.
 */
(function () {
  const section = document.getElementById("homeDealsSection");
  const grid = document.getElementById("homeDealsGrid");
  if (!section || !grid) return;

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  async function load() {
    if (typeof KmmApi === "undefined") return;
    await KmmApi.init();
    if (!KmmApi.isAvailable()) return;
    try {
      const data = await KmmApi.request("/marketing/deals");
      const deals = data.deals || [];
      if (!deals.length) return;
      section.hidden = false;
      grid.innerHTML = deals
        .map(
          (d) => `
        <article class="deal-card">
          <span class="deal-card__badge">${escapeHtml(d.label)}</span>
          <h3>${escapeHtml(d.name)}</h3>
          <p>${escapeHtml(d.description || "Limited-time offer at KMM Lifestyle.")}</p>
          ${d.couponCode ? `<p class="deal-card__code">Use code: <strong>${escapeHtml(d.couponCode)}</strong></p>` : ""}
          <button type="button" class="btn btn--primary btn--sm js-book-open">Book now</button>
        </article>`
        )
        .join("");
    } catch {
      /* hide section on error */
    }
  }

  load();
})();
