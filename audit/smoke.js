// npm run smoke: the dashboard's quick check, run on every build (Step 245).
//
// It serves the build/ that npm run build already made, and stops at once when anything in src,
// public or package.json is newer than that build, since a check of a stale bundle proves nothing.
// It signs in against the audit's own stub, with the audit's server, browser and driver, and checks
// what a broken build breaks first:
//   - at 1280 in English and in Spanish, and at 390 in English, an admin signs in (the Spanish pass
//     with the stub answering secondStep, so the code screen is on the way in);
//   - at 1280 in English and in Spanish and at 390 in English, first, a wrong PIN on the sign-in card
//     reads the words the API sent with its 401, never Session expired, the card stays and nothing
//     fires ocsa-session-expired; the Spanish pass then types a wrong code on the code screen, which
//     reads the API's words and the tries left under the box the same way;
//   - against the stub's answers for the API's Step 283 (Step 284), in those three passes: a text that
//     matches nobody is refused five times and the sixth try reads the lock's words with its minutes
//     and the line that sign-in stops for a while; Enter pressed twice sends one sign-in; through the
//     code screen with Remember this device off nothing is left in localStorage; a 403
//     auth.mustSetPin from a screen draws Choose your PIN alone, through a reload, refuses two
//     different PINs and the given one in the API's words, and sends a PIN of the person's own once;
//     Unlock posts and the list reads the person unlocked; and, with Step 278's answers, the chat
//     records search reads its count and its log, a project's Message Board card names its latest
//     post, a quote's Workload plan card lists its current plan, and the matrix reads Current and Due
//     soon;
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
//   - against the stub's answers for the API's Step 280 (Step 282), at 1280 in English and in Spanish
//     and at 390 in English: the Requests tab says how many items a request holds and names the
//     first; a three-item request has one item approved at 3 of 5, one denied with a note and the
//     third approved by Approve all, each sent as the items it decides, and then reads approved in
//     its window and in the list; and Download for ordering saves the two approved items as a CSV.
//   - against the stub's answers for the API's Step 289 contract (Step 291), which the smoke check arms
//     with setStep289, at 1280 in English and in Spanish and at 390 in English: Sites opens on the list
//     with Add Site and the first site in its first screen and its plan on the row; a site's Service
//     Details tab draws its own periodic work above its tasks; Quality, Periodic work lists every site's
//     and a row opens a site's checklist; Open HR file on a profile with no HR Files or Certifications
//     tab lands on the folder, which draws every record the folder answer holds and the person's
//     certifications; Schedule Shift asks for the Site first, lists the site's people and everyone else
//     under two headings whatever the page's own search holds, and finds an admin by typing; Open a
//     case finds a person by badge number and another by employee ID, each the only one offered, and
//     sends both; a ticket is moved to Done with a note, the person who sent it is told in their
//     language, and Export holds it with the note; App support contact draws the API's refusal under
//     Email and then saves; the signed acknowledgment page reads its document and Signed in Spanish in
//     the person's folder; and a PTO request reads PTO (paid time off) and is approved.
//   - against the stub's answers for the API's Step 299 contract (Step 300, the case log), which the
//     smoke check arms with setStep299, at 1280 in English and in Spanish and at 390 in English: a case
//     opens with its log in the order the API gives it, Happened, who a call was with, Corrected below
//     and a correction pointing back, and no Resolution notes box; a conversation is added with a person
//     picked in the searchable picker and a PDF, sent as a data URL, and drawn last with its author, its
//     time, who it was with and the file, which opens behind the token; Correct this adds a correction
//     of the first entry, which then says Corrected below; Resolved asks for the closing note, refuses
//     to save without it and sends closing_note, which the log draws as the closing entry; and Print
//     case prints every entry with its text and its files by name.
//   - against the stub's answers for the API's Step 292 contract (Step 293, the welcome email), which
//     the smoke check arms with setStep292, at 1280 in English and in Spanish and at 390 in English:
//     Add Staff says "Welcome email sent to" the address with the PIN still hidden behind Show; a
//     placeholder address draws the API's reason; the profile's Send it again asks first and then
//     sends; Send welcome email is disabled with No working email; a rehire's toast says the welcome
//     email went; and the list says when it went for someone who has never signed in. At 1280 in
//     English, Schedule inspection's Assigned Supervisor leaves out a supervisor who has left.
//   - against the stub's answers for the API's Step 305 contract (Step 306, the Library), which the
//     smoke check arms with setStep305, at 1280 in English and in Spanish and at 390 in English: the
//     Library lists every document by folder with Also in Spanish on the ones with a Spanish edition; a
//     search by a word in a section's text sends q and opens the document at that section; the reader
//     draws the cover, Contents by Part, every section and the table, and no signature box; See the
//     designed version opens the PDF behind the token; Help's answer about a document draws Open, which
//     opens it in the Library; and an empty list says the library is loading.
//   - against the stub's answers for the API's Step 308 contract (Step 309, supply orders), which the
//     smoke check arms with setStep308 over Step 280's requests, at 1280 in English and in Spanish and
//     at 390 in English: a holder decides a request and signs it with an approved vendor whose details
//     fill in and the site's address in Deliver to; the purchase order opens behind the token; Send
//     emails the vendor, the request reads Ordered with its date and the list its PO number and Ordered,
//     and Send again sends once more and keeps the date; an admin without the capability reads a
//     request with no decision controls and downloads the ordering CSV; and with no approved vendor,
//     Sign and order says to add one under Vendors.
//   - against the stub's answers for the API's Step 312 contract (Step 314, one inspection walk), which
//     the smoke check arms with setStep312, at 1280 in English and in Spanish and at 390 in English:
//     Schedule Inspection offers Include the safety walk, on, and sends withSafety true, and unticked
//     sends false; a completed walk's result says the safety walk was included and shows its safety part,
//     read from the OCSA-FRM-015 record itself, with its answers, findings and result; and Open the
//     safety inspection record opens that record under Forms, whose Open the inspection opens the
//     inspection again by its address.
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
  { name: "1280 en admin", viewport: "wide", lang: "en", who: "admin", wrongSignIn: true, step283: true, step248: true, step250: true, requestChecks: true, step253: true, step256: "all", step262: "all", step266: "all", step270: "all", step269: "all", step275: "all", step278: true, step280: true, step291: true, step300: true, step293: true, step306: true, step309: true, step314: true },
  { name: "1280 es admin", viewport: "wide", lang: "es", who: "admin", secondStep: true, wrongSignIn: true, step283: true, step248: true, step250: true, step256: "all", step262: "all", step266: "all", step270: "all", step269: "all", step275: "all", step278: true, step280: true, step291: true, step300: true, step293: true, step306: true, step309: true, step314: true },
  { name: "390 en admin", viewport: "phone", lang: "en", who: "admin", wrongSignIn: true, step283: true, step256: "phone", step262: "phone", step266: "phone", step270: "phone", step269: "phone", step275: "phone", step280: true, step291: true, step300: true, step293: true, step306: true, step309: true, step314: true },
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
      // Any code but the one signIn types is a wrong one, a 400 auth.codeWrong in the screen's language
      // with the tries left, the way helpers/secondStep.js answers it.
      if (!req.body || req.body.code !== SMOKE_CODE) {
        const es = ((req.headers && req.headers["accept-language"]) || "") === "es";
        return { status: 400, json: { error: es ? "Ese c\u00f3digo no es correcto. Revise el correo m\u00e1s reciente e intente de nuevo." : "That code is not right. Check the latest email and try again.", code: "auth.codeWrong", attemptsLeft: 4 } };
      }
      return held;
    }
    return orig(req);
  };
}

// The two sign-in calls whose 401 is the person's answer turned down rather than a session that has
// ended, and what the stub answered each, kept as it was sent so a check reads the screen against the
// API's own words. Every sign-in answer is kept in order as well, so a check can count them.
const SIGN_IN_PATHS = ["/api/auth/login", "/api/auth/second-step"];
function keepSignIn(stubs) {
  const orig = stubs.handle;
  const kept = { logins: [] };
  stubs.handle = (req) => {
    const a = orig(req);
    const path = new URL(req.url).pathname;
    if (req.method === "POST" && SIGN_IN_PATHS.indexOf(path) >= 0) kept[path] = a;
    if (req.method === "POST" && path === "/api/auth/login") kept.logins.push(a);
    return a;
  };
  return kept;
}
const stubs283Calls = (kept) => kept.logins;
// A badge number nobody holds, which the lock line types (Step 284).
const NOBODY_283 = "7777";

// A wrong PIN on the sign-in card reads the words the API sent with its 401, never Session expired, in
// the screen's language; the card stays and nothing fires ocsa-session-expired. With the code screen
// armed, a wrong code then reads the API's words and the tries left under the box the same way, and
// Back returns to the PIN for signIn.
async function wrongSignIn(d, p, kept) {
  const who = seed.PEOPLE[p.who];
  const expired = [d.say("Session expired"), "Session expired"];
  const fired = () => d.page.evaluate(() => window.__smokeExpired || 0);
  const sent = (path) => { const a = kept[path]; return a && (a.status === 401 || a.status === 400) && a.json && a.json.error ? a.json.error : null; };
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
      // Since Step 284 the card draws a refusal itself, in place of a toast.
      await until(d, "[data-signin-notice]");
      const shown = ((await d.page.locator("[data-signin-notice]").first().innerText()) || "").trim();
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
  // Step 284, against the API's Step 283: a typed text that matches nobody is refused five times, the
  // card adds that sign-in stops for a while from the third, and the sixth try reads the lock's words
  // with its minutes. Nobody the run signs in as is locked by it.
  if (p.step283) {
    const mark = d.pageErrors.length;
    let why = "";
    try {
      const inputs = d.page.locator("input");
      // Each try waits for the card to read that try's own answer.
      const reads = (w) => d.page.waitForFunction((x) => { const el = document.querySelector("[data-signin-notice]"); return !!el && el.innerText.trim() === x; }, w, { timeout: 4000 }).then(() => true, () => false);
      let drawn = true;
      for (let i = 0; i < 6 && drawn; i++) {
        const before = stubs283Calls(kept).length;
        await inputs.nth(0).fill(NOBODY_283);
        await inputs.nth(1).fill("9999");
        await signInButton().click();
        for (let w = 0; w < 80 && stubs283Calls(kept).length === before; w++) await wait(50);
        const a = stubs283Calls(kept)[before];
        drawn = !!(a && a.json && a.json.error) && (await reads(a.json.error));
      }
      const last = kept["/api/auth/login"];
      const words = ((await d.page.locator("[data-signin-notice]").first().innerText()) || "").trim();
      why = !drawn ? "a try did not read the API's words: " + words
        : !last || last.status !== 429 || !last.json ? "the sixth try was not refused as locked"
        : words !== last.json.error ? "reads " + words + ", the API sent " + last.json.error
        : !/\d/.test(words) ? "the lock's words carry no minutes"
        : (await d.page.locator("[data-signin-lock-hint]").count()) === 0 ? "no line that sign-in stops for a while"
        : (await fired()) ? "fired ocsa-session-expired"
        : await trouble(d, mark);
    } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, "a lock reads the API's words, with the line that sign-in stops", why);
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
      why = !words ? "the stub did not refuse the code"
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

// opts.enter presses Enter twice in the PIN box in place of the button (Step 284), and
// opts.rememberOff unticks Remember this device on the code screen before the code is typed.
async function signIn(d, who, opts = {}) {
  const p = seed.PEOPLE[who];
  await d.page.locator("input").nth(1).waitFor({ timeout: 20000 });
  const inputs = d.page.locator("input");
  await inputs.nth(0).fill(p.login.phone);
  await inputs.nth(1).fill(p.login.pin);
  if (opts.enter) { await inputs.nth(1).focus(); await d.page.keyboard.press("Enter"); await d.page.keyboard.press("Enter"); }
  else await d.page.getByRole("button", { name: d.say("Sign In") }).or(d.page.getByRole("button", { name: "Sign In" })).first().click();
  let sawCode = false;
  for (let i = 0; i < 80; i++) {
    if (!(await d.signedOut())) return { sawCode };
    if (!sawCode && (await d.page.locator("[data-second-code]").count()) > 0) {
      sawCode = true;
      if (opts.rememberOff) await d.page.locator('[data-second-step] input[type="checkbox"]').uncheck();
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
    // Since Step 291 the trainer is picked in the searchable picker.
    await d.page.locator('[data-session-field="trainerId"] [data-person-pick-field]').click();
    await d.page.locator('[data-session-field="trainerId"] [data-person-pick-option="' + seed.PEOPLE.supervisor.id + '"]').click();
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

// Step 284's sign-in lines once signed in, against the stub armed with setStep283 (audit/stubs.js): a
// 403 auth.mustSetPin from a screen draws Choose your PIN and nothing else, a reload lands back on it,
// two different PINs and the PIN the office gave are refused, the second in the API's words, and a
// PIN of the person's own is sent once as newPin and opens the dashboard; and, for the admin, Unlock
// on a locked person posts and the list reads them unlocked.
const LOCKED_283 = "u-staff-5";
const CHOSEN_PIN_283 = "4826";
async function step283(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  const pinCalls = () => stubs.calls.filter((c) => c.path === "/api/auth/change-pin" && c.method === "POST");
  const fillPins = async (a, b) => { await d.page.locator("[data-choose-pin-new]").fill(a); await d.page.locator("[data-choose-pin-again]").fill(b); await d.page.locator("[data-choose-pin-save]").click(); };
  const refusalReads = (w) => d.page.waitForFunction((x) => { const el = document.querySelector("[data-choose-pin-refusal]"); return !!el && el.innerText.trim() === x; }, w, { timeout: 4000 }).then(() => true, () => false);
  await check("a 403 auth.mustSetPin lands on Choose your PIN, alone, through a reload, until a PIN of their own is saved", async () => {
    stubs.setMustSetPin(p.who, true);
    try {
      await go(d, "sites");
      await until(d, "[data-choose-pin]");
      if (!(await d.signedOut())) return "the dashboard is still drawn beside Choose your PIN";
      await d.page.reload({ waitUntil: "domcontentloaded" });
      await until(d, "[data-choose-pin]");
      if (!(await d.signedOut())) return "after a reload the dashboard is drawn beside Choose your PIN";
      const before = pinCalls().length;
      await fillPins(CHOSEN_PIN_283, "4862");
      if (!(await refusalReads(d.say("Type the same PIN twice.")))) return "two different PINs are not refused";
      if (pinCalls().length !== before) return "two different PINs were sent";
      await fillPins(seed.PEOPLE[p.who].login.pin, seed.PEOPLE[p.who].login.pin);
      for (let w = 0; w < 40 && pinCalls().length === before; w++) await wait(50);
      const given = pinCalls()[before];
      if (!given || given.status !== 400 || !(await refusalReads(given.json.error))) return "the PIN the office gave is not refused in the API's words";
      await fillPins(CHOSEN_PIN_283, CHOSEN_PIN_283);
      for (let w = 0; w < 80 && (await d.signedOut()); w++) await wait(100);
      if (await d.signedOut()) return "the dashboard did not open after Save";
      const sent = pinCalls()[before + 1];
      if (!sent || pinCalls().length !== before + 2 || JSON.stringify(sent.body) !== JSON.stringify({ newPin: CHOSEN_PIN_283 })) return "the PIN was sent as " + JSON.stringify(sent && sent.body);
      return (await d.page.locator("[data-choose-pin]").count()) === 0 ? "" : "Choose your PIN is still drawn";
    } finally { stubs.setMustSetPin(p.who, false); }
  });
  if (p.who === "admin") await check("Unlock on a locked person posts and the list reads them unlocked", async () => {
    await go(d, "staff", null, '[data-staff-unlock="' + LOCKED_283 + '"]');
    await d.page.locator('[data-staff-unlock="' + LOCKED_283 + '"]').first().click();
    await d.page.locator('[data-staff-unlock="' + LOCKED_283 + '"]').first().waitFor({ state: "detached" });
    const call = stubs.calls.filter((c) => c.path === "/api/users/" + LOCKED_283 + "/unlock" && c.method === "POST").pop();
    if (!call || call.status !== 200) return "the unlock was not sent";
    return (await d.page.locator('[data-sign-in-state~="locked"]').count()) === 0 ? "" : "someone still reads Locked until";
  });
}

// Step 284's screens that Step 278 found broken, against the stub's Step 278 answers, which the API
// gives (audit/pictures-stub.js), armed with a reload so the capabilities they ask for are read: the
// chat records search reads its count and its record of searches, a project's Message Board card
// names its latest post, a quote's Workload plan card lists its current plan, and the training matrix
// reads Current and Due soon as Gaps does.
async function step284Screens(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  stubs.setStep278(true);
  await d.page.reload({ waitUntil: "domcontentloaded" });
  for (let i = 0; i < 80 && (await d.signedOut()); i++) await wait(250);
  await check("the chat records search reads its count and the searches recorded", async () => {
    await go(d, "chat-records", null, "[data-records-search]");
    await d.page.locator("[data-records-search]").click();
    await until(d, "[data-records-count]");
    const call = stubs.calls.filter((c) => c.path === "/api/chat/records").pop();
    const shown = await d.page.locator("[data-records-count]").getAttribute("data-records-count");
    if (!call || !call.json || String(call.json.count) !== shown || !call.json.count) return "the count reads " + shown;
    if ((await d.page.locator("[data-records-result] table tbody tr").count()) !== call.json.count) return "the table does not hold every record";
    await until(d, "[data-records-log] > div");
    return stubs.calls.some((c) => c.path === "/api/chat/records/log") ? "" : "the searches were not read from their log";
  });
  await check("a project's Message Board card names its latest post", async () => {
    await go(d, "workspace", ["wp-1"], '[data-tool-card="posts"]');
    const call = stubs.calls.filter((c) => c.path === "/api/workspace/projects/wp-1").pop();
    const post = call && call.json && call.json.project && call.json.project.latest && call.json.project.latest.post;
    if (!post) return "the project's answer carries no latest post";
    const text = (await d.page.locator('[data-tool-card="posts"]').innerText()) || "";
    return text.indexOf(post.title) >= 0 ? "" : "the card does not name " + post.title;
  });
  await check("a quote's Workload plan card lists its current plan", async () => {
    await go(d, "quotes", ["qt-9"], '[data-quote-plans] [data-quote-plan="current"]');
    return "";
  });
  await check("the matrix reads Current and Due soon, as Gaps does", async () => {
    await go(d, "training", ["matrix"], '[data-matrix-legend-item="current"]');
    const cur = ((await d.page.locator('[data-matrix-legend-item="current"]').innerText()) || "").trim();
    const soon = ((await d.page.locator('[data-matrix-legend-item="dueSoon"]').innerText()) || "").trim();
    return cur === d.say("Current|training") && soon === d.say("Due soon|training") ? "" : "the legend reads " + cur + " and " + soon;
  });
}

// Step 282's supply requests with many items, against the stub armed with setStep280 (audit/stubs.js):
// the stub lists a three-line refill first, the list says how many items it holds and names the
// first, one line is approved at 3 of 5, one denied with a note and the third by Approve all, each
// sent as the lines it decides, and the request then reads approved in the window and the list.
// Download for ordering then saves the approved lines for the dates and the site chosen.
const REQUEST_280 = { id: "sr-4", first: "Can liner 40x46" };
const DENY_NOTE_280 = { en: "Use the soap already at the site.", es: "Use el jab\u00f3n que ya est\u00e1 en el sitio." };
async function step280(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await recover(d, origin, p);
  };
  const decided = () => stubs.calls.filter((c) => c.path === "/api/supplies/requests/" + REQUEST_280.id + "/decide" && c.method === "POST");
  const sent = (call) => JSON.stringify(call ? call.body && call.body.items : null);
  const fill = (key, ...v) => v.reduce((t0, x, i) => t0.split("{" + i + "}").join(String(x)), d.say(key));
  const line = (n) => d.page.locator('[data-request-line="' + REQUEST_280.id + "-" + n + '"]');
  const lineIs = (n, decision) => until(d, '[data-request-line="' + REQUEST_280.id + "-" + n + '"][data-request-line-decision="' + decision + '"]');
  const requestsTab = async (ready) => {
    await go(d, "supplies", null, '[data-supplies-tab="requests"]');
    await d.page.locator('[data-supplies-tab="requests"]').click();
    await until(d, ready);
  };
  const saved = async (name) => { await d.page.waitForFunction((x) => window.__audit.downloads.some((y) => y.name === x), name); return true; };
  await check("a three-item request is decided a line at a time and by Approve all, and reads approved", async () => {
    await requestsTab('[data-request-open="' + REQUEST_280.id + '"]');
    // The stub lists the three-line request first.
    const count = await d.page.locator("[data-request-lines]").first().getAttribute("data-request-lines");
    const first = (await d.page.locator("[data-request-first]").first().innerText()).trim();
    if (count !== "3" || first !== REQUEST_280.first) return "the list reads " + count + " items, the first " + first;
    await d.page.locator('[data-request-open="' + REQUEST_280.id + '"]').click();
    await until(d, '[data-request-window="' + REQUEST_280.id + '"]');
    if ((await d.page.locator("[data-request-window] [data-request-line]").count()) !== 3) return "the window does not hold three lines";
    const before = decided().length;
    await line(1).locator("[data-request-line-qty]").fill("3");
    await line(1).locator("[data-request-line-approve]").click();
    await lineIs(1, "approved");
    if (sent(decided()[before]) !== JSON.stringify([{ id: REQUEST_280.id + "-1", decision: "approved", approvedQuantity: 3 }])) return "the first line was sent as " + sent(decided()[before]);
    const said = (await line(1).locator("[data-request-line-said]").innerText()).trim();
    if (said.indexOf(fill("Approved {0} of {1}", 3, 5)) < 0) return "the first line reads " + said;
    await line(2).locator("[data-request-line-note]").fill(DENY_NOTE_280[p.lang]);
    await line(2).locator("[data-request-line-deny]").click();
    await lineIs(2, "denied");
    if (sent(decided()[before + 1]) !== JSON.stringify([{ id: REQUEST_280.id + "-2", decision: "denied", note: DENY_NOTE_280[p.lang] }])) return "the second line was sent as " + sent(decided()[before + 1]);
    if ((await line(2).locator("[data-request-line-said-note]").innerText()).indexOf(DENY_NOTE_280[p.lang]) < 0) return "the denied line does not read its note";
    if ((await d.page.locator('[data-request-window] [data-request-status="pending"]').count()) !== 1) return "the request is not pending with a line still undecided";
    await d.page.locator("[data-request-approve-all]").click();
    await until(d, '[data-request-window] [data-request-status="approved"]');
    if (sent(decided()[before + 2]) !== JSON.stringify([{ id: REQUEST_280.id + "-3", decision: "approved", approvedQuantity: 2 }])) return "Approve all was sent as " + sent(decided()[before + 2]);
    if ((await line(3).getAttribute("data-request-line-decision")) !== "approved") return "the third line is not approved";
    if ((await d.page.locator("[data-request-approve-all], [data-request-deny-all]").count()) !== 0) return "Approve all and Deny all are offered with every line decided";
    await d.page.locator('[data-request-window="' + REQUEST_280.id + '"] button[aria-label="' + d.say("Close") + '"]').click();
    await d.page.locator("[data-request-window]").waitFor({ state: "detached" });
    const state = await d.page.locator("[data-request-state]").first().getAttribute("data-request-state");
    return state === "approved" ? "" : "the list reads " + state;
  });
  await check("Download for ordering saves the approved items as a CSV", async () => {
    await requestsTab("[data-ordering-download]");
    const from = await d.page.locator("[data-ordering-from]").inputValue();
    const to = await d.page.locator("[data-ordering-to]").inputValue();
    const name = "supplies-for-ordering-" + from + "-to-" + to + ".csv";
    await d.page.locator("[data-ordering-download]").click();
    await saved(name);
    const call = stubs.calls.filter((c) => c.path === "/api/supplies/requests/approved.csv").pop();
    if (!call || call.status !== 200 || call.query.indexOf("from=" + from) < 0 || call.query.indexOf("to=" + to) < 0) return "the CSV was not asked for with the dates shown";
    const file = (await d.downloads()).filter((x) => x.name === name).pop();
    const rows = String(file ? file.body : "").replace(/^\ufeff/, "").trim().split(/\r?\n/);
    // The header and the two lines approved above, at 3 and at 2.
    if (rows.length !== 3 || rows[1].indexOf("Can liner 40x46") < 0 || rows[1].indexOf(",3,") < 0 || rows[2].indexOf("Microfiber cloth pack") < 0 || rows[2].indexOf(",2,") < 0) return "the CSV holds " + JSON.stringify(rows);
    return "";
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

// Step 291's screens (STEP289_CONTRACT.md section 3), each a line, against the stub armed with
// setStep289 (audit/stubs.js): Sites opening on the list, a site's periodic work and Quality's, Open
// HR file landing on the folder with what the profile's HR Files and Certifications tabs held,
// Schedule Shift asking for the Site first and finding an office account by typing, Open a case's
// pickers narrowed by a badge number and an employee ID, a ticket moved to Done with a note and
// exported, the support contact saved, the signed page in a folder and a PTO request decided. Every
// line waits for what it reads.
const CASE_291 = { about: "u-staff-6", badge: "4115", behalf: "u-staff-7", employeeId: "EMP-1007" };
const OFFICE_291 = { id: "u-admin-1", typed: "Whitlock" };
const TICKET_291 = { id: "tk-1", to: "u-staff-6", locale: "es", description: "When I press Send on the time off screen nothing happens." };
const TICKET_NOTE_291 = { en: "Fixed in today's portal update.", es: "Se arregl\u00f3 en la actualizaci\u00f3n de hoy del portal." };
const CONTACT_291 = { name: "Morgan Reyes", email: "help.desk@example.invalid" };
// A person picked in the searchable picker inside within, by what is typed, and checked to be the only
// one offered when only is set.
async function pickPerson291(d, within, id, typed, only) {
  // within may name the picker itself, which carries the attributes a screen gives it, or a part around it.
  const box = d.page.locator(within + "[data-person-pick], " + within + " [data-person-pick]").first();
  await box.locator("[data-person-pick-field]").click();
  await box.locator("[data-person-pick-search]").fill(typed);
  const offered = await box.locator("[data-person-pick-option]").evaluateAll((els) => els.map((e) => e.getAttribute("data-person-pick-option")));
  await box.locator('[data-person-pick-option="' + id + '"]').click();
  if (only && (offered.length !== 1 || offered[0] !== id)) return "typing " + typed + " offered " + JSON.stringify(offered);
  return "";
}
async function step291(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await d.page.keyboard.press("Escape").catch(() => {});
    await recover(d, origin, p);
  };
  const fill = (key, ...v) => v.reduce((t0, x, i) => t0.split("{" + i + "}").join(String(x)), d.say(key));
  // Whether the first match sits inside the window's first screen of the page, wherever the window is
  // scrolled, since a page opened by its address keeps the scroll of the page before.
  const inView = async (sel) => {
    const b = await d.page.locator(sel).first().boundingBox();
    const at = await d.page.evaluate(() => ({ y: window.scrollY, h: window.innerHeight }));
    return !!b && b.y + at.y >= 0 && b.y + at.y + b.height <= at.h;
  };
  await check("Sites opens on the list, with Add Site and the first site in view", async () => {
    await go(d, "sites", null, "table tbody tr");
    if ((await d.page.getByRole("button", { name: d.say("Add Site") }).count()) === 0) return "no Add Site";
    if (!(await inView('button:has-text("' + d.say("Add Site") + '")'))) return "Add Site is not in view";
    if (!(await inView("table tbody tr"))) return "the first site is not in view";
    if ((await d.page.locator("[data-workload-plans], [data-periodic-work]").count()) > 0) return "the plans or periodic work still sit above the list";
    await until(d, "[data-site-plan]");
    return "";
  });
  await check("a site's Service Details tab draws its periodic work first", async () => {
    await go(d, "sites", [seed.SITES[0].id, "tasks"], "[data-site-periodic] table tbody tr");
    const read = stubs.calls.filter((c) => c.path === "/api/periodic-work" && c.query.indexOf("siteId=" + seed.SITES[0].id) >= 0).pop();
    if (!read || !read.json) return "the site's periodic work was not asked for by its siteId";
    const rows = await d.page.locator("[data-site-periodic] table tbody tr").count();
    if (rows !== read.json.items.length) return "it draws " + rows + " rows of " + read.json.items.length;
    const per = await d.page.locator("[data-site-periodic]").boundingBox();
    const tasks = await d.page.getByText(fill("Tasks ({0})", "").replace(/\(\)$/, ""), { exact: false }).last().boundingBox();
    return per && tasks && per.y < tasks.y ? "" : "the periodic work is not above the tasks";
  });
  await check("Quality, Periodic work lists every site's and a row opens the site's checklist", async () => {
    await openNav(d, "periodic");
    await until(d, "[data-periodic-work] table tbody tr");
    const read = stubs.calls.filter((c) => c.path === "/api/periodic-work" && c.query.indexOf("siteId=") < 0 && c.query.indexOf("state=") < 0).pop();
    const rows = await d.page.locator("[data-periodic-work] table tbody tr").count();
    if (!read || !read.json || rows !== read.json.items.length) return "it draws " + rows + " rows";
    await d.page.locator("[data-periodic-work] table tbody tr").first().click();
    await until(d, "[data-site-periodic]");
    return /#sites\/[^/]+\/tasks$/.test(await d.page.evaluate(() => window.location.hash)) ? "" : "the row did not open a site's checklist";
  });
  await check("Open HR file lands on the folder with every record the profile's HR tabs held", async () => {
    await go(d, "staff", [PROPERTY_PERSON], "[data-open-hr-file]");
    const tabs = await d.page.getByRole("button", { name: d.say("HR Files"), exact: true }).count() + await d.page.getByRole("button", { name: d.say("Certifications"), exact: true }).count();
    if (tabs) return "the profile still has HR Files or Certifications";
    await d.page.locator("[data-open-hr-file]").click();
    await until(d, "[data-folder-certifications]");
    await until(d, "[data-folder-training-items]");
    if ((await d.page.evaluate(() => window.location.hash)) !== "#hr/" + PROPERTY_PERSON) return "it opened " + (await d.page.evaluate(() => window.location.hash));
    const folder = stubs.calls.filter((c) => c.path === "/api/hr/employee-folder/" + PROPERTY_PERSON).pop();
    const profile = stubs.calls.filter((c) => c.path === "/api/users/profile/" + PROPERTY_PERSON).pop();
    if (!folder || !folder.json || !profile || !profile.json) return "the folder or the certifications were not read";
    const certs = await d.page.locator("[data-folder-certification]").count();
    if (certs !== profile.json.certifications.length) return certs + " certifications drawn of " + profile.json.certifications.length;
    const kinds = new Set(folder.json.items.map((x) => x.source));
    ["document", "training", "onboarding"].forEach((k) => { if (!kinds.has(k)) kinds.add("missing:" + k); });
    if ([...kinds].some((k) => /^missing:/.test(k))) return "the stub's folder lacks " + [...kinds].filter((k) => /^missing:/.test(k)).join(", ");
    const text = await d.page.locator("body").innerText();
    const lost = folder.json.items.filter((x) => x.title && text.indexOf(x.title) < 0).map((x) => x.title);
    return lost.length ? "the folder does not draw " + lost.join(", ") : "";
  });
  await check("Schedule Shift asks for the Site first and finds an office account by typing", async () => {
    await go(d, "schedule", null, 'input[placeholder="' + d.say("Search staff...") + '"]');
    // The page's own search narrows the grid to one person; the window's list is held to everyone.
    await d.page.locator('input[placeholder="' + d.say("Search staff...") + '"]').fill("Tomasz");
    await d.page.getByRole("button", { name: d.say("Schedule Shift") }).first().click();
    await until(d, "[data-schedule-shift-site]");
    const site = await d.page.locator("[data-schedule-shift-site]").boundingBox();
    const staff = await d.page.locator("[data-schedule-shift-staff]").boundingBox();
    if (!site || !staff || site.y >= staff.y) return "the Site is not above the Staff Member";
    await d.page.locator("[data-schedule-shift-site]").selectOption(seed.SITES[1].id);
    await d.page.locator("[data-schedule-shift-staff] [data-person-pick-field]").click();
    const groups = await d.page.locator("[data-schedule-shift-staff] [data-person-pick-group]").allInnerTexts();
    if (groups.length !== 2) return "the list has " + groups.length + " headings";
    const offered = await d.page.locator("[data-schedule-shift-staff] [data-person-pick-option]").count();
    if (offered < 3) return "the list holds " + offered + " rows, cut by the page's own search";
    await d.page.keyboard.press("Escape");
    const why = await pickPerson291(d, "[data-schedule-shift-staff]", OFFICE_291.id, OFFICE_291.typed, true);
    if (why) return why;
    const shown = (await d.page.locator("[data-schedule-shift-staff] [data-person-pick-field]").innerText()).trim();
    return shown.indexOf("Dana Whitlock") >= 0 ? "" : "the field reads " + shown;
  });
  await check("Open a case's pickers find a person by badge number and by employee ID", async () => {
    await go(d, "cases", null, "table tbody tr");
    await d.page.getByRole("button", { name: d.say("Open a case") }).first().click();
    await until(d, "[data-open-case]");
    await d.page.locator("[data-open-case] textarea").first().fill(p.lang === "es" ? "Un compa\u00f1ero se queda con el piso asignado." : "A coworker keeps taking the assigned floor.");
    const field = (label) => d.page.locator('[data-open-case] button[data-person-pick-field][aria-label="' + d.say(label) + '"]').locator("xpath=..");
    const pickBy = async (label, id, typed) => {
      const box = field(label);
      await box.locator("[data-person-pick-field]").click();
      await box.locator("[data-person-pick-search]").fill(typed);
      const offered = await box.locator("[data-person-pick-option]").evaluateAll((els) => els.map((e) => e.getAttribute("data-person-pick-option")));
      if (offered.length !== 1 || offered[0] !== id) return "typing " + typed + " under " + label + " offered " + JSON.stringify(offered);
      await box.locator('[data-person-pick-option="' + id + '"]').click();
      return "";
    };
    let why = await pickBy("About whom", CASE_291.about, CASE_291.badge);
    if (why) return why;
    await d.page.locator("[data-open-case]").getByRole("button", { name: d.say("Add"), exact: true }).click();
    why = await pickBy("On behalf of", CASE_291.behalf, CASE_291.employeeId);
    if (why) return why;
    await d.page.locator('[data-open-case] select[aria-label="' + d.say("Is this about someone in management?") + '"]').selectOption("no");
    const before = stubs.calls.filter((c) => c.path === "/api/hr-cases" && c.method === "POST").length;
    await d.page.locator("[data-open-case]").getByRole("button", { name: d.say("Open a case") }).last().click();
    for (let i = 0; i < 40 && stubs.calls.filter((c) => c.path === "/api/hr-cases" && c.method === "POST").length === before; i++) await wait(100);
    const sent = JSON.stringify((stubs.calls.filter((c) => c.path === "/api/hr-cases" && c.method === "POST").pop() || {}).body || null);
    return sent.indexOf(CASE_291.about) >= 0 && sent.indexOf(CASE_291.behalf) >= 0 ? "" : "the case was sent as " + sent;
  });
  await check("a ticket is moved to Done with a note, the person is told, and it is exported", async () => {
    await go(d, "tickets", null, '[data-ticket-state="new"]');
    await d.page.locator('[data-ticket-state="new"]').first().click();
    await until(d, '[data-ticket-window="' + TICKET_291.id + '"]');
    await d.page.locator('[data-ticket-status-choice="done"]').click();
    await d.page.locator("[data-ticket-note]").fill(TICKET_NOTE_291[p.lang]);
    await d.page.locator("[data-ticket-save]").click();
    await d.page.locator("[data-ticket-window]").waitFor({ state: "detached" });
    const patch = stubs.calls.filter((c) => c.method === "PATCH" && c.path === "/api/support/tickets/" + TICKET_291.id).pop();
    if (!patch || JSON.stringify(patch.body) !== JSON.stringify({ status: "done", statusNote: TICKET_NOTE_291[p.lang] })) return "the ticket was sent as " + JSON.stringify(patch && patch.body);
    const told = stubs.notified289().filter((x) => x.ticket === TICKET_291.id && x.to === TICKET_291.to && x.locale === TICKET_291.locale && x.status === "done");
    if (told.length !== 1) return "the person was told " + told.length + " times";
    await d.page.locator("[data-tickets] button").filter({ hasText: d.say("Done|ticket") }).first().click();
    await until(d, '[data-ticket-state="done"]');
    await d.page.locator("[data-tickets-export-open]").click();
    await until(d, "[data-tickets-export-text]");
    const text = await d.page.locator("[data-tickets-export-text]").inputValue();
    const want = [TICKET_291.description, TICKET_NOTE_291[p.lang], d.say("Done|ticket"), d.say("Something is not working")];
    const lost = want.filter((w) => text.indexOf(w) < 0);
    return lost.length ? "the export lacks " + lost.join(", ") : "";
  });
  await check("Settings, App support contact refuses an address that is not one and saves", async () => {
    await go(d, "settings", null, '[data-settings-tab="support"]');
    await d.page.locator('[data-settings-tab="support"]').click();
    await until(d, "[data-support-contact]");
    await d.page.locator("[data-support-contact-email]").fill("not an address");
    await d.page.locator("[data-support-contact-save]").click();
    await until(d, '[data-support-contact-refusal="email"]');
    const said = (await d.page.locator('[data-support-contact-refusal="email"]').innerText()).trim();
    const put = stubs.calls.filter((c) => c.method === "PUT" && c.path === "/api/settings/support-contact").pop();
    if (!put || !put.json || said !== put.json.error) return "the refusal reads " + said;
    await d.page.locator("[data-support-contact-name]").fill(CONTACT_291.name);
    await d.page.locator("[data-support-contact-email]").fill(CONTACT_291.email);
    await d.page.locator("[data-support-contact-save]").click();
    await d.page.locator('[data-support-contact-refusal="email"]').waitFor({ state: "detached" });
    const saved = stubs.calls.filter((c) => c.method === "PUT" && c.path === "/api/settings/support-contact").pop();
    return saved && saved.status === 200 && JSON.stringify(saved.body) === JSON.stringify(CONTACT_291) ? "" : "it was sent as " + JSON.stringify(saved && saved.body);
  });
  await check("the signed acknowledgment page is in the person's folder with the language signed", async () => {
    await go(d, "hr", [PROPERTY_PERSON], "[data-folder-signed-page]");
    const row = d.page.locator("[data-folder-signed-page]").first();
    const text = (await row.innerText()).trim();
    const lang = await row.getAttribute("data-folder-signed-language");
    const want = fill("Signed in {0}", d.say("Spanish"));
    return lang === "es" && text.indexOf("OCSA-HR-002 1.1") >= 0 && text.indexOf(want) >= 0 ? "" : "the row reads " + text;
  });
  await check("a PTO request reads PTO (paid time off) and is approved", async () => {
    await go(d, "schedule", null, 'input[placeholder="' + d.say("Search staff...") + '"]');
    await d.page.getByRole("button", { name: new RegExp("^" + d.say("Time off")) }).first().click();
    await until(d, '[data-time-off-type="pto"]');
    const word = (await d.page.locator('[data-time-off-type="pto"]').first().innerText()).trim();
    if (word !== d.say("PTO (paid time off)")) return "the list reads " + word;
    await d.page.locator('[data-time-off-type="pto"]').first().click();
    await until(d, 'div[style*="z-index: 500"] [data-time-off-type="pto"]');
    await d.page.getByRole("button", { name: d.say("Approve"), exact: true }).last().click();
    for (let i = 0; i < 40 && !stubs.calls.some((c) => c.path === "/api/time-off/to-pto/approve" && c.status === 200); i++) await wait(100);
    if (!stubs.calls.some((c) => c.path === "/api/time-off/to-pto/approve" && c.status === 200)) return "the approval was not sent";
    await d.page.getByText(d.say("Approved|request"), { exact: true }).first().waitFor();
    return "";
  });
}

// Step 300's case log (STEP299_CONTRACT.md section 2), each a line, against the stub armed with
// setStep299 (audit/stubs.js): a case opening with its log, a conversation added with a person and a
// PDF and then drawn with its author and time, Correct this adding a correction that points back,
// closing asking for the closing note, and Print case listing the whole log. Every line waits for what
// it reads.
const CASE_300 = "hc-1";
const WITH_300 = { id: "u-staff-6", typed: "Okonkwo" };
const SAID_300 = { en: "Went over the overnight rota with them at the start of the shift.", es: "Revis\u00f3 con la persona el turno de noche al empezar el turno." };
const FIXED_300 = { en: "The rota was read on the second day of the week.", es: "El turno se ley\u00f3 el segundo d\u00eda de la semana." };
const CLOSING_300 = { en: "Cover was added to the overnight shift and the reporter was told.", es: "Se agreg\u00f3 cobertura al turno de noche y se le avis\u00f3 a quien lo report\u00f3." };
const PDF_300 = { name: "rota-meeting.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n", "latin1") };
async function step300(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await d.page.keyboard.press("Escape").catch(() => {});
    await recover(d, origin, p);
  };
  const lang = p.lang === "es" ? "es" : "en";
  const openCase = async () => {
    await go(d, "cases", null, "table tbody tr");
    await d.page.locator("table tbody tr").first().click();
    await until(d, '[data-case-log-entry="cu-1"]');
  };
  const lastRead = () => stubs.calls.filter((c) => c.method === "GET" && (c.path === "/api/hr-cases/" + CASE_300 || c.path === "/api/hr-cases/" + CASE_300 + "/updates") && c.json && Array.isArray(c.json.updates)).pop();
  const drawnIds = () => d.page.locator("[data-case-log-entry]").evaluateAll((els) => els.map((e) => e.getAttribute("data-case-log-entry")));
  const added = () => stubs.calls.filter((c) => c.method === "POST" && c.path === "/api/hr-cases/" + CASE_300 + "/updates").pop();
  await check("a case opens with its log, oldest first, and no Resolution notes box", async () => {
    await openCase();
    const read = lastRead();
    if (!read) return "the case was not read with updates";
    const ids = await drawnIds();
    const want = read.json.updates.map((u) => u.id);
    if (ids.join() !== want.join()) return "it draws " + JSON.stringify(ids) + " of " + JSON.stringify(want);
    const call = '[data-case-log-entry="cu-2"]';
    if ((await d.page.locator(call + " [data-case-log-happened]").count()) !== 1) return "the call does not say when it happened";
    if ((await d.page.locator(call + " [data-case-log-with]").innerText()).indexOf("Night agency coordinator") < 0) return "the call does not say who it was with";
    if ((await d.page.locator(call + " [data-case-log-corrected]").count()) !== 1) return "the corrected call does not say Corrected below";
    if ((await d.page.locator('[data-case-log-entry="cu-4"] [data-case-log-correction-of="cu-2"]').count()) !== 1) return "the correction does not point back";
    if ((await d.page.locator('[data-case-log-entry="cu-1"]').innerText()).indexOf(d.say("Note")) < 0) return "the note's kind is not drawn in the screen's language";
    return (await d.page.getByText(d.say("Resolution notes"), { exact: true }).count()) ? "the Resolution notes box is still drawn" : "";
  });
  await check("a conversation added with a person and a PDF shows its author, its time and its file", async () => {
    await openCase();
    await d.page.locator("[data-case-update-kind]").selectOption("conversation");
    const why = await pickPerson291(d, "[data-case-update-with]", WITH_300.id, WITH_300.typed);
    if (why) return why;
    await d.page.locator("[data-case-update-body]").fill(SAID_300[lang]);
    await d.page.locator("[data-case-update-files]").setInputFiles(PDF_300);
    await until(d, "[data-case-update-file]");
    await d.page.locator("[data-case-update-add]").click();
    await until(d, '[data-case-log-kind="conversation"]');
    const post = added();
    if (!post || post.status !== 201) return "the update was not added";
    const b = post.body || {};
    if (b.kind !== "conversation" || b.withUserId !== WITH_300.id || b.body !== SAID_300[lang]) return "it sent " + JSON.stringify({ kind: b.kind, withUserId: b.withUserId });
    const att = (b.attachments || [])[0];
    if (!att || att.name !== PDF_300.name || String(att.dataUrl).indexOf("data:application/pdf;base64,") !== 0) return "the PDF was not sent as a data URL";
    const u = post.json.update;
    const entry = d.page.locator('[data-case-log-entry="' + u.id + '"]');
    await entry.waitFor();
    const author = await entry.locator("[data-case-log-author]").innerText();
    if (author !== u.createdBy.name) return "the author reads " + JSON.stringify(author);
    if (!(await entry.locator("[data-case-log-when]").innerText()).trim()) return "the time is not drawn";
    if ((await entry.locator("[data-case-log-with]").innerText()).indexOf(u.withUser.name) < 0) return "who it was with is not drawn";
    if ((await entry.locator("[data-case-log-file]").innerText()).trim() !== PDF_300.name) return "the file is not listed by its name";
    await entry.locator("[data-case-log-file]").click();
    const want = "/api/hr-cases/" + CASE_300 + "/updates/" + u.id + "/files/1";
    for (let i = 0; i < 20 && !stubs.calls.some((c) => c.path === want); i++) await wait(100);
    const got = stubs.calls.filter((c) => c.path === want).pop();
    if (!got || got.status !== 200 || !got.headers.authorization) return "the file was not opened behind the token";
    return (await drawnIds()).pop() === u.id ? "" : "the new entry is not last";
  });
  await check("Correct this adds a correction that points back to its entry", async () => {
    await openCase();
    await d.page.locator('[data-case-log-entry="cu-1"] [data-case-log-correct]').click();
    await until(d, '[data-case-update-correcting="cu-1"]');
    await d.page.locator("[data-case-update-body]").fill(FIXED_300[lang]);
    await d.page.locator("[data-case-update-add]").click();
    await until(d, '[data-case-log-correction-of="cu-1"]');
    const b = (added() || {}).body || {};
    if (b.kind !== "correction" || b.correctsId !== "cu-1") return "it sent " + JSON.stringify({ kind: b.kind, correctsId: b.correctsId });
    await until(d, '[data-case-log-entry="cu-1"] [data-case-log-corrected]');
    await d.page.locator('[data-case-log-correction-of="cu-1"]').last().click();
    return (await d.page.locator("[data-case-update-correcting]").count()) ? "the form stayed on the correction" : "";
  });
  await check("closing asks for the closing note and writes it as the log's last entry", async () => {
    await openCase();
    await d.page.locator("[data-case-status]").selectOption("resolved");
    await until(d, "[data-case-closing-note]");
    const before = stubs.calls.filter((c) => c.method === "PATCH" && c.path === "/api/hr-cases/" + CASE_300).length;
    await d.page.getByRole("button", { name: d.say("Save changes") }).click();
    await until(d, "[data-case-closing-refusal]");
    const said = await d.page.locator("[data-case-closing-refusal]").innerText();
    if (said !== d.say("Write the closing note.")) return "the refusal reads " + JSON.stringify(said);
    if (stubs.calls.filter((c) => c.method === "PATCH" && c.path === "/api/hr-cases/" + CASE_300).length !== before) return "it saved with no closing note";
    await d.page.locator("[data-case-closing-note]").fill(CLOSING_300[lang]);
    await d.page.getByRole("button", { name: d.say("Save changes") }).click();
    await until(d, '[data-case-log-kind="closed"]');
    const patch = stubs.calls.filter((c) => c.method === "PATCH" && c.path === "/api/hr-cases/" + CASE_300).pop();
    if (!patch || patch.body.status !== "resolved" || patch.body.closing_note !== CLOSING_300[lang]) return "it sent " + JSON.stringify(patch && patch.body);
    if ("resolution_notes" in patch.body) return "it still sends resolution_notes";
    const closed = await d.page.locator('[data-case-log-kind="closed"] [data-case-log-body]').innerText();
    return closed === CLOSING_300[lang] ? "" : "the closing entry reads " + JSON.stringify(closed);
  });
  await check("Print case lists the whole log with each entry's files", async () => {
    await openCase();
    const read = lastRead();
    const before = (await d.prints()).length;
    await d.page.locator("[data-case-print]").click();
    let prints = await d.prints();
    for (let i = 0; i < 30 && (prints.length <= before || !prints[prints.length - 1].html); i++) { await wait(100); prints = await d.prints(); }
    if (prints.length <= before) return "no window opened";
    const html = prints[prints.length - 1].html;
    const n = (html.match(/data-case-print-entry=/g) || []).length;
    if (n !== read.json.updates.length) return "it prints " + n + " entries of " + read.json.updates.length;
    const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const lost = read.json.updates.filter((u) => u.body && html.indexOf(esc(u.body)) < 0).map((u) => u.id);
    if (lost.length) return "it leaves out the text of " + lost.join(", ");
    const files = [].concat(...read.json.updates.map((u) => (u.attachments || []).map((a) => a.name)));
    const missing = files.filter((f) => html.indexOf(esc(f)) < 0);
    return missing.length ? "it does not list " + missing.join(", ") : "";
  });
}

// Step 293's welcome email (STEP292_CONTRACT.md section 2), each a line, against the stub armed with
// setStep292 (audit/stubs.js): Add Staff saying the welcome email went with the PIN still behind Show,
// a placeholder address drawing the API's reason, the profile's Send it again asking first, the button
// disabled on No working email, a rehire telling the welcome in its toast, and the welcome line in the
// list; and at 1280 in English, Schedule inspection's Assigned Supervisor leaving out a supervisor who
// has left. Every line waits for what it reads.
const NEW_293 = { first: "Imani", last: "Castellanos", phone: "2155550199", email: "imani.castellanos@example.invalid" };
const TEMP_293 = { first: "Joaquin", last: "Ferraro", phone: "2155550198", email: "joaquin.ferraro@ocsa.temp" };
const SENT_293 = "u-staff-6";
const NO_EMAIL_293 = "u-staff-9";
async function step293(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await d.page.keyboard.press("Escape").catch(() => {});
    await recover(d, origin, p);
  };
  const fill = (key, ...v) => v.reduce((t0, x, i) => t0.split("{" + i + "}").join(String(x)), d.say(key));
  const addStaff = async (who) => {
    await go(d, "staff", null, "table tbody tr");
    await d.page.getByRole("button", { name: d.say("Add Staff") }).first().click();
    const win = d.page.locator("div[style*='z-index: 500']").last();
    const inputs = win.locator("input");
    await inputs.nth(0).fill(who.first);
    await inputs.nth(1).fill(who.last);
    await inputs.nth(2).fill(who.phone);
    await inputs.nth(3).fill(who.email);
    await win.getByRole("button", { name: d.say("Add Staff") }).click();
    await until(d, "[data-added-welcome]");
    return d.page.locator("[data-added-welcome]").innerText();
  };
  const closeAdded = async () => { await d.page.getByRole("button", { name: d.say("Done") }).click().catch(() => {}); };
  const toasted = async (words) => { await d.page.getByText(words, { exact: false }).first().waitFor({ timeout: 4000 }).catch(() => {}); return (await d.page.getByText(words, { exact: false }).count()) > 0; };
  await check("Add Staff says the welcome email went, with the PIN still behind Show", async () => {
    const said = await addStaff(NEW_293);
    const post = stubs.calls.filter((c) => c.method === "POST" && c.path === "/api/users").pop();
    if (!post || !post.json || !post.json.welcome) return "the create answered no welcome";
    const pin = String(post.json.tempPin || "");
    const shown = await d.page.locator("div[style*='z-index: 500']").last().innerText();
    await closeAdded();
    if (said !== fill("Welcome email sent to {0}.", NEW_293.email)) return "the window reads " + JSON.stringify(said);
    if (!pin || shown.indexOf(pin) >= 0) return "the PIN is not hidden";
    return shown.indexOf(d.say("Show")) < 0 ? "Show is not offered" : "";
  });
  await check("a placeholder address draws the reason the welcome email did not go", async () => {
    const said = await addStaff(TEMP_293);
    const post = stubs.calls.filter((c) => c.method === "POST" && c.path === "/api/users").pop();
    const reason = post && post.json && post.json.welcome ? post.json.welcome.reason : "";
    const button = await d.page.locator("[data-added-send-welcome]").innerText();
    await closeAdded();
    if (!reason) return "the create answered no reason";
    if (said !== fill("Welcome email not sent: {0}", reason)) return "the window reads " + JSON.stringify(said);
    return button === d.say("Send welcome email") ? "" : "the button reads " + JSON.stringify(button);
  });
  await check("the profile's Send it again asks first, then sends", async () => {
    await go(d, "staff", [SENT_293], "[data-welcome-send]");
    const btn = d.page.locator("[data-welcome-send]");
    if ((await btn.innerText()) !== d.say("Send it again")) return "the button reads " + JSON.stringify(await btn.innerText());
    const before = (await d.page.evaluate(() => window.__audit.confirms.length));
    await btn.click();
    const asked = await d.page.evaluate((n) => window.__audit.confirms.slice(n), before);
    if (asked.indexOf(d.say("Send a new welcome email? The last link stops working.")) < 0) return "it asked " + JSON.stringify(asked);
    for (let i = 0; i < 20 && !stubs.calls.some((c) => c.method === "POST" && c.path === "/api/users/" + SENT_293 + "/invite"); i++) await wait(100);
    const sent = stubs.calls.filter((c) => c.method === "POST" && c.path === "/api/users/" + SENT_293 + "/invite").pop();
    if (!sent || sent.status !== 200) return "the invite was not sent";
    return (await toasted(d.say("Welcome email sent."))) ? "" : "no toast says the welcome email went";
  });
  await check("Send welcome email is disabled on No working email", async () => {
    await go(d, "staff", [NO_EMAIL_293], "[data-welcome-send]");
    if (!(await d.page.locator("[data-welcome-send]").isDisabled())) return "the button can be pressed";
    const line = await d.page.locator("[data-welcome-no-email]").innerText();
    return line === d.say("No working email") ? "" : "the line reads " + JSON.stringify(line);
  });
  await check("a rehire says the welcome email went in its toast", async () => {
    await go(d, "staff", [LEFT_ID], '[data-employment-action="rehire"]');
    await d.page.locator('[data-employment-action="rehire"]').click();
    await until(d, "[data-restore-sites] [data-restore-site]");
    const ticked = d.page.locator("[data-restore-sites] input:checked");
    while (await ticked.count()) await ticked.first().uncheck();
    await d.page.locator('[data-employment-window] input[type="date"]').fill(seed.shift(2));
    await d.page.locator("[data-employment-window] button").filter({ hasText: d.say("Rehire") }).last().click();
    const said = fill("Welcome email sent.");
    if (!(await toasted(d.say("Employment updated.") + " " + said))) return "no toast says Employment updated. " + said;
    return stubs.welcomes292().some((w) => w.id === LEFT_ID && w.status === "sent") ? "" : "the stub tried no welcome";
  });
  await check("the list says when the welcome email went for someone who has never signed in", async () => {
    await go(d, "staff", null, "table tbody tr");
    const read = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/users" && Array.isArray(c.json)).pop();
    const w = read && read.json.find((x) => x.id === SENT_293);
    if (!w || !w.welcome) return "the list answered no welcome";
    const cell = d.page.locator("table tbody tr").filter({ hasText: "Ngozi Okonkwo" }).locator("[data-sign-in-state]");
    await cell.first().waitFor();
    const kinds = (await cell.first().getAttribute("data-sign-in-state")) || "";
    const text = await cell.first().innerText();
    if (kinds.split(" ").indexOf("welcome") < 0) return "the cell draws " + kinds;
    return text.indexOf(d.say("Welcome email sent {0}").split("{0}")[0].trim()) >= 0 ? "" : "the cell reads " + JSON.stringify(text);
  });
  if (p.lang !== "en" || d.phone) return;
  await check("Schedule inspection's Assigned Supervisor offers active supervisors only", async () => {
    await go(d, "inspections", null, "[data-nav-item]");
    await d.page.getByRole("button", { name: d.say("Scheduled|inspections") }).first().click();
    await d.page.getByRole("button", { name: d.say("Schedule Inspection") }).first().click();
    const win = d.page.locator("div[style*='z-index: 500']").last();
    await win.locator("[data-person-pick-field]").first().click();
    await until(d, "[data-person-pick-option]");
    const offered = await win.locator("[data-person-pick-option]").evaluateAll((els) => els.map((e) => e.getAttribute("data-person-pick-option")));
    const read = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/users" && /role=supervisor/.test(c.query) && Array.isArray(c.json)).pop();
    if (!read || !read.json.some((x) => x.status === "inactive")) return "the stub's supervisors hold nobody who left";
    const left = read.json.filter((x) => x.status === "inactive").map((x) => x.id);
    const shown = offered.filter((id) => left.indexOf(id) >= 0);
    if (shown.length) return "it offers " + shown.join(", ") + ", who left";
    return offered.length ? "" : "it offers nobody";
  });
}

// Step 306's Library (STEP305_CONTRACT.md section 2), each a line, against the stub armed with
// setStep305 (audit/stubs.js): the Library by folder, a search by a word in a section's text opening
// the document at that section, the reader with its cover, Contents by Part and every section and no
// signature box, See the designed version opening the PDF behind the token, Help's Open button, and
// the empty list's line. Every line waits for what it reads.
const DOC_306 = "OCSA-QMS-901";
const WORD_306 = { en: "squeegee", es: "escurridor" };
const ASK_306 = { en: "What is in OCSA-QMS-901?", es: "\u00bfQu\u00e9 contiene OCSA-QMS-901?" };
async function step306(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await d.page.keyboard.press("Escape").catch(() => {});
    await recover(d, origin, p);
  };
  const lang = p.lang === "es" ? "es" : "en";
  const listRead = () => stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/library" && !/[?&]q=/.test(c.query || "") && c.json && Array.isArray(c.json.documents)).pop();
  const docRead = () => stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/documents/" + DOC_306 + "/read" && c.json && c.json.document).pop();
  await check("the Library lists every document by folder, with Also in Spanish", async () => {
    if ((await d.page.locator('[data-nav-item="library"]').count()) === 0 && p.viewport !== "phone") return "the side panel offers no Library";
    await go(d, "library", null, "[data-library-folder]");
    const read = listRead();
    if (!read) return "the list was not read";
    const docs = read.json.documents;
    const drawn = await d.page.locator("[data-library-doc]").evaluateAll((els) => els.map((e) => e.getAttribute("data-library-doc")));
    if (drawn.join() !== docs.map((x) => x.docCode).join()) return "it draws " + JSON.stringify(drawn);
    const folders = await d.page.locator("[data-library-folder]").evaluateAll((els) => els.map((e) => e.getAttribute("data-library-folder")));
    const want = docs.map((x) => x.folder).filter((f, i, all) => all.indexOf(f) === i);
    if (folders.join() !== want.join()) return "its folders are " + JSON.stringify(folders);
    const spanish = docs.filter((x) => x.locales.indexOf("es") >= 0).length;
    if ((await d.page.locator("[data-library-spanish]").count()) !== spanish) return "Also in Spanish is not on the " + spanish + " documents with a Spanish edition";
    const qms = await d.page.locator('[data-library-folder="QMS"]').innerText();
    return qms.indexOf(docs.find((x) => x.folder === "QMS").folderName) === 0 ? "" : "the Quality folder reads " + JSON.stringify(qms);
  });
  await check("a search by a word in the text opens the document at the section it matched", async () => {
    await go(d, "library", null, "[data-library-search]");
    await d.page.locator("[data-library-search]").fill(WORD_306[lang]);
    await d.page.locator("[data-library-search-send]").click();
    await until(d, "[data-library-match]");
    const asked = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/library" && /[?&]q=/.test(c.query || "")).pop();
    if (!asked || new URLSearchParams(asked.query.slice(1)).get("q") !== WORD_306[lang]) return "the search was not sent with q";
    const ref = await d.page.locator("[data-library-match]").first().getAttribute("data-library-match");
    if (ref !== "2.2") return "it matched section " + ref;
    await d.page.locator('[data-library-doc="' + DOC_306 + '"]').first().click();
    await until(d, '[data-library-landed="2.2"]');
    const at = await d.page.locator('[data-library-section="2.2"]').evaluate((e) => e.getBoundingClientRect().top);
    if (at < -5 || at > 260) return "the section is drawn " + Math.round(at) + " pixels down, not at the top";
    const read = docRead();
    return read && read.locale === lang ? "" : "the document was not read in the screen's language";
  });
  await check("the reader draws the cover, Contents by Part and every section, and no signature box", async () => {
    await go(d, "library", [DOC_306], "[data-library-contents]");
    const doc = docRead().json.document;
    if ((await d.page.locator("[data-library-cover]").innerText()).indexOf(doc.title) < 0) return "the cover does not carry the title";
    if ((await d.page.locator("[data-library-section]").count()) !== doc.sections.length) return "it draws " + (await d.page.locator("[data-library-section]").count()) + " sections of " + doc.sections.length;
    if ((await d.page.locator("[data-library-part]").count()) !== doc.parts.length) return "it draws " + (await d.page.locator("[data-library-part]").count()) + " Parts of " + doc.parts.length;
    if ((await d.page.locator("[data-library-jump]").count()) !== doc.sections.length) return "the contents do not list every section";
    if ((await d.page.locator("[data-library-table]").count()) !== 1) return "the table is not drawn as a table";
    return (await d.page.locator("[data-signature-box], canvas").count()) ? "the reader draws a signature box" : "";
  });
  await check("See the designed version opens the PDF behind the token", async () => {
    await go(d, "library", [DOC_306], "[data-library-designed]");
    await d.page.locator("[data-library-designed]").click();
    await until(d, '[data-library-pdf="' + DOC_306 + '"] iframe');
    const got = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/documents/" + DOC_306 + "/pdf").pop();
    return got && got.status === 200 && got.headers.authorization ? "" : "the PDF was not read behind the token";
  });
  await check("Help's answer about a document draws Open, which opens it in the Library", async () => {
    await go(d, "help", null, "textarea");
    await d.page.locator("textarea").first().fill(ASK_306[lang]);
    await d.page.locator('button[aria-label="' + d.say("Send") + '"]').first().click();
    await until(d, '[data-help-open-document="' + DOC_306 + '"]');
    const words = await d.page.locator("[data-help-open-document]").last().innerText();
    if (words.trim() !== d.say("Open {0}|document").replace("{0}", DOC_306)) return "the button reads " + JSON.stringify(words);
    await d.page.locator("[data-help-open-document]").last().click();
    await until(d, '[data-library-reader="' + DOC_306 + '"] [data-library-contents]');
    return "";
  });
  await check("an empty Library says it is loading", async () => {
    stubs.setStep305Empty(true);
    try {
      await go(d, "library", null, "[data-library-empty]");
      const said = (await d.page.locator("[data-library-empty]").innerText()).trim();
      return said === d.say("The library is loading. Check back soon.") ? "" : "it says " + JSON.stringify(said);
    } finally { stubs.setStep305Empty(false); }
  });
}

// Step 309's supply orders (STEP308_CONTRACT.md section 2), each a line, against the stub armed with
// setStep308 over Step 280's requests (audit/stubs.js): a holder deciding a request and signing it
// with a vendor whose details fill in, the purchase order opening behind the token, Send and then
// Ordered with its date and Send again, an admin without the capability reading a request with no
// controls and downloading the CSV, and the vendor dropdown's line when no vendor is approved. Every
// line waits for what it reads.
const REQUEST_309 = { id: "sr-9", street: "9 Kestrel Way" };
const VENDOR_309 = { id: "v-1", email: "orders@tallowridge.example.invalid" };
async function step309(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await d.page.keyboard.press("Escape").catch(() => {});
    await recover(d, origin, p);
  };
  const openRequest = async (id, ready) => {
    await go(d, "supplies", null, '[data-supplies-tab="requests"]');
    await d.page.locator('[data-supplies-tab="requests"]').click();
    await until(d, '[data-request-open="' + id + '"]');
    await d.page.locator('[data-request-open="' + id + '"]').click();
    await until(d, ready || '[data-request-window="' + id + '"]');
  };
  const posted = (what) => stubs.calls.filter((c) => c.method === "POST" && c.path === "/api/supplies/requests/" + REQUEST_309.id + "/" + what).pop();
  await check("a holder decides a request and signs it with an approved vendor whose details fill in", async () => {
    await openRequest(REQUEST_309.id);
    await d.page.locator("[data-request-approve-all]").click();
    await until(d, "[data-order-vendor]");
    const offered = await d.page.locator("[data-order-vendor] option").evaluateAll((els) => els.map((e) => e.value).filter(Boolean));
    if (offered.join() !== "v-1,v-2") return "the dropdown offers " + JSON.stringify(offered);
    await d.page.locator("[data-order-vendor]").selectOption(VENDOR_309.id);
    await until(d, '[data-order-vendor-details="' + VENDOR_309.id + '"]');
    if ((await d.page.locator("[data-order-vendor-details]").innerText()).indexOf(VENDOR_309.email) < 0) return "the vendor's email is not filled in";
    if ((await d.page.locator("[data-order-deliver-to]").inputValue()).indexOf(REQUEST_309.street) !== 0) return "Deliver to does not start as the site's address";
    if (!(await d.drawSignature())) return "no signature box";
    await d.page.locator("[data-order-sign] [data-signature-box] button").first().click();
    await until(d, "[data-order-signed] [data-order-po]");
    const sign = posted("sign");
    if (!sign || sign.status !== 200) return "the order was not signed";
    const b = sign.body || {};
    if (b.vendorId !== VENDOR_309.id || String(b.signature).indexOf("data:image/png;base64,") !== 0 || String(b.deliverTo).indexOf(REQUEST_309.street) !== 0) return "it sent " + JSON.stringify({ vendorId: b.vendorId, deliverTo: b.deliverTo });
    const po = (await d.page.locator("[data-order-po]").innerText()).trim();
    return po === sign.json.request.poNumber ? "" : "the PO number reads " + JSON.stringify(po);
  });
  await check("the purchase order opens behind the token", async () => {
    await openRequest(REQUEST_309.id, "[data-order-open-po]");
    await d.page.locator("[data-order-open-po]").click();
    await until(d, "[data-order-pdf] iframe");
    const got = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/supplies/requests/" + REQUEST_309.id + "/po.pdf").pop();
    return got && got.status === 200 && got.headers.authorization ? "" : "the PDF was not read behind the token";
  });
  await check("Send emails the vendor, then the request reads Ordered with its date, and Send again sends once more", async () => {
    await openRequest(REQUEST_309.id, "[data-order-send]");
    const words = (await d.page.locator("[data-order-send]").innerText()).trim();
    if (words !== d.say("Send to {0}").replace("{0}", VENDOR_309.email)) return "the button reads " + JSON.stringify(words);
    await d.page.locator("[data-order-send]").click();
    await until(d, "[data-order-ordered]");
    const sent = stubs.sent308();
    if (sent.length !== 1 || sent[0].to !== VENDOR_309.email) return "it was sent to " + JSON.stringify(sent.map((x) => x.to));
    const first = posted("send").json.request.orderedAt;
    if ((await d.page.locator("[data-order-ordered]").innerText()).indexOf(VENDOR_309.email) < 0) return "Ordered does not say where it went";
    await d.page.locator("[data-order-send-again]").click();
    for (let i = 0; i < 30 && stubs.sent308().length < 2; i++) await wait(100);
    if (stubs.sent308().length !== 2) return "Send again sent nothing";
    if (posted("send").json.request.orderedAt !== first) return "Send again moved the ordered date";
    await d.page.locator('[data-request-window] button[aria-label="' + d.say("Close") + '"]').first().click();
    await until(d, '[data-request-po="' + posted("sign").json.request.poNumber + '"]');
    return (await d.page.locator('[data-request-ordered]').count()) >= 2 ? "" : "the list does not say Ordered";
  });
  await check("an admin without the capability reads a request with no controls and downloads the CSV", async () => {
    stubs.setStep308Holder(false);
    try {
      await openRequest("sr-4", "[data-request-read-only]");
      const said = (await d.page.locator("[data-request-read-only]").innerText()).trim();
      if (said !== d.say("Only the people who approve supply requests can decide this.")) return "the line reads " + JSON.stringify(said);
      const controls = await d.page.locator("[data-request-approve-all], [data-request-deny-all], [data-request-line-approve], [data-request-line-deny], [data-request-line-change], [data-order-sign]").count();
      if (controls) return "it still draws " + controls + " decision controls";
      await d.page.locator('[data-request-window] button[aria-label="' + d.say("Close") + '"]').first().click();
      await d.page.locator("[data-ordering-download]").click();
      for (let i = 0; i < 30 && !stubs.calls.some((c) => c.path === "/api/supplies/requests/approved.csv"); i++) await wait(100);
      const csv = stubs.calls.filter((c) => c.path === "/api/supplies/requests/approved.csv").pop();
      return csv && csv.status === 200 ? "" : "the CSV was not downloaded";
    } finally { stubs.setStep308Holder(true); }
  });
  await check("with no approved vendor, Sign and order says to add one under Vendors", async () => {
    stubs.setStep308NoVendors(true);
    try {
      await openRequest("sr-4");
      if ((await d.page.locator("[data-request-approve-all]").count()) > 0) await d.page.locator("[data-request-approve-all]").click();
      await until(d, "[data-order-no-vendor]");
      const said = (await d.page.locator("[data-order-no-vendor]").innerText()).trim();
      if (said !== d.say("Add a vendor under Vendors and set it to approved first.")) return "the line reads " + JSON.stringify(said);
      return (await d.page.locator("[data-order-vendor]").count()) ? "the empty dropdown is still drawn" : "";
    } finally { stubs.setStep308NoVendors(false); }
  });
}

// Step 314's one inspection walk (STEP312_CONTRACT.md section 3), each a line, against the stub armed
// with setStep312 (audit/stubs.js): Schedule Inspection with Include the safety walk on, sending
// withSafety true, and off, sending false; a completed walk's result showing its safety part; and the
// links both ways between the inspection and its OCSA-FRM-015 record. Every line waits for what it reads.
const WALK_314 = "insp-4";
const SAFETY_314 = "fr-safety-1";
async function step314(d, origin, p, stubs) {
  const check = async (what, fn) => {
    const mark = d.pageErrors.length;
    let why = "";
    try { why = (await fn()) || (await trouble(d, mark)); } catch (e) { why = e.message.split("\n")[0]; }
    say(!why, p.name, what, why);
    await d.page.keyboard.press("Escape").catch(() => {});
    await recover(d, origin, p);
  };
  const win = () => d.page.locator("div[style*='z-index: 500']").last();
  const schedule = async (withSafety) => {
    await go(d, "inspections");
    await d.page.getByRole("button", { name: d.say("Scheduled|inspections") }).first().click();
    await d.page.getByRole("button", { name: d.say("Schedule Inspection") }).first().click();
    await until(d, "[data-schedule-with-safety]");
    const box = d.page.locator('[data-schedule-with-safety] input[type="checkbox"]');
    if (!(await box.isChecked())) return { why: "Include the safety walk is not on to start" };
    if (!withSafety) await box.uncheck();
    await win().locator("select").nth(0).selectOption("tp-1");
    await win().locator("select").nth(1).selectOption(seed.SITES[1].id);
    await win().locator('input[type="date"]').first().fill(seed.shift(9));
    const before = stubs.scheduled312().length;
    await win().getByRole("button", { name: d.say("Schedule|verb"), exact: true }).click();
    for (let i = 0; i < 30 && stubs.scheduled312().length === before; i++) await wait(100);
    return { sent: stubs.scheduled312()[before] };
  };
  await check("Schedule Inspection offers Include the safety walk, on, and sends withSafety true", async () => {
    const r = await schedule(true);
    if (r.why) return r.why;
    if (!r.sent) return "nothing was scheduled";
    return r.sent.body.withSafety === true ? "" : "it sent withSafety " + JSON.stringify(r.sent.body.withSafety);
  });
  await check("unticked, Include the safety walk sends withSafety false", async () => {
    const r = await schedule(false);
    if (r.why) return r.why;
    if (!r.sent) return "nothing was scheduled";
    return r.sent.body.withSafety === false ? "" : "it sent withSafety " + JSON.stringify(r.sent.body.withSafety);
  });
  await check("a completed walk's result shows its safety part: its answers, findings and result", async () => {
    await go(d, "inspections", [WALK_314], '[data-inspection-safety-answer="findings"]');
    const read = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/forms/responses/" + SAFETY_314 && c.json && Array.isArray(c.json.fields)).pop();
    if (!read) return "the safety record was not read";
    if ((await d.page.locator('[data-inspection-with-safety="true"]').count()) !== 1) return "the inspection does not say the safety walk was included";
    const keys = await d.page.locator("[data-inspection-safety-answer]").evaluateAll((els) => els.map((e) => e.getAttribute("data-inspection-safety-answer")));
    const want = ["site", "kind", "areas", "crew", "findings", "overall"];
    if (keys.join() !== want.join()) return "it draws " + JSON.stringify(keys);
    const result = read.json.fields.find((f) => f.key === "overall").displayValue;
    return (await d.page.locator('[data-inspection-safety-answer="overall"]').innerText()).indexOf(result) >= 0 ? "" : "the overall result is not drawn";
  });
  await check("the safety part opens its OCSA-FRM-015 record, which opens the inspection again", async () => {
    await go(d, "inspections", [WALK_314], "[data-open-safety-record]");
    await d.page.locator("[data-open-safety-record]").click();
    await until(d, '[data-filed-inspection="' + WALK_314 + '"]');
    if (!/^#forms\/reports\//.test(await d.page.evaluate(() => window.location.hash))) return "the record did not open under Forms";
    await d.page.locator("[data-open-inspection]").click();
    await until(d, '[data-inspection-safety="' + SAFETY_314 + '"]');
    return (await d.page.evaluate(() => window.location.hash)) === "#inspections/" + WALK_314 ? "" : "the inspection did not open by its address";
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
  // Step 280's answers are laid over whichever of those the pass arms.
  if (p.step280) stubs.setStep280(true);
  // Step 289's answers (the dashboard's Step 291) are laid over whichever of those the pass arms.
  if (p.step291) stubs.setStep289(true);
  // Step 299's answers (the dashboard's Step 300, the case log) are laid over those.
  if (p.step300) stubs.setStep299(true);
  // Step 292's answers (the dashboard's Step 293, the welcome email) are laid over those.
  if (p.step293) stubs.setStep292(true);
  // Step 305's answers (the dashboard's Step 306, the Library) are laid over those.
  if (p.step306) stubs.setStep305(true);
  // Step 308's answers (the dashboard's Step 309, supply orders) are laid over Step 280's requests.
  if (p.step309) stubs.setStep308(true);
  // Step 312's answers (the dashboard's Step 314, one inspection walk) are laid over those.
  if (p.step314) stubs.setStep312(true);
  // Step 283's sign-in answers are laid over everything else.
  if (p.step283) stubs.setStep283(true);
  if (p.secondStep) armSecondStep(stubs);
  const kept = keepSignIn(stubs);
  const d = await createDriver({ browser, origin, stubs, viewport: p.viewport, lang: p.lang });
  // A control that is not there fails its line in seconds, not in the driver's thirty.
  d.page.setDefaultTimeout(8000);
  try {
    await d.page.goto(origin + "/#overview", { waitUntil: "domcontentloaded" });
    if (p.wrongSignIn) await wrongSignIn(d, p, kept);
    try {
      // Step 284: Enter pressed twice sends one sign-in, and through the code screen Remember this
      // device off keeps the session out of localStorage.
      const before = kept.logins.length;
      const r = await signIn(d, p.who, p.step283 ? { enter: true, rememberOff: !!p.secondStep } : {});
      say(!p.secondStep || r.sawCode, p.name, p.secondStep ? "signs in through the code screen" : "signs in", p.secondStep && !r.sawCode ? "no code screen" : "");
      if (p.step283) say(kept.logins.length - before === 1, p.name, "Enter pressed twice sends one sign-in", kept.logins.length - before === 1 ? "" : (kept.logins.length - before) + " sign-ins were sent");
      if (p.step283 && p.secondStep) {
        const kept2 = await d.page.evaluate(() => ({ local: localStorage.getItem("ocsa_auth"), session: sessionStorage.getItem("ocsa_auth") }));
        say(kept2.local === null && !!kept2.session, p.name, "Remember this device off leaves nothing in localStorage", kept2.local !== null ? "the session is in localStorage" : !kept2.session ? "the session is nowhere" : "");
      }
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
    if (p.step280) await step280(d, origin, p, stubs);
    if (p.step283) await step283(d, origin, p, stubs);
    if (p.step291) await step291(d, origin, p, stubs);
    if (p.step300) await step300(d, origin, p, stubs);
    if (p.step293) await step293(d, origin, p, stubs);
    if (p.step306) await step306(d, origin, p, stubs);
    if (p.step309) await step309(d, origin, p, stubs);
    if (p.step314) await step314(d, origin, p, stubs);

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
    // Step 284's screens read the answers Step 278's pictures are taken from.
    if (p.step283) await step284Screens(d, origin, p, stubs);
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
