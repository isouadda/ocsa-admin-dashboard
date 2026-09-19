// A static server for build/, with the single-page fallback the hash router needs. No dependency:
// the audit adds one devDependency and this is not it.
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function serve(dir) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent((req.url || "/").split("?")[0].split("#")[0]);
    if (rel.endsWith("/")) rel += "index.html";
    let file = path.join(dir, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
    if (!file.startsWith(dir)) file = path.join(dir, "index.html");
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, "index.html");
    const body = fs.readFileSync(file);
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ origin: "http://127.0.0.1:" + port, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

module.exports = { serve };
