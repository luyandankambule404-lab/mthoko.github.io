require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth-basic");
const bookingsRoutes = require("./routes/bookings");
const clientRoutes = require("./routes/client");
const adminRoutes = require("./routes/admin");
const subscribeRoutes = require("./routes/subscribe");
const paymentsRoutes = require("./routes/payments");
const { paystackWebhookHandler } = require("./routes/payments");
const { db, dbPath } = require("./db");
const { processDueEmailJobs } = require("./lib/booking-emails");

const app = express();
const PORT = process.env.PORT || 3000;
const siteRoot = path.join(__dirname, "..");

app.use(cors());

app.post(
  "/api/payments/webhook/paystack",
  express.raw({ type: "application/json" }),
  paystackWebhookHandler
);

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  if (req.path.endsWith(".html") || req.path === "/") {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "kmm-lifestyle-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/subscribe", subscribeRoutes);
app.use("/api/payments", paymentsRoutes);

app.use(express.static(siteRoot));
app.use((err, _req, res, _next) => {
  console.error(err);
  const locked = err.code === "SQLITE_BUSY" || /database is locked/i.test(err.message);
  res.status(locked ? 503 : 500).json({
    error: locked ? "Database is busy. Please try again in a moment." : "Server error.",
  });
});

function startEmailScheduler() {
  const tick = () => {
    processDueEmailJobs(db).catch((err) =>
      console.warn("Email reminder job failed:", err.message)
    );
  };
  setTimeout(tick, 15_000);
  setInterval(tick, 60 * 60 * 1000);
}

app.listen(PORT, () => {
  console.log(`KMM Lifestyle running at http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/health`);
  console.log(`Database: ${dbPath}`);
  if (process.env.PAYSTACK_SECRET_KEY) {
    console.log("Paystack: card payments enabled");
  } else {
    console.log("Paystack: not configured — add PAYSTACK_SECRET_KEY to server/.env for card checkout");
  }
  startEmailScheduler();
});