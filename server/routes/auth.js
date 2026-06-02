const express = require("express");
const bcrypt = require("bcryptjs");
const database = require("../lib/database");
const { signToken, requireClient } = require("../middleware");
const { isEmail, validatePassword, trimString } = require("../lib/validate");
const {
  generateToken,
  hashToken,
  verifyTokenHash,
  expiresInHours,
  isExpired,
} = require("../lib/auth-tokens");
const { verifyCaptcha } = require("../lib/captcha");
const { clientIp, siteUrl } = require("../lib/security");
const { sendPasswordResetEmail, sendVerificationEmail } = require("../lib/email");
const { generateSecret, keyUri, verifyCode } = require("../lib/totp");
const { logAudit } = require("../lib/audit");

const router = express.Router();

async function captchaGuard(req, res) {
  const result = await verifyCaptcha(req.body?.captchaToken, clientIp(req));
  if (!result.ok) {
    res.status(400).json({ error: result.error || "CAPTCHA failed." });
    return false;
  }
  return true;
}

async function assignCustomerRole(userId) {
  const customerRole = await database.get("SELECT id FROM roles WHERE slug = ?", ["customer"]);
  if (customerRole) {
    await database.insertOrIgnore("user_roles", ["user_id", "role_id"], [userId, customerRole.id]);
  }
}

async function sendEmailVerification(user) {
  const token = generateToken(24);
  const tokenHash = hashToken(token);
  const expires = expiresInHours(48);
  await database.run(
    `UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE id = ?`,
    [tokenHash, expires, user.id]
  );
  const verifyUrl = `${siteUrl()}/verify-email.html?email=${encodeURIComponent(user.email)}&token=${token}`;
  const mail = await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });
  return mail;
}

router.post("/register", async (req, res) => {
  try {
    const name = trimString(req.body?.name, 120);
    const normalized = String(req.body?.email || "").trim().toLowerCase();
    const phone = trimString(req.body?.phone, 40);
    const password = req.body?.password;

    if (!name || !isEmail(normalized)) {
      return res.status(400).json({ error: "Valid name and email are required." });
    }
    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) return res.status(400).json({ error: pwCheck.error });

    const existing = await database.get("SELECT id FROM users WHERE email = ?", [normalized]);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const id = database.newId("u");
    const hash = bcrypt.hashSync(password, 12);
    const createdAt = new Date().toISOString();
    await database.run(
      `INSERT INTO users (id, name, email, phone, password_hash, address, provider, created_at)
       VALUES (?, ?, ?, ?, ?, '', '', ?)`,
      [id, name, normalized, phone, hash, createdAt]
    );
    await database.run("INSERT INTO loyalty (user_id, points) VALUES (?, 0)", [id]);
    await assignCustomerRole(id);

    const row = await database.get("SELECT * FROM users WHERE id = ?", [id]);
    await sendEmailVerification({ id, email: normalized, name });

    const user = database.userPublic(row);
    const token = signToken({ sub: id, role: "client" });
    res.json({
      ok: true,
      user,
      token,
      emailVerificationSent: true,
      message: "Account created. Please check your email to verify your address.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not register account." });
  }
});

router.post("/login", async (req, res) => {
  try {

    const normalized = String(req.body?.email || "").trim().toLowerCase();
    const password = req.body?.password || "";
    const row = await database.get("SELECT * FROM users WHERE email = ?", [normalized]);
    if (!row || !bcrypt.compareSync(password, row.password_hash || "")) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (row.totp_secret && (row.totp_enabled === 1 || row.totp_enabled === true)) {
      const pending = signToken({ sub: row.id, role: "client", purpose: "2fa" }, "5m");
      return res.json({
        ok: true,
        requires2fa: true,
        pendingToken: pending,
        message: "Enter the code from your authenticator app.",
      });
    }

    const user = database.userPublic(row);
    const token = signToken({ sub: row.id, role: "client" });
    res.json({ ok: true, user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not sign in." });
  }
});

router.post("/2fa/verify", async (req, res) => {
  try {
    const { pendingToken, code } = req.body || {};
    const { verifyToken } = require("../middleware");
    const payload = verifyToken(String(pendingToken || ""));
    if (!payload || payload.purpose !== "2fa" || payload.role !== "client") {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
    const row = await database.get("SELECT * FROM users WHERE id = ?", [payload.sub]);
    if (!row?.totp_secret) {
      return res.status(400).json({ error: "Two-factor authentication is not enabled." });
    }
    if (!verifyCode(row.totp_secret, code)) {
      return res.status(401).json({ error: "Invalid authentication code." });
    }
    const user = database.userPublic(row);
    const token = signToken({ sub: row.id, role: "client" });
    res.json({ ok: true, user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not verify code." });
  }
});

router.post("/social", async (req, res) => {
  try {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_DEMO_SOCIAL !== "true"
    ) {
      return res.status(403).json({ error: "Social login is not available." });
    }

    const provider = String(req.body?.provider || "").trim();
    const map = { Google: "google", Apple: "apple", Facebook: "facebook" };
    const key = map[provider] || provider.toLowerCase();
    if (!key) return res.status(400).json({ error: "Provider required." });
    const email = `${key}.user@kmmlifestyle.demo`;
    let row = await database.get("SELECT * FROM users WHERE email = ?", [email]);
    if (!row) {
      const id = database.newId("u");
      const createdAt = new Date().toISOString();
      await database.run(
        `INSERT INTO users (id, name, email, phone, password_hash, address, provider, created_at, email_verified_at)
         VALUES (?, ?, ?, '', '', '', ?, ?, ?)`,
        [id, `${provider} User`, email, key, createdAt, createdAt]
      );
      await database.run("INSERT INTO loyalty (user_id, points) VALUES (?, 0)", [id]);
      await assignCustomerRole(id);
      row = await database.get("SELECT * FROM users WHERE id = ?", [id]);
    }
    const token = signToken({ sub: row.id, role: "client" });
    res.json({ ok: true, user: database.userPublic(row), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not sign in." });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    if (!(await captchaGuard(req, res))) return;

    const normalized = String(req.body?.email || "").trim().toLowerCase();
    if (!isEmail(normalized)) {
      return res.status(400).json({ error: "Valid email is required." });
    }

    const row = await database.get("SELECT id, name, email FROM users WHERE email = ?", [normalized]);
    if (row) {
      const token = generateToken(24);
      await database.run(
        `UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?`,
        [hashToken(token), expiresInHours(1), row.id]
      );
      const resetUrl = `${siteUrl()}/reset-password.html?email=${encodeURIComponent(row.email)}&token=${token}`;
      await sendPasswordResetEmail({ to: row.email, name: row.name, resetUrl });
      await logAudit({
        actorId: row.id,
        actorRole: "client",
        action: "auth.forgot_password",
        entityType: "user",
        entityId: row.id,
      }).catch(() => {});
    }

    res.json({
      ok: true,
      message: "If an account exists for that email, reset instructions have been sent.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not process request." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const normalized = String(req.body?.email || "").trim().toLowerCase();
    const token = String(req.body?.token || "").trim();
    const password = req.body?.password;

    if (!isEmail(normalized) || !token) {
      return res.status(400).json({ error: "Email and reset token are required." });
    }
    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) return res.status(400).json({ error: pwCheck.error });

    const row = await database.get("SELECT * FROM users WHERE email = ?", [normalized]);
    if (
      !row ||
      !verifyTokenHash(token, row.password_reset_token) ||
      isExpired(row.password_reset_expires)
    ) {
      return res.status(400).json({ error: "Invalid or expired reset link." });
    }

    const hash = bcrypt.hashSync(password, 12);
    await database.run(
      `UPDATE users SET password_hash = ?, password_reset_token = '', password_reset_expires = '' WHERE id = ?`,
      [hash, row.id]
    );

    res.json({ ok: true, message: "Password updated. You can sign in now." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not reset password." });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const normalized = String(req.body?.email || "").trim().toLowerCase();
    const token = String(req.body?.token || "").trim();
    if (!isEmail(normalized) || !token) {
      return res.status(400).json({ error: "Email and verification token are required." });
    }

    const row = await database.get("SELECT * FROM users WHERE email = ?", [normalized]);
    if (
      !row ||
      !verifyTokenHash(token, row.email_verification_token) ||
      isExpired(row.email_verification_expires)
    ) {
      return res.status(400).json({ error: "Invalid or expired verification link." });
    }

    const now = new Date().toISOString();
    await database.run(
      `UPDATE users SET email_verified_at = ?, email_verification_token = '', email_verification_expires = '' WHERE id = ?`,
      [now, row.id]
    );

    res.json({ ok: true, message: "Email verified successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not verify email." });
  }
});

router.post("/resend-verification", requireClient, async (req, res) => {
  try {
    const row = await database.get("SELECT * FROM users WHERE id = ?", [req.userId]);
    if (!row) return res.status(404).json({ error: "User not found." });
    if (row.email_verified_at) {
      return res.json({ ok: true, message: "Email is already verified." });
    }
    const mail = await sendEmailVerification({
      id: row.id,
      email: row.email,
      name: row.name,
    });
    res.json({
      ok: true,
      sent: mail.sent,
      message: mail.sent
        ? "Verification email sent."
        : "Email is not configured on the server. Contact support.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not send verification email." });
  }
});

router.get("/me", requireClient, async (req, res) => {
  try {
    const row = await database.get("SELECT * FROM users WHERE id = ?", [req.userId]);
    if (!row) return res.status(404).json({ error: "User not found." });
    res.json({ user: database.userPublic(row) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load profile." });
  }
});

router.patch("/profile", requireClient, async (req, res) => {
  try {
    const { name, phone, address } = req.body || {};
    const row = await database.get("SELECT * FROM users WHERE id = ?", [req.userId]);
    if (!row) return res.status(404).json({ error: "User not found." });
    await database.run(`UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?`, [
      name?.trim() || row.name,
      phone?.trim() ?? row.phone,
      address?.trim() ?? row.address,
      req.userId,
    ]);
    const updated = await database.get("SELECT * FROM users WHERE id = ?", [req.userId]);
    res.json({ ok: true, user: database.userPublic(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update profile." });
  }
});

router.post("/2fa/setup", requireClient, async (req, res) => {
  try {
    const row = await database.get("SELECT email, totp_enabled FROM users WHERE id = ?", [req.userId]);
    if (!row) return res.status(404).json({ error: "User not found." });
    const secret = generateSecret();
    await database.run(
      `UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?`,
      [secret, req.userId]
    );
    res.json({
      ok: true,
      secret,
      otpauthUrl: keyUri(row.email, secret),
      message: "Add this secret to your authenticator app, then confirm with a code.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not start 2FA setup." });
  }
});

router.post("/2fa/confirm", requireClient, async (req, res) => {
  try {
    const code = req.body?.code;
    const row = await database.get("SELECT totp_secret FROM users WHERE id = ?", [req.userId]);
    if (!row?.totp_secret) {
      return res.status(400).json({ error: "Run 2FA setup first." });
    }
    if (!verifyCode(row.totp_secret, code)) {
      return res.status(400).json({ error: "Invalid code. Try again." });
    }
    await database.run("UPDATE users SET totp_enabled = 1 WHERE id = ?", [req.userId]);
    res.json({ ok: true, message: "Two-factor authentication is now enabled." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not enable 2FA." });
  }
});

router.post("/2fa/disable", requireClient, async (req, res) => {
  try {
    const { password, code } = req.body || {};
    const row = await database.get("SELECT * FROM users WHERE id = ?", [req.userId]);
    if (!row) return res.status(404).json({ error: "User not found." });
    if (!bcrypt.compareSync(password || "", row.password_hash || "")) {
      return res.status(401).json({ error: "Incorrect password." });
    }
    if (row.totp_secret && !verifyCode(row.totp_secret, code)) {
      return res.status(401).json({ error: "Invalid authentication code." });
    }
    await database.run(
      `UPDATE users SET totp_secret = '', totp_enabled = 0 WHERE id = ?`,
      [req.userId]
    );
    res.json({ ok: true, message: "Two-factor authentication disabled." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not disable 2FA." });
  }
});

module.exports = router;
