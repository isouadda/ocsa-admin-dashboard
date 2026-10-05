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
  const language = { calls: 0, misses: [], unnamed: [] };
  // The languages the dashboard speaks, which are the only ones a call may name.
  const LOCALES = ["en", "es"];
  // Every read of a site's checklist the run makes, with its query, which no reset clears either.
  const checklistReads = [];
  let refusals = [];
  // The people added since the last reset, so each one POST /api/users makes has an id of its own, the
  // first u-new-1, as the database gives every row its own.
  let newUserSeq = 0;
  // A path held open on purpose, so a window that shows a loading state can be caught in it.
  let delays = [];
  // A list route cut to a fixed number of rows, so a table can be driven empty and with one row.
  let trim = null;
  // A choice left out of the lists /api/lookups/all serves, { slug, value }, the way a list can stop
  // holding a choice that records still carry.
  let listGap = null;
  // What GET /api/shift-sessions/by-site answers in place of the seed's sessions, when a case sets it.
  let shiftSessions = null;
  // What a person's timeline answers in place of the seed's four entries, when a case sets it.
  let personTimeline = null;
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
  // Staff Management's list reads four fields beside the seed's own: the employee id, the employment
  // type, the hourly rate and the sites a person works, in the API's names for them. Every other page
  // reads the seed's fields and passes these by.
  // hand: employment types in the order of the seed, every fifth person with none; a rate from the
  // fifth person on; each person at the one site the seed gives them.
  const EMPLOYMENT = ["full_time", "full_time", "part_time", "supplemental", null];
  // Since Step 175 every row says whether the account is a test account, isTestAccount, and one on the
  // list's first page is.
  const staffRows = () => clone(seed.STAFF).map((p, i) => Object.assign(p, {
    isTestAccount: p.id === "u-staff-10",
    employeeId: p.employee_id,
    badgeNumber: p.badge_number, badgeSource: p.badge_number ? "adp" : null,
    employmentType: EMPLOYMENT[i % EMPLOYMENT.length],
    hourlyRate: i >= 4 ? (17 + i) + ".50" : null,
    sites: [{ siteId: p.site_id, siteName: p.site_name }],
  }));
  const state = {
    staff: staffRows(),
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
    settings: null,
    training: null,
    // Step 179: each chat's unread count for whoever is signed in, by chat id, which a case sets and
    // reading the chat puts back to 0; the messages sent since the last reset, by chat id; the
    // announcements as sent; and each person's phone alert settings as they saved them, by id.
    chatUnread: {},
    chatSent: {},
    announcements: null,
    alertSettings: {},
    // Step 186: the codes of the builder forms published, and the reports filed on builder forms.
    published: [],
    builderReports: null,
    // Since Step 179 the API deletes no row a person removes: it marks the row, is_active false, a
    // status of cancelled or a removed_at stamp, and every list leaves it out. These hold the rows a
    // removal marks, as a run has left them: a site's floor plans and supply rows, the scheduled
    // inspections, each template's items, the saved reports, the aliases, the documents and the
    // onboarding steps. A reset puts each back.
    floorPlans: null,
    siteSupplies: null,
    inspections: null,
    templateItems: null,
    reportDefs: null,
    aliases: null,
    documents: null,
    onboarding: null,
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
      { id: "lv-30", value: "QS", label: "Quality System", is_active: true, sort_order: 4, color: "#C9A84C" },
      { id: "lv-31", value: "HR", label: "Human Resources", is_active: true, sort_order: 5, color: "#9B59B6" },
      { id: "lv-32", value: "MC", label: "Management Commitment", is_active: true, sort_order: 6, color: "#2C3E50" },
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
    // What a site's contract type is saved as: the code of a choice, which Sites draws as the choice's
    // word in the language the call asked for.
    { id: "lk-9", slug: "contract_types", name: "Contract types", values: [
      { id: "lv-23", value: "subcontractor", label: "Subcontractor", is_active: true, sort_order: 1 },
      { id: "lv-24", value: "direct", label: "Direct", is_active: true, sort_order: 2 },
    ] },
    // What HR Records draws a training record's type and an onboarding step's category as: the
    // choice's word in the language the call asked for. The codes are the ones the training records
    // and the onboarding steps below hold.
    { id: "lk-10", slug: "training_types", name: "Training types", values: [
      { id: "lv-25", value: "safety", label: "Safety", is_active: true, sort_order: 1 },
      { id: "lv-26", value: "equipment", label: "Equipment", is_active: true, sort_order: 2 },
    ] },
    { id: "lk-11", slug: "onboarding_categories", name: "Onboarding categories", values: [
      { id: "lv-27", value: "paperwork", label: "Paperwork", is_active: true, sort_order: 1 },
      { id: "lv-28", value: "training", label: "Training", is_active: true, sort_order: 2 },
      { id: "lv-29", value: "equipment", label: "Equipment", is_active: true, sort_order: 3 },
    ] },
    // What Staff Management draws a site assignment's role and shift and a certification's type as:
    // the choice's word in the language the call asked for. The codes are the ones a person's profile
    // below holds, and the ones the windows that assign a site and add a certification send.
    { id: "lk-12", slug: "site_roles", name: "Site roles", values: [
      { id: "lv-33", value: "Lead", label: "Lead", is_active: true, sort_order: 1 },
      { id: "lv-34", value: "Porter", label: "Porter", is_active: true, sort_order: 2 },
    ] },
    { id: "lk-13", slug: "shift_names", name: "Shift names", values: [
      { id: "lv-35", value: "Night", label: "Night", is_active: true, sort_order: 1 },
      { id: "lv-36", value: "Day", label: "Day", is_active: true, sort_order: 2 },
    ] },
    { id: "lk-14", slug: "certification_types", name: "Certification types", values: [
      { id: "lv-37", value: "certification", label: "Certification", is_active: true, sort_order: 1 },
      { id: "lv-38", value: "license", label: "License", is_active: true, sort_order: 2 },
    ] },
    // The roles a person can hold. Each value is the code the seed's people hold and Staff Management
    // saves; each label is the English the app's own role table has for it.
    { id: "lk-15", slug: "staff_roles", name: "Staff roles", values: [
      { id: "lv-39", value: "admin", label: "Admin", is_active: true, sort_order: 1 },
      { id: "lv-40", value: "supervisor", label: "Supervisor", is_active: true, sort_order: 2 },
      { id: "lv-41", value: "custodial_lead", label: "Custodial Lead", is_active: true, sort_order: 3 },
      { id: "lv-42", value: "custodial_laborer", label: "Custodial Laborer", is_active: true, sort_order: 4 },
      { id: "lv-43", value: "day_porter", label: "Day Porter", is_active: true, sort_order: 5 },
      { id: "lv-44", value: "contractor", label: "Contractor", is_active: true, sort_order: 6 },
    ] },
    // The two lists Shift Pickup and Schedule read that the stub never carried: a shift's reason, by
    // the codes the API files a shift with, and the services. Their English labels are the words the
    // page fell back to without them, so an English screen reads as it did.
    { id: "lk-16", slug: "shift_origins", name: "Shift reasons", values: [
      { id: "lv-45", value: "callout", label: "Callout", is_active: true, sort_order: 1 },
      { id: "lv-46", value: "no_show", label: "No-Show", is_active: true, sort_order: 2 },
      { id: "lv-47", value: "extra_coverage", label: "Extra Coverage", is_active: true, sort_order: 3 },
      { id: "lv-48", value: "voluntary_drop", label: "Voluntary Drop", is_active: true, sort_order: 4 },
      { id: "lv-49", value: "new_shift", label: "New Shift", is_active: true, sort_order: 5 },
    ] },
    { id: "lk-17", slug: "service_categories", name: "Service types", values: [
      { id: "lv-50", value: "office_cleaning", label: "Office Cleaning", is_active: true, sort_order: 1 },
      { id: "lv-51", value: "disinfection", label: "Disinfection Services", is_active: true, sort_order: 2 },
      { id: "lv-52", value: "post_construction", label: "Post-Construction", is_active: true, sort_order: 3 },
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

  // Shaped to Inventory's Requests tab: a request's type, urgency, created_at and description,
  // beside the fields the rows have always carried.
  const SUPPLY_REQUESTS = [
    { id: "sr-1", supply_name: "Can liner 40x46", supply_id: "sp-3", quantity: 6, unit: "case", status: "pending", requested_by_name: "Tomasz Wisniewski", site_name: S[0].name, notes: "Dock run is short.", requested_at: seed.shift(-1) + "T13:00:00Z", admin_notes: null,
      request_type: "refill", urgency: "urgent", created_at: seed.shift(-1) + "T13:00:00Z", description: "Dock run is short." },
    { id: "sr-2", supply_name: "Hand soap refill", supply_id: "sp-4", quantity: 4, unit: "each", status: "pending", requested_by_name: "Ngozi Okonkwo", site_name: S[1].name, notes: "", requested_at: seed.shift(-2) + "T09:30:00Z", admin_notes: null,
      request_type: "damage_report", urgency: "high", created_at: seed.shift(-2) + "T09:30:00Z", description: "" },
    { id: "sr-3", supply_name: "Mop head 24oz", supply_id: "sp-7", quantity: 10, unit: "each", status: "fulfilled", requested_by_name: "Elena Barbosa", site_name: S[2].name, notes: "", requested_at: seed.shift(-11) + "T15:45:00Z", admin_notes: "Delivered.",
      request_type: "new_gear", urgency: "normal", created_at: seed.shift(-11) + "T15:45:00Z", description: "" },
  ];

  // The list and the approved-vendor export both read approval_status. The first vendor has a website,
  // a column of the API's vendors table, which the vendor's window draws as a link.
  const VENDORS = [
    { id: "v-1", name: "Tallow Ridge Supply", status: "approved", approval_status: "approved", address_line1: "12 Tannery Row", zip_code: "19044", products_services: "Chemicals and dilution control", certification_status: "Third-party", contract_terms: "Net 30", last_review_date: seed.shift(-40), linked_supply_count: 2, category: "chemical", contact_name: "K. Osei", contact_email: "orders@tallowridge.example.invalid", contact_phone: "2155559001", website: "https://tallowridge.example.invalid", insurance_expiry: seed.shift(120), w9_on_file: true, avg_rating: 4.4, evaluation_count: 3, city: "Fairhaven", state: "PA" },
    { id: "v-2", name: "Brightwater Equipment", status: "approved", approval_status: "approved", address_line1: "3 Dockside Lane", zip_code: "19061", products_services: "Autoscrubbers and parts", certification_status: "None", contract_terms: "Net 15", last_review_date: seed.shift(-90), linked_supply_count: 1, category: "equipment", contact_name: "M. Delacroix", contact_email: "sales@brightwater.example.invalid", contact_phone: "2155559002", insurance_expiry: seed.shift(22), w9_on_file: true, avg_rating: 3.9, evaluation_count: 2, city: "Oldmarsh", state: "PA" },
    { id: "v-3", name: "Kestrel Paper Co", status: "pending", approval_status: "pending", address_line1: "88 Foundry Street", zip_code: "19045", products_services: "Paper and liners", certification_status: "None", contract_terms: "Prepaid", last_review_date: null, category: "consumable", contact_name: "S. Nakamura", contact_email: "hello@kestrelpaper.example.invalid", contact_phone: "2155559003", insurance_expiry: seed.shift(-14), w9_on_file: false, avg_rating: null, evaluation_count: 0, city: "Fairhaven", state: "PA" },
  ];
  // hand: 3 vendors, 2 approved. The approved-vendor export writes 2 rows plus a header.

  const SERVICES = [
    { id: "sv-1", name: "Daily janitorial", slug: "daily-janitorial", description: "Nightly cleaning of occupied floors.", rate_structure: "Per square foot, monthly", required_certifications: "Bloodborne pathogen awareness", cims_category: "SD", linked_sites: 3, linked_site_count: 3, is_active: true },
    { id: "sv-2", name: "Floor restoration", slug: "floor-restoration", description: "Strip, seal and finish hard floors.", rate_structure: "Per project", required_certifications: "Machine operation", cims_category: "GB", linked_sites: 2, linked_site_count: 2, is_active: true },
  ];

  const PICKUPS = [
    { id: "pk-1", site_id: S[0].id, site_name: S[0].name, scheduled_date: seed.shift(2), start_time: "18:00", end_time: "02:00", status: "open", origin: "new_shift", urgency: "normal", building_name: "North Wing", floor_number: "3", service_category: "Office Cleaning", notes: "Covering a vacancy.", claimed_by_name: null, assigned_to_name: null, original_user_id: "u-staff-5", posted_at: seed.shift(-1) + "T14:00:00Z" },
    { id: "pk-2", site_id: S[1].id, site_name: S[1].name, scheduled_date: seed.shift(3), start_time: "06:00", end_time: "14:00", status: "claimed", origin: "new_shift", urgency: "high", building_name: "Clinic", floor_number: "1", service_category: "SD", notes: "", claimed_by_name: "Yuki Tanabe", claimed_by: "u-staff-9", claimed_by_role: "custodial_lead", assigned_to_name: null, original_user_id: "u-staff-9", posted_at: seed.shift(-2) + "T10:00:00Z" },
    { id: "pk-3", site_id: S[2].id, site_name: S[2].name, scheduled_date: seed.shift(1), start_time: "22:00", end_time: "06:00", status: "requested", origin: "voluntary_drop", urgency: "normal", building_name: "Dock A", floor_number: "1", service_category: "SD", notes: "Family commitment.", claimed_by_name: null, assigned_to_name: "Rashid Haddad", assigned_to: "u-staff-8", original_user_id: "u-staff-8", posted_at: seed.shift(-1) + "T08:00:00Z" },
    { id: "pk-4", site_id: S[0].id, site_name: S[0].name, scheduled_date: seed.shift(-3), start_time: "18:00", end_time: "02:00", status: "approved", origin: "new_shift", urgency: "normal", building_name: "South Wing", floor_number: "2", service_category: "SD", notes: "", claimed_by_name: "Bertrand Lefevre", claimed_by: "u-staff-10", claimed_by_role: "day_porter", assigned_to_name: null, original_user_id: "u-staff-10", posted_at: seed.shift(-6) + "T12:00:00Z" },
  ];
  // hand: 4 pickups. open 1, claimed 1, requested 1, approved 1. The two claimed carry the role of
  // whoever claimed them, the seed's role for that person, the way GET /api/pickups sends it.

  // GET /api/pickups/analytics/staff-reliability: everyone with a claim or a drop request in the
  // period, each with the role the API reads off the person.
  const reliabilityRow = (id, counts) => {
    const p = seed.STAFF.find((x) => x.id === id);
    return Object.assign({ user_id: p.id, name: p.name, role: p.role }, counts);
  };
  const PICKUP_RELIABILITY = { staff: [
    reliabilityRow("u-staff-10", { total_claims: 1, completed: 1, released: 0, drop_requests: 0 }),
    reliabilityRow("u-staff-9", { total_claims: 1, completed: 0, released: 0, drop_requests: 0 }),
    reliabilityRow("u-staff-8", { total_claims: 0, completed: 0, released: 0, drop_requests: 1 }),
  ] };
  // hand: 3 people, a day porter, a custodial lead and a custodial laborer.

  const PICKUP_ANALYTICS = {
    summary: { open_count: 1, fill_rate: 75, avg_time_to_fill_minutes: 95, callout_count: 2, no_show_count: 1, posted_count: 4, filled_count: 3 },
    // hand: filled 3 of posted 4 = 75 percent, which is fill_rate.
  };
  // GET /api/pickups/analytics/patterns the way routes/pickups.js answers it: the open shifts in the
  // range counted by day of the week, by site and day, and by month. month_start is
  // date_trunc('month', scheduled_date)::date, a DATE, which the API's driver sends as midnight UTC of
  // the month's first day. The four shifts counted are invented: a callout at the first site on Monday
  // February 23 and on Monday March 9, a no-show at the second site on Wednesday March 4, and a
  // dropped shift at the third site on Saturday March 14.
  const PICKUP_PATTERNS = {
    by_day: [
      { day_of_week: 1, total: 2, callouts: 2, no_shows: 0, voluntary_drops: 0 },
      { day_of_week: 3, total: 1, callouts: 0, no_shows: 1, voluntary_drops: 0 },
      { day_of_week: 6, total: 1, callouts: 0, no_shows: 0, voluntary_drops: 1 },
    ],
    by_site_day: [
      { site_id: S[0].id, site_name: S[0].name, day_of_week: 1, total: 2, callouts: 2, no_shows: 0 },
      { site_id: S[1].id, site_name: S[1].name, day_of_week: 3, total: 1, callouts: 0, no_shows: 1 },
      { site_id: S[2].id, site_name: S[2].name, day_of_week: 6, total: 1, callouts: 0, no_shows: 0 },
    ],
    by_month: [
      { month_start: "2026-02-01T00:00:00.000Z", total: 1, callouts: 1, no_shows: 0 },
      { month_start: "2026-03-01T00:00:00.000Z", total: 3, callouts: 1, no_shows: 1 },
    ],
  };
  // hand: 2 + 1 + 1 = 4 shifts by day, by site and day, and 1 + 3 = 4 by month, which is posted_count;
  // callouts 2 + 0 + 0 = 2 and 1 + 1 = 2, which is callout_count; no-shows 1 each way, no_show_count.

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

  // What GET /api/users/:id/permissions sends as capabilities: the API's own list, middleware/
  // capabilities.js, code for code and name for name, and one code the dashboard does not know, so a
  // screen can be seen to draw the name the API sends for it.
  const CAPABILITIES = [
    { key: "manage_permissions", label: "Manage roles and permissions", group: "Administration", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "manage_settings", label: "Company settings and branding", group: "Administration", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "manage_lookups", label: "Dropdown and site lookups", group: "Administration", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "manage_staff", label: "Staff accounts and approvals", group: "Administration", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "manage_sites", label: "Site records and floor plans", group: "Administration", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "manage_integrations", label: "Integrations and forms", group: "Administration", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "manage_tasks", label: "Tasks and assignments", group: "Operations", enforced: true, defaults: { admin: true, supervisor: true, staff: false } },
    { key: "manage_inspections", label: "Inspection templates and scheduling", group: "Operations", enforced: true, defaults: { admin: true, supervisor: true, staff: false } },
    { key: "manage_time", label: "Manual time entry and shift edits", group: "Operations", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "manage_schedule", label: "Create, edit and delete scheduled shifts", group: "Operations", enforced: true, defaults: { admin: true, supervisor: true, staff: false } },
    { key: "approve_time_off", label: "Approve and deny time off", group: "Operations", enforced: true, defaults: { admin: false, supervisor: false, staff: false } },
    { key: "manage_supplies", label: "Supply catalog", group: "Supplies", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "manage_vendors", label: "Vendors and services", group: "Supplies", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "view_reports", label: "Reports, labor, and scheduling", group: "Reporting", enforced: true, defaults: { admin: true, supervisor: true, staff: false } },
    { key: "read_incident_reports", label: "Read filed incident reports", group: "Reporting", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "export_payroll", label: "ADP payroll export", group: "Reporting", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "manage_admins", label: "Change admin accounts (role, status, PIN)", group: "Administration", enforced: true, defaults: { admin: false, supervisor: false, staff: false } },
    // Step 179 and Step 183, as middleware/capabilities.js carries them at ocsa-api 1c3fb42.
    { key: "send_announcements", label: "Send announcements to phones", group: "Operations", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "view_help_insights", label: "Help insights: what people ask Help", group: "Reporting", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    // Step 186, as middleware/capabilities.js carries it at ocsa-api 94dbe27: an admin's by default,
    // the way the contract the Form builder was built against says (pull request #68, what was
    // wrong, item 1).
    { key: "build_forms", label: "Build forms with the builder", group: "Administration", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "audit_unknown_capability", label: "A capability the dashboard has no name for", group: "Administration", enforced: false, defaults: { admin: true, supervisor: false, staff: false } },
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
  // The saved reports as a run has left them. Since Step 179 a removed report is set is_active false
  // and kept, by its owner or an admin, and the list reads the live ones (routes/report-engine.js).
  const reportRows = () => { if (!state.reportDefs) state.reportDefs = clone(REPORT_DEFS); return state.reportDefs; };

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
  // The templates, each template's items and the scheduled inspections as a run has left them. Since
  // Step 179 a template or an item is set is_active false and kept, and a scheduled inspection is
  // cancelled and kept, with who and when; the lists read the live rows and the list of scheduled
  // inspections answers every row, cancelled ones included, the way routes/inspections.js does.
  const templateRows = () => { if (!state.templates) state.templates = clone(INSPECTION_TEMPLATES); return state.templates; };
  const itemRows = (tpId) => {
    if (!state.templateItems) state.templateItems = {};
    if (!state.templateItems[tpId]) state.templateItems[tpId] = clone(INSPECTION_ITEMS);
    return state.templateItems[tpId];
  };
  const inspectionRows = () => { if (!state.inspections) state.inspections = clone(SCHEDULED_INSPECTIONS); return state.inspections; };

  // Shaped to the Cases page: clock, ageHours, subject, assignedTo, reportedBy, escalatedTo, createdAt,
  // updatedAt, firstResponseAt, resolvedAt, the summary and the resolution notes. The response clock is
  // 72 hours from filing, so ageHours drives what the Response column says. What a person typed, a
  // summary and a resolution note, is drawn exactly as it arrives, so the first summary and the third
  // case's notes carry a bar, which the word table would cut at if the text went through it.
  const HR_CASES = [
    { id: "hc-1", reference: "CASE-0007", status: "open", clock: "overdue", ageHours: 86, createdAt: seed.shift(-4) + "T09:00:00Z", updatedAt: seed.shift(-4) + "T09:00:00Z", subject: { id: "u-staff-5", name: "Tomasz Wisniewski" }, assignedTo: null, reportedBy: { id: "u-staff-6", name: seed.STAFF[5].name }, escalatedTo: null, firstResponseAt: null, resolvedAt: null, resolutionNotes: null, summary: "A concern was raised about overnight cover | raised again after the first week.", subjectNamed: true },
    { id: "hc-2", reference: "CASE-0006", status: "in_review", clock: "due_soon", ageHours: 60, createdAt: seed.shift(-3) + "T21:00:00Z", updatedAt: seed.shift(-2) + "T10:00:00Z", subject: null, assignedTo: { id: "u-admin-1", name: "Dana Whitlock" }, reportedBy: null, escalatedTo: null, firstResponseAt: null, resolvedAt: null, resolutionNotes: null, summary: "Dock lighting reported dim.", subjectNamed: false },
    { id: "hc-3", reference: "CASE-0005", status: "resolved", clock: "responded", ageHours: 300, createdAt: seed.shift(-14) + "T09:00:00Z", updatedAt: seed.shift(-9) + "T16:00:00Z", subject: { id: "u-staff-7", name: "Elena Barbosa" }, assignedTo: { id: "u-super-1", name: "Oyelaran Adebayo" }, reportedBy: { id: "u-staff-8", name: seed.STAFF[7].name }, escalatedTo: { id: "u-super-1", name: "Oyelaran Adebayo" }, firstResponseAt: seed.shift(-13) + "T11:00:00Z", resolvedAt: seed.shift(-9) + "T16:00:00Z", resolutionNotes: "Answered in person the same week | the pay stub was corrected.", summary: "Pay question, answered the same week.", subjectNamed: true },
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
    category: i % 4 === 3 ? "other" : i % 2 === 0 ? "training" : "legal",
    document_type: i % 4 === 3 ? "other" : i % 2 === 0 ? "training" : "compliance",
    title: ["Handbook acknowledgement", "Safety briefing", "Equipment sign-out", "Language preference note"][i % 4],
    file_name: "doc-" + (i + 1) + ".pdf",
    created_at: seed.shift(-60 + i * 4) + "T12:00:00Z",
    uploaded_by_name: "Dana Whitlock",
    expiry_date: i % 3 === 0 ? seed.shift(20 + i) : null,
  }));
  // hand: 12 documents. category other = 3 (i = 3, 7, 11), so the Other tab lists 3 and the
  // Documents tab lists the other 9.
  // The documents as a run has left them. Since Step 179 DELETE /api/jotform/employee-documents/:id
  // stamps the row with removed_at and who, and the storage object stays; every list leaves a stamped
  // row out (routes/jotform.js and routes/hr.js).
  const docRows = () => { if (!state.documents) state.documents = clone(HR_DOCUMENTS); return state.documents; };
  const liveDocs = () => docRows().filter((x) => !x.removed_at);

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
  // The records a run can add to, change and delete, in the columns training_records holds and the
  // routes send back: the twelve above with nothing in their notes, each added at noon Eastern on its
  // day. A reset puts the twelve back.
  let trainingNext = 13;
  const trainingRows = () => {
    if (!state.training) {
      state.training = clone(HR_TRAINING).map((r) => Object.assign({ notes: null, document_id: null, created_at: r.completed_date + "T16:00:00.000Z" }, r));
      trainingNext = 13;
    }
    return state.training;
  };
  // A record as the list sends it, with the person's name the list joins in, and as the other three
  // routes send it, the table's own columns alone.
  const trainingListRow = (r) => Object.assign({}, r, { user_name: (state.staff.find((s0) => s0.id === r.user_id) || {}).name || r.user_name || "" });
  const trainingTableRow = (r) => { const out = Object.assign({}, r); delete out.user_name; return out; };
  // ORDER BY completed_date DESC NULLS LAST, created_at DESC.
  const trainingOrder = (a, b) => {
    if (!a.completed_date !== !b.completed_date) return a.completed_date ? -1 : 1;
    if (a.completed_date !== b.completed_date) return a.completed_date < b.completed_date ? 1 : -1;
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  };
  // Since Step 179 DELETE /api/hr/training/:id stamps the record with removed_at and who, and every
  // list and read leaves a stamped record out (routes/hr.js).
  const removedTraining = (id) => !!(state.training && state.training.some((r) => r.id === id && r.removed_at));

  const HR_ONBOARDING = [
    { id: "ob-1", step_category: "paperwork", step_name: "Handbook acknowledged", is_completed: true, completed_date: seed.shift(-20), completed_by_name: "Dana Whitlock" },
    { id: "ob-2", step_category: "paperwork", step_name: "Direct deposit form", is_completed: true, completed_date: seed.shift(-19), completed_by_name: "Dana Whitlock" },
    { id: "ob-3", step_category: "training", step_name: "Safety briefing", is_completed: true, completed_date: seed.shift(-18), completed_by_name: "Marcus Ferreira" },
    { id: "ob-4", step_category: "training", step_name: "Site walkthrough", is_completed: false, completed_date: null, completed_by_name: null },
    { id: "ob-5", step_category: "equipment", step_name: "Keys and badge issued", is_completed: false, completed_date: null, completed_by_name: null },
  ];
  // hand: 5 steps in 3 categories, 3 complete, so the line reads "3 of 5 steps complete".
  // The steps as a run has left them. Since Step 179 DELETE /api/hr/onboarding/step/:id stamps the
  // step with removed_at and who, and every list leaves a stamped step out (routes/hr.js).
  const onboardingRows = () => { if (!state.onboarding) state.onboarding = clone(HR_ONBOARDING); return state.onboarding; };
  const liveSteps = () => onboardingRows().filter((x) => !x.removed_at);

  // A card on the Employees grid, shaped to what the grid reads since Session 22. The last activity
  // runs today, yesterday, days, a week, a month and a year back down the list, so each way a card
  // says it is drawn, and the counts come from the records the other tabs list.
  const ACTIVITY_DAYS = [0, 1, 3, 10, 45, 400];
  const hrCard = (p, i) => {
    const mine = (list) => list.filter((x) => x.user_id === p.id).length;
    return {
      id: p.id, first_name: p.first_name, last_name: p.last_name, email: p.email, role: p.role, status: p.status,
      employee_id: p.employee_id, hire_date: p.hire_date, profile_photo_url: null, is_test_account: false,
      doc_count: mine(HR_DOCUMENTS), training_count: mine(HR_TRAINING), jotform_count: mine(JOTFORM_SUBMISSIONS),
      onboarding_total: i % 3 === 0 ? 0 : 5, onboarding_completed: i % 3 === 1 ? 3 : 5,
      expired_doc_count: mine(HR_COMPLIANCE.expiredDocs), expiring_doc_count: mine(HR_COMPLIANCE.expiringDocs),
      expired_training_count: mine(HR_COMPLIANCE.expiredTraining), expiring_training_count: mine(HR_COMPLIANCE.expiringTraining),
      last_activity_date: i < ACTIVITY_DAYS.length ? seed.shift(-ACTIVITY_DAYS[i]) + "T22:00:00Z" : null,
    };
  };
  // A person's folder: the person, and every record they have as one list, with the count in each
  // category. The onboarding steps carry the status the folder draws beside them. A training record's
  // and a finished step's date is the day it was done, a DATE, which routes/hr.js sends as
  // new Date(completed_date).toISOString(): midnight UTC of that day, from a server that runs in UTC.
  // Since Step 186 the list starts with the filed reports about the person, the way routes/hr.js starts
  // it from formItems. A document, a training record or a step removed since Step 179 is left out, the
  // way routes/hr.js reads the folder.
  const hrFolder = (p) => {
    const items = folderForms(p).concat(
      liveDocs().filter((x) => x.user_id === p.id).map((x) => ({ source: "document", source_id: x.id, title: x.title, category: x.category,
        raw_category_label: null, date: x.created_at, expiry_date: x.expiry_date })),
      HR_TRAINING.filter((x) => x.user_id === p.id && !removedTraining(x.id)).map((x) => ({ source: "training", source_id: x.id, title: x.training_name, category: "training",
        raw_category_label: x.training_type, date: x.completed_date + "T00:00:00.000Z", expiry_date: x.expiry_date, administered_by: x.administered_by })),
      liveSteps().map((x) => ({ source: "onboarding", source_id: x.id, title: x.step_name, category: "hr_onboarding", raw_category_label: x.step_category,
        date: x.completed_date ? x.completed_date + "T00:00:00.000Z" : null, status: x.is_completed ? "completed" : "pending" })),
      JOTFORM_SUBMISSIONS.filter((x) => x.user_id === p.id).map((x) => ({ source: "jotform", source_id: x.id, title: x.form_title, category: "hr_ongoing",
        category_override: null, raw_category_label: null, date: x.submitted_at, submitter_name: x.submitter_name })));
    const counts = {};
    items.forEach((x) => { counts[x.category] = (counts[x.category] || 0) + 1; });
    return {
      employee: { id: p.id, first_name: p.first_name, last_name: p.last_name, role: p.role, status: p.status, email: p.email, phone: p.phone,
        employee_id: p.employee_id, hire_date: p.hire_date, profile_photo_url: null, is_test_account: false },
      items: items, counts_by_category: counts, total_items: items.length,
    };
  };

  // The compliance roll-up, shaped to what the Compliance tab reads: five lists, each counted.
  const HR_COMPLIANCE = {
    expiredDocs: [HR_DOCUMENTS[0]],
    expiringDocs: [HR_DOCUMENTS[3], HR_DOCUMENTS[6]],
    expiredTraining: [HR_TRAINING[0]],
    expiringTraining: [HR_TRAINING[2]],
    onboardingProgress: seed.STAFF.slice(4, 8).map((p, i) => ({ user_id: p.id, user_name: p.name, completed_steps: 3 + (i % 2), total_steps: 5 })),
    // The certifications Step 183 added, in the columns routes/hr.js selects: active ones due in the
    // next 30 days, and active ones already past their expiry.
    expiringCerts: [
      { id: "cert-11", user_id: seed.STAFF[6].id, cert_name: "Aerial lift operation", cert_type: "license", issuing_body: "In-house", issued_date: seed.shift(-700), expiry_date: seed.shift(9), status: "active", user_name: seed.STAFF[6].name },
      { id: "cert-12", user_id: seed.STAFF[7].id, cert_name: "First aid and CPR", cert_type: "certification", issuing_body: "In-house", issued_date: seed.shift(-340), expiry_date: seed.shift(21), status: "active", user_name: seed.STAFF[7].name },
    ],
    expiredCerts: [
      { id: "cert-13", user_id: seed.STAFF[8].id, cert_name: "Scissor lift safety", cert_type: "certification", issuing_body: "In-house", issued_date: seed.shift(-400), expiry_date: seed.shift(-12), status: "active", user_name: seed.STAFF[8].name },
    ],
    staffSummary: seed.STAFF.map((p) => ({
      id: p.id, user_name: p.name, role: p.role,
      doc_count: 3, training_count: 2, jotform_count: 1, alias_count: 0,
      expired_docs: p.id === seed.STAFF[4].id ? 1 : 0,
      expired_training: p.id === seed.STAFF[4].id ? 1 : 0,
      onb_completed: 3, onb_total: 5,
    })),
  };
  // hand: expired docs 1, expired training 1, expiring 2 + 1 = 3 in the 30-day tile,
  // onboarding 4 people, staff summary 12 rows. Certifications: 2 expiring (March 26 and April 7,
  // both within 30 days of March 17) and 1 expired (March 5).

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
  // Shaped to the Submissions table: submitter_name, first_name, linked_entity_type, expiry_date. Each
  // row carries jotform_view_url, the address of the submission on Jotform, which routes/jotform.js
  // writes on every sync and answers with the row, and which the detail window draws as a link.
  const JOTFORM_SUBMISSIONS = [
    { id: "js-1", jotform_form_id: "240000000000001", form_title: "Incident report", submitted_at: seed.shift(-1) + "T18:00:00Z", user_id: "u-staff-5", first_name: "Tomasz", last_name: "Wisniewski", user_employee_id: "EMP-1005", submitter_name: "Tomasz Wisniewski", submitter_email: "tomasz.wisniewski@example.invalid", status: "ACTIVE", linked_entity_type: null, expiry_date: null, has_original_pdf: true, jotform_view_url: "https://www.jotform.example.invalid/submission/600000000000001" },
    { id: "js-2", jotform_form_id: "240000000000002", form_title: "New hire packet", submitted_at: seed.shift(-5) + "T10:00:00Z", user_id: "u-staff-6", first_name: "Ngozi", last_name: "Okonkwo", user_employee_id: "EMP-1006", submitter_name: "Ngozi Okonkwo", submitter_email: "ngozi.okonkwo@example.invalid", status: "ACTIVE", linked_entity_type: "hr_document", expiry_date: seed.shift(90), has_original_pdf: true, jotform_view_url: "https://www.jotform.example.invalid/submission/600000000000002" },
    { id: "js-3", jotform_form_id: "240000000000001", form_title: "Incident report", submitted_at: seed.shift(-9) + "T08:00:00Z", user_id: null, first_name: null, last_name: null, user_employee_id: null, submitter_name: null, submitter_email: null, status: "ACTIVE", linked_entity_type: null, expiry_date: null, has_original_pdf: false, jotform_view_url: "https://www.jotform.example.invalid/submission/600000000000003" },
  ];
  // hand: 3 submissions, 1 already linked, 1 with nobody matched to it.
  // Field names follow the PDF Access Log table: first_name, access_type, submitter_name, success.
  const PDF_ACCESS_LOG = [
    { id: "pa-1", jotform_form_id: "240000000000001", form_title: "Incident report", submission_id: "600000000000001", first_name: "Dana", last_name: "Whitlock", access_type: "view", accessed_at: seed.shift(-1) + "T19:00:00Z", ip_address: "198.51.100.7", success: true, submitter_name: "Tomasz Wisniewski", error_message: null },
    { id: "pa-2", jotform_form_id: "240000000000002", form_title: "New hire packet", submission_id: "600000000000002", first_name: "Marcus", last_name: "Ferreira", access_type: "download", accessed_at: seed.shift(-4) + "T11:00:00Z", ip_address: "198.51.100.9", success: true, submitter_name: "Ngozi Okonkwo", error_message: null },
    { id: "pa-3", jotform_form_id: "240000000000001", form_title: "Incident report", submission_id: "600000000000001", first_name: null, last_name: null, access_type: "print", accessed_at: seed.shift(-8) + "T16:00:00Z", ip_address: "198.51.100.4", success: false, submitter_name: null, error_message: "The upstream PDF could not be read" },
  ];
  // hand: 3 access events, 1 of them a failure, and one with no person left on the row.
  // The aliases Maintenance lists, in the columns GET /api/jotform/user-aliases selects in routes/jotform.js,
  // ordered by the person's first and last name, the alias's type and its value. Since Step 179 a
  // removal sets is_active false and keeps the row, and the list and the matcher leave it out.
  const aliasFor = (p, extra) => Object.assign({ user_id: p.id, created_by_user_id: seed.PEOPLE.admin.id, notes: null,
    first_name: p.first_name, last_name: p.last_name, email: p.email, user_status: p.status, employee_id: p.employee_id,
    created_by_first_name: seed.PEOPLE.admin.firstName, created_by_last_name: seed.PEOPLE.admin.lastName }, extra);
  const ALIASES = [
    aliasFor(seed.STAFF[5], { id: "al-2", alias_type: "name", alias_value: "gigi okonkwo", source: "admin_added", created_at: seed.shift(-25) + "T14:00:00Z", last_matched_at: null, match_count: 0, notes: "Signs forms with a nickname" }),
    aliasFor(seed.STAFF[4], { id: "al-1", alias_type: "email", alias_value: "t.wisniewski@example.invalid", source: "manual_link", created_at: seed.shift(-40) + "T15:00:00Z", last_matched_at: seed.shift(-3) + "T18:05:00Z", match_count: 2 }),
  ];
  // hand: 2 aliases, one each for two people, Ngozi Okonkwo's first by name.
  const aliasRows = () => { if (!state.aliases) state.aliases = clone(ALIASES); return state.aliases; };
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
    if (!state.filedForms) state.filedForms = { signed: {}, supervisor: {}, photos: {} };
    if (!state.filedForms.photos) state.filedForms.photos = {};
    return state.filedForms;
  };
  // Step 165: photos on a filed form. A photos question carries [{ id, name, bytes, uploadedAt }]
  // and maxPhotos; the filing half's holds two photos from the crew, and the supervisor half's takes
  // uploads from whoever may write that half, up to two. Every image the stub streams is this one
  // pixel PNG, which is enough for a thumbnail and an overlay to draw. The refusal words are in
  // the language the call asked for, the way the API answers, each with its code.
  const PNG_BYTES = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const imageAnswer = () => ({ status: 200, bytes: PNG_BYTES, contentType: "image/png", json: null });
  const SITE_PHOTOS = [
    { id: "ph-1", name: "lobby.jpg", bytes: 24576, uploadedAt: seed.shift(-1) + "T21:50:00Z" },
    { id: "ph-2", name: "dock.jpg", bytes: 30720, uploadedAt: seed.shift(-1) + "T21:52:00Z" },
  ];
  // The codes and the words are routes/forms.js's own, read at 9b8f5ed (Step 169): a question that
  // takes no photos, a half this person may not write, no photo in the request, more than the
  // question takes, and a photo that is not there.
  const PHOTO_REFUSAL = {
    notAPhotosQuestion: { code: "forms.notAPhotosQuestion", status: 400, en: "That question does not take photos", es: "Esa pregunta no acepta fotos" },
    cannotWriteSupervisor: { code: "forms.cannotWriteSupervisor", status: 403, en: "You cannot fill in the supervisor section", es: "No puede llenar la secci\u00f3n del supervisor" },
    reportNotFound: { code: "forms.reportNotFound", status: 404, en: "Report not found", es: "No se encontr\u00f3 el reporte" },
    photoNoFile: { code: "forms.photoNoFile", status: 400, en: "Attach at least one photo.", es: "Adjunte al menos una foto." },
    photoLimit: { code: "forms.photoLimit", status: 400, en: "This question takes {max} photos at most.", es: "Esta pregunta acepta como m\u00e1ximo {max} fotos." },
    photoNotFound: { code: "forms.photoNotFound", status: 404, en: "Photo not found", es: "No se encontr\u00f3 la foto" },
  };
  const photoRefusal = (which, lang, vars) => {
    const r = PHOTO_REFUSAL[which];
    const words = (lang === "es" ? r.es : r.en).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? String(vars[k]) : m));
    return { status: r.status, json: { error: words, code: r.code } };
  };
  let photoSeq = 10;
  const stampNow = () => ({
    userId: person().id,
    name: person().firstName + " " + person().lastName,
    role: person().role,
    at: seed.NOW_ISO,
  });
  // Step 159: what a case switches on in the daily service log's payload beyond what the suite has
  // always read, so every payload read before stays byte for byte as it was. rows adds two tables a
  // person adds rows to on the supervisor half, one with a floor of one row and room for five and one
  // with room for one row; the required one joins the missing list until it holds a row.
  let filedExtras = { rows: false, sections: false };
  const COMPLETED_COLUMNS = [
    { key: "what", label: "What was completed", type: "text", required: true },
    { key: "when", label: "Completed on", type: "date", required: false },
  ];
  const VERIFIED_COLUMNS = [
    { key: "finding", label: "Finding verified", type: "text", required: true },
    { key: "ok", label: "Holds", type: "checkbox", required: false },
  ];
  const SUPERVISOR_REQUIRED_BASE = [
    { key: "reviewed_on", label: "Date reviewed" },
    { key: "checks", label: "Checks at review" },
  ];
  // sections adds the form's sections and puts each field in one, shaped the way ocsa-api's
  // reportPayload and fieldViews send them since Step 157: sections is the catalog's list in the
  // language asked, key and title and help where the definition writes one, and every field carries
  // section, the key of the section it sits in. The reviewer's stamp is put in a section the list
  // does not name, so the window is seen to draw such a field flat.
  const LOG_SECTIONS = {
    en: [
      { key: "service", title: "The service", help: "What was done on the day, as the crew filed it." },
      { key: "review", title: "Review at a desk", help: "Filled in by whoever reviews the log." },
      { key: "closure", title: "Closure" },
    ],
    es: [
      { key: "service", title: "El servicio", help: "Lo que se hizo ese d\u00eda, tal como lo registr\u00f3 el equipo." },
      { key: "review", title: "Revisi\u00f3n en el escritorio", help: "Lo llena quien revisa el registro." },
      { key: "closure", title: "Cierre" },
    ],
  };
  const LOG_SECTION_OF = { service_date: "service", areas: "service", supplies_used: "service", filed_signoff: "service", site_photos: "service",
    reviewed_on: "review", review_note: "review", checks: "review", verification_photos: "review", completed: "closure", verified: "closure", review_signoff: "signing" };
  const supervisorRequired = () => SUPERVISOR_REQUIRED_BASE.concat(filedExtras.rows ? [{ key: "completed", label: "What was completed" }] : []);
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
    const fields = [
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
      { id: "sf-11", key: "site_photos", label: "Photos of the site", half: "agent", type: "photos",
        maxPhotos: 6, value: SITE_PHOTOS, displayValue: "" },
      { id: "sf-4", key: "filed_signoff", label: "Filed by", half: "agent", type: "signoff",
        signer: "agent", displayValue: "",
        value: { userId: FILER.id, name: FILER.name, role: FILER.role, at: seed.shift(-1) + "T22:10:00Z", signature: { id: "sig-filed_signoff" } } },
      { id: "sf-5", key: "reviewed_on", label: "Date reviewed", half: "supervisor", type: "date",
        value: sup.reviewed_on || "", displayValue: sup.reviewed_on ? "March 17, 2026" : "" },
      { id: "sf-6", key: "review_note", label: "What the supervisor found", half: "supervisor",
        type: "textarea", value: sup.review_note || "", displayValue: sup.review_note || "" },
      { id: "sf-7", key: "checks", label: "Checks at review", half: "supervisor", type: "grid",
        columns: CHECK_COLUMNS, rows: CHECK_ROWS, minRows: null, maxRows: null,
        value: checks,
        displayValue: CHECK_ROWS.filter((r) => checks[r.key] && checks[r.key].ok).map((r) => r.label).join(". ") },
      { id: "sf-12", key: "verification_photos", label: "Verification photos", half: "supervisor", type: "photos",
        maxPhotos: 2, value: filedState().photos.verification_photos || [], displayValue: "" },
      { id: "sf-8", key: "review_signoff", label: "Reviewed by", half: "supervisor", type: "signoff",
        signer: "supervisor", displayValue: "", value: stamp },
    ];
    if (filedExtras.rows) {
      fields.splice(7, 0,
        { id: "sf-9", key: "completed", label: "What was completed", half: "supervisor", type: "grid",
          columns: COMPLETED_COLUMNS, rows: null, minRows: 1, maxRows: 5,
          value: sup.completed || null,
          displayValue: (sup.completed || []).map((r) => r.what).join(". ") },
        { id: "sf-10", key: "verified", label: "Findings verified in person", half: "supervisor", type: "grid",
          columns: VERIFIED_COLUMNS, rows: null, minRows: null, maxRows: 1,
          value: sup.verified || null,
          displayValue: (sup.verified || []).map((r) => r.finding).join(". ") });
    }
    if (filedExtras.sections) fields.forEach((f) => { f.section = LOG_SECTION_OF[f.key] || null; });
    return fields;
  };
  // Since Step 186 every form in the catalog says which apps offer it, apps, the way
  // helpers/formCatalog.js sends it at ocsa-api 94dbe27: the code forms with the apps their
  // definitions in data/forms carry, and the three invented codes, which the staff app files, with
  // portal alone.
  const FORM_LIST = [
    { code: "incident", title: "Incident report", apps: ["portal"] },
    { code: "vehicle", title: "Vehicle report", apps: ["portal"] },
    { code: "service-log", title: "Daily service log", apps: ["portal"] },
    // The five batch two forms, by the codes the API lists them under, each with an invented title
    // of the API's own, so a screen that draws the API's title rather than the table's word for the
    // code is seen to. Step 159.
    { code: "OCSA-FRM-010", title: "Form 010 as the API titles it", apps: ["portal"] },
    { code: "OCSA-FRM-015", title: "Form 015 as the API titles it", apps: ["portal"] },
    { code: "OCSA-FRM-027", title: "Form 027 as the API titles it", apps: ["portal"] },
    { code: "OCSA-FRM-032", title: "Form 032 as the API titles it", apps: ["portal"] },
    { code: "OCSA-FRM-036", title: "Form 036 as the API titles it", apps: ["portal"] },
    // Step 169: the two forms a customer fills through a link, titled the way the API titles them
    // in the language asked. The catalog carries no customer flag, the way the API's does not; since
    // Step 186 their apps name customer alone.
    { code: "OCSA-FRM-006", titles: { en: "Facility Cleanliness Evaluation Checklist", es: "Lista de evaluaci\u00f3n de limpieza del edificio" }, apps: ["customer"] },
    { code: "OCSA-FRM-007", titles: { en: "Client Satisfaction Survey", es: "Encuesta de satisfacci\u00f3n del cliente" }, apps: ["customer"] },
  ];
  const canListFiledForms = () => person().role === "admin" || person().readsFiledForms === true;

  // Step 166: a form a person starts at a desk, with every type the window draws, shaped the way
  // GET /api/forms sends a form: fields with a section key, an appliesWhen rule, help on a field
  // and on a column, sections with a title and a help line, and fillers. The forms above carry no
  // fillers, so only this one is startable; with startable off, neither is.
  let startable = true;
  const DESK_CODE = "desk-complaint";
  const desk = (en, es, lang) => (lang === "es" ? es : en);
  const deskForm = (lang) => ({
    code: DESK_CODE, title: desk("Complaint log", "Registro de quejas", lang), fillers: startable ? ["admin", "supervisor"] : [],
    // Offered in the staff app and in the dashboard, the way the code forms both apps offer are.
    apps: ["portal", "dashboard"],
    sections: [
      { key: "where", title: desk("Where it came from", "De d\u00f3nde vino", lang), help: desk("As the caller gave it.", "Tal como lo dio quien llam\u00f3.", lang) },
      { key: "what", title: desk("What was said", "Lo que se dijo", lang) },
      { key: "record", title: desk("The record", "El registro", lang) },
    ],
    fields: [
      { key: "site", label: desk("Site", "Sitio", lang), type: "text", required: true, section: "where", help: desk("Type the site's name as it reads on the contract.", "Escriba el nombre del sitio tal como aparece en el contrato.", lang) },
      { key: "received_on", label: desk("Received on", "Recibida el", lang), type: "date", required: true, section: "where" },
      { key: "received_at", label: desk("Received at", "Recibida a las", lang), type: "time", required: false, section: "where" },
      { key: "channel", label: desk("How it came in", "C\u00f3mo lleg\u00f3", lang), type: "select", required: true, section: "where",
        options: [{ value: "phone", label: desk("By phone", "Por tel\u00e9fono", lang) }, { value: "email", label: desk("By email", "Por correo", lang) }, { value: "in_person", label: desk("In person", "En persona", lang) }] },
      { key: "callers", label: desk("How many people called", "Cu\u00e1ntas personas llamaron", lang), type: "number", required: false, section: "where" },
      { key: "summary", label: desk("What the caller said", "Lo que dijo quien llam\u00f3", lang), type: "textarea", required: true, section: "what" },
      { key: "areas", label: desk("Areas named", "\u00c1reas mencionadas", lang), type: "multiselect", required: false, section: "what",
        options: [{ value: "lobby", label: desk("Lobby", "Vest\u00edbulo", lang) }, { value: "restrooms", label: desk("Restrooms", "Ba\u00f1os", lang) }, { value: "dock", label: desk("Dock", "Muelle", lang) }] },
      { key: "follow_up", label: desk("Does the caller want a call back", "Quiere quien llam\u00f3 que le devuelvan la llamada", lang), type: "select", required: false, section: "what",
        options: [{ value: "yes", label: desk("Yes", "S\u00ed", lang) }, { value: "no", label: desk("No", "No", lang) }] },
      { key: "call_back", label: desk("Number to call back", "N\u00famero al que devolver la llamada", lang), type: "text", required: true, section: "what", appliesWhen: { key: "follow_up", anyOf: ["yes"] } },
      { key: "checks", label: desk("Steps taken on the call", "Pasos dados en la llamada", lang), type: "grid", required: false, section: "record",
        rows: [{ key: "logged", label: desk("Logged the call", "Se registr\u00f3 la llamada", lang) }, { key: "thanked", label: desk("Thanked the caller", "Se agradeci\u00f3 a quien llam\u00f3", lang) }],
        columns: [{ key: "done", label: desk("Done", "Hecho", lang), type: "checkbox", required: false }, { key: "note", label: desk("Note", "Nota", lang), type: "text", required: false, help: desk("Anything said on the call.", "Cualquier cosa dicha en la llamada.", lang) }] },
      { key: "actions", label: desk("Actions taken", "Acciones tomadas", lang), type: "grid", required: true, section: "record", rows: null, minRows: 0, maxRows: 3,
        columns: [{ key: "what", label: desk("What was done", "Qu\u00e9 se hizo", lang), type: "text", required: true }, { key: "when", label: desk("Done on", "Hecho el", lang), type: "date", required: false }] },
      { key: "evidence", label: desk("Photos", "Fotos", lang), type: "photos", required: false, section: "record", maxPhotos: 3 },
      { key: "filer_signoff", label: desk("Filed by", "Presentado por", lang), type: "signoff", signer: "filer", required: true, section: "record" },
      { key: "reviewer_signoff", label: desk("Reviewed by", "Revisado por", lang), type: "signoff", signer: "supervisor", required: false, section: "record" },
      // Step 169: a customer's acknowledgement, signed on this device with the customer present,
      // through its own route and never through a save. Last, where a paper form puts it, so the
      // filer's own sign-off box is the first canvas on screen when it opens.
      { key: "customer_ack", label: desk("Customer acknowledgement", "Reconocimiento del cliente", lang), type: "customer_signature", required: false, section: "record" },
    ],
  });
  // The rules the API evaluates, read the same way here so the missing list is the API's judgement.
  const ruleHolds = (rule, answers) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) return true;
    if (Array.isArray(rule.any)) return rule.any.some((r) => ruleHolds(r, answers));
    if (Array.isArray(rule.all)) return rule.all.every((r) => ruleHolds(r, answers));
    if (typeof rule.key !== "string" || !Array.isArray(rule.anyOf)) return true;
    const v = (answers || {})[rule.key];
    return Array.isArray(v) ? v.some((x) => rule.anyOf.indexOf(x) >= 0) : rule.anyOf.indexOf(v) >= 0;
  };
  const hasAnswer = (v) => !(v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0));
  // A draft as GET /api/forms/drafts/:id answers it: the answers, the counts, and what is missing
  // by key and by label, in the language asked for. hand: a new draft has 7 required questions in
  // play (site, received_on, channel, summary, actions, filer_signoff, and call_back only when the
  // caller wants a call back), so it starts 0 answered and 6 to go.
  const deskView = (r, lang) => {
    const form = deskForm(lang);
    const answers = r.answers || {};
    const inPlay = form.fields.filter((f) => ruleHolds(f.appliesWhen, answers) && String(f.signer || "") !== "supervisor");
    const missing = inPlay.filter((f) => f.required && !hasAnswer(answers[f.key]));
    return {
      id: r.id, formCode: r.formCode, formName: form.title, status: statusOf(r), source: r.source, siteId: r.siteId, siteName: r.siteName,
      userId: r.userId, userName: r.userName, createdAt: r.createdAt, submittedAt: r.submittedAt || null, answers: answers,
      answered: inPlay.filter((f) => hasAnswer(answers[f.key])).length, remaining: missing.length,
      missing: missing.map((f) => f.key), missingFields: missing.map((f) => ({ key: f.key, label: f.label })),
    };
  };
  const deskFields = (r, lang) => deskForm(lang).fields.map((f, i) => Object.assign({ id: "dk-" + (i + 1), half: String(f.signer || "") === "supervisor" ? "supervisor" : "agent", value: (r.answers || {})[f.key] === undefined ? null : (r.answers || {})[f.key], displayValue: "" }, f));
  let deskSeq = 0;
  let customerSigSeq = 0;
  const deskDraft = (r) => r && r.formCode === DESK_CODE;

  // ---- Step 186: forms made with the builder ------------------------------------------------------
  // A form a builder made is read the way every form is read since Step 186, from its latest published
  // version, and the catalog sends it in the shape helpers/formCatalog.js gives every form at ocsa-api
  // 94dbe27: the code the builder gave it, the title in the language asked, the version, the apps that
  // offer it, and the questions of the filing half, labeled in that language. The catalog lists only
  // the forms the caller may fill and sends no fillers, so the dashboard offers each one it lists. None
  // is in the catalog until a case publishes it, the way POST /api/form-builder/drafts/:id/publish makes
  // a version the one every app offers, and a reset takes them back out. Every value is invented.
  //   OCSA-FRM-037  offered in the dashboard and to customers, so it is a customer's form.
  //   OCSA-FRM-038  offered in the staff app alone.
  //   OCSA-FRM-039  offered in the staff app and the dashboard, and about a person: its person question
  //                 names the employee, and aboutPerson files every report in that person's HR folder
  //                 under hr_ongoing, the way version 2 of OCSA-FRM-012 does in data/formRevisions.js.
  const BUILDER_FORMS = {
    "OCSA-FRM-037": { code: "OCSA-FRM-037", version: 1, customer: true, apps: ["dashboard", "customer"], readers: ["view_reports"],
      title: { en: "Lobby walkthrough with the tenant", es: "Recorrido del vest\u00edbulo con el inquilino" },
      fields: [
        { key: "walked_with", half: "agent", type: "text", required: true, en: "Who walked with you", es: "Qui\u00e9n hizo el recorrido con usted" },
        { key: "lobby_state", half: "agent", type: "select", required: true, en: "How the lobby looked", es: "C\u00f3mo se ve\u00eda el vest\u00edbulo",
          options: [{ value: "good", en: "Good", es: "Bien" }, { value: "needs_work", en: "Needs work", es: "Necesita trabajo" }] },
      ] },
    "OCSA-FRM-038": { code: "OCSA-FRM-038", version: 1, apps: ["portal"], readers: ["view_reports"],
      title: { en: "Dock door check", es: "Revisi\u00f3n de las puertas del muelle" },
      fields: [
        { key: "doors_closed", half: "agent", type: "select", required: true, en: "Every dock door closed", es: "Todas las puertas del muelle cerradas",
          options: [{ value: "yes", en: "Yes", es: "S\u00ed" }, { value: "no", en: "No", es: "No" }] },
        { key: "door_note", half: "agent", type: "textarea", required: false, en: "What was found at the doors", es: "Qu\u00e9 se encontr\u00f3 en las puertas" },
      ] },
    "OCSA-FRM-039": { code: "OCSA-FRM-039", version: 1, apps: ["portal", "dashboard"], readers: ["view_reports"],
      aboutPerson: { key: "employee", category: "hr_ongoing" },
      title: { en: "Follow-up talk", es: "Charla de seguimiento" },
      fields: [
        { key: "employee", half: "agent", type: "person", required: true, en: "Employee", es: "Empleado",
          help: { en: "Pick the person from the list. The name is read from their account.", es: "Elija a la persona de la lista. El nombre se toma de su cuenta." } },
        { key: "topic", half: "agent", type: "text", required: true, en: "What was talked about", es: "De qu\u00e9 se habl\u00f3" },
        { key: "next_steps", half: "agent", type: "textarea", required: false, en: "Next steps", es: "Pr\u00f3ximos pasos" },
      ] },
  };
  // A line in the language asked, and English where it has no Spanish, the way helpers/agentForms.js
  // reads a label, an option and a help line; a title falls back to the code, as titleOf does.
  const builderSay = (v, lang) => (v && typeof v === "object" ? String((lang === "es" && v.es) || v.en || "") : String(v || ""));
  const builderTitle = (code, lang) => (BUILDER_FORMS[code] ? builderSay(BUILDER_FORMS[code].title, lang) || code : code);
  const isPublished = (code) => !!BUILDER_FORMS[code] && (state.published || []).indexOf(code) >= 0;
  const builderCatalogForm = (def, lang) => ({
    code: def.code, title: builderTitle(def.code, lang), version: def.version, apps: def.apps.slice(),
    fields: def.fields.filter((f) => f.half === "agent").map((f) => ({
      key: f.key, label: builderSay(f, lang), type: f.type, required: f.required === true, osha: false, prefilled: !!f.prefill,
      options: (f.options || []).map((o) => ({ value: o.value, label: builderSay(o, lang) })), appliesWhen: null,
      help: f.help ? builderSay(f.help, lang) : null, section: null,
    })),
  });
  const publishedForms = (lang) => Object.keys(BUILDER_FORMS).filter(isPublished).map((code) => builderCatalogForm(BUILDER_FORMS[code], lang));
  // Reports filed on a builder form, which the list and the review window read once the form is
  // published. Each carries the version it was filed on, which the review's draft sends as version
  // since Step 186 (helpers/formDrafts.js draftView). fr-b1 was filed from the staff app. fr-b2 was filed
  // from the staff app by the supervisor about Tomasz Wisniewski, at 9:10 PM in New York on March 16,
  // which is March 17 in UTC; a person answer is stored as { userId, name }, the name read off the account.
  const BUILDER_FILINGS = [
    { id: "fr-b1", formCode: "OCSA-FRM-038", version: 1, status: "submitted", siteId: S[2].id, userId: "u-staff-8", source: "portal",
      createdAt: seed.shift(-2) + "T21:40:00Z", submittedAt: seed.shift(-2) + "T21:55:00Z",
      answers: { doors_closed: "no", door_note: "Door 3 would not seal at the bottom." } },
    { id: "fr-b2", formCode: "OCSA-FRM-039", version: 1, status: "submitted", siteId: S[0].id, userId: "u-sup-1", source: "portal",
      createdAt: seed.shift(0) + "T00:52:00Z", submittedAt: seed.shift(0) + "T01:10:00Z",
      answers: { employee: { userId: "u-staff-5", name: "Tomasz Wisniewski" }, topic: "Closing the dock on nights", next_steps: "Walk the dock together on Friday." } },
  ];
  let builderSeq = 0;
  const builderReports = () => { if (!state.builderReports) state.builderReports = clone(BUILDER_FILINGS); return state.builderReports; };
  const builderReport = (id) => builderReports().find((r) => r.id === id && isPublished(r.formCode)) || null;
  // What a question's answer reads as, helpers/formCatalog.js displayValueFor: a pick's label in the
  // language asked, a person picked as the name stored with the answer, the text as it was typed, and
  // nothing for nothing.
  const builderDisplay = (f, v, lang) => {
    if (v === null || v === undefined || v === "") return null;
    if (f.type === "person") return v && typeof v === "object" && typeof v.userId === "string" && v.userId && typeof v.name === "string" && v.name.trim() ? v.name.trim() : null;
    const o = (f.options || []).find((x) => x.value === v);
    return o ? builderSay(o, lang) : String(v);
  };
  // The draft as draftView sends it, with the list's name and site beside it.
  const builderView = (r, lang) => {
    const def = BUILDER_FORMS[r.formCode];
    const answers = r.answers || {};
    const asked = def.fields.filter((f) => f.half === "agent");
    const missing = asked.filter((f) => f.required && !hasAnswer(answers[f.key]));
    return {
      id: r.id, formCode: r.formCode, version: r.version, formName: builderTitle(r.formCode, lang), source: r.source, status: r.status, answers: answers,
      answered: asked.filter((f) => hasAnswer(answers[f.key])).length, remaining: missing.length,
      missing: missing.map((f) => f.key), missingFields: missing.map((f) => ({ key: f.key, label: builderSay(f, lang) })),
      userId: r.userId, userName: (state.staff.find((p) => p.id === r.userId) || {}).name || "",
      siteId: r.siteId || null, siteName: (state.sites.find((x) => x.id === r.siteId) || {}).name || null,
      dueAt: null, createdAt: r.createdAt, submittedAt: r.submittedAt || null,
    };
  };
  // The list's row carries no answers and no version, the way GET /api/forms/responses sends one.
  const builderListRow = (r, lang) => { const v = builderView(r, lang); ["answers", "version", "missing", "missingFields"].forEach((k) => { delete v[k]; }); return v; };
  // The report in reportPayload's shape: every question with its answer, and what this caller may do.
  // A reader of the form who did not file it may write the supervisor half of a filed report, and
  // these forms have none; an admin may void a filed report; a reader who did not file it may send it
  // again.
  const builderPayload = (r, lang) => {
    const def = BUILDER_FORMS[r.formCode];
    const mine = String(r.userId || "") === String(person().id);
    const reads = (def.readers || []).some((k) => !!effectiveMap(person(), state.overrides[person().id])[k]);
    return {
      draft: builderView(r, lang),
      fields: def.fields.map((f) => {
        const raw = Object.prototype.hasOwnProperty.call(r.answers || {}, f.key) ? r.answers[f.key] : null;
        return { key: f.key, label: builderSay(f, lang), type: f.type, half: f.half, section: null, osha: false, value: raw, displayValue: builderDisplay(f, raw, lang) };
      }),
      sections: null,
      canSign: [],
      canWriteSupervisor: r.status === "submitted" && reads && !mine,
      supervisorMissing: [],
      canVoid: person().role === "admin" && r.status === "submitted",
      canResend: reads && !mine && r.status === "submitted",
    };
  };
  // Who may read a report of a builder form, the rule helpers/formDrafts.js mayReadForm keeps: the person
  // who filed it, and whoever holds one of the form's readers.
  const builderReadable = (r) => String(r.userId || "") === String(person().id)
    || (BUILDER_FORMS[r.formCode].readers || []).some((k) => !!effectiveMap(person(), state.overrides[person().id])[k]);
  // Since Step 186 a person's folder holds every filed report of a form about a person whose answer names
  // them, the way helpers/formFolder.js folderItems reads them at ocsa-api 94dbe27: submitted or void,
  // only those the caller may read, each under the category the form's aboutPerson names, in the item
  // shape every folder item has, with source form, the report's id, the title in both languages, the day
  // it was filed, who filed it and its status.
  const folderForms = (p) => builderReports().filter((r) => {
    const about = BUILDER_FORMS[r.formCode].aboutPerson;
    const v = about && r.answers ? r.answers[about.key] : null;
    return isPublished(r.formCode) && (r.status === "submitted" || r.status === "void") && !!v && v.userId === p.id && builderReadable(r);
  }).map((r) => {
    const def = BUILDER_FORMS[r.formCode];
    const filer = (state.staff.find((x) => x.id === r.userId) || {}).name || null;
    const title = { en: builderSay(def.title, "en"), es: builderSay(def.title, "es") || builderSay(def.title, "en") };
    return {
      source: "form", source_id: r.id, responseId: r.id, formCode: r.formCode, formVersion: String(r.version), formTitle: title, title: title.en || r.formCode,
      category: def.aboutPerson.category, raw_category_label: null, date: r.submittedAt, filedBy: { id: r.userId || null, name: filer }, status: r.status,
      file_url: null, expiry_date: null, can_relabel: false, notes: null, jotform_form_id: null, jotform_form_title: null, jotform_submission_id: null,
      submitter_name: filer, category_override: null, document_type: null, training_name: null, training_type: null, score: null,
      administered_by: null, step_name: null, step_category: null, is_completed: null,
    };
  });
  // The refusals the draft routes of a builder form and the void route answer with, by code, in the
  // API's words for each language (helpers/words.js at ocsa-api 94dbe27), each with its status.
  const FORM_REFUSALS = {
    "forms.draftNotFound": { status: 404, en: "Draft not found", es: "No se encontr\u00f3 el reporte" },
    "forms.alreadySubmitted": { status: 409, en: "This report was already submitted", es: "Este reporte ya se hab\u00eda enviado" },
    "forms.answersShape": { status: 400, en: "Send answers as an object of key and value", es: "Env\u00ede las respuestas como un objeto de clave y valor" },
    "forms.unanswerable": { status: 400, en: "These fields cannot be answered here", es: "Estos campos no se pueden responder aqu\u00ed" },
    "forms.invalidAnswers": { status: 400, en: "Some answers are not valid", es: "Algunas respuestas no son v\u00e1lidas" },
    "forms.badPerson": { status: 400, en: "Pick a staff member from the list", es: "Elija a un empleado de la lista" },
    "forms.requiredUnanswered": { status: 400, en: "Required fields are unanswered", es: "Faltan campos obligatorios por responder" },
    "forms.reportNotFound": { status: 404, en: "Report not found", es: "No se encontr\u00f3 el reporte" },
    "access.insufficientPermissions": { status: 403, en: "Insufficient permissions", es: "No tiene permiso para hacer esto" },
    "forms.alreadyVoid": { status: 409, en: "This report is already void.", es: "Este reporte ya est\u00e1 anulado." },
    "forms.voidFiledOnly": { status: 409, en: "Only a filed report can be voided.", es: "Solo se puede anular un reporte ya enviado." },
    "forms.voidReasonRequired": { status: 400, en: "Write why this report is being voided.", es: "Escriba por qu\u00e9 se anula este reporte." },
    "forms.voidReasonTooLong": { status: 400, en: "Keep the reason to {max} characters or fewer.", es: "Escriba el motivo en {max} caracteres o menos." },
  };
  const formRefusal = (code, lang, vars, extra) => {
    const r = FORM_REFUSALS[code];
    const words = (lang === "es" ? r.es : r.en).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? String(vars[k]) : m));
    return { status: r.status, json: Object.assign({ error: words, code: code }, extra || {}) };
  };
  // A person answer, the way helpers/formAnswers.js personOutcome reads one since Step 186: the id a
  // picker sends, as userId or as id, names an active member of staff who is no client contact, and the
  // answer is stored as { userId, name } with the name the account holds. Empty clears it, and anything
  // else is refused.
  const personOutcome = (raw) => {
    if (raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")) return { clear: true };
    const id = typeof raw === "string" ? raw.trim() : raw && typeof raw === "object" && !Array.isArray(raw) ? String(raw.userId || raw.id || "").trim() : "";
    const u = id ? state.staff.find((x) => x.id === id && x.status === "active" && x.role !== "client_contact") : null;
    return u ? { value: { userId: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(" ").trim() } } : { invalid: true, reason: "person" };
  };
  // Any other answer, strictValue: a pick one of its values, the text as typed, and empty clears it.
  const plainOutcome = (f, raw) => {
    if (raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")) return { clear: true };
    if (f.type === "select") return (f.options || []).some((o) => o.value === String(raw).trim()) ? { value: String(raw).trim() } : { invalid: true };
    if (typeof raw === "object") return { invalid: true };
    return { value: String(raw).trim() };
  };
  const INCIDENT_FIELDS = (r) => [
    { id: "f-1", key: "where", label: "Where did it happen", half: "agent", type: "text",
      value: r.siteName || "", displayValue: r.siteName || "" },
    { id: "f-2", key: "what", label: "What happened", half: "agent", type: "textarea",
      // The bar is deliberate: the word table cuts a key at its last bar, so an answer drawn through
      // the table would lose its tail, and the language suite holds the window to the whole text.
      value: "A delivery pallet scuffed the lobby floor. Lobby | north entry.", displayValue: "A delivery pallet scuffed the lobby floor. Lobby | north entry." },
    { id: "f-3", key: "action", label: "Corrective action", half: "supervisor", type: "textarea",
      value: "", displayValue: "" },
  ];
  // Step 179: a filed report an admin voids keeps its row, set void, the way routes/forms.js keeps it.
  // The reason, who voided it and when are kept here by report, where the API writes them on its audit
  // and activity rows, and the report reads as void from then on, in its read, in the list and in every
  // flag, until a reset.
  const voided = () => state.voided || (state.voided = {});
  const statusOf = (r) => (voided()[r.id] ? "void" : r.status);
  // Step 175: where a filing came from. The seed's own filings were filed before there was a source to
  // store, and carry none. With filedSources on, each carries the source the API stores today, as if
  // filed now: the incident report and the vehicle report in the staff portal, and the service log and
  // the unfinished incident report through Help, which the API stores as agent. The admin also has a
  // complaint log of their own, filed from the dashboard, which a reset takes away with every other
  // desk filing.
  let filedSources = false;
  const SEED_SOURCES = { "ir-1": "portal", "ir-2": "agent", "ir-3": "portal", "fr-9": "agent" };
  const sourceOf = (r) => r.source || (filedSources ? SEED_SOURCES[r.id] : undefined);
  // A seed filing as the list and the read send it: its status, and its source when it has one.
  const asFiled = (r) => Object.assign({}, r, { status: statusOf(r) }, sourceOf(r) ? { source: sourceOf(r) } : {});
  const ADMIN_FILING_ID = "fr-desk-1";
  const adminFiling = () => {
    const a = seed.PEOPLE.admin;
    const name = a.firstName + " " + a.lastName;
    return { id: ADMIN_FILING_ID, formCode: DESK_CODE, status: "submitted", source: "admin", siteId: S[0].id, siteName: S[0].name,
      userId: a.id, userName: name, createdAt: seed.shift(-2) + "T15:00:00Z", submittedAt: seed.shift(-2) + "T15:25:00Z", dueAt: null,
      answers: { site: S[0].name, received_on: seed.shift(-2), received_at: "10:40", channel: "phone",
        summary: "The caller asked for the lobby mats to be changed before the weekend.",
        actions: [{ what: "Mats changed at the north entry", when: seed.shift(-2) }],
        filer_signoff: { userId: a.id, name: name, role: a.role, at: seed.shift(-2) + "T15:24:00Z", signature: { id: "sig-filer_signoff" } } } };
  };
  // What the read answers, and what the sign-off and supervisor routes answer back.
  const reportPayload = (r, lang) => {
    const isLog = r.id === SERVICE_LOG_ID;
    const isCustomer = customerFiling(r);
    const fields = isLog ? serviceLogFields() : isCustomer ? customerFields(r, lang) : deskDraft(r) ? deskFields(r, lang) : INCIDENT_FIELDS(r);
    const mine = String(r.userId || "") === String(person().id);
    const sup = filedState().supervisor;
    // Step 165: with the log locked, nobody may write its supervisor half or sign it, which is how a
    // person who is not a writer reads a photos question. Step 169: a customer's filing is written
    // and signed the same way, by whoever reviews it at a desk; its supervisor sign-off is its own.
    const stampKeys = fields.filter((f) => f.type === "signoff" && f.half === "supervisor").map((f) => f.key);
    const signed = stampKeys.some((k) => !!filedState().signed[k]);
    const canWrite = (isLog || isCustomer) && statusOf(r) === "submitted" && !mine && !filedExtras.locked;
    const required = isCustomer
      ? fields.filter((f) => f.half === "supervisor" && f.type === "number").map((f) => ({ key: f.key, label: f.label }))
      : supervisorRequired();
    const held = (key) => (isCustomer && !Object.prototype.hasOwnProperty.call(sup, key) ? (r.answers || {})[key] : sup[key]);
    const draft = isCustomer
      ? Object.assign(customerListRow(r, lang), { source: "customer", customer: r.customer, answers: r.answers })
      : asFiled(r);
    return Object.assign({
      draft: draft,
      fields: fields,
      // A void report takes no sign-off, the way maySign in helpers/formDrafts.js reads only a filed one.
      canSign: (isLog || isCustomer) && statusOf(r) === "submitted" && !mine && !signed && !filedExtras.locked ? stampKeys : [],
      canWriteSupervisor: canWrite,
      supervisorMissing: canWrite ? required.filter((q) => !answered(held(q.key))) : [],
      // Step 179, the way routes/forms.js answers both at ocsa-api 1c3fb42: an admin may void a filed
      // report, and a reader of the form who did not file it may send a filed report again. Whoever
      // may list filed reports here reads every form.
      canVoid: person().role === "admin" && statusOf(r) === "submitted",
      canResend: canListFiledForms() && !mine && statusOf(r) === "submitted",
    }, isCustomer ? { sections: CUSTOMER_SECTIONS[r.formCode](lang) } : isLog && filedExtras.sections ? { sections: LOG_SECTIONS[lang === "es" ? "es" : "en"] } : {});
  };
  // Step 179: what POST /api/forms/responses/:id/void refuses with, each the key of its words in the
  // API's helpers/words.js at 1c3fb42, answered in the language the call asked for with the key as its
  // code, the way errorBody answers. A reason is at most 500 characters.
  const VOID_WORDS = {
    "forms.reportNotFound": { en: "Report not found", es: "No se encontr\u00f3 el reporte" },
    "access.insufficientPermissions": { en: "Insufficient permissions", es: "No tiene permiso para hacer esto" },
    "forms.alreadyVoid": { en: "This report is already void.", es: "Este reporte ya est\u00e1 anulado." },
    "forms.voidFiledOnly": { en: "Only a filed report can be voided.", es: "Solo se puede anular un reporte ya enviado." },
    "forms.voidReasonRequired": { en: "Write why this report is being voided.", es: "Escriba por qu\u00e9 se anula este reporte." },
    "forms.voidReasonTooLong": { en: "Keep the reason to {max} characters or fewer.", es: "Escriba el motivo en {max} caracteres o menos." },
  };
  const VOID_REASON_MAX = 500;
  const voidRefusal = (code, status, lang, vars, extra) => {
    const words = VOID_WORDS[code][lang === "es" ? "es" : "en"].replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? String(vars[k]) : m));
    return { status: status, json: Object.assign({ error: words, code: code }, extra || {}) };
  };

  // ---- Step 169: customer links, and a customer's filings -------------------------------------
  // A customer link is a token per site per form, the address a customer opens from a QR code posted
  // in the building. Three are served: one live, one switched off, one unused past its clock. The
  // routes are the administrator's, manage_settings, which a supervisor does not hold; the view is
  // the one routes/customerLinks.js sends, the title in the language asked. Every value here is
  // invented, the portal's address included.
  const CUSTOMER_TITLES = {
    "OCSA-FRM-006": { en: "Facility Cleanliness Evaluation Checklist", es: "Lista de evaluaci\u00f3n de limpieza del edificio" },
    "OCSA-FRM-007": { en: "Client Satisfaction Survey", es: "Encuesta de satisfacci\u00f3n del cliente" },
  };
  const PORTAL_BASE = "https://portal.example.invalid";
  const customerLinkRows = () => [
    { id: "cl-1", token: "k7Qm2vX9pL4wR8sT1nB6yH3jF0cD5gZa", formCode: "OCSA-FRM-006", siteId: S[0].id, uses: 4, lastUsedAt: seed.shift(-2) + "T15:20:00Z", createdAt: seed.shift(-30) + "T13:00:00Z", createdBy: seed.PEOPLE.admin.id, disabledAt: null, disabledBy: null, expired: false },
    { id: "cl-2", token: "p3Wn8xC1vM6zQ9rL2kT7hB4yJ0dS5fGe", formCode: "OCSA-FRM-007", siteId: S[1].id, uses: 1, lastUsedAt: seed.shift(-9) + "T10:05:00Z", createdAt: seed.shift(-20) + "T09:30:00Z", createdBy: seed.PEOPLE.admin.id, disabledAt: seed.shift(-3) + "T16:00:00Z", disabledBy: seed.PEOPLE.admin.id, expired: false },
    { id: "cl-3", token: "z1Rt5yV8nK2mQ6xL9wB3cH7jP0aF4dSg", formCode: "OCSA-FRM-006", siteId: S[2].id, uses: 0, lastUsedAt: null, createdAt: seed.shift(-100) + "T08:00:00Z", createdBy: seed.PEOPLE.admin.id, disabledAt: null, disabledBy: null, expired: true },
  ];
  // hand: 3 links, newest first is cl-2 (20 days ago), then cl-1 (30), then cl-3 (100).
  let linkSeq = 0;
  const customerLinks = () => { if (!state.customerLinks) state.customerLinks = customerLinkRows(); return state.customerLinks; };
  const linkState = (l) => (l.disabledAt ? "disabled" : l.expired ? "expired" : "live");
  // Since Step 186 a customer's form is any form whose definition says customer, a builder form among
  // them once it is published (helpers/customerLinks.js isCustomerForm at ocsa-api 94dbe27), and a link
  // names its form by formTitleFor, the title in the language asked.
  const isCustomerForm = (code) => !!CUSTOMER_TITLES[code] || (isPublished(code) && BUILDER_FORMS[code].customer === true);
  const customerTitle = (code, lang) => (CUSTOMER_TITLES[code] ? CUSTOMER_TITLES[code][lang === "es" ? "es" : "en"] : builderTitle(code, lang));
  const linkView = (l, lang) => ({
    id: l.id, token: l.token, url: PORTAL_BASE + "/c/" + l.token,
    formCode: l.formCode, formTitle: customerTitle(l.formCode, lang),
    site: { id: l.siteId, name: (state.sites.find((s) => s.id === l.siteId) || {}).name || null },
    state: linkState(l), uses: l.uses, lastUsedAt: l.lastUsedAt, createdAt: l.createdAt, createdBy: l.createdBy,
    disabledAt: l.disabledAt, disabledBy: l.disabledBy,
  });
  const linkRefusal = (code, status, lang, extra) => ({ status, json: Object.assign({
    error: {
      "customer.formNotCustomer": lang === "es" ? "Ese formulario no lo llenan los clientes" : "That form is not filled by customers",
      "customer.siteNotFound": lang === "es" ? "No se encontr\u00f3 el sitio" : "Site not found",
      "customer.linkNotFound": lang === "es" ? "No se encontr\u00f3 el enlace" : "Link not found",
      "customer.anotherLinkLive": lang === "es" ? "Otro enlace para este sitio y formulario est\u00e1 activo" : "Another link for this site and form is live",
    }[code], code }, extra || {}) });
  const newestFirst = (rows) => rows.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  // Two of a customer's filings, one of each customer form, filed through a link: no account, so
  // userId is null and userName carries the customer's name and role on the list; the report itself
  // carries source customer and the customer beside the draft, as routes/forms.js sends them since
  // Step 167. The cleanliness checklist carries the customer's signature and the three numbers the
  // API prefilled for the Field Lead; the survey carries the averages the API computed.
  const CUSTOMER_FILINGS = [
    { id: "cf-1", formCode: "OCSA-FRM-006", status: "submitted", siteId: S[1].id, userId: null, source: "customer",
      customer: { name: "Rosalind Achterberg", role: "Facilities manager", linkId: "cl-1" },
      createdAt: seed.shift(-1) + "T19:55:00Z", submittedAt: seed.shift(-1) + "T20:12:00Z", answered: 40, remaining: 0, dueAt: null,
      answers: { completed_by: "Rosalind Achterberg", completed: "independently", first_impression: "acceptable", deficient_comments: "The east stairwell still had dust on the rails.",
        customer_signed: { name: "Rosalind Achterberg", role: "Facilities manager", signatureId: "csig-1", at: seed.shift(-1) + "T20:12:00Z" },
        acceptable_count: 27, deficient_count: 3, score: 90 } },
    { id: "cf-2", formCode: "OCSA-FRM-007", status: "submitted", siteId: S[2].id, userId: null, source: "customer",
      customer: { name: "Corvin Ballantyne", role: "Office manager", linkId: "cl-2" },
      createdAt: seed.shift(-5) + "T14:00:00Z", submittedAt: seed.shift(-5) + "T14:18:00Z", answered: 9, remaining: 0, dueAt: null,
      // hand: section 2 rated 4 and 4, section 3 rated 2, so 4.0 and 2.0, and the overall is (4 + 4 + 2) / 3 = 3.3.
      answers: { organization: "Ballantyne Holdings", your_name: "Corvin Ballantyne", your_role: "Office manager", overall_quality: "4", service_consistency: "4", response_speed: "2", recommend: "yes", follow_up: "no",
        _computed: { sections: { "2": 4, "3": 2 }, overall: 3.3, rated: 3 } } },
  ];
  const customerFiling = (r) => !!r && r.source === "customer";
  const anyReport = (id) => INCIDENT_REPORTS.find((x) => x.id === id) || CUSTOMER_FILINGS.find((x) => x.id === id) || null;
  const cw = (en, es, lang) => (lang === "es" ? es : en);
  const CUSTOMER_SECTIONS = {
    "OCSA-FRM-006": (lang) => [
      { key: "1", title: cw("Building and review details", "Datos del edificio y de la revisi\u00f3n", lang) },
      { key: "2", title: cw("Morning readiness", "Condici\u00f3n por la ma\u00f1ana", lang) },
      { key: "8", title: cw("Your feedback", "Sus comentarios", lang) },
      { key: "9", title: cw("For OCSA use", "Para uso de OCSA", lang) },
    ],
    "OCSA-FRM-007": (lang) => [
      { key: "1", title: cw("About you", "Sobre usted", lang) },
      { key: "2", title: cw("Service quality", "Calidad del servicio", lang) },
      { key: "3", title: cw("Communication", "Comunicaci\u00f3n", lang) },
      { key: "7", title: cw("Your comments", "Sus comentarios", lang) },
      { key: "8", title: cw("For OCSA use", "Para uso de OCSA", lang) },
    ],
  };
  const RATING_OPTIONS = ["1", "2", "3", "4", "5"].map((v) => ({ value: v, label: v }));
  const YES_NO = (lang) => [{ value: "yes", label: cw("Yes", "S\u00ed", lang) }, { value: "no", label: cw("No", "No", lang) }];
  const customerFields = (r, lang) => {
    const a = r.answers || {};
    const sup = filedState().supervisor;
    const supValue = (key) => (Object.prototype.hasOwnProperty.call(sup, key) ? sup[key] : (a[key] === undefined ? null : a[key]));
    const numberText = (v) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "");
    const stamp = filedState().signed.received_by || filedState().signed.reviewed_by || null;
    if (r.formCode === "OCSA-FRM-006") {
      return [
        { id: "cf1-1", key: "completed_by", label: cw("Completed by", "Completado por", lang), half: "agent", type: "text", section: "1", value: a.completed_by, displayValue: a.completed_by },
        { id: "cf1-2", key: "completed", label: cw("How this checklist was completed", "C\u00f3mo se complet\u00f3 esta lista", lang), half: "agent", type: "select", section: "1",
          options: [{ value: "independently", label: cw("Independently by the customer", "Por el cliente de forma independiente", lang) }, { value: "together", label: cw("Together with OCSA", "Junto con OCSA", lang) }],
          value: a.completed, displayValue: cw("Independently by the customer", "Por el cliente de forma independiente", lang) },
        { id: "cf1-3", key: "first_impression", label: cw("First impression on arrival", "Primera impresi\u00f3n al llegar", lang), half: "agent", type: "select", section: "2",
          options: [{ value: "acceptable", label: cw("Acceptable", "Aceptable", lang) }, { value: "deficient", label: cw("Deficient", "Deficiente", lang) }],
          value: a.first_impression, displayValue: cw("Acceptable", "Aceptable", lang) },
        { id: "cf1-4", key: "deficient_comments", label: cw("Comments on anything deficient", "Comentarios sobre lo deficiente", lang), half: "agent", type: "textarea", section: "8", value: a.deficient_comments, displayValue: a.deficient_comments },
        { id: "cf1-5", key: "photos", label: cw("Photos", "Fotos", lang), half: "agent", type: "photos", section: "8", maxPhotos: 3, value: [], displayValue: "" },
        { id: "cf1-6", key: "customer_signed", label: cw("Signed by the customer representative", "Firmado por el representante del cliente", lang), half: "agent", type: "customer_signature", section: "8",
          value: a.customer_signed, signature: { id: a.customer_signed.signatureId },
          displayValue: cw("Signed by Rosalind Achterberg, Facilities manager on March 16, 2026 at 4:12 PM", "Firmado por Rosalind Achterberg, Facilities manager el 16 de marzo de 2026 a las 4:12 PM", lang) },
        { id: "cf1-7", key: "acceptable_count", label: cw("Acceptable lines", "L\u00edneas aceptables", lang), half: "supervisor", type: "number", section: "9", value: supValue("acceptable_count"), displayValue: numberText(supValue("acceptable_count")) },
        { id: "cf1-8", key: "deficient_count", label: cw("Deficient lines", "L\u00edneas deficientes", lang), half: "supervisor", type: "number", section: "9", value: supValue("deficient_count"), displayValue: numberText(supValue("deficient_count")) },
        { id: "cf1-9", key: "score", label: cw("Score", "Puntaje", lang), half: "supervisor", type: "number", section: "9", value: supValue("score"), displayValue: numberText(supValue("score")) },
        { id: "cf1-10", key: "lowest_area", label: cw("Lowest scoring area", "\u00c1rea con el puntaje m\u00e1s bajo", lang), half: "supervisor", type: "text", section: "9", value: supValue("lowest_area") || "", displayValue: supValue("lowest_area") || "" },
        { id: "cf1-11", key: "received_by", label: cw("Received by", "Recibido por", lang), half: "supervisor", type: "signoff", signer: "supervisor", section: "9", value: stamp, displayValue: "" },
      ];
    }
    return [
      { id: "cf2-1", key: "organization", label: cw("Organization", "Organizaci\u00f3n", lang), half: "agent", type: "text", section: "1", value: a.organization, displayValue: a.organization },
      { id: "cf2-2", key: "your_name", label: cw("Your name", "Su nombre", lang), half: "agent", type: "text", section: "1", value: a.your_name, displayValue: a.your_name },
      { id: "cf2-3", key: "your_role", label: cw("Your role", "Su cargo", lang), half: "agent", type: "text", section: "1", value: a.your_role, displayValue: a.your_role },
      { id: "cf2-4", key: "overall_quality", label: cw("Overall quality of the cleaning", "Calidad general de la limpieza", lang), half: "agent", type: "select", section: "2", options: RATING_OPTIONS, value: a.overall_quality, displayValue: "4" },
      { id: "cf2-5", key: "service_consistency", label: cw("Consistency of the service", "Consistencia del servicio", lang), half: "agent", type: "select", section: "2", options: RATING_OPTIONS, value: a.service_consistency, displayValue: "4" },
      { id: "cf2-6", key: "response_speed", label: cw("Speed of the response", "Rapidez de la respuesta", lang), half: "agent", type: "select", section: "3", options: RATING_OPTIONS, value: a.response_speed, displayValue: "2" },
      { id: "cf2-7", key: "recommend", label: cw("Would you recommend OCSA", "Recomendar\u00eda a OCSA", lang), half: "agent", type: "select", section: "7", options: YES_NO(lang), value: a.recommend, displayValue: cw("Yes", "S\u00ed", lang) },
      { id: "cf2-8", key: "follow_up", label: cw("Would you like a follow-up call", "Quiere una llamada de seguimiento", lang), half: "agent", type: "select", section: "7", options: YES_NO(lang), value: a.follow_up, displayValue: cw("No", "No", lang) },
      { id: "cf2-9", key: "low_scores_followed_up", label: cw("How the low scores were followed up", "C\u00f3mo se dio seguimiento a los puntajes bajos", lang), half: "supervisor", type: "textarea", section: "8", value: supValue("low_scores_followed_up") || "", displayValue: supValue("low_scores_followed_up") || "" },
      { id: "cf2-10", key: "reviewed_by", label: cw("Reviewed by", "Revisado por", lang), half: "supervisor", type: "signoff", signer: "supervisor", section: "8", value: stamp, displayValue: "" },
    ];
  };
  // What the list sends for a customer's filing: the name and role where an account's name goes.
  const customerListRow = (r, lang) => ({
    id: r.id, formCode: r.formCode, formName: CUSTOMER_TITLES[r.formCode][lang === "es" ? "es" : "en"], status: statusOf(r), userId: null,
    userName: [r.customer.name, r.customer.role].filter(Boolean).join(", "),
    siteId: r.siteId, siteName: (state.sites.find((s) => s.id === r.siteId) || {}).name || null,
    answered: r.answered, remaining: r.remaining, dueAt: r.dueAt, createdAt: r.createdAt, submittedAt: r.submittedAt,
  });

  // ---- Step 186: the form builder -------------------------------------------------------------------
  // Forms as versions, and the drafts the builder holds, the way routes/formBuilder.js,
  // helpers/formBuilder.js and helpers/formStore.js answer them at ocsa-api 94dbe27. Four codes: the
  // daily service log, copied in from the code at boot; the complaint log, copied in at boot and then
  // version 2 from the builder, with a draft of version 3 open; a ladder checklist the builder made
  // and an admin retired; and a floor buffer sign-out nobody has published yet, whose draft holds two
  // questions and two problems. The last two are numbered 040 and 041, after the three builder forms
  // the catalog above serves, 037 to 039. A definition is held in the engine's shape, every line in
  // both languages, and read through a copy of the API's catalog for its preview and of the part of
  // its check these definitions reach for its problems, in the API's paths and words. A turn is
  // answered from what the draft's script holds next, in the language the call names, the way the
  // model's answer is cleaned, checked and stored. Every title, question, note and reply is invented.
  const FB_BOOT_NOTE = "Copied in from the code at boot";
  const fbLine = (en, es) => ({ en, es });
  const fbOpt = (value, en, es) => ({ value, en, es });
  const FB_LOG = { title: fbLine("Daily Service Log", "Registro diario de servicio"), apps: ["portal"], fillers: "everyone", readers: ["manage_tasks"], fields: [
    { key: "service_date", half: "agent", type: "date", en: "Date of service", es: "Fecha del servicio", required: true },
    { key: "areas_done", half: "agent", type: "textarea", en: "Areas cleaned", es: "\u00c1reas limpiadas", required: true },
  ] };
  const FB_COMPLAINT_1 = { title: fbLine("Customer Complaint Log", "Registro de quejas de clientes"), apps: ["portal"], fillers: "everyone", readers: ["manage_tasks"], fields: [
    { key: "received_on", half: "agent", type: "date", en: "Received on", es: "Recibida el", required: true },
    { key: "summary", half: "agent", type: "textarea", en: "What the customer said", es: "Lo que dijo el cliente", required: true },
  ] };
  const FB_COMPLAINT_2 = Object.assign({}, FB_COMPLAINT_1, { apps: ["portal", "dashboard"], fields: FB_COMPLAINT_1.fields.concat([
    { key: "follow_up", half: "agent", type: "select", en: "Does the customer want a call back", es: "Quiere el cliente que le devuelvan la llamada", required: false,
      options: [fbOpt("yes", "Yes", "S\u00ed"), fbOpt("no", "No", "No")] },
  ]) });
  const FB_COMPLAINT_3 = Object.assign({}, FB_COMPLAINT_2, { fields: FB_COMPLAINT_2.fields.concat([
    { key: "call_back", half: "agent", type: "text", en: "Number to call back", es: "N\u00famero al que devolver la llamada", required: true, appliesWhen: { key: "follow_up", anyOf: ["yes"] } },
  ]) });
  const FB_LADDER = { title: fbLine("Ladder Inspection Checklist", "Lista de revisi\u00f3n de escaleras"), apps: ["portal"], fillers: "everyone", readers: ["manage_tasks"], fields: [
    { key: "ladder_no", half: "agent", type: "text", en: "Ladder number", es: "N\u00famero de la escalera", required: true },
  ] };
  // The floor buffer sign-out before the turn: offered in no app, and a pick with no choices, which
  // are the two problems the check names. After the turn: the staff app, the pick's two choices, the
  // buffer taken, and two questions a damaged buffer opens, one a photos question whose maxPhotos is
  // 0, which is the one problem left.
  const FB_BUFFER_1 = { title: fbLine("Floor Buffer Sign-out", "Registro de salida de la pulidora"), apps: [], fillers: "everyone", readers: ["manage_tasks"], fields: [
    { key: "taken_by", half: "agent", type: "text", en: "Who is taking the buffer", es: "Qui\u00e9n se lleva la pulidora", required: true },
    { key: "condition", half: "agent", type: "select", en: "How it came back", es: "C\u00f3mo regres\u00f3", required: true },
  ] };
  const FB_BUFFER_2 = Object.assign({}, FB_BUFFER_1, { apps: ["portal"], fields: [
    FB_BUFFER_1.fields[0],
    { key: "buffer", half: "agent", type: "select", en: "Which buffer", es: "Cu\u00e1l pulidora", required: true,
      options: [fbOpt("north", "North closet buffer", "Pulidora del cuarto norte"), fbOpt("south", "South closet buffer", "Pulidora del cuarto sur")] },
    Object.assign({}, FB_BUFFER_1.fields[1], { options: [fbOpt("fine", "In working order", "Funcionando bien"), fbOpt("damaged", "Damaged", "Da\u00f1ada")] }),
    { key: "damage_notes", half: "agent", type: "textarea", en: "What was wrong with it", es: "Qu\u00e9 le pasaba", required: true, appliesWhen: { key: "condition", anyOf: ["damaged"] } },
    { key: "damage_photos", half: "agent", type: "photos", en: "Photos of the damage", es: "Fotos del da\u00f1o", required: false, maxPhotos: 0, appliesWhen: { key: "condition", anyOf: ["damaged"] } },
  ] });
  const FB_BUFFER_REPLY = {
    en: "I gave How it came back two choices and added two questions for a damaged buffer: what was wrong with it, and photos of the damage. The staff app offers the form now.",
    es: "Le di dos opciones a C\u00f3mo regres\u00f3 y agregu\u00e9 dos preguntas para una pulidora da\u00f1ada: qu\u00e9 le pasaba y fotos del da\u00f1o. La aplicaci\u00f3n del personal ofrece el formulario ahora.",
  };
  // What a turn answers once the script holds nothing more: the definition as it stands.
  const FB_KEPT_REPLY = { en: "I kept the form as it is.", es: "Dej\u00e9 el formulario como est\u00e1." };
  // Draft ids are uuids, the way the table keys its rows; a new draft takes the next one.
  const FB_ID = "5b0e2c4a-7d31-4f8e-9a60-0000000000";
  const FB_DRAFT_COMPLAINT = FB_ID + "01";
  const FB_DRAFT_BUFFER = FB_ID + "02";
  const fbWorld = () => {
    if (state.formBuilder) return state.formBuilder;
    const v = (version, status, source, def, publishedAt, publishedBy, changeNote) => ({ version, status, source, definition: clone(def), publishedAt, publishedBy, changeNote });
    state.formBuilder = {
      store: {
        "OCSA-FRM-005": [v(1, "published", "code", FB_LOG, "2026-02-03T15:20:00Z", null, FB_BOOT_NOTE)],
        "OCSA-FRM-009": [v(1, "published", "code", FB_COMPLAINT_1, "2026-02-03T15:20:00Z", null, FB_BOOT_NOTE),
          v(2, "published", "builder", FB_COMPLAINT_2, "2026-03-10T14:05:00Z", seed.PEOPLE.admin.id, "Asks whether the customer wants a call back.")],
        "OCSA-FRM-040": [v(1, "retired", "builder", FB_LADDER, "2025-11-20T17:00:00Z", seed.PEOPLE.admin.id, "First version.")],
      },
      drafts: [
        { id: FB_DRAFT_COMPLAINT, code: "OCSA-FRM-009", version: 3, status: "draft", source: "builder", definition: clone(FB_COMPLAINT_3),
          recipients: [{ userId: seed.PEOPLE.supervisor.id, viaEmail: true, viaInApp: true }, { email: "complaints@example.invalid", viaEmail: true, viaInApp: false }],
          delivery: "pdf", draftedBy: seed.PEOPLE.supervisor.id, updatedAt: "2026-03-16T19:40:00Z", script: [],
          conversation: [
            { role: "user", text: "Ask for a number to call back, only when the customer wants a call back.", at: "2026-03-16T19:40:00Z" },
            { role: "assistant", text: "I added Number to call back. It is asked only when the customer wants a call back.", at: "2026-03-16T19:40:00Z" },
          ] },
        { id: FB_DRAFT_BUFFER, code: "OCSA-FRM-041", version: 1, status: "draft", source: "builder", definition: clone(FB_BUFFER_1),
          recipients: null, delivery: null, draftedBy: seed.PEOPLE.admin.id, updatedAt: "2026-03-17T22:02:00Z",
          script: [{ definition: FB_BUFFER_2, reply: FB_BUFFER_REPLY }],
          conversation: [
            { role: "user", text: "A sign-out sheet for the floor buffers, filled by whoever takes one out.", at: "2026-03-17T22:02:00Z" },
            { role: "assistant", text: "I started the form with who is taking the buffer and how it came back. Which app should offer it?", at: "2026-03-17T22:02:00Z" },
          ] },
      ],
      seq: 2,
    };
    return state.formBuilder;
  };
  // The refusals routes/formBuilder.js answers, by the key helpers/words.js holds their words under.
  const FB_WORDS = {
    "access.insufficientPermissions": ["Insufficient permissions", "No tiene permiso para hacer esto"],
    "builder.notFound": ["Form or draft not found", "No se encontr\u00f3 el formulario o el borrador"],
    "builder.hasProblems": ["The draft has problems to fix before it can be published", "El borrador tiene problemas que corregir antes de publicarlo"],
    "builder.adminOnly": ["Only an administrator can publish or retire a form", "Solo un administrador puede publicar o retirar un formulario"],
    "builder.changeNoteRequired": ["Write a change note", "Escriba una nota de cambio"],
    "builder.changeNoteTooLong": ["The change note is over {max} characters", "La nota de cambio tiene m\u00e1s de {max} caracteres"],
    "builder.notADraft": ["This is no longer a draft", "Esto ya no es un borrador"],
    "builder.retireReasonRequired": ["Write the reason for retiring the form", "Escriba el motivo para retirar el formulario"],
    "builder.retireReasonTooLong": ["The reason is over {max} characters", "El motivo tiene m\u00e1s de {max} caracteres"],
    "builder.textRequired": ["Write a message for the builder", "Escriba un mensaje para el constructor"],
    "builder.textTooLong": ["The message is over {max} characters", "El mensaje tiene m\u00e1s de {max} caracteres"],
    "builder.nothingToChange": ["Send recipients, delivery or both", "Env\u00ede recipients, delivery o ambos"],
    "builder.recipientsShape": ["Send recipients as a list, or null to keep the form's own", "Env\u00ede recipients como una lista, o null para conservar los del formulario"],
    "builder.badDelivery": ["Choose app_link or pdf", "Elija app_link o pdf"],
    "builder.recipientUnknown": ["The recipient {who} is not an active staff member or a usable email address", "El destinatario {who} no es un empleado activo ni una direcci\u00f3n de correo utilizable"],
  };
  const fbFill = (text, vars) => String(text).replace(/\{([a-zA-Z]+)\}/g, (m, k) => (vars && Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
  const fbSay = (key, lang, vars) => fbFill(FB_WORDS[key][lang === "es" ? 1 : 0], vars);
  const fbRefusal = (status, key, lang, vars, extra) => ({ status, json: Object.assign({ error: fbSay(key, lang, vars), code: key }, extra || {}) });
  // The sentences of helpers/formCheck.js these definitions reach, in both languages.
  const FB_CHECK = {
    photosMax: ["the photos question {key} has a maxPhotos that is not a whole number above zero", "la pregunta de fotos {key} tiene un maxPhotos que no es un n\u00famero entero mayor que cero"],
    noFields: ["{code} has no fields", "{code} no tiene campos"],
    noEnglish: ["{what} has no English label", "{whatEs} no tiene etiqueta en ingl\u00e9s"],
    noSpanish: ["{what} has no Spanish label", "{whatEs} no tiene etiqueta en espa\u00f1ol"],
    noOptions: ["the field {key} is a pick with no options", "el campo {key} es una selecci\u00f3n sin opciones"],
    statesNo: ["{code} states no {what}", "{code} no indica {what}"],
    statesEmpty: ["{code} states an empty {what}", "{code} indica {what} vac\u00edo"],
    appsShape: ["{code} states no apps", "{code} no indica apps"],
    appsEmpty: ["{code} states an empty apps", "{code} indica apps vac\u00edo"],
  };
  const fbProblem = (path, id, vars) => ({ path, en: fbFill(FB_CHECK[id][0], vars), es: fbFill(FB_CHECK[id][1], vars) });
  // The problems, in the order the check's rules run: photos, keys, labels, shapes, access, apps.
  const fbProblems = (def) => {
    const out = [];
    const code = def.code;
    const fields = Array.isArray(def.fields) ? def.fields : [];
    fields.filter((f) => f.type === "photos").forEach((f) => {
      if (f.maxPhotos !== undefined && !(Number.isInteger(f.maxPhotos) && f.maxPhotos > 0)) out.push(fbProblem("fields." + f.key + ".maxPhotos", "photosMax", { key: f.key }));
    });
    if (fields.length === 0) out.push(fbProblem("fields", "noFields", { code }));
    const missing = (path, what, whatEs, o) => {
      if (!o || typeof o.en !== "string" || !o.en.trim()) out.push(fbProblem(path, "noEnglish", { what, whatEs }));
      if (!o || typeof o.es !== "string" || !o.es.trim()) out.push(fbProblem(path, "noSpanish", { what, whatEs }));
    };
    missing("title", "the title of " + code, "el t\u00edtulo de " + code, def.title);
    fields.forEach((f) => {
      missing("fields." + f.key, "the field " + f.key, "el campo " + f.key, f);
      (f.options || []).forEach((o) => missing("fields." + f.key + ".options." + o.value, "the option " + f.key + "." + o.value, "la opci\u00f3n " + f.key + "." + o.value, o));
    });
    fields.forEach((f) => {
      if ((f.type === "select" || f.type === "multiselect") && (!Array.isArray(f.options) || f.options.length === 0)) out.push(fbProblem("fields." + f.key + ".options", "noOptions", { key: f.key }));
    });
    const caps = (what, list) => {
      if (!Array.isArray(list)) out.push(fbProblem(what, "statesNo", { code, what }));
      else if (list.length === 0) out.push(fbProblem(what, "statesEmpty", { code, what }));
    };
    if (def.fillers !== "everyone") caps("fillers", def.fillers);
    caps("readers", def.readers);
    if (!Array.isArray(def.apps)) out.push(fbProblem("apps", "appsShape", { code }));
    else if (def.apps.length === 0) out.push(fbProblem("apps", "appsEmpty", { code }));
    return out;
  };
  // What GET /api/forms would send for a definition, helpers/formCatalog.js's catalogForm: the title
  // and every line in the language asked for, English where a line has none, the agent half in the
  // definition's order, and sensitive on a question the builder flagged.
  const fbSays = (o, lang) => (lang === "es" && o.es ? o.es : o.en);
  const fbPreview = (def, lang) => {
    const title = def.title && typeof def.title === "object" ? def.title : {};
    const said = (lang && typeof title[lang] === "string" ? title[lang].trim() : "") || (typeof title.en === "string" ? title.en.trim() : "") || String(def.code || "");
    return {
      code: def.code, title: said, version: def.version, apps: Array.isArray(def.apps) ? def.apps.slice() : [],
      fields: (def.fields || []).filter((f) => f.half === "agent").map((f) => Object.assign({
        key: f.key, label: fbSays(f, lang), type: f.type, required: f.required === true, osha: f.osha === true, prefilled: !!f.prefill,
        options: f.type === "select" || f.type === "multiselect" ? (f.options || []).map((o) => ({ value: o.value, label: fbSays(o, lang) })) : [],
        appliesWhen: f.appliesWhen || null, help: null, section: f.section || null,
      }, f.type === "photos" ? { maxPhotos: Number.isFinite(f.maxPhotos) ? f.maxPhotos : 6 } : {}, f.sensitive === true ? { sensitive: true } : {})),
    };
  };
  const fbName = (id) => { const p = state.staff.find((x) => x.id === id); return p ? p.name : null; };
  const fbLatest = (code) => (fbWorld().store[code] || []).filter((x) => x.status === "published").pop() || null;
  const fbLastNumber = (code) => { const list = fbWorld().store[code] || []; return list.length ? list[list.length - 1].version : 0; };
  const fbOpenDraft = (code) => fbWorld().drafts.find((x) => x.code === code && x.status === "draft") || null;
  const fbDefinition = (row) => Object.assign(clone(row.definition), { code: row.code, version: String(row.version) });
  // Who gets the filled report, normalized the way publish normalizes it: one entry per person or
  // address, an address email only, a person with no channel told in the app. Each person is read
  // off the staff, and a person who is not active, or an address that could not be delivered to, is
  // a problem at recipients.<i> naming them.
  const fbNormalize = (list) => {
    const out = [];
    const seen = new Set();
    (list || []).forEach((raw) => {
      const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
      const userId = o.userId === undefined || o.userId === null || o.userId === "" ? null : String(o.userId);
      const r = userId ? { userId, viaEmail: o.viaEmail === undefined ? true : o.viaEmail === true, viaInApp: o.viaInApp === undefined ? true : o.viaInApp === true }
        : { email: String(o.email || "").trim().toLowerCase() || null, viaEmail: true, viaInApp: false };
      const key = r.userId ? "u:" + r.userId : "e:" + String(r.email || "");
      if (seen.has(key)) return;
      seen.add(key);
      if (!r.viaEmail && !r.viaInApp) r.viaInApp = true;
      out.push(r);
    });
    return out;
  };
  const fbRecipients = (row) => {
    if (!Array.isArray(row.recipients)) return { recipients: [], problems: [], bad: [] };
    const recipients = [];
    const problems = [];
    const bad = [];
    fbNormalize(row.recipients).forEach((r, i) => {
      const path = "recipients." + i;
      const who = r.userId ? state.staff.find((x) => x.id === r.userId) : null;
      const usable = r.userId ? !!who && who.status === "active" && who.role !== "client_contact" : !!r.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email);
      recipients.push(r.userId ? { userId: r.userId, name: who ? who.name : null, viaEmail: r.viaEmail, viaInApp: r.viaInApp } : { email: r.email, viaEmail: true, viaInApp: false });
      if (!usable) {
        const name = r.userId ? (who ? who.name : r.userId) : r.email || "(none)";
        problems.push({ path, en: fbSay("builder.recipientUnknown", "en", { who: name }), es: fbSay("builder.recipientUnknown", "es", { who: name }) });
        bad.push({ path, who: name });
      }
    });
    return { recipients, problems, bad };
  };
  // The draft as helpers/formBuilder.js's draftView sends it, and the read's whole answer.
  const fbDraftView = (row) => {
    const def = fbDefinition(row);
    const rec = fbRecipients(row);
    return {
      draft: {
        id: row.id, code: row.code, version: row.status === "draft" ? Math.max(row.version, fbLastNumber(row.code) + 1) : row.version, status: row.status,
        definition: def, recipients: rec.recipients,
        delivery: row.delivery === "pdf" || row.delivery === "app_link" ? row.delivery : state.formDelivery[row.code] || "app_link",
        updatedAt: row.updatedAt, draftedBy: row.draftedBy ? { id: row.draftedBy, name: fbName(row.draftedBy) } : null,
      },
      problems: fbProblems(def).concat(rec.problems),
      notes: [],
    };
  };
  const fbReadView = (row, lang) => {
    const view = fbDraftView(row);
    return { draft: view.draft, problems: view.problems, notes: view.notes, preview: fbPreview(view.draft.definition, lang), conversation: row.conversation.map((m) => Object.assign({}, m)) };
  };
  // One row of the list, as listForms builds it: the latest version, the status, where it came from,
  // its apps, its open draft and every live version with who published it.
  const fbListRow = (code) => {
    const versions = fbWorld().store[code] || [];
    const last = versions.length ? versions[versions.length - 1] : null;
    const latest = fbLatest(code);
    const draft = fbOpenDraft(code);
    const from = latest ? latest.definition : last ? last.definition : draft ? draft.definition : null;
    const title = from && from.title && typeof from.title === "object" ? from.title : { en: "", es: "" };
    return {
      code, title: { en: String(title.en || ""), es: String(title.es || "") },
      latestVersion: last ? last.version : 0,
      status: latest ? "published" : last ? "retired" : "draft",
      source: last ? last.source : draft ? draft.source : "code",
      apps: from && Array.isArray(from.apps) ? from.apps.slice() : [],
      draft: draft ? { id: draft.id, version: draft.version, updatedAt: draft.updatedAt, draftedBy: draft.draftedBy ? { id: draft.draftedBy, name: fbName(draft.draftedBy) } : null } : null,
      versions: versions.map((x) => ({ version: x.version, status: x.status, source: x.source, publishedAt: x.publishedAt,
        publishedBy: x.publishedBy ? { id: x.publishedBy, name: fbName(x.publishedBy) } : null, changeNote: x.changeNote })),
    };
  };
  // Every code the store holds and every code with an open draft, in code order. hand: 005, 009, 040
  // and 041, four rows.
  const fbList = () => {
    const w = fbWorld();
    const codes = new Set(Object.keys(w.store).concat(w.drafts.filter((x) => x.status === "draft").map((x) => x.code)));
    return Array.from(codes).sort().map(fbListRow);
  };
  // The next OCSA-FRM-### above every code the table has held, whatever its status. hand: 042.
  const fbNextCode = () => {
    const w = fbWorld();
    let max = 0;
    Object.keys(w.store).concat(w.drafts.map((x) => x.code)).forEach((c) => { const m = /^OCSA-FRM-(\d{3})$/.exec(c); if (m) max = Math.max(max, parseInt(m[1], 10)); });
    return "OCSA-FRM-" + String(max + 1).padStart(3, "0");
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
  // Step 183: the rating each answer carries once its person rates it, by the answer's id.
  let agentFeedback = {};
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
      // Since Step 183 an answer is stored with its id and the names of what it cited, which the
      // conversation route reads back beside it.
      if (done.messageId !== undefined) answer.id = done.messageId;
      if (done.citedNames !== undefined) answer.citedNames = done.citedNames;
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
    // An answer rated since it was stored carries its rating, the way the conversation route reads
    // feedback_helpful, feedback_note and feedback_at off the row.
    return (AGENT_CONVERSATIONS[id] || []).concat(agentTalk[id] || [])
      .map((r) => (r.id && agentFeedback[r.id] ? Object.assign({}, r, { feedback: agentFeedback[r.id] }) : r));
  }

  // ---- Step 183: Help insights ---------------------------------------------------------------------
  // Answers Help gave, one row each, the way routes/helpInsights.js reads agent_messages at ocsa-api
  // 1c3fb42: the question, who asked and in which role, where, in which language and app, what kind of
  // answer it was, how long it took, the documents it cited and any rating. Every figure the three
  // routes answer is counted from these rows through the filters the address names, the way the API
  // counts it, the language filter included, which the API reads from locale=, the same name every
  // signed-in call carries its own language under. Every value is invented.
  const HELP_DOCS = {
    "DOC-SUPPLY-2": { en: "Supply room procedure", es: "Procedimiento del cuarto de suministros", ref: "2", title: "Restocking" },
    "DOC-FLOOR-1": { en: "Floor care procedure", es: "Procedimiento de cuidado de pisos", ref: "1", title: "Buffing" },
  };
  const HELP_ROWS = [
    { id: "hm-1", at: "2026-03-16T14:00:00Z", question: "Where do I log a soap refill?", answer: "Log it on Supplies, under the site.", person: "u-staff-5", role: "custodial_lead", site: "s-1", locale: "en", app: "portal", kind: "answer", ms: 4000, cited: ["DOC-SUPPLY-2"], helpful: true, note: null },
    { id: "hm-2", at: "2026-03-16T15:00:00Z", question: "Who signs the dock log?", answer: "No procedure covers that yet.", person: "u-staff-5", role: "custodial_lead", site: "s-1", locale: "en", app: "portal", kind: "noProcedure", ms: 6000, cited: [], helpful: null, note: null },
    { id: "hm-3", at: "2026-03-15T10:00:00Z", question: "\u00bfCu\u00e1nto cloro lleva la mezcla?", answer: "Una medida por cubeta.", person: "u-staff-6", role: "custodial_laborer", site: "s-2", locale: "es", app: "portal", kind: "answer", ms: 5000, cited: ["DOC-SUPPLY-2"], helpful: false, note: "Faltaba el paso del enjuague" },
    { id: "hm-4", at: "2026-03-15T11:00:00Z", question: "\u00bfC\u00f3mo se pule el pasillo?", answer: "Con la almohadilla roja.", person: "u-staff-6", role: "custodial_laborer", site: "s-2", locale: "es", app: "portal", kind: "answer", ms: 3000, cited: ["DOC-FLOOR-1"], helpful: null, note: null },
    { id: "hm-5", at: "2026-03-14T09:00:00Z", question: "Can a shift end early?", answer: "Help could not reach the library.", person: "u-staff-7", role: "day_porter", site: "s-3", locale: "en", app: "portal", kind: "degraded", ms: 8000, cited: [], helpful: null, note: null },
    { id: "hm-6", at: "2026-03-17T20:00:00Z", question: "Which floors buff tonight?", answer: "Floors two and three.", person: "u-sup-1", role: "supervisor", site: "s-2", locale: "en", app: "dashboard", kind: "answer", ms: 2000, cited: ["DOC-FLOOR-1"], helpful: true, note: null },
    { id: "hm-7", at: "2026-03-10T09:00:00Z", question: "\u00bfD\u00f3nde est\u00e1n las bolsas?", answer: "En el cuarto de suministros.", person: "u-staff-7", role: "day_porter", site: "s-3", locale: "es", app: "portal", kind: "answer", ms: 7000, cited: ["DOC-SUPPLY-2"], helpful: null, note: null },
  ];
  // hand, the last 30 days ending March 17 with no filter: 7 questions from 4 people, 2 misses (hm-2
  // and hm-5), so 5 answered and round(200 / 7) = 29 percent missed; rated helpful 2, not helpful 1;
  // the reply times 2000 3000 4000 5000 6000 7000 8000 have the median 5000, "5.0 sec". By language
  // en 4 and es 3; by app portal 6 and dashboard 1; by site s-2 3, s-1 2 (1 missed), s-3 2 (1 missed);
  // topics the supply procedure 3 and the floor procedure 2.
  // With the language filter en, which is what the API reads when an English screen asks for all
  // languages: 4 questions from 3 people, 2 misses, 2 answered, 50 percent, helpful 2, not helpful 0,
  // times 2000 4000 6000 8000 with the median 5000; by language en 4 alone.
  // With es: 3 questions from 2 people, no miss, 3 answered, 0 percent, helpful 0, not helpful 1,
  // times 3000 5000 7000 with the median 5000; by language es 3 alone.
  const helpDay = (at) => new Date(at).toLocaleDateString("en-CA", { timeZone: seed.TIMEZONE });
  const helpIsMiss = (r) => r.kind === "noProcedure" || r.kind === "degraded";
  const helpWindow = (q) => ({
    from: q("from") || seed.shift(-29), to: q("to") || seed.TODAY, site: q("siteId") || null, role: q("role") || null,
    locale: q("locale") === "en" || q("locale") === "es" ? q("locale") : null,
    app: q("app") === "portal" || q("app") === "dashboard" ? q("app") : null,
  });
  const helpRowsIn = (w) => HELP_ROWS.filter((r) => {
    const day = helpDay(r.at);
    return day >= w.from && day <= w.to && (!w.site || r.site === w.site) && (!w.role || r.role === w.role) && (!w.locale || r.locale === w.locale) && (!w.app || r.app === w.app);
  });
  const helpDocName = (code, lang) => (HELP_DOCS[code] ? HELP_DOCS[code][lang === "es" ? "es" : "en"] : code);
  const helpPerson = (id) => state.staff.find((x) => x.id === id) || {};
  const helpSiteName = (id) => (state.sites.find((x) => x.id === id) || {}).name || null;
  const helpCount = (rows, key) => { const m = {}; rows.forEach((r) => { m[r[key]] = (m[r[key]] || 0) + 1; }); return m; };

  // What GET /api/notification-recipients sends as types: the API's own list, helpers/notify.js,
  // type for type and name for name.
  const NOTIFICATION_TYPES = [
    { type: "issue", label: "A problem is reported", keyed: false, allowOutsideEmail: true, emailCarriesDetail: true },
    { type: "issue_escalated", label: "A worker cannot resolve an assigned problem", keyed: false, allowOutsideEmail: true, emailCarriesDetail: true },
    { type: "supply_request", label: "A supply request is made", keyed: false, allowOutsideEmail: true, emailCarriesDetail: true },
    { type: "form", label: "A form is submitted", keyed: true, allowOutsideEmail: true, emailCarriesDetail: false },
    { type: "shift_drop", label: "Someone asks to drop a shift", keyed: false, allowOutsideEmail: true, emailCarriesDetail: true },
    { type: "shift_claim", label: "Someone picks up an open shift", keyed: false, allowOutsideEmail: true, emailCarriesDetail: true },
    { type: "registration", label: "Someone registers for an account", keyed: false, allowOutsideEmail: true, emailCarriesDetail: false },
    { type: "time_off", label: "Someone requests time off", keyed: false, allowOutsideEmail: true, emailCarriesDetail: false },
    { type: "hr_case", label: "A Speak Up report is filed", keyed: false, allowOutsideEmail: false, emailCarriesDetail: false },
    { type: "hr_case_fallback", label: "Nobody else can read a Speak Up report", keyed: false, allowOutsideEmail: false, emailCarriesDetail: false },
  ];
  // And its forms: every form the API defines, by code, with the English title the route always
  // sends. Each starts on the link to the app, which is what the API does.
  const NOTIFICATION_FORMS = [
    { code: "OCSA-FRM-005", title: "Daily Service Log", delivery: "app_link" },
    { code: "OCSA-FRM-009", title: "Customer Complaint Log", delivery: "app_link" },
    { code: "OCSA-FRM-016", title: "Safety Incident Report", delivery: "app_link" },
    { code: "OCSA-FRM-017", title: "Biohazard Incident and Exposure Report", delivery: "app_link" },
    { code: "OCSA-FRM-019", title: "PPE Compliance Log, monthly check", delivery: "app_link" },
  ];
  const NOTIFICATION_RECIPIENTS = [
    { id: "nr-1", subjectType: "time_off", subjectKey: "", isActive: true, viaEmail: true, viaInApp: true, user: { id: seed.STAFF[0].id, name: seed.STAFF[0].name, role: seed.STAFF[0].role } },
    { id: "nr-2", subjectType: "issue", subjectKey: "", isActive: true, viaEmail: false, viaInApp: true, user: { id: seed.STAFF[1].id, name: seed.STAFF[1].name, role: seed.STAFF[1].role } },
    { id: "nr-3", subjectType: "form", subjectKey: "", isActive: true, viaEmail: true, viaInApp: true, user: { id: seed.STAFF[0].id, name: seed.STAFF[0].name, role: seed.STAFF[0].role } },
    { id: "nr-4", subjectType: "form", subjectKey: "OCSA-FRM-016", isActive: true, viaEmail: true, viaInApp: false, email: "reports@example.invalid" },
  ];
  // hand: 4 rows set, over three kinds. One is an outside address, on one form.

  // Step 179: the general chat and every active site's chat, the way GET /api/chat/channels lists them
  // (routes/chat.js at ocsa-api 1c3fb42): by name, the general chat under the name the API writes it
  // with, General, and each site's chat under its site's name. Each is answered with unreadCount, read
  // from state.chatUnread, which is 0 for every chat until a case sets it, so no other suite's side
  // panel carries a count.
  const CHAT_CHANNELS = [
    { id: "ch-general", type: "general", name: "General", siteId: null, siteName: null, lastMessageAt: seed.shift(0) + "T22:40:00Z" },
    { id: "ch-1", type: "site", name: S[0].name, siteId: S[0].id, siteName: S[0].name, lastMessageAt: seed.shift(0) + "T21:05:00Z" },
    { id: "ch-2", type: "site", name: S[1].name, siteId: S[1].id, siteName: S[1].name, lastMessageAt: seed.shift(-2) + "T13:00:00Z" },
    { id: "ch-3", type: "site", name: S[2].name, siteId: S[2].id, siteName: S[2].name, lastMessageAt: null },
  ];
  // text is what Messages and a site's chat draw. The last one is a word the word table carries, so a
  // message sent through the table by mistake would come back as another word.
  const CHAT_MESSAGES = [
    { id: "cm-1", senderId: "u-staff-5", senderName: "Tomasz Wisniewski", senderRole: "custodial_lead", body: "Lobby is done for the night.", text: "Lobby is done for the night.", sentAt: seed.shift(0) + "T20:45:00Z" },
    { id: "cm-2", senderId: "u-admin-1", senderName: "Dana Whitlock", senderRole: "admin", body: "Thank you, logged.", text: "Thank you, logged.", sentAt: seed.shift(0) + "T21:00:00Z" },
    { id: "cm-3", senderId: "u-staff-5", senderName: "Tomasz Wisniewski", senderRole: "custodial_lead", body: "Done", text: "Done", sentAt: seed.shift(0) + "T21:05:00Z" },
  ];
  // What each chat holds. The first site's chat and Tomasz's private chat hold the messages above, the
  // site's chat because a site's profile reads the same chat. A message that tags somebody carries the
  // text as typed, @Name in it, and mentions, the people it tags as [{ id, name }], the way GET
  // /api/chat/channels/:id/messages answers every message since Step 179.
  const CHAT_THREADS = {
    "ch-general": [
      { id: "cm-g1", senderId: "u-sup-1", senderName: "Marcus Ferreira", senderRole: "supervisor", text: "@Yuki Tanabe the south stairwell needs a second pass tonight.", sentAt: seed.shift(0) + "T22:30:00Z", mentions: [{ id: "u-staff-9", name: "Yuki Tanabe" }] },
      { id: "cm-g2", senderId: "u-staff-9", senderName: "Yuki Tanabe", senderRole: "custodial_lead", text: "On it after the lobby.", sentAt: seed.shift(0) + "T22:40:00Z", mentions: [] },
    ],
    "ch-1": CHAT_MESSAGES,
    "ch-2": [{ id: "cm-l1", senderId: "u-staff-6", senderName: "Ngozi Okonkwo", senderRole: "custodial_laborer", text: "Restrooms restocked.", sentAt: seed.shift(-2) + "T13:00:00Z", mentions: [] }],
    "ch-3": [],
    "dm-1": CHAT_MESSAGES,
    "dm-2": [{ id: "cm-d1", senderId: "u-staff-6", senderName: "Ngozi Okonkwo", senderRole: "custodial_laborer", text: "Restrooms restocked.", sentAt: seed.shift(-2) + "T13:00:00Z", mentions: [] }],
  };

  // The private chats, in the shape GET /api/chat/dm-inbox answers, each with unreadCount from
  // state.chatUnread. For an admin or a supervisor GET /api/chat/channels lists them too, as admin_dm.
  const DM_INBOX = [
    { channelId: "dm-1", staffUserId: "u-staff-5", staffName: "Tomasz Wisniewski", staffRole: "custodial_lead", lastMessage: "Done", lastMessageAt: seed.shift(0) + "T21:05:00Z", lastSenderId: "u-staff-5" },
    { channelId: "dm-2", staffUserId: "u-staff-6", staffName: "Ngozi Okonkwo", staffRole: "custodial_laborer", lastMessage: "Restrooms restocked.", lastMessageAt: seed.shift(-2) + "T13:00:00Z", lastSenderId: "u-staff-6" },
  ];
  // hand: 2 private conversations. With no count set, every chat reads 0 unread.

  // Step 179: the people who have turned phone alerts on, one entry per person holding a subscription,
  // the way push_subscriptions holds them. An announcement's withPush counts its people found here.
  const PUSH_ON = ["u-sup-1", "u-staff-5", "u-staff-7", "u-staff-9"];
  // Two announcements sent before the clock, newest first, in the shape routes/announcements.js
  // answers: each language's title and body, the audience as it was named, who sent it, when, and the
  // counts it reached then.
  // hand: an audience is every active account that is not a test account: the 12 staff rows less the
  // pending one, the inactive one and the test account, 9 people. Everyone reaches those 9, of whom
  // Marcus, Tomasz, Elena and Yuki have a phone on, 4. The third site's people are Priya, Ngozi and
  // Yuki, 3, one of them with a phone on.
  const ANNOUNCEMENTS = [
    { id: "an-2", title: { en: "Dock A closed for repairs", es: "Muelle A cerrado por reparaciones" },
      body: { en: "Use the side door by the break room until Friday.", es: "Use la puerta lateral junto a la sala de descanso hasta el viernes." },
      audience: { type: "site", siteId: S[2].id }, sentBy: { id: "u-admin-1", name: "Dana Whitlock" }, sentAt: seed.shift(-1) + "T15:00:00Z", recipients: 3, withPush: 1, translated: true },
    { id: "an-1", title: { en: "New floor pads arrive Monday", es: "Las almohadillas nuevas llegan el lunes" },
      body: { en: "Pick yours up from the supply room at the start of your shift.", es: "Recoja las suyas en el cuarto de suministros al empezar su turno." },
      audience: { type: "all" }, sentBy: { id: "u-super-1", name: "Oyelaran Adebayo" }, sentAt: seed.shift(-6) + "T14:00:00Z", recipients: 9, withPush: 4, translated: true },
  ];

  const SHIFT_SESSIONS = {
    date: seed.TODAY,
    sites: [
      { siteId: S[0].id, siteName: S[0].name, people: [
        { sessionId: "ss-1", userId: "u-staff-5", name: "Tomasz Wisniewski", role: "custodial_lead", sessionDate: seed.TODAY, startedAt: seed.shift(0) + "T22:05:00Z", buildingName: "North Wing", floorNumber: "3", tasksCompleted: 6, tasksTotal: 8 },
        { sessionId: "ss-2", userId: "u-staff-9", name: "Yuki Tanabe", role: "custodial_lead", sessionDate: seed.TODAY, startedAt: seed.shift(0) + "T22:10:00Z", buildingName: "South Wing", floorNumber: "2", tasksCompleted: 3, tasksTotal: 7 },
      ] },
      { siteId: S[1].id, siteName: S[1].name, people: [
        { sessionId: "ss-3", userId: "u-staff-6", name: "Ngozi Okonkwo", role: "custodial_laborer", sessionDate: seed.TODAY, startedAt: seed.shift(0) + "T10:30:00Z", buildingName: "Clinic", floorNumber: "1", tasksCompleted: 9, tasksTotal: 9 },
      ] },
      { siteId: S[2].id, siteName: S[2].name, people: [
        { sessionId: "ss-4", userId: "u-staff-7", name: "Elena Barbosa", role: "day_porter", sessionDate: seed.TODAY, startedAt: seed.shift(0) + "T23:00:00Z", buildingName: "Dock A", floorNumber: "1", tasksCompleted: 1, tasksTotal: 5 },
      ] },
    ],
  };
  // hand: 4 people started today, which is OVERVIEW.clockedInNow. Each carries the role
  // routes/shiftSessions.js reads off the person, the seed's role for them.

  // ---- Step 179: chats, announcements and phone alert settings --------------------------------
  // The API's own words for each refusal these routes make (helpers/words.js at ocsa-api 1c3fb42),
  // answered in the language the call asked for, the way errorBody answers them.
  const STEP179_WORDS = {
    "chat.notFound": { en: "This chat was not found.", es: "No se encontr\u00f3 este chat." },
    "chat.noAccess": { en: "You do not have access to this chat.", es: "No tiene acceso a este chat." },
    "chat.textRequired": { en: "Type a message first.", es: "Escriba un mensaje primero." },
    "chat.textTooLong": { en: "This message is too long. Keep it to {max} characters or fewer.", es: "Este mensaje es demasiado largo. Use {max} caracteres o menos." },
    "chat.mentionNotMember": { en: "One of the people tagged is not in this chat.", es: "Una de las personas etiquetadas no est\u00e1 en este chat." },
    "chat.tooManyMentions": { en: "Tag at most {max} people in one message.", es: "Etiquete como m\u00e1ximo {max} personas en un mensaje." },
    "access.insufficientPermissions": { en: "Insufficient permissions", es: "No tiene permiso para hacer esto" },
    "announcements.titleRequired": { en: "Write a title.", es: "Escriba un t\u00edtulo." },
    "announcements.bodyRequired": { en: "Write the announcement.", es: "Escriba el anuncio." },
    "announcements.titleTooLong": { en: "Keep the title to {max} characters or fewer.", es: "Escriba el t\u00edtulo en {max} caracteres o menos." },
    "announcements.bodyTooLong": { en: "Keep the announcement to {max} characters or fewer.", es: "Escriba el anuncio en {max} caracteres o menos." },
    "announcements.audienceInvalid": { en: "Send audience as all, a site, a role or a list of people.", es: "Env\u00ede audience como all, un sitio, un rol o una lista de personas." },
    "announcements.audienceEmpty": { en: "Nobody would receive this announcement.", es: "Nadie recibir\u00eda este anuncio." },
    "announcements.siteNotFound": { en: "Site not found", es: "No se encontr\u00f3 el sitio" },
    "announcements.notFound": { en: "Announcement not found", es: "No se encontr\u00f3 el anuncio" },
    "notifications.badSetting": { en: "Send chat as all, mentions or off, and schedule, pickups, supplies, issues or forms as true or false",
      es: "Env\u00ede chat como all, mentions u off, y schedule, pickups, supplies, issues o forms como true o false" },
  };
  const refuse179 = (status, key, lang, vars, extra) => ({ status, json: Object.assign({
    error: STEP179_WORDS[key][lang === "es" ? "es" : "en"].replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m)), code: key }, extra || {}) });
  const holds = (who, cap) => !!who.isSuperAdmin || !!effectiveMap(who, state.overrides[who.id])[cap];
  const manages = (who) => who.role === "admin" || who.role === "supervisor";
  const fullName = (p) => [p.first_name || p.firstName, p.last_name || p.lastName].filter(Boolean).join(" ");
  const byName = (a, b) => ((a.first_name || "") + " " + (a.last_name || "") + " " + a.id < (b.first_name || "") + " " + (b.last_name || "") + " " + b.id ? -1 : 1);
  // Every account a chat's members and an announcement's audience are drawn from: each active account
  // that is neither a test account nor a client contact.
  const reachable = () => state.staff.filter((p) => p.status === "active" && !p.isTestAccount && p.role !== "client_contact");
  const assignedAt = (siteId) => (p) => (p.sites || []).some((x) => x.siteId === siteId);
  const activeSite = (siteId) => state.sites.some((x) => x.id === siteId && x.status === "active");
  const chatUnreadOf = (id) => Number(state.chatUnread[id]) || 0;
  const ownChatId = (who) => "dm-own-" + who.id;
  // The chat an id names, in the columns helpers/chatAccess.js reads, or null for one there is not.
  const chatById = (id) => {
    const c = CHAT_CHANNELS.find((x) => x.id === id);
    if (c) return c;
    const dm = DM_INBOX.find((x) => x.channelId === id);
    if (dm) return { id: dm.channelId, type: "admin_dm", name: dm.staffName, dmUserId: dm.staffUserId };
    const me = person();
    return id === ownChatId(me) && me.role !== "admin" ? { id, type: "admin_dm", name: "Admin (Private)", dmUserId: me.id } : null;
  };
  // Who may read a chat, canAccessChannel's rule: the general chat anyone; a site's chat while the site
  // is active, for an admin, a supervisor or someone assigned there; a private chat its owner, and
  // any admin or supervisor.
  const canReadChat = (who, ch) => {
    if (ch.type === "general") return true;
    if (ch.type === "site") return activeSite(ch.siteId) && (manages(who) || state.staff.some((p) => p.id === who.id && assignedAt(ch.siteId)(p)));
    return manages(who) || ch.dmUserId === who.id;
  };
  // The chat an address names, or the refusal a read of it answers.
  const chatFor = (path, lang) => {
    const ch = chatById(decodeURIComponent(path.split("/")[4] || ""));
    if (!ch) return { refusal: refuse179(404, "chat.notFound", lang) };
    if (!canReadChat(person(), ch)) return { refusal: refuse179(403, "chat.noAccess", lang) };
    return { ch };
  };
  // Everyone who can read a chat, membersOf's rule, sorted by name: the general chat everyone; a
  // site's chat the admins and supervisors, the people assigned to the site and anyone with a shift
  // open there; a private chat its owner and every admin and supervisor.
  // hand: the first site's chat holds Marcus, Priya and Oyelaran, who manage; Dana, Oyelaran and Elena,
  // who are assigned there, the test account left out; and Tomasz and Yuki, who have a shift open
  // there. Six people besides Dana, who is left out of her own list.
  const chatMembers = (ch) => {
    const open = (((shiftSessions || SHIFT_SESSIONS).sites || []).find((x) => x.siteId === ch.siteId) || { people: [] }).people.map((p) => p.userId);
    return reachable().filter((p) => ch.type === "general"
      || (ch.type === "site" && activeSite(ch.siteId) && (manages(p) || assignedAt(ch.siteId)(p) || open.indexOf(p.id) >= 0))
      || (ch.type === "admin_dm" && (p.id === ch.dmUserId || manages(p)))).sort(byName);
  };
  // A message as GET /api/chat/channels/:id/messages answers it.
  const chatMessage = (m) => ({ id: m.id, senderId: m.senderId, senderName: m.senderName, senderRole: m.senderRole, text: m.text, sentAt: m.sentAt,
    isEdited: false, isPinned: false, mentions: Array.isArray(m.mentions) ? m.mentions : [] });
  let chatSeq = 0;
  // The people an audience names, the way routes/announcements.js reads it off a body or a query, or
  // the refusal it answers.
  const audienceOf = (a, lang) => {
    const s = a && typeof a === "object" ? a : {};
    const type = String(s.type || "");
    if (["all", "site", "role", "users"].indexOf(type) < 0) return { refusal: refuse179(400, "announcements.audienceInvalid", lang) };
    if (type === "all") return { audience: { type }, people: reachable() };
    if (type === "site") {
      const siteId = String(s.siteId || "");
      if (!state.sites.some((x) => x.id === siteId)) return { refusal: refuse179(404, "announcements.siteNotFound", lang) };
      return { audience: { type, siteId }, people: reachable().filter(assignedAt(siteId)) };
    }
    if (type === "role") {
      const role = String(s.role || "");
      if (["admin", "supervisor", "custodial_lead", "custodial_laborer", "day_porter", "client_contact", "contractor"].indexOf(role) < 0) return { refusal: refuse179(400, "announcements.audienceEmpty", lang) };
      return { audience: { type, role }, people: reachable().filter((p) => p.role === role) };
    }
    const raw = Array.isArray(s.userIds) ? s.userIds : String(s.userIds || "").split(",");
    const ids = [];
    raw.forEach((v) => { const id = String(v == null ? "" : v).trim(); if (id && ids.indexOf(id) < 0) ids.push(id); });
    if (!ids.length) return { refusal: refuse179(400, "announcements.audienceEmpty", lang) };
    return { audience: { type, userIds: ids }, people: reachable().filter((p) => ids.indexOf(p.id) >= 0) };
  };
  const withPushOf = (people) => people.filter((p) => PUSH_ON.indexOf(p.id) >= 0).length;
  const announcementList = () => state.announcements || (state.announcements = clone(ANNOUNCEMENTS));
  let annSeq = 0;
  // A person's phone alert settings, settingsFromRow's defaults under what they saved (helpers/push.js).
  const alertSettingsOf = (id) => Object.assign({ chat: "all", schedule: true, pickups: true, supplies: true, issues: true, forms: true }, state.alertSettings[id] || {});

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
    "ck-1": { label: "Vaciar la basura del vest\u00edbulo", description: "", zone: "Vest\u00edbulo" },
    "ck-2": { label: "Limpiar los vidrios del vest\u00edbulo", description: "", zone: "Vest\u00edbulo" },
    "ck-3": { label: "Tallar las juntas del ba\u00f1o", description: "", zone: "Ba\u00f1o" },
    "ck-4": { label: "Pulir el pasillo de arriba", description: "", zone: "Vest\u00edbulo" },
    "ck-5": { label: "Limpiar los rieles de las ventanas", description: "", zone: "Atrio" },
  };
  // The shift and the block of a checklist row, in the language the call asked for.
  const SHIFT_WORDS_ES = { "Night": "Noche", "Day": "D\u00eda", "Start of shift": "Inicio del turno", "End of shift": "Fin del turno" };
  // Step 183: a manager's own wording, the way routes/sites.js and routes/lookups.js store a correction
  // with source person, by the item's or the choice's id and its field.
  let corrections = {};
  const withDisplay = (item, lang) => {
    const es = TASK_WORDS_ES[item.id] ? Object.assign({}, TASK_WORDS_ES[item.id], corrections[item.id] || {}) : corrections[item.id] ? Object.assign({ label: item.label, description: item.description, zone: item.zone }, corrections[item.id]) : null;
    const sayShift = (v) => (lang === "es" && SHIFT_WORDS_ES[v] ? SHIFT_WORDS_ES[v] : v);
    const around = item.shift ? { shift: sayShift(item.shift), block: sayShift(item.block) } : {};
    if (!es) return item.shift ? Object.assign({}, item, { display: around }) : item;
    const say = (field) => (lang === "es" && item[field] ? es[field] : item[field]);
    return Object.assign({}, item, { display: Object.assign({ label: say("label"), description: say("description"), zone: say("zone") }, around) });
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
    "Subcontractor": "Subcontratista", "Direct": "Directo",
    "Safety": "Seguridad", "Equipment": "Equipo", "Paperwork": "Documentaci\u00f3n",
    "Quality System": "Sistema de calidad", "Human Resources": "Recursos humanos", "Management Commitment": "Compromiso de la direcci\u00f3n",
    "Lead": "L\u00edder", "Porter": "Conserje", "Night": "Noche", "Day": "D\u00eda", "Certification": "Certificaci\u00f3n", "License": "Licencia",
    "Admin": "Administrador", "Supervisor": "Supervisor", "Custodial Lead": "L\u00edder de limpieza", "Custodial Laborer": "Auxiliar de limpieza",
    "Day Porter": "Conserje de d\u00eda", "Contractor": "Contratista",
    "Callout": "Ausencia", "No-Show": "No se present\u00f3", "Extra Coverage": "Cobertura adicional", "Voluntary Drop": "Baja voluntaria",
    "New Shift": "Turno nuevo", "Office Cleaning": "Limpieza de oficinas", "Disinfection Services": "Servicios de desinfecci\u00f3n",
    "Post-Construction": "Posconstrucci\u00f3n",
  };
  const withChoiceWords = (values, lang) => (values || []).map((v) => Object.assign({}, v, {
    displayLabel: lang === "es" && corrections[v.id] && corrections[v.id].label ? corrections[v.id].label : lang === "es" && CHOICE_WORDS_ES[v.label] ? CHOICE_WORDS_ES[v.label] : v.label,
  }));
  // GET /api/lookups/all the way the API answers it: each list with its label, its description,
  // whether it is one of the system's own, its place and whether it is on, then its values. Every
  // list is the system's own but contract types, which an admin added, and document categories are
  // off. Neither changes what a pick list offers, since a page reads a list's values whatever the
  // list's own state.
  const LIST_DESCRIPTIONS = { issue_severities: "How soon a reported problem needs attention." };
  const systemList = (c) => c.slug !== "contract_types";
  // The lists and the values a person has removed since the last reset. Since Step 179 a removal sets
  // is_active false and keeps the row (routes/lookups.js): /all still answers it, off, and the lists
  // anyone signed in reads leave it out.
  let lookupOff = { lists: {}, values: {} };
  // A site's own values, every one on or off, the way GET /api/lookups/site/:siteId/all answers them.
  const siteLookupRows = () => {
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
    return state.lookupValues;
  };
  const lookupsIn = (lang) => LOOKUPS.map((c, i) => ({
    id: c.id, slug: c.slug, label: c.name, description: LIST_DESCRIPTIONS[c.slug] || null,
    is_system: systemList(c), sort_order: i + 1, is_active: c.slug !== "document_categories" && !lookupOff.lists[c.id],
    values: withChoiceWords(c.values, lang).filter((v) => !(listGap && listGap.slug === c.slug && listGap.value === v.value))
      .map((v) => Object.assign({ category_id: c.id, color: null, show_other_input: false, metadata: null }, v, { show_other_input: !!v.show_other_input },
        lookupOff.values[v.id] ? { is_active: false } : {})),
  }));

  // A site's checklist the way Step 124's API holds it. Every item has a shift, how often it comes
  // due, the block of the shift it sits in, and whether today's checklist shows it. The clock's today
  // is Tuesday, March 17.
  // hand: the first site has 6 items. 2 are on tonight's Night checklist: the lobby refinish and the
  // lobby trash. The other 4 are what a read of today's Night items leaves out: the lobby glass on
  // the Day shift, the grout weekly on Thursday, the hallway set to Monday, Wednesday and Friday, and
  // the window tracks, seasonal from June to August.
  const CHECKLIST = {
    [S[0].id]: [
      { id: "ck-1", label: "Empty lobby trash", zone: "Lobby", shift: "Night", block: "Start of shift", period: "daily", days: null, shownToday: true },
      { id: "ck-2", label: "Wipe lobby glass", zone: "Lobby", shift: "Day", block: "Start of shift", period: "daily", days: null, shownToday: true },
      { id: "ck-3", label: "Scrub restroom grout", zone: "Restroom", shift: "Night", block: "End of shift", period: "weekly", days: ["thu"], shownToday: false },
      { id: "ck-4", label: "Buff the upper hallway", zone: "Lobby", shift: "Night", block: "End of shift", period: "daily", days: ["mon", "wed", "fri"], shownToday: false },
      { id: "ck-5", label: "Clean window tracks", zone: "Atrium", shift: "Night", block: "End of shift", period: "seasonal", days: null, season: { from: "06-01", to: "08-31" }, shownToday: false },
    ],
  };
  // An assigned task carries the day it is due and the time, the task_templates columns the route
  // sends with tt.*; a checklist item carries neither.
  const siteTasks = (siteId) => ASSIGNED_TASKS.filter((t) => t.site_id === siteId).map((t) => ({
    id: t.id, label: t.label, zone: t.zone, priority: t.priority, cims_category: t.cims_category,
    building_name: t.building_name, floor_number: t.floor_number, assigned_to_name: t.assigned_to_name,
    due_date: t.due_date, due_time: t.due_time, media_required: false, description: t.description || "", shift: "Night", block: "Start of shift", period: "daily", days: null, shownToday: true,
  })).concat((CHECKLIST[siteId] || []).map((c) => Object.assign({ priority: "standard", cims_category: "SD",
    building_name: null, floor_number: null, assigned_to_name: null, media_required: false, description: "" }, c)))
    .map((c) => Object.assign(c, { dueToday: c.shownToday, doneThisPeriod: false, checkedToday: false }));
  // Who has a shift open at which site, by the person signed in. A case opens one; nothing else does.
  let openSessions = {};
  // GET /api/sites/:id/tasks the way Step 124 answers it. shift names a shift; shift= left empty reads
  // the whole site; not named, the caller's open session at the site decides. day=today answers the
  // items today's checklist shows and day=all every item, each with shownToday; not named, a manager
  // with no open session at the site and no shift gets every item, and everybody else gets today's.
  function checklistRead(siteId, day, shift) {
    const open = openSessions[signedInAs] && openSessions[signedInAs].siteId === siteId ? openSessions[signedInAs] : null;
    const shiftName = shift === null ? (open ? open.shift : "") : shift;
    const manager = person().role === "admin" || person().role === "supervisor";
    const everyDay = day === "all" || (day === null && manager && !open && shift === null);
    return siteTasks(siteId).filter((it) => (!shiftName || it.shift === shiftName) && (everyDay || it.shownToday));
  }

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

  // GET /api/users/timeline-detail/task/:id the way routes/users.js answers it: the task_templates row
  // with its site's name and its display in the language the call asked for, and the task's active
  // assignments, each with the person's first and last name. The row carries the task's service
  // category as the code the API stores, and a resolved task the photo taken when it was resolved as
  // resolution_photo_url, an address longer than 60 characters, which Record Detail draws as a link
  // reading View file. A task the route cannot find answers found false.
  const taskDetail = (id, lang) => {
    const t0 = ASSIGNED_TASKS.find((x) => x.id === id);
    if (!t0) return { found: false, record: null, photos: [], relatedItems: [] };
    const who = seed.STAFF.find((p) => p.id === t0.user_id) || {};
    const record = withDisplay({
      id: t0.id, site_id: t0.site_id, label: t0.label, zone: t0.zone, cims_category: t0.cims_category, priority: t0.priority,
      frequency: "per_visit", sort_order: 0, is_active: true, created_at: t0.task_created_at, resolution_status: t0.resolution_status,
      resolution_note: t0.resolution_note || null, resolved_at: t0.resolved_at || null, description: t0.description || null,
      resolution_photo_url: t0.resolution_status === "resolved" ? "https://storage.example.invalid/storage/v1/object/public/task-photos/" + t0.id + "/restrooms-restocked.jpg" : null,
      due_date: t0.due_date, due_time: t0.due_time + ":00", has_details: false, building_name: t0.building_name,
      floor_number: t0.floor_number, task_type: "assigned", site_name: t0.site_name,
    }, lang);
    return { found: true, record, photos: [], relatedItems: [{ id: "ta-" + t0.id, task_template_id: t0.id, user_id: t0.user_id,
      is_active: true, assigned_at: t0.task_created_at, assigned_by: seed.PEOPLE.admin.id, first_name: who.first_name, last_name: who.last_name }] };
  };

  const userProfile = (id) => {
    const u = state.staff.find((s) => s.id === id) || state.staff[0];
    return {
      user: Object.assign({}, u, {
        firstName: u.first_name, lastName: u.last_name, employeeId: u.employee_id,
        badgeNumber: u.badge_number, badgeSource: u.badge_number ? "adp" : null,
        hireDate: u.hire_date, preferredLanguage: u.preferred_language,
        photoUrl: null, pinSetAt: seed.shift(-100) + "T12:00:00Z",
        emergencyContactName: "T. Almeida", emergencyContactPhone: "2155559100",
      }),
      assignments: [
        { id: "as-1", site_id: S[0].id, site_name: S[0].name, is_active: true, assigned_at: seed.shift(-200), role_at_site: "Lead", shift_name: "Night", shift_start: "22:00", shift_end: "06:30" },
        { id: "as-2", site_id: S[1].id, site_name: S[1].name, is_active: false, assigned_at: seed.shift(-400), role_at_site: "Porter" },
      ],
      // Shaped to what the profile and its printed report read: cert_name, cert_type, issuing_body,
      // issued_date and expiry_date. The type is a code of the certification_types list above.
      certifications: [
        { id: "cert-1", cert_name: "Bloodborne pathogen awareness", cert_type: "certification", issuing_body: "In-house", issued_date: seed.shift(-300), expiry_date: seed.shift(60) },
      ],
      stats: { shiftsLast30: 14, tasksCompleted: 96, issuesReported: 3 },
    };
  };

  // A site's floor plans and its supply rows, supply_site_inventory, as a run has left them. Since Step
  // 179 a removal sets the row's is_active false and keeps it, and the profile lists the live rows, the
  // way routes/sites.js does. A supply row is keyed by its supply, which is the id DELETE names.
  const sitePlans = (siteId) => {
    if (!state.floorPlans) state.floorPlans = {};
    if (!state.floorPlans[siteId]) state.floorPlans[siteId] = [{ id: "fp-1", label: "North Wing, floor 3", file_url: "", uploaded_at: seed.shift(-120) + "T12:00:00Z" }];
    return state.floorPlans[siteId];
  };
  const siteStock = (siteId) => {
    if (!state.siteSupplies) state.siteSupplies = {};
    if (!state.siteSupplies[siteId]) state.siteSupplies[siteId] = SUPPLIES.slice(0, 2).map((sp0) => ({ supply_id: sp0.id, site_id: siteId }));
    return state.siteSupplies[siteId];
  };
  const liveStock = (siteId) => siteStock(siteId).filter((r) => r.is_active !== false).map((r) => r.supply_id);

  // Shaped to what the site profile reads: site, staff, zones, floorPlans, taskCount,
  // issueSummary, inspectionSummary, marketplaceSummary, upcomingShifts, supplies. The supplies are
  // the columns the profile selects, by name, each with the supply's own id.
  const siteProfile = (id) => {
    const s0 = state.sites.find((x) => x.id === id) || state.sites[0];
    const staffHere = state.staff.filter((st) => st.site_id === s0.id);
    return {
      site: {
        id: s0.id, name: s0.name, status: s0.status,
        address_line: s0.address, city: s0.city, state: s0.state, zip_code: s0.zip,
        client_name: "Fairhaven Property Group", prime_contractor: "None",
        client_contact_name: "R. Villanueva", client_contact_email: "contact@fairhavenpg.example.invalid", client_contact_phone: "2155559200",
        contract_type: "subcontractor", contract_value_monthly: 18400, billing_frequency: "monthly",
        contract_start_date: seed.shift(-400), contract_end_date: seed.shift(330),
        site_notes: "Nightly cleaning of occupied floors and daily restroom service.",
      },
      staff: staffHere.map((st) => ({ id: st.id, name: st.name, first_name: st.first_name, last_name: st.last_name, role: st.role, status: st.status })),
      zones: ["Lobby", "Restroom", "Corridor", "Dock"],
      floorPlans: sitePlans(s0.id).filter((fp) => fp.is_active !== false),
      taskCount: ASSIGNED_TASKS.filter((t0) => t0.site_id === s0.id).length,
      issueSummary: { open_count: 1, in_progress_count: 1, resolved_count: 2 },
      inspectionSummary: { avg_score: 90, total: 2, last_inspection: seed.shift(-7) },
      marketplaceSummary: { total_pickups: 2, worked: 1, pending: 1 },
      upcomingShifts: (state.schedule || SCHEDULE).filter((sh) => sh.site_id === s0.id).map((sh) => ({
        id: sh.id, scheduled_date: sh.scheduled_date, start_time: sh.start_time, end_time: sh.end_time,
        user_name: sh.user_name, first_name: String(sh.user_name || "").split(" ")[0], last_name: String(sh.user_name || "").split(" ").slice(1).join(" "),
        status: sh.status,
      })),
      supplies: SUPPLIES.filter((sp0) => liveStock(s0.id).indexOf(sp0.id) >= 0).sort((a, b) => a.name.localeCompare(b.name))
        .map((sp0) => ({ id: sp0.id, name: sp0.name, category: sp0.category, current_stock: sp0.current_stock, low_threshold: sp0.low_threshold, unit: sp0.unit, is_green_certified: sp0.is_green_certified })),
    };
  };
  // hand: Harbor Point Center holds 4 of the 12 staff rows (every third row from the first), one
  // assigned task, and open issues 1 + 1 = 2 on the tile.

  // -------------------------------------------------------------------------
  // The router.
  // -------------------------------------------------------------------------
  const ok = (json) => ({ status: 200, json });
  const created = (json) => ({ status: 201, json });
  // What a removal route answers for a row that is not there or may not go, Step 179, in the API's
  // words for each language and with its code (helpers/words.js at ocsa-api 1c3fb42).
  const REMOVAL_REFUSALS = {
    "sites.floorPlanNotFound": [404, "Floor plan not found", "No se encontr\u00f3 el plano"],
    "sites.assignmentNotFound": [404, "Assignment not found", "No se encontr\u00f3 la asignaci\u00f3n"],
    "schedule.shiftNotFound": [404, "Scheduled shift not found", "No se encontr\u00f3 el turno programado"],
    "inspections.scheduledNotFound": [404, "Scheduled inspection not found", "No se encontr\u00f3 la inspecci\u00f3n programada"],
    "inspections.completedKept": [409, "A completed inspection is kept. It cannot be removed.", "Una inspecci\u00f3n completada se conserva. No se puede quitar."],
    "lookups.categoryNotFound": [404, "Category not found", "No se encontr\u00f3 la categor\u00eda"],
    "lookups.systemCategory": [403, "System categories cannot be deleted", "Las categor\u00edas del sistema no se pueden eliminar"],
    "lookups.valueNotFound": [404, "Value not found", "No se encontr\u00f3 la opci\u00f3n"],
    "lookups.siteValueNotFound": [404, "Site lookup not found", "No se encontr\u00f3 la opci\u00f3n del sitio"],
    "jotform.aliasNotFound": [404, "Alias not found", "No se encontr\u00f3 el alias"],
    "jotform.documentNotFound": [404, "Document not found", "No se encontr\u00f3 el documento"],
    "hr.stepNotFound": [404, "Step not found", "No se encontr\u00f3 el paso"],
  };
  const refuse = (code, lang) => {
    const r = REMOVAL_REFUSALS[code];
    return { status: r[0], json: { error: lang === "es" ? r[2] : r[1], code: code } };
  };

  function matchRefusal(method, path, body) {
    for (let i = 0; i < refusals.length; i += 1) {
      const r = refusals[i];
      if (r.method && r.method.toUpperCase() !== method.toUpperCase()) continue;
      const hit = r.path instanceof RegExp ? r.path.test(path) : path.indexOf(r.path) >= 0;
      if (!hit) continue;
      // One request among several to the same route, picked out by what it carries: the one person
      // of a room the API refuses.
      if (r.when && !r.when(body || {})) continue;
      if (r.once) refusals.splice(i, 1);
      return r;
    }
    return null;
  }

  // `lang` is the language the call asked for, which is the language the API answers in.
  // ---- Step 247 (STEP247_CONTRACT.md version 2) -----------------------------------------------------
  // What the API's Step 247 adds, answered only once a run arms it with setStep247, so every other run
  // sees the API it always saw. Holidays (section 1): the eleven federal days worked out for any year
  // and observed the federal way, Saturday to the Friday before and Sunday to the Monday after, and
  // the office's own days, which start as two invented Eid dates. One person whose employment ended,
  // with three past sites (section 3), the second of them a school site the guard refuses. A client's
  // concern past due that no receipt acknowledged (section 6.1), which Mark acknowledged records.
  let step247 = false;
  const HOLIDAY_NAMES = {
    newYear: ["New Year's Day", "D\u00eda de A\u00f1o Nuevo"], mlk: ["Birthday of Martin Luther King, Jr.", "Natalicio de Martin Luther King, Jr."],
    washington: ["Washington's Birthday", "Natalicio de Washington"], memorial: ["Memorial Day", "D\u00eda de los Ca\u00eddos"],
    juneteenth: ["Juneteenth National Independence Day", "D\u00eda Nacional de la Independencia de Juneteenth"], independence: ["Independence Day", "D\u00eda de la Independencia"],
    labor: ["Labor Day", "D\u00eda del Trabajo"], columbus: ["Columbus Day", "D\u00eda de Col\u00f3n"], veterans: ["Veterans Day", "D\u00eda de los Veteranos"],
    thanksgiving: ["Thanksgiving Day", "D\u00eda de Acci\u00f3n de Gracias"], christmas: ["Christmas Day", "D\u00eda de Navidad"],
  };
  const dayOf = (y, m, d) => { const x = new Date(Date.UTC(y, m - 1, d)); return x.toISOString().slice(0, 10); };
  const weekdayOf = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const nthMonday = (y, m, wd, n) => 1 + ((wd - weekdayOf(y, m, 1) + 7) % 7) + (n - 1) * 7;
  const lastMonday = (y, m) => { const days = new Date(Date.UTC(y, m, 0)).getUTCDate(); return days - ((weekdayOf(y, m, days) - 1 + 7) % 7); };
  const observedOf = (y, m, d) => { const w = weekdayOf(y, m, d); return dayOf(y, m, d + (w === 6 ? -1 : w === 0 ? 1 : 0)); };
  // A year's federal holidays, by the day each is observed, New Year's Day of the year after included
  // when it is observed on December 31.
  function federalHolidays(y, lang) {
    const name = (k) => HOLIDAY_NAMES[k][lang === "es" ? 1 : 0];
    const fixed = [["newYear", y, 1, 1], ["juneteenth", y, 6, 19], ["independence", y, 7, 4], ["veterans", y, 11, 11], ["christmas", y, 12, 25], ["newYear", y + 1, 1, 1]];
    const moving = [["mlk", 1, nthMonday(y, 1, 1, 3)], ["washington", 2, nthMonday(y, 2, 1, 3)], ["memorial", 5, lastMonday(y, 5)], ["labor", 9, nthMonday(y, 9, 1, 1)], ["columbus", 10, nthMonday(y, 10, 1, 2)], ["thanksgiving", 11, nthMonday(y, 11, 4, 4)]];
    const out = fixed.map(([k, yy, m, d]) => { const o = observedOf(yy, m, d); return { date: o, name: name(k), kind: "federal", key: k, id: null, note: null, observedFrom: o === dayOf(yy, m, d) ? null : dayOf(yy, m, d) }; })
      .concat(moving.map(([k, m, d]) => ({ date: dayOf(y, m, d), name: name(k), kind: "federal", key: k, id: null, note: null, observedFrom: null })));
    return out.filter((h) => h.date.slice(0, 4) === String(y));
  }
  const OFFICE_HOLIDAYS = () => [
    { id: "hol-1", date: "2026-03-20", name: "Eid al-Fitr", note: "Confirmed in writing", active: true },
    { id: "hol-2", date: "2026-05-27", name: "Eid al-Adha", note: null, active: true },
  ];
  let officeHolidays = OFFICE_HOLIDAYS();
  let holidaySeq = 2;
  const realDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && dayOf(Number(v.slice(0, 4)), Number(v.slice(5, 7)), Number(v.slice(8, 10))) === v;
  const holidayRefusal = (code, status, error, keys) => ({ status, json: Object.assign({ error, code }, keys ? { keys } : {}) });
  // The holiday a POST or PATCH would write, or the refusal section 1 gives it.
  function holidayCheck(h, lang) {
    const es = lang === "es";
    if (!realDay(h.date)) return holidayRefusal("holidays.badDetails", 400, es ? "Elija una fecha v\u00e1lida." : "Choose a real date.", ["date"]);
    if (!String(h.name || "").trim() || String(h.name).trim().length > 120) return holidayRefusal("holidays.badDetails", 400, es ? "Escriba un nombre de hasta 120 caracteres." : "Enter a name of up to 120 characters.", ["name"]);
    if (h.note != null && String(h.note).length > 500) return holidayRefusal("holidays.badDetails", 400, es ? "La nota admite hasta 500 caracteres." : "A note holds up to 500 characters.", ["note"]);
    const fed = federalHolidays(Number(h.date.slice(0, 4)), lang).find((x) => x.date === h.date);
    if (fed) return holidayRefusal("holidays.federal", 409, (es ? "Ese d\u00eda ya es un d\u00eda festivo federal: " : "That day is already a federal holiday: ") + fed.name + ".");
    if (h.active !== false && officeHolidays.some((x) => x.active && x.date === h.date && x.id !== h.id)) return holidayRefusal("holidays.duplicate", 409, es ? "Ya hay un d\u00eda festivo de la oficina en esa fecha." : "An office holiday is already on that date.");
    return null;
  }
  const PAST_SITES = () => [
    { assignmentId: "ssa-past-1", siteId: S[0].id, siteName: S[0].name, roleAtSite: "cleaner", shiftName: "Night", shiftStart: "18:00:00", shiftEnd: "23:00:00", daysOfWeek: ["mon", "tue", "wed", "thu", "fri"], assignedAt: "2025-06-02T12:00:00Z", endedWithEmployment: true },
    { assignmentId: "ssa-past-2", siteId: S[2].id, siteName: S[2].name, roleAtSite: "lead", shiftName: "Day", shiftStart: "07:00:00", shiftEnd: "15:30:00", daysOfWeek: ["sat", "sun"], assignedAt: "2025-03-10T12:00:00Z", endedWithEmployment: true },
    { assignmentId: "ssa-past-3", siteId: S[1].id, siteName: S[1].name, roleAtSite: null, shiftName: null, shiftStart: null, shiftEnd: null, daysOfWeek: null, assignedAt: "2024-11-04T12:00:00Z", endedWithEmployment: false },
  ];
  // The person, the one whose employment ended, and the school site among their past sites.
  const LEFT_ID = "u-staff-12";
  const SCHOOL_PAST = "ssa-past-2";
  const LEFT_EVENT = { id: "ee-left-1", kind: "ended", reason: "resigned", reasonLabel: "Resigned", lastDay: "2026-01-30", rehireEligible: true, note: null, recordedAt: "2026-01-30T21:00:00Z", recordedBy: { name: "Dana Whitlock" } };
  let leftRehired = false;
  const leftEmployment = () => (leftRehired
    ? { status: "active", hireDate: "2026-03-23", terminationDate: null, current: LEFT_EVENT, events: [LEFT_EVENT], pastSites: [] }
    : { status: "terminated", hireDate: "2024-10-01", terminationDate: "2026-01-30", current: LEFT_EVENT, events: [LEFT_EVENT], pastSites: PAST_SITES() });
  // The client's concern: filed from a link three days ago, due yesterday, and no receipt went.
  const CONCERN_ID = "cf-concern-1";
  let concernAck = null;
  function concernRow(lang) {
    return {
      id: CONCERN_ID, formCode: "OCSA-FRM-009", formName: lang === "es" ? "Registro de quejas de clientes" : "Customer Complaint Log", status: "submitted", source: "customer", userId: null,
      userName: "Imogen Thackeray, Facilities manager", siteId: S[0].id, siteName: S[0].name, answered: 6, remaining: 0,
      dueAt: seed.shift(-1) + "T21:00:00Z", answeredAt: null, forController: false, acknowledgedAt: concernAck ? concernAck.acknowledgedAt : null, dueState: "late",
      createdAt: seed.shift(-3) + "T14:00:00Z", submittedAt: seed.shift(-3) + "T14:05:00Z",
    };
  }
  function concernRead(lang) {
    const es = lang === "es";
    const row = concernRow(lang);
    const draft = Object.assign({}, row, { version: 2, customer: { name: "Imogen Thackeray", role: es ? "Gerente de instalaciones" : "Facilities manager" },
      acknowledgedMethod: concernAck ? concernAck.acknowledgedMethod : null, acknowledgedBy: concernAck ? concernAck.acknowledgedBy : null, canAcknowledge: !concernAck });
    return {
      injuryLogCase: null, draft,
      fields: [
        { key: "client_name", label: es ? "Su nombre" : "Your name", type: "text", half: "agent", section: "1", value: "Imogen Thackeray", displayValue: "Imogen Thackeray" },
        { key: "contact_preference", label: es ? "C\u00f3mo prefiere que lo contacten" : "How should we reach you", type: "text", half: "agent", section: "1", value: "phone", displayValue: es ? "Tel\u00e9fono" : "Phone" },
        { key: "what_happened", label: es ? "Qu\u00e9 pas\u00f3" : "What happened", type: "textarea", half: "agent", section: "1", value: "The lobby bins were full at opening.", displayValue: "The lobby bins were full at opening." },
        { key: "complaint_closed", label: es ? "Queja cerrada" : "Complaint closed", type: "signoff", half: "supervisor", section: "4", value: null },
      ],
      sections: [{ key: "1", title: es ? "Su inquietud" : "Your concern" }, { key: "4", title: es ? "Cierre" : "Close" }],
      canSign: [], canWriteSupervisor: false, supervisorMissing: [], canVoid: false, canResend: false, canAcknowledge: !concernAck,
    };
  }
  // The routes above, ahead of every other; base is the answer the stub gave before Step 247.
  function step247Route(method, path, query, body, lang, base) {
    const es = lang === "es";
    const admin = person().role === "admin";
    if (path === "/api/holidays" && method === "GET") {
      const y = query.get("year") ? Number(query.get("year")) : Number(seed.NOW_ISO.slice(0, 4));
      if (!Number.isInteger(y) || y < 2020 || y > 2100) return holidayRefusal("holidays.badYear", 400, es ? "Elija un a\u00f1o de 2020 a 2100." : "Choose a year from 2020 to 2100.");
      const all = admin && query.get("includeRetired") === "1";
      const office = officeHolidays.filter((h) => h.date.slice(0, 4) === String(y) && (all || h.active))
        .map((h) => Object.assign({ date: h.date, name: h.name, kind: "office", key: null, id: h.id, note: h.note, observedFrom: null }, all ? { active: h.active } : {}));
      const fed = federalHolidays(y, lang).map((h) => Object.assign(h, all ? { active: true } : {}));
      const holidays = fed.concat(office).sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === "federal" ? -1 : 1));
      return ok({ year: y, holidays });
    }
    if (path === "/api/holidays" && method === "POST") {
      if (!admin) return { status: 403, json: { error: es ? "Permisos insuficientes" : "Insufficient permissions", code: "access.insufficientPermissions" } };
      const h = { id: null, date: String((body && body.date) || ""), name: String((body && body.name) || "").trim(), note: body && body.note != null ? String(body.note) : null, active: true };
      const no = holidayCheck(h, lang);
      if (no) return no;
      holidaySeq += 1; h.id = "hol-" + holidaySeq;
      officeHolidays.push(h);
      return created({ holiday: { id: h.id, date: h.date, name: h.name, note: h.note, kind: "office", active: true } });
    }
    if (/^\/api\/holidays\/[^/]+$/.test(path) && method === "PATCH") {
      if (!admin) return { status: 403, json: { error: es ? "Permisos insuficientes" : "Insufficient permissions", code: "access.insufficientPermissions" } };
      const h = officeHolidays.find((x) => x.id === decodeURIComponent(path.split("/")[3]));
      if (!h) return holidayRefusal("holidays.notFound", 404, es ? "No se encontr\u00f3 ese d\u00eda festivo." : "That holiday was not found.");
      const next = Object.assign({}, h, body && body.date !== undefined ? { date: String(body.date) } : {}, body && body.name !== undefined ? { name: String(body.name).trim() } : {},
        body && body.note !== undefined ? { note: body.note == null ? null : String(body.note) } : {}, body && body.active !== undefined ? { active: body.active !== false } : {});
      const no = next.active ? holidayCheck(next, lang) : null;
      if (no) return no;
      Object.assign(h, next);
      return ok({ holiday: { id: h.id, date: h.date, name: h.name, note: h.note, kind: "office", active: h.active } });
    }
    if (path === "/api/users/" + LEFT_ID + "/employment" && method === "GET") return ok(leftEmployment());
    if (path === "/api/users/" + LEFT_ID + "/employment/rehire" && method === "POST") {
      if (leftRehired) return { status: 409, json: { error: es ? "Esta persona ya est\u00e1 activa." : "This person is already active.", code: "employment.wrongState", status: "active" } };
      if (!realDay(body && body.hireDate)) return { status: 400, json: { error: es ? "Elija una fecha v\u00e1lida." : "Choose a real date.", code: "employment.badDate", keys: ["hireDate"] } };
      const ids = body && body.restoreAssignmentIds !== undefined ? body.restoreAssignmentIds : [];
      const past = PAST_SITES();
      if (!Array.isArray(ids) || ids.length > 20 || ids.some((x) => !past.some((p) => p.assignmentId === x))) return { status: 400, json: { error: es ? "Uno de los sitios no es de esta persona." : "One of those sites is not one of this person's.", code: "employment.badSites", keys: ["restoreAssignmentIds"] } };
      if (ids.indexOf(SCHOOL_PAST) >= 0) {
        const who = state.staff.find((p) => p.id === LEFT_ID) || {};
        const name = [who.first_name, who.last_name].filter(Boolean).join(" ");
        const school = past.find((p) => p.assignmentId === SCHOOL_PAST);
        return { status: 409, json: { error: (es ? "No se puede asignar a " : "") + name + (es ? " a este sitio escolar." : " cannot be placed at this school site."), code: "schedule.clearanceMissing", missing: ["Child abuse clearance"], keys: [name], userId: LEFT_ID, siteId: school.siteId } };
      }
      leftRehired = true;
      return ok({ changed: true, employment: leftEmployment(), rehireEligibleWas: true, restoredSites: past.filter((p) => ids.indexOf(p.assignmentId) >= 0).map((p) => ({ assignmentId: p.assignmentId, siteId: p.siteId, siteName: p.siteName })) });
    }
    if (path === "/api/forms/responses/" + CONCERN_ID + "/acknowledge" && method === "POST") {
      if (concernAck) return { status: 409, json: { error: es ? "Esta inquietud ya se confirm\u00f3." : "This concern is already acknowledged.", code: "forms.alreadyAcknowledged" } };
      const how = body && body.method;
      if (["phone", "text", "email", "in_person"].indexOf(how) < 0) return { status: 400, json: { error: es ? "Elija c\u00f3mo se confirm\u00f3." : "Choose how it was acknowledged.", code: "forms.badDetails", keys: ["method"] } };
      if (body.note != null && String(body.note).length > 500) return { status: 400, json: { error: es ? "La nota admite hasta 500 caracteres." : "A note holds up to 500 characters.", code: "forms.badDetails", keys: ["note"] } };
      const me = person();
      concernAck = { acknowledgedAt: seed.NOW_ISO, acknowledgedMethod: how, acknowledgedBy: { name: [me.firstName || me.first_name, me.lastName || me.last_name].filter(Boolean).join(" ") } };
      return ok(concernAck);
    }
    if (path === "/api/forms/responses/" + CONCERN_ID && method === "GET") return ok(concernRead(lang));
    const answer = base();
    // The concern heads the submitted list, wherever the list is not narrowed to another form.
    if (path === "/api/forms/responses" && method === "GET" && answer && answer.status === 200 && answer.json && Array.isArray(answer.json.responses)
      && String(query.get("status") || "submitted") === "submitted" && (!query.get("formCode") || query.get("formCode") === "OCSA-FRM-009")
      && (!query.get("siteId") || query.get("siteId") === S[0].id) && !query.get("before")) {
      answer.json = Object.assign({}, answer.json, { responses: [concernRow(lang)].concat(answer.json.responses) });
    }
    return answer;
  }

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
    // The staff list is an admin's, the way routes/users.js gates GET /api/users by manage_staff, so a
    // supervisor is refused it whatever the query asks. The dashboard reads a supervisor's people from
    // GET /api/hr/employees-summary instead, below under hr.
    if (path === "/api/users" && method === "GET") {
      if (!effectiveMap(person(), state.overrides[person().id]).manage_staff) return { status: 403, json: { error: "Insufficient permissions" } };
      return ok(state.staff);
    }
    // The whole set of lists is an admin's, the way routes/lookups.js gates GET /api/lookups/all by
    // manage_lookups, so a supervisor is refused it. GET /api/lookups answers anyone signed in with
    // the active lists and their active values, in the same shape.
    if (path === "/api/lookups/all") {
      if (!effectiveMap(person(), state.overrides[person().id]).manage_lookups) return { status: 403, json: { error: "Insufficient permissions" } };
      return ok(lookupsIn(q("locale") || lang));
    }
    if (path === "/api/lookups" && method === "GET") {
      return ok(lookupsIn(lang).filter((c) => c.is_active).map((c) => Object.assign({}, c, { values: c.values.filter((v) => v.is_active) })));
    }
    // The company's settings as a run has saved them, which a reset puts back.
    if (path === "/api/settings" && method === "GET") return ok(state.settings || (state.settings = clone(SETTINGS)));
    if (path === "/api/settings" && (method === "PUT" || method === "PATCH")) {
      state.settings = Object.assign(state.settings || clone(SETTINGS), body || {});
      return ok(state.settings);
    }
    if (path === "/api/reports/overview") return ok(seed.OVERVIEW);
    if (path === "/api/hr-cases/queue-count") return ok(CASE_QUEUE);
    if (path === "/api/notifications/unread-count") return ok({ unread: state.notifications ? state.notifications.filter((n) => !n.readAt).length : UNREAD_COUNT });
    // Step 179: the caller's phone alert settings, GET and PATCH /api/notifications/settings as
    // routes/notifications.js answers them. A PATCH writes only the keys it carries, and refuses the
    // whole body when any key or value is wrong, or when it carries none.
    if (path === "/api/notifications/settings" && method === "GET") return ok(alertSettingsOf(person().id));
    if (path === "/api/notifications/settings" && method === "PATCH") {
      const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};
      const patch = {};
      const bad = [];
      Object.keys(b).forEach((k) => {
        if (k === "chat" && ["all", "mentions", "off"].indexOf(b.chat) >= 0) patch.chat = b.chat;
        else if (["schedule", "pickups", "supplies", "issues", "forms"].indexOf(k) >= 0 && typeof b[k] === "boolean") patch[k] = b[k];
        else bad.push(k);
      });
      if (bad.length || !Object.keys(patch).length) {
        return refuse179(400, "notifications.badSetting", lang, null, { keys: bad.length ? bad : ["chat", "schedule", "pickups", "supplies", "issues", "forms"] });
      }
      state.alertSettings[person().id] = Object.assign({}, state.alertSettings[person().id] || {}, patch);
      return ok(alertSettingsOf(person().id));
    }
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
      // By the kind of record the entry names, the way routes/users.js switches on it: a task is its
      // row. A service is a kind the route has no case for, so it answers found false and nothing
      // else, and the window draws what the entry's own metadata says. Any other kind answers the
      // issue below.
      const kind = path.split("/")[4];
      if (kind === "task") return ok(taskDetail(path.split("/")[5], q("locale") || lang));
      if (kind === "service") return ok({ found: false, record: null, photos: [], relatedItems: [] });
      return ok({
        found: true,
        entry: timelineRows("Tomasz Wisniewski")[1],
        record: { id: "i-1", title: "Lobby floor scuffed after delivery", site_name: S[0].name, zone: "Lobby", severity: "high", status: "open", reported_at: seed.shift(-1) + "T14:05:00Z" },
        photos: [],
        relatedItems: [{ id: "at-1", label: "Strip and refinish lobby", kind: "task", description: "Strip and refinish lobby" }],
      });
    }
    if (path.startsWith("/api/users/timeline/")) {
      const rows = personTimeline ? clone(personTimeline) : timelineRows(person().firstName + " " + person().lastName);
      const cat = q("category");
      const filtered = cat && cat !== "all" ? rows.filter((r) => r.actionType.indexOf(cat.replace(/s$/, "")) >= 0) : rows;
      return ok({ entries: filtered, total: filtered.length });
    }
    if (/^\/api\/users\/[^/]+\/approve$/.test(path)) return ok({ message: "Approved" });
    if (/^\/api\/users\/[^/]+\/pin$/.test(path)) return ok({ message: "PIN reset" });
    if (/^\/api\/users\/[^/]+\/assignments/.test(path)) return ok({ message: "Assignment saved" });
    // The routes Staff Management calls to reset a PIN and to assign and unassign a site.
    if (/^\/api\/users\/[^/]+\/reset-pin$/.test(path)) return ok({ message: "PIN reset" });
    if (/^\/api\/users\/[^/]+\/assign-site$/.test(path)) return ok({ message: "Assignment saved" });
    if (/^\/api\/users\/[^/]+\/unassign-site\/[^/]+$/.test(path)) return ok({ message: "Assignment removed" });
    if (/^\/api\/users\/[^/]+\/certifications/.test(path)) return ok({ message: "Certification saved" });
    // Step 176's three routes, as routes/users.js answers them at ocsa-api 1c3fb42: the invite and the
    // reset link answer the mail's result, and a generated badge number the number and its source.
    if (/^\/api\/users\/[^/]+\/(invite|send-reset)$/.test(path) && method === "POST") {
      const u = state.staff.find((x) => x.id === path.split("/")[3]);
      if (!u) return { status: 404, json: { error: lang === "es" ? "No se encontr\u00f3 el usuario" : "User not found", code: "common.userNotFound" } };
      return ok({ status: "sent", email: u.email || null });
    }
    if (/^\/api\/users\/[^/]+\/badge\/generate$/.test(path) && method === "POST") {
      const u = state.staff.find((x) => x.id === path.split("/")[3]);
      if (!u) return { status: 404, json: { error: lang === "es" ? "No se encontr\u00f3 el usuario" : "User not found", code: "common.userNotFound" } };
      u.badge_number = "7001";
      return created({ badgeNumber: "7001", badgeSource: "generated", message: "Badge number assigned" });
    }
    // The caller's own capabilities, the way routes/users.js answers GET /api/users/me/permissions
    // since Step 179: the role, and every capability's key with the override the person holds or the
    // role's default. A super admin holds every one. Declared ahead of the per-person route, the way
    // the API declares it, so "me" is never read as an id.
    if (path === "/api/users/me/permissions" && method === "GET") {
      const me = person();
      const map = effectiveMap(me, state.overrides[me.id]);
      if (me.isSuperAdmin) Object.keys(map).forEach((k) => { map[k] = true; });
      return ok({ role: me.role, capabilities: map });
    }
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
      newUserSeq += 1;
      const row = Object.assign({ id: "u-new-" + newUserSeq, status: "pending", name: ((body && body.firstName) || "New") + " " + ((body && body.lastName) || "Person") }, body || {});
      state.staff.push(row);
      // The page tells the admin the new person's first PIN, from tempPin.
      return created({ message: "Staff added", user: row, tempPin: "5307" });
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
    // A supply's QR image, a PNG the page fetches with the token, the way routes/supplies.js sends it
    // since Step 183.
    if (/^\/api\/supplies\/[^/]+\/qr\.png$/.test(path) && method === "GET") return imageAnswer();
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
    if (/^\/api\/vendors\/[^/]+\/evaluate$/.test(path)) return ok({ message: "Evaluation saved" });
    if (/^\/api\/vendors\/[^/]+\/link-supply$/.test(path)) return ok({ message: "Supply linked" });
    if (/^\/api\/vendors\/[^/]+\/supply\/[^/]+$/.test(path) && method === "DELETE") return ok({ message: "Supply unlinked" });
    // A vendor's window reads linkedSupplies, and an evaluation's date and evaluator by these names.
    if (/^\/api\/vendors\/[^/]+$/.test(path) && method === "GET") {
      const id = path.split("/")[3];
      const v = VENDORS.find((x) => x.id === id) || VENDORS[0];
      const linked = SUPPLIES.slice(0, 2);
      return ok({ vendor: v,
        evaluations: [{ id: "ev-1", rating: 4, notes: "On time, correct paperwork.", evaluated_on: seed.shift(-30), evaluated_by_name: "Dana Whitlock", evaluation_date: seed.shift(-30), evaluator_name: "Dana Whitlock" }],
        supplies: linked,
        linkedSupplies: linked.map((x, i) => ({ supply_id: x.id, supply_name: x.name, unit_cost: x.cost_per_unit, lead_time_days: i === 0 ? 5 : 12, is_preferred: i === 0 })) });
    }
    if (/^\/api\/vendors\/[^/]+$/.test(path)) return ok({ message: "Vendor updated" });
    if (path === "/api/services" && method === "GET") return ok(SERVICES);
    if (path === "/api/services" && method === "POST") return created({ message: "Service added" });
    if (/^\/api\/services\/[^/]+\/sites/.test(path)) return ok({ message: "Site linked" });
    if (/^\/api\/services\/[^/]+\/link-site$/.test(path)) return ok({ message: "Site linked" });
    if (/^\/api\/services\/[^/]+\/site\/[^/]+$/.test(path) && method === "DELETE") return ok({ message: "Site unlinked" });
    // The catalog's window reads the service and the sites it runs at as linkedSites.
    if (/^\/api\/services\/[^/]+$/.test(path) && method === "GET") {
      const id = path.split("/")[3];
      const sv = SERVICES.find((x) => x.id === id) || SERVICES[0];
      const here = state.sites.slice(0, 2);
      return ok({ service: sv, sites: here, supplies: SUPPLIES.slice(0, 2),
        linkedSites: here.map((x, i) => ({ site_id: x.id, site_name: x.name, city: x.city, state: x.state, notes: i === 0 ? "Nightly, occupied floors first." : "" })) });
    }
    if (/^\/api\/services\/[^/]+$/.test(path)) return ok({ message: "Service updated" });

    // --- sites ------------------------------------------------------------
    if (path.startsWith("/api/sites/profile/")) return ok(siteProfile(idAfter("/api/sites/profile/")));
    if (path.startsWith("/api/sites/chat/")) {
      return ok({ messages: CHAT_MESSAGES, total: CHAT_MESSAGES.length, channel: { id: "ch-1", name: S[0].name } });
    }
    // Step 183: PATCH /api/sites/:siteId/tasks/:taskId/translations { locale, field, text }, a
    // manager's own wording for a checklist item, stored with source person and answered the way
    // routes/sites.js answers it.
    if (/^\/api\/sites\/[^/]+\/tasks\/[^/]+\/translations$/.test(path) && method === "PATCH") {
      const b = body || {};
      const taskId = path.split("/")[5];
      if (b.locale !== "es") return { status: 400, json: { error: "Corrections are written for es", code: "translations.localeInvalid" } };
      if (["label", "description", "zone"].indexOf(b.field) < 0) return { status: 400, json: { error: "A correction names label, description or zone", code: "translations.fieldInvalid" } };
      const text = typeof b.text === "string" ? b.text.trim() : "";
      if (!text) return { status: 400, json: { error: "Write the wording", code: "translations.textRequired" } };
      corrections[taskId] = Object.assign({}, corrections[taskId] || {}, { [b.field]: text });
      const item = siteTasks(path.split("/")[3]).find((x) => x.id === taskId) || { id: taskId };
      return ok({ message: lang === "es" ? "Traducci\u00f3n guardada" : "Translation saved", code: "translations.saved", task: withDisplay(item, lang),
        translation: { locale: "es", field: b.field, text: text, source: "person" } });
    }
    if (/^\/api\/sites\/[^/]+\/tasks/.test(path)) {
      if (method !== "GET") return ok({ message: "Task saved" });
      const sid = path.split("/")[3];
      return ok(checklistRead(sid, q("day"), q("shift")).map((tk) => withDisplay(tk, q("locale") || lang)));
    }
    if (path.startsWith("/api/sites/timeline/") || /^\/api\/sites\/[^/]+\/timeline/.test(path)) {
      const rows = timelineRows("Tomasz Wisniewski");
      const cat = q("category");
      const filtered = cat && cat !== "all" ? rows.filter((r) => r.actionType.indexOf(cat.replace(/s$/, "")) >= 0) : rows;
      return ok({ entries: filtered, total: filtered.length });
    }
    // The supplies not live at the site, and since Step 179 a supply taken off a site: its row is set
    // is_active false and kept, and the profile and this list read the live rows (routes/sites.js).
    if (/^\/api\/sites\/[^/]+\/supplies\/available$/.test(path)) return ok(SUPPLIES.filter((sp0) => liveStock(path.split("/")[3]).indexOf(sp0.id) < 0));
    if (/^\/api\/sites\/[^/]+\/supplies\/[^/]+$/.test(path) && method === "DELETE") {
      const parts = path.split("/");
      const row = siteStock(parts[3]).find((r) => r.supply_id === parts[5] && r.is_active !== false);
      if (!row) return refuse("sites.assignmentNotFound", lang);
      row.is_active = false;
      return ok({ message: "Supply removed from site" });
    }
    if (/^\/api\/sites\/[^/]+\/supplies/.test(path)) return ok({ message: "Supply linked" });
    // A floor plan taken off a site, Step 179: is_active false, and the profile lists the live plans.
    if (/^\/api\/sites\/[^/]+\/floor-plans\/[^/]+$/.test(path) && method === "DELETE") {
      const parts = path.split("/");
      const plan = sitePlans(parts[3]).find((fp) => fp.id === parts[5] && fp.is_active !== false);
      if (!plan) return refuse("sites.floorPlanNotFound", lang);
      plan.is_active = false;
      return ok({ message: "Floor plan removed" });
    }
    if (path === "/api/sites" && method === "POST") { const row = Object.assign({ id: "s-new", status: "active" }, body || {}); state.sites.push(row); return created({ message: "Site added" }); }
    if (/^\/api\/sites\/[^/]+$/.test(path) && method === "GET") return ok(siteProfile(path.split("/")[3]));
    if (/^\/api\/sites\/[^/]+$/.test(path)) return ok({ message: "Site updated" });

    // --- schedule, patterns, time off ------------------------------------
    if (path === "/api/schedule/calendar") {
      if (!state.schedule) state.schedule = clone(SCHEDULE);
      const site = q("site_id");
      const shifts = site ? state.schedule.filter((sh) => sh.site_id === site) : state.schedule;
      return ok({ scheduled_shifts: shifts, inspections: inspectionRows() });
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
      // What a change answers since Step 179 (routes/shiftPatterns.js at ocsa-api 1c3fb42): the shifts
      // added and removed, and each date kept or skipped with its reason in English and its code.
      const reason = (days, code, en) => ({ date: seed.shift(days), reason: en, code: code });
      const kept = [reason(3, "patterns.keptCancelled", "cancelled"), reason(5, "patterns.keptChangedByHand", "changed by hand"),
        reason(7, "patterns.keptPostedOpen", "posted as an open shift"), reason(0, "patterns.keptReferenced", "referenced by site_sessions")];
      const skipped = [reason(10, "patterns.skippedClash", "already scheduled at that time")];
      return ok({ pattern: p, created: 2, removed: 3, kept: kept, skipped: skipped, keptCount: kept.length, skippedCount: skipped.length });
    }
    // Since Step 179 a removed shift stays and is marked cancelled, a pattern's shift as well, so
    // the pattern never writes that date again, and the answer is the same either way. The calendar
    // still answers the row, and the page leaves a cancelled shift off the week (routes/schedule.js).
    if (/^\/api\/schedule\/[^/]+$/.test(path) && method === "DELETE") {
      if (!state.schedule) state.schedule = clone(SCHEDULE);
      const row = state.schedule.find((s) => s.id === path.split("/")[3]);
      if (!row) return refuse("schedule.shiftNotFound", lang);
      row.status = "cancelled";
      row.updated_at = seed.NOW_ISO;
      if (row.shift_pattern_id) row.pattern_modified_at = seed.NOW_ISO;
      return ok({ message: "Scheduled shift deleted" });
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
    if (path.startsWith("/api/pickups/analytics/staff-reliability")) return ok(PICKUP_RELIABILITY);
    if (path === "/api/pickups/analytics/patterns") return ok(PICKUP_PATTERNS);
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
    if (path.startsWith("/api/shift-sessions/by-site")) return ok(shiftSessions || SHIFT_SESSIONS);

    // --- inspections ------------------------------------------------------
    // The live templates, each with its live item count; ?all=true lists the removed ones too.
    if (path === "/api/inspections/templates" && method === "GET") {
      const off = (tpId) => (state.templateItems && state.templateItems[tpId] ? state.templateItems[tpId].filter((it) => it.is_active === false).length : 0);
      return ok(templateRows().filter((tp) => q("all") === "true" || tp.is_active !== false)
        .map((tp) => (off(tp.id) ? Object.assign({}, tp, { item_count: tp.item_count - off(tp.id) }) : tp)));
    }
    if (path === "/api/inspections/templates" && method === "POST") return created({ message: "Template created", template: { id: "tp-new", name: (body && body.name) || "New template", item_count: 0, max_total_score: 0, is_active: true } });
    // An item taken off a template, Step 179: is_active false and kept, so every score against it still
    // names it.
    if (/^\/api\/inspections\/templates\/[^/]+\/items\/[^/]+$/.test(path) && method === "DELETE") {
      const parts = path.split("/");
      const it = itemRows(parts[4]).find((x) => x.id === parts[6]);
      if (it) it.is_active = false;
      return ok({ success: true });
    }
    if (/^\/api\/inspections\/templates\/[^/]+\/items/.test(path)) return ok({ message: "Item added" });
    if (/^\/api\/inspections\/templates\/[^/]+$/.test(path) && method === "GET") {
      const id = path.split("/")[4];
      const tp = templateRows().find((x) => x.id === id) || templateRows()[0];
      // The template's panel reads its name and id beside its live items, at the top level.
      return ok(Object.assign({}, tp, { template: tp, items: itemRows(tp.id).filter((it) => it.is_active !== false) }));
    }
    // PUT writes the name and the description it is sent, both columns, and answers the row, the way
    // routes/inspections.js does, so a rename that sent no description would empty it.
    if (/^\/api\/inspections\/templates\/[^/]+$/.test(path) && method === "PUT") {
      if (!state.templates) state.templates = clone(INSPECTION_TEMPLATES);
      const tp = state.templates.find((x) => x.id === path.split("/")[4]);
      if (!tp) return { status: 404, json: { error: "Template not found", code: "inspections.templateNotFound" } };
      tp.name = (body && body.name) || tp.name;
      tp.description = body && body.description !== undefined ? body.description : null;
      return ok(tp);
    }
    // A template taken off the list, Step 179: is_active false and kept, so every completed inspection
    // still names it.
    if (/^\/api\/inspections\/templates\/[^/]+$/.test(path) && method === "DELETE") {
      const tp = templateRows().find((x) => x.id === path.split("/")[4]);
      if (tp) tp.is_active = false;
      return ok({ success: true });
    }
    if (/^\/api\/inspections\/templates\/[^/]+$/.test(path)) return ok({ message: "Template updated" });
    if (path === "/api/inspections/scheduled" && method === "GET") {
      const done = seed.INSPECTION_SCORES.map((r) => Object.assign({}, r, { status: "completed", assigned_to_name: r.completed_by_name, template_id: "tp-1" }));
      return ok(inspectionRows().concat(done));
    }
    // hand: 2 pending plus 4 completed = 6 rows in one list, which the page splits by status.
    if (path === "/api/inspections/scheduled" && method === "POST") return created({ message: "Inspection scheduled" });
    // The detail view reads the row's own fields at the top level plus result, items and scores,
    // and matches a score to an item by template_item_id.
    if (/^\/api\/inspections\/scheduled\/[^/]+$/.test(path) && method === "GET") {
      const id = path.split("/")[4];
      const found = inspectionRows().concat(seed.INSPECTION_SCORES).find((x) => x.id === id) || seed.INSPECTION_SCORES[0];
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
    // PATCH writes the fields it is sent and answers the row; status cancelled is how the dashboard
    // cancels one. DELETE cancels one too since Step 179, with who and when, and refuses a completed one,
    // which is kept as it is (routes/inspections.js).
    if (/^\/api\/inspections\/scheduled\/[^/]+$/.test(path) && method === "PATCH") {
      const row = inspectionRows().find((x) => x.id === path.split("/")[4]);
      if (!row) return refuse("inspections.scheduledNotFound", lang);
      ["template_id", "site_id", "assigned_to", "scheduled_date", "status"].forEach((k) => { if (body && body[k] !== undefined) row[k] = body[k]; });
      return ok(Object.assign({}, row));
    }
    if (/^\/api\/inspections\/scheduled\/[^/]+$/.test(path) && method === "DELETE") {
      const id = path.split("/")[4];
      if (seed.INSPECTION_SCORES.some((x) => x.id === id)) return refuse("inspections.completedKept", lang);
      const row = inspectionRows().find((x) => x.id === id);
      if (!row) return refuse("inspections.scheduledNotFound", lang);
      row.status = "cancelled"; row.cancelled_by = person().id; row.cancelled_at = seed.NOW_ISO;
      return ok({ success: true });
    }
    if (/^\/api\/inspections\/scheduled\/[^/]+$/.test(path)) return ok({ message: "Inspection updated" });
    if (path.startsWith("/api/inspections/analytics/dashboard-summary")) return ok(seed.INSPECTION_DASHBOARD_SUMMARY);
    if (path.startsWith("/api/inspections/analytics/scores-over-time")) return ok(seed.INSPECTION_SCORES);
    if (path.startsWith("/api/inspections/analytics/site-comparison")) return ok(seed.INSPECTION_SITE_COMPARISON);
    if (path.startsWith("/api/inspections/analytics/lowest-items")) return ok(seed.INSPECTION_LOWEST_ITEMS);
    if (path.startsWith("/api/inspections/analytics/category-breakdown")) {
      // Shaped to the Reports tab, which reads the items scored and the points beside the average.
      return ok([
        { cims_category: "SD", avg_score_pct: 88, item_count: 6, total_items: 6, total_score: 53, total_max: 60 },
        { cims_category: "HSE", avg_score_pct: 70, item_count: 3, total_items: 3, total_score: 21, total_max: 30 },
        { cims_category: "GB", avg_score_pct: 90, item_count: 1, total_items: 1, total_score: 9, total_max: 10 },
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
    if (path === "/api/report-engine/definitions" && method === "GET") return ok(reportRows().filter((r) => q("all") === "true" || r.is_active !== false));
    if (path === "/api/report-engine/definitions" && method === "POST") return created({ message: "Report saved", definition: Object.assign({ id: "rd-new", is_system: false }, body || {}) });
    if (/^\/api\/report-engine\/definitions\/[^/]+$/.test(path) && method === "DELETE") {
      const r = reportRows().find((x) => x.id === path.split("/")[4] && x.is_active !== false);
      if (!r) return { status: 404, json: { error: "Report definition not found" } };
      if (r.is_system) return { status: 403, json: { error: "System reports cannot be deleted." } };
      if (String(r.created_by) !== String(person().id) && person().role !== "admin") {
        return { status: 403, json: { error: lang === "es" ? "No tiene permiso para hacer esto" : "Insufficient permissions", code: "access.insufficientPermissions" } };
      }
      r.is_active = false;
      return ok({ success: true });
    }
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
      return ok(uid ? liveDocs().filter((d) => d.user_id === uid) : liveDocs());
    }
    // routes/hr.js: a list filtered by user_id and nothing else, one record created per call, and an
    // update and a delete that find the record or say it is not there. Every route is admin or
    // supervisor, which is who signs in here. Since Step 179 a delete stamps the record with
    // removed_at and who and keeps it, and the list and every read leave a stamped record out.
    if (path === "/api/hr/training" && method === "GET") {
      const uid = q("user_id");
      return ok(trainingRows().filter((r) => !r.removed_at && (!uid || r.user_id === uid)).map(trainingListRow).sort(trainingOrder));
    }
    if (path === "/api/hr/training" && method === "POST") {
      const b = body || {};
      // The table holds all three NOT NULL, so the route refuses a body missing one.
      if (!b.user_id || !b.training_name || !b.training_type) {
        return { status: 400, json: { error: "A training record needs a person, a training name and a type" } };
      }
      const row = {
        id: "ht-" + trainingNext, user_id: b.user_id, training_name: b.training_name, training_type: b.training_type,
        completed_date: b.completed_date || null, expiry_date: b.expiry_date || null, score: b.score || null,
        administered_by: b.administered_by || null, notes: b.notes || null, document_id: b.document_id || null,
        created_at: new Date(Date.parse(seed.NOW_ISO) + trainingNext * 1000).toISOString(),
      };
      trainingNext += 1;
      trainingRows().push(row);
      return ok(trainingTableRow(row));
    }
    if (/^\/api\/hr\/training\/[^/]+$/.test(path) && (method === "PUT" || method === "DELETE")) {
      const id = idAfter("/api/hr/training/");
      const rows = trainingRows();
      const at = rows.findIndex((r) => r.id === id && !r.removed_at);
      if (at < 0) return { status: 404, json: { error: "Training record not found" } };
      if (method === "DELETE") { rows[at].removed_at = seed.NOW_ISO; rows[at].removed_by = person().id; return ok({ success: true }); }
      const b = body || {};
      ["training_name", "training_type", "completed_date", "expiry_date", "score", "administered_by", "notes", "document_id"]
        .forEach((k) => { rows[at][k] = b[k] || null; });
      return ok(trainingTableRow(rows[at]));
    }
    if (path === "/api/hr/employees-summary") {
      const want = q("status") || "active";
      return ok({ employees: state.staff.filter((s) => want === "all" || s.status === want).map(hrCard) });
    }
    if (path === "/api/hr/compliance") return ok(HR_COMPLIANCE);
    if (path.startsWith("/api/hr/employee-folder/")) {
      const uid = idAfter("/api/hr/employee-folder/");
      return ok(hrFolder(state.staff.find((s) => s.id === uid) || state.staff[0]));
    }
    // A step taken off a person's checklist, Step 179: stamped with removed_at and who and kept, and
    // the checklist reads the live steps.
    if (/^\/api\/hr\/onboarding\/step\/[^/]+$/.test(path) && method === "DELETE") {
      const step = onboardingRows().find((x) => x.id === path.split("/")[5] && !x.removed_at);
      if (!step) return refuse("hr.stepNotFound", lang);
      step.removed_at = seed.NOW_ISO; step.removed_by = person().id;
      return ok({ success: true });
    }
    if (path.startsWith("/api/hr/onboarding")) {
      if (method !== "GET") return ok({ message: "Onboarding updated" });
      return ok(liveSteps());
    }

    // --- cases ------------------------------------------------------------
    if (path === "/api/hr-cases" && method === "GET") {
      const status = q("status");
      const rows = status ? HR_CASES.filter((c) => c.status === status) : HR_CASES;
      return ok({ cases: rows });
    }
    if (path === "/api/hr-cases" && method === "POST") return created({ message: "Case opened" });
    // Who a case can be escalated to, shaped to what the window reads: subjects, each with an id, a
    // name and a title. The first case's own subject is among them, and the window never offers it.
    if (path === "/api/contacts/case-subjects") return ok({ subjects: [
      { id: "u-super-1", name: "Oyelaran Adebayo", title: "Director of Operations" },
      { id: "u-staff-5", name: "Tomasz Wisniewski", title: null },
    ] });
    if (/^\/api\/hr-cases\/[^/]+\/access-log$/.test(path)) {
      // Shaped to what the window's log reads: a name, a role and what was done, by its code. The
      // filing email is the system's own, with no name.
      return ok({ entries: [
        { id: "ca-1", at: seed.shift(-1) + "T10:00:00Z", name: "Dana Whitlock", role: "admin", action: "hr_case_read" },
        { id: "ca-2", at: seed.shift(-1) + "T10:05:00Z", name: "Dana Whitlock", role: "admin", action: "hr_case_access_log_read" },
        { id: "ca-3", at: seed.shift(-4) + "T09:01:00Z", name: null, role: null, action: "hr_case_filed_mail" },
      ] });
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
    // GET /api/jotform/sync-diagnostic the way routes/jotform.js answers its summary: each enabled
    // form with what Jotform holds, what we hold and the difference, and the totals over them.
    // hand: 2 forms, neither with a gap, 13 submissions on both sides, 0 unresolved failures.
    if (path.startsWith("/api/jotform/sync-diagnostic")) {
      const forms = JOTFORM_FORMS.map((f) => ({
        form_id: f.id, jotform_form_id: f.form_id, title: f.title, category: "uncategorized", is_enabled: true,
        submissions_last_synced_at: f.last_submission_at, last_submission_at: f.last_submission_at,
        jotform_count: f.submission_count, our_count: f.submission_count, delta: 0,
        has_gap: false, has_overshoot: false, not_in_jotform: false, unresolved_failure_count: 0,
      }));
      return ok({ mode: "summary", generated_at: seed.NOW_ISO, forms, summary: {
        total_forms: forms.length, forms_with_gap: 0,
        total_jotform_submissions: forms.reduce((n, f) => n + f.jotform_count, 0),
        total_our_submissions: forms.reduce((n, f) => n + f.our_count, 0),
        total_unresolved_failures: 0,
      } });
    }
    if (path.startsWith("/api/jotform/diagnostic")) {
      return ok({ forms: JOTFORM_FORMS.map((f) => ({ form_id: f.form_id, title: f.title, cached: f.submission_count, upstream: f.submission_count, missing: 0 })), checkedAt: seed.NOW_ISO });
    }
    // The sync log and the failures in the columns routes/jotform.js sends at ocsa-api 1c3fb42: one sync
    // of each type the API writes, in each status it writes, and a failure at two of its stages.
    if (path.startsWith("/api/jotform/sync-log")) return ok([
      { id: "sl-1", started_at: seed.shift(0) + "T19:00:00Z", sync_type: "forms", form_title: null, status: "success", records_processed: 2, records_created: 0, records_updated: 2, error_message: null, triggered_by_name: "Dana Whitlock" },
      { id: "sl-2", started_at: seed.shift(0) + "T18:00:00Z", sync_type: "submissions", form_title: JOTFORM_FORMS[0].title, status: "failed", records_processed: 0, records_created: 0, records_updated: 0, error_message: "The upstream answered 502", triggered_by_name: null },
      { id: "sl-3", started_at: seed.shift(0) + "T17:00:00Z", sync_type: "failure_retry", form_title: JOTFORM_FORMS[1].title, status: "running", records_processed: 1, records_created: 1, records_updated: 0, error_message: null, triggered_by_name: null },
      { id: "sl-4", started_at: seed.shift(-1) + "T17:00:00Z", sync_type: "force_fetch", form_title: JOTFORM_FORMS[0].title, status: "partial", records_processed: 4, records_created: 3, records_updated: 0, error_message: null, triggered_by_name: "Dana Whitlock" },
    ]);
    if (path.startsWith("/api/jotform/submission-failures")) {
      if (method !== "GET") return ok({ message: "Marked resolved" });
      const failures = [
        { id: "sf-1", jotform_submission_id: "600000000000009", form_title: JOTFORM_FORMS[0].title, failure_stage: "fetch", failure_reason: "Answer set was empty", attempted_at: seed.shift(-3) + "T08:00:00Z", exists_in_submissions: false },
        { id: "sf-2", jotform_submission_id: "600000000000010", form_title: JOTFORM_FORMS[1].title, failure_stage: "parse", failure_reason: "A date did not read", attempted_at: seed.shift(-2) + "T08:00:00Z", exists_in_submissions: false },
      ];
      return ok({ failures, total: failures.length, limit: 200, offset: 0 });
    }
    if (path === "/api/jotform/user-aliases" && method === "GET") {
      const uid = q("user_id");
      return ok(aliasRows().filter((a) => a.is_active !== false && (!uid || a.user_id === uid)));
    }
    if (/^\/api\/jotform\/user-aliases\/[^/]+$/.test(path) && method === "DELETE") {
      const a = aliasRows().find((x) => x.id === path.split("/")[4] && x.is_active !== false);
      if (!a) return refuse("jotform.aliasNotFound", lang);
      a.is_active = false;
      const own = {};
      ["id", "user_id", "alias_type", "alias_value", "source", "created_by_user_id", "created_at", "last_matched_at", "match_count", "notes", "is_active"].forEach((k) => { own[k] = a[k]; });
      return ok({ success: true, deleted: own });
    }
    if (path.startsWith("/api/jotform/user-aliases")) return ok({ message: "Alias saved" });
    if (path === "/api/jotform/users-for-linking") return ok(state.staff.map((s) => ({ id: s.id, name: s.name, email: s.email })));
    if (path === "/api/jotform/auto-link") return ok({ message: "Linked 1 submission", linked: 1 });
    if (path === "/api/jotform/pdf-backfill") return ok({ message: "Backfilled 2 PDFs", filled: 2 });
    if (/^\/api\/jotform\/employee-documents\/[^/]+$/.test(path) && method === "DELETE") {
      const doc = docRows().find((x) => x.id === path.split("/")[4] && !x.removed_at);
      if (!doc) return refuse("jotform.documentNotFound", lang);
      doc.removed_at = seed.NOW_ISO; doc.removed_by = person().id;
      return ok({ success: true, deleted: doc.id });
    }
    if (path.startsWith("/api/jotform/employee-documents/")) return ok(JOTFORM_SUBMISSIONS.slice(0, 1));
    // POST /api/jotform/employees/:userId/documents answers the row it inserted, routes/jotform.js.
    if (/^\/api\/jotform\/employees\/[^/]+\/documents$/.test(path) && method === "POST") {
      return created({ id: "doc-new-1", user_id: idAfter("/api/jotform/employees/"), category: "uncategorized", created_at: seed.NOW_ISO });
    }
    // Since Step 186 ?app=portal|dashboard|customer lists only the forms offered in that app, and no app
    // lists every form, as before (routes/forms.js and helpers/formCatalog.js at ocsa-api 94dbe27). A
    // form a builder published is listed beside the rest. The catalog is in the language the address
    // names, which the API reads ahead of the one the browser sends.
    if (path === "/api/forms") {
      const app = q("app");
      const said = q("locale") === "es" || q("locale") === "en" ? q("locale") : lang;
      const all = FORM_LIST.map((f) => Object.assign({ fillers: [] }, f, f.titles ? { title: f.titles[said === "es" ? "es" : "en"], titles: undefined } : {})).concat([deskForm(said)]).concat(publishedForms(said));
      return ok({ forms: all.filter((f) => !app || (f.apps || []).indexOf(app) >= 0) });
    }
    // Step 186: a report started on a published builder form, the way POST /api/forms/:code/drafts starts
    // one at ocsa-api 94dbe27: one open draft per person per form, source admin when an admin or a
    // supervisor says so, and the version's catalog form beside the draft.
    const startCode = /^\/api\/forms\/[^/]+\/drafts$/.test(path) && method === "POST" ? decodeURIComponent(path.split("/")[3]) : "";
    if (startCode && isPublished(startCode)) {
      const form = builderCatalogForm(BUILDER_FORMS[startCode], lang);
      const open = builderReports().find((r) => r.formCode === startCode && r.status === "draft" && r.userId === person().id);
      if (open) return ok({ draft: builderView(open, lang), form: form, resumed: true });
      builderSeq += 1;
      const row = { id: "fr-bn-" + builderSeq, formCode: startCode, version: BUILDER_FORMS[startCode].version, status: "draft", siteId: null, userId: person().id,
        source: String((body && body.source) || "").trim().toLowerCase() === "admin" && (person().role === "admin" || person().role === "supervisor") ? "admin" : "portal",
        createdAt: seed.NOW_ISO, submittedAt: null, answers: {} };
      builderReports().push(row);
      return created({ draft: builderView(row, lang), form: form, resumed: false });
    }
    // Step 186: the draft routes for a report on a builder form, the way routes/forms.js answers them: the
    // owner's alone, a save checked whole before anything is written, a person read off the account, and
    // a Send refused with what is missing until every required question is answered.
    const builderDraft = /^\/api\/forms\/drafts\/[^/]+(\/submit)?$/.test(path) ? builderReports().find((r) => r.id === decodeURIComponent(path.split("/")[4])) : null;
    if (builderDraft) {
      const r = builderDraft;
      const def = BUILDER_FORMS[r.formCode];
      if (String(r.userId || "") !== String(person().id)) return formRefusal("forms.draftNotFound", lang);
      if (method === "GET") return ok({ draft: builderView(r, lang), form: builderCatalogForm(def, lang) });
      if (r.status !== "draft") return formRefusal("forms.alreadySubmitted", lang);
      if (method === "PATCH") {
        const answers = body && body.answers;
        if (!answers || typeof answers !== "object" || Array.isArray(answers)) return formRefusal("forms.answersShape", lang);
        const unanswerable = [];
        const invalid = [];
        const merge = {};
        Object.keys(answers).forEach((k) => {
          const f = def.fields.find((x) => x.key === k && x.half === "agent" && !x.prefill);
          if (!f) { unanswerable.push(k); return; }
          const out = f.type === "person" ? personOutcome(answers[k]) : plainOutcome(f, answers[k]);
          if (out.invalid) { invalid.push({ key: k, reason: out.reason || null }); return; }
          merge[k] = out.clear ? null : out.value;
        });
        if (unanswerable.length) return formRefusal("forms.unanswerable", lang, null, { keys: unanswerable });
        if (invalid.length) return formRefusal(invalid.some((x) => x.reason === "person") ? "forms.badPerson" : "forms.invalidAnswers", lang, null, { keys: invalid.map((x) => x.key) });
        Object.keys(merge).forEach((k) => { if (merge[k] === null) delete r.answers[k]; else r.answers[k] = merge[k]; });
        return ok({ draft: builderView(r, lang) });
      }
      if (method === "POST" && /\/submit$/.test(path)) {
        const view = builderView(r, lang);
        if (view.missing.length) return formRefusal("forms.requiredUnanswered", lang, null, { missing: view.missing, missingFields: view.missingFields });
        r.status = "submitted"; r.submittedAt = seed.NOW_ISO;
        return ok({ id: r.id, formCode: r.formCode, status: r.status, submittedAt: r.submittedAt });
      }
    }
    // Step 166: the draft routes the portal calls, for a form started at a desk. Since Step 179 the
    // API reads source admin from the body and stores it when an admin or a supervisor starts the
    // form, and portal otherwise (routes/forms.js at ocsa-api 1c3fb42); a save merges the answers, a
    // null taking one off; Send refuses with the missing list until every required question in play
    // is answered, then files it.
    if (/^\/api\/forms\/[^/]+\/drafts$/.test(path) && method === "POST") {
      const code = decodeURIComponent(path.split("/")[3]);
      if (code !== DESK_CODE || !startable) return { status: 403, json: { error: lang === "es" ? "No puede iniciar este formulario" : "You cannot start this form", code: "forms.cannotStart" } };
      deskSeq += 1;
      const row = { id: "fr-new-" + deskSeq, formCode: DESK_CODE, formName: deskForm(lang).title, status: "draft", siteId: null, siteName: null,
        userId: person().id, userName: person().firstName + " " + person().lastName, createdAt: seed.NOW_ISO, submittedAt: null, dueAt: null,
        source: String((body && body.source) || "").toLowerCase() === "admin" && (person().role === "admin" || person().role === "supervisor") ? "admin" : "portal", answers: {} };
      INCIDENT_REPORTS.push(row);
      return created({ draft: deskView(row, lang) });
    }
    // Step 169: POST /api/forms/drafts/:id/customer-signature { key, name, role, signature }, by
    // the person filling the draft, answered with the whole report the way routes/forms.js
    // answers it. The refusals are the API's codes and words.
    if (/^\/api\/forms\/drafts\/[^/]+\/customer-signature$/.test(path) && method === "POST") {
      const r = INCIDENT_REPORTS.find((x) => x.id === decodeURIComponent(path.split("/")[4]));
      if (!r || !deskDraft(r) || String(r.userId || "") !== String(person().id)) return { status: 404, json: { error: lang === "es" ? "No se encontr\u00f3 el reporte" : "Draft not found", code: "forms.draftNotFound" } };
      if (r.status !== "draft") return { status: 409, json: { error: lang === "es" ? "Este reporte ya se hab\u00eda enviado" : "This report was already submitted", code: "forms.alreadySubmitted" } };
      const key = String((body && body.key) || "");
      const f = deskForm("en").fields.find((x) => x.key === key && x.type === "customer_signature");
      if (!f) return { status: 400, json: { error: lang === "es" ? "Esa pregunta no es una firma del cliente" : "That question is not a customer signature", code: "forms.notACustomerSignature" } };
      const name = String((body && body.name) || "").trim();
      if (!name) return { status: 400, json: { error: lang === "es" ? "Escriba su nombre." : "Give your name.", code: "customer.nameRequired" } };
      const sig = body && body.signature;
      if (typeof sig !== "string" || sig.indexOf("data:image/png;base64,") !== 0) return { status: 400, json: { error: lang === "es" ? "Firme antes de enviar" : "Draw your signature before you sign", code: "forms.signatureRequired" } };
      if (Math.floor((sig.split(",")[1] || "").length * 3 / 4) > 300 * 1024) return { status: 400, json: { error: lang === "es" ? "La firma pesa m\u00e1s de 300 KB." : "The signature is over 300 KB.", code: "forms.signatureTooLarge" } };
      customerSigSeq += 1;
      r.answers[key] = { name, role: String((body && body.role) || "").trim() || null, signatureId: "csig-new-" + customerSigSeq, at: seed.NOW_ISO };
      return ok(Object.assign(reportPayload(r, lang), { draft: deskView(r, lang) }));
    }
    if (/^\/api\/forms\/drafts\/[^/]+(\/submit)?$/.test(path)) {
      const r = INCIDENT_REPORTS.find((x) => x.id === decodeURIComponent(path.split("/")[4]));
      if (!r || !deskDraft(r)) return { status: 404, json: { error: lang === "es" ? "No se encontr\u00f3 el borrador" : "Draft not found" } };
      if (String(r.userId || "") !== String(person().id)) return { status: 403, json: { error: lang === "es" ? "Este borrador es de otra persona" : "This draft is somebody else's" } };
      if (method === "GET") return ok({ draft: deskView(r, lang) });
      if (r.status !== "draft") return { status: 409, json: { error: lang === "es" ? "Este formulario ya se envi\u00f3" : "This form was already sent" } };
      if (method === "PATCH") {
        const answers = body && body.answers;
        if (!answers || typeof answers !== "object" || Array.isArray(answers)) return { status: 400, json: { error: "Send answers as an object of key and value" } };
        const keys = deskForm("en").fields.map((f) => f.key);
        const outside = Object.keys(answers).filter((k) => keys.indexOf(k) < 0);
        if (outside.length) return { status: 400, json: { error: lang === "es" ? "Una respuesta no corresponde a este formulario" : "An answer is not a question on this form", keys: outside } };
        // Step 169: a customer's signature is written by its own route, the way the API refuses one
        // in a save.
        const byRoute = Object.keys(answers).filter((k) => deskForm("en").fields.some((f) => f.key === k && f.type === "customer_signature"));
        if (byRoute.length) return { status: 400, json: { error: lang === "es" ? "El cliente firma con el bot\u00f3n de firma del cliente" : "The customer signs with the Customer signature button", code: "forms.customerSignatureByRoute", keys: byRoute } };
        Object.keys(answers).forEach((k) => { if (answers[k] === null) delete r.answers[k]; else r.answers[k] = answers[k]; });
        return ok({ draft: deskView(r, lang) });
      }
      if (method === "POST" && /\/submit$/.test(path)) {
        const view = deskView(r, lang);
        if (view.missing.length) return { status: 400, json: { error: lang === "es" ? "Faltan respuestas" : "Some answers are still missing", missing: view.missing, missingFields: view.missingFields } };
        r.status = "submitted"; r.submittedAt = seed.NOW_ISO; r.answered = view.answered; r.remaining = 0;
        return ok({ draft: deskView(r, lang) });
      }
    }
    if (path === "/api/forms/responses") {
      // Who may list decides who may open Forms at all. An admin always may; anyone else may when
      // a form names a capability they hold in its readers, which the seed marks on the person.
      if (!canListFiledForms()) return { status: 403, json: { error: "Insufficient permissions" } };
      // Since Step 179 the list reads submitted, draft or void, and void is an admin's alone: anyone
      // else asking for it is refused the way the list refuses a caller it does not admit, in the API's
      // words. Anything else reads as submitted, as it always did (routes/forms.js at 1c3fb42).
      const asked = String(q("status") || "submitted");
      if (asked === "void" && person().role !== "admin") return voidRefusal("access.insufficientPermissions", 403, lang);
      const status = asked === "draft" || asked === "void" ? asked : "submitted";
      const code = q("formCode") || "";
      // The list carries no answers. Since Step 175 it carries each filing's source, as it was stored:
      // a form started at a desk, admin or portal, and a customer's filing, customer. The seed's own
      // rows were filed before there was a source to store, and carry none unless filedSources is on.
      const rows = INCIDENT_REPORTS.concat(CUSTOMER_FILINGS).filter((r) => statusOf(r) === status && (!code || r.formCode === code))
        .map((r) => (customerFiling(r) ? Object.assign(customerListRow(r, lang), { source: "customer" }) : deskDraft(r) ? Object.assign({}, r, deskView(r, lang), { answers: undefined }) : asFiled(r)));
      // Step 186: the reports filed on a builder form, once the form is published.
      const built = builderReports().filter((r) => isPublished(r.formCode) && statusOf(r) === status && (!code || r.formCode === code)).map((r) => builderListRow(r, lang));
      return ok({ responses: rows.concat(built) });
    }
    if (/^\/api\/forms\/responses\/[^/]+\/pdf$/.test(path) && method === "GET") {
      const rid = path.split("/")[4];
      // A report on a builder form is named by its own code, the way helpers/formPdf.js filenameFor
      // names every report.
      const built = builderReport(rid);
      const r = built || INCIDENT_REPORTS.find((x) => x.id === rid) || INCIDENT_REPORTS[0];
      const name = (built ? built.formCode : NOTIFICATION_FORMS[0].code) + "-" + String(r.id).slice(0, 8) + ".pdf";
      const headers = exposeDisposition
        ? { "Content-Disposition": 'attachment; filename="' + name + '"', "Access-Control-Expose-Headers": "Content-Disposition" }
        : { "Content-Disposition": 'attachment; filename="' + name + '"' };
      return { status: 200, pdf: true, headers: headers,
        json: "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n" };
    }
    if (/^\/api\/forms\/responses\/[^/]+\/resend$/.test(path) && method === "POST") {
      const rid = path.split("/")[4];
      const r = INCIDENT_REPORTS.find((x) => x.id === rid) || INCIDENT_REPORTS[0];
      if (statusOf(r) !== "submitted") return { status: 409, json: { error: "Only a filed report can be sent again", status: statusOf(r) } };
      const code = NOTIFICATION_FORMS[0].code;
      // hand: 3 emails and 2 app notices, and the PDF rides along only when the form is set to pdf.
      return ok({ id: r.id, formCode: code, inApp: 2, email: 3, attached: (state.formDelivery[code] || "app_link") === "pdf" });
    }
    // Step 179: POST /api/forms/responses/:id/void { reason }, the way routes/forms.js answers it at
    // ocsa-api 1c3fb42 and at 94dbe27: a report that is not there, a caller who is not an admin, a
    // report already void, one that is not filed, no reason and a reason over 500 characters are each
    // refused in that order with the API's code and words. Otherwise the reason, trimmed, is kept, and
    // the report answers in the read's shape, status void. A report filed on a builder form (Step 186)
    // carries its status on itself, which the folder, the list and its payload read.
    if (/^\/api\/forms\/responses\/[^/]+\/void$/.test(path) && method === "POST") {
      const id = decodeURIComponent(path.split("/")[4]);
      const built = builderReport(id);
      const r = built || anyReport(id);
      if (!r) return voidRefusal("forms.reportNotFound", 404, lang);
      if (person().role !== "admin") return voidRefusal("access.insufficientPermissions", 403, lang);
      if (statusOf(r) === "void") return voidRefusal("forms.alreadyVoid", 409, lang, null, { status: "void" });
      if (statusOf(r) !== "submitted") return voidRefusal("forms.voidFiledOnly", 409, lang, null, { status: statusOf(r) });
      const reason = body && typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason) return voidRefusal("forms.voidReasonRequired", 400, lang);
      if (reason.length > VOID_REASON_MAX) return voidRefusal("forms.voidReasonTooLong", 400, lang, { max: VOID_REASON_MAX });
      voided()[r.id] = { reason: reason, by: person().id, at: seed.NOW_ISO };
      if (built) r.status = "void";
      return ok(built ? builderPayload(r, lang) : reportPayload(r, lang));
    }
    if (/^\/api\/forms\/responses\/[^/]+\/signoff$/.test(path) && method === "POST") {
      const r = anyReport(path.split("/")[4]);
      if (!r) return { status: 404, json: { error: "Report not found" } };
      const key = body && body.key;
      const payload = reportPayload(r, lang);
      const keys = payload.fields.filter((f) => f.type === "signoff").map((f) => f.key);
      if (keys.indexOf(key) < 0) return { status: 400, json: { error: "That is not a sign-off on this form" } };
      // Step 166: the filer's own sign-off on a form started at a desk, made by the filer while the
      // form is still a draft, with the signature the box drew.
      if (deskDraft(r)) {
        if (key !== "filer_signoff" || String(r.userId || "") !== String(person().id)) return { status: 403, json: { error: "You cannot sign this part of the form" } };
        if (r.status !== "draft") return { status: 409, json: { error: "This report was already submitted" } };
        if (r.answers[key]) return { status: 409, json: { error: "This part is already signed" } };
        const sig = body && body.signature;
        if (typeof sig !== "string" || sig.indexOf("data:image/png;base64,") !== 0) {
          return { status: 400, json: { error: lang === "es" ? "Firme antes de enviar" : "Draw your signature before you sign", code: "forms.signatureRequired" } };
        }
        r.answers[key] = Object.assign(stampNow(), { signature: { id: "sig-" + key } });
        return ok({ draft: deskView(r, lang) });
      }
      if (String(r.userId || "") === String(person().id)) return { status: 403, json: { error: "You cannot sign off on your own report" } };
      if (filedState().signed[key]) return { status: 409, json: { error: "This part is already signed" } };
      if (payload.canSign.indexOf(key) < 0) return { status: 403, json: { error: "You cannot sign this part of the form" } };
      // Step 165: the request carries the signature drawn in the box, a PNG data URL under 300 KB.
      const sig = body && body.signature;
      if (typeof sig !== "string" || sig.indexOf("data:image/png;base64,") !== 0) {
        return { status: 400, json: { error: lang === "es" ? "Firme antes de enviar" : "Draw your signature before you sign", code: "forms.signatureRequired" } };
      }
      if (Math.floor((sig.split(",")[1] || "").length * 3 / 4) > 300 * 1024) {
        return { status: 413, json: { error: lang === "es" ? "La firma pesa demasiado" : "The signature is too large", code: "forms.signatureTooLarge" } };
      }
      filedState().signed[key] = Object.assign(stampNow(), { signature: { id: "sig-" + key } });
      return ok(reportPayload(r, lang));
    }
    if (/^\/api\/forms\/responses\/[^/]+\/supervisor$/.test(path) && method === "PATCH") {
      const r = anyReport(path.split("/")[4]);
      if (!r) return { status: 404, json: { error: "Report not found" } };
      const answers = body && body.answers;
      if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
        return { status: 400, json: { error: "Send answers as an object of key and value" } };
      }
      const payload = reportPayload(r, lang);
      if (!payload.canWriteSupervisor) return { status: 403, json: { error: "You cannot fill in the supervisor section" } };
      const byKey = {};
      payload.fields.forEach((f) => { byKey[f.key] = f; });
      const outside = Object.keys(answers).find((k) => !byKey[k] || byKey[k].half !== "supervisor");
      if (outside) return { status: 400, json: { error: "Only the supervisor section can be changed here" } };
      const stamp = Object.keys(answers).find((k) => byKey[k].type === "signoff");
      if (stamp) return { status: 400, json: { error: "A sign-off is made with its own button" } };
      // Step 169: a number question takes a number, or null, the way the API reads one.
      const notANumber = Object.keys(answers).filter((k) => byKey[k].type === "number" && answers[k] !== null && !(typeof answers[k] === "number" && Number.isFinite(answers[k])));
      if (notANumber.length) return { status: 400, json: { error: lang === "es" ? "Escriba un n\u00famero" : "Enter a number", code: "forms.badNumber", keys: notANumber } };
      Object.keys(answers).forEach((k) => { filedState().supervisor[k] = answers[k]; });
      return ok(reportPayload(r, lang));
    }
    // Step 165: the photo routes. The thumbnail and the full image are streamed; an upload takes
    // multipart photos and answers { key, photos }; a removal answers the same shape. An upload or a
    // removal is refused with a code on a question that is not a photos question, on one this person
    // may not write, with no photo in it, past maxPhotos, and for a photo that is not there.
    // Step 165: a stamp's signature, streamed as a PNG.
    if (/^\/api\/forms\/responses\/[^/]+\/signatures\/[^/]+$/.test(path) && method === "GET") return imageAnswer();
    if (/^\/api\/forms\/responses\/[^/]+\/photos\/[^/]+\/thumb$/.test(path) && method === "GET") return imageAnswer();
    if (/^\/api\/forms\/responses\/[^/]+\/photos\/[^/]+$/.test(path) && method === "GET") return imageAnswer();
    if (/^\/api\/forms\/responses\/[^/]+\/photos\/[^/]+(\/[^/]+)?$/.test(path) && (method === "POST" || method === "DELETE")) {
      const r = INCIDENT_REPORTS.find((x) => x.id === path.split("/")[4]);
      if (!r) return { status: 404, json: { error: "Report not found" } };
      const key = decodeURIComponent(path.split("/")[6] || "");
      const payload = reportPayload(r, lang);
      const f = payload.fields.find((x) => x.key === key);
      if (!f || f.type !== "photos") return photoRefusal("notAPhotosQuestion", lang);
      // Step 166: on a form started at a desk the photos are the filer's while it is a draft. The
      // API answers somebody else's draft as not found, and a supervisor half this person may not
      // write with the supervisor section's own refusal.
      const onDraft = deskDraft(r);
      if (onDraft && (r.status !== "draft" || String(r.userId || "") !== String(person().id))) return photoRefusal("reportNotFound", lang);
      if (!onDraft && (f.half !== "supervisor" || !payload.canWriteSupervisor)) return photoRefusal("cannotWriteSupervisor", lang);
      const held = () => (onDraft ? r.answers[key] : filedState().photos[key]) || [];
      const keep = (arr) => { if (onDraft) { if (arr.length) r.answers[key] = arr; else delete r.answers[key]; } else filedState().photos[key] = arr; return arr; };
      const have = held().slice();
      if (method === "DELETE") {
        const photoId = decodeURIComponent(path.split("/")[7] || "");
        if (!have.some((p) => p.id === photoId)) return photoRefusal("photoNotFound", lang);
        return ok({ key: key, photos: keep(have.filter((p) => p.id !== photoId)) });
      }
      const raw = String(body || "");
      const names = [];
      raw.replace(/name="photos"; filename="([^"]*)"/g, (m, n) => { names.push(n); return m; });
      if (names.length === 0) return photoRefusal("photoNoFile", lang);
      if (Number(f.maxPhotos) > 0 && have.length + names.length > Number(f.maxPhotos)) return photoRefusal("photoLimit", lang, { max: Number(f.maxPhotos) });
      names.forEach((name, i) => { photoSeq += 1; have.push({ id: "ph-" + photoSeq, name, bytes: 4096 * (i + 1), uploadedAt: seed.NOW_ISO }); });
      // An upload and a removal answer { key, photos }, the way routes/forms.js does, never { value }.
      return ok({ key: key, photos: keep(have) });
    }
    // Step 186: a report filed on a builder form, read in the payload's shape.
    if (/^\/api\/forms\/responses\/[^/]+$/.test(path) && method === "GET" && builderReport(idAfter("/api/forms/responses/"))) {
      return ok(builderPayload(builderReport(idAfter("/api/forms/responses/")), lang));
    }
    if (path.startsWith("/api/forms/responses/")) {
      const id = idAfter("/api/forms/responses/");
      const r = anyReport(id) || INCIDENT_REPORTS[0];
      if (method !== "GET") return ok({ message: "Report saved", draft: r });
      return ok(reportPayload(r, lang));
    }

    // --- customer links (Step 169) ------------------------------------------
    // The administrator's routes, manage_settings: an admin holds it and a supervisor does not.
    if (path === "/api/customer-links" || path.startsWith("/api/customer-links/")) {
      if (person().role !== "admin") return { status: 403, json: { error: lang === "es" ? "Permisos insuficientes" : "Insufficient permissions", code: "access.insufficientPermissions" } };
      const all = customerLinks();
      if (path === "/api/customer-links" && method === "GET") return ok({ links: newestFirst(all).map((l) => linkView(l, lang)) });
      if (path === "/api/customer-links" && method === "POST") {
        const formCode = String((body && body.formCode) || "").trim();
        const siteId = String((body && body.siteId) || "").trim();
        if (!isCustomerForm(formCode)) return linkRefusal("customer.formNotCustomer", 400, lang);
        if (!state.sites.some((x) => x.id === siteId)) return linkRefusal("customer.siteNotFound", 404, lang);
        const live = all.find((l) => l.siteId === siteId && l.formCode === formCode && linkState(l) === "live");
        if (live) return ok({ link: linkView(live, lang), created: false });
        linkSeq += 1;
        const made = { id: "cl-new-" + linkSeq, token: "n" + linkSeq + "Xq4Lm8vT2wR7pK5sB9yH3cJ6fD0gZaEu".slice(0, 31), formCode, siteId, uses: 0, lastUsedAt: null,
          createdAt: seed.NOW_ISO, createdBy: person().id, disabledAt: null, disabledBy: null, expired: false };
        all.push(made);
        return created({ link: linkView(made, lang), created: true });
      }
      const id = decodeURIComponent(path.split("/")[3] || "");
      const link = all.find((l) => l.id === id);
      if (!link) return linkRefusal("customer.linkNotFound", 404, lang);
      if (/\/disable$/.test(path) && method === "POST") {
        if (!link.disabledAt) { link.disabledAt = seed.NOW_ISO; link.disabledBy = person().id; }
        return ok({ link: linkView(link, lang) });
      }
      if (/\/enable$/.test(path) && method === "POST") {
        const other = all.find((l) => l.id !== link.id && l.siteId === link.siteId && l.formCode === link.formCode && linkState(l) === "live");
        if (other) return linkRefusal("customer.anotherLinkLive", 409, lang, { liveId: other.id });
        link.disabledAt = null; link.disabledBy = null; link.expired = false; link.lastUsedAt = seed.NOW_ISO;
        return ok({ link: linkView(link, lang) });
      }
      if (/\/qr\.png$/.test(path) && method === "GET") return imageAnswer();
      return linkRefusal("customer.linkNotFound", 404, lang);
    }

    // --- the form builder (Step 186) ----------------------------------------
    // Every route is a holder's of build_forms, and publish and retire are the admin role's whatever
    // the capabilities say, the way routes/formBuilder.js gates them. Each answer and refusal is in
    // the language the call names on its address, which is where the API reads it from first.
    if (path.startsWith("/api/form-builder/")) {
      const said = q("locale") === "es" || q("locale") === "en" ? q("locale") : lang;
      const me = person();
      if (!me.isSuperAdmin && !effectiveMap(me, state.overrides[me.id]).build_forms) return fbRefusal(403, "access.insufficientPermissions", said);
      const admin = me.role === "admin" || me.isSuperAdmin === true;
      const w = fbWorld();
      if (path === "/api/form-builder/forms" && method === "GET") return ok({ forms: fbList() });
      // With no code, a new form at the next code; with a published code, a draft of its next version
      // copied from the latest published one. One open draft per code: a second start answers the
      // open one with 200, where a new draft answers 201.
      if (path === "/api/form-builder/drafts" && method === "POST") {
        const code = body && body.code !== undefined && body.code !== null ? String(body.code).trim() : "";
        if (code && !fbLatest(code)) return fbRefusal(404, "builder.notFound", said);
        const useCode = code || fbNextCode();
        const open = fbOpenDraft(useCode);
        if (open) { const view = fbDraftView(open); return ok({ draft: view.draft, problems: view.problems, resumed: true }); }
        w.seq += 1;
        const row = { id: FB_ID + String(w.seq).padStart(2, "0"), code: useCode, version: fbLastNumber(useCode) + 1, status: "draft", source: "builder",
          definition: code ? clone(fbLatest(code).definition) : { title: { en: "", es: "" }, apps: [], fillers: [], readers: [], fields: [] },
          recipients: null, delivery: null, draftedBy: me.id, updatedAt: seed.NOW_ISO, script: [], conversation: [] };
        w.drafts.push(row);
        const view = fbDraftView(row);
        return created({ draft: view.draft, problems: view.problems, resumed: false });
      }
      const onDraft = /^\/api\/form-builder\/drafts\/([^/]+)(?:\/(message|pdf|publish|discard))?$/.exec(path);
      if (onDraft) {
        const part = onDraft[2] || "";
        if (part === "publish" && method === "POST" && !admin) return fbRefusal(403, "builder.adminOnly", said);
        const row = w.drafts.find((x) => x.id === decodeURIComponent(onDraft[1]));
        if (!row) return fbRefusal(404, "builder.notFound", said);
        // The draft, its problems, its preview in the language the call names, and its conversation.
        // Any row reads, so a discarded or published draft still opens by its id.
        if (!part && method === "GET") return ok(fbReadView(row, said));
        // The sample, helpers/formSample.js: the page in the language ?locale= names, English with none.
        if (part === "pdf" && method === "GET") {
          const name = row.code + (q("locale") === "es" ? "-sample-es.pdf" : "-sample.pdf");
          return { status: 200, pdf: true, headers: { "Content-Disposition": 'attachment; filename="' + name + '"', "Access-Control-Expose-Headers": "Content-Disposition" },
            json: "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n" };
        }
        if (row.status !== "draft") return fbRefusal(409, "builder.notADraft", said, null, { status: row.status });
        // Who gets the filled report, set by a screen: the whole list or null, app_link or pdf or null,
        // checked before anything is written and answered in the read's shape.
        if (!part && method === "PATCH") {
          const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};
          const hasList = Object.prototype.hasOwnProperty.call(b, "recipients");
          const hasDelivery = Object.prototype.hasOwnProperty.call(b, "delivery");
          if (!hasList && !hasDelivery) return fbRefusal(400, "builder.nothingToChange", said);
          if (hasList && b.recipients !== null && !Array.isArray(b.recipients)) return fbRefusal(400, "builder.recipientsShape", said);
          if (hasDelivery && b.delivery !== null && b.delivery !== "app_link" && b.delivery !== "pdf") return fbRefusal(400, "builder.badDelivery", said);
          if (hasList && b.recipients !== null) {
            const checked = fbRecipients(Object.assign({}, row, { recipients: b.recipients }));
            if (checked.problems.length) return fbRefusal(400, "builder.recipientUnknown", said, { who: checked.bad[0].who }, { problems: checked.problems });
          }
          if (hasList) row.recipients = b.recipients === null ? null : fbNormalize(b.recipients);
          if (hasDelivery) row.delivery = b.delivery;
          row.updatedAt = seed.NOW_ISO;
          return ok(fbReadView(row, said));
        }
        // One turn: the reply in the language the call names, the definition the script holds next,
        // cleaned and checked, and both words stored with the draft.
        if (part === "message" && method === "POST") {
          const text = body && typeof body.text === "string" ? body.text.trim() : "";
          if (!text) return fbRefusal(400, "builder.textRequired", said);
          if (text.length > 4000) return fbRefusal(400, "builder.textTooLong", said, { max: 4000 });
          const next = row.script.shift();
          if (next) row.definition = clone(next.definition);
          const reply = (next ? next.reply : FB_KEPT_REPLY)[said === "es" ? "es" : "en"];
          row.conversation.push({ role: "user", text, at: seed.NOW_ISO }, { role: "assistant", text: reply, at: seed.NOW_ISO });
          row.updatedAt = seed.NOW_ISO;
          const view = fbDraftView(row);
          return ok({ reply, draft: view.draft, problems: view.problems, preview: fbPreview(view.draft.definition, said), flags: [] });
        }
        // Admin only, a change note of 500 at most, and no problems: the draft becomes the next
        // published version, and its delivery the form's.
        if (part === "publish" && method === "POST") {
          const note = body && typeof body.changeNote === "string" ? body.changeNote.trim() : "";
          if (!note) return fbRefusal(400, "builder.changeNoteRequired", said);
          if (note.length > 500) return fbRefusal(400, "builder.changeNoteTooLong", said, { max: 500 });
          const view = fbDraftView(row);
          if (view.problems.length) return fbRefusal(422, "builder.hasProblems", said, null, { problems: view.problems });
          const version = fbLastNumber(row.code) + 1;
          const def = fbDefinition(row);
          def.version = String(version);
          w.store[row.code] = (w.store[row.code] || []).concat([{ version, status: "published", source: "builder", definition: def, publishedAt: seed.NOW_ISO, publishedBy: me.id, changeNote: note }]);
          row.status = "published";
          row.version = version;
          if (row.delivery === "pdf" || row.delivery === "app_link") state.formDelivery[row.code] = row.delivery;
          return ok({ form: fbListRow(row.code) });
        }
        if (part === "discard" && method === "POST") {
          row.status = "discarded";
          return ok({ id: row.id, code: row.code, status: "discarded" });
        }
      }
      // Admin only, a published form and a reason of 500 at most: every published version is retired.
      const retiring = /^\/api\/form-builder\/forms\/([^/]+)\/retire$/.exec(path);
      if (retiring && method === "POST") {
        if (!admin) return fbRefusal(403, "builder.adminOnly", said);
        const code = decodeURIComponent(retiring[1]);
        if (!fbLatest(code)) return fbRefusal(404, "builder.notFound", said);
        const reason = body && typeof body.reason === "string" ? body.reason.trim() : "";
        if (!reason) return fbRefusal(400, "builder.retireReasonRequired", said);
        if (reason.length > 500) return fbRefusal(400, "builder.retireReasonTooLong", said, { max: 500 });
        w.store[code].forEach((x) => { if (x.status === "published") { x.status = "retired"; x.retiredAt = seed.NOW_ISO; x.retireReason = reason; } });
        return ok({ form: fbListRow(code) });
      }
    }

    // --- settings sub-panels ---------------------------------------------
    if (path === "/api/lookups/categories" && method === "GET") return ok(lookupsIn(lang));
    if (path === "/api/lookups/categories" && method === "POST") return created({ message: "Category added" });
    // A list, a value and a site's value removed since Step 179: each is set is_active false and kept,
    // and a list of the system's own is refused (routes/lookups.js).
    if (/^\/api\/lookups\/categories\/[^/]+$/.test(path) && method === "DELETE") {
      const c = LOOKUPS.find((x) => x.id === path.split("/")[4]);
      if (!c) return refuse("lookups.categoryNotFound", lang);
      if (systemList(c)) return refuse("lookups.systemCategory", lang);
      lookupOff.lists[c.id] = true;
      return ok({ message: "Category deleted" });
    }
    if (/^\/api\/lookups\/categories\/[^/]+/.test(path)) return ok({ message: "Category saved" });
    if (path === "/api/lookups/values" && method === "POST") return created({ message: "Option added" });
    if (/^\/api\/lookups\/values\/[^/]+$/.test(path) && method === "DELETE") {
      const id = path.split("/")[4];
      if (!LOOKUPS.some((c) => c.values.some((v) => v.id === id)) || lookupOff.values[id]) return refuse("lookups.valueNotFound", lang);
      lookupOff.values[id] = true;
      return ok({ message: "Value deleted" });
    }
    if (/^\/api\/lookups\/site\/[^/]+\/[^/]+$/.test(path) && method === "DELETE") {
      const lists = siteLookupRows();
      const row = [].concat(lists.zones, lists.buildings, lists.floors).find((x) => x.id === path.split("/")[5] && x.is_active);
      if (!row) return refuse("lookups.siteValueNotFound", lang);
      row.is_active = false;
      return ok({ message: "Site lookup deleted" });
    }
    // Step 183: PATCH /api/lookups/values/:id/translations { locale, field, text }, a manager's own
    // wording for a choice, stored with source person the way routes/lookups.js stores it.
    if (/^\/api\/lookups\/values\/[^/]+\/translations$/.test(path) && method === "PATCH") {
      const b = body || {};
      const id = path.split("/")[4];
      const text = typeof b.text === "string" ? b.text.trim() : "";
      if (b.locale !== "es" || b.field !== "label" || !text) return { status: 400, json: { error: "A correction names es, label and the wording", code: "translations.fieldInvalid" } };
      corrections[id] = Object.assign({}, corrections[id] || {}, { label: text });
      return ok({ message: lang === "es" ? "Traducci\u00f3n guardada" : "Translation saved", code: "translations.saved", value: { id: id, displayLabel: text },
        translation: { locale: "es", field: "label", text: text, source: "person" } });
    }
    if (/^\/api\/lookups\/values\/[^/]+/.test(path)) return ok({ message: "Option saved" });
    if (path === "/api/lookups/reorder") return ok({ message: "Order saved" });
    if (/^\/api\/lookups\/site\/[^/]+\/all$/.test(path)) {
      const lists = siteLookupRows();
      const choices = {};
      Object.keys(lists).forEach((k) => { choices[k] = withChoiceWords(lists[k], lang); });
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
    // The private chats, for an admin or a supervisor, managementOnly's rule, each with its unread count.
    if (path === "/api/chat/dm-inbox" && method === "GET") {
      if (!manages(person())) return refuse179(403, "access.insufficientPermissions", lang);
      return ok(DM_INBOX.map((dm) => Object.assign({}, dm, { unreadCount: chatUnreadOf(dm.channelId) })));
    }
    // Step 179, GET /api/chat/channels as routes/chat.js answers it: the general chat and each active
    // site's chat by name; for an admin or a supervisor every other person's private chat, newest
    // first; then the caller's own private chat, which the API writes for everyone except an admin.
    // Each with unreadCount.
    if (path === "/api/chat/channels" && method === "GET") {
      const me = person();
      const out = CHAT_CHANNELS.filter((c) => c.type === "general" || activeSite(c.siteId)).slice().sort((a, b) => (a.name < b.name ? -1 : 1))
        .map((c) => Object.assign({}, c, { unreadCount: chatUnreadOf(c.id) }));
      if (manages(me)) {
        DM_INBOX.filter((dm) => dm.staffUserId !== me.id).slice().sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1)).forEach((dm) => out.push({
          id: dm.channelId, type: "admin_dm", name: dm.staffName, staffUserId: dm.staffUserId, unreadCount: chatUnreadOf(dm.channelId), lastMessage: dm.lastMessage, lastMessageAt: dm.lastMessageAt }));
      }
      if (me.role !== "admin") out.push({ id: ownChatId(me), type: "admin_dm", name: "Admin (Private)", unreadCount: chatUnreadOf(ownChatId(me)), lastMessageAt: null });
      return ok(out);
    }
    // POST /api/chat/channels/:id/read: the chat is read up to now for the caller, and the caller's chat
    // notice for it is marked read. A tag notice stays.
    if (/^\/api\/chat\/channels\/[^/]+\/read$/.test(path) && method === "POST") {
      const found = chatFor(path, lang);
      if (found.refusal) return found.refusal;
      state.chatUnread[found.ch.id] = 0;
      (state.notifications || []).forEach((n) => { if (n.subjectType === "chat" && n.subjectId === found.ch.id && !n.readAt) n.readAt = seed.NOW_ISO; });
      return ok({ ok: true });
    }
    // GET /api/chat/channels/:id/members: whom a message here may tag, the caller left out.
    if (/^\/api\/chat\/channels\/[^/]+\/members$/.test(path) && method === "GET") {
      const found = chatFor(path, lang);
      if (found.refusal) return found.refusal;
      return ok({ members: chatMembers(found.ch).filter((p) => p.id !== person().id).map((p) => ({ id: p.id, name: fullName(p), role: p.role })) });
    }
    // GET /api/chat/channels/:id/messages, oldest first, which moves the caller's read receipt to now
    // the way the API's read of a chat does.
    if (/^\/api\/chat\/channels\/[^/]+\/messages$/.test(path) && method === "GET") {
      const found = chatFor(path, lang);
      if (found.refusal) return found.refusal;
      state.chatUnread[found.ch.id] = 0;
      return ok((CHAT_THREADS[found.ch.id] || []).concat(state.chatSent[found.ch.id] || []).map(chatMessage));
    }
    // POST /api/chat/channels/:id/messages { text, mentions? }: the text as typed, and the ids it tags,
    // each an active person who can read the chat other than the sender, ten at most, a repeat counted
    // once. The answer names each person tagged, by name.
    if (/^\/api\/chat\/channels\/[^/]+\/messages$/.test(path) && method === "POST") {
      const b = body || {};
      if (typeof b.text !== "string" || !b.text.trim()) return refuse179(400, "chat.textRequired", lang);
      if (b.text.trim().length > 2000) return refuse179(400, "chat.textTooLong", lang, { max: 2000 });
      const found = chatFor(path, lang);
      if (found.refusal) return found.refusal;
      const me = person();
      const raw = b.mentions == null ? [] : b.mentions;
      if (!Array.isArray(raw)) return refuse179(400, "chat.mentionNotMember", lang, null, { keys: [] });
      const ids = [];
      raw.forEach((v) => { const id = String(v == null ? "" : v); if (ids.indexOf(id) < 0) ids.push(id); });
      if (ids.length > 10) return refuse179(400, "chat.tooManyMentions", lang, { max: 10 });
      const inChat = chatMembers(found.ch).map((p) => p.id);
      const outside = ids.filter((id) => id === me.id || inChat.indexOf(id) < 0);
      if (outside.length) return refuse179(400, "chat.mentionNotMember", lang, null, { keys: outside });
      chatSeq += 1;
      const message = { id: "cm-sent-" + chatSeq, senderId: me.id, senderName: me.firstName + " " + me.lastName, senderRole: me.role, text: b.text.trim(), sentAt: seed.NOW_ISO,
        mentions: state.staff.filter((p) => ids.indexOf(p.id) >= 0).sort(byName).map((p) => ({ id: p.id, name: fullName(p) })) };
      state.chatSent[found.ch.id] = (state.chatSent[found.ch.id] || []).concat([message]);
      return created({ message });
    }
    // Step 179, routes/announcements.js, for a holder of send_announcements. Named routes first.
    if (path.startsWith("/api/announcements")) {
      const me = person();
      const one = /^\/api\/announcements\/([^/]+)$/.exec(path);
      if (one && one[1] !== "preview" && method === "GET") {
        const row = announcementList().find((a) => a.id === decodeURIComponent(one[1]));
        const received = (state.notifications || []).some((n) => n.subjectType === "announcement" && row && n.subjectId === row.id);
        if (!row || (!holds(me, "send_announcements") && !received)) return refuse179(404, "announcements.notFound", lang);
        return ok({ announcement: row });
      }
      if (!holds(me, "send_announcements")) return refuse179(403, "access.insufficientPermissions", lang);
      // GET /api/announcements/preview?type=&siteId=&role=&userIds=a,b: how many people the audience
      // reaches and how many of them have a phone on.
      if (path === "/api/announcements/preview" && method === "GET") {
        const read = audienceOf({ type: q("type"), siteId: q("siteId"), role: q("role"), userIds: q("userIds") }, lang);
        if (read.refusal) return read.refusal;
        return ok({ recipients: read.people.length, withPush: withPushOf(read.people) });
      }
      // GET /api/announcements: the last hundred, newest first.
      if (path === "/api/announcements" && method === "GET") {
        return ok({ announcements: announcementList().slice().sort((a, b) => (a.sentAt === b.sentAt ? (a.id < b.id ? 1 : -1) : a.sentAt < b.sentAt ? 1 : -1)).slice(0, 100) });
      }
      // POST /api/announcements { title, body, audience, locale? }. The API writes the other language
      // with its translator; the stub has none, so both languages carry the text as written, which is
      // what the API stores when a translation fails.
      if (path === "/api/announcements" && method === "POST") {
        const b = body || {};
        const title = typeof b.title === "string" ? b.title.replace(/\s+/g, " ").trim() : "";
        const text = typeof b.body === "string" ? b.body.trim() : "";
        if (!title) return refuse179(400, "announcements.titleRequired", lang);
        if (!text) return refuse179(400, "announcements.bodyRequired", lang);
        if (title.length > 60) return refuse179(400, "announcements.titleTooLong", lang, { max: 60 });
        if (text.length > 500) return refuse179(400, "announcements.bodyTooLong", lang, { max: 500 });
        const read = audienceOf(b.audience, lang);
        if (read.refusal) return read.refusal;
        if (!read.people.length) return refuse179(400, "announcements.audienceEmpty", lang);
        annSeq += 1;
        const row = { id: "an-new-" + annSeq, title: { en: title, es: title }, body: { en: text, es: text }, audience: read.audience,
          sentBy: { id: me.id, name: me.firstName + " " + me.lastName }, sentAt: seed.NOW_ISO, recipients: read.people.length, withPush: withPushOf(read.people), translated: false };
        announcementList().push(row);
        return created({ announcement: row });
      }
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
    // Step 183: GET /api/help-insights/summary, /misses, /people and /people/:id, for a holder of
    // view_help_insights, each answered in the language the address names, as routes/helpInsights.js
    // answers them.
    if (path.startsWith("/api/help-insights/") && method === "GET") {
      const me = person();
      const map = effectiveMap(me, state.overrides[me.id]);
      if (!me.isSuperAdmin && !map.view_help_insights) return { status: 403, json: { error: lang === "es" ? "No tiene permiso para hacer esto" : "Insufficient permissions", code: "access.insufficientPermissions" } };
      const w = helpWindow(q);
      const said = q("locale") === "es" || q("locale") === "en" ? q("locale") : lang;
      const rows = helpRowsIn(w).slice().sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
      if (path === "/api/help-insights/summary") {
        const questions = rows.length;
        const misses = rows.filter(helpIsMiss).length;
        const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
        const median = ms.length === 0 ? null : ms.length % 2 ? ms[(ms.length - 1) / 2] : (ms[ms.length / 2 - 1] + ms[ms.length / 2]) / 2;
        const days = {};
        rows.forEach((r) => { const k = helpDay(r.at); days[k] = days[k] || { day: k, questions: 0, misses: 0 }; days[k].questions += 1; if (helpIsMiss(r)) days[k].misses += 1; });
        const order = (m) => Object.keys(m).sort((a, b) => m[b] - m[a] || (a < b ? -1 : 1));
        const byLocale = helpCount(rows, "locale");
        const byApp = helpCount(rows, "app");
        const bySite = helpCount(rows, "site");
        const topics = {};
        rows.forEach((r) => r.cited.forEach((c) => { topics[c] = (topics[c] || 0) + 1; }));
        return ok({
          from: w.from, to: w.to, questions, people: new Set(rows.map((r) => r.person)).size, answered: questions - misses, misses,
          missRate: questions > 0 ? Math.round((misses / questions) * 1000) / 1000 : 0,
          helpfulYes: rows.filter((r) => r.helpful === true).length, helpfulNo: rows.filter((r) => r.helpful === false).length,
          medianReplyMs: median === null ? null : Math.round(median),
          byDay: Object.keys(days).sort().map((k) => days[k]),
          byLanguage: order(byLocale).map((k) => ({ locale: k, questions: byLocale[k] })),
          byApp: order(byApp).map((k) => ({ app: k, questions: byApp[k] })),
          bySite: Object.keys(bySite).sort((a, b) => bySite[b] - bySite[a] || String(helpSiteName(a)).localeCompare(String(helpSiteName(b))))
            .map((k) => ({ siteId: k, siteName: helpSiteName(k), questions: bySite[k], misses: rows.filter((r) => r.site === k && helpIsMiss(r)).length })),
          topTopics: order(topics).map((k) => ({ code: k, name: helpDocName(k, said), sectionRef: HELP_DOCS[k].ref, sectionTitle: HELP_DOCS[k].title, count: topics[k] })),
        });
      }
      if (path === "/api/help-insights/misses") {
        return ok({ from: w.from, to: w.to, misses: rows.filter((r) => helpIsMiss(r) || r.helpful === false).map((r) => ({
          messageId: r.id, askedAt: r.at, question: r.question, locale: r.locale, app: r.app, kind: helpIsMiss(r) ? r.kind : "notHelpful",
          person: { id: r.person, name: helpPerson(r.person).name, role: r.role }, site: { id: r.site, name: helpSiteName(r.site) }, feedbackNote: r.note,
        })) });
      }
      if (path === "/api/help-insights/people") {
        const ids = Array.from(new Set(rows.map((r) => r.person)));
        const people = ids.map((id) => {
          const mine = rows.filter((r) => r.person === id);
          const cited = {};
          mine.forEach((r) => r.cited.forEach((c) => { cited[c] = (cited[c] || 0) + 1; }));
          return { id, name: helpPerson(id).name, role: helpPerson(id).role, questions: mine.length, misses: mine.filter(helpIsMiss).length,
            helpfulNo: mine.filter((r) => r.helpful === false).length, lastAskedAt: mine[0].at,
            topTopics: Object.keys(cited).sort((a, b) => cited[b] - cited[a] || (a < b ? -1 : 1)).slice(0, 3).map((c) => ({ code: c, name: helpDocName(c, said), count: cited[c] })) };
        }).sort((a, b) => b.questions - a.questions || (a.lastAskedAt < b.lastAskedAt ? 1 : -1));
        return ok({ from: w.from, to: w.to, people });
      }
      const id = decodeURIComponent(path.split("/")[4] || "");
      const who = state.staff.find((x) => x.id === id);
      if (!who) return { status: 404, json: { error: lang === "es" ? "No se encontr\u00f3 a la persona" : "Person not found", code: "insights.personNotFound" } };
      return ok({ from: w.from, to: w.to, person: { id: who.id, name: who.name, role: who.role }, turns: rows.filter((r) => r.person === id).map((r) => ({
        messageId: r.id, askedAt: r.at, question: r.question, answer: r.answer, kind: r.kind, locale: r.locale, app: r.app,
        citedNames: r.cited.map((c) => ({ code: c, name: helpDocName(c, said) })),
        feedback: r.helpful === null ? null : { helpful: r.helpful, note: r.note, at: r.at },
      })) });
    }
    // Step 183: POST /api/agent/messages/:id/feedback, a rating of one answer, the way routes/agent.js
    // takes it: helpful is a boolean, a note is 500 characters at most, and the answer's rating is what
    // it answers.
    if (/^\/api\/agent\/messages\/[^/]+\/feedback$/.test(path) && method === "POST") {
      const b = body || {};
      if (typeof b.helpful !== "boolean") return { status: 400, json: { error: lang === "es" ? "Diga si la respuesta le sirvi\u00f3." : "Say whether the answer helped.", code: "help.feedbackInvalid" } };
      const note = b.note === undefined || b.note === null ? null : String(b.note).trim() || null;
      if (note && note.length > 500) return { status: 400, json: { error: lang === "es" ? "Escriba la nota en 500 caracteres o menos." : "Keep the note to 500 characters or fewer.", code: "help.noteTooLong" } };
      const id = decodeURIComponent(path.split("/")[4] || "");
      agentFeedback[id] = { helpful: b.helpful, note: note, at: seed.NOW_ISO };
      return ok({ ok: true, feedback: agentFeedback[id] });
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
    // The language on the address is read on its own, below, and taken off the query a case reads,
    // so a route is still held to exactly what it has always asked for.
    const asked = u.searchParams.getAll("locale");
    const rest = new URLSearchParams(u.search);
    rest.delete("locale");
    const query = rest.toString() ? "?" + rest.toString() : "";
    const record = { method, path, query, body: body || null };
    calls.push(record);
    // The language the call asked for, kept beside it. Every call says the language the screen is
    // drawn in; one that says nothing, or another language, is also kept apart, where a reset
    // between cases cannot clear it, and the run fails on it at the end.
    record.language = (headers && headers["accept-language"]) || null;
    // What the call was sent with, so a case can hold a route to the headers it has always sent.
    record.headers = headers || {};
    if (method === "GET" && /^\/api\/sites\/[^/]+\/tasks$/.test(path)) checklistReads.push({ path, query, as: signedInAs });
    language.calls += 1;
    if (lang && record.language !== lang) language.misses.push({ method, path, said: record.language, want: lang });
    // A signed-in call names its language once on the address, as locale=en or locale=es, the way
    // the API reads it ahead of the language on the person's account. One that names none, two, or
    // a language the dashboard does not speak is kept apart the same way, and turned away, so a call
    // added later without it fails the run by name.
    record.locale = asked.length === 1 ? asked[0] : null;
    const signedIn = !!(headers && headers.authorization);
    if (signedIn && (asked.length !== 1 || LOCALES.indexOf(asked[0]) < 0)) {
      language.unnamed.push({ method, path, said: asked.length ? asked.join(", ") : null });
      record.status = 400;
      return { status: 400, json: { error: "A signed-in call names its language once, as locale=en or locale=es" } };
    }

    const refusal = matchRefusal(method, path, body);
    if (refusal) {
      record.refused = refusal.status;
      record.status = refusal.status;
      return { status: refusal.status, json: Object.assign({ error: refusal.error, code: refusal.code }, refusal.body || {}) };
    }

    const answer = step247
      ? step247Route(method, path, u.searchParams, body, record.language, () => route(method, path, u.searchParams, body, record.language))
      : route(method, path, u.searchParams, body, record.language);
    if (answer) {
      // The status the call was answered with, refusals the routes make on their own included.
      record.status = answer.status;
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
    checklistReads: () => checklistReads,
    setRefusal: (r) => { refusals = [].concat(r); },
    clearRefusals: () => { refusals = []; },
    setDelay: (path, ms) => { delays.push({ path, ms }); },
    // The next answer Help is given, whichever of its two routes the page asks.
    setAgentStream: (s) => { agentStream = s || null; },
    // A shift open at a site for the person signed in as persona, or none with null.
    setOpenSession: (persona, session) => { if (session) openSessions[persona] = session; else delete openSessions[persona]; },
    setExposeDisposition: (v) => { exposeDisposition = v !== false; },
    clearDelays: () => { delays = []; },
    setTrim: (t) => { trim = t; },
    setListGap: (g) => { listGap = g || null; },
    setShiftSessions: (s) => { shiftSessions = s || null; },
    // The entries a person's timeline answers: the rows given, or the seed's four again with null.
    setTimeline: (rows) => { personTimeline = rows ? clone(rows) : null; },
    // The issues the API answers: the rows given, or the seed's rows again with null.
    setIssues: (rows) => { state.issues = rows ? rows : clone(seed.ISSUES); },
    // What the daily service log's payload carries beyond what the suite has always read.
    setFiledFormExtras: (x) => { filedExtras = Object.assign({ rows: false, sections: false }, x || {}); },
    // Whether the API lists a form this person may start. Off, every form's fillers are empty.
    setStartable: (v) => { startable = v !== false; },
    // The seed's filings with the source the API stores since Step 175, and the admin's own complaint
    // log filed from the dashboard, or neither with false.
    setFiledSources: (v) => {
      filedSources = v !== false;
      const at = INCIDENT_REPORTS.findIndex((x) => x.id === ADMIN_FILING_ID);
      if (at >= 0) INCIDENT_REPORTS.splice(at, 1);
      if (filedSources) INCIDENT_REPORTS.push(adminFiling());
    },
    // A form made with the builder, published: its latest version is the one every app offers, and
    // the reports filed on it are read. Step 186.
    publishForm: (code) => { if (BUILDER_FORMS[code] && state.published.indexOf(code) < 0) state.published.push(code); },
    signedInAs: () => signedInAs,
    setSignedInAs: (k) => { signedInAs = k; },
    // The routes and keys of the API's Step 247, on or off.
    setStep247: (v) => { step247 = v !== false; },
    reset: () => {
      calls.length = 0;
      refusals = [];
      state.staff = staffRows();
      state.sites = clone(seed.SITES);
      state.issues = clone(seed.ISSUES);
      state.supplies = null; state.supplyRequests = null; state.pickups = null;
      state.schedule = null; state.patterns = null; state.timeOff = null;
      state.overrides = seededOverrides(); state.notifications = null; state.settings = null;
      state.training = null;
      state.templates = null; corrections = {};
      // Every row a removal marked since Step 179, put back as it was.
      state.floorPlans = null; state.siteSupplies = null; state.inspections = null; state.templateItems = null;
      state.reportDefs = null; state.aliases = null; state.documents = null; state.onboarding = null;
      state.lookupValues = null; lookupOff = { lists: {}, values: {} };
      state.formDelivery = {};
      state.filedForms = { signed: {}, supervisor: {}, photos: {} };
      photoSeq = 10;
      // The customer links, made new, and the count the ones made in a case were numbered by.
      state.customerLinks = null; linkSeq = 0;
      // The form builder's forms and drafts, as the fixtures above hold them.
      state.formBuilder = null;
      // The forms started at a desk since the last reset, and the switch that lets one be started.
      for (let i = INCIDENT_REPORTS.length - 1; i >= 0; i -= 1) { if (deskDraft(INCIDENT_REPORTS[i])) INCIDENT_REPORTS.splice(i, 1); }
      deskSeq = 0; customerSigSeq = 0; startable = true;
      // Every void made in a case, and the seed's sources with the admin's own filing, which the loop
      // above has taken away.
      state.voided = {}; filedSources = false;
      // No builder form published, and the reports filed on them as they were.
      state.published = []; state.builderReports = null; builderSeq = 0;
      newUserSeq = 0;
      filedExtras = { rows: false, sections: false };
      delays = []; trim = null; listGap = null; exposeDisposition = true; shiftSessions = null; personTimeline = null;
      agentStream = null; agentTalk = {}; agentPending = {}; agentFeedback = {};
      openSessions = {};
      // Step 179: no chat unread and nothing sent, the announcements as seeded, the alert settings on
      // their defaults.
      state.chatUnread = {}; state.chatSent = {}; chatSeq = 0;
      state.announcements = null; annSeq = 0;
      state.alertSettings = {};
      // Step 247 off, and its holidays, its person and its concern as they started.
      step247 = false; officeHolidays = OFFICE_HOLIDAYS(); holidaySeq = 2; leftRehired = false; concernAck = null;
    },
    fixtures: {
      LOOKUPS, SUPPLIES, SUPPLY_REQUESTS, VENDORS, SERVICES, PICKUPS, PICKUP_ANALYTICS,
      SCHEDULE, PATTERNS, TIME_OFF, NOTIFICATIONS, UNREAD_COUNT, CAPABILITIES, REPORT_DEFS,
      NOTIFICATION_TYPES, NOTIFICATION_FORMS, AGENT_DRAFTS, AGENT_CONVERSATIONS, CHECKLIST,
      INSPECTION_TEMPLATES, INSPECTION_ITEMS, SCHEDULED_INSPECTIONS, HR_CASES, CASE_QUEUE,
      HR_DOCUMENTS, HR_TRAINING, HR_ONBOARDING, HR_COMPLIANCE, SETTINGS, JOTFORM_FORMS, JOTFORM_SUBMISSIONS, PDF_ACCESS_LOG,
      INCIDENT_REPORTS, NOTIFICATION_RECIPIENTS, CHAT_CHANNELS, CHAT_MESSAGES, DM_INBOX, SHIFT_SESSIONS,
      ASSIGNED_TASKS,
    },
    state,
  };
}

module.exports = { createStubs };
