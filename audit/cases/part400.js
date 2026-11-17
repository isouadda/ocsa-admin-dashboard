// Round 12 (part 400): the handbook's holidays, the union flag, who is missing a class or a hire date, the new types,
// and Round 15's shapes, against the stub as the API is built at ocsa-api main 3df0967 (audit/part400-stub.js, over
// audit/part397-stub.js), armed as the API is built (setApiAsBuilt) with Round 2's file log (setStep353), part 364's
// answers (setStep364) and the holidays (setStep247). Each case runs in English and in Spanish, and each fails on main
// as it stood at 0dab722 unless its name says it is a guard.
//
//   holidays   the year lists the handbook's nine, each labeled the handbook's, the Day After Thanksgiving set by its
//              rule and listed once, and no Eid; the add window says the nine are listed already. Guards: an office
//              day keeps Edit and Retire, and an office day on a handbook day is refused in the API's words
//   union      Edit Site Details' Union site switch and its help line, a save that sends isUnion, the refusal drawn
//              under the switch, and the mark on the site's page and in the sites list
//   missing    one list of who is missing a class or a hire date, each person once with what is missing, a count beside
//              the tab, the way to the profile, and the class on each leave person head. A guard: an API without
//              missing-classes lists the people with no hire date as before
//   leave      a policy's rules with their classes and caps, fixed on the handbook; the editor's new fields; the new
//              types by name with the inside-notice mark and the unit; the caps and the ADP line on balances; an hours
//              file's yearCapReached. Guards: the old types read as they did, and the CSV is the API's
//   shapes     a number's brief copied as the API answers it, the block from the page when it fails (labelEn, the
//              floor from lines.minRequests, people), canRescind deciding Rescind, leftOut on Checklist Results, and
//              sign-in's six features. Guards: an API with no leftOut and one with no six features, as before
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "part400";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const LANGS = ["en", "es"];
const say = (x) => JSON.stringify(x);
const fill = (s, ...v) => String(s).replace(/\{(\d+)\}/g, (m, n) => (v[Number(n)] !== undefined ? String(v[Number(n)]) : m));
const BRAND = "OCSA";

async function goHash(d, h) {
  await d.page.evaluate(() => { window.location.hash = "overview"; });
  await wait(150);
  await d.page.evaluate((x) => { window.location.hash = x; }, h);
  await d.settle(700);
}
const has = async (d, sel) => (await d.page.locator(sel).count()) > 0;
const count = async (d, sel) => d.page.locator(sel).count();
const until = async (d, sel, ms) => { await d.page.locator(sel).first().waitFor({ timeout: ms || 6000 }).catch(() => {}); return has(d, sel); };
const attr = async (d, sel, name) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? l.getAttribute(name) : null; };
const textOf = async (d, sel) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? (await l.innerText()).trim() : ""; };
// The words as written, whatever case a badge or a label draws them in.
const contentOf = async (d, sel) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? String(await l.evaluate((e) => e.textContent)).replace(/\s+/g, " ").trim() : ""; };
const textsOf = async (d, sel) => d.page.locator(sel).evaluateAll((els) => els.map((e) => e.innerText.trim()));
const attrsOf = async (d, sel, name) => d.page.locator(sel).evaluateAll((els, n) => els.map((e) => e.getAttribute(n)), name);
const reads = (d, mark, re) => d.callsSince(mark).filter((c) => c.method === "GET" && re.test(c.path));
const writes = (d, mark, method, re) => d.callsSince(mark).filter((c) => c.method === method && re.test(c.path));
const thrown = (d, from) => d.pageErrors.slice(from || 0).filter((e) => !/^console: Failed to load resource/.test(e));

// One driver on a stub of its own, armed with the API as built, Round 2's file log, part 364 and the holidays.
async function withDriver(ctx, o, fn) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setApiAsBuilt(true);
  stubs.setStep353(true);
  stubs.setStep364(true);
  stubs.setStep247(true);
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

// ---- Section 1: the Holidays tab -------------------------------------------------------------------------------------
async function openHolidays(d) {
  await goHash(d, "settings");
  await d.page.getByRole("button", { name: d.say("Holidays"), exact: true }).click().catch(() => {});
  await until(d, "[data-holidays] table tbody tr", 8000);
  await d.settle(400);
}
async function holidayCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/holidays/" + x;

  // 1. The year lists the handbook's nine, each labeled the handbook's with Set by the handbook in place of its buttons,
  //    the office's own day labeled the office's, and no Eid.
  await withDriver(ctx, { name: "nine", lang }, async (d) => {
    await openHolidays(d);
    const kinds = await attrsOf(d, "[data-holidays] [data-holiday-kind]", "data-holiday-kind");
    const words = await textsOf(d, "[data-holidays] [data-holiday-kind='handbook']");
    const office = await textsOf(d, "[data-holidays] [data-holiday-kind='office']");
    const rows = await textsOf(d, "[data-holidays] table tbody tr");
    const set = rows.filter((r) => r.indexOf(d.say("Set by the handbook")) >= 0).length;
    const eid = rows.filter((r) => /eid/i.test(r)).length;
    const hb = kinds.filter((k) => k === "handbook").length;
    results.check(KIND, id("the-year-lists-the-handbook-s-nine"), hb === 9 && words.every((w) => w === d.say("Handbook|holiday")) && office.length === 1 && office[0] === d.say("Office|holiday") && set === 9 && eid === 0,
      hb + " handbook day(s) read " + say(words.slice(0, 2)) + ", the office's " + say(office) + ", " + set + " read Set by the handbook, " + eid + " name an Eid");
  });

  // 2. The Day After Thanksgiving is one of the nine, set by its rule, and listed once though the office's own row for it
  //    was retired at the API's merge.
  await withDriver(ctx, { name: "day-after", lang }, async (d) => {
    await openHolidays(d);
    const key = "[data-holidays] [data-holiday-key='dayAfterThanksgiving']";
    const n = await count(d, key);
    const rule = await textOf(d, key + " [data-holiday-rule]");
    const kind = await attr(d, key, "data-holiday-row");
    const named = (await textsOf(d, "[data-holidays] table tbody tr")).filter((r) => r.indexOf(lang === "es" ? "Día después de Acción de Gracias" : "Day After Thanksgiving") >= 0).length;
    const want = d.say("Set by the handbook's rule: the Friday after Thanksgiving.");
    results.check(KIND, id("the-day-after-thanksgiving-is-the-handbook-s-by-its-rule"), n === 1 && kind === "handbook" && rule === want && named === 1,
      n + " row(s) for it, marked " + say(kind) + ", reading " + say(rule) + " (want " + say(want) + "); " + named + " row(s) name it");
  });

  // 3. Add a holiday says the nine are listed already.
  await withDriver(ctx, { name: "add-window", lang }, async (d) => {
    await openHolidays(d);
    await d.page.locator("[data-holiday-add]").click().catch(() => {});
    await until(d, "[data-holiday-window]", 4000);
    const said = await textOf(d, "[data-holiday-window] [data-holiday-window-help]");
    const intro = await textOf(d, "[data-holidays] [data-holidays-intro]");
    const want = fill(d.say("The handbook's nine holidays are listed already. Add any other day {0} closes."), BRAND);
    const wantIntro = fill(d.say("{0} observes the nine paid holidays its handbook names, listed here each year as the handbook sets them. Add any other day {0} closes."), BRAND);
    results.check(KIND, id("the-add-window-says-the-nine-are-listed"), said === want && intro === wantIntro, "the window says " + say(said) + "; the tab says " + say(intro));
  });

  // 4. A guard: the office's own day keeps Edit and Retire.
  await withDriver(ctx, { name: "office-day", lang }, async (d) => {
    await openHolidays(d);
    const row = d.page.locator("[data-holidays] table tbody tr").filter({ hasText: "Christmas Eve" }).first();
    const buttons = (await row.count()) ? await row.locator("button").evaluateAll((els) => els.map((e) => e.innerText.trim())) : [];
    results.check(KIND, id("guard-an-office-day-keeps-edit-and-retire"), buttons.indexOf(d.say("Edit")) >= 0 && buttons.indexOf(d.say("Retire")) >= 0, "its buttons " + say(buttons));
  });

  // 5. A guard: an office day on one of the nine is refused in the API's words, and the window stays open.
  await withDriver(ctx, { name: "on-the-nine", lang }, async (d) => {
    await openHolidays(d);
    await d.page.locator("[data-holiday-add]").click().catch(() => {});
    await until(d, "[data-holiday-window]", 4000);
    await d.page.locator('[data-holiday-window] input[type="date"]').fill("2026-11-27");
    await d.page.locator("[data-holiday-window] input").nth(1).fill("Day After Thanksgiving");
    const mark = d.mark();
    await d.page.locator("[data-holiday-window] button").last().click().catch(() => {});
    await d.settle(600);
    const post = writes(d, mark, "POST", /^\/api\/holidays$/).pop();
    const said = await textOf(d, "[data-holiday-window] [data-holiday-refusal]");
    const want = lang === "es" ? "Esa fecha ya es un día festivo: Día después de Acción de Gracias" : "That date is already a holiday: Day After Thanksgiving";
    results.check(KIND, id("guard-an-office-day-on-the-nine-is-refused-in-the-api-s-words"), !!post && post.status === 409 && said === want, "the add answered " + say(post && post.status) + "; it reads " + say(said));
  });
}

// ---- Section 2: the union flag ---------------------------------------------------------------------------------------
const S1 = seed.SITES[0].id;
const S2 = seed.SITES[1].id;
async function openSiteEdit(d, siteId) {
  await goHash(d, "sites/" + siteId);
  await d.page.getByRole("button", { name: d.say("Edit Details"), exact: true }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await d.page.getByRole("button", { name: d.say("Edit Details"), exact: true }).first().click().catch(() => {});
  await until(d, "[data-site-union-field]", 5000);
}
async function unionCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/union/" + x;

  // 1. Edit Site Details holds the Union site switch with its help line; switched on and saved, it sends isUnion true, and
  //    the site's page marks it a union site.
  await withDriver(ctx, { name: "switch", lang }, async (d) => {
    await openSiteEdit(d, S1);
    const field = await has(d, "[data-site-union-switch]");
    const was = field ? await d.page.locator("[data-site-union-switch]").isChecked() : null;
    const help = await textOf(d, "[data-site-union-field] > div");
    await d.page.locator("[data-site-union-switch]").check().catch(() => {});
    const mark = d.mark();
    await d.page.getByRole("button", { name: d.say("Save"), exact: true }).last().click().catch(() => {});
    await d.settle(900);
    const patch = writes(d, mark, "PATCH", new RegExp("^/api/sites/" + S1 + "$")).pop();
    await until(d, "[data-site-union='" + S1 + "']", 4000);
    const mark2 = await contentOf(d, "[data-site-union='" + S1 + "']");
    const want = fill(d.say("People at a union site follow their agreement, and {0}'s vacation and personal days are never offered to them."), BRAND);
    results.check(KIND, id("the-union-site-switch-saves-and-marks-the-site"), field && was === false && help === want && !!patch && patch.body && patch.body.isUnion === true && patch.status === 200 && mark2 === d.say("Union site"),
      (field ? "the switch read " + say(was) : "no switch") + ", its help " + say(help) + "; the save sent " + say(patch && patch.body && patch.body.isUnion) + " (" + say(patch && patch.status) + "); the page marks " + say(mark2));
  });

  // 2. The API's refusal of isUnion is drawn under the switch, in its words, and the window stays open.
  await withDriver(ctx, { name: "refused", lang, arm: (s) => s.setRefusal([{ method: "PATCH", path: "/api/sites/" + S1, status: 400, code: "sites.unionBoolean", error: lang === "es" ? "Sitio sindicalizado es sí o no" : "Union site is yes or no", body: { keys: ["isUnion"] } }]) }, async (d) => {
    await openSiteEdit(d, S1);
    await d.page.locator("[data-site-union-switch]").check().catch(() => {});
    await d.page.getByRole("button", { name: d.say("Save"), exact: true }).last().click().catch(() => {});
    await d.settle(800);
    const said = await textOf(d, "[data-site-refusal='isUnion']");
    const open = await has(d, "[data-site-union-field]");
    const want = lang === "es" ? "Sitio sindicalizado es sí o no" : "Union site is yes or no";
    results.check(KIND, id("a-refused-union-flag-is-drawn-under-the-switch"), said === want && open, "under the switch " + say(said) + (open ? "" : "; the window closed"));
  });

  // 3. A union site is marked in the sites list and on its page.
  await withDriver(ctx, { name: "marks", lang, arm: (s) => s.setScene400({ unionSite: S2 }) }, async (d) => {
    await goHash(d, "sites");
    await until(d, "[data-site-union]", 6000);
    const listed = await attrsOf(d, "[data-site-union]", "data-site-union");
    await goHash(d, "sites/" + S2);
    await until(d, "[data-site-union='" + S2 + "']", 6000);
    const page = await contentOf(d, "[data-site-union='" + S2 + "']");
    results.check(KIND, id("a-union-site-is-marked-in-the-list-and-on-its-page"), listed.length === 1 && listed[0] === S2 && page === d.say("Union site"), "the list marks " + say(listed) + "; the page reads " + say(page));
  });
}

// ---- Section 3: who is missing a class or a hire date -----------------------------------------------------------------
async function missingCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/missing/" + x;

  // 1. One list: each person once, with what is missing and what waits on it.
  await withDriver(ctx, { name: "list", lang }, async (d) => {
    const mark = d.mark();
    await goHash(d, "leave/missing");
    await until(d, "[data-leave-missing]", 8000);
    await d.settle(400);
    const ids = await attrsOf(d, "[data-leave-missing]", "data-leave-missing");
    const what = await attrsOf(d, "[data-leave-missing]", "data-leave-missing-what");
    const notOffered = await textOf(d, "tr:has([data-leave-missing='u-staff-5']) [data-leave-missing-not-offered]");
    const tab = await textOf(d, "[data-filter-tab='missing']");
    const both = reads(d, mark, /^\/api\/leave\/missing-(classes|hire-dates)$/).map((c) => c.path.split("/").pop());
    const want = fill(d.say("Not offered: {0}"), [d.say("Vacation"), d.say("Personal day")].join(", "));
    results.check(KIND, id("one-list-names-each-person-once-with-what-is-missing"), say(ids) === say(["u-staff-10", "u-staff-5"]) && say(what) === say(["class,hireDate", "class"]) && notOffered === want
      && tab.indexOf(d.say("Missing class or hire date")) === 0 && both.indexOf("missing-classes") >= 0 && both.indexOf("missing-hire-dates") >= 0,
      "it lists " + say(ids) + " missing " + say(what) + "; Tomasz's line " + say(notOffered) + " (want " + say(want) + "); the tab " + say(tab) + "; it read " + say(both));
  });

  // 2. The count beside the tab, read when the page opens, before the tab is.
  await withDriver(ctx, { name: "count", lang }, async (d) => {
    await goHash(d, "leave");
    await until(d, "[data-filter-tab-count='missing']", 8000);
    const n = await textOf(d, "[data-filter-tab-count='missing']");
    results.check(KIND, id("a-count-beside-the-tab"), n === "2", "the tab's count " + say(n));
  });

  // 3. Open the profile goes to the person's profile, where both are set.
  await withDriver(ctx, { name: "profile", lang }, async (d) => {
    await goHash(d, "leave/missing");
    await until(d, "[data-leave-missing-open='u-staff-5']", 8000);
    await d.page.locator("[data-leave-missing-open='u-staff-5']").click().catch(() => {});
    await d.settle(500);
    const at = await d.page.evaluate(() => window.location.hash);
    results.check(KIND, id("open-the-profile-for-a-person-with-no-class"), at.indexOf("#staff/u-staff-5") === 0, "it opened " + say(at));
  });

  // 4. Each leave person head carries the class: a balances row and the ledger window.
  await withDriver(ctx, { name: "heads", lang }, async (d) => {
    await goHash(d, "leave");
    await until(d, "[data-leave-row='u-staff-8']", 8000);
    const row = await textOf(d, "[data-leave-row='u-staff-8']");
    await goHash(d, "leave/balances/u-staff-5");
    await until(d, "[data-leave-person-head]", 8000);
    const head = await textOf(d, "[data-leave-person-head]");
    results.check(KIND, id("each-leave-person-head-carries-the-class"), row.indexOf(d.say("Part Time")) >= 0 && head.indexOf(d.say("No class on file")) >= 0, "the row reads " + say(row) + "; the ledger's head " + say(head));
  });

  // 5. A guard: an API without missing-classes lists the people with no hire date as before.
  await withDriver(ctx, { name: "before", lang, arm: (s) => s.setScene400({ noMissingClasses: true }) }, async (d) => {
    await goHash(d, "leave/missing");
    await until(d, "[data-leave-missing]", 8000);
    await d.settle(300);
    const ids = await attrsOf(d, "[data-leave-missing]", "data-leave-missing");
    const text = await textOf(d, "[data-leave-tab='missing'] table tbody tr");
    results.check(KIND, id("guard-an-api-without-missing-classes-lists-hire-dates"), say(ids) === say(["u-staff-10"]) && text.indexOf(d.say("Paid sick leave")) >= 0, "it lists " + say(ids) + " reading " + say(text));
  });
}

// ---- Section 4: policies, requests and balances -------------------------------------------------------------------------
async function leaveCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/leave/" + x;

  // 1. The handbook policy's rules: who each is for, the new method in plain words, the hire year's hours and the caps,
  //    under Its rules, fixed by the handbook; and no Edit.
  await withDriver(ctx, { name: "rules", lang }, async (d) => {
    await goHash(d, "leave/policies");
    await until(d, "[data-leave-policy-card='lp-1']", 8000);
    await d.page.locator("[data-leave-policy-card='lp-1']").click().catch(() => {});
    await until(d, "[data-leave-policy-rules]", 6000);
    const rules = await attrsOf(d, "[data-leave-policy-rules] [data-leave-policy-rule]", "data-leave-policy-rule-classes");
    const all = await contentOf(d, "[data-leave-policy-rules]");
    const vacation = await textOf(d, "[data-leave-policy-rules] [data-leave-policy-rule='vacation']");
    const edit = await has(d, "[data-leave-policy-edit]");
    const want = [d.say("Its rules, fixed by the handbook"), d.say("On the work anniversary each tier is reached, then each January 1"), fill(d.say("At most {0} earned a year"), fill(d.say("{0} h"), 40)),
      fill(d.say("At most {0} used a year"), fill(d.say("{0} h"), 40)), fill(d.say("For: {0}"), d.say("Full-time staff"))];
    const missing = want.filter((w) => all.indexOf(w) < 0);
    results.check(KIND, id("the-handbook-s-rules-name-their-classes-and-caps"), say(rules) === say(["full_time", "full_time", "part_time,none,union", "full_time"]) && missing.length === 0 && vacation.indexOf(d.say("Vacation")) === 0 && !edit,
      "rules for " + say(rules) + "; missing " + say(missing) + (edit ? "; Edit is offered" : ""));
  });

  // 2. The editor: a rule for some classes with the hire year's hours and the caps, and the new method, sent as the API
  //    reads them.
  await withDriver(ctx, { name: "editor", lang }, async (d) => {
    await goHash(d, "leave/policies");
    await until(d, "[data-leave-policy-new]", 8000);
    await d.page.locator("[data-leave-policy-new]").click().catch(() => {});
    await until(d, "[data-leave-policy-editor]", 5000);
    await d.page.locator("[data-leave-editor='name']").fill("Part-time agreement");
    const rule = "[data-leave-editor-rule='0']";
    const methods = await d.page.locator(rule + " [data-leave-rule='method'] option").evaluateAll((els) => els.map((e) => e.value));
    await d.page.locator(rule + " [data-leave-rule='amount']").fill("24");
    await d.page.locator(rule + " [data-leave-rule='hireYearPerHours']").fill("30").catch(() => {});
    await d.page.locator(rule + " [data-leave-rule='yearCap']").fill("24").catch(() => {});
    await d.page.locator(rule + " [data-leave-rule='useCap']").fill("24").catch(() => {});
    await d.page.locator(rule + " [data-leave-rule-class='part_time']").check().catch(() => {});
    const offered = await attrsOf(d, rule + " [data-leave-rule-class]", "data-leave-rule-class");
    const mark = d.mark();
    await d.page.locator("[data-leave-editor-save]").click().catch(() => {});
    await d.settle(800);
    const post = writes(d, mark, "POST", /^\/api\/leave\/policies$/).pop();
    const r0 = post && post.body && Array.isArray(post.body.rules) ? post.body.rules[0] : {};
    results.check(KIND, id("the-editor-sends-classes-the-hire-year-and-the-caps"), methods.indexOf("anniversary_then_january_1") >= 0 && say(offered) === say(["full_time", "part_time", "supplemental", "none"]) && !!post && post.status === 201
      && say(r0.classes) === say(["part_time"]) && r0.hireYearPerHours === 30 && r0.yearCap === 24 && r0.useCap === 24,
      "methods " + say(methods.slice(-2)) + ", classes offered " + say(offered) + "; it sent " + say(r0) + " (" + say(post && post.status) + ")");
  });

  // 3. The request list: Vacation, Personal day and Bereavement by name, the inside-notice mark, and whole days.
  await withDriver(ctx, { name: "list", lang, arm: (s) => s.setScene400({ newTypes: true }) }, async (d) => {
    await goHash(d, "schedule/timeoff");
    await until(d, "[data-time-off-type='vacation']", 8000);
    await d.settle(300);
    const types = {};
    for (const k of ["vacation", "personal", "bereavement"]) types[k] = (await textOf(d, "[data-time-off-type='" + k + "']")).split("\n")[0].trim();
    const marks = await count(d, "[data-time-off-inside-notice]");
    const vac = await textOf(d, "tr:has([data-time-off-type='vacation']) [data-time-off-amount]");
    const want = { vacation: d.say("Vacation"), personal: d.say("Personal day"), bereavement: d.say("Bereavement") };
    results.check(KIND, id("the-new-types-read-by-name-with-their-mark-and-unit"), say(types) === say(want) && marks === 1 && vac === d.say("Whole days"),
      "the types read " + say(types) + " (want " + say(want) + "), " + marks + " inside-notice mark(s), the vacation's amount " + say(vac));
  });

  // 4. A request filed inside its notice: its window says so, shows the unit, reads its balance in days and the ADP line.
  await withDriver(ctx, { name: "window", lang, arm: (s) => s.setScene400({ newTypes: true, handbookKinds: true }) }, async (d) => {
    await goHash(d, "schedule/timeoff/to-400");
    await until(d, "[data-time-off-window='to-400']", 8000);
    await d.settle(300);
    const line = await textOf(d, "[data-time-off-inside-notice-line]");
    const unit = await attr(d, "[data-time-off-unit]", "data-time-off-unit");
    const balance = await textOf(d, "[data-time-off-balance]");
    const adp = await textOf(d, "[data-time-off-window] [data-leave-adp]");
    const wantAdp = lang === "es" ? "Esta es la cifra de la aplicación. El autoservicio de ADP tiene el saldo oficial." : "This is the app's figure. ADP self-service holds the official balance.";
    const days = fill(d.say("{0} days ({1})"), "3", fill(d.say("{0} h"), 24));
    results.check(KIND, id("a-request-inside-its-notice-says-so-in-its-window"), line === d.say("Filed inside its notice. Decide it case by case.") && unit === "days" && balance.indexOf(days) >= 0 && adp === wantAdp,
      "the line " + say(line) + ", the unit " + say(unit) + ", the balance " + say(balance) + " (want it to hold " + say(days) + "), the ADP line " + say(adp));
  });

  // 5. A guard: the types filed before read as they did.
  await withDriver(ctx, { name: "old-types", lang }, async (d) => {
    await goHash(d, "schedule/timeoff");
    await d.page.getByRole("button", { name: d.say("All"), exact: true }).first().click().catch(() => {});
    await until(d, "[data-time-off-type='pto']", 8000);
    const pto = (await textOf(d, "[data-time-off-type='pto']")).split("\n")[0].trim();
    const sick = (await textOf(d, "[data-time-off-type='paid_sick']")).split("\n")[0].trim();
    results.check(KIND, id("guard-the-old-types-read-as-they-did"), pto === d.say("PTO (paid time off)") && sick === d.say("Paid sick leave"), "PTO reads " + say(pto) + ", sick " + say(sick));
  });

  // 6. Balances: the ADP line once above the list and a ledger's balances, and each balance's caps.
  await withDriver(ctx, { name: "balances", lang }, async (d) => {
    await goHash(d, "leave");
    await until(d, "[data-leave-row]", 8000);
    const top = await textsOf(d, "[data-leave-tab='balances'] [data-leave-adp]");
    await goHash(d, "leave/balances/u-staff-8");
    await until(d, "[data-leave-person] [data-leave-cap]", 8000);
    const caps = await textsOf(d, "[data-leave-person] [data-leave-cap='paid_sick']");
    const inWindow = await count(d, "[data-leave-person] [data-leave-adp]");
    const wantAdp = lang === "es" ? "Esta es la cifra de la aplicación. El autoservicio de ADP tiene el saldo oficial." : "This is the app's figure. ADP self-service holds the official balance.";
    const wantCaps = [fill(d.say("At most {0} earned a year"), fill(d.say("{0} h"), 40)), fill(d.say("At most {0} used a year"), fill(d.say("{0} h"), 40))];
    results.check(KIND, id("balances-carry-the-adp-line-once-and-their-caps"), top.length === 1 && top[0] === wantAdp && inWindow === 1 && say(caps) === say(wantCaps),
      "above the list " + say(top) + "; the ledger's caps " + say(caps) + " (want " + say(wantCaps) + "), " + inWindow + " ADP line(s) in it");
  });

  // 7. A guard: Download CSV is the API's own export, official_balance column and all.
  await withDriver(ctx, { name: "csv", lang }, async (d) => {
    await goHash(d, "leave");
    await until(d, "[data-leave-download]", 8000);
    const mark = d.mark();
    await d.page.locator("[data-leave-download]").click().catch(() => {});
    await d.settle(900);
    const asked = reads(d, mark, /^\/api\/leave\/balances$/).filter((c) => /format=csv/.test(c.query));
    const head = asked.length && asked[0].bytes ? asked[0].bytes.toString("utf8").split("\r\n")[0] : asked.length && typeof asked[0].json === "string" ? asked[0].json.split("\n")[0] : "";
    results.check(KIND, id("guard-the-csv-is-the-api-s-export"), asked.length === 1 && asked[0].status === 200, "the export was read " + asked.length + " time(s)" + (head ? ", its first line " + say(head.slice(-40)) : ""));
  });

  // 8. An hours file's line whose year's cap is reached reads so in plain words.
  await withDriver(ctx, { name: "year-cap", lang, arm: (s) => s.setScene400({ yearCap: ["u-staff-7"] }) }, async (d) => {
    await goHash(d, "leave/hours");
    await until(d, "[data-leave-file-upload]", 8000);
    await d.page.locator("[data-leave-file-upload]").click().catch(() => {});
    await until(d, "[data-leave-hours-window]", 4000);
    await d.page.locator('[data-leave-hours-window] input[type="file"]').setInputFiles({ name: "march.csv", mimeType: "text/csv", buffer: Buffer.from("person,period_start,period_end,hours\n4118,2026-03-01,2026-03-14,90\n", "utf8") });
    await d.settle(300);
    await d.page.locator("[data-leave-file-check]").click().catch(() => {});
    await d.settle(700);
    const outcome = await attr(d, "[data-leave-file-outcome]", "data-leave-file-outcome");
    const said = await textOf(d, "[data-leave-file-outcome]");
    const want = d.say("The year's most is already earned, so nothing posted");
    results.check(KIND, id("an-hours-file-line-past-the-year-s-cap-reads-so"), outcome === "yearCapReached" && said === want, "the line's outcome " + say(outcome) + " reads " + say(said) + " (want " + say(want) + ")");
  });
}

// ---- Section 5: Round 15's shapes ----------------------------------------------------------------------------------------
const COMMIT = "c0ffee5eed0123456789abcdef0123456789abcd";
const ASCII = /^[\n\x20-\x7e]*$/;
async function letClipboard(d) { await d.page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(d.page.url()).origin }).catch(() => {}); }
const clipboard = (d) => d.page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
async function copyAt(d, at) {
  await d.waitToastGone(4000);
  await d.page.evaluate(() => navigator.clipboard.writeText("").catch(() => {}));
  await d.page.locator("[data-copy-for-claude-button='" + at + "']").first().click().catch(() => {});
  const toast = await d.waitToast(5000).then(() => d.toast()).catch(() => null);
  await d.settle(200);
  return { toast, text: await clipboard(d) };
}
const linesOf = (text) => String(text || "").split("\n");
async function openSheet(d, key) {
  await goHash(d, "health");
  await until(d, "[data-health-number='" + key + "']", 8000);
  await d.settle(400);
  await letClipboard(d);
  await d.page.locator("[data-health-number='" + key + "']").first().click().catch(() => {});
  await until(d, "[data-copy-for-claude-button='" + key + "']", 6000);
}
async function openWarning(d, name) {
  await goHash(d, "discipline");
  await until(d, "table tbody tr", 8000);
  await d.page.locator("table tbody tr", { hasText: name }).first().click().catch(() => {});
  await until(d, "[data-warning-send], [data-warning-rescind-open]", 6000);
  await d.settle(600);
}
const SIX = [["equipment", "/api/equipment"], ["periodic", "/api/periodic-work"], ["tickets", "/api/support/tickets"], ["leave", "/api/leave/policies"], ["devices", "/api/users/me/trusted-devices"]];
async function shapeCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/shapes/" + x;

  // 1. A number's drill-down sheet copies the API's brief for that number and day, exactly as it answers.
  await withDriver(ctx, { name: "number-brief", lang, persona: "superAdmin" }, async (d, stubs) => {
    await openSheet(d, "slowest_p95_ms");
    const mark = d.mark();
    const { text, toast } = await copyAt(d, "slowest_p95_ms");
    const read = reads(d, mark, /^\/api\/health\/numbers\/slowest_p95_ms\/brief$/);
    const served = stubs.model400().briefs.filter((b) => b.key === "slowest_p95_ms").pop();
    const L = linesOf(text);
    const want = ["OCSA Health brief", "A number, read from the Health page (no incident)", "Number: Slowest route (95th percentile) (slowest_p95_ms), ms", "API commit: " + COMMIT];
    const missing = want.filter((w) => L.indexOf(w) < 0);
    results.check(KIND, id("a-number-s-sheet-copies-the-api-s-brief"), read.length === 1 && /day=2026-03-17/.test(read[0].query) && !!served && text === served.text && missing.length === 0 && ASCII.test(text) && toast === d.say("Copied for Claude. Paste it into the chat."),
      "the brief was read " + read.length + " time(s) " + say(read.map((c) => c.query)) + "; the clipboard " + (served && text === served.text ? "matches" : "does not match") + " what the API answered, misses " + say(missing) + "; the toast " + say(toast));
  });

  // 2. A brief that fails is built from the page: the API's English name in every language, the floor from the number's
  //    own lines with no thresholds read.
  await withDriver(ctx, { name: "fallback", lang, persona: "superAdmin", arm: (s) => s.setScene400({ numberBriefFails: true }) }, async (d) => {
    await openSheet(d, "slowest_p95_ms");
    const mark = d.mark();
    const { text } = await copyAt(d, "slowest_p95_ms");
    const L = linesOf(text);
    const th = reads(d, mark, /^\/api\/health\/thresholds$/).length;
    const want = ["OCSA Health brief", "Number: slowest_p95_ms", "Name: Slowest route (95th percentile)", "Floor: a route counts once it served 20 requests in the day", "API commit: " + COMMIT];
    const missing = want.filter((w) => L.indexOf(w) < 0);
    results.check(KIND, id("a-failed-brief-is-built-with-the-api-s-name-and-floor"), missing.length === 0 && th === 0 && ASCII.test(text), "missing " + say(missing) + "; thresholds read " + th + " time(s); it reads " + say(text.slice(0, 300)));
  });

  // 3. The list's people decides: a list that names people or sites is counted with the API's word for it.
  await withDriver(ctx, { name: "people", lang, persona: "superAdmin", arm: (s) => s.setScene400({ numberBriefFails: true }) }, async (d) => {
    await openSheet(d, "failed_sign_ins");
    const { text } = await copyAt(d, "failed_sign_ins");
    const L = linesOf(text);
    const counted = L.filter((x) => / naming (people or sites|a person or a site), names left out$/.test(x));
    results.check(KIND, id("a-list-of-people-or-sites-is-counted-by-the-api-s-people"), counted.length === 1, "it reads " + say(L.filter((x) => x.indexOf("- ") === 0)));
  });

  // 4. A guard: the issuer of a warning about a test account is offered Rescind, as part 393 offered it from the people
  //    the page reads, with no read of the HR summary.
  await withDriver(ctx, { name: "rescind-guard", lang, persona: "supervisor", arm: (s) => s.setScene393({ testWarning: true }) }, async (d) => {
    const mark = d.mark();
    await openWarning(d, "Bertrand Lefevre");
    const offered = await has(d, "[data-warning-rescind-open]");
    const summary = reads(d, mark, /^\/api\/hr\/employees-summary$/).length;
    results.check(KIND, id("guard-the-issuer-of-a-test-account-s-warning-is-offered-rescind"), offered && summary === 0, (offered ? "Rescind is offered" : "Rescind is not offered") + "; the HR summary was read " + summary + " time(s)");
  });

  // 5. canRescind decides Rescind: the same issuer is offered it when the API says so, though neither the people list nor
  //    the HR summary answers, so the page cannot tell the person is a test account.
  const blind = [{ method: "GET", path: "/api/users", status: 403, code: "access.insufficientPermissions", error: "Insufficient permissions" },
    { method: "GET", path: "/api/hr/employees-summary", status: 403, code: "access.insufficientPermissions", error: "Insufficient permissions" }];
  await withDriver(ctx, { name: "can-rescind", lang, persona: "supervisor", arm: (s) => { s.setScene393({ testWarning: true }); s.setRefusal(blind); } }, async (d) => {
    await openWarning(d, "Bertrand Lefevre");
    const open = await has(d, "[data-warning-send]") || await has(d, "[data-warning-rescind-open]") || await d.modalOpen();
    const offered = await has(d, "[data-warning-rescind-open]");
    results.check(KIND, id("can-rescind-decides-rescind"), open && offered, open ? (offered ? "Rescind is offered" : "Rescind is not offered") : "the warning did not open");
  });

  // 6. Checklist Results: leftOut names the test site, which has no card, and the line above the cards says so.
  await withDriver(ctx, { name: "left-out", lang, arm: (s) => { s.setChecklist358(true); s.setScene379({ testSite: true }); s.setScene400({ testSite: seed.SITES[2].id }); } }, async (d) => {
    await goHash(d, "checklist/all/today");
    await until(d, "[data-cr-site-card]", 8000);
    await d.settle(800);
    const cards = await attrsOf(d, "[data-cr-site-card]", "data-cr-site-card");
    const line = await textOf(d, "[data-cr-left-out]");
    const words = lang === "es" ? "1 sitio de prueba queda fuera de estos conteos, como de todos los informes." : "1 test site is left out of these counts, as it is of every report.";
    results.check(KIND, id("a-test-site-left-out-has-no-card-and-is-said"), cards.indexOf(seed.SITES[2].id) < 0 && cards.length === 2 && line === words && thrown(d).length === 0,
      "cards for " + say(cards) + "; the line " + say(line) + " (want " + say(words) + ")");
  });

  // 7. A guard: an API with no leftOut has the test site's card say so, as part 393 drew it.
  await withDriver(ctx, { name: "no-left-out", lang, arm: (s) => { s.setChecklist358(true); s.setScene379({ testSite: true }); s.setScene393({ testSite: seed.SITES[2].id }); s.setScene400({ noLeftOut: true }); } }, async (d) => {
    await goHash(d, "checklist/all/today");
    await until(d, "[data-cr-test-site]", 8000);
    const card = await has(d, "[data-cr-test-site='" + seed.SITES[2].id + "']");
    const line = await has(d, "[data-cr-left-out]");
    results.check(KIND, id("guard-an-api-without-left-out-draws-the-test-site-s-card"), card && !line, (card ? "" : "no test site card") + (line ? "; a left-out line is drawn" : ""));
  });

  // 8. Sign-in sets the six from features and reads none of their lists; a feature the API says no to keeps its item
  //    off though its list would answer.
  const signIn = async (name, arm) => {
    let out = null;
    await withDriver(ctx, { name, lang, arm }, async (d, stubs) => {
      await d.settle(1500);
      const items = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-nav-item]")).map((b) => b.getAttribute("data-nav-item")));
      out = { read: SIX.filter(([, p]) => stubs.calls.some((c) => c.method === "GET" && c.path === p)).map(([k]) => k), items: ["equipment", "periodic", "tickets", "maintenance", "leave"].filter((x) => items.indexOf(x) >= 0) };
    });
    return out || { read: ["(the run threw)"], items: [] };
  };
  const six = await signIn("six", (s) => s.setScene400({ features: { leave: false } }));
  results.check(KIND, id("sign-in-sets-the-six-from-features"), six.read.length === 0 && say(six.items) === say(["equipment", "periodic", "tickets", "maintenance"]),
    "sign-in read " + say(six.read) + "; the side panel offers " + say(six.items));

  // 9. A guard: an API with no six features has their lists read, as before.
  const before = await signIn("no-six", (s) => s.setScene400({ noSixFeatures: true }));
  results.check(KIND, id("guard-an-api-without-the-six-has-their-lists-read"), before.read.length === 5 && before.items.length === 5, "sign-in read " + say(before.read) + "; the side panel offers " + say(before.items));
}

// ctx.only, when a runner names sections, keeps the run to them.
async function run(ctx) {
  const want = (x) => !ctx.only || ctx.only.indexOf(x) >= 0;
  for (const lang of LANGS) {
    if (want("holidays")) await holidayCases(ctx, lang);
    if (want("union")) await unionCases(ctx, lang);
    if (want("missing")) await missingCases(ctx, lang);
    if (want("leave")) await leaveCases(ctx, lang);
    if (want("shapes")) await shapeCases(ctx, lang);
  }
}

module.exports = { run };
