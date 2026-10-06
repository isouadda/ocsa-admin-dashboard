// npm run smoke: the dashboard's quick check, run on every build (Step 245).
//
// It serves the build/ that npm run build already made, and stops at once when anything in src,
// public or package.json is newer than that build, since a check of a stale bundle proves nothing.
// It signs in against the audit's own stub, with the audit's server, browser and driver, and checks
// what a broken build breaks first:
//   - at 1280 in English and in Spanish, and at 390 in English, an admin signs in (the Spanish pass
//     with the stub answering secondStep, so the code screen is on the way in);
//   - at 1280 in English and in Spanish, first, a wrong PIN on the sign-in card reads the words the
//     API sent with its 401, never Session expired, the card stays and nothing fires
//     ocsa-session-expired; the Spanish pass then types a wrong code on the code screen, which reads
//     the API's words and the tries left under the box the same way;
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
//     is sent with it, while a topic taken once asks for none. The lesson line waits for the published
//     row it reads and the session line for the QR image to have loaded, the two things those lines
//     read that arrive from a route of their own after the page is drawn.
//   - against the stub's answers for the API's Step 266 (Step 268), at 1280 in English and in Spanish:
//     the Training item on the side panel opens the Training area; the catalog groups its topics by
//     category, a topic moves down inside its category and the topic window reads its category and
//     offers the checklist that signs it off; an image block is uploaded, previewed and saved; Drafts
//     lists every open draft and Publish selected publishes the ready ones and refuses one; a safety
//     lesson reads Spanish not checked yet until its checker is named on the published lesson; and
//     Assign training posts once with two topics and three people. At 390 in English the side panel
//     and catalog lines run again. With Step 266 armed the lesson line publishes without a checker.
//   - against the stub's answers for the API's Step 269 (Step 273), at 1280 in English and in Spanish:
//     the owner's dashboard draws its eight sections, a measure with no value reads Needs and what it
//     needs and draws no value, a measure's sites open, and its arrows are toned by which way is
//     better; it prints every section on letter paper with the period, the site and the day; the time
//     report reads the last full week with its totals and saves its CSV under the name the office
//     reads; and the matrix opens a cell taken at each site with each site's status, prints in
//     landscape and saves its CSV. At 390 in English and in Spanish the dashboard, time and matrix
//     lines run again (the Spanish pass with Step 270's key sent to a phone), and at 1280 in English a supervisor is not offered the dashboard, is shown the API's refusal at
//     its address, and reads the matrix for their own sites alone.
//   - against the stub's answers for the API's Step 275 contract (Step 273), at 1280 in English and in
//     Spanish: the catalog reads a refresher first due 12 months after the topic it follows, the editor
//     offers First due after with it chosen, draws the API's refusal under the field and saves it, and
//     with the answer carrying no firstDueAfter neither shows; a person coming due reads First due and
//     the day in the matrix and in Gaps; and a key for a person without Keys and access draws the line
//     under the kind, which a uniform shirt does not. At 390 in English and in Spanish the matrix and
//     key lines run again.
//   - against the stub's answers for the API's Step 276 contract (Step 278), at 1280 in English and in
//     Spanish, once Help has answered: a how-to answer draws its picture under it from the screen's
//     language's file, described by its entry's title, opens it full screen and closes it; an answer to
//     anything else draws none; and, in English, a portal picture is read from the portal's address.
// One line a check. Any failure exits non-zero, and so does a run of three minutes or more. The full
// npm run audit is untouched by this.
// Since Step 273 the passes run two at a time, each in a browser context and a stub of its own, and
// each pass's lines are printed together, in the order the passes are listed, once it is done.
// SMOKE_LANES sets how many run at once (1 runs them one after another, as before).
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
// Step 268's stub (Step 266): the topic whose lesson the lesson lines open, the topic the ladder one
// moves under in its category, the topics and people Assign training sends, and a one-pixel PNG the
// image line uploads.
const LESSON_TOPIC = { en: "Spill response", es: "Respuesta a derrames" };
const CHILD_TOPIC = { en: "Reporting a concern about a child", es: "Reportar una preocupación sobre un menor" };
const ASSIGN_TOPICS = ["tp-1", "tp-4"];
const ASSIGN_PEOPLE = ["u-staff-5", "u-staff-7", "u-staff-8"];
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
// Step 265: a topic taken once, and one taken at each site, for the certificate line.
const CERTIFICATE_TOPICS = { once: "tp-1", perSite: "tp-2" };
const PROPERTY_PERSON = "u-staff-5";
// Step 272's stub (Step 270): the note on the badge sent back as not right, and the keys and access
// topic the keys on file put a person on.
const DISPUTE_NOTE = "This badge opens the other building, not mine.";
const KEYS_TOPIC = { en: "Keys and access", es: "Llaves y acceso" };
// Step 273's stub (Step 269): the measure with no value, the measure with a value at each site, the
// person whose orientation is taken at two sites, the supervisor's own sites, and the last full week
// before the seed's day, Monday to Sunday.
const NEEDS_MEASURE = "voluntary";
const SITES_MEASURE = "inspectionAverage";
const TWO_SITE_PERSON = "u-staff-6";
const SUPERVISOR_SITES = seed.SITES.filter((s0) => s0.supervisor_id === seed.PEOPLE.supervisor.id).map((s0) => s0.id);
// Step 275's stub (STEP275_CONTRACT.md): the refresher, the topic it follows, a topic taken at each site
// it cannot follow, and the person it is coming due for.
const REFRESHER = { id: "tp-7", en: "Annual safety refresher", es: "Repaso anual de seguridad" };
const FOLLOWS = "tp-1";
const PER_SITE_TOPIC = "tp-2";
const FIRST_DUE_PERSON = "u-staff-5";
// Step 278's stub (setStep278): the question a how-to answer is given for, in each language, and the
// picture of the guide entry that answer carries.
const HELP_QUESTION = { en: "How do I print the evidence pack?", es: "\u00bfC\u00f3mo imprimo el paquete de evidencias?" };
const HELP_PICTURE = { name: "management-review-pack", entry: "Print the management review evidence pack (admin dashboard)" };
const LAST_WEEK = (() => {
  const d = new Date(seed.TODAY + "T12:00:00Z");
  const mon = new Date(d.getTime() - (((d.getUTCDay() + 6) % 7) + 7) * 86400000);
  const day = (x) => x.toISOString().slice(0, 10);
  return { from: day(mon), to: day(new Date(mon.getTime() + 6 * 86400000)) };
})();
const PASSES = [
  { name: "1280 en admin", viewport: "wide", lang: "en", who: "admin", wrongSignIn: true, step248: true, step250: true, requestChecks: true, step253: true, step256: "all", step262: "all", step266: "all", step270: "all", step269: "all", step275: "all", step278: true },
  { name: "1280 es admin", viewport: "wide", lang: "es", who: "admin", secondStep: true, wrongSignIn: true, step248: true, step250: true, step256: "all", step262: "all", step266: "all", step270: "all", step269: "all", step275: "all", step278: true },
  { name: "390 en admin", viewport: "phone", lang: "en", who: "admin", step256: "phone", step262: "phone", step266: "phone", step270: "phone", step269: "phone", step275: "phone" },
  { name: "1280 en supervisor", viewport: "wide", lang: "en", who: "supervisor", step256: "supervisor", step269: "supervisor" },
  // Step 273: the phone in Spanish, for the key sent to a phone and the Step 269 screens.
  { name: "390 es admin", viewport: "phone", lang: "es", who: "admin", step270: "phone", step269: "phone", step275: "phone" },
];

const started = Date.now();
const LANES = Math.max(1, Number(process.env.SMOKE_LANES) || 2);
let failures = 0;
// Each pass's lines, held until the passes before it have printed theirs; a line outside a pass is
// printed at once.
const held = {};
function say(ok, pass, what, why) {
  if (!ok) failures += 1;
  const line = (ok ? "ok    " : "FAIL  ") + pass.padEnd(20) + what + (why ? "  (" + why + ")" : "") + "\n";
  if (held[pass]) held[pass].push(line); else process.stdout.write(line);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The stub answers sign-in with secondStep and holds the real answer until the code is sent, the
// way POST /api/auth/second-step answers what sign-in answers (STEP225_CONTRACT.md). SMOKE_CODE is
// the code signIn types.
const SMOKE_CODE = "123456";
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
    if (path === "/api/auth/second-step" && req.method === "POST") {
      if (!held) return { status: 401, json: { error: "No sign-in to finish" } };
      // Any code but the one signIn types is a wrong one, a 401 in the screen's language with the
      // tries left, the way the API answers it.
      if (!req.body || req.body.code !== SMOKE_CODE) {
        const es = ((req.headers && req.headers["accept-language"]) || "") === "es";
        return { status: 401, json: { error: es ? "El c\u00f3digo no es correcto." : "That code is not right.", code: "auth.codeWrong", attemptsLeft: 4 } };
      }
      return held;
    }
    return orig(req);
  };
}

// The two sign-in calls whose 401 is the person's answer turned down rather than a session that has
// ended, and what the stub answered each, kept as it was sent so a check reads the screen against the
// API's own words.
const SIGN_IN_PATHS = ["/api/auth/login", "/api/auth/second-step"];
function keepSignIn(stubs) {
  const orig = stubs.handle;
  const kept = {};
  stubs.handle = (req) => {
    const a = orig(req);
    const path = new URL(req.url).pathname;
    if (req.method === "POST" && SIGN_IN_PATHS.indexOf(path) >= 0) kept[path] = a;
    return a;
  };
  return kept;
}

// A wrong PIN on the sign-in card reads the words the API sent with its 401, never Session expired, in
// the screen's language; the card stays and nothing fires ocsa-session-expired. With the code screen
// armed, a wrong code then reads the API's words and the tries left under the box the same way, and
// Back returns to the PIN for signIn.
async function wrongSignIn(d, p, kept) {
  const who = seed.PEOPLE[p.who];
  const expired = [d.say("Session expired"), "Session expired"];
  const fired = () => d.page.evaluate(() => window.__smokeExpired || 0);
  const sent = (path) => { const a = kept[path]; return a && a.status === 401 && a.json && a.json.error ? a.json.error : null; };
  await d.page.locator("input").nth(1).waitFor({ timeout: 20000 });
  await d.page.evaluate(() => { window.__smokeExpired = 0; window.addEventListener("ocsa-session-expired", () => { window.__smokeExpired += 1; }); });
  const signInButton = () => d.page.getByRole("button", { name: d.say("Sign In") }).or(d.page.getByRole("button", { name: "Sign In" })).first();
  {
    const mark = d.pageErrors.length;
    let why = "";
    try {
      const inputs = d.page.locator("input");
      await inputs.nth(0).fill(who.login.phone);
      await inputs.nth(1).fill(who.login.pin === "9999" ? "9998" : "9999");
      await signInButton().click();
      let shown = null;
      for (let i = 0; i < 50 && !shown; i++) { await wait(100); shown = await d.toast(); }
      const words = sent("/api/auth/login");
      why = !words ? "the stub did not answer 401"
        : !shown ? "nothing was drawn"
        : expired.some((w) => shown.indexOf(w) >= 0) ? "reads " + shown
        : shown !== words ? "reads " + shown + ", the API sent " + words
        : (await fired()) ? "fired ocsa-session-expired"
        : !(await d.signedOut()) ? "left the sign-in card"
        : await trouble(d, mark);
    } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, "a wrong PIN reads the API's words", why);
  }
  if (!p.secondStep) return;
  {
    const mark = d.pageErrors.length;
    let why = "";
    try {
      const inputs = d.page.locator("input");
      await inputs.nth(0).fill(who.login.phone);
      await inputs.nth(1).fill(who.login.pin);
      await signInButton().click();
      await until(d, "[data-second-code]");
      await d.page.fill("[data-second-code]", "000000");
      await until(d, "[data-second-say]");
      const shown = ((await d.page.locator("[data-second-say]").first().innerText()) || "").trim();
      const words = sent("/api/auth/second-step");
      why = !words ? "the stub did not answer 401"
        : expired.some((w) => shown.indexOf(w) >= 0) ? "reads " + shown
        : shown.split("\n")[0].trim() !== words ? "reads " + shown.split("\n")[0] + ", the API sent " + words
        : (await d.page.locator("[data-second-left]").count()) === 0 ? "no tries left under the box"
        : (await fired()) ? "fired ocsa-session-expired"
        : await trouble(d, mark);
      await d.page.click("[data-second-back]");
      await d.page.locator("input").nth(1).waitFor();
    } catch (e) { why = why || e.message.split("\n")[0]; }
    say(!why, p.name, "a wrong code reads the API's words", why);
  }
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
      await d.page.fill("[data-second-code]", SMOKE_CODE);
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
  // Step 268: with the API's Step 266 armed a safety lesson publishes without its Spanish checker
  // (decision 339), so the refusal is not asked for; the checker is named on the published lesson in
  // step266's own line. The topic is found by its name, since the catalog is grouped by category.
  await check(p.step266 ? "a lesson draft from the live lesson is published without a Spanish checker" : "a lesson draft is refused for its Spanish checker, then published", async () => {
    await go(d, "hr", ["training", "catalog"], "[data-training-catalog] table tbody tr");
    await d.page.locator("[data-training-catalog] table tbody tr").filter({ hasText: LESSON_TOPIC[p.lang] }).first().click();
    await d.page.locator('[data-topic-tab="lesson"]').click();
    await until(d, "[data-topic-lesson]");
    if ((await d.page.locator("[data-lesson-stale]").count()) === 0) return "no version reads Stale";
    await d.page.locator('[data-lesson-new="published"]').click();
    await until(d, "[data-lesson-editor]");
    await d.page.locator("[data-lesson-publish]").click();
    if (!p.step266) {
      await until(d, '[data-lesson-refusal="checkedEsBy"]').catch(() => {});
      if ((await d.page.locator('[data-lesson-refusal="checkedEsBy"]').count()) === 0) return "the refusal is not drawn under Spanish checked by";
      await d.page.locator("[data-lesson-checked=es]").fill("Checked in the office");
      await d.page.locator("[data-lesson-publish]").click();
    }
    // Step 265: the versions list is drawn again the moment the editor closes, with the versions it
    // held, and read anew after; so the row this line reads, version 3 published, is waited for.
    await until(d, '[data-lesson-version="3"][data-lesson-version-status="published"]').catch(() => {});
    const first =(await d.page.locator("[data-topic-lesson] tbody tr").count()) ? (await d.page.locator("[data-topic-lesson] tbody tr").first().innerText()) : "";
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
      // Step 265: the QR comes from its own route after the sign-ins, so the image is waited for and
      // its bytes with it, rather than counted the moment the sign-ins are there.
      const qrDrawn = await d.page.waitForFunction(() => { const img = document.querySelector("[data-session-qr]"); return !!(img && img.complete && img.naturalWidth > 0); }, null, { timeout: 8000 }).then(() => true).catch(() => false);
      if (!qrDrawn) return (await d.page.locator("[data-session-qr]").count()) === 0 ? "the page draws no QR" : "the QR image did not load";
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
    // Step 272: Who signs starts on Send to their phone; the box is under Sign here now.
    if (p.step270) { await until(d, "[data-who-signs-field]"); await d.page.locator('[data-who-signs="here"]').click(); }
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

// Step 268's screens, each a line, against the stub armed with setStep266 (audit/stubs.js). The phone
// pass runs the side panel and catalog lines.
async function step266(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  const closeTopic = () => d.page.locator('[data-topic-window] button[aria-label="' + d.say("Close") + '"]').click();
  const lastCall = async (test) => { let call = null; for (let i = 0; i < 30 && !call; i++) { call = stubs.calls.filter(test).pop() || null; if (!call) await wait(100); } return call; };
  await check("the Training item on the side panel opens the Training area", async () => {
    await openNav(d, "training");
    await until(d, "[data-training-views]");
    if ((await d.page.evaluate(() => window.location.hash)).indexOf("#training") !== 0) return "the address does not read #training";
    if ((await d.page.locator('[data-training-view="catalog"]').count()) === 0) return "the Training area offers no Catalog tab";
    await d.page.locator('[data-training-view="drafts"]').click();
    await until(d, "[data-training-drafts]");
    return "";
  });
  await check("the catalog groups its topics by category and a topic moves down inside its category", async () => {
    await go(d, "hr", ["training", "catalog"], "[data-catalog-category]");
    const groups = await settledCount(d, "[data-catalog-category]");
    if (groups < 3) return "the catalog draws " + groups + " categories";
    const first = () => d.page.locator('[data-catalog-category="safety"] tbody tr').first().innerText();
    if ((await first()).indexOf(CHECKLIST_TOPIC[p.lang]) < 0) return "the safety category does not start with the ladder topic";
    await d.page.locator('[data-topic-down="tp-3"]').click();
    const call = await lastCall((c) => c.path === "/api/training/topics/order" && c.method === "PUT");
    const rows = (call && call.body && call.body.topics) || [];
    if (rows.length !== 2 || rows[0].id !== "tp-4" || rows[0].sortOrder !== 10 || rows[1].id !== "tp-3" || rows[1].sortOrder !== 20) return "the order sent reads " + JSON.stringify(rows);
    await d.page.locator('[data-catalog-category="safety"] tbody tr').first().filter({ hasText: CHILD_TOPIC[p.lang] }).waitFor({ timeout: 3000 }).catch(() => {});
    if ((await first()).indexOf(CHILD_TOPIC[p.lang]) < 0) return "the ladder topic did not move down";
    await d.page.locator("[data-catalog-category-filter]").selectOption("safety");
    if ((await settledCount(d, "[data-catalog-category]")) !== 1) return "the Category filter does not narrow the list";
    await d.page.locator('[data-catalog-category="safety"] tbody tr').first().click();
    await until(d, "[data-topic-details]");
    if ((await d.page.locator('[data-topic-category="safety"]').count()) === 0) return "the topic window does not read its category";
    await d.page.locator("[data-topic-edit]").click();
    await until(d, '[data-topic-field="category"] select');
    const cat = await d.page.locator('[data-topic-field="category"] select').inputValue();
    const offered = await d.page.locator('[data-topic-field="signoffTopicId"] select option[value="tp-3"]').count();
    await closeTopic();
    if (cat !== "safety") return "Category does not start from the topic's";
    return offered === 1 ? "" : "Signed off by checklist does not offer the ladder checklist";
  });
  if (p.step266 !== "all") return;
  await check("an image block is uploaded, previewed and saved in the lesson editor", async () => {
    await go(d, "hr", ["training", "catalog"], "[data-training-catalog] table tbody tr");
    await d.page.locator("[data-training-catalog] table tbody tr").filter({ hasText: LESSON_TOPIC[p.lang] }).first().click();
    await d.page.locator('[data-topic-tab="lesson"]').click();
    await until(d, "[data-topic-lesson]");
    await d.page.locator('[data-lesson-new="published"]').click();
    await until(d, "[data-lesson-add-image]");
    const at = await d.page.locator("[data-lesson-block]").count();
    await d.page.locator("[data-lesson-add-image]").click();
    await until(d, '[data-lesson-image="' + at + '"]');
    await d.page.locator('[data-lesson-image-file="' + at + '"]').setInputFiles({ name: "spill-kit.png", mimeType: "image/png", buffer: PNG });
    const drawn = await d.page.waitForFunction((i) => { const img = document.querySelector('[data-lesson-image-preview="' + i + '"]'); return !!(img && img.complete && img.naturalWidth > 0); }, at, { timeout: 8000 }).then(() => true).catch(() => false);
    if (!drawn) return "the preview did not draw";
    const up = stubs.calls.filter((c) => c.path === "/api/training/lesson-images" && c.method === "POST").pop();
    if (!up || up.status !== 201) return "the picture was not uploaded";
    await d.page.locator('[data-lesson-path="blocks.' + at + '.alt.en"] input').fill("A spill kit on its shelf");
    const patches = () => stubs.calls.filter((c) => /lesson-drafts\/[^/]+$/.test(c.path) && c.method === "PATCH");
    const sent = patches().length;
    await d.page.locator("[data-lesson-save]").click();
    for (let i = 0; i < 30 && patches().length === sent; i++) await wait(100);
    const call = patches().length > sent ? patches().pop() : null;
    const b = call && call.body && call.body.content && Array.isArray(call.body.content.blocks) ? call.body.content.blocks[at] : null;
    await d.page.locator("[data-lesson-editor]").getByText(d.say("Changes not saved")).waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
    await d.page.locator("[data-lesson-editor] button").filter({ hasText: d.say("Back to the versions") }).click();
    await until(d, "[data-topic-lesson]");
    await closeTopic();
    if (!b || b.kind !== "image" || !/^lessons\//.test(String(b.path || "")) || b.svg !== null || !b.alt || b.alt.en !== "A spill kit on its shelf" || "src" in b) return "the draft was not sent with the image block, its path and its alt text";
    return "";
  });
  await check("Drafts lists every open draft, and Publish selected publishes the ready ones and refuses one", async () => {
    await go(d, "hr", ["training", "drafts"], "[data-training-drafts] tbody tr");
    const rows = await settledCount(d, "[data-training-drafts] tbody tr");
    if (rows < 3) return "Drafts lists " + rows + " drafts";
    if ((await d.page.locator('[data-draft-not-ready="lv-4"]').count()) !== 1) return "the draft with its Spanish missing carries a tick";
    if ((await d.page.locator('[data-draft-tick="lv-5"]').count()) !== 1) return "the ready draft carries no tick";
    if ((await d.page.locator("[data-training-drafts] [data-lesson-spanish-unchecked]").count()) === 0) return "no draft reads Spanish not checked yet";
    await d.page.locator("[data-drafts-select-ready]").click();
    await d.page.locator("[data-drafts-publish]").click();
    await until(d, "[data-drafts-published]");
    const call = stubs.calls.filter((c) => c.path === "/api/training/lesson-drafts/publish" && c.method === "POST").pop();
    const ids = (call && call.body && call.body.ids) || [];
    if (ids.length < 2 || ids.indexOf("lv-4") >= 0) return "Publish selected sent " + JSON.stringify(ids);
    const published = Number(await d.page.locator("[data-drafts-published]").getAttribute("data-drafts-published"));
    const refused = (await d.page.locator("[data-drafts-refused]").count()) ? Number(await d.page.locator("[data-drafts-refused]").getAttribute("data-drafts-refused")) : 0;
    if (published < 1 || refused !== 1) return "the page says " + published + " published and " + refused + " refused";
    for (let i = 0; i < 30 && (await d.page.locator("[data-training-drafts] tbody tr").count()) !== rows - published; i++) await wait(100);
    return (await d.page.locator("[data-training-drafts] tbody tr").count()) === rows - published ? "" : "the list was not read again";
  });
  await check("a safety lesson reads Spanish not checked yet until its checker is named", async () => {
    await go(d, "hr", ["training", "catalog"], "[data-training-catalog] table tbody tr");
    await d.page.locator("[data-training-catalog] table tbody tr").filter({ hasText: LESSON_TOPIC[p.lang] }).first().click();
    await d.page.locator('[data-topic-tab="lesson"]').click();
    await until(d, "[data-lesson-checkers]");
    const chip = '[data-lesson-version-status="published"] [data-lesson-spanish-unchecked]';
    if ((await d.page.locator(chip).count()) === 0) return "the live version does not read Spanish not checked yet";
    if ((await d.page.locator("[data-lesson-french-missing]").count()) === 0) return "no version reads French missing";
    await d.page.locator('[data-lesson-checker="es"]').fill("Checked in the office");
    await d.page.locator("[data-lesson-checker-save]").click();
    await d.page.locator(chip).waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
    const call = stubs.calls.filter((c) => /\/checkers$/.test(c.path) && c.method === "PATCH").pop();
    const left = await d.page.locator(chip).count();
    await closeTopic();
    if (!call || !call.body || call.body.checkedEsBy !== "Checked in the office") return "the checker was not sent";
    return left === 0 ? "" : "the chip did not clear";
  });
  await check("Assign training posts once with two topics and three people", async () => {
    await go(d, "hr", ["training", "catalog"], "[data-assign-training]");
    await d.page.locator("[data-assign-training]").click();
    await until(d, "[data-assign-window]");
    for (const id of ASSIGN_TOPICS) await d.page.locator('[data-assign-topic="' + id + '"] input').check();
    for (const id of ASSIGN_PEOPLE) await d.page.locator('[data-assign-person="' + id + '"] input').check();
    await d.page.locator("[data-assign-send]").click();
    await until(d, "[data-assign-result]");
    const calls = stubs.calls.filter((c) => c.path === "/api/training/assignments" && c.method === "POST");
    const added = await d.page.locator("[data-assign-result]").getAttribute("data-assign-result");
    const already = await d.page.locator("[data-assign-result]").getAttribute("data-assign-already");
    await d.page.locator('[data-assign-window] button[aria-label="' + d.say("Close") + '"]').click();
    if (calls.length !== 1 || ((calls[0].body || {}).topicIds || []).length !== 2 || ((calls[0].body || {}).userIds || []).length !== 3) return "the assignment was not sent once with two topics and three people";
    return added === "5" && already === "1" ? "" : "the window says " + added + " added and " + already + " already assigned";
  });
}

// Step 272's screens, each a line, against the stub armed with setStep270 (audit/stubs.js): a key sent
// to the person's phone with no drawing, its row waiting for the signature, Remind; the Waiting for
// signatures tab with its Not right row and note first and Sign here now signing in the office; and
// From a key on file in Who needs it with no Remove. The phone pass runs the first line alone.
async function step270(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  const lastCall = async (test) => { let call = null; for (let i = 0; i < 30 && !call; i++) { call = stubs.calls.filter(test).pop() || null; if (!call) await wait(100); } return call; };
  await check("a key is sent to the person's phone with no drawing, its row waits for the signature, and Remind posts", async () => {
    await go(d, "hr", [PROPERTY_PERSON], "[data-person-property] [data-property-row]");
    await d.page.locator("[data-property-issue]").click();
    await until(d, "[data-who-signs-field]");
    if ((await d.page.locator('[data-who-signs="phone"][aria-pressed="true"]').count()) !== 1) return "Send to their phone is not the default";
    if ((await d.page.locator("[data-property-window] [data-signature-box]").count()) !== 0) return "the box is drawn under Send to their phone";
    await d.page.locator('[data-property-kind="key"]').click();
    await d.page.locator('[data-property-field="siteId"]').selectOption("s-2");
    await d.page.locator("[data-property-save]").click();
    await d.page.locator("[data-property-window]").waitFor({ state: "detached" });
    const call = stubs.calls.filter((c) => c.path === "/api/hr/property" && c.method === "POST").pop();
    if (!call || call.status !== 201 || call.body.signOnPhone !== true || call.body.signature !== undefined || call.body.kind !== "key") return "the key was not sent with signOnPhone and no drawing";
    const id = stubs.state.property[stubs.state.property.length - 1].id;
    const chip = '[data-property-row="' + id + '"] [data-signature-state="waiting"]';
    await d.page.locator(chip).waitFor({ timeout: 3000 }).catch(() => {});
    if ((await d.page.locator(chip).count()) !== 1) return "the key's row does not read Waiting for signature";
    await d.page.locator('[data-property-row="' + id + '"] [data-signature-remind]').click();
    const remind = await lastCall((c) => /^\/api\/signatures\/[^/]+\/remind$/.test(c.path) && c.method === "POST");
    return remind && remind.status === 200 ? "" : "Remind did not post";
  });
  if (p.step270 !== "all") return;
  await check("Waiting for signatures lists the Not right request first with its note, and Sign here now signs in the office", async () => {
    await go(d, "hr", null, '[data-hr-tab="signatures"]');
    await d.page.locator('[data-hr-tab="signatures"]').click();
    await until(d, "[data-signature-requests] table tbody tr");
    const rows = await settledCount(d, "[data-signature-requests] table tbody tr");
    if (rows < 4) return "the list draws " + rows + " rows";
    const first = d.page.locator("[data-signature-requests] table tbody tr").first();
    if ((await first.locator('[data-signature-state="disputed"]').count()) !== 1) return "the first row is not the Not right one";
    if (((await first.locator("[data-signature-note]").innerText()) || "").indexOf(DISPUTE_NOTE) < 0) return "the Not right row does not carry its note";
    if ((await first.locator("[data-signature-age]").count()) !== 1) return "the row carries no age";
    // The key sent a moment ago is the newest waiting row, so the last.
    await d.page.locator("[data-signature-requests] [data-signature-sign-here]").last().click();
    await until(d, "[data-sign-here-window] [data-sign-here-statement]");
    await d.drawSignature();
    await d.page.locator("[data-sign-here-window] [data-signature-box] button").first().click();
    await d.page.locator("[data-sign-here-window]").waitFor({ state: "detached" });
    const call = await lastCall((c) => /^\/api\/signatures\/[^/]+\/sign-here$/.test(c.path) && c.method === "POST");
    if (!call || call.status !== 200 || !/^data:image\/png/.test(String(call.body.signature || ""))) return "Sign here now did not post the drawing";
    for (let i = 0; i < 30 && (await d.page.locator("[data-signature-requests] table tbody tr").count()) !== rows - 1; i++) await wait(100);
    return (await d.page.locator("[data-signature-requests] table tbody tr").count()) === rows - 1 ? "" : "the signed request is still listed under Open";
  });
  await check("the address #hr/signatures/<id> opens Waiting for signatures with the Not right request open, which offers no Remind", async () => {
    await go(d, "hr", ["signatures", "sr-1"], '[data-signature-request-window="sr-1"]');
    const win = d.page.locator('[data-signature-request-window="sr-1"]');
    await win.locator("[data-signature-state]").waitFor();
    if ((await win.locator('[data-signature-state="disputed"]').count()) !== 1) return "the window does not read Not right";
    if (((await win.locator("[data-signature-note]").innerText()) || "").indexOf(DISPUTE_NOTE) < 0) return "the window does not carry the note";
    if ((await win.locator("[data-signature-remind]").count()) !== 0) return "Remind is offered on a Not right request";
    if ((await win.locator("[data-signature-cancel]").count()) !== 1 || (await win.locator("[data-signature-sign-here]").count()) !== 1) return "Cancel and Sign here now are not offered";
    await win.locator("[data-signature-request-close]").click();
    await d.page.locator('[data-signature-request-window="sr-1"]').waitFor({ state: "detached" });
    if ((await d.page.evaluate(() => window.location.hash)) !== "#hr/signatures") return "the address did not fall back to #hr/signatures";
    return (await d.page.locator("[data-signature-requests] table tbody tr").count()) > 0 ? "" : "the list is not under the window";
  });
  await check("Who needs it reads From a key on file and offers no Remove on it", async () => {
    await go(d, "hr", ["training", "catalog"], "[data-training-catalog] table tbody tr");
    await d.page.locator("[data-training-catalog] table tbody tr").filter({ hasText: KEYS_TOPIC[p.lang] }).first().click();
    await until(d, "[data-topic-details]");
    await d.page.locator('[data-topic-tab="who"]').click();
    await until(d, "[data-topic-who]");
    if ((await d.page.locator('[data-who-source="property"]').count()) !== 1) return "no row reads From a key on file";
    await d.page.locator("[data-who-edit]").click();
    await until(d, "[data-topic-who-form]");
    const removes = await d.page.locator('[data-who-source="property"] button').count();
    await d.page.locator('[data-topic-window] button[aria-label="' + d.say("Close") + '"]').click();
    return removes === 0 ? "" : "the key's row offers Remove";
  });
}

// Step 273's screens, each a line, against the stub armed with setStep269 (audit/stubs.js). Every line
// waits for what it reads. The phone pass runs the screen lines without the prints; the supervisor
// pass runs its own two.
async function step269(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  const lastCall = (test) => stubs.calls.filter(test).pop() || null;
  const printed = async (before) => { await d.page.waitForFunction((n) => window.__audit.prints.length > n, before); const all = await d.prints(); return all[all.length - 1].html; };
  const saved = async (name) => { await d.page.waitForFunction((x) => window.__audit.downloads.some((y) => y.name === x), name); return true; };
  if (p.step269 === "supervisor") {
    await check("is not offered the owner's dashboard, and its address shows the API's refusal", async () => {
      if ((await d.page.locator('[data-nav-item="owner"]').count()) !== 0) return "the side panel offers it";
      await go(d, "owner", null, "[data-owner-refusal]");
      const said = (await d.page.locator("[data-owner-refusal]").innerText()).trim();
      const call = lastCall((c) => c.path === "/api/owner/dashboard");
      if (!call || call.status !== 403) return "the dashboard was not refused";
      if ((await d.page.locator("[data-owner-section]").count()) !== 0) return "a section is drawn";
      return said === call.json.error ? "" : "the page reads " + JSON.stringify(said);
    });
    await check("reads the matrix for their own sites alone", async () => {
      await go(d, "training", ["matrix"], "[data-matrix-cell]");
      await d.page.locator('[data-matrix-filter="siteId"] option').nth(SUPERVISOR_SITES.length).waitFor({ state: "attached" });
      const values = await d.page.locator('[data-matrix-filter="siteId"] option').evaluateAll((os) => os.map((o) => o.value));
      if (values[0] !== "" || values.slice(1).join(",") !== SUPERVISOR_SITES.join(",")) return "the Site choice holds " + JSON.stringify(values);
      const first = await d.page.locator('[data-matrix-filter="siteId"] option').first().innerText();
      return first === d.say("All my sites") ? "" : "the first choice reads " + JSON.stringify(first);
    });
    return;
  }
  await check("the owner's dashboard reads Needs on a measure with no value, opens a measure's sites, and tones its arrows", async () => {
    await go(d, "owner", null, "[data-owner-section]");
    const call = lastCall((c) => c.path === "/api/owner/dashboard");
    if (!call || !/(^|[?&])period=\d{4}-\d{2}(&|$)/.test(call.query)) return "the period was not sent";
    const sections = await d.page.locator("[data-owner-section]").count();
    if (sections !== call.json.sections.length) return sections + " sections are drawn";
    const m = [].concat(...call.json.sections.map((x) => x.measures)).find((x) => x.key === NEEDS_MEASURE);
    const needs = d.page.locator('[data-owner-measure="' + NEEDS_MEASURE + '"] [data-owner-needs]');
    if ((await needs.count()) !== 1) return "no Needs line on the measure with no value";
    const text = await needs.innerText();
    if (text.indexOf(d.say("Needs:")) < 0 || text.indexOf(m.needs) < 0) return "the Needs line reads " + JSON.stringify(text);
    if ((await d.page.locator('[data-owner-measure="' + NEEDS_MEASURE + '"] [data-owner-value]').count()) !== 0) return "a value is drawn on the measure with no value";
    await d.page.locator('[data-owner-measure="' + SITES_MEASURE + '"] [data-owner-by-site-toggle]').click();
    await until(d, '[data-owner-measure="' + SITES_MEASURE + '"] [data-owner-by-site] tbody tr');
    const rows = await d.page.locator('[data-owner-measure="' + SITES_MEASURE + '"] [data-owner-by-site] tbody tr').count();
    if (rows !== 3) return "the measure's sites list " + rows + " rows";
    if ((await d.page.locator('[data-owner-measure="findingsOpened"] [data-owner-trend="up"][data-owner-tone="worse"]').count()) !== 1) return "a count that should go down and went up is not toned worse";
    if ((await d.page.locator('[data-owner-measure="' + SITES_MEASURE + '"] [data-owner-trend="up"][data-owner-tone="better"]').count()) !== 1) return "a score that went up is not toned better";
    return (await d.page.locator('[data-owner-measure="clientRequests"] [data-owner-tone="neutral"]').count()) === 1 ? "" : "a count neither way better is not gray";
  });
  if (p.step269 === "all") await check("the owner's dashboard prints every section on letter paper with the period, the site and the day", async () => {
    const quarter = await d.page.locator("[data-owner-period] option").evaluateAll((os) => (os.find((o) => /-Q\d$/.test(o.value)) || {}).value);
    await d.page.locator("[data-owner-period]").selectOption(quarter);
    await d.page.waitForFunction((q) => !!document.querySelector("[data-owner-section]") && (document.querySelector("[data-owner-period]") || {}).value === q, quarter);
    await until(d, "[data-owner-section]");
    const call = lastCall((c) => c.path === "/api/owner/dashboard");
    if (call.query.indexOf("period=" + quarter) < 0) return "the quarter was not sent";
    const before = (await d.prints()).length;
    await d.page.locator("[data-owner-print]").click();
    const html = await printed(before);
    if (html.indexOf("@page{size:letter}") < 0) return "the print does not ask for letter paper";
    const missing = call.json.sections.filter((x) => html.indexOf(x.title) < 0);
    if (missing.length) return "the print leaves out " + missing.map((x) => x.key).join(", ");
    if (html.indexOf(d.say("All sites")) < 0) return "the print does not name the site";
    if (html.indexOf(d.say("Printed on {0}").split("{0}")[0].trim()) < 0) return "the print does not carry the day";
    const label = await d.page.locator("[data-owner-period] option:checked").innerText();
    return html.indexOf(label) < 0 ? "the print does not name the period" : "";
  });
  await check("the time report reads the last full week with its totals and saves its CSV", async () => {
    await go(d, "training", ["time"], "[data-training-time] table tbody tr");
    await until(d, "[data-time-total]");
    const call = lastCall((c) => c.path === "/api/training/time" && /from=/.test(c.query));
    if (!call || call.query.indexOf("from=" + LAST_WEEK.from) < 0 || call.query.indexOf("to=" + LAST_WEEK.to) < 0) return "the range asked for is " + (call ? call.query : "nothing");
    const people = call.json.people.length;
    const rows = await d.page.locator("[data-training-time] table tbody tr").count();
    if (rows !== people + 1) return rows + " rows for " + people + " people and the totals";
    const total = await d.page.locator("[data-training-time] table tbody tr").last().locator("[data-time-minutes]").getAttribute("data-time-minutes");
    if (Number(total) !== call.json.totals.minutes) return "the totals row reads " + total + " minutes";
    if ((await d.page.locator("[data-time-note]").innerText()).indexOf(d.say("Minutes are time in phone lessons, each attempt capped at 60. Session hours are not recorded; add them from the session list.")) < 0) return "the line under the table is not there";
    const name = "training-time-" + LAST_WEEK.from + "-to-" + LAST_WEEK.to + ".csv";
    await d.page.locator("[data-time-download]").click();
    await saved(name);
    const csv = lastCall((c) => c.path === "/api/training/time" && /format=csv/.test(c.query));
    return csv && csv.status === 200 ? "" : "the CSV was not asked for";
  });
  await check("the matrix opens a cell taken at each site with each site's status", async () => {
    await go(d, "training", ["matrix"], "[data-matrix-cell]");
    const legend = await d.page.locator("[data-matrix-legend-item]").count();
    if (legend !== 7) return "the legend holds " + legend + " statuses";
    await d.page.locator('[data-matrix-cell-person="' + TWO_SITE_PERSON + '"][data-matrix-per-site]').first().click();
    await until(d, "[data-matrix-detail] [data-matrix-site]");
    const states = await d.page.locator("[data-matrix-detail] [data-matrix-site]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-matrix-site-status")).sort().join(","));
    if (states !== "current,missing") return "the sites read " + states;
    if ((await d.page.locator("[data-matrix-detail] [data-matrix-method]").count()) !== 1) return "the cell does not say how it was done";
    await d.page.locator('[data-matrix-detail] button[aria-label="' + d.say("Close") + '"]').click();
    await d.page.locator("[data-matrix-detail]").waitFor({ state: "detached" });
    if (p.step269 !== "all") return "";
    const before = (await d.prints()).length;
    await d.page.locator("[data-matrix-print]").click();
    const html = await printed(before);
    if (html.indexOf("@page{size:letter landscape}") < 0) return "the print is not landscape";
    if (html.indexOf(d.say("Training matrix")) < 0) return "the print is not titled";
    await d.page.locator("[data-matrix-download]").click();
    await d.page.waitForFunction(() => window.__audit.downloads.some((y) => /^training-matrix-.*\.csv$/.test(y.name)));
    const csv = lastCall((c) => c.path === "/api/training/matrix" && /format=csv/.test(c.query));
    return csv && csv.status === 200 ? "" : "the CSV was not asked for";
  });
}

// Step 273's First due after and keys heads-up, each a line, against the stub armed with setStep275
// (audit/stubs.js) over Step 269's. Every line waits for what it reads.
async function step275(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  const lastCall = (test) => stubs.calls.filter(test).pop() || null;
  const lead = (key) => d.say(key).split("{0}")[0].trim();
  const closeTopic = async () => { await d.page.locator('[data-topic-window] button[aria-label="' + d.say("Close") + '"]').click(); await d.page.locator("[data-topic-window]").waitFor({ state: "detached" }); };
  const openTopicForm = async (name) => {
    await d.page.locator("[data-training-catalog] table tbody tr").filter({ hasText: name }).first().click();
    await d.page.locator("[data-topic-edit]").click();
    await until(d, "[data-topic-form]");
  };
  if (p.step275 === "all") await check("the catalog reads First due after, the editor offers it and draws the API's refusal, and none shows without the key", async () => {
    await go(d, "training", ["catalog"], '[data-topic-first-due="' + FOLLOWS + '"]');
    const line = await d.page.locator('[data-topic-first-due="' + FOLLOWS + '"]').first().innerText();
    if (line.indexOf("12") < 0 || line.indexOf(LESSON_TOPIC[p.lang]) < 0) return "the catalog reads " + JSON.stringify(line);
    await openTopicForm(REFRESHER[p.lang]);
    const field = d.page.locator('[data-topic-field="firstDueAfterTopicId"] select');
    if ((await field.inputValue()) !== FOLLOWS) return "First due after does not start on the topic it follows";
    await field.selectOption(PER_SITE_TOPIC);
    await d.page.locator("[data-topic-save]").click();
    await until(d, '[data-topic-refusal="firstDueAfterTopicId"]');
    const refused = lastCall((c) => c.path === "/api/training/topics/" + REFRESHER.id && c.method === "PATCH");
    if (!refused || refused.status !== 400 || refused.body.firstDueAfterTopicId !== PER_SITE_TOPIC) return "the per-site topic was not sent and refused";
    if ((await d.page.locator('[data-topic-refusal="firstDueAfterTopicId"]').innerText()).trim() !== refused.json.error) return "the refusal is not drawn in the API's words";
    await field.selectOption(FOLLOWS);
    await d.page.locator("[data-topic-save]").click();
    await until(d, "[data-topic-details] [data-topic-first-due]");
    const kept = lastCall((c) => c.path === "/api/training/topics/" + REFRESHER.id && c.method === "PATCH");
    if (kept.status !== 200 || kept.body.firstDueAfterTopicId !== FOLLOWS) return "the save did not send the topic it follows";
    await closeTopic();
    stubs.setStep275(false);
    try {
      await go(d, "training", ["catalog"], "[data-training-catalog] table tbody tr");
      if ((await d.page.locator("[data-topic-first-due]").count()) !== 0) return "a first due line shows with no firstDueAfter in the answer";
      await openTopicForm(LESSON_TOPIC[p.lang]);
      const offered = await d.page.locator('[data-topic-field="firstDueAfterTopicId"]').count();
      await d.page.locator("[data-topic-form] button").filter({ hasText: d.say("Cancel") }).click();
      await closeTopic();
      return offered ? "the editor offers First due after with no firstDueAfter in the answer" : "";
    } finally { stubs.setStep275(true); }
  });
  await check("a person coming due reads First due and the day in the matrix and in Gaps", async () => {
    const cell = '[data-matrix-cell-person="' + FIRST_DUE_PERSON + '"][data-matrix-cell-topic="' + REFRESHER.id + '"] [data-matrix-first-due]';
    await go(d, "training", ["matrix"], cell);
    const text = await d.page.locator(cell).innerText();
    if (text.indexOf(lead("First due {0}")) !== 0 || text.trim() === lead("First due {0}")) return "the cell reads " + JSON.stringify(text);
    if (p.step275 !== "all") return "";
    await go(d, "training", ["gaps"], '[data-gaps-person="' + FIRST_DUE_PERSON + '"] [data-gap-first-due]');
    const chip = await d.page.locator('[data-gaps-person="' + FIRST_DUE_PERSON + '"] [data-gap-first-due] [data-gap-word]').innerText();
    return chip.indexOf(lead("First due {0}")) === 0 ? "" : "the Gaps line reads " + JSON.stringify(chip);
  });
  await check("a key for a person without Keys and access draws the line under the kind, and a uniform shirt does not", async () => {
    await go(d, "hr", [FIRST_DUE_PERSON], "[data-property-issue]");
    await d.page.locator("[data-property-issue]").click();
    await d.page.locator('[data-property-kind="key"]').click();
    await until(d, "[data-keys-heads-up]");
    const line = (await d.page.locator("[data-keys-heads-up]").innerText()).trim();
    if (line !== d.say("Keys and access is not done yet. OCSA-HR-013 Section 3 asks for it before any key, badge, fob or code is issued. If they already hold this one, record it; the training is assigned from the record.")) return "the line reads " + JSON.stringify(line);
    const read = lastCall((c) => c.path === "/api/training/gaps/people/" + FIRST_DUE_PERSON);
    if (!read || read.status !== 200) return "the person's training was not read";
    await d.page.locator('[data-property-kind="uniform_shirt"]').click();
    await d.page.locator("[data-keys-heads-up]").waitFor({ state: "detached" });
    const save = await d.page.locator("[data-property-save]").count();
    await d.page.locator("[data-property-window] button").filter({ hasText: d.say("Cancel") }).click();
    await d.page.locator("[data-property-window]").waitFor({ state: "detached" });
    return save ? "" : "the window lost its save";
  });
}

// Step 278's Help pictures, each a line, against the stub armed with setStep278 (audit/stubs.js) once
// Help has answered as before: a how-to answer draws its picture under it from the screen's
// language's file, described by its entry's title, and opens it full screen and closes it; an answer
// to anything else draws none; and, in English, a portal picture is read from the portal's address,
// which the driver answers from public/guide-shots, so nothing leaves the machine.
async function step278(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  // An image is drawn once it has loaded with a width.
  const loaded = async (img) => { await img.waitFor(); return d.page.waitForFunction((el) => el.complete && el.naturalWidth > 0, await img.elementHandle()).then(() => true).catch(() => false); };
  const ask = async (words) => {
    const before = await d.page.locator("[data-help-answer]").count();
    await d.page.locator("textarea").first().fill(words);
    await d.page.locator('button[aria-label="' + d.say("Send") + '"]').first().click();
    const answer = d.page.locator("[data-help-answer]").nth(before);
    await answer.getByText(d.say("Was this helpful?")).or(answer.getByText(HELP_REPLY)).first().waitFor();
    return answer;
  };
  await check("a how-to answer draws its picture in the screen's language, and it opens full screen and closes", async () => {
    await go(d, "help", null, 'button[aria-label="' + d.say("Send") + '"]');
    const answer = await ask(HELP_QUESTION[p.lang]);
    const img = answer.locator('[data-help-picture="dashboard:' + HELP_PICTURE.name + '"] img');
    if (!(await loaded(img))) return "the picture did not load";
    const src = await img.getAttribute("src");
    if (src !== "/guide-shots/" + HELP_PICTURE.name + "." + p.lang + ".jpg") return "the picture reads " + src;
    if ((await img.getAttribute("alt")) !== HELP_PICTURE.entry) return "the picture is not described by its entry's title";
    await answer.locator('[data-help-picture="dashboard:' + HELP_PICTURE.name + '"]').click();
    if (!(await loaded(d.page.locator("[data-help-picture-open] img")))) return "the picture did not open full screen";
    await d.page.locator("[data-help-picture-close]").click();
    await d.page.locator("[data-help-picture-open]").waitFor({ state: "detached" });
    return "";
  });
  await check("an answer to anything else draws no picture", async () => {
    const answer = await ask(p.lang === "es" ? "Gracias" : "Thanks");
    return (await answer.locator("[data-help-picture]").count()) === 0 ? "" : "the answer draws a picture";
  });
  if (p.lang !== "en") return;
  await check("a portal picture is read from the portal's address", async () => {
    stubs.setAgentStream({ pieces: [HELP_REPLY], done: { citedDocs: ["APP-PORTAL"], pictures: [{ app: "portal", name: HELP_PICTURE.name, entry: "See your shifts (staff portal)" }] } });
    const answer = await ask("How do I see my shifts on the phone?");
    const img = answer.locator('[data-help-picture="portal:' + HELP_PICTURE.name + '"] img');
    if (!(await loaded(img))) return "the portal picture did not load";
    const src = (await img.getAttribute("src")) || "";
    return /^https:\/\//.test(src) && src.indexOf(origin) !== 0 && /\/guide-shots\/[a-z0-9-]+\.en\.jpg$/.test(src) ? "" : "the portal picture reads " + src;
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
  // Step 266's answers are laid over Step 262's.
  if (p.step266) stubs.setStep266(true);
  // Step 270's answers are laid over Step 266's.
  if (p.step270) stubs.setStep270(true);
  // Step 269's answers are laid over whichever of those the pass arms.
  if (p.step269) stubs.setStep269(true);
  // Step 275's answers are laid over Step 269's.
  if (p.step275) stubs.setStep275(true);
  if (p.secondStep) armSecondStep(stubs);
  const kept = keepSignIn(stubs);
  const d = await createDriver({ browser, origin, stubs, viewport: p.viewport, lang: p.lang });
  // A control that is not there fails its line in seconds, not in the driver's thirty.
  d.page.setDefaultTimeout(8000);
  try {
    await d.page.goto(origin + "/#overview", { waitUntil: "domcontentloaded" });
    if (p.wrongSignIn) await wrongSignIn(d, p, kept);
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
    if (p.step266) await step266(d, origin, p, stubs);
    if (p.step270) await step270(d, origin, p, stubs);
    if (p.step269) await step269(d, origin, p, stubs);
    if (p.step275) await step275(d, origin, p, stubs);

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
    // Step 278's answers are laid over the rest once Help has answered as it always has.
    if (p.step278) { stubs.setStep278(true); await step278(d, origin, p, stubs); }
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
    PASSES.forEach((p) => { held[p.name] = []; });
    const done = PASSES.map(() => false);
    let printed = 0;
    const flush = () => {
      while (printed < PASSES.length && done[printed]) {
        const name = PASSES[printed].name;
        process.stdout.write(held[name].join(""));
        delete held[name];
        printed += 1;
      }
    };
    let next = 0;
    const lane = async () => {
      while (next < PASSES.length) {
        const i = next;
        next += 1;
        const p = PASSES[i];
        try { await runPass(browser, server.origin, p); }
        catch (e) { say(false, p.name, "runs", e.message.split("\n")[0]); }
        done[i] = true;
        flush();
      }
    };
    await Promise.all(Array.from({ length: Math.min(LANES, PASSES.length) }, lane));
  } finally {
    await browser.close();
    await server.close();
  }
  const ms = Date.now() - started;
  say(ms < LIMIT_MS, "time", "finished in " + Math.round(ms / 1000) + "s", ms < LIMIT_MS ? "" : "three minutes or more");
  process.stdout.write(failures ? failures + " failed\n" : "all passed\n");
  process.exit(failures ? 1 : 0);
})().catch((e) => { process.stdout.write("FAIL  smoke                " + (e.stack || String(e)).split("\n")[0] + "\n"); process.exit(1); });
