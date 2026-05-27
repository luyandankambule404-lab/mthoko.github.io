/** Admin password — change this string to set a new password */
const DASHBOARD_ADMIN_PASSWORD = "Nkambule2026";
const DASHBOARD_AUTH_KEY = "mthokozisi_dashboard_auth";
let dashboardAuthedInMemory = false;

let editingId = null;

function normalizePassword(value) {
  return String(value || "").trim();
}

function isDashboardAuthed() {
  try {
    if (sessionStorage.getItem(DASHBOARD_AUTH_KEY) === "yes") return true;
  } catch {
    /* private mode / blocked storage */
  }
  return dashboardAuthedInMemory;
}

function setDashboardAuthed(value) {
  dashboardAuthedInMemory = !!value;
  try {
    if (value) sessionStorage.setItem(DASHBOARD_AUTH_KEY, "yes");
    else sessionStorage.removeItem(DASHBOARD_AUTH_KEY);
  } catch {
    /* in-memory only */
  }
}

function unlockDashboard() {
  document.body.classList.add("dashboard-authenticated");
}

function lockDashboard() {
  document.body.classList.remove("dashboard-authenticated");
}

function checkDashboardPassword(password) {
  return (
    normalizePassword(password).toLowerCase() ===
    DASHBOARD_ADMIN_PASSWORD.toLowerCase()
  );
}

function setupDashboardLogin(onSuccess) {
  const form = document.getElementById("dashboard-login-form");
  const errorEl = document.getElementById("dashboard-login-error");
  const passwordInput = document.getElementById("dashboard-password");
  const logoutBtn = document.getElementById("dashboard-logout");

  function showLoginError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearLoginError() {
    if (errorEl) errorEl.hidden = true;
  }

  function doLogout() {
    setDashboardAuthed(false);
    lockDashboard();
    clearLoginError();
    if (form) form.reset();
    if (passwordInput) passwordInput.focus();
  }

  function attemptLogin() {
    const password = passwordInput ? passwordInput.value : "";
    if (!password) {
      showLoginError("Please enter your password.");
      return;
    }

    if (!checkDashboardPassword(password)) {
      showLoginError("Incorrect password. Please try again.");
      if (passwordInput) {
        passwordInput.value = "";
        passwordInput.focus();
      }
      return;
    }

    clearLoginError();
    setDashboardAuthed(true);
    if (form) form.reset();
    unlockDashboard();
    onSuccess();
  }

  /* Always attach handlers (early return on authed load skipped these before) */
  logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    doLogout();
  });

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      attemptLogin();
    });
  }

  document.getElementById("dashboard-login-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    attemptLogin();
  });

  if (isDashboardAuthed()) {
    unlockDashboard();
    onSuccess();
  } else {
    lockDashboard();
  }
}

function parseTags(value) {
  if (!value || !value.trim()) return [];
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function showToast(message, type = "success") {
  const el = document.getElementById("dashboard-toast");
  if (!el) return;
  el.textContent = message;
  el.className = `dashboard-toast dashboard-toast--${type} is-show`;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.remove("is-show"), 3200);
}

function renderDashboardList() {
  const list = document.getElementById("dashboard-list");
  if (!list) return;

  const posts = getSortedPosts();

  if (!posts.length) {
    list.innerHTML =
      '<p class="dashboard-empty">You have not published any posts yet. Use the form to create your first entry.</p>';
    return;
  }

  list.innerHTML = posts
    .map(
      (post) => `
    <article class="dashboard-item" data-id="${escapeHtml(post.id)}">
      <div class="dashboard-item-head">
        <time datetime="${post.date}">${formatDate(post.date)}</time>
        <div class="dashboard-item-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-edit" data-id="${escapeHtml(post.id)}">Edit</button>
          <button type="button" class="btn btn-danger btn-sm btn-delete" data-id="${escapeHtml(post.id)}">Delete</button>
        </div>
      </div>
      <h3>${escapeHtml(post.title)}</h3>
      <p class="dashboard-item-preview">${escapeHtml(truncate(post.body.replace(/\s+/g, " "), 120))}</p>
      ${
        post.tags?.length
          ? `<ul class="post-tags">${post.tags.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
          : ""
      }
    </article>
  `
    )
    .join("");

  list.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => startEdit(btn.dataset.id));
  });

  list.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => deletePost(btn.dataset.id));
  });
}

function renderSubscribersList() {
  const list = document.getElementById("subscribers-list");
  if (!list) return;

  const subscribers = loadSubscribers();
  if (!subscribers.length) {
    list.innerHTML =
      '<p class="dashboard-empty">No subscribers yet. New email subscriptions will appear here.</p>';
    return;
  }

  list.innerHTML = subscribers
    .map(
      (subscriber) => `
    <article class="dashboard-item">
      <div class="dashboard-item-head">
        <time datetime="${escapeHtml(subscriber.subscribedAt || "")}">
          ${formatDate((subscriber.subscribedAt || "").slice(0, 10))}
        </time>
      </div>
      <h3>${escapeHtml(subscriber.email)}</h3>
    </article>
  `
    )
    .join("");
}

function resetForm() {
  const form = document.getElementById("post-form");
  if (!form) return;
  form.reset();
  const dateInput = form.querySelector('[name="date"]');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
  editingId = null;
  const submitBtn = document.getElementById("post-submit");
  const cancelBtn = document.getElementById("post-cancel");
  const heading = document.getElementById("form-heading");
  if (submitBtn) submitBtn.textContent = "Publish post";
  if (cancelBtn) cancelBtn.hidden = true;
  if (heading) heading.textContent = "Compose a New Post";
}

function startEdit(id) {
  const post = loadPosts().find((p) => p.id === id);
  if (!post) return;

  const form = document.getElementById("post-form");
  if (!form) return;

  editingId = id;
  form.date.value = post.date;
  form.title.value = post.title;
  form.body.value = post.body;
  form.tags.value = (post.tags || []).join(", ");

  document.getElementById("post-submit").textContent = "Save changes";
  document.getElementById("post-cancel").hidden = false;
  document.getElementById("form-heading").textContent = "Edit Post";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("You are now editing this post. Update the fields and select Save changes.");
}

function deletePost(id) {
  const post = loadPosts().find((p) => p.id === id);
  if (!post) return;
  if (!confirm(`Are you sure you wish to delete "${post.title}"? This action cannot be undone.`)) return;

  const updated = loadPosts().filter((p) => p.id !== id);
  savePosts(updated);
  if (editingId === id) resetForm();
  renderDashboardList();
  showToast("The post has been deleted successfully.");
}

function handlePostSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const date = form.date.value;
  const title = form.title.value.trim();
  const body = form.body.value.trim();
  const tags = parseTags(form.tags.value);

  if (!title || !body) {
    showToast("Please provide both a title and post content.", "error");
    return;
  }

  let posts = loadPosts();

  if (editingId) {
    posts = posts.map((p) =>
      p.id === editingId ? { ...p, date, title, body, tags } : p
    );
    showToast("Your post has been updated successfully.");
  } else {
    posts.unshift(ensurePostId({ date, title, body, tags }));
    showToast("Your post has been published successfully.");
  }

  savePosts(posts);
  resetForm();
  renderDashboardList();
}

function initDashboard() {
  const form = document.getElementById("post-form");
  if (!form) return;

  resetForm();

  form.addEventListener("submit", handlePostSubmit);

  document.getElementById("post-cancel")?.addEventListener("click", resetForm);

  document.getElementById("btn-export")?.addEventListener("click", () => {
    downloadPostsJs();
    showToast("posts.js has been downloaded. Upload it to Netlify so all visitors can see your latest posts.");
  });

  document.getElementById("btn-reset")?.addEventListener("click", () => {
    if (
      !confirm(
        "Restore all posts to the original versions from posts.js? Any changes saved in this browser will be permanently removed."
      )
    )
      return;
    resetPostsToFileDefaults();
    resetForm();
    renderDashboardList();
    showToast("Posts have been restored to the original defaults.");
  });

  renderDashboardList();
  renderSubscribersList();
}

function bootDashboard() {
  if (!document.body || document.body.dataset.page !== "dashboard") return;
  setupDashboardLogin(initDashboard);
}

document.addEventListener("DOMContentLoaded", bootDashboard);
