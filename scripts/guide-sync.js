// Loads guide/APP-DASHBOARD.md into Help (STEP198_CONTRACT.md, section 1). Run by
// .github/workflows/guide-sync.yml on a push to main that changes the file, and by hand from Actions.
// The run proves who it is with its own OIDC token, audience ocsa-guide-sync, which the API checks
// against GitHub's published keys, so no secret is stored anywhere. DRY_RUN=true sends ?dryRun=true,
// and the API answers the same counts and writes nothing. Anything but a 2xx fails the job.
"use strict";
const fs = require("fs");
const path = require("path");

const DOC_CODE = "APP-DASHBOARD";
const FILE = path.join(__dirname, "..", "guide", "APP-DASHBOARD.md");
const ROUTE = "https://ocsa-api-production.up.railway.app/api/guide-sync";
const AUDIENCE = "ocsa-guide-sync";

const fail = (message) => { console.log("::error title=Guide sync::" + message); process.exit(1); };

async function idToken() {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const bearer = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!url || !bearer) fail("No OIDC token to ask for. The job needs permissions id-token: write, and runs only in GitHub Actions.");
  const r = await fetch(url + (url.indexOf("?") >= 0 ? "&" : "?") + "audience=" + encodeURIComponent(AUDIENCE), {
    headers: { "Authorization": "bearer " + bearer, "Accept": "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) fail("The runner did not give an OIDC token: HTTP " + r.status + ".");
  const d = await r.json();
  if (!d || typeof d.value !== "string" || !d.value) fail("The runner's OIDC answer held no token.");
  return d.value;
}

async function main() {
  const dryRun = process.env.DRY_RUN === "true";
  const markdown = fs.readFileSync(FILE, "utf8");
  const sourceCommit = process.env.GITHUB_SHA || "";
  const token = await idToken();
  console.log("Sending " + path.relative(process.cwd(), FILE) + " as " + DOC_CODE + " at " + (sourceCommit || "an unknown commit") + (dryRun ? ", as a dry run" : "") + ".");
  const r = await fetch(ROUTE + (dryRun ? "?dryRun=true" : ""), {
    method: "POST",
    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ docCode: DOC_CODE, markdown, sourceCommit }),
    signal: AbortSignal.timeout(120000),
  });
  const raw = await r.text();
  let d = null;
  try { d = JSON.parse(raw); } catch (e) { d = null; }
  if (!r.ok) {
    // A refusal carries a code and its words in both languages; guide.tooManyRemovals names the
    // titles it would have retired in keys. The whole answer is printed so none of it is lost.
    console.log("The API refused the guide: HTTP " + r.status + ".");
    console.log(d ? JSON.stringify(d, null, 2) : raw.slice(0, 4000));
    fail("HTTP " + r.status + (d && d.code ? " " + d.code : "") + ".");
  }
  if (!d || typeof d !== "object") fail("The API answered HTTP " + r.status + " with no JSON.");
  const counts = ["updated", "inserted", "reactivated", "deactivated", "unchanged", "rowsActive"];
  console.log((d.dryRun ? "Dry run, nothing written. " : "Synced. ") + counts.map((k) => k + " " + (d[k] == null ? "?" : d[k])).join(", ") + ".");
  console.log("Fingerprint " + (d.fingerprint || "?"));
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
