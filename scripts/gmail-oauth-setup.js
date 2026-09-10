#!/usr/bin/env node
/**
 * Test / generate Gmail OAuth tokens.
 *
 * Usage:
 *   1) Fill GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET in .env
 *   2) node scripts/gmail-oauth-setup.js
 *   3) Open the printed URL, approve, paste the code
 *   4) Copy refresh_token into Railway GMAIL_REFRESH_TOKEN
 *   5) node scripts/gmail-oauth-setup.js --test   (verifies refresh works)
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnv();

const CLIENT_ID = (process.env.GMAIL_CLIENT_ID || "").trim();
const CLIENT_SECRET = (process.env.GMAIL_CLIENT_SECRET || "").trim();
const REFRESH_TOKEN = (process.env.GMAIL_REFRESH_TOKEN || "").trim();
const REDIRECT_URI =
  (process.env.GMAIL_REDIRECT_URI || "").trim() ||
  "https://developers.google.com/oauthplayground";
const USER = (process.env.GMAIL_USER || process.env.STUDIO_EMAIL || "").trim();

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env first.");
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

async function testRefresh() {
  if (!REFRESH_TOKEN) {
    console.error("No GMAIL_REFRESH_TOKEN in .env — generate one first.");
    process.exit(1);
  }
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  try {
    const { token } = await oAuth2Client.getAccessToken();
    if (!token) throw new Error("empty access token");
    console.log("OK: refresh token works with this Client ID/Secret.");
    console.log("user:", USER || "(set GMAIL_USER)");
    console.log("access token length:", String(token).length);
  } catch (err) {
    const code = err?.response?.data?.error || err.message;
    console.error("FAIL:", code);
    console.error(
      "Fix: recreate refresh token in OAuth Playground using THESE exact Client ID/Secret (gear → Use your own OAuth credentials)."
    );
    process.exit(1);
  }
}

async function generate() {
  const scopes = ["https://mail.google.com/"];
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  console.log("\n1) Open this URL in a browser (login as the sending Gmail):\n");
  console.log(url);
  console.log(
    "\n2) After approve, you land on a page — copy the `code` query param from the URL,"
  );
  console.log("   OR if using Playground, copy the Authorization code from there.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const code = await new Promise((resolve) => {
    rl.question("Paste authorization code: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  const { tokens } = await oAuth2Client.getToken(code);
  console.log("\n--- Save these to Railway / .env ---");
  console.log("GMAIL_CLIENT_ID=" + CLIENT_ID);
  console.log("GMAIL_CLIENT_SECRET=" + CLIENT_SECRET);
  console.log("GMAIL_REFRESH_TOKEN=" + tokens.refresh_token);
  console.log("GMAIL_USER=" + (USER || "your-sending-gmail@gmail.com"));
  console.log("GMAIL_REDIRECT_URI=" + REDIRECT_URI);
  if (!tokens.refresh_token) {
    console.warn(
      "\nWARNING: No refresh_token returned. Revoke app access and retry with prompt=consent."
    );
  }
}

(async () => {
  if (process.argv.includes("--test")) {
    await testRefresh();
  } else {
    await generate();
  }
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
