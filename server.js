/**
 * Express server — static site + booking API (SQLite).
 * Binds to process.env.PORT for Railway, falls back to 5050 locally.
 */
require("dotenv").config({ quiet: true });

const path = require("path");
const express = require("express");
const { getDb } = require("./lib/db");
const { registerBookingRoutes } = require("./routes/bookings");

const app = express();
const PORT = Number(process.env.PORT) || 5050;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");

try {
  getDb();
} catch (err) {
  console.error("[startup] Failed to open SQLite database:", err);
  process.exit(1);
}

app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false }));

registerBookingRoutes(app);

app.use(express.static(PUBLIC_DIR));

app.get("/foglalas", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "foglalas.html"));
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "not_found" });
  }
  return res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
