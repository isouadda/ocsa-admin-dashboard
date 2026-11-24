// Round 14 (part 413): Employee of the Month, shout-outs, the training admin, and what the API's Rounds 17, 18 and 21 and the
// robot's Rounds 6 and 7 left waiting, against the stub as the API is built at ocsa-api main 06b6d1b (#171) with the part413
// layer (audit/part413-stub.js). Each case runs in English and in Spanish, and each fails on main as it stood at c3f8b3d
// unless its name says it is a guard.
//
//   award       post the month's winner with a photo (a JPEG made smaller, a HEIC sent as it is) and without one (the
//               initials in a gold circle), an earlier month that tells nobody, the month taken, edit in the month and
//               the API's refusal once it has closed, take down with a reason, the certificate in each language, the
//               reason in three languages with Translating, and the timeline's plain words
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
    await until(d, "[data-award-certificate-open]", 8000);
    for (const pick of ["", "en", "es", "fr"]) {
      await d.page.locator("[data-award-certificate-lang]").selectOption(pick);
      await click(d, "[data-award-certificate-open]");
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

async function run(ctx) {
  const only = (process.env.PART413_ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
  const want = (k) => !only.length || only.indexOf(k) >= 0;
  for (const lang of LANGS) {
    if (process.env.AUDIT_LANG && process.env.AUDIT_LANG !== lang) continue;
    if (want("award")) await awardCases(ctx, lang);
  }
}

module.exports = { run };
