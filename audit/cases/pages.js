// Every page, signed in as each of four kinds of person.
//
// For each page the suite records what is on screen AND what is absent, so a screen that should be
// hidden and is not fails here. The narrow pass repeats every page at 1024 wide.
"use strict";
const seed = require("../seed");

// What each persona must never see. The sidebar is the proof: a supervisor has no Staff Management,
// no Cases, no Forms and no Settings item, and no Settings row in the user menu.
const ADMIN_ONLY_NAV = ["Staff Management", "Cases", "Forms", "Settings"];

async function run({ d, results, inventory, app, width }) {
  const suffix = width === "narrow" ? " @1024" : "";

  for (const persona of seed.PERSONAS) {
    const who = seed.PERSONA_LABEL[persona];
    await d.signOutHard();
    await d.signIn(persona);
    const isAdmin = seed.PEOPLE[persona].role === "admin";

    // The sidebar, read once per persona: present and absent together. At 1024 the app starts the
    // sidebar collapsed to one icon per group, so it is expanded first and the labels read there.
    await d.expandSidebar();
    const nav = (await d.visibleNavItems()).join(" | ");
    const missing = ADMIN_ONLY_NAV.filter((l) => nav.indexOf(l) < 0);
    const present = ADMIN_ONLY_NAV.filter((l) => nav.indexOf(l) >= 0);
    if (isAdmin) {
      results.check("page", "nav/" + persona + suffix, missing.length === 0,
        missing.length ? "an admin is missing " + missing.join(", ") : "all four admin items present");
    } else {
      results.check("page", "nav/" + persona + suffix, present.length === 0,
        present.length ? "a " + who + " can see " + present.join(", ") : "none of the four admin items present");
    }

    for (const p of inventory.PAGES) {
      const id = "page/" + p.id + "/" + persona + suffix;
      const errsBefore = d.pageErrors.length;
      await d.goto(p.id);
      const shellText = await d.text();
      const body = await d.bodyText();
      const bodyLen = await d.bodyLength();
      const header = shellText.indexOf(p.label) >= 0;

      if (p.gated && !isAdmin) {
        // The page must not render its contents, AND the person must be told why. The page label
        // still sits in the header, so only the content area is read here.
        const leaked = body.indexOf(p.expect) >= 0;
        const explained = /not available|no access|cannot|ask an admin|only an admin|is for admins|permission/i.test(body);
        results.check("page", id, !leaked && explained,
          leaked ? "a " + who + " can read this admin page, the body holds " + JSON.stringify(p.expect) :
            "the body is " + bodyLen + " characters and says nothing about why");
        continue;
      }

      const newErrors = d.pageErrors.slice(errsBefore);
      results.check("page", id, header && bodyLen > 40 && newErrors.length === 0,
        !header ? "the header does not say " + p.label :
          bodyLen <= 40 ? "the body is only " + bodyLen + " characters" :
          newErrors.length ? "the page threw: " + newErrors[0] : "");
    }
  }

  // A hash the app does not know falls back to the Dashboard rather than a blank screen.
  await d.goto("not-a-page");
  results.check("page", "page/unknown-hash" + suffix, await d.has("Welcome back"),
    "an unknown hash lands on the Dashboard");

  // The page in the hash survives a reload.
  await d.goto("issues");
  await d.page.reload({ waitUntil: "domcontentloaded" });
  await d.settle(600);
  results.check("page", "page/hash-survives-reload" + suffix, await d.has("Issue"),
    "#issues reopens after a reload");

  // The nav search box reaches a page without the sidebar.
  await d.goto("overview");
  const navSearch = d.page.locator("input[placeholder*='Search' i]").first();
  if (await navSearch.count()) {
    await navSearch.fill("vend");
    await d.settle(320);
    const hit = d.page.locator("button", { hasText: "Vendors" }).first();
    if (await hit.count()) { await hit.click(); await d.settle(); }
    results.check("page", "page/nav-search" + suffix, await d.has("Vendor"), "typing vend reaches the Vendor Registry");
  } else {
    results.fail("page", "page/nav-search" + suffix, "no nav search box on screen");
  }

  // Signing out from the user menu empties the shell back to the login card.
  await d.goto("overview");
  await d.signOut();
  results.check("page", "page/sign-out" + suffix, await d.has("Admin Dashboard"),
    "the login card is back after Sign Out");
}

module.exports = { run };
