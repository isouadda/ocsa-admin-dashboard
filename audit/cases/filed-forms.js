// The filed report window, every type the API can send it, and the two things a person does in it:
// stamp a sign-off, and fill in the supervisor section at a desk.
//
// The drawing is read at both widths, in both themes, at Standard and at the largest text size,
// because a table inside a window is the first thing to run off the side when the text grows. What
// a person does is driven once, at 1280 in dark at Standard, since a request does not change with
// the paint.
"use strict";

const LOG_NAME = "Daily service log";
const FILED_STAMP = "March 16, 2026 at 6:10 PM";
const REVIEW_STAMP = "March 17, 2026 at 9:30 PM";
const STILL_NEEDED = "Still needed in the supervisor section";

async function openFiledForms(d) {
  await d.goto("forms");
  return d.clickText("Filed forms", { exact: false });
}

// The daily service log is the second filed report. The incident report the older cases open is
// still the first.
async function openLog(d) {
  await openFiledForms(d);
  return d.clickRow(1);
}

// Every table drawn inside the window, as its header row and its cells.
function tablesIn(d) {
  return d.page.evaluate(() => {
    const box = document.querySelector("div[style*='z-index: 500']");
    if (!box) return [];
    return Array.from(box.querySelectorAll("table")).map((tb) => ({
      head: Array.from(tb.querySelectorAll("th")).map((c) => c.innerText.trim()),
      cells: Array.from(tb.querySelectorAll("td")).map((c) => c.innerText.trim()),
      wide: tb.scrollWidth > tb.clientWidth + 1,
      boxScrolls: (() => {
        for (let p = tb.parentElement; p && p !== box; p = p.parentElement) {
          if (getComputedStyle(p).overflowX === "auto" && p.scrollWidth > p.clientWidth + 1) return true;
        }
        return false;
      })(),
    }));
  });
}

// What the window does with the space it has, and whether every control in it can be pressed.
function windowGeometry(d) {
  return d.page.evaluate(() => {
    const doc = document.documentElement;
    const box = document.querySelector("div[style*='z-index: 500']");
    const zoom = parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1;
    const small = [];
    if (box) {
      Array.from(box.querySelectorAll("button, input, select, textarea")).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        if (el.type === "checkbox" || el.type === "radio") return;
        if (Math.round(r.width / zoom) < 44 || Math.round(r.height / zoom) < 44) {
          small.push((el.getAttribute("aria-label") || el.innerText || el.tagName).trim().slice(0, 24)
            + " " + Math.round(r.width / zoom) + "x" + Math.round(r.height / zoom));
        }
      });
    }
    return { over: doc.scrollWidth - doc.clientWidth, small: small.slice(0, 4) };
  });
}

async function run({ d, results, inventory, stubs, width, theme, textSize }) {
  const suffix = (width === "narrow" ? " @1024" : "") + (theme === "light" ? " light" : "")
    + (textSize === "standard" ? "" : " " + textSize);
  const once = width === "wide" && theme === "dark" && textSize === "standard";
  const driven = new Set();
  const check = (id, ok, detail) => { driven.add(id); results.check("window", id + suffix, ok, detail); };

  await d.signOutHard();
  await d.signIn("admin");

  // ---- what the window draws -------------------------------------------
  {
    const opened = await openLog(d);
    const text = await d.modalText();
    const tables = await tablesIn(d);
    const heads = tables.map((t) => t.head.join("|"));
    const checklist = tables.find((t) => t.head.indexOf("Done") >= 0);
    const added = tables.find((t) => t.head.indexOf("#") >= 0);

    check("filed-forms/the-window-opens-on-the-new-form", !!opened && text.indexOf(LOG_NAME) >= 0,
      "the second filed report does not open on " + JSON.stringify(LOG_NAME) + ". The window reads "
      + JSON.stringify(text.slice(0, 80)));

    check("filed-forms/a-checklist-draws-as-a-table", !!checklist,
      "no table in the window carries the checklist's columns. The tables carry " + JSON.stringify(heads));
    check("filed-forms/a-checklist-keeps-its-items-down-the-side",
      !!checklist && ["Lobby and entry", "Restrooms", "Break room"].every((r) => checklist.cells.indexOf(r) >= 0),
      "the checklist's rows are not its own cells: " + JSON.stringify(checklist ? checklist.cells.slice(0, 8) : []));
    check("filed-forms/a-checklist-answer-reads-as-a-word",
      !!checklist && checklist.cells.indexOf("Yes") >= 0 && checklist.cells.indexOf("No") >= 0
        && checklist.cells.indexOf("Buffed after the delivery") >= 0,
      "a ticked box does not read Yes and an unticked one No: " + JSON.stringify(checklist ? checklist.cells.slice(0, 9) : []));

    check("filed-forms/an-added-rows-table-is-numbered", !!added && added.cells.indexOf("1") >= 0 && added.cells.indexOf("2") >= 0,
      "no numbered table in the window. The tables carry " + JSON.stringify(heads));
    check("filed-forms/an-added-rows-table-keeps-its-columns",
      !!added && ["Item", "How many", "Unit"].every((h) => added.head.indexOf(h) >= 0),
      "the added-rows table does not carry its columns: " + JSON.stringify(added ? added.head : []));
    check("filed-forms/a-picked-option-reads-as-its-label",
      !!added && added.cells.indexOf("Case") >= 0 && added.cells.indexOf("case") < 0,
      "the unit cell draws the stored value rather than its label: " + JSON.stringify(added ? added.cells : []));

    check("filed-forms/a-signed-part-draws-its-stamp", text.indexOf("Signed by") >= 0 && text.indexOf(FILED_STAMP) >= 0,
      "the filled sign-off does not read Signed by ... on " + FILED_STAMP);
    check("filed-forms/an-unsigned-part-reads-not-signed", text.indexOf("Not signed") >= 0,
      "the empty sign-off does not read Not signed");
    check("filed-forms/whoever-may-sign-is-offered-a-button",
      (await d.modalButtons()).some((b) => b === "Sign"),
      "no Sign button beside the sign-off this person may stamp. The window offers "
      + JSON.stringify(await d.modalButtons()));

    check("filed-forms/the-supervisor-section-takes-answers",
      (await d.modalFields()).length > 0 && (await d.modalButtons()).some((b) => b === "Save"),
      "the supervisor section draws no inputs and no Save");
    check("filed-forms/what-is-still-needed-is-named",
      text.indexOf(STILL_NEEDED) >= 0 && text.indexOf("Date reviewed") >= 0 && text.indexOf("Checks at review") >= 0,
      "the window does not name the supervisor questions still empty");

    const g = await windowGeometry(d);
    check("filed-forms/the-window-does-not-run-off-the-side", g.over <= 1,
      "the page runs " + g.over + " pixels off the side with the window open");
    check("filed-forms/a-wide-table-scrolls-in-its-own-box",
      tables.length > 0 && tables.every((t) => !t.wide || t.boxScrolls),
      "a table wider than its box has nothing to scroll it");
    check("filed-forms/every-control-in-the-window-is-44-by-44", g.small.length === 0,
      "smaller than 44 by 44: " + g.small.join(", "));

    await d.closeModal();
  }

  // ---- a report of the kind the dashboard already drew -------------------
  {
    await openFiledForms(d);
    await d.clickRow(0);
    const text = await d.modalText();
    check("filed-forms/an-older-report-reads-as-it-did",
      text.indexOf("A delivery pallet scuffed the lobby floor.") >= 0 && text.indexOf("Sign") < 0,
      "the incident report no longer reads as it did: " + JSON.stringify(text.slice(0, 120)));
    await d.closeModal();
  }

  if (!once) {
    inventory.FILED_FORM_STATES.forEach((w) => {
      if (!driven.has(w.id) && w.everyPaint) results.noCase("window", w.id + suffix, w.name);
    });
    return;
  }

  // ---- the filed half, whichever word the API uses for it ----------------
  {
    await openLog(d);
    const text = await d.modalText();
    check("filed-forms/the-filed-half-does-not-turn-on-one-word",
      text.indexOf("Areas completed") >= 0,
      "a filed answer the API marked with the other word for that half is nowhere on screen");
    await d.closeModal();
  }

  // ---- the tab, and the filter beside it --------------------------------
  {
    await d.goto("forms");
    const named = await d.clickText("Filed forms", { exact: false });
    check("filed-forms/the-tab-reads-filed-forms", !!named,
      "the tab is still named for incident reports only");
    const options = await d.page.evaluate(() => {
      const sel = Array.from(document.querySelectorAll("select")).find((s) => s.getAttribute("aria-label") === "Form");
      return sel ? Array.from(sel.options).map((o) => o.text) : [];
    });
    check("filed-forms/the-filter-names-every-form",
      options.indexOf("All forms") >= 0 && options.indexOf(LOG_NAME) >= 0 && options.indexOf("Incident report") >= 0,
      "the filter by form offers " + JSON.stringify(options));
    const mark = d.mark();
    await d.pickOption(LOG_NAME);
    await d.settle(400);
    const asked = d.callsSince(mark).find((c) => c.path === "/api/forms/responses" && String(c.query).indexOf("formCode=service-log") >= 0);
    check("filed-forms/the-filter-asks-the-api-for-one-form", !!asked,
      "picking a form sent " + JSON.stringify(d.callsSince(mark).map((c) => c.path + c.query).slice(0, 3)));
  }

  // ---- Sign ------------------------------------------------------------
  {
    stubs.reset();
    await d.reload();
    await openLog(d);
    const mark = d.mark();
    const pressed = await d.clickText("Sign", { inModal: true, exact: true });
    await d.settle(600);
    const sent = d.callsSince(mark).filter((c) => c.method === "POST" && /\/signoff$/.test(c.path));
    const text = await d.modalText();
    check("filed-forms/sign-sends-one-request", !!pressed && sent.length === 1,
      "pressing Sign sent " + sent.length + " requests");
    check("filed-forms/sign-sends-the-key-of-the-part",
      sent.length === 1 && sent[0].body && sent[0].body.key === "review_signoff",
      "the body sent was " + JSON.stringify(sent.length ? sent[0].body : null));
    check("filed-forms/the-stamp-is-drawn-after-the-answer", text.indexOf(REVIEW_STAMP) >= 0,
      "the stamp does not read " + JSON.stringify(REVIEW_STAMP) + " after the API answered");
    check("filed-forms/a-signed-part-is-not-offered-again",
      !(await d.modalButtons()).some((b) => b === "Sign"),
      "Sign is still offered on a part that is signed");
    await d.closeModal();
  }
  {
    // The answer is held open, so what the window draws while the request is in flight can be read.
    stubs.reset();
    await d.reload();
    stubs.setDelay("/signoff", 1200);
    await openLog(d);
    await d.clickText("Sign", { inModal: true, exact: true });
    await d.settle(250);
    const mid = await d.modalText();
    check("filed-forms/sign-waits-for-the-answer",
      mid.indexOf(REVIEW_STAMP) < 0 && /Signing/i.test(mid),
      "while the request is in flight the window reads " + JSON.stringify(mid.slice(0, 120)));
    await d.settle(1500);
    stubs.clearDelays();
    await d.closeModal();
  }
  {
    stubs.reset();
    await d.reload();
    stubs.setDelay("/signoff", 900);
    await openLog(d);
    const mark = d.mark();
    const clicks = await d.page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").trim() === "Sign");
      if (!b) return 0;
      b.click(); b.click();
      return 2;
    });
    await d.settle(1400);
    const sent = d.callsSince(mark).filter((c) => c.method === "POST" && /\/signoff$/.test(c.path));
    check("filed-forms/two-presses-send-one-request", clicks === 2 && sent.length === 1,
      "two presses sent " + sent.length + " requests");
    stubs.clearDelays();
    await d.closeModal();
  }

  // ---- the supervisor section -------------------------------------------
  {
    stubs.reset();
    await d.reload();
    await openLog(d);
    await d.fillByLabel("What the supervisor found", "Walked it with the lead.");
    await d.toggleSwitch("Walked the floor");
    const mark = d.mark();
    const saved = await d.clickText("Save", { inModal: true, exact: true });
    await d.settle(700);
    const sent = d.callsSince(mark).filter((c) => c.method === "PATCH" && /\/supervisor$/.test(c.path));
    const body = sent.length ? sent[0].body : null;
    const keys = body && body.answers ? Object.keys(body.answers).sort() : [];
    check("filed-forms/save-sends-only-what-changed",
      !!saved && sent.length === 1 && keys.join(",") === "checks,review_note",
      "the body sent was " + JSON.stringify(body));
    check("filed-forms/save-sends-a-checklist-in-its-shape",
      !!body && !!body.answers && !!body.answers.checks && body.answers.checks.walkthrough
        && body.answers.checks.walkthrough.ok === true,
      "the checklist went as " + JSON.stringify(body && body.answers ? body.answers.checks : null));
    const after = await d.modalText();
    check("filed-forms/the-section-is-swapped-for-the-answer",
      after.indexOf("Walked it with the lead.") >= 0,
      "the saved answer is not on screen after the API answered");
    check("filed-forms/what-is-still-needed-shrinks",
      after.indexOf(STILL_NEEDED) >= 0 && after.indexOf("Checks at review") < 0
        && after.indexOf("Date reviewed") >= 0,
      "the still-needed line did not drop the question that was answered");
    await d.closeModal();
    stubs.reset();
    await d.reload();
  }

  // ---- who may open Forms at all ----------------------------------------
  {
    await d.signOutHard();
    await d.signIn("supervisor");
    await d.goto("forms");
    const body = await d.bodyText();
    const tabs = await d.visibleButtons();
    results.check("page", "page/forms/a-supervisor-the-list-lets-in-reads-filed-forms",
      body.indexOf("is for admins") < 0 && body.indexOf("Filed forms") >= 0,
      "the body reads " + JSON.stringify(body.slice(0, 120)));
    results.check("page", "page/forms/that-supervisor-sees-no-other-tab",
      body.indexOf("is for admins") < 0 && tabs.indexOf("Library") < 0 && tabs.indexOf("Submissions") < 0,
      "the page offers " + JSON.stringify(tabs.slice(0, 8)));

    await d.signOutHard();
    await d.signIn("capability");
    await d.goto("forms");
    const other = await d.bodyText();
    results.check("page", "page/forms/a-supervisor-the-list-refuses-sees-the-admin-line",
      other.indexOf("is for admins") >= 0,
      "the body reads " + JSON.stringify(other.slice(0, 120)));
    await d.signOutHard();
    await d.signIn("admin");
  }

  inventory.FILED_FORM_STATES.forEach((w) => {
    if (!driven.has(w.id)) results.noCase("window", w.id, w.name);
  });
}

module.exports = { run };
