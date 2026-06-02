const rateLimit = require("express-rate-limit");

/** Auth (login/register) — rate limiting disabled so sign-up is not blocked. */
function authLimiter(_req, _res, next) {
  next();
}

function isAuthPath(req) {
  const path = req.path || "";
  const url = req.originalUrl || "";
  return path.startsWith("/auth") || url.startsWith("/api/auth");
}

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_BOOKING_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many booking requests. Please try again later." },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_API_MAX || 200),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isAuthPath(req),
  message: { error: "Too many requests. Please slow down." },
});

module.exports = { authLimiter, bookingLimiter, apiLimiter };
