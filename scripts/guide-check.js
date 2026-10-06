// The guide's check on every pull request, also npm run guide-check. It reads guide/APP-DASHBOARD.md
// the way the API's guide sync reads it (STEP198_CONTRACT.md, section 1) and fails when:
//   the first line does not read # APP-DASHBOARD | <Title>;
//   two entries share a title, or an entry has no title or no content;
//   a **English** (**Spanish**) pair has no row in translation/dashboard_words.csv whose English, the
//   part of the key before any |, and Spanish match it exactly, unless guide/check-allow.txt lists it;
//   the file holds an email address or a phone number;
//   a Picture: line breaks its rules (STEP276_CONTRACT.md, section 1): an entry names more than two, a
//   name is not 1 to 60 of a-z, 0-9 and -, the line is not just before Last checked:, either language's
//   file in public/guide-shots/ is missing or over 250 KB, two entries name the same picture, or a file
//   in public/guide-shots/ is named by no entry.
// Each failure is printed with its line. With GUIDE_CHECK_BASE naming a commit, a change since it that
// touches src/ and leaves the guide file alone draws a warning that the guide may need an entry, and
// does not fail. It prints the file's fingerprint, which is the one the sync answers once the file is
// loaded, and the same worked out with the Picture: lines left out, which is what the rows hold once the
// API's Step 276 keeps them apart. A path given on the command line is checked in place of the guide file.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const GUIDE = "guide/APP-DASHBOARD.md";
const CSV = "translation/dashboard_words.csv";
const ALLOW = "guide/check-allow.txt";
const SHOTS = "public/guide-shots";
const SHOT_LANGS = ["en", "es"];
const SHOT_MAX_BYTES = 250 * 1024;
const DOC_CODE = "APP-DASHBOARD";
const inActions = process.env.GITHUB_ACTIONS === "true";

// A pair as the guide writes it: a bold name, a space, then its Spanish bold inside parentheses.
const PAIR = /\*\*([^*]+)\*\* \(\*\*([^*]+)\*\*\)/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
// (555) 555-5555, 555-555-5555, 555.555.5555, 555 555 5555, +1 555 555 5555 and ten or more bare
// digits. A date such as 2026-09-16 matches none of them.
const PHONE = [
  /\(\d{3}\)\s*\d{3}[\s.-]?\d{4}\b/,
  /\b\d{3}[.-]\d{3}[.-]\d{4}\b/,
  /\b\d{3} \d{3} \d{4}\b/,
  /\+\d[\d\s().-]{7,}\d/,
  /\b\d{10,}\b/,
];

// GitHub reads a line that starts with ::error or ::warning as an annotation on the pull request.
const escData = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const escProp = (s) => escData(s).replace(/:/g, "%3A").replace(/,/g, "%2C");

// RFC 4180: a quoted field may hold commas, doubled quotes and line breaks.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// The file as the sync reads it: the first line, then each entry from a line starting ## to the next,
// its content the lines between with the ends trimmed.
function parseGuide(text) {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const entries = [];
  let cur = null;
  lines.forEach((l, i) => {
    if (i === 0) return;
    if (/^## /.test(l)) { cur = { title: l.slice(3).trim(), line: i + 1, body: [] }; entries.push(cur); }
    else if (cur) cur.body.push(l);
  });
  entries.forEach((e) => { e.content = e.body.join("\n").trim(); });
  return { first: lines[0], lines, entries };
}

// The md5 of the md5s of title|content, in the order Help numbers the entries, which is the file's.
const md5 = (s) => crypto.createHash("md5").update(s, "utf8").digest("hex");
const fingerprint = (entries) => md5(entries.map((e) => md5(e.title + "|" + e.content)).join(""));

// A picture's line, Picture: <name>, and anything that looks like one, so a slip is caught here and
// never stored as words in Help.
const PICTURE = /^Picture: ([a-z0-9-]{1,60})$/;
const LIKE_PICTURE = /^\s*picture\s*:/i;
const withoutPictures = (entries) => entries.map((e) => ({ title: e.title, content: e.body.filter((l) => !LIKE_PICTURE.test(l)).join("\n").trim() }));

// Each entry's pictures held to the files beside the guide (STEP276_CONTRACT.md, section 1).
function checkPictures(g, fail, failAt) {
  const named = new Map();
  g.entries.forEach((e) => {
    const lines = [];
    e.body.forEach((l, i) => { if (LIKE_PICTURE.test(l)) lines.push({ text: l, at: e.line + 1 + i, i }); });
    lines.forEach((p) => {
      const m = PICTURE.exec(p.text);
      if (!m) { fail(p.at, "This line is not Picture: and a name of 1 to 60 of a-z, 0-9 and -."); return; }
      let next = p.i + 1;
      while (next < e.body.length && PICTURE.test(e.body[next])) next += 1;
      if (next >= e.body.length || !/^Last checked:/.test(e.body[next])) fail(p.at, "A Picture: line sits just before Last checked:.");
      if (named.has(m[1])) fail(p.at, "The picture " + m[1] + " is named on line " + named.get(m[1]).at + " already. A picture belongs to one entry.");
      else named.set(m[1], { at: p.at, title: e.title });
    });
    if (lines.length > 2) fail(lines[2].at, "The entry " + e.title + " names " + lines.length + " pictures, and an entry takes at most two.");
  });
  const dir = path.join(ROOT, SHOTS);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  named.forEach((p, name) => SHOT_LANGS.forEach((lang) => {
    const f = name + "." + lang + ".jpg";
    if (files.indexOf(f) < 0) { fail(p.at, SHOTS + "/" + f + " is missing. npm run shots takes it."); return; }
    const size = fs.statSync(path.join(dir, f)).size;
    if (size > SHOT_MAX_BYTES) fail(p.at, SHOTS + "/" + f + " is " + Math.ceil(size / 1024) + " KB, over 250 KB.");
  }));
  files.forEach((f) => {
    const m = /^([a-z0-9-]{1,60})\.([a-z]{2})\.jpg$/.exec(f);
    if (!m || SHOT_LANGS.indexOf(m[2]) < 0) failAt(SHOTS + "/" + f, "This file is not <name>.en.jpg or <name>.es.jpg.");
    else if (!named.has(m[1])) failAt(SHOTS + "/" + f, "No entry names the picture " + m[1] + ".");
  });
  return named.size;
}

// An allowed pair, one to a line, written as the guide writes it. Spanish is written as \u escapes so
// the file stays plain ASCII. Pairs sit in blocks, a blank line ending each, and a block starts with
// a comment line saying why its pairs are there.
function readAllow(failures) {
  const file = path.join(ROOT, ALLOW);
  const allowed = new Map();
  if (!fs.existsSync(file)) return allowed;
  let said = false;
  fs.readFileSync(file, "utf8").split("\n").forEach((raw, i) => {
    const l = raw.trim();
    if (!l) { said = false; return; }
    if (l.startsWith("#")) { said = true; return; }
    const text = l.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
    const m = /^\*\*([^*]+)\*\* \(\*\*([^*]+)\*\*\)$/.exec(text);
    if (!m) { failures.push({ file: ALLOW, line: i + 1, message: "This line is not a pair written **English** (**Spanish**)." }); return; }
    if (!said) failures.push({ file: ALLOW, line: i + 1, message: "This pair's block has no comment line saying why it is allowed." });
    allowed.set(m[1] + "\u0000" + m[2], { line: i + 1, used: false });
  });
  return allowed;
}

function changedFiles(base) {
  try {
    return execFileSync("git", ["diff", "--name-only", base, "HEAD"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).split("\n").filter(Boolean);
  } catch (e) {
    console.log("Could not read what changed since " + base + ", so the src/ reminder is skipped: " + String(e.message || e).split("\n")[0]);
    return null;
  }
}

function main() {
  const guideRel = process.argv[2] || GUIDE;
  const failures = [];
  const fail = (line, message) => failures.push({ file: guideRel, line, message });

  const g = parseGuide(fs.readFileSync(path.resolve(ROOT, guideRel), "utf8"));
  const head = /^# (\S+) \| (.*\S)\s*$/.exec(g.first || "");
  if (!head) fail(1, "The first line does not read # " + DOC_CODE + " | <Title>.");
  else if (head[1] !== DOC_CODE) fail(1, "The first line names " + head[1] + "; this repository's guide is " + DOC_CODE + ".");

  const seen = new Map();
  g.entries.forEach((e) => {
    if (!e.title) { fail(e.line, "This entry has no title."); return; }
    if (seen.has(e.title)) fail(e.line, "Two entries are titled " + e.title + ". The first is on line " + seen.get(e.title) + ".");
    else seen.set(e.title, e.line);
    if (!e.content) fail(e.line, "The entry " + e.title + " has no content.");
  });
  if (g.entries.length === 0) fail(1, "The file holds no entries.");

  const words = new Set();
  parseCsv(fs.readFileSync(path.join(ROOT, CSV), "utf8")).slice(1).forEach((r) => {
    if (r.length >= 2) words.add(String(r[0]).split("|")[0] + "\u0000" + r[1]);
  });
  const allowed = readAllow(failures);
  g.lines.forEach((l, i) => {
    for (const m of l.matchAll(PAIR)) {
      const key = m[1] + "\u0000" + m[2];
      if (words.has(key)) continue;
      if (allowed.has(key)) { allowed.get(key).used = true; continue; }
      fail(i + 1, "**" + m[1] + "** (**" + m[2] + "**) has no row in " + CSV + " with that English and that Spanish.");
    }
    if (EMAIL.test(l)) fail(i + 1, "This line holds an email address. The repository is public.");
    if (PHONE.some((re) => re.test(l))) fail(i + 1, "This line holds a phone number. The repository is public.");
  });
  allowed.forEach((a) => { if (!a.used) console.log(ALLOW + ":" + a.line + ": this pair is no longer in the guide, and can come out of the list."); });
  const pictures = checkPictures(g, fail, (file, message) => failures.push({ file, line: 1, message }));

  const base = process.env.GUIDE_CHECK_BASE;
  if (base) {
    const changed = changedFiles(base);
    if (changed && changed.some((f) => f.startsWith("src/")) && changed.indexOf(GUIDE) < 0) {
      const say = "This pull request changes src/ and leaves " + GUIDE + " as it was. If a screen changed, the guide may need an entry.";
      console.log(inActions ? "::warning file=" + escProp(GUIDE) + ",title=" + escProp("The guide may need an entry") + "::" + escData(say) : "Warning: " + say);
    }
  }

  failures.forEach((f) => {
    console.log(f.file + ":" + f.line + ": " + f.message);
    if (inActions) console.log("::error file=" + escProp(f.file) + ",line=" + f.line + "::" + escData(f.message));
  });
  console.log(g.entries.length + " entries, fingerprint " + fingerprint(g.entries) + ".");
  console.log(pictures + " pictures; with the Picture: lines left out, fingerprint " + fingerprint(withoutPictures(g.entries)) + ".");
  if (failures.length) {
    console.log(failures.length + (failures.length === 1 ? " failure." : " failures."));
    process.exit(1);
  }
  console.log("The guide reads.");
}

main();
