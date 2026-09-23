// The language the dashboard asks the API for, and what it does with the answer.
//
// Every call says the language the screen is drawn in, as Accept-Language, so the API's refusals,
// notices, pick lists and checklist items come back in the language the person is reading. The stub
// keeps what each call said beside the call, and keeps every call that said nothing, or another
// language, in a list no case can reset. That list is read in runLate, once the whole run is over,
// so a call made anywhere in any suite is held to it.
//
// run is the other half, read in Spanish, where an item's display and a choice's displayLabel are
// different words from the English they were saved in. A screen that only shows an item or a choice
// draws those; a screen that edits one shows the English and saves the English, since the English is
// what the dashboard edits and the API translates it on save.
"use strict";
const { readTable } = require("../lib/words");

// The fixtures run() reads, in the stub's own words. at-1 carries a display; at-3 carries none.
const ITEM = { id: "at-1", english: "Strip and refinish lobby", zone: "Lobby", spanish: "Decapar y encerar el vest\u00edbulo",
  zoneSpanish: "Vest\u00edbulo", descriptionSpanish: "Decapar, sellar y encerar el piso del vest\u00edbulo." };
const BARE = "Pressure wash dock apron";
const CHOICE = { id: "lv-1", english: "Service Delivery", spanish: "Prestaci\u00f3n del servicio" };
const PRIORITY = { code: "urgent", english: "Urgent", spanish: "Urgente" };

async function run({ d, results, inventory, stubs }) {
  const ids = {};
  inventory.DISPLAY_FIELDS.forEach((x) => { ids[x.id.split("/")[1]] = x.id; });
  await d.signOutHard();
  await d.signIn("admin");

  // A shown item: the list and the task window draw the display, and the English only where the API
  // sent no display at all.
  await d.goto("assigned");
  const list = await d.bodyText();
  let windowText = "";
  const opened = await d.clickText(ITEM.spanish, { exact: false }).catch(() => false);
  if (opened) { windowText = await d.modalText(); await d.closeModal(); }
  const listOk = list.indexOf(ITEM.spanish) >= 0 && list.indexOf(ITEM.english) < 0 && list.indexOf(BARE) >= 0;
  const windowOk = opened && windowText.indexOf(ITEM.spanish) >= 0 && windowText.indexOf(ITEM.descriptionSpanish) >= 0
    && windowText.indexOf(ITEM.zoneSpanish) >= 0 && windowText.indexOf(ITEM.english) < 0;
  results.check("language", ids["a-shown-item-reads-its-display"], listOk && windowOk,
    !listOk ? "the list should draw " + JSON.stringify(ITEM.spanish) + " for at-1 and " + JSON.stringify(BARE)
      + " for at-3, which has no display; it draws " + JSON.stringify(list.slice(0, 160))
      : !opened ? "the task window did not open from " + JSON.stringify(ITEM.spanish)
        : "the task window should draw the display's label, description and zone; it draws " + JSON.stringify(windowText.slice(0, 200)));

  // A shown choice: the priority picker in the create window reads each choice's displayLabel, and
  // what the window sends is still the code.
  let choiceOk = false;
  let choiceWhy = "the create window did not open from " + JSON.stringify(d.say("Create Task"));
  if (await d.clickText(d.say("Create Task"), { exact: false }).catch(() => false)) {
    const options = await d.modal().locator("select option").evaluateAll((els) => els.map((o) => ({ v: o.value, l: (o.textContent || "").trim() })));
    const shown = options.find((o) => o.v === PRIORITY.code);
    const english = options.find((o) => o.l === PRIORITY.english);
    if (!shown || shown.l !== PRIORITY.spanish || english) {
      choiceWhy = "the priority picker should offer " + JSON.stringify(PRIORITY.spanish) + " with the value " + JSON.stringify(PRIORITY.code)
        + "; it offers " + JSON.stringify(options.map((o) => o.v + "=" + o.l).slice(0, 12));
    } else {
      // Filled and sent, so what leaves the window can be read: the code, whatever the picker said.
      // The window's pickers are the site, the priority and the person, in that order.
      const pickers = await d.modal().locator("select").evaluateAll((els) => els.map((s) => Array.from(s.options)
        .filter((o) => o.value).map((o) => (o.textContent || "").trim())));
      await d.pickOption(pickers[0][0], { inModal: true });
      await d.fillByLabel(d.say("Task Description *"), "Pulir el piso del pasillo");
      await d.fillByLabel(d.say("Zone *"), "Pasillo");
      await d.pickOption(PRIORITY.spanish, { inModal: true });
      await d.pickOption(pickers[2][0], { inModal: true });
      const mark = d.mark();
      await d.clickText(d.say("Create and Assign"), { inModal: true });
      const sent = d.callsSince(mark).filter((c) => c.method === "POST" && /\/api\/sites\/[^/]+\/tasks$/.test(c.path)).pop();
      choiceOk = !!sent && sent.body && sent.body.priority === PRIORITY.code;
      choiceWhy = !sent ? "the create window sent nothing" : "the create window sent priority " + JSON.stringify(sent.body && sent.body.priority)
        + " where the code is " + JSON.stringify(PRIORITY.code);
    }
    await d.closeModal();
  }
  results.check("language", ids["a-shown-choice-reads-its-display-label"], choiceOk, choiceWhy);

  // An edited item: the Sites task editor opens on the English it was saved in and saves it back,
  // with the API's display on the same row in Spanish.
  let itemOk = false;
  let itemWhy = "the task editor did not open";
  await d.goto("sites");
  await d.clickRow(0);
  await d.clickText("Service Details", { exact: false });
  if (await d.clickText(ITEM.english, { exact: false }).catch(() => false)) {
    const values = await d.modal().locator("input, textarea").evaluateAll((els) => els.map((e) => e.value));
    const mark = d.mark();
    await d.clickText("Save Changes", { inModal: true });
    const sent = d.callsSince(mark).filter((c) => c.method === "PATCH" && c.path.indexOf("/tasks/" + ITEM.id) >= 0).pop();
    const showsEnglish = values.indexOf(ITEM.english) >= 0 && values.indexOf(ITEM.zone) >= 0
      && values.indexOf(ITEM.spanish) < 0 && values.indexOf(ITEM.zoneSpanish) < 0;
    const sendsEnglish = !!sent && sent.body && sent.body.label === ITEM.english && sent.body.zone === ITEM.zone;
    itemOk = showsEnglish && sendsEnglish;
    itemWhy = !showsEnglish ? "the task editor shows " + JSON.stringify(values.filter(Boolean).slice(0, 4)) + " where the English is "
      + JSON.stringify([ITEM.english, ITEM.zone])
      : !sent ? "the task editor sent nothing" : "the task editor sent label " + JSON.stringify(sent.body && sent.body.label)
        + " and zone " + JSON.stringify(sent.body && sent.body.zone) + " where the English is " + JSON.stringify([ITEM.english, ITEM.zone]);
    await d.closeModal();
  }
  results.check("language", ids["an-edited-item-shows-and-sends-its-english"], itemOk, itemWhy);

  // An edited choice: the Dropdown Options value editor opens on the choice's English and saves it
  // back. The second Edit on the panel is the first value's.
  let choiceEditOk = false;
  let choiceEditWhy = "the value editor did not open";
  await d.goto("settings");
  await d.clickText("Dropdown Options", { exact: false });
  if (await d.clickText("Edit", { exact: true, nth: 1 }).catch(() => false)) {
    const values = await d.modal().locator("input").evaluateAll((els) => els.map((e) => e.value));
    const mark = d.mark();
    await d.clickText("Save", { inModal: true, exact: true });
    const sent = d.callsSince(mark).filter((c) => c.method === "PATCH" && c.path.indexOf("/api/lookups/values/" + CHOICE.id) >= 0).pop();
    const showsEnglish = values.indexOf(CHOICE.english) >= 0 && values.indexOf(CHOICE.spanish) < 0;
    const sendsEnglish = !!sent && sent.body && sent.body.label === CHOICE.english;
    choiceEditOk = showsEnglish && sendsEnglish;
    choiceEditWhy = !showsEnglish ? "the value editor shows " + JSON.stringify(values.filter(Boolean).slice(0, 4)) + " where the English is "
      + JSON.stringify(CHOICE.english)
      : !sent ? "the value editor sent nothing" : "the value editor sent label " + JSON.stringify(sent.body && sent.body.label)
        + " where the English is " + JSON.stringify(CHOICE.english);
    await d.closeModal();
  }
  results.check("language", ids["an-edited-choice-shows-and-sends-its-english"], choiceEditOk, choiceEditWhy);

  // A typed message: Messages draws what a person wrote exactly as they wrote it, in any language,
  // even "Done", which the table would draw as another word.
  const person = stubs.fixtures.DM_INBOX[0].staffName;
  const typed = stubs.fixtures.CHAT_MESSAGES.map((m) => m.text);
  await d.goto("chat");
  const talked = await d.clickText(person, { exact: false }).catch(() => false);
  const lines = talked ? await d.readable() : [];
  const missing = typed.filter((x) => lines.indexOf(x) < 0);
  const swapped = typed.map((x) => d.say(x)).filter((x, i) => x !== typed[i] && lines.indexOf(x) >= 0);
  results.check("language", ids["a-typed-message-is-drawn-as-typed"], talked && missing.length === 0 && swapped.length === 0,
    !talked ? "the conversation with the first person in the inbox did not open"
      : missing.length ? "what was typed is not on screen as typed: " + JSON.stringify(missing)
        : "a typed message was drawn as the table's word for it: " + JSON.stringify(swapped));

  // A count of one reads in the one form. The seed has one no-show, so the line under Callouts on
  // Shift Pickup is the count entry's one form, which a fixed "{0} no-shows" gets wrong in both
  // languages.
  const count = stubs.fixtures.PICKUP_ANALYTICS.summary.no_show_count;
  const entry = readTable()["{0} no-show|count"] || {};
  const want = entry.es && entry.es.one ? entry.es.one.replace("{0}", String(count)) : "(no count entry for {0} no-show)";
  await d.goto("marketplace");
  const board = await d.readable();
  const drawn = board.filter((l) => /^\d+ /.test(l) && (l.indexOf("no-show") >= 0 || l.indexOf("present") >= 0));
  results.check("language", ids["a-count-of-one-reads-in-the-one-form"], count === 1 && board.indexOf(want) >= 0,
    count !== 1 ? "the seed carries " + count + " no-shows, so the one form is not on screen to be read"
      : "the line under Callouts should read " + JSON.stringify(want) + "; it reads " + JSON.stringify(drawn));
}

function runLate({ stubs, results, inventory }) {
  const seen = stubs.language();
  const misses = seen.misses;
  const said = (m) => m.method + " " + m.path + " said " + (m.said === null ? "nothing" : JSON.stringify(m.said))
    + " on a screen drawn in " + JSON.stringify(m.want);
  results.check("language", inventory.LANGUAGE_HEADER.id, seen.calls > 0 && misses.length === 0,
    seen.calls === 0 ? "no call reached the stub, so no call was checked"
      : misses.length + " of " + seen.calls + " calls did not say the language the screen is drawn in: "
        + misses.slice(0, 3).map(said).join("; "));
  if (misses.length === 0) {
    results.note("every one of the " + seen.calls + " calls said the language its screen is drawn in");
    return;
  }
  // Each route that went wrong is named once, with how many times it did.
  const byRoute = {};
  misses.forEach((m) => { const k = said(m); byRoute[k] = (byRoute[k] || 0) + 1; });
  Object.keys(byRoute).slice(0, 20).forEach((k) => results.note("a call that did not say its language: " + k + " (" + byRoute[k] + " times)"));
}

module.exports = { run, runLate };
