// The dashboard's findings (part 366): the Before 100 findings in audit/FINDINGS_2026-10.md that need
// nothing new from the API and no decision from the owner, against the stub as the API is built
// (setApiAsBuilt) with Round 2's file log (setStep353) and part 364's answers (setStep364). Each case runs
// in English and in Spanish, and each fails on main as it stood at 452f058 unless its name says it is a
// guard: a guard holds what main already did and the round must keep.
//
//   DASH-20  HR Records is offered to a supervisor only once the capability read answers, and the read is
//            tried again after a failure, which brings Cases back
//   DASH-24  a press beside a window asks before it throws away what was typed; an untouched one closes
//   DASH-26  Discipline offers Issue a warning: the person, then the warning window at the step suggested
//   DASH-27  an alert tapped before sign-in opens once the capabilities and the probes have answered
//   DASH-29  the guide gives a supervisor a way in to every task it says they can do (read from the file)
//   DASH-30  a supervisor's profile reads no employment history and draws no refusal; an admin's does
//   DASH-31  a call that finds no connection is said in the screen's language, on the sign-in card and in
//            a toast read out as it appears
//   DASH-32  at 390 wide at the Largest text size no page is narrower than 320 and none scrolls sideways
//   DASH-33  Edit Scheduled Shift sends only what changed, once
//   DASH-34  a time off request's Approve waits until the window has read the request
//   DASH-35  Shift Pickup's Post Shift and Convert send once, and its shift edit sends only what changed
//   DASH-36  the HR document, training, onboarding step and certification windows send once, and a training
//            edit sends only what changed
//   DASH-40  an HR document whose link to its Jotform submission fails says so and keeps the window
//   DASH-41  this computer's alerts are let go when a session ends by itself, or cannot move to the next
//            person; a move that works keeps them (guard)
//   DASH-45  a cell a spreadsheet would read as a formula is written as text in the CSVs the browser makes
"use strict";
const fs = require("fs");
const path = require("path");
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "findings366";
const ROOT = path.resolve(__dirname, "..", "..");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const LANGS = ["en", "es"];
const fill = (s, ...v) => v.reduce((x, y, i) => x.split("{" + i + "}").join(String(y)), s);
const say = (x) => JSON.stringify(x);

async function goHash(d, h) {
  await d.page.evaluate(() => { window.location.hash = "overview"; });
  await wait(150);
  await d.page.evaluate((x) => { window.location.hash = x; }, h);
  await d.settle(700);
}
const textOf = async (d, sel) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? (await l.innerText()).trim() : ""; };
const has = async (d, sel) => (await d.page.locator(sel).count()) > 0;
const until = async (d, sel, ms) => { await d.page.locator(sel).first().waitFor({ timeout: ms || 6000 }).catch(() => {}); return has(d, sel); };
const writes = (d, mark, method, re) => d.callsSince(mark).filter((c) => c.method === method && re.test(c.path));
const navIds = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("[data-nav-item]")).map((b) => b.getAttribute("data-nav-item")));
const backdrop = (d) => d.page.locator("div[style*='z-index: 500']").last();
const pressBeside = async (d) => { await backdrop(d).click({ position: { x: 4, y: 4 } }).catch(() => {}); await d.settle(250); };
const inWindow = (d) => d.page.locator("div[style*='z-index: 500']").last();
const windowButton = (d, english) => inWindow(d).getByRole("button", { name: d.say(english), exact: true }).first();

// One driver on a stub of its own, armed with the API as built, Round 2's file log and part 364.
// o.before runs on the page ahead of sign-in, o.init in the browser ahead of every page script.
async function withDriver(ctx, o, fn) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  if (o.asBuilt !== false) stubs.setApiAsBuilt(true);
  stubs.setStep353(true);
  stubs.setStep364(true);
  if (o.arm) o.arm(stubs);
  const d = await createDriver({ browser, origin, stubs, viewport: o.viewport || "wide", lang: o.lang || "en", textSize: o.textSize, theme: o.theme });
  d.page.setDefaultTimeout(8000);
  try {
    if (o.init) await d.context.addInitScript(o.init);
    if (o.before) await o.before(d, stubs);
    if (o.persona !== null) await d.signIn(o.persona || "admin");
    await fn(d, stubs);
  } catch (e) {
    results.fail(KIND, KIND + "/" + (o.lang || "en") + "/" + o.name + "/suite", threw(e));
  } finally { await d.close(); }
}

// ---- DASH-20 and DASH-27: what waits on this person's capabilities ------------------------------------
const HR_READS = /^\/api\/(hr\/(documents|training|compliance|onboarding|employees-summary)|jotform\/employees)/;
async function capabilityCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/" + x;
  // While the read is out, a supervisor who will be refused HR Records is offered neither the item nor
  // the page's reads.
  await withDriver(ctx, { name: "dash20-loading", lang, persona: "supervisor146", arm: (s) => s.setDelay("/api/users/me/permissions", 12000) }, async (d) => {
    const items = await navIds(d);
    const mark = d.mark();
    await goHash(d, "hr");
    await wait(600);
    const reads = d.callsSince(mark).filter((c) => c.method === "GET" && HR_READS.test(c.path)).map((c) => c.path);
    const pending = await has(d, "[data-caps-pending]");
    results.check(KIND, id("dash20/no-hr-records-while-the-read-is-out"), items.indexOf("hr") < 0 && reads.length === 0 && pending,
      items.indexOf("hr") >= 0 ? "the side panel offers HR Records before the capabilities answer" : reads.length ? "#hr read " + reads.slice(0, 3).join(", ") + " before the capabilities answered" : "#hr does not say Loading while the capabilities are read");
  });
  // Both reads fail for want of a server: HR Records stays closed, and the read is tried again, which
  // brings Cases back once it answers.
  await withDriver(ctx, { name: "dash20-failed", lang, persona: "supervisor146", arm: (s) => s.setRefusal([
    { method: "GET", path: "/api/users/me/permissions", status: 503, code: "common.serverError", error: "Service unavailable", once: true },
    { method: "GET", path: /^\/api\/users\/u-sup-146\/permissions$/, status: 503, code: "common.serverError", error: "Service unavailable", once: true },
  ]) }, async (d, stubs) => {
    const items = await navIds(d);
    const mark = d.mark();
    let again = false;
    for (let i = 0; i < 30 && !again; i += 1) { await wait(500); again = d.callsSince(mark).some((c) => c.method === "GET" && c.path === "/api/users/me/permissions"); }
    await d.settle(600);
    const after = await navIds(d);
    results.check(KIND, id("dash20/no-hr-records-when-the-read-fails"), items.indexOf("hr") < 0, "the side panel offers HR Records with no capability answer: " + items.join(", "));
    results.check(KIND, id("dash20/the-read-is-tried-again"), again && after.indexOf("cases") >= 0,
      !again ? "the capability read was not tried again in 15 seconds" : "the read answered and Cases is still not offered: " + after.join(", "));
  });
  // DASH-27: an alert tapped before signing in, for a case and for a filed report, both of which this
  // supervisor opens once the session knows it.
  const tapped = [["hr_case_assigned", "hc-1", "#cases/hc-1"], ["form", "fr-1", "#forms/reports/fr-1"]];
  for (const [type, subject, where] of tapped) {
    await withDriver(ctx, { name: "dash27-" + type, lang, persona: null, arm: (s) => { s.setDelay("/api/users/me/permissions", 2500); s.setDelay("/api/forms/responses", 2500); } }, async (d, stubs) => {
      await d.page.goto(ctx.origin + "/#overview", { waitUntil: "domcontentloaded" });
      await d.page.getByText(d.say("Admin Dashboard")).first().waitFor({ timeout: 20000 });
      await d.page.evaluate((m) => { try { navigator.serviceWorker.dispatchEvent(new MessageEvent("message", { data: m })); } catch (e) { window.__noSw = String(e); } }, { type: "ocsa-open", subjectType: type, subjectId: subject, place: where.slice(1) });
      // Signed in on the card as it stands: the driver's signIn reloads the page, which a person who
      // tapped an alert does not do.
      const inputs = d.page.locator("input");
      await inputs.nth(0).fill(seed.PEOPLE.supervisor146.login.phone);
      await inputs.nth(1).fill(seed.PEOPLE.supervisor146.login.pin);
      await d.page.getByRole("button", { name: d.say("Sign In") }).first().click();
      let at = "";
      for (let i = 0; i < 16; i += 1) { at = await d.page.evaluate(() => window.location.hash); if (at === where) break; await wait(400); }
      const toast = (await d.toast()) || "";
      results.check(KIND, id("dash27/alert-opens-" + type + "-after-sign-in"), at === where && toast.indexOf(d.say("That one is for admins. Ask an admin to take a look.")) < 0,
        at === where ? "it was refused: " + say(toast) : "the alert for " + type + " left the page at " + at + (toast ? ", saying " + say(toast) : ""));
    });
  }
}

// ---- DASH-24: a press beside a window ----------------------------------------------------------------
async function backdropCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/dash24/" + x;
  await withDriver(ctx, { name: "dash24", lang }, async (d) => {
    const ask = d.say("Close this window? What you entered here will be lost.");
    await d.goto("staff");
    await d.clickText(d.say("Add Staff"), { exact: true });
    await d.settle(300);
    const opened = await d.modalOpen();
    await d.clearCaptures();
    await pressBeside(d);
    const untouched = !(await d.modalOpen());
    const askedUntouched = (await d.confirms()).length;
    results.check(KIND, id("guard-an-untouched-window-closes"), opened && untouched && askedUntouched === 0, !opened ? "Add Staff did not open" : !untouched ? "an untouched window stayed open" : "an untouched window asked " + say(await d.confirms()));
    await d.clickText(d.say("Add Staff"), { exact: true });
    await d.settle(300);
    await d.modal().locator("input").first().fill("Rosalind");
    await d.clearCaptures();
    await d.setConfirmAnswer(false);
    await pressBeside(d);
    const kept = await d.modalOpen();
    const asked = await d.confirms();
    const typedKept = kept ? await d.modal().locator("input").first().inputValue().catch(() => "") : "";
    await d.setConfirmAnswer(true);
    await pressBeside(d);
    const closedOnYes = !(await d.modalOpen());
    results.check(KIND, id("asks-before-throwing-away-what-was-typed"), asked.length === 1 && asked[0] === ask && kept && typedKept === "Rosalind" && closedOnYes,
      asked.length === 0 ? "a press beside the window closed it with what was typed, asking nothing" : asked[0] !== ask ? "it asked " + say(asked) : !kept ? "No closed it anyway" : typedKept !== "Rosalind" ? "what was typed is gone: " + say(typedKept) : "Yes did not close it");
  });
}

// ---- DASH-26: Issue a warning from the Discipline page -------------------------------------------------
async function disciplineCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/dash26/" + x;
  await withDriver(ctx, { name: "dash26", lang, persona: "supervisor146" }, async (d) => {
    await d.goto("discipline");
    await d.settle(400);
    const btn = d.page.getByRole("button", { name: d.say("Issue a warning"), exact: true });
    const offered = (await btn.count()) > 0;
    if (offered) await btn.first().click();
    const chooser = offered && (await until(d, "[data-discipline-issue-for]"));
    const picked = chooser ? await d.pickPerson(seed.STAFF.find((p) => p.id === "u-staff-5").name.split(" ")[0]) : false;
    const mark = d.mark();
    if (picked) await d.page.locator("[data-discipline-issue-next]").click().catch(() => {});
    await d.settle(700);
    const readPerson = d.callsSince(mark).some((c) => c.method === "GET" && c.path === "/api/discipline/person/u-staff-5");
    const win = inWindow(d);
    const opened = (await win.count()) > 0 && (await win.innerText().catch(() => "")).indexOf(d.say("Issue a warning")) >= 0 && (await win.locator("select").count()) > 0;
    results.check(KIND, id("discipline-issues-a-warning"), offered && chooser && picked && readPerson && opened,
      !offered ? "Discipline offers no Issue a warning" : !chooser ? "Issue a warning opened no window to pick the person" : !picked ? "the person could not be picked" : !readPerson ? "the person's history was not read for the step to suggest" : "the warning window did not open on the person");
  });
}

// ---- DASH-29: the guide's way in for a supervisor -----------------------------------------------------
// Each entry the finding names, read from the file: when its Who line names supervisors, a step says
// what a supervisor opens, by a way in they have (Training, Discipline, Clearances, Waiting for
// signatures, Sites, Cases, Staff Management); when the task is HR Records' alone, the Who line says so
// and names no supervisors. Find a page says supervisors see Staff Management and Cases and lose HR Records.
// The ways in a supervisor has, each with its Spanish as translation/dashboard_words.csv holds it: the
// English pass reads the English name after the word supervisor, the Spanish pass the pair.
const SUPERVISOR_WAYS = [["Training", "Capacitaci\u00f3n"], ["Discipline", "Disciplina"], ["Clearances", "Autorizaciones escolares"], ["Waiting for signatures", "A la espera de firmas"], ["Sites", "Sitios"], ["Cases", "Casos"], ["Staff Management", "Gesti\u00f3n de personal"]];
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wayIn = (lang) => new RegExp("supervisor[^\\n]*(" + SUPERVISOR_WAYS.map(([en, es]) => "\\*\\*" + esc(en) + "\\*\\*" + (lang === "es" ? " \\(\\*\\*" + esc(es) + "\\*\\*\\)" : "")).join("|") + ")", "i");
const GUIDE_ENTRIES = [
  "Add a training record", "Set up and check off an onboarding checklist", "Log training for several people at once",
  "See who has no record of a training", "Print a training attendance sheet", "See training gaps by role and site",
  "Run a training session people sign on their phones", "Upload a training certificate from an outside course",
  "See who signed a document, and say who must sign it", "Issue a verbal warning", "Issue a written or final written warning",
  "Issue PPE to someone", "Issue company property and mark it returned", "Send something to a person's phone to sign",
  "Find a person's signed acknowledgment page", "Add a certification to a staff member", "Open a person's HR file from Staff Management",
];
function guideCases(ctx, lang) {
  const { results } = ctx;
  const text = fs.readFileSync(path.join(ROOT, "guide", "APP-DASHBOARD.md"), "utf8");
  const entries = {};
  text.split(/\n(?=## )/).forEach((chunk) => { const m = /^## (.+)\n/.exec(chunk); if (m) entries[m[1].replace(/ \(admin dashboard\)$/, "")] = chunk; });
  const way = wayIn(lang);
  for (const title of GUIDE_ENTRIES) {
    const body = entries[title];
    const cid = KIND + "/" + lang + "/dash29/guide/" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    if (!body) { results.fail(KIND, cid, "the guide has no entry " + say(title)); continue; }
    const who = ((/Who can do this:([^\n]*)/.exec(body) || [])[1] || "").trim();
    const steps = body.split("\n").filter((l) => /^\d+\. /.test(l) || /^If it does not work:/.test(l)).join("\n");
    const names = /supervisor/i.test(who) || /anyone else who can open Staff Management/i.test(who);
    results.check(KIND, cid, !names || way.test(steps),
      "its Who line reads " + say(who) + " and no step says what a supervisor opens" + (lang === "es" ? ", with its Spanish," : "") + "; the steps start " + say((steps.split("\n")[0] || "").slice(0, 90)));
  }
  const find = entries["Find a page"] || "";
  const hr = lang === "es" ? "**HR Records** (**Expedientes de personal**)" : "**HR Records**";
  results.check(KIND, KIND + "/" + lang + "/dash29/guide/find-a-page", !!find && !/supervisors do not see \*\*Staff Management\*\*, \*\*Cases\*\*/.test(find) && find.indexOf(hr) >= 0 && way.test(find),
    !find ? "the guide has no Find a page" : "Find a page still says supervisors see no Staff Management or Cases, and names no HR Records and no way in a supervisor has");
}

// ---- DASH-30: the employment card on a supervisor's profile --------------------------------------------
async function employmentCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/dash30/" + x;
  await withDriver(ctx, { name: "dash30", lang, persona: "supervisor146" }, async (d) => {
    const mark = d.mark();
    await goHash(d, "staff/u-staff-5");
    await d.settle(600);
    const read = d.callsSince(mark).some((c) => c.method === "GET" && c.path === "/api/users/u-staff-5/employment");
    const said = await has(d, "[data-employment-said]");
    results.check(KIND, id("supervisor-profile-reads-no-employment"), !read && !said, read ? "the profile read GET /api/users/:id/employment, which is read_hr_records'" + (said ? ", and draws its refusal" : "") : "the profile draws a line where the card goes");
  });
  await withDriver(ctx, { name: "dash30-admin", lang }, async (d) => {
    const mark = d.mark();
    await goHash(d, "staff/u-staff-5");
    await d.settle(600);
    const read = d.callsSince(mark).some((c) => c.method === "GET" && c.path === "/api/users/u-staff-5/employment");
    results.check(KIND, id("guard-admin-profile-reads-employment"), read, "an admin's profile no longer reads the employment history");
  });
}

// ---- DASH-31: a call that finds no connection ------------------------------------------------------------
async function networkCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/dash31/" + x;
  const words = (d) => d.say("The dashboard could not reach the server. Check the connection and try again.");
  await withDriver(ctx, { name: "dash31-sign-in", lang, persona: null }, async (d) => {
    await d.page.route("**/api/auth/login**", (r) => r.abort("internetdisconnected"));
    await d.page.goto(ctx.origin + "/#overview", { waitUntil: "domcontentloaded" });
    await d.page.getByText(d.say("Admin Dashboard")).first().waitFor({ timeout: 20000 });
    const inputs = d.page.locator("input");
    await inputs.nth(0).fill(seed.PEOPLE.admin.login.phone);
    await inputs.nth(1).fill(seed.PEOPLE.admin.login.pin);
    await d.page.getByRole("button", { name: d.say("Sign In") }).first().click();
    await d.settle(600);
    const body = await d.page.evaluate(() => document.body.innerText);
    results.check(KIND, id("sign-in-card-says-it-in-words"), body.indexOf(words(d)) >= 0 && !/Failed to fetch|Load failed|NetworkError/.test(body),
      /Failed to fetch|Load failed|NetworkError/.test(body) ? "the sign-in card reads the browser's English: " + say((/(Failed to fetch|Load failed|NetworkError[^\n]*)/.exec(body) || [])[1]) : "the card does not say the connection failed");
  });
  await withDriver(ctx, { name: "dash31-toast", lang }, async (d) => {
    await goHash(d, "hr/u-staff-5");
    await d.settle(600);
    await d.page.route("**/api/users/u-staff-5/certifications**", (r) => (r.request().method() === "POST" ? r.abort("internetdisconnected") : r.fallback()));
    await d.page.locator("[data-folder-certification-add]").first().click().catch(() => {});
    await d.settle(300);
    const box = d.modal().locator("input:not([type=date])").first();
    if ((await box.count()) > 0) await box.fill("Floor machine safety");
    // The welcome toast from signing in goes first, so the toast read is the save's.
    await d.waitToastGone(4000);
    await d.page.locator("[data-folder-certification-save]").first().click().catch(() => {});
    const toast = (await d.waitToast(2500)) || "";
    const role = await d.page.evaluate(() => { const el = Array.from(document.querySelectorAll("div[style*='z-index: 1000']")).find((x) => (x.getAttribute("style") || "").indexOf("top: 20px") >= 0); return el ? el.getAttribute("role") : null; });
    results.check(KIND, id("a-toast-says-it-in-words-and-is-read-out"), toast === words(d) && role === "alert",
      !toast ? "no toast" : toast !== words(d) ? "the toast reads " + say(toast) : "the toast is not read out (role " + say(role) + ")");
  });
}

// ---- DASH-32: 390 wide at the Largest text size --------------------------------------------------------
async function phoneCases(ctx, lang) {
  const { results, app } = ctx;
  const id = (x) => KIND + "/" + lang + "/dash32/" + x;
  await withDriver(ctx, { name: "dash32", lang, viewport: "phone", textSize: "largest", theme: "light" }, async (d) => {
    const pageWidth = await d.page.evaluate(() => { const el = Array.from(document.querySelectorAll("div")).find((x) => x.style && x.style.zoom); const z = el ? Number(el.style.zoom) || 1 : 1; return Math.round(window.innerWidth / z); });
    results.check(KIND, id("the-page-is-at-least-320-wide"), pageWidth >= 320, "the largest text size leaves a page " + pageWidth + " wide on a phone 390 wide");
    const over = [];
    for (const pid of app.pages) {
      await d.goto(pid);
      await d.settle(400);
      const by = await d.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (by > 1) over.push(pid + " by " + by);
    }
    results.check(KIND, id("no-page-scrolls-sideways"), over.length === 0, over.length + " pages scroll sideways: " + over.join(", "));
  });
}

// ---- DASH-33: Edit Scheduled Shift -----------------------------------------------------------------------
async function scheduleCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/dash33/" + x;
  await withDriver(ctx, { name: "dash33", lang, asBuilt: false }, async (d) => {
    await d.goto("schedule");
    await d.settle(500);
    const pickupWords = [d.say("OPEN"), d.say("CLAIMED"), d.say("DROP REQ")];
    const opened = await d.clickGridCell(/^18:00-02:00/, new RegExp(pickupWords.join("|"), "i"));
    await d.settle(400);
    const notes = d.modal().locator("input[placeholder='" + d.say("Notes") + "']").first();
    if ((await notes.count()) > 0) await notes.fill("Bring the wet floor signs");
    const mark = d.mark();
    await windowButton(d, "Save").dblclick().catch(() => {});
    await d.settle(700);
    const sent = writes(d, mark, "PATCH", /^\/api\/schedule\/[^/]+$/);
    const keys = sent[0] && sent[0].body ? Object.keys(sent[0].body).sort() : [];
    results.check(KIND, id("sends-only-what-changed"), sent.length >= 1 && keys.join(",") === "notes" && sent[0].body.notes === "Bring the wet floor signs",
      !opened ? "no shift opened" : sent.length === 0 ? "Save sent nothing" : "Save sent " + say(sent[0].body));
    results.check(KIND, id("sends-once"), sent.length === 1, sent.length === 0 ? "Save sent nothing" : "a double press sent " + sent.length + " changes");
  });
}

// ---- DASH-34: Approve waits for the read -----------------------------------------------------------------
// The window opened from the list's row, which carries the request's status, so Approve is drawn before
// the read answers; opened from its address the window waits for the read on main as well.
async function timeOffCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/dash34/" + x;
  await withDriver(ctx, { name: "dash34", lang }, async (d, stubs) => {
    await goHash(d, "schedule/timeoff");
    await d.settle(500);
    stubs.setDelay("/api/time-off/", 4000);
    await d.page.locator("table tbody tr", { hasText: "Tomasz Wisniewski" }).first().click().catch(() => {});
    await until(d, "[data-time-off-window]", 4000);
    const rid = await d.page.locator("[data-time-off-window]").first().getAttribute("data-time-off-window").catch(() => "");
    const approvals = (m) => writes(d, m, "POST", /^\/api\/time-off\/[^/]+\/approve$/);
    const mark = d.mark();
    const approve = inWindow(d).getByRole("button", { name: d.say("Approve"), exact: true }).first();
    await approve.click({ force: true, timeout: 1500 }).catch(() => {});
    await wait(500);
    const early = approvals(mark);
    const reading = await has(d, "[data-time-off-reading]");
    results.check(KIND, id("approve-waits-for-the-request"), !!rid && early.length === 0 && reading,
      !rid ? "the request's window did not open" : early.length ? "Approve sent " + say(early[0].body) + " before the window had read the shifts the request affects" : "the window does not say it is reading the shifts");
    stubs.clearDelays();
    for (let i = 0; i < 30 && (await has(d, "[data-time-off-reading]")); i += 1) await wait(200);
    await d.settle(300);
    const mark2 = d.mark();
    await approve.click().catch(() => {});
    await d.settle(700);
    const later = approvals(mark2);
    results.check(KIND, id("guard-approve-sends-once-read"), later.length + early.length === 1, "Approve sent " + (later.length + early.length) + " approvals in all");
  });
}

// ---- DASH-35: Shift Pickup ----------------------------------------------------------------------------------
async function pickupCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/dash35/" + x;
  await withDriver(ctx, { name: "dash35-post", lang }, async (d) => {
    await d.goto("marketplace");
    await d.settle(500);
    await d.clickText(d.say("Post Open Shift"), { exact: true });
    await d.settle(300);
    const win = inWindow(d);
    const site = win.locator("select").first();
    const firstSite = await site.locator("option").nth(1).getAttribute("value").catch(() => null);
    if (firstSite) await site.selectOption(firstSite);
    await win.locator("input[type='date']").first().fill(seed.shift(2));
    const times = win.locator("input[type='time']");
    await times.nth(0).fill("06:00"); await times.nth(1).fill("14:00");
    const mark = d.mark();
    await windowButton(d, "Post Shift").dblclick().catch(() => {});
    await d.settle(700);
    const sent = writes(d, mark, "POST", /^\/api\/pickups$/);
    results.check(KIND, id("post-shift-sends-once"), sent.length === 1, sent.length === 0 ? "Post Shift sent nothing" : "a double press posted " + sent.length + " open shifts");
  });
  await withDriver(ctx, { name: "dash35-convert", lang }, async (d) => {
    await d.goto("marketplace");
    await d.settle(500);
    const convertBtn = d.page.getByRole("button", { name: new RegExp(d.say("Convert")) }).first();
    await convertBtn.click().catch(() => {});
    await d.settle(700);
    const row = inWindow(d).locator("div[style*='cursor: pointer']").first();
    const mark = d.mark();
    await row.dblclick().catch(() => {});
    await d.settle(700);
    const sent = writes(d, mark, "POST", /^\/api\/pickups\/convert\//);
    results.check(KIND, id("convert-sends-once"), sent.length === 1, sent.length === 0 ? "Convert sent nothing" : "a double press converted " + sent.length + " times");
  });
  await withDriver(ctx, { name: "dash35-edit", lang }, async (d) => {
    await d.goto("marketplace");
    await d.settle(600);
    await d.page.locator("button[title='" + d.say("View shift") + "']").first().click().catch(() => {});
    await d.settle(500);
    await windowButton(d, "Edit").click().catch(() => {});
    await d.settle(300);
    const notes = inWindow(d).locator("input:not([type])").last();
    if ((await notes.count()) > 0) await notes.fill("Use the side door");
    const mark = d.mark();
    await windowButton(d, "Save Changes").dblclick().catch(() => {});
    await d.settle(700);
    const sent = writes(d, mark, "PATCH", /^\/api\/pickups\/[^/]+$/);
    const keys = sent[0] && sent[0].body ? Object.keys(sent[0].body).sort().join(",") : "";
    results.check(KIND, id("shift-edit-sends-only-what-changed-once"), sent.length === 1 && keys === "notes",
      sent.length === 0 ? "Save Changes sent nothing" : sent.length > 1 ? "a double press sent " + sent.length : "Save Changes sent " + say(sent[0].body));
  });
}

// ---- DASH-36 and DASH-40: HR Records' windows ---------------------------------------------------------------
const PDF = { name: "handbook-receipt.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%invented\n") };
async function hrWindowCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/" + x;
  // An HR document: one upload for a double press.
  await withDriver(ctx, { name: "dash36-document", lang }, async (d) => {
    await goHash(d, "hr/u-staff-5");
    await d.settle(700);
    await d.clickText(d.say("+ Add Document"), { exact: false });
    await until(d, "[data-hr-doc-file]");
    const win = inWindow(d);
    const cat = win.locator("select").filter({ has: d.page.locator("option[value='other']") }).first();
    if ((await cat.count()) > 0) await cat.selectOption("other");
    await d.page.locator("[data-hr-doc-file]").setInputFiles(PDF);
    const mark = d.mark();
    await windowButton(d, "Add").dblclick().catch(() => {});
    await d.settle(800);
    const sent = writes(d, mark, "POST", /^\/api\/jotform\/employees\/u-staff-5\/documents$/);
    results.check(KIND, id("dash36/document-uploads-once"), sent.length === 1, sent.length === 0 ? "Add sent nothing" : "a double press uploaded the document " + sent.length + " times");
  });
  // A training record: one record for a double press, and an edit that sends only what changed.
  await withDriver(ctx, { name: "dash36-training", lang }, async (d, stubs) => {
    await goHash(d, "hr/training");
    await d.settle(700);
    await d.clickText(d.say("+ Add Training"), { exact: false });
    await d.settle(300);
    const win = inWindow(d);
    await d.pickPerson(seed.STAFF.find((p) => p.id === "u-staff-5").name.split(" ")[0]);
    await win.locator("input[placeholder='" + d.say("e.g. General Cleaning Training") + "']").fill("Ladder safety");
    const type = win.locator("select").filter({ has: d.page.locator("option[value='safety']") }).first();
    if ((await type.count()) > 0) await type.selectOption("safety");
    const mark = d.mark();
    await windowButton(d, "Add").dblclick().catch(() => windowButton(d, "Save").dblclick().catch(() => {}));
    await d.settle(800);
    const sent = writes(d, mark, "POST", /^\/api\/hr\/training$/);
    results.check(KIND, id("dash36/training-is-added-once"), sent.length === 1, sent.length === 0 ? "the window sent nothing" : "a double press added " + sent.length + " training records");
    // The edit: the first row's pencil, one field changed.
    await goHash(d, "hr/training");
    await d.settle(700);
    const edit = d.page.locator("table tbody tr").getByRole("button", { name: d.say("Edit"), exact: true }).first();
    await edit.click().catch(() => {});
    await d.settle(400);
    const notes = inWindow(d).locator("textarea").first();
    if ((await notes.count()) > 0) await notes.fill("Refresher booked");
    const mark2 = d.mark();
    await windowButton(d, "Save").click().catch(() => {});
    await d.settle(700);
    const put = writes(d, mark2, "PUT", /^\/api\/hr\/training\/[^/]+$/);
    const keys = put[0] && put[0].body ? Object.keys(put[0].body).sort().join(",") : "";
    results.check(KIND, id("dash36/training-edit-sends-only-what-changed"), put.length === 1 && keys === "notes",
      put.length === 0 ? "the edit sent nothing" : "the edit sent " + say(Object.keys(put[0].body)));
  });
  // An onboarding step and a certification: one each for a double press.
  await withDriver(ctx, { name: "dash36-step", lang }, async (d) => {
    await goHash(d, "hr");
    await d.page.locator("[data-hr-tab='onboarding']").first().click().catch(() => {});
    await d.settle(500);
    await d.pickPerson(seed.STAFF.find((p) => p.id === "u-staff-5").name.split(" ")[0]);
    await d.settle(500);
    await d.clickText(d.say("+ Custom Step"), { exact: false });
    await d.settle(300);
    const win = inWindow(d);
    await win.locator("input").first().fill("Badge photo taken");
    const cat = win.locator("select").first();
    const firstCat = await cat.locator("option").nth(1).getAttribute("value").catch(() => null);
    if (firstCat) await cat.selectOption(firstCat);
    const mark = d.mark();
    await windowButton(d, "Add Step").dblclick().catch(() => {});
    await d.settle(700);
    const sent = writes(d, mark, "POST", /^\/api\/hr\/onboarding\/step$/);
    results.check(KIND, id("dash36/onboarding-step-is-added-once"), sent.length === 1, sent.length === 0 ? "Add Step sent nothing" : "a double press added " + sent.length + " steps");
  });
  await withDriver(ctx, { name: "dash36-certification", lang }, async (d) => {
    await goHash(d, "hr/u-staff-5");
    await d.settle(700);
    await d.page.locator("[data-folder-certification-add]").first().click().catch(() => {});
    await d.settle(300);
    const box = d.modal().locator("input:not([type=date])").first();
    if ((await box.count()) > 0) await box.fill("Floor machine safety");
    const mark = d.mark();
    await d.page.locator("[data-folder-certification-save]").first().dblclick().catch(() => {});
    await d.settle(700);
    const sent = writes(d, mark, "POST", /^\/api\/users\/u-staff-5\/certifications$/);
    results.check(KIND, id("dash36/certification-is-added-once"), sent.length === 1, sent.length === 0 ? "Save sent nothing" : "a double press added " + sent.length + " certifications");
  });
  // DASH-40: the link to the Jotform submission fails.
  await withDriver(ctx, { name: "dash40", lang, arm: (s) => s.setRefusal({ method: "POST", path: /^\/api\/jotform\/submissions\/js-366\/link$/, status: 500, code: "common.serverError", error: lang === "es" ? "Algo sali\u00f3 mal" : "Something went wrong", once: true }) }, async (d) => {
    await d.page.route("**/api/jotform/submissions?**", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ submissions: [{ id: "js-366", jotform_submission_id: "5900000000000366", form_title: "W-4 Employee Withholding", created_at: seed.shift(-2) + "T15:00:00Z", status: "ACTIVE" }] }) }));
    await goHash(d, "hr/u-staff-5");
    await d.settle(700);
    await d.clickText(d.say("+ Add Document"), { exact: false });
    await until(d, "[data-hr-doc-file]");
    const win = inWindow(d);
    const cat = win.locator("select").filter({ has: d.page.locator("option[value='other']") }).first();
    if ((await cat.count()) > 0) await cat.selectOption("other");
    await d.page.locator("[data-hr-doc-file]").setInputFiles(PDF);
    const pick = win.locator("select").filter({ has: d.page.locator("option[value='js-366']") }).first();
    for (let i = 0; i < 20 && (await pick.count()) === 0; i += 1) await wait(150);
    const offered = (await pick.count()) > 0;
    if (offered) await pick.selectOption("js-366");
    const mark = d.mark();
    await windowButton(d, "Add").click().catch(() => {});
    await d.settle(800);
    const linked = writes(d, mark, "POST", /^\/api\/jotform\/submissions\/js-366\/link$/).length;
    const toast = (await d.toast()) || "";
    const kept = await d.modalOpen();
    const line = await textOf(d, "[data-hr-doc-link-failed]");
    results.check(KIND, id("dash40/a-failed-link-is-said-and-the-window-kept"), linked === 1 && toast === d.say("The document is saved. Its link to the Jotform submission did not save.") && kept && line.length > 0,
      !offered ? "the window offers no submission to link" : linked === 0 ? "the link was never tried" : toast !== d.say("The document is saved. Its link to the Jotform submission did not save.") ? "the toast reads " + say(toast) + (kept ? "" : " and the window closed") : !kept ? "the window closed" : "the window says nothing about the link");
  });
}

// ---- DASH-41: this computer's alerts ----------------------------------------------------------------------------
// A browser with alerts allowed and a subscription already held, answered by the page itself.
const FAKE_PUSH = `(() => {
  const box = { unsubscribed: 0 };
  const sub = { endpoint: "https://push.example.invalid/send/f366", toJSON() { return { endpoint: this.endpoint, keys: { p256dh: "BHf366Key", auth: "f366Auth" } }; }, unsubscribe: async () => { box.unsubscribed += 1; box.sub = null; return true; } };
  box.sub = sub;
  const reg = { pushManager: { getSubscription: async () => box.sub, subscribe: async () => sub } };
  try { navigator.serviceWorker.getRegistration = async () => reg; } catch (e) {}
  try { Object.defineProperty(window, "Notification", { configurable: true, value: { permission: "granted", requestPermission: async () => "granted" } }); } catch (e) {}
  window.__push = box;
})();`;
async function alertCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/dash41/" + x;
  await withDriver(ctx, { name: "dash41-expired", lang, init: FAKE_PUSH }, async (d, stubs) => {
    await d.settle(400);
    const before = await d.page.evaluate(() => window.__push.unsubscribed);
    stubs.setRefusal({ method: "GET", path: /^\/api\/issues/, status: 401, code: "auth.tokenExpired", error: lang === "es" ? "Su sesi\u00f3n venci\u00f3" : "Your session expired", once: true });
    await d.goto("issues");
    await d.settle(800);
    const out = await d.signedOut();
    const after = await d.page.evaluate(() => window.__push.unsubscribed);
    results.check(KIND, id("a-session-that-ends-lets-the-alerts-go"), out && before === 0 && after === 1, !out ? "the 401 did not end the session" : "the session ended and this computer's subscription was " + (after > before ? "let go" : "kept for the next person"));
  });
  await withDriver(ctx, { name: "dash41-repost", lang, init: FAKE_PUSH, arm: (s) => s.setRefusal({ method: "POST", path: "/api/push/subscriptions", status: 503, code: "common.serverError", error: "Service unavailable", once: true }) }, async (d) => {
    await d.settle(600);
    const after = await d.page.evaluate(() => window.__push.unsubscribed);
    results.check(KIND, id("alerts-that-cannot-move-are-let-go"), after === 1, "the subscription could not move to the person now signed in and was kept, still the last person's");
  });
  // A stored session the API refuses when the dashboard is opened again ended by itself too.
  await withDriver(ctx, { name: "dash41-refused-at-load", lang, init: FAKE_PUSH }, async (d, stubs) => {
    await d.settle(400);
    stubs.setRefusal({ method: "GET", path: "/api/auth/me", status: 401, code: "auth.tokenExpired", error: lang === "es" ? "Su sesi\u00f3n venci\u00f3" : "Your session expired", once: true });
    await d.page.reload({ waitUntil: "domcontentloaded" });
    await d.page.getByText(d.say("Admin Dashboard")).first().waitFor({ timeout: 20000 }).catch(() => {});
    await d.settle(600);
    const after = await d.page.evaluate(() => window.__push.unsubscribed);
    results.check(KIND, id("a-stored-session-refused-at-load-lets-the-alerts-go"), (await d.signedOut()) && after === 1, "the stored session was refused when the dashboard opened, and this computer's subscription was kept");
  });
  // Opened again on a session it keeps, the dashboard sends nothing before the session is read back:
  // a call with no token is answered 401, which reads as a session that ended.
  await withDriver(ctx, { name: "dash41-reload", lang, init: FAKE_PUSH }, async (d) => {
    await d.settle(400);
    const bare = [];
    d.page.on("request", (r) => { const u = new URL(r.url()); if (u.pathname.indexOf("/api/") === 0 && u.pathname !== "/api/auth/me" && !r.headers().authorization) bare.push(r.method() + " " + u.pathname); });
    await d.reload();
    await d.settle(600);
    const after = await d.page.evaluate(() => window.__push.unsubscribed);
    results.check(KIND, id("a-reload-sends-no-call-without-the-token"), bare.length === 0 && after === 0, bare.length ? "the dashboard sent " + bare.join(", ") + " with no token while the session was read back" : "a reload let this computer's alerts go");
  });
  await withDriver(ctx, { name: "dash41-moved", lang, init: FAKE_PUSH }, async (d) => {
    await d.settle(600);
    const moved = d.callsSince(0).some((c) => c.method === "POST" && c.path === "/api/push/subscriptions");
    const after = await d.page.evaluate(() => window.__push.unsubscribed);
    results.check(KIND, id("guard-alerts-that-move-are-kept"), moved && after === 0, !moved ? "the subscription was not posted under the person signed in" : "a subscription that moved was let go");
  });
}

// ---- DASH-45: a cell read as a formula -----------------------------------------------------------------------------
const FORMULA = "=HYPERLINK(\"https://example.invalid\",\"Open\")";
async function csvCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/dash45/" + x;
  await withDriver(ctx, { name: "dash45-issues", lang, arm: (s) => { const rows = JSON.parse(JSON.stringify(seed.ISSUES)); rows.unshift(Object.assign({}, rows[0], { id: "i-366", title: FORMULA, reported_by_name: "@Riley Okafor", zone: "-2 dock" })); s.setIssues(rows); } }, async (d) => {
    await d.goto("reports");
    await d.settle(500);
    await d.clearCaptures();
    await d.clickText(d.say("Issues Report"), { exact: false });
    await d.settle(700);
    const file = (await d.downloads()).find((x) => /\.csv$/.test(x.name));
    const body = file ? file.body : "";
    const line = body.split("\n").find((l) => l.indexOf("HYPERLINK") >= 0) || "";
    results.check(KIND, id("issues-report-writes-a-formula-as-text"), line.indexOf("\"'=HYPERLINK(") === 0 && line.indexOf("\"'@Riley Okafor\"") >= 0 && line.indexOf("\"'-2 dock\"") >= 0,
      !file ? "Issues Report handed over no file" : "the row reads " + say(line.slice(0, 160)));
    const plain = body.split("\n").find((l) => l.indexOf("Lobby floor scuffed after delivery") >= 0) || "";
    results.check(KIND, id("guard-a-plain-cell-is-unchanged"), plain.indexOf("\"Lobby floor scuffed after delivery\"") === 0, "a plain row reads " + say(plain.slice(0, 120)));
  });
  await withDriver(ctx, { name: "dash45-timeline", lang, arm: (s) => s.setTimeline([
    { id: "tl-366", createdAt: seed.shift(-1) + "T14:05:00Z", actionType: "issue_reported", actorName: "+Tomasz Wisniewski", description: "=1+2 spilled in the lobby", entityType: "issue", entityId: "i-1", metadata: {} },
  ]) }, async (d) => {
    await d.goto("staff");
    await d.clickRow(0);
    await d.settle(500);
    await d.clickText(d.say("Timeline"), { exact: true }).catch(() => false);
    await d.settle(500);
    await d.clearCaptures();
    await d.clickText(d.say("Export CSV"), { exact: false }).catch(() => false);
    await d.settle(400);
    const file = (await d.downloads()).find((x) => /\.csv$/.test(x.name));
    const line = file ? (file.body.split("\n")[1] || "") : "";
    results.check(KIND, id("timeline-export-writes-a-formula-as-text"), line.indexOf("\"'=1+2 spilled in the lobby\"") >= 0 && line.indexOf("\"'+Tomasz Wisniewski\"") >= 0,
      !file ? "Export CSV handed over no file" : "the row reads " + say(line.slice(0, 160)));
  });
}

async function run(ctx) {
  const pick = (name) => !ctx.only || ctx.only.test(name);
  for (const lang of LANGS) {
    if (pick("guide")) guideCases(ctx, lang);
    if (pick("dash20")) await capabilityCases(ctx, lang);
    if (pick("dash24")) await backdropCases(ctx, lang);
    if (pick("dash26")) await disciplineCases(ctx, lang);
    if (pick("dash30")) await employmentCases(ctx, lang);
    if (pick("dash31")) await networkCases(ctx, lang);
    if (pick("dash32")) await phoneCases(ctx, lang);
    if (pick("dash33")) await scheduleCases(ctx, lang);
    if (pick("dash34")) await timeOffCases(ctx, lang);
    if (pick("dash35")) await pickupCases(ctx, lang);
    if (pick("dash36")) await hrWindowCases(ctx, lang);
    if (pick("dash41")) await alertCases(ctx, lang);
    if (pick("dash45")) await csvCases(ctx, lang);
  }
}

module.exports = { run };
