"use strict";

const path = require("path");

const CAPACITY = 10;
const MAX_MONTHS_AHEAD = 2;
const CLASS_DURATION_MINUTES = 60;
const TIMEZONE = "Europe/Budapest";
const CLASS_TITLE = "Konga Tánc";
const INSTRUCTOR = "Kitti";
const LOCATION = "Baja, Szegedi út 9";

/** weekday: 0=Sun … 6=Sat (JS Date) → time HH:MM */
const WEEKLY_SLOTS = {
  2: "19:30", // Tuesday
  4: "18:30", // Thursday
};

const STUDIO_EMAIL =
  process.env.STUDIO_EMAIL || "szpitor@gmail.com";

module.exports = {
  CAPACITY,
  MAX_MONTHS_AHEAD,
  CLASS_DURATION_MINUTES,
  TIMEZONE,
  CLASS_TITLE,
  INSTRUCTOR,
  LOCATION,
  WEEKLY_SLOTS,
  STUDIO_EMAIL,
  DB_PATH:
    process.env.DB_PATH ||
    path.join(__dirname, "..", "data", "bookings.json"),
  SMTP: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || STUDIO_EMAIL,
    pass: process.env.SMTP_PASS || "",
  },
};
