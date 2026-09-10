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
    firstEnv(
      "GMAIL_USER",
      "STUDIO_EMAIL",
      "SMTP_USER",
      "EMAIL_USER"
    ) || "konkolykitty@gmail.com"
  );
}

function getInstructorEmail() {
  return (
    firstEnv("INSTRUCTOR_EMAIL", "NOTIFY_EMAIL", "BOOKING_NOTIFY_EMAIL") ||
    "konkolykitty@gmail.com"
  );
}

/** Gmail OAuth 2.0 (Client ID / Secret / Refresh Token). */
function getGmailOAuthConfig() {
  const user = getStudioEmail();
  const clientId = firstEnv(
    "GMAIL_CLIENT_ID",
    "GOOGLE_CLIENT_ID",
    "OAUTH_CLIENT_ID"
  );
  const clientSecret = firstEnv(
    "GMAIL_CLIENT_SECRET",
    "GOOGLE_CLIENT_SECRET",
    "OAUTH_CLIENT_SECRET"
  );
  const refreshToken = firstEnv(
    "GMAIL_REFRESH_TOKEN",
    "GOOGLE_REFRESH_TOKEN",
    "OAUTH_REFRESH_TOKEN"
  );
  const redirectUri =
    firstEnv("GMAIL_REDIRECT_URI", "GOOGLE_REDIRECT_URI") ||
    "https://developers.google.com/oauthplayground";

  return {
    user,
    clientId,
    clientSecret,
    refreshToken,
    redirectUri,
    configured: Boolean(user && clientId && clientSecret && refreshToken),
  };
}

function getResendApiKey() {
  return firstEnv("RESEND_API_KEY");
}

function getEmailFrom() {
  if (getGmailOAuthConfig().configured) {
    return `Konga Kittivel <${getStudioEmail()}>`;
  }

  const configured = firstEnv("EMAIL_FROM", "RESEND_FROM");
  if (configured) {
    if (
      /@gmail\.com>?$/i.test(configured) ||
      /@googlemail\.com>?$/i.test(configured)
    ) {
      return "Konga Kittivel <onboarding@resend.dev>";
    }
    return configured;
  }

  const studio = getStudioEmail();
  if (/@(gmail|googlemail)\.com$/i.test(studio)) {
    return "Konga Kittivel <onboarding@resend.dev>";
  }
  return `Konga Kittivel <${studio}>`;
}

function getEmailProviderName() {
  if (getGmailOAuthConfig().configured) return "gmail_oauth";
  if (getResendApiKey()) return "resend";
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
  getGmailOAuthConfig,
  getResendApiKey,
  getEmailFrom,
  getEmailProviderName,
  get STUDIO_EMAIL() {
    return getStudioEmail();
  },
  get INSTRUCTOR_EMAIL() {
    return getInstructorEmail();
  },
  DB_PATH:
    process.env.DB_PATH ||
    path.join(__dirname, "..", "data", "bookings.json"),
};
