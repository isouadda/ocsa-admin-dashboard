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
// Every value is invented: the test accounts, the devices and the days.
"use strict";

module.exports = (ctx) => {
  const { seed, ok, clone, person } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const TODAY = seed.TODAY;
  const addDays = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
  const me = () => person();
  const uid = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");

  let model = null;
  const m = () => {
    if (!model) model = { scene: {}, sent: [], robot: null, robotLines: null };
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

  function route(method, path, query, body, lang, base) {
    const h = /^\/api\/health\//.test(path) ? healthRoute(method, path, query, body, lang, base) : null;
    if (h) return h;
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
