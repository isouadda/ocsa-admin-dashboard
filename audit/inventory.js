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

  { id: "marketplace/open", page: "marketplace", click: "Open", word: "Open|shift", expect: "Shift Pickup Board" },
  { id: "marketplace/requested", page: "marketplace", click: "Requests", expect: "Shift Pickup Board" },
  { id: "marketplace/claimed", page: "marketplace", click: "Claimed", word: "Claimed|shift", expect: "Shift Pickup Board" },
  { id: "marketplace/filled", page: "marketplace", click: "Approved", word: "Approved|shift", expect: "Shift Pickup Board" },
  { id: "marketplace/all", page: "marketplace", click: "All", word: "All|shifts", expect: "Shift Pickup Board" },
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
  { id: "forms/incident_reports", page: "forms", click: "Filed forms", expect: "report" },

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
  { id: "staff/timeline-loading", page: "staff", title: "Loading record details", lines: [1355] },
  { id: "staff/timeline-detail", page: "staff", title: "Record Detail", lines: [1356] },
  { id: "staff/reset-pin", page: "staff", title: "Reset PIN", lines: [1410] },
  { id: "staff/assign-site", page: "staff", title: "Assign to Site", lines: [1416] },
  { id: "staff/add-cert", page: "staff", title: "Add Certification", lines: [1423] },
  { id: "staff/add", page: "staff", title: "Add New Staff", lines: [1470] },
  { id: "staff/edit", page: "staff", title: "Edit Staff Info", lines: [1479] },

  { id: "sites/add-supply", page: "sites", title: "Add Supply to Site", lines: [2029] },
  { id: "sites/timeline-detail", page: "sites", title: "Record Detail", lines: [2126] },
  { id: "sites/edit", page: "sites", title: "Edit Site Details", lines: [2163] },
  { id: "sites/add-task", page: "sites", title: "Add Task", lines: [2185] },
  { id: "sites/edit-task", page: "sites", title: "Edit Task", lines: [2199] },
  { id: "sites/delete-confirm", page: "sites", title: "Permanently Delete Site", lines: [2215] },
  { id: "sites/add", page: "sites", title: "Add Site", lines: [2257] },

  { id: "issues/detail", page: "issues", title: "Issue Detail", lines: [2331] },
  { id: "issues/assign-task", page: "issues", title: "Assign Issue as Task", lines: [2356] },

  { id: "supplies/add", page: "supplies", title: "Add Supply", lines: [2393] },
  { id: "supplies/edit", page: "supplies", title: "Edit Supply", lines: [2394] },
  { id: "supplies/handle-request", page: "supplies", title: "Request", lines: [2395] },

  { id: "assigned/detail", page: "assigned", title: "Task detail", lines: [4093] },
  { id: "assigned/reassign", page: "assigned", title: "Reassign", lines: [4118] },
  { id: "assigned/create", page: "assigned", title: "Create Assigned Task", lines: [4125] },

  { id: "vendors/add", page: "vendors", title: "Add Vendor", lines: [4267] },
  { id: "vendors/detail", page: "vendors", title: "Tallow Ridge Supply", lines: [4275] },
  { id: "vendors/edit", page: "vendors", title: "Edit Vendor", lines: [4331] },
  { id: "vendors/add-eval", page: "vendors", title: "Evaluation", lines: [4339] },
  { id: "vendors/link-supply", page: "vendors", title: "Link Supply", lines: [4354] },

  { id: "services/detail", page: "services", title: "Daily janitorial", lines: [4470] },
  { id: "services/add", page: "services", title: "Add Service", lines: [4524] },
  { id: "services/edit", page: "services", title: "Edit Service", lines: [4532] },
  { id: "services/link-site", page: "services", title: "Link Site", lines: [4540] },

  { id: "schedule/pattern-window", page: "schedule", title: "Weekly pattern", lines: [4637] },
  { id: "schedule/time-off-window", page: "schedule", title: "Time off request", lines: [4821] },
  { id: "schedule/create-shift", page: "schedule", title: "Schedule Shift", lines: [5294] },
  { id: "schedule/edit-shift", page: "schedule", title: "Edit Scheduled Shift", lines: [5353] },
  { id: "schedule/started-detail", page: "schedule", title: "Started Shift", lines: [5395] },
  { id: "schedule/inspection-detail", page: "schedule", title: "Inspection Details", lines: [5411] },
  { id: "schedule/pickup-detail", page: "schedule", title: "Shift Drop Request", lines: [5427] },

  { id: "marketplace/create", page: "marketplace", title: "Post Open Shift", lines: [6021] },
  { id: "marketplace/convert", page: "marketplace", title: "Convert", lines: [6052] },
  { id: "marketplace/shift-detail", page: "marketplace", title: "Shift Details", lines: [6084] },

  // One window, rendered from the template detail view and again from the tab view.
  { id: "inspections/edit-scheduled", page: "inspections", title: "Edit Scheduled Inspection", lines: [6550, 6903] },
  { id: "inspections/new-template", page: "inspections", title: "New Inspection Template", lines: [6895] },
  { id: "inspections/schedule", page: "inspections", title: "Schedule Inspection", lines: [6914] },

  { id: "settings/add-category", page: "settings", title: "Add Category", lines: [7585] },
  { id: "settings/edit-category", page: "settings", title: "Edit Category", lines: [7594] },
  { id: "settings/add-value", page: "settings", title: "Add Value to", lines: [7602] },
  { id: "settings/edit-value", page: "settings", title: "Edit Value", lines: [7616] },
  { id: "settings/add-site-value", page: "settings", title: "Add ", lines: [7630] },
  { id: "settings/edit-site-value", page: "settings", title: "Edit Site Lookup", lines: [7641] },

  { id: "forms/incident-report-window", page: "forms", title: "Incident report", lines: [8036] },
  { id: "forms/edit-form", page: "forms", title: "Edit Form", lines: [9526] },
  { id: "forms/submission-detail", page: "forms", title: "Submission Detail", lines: [9579] },
  { id: "forms/full-refresh", page: "forms", title: "Full Refresh", lines: [9694] },
  { id: "forms/link-user", page: "forms", title: "Link Submission to Record", lines: [9731] },

  { id: "cases/window", page: "cases", title: "Case", lines: [10323] },

  { id: "hr/document-window", page: "hr", title: "Document", lines: [10819] },
  { id: "hr/training-window", page: "hr", title: "Training", lines: [10841] },
  { id: "hr/onboarding-step-window", page: "hr", title: "Add Custom Onboarding Step", lines: [10872] },
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
  { id: "forms/incident-reports", page: "forms", view: "Filed forms", paged: false, filters: ["status"], columns: ["Filed", "Form", "Site", "Filed by"] },
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
  // CSV, eight of them. dlCSV at src/App.js:54 writes six, and two more are written inline.
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
  { id: "decisions/form-delivery-pdf", name: "Set a form to attach the filled report as a PDF" },
  { id: "decisions/form-delivery-app-link", name: "Set a form back to a link to the app" },
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
  { id: "refusals/form-delivery-unknown-code", status: 400, error: "Unknown form code" },
  { id: "refusals/form-delivery-bad-choice", status: 400, error: "Choose app_link or pdf" },
  { id: "refusals/form-delivery-forbidden", status: 403, error: "Insufficient permissions" },
  { id: "refusals/form-delivery-not-set-up", status: 503, error: "The delivery setting has not been set up yet" },
  { id: "refusals/report-pdf-not-found", status: 404, error: "Report not found" },
  { id: "refusals/report-pdf-no-definition", status: 422, error: "No form definition for OCSA-FRM-016" },
  { id: "refusals/report-pdf-server-error", status: 500, error: "Server error" },
  { id: "refusals/report-resend-not-found", status: 404, error: "Report not found" },
  { id: "refusals/report-resend-draft", status: 409, error: "Only a filed report can be sent again" },
  { id: "refusals/report-resend-no-definition", status: 422, error: "No form definition for OCSA-FRM-016" },
  { id: "refusals/report-resend-forbidden", status: 403, error: "Insufficient permissions" },
  { id: "refusals/signoff-not-found", status: 404, error: "Report not found" },
  { id: "refusals/signoff-not-a-signoff", status: 400, error: "That is not a sign-off on this form" },
  { id: "refusals/signoff-not-this-part", status: 403, error: "You cannot sign this part of the form" },
  { id: "refusals/signoff-own-report", status: 403, error: "You cannot sign off on your own report" },
  { id: "refusals/signoff-already-submitted", status: 409, error: "This report was already submitted" },
  { id: "refusals/signoff-not-filed-yet", status: 409, error: "The supervisor section opens once the report is filed" },
  { id: "refusals/signoff-voided", status: 409, error: "This report was voided" },
  { id: "refusals/signoff-already-signed", status: 409, error: "This part is already signed" },
  { id: "refusals/supervisor-not-found", status: 404, error: "Report not found" },
  { id: "refusals/supervisor-not-filed-yet", status: 409, error: "The supervisor section opens once the report is filed" },
  { id: "refusals/supervisor-voided", status: 409, error: "This report was voided" },
  { id: "refusals/supervisor-forbidden", status: 403, error: "You cannot fill in the supervisor section" },
  { id: "refusals/supervisor-own-report", status: 403, error: "You cannot fill in the supervisor section of your own report" },
  { id: "refusals/supervisor-answers-shape", status: 400, error: "Send answers as an object of key and value" },
  { id: "refusals/supervisor-outside-the-section", status: 400, error: "Only the supervisor section can be changed here" },
  { id: "refusals/supervisor-signoff-by-save", status: 400, error: "A sign-off is made with its own button" },
  { id: "refusals/supervisor-unanswerable-fields", status: 400, error: "These fields cannot be answered here" },
  { id: "refusals/supervisor-not-valid", status: 400, error: "Some answers are not valid" },
  { id: "refusals/supervisor-bad-date", status: 400, error: "Enter a real date" },
  { id: "refusals/supervisor-bad-time", status: 400, error: "Enter a real time" },
  { id: "refusals/report-resend-server-error", status: 500, error: "Server error" },
];

// The house style bans this acronym from anything staff or a client reads. The suite scans
// src/App.js for it rather than carrying a list, so a new one is caught.
const HOUSE_STYLE = { id: "house-style/banned-acronym" };
// Every file under src/ is plain ASCII. A language is written as escapes in source and as itself
// only in the translator's CSV.
const ASCII_ONLY = { id: "house-style/ascii-only-under-src" };
// The word table and the translator's CSV are two copies of one thing.
const WORD_TABLE = { id: "house-style/the-table-and-the-csv-agree" };
// A sentence with a value in it carries the same values in every language.
const WORD_SLOTS = { id: "house-style/a-translated-sentence-keeps-its-values" };
// Every call to the API says the language the screen is drawn in, so what the API answers with comes
// back in that language.
const LANGUAGE_HEADER = { id: "language/every-call-says-the-language" };

// Help fits the window. Each is checked once per text size, theme and language, as
// help/<check>/<text size>/<theme>/<language>, across four window sizes and six states of the page:
// the four Step 120 read, an answer arriving and the same answer finished.
const HELP_FIT = [
  { id: "help/fits-the-window", what: "the page is as high as the window and the send box ends inside it" },
  { id: "help/conversation-scrolls-inside", what: "thirty messages scroll inside the conversation area" },
  { id: "help/reports-list-stops-at-three-rows", what: "five unfinished reports show at most three rows and scroll inside the list" },
  { id: "help/empty-line-in-the-middle", what: "an empty conversation's line sits in the middle of its area" },
  { id: "help/newest-words-in-sight", what: "while an answer arrives its newest words are inside the conversation, without a mark, and the finished answer draws its bold" },
];
// Help's answer appears as it is written. Each journey runs in English and in Spanish, as
// help-stream/<journey>/<language>, with the answer written by audit/stream.js.
const HELP_STREAM = [
  { id: "help-stream/the-question-goes-to-the-streaming-route", what: "every question goes to POST /api/agent/message/stream with the body, the query and the headers the page has always sent, Accept-Language included" },
  { id: "help-stream/the-first-words-come-before-the-last", what: "with twelve pieces 400 ms apart, the first words are on screen long before the answer is finished" },
  { id: "help-stream/marks-never-show-while-arriving", what: "a bold phrase cut in two arrives as plain words, a lone * at the end of a piece is held back, and the finished answer draws its bold" },
  { id: "help-stream/a-reset-clears-what-was-drawn", what: "reset takes away what was drawn since meta, and the answer goes on from there" },
  { id: "help-stream/done-is-read-key-for-key", what: "done is handled as the whole answer always was: its steps and bold, the documents it cites, degraded, noProcedure, the report it continues, the box to type in, and the conversation the next question carries" },
  { id: "help-stream/a-refusal-before-the-stream-reads-as-today", what: "a JSON refusal before the stream opens reads Not sent with the API's words and Retry, Retry asks again, and a 401 signs the person out" },
  { id: "help-stream/an-error-event-reads-as-a-refusal", what: "an error event takes away the words drawn so far and reads exactly as a refusal with the same status" },
  { id: "help-stream/a-dropped-connection-reads-the-answer-back", what: "a connection that drops after meta says so in one line, and the stored answer is read back into its place" },
  { id: "help-stream/try-again-reads-it-back-again", what: "when the stored answer is not in the conversation yet, Try again reads it back again, and the next question stays in the same conversation" },
  { id: "help-stream/a-screen-reader-hears-the-answer-once", what: "one live region, empty while the answer arrives, says the finished answer once" },
];
// What the API sends in that language, and where it goes. A screen that only shows a checklist item
// or a pick list choice draws the display the API sent; a screen that edits one shows and saves the
// English it was saved in. Read in Spanish, where the two are different words.
const DISPLAY_FIELDS = [
  { id: "language/a-shown-item-reads-its-display", what: "Assigned Tasks draws a task's display, and its own English where there is none" },
  { id: "language/a-shown-choice-reads-its-display-label", what: "the priority picker reads each choice's displayLabel and sends its code" },
  { id: "language/an-edited-item-shows-and-sends-its-english", what: "the Sites task editor shows and saves the task's English" },
  { id: "language/an-edited-choice-shows-and-sends-its-english", what: "the Dropdown Options value editor shows and saves the choice's English" },
  { id: "language/a-typed-message-is-drawn-as-typed", what: "Messages draws what a person wrote as they wrote it, a word the table carries included" },
  { id: "language/a-count-of-one-reads-in-the-one-form", what: "the no-show count under Callouts on Shift Pickup reads the one form at one" },
];

// ---------------------------------------------------------------------------
// Every state the filed report window can be in past its first draw: what its
// footer offers, what it asks before it sends, and what it says afterward.
// ---------------------------------------------------------------------------
const WINDOW_STATES = [
  { id: "window-states/report-offers-download", name: "A loaded report offers Download PDF" },
  { id: "window-states/report-downloading", name: "While the file is in flight the button reads Downloading... and cannot be pressed" },
  { id: "window-states/report-download-saves-the-file", name: "The file is saved under the name the API chose" },
  { id: "window-states/report-download-names-the-file-itself", name: "With no name to read off the response, the file is still named for its form and its report" },
  { id: "window-states/report-offers-send-again", name: "A filed report offers Send again" },
  { id: "window-states/report-hides-send-again-on-a-draft", name: "An unfinished report does not offer Send again" },
  { id: "window-states/report-asks-before-sending", name: "Send again asks first, with Send it and Not yet" },
  { id: "window-states/report-not-yet-sends-nothing", name: "Not yet puts the question away and sends nothing" },
  { id: "window-states/report-sent-line-with-a-link", name: "The line after a send, when the form carries a link to the app" },
  { id: "window-states/report-sent-line-with-the-pdf", name: "The line after a send, when the form carries the PDF" },
  { id: "window-states/report-double-click-sends-once", name: "A double click on Send it sends once" },
];


// ---------------------------------------------------------------------------
// The filed report window, once a form carries a table, a checklist or a sign-off. The ones marked
// everyPaint are read again in each theme, at each text size and at both widths, since a table
// inside a window is the first thing to run off the side. The rest are driven once.
// ---------------------------------------------------------------------------
const FILED_FORM_STATES = [
  { id: "filed-forms/the-window-opens-on-the-new-form", name: "The second filed report opens on the daily service log", everyPaint: true },
  { id: "filed-forms/a-checklist-draws-as-a-table", name: "A checklist draws as a table with its columns across the top", everyPaint: true },
  { id: "filed-forms/a-checklist-keeps-its-items-down-the-side", name: "A checklist keeps its items down the side", everyPaint: true },
  { id: "filed-forms/a-checklist-answer-reads-as-a-word", name: "A ticked box reads Yes, an unticked one No, and a note reads as typed", everyPaint: true },
  { id: "filed-forms/an-added-rows-table-is-numbered", name: "A table a person added rows to is numbered", everyPaint: true },
  { id: "filed-forms/an-added-rows-table-keeps-its-columns", name: "A table a person added rows to keeps the form's columns", everyPaint: true },
  { id: "filed-forms/a-picked-option-reads-as-its-label", name: "A picked option reads as its label and not as its stored value", everyPaint: true },
  { id: "filed-forms/a-signed-part-draws-its-stamp", name: "A signed part draws Signed by, the name, the date and the time", everyPaint: true },
  { id: "filed-forms/an-unsigned-part-reads-not-signed", name: "An unsigned part reads Not signed", everyPaint: true },
  { id: "filed-forms/whoever-may-sign-is-offered-a-button", name: "A Sign button shows beside the part this person may stamp", everyPaint: true },
  { id: "filed-forms/the-supervisor-section-takes-answers", name: "The supervisor section draws inputs and one Save", everyPaint: true },
  { id: "filed-forms/what-is-still-needed-is-named", name: "The supervisor questions still empty are named", everyPaint: true },
  { id: "filed-forms/the-window-does-not-run-off-the-side", name: "The page does not scroll sideways with the window open", everyPaint: true },
  { id: "filed-forms/a-wide-table-scrolls-in-its-own-box", name: "A table wider than its box scrolls inside that box", everyPaint: true },
  { id: "filed-forms/every-control-in-the-window-is-44-by-44", name: "Every control in the window is at least 44 by 44", everyPaint: true },
  { id: "filed-forms/an-older-report-reads-as-it-did", name: "A report with none of the new types reads exactly as before", everyPaint: true },
  { id: "filed-forms/the-filed-half-does-not-turn-on-one-word", name: "A filed answer shows whichever word the API uses for that half" },
  { id: "filed-forms/the-tab-reads-filed-forms", name: "The tab reads Filed forms" },
  { id: "filed-forms/the-filter-names-every-form", name: "The filter beside it names every form" },
  { id: "filed-forms/the-filter-asks-the-api-for-one-form", name: "Picking a form asks the API for that form" },
  { id: "filed-forms/sign-sends-one-request", name: "One press of Sign sends one request" },
  { id: "filed-forms/sign-sends-the-key-of-the-part", name: "Sign sends the key of the part being stamped" },
  { id: "filed-forms/the-stamp-is-drawn-after-the-answer", name: "The stamp is drawn once the API has answered" },
  { id: "filed-forms/a-signed-part-is-not-offered-again", name: "A part that is signed is not offered a Sign button" },
  { id: "filed-forms/sign-waits-for-the-answer", name: "While the request is in flight the button reads busy and no stamp is drawn" },
  { id: "filed-forms/two-presses-send-one-request", name: "Two presses of Sign send one request" },
  { id: "filed-forms/save-sends-only-what-changed", name: "Save sends only the answers that changed" },
  { id: "filed-forms/save-sends-a-checklist-in-its-shape", name: "A checklist is sent as an object keyed by row then column" },
  { id: "filed-forms/the-section-is-swapped-for-the-answer", name: "The section is swapped for what the API answered" },
  { id: "filed-forms/what-is-still-needed-shrinks", name: "The still-needed line drops a question once it is answered" },
];

module.exports = { PAGES, VIEWS, WINDOWS, TABLES, REPORTS, EXPORTS, DECISIONS, REFUSALS, HOUSE_STYLE, ASCII_ONLY, WORD_TABLE, WORD_SLOTS, LANGUAGE_HEADER, DISPLAY_FIELDS, HELP_FIT, HELP_STREAM, WINDOW_STATES, FILED_FORM_STATES };
