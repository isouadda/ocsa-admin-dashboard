// Every API call the dashboard makes is answered here, and nowhere else. The audit lets no request
// reach the network: a call with no rule below is answered with an empty shape and recorded, so a
// gap shows up in the run rather than hanging.
//
// Values are invented. Shapes follow the real contracts, read off the call sites in src/App.js.
"use strict";
const seed = require("./seed");
const { RESET } = require("./stream");

const clone = (v) => JSON.parse(JSON.stringify(v));
const S = seed.SITES;

// A refusal the API can answer with. cases/refusals.js arms one at a time.
// { method, path (substring or RegExp), status, code, error, once }
function createStubs() {
  const calls = [];
  // Every call the run makes, counted, and the ones that did not ask for the language their screen is
  // drawn in. Nothing resets this.
  const language = { calls: 0, misses: [] };
  let refusals = [];
  // A path held open on purpose, so a window that shows a loading state can be caught in it.
  let delays = [];
  // A list route cut to a fixed number of rows, so a table can be driven empty and with one row.
  let trim = null;
  let signedInAs = "admin";
  // A browser reads Content-Disposition off a cross-origin response only when the server exposes it.
  // The API does; a case turns it off to drive the name the dashboard falls back to.
  let exposeDisposition = true;
  // The seed gives the capability persona exactly one override. The permissions routes answer from
  // here, so what the seed says that person carries is what the app reads back.
  function seededOverrides() {
    const out = {};
    Object.keys(seed.PEOPLE).forEach((k) => {
      const p = seed.PEOPLE[k];
      if (p.singleCapability) out[p.id] = { [p.singleCapability]: true };
    });
    return out;
  }
  const state = {
    staff: clone(seed.STAFF),
    sites: clone(seed.SITES),
    issues: clone(seed.ISSUES),
    supplies: null,
    supplyRequests: null,
    pickups: null,
    schedule: null,
    patterns: null,
    timeOff: null,
    overrides: seededOverrides(),
    formDelivery: {},
    lookupValues: null,
    notifications: null,
  };

  const person = () => seed.PEOPLE[signedInAs];

  // -------------------------------------------------------------------------
  // Fixtures built once per run.
  // -------------------------------------------------------------------------
  const LOOKUPS = [
    { id: "lk-1", slug: "cims_categories", name: "Service categories", values: [
      { id: "lv-1", value: "SD", label: "Service Delivery", is_active: true, sort_order: 1, color: "#24A4F4" },
      { id: "lv-2", value: "HSE", label: "Health, Safety and Environment", is_active: true, sort_order: 2, color: "#F39C12" },
      { id: "lv-3", value: "GB", label: "Green Buildings", is_active: true, sort_order: 3, color: "#2ECC71" },
    ] },
    { id: "lk-2", slug: "supply_categories", name: "Supply categories", values: [
      { id: "lv-4", value: "chemical", label: "Chemical", is_active: true, sort_order: 1 },
      { id: "lv-5", value: "consumable", label: "Consumable", is_active: true, sort_order: 2 },
      { id: "lv-6", value: "tool", label: "Tool", is_active: true, sort_order: 3, show_other_input: true },
    ] },
    { id: "lk-3", slug: "supply_units", name: "Supply units", values: [
      { id: "lv-7", value: "each", label: "Each", is_active: true, sort_order: 1 },
      { id: "lv-8", value: "case", label: "Case", is_active: true, sort_order: 2 },
      { id: "lv-9", value: "gallon", label: "Gallon", is_active: true, sort_order: 3 },
    ] },
    { id: "lk-4", slug: "issue_severities", name: "Issue severities", values: [
      { id: "lv-10", value: "high", label: "High", is_active: true, sort_order: 1, color: "#E74C3C" },
      { id: "lv-11", value: "medium", label: "Medium", is_active: true, sort_order: 2, color: "#F39C12" },
      { id: "lv-12", value: "low", label: "Low", is_active: true, sort_order: 3, color: "#2ECC71" },
    ] },
    { id: "lk-5", slug: "zones", name: "Zones", values: [
      { id: "lv-13", value: "Lobby", label: "Lobby", is_active: true, sort_order: 1 },
      { id: "lv-14", value: "Restroom", label: "Restroom", is_active: true, sort_order: 2 },
      { id: "lv-15", value: "Dock", label: "Dock", is_active: true, sort_order: 3 },
    ] },
    { id: "lk-6", slug: "leave_types", name: "Leave types", values: [
      { id: "lv-16", value: "vacation", label: "Vacation", is_active: true, sort_order: 1 },
      { id: "lv-17", value: "sick", label: "Sick", is_active: true, sort_order: 2 },
    ] },
    { id: "lk-7", slug: "task_priorities", name: "Task priorities", values: [
      { id: "lv-18", value: "standard", label: "Standard", is_active: true, sort_order: 1 },
      { id: "lv-19", value: "urgent", label: "Urgent", is_active: true, sort_order: 2 },
    ] },
    { id: "lk-8", slug: "document_categories", name: "Document categories", values: [
      { id: "lv-20", value: "training", label: "Training", is_active: true, sort_order: 1 },
      { id: "lv-21", value: "compliance", label: "Compliance", is_active: true, sort_order: 2 },
      { id: "lv-22", value: "other", label: "Other", is_active: true, sort_order: 3 },
    ] },
  ];

  const SUPPLIES = [
    { id: "sp-1", name: "Neutral floor cleaner", category: "chemical", unit: "gallon", current_stock: 44, low_threshold: 10, cost_per_unit: 27.50, is_green_certified: true, green_cert_type: "Third-party", epa_reg_number: "EPA-11-204", qr_code: "QR-SP1", is_active: true },
    { id: "sp-2", name: "Microfiber cloth pack", category: "tool", unit: "case", current_stock: 8, low_threshold: 12, cost_per_unit: 14.68, is_green_certified: false, qr_code: "QR-SP2", is_active: true },
    { id: "sp-3", name: "Can liner 40x46", category: "consumable", unit: "case", current_stock: 90, low_threshold: 20, cost_per_unit: 8.24, is_green_certified: false, qr_code: "QR-SP3", is_active: true },
    { id: "sp-4", name: "Hand soap refill", category: "consumable", unit: "each", current_stock: 35, low_threshold: 15, cost_per_unit: 17.43, is_green_certified: true, green_cert_type: "Third-party", epa_reg_number: "EPA-11-311", qr_code: "QR-SP4", is_active: true },
    { id: "sp-5", name: "Glass cleaner concentrate", category: "chemical", unit: "gallon", current_stock: 20, low_threshold: 6, cost_per_unit: 22.75, is_green_certified: false, epa_reg_number: "EPA-11-408", qr_code: "QR-SP5", is_active: true },
  ];
  // hand: 5 supplies, 2 of them chemicals, so the chemical export writes 2 rows plus a header.

  const SUPPLY_REQUESTS = [
    { id: "sr-1", supply_name: "Can liner 40x46", supply_id: "sp-3", quantity: 6, unit: "case", status: "pending", requested_by_name: "Tomasz Wisniewski", site_name: S[0].name, notes: "Dock run is short.", requested_at: seed.shift(-1) + "T13:00:00Z", admin_notes: null },
    { id: "sr-2", supply_name: "Hand soap refill", supply_id: "sp-4", quantity: 4, unit: "each", status: "pending", requested_by_name: "Ngozi Okonkwo", site_name: S[1].name, notes: "", requested_at: seed.shift(-2) + "T09:30:00Z", admin_notes: null },
    { id: "sr-3", supply_name: "Mop head 24oz", supply_id: "sp-7", quantity: 10, unit: "each", status: "fulfilled", requested_by_name: "Elena Barbosa", site_name: S[2].name, notes: "", requested_at: seed.shift(-11) + "T15:45:00Z", admin_notes: "Delivered." },
  ];

  // The list and the approved-vendor export both read approval_status.
  const VENDORS = [
    { id: "v-1", name: "Tallow Ridge Supply", status: "approved", approval_status: "approved", address_line1: "12 Tannery Row", zip_code: "19044", products_services: "Chemicals and dilution control", certification_status: "Third-party", contract_terms: "Net 30", last_review_date: seed.shift(-40), category: "chemical", contact_name: "K. Osei", contact_email: "orders@tallowridge.example.invalid", contact_phone: "2155559001", insurance_expiry: seed.shift(120), w9_on_file: true, avg_rating: 4.4, evaluation_count: 3, city: "Fairhaven", state: "PA" },
    { id: "v-2", name: "Brightwater Equipment", status: "approved", approval_status: "approved", address_line1: "3 Dockside Lane", zip_code: "19061", products_services: "Autoscrubbers and parts", certification_status: "None", contract_terms: "Net 15", last_review_date: seed.shift(-90), category: "equipment", contact_name: "M. Delacroix", contact_email: "sales@brightwater.example.invalid", contact_phone: "2155559002", insurance_expiry: seed.shift(22), w9_on_file: true, avg_rating: 3.9, evaluation_count: 2, city: "Oldmarsh", state: "PA" },
    { id: "v-3", name: "Kestrel Paper Co", status: "pending", approval_status: "pending", address_line1: "88 Foundry Street", zip_code: "19045", products_services: "Paper and liners", certification_status: "None", contract_terms: "Prepaid", last_review_date: null, category: "consumable", contact_name: "S. Nakamura", contact_email: "hello@kestrelpaper.example.invalid", contact_phone: "2155559003", insurance_expiry: seed.shift(-14), w9_on_file: false, avg_rating: null, evaluation_count: 0, city: "Fairhaven", state: "PA" },
  ];
  // hand: 3 vendors, 2 approved. The approved-vendor export writes 2 rows plus a header.

  const SERVICES = [
    { id: "sv-1", name: "Daily janitorial", slug: "daily-janitorial", description: "Nightly cleaning of occupied floors.", rate_structure: "Per square foot, monthly", required_certifications: "Bloodborne pathogen awareness", cims_category: "SD", linked_sites: 3, is_active: true },
    { id: "sv-2", name: "Floor restoration", slug: "floor-restoration", description: "Strip, seal and finish hard floors.", rate_structure: "Per project", required_certifications: "Machine operation", cims_category: "GB", linked_sites: 2, is_active: true },
  ];

  const PICKUPS = [
    { id: "pk-1", site_id: S[0].id, site_name: S[0].name, scheduled_date: seed.shift(2), start_time: "18:00", end_time: "02:00", status: "open", origin: "new_shift", urgency: "normal", building_name: "North Wing", floor_number: "3", service_category: "SD", notes: "Covering a vacancy.", claimed_by_name: null, assigned_to_name: null, original_user_id: "u-staff-5", posted_at: seed.shift(-1) + "T14:00:00Z" },
    { id: "pk-2", site_id: S[1].id, site_name: S[1].name, scheduled_date: seed.shift(3), start_time: "06:00", end_time: "14:00", status: "claimed", origin: "new_shift", urgency: "high", building_name: "Clinic", floor_number: "1", service_category: "SD", notes: "", claimed_by_name: "Yuki Tanabe", claimed_by: "u-staff-9", assigned_to_name: null, original_user_id: "u-staff-9", posted_at: seed.shift(-2) + "T10:00:00Z" },
    { id: "pk-3", site_id: S[2].id, site_name: S[2].name, scheduled_date: seed.shift(1), start_time: "22:00", end_time: "06:00", status: "requested", origin: "drop_request", urgency: "normal", building_name: "Dock A", floor_number: "1", service_category: "SD", notes: "Family commitment.", claimed_by_name: null, assigned_to_name: "Rashid Haddad", assigned_to: "u-staff-8", original_user_id: "u-staff-8", posted_at: seed.shift(-1) + "T08:00:00Z" },
    { id: "pk-4", site_id: S[0].id, site_name: S[0].name, scheduled_date: seed.shift(-3), start_time: "18:00", end_time: "02:00", status: "approved", origin: "new_shift", urgency: "normal", building_name: "South Wing", floor_number: "2", service_category: "SD", notes: "", claimed_by_name: "Bertrand Lefevre", claimed_by: "u-staff-10", assigned_to_name: null, original_user_id: "u-staff-10", posted_at: seed.shift(-6) + "T12:00:00Z" },
  ];
  // hand: 4 pickups. open 1, claimed 1, requested 1, approved 1.

  const PICKUP_ANALYTICS = {
    summary: { open_count: 1, fill_rate: 75, avg_time_to_fill_minutes: 95, callout_count: 2, no_show_count: 1, posted_count: 4, filled_count: 3 },
    // hand: filled 3 of posted 4 = 75 percent, which is fill_rate.
  };

  const SCHEDULE = [
    { id: "sh-1", user_id: "u-staff-5", user_name: "Tomasz Wisniewski", site_id: S[0].id, site_name: S[0].name, scheduled_date: seed.shift(0), start_time: "18:00", end_time: "02:00", status: "scheduled", building_name: "North Wing", floor_number: "3", notes: "", pattern_id: null, crosses_midnight: true },
    { id: "sh-2", user_id: "u-staff-6", user_name: "Ngozi Okonkwo", site_id: S[1].id, site_name: S[1].name, scheduled_date: seed.shift(0), start_time: "06:00", end_time: "14:00", status: "scheduled", building_name: "Clinic", floor_number: "1", notes: "", pattern_id: "pt-1", shift_pattern_id: "pt-1" },
    { id: "sh-3", user_id: "u-staff-7", user_name: "Elena Barbosa", site_id: S[2].id, site_name: S[2].name, scheduled_date: seed.shift(1), start_time: "22:00", end_time: "06:00", status: "scheduled", building_name: "Dock A", floor_number: "1", notes: "", pattern_id: null, crosses_midnight: true },
    { id: "sh-4", user_id: "u-staff-8", user_name: "Rashid Haddad", site_id: S[0].id, site_name: S[0].name, scheduled_date: seed.shift(2), start_time: "14:00", end_time: "22:00", status: "scheduled", building_name: "South Wing", floor_number: "2", notes: "", pattern_id: "pt-1", shift_pattern_id: "pt-1" },
  ];

  const PATTERNS = [
    { id: "pt-1", userId: "u-staff-6", userName: "Ngozi Okonkwo", siteId: S[1].id, siteName: S[1].name, days: [1, 3, 5], startTime: "06:00", endTime: "14:00", startsOn: seed.shift(-30), endsOn: null, buildingName: "Clinic", floorNumber: "1", notes: "", upcomingShifts: 14, status: "active" },
    { id: "pt-2", userId: "u-staff-9", userName: "Yuki Tanabe", siteId: S[0].id, siteName: S[0].name, days: [2, 4], startTime: "18:00", endTime: "02:00", startsOn: seed.shift(-14), endsOn: seed.shift(45), buildingName: "North Wing", floorNumber: "2", notes: "Covering nights.", upcomingShifts: 8, status: "active" },
  ];

  const TIME_OFF = [
    { id: "to-1", userId: "u-staff-5", userName: "Tomasz Wisniewski", leaveType: "vacation", leaveTypeLabel: "Vacation", startsOn: seed.shift(9), endsOn: seed.shift(12), partDay: false, hours: 32, status: "requested", reason: "Family trip booked in January.", createdAt: seed.shift(-3) + "T16:20:00Z", shifts: [
      { id: "sh-90", date: seed.shift(9), startTime: "18:00", endTime: "02:00", siteName: S[0].name, status: "scheduled" },
      { id: "sh-91", date: seed.shift(11), startTime: "18:00", endTime: "02:00", siteName: S[0].name, status: "scheduled" },
    ] },
    { id: "to-2", userId: "u-staff-6", userName: "Ngozi Okonkwo", leaveType: "sick", leaveTypeLabel: "Sick", startsOn: seed.shift(1), endsOn: seed.shift(1), partDay: true, startTime: "06:00", endTime: "10:00", hours: 4, status: "requested", reason: "", createdAt: seed.shift(-1) + "T07:05:00Z", shifts: [] },
    { id: "to-3", userId: "u-staff-7", userName: "Elena Barbosa", leaveType: "vacation", leaveTypeLabel: "Vacation", startsOn: seed.shift(-20), endsOn: seed.shift(-18), partDay: false, hours: 24, status: "approved", reason: "", createdAt: seed.shift(-40) + "T10:00:00Z", decidedByName: "Dana Whitlock", decidedAt: seed.shift(-38) + "T14:00:00Z", decisionNote: "Covered by the weekend pattern.", shifts: [] },
    { id: "to-4", userId: "u-staff-8", userName: "Rashid Haddad", leaveType: "sick", leaveTypeLabel: "Sick", startsOn: seed.shift(-9), endsOn: seed.shift(-9), partDay: false, hours: 8, status: "denied", reason: "", createdAt: seed.shift(-12) + "T09:00:00Z", decidedByName: "Dana Whitlock", decidedAt: seed.shift(-11) + "T11:00:00Z", decisionNote: "Two people already off that day.", shifts: [] },
    { id: "to-5", userId: "u-staff-9", userName: "Yuki Tanabe", leaveType: "vacation", leaveTypeLabel: "Vacation", startsOn: seed.shift(20), endsOn: seed.shift(21), partDay: false, hours: 16, status: "cancelled", reason: "", createdAt: seed.shift(-5) + "T12:00:00Z", cancelledAt: seed.shift(-4) + "T08:00:00Z", shifts: [] },
  ];
  // hand: 5 requests. requested 2, approved 1, denied 1, cancelled 1.

  const NOTIFICATIONS = [
    { id: "n-1", title: "Time off approved", body: "Your request for four days is approved.", subjectType: "time_off", subjectId: "to-3", link: "#schedule", createdAt: seed.shift(0) + "T22:00:00Z", readAt: null },
    { id: "n-2", title: "Report filed", body: "An incident report was filed at Harbor Point Center.", subjectType: "form", subjectId: "ir-1", link: "#forms", createdAt: seed.shift(0) + "T20:15:00Z", readAt: null },
    { id: "n-3", title: "Issue reported", body: "Lobby floor scuffed after delivery.", subjectType: "issue", subjectId: "i-1", link: "#issues", createdAt: seed.shift(-1) + "T14:10:00Z", readAt: null },
    { id: "n-4", title: "Supply request waiting", body: "Can liner 40x46, six cases.", subjectType: "supply_request", subjectId: "sr-1", link: "#supplies", createdAt: seed.shift(-1) + "T13:05:00Z", readAt: seed.shift(-1) + "T18:00:00Z" },
    { id: "n-5", title: "Shift needs cover", body: "Riverbend Logistics Hub, overnight.", subjectType: "pickup", subjectId: "pk-3", link: "#marketplace", createdAt: seed.shift(-1) + "T08:05:00Z", readAt: null },
    { id: "n-6", title: "Inspection completed", body: "Monthly quality walk scored 94 percent.", subjectType: "inspection", subjectId: "insp-4", link: "#inspections", createdAt: seed.shift(-7) + "T17:00:00Z", readAt: seed.shift(-7) + "T19:00:00Z" },
    { id: "n-7", title: "A case was opened", body: "A concern was raised and needs an owner.", subjectType: "hr_case", subjectId: "hc-1", link: "#cases", createdAt: seed.shift(-2) + "T09:00:00Z", readAt: null },
  ];
  // hand: 7 notices, 5 unread (n-1, n-2, n-3, n-5, n-7).
  const UNREAD_COUNT = 5;

  const CAPABILITIES = [
    { key: "manage_permissions", label: "Manage per-person permissions", group: "Administration", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "manage_company_settings", label: "Company settings and branding", group: "Administration", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "manage_staff", label: "Staff accounts and approvals", group: "Administration", enforced: false, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "decide_time_off", label: "Decide time off requests", group: "Time", enforced: true, defaults: { admin: true, supervisor: true, staff: false } },
    { key: "manage_schedule", label: "Schedule and shift pickups", group: "Time", enforced: false, defaults: { admin: true, supervisor: true, staff: false } },
    { key: "run_reports", label: "Reports and report builder", group: "Reporting", enforced: false, defaults: { admin: true, supervisor: true, staff: false } },
  ];

  const REPORT_DEFS = [
    // The SLA panel is on in this saved definition, so the breach figure is on screen to be checked.
    { id: "rd-1", name: "Issue response and resolution", description: "Median response and resolution, with service level compliance.", category: "service_delivery", source: "issues_timing", is_system: true, config: { output: { trend: true, by_site: true, severity: true, sla: true } } },
    { id: "rd-2", name: "Supply usage and cost", description: "Estimated cost from logged usage at current prices.", category: "supplies", source: "supply_usage", is_system: true, config: {} },
    { id: "rd-3", name: "Inspection scores and quality", description: "Inspection results over the selected period.", category: "quality", source: "inspection_quality", is_system: true, config: {} },
    { id: "rd-4", name: "Night shift issue watch", description: "A saved copy narrowed to high severity.", category: "service_delivery", source: "issues_timing", is_system: false, config: { filters: { severity: "high" } } },
    { id: "rd-5", name: "Labor hours by site", description: "Arrives with the labor workstream.", category: "labor", source: "labor_hours", is_system: true, config: {} },
  ];
  // hand: 5 saved reports in 4 categories. 4 are system templates, 1 is custom, 1 source is not live.

  const INSPECTION_TEMPLATES = [
    { id: "tp-1", name: "Monthly quality walk", description: "Occupied floors, lobby and restrooms.", item_count: 10, max_total_score: 100, is_active: true },
    { id: "tp-2", name: "Dock area check", description: "Loading dock and waste area.", item_count: 6, max_total_score: 60, is_active: true },
  ];
  const INSPECTION_ITEMS = [
    { id: "it-1", label: "Dock floor markings", zone: "Dock", cims_category: "SD", max_score: 10, sort_order: 1 },
    { id: "it-2", label: "Stairwell handrails", zone: "Stairwell", cims_category: "HSE", max_score: 10, sort_order: 2 },
    { id: "it-3", label: "Lobby glass", zone: "Lobby", cims_category: "SD", max_score: 10, sort_order: 3 },
  ];
  const SCHEDULED_INSPECTIONS = [
    { id: "si-1", site_id: S[0].id, site_name: S[0].name, template_id: "tp-1", template_name: "Monthly quality walk", scheduled_date: seed.shift(4), status: "scheduled", assigned_to: "u-sup-1", assigned_to_name: "Marcus Ferreira" },
    { id: "si-2", site_id: S[2].id, site_name: S[2].name, template_id: "tp-2", template_name: "Dock area check", scheduled_date: seed.shift(6), status: "scheduled", assigned_to: "u-cap-1", assigned_to_name: "Priya Raghunathan" },
  ];

  // Shaped to the Cases page: clock, ageHours, subject, assigned, createdAt. The response clock is
  // 72 hours from filing, so ageHours drives what the Response column says.
  const HR_CASES = [
    { id: "hc-1", reference: "CASE-0007", status: "open", clock: "overdue", ageHours: 86, createdAt: seed.shift(-4) + "T09:00:00Z", subject: { id: "u-staff-5", name: "Tomasz Wisniewski" }, assigned: null, summary: "A concern was raised about overnight cover.", subjectNamed: true },
    { id: "hc-2", reference: "CASE-0006", status: "in_review", clock: "due_soon", ageHours: 60, createdAt: seed.shift(-3) + "T21:00:00Z", subject: null, assigned: { id: "u-admin-1", name: "Dana Whitlock" }, summary: "Dock lighting reported dim.", subjectNamed: false },
    { id: "hc-3", reference: "CASE-0005", status: "resolved", clock: "responded", ageHours: 300, createdAt: seed.shift(-14) + "T09:00:00Z", subject: { id: "u-staff-7", name: "Elena Barbosa" }, assigned: { id: "u-super-1", name: "Oyelaran Adebayo" }, summary: "Pay question, answered the same week.", subjectNamed: true },
  ];
  // hand: 3 cases. 2 need a response (1 overdue, 1 due soon), 1 already answered.
  // hand: the badge adds unassigned 1 + dueSoon 0 + overdue 1 = 2.
  const CASE_QUEUE = { unassigned: 1, dueSoon: 0, overdue: 1 };

  // 12 documents so the 10-per-page table has a second page. Field names follow the HR page:
  // category, file_name, expiry_date, created_at, uploaded_by_name.
  const HR_DOCUMENTS = Array.from({ length: 12 }, (_, i) => ({
    id: "hd-" + (i + 1),
    user_id: seed.STAFF[i % seed.STAFF.length].id,
    user_name: seed.STAFF[i % seed.STAFF.length].name,
    category: i % 4 === 3 ? "other" : i % 2 === 0 ? "training" : "compliance",
    document_type: i % 4 === 3 ? "other" : i % 2 === 0 ? "training" : "compliance",
    title: ["Handbook acknowledgement", "Safety briefing", "Equipment sign-out", "Language preference note"][i % 4],
    file_name: "doc-" + (i + 1) + ".pdf",
    created_at: seed.shift(-60 + i * 4) + "T12:00:00Z",
    uploaded_by_name: "Dana Whitlock",
    expiry_date: i % 3 === 0 ? seed.shift(20 + i) : null,
  }));
  // hand: 12 documents. category other = 3 (i = 3, 7, 11), so the Other tab lists 3 and the
  // Documents tab lists the other 9.

  const HR_TRAINING = Array.from({ length: 12 }, (_, i) => ({
    id: "ht-" + (i + 1),
    user_id: seed.STAFF[i % seed.STAFF.length].id,
    user_name: seed.STAFF[i % seed.STAFF.length].name,
    training_name: ["Bloodborne pathogens", "Machine operation", "Chemical handling", "Ladder safety"][i % 4],
    training_type: i % 2 === 0 ? "safety" : "equipment",
    completed_date: seed.shift(-120 + i * 7),
    expiry_date: i % 2 === 0 ? seed.shift(15 + i * 3) : null,
    score: 90 + (i % 10),
    administered_by: "Marcus Ferreira",
  }));
  // hand: 12 training records, 6 with an expiry date (every other one).

  const HR_ONBOARDING = [
    { id: "ob-1", step_category: "paperwork", step_name: "Handbook acknowledged", is_completed: true, completed_date: seed.shift(-20), completed_by_name: "Dana Whitlock" },
    { id: "ob-2", step_category: "paperwork", step_name: "Direct deposit form", is_completed: true, completed_date: seed.shift(-19), completed_by_name: "Dana Whitlock" },
    { id: "ob-3", step_category: "training", step_name: "Safety briefing", is_completed: true, completed_date: seed.shift(-18), completed_by_name: "Marcus Ferreira" },
    { id: "ob-4", step_category: "training", step_name: "Site walkthrough", is_completed: false, completed_date: null, completed_by_name: null },
    { id: "ob-5", step_category: "equipment", step_name: "Keys and badge issued", is_completed: false, completed_date: null, completed_by_name: null },
  ];
  // hand: 5 steps in 3 categories, 3 complete, so the line reads "3 of 5 steps complete".

  // The compliance roll-up, shaped to what the Compliance tab reads: five lists, each counted.
  const HR_COMPLIANCE = {
    expiredDocs: [HR_DOCUMENTS[0]],
    expiringDocs: [HR_DOCUMENTS[3], HR_DOCUMENTS[6]],
    expiredTraining: [HR_TRAINING[0]],
    expiringTraining: [HR_TRAINING[2]],
    onboardingProgress: seed.STAFF.slice(4, 8).map((p, i) => ({ user_id: p.id, user_name: p.name, completed_steps: 3 + (i % 2), total_steps: 5 })),
    staffSummary: seed.STAFF.map((p) => ({
      id: p.id, user_name: p.name, role: p.role,
      doc_count: 3, training_count: 2, jotform_count: 1, alias_count: 0,
      expired_docs: p.id === seed.STAFF[4].id ? 1 : 0,
      expired_training: p.id === seed.STAFF[4].id ? 1 : 0,
      onb_completed: 3, onb_total: 5,
    })),
  };
  // hand: expired docs 1, expired training 1, expiring 2 + 1 = 3 in the 30-day tile,
  // onboarding 4 people, staff summary 12 rows.

  const SETTINGS = {
    id: "set-1",
    legal_name: "Orchard Cove Service Alliance",
    display_name: "Orchard Cove",
    short_name: "Orchard Cove",
    primary_color: "#0A1628",
    secondary_color: "#E7B017",
    logo_url: "",
    ein: "00-0000000",
    address: "1 Orchard Cove Way, Fairhaven PA 19044",
    timezone: seed.TIMEZONE,
    pay_period_start_day: "Saturday",
    show_ein_on_reports: true,
    use_company_settings: true,
  };

  const JOTFORM_FORMS = [
    { id: "jf-1", form_id: "240000000000001", title: "Incident report", status: "ENABLED", submission_count: 4, last_submission_at: seed.shift(-1) + "T18:00:00Z", locale: "en" },
    { id: "jf-2", form_id: "240000000000002", title: "New hire packet", status: "ENABLED", submission_count: 9, last_submission_at: seed.shift(-5) + "T10:00:00Z", locale: "en" },
  ];
  // Shaped to the Submissions table: submitter_name, first_name, linked_entity_type, expiry_date.
  const JOTFORM_SUBMISSIONS = [
    { id: "js-1", jotform_form_id: "240000000000001", form_title: "Incident report", submitted_at: seed.shift(-1) + "T18:00:00Z", user_id: "u-staff-5", first_name: "Tomasz", last_name: "Wisniewski", user_employee_id: "EMP-1005", submitter_name: "Tomasz Wisniewski", submitter_email: "tomasz.wisniewski@example.invalid", status: "ACTIVE", linked_entity_type: null, expiry_date: null, has_original_pdf: true },
    { id: "js-2", jotform_form_id: "240000000000002", form_title: "New hire packet", submitted_at: seed.shift(-5) + "T10:00:00Z", user_id: "u-staff-6", first_name: "Ngozi", last_name: "Okonkwo", user_employee_id: "EMP-1006", submitter_name: "Ngozi Okonkwo", submitter_email: "ngozi.okonkwo@example.invalid", status: "ACTIVE", linked_entity_type: "hr_document", expiry_date: seed.shift(90), has_original_pdf: true },
    { id: "js-3", jotform_form_id: "240000000000001", form_title: "Incident report", submitted_at: seed.shift(-9) + "T08:00:00Z", user_id: null, first_name: null, last_name: null, user_employee_id: null, submitter_name: null, submitter_email: null, status: "ACTIVE", linked_entity_type: null, expiry_date: null, has_original_pdf: false },
  ];
  // hand: 3 submissions, 1 already linked, 1 with nobody matched to it.
  // Field names follow the PDF Access Log table: first_name, access_type, submitter_name, success.
  const PDF_ACCESS_LOG = [
    { id: "pa-1", jotform_form_id: "240000000000001", form_title: "Incident report", submission_id: "600000000000001", first_name: "Dana", last_name: "Whitlock", access_type: "view", accessed_at: seed.shift(-1) + "T19:00:00Z", ip_address: "198.51.100.7", success: true, submitter_name: "Tomasz Wisniewski", error_message: null },
    { id: "pa-2", jotform_form_id: "240000000000002", form_title: "New hire packet", submission_id: "600000000000002", first_name: "Marcus", last_name: "Ferreira", access_type: "download", accessed_at: seed.shift(-4) + "T11:00:00Z", ip_address: "198.51.100.9", success: true, submitter_name: "Ngozi Okonkwo", error_message: null },
    { id: "pa-3", jotform_form_id: "240000000000001", form_title: "Incident report", submission_id: "600000000000001", first_name: null, last_name: null, access_type: "print", accessed_at: seed.shift(-8) + "T16:00:00Z", ip_address: "198.51.100.4", success: false, submitter_name: null, error_message: "The upstream PDF could not be read" },
  ];
  // hand: 3 access events, 1 of them a failure, and one with no person left on the row.
  // Shaped to the Filed forms view: formName, siteName, userName, submittedAt, createdAt,
  // answered, remaining, dueAt.
  const INCIDENT_REPORTS = [
    { id: "ir-1", formCode: "incident", formName: "Incident report", status: "submitted", siteId: S[0].id, siteName: S[0].name, userName: "Tomasz Wisniewski", createdAt: seed.shift(-1) + "T17:40:00Z", submittedAt: seed.shift(-1) + "T18:00:00Z", answered: 12, remaining: 0, dueAt: null },
    { id: "ir-2", formCode: "incident", formName: "Incident report", status: "draft", siteId: S[1].id, siteName: S[1].name, userName: "Ngozi Okonkwo", createdAt: seed.shift(0) + "T20:00:00Z", submittedAt: null, answered: 7, remaining: 5, dueAt: seed.shift(-1) + "T23:00:00Z" },
    { id: "ir-3", formCode: "vehicle", formName: "Vehicle report", status: "draft", siteId: null, siteName: null, userName: "Elena Barbosa", createdAt: seed.shift(-2) + "T11:00:00Z", answered: 3, remaining: 9, dueAt: seed.shift(4) + "T23:00:00Z" },
    { id: "fr-9", formCode: "service-log", formName: "Daily service log", status: "submitted", siteId: S[0].id, siteName: S[0].name, userId: state.staff[6].id, userName: state.staff[6].name, createdAt: seed.shift(-1) + "T14:00:00Z", submittedAt: seed.shift(-1) + "T22:10:00Z", answered: 6, remaining: 0, dueAt: null },
  ];
  // hand: 4 reports. submitted 2, draft 2. The draft rows read "7 of 12" and "3 of 12" answered,
  // and ir-2 is past due against the fixed clock.

  // The filed report the forms after these two look like: a checklist, a table a person adds rows
  // to, a sign-off already stamped by whoever filed it, one waiting for a reviewer, and a
  // supervisor section filled in at a desk. Every value here is invented.
  const SERVICE_LOG_ID = "fr-9";
  const FILER = state.staff[6];
  const AREA_COLUMNS = [
    { key: "done", label: "Done", type: "checkbox", required: true },
    { key: "note", label: "Note", type: "text", required: false },
  ];
  const AREA_ROWS = [
    { key: "lobby", label: "Lobby and entry" },
    { key: "restrooms", label: "Restrooms" },
    { key: "breakroom", label: "Break room" },
  ];
  const SUPPLY_COLUMNS = [
    { key: "item", label: "Item", type: "text", required: true },
    { key: "qty", label: "How many", type: "number", required: true },
    { key: "unit", label: "Unit", type: "select", required: true,
      options: [{ value: "case", label: "Case" }, { value: "each", label: "Each" }] },
  ];
  const CHECK_COLUMNS = [{ key: "ok", label: "Checked", type: "checkbox", required: true }];
  const CHECK_ROWS = [
    { key: "walkthrough", label: "Walked the floor" },
    { key: "supplies", label: "Supplies counted" },
  ];
  const AREA_VALUE = {
    lobby: { done: true, note: "Buffed after the delivery" },
    restrooms: { done: true, note: "" },
    breakroom: { done: false, note: "Locked at close" },
  };
  const SUPPLY_VALUE = [
    { item: "All purpose cleaner", qty: 2, unit: "case" },
    { item: "Liner bags", qty: 6, unit: "each" },
  ];
  // What the stamp and the saved supervisor answers look like between calls, so the window can be
  // read again after the API answers.
  const filedState = () => {
    if (!state.filedForms) state.filedForms = { signed: {}, supervisor: {} };
    return state.filedForms;
  };
  const stampNow = () => ({
    userId: person().id,
    name: person().firstName + " " + person().lastName,
    role: person().role,
    at: seed.NOW_ISO,
  });
  const SUPERVISOR_REQUIRED = [
    { key: "reviewed_on", label: "Date reviewed" },
    { key: "checks", label: "Checks at review" },
  ];
  const answered = (v) => {
    if (v == null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
  };
  const serviceLogFields = () => {
    const sup = filedState().supervisor;
    const stamp = filedState().signed.review_signoff || null;
    const checks = sup.checks || {};
    return [
      { id: "sf-1", key: "service_date", label: "Date of service", half: "agent", type: "date",
        value: "2026-03-16", displayValue: "March 16, 2026" },
      // The filing half carries the staff portal's word for itself here on purpose: this repo
      // writes that half as "agent" in one place and "staff" in another, and a window that reads
      // the answers should not depend on which word the API sends.
      { id: "sf-2", key: "areas", label: "Areas completed", half: "staff", type: "grid",
        columns: AREA_COLUMNS, rows: AREA_ROWS, minRows: null, maxRows: null,
        value: AREA_VALUE,
        displayValue: "Lobby and entry: done. Restrooms: done. Break room: not done." },
      { id: "sf-3", key: "supplies_used", label: "Supplies used", half: "agent", type: "grid",
        columns: SUPPLY_COLUMNS, rows: null, minRows: 1, maxRows: 5,
        value: SUPPLY_VALUE,
        displayValue: "All purpose cleaner 2 Case. Liner bags 6 Each." },
      { id: "sf-4", key: "filed_signoff", label: "Filed by", half: "agent", type: "signoff",
        signer: "agent", displayValue: "",
        value: { userId: FILER.id, name: FILER.name, role: FILER.role, at: seed.shift(-1) + "T22:10:00Z" } },
      { id: "sf-5", key: "reviewed_on", label: "Date reviewed", half: "supervisor", type: "date",
        value: sup.reviewed_on || "", displayValue: sup.reviewed_on ? "March 17, 2026" : "" },
      { id: "sf-6", key: "review_note", label: "What the supervisor found", half: "supervisor",
        type: "textarea", value: sup.review_note || "", displayValue: sup.review_note || "" },
      { id: "sf-7", key: "checks", label: "Checks at review", half: "supervisor", type: "grid",
        columns: CHECK_COLUMNS, rows: CHECK_ROWS, minRows: null, maxRows: null,
        value: checks,
        displayValue: CHECK_ROWS.filter((r) => checks[r.key] && checks[r.key].ok).map((r) => r.label).join(". ") },
      { id: "sf-8", key: "review_signoff", label: "Reviewed by", half: "supervisor", type: "signoff",
        signer: "supervisor", displayValue: "", value: stamp },
    ];
  };
  const FORM_LIST = [
    { code: "incident", title: "Incident report" },
    { code: "vehicle", title: "Vehicle report" },
    { code: "service-log", title: "Daily service log" },
  ];
  const canListFiledForms = () => person().role === "admin" || person().readsFiledForms === true;
  const INCIDENT_FIELDS = (r) => [
    { id: "f-1", key: "where", label: "Where did it happen", half: "agent", type: "text",
      value: r.siteName || "", displayValue: r.siteName || "" },
    { id: "f-2", key: "what", label: "What happened", half: "agent", type: "textarea",
      value: "A delivery pallet scuffed the lobby floor.", displayValue: "A delivery pallet scuffed the lobby floor." },
    { id: "f-3", key: "action", label: "Corrective action", half: "supervisor", type: "textarea",
      value: "", displayValue: "" },
  ];
  // What the read answers, and what the sign-off and supervisor routes answer back.
  const reportPayload = (r) => {
    const isLog = r.id === SERVICE_LOG_ID;
    const fields = isLog ? serviceLogFields() : INCIDENT_FIELDS(r);
    const mine = String(r.userId || "") === String(person().id);
    const signed = !!filedState().signed.review_signoff;
    const sup = filedState().supervisor;
    const canWrite = isLog && r.status === "submitted" && !mine;
    return {
      draft: Object.assign({}, r),
      fields: fields,
      canSign: isLog && !mine && !signed ? ["review_signoff"] : [],
      canWriteSupervisor: canWrite,
      supervisorMissing: canWrite ? SUPERVISOR_REQUIRED.filter((q) => !answered(sup[q.key])) : [],
    };
  };

  // GET /api/notification-recipients. Every type except the two Speak Up ones takes an outside
  // address, and the keyed type carries the forms, each with how its email carries the report.
  // One unfinished report waiting on the Help page, answered to the end.
  const AGENT_DRAFTS = [{ id: "ad-1", formName: "Safety Incident Report", answered: 12, remaining: 0, status: "draft" }];
  // A conversation Help resumes, by its id. None unless a case puts one in.
  const AGENT_CONVERSATIONS = {};

  // Help's answer, the way POST /api/agent/message/stream writes it: meta, the text in pieces, then
  // done, which is today's response body, or error in its place. A case arms the next answer with
  // setAgentStream; with nothing armed it is today's canned reply in three pieces.
  //   pieces            the text as it arrives: strings, stream.RESET, and holds from stream.hold()
  //   pause             milliseconds before each piece, and before an error
  //   done              keys the finished answer carries beside reply and conversationId
  //   error             { error, status }, written in place of done
  //   drop              the socket is destroyed after the last piece, and the answer is stored anyway
  //   storedAfterReads  how many reads of the conversation come back before the stored answer is in it
  // The API stores each question and its answer in the conversation, which is where a page reads an
  // answer back from after a dropped connection.
  const AGENT_REPLY = "Here is what the dashboard shows for that.";
  let agentStream = null;
  let agentAsked = 0;
  let agentTalk = {};
  let agentPending = {};
  let agentPhotos = 0;
  function agentAnswer(body) {
    const s = agentStream || { pieces: ["Here is what ", "the dashboard shows ", "for that."] };
    agentStream = null;
    agentAsked += 1;
    const conversationId = (body && body.conversationId) || "ag-" + agentAsked;
    const pause = s.pause || 0;
    const steps = [{ event: "meta", data: { conversationId, requestId: "rq-" + agentAsked } }];
    let text = "";
    let total = 0;
    (s.pieces || []).forEach((p) => {
      if (p === RESET) { steps.push({ event: "reset", data: {}, pause }); total += pause; text = ""; return; }
      if (p && typeof p.release === "function") { steps.push({ hold: p }); return; }
      steps.push({ event: "delta", data: { text: String(p) }, pause });
      total += pause;
      text += String(p);
    });
    const done = Object.assign({ reply: text, conversationId }, s.done || {});
    if (s.error) { steps.push({ event: "error", data: s.error, pause }); total += pause; }
    else if (s.drop) steps.push({ drop: true });
    else steps.push({ event: "done", data: done });
    if (!s.error) {
      const answer = { role: "assistant", text: done.reply };
      ["citedDocs", "degraded", "noProcedure"].forEach((k) => { if (done[k] !== undefined) answer[k] = done[k]; });
      agentTalk[conversationId] = (agentTalk[conversationId] || []).concat([{ role: "user", text: (body && body.text) || "" }]);
      if (s.storedAfterReads) agentPending[conversationId] = { message: answer, reads: s.storedAfterReads };
      else agentTalk[conversationId].push(answer);
    }
    const log = s.log || { wrote: [] };
    const events = steps.filter((x) => x.event).map((x) => ({ event: x.event, data: x.data }));
    return { steps, events, done, error: s.error || null, total, log };
  }
  function agentConversation(id) {
    const pending = agentPending[id];
    if (pending) {
      if (pending.reads > 0) pending.reads -= 1;
      else { agentTalk[id] = (agentTalk[id] || []).concat([pending.message]); delete agentPending[id]; }
    }
    return (AGENT_CONVERSATIONS[id] || []).concat(agentTalk[id] || []);
  }

  const NOTIFICATION_TYPES = [
    { type: "time_off", label: "Time off requests", keyed: false, allowOutsideEmail: true },
    { type: "issue", label: "Issues", keyed: false, allowOutsideEmail: true },
    { type: "form", label: "Reports filed from the app", keyed: true, allowOutsideEmail: true },
    { type: "hr_case", label: "Speak Up", keyed: false, allowOutsideEmail: false },
    { type: "hr_case_fallback", label: "Speak Up fallback", keyed: false, allowOutsideEmail: false },
  ];
  // Both forms start on the link to the app, which is what the API does.
  const NOTIFICATION_FORMS = [
    { code: "OCSA-FRM-016", title: "Safety Incident Report", delivery: "app_link" },
    { code: "OCSA-FRM-021", title: "Biohazard Incident and Exposure Report", delivery: "app_link" },
  ];
  const NOTIFICATION_RECIPIENTS = [
    { id: "nr-1", subjectType: "time_off", subjectKey: "", isActive: true, viaEmail: true, viaInApp: true, user: { id: seed.STAFF[0].id, name: seed.STAFF[0].name, role: seed.STAFF[0].role } },
    { id: "nr-2", subjectType: "issue", subjectKey: "", isActive: true, viaEmail: false, viaInApp: true, user: { id: seed.STAFF[1].id, name: seed.STAFF[1].name, role: seed.STAFF[1].role } },
    { id: "nr-3", subjectType: "form", subjectKey: "", isActive: true, viaEmail: true, viaInApp: true, user: { id: seed.STAFF[0].id, name: seed.STAFF[0].name, role: seed.STAFF[0].role } },
    { id: "nr-4", subjectType: "form", subjectKey: "OCSA-FRM-016", isActive: true, viaEmail: true, viaInApp: false, email: "reports@example.invalid" },
  ];
  // hand: 4 rows set, over three kinds. One is an outside address, on one form.

  const CHAT_CHANNELS = [
    { id: "ch-1", site_id: S[0].id, name: S[0].name, unread: 2, last_message_at: seed.shift(0) + "T21:00:00Z" },
    { id: "ch-2", site_id: S[1].id, name: S[1].name, unread: 0, last_message_at: seed.shift(-2) + "T13:00:00Z" },
  ];
  // text is what Messages and a site's chat draw. The last one is a word the word table carries, so a
  // message sent through the table by mistake would come back as another word.
  const CHAT_MESSAGES = [
    { id: "cm-1", senderId: "u-staff-5", senderName: "Tomasz Wisniewski", senderRole: "custodial_lead", body: "Lobby is done for the night.", text: "Lobby is done for the night.", sentAt: seed.shift(0) + "T20:45:00Z" },
    { id: "cm-2", senderId: "u-admin-1", senderName: "Dana Whitlock", senderRole: "admin", body: "Thank you, logged.", text: "Thank you, logged.", sentAt: seed.shift(0) + "T21:00:00Z" },
    { id: "cm-3", senderId: "u-staff-5", senderName: "Tomasz Wisniewski", senderRole: "custodial_lead", body: "Done", text: "Done", sentAt: seed.shift(0) + "T21:05:00Z" },
  ];

  const DM_INBOX = [
    { channelId: "dm-1", staffId: "u-staff-5", staffName: "Tomasz Wisniewski", staffRole: "custodial_lead", lastMessage: "Lobby is done for the night.", lastAt: seed.shift(0) + "T20:45:00Z", unread: 1 },
    { channelId: "dm-2", staffId: "u-staff-6", staffName: "Ngozi Okonkwo", staffRole: "custodial_laborer", lastMessage: "Restrooms restocked.", lastAt: seed.shift(-2) + "T13:00:00Z", unread: 0 },
  ];
  // hand: 2 private conversations, 1 unread.

  const SHIFT_SESSIONS = {
    date: seed.TODAY,
    sites: [
      { siteId: S[0].id, siteName: S[0].name, people: [
        { sessionId: "ss-1", userId: "u-staff-5", name: "Tomasz Wisniewski", sessionDate: seed.TODAY, startedAt: seed.shift(0) + "T22:05:00Z", buildingName: "North Wing", floorNumber: "3", tasksCompleted: 6, tasksTotal: 8 },
        { sessionId: "ss-2", userId: "u-staff-9", name: "Yuki Tanabe", sessionDate: seed.TODAY, startedAt: seed.shift(0) + "T22:10:00Z", buildingName: "South Wing", floorNumber: "2", tasksCompleted: 3, tasksTotal: 7 },
      ] },
      { siteId: S[1].id, siteName: S[1].name, people: [
        { sessionId: "ss-3", userId: "u-staff-6", name: "Ngozi Okonkwo", sessionDate: seed.TODAY, startedAt: seed.shift(0) + "T10:30:00Z", buildingName: "Clinic", floorNumber: "1", tasksCompleted: 9, tasksTotal: 9 },
      ] },
      { siteId: S[2].id, siteName: S[2].name, people: [
        { sessionId: "ss-4", userId: "u-staff-7", name: "Elena Barbosa", sessionDate: seed.TODAY, startedAt: seed.shift(0) + "T23:00:00Z", buildingName: "Dock A", floorNumber: "1", tasksCompleted: 1, tasksTotal: 5 },
      ] },
    ],
  };
  // hand: 4 people started today, which is OVERVIEW.clockedInNow.

  // Keyed on task_id, with resolution_status, which is what the Assigned Tasks page reads.
  const ASSIGNED_TASKS = [
    { task_id: "at-1", id: "at-1", label: "Strip and refinish lobby", site_id: S[0].id, site_name: S[0].name, zone: "Lobby", building_name: "North Wing", floor_number: "1", user_id: "u-staff-5", assigned_to_name: "Tomasz Wisniewski", created_by_name: "Dana Whitlock", resolution_status: "in_progress", status: "in_progress", priority: "urgent", cims_category: "SD", due_date: seed.shift(1), due_time: "22:00", task_created_at: seed.shift(-2) + "T09:00:00Z", description: "Strip, seal and finish the lobby floor." },
    { task_id: "at-2", id: "at-2", label: "Restock clinic restrooms", site_id: S[1].id, site_name: S[1].name, zone: "Restroom", building_name: "Clinic", floor_number: "1", user_id: "u-staff-6", assigned_to_name: "Ngozi Okonkwo", created_by_name: "Dana Whitlock", resolution_status: "resolved", status: "completed", priority: "standard", cims_category: "SD", due_date: seed.shift(0), due_time: "14:00", task_created_at: seed.shift(-3) + "T09:00:00Z", resolved_at: seed.shift(0) + "T13:30:00Z", resolution_note: "Restocked all four restrooms.", description: "" },
    { task_id: "at-3", id: "at-3", label: "Pressure wash dock apron", site_id: S[2].id, site_name: S[2].name, zone: "Dock", building_name: "Dock A", floor_number: "1", user_id: "u-staff-7", assigned_to_name: "Elena Barbosa", created_by_name: "Marcus Ferreira", resolution_status: "pending", status: "pending", priority: "standard", cims_category: "HSE", due_date: seed.shift(3), due_time: "06:00", task_created_at: seed.shift(-1) + "T09:00:00Z", description: "" },
  ];
  // hand: 3 tasks, one per site. in_progress 1, resolved 1, pending 1.

  // What the API has answered a checklist item with since Step 118: display, the item's words in the
  // language the call asked for. The item's own label, description and zone stay the English they
  // were saved in, which is what a screen that edits the item reads. at-3 has no Spanish here, so it
  // arrives with no display at all, and the English a screen falls back to is on screen as well.
  const TASK_WORDS_ES = {
    "at-1": { label: "Decapar y encerar el vest\u00edbulo", description: "Decapar, sellar y encerar el piso del vest\u00edbulo.", zone: "Vest\u00edbulo" },
    "at-2": { label: "Reabastecer los ba\u00f1os de la cl\u00ednica", description: "", zone: "Ba\u00f1o" },
  };
  const withDisplay = (item, lang) => {
    const es = TASK_WORDS_ES[item.id];
    if (!es) return item;
    const say = (field) => (lang === "es" && item[field] ? es[field] : item[field]);
    return Object.assign({}, item, { display: { label: say("label"), description: say("description"), zone: say("zone") } });
  };
  // And a pick list choice, displayLabel: its label in the language the call asked for. The label
  // stays the English it was saved in, which is what the screen that edits the choice reads.
  const CHOICE_WORDS_ES = {
    "Service Delivery": "Prestaci\u00f3n del servicio", "Health, Safety and Environment": "Salud, seguridad y medio ambiente",
    "Green Buildings": "Edificios sostenibles", "Chemical": "Qu\u00edmico", "Consumable": "Consumible", "Tool": "Herramienta",
    "Each": "Unidad", "Case": "Caja", "Gallon": "Gal\u00f3n", "High": "Alta", "Medium": "Media", "Low": "Baja",
    "Lobby": "Vest\u00edbulo", "Restroom": "Ba\u00f1o", "Dock": "Muelle", "Vacation": "Vacaciones", "Sick": "Enfermedad",
    "Standard": "Est\u00e1ndar", "Urgent": "Urgente", "Training": "Capacitaci\u00f3n", "Compliance": "Cumplimiento", "Other": "Otro",
    "Atrium": "Atrio", "Loading Bay": "Zona de carga", "North Wing": "Ala norte", "Floor 3": "Piso 3",
  };
  const withChoiceWords = (values, lang) => (values || []).map((v) => Object.assign({}, v, {
    displayLabel: lang === "es" && CHOICE_WORDS_ES[v.label] ? CHOICE_WORDS_ES[v.label] : v.label,
  }));
  const lookupsIn = (lang) => LOOKUPS.map((c) => Object.assign({}, c, { values: withChoiceWords(c.values, lang) }));

  const siteTasks = (siteId) => ASSIGNED_TASKS.filter((t) => t.site_id === siteId).map((t) => ({
    id: t.id, label: t.label, zone: t.zone, priority: t.priority, cims_category: t.cims_category,
    building_name: t.building_name, floor_number: t.floor_number, assigned_to_name: t.assigned_to_name,
    media_required: false, description: "",
  }));

  // Timeline entries, shaped to what both timelines read: createdAt, actionType, actorName,
  // description, entityType, entityId. getTlCategory calls actionType.includes, so actionType is
  // never absent.
  const timelineRows = (name) => [
    { id: "tl-1", createdAt: seed.shift(0) + "T22:05:00Z", actionType: "clock_in", actorName: name, description: name + " started a shift at " + S[0].name, entityType: "shift_session", entityId: "ss-1", metadata: { site: S[0].name, floor: "3" } },
    { id: "tl-2", createdAt: seed.shift(-1) + "T14:05:00Z", actionType: "issue_reported", actorName: name, description: "Lobby floor scuffed after delivery", entityType: "issue", entityId: "i-1", metadata: {} },
    { id: "tl-3", createdAt: seed.shift(-3) + "T16:20:00Z", actionType: "task_completed", actorName: name, description: "Restock clinic restrooms", entityType: "task", entityId: "at-2", metadata: {} },
    { id: "tl-4", createdAt: seed.shift(-6) + "T09:00:00Z", actionType: "supply_logged", actorName: name, description: "Logged four cases of can liner", entityType: "supply_usage", entityId: "su-1", metadata: {} },
  ];
  // hand: 4 timeline entries, in four categories: clock, issues, tasks and supplies.

  const userProfile = (id) => {
    const u = state.staff.find((s) => s.id === id) || state.staff[0];
    return {
      user: Object.assign({}, u, {
        firstName: u.first_name, lastName: u.last_name, employeeId: u.employee_id,
        hireDate: u.hire_date, preferredLanguage: u.preferred_language,
        photoUrl: null, pinSetAt: seed.shift(-100) + "T12:00:00Z",
        emergencyContactName: "T. Almeida", emergencyContactPhone: "2155559100",
      }),
      assignments: [
        { id: "as-1", site_id: S[0].id, site_name: S[0].name, is_active: true, assigned_at: seed.shift(-200), role_at_site: "Lead" },
        { id: "as-2", site_id: S[1].id, site_name: S[1].name, is_active: false, assigned_at: seed.shift(-400), role_at_site: "Porter" },
      ],
      certifications: [
        { id: "cert-1", name: "Bloodborne pathogen awareness", issued_on: seed.shift(-300), expires_on: seed.shift(60), issuer: "In-house" },
      ],
      stats: { shiftsLast30: 14, tasksCompleted: 96, issuesReported: 3 },
    };
  };

  // Shaped to what the site profile reads: site, staff, zones, floorPlans, taskCount,
  // issueSummary, inspectionSummary, marketplaceSummary, upcomingShifts, supplies.
  const siteProfile = (id) => {
    const s0 = state.sites.find((x) => x.id === id) || state.sites[0];
    const staffHere = state.staff.filter((st) => st.site_id === s0.id);
    return {
      site: {
        id: s0.id, name: s0.name, status: s0.status,
        address_line: s0.address, city: s0.city, state: s0.state, zip_code: s0.zip,
        client_name: "Fairhaven Property Group", prime_contractor: "None",
        client_contact_name: "R. Villanueva", client_contact_email: "contact@fairhavenpg.example.invalid", client_contact_phone: "2155559200",
        contract_type: "Fixed monthly", contract_value_monthly: 18400, billing_frequency: "Monthly",
        contract_start_date: seed.shift(-400), contract_end_date: seed.shift(330),
        site_notes: "Nightly cleaning of occupied floors and daily restroom service.",
      },
      staff: staffHere.map((st) => ({ id: st.id, name: st.name, role: st.role, status: st.status })),
      zones: ["Lobby", "Restroom", "Corridor", "Dock"],
      floorPlans: [{ id: "fp-1", label: "North Wing, floor 3", file_url: "", uploaded_at: seed.shift(-120) + "T12:00:00Z" }],
      taskCount: ASSIGNED_TASKS.filter((t0) => t0.site_id === s0.id).length,
      issueSummary: { open_count: 1, in_progress_count: 1, resolved_count: 2 },
      inspectionSummary: { avg_score: 90, total: 2, last_inspection: seed.shift(-7) },
      marketplaceSummary: { total_pickups: 2, worked: 1, pending: 1 },
      upcomingShifts: (state.schedule || SCHEDULE).filter((sh) => sh.site_id === s0.id).map((sh) => ({
        id: sh.id, scheduled_date: sh.scheduled_date, start_time: sh.start_time, end_time: sh.end_time,
        user_name: sh.user_name, status: sh.status,
      })),
      supplies: SUPPLIES.slice(0, 2).map((sp0) => ({ id: "ss-" + sp0.id, supply_id: sp0.id, name: sp0.name, par_level: 12, unit: sp0.unit, current_stock: sp0.current_stock })),
    };
  };
  // hand: Harbor Point Center holds 4 of the 12 staff rows (every third row from the first), one
  // assigned task, and open issues 1 + 1 = 2 on the tile.

  // -------------------------------------------------------------------------
  // The router.
  // -------------------------------------------------------------------------
  const ok = (json) => ({ status: 200, json });
  const created = (json) => ({ status: 201, json });

  function matchRefusal(method, path) {
    for (let i = 0; i < refusals.length; i += 1) {
      const r = refusals[i];
      if (r.method && r.method.toUpperCase() !== method.toUpperCase()) continue;
      const hit = r.path instanceof RegExp ? r.path.test(path) : path.indexOf(r.path) >= 0;
      if (!hit) continue;
      if (r.once) refusals.splice(i, 1);
      return r;
    }
    return null;
  }

  // `lang` is the language the call asked for, which is the language the API answers in.
  function route(method, path, query, body, lang) {
    const q = (k) => query.get(k);
    const idAfter = (prefix) => path.slice(prefix.length).split("/")[0];

    // --- auth -------------------------------------------------------------
    if (path === "/api/auth/login") {
      const who = Object.keys(seed.PEOPLE).find((k) => seed.PEOPLE[k].login.phone === (body && body.phone));
      if (!who || seed.PEOPLE[who].login.pin !== (body && body.pin)) {
        return { status: 401, json: { error: "Phone number or PIN is incorrect" } };
      }
      signedInAs = who;
      const u = Object.assign({}, seed.PEOPLE[who]);
      delete u.login;
      return ok({ token: "audit-token-" + who, user: u });
    }
    if (path === "/api/auth/me") { const u = Object.assign({}, person()); delete u.login; return ok({ user: u }); }

    // --- shell ------------------------------------------------------------
    if (path === "/api/sites" && method === "GET") return ok(state.sites);
    if (path === "/api/users" && method === "GET") return ok(state.staff);
    if (path === "/api/lookups/all") return ok(lookupsIn(lang));
    if (path === "/api/settings" && method === "GET") return ok(SETTINGS);
    if (path === "/api/settings" && (method === "PUT" || method === "PATCH")) return ok(Object.assign(SETTINGS, body || {}));
    if (path === "/api/reports/overview") return ok(seed.OVERVIEW);
    if (path === "/api/hr-cases/queue-count") return ok(CASE_QUEUE);
    if (path === "/api/notifications/unread-count") return ok({ unread: state.notifications ? state.notifications.filter((n) => !n.readAt).length : UNREAD_COUNT });
    if (path === "/api/notifications" && method === "GET") {
      if (!state.notifications) state.notifications = clone(NOTIFICATIONS);
      return ok({ notifications: state.notifications, unread: state.notifications.filter((n) => !n.readAt).length });
    }
    if (path === "/api/notifications/read-all" && method === "POST") {
      if (!state.notifications) state.notifications = clone(NOTIFICATIONS);
      state.notifications.forEach((n) => { if (!n.readAt) n.readAt = seed.NOW_ISO; });
      return ok({ ok: true, unread: 0 });
    }
    if (/^\/api\/notifications\/[^/]+\/read$/.test(path) && method === "POST") {
      if (!state.notifications) state.notifications = clone(NOTIFICATIONS);
      const id = path.split("/")[3];
      const n = state.notifications.find((x) => x.id === id);
      if (n) n.readAt = seed.NOW_ISO;
      return ok({ ok: true });
    }

    // --- staff ------------------------------------------------------------
    if (path.startsWith("/api/users/profile/photo")) return ok({ url: "" });
    if (path.startsWith("/api/users/profile/")) return ok(userProfile(idAfter("/api/users/profile/")));
    if (path.startsWith("/api/users/timeline-detail/")) {
      return ok({
        found: true,
        entry: timelineRows("Tomasz Wisniewski")[1],
        record: { id: "i-1", title: "Lobby floor scuffed after delivery", site_name: S[0].name, zone: "Lobby", severity: "high", status: "open", reported_at: seed.shift(-1) + "T14:05:00Z" },
        photos: [],
        relatedItems: [{ id: "at-1", label: "Strip and refinish lobby", kind: "task", description: "Strip and refinish lobby" }],
      });
    }
    if (path.startsWith("/api/users/timeline/")) {
      const rows = timelineRows(person().firstName + " " + person().lastName);
      const cat = q("category");
      const filtered = cat && cat !== "all" ? rows.filter((r) => r.actionType.indexOf(cat.replace(/s$/, "")) >= 0) : rows;
      return ok({ entries: filtered, total: filtered.length });
    }
    if (/^\/api\/users\/[^/]+\/approve$/.test(path)) return ok({ message: "Approved" });
    if (/^\/api\/users\/[^/]+\/pin$/.test(path)) return ok({ message: "PIN reset" });
    if (/^\/api\/users\/[^/]+\/assignments/.test(path)) return ok({ message: "Assignment saved" });
    if (/^\/api\/users\/[^/]+\/certifications/.test(path)) return ok({ message: "Certification saved" });
    if (/^\/api\/users\/[^/]+\/permissions$/.test(path)) {
      const id = path.split("/")[3];
      const u = state.staff.find((s) => s.id === id) || state.staff[0];
      if (method === "PUT") {
        state.overrides[id] = Object.assign({}, (body && body.permissions) || {});
        return ok({ overrides: state.overrides[id], effective: effectiveMap(u, state.overrides[id]) });
      }
      const ov = state.overrides[id] || {};
      return ok({ id: u.id, name: u.name, role: u.role, capabilities: CAPABILITIES, overrides: ov, effective: effectiveMap(u, ov) });
    }
    if (/^\/api\/users\/[^/]+$/.test(path) && (method === "PATCH" || method === "PUT")) {
      const id = path.split("/")[3];
      const u = state.staff.find((s) => s.id === id);
      if (u) Object.assign(u, body || {});
      return ok({ message: "Staff updated" });
    }
    if (path === "/api/users" && method === "POST") {
      const row = Object.assign({ id: "u-new-1", status: "pending", name: ((body && body.firstName) || "New") + " " + ((body && body.lastName) || "Person") }, body || {});
      state.staff.push(row);
      return created({ message: "Staff added", user: row });
    }

    // --- issues -----------------------------------------------------------
    if (path === "/api/issues" && method === "GET") return ok(state.issues);
    if (path === "/api/issues" && method === "POST") { const row = Object.assign({ id: "i-new" }, body || {}); state.issues.unshift(row); return created({ message: "Issue reported" }); }
    if (/^\/api\/issues\/[^/]+\/activity$/.test(path)) {
      return ok([
        { id: "ia-1", action: "reported", created_at: seed.shift(-2) + "T14:05:00Z", user_name: "Tomasz Wisniewski", details: "Reported on the night round." },
        { id: "ia-2", action: "started_work", created_at: seed.shift(-1) + "T09:00:00Z", user_name: "Marcus Ferreira", details: "" },
      ]);
    }
    if (/^\/api\/issues\/[^/]+\/photos$/.test(path)) return ok([]);
    if (/^\/api\/issues\/[^/]+\/assign/.test(path)) return ok({ message: "Task created from issue" });
    if (/^\/api\/issues\/[^/]+$/.test(path) && (method === "PATCH" || method === "PUT")) {
      const id = path.split("/")[3];
      const row = state.issues.find((x) => x.id === id);
      if (row) Object.assign(row, body || {});
      return ok({ message: "Issue updated" });
    }
    if (/^\/api\/issues\/[^/]+$/.test(path) && method === "GET") {
      const id = path.split("/")[3];
      const row = state.issues.find((x) => x.id === id) || state.issues[0];
      return ok(Object.assign({}, row, { photos: [], comments: [] }));
    }

    // --- supplies ---------------------------------------------------------
    if (path === "/api/supplies" && method === "GET") { if (!state.supplies) state.supplies = clone(SUPPLIES); return ok(state.supplies); }
    if (path === "/api/supplies" && method === "POST") { if (!state.supplies) state.supplies = clone(SUPPLIES); const row = Object.assign({ id: "sp-new", is_active: true, current_stock: 0 }, body || {}); state.supplies.push(row); return created({ message: "Supply added", supply: row }); }
    if (path === "/api/supplies/requests" && method === "GET") { if (!state.supplyRequests) state.supplyRequests = clone(SUPPLY_REQUESTS); return ok(state.supplyRequests); }
    if (/^\/api\/supplies\/requests\/[^/]+$/.test(path)) {
      if (!state.supplyRequests) state.supplyRequests = clone(SUPPLY_REQUESTS);
      const id = path.split("/")[4];
      const row = state.supplyRequests.find((r) => r.id === id);
      if (row && body) { row.status = body.status || row.status; row.admin_notes = body.adminNotes != null ? body.adminNotes : row.admin_notes; }
      return ok({ message: "Request updated" });
    }
    if (/^\/api\/supplies\/[^/]+$/.test(path) && method === "DELETE") {
      if (!state.supplies) state.supplies = clone(SUPPLIES);
      const id = path.split("/")[3];
      state.supplies = state.supplies.filter((s) => s.id !== id);
      return ok({ message: "Supply removed" });
    }
    if (/^\/api\/supplies\/[^/]+$/.test(path)) {
      if (!state.supplies) state.supplies = clone(SUPPLIES);
      const id = path.split("/")[3];
      const row = state.supplies.find((s) => s.id === id);
      if (row && body) Object.assign(row, body);
      return ok({ message: "Supply updated" });
    }

    // --- vendors and services --------------------------------------------
    if (path === "/api/vendors" && method === "GET") return ok(VENDORS);
    if (path === "/api/vendors" && method === "POST") return created({ message: "Vendor added" });
    if (/^\/api\/vendors\/[^/]+\/evaluations/.test(path)) return ok({ message: "Evaluation saved" });
    if (/^\/api\/vendors\/[^/]+\/supplies/.test(path)) return ok({ message: "Supply linked" });
    if (/^\/api\/vendors\/[^/]+$/.test(path) && method === "GET") {
      const id = path.split("/")[3];
      const v = VENDORS.find((x) => x.id === id) || VENDORS[0];
      return ok({ vendor: v, evaluations: [{ id: "ev-1", rating: 4, notes: "On time, correct paperwork.", evaluated_on: seed.shift(-30), evaluated_by_name: "Dana Whitlock" }], supplies: SUPPLIES.slice(0, 2) });
    }
    if (/^\/api\/vendors\/[^/]+$/.test(path)) return ok({ message: "Vendor updated" });
    if (path === "/api/services" && method === "GET") return ok(SERVICES);
    if (path === "/api/services" && method === "POST") return created({ message: "Service added" });
    if (/^\/api\/services\/[^/]+\/sites/.test(path)) return ok({ message: "Site linked" });
    if (/^\/api\/services\/[^/]+$/.test(path) && method === "GET") {
      const id = path.split("/")[3];
      const sv = SERVICES.find((x) => x.id === id) || SERVICES[0];
      return ok({ service: sv, sites: state.sites.slice(0, 2), supplies: SUPPLIES.slice(0, 2) });
    }
    if (/^\/api\/services\/[^/]+$/.test(path)) return ok({ message: "Service updated" });

    // --- sites ------------------------------------------------------------
    if (path.startsWith("/api/sites/profile/")) return ok(siteProfile(idAfter("/api/sites/profile/")));
    if (path.startsWith("/api/sites/chat/")) {
      return ok({ messages: CHAT_MESSAGES, total: CHAT_MESSAGES.length, channel: { id: "ch-1", name: S[0].name } });
    }
    if (/^\/api\/sites\/[^/]+\/tasks/.test(path)) {
      if (method !== "GET") return ok({ message: "Task saved" });
      const sid = path.split("/")[3];
      return ok(siteTasks(sid).map((tk) => withDisplay(tk, lang)));
    }
    if (path.startsWith("/api/sites/timeline/") || /^\/api\/sites\/[^/]+\/timeline/.test(path)) {
      const rows = timelineRows("Tomasz Wisniewski");
      const cat = q("category");
      const filtered = cat && cat !== "all" ? rows.filter((r) => r.actionType.indexOf(cat.replace(/s$/, "")) >= 0) : rows;
      return ok({ entries: filtered, total: filtered.length });
    }
    if (/^\/api\/sites\/[^/]+\/supplies\/available$/.test(path)) return ok(SUPPLIES.slice(2));
    if (/^\/api\/sites\/[^/]+\/supplies/.test(path)) return ok({ message: "Supply linked" });
    if (path === "/api/sites" && method === "POST") { const row = Object.assign({ id: "s-new", status: "active" }, body || {}); state.sites.push(row); return created({ message: "Site added" }); }
    if (/^\/api\/sites\/[^/]+$/.test(path) && method === "GET") return ok(siteProfile(path.split("/")[3]));
    if (/^\/api\/sites\/[^/]+$/.test(path)) return ok({ message: "Site updated" });

    // --- schedule, patterns, time off ------------------------------------
    if (path === "/api/schedule/calendar") {
      if (!state.schedule) state.schedule = clone(SCHEDULE);
      const site = q("site_id");
      const shifts = site ? state.schedule.filter((sh) => sh.site_id === site) : state.schedule;
      return ok({ scheduled_shifts: shifts, inspections: SCHEDULED_INSPECTIONS });
    }
    if (path === "/api/schedule" && method === "GET") { if (!state.schedule) state.schedule = clone(SCHEDULE); return ok(state.schedule); }
    if (path === "/api/schedule" && method === "POST") {
      if (!state.schedule) state.schedule = clone(SCHEDULE);
      const row = Object.assign({ id: "sh-new", status: "scheduled", user_name: "Tomasz Wisniewski", site_name: S[0].name }, body || {});
      state.schedule.push(row);
      return created({ message: "Shift scheduled", shift: row });
    }
    if (path === "/api/schedule/bulk" && method === "POST") return created({ message: "Shifts scheduled", created: 4 });
    if (path === "/api/schedule/patterns" && method === "GET") {
      if (!state.patterns) state.patterns = clone(PATTERNS);
      const status = q("status");
      const userId = q("userId"); const siteId = q("siteId");
      let rows = state.patterns.slice();
      if (status && status !== "all") rows = rows.filter((r) => r.status === status);
      if (userId) rows = rows.filter((r) => String(r.userId) === String(userId));
      if (siteId) rows = rows.filter((r) => String(r.siteId) === String(siteId));
      return ok({ patterns: rows });
    }
    if (path === "/api/schedule/patterns" && method === "POST") {
      if (!state.patterns) state.patterns = clone(PATTERNS);
      const row = Object.assign({ id: "pt-new", upcomingShifts: 6, status: "active" }, body || {});
      state.patterns.push(row);
      return created({ pattern: row, created: 6, message: "Pattern created" });
    }
    if (/^\/api\/schedule\/patterns\/[^/]+\/skip/.test(path)) return ok({ message: "That date is cancelled", pattern: (state.patterns || PATTERNS)[0] });
    if (/^\/api\/schedule\/patterns\/[^/]+$/.test(path) && method === "GET") {
      if (!state.patterns) state.patterns = clone(PATTERNS);
      const id = path.split("/")[4];
      const p = state.patterns.find((x) => x.id === id) || state.patterns[0];
      return ok({ pattern: p, shifts: (state.schedule || SCHEDULE).filter((s) => s.pattern_id === p.id), skips: [] });
    }
    if (/^\/api\/schedule\/patterns\/[^/]+$/.test(path)) {
      if (!state.patterns) state.patterns = clone(PATTERNS);
      const id = path.split("/")[4];
      const p = state.patterns.find((x) => x.id === id);
      if (p && body) Object.assign(p, body);
      if (method === "DELETE") { state.patterns = state.patterns.filter((x) => x.id !== id); return ok({ message: "Pattern ended" }); }
      return ok({ pattern: p, message: "Pattern updated", changed: 4 });
    }
    if (/^\/api\/schedule\/[^/]+$/.test(path) && method === "DELETE") {
      if (!state.schedule) state.schedule = clone(SCHEDULE);
      const id = path.split("/")[3];
      state.schedule = state.schedule.filter((s) => s.id !== id);
      return ok({ message: "Shift removed" });
    }
    if (/^\/api\/schedule\/[^/]+$/.test(path)) {
      if (!state.schedule) state.schedule = clone(SCHEDULE);
      const id = path.split("/")[3];
      const row = state.schedule.find((s) => s.id === id);
      if (row && body) Object.assign(row, body);
      return ok({ message: "Shift updated" });
    }
    if (path === "/api/time-off" && method === "GET") {
      if (!state.timeOff) state.timeOff = clone(TIME_OFF);
      const status = q("status") || "requested";
      const userId = q("userId") || "";
      let rows = state.timeOff.slice();
      if (status && status !== "all") rows = rows.filter((r) => r.status === status);
      if (userId) rows = rows.filter((r) => String(r.userId) === String(userId));
      return ok({ requests: rows, total: rows.length });
    }
    if (/^\/api\/time-off\/[^/]+\/(approve|deny)$/.test(path)) {
      if (!state.timeOff) state.timeOff = clone(TIME_OFF);
      const parts = path.split("/");
      const id = parts[3]; const kind = parts[4];
      const row = state.timeOff.find((r) => r.id === id);
      if (!row) return { status: 404, json: { error: "That request is gone" } };
      if (row.status !== "requested") return { status: 409, json: { error: "Someone else decided this already", code: "already_decided" } };
      row.status = kind === "deny" ? "denied" : "approved";
      row.decidedByName = person().firstName + " " + person().lastName;
      row.decidedAt = seed.NOW_ISO;
      row.decisionNote = (body && body.note) || null;
      return ok({ request: row });
    }
    if (/^\/api\/time-off\/[^/]+$/.test(path)) {
      if (!state.timeOff) state.timeOff = clone(TIME_OFF);
      const id = path.split("/")[3];
      const row = state.timeOff.find((r) => r.id === id) || state.timeOff[0];
      return ok({ request: row });
    }

    // --- shift pickups ----------------------------------------------------
    if (path === "/api/pickups" && method === "GET") {
      if (!state.pickups) state.pickups = clone(PICKUPS);
      const status = q("status");
      const rows = status ? state.pickups.filter((p) => p.status === status) : state.pickups;
      return ok(rows);
    }
    if (path === "/api/pickups" && method === "POST") {
      if (!state.pickups) state.pickups = clone(PICKUPS);
      const row = Object.assign({ id: "pk-new", status: "open", site_name: S[0].name, posted_at: seed.NOW_ISO }, body || {});
      state.pickups.unshift(row);
      return created({ message: "Open shift posted", pickup: row });
    }
    if (path.startsWith("/api/pickups/analytics")) return ok(PICKUP_ANALYTICS);
    if (path.startsWith("/api/pickups/convert/")) return ok({ message: "Converted to an open shift" });
    if (/^\/api\/pickups\/[^/]+\/(approve|deny|approve-drop|deny-drop|release)$/.test(path)) {
      if (!state.pickups) state.pickups = clone(PICKUPS);
      const parts = path.split("/");
      const id = parts[3]; const act = parts[4];
      const row = state.pickups.find((p) => p.id === id);
      if (!row) return { status: 404, json: { error: "That shift is gone" } };
      if (act === "approve") row.status = "approved";
      if (act === "deny") row.status = "open";
      if (act === "approve-drop") { row.status = "open"; row.assigned_to_name = null; }
      if (act === "deny-drop") row.status = "scheduled";
      if (act === "release") { row.status = "open"; row.claimed_by_name = null; }
      return ok({ message: "Done", pickup: row });
    }
    if (/^\/api\/pickups\/[^/]+$/.test(path) && method === "GET") {
      if (!state.pickups) state.pickups = clone(PICKUPS);
      const id = path.split("/")[3];
      return ok(state.pickups.find((p) => p.id === id) || state.pickups[0]);
    }
    if (/^\/api\/pickups\/[^/]+$/.test(path)) return ok({ message: "Shift updated" });

    // --- assigned tasks ---------------------------------------------------
    if (path.startsWith("/api/clock/tasks/assigned-all")) return ok(ASSIGNED_TASKS.map((tk) => withDisplay(tk, lang)));
    if (path.startsWith("/api/clock/tasks/activity/")) {
      return ok([
        { id: "ta-1", action: "assigned", created_at: seed.shift(-2) + "T09:05:00Z", user_name: "Dana Whitlock", details: "" },
        { id: "ta-2", action: "started_work", created_at: seed.shift(-1) + "T18:10:00Z", user_name: "Tomasz Wisniewski", details: "" },
      ]);
    }
    if (path.startsWith("/api/shift-sessions/by-site")) return ok(SHIFT_SESSIONS);

    // --- inspections ------------------------------------------------------
    if (path === "/api/inspections/templates" && method === "GET") return ok(INSPECTION_TEMPLATES);
    if (path === "/api/inspections/templates" && method === "POST") return created({ message: "Template created", template: { id: "tp-new", name: (body && body.name) || "New template", item_count: 0, max_total_score: 0, is_active: true } });
    if (/^\/api\/inspections\/templates\/[^/]+\/items/.test(path)) return ok({ message: "Item added" });
    if (/^\/api\/inspections\/templates\/[^/]+$/.test(path) && method === "GET") {
      const id = path.split("/")[4];
      const tp = INSPECTION_TEMPLATES.find((x) => x.id === id) || INSPECTION_TEMPLATES[0];
      return ok({ template: tp, items: INSPECTION_ITEMS });
    }
    if (/^\/api\/inspections\/templates\/[^/]+$/.test(path)) return ok({ message: "Template updated" });
    if (path === "/api/inspections/scheduled" && method === "GET") {
      const done = seed.INSPECTION_SCORES.map((r) => Object.assign({}, r, { status: "completed", assigned_to_name: r.completed_by_name, template_id: "tp-1" }));
      return ok(SCHEDULED_INSPECTIONS.concat(done));
    }
    // hand: 2 pending plus 4 completed = 6 rows in one list, which the page splits by status.
    if (path === "/api/inspections/scheduled" && method === "POST") return created({ message: "Inspection scheduled" });
    // The detail view reads the row's own fields at the top level plus result, items and scores,
    // and matches a score to an item by template_item_id.
    if (/^\/api\/inspections\/scheduled\/[^/]+$/.test(path) && method === "GET") {
      const id = path.split("/")[4];
      const found = SCHEDULED_INSPECTIONS.concat(seed.INSPECTION_SCORES).find((x) => x.id === id) || seed.INSPECTION_SCORES[0];
      const scores = INSPECTION_ITEMS.map((it, i) => ({
        template_item_id: it.id, score: [9, 6, 7][i],
        notes: i === 1 ? "Handrail needs a wipe." : "", photo_url: null,
      }));
      return ok(Object.assign({}, found, {
        template_name: found.template_name || "Monthly quality walk",
        assigned_name: found.assigned_to_name || found.completed_by_name || "Marcus Ferreira",
        status: found.status || "completed",
        items: INSPECTION_ITEMS,
        scores: scores,
        result: {
          total_score: 22, max_possible_score: 30,
          completed_at: found.scheduled_date + "T18:00:00Z",
          completed_by_name: found.completed_by_name || "Marcus Ferreira",
          overall_notes: found.overall_notes || "",
        },
      }));
    }
    // hand: the three item scores 9 + 6 + 7 = 22 of a possible 10 + 10 + 10 = 30, which the detail
    // view shows as 73 percent and the CSV writes as its TOTAL row.
    if (/^\/api\/inspections\/scheduled\/[^/]+$/.test(path)) return ok({ message: "Inspection updated" });
    if (path.startsWith("/api/inspections/analytics/dashboard-summary")) return ok(seed.INSPECTION_DASHBOARD_SUMMARY);
    if (path.startsWith("/api/inspections/analytics/scores-over-time")) return ok(seed.INSPECTION_SCORES);
    if (path.startsWith("/api/inspections/analytics/site-comparison")) return ok(seed.INSPECTION_SITE_COMPARISON);
    if (path.startsWith("/api/inspections/analytics/lowest-items")) return ok(seed.INSPECTION_LOWEST_ITEMS);
    if (path.startsWith("/api/inspections/analytics/category-breakdown")) {
      return ok([
        { cims_category: "SD", avg_score_pct: 88, item_count: 6 },
        { cims_category: "HSE", avg_score_pct: 71, item_count: 3 },
        { cims_category: "GB", avg_score_pct: 94, item_count: 1 },
      ]);
    }
    if (path.startsWith("/api/inspections/analytics/export")) {
      return ok(seed.INSPECTION_SCORES.flatMap((ins) => INSPECTION_ITEMS.map((it, i) => Object.assign({}, ins, {
        item_label: it.label, item_zone: it.zone, item_cims_category: it.cims_category,
        item_score: [9, 6, 7][i], item_max_score: it.max_score, item_score_pct: [90, 60, 70][i], item_notes: "",
      }))));
    }
    // hand: 4 inspections x 3 items = 12 export rows, plus one header row = 13 lines.

    // --- report engine ----------------------------------------------------
    if (path === "/api/report-engine/definitions" && method === "GET") return ok(REPORT_DEFS);
    if (path === "/api/report-engine/definitions" && method === "POST") return created({ message: "Report saved", definition: Object.assign({ id: "rd-new", is_system: false }, body || {}) });
    if (/^\/api\/report-engine\/definitions\/[^/]+$/.test(path) && method === "DELETE") return ok({ message: "Report deleted" });
    if (/^\/api\/report-engine\/definitions\/[^/]+$/.test(path)) return ok({ message: "Report saved", definition: Object.assign({ id: path.split("/")[4] }, body || {}) });
    if (path === "/api/report-engine/issue-timing") {
      const sev = q("severity");
      const site = q("site_id");
      const d = clone(seed.ISSUE_TIMING);
      d.bucket = q("bucket") || "week";
      if (site) d.by_site = d.by_site.filter((r) => r.site_id === site);
      if (sev) d.summary.open_by_severity = Object.assign({ high: 0, medium: 0, low: 0 }, { [sev]: seed.ISSUE_TIMING.summary.open_by_severity[sev] });
      return ok(d);
    }
    if (path === "/api/report-engine/supply-usage") {
      const d = clone(seed.SUPPLY_USAGE);
      d.bucket = q("bucket") || "week";
      const site = q("site_id");
      if (site) d.by_site = d.by_site.filter((r) => r.site_id === site);
      return ok(d);
    }
    if (path === "/api/reports/task-completion") return ok(seed.TASK_COMPLETION);
    if (path === "/api/reports/issues") return ok(seed.ISSUES_SNAPSHOT);
    if (path === "/api/reports/chemical-usage") {
      return ok({ chemicals: SUPPLIES.filter((s) => s.category === "chemical").map((s) => ({
        name: s.name, qr_code: s.qr_code, is_green_certified: s.is_green_certified ? "Yes" : "No",
        epa_reg_number: s.epa_reg_number || "", site_name: S[0].name, total_quantity: s.current_stock, unit: s.unit,
      })) });
    }
  

    // --- HR ---------------------------------------------------------------
    if (path.startsWith("/api/hr/documents")) {
      if (method !== "GET") return ok({ message: "Document saved" });
      const uid = q("user_id");
      return ok(uid ? HR_DOCUMENTS.filter((d) => d.user_id === uid) : HR_DOCUMENTS);
    }
    if (path.startsWith("/api/hr/training")) {
      if (method !== "GET") return ok({ message: "Training record saved" });
      const uid = q("user_id");
      return ok(uid ? HR_TRAINING.filter((d) => d.user_id === uid) : HR_TRAINING);
    }
    if (path === "/api/hr/employees-summary") {
      return ok(state.staff.map((s) => ({
        user_id: s.id, name: s.name, role: s.role, status: s.status,
        document_count: 3, training_count: 2, onboarding_pct: 80,
        earliest_expiry: s.status === "active" ? seed.shift(25) : null,
      })));
    }
    if (path === "/api/hr/compliance") return ok(HR_COMPLIANCE);
    if (path.startsWith("/api/hr/employee-folder/")) {
      const uid = idAfter("/api/hr/employee-folder/");
      const u = state.staff.find((s) => s.id === uid) || state.staff[0];
      return ok({ user: u, documents: HR_DOCUMENTS.slice(0, 3), training: HR_TRAINING.slice(0, 2), onboarding: HR_ONBOARDING, submissions: JOTFORM_SUBMISSIONS.slice(0, 1) });
    }
    if (path.startsWith("/api/hr/onboarding")) {
      if (method !== "GET") return ok({ message: "Onboarding updated" });
      return ok(HR_ONBOARDING);
    }

    // --- cases ------------------------------------------------------------
    if (path === "/api/hr-cases" && method === "GET") {
      const status = q("status");
      const rows = status ? HR_CASES.filter((c) => c.status === status) : HR_CASES;
      return ok({ cases: rows });
    }
    if (path === "/api/hr-cases" && method === "POST") return created({ message: "Case opened" });
    if (path === "/api/contacts/case-subjects") return ok([
      { value: "workplace_concern", label: "Workplace concern" },
      { value: "safety", label: "Safety" },
      { value: "pay", label: "Pay" },
    ]);
    if (/^\/api\/hr-cases\/[^/]+\/access-log$/.test(path)) {
      return ok({ entries: [{ id: "ca-1", at: seed.shift(-1) + "T10:00:00Z", who: "Dana Whitlock", what: "Opened the case" }] });
    }
    if (/^\/api\/hr-cases\/[^/]+$/.test(path) && method === "GET") {
      const id = path.split("/")[3];
      const c = HR_CASES.find((x) => x.id === id) || HR_CASES[0];
      return ok(Object.assign({}, c, { notes: [{ id: "cn-1", body: "Left a message for the person who raised it.", createdAt: seed.shift(-1) + "T10:00:00Z", authorName: "Dana Whitlock" }] }));
    }
    if (/^\/api\/hr-cases\/[^/]+/.test(path)) {
      const id = path.split("/")[3];
      const c = HR_CASES.find((x) => x.id === id) || HR_CASES[0];
      return ok(Object.assign({}, c, body || {}, { message: "Case updated" }));
    }

    // --- forms and Jotform ------------------------------------------------
    if (path === "/api/jotform/forms" && method === "GET") return ok(JOTFORM_FORMS);
    if (path === "/api/jotform/forms/sync") return ok({ message: "Synced 2 forms", synced: 2 });
    if (/^\/api\/jotform\/forms\/[^/]+$/.test(path)) return ok({ message: "Form updated" });
    if (path.startsWith("/api/jotform/submissions/force-fetch")) return ok({ message: "Fetched 1 submission" });
    if (path.startsWith("/api/jotform/submissions/sync")) return ok({ message: "Synced 2 submissions", synced: 2 });
    if (path === "/api/jotform/submissions") {
      const uid = q("user_id");
      const rows = uid ? JOTFORM_SUBMISSIONS.filter((x) => x.user_id === uid) : JOTFORM_SUBMISSIONS;
      return ok({ submissions: rows, total: rows.length });
    }
    if (path.startsWith("/api/jotform/submissions/")) {
      const id = idAfter("/api/jotform/submissions/");
      const row = JOTFORM_SUBMISSIONS.find((x) => x.id === id) || JOTFORM_SUBMISSIONS[0];
      return ok({
        meta: row,
        live: { answers: [
          { qid: "1", text: "Where did it happen", answer: S[0].name },
          { qid: "2", text: "What happened", answer: "A delivery pallet scuffed the lobby floor." },
        ] },
        fetchError: null,
      });
    }
    // The PDF route answers a binary body, so the driver serves it as a PDF rather than as JSON.
    if (/^\/api\/jotform\/submissions\/[^/]+\/pdf$/.test(path)) {
      return { status: 200, pdf: true, json: "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n" };
    }
    if (path.startsWith("/api/jotform/pdf-access-log")) return ok({ entries: PDF_ACCESS_LOG, total: PDF_ACCESS_LOG.length });
    if (path === "/api/jotform/config") return ok({ api_key_set: true, base_url: "https://api.jotform.example.invalid", auto_link: true, locale: "en" });
    if (path.startsWith("/api/jotform/diagnostic") || path.startsWith("/api/jotform/sync-diagnostic")) {
      return ok({ forms: JOTFORM_FORMS.map((f) => ({ form_id: f.form_id, title: f.title, cached: f.submission_count, upstream: f.submission_count, missing: 0 })), checkedAt: seed.NOW_ISO });
    }
    if (path.startsWith("/api/jotform/sync-log")) return ok([{ id: "sl-1", ran_at: seed.shift(0) + "T19:00:00Z", kind: "submissions", result: "ok", detail: "2 submissions" }]);
    if (path.startsWith("/api/jotform/submission-failures")) {
      if (method !== "GET") return ok({ message: "Marked resolved" });
      return ok([{ id: "sf-1", form_id: JOTFORM_FORMS[0].form_id, form_title: JOTFORM_FORMS[0].title, submission_id: "600000000000009", reason: "Answer set was empty", failed_at: seed.shift(-3) + "T08:00:00Z", is_resolved: false }]);
    }
    if (path === "/api/jotform/user-aliases" && method === "GET") return ok([{ id: "al-1", user_id: state.staff[4].id, user_name: state.staff[4].name, alias: "t.wisniewski", source: "manual" }]);
    if (path.startsWith("/api/jotform/user-aliases")) return ok({ message: "Alias saved" });
    if (path === "/api/jotform/users-for-linking") return ok(state.staff.map((s) => ({ id: s.id, name: s.name, email: s.email })));
    if (path === "/api/jotform/auto-link") return ok({ message: "Linked 1 submission", linked: 1 });
    if (path === "/api/jotform/pdf-backfill") return ok({ message: "Backfilled 2 PDFs", filled: 2 });
    if (path.startsWith("/api/jotform/employee-documents/")) return ok(JOTFORM_SUBMISSIONS.slice(0, 1));
    if (path === "/api/forms") return ok({ forms: FORM_LIST });
    if (path === "/api/forms/responses") {
      // Who may list decides who may open Forms at all. An admin always may; anyone else may when
      // a form names a capability they hold in its readers, which the seed marks on the person.
      if (!canListFiledForms()) return { status: 403, json: { error: "Insufficient permissions" } };
      const status = q("status") || "submitted";
      const code = q("formCode") || "";
      const rows = INCIDENT_REPORTS.filter((r) => r.status === status && (!code || r.formCode === code));
      return ok({ responses: rows });
    }
    if (/^\/api\/forms\/responses\/[^/]+\/pdf$/.test(path) && method === "GET") {
      const rid = path.split("/")[4];
      const r = INCIDENT_REPORTS.find((x) => x.id === rid) || INCIDENT_REPORTS[0];
      const name = NOTIFICATION_FORMS[0].code + "-" + String(r.id).slice(0, 8) + ".pdf";
      const headers = exposeDisposition
        ? { "Content-Disposition": 'attachment; filename="' + name + '"', "Access-Control-Expose-Headers": "Content-Disposition" }
        : { "Content-Disposition": 'attachment; filename="' + name + '"' };
      return { status: 200, pdf: true, headers: headers,
        json: "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n" };
    }
    if (/^\/api\/forms\/responses\/[^/]+\/resend$/.test(path) && method === "POST") {
      const rid = path.split("/")[4];
      const r = INCIDENT_REPORTS.find((x) => x.id === rid) || INCIDENT_REPORTS[0];
      if (r.status !== "submitted") return { status: 409, json: { error: "Only a filed report can be sent again", status: r.status } };
      const code = NOTIFICATION_FORMS[0].code;
      // hand: 3 emails and 2 app notices, and the PDF rides along only when the form is set to pdf.
      return ok({ id: r.id, formCode: code, inApp: 2, email: 3, attached: (state.formDelivery[code] || "app_link") === "pdf" });
    }
    if (/^\/api\/forms\/responses\/[^/]+\/signoff$/.test(path) && method === "POST") {
      const r = INCIDENT_REPORTS.find((x) => x.id === path.split("/")[4]);
      if (!r) return { status: 404, json: { error: "Report not found" } };
      const key = body && body.key;
      const payload = reportPayload(r);
      const keys = payload.fields.filter((f) => f.type === "signoff").map((f) => f.key);
      if (keys.indexOf(key) < 0) return { status: 400, json: { error: "That is not a sign-off on this form" } };
      if (String(r.userId || "") === String(person().id)) return { status: 403, json: { error: "You cannot sign off on your own report" } };
      if (filedState().signed[key]) return { status: 409, json: { error: "This part is already signed" } };
      if (payload.canSign.indexOf(key) < 0) return { status: 403, json: { error: "You cannot sign this part of the form" } };
      filedState().signed[key] = stampNow();
      return ok(reportPayload(r));
    }
    if (/^\/api\/forms\/responses\/[^/]+\/supervisor$/.test(path) && method === "PATCH") {
      const r = INCIDENT_REPORTS.find((x) => x.id === path.split("/")[4]);
      if (!r) return { status: 404, json: { error: "Report not found" } };
      const answers = body && body.answers;
      if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
        return { status: 400, json: { error: "Send answers as an object of key and value" } };
      }
      const payload = reportPayload(r);
      if (!payload.canWriteSupervisor) return { status: 403, json: { error: "You cannot fill in the supervisor section" } };
      const byKey = {};
      payload.fields.forEach((f) => { byKey[f.key] = f; });
      const outside = Object.keys(answers).find((k) => !byKey[k] || byKey[k].half !== "supervisor");
      if (outside) return { status: 400, json: { error: "Only the supervisor section can be changed here" } };
      const stamp = Object.keys(answers).find((k) => byKey[k].type === "signoff");
      if (stamp) return { status: 400, json: { error: "A sign-off is made with its own button" } };
      Object.keys(answers).forEach((k) => { filedState().supervisor[k] = answers[k]; });
      return ok(reportPayload(r));
    }
    if (path.startsWith("/api/forms/responses/")) {
      const id = idAfter("/api/forms/responses/");
      const r = INCIDENT_REPORTS.find((x) => x.id === id) || INCIDENT_REPORTS[0];
      if (method !== "GET") return ok({ message: "Report saved", draft: r });
      return ok(reportPayload(r));
    }

    // --- settings sub-panels ---------------------------------------------
    if (path === "/api/lookups/categories" && method === "GET") return ok(lookupsIn(lang));
    if (path === "/api/lookups/categories" && method === "POST") return created({ message: "Category added" });
    if (/^\/api\/lookups\/categories\/[^/]+/.test(path)) return ok({ message: "Category saved" });
    if (path === "/api/lookups/values" && method === "POST") return created({ message: "Option added" });
    if (/^\/api\/lookups\/values\/[^/]+/.test(path)) return ok({ message: "Option saved" });
    if (path === "/api/lookups/reorder") return ok({ message: "Order saved" });
    if (/^\/api\/lookups\/site\/[^/]+\/all$/.test(path)) {
      if (!state.lookupValues) {
        state.lookupValues = {
          zones: [
            { id: "sl-1", lookup_type: "zone", value: "atrium", label: "Atrium", is_active: true, sort_order: 1 },
            { id: "sl-2", lookup_type: "zone", value: "loading_bay", label: "Loading Bay", is_active: true, sort_order: 2 },
          ],
          buildings: [{ id: "sl-3", lookup_type: "building", value: "north_wing", label: "North Wing", is_active: true, sort_order: 1 }],
          floors: [{ id: "sl-4", lookup_type: "floor", value: "3", label: "Floor 3", is_active: true, sort_order: 1 }],
        };
      }
      const choices = {};
      Object.keys(state.lookupValues).forEach((k) => { choices[k] = withChoiceWords(state.lookupValues[k], lang); });
      return ok(choices);
    }
    // hand: 2 zones, 1 building, 1 floor for the site picked.
    if (path.startsWith("/api/lookups/site/")) return ok({ message: "Site option saved" });
    if (path === "/api/notification-recipients" && method === "GET") {
      return ok({
        types: NOTIFICATION_TYPES,
        forms: NOTIFICATION_FORMS.map((f) => Object.assign({}, f, { delivery: state.formDelivery[f.code] || f.delivery })),
        recipients: NOTIFICATION_RECIPIENTS,
      });
    }
    if (/^\/api\/notification-recipients\/forms\/[^/]+$/.test(path) && method === "PATCH") {
      const code = decodeURIComponent(path.split("/")[4] || "");
      const form = NOTIFICATION_FORMS.find((f) => f.code === code);
      if (!form) return { status: 400, json: { error: "Unknown form code" } };
      const value = body && body.delivery;
      if (value !== "app_link" && value !== "pdf") return { status: 400, json: { error: "Choose app_link or pdf" } };
      state.formDelivery[code] = value;
      return ok({ form: { code: form.code, title: form.title, delivery: value } });
    }
    if (path.startsWith("/api/notification-recipients")) return ok({ message: "Recipient saved" });

    // --- messages ---------------------------------------------------------
    if (path === "/api/chat/dm-inbox") return ok(DM_INBOX);
    if (path.startsWith("/api/chat/channels/")) {
      if (method !== "GET") return ok({ message: "Sent" });
      return ok(CHAT_MESSAGES);
    }
    if (path.startsWith("/api/agent/conversations/")) return ok({ messages: agentConversation(decodeURIComponent(path.slice("/api/agent/conversations/".length))) });
    // The streaming route is written by audit/stream.js, which the harness sends the browser to.
    if (path === "/api/agent/message/stream" && method === "POST") {
      const a = agentAnswer(body);
      return { status: 200, json: a.events, stream: { steps: a.steps, log: a.log } };
    }
    // The route that answers whole. With an answer armed it answers that answer, whole, once the
    // stream would have finished writing it, which is what the API does.
    if (path === "/api/agent/message") {
      if (!agentStream) return ok({ reply: AGENT_REPLY, conversationId: "ag-1" });
      const a = agentAnswer(body);
      if (a.error) return { status: a.error.status || 500, json: { error: a.error.error }, delayMs: a.total };
      return { status: 200, json: a.done, delayMs: a.total };
    }
    if (path === "/api/agent/drafts" && method === "GET") return ok(AGENT_DRAFTS);
    if (path.startsWith("/api/agent/drafts")) return ok({ message: "Draft saved" });
    // Help keeps only the path of a photo it uploads, so that bucket answers with one.
    if (path === "/api/uploads" && q("bucket") === "agent-photos") { agentPhotos += 1; return ok({ path: "agent-photos/audit-photo-" + agentPhotos + ".jpg" }); }
    if (path === "/api/uploads" || path.startsWith("/api/uploads?")) return ok({ url: "", key: "audit-upload" });

    return null;
  }

  function effectiveMap(user, overrides) {
    const tier = user.role === "admin" ? "admin" : user.role === "supervisor" ? "supervisor" : "staff";
    const map = {};
    CAPABILITIES.forEach((c) => {
      map[c.key] = Object.prototype.hasOwnProperty.call(overrides || {}, c.key)
        ? !!overrides[c.key]
        : !!(c.defaults && c.defaults[tier]);
      if (user.role === "admin" && c.key === "manage_permissions") map[c.key] = true;
    });
    return map;
  }

  // Cuts whichever array a response carries down to `keep` rows, leaving its shape alone.
  const cut = (json, keep, keepIds) => {
    const take = (arr) => {
      if (keepIds) return arr.filter((r) => r && keepIds.indexOf(r.id) >= 0);
      return arr.slice(0, keep);
    };
    if (Array.isArray(json)) return take(json);
    if (json && typeof json === "object") {
      const out = Object.assign({}, json);
      Object.keys(out).forEach((k) => { if (Array.isArray(out[k])) out[k] = take(out[k]); });
      return out;
    }
    return json;
  };

  const delayFor = (path) => {
    const hit = delays.find((d0) => path.indexOf(d0.path) >= 0);
    return hit ? hit.ms : 0;
  };

  // The single entry point the harness routes every request through.
  function handle({ method, url, body, headers, lang }) {
    const u = new URL(url);
    const path = u.pathname;
    const record = { method, path, query: u.search, body: body || null };
    calls.push(record);
    // The language the call asked for, kept beside it. Every call says the language the screen is
    // drawn in; one that says nothing, or another language, is also kept apart, where a reset
    // between cases cannot clear it, and the run fails on it at the end.
    record.language = (headers && headers["accept-language"]) || null;
    // What the call was sent with, so a case can hold a route to the headers it has always sent.
    record.headers = headers || {};
    language.calls += 1;
    if (lang && record.language !== lang) language.misses.push({ method, path, said: record.language, want: lang });

    const refusal = matchRefusal(method, path);
    if (refusal) {
      record.refused = refusal.status;
      return { status: refusal.status, json: Object.assign({ error: refusal.error, code: refusal.code }, refusal.body || {}) };
    }

    const answer = route(method, path, u.searchParams, body, record.language);
    if (answer) {
      answer.delayMs = Math.max(answer.delayMs || 0, delayFor(path));
      if (trim && method === "GET" && path.indexOf(trim.path) >= 0) answer.json = cut(answer.json, trim.keep, trim.keepIds);
      // What the API said, kept beside the call. A Spanish screen may draw any of it: a person's
      // name, a site, a note somebody typed. The check exempts exactly this and nothing else.
      record.json = answer.json;
      return answer;
    }

    record.unstubbed = true;
    // Shape guess for a call with no rule: a list route gets a list, everything else an object.
    return ok(/s$/.test(path.split("/").pop() || "") ? [] : {});
  }

  return {
    handle,
    calls,
    language: () => language,
    setRefusal: (r) => { refusals = [].concat(r); },
    clearRefusals: () => { refusals = []; },
    setDelay: (path, ms) => { delays.push({ path, ms }); },
    // The next answer Help is given, whichever of its two routes the page asks.
    setAgentStream: (s) => { agentStream = s || null; },
    setExposeDisposition: (v) => { exposeDisposition = v !== false; },
    clearDelays: () => { delays = []; },
    setTrim: (t) => { trim = t; },
    signedInAs: () => signedInAs,
    setSignedInAs: (k) => { signedInAs = k; },
    reset: () => {
      calls.length = 0;
      refusals = [];
      state.staff = clone(seed.STAFF);
      state.sites = clone(seed.SITES);
      state.issues = clone(seed.ISSUES);
      state.supplies = null; state.supplyRequests = null; state.pickups = null;
      state.schedule = null; state.patterns = null; state.timeOff = null;
      state.overrides = seededOverrides(); state.notifications = null;
      state.formDelivery = {};
      state.filedForms = { signed: {}, supervisor: {} };
      delays = []; trim = null; exposeDisposition = true;
      agentStream = null; agentTalk = {}; agentPending = {};
    },
    fixtures: {
      LOOKUPS, SUPPLIES, SUPPLY_REQUESTS, VENDORS, SERVICES, PICKUPS, PICKUP_ANALYTICS,
      SCHEDULE, PATTERNS, TIME_OFF, NOTIFICATIONS, UNREAD_COUNT, CAPABILITIES, REPORT_DEFS,
      NOTIFICATION_TYPES, NOTIFICATION_FORMS, AGENT_DRAFTS, AGENT_CONVERSATIONS,
      INSPECTION_TEMPLATES, INSPECTION_ITEMS, SCHEDULED_INSPECTIONS, HR_CASES, CASE_QUEUE,
      HR_DOCUMENTS, HR_TRAINING, HR_ONBOARDING, HR_COMPLIANCE, SETTINGS, JOTFORM_FORMS, JOTFORM_SUBMISSIONS, PDF_ACCESS_LOG,
      INCIDENT_REPORTS, NOTIFICATION_RECIPIENTS, CHAT_CHANNELS, CHAT_MESSAGES, DM_INBOX, SHIFT_SESSIONS,
      ASSIGNED_TASKS,
    },
    state,
  };
}

module.exports = { createStubs };
