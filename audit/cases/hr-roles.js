// The role, the training type and the onboarding category on HR Records are words, in the language
// the screen is drawn in.
//
// Since Session 22 the Employees tab draws a card for each person, and each card drew its role as
// the code with a capital in front: "Custodial_laborer". The role is drawn through the word table
// now, the way part two draws one, and stays a code on the wire and in every comparison. A pass reads
// every card on the grid, the first person's folder and the role column of the Staff Summary on
// Compliance, and holds each role to the word the table has for it in that language. A code the app
// has no word for would still be drawn as it arrives, so the code itself is never an answer here.
//
// A training record's type and an onboarding step's category are codes the page draws through the
// training_types and onboarding_categories lookups, as the label the lookup shows in that language.
// Since Step 133 the stub carries both lookups, so a pass reads the Training table's Type column
// and the Onboarding checklist's headings and holds each to the word the lookup the page was served
// gives its code.
"use strict";
const fs = require("fs");
const path = require("path");

const APP = path.resolve(__dirname, "..", "..", "src", "App.js");
const GRID = "div[style*='minmax(280px, 1fr)']";

// The role labels the app draws its words from, read out of src/App.js so the two cannot drift.
function roleLabels() {
  const line = fs.readFileSync(APP, "utf8").split("\n").find((l) => l.indexOf("const RL = {") === 0) || "";
  const out = {};
  const re = /(\w+): "([^"]+)"/g;
  let m;
  while ((m = re.exec(line))) out[m[1]] = m[2];
  return out;
}

async function run({ d, results, seed, stubs, lang }) {
  const RL = roleLabels();
  const wordFor = (code) => (RL[code] ? d.say(RL[code]) : null);
  const byName = {};
  seed.STAFF.forEach((p) => { byName[p.first_name + " " + p.last_name] = p; });
  // What a line says about a role: the text before the first " . ", which is where the card and the
  // folder put the status and the hire date.
  const rolePart = (line) => String(line || "").split(" . ")[0].replace(/\s+/g, " ").trim();
  const judge = (pairs) => pairs.filter((x) => {
    const p = byName[x.name];
    return !p || rolePart(x.line) !== wordFor(p.role);
  });

  await d.signOutHard();
  await d.signIn("admin");

  // The cards. Each card's name sits right above the line that carries its role.
  await d.goto("hr");
  await d.page.locator(GRID + " div[style*='text-transform: capitalize']").first().waitFor({ timeout: 8000 }).catch(() => {});
  const cards = await d.page.evaluate((grid) => Array.from(document.querySelectorAll(grid + " div[style*='text-transform: capitalize']"))
    .map((el) => ({ name: (el.previousElementSibling && el.previousElementSibling.textContent || "").trim(), line: el.textContent || "" })), GRID);
  const wrongCards = judge(cards);
  results.check("page", "page/hr/roles-are-words/cards/" + lang, cards.length > 0 && wrongCards.length === 0,
    cards.length === 0 ? "the Employees tab drew no cards"
      : wrongCards.length + " of " + cards.length + " cards draw a role that is not the table's word for it: "
        + wrongCards.slice(0, 3).map((x) => JSON.stringify(rolePart(x.line)) + " where the table says "
          + JSON.stringify(byName[x.name] ? wordFor(byName[x.name].role) : "(nobody by that name)")).join("; "));

  // The folder of the first person on the grid, whose banner puts the role before the hire date.
  let folder = [];
  if (cards.length > 0) {
    await d.clickText(cards[0].name, { exact: true }).catch(() => false);
    await d.settle(400);
    // The banner's line under the name. Its own text is the role and the hire date; the address
    // beside them sits in a span of its own.
    folder = await d.page.evaluate(() => Array.from(document.querySelectorAll("span[style*='text-transform: capitalize']")).slice(0, 1)
      .map((el) => ({ line: Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("") })));
    folder = folder.map((x) => Object.assign(x, { name: cards[0].name }));
  }
  const wrongFolder = judge(folder);
  results.check("page", "page/hr/roles-are-words/folder/" + lang, folder.length > 0 && wrongFolder.length === 0,
    folder.length === 0 ? "the first person's folder did not open or drew no role"
      : "the folder draws the role as " + JSON.stringify(rolePart(folder[0].line)) + " where the table says "
        + JSON.stringify(byName[cards[0].name] ? wordFor(byName[cards[0].name].role) : null));

  // The Staff Summary on Compliance: the person in the first column, the role in the second.
  await d.goto("hr");
  await d.clickText(d.say("Compliance"), { exact: true }).catch(() => false);
  await d.settle(400);
  const rows = await d.page.evaluate(() => Array.from(document.querySelectorAll("table tbody tr"))
    .map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim()))
    .filter((cells) => cells.length >= 2)
    .map((cells) => ({ name: cells[0], line: cells[1] })));
  const wrongRows = judge(rows);
  results.check("page", "page/hr/roles-are-words/summary/" + lang, rows.length > 0 && wrongRows.length === 0,
    rows.length === 0 ? "Compliance drew no Staff Summary"
      : wrongRows.length + " of " + rows.length + " Staff Summary rows draw a role that is not the table's word for it: "
        + wrongRows.slice(0, 3).map((x) => JSON.stringify(x.line)).join("; "));
  results.note("HR Records in " + lang + ": " + cards.length + " cards, the first folder and " + rows.length
    + " Staff Summary rows read for their roles");

  // The lookups' words, from what the stub answered the page in this language.
  const served = (re) => { const c = stubs.calls.filter((x) => re.test(x.path) && x.json).pop(); return c ? c.json : null; };
  const shownOf = (slug) => {
    const cat = (served(/^\/api\/lookups\/all$/) || []).find((c) => c.slug === slug);
    const m = {};
    ((cat && cat.values) || []).forEach((v) => { m[v.value] = v.displayLabel || v.label; });
    return m;
  };

  // Training: every cell of the Type column is the word for a code the page was served.
  await d.goto("hr");
  await d.clickText(d.say("Training"), { exact: true }).catch(() => false);
  await d.settle(400);
  const typeCells = await d.page.evaluate((head) => {
    // textContent rather than innerText: the headings are upper case by style only.
    const table = Array.from(document.querySelectorAll("table")).find((t) => t.offsetParent !== null
      && Array.from(t.querySelectorAll("thead th")).some((th) => th.textContent.trim() === head));
    if (!table) return [];
    const col = Array.from(table.querySelectorAll("thead th")).findIndex((th) => th.textContent.trim() === head);
    return Array.from(table.querySelectorAll("tbody tr")).map((tr) => ((tr.querySelectorAll("td")[col] || {}).textContent || "").trim()).filter(Boolean);
  }, d.say("Type"));
  const trainingWords = shownOf("training_types");
  const trainingCodes = Array.from(new Set((served(/^\/api\/hr\/training$/) || []).map((r) => r.training_type)));
  const wantTraining = new Set(trainingCodes.map((c) => trainingWords[c] || c));
  const wrongTraining = typeCells.filter((c) => !wantTraining.has(c));
  results.check("page", "page/hr/lookups-are-words/training/" + lang,
    typeCells.length > 0 && wrongTraining.length === 0 && trainingCodes.every((c) => trainingWords[c]),
    typeCells.length === 0 ? "the Training table drew no Type column"
      : !trainingCodes.every((c) => trainingWords[c]) ? "the training_types lookup the page was served has no word for " + trainingCodes.filter((c) => !trainingWords[c]).join(", ")
        : wrongTraining.length + " of " + typeCells.length + " Type cells are not the lookup's word for their code: "
          + Array.from(new Set(wrongTraining)).slice(0, 3).map((c) => JSON.stringify(c)).join(", ") + " where the lookup says " + Array.from(wantTraining).map((w) => JSON.stringify(w)).join(" or "));

  // Onboarding: one person's checklist, whose headings are its steps' categories.
  await d.goto("hr");
  await d.clickText(d.say("Onboarding"), { exact: true }).catch(() => false);
  await d.settle(300);
  await d.pickPerson(seed.STAFF[0].first_name).catch(() => false);
  await d.settle(400);
  const headings = await d.page.evaluate(() => Array.from(document.querySelectorAll("div[style*='text-transform: uppercase'][style*='letter-spacing: 1px'][style*='margin-bottom: 8px']"))
    .filter((el) => el.offsetParent !== null).map((el) => el.textContent.trim()));
  const onbWords = shownOf("onboarding_categories");
  const onbCodes = Array.from(new Set((served(/^\/api\/hr\/onboarding\/[^/]+$/) || []).map((s) => s.step_category)));
  const wantOnb = onbCodes.map((c) => onbWords[c] || c);
  const missingOnb = wantOnb.filter((w) => headings.indexOf(w) < 0);
  results.check("page", "page/hr/lookups-are-words/onboarding/" + lang,
    onbCodes.length > 0 && missingOnb.length === 0 && onbCodes.every((c) => onbWords[c]),
    onbCodes.length === 0 ? "the Onboarding checklist was not served or not opened"
      : !onbCodes.every((c) => onbWords[c]) ? "the onboarding_categories lookup the page was served has no word for " + onbCodes.filter((c) => !onbWords[c]).join(", ")
        : "the checklist's headings read " + JSON.stringify(headings) + " where the lookup says " + JSON.stringify(wantOnb));
  results.note("HR Records in " + lang + ": " + typeCells.length + " training types and " + headings.length + " onboarding headings read for their lookups' words");
}

module.exports = { run };
