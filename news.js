const NEWS_CACHE_KEY = "mthokozisi_news_cache";
const newsArticleStore = new Map();

function storeArticle(article) {
  const key = String(article.id || article.link).replace(/[^a-zA-Z0-9]/g, "").slice(0, 32) || `n${Date.now()}`;
  newsArticleStore.set(key, article);
  return key;
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || "").trim();
}

function formatNewsDate(pubDate) {
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now - d;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-ZA", { month: "short", day: "numeric", year: "numeric" });
}

function getRss2JsonUrl(rssUrl) {
  const base = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  const key = NEWS_CONFIG.rss2jsonKey?.trim();
  return key ? `${base}&api_key=${key}` : base;
}

async function fetchFeed(feed) {
  const res = await fetch(getRss2JsonUrl(feed.rss));
  if (!res.ok) throw new Error(`Could not load ${feed.label}`);
  const data = await res.json();
  if (data.status !== "ok") throw new Error(data.message || "Feed unavailable");
  return (data.items || []).slice(0, NEWS_CONFIG.maxHeadlinesPerFeed).map((item) => ({
    id: item.guid || item.link,
    title: stripHtml(item.title),
    link: item.link,
    pubDate: item.pubDate,
    description: stripHtml(item.description || item.content || "").slice(0, 280),
    thumbnail: item.thumbnail || item.enclosure?.link || null,
    source: feed.label,
    category: feed.id,
    icon: feed.icon,
  }));
}

async function loadAllNews(force = false) {
  const cached = !force && getNewsCache();
  if (cached) return cached;

  const feeds = Object.values(NEWS_CONFIG.feeds);
  const results = await Promise.allSettled(feeds.map((f) => fetchFeed(f)));

  const articles = [];
  const errors = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    } else {
      errors.push(feeds[i].label);
    }
  });

  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  const payload = { articles, errors, fetchedAt: Date.now() };
  if (articles.length) saveNewsCache(payload);
  return payload;
}

function getNewsCache() {
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const age = Date.now() - data.fetchedAt;
    if (age > NEWS_CONFIG.refreshMinutes * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

function saveNewsCache(data) {
  localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(data));
}

function renderNewsCard(article, options = {}) {
  const hot = options.hot ? '<span class="news-badge news-badge--hot">Hot</span>' : "";
  const img = article.thumbnail
    ? `<img src="${escapeHtml(article.thumbnail)}" alt="" class="news-card-img" loading="lazy" />`
    : `<div class="news-card-img news-card-img--placeholder" aria-hidden="true">${article.icon}</div>`;

  return `
    <article class="news-card" data-news-id="${escapeHtml(article.id)}">
      ${hot}
      ${img}
      <div class="news-card-body">
        <span class="news-card-source">${article.icon} ${escapeHtml(article.source)}</span>
        <time datetime="${article.pubDate}">${formatNewsDate(article.pubDate)}</time>
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.description)}${article.description.length >= 200 ? "…" : ""}</p>
        <button type="button" class="btn btn-primary btn-sm news-read-btn" data-article-id="${storeArticle(article)}">Read story</button>
      </div>
    </article>
  `;
}

function openNewsModal(article) {
  let modal = document.getElementById("news-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "news-modal";
    modal.className = "news-modal";
    modal.innerHTML = `
      <div class="news-modal-backdrop" data-close-modal></div>
      <div class="news-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="news-modal-title">
        <button type="button" class="news-modal-close" aria-label="Close">&times;</button>
        <div class="news-modal-content"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector(".news-modal-backdrop").addEventListener("click", closeNewsModal);
    modal.querySelector(".news-modal-close").addEventListener("click", closeNewsModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNewsModal();
    });
  }

  const content = modal.querySelector(".news-modal-content");
  const img = article.thumbnail
    ? `<img src="${escapeHtml(article.thumbnail)}" alt="" class="news-modal-img" />`
    : "";

  content.innerHTML = `
    ${img}
    <span class="news-card-source">${article.icon} ${escapeHtml(article.source)} · ${formatNewsDate(article.pubDate)}</span>
    <h2 id="news-modal-title">${escapeHtml(article.title)}</h2>
    <p>${escapeHtml(article.description)}</p>
    <a href="${escapeHtml(article.link)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Read full article →</a>
  `;

  modal.classList.add("is-open");
  document.body.classList.add("news-modal-open");
}

function closeNewsModal() {
  const modal = document.getElementById("news-modal");
  if (modal) modal.classList.remove("is-open");
  document.body.classList.remove("news-modal-open");
}

function bindNewsButtons(container) {
  container?.querySelectorAll(".news-read-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const article = newsArticleStore.get(btn.dataset.articleId);
      if (article) openNewsModal(article);
    });
  });
}

function renderNewsGrid(container, articles, filter = "all") {
  if (!container) return;
  const filtered =
    filter === "all" ? articles : articles.filter((a) => a.category === filter);

  if (!filtered.length) {
    container.innerHTML = `<p class="news-empty">No headlines available for this category right now. Please try again shortly.</p>`;
    return;
  }

  container.innerHTML = filtered
    .map((a, i) => renderNewsCard(a, { hot: i < 2 && filter === "all" }))
    .join("");
  bindNewsButtons(container);
}

function renderTicker(container, articles) {
  if (!container || !articles.length) {
    if (container) container.hidden = true;
    return;
  }

  const top = articles.slice(0, 8);
  const items = top
    .map(
      (a) =>
        `<button type="button" class="news-ticker-item" data-article-id="${storeArticle(a)}">${a.icon} <strong>${escapeHtml(a.title)}</strong></button>`
    )
    .join('<span class="news-ticker-dot">•</span>');

  container.hidden = false;
  container.innerHTML = `
    <div class="news-ticker-label">🔴 Live headlines</div>
    <div class="news-ticker-track">
      <div class="news-ticker-inner">${items}${items}</div>
    </div>
  `;

  container.querySelectorAll(".news-ticker-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const article = newsArticleStore.get(btn.dataset.articleId);
      if (article) openNewsModal(article);
    });
  });
}

function showBreakingPopup(articles) {
  if (!NEWS_CONFIG.showBreakingPopup || !articles.length) return;
  if (sessionStorage.getItem("news_popup_seen")) return;

  const top = articles.slice(0, 3);
  const overlay = document.createElement("div");
  overlay.className = "news-breaking-overlay";
  overlay.innerHTML = `
    <div class="news-breaking-popup" role="dialog" aria-labelledby="breaking-title">
      <button type="button" class="news-modal-close" data-close-breaking aria-label="Close">&times;</button>
      <p class="news-breaking-label">🔥 Breaking &amp; hot news</p>
      <h2 id="breaking-title">Latest headlines</h2>
      <ul class="news-breaking-list">
        ${top
          .map(
            (a) =>
              `<li><button type="button" class="news-breaking-link" data-article-id="${storeArticle(a)}">${escapeHtml(a.title)} <span>${escapeHtml(a.source)}</span></button></li>`
          )
          .join("")}
      </ul>
      <div class="news-breaking-actions">
        <a href="news.html" class="btn btn-primary">View all news</a>
        <button type="button" class="btn btn-secondary" data-close-breaking>Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-open"));

  const close = () => {
    overlay.classList.remove("is-open");
    sessionStorage.setItem("news_popup_seen", "1");
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.querySelectorAll("[data-close-breaking]").forEach((el) => el.addEventListener("click", close));
  overlay.querySelectorAll(".news-breaking-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const article = newsArticleStore.get(btn.dataset.articleId);
      if (article) {
        openNewsModal(article);
        close();
      }
    });
  });
}

async function initNewsPage() {
  const grid = document.getElementById("news-grid");
  const status = document.getElementById("news-status");
  const tabs = document.querySelector(".news-tabs");

  if (!grid) return;

  if (status) status.textContent = "Loading latest headlines…";

  try {
    const { articles, errors } = await loadAllNews();
    renderNewsGrid(grid, articles, "all");

    if (status) {
      status.textContent = errors.length
        ? `Showing headlines. Could not load: ${errors.join(", ")}.`
        : `Updated ${formatNewsDate(new Date().toISOString())} — refreshes every ${NEWS_CONFIG.refreshMinutes} minutes.`;
    }

    tabs?.querySelectorAll("[data-news-filter]").forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.querySelectorAll("[data-news-filter]").forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        renderNewsGrid(grid, articles, tab.dataset.newsFilter);
      });
    });

    document.getElementById("news-refresh")?.addEventListener("click", async () => {
      if (status) status.textContent = "Refreshing…";
      const fresh = await loadAllNews(true);
      renderNewsGrid(grid, fresh.articles, document.querySelector(".news-tabs .is-active")?.dataset.newsFilter || "all");
      if (status) status.textContent = "Headlines updated.";
    });
  } catch {
    grid.innerHTML = `
      <p class="news-empty">Headlines could not be loaded at this moment. Please check your internet connection and try again, or visit <a href="https://www.bbc.com/news/world/africa" target="_blank" rel="noopener">BBC Africa</a> and <a href="https://www.theguardian.com/football" target="_blank" rel="noopener">Guardian Football</a> directly.</p>`;
    if (status) status.textContent = "";
  }
}

async function initHomeNews() {
  const ticker = document.getElementById("news-ticker");
  const preview = document.getElementById("news-preview");

  try {
    const { articles } = await loadAllNews();
    renderTicker(ticker, articles);

    if (preview) {
      preview.innerHTML = articles
        .slice(0, 3)
        .map((a, i) => renderNewsCard(a, { hot: i === 0 }))
        .join("");
      bindNewsButtons(preview);
    }

    if (document.body.dataset.page === "home") {
      showBreakingPopup(articles);
    }
  } catch {
    if (ticker) ticker.hidden = true;
  }
}

if (document.getElementById("news-grid")) {
  initNewsPage();
}

if (document.getElementById("news-ticker") || document.getElementById("news-preview")) {
  initHomeNews();
}
