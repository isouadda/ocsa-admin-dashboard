// Four small things beside the phone, Step 154, in English at 1280 and 1024 and in Spanish at 1024.
//
// Schedule's Refresh draws the circular arrow the Dashboard's Refresh draws, read off the button's own
// path, and never the plus. The Staff page's table fits its box at 1280 at Standard: its narrowest
// width was 1028 pixels against a box of 1010, which is the 17 the later list counted, and at 1024
// the same table needs 118 more than its box in English and 192 in Spanish, since Badge, Phone, Role
// and Employment are one-line columns under a one-line header row, so there it scrolls inside its own
// card and the page never scrolls sideways. + Add Training's Administered By example names a role
// and no person, in both languages, written out here by hand. The Dropdown Options editor names each
// list by its label and never its slug, held to the lists the stub served, one of which carries the
// certification framework's name in its slug.
"use strict";
const fs = require("fs");
const path = require("path");

const APP = path.resolve(__dirname, "..", "..", "src", "App.js");

// The example beside Administered By, by hand.
const EXAMPLE = { en: "e.g. Site supervisor", es: "p. ej. Supervisor del sitio" };
// The first name the example used to carry, which no screen may draw again.
const OLD_NAME = "Sameerah";

// The path of an icon the app draws, read out of src/App.js.
function iconPath(name) {
  const m = new RegExp("^const " + name + " = p => <Ic d=\"([^\"]+)\"", "m").exec(fs.readFileSync(APP, "utf8"));
  return m ? m[1] : null;
}

// The path drawn inside the button that says a label on the page that is open, or null.
const buttonPath = (d, label) => d.page.evaluate((text) => {
  const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === text && b.querySelector("svg path"));
  return btn ? btn.querySelector("svg path").getAttribute("d") : null;
}, label);

// The first table on the page against the box it scrolls in, and the page against the window.
const tableFit = (d) => d.page.evaluate(() => {
  const t = document.querySelector("table");
  if (!t) return null;
  const box = t.parentElement;
  const doc = document.documentElement;
  return { table: t.scrollWidth, box: box.clientWidth, over: t.scrollWidth - box.clientWidth, page: doc.scrollWidth - doc.clientWidth };
});

async function run({ d, results, seed, stubs, width, lang }) {
  const at = width === "narrow" ? " @1024" : "";
  const tail = at + "/" + lang;
  await d.signOutHard();
  await d.signIn("admin");
  if (width === "narrow") await d.collapseSidebar();

  // ---- Schedule: Refresh draws the circular arrow, through the same SecT icon Live Ops was given
  await d.goto("schedule");
  await d.settle(400);
  const schedulePath = await buttonPath(d, d.say("Refresh"));
  const arrow = iconPath("RfI");
  const plus = iconPath("PlI");
  results.check("page", "page/schedule/refresh-draws-the-arrow" + tail, !!arrow && !!schedulePath && schedulePath === arrow && schedulePath !== plus,
    !arrow ? "src/App.js has no RfI icon" : !schedulePath ? "Schedule has no Refresh button with an icon"
      : schedulePath === plus ? "Schedule's Refresh draws the plus"
        : schedulePath !== arrow ? "Schedule's Refresh draws a path that is not RfI's"
          : "Schedule's Refresh draws the same circular arrow as the Dashboard's Refresh");

  // ---- Staff: the table fits its box at 1280 in English, and the page never scrolls sideways
  await d.goto("staff");
  await d.settle(500);
  const fit = await tableFit(d);
  if (width === "wide" && lang === "en") {
    results.check("page", "page/staff/table-fits-its-box" + tail, !!fit && fit.over <= 1 && fit.page <= 1,
      !fit ? "no table on the Staff page" : fit.page > 1 ? "the page runs " + fit.page + " pixels off the side"
        : "the table is " + fit.table + " wide in a box " + fit.box + " wide, " + fit.over + " past it");
  } else {
    results.check("page", "page/staff/table-scrolls-inside-its-box" + tail, !!fit && fit.page <= 1,
      !fit ? "no table on the Staff page" : "the page runs " + fit.page + " pixels off the side");
    if (fit) results.note("Staff at " + (width === "narrow" ? 1024 : 1280) + " in " + lang + ": the table is " + fit.table + " wide in a box " + fit.box + " wide" + (fit.over > 1 ? ", and scrolls " + fit.over + " inside it" : ""));
  }

  // ---- HR Records, + Add Training: the example beside Administered By names no person
  await d.goto("hr");
  await d.clickText(d.say("Training"), { exact: true });
  await d.settle(300);
  const opened = await d.clickText(d.say("+ Add Training"), { exact: true });
  await d.settle(300);
  const example = opened ? await d.page.evaluate((label) => {
    const box = document.querySelector("div[style*='z-index: 500']");
    if (!box) return null;
    const head = Array.from(box.querySelectorAll("div")).find((el) => (el.innerText || "").trim() === label && el.children.length === 0);
    const input = head && head.parentElement ? head.parentElement.querySelector("input") : null;
    return input ? (input.getAttribute("placeholder") || "") : null;
  }, d.say("Administered By")) : null;
  const want = EXAMPLE[lang] || EXAMPLE.en;
  const names = Object.keys(seed.PEOPLE).map((k) => seed.PEOPLE[k].firstName).concat([OLD_NAME]);
  const named = example ? names.filter((n) => example.indexOf(n) >= 0) : [];
  results.check("window", "window/hr/training-window/example-names-no-person" + tail, example === want && named.length === 0,
    !opened ? "the window did not open from " + JSON.stringify(d.say("+ Add Training"))
      : example === null ? "no input under " + JSON.stringify(d.say("Administered By"))
        : named.length ? "the example " + JSON.stringify(example) + " names " + named.join(", ")
          : "the example reads " + JSON.stringify(example) + " where it should read " + JSON.stringify(want));
  if (opened) await d.closeModal();

  // ---- Settings, Dropdown Options: each list by its name, never its slug
  await d.goto("settings");
  await d.settle(300);
  await d.clickText(d.say("Dropdown Options"), { exact: true });
  await d.settle(400);
  const served = stubs.calls.filter((c) => c.path === "/api/lookups/all" && Array.isArray(c.json)).pop();
  const lists = (served && served.json) || [];
  const lines = await d.readable();
  const text = lines.join("\n");
  const slugs = lists.map((c) => c.slug).filter((s) => s && text.indexOf(s) >= 0);
  const unnamed = lists.map((c) => c.label).filter((l) => l && text.indexOf(l) < 0);
  results.check("view", "view/settings/global/list-names-not-slugs" + tail, lists.length > 0 && slugs.length === 0 && unnamed.length === 0,
    lists.length === 0 ? "the stub served no list"
      : slugs.length ? "the editor prints " + slugs.length + " slugs: " + slugs.slice(0, 3).join(", ")
        : unnamed.length ? "the editor does not name " + unnamed.slice(0, 3).join(", ")
          : "every one of " + lists.length + " lists is named by its label and none by its slug");

  results.note("Small things" + at + " in " + lang + ": Schedule's Refresh icon, the Staff table against its box, the training example and the Dropdown Options names");
}

module.exports = { run };
