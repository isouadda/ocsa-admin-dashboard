// What the API's Round 8 gave the dashboard (part 372), against the stub as the API is built at ocsa-api main
// c5b88ff (audit/part372-stub.js, with audit/checklist-stub.js, audit/part368-round6.js and
// audit/part368-leave.js beside the answers they add to), armed as the API is built (setApiAsBuilt) with
// Round 2's file log (setStep353) and part 364's answers (setStep364). Each case runs in English and in
// Spanish, and each fails on main as it stood at e15f6e5 unless its name says it is a guard.
//
//   round8   the All sites cards counted the ring's way, with no note under them; a shift's edit sends the
//            calendar's updated_at and meets a change made since; a person's edits send the updatedAt the
//            profile and the list carry, with no read of their own; a case log entry's updatedAt kept for
//            the case's next save; the supply requests pending counted whole; the Signatures page read in
//            the attention order; both timelines a page at a time with Show more; a leave adjustment's day;
//            an hours file checked first, then posted; a drop approved and assigned in one step
//   pictures a picture whose signed link ran out reads its record again once and draws the fresh link: a
//            person's face on their profile, the faces of the staff list sharing one read, an issue's
//            photos; a fresh link that fails as well gives way to the initials with no third read; a list
//            read again an hour later draws fresh links (a guard); a ticket's screenshot read behind the
//            token, against audit/part372-pictures.js, whose links run out on the stub's own clock
//   reports  Deactivate on a saved report only for those the API lets take it off the list: an admin on
//            every custom report, anyone else on the ones they made, never on a template
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "part372";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const LANGS = ["en", "es"];
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
const reads = (d, mark, re) => d.callsSince(mark).filter((c) => c.method === "GET" && re.test(c.path));
const q = (c) => new URLSearchParams(String(c.query || "").replace(/^\?/, ""));
const S1 = seed.SITES[0].id, S2 = seed.SITES[1].id;
// A shift's window on Shift Pickup, by its View shift button: the one this branch marks with the shift's id,
// else the first on the tab shown, which is how main draws it.
async function openPickup(d, pid) {
  const mine = d.page.locator('[data-pickup-view="' + pid + '"]');
  if ((await mine.count()) > 0) await mine.first().click().catch(() => {});
  else await d.page.locator("button[title='" + d.say("View shift") + "']").first().click().catch(() => {});
  await d.settle(600);
}

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

// ---- Section 1: what Round 8 built for the dashboard ------------------------------------------------------
// The cursor the stubs hand out after a page: base64url of [list, offset].
const cursorAt = (list, offset) => Buffer.from(JSON.stringify([list, offset])).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function round8Cases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/round8/" + x;

  // 1. The All sites cards count each day's counted, the ring's rule, and the note under the cards is gone.
  await withDriver(ctx, { name: "counted", lang, arm: (s) => s.setChecklist358(true) }, async (d, stubs) => {
    const M = stubs.checklist358();
    await goHash(d, "checklist/all/yesterday");
    await until(d, '[data-checklist-results][data-cr-view="all"]', 10000);
    await d.settle(600);
    const cards = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-cr-site-card]")).map((el) => [el.getAttribute("data-cr-site-card"), el.getAttribute("data-cr-done") + "/" + el.getAttribute("data-cr-due")]));
    const c1 = M.summaryDay(S1, M.SEEDED).counted, c2 = M.summaryDay(S2, M.SEEDED).counted;
    const all1 = M.summaryDay(S1, M.SEEDED);
    const card = (sid) => (cards.find((c) => c[0] === sid) || [])[1];
    const lead = await d.page.evaluate(() => { const el = document.querySelector('[data-checklist-results][data-cr-view="all"] > div:nth-of-type(3)'); return el ? el.innerText : ""; });
    const page = await d.page.evaluate(() => document.body.innerText);
    const noteGone = page.indexOf(d.say("A card counts every step due at the site, weekly, monthly, quarterly and seasonal work included.")) < 0;
    results.check(KIND, id("all-sites-cards-count-the-ring-s-way"), card(S1) === c1.done + "/" + c1.due && card(S2) === c2.done + "/" + c2.due && (c1.due !== all1.due) && noteGone,
      "the cards read " + say(cards) + " where the ring's count is " + c1.done + "/" + c1.due + " and " + c2.done + "/" + c2.due + (noteGone ? "" : "; the note under the cards is still there: " + say(lead)));
  });

  // 2. A shift's edit sends the calendar's updated_at, and a change made since to the field edited is asked about.
  await withDriver(ctx, { name: "schedule", lang }, async (d, stubs) => {
    await d.goto("schedule");
    await d.settle(600);
    const cal = reads(d, 0, /^\/api\/schedule\/calendar$/).pop();
    const sh1 = cal && cal.json && Array.isArray(cal.json.scheduled_shifts) ? cal.json.scheduled_shifts.find((x) => x.id === "sh-1") : null;
    stubs.setScene368({ since: { "/api/schedule/sh-1": Object.assign({}, sh1 || {}, { notes: "Use the loading dock door", updated_at: "2026-03-17T13:00:00.000Z" }) } });
    await d.page.locator('[data-shift-chip="sh-1"]').first().click().catch(() => {});
    const opened = (await until(d, '[data-schedule-edit="sh-1"]', 3000)) || (await d.modalText().catch(() => "")).indexOf(d.say("Edit Scheduled Shift")) >= 0;
    await d.modal().locator("input[placeholder='" + d.say("Notes") + "']").first().fill("Bring the wet floor signs").catch(() => {});
    const mark = d.mark();
    await d.modal().getByRole("button", { name: d.say("Save"), exact: true }).first().click().catch(() => {});
    await until(d, "[data-changed-since]", 4000);
    const row = await d.page.evaluate(() => { const r = document.querySelector('[data-changed-field="notes"]'); return r ? Array.from(r.children).map((x) => x.innerText.trim()) : null; });
    await d.page.locator("[data-changed-save]").click().catch(() => {});
    await d.settle(900);
    const sent = writes(d, mark, "PATCH", /^\/api\/schedule\/sh-1$/);
    const stamps = sent.map((c) => c.body && c.body.updatedAt);
    results.check(KIND, id("a-shift-edit-sends-updated-at-and-asks-about-a-change-since"), opened && !!sh1 && !!sh1.updated_at && stamps[0] === sh1.updated_at && !!row && row[1] === "Use the loading dock door" && row[2] === "Bring the wet floor signs" && sent.length === 2 && stamps[1] === "2026-03-17T13:00:00.000Z" && sent[1].body.notes === "Bring the wet floor signs",
      !opened ? "no shift's edit opened" : "the save sent " + sent.length + " PATCH(es) with updatedAt " + say(stamps) + " where the calendar read " + say(sh1 && sh1.updated_at) + (row ? "; the window read " + say(row) : "; no window asked about the change since"));
  });

  // 3. A person's edits send the updatedAt the profile and the list carry, with no read of their own.
  await withDriver(ctx, { name: "person", lang }, async (d) => {
    const who = "u-staff-5";
    await goHash(d, "staff/" + who);
    await until(d, "[data-profile-edit]", 6000);
    const prof = reads(d, 0, new RegExp("^/api/users/profile/" + who + "$")).pop();
    const stamp = prof && prof.json && prof.json.user ? prof.json.user.updatedAt : null;
    let mark = d.mark();
    await d.page.locator("[data-profile-edit]").first().click().catch(() => {});
    await d.settle(500);
    const phone = d.page.locator("div").filter({ has: d.page.locator("label", { hasText: new RegExp("^" + d.say("Phone") + "$") }) }).locator("input").last();
    await phone.fill("2155550188").catch(() => {});
    await d.page.getByRole("button", { name: d.say("Save") }).last().click().catch(() => {});
    await d.settle(900);
    const own = reads(d, mark, new RegExp("^/api/users/" + who + "$"));
    const sent = writes(d, mark, "PATCH", new RegExp("^/api/users/" + who + "$"));
    results.check(KIND, id("the-profile-edit-sends-the-profile-s-updated-at"), !!stamp && sent.length === 1 && sent[0].body.updatedAt === stamp && own.length === 0,
      !stamp ? "the profile carried no updatedAt" : "the edit read GET /api/users/" + who + " " + own.length + " time(s) and sent " + sent.length + " PATCH(es) with updatedAt " + say(sent.map((c) => c.body && c.body.updatedAt)));
    // The list's pencil, on the first row.
    await d.goto("staff");
    await d.settle(600);
    const list = reads(d, 0, /^\/api\/users$/).filter((c) => Array.isArray(c.json)).pop();
    mark = d.mark();
    await d.clickTitle(d.say("Edit"));
    await d.settle(500);
    const rowId = (() => { const ed = writes(d, mark, "PATCH", /^\/api\/users\//); return ed; })();
    await d.fillByLabel(d.say("Phone *"), "2155550177").catch(() => {});
    await d.fillByLabel(d.say("Phone"), "2155550177").catch(() => {});
    await d.clickText(d.say("Save Changes"), { inModal: true, exact: true }).catch(() => {});
    await d.settle(900);
    const pencil = writes(d, mark, "PATCH", /^\/api\/users\/[^/]+$/);
    const pid = pencil[0] ? pencil[0].path.split("/").pop() : "";
    const listed = list ? list.json.find((x) => x.id === pid) : null;
    const ownRead = reads(d, mark, /^\/api\/users\/u-[^/]+$/);
    results.check(KIND, id("the-list-pencil-sends-the-row-s-updated-at"), rowId.length === 0 && pencil.length === 1 && !!listed && !!listed.updatedAt && pencil[0].body.updatedAt === listed.updatedAt && ownRead.length === 0,
      !pencil.length ? "the pencil saved nothing" : "the pencil read " + ownRead.length + " person record(s) and sent updatedAt " + say(pencil[0].body.updatedAt) + " where the list's row carries " + say(listed && listed.updatedAt));
  });

  // 4. A case log entry answers the case's updatedAt, so the case's next save goes once, with no 409.
  await withDriver(ctx, { name: "case-log", lang, arm: (s) => s.setStep299(true) }, async (d, stubs) => {
    await goHash(d, "cases/hc-1");
    await until(d, '[data-case-window="hc-1"] [data-case-log]', 8000);
    await d.page.locator("[data-case-update-body], [data-case-log] textarea").first().fill("Called the person back and agreed a time to meet.").catch(() => {});
    let mark = d.mark();
    await d.page.locator("[data-case-update-add], [data-case-log] button:has-text('" + d.say("Add to the log") + "')").first().click().catch(() => {});
    await d.settle(900);
    const added = writes(d, mark, "POST", /^\/api\/hr-cases\/hc-1\/updates$/);
    const at = added[0] && added[0].json ? added[0].json.updatedAt : null;
    await d.page.locator('[data-case-window="hc-1"] [data-case-status]').first().selectOption("in_review").catch(() => {});
    mark = d.mark();
    await d.page.locator('[data-case-window="hc-1"]').getByRole("button", { name: d.say("Save changes") }).first().click().catch(() => {});
    await d.settle(1200);
    const saves = writes(d, mark, "PATCH", /^\/api\/hr-cases\/hc-1$/);
    const refused = stubs.sent372().filter((x) => x.caseRefused === "hc-1").length;
    results.check(KIND, id("a-case-log-entry-s-updated-at-is-kept-for-the-next-save"), added.length === 1 && !!at && saves.length === 1 && saves[0].body.updatedAt === at && refused === 0,
      added.length !== 1 ? "the entry was not added" : "the save sent " + saves.length + " PATCH(es) with updatedAt " + say(saves.map((c) => c.body && c.body.updatedAt)) + " where the entry answered " + say(at) + "; " + refused + " met 409");
  });

  // 5. The Requests tab counts the pending requests of the whole list, from counts.pending.
  await withDriver(ctx, { name: "pending", lang, arm: (s) => s.setScene368({ listsMany: true }) }, async (d) => {
    await d.goto("supplies");
    await d.settle(800);
    const first = reads(d, 0, /^\/api\/supplies\/requests$/).filter((c) => q(c).get("cursor") === "").pop();
    const whole = first && first.json && first.json.counts ? first.json.counts.pending : null;
    const onPage = first && first.json && Array.isArray(first.json.requests) ? first.json.requests.filter((r) => r.status === "pending").length : null;
    const shown = await d.page.locator("[data-supplies-tab='requests'] [data-requests-pending]").first().getAttribute("data-requests-pending").catch(() => null);
    const tab = await textOf(d, "[data-supplies-tab='requests']");
    results.check(KIND, id("the-requests-tab-counts-every-pending-request"), whole !== null && whole !== onPage && String(shown) === String(whole) && tab.indexOf(String(whole)) >= 0,
      "the tab reads " + say(tab) + " where the API counts " + whole + " pending (" + onPage + " on the first page)");
  });

  // 6. The Signatures page reads in the attention order, and draws the page in that order.
  await withDriver(ctx, { name: "signatures", lang, arm: (s) => s.setScene368({ listsMany: true }) }, async (d) => {
    let mark = d.mark();
    await goHash(d, "hr/signatures");
    await d.settle(800);
    const first = reads(d, mark, /^\/api\/signatures$/).filter((c) => q(c).has("cursor")).pop();
    const page = first && first.json && Array.isArray(first.json.requests) ? first.json.requests.map((r) => r.id) : [];
    const drawn = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-signature-row]")).map((x) => x.getAttribute("data-signature-row")));
    mark = d.mark();
    if (await has(d, '[data-show-more="signatures"]')) { await d.page.locator('[data-show-more="signatures"]').click().catch(() => {}); await d.settle(800); }
    const second = reads(d, mark, /^\/api\/signatures$/).pop();
    results.check(KIND, id("signatures-read-in-the-attention-order"), !!first && q(first).get("order") === "attention" && q(first).get("cursor") === "" && !!second && q(second).get("order") === "attention" && q(second).get("cursor") === cursorAt("signatures-attention", 50) && (drawn.length === 0 || drawn.slice(0, page.length).join(",") === page.slice(0, drawn.length).join(",")),
      !first ? "the page read no signatures with a cursor" : "the pages were read with " + say([first.query, second && second.query]) + (drawn.length ? "; drawn " + say(drawn.slice(0, 4)) + " where the page is " + say(page.slice(0, 4)) : ""));
  });

  // 7. Both timelines a page at a time: cursor empty first, Show more with the next cursor and the filters.
  await withDriver(ctx, { name: "timelines", lang, arm: (s) => s.setScene372({ timelineMany: true }) }, async (d) => {
    const who = "u-staff-5";
    if (d.waitToastGone) await d.waitToastGone().catch(() => {});
    await goHash(d, "staff/" + who);
    await until(d, "[data-profile-edit]", 6000);
    const opening = await d.toast();
    let mark = d.mark();
    await d.clickText(d.say("Timeline"), { exact: true }).catch(() => {});
    await d.settle(900);
    const p1 = reads(d, mark, new RegExp("^/api/users/timeline/" + who + "$")).pop();
    const n1 = Number(await d.page.locator("[data-timeline-count]").first().getAttribute("data-timeline-count").catch(() => "0"));
    mark = d.mark();
    await d.page.locator('[data-show-more="person-timeline"]').click().catch(() => {});
    await d.settle(900);
    const p2 = reads(d, mark, new RegExp("^/api/users/timeline/" + who + "$")).pop();
    const n2 = Number(await d.page.locator("[data-timeline-count]").first().getAttribute("data-timeline-count").catch(() => "0"));
    const gone = !(await has(d, '[data-show-more="person-timeline"]'));
    results.check(KIND, id("a-person-s-timeline-pages-with-show-more"), !opening && !!p1 && q(p1).get("cursor") === "" && !q(p1).has("limit") && !q(p1).has("offset") && n1 === 50 && !!p2 && q(p2).get("cursor") === cursorAt("user-timeline", 50) && n2 === 70 && gone,
      opening ? "opening the profile said " + say(opening) : !p1 ? "the timeline was not read" : "the reads were " + say([p1.query, p2 && p2.query]) + ", showing " + n1 + " then " + n2 + (gone ? "" : "; Show more stayed after the last page"));
    // The site's, on its Timeline tab, with a category.
    mark = d.mark();
    await goHash(d, "sites/" + S1 + "/timeline");
    await until(d, "[data-timeline-count]", 6000);
    await d.settle(600);
    const s1 = reads(d, mark, new RegExp("^/api/sites/timeline/" + S1 + "$")).pop();
    const m1 = Number(await d.page.locator("[data-timeline-count]").first().getAttribute("data-timeline-count").catch(() => "0"));
    mark = d.mark();
    await d.page.locator('[data-show-more="site-timeline"]').click().catch(() => {});
    await d.settle(900);
    const s2 = reads(d, mark, new RegExp("^/api/sites/timeline/" + S1 + "$")).pop();
    const m2 = Number(await d.page.locator("[data-timeline-count]").first().getAttribute("data-timeline-count").catch(() => "0"));
    results.check(KIND, id("a-site-s-timeline-pages-with-show-more"), !!s1 && q(s1).get("cursor") === "" && !q(s1).has("offset") && m1 === 50 && !!s2 && q(s2).get("cursor") === cursorAt("site-timeline", 50) && m2 === 70,
      !s1 ? "the site's timeline was not read" : "the reads were " + say([s1.query, s2 && s2.query]) + ", showing " + m1 + " then " + m2);
  });

  // 8. A leave adjustment takes a day: today to start, an earlier day sent as effectiveOn, a later one refused.
  await withDriver(ctx, { name: "adjust-day", lang }, async (d) => {
    await goHash(d, "leave/balances/u-staff-6");
    await until(d, "[data-leave-adjust-open]", 6000);
    await d.page.locator("[data-leave-adjust-open]").click().catch(() => {});
    await until(d, "[data-leave-adjust-form]");
    const box = d.page.locator('[data-leave-adjust="effectiveOn"]');
    const start = (await box.count()) > 0 ? await box.inputValue() : null;
    await d.page.locator('[data-leave-adjust="hours"]').fill("4").catch(() => {});
    await d.page.locator('[data-leave-adjust="reason"]').fill("Hours from the paper log").catch(() => {});
    await box.fill(seed.shift(1)).catch(() => {});
    await d.setConfirmAnswer(true);
    let mark = d.mark();
    await d.page.locator("[data-leave-adjust-save]").click().catch(() => {});
    await d.settle(500);
    const ahead = writes(d, mark, "POST", /\/adjustments$/).length;
    const said = await textOf(d, '[data-leave-adjust-refusal="effectiveOn"]');
    await box.fill(seed.shift(-5)).catch(() => {});
    mark = d.mark();
    await d.page.locator("[data-leave-adjust-save]").click().catch(() => {});
    await d.settle(800);
    const posts = writes(d, mark, "POST", /^\/api\/leave\/people\/u-staff-6\/adjustments$/);
    const entry = posts[0] && posts[0].json ? posts[0].json.entry : null;
    results.check(KIND, id("an-adjustment-takes-a-day-never-ahead"), start === seed.shift(0) && ahead === 0 && said === d.say("Choose a day no later than today.") && posts.length === 1 && posts[0].body.effectiveOn === seed.shift(-5) && !!entry && entry.effectiveOn === seed.shift(-5),
      start === null ? "Adjust has no day" : "it opened on " + say(start) + ", a day ahead sent " + ahead + " and said " + say(said) + "; then it sent " + say(posts.map((c) => c.body && c.body.effectiveOn)));
  });

  // 9. An hours file is checked first with dryRun, each line's outcome shown and nothing posted; then posted.
  await withDriver(ctx, { name: "hours-dry-run", lang }, async (d, stubs) => {
    await goHash(d, "leave/hours");
    await until(d, "[data-leave-file-upload]", 6000);
    await d.page.locator("[data-leave-file-upload]").click().catch(() => {});
    await until(d, "[data-leave-hours-window]");
    await d.page.locator('[data-leave-hours-window] input[type="file"]').setInputFiles({ name: "march.csv", mimeType: "text/csv", buffer: Buffer.from("person,period_start,period_end,hours\n4118,2026-03-01,2026-03-14,90\n", "utf8") }).catch(() => {});
    await d.settle(300);
    let mark = d.mark();
    await d.page.locator("[data-leave-file-check]").click().catch(() => {});
    await d.settle(800);
    const dry = writes(d, mark, "POST", /^\/api\/leave\/hours-files$/);
    const outcome = await d.page.locator("[data-leave-file-outcome]").first().getAttribute("data-leave-file-outcome").catch(() => "");
    const would = await d.page.locator("[data-leave-file-would-post]").first().getAttribute("data-leave-file-would-post").catch(() => null);
    const kept = stubs.leave368().files.length;
    mark = d.mark();
    await d.page.locator("[data-leave-file-post]").click().catch(() => {});
    await d.settle(800);
    const real = writes(d, mark, "POST", /^\/api\/leave\/hours-files$/);
    const posted = await has(d, "[data-leave-file-posted]");
    results.check(KIND, id("an-hours-file-is-checked-first-then-posted"), dry.length === 1 && dry[0].body.dryRun === true && outcome === "posted" && would === "1" && real.length === 1 && real[0].body.dryRun === undefined && posted && stubs.leave368().files.length === kept + 1,
      !dry.length ? "the file was not checked first" : "the check sent " + say(dry.map((c) => c.body && c.body.dryRun)) + " and drew " + say(outcome) + " (" + say(would) + " would post); Post sent " + real.length + (posted ? "" : " and drew no posted line"));
  });

  // 10. DASH-35: a drop request approved and assigned in one call; the dropper refused under the picker.
  await withDriver(ctx, { name: "drop-and-assign", lang }, async (d) => {
    await d.goto("marketplace");
    await d.settle(700);
    await d.clickText(d.say("Requests"), { exact: true }).catch(() => {});
    await d.settle(500);
    await openPickup(d, "pk-3");
    const assign = () => d.modal().getByRole("button", { name: d.say("Assign"), exact: true }).first().click().catch(() => {});
    await d.pickPerson("Rashid Haddad");
    let mark = d.mark();
    await assign();
    await d.settle(700);
    const refusedCalls = d.callsSince(mark).filter((c) => c.method === "POST" && /^\/api\/pickups\/pk-3\//.test(c.path)).map((c) => c.path.split("/").pop());
    const under = await textOf(d, '[data-assign-refusal="user_id"]');
    const wantWords = lang === "es" ? "Esta persona pidió dejar este turno. Deniegue la solicitud para que lo conserve." : "This person asked to drop this shift. Deny the drop request to keep them on it.";
    await d.pickPerson("Ngozi Okonkwo");
    mark = d.mark();
    await assign();
    await d.settle(800);
    const calls = d.callsSince(mark).filter((c) => c.method === "POST" && /^\/api\/pickups\/pk-3\//.test(c.path));
    const b = calls[0] ? calls[0].body || {} : {};
    results.check(KIND, id("a-drop-is-approved-and-assigned-in-one-step"), refusedCalls.join(",") === "approve-drop-and-assign" && under === wantWords && calls.length === 1 && calls[0].path === "/api/pickups/pk-3/approve-drop-and-assign" && b.user_id === "u-staff-6",
      "naming the dropper sent " + say(refusedCalls) + " and read " + say(under) + "; assigning sent " + say(calls.map((c) => c.path + " " + say(c.body))));
  });

  // Guard: an open shift is still given through the assign, as before.
  await withDriver(ctx, { name: "assign-open", lang }, async (d) => {
    await d.goto("marketplace");
    await d.settle(700);
    await openPickup(d, "pk-1");
    await d.pickPerson("Ngozi Okonkwo");
    const mark = d.mark();
    await d.modal().getByRole("button", { name: d.say("Assign"), exact: true }).first().click().catch(() => {});
    await d.settle(800);
    const calls = d.callsSince(mark).filter((c) => c.method === "POST" && /^\/api\/pickups\/pk-1\//.test(c.path)).map((c) => c.path.split("/").pop());
    results.check(KIND, id("guard-an-open-shift-is-assigned-as-before"), calls.join(",") === "assign", "assigning an open shift sent " + say(calls));
  });
}


// ---- Section 2: pictures that come back by themselves -------------------------------------------------------
// The pictures of the screen, read off the page: each one's link, whether it drew, and how it was asked for.
const pictures = (d, sel) => d.page.evaluate((s) => Array.from(document.querySelectorAll(s)).map((im) => ({ src: im.getAttribute("src") || "", drew: im.complete && im.naturalWidth > 0, how: im.getAttribute("data-fresh-img") })), sel);
const armPictures = (o) => (stubs) => stubs.setPictures372(o || {});
const storage = (d) => d.stubs.pictures372().served;

async function pictureCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/pictures/" + x;

  // A person's face on their profile, from a read an hour old: read again once, and the fresh link drawn.
  await withDriver(ctx, { name: "profile-face", lang, arm: armPictures({ expireNext: { "profile:u-staff-5": 1 } }) }, async (d) => {
    const mark = d.mark();
    await goHash(d, "staff/u-staff-5");
    await until(d, "[data-profile-edit]", 6000);
    await d.settle(1200);
    const profileReads = reads(d, mark, /^\/api\/users\/profile\/u-staff-5$/);
    const readsOf = profileReads.length;
    const handed = profileReads.map((c) => (c.json && c.json.user ? c.json.user.profilePhotoUrl : ""));
    const face = (await pictures(d, "img[data-fresh-img]")).filter((f) => handed.indexOf(f.src) >= 0);
    const servedOf = (u) => storage(d).filter((x) => x.url === u).map((x) => x.ok);
    results.check(KIND, id("a-face-whose-link-ran-out-reads-the-profile-again-once"), readsOf === 2 && servedOf(handed[0]).join() === "false" && face.length === 1 && face[0].src === handed[1] && face[0].drew,
      "the profile was read " + readsOf + " times; storage answered the first link " + say(servedOf(handed[0])) + " and the face drew " + say(face.map((f) => [f.src === handed[1], f.drew])));
  });

  // The staff list's faces, from a list read an hour old: one read again for all of them, and every face drawn.
  // The shell reads the people at sign-in, so the list's read an hour old is armed once that read is done.
  await withDriver(ctx, { name: "list-faces", lang, arm: armPictures({}) }, async (d, stubs) => {
    await d.settle(800);
    stubs.setPictures372({ expireNext: { "staff-list": 1 } });
    const mark = d.mark();
    await d.goto("staff");
    await d.settle(1500);
    const listReads = reads(d, mark, /^\/api\/users$/).filter((c) => !q(c).has("role")).length;
    const faces = await pictures(d, 'img[src*="profile-photos/"]');
    const failedFirst = storage(d).filter((x) => !x.ok).length;
    results.check(KIND, id("the-list-s-faces-share-one-read-again"), faces.length === 3 && faces.every((f) => f.drew) && listReads === 2 && failedFirst === 3,
      "the list was read " + listReads + " times, " + failedFirst + " links had run out, and the faces drew " + say(faces.map((f) => f.drew)));
  });

  // An issue's photos, from a read an hour old: the issue read again once, and its photos drawn.
  // Opened from the list once the page has read everything it reads on its own, so the issue's one read is
  // the window's.
  await withDriver(ctx, { name: "issue-photos", lang, arm: armPictures({}) }, async (d, stubs) => {
    await d.goto("issues");
    await d.settle(1500);
    stubs.setPictures372({ expireNext: { "issue:i-1": 1 } });
    const mark = d.mark();
    await d.page.evaluate(() => { window.location.hash = "issues/i-1"; });
    await d.settle(1800);
    const issueReads = reads(d, mark, /^\/api\/issues\/i-1$/).length;
    const shots = await pictures(d, 'img[src*="issue-photos/i-1/"]');
    const served = storage(d).map((x) => x.ok);
    const ranOut = served.filter((x) => !x).length;
    results.check(KIND, id("an-issue-s-photos-read-the-issue-again-once"), issueReads === 2 && shots.length === 2 && shots.every((f) => f.drew && f.how === "read-again") && ranOut === 2 && served.slice(ranOut).every((x) => x),
      "the issue was read " + issueReads + " times and its photos drew " + say(shots.map((f) => [f.drew, f.how])) + " after storage answered " + say(served));
  });

  // A fresh link that fails as well: the initials in its place, and no third read.
  await withDriver(ctx, { name: "fails-twice", lang, arm: armPictures({ expireNext: { "profile:u-staff-5": 2 } }) }, async (d) => {
    const mark = d.mark();
    await goHash(d, "staff/u-staff-5");
    await until(d, "[data-profile-edit]", 6000);
    await d.settle(2000);
    const readsOf = reads(d, mark, /^\/api\/users\/profile\/u-staff-5$/).length;
    const faces = await pictures(d, 'img[src*="profile-photos/u-staff-5/"]');
    const initials = await d.page.evaluate(() => Array.from(document.querySelectorAll("div")).some((x) => x.childElementCount === 0 && x.innerText.trim() === "TW" && parseFloat(getComputedStyle(x).width) >= 80));
    results.check(KIND, id("a-fresh-link-that-fails-too-gives-way-to-the-initials"), readsOf === 2 && faces.length === 0 && initials,
      "the profile was read " + readsOf + " times; " + faces.length + " broken face(s) stayed" + (initials ? "" : " and no initials were drawn"));
  });

  // Guard: a list read again an hour later draws the fresh links it hands out.
  await withDriver(ctx, { name: "an-hour-later", lang, arm: armPictures({}) }, async (d, stubs) => {
    await d.goto("staff");
    await d.settle(1200);
    const before = (await pictures(d, 'img[src*="profile-photos/"]')).map((f) => f.src);
    stubs.pictures372Advance(61);
    await d.goto("overview");
    await d.settle(400);
    await d.goto("staff");
    await d.settle(1500);
    const after = await pictures(d, 'img[src*="profile-photos/"]');
    const now = stubs.pictures372().now;
    const fresh = after.every((f) => before.indexOf(f.src) < 0 && (stubs.pictures372ExpiresAt(f.src) || 0) > now);
    results.check(KIND, id("guard-a-list-read-again-an-hour-later-draws-fresh-links"), before.length === 3 && after.length === 3 && fresh && after.every((f) => f.drew),
      "before " + before.length + " faces, after " + after.length + "; fresh " + fresh + ", drawn " + say(after.map((f) => f.drew)));
  });

  // A ticket's screenshot, which the API answers behind the token: read with the token and drawn.
  await withDriver(ctx, { name: "ticket-screenshot", lang, arm: (s) => { s.setStep289(true); s.setPictures372({}); } }, async (d) => {
    await d.goto("tickets");
    await d.settle(900);
    const mark = d.mark();
    await d.page.locator("table tbody tr", { hasText: "When I press Send on the time off screen" }).first().click().catch(() => {});
    await d.settle(1200);
    const read = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/support/tickets/tk-1/screenshot");
    const shot = await pictures(d, "[data-ticket-screenshot] img");
    results.check(KIND, id("a-ticket-s-screenshot-is-read-behind-the-token"), read.length === 1 && shot.length === 1 && shot[0].drew && /^blob:/.test(shot[0].src),
      "the screenshot was read " + read.length + " time(s) with the token and drew " + say(shot));
  });
}

// ---- Section 3: Help gaps, a report taken off the list ------------------------------------------------------
const deactivates = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("button")).filter((b) => b.offsetParent !== null).map((b) => {
  const card = b.closest("[data-report-group] > div > div");
  return { word: (b.innerText || "").trim(), card: card ? (card.querySelector("span") || {}).innerText || "" : "" };
}));
async function reportCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/reports/" + x;
  const word = (d) => d.say("Deactivate");
  const onCards = async (d) => (await deactivates(d)).filter((x) => x.word === word(d)).map((x) => x.card);

  // Guard: an admin is offered Deactivate on the saved report and on no template.
  await withDriver(ctx, { name: "reports-admin", lang }, async (d) => {
    await d.goto("reports");
    await until(d, "[data-report-group]", 8000);
    await d.settle(500);
    const cards = await onCards(d);
    results.check(KIND, id("guard-an-admin-is-offered-deactivate-on-a-saved-report-only"), cards.join(",") === "Night shift issue watch", "Deactivate shows on " + say(cards));
  });

  // A supervisor is not offered Deactivate on a report an admin made, which the API would refuse.
  await withDriver(ctx, { name: "reports-supervisor", lang, persona: "supervisor" }, async (d) => {
    await d.goto("reports");
    await until(d, "[data-report-group]", 8000);
    await d.settle(500);
    const cards = await onCards(d);
    results.check(KIND, id("a-supervisor-is-not-offered-deactivate-on-someone-else-s-report"), cards.length === 0, "Deactivate shows a supervisor on " + say(cards));
  });

  // Guard: a supervisor who made the report is offered it, and it goes.
  await withDriver(ctx, { name: "reports-own", lang, persona: "supervisor", arm: (s) => s.setScene372({ reportBy: seed.PEOPLE.supervisor.id }) }, async (d) => {
    await d.goto("reports");
    await until(d, "[data-report-group]", 8000);
    await d.settle(500);
    const cards = await onCards(d);
    await d.setConfirmAnswer(true);
    const mark = d.mark();
    await d.page.getByRole("button", { name: word(d), exact: true }).first().click().catch(() => {});
    await d.settle(800);
    const sent = d.callsSince(mark).filter((c) => c.method === "DELETE" && /^\/api\/report-engine\/definitions\/rd-4$/.test(c.path));
    results.check(KIND, id("guard-the-maker-is-offered-deactivate-and-it-goes"), cards.join(",") === "Night shift issue watch" && sent.length === 1 && sent[0].status === 200,
      "Deactivate shows on " + say(cards) + "; " + sent.length + " removal(s) answered " + say(sent.map((c) => c.status)));
  });
}

async function run(ctx) {
  for (const lang of LANGS) {
    await round8Cases(ctx, lang);
    await pictureCases(ctx, lang);
    await reportCases(ctx, lang);
  }
}

module.exports = { run, round8Cases, pictureCases, reportCases };
