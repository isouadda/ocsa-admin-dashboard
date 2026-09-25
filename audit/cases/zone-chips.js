// A zone on a site's General Info, in the language the screen is drawn in.
//
// General Info draws a chip for each of the site's zones. Since Step 129 a chip drew the display a
// task in that zone carried, so a zone no task at the site carries stayed English even when the
// zones lookup had a word for it. It falls back to the lookup's shown label now, and a zone that
// neither carries is drawn as it was typed. The words this suite expects come from what the stub
// answered the page itself, in the language the page asked for, so the suite and the page can only
// disagree about the rule.
"use strict";

async function run({ d, results, stubs, lang }) {
  await d.signOutHard();
  await d.signIn("admin");
  await d.goto("sites");
  // The first site's profile, which opens on General Info.
  await d.clickRow(0);
  await d.settle(400);

  const chips = await d.page.evaluate((title) => {
    const head = Array.from(document.querySelectorAll("div")).find((el) => el.children.length === 0 && el.textContent.trim() === title);
    const box = head && head.nextElementSibling;
    return box ? Array.from(box.querySelectorAll("span")).map((s) => s.textContent.trim()) : null;
  }, d.say("Zones"));

  const served = (re) => { const c = stubs.calls.filter((x) => re.test(x.path) && x.json).pop(); return c ? c.json : null; };
  const profile = served(/^\/api\/sites\/profile\/[^/]+$/) || {};
  const tasks = served(/^\/api\/sites\/[^/]+\/tasks$/) || [];
  const lookups = served(/^\/api\/lookups\/all$/) || [];
  const zonesLookup = (lookups.find((c) => c.slug === "zones") || { values: [] }).values || [];
  const expected = (profile.zones || []).map((z) => {
    const task = tasks.find((tk) => tk.zone === z && tk.display && tk.display.zone);
    if (task) return { zone: z, word: task.display.zone, from: "a task" };
    const choice = zonesLookup.find((v) => v.value === z);
    if (choice) return { zone: z, word: choice.displayLabel || choice.label, from: "the zones lookup" };
    return { zone: z, word: z, from: "as typed" };
  });

  const wrong = !chips ? [] : expected.filter((e, i) => chips[i] !== e.word);
  const fromLookup = expected.filter((e) => e.from === "the zones lookup" && e.word !== e.zone).length;
  results.check("page", "page/sites/zone-chips/" + lang,
    !!chips && chips.length === expected.length && expected.length > 0 && wrong.length === 0,
    !chips ? "General Info drew no zones"
      : chips.length !== expected.length ? "General Info drew " + chips.length + " zone chips for " + expected.length + " zones"
        : wrong.map((e) => JSON.stringify(chips[expected.indexOf(e)]) + " where " + e.from + " says " + JSON.stringify(e.word)).join("; "));
  results.note("Sites in " + lang + ": " + expected.length + " zone chips read, " + fromLookup + " of them drawn from the zones lookup's own word");
}

module.exports = { run };
