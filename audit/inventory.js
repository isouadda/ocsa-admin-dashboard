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
  { id: "forms", label: "Forms", expect: "Jotform", gated: true },
  { id: "settings", label: "Settings", expect: "Company", gated: true },
  { id: "chat", label: "Messages", expect: "Private conversations", gated: false },
  { id: "help", label: "Help", expect: "Help", gated: false },
  // Step 185: for a holder of view_help_insights, whom the API names by default among admins only.
  { id: "help-insights", label: "Help insights", expect: "Everyone who asked", gated: true },
  // Step 181: for a holder of send_announcements, which the API's defaults give admins alone, so it
  // opens for the admin and the super admin and tells both supervisors it is for admins.
  { id: "announcements", label: "Announcements", expect: "New announcement", gated: true },
  // Step 187: for a holder of build_forms, whom the API names by default among admins only.
  { id: "form-builder", label: "Form builder", expect: "Every form the apps offer", gated: true },
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
  { id: "inspections/scheduled", page: "inspections", click: "Scheduled", word: "Scheduled|inspections", expect: "Scheduled" },
  { id: "inspections/completed", page: "inspections", click: "Completed", word: "Completed|inspections", expect: "Inspection" },
  { id: "inspections/reports", page: "inspections", click: "Reports", expect: "score" },

  // Four of Settings' tabs are an admin's. The person holding only the manage permissions capability
  // opens Roles and Permissions and nothing else, so a pass as that person reads the other two views.
  { id: "settings/company", page: "settings", click: "Company", expect: "Save Company Settings", adminOnly: true },
  { id: "settings/global", page: "settings", click: "Dropdown Options", expect: "categor", adminOnly: true },
  { id: "settings/site", page: "settings", click: "Site Lookups", expect: "site", adminOnly: true },
  { id: "settings/permissions", page: "settings", click: "Roles and Permissions", expect: "Per-person permissions" },
  { id: "settings/permissions-matrix", page: "settings", click: ["Roles and Permissions", "Role reference"], expect: "Access each role has in the platform today" },
  { id: "settings/recipients", page: "settings", click: "Who gets told", expect: "told", adminOnly: true },

  // Since Step 165 the page opens on Filed forms for everyone. The Jotform tab and the PDF access
  // log are an admin's; a supervisor the filed list lets in sees Filed forms alone. Inside the
  // Jotform tab, Inbox is the old Submissions, Forms the old Form Library, and Maintenance holds the
  // old Settings, Sync Diagnostic and Aliases down one screen, so each of the seven views counted
  // before is still counted. The section named Forms is pressed by its exact word, since the Filed
  // forms tab carries the word too.
  { id: "forms/incident_reports", page: "forms", click: "Filed forms", expect: "report" },
  { id: "forms/jotform", page: "forms", click: "Jotform", expect: "Inbox", adminOnly: true },
  { id: "forms/jotform/inbox", page: "forms", click: ["Jotform", "Inbox"], expect: "Re-run Auto-Link", adminOnly: true },
  { id: "forms/jotform/forms", page: "forms", click: ["Jotform", "Forms"], exact: true, expect: "Incident report", adminOnly: true },
  { id: "forms/jotform/maintenance", page: "forms", click: ["Jotform", "Maintenance"], expect: "API Connection", adminOnly: true },
  { id: "forms/jotform/maintenance/diagnostic", page: "forms", click: ["Jotform", "Maintenance"], expect: "Diagnostic", adminOnly: true },
  { id: "forms/jotform/maintenance/aliases", page: "forms", click: ["Jotform", "Maintenance"], expect: "Alias", adminOnly: true },
  { id: "forms/pdf_access", page: "forms", click: "PDF access log", expect: "access", adminOnly: true },

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
  { id: "help-insights/single", page: "help-insights", click: null, expect: "Everyone who asked" },
  { id: "announcements/single", page: "announcements", click: null, expect: "New announcement" },
  { id: "form-builder/list", page: "form-builder", click: null, expect: "Every form the apps offer" },
  // Step 187: the builder, which a form's Edit swaps in for the list.
  { id: "form-builder/builder", page: "form-builder", click: "Edit", expect: "Needs fixing before it can be published" },
];

// ---------------------------------------------------------------------------
// Windows. `lines` claims the <Mdl sites in src/App.js that this entry drives.
// Two entries carry two lines because the app renders one window from two places.
// ---------------------------------------------------------------------------
const WINDOWS = [
  { id: "staff/timeline-loading", page: "staff", title: "Loading record details", lines: [1659] },
  { id: "staff/timeline-detail", page: "staff", title: "Record Detail", lines: [1660] },
  { id: "staff/reset-pin", page: "staff", title: "Reset PIN", lines: [1715] },
  { id: "staff/assign-site", page: "staff", title: "Assign to Site", lines: [1721] },
  { id: "staff/add-cert", page: "staff", title: "Add Certification", lines: [1728] },
  { id: "staff/add", page: "staff", title: "Add New Staff", lines: [1780] },
  // Step 181: the Temporary PIN window Add New Staff opens once the API has saved the person.
  { id: "staff/temporary-pin", page: "staff", title: "Temporary PIN", lines: [1417] },
  { id: "staff/edit", page: "staff", title: "Edit Staff Info", lines: [1789] },

  { id: "sites/add-supply", page: "sites", title: "Add Supply to Site", lines: [2409] },
  { id: "sites/timeline-detail", page: "sites", title: "Record Detail", lines: [2508] },
  { id: "sites/edit", page: "sites", title: "Edit Site Details", lines: [2545] },
  { id: "sites/add-task", page: "sites", title: "Add Task", lines: [2567] },
  { id: "sites/edit-task", page: "sites", title: "Edit Task", lines: [2581] },
  { id: "sites/add", page: "sites", title: "Add Site", lines: [2636] },

  { id: "issues/detail", page: "issues", title: "Issue Detail", lines: [2714] },
  { id: "issues/assign-task", page: "issues", title: "Assign Issue as Task", lines: [2739] },

  { id: "supplies/add", page: "supplies", title: "Add Supply", lines: [2813] },
  { id: "supplies/edit", page: "supplies", title: "Edit Supply", lines: [2814] },
  { id: "supplies/handle-request", page: "supplies", title: "Request", lines: [2815] },

  { id: "assigned/detail", page: "assigned", title: "Task detail", lines: [5091] },
  { id: "assigned/reassign", page: "assigned", title: "Reassign", lines: [5116] },
  { id: "assigned/create", page: "assigned", title: "Create Assigned Task", lines: [5123] },

  { id: "vendors/add", page: "vendors", title: "Add Vendor", lines: [5269] },
  { id: "vendors/detail", page: "vendors", title: "Tallow Ridge Supply", lines: [5277] },
  { id: "vendors/edit", page: "vendors", title: "Edit Vendor", lines: [5333] },
  { id: "vendors/add-eval", page: "vendors", title: "Evaluation", lines: [5341] },
  { id: "vendors/link-supply", page: "vendors", title: "Link Supply", lines: [5356] },

  { id: "services/detail", page: "services", title: "Daily janitorial", lines: [5475] },
  { id: "services/add", page: "services", title: "Add Service", lines: [5529] },
  { id: "services/edit", page: "services", title: "Edit Service", lines: [5537] },
  { id: "services/link-site", page: "services", title: "Link Site", lines: [5545] },

  { id: "schedule/pattern-window", page: "schedule", title: "Weekly pattern", lines: [5644] },
  { id: "schedule/time-off-window", page: "schedule", title: "Time off request", lines: [5828] },
  { id: "schedule/create-shift", page: "schedule", title: "Schedule Shift", lines: [6377] },
  { id: "schedule/edit-shift", page: "schedule", title: "Edit Scheduled Shift", lines: [6436] },
  { id: "schedule/started-detail", page: "schedule", title: "Started Shift", lines: [6478] },
  { id: "schedule/inspection-detail", page: "schedule", title: "Inspection Details", lines: [6494] },
  { id: "schedule/pickup-detail", page: "schedule", title: "Shift Drop Request", lines: [6510] },

  { id: "marketplace/create", page: "marketplace", title: "Post Open Shift", lines: [7124] },
  { id: "marketplace/convert", page: "marketplace", title: "Convert", lines: [7155] },
  { id: "marketplace/shift-detail", page: "marketplace", title: "Shift Details", lines: [7187] },

  // One window, rendered from the template detail view and again from the tab view.
  { id: "inspections/edit-scheduled", page: "inspections", title: "Edit Scheduled Inspection", lines: [7702, 8050] },
  { id: "inspections/new-template", page: "inspections", title: "New Inspection Template", lines: [8042] },
  { id: "inspections/schedule", page: "inspections", title: "Schedule Inspection", lines: [8061] },
  // Step 185: Rename on a template's card, which sends the name typed and the description the card has.
  { id: "inspections/rename-template", page: "inspections", title: "Rename", lines: [7726] },

  { id: "settings/add-category", page: "settings", title: "Add Category", lines: [8829] },
  { id: "settings/edit-category", page: "settings", title: "Edit Category", lines: [8837] },
  { id: "settings/add-value", page: "settings", title: "Add Value to", lines: [8845] },
  { id: "settings/edit-value", page: "settings", title: "Edit Value", lines: [8859] },
  { id: "settings/add-site-value", page: "settings", title: "Add ", lines: [8874] },
  { id: "settings/edit-site-value", page: "settings", title: "Edit Site Lookup", lines: [8885] },

  { id: "forms/incident-report-window", page: "forms", title: "Incident report", lines: [9661] },
  { id: "forms/edit-form", page: "forms", title: "Edit Form", lines: [12725] },
  { id: "forms/submission-detail", page: "forms", title: "Submission Detail", lines: [12778] },
  { id: "forms/full-refresh", page: "forms", title: "Full Refresh", lines: [12931] },
  // Step 166: the picker Start a form opens, and the window a form is filled in.
  { id: "forms/start-picker", page: "forms", title: "Pick a form to start", lines: [11299] },
  { id: "forms/fill-window", page: "forms", title: "Complaint log", lines: [10348] },
  { id: "forms/link-user", page: "forms", title: "Link Submission to Record", lines: [12894] },
  // Step 169: the customer links window, from Filed forms, listing the links and showing a QR code.
  { id: "forms/customer-links", page: "forms", title: "Customer links", lines: [11077] },

  // Step 185: a person's questions, opened from Everyone who asked on Help insights.
  { id: "help-insights/person", page: "help-insights", title: "Their questions", lines: [3614] },
  // Step 187: a form's Version history, opened from a row of the Form builder's list.
  { id: "form-builder/version-history", page: "form-builder", title: "Version history", lines: [10395] },

  // Step 181: My alerts, which the shell draws from the name menu, and the phone's More menu, on any
  // page once GET /api/notifications/settings has answered.
  { id: "shell/my-alerts", page: "overview", title: "My alerts", lines: [3143] },

  { id: "cases/window", page: "cases", title: "Case", lines: [13562] },

  { id: "hr/document-window", page: "hr", title: "Document", lines: [14088] },
  { id: "hr/training-window", page: "hr", title: "Training", lines: [14110] },
  { id: "hr/onboarding-step-window", page: "hr", title: "Add Custom Onboarding Step", lines: [14144] },
  { id: "hr/training-room-window", page: "hr", title: "Log training for several people", lines: [14387] },
];

// ---------------------------------------------------------------------------
// Tables. `paged` marks the ones behind Pagination, which are checked at the
// paging boundary. `filters` names each control whose change is one request or
// one narrowing of the rows on screen.
// ---------------------------------------------------------------------------
const TABLES = [
  { id: "staff/list", page: "staff", paged: true, perPage: 10, filters: ["search", "role"], columns: ["Name", "Badge", "Phone", "Status", "Role", "Employment", "Sites"] },
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

  // Print, fourteen. Each opens a window, writes a document into it and calls print on it.
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
  { id: "exports/attendance-sheet-print", kind: "print", name: "Attendance sheet" },
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
  { id: "refusals/signoff-signature-required", status: 400, error: "Draw your signature before you sign" },
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
// Every key src/App.js hands tr() or trn() as written has its Spanish in the table (Step 185, 424ca39).
const WORD_KEYS = { id: "house-style/every-tr-key-has-an-entry" };
// A sentence with a value in it carries the same values in every language.
const WORD_SLOTS = { id: "house-style/a-translated-sentence-keeps-its-values" };
// The finder reads every page the app prints, counted against a plain count of the pages the source
// opens in a window.
const FINDER_PRINTS = { id: "house-style/the-finder-reads-every-printed-page" };
// A page audit/spanish-todo.json no longer lists has no English the finder can find, a printed page
// included.
const DONE_PAGES_READ_NO_ENGLISH = { id: "house-style/a-page-taken-as-done-reads-no-english" };
// A page still listed in audit/spanish-todo.json names the printed pages the finder counts English on,
// so the part that takes the page takes its prints with it.
const TODO_NAMES_PRINTS = { id: "house-style/the-to-do-list-names-every-print-left" };
// Every call to the API says the language the screen is drawn in, so what the API answers with comes
// back in that language.
const LANGUAGE_HEADER = { id: "language/every-call-says-the-language" };
// Every signed-in call also names it once on the address, as locale=, which the API reads ahead of
// the language on the person's account. The stub turns away a call that names none, two or another.
const LANGUAGE_LOCALE = { id: "language/every-signed-in-call-names-its-language-once" };

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
  { id: "help-stream/sources-in-words", what: "the line under an answer names a guide or a general reference in the owner's words, the app guide once for two guide codes, and a company document by its code" },
];
// The checklist editor on Sites keeps every item, for an admin and for a supervisor with a shift open
// at the site, and every checklist read in the run asks for every item of every shift.
const CHECKLIST_EDITOR = [
  { id: "page/sites/every-item-in-the-editor", what: "with a shift open at the site, Service Details draws every item: the other shift's, a weekly one, one set to other days and a seasonal one out of season" },
  { id: "checklist/every-read-asks-for-every-item", what: "every GET /api/sites/:id/tasks the run makes sends day=all&shift=" },
];
// The role on HR Records is the table's word for it, in English and in Spanish: on every card, in a
// person's folder and in the Staff Summary. On Shift Pickup it is the staff_roles list's shown label,
// or the table's word for a role the list does not hold.
const HR_ROLES = ["en", "es"].reduce((out, lang) => out.concat([
  { id: "page/hr/roles-are-words/cards/" + lang, what: "every card on the Employees tab draws its person's role as the table's word for it" },
  { id: "page/hr/roles-are-words/folder/" + lang, what: "a person's folder draws the role under their name as the table's word for it" },
  { id: "page/hr/roles-are-words/summary/" + lang, what: "the Staff Summary on Compliance draws each role as the table's word for it" },
  { id: "page/hr/lookups-are-words/training/" + lang, what: "the Training table's Type column draws each code as the training_types lookup's word for it" },
  { id: "page/hr/lookups-are-words/onboarding/" + lang, what: "the Onboarding checklist's headings draw each category as the onboarding_categories lookup's word for it" },
  { id: "page/marketplace/roles-are-words/assigned/" + lang, what: "the Assigned column on Shift Pickup draws the role of whoever claimed a shift as the staff_roles list's shown label" },
  { id: "page/marketplace/roles-are-words/reliability/" + lang, what: "the Staff Reliability tab draws each person's role as the staff_roles list's shown label" },
  { id: "page/marketplace/roles-are-words/not-in-list/" + lang, what: "a role the staff_roles list does not hold is drawn on both as the table's word for it, never as its code" },
  { id: "page/marketplace/status-is-a-word/" + lang, what: "each shift's status badge on Shift Pickup is the table's word for its code" },
  { id: "page/marketplace/reasons-are-words/" + lang, what: "each shift's reason badge on Shift Pickup is the shift_origins list's shown label for its code" },
  { id: "page/marketplace/service-is-a-word/" + lang, what: "each shift's service on Shift Pickup is the service_categories list's shown label for what the shift saved" },
  { id: "page/marketplace/pick-lists-show-their-words/" + lang, what: "Post Open Shift's Reason and Service Category lists and Schedule Shift's Service Category list show the shown labels and carry what they have always sent" },
]), []);
// The questions Schedule and Shift Pickup ask before they change something, and the word a custom
// date range puts between its dates, are the table's words, in English and in Spanish.
const QUESTIONS = ["en", "es"].reduce((out, lang) => out.concat([
  { id: "page/schedule/question/cancel-shift/" + lang, what: "canceling a single shift asks the table's question" },
  { id: "page/schedule/question/cancel-pattern-date/" + lang, what: "canceling a date of a pattern's shift asks the table's question" },
  { id: "page/schedule/question/cancel-inspection/" + lang, what: "canceling an inspection from its window asks the table's question" },
  { id: "page/marketplace/question/cancel-open-shift/" + lang, what: "canceling an open shift asks the table's question" },
  { id: "page/marketplace/question/release-shift/" + lang, what: "releasing a claimed shift asks the table's question" },
  { id: "page/marketplace/date-range-to/" + lang, what: "a custom date range joins its two dates with the table's word" },
]), []);
// A site's zone chips on General Info: a task's display, then the zones lookup's shown label, then the
// zone as typed, in English and in Spanish.
const ZONE_CHIPS = ["en", "es"].map((lang) => (
  { id: "page/sites/zone-chips/" + lang, what: "each zone chip draws a task's display, the zones lookup's shown label, or the zone as typed, in that order" }));
// Log training for a whole room at once, in English and in Spanish: a supervisor's window lists everyone
// active and a site's active people, three people send three creates held to bodies written by hand,
// a second press logs nobody twice, one refusal leaves the rest saved and Try again sends only that
// one, the day sent is the local one at 11:30 PM, and the names already used are offered. The Training
// tab lists who has no record of a training. The window and that list fit a phone, 390 wide, at every
// text size. Each check was broken on purpose once and seen to fail.
const TRAINING_ROOM = ["en", "es"].reduce((out, lang) => out.concat([
  { id: "page/hr/training-room/a-supervisor-lists-everyone-active/" + lang, what: "a supervisor, refused the staff list, is offered everyone active and a site's active people", broken: "the people taken from the staff list the shell reads" },
  { id: "page/hr/training-room/a-supervisor-is-offered-the-training-types/" + lang, what: "a supervisor, refused the whole set of lists, is offered every active training type from the signed-in lookups route", broken: "the shell reading /api/lookups/all alone" },
  { id: "page/hr/training-room/add-training-lists-the-active-people/" + lang, what: "+ Add Training offers a supervisor everyone active, from the HR summary", broken: "the Employee list built from the shell's staff list alone" },
  { id: "page/hr/training-room/three-people-three-creates/" + lang, what: "logging three people sends exactly three creates, each held to a body written by hand", broken: "one body sent for all three" },
  { id: "page/hr/training-room/save-twice-logs-nobody-twice/" + lang, what: "a second press sends nothing and names the three as already logged, and a double press sends each person once", broken: "the same-name, same-day check dropped" },
  { id: "page/hr/training-room/one-refused-the-rest-saved/" + lang, what: "one person refused: the other two save, the refused one is named with the API's words, and Try again sends only that one", broken: "the run stopped at the first refusal" },
  { id: "page/hr/training-room/the-local-day-at-11-30-pm/" + lang, what: "at 11:30 PM in Philadelphia the day sent is that local day", broken: "the day taken from toISOString" },
  { id: "page/hr/training-room/names-already-used-are-offered/" + lang, what: "typing part of a name offers the names already used, and taking one takes its type", broken: "nothing offered" },
  { id: "page/hr/training-room/pop-ups-blocked/" + lang, what: "with pop-ups blocked, printing the sheet from the list and from the window says so", broken: "the refusal left unsaid" },
  { id: "page/hr/training-room/attendance-sheet/" + lang, what: "the sheet printed from the window and from the list names the training, the day, the type, the trainer and the language, and lists every person logged for that name and day, in the language of the screen", broken: "the sheet's heading left in English on a Spanish screen" },
  { id: "page/hr/training-room/who-has-no-record/" + lang, what: "a training picked on the Training tab lists exactly the active people with no record of it and counts them, narrows by site, and drops a person once the window logs them", broken: "inactive people counted as well" },
]).concat(lang === "es" ? [
  { id: "page/hr/training-room/no-english-left/es", what: "the window, after a save, draws no English on a Spanish screen", broken: "a new string drawn without the table" },
] : []).concat(["standard", "large", "xlarge", "largest"].map((size) => (
  { id: "page/hr/training-room/window-fits-a-phone/" + size + "/" + lang, what: "at 390 wide the window runs off no side and every control in it is at least 44 by 44", broken: "one control fixed at 30 pixels" }))).concat(["standard", "large", "xlarge", "largest"].map((size) => (
  { id: "page/hr/training-room/list-fits-a-phone/" + size + "/" + lang, what: "at 390 wide the list of who has no record runs off no side and every control in it is at least 44 by 44", broken: "one control in the list fixed at 30 pixels" }))), []);
// Every staff picker fills for a supervisor, in English and in Spanish at 1024. The stub refuses GET
// /api/users to anyone without manage_staff, the way the API does, and the shell reads a supervisor's
// people from the HR employees summary through one helper, so each picker built from the staff list
// offers the seed's active people, and what it sends is the id of the person picked. Each check was
// broken on purpose once and seen to fail.
const PICKERS = ["en", "es"].reduce((out, lang) => out.concat([
  { id: "page/pickers/the-stub-refuses-the-staff-list-to-a-supervisor/" + lang, what: "the stub itself answers GET /api/users with a 403 to a supervisor", broken: "the stub answering the list to everyone again" },
  { id: "page/pickers/the-shell-reads-the-summary-after-the-refusal/" + lang, what: "refused the list, the shell reads GET /api/hr/employees-summary?status=active and is answered", broken: "the shell's fallback taken out" },
  { id: "page/pickers/assign-to-lists-the-active-people/" + lang, what: "Assigned Tasks' Create Task offers a supervisor everyone active under Assign To", broken: "the shell's fallback taken out" },
  { id: "page/pickers/a-task-assigned-sends-the-persons-id/" + lang, what: "a task created for a person sends that person's id in assignToUsers", broken: "the option's value the person's name" },
  { id: "page/pickers/schedule-lists-the-staff/" + lang, what: "Schedule Shift offers a supervisor the active people who are not admins under Staff Member", broken: "the shell's fallback taken out" },
  { id: "page/pickers/schedule-site-filter-keeps-the-sites-people/" + lang, what: "under a site, Schedule reads the site's record and Schedule Shift offers its active people and every admin", broken: "the site's people not read for a list without site assignments" },
  { id: "page/pickers/pickup-reassign-lists-the-staff/" + lang, what: "an open pickup's window on Schedule offers a supervisor the staff under Reassign To", broken: "the shell's fallback taken out" },
  { id: "page/pickers/hr-filter-lists-the-active-people/" + lang, what: "HR Records' person filter offers a supervisor everyone active", broken: "HR Records reading the staff list alone" },
  { id: "page/pickers/hr-filter-narrows-to-the-person/" + lang, what: "picking a person in the filter reads the tab's records with that person's id", broken: "the option's value the person's name" },
  { id: "page/pickers/add-document-lists-the-active-people/" + lang, what: "+ Add Document offers a supervisor everyone active under Employee", broken: "HR Records reading the staff list alone" },
  { id: "page/pickers/a-document-sent-names-the-persons-id/" + lang, what: "a document added for a person is sent to that person's id", broken: "the option's value the person's name" },
  { id: "page/pickers/assigned-supervisor-lists-the-supervisors/" + lang, what: "Inspections' Schedule Inspection offers a supervisor the active supervisors under Assigned Supervisor", broken: "Assigned Supervisor's fallback taken out" },
  { id: "page/pickers/an-inspection-scheduled-sends-the-chosen-id/" + lang, what: "an inspection scheduled for a supervisor sends that supervisor's id in assigned_to", broken: "the option's value the person's name" },
  { id: "page/pickers/schedule-inspection-lists-the-supervisors/" + lang, what: "an inspection's window on Schedule offers a supervisor the active supervisors under Assigned Supervisor", broken: "Schedule's supervisors read from /api/users alone" },
  { id: "page/pickers/the-stub-answers-the-staff-list-to-an-admin/" + lang, what: "the stub answers GET /api/users with a 200 to an admin", broken: "the stub refusing the list to everyone" },
]), []);
// Every printed page on a page taken as done, opened and read in both languages: in English it opens
// and carries its words, and in Spanish the English check finds nothing left in it.
const PRINTS = ["en", "es"].reduce((out, lang) => out.concat([
  { id: "page/prints/sites/chat-history/" + lang, what: "a site's chat history, printed" },
  { id: "page/prints/sites/timeline/" + lang, what: "a site's timeline, printed" },
  { id: "page/prints/sites/record/" + lang, what: "a record from a site's timeline, printed" },
  { id: "page/prints/reports/issue-timing/" + lang, what: "the issue report, printed" },
  { id: "page/prints/reports/supply-usage/" + lang, what: "the supply report, printed" },
  { id: "page/prints/reports/inspection-quality/" + lang, what: "the inspection report, printed" },
  { id: "page/prints/staff/record/" + lang, what: "a record from a person's timeline, printed" },
  { id: "page/prints/staff/timeline/" + lang, what: "a person's timeline, printed" },
  { id: "page/prints/staff/profile-report/" + lang, what: "a person's profile report, printed" },
  { id: "page/prints/settings/role-reference/" + lang, what: "the role reference, printed" },
  { id: "page/prints/hr/attendance-sheet/" + lang, what: "a training session's attendance sheet, printed" },
]), []);
// Each report's screen and its charts, read as each person Reports opens for, and each save the report
// editor makes, which sends the same body in either language.
const REPORT_SCREENS = ["en", "es"].reduce((out, lang) => {
  ["issue-timing", "supply-usage", "inspection-quality"].forEach((r) => ["admin", "supervisor"].forEach((who) => {
    out.push({ id: "page/report-screens/" + r + "/" + who + "/" + lang, what: "the " + r + " report's screen, as the " + who });
    out.push({ id: "page/report-screens/" + r + "/charts/" + who + "/" + lang, what: "the " + r + " report's charts, as the " + who });
  }));
  ["a-new-report-saves-the-same-body", "an-edit-saves-the-same-body", "a-copy-saves-the-same-body"].forEach((s) => {
    out.push({ id: "reports/editor/" + s + "/" + lang, what: "the report editor: " + s.replace(/-/g, " ") });
  });
  return out;
}, []);
// Forms is in the menu for anyone the Forms page opens for, by the page's own test.
const FORMS_MENU = [
  { id: "page/forms/in-the-menu/supervisor", what: "a supervisor the forms API lets in sees Forms in the sidebar and opens Filed forms from it" },
  { id: "page/forms/not-in-the-menu/capability", what: "a supervisor the forms API turns away does not see Forms" },
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
  { id: "language/an-inventory-choice-reads-its-label-and-sends-its-code", what: "Inventory's category and unit pickers read each choice's shown label, and Add Supply and Edit Supply hold and send the codes" },
  { id: "language/a-supply-card-draws-its-choices-as-words", what: "a supply's card on Inventory draws its category and unit as the lookups' shown labels" },
  { id: "language/a-service-category-reads-the-table", what: "the Service Catalog's cards draw each service's category as the table's word for its label" },
  { id: "language/a-count-of-one-reads-in-the-one-form", what: "the no-show count under Callouts on Shift Pickup reads the one form at one" },
  { id: "language/a-filed-answer-is-drawn-as-filed", what: "the filed report window draws a form's own questions and answers exactly as the API sent them, an answer with a bar in it included" },
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
  // Step 159: a table a person adds rows to, on the supervisor half.
  { id: "filed-forms/add-row-is-offered-on-an-added-rows-table", name: "A writable table with no declared rows offers Add row" },
  { id: "filed-forms/a-table-with-a-floor-starts-with-its-rows", name: "A table with a floor draws that many rows from the start, with no Remove row" },
  { id: "filed-forms/add-row-adds-a-row", name: "A tap on Add row adds an open row and each row above the floor offers Remove row" },
  { id: "filed-forms/remove-row-takes-a-row-out", name: "Remove row takes its row out and is not offered at the floor" },
  { id: "filed-forms/a-full-table-says-so", name: "A table at its maxRows says This table is full. in place of Add row" },
  { id: "filed-forms/save-sends-the-filled-row-and-not-the-empty-one", name: "Save sends the filled row and drops the row with no cell filled" },
  { id: "filed-forms/an-emptied-table-sends-null", name: "A table left with no filled row is sent as null" },
  { id: "filed-forms/the-saved-rows-are-drawn-after-the-answer", name: "The rows the API answered are drawn in the table after Save" },
  { id: "filed-forms/the-tables-fit-a-phone", name: "At 390 the row controls are 44 by 44 and the tables scroll inside their boxes" },
  // Step 159: the filed form grouped by its sections when the API sends them.
  { id: "filed-forms/sections-draw-their-titles-and-help", name: "With sections sent, both halves draw each section's title and help" },
  { id: "filed-forms/a-field-in-no-listed-section-draws-flat", name: "A field whose section the list does not name draws flat" },
  { id: "filed-forms/no-sections-draw-no-titles", name: "Without the keys the window draws no section title" },
  { id: "filed-forms/the-sections-fit-a-phone", name: "At 390 the section titles do not push the window wider than the screen" },
  // Step 159: the batch two forms named in the Filed forms filter.
  { id: "filed-forms/the-filter-names-the-batch-two-forms", name: "The filter names the five batch two forms by the table's word" },
];

// ---------------------------------------------------------------------------
// Step 165: photos on a filed form, and the signature box. Each is driven in English and in
// Spanish, since the refusals under a question and the words in the box come from the table.
// ---------------------------------------------------------------------------
const FILED_PHOTO_STATES = [
  { id: "filed-photos/thumbnails-are-drawn", name: "A photos question draws one thumbnail per photo with its name under it" },
  { id: "filed-photos/no-photos-reads-so", name: "A photos question with nothing on it reads No photos" },
  { id: "filed-photos/the-overlay-opens", name: "A tap on a thumbnail opens the full image in the window's own overlay with Close" },
  { id: "filed-photos/the-overlay-closes", name: "Close puts the overlay away and leaves the window open" },
  { id: "filed-photos/a-writer-is-offered-add-photos", name: "A writer of the supervisor half is offered Add photos on its photos question and nothing on the filed half's" },
  { id: "filed-photos/a-writer-uploads", name: "Picking two photos sends one multipart request and draws the two the API answered as { key, photos }" },
  { id: "filed-photos/uploading-reads-so", name: "While the upload is in flight the button reads Uploading..." },
  { id: "filed-photos/the-full-line", name: "At maxPhotos the line This question is full. stands where Add photos was" },
  { id: "filed-photos/a-writer-removes", name: "Remove photo sends one request with the photo's id and draws what the API answered" },
  { id: "filed-photos/a-non-writer-sees-no-add-photos", name: "A person who may not write the supervisor half sees the thumbnails and no Add photos or Remove photo" },
  { id: "filed-photos/the-controls-fit", name: "Every control on a photos question is at least 44 by 44 and the window does not run off the side" },
  // Step 169: every photo refusal is drawn in the API's own words as sent, matched on its code only
  // to place the line. The codes are the ones routes/forms.js sends.
  { id: "filed-photos/refusal/forms.photoTooLarge", name: "The refusal forms.photoTooLarge is drawn under the question in the API's own words" },
  { id: "filed-photos/refusal/forms.photoType", name: "The refusal forms.photoType is drawn under the question in the API's own words" },
  { id: "filed-photos/refusal/forms.photoHeic", name: "The refusal forms.photoHeic is drawn under the question in the API's own words" },
  { id: "filed-photos/refusal/forms.photoUnreadable", name: "The refusal forms.photoUnreadable is drawn under the question in the API's own words" },
  { id: "filed-photos/refusal/forms.photoLimit", name: "The refusal forms.photoLimit is drawn under the question in the API's own words" },
  { id: "filed-photos/refusal/forms.photoNoFile", name: "The refusal forms.photoNoFile is drawn under the question in the API's own words" },
  { id: "filed-photos/refusal/forms.notAPhotosQuestion", name: "The refusal forms.notAPhotosQuestion is drawn under the question in the API's own words" },
  { id: "filed-photos/refusal/forms.photosByRoute", name: "The refusal forms.photosByRoute is drawn under the question in the API's own words" },
  { id: "filed-photos/refusal/forms.photoNotFound", name: "The refusal forms.photoNotFound is drawn under the question in the API's own words on a removal" },
  { id: "filed-photos/refusal/unknown-code", name: "A refusal with a code nobody listed is drawn in the API's own words the same way" },
  { id: "filed-signature/the-box-is-drawn", name: "Sign opens the box: the sign-off's label, a white canvas, the baseline, the hint, Clear and a Sign that is off" },
  { id: "filed-signature/refused-empty", name: "With nothing drawn Sign cannot be pressed and no request goes" },
  { id: "filed-signature/a-path-turns-sign-on", name: "A pointer path in the box turns Sign on, and Clear turns it off again" },
  { id: "filed-signature/accepted-with-a-pointer-path", name: "Sign sends the key and the drawing as a PNG data URL under 300 KB, and the stamp is drawn after the answer" },
  { id: "filed-signature/the-stamp-image-is-drawn", name: "A stamp that carries a signature draws its image about 48 pixels high above Signed by" },
  { id: "filed-signature/a-stamp-without-one-draws-nothing", name: "A stamp with no signature draws no image" },
  { id: "filed-signature/the-api-refusal-is-in-the-box", name: "A refused signature is drawn in the box in the API's own words, with the box still open" },
  { id: "filed-signature/the-box-fits-a-phone", name: "At 390 the canvas takes the whole width and every control in the box is 44 by 44" },
];

// ---------------------------------------------------------------------------
// Step 166: starting and filing a form from the dashboard, in English and in Spanish.
// ---------------------------------------------------------------------------
const START_FORM = [
  { id: "start-form/the-button-is-offered", name: "Filed forms offers Start a form to a person the API lists a startable form for" },
  { id: "start-form/the-picker-lists-what-the-api-lists", name: "The picker lists the startable forms the API lists, by title in the screen's language, and nothing else" },
  { id: "start-form/nothing-for-a-person-with-none", name: "A person the API lists no startable form for is offered no Start a form" },
  { id: "start-form/a-form-is-started", name: "Picking a form starts it, sending no source since the API sets its own, and opens the window on section one" },
  { id: "start-form/two-sections-answered-and-saved", name: "Two sections are answered and each saved through the draft route, with a governed question appearing on its answer" },
  { id: "start-form/a-required-question-left-blank-is-named", name: "A required question left blank is named on the review and holds Send off" },
  { id: "start-form/a-table-row-added", name: "A row added to a table is saved with what was typed in it" },
  { id: "start-form/a-photo-added", name: "A photo picked on the form goes up on its own request and is drawn" },
  { id: "start-form/the-sign-off-is-drawn-and-made", name: "The filer's sign-off is made in the signature box and its stamp drawn" },
  { id: "start-form/the-filing-is-sent", name: "Send asks first, sends the filing, says so, and the filing is listed under Submitted" },
  { id: "start-form/a-draft-is-resumed", name: "A window closed part way saves and keeps its draft, which Unfinished lists with Continue and reopens where it was" },
  { id: "start-form/refusal/start", name: "A refused start is drawn in the picker in the API's words" },
  { id: "start-form/refusal/save", name: "A refused save is drawn in the window in the API's words, with Check this answer under the question it names" },
  { id: "start-form/refusal/send", name: "A Send the API would refuse is held off by the missing list the API answers" },
  { id: "start-form/refusal/sign", name: "A refused sign-off is drawn in the box in the API's words" },
  { id: "start-form/refusal/photo", name: "A refused photo is drawn under the question in the API's own words as sent" },
  { id: "start-form/refusal/continue", name: "A draft the API will not hand over is refused on the tab in the API's words" },
  // Step 169: the customer's signature on a form filled at a desk.
  { id: "start-form/customer-signature/the-card-is-drawn", name: "A customer signature question draws a card: Name, Role, the pad, Save signature off until something is drawn, and Clear" },
  { id: "start-form/customer-signature/saved", name: "Save signature sends the key, the name, the role and the drawing to the customer signature route, and nothing else" },
  { id: "start-form/customer-signature/shown", name: "After the answer the card draws the drawing and the line that says who signed, with Clear" },
  { id: "start-form/customer-signature/never-in-a-save", name: "A draft save carries nothing for the customer's signature" },
  { id: "start-form/customer-signature/cleared-and-saved-again", name: "Clear opens the pad again and Save signature sends a second request, whose drawing is drawn" },
  { id: "start-form/customer-signature/refusal/customer.nameRequired", name: "The refusal customer.nameRequired is drawn under the card in the API's words" },
  { id: "start-form/customer-signature/refusal/forms.signatureRequired", name: "The refusal forms.signatureRequired is drawn under the card in the API's words" },
  { id: "start-form/customer-signature/refusal/forms.signatureTooLarge", name: "The refusal forms.signatureTooLarge is drawn under the card in the API's words" },
  { id: "start-form/customer-signature/refusal/forms.notACustomerSignature", name: "The refusal forms.notACustomerSignature is drawn under the card in the API's words" },
  { id: "start-form/customer-signature/refusal/forms.draftNotFound", name: "The refusal forms.draftNotFound is drawn under the card in the API's words" },
];

// ---------------------------------------------------------------------------
// Step 169: customer links and their QR codes, and a customer's filings in Filed forms, in English
// and in Spanish.
// ---------------------------------------------------------------------------
const CUSTOMER_LINKS = [
  { id: "customer-links/the-button-is-offered-to-an-admin", name: "Filed forms offers Customer links to a person who holds manage_settings" },
  { id: "customer-links/the-list-draws-every-link", name: "The window lists every link the API sends, newest first: the form's title in the screen's language, the site, the state word, the uses and the last use" },
  { id: "customer-links/each-row-offers-its-buttons", name: "A live link offers Show QR code, Copy link and Turn off; one off or expired offers Turn on in its place" },
  { id: "customer-links/a-new-link-is-made", name: "New link sends the form and the site, and the link the API made opens on its QR screen" },
  { id: "customer-links/an-existing-pair-opens-its-link", name: "Asking for a pair that has a live link opens that link's QR screen and adds no row" },
  { id: "customer-links/turned-off", name: "Turn off sends the request and the row reads Off with Turn on" },
  { id: "customer-links/turned-on", name: "Turn on sends the request and the row reads Live with Turn off" },
  { id: "customer-links/refusal/customer.anotherLinkLive", name: "A refused Turn on is drawn under its row in the API's own words, with the row as it was" },
  { id: "customer-links/refusal/customer.siteNotFound", name: "A refused New link is drawn under the controls in the API's own words" },
  { id: "customer-links/the-qr-screen", name: "Show QR code draws the API's PNG at its full size, the site, the form's title in both languages, the address in small type, and Print, Copy link, Back and Close" },
  { id: "customer-links/copy-link", name: "Copy link puts the address on the clipboard and the button reads Copied" },
  { id: "customer-links/the-print-sheet", name: "Print opens one sheet: the logo, the site, the form's title, the QR code at 512, the scan line in English and in Spanish, and the address" },
  { id: "customer-links/a-supervisor-sees-no-button", name: "A supervisor, who does not hold manage_settings, is offered no Customer links" },
  { id: "customer-links/the-window-fits-a-phone", name: "At 390 the list and the QR screen fit the screen and every control is 44 by 44" },
  { id: "customer-filing/the-row-reads-customer", name: "A customer's filing reads Customer in the filed-by column, with the customer's name and role under it" },
  { id: "customer-filing/the-header-names-the-customer", name: "The review window's header says Customer and names the customer and their role in place of a staff name" },
  { id: "customer-filing/the-signature-is-drawn", name: "A customer's signature draws its drawing above the line the API sends for it" },
  { id: "customer-filing/a-number-box-sends-a-number", name: "A number question in the supervisor section is a number box, prefilled, and Save sends a number" },
  { id: "customer-filing/the-averages-are-drawn", name: "The survey's section averages and overall draw under the answers, one decimal, by section title" },
];

module.exports = { START_FORM, CUSTOMER_LINKS, PAGES, VIEWS, WINDOWS, TABLES, REPORTS, EXPORTS, DECISIONS, REFUSALS, HOUSE_STYLE, ASCII_ONLY, WORD_TABLE, WORD_KEYS, WORD_SLOTS, FINDER_PRINTS, DONE_PAGES_READ_NO_ENGLISH, TODO_NAMES_PRINTS, LANGUAGE_HEADER, LANGUAGE_LOCALE, DISPLAY_FIELDS, HELP_FIT, HELP_STREAM, CHECKLIST_EDITOR, FORMS_MENU, HR_ROLES, QUESTIONS, ZONE_CHIPS, PRINTS, REPORT_SCREENS, WINDOW_STATES, FILED_FORM_STATES, FILED_PHOTO_STATES, TRAINING_ROOM, PICKERS };
