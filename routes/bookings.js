"use strict";

const { CAPACITY } = require("../lib/config");
const { isValidSlot, listSlotsWithAvailability } = require("../lib/slots");
const { createBooking } = require("../lib/db");
const { sendBookingEmails } = require("../lib/email");

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function registerBookingRoutes(app) {
  app.get("/api/slots", (_req, res) => {
    try {
      const slots = listSlotsWithAvailability();
      res.json({ slots });
    } catch (err) {
      console.error("[api/slots]", err);
      res.status(500).json({ error: "server_error" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const date = trim(req.body?.date);
      const time = trim(req.body?.time);
      const name = trim(req.body?.name);
      const phone = trim(req.body?.phone);
      const email = trim(req.body?.email).toLowerCase();

      if (!name || name.length < 2) {
        return res.status(400).json({ error: "invalid_name" });
      }
      if (phone && phone.length < 6) {
        return res.status(400).json({ error: "invalid_phone" });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "invalid_email" });
      }
      if (!isValidSlot(date, time)) {
        return res.status(400).json({ error: "invalid_slot" });
      }

      const result = createBooking({
        date,
        time,
        name,
        phone,
        email,
        capacity: CAPACITY,
      });

      if (!result.ok) {
        return res.status(409).json({ error: result.error || "full" });
      }

      let emailResult = { sent: false };
      try {
        emailResult = await sendBookingEmails(result.booking);
      } catch (mailErr) {
        console.error("[api/bookings] email failed", mailErr);
        emailResult = { sent: false, reason: "email_failed" };
      }

      return res.status(201).json({
        ok: true,
        booking: {
          id: result.booking.id,
          date: result.booking.date,
          time: result.booking.time,
        },
        emailSent: Boolean(emailResult.sent),
      });
    } catch (err) {
      console.error("[api/bookings]", err);
      return res.status(500).json({ error: "server_error" });
    }
  });
}

module.exports = { registerBookingRoutes };
