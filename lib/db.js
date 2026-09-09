"use strict";

const fs = require("fs");
const path = require("path");
const { DB_PATH } = require("./config");

let cache = null;
let activePath = DB_PATH;

function resolveWritablePath() {
  const candidates = [
    DB_PATH,
    path.join("/tmp", "konga-bookings.json"),
  ];

  for (const candidate of candidates) {
    try {
      const dir = path.dirname(candidate);
      fs.mkdirSync(dir, { recursive: true });
      const probe = path.join(dir, `.write-test-${process.pid}`);
      fs.writeFileSync(probe, "ok");
      fs.unlinkSync(probe);
      return candidate;
    } catch (err) {
      console.warn(`[db] not writable: ${candidate} (${err.message})`);
    }
  }

  throw new Error("No writable path for bookings store");
}

function ensureStore() {
  if (cache) return cache;

  activePath = resolveWritablePath();
  if (activePath !== DB_PATH) {
    console.warn(`[db] using fallback store path: ${activePath}`);
  }

  if (!fs.existsSync(activePath)) {
    cache = { nextId: 1, bookings: [] };
    persist();
    return cache;
  }

  const raw = fs.readFileSync(activePath, "utf8");
  cache = JSON.parse(raw || '{"nextId":1,"bookings":[]}');
  if (!Array.isArray(cache.bookings)) cache.bookings = [];
  if (!Number.isInteger(cache.nextId) || cache.nextId < 1) {
    cache.nextId =
      cache.bookings.reduce((max, b) => Math.max(max, Number(b.id) || 0), 0) +
      1;
  }
  return cache;
}

function persist() {
  const dir = path.dirname(activePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${activePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), "utf8");
  fs.renameSync(tmp, activePath);
}

function getDb() {
  return ensureStore();
}

function countConfirmed(date, time) {
  const store = ensureStore();
  return store.bookings.filter(
    (b) =>
      b.date === date && b.time === time && b.status === "confirmed"
  ).length;
}

function countConfirmedByDates(dates) {
  const store = ensureStore();
  const wanted = new Set(dates);
  const map = new Map();

  for (const b of store.bookings) {
    if (b.status !== "confirmed" || !wanted.has(b.date)) continue;
    const key = `${b.date}|${b.time}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

/**
 * Insert booking if capacity allows. Returns { ok, booking?, error? }.
 */
function createBooking({ date, time, name, phone, email, capacity }) {
  const store = ensureStore();
  const taken = countConfirmed(date, time);
  if (taken >= capacity) {
    return { ok: false, error: "full" };
  }

  const booking = {
    id: store.nextId++,
    date,
    time,
    name,
    phone,
    email,
    status: "confirmed",
    created_at: new Date().toISOString(),
  };
  store.bookings.push(booking);
  persist();

  return {
    ok: true,
    booking: {
      id: booking.id,
      date: booking.date,
      time: booking.time,
      name: booking.name,
      phone: booking.phone,
      email: booking.email,
    },
  };
}

module.exports = {
  getDb,
  countConfirmed,
  countConfirmedByDates,
  createBooking,
};
