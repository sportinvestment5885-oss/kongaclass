"use strict";

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { DB_PATH } = require("./config");

let db;

function getDb() {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_slot
      ON bookings (date, time, status);
  `);

  return db;
}

function countConfirmed(date, time) {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS count
       FROM bookings
       WHERE date = ? AND time = ? AND status = 'confirmed'`
    )
    .get(date, time);
  return row.count;
}

function countConfirmedByDates(dates) {
  if (!dates.length) return new Map();

  const placeholders = dates.map(() => "?").join(",");
  const rows = getDb()
    .prepare(
      `SELECT date, time, COUNT(*) AS count
       FROM bookings
       WHERE status = 'confirmed' AND date IN (${placeholders})
       GROUP BY date, time`
    )
    .all(...dates);

  const map = new Map();
  for (const row of rows) {
    map.set(`${row.date}|${row.time}`, row.count);
  }
  return map;
}

/**
 * Insert booking if capacity allows. Returns { ok, booking?, error? }.
 */
function createBooking({ date, time, name, phone, email, capacity }) {
  const insert = getDb().prepare(
    `INSERT INTO bookings (date, time, name, phone, email)
     VALUES (@date, @time, @name, @phone, @email)`
  );

  const tx = getDb().transaction((payload) => {
    const taken = countConfirmed(payload.date, payload.time);
    if (taken >= capacity) {
      return { ok: false, error: "full" };
    }

    const info = insert.run(payload);
    return {
      ok: true,
      booking: {
        id: Number(info.lastInsertRowid),
        date: payload.date,
        time: payload.time,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
      },
    };
  });

  return tx({ date, time, name, phone, email });
}

module.exports = {
  getDb,
  countConfirmed,
  countConfirmedByDates,
  createBooking,
};
