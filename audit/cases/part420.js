// Round 15 (part 420): find a person by typing everywhere, link a record without an id, and the OCSA ID, against the
// stub with the part420 layer (audit/part420-stub.js) under its scene round23. Each case runs in English and in
// Spanish, and each fails on main as it stood at d127988 unless its name says it is a guard.
//
//   pickers     section 1: a Jotform submission linked to a person found by part of a name, by OCSA ID and by badge;
//               two people with one name told apart by their rows and the Same name mark; Add Alias and Per-person
//               permissions found by typing
//   records     section 2: Link to Record for each kind kept, the record picked from a list and never an id asked
//               for, the person's or the site's own records, newest first, each by its title and date; and a
//               record removed after the list was read said so in the toast, the window kept open
//   ocsaid      section 3: Add Staff with the field empty shows the OCSA ID given, a typed one still goes, a typed one
//               somebody holds is refused at the field in the API's words; approving and rehiring say the number
//               given and the profile shows it; in Edit Staff Info an empty field on save leaves the number as it is,
//               under its hint, and a number another person holds is refused at the field (users.employeeIdTakenByOther);
//               and the label reads OCSA ID (ID de OCSA) on every screen that names it
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

// ---- Section 2: Link to Record without an id ----------------------------------------------------------------------------
const LINK_WIN = "[data-window='forms-link-modal']";
async function openLink(d, subId) {
  const opened = await openSubmission(d, subId);
  await click(d, "[data-window='forms-detail-sub'] [data-sub-link-record]");
  return opened && (await until(d, LINK_WIN, 4000));
}
// What the window asks for besides its pickers: any box to type into that is not a picker's own search, and any word
// that asks for an id.
async function asksForAnId(d) {
  const boxes = await d.page.locator(LINK_WIN + " input:not([data-person-pick-search]), " + LINK_WIN + " textarea").count();
  const text = await textOf(d, LINK_WIN);
  return { boxes, words: /UUID|\bID\b|record id/i.test(text) };
}
async function recordRows(d) {
  await click(d, LINK_WIN + " [data-link-record] [data-person-pick-field]");
  const rows = d.page.locator(LINK_WIN + " [data-link-record] [data-person-pick-box] [data-person-pick-option]");
  const out = [];
  const n = await rows.count();
  for (let i = 0; i < n; i += 1) {
    const r = rows.nth(i);
    const rid = await r.getAttribute("data-person-pick-option");
    if (!rid) continue;
    const sub = r.locator("[data-person-pick-sub]");
    out.push({ id: rid, text: (await r.innerText()).trim(), sub: (await sub.count()) ? (await sub.innerText()).trim() : "" });
  }
  return out;
}

async function recordCases(ctx, lang) {
  const { results, seed, stubs: shared } = ctx;
  const id = (x) => KIND + "/" + lang + "/records/" + x;
  const S0 = seed.SITES[0];
  const fx = shared.fixtures;
  const P5 = seed.STAFF.find((x) => x.id === "u-staff-5");
  // Each kind kept, how its record is reached, and the records the stub holds for that person or site, newest first.
  const KINDS = [
    { type: "user", person: "u-staff-7", typed: () => seed.STAFF.find((x) => x.id === "u-staff-7").employee_id, want: "u-staff-7" },
    { type: "site", site: S0.id, typed: () => S0.name, want: S0.id },
    { type: "hr_document", owner: P5.id, typed: () => P5.badge_number, rows: () => fx.HR_DOCUMENTS ? fx.HR_DOCUMENTS.filter((x) => x.user_id === P5.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((x) => x.id) : null },
    { type: "hr_training", owner: P5.id, typed: () => P5.employee_id, rows: null },
    { type: "hr_onboarding_step", owner: P5.id, typed: () => P5.last_name, rows: null },
    { type: "inspection", owner: S0.id, typed: () => S0.name, rows: null },
    { type: "issue", owner: S0.id, typed: () => S0.name, rows: null, key: "issues", order: ["i-1", "i-2"] },
    { type: "task", owner: S0.id, typed: () => S0.name, rows: null },
    { type: "shift", owner: S0.id, typed: () => S0.name, rows: null, key: "scheduled_shifts", order: ["sh-4", "sh-1"] },
    { type: "pickup", owner: S0.id, typed: () => S0.name, rows: () => fx.PICKUPS.filter((x) => x.site_id === S0.id).map((x) => x.id) },
  ];
  for (const k of KINDS) {
    await withDriver(ctx, { name: "link-" + k.type, lang }, async (d) => {
      const opened = await openLink(d, "js-3");
      await d.page.locator(LINK_WIN + " [data-link-type]").selectOption(k.type);
      await d.settle(300);
      let picked = "";
      let rows = [];
      let ownerRead = true;
      if (k.type === "user" || k.type === "site") {
        const sel = LINK_WIN + (k.type === "user" ? " [data-link-person]" : " [data-link-site]");
        const offered = await typeInPicker(d, sel, k.typed());
        picked = offered.length ? offered[0].id : "";
        rows = offered.map((r) => r.id);
        if (picked) await pickRow(d, sel, picked);
      } else {
        const mark0 = d.mark();
        const offered = await typeInPicker(d, LINK_WIN + " [data-link-owner]", k.typed());
        if (offered.some((r) => r.id === k.owner)) await pickRow(d, LINK_WIN + " [data-link-owner]", k.owner);
        await until(d, LINK_WIN + " [data-link-record] [data-person-pick-field]", 5000);
        const read = d.callsSince(mark0).filter((c) => c.method === "GET" && c.status === 200 && (String(c.path) + "?" + String(c.query || "")).indexOf(k.owner) >= 0).pop();
        ownerRead = !!read;
        // What the route answered for this site, the rows that name it.
        const answered = read && read.json ? (Array.isArray(read.json) ? read.json : (k.key && Array.isArray(read.json[k.key]) ? read.json[k.key] : [])) : [];
        k.answered = answered.filter((r) => r && r.id != null && (k.type.indexOf("hr_") === 0 || String(r.site_id != null ? r.site_id : r.siteId) === String(k.owner))).map((r) => String(r.id));
        const got = await recordRows(d);
        rows = got.map((r) => r.id);
        const dated = got.every((r) => r.sub.length > 0 && r.text.length > r.sub.length);
        if (!dated) rows = ["undated"].concat(rows);
        picked = got.length ? got[0].id : "";
        if (picked) await pickRow(d, LINK_WIN + " [data-link-record]", picked);
      }
      const asks = await asksForAnId(d);
      const mark = d.mark();
      await click(d, LINK_WIN + " [data-link-submit]");
      await d.settle(500);
      const post = writes(d, mark, "POST", /^\/api\/jotform\/submissions\/js-3\/link$/).pop();
      const closed = !(await has(d, LINK_WIN));
      const want = k.rows ? k.rows() : null;
      const sameSet = (a, b) => !!a && !!b && a.length === b.length && a.every((x) => b.indexOf(x) >= 0);
      const inOrder = !k.order || (rows.indexOf(k.order[0]) >= 0 && rows.indexOf(k.order[0]) < rows.indexOf(k.order[1]));
      const listOk = k.want ? picked === k.want : rows.length > 0 && rows[0] !== "undated" && (want ? say(rows) === say(want) : sameSet(rows, k.answered)) && inOrder;
      results.check(KIND, id("link-to-record-" + k.type.replace(/_/g, "-") + "-is-picked-from-a-list-and-never-asks-for-an-id"),
        opened && listOk && ownerRead && asks.boxes === 0 && !asks.words && !!post && post.status === 200 && say(post.body) === say({ entity_type: k.type, entity_id: picked }) && closed && thrown(d).length === 0,
        "window " + opened + ", offered " + say(rows) + (want ? " where the stub holds " + say(want) : k.answered ? " where the route answered " + say(k.answered) + " for the site" : "") + ", picked " + say(picked) + ", boxes to type in " + asks.boxes + ", words asking for an id " + asks.words
          + ", the link " + (post ? post.status + " " + say(post.body) : "never went") + ", closed " + closed);
    });
  }

  // A record removed after the list was read: the API's 404 is said as that, the window stays open and its list is read
  // again.
  await withDriver(ctx, { name: "removed", lang, scene: { removed: ["i-1"] } }, async (d) => {
    await openLink(d, "js-3");
    await d.page.locator(LINK_WIN + " [data-link-type]").selectOption("issue");
    await d.settle(300);
    await typeInPicker(d, LINK_WIN + " [data-link-owner]", S0.name);
    await pickRow(d, LINK_WIN + " [data-link-owner]", S0.id);
    await until(d, LINK_WIN + " [data-link-record] [data-person-pick-field]", 5000);
    await recordRows(d);
    await pickRow(d, LINK_WIN + " [data-link-record]", "i-1");
    const mark = d.mark();
    await click(d, LINK_WIN + " [data-link-submit]");
    const toast = await d.waitToast(5000).then(() => d.toast()).catch(() => null);
    await d.settle(500);
    const post = writes(d, mark, "POST", /^\/api\/jotform\/submissions\/js-3\/link$/).pop();
    const again = reads(d, mark, /^\/api\/issues$/).length;
    const open = await has(d, LINK_WIN);
    const want = d.say("That record was removed after the list was read. Choose another.");
    results.check(KIND, id("a-record-removed-after-the-list-was-read-is-said-so-in-the-toast"), !!post && post.status === 404 && toast === want && open && again >= 1,
      "the link " + (post ? post.status : "never went") + ", the toast " + say(toast) + " where it should read " + say(want) + ", the window open " + open + ", the list read again " + again + " times");
  });
}

// ---- Section 3: the OCSA ID ---------------------------------------------------------------------------------------------
const ADD_WIN = "[data-window='staff-add-form']";
const theirId = (d, num) => d.say("Their {0} is {1}.").replace("{0}", idWord(d)).replace("{1}", num);
async function openAdd(d) {
  await goHash(d, "staff");
  await d.clickText(d.say("Add Staff"), { exact: true }).catch(() => false);
  return until(d, ADD_WIN, 4000);
}
async function fillAdd(d, id) {
  await d.fillByLabel(d.say("First Name *"), "Wren");
  await d.fillByLabel(d.say("Last Name"), "Halvorsen");
  await d.fillByLabel(d.say("Phone *"), "2155550188");
  await d.fillByLabel(d.say("Email *"), "wren.h@example.invalid");
  if (id) await d.page.locator(ADD_WIN + " [data-staff-ocsa-id='add']").fill(id);
}
const saveAdd = async (d) => { await d.page.locator(ADD_WIN + " button").filter({ hasText: d.say("Add Staff") }).last().click(); await d.settle(600); };

async function ocsaIdCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/ocsaid/" + x;

  // 1. Add Staff with the OCSA ID left empty: the field says it is given automatically, the create sends none, and the
  // window after the save and the new person's profile both read the number the API gave.
  await withDriver(ctx, { name: "add-empty", lang }, async (d) => {
    const opened = await openAdd(d);
    const hint = await textOf(d, ADD_WIN + " [data-staff-ocsa-id-hint]");
    const label = await d.page.locator(ADD_WIN + " [data-staff-ocsa-id='add']").getAttribute("aria-label").catch(() => null);
    await fillAdd(d, "");
    const mark = d.mark();
    await saveAdd(d);
    const post = writes(d, mark, "POST", /^\/api\/users$/).pop();
    const given = post && post.json ? post.json.employeeId : null;
    await until(d, "[data-added-ocsa-id]", 4000);
    const shown = await textOf(d, "[data-added-ocsa-id]");
    const newId = post && post.json && post.json.user ? post.json.user.id : "";
    await d.page.keyboard.press("Escape").catch(() => {});
    await goHash(d, "staff/" + newId);
    await until(d, "[data-profile-ocsa-id]", 6000);
    const onProfile = await d.page.locator("[data-profile-ocsa-id]").first().getAttribute("data-profile-ocsa-id").catch(() => null);
    results.check(KIND, id("add-staff-with-the-field-empty-shows-the-ocsa-id-given"),
      opened && hint === d.say("Given automatically when left empty") && label === idWord(d) && !!post && post.status === 201 && post.body && !Object.prototype.hasOwnProperty.call(post.body, "employeeId")
        && given === "OCSA-0151" && shown === theirId(d, given) && onProfile === given,
      "window " + opened + ", the hint " + say(hint) + ", the label " + say(label) + ", the create " + (post ? post.status + " " + say(post.body) : "never went") + ", given " + say(given)
        + ", the window says " + say(shown) + ", the profile reads " + say(onProfile));
  });

  // 2. A number typed by hand still goes as typed, and the window says it.
  await withDriver(ctx, { name: "add-typed", lang }, async (d) => {
    await openAdd(d);
    await fillAdd(d, "OCSA-0900");
    const mark = d.mark();
    await saveAdd(d);
    const post = writes(d, mark, "POST", /^\/api\/users$/).pop();
    await until(d, "[data-added-ocsa-id]", 4000);
    const shown = await textOf(d, "[data-added-ocsa-id]");
    results.check(KIND, id("add-staff-with-a-typed-ocsa-id-sends-it-as-typed"), !!post && post.status === 201 && post.body && post.body.employeeId === "OCSA-0900" && shown === theirId(d, "OCSA-0900"),
      "the create " + (post ? post.status + " " + say(post.body) : "never went") + ", the window says " + say(shown));
  });

  // 3. A typed number somebody holds: the API's 409 users.employeeIdTaken in its words at the field, the window open.
  await withDriver(ctx, { name: "add-taken", lang }, async (d) => {
    await openAdd(d);
    await fillAdd(d, ctx.seed.STAFF[4].employee_id);
    const mark = d.mark();
    await saveAdd(d);
    const post = writes(d, mark, "POST", /^\/api\/users$/).pop();
    const said = await textOf(d, ADD_WIN + " [data-staff-ocsa-id-said]");
    const words = post && post.json ? post.json.error : null;
    results.check(KIND, id("a-typed-ocsa-id-somebody-holds-is-refused-at-the-field-in-the-api-s-words"),
      !!post && post.status === 409 && post.json.code === "users.employeeIdTaken" && !!words && said === words && (await has(d, ADD_WIN)),
      "the create " + (post ? post.status + " " + say(post.json) : "never went") + ", under the field " + say(said));
  });

  // 4. Approving a registration: the toast says the OCSA ID the answer gives, and the profile reads it.
  await withDriver(ctx, { name: "approve", lang, scene: { noIdFor: ["u-staff-11"] } }, async (d) => {
    await goHash(d, "staff");
    await click(d, "[data-filter-tab='pending']");
    await d.waitToastGone(6000).catch(() => {});
    const row = d.page.locator("table tbody tr").filter({ hasText: "Salome Mkhize" });
    await row.first().locator("button").filter({ hasText: d.say("Approve") }).first().click();
    const toast = await d.waitToast(5000).then(() => d.toast()).catch(() => null);
    const post = d.callsSince(0).filter((c) => c.method === "POST" && /^\/api\/users\/u-staff-11\/approve$/.test(c.path)).pop();
    const given = post && post.json ? post.json.employeeId : null;
    await goHash(d, "staff/u-staff-11");
    await until(d, "[data-profile-ocsa-id]", 6000);
    const onProfile = await d.page.locator("[data-profile-ocsa-id]").first().getAttribute("data-profile-ocsa-id").catch(() => null);
    const want = d.say("Approved. Their {0} is {1}.").replace("{0}", idWord(d)).replace("{1}", given || "");
    results.check(KIND, id("approving-a-registration-shows-the-ocsa-id-given"), !!post && post.status === 200 && !!given && String(toast || "").indexOf(want) === 0 && onProfile === given,
      "the approve " + (post ? post.status + " " + say(post.json) : "never went") + ", the toast " + say(toast) + " where it should start " + say(want) + ", the profile reads " + say(onProfile));
  });

  // 5. A rehire: the toast says the OCSA ID the answer gives, and the profile reads it after, with nothing typed.
  await withDriver(ctx, { name: "rehire", lang, scene: { noIdFor: ["u-staff-12"] }, arm: (s) => s.setStep247(true) }, async (d) => {
    await goHash(d, "staff/u-staff-12");
    await until(d, '[data-employment-action="rehire"]', 8000);
    await d.page.locator('[data-employment-action="rehire"]').first().click();
    await until(d, "[data-restore-sites] [data-restore-site]", 4000);
    const ticked = d.page.locator("[data-restore-sites] input:checked");
    for (let i = 0; i < 6 && (await ticked.count()); i += 1) await ticked.first().uncheck();
    const typed = await d.page.locator("[data-employment-window] input:not([type=date]):not([type=checkbox])").count();
    await d.page.locator('[data-employment-window] input[type="date"]').first().fill(ctx.seed.shift(2));
    await d.waitToastGone(6000).catch(() => {});
    const mark = d.mark();
    await d.page.locator("[data-employment-window] button").filter({ hasText: d.say("Rehire") }).last().click();
    const toast = await d.waitToast(5000).then(() => d.toast()).catch(() => null);
    const post = writes(d, mark, "POST", /^\/api\/users\/u-staff-12\/employment\/rehire$/).pop();
    const given = post && post.json ? post.json.employeeId : null;
    await until(d, "[data-profile-ocsa-id='" + (given || "none") + "']", 5000);
    const onProfile = await d.page.locator("[data-profile-ocsa-id]").first().getAttribute("data-profile-ocsa-id").catch(() => null);
    results.check(KIND, id("a-rehire-shows-the-ocsa-id-given-on-the-profile"), !!post && post.status === 200 && !!given && String(toast || "").indexOf(theirId(d, given)) >= 0 && onProfile === given && typed === 0,
      "the rehire " + (post ? post.status + " employeeId " + say(post.json.employeeId) : "never went") + ", the toast " + say(toast) + ", the profile reads " + say(onProfile) + ", boxes to type in " + typed);
  });

  // 6. Edit Staff Info: the OCSA ID can be changed and not emptied. The field says "Leave as is, or type a new number.";
  // emptied on its own, the save sends nothing and closes; emptied beside another change, the save sends that change
  // and no employeeId, asks nothing, and the profile still reads the number (ocsa-api main be30fb1 reads an empty one as
  // "give me the next", which an active staff account answers by keeping its own).
  const EDIT_WIN = "[data-window='staff-edit-form']";
  const openEdit = async (d, p) => {
    await goHash(d, "staff");
    const row = d.page.locator("table tbody tr").filter({ hasText: p.name });
    await row.first().locator("button[title='" + d.say("Edit") + "']").first().click();
    return until(d, EDIT_WIN + " [data-staff-ocsa-id='edit']", 4000);
  };
  const saveEdit = async (d) => { await d.page.locator(EDIT_WIN + " button").filter({ hasText: d.say("Save Changes") }).last().click(); await d.settle(600); };
  await withDriver(ctx, { name: "leave-as-is", lang }, async (d) => {
    const p = ctx.seed.STAFF.find((x) => x.id === "u-staff-7");
    const opened = await openEdit(d, p);
    const hint = await textOf(d, EDIT_WIN + " [data-staff-ocsa-id-hint]");
    const label = await d.page.locator(EDIT_WIN + " [data-staff-ocsa-id='edit']").getAttribute("aria-label").catch(() => null);
    await d.page.locator(EDIT_WIN + " [data-staff-ocsa-id='edit']").fill("");
    const mark = d.mark();
    await saveEdit(d);
    const alone = writes(d, mark, "PATCH", new RegExp("^/api/users/" + p.id + "$")).length;
    const closed = !(await has(d, EDIT_WIN));
    await openEdit(d, p);
    await d.page.locator(EDIT_WIN + " [data-staff-ocsa-id='edit']").fill("");
    await d.fillByLabel(d.say("Phone"), "2155550177");
    const mark2 = d.mark();
    await saveEdit(d);
    const patch = writes(d, mark2, "PATCH", new RegExp("^/api/users/" + p.id + "$")).pop();
    const asked = (await d.confirms()).filter((x) => /ID/.test(x));
    await goHash(d, "staff/" + p.id);
    await until(d, "[data-profile-ocsa-id]", 6000);
    const onProfile = await d.page.locator("[data-profile-ocsa-id]").first().getAttribute("data-profile-ocsa-id").catch(() => null);
    results.check(KIND, id("an-empty-ocsa-id-on-save-leaves-the-number-as-it-is"),
      opened && label === idWord(d) && hint === d.say("Leave as is, or type a new number.") && alone === 0 && closed && !!patch && patch.status === 200 && patch.body
        && patch.body.phone === "2155550177" && !Object.prototype.hasOwnProperty.call(patch.body, "employeeId") && asked.length === 0 && onProfile === p.employee_id,
      "window " + opened + ", the label " + say(label) + ", the hint " + say(hint) + ", sent with the field emptied alone " + alone + ", closed " + closed
        + ", the save beside a phone " + (patch ? patch.status + " " + say(patch.body) : "never went") + ", asked " + say(asked) + ", the profile reads " + say(onProfile));
  });

  // 6b. Edit Staff Info: a number another person holds is refused 409 users.employeeIdTakenByOther, drawn at the field in
  // the API's words, and the window stays open.
  await withDriver(ctx, { name: "taken-by-other", lang }, async (d) => {
    const p = ctx.seed.STAFF.find((x) => x.id === "u-staff-7");
    await openEdit(d, p);
    await d.page.locator(EDIT_WIN + " [data-staff-ocsa-id='edit']").fill(ctx.seed.STAFF[4].employee_id);
    const mark = d.mark();
    await saveEdit(d);
    const patch = writes(d, mark, "PATCH", new RegExp("^/api/users/" + p.id + "$")).pop();
    const said = await textOf(d, EDIT_WIN + " [data-staff-ocsa-id-said]");
    const words = patch && patch.json ? patch.json.error : null;
    results.check(KIND, id("a-typed-ocsa-id-another-person-holds-is-refused-at-the-field-in-edit-staff-info"),
      !!patch && patch.status === 409 && patch.json.code === "users.employeeIdTakenByOther" && !!words && said === words && (await has(d, EDIT_WIN)),
      "the save " + (patch ? patch.status + " " + say(patch.json) : "never went") + ", under the field " + say(said));
  });

  // 7. The label in the screen's language: the profile, Add Staff, the staff list's search and a picker's search line
  // name the OCSA ID, and none of them reads Employee ID.
  await withDriver(ctx, { name: "label", lang }, async (d) => {
    const word = idWord(d);
    await goHash(d, "staff");
    await until(d, "[data-list-search='staff']", 6000);
    const search = await d.page.locator("[data-list-search='staff']").getAttribute("placeholder").catch(() => null);
    await goHash(d, "staff/u-staff-7");
    await until(d, "[data-profile-ocsa-id]", 6000);
    const profile = await textOf(d, "[data-profile-ocsa-id]");
    await openAdd(d);
    const addLabel = await d.page.locator(ADD_WIN + " [data-staff-ocsa-id='add']").getAttribute("aria-label").catch(() => null);
    await d.page.keyboard.press("Escape").catch(() => {});
    await openSubmission(d, "js-3");
    await click(d, LINK_USER + " [data-person-pick-field]");
    const pickSearch = await d.page.locator(LINK_USER + " [data-person-pick-search]").getAttribute("placeholder").catch(() => null);
    const old = /employee id|id de la persona/i;
    results.check(KIND, id("the-label-reads-ocsa-id-in-the-screen-s-language"),
      profile.indexOf(word) === 0 && addLabel === word && String(search || "").indexOf(word) >= 0 && String(pickSearch || "").indexOf(word) >= 0 && ![profile, search, addLabel, pickSearch].some((x) => old.test(String(x || ""))),
      "the word " + say(word) + "; the profile " + say(profile) + ", the list's search " + say(search) + ", Add Staff " + say(addLabel) + ", a picker's search " + say(pickSearch));
  });
}

async function run(ctx) {
  const only = (process.env.PART420_ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
  const want = (k) => !only.length || only.indexOf(k) >= 0;
  for (const lang of LANGS) {
    if (process.env.AUDIT_LANG && process.env.AUDIT_LANG !== lang) continue;
    if (want("pickers")) await pickerCases(ctx, lang);
    if (want("records")) await recordCases(ctx, lang);
    if (want("ocsaid")) await ocsaIdCases(ctx, lang);
  }
}

module.exports = { run };
