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

async function createDriver({ browser, origin, stubs, viewport }) {
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewport] || VIEWPORTS.wide,
    timezoneId: seed.TIMEZONE,
    locale: "en-US",
    colorScheme: "dark",
    acceptDownloads: true,
  });
  await context.clock.install({ time: FIXED });
  await context.clock.setFixedTime(FIXED);
  await context.addInitScript(INIT);

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

    async close() { await context.close(); },

    // ---- session ---------------------------------------------------------
    async signIn(personaKey) {
      const who = seed.PEOPLE[personaKey];
      await page.goto(origin + "/#overview", { waitUntil: "domcontentloaded" });
      await page.waitForSelector("text=Admin Dashboard", { timeout: 15000 });
      const inputs = page.locator("input");
      await inputs.nth(0).fill(who.login.phone);
      await inputs.nth(1).fill(who.login.pin);
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForSelector("text=Welcome back", { timeout: 15000 });
      await this.settle();
    },

    async signOutHard() {
      await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    },

    // ---- navigation ------------------------------------------------------
    async goto(pageId, sub) {
      const hash = "#" + [pageId].concat(sub ? [].concat(sub) : []).join("/");
      await page.evaluate((h) => { window.location.hash = h; }, hash);
      await this.settle();
    },

    async settle(extraMs) {
      await page.waitForTimeout(extraMs == null ? 220 : extraMs);
      try { await page.waitForLoadState("networkidle", { timeout: 4000 }); } catch (e) { /* the app polls, so idle can never come */ }
      await page.waitForTimeout(80);
    },

    // ---- reading the screen ---------------------------------------------
    async text() {
      return (await page.locator("body").innerText()).replace(/ /g, " ");
    },
    async has(s) { return (await this.text()).indexOf(s) >= 0; },
    async absent(s) { return (await this.text()).indexOf(s) < 0; },

    async headerTitle() {
      try { return (await page.locator("h1, [data-page-title]").first().innerText()).trim(); } catch (e) { return ""; }
    },

    // The content area under the page header, which is what a gated page empties out.
    async bodyLength() {
      return page.evaluate(() => {
        const main = document.querySelector("main") || document.body;
        return main.innerText.replace(/\s+/g, " ").trim().length;
      });
    },

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
          .map((b) => (b.innerText || "").trim())
          .filter(Boolean);
      });
    },

    // ---- clicking --------------------------------------------------------
    async clickText(label, opts) {
      const o = opts || {};
      const scope = o.inModal ? this.modal() : page;
      const exact = o.exact !== false;
      let loc = scope.getByRole("button", { name: label, exact: exact });
      if ((await loc.count()) === 0) loc = scope.locator("button", { hasText: label });
      if ((await loc.count()) === 0) loc = scope.getByText(label, { exact: exact });
      if ((await loc.count()) === 0) return false;
      await loc.first().click({ timeout: 8000 });
      await this.settle(o.settle);
      return true;
    },

    async clickNav(label) {
      const ok = await this.clickText(label, { exact: false });
      return ok;
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
