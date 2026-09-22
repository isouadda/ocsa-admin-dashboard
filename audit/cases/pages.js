// Every page, signed in as each of four kinds of person.
//
// For each page the suite records what is on screen AND what is absent, so a screen that should be
// hidden and is not fails here. The narrow pass repeats every page at 1024 wide.
"use strict";
const seed = require("../seed");

// What each persona must never see. The sidebar is the proof: a supervisor has no Staff Management,
// no Cases, no Forms and no Settings item, and no Settings row in the user menu.
const ADMIN_ONLY_NAV = ["Staff Management", "Cases", "Forms", "Settings"];

// The three dark backgrounds. None of them may be painted anywhere in light mode.
const DARK_BACKGROUNDS = ["#0A1628", "#0F1D32", "#132240"];

// What the drawn page paints, read off the browser rather than off the source: the side panel, the
// top bar, and anything painting a dark background where there should be none.
async function painted(d) {
  return d.page.evaluate((navies) => {
    const hex = (c) => {
      const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c || "");
      if (!m) return "";
      if (m[4] !== undefined && Number(m[4]) < 1) return "";
      return "#" + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, "0")).join("").toUpperCase();
    };
    const bgOf = (el) => (el ? hex(getComputedStyle(el).backgroundColor) : "");
    const panel = document.querySelector("div[style*='position: fixed'][style*='height: 100vh']");
    const top = document.querySelector("div[style*='z-index: 40']");
    const found = [];
    const all = document.querySelectorAll("*");
    for (let i = 0; i < all.length && found.length < 4; i += 1) {
      const h = hex(getComputedStyle(all[i]).backgroundColor);
      if (navies.indexOf(h) >= 0) {
        found.push(h + " on " + all[i].tagName.toLowerCase()
          + " " + ((all[i].innerText || "").trim().slice(0, 24) || "(no text)"));
      }
    }
    return { panel: bgOf(panel), top: bgOf(top), dark: found };
  }, DARK_BACKGROUNDS);
}

// Where the keyboard is. The first element is focused by hand and everything after it is a real Tab
// press, so what is read back is what :focus-visible draws.
async function ringWalk(d, steps) {
  const seen = {};
  for (let i = 0; i < steps; i += 1) {
    await d.page.keyboard.press("Tab");
    const at = await d.page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return { tag: el.tagName, width: parseFloat(cs.outlineWidth) || 0, style: cs.outlineStyle,
        color: cs.outlineColor, text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 24) };
    });
    if (at && !seen[at.tag]) seen[at.tag] = at;
  }
  return seen;
}
async function outlineNow(d) {
  return d.page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { tag: "none", width: 0, style: "none" };
    const cs = getComputedStyle(el);
    return { tag: el.tagName, width: parseFloat(cs.outlineWidth) || 0, style: cs.outlineStyle,
      text: (el.innerText || "").trim().slice(0, 24) };
  });
}

async function run({ d, results, inventory, app, width, theme }) {
  const light = theme === "light";
  const suffix = (width === "narrow" ? " @1024" : "") + (light ? " light" : "");

  for (const persona of seed.PERSONAS) {
    const who = seed.PERSONA_LABEL[persona];
    await d.signOutHard();
    await d.signIn(persona);
    const isAdmin = seed.PEOPLE[persona].role === "admin";

    // The sidebar, read once per persona: present and absent together. At 1024 the app starts the
    // sidebar collapsed to one icon per group, so it is expanded first and the labels read there.
    await d.expandSidebar();
    const nav = (await d.visibleNavItems()).join(" | ");
    // The manage permissions capability opens Settings, so the person holding it is expected to
    // have that one item and none of the other three.
    const opensSettings = seed.PEOPLE[persona].singleCapability === "manage_permissions";
    const allowed = isAdmin ? ADMIN_ONLY_NAV : opensSettings ? ["Settings"] : [];
    const missing = allowed.filter((l) => nav.indexOf(l) < 0);
    const present = ADMIN_ONLY_NAV.filter((l) => nav.indexOf(l) >= 0 && allowed.indexOf(l) < 0);
    results.check("page", "nav/" + persona + suffix, missing.length === 0 && present.length === 0,
      missing.length ? "a " + who + " is missing " + missing.join(", ")
        : present.length ? "a " + who + " can see " + present.join(", ")
          : allowed.length ? allowed.join(", ") + " present, the rest absent" : "none of the four admin items present");

    for (const p of inventory.PAGES) {
      const id = "page/" + p.id + "/" + persona + suffix;
      const errsBefore = d.pageErrors.length;
      await d.goto(p.id);
      const shellText = await d.text();
      const body = await d.bodyText();
      const bodyLen = await d.bodyLength();
      const header = shellText.indexOf(p.label) >= 0;

      // A gated page opens for an admin, and Settings also opens for the person whose capability
      // names that screen.
      const opens = !p.gated || isAdmin
        || (p.id === "settings" && seed.PEOPLE[persona].singleCapability === "manage_permissions");
      if (!opens) {
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

      // Light mode is a different screen, so every page is read for what it paints.
      if (light) {
        const paint = await painted(d);
        results.check("page", id + "/panel", paint.panel === "#15558F",
          "the side panel paints " + JSON.stringify(paint.panel) + ", expected #15558F");
        results.check("page", id + "/top-bar", paint.top === "#FFFFFF",
          "the top bar paints " + JSON.stringify(paint.top) + ", expected #FFFFFF");
        results.check("page", id + "/no-dark-backgrounds", paint.dark.length === 0,
          "a dark background is painted in light mode: " + paint.dark.join(", "));
      }
    }
  }

  // Where the keyboard is, in both themes. The window on Assigned Tasks is the one screen that
  // carries an input, a select, a text area and buttons together.
  if (width !== "narrow") {
    await d.signOutHard();
    await d.signIn("admin");
    await d.goto("assigned");
    const opened = await d.clickText("Create Task", { exact: false });
    await d.page.evaluate(() => { const el = document.querySelector("div[style*='z-index: 500'] input"); if (el) el.focus(); });
    const seen = opened ? await ringWalk(d, 26) : {};
    for (const tag of ["INPUT", "SELECT", "TEXTAREA", "BUTTON"]) {
      const at = seen[tag];
      results.check("page", "page/focus-ring/" + tag.toLowerCase() + suffix,
        !!at && at.width >= 2 && at.style !== "none",
        !opened ? "the window would not open" : !at ? "the keyboard never reached a " + tag.toLowerCase()
          : "a " + tag.toLowerCase() + " reached by keyboard draws outline " + at.width + "px " + at.style);
    }
    await d.closeModal();

    // A sidebar item, reached the same way.
    await d.goto("overview");
    await d.expandSidebar();
    await d.page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").trim() === "Dashboard");
      if (b) b.focus();
    });
    await d.page.keyboard.press("Tab");
    const nav = await outlineNow(d);
    results.check("page", "page/focus-ring/sidebar-item" + suffix, nav.width >= 2 && nav.style !== "none",
      "a sidebar item reached by keyboard draws outline " + nav.width + "px " + nav.style + " on " + nav.tag);

    // A mouse click draws nothing on a button, which is what :focus-visible is for.
    await d.goto("overview");
    await d.clickText("Dashboard", { anywhere: true, exact: true });
    await d.settle(200);
    const clicked = await outlineNow(d);
    results.check("page", "page/focus-ring/no-ring-on-a-clicked-button" + suffix,
      clicked.tag !== "BUTTON" || clicked.width === 0,
      "a button clicked with the mouse draws outline " + clicked.width + "px " + clicked.style);
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
