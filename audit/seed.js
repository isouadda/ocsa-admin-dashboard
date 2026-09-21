// The seeded world the audit drives. Every value here is invented. No real person, site, phone
// number or email appears, and none is taken from the live API.
//
// Every figure a report screen shows is derived from these rows, and the total is worked out by
// hand in the comment beside the rows. cases/reports.js compares the screen against the hand
// figure, so a change to the app's arithmetic fails with both numbers printed.
"use strict";

// The clock every page sees. 9:30 PM America/New_York on a Tuesday in March, which is 1:30 AM the
// NEXT day in UTC. A date formatted through UTC shows Mar 18 where the app should say Mar 17.
const NOW_ISO = "2026-03-18T01:30:00.000Z";
const TODAY = "2026-03-17";
const TIMEZONE = "America/New_York";

const ymd = (iso) => iso.slice(0, 10);
const shift = (days) => {
  const d = new Date(TODAY + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------
// People. Four kinds sign in, and every one is admin or supervisor, because
// src/App.js:367 turns any other role away at the login card.
// ---------------------------------------------------------------------------
const PEOPLE = {
  admin: {
    id: "u-admin-1", firstName: "Dana", lastName: "Whitlock", role: "admin",
    phone: "2155550101", email: "dana.whitlock@example.invalid",
    login: { phone: "2155550101", pin: "1111" },
  },
  supervisor: {
    id: "u-sup-1", firstName: "Marcus", lastName: "Ferreira", role: "supervisor",
    phone: "2155550102", email: "marcus.ferreira@example.invalid",
    login: { phone: "2155550102", pin: "2222" },
  },
  // A supervisor carrying exactly one allowed capability override, manage_permissions.
  capability: {
    id: "u-cap-1", firstName: "Priya", lastName: "Raghunathan", role: "supervisor",
    phone: "2155550103", email: "priya.raghunathan@example.invalid",
    login: { phone: "2155550103", pin: "3333" },
    singleCapability: "manage_permissions",
  },
  superAdmin: {
    id: "u-super-1", firstName: "Oyelaran", lastName: "Adebayo", role: "admin",
    phone: "2155550104", email: "oyelaran.adebayo@example.invalid",
    login: { phone: "2155550104", pin: "4444" },
    isSuperAdmin: true,
  },
};

const PERSONAS = ["admin", "supervisor", "capability", "superAdmin"];
const PERSONA_LABEL = {
  admin: "admin",
  supervisor: "supervisor",
  capability: "one capability",
  superAdmin: "super admin",
};

// ---------------------------------------------------------------------------
// Sites. Three, so every by-site figure has more than one row to add up.
// ---------------------------------------------------------------------------
const SITES = [
  { id: "s-1", name: "Harbor Point Center", address: "48 Quarry Row", city: "Fairhaven", state: "PA", zip: "19044", status: "active", site_code: "HPC", supervisor_id: "u-sup-1", square_footage: 84000, buildings: ["North Wing", "South Wing"] },
  { id: "s-2", name: "Lakeside Medical Plaza", address: "9 Kestrel Way", city: "Fairhaven", state: "PA", zip: "19045", status: "active", site_code: "LMP", supervisor_id: "u-sup-1", square_footage: 61500, buildings: ["Clinic"] },
  { id: "s-3", name: "Riverbend Logistics Hub", address: "1200 Tannery Lane", city: "Oldmarsh", state: "PA", zip: "19061", status: "active", site_code: "RLH", supervisor_id: "u-cap-1", square_footage: 152000, buildings: ["Dock A"] },
];

// ---------------------------------------------------------------------------
// Staff list. 12 rows, which is the paging boundary for a 10-per-page table:
// page 1 holds 10, page 2 holds 2, and "Showing 1 to 10 of 12" is checked.
// ---------------------------------------------------------------------------
const STAFF_FIRST = ["Dana", "Marcus", "Priya", "Oyelaran", "Tomasz", "Ngozi", "Elena", "Rashid", "Yuki", "Bertrand", "Salome", "Kwabena"];
const STAFF_LAST = ["Whitlock", "Ferreira", "Raghunathan", "Adebayo", "Wisniewski", "Okonkwo", "Barbosa", "Haddad", "Tanabe", "Lefevre", "Mkhize", "Asante"];
const STAFF_ROLES = ["admin", "supervisor", "supervisor", "admin", "custodial_lead", "custodial_laborer", "day_porter", "custodial_laborer", "custodial_lead", "day_porter", "custodial_laborer", "contractor"];
const STAFF = STAFF_FIRST.map((first, i) => ({
  id: i < 4 ? [PEOPLE.admin.id, PEOPLE.supervisor.id, PEOPLE.capability.id, PEOPLE.superAdmin.id][i] : "u-staff-" + (i + 1),
  first_name: first, firstName: first,
  last_name: STAFF_LAST[i], lastName: STAFF_LAST[i],
  name: first + " " + STAFF_LAST[i],
  role: STAFF_ROLES[i],
  status: i === 10 ? "pending" : i === 11 ? "inactive" : "active",
  phone: "21555502" + String(i + 10),
  email: first.toLowerCase() + "." + STAFF_LAST[i].toLowerCase() + "@example.invalid",
  employee_id: "EMP-" + String(1001 + i),
  hire_date: shift(-400 + i * 11),
  preferred_language: i % 3 === 0 ? "es" : "en",
  site_id: SITES[i % 3].id,
  site_name: SITES[i % 3].name,
}));
// hand: 12 rows. status pending = 1 (row 11), inactive = 1 (row 12), active = 10.
const STAFF_PENDING_COUNT = 1;

// ---------------------------------------------------------------------------
// Issues. The issue source is the only live data layer, so these rows carry
// the arithmetic the Reports page is checked against.
// ---------------------------------------------------------------------------
const ISSUES = [
  { id: "i-1", title: "Lobby floor scuffed after delivery", site_name: SITES[0].name, site_id: SITES[0].id, zone: "Lobby", severity: "high", status: "open", reported_by_name: "Tomasz Wisniewski", reported_at: shift(-2) + "T14:05:00Z" },
  { id: "i-2", title: "Soap dispenser empty on floor 3", site_name: SITES[0].name, site_id: SITES[0].id, zone: "Restroom", severity: "low", status: "resolved", reported_by_name: "Ngozi Okonkwo", reported_at: shift(-9) + "T11:20:00Z" },
  { id: "i-3", title: "Waste bin liner shortage in clinic", site_name: SITES[1].name, site_id: SITES[1].id, zone: "Corridor", severity: "medium", status: "open", reported_by_name: "Elena Barbosa", reported_at: shift(-4) + "T08:45:00Z" },
  { id: "i-4", title: "Loading bay puddle after rain", site_name: SITES[2].name, site_id: SITES[2].id, zone: "Dock", severity: "medium", status: "in_progress", reported_by_name: "Rashid Haddad", reported_at: shift(-1) + "T19:10:00Z" },
  { id: "i-5", title: "Stair handrail sticky", site_name: SITES[1].name, site_id: SITES[1].id, zone: "Stairwell", severity: "low", status: "resolved", reported_by_name: "Yuki Tanabe", reported_at: shift(-13) + "T07:30:00Z" },
  { id: "i-6", title: "Break room sink slow to drain", site_name: SITES[2].name, site_id: SITES[2].id, zone: "Break Room", severity: "low", status: "open", reported_by_name: "Bertrand Lefevre", reported_at: shift(-6) + "T16:00:00Z" },
];
// hand: 6 rows. open = 3 (i-1, i-3, i-6), in_progress = 1, resolved = 2.
// The Issues export writes one CSV row per issue plus one header row = 7 lines.
const ISSUES_CSV_HEADER = ["Title", "Site", "Zone", "Severity", "Status", "Reported By", "Date"];

// The report-engine issue-timing payload. The counts below are a 30-day window and are
// deliberately larger than the six rows above, which are the live Issue Tracker list.
const ISSUE_TIMING = {
  bucket: "week",
  summary: {
    reported_count: 24,
    resolved_count: 18,
    open_count: 6,
    aging_count: 2,
    resolution_median_minutes: 195,
    first_response_median_minutes: 42,
    sla_resolution_compliance_pct: 83,
    sla_response_compliance_pct: 91,
    open_by_severity: { high: 1, medium: 3, low: 2 },
  },
  // hand: open_by_severity 1 + 3 + 2 = 6, which is summary.open_count.
  // hand: fmtDurMin(195) = "3h 15m". fmtDurMin(42) = "42m".
  // hand: fmtPctVal(83) = "83%". fmtPctVal(91) = "91%".
  trend: [
    { bucket_start: shift(-28), reported_count: 9, resolved_count: 7, resolution_median_minutes: 210, first_response_median_minutes: 48, sla_resolution_compliance_pct: 78, sla_response_compliance_pct: 89, resolution_breach_count: 2, response_breach_count: 1 },
    { bucket_start: shift(-21), reported_count: 7, resolved_count: 6, resolution_median_minutes: 186, first_response_median_minutes: 40, sla_resolution_compliance_pct: 85, sla_response_compliance_pct: 92, resolution_breach_count: 1, response_breach_count: 0 },
    { bucket_start: shift(-14), reported_count: 8, resolved_count: 5, resolution_median_minutes: 195, first_response_median_minutes: 39, sla_resolution_compliance_pct: 86, sla_response_compliance_pct: 93, resolution_breach_count: 0, response_breach_count: 1 },
  ],
  // hand: reported 9 + 7 + 8 = 24, which is summary.reported_count.
  // hand: resolved 7 + 6 + 5 = 18, which is summary.resolved_count.
  // hand: breaches (2+1) + (1+0) + (0+1) = 5, the "SLA breaches in range" figure.
  by_site: [
    { site_id: SITES[0].id, site_name: SITES[0].name, reported_count: 10, resolved_count: 8, open_count: 2, aging_count: 1, resolution_median_minutes: 180, first_response_median_minutes: 36, sla_resolution_compliance_pct: 88, sla_response_compliance_pct: 94 },
    { site_id: SITES[1].id, site_name: SITES[1].name, reported_count: 8, resolved_count: 6, open_count: 2, aging_count: 1, resolution_median_minutes: 205, first_response_median_minutes: 45, sla_resolution_compliance_pct: 80, sla_response_compliance_pct: 90 },
    { site_id: SITES[2].id, site_name: SITES[2].name, reported_count: 6, resolved_count: 4, open_count: 2, aging_count: 0, resolution_median_minutes: 240, first_response_median_minutes: 52, sla_resolution_compliance_pct: 75, sla_response_compliance_pct: 88 },
  ],
  // hand: reported 10 + 8 + 6 = 24. resolved 8 + 6 + 4 = 18.
  // hand: open 2 + 2 + 2 = 6. aging 1 + 1 + 0 = 2. All four match the summary.
  sla_targets: {
    high: { first_response_minutes: 60, resolution_minutes: 240 },
    medium: { first_response_minutes: 240, resolution_minutes: 1440 },
    low: { first_response_minutes: 1440, resolution_minutes: 4320 },
  },
};
const ISSUE_TIMING_HAND = {
  reported: 24, resolved: 18, open: 6, aging: 2,
  medianResolution: "3h 15m", medianFirstResponse: "42m",
  resolutionSla: "83%", responseSla: "91%",
  slaBreaches: 5,
};

// ---------------------------------------------------------------------------
// Supply usage. Costs add to the summary exactly, to the cent.
// ---------------------------------------------------------------------------
const SUPPLY_USAGE = {
  bucket: "week",
  summary: { total_estimated_cost: 4812.50, usage_events: 37, supplies_used: 9, sites_active: 3 },
  trend: [
    { bucket_start: shift(-28), estimated_cost: 1610.00, usage_events: 13 },
    { bucket_start: shift(-21), estimated_cost: 1702.50, usage_events: 14 },
    { bucket_start: shift(-14), estimated_cost: 1500.00, usage_events: 10 },
  ],
  // hand: 1610.00 + 1702.50 + 1500.00 = 4812.50, which is summary.total_estimated_cost.
  // hand: 13 + 14 + 10 = 37, which is summary.usage_events.
  by_site: [
    { site_id: SITES[0].id, site_name: SITES[0].name, estimated_cost: 2140.00, usage_events: 16 },
    { site_id: SITES[1].id, site_name: SITES[1].name, estimated_cost: 1587.50, usage_events: 13 },
    { site_id: SITES[2].id, site_name: SITES[2].name, estimated_cost: 1085.00, usage_events: 8 },
  ],
  // hand: 2140.00 + 1587.50 + 1085.00 = 4812.50. 16 + 13 + 8 = 37.
  by_supply: [
    { supply_id: "sp-1", supply_name: "Neutral floor cleaner", category: "chemical", estimated_cost: 1210.00, quantity: 44, unit: "gallon" },
    { supply_id: "sp-2", supply_name: "Microfiber cloth pack", category: "tool", estimated_cost: 880.50, quantity: 60, unit: "pack" },
    { supply_id: "sp-3", supply_name: "Can liner 40x46", category: "consumable", estimated_cost: 742.00, quantity: 90, unit: "case" },
    { supply_id: "sp-4", supply_name: "Hand soap refill", category: "consumable", estimated_cost: 610.00, quantity: 35, unit: "each" },
    { supply_id: "sp-5", supply_name: "Glass cleaner concentrate", category: "chemical", estimated_cost: 455.00, quantity: 20, unit: "gallon" },
    { supply_id: "sp-6", supply_name: "Restroom paper towel", category: "consumable", estimated_cost: 380.00, quantity: 48, unit: "case" },
    { supply_id: "sp-7", supply_name: "Mop head 24oz", category: "tool", estimated_cost: 245.00, quantity: 25, unit: "each" },
    { supply_id: "sp-8", supply_name: "Disinfectant wipes", category: "chemical", estimated_cost: 190.00, quantity: 18, unit: "tub" },
    { supply_id: "sp-9", supply_name: "Entry mat", category: "equipment", estimated_cost: 100.00, quantity: 4, unit: "each" },
  ],
  // hand: 1210.00 + 880.50 + 742.00 + 610.00 + 455.00 + 380.00 + 245.00 + 190.00 + 100.00
  //     = 2090.50 + 742.00 = 2832.50; + 610.00 = 3442.50; + 455.00 = 3897.50;
  //     + 380.00 = 4277.50; + 245.00 = 4522.50; + 190.00 = 4712.50; + 100.00 = 4812.50.
  // hand: 9 rows, which is summary.supplies_used.
  green_split: { green_cost: 1925.00, non_green_cost: 2887.50 },
  // hand: 1925.00 + 2887.50 = 4812.50.
};
const SUPPLY_HAND = {
  estimatedCost: "$4,812.50", usageEvents: 37, suppliesUsed: 9, sites: 3,
  topSupply: "Neutral floor cleaner",
};

// ---------------------------------------------------------------------------
// Inspections. Four completed inspections, whose average is worked out by hand.
// ---------------------------------------------------------------------------
const INSPECTION_SCORES = [
  { id: "insp-1", scheduled_date: shift(-70), site_id: SITES[0].id, site_name: SITES[0].name, template_name: "Monthly quality walk", total_score: 86, max_possible_score: 100, score_pct: 86, completed_by_name: "Marcus Ferreira", overall_notes: "Lobby glass needs a second pass." },
  { id: "insp-2", scheduled_date: shift(-48), site_id: SITES[1].id, site_name: SITES[1].name, template_name: "Monthly quality walk", total_score: 92, max_possible_score: 100, score_pct: 92, completed_by_name: "Priya Raghunathan", overall_notes: "" },
  { id: "insp-3", scheduled_date: shift(-26), site_id: SITES[2].id, site_name: SITES[2].name, template_name: "Dock area check", total_score: 78, max_possible_score: 100, score_pct: 78, completed_by_name: "Marcus Ferreira", overall_notes: "Dock floor marking faded." },
  { id: "insp-4", scheduled_date: shift(-7), site_id: SITES[0].id, site_name: SITES[0].name, template_name: "Monthly quality walk", total_score: 94, max_possible_score: 100, score_pct: 94, completed_by_name: "Priya Raghunathan", overall_notes: "" },
];
// hand: total score 86 + 92 + 78 + 94 = 350. total max 100 x 4 = 400.
// hand: avg = round(1000 x 350 / 400) / 10 = round(875) / 10 = 87.5, shown as "87.5%".
// hand: 4 inspections, 3 sites.
const INSPECTION_SITE_COMPARISON = [
  { site_id: SITES[0].id, site_name: SITES[0].name, inspection_count: 2, avg_score_pct: 90 },
  { site_id: SITES[1].id, site_name: SITES[1].name, inspection_count: 1, avg_score_pct: 92 },
  { site_id: SITES[2].id, site_name: SITES[2].name, inspection_count: 1, avg_score_pct: 78 },
];
// hand: Harbor Point holds insp-1 (86) and insp-4 (94), so its average is (86 + 94) / 2 = 90.
const INSPECTION_LOWEST_ITEMS = [
  { item_id: "it-1", label: "Dock floor markings", zone: "Dock", cims_category: "SD", avg_score_pct: 52, inspection_count: 1 },
  { item_id: "it-2", label: "Stairwell handrails", zone: "Stairwell", cims_category: "HSE", avg_score_pct: 64, inspection_count: 2 },
  { item_id: "it-3", label: "Lobby glass", zone: "Lobby", cims_category: "SD", avg_score_pct: 71, inspection_count: 3 },
];
const INSPECTION_HAND = { avgScore: "87.5%", inspections: 4, sites: 3 };

const INSPECTION_DASHBOARD_SUMMARY = [
  { site_id: SITES[0].id, site_name: SITES[0].name, score_pct: 94 },
  { site_id: SITES[1].id, site_name: SITES[1].name, score_pct: 92 },
  { site_id: SITES[2].id, site_name: SITES[2].name, score_pct: 78 },
];

// ---------------------------------------------------------------------------
// The Dashboard snapshot, kept consistent with the issue rows above.
// ---------------------------------------------------------------------------
const OVERVIEW = { clockedInNow: 4, activeStaff: 10, openIssues: 3, pendingStaff: STAFF_PENDING_COUNT };
// hand: openIssues 3 matches the three open rows in ISSUES. activeStaff 10 matches STAFF.
const TASK_COMPLETION = {
  sites: [
    { siteId: SITES[0].id, siteName: SITES[0].name, completedTasks: 12, totalTasks: 14 },
    { siteId: SITES[1].id, siteName: SITES[1].name, completedTasks: 9, totalTasks: 11 },
    { siteId: SITES[2].id, siteName: SITES[2].name, completedTasks: 6, totalTasks: 10 },
  ],
};
// hand: completed 12 + 9 + 6 = 27 of 14 + 11 + 10 = 35.
const TASK_COMPLETION_HAND = { completed: 27, total: 35 };
const ISSUES_SNAPSHOT = { summary: { total: 24, open_count: 6, resolved: 18 } };
// hand: the same 24 / 6 / 18 as ISSUE_TIMING.summary, so the two screens agree.

module.exports = {
  NOW_ISO, TODAY, TIMEZONE, shift, ymd,
  PEOPLE, PERSONAS, PERSONA_LABEL,
  SITES, STAFF, STAFF_PENDING_COUNT,
  ISSUES, ISSUES_CSV_HEADER,
  ISSUE_TIMING, ISSUE_TIMING_HAND,
  SUPPLY_USAGE, SUPPLY_HAND,
  INSPECTION_SCORES, INSPECTION_SITE_COMPARISON, INSPECTION_LOWEST_ITEMS, INSPECTION_HAND,
  INSPECTION_DASHBOARD_SUMMARY,
  OVERVIEW, TASK_COMPLETION, TASK_COMPLETION_HAND, ISSUES_SNAPSHOT,
};
