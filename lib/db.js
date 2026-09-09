"use strict";

const fs = require("fs");
const path = require("path");
const { DB_PATH } = require("./config");

let cache = null;

function ensureStore() {
  if (cache) return cache;

  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(DB_PATH)) {
    cache = { nextId: 1, bookings: [] };
    persist();
    return cache;
  }

  const raw = fs.readFileSync(DB_PATH, "utf8");
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
  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), "utf8");
  fs.renameSync(tmp, DB_PATH);
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
