// What the API's Round 12 answers for the dashboard (ocsa-api part 382, #162, main e4f2048), for the dashboard's
// part 389. audit/stubs.js lays it over the part386 stub and every layer under it, in every run, since the API's
// main answers it. Each route is answered the way the API's code at e4f2048 answers it, with the API's own words
// in English and Spanish (helpers/words.js):
//
//   Section 1, findings as training or a conversation (routes/findings.js, helpers/findingFollowUps.js), over the
//   six findings of the Step 253 layer (f-1 to f-6 in audit/stubs.js):
//     GET /api/inspections/findings?status=&siteId=&ownerId=&kind=
//                                         an admin or a supervisor (mayList), else 403
//                                         access.insufficientPermissions; 400 inspections.badDetails keys naming
//                                         each filter that is not one; { findings: [Finding], asOf }, newest
//                                         first, with no status the ones in needsFollowUp, open or overdue.
//                                         Finding: { id, site, inspection: { scheduledInspectionId, templateName,
//                                         completedAt, inspector }, card: { label, zone, score, maxScore }, notes,
//                                         photos: [{ id, url }], severity, status, foundAt, owner, followUp, due,
//                                         state, suggestedTopicId, correctiveActionId }
//     GET /api/inspections/findings/:id  { finding }, 404 inspections.findingNotFound
//     POST /api/inspections/findings/:id/follow-up { kind, topicId?, ownerId? }
//                                         404 inspections.findingNotFound; 403 access.insufficientPermissions under
//                                         the scene noDecide (mayDecide); 409 inspections.findingClosed { status }
//                                         for a closed or declined finding; 400 inspections.badFollowUp keys kind
//                                         or topicId (readChoice); 400 inspections.badOwner keys ownerId for an
//                                         owner not among the site's; 400 inspections.ownerRequired keys ownerId
//                                         with no owner; 409 inspections.followUpDone; else the open one ended and
//                                         kept, the owner named (the issue moved to in progress with its first
//                                         response), due in 7 days for training and 3 for a conversation, 201
//                                         { finding }
//     POST /api/inspections/findings/:id/conversation { heldAt?, covered, othersPresent? }
//                                         404, 403 as above; 400 inspections.badConversation keys (heldAt an
//                                         instant with its zone and never ahead, covered 1 to 2,000 characters,
//                                         othersPresent up to 500); 409 inspections.notConversation; 409
//                                         inspections.conversationRecorded; else done once recorded, the finding
//                                         resolved while it was unresolved, 200 { finding }
//     what was covered and who else was there are answered to an admin (read_hr_records), the person and whoever
//                                         recorded it; null to anyone else (readsCoaching)
//     GET /api/inspections/scheduled/:id followUpTopics [{ id, name, category, kind }] in the library's order and
//                                         each item's suggestedTopicId (SD and QS cleaning methods, HSE safety, HR
//                                         start here, MC customer service); owners, the site's people; and each
//                                         finding's followUp { id, kind, topicId, dueOn, doneAt, state } | null
//     GET /api/inspections/analytics/export
//                                         each row adds finding_id, finding_follow_up, finding_follow_up_due_on and
//                                         finding_follow_up_done_at
//     GET /api/forms/responses/fr-ca-1   linkedIssues[].followUp, the same short shape
//     GET /api/issues/:id                a finding's followUp (the whole shape or null) and canAssign false
//     POST /api/issues/:id/assign-as-task
//                                         409 issues.findingNoTask { followUpPath } on a finding, nothing written
//     GET /api/hr/employee-folder/:id    findingFollowUps: [FollowUp & { finding: { id, title, foundAt,
//                                         siteName } }], newest first, a conversation with recordKind coaching
//
//   The follow-ups on record: f-2, training on Glass and surface cleaning chosen two days ago (open); f-6, a
//   conversation chosen five days ago and due two days ago (overdue); f-3, a conversation held, recorded and
//   confirmed (done). f-1 and f-5 have no owner and no follow-up (needsFollowUp); f-4 was closed with none
//   (resolved). The scene noDecide refuses every choice and record; the scene oldIssue answers a finding's
//   GET /api/issues/:id as the API did before Round 12 (no followUp, canAssign true).
//
// Every value is invented: the topics, the people's words and the days.
"use strict";

module.exports = (ctx) => {
  const { seed, state, ok, clone, person, items } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const TODAY = seed.TODAY;
  const addDays = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const me = () => person();
  const meRef = () => { const p = me(); return { id: p.id, name: p.firstName + " " + p.lastName }; };
  const PEOPLE = seed.PEOPLE;
  const nameRef = (p) => ({ id: p.id, name: p.firstName + " " + p.lastName });

  let model = null;
  const m = () => {
    if (!model) model = { scene: {}, sent: [], followUps: null, seq: 1 };
    return model;
  };
  const sent = (what, body) => { m().sent.push({ what, body: clone(body === undefined ? null : body) }); };

  // ---- The API's words (helpers/words.js) ---------------------------------------------------------------------
  const WORDS = {
    "access.insufficientPermissions": ["Insufficient permissions", "No tiene permiso para hacer esto"],
    "inspections.badDetails": ["Some details are missing or not valid", "Faltan algunos datos o no son v\u00e1lidos"],
    "inspections.badOwner": ["Choose an owner from the site's people", "Elija un responsable entre las personas del sitio"],
    "inspections.badFollowUp": ["Choose training with a lesson topic, or a conversation", "Elija una capacitaci\u00f3n con un tema de lecci\u00f3n, o una conversaci\u00f3n"],
    "inspections.ownerRequired": ["Choose an owner for this finding first", "Primero elija un responsable para este hallazgo"],
    "inspections.followUpDone": ["This finding's follow-up is already done", "El seguimiento de este hallazgo ya est\u00e1 hecho"],
    "inspections.findingNotFound": ["Finding not found", "Hallazgo no encontrado"],
    "inspections.findingClosed": ["This finding is closed", "Este hallazgo est\u00e1 cerrado"],
    "inspections.notConversation": ["This finding's follow-up is not a conversation", "El seguimiento de este hallazgo no es una conversaci\u00f3n"],
    "inspections.conversationRecorded": ["This conversation is already recorded", "Esta conversaci\u00f3n ya est\u00e1 registrada"],
    "inspections.badConversation": ["Say when it was held, what was covered and who else was there", "Indique cu\u00e1ndo se tuvo, qu\u00e9 se trat\u00f3 y qui\u00e9n m\u00e1s estuvo"],
    "issues.findingNoTask": ["A finding is followed up with training or a conversation, not a task", "Un hallazgo se atiende con capacitaci\u00f3n o una conversaci\u00f3n, no con una tarea"],
  };
  const refuse = (lang, status, code, extra) => bad(status, code, T(lang, WORDS[code][0], WORDS[code][1]), extra);

  // ---- Section 1: findings as training or a conversation -------------------------------------------------------
  const KINDS = ["training", "conversation"];
  const DUE_DAYS = { training: 7, conversation: 3 };
  const STATES = ["needsFollowUp", "open", "overdue", "done", "resolved"];
  const UNRESOLVED = ["open", "in_progress", "escalated"];
  const CLOSED = ["closed", "declined"];
  const SUGGEST = { SD: "cleaning_methods", QS: "cleaning_methods", HSE: "safety", HR: "start_here", MC: "customer_service" };
  // The active topics with a published lesson that are not given per site, in the library's order: category,
  // then sort order (helpers/trainingCategories.js CATEGORY_KEYS).
  const CATEGORY_KEYS = ["start_here", "safety", "chemicals", "cleaning_methods", "floor_care", "equipment", "customer_service", "site_security", "supervisors"];
  const TOPICS = [
    { id: "tp-3", en: "Ladder use", es: "Uso de escaleras", category: "safety", sortOrder: 10, kind: "observation" },
    { id: "tp-4", en: "Reporting a concern about a child", es: "Reportar una preocupaci\u00f3n sobre un menor", category: "safety", sortOrder: 20, kind: "quiz" },
    { id: "tp-1", en: "Spill response", es: "Respuesta a derrames", category: "chemicals", sortOrder: 10, kind: "quiz" },
    { id: "tp-8", en: "Glass and surface cleaning", es: "Limpieza de vidrios y superficies", category: "cleaning_methods", sortOrder: 10, kind: "quiz" },
    { id: "tp-5", en: "Floor machine basics", es: "Conceptos b\u00e1sicos de la m\u00e1quina de piso", category: "floor_care", sortOrder: 10, kind: "quiz" },
  ];
  const topicsIn = (lang) => TOPICS.slice().sort((a, b) => CATEGORY_KEYS.indexOf(a.category) - CATEGORY_KEYS.indexOf(b.category) || a.sortOrder - b.sortOrder)
    .map((x) => ({ id: x.id, name: T(lang, x.en, x.es), category: x.category, kind: x.kind }));
  const topicName = (id, lang) => { const x = TOPICS.find((y) => y.id === id); return x ? T(lang, x.en, x.es) : null; };
  const suggestedFor = (category, lang) => { const want = SUGGEST[String(category || "").toUpperCase()]; const hit = want ? topicsIn(lang).find((x) => x.category === want) : null; return hit ? hit.id : null; };
  // The site's people a finding may name as its owner (helpers/inspectionFindings.js ownersFor): the active staff
  // who are not office accounts.
  const owners = () => seed.STAFF.filter((p) => p.status === "active" && ["custodial_lead", "custodial_laborer", "day_porter"].indexOf(p.role) >= 0)
    .map((p) => ({ id: p.id, name: p.name, role: p.role }));

  const findings = () => (ctx.findings ? ctx.findings() : state.findings || []);
  const itemOf = (f) => (items || []).find((it) => f.inspection && it.label === f.inspection.itemLabel) || null;
  const siteName = (id) => ((state.sites || seed.SITES).find((s) => s.id === id) || {}).name || null;
  const at = (day, hm) => day + "T" + hm + ":00Z";
  const followUps = () => {
    if (!m().followUps) {
      const admin = nameRef(PEOPLE.admin);
      m().followUps = [
        { id: "fu-1", issueId: "f-2", ownerId: PEOPLE.supervisor.id, kind: "training", topicId: "tp-8", dueOn: addDays(TODAY, 5), chosenAt: at(addDays(TODAY, -2), "15:00"), chosenBy: admin,
          doneAt: null, recordId: null, completedDate: null, endedAt: null },
        { id: "fu-2", issueId: "f-6", ownerId: PEOPLE.supervisor.id, kind: "conversation", topicId: null, dueOn: addDays(TODAY, -2), chosenAt: at(addDays(TODAY, -5), "14:00"), chosenBy: admin,
          heldAt: null, heldBy: null, covered: null, othersPresent: null, recordedAt: null, recordedBy: null, confirmedAt: null, doneAt: null, endedAt: null },
        { id: "fu-3", issueId: "f-3", ownerId: PEOPLE.supervisor.id, kind: "conversation", topicId: null, dueOn: seed.shift(-66), chosenAt: at(seed.shift(-69), "10:00"), chosenBy: admin,
          heldAt: at(seed.shift(-67), "14:30"), heldBy: admin, covered: "Went over the dock floor markings and the path of the roller door. Agreed to check the lines at the start of each shift.",
          othersPresent: "The site's day porter", recordedAt: at(seed.shift(-67), "15:00"), recordedBy: admin, confirmedAt: at(seed.shift(-66), "13:00"), doneAt: at(seed.shift(-67), "15:00"), endedAt: null },
      ];
    }
    return m().followUps;
  };
  const openOf = (issueId) => followUps().find((x) => x.issueId === issueId && !x.endedAt) || null;
  const fuState = (x) => (!x ? null : x.doneAt ? "done" : x.dueOn < TODAY ? "overdue" : "open");
  const readsCoaching = (x) => { const p = me(); return p.role === "admin" || (x && (x.ownerId === p.id || (x.recordedBy && x.recordedBy.id === p.id))); };
  const view = (x, lang) => {
    if (!x) return null;
    const coaching = readsCoaching(x);
    return {
      id: x.id, findingId: x.issueId, kind: x.kind, recordKind: x.kind === "conversation" ? "coaching" : "training",
      topic: x.topicId ? { id: x.topicId, name: topicName(x.topicId, lang) } : null,
      dueOn: x.dueOn, state: fuState(x), chosenAt: x.chosenAt, chosenBy: x.chosenBy, doneAt: x.doneAt || null,
      training: x.kind === "training" ? { recordId: x.recordId || null, completedDate: x.completedDate || null } : null,
      conversation: x.kind === "conversation" ? {
        heldAt: x.heldAt || null, heldBy: x.heldBy || null, recordedAt: x.recordedAt || null, recordedBy: x.recordedBy || null,
        covered: coaching ? x.covered || null : null, othersPresent: coaching ? x.othersPresent || null : null,
        confirmedAt: x.confirmedAt || null, waitingConfirmation: !!x.recordedAt && !x.confirmedAt,
      } : null,
    };
  };
  const summary = (x) => (x ? { id: x.id, kind: x.kind, topicId: x.topicId || null, dueOn: x.dueOn, doneAt: x.doneAt || null, state: fuState(x) } : null);
  const findingState = (f, x) => { const s = fuState(x); if (s === "done") return "done"; if (UNRESOLVED.indexOf(f.status) < 0) return "resolved"; return s || "needsFollowUp"; };
  const findingView = (f, lang) => {
    const x = openOf(f.id);
    const fu = view(x, lang);
    const it = itemOf(f);
    return {
      id: f.id, site: { id: f.siteId, name: siteName(f.siteId) },
      inspection: { scheduledInspectionId: f.inspection ? f.inspection.scheduledInspectionId : null, templateName: f.inspection ? f.inspection.templateName : null, completedAt: f.inspection ? f.inspection.completedAt : null, inspector: f.reportedBy || null },
      card: { label: f.inspection ? f.inspection.itemLabel : f.title, zone: (it && it.zone) || f.zone || null, score: f.inspection ? f.inspection.itemScore : null, maxScore: f.inspection ? f.inspection.itemMaxScore : null },
      notes: f.description || null, photos: (f.photos || []).map((p) => ({ id: p.id, url: p.url })), severity: f.severity || null, status: f.status, foundAt: f.reportedAt,
      owner: f.assignedTo || null, followUp: fu, due: fu ? fu.dueOn : UNRESOLVED.indexOf(f.status) >= 0 ? addDays(String(f.reportedAt).slice(0, 10), 2) : null,
      state: findingState(f, x), suggestedTopicId: suggestedFor(it ? it.cims_category : null, lang), correctiveActionId: f.correctiveActionId || null,
    };
  };
  const mayList = () => { const p = me(); return p.role === "admin" || p.role === "supervisor"; };
  const mayDecide = () => mayList() && !m().scene.noDecide;
  const UUIDISH = /^[A-Za-z0-9-]{1,64}$/;

  function findingsRoute(method, path, query, body, lang, base) {
    if (path === "/api/inspections/findings" && method === "GET") {
      if (!mayList()) return refuse(lang, 403, "access.insufficientPermissions");
      const raw = (k) => (query.get(k) === null || query.get(k) === "" ? null : String(query.get(k)));
      const keys = [];
      const status = raw("status");
      if (status && STATES.indexOf(status) < 0) keys.push("status");
      const kind = raw("kind");
      if (kind && KINDS.concat(["none"]).indexOf(kind) < 0) keys.push("kind");
      const siteId = raw("siteId");
      if (siteId && !UUIDISH.test(siteId)) keys.push("siteId");
      const ownerId = raw("ownerId");
      if (ownerId && !UUIDISH.test(ownerId)) keys.push("ownerId");
      if (keys.length) return refuse(lang, 400, "inspections.badDetails", { keys });
      let rows = findings().filter((f) => (!siteId || f.siteId === siteId) && (!ownerId || (f.assignedTo && f.assignedTo.id === ownerId)));
      if (!status || ["needsFollowUp", "open", "overdue"].indexOf(status) >= 0) rows = rows.filter((f) => UNRESOLVED.indexOf(f.status) >= 0);
      rows = rows.slice().sort((a, b) => (a.reportedAt < b.reportedAt ? 1 : a.reportedAt > b.reportedAt ? -1 : (a.id < b.id ? 1 : -1)));
      let list = rows.map((f) => findingView(f, lang));
      list = status ? list.filter((f) => f.state === status) : list.filter((f) => f.state !== "done" && f.state !== "resolved");
      if (kind === "none") list = list.filter((f) => !f.followUp);
      else if (kind) list = list.filter((f) => f.followUp && f.followUp.kind === kind);
      return ok({ findings: list, asOf: TODAY });
    }
    const one = /^\/api\/inspections\/findings\/([^/]+)(?:\/(follow-up|conversation))?$/.exec(path);
    if (!one) return null;
    const f = findings().find((x) => x.id === decodeURIComponent(one[1]));
    if (!one[2] && method === "GET") {
      if (!mayList()) return refuse(lang, 403, "access.insufficientPermissions");
      return f ? ok({ finding: findingView(f, lang) }) : refuse(lang, 404, "inspections.findingNotFound");
    }
    if (one[2] === "follow-up" && method === "POST") {
      sent("follow-up", { id: decodeURIComponent(one[1]), body });
      if (!f) return refuse(lang, 404, "inspections.findingNotFound");
      if (!mayDecide()) return refuse(lang, 403, "access.insufficientPermissions");
      if (CLOSED.indexOf(f.status) >= 0) return refuse(lang, 409, "inspections.findingClosed", { status: f.status });
      const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};
      const kind = typeof b.kind === "string" ? b.kind.trim() : "";
      if (KINDS.indexOf(kind) < 0) return refuse(lang, 400, "inspections.badFollowUp", { keys: ["kind"] });
      let topicId = null;
      if (kind === "conversation") {
        if (b.topicId !== undefined && b.topicId !== null && b.topicId !== "") return refuse(lang, 400, "inspections.badFollowUp", { keys: ["topicId"] });
      } else {
        topicId = typeof b.topicId === "string" ? b.topicId.trim() : "";
        if (!TOPICS.some((x) => x.id === topicId)) return refuse(lang, 400, "inspections.badFollowUp", { keys: ["topicId"] });
      }
      let ownerId = null;
      if (b.ownerId !== undefined && b.ownerId !== null && b.ownerId !== "") {
        if (!owners().some((o) => o.id === String(b.ownerId))) return refuse(lang, 400, "inspections.badOwner", { keys: ["ownerId"] });
        ownerId = String(b.ownerId);
      }
      const owner = ownerId || (f.assignedTo ? f.assignedTo.id : null);
      if (!owner) return refuse(lang, 400, "inspections.ownerRequired", { keys: ["ownerId"] });
      const open = openOf(f.id);
      if (open && open.doneAt) return refuse(lang, 409, "inspections.followUpDone");
      if (open) { open.endedAt = seed.NOW_ISO; open.endedBy = meRef(); }
      if (ownerId && !(f.assignedTo && f.assignedTo.id === ownerId)) {
        const p = seed.STAFF.find((s) => s.id === ownerId);
        f.assignedTo = { id: ownerId, name: p ? p.name : null };
        if (f.status === "open") f.status = "in_progress";
        if (!f.firstResponseAt) f.firstResponseAt = seed.NOW_ISO;
      }
      if (UNRESOLVED.indexOf(f.status) >= 0 && !f.firstResponseAt) f.firstResponseAt = seed.NOW_ISO;
      const row = { id: "fu-n" + (m().seq++), issueId: f.id, ownerId: owner, kind, topicId, dueOn: addDays(TODAY, DUE_DAYS[kind]), chosenAt: seed.NOW_ISO, chosenBy: meRef(),
        heldAt: null, heldBy: null, covered: null, othersPresent: null, recordedAt: null, recordedBy: null, confirmedAt: null, doneAt: null, recordId: null, completedDate: null, endedAt: null };
      followUps().push(row);
      return { status: 201, json: { finding: findingView(f, lang) } };
    }
    if (one[2] === "conversation" && method === "POST") {
      sent("conversation", { id: decodeURIComponent(one[1]), body });
      if (!f) return refuse(lang, 404, "inspections.findingNotFound");
      if (!mayDecide()) return refuse(lang, 403, "access.insufficientPermissions");
      const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};
      const keys = [];
      let heldAt = seed.NOW_ISO;
      if (b.heldAt !== undefined && b.heldAt !== null && b.heldAt !== "") {
        const ok1 = typeof b.heldAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(b.heldAt.trim());
        const tm = ok1 ? Date.parse(b.heldAt.trim()) : NaN;
        if (!ok1 || !Number.isFinite(tm) || tm > Date.parse(seed.NOW_ISO) + 5 * 60000) keys.push("heldAt");
        else heldAt = new Date(tm).toISOString();
      }
      const covered = typeof b.covered === "string" ? b.covered.trim() : "";
      if (!covered || covered.length > 2000) keys.push("covered");
      let others = null;
      if (b.othersPresent !== undefined && b.othersPresent !== null && b.othersPresent !== "") {
        if (typeof b.othersPresent !== "string" || b.othersPresent.trim().length > 500) keys.push("othersPresent");
        else others = b.othersPresent.trim() || null;
      }
      if (keys.length) return refuse(lang, 400, "inspections.badConversation", { keys });
      const x = openOf(f.id);
      if (!x || x.kind !== "conversation") return refuse(lang, 409, "inspections.notConversation");
      if (x.recordedAt) return refuse(lang, 409, "inspections.conversationRecorded");
      Object.assign(x, { heldAt, heldBy: meRef(), covered, othersPresent: others, recordedAt: seed.NOW_ISO, recordedBy: meRef(), doneAt: seed.NOW_ISO });
      if (UNRESOLVED.indexOf(f.status) >= 0) { f.status = "resolved"; f.resolvedAt = seed.NOW_ISO; f.resolvedBy = meRef(); }
      return ok({ finding: findingView(f, lang) });
    }
    return null;
  }

  // A finding's records: the inspection's read, the analytics rows, the corrective action and the issue.
  function recordsRoute(method, path, query, body, lang, base) {
    if (/^\/api\/inspections\/scheduled\/[^/]+$/.test(path) && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || typeof a.json !== "object") return a;
      const id = decodeURIComponent(path.split("/")[4]);
      const topics = topicsIn(lang);
      const json = Object.assign({}, a.json, { followUpTopics: topics, owners: owners() });
      if (Array.isArray(json.items)) json.items = json.items.map((it) => Object.assign({}, it, { suggestedTopicId: suggestedFor(it.serviceCategory !== undefined ? it.serviceCategory : it.cims_category, lang) }));
      if (Array.isArray(json.findings)) json.findings = json.findings.map((x) => Object.assign({}, x, { followUp: summary(openOf(x.issueId)) }));
      void id;
      return Object.assign({}, a, { json });
    }
    if (path.indexOf("/api/inspections/analytics/export") === 0 && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !Array.isArray(a.json)) return a;
      return Object.assign({}, a, { json: a.json.map((r) => {
        const f = findings().find((x) => x.inspection && x.inspection.scheduledInspectionId === r.id && x.inspection.itemLabel === r.item_label) || null;
        const x = f ? openOf(f.id) : null;
        return Object.assign({}, r, { finding_id: f ? f.id : null, finding_follow_up: x ? x.kind : null, finding_follow_up_due_on: x ? x.dueOn : null, finding_follow_up_done_at: x ? x.doneAt || null : null });
      }) });
    }
    if (/^\/api\/forms\/responses\/[^/]+$/.test(path) && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.linkedIssues)) return a;
      return Object.assign({}, a, { json: Object.assign({}, a.json, { linkedIssues: a.json.linkedIssues.map((x) => Object.assign({}, x, { followUp: summary(openOf(x.id)) })) }) });
    }
    const iss = /^\/api\/issues\/([^/]+)(?:\/(assign-as-task))?$/.exec(path);
    if (iss && iss[1] !== "requests") {
      const f = findings().find((x) => x.id === decodeURIComponent(iss[1]));
      if (!f) return null;
      if (iss[2] === "assign-as-task" && method === "POST") {
        sent("assign-as-task", { id: f.id, body });
        if (CLOSED.indexOf(f.status) >= 0) return base();
        return refuse(lang, 409, "issues.findingNoTask", { followUpPath: "/api/inspections/findings/" + f.id + "/follow-up" });
      }
      if (!iss[2] && method === "GET") {
        const a = base();
        if (m().scene.oldIssue || !a || a.status !== 200 || !a.json || !a.json.issue) return a;
        return Object.assign({}, a, { json: Object.assign({}, a.json, { issue: Object.assign({}, a.json.issue, { canAssign: false, followUp: view(openOf(f.id), lang) }) }) });
      }
    }
    if (/^\/api\/hr\/employee-folder\/[^/]+$/.test(path) && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || typeof a.json !== "object") return a;
      const uid = decodeURIComponent(path.split("/")[4]);
      const mine = followUps().filter((x) => x.ownerId === uid && !x.endedAt).sort((p, q) => (p.chosenAt < q.chosenAt ? 1 : -1));
      return Object.assign({}, a, { json: Object.assign({}, a.json, { findingFollowUps: mine.map((x) => {
        const f = findings().find((y) => y.id === x.issueId) || {};
        return Object.assign(view(x, lang), { finding: { id: x.issueId, title: f.title || null, foundAt: f.reportedAt || null, siteName: siteName(f.siteId) } });
      }) }) });
    }
    return null;
  }

  function route(method, path, query, body, lang, base) {
    if (/^\/api\/inspections\/findings(\/|$)/.test(path)) { const r = findingsRoute(method, path, query, body, lang, base); if (r) return r; }
    { const r = recordsRoute(method, path, query, body, lang, base); if (r) return r; }
    return base();
  }

  return {
    route,
    setScene: (o) => { Object.assign(m().scene, o || {}); },
    sent: () => m().sent,
    model: () => m(),
    followUps: () => followUps(),
    reset: () => { model = null; },
  };
};
