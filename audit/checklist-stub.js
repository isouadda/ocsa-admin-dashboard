// What the API answers for Checklist Results (the dashboard's part 358), as ocsa-api main abfb2e6 builds
// it, laid over every other layer once a run arms it with setChecklist358:
//
//   GET /api/sites/:id/checklist-record?from=&to=&shift=   routes/sites.js and helpers/checklistRecord.js:
//       from and to both days, from not after to, 31 days at most, else 400 records.badRange with keys;
//       shift one of the site's shifts at a site with two or more, else 400 sessions.shiftInvalid, and
//       ignored at a site with fewer; a reference site answers notTracked and no days. Each day lists
//       the items due that day or checked that day by the checklist's own rules: per visit and daily
//       work due every day, every other day work due unless it was checked the day before, weekly to
//       quarterly work due from the start of its period until it is done (a check that day still
//       counts it due), as needed never due. done, completedAt, completedBy and notes are the day's
//       first check's, and checks lists every check that day.
//   GET /api/sites/:siteId/shift-blocks/schedule?date=      helpers/blockSchedule.js: every shift with
//       its displayLabel and the blocks that run that day, each with its window, in time order.
//   GET /api/shift-sessions/by-site                          routes/shiftSessions.js: the base answer, with
//       the model's sites answered from the model, one row per person per day, the latest.
//   GET /api/periodic-work?siteId=                           helpers/periodicWork.js: the model site's
//       repeating work with its last check, by whom, and its state on today's checklist day.
//
// The model: Harbor Point Center (S[0]) runs Day (8:00 AM to 4:00 PM, two blocks) and Night (6:00 PM to
// 10:00 PM), with work in five zones, work tied to no shift, weekly, monthly and quarterly work and an
// as needed task. Two people work it. Yesterday is the seeded day, scripted check by check: the Day shift
// checks 7 of its 9 steps due from 8:42 AM to 2:57 PM, one step twice by both people, and the Night
// shift checks all 4 of its steps in the last four minutes of the shift. Lakeside Medical Plaza (S[1])
// has no shifts, and Riverbend Logistics Hub (S[2]) keeps its list as a reference. Every other day back
// to the start of the year is drawn from a fixed hash, so a range and a trend have something to draw.
// The people are named for what they are, Staff One and Staff Two, and every value is invented.
"use strict";

module.exports = (ctx) => {
  const { seed, ok } = ctx;
  const S = seed.SITES;
  const TZ = seed.TIMEZONE;
  const TODAY = seed.TODAY;
  const SEEDED = seed.shift(-1);
  const RANGE_MAX = 31;
  const ONE = { id: "u-cr-1", first: "Staff", last: "One" };
  const TWO = { id: "u-cr-2", first: "Staff", last: "Two" };
  const nameOf = (p) => p.first + " " + p.last;
  const person = (p) => ({ name: nameOf(p), initials: p.first[0] + p.last[0] });
  const T = (lang, en, es) => (lang === "es" ? es : en);

  // ---- the company's clock -------------------------------------------------------------------------
  const clock = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const wall = (at) => { const p = {}; clock.formatToParts(new Date(at)).forEach((x) => { p[x.type] = x.value; }); return { day: p.year + "-" + p.month + "-" + p.day, minutes: (Number(p.hour) % 24) * 60 + Number(p.minute) }; };
  const instant = (day, hm) => {
    const [h, m] = hm.split(":").map(Number);
    const want = Date.parse(day + "T00:00:00Z") + (h * 60 + m) * 60000;
    let at = want;
    for (let i = 0; i < 3; i += 1) { const w = wall(at); at += want - (Date.parse(w.day + "T00:00:00Z") + w.minutes * 60000); }
    return new Date(at).toISOString();
  };
  const addDays = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const isDay = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
  const between = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
  // The checklist day a check belongs to: the company's day, from 4:00 AM.
  const dayOf = (at) => { const w = wall(at); return w.minutes < 240 ? addDays(w.day, -1) : w.day; };
  const weekday = (day) => new Date(day + "T12:00:00Z").getUTCDay();

  // ---- the model -------------------------------------------------------------------------------------
  const SHIFTS = {
    [S[0].id]: [
      { label: "Day", es: "Día", blocks: [{ id: "crb-1", label: "Morning", es: "Mañana", start: "08:00", end: "12:00" }, { id: "crb-2", label: "Afternoon", es: "Tarde", start: "12:00", end: "16:00" }] },
      { label: "Night", es: "Noche", blocks: [{ id: "crb-3", label: "Evening", es: "Noche", start: "18:00", end: "22:00" }] },
    ],
    [S[1].id]: [],
    [S[2].id]: [],
  };
  const REFERENCE = [S[2].id];
  const ZONES = {
    Lobby: "Vestíbulo", Restrooms: "Baños", Offices: "Oficinas", "Break room": "Sala de descanso", Corridors: "Pasillos",
    "Waiting room": "Sala de espera", "Clinic hall": "Pasillo de la clínica",
  };
  // [id, zone, English, Spanish, frequency, shift, block]
  const ITEMS = {
    [S[0].id]: [
      ["cr-d1", "Lobby", "Dust mop the lobby floor", "Barrer con mopa el piso del vestíbulo", "daily", "Day", "crb-1"],
      ["cr-d2", "Lobby", "Disinfect the entrance door handles", "Desinfectar las manijas de la puerta de entrada", "daily", "Day", "crb-1"],
      ["cr-d3", "Lobby", "Empty the lobby bins", "Vaciar los botes del vestíbulo", "per_visit", "Day", "crb-1"],
      ["cr-a1", "Lobby", "Refill the hand sanitizer stations", "Rellenar los dispensadores de gel desinfectante", "daily", null, null],
      ["cr-x1", "Lobby", "Clean up a spill", "Limpiar un derrame", "as_needed", "Day", "crb-1"],
      ["cr-d4", "Restrooms", "Clean and disinfect the toilets", "Limpiar y desinfectar los inodoros", "daily", "Day", "crb-1"],
      ["cr-d5", "Restrooms", "Restock the paper towels", "Reponer las toallas de papel", "daily", "Day", "crb-1"],
      ["cr-d6", "Restrooms", "Mop the restroom floors", "Trapear los pisos de los baños", "daily", "Day", "crb-1"],
      ["cr-p1", "Restrooms", "Scrub the restroom grout", "Restregar las juntas de los baños", "weekly", "Day", "crb-2"],
      ["cr-d7", "Offices", "Vacuum the office carpets", "Aspirar las alfombras de las oficinas", "daily", "Day", "crb-2"],
      ["cr-d8", "Offices", "Empty the office bins", "Vaciar los botes de las oficinas", "daily", "Day", "crb-2"],
      ["cr-d9", "Offices", "Dust the window sills", "Quitar el polvo de los alféizares", "every_other_day", "Day", "crb-2"],
      ["cr-p2", "Offices", "Wash the office windows", "Lavar las ventanas de las oficinas", "monthly", "Day", "crb-2"],
      ["cr-n1", "Break room", "Wipe the break room tables", "Limpiar las mesas de la sala de descanso", "daily", "Night", "crb-3"],
      ["cr-n2", "Break room", "Clean the microwave", "Limpiar el microondas", "daily", "Night", "crb-3"],
      ["cr-n3", "Corridors", "Vacuum the corridors", "Aspirar los pasillos", "daily", "Night", "crb-3"],
      ["cr-n4", "Corridors", "Spot clean the walls", "Limpiar las manchas de las paredes", "daily", "Night", "crb-3"],
      ["cr-p3", "Corridors", "Strip and wax the corridor floor", "Decapar y encerar el piso del pasillo", "quarterly", "Night", "crb-3"],
    ],
    [S[1].id]: [
      ["cr-m1", "Waiting room", "Wipe the waiting room chairs", "Limpiar las sillas de la sala de espera", "daily", null, null],
      ["cr-m2", "Waiting room", "Empty the waiting room bins", "Vaciar los botes de la sala de espera", "daily", null, null],
      ["cr-m3", "Clinic hall", "Mop the clinic hall", "Trapear el pasillo de la clínica", "daily", null, null],
      ["cr-m4", "Clinic hall", "Disinfect the elevator buttons", "Desinfectar los botones del elevador", "daily", null, null],
      ["cr-m5", "Clinic hall", "Dust the high ledges", "Quitar el polvo de las repisas altas", "weekly", null, null],
    ],
    [S[2].id]: [],
  };
  const itemsOf = (siteId) => (ITEMS[siteId] || []).map(([id, zone, label, es, frequency, shift, block]) => ({ id, zone, label, es, frequency, shift, block }));
  const PERIOD_OF = { per_visit: "today", daily: "today", every_other_day: "today", weekly: "week", monthly: "month", quarterly: "quarter", as_needed: "as_needed" };

  // ---- the checks ------------------------------------------------------------------------------------
  // The seeded day, check by check, and today up to 9:30 PM.
  const SCRIPT = {
    [SEEDED]: {
      "cr-d1": [["08:42", ONE]], "cr-d2": [["08:55", ONE], ["13:10", TWO]], "cr-d3": [["09:20", ONE]], "cr-a1": [["09:40", ONE]],
      "cr-d4": [["10:05", TWO]], "cr-d6": [["10:30", TWO]], "cr-x1": [["11:15", ONE]], "cr-d8": [["12:45", ONE]], "cr-d9": [["13:30", ONE]],
      "cr-p1": [["14:57", TWO]],
      "cr-n1": [["21:56", ONE]], "cr-n2": [["21:57", ONE]], "cr-n3": [["21:58", ONE]], "cr-n4": [["21:59", ONE]],
      "cr-m1": [["09:10", TWO]], "cr-m2": [["09:25", TWO]], "cr-m3": [["10:40", TWO]],
    },
    [TODAY]: {
      "cr-d1": [["08:50", TWO]], "cr-d2": [["09:05", TWO]], "cr-d3": [["09:30", ONE]], "cr-a1": [["10:15", ONE]], "cr-d4": [["10:40", ONE]],
      "cr-d5": [["11:00", ONE]], "cr-d6": [["11:20", TWO]], "cr-d7": [["13:45", TWO]], "cr-d8": [["14:10", TWO]],
      "cr-n1": [["18:40", TWO]], "cr-n3": [["19:55", TWO]],
      "cr-m1": [["08:30", ONE]], "cr-m2": [["08:45", ONE]], "cr-m3": [["09:50", ONE]], "cr-m4": [["10:05", ONE]],
    },
  };
  // Every other day: a fixed hash decides whether each daily step was checked, when and by whom.
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const START = "2026-01-01";
  const generated = (item, day) => {
    const k = hash(item.id + "|" + day);
    const rate = 70 + (hash(day) % 31);
    const night = item.shift === "Night";
    const base = night ? 18 * 60 + 20 : 8 * 60 + 35;
    const at = (n) => { const m = base + n; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
    const who = k % 3 === 0 ? TWO : ONE;
    if (item.frequency === "weekly") return weekday(day) === (item.id === "cr-m5" ? 3 : 1) && day >= "2026-02-01" ? [[item.id === "cr-m5" ? "11:30" : "14:57", TWO]] : [];
    if (item.id === "cr-p2") return day === "2026-02-12" ? [["13:00", ONE]] : [];
    if (item.id === "cr-p3") return day === "2026-01-10" ? [["20:30", ONE]] : [];
    if (item.frequency === "as_needed") return k % 7 === 0 ? [[at(k % 200), who]] : [];
    if (item.frequency === "every_other_day") return between(START, day) % 2 === 0 && k % 100 < rate ? [[at(150 + (k % 60)), who]] : [];
    return k % 100 < rate ? [[at(k % (night ? 200 : 380)), who]] : [];
  };
  // Checks a case adds, by site: [{ taskId, day, hm, by }].
  let added = [];
  // Every check of an item from the start of the year to today, oldest first: [{ at, day, by }].
  const checksOf = (siteId, item) => {
    const out = [];
    for (let d = START; d <= TODAY; d = addDays(d, 1)) {
      const scripted = SCRIPT[d] && (siteId === S[0].id || siteId === S[1].id) ? (SCRIPT[d][item.id] || []) : null;
      (scripted || generated(item, d)).forEach(([hm, by]) => out.push({ at: instant(d, hm), by }));
    }
    added.filter((a) => a.siteId === siteId && a.taskId === item.id).forEach((a) => out.push({ at: instant(a.day, a.hm), by: a.by === "two" ? TWO : ONE }));
    const now = Date.parse(seed.NOW_ISO);
    return out.filter((c) => Date.parse(c.at) <= now).map((c) => Object.assign(c, { day: dayOf(c.at) })).sort((a, b) => a.at.localeCompare(b.at));
  };

  // ---- the record ------------------------------------------------------------------------------------
  const periodStart = (period, day) => {
    if (period === "week") return addDays(day, -((weekday(day) + 6) % 7));
    if (period === "month") return day.slice(0, 8) + "01";
    if (period === "quarter") { const m = Number(day.slice(5, 7)); return day.slice(0, 5) + String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0") + "-01"; }
    return day;
  };
  const view = (c) => ({ completedAt: c.at, completedBy: person(c.by), notes: null });
  function record(siteId, from, to, shift, lang) {
    const items = itemsOf(siteId).filter((i) => !shift || !i.shift || i.shift === shift);
    const all = new Map(items.map((i) => [i.id, checksOf(siteId, i)]));
    const days = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
      const rows = [];
      items.forEach((i) => {
        const checks = all.get(i.id);
        const onDay = checks.filter((c) => c.day === day);
        const before = checks.filter((c) => c.day < day);
        const last = before.length ? before[before.length - 1] : null;
        const period = PERIOD_OF[i.frequency] || "today";
        let due = false;
        if (period === "today") due = !(i.frequency === "every_other_day" && last && last.day === addDays(day, -1));
        else if (period !== "as_needed") due = !(last && last.day >= periodStart(period, day));
        if (!due && onDay.length === 0) return;
        const first = onDay[0] || null;
        rows.push({
          taskId: i.id, zone: i.zone, building: null, floor: null, label: i.label,
          display: { label: lang === "es" ? i.es : i.label, zone: lang === "es" ? (ZONES[i.zone] || i.zone) : i.zone },
          frequency: i.frequency, period, priority: "standard", touchpoint: false, critical: false, due, done: onDay.length > 0,
          completedAt: first ? first.at : null, completedBy: first ? person(first.by) : null, notes: null, checks: onDay.map(view),
        });
      });
      days.push({ date: day, shift: shift || null, items: rows });
    }
    return { site: { id: siteId, name: (S.find((s) => s.id === siteId) || {}).name || "" }, from, to, shift: shift || null, touchpointOnly: false, days };
  }
  const refuse = (status, json) => ({ status, json });

  function recordRoute(siteId, query, lang) {
    const from = String(query.get("from") || "").trim(), to = String(query.get("to") || "").trim();
    const keys = [];
    if (!isDay(from)) keys.push("from");
    if (!isDay(to)) keys.push("to");
    if (keys.length === 0 && (from > to || between(from, to) + 1 > RANGE_MAX)) keys.push("from", "to");
    if (keys.length) {
      return refuse(400, { error: T(lang, "Check the dates: each is a day, the first is not after the last, and a record covers at most 31 days",
        "Revise las fechas: cada una es un día, la primera no puede ser posterior a la última y un registro abarca como máximo 31 días"), code: "records.badRange", keys });
    }
    if (REFERENCE.indexOf(siteId) >= 0) {
      return ok({ site: { id: siteId, name: (S.find((s) => s.id === siteId) || {}).name || "" }, from, to, shift: null, touchpointOnly: false, days: [], notTracked: true, checklistMode: "reference" });
    }
    const shifts = SHIFTS[siteId] || [];
    let shift = null;
    if (query.has("shift")) {
      const wanted = String(query.get("shift")).trim();
      if (wanted && shifts.length >= 2) {
        if (!shifts.some((s) => s.label === wanted)) {
          return refuse(400, { error: T(lang, "Choose one of this site's shifts: ", "Elija uno de los turnos de este sitio: ") + shifts.map((s) => (lang === "es" ? s.es : s.label)).join(", "), code: "sessions.shiftInvalid" });
        }
        shift = wanted;
      }
    }
    return ok(record(siteId, from, to, shift, lang));
  }

  function scheduleRoute(siteId, query, lang) {
    const date = query.get("date") || TODAY;
    if (!isDay(date)) return refuse(400, { error: T(lang, "Check the details", "Revise los datos"), code: "shiftBlocks.badDetails", keys: ["date"] });
    const items = itemsOf(siteId);
    return ok({
      siteId, day: date, weekday: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][weekday(date)], checklistMode: REFERENCE.indexOf(siteId) >= 0 ? "reference" : "standard",
      shifts: (SHIFTS[siteId] || []).map((s) => ({
        label: s.label, displayLabel: lang === "es" ? s.es : s.label,
        blocks: s.blocks.map((b) => ({
          id: b.id, shiftLabel: s.label, label: b.label, display: { label: lang === "es" ? b.es : b.label }, startTime: b.start, endTime: b.end, crossesMidnight: false,
          kind: "work", kindName: T(lang, "Work", "Trabajo"), daysOfWeek: null,
          steps: items.filter((i) => i.block === b.id).map((i) => ({ id: i.id, label: i.label, display: { label: lang === "es" ? i.es : i.label, zone: lang === "es" ? (ZONES[i.zone] || i.zone) : i.zone },
            frequency: i.frequency, daysOfWeek: null, period: PERIOD_OF[i.frequency] || "today", dueToday: i.frequency !== "as_needed", doneThisPeriod: null, shownToday: true })),
        })),
      })),
    });
  }

  // Who started a shift at the model's sites: one row per person per day, the latest, as the range form
  // answers; the date form answers today's and any still open.
  const SESSIONS = {
    [S[0].id]: (day) => (day === SEEDED
      ? [{ by: TWO, shift: "Day", start: "08:50", end: "15:00" }, { by: ONE, shift: "Night", start: "21:40", end: "22:05" }]
      : day === TODAY ? [{ by: ONE, shift: "Day", start: "08:35", end: "15:10" }, { by: TWO, shift: "Night", start: "18:05", end: null }]
        : [{ by: ONE, shift: "Day", start: "08:30", end: "16:00" }, { by: TWO, shift: "Night", start: "18:10", end: "22:00" }]),
    [S[1].id]: (day) => (day === SEEDED ? [{ by: TWO, shift: null, start: "09:00", end: "11:00" }] : [{ by: ONE, shift: null, start: "08:20", end: "11:30" }]),
  };
  const sessionRow = (siteId, day, s, i) => ({
    sessionId: "crs-" + siteId + "-" + day + "-" + i, userId: s.by.id, name: nameOf(s.by), role: "staff", buildingName: null, floorNumber: null, source: "assignment",
    isAssignedSite: true, sessionDate: day, startedAt: instant(day, s.start), endedAt: s.end ? instant(day, s.end) : null, endedBy: s.end ? "self" : null,
    elapsedMinutes: 0, needsReview: false, tasksTotal: 0, tasksCompleted: 0, notTracked: false, shiftLabel: s.shift,
  });
  function sessionsRoute(query, base) {
    const a = base();
    if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.sites)) return a;
    const range = query.get("start_date") && query.get("end_date") ? [query.get("start_date"), query.get("end_date")] : null;
    const days = range ? (() => { const out = []; for (let d = range[0]; d <= range[1] && out.length < 32; d = addDays(d, 1)) out.push(d); return out; })() : [query.get("date") || TODAY];
    const mine = Object.keys(SESSIONS).filter((id) => REFERENCE.indexOf(id) < 0);
    const sites = a.json.sites.filter((s) => mine.indexOf(String(s.siteId)) < 0);
    mine.forEach((id) => {
      const people = [];
      days.filter((d) => d <= TODAY).forEach((d) => {
        const rows = SESSIONS[id](d).map((s, i) => sessionRow(id, d, s, i)).filter((r) => Date.parse(r.startedAt) <= Date.parse(seed.NOW_ISO));
        rows.forEach((r) => { if (r.endedAt && Date.parse(r.endedAt) > Date.parse(seed.NOW_ISO)) r.endedAt = null; });
        const byPerson = new Map();
        rows.forEach((r) => { const was = byPerson.get(r.userId); if (!was || was.startedAt < r.startedAt) byPerson.set(r.userId, r); });
        byPerson.forEach((r) => people.push(r));
      });
      if (people.length) sites.push({ siteId: id, siteName: (S.find((s) => s.id === id) || {}).name || "", notTracked: false, people });
    });
    a.json = Object.assign({}, a.json, { sites: sites.sort((x, y) => String(x.siteName).localeCompare(String(y.siteName))) });
    return a;
  }

  // Periodic work at a model site, on today's checklist day.
  function periodicRoute(siteId, lang) {
    const out = [];
    itemsOf(siteId).filter((i) => ["week", "month", "quarter"].indexOf(PERIOD_OF[i.frequency]) >= 0).forEach((i) => {
      const checks = checksOf(siteId, i);
      const last = checks.length ? checks[checks.length - 1] : null;
      const period = PERIOD_OF[i.frequency];
      const start = periodStart(period, TODAY);
      const done = !!last && last.day >= start;
      const next = done ? (period === "week" ? addDays(start, 7) : period === "month" ? periodStart("month", addDays(start, 32)) : periodStart("quarter", addDays(start, 95))) : start;
      const end = period === "week" ? addDays(next, 6) : period === "month" ? addDays(periodStart("month", addDays(next, 32)), -1) : addDays(periodStart("quarter", addDays(next, 95)), -1);
      out.push({ siteId, siteName: (S.find((s) => s.id === siteId) || {}).name || "", taskId: i.id, label: i.label, zone: i.zone,
        display: { label: lang === "es" ? i.es : i.label, zone: lang === "es" ? (ZONES[i.zone] || i.zone) : i.zone }, frequency: i.frequency,
        lastDoneAt: last ? last.at : null, lastDoneBy: last ? person(last.by) : null, nextDueOn: next, dueBy: end, state: done ? "done" : "due" });
    });
    return ok({ items: out });
  }

  function route(method, path, query, body, said, base) {
    const lang = query.get("locale") === "es" || query.get("locale") === "en" ? query.get("locale") : said === "es" ? "es" : "en";
    if (method !== "GET") return base();
    const rec = /^\/api\/sites\/([^/]+)\/checklist-record$/.exec(path);
    if (rec && ITEMS[decodeURIComponent(rec[1])]) return recordRoute(decodeURIComponent(rec[1]), query, lang);
    const sch = /^\/api\/sites\/([^/]+)\/shift-blocks\/schedule$/.exec(path);
    if (sch && SHIFTS[decodeURIComponent(sch[1])]) return scheduleRoute(decodeURIComponent(sch[1]), query, lang);
    if (path === "/api/shift-sessions/by-site") return sessionsRoute(query, base);
    if (path === "/api/periodic-work" && query.get("siteId") && ITEMS[query.get("siteId")] && REFERENCE.indexOf(query.get("siteId")) < 0) return periodicRoute(query.get("siteId"), lang);
    return base();
  }

  return {
    route,
    // A check a case adds, as a person makes it: on day at hm, by "one" or "two".
    addCheck: (siteId, taskId, day, hm, by) => { added.push({ siteId, taskId, day, hm, by }); },
    reset: () => { added = []; },
    // What the cases read the model by: the seeded day, the people, and the record the API would answer.
    model: { SEEDED, TODAY, ONE: nameOf(ONE), TWO: nameOf(TWO), SHIFTS, ITEMS, REFERENCE, record: (siteId, from, to, shift, lang) => record(siteId, from, to, shift, lang || "en") },
  };
};
