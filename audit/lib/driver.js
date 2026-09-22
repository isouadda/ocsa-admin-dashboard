// The one object every case drives the app through. It fixes the clock and the time zone, answers
// every API call from the stub, and records what is on screen, what a window sent, what a toast
// said, what a download held and what a print export wrote.
"use strict";
const seed = require("../seed");

const FIXED = new Date(seed.NOW_ISO);

// Runs before any app script on every page. Four things the app does that a headless browser
// cannot finish are captured here instead: a new window for a print export, a confirm box, an
// anchor download, and a print call.
const INIT = `(() => {
  window.__audit = { prints: [], downloads: [], blobs: {}, confirms: [], alerts: [], confirmAnswer: true, popupsBlocked: false, consoleErrors: [] };
  const origCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function (blob) {
    const url = origCreate(blob);
    try { window.__audit.blobs[url] = blob.text(); } catch (e) { window.__audit.blobs[url] = Promise.resolve(""); }
    return url;
  };
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute("download")) {
      window.__audit.downloads.push({ name: this.getAttribute("download"), href: this.href });
      return undefined;
    }
    return origClick.apply(this, arguments);
  };
  window.open = function (url, name, features) {
    if (window.__audit.popupsBlocked) return null;
    const rec = { url: url || "", html: "", printed: false, features: features || "" };
    window.__audit.prints.push(rec);
    const fakeDoc = {
      write(h) { rec.html += String(h); },
      close() {},
      get title() { return rec.title || ""; },
      set title(v) { rec.title = v; },
    };
    return {
      document: fakeDoc,
      print() { rec.printed = true; },
      focus() {}, close() {}, blur() {},
      addEventListener(type, fn) { if (type === "load") { try { fn(); } catch (e) {} } },
      removeEventListener() {},
      location: { href: url || "" },
      closed: false,
    };
  };
  window.print = function () { window.__audit.selfPrinted = true; };
  window.confirm = function (msg) { window.__audit.confirms.push(String(msg)); return window.__audit.confirmAnswer; };
  window.alert = function (msg) { window.__audit.alerts.push(String(msg)); };
  window.addEventListener("error", (e) => { window.__audit.consoleErrors.push(String(e.message)); });
})();`;

const VIEWPORTS = { wide: { width: 1280, height: 900 }, narrow: { width: 1024, height: 900 } };
const THEME_SEED = (mode) => '(() => { try { localStorage.setItem("ocsa-theme", ' + JSON.stringify(mode) + '); } catch (e) {} })();';

async function createDriver({ browser, origin, stubs, viewport, theme }) {
  const mode = theme === "light" ? "light" : "dark";
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewport] || VIEWPORTS.wide,
    timezoneId: seed.TIMEZONE,
    locale: "en-US",
    colorScheme: mode,
    acceptDownloads: true,
  });
  // Only Date is frozen. clock.install replaces setTimeout as well, which pauses the timers the app
  // fires a print export and a toast dismissal inside, so it is deliberately not used.
  await context.clock.setFixedTime(FIXED);
  await context.addInitScript(INIT);
  // The app reads this key before its first render, so the theme is seeded here rather than toggled
  // on screen. signOutHard puts it back, since clearing storage would otherwise drop it.
  await context.addInitScript(THEME_SEED(mode));

  // Nothing leaves the machine. Fonts and the QR image service are answered locally so a run works
  // with the network switched off.
  await context.route("**://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await context.route("**://fonts.gstatic.com/**", (r) => r.fulfill({ status: 200, body: "" }));
  await context.route("**://api.qrserver.com/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: Buffer.alloc(0) }));

  await context.route("**/api/**", async (route) => {
    const req = route.request();
    let body = null;
    try { const raw = req.postData(); if (raw) body = JSON.parse(raw); } catch (e) { body = req.postData() || null; }
    const answer = stubs.handle({ method: req.method(), url: req.url(), body });
    if (answer.delayMs) await new Promise((r) => setTimeout(r, answer.delayMs));
    // One route answers a PDF rather than JSON, which the page fetches as a blob.
    if (answer.pdf) {
      await route.fulfill({
        status: answer.status,
        contentType: "application/pdf",
        headers: Object.assign({ "Access-Control-Allow-Origin": "*" }, answer.headers || {}),
        body: Buffer.from(String(answer.json), "utf8"),
      });
      return;
    }
    await route.fulfill({
      status: answer.status,
      contentType: "application/json; charset=utf-8",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(answer.json == null ? {} : answer.json),
    });
  });

  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e && e.message ? e.message : e)));
  page.on("console", (m) => { if (m.type() === "error") pageErrors.push("console: " + m.text()); });

  const d = {
    page, context, stubs, pageErrors,
    viewport: viewport || "wide",
    theme: mode,

    async close() { await context.close(); },

    // ---- session ---------------------------------------------------------
    async signIn(personaKey) {
      const who = seed.PEOPLE[personaKey];
      // The hash is reset to the Dashboard first. Signing in while the hash still points at another
      // page lands there instead, which is how a 401 on the Issues page used to hang the sign-in.
      if (page.url().indexOf(origin) !== 0) {
        await page.goto(origin + "/#overview", { waitUntil: "domcontentloaded" });
      } else {
        await page.evaluate(() => { window.location.hash = "overview"; });
        await page.reload({ waitUntil: "domcontentloaded" });
      }
      await page.waitForSelector("text=Admin Dashboard", { timeout: 20000 });
      const inputs = page.locator("input");
      await inputs.nth(0).fill(who.login.phone);
      await inputs.nth(1).fill(who.login.pin);
      await page.getByRole("button", { name: "Sign In" }).click();
      // The bell is in the top bar of every page, so it is the signal that the shell is up, whatever
      // page the hash happens to name.
      await page.waitForSelector("button[title='Notifications']", { timeout: 20000 });
      await this.settle();
    },

    // True when the login card is on screen, which is where a 401 leaves the person.
    async signedOut() {
      return (await page.locator("button[title='Notifications']").count()) === 0;
    },
    // Signs back in only when the person has been signed out, so a case can call it freely.
    async ensureSignedIn(personaKey) {
      if (!(await this.signedOut())) return false;
      await this.signIn(personaKey || "admin");
      return true;
    },

    // Drops the stored session on the app's own origin and leaves the tab blank, so the next
    // signIn is a real load.
    async signOutHard() {
      if (page.url().indexOf(origin) !== 0) await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
      await page.evaluate((m) => { try { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("ocsa-theme", m); } catch (e) {} }, mode);
      await page.goto("about:blank");
    },

    // ---- navigation ------------------------------------------------------
    async goto(pageId, sub) {
      const cur = await page.evaluate(() => window.location.hash.replace(/^#/, "").split("/")[0]);
      // Setting the same hash changes nothing, so the page keeps whatever tab it was left on. A hop
      // through another page unmounts it, which is what a person gets when they navigate away.
      if (cur === pageId) {
        await page.evaluate((other) => { window.location.hash = other; }, pageId === "overview" ? "help" : "overview");
        await this.settle(140);
      }
      const hash = "#" + [pageId].concat(sub ? [].concat(sub) : []).join("/");
      await page.evaluate((h) => { window.location.hash = h; }, hash);
      await this.settle();
    },

    // A real page load, which is what it takes to refetch the lists the shell holds.
    async reload() {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector("text=Welcome back", { timeout: 20000 }).catch(() => {});
      await this.settle(300);
    },

    async settle(extraMs) {
      await page.waitForTimeout(extraMs == null ? 220 : extraMs);
      try { await page.waitForLoadState("networkidle", { timeout: 4000 }); } catch (e) { /* the app polls, so idle can never come */ }
      await page.waitForTimeout(80);
    },

    // ---- the root error boundary ------------------------------------------
    // A render exception drops the whole app behind src/index.js's boundary. The suite reports the
    // case that caused it and then reloads and signs back in, so one broken screen does not blank
    // every case after it.
    async crashed() {
      return this.has("Something went wrong and the page needs reloading");
    },
    async crashDetail() {
      if (!(await this.crashed())) return "";
      const pre = page.locator("pre").first();
      if ((await pre.count()) === 0) return "the app dropped behind the root error boundary";
      const txt = (await pre.innerText()).split("\n")[0];
      return "the app threw: " + txt.trim();
    },
    async recover(personaKey) {
      if (!(await this.crashed())) return false;
      await this.signOutHard();
      await this.signIn(personaKey || "admin");
      return true;
    },

    // ---- reading the screen ---------------------------------------------
    async text() {
      return (await page.locator("body").innerText()).replace(/ /g, " ");
    },
    async has(s) { return (await this.text()).indexOf(s) >= 0; },
    async absent(s) { return (await this.text()).indexOf(s) < 0; },
    // Chromium's innerText applies text-transform, and the app upper-cases plenty of headings, so
    // most assertions compare without case.
    async hasI(s) { return (await this.text()).toLowerCase().indexOf(String(s).toLowerCase()) >= 0; },
    async absentI(s) { return (await this.text()).toLowerCase().indexOf(String(s).toLowerCase()) < 0; },

    async headerTitle() {
      try { return (await page.locator("h1, [data-page-title]").first().innerText()).trim(); } catch (e) { return ""; }
    },

    // The page content area, the div the render switch puts a page into. Everything above it, the
    // header with the page label and the sidebar, is the shell and is read separately.
    contentBox() {
      return page.locator("div[style*='padding: 16px 24px 30px']").first();
    },
    async bodyText() {
      const box = this.contentBox();
      if ((await box.count()) === 0) return "";
      return (await box.innerText()).replace(/\u00a0/g, " ");
    },
    async bodyLength() {
      const t0 = await this.bodyText();
      return t0.replace(/\s+/g, " ").trim().length;
    },
    async bodyHas(s0) { return (await this.bodyText()).toLowerCase().indexOf(String(s0).toLowerCase()) >= 0; },
    // innerText leaves out SVG text, so a chart's own axis labels need textContent.
    async bodyTextContent() {
      const box = this.contentBox();
      if ((await box.count()) === 0) return "";
      return (await box.evaluate((el) => el.textContent || "")).replace(/\u00a0/g, " ");
    },
    async chartHas(s0) { return (await this.bodyTextContent()).toLowerCase().indexOf(String(s0).toLowerCase()) >= 0; },
    // Every label a chart draws, which is what a NaN where a name belongs shows up in.
    async chartLabels() {
      const box = this.contentBox();
      if ((await box.count()) === 0) return [];
      const t0 = await box.locator("svg text").allTextContents();
      // ApexCharts draws each label twice, once for measuring, so the pairs are collapsed.
      return Array.from(new Set(t0.map((v) => {
        const half = v.length / 2;
        return v.slice(0, half) === v.slice(half) ? v.slice(0, half) : v;
      }))).filter(Boolean);
    },
    async bodyHasExact(s0) { return (await this.bodyText()).indexOf(s0) >= 0; },

    async visibleButtons() {
      return page.evaluate(() => Array.from(document.querySelectorAll("button"))
        .filter((b) => b.offsetParent !== null)
        .map((b) => (b.innerText || b.getAttribute("aria-label") || "").trim())
        .filter(Boolean));
    },

    async visibleNavItems() {
      return page.evaluate(() => {
        const sb = document.querySelector("div[style*='position: fixed'][style*='height: 100vh']");
        if (!sb) return [];
        return Array.from(sb.querySelectorAll("button, a"))
          .map((b) => ((b.innerText || "").trim() || b.getAttribute("title") || "").trim())
          .filter(Boolean);
      });
    },
    async sidebarCollapsed() {
      return page.evaluate(() => {
        const sb = document.querySelector("div[style*='position: fixed'][style*='height: 100vh']");
        return sb ? sb.getBoundingClientRect().width < 100 : false;
      });
    },

    // ---- the user menu ---------------------------------------------------
    // The trigger is the avatar chip in the top bar, which carries the person's initials and first
    // name. The sidebar shows the same first name, so the sidebar is excluded by position.
    async openUserMenu() {
      const clicked = await page.evaluate(() => {
        const sb = document.querySelector("div[style*='position: fixed'][style*='height: 100vh']");
        const btns = Array.from(document.querySelectorAll("button")).filter((b) => {
          if (sb && sb.contains(b)) return false;
          if (b.offsetParent === null) return false;
          const span = b.querySelector("span[style*='border-radius: 50%']");
          return !!span && /^[A-Z]{2}$/.test((span.innerText || "").trim());
        });
        if (!btns.length) return false;
        btns[btns.length - 1].click();
        return true;
      });
      await this.settle(200);
      return clicked && (await this.has("Sign Out"));
    },
    async signOut() {
      if (!(await this.has("Sign Out"))) await this.openUserMenu();
      const ok = await this.clickText("Sign Out", { exact: false });
      await this.settle(500);
      return ok;
    },

    // The collapse toggle in the sidebar head. At 1024 the app starts collapsed, so a case that
    // reads nav labels expands it first.
    async expandSidebar() {
      if (!(await this.sidebarCollapsed())) return true;
      await page.evaluate(() => {
        const sb = document.querySelector("div[style*='position: fixed'][style*='height: 100vh']");
        if (!sb) return;
        const b = sb.querySelector("button");
        if (b) b.click();
      });
      await this.settle(260);
      return !(await this.sidebarCollapsed());
    },

    // ---- clicking --------------------------------------------------------
    async clickText(label, opts) {
      const o = opts || {};
      const scope = o.inModal ? this.modal() : (o.anywhere ? page : this.contentBox());
      const exact = o.exact !== false;
      let loc = scope.getByRole("button", { name: label, exact: exact });
      if ((await loc.count()) === 0) loc = scope.locator("button", { hasText: label });
      if ((await loc.count()) === 0) loc = scope.getByText(label, { exact: exact });
      if ((await loc.count()) === 0 && !o.inModal && !o.anywhere) {
        // A window is outside the content area, so fall back to the whole page once.
        return this.clickText(label, Object.assign({}, o, { anywhere: true }));
      }
      if ((await loc.count()) === 0) return false;
      const n = o.nth || 0;
      if ((await loc.count()) <= n) return false;
      await loc.nth(n).click({ timeout: 8000 });
      await this.settle(o.settle);
      return true;
    },

    // Several screens show nothing until a person is picked. Playwright's own selectOption is used
    // rather than setting value by hand: React tracks a select's value, and assigning it directly is
    // reverted on the next render, which leaves the form looking filled and sending nothing.
    async pickOption(optionText, opts) {
      const o = opts || {};
      // When a window is open, its own pickers are the ones a person can reach. Without this the
      // page's filters behind the window get picked instead, and changing one of those re-renders the
      // window and drops what was already chosen in it.
      const useModal = o.inModal || (!o.anywhere && (await this.modalOpen()));
      const scope = useModal ? this.modal() : page;
      const selects = scope.locator("select");
      const n = await selects.count();
      for (let i = 0; i < n; i += 1) {
        const sel = selects.nth(i);
        if (!(await sel.isVisible().catch(() => false))) continue;
        const labels = await sel.locator("option").allTextContents();
        const hit = labels.findIndex((l) => l.trim() === optionText || l.trim().indexOf(optionText) >= 0);
        if (hit < 0) continue;
        try { await sel.selectOption({ label: labels[hit].trim() }); }
        catch (e) { try { await sel.selectOption({ index: hit }); } catch (e2) { continue; } }
        await this.settle(260);
        return true;
      }
      return false;
    },

    // The same thing, for a picker whose options carry a person's name.
    async pickPerson(nameFragment) {
      return this.pickOption(nameFragment);
    },

    // The Run button on a named report card in the library.
    async clickRunFor(reportName) {
      const clicked = await page.evaluate((name) => {
        const box = document.querySelector("div[style*='padding: 16px 24px 30px']") || document.body;
        const cards = Array.from(box.querySelectorAll("div")).filter((el) => {
          const txt = (el.innerText || "").trim();
          return txt.toLowerCase().indexOf(name.toLowerCase()) === 0 && txt.indexOf("Run") >= 0 && txt.length < 400;
        });
        const card = cards[cards.length - 1];
        if (!card) return false;
        const b = Array.from(card.querySelectorAll("button")).find((x) => (x.innerText || "").trim() === "Run");
        if (!b) return false;
        b.click();
        return true;
      }, reportName);
      await this.settle(450);
      return clicked;
    },

    // Whether a control by that name is on screen and live. A disabled button swallows a click and
    // times out, so a case asks first.
    async controlEnabled(label) {
      return page.evaluate((l) => {
        const b = Array.from(document.querySelectorAll("button")).find((x) => x.offsetParent !== null
          && (x.innerText || "").trim().toLowerCase().indexOf(String(l).toLowerCase()) >= 0);
        return !!b && !b.disabled;
      }, label);
    },

    // ---- the notification bell --------------------------------------------
    // The bell's own aria-label carries the unread count, which is what the badge shows.
    async bellCount() {
      return page.evaluate(() => {
        const b = Array.from(document.querySelectorAll("button")).find((x) => x.getAttribute("title") === "Notifications");
        if (!b) return null;
        const m = (b.getAttribute("aria-label") || "").match(/^(\d+) unread/);
        return m ? m[1] : "0";
      });
    },
    async openBell() {
      if (await this.has("Mark all read")) return true;
      const clicked = await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll("button")).find((x) => x.getAttribute("title") === "Notifications" && x.offsetParent !== null);
        if (!b) return false;
        b.click();
        return true;
      });
      await this.settle(400);
      return clicked && (await this.has("Mark all read"));
    },
    // Each notice in the panel is a button carrying its title.
    async tapNotice(title) {
      const clicked = await page.evaluate((t0) => {
        const panel = document.querySelector("div[role=dialog][aria-label=Notifications]");
        if (!panel) return false;
        const row = Array.from(panel.querySelectorAll("button")).find((b) => (b.innerText || "").indexOf(t0) >= 0);
        if (!row) return false;
        row.click();
        return true;
      }, title);
      await this.settle(600);
      return clicked;
    },

    // ---- the permissions editor -------------------------------------------
    // One capability row, read by the label the API sent for it.
    async capabilityRow(label) {
      return page.evaluate((lbl) => {
        const box = document.querySelector("div[style*='padding: 16px 24px 30px']") || document.body;
        const spans = Array.from(box.querySelectorAll("span")).filter((s0) => (s0.innerText || "").trim() === lbl);
        if (!spans.length) return null;
        let row = spans[0];
        while (row && !(row.querySelector("button") || (row.innerText || "").indexOf("Locked on") >= 0)) row = row.parentElement;
        if (!row) return null;
        const txt = (row.innerText || "");
        const buttons = Array.from(row.querySelectorAll("button")).map((b) => (b.innerText || "").trim());
        const currentlyLine = txt.split("\n").find((l) => l.indexOf("Currently:") === 0) || "";
        // The chosen state is the button whose background is filled rather than transparent.
        let state = "default";
        Array.from(row.querySelectorAll("button")).forEach((b) => {
          const st = b.getAttribute("style") || "";
          if (st.indexOf("background: transparent") < 0) {
            const t0 = (b.innerText || "").trim().toLowerCase();
            if (t0 === "allow" || t0 === "deny" || t0 === "default") state = t0;
          }
        });
        return { currently: currentlyLine, buttons, state, locked: txt.indexOf("Locked on") >= 0 };
      }, label);
    },

    async setCapability(label, which) {
      const done = await page.evaluate(([lbl, w]) => {
        const box = document.querySelector("div[style*='padding: 16px 24px 30px']") || document.body;
        const spans = Array.from(box.querySelectorAll("span")).filter((s0) => (s0.innerText || "").trim() === lbl);
        if (!spans.length) return false;
        let row = spans[0];
        while (row && !row.querySelector("button")) row = row.parentElement;
        if (!row) return false;
        const b = Array.from(row.querySelectorAll("button")).find((x) => (x.innerText || "").trim() === w);
        if (!b) return false;
        b.click();
        return true;
      }, [label, which]);
      await this.settle(200);
      return done;
    },
    // ---- windows ---------------------------------------------------------
    modal() {
      return page.locator("div[style*='z-index: 500']").last();
    },
    async modalOpen() {
      return (await page.locator("div[style*='z-index: 500']").count()) > 0;
    },
    async modalText() {
      if (!(await this.modalOpen())) return "";
      return (await this.modal().innerText()).replace(/ /g, " ");
    },
    async modalButtons() {
      if (!(await this.modalOpen())) return [];
      return this.modal().locator("button").evaluateAll((els) => els
        .filter((b) => b.offsetParent !== null)
        .map((b) => (b.innerText || b.getAttribute("aria-label") || "").trim())
        .filter(Boolean));
    },
    async modalFields() {
      if (!(await this.modalOpen())) return [];
      return this.modal().locator("input, textarea, select").evaluateAll((els) => els.map((e) => {
        const tag = e.tagName.toLowerCase();
        const label = e.getAttribute("aria-label") || e.getAttribute("placeholder") || "";
        return tag + (label ? ":" + label : "");
      }));
    },
    // Icon-only buttons inside the open window, which is how most windows carry their X.
    async modalIconButtons() {
      if (!(await this.modalOpen())) return 0;
      return this.modal().locator("button").evaluateAll((els) => els
        .filter((b) => b.offsetParent !== null && !(b.innerText || "").trim() && b.querySelector("svg"))
        .length);
    },

    // A button identified by its title attribute, which is how the list Actions columns mark theirs.
    async clickTitle(title) {
      const clicked = await page.evaluate((t0) => {
        const box = document.querySelector("div[style*='padding: 16px 24px 30px']") || document.body;
        const b = Array.from(box.querySelectorAll("button")).find((x) => x.getAttribute("title") === t0 && x.offsetParent !== null);
        if (!b) return false;
        b.click();
        return true;
      }, title);
      await this.settle();
      return clicked;
    },

    // One cell of a table, which reaches a row whose own click handler sits on the row.
    async clickCell(rowIndex, colIndex) {
      const cell = page.locator("table tbody tr").nth(rowIndex || 0).locator("td").nth(colIndex || 0);
      if ((await cell.count()) === 0) return false;
      await cell.click({ timeout: 8000 });
      await this.settle();
      return true;
    },

    // One cell of the Schedule week or month grid, found by the text inside it.
    async clickGridCell(pattern, notPattern) {
      const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      const clicked = await page.evaluate((src) => {
        const rx = new RegExp(src[0], src[1]);
        const box = document.querySelector("div[style*='padding: 16px 24px 30px']") || document.body;
        const cands = Array.from(box.querySelectorAll("div")).filter((el) => {
          if (el.offsetParent === null) return false;
          const txt = (el.innerText || "").trim();
          if (!rx.test(txt) || txt.length > 160) return false;
          if (src[2] && new RegExp(src[2]).test(txt)) return false;
          return (el.getAttribute("style") || "").indexOf("cursor: pointer") >= 0;
        });
        if (!cands.length) return false;
        cands[cands.length - 1].click();
        return true;
      }, [re.source, re.flags, notPattern ? (notPattern instanceof RegExp ? notPattern.source : notPattern) : ""]);
      await this.settle();
      return clicked;
    },

    // Fill a field in the open window by the label above it, which is steadier than a field index.
    async fillByLabel(label, value) {
      const filled = await page.evaluate(([lbl, val]) => {
        const box = document.querySelector("div[style*='z-index: 500']") || document.body;
        const fields = Array.from(box.querySelectorAll("input, textarea"));
        const norm = (s0) => String(s0 || "").replace(/[*\s]+/g, " ").trim().toLowerCase();
        for (const f of fields) {
          const wrap = f.closest("div");
          const text = norm(wrap ? wrap.innerText : "");
          const ph = norm(f.getAttribute("placeholder"));
          const al = norm(f.getAttribute("aria-label"));
          if (text.indexOf(norm(lbl)) === 0 || ph.indexOf(norm(lbl)) >= 0 || al.indexOf(norm(lbl)) >= 0) {
            const setter = Object.getOwnPropertyDescriptor(f.constructor.prototype, "value").set;
            setter.call(f, val);
            f.dispatchEvent(new Event("input", { bubbles: true }));
            return true;
          }
        }
        return false;
      }, [label, String(value)]);
      await this.settle(120);
      return filled;
    },

    // A toggle beside a label: a pill switch, a checkbox, or the small square the shift window uses
    // for Repeat. All three are a button or an input with no text of its own, in the same row as the
    // words. The smallest row holding those words is the one taken, so a toggle further up the window
    // is never hit by accident.
    async toggleSwitch(labelFragment) {
      const hit = await page.evaluate((frag) => {
        const root = document.querySelector("div[style*='z-index: 500']") || document.body;
        const want = String(frag).toLowerCase();
        const rows = Array.from(root.querySelectorAll("div")).filter((el) => {
          const txt = (el.innerText || "").trim().toLowerCase();
          if (txt.indexOf(want) < 0 || txt.length > 160) return false;
          return !!el.querySelector("button, input[type=checkbox]");
        });
        if (!rows.length) return false;
        rows.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);
        const control = Array.from(rows[0].querySelectorAll("button, input[type=checkbox]"))
          .find((c) => c.tagName === "INPUT" || !(c.innerText || "").trim());
        if (!control) return false;
        control.click();
        return true;
      }, labelFragment);
      await this.settle(260);
      return hit;
    },

    async closeModal() {
      if (!(await this.modalOpen())) return;
      const closed = await this.clickText("Close", { inModal: true }) || await this.clickText("Cancel", { inModal: true });
      if (!closed) await page.keyboard.press("Escape");
      await this.settle();
      if (await this.modalOpen()) {
        await page.locator("div[style*='z-index: 500']").last().click({ position: { x: 4, y: 4 } }).catch(() => {});
        await this.settle();
      }
    },

    // ---- tables ----------------------------------------------------------
    async tables() {
      return page.evaluate(() => Array.from(document.querySelectorAll("table"))
        .filter((t) => t.offsetParent !== null)
        .map((t) => ({
          headers: Array.from(t.querySelectorAll("thead th")).map((th) => th.innerText.trim()),
          rowCount: Array.from(t.querySelectorAll("tbody tr")).filter((r) => r.querySelectorAll("td").length > 1).length,
          firstRow: Array.from((t.querySelector("tbody tr") || { children: [] }).children || []).map((td) => (td.innerText || "").trim()),
          emptyText: (() => {
            const rows = Array.from(t.querySelectorAll("tbody tr"));
            if (rows.length !== 1) return null;
            const tds = rows[0].querySelectorAll("td");
            return tds.length === 1 ? tds[0].innerText.trim() : null;
          })(),
        })));
    },
    async tableAt(i) { return (await this.tables())[i || 0] || null; },
    async pagingLine() {
      return page.evaluate(() => {
        const el = Array.from(document.querySelectorAll("span")).find((s) => /^Showing \d+ to \d+ of \d+$/.test(s.innerText.trim()));
        return el ? el.innerText.trim() : null;
      });
    },
    async pageOfLine() {
      return page.evaluate(() => {
        const el = Array.from(document.querySelectorAll("span")).find((s) => /^Page \d+ \/ \d+$/.test(s.innerText.trim()));
        return el ? el.innerText.trim() : null;
      });
    },
    // The search box on a list screen. An empty value clears it.
    async typeSearch(value) {
      const typed = await page.evaluate((v) => {
        const box = document.querySelector("div[style*='padding: 16px 24px 30px']") || document.body;
        const inputs = Array.from(box.querySelectorAll("input")).filter((i) => i.offsetParent !== null
          && /search/i.test((i.getAttribute("placeholder") || "") + " " + (i.getAttribute("aria-label") || "")));
        if (!inputs.length) return false;
        const f = inputs[0];
        const setter = Object.getOwnPropertyDescriptor(f.constructor.prototype, "value").set;
        setter.call(f, v);
        f.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }, String(value));
      await this.settle(280);
      return typed;
    },

    async clickRow(i) {
      const rows = page.locator("table tbody tr");
      const n = await rows.count();
      if (n === 0) return false;
      await rows.nth(Math.min(i || 0, n - 1)).click({ timeout: 8000 });
      await this.settle();
      return true;
    },

    // ---- toasts ----------------------------------------------------------
    // Tst is a fixed div pinned top right at z-index 1000, and it clears itself after 3 seconds.
    // Tst is a fixed div pinned top right at z-index 1000, and it clears itself after 3 seconds.
    async toast() {
      return page.evaluate(() => {
        const el = Array.from(document.querySelectorAll("div")).reverse().find((x) => {
          const st = x.getAttribute("style") || "";
          return st.indexOf("position: fixed") >= 0 && st.indexOf("z-index: 1000") >= 0 && st.indexOf("top: 20px") >= 0 && x.innerText.trim();
        });
        return el ? el.innerText.trim() : null;
      });
    },
    async waitToastGone(ms) {
      const until = Date.now() + (ms || 3600);
      while (Date.now() < until) {
        if (!(await this.toast())) return true;
        await page.waitForTimeout(120);
      }
      return false;
    },

    async waitToast(ms) {
      const until = Date.now() + (ms || 2500);
      while (Date.now() < until) {
        const t = await this.toast();
        if (t) return t;
        await page.waitForTimeout(90);
      }
      return null;
    },

    // ---- exports ---------------------------------------------------------
    async downloads() {
      const list = await page.evaluate(() => window.__audit.downloads.slice());
      const out = [];
      for (const d0 of list) {
        const body = await page.evaluate(async (href) => {
          const p = window.__audit.blobs[href];
          return p ? await p : "";
        }, d0.href);
        out.push({ name: d0.name, body: body });
      }
      return out;
    },
    async prints() { return page.evaluate(() => window.__audit.prints.map((p) => ({ url: p.url, html: p.html, printed: p.printed }))); },
    async clearCaptures() {
      await page.evaluate(() => { window.__audit.prints.length = 0; window.__audit.downloads.length = 0; window.__audit.confirms.length = 0; window.__audit.alerts.length = 0; });
    },
    async setConfirmAnswer(v) { await page.evaluate((x) => { window.__audit.confirmAnswer = x; }, v); },
    async setPopupsBlocked(v) { await page.evaluate((x) => { window.__audit.popupsBlocked = x; }, v); },
    async confirms() { return page.evaluate(() => window.__audit.confirms.slice()); },

    // ---- request log -----------------------------------------------------
    lastCall(pathPart, method) {
      for (let i = stubs.calls.length - 1; i >= 0; i -= 1) {
        const c = stubs.calls[i];
        if (method && c.method !== method) continue;
        if (c.path.indexOf(pathPart) >= 0) return c;
      }
      return null;
    },
    callsSince(mark) { return stubs.calls.slice(mark); },
    mark() { return stubs.calls.length; },

    async screenshot(file) { await page.screenshot({ path: file, fullPage: false }); },
  };

  return d;
}

module.exports = { createDriver, VIEWPORTS, FIXED };
