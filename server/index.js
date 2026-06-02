require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth-basic");
const bookingsRoutes = require("./routes/bookings");
const clientRoutes = require("./routes/client");
const adminRoutes = require("./routes/admin");
const subscribeRoutes = require("./routes/subscribe");
const { dbPath } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const siteRoot = path.join(__dirname, "..");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "kmm-lifestyle-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/subscribe", subscribeRoutes);

app.use(express.static(siteRoot));

app.use((err, _req, res, _next) => {
  console.error(err);
  const locked = err.code === "SQLITE_BUSY" || /database is locked/i.test(err.message);
  res.status(locked ? 503 : 500).json({
    error: locked ? "Database is busy. Please try again in a moment." : "Server error.",
  });
});

app.listen(PORT, () => {
  console.log(`KMM Lifestyle running at http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/health`);
  console.log(`Database: ${dbPath}`);
});
