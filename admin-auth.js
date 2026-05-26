const ADMIN_SESSION_KEY = "dashboard_admin_ok";

function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

function setAdminLoggedIn(loggedIn) {
  if (loggedIn) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
  } else {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
}

function verifyAdminPassword(password) {
  return password.trim() === ADMIN_PASSWORD;
}

function showDashboardApp() {
  const login = document.getElementById("dashboard-login");
  const app = document.getElementById("dashboard-app");
  if (login) login.hidden = true;
  if (app) app.hidden = false;
}

function showDashboardLogin() {
  const login = document.getElementById("dashboard-login");
  const app = document.getElementById("dashboard-app");
  if (login) login.hidden = false;
  if (app) app.hidden = true;
}

function initAdminAuth(onAuthenticated) {
  if (document.body.dataset.page !== "dashboard") return;

  const form = document.getElementById("dashboard-login-form");
  const errorEl = document.getElementById("dashboard-login-error");
  const logoutBtn = document.getElementById("dashboard-logout");
  const passwordInput = form?.querySelector('[name="password"]');

  if (isAdminLoggedIn()) {
    showDashboardApp();
    onAuthenticated?.();
  } else {
    showDashboardLogin();
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const password = passwordInput?.value ?? "";
    if (!password) return;

    if (!verifyAdminPassword(password)) {
      if (errorEl) {
        errorEl.textContent = "Incorrect password. Please try again.";
        errorEl.hidden = false;
      }
      if (passwordInput) {
        passwordInput.value = "";
        passwordInput.focus();
      }
      return;
    }

    if (errorEl) errorEl.hidden = true;
    setAdminLoggedIn(true);
    form.reset();
    showDashboardApp();
    onAuthenticated?.();
  });

  logoutBtn?.addEventListener("click", () => {
    setAdminLoggedIn(false);
    showDashboardLogin();
    if (errorEl) errorEl.hidden = true;
    form?.reset();
  });
}
