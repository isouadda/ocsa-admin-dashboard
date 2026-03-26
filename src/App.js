import { useState, useEffect, useCallback, useRef } from "react";
const API = process.env.REACT_APP_API_URL || "https://ocsa-api-production.up.railway.app";
const SUPA_URL = "https://gcgswxyxkbummtgzgusk.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZ3N3eHl4a2J1bW10Z3pndXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjY0NTcsImV4cCI6MjA5MDA0MjQ1N30.Vbe7ueRmQ6MPZX2sqa0XHIlJD22_J7sDJ65OoQ50LaM";
async function uploadTaskMedia(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const isVideo = ["mp4", "mov", "webm", "avi"].includes(ext);
  const fileName = "task-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8) + "." + ext;
  const res = await fetch(SUPA_URL + "/storage/v1/object/task-media/" + fileName, {
    method: "POST", headers: { "Authorization": "Bearer " + SUPA_KEY, "apikey": SUPA_KEY, "Content-Type": file.type }, body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
  return { url: SUPA_URL + "/storage/v1/object/public/task-media/" + fileName, type: isVideo ? "video" : "image" };
}
async function apiFetch(path, opts = {}) {
  const h = { "Content-Type": "application/json", ...opts.headers };
  if (opts.token) h["Authorization"] = "Bearer " + opts.token;
  const r = await fetch(API + path, { ...opts, headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (r.status === 401) throw new Error("Session expired");
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "Request failed"); }
  return r.json();
}
function dlCSV(fn, hds, rows) {
  const csv = [hds.join(","), ...rows.map(r => r.map(c => '"' + String(c || "").replace(/"/g, '""') + '"').join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = fn; a.click();
}
const N = "#0A1628", NM = "#132240", NL = "#1B3058", GO = "#C8A84E", GL = "#E8D08E", GD = "rgba(200,168,78,0.12)";
const W = "#F8F7F4", GR = "#2ECC71", RD = "#E74C3C", OR = "#F39C12", BL = "#3498DB", GY = "#8899AA", GYL = "#A8B8C8", BD = "rgba(255,255,255,0.06)";
const ft = d => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
const fd = d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const ff = d => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const Ic = ({ d, sz = 18, c = "currentColor", style: s, ...p }) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s} {...p}><path d={d} /></svg>;
const HmI = p => <Ic d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" {...p} />;
const UsI = p => <Ic d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" {...p} />;
const MpI = p => <Ic d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" {...p} />;
const ClI = p => <Ic d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" {...p} />;
const ChI = p => <Ic d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...p} />;
const BrI = p => <Ic d="M18 20V10 M12 20V4 M6 20v-6" {...p} />;
const AlI = p => <Ic d="M12 2L2 22h20L12 2zm0 7v5m0 3h.01" {...p} />;
const PlI = p => <Ic d="M12 5v14M5 12h14" {...p} />;
const CkI = p => <Ic d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0v10l4 4" {...p} />;
const XI = p => <Ic d="M18 6L6 18M6 6l12 12" {...p} />;
const SnI = p => <Ic d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" {...p} />;
const LoI = p => <Ic d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" {...p} />;
const DlI = p => <Ic d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" {...p} />;
const RL = { admin: "Admin", supervisor: "Supervisor", custodial_lead: "Custodial Lead", custodial_laborer: "Custodial Laborer", day_porter: "Day Porter" };
const Tst = ({ t }) => <div style={{ position: "fixed", top: 20, right: 20, background: t.t === "error" ? RD : GR, color: W, padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 1000, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{t.m}</div>;
const Crd = ({ children, style, onClick: oc }) => <div onClick={oc} style={{ background: NM, border: "1px solid " + BD, borderRadius: 12, padding: 16, cursor: oc ? "pointer" : "default", ...style }}>{children}</div>;
const Bdg = ({ l, c }) => <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, background: c + "18", color: c }}>{l}</span>;
const SecT = ({ children, action, onAction }) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 8 }}><div style={{ fontSize: 16, fontWeight: 700 }}>{children}</div>{action && <button onClick={onAction} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "none", background: GO, color: N, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><PlI sz={13} c={N} /> {action}</button>}</div>;
const Inp = p => <input {...p} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid " + NL, background: "rgba(255,255,255,0.04)", color: W, fontSize: 13, outline: "none", fontFamily: "'DM Sans',sans-serif", ...p.style }} />;
const Sel = ({ options: o, ...p }) => <select {...p} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid " + NL, background: N, color: W, fontSize: 13, outline: "none", ...p.style }}>{o.map(x => <option key={x.v} value={x.v}>{x.l}</option>)}</select>;
const Btn = ({ children, v = "primary", ...p }) => <button {...p} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: v === "primary" ? GO : v === "danger" ? RD : NL, color: v === "primary" ? N : W, fontSize: 13, fontWeight: 700, cursor: "pointer", ...p.style }}>{children}</button>;
const Lbl = ({ children }) => <label style={{ fontSize: 10, color: GO, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, display: "block", marginBottom: 5 }}>{children}</label>;
const Mdl = ({ children, onClose: oc }) => <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={oc}><div style={{ background: NM, borderRadius: 16, border: "1px solid " + BD, maxWidth: 540, width: "100%", maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>{children}</div></div>;
const Ini = ({ name: n, sz = 36, color: c = GO }) => <div style={{ width: sz, height: sz, borderRadius: "50%", background: GD, border: "1.5px solid " + c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.35, fontWeight: 700, color: c, flexShrink: 0 }}>{n?.split(" ").map(x => x[0]).join("")}</div>;
const SC = ({ label, value, sub, color: c = GO, icon: I }) => <Crd style={{ flex: 1, minWidth: 140 }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontSize: 10, color: GY, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>{label}</div><div style={{ fontSize: 28, fontWeight: 700, color: c, marginTop: 4 }}>{value}</div>{sub && <div style={{ fontSize: 11, color: GYL, marginTop: 2 }}>{sub}</div>}</div>{I && <I sz={20} c={c} style={{ opacity: 0.5 }} />}</div></Crd>;

export default function AdminDashboard() {
  const [token, setToken] = useState(null); const [user, setUser] = useState(null);
  const [page, setPage] = useState("overview"); const [toast, setToast] = useState(null); const [loading, setLoading] = useState(false);
  const showToast = useCallback((m, t = "success") => { setToast({ m, t }); setTimeout(() => setToast(null), 3000); }, []);
  const af = useCallback((path, opts = {}) => apiFetch(path, { ...opts, token }), [token]);
  const handleLogin = async (phone, pin) => {
    setLoading(true);
    try { const d = await apiFetch("/api/auth/login", { method: "POST", body: { phone, pin } }); if (d.user.role !== "admin" && d.user.role !== "supervisor") { showToast("Admin access required", "error"); setLoading(false); return; } setToken(d.token); setUser(d.user); showToast("Welcome, " + d.user.firstName); } catch (e) { showToast(e.message, "error"); }
    setLoading(false);
  };
  if (!token) return (<div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: N, fontFamily: "'DM Sans',sans-serif", color: W, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
    <div style={{ textAlign: "center", marginBottom: 40 }}><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, color: GO }}>OCSA</div><div style={{ fontSize: 12, color: GYL, letterSpacing: "3px", textTransform: "uppercase", marginTop: 4 }}>Admin Dashboard</div><div style={{ fontSize: 10, color: GR, marginTop: 12 }}>Connected to Live API</div></div>
    <LoginForm onLogin={handleLogin} loading={loading} />
    {toast && <Tst t={toast} />}
    <style>{`*{box-sizing:border-box}input::placeholder{color:${GY}}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
  </div>);
  const BxI = p => <Ic d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" {...p} />;
  const nav = [{ id: "overview", l: "Overview", i: HmI }, { id: "staff", l: "Staff", i: UsI }, { id: "sites", l: "Sites", i: MpI }, { id: "operations", l: "Live Ops", i: ClI }, { id: "issues", l: "Issues", i: AlI }, { id: "supplies", l: "Supplies", i: BxI }, { id: "chat", l: "Messages", i: ChI }, { id: "reports", l: "Reports", i: BrI }];
  return (<div style={{ width: "100%", maxWidth: 960, margin: "0 auto", minHeight: "100vh", background: N, fontFamily: "'DM Sans',sans-serif", color: W }}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
    <div style={{ background: NM, padding: "12px 20px", borderBottom: "1px solid " + BD, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: GO }}>OCSA</span><div style={{ width: 1, height: 24, background: NL }} /><span style={{ fontSize: 13, color: GYL }}>Admin Dashboard</span><span style={{ fontSize: 9, color: GR, background: "rgba(46,204,113,0.1)", padding: "2px 8px", borderRadius: 10 }}>LIVE</span></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 12, color: GY }}>{user?.firstName}</span><button onClick={() => { setToken(null); setUser(null); }} style={{ background: "none", border: "none", cursor: "pointer" }}><LoI sz={16} c={GY} /></button></div>
    </div>
    <div style={{ display: "flex", gap: 2, padding: "8px 12px", background: N, borderBottom: "1px solid " + BD, overflowX: "auto" }}>
      {nav.map(n => { const a = page === n.id; const NI = n.i; return <button key={n.id} onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: a ? GD : "transparent", color: a ? GO : GY, fontSize: 12, fontWeight: a ? 700 : 500, cursor: "pointer", border: a ? "1px solid rgba(200,168,78,0.25)" : "1px solid transparent", whiteSpace: "nowrap" }}><NI sz={15} c={a ? GO : GY} />{n.l}</button>; })}
    </div>
    <div style={{ padding: "16px 16px 40px" }}>
      {page === "overview" && <OverviewPage af={af} showToast={showToast} setPage={setPage} />}
      {page === "staff" && <StaffPage af={af} showToast={showToast} />}
      {page === "sites" && <SitesPage af={af} showToast={showToast} />}
      {page === "operations" && <OpsPage af={af} />}
      {page === "issues" && <IssuesPage af={af} showToast={showToast} />}
      {page === "supplies" && <SuppliesAdminPage af={af} showToast={showToast} />}
      {page === "chat" && <ChatPage af={af} user={user} />}
      {page === "reports" && <ReportsPage af={af} showToast={showToast} />}
    </div>
    {toast && <Tst t={toast} />}
    <style>{`*{box-sizing:border-box}input::placeholder,textarea::placeholder{color:${GY}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${NL};border-radius:2px}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
  </div>);
}

function LoginForm({ onLogin, loading }) {
  const [ph, setPh] = useState(""); const [pn, setPn] = useState("");
  return (<><div style={{ marginBottom: 16 }}><Lbl>Phone or Email</Lbl><Inp value={ph} onChange={e => setPh(e.target.value)} placeholder="2150000000 or name@email.com" onKeyDown={e => e.key === "Enter" && onLogin(ph, pn)} /></div>
    <div style={{ marginBottom: 24 }}><Lbl>PIN</Lbl><Inp value={pn} onChange={e => setPn(e.target.value)} type="password" maxLength={4} style={{ letterSpacing: "8px", textAlign: "center", fontSize: 20 }} onKeyDown={e => e.key === "Enter" && onLogin(ph, pn)} /></div>
    <button onClick={() => onLogin(ph, pn)} disabled={loading} style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${GO},${GL})`, color: N, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "Signing in..." : "Sign In"}</button>
    <div style={{ marginTop: 32, padding: 14, borderRadius: 10, background: "rgba(200,168,78,0.06)", border: "1px solid rgba(200,168,78,0.15)" }}>
      <button onClick={() => { setPh("215-000-0000"); setPn("0000"); }} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "6px 0", background: "none", border: "none", cursor: "pointer", color: W }}><span style={{ fontSize: 12, fontWeight: 600 }}>Ibrahim (Admin)</span><span style={{ fontSize: 10, color: GY, fontFamily: "monospace" }}>PIN: 0000</span></button>
    </div></>);
}

function OverviewPage({ af, showToast, setPage }) {
  const [stats, setStats] = useState(null); const [active, setActive] = useState([]);
  useEffect(() => { af("/api/reports/overview").then(setStats).catch(e => showToast(e.message, "error")); af("/api/clock/active").then(setActive).catch(() => {}); }, []);
  if (!stats) return <div style={{ padding: 40, textAlign: "center", color: GY }}>Loading...</div>;
  return (<div>
    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Welcome back, Ibrahim</div>
    <div style={{ fontSize: 13, color: GYL, marginBottom: 20 }}>Operations overview.</div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
      <SC label="On Site" value={stats.clockedInNow} sub={"of " + stats.activeStaff + " active"} color={GR} icon={CkI} />
      <SC label="Open Issues" value={stats.openIssues} color={stats.openIssues > 0 ? RD : GR} icon={AlI} />
      <SC label="Pending" value={stats.pendingStaff} color={stats.pendingStaff > 0 ? OR : GR} icon={UsI} />
      <SC label="Week Hours" value={stats.weekHoursTotal + "h"} color={GO} icon={BrI} />
    </div>
    <SecT>Live Operations</SecT>
    <Crd style={{ marginBottom: 20 }}>
      {active.length === 0 && <div style={{ fontSize: 13, color: GY }}>No staff on site right now.</div>}
      {active.map(s => { const h = Math.floor(s.elapsedMinutes / 60), m = s.elapsedMinutes % 60, pct = s.tasksTotal > 0 ? Math.round(s.tasksCompleted / s.tasksTotal * 100) : 0; return (
        <div key={s.shiftId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid " + BD }}>
          <Ini name={s.name} /><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 11, color: GYL }}>{s.siteName}</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, fontWeight: 600, color: GR }}>{h}h {m}m</div><div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}><div style={{ width: 60, height: 4, borderRadius: 2, background: NL, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, background: pct === 100 ? GR : GO, width: pct + "%" }} /></div><span style={{ fontSize: 10, color: GY }}>{s.tasksCompleted}/{s.tasksTotal}</span></div></div>
        </div>); })}
    </Crd>
    {(stats.pendingStaff > 0 || stats.openIssues > 0) && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {stats.pendingStaff > 0 && <button onClick={() => setPage("staff")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: "rgba(243,156,18,0.08)", border: "1px solid rgba(243,156,18,0.2)", color: OR, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><UsI sz={16} c={OR} />{stats.pendingStaff} pending</button>}
      {stats.openIssues > 0 && <button onClick={() => setPage("issues")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)", color: RD, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><AlI sz={16} c={RD} />{stats.openIssues} open issues</button>}
    </div>}
  </div>);
}

function StaffPage({ af, showToast }) {
  const [staff, setStaff] = useState([]); const [filter, setFilter] = useState("all"); const [addForm, setAddForm] = useState(null);
  const [detail, setDetail] = useState(null); const [sites, setSites] = useState([]); const [assignForm, setAssignForm] = useState(null);
  const [editForm, setEditForm] = useState(null); const [resetPin, setResetPin] = useState(null); const [newPin, setNewPin] = useState(""); const [addCert, setAddCert] = useState(null);
  const load = () => { af("/api/users").then(setStaff).catch(e => showToast(e.message, "error")); af("/api/sites").then(setSites).catch(() => {}); };
  useEffect(() => { load(); }, []);
  const filtered = filter === "all" ? staff : staff.filter(s => filter === "inactive" ? (s.status === "inactive" || s.status === "terminated") : s.status === filter);
  const approve = async id => { try { await af("/api/users/" + id + "/approve", { method: "POST" }); showToast("Approved"); load(); } catch (e) { showToast(e.message, "error"); } };
  const submitAdd = async () => { if (!addForm.firstName || !addForm.phone || !addForm.email) { showToast("Name, phone, and email required", "error"); return; } try { const d = await af("/api/users", { method: "POST", body: addForm }); showToast("Added. Temp PIN: " + d.tempPin); setAddForm(null); load(); } catch (e) { showToast(e.message, "error"); } };
  const viewDetail = async id => { try { const d = await af("/api/users/" + id); setDetail(d); } catch (e) { showToast(e.message, "error"); } };
  const updateStatus = async (id, s) => { try { await af("/api/users/" + id, { method: "PATCH", body: { status: s } }); showToast("Updated"); setDetail(null); load(); } catch (e) { showToast(e.message, "error"); } };
  const assignSite = async () => { if (!assignForm.siteId) { showToast("Select a site", "error"); return; } try { await af("/api/users/" + assignForm.userId + "/assign-site", { method: "POST", body: { siteId: assignForm.siteId, roleAtSite: assignForm.role, shiftName: assignForm.shift, shiftStart: assignForm.start, shiftEnd: assignForm.end } }); showToast("Assigned"); setAssignForm(null); viewDetail(assignForm.userId); } catch (e) { showToast(e.message, "error"); } };
  const unassign = async (uid, sid) => { try { await af("/api/users/" + uid + "/unassign-site/" + sid, { method: "DELETE" }); showToast("Removed"); viewDetail(uid); } catch (e) { showToast(e.message, "error"); } };
  const submitResetPin = async (userId) => { if (!newPin || newPin.length !== 4) { showToast("PIN must be 4 digits", "error"); return; } try { const d = await af("/api/users/" + userId + "/reset-pin", { method: "POST", body: { newPin } }); showToast(d.message); setResetPin(null); setNewPin(""); } catch (e) { showToast(e.message, "error"); } };
  const submitEdit = async () => { try { await af("/api/users/" + editForm.id, { method: "PATCH", body: { firstName: editForm.firstName, lastName: editForm.lastName, phone: editForm.phone, email: editForm.email, role: editForm.role, hourlyRate: editForm.hourlyRate } }); showToast("User updated"); setEditForm(null); load(); if (detail) viewDetail(editForm.id); } catch (e) { showToast(e.message, "error"); } };
  return (<div>
    <SecT action="Add Staff" onAction={() => setAddForm({ firstName: "", lastName: "", phone: "", email: "", role: "custodial_laborer" })}>Staff Management</SecT>
    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>{["all", "active", "pending", "inactive"].map(f => <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: 6, background: filter === f ? GD : "transparent", color: filter === f ? GO : GY, fontSize: 11, fontWeight: filter === f ? 700 : 500, cursor: "pointer", textTransform: "capitalize", border: filter === f ? "1px solid rgba(200,168,78,0.25)" : "1px solid transparent" }}>{f}</button>)}</div>
    {filtered.map(s => <Crd key={s.id} style={{ marginBottom: 8, padding: 12 }} onClick={() => viewDetail(s.id)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Ini name={s.name} sz={36} color={s.status === "pending" ? OR : GO} /><div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span><Bdg l={s.status} c={s.status === "active" ? GR : s.status === "pending" ? OR : RD} /></div><div style={{ fontSize: 11, color: GYL, marginTop: 2 }}>{RL[s.role] || s.role} | {s.phone}</div><div style={{ fontSize: 10, color: GY, marginTop: 2 }}>{s.sites?.length > 0 ? s.sites.map(x => x.siteName).join(", ") : "No sites"}</div></div>
      {s.status === "pending" && <button onClick={e => { e.stopPropagation(); approve(s.id); }} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: GR, color: W, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Approve</button>}</div>
    </Crd>)}
    {addForm && <Mdl onClose={() => setAddForm(null)}><div style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Add New Staff</div><button onClick={() => setAddForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      <div style={{ marginBottom: 12 }}><Lbl>First Name *</Lbl><Inp value={addForm.firstName} onChange={e => setAddForm({ ...addForm, firstName: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Last Name</Lbl><Inp value={addForm.lastName} onChange={e => setAddForm({ ...addForm, lastName: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Phone *</Lbl><Inp value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} placeholder="2155550000 (no dashes needed)" /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Email *</Lbl><Inp value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="name@email.com" type="email" /></div>
      <div style={{ marginBottom: 16 }}><Lbl>Role</Lbl><Sel value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} options={[{ v: "custodial_laborer", l: "Custodial Laborer" }, { v: "custodial_lead", l: "Custodial Lead" }, { v: "day_porter", l: "Day Porter" }, { v: "supervisor", l: "Supervisor" }]} /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setAddForm(null)}>Cancel</Btn><Btn onClick={submitAdd}>Add Staff</Btn></div></div></Mdl>}
    {detail && <Mdl onClose={() => setDetail(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><Ini name={detail.user.firstName + " " + detail.user.lastName} sz={48} /><div><div style={{ fontSize: 18, fontWeight: 700 }}>{detail.user.firstName} {detail.user.lastName}</div><div style={{ fontSize: 12, color: GO }}>{RL[detail.user.role]}</div></div></div><button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: GY }}>Phone<div style={{ color: W, fontWeight: 500, marginTop: 2 }}>{detail.user.phone}</div></div>
        <div style={{ fontSize: 11, color: GY }}>Email<div style={{ color: W, fontWeight: 500, marginTop: 2 }}>{detail.user.email || "Not set"}</div></div>
        <div style={{ fontSize: 11, color: GY }}>Status<div style={{ marginTop: 2 }}><Bdg l={detail.user.status} c={detail.user.status === "active" ? GR : OR} /></div></div>
        <div style={{ fontSize: 11, color: GY }}>Role<div style={{ color: W, fontWeight: 500, marginTop: 2 }}>{RL[detail.user.role]}</div></div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: GO, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Certifications</div>
          <button onClick={() => setAddCert({ userId: detail.user.id, certName: "", certType: "certification", issuingBody: "", issuedDate: "", expiryDate: "" })} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: GO, fontSize: 10, cursor: "pointer" }}><PlI sz={10} c={GO} /> Add</button>
        </div>
        {(!detail.certifications || detail.certifications.length === 0) && <div style={{ fontSize: 11, color: GY }}>No certifications on file</div>}
        {detail.certifications?.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "rgba(46,204,113,0.04)", borderRadius: 6, marginBottom: 3, border: "1px solid rgba(46,204,113,0.1)" }}>
          <div><span style={{ fontSize: 11, color: GR, fontWeight: 500 }}>{c.cert_name}</span>{c.expiry_date && <span style={{ fontSize: 9, color: GY, marginLeft: 8 }}>Exp: {fd(c.expiry_date)}</span>}</div>
          <button onClick={async () => { try { await af("/api/users/" + detail.user.id + "/certifications/" + c.id, { method: "DELETE" }); showToast("Removed"); viewDetail(detail.user.id); } catch (e) { showToast(e.message, "error"); } }} style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 8, cursor: "pointer" }}>Remove</button>
        </div>)}
      </div>
      <div style={{ marginBottom: 16 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><div style={{ fontSize: 10, color: GO, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Site Assignments</div><button onClick={() => setAssignForm({ userId: detail.user.id, siteId: "", role: "", shift: "", start: "", end: "" })} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: GO, fontSize: 10, cursor: "pointer" }}><PlI sz={10} c={GO} /> Assign</button></div>
        {detail.assignments?.filter(a => a.is_active).map((a, i) => <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px", background: "rgba(255,255,255,0.02)", borderRadius: 6, marginBottom: 4 }}><div><div style={{ fontSize: 12, fontWeight: 600 }}>{a.site_name || "Site"}</div><div style={{ fontSize: 10, color: GY, marginTop: 2 }}>{a.role_at_site || "No role"} | {a.shift_name || "No shift"}</div></div><button onClick={() => unassign(detail.user.id, a.site_id)} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 9, cursor: "pointer" }}>Remove</button></div>)}
        {(!detail.assignments || detail.assignments.filter(a => a.is_active).length === 0) && <div style={{ fontSize: 11, color: GY }}>No sites assigned</div>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn v="ghost" style={{ flex: 1 }} onClick={() => setEditForm({ id: detail.user.id, firstName: detail.user.firstName, lastName: detail.user.lastName, phone: detail.user.phone, email: detail.user.email, role: detail.user.role, hourlyRate: detail.user.hourlyRate || "" })}>Edit Info</Btn>
        <Btn v="ghost" style={{ flex: 1 }} onClick={() => { setResetPin(detail.user.id); setNewPin(""); }}>Reset PIN</Btn>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        {detail.user.status === "active" && <Btn v="danger" style={{ flex: 1 }} onClick={() => updateStatus(detail.user.id, "inactive")}>Deactivate</Btn>}
        {detail.user.status === "inactive" && <Btn style={{ flex: 1 }} onClick={() => updateStatus(detail.user.id, "active")}>Reactivate</Btn>}
        {detail.user.status === "pending" && <Btn style={{ flex: 1 }} onClick={() => { approve(detail.user.id); setDetail(null); }}>Approve</Btn>}
      </div></div></Mdl>}
    {resetPin && <Mdl onClose={() => setResetPin(null)}><div style={{ padding: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Reset PIN</div>
      <div style={{ fontSize: 12, color: GYL, marginBottom: 12 }}>Enter a new 4-digit PIN for this staff member. Share it with them directly or send it to their email.</div>
      <div style={{ marginBottom: 16 }}><Lbl>New PIN (4 digits)</Lbl><Inp value={newPin} onChange={e => setNewPin(e.target.value)} maxLength={4} placeholder="0000" style={{ letterSpacing: "8px", textAlign: "center", fontSize: 20 }} /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setResetPin(null)}>Cancel</Btn><Btn onClick={() => submitResetPin(resetPin)}>Reset PIN</Btn></div>
    </div></Mdl>}
    {editForm && <Mdl onClose={() => setEditForm(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Edit Staff Info</div><button onClick={() => setEditForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      <div style={{ marginBottom: 12 }}><Lbl>First Name</Lbl><Inp value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Last Name</Lbl><Inp value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Phone</Lbl><Inp value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Email</Lbl><Inp value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} type="email" /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Role</Lbl><Sel value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} options={[{ v: "custodial_laborer", l: "Custodial Laborer" }, { v: "custodial_lead", l: "Custodial Lead" }, { v: "day_porter", l: "Day Porter" }, { v: "supervisor", l: "Supervisor" }, { v: "admin", l: "Admin" }]} /></div>
      <div style={{ marginBottom: 16 }}><Lbl>Hourly Rate</Lbl><Inp value={editForm.hourlyRate} onChange={e => setEditForm({ ...editForm, hourlyRate: e.target.value })} placeholder="0.00" type="number" /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setEditForm(null)}>Cancel</Btn><Btn onClick={submitEdit}>Save Changes</Btn></div>
    </div></Mdl>}
    {assignForm && <Mdl onClose={() => setAssignForm(null)}><div style={{ padding: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Assign to Site</div>
      <div style={{ marginBottom: 12 }}><Lbl>Site *</Lbl><Sel value={assignForm.siteId} onChange={e => setAssignForm({ ...assignForm, siteId: e.target.value })} options={[{ v: "", l: "Select..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Role at Site</Lbl><Inp value={assignForm.role} onChange={e => setAssignForm({ ...assignForm, role: e.target.value })} placeholder="e.g. Custodial Lead" /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Shift</Lbl><Inp value={assignForm.shift} onChange={e => setAssignForm({ ...assignForm, shift: e.target.value })} placeholder="e.g. Night" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}><div><Lbl>Start</Lbl><Inp type="time" value={assignForm.start} onChange={e => setAssignForm({ ...assignForm, start: e.target.value })} /></div><div><Lbl>End</Lbl><Inp type="time" value={assignForm.end} onChange={e => setAssignForm({ ...assignForm, end: e.target.value })} /></div></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setAssignForm(null)}>Cancel</Btn><Btn onClick={assignSite}>Assign</Btn></div></div></Mdl>}
    {addCert && <Mdl onClose={() => setAddCert(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Add Certification</div><button onClick={() => setAddCert(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      <div style={{ marginBottom: 12 }}><Lbl>Certification Name *</Lbl><Inp value={addCert.certName} onChange={e => setAddCert({ ...addCert, certName: e.target.value })} placeholder="e.g. Green Cleaning Fundamentals" /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Type</Lbl><Sel value={addCert.certType} onChange={e => setAddCert({ ...addCert, certType: e.target.value })} options={[{ v: "certification", l: "Certification" }, { v: "training", l: "Training" }, { v: "license", l: "License" }, { v: "orientation", l: "Orientation" }]} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Issuing Body</Lbl><Inp value={addCert.issuingBody} onChange={e => setAddCert({ ...addCert, issuingBody: e.target.value })} placeholder="e.g. ISSA, OSHA" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div><Lbl>Issued Date</Lbl><Inp type="date" value={addCert.issuedDate} onChange={e => setAddCert({ ...addCert, issuedDate: e.target.value })} /></div>
        <div><Lbl>Expiry Date</Lbl><Inp type="date" value={addCert.expiryDate} onChange={e => setAddCert({ ...addCert, expiryDate: e.target.value })} /></div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setAddCert(null)}>Cancel</Btn><Btn onClick={async () => { if (!addCert.certName) { showToast("Name required", "error"); return; } try { await af("/api/users/" + addCert.userId + "/certifications", { method: "POST", body: addCert }); showToast("Certification added"); setAddCert(null); viewDetail(addCert.userId); } catch (e) { showToast(e.message, "error"); } }}>Add Certification</Btn></div>
    </div></Mdl>}
  </div>);
}

function SitesPage({ af, showToast }) {
  const [sites, setSites] = useState([]); const [exp, setExp] = useState(null); const [sd, setSd] = useState(null); const [st, setSt] = useState([]);
  const [addSite, setAddSite] = useState(null); const [addTask, setAddTask] = useState(null); const [staffList, setStaffList] = useState([]); const [editTask, setEditTask] = useState(null);
  const [showInactive, setShowInactive] = useState(false); const [deleteConfirm, setDeleteConfirm] = useState(null); const [deleteText, setDeleteText] = useState("");
  const load = () => af("/api/sites").then(setSites).catch(e => showToast(e.message, "error"));
  useEffect(() => { load(); af("/api/users?status=active").then(setStaffList).catch(() => {}); }, []);
  const expand = async id => { if (exp === id) { setExp(null); return; } setExp(id); try { const d = await af("/api/sites/" + id); setSd(d); const t = await af("/api/sites/" + id + "/tasks"); setSt(t); } catch (e) { showToast(e.message, "error"); } };
  const submitSite = async () => { if (!addSite.name || !addSite.address) { showToast("Name and address required", "error"); return; } try { await af("/api/sites", { method: "POST", body: { name: addSite.name, addressLine1: addSite.address, city: addSite.city || "Philadelphia", state: addSite.state || "PA", zipCode: addSite.zip, clientName: addSite.client, contractType: addSite.contract, primeContractor: addSite.prime } }); showToast("Site created"); setAddSite(null); load(); } catch (e) { showToast(e.message, "error"); } };
  const submitTask = async () => { if (!addTask.label || !addTask.zone) { showToast("Label and zone required", "error"); return; } try { await af("/api/sites/" + addTask.siteId + "/tasks", { method: "POST", body: { label: addTask.label, zone: addTask.zone, cimsCategory: addTask.cims, priority: addTask.pri, assignToUsers: addTask.assign ? [addTask.assign] : [], description: addTask.desc || undefined, mediaUrl: addTask.mediaUrl || undefined, mediaType: addTask.mediaType || undefined, dueDate: addTask.dueDate || undefined, dueTime: addTask.dueTime || undefined } }); showToast("Task created"); setAddTask(null); expand(addTask.siteId); } catch (e) { showToast(e.message, "error"); } };
  const submitEditTask = async () => { try { await af("/api/sites/" + editTask.siteId + "/tasks/" + editTask.id, { method: "PATCH", body: { label: editTask.label, zone: editTask.zone, priority: editTask.pri, cimsCategory: editTask.cims, description: editTask.desc, mediaUrl: editTask.mediaUrl, mediaType: editTask.mediaType, dueDate: editTask.dueDate, dueTime: editTask.dueTime } }); showToast("Task updated"); setEditTask(null); expand(editTask.siteId); } catch (e) { showToast(e.message, "error"); } };
  const delTask = async (sid, tid) => { try { await af("/api/sites/" + sid + "/tasks/" + tid, { method: "DELETE" }); showToast("Removed"); expand(sid); } catch (e) { showToast(e.message, "error"); } };
  const deactivateSite = async (id) => { try { await af("/api/sites/" + id, { method: "PATCH", body: { status: "inactive" } }); showToast("Site deactivated"); setExp(null); load(); } catch (e) { showToast(e.message, "error"); } };
  const deleteSite = async (id) => { try { await af("/api/sites/" + id, { method: "DELETE" }); showToast("Site permanently deleted"); setDeleteConfirm(null); setDeleteText(""); load(); } catch (e) { showToast(e.message, "error"); } };
  const visibleSites = showInactive ? sites : sites.filter(s => s.status === "active");
  const inactiveCount = sites.filter(s => s.status !== "active").length;
  return (<div>
    <SecT action="Add Site" onAction={() => setAddSite({ name: "", address: "", city: "Philadelphia", state: "PA", zip: "", client: "", contract: "subcontractor", prime: "" })}>Sites and Tasks</SecT>
    {inactiveCount > 0 && <div style={{ marginBottom: 12 }}><button onClick={() => setShowInactive(!showInactive)} style={{ padding: "5px 12px", borderRadius: 6, background: showInactive ? GD : "transparent", color: showInactive ? GO : GY, fontSize: 11, fontWeight: 500, cursor: "pointer", border: showInactive ? "1px solid rgba(200,168,78,0.25)" : "1px solid transparent" }}>{showInactive ? "Hide" : "Show"} inactive ({inactiveCount})</button></div>}
    {visibleSites.map(site => { const isO = exp === site.id; return <Crd key={site.id} style={{ marginBottom: 12, padding: 0 }}>
      <button onClick={() => expand(site.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", color: W, cursor: "pointer", textAlign: "left" }}>
        <MpI sz={20} c={GO} /><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{site.name}</div><div style={{ fontSize: 11, color: GYL, marginTop: 2 }}>{site.address_line1}</div><div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 10, color: GY }}>{site.staff_count != null && <span>{site.staff_count} staff</span>}{site.task_count != null && <span>{site.task_count} tasks</span>}</div></div>
        <Bdg l={site.status} c={GR} /><Ic d={isO ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} sz={16} c={GY} />
      </button>
      {isO && sd && <div style={{ padding: "0 16px 16px", borderTop: "1px solid " + BD }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "12px 0", borderBottom: "1px solid " + BD, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: GY }}>Contract<div style={{ color: W, fontWeight: 500, marginTop: 2, textTransform: "capitalize" }}>{sd.site.contract_type || "N/A"}</div></div>
          <div style={{ fontSize: 10, color: GY }}>Prime<div style={{ color: W, fontWeight: 500, marginTop: 2 }}>{sd.site.prime_contractor || "N/A"}</div></div>
          <div style={{ fontSize: 10, color: GY }}>Client<div style={{ color: W, fontWeight: 500, marginTop: 2 }}>{sd.site.client_name || "N/A"}</div></div>
        </div>
        {sd.zones?.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, color: GO, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Zones</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{sd.zones.map(z => <span key={z} style={{ padding: "3px 8px", borderRadius: 4, background: N, border: "1px solid " + BD, fontSize: 10, color: GYL }}>{z}</span>)}</div></div>}
        {sd.staff?.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, color: GO, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Staff</div>{sd.staff.map((s, i) => <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 6, marginBottom: 3 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Ini name={s.first_name + " " + s.last_name} sz={24} /><span style={{ fontSize: 12 }}>{s.first_name} {s.last_name}</span></div><span style={{ fontSize: 10, color: GY }}>{s.role_at_site || RL[s.role]}</span></div>)}</div>}
        <div style={{ marginBottom: 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><div style={{ fontSize: 10, color: GO, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Tasks ({st.length})</div><button onClick={() => setAddTask({ siteId: site.id, label: "", zone: "", cims: "SD", pri: "standard", assign: "", desc: "", mediaUrl: "", mediaType: "", dueDate: "", dueTime: "" })} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: GO, fontSize: 10, cursor: "pointer" }}><PlI sz={10} c={GO} /> Add</button></div>
          {st.map((t, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 4, marginBottom: 2 }}><div style={{ flex: 1, cursor: "pointer" }} onClick={() => setEditTask({ id: t.id, siteId: site.id, label: t.label, zone: t.zone, pri: t.priority, cims: t.cims_category, desc: t.description || "", mediaUrl: t.media_url || "", mediaType: t.media_type || "", dueDate: t.due_date || "", dueTime: t.due_time || "" })}><div style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>{t.label}{t.has_details && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: BL, flexShrink: 0 }} title="Has details" />}</div><div style={{ fontSize: 9, color: GY, marginTop: 2 }}>{t.zone} | {t.cims_category} | {t.priority}{t.due_date ? " | Due: " + fd(t.due_date) : ""}{t.assigned_to?.length > 0 ? " | " + t.assigned_to.map(a => a.name).join(", ") : ""}</div></div><div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}><button onClick={() => setEditTask({ id: t.id, siteId: site.id, label: t.label, zone: t.zone, pri: t.priority, cims: t.cims_category, desc: t.description || "", mediaUrl: t.media_url || "", mediaType: t.media_type || "", dueDate: t.due_date || "", dueTime: t.due_time || "" })} style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid " + GO, background: "transparent", color: GO, fontSize: 8, cursor: "pointer" }}>Edit</button><button onClick={() => delTask(site.id, t.id)} style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 8, cursor: "pointer" }}>Remove</button></div></div>)}
          {st.length === 0 && <div style={{ fontSize: 11, color: GY }}>No tasks</div>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {site.status === "active" && <button onClick={() => { if (window.confirm("Deactivate this site? Staff will no longer see it.")) deactivateSite(site.id); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid " + OR, background: "transparent", color: OR, fontSize: 11, cursor: "pointer" }}>Deactivate</button>}
          {site.status !== "active" && <button onClick={async () => { try { await af("/api/sites/" + site.id, { method: "PATCH", body: { status: "active" } }); showToast("Site reactivated"); setExp(null); load(); } catch (e) { showToast(e.message, "error"); } }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid " + GR, background: "transparent", color: GR, fontSize: 11, cursor: "pointer" }}>Reactivate</button>}
          <button onClick={() => { setDeleteConfirm(site); setDeleteText(""); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 11, cursor: "pointer" }}>Permanently Delete</button>
        </div>
      </div>}
    </Crd>; })}
    {addSite && <Mdl onClose={() => setAddSite(null)}><div style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Add Site</div><button onClick={() => setAddSite(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      <div style={{ marginBottom: 12 }}><Lbl>Name *</Lbl><Inp value={addSite.name} onChange={e => setAddSite({ ...addSite, name: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Address *</Lbl><Inp value={addSite.address} onChange={e => setAddSite({ ...addSite, address: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>City</Lbl><Inp value={addSite.city} onChange={e => setAddSite({ ...addSite, city: e.target.value })} /></div><div><Lbl>State</Lbl><Inp value={addSite.state} onChange={e => setAddSite({ ...addSite, state: e.target.value })} /></div><div><Lbl>Zip</Lbl><Inp value={addSite.zip} onChange={e => setAddSite({ ...addSite, zip: e.target.value })} /></div></div>
      <div style={{ marginBottom: 12 }}><Lbl>Client</Lbl><Inp value={addSite.client} onChange={e => setAddSite({ ...addSite, client: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}><div><Lbl>Contract Type</Lbl><Sel value={addSite.contract} onChange={e => setAddSite({ ...addSite, contract: e.target.value })} options={[{ v: "subcontractor", l: "Subcontractor" }, { v: "prime", l: "Prime" }, { v: "direct", l: "Direct" }]} /></div><div><Lbl>Prime Contractor</Lbl><Inp value={addSite.prime} onChange={e => setAddSite({ ...addSite, prime: e.target.value })} /></div></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setAddSite(null)}>Cancel</Btn><Btn onClick={submitSite}>Create</Btn></div></div></Mdl>}
    {addTask && <Mdl onClose={() => setAddTask(null)}><div style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Add Task</div><button onClick={() => setAddTask(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      <div style={{ marginBottom: 12 }}><Lbl>Description *</Lbl><Inp value={addTask.label} onChange={e => setAddTask({ ...addTask, label: e.target.value })} placeholder="e.g. Vacuum carpets" /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Zone *</Lbl><Inp value={addTask.zone} onChange={e => setAddTask({ ...addTask, zone: e.target.value })} placeholder="e.g. Main Floor" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>CIMS</Lbl><Sel value={addTask.cims} onChange={e => setAddTask({ ...addTask, cims: e.target.value })} options={[{ v: "SD", l: "Service Delivery" }, { v: "HSE", l: "Health Safety" }, { v: "QS", l: "Quality Systems" }]} /></div><div><Lbl>Priority</Lbl><Sel value={addTask.pri} onChange={e => setAddTask({ ...addTask, pri: e.target.value })} options={[{ v: "standard", l: "Standard" }, { v: "high", l: "High" }, { v: "critical", l: "Critical" }]} /></div></div>
      <div style={{ marginBottom: 12 }}><Lbl>Detailed Instructions (optional)</Lbl><textarea value={addTask.desc || ""} onChange={e => setAddTask({ ...addTask, desc: e.target.value })} placeholder="Step-by-step instructions, tips, or notes for the cleaner..." rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid " + NL, background: "rgba(255,255,255,0.04)", color: W, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "'DM Sans',sans-serif" }} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Photo/Video (optional)</Lbl>
        <div style={{ display: "flex", gap: 8 }}><Inp value={addTask.mediaUrl || ""} onChange={e => setAddTask({ ...addTask, mediaUrl: e.target.value, mediaType: e.target.value ? (e.target.value.match(/\.(mp4|mov|webm|avi)/i) ? "video" : "image") : "" })} placeholder="Paste a URL or upload below" style={{ flex: 1 }} /></div>
        <div style={{ marginTop: 6 }}><input type="file" accept="image/*,video/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 50 * 1024 * 1024) { showToast("File must be under 50MB", "error"); return; } try { showToast("Uploading..."); const r = await uploadTaskMedia(f); setAddTask(prev => ({ ...prev, mediaUrl: r.url, mediaType: r.type })); showToast("Uploaded"); } catch (err) { showToast("Upload failed", "error"); } }} style={{ fontSize: 11, color: GYL }} /><div style={{ fontSize: 9, color: GY, marginTop: 3 }}>Upload a photo or video (up to 50MB), or paste a YouTube link above</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Due Date</Lbl><Inp type="date" value={addTask.dueDate || ""} onChange={e => setAddTask({ ...addTask, dueDate: e.target.value })} /></div><div><Lbl>Due Time</Lbl><Inp type="time" value={addTask.dueTime || ""} onChange={e => setAddTask({ ...addTask, dueTime: e.target.value })} /></div></div>
      <div style={{ marginBottom: 16 }}><Lbl>Assign To</Lbl><Sel value={addTask.assign} onChange={e => setAddTask({ ...addTask, assign: e.target.value })} options={[{ v: "", l: "Select (optional)" }, ...staffList.map(s => ({ v: s.id, l: s.name }))]} /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setAddTask(null)}>Cancel</Btn><Btn onClick={submitTask}>Create</Btn></div></div></Mdl>}

    {editTask && <Mdl onClose={() => setEditTask(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Edit Task</div><button onClick={() => setEditTask(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      <div style={{ marginBottom: 12 }}><Lbl>Task Name</Lbl><Inp value={editTask.label} onChange={e => setEditTask({ ...editTask, label: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Zone</Lbl><Inp value={editTask.zone} onChange={e => setEditTask({ ...editTask, zone: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>CIMS</Lbl><Sel value={editTask.cims} onChange={e => setEditTask({ ...editTask, cims: e.target.value })} options={[{ v: "SD", l: "Service Delivery" }, { v: "HSE", l: "Health Safety" }, { v: "QS", l: "Quality Systems" }]} /></div><div><Lbl>Priority</Lbl><Sel value={editTask.pri} onChange={e => setEditTask({ ...editTask, pri: e.target.value })} options={[{ v: "standard", l: "Standard" }, { v: "high", l: "High" }, { v: "critical", l: "Critical" }]} /></div></div>
      <div style={{ marginBottom: 12 }}><Lbl>Detailed Instructions</Lbl><textarea value={editTask.desc} onChange={e => setEditTask({ ...editTask, desc: e.target.value })} placeholder="Step-by-step instructions, tips, or notes..." rows={4} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid " + NL, background: "rgba(255,255,255,0.04)", color: W, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "'DM Sans',sans-serif" }} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Photo/Video</Lbl>
        <div style={{ display: "flex", gap: 8 }}>
          <Inp value={editTask.mediaUrl} onChange={e => setEditTask({ ...editTask, mediaUrl: e.target.value, mediaType: e.target.value ? (e.target.value.match(/\.(mp4|mov|webm|avi)/i) ? "video" : "image") : "" })} placeholder="Paste a URL or upload below" style={{ flex: 1 }} />
        </div>
        <div style={{ marginTop: 6 }}>
          <input type="file" accept="image/*,video/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 50 * 1024 * 1024) { showToast("File must be under 50MB", "error"); return; } try { showToast("Uploading..."); const r = await uploadTaskMedia(f); setEditTask(prev => ({ ...prev, mediaUrl: r.url, mediaType: r.type })); showToast("Uploaded"); } catch (err) { showToast("Upload failed", "error"); } }} style={{ fontSize: 11, color: GYL }} />
          <div style={{ fontSize: 9, color: GY, marginTop: 3 }}>Upload a photo or video (up to 50MB), or paste a YouTube link above</div>
        </div>
      </div>
      {editTask.mediaUrl && (editTask.mediaType === "video" ? <div style={{ marginBottom: 12 }}><video src={editTask.mediaUrl} controls style={{ width: "100%", borderRadius: 8, maxHeight: 200 }} /></div> : editTask.mediaUrl.includes("youtube") || editTask.mediaUrl.includes("youtu.be") ? <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: BL }}>YouTube link attached</div></div> : <div style={{ marginBottom: 12 }}><img src={editTask.mediaUrl} alt="Task reference" style={{ width: "100%", borderRadius: 8, maxHeight: 200, objectFit: "cover" }} /></div>)}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}><div><Lbl>Due Date</Lbl><Inp type="date" value={editTask.dueDate} onChange={e => setEditTask({ ...editTask, dueDate: e.target.value })} /></div><div><Lbl>Due Time</Lbl><Inp type="time" value={editTask.dueTime} onChange={e => setEditTask({ ...editTask, dueTime: e.target.value })} /></div></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setEditTask(null)}>Cancel</Btn><Btn onClick={submitEditTask}>Save Changes</Btn></div>
    </div></Mdl>}

    {deleteConfirm && <Mdl onClose={() => setDeleteConfirm(null)}><div style={{ padding: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: RD, marginBottom: 12 }}>Permanently Delete Site</div>
      <div style={{ fontSize: 13, color: GYL, marginBottom: 8, lineHeight: 1.5 }}>This will permanently remove <span style={{ fontWeight: 700, color: W }}>{deleteConfirm.name}</span> and all associated tasks, assignments, and data. This action cannot be undone.</div>
      <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(231,76,60,0.06)", border: "1px solid rgba(231,76,60,0.2)", fontSize: 12, color: RD, marginBottom: 14 }}>Type <span style={{ fontWeight: 700 }}>DELETE</span> to confirm.</div>
      <div style={{ marginBottom: 16 }}><Inp value={deleteText} onChange={e => setDeleteText(e.target.value)} placeholder="Type DELETE here" style={{ textTransform: "uppercase", textAlign: "center", fontSize: 16, letterSpacing: "4px", border: deleteText === "DELETE" ? "1px solid " + RD : "1px solid " + NL }} /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn v="ghost" onClick={() => { setDeleteConfirm(null); setDeleteText(""); }}>Cancel</Btn>
        <Btn v="danger" onClick={() => { if (deleteText === "DELETE") deleteSite(deleteConfirm.id); else showToast("Type DELETE to confirm", "error"); }}>Delete Permanently</Btn>
      </div>
    </div></Mdl>}
  </div>);
}

function OpsPage({ af }) {
  const [active, setActive] = useState([]); const [all, setAll] = useState([]);
  useEffect(() => { af("/api/clock/active").then(setActive).catch(() => {}); af("/api/users?status=active").then(setAll).catch(() => {}); }, []);
  const onIds = new Set(active.map(a => a.userId)); const off = all.filter(s => !onIds.has(s.id));
  return (<div><SecT>Live Operations</SecT>
    <div style={{ fontSize: 10, color: GO, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>On Site ({active.length})</div>
    {active.length === 0 && <Crd style={{ marginBottom: 20 }}><div style={{ fontSize: 13, color: GY }}>No staff on site.</div></Crd>}
    {active.map(s => { const h = Math.floor(s.elapsedMinutes / 60), m = s.elapsedMinutes % 60, pct = s.tasksTotal > 0 ? Math.round(s.tasksCompleted / s.tasksTotal * 100) : 0; return <Crd key={s.shiftId} style={{ marginBottom: 8, padding: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Ini name={s.name} sz={40} color={GR} /><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div><Bdg l="On Site" c={GR} /></div><div style={{ fontSize: 11, color: GYL, marginTop: 2 }}>{s.siteName}</div><div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}><span style={{ fontSize: 11, color: GR, fontWeight: 600 }}>{h}h {m}m</span><div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 50, height: 4, borderRadius: 2, background: NL, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, background: pct === 100 ? GR : GO, width: pct + "%" }} /></div><span style={{ fontSize: 10, color: GY }}>{pct}%</span></div></div></div></div></Crd>; })}
    <div style={{ fontSize: 10, color: GY, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginTop: 20, marginBottom: 8 }}>Off Site ({off.length})</div>
    {off.map(s => <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}><Ini name={s.name} sz={32} color={GY} /><div style={{ flex: 1 }}><div style={{ fontSize: 13, color: GYL }}>{s.name}</div><div style={{ fontSize: 10, color: GY }}>{RL[s.role]}</div></div><Bdg l="Off" c={GY} /></div>)}
  </div>);
}

function IssuesPage({ af, showToast }) {
  const [issues, setIssues] = useState([]); const [filter, setFilter] = useState("all"); const [sel, setSel] = useState(null);
  const [staffList, setStaffList] = useState([]); const [assignTask, setAssignTask] = useState(null);
  const [activity, setActivity] = useState([]);
  const [allPhotos, setAllPhotos] = useState([]);
  const load = () => af("/api/issues").then(setIssues).catch(e => showToast(e.message, "error"));
  useEffect(() => { load(); af("/api/users?status=active").then(setStaffList).catch(() => {}); }, []);
  const openIssue = async (iss) => {
    setSel(iss);
    try { const a = await af("/api/issues/" + iss.id + "/activity"); setActivity(a); } catch (e) { setActivity([]); }
    try {
      const p = await af("/api/issues/" + iss.id + "/photos");
      setAllPhotos(p);
    } catch (e) { setAllPhotos([]); }
  };
  const filtered = filter === "all" ? issues : issues.filter(i => i.status === filter);
  const sC = { low: GR, medium: OR, high: RD }; const stC = { open: RD, in_progress: OR, resolved: GR, closed: GY, escalated: "#9B59B6" };
  const upd = async (id, s) => { try { await af("/api/issues/" + id, { method: "PATCH", body: { status: s } }); showToast("Updated"); load(); setSel(null); } catch (e) { showToast(e.message, "error"); } };
  const submitAssignTask = async () => { if (!assignTask.userId) { showToast("Select a staff member", "error"); return; } try { const d = await af("/api/issues/" + assignTask.issueId + "/assign-as-task", { method: "POST", body: { userId: assignTask.userId, note: assignTask.note || undefined } }); showToast(d.message); setAssignTask(null); load(); } catch (e) { showToast(e.message, "error"); } };
  return (<div><SecT>Issue Tracker</SecT>
    <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>{["all", "open", "in_progress", "escalated", "resolved"].map(f => <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: 6, background: filter === f ? GD : "transparent", color: filter === f ? GO : GY, fontSize: 11, fontWeight: filter === f ? 700 : 500, cursor: "pointer", border: filter === f ? "1px solid rgba(200,168,78,0.25)" : "1px solid transparent" }}>{f.replace("_", " ")}</button>)}</div>
    {filtered.map(iss => <Crd key={iss.id} style={{ marginBottom: 8, padding: 14, borderLeft: "3px solid " + (sC[iss.severity] || GY) }} onClick={() => openIssue(iss)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{iss.title}</div><div style={{ fontSize: 11, color: GYL, marginTop: 3 }}>{iss.site_name} | {iss.zone}</div></div><div style={{ display: "flex", gap: 6 }}><Bdg l={iss.severity} c={sC[iss.severity]} /><Bdg l={iss.status?.replace("_", " ")} c={stC[iss.status] || GY} /></div></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 10, color: GY }}>{iss.reported_by_name} | {ff(iss.reported_at)}</div>
        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>{iss.status === "open" && <button onClick={() => upd(iss.id, "in_progress")} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + OR, background: "transparent", color: OR, fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Start</button>}{iss.status === "in_progress" && <button onClick={() => upd(iss.id, "resolved")} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + GR, background: "transparent", color: GR, fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Resolve</button>}</div></div>
      {iss.photo_url && <div style={{ fontSize: 10, color: BL, marginTop: 6 }}>Photo attached</div>}
      {iss.assigned_to_name && <div style={{ fontSize: 10, color: BL, marginTop: 4 }}>Assigned to: {iss.assigned_to_name}</div>}
    </Crd>)}
    {sel && <Mdl onClose={() => setSel(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Issue Detail</div><button onClick={() => setSel(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{sel.title}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><Bdg l={sel.severity} c={sC[sel.severity]} /><Bdg l={sel.status?.replace("_", " ")} c={stC[sel.status] || GY} /></div>
      {sel.description && <div style={{ fontSize: 13, color: GYL, marginBottom: 12, lineHeight: 1.5 }}>{sel.description}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: GY }}>Site<div style={{ color: W, fontWeight: 500, marginTop: 2 }}>{sel.site_name}</div></div>
        <div style={{ fontSize: 11, color: GY }}>Zone<div style={{ color: W, fontWeight: 500, marginTop: 2 }}>{sel.zone || "General"}</div></div>
        <div style={{ fontSize: 11, color: GY }}>Reported By<div style={{ color: W, fontWeight: 500, marginTop: 2 }}>{sel.reported_by_name}</div></div>
        <div style={{ fontSize: 11, color: GY }}>Reported At<div style={{ color: W, fontWeight: 500, marginTop: 2 }}>{ff(sel.reported_at)}</div></div>
        {sel.assigned_to_name && <div style={{ fontSize: 11, color: GY }}>Assigned To<div style={{ color: BL, fontWeight: 600, marginTop: 2 }}>{sel.assigned_to_name}</div></div>}
        {sel.resolved_at && <div style={{ fontSize: 11, color: GY }}>Resolved At<div style={{ color: W, fontWeight: 500, marginTop: 2 }}>{ff(sel.resolved_at)}</div></div>}
      </div>
      {sel.assignment_note && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(52,152,219,0.06)", border: "1px solid rgba(52,152,219,0.15)", fontSize: 11, color: BL, marginBottom: 12 }}>{sel.assignment_note}</div>}
      {allPhotos.length > 0 && <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: GO, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Photos ({allPhotos.length})</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {allPhotos.map((p, i) => <div key={i} style={{ position: "relative" }}>
            <img src={p.photo_url} alt={"Photo " + (i + 1)} style={{ width: allPhotos.length === 1 ? "100%" : 140, height: allPhotos.length === 1 ? "auto" : 100, objectFit: "cover", borderRadius: 8, border: "1px solid " + NL }} />
            <div style={{ position: "absolute", bottom: 4, left: 4, fontSize: 8, background: "rgba(0,0,0,0.7)", color: W, padding: "2px 6px", borderRadius: 4 }}>{i === 0 ? "Original" : "Resolution"}</div>
          </div>)}
        </div>
      </div>}
      {allPhotos.length === 0 && sel.photo_url && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, color: GO, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Photo</div><img src={sel.photo_url} alt="Issue" style={{ width: "100%", borderRadius: 8, border: "1px solid " + NL }} /></div>}

      {activity.length > 0 && <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: GO, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>Activity Timeline</div>
        {activity.map((a, i) => {
          const actColor = a.action === "reported" ? BL : a.action === "assigned" ? GO : a.action === "reassigned" ? OR : a.action === "started_work" ? BL : a.action === "resolved" ? GR : a.action === "unable_to_resolve" ? RD : a.action === "status_changed" ? GYL : a.action === "resolution_photo" ? GR : a.action === "photo_added" ? BL : GY;
          const actLabel = a.action === "reported" ? "Reported" : a.action === "assigned" ? "Assigned" : a.action === "reassigned" ? "Reassigned" : a.action === "started_work" ? "Work Started" : a.action === "resolved" ? "Resolved" : a.action === "unable_to_resolve" ? "Unable to Resolve" : a.action === "status_changed" ? "Status Changed" : a.action === "resolution_photo" ? "Resolution Photo" : a.action === "photo_added" ? "Photo Added" : a.action;
          const timeStr = new Date(a.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
          return (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: actColor, marginTop: 4 }} />
                {i < activity.length - 1 && <div style={{ width: 1, flex: 1, background: NL, minHeight: 20 }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div><span style={{ fontSize: 11, fontWeight: 600, color: actColor }}>{actLabel}</span><span style={{ fontSize: 10, color: GY, marginLeft: 8 }}>by {a.user_name}</span></div>
                  <span style={{ fontSize: 9, color: GY, flexShrink: 0 }}>{timeStr}</span>
                </div>
                {a.details && <div style={{ fontSize: 11, color: GYL, marginTop: 3, lineHeight: 1.4 }}>{a.details}</div>}
              </div>
            </div>
          );
        })}
      </div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {sel.status === "open" && <Btn style={{ flex: 1 }} onClick={() => upd(sel.id, "in_progress")}>Start Work</Btn>}
        {sel.status === "in_progress" && <Btn style={{ flex: 1 }} onClick={() => upd(sel.id, "resolved")}>Resolve</Btn>}
        {sel.status === "escalated" && <Btn style={{ flex: 1 }} onClick={() => upd(sel.id, "resolved")}>Resolve</Btn>}
        {(sel.status === "open" || sel.status === "in_progress" || sel.status === "escalated") && <Btn v="ghost" style={{ flex: 1 }} onClick={() => { setAssignTask({ issueId: sel.id, userId: "", note: "", isReassign: !!sel.assigned_to }); setSel(null); }}>{sel.assigned_to ? "Reassign" : "Assign as Task"}</Btn>}
        <Btn v="ghost" style={{ flex: 1 }} onClick={() => setSel(null)}>Close</Btn>
      </div></div></Mdl>}
    {assignTask && <Mdl onClose={() => setAssignTask(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>{assignTask.isReassign ? "Reassign Issue" : "Assign Issue as Task"}</div><button onClick={() => setAssignTask(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      {assignTask.isReassign && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(243,156,18,0.06)", border: "1px solid rgba(243,156,18,0.15)", fontSize: 11, color: OR, marginBottom: 12 }}>This issue is currently assigned to someone. Selecting a new person will remove the previous assignment.</div>}
      <div style={{ fontSize: 12, color: GYL, marginBottom: 16, lineHeight: 1.5 }}>The task will appear in the staff member's "Assigned" tab where they can mark it as in progress, resolved, or unable to resolve.</div>
      <div style={{ marginBottom: 12 }}><Lbl>Assign To *</Lbl><Sel value={assignTask.userId} onChange={e => setAssignTask({ ...assignTask, userId: e.target.value })} options={[{ v: "", l: "Select a staff member..." }, ...staffList.map(s => ({ v: s.id, l: s.name }))]} /></div>
      {assignTask.isReassign && <div style={{ marginBottom: 12 }}><Lbl>Note to previous assignee (optional)</Lbl><textarea value={assignTask.note} onChange={e => setAssignTask({ ...assignTask, note: e.target.value })} placeholder="Explain why this is being reassigned..." rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid " + NL, background: "rgba(255,255,255,0.04)", color: W, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "'DM Sans',sans-serif" }} /></div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setAssignTask(null)}>Cancel</Btn><Btn onClick={submitAssignTask}>{assignTask.isReassign ? "Reassign" : "Assign Task"}</Btn></div>
    </div></Mdl>}
  </div>);
}

// ============================================================
// SUPPLIES ADMIN PAGE
// ============================================================
function SuppliesAdminPage({ af, showToast }) {
  const [supplies, setSupplies] = useState([]); const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState("inventory"); const [addForm, setAddForm] = useState(null);
  const [editForm, setEditForm] = useState(null); const [handleReq, setHandleReq] = useState(null);

  const loadSupplies = () => af("/api/supplies").then(setSupplies).catch(e => showToast(e.message, "error"));
  const loadRequests = () => af("/api/supplies/requests").then(setRequests).catch(e => showToast(e.message, "error"));
  useEffect(() => { loadSupplies(); loadRequests(); }, []);

  const submitAdd = async () => {
    if (!addForm.name || !addForm.category || !addForm.unit) { showToast("Name, category, and unit required", "error"); return; }
    try { const d = await af("/api/supplies", { method: "POST", body: addForm }); showToast(d.message); setAddForm(null); loadSupplies(); } catch (e) { showToast(e.message, "error"); }
  };
  const submitEdit = async () => {
    try { await af("/api/supplies/" + editForm.id, { method: "PATCH", body: editForm }); showToast("Supply updated"); setEditForm(null); loadSupplies(); } catch (e) { showToast(e.message, "error"); }
  };
  const deactivate = async (id) => {
    try { await af("/api/supplies/" + id, { method: "DELETE" }); showToast("Supply removed"); loadSupplies(); } catch (e) { showToast(e.message, "error"); }
  };
  const submitHandleReq = async () => {
    try { await af("/api/supplies/requests/" + handleReq.id, { method: "PATCH", body: { status: handleReq.status, adminNotes: handleReq.notes } }); showToast("Request " + handleReq.status); setHandleReq(null); loadRequests(); } catch (e) { showToast(e.message, "error"); }
  };

  const qrUrl = (code) => "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(API + "/qr/" + code);
  const cats = [{ v: "chemical", l: "Chemical" }, { v: "paper", l: "Paper Product" }, { v: "trash", l: "Trash/Liner" }, { v: "equipment", l: "Equipment" }, { v: "ppe", l: "PPE" }, { v: "other", l: "Other" }];
  const units = [{ v: "each", l: "Each" }, { v: "gallon", l: "Gallon" }, { v: "case", l: "Case" }, { v: "box", l: "Box" }, { v: "roll", l: "Roll" }, { v: "pair", l: "Pair" }];
  const reqColor = { pending: OR, approved: BL, denied: RD, fulfilled: GR };
  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (<div>
    <SecT action="Add Supply" onAction={() => setAddForm({ name: "", category: "chemical", unit: "each", currentStock: "", lowThreshold: "", costPerUnit: "", isGreenCertified: false, greenCertType: "", epaRegNumber: "", manufacturer: "" })}>Supplies and Inventory</SecT>

    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
      <button onClick={() => setTab("inventory")} style={{ padding: "5px 12px", borderRadius: 6, background: tab === "inventory" ? GD : "transparent", color: tab === "inventory" ? GO : GY, fontSize: 11, fontWeight: tab === "inventory" ? 700 : 500, cursor: "pointer", border: tab === "inventory" ? "1px solid rgba(200,168,78,0.25)" : "1px solid transparent" }}>Inventory ({supplies.length})</button>
      <button onClick={() => setTab("requests")} style={{ padding: "5px 12px", borderRadius: 6, background: tab === "requests" ? GD : "transparent", color: tab === "requests" ? GO : GY, fontSize: 11, fontWeight: tab === "requests" ? 700 : 500, cursor: "pointer", border: tab === "requests" ? "1px solid rgba(200,168,78,0.25)" : "1px solid transparent" }}>Requests {pendingCount > 0 ? "(" + pendingCount + " pending)" : ""}</button>
    </div>

    {tab === "inventory" && supplies.map(s => (
      <Crd key={s.id} style={{ marginBottom: 8, padding: 14 }} onClick={() => setEditForm({ id: s.id, name: s.name, category: s.category, unit: s.unit, currentStock: s.current_stock || 0, lowThreshold: s.low_threshold || 0, costPerUnit: s.cost_per_unit || "", isGreenCertified: s.is_green_certified, greenCertType: s.green_cert_type || "", epaRegNumber: s.epa_reg_number || "", manufacturer: s.manufacturer || "", qrCode: s.qr_code })}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: GD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <img src={qrUrl(s.qr_code)} alt="QR" style={{ width: 36, height: 36, borderRadius: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
              {s.is_green_certified && <Bdg l="Green" c={GR} />}
            </div>
            <div style={{ fontSize: 11, color: GYL, marginTop: 2 }}>{s.category} | {s.unit} | Stock: {s.current_stock}</div>
            <div style={{ fontSize: 10, color: GY, marginTop: 2 }}>QR: {s.qr_code}{s.manufacturer ? " | " + s.manufacturer : ""}</div>
          </div>
          {s.current_stock <= (s.low_threshold || 0) && <Bdg l="Low Stock" c={RD} />}
        </div>
      </Crd>
    ))}
    {tab === "inventory" && supplies.length === 0 && <div style={{ padding: 40, textAlign: "center", color: GY }}>No supplies configured. Click "Add Supply" to start.</div>}

    {tab === "requests" && requests.map(r => (
      <Crd key={r.id} style={{ marginBottom: 8, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{r.request_type === "refill" ? "Refill Request" : r.request_type === "damage_report" ? "Damage Report" : r.request_type === "new_gear" ? "New Gear Request" : "New Supply Request"}</div>
            <div style={{ fontSize: 11, color: GYL, marginTop: 2 }}>{r.item_name || r.supply_name || "General"} {r.site_name ? "at " + r.site_name : ""}</div>
            {r.description && <div style={{ fontSize: 11, color: GY, marginTop: 4 }}>{r.description}</div>}
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <Bdg l={r.urgency} c={r.urgency === "urgent" ? RD : r.urgency === "high" ? OR : GY} />
            <Bdg l={r.status} c={reqColor[r.status] || GY} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, color: GY }}>{r.requested_by_name} | {fd(r.created_at)}</div>
          {r.status === "pending" && <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setHandleReq({ id: r.id, status: "approved", notes: "" })} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + GR, background: "transparent", color: GR, fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Approve</button>
            <button onClick={() => setHandleReq({ id: r.id, status: "denied", notes: "" })} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Deny</button>
          </div>}
        </div>
      </Crd>
    ))}
    {tab === "requests" && requests.length === 0 && <div style={{ padding: 40, textAlign: "center", color: GY }}>No supply requests yet.</div>}

    {addForm && <Mdl onClose={() => setAddForm(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Add Supply</div><button onClick={() => setAddForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(46,204,113,0.06)", border: "1px solid rgba(46,204,113,0.15)", fontSize: 11, color: GR, marginBottom: 14 }}>A unique QR code will be generated automatically.</div>
      <div style={{ marginBottom: 12 }}><Lbl>Name *</Lbl><Inp value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="e.g. All-Purpose Cleaner" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Category *</Lbl><Sel value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} options={cats} /></div>
        <div><Lbl>Unit *</Lbl><Sel value={addForm.unit} onChange={e => setAddForm({ ...addForm, unit: e.target.value })} options={units} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Stock</Lbl><Inp type="number" value={addForm.currentStock} onChange={e => setAddForm({ ...addForm, currentStock: e.target.value })} /></div>
        <div><Lbl>Low Threshold</Lbl><Inp type="number" value={addForm.lowThreshold} onChange={e => setAddForm({ ...addForm, lowThreshold: e.target.value })} /></div>
        <div><Lbl>Cost/Unit</Lbl><Inp type="number" value={addForm.costPerUnit} onChange={e => setAddForm({ ...addForm, costPerUnit: e.target.value })} placeholder="$" /></div>
      </div>
      <div style={{ marginBottom: 12 }}><Lbl>Manufacturer</Lbl><Inp value={addForm.manufacturer} onChange={e => setAddForm({ ...addForm, manufacturer: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>EPA Reg #</Lbl><Inp value={addForm.epaRegNumber} onChange={e => setAddForm({ ...addForm, epaRegNumber: e.target.value })} /></div>
        <div><Lbl>Green Cert Type</Lbl><Inp value={addForm.greenCertType} onChange={e => setAddForm({ ...addForm, greenCertType: e.target.value })} placeholder="e.g. Green Seal" /></div>
      </div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={addForm.isGreenCertified} onChange={e => setAddForm({ ...addForm, isGreenCertified: e.target.checked })} />
        <span style={{ fontSize: 12, color: GYL }}>Green Certified Product</span>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setAddForm(null)}>Cancel</Btn><Btn onClick={submitAdd}>Add Supply</Btn></div>
    </div></Mdl>}

    {editForm && <Mdl onClose={() => setEditForm(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Edit Supply</div><button onClick={() => setEditForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      {editForm.qrCode && <div style={{ textAlign: "center", marginBottom: 14 }}><img src={qrUrl(editForm.qrCode)} alt="QR" style={{ width: 120, height: 120, borderRadius: 8 }} /><div style={{ fontSize: 11, color: GO, marginTop: 6, fontFamily: "monospace" }}>{editForm.qrCode}</div><div style={{ fontSize: 10, color: GY, marginTop: 2 }}>Print this QR code and attach it to the supply container</div></div>}
      <div style={{ marginBottom: 12 }}><Lbl>Name</Lbl><Inp value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Category</Lbl><Sel value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} options={cats} /></div>
        <div><Lbl>Unit</Lbl><Sel value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })} options={units} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Stock</Lbl><Inp type="number" value={editForm.currentStock} onChange={e => setEditForm({ ...editForm, currentStock: e.target.value })} /></div>
        <div><Lbl>Low Threshold</Lbl><Inp type="number" value={editForm.lowThreshold} onChange={e => setEditForm({ ...editForm, lowThreshold: e.target.value })} /></div>
        <div><Lbl>Cost/Unit</Lbl><Inp type="number" value={editForm.costPerUnit} onChange={e => setEditForm({ ...editForm, costPerUnit: e.target.value })} /></div>
      </div>
      <div style={{ marginBottom: 12 }}><Lbl>Manufacturer</Lbl><Inp value={editForm.manufacturer} onChange={e => setEditForm({ ...editForm, manufacturer: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>EPA Reg #</Lbl><Inp value={editForm.epaRegNumber} onChange={e => setEditForm({ ...editForm, epaRegNumber: e.target.value })} /></div>
        <div><Lbl>Green Cert Type</Lbl><Inp value={editForm.greenCertType} onChange={e => setEditForm({ ...editForm, greenCertType: e.target.value })} /></div>
      </div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={editForm.isGreenCertified} onChange={e => setEditForm({ ...editForm, isGreenCertified: e.target.checked })} />
        <span style={{ fontSize: 12, color: GYL }}>Green Certified Product</span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn v="danger" onClick={() => { deactivate(editForm.id); setEditForm(null); }}>Remove</Btn>
        <div style={{ flex: 1 }} />
        <Btn v="ghost" onClick={() => setEditForm(null)}>Cancel</Btn>
        <Btn onClick={submitEdit}>Save</Btn>
      </div>
    </div></Mdl>}

    {handleReq && <Mdl onClose={() => setHandleReq(null)}><div style={{ padding: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{handleReq.status === "approved" ? "Approve" : "Deny"} Request</div>
      <div style={{ marginBottom: 16 }}><Lbl>Notes (optional)</Lbl><Inp value={handleReq.notes} onChange={e => setHandleReq({ ...handleReq, notes: e.target.value })} placeholder="Add a note..." /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setHandleReq(null)}>Cancel</Btn><Btn onClick={submitHandleReq}>{handleReq.status === "approved" ? "Approve" : "Deny"}</Btn></div>
    </div></Mdl>}
  </div>);
}

function ChatPage({ af, user }) {
  const [dms, setDms] = useState([]); const [sel, setSel] = useState(null); const [msgs, setMsgs] = useState([]); const [reply, setReply] = useState(""); const endRef = useRef(null);
  useEffect(() => { af("/api/chat/dm-inbox").then(setDms).catch(() => {}); }, []);
  const open = async id => { setSel(id); try { const m = await af("/api/chat/channels/" + id + "/messages"); setMsgs(m); } catch (e) { console.error(e); } };
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  const send = async () => { if (!reply.trim() || !sel) return; try { const d = await af("/api/chat/channels/" + sel + "/messages", { method: "POST", body: { text: reply.trim() } }); setMsgs(p => [...p, d.message]); setReply(""); } catch (e) { console.error(e); } };
  return (<div><SecT>Private Messages</SecT>
    <div style={{ padding: "8px 12px", marginBottom: 14, borderRadius: 8, background: "rgba(52,152,219,0.06)", border: "1px solid rgba(52,152,219,0.15)", fontSize: 11, color: BL }}>Private conversations with staff.</div>
    {!sel ? (dms.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: GY }}>No messages yet.</div> : dms.map(dm => <Crd key={dm.channelId} style={{ marginBottom: 8, padding: 12 }} onClick={() => open(dm.channelId)}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Ini name={dm.staffName} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, fontWeight: dm.unreadCount > 0 ? 700 : 600 }}>{dm.staffName}</span>{dm.lastMessageAt && <span style={{ fontSize: 10, color: GY }}>{fd(dm.lastMessageAt)}</span>}</div>{dm.lastMessage && <div style={{ fontSize: 11, color: dm.unreadCount > 0 ? W : GY, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dm.lastMessage}</div>}</div>{dm.unreadCount > 0 && <div style={{ width: 18, height: 18, borderRadius: "50%", background: BL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: W }}>{dm.unreadCount}</div>}</div>
    </Crd>)) : (<div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 260px)" }}>
      <button onClick={() => { setSel(null); setMsgs([]); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", marginBottom: 10, background: "none", border: "1px solid " + NL, borderRadius: 8, color: GYL, fontSize: 12, cursor: "pointer" }}><Ic d="M15 18l-6-6 6-6" sz={14} c={GYL} /> Back</button>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {msgs.length === 0 && <div style={{ padding: 40, textAlign: "center", color: GY }}>No messages yet.</div>}
        {msgs.map((m, i) => { const isMe = m.senderRole === "admin" || m.senderRole === "supervisor"; const showN = i === 0 || msgs[i - 1].senderId !== m.senderId; return (
          <div key={m.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 8, marginBottom: showN ? 12 : 4, alignItems: "flex-end" }}>
            {!isMe && showN && <Ini name={m.senderName} sz={28} color={GYL} />}{!isMe && !showN && <div style={{ width: 28 }} />}
            <div style={{ maxWidth: "75%" }}>{!isMe && showN && <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 3, color: GYL }}>{m.senderName}</div>}<div style={{ padding: "8px 12px", borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isMe ? BL : NM, border: isMe ? "none" : "1px solid " + NL, color: W, fontSize: 13, lineHeight: 1.45 }}>{m.text}</div><div style={{ fontSize: 9, color: GY, marginTop: 2, textAlign: isMe ? "right" : "left" }}>{ft(m.sentAt)}</div></div>
          </div>); })}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, padding: "10px 0", borderTop: "1px solid " + NL }}>
        <Inp value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply..." style={{ borderRadius: 20, border: "1px solid rgba(52,152,219,0.25)" }} onKeyDown={e => e.key === "Enter" && send()} />
        <button onClick={send} style={{ width: 38, height: 38, borderRadius: "50%", background: reply.trim() ? BL : NL, border: "none", cursor: reply.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SnI sz={16} c={reply.trim() ? W : GY} /></button>
      </div>
    </div>)}
  </div>);
}

function ReportsPage({ af, showToast }) {
  const [hours, setHours] = useState(null); const [tasks, setTasks] = useState(null); const [issS, setIssS] = useState(null); const [exp, setExp] = useState(false);
  const [staffList, setStaffList] = useState([]); const [sites, setSites] = useState([]);
  const [clockHistory, setClockHistory] = useState([]); const [histFilter, setHistFilter] = useState({ userId: "", siteId: "" });
  const [manualEntry, setManualEntry] = useState(null); const [editShift, setEditShift] = useState(null);

  useEffect(() => {
    af("/api/reports/hours?group_by=user").then(setHours).catch(() => {});
    af("/api/reports/task-completion").then(setTasks).catch(() => {});
    af("/api/reports/issues").then(setIssS).catch(() => {});
    af("/api/users?status=active").then(setStaffList).catch(() => {});
    af("/api/sites").then(setSites).catch(() => {});
  }, []);

  const loadHistory = async (filters) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.set("user_id", filters.userId);
    if (filters?.siteId) params.set("site_id", filters.siteId);
    params.set("limit", "50");
    try { const d = await af("/api/clock/history?" + params.toString()); setClockHistory(d); } catch (e) { showToast(e.message, "error"); }
  };

  const submitManual = async () => {
    if (!manualEntry.userId || !manualEntry.siteId || !manualEntry.clockIn) { showToast("User, site, and clock-in time required", "error"); return; }
    try {
      const d = await af("/api/clock/manual-entry", { method: "POST", body: { userId: manualEntry.userId, siteId: manualEntry.siteId, clockInTime: manualEntry.clockIn, clockOutTime: manualEntry.clockOut || undefined, notes: manualEntry.notes || undefined } });
      showToast(d.message); setManualEntry(null); loadHistory(histFilter);
    } catch (e) { showToast(e.message, "error"); }
  };

  const submitEditShift = async () => {
    try {
      await af("/api/clock/shifts/" + editShift.id, { method: "PATCH", body: { clockInTime: editShift.clockIn, clockOutTime: editShift.clockOut || undefined } });
      showToast("Shift updated"); setEditShift(null); loadHistory(histFilter);
    } catch (e) { showToast(e.message, "error"); }
  };

  const expHrs = async () => { setExp(true); try { const d = await af("/api/reports/hours"); dlCSV("ocsa-hours.csv", ["Staff", "Role", "Site", "Clock In", "Clock Out", "Duration (min)"], d.data.map(r => [r.staff_name, r.role, r.site_name, r.clock_in_time, r.clock_out_time, r.duration_minutes])); showToast("Downloaded"); } catch (e) { showToast(e.message, "error"); } setExp(false); };
  const expIss = async () => { setExp(true); try { const d = await af("/api/issues"); dlCSV("ocsa-issues.csv", ["Title", "Site", "Zone", "Severity", "Status", "Reported By", "Date"], d.map(r => [r.title, r.site_name, r.zone, r.severity, r.status, r.reported_by_name, r.reported_at])); showToast("Downloaded"); } catch (e) { showToast(e.message, "error"); } setExp(false); };
  const expChem = async () => { setExp(true); try { const d = await af("/api/reports/chemical-usage"); dlCSV("ocsa-chemicals.csv", ["Chemical", "QR", "Green", "EPA", "Site", "Qty", "Unit"], d.chemicals.map(r => [r.name, r.qr_code, r.is_green_certified, r.epa_reg_number, r.site_name, r.total_quantity, r.unit])); showToast("Downloaded"); } catch (e) { showToast(e.message, "error"); } setExp(false); };

  const fmtDt = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "Active";
  const fmtInput = (d) => d ? new Date(d).toISOString().slice(0, 16) : "";

  return (<div><SecT>Reports and Time Management</SecT>

    {/* Clock History */}
    <Crd style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Clock History</div>
        <button onClick={() => setManualEntry({ userId: "", siteId: "", clockIn: "", clockOut: "", notes: "" })} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "none", background: GO, color: N, fontSize: 11, fontWeight: 600, cursor: "pointer" }}><PlI sz={12} c={N} /> Manual Entry</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Sel value={histFilter.userId} onChange={e => { const f = { ...histFilter, userId: e.target.value }; setHistFilter(f); loadHistory(f); }} options={[{ v: "", l: "All Staff" }, ...staffList.map(s => ({ v: s.id, l: s.name }))]} style={{ flex: 1, minWidth: 140 }} />
        <Sel value={histFilter.siteId} onChange={e => { const f = { ...histFilter, siteId: e.target.value }; setHistFilter(f); loadHistory(f); }} options={[{ v: "", l: "All Sites" }, ...sites.map(s => ({ v: s.id, l: s.name }))]} style={{ flex: 1, minWidth: 140 }} />
        {clockHistory.length === 0 && <button onClick={() => loadHistory(histFilter)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid " + GO, background: "transparent", color: GO, fontSize: 11, cursor: "pointer" }}>Load History</button>}
      </div>
      {clockHistory.length > 0 && <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {clockHistory.map(sh => (
          <div key={sh.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", marginBottom: 3, background: "rgba(255,255,255,0.02)", borderRadius: 6, fontSize: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{sh.staff_name}</div>
              <div style={{ color: GY, marginTop: 2 }}>{sh.site_name}</div>
            </div>
            <div style={{ textAlign: "right", marginRight: 10 }}>
              <div style={{ color: GYL }}>{fmtDt(sh.clock_in_time)}</div>
              <div style={{ color: sh.clock_out_time ? GYL : OR }}>{sh.clock_out_time ? fmtDt(sh.clock_out_time) : "Still clocked in"}</div>
            </div>
            <div style={{ textAlign: "right", marginRight: 10, minWidth: 40 }}>
              <div style={{ fontWeight: 600, color: GO }}>{sh.duration_minutes ? sh.duration_minutes + "m" : "--"}</div>
            </div>
            <button onClick={() => setEditShift({ id: sh.id, clockIn: fmtInput(sh.clock_in_time), clockOut: fmtInput(sh.clock_out_time), name: sh.staff_name })} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + NL, background: "transparent", color: GYL, fontSize: 9, cursor: "pointer" }}>Edit</button>
          </div>
        ))}
      </div>}
      {clockHistory.length === 0 && <div style={{ fontSize: 11, color: GY }}>Select filters and click "Load History" to view clock records.</div>}
    </Crd>

    {/* Hours by Staff */}
    <Crd style={{ marginBottom: 16 }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Hours by Staff (Last 7 Days)</div><div style={{ fontSize: 11, color: GY, marginBottom: 14 }}>Total: {hours?.summary?.totalHours || 0}h across {hours?.summary?.totalShifts || 0} shifts</div>
      {hours?.data?.map((s, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ width: 100, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div><div style={{ flex: 1, height: 8, borderRadius: 4, background: NL, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg,${GO},${GL})`, width: (hours.summary.totalMinutes > 0 ? s.total_minutes / hours.summary.totalMinutes * 100 : 0) + "%" }} /></div><span style={{ fontSize: 12, fontWeight: 600, color: GO, width: 50, textAlign: "right" }}>{s.total_hours}h</span></div>)}
      {(!hours?.data || hours.data.length === 0) && <div style={{ fontSize: 12, color: GY }}>No data yet.</div>}</Crd>

    <Crd style={{ marginBottom: 16 }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Task Completion (Last 30 Days)</div>
      {tasks?.sites?.map((s, i) => <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid " + BD }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, fontWeight: 600 }}>{s.siteName}</span><span style={{ fontSize: 12, color: GO, fontWeight: 600 }}>{s.completedTasks} done</span></div></div>)}
      {(!tasks?.sites || tasks.sites.length === 0) && <div style={{ fontSize: 12, color: GY }}>No data yet.</div>}</Crd>

    <Crd style={{ marginBottom: 16 }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Issues (Last 30 Days)</div>
      {issS?.summary ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 700 }}>{issS.summary.total}</div><div style={{ fontSize: 10, color: GY }}>Total</div></div>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 700, color: issS.summary.open_count > 0 ? RD : GR }}>{issS.summary.open_count}</div><div style={{ fontSize: 10, color: GY }}>Open</div></div>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 700, color: GR }}>{issS.summary.resolved}</div><div style={{ fontSize: 10, color: GY }}>Resolved</div></div>
      </div> : <div style={{ fontSize: 12, color: GY }}>No data yet.</div>}</Crd>

    <Crd><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Export Reports</div><div style={{ fontSize: 11, color: GY, marginBottom: 14 }}>Download CSV files for payroll, audits, and clients.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[{ l: "Payroll Hours", a: expHrs }, { l: "Issues Report", a: expIss }, { l: "Chemical Usage (CIMS)", a: expChem }].map(r => <button key={r.l} onClick={r.a} disabled={exp} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, border: "1px solid " + NL, background: "transparent", color: GYL, fontSize: 11, cursor: "pointer" }} onMouseEnter={e => { e.target.style.borderColor = GO; e.target.style.color = GO; }} onMouseLeave={e => { e.target.style.borderColor = NL; e.target.style.color = GYL; }}><DlI sz={14} c="currentColor" />{r.l}</button>)}
      </div></Crd>

    {/* Manual Entry Modal */}
    {manualEntry && <Mdl onClose={() => setManualEntry(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Manual Clock Entry</div><button onClick={() => setManualEntry(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(52,152,219,0.06)", border: "1px solid rgba(52,152,219,0.15)", fontSize: 11, color: BL, marginBottom: 14 }}>Use this to add a clock entry for a staff member who forgot to clock in or out.</div>
      <div style={{ marginBottom: 12 }}><Lbl>Staff Member *</Lbl><Sel value={manualEntry.userId} onChange={e => setManualEntry({ ...manualEntry, userId: e.target.value })} options={[{ v: "", l: "Select staff..." }, ...staffList.map(s => ({ v: s.id, l: s.name }))]} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Site *</Lbl><Sel value={manualEntry.siteId} onChange={e => setManualEntry({ ...manualEntry, siteId: e.target.value })} options={[{ v: "", l: "Select site..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Clock In *</Lbl><Inp type="datetime-local" value={manualEntry.clockIn} onChange={e => setManualEntry({ ...manualEntry, clockIn: e.target.value })} /></div>
        <div><Lbl>Clock Out</Lbl><Inp type="datetime-local" value={manualEntry.clockOut} onChange={e => setManualEntry({ ...manualEntry, clockOut: e.target.value })} /></div>
      </div>
      <div style={{ marginBottom: 16 }}><Lbl>Notes</Lbl><Inp value={manualEntry.notes} onChange={e => setManualEntry({ ...manualEntry, notes: e.target.value })} placeholder="Reason for manual entry" /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setManualEntry(null)}>Cancel</Btn><Btn onClick={submitManual}>Add Entry</Btn></div>
    </div></Mdl>}

    {/* Edit Shift Modal */}
    {editShift && <Mdl onClose={() => setEditShift(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Edit Shift</div><button onClick={() => setEditShift(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={GY} /></button></div>
      <div style={{ fontSize: 12, color: GYL, marginBottom: 14 }}>Editing shift for: <span style={{ fontWeight: 600, color: W }}>{editShift.name}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div><Lbl>Clock In</Lbl><Inp type="datetime-local" value={editShift.clockIn} onChange={e => setEditShift({ ...editShift, clockIn: e.target.value })} /></div>
        <div><Lbl>Clock Out</Lbl><Inp type="datetime-local" value={editShift.clockOut} onChange={e => setEditShift({ ...editShift, clockOut: e.target.value })} /></div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setEditShift(null)}>Cancel</Btn><Btn onClick={submitEditShift}>Save Changes</Btn></div>
    </div></Mdl>}
  </div>);
}
