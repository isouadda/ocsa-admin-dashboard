// What the stub answers only while the pictures of the screen are taken (Step 278). audit/stubs.js lays
// it over every step's answers once a run arms setStep278, which npm run shots does and nothing else,
// so every other run is answered as before. Each part below draws the screens of one group of guide
// entries that no check had drawn, and answers null for any other call, which the stub then answers
// the way it always has. Every value is invented.
"use strict";

// Weekly patterns, inspection template kinds, a site's contract reference and service lines, the bell
// in Spanish and the time off types.
function schedulePart(ctx) {
  const { seed, state, ok, clone } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const S = seed.SITES;
  const at = (n, hm) => seed.shift(n) + "T" + hm + ":00Z";

  // ---- weekly patterns (routes/shiftPatterns.js, patternShape in helpers/shiftPatterns.js) -------
  // Days are the API's keys, mon to sun, and each pattern says how far ahead it is filled.
  const PATTERNS = [
    { id: "pt-1", userId: "u-staff-6", userName: "Ngozi Okonkwo", siteId: S[1].id, siteName: S[1].name, days: ["mon", "wed", "fri"],
      startTime: "06:00", endTime: "14:00", overnight: false, buildingName: "Clinic", floorNumber: "1", serviceCategory: null, notes: null,
      startsOn: seed.shift(-30), endsOn: null, status: "active", generatedThrough: seed.shift(53), replacesPatternId: null,
      upcomingShifts: 22, createdAt: at(-31, "15:00"), endedAt: null },
    { id: "pt-2", userId: "u-staff-9", userName: "Yuki Tanabe", siteId: S[0].id, siteName: S[0].name, days: ["tue", "thu"],
      startTime: "18:00", endTime: "02:00", overnight: true, buildingName: "North Wing", floorNumber: "2", serviceCategory: null, notes: "Covering nights.",
      startsOn: seed.shift(-14), endsOn: seed.shift(45), status: "active", generatedThrough: seed.shift(45), replacesPatternId: null,
      upcomingShifts: 13, createdAt: at(-15, "14:00"), endedAt: null },
  ];
  const patternsRoute = (method, path, query) => {
    if (method !== "GET") return null;
    if (path === "/api/schedule/patterns") {
      const status = query.get("status") || "active";
      const userId = query.get("userId"), siteId = query.get("siteId");
      return ok({ patterns: PATTERNS.filter((p) => (status === "all" || p.status === status)
        && (!userId || p.userId === userId) && (!siteId || p.siteId === siteId)) });
    }
    const m = /^\/api\/schedule\/patterns\/([^/]+)$/.exec(path);
    if (m) {
      const p = PATTERNS.find((x) => x.id === decodeURIComponent(m[1]));
      return p ? ok({ pattern: p }) : { status: 404, json: { error: "That pattern is not on the schedule", code: "patterns.notFound" } };
    }
    return null;
  };

  // ---- inspection templates (routes/inspections.js) ------------------------------------------------
  // Each template carries its kind. The stub's own rows are given theirs, and its list answers them.
  const KINDS = { "tp-1": "supervisor", "tp-2": "audit" };
  const templatesRoute = (method, path) => {
    if (!/^\/api\/inspections\/templates/.test(path)) return null;
    if (!state.templates) {
      state.templates = [
        { id: "tp-1", name: "Monthly quality walk", description: "Occupied floors, lobby and restrooms.", item_count: 10, max_total_score: 100, is_active: true },
        { id: "tp-2", name: "Dock area check", description: "Loading dock and waste area.", item_count: 6, max_total_score: 60, is_active: true },
      ];
    }
    state.templates.forEach((tp) => { if (typeof tp.kind !== "string") tp.kind = KINDS[tp.id] || "supervisor"; });
    return null;
  };

  // ---- a site's contract reference and service lines (GET /api/sites/profile/:id, siteView) --------
  // Riverbend Logistics Hub alone, which no other picture opens, so every other site reads as before.
  const LINE_NAMES = { industrial: ["Industrial", "Industrial"], day_porter: ["Day porter", "Conserje de d\u00eda"] };
  const PROFILE_SITE = S[2].id;
  const profileRoute = (method, path, lang) => {
    if (method !== "GET" || path !== "/api/sites/profile/" + PROFILE_SITE) return null;
    const s0 = (state.sites || []).find((x) => x.id === PROFILE_SITE) || S[2];
    const lines = ["industrial", "day_porter"];
    return ok({
      site: {
        id: s0.id, name: s0.name, status: s0.status || "active",
        address_line: s0.address, address_line1: s0.address, city: s0.city, state: s0.state, zip_code: s0.zip,
        client_name: "Fairhaven Property Group", prime_contractor: "None",
        client_contact_name: "R. Villanueva", client_contact_email: "contact@fairhavenpg.example.invalid", client_contact_phone: "2155559200",
        contract_type: "subcontractor", contract_value_monthly: 12600, billing_frequency: "monthly",
        contract_start_date: seed.shift(-280), contract_end_date: seed.shift(450),
        site_notes: "Dock and warehouse floors nightly, break rooms by day.",
        contract_reference: "RLH-2026-014", service_lines: lines,
        contractReference: "RLH-2026-014", serviceLines: lines, serviceLineNames: lines.map((c) => T(lang, LINE_NAMES[c][0], LINE_NAMES[c][1])),
      },
      staff: (state.staff || []).filter((p) => p.site_id === PROFILE_SITE)
        .map((p) => ({ id: p.id, name: p.name, first_name: p.first_name, last_name: p.last_name, role: p.role, status: p.status })),
      zones: ["Dock", "Break Room"],
      floorPlans: [],
      taskCount: 1,
      issueSummary: { open_count: 1, in_progress_count: 1, resolved_count: 0 },
      inspectionSummary: { avg_score: 78, total: 1, last_inspection: seed.shift(-26) },
      marketplaceSummary: { total_pickups: 1, worked: 0, pending: 1 },
      upcomingShifts: (state.schedule || []).filter((sh) => sh.site_id === PROFILE_SITE).map((sh) => ({
        id: sh.id, scheduled_date: sh.scheduled_date, start_time: sh.start_time, end_time: sh.end_time, user_name: sh.user_name,
        first_name: String(sh.user_name || "").split(" ")[0], last_name: String(sh.user_name || "").split(" ").slice(1).join(" "), status: sh.status,
      })),
      supplies: [],
    });
  };

  // ---- the bell in Spanish (routes/notifications.js answers each notice in the language asked) -----
  // The stub's notices, by id, in Spanish. A note a person typed stays as it was typed.
  const NOTICES_ES = {
    "n-1": ["Tiempo libre aprobado", "Su solicitud de cuatro d\u00edas est\u00e1 aprobada."],
    "n-2": ["Informe presentado", "Se present\u00f3 un informe de incidente en Harbor Point Center."],
    "n-3": ["Incidencia informada", "Piso del vest\u00edbulo rayado despu\u00e9s de una entrega."],
    "n-4": ["Solicitud de suministros pendiente", "Bolsas para basura 40x46, seis cajas."],
    "n-5": ["Turno sin cubrir", "Riverbend Logistics Hub, turno de noche."],
    "n-6": ["Inspecci\u00f3n completada", "El recorrido mensual de calidad obtuvo 94 por ciento."],
    "n-7": ["Se abri\u00f3 un caso", "Se present\u00f3 una inquietud que necesita un responsable."],
    "n-262-1": ["Capacitaci\u00f3n pendiente de aprobaci\u00f3n", "Respuesta a derrames: un intento espera a un capacitador."],
    "n-262-2": ["Capacitaci\u00f3n por vencer", "Un registro vence en menos de 30 d\u00edas."],
    "n-270-1": ["Una firma se devolvi\u00f3 como incorrecta", "Credencial: This badge opens the other building, not mine."],
  };
  const noticesRoute = (method, path, lang) => {
    if (lang !== "es" || method !== "GET" || path !== "/api/notifications" || !state.notifications) return null;
    const rows = state.notifications.map((n) => (NOTICES_ES[n.id] ? Object.assign({}, n, { title: NOTICES_ES[n.id][0], body: NOTICES_ES[n.id][1] }) : n));
    return ok({ notifications: rows, unread: rows.filter((n) => !n.readAt).length });
  };

  // ---- time off types (routes/timeOff.js, helpers/timeOff.js) ---------------------------------------
  // The API's leave codes, each with the label helpers/timeOff.js sends, in English whatever the
  // language asked, which is what the screen draws.
  const LEAVE = {
    paid_sick: ["Paid sick leave", "Licencia por enfermedad pagada"],
    unpaid: ["Unpaid time off", "Tiempo libre sin goce de sueldo"],
    bereavement_personal: ["Bereavement and personal", "Duelo y asuntos personales"],
    jury_duty: ["Jury duty", "Servicio como jurado"],
    military: ["Military leave", "Licencia militar"],
  };
  const LEAVE_OF = { vacation: "unpaid", sick: "paid_sick" };
  const leaveView = (r, lang) => {
    const code = LEAVE[r.leaveType] ? r.leaveType : (LEAVE_OF[r.leaveType] || "unpaid");
    return Object.assign({}, r, { leaveType: code, leaveTypeLabel: LEAVE[code][0] });
  };
  const timeOffRoute = (method, path, query, lang) => {
    if (method !== "GET" || !state.timeOff) return null;
    if (path === "/api/time-off") {
      const status = query.get("status") || "requested";
      const userId = query.get("userId") || "";
      const rows = state.timeOff.filter((r) => (status === "all" || r.status === status) && (!userId || String(r.userId) === String(userId)));
      return ok({ requests: rows.map((r) => leaveView(r, lang)), total: rows.length });
    }
    const m = /^\/api\/time-off\/([^/]+)$/.exec(path);
    if (m) {
      const r = state.timeOff.find((x) => x.id === decodeURIComponent(m[1]));
      return r ? ok({ request: leaveView(clone(r), lang) }) : null;
    }
    return null;
  };

  return (method, path, query, body, lang) => patternsRoute(method, path, query)
    || templatesRoute(method, path)
    || profileRoute(method, path, lang)
    || noticesRoute(method, path, lang)
    || timeOffRoute(method, path, query, lang)
    || null;
}

// The equipment register, the kept records, touchpoints, periodic work, Workspace and the chat records.
function equipmentPart(ctx) {
  const { seed, state, ok, refuse, person, tPersonName, siteName, grant } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  // A value written in each language, as [en, es], or one written once.
  const W = (lang, pair) => (Array.isArray(pair) ? T(lang, pair[0], pair[1]) : pair);
  const S = seed.SITES;
  const TODAY = seed.TODAY;
  const day = (n) => seed.shift(n);
  const at = (n, hm) => seed.shift(n) + "T" + hm + ":00Z";
  const who = (id) => ({ id, name: tPersonName(id) });
  const MARCUS = seed.PEOPLE.supervisor.id, DANA = seed.PEOPLE.admin.id;
  const TOMASZ = "u-staff-5", NGOZI = "u-staff-6", ELENA = "u-staff-7";
  const initials = (id) => tPersonName(id).split(" ").map((w) => w.charAt(0)).join("").toUpperCase();

  // ---- the equipment register (routes/equipment.js, helpers/equipment.js) ------------------------
  // category is left out: the API sends a code (autoscrubber, other) and the screen draws it as it
  // comes, so the pictures show make and model alone.
  const EQUIPMENT = [
    { id: "eq-1", siteId: S[0].id, name: ["Floor scrubber 2", "Fregadora de pisos 2"], category: "autoscrubber", make: "Brightwater", model: "BW-20", serial: "BW20-44817", purchasedOn: "2024-05-14", status: "in_service", qrCode: "EQ-4KQ7M2", serviceEveryDays: 90, lastServiceOn: "2026-01-12", notes: ["Battery charger kept in the North Wing closet.", "El cargador de la bater\u00eda se guarda en el cuarto del ala norte."] },
    { id: "eq-2", siteId: S[0].id, name: ["Carpet extractor", "Extractora de alfombras"], category: "carpet_extractor", make: "Brightwater", model: "CX-12", serial: "CX12-20931", purchasedOn: "2023-09-02", status: "out_of_service", qrCode: "EQ-7HN3P8", serviceEveryDays: 180, lastServiceOn: "2025-11-03", notes: null },
    { id: "eq-3", siteId: S[1].id, name: ["Floor burnisher", "Pulidora de pisos"], category: "floor_machine", make: "Brightwater", model: "FB-17", serial: "FB17-11520", purchasedOn: "2022-03-21", status: "in_service", qrCode: "EQ-2MV9T4", serviceEveryDays: 60, lastServiceOn: "2026-01-10", notes: null },
    { id: "eq-4", siteId: S[1].id, name: ["Backpack vacuum 1", "Aspiradora de mochila 1"], make: "Kestrel", model: "BP-6", serial: "BP6-90314", purchasedOn: "2025-02-11", status: "in_service", qrCode: "EQ-9RD6K1", serviceEveryDays: 120, lastServiceOn: "2025-12-01", notes: null },
    { id: "eq-5", siteId: S[2].id, name: ["Pressure washer", "Hidrolavadora"], make: "Kestrel", model: "PW-3000", serial: "PW30-55208", purchasedOn: "2024-07-30", status: "in_service", qrCode: "EQ-5TB2W7", serviceEveryDays: 90, lastServiceOn: "2026-02-20", notes: null },
    { id: "eq-6", siteId: S[2].id, name: ["Upright vacuum 3", "Aspiradora vertical 3"], make: "Kestrel", model: "UV-14", serial: "UV14-30077", purchasedOn: "2019-10-08", status: "retired", qrCode: "EQ-3PX8L5", serviceEveryDays: null, lastServiceOn: "2025-06-02", notes: null, retiredAt: "2026-02-02T15:00:00Z" },
  ];
  const EQUIPMENT_EVENTS = {
    "eq-1": [
      { id: "ev-1", kind: "check", note: ["Squeegee blade turned.", "Se volte\u00f3 la hoja del secador."], by: TOMASZ, at: at(-7, "23:40") },
      { id: "ev-2", kind: "service", note: ["Brushes and filters changed.", "Se cambiaron los cepillos y los filtros."], by: MARCUS, at: "2026-01-12T15:00:00Z" },
      { id: "ev-3", kind: "moved", note: null, by: DANA, at: "2025-10-06T14:00:00Z", fromSiteId: S[1].id, toSiteId: S[0].id },
    ],
    "eq-2": [
      { id: "ev-4", kind: "tagged_out", note: ["Pump leaks at the hose fitting.", "La bomba gotea en la conexi\u00f3n de la manguera."], by: MARCUS, at: at(-2, "02:15") },
      { id: "ev-5", kind: "repair", note: ["Spray jets cleared.", "Se destaparon las boquillas."], by: MARCUS, at: "2026-01-20T16:00:00Z" },
      { id: "ev-6", kind: "service", note: null, by: MARCUS, at: "2025-11-03T15:00:00Z" },
    ],
    "eq-3": [{ id: "ev-7", kind: "service", note: null, by: MARCUS, at: "2026-01-10T15:00:00Z" }],
    "eq-4": [{ id: "ev-8", kind: "check", note: null, by: ELENA, at: at(-4, "21:30") }],
    "eq-5": [{ id: "ev-9", kind: "moved", note: null, by: DANA, at: at(-20, "14:00"), fromSiteId: S[0].id, toSiteId: S[2].id }],
    "eq-6": [{ id: "ev-10", kind: "retired", note: ["Motor burned out.", "Se quem\u00f3 el motor."], by: DANA, at: "2026-02-02T15:00:00Z" }],
  };
  const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const eventView = (e, id, lang) => ({ id: e.id, equipmentId: id, kind: e.kind, note: e.note ? W(lang, e.note) : null, photoUrl: null,
    fromSiteId: e.fromSiteId || null, fromSiteName: e.fromSiteId ? siteName(e.fromSiteId) : null, toSiteId: e.toSiteId || null, toSiteName: e.toSiteId ? siteName(e.toSiteId) : null,
    by: who(e.by), at: e.at });
  const equipmentView = (x, lang) => {
    const next = x.serviceEveryDays && x.lastServiceOn && x.status !== "retired" ? addDays(x.lastServiceOn, x.serviceEveryDays) : null;
    const evs = EQUIPMENT_EVENTS[x.id] || [];
    return { id: x.id, siteId: x.siteId, siteName: siteName(x.siteId), name: W(lang, x.name), category: x.category || null, make: x.make, model: x.model, serial: x.serial,
      purchasedOn: x.purchasedOn, status: x.status, qrCode: x.qrCode, qrUrl: "https://portal.example.invalid/e/" + x.qrCode, serviceEveryDays: x.serviceEveryDays,
      lastServiceOn: x.lastServiceOn, nextServiceOn: next, serviceDue: !!next && next <= TODAY, notes: x.notes ? W(lang, x.notes) : null, createdBy: DANA, createdByName: tPersonName(DANA),
      createdAt: x.purchasedOn + "T12:00:00Z", retiredAt: x.retiredAt || null, retiredBy: x.retiredAt ? DANA : null, latestEvent: evs[0] ? eventView(evs[0], x.id, lang) : null };
  };
  function equipmentRoute(method, path, query, lang) {
    if (method === "GET" && path === "/api/equipment") {
      const siteId = query.get("siteId"), status = query.get("status"), due = query.get("due") === "true";
      const rows = EQUIPMENT.map((x) => equipmentView(x, lang)).filter((x) => (!siteId || x.siteId === siteId) && (status ? x.status === status : x.status !== "retired") && (!due || x.serviceDue));
      return ok({ equipment: rows });
    }
    const one = /^\/api\/equipment\/([^/]+)$/.exec(path);
    if (method === "GET" && one && one[1] !== "labels.pdf") {
      const x = EQUIPMENT.find((e) => e.id === decodeURIComponent(one[1]));
      if (!x) return refuse(404, "equipment.notFound", "Equipment not found");
      return ok({ equipment: equipmentView(x, lang), events: (EQUIPMENT_EVENTS[x.id] || []).map((e) => eventView(e, x.id, lang)) });
    }
    return null;
  }

  // ---- the kept records (routes/sites.js checklist-record, routes/supplies.js usage) -------------
  // The checklist record of a site over a range: every day up to today, two zones, each with its
  // daily items, two of them touchpoints, and the weekly grout on Mondays.
  const RECORD_ITEMS = [
    { taskId: "kr-1", zone: "Lobby", label: "Dust mop the lobby floor", frequency: "daily", touchpoint: false, critical: false, by: ELENA, hm: "23:10" },
    { taskId: "kr-2", zone: "Lobby", label: "Disinfect the entrance door handles", frequency: "daily", touchpoint: true, critical: true, by: ELENA, hm: "23:25", twice: true },
    { taskId: "kr-3", zone: "Restroom", label: "Disinfect the sink faucets", frequency: "daily", touchpoint: true, critical: false, by: NGOZI, hm: "00:40" },
    { taskId: "kr-4", zone: "Restroom", label: "Restock the paper towels", frequency: "daily", touchpoint: false, critical: false, by: NGOZI, hm: "00:55", missedOn: day(-3) },
    { taskId: "ck-3", zone: "Restroom", label: "Scrub restroom grout", frequency: "weekly", touchpoint: false, critical: false, by: NGOZI, hm: "01:30", weekday: 1 },
  ];
  const checklistRecord = (siteId, from, to) => {
    const days = [];
    for (let d = from; d <= to && d <= TODAY; d = addDays(d, 1)) {
      const wd = new Date(d + "T12:00:00Z").getUTCDay();
      const items = RECORD_ITEMS.filter((i) => i.weekday == null || i.weekday === wd).map((i) => {
        const done = i.missedOn !== d;
        const check = (hm, by) => ({ completedAt: addDays(d, 1) + "T" + hm + ":00Z", completedBy: { name: tPersonName(by), initials: initials(by) }, notes: null });
        const checks = done ? [check(i.hm, i.by)].concat(i.twice ? [check("04:10", i.by)] : []) : [];
        return { taskId: i.taskId, zone: i.zone, building: null, floor: null, label: i.label, display: { label: i.label, zone: i.zone }, frequency: i.frequency,
          period: i.frequency === "weekly" ? "weekly" : "today", priority: "standard", touchpoint: i.touchpoint, critical: i.critical, due: true, done,
          completedAt: done ? checks[0].completedAt : null, completedBy: done ? checks[0].completedBy : null, notes: null, checks };
      });
      days.push({ date: d, shift: null, items });
    }
    return { site: { id: siteId, name: siteName(siteId) }, from, to, shift: null, touchpointOnly: false, days };
  };
  // The chemicals logged at a site, as GET /api/supplies/usage answers them with category=chemical.
  const CHEMICAL_USE = [
    { n: -15, supply: "sp-1", name: "Neutral floor cleaner", qty: 2, unit: "gallon", by: ELENA },
    { n: -13, supply: "sp-5", name: "Glass cleaner concentrate", qty: 1, unit: "gallon", by: NGOZI },
    { n: -11, supply: "sp-8", name: "Disinfectant wipes", qty: 3, unit: "tub", by: NGOZI },
    { n: -8, supply: "sp-1", name: "Neutral floor cleaner", qty: 1.5, unit: "gallon", by: TOMASZ },
    { n: -6, supply: "sp-8", name: "Disinfectant wipes", qty: 2, unit: "tub", by: ELENA },
    { n: -4, supply: "sp-5", name: "Glass cleaner concentrate", qty: 0.5, unit: "gallon", by: NGOZI },
    { n: -2, supply: "sp-1", name: "Neutral floor cleaner", qty: 2, unit: "gallon", by: ELENA },
  ];
  function keptRoute(method, path, query) {
    const rec = /^\/api\/sites\/([^/]+)\/checklist-record$/.exec(path);
    if (method === "GET" && rec) {
      const from = query.get("from") || "", to = query.get("to") || "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return refuse(400, "records.badRange", "Choose a range of real days", { keys: ["from", "to"] });
      return ok(checklistRecord(decodeURIComponent(rec[1]), from, to));
    }
    if (method === "GET" && path === "/api/supplies/usage" && query.get("category") === "chemical") {
      const siteId = query.get("site_id") || S[0].id, start = query.get("start_date") || "", end = query.get("end_date") || "9999";
      return ok(CHEMICAL_USE.map((r, i) => ({ id: "su-c" + (i + 1), supply_id: r.supply, site_id: siteId, user_id: r.by, quantity: r.qty, unit: r.unit,
        scanned_at: at(r.n, "23:00"), supply_name: r.name, category: "chemical", qr_code: "QR-" + r.supply.toUpperCase().replace("-", ""), site_name: siteName(siteId), staff_name: tPersonName(r.by) }))
        .filter((r) => r.scanned_at.slice(0, 10) >= start && r.scanned_at.slice(0, 10) <= end));
    }
    // The completed inspections of a site in a range, the way routes/inspections.js narrows them.
    if (method === "GET" && path === "/api/inspections/scheduled" && query.get("status") === "completed" && query.get("from") && query.get("to")) {
      const siteId = query.get("site_id");
      return ok(seed.INSPECTION_SCORES.map((r) => Object.assign({}, r, { status: "completed", assigned_to_name: r.completed_by_name, template_id: "tp-1" }))
        .filter((r) => (!siteId || r.site_id === siteId) && r.scheduled_date >= query.get("from") && r.scheduled_date <= query.get("to")));
    }
    return null;
  }

  // ---- touchpoints on a site's checklist (routes/sites.js tasks) ----------------------------------
  // Every item answers touchpoint and critical, the lobby glass a touchpoint. It needs the stub's own
  // answer to lay the keys over, so it answers only where the layer hands base to the part.
  const TOUCHPOINTS = { "ck-2": { touchpoint: true, critical: false } };
  function tasksRoute(method, path, base) {
    if (method !== "GET" || !base || !/^\/api\/sites\/[^/]+\/tasks$/.test(path)) return null;
    const a = base();
    if (a && a.status === 200 && Array.isArray(a.json)) a.json = a.json.map((tk) => Object.assign({}, tk, TOUCHPOINTS[tk.id] || { touchpoint: false, critical: false }));
    return a;
  }

  // ---- periodic work across every site (routes/periodicWork.js) -----------------------------------
  const PERIODIC = [
    { siteId: S[0].id, taskId: "ck-3", label: "Scrub restroom grout", zone: "Restroom", es: ["Restregar las juntas del ba\u00f1o", "Ba\u00f1o"], frequency: "weekly", last: [at(-13, "01:30"), NGOZI], nextDueOn: day(-1), dueBy: day(5), state: "due" },
    { siteId: S[0].id, taskId: "pw-1", label: "Strip and wax the lobby floor", zone: "Lobby", es: ["Decapar y encerar el piso del vest\u00edbulo", "Vest\u00edbulo"], frequency: "monthly", last: ["2026-02-21T03:00:00Z", TOMASZ], nextDueOn: "2026-03-01", dueBy: "2026-03-31", state: "due" },
    { siteId: S[0].id, taskId: "pw-2", label: "Wash the stairwell walls", zone: "Stairwell", es: ["Lavar las paredes de la escalera", "Escalera"], frequency: "quarterly", last: ["2026-01-14T02:00:00Z", TOMASZ], nextDueOn: "2026-04-01", dueBy: "2026-06-30", state: "done" },
    { siteId: S[1].id, taskId: "pw-3", label: "Shampoo the waiting room carpet", zone: "Waiting room", es: ["Lavar la alfombra de la sala de espera", "Sala de espera"], frequency: "monthly", last: ["2026-01-22T02:00:00Z", ELENA], nextDueOn: "2026-02-01", dueBy: "2026-02-28", state: "overdue" },
    { siteId: S[1].id, taskId: "pw-4", label: "Clean the air vents", zone: "Corridor", es: ["Limpiar las rejillas de ventilaci\u00f3n", "Pasillo"], frequency: "quarterly", last: null, nextDueOn: "2026-01-01", dueBy: "2026-03-31", state: "due" },
    { siteId: S[2].id, taskId: "pw-5", label: "Pressure wash the dock apron", zone: "Dock", es: ["Lavar a presi\u00f3n la plataforma del muelle", "Muelle"], frequency: "biweekly", last: [at(-23, "20:00"), "u-staff-8"], nextDueOn: day(-15), dueBy: day(-2), state: "overdue" },
    { siteId: S[2].id, taskId: "pw-6", label: "Degrease the break room hood", zone: "Break Room", es: ["Desengrasar la campana de la sala de descanso", "Sala de descanso"], frequency: "monthly", last: [at(-9, "21:00"), "u-staff-8"], nextDueOn: "2026-04-01", dueBy: "2026-04-30", state: "done" },
  ];
  const ORDER = ["overdue", "due", "done"];
  function periodicRoute(method, path, query, lang) {
    if (method !== "GET" || path !== "/api/periodic-work") return null;
    const rows = PERIODIC.filter((x) => (!query.get("siteId") || x.siteId === query.get("siteId")) && (!query.get("state") || x.state === query.get("state")))
      .sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state));
    return ok({ items: rows.map((x) => ({ siteId: x.siteId, siteName: siteName(x.siteId), taskId: x.taskId, label: x.label, zone: x.zone,
      display: lang === "es" ? { label: x.es[0], zone: x.es[1] } : { label: x.label, zone: x.zone }, frequency: x.frequency,
      lastDoneAt: x.last ? x.last[0] : null, lastDoneBy: x.last ? { name: tPersonName(x.last[1]), initials: initials(x.last[1]) } : null,
      nextDueOn: x.nextDueOn, dueBy: x.dueBy, state: x.state })) });
  }

  // ---- Workspace (routes/workspace.js, helpers/workspace.js) --------------------------------------
  // Four projects, three open and one archived, with the first one's posts, to-dos, files and
  // activity, in the language asked: a person writes in their own language, and each picture is
  // drawn in one. Nothing is written. The project answer carries latest as the API sends it, { post,
  // todo, file }, each the newest or null (helpers/workspace.js), which the cards read (Step 284).
  const PRIYA = seed.PEOPLE.capability.id, OYE = seed.PEOPLE.superAdmin.id;
  const PROJECTS = [
    { id: "wp-1", name: ["North Wing move-in", "Mudanza del ala norte"], description: ["Floors 2 and 3 of the North Wing ready for the new tenant on April 6.", "Los pisos 2 y 3 del ala norte listos para el nuevo inquilino el 6 de abril."],
      color: "#2D6CDF", createdBy: DANA, createdAt: at(-20, "14:00"), members: [[DANA, "owner", true], [MARCUS, "member", true], [PRIYA, "member", false]], channel: "ch-wp-1" },
    { id: "wp-2", name: ["Spring floor care", "Cuidado de pisos de primavera"], description: ["Strip and wax at every site before April 30.", "Decapar y encerar en cada sitio antes del 30 de abril."],
      color: "#2E8B57", createdBy: MARCUS, createdAt: at(-14, "15:00"), members: [[MARCUS, "owner", true], [DANA, "member", true]], channel: "ch-wp-2" },
    { id: "wp-3", name: ["Clinic contract renewal", "Renovaci\u00f3n del contrato de la cl\u00ednica"], description: ["What Lakeside Medical Plaza asked for in the new contract.", "Lo que Lakeside Medical Plaza pidi\u00f3 en el nuevo contrato."],
      color: "#7D5BBE", createdBy: OYE, createdAt: at(-9, "13:00"), members: [[OYE, "owner", true], [DANA, "member", false]], channel: "ch-wp-3" },
    { id: "wp-4", name: ["Winter salt cleanup", "Limpieza de sal del invierno"], description: ["Entry mats and salt stains after the storms.", "Tapetes de entrada y manchas de sal despu\u00e9s de las tormentas."],
      color: "#6B7280", createdBy: DANA, createdAt: "2026-01-12T14:00:00Z", archivedAt: "2026-03-02T15:00:00Z", members: [[DANA, "owner", true], [MARCUS, "member", true]], channel: "ch-wp-4" },
  ];
  const POSTS = [
    { id: "po-1", project: "wp-1", pinned: true, author: DANA, createdAt: at(-6, "14:00"), title: ["Move-in schedule", "Calendario de la mudanza"],
      body: ["The tenant moves in on Monday, April 6.\nFloors 2 and 3 get a full clean the week before, and the day porter starts that morning.\nThe building's notes are at https://portal.example.invalid/sites/north-wing",
        "El inquilino se muda el lunes 6 de abril.\nLos pisos 2 y 3 reciben una limpieza completa la semana anterior, y el conserje de d\u00eda empieza esa ma\u00f1ana.\nLas notas del edificio est\u00e1n en https://portal.example.invalid/sites/north-wing"] },
    { id: "po-2", project: "wp-1", pinned: false, author: MARCUS, createdAt: at(-3, "16:30"), title: ["Keys for the North Wing", "Llaves del ala norte"],
      body: ["The building manager has two sets for us. I will pick them up on Friday.", "El administrador del edificio tiene dos juegos para nosotros. Los recojo el viernes."] },
    { id: "po-3", project: "wp-1", pinned: false, author: PRIYA, createdAt: at(-1, "13:15"), title: ["Supplies for move-in week", "Suministros para la semana de la mudanza"],
      body: ["We need four cases of can liners and two entry mats.", "Necesitamos cuatro cajas de bolsas de basura y dos tapetes de entrada."] },
    { id: "po-4", project: "wp-4", pinned: false, author: DANA, createdAt: "2026-01-12T15:00:00Z", title: ["Salt on the lobby floors", "Sal en los pisos del vest\u00edbulo"],
      body: ["Mats at every entrance until the end of February.", "Tapetes en cada entrada hasta fines de febrero."] },
  ];
  const COMMENTS = [
    { id: "wc-1", subjectType: "post", subjectId: "po-1", author: MARCUS, createdAt: at(-5, "13:10"), body: ["I can bring two people from the night crew for the deep clean.", "Puedo traer a dos personas del turno de noche para la limpieza profunda."], mentions: [] },
    { id: "wc-2", subjectType: "post", subjectId: "po-1", author: DANA, createdAt: at(-5, "14:02"), body: ["@Marcus Ferreira thank you, that covers Thursday and Friday.", "@Marcus Ferreira gracias, con eso cubrimos el jueves y el viernes."], mentions: [MARCUS] },
    { id: "wc-3", subjectType: "todo", subjectId: "td-1", author: MARCUS, createdAt: at(-2, "12:40"), body: ["The extractor is booked for the floor 2 carpets on the 26th.", "La extractora est\u00e1 reservada para las alfombras del piso 2 el d\u00eda 26."], mentions: [] },
  ];
  const LISTS = [
    { id: "tl-1", project: "wp-1", name: ["Before move-in", "Antes de la mudanza"], position: 1 },
    { id: "tl-2", project: "wp-1", name: ["Move-in week", "Semana de la mudanza"], position: 2 },
    { id: "tl-3", project: "wp-2", name: ["Strip and wax", "Decapar y encerar"], position: 1 },
  ];
  const TODOS = [
    { id: "td-1", list: "tl-1", title: ["Deep clean floor 2", "Limpieza profunda del piso 2"], notes: ["Carpets, glass and every restroom.", "Alfombras, vidrios y todos los ba\u00f1os."], assignees: [MARCUS], dueOn: "2026-03-27", createdBy: DANA, createdAt: at(-6, "14:20") },
    { id: "td-2", list: "tl-1", title: ["Replace the restroom dispensers", "Cambiar los dispensadores de los ba\u00f1os"], assignees: [DANA], dueOn: "2026-03-12", createdBy: DANA, createdAt: at(-6, "14:22") },
    { id: "td-3", list: "tl-1", title: ["Walk the floors with the tenant", "Recorrer los pisos con el inquilino"], assignees: [DANA, MARCUS], dueOn: "2026-04-02", createdBy: MARCUS, createdAt: at(-5, "15:00") },
    { id: "td-4", list: "tl-1", title: ["Order the entry mats", "Pedir los tapetes de entrada"], assignees: [PRIYA], dueOn: "2026-03-13", createdBy: DANA, createdAt: at(-6, "14:25"), completedAt: at(-7, "15:20"), completedBy: PRIYA },
    { id: "td-5", list: "tl-2", title: ["Day porter on floor 3", "Conserje de d\u00eda en el piso 3"], assignees: [MARCUS], dueOn: "2026-04-06", createdBy: DANA, createdAt: at(-4, "14:00") },
    { id: "td-6", list: "tl-3", title: ["Book the floor machine for Lakeside", "Reservar la m\u00e1quina de pisos para Lakeside"], assignees: [DANA], dueOn: "2026-03-20", createdBy: MARCUS, createdAt: at(-10, "13:00") },
  ];
  const FILES = [
    { id: "fi-3", project: "wp-1", name: ["Lobby before.jpg", "Vest\u00edbulo antes.jpg"], mime: "image/jpeg", size: 1153433, by: PRIYA, createdAt: at(-2, "17:45") },
    { id: "fi-2", project: "wp-1", name: ["Move-in checklist.docx", "Lista de la mudanza.docx"], mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 48213, by: MARCUS, createdAt: at(-4, "15:00") },
    { id: "fi-1", project: "wp-1", name: ["North Wing floor plan.pdf", "Plano del ala norte.pdf"], mime: "application/pdf", size: 2516582, by: DANA, createdAt: at(-6, "14:05") },
  ];
  // The API's own words for each kind of activity (helpers/words.js workspace.activity.*).
  const DID = { projectCreated: ["started the project", "inici\u00f3 el proyecto"], postCreated: ["posted {title}", "public\u00f3 {title}"], commentAdded: ["commented on {title}", "coment\u00f3 en {title}"],
    todoDone: ["finished {title}", "termin\u00f3 {title}"], fileUploaded: ["uploaded {title}", "subi\u00f3 {title}"], projectArchived: ["archived the project", "archiv\u00f3 el proyecto"] };
  const ACTIVITY = [
    { id: "wa-6", project: "wp-1", actor: PRIYA, action: "postCreated", title: POSTS[2].title, subject: ["post", "po-3"], createdAt: POSTS[2].createdAt },
    { id: "wa-5", project: "wp-1", actor: PRIYA, action: "fileUploaded", title: FILES[0].name, subject: ["file", "fi-3"], createdAt: FILES[0].createdAt },
    { id: "wa-4", project: "wp-1", actor: MARCUS, action: "postCreated", title: POSTS[1].title, subject: ["post", "po-2"], createdAt: POSTS[1].createdAt },
    { id: "wa-3", project: "wp-1", actor: PRIYA, action: "todoDone", title: TODOS[3].title, subject: ["todo", "td-4"], createdAt: TODOS[3].completedAt },
    { id: "wa-2", project: "wp-1", actor: MARCUS, action: "commentAdded", title: POSTS[0].title, subject: ["post", "po-1"], createdAt: COMMENTS[0].createdAt },
    { id: "wa-1", project: "wp-1", actor: DANA, action: "projectCreated", title: null, subject: [null, null], createdAt: PROJECTS[0].createdAt },
    { id: "wa-8", project: "wp-4", actor: DANA, action: "projectArchived", title: null, subject: [null, null], createdAt: PROJECTS[3].archivedAt },
    { id: "wa-7", project: "wp-4", actor: DANA, action: "projectCreated", title: null, subject: [null, null], createdAt: PROJECTS[3].createdAt },
  ];
  const projectOf = (id) => PROJECTS.find((x) => x.id === id) || null;
  const listOf = (id) => LISTS.find((l) => l.id === id) || {};
  const live = (x) => !x.archivedAt;
  const projectView = (x, lang) => {
    const mine = x.members.find((m) => m[0] === person().id);
    return { id: x.id, company: "ocsa", name: W(lang, x.name), description: W(lang, x.description), color: x.color, status: x.archivedAt ? "archived" : "active",
      createdBy: x.createdBy, createdByName: tPersonName(x.createdBy), createdAt: x.createdAt, archivedAt: x.archivedAt || null, archivedBy: x.archivedAt ? DANA : null,
      memberCount: x.members.length, chatChannelId: x.channel, role: mine ? mine[1] : null };
  };
  const todoView = (x, lang) => {
    const l = listOf(x.list), pr = projectOf(l.project) || {};
    return { id: x.id, projectId: l.project, projectName: W(lang, pr.name), listId: x.list, listName: W(lang, l.name), title: W(lang, x.title), notes: x.notes ? W(lang, x.notes) : null,
      assigneeIds: x.assignees, assignees: x.assignees.map((id) => ({ userId: id, name: tPersonName(id) })), dueOn: x.dueOn || null, position: 1,
      createdBy: x.createdBy, createdByName: tPersonName(x.createdBy), createdAt: x.createdAt, completedAt: x.completedAt || null, completedBy: x.completedBy || null,
      completedByName: x.completedBy ? tPersonName(x.completedBy) : null, commentCount: COMMENTS.filter((c) => c.subjectType === "todo" && c.subjectId === x.id).length };
  };
  const commentView = (c, lang) => ({ id: c.id, projectId: "wp-1", subjectType: c.subjectType, subjectId: c.subjectId, body: W(lang, c.body), authorId: c.author, authorName: tPersonName(c.author),
    mentions: c.mentions, mentioned: c.mentions.map((id) => ({ userId: id, name: tPersonName(id) })), createdAt: c.createdAt, editedAt: null });
  const commentsOf = (kind, id, lang) => COMMENTS.filter((c) => c.subjectType === kind && c.subjectId === id).map((c) => commentView(c, lang));
  const postView = (x, lang) => ({ id: x.id, projectId: x.project, projectName: W(lang, projectOf(x.project).name), title: W(lang, x.title), body: W(lang, x.body), pinned: x.pinned,
    authorId: x.author, authorName: tPersonName(x.author), createdAt: x.createdAt, editedAt: null, archivedAt: null, commentCount: COMMENTS.filter((c) => c.subjectType === "post" && c.subjectId === x.id).length });
  const fileView = (f, lang) => ({ id: f.id, projectId: f.project, fileName: W(lang, f.name), mimeType: f.mime, sizeBytes: f.size, note: null, uploadedBy: f.by,
    uploaderName: tPersonName(f.by), uploadedByName: tPersonName(f.by), createdAt: f.createdAt, commentCount: 0 });
  // actorId and actorName, as the API sends them, and the screen reads actorName as the name (Step 284).
  const activityView = (a, lang) => ({ id: a.id, projectId: a.project, projectName: W(lang, projectOf(a.project).name), actorId: a.actor, actorName: tPersonName(a.actor),
    action: a.action, summary: T(lang, ...DID[a.action]).replace("{title}", a.title ? W(lang, a.title) : ""),
    subjectType: a.subject[0], subjectId: a.subject[1], createdAt: a.createdAt });
  const newest = (rows) => rows.slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;
  const latestOf = (x, todos, lang) => {
    const p0 = newest(POSTS.filter((y) => y.project === x.id)), t0 = newest(todos), f0 = newest(FILES.filter((f) => f.project === x.id));
    return {
      post: p0 ? { id: p0.id, title: W(lang, p0.title), authorId: p0.author, authorName: tPersonName(p0.author), createdAt: p0.createdAt } : null,
      todo: t0 ? { id: t0.id, title: W(lang, t0.title), listId: t0.list, dueOn: t0.dueOn || null, completedAt: t0.completedAt || null, createdAt: t0.createdAt || null } : null,
      file: f0 ? { id: f0.id, fileName: W(lang, f0.name), mimeType: f0.mime, sizeBytes: f0.size, uploadedBy: f0.by, uploaderName: tPersonName(f0.by), createdAt: f0.createdAt } : null,
    };
  };
  const fullProject = (x, lang) => {
    const lists = LISTS.filter((l) => l.project === x.id), todos = TODOS.filter((t0) => lists.some((l) => l.id === t0.list));
    const mine = x.members.find((m) => m[0] === person().id);
    return Object.assign(projectView(x, lang), {
      members: x.members.map((m) => ({ userId: m[0], name: tPersonName(m[0]), role: m[1], emailCopies: m[2] === true, addedAt: x.createdAt })),
      me: { role: mine ? mine[1] : null, emailCopies: mine ? mine[2] === true : false },
      counts: { posts: POSTS.filter((p0) => p0.project === x.id).length, todoLists: lists.length, openTodos: todos.filter((t0) => !t0.completedAt).length,
        doneTodos: todos.filter((t0) => t0.completedAt).length, files: FILES.filter((f) => f.project === x.id).length },
      latest: latestOf(x, todos, lang) });
  };
  function workspaceRoute(method, path, query, lang) {
    if (method !== "GET" || path.indexOf("/api/workspace/") !== 0) return null;
    const rest = path.slice("/api/workspace/".length).split("/").map(decodeURIComponent);
    if (rest[0] === "me" && rest.length === 1) {
      const mine = TODOS.filter((x) => !x.completedAt && x.assignees.indexOf(person().id) >= 0 && live(projectOf(listOf(x.list).project)))
        .sort((a, b) => String(a.dueOn || "9999").localeCompare(String(b.dueOn || "9999")));
      return ok({ todos: mine.map((x) => todoView(x, lang)), changes: ACTIVITY.filter((a) => a.project === "wp-1" && a.actor !== person().id).slice(0, 3).map((a) => activityView(a, lang)) });
    }
    if (rest[0] === "projects" && rest.length === 1) {
      const asked = query.get("status") || "active";
      if (asked !== "active" && asked !== "archived") return refuse(400, "workspace.badDetails", "Check the details", { keys: ["status"] });
      const mineOnly = person().role !== "admin";
      return ok({ projects: PROJECTS.filter((x) => (asked === "archived") === !!x.archivedAt && (!mineOnly || x.members.some((m) => m[0] === person().id)))
        .sort((a, b) => W(lang, a.name).toLowerCase().localeCompare(W(lang, b.name).toLowerCase())).map((x) => projectView(x, lang)) });
    }
    if (rest[0] === "projects") {
      const x = projectOf(rest[1]);
      if (!x) return refuse(404, "workspace.notFound", T(lang, "That project was not found.", "No se encontr\u00f3 ese proyecto."));
      if (rest.length === 2) return ok({ project: fullProject(x, lang) });
      if (rest[2] === "posts") return ok({ posts: POSTS.filter((p0) => p0.project === x.id).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p0) => postView(p0, lang)) });
      if (rest[2] === "todos") return ok({ lists: LISTS.filter((l) => l.project === x.id).map((l) => ({ id: l.id, projectId: x.id, name: W(lang, l.name), description: null, position: l.position,
        createdBy: x.createdBy, createdByName: tPersonName(x.createdBy), createdAt: x.createdAt, archivedAt: null,
        todos: TODOS.filter((t0) => t0.list === l.id).map((t0) => todoView(t0, lang)).sort((a, b) => (!!a.completedAt - !!b.completedAt)) })) });
      if (rest[2] === "files") return ok({ files: FILES.filter((f) => f.project === x.id).map((f) => fileView(f, lang)) });
      if (rest[2] === "activity") return ok({ activity: ACTIVITY.filter((a) => a.project === x.id).map((a) => activityView(a, lang)) });
      return null;
    }
    if (rest[0] === "posts" && rest.length === 2) {
      const x = POSTS.find((p0) => p0.id === rest[1]);
      if (!x) return refuse(404, "workspace.notFound", T(lang, "That post was not found.", "No se encontr\u00f3 esa publicaci\u00f3n."));
      return ok({ post: Object.assign(postView(x, lang), { comments: commentsOf("post", x.id, lang) }) });
    }
    if (rest[0] === "todos" && rest.length === 2) {
      const x = TODOS.find((t0) => t0.id === rest[1]);
      if (!x) return refuse(404, "workspace.notFound", T(lang, "That to-do was not found.", "No se encontr\u00f3 esa tarea."));
      return ok({ todo: Object.assign(todoView(x, lang), { comments: commentsOf("todo", x.id, lang) }) });
    }
    return null;
  }

  // ---- the project chats (routes/chat.js) ---------------------------------------------------------
  // wp-1's chat, its messages and members. The list of chats is the stub's own answer with the chats of
  // the projects the caller is on laid over it, so it answers only where the layer hands base to the part.
  const PROJECT_CHAT = [
    { id: "pm-1", sender: MARCUS, sentAt: at(-1, "14:05"), text: ["The keys are in the lockbox by the loading dock.", "Las llaves est\u00e1n en la caja de seguridad junto al muelle de carga."] },
    { id: "pm-2", sender: PRIYA, sentAt: at(-1, "14:20"), text: ["Thank you. The mats arrive on Thursday morning.", "Gracias. Los tapetes llegan el jueves por la ma\u00f1ana."] },
    { id: "pm-3", sender: DANA, sentAt: at(0, "13:45"), text: ["@Marcus Ferreira can the night crew start floor 2 on Wednesday?", "@Marcus Ferreira \u00bfpuede el turno de noche empezar el piso 2 el mi\u00e9rcoles?"], mentions: [MARCUS] },
  ];
  const roleOf = (id) => ((state.staff || []).find((p0) => p0.id === id) || {}).role || "admin";
  function projectChatRoute(method, path, lang, base) {
    if (method === "GET" && path === "/api/chat/channels" && base) {
      const a = base();
      if (a && a.status === 200 && Array.isArray(a.json)) {
        const mine = PROJECTS.filter((x) => !x.archivedAt && x.members.some((m) => m[0] === person().id));
        a.json = a.json.concat(mine.map((x) => ({ id: x.channel, type: "project", name: W(lang, x.name), projectId: x.id, unreadCount: 0, lastMessageAt: x.id === "wp-1" ? PROJECT_CHAT[2].sentAt : null })));
      }
      return a;
    }
    const m = /^\/api\/chat\/channels\/(ch-wp-[0-9]+)\/(messages|members|read)$/.exec(path);
    const x = m && PROJECTS.find((p0) => p0.channel === m[1]);
    if (!x) return null;
    if (m[2] === "read" && method === "POST") return ok({ ok: true });
    if (m[2] === "members" && method === "GET") return ok({ members: x.members.filter((mm) => mm[0] !== person().id).map((mm) => ({ id: mm[0], name: tPersonName(mm[0]), role: roleOf(mm[0]) })) });
    if (m[2] === "messages" && method === "GET") return ok((x.id === "wp-1" ? PROJECT_CHAT : []).map((c) => ({ id: c.id, senderId: c.sender, senderName: tPersonName(c.sender), senderRole: roleOf(c.sender),
      text: W(lang, c.text), body: W(lang, c.text), sentAt: c.sentAt, mentions: (c.mentions || []).map((id) => ({ id, name: tPersonName(id) })) })));
    return null;
  }

  // ---- the chat records (routes/chat.js records, helpers/chatRecords.js) ---------------------------
  // The page opens for a holder of read_chat_records. The answer carries the API's records and count,
  // and the same rows as messages and total, which is what the screen reads.
  grant("read_chat_records");
  const RECORDS = [
    { id: "cr-1", channelId: "ch-1", channelType: "site", channelName: S[0].name, siteId: S[0].id, sender: MARCUS, sentAt: at(-8, "13:05"), text: ["Floor 3 restrooms are restocked.", "Los ba\u00f1os del piso 3 est\u00e1n reabastecidos."] },
    { id: "cr-2", channelId: "ch-general", channelType: "general", channelName: "General", sender: MARCUS, sentAt: at(-6, "18:40"), text: ["Who has the spare key for the dock office?", "\u00bfQui\u00e9n tiene la llave de repuesto de la oficina del muelle?"] },
    { id: "cr-3", channelId: "dc-1", channelType: "direct", channelName: tPersonName(DANA) + ", " + tPersonName(MARCUS), sender: MARCUS, sentAt: at(-5, "14:15"), text: ["I will take the Lakeside walk on Thursday.", "Yo hago el recorrido de Lakeside el jueves."] },
    { id: "cr-4", channelId: "ch-1", channelType: "site", channelName: S[0].name, siteId: S[0].id, sender: TOMASZ, sentAt: at(-1, "21:20"), text: ["Lobby glass needs a second pass in the morning.", "El vidrio del vest\u00edbulo necesita una segunda pasada en la ma\u00f1ana."] },
    { id: "cr-5", channelId: "ch-1", channelType: "site", channelName: S[0].name, siteId: S[0].id, sender: MARCUS, sentAt: at(-1, "21:35"), text: ["I will tell the morning porter.", "Le aviso al conserje de la ma\u00f1ana."] },
  ];
  // The searches recorded, as GET /api/chat/records/log answers them (helpers/chatRecords.js), newest first.
  const LOOKUPS = [
    { id: "al-2", action: "chat_records_pdf", actor: OYE, createdAt: at(-2, "15:32"), filters: { userIds: ["u-staff-8"], channelId: null, from: "2026-03-01", to: "2026-03-15", q: null }, count: 6, more: false },
    { id: "al-1", action: "chat_records_read", actor: OYE, createdAt: at(-2, "15:30"), filters: { userIds: ["u-staff-8"], channelId: null, from: "2026-03-01", to: "2026-03-15", q: null }, count: 6, more: false },
  ];
  function recordsRoute(method, path, query, lang) {
    if (method !== "GET") return null;
    if (path === "/api/chat/records") {
      const ids = String(query.get("userIds") || "").split(",").filter(Boolean), ch = query.get("channelId"), from = query.get("from"), to = query.get("to"), q = String(query.get("q") || "").toLowerCase();
      if (from && to && from > to) return refuse(400, "chatRecords.badRange", T(lang, "The range runs backward.", "El rango va hacia atr\u00e1s."), { keys: ["from", "to"] });
      const day = (r) => new Date(new Date(r.sentAt).getTime() - 4 * 3600000).toISOString().slice(0, 10);
      const rows = RECORDS.filter((r) => (!ids.length || ids.indexOf(r.sender) >= 0) && (!ch || r.channelId === ch) && (!from || day(r) >= from) && (!to || day(r) <= to) && (!q || W(lang, r.text).toLowerCase().indexOf(q) >= 0))
        .map((r) => ({ id: r.id, channelId: r.channelId, channelType: r.channelType, channelName: r.channelName, siteId: r.siteId || null, projectId: null, senderId: r.sender, senderName: tPersonName(r.sender), sentAt: r.sentAt, edited: false, text: W(lang, r.text) }));
      return ok({ records: rows, count: rows.length, more: false, limit: 2000 });
    }
    if (path === "/api/chat/records/log") {
      return ok({ log: LOOKUPS.map((r) => ({ id: r.id, actorId: r.actor, actorName: tPersonName(r.actor), action: r.action, filters: r.filters, count: r.count, more: r.more, createdAt: r.createdAt })) });
    }
    return null;
  }

  // ---- the answers --------------------------------------------------------------------------------
  // base, where the layer hands it over, is the answer the stub gives without this part.
  return (method, path, query, body, lang, base) => equipmentRoute(method, path, query, lang)
    || keptRoute(method, path, query)
    || tasksRoute(method, path, base)
    || periodicRoute(method, path, query, lang)
    || workspaceRoute(method, path, query, lang)
    || projectChatRoute(method, path, lang, base)
    || recordsRoute(method, path, query, lang)
    || null;
}

// The filed forms each guide entry opens, the forms catalog, the client reports, the injury log and the
// annual summary, removed supplies, shift names and the Jotform settings.
function formsPart(ctx) {
  const { seed, ok, created, tPersonName } = ctx;
  const S = seed.SITES;
  const L = (lang, en, es) => (lang === "es" ? es : en);
  const at = (days, hm) => seed.shift(days) + "T" + hm + ":00Z";
  const ROLE = {};
  seed.STAFF.forEach((p) => { ROLE[p.id] = p.role; });

  // ---- the forms ---------------------------------------------------------------------------------
  // Each form: its version, apps, title and sections, and its questions as
  // [key, section, half (a filer, s desk), type, English, Spanish, { req, opts, cols, rows, signer,
  // closes, when, writers, prefill, minRows, maxRows, nameFrom, maxPhotos }].
  const O1 = [["yes", "Yes", "S\u00ed"], ["no", "No", "No"]];
  const O2 = [["yes", "Yes", "S\u00ed"], ["partly", "Partly", "En parte"], ["no", "No", "No"]];
  const O3 = [["yes", "Yes", "S\u00ed"], ["not_needed", "Not needed", "No aplica"], ["no", "No", "No"]];
  const O4 = [["pass", "Pass", "Cumple"], ["fail", "Fail", "No cumple"], ["not_applicable", "Not applicable", "No aplica"]];
  const O5 = [["a", "A", "A"], ["b", "B", "B"], ["c", "C", "C"], ["d", "D", "D"]];
  const O6 = [["yes", "Yes", "S\u00ed"], ["no", "No", "No"], ["not_applicable", "Not applicable", "No aplica"]];
  const O7 = [["class_1", "Class 1", "Clase 1"], ["class_2", "Class 2", "Clase 2"], ["day_porter", "Day Porter", "Conserje de d\u00eda"], ["supervisor", "Supervisor", "Supervisor"]];
  const O8 = [["yes", "Yes", "S\u00ed"], ["no", "No", "No"], ["not_needed", "Not needed", "No fue necesario"]];
  const O9 = [["exceeds", "Exceeds the standard", "Supera el est\u00e1ndar"], ["meets", "Meets the standard", "Cumple el est\u00e1ndar"], ["needs_improvement", "Needs improvement", "Necesita mejorar"], ["not_assessed", "Not assessed", "No evaluado"]];
  const FORMS = {
    "OCSA-FRM-009": { v: 2, apps: ["portal","customer"], customer: true, title: ["Customer Complaint Log", "Registro de quejas de clientes"],
      sections: [["1", "Your concern", "Su inquietud"], ["2", "How it came in", "C\u00f3mo lleg\u00f3"], ["3", "Type and urgency", "Tipo y urgencia"], ["4", "What was done", "Lo que se hizo"]],
      fields: [
        ["client_name", "1", "a", "text", "Your name", "Su nombre", { req: 1 }],
        ["client_role", "1", "a", "text", "Your organization or role", "Su organizaci\u00f3n o puesto"],
        ["contact_preference", "1", "a", "select", "How would you like us to contact you?", "\u00bfC\u00f3mo prefiere que nos comuniquemos con usted?", { req: 1, opts: [["by_email", "By email", "Por correo electr\u00f3nico"], ["by_phone", "By phone call", "Por llamada"], ["by_text", "By text message", "Por mensaje de texto"]] }],
        ["building_area", "1", "a", "text", "Where in the building?", "\u00bfEn qu\u00e9 parte del edificio?"],
        ["what_happened", "1", "a", "textarea", "What happened?", "\u00bfQu\u00e9 pas\u00f3?", { req: 1 }],
        ["about_staff", "1", "a", "select", "Is this about how a member of our staff treated you?", "\u00bfSe trata de c\u00f3mo lo trat\u00f3 un miembro de nuestro personal?", { req: 1, opts: O1 }],
        ["reference", "2", "s", "text", "Reference", "Referencia", { prefill: 1 }],
        ["logged_by", "2", "s", "text", "Logged by", "Registrado por", { prefill: 1 }],
        ["site", "2", "s", "text", "Site", "Sitio", { req: 1 }],
        ["came_in_date", "2", "s", "date", "Date it came in", "Fecha en que lleg\u00f3", { req: 1 }],
        ["came_in_time", "2", "s", "time", "Time it came in", "Hora en que lleg\u00f3", { req: 1 }],
        ["came_in_how", "2", "s", "select", "How did it come in?", "\u00bfC\u00f3mo lleg\u00f3?", { req: 1, opts: [["phone_call", "Phone call", "Llamada"], ["email", "Email", "Correo electr\u00f3nico"], ["text_message", "Text message", "Mensaje de texto"], ["in_person", "In person", "En persona"], ["building_management", "Through building management", "Por la administraci\u00f3n del edificio"], ["prime_contractor", "Through the prime contractor", "Por el contratista principal"], ["client_link", "Client link", "Enlace del cliente"], ["other", "Other", "Otro"]] }],
        ["customer", "2", "s", "text", "Customer or company", "Cliente o empresa", { req: 1 }],
        ["customer_wants", "2", "s", "textarea", "What the customer wants done", "Lo que el cliente quiere que se haga"],
        ["complaint_kind", "3", "s", "select", "What kind of complaint is it?", "\u00bfQu\u00e9 tipo de queja es?", { req: 1, opts: [["cleaning_quality", "Cleaning quality", "Calidad de limpieza"], ["missed_or_late", "Missed or late service", "Servicio no hecho o tarde"], ["staff_conduct", "Staff conduct", "Conducta del personal"], ["damage_or_safety", "Damage or safety", "Da\u00f1o o seguridad"], ["supplies_or_equipment", "Supplies or equipment", "Suministros o equipo"], ["billing_or_communication", "Billing or communication", "Facturaci\u00f3n o comunicaci\u00f3n"], ["other", "Other", "Otro"]] }],
        ["urgency", "3", "s", "select", "How urgent is it?", "\u00bfQu\u00e9 tan urgente es?", { req: 1, opts: [["critical", "Critical, fix the same day", "Cr\u00edtica, resolver el mismo d\u00eda"], ["high", "High, within 2 working days", "Alta, en 2 d\u00edas h\u00e1biles"], ["medium", "Medium, within 5 working days", "Media, en 5 d\u00edas h\u00e1biles"], ["low", "Low, within 10 working days", "Baja, en 10 d\u00edas h\u00e1biles"]] }],
        ["handled_by", "3", "s", "text", "Who is handling it?", "\u00bfQui\u00e9n se encarga?", { req: 1 }],
        ["heard_back_same_day", "3", "s", "select", "Did the customer hear back from us the same working day?", "\u00bfRecibi\u00f3 el cliente respuesta nuestra el mismo d\u00eda h\u00e1bil?", { req: 1, opts: O1 }],
        ["what_was_found", "4", "s", "textarea", "What was found", "Lo que se encontr\u00f3", { req: 1 }],
        ["cause", "4", "s", "select", "What caused it?", "\u00bfQu\u00e9 lo caus\u00f3?", { req: 1, opts: [["time_or_workload", "Time or workload", "Tiempo o carga de trabajo"], ["training", "Training", "Capacitaci\u00f3n"], ["staffing", "Staffing", "Personal"], ["supplies_or_equipment", "Supplies or equipment", "Suministros o equipo"], ["communication", "Communication", "Comunicaci\u00f3n"], ["procedure_or_scope", "Procedure or scope", "Procedimiento o alcance"], ["supervision", "Supervision", "Supervisi\u00f3n"], ["not_known", "Not known", "No se sabe"]] }],
        ["what_was_done", "4", "s", "textarea", "What was done, by whom, and when", "Lo que se hizo, qui\u00e9n lo hizo y cu\u00e1ndo", { req: 1 }],
        ["date_resolved", "4", "s", "date", "Date resolved", "Fecha en que se resolvi\u00f3", { req: 1 }],
        ["customer_satisfied", "4", "s", "select", "Is the customer satisfied?", "\u00bfEst\u00e1 satisfecho el cliente?", { req: 1, opts: [["yes", "Yes", "S\u00ed"], ["no", "No", "No"], ["could_not_reach", "Could not reach them", "No se pudo contactar"]] }],
        ["happened_before", "4", "s", "select", "Has this happened before at this site?", "\u00bfHa pasado antes en este sitio?", { req: 1, opts: O1 }],
        ["complaint_closed", "4", "s", "signoff", "Complaint closed", "Queja cerrada", { signer: "view_reports", closes: 1 }],
      ] },
    "OCSA-FRM-010": { v: 1, apps: ["portal"], title: ["Corrective Action Report", "Reporte de acci\u00f3n correctiva"],
      sections: [["1", "What triggered this", "Qu\u00e9 lo origin\u00f3"], ["2", "The cause", "La causa"], ["3", "The action", "La acci\u00f3n"], ["4", "Approval", "Aprobaci\u00f3n"], ["5", "Completion", "Conclusi\u00f3n"], ["6", "Verification", "Verificaci\u00f3n"], ["7", "Effectiveness check", "Comprobaci\u00f3n de eficacia"], ["8", "Closure", "Cierre"]],
      fields: [
        ["site", "1", "a", "text", "Site", "Sitio", { req: 1 }],
        ["trigger", "1", "a", "select", "What triggered this?", "\u00bfQu\u00e9 lo origin\u00f3?", { req: 1, opts: [["repeat_complaint", "Repeat complaint", "Queja repetida"], ["failed_inspection", "Failed inspection", "Inspecci\u00f3n reprobada"], ["audit_finding", "Audit finding", "Hallazgo de auditor\u00eda"], ["safety_event", "Safety event", "Evento de seguridad"], ["repeat_defect", "Repeat defect", "Defecto repetido"], ["customer_escalation", "Customer escalation", "Escalaci\u00f3n del cliente"], ["pattern_across_sites", "Pattern across sites", "Patr\u00f3n en varios sitios"], ["other", "Other", "Otro"]] }],
        ["happening", "1", "a", "textarea", "What has been happening, and how often", "Qu\u00e9 ha estado pasando, y con qu\u00e9 frecuencia", { req: 1 }],
        ["root_cause", "2", "a", "textarea", "The root cause, in one sentence", "La causa ra\u00edz, en una oraci\u00f3n", { req: 1 }],
        ["actions", "3", "a", "grid", "What will change", "Qu\u00e9 va a cambiar", { req: 1, cols: [["action", "text", "The action", "La acci\u00f3n", { req: 1 }], ["owner", "text", "Owner", "Responsable", { req: 1 }], ["due_date", "date", "Due date", "Fecha l\u00edmite", { req: 1 }]], minRows: 1 }],
        ["raised_by", "3", "a", "signoff", "Raised by", "Levantado por", { req: 1, signer: "filer" }],
        ["approved", "4", "s", "select", "Approved", "Aprobada", { req: 1, opts: O1 }],
        ["escalated", "4", "s", "select", "Escalated", "Escalada", { req: 1, opts: O1 }],
        ["escalated_to", "4", "s", "text", "To whom, and why", "A qui\u00e9n, y por qu\u00e9"],
        ["target_date", "4", "s", "date", "Target completion date", "Fecha objetivo de conclusi\u00f3n", { req: 1 }],
        ["completed", "5", "s", "grid", "What was completed", "Qu\u00e9 se concluy\u00f3", { req: 1, cols: [["action", "text", "The action", "La acci\u00f3n", { req: 1 }], ["completed", "select", "Completed?", "\u00bfConcluida?", { req: 1, opts: O1 }], ["date", "date", "Date", "Fecha"], ["by_whom", "text", "By whom", "Por qui\u00e9n"]] }],
        ["not_completed", "5", "s", "textarea", "Where an action was not completed, why, and what replaced it", "Donde una acci\u00f3n no se concluy\u00f3, por qu\u00e9, y qu\u00e9 la reemplaz\u00f3"],
        ["verified_by", "6", "s", "text", "Verified by", "Verificado por", { req: 1 }],
        ["date_verified", "6", "s", "date", "Date verified", "Fecha de verificaci\u00f3n", { req: 1 }],
        ["how_verified", "6", "s", "select", "How it was verified", "C\u00f3mo se verific\u00f3", { req: 1, opts: [["site_visit", "Site visit", "Visita al sitio"], ["watched_the_task", "Watched the task", "Se observ\u00f3 la tarea"], ["inspection", "Inspection", "Inspecci\u00f3n"], ["records_check", "Records check", "Revisi\u00f3n de registros"], ["interview", "Interview", "Entrevista"]] }],
        ["actions_in_place", "6", "s", "select", "Actions confirmed in place", "Acciones confirmadas en su lugar", { req: 1, opts: O2 }],
        ["documents_updated", "6", "s", "select", "Documents updated and issued", "Documentos actualizados y emitidos", { req: 1, opts: O3 }],
        ["retraining_done", "6", "s", "select", "Retraining completed and recorded", "Capacitaci\u00f3n concluida y registrada", { req: 1, opts: O3 }],
        ["other_sites_checked", "6", "s", "select", "Other sites checked", "Otros sitios revisados", { req: 1, opts: O3 }],
        ["verification_photos", "6", "s", "photos", "Verification photos", "Fotos de la verificaci\u00f3n"],
        ["check_date", "7", "s", "date", "Date of the effectiveness check", "Fecha de la comprobaci\u00f3n de eficacia", { req: 1 }],
        ["checked_by", "7", "s", "text", "Checked by", "Comprobado por", { req: 1 }],
        ["problem_back", "7", "s", "select", "Has the problem come back?", "\u00bfVolvi\u00f3 el problema?", { req: 1, opts: O1 }],
        ["what_was_checked", "7", "s", "textarea", "What was checked", "Qu\u00e9 se revis\u00f3", { req: 1 }],
        ["outcome", "7", "s", "select", "Outcome", "Resultado", { req: 1, opts: [["effective_close", "Effective, close", "Eficaz, cerrar"], ["partly_effective_extend", "Partly effective, extend", "Parcialmente eficaz, extender"], ["not_effective_reopen", "Not effective, reopen", "No eficaz, reabrir"]] }],
        ["next_steps", "7", "s", "text", "If not effective, what happens next", "Si no fue eficaz, qu\u00e9 sigue"],
        ["customer_told", "8", "s", "select", "Was the customer told of the outcome?", "\u00bfSe le inform\u00f3 al cliente el resultado?", { req: 1, opts: [["yes", "Yes", "S\u00ed"], ["no", "No", "No"], ["not_from_complaint", "It did not come from a complaint", "No vino de una queja"]] }],
        ["closed", "8", "s", "signoff", "Closed", "Cerrada", { signer: "view_reports", closes: 1 }],
      ] },
    "OCSA-FRM-015": { v: 1, apps: ["portal"], title: ["Safety Inspection Checklist", "Lista de inspecci\u00f3n de seguridad"],
      sections: [["1", "The inspection", "La inspecci\u00f3n"], ["2", "The checklist", "La lista"], ["4", "Findings", "Hallazgos"], ["6", "Result", "Resultado"], ["7", "Verification", "Verificaci\u00f3n"]],
      fields: [
        ["site", "1", "a", "text", "Site", "Sitio", { req: 1 }],
        ["inspection_kind", "1", "a", "select", "What kind of inspection is this?", "\u00bfQu\u00e9 tipo de inspecci\u00f3n es?", { req: 1, opts: [["monthly", "Monthly", "Mensual"], ["quarterly_unannounced", "Quarterly, unannounced", "Trimestral, sin aviso"], ["vehicle", "Vehicle", "Veh\u00edculo"], ["storage", "Storage", "Almacenamiento"], ["annual", "Annual", "Anual"], ["incident_or_complaint", "Triggered by an incident or a complaint", "Por un incidente o una queja"], ["new_site", "New site", "Sitio nuevo"]] }],
        ["areas_covered", "1", "a", "textarea", "Areas covered, and anything you could not get into and why", "\u00c1reas revisadas, y cualquier lugar al que no pudo entrar y por qu\u00e9", { req: 1 }],
        ["chemical_storage", "2", "a", "select", "Chemical storage", "Almacenamiento de qu\u00edmicos", { req: 1, opts: O4 }],
        ["spill_response", "2", "a", "select", "Spill response", "Respuesta a derrames", { req: 1, opts: O4 }],
        ["exits_corridors", "2", "a", "select", "Exits and corridors", "Salidas y pasillos", { req: 1, opts: O4 }],
        ["first_aid_eyewash", "2", "a", "select", "First aid and eyewash", "Primeros auxilios y lavaojos", { req: 1, opts: O4 }],
        ["findings", "4", "a", "grid", "Findings", "Hallazgos", { cols: [["where_what", "text", "Where and what", "D\u00f3nde y qu\u00e9", { req: 1 }], ["severity", "select", "Severity", "Gravedad", { req: 1, opts: O5 }], ["owner", "text", "Who owns it", "Responsable", { req: 1 }], ["due_date", "date", "Due date", "Fecha l\u00edmite", { req: 1 }]] }],
        ["work_stopped", "4", "a", "select", "Was any work stopped or any item taken out of service today?", "\u00bfSe detuvo alg\u00fan trabajo o se retir\u00f3 alg\u00fan equipo de servicio hoy?", { req: 1, opts: O1 }],
        ["overall_result", "6", "a", "select", "Overall result", "Resultado general", { req: 1, opts: [["no_findings", "No findings", "Sin hallazgos"], ["findings_recorded", "Findings recorded", "Hallazgos registrados"], ["work_stopped", "Work stopped", "Trabajo detenido"], ["site_not_accessible", "Site not accessible", "Sitio sin acceso"]] }],
        ["inspected_by", "6", "a", "signoff", "Inspected by", "Inspeccionado por", { req: 1, signer: "filer" }],
        ["findings_verified", "7", "s", "grid", "Findings verified in person", "Hallazgos verificados en persona", { cols: [["finding", "text", "The finding", "El hallazgo", { req: 1 }], ["verified_by", "text", "Verified by", "Verificado por", { req: 1 }], ["date", "date", "Date", "Fecha", { req: 1 }]] }],
        ["overdue_reported", "7", "s", "select", "Overdue findings reported to the executive team", "Hallazgos vencidos reportados al equipo ejecutivo", { req: 1, opts: [["yes", "Yes", "S\u00ed"], ["no", "No", "No"], ["none_overdue", "None overdue", "Ninguno vencido"]] }],
        ["verification_photos", "7", "s", "photos", "Verification photos", "Fotos de la verificaci\u00f3n"],
        ["field_lead_reviewed", "7", "s", "signoff", "Field Lead, reviewed", "Encargado de campo, revisado", { signer: "view_reports", closes: 1 }],
      ] },
    "OCSA-FRM-027": { v: 1, apps: ["portal"], title: ["Environmental Compliance Audit", "Auditor\u00eda de cumplimiento ambiental"],
      sections: [["1", "The audit", "La auditor\u00eda"], ["2", "What was checked", "Lo que se revis\u00f3"], ["3", "Findings", "Hallazgos"], ["5", "Result", "Resultado"], ["6", "Verification", "Verificaci\u00f3n"]],
      fields: [
        ["site", "1", "a", "text", "Site", "Sitio", { req: 1 }],
        ["with_you", "1", "a", "text", "Who was with you?", "\u00bfQui\u00e9n estuvo con usted?", { req: 1 }],
        ["period_covered", "1", "a", "text", "Period covered", "Periodo cubierto", { req: 1 }],
        ["storm_drains", "2", "a", "select", "Storm drains", "Drenajes pluviales", { req: 1, opts: O4 }],
        ["dilution_control", "2", "a", "select", "Dilution control", "Control de diluci\u00f3n", { req: 1, opts: O4 }],
        ["waste_streams", "2", "a", "select", "Waste streams", "Separaci\u00f3n de basura", { req: 1, opts: O4 }],
        ["spill_readiness", "2", "a", "select", "Spill readiness", "Preparaci\u00f3n para derrames", { req: 1, opts: O4 }],
        ["findings", "3", "a", "grid", "Findings", "Hallazgos", { cols: [["where_what", "text", "Where and what", "D\u00f3nde y qu\u00e9", { req: 1 }], ["severity", "select", "Severity", "Gravedad", { req: 1, opts: O5 }], ["owner", "text", "Who owns it", "Responsable", { req: 1 }], ["due_date", "date", "Due date", "Fecha l\u00edmite", { req: 1 }]] }],
        ["discharge_suspected", "3", "a", "select", "Was any discharge found or suspected?", "\u00bfSe encontr\u00f3 o se sospecha alguna descarga?", { req: 1, opts: O1 }],
        ["overall_result", "5", "a", "select", "Overall result", "Resultado general", { req: 1, opts: [["no_findings", "No findings", "Sin hallazgos"], ["findings_recorded", "Findings recorded", "Hallazgos registrados"], ["activity_stopped", "Activity stopped", "Actividad detenida"], ["escalated_same_day", "Escalated the same day", "Escalado el mismo d\u00eda"]] }],
        ["performed_by", "5", "a", "signoff", "Performed by", "Realizado por", { req: 1, signer: "filer" }],
        ["findings_verified", "6", "s", "grid", "Findings verified in person", "Hallazgos verificados en persona", { cols: [["finding", "text", "The finding", "El hallazgo", { req: 1 }], ["verified_by", "text", "Verified by", "Verificado por", { req: 1 }], ["date", "date", "Date", "Fecha", { req: 1 }]] }],
        ["executive_told", "6", "s", "select", "Was the executive team told of any severity A finding?", "\u00bfSe inform\u00f3 al equipo ejecutivo de alg\u00fan hallazgo de gravedad A?", { req: 1, opts: [["yes", "Yes", "S\u00ed"], ["no", "No", "No"], ["no_severity_a", "No severity A finding", "Sin hallazgos de gravedad A"]] }],
        ["verification_photos", "6", "s", "photos", "Verification photos", "Fotos de la verificaci\u00f3n"],
        ["field_lead_reviewed", "6", "s", "signoff", "Field Lead, reviewed", "Encargado de campo, revisado", { signer: "view_reports", closes: 1 }],
      ] },
    "OCSA-FRM-032": { v: 1, apps: ["portal"], title: ["PPE Hazard Assessment Written Verification", "Verificaci\u00f3n escrita de la evaluaci\u00f3n de riesgos para EPP"],
      sections: [["1", "The workplace", "El lugar de trabajo"], ["3", "The tasks", "Las tareas"], ["5", "Employees covered", "Empleados cubiertos"], ["6", "Written verification", "Verificaci\u00f3n escrita"], ["7", "Approval", "Aprobaci\u00f3n"]],
      fields: [
        ["site", "1", "a", "text", "Site", "Sitio", { req: 1 }],
        ["reason", "1", "a", "select", "Why is this assessment being done?", "\u00bfPor qu\u00e9 se hace esta evaluaci\u00f3n?", { req: 1, opts: [["new_site", "New site", "Sitio nuevo"], ["new_task", "New task", "Tarea nueva"], ["new_product", "New product", "Producto nuevo"], ["annual_reassessment", "Annual reassessment", "Reevaluaci\u00f3n anual"], ["after_injury", "After an injury", "Despu\u00e9s de una lesi\u00f3n"]] }],
        ["walk_date", "1", "a", "date", "Date of the walk", "Fecha del recorrido", { req: 1 }],
        ["building_type", "1", "a", "select", "Building type", "Tipo de edificio", { req: 1, opts: [["office", "Office", "Oficina"], ["school", "School", "Escuela"], ["laboratory", "Laboratory", "Laboratorio"], ["industrial", "Industrial", "Industrial"], ["post_construction", "Post-construction", "Post-construcci\u00f3n"], ["grounds", "Grounds", "Exteriores"], ["other", "Other", "Otro"]] }],
        ["areas_covered", "1", "a", "textarea", "Areas covered", "\u00c1reas cubiertas", { req: 1 }],
        ["tasks", "3", "a", "grid", "Tasks assessed", "Tareas evaluadas", { req: 1, cols: [["task", "text", "Task", "Tarea", { req: 1 }], ["hazards", "text", "Hazards", "Riesgos", { req: 1 }], ["equipment_required", "text", "Equipment required", "Equipo requerido", { req: 1 }]], minRows: 1 }],
        ["employees", "5", "a", "grid", "Employees covered", "Empleados cubiertos", { req: 1, cols: [["name", "text", "Name", "Nombre", { req: 1 }], ["job_title", "text", "Job title", "Puesto", { req: 1 }], ["equipment_issued", "text", "Equipment issued", "Equipo entregado", { req: 1 }], ["fit_confirmed", "select", "Fit confirmed", "Ajuste confirmado", { req: 1, opts: O1 }], ["training_date", "date", "Training date", "Fecha de capacitaci\u00f3n", { req: 1 }]], minRows: 1 }],
        ["assessed_by", "6", "a", "signoff", "Assessed by", "Evaluado por", { req: 1, signer: "filer" }],
        ["next_reassessment_date", "7", "s", "date", "Date of the next scheduled reassessment", "Fecha de la pr\u00f3xima reevaluaci\u00f3n programada", { req: 1 }],
        ["notes", "7", "s", "textarea", "Notes", "Notas"],
        ["approved", "7", "s", "signoff", "Approved", "Aprobada", { signer: "admin", closes: 1 }],
      ] },
    "OCSA-FRM-036": { v: 1, apps: ["portal"], title: ["Safety Committee Minutes and Attendance", "Acta y asistencia del comit\u00e9 de seguridad"],
      sections: [["1", "The meeting", "La reuni\u00f3n"], ["2", "Attendance", "Asistencia"], ["4", "Open items", "Asuntos abiertos"], ["6", "New business and recommendations", "Asuntos nuevos y recomendaciones"], ["7", "Confirmation", "Confirmaci\u00f3n"]],
      fields: [
        ["meeting_date", "1", "a", "date", "Date of the meeting", "Fecha de la reuni\u00f3n", { req: 1 }],
        ["start_time", "1", "a", "time", "Start time", "Hora de inicio", { req: 1 }],
        ["end_time", "1", "a", "time", "End time", "Hora de cierre", { req: 1 }],
        ["where_held", "1", "a", "text", "Where it was held", "D\u00f3nde se llev\u00f3 a cabo", { req: 1 }],
        ["chair", "1", "a", "text", "Chair", "Presidente", { req: 1 }],
        ["secretary", "1", "a", "text", "Secretary", "Secretario", { req: 1 }],
        ["members", "2", "a", "grid", "Members", "Miembros", { req: 1, cols: [["name", "text", "Name", "Nombre", { req: 1 }], ["role", "text", "Role", "Puesto", { req: 1 }], ["represents", "select", "Represents", "Representa", { req: 1, opts: [["employer", "Employer", "La empresa"], ["employees", "Employees", "Los empleados"]] }], ["present", "select", "Present", "Presente", { req: 1, opts: O1 }]], minRows: 4 }],
        ["quorum", "2", "a", "select", "Was there a quorum?", "\u00bfHubo qu\u00f3rum?", { req: 1, opts: O1 }],
        ["open_items", "4", "a", "grid", "Open items", "Asuntos abiertos", { cols: [["item", "text", "Item", "Asunto", { req: 1 }], ["owner", "text", "Owner", "Responsable", { req: 1 }], ["due", "date", "Due", "Fecha l\u00edmite", { req: 1 }], ["status", "select", "Status this meeting", "Estado en esta reuni\u00f3n", { req: 1, opts: [["open", "Open", "Abierto"], ["done_to_verify", "Done, to verify", "Hecho, por verificar"], ["closed", "Closed", "Cerrado"]] }]] }],
        ["recommendations", "6", "a", "grid", "Recommendations to management", "Recomendaciones a la direcci\u00f3n", { cols: [["recommendation", "text", "Recommendation", "Recomendaci\u00f3n", { req: 1 }], ["date_sent", "date", "Date sent", "Fecha de env\u00edo"], ["response_due", "date", "Response due", "Respuesta para"], ["outcome", "text", "Outcome", "Resultado"]] }],
        ["recorded_by", "6", "a", "signoff", "Recorded by", "Registrada por", { req: 1, signer: "filer" }],
        ["confirmed_at_meeting_of", "7", "s", "date", "Confirmed at the meeting of", "Confirmada en la reuni\u00f3n del", { req: 1 }],
        ["corrections_before_confirming", "7", "s", "textarea", "Corrections made before confirming", "Correcciones hechas antes de confirmar"],
        ["confirmed_by_chair", "7", "s", "signoff", "Confirmed by the chair", "Confirmada por el presidente", { signer: "view_reports", closes: 1 }],
      ] },
    "OCSA-FRM-005": { v: 1, apps: ["portal"], title: ["Daily Service Log", "Registro diario de servicio"],
      sections: [["1", "The shift", "El turno"], ["2", "Areas cleaned", "\u00c1reas atendidas"], ["6", "Safety", "Seguridad"], ["8", "Sign-offs", "Firmas"]],
      fields: [
        ["site", "1", "a", "text", "Site", "Sitio", { prefill: 1 }],
        ["log_date", "1", "a", "date", "Date", "Fecha", { prefill: 1 }],
        ["filled_in_by", "1", "a", "text", "Filled in by", "Llenado por", { prefill: 1 }],
        ["crew_start", "1", "a", "time", "What time did your crew start?", "\u00bfA qu\u00e9 hora empez\u00f3 su equipo?", { req: 1 }],
        ["crew_finish", "1", "a", "time", "What time did your crew finish?", "\u00bfA qu\u00e9 hora termin\u00f3 su equipo?", { req: 1 }],
        ["people_scheduled", "1", "a", "text", "How many people were scheduled?", "\u00bfCu\u00e1ntas personas estaban programadas?", { req: 1 }],
        ["people_worked", "1", "a", "text", "How many people worked?", "\u00bfCu\u00e1ntas personas trabajaron?", { req: 1 }],
        ["areas", "2", "a", "grid", "Areas cleaned", "\u00c1reas atendidas", { req: 1, cols: [["answer", "select", "Areas cleaned", "\u00c1reas atendidas", { req: 1, opts: [["done", "Done", "Hecho"], ["partly_done", "Partly done", "Hecho en parte"], ["not_done", "Not done", "No hecho"], ["not_at_site", "Not at this site", "No hay en este sitio"]] }]], rows: [["entrances_lobby", "Entrances and lobby", "Entradas y vest\u00edbulo"], ["offices_workstations", "Offices and workstations", "Oficinas y estaciones de trabajo"], ["classrooms_meeting_rooms", "Classrooms and meeting rooms", "Salones y salas de reuniones"], ["restrooms", "Restrooms", "Ba\u00f1os"], ["corridors_stairwells", "Corridors and stairwells", "Pasillos y escaleras"], ["cafeteria_kitchen_break", "Cafeteria, kitchen and break areas", "Cafeter\u00eda, cocina y \u00e1reas de descanso"], ["gym_auditorium_large", "Gym, auditorium and large spaces", "Gimnasio, auditorio y espacios grandes"], ["lab_restricted", "Lab or restricted areas", "Laboratorios o \u00e1reas restringidas"], ["industrial_floor", "Industrial floor areas", "\u00c1reas de piso industrial"], ["outside_grounds", "Outside and grounds", "Exterior y terrenos"]] }],
        ["anyone_hurt", "6", "a", "select", "Was anyone hurt, nearly hurt, or exposed to anything this shift?", "\u00bfAlguien se lastim\u00f3, casi se lastima o estuvo expuesto a algo en este turno?", { req: 1, opts: O1 }],
        ["found_unsafe", "6", "a", "select", "Did you find anything unsafe in the building?", "\u00bfEncontr\u00f3 algo peligroso en el edificio?", { req: 1, opts: O1 }],
        ["crew_lead_signoff", "8", "a", "signoff", "Crew lead", "L\u00edder de equipo", { req: 1, signer: "filer" }],
        ["site_supervisor_review", "8", "s", "signoff", "Site supervisor, reviewed", "Supervisor del sitio, revisado", { signer: "view_reports" }],
      ] },
    "OCSA-FRM-019": { v: 1, apps: ["portal","dashboard"], title: ["PPE Compliance Log, monthly check", "Registro de cumplimiento de EPP, revisi\u00f3n mensual"],
      sections: [["1", "The month", "El mes"], ["2", "Wear checks", "Revisiones de uso"], ["3", "Problems this month", "Problemas de este mes"], ["4", "Sign-offs", "Firmas"]],
      fields: [
        ["site", "1", "a", "text", "Site", "Sitio", { prefill: 1 }],
        ["filled_in_by", "1", "a", "text", "Filled in by", "Llenado por", { prefill: 1 }],
        ["month", "1", "a", "text", "Which month does this cover?", "\u00bfQu\u00e9 mes cubre este reporte?", { req: 1 }],
        ["people_this_month", "1", "a", "text", "How many people worked at this site this month?", "\u00bfCu\u00e1ntas personas trabajaron en este sitio este mes?", { req: 1 }],
        ["wear_checks", "2", "a", "grid", "Wear checks", "Revisiones de uso", { req: 1, cols: [["date", "date", "Date", "Fecha", { req: 1 }], ["task", "text", "Task you watched", "Tarea que observ\u00f3", { req: 1 }], ["people", "text", "How many people", "Cu\u00e1ntas personas", { req: 1 }], ["wearing", "select", "Wearing what they need?", "\u00bfUsaban lo que necesitan?", { req: 1, opts: [["all", "All", "Todos"], ["some", "Some", "Algunos"], ["none", "None", "Ninguno"]] }], ["notes", "text", "Notes", "Notas"]], minRows: 2, maxRows: 10 }],
        ["stopped_work", "3", "a", "select", "Did anyone stop work because equipment was missing?", "\u00bfAlguien dej\u00f3 de trabajar porque faltaba equipo?", { req: 1, opts: O1 }],
        ["hazard_review", "3", "a", "select", "Does anything this month mean the site's hazard assessment should be looked at again?", "\u00bfAlgo de este mes indica que se debe revisar de nuevo la evaluaci\u00f3n de riesgos del sitio?", { req: 1, opts: O1 }],
        ["site_supervisor_signoff", "4", "a", "signoff", "Site supervisor", "Supervisor del sitio", { req: 1, signer: "filer" }],
        ["field_lead_review", "4", "s", "signoff", "Field Lead, reviewed", "Encargado de campo, revisado", { signer: "view_reports" }],
      ] },
    "OCSA-FRM-004": { v: 1, apps: ["portal"], title: ["Pre-Service Site Assessment", "Evaluaci\u00f3n del sitio antes del servicio"],
      sections: [["1", "Assessment details", "Datos de la evaluaci\u00f3n"], ["2", "Site overview", "Datos generales del sitio"], ["3", "Area schedule", "Lista de \u00e1reas"], ["12", "Summary", "Resumen"], ["13", "Supervisor section", "Para uso de OCSA"]],
      fields: [
        ["assessment_date", "1", "a", "date", "Date of assessment", "Fecha de la evaluaci\u00f3n", { req: 1 }],
        ["purpose", "1", "a", "select", "Purpose", "Motivo", { req: 1, opts: [["new_bid", "New bid", "Nueva licitaci\u00f3n"], ["contract_start", "Contract start", "Inicio de contrato"], ["annual_review", "Annual review", "Revisi\u00f3n anual"], ["scope_change", "Scope change", "Cambio de alcance"], ["reassessment_after_failure", "Reassessment after a service failure", "Nueva evaluaci\u00f3n tras una falla del servicio"]] }],
        ["customer", "2", "a", "text", "Customer organization", "Organizaci\u00f3n del cliente", { req: 1 }],
        ["site_name", "2", "a", "text", "Site or building name", "Nombre del sitio o edificio", { req: 1 }],
        ["building_type", "2", "a", "select", "Building type and use", "Tipo y uso del edificio", { req: 1, opts: [["office", "Office", "Oficinas"], ["school", "School", "Escuela"], ["laboratory", "Laboratory", "Laboratorio"], ["industrial", "Industrial", "Industrial"], ["warehouse", "Warehouse", "Almac\u00e9n"], ["mixed", "Mixed", "Mixto"], ["other", "Other", "Otro"]] }],
        ["areas", "3", "a", "grid", "Areas", "\u00c1reas", { req: 1, cols: [["area", "text", "Area or room", "\u00c1rea o sal\u00f3n", { req: 1 }], ["area_type", "text", "Area type", "Tipo de \u00e1rea"], ["class", "select", "Class", "Clase", { req: 1, opts: [["critical", "Critical", "Cr\u00edtica"], ["standard", "Standard", "Est\u00e1ndar"], ["support", "Support", "De apoyo"]] }], ["square_feet", "text", "Square feet", "Pies cuadrados"], ["floor_surface", "text", "Floor surface", "Superficie del piso"], ["density", "select", "Density", "Densidad", { req: 1, opts: [["open", "Open", "Abierta"], ["light", "Light", "Ligera"], ["medium", "Medium", "Media"], ["heavy", "Heavy", "Alta"]] }]], minRows: 1, maxRows: 60 }],
        ["cleanable_square_feet", "3", "a", "number", "Total cleanable square feet", "Total de pies cuadrados a limpiar", { req: 1 }],
        ["window_hours", "12", "a", "number", "Service window available, hours per day", "Horario disponible, horas por d\u00eda", { req: 1 }],
        ["assumptions", "12", "a", "textarea", "Assumptions made", "Suposiciones hechas", { req: 1 }],
        ["assessment_complete", "12", "a", "select", "Assessment complete and enough to plan the labor", "Evaluaci\u00f3n completa y suficiente para calcular la mano de obra", { req: 1, opts: O1 }],
        ["customer_acknowledgement", "12", "a", "customer_signature", "Customer acknowledgement", "Reconocimiento del cliente"],
        ["to_correct", "13", "s", "textarea", "Anything to correct before the labor calculation", "Algo que corregir antes del c\u00e1lculo de mano de obra"],
        ["field_lead_reviewed", "13", "s", "signoff", "Field Lead, reviewed", "Encargado de campo, revisado", { signer: "view_reports", closes: 1 }],
      ] },
    "OCSA-FRM-014": { v: 1, apps: ["portal","dashboard"], title: ["Change of Service Request", "Solicitud de cambio de servicio"],
      sections: [["1", "The request", "La solicitud"], ["2", "Where it goes", "A d\u00f3nde va"], ["3", "Assessment", "Evaluaci\u00f3n"], ["4", "Pricing", "Precio"], ["5", "Approval inside OCSA", "Aprobaci\u00f3n dentro de OCSA"], ["6", "The customer's answer", "La respuesta del cliente"], ["7", "Putting it in place", "Puesta en marcha"], ["8", "Checked after the change", "Verificaci\u00f3n despu\u00e9s del cambio"], ["9", "Closure", "Cierre"]],
      fields: [
        ["date_received", "1", "a", "date", "Date received", "Fecha de recepci\u00f3n", { req: 1 }],
        ["source", "1", "a", "select", "Where it came from", "De d\u00f3nde vino", { req: 1, opts: [["customer", "The customer", "El cliente"], ["prime_contractor", "The prime contractor", "El contratista principal"], ["ocsa_operations", "OCSA operations", "Operaciones de OCSA"], ["ocsa_leadership", "OCSA leadership", "Direcci\u00f3n de OCSA"]] }],
        ["customer", "1", "a", "text", "Customer organization", "Organizaci\u00f3n del cliente", { req: 1 }],
        ["site", "1", "a", "text", "Site or building", "Sitio o edificio", { req: 1 }],
        ["requester", "1", "a", "text", "Who asked: name and role", "Qui\u00e9n lo pidi\u00f3: nombre y puesto", { req: 1 }],
        ["service_line", "1", "a", "select", "Service line affected", "L\u00ednea de servicio afectada", { req: 1, opts: [["office", "Office", "Oficinas"], ["schools", "Schools", "Escuelas"], ["laboratory", "Laboratory", "Laboratorio"], ["industrial", "Industrial", "Industrial"], ["disinfection", "Disinfection", "Desinfecci\u00f3n"], ["post_construction", "Post-construction", "Despu\u00e9s de obra"], ["day_porter", "Day porter", "Conserje de d\u00eda"], ["landscaping", "Landscaping", "Jardiner\u00eda"]] }],
        ["request", "1", "a", "textarea", "What is being asked", "Qu\u00e9 se pide", { req: 1 }],
        ["route", "2", "a", "select", "Route", "Ruta", { req: 1, opts: [["change_of_service", "Change of service", "Cambio de servicio"], ["special_request", "Special request", "Solicitud especial"], ["within_scope", "Within scope", "Dentro del alcance"], ["complaint", "Complaint", "Queja"]] }],
        ["route_reason", "2", "a", "text", "Reason for the route", "Raz\u00f3n de la ruta", { req: 1 }],
        ["kind_of_change", "2", "a", "select", "Kind of change", "Tipo de cambio", { opts: [["add", "Add", "Agregar"], ["remove", "Remove", "Quitar"], ["increase", "Increase", "Aumentar"], ["decrease", "Decrease", "Disminuir"]] }],
        ["site_walked", "3", "s", "select", "Site walked for the assessment", "Se recorri\u00f3 el sitio para la evaluaci\u00f3n", { req: 1, opts: O6, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["touches", "3", "s", "grid", "What it touches", "Lo que toca", { req: 1, cols: [["affected", "select", "Affected", "Afectado", { req: 1, opts: O1 }], ["detail", "text", "Detail", "Detalle"]], rows: [["labor_hours", "Labor hours per service day", "Horas de trabajo por d\u00eda de servicio"], ["staffing", "Staffing and assignments", "Personal y asignaciones"], ["scope_document", "Scope of work document", "Documento de alcance"], ["area_class", "Area class and score weight", "Clase de \u00e1rea y peso en el puntaje"], ["inspection", "Inspection schedule and form", "Calendario y formulario de inspecci\u00f3n"], ["products", "Products and how much is used", "Productos y consumo"], ["equipment", "Equipment", "Equipo"], ["safety", "Safety and PPE", "Seguridad y EPP"], ["access", "Access, keys and clearances", "Acceso, llaves y autorizaciones"], ["insurance", "Insurance and exposure", "Seguro y exposici\u00f3n"], ["subcontractors", "Subcontractors", "Subcontratistas"], ["waste", "Waste and environmental", "Basura y ambiental"], ["billing", "Billing", "Facturaci\u00f3n"]], when: {"key":"route","anyOf":["change_of_service"]} }],
        ["hours_per_week", "3", "s", "number", "Labor hours added or removed per week", "Horas de trabajo agregadas o quitadas por semana", { req: 1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["can_absorb", "3", "s", "select", "Can the current staff absorb it?", "\u00bfPuede el personal actual absorberlo?", { req: 1, opts: O1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["why_absorb", "3", "s", "text", "Why they can absorb it", "Por qu\u00e9 pueden absorberlo", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["before_start", "3", "s", "textarea", "What must happen before it starts", "Lo que debe pasar antes de que empiece", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["labor_cost", "4", "s", "number", "Labor cost per billing period, dollars", "Costo de mano de obra por per\u00edodo, d\u00f3lares", { req: 1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["materials_cost", "4", "s", "number", "Materials and supplies, dollars", "Materiales y suministros, d\u00f3lares", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["equipment_cost", "4", "s", "number", "Equipment, dollars", "Equipo, d\u00f3lares", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["training_cost", "4", "s", "number", "Training and one-time costs, dollars", "Capacitaci\u00f3n y costos \u00fanicos, d\u00f3lares", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["subcontracted_cost", "4", "s", "number", "Subcontracted part, dollars", "Parte subcontratada, d\u00f3lares", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["total_change", "4", "s", "number", "Total change to the contract value, dollars", "Cambio total al valor del contrato, d\u00f3lares", { req: 1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["billing_period_from", "4", "s", "text", "Billing period it applies from", "Per\u00edodo de facturaci\u00f3n desde el que aplica", { req: 1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["rate_basis", "4", "s", "text", "Rate basis confirmed by the Controller: name and date", "Base de tarifa confirmada por el Contralor: nombre y fecha", { req: 1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["approval_level", "5", "s", "select", "Approval level", "Nivel de aprobaci\u00f3n", { req: 1, opts: [["level_2", "Level 2, the Vice President", "Nivel 2, el Vicepresidente"], ["level_3", "Level 3, the Executive Vice President and the Chief Financial Officer", "Nivel 3, el Vicepresidente Ejecutivo y el Director de Finanzas"]], when: {"key":"route","anyOf":["change_of_service"]} }],
        ["decision", "5", "s", "select", "Decision", "Decisi\u00f3n", { req: 1, opts: [["approved", "Approved", "Aprobado"], ["declined", "Declined", "Rechazado"], ["returned", "Returned for more information", "Devuelto para m\u00e1s informaci\u00f3n"]], when: {"key":"route","anyOf":["change_of_service"]} }],
        ["conditions", "5", "s", "text", "Conditions on the approval", "Condiciones de la aprobaci\u00f3n", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["approved", "5", "s", "signoff", "Approved", "Aprobado", { signer: "admin" }],
        ["answer_within_five_days", "6", "s", "select", "Written answer sent within five working days of the assessment", "Respuesta por escrito enviada en cinco d\u00edas h\u00e1biles desde la evaluaci\u00f3n", { req: 1, opts: O1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["answer_complete", "6", "s", "select", "It gave the price, the start date and anything needed first", "Incluy\u00f3 el precio, la fecha de inicio y lo que se necesita antes", { req: 1, opts: O1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["date_sent", "6", "s", "text", "Date sent, and by whom", "Fecha de env\u00edo, y por qui\u00e9n", { req: 1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["if_late", "6", "s", "text", "If late, the interim answer and the new date given", "Si fue tarde, la respuesta provisional y la nueva fecha", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["customer_outcome", "6", "s", "select", "Customer outcome", "Resultado con el cliente", { req: 1, opts: [["accepted", "Accepted", "Aceptado"], ["declined", "Declined", "Rechazado"], ["negotiating", "Negotiating", "En negociaci\u00f3n"], ["withdrawn", "Withdrawn", "Retirado"]], when: {"key":"route","anyOf":["change_of_service"]} }],
        ["acceptance_received", "6", "s", "date", "Written acceptance received on", "Aceptaci\u00f3n por escrito recibida el", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["agreed_start", "6", "s", "date", "Agreed start date", "Fecha de inicio acordada", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["declined_reason", "6", "s", "text", "If declined, the reason the customer gave", "Si se rechaz\u00f3, la raz\u00f3n que dio el cliente", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["done", "7", "s", "grid", "Done", "Hecho", { req: 1, cols: [["done", "select", "Done", "Hecho", { req: 1, opts: O6 }]], rows: [["area_list", "Site file area list, class and frequency updated", "Lista de \u00e1reas, clases y frecuencias del sitio actualizada"], ["staffing_plan", "Staffing plan and assignments updated", "Plan de personal y asignaciones actualizados"], ["inspection_schedule", "Inspection schedule and form updated", "Calendario y formulario de inspecci\u00f3n actualizados"], ["access", "Access, keys or clearances in hand", "Acceso, llaves o autorizaciones obtenidas"], ["chemical_list", "New products on the site chemical list with a current sheet", "Productos nuevos en la lista de qu\u00edmicos del sitio con hoja vigente"], ["workers_told", "Every worker on the shift told what changes and from when", "Cada trabajador del turno informado de qu\u00e9 cambia y desde cu\u00e1ndo"], ["subcontractor_told", "Subcontractor told", "Subcontratista informado"], ["billing_told", "Billing told the change and the date", "Facturaci\u00f3n informada del cambio y la fecha"], ["customer_told", "Customer told in writing that it has started", "Cliente informado por escrito de que ya empez\u00f3"]], when: {"key":"route","anyOf":["change_of_service"]} }],
        ["crew_told", "7", "s", "text", "Crew told by, and date", "Equipo informado por, y fecha", { req: 1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["actual_start", "7", "s", "date", "Actual start date", "Fecha real de inicio", { req: 1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["date_moved", "7", "s", "text", "If the date moved, why and when the customer was told", "Si la fecha cambi\u00f3, por qu\u00e9 y cu\u00e1ndo se le avis\u00f3 al cliente", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["first_inspection", "8", "s", "date", "First inspection after the change: date", "Primera inspecci\u00f3n despu\u00e9s del cambio: fecha", { req: 1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["happening", "8", "s", "select", "Is the change happening at all?", "\u00bfSe est\u00e1 haciendo el cambio?", { req: 1, opts: O2, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["agreed_frequency", "8", "s", "select", "At the agreed frequency?", "\u00bfCon la frecuencia acordada?", { req: 1, opts: O2, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["inspectable", "8", "s", "select", "Can it be inspected as written?", "\u00bfSe puede inspeccionar como est\u00e1 escrito?", { req: 1, opts: O1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["staffing_matches", "8", "s", "select", "Does staffing match the change?", "\u00bfEl personal corresponde al cambio?", { req: 1, opts: O1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["reduction_stopped", "8", "s", "select", "If a reduction, has the removed work stopped and come out of the plan?", "Si fue una reducci\u00f3n, \u00bfse dej\u00f3 de hacer el trabajo y se quit\u00f3 del plan?", { req: 1, opts: O6, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["corrected", "8", "s", "textarea", "If absent or partly done, what was corrected and when", "Si falta o est\u00e1 en parte, qu\u00e9 se corrigi\u00f3 y cu\u00e1ndo", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["audit_inspection", "8", "s", "date", "Audit inspection within ninety days: date", "Inspecci\u00f3n de auditor\u00eda en noventa d\u00edas: fecha", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["corrective_action", "8", "s", "select", "Corrective action raised", "Acci\u00f3n correctiva abierta", { req: 1, opts: O1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["from_repeated_special", "9", "s", "select", "Raised from a repeated special request", "Surgi\u00f3 de una solicitud especial repetida", { req: 1, opts: O1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["trial", "9", "s", "select", "A trial change with an end date", "Un cambio de prueba con fecha de fin", { req: 1, opts: O1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["trial_dates", "9", "s", "text", "Trial start and end dates", "Fechas de inicio y fin de la prueba", { when: {"key":"route","anyOf":["change_of_service"]} }],
        ["trial_decision", "9", "s", "select", "Decision at the trial end date", "Decisi\u00f3n al terminar la prueba", { opts: [["made_permanent", "Made permanent", "Se hizo permanente"], ["stopped", "Stopped", "Se detuvo"]], when: {"key":"route","anyOf":["change_of_service"]} }],
        ["urgent_started_early", "9", "s", "select", "An urgent change started before full approval", "Un cambio urgente iniciado antes de la aprobaci\u00f3n completa", { req: 1, opts: O1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["safety_or_legal", "9", "s", "select", "A safety or legal compliance change", "Un cambio por seguridad o cumplimiento legal", { req: 1, opts: O1, when: {"key":"route","anyOf":["change_of_service"]} }],
        ["closed", "9", "s", "signoff", "Closed", "Cerrada", { signer: "view_reports", closes: 1 }],
      ] },
    "OCSA-FRM-034": { v: 2, apps: ["portal"], title: ["Site-Specific Orientation Checklist", "Lista de orientaci\u00f3n espec\u00edfica del sitio"],
      sections: [["1", "Employee and site", "Empleado y sitio"], ["2", "Access and security", "Acceso y seguridad"], ["7", "Confirmation", "Confirmaci\u00f3n"], ["8", "Supervisor section", "Para uso de OCSA"]],
      fields: [
        ["employee", "1", "a", "person", "Employee", "Empleado", { req: 1 }],
        ["badge_number", "1", "a", "text", "Badge number", "N\u00famero de empleado", { req: 1 }],
        ["job_class", "1", "a", "select", "Job class", "Categor\u00eda de puesto", { req: 1, opts: O7 }],
        ["site", "1", "a", "text", "Site name and address", "Nombre y direcci\u00f3n del sitio", { req: 1 }],
        ["orientation_date", "1", "a", "date", "Date of orientation", "Fecha de la orientaci\u00f3n", { req: 1 }],
        ["access_covered", "2", "a", "grid", "Access and security covered", "Acceso y seguridad cubiertos", { req: 1, cols: [["covered", "select", "Covered", "Cubierto", { req: 1, opts: [["done", "Done", "Hecho"], ["not_applicable", "Not applicable", "No aplica"]] }]], rows: [["enter_and_leave", "How to enter and leave the building, and at what times", "C\u00f3mo entrar y salir del edificio, y a qu\u00e9 horas"], ["keys_issued", "Keys, badges, fobs or codes issued, and the rule never to share them", "Llaves, credenciales, llaveros o c\u00f3digos entregados, y la regla de nunca compartirlos"], ["access_fails", "Who to call if access fails or a key is lost", "A qui\u00e9n llamar si falla el acceso o se pierde una llave"], ["alarm", "Alarm procedure, including setting and unsetting", "Procedimiento de la alarma, incluido activarla y desactivarla"], ["restricted_areas", "Areas that are restricted or out of scope", "\u00c1reas restringidas o fuera del alcance"], ["secured_at_end", "How the building is left secured at end of shift", "C\u00f3mo se deja asegurado el edificio al final del turno"], ["no_visitors", "No visitor is let in by OCSA staff", "El personal de OCSA no deja entrar a ning\u00fan visitante"]] }],
        ["employee_confirms", "7", "a", "grid", "The employee confirms", "El empleado confirma", { req: 1, cols: [["confirmed", "select", "Confirmed", "Confirmado", { req: 1, opts: [["yes", "Yes", "S\u00ed"]] }]], rows: [["received", "I received this orientation at the site named above, before I began work there", "Recib\u00ed esta orientaci\u00f3n en el sitio indicado, antes de empezar a trabajar ah\u00ed"], ["language", "It was given in a language I understand and I was able to ask questions", "Se dio en un idioma que entiendo y pude hacer preguntas"], ["who_to_call", "I know who to call, how to report a problem, and what to do in an emergency", "S\u00e9 a qui\u00e9n llamar, c\u00f3mo reportar un problema y qu\u00e9 hacer en una emergencia"], ["chemicals", "I know which chemicals I use here and where the safety data sheets are", "S\u00e9 qu\u00e9 qu\u00edmicos uso aqu\u00ed y d\u00f3nde est\u00e1n las hojas de seguridad"]] }],
        ["employee_signature", "7", "a", "customer_signature", "Employee signature", "Firma del empleado", { req: 1, nameFrom: "employee" }],
        ["orientation_delivered", "7", "a", "signoff", "Orientation delivered", "Orientaci\u00f3n impartida", { req: 1, signer: "filer" }],
        ["filed_in_personnel_file", "8", "s", "signoff", "Filed in the personnel file", "Archivado en el expediente del personal", { signer: "admin", closes: 1 }],
      ] },
    "OCSA-FRM-013": { v: 3, apps: ["portal","dashboard"], title: ["Call Intake and Communication Log", "Registro de llamadas y comunicaciones"],
      sections: [["1", "The contact", "El contacto"], ["2", "What happened", "Lo que pas\u00f3"], ["3", "Supervisor section", "Para uso de OCSA"]],
      fields: [
        ["date", "1", "a", "date", "Date", "Fecha", { req: 1 }],
        ["time", "1", "a", "time", "Time", "Hora", { req: 1 }],
        ["came_in", "1", "a", "select", "How it came in", "C\u00f3mo lleg\u00f3", { req: 1, opts: [["telephone", "Telephone", "Tel\u00e9fono"], ["email", "Email", "Correo electr\u00f3nico"], ["in_person", "In person at the site", "En persona en el sitio"], ["text_message", "Text message", "Mensaje de texto"], ["meeting", "In a meeting", "En una reuni\u00f3n"], ["client_link", "Client link", "Enlace del cliente"]] }],
        ["raised_by", "1", "a", "text", "Who raised it: name and role", "Qui\u00e9n lo plante\u00f3: nombre y puesto", { req: 1 }],
        ["contact_details", "1", "a", "text", "Their telephone or email", "Su tel\u00e9fono o correo"],
        ["customer", "1", "a", "text", "Customer organization", "Organizaci\u00f3n del cliente", { req: 1 }],
        ["site", "1", "a", "text", "Site", "Sitio", { req: 1 }],
        ["kind", "1", "a", "select", "Kind of contact", "Tipo de contacto", { req: 1, opts: [["request", "Request", "Solicitud"], ["question", "Question", "Pregunta"], ["complaint", "Complaint", "Queja"], ["compliment", "Compliment", "Felicitaci\u00f3n"], ["notice", "Notice from the customer", "Aviso del cliente"]] }],
        ["said", "1", "a", "textarea", "What they said, in their own words", "Lo que dijo, en sus propias palabras", { req: 1 }],
        ["photos", "1", "a", "photos", "Photos", "Fotos"],
        ["fixed_on_shift", "2", "a", "select", "Fixed on the shift", "Se resolvi\u00f3 en el turno", { req: 1, opts: O6 }],
        ["what_was_done", "2", "a", "textarea", "What was done, and what they were told", "Lo que se hizo, y lo que se le dijo", { req: 1 }],
        ["next_steps", "2", "a", "text", "What happens next, and by when", "Lo que sigue, y para cu\u00e1ndo"],
        ["passed_to_supervisor", "2", "a", "select", "Passed to the supervisor the same shift", "Se pas\u00f3 al supervisor el mismo turno", { req: 1, opts: O1 }],
        ["passed_to_field_lead", "2", "a", "select", "Passed to the Field Lead", "Se pas\u00f3 al Encargado de campo", { req: 1, opts: O8 }],
        ["concerns_employee", "2", "a", "select", "Does it concern an employee personally?", "\u00bfSe refiere a un empleado en lo personal?", { req: 1, opts: O1 }],
        ["went_next", "2", "a", "multiselect", "Where it went next", "A d\u00f3nde se envi\u00f3 despu\u00e9s", { req: 1, opts: [["handled_here", "Handled here", "Se atendi\u00f3 aqu\u00ed"], ["complaint_log", "The complaint log", "El registro de quejas"], ["change_of_service", "A Change of Service Request", "Una solicitud de cambio de servicio"], ["incident_report", "An incident report", "Un reporte de incidente"], ["controller", "The Controller", "El Contralor"]] }],
        ["complaint_reference", "2", "a", "text", "Complaint log reference", "Referencia en el registro de quejas"],
        ["acknowledged", "3", "s", "select", "Acknowledged in writing within one working day", "Se confirm\u00f3 por escrito en un d\u00eda h\u00e1bil", { req: 1, opts: O8 }],
        ["answered", "3", "s", "select", "Answered within five working days", "Se respondi\u00f3 en cinco d\u00edas h\u00e1biles", { req: 1, opts: O8 }],
        ["satisfied", "3", "s", "select", "The customer confirmed they are satisfied with the outcome", "El cliente confirm\u00f3 que est\u00e1 satisfecho con el resultado", { req: 1, opts: O8 }],
        ["confirmed_on", "3", "s", "text", "Date confirmed, and how", "Fecha de la confirmaci\u00f3n, y c\u00f3mo"],
        ["closed", "3", "s", "signoff", "Closed", "Cerrado", { signer: "view_reports", closes: 1 }],
      ] },
    "OCSA-FRM-012": { v: 2, apps: ["dashboard"], title: ["Employee Performance Evaluation", "Evaluaci\u00f3n del desempe\u00f1o del empleado"],
      sections: [["1", "The review", "La evaluaci\u00f3n"], ["2", "Ratings", "Calificaciones"], ["3", "For supervisors only", "Solo para supervisores"], ["4", "Summary", "Resumen"], ["5", "The employee", "El empleado"], ["6", "Supervisor section", "Para uso de OCSA"]],
      fields: [
        ["employee", "1", "a", "person", "Employee", "Empleado", { req: 1 }],
        ["badge_number", "1", "a", "text", "Badge number", "N\u00famero de empleado", { req: 1 }],
        ["job_class", "1", "a", "select", "Job class", "Categor\u00eda de puesto", { req: 1, opts: O7 }],
        ["sites_worked", "1", "a", "text", "Site or sites worked", "Sitio o sitios donde trabaja", { req: 1 }],
        ["review_kind", "1", "a", "select", "Kind of review", "Tipo de evaluaci\u00f3n", { req: 1, opts: [["probationary", "Probationary review at ninety days", "Evaluaci\u00f3n del per\u00edodo de prueba a los noventa d\u00edas"], ["annual", "Annual review", "Evaluaci\u00f3n anual"]] }],
        ["period_covered", "1", "a", "text", "Period covered", "Per\u00edodo evaluado", { req: 1 }],
        ["review_date", "1", "a", "date", "Date of the review", "Fecha de la evaluaci\u00f3n", { req: 1 }],
        ["ratings", "2", "a", "grid", "Ratings", "Calificaciones", { req: 1, cols: [["rating", "select", "Rating", "Calificaci\u00f3n", { req: 1, opts: O9 }], ["comments", "text", "Comments", "Comentarios"]], rows: [["quality_of_work", "Quality of work against the job description", "Calidad del trabajo seg\u00fan la descripci\u00f3n del puesto"], ["attendance", "Attendance and punctuality", "Asistencia y puntualidad"], ["training", "Training completed and current", "Capacitaci\u00f3n completada y vigente"], ["safety_rules", "Following safety rules and wearing PPE", "Cumplimiento de las reglas de seguridad y uso del EPP"], ["conduct", "Conduct with building occupants and customers", "Trato con los ocupantes del edificio y los clientes"], ["teamwork", "Teamwork and communication", "Trabajo en equipo y comunicaci\u00f3n"], ["equipment_care", "Care of equipment and supplies", "Cuidado del equipo y los suministros"]] }],
        ["is_supervisor", "3", "a", "select", "Is this person a supervisor?", "\u00bfEsta persona es supervisor?", { req: 1, opts: O1 }],
        ["crew_safety", "3", "a", "grid", "Safety performance of the crew", "Desempe\u00f1o de seguridad del equipo", { cols: [["rating", "select", "Rating", "Calificaci\u00f3n", { req: 1, opts: O9 }], ["comments", "text", "Comments", "Comentarios"]], rows: [["inspections_on_time", "Inspections completed on time", "Inspecciones hechas a tiempo"], ["findings_closed", "Findings closed within the deadline", "Hallazgos cerrados dentro del plazo"], ["crew_training", "Crew training kept current", "Capacitaci\u00f3n del equipo al d\u00eda"], ["injuries_reported", "Injuries and near misses reported", "Lesiones y casi accidentes reportados"], ["repeat_findings", "Repeat findings", "Hallazgos repetidos"]] }],
        ["strengths", "4", "a", "textarea", "Strengths", "Fortalezas", { req: 1 }],
        ["to_improve", "4", "a", "textarea", "What to improve, and the support OCSA will give", "Lo que se debe mejorar, y el apoyo que dar\u00e1 OCSA", { req: 1 }],
        ["training_to_arrange", "4", "a", "text", "Training to arrange", "Capacitaci\u00f3n a programar"],
        ["goals", "4", "a", "textarea", "Goals until the next review", "Metas hasta la pr\u00f3xima evaluaci\u00f3n"],
        ["probation_outcome", "4", "a", "select", "Outcome of a probationary review", "Resultado de la evaluaci\u00f3n del per\u00edodo de prueba", { opts: [["confirmed", "Confirmed in the role", "Confirmado en el puesto"], ["extended", "Probation extended", "Per\u00edodo de prueba extendido"], ["referred", "Referred to the Controller", "Enviado al Contralor"]] }],
        ["overall_rating", "4", "a", "select", "Overall rating", "Calificaci\u00f3n general", { req: 1, opts: [["exceeds", "Exceeds the standard", "Supera el est\u00e1ndar"], ["meets", "Meets the standard", "Cumple el est\u00e1ndar"], ["needs_improvement", "Needs improvement", "Necesita mejorar"]] }],
        ["employee_comments", "5", "a", "textarea", "Employee comments", "Comentarios del empleado"],
        ["photos", "5", "a", "photos", "Photos", "Fotos"],
        ["employee_signature", "5", "a", "customer_signature", "Employee signature", "Firma del empleado", { req: 1, nameFrom: "employee" }],
        ["reviewed_by", "5", "a", "signoff", "Reviewed by", "Evaluado por", { req: 1, signer: "filer" }],
        ["filed_in_personnel_file", "6", "s", "signoff", "Filed in the personnel file", "Archivado en el expediente del personal", { signer: "admin", closes: 1 }],
      ] },
    "OCSA-FRM-016": { v: 4, apps: ["portal"], title: ["Safety Incident Report", "Informe de Incidente de Seguridad"],
      sections: [["1", "Report details", "Datos del reporte"], ["2", "Classification", "Clasificaci\u00f3n"], ["3", "Person involved", "Persona involucrada"], ["4", "What happened", "Lo que pas\u00f3"], ["7", "Medical treatment", "Tratamiento m\u00e9dico"], ["8", "Recordkeeping", "Registro de lesiones"]],
      fields: [
        ["site", "1", "a", "text", "Site or location", "Sitio o ubicaci\u00f3n", { prefill: 1 }],
        ["date_reported", "1", "a", "date", "Date reported", "Fecha del reporte", { prefill: 1 }],
        ["reported_by", "1", "a", "text", "Reported by", "Reportado por", { prefill: 1 }],
        ["event_type", "2", "a", "select", "What kind of event was this?", "\u00bfQu\u00e9 tipo de evento fue este?", { req: 1, opts: [["injury", "Injury", "Lesi\u00f3n"], ["illness", "Illness", "Enfermedad"], ["near_miss", "Near miss", "Casi accidente"], ["exposure", "Exposure", "Exposici\u00f3n"], ["spill", "Spill", "Derrame"], ["sharps_find", "Sharps find", "Objeto punzante encontrado"], ["property_damage", "Property damage", "Da\u00f1o a la propiedad"], ["security", "Security", "Seguridad"], ["fire_alarm", "Fire or alarm", "Incendio o alarma"], ["equipment_failure", "Equipment failure", "Falla de equipo"], ["vehicle", "Vehicle", "Veh\u00edculo"], ["other", "Other", "Otro"]] }],
        ["severity", "2", "a", "select", "How serious was it?", "\u00bfQu\u00e9 tan grave fue?", { req: 1, opts: [["fatality", "Fatality", "Fallecimiento"], ["serious", "Serious", "Grave"], ["medical_treatment", "Medical treatment", "Tratamiento m\u00e9dico"], ["first_aid_only", "First aid only", "Solo primeros auxilios"], ["no_injury", "No injury", "Sin lesi\u00f3n"], ["property_only", "Property damage only", "Solo da\u00f1o a la propiedad"], ["near_miss", "Near miss", "Casi accidente"], ["unknown", "Unknown", "No se sabe"]] }],
        ["person_involved", "3", "a", "person", "Person involved", "Persona involucrada", { prefill: 1 }],
        ["person_employee_id", "3", "s", "text", "Employee ID", "N\u00famero de empleado"],
        ["person_job_title", "3", "s", "text", "Job title", "Puesto"],
        ["person_street_address", "3", "s", "text", "Street address", "Direcci\u00f3n"],
        ["person_city_state_zip", "3", "s", "text", "City, state and ZIP", "Ciudad, estado y c\u00f3digo postal"],
        ["person_dob", "3", "s", "date", "Date of birth", "Fecha de nacimiento"],
        ["person_sex", "3", "s", "select", "Sex", "Sexo", { opts: [["male", "Male", "Masculino"], ["female", "Female", "Femenino"], ["other", "Other", "Otro"], ["declined", "Declined to say", "Prefiere no decir"]] }],
        ["person_date_hired", "3", "s", "date", "Date hired", "Fecha de contrataci\u00f3n"],
        ["person_telephone", "3", "s", "text", "Telephone", "Tel\u00e9fono"],
        ["person_employment_type", "3", "s", "text", "Employment type", "Tipo de empleo"],
        ["event_date", "4", "a", "date", "What date did this happen?", "\u00bfQu\u00e9 d\u00eda pas\u00f3 esto?", { req: 1 }],
        ["exact_location", "4", "a", "text", "Where exactly in the building did it happen?", "\u00bfEn qu\u00e9 parte exacta del edificio pas\u00f3?", { req: 1 }],
        ["what_happened", "4", "a", "textarea", "What happened? Tell me the order it happened in.", "\u00bfQu\u00e9 pas\u00f3? D\u00edgame en qu\u00e9 orden pas\u00f3.", { req: 1 }],
        ["injury_description", "4", "a", "textarea", "What was the injury or illness? Which body part, and what kind of harm?", "\u00bfCu\u00e1l fue la lesi\u00f3n o enfermedad? \u00bfQu\u00e9 parte del cuerpo, y qu\u00e9 tipo de da\u00f1o?", { req: 1 }],
        ["harmful_object", "4", "a", "text", "What object or substance directly harmed you?", "\u00bfQu\u00e9 objeto o sustancia le hizo da\u00f1o directamente?", { req: 1 }],
        ["treatment", "7", "a", "select", "Did you get medical care?", "\u00bfRecibi\u00f3 atenci\u00f3n m\u00e9dica?", { req: 1, opts: [["none", "None", "Ninguna"], ["first_aid_only", "First aid only", "Solo primeros auxilios"], ["medical_treatment", "Medical treatment", "Tratamiento m\u00e9dico"], ["refused", "Refused care", "Rechaz\u00f3 la atenci\u00f3n"]] }],
        ["date_of_death", "7", "s", "date", "Date of death", "Fecha de fallecimiento", { when: {"key":"severity","anyOf":["fatality"]} }],
        ["reported_to_admin_date", "7", "s", "date", "Reported to the admin, date", "Reportado al administrador, fecha", { req: 1 }],
        ["reported_to_admin_time", "7", "s", "time", "Reported to the admin, time", "Reportado al administrador, hora", { req: 1 }],
        ["recordable", "8", "s", "select", "Is this a recordable case?", "\u00bfEs un caso registrable?", { opts: [["yes", "Yes", "S\u00ed"], ["no", "No", "No"], ["not_decided", "Not decided yet", "A\u00fan no se decide"]], writers: ["record_injuries"] }],
        ["outcome", "8", "s", "select", "Most serious outcome", "Resultado m\u00e1s grave", { opts: [["death", "Death", "Muerte"], ["days_away", "Days away from work", "D\u00edas de ausencia del trabajo"], ["job_transfer_or_restriction", "Job transfer or restriction", "Traslado de puesto o restricci\u00f3n"], ["other_recordable", "Other recordable case", "Otro caso registrable"]], when: {"key":"recordable","anyOf":["yes"]}, writers: ["record_injuries"] }],
        ["days_away", "8", "s", "number", "Days away from work", "D\u00edas de ausencia del trabajo", { when: {"key":"recordable","anyOf":["yes"]}, writers: ["record_injuries"] }],
        ["days_restricted", "8", "s", "number", "Days on job transfer or restriction", "D\u00edas con traslado de puesto o restricci\u00f3n", { when: {"key":"recordable","anyOf":["yes"]}, writers: ["record_injuries"] }],
        ["case_type", "8", "s", "select", "Injury or illness", "Lesi\u00f3n o enfermedad", { opts: [["injury", "Injury", "Lesi\u00f3n"], ["skin_disorder", "Skin disorder", "Trastorno de la piel"], ["respiratory", "Respiratory condition", "Afecci\u00f3n respiratoria"], ["poisoning", "Poisoning", "Envenenamiento"], ["hearing_loss", "Hearing loss", "P\u00e9rdida de audici\u00f3n"], ["other_illness", "All other illnesses", "Todas las dem\u00e1s enfermedades"]], when: {"key":"recordable","anyOf":["yes"]}, writers: ["record_injuries"] }],
        ["privacy_case", "8", "s", "select", "Privacy case (the log shows Privacy case in place of the name)", "Caso de privacidad (el registro muestra Caso de privacidad en lugar del nombre)", { opts: O1, when: {"key":"recordable","anyOf":["yes"]}, writers: ["record_injuries"] }],
        ["log_description", "8", "s", "textarea", "Describe the injury or illness, the parts of the body affected, and the object or substance that directly injured or made the person ill", "Describa la lesi\u00f3n o enfermedad, las partes del cuerpo afectadas y el objeto o la sustancia que lesion\u00f3 o enferm\u00f3 directamente a la persona", { when: {"key":"recordable","anyOf":["yes"]}, writers: ["record_injuries"] }],
      ] },
  };
  // The rest of the catalog, by title alone: the forms no picture opens.
  const TITLES = [
    ["OCSA-FRM-006", 1, ["customer"], "Facility Cleanliness Evaluation Checklist", "Lista de evaluaci\u00f3n de limpieza del edificio"],
    ["OCSA-FRM-007", 3, ["customer"], "Client Satisfaction Survey", "Encuesta de satisfacci\u00f3n del cliente"],
    ["OCSA-FRM-011", 2, ["dashboard"], "Monthly Client Performance Report", "Reporte mensual de desempe\u00f1o para el cliente"],
    ["OCSA-FRM-017", 3, ["portal"], "Biohazard Incident and Exposure Report", "Informe de Incidente y Exposici\u00f3n a Riesgo Biol\u00f3gico"],
    ["OCSA-FRM-038", 2, ["dashboard"], "Background Clearance Authorization and Payroll Deduction Agreement", "Autorizaci\u00f3n de verificaciones de antecedentes y acuerdo de deducci\u00f3n de n\u00f3mina"],
    ["OCSA-PUR-008", 1, ["dashboard"], "Product and Equipment Performance Evaluation", "Evaluaci\u00f3n del desempe\u00f1o de productos y equipos"],
  ];
  // The corrective action is started at a desk too, the way the stub's Step 253 offers it.
  const APPS = { "OCSA-FRM-010": ["portal", "dashboard"] };
  // The title a client sees on a customer form that has one (helpers/customerLinks.js).
  const CUSTOMER_TITLE = { "OCSA-FRM-009": ["Report a concern", "Informar un problema"] };

  // ---- a question as the catalog and the review view send it (helpers/formCatalog.js) -----------
  const opts = (list, lang) => (list || []).map((o) => ({ value: o[0], label: L(lang, o[1], o[2]) }));
  const column = (c, lang) => Object.assign({ key: c[0], label: L(lang, c[2], c[3]), type: c[1], required: !!(c[4] && c[4].req) },
    c[4] && c[4].opts ? { options: opts(c[4].opts, lang) } : {});
  function shape(f, lang) {
    const x = f[6] || {};
    const out = { key: f[0], label: L(lang, f[4], f[5]), type: f[3], half: f[2] === "s" ? "supervisor" : "agent", section: f[1],
      required: !!x.req, osha: false, options: opts(x.opts, lang), help: null };
    if (x.prefill) out.prefilled = true;
    if (x.when) out.appliesWhen = x.when;
    if (f[3] === "grid") {
      out.columns = (x.cols || []).map((c) => column(c, lang));
      out.rows = x.rows ? x.rows.map((r) => ({ key: r[0], label: L(lang, r[1], r[2]) })) : null;
      if (x.minRows !== undefined) out.minRows = x.minRows;
      if (x.maxRows !== undefined) out.maxRows = x.maxRows;
    }
    if (f[3] === "signoff") out.signer = x.signer;
    if (f[3] === "photos") out.maxPhotos = x.maxPhotos || 6;
    if (x.nameFrom) out.nameFrom = x.nameFrom;
    if (x.writers) out.writers = x.writers;
    return out;
  }
  const titleOf = (code, lang) => { const F = FORMS[code]; if (F) return L(lang, F.title[0], F.title[1]); const t = TITLES.find((x) => x[0] === code); return t ? L(lang, t[3], t[4]) : code; };
  const sectionsOf = (code, lang) => FORMS[code].sections.map((s) => ({ key: s[0], title: L(lang, s[1], s[2]) }));
  function catalogForm(code, lang) {
    const F = FORMS[code];
    const out = { code, title: titleOf(code, lang), version: F.v, apps: (APPS[code] || F.apps).slice(),
      fields: F.fields.filter((f) => f[2] === "a").map((f) => shape(f, lang)), sections: sectionsOf(code, lang) };
    if (CUSTOMER_TITLE[code]) out.customerTitle = L(lang, CUSTOMER_TITLE[code][0], CUSTOMER_TITLE[code][1]);
    return out;
  }
  // GET /api/forms, routes/forms.js: every form, or those an app offers, in code order.
  const catalog = (app, lang) => Object.keys(FORMS).map((c) => catalogForm(c, lang))
    .concat(TITLES.map((x) => ({ code: x[0], title: L(lang, x[3], x[4]), version: x[1], apps: x[2].slice(), fields: [] })))
    .filter((f) => !app || f.apps.indexOf(app) >= 0)
    .sort((a, b) => (a.code < b.code ? -1 : 1));

  // ---- an answer as the review view reads it ---------------------------------------------------
  // A rule a question opens on (formRuleHolds): { key, anyOf }, or any or all of several.
  const holds = (w, a) => (!w ? true : w.any ? w.any.some((x) => holds(x, a)) : w.all ? w.all.every((x) => holds(x, a))
    : (Array.isArray(a[w.key]) ? a[w.key] : [a[w.key]]).some((v) => (w.anyOf || []).indexOf(v) >= 0));
  const answered = (v) => !(v == null || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0));
  // The day and time a stamp says, read in the company's zone the way signoffStamp writes them.
  function stampWhen(iso) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: seed.TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(new Date(iso));
    const g = (k) => (p.find((x) => x.type === k) || {}).value || "";
    return { date: g("year") + "-" + g("month") + "-" + g("day"), time: g("hour") + ":" + g("minute") + " " + g("dayPeriod").toUpperCase() };
  }
  const signedText = (who, iso, lang) => { const w = stampWhen(iso); return L(lang, "Signed by " + who + " on " + w.date + " at " + w.time, "Firmado por " + who + " el " + w.date + " a las " + w.time); };
  function display(f, raw, lang) {
    const type = f[3];
    const x = f[6] || {};
    if (!answered(raw)) return type === "signoff" || type === "customer_signature" ? L(lang, "Not signed", "Sin firmar") : null;
    if (type === "signoff") return signedText(raw.name, raw.at, lang);
    if (type === "customer_signature") return signedText([raw.name, raw.role].filter(Boolean).join(", "), raw.at, lang);
    if (type === "person") return raw.name || null;
    if (type === "grid" || type === "photos") return null;
    const word = (v) => { const o = (x.opts || []).find((y) => y[0] === v); return o ? L(lang, o[1], o[2]) : String(v); };
    return Array.isArray(raw) ? raw.map(word).join(", ") : word(raw);
  }
  function fieldView(f, a, lang) {
    const out = shape(f, lang);
    const raw = Object.prototype.hasOwnProperty.call(a, f[0]) ? a[f[0]] : null;
    out.value = raw;
    out.displayValue = display(f, raw, lang);
    if (f[3] === "customer_signature" && raw && raw.signatureId) out.signature = { id: raw.signatureId };
    return out;
  }
  // A sign-off stamp and a drawn signature, the way the window reads them.
  const stamp = (id, iso, key) => ({ userId: id, name: tPersonName(id), role: ROLE[id] || null, at: iso, signature: { id: "sig-" + key } });
  const drawn = (name, role, iso, key) => ({ name, role, at: iso, signatureId: "csig-" + key });
  const person = (id) => ({ id, name: tPersonName(id) });

  // ---- the filed reports -------------------------------------------------------------------------
  // Each opens at #forms/reports/<id>. by is who filed it, customer a client who filed it from a link.
  const FILED = [
    { id: "fr-p-009", code: "OCSA-FRM-009", site: S[1], customer: ["Hollis Vandermeer", "Clinic manager"], filed: at(-2, "14:20"),
      acknowledged: { at: at(-2, "15:05"), method: "phone", by: "u-sup-1" },
      answers: { client_name: "Hollis Vandermeer", client_role: "Clinic manager", contact_preference: "by_email", building_area: "Second floor staff kitchen",
        what_happened: "The kitchen sink and counters were left dirty two nights in a row.", about_staff: "no",
        reference: "CC-0412", logged_by: "Marcus Ferreira", site: S[1].name, came_in_date: seed.shift(-2), came_in_time: "09:20", came_in_how: "client_link",
        customer: "Kestrel Way Clinic Group", customer_wants: "A deep clean of the kitchen, and a check that it is done every night.",
        complaint_kind: "cleaning_quality", urgency: "high", handled_by: "Marcus Ferreira", heard_back_same_day: "yes" } },
    { id: "fr-p-010", code: "OCSA-FRM-010", site: S[2], by: "u-sup-1", source: "admin", filed: at(-20, "16:00"),
      answers: { site: S[2].name, trigger: "failed_inspection", happening: "The dock floor markings failed two inspections in a row and the client raised it.",
        root_cause: "Floor markings were on no schedule, so nobody owned repainting them.",
        actions: [{ action: "Add dock markings to the quarterly periodic work", owner: "Marcus Ferreira", due_date: seed.shift(-10) }, { action: "Repaint the dock markings", owner: "Rashid Haddad", due_date: seed.shift(-14) }],
        raised_by: stamp("u-sup-1", at(-20, "15:58"), "raised_by"),
        approved: "yes", escalated: "no", target_date: seed.shift(-5) } },
    { id: "fr-p-015", code: "OCSA-FRM-015", site: S[0], by: "u-sup-1", filed: at(-3, "21:40"),
      answers: { site: S[0].name, inspection_kind: "monthly", areas_covered: "Every floor of both wings, the janitor closets and the loading area.",
        chemical_storage: "pass", spill_response: "fail", exits_corridors: "pass", first_aid_eyewash: "fail",
        findings: [{ where_what: "North Wing closet, spill kit missing absorbent", severity: "b", owner: "Tomasz Wisniewski", due_date: seed.shift(2) },
          { where_what: "South Wing eyewash bottle out of date", severity: "b", owner: "Marcus Ferreira", due_date: seed.shift(2) }],
        work_stopped: "no", overall_result: "findings_recorded", inspected_by: stamp("u-sup-1", at(-3, "21:38"), "inspected_by"),
        findings_verified: [{ finding: "North Wing closet, spill kit missing absorbent", verified_by: "Dana Whitlock", date: seed.shift(0) }] } },
    { id: "fr-p-027", code: "OCSA-FRM-027", site: S[2], by: "u-cap-1", filed: at(-6, "19:15"),
      answers: { site: S[2].name, with_you: "Rashid Haddad, crew lead on shift", period_covered: "February 2026",
        storm_drains: "pass", dilution_control: "fail", waste_streams: "pass", spill_readiness: "pass",
        findings: [{ where_what: "Dock A dilution station dispensing too strong", severity: "a", owner: "Priya Raghunathan", due_date: seed.shift(-5) }],
        discharge_suspected: "no", overall_result: "findings_recorded", performed_by: stamp("u-cap-1", at(-6, "19:12"), "performed_by") } },
    { id: "fr-p-032", code: "OCSA-FRM-032", site: S[1], by: "u-sup-1", filed: at(-4, "17:30"),
      answers: { site: S[1].name, reason: "annual_reassessment", walk_date: seed.shift(-4), building_type: "laboratory", areas_covered: "Clinic, corridors, restrooms and the sample storage room.",
        tasks: [{ task: "Disinfecting exam rooms", hazards: "Disinfectant splash, blood residue", equipment_required: "Nitrile gloves, safety glasses" },
          { task: "Emptying sharps-adjacent bins", hazards: "Needlestick", equipment_required: "Puncture-resistant gloves" }],
        employees: [{ name: "Elena Barbosa", job_title: "Day Porter", equipment_issued: "Gloves, glasses", fit_confirmed: "yes", training_date: seed.shift(-30) },
          { name: "Yuki Tanabe", job_title: "Custodial Lead", equipment_issued: "Gloves, glasses, apron", fit_confirmed: "yes", training_date: seed.shift(-30) }],
        assessed_by: stamp("u-sup-1", at(-4, "17:28"), "assessed_by") } },
    { id: "fr-p-036", code: "OCSA-FRM-036", site: S[0], by: "u-cap-1", filed: at(-27, "20:00"),
      answers: { meeting_date: seed.shift(-27), start_time: "14:00", end_time: "15:10", where_held: "Harbor Point Center, training room", chair: "Dana Whitlock", secretary: "Priya Raghunathan",
        members: [{ name: "Dana Whitlock", role: "Chair", represents: "employer", present: "yes" }, { name: "Tomasz Wisniewski", role: "Crew lead", represents: "employees", present: "yes" }, { name: "Ngozi Okonkwo", role: "Custodian", represents: "employees", present: "no" }],
        quorum: "yes", open_items: [{ item: "Replace the worn mats at the north entry", owner: "Marcus Ferreira", due: seed.shift(-10), status: "done_to_verify" }],
        recorded_by: stamp("u-cap-1", at(-27, "19:58"), "recorded_by") } },
    { id: "fr-p-005", code: "OCSA-FRM-005", site: S[0], by: "u-staff-5", source: "portal", filed: at(-1, "03:40"),
      answers: { site: S[0].name, log_date: seed.shift(-1), filled_in_by: "Tomasz Wisniewski", crew_start: "18:00", crew_finish: "02:30", people_scheduled: "4", people_worked: "4",
        areas: { entrances_lobby: { answer: "done" }, offices_workstations: { answer: "done" }, restrooms: { answer: "done" }, corridors_stairwells: { answer: "partly_done" }, cafeteria_kitchen_break: { answer: "done" } },
        anyone_hurt: "no", found_unsafe: "no", crew_lead_signoff: stamp("u-staff-5", at(-1, "03:38"), "crew_lead_signoff") } },
    { id: "fr-p-019", code: "OCSA-FRM-019", site: S[2], by: "u-cap-1", filed: at(-2, "18:00"),
      answers: { site: S[2].name, filled_in_by: "Priya Raghunathan", month: "February 2026", people_this_month: "3",
        wear_checks: [{ date: seed.shift(-20), task: "Floor stripping, Dock A", people: "2", wearing: "all", notes: "" }, { date: seed.shift(-9), task: "Restroom disinfecting", people: "1", wearing: "some", notes: "No eye protection; issued on the spot" }],
        stopped_work: "no", hazard_review: "no", site_supervisor_signoff: stamp("u-cap-1", at(-2, "17:58"), "site_supervisor_signoff") } },
    { id: "fr-p-004", code: "OCSA-FRM-004", site: S[1], by: "u-sup-1", filed: at(-8, "16:30"),
      answers: { assessment_date: seed.shift(-8), purpose: "scope_change", customer: "Kestrel Way Clinic Group", site_name: S[1].name, building_type: "laboratory", cleanable_square_feet: 58400,
        areas: [{ area: "Clinic exam rooms", area_type: "Clinical", class: "critical", square_feet: "12400", floor_surface: "Sheet vinyl", density: "heavy" }, { area: "Corridors", area_type: "Circulation", class: "standard", square_feet: "9800", floor_surface: "VCT", density: "medium" }],
        window_hours: 7, assumptions: "Two exam rooms stay closed until the April renovation.", assessment_complete: "yes",
        customer_acknowledgement: drawn("Hollis Vandermeer", "Clinic manager", at(-8, "16:05"), "customer_acknowledgement") } },
    { id: "fr-p-014", code: "OCSA-FRM-014", site: S[0], by: "u-sup-1", filed: at(-9, "15:00"),
      answers: { date_received: seed.shift(-10), source: "customer", customer: "Fairhaven Property Group", site: S[0].name, requester: "Wendell Prescott, facilities director",
        service_line: "office", request: "Add a day porter on Saturdays from 9 to 1 for the weekend events.", route: "change_of_service", route_reason: "A new recurring service day", kind_of_change: "add",
        site_walked: "yes", touches: { labor_hours: { affected: "yes", detail: "4 hours each Saturday" }, staffing: { affected: "yes", detail: "One day porter" }, billing: { affected: "yes", detail: "" } },
        hours_per_week: 4, can_absorb: "no", labor_cost: 512.4 } },
    { id: "fr-p-034", code: "OCSA-FRM-034", site: S[1], by: "u-sup-1", filed: at(-12, "13:10"),
      answers: { employee: person("u-staff-7"), badge_number: "4118", job_class: "day_porter", site: S[1].name + ", " + S[1].address, orientation_date: seed.shift(-12),
        access_covered: { enter_and_leave: { covered: "done" }, keys_issued: { covered: "done" }, access_fails: { covered: "done" }, alarm: { covered: "not_applicable" }, restricted_areas: { covered: "done" }, secured_at_end: { covered: "done" }, no_visitors: { covered: "done" } },
        employee_confirms: { received: { confirmed: "yes" }, language: { confirmed: "yes" }, who_to_call: { confirmed: "yes" }, chemicals: { confirmed: "yes" } },
        employee_signature: drawn("Elena Barbosa", "Day Porter", at(-12, "13:05"), "employee_signature"),
        orientation_delivered: stamp("u-sup-1", at(-12, "13:08"), "orientation_delivered") } },
    { id: "fr-p-013", code: "OCSA-FRM-013", site: S[2], by: "u-cap-1", filed: at(-7, "16:45"),
      answers: { date: seed.shift(-7), time: "11:20", came_in: "telephone", raised_by: "Corvin Ballantyne, office manager", customer: "Ballantyne Holdings", site: S[2].name, kind: "complaint",
        said: "The dock office bins were not emptied on Tuesday or Wednesday.", fixed_on_shift: "yes", what_was_done: "Bins emptied that afternoon; the caller was told the night crew route now includes the office.",
        passed_to_supervisor: "yes", passed_to_field_lead: "not_needed", concerns_employee: "no", went_next: ["handled_here"],
        acknowledged: "yes", answered: "yes", satisfied: "yes", confirmed_on: seed.shift(-5) + ", by email from the caller" } },
    { id: "fr-p-012", code: "OCSA-FRM-012", site: S[0], by: "u-sup-1", filed: at(-5, "20:30"),
      answers: { employee: person("u-staff-7"), badge_number: "4118", job_class: "day_porter", sites_worked: S[0].name, review_kind: "annual", period_covered: "March 2025 to February 2026", review_date: seed.shift(-5),
        ratings: { quality_of_work: { rating: "meets" }, attendance: { rating: "exceeds" }, training: { rating: "meets" }, safety_rules: { rating: "meets" }, conduct: { rating: "exceeds" }, teamwork: { rating: "meets" }, equipment_care: { rating: "needs_improvement", comments: "Left the floor machine uncharged twice." } },
        is_supervisor: "no", strengths: "Reliable, and the lobby is always ready at opening.", to_improve: "Charge and store the floor machine at the end of each shift.", overall_rating: "meets",
        employee_comments: "I will set a reminder for the machine.", employee_signature: drawn("Elena Barbosa", "", at(-5, "20:20"), "employee_signature"),
        reviewed_by: stamp("u-sup-1", at(-5, "20:25"), "reviewed_by") } },
    { id: "fr-p-016", code: "OCSA-FRM-016", site: S[1], by: "u-staff-7", source: "portal", filed: at(-1, "16:30"),
      answers: { site: S[1].name, date_reported: seed.shift(-1), reported_by: "Elena Barbosa", event_type: "injury", severity: "first_aid_only", person_involved: person("u-staff-7"),
        event_date: seed.shift(-1), exact_location: "Clinic corridor, outside exam room 4", what_happened: "Slipped on a wet patch near the hand sink and caught myself on the rail.",
        injury_description: "Twisted left wrist, sore and a little swollen.", harmful_object: "Wet floor", treatment: "first_aid_only",
        reported_to_admin_date: seed.shift(-1), reported_to_admin_time: "12:40" } },
    // The case the injury log opens: recordable, with its number.
    { id: "fr-p-016r", code: "OCSA-FRM-016", site: S[2], by: "u-staff-8", source: "portal", filed: at(-36, "02:10"),
      answers: { site: S[2].name, date_reported: seed.shift(-36), reported_by: "Rashid Haddad", event_type: "injury", severity: "medical_treatment", person_involved: person("u-staff-8"),
        event_date: seed.shift(-36), exact_location: "Dock A, by the dumpster", what_happened: "Lifted a full liner bag into the dumpster and felt my lower back pull.",
        injury_description: "Strained lower back.", harmful_object: "Full liner bag", treatment: "medical_treatment",
        reported_to_admin_date: seed.shift(-36), reported_to_admin_time: "08:30",
        recordable: "yes", outcome: "days_away", days_away: 4, days_restricted: 6, case_type: "injury", privacy_case: "no",
        log_description: "Strained lower back lifting a full liner bag into the dumpster" } },
  ];
  const filedById = (id) => FILED.find((r) => r.id === id) || null;
  // The codes whose list a picture reads. The stub's own complaint and corrective action keep theirs.
  const LISTED = FILED.map((r) => r.code).filter((c, i, all) => all.indexOf(c) === i && c !== "OCSA-FRM-009" && c !== "OCSA-FRM-010");
  const isStamp = (v) => !!(v && typeof v === "object" && v.at);
  // A closing sign-off is offered once the desk's required questions are answered; another one at once.
  function payload(r, lang) {
    const F = FORMS[r.code];
    const a = r.answers;
    const sup = F.fields.filter((f) => f[2] === "s");
    const missing = sup.filter((f) => f[3] !== "signoff" && (f[6] || {}).req && !(f[6] || {}).prefill && holds((f[6] || {}).when, a) && !answered(a[f[0]]))
      .map((f) => ({ key: f[0], label: L(lang, f[4], f[5]) }));
    const canSign = sup.filter((f) => f[3] === "signoff" && !isStamp(a[f[0]]) && (!(f[6] || {}).closes || missing.length === 0)).map((f) => f[0]);
    const out = { injuryLogCase: null, draft: draftView(r, lang), fields: F.fields.map((f) => fieldView(f, a, lang)), sections: sectionsOf(r.code, lang),
      canSign, canWriteSupervisor: true, supervisorMissing: missing, canVoid: true, canResend: true, canAcknowledge: false };
    if (r.code === "OCSA-FRM-010") Object.assign(out, { linkedIssues: [], clientToldAt: null, clientToldBy: null, canTellClient: false, suggestedRecipients: [] });
    return out;
  }
  function draftView(r, lang) {
    const F = FORMS[r.code];
    const filer = r.customer ? r.customer.join(", ") : tPersonName(r.by);
    const out = { id: r.id, formCode: r.code, version: F.v, formName: titleOf(r.code, lang), source: r.customer ? "customer" : (r.source || "portal"), status: "submitted",
      answers: r.answers, answered: F.fields.filter((f) => answered(r.answers[f[0]])).length, remaining: 0, missing: [],
      siteId: r.site.id, siteName: r.site.name, userId: r.customer ? null : r.by, userName: filer, dueAt: null,
      createdAt: r.filed, submittedAt: r.filed };
    if (r.customer) out.customer = { name: r.customer[0], role: r.customer[1], linkId: "cl-2" };
    if (r.acknowledged) Object.assign(out, { acknowledgedAt: r.acknowledged.at, acknowledgedMethod: r.acknowledged.method, acknowledgedBy: { name: tPersonName(r.acknowledged.by) } });
    return out;
  }
  const listRow = (r, lang) => { const d = draftView(r, lang); delete d.answers; return d; };

  // ---- a form started at a desk ------------------------------------------------------------------
  // POST /api/forms/:code/drafts for the two forms the pictures fill, kept here and in no list, so
  // a start in one picture changes nothing another one shows.
  const STARTED = ["OCSA-FRM-012", "OCSA-FRM-013"];
  const drafts = {};
  let draftSeq = 0;
  function startedView(d, lang) {
    const F = FORMS[d.code];
    const ask = F.fields.filter((f) => f[2] === "a" && f[3] !== "signoff" && !(f[6] || {}).prefill && holds((f[6] || {}).when, d.answers));
    const missing = ask.filter((f) => (f[6] || {}).req && !answered(d.answers[f[0]])).map((f) => f[0]);
    return { id: d.id, formCode: d.code, version: F.v, formName: titleOf(d.code, lang), source: "admin", status: "draft", answers: d.answers,
      answered: ask.filter((f) => answered(d.answers[f[0]])).length, remaining: missing.length, missing, siteId: d.site ? d.site.id : null, siteName: d.site ? d.site.name : null,
      userId: seed.PEOPLE.admin.id, userName: tPersonName(seed.PEOPLE.admin.id), createdAt: seed.NOW_ISO, submittedAt: null, dueAt: null };
  }

  // ---- the client and safety reports -------------------------------------------------------------
  // GET /api/reports/client-ratings (helpers/clientRatings.js): each site out of 10 over the range.
  const Q = (key, en, es, average) => ({ key, label: { en, es }, average });
  const RATED = [
    { siteId: S[0].id, siteName: S[0].name, overall: 8.6, responses: 5, lastResponseAt: at(-6, "15:10"),
      questions: [Q("overall_quality", "Overall cleaning quality across the building", "Calidad general de la limpieza en todo el edificio", 8.8),
        Q("restrooms_condition", "Condition of restrooms", "Estado de los ba\u00f1os", 7.9), Q("floors_condition", "Condition of floors", "Estado de los pisos", 8.6),
        Q("response_speed", "Speed of response when you raise something", "Rapidez de respuesta cuando usted plantea algo", 9.0),
        Q("crew_professionalism", "Professionalism of the cleaning crew", "Profesionalismo del equipo de limpieza", 9.2)],
      byMonth: [{ month: "2025-12", responses: 1, overall: 8.0 }, { month: "2026-01", responses: 2, overall: 8.5 }, { month: "2026-02", responses: 0, overall: null }, { month: "2026-03", responses: 2, overall: 9.0 }],
      comments: [{ text: "The lobby glass has never looked better.", name: "Wendell Prescott", role: "Facilities director", at: at(-6, "15:10") }] },
    { siteId: S[1].id, siteName: S[1].name, overall: 7.4, responses: 3, lastResponseAt: at(-12, "13:40"),
      questions: [Q("overall_quality", "Overall cleaning quality across the building", "Calidad general de la limpieza en todo el edificio", 7.6),
        Q("restrooms_condition", "Condition of restrooms", "Estado de los ba\u00f1os", 6.8), Q("response_speed", "Speed of response when you raise something", "Rapidez de respuesta cuando usted plantea algo", 8.0)],
      byMonth: [{ month: "2025-12", responses: 1, overall: 7.0 }, { month: "2026-01", responses: 1, overall: 7.5 }, { month: "2026-02", responses: 1, overall: 7.8 }, { month: "2026-03", responses: 0, overall: null }],
      comments: [{ text: "The staff kitchen needs more attention at night.", name: "Hollis Vandermeer", role: "Clinic manager", at: at(-12, "13:40") }] },
  ];
  // GET /api/monthly-reports (routes/monthlyReports.js): each site's month, as it moves to the client.
  const contact = (name, email) => ({ name, email });
  const MONTHLY = [
    { id: "mr-4", responseId: "fr-p-011d", siteId: S[2].id, periodStart: "2026-02-01", periodEnd: "2026-02-28", status: "draft", sentTo: [], sentAt: null, acknowledgedBy: null, acknowledgedAt: null },
    { id: "mr-3", responseId: "fr-p-011c", siteId: S[0].id, periodStart: "2026-02-01", periodEnd: "2026-02-28", status: "acknowledged", sentTo: [contact("Wendell Prescott", "wendell.prescott@example.invalid")], sentAt: at(-12, "14:00"),
      acknowledgedBy: { name: "Wendell Prescott", role: "Facilities director" }, acknowledgedAt: at(-11, "16:20"), comments: "Thank you. The Saturday events went well." },
    { id: "mr-2", responseId: "fr-p-011b", siteId: S[1].id, periodStart: "2026-02-01", periodEnd: "2026-02-28", status: "sent", sentTo: [contact("Hollis Vandermeer", "hollis.vandermeer@example.invalid")], sentAt: at(-4, "13:30"), acknowledgedBy: null, acknowledgedAt: null },
    { id: "mr-1", responseId: "fr-p-011a", siteId: S[1].id, periodStart: "2026-01-01", periodEnd: "2026-01-31", status: "overdue", sentTo: [contact("Hollis Vandermeer", "hollis.vandermeer@example.invalid")], sentAt: at(-40, "13:30"), acknowledgedBy: null, acknowledgedAt: null },
  ];
  // The survey contacts the send window offers, GET /api/sites/:id/survey-schedule.
  const SURVEY_CONTACTS = { [S[2].id]: [contact("Corvin Ballantyne", "corvin.ballantyne@example.invalid")] };
  // GET /api/injury-log and GET /api/injury-summary (routes/injuryLog.js), by year.
  const TOTALS0 = { deaths: 0, daysAwayCases: 0, restrictedCases: 0, otherCases: 0, daysAway: 0, daysRestricted: 0, injuries: 0, skinDisorders: 0, respiratory: 0, poisonings: 0, hearingLoss: 0, otherIllnesses: 0 };
  const LOG = {
    2026: { cases: [
      { caseNumber: 1, responseId: "fr-p-016r", name: "Rashid Haddad", jobTitle: "Custodial Laborer", eventDate: seed.shift(-36), where: S[2].name + ", Dock A", description: "Strained lower back lifting a full liner bag into the dumpster", outcome: "days_away", daysAway: 4, daysRestricted: 6, caseType: "injury" },
      { caseNumber: 2, responseId: null, name: null, jobTitle: "Day Porter", eventDate: seed.shift(-14), where: S[1].name + ", clinic corridor", description: "Needlestick from a sharp left in a waste bin", outcome: "other_recordable", daysAway: 0, daysRestricted: 0, caseType: "injury" }],
      totals: Object.assign({}, TOTALS0, { daysAwayCases: 1, otherCases: 1, daysAway: 4, daysRestricted: 6, injuries: 2 }) },
    2025: { cases: [
      { caseNumber: 1, responseId: null, name: "Bertrand Lefevre", jobTitle: "Day Porter", eventDate: "2025-08-21", where: S[0].name + ", south stairwell", description: "Bruised knee in a fall on the stairs while carrying a vacuum", outcome: "job_transfer_or_restriction", daysAway: 0, daysRestricted: 5, caseType: "injury" },
      { caseNumber: 2, responseId: null, name: "Ngozi Okonkwo", jobTitle: "Custodial Laborer", eventDate: "2025-11-04", where: S[2].name + ", break room", description: "Rash on both hands after mixing a degreaser without gloves", outcome: "other_recordable", daysAway: 0, daysRestricted: 0, caseType: "skin_disorder" }],
      totals: Object.assign({}, TOTALS0, { restrictedCases: 1, otherCases: 1, daysRestricted: 5, injuries: 1, skinDisorders: 1 }) },
  };
  const logOf = (year) => LOG[year] || { cases: [], totals: Object.assign({}, TOTALS0) };
  function summaryOf(year) {
    return { year, totals: logOf(year).totals, establishment: { name: "Orchard Cove Service Alliance", address: "1 Orchard Cove Way, Fairhaven PA 19044" },
      averageEmployees: null, totalHours: null, hints: { activeStaffAverage: 10.4 }, certified: null, changedSinceCertified: false,
      postingWindow: { from: (year + 1) + "-02-01", to: (year + 1) + "-04-30" }, postedOn: null };
  }

  // ---- supplies, shift names and Jotform ----------------------------------------------------------
  // Two supplies taken off the list, which Removed supplies offers to bring back.
  const REMOVED = [
    { id: "sp-r1", name: "Floor stripper concentrate", category: "chemical", unit: "gallon", qr_code: "QR-SPR1", current_stock: 0, isActive: false, is_active: false },
    { id: "sp-r2", name: "Wet mop head 16oz", category: "tool", unit: "each", qr_code: "QR-SPR2", current_stock: 0, isActive: false, is_active: false },
  ];
  // GET /api/sites/:id/shift-blocks (routes/shiftBlocks.js): each shift's blocks, with the Spanish the
  // staff app shows for each name.
  const B = (id, shift, block, time, order, tasks, es) => ({ id, shiftLabel: shift, blockLabel: block, anchorTime: time ? time + ":00" : null, sortOrder: order, taskCount: tasks, es });
  const BLOCKS = {
    [S[0].id]: [
      B("sb-1", "Day porter", "Lobby round", "07:00", 1, 3, ["Conserje de d\u00eda", "Ronda del vest\u00edbulo"]),
      B("sb-2", "Day porter", "Restroom round", "10:30", 2, 2, ["Conserje de d\u00eda", "Ronda de ba\u00f1os"]),
      B("sb-3", "Day porter", "Break room reset", "13:00", 3, 1, ["Conserje de d\u00eda", "Arreglo de la sala de descanso"]),
      B("sb-4", "Night shift", "First pass", "18:00", 1, 4, ["Turno de noche", "Primera pasada"]),
      B("sb-5", "Night shift", "Restrooms", "20:00", 2, 2, ["Turno de noche", "Ba\u00f1os"]),
      B("sb-6", "Night shift", "Closing walk", null, 3, 1, ["Turno de noche", "Recorrido de cierre"]),
    ],
    [S[1].id]: [B("sb-7", "Evening shift", "Clinic rooms", "17:30", 1, 3, ["Turno de la tarde", "Salas de la cl\u00ednica"])],
    [S[2].id]: [B("sb-8", "Night shift", "Dock and offices", "19:00", 1, 3, ["Turno de noche", "Muelle y oficinas"])],
  };
  const blocksOf = (siteId, lang) => (BLOCKS[siteId] || []).map((b) => Object.assign({}, b, { es: undefined, display: lang === "es" ? { shift: b.es[0], block: b.es[1] } : { shift: b.shiftLabel, block: b.blockLabel } }));
  // GET /api/jotform/config (routes/jotform.js): the key set and valid, and the counts the strip reads.
  const JOTFORM_CONFIG = { hasKey: true, keyValid: true, apiUserInfo: { username: "orchardcove-forms", email: "forms@orchardcove.example.invalid", accountType: "BRONZE" },
    formsCount: 2, enabledCount: 2, submissionsCount: 13, newSubmissionsCount: 1, lastFormSync: at(-1, "13:00") };

  // ---- the answers --------------------------------------------------------------------------------
  return (method, path, query, body, lang) => {
    const get = method === "GET";
    if (get && path === "/api/forms") return ok({ forms: catalog(query.get("app"), lang) });
    if (get && path === "/api/forms/my-sites") return ok({ sites: S.filter((s) => s.status === "active").map((s) => ({ id: s.id, name: s.name })).sort((a, b) => (a.name < b.name ? -1 : 1)) });
    const start = /^\/api\/forms\/([^/]+)\/drafts$/.exec(path);
    if (method === "POST" && start && STARTED.indexOf(decodeURIComponent(start[1])) >= 0) {
      const code = decodeURIComponent(start[1]);
      const site = body && body.siteId ? S.find((s) => s.id === String(body.siteId)) || null : null;
      draftSeq += 1;
      const d = { id: "fr-p-new-" + draftSeq, code, site, answers: {} };
      // A site picked fills the form's own Site question.
      if (site && FORMS[code].fields.some((f) => f[0] === "site" && f[2] === "a")) d.answers.site = site.name;
      drafts[d.id] = d;
      return created({ draft: startedView(d, lang), form: catalogForm(code, lang), resumed: false });
    }
    const draft = /^\/api\/forms\/drafts\/([^/]+)$/.exec(path);
    if (draft && drafts[draft[1]]) {
      const d = drafts[draft[1]];
      if (method === "PATCH") Object.keys((body && body.answers) || {}).forEach((k) => { if (body.answers[k] === null) delete d.answers[k]; else d.answers[k] = body.answers[k]; });
      return ok({ draft: startedView(d, lang), form: catalogForm(d.code, lang) });
    }
    if (get && path === "/api/forms/responses" && LISTED.indexOf(query.get("formCode")) >= 0) {
      const status = query.get("status") || "submitted";
      const rows = status !== "submitted" || query.get("before") ? [] : FILED.filter((r) => r.code === query.get("formCode") && (!query.get("siteId") || r.site.id === query.get("siteId")));
      return ok({ responses: rows.map((r) => listRow(r, lang)) });
    }
    const one = /^\/api\/forms\/responses\/([^/]+)$/.exec(path);
    if (get && one && filedById(one[1])) return ok(payload(filedById(one[1]), lang));

    if (get && path === "/api/reports/client-ratings") {
      const rows = RATED.filter((s) => !query.get("siteId") || s.siteId === query.get("siteId"));
      const n = rows.reduce((m, s) => m + s.responses, 0);
      return ok({ sites: rows, responses: n, overall: n ? Math.round(10 * rows.reduce((m, s) => m + s.overall * s.responses, 0) / n) / 10 : null, note: null });
    }
    if (get && path === "/api/monthly-reports") {
      const rows = MONTHLY.filter((r) => !query.get("siteId") || r.siteId === query.get("siteId"));
      return ok({ reports: rows.map((r) => Object.assign({ siteName: ctx.siteName(r.siteId) }, r)) });
    }
    const survey = /^\/api\/sites\/([^/]+)\/survey-schedule$/.exec(path);
    if (get && survey && SURVEY_CONTACTS[survey[1]]) {
      return ok({ schedule: { contacts: SURVEY_CONTACTS[survey[1]], frequency: "monthly", dayOfMonth: 5, lastSentOn: "2026-03-05", nextSendOn: "2026-04-05" } });
    }
    if (get && path === "/api/injury-log") { const y = Number(query.get("year")) || 2026; return ok(Object.assign({ year: y }, logOf(y))); }
    if (get && path === "/api/injury-summary") return ok(summaryOf(Number(query.get("year")) || 2025));

    if (get && path === "/api/supplies" && query.get("includeRemoved") === "true") return ok(REMOVED);
    const blocks = /^\/api\/sites\/([^/]+)\/shift-blocks$/.exec(path);
    if (get && blocks) return ok({ blocks: blocksOf(blocks[1], lang) });
    if (get && path === "/api/jotform/config") return ok(JOTFORM_CONFIG);
    return null;
  };
}

// Warnings, clearances, Messages' people and direct messages, employment reasons and a person on leave,
// the roster check, trusted devices, inspections with their photos and review lines, quotes and
// workload plans.
function peoplePart(ctx) {
  const { seed, state, ok, person, tPersonName, siteName, plusDays, signatureOf270, grant } = ctx;
  // Quotes and the site workload plan buttons are a build_quotes holder's.
  grant("build_quotes");
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const ADMIN = seed.PEOPLE.admin;
  const by = (p) => ({ userId: p.id, name: p.firstName + " " + p.lastName });
  const staff = (id) => (state.staff || []).find((p) => p.id === id) || {};

  // ---- warnings (routes/discipline.js) ----------------------------------------------------------
  // GET /api/discipline/steps, in the request's language, as helpers/discipline.js stepsView says it.
  const STEP_WORDS = {
    verbal_warning: ["Verbal warning", "Amonestaci\u00f3n verbal"],
    written_warning: ["Written warning", "Amonestaci\u00f3n por escrito"],
    final_warning: ["Final written warning", "Amonestaci\u00f3n final por escrito"],
    termination: ["Termination", "Terminaci\u00f3n del empleo"],
  };
  const CATEGORY_WORDS = {
    attendance: ["Attendance", "Asistencia"], conduct: ["Conduct", "Conducta"], performance: ["Performance", "Desempe\u00f1o"],
    safety: ["Safety", "Seguridad"], policy: ["Policy", "Pol\u00edticas de la empresa"], other: ["Other", "Otro"],
  };
  const stepsView = (lang) => ({
    steps: Object.keys(STEP_WORDS).map((code) => ({ code, label: T(lang, ...STEP_WORDS[code]), adminOnly: code === "final_warning" || code === "termination", employeeSigns: code === "written_warning" || code === "final_warning" })),
    categories: Object.keys(CATEGORY_WORDS).map((code) => ({ code, label: T(lang, ...CATEGORY_WORDS[code]) })),
  });
  // The person whose folder carries the Disciplinary card: u-staff-8, whose written warning da-9 waits
  // for a signature on their phone (Step 270's sr-3).
  const WARNED = "u-staff-8";
  const WARNINGS = () => [
    { id: "da-11", userId: WARNED, type: "final_warning", category: "attendance", incidentDate: seed.shift(-1), status: "draft", issuedAt: null, issuedBy: null,
      description: ["Left the site an hour before the end of the shift without telling the supervisor.", "Se fue del sitio una hora antes del final del turno sin avisar al supervisor."], expectations: ["Stay until the shift ends, or call the supervisor first.", "Quedarse hasta que termine el turno, o llamar antes al supervisor."], expectedBy: seed.shift(30), policyRef: "Handbook 4.2", language: "en" },
    { id: "da-9", userId: WARNED, type: "written_warning", category: "attendance", incidentDate: seed.shift(-1), status: "open", issuedAt: seed.shift(-1) + "T16:00:00Z", issuedBy: by(ADMIN),
      description: ["Late to the shift three times in one week.", "Lleg\u00f3 tarde al turno tres veces en una semana."], language: "en", sig: true },
    { id: "da-7", userId: WARNED, type: "verbal_warning", category: "attendance", incidentDate: seed.shift(-35), status: "closed", issuedAt: seed.shift(-35) + "T15:00:00Z", issuedBy: by(seed.PEOPLE.supervisor),
      description: ["Arrived 40 minutes late without calling ahead.", "Lleg\u00f3 40 minutos tarde sin avisar."], delivered: { at: seed.shift(-35) + "T15:10:00Z", method: "in_person" }, language: "en" },
    { id: "da-5", userId: "u-staff-7", type: "verbal_warning", category: "safety", incidentDate: seed.shift(-12), status: "open", issuedAt: seed.shift(-12) + "T14:00:00Z", issuedBy: by(seed.PEOPLE.supervisor),
      description: ["Mopped the lobby without putting out the wet floor signs.", "Trape\u00f3 el vest\u00edbulo sin poner los letreros de piso mojado."], delivered: { at: seed.shift(-12) + "T14:20:00Z", method: "email" }, language: "en" },
    { id: "da-4", userId: "u-staff-6", type: "written_warning", category: "conduct", incidentDate: seed.shift(-20), status: "closed", issuedAt: seed.shift(-20) + "T13:00:00Z", issuedBy: by(ADMIN),
      description: ["Raised their voice at a client in the corridor.", "Le alz\u00f3 la voz a un cliente en el pasillo."], delivered: { at: seed.shift(-20) + "T13:30:00Z", method: "printed" }, declinedToSign: true, witnessName: "Marcus Ferreira", language: "en" },
    { id: "da-2", userId: "u-staff-10", type: "verbal_warning", category: "performance", incidentDate: seed.shift(-50), status: "rescinded", issuedAt: seed.shift(-50) + "T12:00:00Z", issuedBy: by(seed.PEOPLE.supervisor),
      description: ["Restrooms on floor 2 not restocked.", "No se repusieron los ba\u00f1os del piso 2."], rescindReason: ["The restock was on another shift's list.", "La reposici\u00f3n estaba en la lista de otro turno."], language: "en" },
  ];
  const warningView = (w, lang) => {
    const p = staff(w.userId);
    const out = {
      id: w.id, person: { userId: w.userId, name: p.name || tPersonName(w.userId) }, type: w.type, category: w.category,
      incidentDate: w.incidentDate, actionDate: w.incidentDate, status: w.status, issuedAt: w.issuedAt, issuedBy: w.issuedBy,
      delivered: w.delivered || null, signed: false, declinedToSign: w.declinedToSign === true, caseId: null,
      signature: w.sig ? signatureOf270("warning", w.id) : null,
      typeLabel: T(lang, ...STEP_WORDS[w.type]), categoryLabel: T(lang, ...CATEGORY_WORDS[w.category]),
      rescinded: w.status === "rescinded", summary: null, description: T(lang, ...w.description), policyRef: w.policyRef || null,
      expectations: w.expectations ? T(lang, ...w.expectations) : null, expectedBy: w.expectedBy || null, suspensionStart: null, suspensionEnd: null,
      employeeAccount: null, followsProtectedActivity: false, controllerDiscussedOn: null, language: w.language,
      witnessName: w.witnessName || null, rescindReason: w.rescindReason ? T(lang, ...w.rescindReason) : null,
      rescind: w.status === "rescinded" ? { at: w.issuedAt, by: by(ADMIN), reason: T(lang, ...w.rescindReason) } : null,
    };
    return out;
  };
  const inForce = (w) => w.status === "open" || w.status === "closed";
  const countsOf = (rows) => {
    const byType = { verbal_warning: 0, written_warning: 0, final_warning: 0, termination: 0 };
    rows.filter(inForce).forEach((w) => { byType[w.type] += 1; });
    return { byType, total: rows.filter(inForce).length, drafts: rows.filter((w) => w.status === "draft").length, rescinded: rows.filter((w) => w.status === "rescinded").length };
  };


  // ---- school clearances (routes/clearances.js) ---------------------------------------------------
  // Each clearance is renewed 60 months from its own date; expiring is within 90 days of today.
  const TODAY = seed.TODAY;
  const addMonths = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
  const daysTo = (day) => Math.round((Date.parse(day + "T12:00:00Z") - Date.parse(TODAY + "T12:00:00Z")) / 86400000);
  const stateOf = (expiresOn) => (!expiresOn ? "missing" : daysTo(expiresOn) <= 0 ? "expired" : daysTo(expiresOn) <= 90 ? "expiring" : "current");
  // The issued dates each person holds, by kind, and the day of their Act 168 review; a kind left
  // out is missing. Riverbend Logistics Hub (s-3) is the school site, as the Step 247 guard has it.
  const ON_FILE = {
    "u-admin-1": { act34: "2023-02-14", act151: "2023-02-20", fbi: "2023-03-01", act168: "2023-02-10" },
    "u-sup-1": { act34: "2022-06-01", act151: "2022-06-03", fbi: "2022-06-15", act168: "2022-05-20" },
    "u-cap-1": { act34: "2024-01-08", act151: "2024-01-10", fbi: "2024-01-22", act168: "2024-01-05" },
    "u-super-1": { act34: "2021-09-01", act151: "2021-09-01", fbi: "2021-09-12", act168: "2021-08-30" },
    "u-staff-5": { act34: "2025-03-20", act151: "2025-03-21", act168: "2025-03-18" },
    "u-staff-6": { act34: "2021-05-10", act151: "2022-08-01", fbi: "2021-02-01", act168: "2021-01-25" },
    "u-staff-7": { act34: "2023-11-02", act151: "2023-11-02", fbi: "2023-11-20", act168: "2023-10-30" },
    "u-staff-8": {},
    "u-staff-9": { act34: "2022-04-11", act151: "2022-04-12", fbi: "2022-04-25", act168: "2022-04-08" },
    "u-staff-10": { act34: "2021-04-30", act151: "2024-07-15", fbi: "2024-07-29", act168: "2024-07-10" },
    "u-staff-11": {},
    "u-staff-12": { act34: "2024-09-16", fbi: "2024-09-30" },
  };
  // One date entered wrongly and corrected, kept on the clearance's own row.
  const CORRECTED = { "u-staff-9:act34": { at: seed.shift(-20) + "T15:00:00Z", from: "2022-04-01", to: "2022-04-11", reason: "Typed the day the form was mailed, not the day on the certificate." } };
  const EARLIER = { "u-staff-10:act34": "2016-05-02" };
  const certId = (uid, kind) => "cert-" + uid + "-" + kind;
  const clearanceOf = (uid, kind) => {
    const issued = (ON_FILE[uid] || {})[kind];
    if (!issued) return { certificationId: null, issuedDate: null, expiresOn: null, state: "missing" };
    const expiresOn = addMonths(issued, 60);
    return { certificationId: certId(uid, kind), issuedDate: issued, expiresOn, state: stateOf(expiresOn) };
  };
  const clearancePerson = (p) => {
    const f = ON_FILE[p.id] || {};
    const view = { userId: p.id, name: p.name, status: p.status, atSchoolSite: p.site_id === "s-3" && p.status === "active" };
    const history = [];
    ["act34", "act151", "fbi"].forEach((k) => {
      view[k] = clearanceOf(p.id, k);
      if (view[k].certificationId) history.push({ kind: k, certificationId: view[k].certificationId, issuedDate: view[k].issuedDate, expiresOn: view[k].expiresOn, status: view[k].state === "expired" ? "expired" : "active", corrections: CORRECTED[p.id + ":" + k] ? [CORRECTED[p.id + ":" + k]] : [] });
      const old = EARLIER[p.id + ":" + k];
      if (old) history.push({ kind: k, certificationId: certId(p.id, k) + "-old", issuedDate: old, expiresOn: addMonths(old, 60), status: "expired", corrections: [] });
    });
    view.act168 = f.act168 ? { reviewId: "rev-" + p.id, completedOn: f.act168, disclosure: false, state: "done" } : { reviewId: null, completedOn: null, disclosure: null, state: "missing" };
    view.history = history;
    return view;
  };
  const clearancesAnswer = (query) => {
    const want = query.get("state") || "";
    const siteId = query.get("siteId") || "";
    const userId = query.get("userId") || "";
    let people = (state.staff || []).filter((p) => (userId ? p.id === userId : want === "all" || p.status === "active") && (!siteId || p.site_id === siteId));
    people = people.slice().sort((a, b) => a.name.localeCompare(b.name)).map(clearancePerson);
    if (want && want !== "all") people = people.filter((p) => ["act34", "act151", "fbi"].some((k) => p[k].state === want) || (want === "missing" && p.act168.state === "missing"));
    return ok({ people });
  };

  // ---- Messages: everyone the office can write to, and the direct chats (routes/chat.js) ----------
  const office = (p) => p.role === "admin" || p.role === "supervisor";
  const chatPeople = (query) => {
    const me = person();
    const q = String(query.get("q") || "").toLowerCase();
    const rows = (state.staff || []).filter((p) => p.status === "active" && p.id !== me.id)
      .filter((p) => !q || p.name.toLowerCase().indexOf(q) >= 0 || String(p.badge_number || "").indexOf(q) >= 0)
      .sort((a, b) => (office(b) - office(a)) || a.name.localeCompare(b.name));
    return ok({ people: rows.map((p) => ({ userId: p.id, name: p.name, role: p.role, kind: office(p) ? "office" : "staff", photoUrl: null })) });
  };
  // The admin's direct chats with two other office people, the newest first.
  const DIRECT = [
    { channelId: "dc-1", otherUserId: "u-sup-1", lastAt: seed.shift(0) + "T19:42:00Z", unread: 2, messages: [
      ["u-admin-1", "Can you cover the Lakeside walk on Thursday?", seed.shift(0) + "T18:10:00Z"],
      ["u-sup-1", "Yes, I can take it after the morning check.", seed.shift(0) + "T19:30:00Z"],
      ["u-sup-1", "I will send the scores when it is done.", seed.shift(0) + "T19:42:00Z"]] },
    { channelId: "dc-2", otherUserId: "u-cap-1", lastAt: seed.shift(-2) + "T14:05:00Z", unread: 0, messages: [
      ["u-cap-1", "The dock floor markings are booked for Saturday.", seed.shift(-2) + "T14:05:00Z"]] },
  ];
  const DIRECT_WORDS = {
    "Can you cover the Lakeside walk on Thursday?": "\u00bfPuedes cubrir la inspecci\u00f3n de Lakeside el jueves?",
    "Yes, I can take it after the morning check.": "S\u00ed, la hago despu\u00e9s de la revisi\u00f3n de la ma\u00f1ana.",
    "I will send the scores when it is done.": "Te env\u00edo los puntajes cuando termine.",
    "The dock floor markings are booked for Saturday.": "Las marcas del piso del muelle quedaron para el s\u00e1bado.",
  };
  const said = (text, lang) => (lang === "es" && DIRECT_WORDS[text] ? DIRECT_WORDS[text] : text);
  const readDirect = {};
  const directInbox = (lang) => ok(DIRECT.map((c) => ({ channelId: c.channelId, otherUserId: c.otherUserId, otherName: tPersonName(c.otherUserId) || staff(c.otherUserId).name,
    otherPhotoUrl: null, lastMessage: said(c.messages[c.messages.length - 1][1], lang), lastMessageAt: c.lastAt, unreadCount: readDirect[c.channelId] ? 0 : c.unread })));
  const directMessages = (c, lang) => ok(c.messages.map((m, i) => { const p = staff(m[0]); return { id: c.channelId + "-m" + i, senderId: m[0], senderName: p.name, senderRole: p.role, text: said(m[1], lang), sentAt: m[2], isEdited: false, isPinned: false, mentions: [] }; }));

  // ---- employment (routes/users.js) ----------------------------------------------------------------
  const REASONS = {
    ended: [["resigned", "Resigned (quit)", "Renunci\u00f3"], ["dismissed", "Let go by OCSA", "Desvinculado por OCSA"],
      ["job_abandonment", "Stopped coming to work (no call, no show)", "Dej\u00f3 de venir a trabajar (sin avisar ni presentarse)"],
      ["laid_off", "Laid off, or the contract or site ended", "Despido por falta de trabajo, o termin\u00f3 el contrato o el sitio"],
      ["retired", "Retired", "Se jubil\u00f3"], ["other", "Other", "Otro"]],
    leave: [["medical", "Medical leave", "Licencia m\u00e9dica"], ["family", "Family leave", "Licencia familiar"], ["personal", "Personal leave", "Licencia personal"],
      ["military", "Military leave", "Licencia militar"], ["other", "Other", "Otro"]],
  };
  const reasonWord = (kind, code, lang) => { const r = REASONS[kind].find((x) => x[0] === code); return r ? T(lang, r[1], r[2]) : null; };
  // u-staff-9 is on medical leave; u-staff-10 is inactive with no reason recorded.
  const ON_LEAVE = "u-staff-9";
  const NO_REASON = "u-staff-10";
  const employmentOf = (uid, lang) => {
    const p = staff(uid);
    if (uid === ON_LEAVE) {
      const ev = { id: "ee-leave-1", kind: "leave", reason: "medical", reasonLabel: reasonWord("leave", "medical", lang), expectedReturn: seed.shift(20), note: null, recordedAt: seed.shift(-9) + "T14:00:00Z", recordedBy: { name: ADMIN.firstName + " " + ADMIN.lastName } };
      return { status: "inactive", hireDate: p.hire_date, terminationDate: null, current: ev, events: [ev], pastSites: [] };
    }
    const ev = { id: "ee-status-1", kind: "status_changed", reason: null, reasonLabel: null, note: null, recordedAt: seed.shift(-15) + "T13:00:00Z", recordedBy: { name: ADMIN.firstName + " " + ADMIN.lastName } };
    return { status: "inactive", hireDate: p.hire_date, terminationDate: null, current: ev, events: [ev], pastSites: [] };
  };

  // ---- the roster check (routes/users.js, helpers/employment.js rosterView) -------------------------
  const rosterAnswer = (query, lang) => {
    const all = query.get("all") === "1";
    const rows = (state.staff || []).filter((p) => p.status === "active" || p.status === "inactive" || (all && p.status === "terminated")).slice().sort((a, b) => a.name.localeCompare(b.name));
    const people = rows.map((p, i) => {
      const leave = p.id === ON_LEAVE;
      const noSite = p.id === "u-staff-11" || p.id === "u-staff-7";
      const sites = noSite ? [] : [{ siteId: p.site_id, name: p.site_name }];
      const school = p.site_id === "s-3";
      const c = clearancePerson(p);
      const missing = school ? ["act34", "act151", "fbi"].filter((k) => c[k].state !== "current" && c[k].state !== "expiring").length + (c.act168.state === "done" ? 0 : 1) : null;
      return {
        userId: p.id, name: p.name, role: p.role, status: leave || p.id === NO_REASON ? "inactive" : p.status, badgeNumber: p.badge_number, sites, noSite,
        lastSignIn: i % 4 === 3 ? null : seed.shift(-(i % 5)) + "T12:15:00Z",
        lastShiftStarted: office(p) ? null : seed.shift(-(1 + (i % 3))) + "T11:00:00Z",
        lastConfirmed: i % 3 === 0 ? { at: seed.shift(-(4 + i)) + "T16:00:00Z", by: { name: ADMIN.firstName + " " + ADMIN.lastName } } : null,
        current: leave ? { kind: "leave", reason: "medical", reasonLabel: reasonWord("leave", "medical", lang), recordedAt: seed.shift(-9) + "T14:00:00Z" } : null,
        clearancesMissing: missing,
      };
    });
    const since = Date.parse(TODAY + "T12:00:00Z") - 30 * 86400000;
    return ok({ people, summary: { total: people.length, confirmedSince: people.filter((p) => p.lastConfirmed && Date.parse(p.lastConfirmed.at) >= since).length,
      noSite: people.filter((p) => p.noSite).length, onLeave: people.filter((p) => p.status === "inactive").length } });
  };

  // ---- trusted devices (routes/users.js, Step 232 Part C) --------------------------------------------
  // As helpers/secondStep.js answers a device: the API's own reading of the browser, and firstSeenAt.
  const DEVICES = [
    { id: "td-1", browser: "Chrome on Windows", firstSeenAt: seed.shift(-21) + "T13:02:00Z", lastSeenAt: seed.shift(0) + "T12:40:00Z", expiresAt: seed.shift(9) + "T13:02:00Z" },
    { id: "td-2", browser: "Safari on iOS", firstSeenAt: seed.shift(-6) + "T22:15:00Z", lastSeenAt: seed.shift(-1) + "T23:05:00Z", expiresAt: seed.shift(24) + "T22:15:00Z" },
  ];

  // ---- a completed inspection with its photos, signature and review line (routes/inspections.js) ---
  // insp-4, Harbor Point Center's walk of a week ago, which no finding names: the detail as the API's
  // Step 217 reading route answers it, with capture, photo_urls, signatures and lines.
  const fs = require("fs");
  const pathMod = require("path");
  const fixture = (f) => fs.readFileSync(pathMod.join(__dirname, "fixtures", f));
  const PHOTO = fixture("photo.jpg").toString("base64");
  const SIGNATURE = fixture("signature.png");
  // A photo of the tiled floor in audit/fixtures, cropped and turned a different way for each name.
  const PHOTO_VIEWS = { a: "0 0 640 480", b: "120 60 400 300", c: "220 140 360 270", d: "40 200 320 240", e: "300 0 320 240" };
  const photoSvg = (k) => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="' + PHOTO_VIEWS[k] + '" preserveAspectRatio="xMidYMid slice">'
    + '<image href="data:image/jpeg;base64,' + PHOTO + '" width="640" height="480"' + (k === "c" || k === "e" ? ' transform="translate(640 0) scale(-1 1)"' : "") + "/></svg>", "utf8");
  const photoUrl = (k) => "https://photos.example.invalid/api/inspection-photos/insp-4-" + k + ".svg";
  const INSP = "insp-4";
  const RESULT = "res-4";
  const ITEMS = [
    { id: "it-1", label: "Dock floor markings", zone: "Dock", cims_category: "SD", max_score: 10, sort_order: 1, es: "Marcas del piso del muelle", esZone: "Muelle" },
    { id: "it-2", label: "Stairwell handrails", zone: "Stairwell", cims_category: "HSE", max_score: 10, sort_order: 2, es: "Pasamanos de la escalera", esZone: "Escalera" },
    { id: "it-3", label: "Lobby glass", zone: "Lobby", cims_category: "SD", max_score: 10, sort_order: 3, es: "Vidrios del vest\u00edbulo", esZone: "Vest\u00edbulo" },
  ];
  const inspRow = () => Object.assign({}, seed.INSPECTION_SCORES[3], { status: "completed", assigned_to_name: "Priya Raghunathan", assigned_name: "Priya Raghunathan", template_id: "tp-1" });
  const inspectionDetail = (lang) => {
    const row = inspRow();
    const me = person();
    const scores = [
      { template_item_id: "it-1", score: 9, notes: "", photos: ["a"] },
      { template_item_id: "it-2", score: 10, notes: T(lang, "Wiped down, no marks left.", "Limpios, sin marcas."), photos: ["b", "c"] },
      { template_item_id: "it-3", score: 9, notes: T(lang, "One streak on the door glass.", "Una marca en el vidrio de la puerta."), photos: ["d"] },
    ].map((x) => ({ template_item_id: x.template_item_id, score: x.score, notes: x.notes, photo_url: photoUrl(x.photos[0]), photo_urls: x.photos.map(photoUrl), deficient: false }));
    const signed = row.scheduled_date + "T18:05:00Z";
    return ok(Object.assign(row, {
      template_name: "Monthly quality walk", assigned_name: "Priya Raghunathan", kind: "supervisor", formCode: "OCSA-FRM-001",
      items: ITEMS.map((it) => ({ id: it.id, label: it.label, zone: it.zone, cims_category: it.cims_category, max_score: it.max_score, sort_order: it.sort_order, display: lang === "es" ? { label: it.es, zone: it.esZone } : null })),
      scores,
      result: { id: RESULT, total_score: 28, max_possible_score: 30, completed_at: row.scheduled_date + "T18:00:00Z", completed_by: "u-cap-1", completed_by_name: "Priya Raghunathan",
        overall_notes: T(lang, "Lobby and restrooms in good shape.", "El vest\u00edbulo y los ba\u00f1os en buen estado."), photo_urls: [photoUrl("e"), photoUrl("a")] },
      capture: { photosPerItem: 5, photosOverall: 10, signatureRequired: true },
      signatures: [{ line: "inspector", signerName: "Priya Raghunathan", signedAt: signed, path: "/api/inspections/results/" + RESULT + "/signatures/inspector" }],
      lines: [{ line: "reviewer", label: { en: "Reviewed", es: "Revisado" }, required: true, signed: false, canSign: me.role === "admin" || me.role === "supervisor" }],
      findings: [], correctiveAction: null, owners: [],
    }));
  };

  // ---- quotes and site workload plans (routes/quotes.js, helpers/workloadPlans.js) -----------------
  // A model in the shape GET /api/quotes/model answers, cut down to what the pictures draw, with every
  // rate, default and figure invented. calcOf works the figures from an estimate the way the
  // calculate route answers them: task hours from quantity over rate, then labor, burden, other
  // costs, overhead and a margin on the price.
  const W = (en, es) => ({ en, es });
  const said2 = (o, lang) => (o ? o[lang === "es" ? "es" : "en"] : "");
  const num = (key, label, unit, dflt, min, max, extra) => Object.assign({ key, label, type: "number", unit, default: dflt, min, max, options: null, help: null }, extra || {});
  const ZONES = [["offices", W("Private offices", "Oficinas privadas")], ["openOffice", W("Open office and cubicle area", "Oficina abierta y \u00e1rea de cub\u00edculos")],
    ["hallways", W("Hallways and corridors", "Pasillos y corredores")], ["restrooms", W("Restrooms", "Ba\u00f1os")], ["breakroom", W("Breakroom and kitchen", "Sala de descanso y cocina")],
    ["lobby", W("Lobby and reception", "Vest\u00edbulo y recepci\u00f3n")], ["conference", W("Conference rooms", "Salas de conferencias")], ["classrooms", W("Classrooms", "Salones de clase")],
    ["stairwells", W("Stairwells", "Escaleras")], ["laboratory", W("Laboratory and restricted areas", "Laboratorios y \u00e1reas restringidas")]];
  const ZONE_COLUMNS = [["totalSqFt", W("Total sq ft", "Pies cuadrados totales"), "sqft"], ["carpetSqFt", W("Carpet sq ft", "Pies cuadrados de alfombra"), "sqft"],
    ["hardSqFt", W("Hard floor sq ft", "Pies cuadrados de piso duro"), "sqft"], ["rooms", W("Rooms or units", "Cuartos o unidades"), "count"]];
  const FACILITIES = [["office", W("Office", "Oficina"), 0.09, 0.17], ["school", W("School", "Escuela"), 0.07, 0.14], ["medical", W("Medical", "Centro m\u00e9dico"), 0.14, 0.29],
    ["industrial", W("Industrial", "Industrial"), 0.08, 0.2], ["retail", W("Retail", "Comercio minorista"), 0.07, 0.15], ["other", W("Other", "Otro")]];
  const BUILDING_INPUTS = [
    { key: "contractType", label: W("Contract type", "Tipo de contrato"), type: "select", unit: null, default: null, min: null, max: null, help: null, section: "client",
      options: [{ value: "prime", label: W("Prime", "Principal") }, { value: "subcontractor", label: W("Subcontractor", "Subcontratista") }, { value: "direct", label: W("Direct", "Directo") }] },
    { key: "contractStartDate", label: W("Contract start date", "Fecha de inicio del contrato"), type: "date", unit: null, default: null, min: null, max: null, options: null, help: null, section: "client" },
    { key: "facilityType", label: W("Facility type", "Tipo de instalaci\u00f3n"), type: "select", unit: null, default: "office", min: null, max: null, section: "client",
      options: FACILITIES.map((f) => ({ value: f[0], label: f[1] })), help: W("Picks the national price range the price check compares against.", "Elige el rango nacional de precios con el que se compara el precio.") },
    num("serviceDaysPerMonth", W("Service days per month", "D\u00edas de servicio al mes"), "days", 22, 0, 31, { section: "servicePattern",
      help: W("22 for a weekday site. This figure drives every daily task.", "22 para un sitio de lunes a viernes. Esta cifra rige cada tarea diaria.") }),
    num("schoolDaysPerMonth", W("School days per month", "D\u00edas de clases al mes"), "days", 15, 0, 31, { section: "servicePattern",
      help: W("Used only by the classroom tasks.", "Solo lo usan las tareas de salones de clase.") }),
  ].concat(ZONES.flatMap((z) => ZONE_COLUMNS.map((c) => num("zones." + z[0] + "." + c[0], W(z[1].en + ": " + c[1].en, z[1].es + ": " + c[1].es), c[2], 0, 0, 10000000, { section: "zones", row: z[0], column: c[0] }))))
    .concat([num("toilets", W("Toilets and stalls", "Inodoros y cub\u00edculos"), "count", 0, 0, 100000, { section: "fixtures" }), num("urinals", W("Urinals", "Mingitorios"), "count", 0, 0, 100000, { section: "fixtures" }),
      num("sinks", W("Sinks", "Lavamanos"), "count", 0, 0, 100000, { section: "fixtures" }),
      num("dispensersOutsideRestrooms", W("Dispensers outside restrooms", "Dispensadores fuera de los ba\u00f1os"), "count", 0, 0, 100000, { section: "fixtures" }),
      num("highTouchPoints", W("High-touch points", "Puntos de mucho contacto"), "count", 0, 0, 1000000, { section: "counted",
        help: W("Door handles, push plates, light switches, rails, buttons. Count them once on a walk.", "Manijas, placas de empuje, apagadores, barandales, botones. Cu\u00e9ntelos una vez en un recorrido.") })]);
  const COST_INPUTS = [
    num("contractTermMonths", W("Contract term", "Plazo del contrato"), "months", 12, 1, 120, { section: "term", integer: true }),
    num("cleanerRate", W("Cleaner hourly rate", "Tarifa por hora del limpiador"), "usdPerHour", 17.85, 0, 500, { section: "labor" }),
    num("supervisorRate", W("Lead supervisor hourly rate", "Tarifa por hora del supervisor principal"), "usdPerHour", 24.1, 0, 500, { section: "labor" }),
    num("supervisorShare", W("Supervisor share of cleaning hours", "Parte de las horas de limpieza del supervisor"), "fraction", 0.06, 0, 1, { section: "labor" }),
    num("burdenRate", W("Total payroll burden rate", "Tasa total de cargas sobre la n\u00f3mina"), "fraction", 0.2215, 0, 1, { section: "burden" }),
    num("uniformsPerEmployee", W("Uniforms and PPE per employee per month", "Uniformes y EPP por empleado al mes"), "usd", 26, 0, 10000, { section: "otherDirect" }),
    num("overheadRate", W("Overhead and G&A rate", "Tasa de gastos generales y administrativos"), "fraction", 0.07, 0, 1, { section: "price" }),
    num("marginRate", W("Profit margin rate", "Tasa de margen de ganancia"), "fraction", 0.15, 0, 0.9, { section: "price", help: W("Set per contract.", "Se fija por contrato.") }),
  ];
  const sec = (key, title, help, extra) => Object.assign({ key, title, help: help || null }, extra || {});
  const FREQS = [["daily", W("Daily (service days)", "Diario (d\u00edas de servicio)"), null, "serviceDays"], ["fiveWeek", W("5 times a week", "5 veces por semana"), 21.7], ["threeWeek", W("3 times a week", "3 veces por semana"), 13],
    ["weekly", W("Weekly", "Semanal"), 4.3], ["monthly", W("Monthly", "Mensual"), 1]];
  // Each task line: its group, what its quantity is read from, its unit, its rate an hour and how often.
  const TASKS = [["offices", "routine", "zones.offices.totalSqFt", 3000, "daily"], ["openOffice", "routine", "zones.openOffice.totalSqFt", 3500, "daily"],
    ["hallways", "routine", "zones.hallways.totalSqFt", 4500, "daily"], ["breakroom", "routine", "zones.breakroom.totalSqFt", 2000, "daily"],
    ["lobby", "routine", "zones.lobby.totalSqFt", 3000, "daily"], ["conference", "routine", "zones.conference.totalSqFt", 3000, "daily"],
    ["stairwells", "routine", "zones.stairwells.totalSqFt", 2500, "threeWeek"], ["laboratory", "routine", "zones.laboratory.totalSqFt", 2200, "daily"],
    ["restroomClean", "restrooms", "fixtures", 14, "daily"], ["dispensers", "restrooms", "dispensersOutsideRestrooms", 40, "daily"], ["touchPoints", "counted", "highTouchPoints", 300, "daily"]];
  const TASK_WORDS = { restroomClean: [W("Clean and disinfect restrooms", "Limpiar y desinfectar ba\u00f1os"), W("fixtures", "muebles sanitarios")],
    dispensers: [W("Restock dispensers outside restrooms", "Surtir dispensadores fuera de los ba\u00f1os"), W("dispensers", "dispensadores")],
    touchPoints: [W("Disinfect high-touch points", "Desinfectar puntos de mucho contacto"), W("items", "puntos")] };
  const zoneWord = (k) => (ZONES.find((z) => z[0] === k) || [k, W(k, k)])[1];
  const taskLabel = (t) => (TASK_WORDS[t[0]] ? TASK_WORDS[t[0]][0] : zoneWord(t[0]));
  const taskUnit = (t) => (TASK_WORDS[t[0]] ? TASK_WORDS[t[0]][1] : W("sq ft", "pies cuadrados"));
  const RESULTS = [["totalSqFt", "building", "sqft", W("Total square feet", "Pies cuadrados totales")], ["carpetSqFt", "building", "sqft", W("Carpet square feet", "Pies cuadrados de alfombra")],
    ["hardFloorSqFt", "building", "sqft", W("Hard floor square feet", "Pies cuadrados de piso duro")], ["totalRooms", "building", "count", W("Rooms or units", "Cuartos o unidades")],
    ["totalFixtures", "building", "count", W("Total fixtures", "Total de muebles sanitarios")],
    ["monthlyLaborHours", "workload", "hours", W("Total monthly labor hours", "Total de horas de trabajo al mes")], ["weeklyLaborHours", "workload", "hours", W("Average weekly labor hours", "Promedio de horas de trabajo por semana")],
    ["hoursPerServiceDay", "workload", "hours", W("Average labor hours per service day", "Promedio de horas de trabajo por d\u00eda de servicio")],
    ["minimumStaff", "staffing", "count", W("Minimum staff required", "Personal m\u00ednimo requerido")], ["recommendedStaff", "staffing", "count", W("Recommended staff with relief", "Personal recomendado con relevo")],
    ["equipmentPurchase", "equipment", "usd", W("Total equipment purchase", "Total de compra de equipo")], ["suppliesPerMonth", "equipment", "usd", W("Supplies and chemicals", "Suministros y qu\u00edmicos")],
    ["laborSupervisorHours", "cost", "hours", W("Lead supervisor hours", "Horas del supervisor principal")], ["laborCleanerHours", "cost", "hours", W("Cleaner hours", "Horas del limpiador")],
    ["totalDirectLabor", "cost", "usd", W("Total direct labor", "Total de mano de obra directa")], ["totalPayrollBurden", "cost", "usd", W("Total payroll burden", "Total de cargas sobre la n\u00f3mina")],
    ["totalOtherDirect", "cost", "usd", W("Total other direct costs", "Total de otros costos directos")], ["operatingCost", "cost", "usd", W("Total operating cost, before overhead and margin", "Costo total de operaci\u00f3n, antes de gastos generales y margen")],
    ["overhead", "cost", "usd", W("Overhead and G&A", "Gastos generales y administrativos")], ["margin", "cost", "usd", W("Profit", "Ganancia")],
    ["monthlyPrice", "cost", "usd", W("Monthly bid price", "Precio mensual de la oferta")], ["annualPrice", "cost", "usd", W("Annual price", "Precio anual")],
    ["contractValue", "cost", "usd", W("Contract value over the term", "Valor del contrato en el plazo")], ["pricePerSqFt", "cost", "usdPerSqft", W("Price per sq ft per month", "Precio por pie cuadrado al mes")]];
  const CHECKS = [["floorSplit", "building", W("Floor type split", "Divisi\u00f3n por tipo de piso")], ["restroomFixtures", "workload", W("Restroom fixtures", "Muebles sanitarios de ba\u00f1os")],
    ["countedItems", "workload", W("Counted items", "Art\u00edculos contados")], ["everyHourPriced", "cost", W("Every hour priced", "Cada hora con precio")],
    ["porterSpecialtyFit", "cost", W("Porter and specialty hours", "Horas del conserje de d\u00eda y especiales")], ["priceRange", "cost", W("Price against the national range", "Precio frente al rango nacional")],
    ["equipmentTerm", "cost", W("Equipment treatment", "Tratamiento del equipo")]];
  const LIST_COLUMNS = (perMonth) => [{ key: "item", label: W("Item", "Art\u00edculo"), type: "text", unit: null }, { key: "quantity", label: perMonth ? W("Quantity per month", "Cantidad al mes") : W("Quantity", "Cantidad"), type: "number", unit: "count" },
    { key: "unitCost", label: W("Unit cost", "Costo unitario"), type: "number", unit: "usd" }, { key: "notes", label: W("Notes", "Notas"), type: "text", unit: null }];
  const listOf = (key, group, title, help, total, perMonth) => ({ key, group, title, help, columns: LIST_COLUMNS(perMonth), total, rowLimits: { quantity: { min: 0, max: 1000000 }, unitCost: { min: 0, max: 10000000 } }, maxRows: 50, defaults: [] });
  const QUOTE_MODEL = {
    version: "T01-2.0",
    groups: [
      { key: "building", title: W("Building profile", "Perfil del edificio"), help: W("Enter the building's areas and counts. Every later step is worked from them.", "Anote las \u00e1reas y los conteos del edificio. Cada paso siguiente se calcula a partir de ellos."),
        sections: [sec("client", W("Client information", "Informaci\u00f3n del cliente")), sec("servicePattern", W("Service pattern", "Patr\u00f3n de servicio")),
          sec("zones", W("Area by zone", "\u00c1rea por zona"), W("Every later step reads these figures. The carpet and hard floor split decides vacuuming against mopping.", "Cada paso siguiente lee estas cifras. La divisi\u00f3n entre alfombra y piso duro decide entre aspirar y trapear."),
            { rows: ZONES.map((z) => ({ key: z[0], label: z[1] })), columns: ZONE_COLUMNS.map((c) => ({ key: c[0], label: c[1] })) }),
          sec("fixtures", W("Restroom fixtures and dispensers", "Muebles sanitarios y dispensadores"), W("The total fixtures drive restroom cleaning at a fixtures per hour rate.", "El total de muebles sanitarios rige la limpieza de ba\u00f1os a una tasa de muebles por hora.")),
          sec("counted", W("Counted items", "Art\u00edculos contados"))],
        inputs: BUILDING_INPUTS },
      { key: "workload", title: W("Workload", "Carga de trabajo"), help: W("Check the production rates, then set how often each task is done from the frequency table.", "Revise las tasas de producci\u00f3n y luego indique con qu\u00e9 frecuencia se hace cada tarea usando la tabla de frecuencias."), sections: [], inputs: [] },
      { key: "staffing", title: W("Staffing", "Personal"), help: W("The headcount worked out from the hours.", "El personal calculado a partir de las horas."), sections: [sec("staffing", W("Hours and headcount", "Horas y personal"))],
        inputs: [num("shiftLengthHours", W("Standard shift length", "Duraci\u00f3n del turno est\u00e1ndar"), "hours", 8, 0, 24, { section: "staffing" }), num("reliefFactor", W("Relief factor", "Factor de relevo"), "fraction", 0.15, 0, 1, { section: "staffing" })] },
      { key: "equipment", title: W("Equipment and supplies", "Equipo y suministros"), help: W("Equipment is bought once and spread over the contract term. Supplies are a monthly cost.", "El equipo se compra una vez y se reparte en el plazo del contrato. Los suministros son un costo mensual."), sections: [], inputs: [] },
      { key: "cost", title: W("Cost summary", "Resumen de costos"), help: W("Read the checks before this price goes out.", "Lea las verificaciones antes de enviar este precio."),
        sections: [sec("term", W("Contract terms", "T\u00e9rminos del contrato")), sec("labor", W("Direct labor", "Mano de obra directa")), sec("burden", W("Payroll burden", "Cargas sobre la n\u00f3mina")),
          sec("otherDirect", W("Other direct costs", "Otros costos directos")), sec("price", W("Overhead, margin and price", "Gastos generales, margen y precio"))],
        inputs: COST_INPUTS },
    ],
    frequencies: FREQS.map((f) => ({ key: f[0], label: f[1], timesPerMonth: f[2] === undefined ? null : f[2], from: f[3] || null, scope: f[1] })),
    customFrequency: W("{n} times a month", "{n} veces al mes"),
    taskGroups: [{ key: "routine", group: "workload", title: W("Routine area cleaning", "Limpieza de rutina por \u00e1rea"), help: null }, { key: "restrooms", group: "workload", title: W("Restrooms", "Ba\u00f1os"), help: null },
      { key: "counted", group: "workload", title: W("Counted items", "Art\u00edculos contados"), help: null }],
    taskLines: TASKS.map((t) => ({ key: t[0], group: t[1], label: taskLabel(t), unit: taskUnit(t), quantityFrom: t[2], manual: false, defaultRate: t[3], defaultFrequency: t[4], note: null })),
    taskLimits: { rate: { min: 0, max: 100000 }, timesPerMonth: { min: 0, max: 100 }, hoursPerOccurrence: { min: 0, max: 1000 } },
    lists: [listOf("equipment", "equipment", W("Equipment and tools, purchased", "Equipo y herramientas, comprados"), W("A one-time cost, spread over the contract term.", "Un costo \u00fanico, repartido en el plazo del contrato."), { key: "equipmentPurchase", label: W("Total equipment purchase", "Total de compra de equipo") }, false),
      listOf("supplies", "equipment", W("Supplies and chemicals, monthly", "Suministros y qu\u00edmicos, al mes"), W("Recurs every month.", "Se repite cada mes."), { key: "suppliesPerMonth", label: W("Total monthly supplies", "Total de suministros al mes") }, true),
      listOf("otherDirect", "cost", W("Other direct costs, monthly", "Otros costos directos, al mes"), W("Each row is its quantity times its unit cost, every month.", "Cada fila es su cantidad por su costo unitario, cada mes."), { key: "otherDirectItems", label: W("Other direct cost rows", "Filas de otros costos directos") }, true)],
    results: RESULTS.map((r) => ({ key: r[0], group: r[1], unit: r[2], label: r[3] })),
    checks: CHECKS.map((c) => ({ key: c[0], group: c[1], label: c[2] })),
  };
  const r2 = (x) => Math.round(x * 100) / 100;
  const money = (x) => "$" + x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // The figures of an estimate, every value filled from the model's defaults.
  const calcOf = (raw) => {
    const given = (raw && raw.values) || {};
    const values = {};
    QUOTE_MODEL.groups.forEach((g) => g.inputs.forEach((i) => { values[i.key] = given[i.key] !== undefined && given[i.key] !== null && given[i.key] !== "" ? given[i.key] : i.default; }));
    const v = (k) => Number(values[k]) || 0;
    const zoneSum = (col) => ZONES.reduce((n, z) => n + v("zones." + z[0] + "." + col), 0);
    const fixtures = v("toilets") + v("urinals") + v("sinks");
    const freq = (k) => (k === "daily" ? v("serviceDaysPerMonth") : (FREQS.find((f) => f[0] === k) || [])[2] || 0);
    const tasks = {}, taskDetail = {}, taskHours = {};
    TASKS.forEach((t) => {
      const held = ((raw && raw.tasks) || {})[t[0]] || {};
      const rate = Number(held.rate) || t[3];
      const frequency = held.frequency || t[4];
      const quantity = t[2] === "fixtures" ? fixtures : v(t[2]);
      const times = held.timesPerMonth != null && held.timesPerMonth !== "" ? Number(held.timesPerMonth) : freq(frequency);
      const each = rate ? quantity / rate : 0;
      tasks[t[0]] = { rate, frequency, timesPerMonth: held.timesPerMonth != null && held.timesPerMonth !== "" ? Number(held.timesPerMonth) : null };
      taskDetail[t[0]] = { quantity, rate, hoursPerOccurrence: r2(each), frequency, timesPerMonth: times, custom: held.timesPerMonth != null && held.timesPerMonth !== "", monthlyHours: r2(each * times) };
      taskHours[t[0]] = r2(each * times);
    });
    const lists = { equipment: [], supplies: [], otherDirect: [] };
    Object.keys(lists).forEach((k) => { const l = ((raw && raw.lists) || {})[k]; if (Array.isArray(l)) lists[k] = l.map((x) => ({ key: x.key || null, item: x.item || null, quantity: Number(x.quantity) || 0, unitCost: Number(x.unitCost) || 0, notes: x.notes || null })); });
    const listTotal = (k) => r2(lists[k].reduce((n, x) => n + x.quantity * x.unitCost, 0));
    const hours = r2(Object.keys(taskHours).reduce((n, k) => n + taskHours[k], 0));
    const perDay = v("serviceDaysPerMonth") ? r2(hours / v("serviceDaysPerMonth")) : 0;
    const minimumStaff = hours ? Math.ceil(perDay / (v("shiftLengthHours") || 8)) : 0;
    const recommendedStaff = hours ? Math.ceil(minimumStaff * (1 + v("reliefFactor"))) : 0;
    const supHours = r2(hours * v("supervisorShare"));
    const cleanHours = r2(hours - supHours);
    const labor = r2(supHours * v("supervisorRate") + cleanHours * v("cleanerRate"));
    const burden = r2(labor * v("burdenRate"));
    const equipment = listTotal("equipment");
    const other = r2(recommendedStaff * v("uniformsPerEmployee") + equipment / (v("contractTermMonths") || 12) + listTotal("supplies") + listTotal("otherDirect"));
    const operating = r2(labor + burden + other);
    const overhead = r2(operating * v("overheadRate"));
    const withOverhead = r2(operating + overhead);
    const price = hours ? r2(withOverhead / (1 - v("marginRate"))) : 0;
    const area = zoneSum("totalSqFt");
    const results = { totalSqFt: area, carpetSqFt: zoneSum("carpetSqFt"), hardFloorSqFt: zoneSum("hardSqFt"), totalRooms: zoneSum("rooms"), totalFixtures: fixtures,
      monthlyLaborHours: hours, weeklyLaborHours: r2(hours / 4.33), hoursPerServiceDay: perDay, minimumStaff, recommendedStaff,
      equipmentPurchase: equipment, suppliesPerMonth: listTotal("supplies"), otherDirectItems: listTotal("otherDirect"), laborSupervisorHours: supHours, laborCleanerHours: cleanHours,
      totalDirectLabor: labor, totalPayrollBurden: burden, totalOtherDirect: other, operatingCost: operating, overhead, margin: r2(price - withOverhead),
      monthlyPrice: price, annualPrice: r2(price * 12), contractValue: r2(price * (v("contractTermMonths") || 12)), pricePerSqFt: area ? Math.round((price / area) * 10000) / 10000 : 0 };
    const type = FACILITIES.find((f) => f[0] === values.facilityType) || FACILITIES[0];
    const band = type[2] === undefined ? FACILITIES[0] : type;
    const range = (lang) => ({ type: said2(type[1], lang), low: money(band[2]), high: money(band[3]) });
    const fill = (w, lang) => { const r = range(lang); return w.replace("{type}", r.type).replace("{low}", r.low).replace("{high}", r.high); };
    const per = results.pricePerSqFt;
    const priceWords = !area ? W("No area entered yet.", "Todav\u00eda no se anot\u00f3 ninguna \u00e1rea.")
      : per > band[3] ? W(fill("Above the national range for {type} ({low} to {high}). Review the workload before this price goes out.", "en"), fill("Por encima del rango nacional para {type} ({low} a {high}). Revise la carga de trabajo antes de enviar este precio.", "es"))
      : per < band[2] ? W(fill("Below the national range for {type} ({low} to {high}). Confirm nothing in the scope is missing.", "en"), fill("Por debajo del rango nacional para {type} ({low} a {high}). Confirme que no falte nada en el alcance.", "es"))
      : W(fill("Inside the national range for {type} ({low} to {high}).", "en"), fill("Dentro del rango nacional para {type} ({low} a {high}).", "es"));
    const checks = [
      { key: "floorSplit", ok: true, message: W("Carpet and hard floor add up to the total area", "La alfombra y el piso duro suman el \u00e1rea total") },
      { key: "restroomFixtures", ok: true, message: W("Fixtures and restroom area agree", "Los muebles sanitarios y el \u00e1rea de ba\u00f1os coinciden") },
      { key: "countedItems", ok: !area || v("highTouchPoints") > 0, message: !area || v("highTouchPoints") > 0 ? W("High-touch points are counted", "Los puntos de mucho contacto est\u00e1n contados") : W("No high-touch points counted. Touchpoint disinfection is priced at zero", "No se contaron puntos de mucho contacto. La desinfecci\u00f3n de esos puntos tiene precio cero") },
      { key: "everyHourPriced", ok: true, message: W("Every hour in the workload is priced", "Cada hora de la carga de trabajo tiene precio") },
      { key: "porterSpecialtyFit", ok: true, message: W("Porter and specialty hours fit inside the workload", "Las horas del conserje de d\u00eda y las especiales caben en la carga de trabajo") },
      { key: "priceRange", ok: !!area && per >= band[2] && per <= band[3], message: priceWords },
      { key: "equipmentTerm", ok: true, message: equipment ? W("Equipment of " + money(equipment) + " is spread over " + (v("contractTermMonths") || 12) + " months", "El equipo de " + money(equipment) + " se reparte en " + (v("contractTermMonths") || 12) + " meses") : W("No equipment on this quote.", "Esta cotizaci\u00f3n no tiene equipo.") },
    ];
    return { inputs: { values, tasks, lists }, results, taskHours, taskDetail, checks };
  };
  // A building of a site's square feet, laid out the way the medical plaza's 61,500 are.
  const LAYOUT = { offices: [12000, 10500, 1500, 42], openOffice: [9000, 9000, 0, 0], hallways: [11500, 2500, 9000, 0], restrooms: [3200, 0, 3200, 14], breakroom: [2100, 0, 2100, 4],
    lobby: [4800, 0, 4800, 1], conference: [3400, 3400, 0, 8], stairwells: [2600, 0, 2600, 6], laboratory: [12900, 0, 12900, 30] };
  const buildingOf = (siteId, facility) => {
    const site = (state.sites || []).find((s0) => s0.id === siteId) || {};
    const k = (Number(site.square_footage) || 61500) / 61500;
    const values = { facilityType: facility, contractType: "subcontractor", contractStartDate: "2026-05-01", toilets: Math.round(28 * k), urinals: Math.round(8 * k), sinks: Math.round(26 * k), dispensersOutsideRestrooms: Math.round(18 * k), highTouchPoints: Math.round(420 * k) };
    Object.keys(LAYOUT).forEach((z) => ZONE_COLUMNS.forEach((c, i) => { values["zones." + z + "." + c[0]] = Math.round((LAYOUT[z][i] * k) / (i === 3 ? 1 : 100)) * (i === 3 ? 1 : 100); }));
    return { values, tasks: {}, lists: {
      equipment: [{ key: null, item: "Backpack vacuum", quantity: 2, unitCost: 450, notes: null }, { key: null, item: "Auto scrubber, 20 inch", quantity: 1, unitCost: 3300, notes: null }],
      supplies: [{ key: null, item: "Neutral floor cleaner, gallon", quantity: 8, unitCost: 32.5, notes: null }, { key: null, item: "Can liners, case", quantity: 10, unitCost: 38, notes: null }],
      otherDirect: [{ key: "mileage", item: null, quantity: 120, unitCost: 0.7, notes: null }] } };
  };
  // The saved quotes: two for Lakeside Medical Plaza, which has no plan, the accepted one Riverbend
  // Logistics Hub's plan is from, Harbor Point Center's plan, saved again since the plan took it, and
  // a declined one.
  const QUOTES = [
    { id: "qt-14", number: "Q-2026-014", status: "draft", revision: 1, siteId: "s-2", facility: "medical", clientName: "Kestrel Medical Group", contactName: "J. Marlowe", contactEmail: "facilities@kestrelmedical.example.invalid", updatedAt: seed.shift(-1) + "T15:20:00Z", sentAt: null },
    { id: "qt-11", number: "Q-2026-011", status: "sent", revision: 1, siteId: "s-2", facility: "medical", clientName: "Kestrel Medical Group", contactName: "J. Marlowe", contactEmail: "facilities@kestrelmedical.example.invalid", updatedAt: seed.shift(-9) + "T14:00:00Z", sentAt: seed.shift(-9) + "T14:10:00Z" },
    { id: "qt-9", number: "Q-2026-009", status: "accepted", revision: 1, siteId: "s-3", facility: "industrial", clientName: "Oldmarsh Freight Partners", contactName: "T. Brandt", contactEmail: "ops@oldmarshfreight.example.invalid", updatedAt: seed.shift(-40) + "T13:00:00Z", sentAt: seed.shift(-45) + "T16:00:00Z" },
    { id: "qt-8", number: "Q-2026-008", status: "sent", revision: 3, siteId: "s-1", facility: "office", clientName: "Fairhaven Property Group", contactName: "R. Villanueva", contactEmail: "contact@fairhavenpg.example.invalid", updatedAt: seed.shift(-2) + "T17:45:00Z", sentAt: seed.shift(-2) + "T17:50:00Z" },
    { id: "qt-31", number: "Q-2025-031", status: "declined", revision: 1, siteId: "s-1", facility: "office", clientName: "Fairhaven Property Group", contactName: "R. Villanueva", contactEmail: "contact@fairhavenpg.example.invalid", updatedAt: seed.shift(-120) + "T13:00:00Z", sentAt: seed.shift(-130) + "T13:00:00Z" },
  ];
  const quoteCalc = (q) => calcOf(buildingOf(q.siteId, q.facility));
  const quoteRow = (q) => ({ id: q.id, number: q.number, status: q.status, revision: q.revision, clientName: q.clientName, siteName: siteName(q.siteId), siteId: q.siteId,
    monthlyPrice: quoteCalc(q).results.monthlyPrice, validUntil: plusDays(q.updatedAt.slice(0, 10), 30), updatedAt: q.updatedAt, sentAt: q.sentAt });
  const quoteFull = (q) => {
    const c = quoteCalc(q);
    const site = (state.sites || []).find((s0) => s0.id === q.siteId) || {};
    return Object.assign(quoteRow(q), { contactName: q.contactName, contactEmail: q.contactEmail, siteAddress: [site.address, site.city, site.state, site.zip].filter(Boolean).join(", "),
      inputs: c.inputs, results: c.results, taskHours: c.taskHours, checks: c.checks, annualPrice: c.results.annualPrice, termMonths: 12, notes: null,
      sentTo: q.sentAt ? [{ name: q.contactName, email: q.contactEmail }] : [], createdBy: { name: ADMIN.firstName + " " + ADMIN.lastName }, createdAt: q.updatedAt });
  };
  const QUOTE_TERMS = W("Prices hold for 30 days. Service starts on the contract start date and is billed monthly.", "Los precios se mantienen por 30 d\u00edas. El servicio empieza en la fecha de inicio del contrato y se factura cada mes.");
  // A site's plan: Riverbend's from the accepted quote, Harbor Point's from a quote saved since.
  const PLANS = { "s-3": { quote: "qt-9", adoptedAt: seed.shift(-38) + "T14:00:00Z", stale: false, note: W("Night crew of five from May.", "Cuadrilla nocturna de cinco desde mayo.") },
    "s-1": { quote: "qt-8", adoptedAt: seed.shift(-20) + "T15:30:00Z", stale: true, note: null } };
  const planOf = (siteId) => {
    const p = PLANS[siteId];
    if (!p) return null;
    const q = QUOTES.find((x) => x.id === p.quote);
    const c = quoteCalc(q);
    const r = c.results;
    return { id: "wp-" + siteId, siteId, quoteId: q.id, quoteNumber: q.number, quoteRevision: p.stale ? q.revision - 1 : q.revision, quoteStatus: q.status, stale: p.stale, modelVersion: "T01-2.0",
      note: p.note, adoptedAt: p.adoptedAt, adoptedBy: { name: ADMIN.firstName + " " + ADMIN.lastName },
      headline: { monthlyHours: r.monthlyLaborHours, hoursPerServiceDay: r.hoursPerServiceDay, recommendedStaff: r.recommendedStaff, minimumStaff: r.minimumStaff },
      figures: RESULTS.filter((x) => x[1] !== "cost" && x[1] !== "equipment").map((x) => ({ key: x[0], group: x[1], label: x[3], unit: x[2], value: r[x[0]] })),
      tasks: TASKS.filter((t) => c.taskHours[t[0]] > 0).map((t) => { const d = c.taskDetail[t[0]]; const f = FREQS.find((x) => x[0] === d.frequency);
        return { key: t[0], label: taskLabel(t), group: (QUOTE_MODEL.taskGroups.find((g) => g.key === t[1]) || {}).title || null, quantity: d.quantity, unit: taskUnit(t), rate: d.rate,
          frequency: f ? f[1] : null, timesPerMonth: d.timesPerMonth, hoursPerOccurrence: d.hoursPerOccurrence, hoursPerMonth: d.monthlyHours, typed: false }; }) };
  };
  const cleanersAt = (siteId) => (state.staff || []).filter((p) => p.status === "active" && p.site_id === siteId && ["custodial_lead", "custodial_laborer", "day_porter"].indexOf(p.role) >= 0).length;
  const sitePlanAnswer = (siteId, lang) => {
    const plan = planOf(siteId);
    const history = siteId === "s-1" ? [{ id: "wp-s-1-old", quoteNumber: "Q-2025-031", quoteRevision: 1, adoptedAt: seed.shift(-200) + "T14:00:00Z", adoptedBy: { name: ADMIN.firstName + " " + ADMIN.lastName },
      endedAt: seed.shift(-20) + "T15:30:00Z", endedBy: { name: ADMIN.firstName + " " + ADMIN.lastName }, endReason: "replaced", endNote: null, note: null }] : [];
    const out = { plan: plan ? Object.assign({}, plan, { note: plan.note ? said2(plan.note, lang) : null }) : null, history, assigned: { cleaners: cleanersAt(siteId), supervisors: 1 } };
    return ok(out);
  };
  // The printed plan. The browser the pictures are taken in draws no PDF, so the plan is answered as
  // the page it prints: the site, who took it and when, the quote, the hours, the staffing, the task
  // table and the people assigned, with no price.
  const planPage = (siteId, lang) => {
    const plan = planOf(siteId);
    const t = (en, es) => (lang === "es" ? es : en);
    const esc = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const n = (x) => Number(x).toLocaleString(lang === "es" ? "es-US" : "en-US", { maximumFractionDigits: 2 });
    const day = new Date(plan.adoptedAt).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { year: "numeric", month: "long", day: "numeric", timeZone: seed.TIMEZONE });
    const people = (state.staff || []).filter((p) => p.status === "active" && p.site_id === siteId).map((p) => esc(p.name)).join(", ");
    const rows = plan.tasks.map((x) => "<tr><td>" + esc(said2(x.label, lang)) + "</td><td>" + n(x.quantity) + " " + esc(said2(x.unit, lang)) + "</td><td>" + esc(said2(x.frequency, lang)) + "</td><td style=\"text-align:right\">" + n(x.hoursPerMonth) + "</td></tr>").join("");
    const html = "<!doctype html><html><head><meta charset=\"utf-8\"><style>body{font:13px Helvetica,Arial,sans-serif;color:#1d2433;margin:28px 34px}h1{font-size:20px;margin:0 0 2px}"
      + ".sub{color:#5a6474;margin-bottom:14px}.tiles{display:flex;gap:10px;margin:12px 0 16px}.tiles div{border:1px solid #d8dde6;border-radius:6px;padding:8px 12px}.tiles b{display:block;font-size:17px}"
      + "table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #e3e7ee;padding:6px 4px;text-align:left}th{font-size:11px;color:#5a6474;text-transform:uppercase}</style></head><body>"
      + "<h1>" + esc(t("Workload plan", "Plan de carga de trabajo")) + "</h1><div class=\"sub\">" + esc(siteName(siteId)) + " &middot; " + esc(t("Taken on ", "Tomado el ")) + esc(day) + " " + esc(t("by", "por")) + " " + esc(plan.adoptedBy.name)
      + " &middot; " + esc(plan.quoteNumber) + ", " + esc(t("revision", "revisi\u00f3n")) + " " + plan.quoteRevision + "</div>"
      + "<div class=\"tiles\"><div><b>" + n(plan.headline.monthlyHours) + "</b>" + esc(t("Hours a month", "Horas al mes")) + "</div><div><b>" + n(plan.headline.hoursPerServiceDay) + "</b>" + esc(t("Hours a service day", "Horas por d\u00eda de servicio")) + "</div>"
      + "<div><b>" + plan.headline.recommendedStaff + "</b>" + esc(t("Staff recommended", "Personal recomendado")) + "</div><div><b>" + plan.headline.minimumStaff + "</b>" + esc(t("Staff minimum", "Personal m\u00ednimo")) + "</div></div>"
      + "<table><thead><tr><th>" + esc(t("Task", "Tarea")) + "</th><th>" + esc(t("Quantity", "Cantidad")) + "</th><th>" + esc(t("Frequency", "Frecuencia")) + "</th><th style=\"text-align:right\">" + esc(t("Hours per month", "Horas al mes")) + "</th></tr></thead><tbody>" + rows + "</tbody></table>"
      + "<p class=\"sub\" style=\"margin-top:14px\">" + esc(t("Assigned on ", "Asignados al ")) + esc(new Date(seed.NOW_ISO).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { year: "numeric", month: "long", day: "numeric", timeZone: seed.TIMEZONE })) + ": " + people + "</p></body></html>";
    return { status: 200, bytes: Buffer.from(html, "utf8"), contentType: "text/html; charset=utf-8", json: null, headers: { "Content-Disposition": 'inline; filename="workload-plan.pdf"' } };
  };

  // ---- the answers ------------------------------------------------------------------------------
  return (method, path, query, body, lang) => {
    if (method === "GET" && path === "/api/discipline/steps") return ok(stepsView(lang));
    if (method === "GET" && path === "/api/discipline") {
      const rows = WARNINGS().filter((w) => w.status !== "draft")
        .filter((w) => (!query.get("userId") || w.userId === query.get("userId")) && (!query.get("type") || w.type === query.get("type")) && (!query.get("status") || w.status === query.get("status")));
      return ok({ warnings: rows.map((w) => warningView(w, lang)), counts: countsOf(rows) });
    }
    if (method === "GET" && path === "/api/discipline/person/" + WARNED) {
      const p = staff(WARNED);
      const rows = WARNINGS().filter((w) => w.userId === WARNED);
      return ok({
        person: { userId: WARNED, name: p.name, role: p.role, status: p.status, sites: [{ siteId: p.site_id, name: p.site_name }], language: p.preferred_language === "es" ? "es" : "en", hasEmail: true },
        history: rows.map((w) => Object.assign(warningView(w, lang), { originalPdf: null })),
        last12Months: { since: seed.shift(-365), byType: countsOf(rows).byType },
        // One warning filed on the old form that no entry on the record matches.
        notOnRecord: [{ submissionId: "js-warn-1", submittedAt: "2025-09-08T14:30:00Z" }],
        highestStep: "written_warning", suggestedNext: "final_warning",
      });
    }
    if (method === "GET" && path === "/api/clearances") return clearancesAnswer(query);
    // The rehire's school site refusal names what is missing by its key, the way helpers/clearances.js
    // missingOf does, so the window draws each in the screen's language.
    if (method === "POST" && path === "/api/users/u-staff-12/employment/rehire" && body && Array.isArray(body.restoreAssignmentIds) && body.restoreAssignmentIds.indexOf("ssa-past-2") >= 0) {
      const name = staff("u-staff-12").name;
      return { status: 409, json: { error: T(lang, name + " cannot be placed at this school site.", "No se puede asignar a " + name + " a este sitio escolar."), code: "schedule.clearanceMissing", missing: ["act151", "act168"], keys: [name], userId: "u-staff-12", siteId: "s-3" } };
    }
    if (method === "GET" && path === "/api/chat/people") return chatPeople(query);
    if (method === "GET" && path === "/api/chat/direct-inbox") return directInbox(lang);
    const dc = /^\/api\/chat\/channels\/(dc-[0-9]+)\/(messages|read)$/.exec(path);
    const direct = dc && DIRECT.find((c) => c.channelId === dc[1]);
    if (direct && dc[2] === "messages" && method === "GET") { readDirect[direct.channelId] = true; return directMessages(direct, lang); }
    if (direct && dc[2] === "read" && method === "POST") { readDirect[direct.channelId] = true; return ok({ ok: true }); }
    if (method === "GET" && path === "/api/users/employment-reasons") {
      return ok({ ended: REASONS.ended.map((r) => ({ code: r[0], label: T(lang, r[1], r[2]) })), leave: REASONS.leave.map((r) => ({ code: r[0], label: T(lang, r[1], r[2]) })) });
    }
    if (method === "GET" && (path === "/api/users/" + ON_LEAVE + "/employment" || path === "/api/users/" + NO_REASON + "/employment")) return ok(employmentOf(path.split("/")[3], lang));
    if (method === "GET" && path === "/api/users/roster-check") return rosterAnswer(query, lang);
    if (method === "GET" && path === "/api/users/me/trusted-devices") return ok({ devices: DEVICES });
    if (method === "GET" && path === "/api/inspections/scheduled" && query.get("awaiting") === "review") return ok([inspRow()]);
    if (method === "GET" && path === "/api/inspections/scheduled/" + INSP) return inspectionDetail(lang);
    if (method === "GET" && path === "/api/inspections/results/" + RESULT + "/signatures/inspector") return { status: 200, bytes: SIGNATURE, contentType: "image/png", json: null };
    const photo = /^\/api\/inspection-photos\/insp-4-([a-e])\.svg$/.exec(path);
    if (photo && method === "GET") return { status: 200, bytes: photoSvg(photo[1]), contentType: "image/svg+xml", json: null };
    // Quotes and site workload plans; build_quotes is granted above.
    if (method === "GET" && path === "/api/quotes/model") return ok(QUOTE_MODEL);
    if (method === "POST" && path === "/api/quotes/calculate") return ok(calcOf(body && body.inputs));
    if (method === "GET" && path === "/api/quotes/defaults") {
      return ok({ defaults: { values: {}, tasks: {}, lists: { equipment: [], supplies: [], otherDirect: [{ key: "mileage", item: null, quantity: 0, unitCost: 0.7, notes: null }] } },
        validDays: 30, termsEn: QUOTE_TERMS.en, termsEs: QUOTE_TERMS.es, updatedAt: seed.shift(-60) + "T15:00:00Z", updatedBy: { name: ADMIN.firstName + " " + ADMIN.lastName } });
    }
    if (method === "GET" && path === "/api/quotes") {
      const st = query.get("status") || "", qq = String(query.get("q") || "").toLowerCase(), sid = query.get("siteId") || "";
      const rows = QUOTES.filter((q) => (!st || q.status === st) && (!sid || q.siteId === sid) && (!qq || (q.number + " " + q.clientName + " " + siteName(q.siteId)).toLowerCase().indexOf(qq) >= 0))
        .slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return ok({ quotes: rows.map(quoteRow) });
    }
    const qOne = /^\/api\/quotes\/(qt-[0-9]+)$/.exec(path);
    const quote = qOne && QUOTES.find((q) => q.id === qOne[1]);
    if (quote && method === "GET") {
      const p = Object.keys(PLANS).filter((k) => PLANS[k].quote === quote.id).map((k) => ({ planId: "wp-" + k, siteId: k, siteName: siteName(k), quoteRevision: PLANS[k].stale ? quote.revision - 1 : quote.revision, adoptedAt: PLANS[k].adoptedAt, current: true, stale: PLANS[k].stale }));
      return ok({ quote: quoteFull(quote), plans: p });
    }
    if (method === "GET" && path === "/api/workload-plans") {
      return ok({ sites: (state.sites || []).filter((s0) => s0.status === "active").slice().sort((a, b) => a.name.localeCompare(b.name)).map((s0) => {
        const p = planOf(s0.id);
        return { siteId: s0.id, siteName: s0.name, plan: p ? { quoteNumber: p.quoteNumber, quoteRevision: p.quoteRevision, adoptedAt: p.adoptedAt, stale: p.stale, monthlyHours: p.headline.monthlyHours, recommendedStaff: p.headline.recommendedStaff } : null,
          assigned: { cleaners: cleanersAt(s0.id), supervisors: 1 } };
      }) });
    }
    const wp = /^\/api\/sites\/(s-[0-9]+)\/workload-plan(\/pdf)?$/.exec(path);
    if (wp && method === "GET" && !wp[2]) return sitePlanAnswer(wp[1], lang);
    if (wp && method === "GET" && wp[2] && PLANS[wp[1]]) return planPage(wp[1], lang);
    return null;
  };
}

// The protective equipment a person was issued, and what was issued at a site, the way
// routes/ppeIssues.js answers GET /api/ppe-issues, each row with its signature request once Step 270's
// are armed.
function ppePart(ctx) {
  const { seed, ok, tPersonName, signatureOf270 } = ctx;
  const ISSUES = [
    { id: "pp-1", userId: "u-staff-5", siteId: "s-2", item: "Safety glasses", size: null, quantity: 1, fitOk: true, note: null, issuedAt: seed.shift(-30) + "T14:00:00Z" },
    { id: "pp-2", userId: "u-staff-5", siteId: "s-2", item: "Chemical splash goggles", size: null, quantity: 1, fitOk: true, note: "For the floor stripping crew.", issuedAt: seed.shift(-12) + "T13:20:00Z" },
    { id: "pp-9", userId: "u-staff-6", siteId: "s-1", item: "Nitrile gloves", size: "M", quantity: 2, fitOk: true, note: null, issuedAt: seed.shift(-2) + "T13:30:00Z" },
  ];
  return (method, path, query) => {
    if (path !== "/api/ppe-issues" || method !== "GET") return null;
    const userId = query.get("userId"), siteId = query.get("siteId");
    return ok({ issues: ISSUES.filter((x) => (userId ? x.userId === userId : siteId ? x.siteId === siteId : true)).map((x) => {
      const out = Object.assign({}, x, { userName: tPersonName(x.userId) });
      const sg = signatureOf270("ppe_issue", x.id);
      if (sg) out.signature = sg;
      return out;
    }) });
  };
}

module.exports = (ctx) => {
  const parts = [schedulePart(ctx), formsPart(ctx), peoplePart(ctx), equipmentPart(ctx), ppePart(ctx)];
  return (method, path, query, body, lang, base) => {
    for (const part of parts) { const a = part(method, path, query, body, lang, base); if (a) return a; }
    return null;
  };
};
