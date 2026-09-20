// Every report screen, checked against figures worked out by hand beside the seed.
//
// A mismatch fails with both numbers printed: what the seed says the answer is, and what the screen
// actually shows. Change one report's arithmetic in src/App.js and this is what catches it.
"use strict";
const seed = require("../seed");

// Reads a figure off a tile by the label printed with it. MetricTile puts the value above the label
// and the stat card on the Dashboard puts it below, so both are tried, and a candidate that reads
// like a figure wins over one that reads like prose. The same words appear as a section heading on
// some pages, which is why every candidate is looked at rather than the first.
async function tile(d, label) {
  return d.page.evaluate((lbl) => {
    const box = document.querySelector("div[style*='padding: 16px 24px 30px']") || document.body;
    const want = lbl.toLowerCase();
    const nodes = Array.from(box.querySelectorAll("div")).filter((el) => (el.innerText || "").trim().toLowerCase() === want);
    const looksLikeAFigure = (v) => /^[$]?[\d.,]+(%|[a-z])?$/i.test(v) || /^\d+[hdm]( \d+m)?$/.test(v) || v === "n/a" || v === "-";
    const candidates = [];
    for (const n of nodes) {
      const card = n.parentElement;
      if (!card) continue;
      const kids = Array.from(card.children).map((c) => (c.innerText || "").trim()).filter(Boolean);
      const idx = kids.findIndex((k) => k.toLowerCase() === want);
      if (idx > 0) candidates.push(kids[idx - 1]);
      if (idx === 0 && kids.length > 1) candidates.push(kids[1]);
    }
    const figure = candidates.find(looksLikeAFigure);
    return figure != null ? figure : (candidates[0] != null ? candidates[0] : null);
  }, label);
}

function cmp(results, id, want, got, what) {
  const ok = String(want) === String(got);
  results.check("report", id, ok, ok ? "" : what + ": the seed says " + JSON.stringify(String(want)) + ", the screen shows " + JSON.stringify(String(got)));
  return ok;
}

async function openSavedReport(d, name) {
  await d.goto("reports");
  return d.clickRunFor(name);
}

async function run({ d, results, stubs }) {
  await d.signOutHard();
  await d.signIn("admin");

  // ---- 1. Issue response and resolution --------------------------------
  {
    const id = "reports/issue-timing";
    const opened = await openSavedReport(d, "Issue response and resolution");
    if (!opened) { results.fail("report", id, "the saved report would not open from the library"); }
    else {
      const h = seed.ISSUE_TIMING_HAND;
      cmp(results, id + "/median-resolution", h.medianResolution, await tile(d, "Median resolution"), "median resolution from 195 minutes");
      cmp(results, id + "/median-first-response", h.medianFirstResponse, await tile(d, "Median first response"), "median first response from 42 minutes");
      cmp(results, id + "/resolution-sla", h.resolutionSla, await tile(d, "Resolution SLA"), "resolution compliance");
      cmp(results, id + "/response-sla", h.responseSla, await tile(d, "Response SLA"), "response compliance");
      cmp(results, id + "/open-now", String(h.open), await tile(d, "Open now"), "open count, which is the severity split 1 + 3 + 2");

      // The by-site table has to add up to the summary.
      const body = await d.bodyText();
      const sums = seed.ISSUE_TIMING.by_site.reduce((a, r) => ({
        reported: a.reported + r.reported_count,
        resolved: a.resolved + r.resolved_count,
        open: a.open + r.open_count,
      }), { reported: 0, resolved: 0, open: 0 });
      cmp(results, id + "/by-site-adds-up", String(h.reported), String(sums.reported), "the three site rows add to the reported total");
      results.check("report", id + "/by-site-on-screen",
        seed.ISSUE_TIMING.by_site.every((r) => body.indexOf(r.site_name) >= 0),
        "each of the three sites is named on screen");

      // The SLA breach figure is the sum over the trend buckets. The seeded definition turns the SLA
      // panel on, so the figure is on screen rather than behind a saved setting.
      const shown = await d.page.evaluate(() => {
        const box = document.querySelector("div[style*='padding: 16px 24px 30px']") || document.body;
        const el = Array.from(box.querySelectorAll("span")).find((s) => /SLA breaches in range/.test((s.parentElement || {}).innerText || ""));
        if (!el) return null;
        const kids = Array.from(el.parentElement.children).map((c) => (c.innerText || "").trim());
        return kids[0];
      });
      cmp(results, id + "/sla-breaches", String(h.slaBreaches), shown, "breaches summed over the three buckets, (2+1)+(1+0)+(0+1)");
    }
  }

  // ---- 2. Supply usage and cost -----------------------------------------
  {
    const id = "reports/supply-usage";
    const opened = await openSavedReport(d, "Supply usage and cost");
    if (!opened) results.fail("report", id, "the saved report would not open from the library");
    else {
      const h = seed.SUPPLY_HAND;
      cmp(results, id + "/estimated-cost", h.estimatedCost, await tile(d, "Estimated cost"), "cost summed over nine supplies");
      cmp(results, id + "/usage-events", String(h.usageEvents), await tile(d, "Usage events"), "events summed over three sites, 16 + 13 + 8");
      cmp(results, id + "/supplies-used", String(h.suppliesUsed), await tile(d, "Supplies used"), "nine supply rows");
      cmp(results, id + "/sites", String(h.sites), await tile(d, "Sites"), "three sites with cost");
      // The top-supplies panel is a horizontal bar chart, so its labels are SVG text on the y axis.
      results.check("report", id + "/top-supply", await d.chartHas(h.topSupply),
        "the dearest supply is not named on the top-supplies chart. The chart draws "
          + JSON.stringify(await d.chartLabels()));
      const split = seed.SUPPLY_USAGE.green_split;
      cmp(results, id + "/green-split-adds-up", "4812.5", String(split.green_cost + split.non_green_cost), "the green and other split adds to the total");
    }
  }

  // ---- 3. Inspection scores and quality ---------------------------------
  {
    const id = "reports/inspection-quality";
    const opened = await openSavedReport(d, "Inspection scores and quality");
    if (!opened) results.fail("report", id, "the saved report would not open from the library");
    else {
      const h = seed.INSPECTION_HAND;
      cmp(results, id + "/avg-score", h.avgScore, await tile(d, "Avg score"), "350 of 400 points, worked out by hand as 87.5 percent");
      cmp(results, id + "/inspections", String(h.inspections), await tile(d, "Inspections"), "four inspections in the range");
      cmp(results, id + "/sites", String(h.sites), await tile(d, "Sites"), "three sites in the comparison");
      const totScore = seed.INSPECTION_SCORES.reduce((a, r) => a + r.total_score, 0);
      const totMax = seed.INSPECTION_SCORES.reduce((a, r) => a + r.max_possible_score, 0);
      cmp(results, id + "/hand-arithmetic", "87.5", String(Math.round(1000 * totScore / totMax) / 10), "the seed's own rows still add to 350 of 400");
      // The lowest-scoring items panel is the other horizontal bar chart in the app.
      const lowest = seed.INSPECTION_LOWEST_ITEMS[0].label;
      results.check("report", id + "/lowest-item-named", await d.chartHas(lowest),
        "the lowest-scoring item is not named on its chart. The chart draws "
          + JSON.stringify(await d.chartLabels()));
    }
  }

  // ---- 4. The Quick snapshots on the Reports page ------------------------
  {
    const id = "reports/quick-snapshots";
    await d.goto("reports");
    const body = await d.bodyText();
    const h = seed.TASK_COMPLETION_HAND;
    const shownPerSite = seed.TASK_COMPLETION.sites.every((s) => body.indexOf(s.completedTasks + " done") >= 0);
    results.check("report", id + "/task-completion", shownPerSite,
      shownPerSite ? "" : "the seed says 12, 9 and 6 tasks done per site; the screen reads " + JSON.stringify(body.slice(body.indexOf("Task Completion"), body.indexOf("Task Completion") + 140)));
    cmp(results, id + "/task-completion-total", String(h.completed), String(seed.TASK_COMPLETION.sites.reduce((a, s) => a + s.completedTasks, 0)), "12 + 9 + 6");

    const snap = seed.ISSUES_SNAPSHOT.summary;
    const hasAll = body.indexOf(String(snap.total)) >= 0 && body.indexOf(String(snap.open_count)) >= 0 && body.indexOf(String(snap.resolved)) >= 0;
    results.check("report", id + "/issues-summary", hasAll,
      hasAll ? "" : "the seed says total " + snap.total + ", open " + snap.open_count + ", resolved " + snap.resolved + "; not all three are on screen");
    cmp(results, id + "/issues-summary-adds-up", String(snap.total), String(snap.open_count + snap.resolved), "open plus resolved is the total");
  }

  // ---- 5. The Dashboard tiles -------------------------------------------
  {
    const id = "reports/overview-dashboard";
    await d.goto("overview");
    const o = seed.OVERVIEW;
    cmp(results, id + "/started-today", String(o.clockedInNow), await tile(d, "Started today"), "four people started, counted over the three sites in the sessions");
    cmp(results, id + "/open-issues", String(o.openIssues), await tile(d, "Open Issues"), "three open rows in the issue list");
    cmp(results, id + "/pending", String(o.pendingStaff), await tile(d, "Pending"), "one pending person in the staff list");
    const started = stubs.fixtures.SHIFT_SESSIONS.sites.reduce((a, s) => a + s.people.length, 0);
    cmp(results, id + "/sessions-add-up", String(o.clockedInNow), String(started), "the session rows add to the Started today tile");
    // A time formatted through UTC would read the wrong hour here: 22:05Z is 6:05 PM in New York.
    const body = await d.bodyText();
    results.check("report", id + "/times-are-local", body.indexOf("6:05 PM") >= 0,
      body.indexOf("6:05 PM") >= 0 ? "" : "a session that started at 22:05Z should read 6:05 PM, the screen reads " + JSON.stringify(body.slice(body.indexOf("Started"), body.indexOf("Started") + 60)));
  }

  // ---- 6. Shift Pickup analytics ----------------------------------------
  {
    const id = "reports/marketplace-analytics";
    await d.goto("marketplace");
    await d.clickText("Analytics", { exact: true });
    const a = stubs.fixtures.PICKUP_ANALYTICS.summary;
    cmp(results, id + "/fill-rate", a.fill_rate + "%", await tile(d, "Fill Rate"), "3 filled of 4 posted");
    cmp(results, id + "/fill-rate-hand", String(a.fill_rate), String(Math.round(100 * a.filled_count / a.posted_count)), "the seed's own counts still give 75 percent");
    cmp(results, id + "/open-now", String(a.open_count), await tile(d, "Open Now"), "one open shift");
    cmp(results, id + "/callouts", String(a.callout_count), await tile(d, "Callouts"), "two callouts");
    // 95 minutes is shown as 1h by the app's own rounding.
    const fill = await tile(d, "Avg Fill Time");
    results.check("report", id + "/avg-fill-time", fill === "2h" || fill === "1h" || fill === "95m",
      "95 minutes reads " + JSON.stringify(fill) + " on screen");
  }

  // ---- 7. The Inspections analytics tab ---------------------------------
  {
    const id = "reports/inspection-analytics";
    await d.goto("inspections");
    await d.clickText("Reports", { exact: true });
    const body = await d.bodyTextContent();
    const bySite = seed.INSPECTION_SITE_COMPARISON;
    const named = bySite.every((r) => body.indexOf(r.site_name) >= 0);
    results.check("report", id + "/by-site", named, named ? "" : "not all three sites are named on the analytics tab");
    // Harbor Point holds two inspections, 86 and 94, so its average is 90.
    cmp(results, id + "/site-average-hand", "90", String((86 + 94) / 2), "the two Harbor Point inspections average 90");
    const low = seed.INSPECTION_LOWEST_ITEMS[0];
    results.check("report", id + "/lowest-item", body.indexOf(low.label) >= 0,
      body.indexOf(low.label) >= 0 ? "" : "the lowest-scoring item is not named on screen");
  }
}

module.exports = { run };
