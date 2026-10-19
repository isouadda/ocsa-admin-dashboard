// What the API answers since its part 346 and part 352 (ocsa-api main 49262a3), for the dashboard's Round 2
// (part 353). audit/stubs.js lays it over every other answer on every run, since these are the API's rules
// as built: the HR file access log and its report, the two grants only the super admin makes, private floor
// plan links, the weak-PIN rule, a held sign-in, a pending end of employment, the refusal of a status the
// Employment card owns, a shift on approved time off, and a report day that is not a day. audit/stubs.js
// lays it over every other layer once a run arms it with setStep353, with log entries for the files the
// cases open; the people it seeds to be seen (a held account and its notice, a pending end, a day of
// approved time off) are there only while a run also arms setRound2People, so the other screens of a run
// stay as they were. Every value is invented.
"use strict";

module.exports = (ctx) => {
  const { seed, state, ok, created, clone, person, effectiveMap, PDF_BYTES, PNG_BYTES, docRows, plusDays } = ctx;
  let people = false;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const r2 = () => state.r2 || (state.r2 = { log: [], seq: 0, logDown: 0, signs: 0, seeded: false, plans: {} });
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const me = () => person();
  const meId = () => (me() && me().id) || null;
  const nameOf = (id) => { const p = (state.staff || seed.STAFF).find((x) => String(x.id) === String(id)) || Object.values(seed.PEOPLE).find((x) => String(x.id) === String(id)); return p ? (p.name || [p.firstName || p.first_name, p.lastName || p.last_name].filter(Boolean).join(" ")) : null; };
  // A capability as the API reads it: the super admin holds every one, and a key the stub's table does not
  // carry yet falls back to the role, as the API's defaults give it.
  const can = (key) => {
    const p = me();
    if (!p) return false;
    if (p.isSuperAdmin) return true;
    const map = effectiveMap(p, (state.overrides || {})[p.id]);
    if (Object.prototype.hasOwnProperty.call(map, key)) return !!map[key];
    if (p.role === "admin") return key !== "view_hr_access_report" && key !== "read_chat_records";
    return p.role === "supervisor" && (key === "manage_cases" || key === "manage_staff");
  };
  const management = () => !!me() && (me().isSuperAdmin || me().role === "admin" || me().role === "supervisor");

  // ---- the HR file access log (routes/hrFiles.js, helpers/hrFileAccess.js) --------------------------
  const KINDS = ["employee_document", "clearance_file", "certificate", "case_attachment", "discipline_pdf", "jotform_pdf", "access_report"];
  // The HR document a clearance names (certifications.document_id) is a clearance file.
  const CLEARANCE_DOCS = ["hd-5"];
  const nextAt = () => { r2().seq += 1; return new Date(Date.parse(seed.NOW_ISO) - 3600000 + r2().seq * 1000).toISOString(); };
  const write = (row) => { r2().log.push(Object.assign({ id: "h:" + String(r2().seq + 1).padStart(8, "0") + "-0000-4000-8000-000000000000" }, row, { at: row.at || nextAt() })); };
  const viewerOf = (p) => ({ id: p ? p.id : null, name: p ? (p.name || [p.firstName, p.lastName].filter(Boolean).join(" ")) : null, role: p ? p.role : null });
  // What a hand-out writes before the bytes go, or the refusal when the row cannot be written.
  const handOut = (lang, row) => {
    if (r2().logDown > 0) {
      r2().logDown -= 1;
      return bad(503, "hrFiles.logUnavailable", T(lang, "The file could not be opened just now. Try again in a minute.", "No se pudo abrir el archivo en este momento. Int\u00e9ntelo de nuevo en un minuto."));
    }
    write(Object.assign({ viewer: viewerOf(me()), action: "opened", reason: null, source: "hr_file_access_log" }, row));
    return null;
  };
  const docSubject = (id) => { const d = docRows().find((x) => String(x.id) === String(id)); return d ? d.user_id : null; };
  const bytesAnswer = (type, name) => ({ status: 200, bytes: type === "image/png" ? PNG_BYTES : PDF_BYTES, contentType: type, json: null, headers: { "Content-Disposition": 'inline; filename="' + name + '"', "Cache-Control": "no-store, must-revalidate" } });
  const mayOpen = (kind) => {
    if (kind === "employee_document" || kind === "clearance_file" || kind === "jotform_pdf") return can("read_hr_records");
    if (kind === "certificate") return management();
    if (kind === "case_attachment") return can("manage_cases");
    if (kind === "discipline_pdf") return management();
    return false;
  };
  const entryView = (e) => ({ at: e.at, viewer: e.viewer, action: e.action, reason: e.reason || null });
  // The seeded entries: an HR document opened twice and refused once, a clearance file opened once, and
  // enough certificate rows for the report to run past a page of 100; every other file has none.
  const seedLog = () => {
    if (r2().seeded) return;
    r2().seeded = true;
    const at = (minAgo) => new Date(Date.parse(seed.NOW_ISO) - minAgo * 60000).toISOString();
    const admin = seed.PEOPLE.admin, sup = seed.PEOPLE.supervisor;
    const row = (minAgo, viewer, kind, fileId, subjectId, category, action, reason) => r2().log.push({ id: "h:" + String(minAgo).padStart(8, "0") + "-1111-4000-8000-000000000000", at: at(minAgo), viewer: viewerOf(viewer), action, reason: reason || null, kind, fileId, subjectId, category, route: kind === "case_attachment" ? "GET /api/hr-cases/:id/updates/:updateId/files/:n" : "GET /api/jotform/employee-documents/:docId/file", ipAddress: "203.0.113.7", userAgent: "Audit browser", source: "hr_file_access_log" });
    row(300, admin, "employee_document", "hd-2", docSubject("hd-2"), "legal", "opened");
    row(420, sup, "employee_document", "hd-2", docSubject("hd-2"), "legal", "refused", "access.insufficientPermissions");
    row(1500, admin, "employee_document", "hd-2", docSubject("hd-2"), "legal", "opened");
    row(600, admin, "clearance_file", "hd-5", docSubject("hd-5"), "act34", "opened");
    for (let i = 0; i < 105; i += 1) row(2000 + i * 7, admin, "certificate", "ht-" + (1 + (i % 6)), seed.STAFF[4 + (i % 6)].id, "Chemical handling", "opened");
  };
  const b64 = (s) => Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64 = (s) => { try { return JSON.parse(Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")); } catch (e) { return null; } };
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const UUIDISH = /^[A-Za-z0-9_-]{1,64}$/;
  // The day a time falls on, on the company's clock.
  const companyDay = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: seed.TIMEZONE });
  function accessRoutes(method, path, query, lang) {
    if (path === "/api/hr-files/access" && method === "GET") {
      const kind = String(query.get("kind") || "").trim();
      const id = String(query.get("id") || "").trim();
      // The API holds every id but a case attachment's to a UUID; the stub's ids are its own, so any id
      // of letters, digits and dashes is taken, and a case attachment's is <updateId>/<n>.
      const idOk = kind === "case_attachment" ? /^[A-Za-z0-9_-]+\/[1-9][0-9]*$/.test(id) : UUIDISH.test(id);
      if (KINDS.indexOf(kind) < 0 || kind === "access_report" || !idOk) return bad(400, "hrFiles.badFile", T(lang, "Name a file kind and its id", "Indique el tipo de archivo y su identificador"), { keys: ["kind", "id"] });
      if (!mayOpen(kind)) return bad(404, "hrFiles.fileNotFound", T(lang, "File not found", "No se encontr\u00f3 el archivo"));
      const kinds = kind === "employee_document" || kind === "clearance_file" ? ["employee_document", "clearance_file"] : [kind];
      const rows = r2().log.filter((e) => kinds.indexOf(e.kind) >= 0 && String(e.fileId) === id).sort((a, b) => String(b.at).localeCompare(String(a.at)));
      return ok({ entries: rows.slice(0, 1000).map(entryView) });
    }
    if (path === "/api/hr-files/access/report" && method === "GET") {
      if (!can("view_hr_access_report")) return bad(403, "access.insufficientPermissions", T(lang, "Insufficient permissions", "No tiene permiso para hacer esto"), { capability: "view_hr_access_report" });
      const f = {};
      ["from", "to", "viewerId", "subjectId", "kind", "action", "format", "cursor"].forEach((k) => { const v = String(query.get(k) || "").trim(); if (v) f[k] = v; });
      const keys = [];
      if (f.from && !DAY.test(f.from)) keys.push("from");
      if (f.to && (!DAY.test(f.to) || (f.from && DAY.test(f.from) && f.from > f.to))) keys.push("to");
      if (f.viewerId && !UUIDISH.test(f.viewerId)) keys.push("viewerId");
      if (f.subjectId && !UUIDISH.test(f.subjectId)) keys.push("subjectId");
      if (f.kind && KINDS.indexOf(f.kind) < 0) keys.push("kind");
      if (f.action && ["opened", "refused"].indexOf(f.action) < 0) keys.push("action");
      if (f.format && f.format !== "csv") keys.push("format");
      const cur = f.cursor && f.format !== "csv" ? unb64(f.cursor) : null;
      if (f.cursor && f.format !== "csv" && !(Array.isArray(cur) && cur.length === 2)) keys.push("cursor");
      if (keys.length) return bad(400, "hrFiles.badFilter", T(lang, "Some filters are not valid", "Algunos filtros no son v\u00e1lidos"), { keys });
      let rows = r2().log.filter((e) => (!f.from || companyDay(e.at) >= f.from) && (!f.to || companyDay(e.at) <= f.to)
        && (!f.viewerId || String(e.viewer && e.viewer.id) === f.viewerId) && (!f.subjectId || String(e.subjectId) === f.subjectId)
        && (!f.kind || e.kind === f.kind) && (!f.action || e.action === f.action));
      rows.sort((a, b) => String(b.at).localeCompare(String(a.at)) || String(b.id).localeCompare(String(a.id)));
      const view = (e) => Object.assign(entryView(e), { id: e.id, subject: e.subjectId ? { id: e.subjectId, name: nameOf(e.subjectId) } : null, kind: e.kind, fileId: e.fileId || null, category: e.category || null, route: e.route, ipAddress: e.ipAddress || null, userAgent: e.userAgent || null, source: e.source || "hr_file_access_log" });
      if (f.format === "csv") {
        const all = rows.slice(0, 50000).map(view);
        const filters = Object.keys(f).filter((k) => k !== "format" && k !== "cursor").map((k) => k + "=" + f[k]).join(" ");
        const refused = handOut(lang, { kind: "access_report", fileId: null, subjectId: null, category: "csv" + (filters ? " " + filters : ""), route: "GET /api/hr-files/access/report" });
        if (refused) return refused;
        const cell = (v) => { let s = v == null ? "" : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
        const head = ["at", "viewer_id", "viewer_name", "viewer_role", "action", "reason", "kind", "file_id", "category", "subject_id", "subject_name", "route", "ip_address", "user_agent", "source"];
        const lines = [head.join(",")].concat(all.map((e) => [e.at, e.viewer.id, e.viewer.name, e.viewer.role, e.action, e.reason, e.kind, e.fileId, e.category, e.subject && e.subject.id, e.subject && e.subject.name, e.route, e.ipAddress, e.userAgent, e.source].map(cell).join(",")));
        return { status: 200, json: null, bytes: Buffer.from("\ufeff" + lines.join("\r\n") + "\r\n", "utf8"), contentType: "text/csv; charset=utf-8", headers: { "Content-Disposition": 'attachment; filename="hr-file-access.csv"', "Access-Control-Expose-Headers": "Content-Disposition" } };
      }
      if (cur) rows = rows.filter((e) => String(e.at) < String(cur[0]) || (String(e.at) === String(cur[0]) && String(e.id) < String(cur[1])));
      const page = rows.slice(0, 100);
      const more = rows.length > 100;
      return ok({ entries: page.map(view), nextCursor: more ? b64(JSON.stringify([page[page.length - 1].at, page[page.length - 1].id])) : null });
    }
    return null;
  }
  // The routes that hand out a private HR file, each logged before its bytes go.
  function fileRoutes(method, path, query, body, lang, base) {
    let m = /^\/api\/jotform\/employee-documents\/([^/]+)\/file$/.exec(path);
    if (m && method === "GET") {
      const id = decodeURIComponent(m[1]);
      if (!can("read_hr_records")) return bad(403, "access.insufficientPermissions", T(lang, "Insufficient permissions", "No tiene permiso para hacer esto"), { capability: "read_hr_records" });
      const doc = docRows().find((x) => String(x.id) === id);
      const refused = handOut(lang, { kind: CLEARANCE_DOCS.indexOf(id) >= 0 ? "clearance_file" : "employee_document", fileId: id, subjectId: docSubject(id), category: doc ? doc.category : null, route: "GET /api/jotform/employee-documents/:docId/file" });
      return refused || bytesAnswer("application/pdf", (doc && doc.file_name) || "document.pdf");
    }
    m = /^\/api\/jotform\/submissions\/([^/]+)\/pdf$/.exec(path);
    if (m && method === "GET") {
      const refused = handOut(lang, { kind: "jotform_pdf", fileId: decodeURIComponent(m[1]), subjectId: null, category: null, route: "GET /api/jotform/submissions/:id/pdf" });
      return refused || base();
    }
    m = /^\/api\/hr\/training\/([^/]+)\/certificate$/.exec(path);
    if (m && method === "GET") {
      const refused = handOut(lang, { kind: "certificate", fileId: decodeURIComponent(m[1]), subjectId: null, category: null, route: "GET /api/hr/training/:recordId/certificate" });
      return refused || base();
    }
    m = /^\/api\/hr-cases\/([^/]+)\/updates\/([^/]+)\/files\/(\d+)$/.exec(path);
    if (m && method === "GET") {
      const refused = handOut(lang, { kind: "case_attachment", fileId: decodeURIComponent(m[2]) + "/" + m[3], subjectId: null, category: null, route: "GET /api/hr-cases/:id/updates/:updateId/files/:n" });
      return refused || base();
    }
    m = /^\/api\/discipline\/([^/]+)\/pdf$/.exec(path);
    if (m && method === "GET") {
      const refused = handOut(lang, { kind: "discipline_pdf", fileId: decodeURIComponent(m[1]), subjectId: null, category: null, route: "GET /api/discipline/:id/pdf" });
      if (refused) return refused;
      const a = base();
      return a && a.bytes ? a : bytesAnswer("application/pdf", "warning.pdf");
    }
    m = /^\/api\/discipline\/([^/]+)\/deliver$/.exec(path);
    if (m && method === "POST" && body && body.method === "email") {
      const refused = handOut(lang, { kind: "discipline_pdf", fileId: decodeURIComponent(m[1]), subjectId: null, category: null, route: "POST /api/discipline/:id/deliver" });
      if (refused) return refused;
    }
    return null;
  }

  // ---- the grants only the super admin makes (routes/users.js SUPER_ADMIN_GRANTS) -------------------
  const SUPER_GRANTS = { read_chat_records: ["users.chatRecordsGrant", "Only the super admin can grant or remove access to chat records", "Solo el superadministrador puede dar o quitar el acceso a los registros del chat"],
    view_hr_access_report: ["users.hrAccessReportGrant", "Only the super admin can grant or remove access to the HR file access report", "Solo el superadministrador puede dar o quitar el acceso al informe de acceso a los archivos de RR. HH."] };
  // The two grants as the API's catalog names them (middleware/capabilities.js), held by no role.
  const GRANT_ROWS = [
    { key: "read_chat_records", label: "Read chat records", group: "Administration", enforced: true, defaults: { admin: false, supervisor: false, staff: false } },
    { key: "view_hr_access_report", label: "Read the HR file access report", group: "Administration", enforced: true, defaults: { admin: false, supervisor: false, staff: false } },
  ];
  function permissionRoutes(method, path, body, lang, base) {
    const m = /^\/api\/users\/([^/]+)\/permissions$/.exec(path);
    if (!m) return null;
    if (m[1] === "me") {
      if (method !== "GET") return null;
      const a = base();
      if (!a || !a.json || !a.json.capabilities || typeof a.json.capabilities !== "object") return a;
      const own = (state.overrides || {})[meId()] || {};
      const caps = Object.assign({}, a.json.capabilities);
      GRANT_ROWS.forEach((c) => { if (!Object.prototype.hasOwnProperty.call(caps, c.key) || me().isSuperAdmin) caps[c.key] = !!me().isSuperAdmin || own[c.key] === true; });
      a.json = Object.assign({}, a.json, { capabilities: caps });
      return a;
    }
    const id = decodeURIComponent(m[1]);
    const target = (state.staff || []).find((x) => String(x.id) === id) || Object.values(seed.PEOPLE).find((x) => String(x.id) === id);
    if (method === "GET") {
      const a = base();
      if (a && a.json && typeof a.json === "object") {
        const list = Array.isArray(a.json.capabilities) ? a.json.capabilities.slice() : [];
        GRANT_ROWS.forEach((c) => { if (!list.some((x) => x && x.key === c.key)) list.push(c); });
        const ov = a.json.overrides || {};
        const effective = Object.assign({}, a.json.effective || {});
        GRANT_ROWS.forEach((c) => { effective[c.key] = !!(target && target.isSuperAdmin) || ov[c.key] === true; });
        a.json = Object.assign({}, a.json, { capabilities: list, effective, isSuperAdmin: !!(target && target.isSuperAdmin) });
      }
      return a;
    }
    if (method !== "PUT" || !target) return null;
    const incoming = (body && body.permissions && typeof body.permissions === "object") ? body.permissions : {};
    const before = (state.overrides || {})[id] || {};
    const onlyGrants = Object.keys(incoming).length > 0 && Object.keys(incoming).every((k) => Object.prototype.hasOwnProperty.call(SUPER_GRANTS, k));
    const superAdmin = !!(me() && me().isSuperAdmin);
    if (target.role === "admin" && !(superAdmin && onlyGrants)) return bad(403, "users.adminPermissions", T(lang, "Admin permissions cannot be changed through this route", "Los permisos de un administrador no se cambian por esta v\u00eda"));
    for (const key of Object.keys(SUPER_GRANTS)) {
      if (!Object.prototype.hasOwnProperty.call(incoming, key)) continue;
      if (!!incoming[key] === (before[key] === true)) continue;
      if (!superAdmin) return bad(403, SUPER_GRANTS[key][0], T(lang, SUPER_GRANTS[key][1], SUPER_GRANTS[key][2]));
    }
    if (target.role === "admin") {
      if (!state.overrides) state.overrides = {};
      const merged = Object.assign({}, before);
      Object.keys(incoming).forEach((k) => { merged[k] = !!incoming[k]; });
      state.overrides[id] = merged;
      const effective = effectiveMap(target, merged);
      GRANT_ROWS.forEach((c) => { effective[c.key] = !!target.isSuperAdmin || merged[c.key] === true; });
      return ok({ user_id: id, role: target.role, overrides: merged, effective });
    }
    return null;
  }

  // ---- floor plans (helpers/floorPlans.js): a link signed for ten minutes when it is read ------------
  const signed = (p) => { r2().signs += 1; return "https://storage.example.invalid/storage/v1/object/sign/site-floor-plans/" + encodeURIComponent(p) + "?token=t" + r2().signs; };
  const planPath = (fp) => r2().plans[fp.id] || (fp.file_url && /site-floor-plans\/([^?]+)/.exec(fp.file_url) ? decodeURIComponent(/site-floor-plans\/([^?]+)/.exec(fp.file_url)[1]) : "plan-" + fp.id + ".pdf");
  function floorPlanRoutes(method, path, query, body, lang, base) {
    if (/^\/api\/sites\/profile\/[^/]+$/.test(path) && method === "GET") {
      const a = base();
      if (a && a.json && Array.isArray(a.json.floorPlans)) a.json = Object.assign({}, a.json, { floorPlans: a.json.floorPlans.map((fp) => Object.assign({}, fp, { file_url: signed(planPath(fp)) })) });
      return a;
    }
    if (path === "/api/uploads" && query.get("bucket") === "site-floor-plans" && method === "POST") {
      if (!can("manage_sites")) return bad(403, "access.insufficientPermissions", T(lang, "Insufficient permissions", "No tiene permiso para hacer esto"), { capability: "manage_sites" });
      r2().signs += 1;
      const p = "plan-" + Date.parse(seed.NOW_ISO) + "-" + String(r2().signs).padStart(6, "0") + "." + (query.get("ext") || "pdf");
      return ok({ url: signed(p), path: p, type: "document", fileName: p, contentType: "application/pdf" });
    }
    const m = /^\/api\/sites\/([^/]+)\/floor-plans$/.exec(path);
    if (m && method === "POST") {
      const fileUrl = String((body && body.fileUrl) || "").trim();
      if (!fileUrl) return bad(400, "sites.fileUrlRequired", T(lang, "File URL is required", "Se requiere la URL del archivo"));
      const hit = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/site-floor-plans\/([^?]+)/.exec(fileUrl);
      const p = hit ? decodeURIComponent(hit[1]) : /^plan-[A-Za-z0-9.-]+$/.test(fileUrl) ? fileUrl : null;
      if (!p) return bad(400, "sites.floorPlanFileInvalid", T(lang, "That file is not one of the uploaded floor plans", "Ese archivo no es uno de los planos subidos"));
      if (!state.floorPlans) state.floorPlans = {};
      const siteId = decodeURIComponent(m[1]);
      const list = state.floorPlans[siteId] || (state.floorPlans[siteId] = []);
      const fp = { id: "fp-r2-" + (list.length + 1), site_id: siteId, label: (body && body.label) || "Floor Plan", file_url: "", uploaded_at: seed.NOW_ISO, is_active: true };
      r2().plans[fp.id] = p;
      list.unshift(fp);
      return created({ floorPlan: Object.assign({}, fp, { file_url: signed(p) }), message: "Floor plan uploaded" });
    }
    return null;
  }

  // ---- the Round 2 items (part 346) -------------------------------------------------------------------
  const isWeakPin = (pin, badge) => {
    const s = String(pin);
    if (/^(\d)\1{3}$/.test(s)) return true;
    const d = s.split("").map(Number);
    if (d.every((n, i) => i === 0 || n === d[i - 1] + 1) || d.every((n, i) => i === 0 || n === d[i - 1] - 1)) return true;
    return !!badge && (s === String(badge) || s === String(badge).slice(-4));
  };
  // The days a person has approved time off, as the API reads them (helpers/timeOffShifts.js): every
  // day of an approved request.
  const leaveDays = (userId) => {
    const rows = (state.timeOff || []).concat(state.timeOff ? [] : (ctx.TIME_OFF || []));
    const out = [];
    rows.filter((r) => r && r.status === "approved" && String(r.userId) === String(userId)).forEach((r) => {
      for (let d = r.startsOn; d && d <= r.endsOn; d = plusDays(d, 1)) out.push(d);
    });
    return out;
  };
  const leaveWords = (lang, days) => {
    const fmt = (d) => new Date(d + "T12:00:00Z").toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: lang === "es" ? "long" : "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    return T(lang, "This person has approved time off on " + days.map(fmt).join(", ") + ".", "Esta persona tiene tiempo libre aprobado: " + days.map(fmt).join(", ") + ".");
  };
  function round2Routes(method, path, query, body, lang, base) {
    const b = body || {};
    // A supervisor reads no private line (helpers/chatAccess.js readsPrivateLines).
    if (path === "/api/chat/dm-inbox" && method === "GET" && me() && !me().isSuperAdmin && me().role !== "admin") return ok([]);
    if (path === "/api/chat/staff-line" && method === "POST") {
      if (me() && !me().isSuperAdmin && me().role === "supervisor") return bad(403, "chat.staffLineAdminsOnly", T(lang, "Only admins can open a person's private line.", "Solo los administradores pueden abrir la l\u00ednea privada de una persona."));
      return null;
    }
    // Reset PIN: four digits, then the weak-PIN rule against the person's badge.
    const rp = /^\/api\/users\/([^/]+)\/reset-pin$/.exec(path);
    if (rp && method === "POST") {
      const pin = String(b.newPin == null ? "" : b.newPin);
      if (!/^\d{4}$/.test(pin)) return bad(400, "auth.pinFormat", T(lang, "PIN must be exactly 4 digits", "El PIN debe tener exactamente 4 d\u00edgitos"));
      const who = (state.staff || []).find((x) => String(x.id) === decodeURIComponent(rp[1]));
      if (isWeakPin(pin, who && (who.badge_number || who.badgeNumber))) return bad(400, "PIN_WEAK", T(lang, "Choose a PIN that is not repeated digits, a sequence, or your badge number", "Elija un PIN que no sea un mismo d\u00edgito repetido, una secuencia ni su n\u00famero de empleado"));
      return null;
    }
    // A status the Employment card owns (routes/users.js, users.useEmployment).
    const pu = /^\/api\/users\/([^/]+)$/.exec(path);
    if (pu && (method === "PATCH" || method === "PUT") && Object.prototype.hasOwnProperty.call(b, "status")) {
      const who = (state.staff || []).find((x) => String(x.id) === decodeURIComponent(pu[1]));
      const from = who ? who.status : null;
      if (who && b.status !== from && from !== "pending" && (b.status === "terminated" || b.status === "inactive" || from === "terminated")) {
        return bad(409, "users.useEmployment", T(lang, "Change this status with End employment, Leave, Return or Rehire on the person's Employment card, so the reason, the last day and their sites and work move with it.", "Cambie este estado con Terminar empleo, Licencia, Regreso o Recontratar en la tarjeta de Empleo de la persona, para que el motivo, el \u00faltimo d\u00eda y sus sitios y trabajo cambien con \u00e9l."), { keys: ["status"] });
      }
      return null;
    }
    // An end with a last day ahead waits (helpers/employment.js).
    const end = /^\/api\/users\/([^/]+)\/employment\/end$/.exec(path);
    if (end && method === "POST" && b.lastDay && b.lastDay > seed.TODAY) {
      const id = decodeURIComponent(end[1]);
      const pendingEnd = { eventId: "ee-r2-" + id, lastDay: b.lastDay, takesEffectOn: plusDays(b.lastDay, 1) };
      if (!state.r2pending) state.r2pending = {};
      state.r2pending[id] = Object.assign({ reason: b.reason || null, reasonLabel: b.reason || null }, pendingEnd);
      return ok({ changed: false, employment: null, assignmentsEnded: 0, pendingEnd, released: null, openProperty: [] });
    }
    const emp = /^\/api\/users\/([^/]+)\/employment$/.exec(path);
    if (emp && method === "GET") {
      const id = decodeURIComponent(emp[1]);
      const a = base();
      const waiting = (state.r2pending || {})[id] || null;
      // A person the stub keeps no employment for answers the API's bare shape while an end waits.
      const who = (state.staff || []).find((x) => String(x.id) === id);
      const bare = waiting && who ? { status: who.status, hireDate: who.hire_date || null, terminationDate: null, current: null, events: [], pastSites: [], openProperty: [] } : null;
      if (!a) return bare ? ok(Object.assign(bare, { pendingEnd: waiting })) : a;
      if (a.status !== 200 || !a.json || typeof a.json !== "object") return a;
      const shape = Array.isArray(a.json.events) ? a.json : bare || a.json;
      a.json = Object.assign({}, shape, { pendingEnd: waiting });
      return a;
    }
    // A shift on a day of approved time off (routes/schedule.js, schedule.onLeave).
    if ((path === "/api/schedule" && method === "POST") || (/^\/api\/schedule\/[^/]+$/.test(path) && method === "PATCH" && path !== "/api/schedule/bulk")) {
      const userId = b.user_id || b.userId;
      const day = b.scheduled_date || b.scheduledDate;
      if (userId && day) {
        const hit = leaveDays(userId).filter((d) => d === day);
        if (hit.length) return bad(409, "schedule.onLeave", leaveWords(lang, hit), { dates: hit });
      }
      return null;
    }
    // A pattern skips a day of approved time off (helpers/shiftPatterns.js, patterns.skippedOnLeave).
    if (path === "/api/schedule/patterns" && method === "POST") {
      const a = base();
      const days = leaveDays(b.userId);
      if (!a || !a.json || !days.length) return a;
      const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const on = days.filter((d) => d >= (b.startsOn || seed.TODAY) && (b.days || []).indexOf(keys[new Date(d + "T12:00:00Z").getUTCDay()]) >= 0);
      if (!on.length) return a;
      const skipped = (Array.isArray(a.json.skipped) ? a.json.skipped : []).concat(on.map((d) => ({ date: d, reason: "on approved time off", code: "patterns.skippedOnLeave" })));
      a.json = Object.assign({}, a.json, { skipped, skippedCount: skipped.length, created: Math.max(0, (Number(a.json.created) || 0) - on.length) });
      return a;
    }
    // A report day that is not a day (helpers/workingDays.js, reports.badDay).
    if (method === "GET" && /^\/api\/(reports\/(hours|task-completion|issues|chemical-usage)|report-engine\/(issue-timing|supply-usage))$/.test(path)) {
      const keys = ["start_date", "end_date"].filter((k) => query.get(k) && !DAY.test(String(query.get(k))));
      if (keys.length) return bad(400, "reports.badDay", T(lang, "Check the dates: each is a day, as YYYY-MM-DD", "Revise las fechas: cada una es un d\u00eda, como AAAA-MM-DD"), { keys });
      return null;
    }
    return null;
  }

  // What setRound2People seeds to be seen: a held account and its notice, a pending end and a day of
  // approved time off, laid in once.
  function seedPeople() {
    if (state.r2people) return;
    state.r2people = true;
    const held = ctx.si283().people["u-staff-9"] || (ctx.si283().people["u-staff-9"] = {});
    held.heldSince = new Date(Date.parse(seed.NOW_ISO) - 95 * 60000).toISOString();
    if (!state.notifications) state.notifications = clone(ctx.NOTIFICATIONS);
    state.notifications.unshift({ id: "n-r2-held", title: "Sign-in locked for Yuki Tanabe", body: "The account of Yuki Tanabe was locked 3 times today after wrong tries. It stays locked until the office unlocks it or the person resets their PIN by email.", subjectType: "sign_in_held", subjectId: "u-staff-9", link: "#staff", createdAt: new Date(Date.parse(seed.NOW_ISO) - 95 * 60000).toISOString(), readAt: null });
    if (!state.r2pending) state.r2pending = {};
    state.r2pending["u-staff-5"] = { eventId: "ee-r2-u-staff-5", lastDay: plusDays(seed.TODAY, 5), takesEffectOn: plusDays(seed.TODAY, 6), reason: "resigned", reasonLabel: "Resigned" };
    if (!state.timeOff) state.timeOff = clone(ctx.TIME_OFF);
    state.timeOff.push({ id: "to-r2", userId: "u-staff-6", userName: "Ngozi Okonkwo", leaveType: "vacation", leaveTypeLabel: "Vacation", startsOn: seed.TODAY, endsOn: plusDays(seed.TODAY, 2), partDay: false, hours: 24, status: "approved", reason: "", createdAt: seed.shift(-3) + "T14:00:00Z", affectedShifts: [] });
  }

  return {
    route(method, path, query, body, lang, base) {
      seedLog();
      if (people) seedPeople();
      return accessRoutes(method, path, query, lang)
        || fileRoutes(method, path, query, body, lang, base)
        || permissionRoutes(method, path, body, lang, base)
        || floorPlanRoutes(method, path, query, body, lang, base)
        || round2Routes(method, path, query, body, lang, base)
        || base();
    },
    setPeople: (v) => { people = v !== false; },
    setLogDown: (n) => { r2().logDown = n == null ? 1 : Number(n) || 0; },
    log: () => r2().log.slice(),
  };
};
