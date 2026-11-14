// What the API's Round 14 answers for the dashboard (ocsa-api part 391, #164, main ff35991), for the dashboard's
// part 397, with the robot's Round 3 finding on Checklist Results. audit/stubs.js lays it over the part393 stub and
// every layer under it, in every run, since the API's main answers it. Each route is answered the way the API's code
// at ff35991 answers it, with the API's own words in English and Spanish (helpers/words.js):
//
//   Section 1, a week of zeros (the robot's Round 3): the scene zeroWeek names a site whose days had steps due and
//   none done, as a real site with a full week of nothing checked answers:
//     GET /api/reports/checklist-summary  that site's days: due 6, done 0, checks 0, counted { due: 6, done: 0 }, so
//                                         every day's percent is 0
//     GET /api/sites/:id/checklist-record that site's days with every item as listed and none done or checked
//
//   Section 2, the API's brief (routes/health.js, helpers/healthBrief.js):
//     GET /api/health/incidents/:id/brief view_health (the layer under refuses anyone else first);
//                                         text/plain; charset=utf-8, Cache-Control private, no-store; the
//                                         incident's brief as briefOf writes it: OCSA Health brief, the incident
//                                         and its timeline on the New York clock, a number's name, how it is
//                                         worked out, its lines, today and the 7 days before, the rows behind it
//                                         (SAFE keys only, people as how many), an outage's monitor, reason and
//                                         length, a run-through's last runs and its failed steps, the API's commit
//                                         and when it was made, ASCII and at most 6,000 characters; 404
//                                         health.incidentNotFound (JSON) for an id that is not an incident's. The
//                                         scene noBrief answers as an API before Round 14 (404, no such route),
//                                         and briefFails 500. Every brief served is kept (briefs).
//     GET /api/health/runs/:id            every step carries reason (part 384), null but on a skipped step; the
//                                         failed run's skipped journey holds its skipped step with the robot's
//                                         reason
//
//   Section 3, findings without the inspection (routes/findings.js, helpers/inspectionFindings.js):
//     GET /api/inspections/findings       followUpTopics beside findings, and counts: { needsFollowUp, open,
//                                         overdue } over every unresolved finding the caller may list, whatever
//                                         the filters (countsOf); each finding its title (the issue's own),
//                                         owners (ownersFor, each with its group) and canDecide (mayDecide: an
//                                         admin, or a supervisor assigned at the site, the site's supervisor_id
//                                         here)
//     GET /api/inspections/findings/:id   { finding, followUpTopics }, the finding as above
//     POST /api/inspections/findings/:id/follow-up, /conversation
//                                         403 access.insufficientPermissions for a caller who may not decide it
//                                         (mayDecide by its site); the finding answered as above
//     GET /api/inspections/scheduled/:id  findings[].followUp carries topic: { id, name } | null beside topicId
//     GET /api/forms/responses/fr-ca-1    linkedIssues[].followUp the same
//     GET /api/inspections/analytics/export
//                                         each row finding_follow_up_topic, the training topic's name or null
//
//   Section 4, the test site and a supervisor (helpers/testCrew.js usesTestSites, helpers/testGuard.js keepOff):
//   the scene testSite names the test site. A test account and an admin (the admin role or the super admin) use it;
//   anyone else:
//     GET /api/sites, GET /api/leave/sites
//                                         reads it left out (testSitesFor); every other read is answered as it is
//     a write that names it, by its path (/sites/:id/...), its body (siteId, site_id, siteIds), an issue it acts
//     on (/issues/:id/...) or a scheduled shift (/schedule/:id)
//                                         403 { error, code: "testCrew.testSite", testSite: true }, nothing
//                                         written (testSiteRefused counts them)
//
// Every value is invented: the commit, the days, the reasons and the people's words.
"use strict";

module.exports = (ctx) => {
  const { seed, state, ok, clone, person } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const me = () => person();
  const S = seed.SITES;

  let model = null;
  const m = () => {
    if (!model) model = { scene: {}, sent: [], briefs: [], testSiteRefused: 0 };
    return model;
  };
  const sc = () => m().scene;
  const sent = (what, body) => { m().sent.push({ what, body: clone(body === undefined ? null : body) }); };
  let probe = null;
  const read = (path, lang) => { const a = probe ? probe(path, lang || "en") : null; return a && a.status === 200 ? a.json : null; };
  // A route the layers under answer for one query, read again with the query changed and put back after.
  const withQuery = (query, set, fn) => {
    const was = Array.from(query.entries());
    Object.keys(set).forEach((k) => { if (set[k] === null) query.delete(k); else query.set(k, set[k]); });
    try { return fn(); } finally { Array.from(query.keys()).forEach((k) => query.delete(k)); was.forEach(([k, v]) => query.append(k, v)); }
  };

  // ---- Section 1: a week of zeros ------------------------------------------------------------------------------
  function zeroRoute(method, path, query, body, lang, base) {
    const site = sc().zeroWeek ? String(sc().zeroWeek) : "";
    if (!site || method !== "GET") return null;
    if (path === "/api/reports/checklist-summary") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.sites)) {
        a.json = Object.assign({}, a.json, { sites: a.json.sites.map((x) => (String(x.siteId) !== site ? x : Object.assign({}, x, { notTracked: false, days: (x.days || []).map((d) => ({ date: d.date, due: 6, done: 0, checks: 0, counted: { due: 6, done: 0 }, shifts: [] })) }))) });
      }
      return a;
    }
    if (path === "/api/sites/" + site + "/checklist-record") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.days)) {
        a.json = Object.assign({}, a.json, { days: a.json.days.map((d) => {
          const items = (d.items || []).map((i) => Object.assign({}, i, { done: false, checks: [], completedAt: null, completedBy: null, doneAt: null, doneBy: null, notes: null }));
          return Object.assign({}, d, { items, checks: [], counted: { due: items.filter((i) => i.due).length, done: 0 } });
        }) });
      }
      return a;
    }
    return null;
  }

  // ---- Section 2: the API's brief ---------------------------------------------------------------------------------
  const COMMIT = "c0ffee5eed0123456789abcdef0123456789abcd";
  const MAX_CHARS = 6000;
  const ROWS_MAX = 25;
  // helpers/healthBrief.js HOW, for the numbers the stub answers.
  const HOW = {
    app_open_ms: "The median time the robot's run-throughs took to open the staff app that day (health_runs.app_open_ms).",
    server_errors: "Every answer of 500 or more the API gave that day, summed from route_timings across every route.",
    slowest_p95_ms: "The highest 95th percentile answer time of any route that day, counting only routes that served at least the floor of requests (route_timings).",
    failed_sign_ins: "Sign-in tries that failed that day (login_attempts), test accounts left out.",
    check_offs: "Checklist items checked off that day and not unchecked (task_completions), test sites and accounts left out. Judged against the average of the 7 days before.",
    shifts_started: "Shifts started that day (site_sessions), test sites and accounts left out. Judged against the average of the 7 days before.",
    training_waiting: "People with a lesson acknowledged and waiting on a trainer's sign-off now.",
    push_failed: "Phone pushes that failed that day (health_counters push_failed).",
    never_signed_in: "Active people who have never signed in.",
    no_email: "Active people with no email the API can deliver to.",
    runs_failed: "Journeys that failed in the robot's nightly run for that day. A night with no run reads red once the robot has reported once.",
    monitors_down: "Uptime monitors that read down in the latest kept read from UptimeRobot.",
  };
  const SAFE = new Set(["method", "route", "errors", "requests", "p50", "p95", "runId", "trigger", "startedAt", "appOpenMs", "siteId", "checkOffs", "shiftsStarted", "sessionId", "endedAt",
    "attemptId", "topic", "waitingSince", "tries", "maxTries", "fails", "warningId", "type", "draftedAt", "requestId", "kind", "requestedAt", "reminders", "finalMail",
    "purpose", "failed", "lastAt", "hour", "sent", "role", "office", "createdAt", "matchedNobody", "journey", "outcome", "durationMs", "deviceId", "device", "endsAt", "endDay", "daysLeft",
    "state", "down", "monitor"]);
  const PERSON = ["userId", "name", "account", "draftedBy"];
  const ascii = (text) => String(text === undefined || text === null ? "" : text).normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[‐-―−]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, "\"").replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "?");
  const NY = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short" });
  const nyTime = (at) => {
    if (!at) return "none";
    const d = new Date(at);
    if (isNaN(d.getTime())) return "none";
    const p = {};
    NY.formatToParts(d).forEach((x) => { p[x.type] = x.value; });
    return p.year + "-" + p.month + "-" + p.day + " " + p.hour + ":" + p.minute + " " + (p.timeZoneName || "ET") + " (New York)";
  };
  const lineOf = (value, kind) => (value === null || value === undefined ? null : kind === "belowShare" ? "under " + Math.round(Number(value) * 100) + " percent of the 7 days' average" : kind === "below" ? "at " + value + " or fewer" : "at " + value + " or more");
  const linesWords = (t) => {
    const red = lineOf(t.red, t.kind), yellow = lineOf(t.yellow, t.kind);
    return "Red " + (red || "never") + "; yellow " + (yellow || "never") + " (" + t.kind + ")." + (t.minRequests ? " Floor: a route counts from " + t.minRequests + " requests in the day." : "");
  };
  const valueWords = (v) => { if (v === null || v === undefined) return "none"; const n = Number(v); return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100); };
  const cell = (v) => (v === null || v === undefined ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v));
  const lastedWords = (seconds) => {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    const h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60), r = s % 60;
    const part = (n, one) => n + " " + one + (n === 1 ? "" : "s");
    const out = [];
    if (h) out.push(part(h, "hour"));
    if (mi) out.push(part(mi, "minute"));
    if (r || out.length === 0) out.push(part(r, "second"));
    return out.join(" ");
  };
  function safeRows(key, rows) {
    const list = Array.isArray(rows) ? rows : [];
    const aboutPeople = key !== "monitors_down" && list.some((r) => r && PERSON.some((k) => r[k] !== undefined && r[k] !== null));
    let people = null;
    if (aboutPeople) {
      const ids = new Set(list.map((r) => (r && r.userId ? String(r.userId) : null)).filter(Boolean));
      people = ids.size > 0 ? ids.size + list.filter((r) => r && !r.userId).length : list.length;
    }
    const lines = list.map((r) => {
      const row = key === "monitors_down" && r && r.name !== undefined ? Object.assign({ monitor: r.name }, r) : r;
      const pairs = Object.keys(row || {}).filter((k) => SAFE.has(k)).map((k) => k + "=" + cell(row[k]));
      return pairs.length ? "- " + pairs.join(", ") : null;
    }).filter(Boolean);
    return { lines, people, total: list.length };
  }
  function numberPart(x) {
    const nums = read("/api/health/numbers");
    const n = nums && Array.isArray(nums.numbers) ? nums.numbers.find((y) => y && y.key === x.key) : null;
    if (!n) return { head: ["Number: " + x.key + " (no longer one of the API's numbers)"], rows: [], more: 0 };
    const day = nums.day || seed.TODAY;
    const th = read("/api/health/thresholds");
    const row = th && Array.isArray(th.thresholds) ? th.thresholds.find((y) => y && y.key === x.key) : null;
    const lines = Object.assign({ kind: "above" }, n.lines || {}, row && row.minRequests ? { minRequests: row.minRequests } : {});
    const head = ["Number: " + (n.label || x.key) + " (" + x.key + "), " + n.unit, "How it is worked out: " + (HOW[x.key] || "See helpers/healthNumbers.js."), "Lines: " + linesWords(lines),
      "Today (" + day + ", so far): " + valueWords(n.value) + ", " + (n.state || "unknown")];
    const before = (n.history || []).filter((h) => h && h.day < day).slice(-7).reverse();
    head.push("The 7 days before:" + (before.length === 0 ? " none stored" : ""));
    before.forEach((h) => head.push("- " + h.day + ": " + valueWords(h.value) + ", " + (h.state || "unknown")));
    const opened = String(x.openedAt || "").slice(0, 10);
    const reds = [{ day, state: n.state }].concat(before).filter((h) => h.state === "red" && (!opened || h.day >= opened));
    const rowsDay = reds.length ? reds[0].day : day;
    const listed = read("/api/health/numbers/" + encodeURIComponent(x.key) + "/list?day=" + rowsDay);
    const safe = safeRows(x.key, listed && Array.isArray(listed.items) ? listed.items : []);
    const rows = ["Rows behind it (" + rowsDay + "): " + (listed ? safe.total + " row" + (safe.total === 1 ? "" : "s") : "the list could not be read")
      + (safe.people !== null ? ", about " + safe.people + " " + (safe.people === 1 ? "person" : "people") + " (no names)" : "")];
    return { head, rows: rows.concat(safe.lines.slice(0, ROWS_MAX)), more: Math.max(0, safe.lines.length - ROWS_MAX) };
  }
  function runPart(x) {
    const head = ["Journey: " + x.key];
    const list = read("/api/health/runs");
    const runs = [];
    (list && Array.isArray(list.runs) ? list.runs : []).forEach((r) => {
      const one = read("/api/health/runs/" + encodeURIComponent(r.id));
      const j = one && Array.isArray(one.journeys) ? one.journeys.find((y) => y && y.name === x.key) : null;
      if (j) runs.push({ r, j });
    });
    head.push("Its last runs:" + (runs.length === 0 ? " none" : ""));
    runs.slice(0, 7).forEach(({ r, j }) => head.push("- " + nyTime(r.startedAt) + ", " + r.trigger + " run " + r.id + ": " + j.outcome + " in " + j.durationMs + " ms"));
    const failed = runs.find(({ j }) => j.outcome === "failed");
    const rows = [];
    if (failed) {
      rows.push("Steps of the last failed run (" + failed.r.id + "):");
      (failed.j.steps || []).forEach((s) => rows.push("- " + s.name + ": " + s.outcome + " in " + s.durationMs + " ms"));
    }
    return { head, rows, more: 0 };
  }
  function outagePart(x) {
    return { head: ["Monitor: " + ((x.monitor && x.monitor.name) || "unknown") + (x.monitor && x.monitor.id ? " (UptimeRobot id " + x.monitor.id + ")" : ""),
      "Reason: " + (x.reason || "none given"), "How long: " + lastedWords(x.durationSeconds) + (x.closedAt ? "" : " so far, still down")], rows: [], more: 0 };
  }
  function fit(head, rows, more, tail) {
    const join = (h, r, mo) => ascii(h.concat(r, mo > 0 ? ["(" + mo + " more row" + (mo === 1 ? "" : "s") + " left out)"] : [], [""], tail).join("\n")) + "\n";
    const keep = rows.slice();
    let left = more;
    let text = join(head, keep, left);
    while (text.length > MAX_CHARS && keep.length > 1) { keep.pop(); left += 1; text = join(head, keep, left); }
    return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
  }
  function briefOf(id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""))) return null;
    const all = read("/api/health/incidents");
    const x = all && Array.isArray(all.incidents) ? all.incidents.find((y) => y && y.id === id) : null;
    if (!x) return null;
    const source = x.source || "health";
    const top = ["OCSA Health brief", "Incident: " + x.id, "Kind: " + x.kind + ", source " + source, "Key: " + x.key, "Title: " + x.title, "Opened: " + nyTime(x.openedAt),
      "Closed: " + (x.closedAt ? nyTime(x.closedAt) : "still open"), "What fixed it: " + (x.resolution ? "written on the Health page" : "not written yet"), "Timeline:"];
    (Array.isArray(x.timeline) ? x.timeline : []).forEach((e) => top.push("- " + nyTime(e && e.at) + ": " + (e && e.text ? e.text : "")));
    const part = source === "uptimerobot" ? outagePart(x) : x.kind === "number" ? numberPart(x) : x.kind === "run" ? runPart(x) : { head: [], rows: [], more: 0 };
    return fit(top.concat(part.head), part.rows, part.more, ["API commit: " + COMMIT, "Made: " + nyTime(seed.NOW_ISO)]);
  }
  const TEXT = (status, text) => ({ status, bytes: Buffer.from(text, "utf8"), contentType: "text/plain; charset=utf-8", headers: { "Cache-Control": "private, no-store" }, json: text });
  // The skipped step of the failed run's skipped journey, with the robot's reason (part 384, 5.10).
  const SKIP_REASON = "Send a warning to sign failed before it, so no warning was waiting for a paper signature.";
  function healthRoute(method, path, query, body, lang, base) {
    const bm = /^\/api\/health\/incidents\/([^/]+)\/brief$/.exec(path);
    if (bm && method === "GET") {
      if (sc().noBrief) return bad(404, "common.notFound", T(lang, "Not found", "No encontrado"));
      const a = base();
      if (a && a.status === 403) return a;
      const id = decodeURIComponent(bm[1]);
      sent("brief", { id });
      if (sc().briefFails) return bad(500, "server.error", T(lang, "Something went wrong on our side. Try again in a moment.", "Algo salió mal de nuestro lado. Inténtelo de nuevo en un momento."));
      const text = briefOf(id);
      if (!text) return bad(404, "health.incidentNotFound", T(lang, "That incident was not found.", "No se encontró ese incidente."));
      m().briefs.push({ id, text });
      return TEXT(200, text);
    }
    const rm = /^\/api\/health\/runs\/([^/]+)$/.exec(path);
    if (rm && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.journeys)) return a;
      a.json = Object.assign({}, a.json, { journeys: a.json.journeys.map((j) => {
        const steps = (j.steps || []).map((s) => Object.assign({ reason: null }, s));
        if (j.outcome === "skipped" && steps.length === 0) steps.push({ name: "Record the paper signature", outcome: "skipped", durationMs: 0, error: null, screenshotUrl: null, reason: SKIP_REASON });
        return Object.assign({}, j, { steps });
      }) });
      return a;
    }
    return null;
  }

  // ---- Section 3: findings without the inspection -------------------------------------------------------------------
  let part389 = null;
  const raw = () => (ctx.findings ? ctx.findings() : []);
  const siteOf = (id) => (state.sites || S).find((x) => String(x.id) === String(id)) || S.find((x) => String(x.id) === String(id)) || null;
  const usesAll = () => { const p = me(); return !!p && (p.role === "admin" || p.isSuperAdmin === true); };
  // mayDecide: a holder of manage_inspections (an admin here), or a supervisor assigned at the site.
  const mayDecideAt = (siteId) => { const p = me(); if (!p) return false; if (usesAll()) return true; const s = siteOf(siteId); return p.role === "supervisor" && !!s && String(s.supervisor_id) === String(p.id); };
  const ownersAt = () => (part389 ? part389.owners() : []).map((o, i) => Object.assign({}, o, { group: i < 2 ? "assigned" : "everyone" }));
  const topics = (lang) => (part389 ? part389.topics(lang) : []);
  const withTopic = (fu, lang) => {
    if (!fu || typeof fu !== "object") return fu;
    const id = fu.topic && fu.topic.id ? fu.topic.id : fu.topicId || null;
    const hit = id ? topics(lang).find((x) => x.id === id) : null;
    return Object.assign({}, fu, { topic: hit ? { id: hit.id, name: hit.name } : fu.topic || null });
  };
  const findingOut = (f, lang) => {
    if (!f || typeof f !== "object") return f;
    const r = raw().find((x) => x.id === f.id);
    const siteId = f.site && f.site.id ? f.site.id : r ? r.siteId : null;
    return Object.assign({}, f, { title: r && r.title ? r.title : null, owners: ownersAt(), canDecide: mayDecideAt(siteId) });
  };
  const COUNTED = ["needsFollowUp", "open", "overdue"];
  function findingsRoute(method, path, query, body, lang, base) {
    if (path === "/api/inspections/findings" && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.findings)) return a;
      const every = withQuery(query, { status: null, siteId: null, ownerId: null, kind: null }, () => base());
      const counts = { needsFollowUp: 0, open: 0, overdue: 0 };
      (every && every.json && Array.isArray(every.json.findings) ? every.json.findings : []).forEach((f) => { if (f && COUNTED.indexOf(f.state) >= 0) counts[f.state] += 1; });
      a.json = Object.assign({}, a.json, { findings: a.json.findings.map((f) => findingOut(f, lang)), followUpTopics: topics(lang), counts });
      return a;
    }
    const one = /^\/api\/inspections\/findings\/([^/]+)(?:\/(follow-up|conversation))?$/.exec(path);
    if (!one) return null;
    const id = decodeURIComponent(one[1]);
    if (one[2] && method === "POST") {
      const r = raw().find((x) => x.id === id);
      if (r && !mayDecideAt(r.siteId) && me() && me().role === "supervisor") {
        sent("refused-" + one[2], { id, body });
        return bad(403, "access.insufficientPermissions", T(lang, "Insufficient permissions", "No tiene permiso para hacer esto"));
      }
    }
    const a = base();
    if (!a || a.status >= 300 || !a.json || !a.json.finding) return a;
    a.json = Object.assign({}, a.json, { finding: findingOut(a.json.finding, lang) }, !one[2] && method === "GET" ? { followUpTopics: topics(lang) } : {});
    return a;
  }
  function shortRoute(method, path, query, body, lang, base) {
    if (method !== "GET") return null;
    if (/^\/api\/inspections\/scheduled\/[^/]+$/.test(path)) {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.findings)) a.json = Object.assign({}, a.json, { findings: a.json.findings.map((f) => (f && Object.prototype.hasOwnProperty.call(f, "followUp") ? Object.assign({}, f, { followUp: withTopic(f.followUp, lang) }) : f)) });
      return a;
    }
    if (/^\/api\/forms\/responses\/[^/]+$/.test(path)) {
      const a = base();
      const fix = (j) => (j && Array.isArray(j.linkedIssues) ? Object.assign({}, j, { linkedIssues: j.linkedIssues.map((x) => (x && Object.prototype.hasOwnProperty.call(x, "followUp") ? Object.assign({}, x, { followUp: withTopic(x.followUp, lang) }) : x)) }) : j);
      if (a && a.status === 200 && a.json) { a.json = fix(a.json); if (a.json.response) a.json = Object.assign({}, a.json, { response: fix(a.json.response) }); }
      return a;
    }
    if (path === "/api/inspections/analytics/export") {
      const a = base();
      if (a && a.status === 200 && Array.isArray(a.json)) {
        const fus = part389 ? part389.followUps() : [];
        a.json = a.json.map((r) => {
          if (!r || !Object.prototype.hasOwnProperty.call(r, "finding_follow_up")) return r;
          const fu = r.finding_id ? fus.find((x) => x.issueId === r.finding_id && !x.endedAt) : null;
          const hit = fu && fu.kind === "training" && fu.topicId ? topics("en").find((x) => x.id === fu.topicId) : null;
          return Object.assign({}, r, { finding_follow_up_topic: hit ? T(lang, hit.name, topics("es").find((x) => x.id === hit.id).name) : null });
        });
      }
      return a;
    }
    return null;
  }

  // ---- Section 4: the test site and a supervisor --------------------------------------------------------------------
  const WRITE = ["POST", "PUT", "PATCH", "DELETE"];
  const testId = () => (sc().testSite ? String(sc().testSite) : "");
  const usesTestSites = () => { const p = me(); return !!p && (p.isTestAccount === true || p.role === "admin" || p.isSuperAdmin === true); };
  const issueSite = (id) => {
    const rows = [].concat(state.issues || [], raw(), seed.ISSUES || []);
    const r = rows.find((x) => x && String(x.id) === String(id));
    return r ? String(r.siteId || r.site_id || "") : "";
  };
  const namesTest = (path, body) => {
    const t = testId();
    if (path.indexOf("/sites/" + t + "/") >= 0 || path.endsWith("/sites/" + t)) return true;
    const b = body && typeof body === "object" ? body : {};
    if ([b.siteId, b.site_id].some((x) => x !== undefined && x !== null && String(x) === t)) return true;
    if (Array.isArray(b.siteIds) && b.siteIds.some((x) => String(x) === t)) return true;
    const im = /^\/api\/issues\/([^/]+)\//.exec(path);
    if (im && issueSite(decodeURIComponent(im[1])) === t) return true;
    const sm = /^\/api\/schedule\/([^/]+)$/.exec(path);
    const shift = sm ? (state.schedule || ctx.schedule || []).find((x) => x && String(x.id) === decodeURIComponent(sm[1])) : null;
    return !!shift && String(shift.site_id) === t;
  };
  function testSiteRoute(method, path, query, body, lang, base) {
    if (!testId() || usesTestSites()) return null;
    if (method === "GET" && (path === "/api/sites" || path === "/api/leave/sites")) {
      const a = base();
      if (!a || a.status !== 200) return a;
      const drop = (rows) => rows.filter((x) => !x || String(x.id || x.siteId) !== testId());
      if (Array.isArray(a.json)) a.json = drop(a.json);
      else if (a.json && Array.isArray(a.json.sites)) a.json = Object.assign({}, a.json, { sites: drop(a.json.sites) });
      return a;
    }
    if (WRITE.indexOf(method) >= 0 && /^\/api\//.test(path) && !/^\/api\/auth\//.test(path) && namesTest(path, body)) {
      m().testSiteRefused += 1;
      sent("test-site-refused", { method, path, body });
      return bad(403, "testCrew.testSite", T(lang, "This is the test site. Only test accounts and admins can make changes here.", "Este es el sitio de prueba. Solo las cuentas de prueba y los administradores pueden hacer cambios aquí."), { testSite: true });
    }
    return null;
  }

  function route(method, path, query, body, lang, base) {
    { const r = testSiteRoute(method, path, query, body, lang, base); if (r) return r; }
    { const r = zeroRoute(method, path, query, body, lang, base); if (r) return r; }
    if (/^\/api\/health\//.test(path)) { const r = healthRoute(method, path, query, body, lang, base); if (r) return r; }
    if (/^\/api\/inspections\/findings(\/|$)/.test(path)) { const r = findingsRoute(method, path, query, body, lang, base); if (r) return r; }
    { const r = shortRoute(method, path, query, body, lang, base); if (r) return r; }
    return base();
  }

  return {
    route,
    setScene: (o) => { Object.assign(m().scene, o || {}); },
    setProbe: (fn) => { probe = fn; },
    setPart389: (x) => { part389 = x; },
    sent: () => m().sent,
    model: () => m(),
    briefs: () => m().briefs,
    reset: () => { model = null; },
  };
};
