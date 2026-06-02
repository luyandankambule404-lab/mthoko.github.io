const express = require("express");
const bcrypt = require("bcryptjs");
const { db, userPublic } = require("../db");
const { signToken, requireClient } = require("../middleware");

const router = express.Router();

function newUserId() {
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

router.post("/register", (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const password = String(req.body?.password || "");

    if (!name || !isEmail(email) || password.length < 4) {
      return res
        .status(400)
        .json({ error: "Valid name, email, and password (min 4 chars) are required." });
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });

    const id = newUserId();
    const hash = bcrypt.hashSync(password, 12);
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO users (id, name, email, phone, password_hash, address, provider, created_at)
       VALUES (?, ?, ?, ?, ?, '', '', ?)`
    ).run(id, name, email, phone, hash, createdAt);

    db.prepare("INSERT OR IGNORE INTO loyalty (user_id, points) VALUES (?, 0)").run(id);
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    const token = signToken({ sub: id, role: "client" });
    res.json({ ok: true, user: userPublic(row), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not register account." });
  }
});

router.post("/login", (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!row || !bcrypt.compareSync(password, row.password_hash || "")) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const token = signToken({ sub: row.id, role: "client" });
    res.json({ ok: true, user: userPublic(row), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not sign in." });
  }
});

router.post("/social", (req, res) => {
  try {
    const provider = String(req.body?.provider || "").trim();
    if (!provider) return res.status(400).json({ error: "Provider required." });

    const key = provider.toLowerCase().replace(/\s+/g, "");
    const email = `${key}.user@kmmlifestyle.demo`;
    let row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!row) {
      const id = newUserId();
      const createdAt = new Date().toISOString();
      db.prepare(
        `INSERT INTO users (id, name, email, phone, password_hash, address, provider, created_at)
         VALUES (?, ?, ?, '', '', '', ?, ?)`
      ).run(id, `${provider} User`, email, key, createdAt);
      db.prepare("INSERT OR IGNORE INTO loyalty (user_id, points) VALUES (?, 0)").run(id);
      row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    }

    const token = signToken({ sub: row.id, role: "client" });
    res.json({ ok: true, user: userPublic(row), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not sign in." });
  }
});

router.get("/me", requireClient, (req, res) => {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!row) return res.status(404).json({ error: "User not found." });
  res.json({ user: userPublic(row) });
});

router.patch("/profile", requireClient, (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const address = String(req.body?.address || "").trim();
    db.prepare(
      `UPDATE users SET
        name = COALESCE(NULLIF(?, ''), name),
        phone = COALESCE(NULLIF(?, ''), phone),
        address = COALESCE(NULLIF(?, ''), address)
       WHERE id = ?`
    ).run(name, phone, address, req.userId);
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
    res.json({ ok: true, user: userPublic(row) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update profile." });
  }
});

module.exports = router;
