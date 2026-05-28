const express = require("express");
const bcrypt = require("bcryptjs");
const { db, userPublic } = require("../db");
const { signToken, requireClient } = require("../middleware");

const router = express.Router();

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

router.post("/register", (req, res) => {
  const { name, email, phone, password } = req.body || {};
  const normalized = String(email || "").trim().toLowerCase();
  if (!name?.trim() || !normalized || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }
  const id = newId("u");
  const hash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, name, email, phone, password_hash, address, provider, created_at)
     VALUES (?, ?, ?, ?, ?, '', '', ?)`
  ).run(id, name.trim(), normalized, String(phone || "").trim(), hash, createdAt);
  db.prepare("INSERT INTO loyalty (user_id, points) VALUES (?, 0)").run(id);
  const user = userPublic(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
  const token = signToken({ sub: id, role: "client" });
  res.json({ ok: true, user, token });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const normalized = String(email || "").trim().toLowerCase();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(normalized);
  if (!row || !bcrypt.compareSync(password || "", row.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  const user = userPublic(row);
  const token = signToken({ sub: row.id, role: "client" });
  res.json({ ok: true, user, token });
});

router.post("/social", (req, res) => {
  const provider = String(req.body?.provider || "").trim();
  const map = { Google: "google", Apple: "apple", Facebook: "facebook" };
  const key = map[provider] || provider.toLowerCase();
  if (!key) return res.status(400).json({ error: "Provider required." });
  const email = `${key}.user@kmmlifestyle.demo`;
  let row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row) {
    const id = newId("u");
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, name, email, phone, password_hash, address, provider, created_at)
       VALUES (?, ?, ?, '', '', '', ?, ?)`
    ).run(id, `${provider} User`, email, key, createdAt);
    db.prepare("INSERT INTO loyalty (user_id, points) VALUES (?, 0)").run(id);
    row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  }
  const token = signToken({ sub: row.id, role: "client" });
  res.json({ ok: true, user: userPublic(row), token });
});

router.get("/me", requireClient, (req, res) => {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!row) return res.status(404).json({ error: "User not found." });
  res.json({ user: userPublic(row) });
});

router.patch("/profile", requireClient, (req, res) => {
  const { name, phone, address } = req.body || {};
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!row) return res.status(404).json({ error: "User not found." });
  db.prepare(
    `UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?`
  ).run(
    name?.trim() || row.name,
    phone?.trim() ?? row.phone,
    address?.trim() ?? row.address,
    req.userId
  );
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ ok: true, user: userPublic(updated) });
});

module.exports = router;
