// What the API's Round 12 gave the dashboard (part 389), against the stub as the API is built at ocsa-api main
// e4f2048 (audit/part389-stub.js, over audit/part386-stub.js), armed as the API is built (setApiAsBuilt) with
// Round 2's file log (setStep353) and part 364's answers (setStep364). Each case runs in English and in Spanish,
// and each fails on main as it stood at 3730017 unless its name says it is a guard.
//
//   findings  findings as training or a conversation: Inspections' Findings tab lists them, the ones with no
//             follow-up and the late ones first, with its filters; a finding's window chooses training (the
//             suggested topic first) or a conversation and names the owner, records the conversation, and draws
//             every refusal in the API's words under the field its keys name; the issue page of a finding shows
//             its follow-up and offers no assign, and assign-as-task's 409 issues.findingNoTask is said in its
//             words with the way to the follow-up; the person's HR file shows their conversations under Coaching
//             and their training from findings; the inspection's page, its PDF and CSV, the analytics CSV and the
//             corrective action show each finding's follow-up and the day it was done; what was covered is kept
//             from someone who does not read HR records
//   more      what else Round 12 gave the dashboard: the slowest route's floor (minRequests) in the lines editor,
//             with its default in words, held in words outside 1 to 10,000 and sent beside yellow and red; a
//             task's 400 tasks.badDetails drawn under the fields its keys name, on Add Task and Edit Task on a
//             site and on Assigned Tasks' Create Task
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");
const { parseCsv } = require("./exports");

const KIND = "part389";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const LANGS = ["en", "es"];
const say = (x) => JSON.stringify(x);
const fill = (s, ...v) => String(s).replace(/\{(\d+)\}/g, (m, n) => (v[Number(n)] !== undefined ? String(v[Number(n)]) : m));
const before = (s) => String(s).split("{0}")[0];

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
const reads = (d, mark, re) => d.callsSince(mark).filter((c) => c.method === "GET" && re.test(c.path));
const click = async (d, sel) => { await d.page.locator(sel).first().click().catch(() => {}); await d.settle(300); };
const pick = async (d, sel, value) => { await d.page.locator(sel).first().selectOption(String(value)).catch(() => {}); await d.settle(300); };

// The API's words for a refusal (helpers/words.js), as audit/part389-stub.js answers them.
const API = {
  "access.insufficientPermissions": ["Insufficient permissions", "No tiene permiso para hacer esto"],
  "inspections.badFollowUp": ["Choose training with a lesson topic, or a conversation", "Elija una capacitaci\u00f3n con un tema de lecci\u00f3n, o una conversaci\u00f3n"],
  "inspections.ownerRequired": ["Choose an owner for this finding first", "Primero elija un responsable para este hallazgo"],
  "inspections.badConversation": ["Say when it was held, what was covered and who else was there", "Indique cu\u00e1ndo se tuvo, qu\u00e9 se trat\u00f3 y qui\u00e9n m\u00e1s estuvo"],
  "issues.findingNoTask": ["A finding is followed up with training or a conversation, not a task", "Un hallazgo se atiende con capacitaci\u00f3n o una conversaci\u00f3n, no con una tarea"],
  "tasks.badDetails": ["Some task details are not valid", "Algunos datos de la tarea no son v\u00e1lidos"],
};
const api = (code, lang) => API[code][lang === "es" ? 1 : 0];
const TOPIC = {
  "tp-3": ["Ladder use", "Uso de escaleras"],
  "tp-8": ["Glass and surface cleaning", "Limpieza de vidrios y superficies"],
};
const topic = (id, lang) => TOPIC[id][lang === "es" ? 1 : 0];

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

const rowsOf = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("[data-finding-row]")).map((x) => x.getAttribute("data-finding-row") + ":" + x.getAttribute("data-finding-state")));
async function openFindings(d, hash) {
  await goHash(d, hash || "inspections/findings");
  await until(d, "[data-finding-row]", 8000);
  await d.settle(300);
}
async function openFinding(d, fid) {
  await goHash(d, "inspections/findings/" + fid);
  await until(d, "[data-finding-window='" + fid + "']", 8000);
  await d.settle(300);
}

// ---- Section 1: findings as training or a conversation ---------------------------------------------------------
async function findingsCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/findings/" + x;

  // 1. The Findings tab reads the open findings and lists the ones with no follow-up first, then the late one, then
  //    the open one, each saying what it waits on; the tab counts the ones with no follow-up and the late ones.
  await withDriver(ctx, { name: "list", lang }, async (d) => {
    const mark = d.mark();
    await openFindings(d);
    const read = reads(d, mark, /^\/api\/inspections\/findings$/).length;
    const rows = await rowsOf(d);
    const want = ["f-1:needsFollowUp", "f-5:needsFollowUp", "f-6:overdue", "f-2:open"];
    const late = await textOf(d, "[data-finding-row='f-6'] [data-follow-up-when]");
    const by = await textOf(d, "[data-finding-row='f-1'] [data-finding-choose-by]");
    const tab = await textOf(d, "[data-inspections-tab='findings']");
    const wantTab = d.say("Findings") + " (3)";
    results.check(KIND, id("the-tab-lists-no-follow-up-and-late-first"), read >= 1 && say(rows) === say(want) && late.indexOf(before(d.say("Late, due {0}"))) === 0 && by.indexOf(before(d.say("Choose it by {0}"))) === 0 && tab === wantTab,
      read < 1 ? "the tab read no findings" : "the rows read " + say(rows) + " (want " + say(want) + "), the late one " + say(late) + ", f-1 " + say(by) + ", the tab " + say(tab) + " (want " + say(wantTab) + ")");
  });

  // 2. Its filters go to the API: a conversation reads the late one alone, and Done reads the one whose
  //    conversation was held, with the day it was done.
  await withDriver(ctx, { name: "filters", lang }, async (d) => {
    await openFindings(d);
    let mark = d.mark();
    await pick(d, "select[data-findings-filter='kind']", "conversation");
    await d.settle(500);
    const kindRead = reads(d, mark, /^\/api\/inspections\/findings$/).map((c) => c.query).pop() || "";
    const talks = await rowsOf(d);
    await pick(d, "select[data-findings-filter='kind']", "");
    mark = d.mark();
    await pick(d, "select[data-findings-filter='status']", "done");
    await d.settle(500);
    const doneRead = reads(d, mark, /^\/api\/inspections\/findings$/).map((c) => c.query).pop() || "";
    const done = await rowsOf(d);
    const when = await textOf(d, "[data-finding-row='f-3'] [data-follow-up-when]");
    results.check(KIND, id("the-filters-are-the-api-s"), /kind=conversation/.test(kindRead) && say(talks) === say(["f-6:overdue"]) && /status=done/.test(doneRead) && say(done) === say(["f-3:done"]) && when.indexOf(before(d.say("Done on {0}"))) === 0,
      "kind sent " + say(kindRead) + " and read " + say(talks) + "; status sent " + say(doneRead) + " and read " + say(done) + ", f-3 " + say(when));
  });

  // 3. Choose training for a finding with no owner: the suggested topic first and chosen, the owner picked from the
  //    site's people, sent as { kind, topicId, ownerId }, and the window reads the training and its due day.
  await withDriver(ctx, { name: "choose-training", lang }, async (d, stubs) => {
    await openFinding(d, "f-1");
    await click(d, "[data-finding-choose-open]");
    await until(d, "[data-finding-choose] select[data-finding-field='topicId'] option[value='tp-3']", 6000);
    const chosen = await d.page.locator("select[data-finding-field='topicId']").first().inputValue().catch(() => "");
    const first = await d.page.evaluate(() => { const o = document.querySelectorAll("select[data-finding-field='topicId'] option"); return o.length > 1 ? o[1].textContent : ""; });
    const wantFirst = fill(d.say("{0} (suggested)"), topic("tp-3", lang));
    await pick(d, "select[data-finding-field='ownerId']", "u-staff-6");
    await click(d, "[data-finding-choose-save]");
    await until(d, "[data-finding-said='saved']", 6000);
    const sent = (stubs.sent389().filter((x) => x.what === "follow-up").pop() || {}).body || {};
    const kind = await attr(d, "[data-finding-window='f-1'] [data-finding-follow-up]", "data-finding-follow-up");
    const what = await textOf(d, "[data-finding-window='f-1'] [data-follow-up='window']");
    const owner = await attr(d, "[data-finding-window-owner]", "data-finding-window-owner");
    const body = sent.body || {};
    results.check(KIND, id("choose-training-with-the-suggested-topic-and-an-owner"), chosen === "tp-3" && first === wantFirst && body.kind === "training" && body.topicId === "tp-3" && body.ownerId === "u-staff-6" && kind === "training"
      && what.indexOf(fill(d.say("Training: {0}"), topic("tp-3", lang))) === 0 && owner === "u-staff-6",
      "the topic chosen " + say(chosen) + ", first " + say(first) + " (want " + say(wantFirst) + "), sent " + say(body) + ", the window reads " + say([kind, what, owner]));
  });

  // 4. Every refusal of a choice is drawn under the field its keys name, in the API's words: a training with no
  //    topic under Lesson topic, then a finding with no owner under Owner. Nothing is written.
  await withDriver(ctx, { name: "choose-refused", lang }, async (d, stubs) => {
    await openFinding(d, "f-5");
    await click(d, "[data-finding-choose-open]");
    await until(d, "[data-finding-choose] select[data-finding-field='topicId'] option[value='tp-8']", 6000);
    await pick(d, "select[data-finding-field='topicId']", "");
    await click(d, "[data-finding-choose-save]");
    await until(d, "[data-finding-refusal='topicId']", 5000);
    const topicSaid = await textOf(d, "[data-finding-refusal='topicId']");
    await pick(d, "select[data-finding-field='topicId']", "tp-8");
    await click(d, "[data-finding-choose-save]");
    await until(d, "[data-finding-refusal='ownerId']", 5000);
    const ownerSaid = await textOf(d, "[data-finding-refusal='ownerId']");
    const written = stubs.followUps389().filter((x) => x.issueId === "f-5").length;
    results.check(KIND, id("refusals-are-drawn-under-their-fields"), topicSaid === api("inspections.badFollowUp", lang) && ownerSaid === api("inspections.ownerRequired", lang) && written === 0,
      "under the topic " + say(topicSaid) + ", under the owner " + say(ownerSaid) + ", follow-ups written " + written);
  });

  // 5. Record the conversation of the late finding: an empty What was covered is refused under it, then it is sent
  //    with when it was held as an instant with its zone and who else was there, and the window reads it held,
  //    the finding done, and the person not yet confirmed.
  await withDriver(ctx, { name: "record", lang }, async (d, stubs) => {
    await openFinding(d, "f-6");
    await click(d, "[data-finding-record-open]");
    await until(d, "[data-finding-record]", 5000);
    await click(d, "[data-finding-record-save]");
    await until(d, "[data-finding-refusal='covered']", 5000);
    const empty = await textOf(d, "[data-finding-refusal='covered']");
    await d.page.locator("textarea[data-finding-field='covered']").first().fill("Walked the third landing together and agreed on a dusting round each week.", { timeout: 3000 }).catch(() => {});
    await d.page.locator("input[data-finding-field='othersPresent']").first().fill("The site's lead", { timeout: 3000 }).catch(() => {});
    await click(d, "[data-finding-record-save]");
    await until(d, "[data-finding-said='saved']", 6000);
    const body = ((stubs.sent389().filter((x) => x.what === "conversation").pop() || {}).body || {}).body || {};
    const stateNow = await attr(d, "[data-finding-window='f-6']", "data-finding-window-state");
    const confirmed = await attr(d, "[data-finding-window='f-6'] [data-conversation-confirmed]", "data-conversation-confirmed");
    const covered = await textOf(d, "[data-finding-window='f-6'] [data-conversation-covered]");
    results.check(KIND, id("record-the-conversation-held"), empty === api("inspections.badConversation", lang) && body.heldAt === seed.NOW_ISO && body.covered === "Walked the third landing together and agreed on a dusting round each week." && body.othersPresent === "The site's lead"
      && stateNow === "done" && confirmed === "no" && covered.indexOf("Walked the third landing") === 0,
      "empty read " + say(empty) + "; sent " + say(body) + "; the window reads " + say([stateNow, confirmed, covered]));
  });

  // 6. A choice the API refuses outright (403 to someone who may not decide at the site) is said above the form in
  //    the API's words.
  await withDriver(ctx, { name: "refused-outright", lang, arm: (s) => s.setScene389({ noDecide: true }) }, async (d) => {
    await openFinding(d, "f-1");
    await click(d, "[data-finding-choose-open]");
    await until(d, "select[data-finding-field='ownerId'] option[value='u-staff-6']", 6000);
    await pick(d, "select[data-finding-field='ownerId']", "u-staff-6");
    await click(d, "[data-finding-choose-save]");
    await until(d, "[data-finding-refusal='access.insufficientPermissions']", 5000);
    const text = await textOf(d, "[data-finding-refusal='access.insufficientPermissions']");
    results.check(KIND, id("a-refusal-with-no-field-reads-above-the-form"), text === api("access.insufficientPermissions", lang), "the window said " + say(text));
  });

  // 7. The issue page of a finding shows its follow-up and offers no assign; Open the follow-up lands on the finding's
  //    window under Inspections.
  await withDriver(ctx, { name: "issue-page", lang }, async (d) => {
    await goHash(d, "issues/f-2");
    await until(d, "[data-issue-follow-up]", 8000);
    await d.settle(400);
    const kind = await attr(d, "[data-issue-follow-up]", "data-issue-follow-up");
    const what = await textOf(d, "[data-follow-up='issue']");
    const assign = await d.modal().getByText(d.say("Assign as Task"), { exact: true }).count();
    const reassign = await d.modal().getByText(d.say("Reassign"), { exact: true }).count();
    await click(d, "[data-issue-open-follow-up]");
    await until(d, "[data-finding-window='f-2']", 8000);
    const hash = await d.page.evaluate(() => window.location.hash);
    results.check(KIND, id("a-finding-s-issue-shows-its-follow-up-and-no-assign"), kind === "training" && what.indexOf(fill(d.say("Training: {0}"), topic("tp-8", lang))) === 0 && assign === 0 && reassign === 0 && hash === "#inspections/findings/f-2",
      "the box reads " + say([kind, what]) + ", assign offered " + (assign + reassign) + " time(s), the button lands on " + say(hash));
  });

  // 8. Assign as Task on a finding, offered by an issue read with no follow-up, is refused 409 issues.findingNoTask:
  //    the window says so in the API's words and Choose its follow-up lands on the finding's window.
  await withDriver(ctx, { name: "no-task", lang, arm: (s) => s.setScene389({ oldIssue: true }) }, async (d) => {
    await goHash(d, "issues/f-1");
    await until(d, "[data-issue-status]", 8000);
    await d.settle(400);
    await d.clickText(d.say("Assign as Task"), { inModal: true });
    await until(d, "[data-person-pick-field]");
    await d.pickPerson("Yuki");
    await d.clickText(d.say("Assign Task"), { inModal: true });
    await until(d, "[data-issue-assign-refusal='issues.findingNoTask']", 5000);
    const text = await d.page.locator("[data-issue-assign-refusal='issues.findingNoTask']").first().evaluate((x) => (x.firstChild && x.firstChild.nodeType === 3 ? x.firstChild.textContent : x.textContent)).catch(() => "");
    await click(d, "[data-issue-assign-follow-up]");
    await until(d, "[data-finding-window='f-1']", 8000);
    const hash = await d.page.evaluate(() => window.location.hash);
    results.check(KIND, id("assign-as-task-on-a-finding-reads-the-way-to-its-follow-up"), String(text).trim() === api("issues.findingNoTask", lang) && hash === "#inspections/findings/f-1",
      "the window said " + say(String(text).trim()) + " and the way lands on " + say(hash));
  });

  // 9. The person's HR file holds their conversations under Coaching, apart from warnings, newest first, the held one
  //    with what was covered and the person's confirmation, and their training from a finding.
  await withDriver(ctx, { name: "hr-file", lang }, async (d) => {
    await goHash(d, "hr/" + seed.PEOPLE.supervisor.id);
    await until(d, "[data-folder-coaching]", 8000);
    const talks = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-folder-coaching-row]")).map((x) => x.getAttribute("data-folder-coaching-row") + ":" + x.getAttribute("data-folder-coaching-state")));
    const covered = await textOf(d, "[data-folder-coaching-row='fu-3'] [data-conversation-covered]");
    const confirmed = await attr(d, "[data-folder-coaching-row='fu-3'] [data-conversation-confirmed]", "data-conversation-confirmed");
    const lesson = await textOf(d, "[data-folder-finding-training-row='fu-1'] [data-follow-up]");
    const head = await textOf(d, "[data-folder-coaching]");
    results.check(KIND, id("the-hr-file-shows-coaching-and-training-from-findings"), say(talks) === say(["fu-2:overdue", "fu-3:done"]) && covered.indexOf("Went over the dock floor markings") === 0 && confirmed === "yes"
      && lesson.indexOf(fill(d.say("Training: {0}"), topic("tp-8", lang))) === 0 && head.indexOf(d.say("Coaching")) === 0,
      "Coaching lists " + say(talks) + ", the held one reads " + say([covered.slice(0, 40), confirmed]) + ", training " + say(lesson) + ", heading " + say(head.slice(0, 20)));
  });

  // 10. The inspection's page shows each finding's follow-up: the training and its due day, the conversation done
  //     and its day, and none yet.
  await withDriver(ctx, { name: "inspection-page", lang }, async (d) => {
    await goHash(d, "inspections/insp-1");
    await until(d, "[data-inspection-findings] [data-follow-up]", 8000);
    const kinds = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-inspection-findings] [data-follow-up]")).map((x) => x.getAttribute("data-follow-up") + ":" + x.getAttribute("data-follow-up-kind") + ":" + (x.getAttribute("data-follow-up-state") || "")));
    const two = await textOf(d, "[data-follow-up='inspection-f-2']");
    const three = await textOf(d, "[data-follow-up='inspection-f-3'] [data-follow-up-when]");
    const want = ["inspection-f-1:none:", "inspection-f-2:training:open", "inspection-f-3:conversation:done", "inspection-f-4:none:", "inspection-f-6:conversation:overdue"];
    results.check(KIND, id("the-inspection-s-page-shows-each-follow-up"), say(kinds.slice().sort()) === say(want) && two.indexOf(fill(d.say("Training: {0}"), topic("tp-8", lang))) === 0 && three.indexOf(before(d.say("Done on {0}"))) === 0,
      "the findings read " + say(kinds) + ", f-2 " + say(two) + ", f-3 " + say(three));
  });

  // 11. Its Export PDF lists the findings with their follow-ups, and its CSV says each card's follow-up, when it is
  //     due and when it was done.
  await withDriver(ctx, { name: "inspection-files", lang }, async (d) => {
    await goHash(d, "inspections/insp-1");
    await until(d, "[data-print='inspection']", 8000);
    await d.clearCaptures();
    await click(d, "[data-print='inspection']");
    let html = "";
    for (let i = 0; i < 40 && !html; i += 1) { await wait(100); const p = await d.prints(); html = p.length ? String(p[p.length - 1].html || "") : ""; }
    const printed = /data-print-findings/.test(html) && html.indexOf(fill(d.say("Training: {0}"), topic("tp-8", lang)).replace(/'/g, "&#39;")) >= 0 && html.indexOf(d.say("Follow-up")) >= 0;
    await click(d, "[data-inspection-csv]");
    await d.settle(300);
    const file = (await d.downloads()).filter((x) => /^inspection-/.test(x.name)).pop();
    const rows = file ? parseCsv(file.body) : [];
    const head = rows[0] || [];
    const at = head.indexOf("Follow-up");
    const glass = rows.find((r) => r[0] === "Lobby glass") || [];
    const dock = rows.find((r) => r[0] === "Dock floor markings") || [];
    results.check(KIND, id("the-pdf-and-csv-carry-each-follow-up"), printed && at > 0 && glass[at] === "Training" && glass[at + 1] === "2026-03-22" && dock[at] === "Conversation" && /^\d{4}-\d{2}-\d{2}$/.test(dock[at + 2] || ""),
      (printed ? "the PDF lists the follow-ups" : "the PDF has no findings with their follow-ups") + "; the CSV's head " + say(head) + ", Lobby glass " + say(glass.slice(at)) + ", Dock floor markings " + say(dock.slice(at)));
  });

  // 12. The analytics CSV adds each card's finding and its follow-up, from the export's rows.
  await withDriver(ctx, { name: "analytics-csv", lang }, async (d) => {
    await goHash(d, "inspections");
    await click(d, "[data-inspections-tab='reports']");
    await d.settle(600);
    await d.clearCaptures();
    await d.clickText(d.say("Export CSV"), { exact: true });
    await d.settle(400);
    const file = (await d.downloads()).filter((x) => /^inspection-analytics-/.test(x.name)).pop();
    const rows = file ? parseCsv(file.body) : [];
    const head = rows[0] || [];
    const at = head.indexOf("Finding ID");
    const f3 = rows.find((r) => at > 0 && r[at] === "f-3") || [];
    results.check(KIND, id("the-analytics-csv-carries-each-follow-up"), at > 0 && head[at + 1] === "Follow-up" && f3[at + 1] === "Conversation" && /^\d{4}-\d{2}-\d{2}$/.test(f3[at + 3] || ""),
      "the head " + say(head.slice(at > 0 ? at : 0)) + ", f-3's row " + say(f3.slice(at > 0 ? at : 0)));
  });

  // 13. The corrective action's linked findings say each one's follow-up.
  await withDriver(ctx, { name: "corrective", lang }, async (d) => {
    await goHash(d, "forms/reports/fr-ca-1");
    await until(d, "[data-linked-finding='f-1'] [data-follow-up]", 8000);
    const kind = await attr(d, "[data-follow-up='linked-f-1']", "data-follow-up-kind");
    const text = await textOf(d, "[data-follow-up='linked-f-1']");
    results.check(KIND, id("the-corrective-action-shows-each-follow-up"), kind === "none" && text === d.say("No follow-up yet"), "the linked finding reads " + say([kind, text]));
  });

  // 14. Someone who does not read HR records, and neither held nor was the person, reads that what was covered is
  //     kept, and is offered no choice on a finding whose follow-up is done.
  await withDriver(ctx, { name: "covered-kept", lang, persona: "capability" }, async (d) => {
    await openFinding(d, "f-3");
    const kept = await textOf(d, "[data-finding-window='f-3'] [data-conversation-covered-kept]");
    const shown = await has(d, "[data-finding-window='f-3'] [data-conversation-covered]");
    const choose = await has(d, "[data-finding-choose-open]");
    results.check(KIND, id("what-was-covered-is-kept-from-others"), kept === d.say("What was covered is read only by those who read HR records, the person and whoever recorded it.") && !shown && !choose,
      "the window reads " + say(kept) + (shown ? ", and shows what was covered" : "") + (choose ? ", and offers a choice" : ""));
  });
}

// ---- Section 2: what else Round 12 gave the dashboard ---------------------------------------------------------
async function moreCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/more/" + x;
  const writes = (d, mark, method, re) => d.callsSince(mark).filter((c) => c.method === method && re.test(c.path));

  // 1. The slowest route's floor: its box reads the saved 20 with the default in words; 0 is held in words with
  //    nothing sent; 30 is sent beside the number's yellow and red, and the box reads what the API answered.
  await withDriver(ctx, { name: "floor", lang, persona: "superAdmin" }, async (d) => {
    await goHash(d, "health/settings");
    await until(d, "[data-health-floor='slowest_p95_ms']", 8000);
    const box = d.page.locator("[data-health-line='slowest_p95_ms.minRequests']").first();
    const first = await box.inputValue().catch(() => "");
    const dflt = await textOf(d, "[data-health-threshold='slowest_p95_ms'] [data-health-floor-default]");
    const wantDefault = lang === "es" ? "De forma predeterminada, una ruta cuenta a partir de 20 solicitudes al d\u00eda." : "A route counts from 20 requests a day by default.";
    await box.fill("0");
    let mark = d.mark();
    await click(d, "[data-health-thresholds-save]");
    await d.settle(300);
    const heldPuts = writes(d, mark, "PUT", /^\/api\/health\/thresholds$/).length;
    const held = await textOf(d, "[data-health-thresholds-said]");
    const outlined = await box.evaluate((x) => x.style.borderColor || "").catch(() => "");
    await box.fill("30");
    mark = d.mark();
    await click(d, "[data-health-thresholds-save]");
    await until(d, "[data-health-thresholds-said='saved']", 6000);
    const put = writes(d, mark, "PUT", /^\/api\/health\/thresholds$/).pop();
    const lines = put && put.body && put.body.thresholds ? put.body.thresholds.slowest_p95_ms : null;
    const after = await box.inputValue().catch(() => "");
    results.check(KIND, id("the-slowest-route-s-floor-in-the-lines-editor"), first === "20" && dflt === wantDefault && heldPuts === 0 && held === d.say("Type a whole number of requests from 1 to 10,000.") && outlined !== ""
      && !!lines && lines.minRequests === 30 && lines.yellow === 1500 && lines.red === 3000 && !!put && put.status === 200 && after === "30",
      "the box read " + say(first) + " with " + say(dflt) + "; 0 sent " + heldPuts + " PUT(s), said " + say(held) + ", outlined " + say(outlined) + "; 30 sent " + say(lines) + (put ? " answered " + put.status : "") + ", the box reads " + say(after));
  });

  // 2. Add Task with a priority and a category the API's table does not take: 400 tasks.badDetails is drawn under
  //    Priority and under Service Category in the API's words, and the window stays open.
  await withDriver(ctx, { name: "add-task", lang }, async (d) => {
    await goHash(d, "sites/s-1/tasks");
    await until(d, "[data-site-task]", 8000);
    await d.clickText(d.say("Add Task"), { exact: true });
    await until(d, "select[data-task-field='priority']", 5000);
    await d.modal().locator("input[placeholder='" + d.say("e.g. Vacuum carpets") + "']").first().fill("Wipe the reception desk").catch(() => {});
    await d.modal().locator("input[placeholder='" + d.say("e.g. Restrooms") + "']").first().fill("Lobby").catch(() => {});
    await pick(d, "select[data-task-field='priority']", "urgent");
    await pick(d, "select[data-task-field='serviceCategory']", "GB");
    const mark = d.mark();
    await d.modal().getByRole("button", { name: d.say("Create"), exact: true }).first().click().catch(() => {});
    await until(d, "[data-task-refusal='priority']", 5000);
    const post = writes(d, mark, "POST", /^\/api\/sites\/s-1\/tasks$/).pop();
    const pri = await textOf(d, "[data-task-refusal='priority']");
    const cat = await textOf(d, "[data-task-refusal='serviceCategory']");
    const open = await d.modalOpen();
    results.check(KIND, id("add-task-draws-the-refusal-under-its-fields"), !!post && post.status === 400 && pri === api("tasks.badDetails", lang) && cat === api("tasks.badDetails", lang) && open,
      "Create " + (post ? "answered " + post.status : "sent nothing") + "; under Priority " + say(pri) + ", under Service Category " + say(cat) + (open ? "" : ", and the window closed"));
  });

  // 3. Edit Task on a checklist item with a category the API's table does not take: drawn under Service Category
  //    alone.
  await withDriver(ctx, { name: "edit-task", lang }, async (d) => {
    await goHash(d, "sites/s-1/tasks");
    await until(d, "[data-site-task='ck-1']", 8000);
    await d.page.locator("[data-site-task='ck-1']").first().click().catch(() => {});
    await until(d, "select[data-task-field='serviceCategory']", 5000);
    await pick(d, "select[data-task-field='serviceCategory']", "GB");
    const mark = d.mark();
    await d.modal().getByRole("button", { name: d.say("Save Changes"), exact: true }).first().click().catch(() => {});
    await until(d, "[data-task-refusal='serviceCategory']", 5000);
    const patch = writes(d, mark, "PATCH", /^\/api\/sites\/s-1\/tasks\/[^/]+$/).pop();
    const cat = await textOf(d, "[data-task-refusal='serviceCategory']");
    const pri = await has(d, "[data-task-refusal='priority']");
    results.check(KIND, id("edit-task-draws-the-refusal-under-its-field"), !!patch && patch.status === 400 && cat === api("tasks.badDetails", lang) && !pri,
      "Save " + (patch ? "answered " + patch.status : "sent nothing") + "; under Service Category " + say(cat) + (pri ? ", and under Priority too" : ""));
  });

  // 4. Assigned Tasks' Create Task with a priority the API's table does not take: drawn under Priority.
  await withDriver(ctx, { name: "create-task", lang }, async (d) => {
    await goHash(d, "assigned");
    await d.settle(400);
    await d.clickText(d.say("Create Task"), { exact: false });
    await until(d, "select[data-task-field='priority']", 5000);
    await d.modal().locator("select").first().selectOption(seed.SITES[0].id).catch(() => {});
    await d.fillByLabel(d.say("Task Description *"), "Polish the hallway floor");
    await d.fillByLabel(d.say("Zone *"), "Hallway");
    await pick(d, "select[data-task-field='priority']", "urgent");
    await d.modal().locator("[data-person-pick-field]").first().click().catch(() => {});
    await d.page.locator("[data-person-pick-option]", { hasText: "Tomasz" }).first().click().catch(() => {});
    await d.settle(200);
    const mark = d.mark();
    await d.clickText(d.say("Create and Assign"), { inModal: true });
    await until(d, "[data-task-refusal='priority']", 5000);
    const post = writes(d, mark, "POST", /^\/api\/sites\/[^/]+\/tasks$/).pop();
    const pri = await textOf(d, "[data-task-refusal='priority']");
    results.check(KIND, id("create-task-draws-the-refusal-under-priority"), !!post && post.status === 400 && pri === api("tasks.badDetails", lang),
      "Create and Assign " + (post ? "answered " + post.status : "sent nothing") + "; under Priority " + say(pri));
  });
}

// ctx.only, when a runner names sections, keeps the run to them.
async function run(ctx) {
  const want = (x) => !ctx.only || ctx.only.indexOf(x) >= 0;
  for (const lang of LANGS) {
    if (want("findings")) await findingsCases(ctx, lang);
    if (want("more")) await moreCases(ctx, lang);
  }
}

module.exports = { run };
