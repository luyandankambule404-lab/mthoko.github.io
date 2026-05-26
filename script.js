const SITE = {
  name: "Mthokozisi Luyanda Nkambule",
  email: "mthokozisinkambule06@gmail.com",
  phones: ["+26878462761", "+26879533845"],
  whatsapp: ["26878462761", "26879533845"],
};

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

function formatDate(iso) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatBody(text) {
  return escapeHtml(text)
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function truncate(text, max = 140) {
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + "…";
}

/* getSortedPosts() is in posts-storage.js */

function renderFeaturedPost() {
  const el = document.getElementById("featured-post");
  if (!el) return;

  const latest = getSortedPosts()[0];
  if (!latest) {
    el.hidden = true;
    return;
  }

  el.innerHTML = `
    <div class="featured-inner">
      <span class="featured-badge">Latest Post</span>
      <time datetime="${latest.date}">${formatDate(latest.date)}</time>
      <h3>${escapeHtml(latest.title)}</h3>
      <p>${escapeHtml(truncate(latest.body.replace(/\s+/g, " ")))}</p>
      <a class="btn btn-primary btn-sm" href="posts.html">View all posts</a>
    </div>
  `;
}

function renderPosts() {
  const feed = document.getElementById("posts-feed");
  if (!feed) return;

  const sorted = getSortedPosts();

  if (sorted.length === 0) {
    feed.innerHTML =
      '<p class="posts-empty">No posts have been published yet. Please check back soon.</p>';
    return;
  }

  feed.innerHTML = sorted
    .map(
      (post, i) => `
    <article class="post${i === 0 ? " post--new" : ""}" style="--delay: ${i * 0.08}s">
      ${i === 0 ? '<span class="post-new-badge">New</span>' : ""}
      <time class="post-date" datetime="${post.date}">${formatDate(post.date)}</time>
      <h3 class="post-title">${escapeHtml(post.title)}</h3>
      <div class="post-body">${formatBody(post.body)}</div>
      ${
        post.tags?.length
          ? `<ul class="post-tags">${post.tags
              .map((t) => `<li>${escapeHtml(t)}</li>`)
              .join("")}</ul>`
          : ""
      }
    </article>
  `
    )
    .join("");
}

function setGreeting() {
  const el = document.getElementById("greeting");
  if (!el) return;
  const hour = new Date().getHours();
  let time = "Hello";
  if (hour < 12) time = "Good morning";
  else if (hour < 17) time = "Good afternoon";
  else time = "Good evening";
  el.textContent = `${time}, I am`;
}

function initScrollProgress() {
  const bar = document.getElementById("scroll-progress-bar");
  if (!bar) return;

  const update = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = `${pct}%`;
  };

  window.addEventListener("scroll", update, { passive: true });
  update();
}

function initBackToTop() {
  const btn = document.getElementById("back-top");
  if (!btn) return;

  const toggle = () => {
    const show = window.scrollY > 400;
    btn.hidden = !show;
  };

  window.addEventListener("scroll", toggle, { passive: true });
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  toggle();
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

function initActiveNav() {
  const page = document.body.dataset.page;
  const pageLinks = document.querySelectorAll("[data-nav-page]");

  if (page && pageLinks.length) {
    pageLinks.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.navPage === page);
    });
    return;
  }

  const links = document.querySelectorAll("[data-nav]");
  const sections = [...links]
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
        });
      });
    },
    { threshold: 0.35, rootMargin: "-20% 0px -55% 0px" }
  );

  sections.forEach((s) => observer.observe(s));
}

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");

if (toggle && nav) {
  const setMenuOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
  };

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    setMenuOpen(!open);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });

  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth > 767) setMenuOpen(false);
    },
    { passive: true }
  );
}

const form = document.querySelector(".contact-form");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get("name");
    const email = data.get("email");
    const message = data.get("message");
    const subject = `Website message from ${name}`;
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    form.reset();
  });
}

setGreeting();
renderFeaturedPost();
renderPosts();
initScrollProgress();
initBackToTop();
initReveal();
initActiveNav();
