"use strict";

const {
  WEEKLY_SLOTS,
  CAPACITY,
  MAX_MONTHS_AHEAD,
  CLASS_TITLE,
  INSTRUCTOR,
  TIMEZONE,
} = require("./config");
const { countConfirmedByDates } = require("./db");

function pad(n) {
  return String(n).padStart(2, "0");
}

function toDateKey(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Current calendar parts in Europe/Budapest. */
function nowInBudapest() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function addMonths(y, m, d, months) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

function weekdayUtc(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function compareDateTime(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  if (a.day !== b.day) return a.day - b.day;
  if (a.hour !== b.hour) return a.hour - b.hour;
  return a.minute - b.minute;
}

function isValidSlot(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (!/^\d{2}:\d{2}$/.test(time)) return false;

  const [y, m, d] = date.split("-").map(Number);
  const weekday = weekdayUtc(y, m, d);
  const expected = WEEKLY_SLOTS[weekday];
  if (expected !== time) return false;

  const now = nowInBudapest();
  const max = addMonths(now.year, now.month, now.day, MAX_MONTHS_AHEAD);
  const [hh, mm] = time.split(":").map(Number);

  const slot = { year: y, month: m, day: d, hour: hh, minute: mm };
  if (compareDateTime(slot, now) <= 0) return false;

  const slotDateOnly = { year: y, month: m, day: d, hour: 0, minute: 0 };
  const maxDateOnly = {
    year: max.year,
    month: max.month,
    day: max.day,
    hour: 0,
    minute: 0,
  };
  if (compareDateTime(slotDateOnly, maxDateOnly) > 0) return false;

  return true;
}

function generateOpenSlots() {
  const now = nowInBudapest();
  const max = addMonths(now.year, now.month, now.day, MAX_MONTHS_AHEAD);
  const slots = [];

  let y = now.year;
  let m = now.month;
  let d = now.day;

  while (true) {
    const key = toDateKey(y, m, d);
    const weekday = weekdayUtc(y, m, d);
    const time = WEEKLY_SLOTS[weekday];

    if (time) {
      const [hh, mm] = time.split(":").map(Number);
      const slotMoment = { year: y, month: m, day: d, hour: hh, minute: mm };
      if (compareDateTime(slotMoment, now) > 0) {
        slots.push({
          date: key,
          time,
          title: CLASS_TITLE,
          instructor: INSTRUCTOR,
          capacity: CAPACITY,
        });
      }
    }

    const cursor = { year: y, month: m, day: d, hour: 0, minute: 0 };
    const maxOnly = {
      year: max.year,
      month: max.month,
      day: max.day,
      hour: 0,
      minute: 0,
    };
    if (compareDateTime(cursor, maxOnly) >= 0) break;

    const next = new Date(Date.UTC(y, m - 1, d + 1));
    y = next.getUTCFullYear();
    m = next.getUTCMonth() + 1;
    d = next.getUTCDate();
  }

  return slots;
}

function listSlotsWithAvailability() {
  const open = generateOpenSlots();
  const dates = [...new Set(open.map((s) => s.date))];
  const counts = countConfirmedByDates(dates);

  return open.map((slot) => {
    const taken = counts.get(`${slot.date}|${slot.time}`) || 0;
    const spotsLeft = Math.max(0, slot.capacity - taken);
    return {
      date: slot.date,
      time: slot.time,
      title: slot.title,
      instructor: slot.instructor,
      capacity: slot.capacity,
      spotsLeft,
      full: spotsLeft === 0,
    };
  });
}

module.exports = {
  isValidSlot,
  listSlotsWithAvailability,
  generateOpenSlots,
};
