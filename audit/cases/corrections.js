// Spanish corrections, and Rename on a template, Step 185 (521208c), in English and in Spanish at 1280.
//
// Wherever a manager edits a checklist item or a pick list value, the window shows the Spanish the portal
// draws today, read from the same list with locale=es, under Shown in Spanish as, and saves a changed
// field through the translations route as { locale: "es", field, text }, one call per changed field,
// after the English save as before, then says the wording is saved. The API stores that wording with
// source person, which the model never writes over; the dashboard sends only the three keys, and the stub
// answers the way routes/sites.js and routes/lookups.js do. Sites' Edit Task shows the item's Spanish
// name and instructions; Dropdown Options' Edit Value shows the choice's Spanish label. An inspection
// template's Rename sends the name typed and the description the card already has, since the route
// writes both columns. The words are written out here by hand.
"use strict";

const WORDS = {
  en: { spanishAs: "Shown in Spanish as", saved: "Saved. People see this wording from now on.", renamed: "Saved", rename: "Rename" },
  es: { spanishAs: "Se muestra en espa\u00f1ol como", saved: "Guardado. El personal ve este texto desde ahora.", renamed: "Guardado", rename: "Cambiar nombre" },
};
// The Spanish the stub serves for the lobby refinish and the first category value, and the corrections.
const ITEM = { id: "at-1", label: "Decapar y encerar el vest\u00edbulo", description: "Decapar, sellar y encerar el piso del vest\u00edbulo.", english: "Strip and refinish lobby" };
const ITEM_FIX = "Decapar y encerar el vest\u00edbulo principal";
const VALUE = { id: "lv-1", label: "Prestaci\u00f3n del servicio" };
const VALUE_FIX = "Prestaci\u00f3n de los servicios";
const RENAMED = "Monthly quality walk, floors 1 to 3";

// The fields in the open window's Spanish box, the box headed Shown in Spanish as.
const spanishBox = (d, head) => d.page.evaluate((h) => {
  const box = Array.from(document.querySelectorAll("div[style*='z-index: 500']")).pop();
  if (!box) return null;
  const label = Array.from(box.querySelectorAll("*")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === h);
  const holder = label && label.parentElement;
  return holder ? Array.from(holder.querySelectorAll("input, textarea")).map((e) => e.value) : null;
}, head);
const setIn = async (d, head, index, value) => d.page.evaluate(([h, i, v]) => {
  const box = Array.from(document.querySelectorAll("div[style*='z-index: 500']")).pop();
  const label = box && Array.from(box.querySelectorAll("*")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === h);
  const f = label && label.parentElement ? label.parentElement.querySelectorAll("input, textarea")[i] : null;
  if (!f) return false;
  const setter = Object.getOwnPropertyDescriptor(f.constructor.prototype, "value").set;
  setter.call(f, v);
  f.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}, [head, index, value]);

async function run({ d, results, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");

  // ---- Sites, Edit Task: the item's Spanish name and instructions, and a changed name sent on its own
  await d.goto("sites");
  await d.clickRow(0);
  await d.clickText(d.say("Service Details"), { exact: true });
  await d.settle(300);
  let mark = d.mark();
  await d.clickText(ITEM.english, { exact: false });
  await d.settle(600);
  const esRead = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/sites/s-1/tasks" && c.locale === "es").pop();
  const shown = await spanishBox(d, w.spanishAs);
  results.check("window", "window/sites/edit-task/shows-the-spanish" + tail,
    !!esRead && esRead.query === "?day=all&shift=" && !!shown && shown[0] === ITEM.label && shown[1] === ITEM.description,
    !esRead ? "opening Edit Task read no checklist with locale=es" : esRead.query !== "?day=all&shift=" ? "the Spanish was read with " + JSON.stringify(esRead.query)
      : !shown ? "the window has no " + JSON.stringify(w.spanishAs) : "the Spanish box holds " + JSON.stringify(shown) + " where the API sent " + JSON.stringify([ITEM.label, ITEM.description]));
  await setIn(d, w.spanishAs, 0, ITEM_FIX);
  mark = d.mark();
  await d.clickText(d.say("Save Changes"), { inModal: true, exact: true });
  const toast = await d.waitToast(2500);
  const sent = d.callsSince(mark).filter((c) => c.method === "PATCH" && c.path.indexOf("/api/sites/s-1/tasks/at-1") === 0);
  const english = sent.find((c) => c.path === "/api/sites/s-1/tasks/at-1");
  const fixes = sent.filter((c) => c.path === "/api/sites/s-1/tasks/at-1/translations");
  results.check("window", "window/sites/edit-task/sends-the-changed-wording" + tail,
    !!english && english.body && english.body.label === ITEM.english && fixes.length === 1
      && JSON.stringify(fixes[0].body) === JSON.stringify({ locale: "es", field: "label", text: ITEM_FIX }) && sent.indexOf(english) < sent.indexOf(fixes[0]) && toast === w.saved,
    !english ? "the English was not saved first" : english.body.label !== ITEM.english ? "the English save sent " + JSON.stringify(english.body.label)
      : fixes.length !== 1 ? "the translations route was called " + fixes.length + " times for one changed field"
        : JSON.stringify(fixes[0].body) !== JSON.stringify({ locale: "es", field: "label", text: ITEM_FIX }) ? "the correction sent " + JSON.stringify(fixes[0].body)
          : "the toast reads " + JSON.stringify(toast) + " where it should read " + JSON.stringify(w.saved));
  await d.waitToastGone(3600);
  await d.closeModal();

  // ---- Settings, Dropdown Options, Edit Value: the choice's Spanish label, and a change sent on its own
  await d.goto("settings");
  await d.clickText(d.say("Dropdown Options"), { exact: true });
  await d.settle(400);
  mark = d.mark();
  await d.clickText(d.say("Edit"), { exact: true, nth: 1 });
  await d.settle(600);
  const valRead = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/lookups/all" && c.locale === "es").pop();
  const valShown = await spanishBox(d, w.spanishAs);
  results.check("window", "window/settings/edit-value/shows-the-spanish" + tail, !!valRead && !!valShown && valShown[0] === VALUE.label,
    !valRead ? "opening Edit Value read no lists with locale=es" : "the Spanish field holds " + JSON.stringify(valShown) + " where the API sent " + JSON.stringify(VALUE.label));
  await setIn(d, w.spanishAs, 0, VALUE_FIX);
  mark = d.mark();
  await d.clickText(d.say("Save"), { inModal: true, exact: true });
  const valToast = await d.waitToast(2500);
  const valSent = d.callsSince(mark).filter((c) => c.method === "PATCH" && c.path.indexOf("/api/lookups/values/lv-1") === 0);
  const valFix = valSent.filter((c) => c.path === "/api/lookups/values/lv-1/translations");
  results.check("window", "window/settings/edit-value/sends-the-changed-wording" + tail,
    valSent.length === 2 && valSent[0].path === "/api/lookups/values/lv-1" && valFix.length === 1
      && JSON.stringify(valFix[0].body) === JSON.stringify({ locale: "es", field: "label", text: VALUE_FIX }) && valToast === w.saved,
    valSent.length !== 2 ? "the save sent " + valSent.map((c) => c.path).join(", ") : valFix.length !== 1 ? "no correction was sent"
      : JSON.stringify(valFix[0].body) !== JSON.stringify({ locale: "es", field: "label", text: VALUE_FIX }) ? "the correction sent " + JSON.stringify(valFix[0].body)
        : "the toast reads " + JSON.stringify(valToast));
  await d.waitToastGone(3600);
  await d.closeModal();

  // ---- Inspections: Rename sends the name and keeps the description the card has
  await d.goto("inspections");
  await d.clickText(d.say("Templates"), { exact: true });
  await d.settle(400);
  const opened = await d.clickText(w.rename, { exact: true });
  await d.settle(300);
  const title = opened ? await d.modalText() : "";
  await d.modal().locator("input").first().fill(RENAMED).catch(() => {});
  mark = d.mark();
  await d.clickText(d.say("Save"), { inModal: true, exact: true });
  const renameToast = await d.waitToast(2500);
  const put = d.callsSince(mark).filter((c) => c.method === "PUT" && c.path === "/api/inspections/templates/tp-1").pop();
  const tp = stubs.fixtures.INSPECTION_TEMPLATES[0];
  results.check("window", "window/inspections/rename-keeps-the-description" + tail,
    opened && title.indexOf(w.rename) >= 0 && !!put && JSON.stringify(put.body) === JSON.stringify({ name: RENAMED, description: tp.description }) && renameToast === w.renamed,
    !opened ? "no " + JSON.stringify(w.rename) + " on the first template" : !put ? "Rename sent no PUT"
      : JSON.stringify(put.body) !== JSON.stringify({ name: RENAMED, description: tp.description }) ? "Rename sent " + JSON.stringify(put.body) + " where the card's description is " + JSON.stringify(tp.description)
        : "the toast reads " + JSON.stringify(renameToast));
  await d.waitToastGone(3600);

  stubs.reset();
  results.note("Spanish corrections in " + lang + ": Edit Task, Edit Value and Rename");
}

module.exports = { run };
