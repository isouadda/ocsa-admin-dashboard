// Every page, signed in as each of four kinds of person.
//
// For each page the suite records what is on screen AND what is absent, so a screen that should be
// hidden and is not fails here. The narrow pass repeats every page at 1024 wide. The phone pass, 390
// wide, reads the shell and every page's first render as the admin and as the supervisor, in light at
// Standard in English: the body scrolls no wider than the screen, no control is under 44 by 44, the
// bar holds the menu button, the title on one line and the More button, the drawer opens and closes,
// and the More menu holds language, text size, notifications, light and dark, and sign out. Windows
// and the Spanish pass at 390 wait for a later step. At every width the title draws on one line and
// the panel is collapsed whenever the page's own width is under 1,100.
"use strict";
const { englishLeftOn } = require("../lib/english");
const SPANISH_TODO = require("../spanish-todo.json");
const seed = require("../seed");
const layout = require("../lib/layout");

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
    const panel = document.querySelector("div[style*='position: fixed'][style*='border-right']");
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

// What a person can reach and read on the page as drawn: whether the page runs off the side, whether
// the title in the top bar has run into what sits beside it, and whether every control can be hit at
// its own center. A control the page draws under something else fails the hit test.
async function geometry(d) {
  return d.page.evaluate(() => {
    const doc = document.documentElement;
    const over = doc.scrollWidth - doc.clientWidth;
    const bar = document.querySelector("div[style*='z-index: 40']");
    let overlap = null;
    if (bar) {
      // The phone bar marks its title; the wider bar's title is the first div nested in a div.
      const title = bar.querySelector("[data-page-title]") || bar.querySelector("div > div");
      const kids = Array.from(bar.children);
      const mine = title ? kids.find((c) => c === title || c.contains(title)) : null;
      if (title && mine) {
        const t = title.getBoundingClientRect();
        for (const c of kids) {
          if (c === mine) continue;
          const b = c.getBoundingClientRect();
          if (b.width > 0 && t.right > b.left + 1 && t.left < b.right - 1) {
            overlap = Math.round(t.right - b.left) + " pixels into what sits beside it";
            break;
          }
        }
      }
    }
    // A control scrolled out of its own box is not on screen, so it is not asked about. What is
    // asked about is a control that is on screen and cannot be hit where a finger would land.
    const onScreen = (el, cx, cy) => {
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (o.overflowX === "visible" && o.overflowY === "visible") continue;
        const b = p.getBoundingClientRect();
        if (cx < b.left - 1 || cx > b.right + 1 || cy < b.top - 1 || cy > b.bottom + 1) return false;
      }
      return true;
    };
    const unreachable = [];
    const controls = Array.from(document.querySelectorAll("button, input, select, textarea, a[href]"));
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (!onScreen(el, cx, cy)) continue;
      const hit = document.elementFromPoint(cx, cy);
      if (!hit) { unreachable.push(el.tagName.toLowerCase() + " at " + Math.round(cx) + "," + Math.round(cy)); continue; }
      // The toast is over everything on purpose, and for three seconds.
      const hs = getComputedStyle(hit);
      if (hs.position === "fixed" && Number(hs.zIndex) >= 1000) continue;
      if (hit !== el && !el.contains(hit) && !hit.contains(el)) {
        unreachable.push((el.getAttribute("aria-label") || el.getAttribute("placeholder") || (el.innerText || "").trim().slice(0, 20) || el.tagName.toLowerCase())
          + " is under " + hit.tagName.toLowerCase());
      }
      if (unreachable.length > 3) break;
    }
    return { over, overlap, unreachable };
  });
}

// How many lines the page title in the top bar takes. Its text is measured as the browser drew it,
// one rectangle per line, so a title that wrapped reads two whatever its style says.
async function titleLines(d) {
  return d.page.evaluate(() => {
    const bar = document.querySelector("div[style*='z-index: 40']");
    // The phone bar marks its title; the wider bar's title is the first line of its first box, above
    // the line that names the company and the role.
    const first = bar && bar.firstElementChild;
    const title = bar ? (bar.querySelector("[data-page-title]") || (first && first.firstElementChild)) : null;
    if (!title) return { lines: 0, text: "" };
    const range = document.createRange();
    range.selectNodeContents(title);
    const tops = new Set();
    Array.from(range.getClientRects()).forEach((r) => { if (r.width > 0 && r.height > 0) tops.add(Math.round(r.top)); });
    return { lines: tops.size, text: (title.innerText || "").trim() };
  });
}

// Every control a finger can miss: anything that can be pressed or typed into and is drawn under 44
// by 44 in the page's own pixels. A checkbox or radio is measured by the label that holds it, the way
// the training suite measures one. What is inside an <svg> is a picture.
async function smallControls(d) {
  return d.page.evaluate(() => {
    const zoom = parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1;
    const out = [];
    document.querySelectorAll("button, input, select, textarea, a[href]").forEach((el) => {
      if (el.closest("svg")) return;
      const target = el.type === "checkbox" || el.type === "radio" ? (el.closest("label") || el) : el;
      const r = target.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const w = Math.round(r.width / zoom), h = Math.round(r.height / zoom);
      if (w < 44 || h < 44) {
        out.push((el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("title")
          || (el.innerText || "").trim().slice(0, 24) || el.tagName.toLowerCase()) + " " + w + "x" + h);
      }
    });
    return out;
  });
}

// The phone's top bar, with every menu closed: no wider than the screen, the menu button at its left
// edge, the More button at its right, the marked title between them, and nothing else that can be
// pressed. A bar that still holds the search box, the bell or the avatar chip has two more buttons.
async function phoneBar(d) {
  return d.page.evaluate((w) => {
    const bar = document.querySelector("div[style*='z-index: 40']");
    if (!bar) return ["no top bar"];
    const vw = document.documentElement.clientWidth;
    const b = bar.getBoundingClientRect();
    const why = [];
    if (Math.round(b.width) > vw + 1 || bar.scrollWidth > bar.clientWidth + 1) why.push("the bar is " + Math.round(Math.max(b.width, bar.scrollWidth)) + " wide on a screen " + vw + " wide");
    const menu = bar.querySelector("button[title='" + w.menu + "']");
    const more = bar.querySelector("button[title='" + w.more + "']");
    const title = bar.querySelector("[data-page-title]");
    if (!menu) why.push("no " + w.menu + " button"); else if (menu.getBoundingClientRect().left > 24) why.push("the " + w.menu + " button starts " + Math.round(menu.getBoundingClientRect().left) + " pixels in");
    if (!more) why.push("no " + w.more + " button"); else if (more.getBoundingClientRect().right < vw - 24) why.push("the " + w.more + " button ends " + Math.round(vw - more.getBoundingClientRect().right) + " pixels short of the edge");
    if (!title) why.push("no title");
    else if (menu && more) {
      const t = title.getBoundingClientRect();
      if (t.left < menu.getBoundingClientRect().right - 1 || t.right > more.getBoundingClientRect().left + 1) why.push("the title is not between the two buttons");
    }
    const buttons = bar.querySelectorAll("button, input, select").length;
    if (buttons !== 2) why.push("the bar holds " + buttons + " controls where it should hold the two buttons");
    return why;
  }, { menu: d.say("Menu"), more: d.say("More") });
}

// What the More menu holds, read off the menu itself: its words and its buttons' titles.
async function moreMenu(d) {
  return d.page.evaluate(() => {
    const m = document.querySelector("[role='menu']");
    if (!m) return null;
    return { text: (m.innerText || "").replace(/\s+/g, " "), titles: Array.from(m.querySelectorAll("button")).map((b) => b.getAttribute("title") || "").filter(Boolean) };
  });
}

// Every element's box, as one line each, and the boxes of the parts that can be named. What is
// inside an <svg> is left out: a chart animates as it draws.
async function boxes(d) {
  return d.page.evaluate(() => {
    const lines = [];
    const named = {};
    const label = (el) => {
      const a = el.getAttribute && (el.getAttribute("aria-label") || el.getAttribute("placeholder"));
      const t = a || (el.innerText || "").trim().split("\n")[0];
      return t && t.length <= 40 ? el.tagName.toLowerCase() + ":" + t : "";
    };
    // The toast comes and goes on its own timer, so it is not part of where anything sits. It is not
    // counted among its siblings either, so every other box has the same path whether or not the
    // sign-in toast is still up when the page is read.
    const toast = (el) => { const cs = getComputedStyle(el); return cs.position === "fixed" && Number(cs.zIndex) >= 1000; };
    const walk = (el, path) => {
      const r = el.getBoundingClientRect();
      lines.push(path + ":" + Math.round(r.x) + "," + Math.round(r.y) + "," + Math.round(r.width) + "," + Math.round(r.height));
      const key = label(el);
      if (key && !named[key] && Object.keys(named).length < 300) {
        named[key] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
      }
      if (el.tagName.toLowerCase() === "svg") return;
      const kids = Array.from(el.children).filter((c) => !toast(c));
      for (let i = 0; i < kids.length; i += 1) walk(kids[i], path + "/" + i);
    };
    walk(document.body, "b");
    return { lines, named };
  });
}

// The window scrolled to the top and held there for the boxes to be read. Nothing is scrolled inside
// the page's own boxes; a table that scrolls sideways keeps where it is.
async function atTop(d) {
  await d.page.evaluate(() => window.scrollTo(0, 0));
  await d.page.waitForTimeout(80);
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

async function run({ d, results, inventory, app, stubs, width, theme, textSize, lang }) {
  const light = theme === "light";
  const size = textSize || "standard";
  const spanish = lang === "es";
  const phone = width === "phone";
  const suffix = (width === "narrow" ? " @1024" : phone ? " @390" : "") + (light ? " light" : "")
    + (size === "standard" ? "" : " " + size) + (spanish ? " es" : "");
  // The Spanish pass and the phone pass read the screens a supervisor lives in, as the two people who
  // live in them. The English passes already cover the other width, the other theme and the larger sizes.
  const people = spanish || phone ? ["admin", "supervisor"] : seed.PERSONAS;
  // The five things the More menu holds on a phone, in the words the wider bar uses for them. Light
  // and dark is one button that names the mode it would switch to.
  const moreWords = [d.say("Language"), d.say("Text size"), d.say("Notifications"), d.say("Sign Out")];
  const modeWords = [d.say("Light mode"), d.say("Dark mode")];

  for (const persona of people) {
    const who = seed.PERSONA_LABEL[persona];
    await d.signOutHard();
    await d.signIn(persona);
    const isAdmin = seed.PEOPLE[persona].role === "admin";

    // The panel is collapsed whenever the page's own width is under 1,100, read before anything here
    // has touched it: at 1024 the app collapses it to its icons on its own, and on a phone it is not
    // drawn until the menu button opens it. Break: raise the breakpoint below 1024; red at 1024.
    if (width !== "wide") {
      results.check("page", "nav/" + persona + suffix + "/panel-collapsed-under-1100", await d.panelCollapsed(),
        "the side panel is open at a width under 1,100");
    }

    // The sidebar, read once per persona: present and absent together. At 1024 the app starts the
    // sidebar collapsed to one icon per group, so it is expanded first and the labels read there. On
    // a phone it is the drawer, opened from the menu button.
    await d.expandSidebar();
    const nav = (await d.visibleNavItems()).join(" | ");
    // The manage permissions capability opens Settings, and a person the forms API lets list filed
    // reports opens Forms, so each is expected to have the item they open and none of the others.
    const opensSettings = seed.PEOPLE[persona].singleCapability === "manage_permissions";
    const opensForms = seed.PEOPLE[persona].readsFiledForms === true;
    // The nav is read in whichever language the pass is in, since a label is a word like any other.
    const adminNav = ADMIN_ONLY_NAV.map((l) => d.say(l));
    const allowed = isAdmin ? adminNav : [].concat(opensSettings ? [d.say("Settings")] : [], opensForms ? [d.say("Forms")] : []);
    // The nav labels are read with the panel open. The app collapses it below 1100 on its own, so it
    // is put back before anything is measured, or the page is measured in a state nobody is in.
    if (width === "narrow" || phone) await d.collapseSidebar();
    const missing = allowed.filter((l) => nav.indexOf(l) < 0);
    const present = adminNav.filter((l) => nav.indexOf(l) >= 0 && allowed.indexOf(l) < 0);
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
      const header = shellText.indexOf(d.say(p.label)) >= 0;

      // What the page does with the space it has, at whatever size the text is set to. This runs on
      // every page case, the gated ones included: the line a person cannot open a page with is a
      // page a person reads.
      const g = await geometry(d);
      results.check("page", id + "/no-sideways-scroll", g.over <= 1,
        "the page runs " + g.over + " pixels off the side");
      results.check("page", id + "/title-clear-of-the-search-box", !g.overlap,
        "the page title runs " + g.overlap);
      results.check("page", id + "/controls-reachable", g.unreachable.length === 0,
        "a control cannot be hit at its own center: " + g.unreachable.join(", "));
      // The page title draws on one line at every width. Break: let it wrap and give it more words.
      const tl = await titleLines(d);
      results.check("page", id + "/title-on-one-line", tl.lines === 1,
        tl.lines === 0 ? "no page title in the top bar" : "the title " + JSON.stringify(tl.text) + " takes " + tl.lines + " lines");
      // Under 1,100 the panel stays out of the way on every page.
      if (width !== "wide") {
        results.check("page", id + "/panel-collapsed-under-1100", await d.panelCollapsed(),
          "the side panel is open at a width under 1,100");
      }

      // The phone: every control is at least 44 by 44, the bar holds its three things, the drawer
      // opens and closes, and the More menu holds its five. Break: one table given a fixed width is
      // red on its page; one control fixed at 30 pixels is red; one item dropped from the menu is red.
      let paint = null;
      if (phone) {
        const small = await smallControls(d);
        results.check("page", id + "/controls-44-by-44", small.length === 0,
          small.length + " controls under 44 by 44: " + small.slice(0, 5).join(", "));
        const barWhy = await phoneBar(d);
        results.check("page", id + "/phone-bar", barWhy.length === 0, barWhy.join("; "));

        const opened = await d.openDrawer();
        const box = opened ? await d.panelBox() : null;
        // The panel's paint is read while the drawer is open, since it is not drawn otherwise.
        if (light && opened) paint = await painted(d);
        const closed = opened ? await d.closeDrawer() : false;
        results.check("page", id + "/drawer-opens-and-closes", opened && closed && box && box.width >= 200 && box.height >= box.windowHeight - 1 && box.buttons > 3,
          !opened ? "the drawer did not open from the " + d.say("Menu") + " button"
            : !box || box.width < 200 || box.height < box.windowHeight - 1 ? "the drawer is " + (box ? box.width + " by " + box.height : "not drawn") + " on a screen " + (box ? box.windowHeight : "") + " tall"
              : !box || box.buttons <= 3 ? "the drawer holds " + (box ? box.buttons : 0) + " controls"
                : "the drawer did not close on Escape");

        const moreOpened = await d.openMoreMenu();
        const menu = moreOpened ? await moreMenu(d) : null;
        const holds = (w) => !!menu && (menu.text.indexOf(w) >= 0 || menu.titles.indexOf(w) >= 0);
        const lacking = moreWords.filter((w) => !holds(w)).concat(modeWords.some(holds) ? [] : [modeWords.join(" or ")]);
        if (moreOpened) await d.closeMenus();
        const moreClosed = !(await d.moreMenuOpen());
        results.check("page", id + "/more-menu-holds-five", moreOpened && lacking.length === 0 && moreClosed,
          !moreOpened ? "the More menu did not open from the " + d.say("More") + " button"
            : lacking.length ? "the More menu lacks " + lacking.join(", ") : "the More menu did not close on Escape");
      }

      // Where everything sits at Standard, which every later commit has to match. The boxes are read
      // with the window at the top, since a page reached with it scrolled draws every box higher.
      if (size === "standard" && !light && !spanish && persona === "admin") {
        await d.settle(300);
        await atTop(d);
        let snap = await boxes(d);
        if (!layout.matches(p.id, width, snap)) { await d.settle(600); await atTop(d); snap = await boxes(d); }
        layout.see(p.id, width, snap, results);
      }

      // A gated page opens for an admin, and Settings also opens for the person whose capability
      // names that screen.
      const opens = !p.gated || isAdmin
        || (p.id === "settings" && seed.PEOPLE[persona].singleCapability === "manage_permissions")
        || (p.id === "forms" && seed.PEOPLE[persona].readsFiledForms === true);
      if (!opens) {
        // The page must not render its contents, AND the person must be told why. The page label
        // still sits in the header, so only the content area is read here.
        const leaked = body.indexOf(p.expect) >= 0;
        // The ruling, in whichever language the page is drawn in.
        const explained = /not available|no access|cannot|ask an admin|only an admin|is for admins|permission/i.test(body)
          || body.indexOf(d.say("This page is for admins.")) >= 0;
        results.check("page", id, !leaked && explained,
          leaked ? "a " + who + " can read this admin page, the body holds " + JSON.stringify(p.expect) :
            "the body is " + bodyLen + " characters and says nothing about why");
        continue;
      }

      // On a Spanish pass, every word on the page has to be Spanish from the table, something the
      // API served, a number, a date or a time, or the company's own name.
      if (spanish) {
        const listed = SPANISH_TODO.pages[p.id];
        const left = englishLeftOn(await d.readable(), stubs.calls);
        const said = left.slice(0, 3).map((x) => JSON.stringify(x.left)).join(", ");
        if (listed) {
          results.check("spanish", "spanish/" + p.id + "/" + persona, left.length > 0,
            "this page reads Spanish now. Take " + JSON.stringify(p.id) + " off audit/spanish-todo.json, where it is listed for " + listed.part);
          if (left.length > 0 && persona === "admin") {
            results.note("still English, " + listed.part + ": " + p.id + ", " + left.length + " lines");
          }
        } else {
          results.check("spanish", "spanish/" + p.id + "/" + persona, left.length === 0,
            left.length + " lines a " + who + " reads are not Spanish: " + said);
          // A page is more than the view it opens on. Every view the page holds is read too, so
          // Schedule is checked on Month, Patterns and Time off as well as Week.
          // A view an admin alone opens is read on an admin's pass.
          for (const v of inventory.VIEWS.filter((x) => x.page === p.id && (isAdmin || !x.adminOnly))) {
            // The page again first, so a window one view opened is not still covering the next.
            await d.goto(p.id);
            await d.settle(150);
            let opened = true;
            let missed = "";
            // A view inside a row, a site's profile for one, opens the row first, the way the
            // views suite reaches it.
            if (v.openRow != null && !(await d.clickRow(v.openRow))) { opened = false; missed = "row " + v.openRow; }
            for (const step of (opened ? [].concat(v.word || v.click || []) : [])) {
              const word = d.say(step);
              // The control whose whole name is the word, with any count beside it taken off. The
              // Spanish for Open is inside the Spanish for Post Open Shift, so a control that
              // merely contains the word is the wrong one. It is looked for in the page's own area
              // first, since a tab on Sites carries the same word as a page in the sidebar.
              let clicked = await d.page.evaluate((w) => {
                const strip = (s) => String(s).replace(/\s+/g, " ").trim().replace(/\s*\(?\d+\)?$/, "").trim();
                const find = (root) => Array.from(root.querySelectorAll("button, [role='tab'], a"))
                  .filter((b) => b.offsetParent !== null).find((b) => strip(b.innerText) === w);
                const area = document.querySelector("div[style*='padding: 16px 24px 30px']");
                const hit = (area && find(area)) || find(document);
                if (!hit) return false;
                hit.click();
                return true;
              }, word);
              if (!clicked) {
                try { clicked = await d.clickText(word, { exact: false }); } catch (e) { clicked = false; }
              }
              if (!clicked) { opened = false; missed = word; break; }
              await d.settle(250);
            }
            if (!opened) {
              results.check("spanish", "spanish/" + v.id + "/" + persona, false,
                "the view did not open from " + JSON.stringify(missed));
              continue;
            }
            const vleft = englishLeftOn(await d.readable(), stubs.calls);
            results.check("spanish", "spanish/" + v.id + "/" + persona, vleft.length === 0,
              vleft.length + " lines a " + who + " reads are not Spanish: "
                + vleft.slice(0, 3).map((x) => JSON.stringify(x.left)).join(", "));
          }
        }
      }

      const newErrors = d.pageErrors.slice(errsBefore);
      results.check("page", id, header && bodyLen > 40 && newErrors.length === 0,
        !header ? "the header does not say " + d.say(p.label) :
          bodyLen <= 40 ? "the body is only " + bodyLen + " characters" :
          newErrors.length ? "the page threw: " + newErrors[0] : "");

      // Light mode is a different screen, so every page is read for what it paints. On a phone the
      // panel's paint was read with the drawer open.
      if (light) {
        if (!paint) paint = await painted(d);
        results.check("page", id + "/panel", paint.panel === "#15558F",
          "the side panel paints " + JSON.stringify(paint.panel) + ", expected #15558F");
        results.check("page", id + "/top-bar", paint.top === "#FFFFFF",
          "the top bar paints " + JSON.stringify(paint.top) + ", expected #FFFFFF");
        results.check("page", id + "/no-dark-backgrounds", paint.dark.length === 0,
          "a dark background is painted in light mode: " + paint.dark.join(", "));
      }
    }
  }

  // On a phone the drawer also closes on a pick and on its backdrop, checked once as the last person.
  // Break: leave the drawer open after a pick; red.
  if (phone) {
    await d.goto("overview");
    let picked = await d.openDrawer();
    if (picked) {
      await d.page.evaluate(({ panel, word }) => {
        const sb = document.querySelector(panel);
        const b = sb && Array.from(sb.querySelectorAll("button")).find((x) => (x.innerText || "").trim() === word);
        if (b) b.click();
      }, { panel: "div[style*='position: fixed'][style*='border-right']", word: d.say("Live Ops") });
      await d.settle(300);
    }
    const closedOnPick = picked && !(await d.drawerOpen());
    const landed = await d.has(d.say("Live Operations"));
    results.check("page", "page/drawer-closes-on-a-pick" + suffix, closedOnPick && landed,
      !picked ? "the drawer did not open" : !closedOnPick ? "the drawer is still open after a pick" : "the pick did not open Live Ops");
    const again = await d.openDrawer();
    if (again) { await d.page.mouse.click(330, 500); await d.settle(300); }
    results.check("page", "page/drawer-closes-on-the-backdrop" + suffix, again && !(await d.drawerOpen()),
      !again ? "the drawer did not open" : "the drawer is still open after a press on its backdrop");
  }

  // Where the keyboard is, in both themes. The window on Assigned Tasks is the one screen that
  // carries an input, a select, a text area and buttons together.
  if (width === "wide") {
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
  results.check("page", "page/unknown-hash" + suffix, await d.has(d.say("Welcome back, {0}").split("{0}")[0].trim()),
    "an unknown hash lands on the Dashboard");

  // The page in the hash survives a reload. Its title is read in the pass's own language, since the
  // Issue Tracker draws no English word on a Spanish screen.
  await d.goto("issues");
  await d.page.reload({ waitUntil: "domcontentloaded" });
  await d.settle(600);
  results.check("page", "page/hash-survives-reload" + suffix, await d.has(d.say("Issue Tracker")),
    "#issues reopens after a reload, which is " + JSON.stringify(d.say("Issue Tracker")) + " in this pass");

  // The nav search box reaches a page without the sidebar. On a phone it sits in the drawer.
  await d.goto("overview");
  if (phone) await d.openDrawer();
  // The box is found by its own placeholder, in whichever language it is drawn.
  const navSearch = d.page.getByPlaceholder(d.say("Search pages")).first();
  if (await navSearch.count()) {
    // The first letters of the word the nav actually draws, since the list is filtered by its labels.
    await navSearch.fill(d.say("Vendors").slice(0, 4).toLowerCase());
    await d.settle(320);
    const hit = d.page.locator("button", { hasText: d.say("Vendors") }).first();
    if (await hit.count()) { await hit.click(); await d.settle(); }
    results.check("page", "page/nav-search" + suffix, await d.has(d.say("Vendor Registry")),
      "typing vend reaches the Vendor Registry");
  } else {
    results.fail("page", "page/nav-search" + suffix, "no nav search box on screen");
  }

  // Signing out from the user menu empties the shell back to the login card.
  await d.goto("overview");
  await d.signOut();
  results.check("page", "page/sign-out" + suffix, await d.has(d.say("Admin Dashboard")),
    "the login card is back after Sign Out");
}

module.exports = { run };
