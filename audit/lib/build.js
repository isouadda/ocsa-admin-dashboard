// Builds the production bundle the audit drives. The audit never drives the dev server: a report
// screen that reads a number wrong in production is what this suite exists to catch.
"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const BUILD_DIR = path.join(ROOT, "build");

function buildIsFresh() {
  const index = path.join(BUILD_DIR, "index.html");
  if (!fs.existsSync(index)) return false;
  const built = fs.statSync(index).mtimeMs;
  const watched = ["src", "public", "package.json"];
  let newest = 0;
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) { fs.readdirSync(p).forEach((c) => walk(path.join(p, c))); return; }
    if (st.mtimeMs > newest) newest = st.mtimeMs;
  };
  watched.forEach((w) => { const p = path.join(ROOT, w); if (fs.existsSync(p)) walk(p); });
  return built > newest;
}

function build({ force } = {}) {
  if (!force && buildIsFresh()) {
    process.stdout.write("build      reused (src and public unchanged since the last build)\n");
    return { reused: true };
  }
  process.stdout.write("build      running npm run build\n");
  const started = Date.now();
  const res = spawnSync("npm", ["run", "build"], {
    cwd: ROOT,
    encoding: "utf8",
    env: Object.assign({}, process.env, { CI: "", GENERATE_SOURCEMAP: "false" }),
  });
  const out = (res.stdout || "") + (res.stderr || "");
  if (res.status !== 0) {
    process.stdout.write(out + "\n");
    throw new Error("npm run build failed with exit code " + res.status);
  }
  const compiled = out.split("\n").filter((l) => /Compiled|warning|Failed/i.test(l)).slice(0, 6);
  compiled.forEach((l) => process.stdout.write("           " + l.trim() + "\n"));
  process.stdout.write("build      done in " + Math.round((Date.now() - started) / 1000) + "s\n");
  return { reused: false };
}

module.exports = { build, BUILD_DIR, ROOT };
