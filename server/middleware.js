const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "kmm-dev-secret-change-in-production";

function signToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireClient(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  if (!payload || payload.role !== "client") {
    return res.status(401).json({ error: "Not authenticated." });
  }
  req.userId = payload.sub;
  next();
}

function optionalClient(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  if (payload?.role === "client") req.userId = payload.sub;
  next();
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return res.status(401).json({ error: "Admin access required." });
  }
  next();
}

module.exports = {
  signToken,
  verifyToken,
  requireClient,
  optionalClient,
  requireAdmin,
  JWT_SECRET,
};
