// Round 14 (part 413): Employee of the Month, shout-outs, the training admin, and what the API's Rounds 17, 18 and 21 and the
// robot's Rounds 6 and 7 left waiting, against the stub as the API is built at ocsa-api main 06b6d1b (#171) with the part413
// layer (audit/part413-stub.js). Each case runs in English and in Spanish, and each fails on main as it stood at c3f8b3d
// unless its name says it is a guard.
//
//   award       post the month's winner with a photo (a JPEG made smaller, a HEIC sent as it is) and without one (the
//               initials in a gold circle), an earlier month that tells nobody, the month taken, edit in the month and
//               the API's refusal once it has closed, take down with a reason, the certificate in each language, the
//               reason in three languages with Translating, and the timeline's plain words
//   wall        the team wall paged to its end, and an award taken down marked on it
//   shoutouts   a supervisor posts through the people route, one who shares no site refused, a second take-down's 409,
//               the line in three languages, and a test office account kept to test records
//   named       Who gets told lists the recognition notices; the roles screen names the two capabilities
//   shapes      section 3, each item with its own case: templates with their site and test mark, the Library's test
//               document, a run's coverage and the two new Health numbers, a test office account's announcement, the
//               missing count from the totals, a person's class sentence and each balance's line, a request's notice
//               line and holiday, an admin removing a photo, and sign-in reading maintenance from features
//   robot       section 4, each item with its own case: Supplies asks no labels as it opens, New message says No one
//               matches., a test office account reads the test lines, windows and tabs carry hooks, and the list
//               searches carry data-list-search and filter before paging
//   training    section 5: courses made with a Title Case note shown gently, a key already used, chapters ordered by
//               dragging and by Up and Down; a player draft written, its problem at its field, a tap target drawn and
//               saved, the preview and publish; the setup chapter's switch; the certificate signer; Reset tries for one
//               person and for everyone; a course certificate in HR Records; and the narration number's list
"use strict";
const fs = require("fs");
const path = require("path");
const { createStubs } = require("../stubs");
const { localeTagFor } = require("../lib/words");

const KIND = "part413";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const LANGS = ["en", "es"];
const say = (x) => JSON.stringify(x);
const fill = (s, ...v) => String(s).replace(/\{(\d+)\}/g, (m, n) => (v[Number(n)] !== undefined ? String(v[Number(n)]) : m));
const PHOTO_JPG = path.join(__dirname, "..", "fixtures", "photo.jpg");
const THIS_MONTH = "2026-03";

async function goHash(d, h) {
  await d.page.evaluate(() => { window.location.hash = "overview"; });
  await wait(150);
  await d.page.evaluate((x) => { window.location.hash = x; }, h);
  await d.settle(700);
}
const has = async (d, sel) => (await d.page.locator(sel).count()) > 0;
const until = async (d, sel, ms) => { await d.page.locator(sel).first().waitFor({ timeout: d.missed ? 800 : ms || 6000 }).catch(() => {}); return has(d, sel); };
const attr = async (d, sel, name) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? l.getAttribute(name) : null; };
const textOf = async (d, sel) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? (await l.innerText()).trim() : ""; };
const writes = (d, mark, method, re) => d.callsSince(mark).filter((c) => c.method === method && re.test(c.path));
const reads = (d, mark, re) => d.callsSince(mark).filter((c) => c.method === "GET" && re.test(c.path));
const thrown = (d, from) => d.pageErrors.slice(from || 0).filter((e) => !/^console: Failed to load resource/.test(e));
const soon = async (fn, ms) => { const end = Date.now() + (ms || 4000); while (Date.now() < end) { if (await fn()) return true; await wait(100); } return !!(await fn()); };
const click = async (d, sel) => { await d.page.locator(sel).first().click({ timeout: d.missed ? 800 : 4000 }); await d.settle(400); };
// A step that cannot be taken (on main, the button or field is not there) is noted and skipped, and the waits after it
// are short, so every check of the driver still reports what it saw under its own name and none throws. Reads pass
// through as they are.
const ACTIONS = ["click", "fill", "selectOption", "check", "uncheck", "setInputFiles", "dragTo", "press", "type"];
const CHAINS = ["first", "last", "nth", "filter", "locator"];
function soften(d, loc) {
  return new Proxy(loc, {
    get(target, prop) {
      if (ACTIONS.indexOf(prop) >= 0) return async (...a) => { try { return await target[prop](...a); } catch (e) { if (!d.missed) d.page.setDefaultTimeout(1000); d.missed = (d.missed || 0) + 1; return null; } };
      if (CHAINS.indexOf(prop) >= 0) return (...a) => soften(d, target[prop](...a));
      const v = target[prop];
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}
function softPage(d, page) {
  return new Proxy(page, {
    get(target, prop) {
      if (prop === "locator") return (...a) => soften(d, target.locator(...a));
      const v = target[prop];
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}
const monthWords = (lang, ym) => { const p = ym.split("-").map(Number); return new Intl.DateTimeFormat(localeTagFor(lang), { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(p[0], p[1] - 1, 1))); };

// One driver on a stub of its own, armed with the API as built, Round 2's file log and part 364.
async function withDriver(ctx, o, fn) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setApiAsBuilt(true);
  stubs.setStep353(true);
  stubs.setStep364(true);
  stubs.setScene413({ round21: true });
  if (o.arm) o.arm(stubs);
  const d = await createDriver({ browser, origin, stubs, viewport: o.viewport || "wide", lang: o.lang || "en" });
  d.page.setDefaultTimeout(8000);
  d.page = softPage(d, d.page);
  try {
    if (o.persona !== null) await d.signIn(o.persona || "admin");
    await fn(d, stubs);
  } catch (e) {
    results.fail(KIND, KIND + "/" + (o.lang || "en") + "/" + o.name + "/suite", threw(e));
  } finally { await d.close(); }
}

// ---- Section 1: post the Employee of the Month ----------------------------------------------------------------------
const POST_WIN = "[data-award-window='post']";
async function openPost(d) {
  await goHash(d, "recognition");
  await until(d, "[data-award-post-open]", 8000);
  await click(d, "[data-award-post-open]");
  return until(d, POST_WIN, 4000);
}
async function pickPerson(d, id) {
  await click(d, POST_WIN + " [data-award-person] [data-person-pick-field]");
  await click(d, POST_WIN + " [data-person-pick-option='" + id + "']");
}
async function typeReason(d, text) { await d.page.locator(POST_WIN + " [data-award-reason-input]").fill(text); await d.settle(200); }
async function post(d) { await click(d, POST_WIN + " [data-award-post]"); await d.settle(600); }

async function awardCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/award/" + x;

  // 1. Post with a photo: the person has none, Add a photo uploads it (made smaller, as a JPEG) and sets it as their
  // profile photo, the preview draws it, and Post sends the person, the month, the reason and the site, then says
  // how many people were told.
  await withDriver(ctx, { name: "with-photo", lang, arm: (s) => s.setScene413({ noWall: true }) }, async (d, stubs) => {
    const opened = await openPost(d);
    await pickPerson(d, "u-staff-7");
    const offered = await has(d, POST_WIN + " [data-award-photo-file]");
    const okay = (await textOf(d, POST_WIN + " [data-award-photo-panel]")).indexOf(d.say("It becomes their profile photo. Have their okay first.")) >= 0;
    const mark = d.mark();
    await d.page.locator(POST_WIN + " [data-award-photo-file]").setInputFiles(PHOTO_JPG);
    await soon(() => has(d, POST_WIN + " [data-award-photo-added]"), 5000);
    const up = writes(d, mark, "POST", /^\/api\/uploads$/).map((c) => c.query);
    const set = writes(d, mark, "POST", /^\/api\/users\/profile\/photo$/).map((c) => c.body);
    const inPreview = await has(d, POST_WIN + " [data-award-preview] [data-award-photo]");
    const reason = "Kept every restroom stocked through the storm.";
    await typeReason(d, reason);
    const count = await attr(d, POST_WIN + " [data-award-reason-count]", "data-award-reason-count");
    await d.page.locator(POST_WIN + " [data-award-site]").selectOption("s-1").catch(() => {});
    const before = d.mark();
    await post(d);
    const sent = writes(d, before, "POST", /^\/api\/recognition\/awards$/).map((c) => c.body);
    const told = await attr(d, "[data-award-told]", "data-award-told");
    const line = await textOf(d, "[data-award-told]");
    results.check(KIND, id("a-winner-posted-with-a-photo-says-how-many-were-told"),
      opened && offered && okay && up.length === 1 && /bucket=profile-photos/.test(up[0] || "") && /ext=jpg/.test(up[0] || "") && set.length === 1 && set[0].userId === "u-staff-7" && inPreview && count === String(reason.length)
        && sent.length === 1 && sent[0].userId === "u-staff-7" && sent[0].month === THIS_MONTH && sent[0].reason === "Kept every restroom stocked through the storm." && sent[0].siteId === "s-1"
        && told === "9" && /9/.test(line) && thrown(d).length === 0,
      "window " + opened + ", Add a photo " + offered + ", the okay line " + okay + ", upload " + say(up) + ", photo set " + say(set) + ", photo in the preview " + inPreview + ", count " + say(count) + ", sent " + say(sent) + ", told " + say(told) + " " + say(line));
  });

  // 2. An iPhone's HEIC goes to the upload as it is, named .heic, and the API makes it a JPEG.
  await withDriver(ctx, { name: "heic", lang, arm: (s) => s.setScene413({ noWall: true }) }, async (d) => {
    await openPost(d);
    await pickPerson(d, "u-staff-7");
    const mark = d.mark();
    await d.page.locator(POST_WIN + " [data-award-photo-file]").setInputFiles({ name: "IMG_0412.HEIC", mimeType: "image/heic", buffer: fs.readFileSync(PHOTO_JPG) });
    await soon(() => has(d, POST_WIN + " [data-award-photo-added]"), 5000);
    const up = writes(d, mark, "POST", /^\/api\/uploads$/).map((c) => c.query);
    const set = writes(d, mark, "POST", /^\/api\/users\/profile\/photo$/).length;
    const refused = await textOf(d, POST_WIN + " [data-award-photo-refusal]");
    results.check(KIND, id("a-heic-photo-goes-up-as-it-is"), up.length === 1 && /ext=heic/.test(up[0] || "") && set === 1 && !refused,
      "upload " + say(up) + ", photo set " + set + (refused ? ", refused " + say(refused) : ""));
  });

  // 3. Post without a photo: the preview and the posted card draw the initials in a gold circle.
  await withDriver(ctx, { name: "initials", lang, arm: (s) => s.setScene413({ noWall: true }) }, async (d) => {
    await openPost(d);
    await pickPerson(d, "u-staff-8");
    await typeReason(d, "Never missed a closing checklist.");
    const preview = await attr(d, POST_WIN + " [data-award-preview] [data-award-initials]", "data-award-initials");
    await post(d);
    const card = await attr(d, "[data-award] [data-award-initials]", "data-award-initials");
    const photo = await has(d, "[data-award] [data-award-photo]");
    results.check(KIND, id("a-winner-with-no-photo-reads-their-initials"), preview === "RH" && card === "RH" && !photo,
      "preview " + say(preview) + ", card " + say(card) + (photo ? ", a photo drawn" : ""));
  });

  // 4. An earlier month: the window says it tells nobody, and the answer's told 0 is said.
  await withDriver(ctx, { name: "earlier", lang, arm: (s) => s.setScene413({ noWall: true }) }, async (d) => {
    await openPost(d);
    await pickPerson(d, "u-staff-9");
    await d.page.locator(POST_WIN + " [data-award-month-pick]").fill("2026-01");
    await d.settle(200);
    const line = await textOf(d, POST_WIN + " [data-award-earlier]");
    await typeReason(d, "Filled in for the whole holiday week.");
    const before = d.mark();
    await post(d);
    const sent = writes(d, before, "POST", /^\/api\/recognition\/awards$/).map((c) => c.body && c.body.month);
    const told = await attr(d, "[data-award-told]", "data-award-told");
    const said = await textOf(d, "[data-award-told]");
    const want = fill(d.say("Posted on the team wall for {0}. Nobody was told."), monthWords(lang, "2026-01"));
    results.check(KIND, id("an-earlier-month-tells-nobody"), line === d.say("An earlier month goes on the team wall and tells nobody.") && sent.length === 1 && sent[0] === "2026-01" && told === "0" && said === want,
      "line " + say(line) + ", sent " + say(sent) + ", told " + say(told) + " " + say(said) + " (want " + say(want) + ")");
  });

  // 5. The month taken: the API's 409 recognition.monthTaken is drawn in its words in the window.
  await withDriver(ctx, { name: "taken", lang, arm: (s) => s.setScene413({ noWall: false }) }, async (d) => {
    await openPost(d);
    await pickPerson(d, "u-staff-9");
    await d.page.locator(POST_WIN + " [data-award-month-pick]").fill("2026-02");
    await typeReason(d, "Second try for February.");
    await post(d);
    const said = await textOf(d, POST_WIN + " [data-award-refusal]");
    const want = lang === "es" ? "Este mes ya tiene un Empleado del Mes. Retire ese primero para publicar otro." : "This month already has an Employee of the Month. Take that one down first to post another.";
    results.check(KIND, id("the-month-taken-says-to-take-the-standing-one-down"), said === want && await has(d, POST_WIN), "drew " + say(said));
  });

  // 6. Edit during the award's month: the reason and the office's own Spanish are sent, and Give it back sends null
  // for French.
  await withDriver(ctx, { name: "edit", lang, arm: (s) => s.setScene413({ standingAward: { id: "aw-now", userId: "u-staff-6", es: "Mantuvo la clinica lista.", fr: null } }) }, async (d) => {
    await goHash(d, "recognition");
    await until(d, "[data-award='aw-now'] [data-award-edit]", 8000);
    await click(d, "[data-award-edit]");
    await d.page.locator("[data-award-window='edit'] [data-award-reason-input]").fill("Kept the clinic ready for two inspections.");
    await d.page.locator("[data-award-window='edit'] [data-award-reason-lang='es']").fill("Mantuvo la clinica lista para dos inspecciones.");
    await click(d, "[data-award-window='edit'] [data-award-give-back='fr']");
    const before = d.mark();
    await click(d, "[data-award-window='edit'] [data-award-save]");
    const sent = writes(d, before, "PATCH", /^\/api\/recognition\/awards\/aw-now$/).map((c) => c.body);
    const shown = await textOf(d, "[data-award='aw-now'] [data-award-reason='es']");
    results.check(KIND, id("an-award-is-edited-in-its-month"), sent.length === 1 && sent[0].reason === "Kept the clinic ready for two inspections." && sent[0].reasonEs === "Mantuvo la clinica lista para dos inspecciones." && sent[0].reasonFr === null && Object.prototype.hasOwnProperty.call(sent[0], "reasonFr") && /dos inspecciones/.test(shown),
      "sent " + say(sent) + ", Spanish now " + say(shown));
  });

  // 7. Edit once the month has closed: the API's 409 recognition.monthClosed in its words.
  await withDriver(ctx, { name: "closed", lang, arm: (s) => s.setScene413({ standingAward: { id: "aw-now", userId: "u-staff-6" }, monthClosed: true }) }, async (d) => {
    await goHash(d, "recognition");
    await until(d, "[data-award-edit]", 8000);
    await click(d, "[data-award-edit]");
    await d.page.locator("[data-award-window='edit'] [data-award-reason-input]").fill("A late change.");
    await click(d, "[data-award-window='edit'] [data-award-save]");
    const said = await textOf(d, "[data-award-window='edit'] [data-award-refusal]");
    const want = lang === "es" ? "Un Empleado del Mes solo se puede cambiar durante su propio mes." : "An Employee of the Month can only be changed during its own month.";
    results.check(KIND, id("an-edit-after-the-month-is-refused-in-the-apis-words"), said === want, "drew " + say(said));
  });

  // 8. Take down with a reason: the award is kept, the month frees up, and Post this month's winner is back.
  await withDriver(ctx, { name: "take-down", lang, arm: (s) => s.setScene413({ standingAward: { id: "aw-now", userId: "u-staff-6" } }) }, async (d) => {
    await goHash(d, "recognition");
    await until(d, "[data-award-remove]", 8000);
    await click(d, "[data-award-remove]");
    const closedGo = await d.page.locator("[data-award-remove-go]").isDisabled();
    await d.page.locator("[data-award-remove-reason]").fill("Posted for the wrong person.");
    const before = d.mark();
    await click(d, "[data-award-remove-go]");
    const sent = writes(d, before, "POST", /^\/api\/recognition\/awards\/aw-now\/remove$/).map((c) => c.body);
    const empty = await until(d, "[data-award-empty]", 3000);
    results.check(KIND, id("an-award-is-taken-down-with-a-reason"), closedGo && sent.length === 1 && sent[0].reason === "Posted for the wrong person." && empty,
      "Take it down off before a reason " + closedGo + ", sent " + say(sent) + ", empty month " + empty);
  });

  // 9. The certificate in each language: the winner's own (locale sent empty), English, Spanish and French.
  await withDriver(ctx, { name: "certificate", lang, arm: (s) => s.setScene413({ standingAward: { id: "aw-now", userId: "u-staff-6" } }) }, async (d, stubs) => {
    await goHash(d, "recognition");
    await until(d, "[data-award='aw-now'] [data-award-certificate-open]", 8000);
    for (const pick of ["", "en", "es", "fr"]) {
      await d.page.locator("[data-award='aw-now'] [data-award-certificate-lang]").selectOption(pick);
      await click(d, "[data-award='aw-now'] [data-award-certificate-open]");
      await d.settle(300);
    }
    const asked = stubs.certificates413().map((c) => c.locale);
    results.check(KIND, id("the-certificate-opens-in-each-language"), say(asked) === say(["", "en", "es", "fr"]) && thrown(d).length === 0, "asked " + say(asked));
  });

  // 10. The reason in English, Spanish and French: Translating until each arrives, then the API's words.
  await withDriver(ctx, { name: "words", lang, arm: (s) => s.setScene413({ standingAward: { id: "aw-now", userId: "u-staff-6", es: null, fr: null } }) }, async (d, stubs) => {
    await goHash(d, "recognition");
    await until(d, "[data-award='aw-now']", 8000);
    const before = await d.page.locator("[data-award='aw-now'] [data-award-translating]").count();
    const en = await textOf(d, "[data-award='aw-now'] [data-award-reason='en']");
    stubs.setScene413({ translated: true });
    await goHash(d, "recognition");
    await until(d, "[data-award='aw-now']", 8000);
    const after = await d.page.locator("[data-award='aw-now'] [data-award-translating]").count();
    const es = await textOf(d, "[data-award='aw-now'] [data-award-reason='es']");
    results.check(KIND, id("the-reason-reads-in-three-languages-and-translating"), before === 2 && /Kept the clinic ready/.test(en) && after === 0 && /\(es\) Kept the clinic/.test(es),
      "before " + before + " Translating, English " + say(en) + "; after " + after + ", Spanish " + say(es));
  });

  // 11. The person's timeline reads named Employee of the Month and taken down in plain words, in the screen's language.
  await withDriver(ctx, { name: "timeline", lang, arm: (s) => s.setScene413({ timeline413: true }) }, async (d) => {
    await goHash(d, "staff/u-staff-7");
    await d.page.getByRole("button", { name: d.say("Timeline"), exact: true }).first().click({ timeout: 6000 }).catch(() => {});
    await until(d, "[data-timeline-action='recognized']", 6000);
    const named = await textOf(d, "[data-timeline-action='recognized']");
    const down = await textOf(d, "[data-timeline-action='recognition_removed']");
    const wantNamed = fill(d.say("Named Employee of the Month for {0}"), monthWords(lang, THIS_MONTH));
    const wantDown = fill(d.say("Employee of the Month for {0} taken down"), monthWords(lang, THIS_MONTH));
    results.check(KIND, id("the-timeline-reads-recognized-and-taken-down"), named === wantNamed && down === wantDown, "read " + say(named) + " and " + say(down) + " (want " + say(wantNamed) + " and " + say(wantDown) + ")");
  });
}


// ---- Section 2: the team wall and shout-outs ------------------------------------------------------------------------
async function wallCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/wall/" + x;

  // 1. The wall pages through nextCursor to its end: 12, then the last 2, newest month first.
  await withDriver(ctx, { name: "wall", lang }, async (d) => {
    const mark = d.mark();
    await goHash(d, "recognition");
    await until(d, "[data-award-wall] [data-award]", 8000);
    const first = await d.page.locator("[data-award-wall] [data-award]").count();
    const months = await d.page.locator("[data-award-wall] [data-award]").evaluateAll((els) => els.map((e) => e.getAttribute("data-award-month")));
    await click(d, "[data-show-more='award-wall']");
    await soon(async () => (await d.page.locator("[data-award-wall] [data-award]").count()) > first, 4000);
    const all = await d.page.locator("[data-award-wall] [data-award]").count();
    const end = await attr(d, "[data-award-wall]", "data-award-wall-end");
    const more = await has(d, "[data-show-more='award-wall']");
    const pages = reads(d, mark, /^\/api\/recognition\/awards$/).map((c) => c.query);
    const sorted = months.every((x, i) => i === 0 || months[i - 1] >= x);
    const test = await has(d, "[data-award='aw-test-1']");
    results.check(KIND, id("the-wall-pages-to-its-end"), first === 12 && all === 14 && end === "true" && !more && sorted && !test && pages.length === 2 && /cursor=(&|$)/.test(pages[0]) && /cursor=c12/.test(pages[1]),
      "first page " + first + ", in all " + all + ", the end " + say(end) + (more ? ", Show more still there" : "") + ", newest first " + sorted + (test ? ", the test award shown" : "") + ", reads " + say(pages));
  });

  // 2. An award taken down is kept on the wall, marked taken down, with its reason.
  await withDriver(ctx, { name: "taken-down", lang, arm: (s) => s.setScene413({ standingAward: { id: "aw-now", userId: "u-staff-6" } }) }, async (d) => {
    await goHash(d, "recognition");
    await until(d, "[data-award-remove]", 8000);
    await click(d, "[data-award-remove]");
    await d.page.locator("[data-award-remove-reason]").fill("Posted for the wrong person.");
    await click(d, "[data-award-remove-go]");
    await until(d, "[data-award-wall] [data-award='aw-now']", 4000);
    const marked = await attr(d, "[data-award-wall] [data-award='aw-now']", "data-award-removed");
    const why = await textOf(d, "[data-award-wall] [data-award='aw-now'] [data-award-removed-reason]");
    results.check(KIND, id("a-taken-down-award-is-marked-on-the-wall"), marked === "true" && /Posted for the wrong person/.test(why), "marked " + say(marked) + ", reason " + say(why));
  });
}

const SO_WIN = "[data-shoutout-window='post']";
async function openShoutouts(d) {
  await goHash(d, "recognition/shoutouts");
  await until(d, "[data-shoutouts]", 8000);
}
async function shoutoutCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/shoutouts/" + x;

  // 1. A supervisor posts a shout-out through the people route: only the people sharing a site, the site one of
  // theirs, the line counted, and the post sends the three.
  await withDriver(ctx, { name: "supervisor", lang, persona: "supervisor" }, async (d) => {
    await openShoutouts(d);
    const awardTab = await has(d, "[data-recognition-tab='award']");
    const mark = d.mark();
    await click(d, "[data-shoutout-post-open]");
    await until(d, SO_WIN + " [data-shoutout-person]", 6000);
    const offered = await d.page.locator(SO_WIN + " [data-shoutout-person]").evaluateAll((els) => els.map((e) => e.getAttribute("data-shoutout-person")));
    const asked = reads(d, mark, /^\/api\/recognition\/shoutouts\/people$/).length;
    const staff = reads(d, mark, /^\/api\/users$/).length;
    await click(d, SO_WIN + " [data-shoutout-person='u-staff-5']");
    const site = await d.page.locator(SO_WIN + " [data-shoutout-site]").inputValue().catch(() => "");
    await d.page.locator(SO_WIN + " [data-shoutout-line]").fill("Thanks for covering the clinic on Sunday.");
    const count = await attr(d, SO_WIN + " [data-shoutout-line-count]", "data-shoutout-line-count");
    const before = d.mark();
    await click(d, SO_WIN + " [data-shoutout-post]");
    const sent = writes(d, before, "POST", /^\/api\/recognition\/shoutouts$/).map((c) => c.body);
    const listed = await until(d, "[data-shoutout^='so-new-']", 3000);
    results.check(KIND, id("a-supervisor-posts-through-the-people-route"), !awardTab && asked >= 1 && staff === 0 && say(offered.slice().sort()) === say(["u-staff-5", "u-staff-8"]) && site === "s-2" && count === "41"
      && sent.length === 1 && sent[0].userId === "u-staff-5" && sent[0].siteId === "s-2" && sent[0].line === "Thanks for covering the clinic on Sunday." && listed,
      (awardTab ? "the award tab is offered to a supervisor; " : "") + "people read " + asked + " time(s), the staff list " + staff + ", offered " + say(offered) + ", site " + say(site) + ", count " + say(count) + ", sent " + say(sent) + ", listed " + listed);
  });

  // 2. Refused for one who does not share a site: the API's 403 recognition.notYourTeam in its words.
  await withDriver(ctx, { name: "not-your-team", lang, persona: "supervisor", arm: (s) => s.setScene413({ staleTeam: "u-staff-9" }) }, async (d) => {
    await openShoutouts(d);
    await click(d, "[data-shoutout-post-open]");
    await until(d, SO_WIN + " [data-shoutout-person='u-staff-9']", 6000);
    await click(d, SO_WIN + " [data-shoutout-person='u-staff-9']");
    await d.page.locator(SO_WIN + " [data-shoutout-line]").fill("Great work on the loading dock.");
    await click(d, SO_WIN + " [data-shoutout-post]");
    const said = await textOf(d, SO_WIN + " [data-shoutout-refusal]");
    const want = lang === "es" ? "Solo puede dar un reconocimiento a alguien que trabaje en uno de sus sitios." : "You can give a shout-out only to someone who works at one of your sites.";
    results.check(KIND, id("one-who-shares-no-site-is-refused-in-the-apis-words"), said === want, "drew " + say(said));
  });

  // 3. A second take-down answers 409 recognition.shoutoutAlreadyRemoved, drawn in the API's words.
  await withDriver(ctx, { name: "second-take-down", lang, arm: (s) => s.setScene413({ removedElsewhere: "so-2" }) }, async (d) => {
    await openShoutouts(d);
    await until(d, "[data-shoutout='so-2'] [data-shoutout-remove]", 6000);
    await click(d, "[data-shoutout='so-2'] [data-shoutout-remove]");
    await click(d, "[data-shoutout-remove-go]");
    const said = await textOf(d, "[data-shoutout-remove-refusal]");
    const want = lang === "es" ? "Este reconocimiento ya se retir\u00f3." : "This shout-out was already taken down.";
    results.check(KIND, id("a-second-take-down-reads-the-apis-409"), said === want, "drew " + say(said));
  });

  // 4. The office reads each shout-out's line in English, Spanish and French (lineWords).
  await withDriver(ctx, { name: "line-words", lang }, async (d) => {
    await openShoutouts(d);
    await until(d, "[data-shoutout='so-1']", 6000);
    const en = await textOf(d, "[data-shoutout='so-1'] [data-award-reason='en']");
    const es = await textOf(d, "[data-shoutout='so-1'] [data-award-reason='es']");
    const fr = await textOf(d, "[data-shoutout='so-1'] [data-award-reason='fr']");
    results.check(KIND, id("the-office-reads-the-line-in-three-languages"), /loading dock/.test(en) && /muelle de carga/.test(es) && /quai de chargement/.test(fr), "read " + say([en, es, fr]));
  });

  // 5. A test office account reads and posts test records alone: the wall and the list hold only the test ones, and
  // naming a real person is refused in the API's words.
  await withDriver(ctx, { name: "test-office", lang, arm: (s) => s.setScene413({ testOffice: true }) }, async (d) => {
    await goHash(d, "recognition");
    await until(d, "[data-award-wall] [data-award]", 8000);
    const wall = await d.page.locator("[data-award-wall] [data-award]").evaluateAll((els) => els.map((e) => e.getAttribute("data-award")));
    await openShoutouts(d);
    await until(d, "[data-shoutout]", 6000);
    const list = await d.page.locator("[data-shoutout]").evaluateAll((els) => els.map((e) => e.getAttribute("data-shoutout")));
    await goHash(d, "recognition");
    await until(d, "[data-award-post-open]", 6000);
    await click(d, "[data-award-post-open]");
    await pickPerson(d, "u-staff-5");
    await typeReason(d, "A real person named by a test office account.");
    await post(d);
    const said = await textOf(d, POST_WIN + " [data-award-refusal]");
    const want = lang === "es" ? "Una cuenta de prueba no puede cambiar un registro real." : "A test account cannot change a real record.";
    results.check(KIND, id("a-test-office-account-keeps-to-test-records"), say(wall) === say(["aw-test-1"]) && say(list) === say(["so-test-1"]) && said === want,
      "wall " + say(wall) + ", shout-outs " + say(list) + ", the post drew " + say(said));
  });
}

// ---- Section 2: Who gets told and the roles screen ------------------------------------------------------------------
async function namedCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/named/" + x;

  // 1. Who gets told lists the three recognition notices (and the course certificate's) by name, each saying who it
  // goes to, with nothing to add.
  await withDriver(ctx, { name: "who-gets-told", lang }, async (d) => {
    await goHash(d, "settings");
    await click(d, "[data-settings-tab='recipients']");
    await until(d, "[data-notice-type='recognition_award']", 6000);
    const want = { recognition_award: "The Employee of the Month is posted", recognition_reactions: "The Employee of the Month is told how many people congratulated them", recognition_shoutout: "Someone gets a shout-out", training_certificate: "A course's certificate is ready" };
    const got = {};
    for (const k of Object.keys(want)) got[k] = { name: await textOf(d, "[data-notice-type='" + k + "']"), named: await has(d, "[data-notice-named='" + k + "']") };
    const okAll = Object.keys(want).every((k) => got[k].name === d.say(want[k]) && got[k].named);
    results.check(KIND, id("who-gets-told-lists-the-recognition-notices"), okAll, "read " + say(got));
  });

  // 2. The roles screen names manage_recognition and post_shoutouts by the API's words.
  await withDriver(ctx, { name: "roles", lang }, async (d) => {
    await d.goto("settings");
    await d.settle(400);
    await d.clickText(d.say("Roles and Permissions"), { exact: true });
    await d.settle(300);
    const picked = await d.pickPerson(ctx.seed.STAFF[4].name);
    await d.settle(400);
    const body = await d.page.locator("body").innerText();
    const a = lang === "es" ? "Empleado del Mes" : "Employee of the Month";
    const b = lang === "es" ? "Publicar reconocimientos" : "Post shout-outs";
    results.check(KIND, id("the-roles-screen-names-the-two-capabilities"), picked && body.indexOf(a) >= 0 && body.indexOf(b) >= 0, "picked " + picked + ", " + say(a) + " " + (body.indexOf(a) >= 0) + ", " + say(b) + " " + (body.indexOf(b) >= 0));
  });
}


// ---- Section 3: what the API's Rounds 17, 18 and 21 gave the dashboard ----------------------------------------------
async function shapesCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/shapes/" + x;

  // 3.1 Inspection templates: a row shows its site and the test mark, and New Template sends siteId and isTest.
  await withDriver(ctx, { name: "templates", lang, arm: (s) => s.setScene413({ templates413: { "tp-1": { siteId: "s-1", isTest: true } } }) }, async (d) => {
    await goHash(d, "inspections");
    await click(d, "[data-inspections-tab='templates']");
    await until(d, "[data-template-row-site]", 6000);
    const site = await textOf(d, "[data-template-row-site='s-1']");
    const mark = await has(d, "[data-template-row-site='s-1'] [data-template-test-mark]");
    const other = await textOf(d, "[data-template-row-site='']");
    await d.page.getByRole("button", { name: d.say("New Template") }).first().click({ timeout: 4000 });
    await d.settle(300);
    await d.page.getByPlaceholder(d.say("e.g. Standard Office Cleaning")).fill("Robot check template");
    await d.page.locator("[data-template-site]").selectOption("s-3");
    await d.page.locator("[data-template-test]").check();
    const before = d.mark();
    await d.page.getByRole("button", { name: d.say("Create Template") }).first().click({ timeout: 4000 });
    await d.settle(600);
    const sent = writes(d, before, "POST", /^\/api\/inspections\/templates$/).map((c) => c.body);
    results.check(KIND, id("a-template-names-its-site-and-test-mark-and-sends-them"), /Harbor Point Center/.test(site) && mark && other === d.say("Every site") && sent.length === 1 && sent[0].siteId === "s-3" && sent[0].isTest === true,
      "row " + say(site) + ", test mark " + mark + ", untied row " + say(other) + ", sent " + say(sent));
  });

  // 3.2 The Library marks a test document.
  await withDriver(ctx, { name: "library", lang }, async (d) => {
    await goHash(d, "library");
    await until(d, "[data-library-doc='OCSA-TST-001']", 8000);
    const marked = await has(d, "[data-library-doc='OCSA-TST-001'] [data-library-test]");
    const others = await d.page.locator("[data-library-doc]:not([data-library-doc='OCSA-TST-001']) [data-library-test]").count();
    results.check(KIND, id("the-library-marks-a-test-document"), marked && others === 0, "marked " + marked + ", other documents marked " + others);
  });

  // 3.3 Health: each run's coverage on the list and whole in its window, and the two new numbers with their lists.
  await withDriver(ctx, { name: "health", lang, persona: "superAdmin" }, async (d) => {
    await goHash(d, "health/runs");
    await until(d, "[data-health-run-coverage]", 8000);
    const cell = await textOf(d, "[data-health-run-coverage]");
    const count = await attr(d, "[data-health-run-coverage]", "data-health-run-coverage");
    await click(d, "[data-health-run-row]");
    await until(d, "[data-health-coverage]", 6000);
    const apps = await d.page.locator("[data-health-coverage-app]").count();
    const notYet = await attr(d, "[data-health-coverage]", "data-health-coverage");
    await d.page.keyboard.press("Escape").catch(() => {});
    await goHash(d, "health");
    const wantLabel = lang === "es" ? "Listas de tareas que no cargaron sin se\u00f1al" : "Task lists that failed to load with no signal";
    const label = await soon(async () => (await d.page.locator("body").innerText()).indexOf(wantLabel) >= 0, 6000);
    results.check(KIND, id("a-run-reads-its-coverage-and-the-new-numbers-show"), /70/.test(cell) && /446/.test(cell) && count === "2" && apps === 2 && notYet === "2" && label,
      "the list's cell " + say(cell) + " (" + say(count) + " not yet), the window's apps " + apps + " and not yet " + say(notYet) + ", the offline number by its words " + label);
  });

  // 3.4 Announcements: a test office account's audience is the active test accounts alone.
  await withDriver(ctx, { name: "announcement", lang, arm: (s) => s.setScene413({ testOffice: true }) }, async (d) => {
    await goHash(d, "announcements");
    await until(d, "[data-announcement-test-audience]", 8000);
    const n = await attr(d, "[data-announcement-test-audience]", "data-announcement-test-audience");
    const choices = await d.page.getByRole("button", { name: d.say("Everyone"), exact: true }).count();
    await d.page.getByLabel(d.say("Title"), { exact: true }).fill("Robot check notice").catch(() => {});
    await d.page.getByLabel(d.say("Message"), { exact: true }).fill("A notice for the test accounts.").catch(() => {});
    const before = d.mark();
    await click(d, "[data-announcement-send]");
    const sent = writes(d, before, "POST", /^\/api\/announcements$/).map((c) => c.body && c.body.audience);
    results.check(KIND, id("a-test-office-account-announces-to-the-test-accounts"), n === "1" && choices === 0 && sent.length === 1 && sent[0].type === "users" && say(sent[0].userIds) === say(["u-staff-10"]),
      "audience " + say(n) + ", Everyone offered " + choices + ", sent " + say(sent));
  });

  // 3.5 Leave: the missing tab's count from one read of each list's total; a person's class in the API's sentence and
  // each balance's rule line.
  await withDriver(ctx, { name: "leave-totals", lang }, async (d) => {
    const mark = d.mark();
    await goHash(d, "leave");
    await until(d, "[data-filter-tab-count='missing']", 8000);
    await d.settle(500);
    const missingReads = reads(d, mark, /^\/api\/leave\/missing-(classes|hire-dates)$/).map((c) => c.query);
    const count = await textOf(d, "[data-filter-tab-count='missing']");
    results.check(KIND, id("the-missing-count-is-one-read-of-each-total"), missingReads.length === 2 && missingReads.every((q) => /limit=1(&|$)/.test(q)) && /^\d+$/.test(count) && Number(count) > 0,
      "reads " + say(missingReads) + ", the count " + say(count));
  });
  await withDriver(ctx, { name: "leave-person", lang }, async (d) => {
    await goHash(d, "leave/balances/u-staff-6");
    await until(d, "[data-leave-class-text]", 8000);
    const text = await textOf(d, "[data-leave-class-text]");
    const want = lang === "es" ? "Su tiempo libre sigue las reglas del personal de tiempo completo." : "Their time off follows the rules for full-time staff.";
    const line = await textOf(d, "[data-leave-line='paid_sick']");
    const wantLine = lang === "es" ? "1 hora por cada 40 horas trabajadas" : "1 hour for every 40 hours worked";
    results.check(KIND, id("a-persons-class-and-each-balances-rule-read-in-the-apis-words"), text === want && line.indexOf(wantLine) === 0, "class " + say(text) + ", sick line " + say(line));
  });

  // 3.6 Time off: the API's inside-notice line, and a day that is a holiday named.
  await withDriver(ctx, { name: "time-off", lang, arm: (s) => { s.setScene400({ newTypes: true, handbookKinds: true }); s.setScene413({ holidayOnFirstDay: true }); } }, async (d) => {
    await goHash(d, "schedule/timeoff/to-400");
    await until(d, "[data-time-off-window='to-400']", 8000);
    await d.settle(400);
    const line = await textOf(d, "[data-time-off-inside-notice-line]");
    const want = lang === "es" ? "Se pidi\u00f3 con menos aviso del que pide la pol\u00edtica. La oficina lo decide caso por caso." : "Asked with less notice than the policy asks. The office decides it case by case.";
    const holiday = await textOf(d, "[data-time-off-holiday]");
    const wantDay = lang === "es" ? "D\u00eda de los Ca\u00eddos" : "Memorial Day";
    results.check(KIND, id("a-request-reads-the-apis-notice-line-and-its-holiday"), line === want && holiday.indexOf(wantDay) >= 0, "line " + say(line) + ", holiday " + say(holiday));
  });

  // 3.7 Staff: an admin removes someone's photo, and the timeline reads the removal in plain words.
  await withDriver(ctx, { name: "photo", lang, arm: (s) => s.setScene413({ photoOn: "u-staff-7", timeline413: true }) }, async (d) => {
    await goHash(d, "staff/u-staff-7");
    await until(d, "[data-profile-photo-remove]", 8000);
    d.page.once("dialog", (dlg) => dlg.accept());
    const before = d.mark();
    await click(d, "[data-profile-photo-remove]");
    await d.settle(500);
    const sent = writes(d, before, "DELETE", /^\/api\/users\/profile\/photo$/).map((c) => c.body);
    await d.page.getByRole("button", { name: d.say("Timeline"), exact: true }).first().click({ timeout: 6000 }).catch(() => {});
    await until(d, "[data-timeline-action='profile_photo_removed']", 6000);
    const words = await textOf(d, "[data-timeline-action='profile_photo_removed']");
    results.check(KIND, id("an-admin-removes-a-photo-and-the-timeline-says-so"), sent.length === 1 && sent[0].userId === "u-staff-7" && words === d.say("Profile photo removed"), "sent " + say(sent) + ", timeline " + say(words));
  });

  // 3.8 Sign-in: features.maintenance as the options themselves skips the options read.
  await withDriver(ctx, { name: "features", lang, persona: null, arm: (s) => s.setScene413({ maintenanceObject: true }) }, async (d) => {
    const mark = d.mark();
    await d.signIn("admin");
    await d.settle(1200);
    const options = reads(d, mark, /^\/api\/maintenance-requests\/options$/).length;
    const item = await d.page.locator("text=" + d.say("Maintenance requests")).count();
    results.check(KIND, id("sign-in-reads-maintenance-from-features"), options === 0 && item > 0, "options read " + options + " time(s), the item " + (item > 0 ? "shown" : "missing"));
  });
}


// ---- Section 4: what the robot found, and its hooks -----------------------------------------------------------------
async function robotCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/robot/" + x;

  // 4.1 Supplies asks no labels.pdf as it opens for a supervisor.
  await withDriver(ctx, { name: "labels", lang, persona: "supervisor" }, async (d) => {
    const mark = d.mark();
    await goHash(d, "supplies");
    await d.settle(1500);
    const asked = d.callsSince(mark).filter((c) => c.path === "/api/supplies/labels.pdf").map((c) => c.query || "(nothing)");
    results.check(KIND, id("supplies-asks-no-labels-as-it-opens"), asked.length === 0, "labels.pdf asked " + say(asked));
  });

  // 4.2 New message for a supervisor whose search finds staff alone says No one matches.
  await withDriver(ctx, { name: "no-one-matches", lang, persona: "supervisor" }, async (d) => {
    await goHash(d, "chat");
    await d.page.getByRole("button", { name: d.say("New message") }).first().click({ timeout: 6000 });
    await until(d, "[data-new-message]", 4000);
    await d.page.locator("[data-new-message] input").first().fill("Tomasz");
    await d.settle(800);
    const none = await textOf(d, "[data-new-message-none]");
    results.check(KIND, id("new-message-says-no-one-matches"), none === d.say("No one matches."), "drew " + say(none));
  });

  // 4.3 Messages draws the test accounts' lines for a test office account.
  await withDriver(ctx, { name: "test-lines", lang, persona: "supervisor", arm: (s) => s.setScene413({ testOffice: true }) }, async (d) => {
    const mark = d.mark();
    await goHash(d, "chat");
    await d.settle(1200);
    const inbox = reads(d, mark, /^\/api\/chat\/dm-inbox$/).length;
    const section = await has(d, "[data-staff-to-office]");
    const line = (await d.page.locator("body").innerText()).indexOf("Bertrand Lefevre") >= 0;
    results.check(KIND, id("a-test-office-account-reads-the-test-lines"), inbox >= 1 && section && line, "inbox read " + inbox + " time(s), the section " + section + ", the test line " + line);
  });

  // 4.4 Hooks: windows carry data-window; the site profile's, Schedule's and Shift Pickup's tabs carry tab hooks; the
  // new page carries hooks on its tabs and windows. A hook changes nothing a person sees.
  await withDriver(ctx, { name: "hooks", lang }, async (d) => {
    await goHash(d, "schedule");
    await d.settle(600);
    const sched = await d.page.locator("[data-schedule-tab]").evaluateAll((els) => els.map((e) => e.getAttribute("data-schedule-tab")));
    await goHash(d, "marketplace");
    await d.settle(600);
    const pickup = await d.page.locator("[data-pickup-tab]").count();
    await d.page.getByRole("button", { name: d.say("Post Open Shift") }).first().click({ timeout: 4000 }).catch(() => {});
    const postWin = await attr(d, "[data-window]", "data-window");
    await d.page.keyboard.press("Escape").catch(() => {});
    await goHash(d, "staff/u-staff-7");
    await until(d, "[data-profile-tab]", 6000);
    const profile = await d.page.locator("[data-profile-tab]").count();
    await goHash(d, "recognition");
    await until(d, "[data-recognition-tab]", 6000);
    const recTabs = await d.page.locator("[data-recognition-tab]").count();
    results.check(KIND, id("windows-and-tabs-carry-their-hooks"), say(sched.slice(0, 3)) === say(["week", "month", "patterns"]) && pickup === 6 && postWin === "shift-marketplace-create-form" && profile >= 3 && recTabs === 2,
      "schedule tabs " + say(sched) + ", pickup tabs " + pickup + ", Post Open Shift's window " + say(postWin) + ", profile tabs " + profile + ", recognition tabs " + recTabs);
  });

  // 4.5 Every list search that pages its rows carries data-list-search, and Staff Management's filters before paging:
  // a person on the second page is found from the first by typing.
  await withDriver(ctx, { name: "list-search", lang }, async (d) => {
    await goHash(d, "staff");
    await until(d, "[data-list-search='staff']", 8000);
    await d.page.locator("[data-list-search='staff']").fill("Asante");
    await d.settle(500);
    const found = (await d.page.locator("body").innerText()).indexOf("Kwabena Asante") >= 0;
    await goHash(d, "sites");
    const sites = await until(d, "[data-list-search='sites']", 6000);
    await goHash(d, "library");
    const library = await until(d, "[data-list-search='library']", 6000);
    await goHash(d, "hr");
    const hr = await until(d, "[data-list-search='hr']", 6000);
    results.check(KIND, id("list-searches-carry-their-hook-and-filter-before-paging"), found && sites && library && hr, "a second-page person found " + found + ", sites " + sites + ", library " + library + ", hr " + hr);
  });
}

// ---- Section 5: the training admin ------------------------------------------------------------------------------
const PNG_ONE = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const TOPIC_NAMES = { "tp-1": { en: "Spill response", es: "Respuesta a derrames" }, "tp-2": { en: "Site orientation", es: "Orientaci\u00f3n en el sitio" }, "tp-3": { en: "Ladder use", es: "Uso de escaleras" } };
const NOTE_TITLE = { en: "Write this name in Title Case: every word starts with a capital letter, except small joining words.", es: "Escriba este nombre con may\u00fasculas iniciales: cada palabra empieza con may\u00fascula, salvo las palabras cortas de enlace." };
const API5 = {
  duplicateCourseKey: { en: "Another course already uses this key.", es: "Otro curso ya usa esta clave." },
  signedOutTaken: { en: "Another topic already opens without signing in. Only one can.", es: "Otro tema ya se abre sin iniciar sesi\u00f3n. Solo uno puede." },
  targetCount: { en: "Mark 1 to 10 right spots on the picture.", es: "Marque de 1 a 10 lugares correctos en la imagen." },
  badDetails: { en: "Some details are missing or not valid", es: "Faltan algunos datos o no son v\u00e1lidos" },
};
async function openTopic(d, lang, topicId) {
  await goHash(d, "hr/training/catalog");
  await until(d, "[data-training-catalog] table tbody tr", 8000);
  await d.page.locator("[data-training-catalog] table tbody tr").filter({ hasText: TOPIC_NAMES[topicId][lang] }).first().click().catch(() => {});
  return until(d, "[data-topic-details]", 6000);
}
async function typeIn(d, sel, v) { await d.page.locator(sel).first().fill(v); }

async function trainingCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/training/" + x;

  // 5.1 Courses: the tab lists each course with its chapters in order; a new course whose name is not in Title Case is
  // saved, its note is drawn beside the name in the API's words and the window stays open; fixing it closes the window.
  await withDriver(ctx, { name: "courses", lang }, async (d) => {
    await goHash(d, "hr/training/courses");
    await until(d, "[data-training-courses='2']", 8000);
    const listed = await d.page.locator("[data-course]").count();
    const order = await d.page.locator("[data-course='cr-1'] [data-course-row-chapter]").evaluateAll((els) => els.map((e) => e.getAttribute("data-course-row-chapter")));
    await click(d, "[data-course-new]");
    await until(d, "[data-window='course']", 5000);
    await typeIn(d, "[data-course-field='key']", "safety_basics");
    await typeIn(d, "[data-course-field='names.en']", "safety basics");
    await typeIn(d, "[data-course-field='names.es']", "Seguridad B\u00e1sica");
    const mark = d.mark();
    await click(d, "[data-course-save]");
    await until(d, "[data-window='course'] [data-course-note='names.en']", 5000);
    const post = writes(d, mark, "POST", /^\/api\/training\/courses$/).pop();
    const note = await textOf(d, "[data-window='course'] [data-course-note='names.en']");
    const stillOpen = await has(d, "[data-window='course']");
    await typeIn(d, "[data-course-field='names.en']", "Safety Basics");
    const mark2 = d.mark();
    await click(d, "[data-course-save]");
    await soon(async () => !(await has(d, "[data-window='course']")), 5000);
    const patch = writes(d, mark2, "PATCH", /^\/api\/training\/courses\/cr-new-1$/).pop();
    const closed = !(await has(d, "[data-window='course']"));
    const after = await d.page.locator("[data-course]").count();
    results.check(KIND, id("a-course-is-made-and-its-title-case-note-is-shown-gently"), listed === 2 && say(order) === say(["tp-2", "tp-1"]) && !!post && post.status === 201 && post.body && post.body.key === "safety_basics" && post.body.audience === "staff" && note === NOTE_TITLE[lang] && stillOpen && !!patch && patch.status === 200 && say(Object.keys(patch.body || {})) === say(["names"]) && closed && after === 3,
      "listed " + listed + " with chapters " + say(order) + "; the POST " + (post ? post.status + " " + say(post.body) : "never went") + ", its note " + say(note) + ", open " + stillOpen + "; the fix " + (patch ? patch.status + " " + say(patch.body) : "never went") + ", closed " + closed + ", " + after + " course(s)");
  });

  // 5.2 A key another course uses is refused 409 training.duplicateCourseKey, in the API's words, at the key field.
  await withDriver(ctx, { name: "course-key", lang }, async (d) => {
    await goHash(d, "hr/training/courses");
    await until(d, "[data-course-new]", 8000);
    await click(d, "[data-course-new]");
    await typeIn(d, "[data-course-field='key']", "staff_app");
    await typeIn(d, "[data-course-field='names.en']", "Another Course");
    await click(d, "[data-course-save]");
    await until(d, "[data-course-refusal='key']", 5000);
    const words = await textOf(d, "[data-course-refusal='key']");
    results.check(KIND, id("a-key-already-used-is-refused-at-the-key-field"), words === API5.duplicateCourseKey[lang] && (await has(d, "[data-window='course']")), "the key field reads " + say(words));
  });

  // 5.3 Chapters: dragged into place, then moved with Up and Down, one added, and saved as a set in that order; each
  // chapter's Title Case note is drawn beside it and the window stays open to show them.
  await withDriver(ctx, { name: "chapters", lang }, async (d) => {
    await goHash(d, "hr/training/courses");
    await until(d, "[data-course-chapters-open='cr-1']", 8000);
    await click(d, "[data-course-chapters-open='cr-1']");
    await until(d, "[data-window='course-chapters'] [data-course-chapter='tp-1']", 5000);
    await d.page.locator("[data-course-chapter='tp-1']").dragTo(d.page.locator("[data-course-chapter='tp-2']")).catch(() => {});
    await d.settle(200);
    const dragged = await d.page.locator("[data-course-chapter]").evaluateAll((els) => els.map((e) => e.getAttribute("data-course-chapter")));
    await d.page.locator("[data-course-chapter-pick]").first().selectOption("tp-3");
    await click(d, "[data-course-chapter-add]");
    await click(d, "[data-course-chapter-up='tp-3']");
    await click(d, "[data-course-chapter-down='tp-1']");
    const keyed = await d.page.locator("[data-course-chapter]").evaluateAll((els) => els.map((e) => e.getAttribute("data-course-chapter")));
    const mark = d.mark();
    await click(d, "[data-course-chapters-save]");
    await until(d, "[data-course-note='topics.0.names.en']", 5000);
    const put = writes(d, mark, "PUT", /^\/api\/training\/courses\/cr-1\/topics$/).pop();
    const notes = await d.page.locator("[data-window='course-chapters'] [data-course-note]").count();
    const note = await textOf(d, "[data-window='course-chapters'] [data-course-note]");
    await d.closeModal();
    const listed = await d.page.locator("[data-course='cr-1'] [data-course-row-chapter]").evaluateAll((els) => els.map((e) => e.getAttribute("data-course-row-chapter")));
    const want = ["tp-3", "tp-1", "tp-2"];
    results.check(KIND, id("chapters-are-ordered-by-dragging-and-by-up-and-down"), say(dragged) === say(["tp-1", "tp-2"]) && say(keyed) === say(want) && !!put && put.status === 200 && say(put.body && put.body.topicIds) === say(want) && notes >= 3 && note === d.say("English") + ": " + NOTE_TITLE[lang] && say(listed) === say(want),
      "dragged " + say(dragged) + ", then " + say(keyed) + "; the PUT " + (put ? put.status + " " + say(put.body) : "never went") + "; " + notes + " note(s), the first " + say(note) + "; the list " + say(listed));
  });

  // 5.4 A player draft on a safety topic (Spill response): New player draft opens the editor; a screen with a video, a
  // choice check and a tap check are written; Save sends the content, and the API's problem for a tap check with no
  // target is drawn at its field; a target drawn by dragging on the picture is saved and the draft has no problem left;
  // Translate fills the Spanish; Preview plays it in a phone frame; Publish goes.
  await withDriver(ctx, { name: "player", lang }, async (d) => {
    await openTopic(d, lang, "tp-1");
    await click(d, "[data-topic-tab='lesson']");
    await until(d, "[data-lesson-new='player']", 6000);
    const mark0 = d.mark();
    await click(d, "[data-lesson-new='player']");
    await until(d, "[data-player-editor]", 6000);
    const made = writes(d, mark0, "POST", /^\/api\/training\/lessons\/tp-1\/draft$/).pop();
    await click(d, "[data-player-screen-add]");
    await typeIn(d, "[data-lesson-path='screens.0.say.en'] textarea", "Wear gloves before you clean a spill.");
    await d.page.locator("[data-player-media-kind='0']").first().selectOption("video");
    await d.page.locator("[data-player-upload='screen-video-0']").setInputFiles({ name: "gloves.mp4", mimeType: "video/mp4", buffer: Buffer.from("00000020667479706d703432", "hex") });
    await until(d, "[data-player-screen-video='0']", 5000);
    const video = await has(d, "[data-player-screen-video='0']");
    await click(d, "[data-player-check-add]");
    await typeIn(d, "[data-lesson-path='checks.0.prompt.en'] input", "What do you put on first?");
    await typeIn(d, "[data-lesson-path='checks.0.options.0.text.en'] input", "Gloves");
    await typeIn(d, "[data-lesson-path='checks.0.options.1.text.en'] input", "A hat");
    await d.page.locator("[data-player-correct='0:0']").check();
    await click(d, "[data-player-check-add]");
    await d.page.locator("[data-player-check-kind='1']").first().selectOption("tap");
    await typeIn(d, "[data-lesson-path='checks.1.prompt.en'] input", "Tap the gloves.");
    await d.page.locator("[data-player-upload='tap-1']").setInputFiles({ name: "gloves.png", mimeType: "image/png", buffer: PNG_ONE });
    await until(d, "[data-tap-picture]", 5000);
    await typeIn(d, "[data-lesson-path='acknowledgement.en'] textarea", "I watched the lesson.");
    const mark1 = d.mark();
    await click(d, "[data-player-save]");
    await until(d, "[data-lesson-field-problem='checks.1.targets']", 5000);
    const save1 = writes(d, mark1, "PATCH", /^\/api\/training\/lesson-drafts\/pl-1$/).pop();
    const problem = await textOf(d, "[data-lesson-field-problem='checks.1.targets']");
    await d.page.locator("[data-tap-picture]").first().evaluate((el) => el.scrollIntoView({ block: "center" }));
    await d.settle(200);
    const box = await d.page.locator("[data-tap-picture]").first().boundingBox();
    if (box) {
      await d.page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
      await d.page.mouse.down();
      await d.page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.45, { steps: 6 });
      await d.page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.7, { steps: 6 });
      await d.page.mouse.up();
    }
    await d.settle(200);
    const targets = await d.page.locator("[data-tap-target]").count();
    const mark2 = d.mark();
    await click(d, "[data-player-save]");
    await d.settle(400);
    const save2 = writes(d, mark2, "PATCH", /^\/api\/training\/lesson-drafts\/pl-1$/).pop();
    const c2 = save2 && save2.body && save2.body.content;
    const tg = c2 && c2.checks && c2.checks[1] && c2.checks[1].targets && c2.checks[1].targets[0];
    const targetOk = !!tg && Math.abs(tg.x - 0.2) < 0.05 && Math.abs(tg.y - 0.3) < 0.05 && Math.abs(tg.w - 0.4) < 0.05 && Math.abs(tg.h - 0.4) < 0.05;
    const shapeOk = !!c2 && c2.screens.length === 1 && c2.screens[0].media.kind === "video" && /^video\//.test(c2.screens[0].media.path) && c2.checks[0].kind === "choice" && c2.checks[0].correct === "a" && c2.checks[0].after === c2.screens[0].key && c2.checks[1].kind === "tap" && /^lessons\//.test((c2.checks[1].image || {}).path || "");
    const left = await d.page.locator("[data-lesson-problem]").count();
    const mark4 = d.mark();
    await click(d, "[data-player-translate]");
    await d.settle(300);
    const translated = writes(d, mark4, "POST", /^\/api\/training\/lesson-drafts\/pl-1\/translate$/).pop();
    const esSay = await d.page.locator("[data-lesson-path='screens.0.say.es'] textarea").first().inputValue().catch(() => "");
    await click(d, "[data-player-preview-open]");
    await until(d, "[data-window='player-preview'] [data-player-phone]", 5000);
    const steps = await attr(d, "[data-player-preview]", "data-player-preview");
    const first = await attr(d, "[data-player-preview-screen]", "data-player-preview-screen");
    await click(d, "[data-player-preview-next]");
    const check = await attr(d, "[data-player-preview-check]", "data-player-preview-check");
    await click(d, "[data-player-preview-close]");
    const mark3 = d.mark();
    await click(d, "[data-player-publish]");
    await d.settle(400);
    const pub = writes(d, mark3, "POST", /^\/api\/training\/lesson-drafts\/pl-1\/publish$/).pop();
    results.check(KIND, id("a-player-draft-is-written-saved-and-shows-its-problem-at-the-field"), !!made && made.body && made.body.kind === "player" && video && !!save1 && save1.status === 200 && problem === API5.targetCount[lang] && shapeOk,
      "the draft " + (made ? say(made.body) : "never made") + ", video " + video + ", the first save " + (save1 ? save1.status : "never went") + " with the target problem " + say(problem) + ", content " + (shapeOk ? "as written" : say(c2).slice(0, 300)));
    results.check(KIND, id("a-tap-target-drawn-by-dragging-is-saved"), targets === 1 && targetOk, targets + " target(s) drawn, saved " + say(tg));
    results.check(KIND, id("the-preview-plays-the-draft-in-a-phone-frame-and-it-publishes"), left === 0 && !!translated && say(translated.body) === say({ overwrite: false }) && esSay === "Wear gloves before you clean a spill. (es)" && steps === "3" && !!c2 && first === c2.screens[0].key && check === c2.checks[0].key && !!pub && pub.status === 200,
      left + " problem(s) left, Translate " + (translated ? say(translated.body) : "never went") + " gave " + say(esSay) + "; the preview " + say([steps, first, check]) + "; publish " + (pub ? pub.status : "never went"));
  });

  // 5.5 The setup chapter's switch: a second topic is refused 409 training.signedOutTaken in the API's words, with the
  // topic that holds it named; switched off there, it switches on here.
  await withDriver(ctx, { name: "signed-out", lang }, async (d, stubs) => {
    await openTopic(d, lang, "tp-1");
    await until(d, "[data-topic-signed-out]", 5000);
    const before = await attr(d, "[data-topic-signed-out]", "data-topic-signed-out");
    await click(d, "[data-topic-signed-out-switch]");
    await until(d, "[data-topic-signed-out-refusal]", 5000);
    const words = await textOf(d, "[data-topic-signed-out-refusal]");
    const want = API5.signedOutTaken[lang] + " " + fill(d.say("{0} opens before sign-in now."), TOPIC_NAMES["tp-2"][lang]);
    await openTopic(d, lang, "tp-2");
    await until(d, "[data-topic-signed-out='on']", 5000);
    await click(d, "[data-topic-signed-out-switch]");
    await until(d, "[data-topic-signed-out='off']", 5000);
    await openTopic(d, lang, "tp-1");
    await until(d, "[data-topic-signed-out='off']", 5000);
    const mark = d.mark();
    await click(d, "[data-topic-signed-out-switch]");
    await until(d, "[data-topic-signed-out='on']", 5000);
    const patch = writes(d, mark, "PATCH", /^\/api\/training\/topics\/tp-1$/).pop();
    const now = await attr(d, "[data-topic-signed-out]", "data-topic-signed-out");
    const role = await attr(d, "[data-topic-signed-out-switch]", "role");
    results.check(KIND, id("the-setup-chapter-switch-names-the-topic-that-holds-it"), before === "off" && words === want && !!patch && say(patch.body) === say({ opensSignedOut: true }) && patch.status === 200 && now === "on" && role === "switch" && stubs.model413().s5.signedOut === "tp-1",
      "before " + say(before) + ", the refusal " + say(words) + " (want " + say(want) + "), the PATCH " + (patch ? patch.status + " " + say(patch.body) : "never went") + ", now " + say(now));
  });

  // 5.6 The certificate signer (Settings, Training): asked first with the new name; a missing title refused at its field;
  // the new signer saved with the signature PNG and shown.
  await withDriver(ctx, { name: "signer", lang }, async (d) => {
    await goHash(d, "settings");
    await until(d, "[data-settings-tab='training']", 8000);
    await click(d, "[data-settings-tab='training']");
    await until(d, "[data-signer-none]", 5000);
    const none = await has(d, "[data-signer-none]");
    await click(d, "[data-signer-change]");
    await until(d, "[data-window='certificate-signer']", 5000);
    await typeIn(d, "[data-signer-field='name']", "Test Signer");
    await d.page.locator("[data-signer-signature-file]").setInputFiles({ name: "signature.png", mimeType: "image/png", buffer: PNG_ONE });
    await until(d, "[data-signer-signature-preview]", 4000);
    await click(d, "[data-signer-save]");
    await until(d, "[data-signer-confirm]", 4000);
    const asked = await textOf(d, "[data-signer-confirm]");
    const mark = d.mark();
    await click(d, "[data-signer-confirm-go]");
    await until(d, "[data-signer-refusal='title']", 5000);
    const refused = await textOf(d, "[data-signer-refusal='title']");
    const first = writes(d, mark, "PUT", /^\/api\/training\/certificate-signer$/).pop();
    await typeIn(d, "[data-course-field='title.en']", "Operations Manager");
    await click(d, "[data-signer-save]");
    await until(d, "[data-signer-confirm-go]", 4000);
    const mark2 = d.mark();
    await click(d, "[data-signer-confirm-go]");
    await until(d, "[data-signer-name]", 5000);
    const put = writes(d, mark2, "PUT", /^\/api\/training\/certificate-signer$/).pop();
    const name = await textOf(d, "[data-signer-name]");
    const sig = await attr(d, "[data-signer-signature]", "data-signer-signature");
    results.check(KIND, id("the-signer-window-asks-first-and-refuses-a-missing-title-at-its-field"), none && asked.indexOf(fill(d.say("Make {0} the signer of every certificate from now on?"), "Test Signer")) >= 0 && !!first && first.status === 400 && refused === API5.badDetails[lang],
      "none at first " + none + ", asked " + say(asked) + ", the first PUT " + (first ? first.status : "never went") + " with " + say(refused));
    results.check(KIND, id("a-new-signer-is-saved-with-the-signature-and-shown"), !!put && put.status === 200 && put.body && put.body.name === "Test Signer" && put.body.title && put.body.title.en === "Operations Manager" && /^data:image\/png;base64,/.test(put.body.signature || "") && name === "Test Signer" && sig === "on-file",
      "the PUT " + (put ? put.status + " " + say(Object.assign({}, put.body, { signature: put.body && put.body.signature ? "(png)" : null })) : "never went") + ", the panel " + say([name, sig]));
  });

  // 5.7 Reset tries: one person's tries at one topic (asked first), then Reset everyone's tries behind RESET typed.
  await withDriver(ctx, { name: "reset-tries", lang, arm: (s) => s.setScene413({ outOfTries: [{ userId: "u-staff-7", topicId: "tp-1" }, { userId: "u-staff-9", topicId: "tp-3" }] }) }, async (d) => {
    await goHash(d, "hr/training/gaps");
    await until(d, "[data-out-of-tries='3']", 8000);
    const rows = await attr(d, "[data-out-of-tries]", "data-out-of-tries");
    const mark = d.mark();
    await click(d, "[data-out-of-tries] [data-reset-tries='u-staff-7:tp-1']");
    const asked = (await d.confirms()).pop() || "";
    await until(d, "[data-out-of-tries='2']", 5000);
    const one = writes(d, mark, "POST", /^\/api\/training\/attempts\/reset-tries$/).pop();
    const toast = await d.waitToast(5000).then(() => d.toast()).catch(() => null);
    await click(d, "[data-reset-everyone-open]");
    await until(d, "[data-window='reset-everyone']", 4000);
    const outCount = await attr(d, "[data-reset-everyone]", "data-reset-everyone");
    await typeIn(d, "[data-reset-everyone-typed]", "reset");
    const lowerHeld = await d.page.locator("[data-reset-everyone-go]").first().isDisabled();
    await typeIn(d, "[data-reset-everyone-typed]", "RESET");
    const mark2 = d.mark();
    await click(d, "[data-reset-everyone-go]");
    await until(d, "[data-out-of-tries='0']", 5000);
    const all = writes(d, mark2, "POST", /^\/api\/training\/attempts\/reset-tries$/).pop();
    results.check(KIND, id("one-person-s-tries-are-reset-after-asking"), rows === "3" && !!one && say(one.body) === say({ userId: "u-staff-7", topicId: "tp-1" }) && one.status === 200 && asked.indexOf(TOPIC_NAMES["tp-1"][lang]) >= 0 && !!toast && toast.indexOf(d.sayCount ? d.sayCount("{0} failed try voided and kept on record.|count", 3) : "3") >= 0,
      "rows " + say(rows) + ", asked " + say(asked) + ", the POST " + (one ? one.status + " " + say(one.body) : "never went") + ", the toast " + say(toast));
    results.check(KIND, id("reset-everyone-waits-for-reset-typed"), outCount === "1" && lowerHeld && !!all && say(all.body) === say({ all: true }) && all.status === 200 && (await has(d, "[data-out-of-tries='0']")),
      "the window counts " + say(outCount) + ", lower case held " + lowerHeld + ", the POST " + (all ? all.status + " " + say(all.body) : "never went"));
  });

  // 5.8 HR Records: a course certificate opens through the certificates route and is sent again after asking.
  await withDriver(ctx, { name: "hr-certificate", lang }, async (d) => {
    await goHash(d, "hr/u-staff-7");
    await until(d, "[data-certificate-resend='tc-1']", 8000);
    const label = (await textOf(d, "body")).indexOf(d.say("Course certificates")) >= 0;
    const mark = d.mark();
    await d.page.locator("[data-folder-open='ed-cert-1']").first().click().catch(() => {});
    await d.settle(600);
    const pdf = reads(d, mark, /^\/api\/training\/certificates\/tc-1\/pdf$/).pop();
    const mark2 = d.mark();
    await click(d, "[data-certificate-resend='tc-1']");
    const asked = (await d.confirms()).pop() || "";
    const toast = await d.waitToast(5000).then(() => d.toast()).catch(() => null);
    const resend = writes(d, mark2, "POST", /^\/api\/training\/certificates\/tc-1\/resend$/).pop();
    results.check(KIND, id("a-course-certificate-opens-and-is-sent-again-from-hr-records"), label && !!pdf && pdf.status === 200 && asked.length > 0 && !!resend && resend.status === 200 && toast === d.say("The certificate was emailed."),
      "the category " + (label ? "named" : "not named") + ", the PDF " + (pdf ? pdf.status : "never read") + ", asked " + say(asked) + ", the resend " + (resend ? resend.status : "never went") + ", the toast " + say(toast));
  });

  // 5.9 Health: the lesson screens waiting for their voice, each with its language and length.
  await withDriver(ctx, { name: "narration", lang, persona: "superAdmin" }, async (d) => {
    await goHash(d, "health");
    await until(d, "[data-health-number='narration_waiting']", 8000);
    await d.page.locator("[data-health-number='narration_waiting']").first().click().catch(() => {});
    await until(d, "[data-health-list='narration_waiting'] td", 6000);
    const list = await textOf(d, "[data-health-list='narration_waiting']");
    const heads = await d.page.locator("[data-health-list='narration_waiting'] th").allInnerTexts();
    results.check(KIND, id("health-lists-the-lesson-screens-waiting-for-their-voice"), heads.map((x) => x.trim().toLowerCase()).indexOf(d.say("Characters").toLowerCase()) >= 0 && list.indexOf("182") >= 0 && list.indexOf("Espa\u00f1ol") >= 0,
      "the columns " + say(heads) + ", the list " + say(list.slice(0, 200)));
  });
}

async function run(ctx) {
  const only = (process.env.PART413_ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
  const want = (k) => !only.length || only.indexOf(k) >= 0;
  for (const lang of LANGS) {
    if (process.env.AUDIT_LANG && process.env.AUDIT_LANG !== lang) continue;
    if (want("award")) await awardCases(ctx, lang);
    if (want("wall")) await wallCases(ctx, lang);
    if (want("shoutouts")) await shoutoutCases(ctx, lang);
    if (want("named")) await namedCases(ctx, lang);
    if (want("shapes")) await shapesCases(ctx, lang);
    if (want("robot")) await robotCases(ctx, lang);
    if (want("training")) await trainingCases(ctx, lang);
  }
}

module.exports = { run };
