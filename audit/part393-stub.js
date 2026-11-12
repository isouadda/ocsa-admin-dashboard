// What the API's Round 13 answers for the dashboard (ocsa-api part 384, #163, main 6c112ee), for the dashboard's
// part 393. audit/stubs.js lays it over the part389 stub and every layer under it, in every run, since the API's
// main answers it. Each route is answered the way the API's code at 6c112ee answers it, with the API's own words in
// English and Spanish (helpers/words.js):
//
//   Section 1, live uptime (routes/health.js, helpers/uptimeMonitors.js, helpers/healthPage.js incidentView):
//     GET /api/health/uptime              view_health (the layer under refuses anyone else first): { configured:
//                                         false } alone while UPTIMEROBOT_READ_KEY is unset, which is the stub's
//                                         server by default (part379's monitors_down is not measured for that
//                                         reason). The scene uptime sets the key: { configured, checkedAt, stale,
//                                         monitors, incidents }, six monitors (the staff app, the dashboard, the API,
//                                         the API's deep check, the scheduled jobs and Help), the jobs down since
//                                         25 minutes ago and Help paused, each with its uptime for 1, 7 and 30 days,
//                                         its last and average response and 48 half-hour means; the scene
//                                         uptimeStale answers the last read with stale true and the checkedAt of
//                                         20 minutes ago, uptimeFirst a server that has not read yet (checkedAt
//                                         null, stale true, empty lists), uptimeFails 500 for every read. Every
//                                         read is counted (uptimeReads).
//     GET /api/health/incidents           every incident carries source, monitor, reason and durationSeconds
//                                         (from opened to closed, null while open); under the scene uptime the two
//                                         outages are incidents of kind monitor and source uptimerobot, keyed
//                                         uptime:<id>, the jobs' still open and the API's 429 of a week ago closed
//                                         after 10 minutes 11 seconds
//     PATCH /api/health/incidents/:id     what fixed it on an outage, as on any incident
//     GET /api/health/summary, GET /api/health/numbers, GET /api/health/numbers/monitors_down/list
//                                         under the scene uptime, monitors_down is measured: 1 today, red at its line
//                                         of 1, every monitor of the read behind it ({ name, state, down }), and
//                                         the open outage is counted
//
//   Section 2, Copy for Claude:
//     GET /api/health                     { status: "healthy", timestamp, commit }, the commit an invented hex id; the
//                                         scene unhealthy answers 503 { status: "unhealthy", commit }
//
//   Section 3, what Round 13 gave the dashboard (part 384, section 4 and 5):
//     GET /api/signatures, /api/signatures/:id, POST /api/signatures/:id/record
//                                         requestedBy { id, name } on every request; the scene sender { id, name }
//                                         makes sr-3, the warning's request, sent by that person (the part379 layer's
//                                         record route reads the same row, so it lets that person record it)
//     GET /api/sites/s-2/checklist-record items[].shiftLabels and checks[].runLabel, answered by the part379 layer;
//                                         the scene lateCheck moves the First shift's restrooms check to 2:02 PM, made
//                                         in the First shift's run
//     GET /api/shift-sessions/by-site     isTest on every site; the schedule's rows (GET /api/schedule, /calendar,
//                                         /availability) and the reports' (issue timing, supply usage, hours,
//                                         chemical usage, task completion, labor) site_is_test beside site_name or
//                                         siteIsTest beside siteName; true for the site the scene testSite names,
//                                         which GET /api/reports/checklist-summary then leaves out, as the API leaves
//                                         the test site out of every report
//     GET /api/inspections/safety-walks?siteIds=a,b
//                                         { walks: { [siteId]: lastWalk | null } }; 400 inspections.badDetails keys
//                                         ["siteIds"], or ["siteId", "siteIds"] for both; 403 access.noSiteAccess
//                                         keys the sites the scene noWalkAccess names. Every lastWalk and
//                                         lastSafetyWalk names its inspection { id, templateName, scheduledDate } |
//                                         null, and ?siteId= answers openWalk (null)
//     GET /api/forms/responses?status=draft
//                                         counts: { draft } on every page; the scene draftCount stands for a server
//                                         holding more drafts than a page, and noDraftCount for an API before Round 13
//     GET /api/users/me/permissions       features: { clearances, discipline, workspace, library }; the scene
//                                         features overrides one, noFeatures leaves it out as an API before Round 13;
//                                         each is whether the stub's own list answers the person a list
//
// Every value is invented: the monitors' ids, their times, their reasons, the commit and the days.
"use strict";

module.exports = (ctx) => {
  const { seed, state, ok, clone, person } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const NOW = Date.parse(seed.NOW_ISO);
  const iso = (ms) => new Date(ms).toISOString();
  const MIN = 60000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  const uid = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
  const me = () => person();

  let model = null;
  const m = () => {
    if (!model) model = { scene: {}, sent: [], uptimeReads: 0, outages: null };
    return model;
  };
  const sent = (what, body) => { m().sent.push({ what, body: clone(body === undefined ? null : body) }); };

  // ---- Section 1: live uptime ---------------------------------------------------------------------------------
  const MONITORS = [
    { id: "804609601", name: "OCSA staff app", url: "https://staff.example.invalid/", type: "http", status: "up", since: NOW - 6 * DAY - 3 * HOUR, last: 184, avg: 201, d1: 100, d7: 100, d30: 99.993, base: 190 },
    { id: "804609602", name: "OCSA dashboard", url: "https://dashboard.example.invalid/", type: "http", status: "up", since: null, last: 96, avg: 104, d1: 100, d7: 100, d30: 100, base: 100 },
    { id: "804609603", name: "OCSA API", url: "https://api.example.invalid/api/health", type: "http", status: "up", since: NOW - 7 * DAY + 611000, last: 212, avg: 230, d1: 100, d7: 99.899, d30: 99.976, base: 220 },
    { id: "804609604", name: "OCSA API deep check", url: "https://api.example.invalid/api/health/deep", type: "keyword", status: "up", since: NOW - 12 * DAY, last: 388, avg: 402, d1: 100, d7: 100, d30: 99.981, base: 400 },
    { id: "804609605", name: "OCSA scheduled jobs", url: "https://api.example.invalid/api/health/jobs", type: "http", status: "down", since: NOW - 25 * MIN, last: 1210, avg: 260, d1: 98.264, d7: 99.752, d30: 99.942, base: 240 },
    { id: "804609606", name: "OCSA Help", url: "https://api.example.invalid/api/health/help", type: "http", status: "paused", since: NOW - 2 * DAY - 5 * HOUR, last: null, avg: null, d1: null, d7: null, d30: 99.711, base: 0 },
  ];
  // 48 half-hour means, oldest first, a fixed walk about each monitor's own level; a paused monitor has none, and the
  // jobs' last two halves climb as it went down.
  const timesOf = (x, at) => {
    if (!x.base) return [];
    const out = [];
    const last = Math.floor(at / (30 * MIN)) * 30 * MIN;
    for (let i = 47; i >= 0; i -= 1) {
      const wiggle = [0, 12, -8, 20, -15, 6, 30, -4, 9, -11][i % 10];
      let ms = x.base + wiggle;
      if (x.status === "down" && i <= 1) ms = i === 0 ? x.last : 780;
      out.push({ at: iso(last - i * 30 * MIN), ms });
    }
    return out;
  };
  // The outages UptimeRobot logged in the last 30 days, newest first: the jobs' down now, and the API's 429.
  const OUTAGES = [
    { id: "378553759093400111", monitorId: "804609605", monitorName: "OCSA scheduled jobs", startedAt: NOW - 25 * MIN, endedAt: null, reason: "503 Service Unavailable" },
    { id: "378553759093400099", monitorId: "804609603", monitorName: "OCSA API", startedAt: NOW - 7 * DAY, endedAt: NOW - 7 * DAY + 611000, reason: "429 Too Many Requests" },
  ];
  const secondsOf = (o, at) => Math.max(0, Math.round(((o.endedAt === null ? at : o.endedAt) - o.startedAt) / 1000));
  const uptimeOn = () => !!(m().scene.uptime || m().scene.uptimeStale || m().scene.uptimeFirst);
  function uptimeAnswer() {
    const sc = m().scene;
    if (!uptimeOn()) return { configured: false };
    if (sc.uptimeFirst) return { configured: true, checkedAt: null, stale: true, monitors: [], incidents: [] };
    const at = sc.uptimeStale ? NOW - 20 * MIN : NOW;
    return {
      configured: true,
      checkedAt: iso(at),
      stale: !!sc.uptimeStale,
      monitors: MONITORS.map((x) => ({
        id: x.id, name: x.name, url: x.url, type: x.type, status: x.status, since: x.since === null ? null : iso(x.since), intervalSeconds: 300,
        lastResponseMs: x.last, avgResponseMs24h: x.avg, uptime: { d1: x.d1, d7: x.d7, d30: x.d30 }, responseTimes24h: timesOf(x, at),
      })),
      incidents: OUTAGES.map((o) => ({ id: o.id, monitorId: o.monitorId, monitorName: o.monitorName, startedAt: iso(o.startedAt), endedAt: o.endedAt === null ? null : iso(o.endedAt), durationSeconds: secondsOf(o, at), reason: o.reason })),
    };
  }
  // Each outage as the Health incident helpers/uptimeMonitors.js records it (kind monitor, source uptimerobot).
  const outageIncidents = () => {
    if (!m().outages) {
      m().outages = OUTAGES.map((o, i) => {
        const sec = secondsOf(o, NOW);
        const len = Math.floor(sec / 60) + " minutes " + (sec % 60) + " seconds";
        const timeline = [{ at: iso(o.startedAt), text: o.monitorName + " down: " + o.reason }];
        if (o.endedAt !== null) timeline.push({ at: iso(o.endedAt), text: o.monitorName + " back up after " + len });
        return { id: uid(711 + i), kind: "monitor", key: "uptime:" + o.id, title: o.monitorName, openedAt: iso(o.startedAt), closedAt: o.endedAt === null ? null : iso(o.endedAt),
          resolution: null, resolvedBy: null, timeline, source: "uptimerobot", monitor: { id: o.monitorId, name: o.monitorName }, reason: o.reason, durationSeconds: sec };
      });
    }
    return m().outages;
  };
  // helpers/healthPage.js incidentView: every other incident's source health, no monitor or reason, and its length
  // from opened to closed.
  const asView = (x) => {
    if (x && x.source === "uptimerobot") return x;
    const sec = x && x.closedAt ? Math.max(0, Math.round((Date.parse(x.closedAt) - Date.parse(x.openedAt)) / 1000)) : null;
    return Object.assign({}, x, { source: "health", monitor: null, reason: null, durationSeconds: sec });
  };
  const newestFirst = (a, b) => (a.openedAt < b.openedAt ? 1 : a.openedAt > b.openedAt ? -1 : 0);
  const MONITORS_DOWN = "monitors_down";
  function withMonitorsDown(a) {
    if (!uptimeOn() || m().scene.uptimeFirst || !a || a.status !== 200 || !a.json || !Array.isArray(a.json.numbers)) return a;
    const down = MONITORS.filter((x) => x.status === "down").length;
    a.json = Object.assign({}, a.json, { numbers: a.json.numbers.map((n) => {
      if (!n || n.key !== MONITORS_DOWN) return n;
      const state = (v) => (v === null ? "unknown" : n.lines && n.lines.red !== null && v >= n.lines.red ? "red" : n.lines && n.lines.yellow !== null && v >= n.lines.yellow ? "yellow" : "green");
      const history = (n.history || []).map((h, i, all) => {
        const back = all.length - 1 - i;
        const v = back === 0 ? down : back === 7 ? 1 : 0;
        return Object.assign({}, h, { value: v, state: state(v) });
      });
      return Object.assign({}, n, { value: down, state: state(down), computedAt: n.computedAt || seed.NOW_ISO, previous: 0, weekAverage: 0.1, history });
    }) });
    return a;
  }

  function healthRoute(method, path, query, body, lang, base) {
    if (path === "/api/health/uptime" && method === "GET") {
      const a = base();
      // The layer under refuses anyone without view_health, and has no rule of its own for the route.
      if (a && a.status === 403) return a;
      m().uptimeReads += 1;
      sent("uptime", null);
      if (m().scene.uptimeFails) return bad(500, "server.error", T(lang, "Something went wrong on our side. Try again in a moment.", "Algo sali\u00f3 mal de nuestro lado. Int\u00e9ntelo de nuevo en un momento."));
      return ok(uptimeAnswer());
    }
    if (path === "/api/health/incidents" && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.incidents)) return a;
      const open = query.get("open") === "true";
      const outages = uptimeOn() && !m().scene.uptimeFirst ? outageIncidents().filter((x) => !open || !x.closedAt) : [];
      a.json = Object.assign({}, a.json, { incidents: a.json.incidents.map(asView).concat(clone(outages)).sort(newestFirst) });
      return a;
    }
    const im = /^\/api\/health\/incidents\/([^/]+)$/.exec(path);
    if (im && method === "PATCH") {
      const x = uptimeOn() ? outageIncidents().find((i) => i.id === decodeURIComponent(im[1])) : null;
      if (!x) { const a = base(); if (a && a.status === 200 && a.json && a.json.incident) a.json = Object.assign({}, a.json, { incident: asView(a.json.incident) }); return a; }
      const a = base();
      if (a && a.status === 403) return a;
      sent("incident", body);
      const b = body && typeof body === "object" ? body : {};
      const text = typeof b.resolution === "string" ? b.resolution.replace(/\s+/g, " ").trim() : "";
      const stray = Object.keys(b).filter((k) => k !== "resolution");
      if (!text || text.length > 1000 || stray.length) return bad(400, "health.badDetails", T(lang, "Some details are missing or not valid. Check the fields named and send it again.", "Faltan algunos datos o no son v\u00e1lidos. Revise los campos indicados y env\u00edelo de nuevo."), { keys: stray.length ? stray : ["resolution"] });
      x.resolution = text; x.resolvedBy = me().id;
      x.timeline = x.timeline.concat([{ at: seed.NOW_ISO, text: "What fixed it was written" }]);
      return ok({ incident: clone(x) });
    }
    if (path === "/api/health/summary" && method === "GET") {
      const a = base();
      if (!uptimeOn() || m().scene.uptimeFirst || !a || a.status !== 200 || !a.json) return a;
      const c = Object.assign({}, a.json.counts || {});
      if (c.unknown > 0) { c.unknown -= 1; c.red = (c.red || 0) + 1; }
      const worst = ["red", "yellow", "unknown", "green"].find((s) => c[s] > 0) || "unknown";
      a.json = Object.assign({}, a.json, { counts: c, state: worst, openIncidents: (a.json.openIncidents || 0) + outageIncidents().filter((x) => !x.closedAt).length });
      return a;
    }
    if ((path === "/api/health/numbers" && method === "GET") || (path === "/api/health/numbers/refresh" && method === "POST")) return withMonitorsDown(base());
    if (path === "/api/health/numbers/" + MONITORS_DOWN + "/list" && method === "GET") {
      const a = base();
      if (!uptimeOn() || m().scene.uptimeFirst || !a || a.status !== 200 || !a.json) return a;
      // helpers/healthNumbers.js monitors_down list: every monitor of the kept read, { name, state, down }.
      a.json = Object.assign({}, a.json, { items: MONITORS.map((x) => ({ name: x.name, state: x.status, down: x.status === "down" })) });
      return a;
    }
    return null;
  }

  // ---- Section 2: Copy for Claude ---------------------------------------------------------------------------------
  // GET /api/health (server.js, part 384 5.8): the deployed commit beside the status, healthy or not, no sign-in.
  const COMMIT = "c0ffee5eed0123456789abcdef0123456789abcd";

  // ---- Section 3: what Round 13 gave the dashboard ----------------------------------------------------------------
  const sc = () => m().scene;
  // A route the layers under answer for one query, read again with the query changed and put back after: the same
  // URLSearchParams every layer reads, so a change here is seen there.
  const withQuery = (query, set, fn) => {
    const was = Array.from(query.entries());
    Object.keys(set).forEach((k) => { if (set[k] === null) query.delete(k); else query.set(k, set[k]); });
    try { return fn(); } finally { Array.from(query.keys()).forEach((k) => query.delete(k)); was.forEach(([k, v]) => query.append(k, v)); }
  };
  // 4.1: requestedBy { id, name } on every request view (helpers/signatureRequests.js requestView). The scene sender
  // { id, name } makes the warning's request sr-3 the one that person sent: sentBySupervisor is the supervisor, and
  // namesake an admin who carries the supervisor's name.
  function withSender(a) {
    if (!a || a.status >= 300 || !a.json || typeof a.json !== "object") return a;
    const rows = state.requests270 || [];
    const fix = (r) => {
      if (!r || typeof r !== "object" || !r.requestedBy || typeof r.requestedBy !== "object") return r;
      const row = rows.find((x) => x.id === r.id);
      const by = sc().sender && r.id === "sr-3" ? sc().sender : null;
      return Object.assign({}, r, { requestedBy: { id: by ? by.id : row && row.requestedById ? String(row.requestedById) : null, name: by && by.name ? by.name : r.requestedBy.name } });
    };
    const j = Object.assign({}, a.json);
    if (Array.isArray(j.requests)) j.requests = j.requests.map(fix);
    if (j.request) j.request = fix(j.request);
    a.json = j;
    return a;
  }
  function signaturesRoute(method, path, query, body, lang, base) {
    if (sc().sender && state.requests270) { const r = state.requests270.find((x) => x.id === "sr-3"); if (r) r.requestedById = sc().sender.id; }
    const a = base();
    if (sc().sender && state.requests270) { const r = state.requests270.find((x) => x.id === "sr-3"); if (r) r.requestedById = sc().sender.id; }
    return withSender(a);
  }
  // 4.2: the scene lateCheck moves the First shift's check of Restock the restrooms (t379-3) to 2:02 PM, after the
  // First shift's window closed and inside the Second's, still made in the First shift's run (runLabel First), as a
  // person who stayed on past the hour checks it; the run's count is the API's, by the run.
  function lateCheck(a, lang) {
    if (!sc().lateCheck || !a || a.status !== 200 || !a.json || !Array.isArray(a.json.days)) return a;
    const late = new Date(Date.parse(seed.TODAY + "T14:02:00-04:00")).toISOString();
    a.json = clone(a.json);
    a.json.days.forEach((d) => {
      if (d.date !== seed.TODAY) return;
      (d.items || []).forEach((i) => {
        if (i.taskId !== "t379-3" || !Array.isArray(i.checks) || !i.checks.length) return;
        i.checks[0] = Object.assign({}, i.checks[0], { completedAt: late, runLabel: "First" });
        i.completedAt = late;
      });
    });
    return a;
  }
  // 4.4: the test site named. The scene testSite names it (the part379 scene testSite marks the same site on GET
  // /api/sites); the board answers isTest beside siteId on every site, and the schedule's and the reports' rows
  // site_is_test beside site_name, or siteIsTest beside siteName.
  const BOARD = "/api/shift-sessions/by-site";
  const NAMED = [BOARD, "/api/schedule", "/api/schedule/calendar", "/api/schedule/availability", "/api/report-engine/issue-timing", "/api/report-engine/supply-usage",
    "/api/reports/hours", "/api/reports/chemical-usage", "/api/reports/task-completion", "/api/labor/by-site", "/api/labor/per-shift"];
  const isTestSite = (id) => !!sc().testSite && id !== undefined && id !== null && String(id) === String(sc().testSite);
  function withTestSite(path, a) {
    if (!a || a.status !== 200 || !a.json || typeof a.json !== "object") return a;
    const walk = (x) => {
      if (Array.isArray(x)) return x.map(walk);
      if (!x || typeof x !== "object") return x;
      const o = {};
      Object.keys(x).forEach((k) => { o[k] = walk(x[k]); });
      if (Object.prototype.hasOwnProperty.call(x, "site_name") && !Object.prototype.hasOwnProperty.call(x, "site_is_test")) o.site_is_test = isTestSite(x.site_id);
      if (Object.prototype.hasOwnProperty.call(x, "siteName")) {
        if (path === BOARD) { if (!Object.prototype.hasOwnProperty.call(x, "isTest")) o.isTest = isTestSite(x.siteId); }
        else if (!Object.prototype.hasOwnProperty.call(x, "siteIsTest")) o.siteIsTest = isTestSite(x.siteId);
      }
      return o;
    };
    a.json = walk(a.json);
    return a;
  }
  // 5.2 and 5.4: a walk names its inspection, inspection { id, templateName, scheduledDate } | null, null for a walk
  // filed on its own; ?siteId= answers openWalk beside it (null here, no inspection being open that carries one);
  // ?siteIds=a,b answers { walks } in one read, each id one the stub holds (the API's are uuids), 1 to 100 of them;
  // 400 inspections.badDetails keys ["siteIds"] for a bad list and ["siteId", "siteIds"] for both; 403
  // access.noSiteAccess with keys naming the sites the scene noWalkAccess refuses.
  const INSP_WORDS = {
    "inspections.badDetails": ["Some details are missing or not valid.", "Faltan algunos datos o no son v\u00e1lidos."],
    "access.noSiteAccess": ["You do not have access to this site", "No tiene acceso a este sitio"],
  };
  const inspRefuse = (lang, status, code, extra) => bad(status, code, T(lang, INSP_WORDS[code][0], INSP_WORDS[code][1]), extra);
  const inspectionOf = (w) => {
    if (!w || typeof w !== "object") return w;
    const id = w.scheduledInspectionId || null;
    const row = id ? (seed.INSPECTION_SCORES || []).find((x) => x.id === id) : null;
    return Object.assign({}, w, { inspection: id ? { id, templateName: row ? row.template_name : null, scheduledDate: row ? row.scheduled_date : null } : null });
  };
  function walksRoute(method, path, query, body, lang, base) {
    if (path === "/api/inspections/safety-walks" && method === "GET") {
      if (query.get("siteIds") !== null) {
        sent("walks", { siteIds: query.get("siteIds"), siteId: query.get("siteId") });
        if (query.get("siteId") !== null) return inspRefuse(lang, 400, "inspections.badDetails", { keys: ["siteId", "siteIds"] });
        const ids = Array.from(new Set(String(query.get("siteIds")).split(",").map((x) => x.trim()).filter(Boolean)));
        if (!ids.length || ids.length > 100 || !ids.every((x) => seed.SITES.some((y) => y.id === x))) return inspRefuse(lang, 400, "inspections.badDetails", { keys: ["siteIds"] });
        const refused = ids.filter((x) => (sc().noWalkAccess || []).indexOf(x) >= 0);
        if (refused.length) return inspRefuse(lang, 403, "access.noSiteAccess", { keys: refused });
        const walks = {};
        ids.forEach((id) => { const one = withQuery(query, { siteIds: null, siteId: id }, () => base()); walks[id] = one && one.status === 200 && one.json ? inspectionOf(one.json.lastWalk) || null : null; });
        return ok({ walks });
      }
      const a = base();
      if (a && a.status === 200 && a.json && typeof a.json === "object") a.json = Object.assign({}, a.json, { lastWalk: inspectionOf(a.json.lastWalk) || null, openWalk: null });
      return a;
    }
    if (/^\/api\/inspections\/scheduled\/[^/]+$/.test(path) && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && typeof a.json === "object" && Object.prototype.hasOwnProperty.call(a.json, "lastSafetyWalk")) a.json = Object.assign({}, a.json, { lastSafetyWalk: inspectionOf(a.json.lastSafetyWalk) || null });
      return a;
    }
    return null;
  }
  // 5.6: counts: { draft } on GET /api/forms/responses?status=draft, every unfinished filing under the same formCode
  // and siteId whatever the page (limit and before left out); the scene draftCount stands for a server holding that
  // many, more than a page.
  function draftsRoute(method, path, query, body, lang, base) {
    if (path !== "/api/forms/responses" || method !== "GET" || query.get("status") !== "draft" || sc().noDraftCount) return null;
    const a = base();
    if (!a || a.status !== 200 || !a.json || typeof a.json !== "object" || !Array.isArray(a.json.responses)) return a;
    const all = withQuery(query, { limit: null, before: null }, () => base());
    const n = sc().draftCount !== undefined ? sc().draftCount : all && all.json && Array.isArray(all.json.responses) ? all.json.responses.length : a.json.responses.length;
    a.json = Object.assign({}, a.json, { counts: { draft: n } });
    return a;
  }
  // 5.7: features { clearances, discipline, workspace, library } on GET /api/users/me/permissions, each the rule its own
  // router reads: management for clearances and warnings (here an admin or a supervisor), the office for the
  // workspace, and a reader of the Library (every office account here). The scene noFeatures answers as an API
  // before Round 13 (no features).
  // The stub's own rule for each is whether its list answers that person a list, read through every layer the way a
  // call is (a refusal a case sets included) and kept out of the run's calls (audit/stubs.js quietGet).
  let probe = null;
  const lists = (path, lang, shape) => { const a = probe ? probe(path, lang) : null; return !!a && a.status === 200 && !!a.json && shape(a.json); };
  function featuresRoute(method, path, query, body, lang, base) {
    if (path !== "/api/users/me/permissions" || method !== "GET") return null;
    const a = base();
    if (sc().noFeatures || !a || a.status !== 200 || !a.json || typeof a.json !== "object") return a;
    const f = Object.assign({
      clearances: lists("/api/clearances", lang, (j) => Array.isArray(j.people)),
      discipline: lists("/api/discipline", lang, (j) => Array.isArray(j.warnings) && !!j.counts),
      workspace: lists("/api/workspace/projects", lang, (j) => !Array.isArray(j) && Array.isArray(j.projects)),
      library: lists("/api/library", lang, (j) => Array.isArray(j.documents)),
    }, sc().features || {});
    a.json = Object.assign({}, a.json, { features: f });
    return a;
  }

  function route(method, path, query, body, lang, base) {
    if (/^\/api\/signatures(\/|$)/.test(path)) return signaturesRoute(method, path, query, body, lang, base);
    if (/^\/api\/sites\/[^/]+\/checklist-record$/.test(path) && method === "GET") return lateCheck(base(), lang);
    if (NAMED.indexOf(path) >= 0 && method === "GET") return withTestSite(path, base());
    // The checklist summary leaves the test site out, as every report does (routes/reports.js, is_test).
    if (path === "/api/reports/checklist-summary" && method === "GET" && sc().testSite) {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.sites)) a.json = Object.assign({}, a.json, { sites: a.json.sites.filter((x) => !isTestSite(x.siteId)) });
      return a;
    }
    if (/^\/api\/inspections\/(safety-walks|scheduled\/)/.test(path)) { const r = walksRoute(method, path, query, body, lang, base); if (r) return r; }
    { const r = draftsRoute(method, path, query, body, lang, base); if (r) return r; }
    { const r = featuresRoute(method, path, query, body, lang, base); if (r) return r; }
    if (path === "/api/health" && method === "GET") {
      sent("health", null);
      return m().scene.unhealthy ? { status: 503, json: { status: "unhealthy", commit: COMMIT } } : ok({ status: "healthy", timestamp: seed.NOW_ISO, commit: COMMIT });
    }
    if (/^\/api\/health\//.test(path)) { const r = healthRoute(method, path, query, body, lang, base); if (r) return r; }
    return base();
  }

  return {
    route,
    setScene: (o) => { Object.assign(m().scene, o || {}); },
    setProbe: (fn) => { probe = fn; },
    sent: () => m().sent,
    model: () => m(),
    reset: () => { model = null; },
  };
};
