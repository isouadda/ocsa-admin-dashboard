// The API's streaming route, written the way the API writes it.
//
// route.fulfill sends a body whole, so the stub answers POST /api/agent/message/stream with a 307 to
// this server, and the browser follows it here with the same method, body and Accept-Language. Each
// event is written with a pause before it. A hold stops the answer part way until the case lets it
// go, so a case can read the page in the middle of an answer however slow the machine is. A drop
// destroys the socket part way, which is what a connection that drops looks like to the page.
//
// The address has no /api/ in it, so the harness's own route does not catch the request a second time.
"use strict";
const http = require("http");

// A reset, written as a piece of an answer.
const RESET = { reset: true };

let started = null;
let played = 0;
const plays = new Map();

// Somewhere a case can stop an answer. reached settles when the server gets there; the answer goes
// on once the case calls release, or once the page has gone away.
function hold() {
  const h = { reached: null, released: false };
  let arrive;
  h.reached = new Promise((r) => { arrive = r; });
  h.arrive = () => arrive(true);
  let go;
  h.done = new Promise((r) => { go = r; });
  h.release = () => { h.released = true; go(); };
  return h;
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Settles once the event has been handed to the socket.
function write(res, step) {
  return new Promise((r) => {
    res.write("event: " + step.event + "\ndata: " + JSON.stringify(step.data == null ? {} : step.data) + "\n\n", () => r());
  });
}

async function playTo(req, res, play) {
  const log = play.log;
  log.asked = Date.now();
  log.language = req.headers["accept-language"] || null;
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*",
  });
  let gone = false;
  let written = Promise.resolve();
  res.on("close", () => { gone = true; });
  for (const step of play.steps) {
    if (gone) break;
    if (step.pause) await pause(step.pause);
    if (gone) break;
    if (step.hold) {
      log.wrote.push({ at: Date.now() - log.asked, hold: true });
      step.hold.arrive();
      await Promise.race([step.hold.done, new Promise((r) => res.on("close", r))]);
      continue;
    }
    // A socket destroyed with events still in its buffer loses them, and a browser that has read
    // nothing sends the request again. So what was written reaches the page first, and then the
    // connection drops, part way through the answer.
    if (step.drop) {
      await written;
      await pause(Math.max(step.pause || 0, 150));
      log.dropped = Date.now() - log.asked;
      req.socket.destroy();
      return;
    }
    written = write(res, step);
    log.wrote.push({ at: Date.now() - log.asked, event: step.event });
  }
  // A hold the page never reached is let go, so nothing waits on a request that has gone.
  play.steps.forEach((s) => { if (s.hold && !s.hold.released) s.hold.release(); });
  if (!gone) res.end();
  log.ended = Date.now() - log.asked;
}

function onRequest(req, res) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": req.headers["access-control-request-headers"] || "Content-Type, Accept-Language",
  };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); res.end(); return; }
  const id = (req.url || "").split("?")[0].split("/").pop();
  const play = plays.get(id);
  // The body is read to the end before anything is written, the way a server that parses JSON does.
  req.resume();
  req.on("end", () => {
    if (!play) {
      res.writeHead(404, Object.assign({ "Content-Type": "application/json" }, cors));
      res.end(JSON.stringify({ error: "No answer is waiting at this address" }));
      return;
    }
    plays.delete(id);
    playTo(req, res, play).catch(() => { try { res.destroy(); } catch (e) { /* gone */ } });
  });
}

// One server for the whole run, started by the first driver that needs it.
function start() {
  if (started) return started;
  started = new Promise((resolve, reject) => {
    const server = http.createServer(onRequest);
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.unref();
      resolve("http://127.0.0.1:" + server.address().port);
    });
  });
  return started;
}

// Where the browser is sent for one answer. steps are { event, data, pause }, { hold, pause } or
// { drop: true }; log is filled in as the answer is written, in milliseconds from when it was asked.
async function play(steps, log) {
  const origin = await start();
  played += 1;
  const id = "answer-" + played;
  plays.set(id, { steps, log: log || { wrote: [] } });
  return origin + "/stream/" + id;
}

module.exports = { start, play, hold, RESET };
