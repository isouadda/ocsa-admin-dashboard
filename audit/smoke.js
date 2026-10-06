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
//     evidence pack prints the finding measures;
//   - against the stub's answers for the API's Step 256 (Step 257), at 1280 in English and in Spanish:
//     the training catalog lists its topics and adds an invented one, refused once under its field,
//     and says who needs it; Gaps lists the people with their items, prints a page per site and opens
//     a person's own list; a session is saved for three people in one call, one of whom already had
//     it that day, and its roster names the topic's document; a lesson draft is refused for want of
//     its Spanish checker and then published; and a trainer signs off an attempt they watched, never
//     their own, and its record prints with both signatures. At 390 in English the catalog and Gaps
//     lines run again, and at 1280 in English a supervisor reads the catalog with no Add a topic and
//     is never offered their own attempt to sign off.
//   - against the stub's answers for the API's Step 262 (Step 263), at 1280 in English and in Spanish:
//     a session's page shows its QR and code and its sign-ins, a wrong one is removed, the session is
//     closed with the trainer's signature and says who was saved and who already had a topic, and its
//     roster prints every signature; an observation checklist draft is saved with its steps and no
//     questions, Needs a trainer locked on, and the versions list says its kind; a document's
//     signatures list the people by site, the ones not signed first, a signature opens and the print
//     gives a page per site; a shirt is issued with the person's signature and marked returned; and the
//     End employment window lists what is still out. At 390 in English the document line runs again.
//   - Step 265: Who must sign reads the set in force from its own route and its editor starts from it
//     (in the document line), and a certificate for a topic taken at each site asks for the site and
//     is sent with it, while a topic taken once asks for none.
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
// The topic the catalog check adds, and the topic and people the session check logs (audit/stubs.js,
// Step 256): the first person already has the topic today.
const SMOKE_TOPIC = { key: "glass_care", en: "Glass care", es: "Cuidado del vidrio" };
const SESSION_TOPIC = "tp-1";
const SESSION_PEOPLE = ["u-staff-7", "u-staff-5", "u-staff-6"];
// Step 262's stub (audit/stubs.js): the open session's join code, the topic the checklist is written
// for, and the person who holds company property.
const SESSION_CODE = "K7Q4PZ";
const CHECKLIST_TOPIC = { en: "Ladder use", es: "Uso de escaleras" };
// Step 265: a topic taken once, and one taken at each site, for the certificate line.
const CERTIFICATE_TOPICS = { once: "tp-1", perSite: "tp-2" };
const PROPERTY_PERSON = "u-staff-5";
const PASSES = [
  { name: "1280 en admin", viewport: "wide", lang: "en", who: "admin", step248: true, step250: true, requestChecks: true, step253: true, step256: "all", step262: "all" },
  { name: "1280 es admin", viewport: "wide", lang: "es", who: "admin", secondStep: true, step248: true, step250: true, step256: "all", step262: "all" },
  { name: "390 en admin", viewport: "phone", lang: "en", who: "admin", step256: "phone", step262: "phone" },
  { name: "1280 en supervisor", viewport: "wide", lang: "en", who: "supervisor", step256: "supervisor" },
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
// at 550. On the phone the drawer is opened by its button and the item clicked once it has slid in,
// with no wait for the network to go quiet (Step 257).
async function openNav(d, id) {
  if (d.phone && !(await d.drawerOpen())) await d.page.locator('button[title="' + d.say("Menu") + '"], button[title="Menu"]').first().click();
  await d.page.click('[data-nav-item="' + id + '"]');
  await wait(550);
}

// A page by its hash, the way d.goto opens one (a hop through another page when the hash already
// names it, so the page mounts anew), then the selector ready names waited for, or a short pause with
// none. Since Step 257 the smoke check opens a page this way rather than with d.goto, which waits for
// the network to go quiet for half a second on every page, and then a fixed pause on top: the stub
// answers in the same process, so a page has drawn what it read once the thing a check reads is there.
async function go(d, pageId, sub, ready) {
  const cur = await d.page.evaluate(() => window.location.hash.replace(/^#/, "").split("/")[0]);
  if (cur === pageId) {
    await d.page.evaluate((other) => { window.location.hash = other; }, pageId === "overview" ? "help" : "overview");
    await wait(120);
  }
  const hash = "#" + [pageId].concat(sub ? [].concat(sub) : []).join("/");
  await d.page.evaluate((h) => { window.location.hash = h; }, hash);
  if (ready) await d.page.locator(ready).first().waitFor();
  else await wait(300);
}
// The selector's first match, waited for, so a count read after it reads a drawn list.
const until = (d, sel) => d.page.locator(sel).first().waitFor();
// How many of the selector the page draws, read once the count has held for three reads in a row: a
// list whose parts each wait on a route of their own, such as Reports' groups, grows as they answer.
async function settledCount(d, sel) {
  let n = await d.page.locator(sel).count();
  for (let same = 0, i = 0; same < 3 && i < 30; i++) {
    await wait(120);
    const again = await d.page.locator(sel).count();
    same = again === n ? same + 1 : 0;
    n = again;
  }
  return n;
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
    await go(d, "settings");
    await d.page.getByRole("button", { name: d.say("Holidays"), exact: true }).click();
    await until(d, "[data-holidays] table tbody tr");
    const list = d.page.locator("[data-holidays] table tbody tr");
    const rows = await list.count();
    if (rows < 11) return "the year lists " + rows + " holidays";
    await d.page.locator("[data-holiday-add]").click();
    await d.page.locator('[data-holiday-window] input[type="date"]').fill(ADDED_HOLIDAY.date);
    await d.page.locator("[data-holiday-window] input").nth(1).fill(ADDED_HOLIDAY.name);
    await d.page.locator("[data-holiday-window] button").last().click();
    await d.page.locator("[data-holiday-window]").waitFor({ state: "detached" }).catch(() => {});
    if ((await d.page.locator("[data-holiday-window]").count()) > 0) return "the window stayed open";
    await list.filter({ hasText: ADDED_HOLIDAY.name }).first().waitFor({ timeout: 2000 }).catch(() => {});
    return (await list.filter({ hasText: ADDED_HOLIDAY.name }).count()) === 1 ? "" : "the day added is not listed";
  });
  await check("the Rehire window lists the sites to restore", async () => {
    await go(d, "staff", [LEFT_ID]);
    await d.page.locator('[data-employment-action="rehire"]').click();
    await until(d, "[data-restore-sites] [data-restore-site]");
    const rows = await d.page.locator("[data-restore-sites] [data-restore-site]").count();
    const ticked = await d.page.locator("[data-restore-sites] input:checked").count();
    await d.page.locator("[data-employment-window] button").filter({ hasText: d.say("Cancel") }).click();
    return rows !== 3 ? "Sites to restore lists " + rows + " sites" : ticked !== 2 ? ticked + " sites start ticked" : "";
  });
  await check("a client's concern past due draws its Due in red", async () => {
    await go(d, "forms", null, "table tbody tr");
    await until(d, '[data-complaint-due][data-due-state="late"]').catch(() => {});
    const due = d.page.locator('[data-complaint-due][data-due-state="late"]').first();
    if ((await due.count()) === 0) return "no late concern on Filed forms";
    const rgb = await due.evaluate((e) => getComputedStyle(e).color);
    const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
    return m && Number(m[1]) > 150 && Number(m[2]) < 110 && Number(m[3]) < 110 ? "" : "the late Due draws " + rgb;
  });
  await check("a client's concern is marked acknowledged by phone", async () => {
    const row = d.page.locator("table tbody tr").filter({ has: d.page.locator("[data-not-acknowledged]") }).first();
    if ((await row.count()) === 0) return "no concern reads Not acknowledged";
    await row.click();
    await d.page.locator("[data-mark-acknowledged]").click();
    await d.page.locator("[data-acknowledge-form] select").selectOption("phone");
    await d.page.locator("[data-acknowledge-form] button").last().click();
    await until(d, "[data-acknowledged]").catch(() => {});
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
    await go(d, "issues", ["requests"], "[data-client-requests] table tbody tr");
    const rows = d.page.locator("[data-client-requests] table tbody tr");
    const n = await rows.count();
    if (n < 3) return "the list holds " + n + " requests";
    const waiting = await rows.filter({ hasText: d.say("Waiting for approval") }).count();
    if (waiting < 2) return waiting + " wait for approval";
    await rows.first().click();
    await d.page.locator("[data-request-approve]").click();
    await d.page.locator("[data-request-approve-save]").click();
    await d.page.locator("[data-request-approve]").waitFor({ state: "detached" }).catch(() => {});
    if ((await d.page.locator("[data-request-approve]").count()) > 0) return "Approve and assign is still offered";
    await d.page.locator("[data-request-window]").getByText(d.say("Approved|request")).first().waitFor({ timeout: 2000 }).catch(() => {});
    const text = lower(await d.page.locator("[data-request-window]").innerText());
    await d.page.keyboard.press("Escape").catch(() => {});
    return text.indexOf(lower(d.say("Approved|request"))) < 0 ? "the activity does not read Approved" : "";
  });
  if (p.requestChecks) await check("a second approver's refusal is drawn", async () => {
    await go(d, "issues", ["requests", "rq-2"]);
    await d.page.locator("[data-request-approve]").click();
    await d.page.locator("[data-request-approve-save]").click();
    await until(d, "[data-request-said]").catch(() => {});
    await d.page.locator("[data-request-window]").getByText(d.say("Open|request")).first().waitFor({ timeout: 2000 }).catch(() => {});
    const said = (await d.page.locator("[data-request-said]").count()) ? await d.page.locator("[data-request-said]").innerText() : "";
    const text = lower(await d.page.locator("[data-request-window]").innerText());
    await d.page.keyboard.press("Escape").catch(() => {});
    if (!said) return "no line says who decided first";
    if (said.indexOf(d.say("approved|decided")) < 0) return "the line reads " + JSON.stringify(said);
    return text.indexOf(lower(d.say("Open|request"))) < 0 ? "the row did not refresh to Open" : "";
  });
  await check("a request QR is made and its sheet printed", async () => {
    await go(d, "forms", ["links"]);
    await d.page.locator("[data-link-kind]").selectOption("request");
    await d.page.locator("[data-link-area-input]").fill(SMOKE_AREA);
    await d.page.getByRole("button", { name: d.say("Make a request QR") }).click();
    await until(d, "[data-qr-screen] [data-link-area]").catch(() => {});
    if ((await d.page.locator("[data-qr-screen] [data-link-area]").count()) === 0) return "the QR window did not open on the request QR";
    const before = (await d.prints()).length;
    await d.page.locator("[data-qr-screen]").getByRole("button", { name: d.say("Print sheet") }).click();
    let prints = await d.prints();
    for (let i = 0; i < 20 && prints.length <= before; i++) { await wait(100); prints = await d.prints(); }
    await d.page.keyboard.press("Escape").catch(() => {});
    if (prints.length <= before) return "no sheet window opened";
    const html = prints[prints.length - 1].html;
    if (html.indexOf(SMOKE_AREA) < 0) return "the sheet does not carry the area";
    return html.indexOf("Ask for help here") < 0 || html.indexOf("Pida ayuda aqu") < 0 ? "the sheet does not carry the title in both languages" : "";
  });
  await check("Print label saves the supply's label", async () => {
    await go(d, "supplies");
    await d.page.locator("[data-supply-card]").first().click();
    await until(d, "[data-supply-print-label]").catch(() => {});
    const btn = d.page.locator("[data-supply-print-label]");
    if ((await btn.count()) === 0) return "Print label is not offered";
    await btn.click();
    const labels = async () => (await d.page.evaluate(() => window.__audit.downloads.map((x) => x.name))).indexOf("labels.pdf") >= 0;
    for (let i = 0; i < 20 && !(await labels()); i++) await wait(100);
    await wait(150);
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
    await go(d, "issues");
    await d.page.locator("[data-issue-source]").selectOption("inspection");
    await until(d, "[data-finding-fixed]").catch(() => {});
    const rows = await d.page.locator("[data-issue-row]").count();
    if (rows < 4) return "the Source Inspection lists " + rows + " findings";
    if ((await d.page.locator("[data-finding-fixed]").count()) === 0) return "no row draws Time to fixed";
    await go(d, "issues", ["f-3"]);
    await until(d, "[data-verify]").catch(() => {});
    if ((await d.page.locator("[data-verify]").count()) === 0) return "Verify is not offered on the fixed finding";
    await d.page.locator("[data-verify] textarea").fill("Checked in person at the dock.");
    await d.page.locator("[data-verify-save]").click();
    await until(d, "[data-verified]").catch(() => {});
    const verified = await d.page.locator("[data-verified]").count();
    const still = await d.page.locator("[data-verify]").count();
    await d.page.keyboard.press("Escape").catch(() => {});
    return !verified ? "no line says it was verified" : still ? "Verify is still offered" : "";
  });
  await check("a completed inspection shows its band and findings and asks for a corrective action", async () => {
    await go(d, "inspections");
    await d.page.getByRole("button", { name: d.say("Completed|inspections") }).first().click();
    await d.page.locator("table tbody tr").filter({ hasText: "Dock area check" }).first().click();
    await until(d, "[data-inspection-finding]").catch(() => {});
    if ((await d.page.locator("[data-inspection-band]").count()) === 0) return "no band is drawn";
    const n = await d.page.locator("[data-inspection-finding]").count();
    if (n < 1) return "the findings list " + n + " rows";
    if ((await d.page.locator("[data-inspection-corrective-required]").count()) === 0) return "no corrective action is asked for";
    await d.page.locator("[data-inspection-corrective-start]").click();
    await d.page.locator("[data-inspection-corrective-refusal], div[style*='z-index: 500']").first().waitFor({ timeout: 3000 }).catch(() => {});
    const call = stubs.calls.find((c) => c.path === "/api/forms/OCSA-FRM-010/drafts" && c.method === "POST");
    if (!call) return "no corrective action was started";
    if (!call.body || call.body.siteId !== seed.SITES[2].id) return "the start does not name the inspection's site";
    const drawn = (await d.page.locator("[data-inspection-corrective-refusal]").count()) + (await d.page.locator("div[style*='z-index: 500']").count());
    await d.page.keyboard.press("Escape").catch(() => {});
    return drawn ? "" : "neither the form nor a refusal is drawn";
  });
  await check("the corrective action links the open findings at its site and tells the client", async () => {
    await go(d, "forms", null, "table tbody tr");
    const row = d.page.locator("table tbody tr").filter({ hasText: "Corrective Action Report" }).first();
    if ((await row.count()) === 0) return "no corrective action on Filed forms";
    await row.click();
    await until(d, "[data-link-findings]");
    await until(d, "[data-linked-finding]").catch(() => {});
    const before = await d.page.locator("[data-linked-finding]").count();
    await d.page.locator("[data-link-findings]").click();
    await until(d, "[data-link-finding]").catch(() => {});
    const offered = await d.page.locator("[data-link-finding]").count();
    if (offered < 2) return "Link findings offers " + offered + " findings";
    const ticked = await d.page.locator("[data-link-findings-form] input:checked").count();
    if (ticked !== offered) return ticked + " of " + offered + " start ticked";
    await d.page.locator("[data-link-findings-save]").click();
    await d.page.locator("[data-link-findings-form]").waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
    await d.page.locator("[data-unlink-finding]").nth(before + offered - 1).waitFor({ timeout: 2000 }).catch(() => {});
    const after = await d.page.locator("[data-linked-finding]").count();
    if (after !== before + offered) return "the window lists " + after + " linked findings after linking " + offered + " to " + before;
    if ((await d.page.locator("[data-unlink-finding]").count()) !== after) return "Unlink is not offered on each";
    await d.page.locator("[data-tell-client-open]").click();
    await until(d, "[data-tell-client-form] input:checked").catch(() => {});
    if ((await d.page.locator("[data-tell-client-form] input:checked").count()) < 1) return "no recipient starts ticked";
    await d.page.locator('[data-tell-client-field="whatHappened"]').fill("The inspection found the dock markings worn and the glass streaked.");
    await d.page.locator('[data-tell-client-field="whatWasDone"]').fill("The markings were repainted and the glass cleaned on both sides.");
    await d.page.locator('[data-tell-client-field="prevention"]').fill("The dock is now on the weekly walk.");
    await d.page.locator("[data-tell-client-send]").click();
    await until(d, "[data-client-told]").catch(() => {});
    const told = await d.page.locator("[data-client-told]").count();
    const call = stubs.calls.find((c) => /\/tell-client$/.test(c.path) && c.method === "POST");
    await d.page.keyboard.press("Escape").catch(() => {});
    if (!told) return "no line says the client was told";
    return !call || !call.body || !Array.isArray(call.body.to) || !call.body.to.length ? "the send names no recipient" : "";
  });
  await check("the evidence pack prints the finding measures", async () => {
    await go(d, "reports", null, "[data-report-group]");
    await d.page.locator("text=OCSA-QMS-018").locator("xpath=../..").getByRole("button").first().click();
    await until(d, "[data-management-review]").catch(() => {});
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

// Step 256's screens, each a line, against the stub armed with setStep256 (audit/stubs.js). The phone
// pass runs the catalog and Gaps lines; the supervisor's pass its own line.
async function step256(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  const closeTopic = () => d.page.locator('[data-topic-window] button[aria-label="' + d.say("Close") + '"]').click();
  const printed = async (before) => { for (let i = 0; i < 40; i++) { const pr = await d.prints(); if (pr.length > before && pr[pr.length - 1].html) return pr[pr.length - 1].html; await wait(100); } return ""; };
  if (p.step256 === "supervisor") {
    await check("a supervisor reads the catalog with no Add a topic and is never offered their own attempt", async () => {
      await go(d, "hr", ["training", "catalog"], "[data-training-catalog] table tbody tr");
      if ((await settledCount(d, "[data-training-catalog] table tbody tr")) < 4) return "the catalog lists too few topics";
      if ((await d.page.locator("[data-topic-add]").count()) > 0) return "Add a topic is offered";
      await go(d, "hr", ["training", "awaiting"], "[data-training-awaiting] tbody tr");
      if ((await d.page.locator('[data-signoff-open="at-2"]').count()) > 0) return "the supervisor's own attempt is offered";
      return (await d.page.locator('[data-signoff-open="at-8"]').count()) === 1 ? "" : "the admin's attempt is not offered";
    });
    return;
  }
  await check("the training catalog adds an invented topic and says who needs it", async () => {
    await go(d, "hr", ["training", "catalog"], "[data-training-catalog] table tbody tr");
    const before = await settledCount(d, "[data-training-catalog] table tbody tr");
    if (before < 4) return "the catalog lists " + before + " topics";
    await d.page.locator("[data-topic-add]").click();
    await d.page.locator('[data-topic-field="key"] input').fill(SMOKE_TOPIC.key);
    await d.page.locator('[data-topic-field="names.en"] input').fill(SMOKE_TOPIC.en);
    await d.page.locator('[data-topic-field="names.es"] input').fill(SMOKE_TOPIC.es);
    await d.page.locator('[data-topic-field="linkUrl"] input').fill("http://training.example.invalid/glass");
    await d.page.locator("[data-topic-save]").click();
    await until(d, '[data-topic-refusal="linkUrl"]').catch(() => {});
    if ((await d.page.locator('[data-topic-refusal="linkUrl"]').count()) === 0) return "the address that is not https is not refused under its field";
    await d.page.locator('[data-topic-field="linkUrl"] input').fill("https://training.example.invalid/glass");
    await d.page.locator("[data-topic-save]").click();
    await until(d, "[data-topic-details]");
    await d.page.locator('[data-topic-tab="who"]').click();
    await d.page.locator("[data-who-edit]").click();
    await d.page.locator('[data-who-role="day_porter"] input').first().check();
    await d.page.locator("[data-who-save]").click();
    await until(d, '[data-topic-who] [data-who-role="day_porter"]').catch(() => {});
    const call = stubs.calls.filter((c) => /\/requirements$/.test(c.path) && c.method === "PUT").pop();
    if (!call || !call.body || !(call.body.requirements || []).some((r) => r.role === "day_porter")) return "who needs it was not saved";
    await closeTopic();
    await d.page.locator("[data-training-catalog] table tbody tr").nth(before).waitFor({ timeout: 3000 }).catch(() => {});
    const after = await d.page.locator("[data-training-catalog] table tbody tr").count();
    return after === before + 1 ? "" : "the catalog lists " + after + " topics after adding one to " + before;
  });
  await check("Gaps lists each person's items, prints a page per site and opens a person's list", async () => {
    await go(d, "hr", ["training", "gaps"], "[data-gaps-person]");
    const people = await settledCount(d, "[data-gaps-person]");
    if (people < 5) return "Gaps lists " + people + " people";
    if ((await d.page.locator("[data-gaps-topics] tbody tr").count()) < 3) return "Gaps counts too few topics";
    if ((await d.page.locator('[data-gap-word="inPerson"]').count()) === 0) return "no item reads Needs an in-person session";
    if ((await d.page.locator('[data-gap-word="awaitingTrainer"]').count()) === 0) return "no item reads Waiting for trainer";
    const before = (await d.prints()).length;
    await d.page.locator("[data-gaps-print]").click();
    const html = await printed(before);
    if ((html.match(/class="kept/g) || []).length < 2) return "the print is not a page per site";
    await d.page.locator("[data-gaps-person]").first().click();
    await until(d, "[data-person-training] [data-training-item]").catch(() => {});
    const items = await d.page.locator("[data-person-training] [data-training-item]").count();
    await d.page.locator('[data-person-training] button[aria-label="' + d.say("Close") + '"]').click();
    return items > 0 ? "" : "the person's list holds no item";
  });
  if (p.step256 !== "all") return;
  await check("a session is saved for three people in one call, one of whom already had it", async () => {
    await go(d, "hr", ["training"]);
    await d.page.getByRole("button", { name: d.say("Log training for several people") }).click();
    await d.page.locator('[data-session-field="topicId"] select option[value="' + SESSION_TOPIC + '"]').waitFor({ state: "attached" });
    await d.page.locator('[data-session-field="topicId"] select').selectOption(SESSION_TOPIC);
    await d.page.locator('[data-session-field="trainerId"] select').selectOption(seed.PEOPLE.supervisor.id);
    await d.page.locator('[data-session-field="locale"] button').nth(1).click();
    for (const id of SESSION_PEOPLE) await d.page.locator('[data-session-person="' + id + '"] input').check();
    const singles = stubs.calls.filter((c) => c.path === "/api/hr/training" && c.method === "POST").length;
    await d.page.locator("[data-session-save]").click();
    await until(d, "[data-session-saved]");
    const saved = await d.page.locator("[data-session-saved]").getAttribute("data-session-saved");
    const already = (await d.page.locator("[data-session-already]").count()) ? await d.page.locator("[data-session-already]").getAttribute("data-session-already") : "0";
    const calls = stubs.calls.filter((c) => c.path === "/api/hr/training/sessions" && c.method === "POST");
    if (calls.length !== 1 || (calls[0].body.people || []).length !== 3) return "the session was not sent once with three people";
    if (stubs.calls.filter((c) => c.path === "/api/hr/training" && c.method === "POST").length !== singles) return "records were sent one by one";
    if (saved !== "2" || already !== "1") return "the window says " + saved + " saved and " + already + " already had it";
    const before = (await d.prints()).length;
    await d.page.locator("[data-session-print]").click();
    const html = await printed(before);
    await d.page.locator("[data-session-window]").locator("..").locator("..").getByRole("button", { name: d.say("Close") }).click().catch(() => {});
    return html.indexOf("OCSA-TRN-901 3.2") < 0 ? "the roster's Related Document No. does not name the topic's document" : "";
  });
  await check("a lesson draft is refused for its Spanish checker, then published", async () => {
    await go(d, "hr", ["training", "catalog"], "[data-training-catalog] table tbody tr");
    await d.page.locator("[data-training-catalog] table tbody tr").first().click();
    await d.page.locator('[data-topic-tab="lesson"]').click();
    await until(d, "[data-topic-lesson]");
    if ((await d.page.locator("[data-lesson-stale]").count()) === 0) return "no version reads Stale";
    await d.page.locator('[data-lesson-new="published"]').click();
    await until(d, "[data-lesson-editor]");
    await d.page.locator("[data-lesson-publish]").click();
    await until(d, '[data-lesson-refusal="checkedEsBy"]').catch(() => {});
    if ((await d.page.locator('[data-lesson-refusal="checkedEsBy"]').count()) === 0) return "the refusal is not drawn under Spanish checked by";
    await d.page.locator("[data-lesson-checked=es]").fill("Checked in the office");
    await d.page.locator("[data-lesson-publish]").click();
    await until(d, "[data-topic-lesson]").catch(() => {});
    const first = (await d.page.locator("[data-topic-lesson] tbody tr").count()) ? (await d.page.locator("[data-topic-lesson] tbody tr").first().innerText()) : "";
    await closeTopic();
    return /^\s*3\b/.test(first) && first.toLowerCase().indexOf(d.say("Published|lesson").toLowerCase()) >= 0 ? "" : "version 3 is not listed as published";
  });
  await check("a trainer signs off an attempt they watched, never their own, and its record prints", async () => {
    await go(d, "hr", ["training", "awaiting"], "[data-training-awaiting] tbody tr");
    if ((await d.page.locator('[data-signoff-open="at-8"]').count()) > 0) return "the admin's own attempt is offered";
    const rows = await d.page.locator("[data-training-awaiting] tbody tr").count();
    await d.page.locator('[data-signoff-open="at-1"]').click();
    await d.drawSignature();
    await d.page.locator("[data-signoff-window] [data-signature-box] button").first().click();
    await d.page.locator("[data-signoff-watched]").check();
    await d.page.locator("[data-signoff-note]").fill("Contained a spill with pads at the dock.");
    await d.page.locator("[data-signoff-send]").click();
    await until(d, "[data-signoff-done]");
    const call = stubs.calls.filter((c) => /\/signoff$/.test(c.path) && c.method === "POST").pop();
    if (!call || call.body.demonstrated !== true || !/^data:image\/png/.test(String(call.body.signature || ""))) return "the sign-off was not sent with the signature and the tick";
    const before = (await d.prints()).length;
    await d.page.locator("[data-signoff-print]").click();
    const html = await printed(before);
    await d.page.locator("[data-signoff-window]").getByRole("button", { name: d.say("Close") }).click();
    if ((html.match(/<img/g) || []).length < 2 || html.indexOf("Contained a spill") < 0) return "the record does not print both signatures and the note";
    await d.page.locator('[data-signoff-open="at-1"]').waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
    const left = await d.page.locator("[data-training-awaiting] tbody tr").count();
    return left === rows - 1 ? "" : "Awaiting sign-off lists " + left + " after signing off one of " + rows;
  });
}

// Step 262's screens, each a line, against the stub armed with setStep262 (audit/stubs.js). The phone
// pass runs the document line.
async function step262(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  const printed = async (before) => { for (let i = 0; i < 40; i++) { const pr = await d.prints(); if (pr.length > before && pr[pr.length - 1].html) return pr[pr.length - 1].html; await wait(100); } return ""; };
  const opened = async (before) => { for (let i = 0; i < 30; i++) { const pr = await d.prints(); if (pr.length > before) return String(pr[pr.length - 1].url || ""); await wait(100); } return ""; };
  if (p.step262 === "all") {
    await check("a session is closed with the trainer's signature and its roster prints every signature", async () => {
      await go(d, "hr", ["training", "sessions"], "[data-training-sessions] tbody tr");
      await d.page.locator("[data-training-sessions] tbody tr").first().click();
      await until(d, "[data-session-signin]");
      if ((await d.page.locator("[data-session-qr]").count()) === 0) return "the page draws no QR";
      if ((await d.page.locator("[data-session-code]").innerText()).trim() !== SESSION_CODE) return "the page does not draw the join code";
      const signins = await settledCount(d, "[data-session-signin]");
      if (signins !== 3) return "the page lists " + signins + " sign-ins";
      await d.page.locator("[data-session-remove]").last().click();
      await d.page.locator("[data-session-signin]").nth(2).waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
      if ((await d.page.locator("[data-session-signin]").count()) !== 2) return "the wrong sign-in was not removed";
      await d.page.locator("[data-session-close]").click();
      const pad = d.page.locator("[data-session-closing] canvas").first();
      await pad.scrollIntoViewIfNeeded();
      const b = await pad.boundingBox();
      await d.page.mouse.move(b.x + b.width * 0.15, b.y + b.height * 0.55); await d.page.mouse.down();
      await d.page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.3, { steps: 6 }); await d.page.mouse.up();
      await d.page.locator("[data-session-closing] [data-signature-box] button").first().click();
      await until(d, "[data-session-close-saved]");
      const call = stubs.calls.filter((c) => /\/close$/.test(c.path) && c.method === "POST").pop();
      if (!call || !/^data:image\/png/.test(String((call.body || {}).signature || ""))) return "the close was not sent with the trainer's signature";
      const saved = Number(await d.page.locator("[data-session-close-saved]").getAttribute("data-session-close-saved"));
      const already = (await d.page.locator("[data-session-close-already]").count()) ? Number(await d.page.locator("[data-session-close-already]").getAttribute("data-session-close-already")) : 0;
      if (saved + already !== 4 || already < 1) return "the page says " + saved + " saved and " + already + " already had it";
      const before = (await d.prints()).length;
      await d.page.locator("[data-session-roster]").click();
      const html = await printed(before);
      if (html.indexOf("OCSA-FRM-033") < 0 || html.indexOf("OCSA-TRN-901") < 0) return "the roster does not name its form and the topic's document";
      return (html.match(/<img/g) || []).length >= 3 ? "" : "the roster does not print every signature";
    });
    await check("an observation checklist draft is saved with its steps and no questions", async () => {
      await go(d, "hr", ["training", "catalog"], "[data-training-catalog] table tbody tr");
      await d.page.locator("[data-training-catalog] table tbody tr").filter({ hasText: CHECKLIST_TOPIC[p.lang] }).first().click();
      await d.page.locator('[data-topic-tab="lesson"]').click();
      await until(d, "[data-topic-lesson]");
      await d.page.locator('[data-lesson-new="blank"]').click();
      await until(d, "[data-lesson-editor]");
      await d.page.locator('[data-lesson-kind="observation"]').click();
      if (!(await d.page.locator("[data-lesson-needs-trainer]").isDisabled()) || !(await d.page.locator("[data-lesson-needs-trainer]").isChecked())) return "Needs a trainer is not locked on";
      if ((await d.page.locator("[data-lesson-add-question]").count()) > 0) return "the checklist offers questions";
      await d.page.locator('[data-lesson-path="title.en"] input').fill("Ladder check on the job");
      for (let i = 0; i < 2; i++) await d.page.locator("[data-lesson-add-step]").click();
      await d.page.locator('[data-lesson-path="steps.0.text.en"]').locator("textarea, input").first().fill("Checks the feet and the rungs");
      await d.page.locator('[data-lesson-path="steps.1.text.en"]').locator("textarea, input").first().fill("Keeps three points of contact");
      const patches = () => stubs.calls.filter((c) => /lesson-drafts\/[^/]+$/.test(c.path) && c.method === "PATCH");
      const sent = patches().length;
      await d.page.locator("[data-lesson-save]").click();
      for (let i = 0; i < 30 && patches().length === sent; i++) await wait(100);
      await d.page.locator("[data-lesson-editor]").getByText(d.say("Changes not saved")).waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
      const call = patches().length > sent ? patches().pop() : null;
      const content = (call && call.body && call.body.content) || {};
      if (!call || call.body.kind !== "observation" || (content.steps || []).length !== 2 || "questions" in content) return "the draft was not sent as a checklist with two steps and no questions";
      await d.page.locator("[data-lesson-editor] button").filter({ hasText: d.say("Back to the versions") }).click();
      await d.page.locator('[data-lesson-version-kind="observation"]').first().waitFor({ timeout: 3000 }).catch(() => {});
      const kinds = await d.page.locator("[data-lesson-version-kind]").evaluateAll((es) => es.map((e) => e.getAttribute("data-lesson-version-kind")));
      await d.page.locator('[data-topic-window] button[aria-label="' + d.say("Close") + '"]').click();
      return kinds.indexOf("observation") >= 0 ? "" : "the versions list does not say the draft's kind";
    });
    // Step 265: a certificate for a topic taken at each site asks for the site and is sent with it; a
    // topic taken once asks for none.
    await check("a certificate for a per-site topic asks for the site and is sent with it", async () => {
      await go(d, "hr", ["training", "gaps"], "[data-gaps-person]");
      await d.page.locator("[data-gaps-person]").first().click();
      await until(d, "[data-person-training] [data-certificate-upload]");
      await d.page.locator("[data-certificate-upload]").click();
      await until(d, "[data-certificate-window]");
      const topic = d.page.locator('[data-certificate-field="topicId"] select');
      await topic.locator('option[value="' + CERTIFICATE_TOPICS.perSite + '"]').waitFor({ state: "attached" });
      await topic.selectOption(CERTIFICATE_TOPICS.once);
      if ((await d.page.locator('[data-certificate-field="siteId"]').count()) !== 0) return "a topic taken once asks for the site";
      await topic.selectOption(CERTIFICATE_TOPICS.perSite);
      await until(d, '[data-certificate-field="siteId"] select');
      await d.page.locator('[data-certificate-field="file"] input[type="file"]').setInputFiles({ name: "certificate.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 smoke certificate") });
      if (await d.page.locator("[data-certificate-send]").isEnabled()) return "Upload is offered before the site is picked";
      const siteId = await d.page.locator('[data-certificate-field="siteId"] select option').nth(1).getAttribute("value");
      await d.page.locator('[data-certificate-field="siteId"] select').selectOption(siteId);
      await d.page.locator("[data-certificate-send]").click();
      await d.page.locator("[data-certificate-window]").waitFor({ state: "detached" });
      const call = stubs.calls.filter((c) => c.path === "/api/hr/training/certificates" && c.method === "POST").pop();
      const field = (k) => { const m = new RegExp('name="' + k + '"\\r\\n\\r\\n([^\\r]*)').exec(String((call && call.body) || "")); return m ? m[1] : ""; };
      await d.page.locator('[data-person-training] button[aria-label="' + d.say("Close") + '"]').click();
      if (!call || field("topicId") !== CERTIFICATE_TOPICS.perSite) return "the certificate was not sent for the per-site topic";
      return field("siteId") === siteId ? "" : "the certificate was sent with site " + JSON.stringify(field("siteId")) + " and not " + siteId;
    });
  }
  await check("a document's signatures list the people by site, the ones not signed first, and Who must sign starts from the set in force", async () => {
    await go(d, "hr", ["training", "documents"], "[data-training-documents] tbody tr");
    if ((await d.page.locator("[data-training-documents] tbody tr").count()) !== 2) return "the list does not hold the two documents";
    await d.page.locator("[data-training-documents] tbody tr").first().click();
    await until(d, "[data-doc-person]");
    // Step 265: the set in force comes from GET .../requirements, a route of its own, so it is waited
    // for; the editor opens from it, Everyone ticked for the handbook, and is closed with nothing saved.
    await until(d, "[data-doc-who-row]").catch(() => {});
    if ((await d.page.locator('[data-doc-who-row="everyone"]').count()) === 0) return "Who must sign does not read Everyone";
    if (!stubs.calls.some((c) => /^\/api\/documents\/.*\/requirements$/.test(c.path) && c.method === "GET")) return "who must sign was not read from its route";
    await d.page.locator("[data-doc-who-edit]").click();
    await until(d, "[data-doc-who-form]");
    if (!(await d.page.locator("[data-doc-who-everyone]").isChecked())) return "the editor does not start with Everyone ticked";
    await d.page.locator("[data-doc-who-form]").getByRole("button", { name: d.say("Cancel") }).click();
    await d.page.locator("[data-doc-who-form]").waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
    if (stubs.calls.some((c) => /^\/api\/documents\/.*\/requirements$/.test(c.path) && c.method === "PUT")) return "cancelling the editor saved";
    const groups = await d.page.locator("[data-doc-site]").count();
    if (groups < 2) return "the people are not grouped by site";
    const order = await d.page.locator("[data-document-page] [data-doc-site]").evaluateAll((es) => es.map((e) => Array.from(e.parentElement.querySelectorAll("[data-doc-state]")).map((x) => x.getAttribute("data-doc-state"))));
    if (order.some((st) => st.indexOf("signed") >= 0 && st.slice(st.indexOf("signed")).some((x) => x !== "signed"))) return "someone who has not signed is listed after someone who has";
    if ((await d.page.locator('[data-doc-state="older"]').count()) === 0) return "nobody reads Signed an older version";
    let before = (await d.prints()).length;
    await d.page.locator("[data-doc-signature]").first().click();
    if ((await opened(before)).indexOf("blob:") !== 0) return "a signature does not open";
    before = (await d.prints()).length;
    await d.page.locator("[data-doc-print]").click();
    const html = await printed(before);
    return (html.match(/class="kept"/g) || []).length === groups ? "" : "the print is not a page per site";
  });
  if (p.step262 !== "all") return;
  await check("a shirt is issued with the person's signature and marked returned", async () => {
    await go(d, "hr", [PROPERTY_PERSON], "[data-person-property] [data-property-row]");
    const before = await settledCount(d, "[data-property-row]");
    await d.page.locator("[data-property-issue]").click();
    await d.page.locator('[data-property-kind="uniform_shirt"]').click();
    await d.page.locator('[data-property-field="size"]').fill("M");
    await d.drawSignature();
    await d.page.locator("[data-property-window] [data-signature-box] button").first().click();
    await d.page.locator("[data-property-save]").click();
    await d.page.locator("[data-property-window]").waitFor({ state: "detached" });
    const call = stubs.calls.filter((c) => c.path === "/api/hr/property" && c.method === "POST").pop();
    if (!call || call.body.kind !== "uniform_shirt" || !/^data:image\/png/.test(String(call.body.signature || ""))) return "the issue was not sent with the kind and the signature";
    await d.page.locator("[data-property-row]").nth(before).waitFor({ timeout: 3000 }).catch(() => {});
    if ((await d.page.locator("[data-property-row]").count()) !== before + 1) return "the list does not hold the shirt";
    const id = call.status === 201 && stubs.state.property ? stubs.state.property[stubs.state.property.length - 1].id : "";
    await d.page.locator('[data-property-return="' + id + '"]').click();
    await d.page.locator("[data-property-return-save]").click();
    await d.page.locator('[data-property-row="' + id + '"][data-property-out="no"]').waitFor({ timeout: 3000 }).catch(() => {});
    return (await d.page.locator('[data-property-row="' + id + '"][data-property-out="no"]').count()) === 1 ? "" : "the shirt is not marked returned";
  });
  await check("the End employment window lists what is still out", async () => {
    await go(d, "staff", [PROPERTY_PERSON], '[data-employment-action="end"]');
    await d.page.locator('[data-employment-action="end"]').click();
    await until(d, "[data-collect-item]");
    const out = await settledCount(d, "[data-collect-item]");
    await d.page.locator("[data-employment-window] button").filter({ hasText: d.say("Cancel") }).click();
    return out === 2 ? "" : "the window lists " + out + " items to collect";
  });
}

async function runPass(browser, origin, p) {
  const stubs = createStubs();
  // Step 253 brings Step 250's and 247's answers with it, Step 250 brings Step 247's; every other pass
  // sees Step 247's alone.
  if (p.step253) stubs.setStep253(true); else if (p.step250) stubs.setStep250(true); else stubs.setStep247(true);
  // Step 256's answers are laid over whichever of those the pass arms.
  if (p.step256) stubs.setStep256(true);
  // Step 262's answers are laid over Step 256's.
  if (p.step262) stubs.setStep262(true);
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
      await go(d, "reports", null, "[data-report-group]");
      const groups = await settledCount(d, "[data-report-group]");
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
        await go(d, "reports", null, "[data-report-group]");
      }
      // A filed form, from Filed forms.
      {
        await go(d, "forms", null, "table tbody tr");
        const mark = d.pageErrors.length;
        const row = d.page.locator("table tbody tr").first();
        let why = (await row.count()) === 0 ? "no filed form listed" : "";
        if (!why) {
          await row.click();
          await until(d, "div[style*='z-index: 500']").catch(() => {});
          await wait(400);
          why = (await d.page.locator("div[style*='z-index: 500']").count()) === 0 ? "the report did not open" : await trouble(d, mark);
        }
        say(!why, p.name, "a filed form opens", why);
        await d.page.keyboard.press("Escape").catch(() => {});
        await recover(d, origin, p);
      }
      // Customer links.
      {
        const mark = d.pageErrors.length;
        await go(d, "forms", ["links"]);
        await until(d, "[data-customer-links-tab]").catch(() => {});
        await wait(200);
        const why = (await d.page.locator("[data-customer-links-tab]").count()) === 0 ? "the tab did not open" : await trouble(d, mark);
        say(!why, p.name, "Customer links opens", why);
        await recover(d, origin, p);
      }
      if (p.step248) await step248(d, origin, p);
      if (p.step250) await step250(d, origin, p, stubs);
      if (p.step253) await step253(d, origin, p, stubs);
    }
    if (p.step256) await step256(d, origin, p, stubs);
    if (p.step262) await step262(d, origin, p, stubs);

    // Help, asked one question.
    {
      const mark = d.pageErrors.length;
      await go(d, "help", null, 'button[aria-label="' + d.say("Send") + '"]');
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
