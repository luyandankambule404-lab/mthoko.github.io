/**
 * KMM Lifestyle — HTTP client for the backend API.
 */
const KmmApi = (function () {
  const CLIENT_TOKEN_KEY = "kmm_client_token";
  const ADMIN_TOKEN_KEY = "kmm_admin_token";

  function apiBase() {
    if (window.KMM_API_URL) return window.KMM_API_URL.replace(/\/$/, "");
    const { protocol, hostname, port } = window.location;
    if (protocol === "file:") {
      return "http://localhost:3000/api";
    }
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:3000/api`;
    }
    if (port === "3000") {
      return `${protocol}//${hostname}:${port}/api`;
    }
    if (hostname.endsWith("github.io")) {
      return null;
    }
    if (port && port !== "3000") {
      return `${protocol}//${hostname}:3000/api`;
    }
    return "/api";
  }

  let clientToken = sessionStorage.getItem(CLIENT_TOKEN_KEY) || "";
  let adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
  let apiAvailable = null;

  function setClientToken(token) {
    clientToken = token || "";
    if (token) sessionStorage.setItem(CLIENT_TOKEN_KEY, token);
    else sessionStorage.removeItem(CLIENT_TOKEN_KEY);
  }

  function setAdminToken(token) {
    adminToken = token || "";
    if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  }

  function getClientToken() {
    return clientToken;
  }

  function getAdminToken() {
    return adminToken;
  }

  async function request(path, options = {}) {
    const { auth = "none", method = "GET", body, headers = {} } = options;
    const base = apiBase();
    if (!base) {
      const err = new Error("API not available on static hosting.");
      err.status = 0;
      throw err;
    }
    const url = `${base}${path}`;
    const reqHeaders = { "Content-Type": "application/json", ...headers };

    if (auth === "client" && clientToken) {
      reqHeaders.Authorization = `Bearer ${clientToken}`;
    } else if (auth === "admin" && adminToken) {
      reqHeaders.Authorization = `Bearer ${adminToken}`;
    }

    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }

    if (!res.ok) {
      const err = new Error(data?.error || res.statusText || "Request failed");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function checkHealth() {
    try {
      await request("/health");
      apiAvailable = true;
      return true;
    } catch {
      apiAvailable = false;
      return false;
    }
  }

  async function init() {
    await checkHealth();
    if (!apiAvailable) return false;
    if (clientToken) {
      try {
        const { user } = await request("/auth/me", { auth: "client" });
        return { user };
      } catch {
        setClientToken("");
      }
    }
    return true;
  }

  function isAvailable() {
    return apiAvailable === true;
  }

  return {
    request,
    init,
    checkHealth,
    isAvailable,
    setClientToken,
    setAdminToken,
    getClientToken,
    getAdminToken,
    apiBase,
  };
})();
