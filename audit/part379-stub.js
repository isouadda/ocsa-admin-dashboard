// What the API's Rounds 9 and 10 answer for the dashboard (ocsa-api part 374, #158, and part 376, #159, main
// 43cc70c), for the dashboard's part 379. audit/stubs.js lays it over every other layer but the pictures, in
// every run, since the API's main answers it. Each route is answered the way the API's code at 43cc70c
// answers it, with the API's own words in English and Spanish (helpers/words.js):
//
//   Section 1, the Health page (routes/health.js, helpers/healthPage.js, helpers/healthNumbers.js,
//   helpers/healthReports.js), every route behind view_health, 403 access.insufficientPermissions for
//   anyone else:
//     GET /api/users/me/permissions       view_health for the super admin, and for anyone the scene's grants
//                                         name or the super admin granted it on By person
//     GET, PUT /api/users/:id/permissions the capability's row (middleware/capabilities.js, held by no role);
//                                         a change to view_health by anyone but the super admin is 403
//                                         users.healthGrant (routes/users.js SUPER_ADMIN_GRANTS)
//     GET /api/health/summary             the worst state of today's numbers, when they were worked out, the
//                                         last run and the incidents open
//     GET /api/health/numbers, POST /api/health/numbers/refresh
//                                         the 20 numbers in the API's order with their labels, groups, units,
//                                         lines (the defaults, overridden by PUT /api/health/thresholds) and
//                                         30 days of history; refresh works today out again (computedAt moves)
//     GET /api/health/numbers/:key/list   the people, warnings, routes or runs behind a number; 404
//                                         health.numberNotFound
//     GET /api/health/runs, /runs/:id     three runs newest first, 50 a page, nextCursor; one run with its
//                                         journeys and steps, a failed step's error and its screenshot as a
//                                         signed link; 404 health.runNotFound
//     POST /api/health/run-now            202 { started, at }; again within 2 minutes 409 health.runNowBusy;
//                                         the scene runNowOff 503 health.runNowOff
//     GET /api/health/incidents, PATCH /api/health/incidents/:id
//                                         one open and one closed; a resolution of 1 to 1000 characters, else
//                                         400 health.badDetails keys ["resolution"]
//     GET, PUT /api/health/recipients     the set, empty by default (the super admins); userIds the active
//                                         people who are not test accounts (the stub's ids are not uuids, so
//                                         it checks them against its people), emails deliverable addresses
//     GET, PUT /api/health/thresholds     readThresholds' rules: a line a number or null, a share 0 to 1, red
//                                         at or above yellow (at or under for a share), else 400
//                                         health.badDetails with the paths
//     GET, POST /api/health/reports, GET /api/health/reports/:id/pdf
//                                         one month's pair kept; from and to days, from not after to and
//                                         neither after today, else 400 health.badDetails keys from, to
//   The scene healthEmpty answers what a server with nothing measured yet answers: no runs, no incidents, no
//   reports, and every number null.
//
// Every value is invented: the people are the seed's, the commits made up, the routes the API's own patterns.
"use strict";

module.exports = (ctx) => {
  const { seed, state, ok, clone, person } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const TODAY = seed.TODAY;
  const NOW = Date.parse(seed.NOW_ISO);
  const addDays = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const isDay = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
  const me = () => person();

  let model = null;
  const m = () => {
    if (!model) model = { scene: {}, sent: [], grants: {}, thresholds: {}, computedAt: "2026-03-18T01:00:00.000Z", runNowAt: null, recipients: [], reports: null, incidents: null, nextId: 1 };
    return model;
  };
  const uid = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
  const sent = (what, body) => { m().sent.push({ what, body: clone(body === undefined ? null : body) }); };

  // ---- Section 1: the Health page ------------------------------------------------------------------------
  const NUMBERS = [
    ["app_open_ms", "speed", "ms", "above", 2500, 5000, "App open time", "Tiempo de apertura de la aplicaci\u00f3n"],
    ["server_errors", "speed", "count", "above", 5, 25, "Server errors", "Errores del servidor"],
    ["slowest_p95_ms", "speed", "ms", "above", 1500, 3000, "Slowest route (95th percentile)", "Ruta m\u00e1s lenta (percentil 95)"],
    ["failed_sign_ins", "people", "count", "above", 15, 40, "Failed sign-ins", "Inicios de sesi\u00f3n fallidos"],
    ["check_offs", "work", "count", "belowShare", 0.7, 0.4, "Check-offs", "Tareas marcadas"],
    ["shifts_started", "work", "count", "belowShare", 0.7, 0.4, "Shifts started", "Turnos iniciados"],
    ["shifts_closed_automatically", "work", "count", "above", 3, 10, "Shifts closed automatically", "Turnos cerrados autom\u00e1ticamente"],
    ["shifts_left_open", "work", "count", "above", 1, 5, "Shifts left open", "Turnos que quedaron abiertos"],
    ["training_waiting", "training", "people", "above", 5, 15, "People waiting on a trainer", "Personas que esperan a un instructor"],
    ["training_out_of_tries", "training", "people", "above", 1, 5, "People out of tries on a lesson", "Personas sin intentos en una lecci\u00f3n"],
    ["lessons_failed_three", "training", "count", "above", 1, 5, "Lessons failed three times", "Lecciones reprobadas tres veces"],
    ["warning_drafts_old", "warnings", "count", "above", 1, 5, "Warnings left as drafts over 2 days", "Amonestaciones en borrador por m\u00e1s de 2 d\u00edas"],
    ["signatures_waiting", "warnings", "count", "above", 1, 5, "Signatures waiting over 3 days", "Firmas pendientes por m\u00e1s de 3 d\u00edas"],
    ["final_mails_not_sent", "warnings", "count", "above", 1, 3, "Final copies of warnings not mailed", "Copias finales de amonestaciones no enviadas"],
    ["emails_failed", "messages", "count", "above", 1, 10, "Emails that failed", "Correos que fallaron"],
    ["push_failed", "messages", "count", "above", 5, 25, "Phone notices that failed", "Avisos al tel\u00e9fono que fallaron"],
    ["never_signed_in", "people", "people", "above", 5, 25, "People never signed in", "Personas que nunca iniciaron sesi\u00f3n"],
    ["no_email", "people", "people", "above", 10, null, "People with no email on file", "Personas sin correo registrado"],
    ["runs_failed", "runs", "count", "above", null, 1, "Run-throughs failed last night", "Recorridos de prueba fallidos anoche"],
    ["monitors_down", "uptime", "count", "above", null, 1, "Uptime monitors down", "Monitores de disponibilidad ca\u00eddos"],
  ].map(([key, group, unit, kind, yellow, red, en, es]) => ({ key, group, unit, defaults: { kind, yellow, red }, en, es }));
  const byKey = (k) => NUMBERS.find((n) => n.key === k) || null;
  // Today's value of each number, and a fixed walk back over 30 days. server_errors is red today, failed
  // sign-ins yellow, monitors_down not measured (no UptimeRobot key), the rest green.
  const TODAY_VALUE = { app_open_ms: 1380, server_errors: 31, slowest_p95_ms: 900, failed_sign_ins: 18, check_offs: 212, shifts_started: 24, shifts_closed_automatically: 0, shifts_left_open: 0,
    training_waiting: 2, training_out_of_tries: 0, lessons_failed_three: 0, warning_drafts_old: 0, signatures_waiting: 0, final_mails_not_sent: 0, emails_failed: 0, push_failed: 2,
    never_signed_in: 3, no_email: 4, runs_failed: 0, monitors_down: null };
  const linesOf = (def) => Object.assign({}, def.defaults, m().thresholds[def.key] || {});
  const stateOf = (lines, value, base) => {
    if (value === null || value === undefined) return "unknown";
    if (lines.kind === "belowShare") {
      if (base === null || base === undefined || base <= 0) return "green";
      const share = value / base;
      if (lines.red !== null && share < lines.red) return "red";
      if (lines.yellow !== null && share < lines.yellow) return "yellow";
      return "green";
    }
    if (lines.red !== null && value >= lines.red) return "red";
    if (lines.yellow !== null && value >= lines.yellow) return "yellow";
    return "green";
  };
  const valueOn = (def, back) => {
    if (m().scene.healthEmpty) return null;
    const v = TODAY_VALUE[def.key];
    if (v === null || v === undefined) return null;
    if (back === 0) return v;
    if (def.key === "server_errors") return [2, 3, 1, 0, 4, 2, 6][back % 7];
    if (def.key === "failed_sign_ins") return 6 + (back * 5) % 9;
    if (typeof v === "number" && v > 50) return Math.round(v * (0.9 + ((back * 7) % 5) / 25));
    return Math.max(0, v - ((back * 3) % 3));
  };
  const average = (xs) => { const v = xs.filter((x) => x !== null && x !== undefined); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null; };
  function numberRow(def, lang) {
    const lines = linesOf(def);
    const history = [];
    for (let back = 29; back >= 0; back -= 1) {
      const value = valueOn(def, back);
      const before = [1, 2, 3, 4, 5, 6, 7].map((k) => valueOn(def, back + k));
      history.push({ day: addDays(TODAY, -back), value, state: stateOf(lines, value, average(before)) });
    }
    const today = history[history.length - 1];
    const week = [1, 2, 3, 4, 5, 6, 7].map((k) => valueOn(def, k));
    return { key: def.key, label: T(lang, def.en, def.es), group: def.group, unit: def.unit, value: today.value, state: today.state, computedAt: today.value === null ? null : m().computedAt,
      previous: valueOn(def, 1), weekAverage: average(week), lines, history };
  }
  const numbersAnswer = (lang) => ({ day: TODAY, numbers: NUMBERS.map((d) => numberRow(d, lang)) });
  // The runs: a nightly one that passed, a merge one that failed at a step with its screenshot, and an older
  // nightly one. The scene healthEmpty has none.
  const RUNS = [
    { id: uid(901), clientId: "nightly-0317", trigger: "nightly", startedAt: "2026-03-17T07:02:00.000Z", finishedAt: "2026-03-17T07:09:40.000Z", commits: { api: "43cc70cf1245", dashboard: "103d76d9a7e2", staffApp: "c0ffee12ab34" }, appOpenMs: 1380, runUrl: "https://github.com/example-org/example-journeys/actions/runs/1001", outcome: "passed", journeys: { passed: 6, failed: 0, skipped: 0 }, receivedAt: "2026-03-17T07:09:42.000Z" },
    { id: uid(902), clientId: "merge-0316", trigger: "merge", startedAt: "2026-03-16T19:40:00.000Z", finishedAt: "2026-03-16T19:46:05.000Z", commits: { api: "481723b0aa11", dashboard: "0cba99ad104c", staffApp: "c0ffee12ab34" }, appOpenMs: 1620, runUrl: "https://github.com/example-org/example-journeys/actions/runs/1000", outcome: "failed", journeys: { passed: 4, failed: 1, skipped: 1 }, receivedAt: "2026-03-16T19:46:07.000Z" },
    { id: uid(903), clientId: "nightly-0316", trigger: "nightly", startedAt: "2026-03-16T07:01:00.000Z", finishedAt: "2026-03-16T07:08:20.000Z", commits: { api: "481723b0aa11", dashboard: "0cba99ad104c", staffApp: "c0ffee12ab34" }, appOpenMs: 1410, runUrl: null, outcome: "passed", journeys: { passed: 6, failed: 0, skipped: 0 }, receivedAt: "2026-03-16T07:08:22.000Z" },
  ];
  const SHOT = "https://storage.example.invalid/storage/v1/object/sign/health-shots/run-902/step-3.png?token=shot";
  const journeysOf = (run) => {
    const step = (name, outcome, ms, error, shot) => ({ name, outcome, durationMs: ms, error: error || null, screenshotUrl: shot || null });
    const base = [
      { name: "Sign in", outcome: "passed", durationMs: 2100, steps: [step("Open the sign-in page", "passed", 600), step("Sign in with the badge and PIN", "passed", 1500)] },
      { name: "Start a shift and check off", outcome: "passed", durationMs: 5200, steps: [step("Start the shift at the test site", "passed", 1800), step("Check off the first task", "passed", 3400)] },
    ];
    if (run.outcome !== "failed") return base.concat([{ name: "File an issue with a photo", outcome: "passed", durationMs: 4300, steps: [step("Take the photo", "passed", 1300), step("File the issue", "passed", 3000)] }]);
    return base.concat([
      { name: "Send a warning to sign", outcome: "failed", durationMs: 9100, steps: [step("Draft the warning", "passed", 2200), step("Issue it to the phone", "passed", 2900), step("Read the final copy's email", "failed", 4000, "The final copy's email did not arrive within 10 seconds.", SHOT)] },
      { name: "Record a paper signature", outcome: "skipped", durationMs: 0, steps: [] },
    ]);
  };
  const runsList = () => (m().scene.healthEmpty ? [] : RUNS);
  const ITEMS = {
    app_open_ms: () => [{ runId: uid(901), trigger: "nightly", startedAt: RUNS[0].startedAt, appOpenMs: 1380 }],
    server_errors: () => [{ method: "GET", route: "/api/sites/:id/tasks", errors: 22, requests: 4100 }, { method: "POST", route: "/api/clock/tasks/:taskId/complete", errors: 9, requests: 1880 }],
    slowest_p95_ms: () => [{ method: "GET", route: "/api/sites/:id/tasks", p50: 120, p95: 900, requests: 4100 }, { method: "GET", route: "/api/library", p50: 60, p95: 300, requests: 620 }],
    failed_sign_ins: () => [{ userId: "u-staff-6", name: "Ngozi Okonkwo", matchedNobody: false, tries: 4, lastAt: "2026-03-17T23:10:00.000Z" }, { userId: null, name: null, matchedNobody: true, tries: 14, lastAt: "2026-03-17T22:55:00.000Z" }],
    check_offs: () => seed.SITES.map((s, i) => ({ siteId: s.id, site: s.name, checkOffs: [120, 70, 22][i] })),
    shifts_started: () => seed.SITES.map((s, i) => ({ siteId: s.id, site: s.name, shiftsStarted: [12, 8, 4][i] })),
    training_waiting: () => [{ attemptId: uid(801), userId: "u-staff-5", name: "Tomasz Wisniewski", topic: "Spill response", waitingSince: "2026-03-16T15:00:00.000Z" }, { attemptId: uid(802), userId: "u-staff-7", name: "Elena Barbosa", topic: "Ladder safety", waitingSince: "2026-03-17T14:20:00.000Z" }],
    push_failed: () => [{ hour: "2026-03-17T20:00:00.000Z", sent: 40, failed: 2 }],
    never_signed_in: () => [{ userId: "u-staff-8", name: "Rashid Haddad", role: "custodial_laborer", createdAt: "2026-02-02T15:00:00.000Z" }, { userId: "u-staff-9", name: "Yuki Tanabe", role: "custodial_lead", createdAt: "2026-02-10T15:00:00.000Z" }, { userId: "u-staff-11", name: "Salome Mkhize", role: "custodial_laborer", createdAt: "2026-03-01T15:00:00.000Z" }],
    no_email: () => [{ userId: "u-staff-8", name: "Rashid Haddad", role: "custodial_laborer", office: false }],
  };
  const incidentsOf = () => {
    if (m().scene.healthEmpty) return [];
    if (!m().incidents) m().incidents = [
      { id: uid(701), kind: "number", key: "server_errors", title: "Server errors are red", openedAt: "2026-03-17T12:00:00.000Z", closedAt: null, resolution: null, resolvedBy: null, timeline: [{ at: "2026-03-17T12:00:00.000Z", text: "Server errors reached 31, over the red line of 25" }] },
      { id: uid(702), kind: "run", key: "Send a warning to sign", title: "A run-through failed: Send a warning to sign", openedAt: "2026-03-16T19:46:07.000Z", closedAt: "2026-03-17T07:09:42.000Z", resolution: "The mail service was slow for an hour. It cleared by itself.", resolvedBy: seed.PEOPLE.superAdmin.id, timeline: [{ at: "2026-03-16T19:46:07.000Z", text: "The journey failed" }, { at: "2026-03-17T07:09:42.000Z", text: "The journey passed" }] },
    ];
    return m().incidents;
  };
  const reportsOf = () => {
    if (m().scene.healthEmpty) return [];
    if (!m().reports) m().reports = [
      { id: uid(601), kind: "executive", from: "2026-02-01", to: "2026-02-28", monthly: true, createdAt: "2026-03-01T12:00:00.000Z", createdBy: null, mailedAt: "2026-03-01T12:01:00.000Z", bytes: 48211 },
      { id: uid(602), kind: "full", from: "2026-02-01", to: "2026-02-28", monthly: true, createdAt: "2026-03-01T12:00:00.000Z", createdBy: null, mailedAt: "2026-03-01T12:01:00.000Z", bytes: 211904 },
    ];
    return m().reports;
  };
  const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n", "latin1");
  const peopleAll = () => (state.staff && state.staff.length ? state.staff : seed.STAFF);
  const personById = (id) => peopleAll().find((p) => String(p.id) === String(id)) || Object.values(seed.PEOPLE).find((p) => String(p.id) === String(id)) || null;
  const nameOf = (p) => (p ? (p.name || [p.firstName || p.first_name, p.lastName || p.last_name].filter(Boolean).join(" ")) : null);
  const emailOk = (e) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const supers = () => [seed.PEOPLE.superAdmin];
  function recipientsView() {
    const set = m().recipients;
    const rows = set.map((r, i) => (r.userId ? { id: uid(500 + i), userId: r.userId, name: nameOf(personById(r.userId)), email: (personById(r.userId) || {}).email || null, viaEmail: true, viaInApp: true }
      : { id: uid(500 + i), userId: null, name: null, email: r.email, viaEmail: true, viaInApp: false }));
    const receiving = rows.length ? rows.map((r) => ({ userId: r.userId, email: r.email })) : supers().map((p) => ({ userId: p.id, email: p.email }));
    return { recipients: rows, byDefault: rows.length === 0, receiving };
  }
  function thresholdsView(lang) {
    return { thresholds: NUMBERS.map((d) => { const l = linesOf(d); return { key: d.key, label: T(lang, d.en, d.es), unit: d.unit, kind: d.defaults.kind, yellow: l.yellow, red: l.red, defaults: { yellow: d.defaults.yellow, red: d.defaults.red } }; }) };
  }
  // routes/health.js readThresholds, as written.
  function readThresholds(b) {
    const keys = [];
    const body = b && typeof b === "object" && !Array.isArray(b) ? b : {};
    Object.keys(body).forEach((k) => { if (k !== "thresholds") keys.push(k); });
    const t = body.thresholds;
    if (!t || typeof t !== "object" || Array.isArray(t)) return { keys: keys.concat("thresholds") };
    const out = {};
    Object.entries(t).forEach(([key, v]) => {
      const def = byKey(key);
      if (!def || !v || typeof v !== "object" || Array.isArray(v)) { keys.push("thresholds." + key); return; }
      Object.keys(v).forEach((k) => { if (k !== "yellow" && k !== "red") keys.push("thresholds." + key + "." + k); });
      const line = (x) => (x === null ? null : typeof x === "number" && Number.isFinite(x) && x >= 0 && (def.defaults.kind !== "belowShare" || x <= 1) ? x : undefined);
      const y = Object.prototype.hasOwnProperty.call(v, "yellow") ? line(v.yellow) : def.defaults.yellow;
      const r = Object.prototype.hasOwnProperty.call(v, "red") ? line(v.red) : def.defaults.red;
      if (y === undefined) keys.push("thresholds." + key + ".yellow");
      if (r === undefined) keys.push("thresholds." + key + ".red");
      if (y !== undefined && r !== undefined && y !== null && r !== null && (def.defaults.kind === "belowShare" ? r > y : r < y)) keys.push("thresholds." + key + ".red");
      out[key] = { yellow: y, red: r };
    });
    return keys.length ? { keys: Array.from(new Set(keys)) } : { value: out };
  }
  const BAD_HEALTH = (lang, keys) => bad(400, "health.badDetails", T(lang, "Some details are missing or not valid. Check the fields named and send it again.", "Faltan algunos datos o no son v\u00e1lidos. Revise los campos indicados y env\u00edelo de nuevo."), { keys });
  const holdsHealth = () => { const p = me(); return !!p && (p.isSuperAdmin === true || m().grants[p.id] === true || ((state.overrides || {})[p.id] || {}).view_health === true); };
  const HEALTH_ROW = { key: "view_health", label: "The Health page: platform health, run-throughs and reports", group: "Reporting", enforced: true, defaults: { admin: false, supervisor: false, staff: false } };

  function permissionsRoute(method, path, body, lang, base) {
    const pm = /^\/api\/users\/([^/]+)\/permissions$/.exec(path);
    if (!pm) return null;
    if (pm[1] === "me") {
      if (method !== "GET") return null;
      const a = base();
      if (a && a.json && a.json.capabilities && typeof a.json.capabilities === "object") a.json = Object.assign({}, a.json, { capabilities: Object.assign({}, a.json.capabilities, { view_health: holdsHealth() }) });
      return a;
    }
    const id = decodeURIComponent(pm[1]);
    const target = personById(id);
    if (method === "GET") {
      const a = base();
      if (a && a.json && typeof a.json === "object") {
        const list = Array.isArray(a.json.capabilities) ? a.json.capabilities.slice() : [];
        if (!list.some((x) => x && x.key === "view_health")) list.push(HEALTH_ROW);
        const ov = Object.assign({}, a.json.overrides || {});
        const held = ((state.overrides || {})[id] || {}).view_health;
        if (held !== undefined) ov.view_health = held;
        const effective = Object.assign({}, a.json.effective || {}, { view_health: !!(target && target.isSuperAdmin) || ov.view_health === true });
        a.json = Object.assign({}, a.json, { capabilities: list, overrides: ov, effective });
      }
      return a;
    }
    if (method !== "PUT" || !body || !body.permissions || typeof body.permissions !== "object" || !Object.prototype.hasOwnProperty.call(body.permissions, "view_health")) return null;
    const before = ((state.overrides || {})[id] || {}).view_health === true;
    const after = !!body.permissions.view_health;
    sent("permissions:" + id, body);
    if (after !== before && !(me() && me().isSuperAdmin)) return bad(403, "users.healthGrant", T(lang, "Only the super admin can grant or remove access to the Health page", "Solo el superadministrador puede dar o quitar el acceso a la p\u00e1gina de Salud"));
    // The layers under this one know the other two grants; this one keeps view_health and hands them the
    // rest, the body put back as it was sent once they have answered.
    const held = body.permissions.view_health;
    delete body.permissions.view_health;
    let a;
    try { a = Object.keys(body.permissions).length ? base() : ok({ user_id: id, role: target ? target.role : null, overrides: Object.assign({}, (state.overrides || {})[id] || {}), effective: {} }); }
    finally { body.permissions.view_health = held; }
    if (a && a.status === 200) {
      if (!state.overrides) state.overrides = {};
      state.overrides[id] = Object.assign({}, state.overrides[id] || {}, { view_health: after });
      a.json = Object.assign({}, a.json || {}, { overrides: Object.assign({}, (a.json && a.json.overrides) || {}, { view_health: after }), effective: Object.assign({}, (a.json && a.json.effective) || {}, { view_health: !!(target && target.isSuperAdmin) || after }) });
    }
    return a;
  }

  function healthRoute(method, path, query, body, lang) {
    if (!/^\/api\/health\//.test(path) || path === "/api/health/deep" || path === "/api/health/runs" && method === "POST") return null;
    if (!holdsHealth()) return bad(403, "access.insufficientPermissions", T(lang, "Insufficient permissions", "No tiene permiso para hacer esto"), { capability: "view_health" });
    if (path === "/api/health/summary" && method === "GET") {
      const rows = numbersAnswer(lang).numbers;
      const counts = { red: 0, yellow: 0, green: 0, unknown: 0 };
      rows.forEach((r) => { counts[r.state] += 1; });
      const worst = ["red", "yellow", "unknown", "green"].find((s) => counts[s] > 0) || "unknown";
      const empty = !!m().scene.healthEmpty;
      const run = runsList()[0] || null;
      return ok({ state: empty ? "unknown" : worst, day: TODAY, lastCheckedAt: empty ? null : m().computedAt, counts, lastRun: run ? { id: run.id, trigger: run.trigger, outcome: run.outcome, startedAt: run.startedAt } : null, openIncidents: incidentsOf().filter((x) => !x.closedAt).length });
    }
    if (path === "/api/health/numbers" && method === "GET") {
      const day = query.get("day");
      if (day && (!isDay(day) || day > TODAY)) return BAD_HEALTH(lang, ["day"]);
      return ok(numbersAnswer(lang));
    }
    if (path === "/api/health/numbers/refresh" && method === "POST") {
      sent("refresh", body);
      m().computedAt = new Date(NOW + 60000 * (m().sent.filter((x) => x.what === "refresh").length)).toISOString();
      return ok(numbersAnswer(lang));
    }
    const lm = /^\/api\/health\/numbers\/([^/]+)\/list$/.exec(path);
    if (lm && method === "GET") {
      const key = decodeURIComponent(lm[1]);
      if (!byKey(key)) return bad(404, "health.numberNotFound", T(lang, "There is no health number by that name.", "No hay ning\u00fan indicador de salud con ese nombre."));
      return ok({ key, day: query.get("day") || TODAY, items: m().scene.healthEmpty || !ITEMS[key] ? [] : ITEMS[key]() });
    }
    if (path === "/api/health/runs" && method === "GET") {
      const trigger = query.get("trigger");
      if (trigger && ["nightly", "merge", "on_demand"].indexOf(trigger) < 0) return BAD_HEALTH(lang, ["trigger"]);
      const limit = query.get("limit") ? Number(query.get("limit")) : 50;
      const list = runsList().filter((r) => !trigger || r.trigger === trigger);
      const from = query.get("cursor") ? Number(Buffer.from(String(query.get("cursor")), "base64url").toString("utf8")) || 0 : 0;
      const page = list.slice(from, from + limit);
      return ok({ runs: clone(page), nextCursor: from + limit < list.length ? Buffer.from(String(from + limit)).toString("base64url") : null });
    }
    const rm = /^\/api\/health\/runs\/([^/]+)$/.exec(path);
    if (rm && method === "GET") {
      const run = runsList().find((r) => r.id === decodeURIComponent(rm[1]));
      if (!run) return bad(404, "health.runNotFound", T(lang, "That run-through was not found.", "No se encontr\u00f3 ese recorrido de prueba."));
      return ok({ run: clone(run), journeys: journeysOf(run) });
    }
    if (path === "/api/health/run-now" && method === "POST") {
      sent("run-now", body);
      if (m().scene.runNowOff) return bad(503, "health.runNowOff", T(lang, "Run now is not set up on this server yet.", "Ejecutar ahora a\u00fan no est\u00e1 configurado en este servidor."));
      if (m().runNowAt !== null) return bad(409, "health.runNowBusy", T(lang, "A run-through was just asked for. Wait two minutes before asking again.", "Se acaba de pedir un recorrido de prueba. Espere dos minutos antes de pedir otro."));
      m().runNowAt = seed.NOW_ISO;
      return { status: 202, json: { started: true, at: seed.NOW_ISO } };
    }
    if (path === "/api/health/incidents" && method === "GET") {
      const open = query.get("open") === "true";
      return ok({ incidents: clone(incidentsOf().filter((x) => !open || !x.closedAt)) });
    }
    const im = /^\/api\/health\/incidents\/([^/]+)$/.exec(path);
    if (im && method === "PATCH") {
      sent("incident", body);
      const b = body && typeof body === "object" ? body : {};
      const text = typeof b.resolution === "string" ? b.resolution.replace(/\s+/g, " ").trim() : "";
      const stray = Object.keys(b).filter((k) => k !== "resolution");
      if (!text || text.length > 1000 || stray.length) return BAD_HEALTH(lang, stray.length ? stray : ["resolution"]);
      const x = incidentsOf().find((i) => i.id === decodeURIComponent(im[1]));
      if (!x) return bad(404, "health.incidentNotFound", T(lang, "That incident was not found.", "No se encontr\u00f3 ese incidente."));
      x.resolution = text; x.resolvedBy = me().id;
      x.timeline = x.timeline.concat([{ at: seed.NOW_ISO, text: "What fixed it was written" }]);
      return ok({ incident: clone(x) });
    }
    if (path === "/api/health/recipients" && method === "GET") return ok(recipientsView());
    if (path === "/api/health/recipients" && method === "PUT") {
      sent("recipients", body);
      const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};
      const keys = Object.keys(b).filter((k) => k !== "userIds" && k !== "emails");
      const ids = b.userIds === undefined ? [] : b.userIds;
      const emails = b.emails === undefined ? [] : b.emails;
      if (!Array.isArray(ids) || ids.length > 20 || !ids.every((id) => { const p = personById(id); return p && (p.status || "active") === "active" && !p.isTestAccount && p.role !== "client_contact"; })) keys.push("userIds");
      if (!Array.isArray(emails) || emails.length > 20 || !emails.every(emailOk)) keys.push("emails");
      if (keys.length) return BAD_HEALTH(lang, keys);
      m().recipients = Array.from(new Set(ids.map(String))).map((id) => ({ userId: id })).concat(Array.from(new Set(emails.map((e) => e.trim().toLowerCase()))).map((e) => ({ email: e })));
      return ok(recipientsView());
    }
    if (path === "/api/health/thresholds" && method === "GET") return ok(thresholdsView(lang));
    if (path === "/api/health/thresholds" && method === "PUT") {
      sent("thresholds", body);
      const read = readThresholds(body);
      if (read.keys) return BAD_HEALTH(lang, read.keys);
      Object.keys(read.value).forEach((k) => { m().thresholds[k] = read.value[k]; });
      return ok(thresholdsView(lang));
    }
    if (path === "/api/health/reports" && method === "GET") return ok({ reports: clone(reportsOf()) });
    if (path === "/api/health/reports" && method === "POST") {
      sent("reports", body);
      const b = body && typeof body === "object" ? body : {};
      const keys = [];
      Object.keys(b).forEach((k) => { if (k !== "from" && k !== "to") keys.push(k); });
      if (!isDay(b.from) || b.from > TODAY) keys.push("from");
      if (!isDay(b.to) || b.to > TODAY || (isDay(b.from) && b.to < b.from)) keys.push("to");
      if (keys.length) return BAD_HEALTH(lang, keys);
      const n = m().nextId++;
      const made = ["executive", "full"].map((kind, i) => ({ id: uid(610 + n * 2 + i), kind, from: b.from, to: b.to, monthly: false, createdAt: seed.NOW_ISO, createdBy: me().id, mailedAt: null, bytes: kind === "executive" ? 47000 : 205000 }));
      m().reports = made.concat(reportsOf());
      return { status: 201, json: { reports: clone(made) } };
    }
    const pm = /^\/api\/health\/reports\/([^/]+)\/pdf$/.exec(path);
    if (pm && method === "GET") {
      const r = reportsOf().find((x) => x.id === decodeURIComponent(pm[1]));
      if (!r) return bad(404, "health.reportNotFound", T(lang, "That health report was not found.", "No se encontr\u00f3 ese informe de salud."));
      sent("pdf", { id: r.id });
      return { status: 200, json: null, bytes: PDF, contentType: "application/pdf", headers: { "Content-Disposition": 'inline; filename="health-' + r.kind + "-" + r.from + "-" + r.to + '.pdf"' } };
    }
    return null;
  }

  function route(method, path, query, body, lang, base) {
    const a = permissionsRoute(method, path, body, lang, base);
    if (a) return a;
    const h = healthRoute(method, path, query, body, lang);
    if (h) return h;
    return base();
  }

  return {
    route,
    setScene: (o) => { Object.assign(m().scene, o || {}); if (o && o.grants) Object.assign(m().grants, o.grants); },
    sent: () => m().sent,
    model: () => m(),
    reset: () => { model = null; },
  };
};
