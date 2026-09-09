/**
 * Express server — static site + booking API (SQLite).
 * Binds to process.env.PORT for Railway, falls back to 5050 locally.
 */
require("dotenv").config();

const path = require("path");
const express = require("express");
const { getDb } = require("./lib/db");
const { registerBookingRoutes } = require("./routes/bookings");

const app = express();
const PORT = process.env.PORT || 5050;
const PUBLIC_DIR = path.join(__dirname, "public");

getDb();

app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false }));

registerBookingRoutes(app);

app.use(express.static(PUBLIC_DIR));

app.get("/foglalas", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "foglalas.html"));
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "not_found" });
  }
  return res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
