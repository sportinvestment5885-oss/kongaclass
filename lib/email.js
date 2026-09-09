"use strict";

const nodemailer = require("nodemailer");
const { SMTP, STUDIO_EMAIL, LOCATION, CLASS_TITLE } = require("./config");
const { buildIcs } = require("./ics");

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP.pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP.host,
    port: SMTP.port,
    secure: SMTP.secure,
    auth: {
      user: SMTP.user,
      pass: SMTP.pass,
    },
  });
  return transporter;
}

function formatHuDate(date) {
  const [y, m, d] = date.split("-").map(Number);
  const months = [
    "január",
    "február",
    "március",
    "április",
    "május",
    "június",
    "július",
    "augusztus",
    "szeptember",
    "október",
    "november",
    "december",
  ];
  return `${y}. ${months[m - 1]} ${d}.`;
}

async function sendBookingEmails(booking) {
  const transport = getTransporter();
  if (!transport) {
    console.warn(
      "[email] SMTP_PASS nincs beállítva — e-mailek kihagyva. Foglalás mentve."
    );
    return { sent: false, reason: "smtp_not_configured" };
  }

  const when = `${formatHuDate(booking.date)} ${booking.time}`;
  const uid = `booking-${booking.id}@kongakitti`;
  const icsTitle = `${CLASS_TITLE} – J.B Konga by Kitti`;
  const icsDescription = [
    `${CLASS_TITLE} edzés`,
    `Időpont: ${when}`,
    `Helyszín: ${LOCATION}`,
    `Foglaló: ${booking.name}`,
    `Telefon: ${booking.phone}`,
    `E-mail: ${booking.email}`,
  ].join("\n");

  const ics = buildIcs({
    uid,
    date: booking.date,
    time: booking.time,
    title: icsTitle,
    description: icsDescription,
    attendeeEmail: booking.email,
    attendeeName: booking.name,
  });

  const icsAttachment = {
    filename: "konga-edzes.ics",
    content: ics,
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
  };

  const clientSubject = `Foglalás visszaigazolás – ${CLASS_TITLE} (${when})`;
  const clientText = [
    `Kedves ${booking.name}!`,
    "",
    `Foglalásodat rögzítettük.`,
    "",
    `Edzés: ${CLASS_TITLE}`,
    `Időpont: ${when}`,
    `Helyszín: ${LOCATION}`,
    "",
    "A csatolt .ics fájlt megnyitva hozzáadhatod az edzést a naptáradhoz (pl. Google Calendar).",
    "",
    "Lemondás: az edzés előtt legalább 4 órával jelezd.",
    "",
    "Üdvözlettel,",
    "J.B Konga by Kitti",
    STUDIO_EMAIL,
  ].join("\n");

  const studioSubject = `Új foglalás – ${booking.name} · ${when}`;
  const studioText = [
    "Új online foglalás érkezett.",
    "",
    `Név: ${booking.name}`,
    `Telefon: ${booking.phone}`,
    `E-mail: ${booking.email}`,
    `Edzés: ${CLASS_TITLE}`,
    `Időpont: ${when}`,
    `Helyszín: ${LOCATION}`,
    `Foglalás ID: ${booking.id}`,
    "",
    "A csatolt .ics fájlt nyisd meg / importáld a Google Calendarba.",
  ].join("\n");

  await Promise.all([
    transport.sendMail({
      from: `"J.B Konga by Kitti" <${STUDIO_EMAIL}>`,
      to: booking.email,
      replyTo: STUDIO_EMAIL,
      subject: clientSubject,
      text: clientText,
      attachments: [icsAttachment],
    }),
    transport.sendMail({
      from: `"J.B Konga foglalás" <${STUDIO_EMAIL}>`,
      to: STUDIO_EMAIL,
      subject: studioSubject,
      text: studioText,
      attachments: [icsAttachment],
    }),
  ]);

  return { sent: true };
}

module.exports = { sendBookingEmails };
