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
// Every value is invented: the monitors' ids, their times, their reasons, the commit and the days.
"use strict";

module.exports = (ctx) => {
  const { seed, ok, clone, person } = ctx;
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

  function route(method, path, query, body, lang, base) {
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
    sent: () => m().sent,
    model: () => m(),
    reset: () => { model = null; },
  };
};
