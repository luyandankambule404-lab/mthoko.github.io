const express = require("express");
const { db } = require("../db");

const router = express.Router();

router.post("/", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const name = String(req.body?.name || "").trim();
  const interests = Array.isArray(req.body?.interests)
    ? req.body.interests.join(", ")
    : String(req.body?.interests || "");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email required." });
  }
  const existing = db.prepare("SELECT email FROM subscriptions WHERE email = ?").get(email);
  if (existing) {
    db.prepare("UPDATE subscriptions SET name = ?, interests = ? WHERE email = ?").run(
      name,
      interests,
      email
    );
    return res.json({ ok: true, alreadySubscribed: true });
  }
  db.prepare(
    `INSERT INTO subscriptions (email, name, interests, created_at) VALUES (?, ?, ?, ?)`
  ).run(email, name, interests, new Date().toISOString());
  res.status(201).json({ ok: true, alreadySubscribed: false });
});

router.get("/", (_req, res) => {
  res.status(403).json({ error: "Forbidden" });
});

module.exports = router;
