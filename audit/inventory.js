// The declared spine: every page, view, window, table, report, export and decision the suite drives.
//
// This file is checked against src/App.js at run time by audit/discover.js. A page id in PAGE_IDS
// with no entry here, or a <Mdl line no window entry claims, prints NO CASE and fails the run. The
// window entries carry the source line so the claim is exact rather than by name.
"use strict";

// ---------------------------------------------------------------------------
// Pages. `gated` is the page the render switch hides behind isAdmin.
// ---------------------------------------------------------------------------
const PAGES = [
  { id: "overview", label: "Dashboard", expect: "Welcome back", gated: false },
  { id: "operations", label: "Live Operations", expect: "Live Operations", gated: false },
  { id: "sites", label: "Sites", expect: "Sites", gated: false },
  { id: "staff", label: "Staff Management", expect: "Staff Management", gated: true },
  { id: "hr", label: "HR Records", expect: "Employees", gated: false },
  { id: "cases", label: "Cases", expect: "Cases", gated: true },
  { id: "issues", label: "Issue Tracker", expect: "Issue", gated: false },
  { id: "assigned", label: "Assigned Tasks", expect: "Assigned Tasks", gated: false },
  { id: "inspections", label: "Inspections", expect: "Templates", gated: false },
  { id: "supplies", label: "Supplies & Inventory", expect: "Inventory", gated: false },
  { id: "vendors", label: "Vendor Registry", expect: "Vendor", gated: false },
  { id: "services", label: "Service Catalog", expect: "Service Catalog", gated: false },
  { id: "schedule", label: "Schedule", expect: "Week", gated: false },
  { id: "marketplace", label: "Shift Pickup", expect: "Shift Pickup Board", gated: false },
  { id: "reports", label: "Reports", expect: "Reports", gated: false },
  { id: "forms", label: "Forms", expect: "Form Library", gated: true },
  { id: "settings", label: "Settings", expect: "Company", gated: true },
  { id: "chat", label: "Messages", expect: "Private conversations", gated: false },
  { id: "help", label: "Help", expect: "Help", gated: false },
];

// ---------------------------------------------------------------------------
// Views inside a page: every tab, and every sub-screen a page swaps in.
// `click` is the control that opens it. `expect` is text only that view shows.
// ---------------------------------------------------------------------------
const VIEWS = [
  { id: "schedule/week", page: "schedule", click: "Week", expect: "Week" },
  { id: "schedule/month", page: "schedule", click: "Month", expect: "Month" },
  { id: "schedule/patterns", page: "schedule", click: "Patterns", expect: "Upcoming" },
  { id: "schedule/timeoff", page: "schedule", click: "Time off", expect: "Requested" },

  { id: "supplies/inventory", page: "supplies", click: "Inventory", expect: "Inventory" },
  { id: "supplies/requests", page: "supplies", click: "Requests", expect: "pending" },

  { id: "reports/library", page: "reports", click: null, expect: "Quick snapshots" },
  { id: "reports/run", page: "reports", click: "Run", expect: "Back to reports" },
  { id: "reports/edit", page: "reports", click: "New report", expect: "Cancel" },

  { id: "marketplace/open", page: "marketplace", click: "Open", expect: "Shift Pickup Board" },
  { id: "marketplace/requested", page: "marketplace", click: "Requests", expect: "Shift Pickup Board" },
  { id: "marketplace/claimed", page: "marketplace", click: "Claimed", expect: "Shift Pickup Board" },
  { id: "marketplace/filled", page: "marketplace", click: "Approved", expect: "Shift Pickup Board" },
  { id: "marketplace/all", page: "marketplace", click: "All", expect: "Shift Pickup Board" },
  { id: "marketplace/analytics", page: "marketplace", click: "Analytics", expect: "Fill Rate" },

  { id: "inspections/templates", page: "inspections", click: "Templates", expect: "Monthly quality walk" },
  { id: "inspections/scheduled", page: "inspections", click: "Scheduled", expect: "Scheduled" },
  { id: "inspections/completed", page: "inspections", click: "Completed", expect: "Inspection" },
  { id: "inspections/reports", page: "inspections", click: "Reports", expect: "score" },

  { id: "settings/company", page: "settings", click: "Company", expect: "Save Company Settings" },
  { id: "settings/global", page: "settings", click: "Dropdown Options", expect: "categor" },
  { id: "settings/site", page: "settings", click: "Site Lookups", expect: "site" },
  { id: "settings/permissions", page: "settings", click: "Roles and Permissions", expect: "Per-person permissions" },
  { id: "settings/permissions-matrix", page: "settings", click: ["Roles and Permissions", "Role reference"], expect: "Access each role has in the platform today" },
  { id: "settings/recipients", page: "settings", click: "Who gets told", expect: "told" },

  { id: "forms/library", page: "forms", click: "Form Library", expect: "Incident report" },
  { id: "forms/submissions", page: "forms", click: "Submissions", expect: "Sync All Submissions" },
  { id: "forms/pdf_access", page: "forms", click: "PDF Access Log", expect: "access" },
  { id: "forms/settings", page: "forms", click: "Settings", expect: "Jotform" },
  { id: "forms/sync_diagnostic", page: "forms", click: "Sync Diagnostic", expect: "Diagnostic" },
  { id: "forms/aliases", page: "forms", click: "Aliases", expect: "Alias" },
  { id: "forms/incident_reports", page: "forms", click: "Incident reports", expect: "report" },

  { id: "hr/employees", page: "hr", click: "Employees", expect: "Employees" },
  { id: "hr/documents", page: "hr", click: "Documents", expect: "Document" },
  { id: "hr/training", page: "hr", click: "Training", expect: "Training" },
  { id: "hr/onboarding", page: "hr", click: "Onboarding", expect: "Onboarding" },
  { id: "hr/compliance", page: "hr", click: "Compliance", expect: "Expired Documents" },
  { id: "hr/other", page: "hr", click: "Other", expect: "Other" },

  { id: "staff/list", page: "staff", click: null, expect: "Staff Management" },
  { id: "staff/profile/info", page: "staff", openRow: 0, click: "Profile", expect: "Profile" },
  { id: "staff/profile/hr", page: "staff", openRow: 0, click: "HR Files", expect: "HR Files" },
  { id: "staff/profile/assign", page: "staff", openRow: 0, click: "Assignments", expect: "Assignments" },
  { id: "staff/profile/certs", page: "staff", openRow: 0, click: "Certifications", expect: "Certifications" },
  { id: "staff/profile/timeline", page: "staff", openRow: 0, click: "Timeline", expect: "Timeline" },

  { id: "sites/list", page: "sites", click: null, expect: "Sites" },
  { id: "sites/profile/general", page: "sites", openRow: 0, click: "General Info", expect: "General Info" },
  { id: "sites/profile/tasks", page: "sites", openRow: 0, click: "Service Details", expect: "Service Details" },
  { id: "sites/profile/shifts", page: "sites", openRow: 0, click: "Shifts & Schedule", expect: "Shifts" },
  { id: "sites/profile/supplies", page: "sites", openRow: 0, click: "Supplies", expect: "Supplies" },
  { id: "sites/profile/scope", page: "sites", openRow: 0, click: "Scope of Work", expect: "Scope" },
  { id: "sites/profile/chat", page: "sites", openRow: 0, click: "Chat", expect: "Chat" },
  { id: "sites/profile/timeline", page: "sites", openRow: 0, click: "Timeline", expect: "Timeline" },

  { id: "overview/single", page: "overview", click: null, expect: "Started today" },
  { id: "operations/single", page: "operations", click: null, expect: "started today" },
  { id: "issues/single", page: "issues", click: null, expect: "Issue" },
  { id: "assigned/single", page: "assigned", click: null, expect: "Assigned Tasks" },
  { id: "vendors/list", page: "vendors", click: null, expect: "Vendor" },
  { id: "services/list", page: "services", click: null, expect: "Service Catalog" },
  { id: "cases/list", page: "cases", click: null, expect: "Cases" },
  { id: "chat/single", page: "chat", click: null, expect: "Private conversations" },
  { id: "help/single", page: "help", click: null, expect: "Help" },
];

// ---------------------------------------------------------------------------
// Windows. `lines` claims the <Mdl sites in src/App.js that this entry drives.
// Two entries carry two lines because the app renders one window from two places.
// ---------------------------------------------------------------------------
const WINDOWS = [
  { id: "staff/timeline-loading", page: "staff", title: "Loading record details", lines: [1169] },
  { id: "staff/timeline-detail", page: "staff", title: "Record Detail", lines: [1170] },
  { id: "staff/reset-pin", page: "staff", title: "Reset PIN", lines: [1224] },
  { id: "staff/assign-site", page: "staff", title: "Assign to Site", lines: [1230] },
  { id: "staff/add-cert", page: "staff", title: "Add Certification", lines: [1237] },
  { id: "staff/add", page: "staff", title: "Add New Staff", lines: [1284] },
  { id: "staff/edit", page: "staff", title: "Edit Staff Info", lines: [1293] },

  { id: "sites/add-supply", page: "sites", title: "Add Supply to Site", lines: [1843] },
  { id: "sites/timeline-detail", page: "sites", title: "Record Detail", lines: [1940] },
  { id: "sites/edit", page: "sites", title: "Edit Site Details", lines: [1977] },
  { id: "sites/add-task", page: "sites", title: "Add Task", lines: [1999] },
  { id: "sites/edit-task", page: "sites", title: "Edit Task", lines: [2013] },
  { id: "sites/delete-confirm", page: "sites", title: "Permanently Delete Site", lines: [2029] },
  { id: "sites/add", page: "sites", title: "Add Site", lines: [2071] },

  { id: "issues/detail", page: "issues", title: "Issue Detail", lines: [2136] },
  { id: "issues/assign-task", page: "issues", title: "Assign Issue as Task", lines: [2161] },

  { id: "supplies/add", page: "supplies", title: "Add Supply", lines: [2198] },
  { id: "supplies/edit", page: "supplies", title: "Edit Supply", lines: [2199] },
  { id: "supplies/handle-request", page: "supplies", title: "Request", lines: [2200] },

  { id: "assigned/detail", page: "assigned", title: "Task detail", lines: [3762] },
  { id: "assigned/reassign", page: "assigned", title: "Reassign", lines: [3787] },
  { id: "assigned/create", page: "assigned", title: "Create Assigned Task", lines: [3794] },

  { id: "vendors/add", page: "vendors", title: "Add Vendor", lines: [3936] },
  { id: "vendors/detail", page: "vendors", title: "Tallow Ridge Supply", lines: [3944] },
  { id: "vendors/edit", page: "vendors", title: "Edit Vendor", lines: [4000] },
  { id: "vendors/add-eval", page: "vendors", title: "Evaluation", lines: [4008] },
  { id: "vendors/link-supply", page: "vendors", title: "Link Supply", lines: [4023] },

  { id: "services/detail", page: "services", title: "Daily janitorial", lines: [4139] },
  { id: "services/add", page: "services", title: "Add Service", lines: [4193] },
  { id: "services/edit", page: "services", title: "Edit Service", lines: [4201] },
  { id: "services/link-site", page: "services", title: "Link Site", lines: [4209] },

  { id: "schedule/pattern-window", page: "schedule", title: "Weekly pattern", lines: [4306] },
  { id: "schedule/time-off-window", page: "schedule", title: "Time off request", lines: [4488] },
  { id: "schedule/create-shift", page: "schedule", title: "Schedule Shift", lines: [4961] },
  { id: "schedule/edit-shift", page: "schedule", title: "Edit Scheduled Shift", lines: [5020] },
  { id: "schedule/started-detail", page: "schedule", title: "Started Shift", lines: [5062] },
  { id: "schedule/inspection-detail", page: "schedule", title: "Inspection Details", lines: [5078] },
  { id: "schedule/pickup-detail", page: "schedule", title: "Shift Drop Request", lines: [5094] },

  { id: "marketplace/create", page: "marketplace", title: "Post Open Shift", lines: [5688] },
  { id: "marketplace/convert", page: "marketplace", title: "Convert", lines: [5719] },
  { id: "marketplace/shift-detail", page: "marketplace", title: "Shift Details", lines: [5751] },

  // One window, rendered from the template detail view and again from the tab view.
  { id: "inspections/edit-scheduled", page: "inspections", title: "Edit Scheduled Inspection", lines: [6217, 6570] },
  { id: "inspections/new-template", page: "inspections", title: "New Inspection Template", lines: [6562] },
  { id: "inspections/schedule", page: "inspections", title: "Schedule Inspection", lines: [6581] },

  { id: "settings/add-category", page: "settings", title: "Add Category", lines: [7252] },
  { id: "settings/edit-category", page: "settings", title: "Edit Category", lines: [7261] },
  { id: "settings/add-value", page: "settings", title: "Add Value to", lines: [7269] },
  { id: "settings/edit-value", page: "settings", title: "Edit Value", lines: [7283] },
  { id: "settings/add-site-value", page: "settings", title: "Add ", lines: [7297] },
  { id: "settings/edit-site-value", page: "settings", title: "Edit Site Lookup", lines: [7308] },

  { id: "forms/incident-report-window", page: "forms", title: "Incident report", lines: [7499] },
  { id: "forms/edit-form", page: "forms", title: "Edit Form", lines: [8954] },
  { id: "forms/submission-detail", page: "forms", title: "Submission Detail", lines: [9007] },
  { id: "forms/full-refresh", page: "forms", title: "Full Refresh", lines: [9122] },
  { id: "forms/link-user", page: "forms", title: "Link Submission to Record", lines: [9159] },

  { id: "cases/window", page: "cases", title: "Case", lines: [9751] },

  { id: "hr/document-window", page: "hr", title: "Document", lines: [10247] },
  { id: "hr/training-window", page: "hr", title: "Training", lines: [10269] },
  { id: "hr/onboarding-step-window", page: "hr", title: "Add Custom Onboarding Step", lines: [10300] },
];

// ---------------------------------------------------------------------------
// Tables. `paged` marks the ones behind Pagination, which are checked at the
// paging boundary. `filters` names each control whose change is one request or
// one narrowing of the rows on screen.
// ---------------------------------------------------------------------------
const TABLES = [
  { id: "staff/list", page: "staff", paged: true, perPage: 10, filters: ["search", "role"], columns: ["Name", "Phone", "Status", "Role", "Employment", "Sites"] },
  { id: "sites/list", page: "sites", paged: true, perPage: 10, filters: ["search", "status"], columns: ["Site", "Staff", "Tasks", "Contract", "Status"] },
  { id: "vendors/list", page: "vendors", paged: true, perPage: 10, filters: ["search"], columns: ["Vendor"] },
  { id: "marketplace/shifts", page: "marketplace", paged: true, perPage: 10, filters: ["search", "tab", "dateRange"], columns: ["Shift", "Status", "Assigned", "Actions"] },
  { id: "inspections/scheduled", page: "inspections", view: "Scheduled", paged: true, perPage: 10, filters: ["search"], columns: ["Inspection", "Scheduled", "Assigned", "Status", "Actions"] },
  { id: "inspections/completed", page: "inspections", view: "Completed", paged: true, perPage: 10, filters: ["search"], columns: ["Inspection", "Scheduled", "Assigned", "Score", "Actions"] },
  { id: "hr/documents", page: "hr", view: "Documents", paged: true, perPage: 10, filters: ["search", "person"], columns: ["Employee", "Category", "File", "Expiry", "Uploaded By", "Date"] },
  { id: "hr/training", page: "hr", view: "Training", paged: true, perPage: 10, filters: ["search", "person"], columns: ["Employee", "Training Name", "Type", "Completed", "Expiry", "Score"] },
  { id: "hr/other", page: "hr", view: "Other", paged: true, perPage: 10, filters: ["search", "person"], columns: ["Employee", "File", "Notes", "Expiry", "Uploaded By", "Date"] },
  { id: "schedule/patterns", page: "schedule", view: "Patterns", paged: false, filters: ["person", "site", "status"], columns: ["Person", "Site", "Days", "Hours", "Starts", "Ends", "Upcoming"] },
  { id: "schedule/timeoff", page: "schedule", view: "Time off", paged: false, filters: ["status", "person"], columns: ["Person", "Type", "Dates", "Time", "Hours", "Shifts", "Status", "Asked"] },
  { id: "forms/incident-reports", page: "forms", view: "Incident reports", paged: false, filters: ["status"], columns: ["Filed", "Form", "Site", "Filed by"] },
  { id: "cases/list", page: "cases", paged: false, filters: ["status"], columns: ["Response", "Age", "Status", "Received", "Subject named", "Held by"] },
];

// ---------------------------------------------------------------------------
// Report screens whose figures are checked against the seed's hand arithmetic.
// ---------------------------------------------------------------------------
const REPORTS = [
  { id: "reports/issue-timing", name: "Issue response and resolution" },
  { id: "reports/supply-usage", name: "Supply usage and cost" },
  { id: "reports/inspection-quality", name: "Inspection scores and quality" },
  { id: "reports/quick-snapshots", name: "Quick snapshots on the Reports page" },
  { id: "reports/overview-dashboard", name: "The Dashboard tiles" },
  { id: "reports/marketplace-analytics", name: "Shift Pickup analytics" },
  { id: "reports/inspection-analytics", name: "Inspections analytics tab" },
];

// ---------------------------------------------------------------------------
// Everything the dashboard can hand a person to keep.
// ---------------------------------------------------------------------------
const EXPORTS = [
  // CSV, eight of them. dlCSV at src/App.js:39 writes six, and two more are written inline.
  { id: "exports/issues-csv", kind: "csv", name: "ocsa-issues.csv" },
  { id: "exports/chemicals-csv", kind: "csv", name: "ocsa-chemicals.csv" },
  { id: "exports/approved-vendors-csv", kind: "csv", name: "OCSA_Approved_Vendor_List" },
  { id: "exports/service-catalog-csv", kind: "csv", name: "OCSA_Service_Catalog" },
  { id: "exports/inspection-detail-csv", kind: "csv", name: "inspection-" },
  { id: "exports/inspection-analytics-csv", kind: "csv", name: "inspection-analytics-" },
  { id: "exports/staff-timeline-csv", kind: "csv", name: "_Timeline_" },
  { id: "exports/site-timeline-csv", kind: "csv", name: "_Timeline_" },

  // Print, thirteen. Each opens a window, writes a document into it and calls print on it.
  { id: "exports/issue-report-pdf", kind: "print", name: "Issue Response and Resolution" },
  { id: "exports/supply-report-pdf", kind: "print", name: "Supply Usage and Cost" },
  { id: "exports/inspection-report-pdf", kind: "print", name: "Inspection" },
  { id: "exports/inspection-analytics-pdf", kind: "print", name: "Inspection Analytics Report" },
  { id: "exports/inspection-detail-print", kind: "print", name: "Inspection" },
  { id: "exports/staff-profile-print", kind: "print", name: "Staff" },
  { id: "exports/staff-timeline-print", kind: "print", name: "Timeline" },
  { id: "exports/staff-timeline-detail-print", kind: "print", name: "Record" },
  { id: "exports/site-timeline-print", kind: "print", name: "Timeline" },
  { id: "exports/site-timeline-detail-print", kind: "print", name: "Record" },
  { id: "exports/site-chat-print", kind: "print", name: "Chat History" },
  { id: "exports/permissions-matrix-pdf", kind: "print", name: "Roles and Permissions" },
  { id: "exports/submission-pdf-print", kind: "print", name: "" },
];

// ---------------------------------------------------------------------------
// Every decision a manager makes, each exercised both ways where it has two.
// ---------------------------------------------------------------------------
const DECISIONS = [
  { id: "decisions/drop-approve", name: "Approve a drop request" },
  { id: "decisions/drop-deny", name: "Deny a drop request" },
  { id: "decisions/time-off-approve-no-note", name: "Approve time off with no note" },
  { id: "decisions/time-off-approve-with-note", name: "Approve time off with a note" },
  { id: "decisions/time-off-deny-with-note", name: "Deny time off with a note" },
  { id: "decisions/time-off-deny-no-note", name: "Deny time off with no note, which is refused" },
  { id: "decisions/supply-approve", name: "Approve a supply request" },
  { id: "decisions/supply-deny", name: "Deny a supply request" },
  { id: "decisions/post-open-shift", name: "Post an open shift" },
  { id: "decisions/schedule-shift", name: "Schedule a shift" },
  { id: "decisions/schedule-pattern", name: "Schedule a repeating pattern" },
  { id: "decisions/pattern-skip-date", name: "Cancel one date of a pattern" },
  { id: "decisions/issue-resolve", name: "Resolve an issue" },
  { id: "decisions/claimed-shift-approve", name: "Approve a claimed shift" },
  { id: "decisions/staff-approve", name: "Approve a pending person" },
];

// Refusals the API can answer with, shown one at a time.
const REFUSALS = [
  { id: "refusals/time-off-conflict", status: 409, error: "Someone else decided this already" },
  { id: "refusals/time-off-gone", status: 404, error: "That request is gone" },
  { id: "refusals/supply-request-refused", status: 422, error: "That supply is no longer stocked" },
  { id: "refusals/pattern-overlap", status: 409, error: "That person already has a shift in those hours" },
  { id: "refusals/shift-create-refused", status: 400, error: "End time has to come after the start time" },
  { id: "refusals/pickup-taken", status: 409, error: "Someone picked that shift up first" },
  { id: "refusals/staff-add-refused", status: 422, error: "That phone number already belongs to someone" },
  { id: "refusals/site-save-refused", status: 400, error: "A site needs a name and an address" },
  { id: "refusals/settings-save-refused", status: 403, error: "Company settings are locked to an owner" },
  { id: "refusals/permissions-save-refused", status: 403, error: "You cannot change your own permissions" },
  { id: "refusals/report-delete-refused", status: 409, error: "A template report cannot be deleted" },
  { id: "refusals/session-expired", status: 401, error: "Session expired" },
  { id: "refusals/list-load-refused", status: 500, error: "The issue list could not be read" },
  { id: "refusals/popups-blocked", status: 0, error: "Allow pop-ups to export the PDF" },
];

// The house style bans this acronym from anything staff or a client reads. The suite scans
// src/App.js for it rather than carrying a list, so a new one is caught.
const HOUSE_STYLE = { id: "house-style/banned-acronym" };

module.exports = { PAGES, VIEWS, WINDOWS, TABLES, REPORTS, EXPORTS, DECISIONS, REFUSALS, HOUSE_STYLE };
