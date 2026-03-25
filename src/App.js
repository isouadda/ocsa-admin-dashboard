import { useState, useEffect, useCallback, useRef } from "react";

const API = process.env.REACT_APP_API_URL || "https://ocsa-api-production.up.railway.app";
const SUPA_URL = "https://gcgswxyxkbummtgzgusk.supabase.co";

async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...opts.headers };
  if (opts.token) headers["Authorization"] = "Bearer " + opts.token;
  const res = await fetch(API + path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (res.status === 401) throw new Error("Session expired");
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Request failed"); }
  return res.json();
}

const NAVY = "#0A1628", NAVY_MID = "#132240", NAVY_LIGHT = "#1B3058", GOLD = "#C8A84E", GOLD_LIGHT = "#E8D08E";
const GOLD_DIM = "rgba(200,168,78,0.12)", WHITE = "#F8F7F4", GREEN = "#2ECC71", RED = "#E74C3C";
const ORANGE = "#F39C12", BLUE = "#3498DB", PURPLE = "#9B59B6", GRAY = "#8899AA", GRAY_LIGHT = "#A8B8C8";
const BORDER = "rgba(255,255,255,0.06)";

const fmtTime = (d) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtFull = (d) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const Ico = ({ d, sz = 18, c = "currentColor", style: s, ...p }) => (
  <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s} {...p}><path d={d} /></svg>
);
const HomeIco = (p) => <Ico d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" {...p} />;
const UsersIco = (p) => <Ico d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" {...p} />;
const MapIco = (p) => <Ico d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" {...p} />;
const ClipIco = (p) => <Ico d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" {...p} />;
const ChatIco = (p) => <Ico d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...p} />;
const BarIco = (p) => <Ico d="M18 20V10 M12 20V4 M6 20v-6" {...p} />;
const AlertIco = (p) => <Ico d="M12 2L2 22h20L12 2zm0 7v5m0 3h.01" {...p} />;
const CheckIco = (p) => <Ico d="M20 6L9 17l-5-5" {...p} />;
const PlusIco = (p) => <Ico d="M12 5v14M5 12h14" {...p} />;
const ClockIco = (p) => <Ico d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0v10l4 4" {...p} />;
const XIco = (p) => <Ico d="M18 6L6 18M6 6l12 12" {...p} />;
const SendIco = (p) => <Ico d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" {...p} />;
const LogOutIco = (p) => <Ico d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" {...p} />;
const ImgIco = (p) => <Ico d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 5h6v6 M8 16l2.5-2.5a2 2 0 0 1 3 0L21 21" {...p} />;

const ROLES = { admin: "Admin", supervisor: "Supervisor", custodial_lead: "Custodial Lead", custodial_laborer: "Custodial Laborer", day_porter: "Day Porter" };

export default function AdminDashboard() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("overview");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = useCallback((m, t = "success") => { setToast({ m, t }); setTimeout(() => setToast(null), 3000); }, []);
  const af = useCallback((path, opts = {}) => apiFetch(path, { ...opts, token }), [token]);

  const handleLogin = async (phone, pin) => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", { method: "POST", body: { phone, pin } });
      if (data.user.role !== "admin" && data.user.role !== "supervisor") {
        showToast("Admin or supervisor access required", "error");
        setLoading(false);
        return;
      }
      setToken(data.token);
      setUser(data.user);
      showToast("Welcome, " + data.user.firstName);
    } catch (err) { showToast(err.message, "error"); }
    setLoading(false);
  };

  const handleLogout = () => { setToken(null); setUser(null); setPage("overview"); };

  if (!token) return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: NAVY, fontFamily: "'DM Sans',sans-serif", color: WHITE, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      <LoginScreen onLogin={handleLogin} loading={loading} />
      {toast && <Toast toast={toast} />}
    </div>
  );

  const nav = [
    { id: "overview", label: "Overview", icon: HomeIco },
    { id: "staff", label: "Staff", icon: UsersIco },
    { id: "sites", label: "Sites", icon: MapIco },
    { id: "operations", label: "Live Ops", icon: ClipIco },
    { id: "issues", label: "Issues", icon: AlertIco },
    { id: "chat", label: "Messages", icon: ChatIco },
    { id: "reports", label: "Reports", icon: BarIco },
  ];

  return (
    <div style={{ width: "100%", maxWidth: 960, margin: "0 auto", minHeight: "100vh", background: NAVY, fontFamily: "'DM Sans',sans-serif", color: WHITE }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: NAVY_MID, padding: "12px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: GOLD }}>OCSA</span>
          <div style={{ width: 1, height: 24, background: NAVY_LIGHT }} />
          <span style={{ fontSize: 13, color: GRAY_LIGHT }}>Admin Dashboard</span>
          <span style={{ fontSize: 9, color: GREEN, background: "rgba(46,204,113,0.1)", padding: "2px 8px", borderRadius: 10 }}>LIVE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: GRAY }}>{user?.firstName} {user?.lastName}</span>
          <button onClick={handleLogout} style={{ background: "none", border: "none", cursor: "pointer" }}><LogOutIco sz={16} c={GRAY} /></button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", gap: 2, padding: "8px 12px", background: NAVY, borderBottom: `1px solid ${BORDER}`, overflowX: "auto" }}>
        {nav.map(n => {
          const active = page === n.id;
          const NI = n.icon;
          return (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              background: active ? GOLD_DIM : "transparent", color: active ? GOLD : GRAY,
              fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer",
              border: active ? `1px solid rgba(200,168,78,0.25)` : "1px solid transparent", whiteSpace: "nowrap",
            }}><NI sz={15} c={active ? GOLD : GRAY} />{n.label}</button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 40px" }}>
        {page === "overview" && <OverviewPage af={af} showToast={showToast} setPage={setPage} />}
        {page === "staff" && <StaffPage af={af} showToast={showToast} />}
        {page === "sites" && <SitesPage af={af} showToast={showToast} />}
        {page === "operations" && <OpsPage af={af} />}
        {page === "issues" && <IssuesPage af={af} showToast={showToast} />}
        {page === "chat" && <ChatPage af={af} user={user} />}
        {page === "reports" && <ReportsPage af={af} />}
      </div>

      {toast && <Toast toast={toast} />}
      <style>{`
        * { box-sizing: border-box; }
        input::placeholder,textarea::placeholder { color: ${GRAY}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${NAVY_LIGHT}; border-radius: 2px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}

const Toast = ({ toast }) => (
  <div style={{ position: "fixed", top: 20, right: 20, background: toast.t === "error" ? RED : GREEN, color: WHITE, padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 1000, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{toast.m}</div>
);

const Card = ({ children, style }) => (<div style={{ background: NAVY_MID, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, ...style }}>{children}</div>);
const Badge = ({ label, color }) => (<span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, background: `${color}18`, color, letterSpacing: "0.5px" }}>{label}</span>);
const SectionTitle = ({ children, action, onAction }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 8 }}>
    <div style={{ fontSize: 16, fontWeight: 700 }}>{children}</div>
    {action && <button onClick={onAction} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "none", background: GOLD, color: NAVY, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><PlusIco sz={13} c={NAVY} /> {action}</button>}
  </div>
);
const Inp = (props) => (<input {...props} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${NAVY_LIGHT}`, background: "rgba(255,255,255,0.04)", color: WHITE, fontSize: 13, outline: "none", fontFamily: "'DM Sans',sans-serif", ...props.style }} />);
const Sel = ({ options, ...props }) => (<select {...props} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${NAVY_LIGHT}`, background: NAVY, color: WHITE, fontSize: 13, outline: "none", ...props.style }}>{options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>);
const Btn = ({ children, v = "primary", ...p }) => (<button {...p} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: v === "primary" ? GOLD : v === "danger" ? RED : NAVY_LIGHT, color: v === "primary" ? NAVY : WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px", ...p.style }}>{children}</button>);
const Lbl = ({ children }) => (<label style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, display: "block", marginBottom: 5 }}>{children}</label>);
const Modal = ({ children, onClose }) => (
  <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
    <div style={{ background: NAVY_MID, borderRadius: 16, border: `1px solid ${BORDER}`, maxWidth: 500, width: "100%", maxHeight: "85vh", overflow: "auto", animation: "fadeIn 0.2s ease" }} onClick={e => e.stopPropagation()}>{children}</div>
  </div>
);
const Initials = ({ name, sz = 36, color = GOLD }) => (<div style={{ width: sz, height: sz, borderRadius: "50%", background: GOLD_DIM, border: `1.5px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.35, fontWeight: 700, color, flexShrink: 0 }}>{name?.split(" ").map(n => n[0]).join("")}</div>);

// ============================================================
// LOGIN
// ============================================================
function LoginScreen({ onLogin, loading }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, color: GOLD }}>OCSA</div>
        <div style={{ fontSize: 12, color: GRAY_LIGHT, letterSpacing: "3px", textTransform: "uppercase", marginTop: 4 }}>Cleaning Inc.</div>
        <div style={{ fontSize: 11, color: GRAY, marginTop: 16, letterSpacing: "1px", textTransform: "uppercase" }}>Admin Dashboard</div>
        <div style={{ fontSize: 10, color: GREEN, marginTop: 8 }}>Connected to Live API</div>
      </div>
      <div style={{ marginBottom: 16 }}><Lbl>Phone Number</Lbl><Inp value={phone} onChange={e => setPhone(e.target.value)} placeholder="215-000-0000" onKeyDown={e => e.key === "Enter" && onLogin(phone, pin)} /></div>
      <div style={{ marginBottom: 24 }}><Lbl>PIN</Lbl><Inp value={pin} onChange={e => setPin(e.target.value)} placeholder="4-digit PIN" type="password" maxLength={4} style={{ letterSpacing: "8px", textAlign: "center", fontSize: 20 }} onKeyDown={e => e.key === "Enter" && onLogin(phone, pin)} /></div>
      <button onClick={() => onLogin(phone, pin)} disabled={loading} style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, color: NAVY, fontSize: 15, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", opacity: loading ? 0.6 : 1 }}>{loading ? "Signing in..." : "Sign In"}</button>
      <div style={{ marginTop: 32, padding: 14, borderRadius: 10, background: "rgba(200,168,78,0.06)", border: `1px solid rgba(200,168,78,0.15)` }}>
        <div style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, fontWeight: 600 }}>Admin Login</div>
        <button onClick={() => { setPhone("215-000-0000"); setPin("0000"); }} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "6px 0", background: "none", border: "none", cursor: "pointer", color: WHITE }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Ibrahim (Admin)</span>
          <span style={{ fontSize: 10, color: GRAY, fontFamily: "monospace" }}>PIN: 0000</span>
        </button>
      </div>
    </>
  );
}

// ============================================================
// OVERVIEW PAGE
// ============================================================
function OverviewPage({ af, showToast, setPage }) {
  const [stats, setStats] = useState(null);
  const [active, setActive] = useState([]);
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    af("/api/reports/overview").then(setStats).catch(e => showToast(e.message, "error"));
    af("/api/clock/active").then(setActive).catch(() => {});
    af("/api/issues?status=open&limit=5").then(setIssues).catch(() => {});
  }, []);

  if (!stats) return <div style={{ padding: 40, textAlign: "center", color: GRAY }}>Loading dashboard...</div>;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Good evening, Ibrahim</div>
      <div style={{ fontSize: 13, color: GRAY_LIGHT, marginBottom: 20 }}>Here is what is happening across your operations right now.</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <StatCard label="Staff on Site" value={stats.clockedInNow} sub={"of " + stats.activeStaff + " active"} color={GREEN} icon={ClockIco} />
        <StatCard label="Open Issues" value={stats.openIssues} sub={stats.openIssues > 0 ? "need attention" : "all clear"} color={stats.openIssues > 0 ? RED : GREEN} icon={AlertIco} />
        <StatCard label="Pending Approvals" value={stats.pendingStaff} sub="new registrations" color={stats.pendingStaff > 0 ? ORANGE : GREEN} icon={UsersIco} />
        <StatCard label="Week Hours" value={stats.weekHoursTotal + "h"} sub="this week total" color={GOLD} icon={BarIco} />
      </div>

      <SectionTitle>Live Operations</SectionTitle>
      <Card style={{ marginBottom: 20 }}>
        {active.length === 0 && <div style={{ fontSize: 13, color: GRAY, padding: "10px 0" }}>No staff currently on site.</div>}
        {active.map(s => {
          const h = Math.floor(s.elapsedMinutes / 60), m = s.elapsedMinutes % 60;
          const pct = s.tasksTotal > 0 ? Math.round((s.tasksCompleted / s.tasksTotal) * 100) : 0;
          return (
            <div key={s.shiftId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
              <Initials name={s.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: GRAY_LIGHT }}>{s.siteName}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: GREEN }}>{h}h {m}m</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: NAVY_LIGHT, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: pct === 100 ? GREEN : GOLD, width: `${pct}%` }} />
                  </div>
                  <span style={{ fontSize: 10, color: pct === 100 ? GREEN : GRAY }}>{s.tasksCompleted}/{s.tasksTotal}</span>
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {(stats.pendingStaff > 0 || stats.openIssues > 0) && (
        <>
          <SectionTitle>Action Needed</SectionTitle>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {stats.pendingStaff > 0 && (
              <button onClick={() => setPage("staff")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: "rgba(243,156,18,0.08)", border: `1px solid rgba(243,156,18,0.2)`, color: ORANGE, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <UsersIco sz={16} c={ORANGE} />{stats.pendingStaff} staff registration{stats.pendingStaff > 1 ? "s" : ""} waiting
              </button>
            )}
            {stats.openIssues > 0 && (
              <button onClick={() => setPage("issues")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: "rgba(231,76,60,0.08)", border: `1px solid rgba(231,76,60,0.2)`, color: RED, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <AlertIco sz={16} c={RED} />{stats.openIssues} open issue{stats.openIssues > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const StatCard = ({ label, value, sub, color = GOLD, icon: Icon }) => (
  <Card style={{ flex: 1, minWidth: 140 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 10, color: GRAY, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: GRAY_LIGHT, marginTop: 2 }}>{sub}</div>}
      </div>
      {Icon && <Icon sz={20} c={color} style={{ opacity: 0.5 }} />}
    </div>
  </Card>
);

// ============================================================
// STAFF PAGE
// ============================================================
function StaffPage({ af, showToast }) {
  const [staff, setStaff] = useState([]);
  const [filter, setFilter] = useState("all");
  const [addForm, setAddForm] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = () => af("/api/users").then(setStaff).catch(e => showToast(e.message, "error"));
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? staff : staff.filter(s => filter === "inactive" ? (s.status === "inactive" || s.status === "terminated") : s.status === filter);

  const approve = async (id) => {
    try { await af("/api/users/" + id + "/approve", { method: "POST" }); showToast("Staff approved"); load(); } catch (e) { showToast(e.message, "error"); }
  };

  const submitAdd = async () => {
    if (!addForm.firstName || !addForm.phone) { showToast("Name and phone required", "error"); return; }
    try {
      const data = await af("/api/users", { method: "POST", body: addForm });
      showToast("Staff added. Temp PIN: " + data.tempPin);
      setAddForm(null); load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const viewDetail = async (id) => {
    try { const data = await af("/api/users/" + id); setDetail(data); } catch (e) { showToast(e.message, "error"); }
  };

  const updateStatus = async (id, status) => {
    try { await af("/api/users/" + id, { method: "PATCH", body: { status } }); showToast("Status updated"); setDetail(null); load(); } catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <SectionTitle action="Add Staff" onAction={() => setAddForm({ firstName: "", lastName: "", phone: "", role: "custodial_laborer" })}>Staff Management</SectionTitle>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["all", "active", "pending", "inactive"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "5px 12px", borderRadius: 6, background: filter === f ? GOLD_DIM : "transparent",
            color: filter === f ? GOLD : GRAY, fontSize: 11, fontWeight: filter === f ? 700 : 500,
            cursor: "pointer", textTransform: "capitalize", border: filter === f ? `1px solid rgba(200,168,78,0.25)` : "1px solid transparent",
          }}>{f} ({f === "all" ? staff.length : staff.filter(s => f === "inactive" ? (s.status === "inactive" || s.status === "terminated") : s.status === f).length})</button>
        ))}
      </div>

      {filtered.map(s => (
        <Card key={s.id} style={{ marginBottom: 8, padding: 12, cursor: "pointer" }} onClick={() => viewDetail(s.id)}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Initials name={s.name} sz={36} color={s.status === "pending" ? ORANGE : GOLD} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
                <Badge label={s.status} color={s.status === "active" ? GREEN : s.status === "pending" ? ORANGE : RED} />
              </div>
              <div style={{ fontSize: 11, color: GRAY_LIGHT, marginTop: 2 }}>{ROLES[s.role] || s.role} | {s.phone}</div>
              <div style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>{s.sites?.length > 0 ? s.sites.map(si => si.siteName).join(", ") : "No sites assigned"}</div>
            </div>
            {s.status === "pending" && (
              <button onClick={(e) => { e.stopPropagation(); approve(s.id); }} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: GREEN, color: WHITE, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Approve</button>
            )}
          </div>
        </Card>
      ))}

      {addForm && (
        <Modal onClose={() => setAddForm(null)}>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Add New Staff</div>
              <button onClick={() => setAddForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XIco sz={18} c={GRAY} /></button>
            </div>
            <div style={{ marginBottom: 12 }}><Lbl>First Name *</Lbl><Inp value={addForm.firstName} onChange={e => setAddForm({ ...addForm, firstName: e.target.value })} /></div>
            <div style={{ marginBottom: 12 }}><Lbl>Last Name</Lbl><Inp value={addForm.lastName} onChange={e => setAddForm({ ...addForm, lastName: e.target.value })} /></div>
            <div style={{ marginBottom: 12 }}><Lbl>Phone *</Lbl><Inp value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} placeholder="215-555-0000" /></div>
            <div style={{ marginBottom: 16 }}><Lbl>Role</Lbl><Sel value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} options={[{ v: "custodial_laborer", l: "Custodial Laborer" }, { v: "custodial_lead", l: "Custodial Lead" }, { v: "day_porter", l: "Day Porter" }, { v: "supervisor", l: "Supervisor" }]} /></div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn v="ghost" onClick={() => setAddForm(null)}>Cancel</Btn>
              <Btn onClick={submitAdd}>Add Staff</Btn>
            </div>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal onClose={() => setDetail(null)}>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Initials name={detail.user.firstName + " " + detail.user.lastName} sz={48} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{detail.user.firstName} {detail.user.lastName}</div>
                  <div style={{ fontSize: 12, color: GOLD }}>{ROLES[detail.user.role]}</div>
                </div>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XIco sz={18} c={GRAY} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: GRAY }}>Phone<div style={{ color: WHITE, fontWeight: 500, marginTop: 2 }}>{detail.user.phone}</div></div>
              <div style={{ fontSize: 11, color: GRAY }}>Hire Date<div style={{ color: WHITE, fontWeight: 500, marginTop: 2 }}>{detail.user.hireDate || "N/A"}</div></div>
              <div style={{ fontSize: 11, color: GRAY }}>Status<div style={{ marginTop: 2 }}><Badge label={detail.user.status} color={detail.user.status === "active" ? GREEN : ORANGE} /></div></div>
              <div style={{ fontSize: 11, color: GRAY }}>Hourly Rate<div style={{ color: WHITE, fontWeight: 500, marginTop: 2 }}>{detail.user.hourlyRate ? "$" + detail.user.hourlyRate : "Not set"}</div></div>
            </div>

            {detail.certifications?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Certifications</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {detail.certifications.map((c, i) => (
                    <span key={i} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(46,204,113,0.08)", border: `1px solid rgba(46,204,113,0.2)`, fontSize: 11, color: GREEN }}>{c.cert_name}</span>
                  ))}
                </div>
              </div>
            )}

            {detail.assignments?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Site Assignments</div>
                {detail.assignments.filter(a => a.is_active).map((a, i) => (
                  <div key={i} style={{ padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{a.site_name}</span>
                    <span style={{ color: GRAY, marginLeft: 8 }}>{a.role_at_site} | {a.shift_name}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              {detail.user.status === "active" && <Btn v="danger" style={{ flex: 1 }} onClick={() => updateStatus(detail.user.id, "inactive")}>Deactivate</Btn>}
              {detail.user.status === "inactive" && <Btn style={{ flex: 1 }} onClick={() => updateStatus(detail.user.id, "active")}>Reactivate</Btn>}
              {detail.user.status === "pending" && <Btn style={{ flex: 1 }} onClick={() => { approve(detail.user.id); setDetail(null); }}>Approve</Btn>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// SITES PAGE
// ============================================================
function SitesPage({ af, showToast }) {
  const [sites, setSites] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [siteDetail, setSiteDetail] = useState(null);
  const [siteTasks, setSiteTasks] = useState([]);

  useEffect(() => { af("/api/sites").then(setSites).catch(e => showToast(e.message, "error")); }, []);

  const expand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    try {
      const d = await af("/api/sites/" + id);
      setSiteDetail(d);
      const t = await af("/api/sites/" + id + "/tasks");
      setSiteTasks(t);
    } catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <SectionTitle>Sites and Task Management</SectionTitle>
      {sites.map(site => {
        const isOpen = expanded === site.id;
        return (
          <Card key={site.id} style={{ marginBottom: 12, padding: 0 }}>
            <button onClick={() => expand(site.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", color: WHITE, cursor: "pointer", textAlign: "left" }}>
              <MapIco sz={20} c={GOLD} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{site.name}</div>
                <div style={{ fontSize: 11, color: GRAY_LIGHT, marginTop: 2 }}>{site.address_line1}, {site.city}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 10, color: GRAY }}>
                  {site.staff_count !== undefined && <span>{site.staff_count} staff</span>}
                  {site.task_count !== undefined && <span>{site.task_count} tasks</span>}
                  <span style={{ textTransform: "capitalize" }}>{site.contract_type}</span>
                </div>
              </div>
              <Badge label={site.status} color={GREEN} />
              <Ico d={isOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} sz={16} c={GRAY} />
            </button>

            {isOpen && siteDetail && (
              <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${BORDER}`, animation: "fadeIn 0.2s ease" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "12px 0", borderBottom: `1px solid ${BORDER}`, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: GRAY }}>Contract<div style={{ color: WHITE, fontWeight: 500, marginTop: 2, textTransform: "capitalize" }}>{siteDetail.site.contract_type}</div></div>
                  <div style={{ fontSize: 10, color: GRAY }}>Prime<div style={{ color: WHITE, fontWeight: 500, marginTop: 2 }}>{siteDetail.site.prime_contractor || "N/A"}</div></div>
                  <div style={{ fontSize: 10, color: GRAY }}>Client<div style={{ color: WHITE, fontWeight: 500, marginTop: 2 }}>{siteDetail.site.client_name || "N/A"}</div></div>
                </div>

                {siteDetail.zones?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Zones</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {siteDetail.zones.map(z => <span key={z} style={{ padding: "3px 8px", borderRadius: 4, background: NAVY, border: `1px solid ${BORDER}`, fontSize: 10, color: GRAY_LIGHT }}>{z}</span>)}
                    </div>
                  </div>
                )}

                {siteDetail.staff?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Assigned Staff</div>
                    {siteDetail.staff.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 6, marginBottom: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Initials name={s.first_name + " " + s.last_name} sz={24} />
                          <span style={{ fontSize: 12 }}>{s.first_name} {s.last_name}</span>
                        </div>
                        <span style={{ fontSize: 10, color: GRAY }}>{s.role_at_site || ROLES[s.role]}</span>
                      </div>
                    ))}
                  </div>
                )}

                {siteTasks.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Tasks ({siteTasks.length})</div>
                    {siteTasks.slice(0, 10).map((t, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 4, marginBottom: 2, fontSize: 11 }}>
                        <span>{t.label}</span>
                        <span style={{ color: GRAY, fontSize: 9 }}>{t.zone}</span>
                      </div>
                    ))}
                    {siteTasks.length > 10 && <div style={{ fontSize: 10, color: GRAY, marginTop: 4 }}>+{siteTasks.length - 10} more tasks</div>}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
// OPERATIONS PAGE
// ============================================================
function OpsPage({ af }) {
  const [active, setActive] = useState([]);
  const [allStaff, setAllStaff] = useState([]);

  useEffect(() => {
    af("/api/clock/active").then(setActive).catch(() => {});
    af("/api/users?status=active").then(setAllStaff).catch(() => {});
  }, []);

  const onSiteIds = new Set(active.map(a => a.userId));
  const offSite = allStaff.filter(s => !onSiteIds.has(s.id));

  return (
    <div>
      <SectionTitle>Live Operations</SectionTitle>

      <div style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>On Site ({active.length})</div>
      {active.length === 0 && <Card style={{ marginBottom: 20 }}><div style={{ fontSize: 13, color: GRAY }}>No staff currently on site.</div></Card>}
      {active.map(s => {
        const h = Math.floor(s.elapsedMinutes / 60), m = s.elapsedMinutes % 60;
        const pct = s.tasksTotal > 0 ? Math.round((s.tasksCompleted / s.tasksTotal) * 100) : 0;
        return (
          <Card key={s.shiftId} style={{ marginBottom: 8, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Initials name={s.name} sz={40} color={GREEN} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                  <Badge label="On Site" color={GREEN} />
                </div>
                <div style={{ fontSize: 11, color: GRAY_LIGHT, marginTop: 2 }}>{s.siteName}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: GRAY }}><span style={{ color: GREEN, fontWeight: 600 }}>{h}h {m}m</span> on site</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 50, height: 4, borderRadius: 2, background: NAVY_LIGHT, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: pct === 100 ? GREEN : GOLD, width: `${pct}%` }} />
                    </div>
                    <span style={{ fontSize: 10, color: pct === 100 ? GREEN : GRAY }}>{pct}%</span>
                  </div>
                  <span style={{ fontSize: 10, color: GRAY }}>{s.tasksCompleted}/{s.tasksTotal} tasks</span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      <div style={{ fontSize: 10, color: GRAY, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginTop: 20, marginBottom: 8 }}>Off Site ({offSite.length})</div>
      {offSite.map(s => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
          <Initials name={s.name} sz={32} color={GRAY} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: GRAY_LIGHT }}>{s.name}</div>
            <div style={{ fontSize: 10, color: GRAY }}>{ROLES[s.role]}</div>
          </div>
          <Badge label="Off Site" color={GRAY} />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// ISSUES PAGE
// ============================================================
function IssuesPage({ af, showToast }) {
  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState("all");
  const [photoModal, setPhotoModal] = useState(null);

  const load = () => af("/api/issues").then(setIssues).catch(e => showToast(e.message, "error"));
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? issues : issues.filter(i => i.status === filter);
  const sevColor = { low: GREEN, medium: ORANGE, high: RED };
  const statusColor = { open: RED, in_progress: ORANGE, resolved: GREEN, closed: GRAY, escalated: PURPLE };

  const updateStatus = async (id, status) => {
    try { await af("/api/issues/" + id, { method: "PATCH", body: { status } }); showToast("Issue updated"); load(); } catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <SectionTitle>Issue Tracker</SectionTitle>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {["all", "open", "in_progress", "resolved"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "5px 12px", borderRadius: 6, background: filter === f ? GOLD_DIM : "transparent",
            color: filter === f ? GOLD : GRAY, fontSize: 11, fontWeight: filter === f ? 700 : 500,
            cursor: "pointer", textTransform: "capitalize", border: filter === f ? `1px solid rgba(200,168,78,0.25)` : "1px solid transparent",
          }}>{f.replace("_", " ")}</button>
        ))}
      </div>

      {filtered.map(issue => (
        <Card key={issue.id} style={{ marginBottom: 8, padding: 14, borderLeft: `3px solid ${sevColor[issue.severity] || GRAY}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{issue.title}</div>
              <div style={{ fontSize: 11, color: GRAY_LIGHT, marginTop: 3 }}>{issue.site_name} | {issue.zone}</div>
              {issue.description && <div style={{ fontSize: 11, color: GRAY, marginTop: 4 }}>{issue.description}</div>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Badge label={issue.severity} color={sevColor[issue.severity]} />
              <Badge label={issue.status?.replace("_", " ")} color={statusColor[issue.status] || GRAY} />
            </div>
          </div>

          {/* Photo indicator */}
          {issue.photo_url && (
            <button onClick={() => setPhotoModal(issue.photo_url)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 4, background: "rgba(52,152,219,0.08)", border: `1px solid rgba(52,152,219,0.2)`, color: BLUE, fontSize: 10, cursor: "pointer", marginBottom: 6 }}>
              <ImgIco sz={12} c={BLUE} /> View attached photo
            </button>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 10, color: GRAY }}>
              {issue.reported_by_name} | {fmtFull(issue.reported_at)}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {issue.status === "open" && <button onClick={() => updateStatus(issue.id, "in_progress")} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${ORANGE}`, background: "transparent", color: ORANGE, fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Start Work</button>}
              {issue.status === "in_progress" && <button onClick={() => updateStatus(issue.id, "resolved")} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${GREEN}`, background: "transparent", color: GREEN, fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Resolve</button>}
            </div>
          </div>
        </Card>
      ))}

      {photoModal && (
        <Modal onClose={() => setPhotoModal(null)}>
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Issue Photo</span>
              <button onClick={() => setPhotoModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XIco sz={18} c={GRAY} /></button>
            </div>
            <img src={photoModal} alt="Issue" style={{ width: "100%", borderRadius: 8 }} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// CHAT PAGE
// ============================================================
function ChatPage({ af, user }) {
  const [dms, setDms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const endRef = useRef(null);

  useEffect(() => { af("/api/chat/dm-inbox").then(setDms).catch(() => {}); }, []);

  const openThread = async (channelId) => {
    setSelected(channelId);
    try {
      const msgs = await af("/api/chat/channels/" + channelId + "/messages");
      setMessages(msgs);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async () => {
    if (!reply.trim() || !selected) return;
    try {
      const data = await af("/api/chat/channels/" + selected + "/messages", { method: "POST", body: { text: reply.trim() } });
      setMessages(prev => [...prev, data.message]);
      setReply("");
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <SectionTitle>Private Messages</SectionTitle>
      <div style={{ padding: "8px 12px", marginBottom: 14, borderRadius: 8, background: "rgba(52,152,219,0.06)", border: `1px solid rgba(52,152,219,0.15)`, fontSize: 11, color: BLUE }}>
        Private conversations between you and individual staff members.
      </div>

      {!selected ? (
        dms.map(dm => (
          <Card key={dm.channelId} style={{ marginBottom: 8, padding: 12, cursor: "pointer" }} onClick={() => openThread(dm.channelId)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Initials name={dm.staffName} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: dm.unreadCount > 0 ? 700 : 600 }}>{dm.staffName}</span>
                  {dm.lastMessageAt && <span style={{ fontSize: 10, color: GRAY }}>{fmtDate(dm.lastMessageAt)}</span>}
                </div>
                {dm.lastMessage && <div style={{ fontSize: 11, color: dm.unreadCount > 0 ? WHITE : GRAY, fontWeight: dm.unreadCount > 0 ? 600 : 400, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dm.lastMessage}</div>}
              </div>
              {dm.unreadCount > 0 && <div style={{ width: 18, height: 18, borderRadius: "50%", background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: WHITE }}>{dm.unreadCount}</div>}
            </div>
          </Card>
        ))
      ) : (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 240px)" }}>
          <button onClick={() => { setSelected(null); setMessages([]); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", marginBottom: 10, background: "none", border: `1px solid ${NAVY_LIGHT}`, borderRadius: 8, color: GRAY_LIGHT, fontSize: 12, cursor: "pointer" }}>
            <Ico d="M15 18l-6-6 6-6" sz={14} c={GRAY_LIGHT} /> Back to inbox
          </button>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 4px" }}>
            {messages.map((msg, idx) => {
              const isMe = msg.senderRole === "admin" || msg.senderRole === "supervisor";
              const showName = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 8, marginBottom: showName ? 12 : 4, alignItems: "flex-end" }}>
                  {!isMe && showName && <Initials name={msg.senderName} sz={28} color={GRAY_LIGHT} />}
                  {!isMe && !showName && <div style={{ width: 28 }} />}
                  <div style={{ maxWidth: "75%" }}>
                    {!isMe && showName && <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 3, color: GRAY_LIGHT }}>{msg.senderName}</div>}
                    <div style={{ padding: "8px 12px", borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isMe ? BLUE : NAVY_MID, border: isMe ? "none" : `1px solid ${NAVY_LIGHT}`, color: WHITE, fontSize: 13, lineHeight: 1.45 }}>{msg.text}</div>
                    <div style={{ fontSize: 9, color: GRAY, marginTop: 2, textAlign: isMe ? "right" : "left" }}>{fmtTime(msg.sentAt)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <div style={{ display: "flex", gap: 8, padding: "10px 0", borderTop: `1px solid ${NAVY_LIGHT}` }}>
            <Inp value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply..." style={{ borderRadius: 20, border: `1px solid rgba(52,152,219,0.25)` }} onKeyDown={e => e.key === "Enter" && send()} />
            <button onClick={send} style={{ width: 38, height: 38, borderRadius: "50%", background: reply.trim() ? BLUE : NAVY_LIGHT, border: "none", cursor: reply.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <SendIco sz={16} c={reply.trim() ? WHITE : GRAY} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// REPORTS PAGE
// ============================================================
function ReportsPage({ af }) {
  const [hours, setHours] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [issueStats, setIssueStats] = useState(null);

  useEffect(() => {
    af("/api/reports/hours?group_by=user").then(setHours).catch(() => {});
    af("/api/reports/task-completion").then(setTasks).catch(() => {});
    af("/api/reports/issues").then(setIssueStats).catch(() => {});
  }, []);

  return (
    <div>
      <SectionTitle>Reports and Analytics</SectionTitle>

      {/* Hours by Staff */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Hours by Staff (Last 7 Days)</div>
        <div style={{ fontSize: 11, color: GRAY, marginBottom: 14 }}>
          Total: {hours?.summary?.totalHours || 0} hours across {hours?.summary?.totalShifts || 0} shifts
        </div>
        {hours?.data?.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 100, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: NAVY_LIGHT, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg,${GOLD},${GOLD_LIGHT})`, width: `${hours.summary.totalMinutes > 0 ? (s.total_minutes / hours.summary.totalMinutes * 100) : 0}%`, transition: "width 0.5s ease" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: GOLD, width: 50, textAlign: "right" }}>{s.total_hours}h</span>
          </div>
        ))}
        {(!hours?.data || hours.data.length === 0) && <div style={{ fontSize: 12, color: GRAY }}>No shift data yet. Hours will appear here after staff clock in and out.</div>}
      </Card>

      {/* Task Completion by Site */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Task Completion by Site (Last 30 Days)</div>
        {tasks?.sites?.map((s, i) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{s.siteName}</span>
              <span style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>{s.completedTasks} completed</span>
            </div>
            <div style={{ fontSize: 10, color: GRAY }}>{s.assignedTasks} task templates configured</div>
          </div>
        ))}
        {(!tasks?.sites || tasks.sites.length === 0) && <div style={{ fontSize: 12, color: GRAY }}>No task data yet.</div>}
      </Card>

      {/* Issue Summary */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Issue Summary (Last 30 Days)</div>
        {issueStats?.summary ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: WHITE }}>{issueStats.summary.total}</div>
              <div style={{ fontSize: 10, color: GRAY }}>Total Reported</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: issueStats.summary.open_count > 0 ? RED : GREEN }}>{issueStats.summary.open_count}</div>
              <div style={{ fontSize: 10, color: GRAY }}>Open</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: GREEN }}>{issueStats.summary.resolved}</div>
              <div style={{ fontSize: 10, color: GRAY }}>Resolved</div>
            </div>
          </div>
        ) : <div style={{ fontSize: 12, color: GRAY }}>No issue data yet.</div>}
        {issueStats?.summary?.avg_resolution_minutes && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, fontSize: 11, color: GRAY_LIGHT, textAlign: "center" }}>
            Average resolution time: <span style={{ color: GOLD, fontWeight: 600 }}>{Math.round(issueStats.summary.avg_resolution_minutes)} minutes</span>
          </div>
        )}
      </Card>

      {/* Export buttons */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Audit-Ready Exports</div>
        <div style={{ fontSize: 11, color: GRAY, marginBottom: 14 }}>Generate structured documentation packages for CIMS audits, client reporting, or internal review.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Full CIMS Audit Package", "Payroll Hours Report", "Client Service Report", "Chemical Usage Log", "Staff Certifications", "Issue Resolution Report"].map(r => (
            <button key={r} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${NAVY_LIGHT}`, background: "transparent", color: GRAY_LIGHT, fontSize: 11, cursor: "pointer" }}
              onMouseEnter={e => { e.target.style.borderColor = GOLD; e.target.style.color = GOLD; }}
              onMouseLeave={e => { e.target.style.borderColor = NAVY_LIGHT; e.target.style.color = GRAY_LIGHT; }}
            >{r}</button>
          ))}
        </div>
      </Card>
    </div>
  );
}
