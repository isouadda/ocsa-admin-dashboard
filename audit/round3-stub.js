// What the API answers since its Rounds 3 and 4 (parts 357 and 360, ocsa-api main a1e7e58), for the
// dashboard's part 364. audit/stubs.js lays it over every other layer once a run arms it with setStep364,
// and it answers each route the way the API's code at a1e7e58 does:
//
//   GET /api/clearances                 documentId on act34, act151, fbi and act168, the HR Records
//                                       document the record names or null, for a reader holding
//                                       read_hr_records; none for anyone else (helpers/clearances.js
//                                       clearanceView, act168View, statusAndDates)
//   POST /api/users/:id/employment/pending-end/cancel
//                                       { pendingEnd: null, employment } with the end marked cancelled
//                                       and an end_cancelled event naming it (helpers/employment.js
//                                       cancelPendingEnd, eventView), else 409 employment.noPendingEnd
//   GET /api/hr-cases/:id               formResponseId, the report a case was opened from (part 360)
//   POST /api/hr-cases                  400 speakUp.reportNotReadable for a report the caller may not read
//   GET /api/users/profile/:id and /api/users/:id
//                                       the personal keys left out for a reader the rank rule holds back
//                                       (routes/users.js withoutPersonal)
//
// and, once a run arms setFindings364, what main still answers that the dashboard's half of a finding
// meets: a service whose category code no table names (API-99), an issue's photos stored as they were
// sent, a javascript: one, a //host one and a signed https one (API-68, API-119), an HR document stored
// under the type its uploader claimed, text/html (API-103), the newest 200 cases and 500 warnings with
// nothing more said (API-100), and a signature request made at 9:30 PM in the office, after midnight UTC
// (API-96). The refusals of section 2 are the stub's own setRefusal, in the API's words.
//
// Every value is invented. The words are the API's helpers/words.js English and Spanish.
"use strict";

module.exports = (ctx) => {
  const { seed, state, ok, clone, person, effectiveMap, plusDays, PDF_BYTES } = ctx;
  let findings = false;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const r3 = () => state.r3 || (state.r3 = { cancelled: {}, pending: null, sent: [], raceTakeBack: false, unreadable: [] });
  const me = () => person();
  // A capability as the API reads it: the super admin holds every one, and a key the stub's table does
  // not carry falls back to the role's default.
  const can = (key) => {
    const p = me();
    if (!p) return false;
    if (p.isSuperAdmin) return true;
    const map = effectiveMap(p, (state.overrides || {})[p.id]);
    if (Object.prototype.hasOwnProperty.call(map, key)) return !!map[key];
    if (key === "manage_admins") return false;
    if (p.role === "admin") return true;
    return p.role === "supervisor" && (key === "manage_cases" || key === "manage_staff");
  };
  const say = (lang, key) => {
    const W = {
      "employment.noPendingEnd": ["This person has no employment end waiting to take effect.", "Esta persona no tiene un fin de empleo pendiente de entrar en vigor."],
      "speakUp.reportNotReadable": ["Choose a report you can read, or open the case without one", "Elija un reporte que pueda leer, o abra el caso sin uno"],
    };
    return T(lang, W[key][0], W[key][1]);
  };

  // ---- clearances: the file each record names (part 357) -------------------------------------------
  // u-staff-5's and u-staff-6's Act 34 were recorded with HR Records' hd-5 and hd-6, documents of
  // theirs; every other record was entered with no file.
  const FILES = { "u-staff-5:act34": "hd-5", "u-staff-6:act34": "hd-6" };
  function clearanceRoutes(method, path, query, body, lang, base) {
    if (path === "/api/clearances" && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.people)) return a;
      const files = can("read_hr_records");
      a.json = Object.assign({}, a.json, { people: a.json.people.map((p0) => {
        const p = clone(p0);
        ["act34", "act151", "fbi", "act168"].forEach((k) => {
          if (!p[k] || typeof p[k] !== "object") return;
          if (files) p[k].documentId = (p[k].certificationId || p[k].reviewId) ? (FILES[p.userId + ":" + k] || null) : null;
          else delete p[k].documentId;
        });
        return p;
      }) });
      return a;
    }
    const put = /^\/api\/users\/([^/]+)\/(clearances\/(act34|act151|fbi)|act168)$/.exec(path);
    if (put && (method === "PUT" || method === "POST")) r3().sent.push({ path, body: clone(body || {}) });
    return null;
  }

  // ---- taking back an end that waits for its day (part 357) ----------------------------------------
  // u-staff-5 holds an end recorded with a last day five days ahead, until a run takes it back.
  const PENDING_ID = "u-staff-5";
  const endEvent = (lang) => ({
    id: "ee-r3-end", kind: "ended", reason: "resigned", reasonLabel: T(lang, "Resigned", "Renuncia"),
    lastDay: plusDays(seed.TODAY, 5), expectedReturn: null, rehireEligible: true, note: null,
    statusBefore: "active", statusAfter: "terminated", recordedBy: { name: "Dana Whitlock" },
    recordedAt: seed.shift(-2) + "T15:00:00.000Z", takesEffectOn: plusDays(seed.TODAY, 6), tookEffectAt: null,
    waiting: true, cancelled: null, cancelledEnd: null,
  });
  const history = (lang, a) => {
    const c = r3().cancelled[PENDING_ID] || null;
    const end = endEvent(lang);
    const events = [];
    if (c) {
      end.waiting = false;
      end.cancelled = { eventId: "ee-r3-cancel", at: c.at, by: { name: c.by } };
      events.push({ id: "ee-r3-cancel", kind: "end_cancelled", reason: null, reasonLabel: null, lastDay: null, expectedReturn: null, rehireEligible: null, note: null,
        statusBefore: "active", statusAfter: "active", recordedBy: { name: c.by }, recordedAt: c.at, takesEffectOn: null, tookEffectAt: null, waiting: false, cancelled: null,
        cancelledEnd: { eventId: end.id, lastDay: end.lastDay, takesEffectOn: end.takesEffectOn, reason: end.reason, reasonLabel: end.reasonLabel } });
    }
    events.push(end);
    const was = a && a.json && Array.isArray(a.json.events) ? a.json.events : [];
    return Object.assign({ status: "active", hireDate: "2025-03-01", terminationDate: null, current: null, pastSites: [], openProperty: [] }, a && a.json && typeof a.json === "object" ? a.json : {}, {
      events: events.concat(was),
      pendingEnd: c ? null : { eventId: end.id, lastDay: end.lastDay, takesEffectOn: end.takesEffectOn, reason: end.reason, reasonLabel: end.reasonLabel },
    });
  };
  function employmentRoutes(method, path, query, body, lang, base) {
    if (path === "/api/users/" + PENDING_ID + "/employment" && method === "GET") {
      if (!can("manage_staff") && !can("read_hr_records")) return null;
      return ok(history(lang, base()));
    }
    const cancel = /^\/api\/users\/([^/]+)\/employment\/pending-end\/cancel$/.exec(path);
    if (cancel && method === "POST") {
      if (!can("manage_employment")) return bad(403, "access.insufficientPermissions", T(lang, "You do not have permission to do this.", "No tiene permiso para hacer esto."), { capability: "manage_employment" });
      const id = decodeURIComponent(cancel[1]);
      // Someone else took it back a moment before: the API answers 409, and the history shows theirs.
      if (id === PENDING_ID && r3().raceTakeBack && !r3().cancelled[id]) {
        r3().cancelled[id] = { at: new Date(Date.parse(seed.NOW_ISO) - 60000).toISOString(), by: "Oyelaran Adebayo" };
        return bad(409, "employment.noPendingEnd", say(lang, "employment.noPendingEnd"));
      }
      if (id !== PENDING_ID || r3().cancelled[id]) return bad(409, "employment.noPendingEnd", say(lang, "employment.noPendingEnd"));
      const p = me();
      r3().cancelled[id] = { at: seed.NOW_ISO, by: p ? (p.name || [p.firstName, p.lastName].filter(Boolean).join(" ")) : "" };
      return ok({ pendingEnd: null, employment: history(lang, null) });
    }
    return null;
  }

  // ---- a case's report (part 360, finding API-90) --------------------------------------------------
  // hc-2 was opened from the Step 327 incident report, which this reader may read; hc-3 from a report
  // nobody here may read, whose read answers 404.
  const CASE_REPORT = { "hc-2": "fr-incident-327", "hc-3": "fr-r3-unreadable" };
  function caseRoutes(method, path, query, body, lang, base) {
    const one = /^\/api\/hr-cases\/([^/]+)$/.exec(path);
    if (one && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || typeof a.json !== "object") return a;
      a.json = Object.assign({}, a.json, { formResponseId: CASE_REPORT[decodeURIComponent(one[1])] || null });
      return a;
    }
    if (path === "/api/forms/responses/fr-r3-unreadable" && method === "GET") return bad(404, "forms.notFound", T(lang, "Report not found", "Reporte no encontrado"));
    if (path === "/api/hr-cases" && method === "POST") {
      const b = body || {};
      r3().sent.push({ path, body: clone(b) });
      if (b.formResponseId && r3().unreadable.indexOf(String(b.formResponseId)) >= 0) return bad(400, "speakUp.reportNotReadable", say(lang, "speakUp.reportNotReadable"));
    }
    return null;
  }

  // ---- personal details between admins (part 360, finding API-74) -----------------------------------
  const PERSONAL = ["birthday", "addressLine1", "addressLine2", "city", "state", "zipCode", "emergencyContactName", "emergencyContactPhone", "personalNotes"];
  const rank = (role) => (role === "admin" ? 2 : role === "supervisor" ? 1 : 0);
  const heldBack = (target) => {
    const p = me();
    if (!p || !target || String(p.id) === String(target.id)) return false;
    return rank(target.role) >= rank(p.role) && !can("manage_admins");
  };
  function profileRoutes(method, path, query, body, lang, base) {
    if (method !== "GET" || !(/^\/api\/users\/profile\/[^/]+$/.test(path) || (/^\/api\/users\/[^/]+$/.test(path) && path !== "/api/users/me"))) return null;
    const a = base();
    if (!a || a.status !== 200 || !a.json || !a.json.user || !heldBack(a.json.user)) return a;
    const user = Object.assign({}, a.json.user);
    PERSONAL.forEach((k) => { delete user[k]; });
    a.json = Object.assign({}, a.json, { user });
    return a;
  }

  // ---- what the dashboard's half of a finding meets (setFindings364) --------------------------------
  const HTML_BYTES = Buffer.from("<!doctype html><title>x</title><p>A file stored as a page.</p>", "utf8");
  const ISSUE_PHOTOS = [
    { id: "ip-r3-1", url: "javascript:alert(1)" },
    { id: "ip-r3-2", url: "//files.example.invalid/a.jpg" },
    { id: "ip-r3-3", url: "https://storage.example.invalid/object/sign/issue-photos/b.jpg?token=t" },
  ];
  function findingRoutes(method, path, query, body, lang, base) {
    if (!findings || method !== "GET") return null;
    if (path === "/api/services") {
      const a = base();
      if (a && a.status === 200 && Array.isArray(a.json)) a.json = a.json.concat([{ id: "sv-r3", name: "Window film care", slug: "window-film-care", description: "Clean and check window film.", required_certifications: "", cims_category: "ZZ", linked_sites: 0, linked_site_count: 0, is_active: true }]);
      return a;
    }
    if (path === "/api/issues/i-1/photos") return ok(ISSUE_PHOTOS.map((p) => ({ id: p.id, issue_id: "i-1", photo_url: p.url, uploaded_at: seed.shift(-1) + "T15:00:00.000Z" })));
    if (path === "/api/jotform/employee-documents/hd-1/file") {
      if (!can("read_hr_records")) return null;
      return { status: 200, bytes: HTML_BYTES, contentType: "text/html", json: null, headers: { "Content-Disposition": 'inline; filename="doc-1.pdf"', "Cache-Control": "no-store, must-revalidate" } };
    }
    if (path === "/api/hr-cases") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.cases) || !a.json.cases.length) return a;
      const first = a.json.cases[0];
      const cases = Array.from({ length: 200 }, (_, i) => Object.assign(clone(first), { id: "hc-r3-" + (i + 1), reference: "CASE-" + String(1000 - i).padStart(4, "0"), createdAt: new Date(Date.parse(seed.NOW_ISO) - (i + 1) * 3600000).toISOString() }));
      a.json = Object.assign({}, a.json, { cases });
      return a;
    }
    if (path === "/api/discipline") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.warnings) || !a.json.warnings.length) return a;
      const first = a.json.warnings[0];
      const warnings = Array.from({ length: 500 }, (_, i) => Object.assign(clone(first), { id: "dw-r3-" + (i + 1) }));
      a.json = Object.assign({}, a.json, { warnings, limit: 500 });
      return a;
    }
    if (path === "/api/signatures") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.requests) && a.json.requests.length) {
        const requests = a.json.requests.map((r, i) => (i === 0 ? Object.assign({}, r, { requestedAt: seed.NOW_ISO }) : r));
        a.json = Object.assign({}, a.json, { requests });
      }
      return a;
    }
    return null;
  }

  return {
    route(method, path, query, body, lang, base) {
      return findingRoutes(method, path, query, body, lang, base)
        || clearanceRoutes(method, path, query, body, lang, base)
        || employmentRoutes(method, path, query, body, lang, base)
        || caseRoutes(method, path, query, body, lang, base)
        || profileRoutes(method, path, query, body, lang, base)
        || base();
    },
    sent: () => r3().sent.slice(),
    setRaceTakeBack: (v) => { r3().raceTakeBack = v !== false; },
    setUnreadable: (ids) => { r3().unreadable = (ids || []).map(String); },
    setFindings: (v) => { findings = v !== false; },
    // A capability taken off one account, the way an override does it.
    setCapabilityOff: (userId, key) => { if (!state.overrides) state.overrides = {}; state.overrides[userId] = Object.assign({}, state.overrides[userId] || {}, { [key]: false }); },
    ISSUE_PHOTOS,
  };
};
