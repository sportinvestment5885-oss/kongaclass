"use strict";

const {
  CLASS_DURATION_MINUTES,
  TIMEZONE,
  LOCATION,
  STUDIO_EMAIL,
} = require("./config");

function pad(n) {
  return String(n).padStart(2, "0");
}

function escapeText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line) {
  const max = 75;
  if (line.length <= max) return line;
  const parts = [];
  parts.push(line.slice(0, max));
  let rest = line.slice(max);
  while (rest.length > max - 1) {
    parts.push(` ${rest.slice(0, max - 1)}`);
    rest = rest.slice(max - 1);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

function localStamp(y, m, d, hh, mm) {
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

function addMinutesToLocal(y, m, d, hh, mm, minutes) {
  const total = hh * 60 + mm + minutes;
  const dayAdd = Math.floor(total / (24 * 60));
  const rem = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const endH = Math.floor(rem / 60);
  const endMin = rem % 60;
  const dt = new Date(Date.UTC(y, m - 1, d + dayAdd));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
    hour: endH,
    minute: endMin,
  };
}

function utcStamp(date) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/**
 * Build a .ics event for Konga class (Europe/Budapest local times).
 */
function buildIcs({
  uid,
  date,
  time,
  title,
  description,
  attendeeEmail,
  attendeeName,
}) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const end = addMinutesToLocal(y, m, d, hh, mm, CLASS_DURATION_MINUTES);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//J.B Konga by Kitti//Booking//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=${TIMEZONE}:${localStamp(y, m, d, hh, mm)}`,
    `DTEND;TZID=${TIMEZONE}:${localStamp(end.year, end.month, end.day, end.hour, end.minute)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(LOCATION)}`,
    `ORGANIZER;CN=J.B Konga by Kitti:mailto:${STUDIO_EMAIL}`,
  ];

  if (attendeeEmail) {
    const cn = attendeeName ? `;CN=${escapeText(attendeeName)}` : "";
    lines.push(`ATTENDEE${cn}:mailto:${attendeeEmail}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

module.exports = { buildIcs };
