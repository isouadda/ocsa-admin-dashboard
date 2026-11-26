// Round 15 (part 420): find a person by typing everywhere, link a record without an id, and the OCSA ID, against the
// stub with the part420 layer (audit/part420-stub.js) under its scene round23. Each case runs in English and in
// Spanish, and each fails on main as it stood at d127988 unless its name says it is a guard.
//
//   pickers     section 1: a Jotform submission linked to a person found by part of a name, by OCSA ID and by badge;
//               two people with one name told apart by their rows and the Same name mark; Add Alias and Per-person
//               permissions found by typing
"use strict";
const { createStubs } = require("../stubs");

const KIND = "part420";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const LANGS = ["en", "es"];
const say = (x) => JSON.stringify(x);
const BRAND = "OCSA";

async function goHash(d, h) {
  await d.page.evaluate(() => { window.location.hash = "overview"; });
  await wait(150);
  await d.page.evaluate((x) => { window.location.hash = x; }, h);
  await d.settle(700);
}
const has = async (d, sel) => (await d.page.locator(sel).count()) > 0;
const until = async (d, sel, ms) => { await d.page.locator(sel).first().waitFor({ timeout: d.missed ? 800 : ms || 6000 }).catch(() => {}); return has(d, sel); };
const textOf = async (d, sel) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? (await l.innerText()).trim() : ""; };
const writes = (d, mark, method, re) => d.callsSince(mark).filter((c) => c.method === method && re.test(c.path));
const reads = (d, mark, re) => d.callsSince(mark).filter((c) => c.method === "GET" && re.test(c.path));
const thrown = (d, from) => d.pageErrors.slice(from || 0).filter((e) => !/^console: Failed to load resource/.test(e));
const click = async (d, sel) => { await d.page.locator(sel).first().click({ timeout: d.missed ? 800 : 4000 }); await d.settle(400); };
// A step that cannot be taken (on main, the button or field is not there) is noted and skipped, and the waits after it
// are short, so every check still reports what it saw under its own name and none throws. Reads pass through.
const ACTIONS = ["click", "fill", "selectOption", "check", "uncheck", "setInputFiles", "press", "type", "isDisabled", "isEnabled", "isChecked", "evaluate", "inputValue"];
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

// One driver on a stub of its own, armed with the API as built and the part420 layer's round23.
async function withDriver(ctx, o, fn) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setApiAsBuilt(true);
  stubs.setStep353(true);
  stubs.setStep364(true);
  stubs.setScene413({ round21: true });
  stubs.setScene420(Object.assign({ round23: true }, o.scene || {}));
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

// ---- A person picker, driven the way a person drives it --------------------------------------------------------------
// Open the picker inside sel, type what is asked, and read the rows it offers: each row's id, its text, the line under
// its name and whether it carries the Same name mark.
async function typeInPicker(d, sel, text) {
  await click(d, sel + " [data-person-pick-field]");
  await d.page.locator(sel + " [data-person-pick-search]").fill(text);
  await d.settle(300);
  const rows = d.page.locator(sel + " [data-person-pick-box] [data-person-pick-option]");
  const out = [];
  const n = await rows.count();
  for (let i = 0; i < n; i += 1) {
    const r = rows.nth(i);
    const id = await r.getAttribute("data-person-pick-option");
    if (!id) continue;
    const detail = r.locator("[data-person-pick-detail]");
    out.push({ id, text: (await r.innerText()).trim(), detail: (await detail.count()) ? (await detail.innerText()).trim() : "", same: (await r.locator("[data-person-pick-same]").count()) > 0 });
  }
  return out;
}
const pickRow = async (d, sel, id) => { await click(d, sel + " [data-person-pick-box] [data-person-pick-option='" + id + "']"); };
const idWord = (d) => d.say("{0} ID|the number the office gives a person").replace("{0}", BRAND);
const rowLine = (d, p) => [p.employee_id ? d.say("{0} ID {1}|the number the office gives a person").replace("{0}", BRAND).replace("{1}", p.employee_id) : "", p.badge_number ? d.say("Badge {0}").replace("{0}", p.badge_number) : ""].filter(Boolean).join(", ");

// The Jotform inbox, a submission's window opened by its View.
async function openSubmission(d, id) {
  await goHash(d, "forms");
  await click(d, "[data-forms-tab='jotform']");
  await click(d, "[data-jot-section='inbox']");
  await until(d, "[data-sub-view='" + id + "']", 6000);
  await click(d, "[data-sub-view='" + id + "']");
  return until(d, "[data-window='forms-detail-sub']", 5000);
}
const LINK_USER = "[data-window='forms-detail-sub'] [data-sub-link-person]";

// ---- Section 1: every people dropdown is the searchable picker -------------------------------------------------------
async function pickerCases(ctx, lang) {
  const { results, seed } = ctx;
  const id = (x) => KIND + "/" + lang + "/pickers/" + x;
  const staff = (sid) => seed.STAFF.find((s) => s.id === sid);

  // 1. Part of a name finds the one person, whose row carries their OCSA ID and badge, and picking links the
  // submission to them as before, PATCH /api/jotform/submissions/:id/user.
  for (const c of [
    { key: "part-of-a-name", who: "u-staff-7", typed: (p) => p.last_name.slice(0, 5) },
    { key: "ocsa-id", who: "u-staff-8", typed: (p) => p.employee_id },
    { key: "badge", who: "u-staff-9", typed: (p) => p.badge_number },
  ]) {
    await withDriver(ctx, { name: "link-by-" + c.key, lang }, async (d) => {
      const p = staff(c.who);
      const opened = await openSubmission(d, "js-3");
      const offered = await typeInPicker(d, LINK_USER, c.typed(p));
      const mark = d.mark();
      await pickRow(d, LINK_USER, c.who);
      const patch = writes(d, mark, "PATCH", /^\/api\/jotform\/submissions\/js-3\/user$/).pop();
      await until(d, "[data-sub-matched='" + c.who + "']", 4000);
      const matched = await has(d, "[data-sub-matched='" + c.who + "']");
      const line = offered.length ? offered[0].detail : "";
      results.check(KIND, id("a-submission-is-linked-to-a-person-found-by-" + c.key),
        opened && offered.length === 1 && offered[0].id === c.who && line === rowLine(d, p) && !!patch && say(patch.body) === say({ user_id: c.who }) && patch.status === 200 && matched && thrown(d).length === 0,
        "window " + opened + ", typed " + say(c.typed(p)) + " and was offered " + say(offered.map((r) => r.id + " " + r.detail)) + " where the row should read " + say(rowLine(d, p))
          + ", the link " + (patch ? patch.status + " " + say(patch.body) : "never went") + ", matched " + matched);
    });
  }

  // 2. Two active people with one first and last name, one of them Jr: both rows say Same name, each with its own OCSA ID
  // and badge, and the one picked is the one linked.
  await withDriver(ctx, { name: "same-name", lang }, async (d, stubs) => {
    const pair = stubs.sameName420();
    await openSubmission(d, "js-3");
    const offered = await typeInPicker(d, LINK_USER, pair[0].last_name);
    const mark = d.mark();
    await pickRow(d, LINK_USER, pair[1].id);
    const patch = writes(d, mark, "PATCH", /^\/api\/jotform\/submissions\/js-3\/user$/).pop();
    const byId = (x) => offered.find((r) => r.id === x.id) || null;
    const both = pair.every((x) => { const r = byId(x); return !!r && r.same && r.detail === rowLine(d, x); });
    const others = offered.filter((r) => pair.every((x) => x.id !== r.id));
    results.check(KIND, id("two-people-with-one-name-are-told-apart-by-their-rows-and-the-same-name-mark"),
      offered.length === 2 && both && others.length === 0 && byId(pair[0]).detail !== byId(pair[1]).detail && !!patch && say(patch.body) === say({ user_id: pair[1].id }),
      "offered " + say(offered) + ", the link " + (patch ? say(patch.body) : "never went"));
  });

  // 3. A person with a name nobody else holds carries no mark (a guard: main draws no mark anywhere).
  await withDriver(ctx, { name: "no-mark", lang }, async (d) => {
    await openSubmission(d, "js-3");
    const offered = await typeInPicker(d, LINK_USER, staff("u-staff-10").last_name);
    results.check(KIND, id("guard-a-name-nobody-else-holds-carries-no-same-name-mark"), offered.every((r) => !r.same),
      "offered " + say(offered));
  });

  // 4. Maintenance, Aliases, Add Alias: the User is found by typing, and the alias is added for that person.
  await withDriver(ctx, { name: "alias", lang }, async (d, stubs) => {
    const p = staff("u-staff-6");
    await goHash(d, "forms");
    await click(d, "[data-forms-tab='jotform']");
    await click(d, "[data-jot-section='maintenance']");
    await until(d, "[data-alias-person]", 6000);
    const offered = await typeInPicker(d, "[data-alias-person]", p.employee_id);
    await pickRow(d, "[data-alias-person]", p.id);
    const field = await textOf(d, "[data-alias-person] [data-person-pick-field]");
    await d.page.locator("[data-alias-value]").fill("t. okonkwo");
    const mark = d.mark();
    await click(d, "[data-alias-add]");
    await d.settle(400);
    const post = writes(d, mark, "POST", /^\/api\/jotform\/user-aliases$/).pop();
    results.check(KIND, id("add-alias-finds-the-person-by-typing"),
      offered.length === 1 && offered[0].id === p.id && offered[0].detail === rowLine(d, p) && field.indexOf(p.first_name) >= 0 && !!post && post.body && post.body.user_id === p.id && post.body.alias_value === "t. okonkwo",
      "offered " + say(offered) + ", the field reads " + say(field) + ", the POST " + (post ? say(post.body) : "never went") + ", the layer kept " + say(stubs.sent420().filter((x) => x.what === "alias")));
  });

  // 5. Settings, Roles and Permissions, By person: the team member is found by typing, and their permissions are read.
  await withDriver(ctx, { name: "permissions", lang }, async (d) => {
    const p = staff("u-staff-10");
    await goHash(d, "settings");
    await click(d, "[data-settings-tab='permissions']");
    await until(d, "[data-perm-person]", 6000);
    const offered = await typeInPicker(d, "[data-perm-person]", p.badge_number);
    const mark = d.mark();
    await pickRow(d, "[data-perm-person]", p.id);
    await d.settle(500);
    const read = reads(d, mark, new RegExp("^/api/users/" + p.id + "/permissions$")).pop();
    results.check(KIND, id("per-person-permissions-finds-the-team-member-by-typing"),
      offered.length === 1 && offered[0].id === p.id && offered[0].detail === rowLine(d, p) && !!read && read.status === 200,
      "typed " + say(p.badge_number) + " and was offered " + say(offered) + ", the read " + (read ? read.status : "never went"));
  });

  // 6. The picker names the OCSA ID in the screen's language: its row reads the word, and nothing reads Employee ID.
  await withDriver(ctx, { name: "row-word", lang }, async (d) => {
    await openSubmission(d, "js-3");
    const offered = await typeInPicker(d, LINK_USER, staff("u-staff-7").employee_id);
    const word = idWord(d);
    results.check(KIND, id("a-picker-s-row-names-the-ocsa-id-in-the-screen-s-language"), offered.length === 1 && offered[0].detail.indexOf(word) >= 0,
      "the row reads " + say(offered.map((r) => r.detail)) + " where it should name " + say(word));
  });
}

async function run(ctx) {
  const only = (process.env.PART420_ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
  const want = (k) => !only.length || only.indexOf(k) >= 0;
  for (const lang of LANGS) {
    if (process.env.AUDIT_LANG && process.env.AUDIT_LANG !== lang) continue;
    if (want("pickers")) await pickerCases(ctx, lang);
  }
}

module.exports = { run };
