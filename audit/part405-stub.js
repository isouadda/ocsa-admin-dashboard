// What the dashboard's part 405 (Round 13) needs of the stub beyond the API as built at ocsa-api main d84a449 (#166),
// which answers every route this round reads as the layers under it answer them: routes/issues.js GET /:id ({ issue }),
// PATCH /:id ({ status } from PATCH_STATUSES), GET /requests/:id ({ request, activity, assignees }) and PATCH
// /:id/request ({ route, absorbedMinutes }), and routes/chat.js GET /dm-inbox (staffUserId on each thread) and GET
// /channels/:channelId/messages (senderId, senderName and senderRole on each message). audit/stubs.js lays it over
// the part400 stub and every layer under it, in every run. Nothing here changes what the API answers; each scene
// only shapes when it answers or what someone else did meanwhile, the way a slow phone or a second admin would.
//
//   Section 1, a status chosen before the issue's read lands:
//     the scene holdIssue { id, status }     GET /api/issues/:id for that issue waits until release(), the way the
//                                           read on a slow connection lands after the window has opened; status,
//                                           when given, is the status the read answers, as the API answers one
//                                           someone else set after the list was read
//     the scene requestMoved { id, route,    every read of GET /api/issues/requests/:id after the first answers
//       absorbedMinutes }                    the route and the minutes someone else saved while the window was open
//
//   Section 2, whose messages are whose:
//     the scene otherAdmin                   a staff member's thread with the office (the seed's dm-1) holds a
//                                           message from a second admin beside the one from the admin signed in
//
// Every value is invented.
"use strict";

module.exports = (ctx) => {
  const { seed, clone } = ctx;
  let model = null;
  const m = () => {
    if (!model) model = { scene: {}, released: null, release: null, requestReads: {}, held: [] };
    return model;
  };
  const sc = () => m().scene;
  // One hold for the run's held read; release() lets every read waiting on it go.
  const holdOf = () => {
    const x = m();
    if (!x.released) x.released = new Promise((r) => { x.release = r; });
    return x.released;
  };

  function route(method, path, query, body, lang, under) {
    const s = sc();
    const iss = /^\/api\/issues\/([^/]+)$/.exec(path);
    if (iss && method === "GET" && iss[1] !== "requests" && s.holdIssue && decodeURIComponent(iss[1]) === String(s.holdIssue.id)) {
      const a = under();
      if (a && a.status === 200 && a.json && a.json.issue && s.holdIssue.status) a.json = Object.assign({}, a.json, { issue: Object.assign({}, a.json.issue, { status: s.holdIssue.status }) });
      m().held.push(decodeURIComponent(iss[1]));
      return Object.assign({}, a, { hold: holdOf() });
    }
    const rq = /^\/api\/issues\/requests\/([^/]+)$/.exec(path);
    if (rq && method === "GET" && s.requestMoved && decodeURIComponent(rq[1]) === String(s.requestMoved.id)) {
      const id = decodeURIComponent(rq[1]);
      const n = (m().requestReads[id] || 0) + 1;
      m().requestReads[id] = n;
      const a = under();
      if (n > 1 && a && a.status === 200 && a.json && a.json.request) {
        const moved = { route: s.requestMoved.route === undefined ? a.json.request.route : s.requestMoved.route };
        if (s.requestMoved.absorbedMinutes !== undefined) moved.absorbedMinutes = s.requestMoved.absorbedMinutes;
        a.json = Object.assign({}, a.json, { request: Object.assign({}, a.json.request, moved) });
      }
      return a;
    }
    const msgs = /^\/api\/chat\/channels\/([^/]+)\/messages$/.exec(path);
    if (msgs && method === "GET" && s.otherAdmin && decodeURIComponent(msgs[1]) === "dm-1") {
      const a = under();
      const other = seed.PEOPLE.superAdmin;
      if (a && a.status === 200 && Array.isArray(a.json)) {
        const extra = { id: "cm-405", senderId: other.id, senderName: other.firstName + " " + other.lastName, senderRole: other.role, text: "Your new schedule is posted.", sentAt: seed.shift(0) + "T21:02:00Z", isEdited: false, isPinned: false, mentions: [], clientId: null };
        const list = a.json.slice();
        const at = list.findIndex((x) => x && String(x.sentAt) > extra.sentAt);
        list.splice(at < 0 ? list.length : at, 0, extra);
        a.json = list;
      }
      return a;
    }
    return under();
  }

  return {
    route,
    setScene: (o) => { const x = m(); x.scene = Object.assign({}, x.scene, clone(o || {})); },
    release: () => { const x = m(); if (x.release) x.release(); x.released = Promise.resolve(); x.release = null; },
    held: () => m().held.slice(),
    reset: () => { const x = model; if (x && x.release) x.release(); model = null; },
  };
};
