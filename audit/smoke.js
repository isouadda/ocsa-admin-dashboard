// npm run smoke: the dashboard's quick check, run on every build (Step 245).
//
// It serves the build/ that npm run build already made, and stops at once when anything in src,
// public or package.json is newer than that build, since a check of a stale bundle proves nothing.
// It signs in against the audit's own stub, with the audit's server, browser and driver, and checks
// what a broken build breaks first:
//   - at 1280 in English and in Spanish, and at 390 in English, an admin signs in (the Spanish pass
//     with the stub answering secondStep, so the code screen is on the way in);
//   - every side panel item opens with no page error, no crash and no sideways scroll;
//   - Reports opens one card of each group, a filed form opens, and Customer links opens;
//   - Help opens and answers the stub;
//   - at 1280 in English a supervisor signs in, sees no admin-only item, and every item they do see
//     opens the same way;
//   - at 1280 in English and in Spanish, against the stub's answers for the API's Step 247 (Step 248):
//     Settings, Holidays lists the year and adds a day; the Rehire window lists the sites to restore,
//     the ones held when the person left ticked; a client's concern past due draws its Due in red; and
//     that concern is marked acknowledged by phone;
//   - against the stub's answers for the API's Step 250 (Step 251): at 1280 in English, the Client
//     requests tab lists the waiting requests and approves one, and a second approver's 409 is drawn;
//     at 1280 in English and in Spanish, a request QR is made and its sheet printed with the area and
//     the title in both languages, and Print label saves a supply's labels.pdf. The two request checks
//     run in English alone to keep the run inside its three minutes;
//   - against the stub's answers for the API's Step 253 (Step 254), at 1280 in English alone for the
//     same reason: the Issue Tracker lists the inspection findings with their times and a fixed
//     finding is verified by someone other than its fixer; a completed inspection shows its band and
//     its findings and asks for a corrective action, whose start names the inspection's site; the
//     corrective action's window links the open findings at its site and tells the client; and the
//     evidence pack prints the finding measures.
// One line a check. Any failure exits non-zero, and so does a run of three minutes or more. The full
// npm run audit is untouched by this.
"use strict";
const { createStubs } = require("./stubs");
const { serve } = require("./lib/serve");
const { launch } = require("./lib/browser");
const { createDriver } = require("./lib/driver");
const { buildIsFresh, BUILD_DIR } = require("./lib/build");
const seed = require("./seed");

const LIMIT_MS = 3 * 60 * 1000;
// The admin items of the side panel, the same list the audit's pages case reads.
const ADMIN_ONLY_NAV = ["Staff Management", "Cases", "Forms", "Settings"];
// The stub's answer to any question Help is asked.
const HELP_REPLY = "Here is what the dashboard shows for that.";
// The stub's person whose employment ended, with three past sites, two held when they left, and the
// day the holiday check adds (audit/stubs.js, Step 247).
const LEFT_ID = "u-staff-12";
const ADDED_HOLIDAY = { date: "2026-04-03", name: "Office closed for training" };
// The area the request QR check makes a QR for.
const SMOKE_AREA = "Loading dock restroom";
const PASSES = [
  { name: "1280 en admin", viewport: "wide", lang: "en", who: "admin", step248: true, step250: true, requestChecks: true, step253: true },
  { name: "1280 es admin", viewport: "wide", lang: "es", who: "admin", secondStep: true, step248: true, step250: true },
  { name: "390 en admin", viewport: "phone", lang: "en", who: "admin" },
  { name: "1280 en supervisor", viewport: "wide", lang: "en", who: "supervisor" },
];

const started = Date.now();
let failures = 0;
function say(ok, pass, what, why) {
  if (!ok) failures += 1;
  process.stdout.write((ok ? "ok    " : "FAIL  ") + pass.padEnd(20) + what + (why ? "  (" + why + ")" : "") + "\n");
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The stub answers sign-in with secondStep and holds the real answer until the code is sent, the
// way POST /api/auth/second-step answers what sign-in answers (STEP225_CONTRACT.md).
function armSecondStep(stubs) {
  const orig = stubs.handle;
  let held = null;
  stubs.handle = (req) => {
    const path = new URL(req.url).pathname;
    if (path === "/api/auth/login" && req.method === "POST") {
      const a = orig(req);
      if (a.status !== 200) return a;
      held = a;
      return { status: 200, json: { secondStep: true, challengeId: "smoke-challenge", emailHint: "a***@example.invalid" } };
    }
    if (path === "/api/auth/second-step" && req.method === "POST") return held || { status: 401, json: { error: "No sign-in to finish" } };
    return orig(req);
  };
}

// What went wrong on the page since mark: a page error, the root error boundary, or a page wider
// than the window.
async function trouble(d, mark) {
  const errs = d.pageErrors.slice(mark).filter((e) => !/favicon|Failed to load resource/.test(e));
  if (errs.length) return "page error: " + errs[0].split("\n")[0].slice(0, 160);
  if (await d.crashed()) return await d.crashDetail();
  const over = await d.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over > 1) return "the page scrolls sideways by " + over + " pixels";
  return "";
}

async function signIn(d, who) {
  const p = seed.PEOPLE[who];
  await d.page.locator("input").nth(1).waitFor({ timeout: 20000 });
  const inputs = d.page.locator("input");
  await inputs.nth(0).fill(p.login.phone);
  await inputs.nth(1).fill(p.login.pin);
  await d.page.getByRole("button", { name: d.say("Sign In") }).or(d.page.getByRole("button", { name: "Sign In" })).first().click();
  let sawCode = false;
  for (let i = 0; i < 80; i++) {
    if (!(await d.signedOut())) return { sawCode };
    if (!sawCode && (await d.page.locator("[data-second-code]").count()) > 0) {
      sawCode = true;
      await d.page.fill("[data-second-code]", "123456");
    }
    await wait(250);
  }
  throw new Error("the dashboard did not open");
}

// The side panel's items, by id and by the words on them, read once the panel has stopped growing:
// an item whose route the shell asks about first draws once that route answers. On a phone the panel
// is the drawer.
async function navItems(d) {
  const read = () => d.page.evaluate(() => Array.from(document.querySelectorAll("[data-nav-item]"))
    .map((b) => ({ id: b.getAttribute("data-nav-item"), label: ((b.innerText || "").trim().split("\n")[0] || b.getAttribute("title") || "").trim() })));
  if (d.phone) await d.openDrawer();
  let items = await read();
  for (let same = 0, i = 0; same < 3 && i < 20; i++) {
    await wait(400);
    const again = await read();
    same = again.length === items.length ? same + 1 : 0;
    items = again;
  }
  if (d.phone) await d.closeDrawer();
  return items;
}

// After a check that left the app behind its root error boundary, a fresh load and a fresh sign-in, so
// the checks after it still run. A crash is already a failed line.
async function recover(d, origin, p) {
  if (!(await d.crashed())) return;
  await d.signOutHard();
  await d.page.goto(origin + "/#overview", { waitUntil: "domcontentloaded" });
  await signIn(d, p.who);
}

// The pause after an item opens was 650 ms until Step 254, whose four lines fit the three minutes
// at 550.
async function openNav(d, id) {
  if (d.phone) await d.openDrawer();
  await d.page.click('[data-nav-item="' + id + '"]');
  await wait(550);
}

// Step 248's screens, each a line.
async function step248(d, origin, p) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  await check("Settings, Holidays lists the year and adds a day", async () => {
    await d.goto("settings"); await wait(900);
    await d.page.getByRole("button", { name: d.say("Holidays"), exact: true }).click(); await wait(700);
    const list = d.page.locator("[data-holidays] table tbody tr");
    const rows = await list.count();
    if (rows < 11) return "the year lists " + rows + " holidays";
    await d.page.locator("[data-holiday-add]").click();
    await d.page.locator('[data-holiday-window] input[type="date"]').fill(ADDED_HOLIDAY.date);
    await d.page.locator("[data-holiday-window] input").nth(1).fill(ADDED_HOLIDAY.name);
    await d.page.locator("[data-holiday-window] button").last().click(); await wait(900);
    if ((await d.page.locator("[data-holiday-window]").count()) > 0) return "the window stayed open";
    return (await list.filter({ hasText: ADDED_HOLIDAY.name }).count()) === 1 ? "" : "the day added is not listed";
  });
  await check("the Rehire window lists the sites to restore", async () => {
    await d.goto("staff", [LEFT_ID]); await wait(1200);
    await d.page.locator('[data-employment-action="rehire"]').click(); await wait(500);
    const rows = await d.page.locator("[data-restore-sites] [data-restore-site]").count();
    const ticked = await d.page.locator("[data-restore-sites] input:checked").count();
    await d.page.locator("[data-employment-window] button").filter({ hasText: d.say("Cancel") }).click();
    return rows !== 3 ? "Sites to restore lists " + rows + " sites" : ticked !== 2 ? ticked + " sites start ticked" : "";
  });
  await check("a client's concern past due draws its Due in red", async () => {
    await d.goto("forms"); await wait(1200);
    const due = d.page.locator('[data-complaint-due][data-due-state="late"]').first();
    if ((await due.count()) === 0) return "no late concern on Filed forms";
    const rgb = await due.evaluate((e) => getComputedStyle(e).color);
    const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
    return m && Number(m[1]) > 150 && Number(m[2]) < 110 && Number(m[3]) < 110 ? "" : "the late Due draws " + rgb;
  });
  await check("a client's concern is marked acknowledged by phone", async () => {
    const row = d.page.locator("table tbody tr").filter({ has: d.page.locator("[data-not-acknowledged]") }).first();
    if ((await row.count()) === 0) return "no concern reads Not acknowledged";
    await row.click(); await wait(1200);
    await d.page.locator("[data-mark-acknowledged]").click();
    await d.page.locator("[data-acknowledge-form] select").selectOption("phone");
    await d.page.locator("[data-acknowledge-form] button").last().click(); await wait(800);
    const line = (await d.page.locator("[data-acknowledged]").count()) ? await d.page.locator("[data-acknowledged]").innerText() : "";
    await d.page.keyboard.press("Escape").catch(() => {});
    return !line ? "no line says it was acknowledged" : (await d.page.locator("[data-mark-acknowledged]").count()) ? "Mark acknowledged is still offered" : "";
  });
}

// Step 250's screens, each a line, against the stub armed with setStep250 (audit/stubs.js).
async function step250(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  const lower = (v) => String(v || "").toLowerCase();
  // The two request checks run on the pass that asks for them (English); the sheet check below proves
  // both languages on its own.
  if (p.requestChecks) await check("Client requests lists the waiting requests and approves one", async () => {
    await d.goto("issues", ["requests"]); await wait(700);
    const rows = d.page.locator("[data-client-requests] table tbody tr");
    const n = await rows.count();
    if (n < 3) return "the list holds " + n + " requests";
    const waiting = await rows.filter({ hasText: d.say("Waiting for approval") }).count();
    if (waiting < 2) return waiting + " wait for approval";
    await rows.first().click(); await wait(900);
    await d.page.locator("[data-request-approve]").click(); await wait(400);
    await d.page.locator("[data-request-approve-save]").click(); await wait(900);
    if ((await d.page.locator("[data-request-approve]").count()) > 0) return "Approve and assign is still offered";
    const text = lower(await d.page.locator("[data-request-window]").innerText());
    await d.page.keyboard.press("Escape").catch(() => {});
    return text.indexOf(lower(d.say("Approved|request"))) < 0 ? "the activity does not read Approved" : "";
  });
  if (p.requestChecks) await check("a second approver's refusal is drawn", async () => {
    await d.goto("issues", ["requests", "rq-2"]); await wait(700);
    await d.page.locator("[data-request-approve]").click(); await wait(400);
    await d.page.locator("[data-request-approve-save]").click(); await wait(900);
    const said = (await d.page.locator("[data-request-said]").count()) ? await d.page.locator("[data-request-said]").innerText() : "";
    const text = lower(await d.page.locator("[data-request-window]").innerText());
    await d.page.keyboard.press("Escape").catch(() => {});
    if (!said) return "no line says who decided first";
    if (said.indexOf(d.say("approved|decided")) < 0) return "the line reads " + JSON.stringify(said);
    return text.indexOf(lower(d.say("Open|request"))) < 0 ? "the row did not refresh to Open" : "";
  });
  await check("a request QR is made and its sheet printed", async () => {
    await d.goto("forms", ["links"]); await wait(700);
    await d.page.locator("[data-link-kind]").selectOption("request");
    await d.page.locator("[data-link-area-input]").fill(SMOKE_AREA);
    await d.page.getByRole("button", { name: d.say("Make a request QR") }).click(); await wait(1000);
    if ((await d.page.locator("[data-qr-screen] [data-link-area]").count()) === 0) return "the QR window did not open on the request QR";
    const before = (await d.prints()).length;
    await d.page.locator("[data-qr-screen]").getByRole("button", { name: d.say("Print sheet") }).click(); await wait(900);
    const prints = await d.prints();
    await d.page.keyboard.press("Escape").catch(() => {});
    if (prints.length <= before) return "no sheet window opened";
    const html = prints[prints.length - 1].html;
    if (html.indexOf(SMOKE_AREA) < 0) return "the sheet does not carry the area";
    return html.indexOf("Ask for help here") < 0 || html.indexOf("Pida ayuda aqu") < 0 ? "the sheet does not carry the title in both languages" : "";
  });
  await check("Print label saves the supply's label", async () => {
    await d.goto("supplies"); await wait(700);
    await d.page.locator("[data-supply-card]").first().click(); await wait(600);
    const btn = d.page.locator("[data-supply-print-label]");
    if ((await btn.count()) === 0) return "Print label is not offered";
    await btn.click(); await wait(900);
    const call = stubs.calls.find((c) => c.path === "/api/supplies/labels.pdf" && /ids=sp-/.test(c.query));
    if (!call) return "labels.pdf was not asked for";
    if (call.status !== 200) return "labels.pdf answered " + call.status;
    if ((await d.page.locator("[data-supply-label-refusal]").count()) > 0) return "a refusal is drawn";
    const downloads = await d.page.evaluate(() => window.__audit.downloads.map((x) => x.name));
    return downloads.indexOf("labels.pdf") < 0 ? "nothing named labels.pdf was saved" : "";
  });
}

// Step 253's screens, each a line, against the stub armed with setStep253 (audit/stubs.js).
async function step253(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  await check("the Issue Tracker lists the findings and one is verified by someone other than its fixer", async () => {
    await d.goto("issues"); await wait(500);
    await d.page.locator("[data-issue-source]").selectOption("inspection"); await wait(300);
    const rows = await d.page.locator("[data-issue-row]").count();
    if (rows < 4) return "the Source Inspection lists " + rows + " findings";
    if ((await d.page.locator("[data-finding-fixed]").count()) === 0) return "no row draws Time to fixed";
    await d.goto("issues", ["f-3"]); await wait(700);
    if ((await d.page.locator("[data-verify]").count()) === 0) return "Verify is not offered on the fixed finding";
    await d.page.locator("[data-verify] textarea").fill("Checked in person at the dock.");
    await d.page.locator("[data-verify-save]").click(); await wait(600);
    const verified = await d.page.locator("[data-verified]").count();
    const still = await d.page.locator("[data-verify]").count();
    await d.page.keyboard.press("Escape").catch(() => {});
    return !verified ? "no line says it was verified" : still ? "Verify is still offered" : "";
  });
  await check("a completed inspection shows its band and findings and asks for a corrective action", async () => {
    await d.goto("inspections"); await wait(500);
    await d.page.getByRole("button", { name: d.say("Completed|inspections") }).first().click(); await wait(300);
    await d.page.locator("table tbody tr").filter({ hasText: "Dock area check" }).first().click(); await wait(700);
    if ((await d.page.locator("[data-inspection-band]").count()) === 0) return "no band is drawn";
    const n = await d.page.locator("[data-inspection-finding]").count();
    if (n < 1) return "the findings list " + n + " rows";
    if ((await d.page.locator("[data-inspection-corrective-required]").count()) === 0) return "no corrective action is asked for";
    await d.page.locator("[data-inspection-corrective-start]").click(); await wait(600);
    const call = stubs.calls.find((c) => c.path === "/api/forms/OCSA-FRM-010/drafts" && c.method === "POST");
    if (!call) return "no corrective action was started";
    if (!call.body || call.body.siteId !== seed.SITES[2].id) return "the start does not name the inspection's site";
    const drawn = (await d.page.locator("[data-inspection-corrective-refusal]").count()) + (await d.page.locator("div[style*='z-index: 500']").count());
    await d.page.keyboard.press("Escape").catch(() => {});
    return drawn ? "" : "neither the form nor a refusal is drawn";
  });
  await check("the corrective action links the open findings at its site and tells the client", async () => {
    await d.goto("forms"); await wait(800);
    const row = d.page.locator("table tbody tr").filter({ hasText: "Corrective Action Report" }).first();
    if ((await row.count()) === 0) return "no corrective action on Filed forms";
    await row.click(); await wait(800);
    const before = await d.page.locator("[data-linked-finding]").count();
    await d.page.locator("[data-link-findings]").click(); await wait(500);
    const offered = await d.page.locator("[data-link-finding]").count();
    if (offered < 2) return "Link findings offers " + offered + " findings";
    const ticked = await d.page.locator("[data-link-findings-form] input:checked").count();
    if (ticked !== offered) return ticked + " of " + offered + " start ticked";
    await d.page.locator("[data-link-findings-save]").click(); await wait(500);
    const after = await d.page.locator("[data-linked-finding]").count();
    if (after !== before + offered) return "the window lists " + after + " linked findings after linking " + offered + " to " + before;
    if ((await d.page.locator("[data-unlink-finding]").count()) !== after) return "Unlink is not offered on each";
    await d.page.locator("[data-tell-client-open]").click(); await wait(300);
    if ((await d.page.locator("[data-tell-client-form] input:checked").count()) < 1) return "no recipient starts ticked";
    await d.page.locator('[data-tell-client-field="whatHappened"]').fill("The inspection found the dock markings worn and the glass streaked.");
    await d.page.locator('[data-tell-client-field="whatWasDone"]').fill("The markings were repainted and the glass cleaned on both sides.");
    await d.page.locator('[data-tell-client-field="prevention"]').fill("The dock is now on the weekly walk.");
    await d.page.locator("[data-tell-client-send]").click(); await wait(700);
    const told = await d.page.locator("[data-client-told]").count();
    const call = stubs.calls.find((c) => /\/tell-client$/.test(c.path) && c.method === "POST");
    await d.page.keyboard.press("Escape").catch(() => {});
    if (!told) return "no line says the client was told";
    return !call || !call.body || !Array.isArray(call.body.to) || !call.body.to.length ? "the send names no recipient" : "";
  });
  await check("the evidence pack prints the finding measures", async () => {
    await d.goto("reports"); await wait(700);
    await d.page.locator("text=OCSA-QMS-018").locator("xpath=../..").getByRole("button").first().click(); await wait(500);
    if ((await d.page.locator("[data-management-review]").count()) === 0) return "Management review did not open";
    const before = (await d.prints()).length;
    await d.page.locator("[data-management-review]").getByRole("button", { name: d.say("Print the evidence pack") }).click();
    let html = "";
    for (let i = 0; i < 40 && !html; i++) { await wait(250); const prints = await d.prints(); if (prints.length > before) html = prints[prints.length - 1].html || ""; }
    if (!html) return "no pack was printed";
    const at = html.indexOf("<td>" + d.say("Findings opened") + "</td>");
    if (at < 0) return "the pack has no Findings opened row";
    const m = /<td>(\d+)<\/td><td>(\d+)<\/td>/.exec(html.slice(at, at + 200));
    return m && Number(m[2]) > 0 ? "" : "the Findings opened row counts none";
  });
}

async function runPass(browser, origin, p) {
  const stubs = createStubs();
  // Step 253 brings Step 250's and 247's answers with it, Step 250 brings Step 247's; every other pass
  // sees Step 247's alone.
  if (p.step253) stubs.setStep253(true); else if (p.step250) stubs.setStep250(true); else stubs.setStep247(true);
  if (p.secondStep) armSecondStep(stubs);
  const d = await createDriver({ browser, origin, stubs, viewport: p.viewport, lang: p.lang });
  // A control that is not there fails its line in seconds, not in the driver's thirty.
  d.page.setDefaultTimeout(8000);
  try {
    await d.page.goto(origin + "/#overview", { waitUntil: "domcontentloaded" });
    try {
      const r = await signIn(d, p.who);
      say(!p.secondStep || r.sawCode, p.name, p.secondStep ? "signs in through the code screen" : "signs in", p.secondStep && !r.sawCode ? "no code screen" : "");
    } catch (e) { say(false, p.name, "signs in", e.message); return; }

    const items = await navItems(d);
    say(items.length > 0, p.name, "side panel holds " + items.length + " items");
    if (p.who === "supervisor") {
      // Forms is a supervisor's when the forms API lets them list filed reports, and Settings when they
      // hold manage permissions, the way the audit's pages case reads the seed. No other admin item.
      const who = seed.PEOPLE[p.who];
      const allowed = [].concat(who.singleCapability === "manage_permissions" ? ["Settings"] : [], who.readsFiledForms ? ["Forms"] : []);
      const has = (w) => items.some((it) => it.label === d.say(w));
      const shown = ADMIN_ONLY_NAV.filter((w) => allowed.indexOf(w) < 0 && has(w));
      const missing = allowed.filter((w) => !has(w));
      say(!shown.length && !missing.length, p.name, "sees " + (allowed.length ? allowed.join(", ") + " and " : "") + "no other admin-only item",
        shown.length ? "can see " + shown.join(", ") : missing.length ? "is missing " + missing.join(", ") : "");
    }
    for (const it of items) {
      const mark = d.pageErrors.length;
      try { await openNav(d, it.id); const why = await trouble(d, mark); say(!why, p.name, "opens " + it.label, why); }
      catch (e) { say(false, p.name, "opens " + it.label, e.message.split("\n")[0]); }
      await recover(d, origin, p);
    }

    if (p.who === "admin") {
      // Reports: one card of each group, and back.
      await d.goto("reports"); await wait(900);
      const groups = await d.page.locator("[data-report-group]").count();
      say(groups > 0, p.name, "Reports shows " + groups + " groups");
      for (let i = 0; i < groups; i++) {
        const g = d.page.locator("[data-report-group]").nth(i);
        const heading = ((await g.locator("div").first().innerText()) || "").trim();
        const mark = d.pageErrors.length;
        try {
          await g.locator("button").first().click();
          await wait(900);
          const why = await trouble(d, mark);
          say(!why, p.name, "Reports opens a card of " + heading, why);
        } catch (e) { say(false, p.name, "Reports opens a card of " + heading, e.message.split("\n")[0]); }
        await recover(d, origin, p);
        await d.goto("reports"); await wait(700);
      }
      // A filed form, from Filed forms.
      {
        await d.goto("forms"); await wait(1200);
        const mark = d.pageErrors.length;
        const row = d.page.locator("table tbody tr").first();
        let why = (await row.count()) === 0 ? "no filed form listed" : "";
        if (!why) { await row.click(); await wait(1200); why = (await d.page.locator("div[style*='z-index: 500']").count()) === 0 ? "the report did not open" : await trouble(d, mark); }
        say(!why, p.name, "a filed form opens", why);
        await d.page.keyboard.press("Escape").catch(() => {});
        await recover(d, origin, p);
      }
      // Customer links.
      {
        const mark = d.pageErrors.length;
        await d.goto("forms", ["links"]); await wait(1200);
        const why = (await d.page.locator("[data-customer-links-tab]").count()) === 0 ? "the tab did not open" : await trouble(d, mark);
        say(!why, p.name, "Customer links opens", why);
        await recover(d, origin, p);
      }
      if (p.step248) await step248(d, origin, p);
      if (p.step250) await step250(d, origin, p, stubs);
      if (p.step253) await step253(d, origin, p, stubs);
    }

    // Help, asked one question.
    {
      const mark = d.pageErrors.length;
      await d.goto("help"); await wait(900);
      const send = d.page.locator('button[aria-label="' + d.say("Send") + '"]').first();
      let why = (await send.count()) === 0 ? "no Send button" : "";
      if (!why) {
        const box = d.page.locator("textarea").first();
        await box.fill(p.lang === "es" ? "¿Cómo imprimo el paquete de evidencias?" : "How do I print the evidence pack?");
        await send.click();
        let answered = false;
        for (let i = 0; i < 40 && !answered; i++) { await wait(250); answered = (await d.page.locator("text=" + HELP_REPLY).count()) > 0; }
        why = answered ? await trouble(d, mark) : "no answer came back";
      }
      say(!why, p.name, "Help answers", why);
    }
  } finally {
    await d.close();
  }
}

(async () => {
  if (!buildIsFresh()) {
    say(false, "build", "build/ is current", "build/ is missing or older than src, public or package.json; run npm run build");
    process.exit(1);
  }
  say(true, "build", "build/ is current");
  const server = await serve(BUILD_DIR);
  const browser = await launch();
  try {
    for (const p of PASSES) {
      try { await runPass(browser, server.origin, p); }
      catch (e) { say(false, p.name, "runs", e.message.split("\n")[0]); }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  const ms = Date.now() - started;
  say(ms < LIMIT_MS, "time", "finished in " + Math.round(ms / 1000) + "s", ms < LIMIT_MS ? "" : "three minutes or more");
  process.stdout.write(failures ? failures + " failed\n" : "all passed\n");
  process.exit(failures ? 1 : 0);
})().catch((e) => { process.stdout.write("FAIL  smoke                " + (e.stack || String(e)).split("\n")[0] + "\n"); process.exit(1); });
