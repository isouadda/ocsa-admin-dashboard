OCSA Admin Dashboard - Claude Code Project Guide
What this is
React single-page admin dashboard for the OCSA operations platform. Create React App (react-scripts 5, React 18). Deployed on Vercel. Talks to the OCSA API.
Build and validate (run before every commit)
* Install: npm install
* Build, the real check: npm run build must succeed with no errors.
* Dev server: npm start
* There is no separate test suite. The production build is the gate. Report the build result after any change.
Architecture
* Single file: src/App.js. It is large, about 9,000 lines. All pages and components live here.
* Pages render off a page state value, registered in pageLabels and a render switch. The sidebar nav is a grouped array of items, each with id, label, and icon.
* Shared primitives: Crd (card), SecT (section title), Btn, Inp, Sel, Lbl, TArea, Bdg (badge), DataTable, DateRangePicker, ChartCard, and the chart wrappers LineChartW, BarChartW, DonutChartW (ApexCharts).
* Design tokens: FONT_HEAD (Montserrat), FONT_BODY (Inter), the R radius scale, the theme object t, and color consts GO GL BL RD OR GR.
* Auth fetch helper: af(path, { method, body }) returns parsed JSON and throws on error.
Conventions (hard rules)
* Edit src/App.js in place. Do not split it without explicit approval.
* After any change, run npm run build and confirm it passes. Report line counts when relevant.
* Match existing component and token names exactly. Reuse primitives, do not reinvent them.
* ASCII only in code and copy. Straight quotes. Hyphens, never em or en dashes.
* Plain, direct language in UI copy. No contrastive antithesis phrasing such as "not X, but Y."
* The word CIMS must never appear in any screen, label, or export that staff or clients see.
Reporting engine (recent work)
* The Reports page is library-first: saved report_definitions are listed, run inline, and edited in an inline editor. The issue source (key issues_timing, with issues as a legacy alias) is the only live data layer.
* Issue visuals are built as discrete reusable widgets (MetricTile, IssueTrendWidget, IssueBySiteWidget, IssueSeverityWidget) so the home dashboard can reuse them without rework.
Deploy
* Push to the connected GitHub repo. Vercel redeploys automatically.
* With Claude Code editing locally and pushing through git, the old web-editor file size limit no longer applies.
* Confirm the live site after deploy.
Client config (template model)
* Branding (name, logo, colors, EIN, address) comes from the API settings endpoint, not hardcoded. The source of truth is the company_settings table, read through /api/settings, with the use_company_settings flag controlling whether it is applied.
* When you find a hardcoded client value (company name, color fallback, email domain, ID prefix), flag it and move it to settings or a single client config module. Do not scatter new client-specific literals.
Out of scope for this repo
* API logic lives in ocsa-api.
* Database schema and migrations are handled in Supabase. Keep them out of this repo.
Approval
* Scope and get approval before building a new feature. Show a diff and wait for review before committing.
