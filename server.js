/**
 * Express server — static site + booking API.
 * Binds to process.env.PORT for Railway, falls back to 5050 locally.
 */
const fs = require("fs");
const path = require("path");

// Local .env only (Railway injects real env vars; no dotenv package).
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
} catch (err) {
  console.warn("[env] could not read .env:", err.message);
}

const express = require("express");
const { getDb } = require("./lib/db");
const { registerBookingRoutes } = require("./routes/bookings");

const app = express();
const PORT = Number(process.env.PORT) || 5050;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");

try {
  getDb();
  console.log("[startup] booking store ready");
} catch (err) {
  console.error("[startup] Failed to open booking store:", err);
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

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`[shutdown] ${signal} received`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
