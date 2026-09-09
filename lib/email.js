"use strict";

const config = require("./config");
const {
  LOCATION,
  CLASS_TITLE,
  CLASS_DURATION_MINUTES,
  TIMEZONE,
  getSmtpConfig,
  getInstructorEmail,
  getStudioEmail,
} = config;
const nodemailer = require("nodemailer");
const { buildIcs } = require("./ics");

let transporter;
let transporterKey = "";

function getTransporter() {
  const SMTP = getSmtpConfig();
  const key = `${SMTP.host}|${SMTP.port}|${SMTP.user}|${SMTP.pass ? "1" : "0"}`;

  if (transporter && transporterKey === key) return transporter;

  transporter = null;
  transporterKey = key;

  if (!SMTP.user || !SMTP.pass) {
    console.warn(
      `[email] SMTP nincs beállítva (user=${SMTP.user || "MISSING"}, pass=${SMTP.pass ? `ok(${SMTP.pass.length})` : "MISSING"})`
    );
    return null;
  }

  console.log(
    `[email] SMTP transport: host=${SMTP.host} port=${SMTP.port} user=${SMTP.user}`
  );

  transporter = nodemailer.createTransport({
    host: SMTP.host,
    port: SMTP.port,
    secure: SMTP.secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
      user: SMTP.user,
      pass: SMTP.pass,
    },
  });
  return transporter;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function formatDisplayDateTime(date, time) {
  return `${date} ${time}`;
}

/** Convert Europe/Budapest civil date+time to a UTC Date. */
function budapestLocalToUtc(date, time) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  let utcMs = Date.UTC(y, mo - 1, d, h, mi, 0);

  for (let i = 0; i < 4; i += 1) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(utcMs));
    const get = (type) =>
      Number(parts.find((p) => p.type === type)?.value || 0);
    const asLocalMs = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute")
    );
    const wantedMs = Date.UTC(y, mo - 1, d, h, mi);
    utcMs += wantedMs - asLocalMs;
  }

  return new Date(utcMs);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toGoogleUtcStamp(dateObj) {
  return (
    `${dateObj.getUTCFullYear()}${pad(dateObj.getUTCMonth() + 1)}${pad(dateObj.getUTCDate())}` +
    `T${pad(dateObj.getUTCHours())}${pad(dateObj.getUTCMinutes())}${pad(dateObj.getUTCSeconds())}Z`
  );
}

function buildGoogleCalendarUrl({
  title,
  details,
  location,
  date,
  time,
}) {
  const start = budapestLocalToUtc(date, time);
  const end = new Date(start.getTime() + CLASS_DURATION_MINUTES * 60 * 1000);
  const params = new URLSearchParams({
    text: title,
    dates: `${toGoogleUtcStamp(start)}/${toGoogleUtcStamp(end)}`,
    details,
    location: location || LOCATION,
    sf: "true",
    output: "xml",
  });
  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
}

function emailShell({ heading, bodyHtml, footerHtml }) {
  return `<!DOCTYPE html>
<html lang="hu">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f6f8">
    <tr>
      <td align="center" style="padding:24px 12px">
        <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border:1px solid #e0e0e0;border-radius:6px;max-width:600px">
          <tr>
            <td bgcolor="#0b74de" style="color:#ffffff;font-size:18px;font-weight:bold;padding:16px;border-top-left-radius:6px;border-top-right-radius:6px">
              ${heading}
            </td>
          </tr>
          <tr>
            <td style="padding:20px;font-size:14px;color:#333333;line-height:1.5">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td bgcolor="#f7f9fb" style="padding:12px 20px;font-size:12px;color:#666666;border-bottom-left-radius:6px;border-bottom-right-radius:6px">
              ${footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function calendarButton(url) {
  const safeUrl = escapeHtml(url);
  return `
    <table border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td bgcolor="#0b74de" style="border-radius:4px">
          <a href="${safeUrl}" style="display:inline-block;padding:10px 18px;font-size:14px;color:#ffffff;text-decoration:none;font-weight:bold" target="_blank" rel="noopener noreferrer">
            Hozzáadás a Google Naptárhoz
          </a>
        </td>
      </tr>
    </table>
    <br>
    Ha a gomb nem működik, másolja be ezt a linket a böngészőbe:<br>
    <a href="${safeUrl}" style="color:#0b74de;font-size:12px;word-break:break-all" target="_blank" rel="noopener noreferrer">${safeUrl}</a>
  `;
}

function detailsTable(rows) {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><td width="120"><strong>${escapeHtml(label)}</strong></td><td>${value}</td></tr>`
    )
    .join("");
  return `<table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size:13px;color:#333333"><tbody>${cells}</tbody></table>`;
}

function buildInstructorEmail(booking) {
  const when = formatDisplayDateTime(booking.date, booking.time);
  const phone = booking.phone || "—";
  const comment = booking.comment || "";
  const eventLabel = "Konga Kittivel";

  const calendarUrl = buildGoogleCalendarUrl({
    title: booking.name,
    details: `Foglalás – ${booking.name} (${booking.email}${booking.phone ? `, tel.${booking.phone}` : ""})${comment ? ` Megjegyzés: ${comment}` : ""}`,
    location: LOCATION,
    date: booking.date,
    time: booking.time,
  });

  const emailLink = `<a href="mailto:${escapeHtml(booking.email)}" style="color:#0b74de">${escapeHtml(booking.email)}</a>`;

  const bodyHtml = `
    Szia Kitti a Konga istennője :) ,<br><br>
    Foglalás részletei.<br><br>
    ${detailsTable([
      ["Esemény", escapeHtml(eventLabel)],
      ["Időpont", escapeHtml(when)],
      ["Név", escapeHtml(booking.name)],
      ["E-mail", emailLink],
      ["Telefon", escapeHtml(phone)],
      ["Megjegyzés", escapeHtml(comment)],
    ])}
    <br>
    ${calendarButton(calendarUrl)}
  `;

  return {
    subject: `Új Foglalás – ${booking.name} · ${when}`,
    html: emailShell({
      heading: "Új Foglalás",
      bodyHtml,
      footerHtml: "Üdv.,<br><strong>Peti a kedvenc fejlesztőd</strong>",
    }),
    text: [
      "Szia Kitti,",
      "",
      "Új foglalás érkezett.",
      `Esemény: ${eventLabel}`,
      `Időpont: ${when}`,
      `Név: ${booking.name}`,
      `E-mail: ${booking.email}`,
      `Telefon: ${phone}`,
      `Megjegyzés: ${comment || "-"}`,
      "",
      `Google Naptár: ${calendarUrl}`,
    ].join("\n"),
  };
}

function buildClientEmail(booking) {
  const whenHu = `${formatHuDate(booking.date)} ${booking.time}`;
  const when = formatDisplayDateTime(booking.date, booking.time);
  const eventLabel = `${CLASS_TITLE} – Konga Kittivel`;

  const calendarUrl = buildGoogleCalendarUrl({
    title: eventLabel,
    details: [
      `Foglalás visszaigazolás`,
      `Név: ${booking.name}`,
      `E-mail: ${booking.email}`,
      booking.phone ? `Telefon: ${booking.phone}` : null,
      `Helyszín: ${LOCATION}`,
      `Lemondás: az edzés előtt legalább 4 órával jelezd.`,
    ]
      .filter(Boolean)
      .join("\n"),
    location: LOCATION,
    date: booking.date,
    time: booking.time,
  });

  const bodyHtml = `
    Kedves ${escapeHtml(booking.name)}!<br><br>
    Köszönjük a foglalásodat – rögzítettük az alábbi időpontot.<br><br>
    ${detailsTable([
      ["Esemény", escapeHtml(eventLabel)],
      ["Időpont", escapeHtml(when)],
      ["Helyszín", escapeHtml(LOCATION)],
      ["Név", escapeHtml(booking.name)],
      [
        "E-mail",
        `<a href="mailto:${escapeHtml(booking.email)}" style="color:#0b74de">${escapeHtml(booking.email)}</a>`,
      ],
      ["Telefon", escapeHtml(booking.phone || "—")],
    ])}
    <br>
    ${calendarButton(calendarUrl)}
    <br><br>
    Lemondás: az edzés előtt legalább 4 órával jelezd e-mailben:
    <a href="mailto:${escapeHtml(getInstructorEmail())}" style="color:#0b74de">${escapeHtml(getInstructorEmail())}</a>
  `;

  return {
    subject: `Foglalás visszaigazolás – ${CLASS_TITLE} (${whenHu})`,
    html: emailShell({
      heading: "Foglalás visszaigazolás",
      bodyHtml,
      footerHtml: `Üdvözlettel,<br><strong>Konga Kittivel</strong><br>${escapeHtml(getInstructorEmail())}`,
    }),
    text: [
      `Kedves ${booking.name}!`,
      "",
      "Köszönjük a foglalásodat – rögzítettük.",
      `Esemény: ${eventLabel}`,
      `Időpont: ${when}`,
      `Helyszín: ${LOCATION}`,
      "",
      `Google Naptár: ${calendarUrl}`,
      "",
      `Lemondás: legalább 4 órával előtte – ${getInstructorEmail()}`,
    ].join("\n"),
  };
}

async function sendBookingEmails(booking) {
  const SMTP = getSmtpConfig();
  const instructorEmail = getInstructorEmail();
  const transport = getTransporter();
  if (!transport) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  const when = `${formatHuDate(booking.date)} ${booking.time}`;
  const icsTitle = `${CLASS_TITLE} – Konga Kittivel`;
  const icsDescription = [
    `${CLASS_TITLE} edzés`,
    `Időpont: ${when}`,
    `Helyszín: ${LOCATION}`,
    `Foglaló: ${booking.name}`,
    booking.phone ? `Telefon: ${booking.phone}` : null,
    `E-mail: ${booking.email}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ics = buildIcs({
    uid: `booking-${booking.id}@kongakitti`,
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

  const instructorMail = buildInstructorEmail(booking);
  const clientMail = buildClientEmail(booking);
  const fromAddress = SMTP.user || getStudioEmail();

  console.log(
    `[email] sending booking #${booking.id} → client=${booking.email}, instructor=${instructorEmail}, from=${fromAddress}`
  );

  try {
    const [clientResult, instructorResult] = await Promise.all([
      transport.sendMail({
        from: `"Konga Kittivel" <${fromAddress}>`,
        to: booking.email,
        replyTo: instructorEmail,
        subject: clientMail.subject,
        text: clientMail.text,
        html: clientMail.html,
        attachments: [icsAttachment],
      }),
      transport.sendMail({
        from: `"Konga Kittivel foglalás" <${fromAddress}>`,
        to: instructorEmail,
        replyTo: booking.email,
        subject: instructorMail.subject,
        text: instructorMail.text,
        html: instructorMail.html,
        attachments: [icsAttachment],
      }),
    ]);

    console.log(
      `[email] sent ok booking #${booking.id} clientMsg=${clientResult.messageId} instructorMsg=${instructorResult.messageId}`
    );
    return { sent: true };
  } catch (err) {
    console.error(`[email] send failed booking #${booking.id}:`, err.message);
    throw err;
  }
}

module.exports = {
  sendBookingEmails,
  buildGoogleCalendarUrl,
  buildInstructorEmail,
  buildClientEmail,
};
