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
const until = async (d, sel, ms) => { await d.page.locator(sel).first().waitFor({ timeout: ms || 6000 }).catch(() => {}); return has(d, sel); };
const attr = async (d, sel, name) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? l.getAttribute(name) : null; };
const textOf = async (d, sel) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? (await l.innerText()).trim() : ""; };
const writes = (d, mark, method, re) => d.callsSince(mark).filter((c) => c.method === method && re.test(c.path));
const reads = (d, mark, re) => d.callsSince(mark).filter((c) => c.method === "GET" && re.test(c.path));
const thrown = (d, from) => d.pageErrors.slice(from || 0).filter((e) => !/^console: Failed to load resource/.test(e));
const soon = async (fn, ms) => { const end = Date.now() + (ms || 4000); while (Date.now() < end) { if (await fn()) return true; await wait(100); } return !!(await fn()); };
const click = async (d, sel) => { await d.page.locator(sel).first().click({ timeout: 4000 }); await d.settle(400); };
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
    const want = lang === "es" ? "Este reconocimiento ya se retiró." : "This shout-out was already taken down.";
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
    const wantLabel = lang === "es" ? "Listas de tareas que no cargaron sin señal" : "Task lists that failed to load with no signal";
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
    const want = lang === "es" ? "Se pidió con menos aviso del que pide la política. La oficina lo decide caso por caso." : "Asked with less notice than the policy asks. The office decides it case by case.";
    const holiday = await textOf(d, "[data-time-off-holiday]");
    const wantDay = lang === "es" ? "Día de los Caídos" : "Memorial Day";
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
  }
}

module.exports = { run };
