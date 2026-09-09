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
  4: "19:30", // Thursday
};

function firstEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value != null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function getStudioEmail() {
  return (
    firstEnv("STUDIO_EMAIL", "SMTP_USER", "GMAIL_USER") ||
    "szpitor@gmail.com"
  );
}

function getInstructorEmail() {
  return (
    firstEnv("INSTRUCTOR_EMAIL", "NOTIFY_EMAIL", "BOOKING_NOTIFY_EMAIL") ||
    "konkolykitty@gmail.com"
  );
}

function getSmtpConfig() {
  const user = firstEnv(
    "SMTP_USER",
    "GMAIL_USER",
    "STUDIO_EMAIL",
    "EMAIL_USER"
  );
  // App passwords are often pasted with spaces — strip them.
  const pass = firstEnv(
    "SMTP_PASS",
    "SMTP_PASSWORD",
    "GMAIL_APP_PASSWORD",
    "GMAIL_PASS",
    "EMAIL_PASS"
  ).replace(/\s+/g, "");

  const secureRaw = firstEnv("SMTP_SECURE");
  const port = Number(firstEnv("SMTP_PORT") || (secureRaw === "true" ? 465 : 587));

  return {
    host: firstEnv("SMTP_HOST") || "smtp.gmail.com",
    port,
    secure: secureRaw === "true" || port === 465,
    user,
    pass,
  };
}

function getResendApiKey() {
  return firstEnv("RESEND_API_KEY");
}

/** From header for API providers (Resend). */
function getEmailFrom() {
  return (
    firstEnv("EMAIL_FROM", "RESEND_FROM") ||
    `Konga Kittivel <${getStudioEmail()}>`
  );
}

function getEmailProviderName() {
  if (getResendApiKey()) return "resend";
  const smtp = getSmtpConfig();
  if (smtp.user && smtp.pass) return "smtp";
  return "none";
}

module.exports = {
  CAPACITY,
  MAX_MONTHS_AHEAD,
  CLASS_DURATION_MINUTES,
  TIMEZONE,
  CLASS_TITLE,
  INSTRUCTOR,
  LOCATION,
  WEEKLY_SLOTS,
  getStudioEmail,
  getInstructorEmail,
  getSmtpConfig,
  getResendApiKey,
  getEmailFrom,
  getEmailProviderName,
  get STUDIO_EMAIL() {
    return getStudioEmail();
  },
  get INSTRUCTOR_EMAIL() {
    return getInstructorEmail();
  },
  get SMTP() {
    return getSmtpConfig();
  },
  DB_PATH:
    process.env.DB_PATH ||
    path.join(__dirname, "..", "data", "bookings.json"),
};
