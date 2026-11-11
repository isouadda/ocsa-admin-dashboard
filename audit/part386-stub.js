// What the API's Round 11 answers for the dashboard (ocsa-api part 378, #161, main 292d2a9), for the dashboard's
// part 386. audit/stubs.js lays it over the part379 stub and every layer under it, in every run, since the API's
// main answers it. Each route is answered the way the API's code at 292d2a9 answers it, with the API's own words
// in English and Spanish (helpers/words.js):
//
//   Section 1, the robot's sign-in (routes/health.js, helpers/robotTrust.js, helpers/healthNumbers.js,
//   helpers/healthPage.js):
//     GET /api/health/robot-devices       view_health (the layer under decides the grant): { devices: [{ id,
//                                         userId, name, role, browser, expiresAt, endDay, daysLeft }], canRenew },
//                                         fewest days left first, canRenew true for the super admin only. Two
//                                         invented test accounts: Test Supervisor, 4 days left, and Test Admin,
//                                         26 days left. The scene robotNone answers no device.
//     POST /api/health/robot-devices/:id/renew
//                                         403 health.superAdminOnly for anyone but the super admin; 403
//                                         health.ownSecondStep unless body deviceId reads as a
//                                         device id (A-Za-z0-9._:- 8 to 200), and never under the scene
//                                         noOwnStep, which stands for a device not trusted for the super admin's
//                                         own account; 404 health.deviceNotFound for an id it does not hold;
//                                         403 health.notTestAccount for the scene's realDevice. A renew moves
//                                         the device to 30 days from today and answers 200 { device }.
//     GET /api/health/numbers, POST /api/health/numbers/refresh, GET /api/health/summary
//                                         the layer under's twenty, and robot_trust_days_left after
//                                         runs_failed, as healthNumbers.js NUMBERS orders it: group runs, unit
//                                         days, lines kind below (yellow 5, red 1), the fewest days left, red at
//                                         or under red and yellow at or under yellow, unknown with no device;
//                                         the summary counts it
//     GET /api/health/numbers/robot_trust_days_left/list
//                                         { deviceId, userId, account, device, endsAt, endDay, daysLeft }
//     GET, PUT /api/health/thresholds     the number's row with kind below; a PUT reads it as readThresholds
//                                         does (a line a number 0 or more, or null; red over yellow refused 400
//                                         health.badDetails keys thresholds.robot_trust_days_left.red) and hands
//                                         the rest to the layer under
//
//   Section 2, certificates from an outside course (helpers/training.js, routes/hr.js, routes/training.js):
//     GET /api/training/topics            every topic answers outsideCourse, false unless marked; Reporting a
//                                         concern about a child (tp-4) is marked, as the API's PR says the office
//                                         marks the mandated reporter topic
//     POST /api/training/topics, PATCH /api/training/topics/:id
//                                         outsideCourse a boolean, else 400 training.badDetails keys
//                                         ["outsideCourse"]; kept, and every Topic answer carries it
//     GET /api/hr/training                every row carries uploaded_by and uploaded_by_person: the certificate on
//                                         ht-5 was uploaded by the person, from an outside course; any other is
//                                         the office's
//
//   Section 3, warnings and the logo (helpers/discipline.js, routes/settings.js, helpers/photoLinks.js):
//     every answer under /api/discipline  each warning, summary or full, carries createdAt and updatedAt, ISO
//                                         instants: a warning that holds neither is started at 2:30 PM UTC on its
//                                         incident's day and last saved when it was issued, else as it holds; a
//                                         PUT moves updatedAt to now and a POST starts one now
//     GET /api/settings                   by tier (tierOf): the whole row to an admin by role or a holder of
//                                         manage_settings; DASHBOARD_KEYS and checklistDayStartsAt to any other
//                                         office account (a supervisor); checklistDayStartsAt alone to anyone
//                                         else. logo_url, once a logo is stored (the scene logo stores one), is
//                                         answered as a link signed for 60 minutes that names the read that
//                                         handed it out (?read=<n>); a logo held as a plain outside address is
//                                         answered as stored
//     PATCH /api/settings                 logo_url stored as <bucket>/<path> when it is a signed link or a path of
//                                         a photo bucket, as sent when it is an outside address, and answered as
//                                         the GET answers it
//
//   Section 4, the safety walk once a month (routes/inspections.js, helpers/inspectionSafety.js lastWalk and
//   dropFromInspection):
//     GET /api/inspections/safety-walks?siteId=
//                                         { siteId, lastWalk: { at, day, scheduledInspectionId, responseId,
//                                         thisMonth } | null }: Fairhaven's first site (s-1) walked on insp-4 on the
//                                         10th of this month, the stub's completed walk (Step 312's fr-safety-1);
//                                         the second (s-2) last walked in February, filed on its own; the third
//                                         (s-3) never. 400 inspections.badDetails keys ["siteId"] for a site the
//                                         stub does not hold. The scene walks replaces them.
//     GET /api/inspections/scheduled/:id lastSafetyWalk, the inspection's site's, beside the rest; a dropped
//                                         inspection answers with_safety false, here and in the list
//     POST /api/inspections/scheduled/:id/drop-safety
//                                         the inspector or manage_inspections, else 403
//                                         access.insufficientPermissions; 404 inspections.notFound; 409
//                                         inspections.completedLocked (not scheduled), inspections.noSafetyPart
//                                         (already without it), inspections.safetyWalkNotDone with lastWalk (no
//                                         walk this month at the site on another inspection, or the scene
//                                         walkGone); else 200 { inspection: { id, withSafety: false },
//                                         voidedDrafts: 1, lastWalk }
//
//   Section 5, a chart that draws nothing (helpers/checklistRecord.js), once the scene noSteps names a site, as a
//   site with no checklist items at all answers:
//     GET /api/reports/checklist-summary  that site's days with nothing due: due 0, done 0, checks 0, counted {
//                                         due: 0, done: 0 }, so every day's percent is null
//     GET /api/sites/:id/checklist-record that site's days with every item listed, none due and none checked
//
// Every value is invented: the test accounts, the devices and the days.
"use strict";

module.exports = (ctx) => {
  const { seed, ok, clone, person } = ctx;
  // ctx.state is the stub's own state, read for a person's capability overrides.
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const TODAY = seed.TODAY;
  const addDays = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
  const me = () => person();
  const uid = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");

  let model = null;
  const m = () => {
    if (!model) model = { scene: {}, sent: [], robot: null, robotLines: null, outside: { "tp-4": true }, personCerts: { "ht-5": true }, saved: {}, started: {}, logoReads: 0, walks: null, dropped: {} };
    return model;
  };
  const sent = (what, body) => { m().sent.push({ what, body: clone(body === undefined ? null : body) }); };
  const BAD_HEALTH = (lang, keys) => bad(400, "health.badDetails", T(lang, "Some details are missing or not valid. Check the fields named and send it again.", "Faltan algunos datos o no son válidos. Revise los campos indicados y envíelo de nuevo."), { keys });

  // ---- Section 1: the robot's sign-in -----------------------------------------------------------------------
  // A device ends at 4:00 AM UTC on its end day, the company's midnight; its days left are company days from
  // today to that day.
  const endsAtOf = (day) => day + "T04:00:00.000Z";
  const robotDevices = () => {
    if (!m().robot) m().robot = [
      { id: uid(4101), userId: uid(4001), name: "Test Supervisor", role: "supervisor", browser: "Chrome on Linux", endDay: addDays(TODAY, 4), test: true },
      { id: uid(4102), userId: uid(4002), name: "Test Admin", role: "admin", browser: "Firefox on Linux", endDay: addDays(TODAY, 26), test: true },
    ];
    return m().robot;
  };
  const deviceView = (d) => ({ id: d.id, userId: d.userId, name: d.name, role: d.role, browser: d.browser, expiresAt: endsAtOf(d.endDay), endDay: d.endDay, daysLeft: Math.max(0, daysBetween(TODAY, d.endDay)) });
  const listed = () => (m().scene.robotNone ? [] : robotDevices().filter((d) => d.test).map(deviceView).sort((a, b) => a.daysLeft - b.daysLeft || (a.id < b.id ? -1 : 1)));
  const ROBOT_KEY = "robot_trust_days_left";
  const ROBOT_DEFAULTS = { kind: "below", yellow: 5, red: 1 };
  const robotLines = () => Object.assign({}, ROBOT_DEFAULTS, m().robotLines || {});
  const belowState = (lines, v) => {
    if (v === null || v === undefined) return "unknown";
    if (lines.red !== null && lines.red !== undefined && v <= lines.red) return "red";
    if (lines.yellow !== null && lines.yellow !== undefined && v <= lines.yellow) return "yellow";
    return "green";
  };
  const fewestOn = (back) => {
    const list = listed();
    if (!list.length) return null;
    // The days left grow by one for each day back, until a device was renewed 30 days before.
    return Math.min(...list.map((d) => Math.min(30, d.daysLeft + back)));
  };
  const robotRow = (lang) => {
    const lines = robotLines();
    const history = [];
    for (let back = 29; back >= 0; back -= 1) { const value = fewestOn(back); history.push({ day: addDays(TODAY, -back), value, state: belowState(lines, value) }); }
    const week = [1, 2, 3, 4, 5, 6, 7].map(fewestOn).filter((x) => x !== null);
    const today = history[history.length - 1];
    return { key: ROBOT_KEY, label: T(lang, "Days left on the robot's sign-in", "Días restantes del inicio de sesión del robot"), group: "runs", unit: "days", value: today.value, state: today.state,
      computedAt: today.value === null ? null : "2026-03-18T01:00:00.000Z", previous: fewestOn(1), weekAverage: week.length ? Math.round((week.reduce((a, b) => a + b, 0) / week.length) * 10) / 10 : null, lines, history };
  };
  // The number goes after runs_failed, where helpers/healthNumbers.js lists it.
  const withRobot = (answer, lang) => {
    if (!answer || answer.status !== 200 || !answer.json || !Array.isArray(answer.json.numbers)) return answer;
    const numbers = answer.json.numbers.filter((n) => n.key !== ROBOT_KEY);
    const at = numbers.findIndex((n) => n.key === "runs_failed");
    numbers.splice(at >= 0 ? at + 1 : numbers.length, 0, robotRow(lang));
    return Object.assign({}, answer, { json: Object.assign({}, answer.json, { numbers }) });
  };
  const RENEW_WORDS = {
    "health.superAdminOnly": ["Only the super admin can do this.", "Solo el superadministrador puede hacer esto."],
    "health.ownSecondStep": ["Sign in with your own sign-in code on this device first, then try again.", "Primero inicie sesión con su propio código de inicio de sesión en este dispositivo y vuelva a intentarlo."],
    "health.deviceNotFound": ["That trusted device was not found.", "No se encontró ese dispositivo de confianza."],
    "health.notTestAccount": ["Only a test account's device can be renewed here.", "Aquí solo se puede renovar el dispositivo de una cuenta de prueba."],
  };
  const refuse = (lang, status, code) => bad(status, code, T(lang, RENEW_WORDS[code][0], RENEW_WORDS[code][1]));

  const withRobotLine = (a, lang) => {
    if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.thresholds)) return a;
    const lines = robotLines();
    const row = { key: ROBOT_KEY, label: T(lang, "Days left on the robot's sign-in", "D\u00edas restantes del inicio de sesi\u00f3n del robot"), unit: "days", kind: "below", yellow: lines.yellow, red: lines.red, defaults: { yellow: ROBOT_DEFAULTS.yellow, red: ROBOT_DEFAULTS.red } };
    const rows = a.json.thresholds.filter((r) => r.key !== ROBOT_KEY);
    const at = rows.findIndex((r) => r.key === "runs_failed");
    rows.splice(at >= 0 ? at + 1 : rows.length, 0, row);
    return Object.assign({}, a, { json: { thresholds: rows } });
  };

  function healthRoute(method, path, query, body, lang, base) {
    if (path === "/api/health/robot-devices" && method === "GET") {
      const g = base();
      if (g && g.status === 403) return g;
      return ok({ devices: listed(), canRenew: !!(me() && me().isSuperAdmin === true) });
    }
    const rm = /^\/api\/health\/robot-devices\/([^/]+)\/renew$/.exec(path);
    if (rm && method === "POST") {
      sent("renew", { id: decodeURIComponent(rm[1]), body });
      if (!(me() && me().isSuperAdmin === true)) return refuse(lang, 403, "health.superAdminOnly");
      const raw = body && body.deviceId;
      if (m().scene.noOwnStep || !(typeof raw === "string" && /^[A-Za-z0-9._:-]{8,200}$/.test(raw.trim()))) return refuse(lang, 403, "health.ownSecondStep");
      const id = decodeURIComponent(rm[1]);
      if (m().scene.realDevice && id === m().scene.realDevice) return refuse(lang, 403, "health.notTestAccount");
      const dv = m().scene.robotNone ? null : robotDevices().find((d) => d.id === id);
      if (!dv) return refuse(lang, 404, "health.deviceNotFound");
      dv.endDay = addDays(TODAY, 30);
      return ok({ device: deviceView(dv) });
    }
    if ((path === "/api/health/numbers" && method === "GET") || (path === "/api/health/numbers/refresh" && method === "POST")) return withRobot(base(), lang);
    if (path === "/api/health/summary" && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !a.json.counts) return a;
      const st = robotRow(lang).state;
      const counts = Object.assign({}, a.json.counts);
      counts[st] = (counts[st] || 0) + 1;
      const worst = ["red", "yellow", "unknown", "green"].find((s) => counts[s] > 0) || "unknown";
      return Object.assign({}, a, { json: Object.assign({}, a.json, { counts, state: a.json.state === "unknown" && !a.json.lastCheckedAt ? "unknown" : worst }) });
    }
    if (path === "/api/health/numbers/" + ROBOT_KEY + "/list" && method === "GET") {
      const g = base();
      if (g && g.status === 403) return g;
      return ok({ key: ROBOT_KEY, day: query.get("day") || TODAY, items: listed().map((d) => ({ deviceId: d.id, userId: d.userId, account: d.name, device: d.browser, endsAt: d.expiresAt, endDay: d.endDay, daysLeft: d.daysLeft })) });
    }
    if (path === "/api/health/thresholds" && method === "GET") return withRobotLine(base(), lang);
    if (path === "/api/health/thresholds" && method === "PUT") {
      const t = body && body.thresholds && typeof body.thresholds === "object" && !Array.isArray(body.thresholds) ? body.thresholds : null;
      if (!t || !Object.prototype.hasOwnProperty.call(t, ROBOT_KEY)) return null;
      sent("thresholds", body);
      const v = t[ROBOT_KEY];
      const keys = [];
      let value = null;
      if (!v || typeof v !== "object" || Array.isArray(v)) keys.push("thresholds." + ROBOT_KEY);
      else {
        Object.keys(v).forEach((k) => { if (k !== "yellow" && k !== "red") keys.push("thresholds." + ROBOT_KEY + "." + k); });
        const line = (x) => (x === null ? null : typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : undefined);
        const y = Object.prototype.hasOwnProperty.call(v, "yellow") ? line(v.yellow) : ROBOT_DEFAULTS.yellow;
        const r = Object.prototype.hasOwnProperty.call(v, "red") ? line(v.red) : ROBOT_DEFAULTS.red;
        if (y === undefined) keys.push("thresholds." + ROBOT_KEY + ".yellow");
        if (r === undefined) keys.push("thresholds." + ROBOT_KEY + ".red");
        if (y !== undefined && r !== undefined && y !== null && r !== null && r > y) keys.push("thresholds." + ROBOT_KEY + ".red");
        value = { yellow: y, red: r };
      }
      if (keys.length) {
        // The layer under reads the other numbers' lines too, so one answer names every key refused.
        const rest0 = Object.assign({}, t);
        delete rest0[ROBOT_KEY];
        let under = null;
        if (Object.keys(rest0).length) { const held0 = body.thresholds; body.thresholds = rest0; try { under = base(); } finally { body.thresholds = held0; } }
        const more = under && under.status === 400 && under.json && Array.isArray(under.json.keys) ? under.json.keys : [];
        return BAD_HEALTH(lang, Array.from(new Set(more.concat(keys))));
      }
      // The rest go to the layer under, which saves them and answers the lines as they stand.
      const rest = Object.assign({}, t);
      delete rest[ROBOT_KEY];
      const held = body.thresholds;
      let a;
      body.thresholds = rest;
      try { a = base(); } finally { body.thresholds = held; }
      if (!a || a.status !== 200) return a;
      m().robotLines = value;
      return withRobotLine(a, lang);
    }
    return null;
  }

  // ---- Section 2: certificates from an outside course ------------------------------------------------------
  const withOutside = (tp) => (tp && typeof tp === "object" && tp.id !== undefined ? Object.assign({}, tp, { outsideCourse: m().outside[String(tp.id)] === true }) : tp);
  const TRAINING_BAD = (lang, keys) => bad(400, "training.badDetails", T(lang, "Check the fields marked.", "Revise los campos marcados."), { keys });
  function trainingRoute(method, path, query, body, lang, base) {
    if (path === "/api/training/topics" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.topics)) a.json = Object.assign({}, a.json, { topics: a.json.topics.map(withOutside) });
      return a;
    }
    const one = /^\/api\/training\/topics\/([^/]+)$/.exec(path);
    if ((path === "/api/training/topics" && method === "POST") || (one && method === "PATCH")) {
      const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};
      const has = Object.prototype.hasOwnProperty.call(b, "outsideCourse");
      if (has) sent("topic", b);
      if (has && typeof b.outsideCourse !== "boolean") return TRAINING_BAD(lang, ["outsideCourse"]);
      const held = b.outsideCourse;
      if (has) delete b.outsideCourse;
      let a;
      try { a = base(); } finally { if (has) b.outsideCourse = held; }
      if (a && (a.status === 200 || a.status === 201) && a.json && a.json.topic) {
        if (has) m().outside[String(a.json.topic.id)] = held === true;
        a.json = Object.assign({}, a.json, { topic: withOutside(a.json.topic) });
      }
      return a;
    }
    if (path === "/api/hr/training" && method === "GET") {
      const a = base();
      // A paged call answers { records, nextCursor } (part 365), a call without paging the bare array.
      const stamp = (r) => {
        const byPerson = !!(r && r.certificate_path && m().personCerts[String(r.id)] === true);
        return Object.assign({}, r, { uploaded_by: r && r.certificate_path ? (byPerson ? r.user_id : seed.PEOPLE.admin.id) : null, uploaded_by_person: byPerson });
      };
      if (a && a.status === 200 && Array.isArray(a.json)) a.json = a.json.map(stamp);
      else if (a && a.status === 200 && a.json && Array.isArray(a.json.records)) a.json = Object.assign({}, a.json, { records: a.json.records.map(stamp) });
      return a;
    }
    return null;
  }

  // ---- Section 3: warnings and the logo -----------------------------------------------------------------------
  const isWarning = (x) => x && typeof x === "object" && !Array.isArray(x) && x.id !== undefined && typeof x.status === "string" && typeof x.type === "string"
    && (Object.prototype.hasOwnProperty.call(x, "incidentDate") || Object.prototype.hasOwnProperty.call(x, "incident_date"));
  const stampWarning = (x) => {
    const id = String(x.id);
    const day = String(x.incidentDate || x.incident_date || x.actionDate || TODAY).slice(0, 10);
    const createdAt = m().started[id] || x.createdAt || x.recordedAt || (day + "T14:30:00.000Z");
    const updatedAt = m().saved[id] || x.updatedAt || x.issuedAt || createdAt;
    return Object.assign({}, x, { createdAt, updatedAt });
  };
  const walk = (v) => (Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? (isWarning(v) ? stampWarning(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))) : v);
  function disciplineRoute(method, path, query, body, lang, base) {
    const a = base();
    if (!a || !(a.status >= 200 && a.status < 300) || !a.json || typeof a.json !== "object") return a;
    const one = /^\/api\/discipline\/([^/]+)$/.exec(path);
    if (method === "PUT" && one) m().saved[decodeURIComponent(one[1])] = seed.NOW_ISO;
    if (method === "POST" && path === "/api/discipline" && a.json.warning && a.json.warning.id !== undefined) { m().started[String(a.json.warning.id)] = seed.NOW_ISO; m().saved[String(a.json.warning.id)] = seed.NOW_ISO; }
    return Object.assign({}, a, { json: walk(a.json) });
  }
  const STORAGE = "https://storage.example.invalid/storage/v1/object/sign/";
  const PHOTO_BUCKETS = ["profile-photos", "issue-photos", "task-media"];
  // What a logo_url is stored as: <bucket>/<path> for a signed link or a path of a photo bucket, else as sent.
  const storedLogo = (v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return v;
    const s0 = String(v);
    if (s0.indexOf(STORAGE) === 0) return s0.slice(STORAGE.length).split("?")[0];
    const bucket = s0.split("/")[0];
    if (PHOTO_BUCKETS.indexOf(bucket) >= 0 && s0.indexOf("://") < 0) return s0;
    return s0;
  };
  const signedLogo = (stored) => {
    if (!stored) return stored === "" ? "" : stored;
    const bucket = String(stored).split("/")[0];
    if (PHOTO_BUCKETS.indexOf(bucket) < 0 || String(stored).indexOf("://") >= 0) return stored;
    m().logoReads += 1;
    // The token says when the link stops working, the way storage reads it (audit/part372-pictures.js). The scene
    // logoExpired hands out a first link already past its hour, as a read made more than an hour ago holds.
    const exp = Date.parse(seed.NOW_ISO) + (m().scene.logoExpired && m().logoReads === 1 ? -60000 : 3600000);
    const token = Buffer.from(JSON.stringify({ exp })).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return STORAGE + stored + "?token=" + token + "&read=" + m().logoReads;
  };
  const DASHBOARD_KEYS = ["display_name", "legal_name", "logo_url", "primary_color", "secondary_color", "address", "show_ein_on_reports", "updated_at"];
  const tierOf = () => {
    const p = me();
    if (!p) return "staff";
    const ov = (ctx.state && ctx.state.overrides && ctx.state.overrides[p.id]) || {};
    if (p.role === "admin" || p.isSuperAdmin === true || ov.manage_settings === true) return "all";
    if (p.role === "supervisor" || p.role === "super_admin") return "office";
    return "staff";
  };
  function settingsRoute(method, path, query, body, lang, base) {
    if (method === "PATCH" && body && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "logo_url")) {
      sent("settings", body);
      const held = body.logo_url;
      body.logo_url = storedLogo(held);
      m().logoStored = body.logo_url;
      let a;
      try { a = base(); } finally { body.logo_url = held; }
      return answerSettings(a);
    }
    return answerSettings(base());
  }
  function answerSettings(a) {
    if (!a || a.status !== 200 || !a.json || typeof a.json !== "object" || Array.isArray(a.json)) return a;
    const row = Object.assign({ checklistDayStartsAt: "04:00" }, a.json);
    const stored = m().logoStored !== undefined ? m().logoStored : m().scene.logo ? "profile-photos/company/logo-1.png" : storedLogo(row.logo_url);
    if (stored !== undefined) row.logo_url = signedLogo(stored);
    const tier = tierOf();
    if (tier === "all") return Object.assign({}, a, { json: row });
    if (tier === "office") { const out = { checklistDayStartsAt: row.checklistDayStartsAt }; DASHBOARD_KEYS.forEach((k) => { if (Object.prototype.hasOwnProperty.call(row, k)) out[k] = row[k]; }); return Object.assign({}, a, { json: out }); }
    return Object.assign({}, a, { json: { checklistDayStartsAt: row.checklistDayStartsAt } });
  }

  // ---- Section 4: the safety walk once a month -------------------------------------------------------------
  const MONTH = TODAY.slice(0, 7);
  const walkOf = (siteId) => {
    if (!m().walks) m().walks = {
      "s-1": { at: TODAY.slice(0, 8) + "10T18:00:00.000Z", day: TODAY.slice(0, 8) + "10", scheduledInspectionId: "insp-4", responseId: "fr-safety-1" },
      "s-2": { at: "2026-02-12T16:20:00.000Z", day: "2026-02-12", scheduledInspectionId: null, responseId: "fr-safety-0" },
      "s-3": null,
    };
    const w = m().walks[String(siteId)];
    return w ? Object.assign({}, w, { thisMonth: String(w.day).slice(0, 7) === MONTH }) : null;
  };
  const INSP_WORDS = {
    "inspections.notFound": ["Inspection not found", "No se encontr\u00f3 la inspecci\u00f3n"],
    "inspections.completedLocked": ["This inspection is completed. Its status and its safety walk cannot be changed.", "Esta inspecci\u00f3n est\u00e1 completada. Su estado y su recorrido de seguridad no se pueden cambiar."],
    "inspections.noSafetyPart": ["This inspection does not include the safety walk.", "Esta inspecci\u00f3n no incluye el recorrido de seguridad."],
    "inspections.safetyWalkNotDone": ["This site's safety walk is not done this month on another inspection, so this inspection keeps its own.", "El recorrido de seguridad de este sitio no se ha hecho este mes en otra inspecci\u00f3n, as\u00ed que esta inspecci\u00f3n conserva el suyo."],
    "access.insufficientPermissions": ["Insufficient permissions", "No tiene permiso para hacer esto"],
    "inspections.badDetails": ["Some details are missing or not valid.", "Faltan algunos datos o no son v\u00e1lidos."],
  };
  const inspRefuse = (lang, status, code, extra) => bad(status, code, T(lang, INSP_WORDS[code][0], INSP_WORDS[code][1]), extra);
  function walksRoute(method, path, query, body, lang, base) {
    if (path === "/api/inspections/safety-walks" && method === "GET") {
      const siteId = String(query.get("siteId") || "");
      if (!seed.SITES.some((x) => x.id === siteId)) return inspRefuse(lang, 400, "inspections.badDetails", { keys: ["siteId"] });
      sent("walk", { siteId });
      return ok({ siteId, lastWalk: walkOf(siteId) });
    }
    if (path === "/api/inspections/scheduled" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && Array.isArray(a.json)) a.json = a.json.map((r) => (m().dropped[String(r.id)] ? Object.assign({}, r, { with_safety: false }) : r));
      return a;
    }
    const one = /^\/api\/inspections\/scheduled\/([^/]+)$/.exec(path);
    if (one && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || typeof a.json !== "object") return a;
      const extra = { lastSafetyWalk: walkOf(a.json.site_id) };
      if (m().dropped[String(a.json.id)]) extra.with_safety = false;
      return Object.assign({}, a, { json: Object.assign({}, a.json, extra) });
    }
    const drop = /^\/api\/inspections\/scheduled\/([^/]+)\/drop-safety$/.exec(path);
    if (drop && method === "POST") {
      const id = decodeURIComponent(drop[1]);
      sent("drop-safety", { id });
      const p = me();
      const rows = (ctx.state && ctx.state.inspections) || [];
      const fallback = seed.SITES && rows.length === 0;
      const row = rows.find((r) => String(r.id) === id) || (fallback && id === "si-1" ? { id: "si-1", site_id: seed.SITES[0].id, status: "scheduled", assigned_to: "u-sup-1" } : null);
      if (!row) return inspRefuse(lang, 404, "inspections.notFound");
      const holds = p && (p.role === "admin" || p.role === "supervisor" || p.isSuperAdmin === true);
      if (!holds && String(row.assigned_to) !== String(p && p.id)) return inspRefuse(lang, 403, "access.insufficientPermissions");
      if (row.status !== "scheduled") return inspRefuse(lang, 409, "inspections.completedLocked");
      if (m().dropped[id] || row.with_safety === false) return inspRefuse(lang, 409, "inspections.noSafetyPart");
      const walk = walkOf(row.site_id);
      if (m().scene.walkGone || !walk || !walk.thisMonth || walk.scheduledInspectionId === id) return inspRefuse(lang, 409, "inspections.safetyWalkNotDone", { lastWalk: m().scene.walkGone ? null : walk });
      m().dropped[id] = true;
      return ok({ inspection: { id, withSafety: false }, voidedDrafts: 1, lastWalk: walk });
    }
    return null;
  }

  // ---- Section 5: a site whose days have no steps due ----------------------------------------------------------
  function noStepsRoute(method, path, query, body, lang, base) {
    const site = m().scene.noSteps ? String(m().scene.noSteps) : "";
    if (!site || method !== "GET") return null;
    if (path === "/api/reports/checklist-summary") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.sites)) {
        a.json = Object.assign({}, a.json, { sites: a.json.sites.map((x) => (String(x.siteId) !== site ? x : Object.assign({}, x, { notTracked: false, days: (x.days || []).map((d) => ({ date: d.date, due: 0, done: 0, checks: 0, counted: { due: 0, done: 0 }, shifts: [] })) }))) });
      }
      return a;
    }
    if (path === "/api/sites/" + site + "/checklist-record") {
      const a = base();
      // Its items stay listed, none of them due and none checked, so each day's percent is null.
      if (a && a.status === 200 && a.json && Array.isArray(a.json.days)) a.json = Object.assign({}, a.json, { days: a.json.days.map((d) => Object.assign({}, d, { items: (d.items || []).map((i) => Object.assign({}, i, { due: false, done: false, checks: [], doneAt: null, doneBy: null })), checks: [], counted: { due: 0, done: 0 }, shifts: [] })) });
      return a;
    }
    return null;
  }

  function route(method, path, query, body, lang, base) {
    { const n = noStepsRoute(method, path, query, body, lang, base); if (n) return n; }
    if (/^\/api\/inspections\/(safety-walks|scheduled)/.test(path)) { const w = walksRoute(method, path, query, body, lang, base); if (w) return w; }
    if (/^\/api\/discipline(\/|$)/.test(path) && path !== "/api/discipline/steps") return disciplineRoute(method, path, query, body, lang, base);
    if (path === "/api/settings" && (method === "GET" || method === "PATCH")) return settingsRoute(method, path, query, body, lang, base);
    const h = /^\/api\/health\//.test(path) ? healthRoute(method, path, query, body, lang, base) : null;
    if (h) return h;
    const tr = /^\/api\/(training\/topics|hr\/training$)/.test(path) ? trainingRoute(method, path, query, body, lang, base) : null;
    if (tr) return tr;
    return base();
  }

  return {
    route,
    setScene: (o) => {
      const x = Object.assign({}, o || {});
      if (x.personCerts) { m().personCerts = x.personCerts; delete x.personCerts; }
      if (x.outside) { m().outside = x.outside; delete x.outside; }
      if (Object.prototype.hasOwnProperty.call(x, "logo")) m().logoStored = undefined;
      if (x.walks) { walkOf("s-1"); Object.assign(m().walks, x.walks); delete x.walks; }
      Object.assign(m().scene, x);
    },
    sent: () => m().sent,
    model: () => m(),
    reset: () => { model = null; },
  };
};
