// The one devDependency. playwright-core is pinned and downloads nothing on install, so a Vercel
// build is untouched by it. It resolves Chromium from PLAYWRIGHT_BROWSERS_PATH when that is set,
// which is what CI images already do; AUDIT_CHROMIUM overrides everything.
"use strict";
const fs = require("fs");
const { chromium } = require("playwright-core");

const FALLBACKS = [
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const HELP = [
  "Could not start Chromium.",
  "Install the matching build with:  npx playwright@1.56.0 install chromium",
  "Or point the audit at a browser you already have:  AUDIT_CHROMIUM=/path/to/chrome npm run audit",
].join("\n");

async function launch() {
  const args = ["--disable-dev-shm-usage", "--no-sandbox", "--font-render-hinting=none"];
  const explicit = process.env.AUDIT_CHROMIUM;
  if (explicit) return chromium.launch({ headless: true, args, executablePath: explicit });
  try {
    return await chromium.launch({ headless: true, args });
  } catch (first) {
    for (const p of FALLBACKS) {
      if (fs.existsSync(p)) {
        try { return await chromium.launch({ headless: true, args, executablePath: p }); } catch (e) { /* next */ }
      }
    }
    try { return await chromium.launch({ headless: true, args, channel: "chrome" }); } catch (e) { /* fall through */ }
    throw new Error(HELP + "\n\n" + first.message);
  }
}

module.exports = { launch };
