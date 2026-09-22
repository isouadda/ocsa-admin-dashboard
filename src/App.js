import { useState, useEffect, useCallback, useRef, useMemo, Fragment, createContext, useContext } from "react";
import Chart from "react-apexcharts";
import clientConfig from "./clientConfig";
const API = process.env.REACT_APP_API_URL || "https://ocsa-api-production.up.railway.app";
async function apiUpload(file, bucket, token) {
  const ext = file.name.split(".").pop().toLowerCase();
  const res = await fetch(API + "/api/uploads?bucket=" + encodeURIComponent(bucket) + "&ext=" + encodeURIComponent(ext), {
    method: "POST",
    headers: { "Authorization": "Bearer " + token, "Content-Type": file.type },
    body: file,
  });
  if (res.status === 401) { window.dispatchEvent(new Event("ocsa-session-expired")); throw new Error("Session expired"); }
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Upload failed"); }
  return res.json();
}
// attachment; filename="<code>-<id>.pdf" -> <code>-<id>.pdf. Anything unreadable falls back.
const filenameFrom = (header, fallback) => {
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(String(header || ""));
  let name = "";
  if (m) { try { name = decodeURIComponent(m[1].trim()); } catch (e) { name = m[1].trim(); } }
  return name || fallback;
};
// A response that is a file rather than JSON. The token and the refusal handling are apiFetch's, so a
// 401 signs out and a refusal arrives with the words the API sent and its status.
async function apiDownload(path, token, fallbackName) {
  const r = await fetch(API + path, { headers: { "Authorization": "Bearer " + token } });
  if (r.status === 401) { window.dispatchEvent(new Event("ocsa-session-expired")); const err = new Error("Session expired"); err.status = 401; throw err; }
  if (!r.ok) { const e = await r.json().catch(() => ({})); const err = new Error(e.error || "Request failed"); err.status = r.status; err.code = e.code; err.body = e; throw err; }
  return { blob: await r.blob(), filename: filenameFrom(r.headers.get("Content-Disposition"), fallbackName || "report.pdf") };
}
async function apiFetch(path, opts = {}) {
  const h = { "Content-Type": "application/json", ...opts.headers };
  if (opts.token) h["Authorization"] = "Bearer " + opts.token;
  const r = await fetch(API + path, { ...opts, headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (r.status === 401) { window.dispatchEvent(new Event("ocsa-session-expired")); const err = new Error("Session expired"); err.status = 401; throw err; }
  if (!r.ok) { const e = await r.json().catch(() => ({})); const err = new Error(e.error || "Request failed"); err.status = r.status; err.code = e.code; err.body = e; throw err; }
  return r.json();
}
// The signed-in session, persisted so a refresh or a restored tab does not land on the login card.
// A stored token is never trusted on its own: AdminDashboard verifies it with GET /api/auth/me first.
const AUTH_KEY = "ocsa_auth";
const readAuth = () => { try { const raw = localStorage.getItem(AUTH_KEY); if (!raw) return null; const d = JSON.parse(raw); return d && typeof d.token === "string" && d.token ? d : null; } catch { return null; } };
const writeAuth = (token, user) => { try { localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user })); } catch {} };
const clearAuth = () => { try { localStorage.removeItem(AUTH_KEY); } catch {} };
// Every page id the render switch knows. The URL hash is checked against this list before it is used.
const PAGE_IDS = ["overview", "staff", "hr", "sites", "assigned", "schedule", "operations", "issues", "supplies", "vendors", "services", "chat", "reports", "inspections", "marketplace", "forms", "settings", "cases", "help"];
// The pages an admin opens and nobody else. A person who reaches one of these another way is told
// so in the page body rather than left looking at a header over nothing.
const ADMIN_ONLY_PAGES = ["staff", "cases", "forms", "settings"];
const hashParts = () => window.location.hash.replace(/^#/, "").split("/").filter(Boolean);
const pageFromHash = () => { const h = hashParts()[0] || ""; return PAGE_IDS.includes(h) ? h : "overview"; };
// What follows the page id in the hash, for a page that reads one. #forms is unchanged by this.
const subFromHash = () => { const parts = hashParts(); return PAGE_IDS.includes(parts[0]) ? parts.slice(1) : []; };
function dlCSV(fn, hds, rows) {
  const csv = [hds.join(","), ...rows.map(r => r.map(c => '"' + String(c || "").replace(/"/g, '""') + '"').join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = fn; a.click();
}

function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (blob) resolve(new File([blob], "photo.jpg", { type: "image/jpeg" }));
        else reject(new Error("Compression failed"));
      }, "image/jpeg", quality || 0.8);
    };
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = URL.createObjectURL(file);
  });
}

// ===== THEME SYSTEM =====
// The computer's own typeface. On a Mac or an iPhone that is Apple's, on Windows it is Segoe UI.
// Both names stay, because the screens are written in terms of them, and both point here.
const FONT_HEAD = "-apple-system,BlinkMacSystemFont,system-ui,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_BODY = FONT_HEAD;
// Text size. The same four the staff portal offers, applied the same way: one CSS zoom on the root,
// which scales type, spacing, borders and controls together. Standard is 1, so a person who leaves it
// alone sees exactly what they saw before.
// A zoomed root is a narrower page in its own terms: 1280 pixels of window is 853 of page at the
// largest size. Under this width a two or three column form grid gives a date field less room than it
// needs, so the 78 grids written with equal columns, 56 of two and 22 of three, fall to one, and the
// Schedule week gives its name column back and holds its seven days at a width somebody can read,
// which makes the grid scroll sideways inside the box it already has. Both rules match the inline
// style the file already writes, so no screen is rewritten and nothing is written at Standard.
const ONE_COLUMN_PX = 1000;
const NARROW_GRID_CSS = '[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr !important}'
  + '[style*="grid-template-columns: 140px repeat(7"]{grid-template-columns:minmax(88px,140px) repeat(7,minmax(84px,1fr)) !important}';
const TEXT_SIZES = [
  { id: "standard", label: "Standard", factor: 1 },
  { id: "large", label: "Large", factor: 1.15 },
  { id: "xlarge", label: "Extra large", factor: 1.3 },
  { id: "largest", label: "Largest", factor: 1.5 },
];
const textSizeFactor = (id) => (TEXT_SIZES.find((x) => x.id === id) || TEXT_SIZES[0]).factor;
// A root that is zoomed is a smaller window in the page's own terms, so anything written against the
// window is divided by the same number.
const vh = (n, zoom) => zoom === 1 ? n + "vh" : "calc(" + n + "vh / " + zoom + ")";
const R = { sm: 8, md: 10, lg: 14, pill: 999 };
const NAVY = clientConfig.brand.navy;
const GOLD = clientConfig.brand.gold;
const NAVY_DARK = clientConfig.brand.navyDark;
const PANEL_LIGHT = clientConfig.brand.panelLight;
const GO = GOLD, GL = "#FCEA4A", GR = "#2ECC71", RD = "#E74C3C", OR = "#F39C12", BL = "#24A4F4", TL = "#1ABC9C";
const CIMS_LABELS = { SD: "Service Delivery", HSE: "Health, Safety & Environment", GB: "Green Buildings", QS: "Quality System", HR: "Human Resources", MC: "Management Commitment" };
const LOGO_SM = process.env.PUBLIC_URL + "/ocsa-logo-sm.png";
const LOGO_LG = process.env.PUBLIC_URL + "/ocsa-logo.png";
const DARK = {
  dark: true,
  bg: NAVY, card: "#132240", cardAlt: "#1B3058", border: "rgba(255,255,255,0.06)", borderSolid: "#1B3058",
  text: "#F8F7F4", textSec: "#A8B8C8", textMut: "#8899AA", inputBg: "rgba(255,255,255,0.04)", inputBorder: "#1B3058",
  hover: "rgba(255,255,255,0.02)", goldBg: "rgba(231,176,23,0.12)", goldBorder: "rgba(231,176,23,0.25)", goldText: GO,
  shadow: "0 4px 20px rgba(0,0,0,0.30)", popShadow: "0 18px 50px rgba(0,0,0,0.55)",
  modalOverlay: "rgba(0,0,0,0.7)",
  btnGhost: "#1B3058", scrollThumb: "#1B3058", greenSubtle: "rgba(46,204,113,0.04)", greenBorder: "rgba(46,204,113,0.1)",
  blueSubtle: "rgba(36,164,244,0.06)", blueBorder: "rgba(36,164,244,0.15)",
  redSubtle: "rgba(231,76,60,0.06)", redBorder: "rgba(231,76,60,0.2)",
  orangeSubtle: "rgba(243,156,18,0.08)", orangeBorder: "rgba(243,156,18,0.2)",
  goldSubtle: "rgba(231,176,23,0.06)", goldSubtleBorder: "rgba(231,176,23,0.15)",
};
const LIGHT = {
  dark: false,
  bg: "#F4F7FB", card: "#FFFFFF", cardAlt: "#EEF3F9", border: "#E4EAF2", borderSolid: "#D2DBE6",
  text: NAVY, textSec: "#4A5C70", textMut: "#5F6E7F", inputBg: "#FFFFFF", inputBorder: "#D2DBE6",
  hover: "#F0F5FC", goldBg: "rgba(231,176,23,0.08)", goldBorder: "rgba(231,176,23,0.35)", goldText: "#8A5F10",
  shadow: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.06)", popShadow: "0 18px 45px rgba(16,24,40,0.18)",
  modalOverlay: "rgba(0,0,0,0.4)",
  btnGhost: "#E7EDF5", scrollThumb: "#C6D2E0", greenSubtle: "rgba(46,204,113,0.06)", greenBorder: "rgba(46,204,113,0.15)",
  blueSubtle: "rgba(36,164,244,0.06)", blueBorder: "rgba(36,164,244,0.15)",
  redSubtle: "rgba(231,76,60,0.06)", redBorder: "rgba(231,76,60,0.15)",
  orangeSubtle: "rgba(243,156,18,0.06)", orangeBorder: "rgba(243,156,18,0.15)",
  goldSubtle: "rgba(231,176,23,0.06)", goldSubtleBorder: "rgba(231,176,23,0.2)",
};

const goldToText = (t, c) => (c === GO ? t.goldText : c);
const ThemeCtx = createContext(DARK);
const useT = () => useContext(ThemeCtx);
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
const CamI = p => <Ic d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" {...p} />;
const SnI = p => <Ic d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" {...p} />;
const LoI = p => <Ic d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" {...p} />;
const DlI = p => <Ic d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" {...p} />; const ChkI = p => <Ic d="M20 6L9 17l-5-5" {...p} />;
const WkI = p => <Ic d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" {...p} />;
const EdI = p => <Ic d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" {...p} />;
const DlrI = p => <Ic d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" {...p} />;
const SwpI = p => <Ic d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" {...p} />;
const FolI = p => <Ic d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" {...p} />;
const StgI = p => <Ic d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 0-1 1.73l-.43.25a2 2 0 0 0-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 0 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 0 2 0l.43.25a2 2 0 0 0 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 0 1-1.73l.43-.25a2 2 0 0 0 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 0 0-2l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 0-2 0l-.43-.25a2 2 0 0 0-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" {...p} />;
const SunI = p => <Ic d="M12 3v1m0 16v1m-8-9H3m18 0h-1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" {...p} />;
const MoonI = p => <Ic d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" {...p} />;
const RL = { admin: "Admin", supervisor: "Supervisor", custodial_lead: "Custodial Lead", custodial_laborer: "Custodial Laborer", day_porter: "Day Porter", contractor: "Contractor" };
const ET = { full_time: "Full Time", part_time: "Part Time", supplemental: "Supplemental" };

// ===== THEMED SHARED COMPONENTS =====
const Tst = ({ t: msg }) => <div style={{ position: "fixed", top: 20, right: 20, background: msg.t === "error" ? RD : GR, color: "#F8F7F4", padding: "11px 20px", borderRadius: R.sm, fontSize: 13, fontWeight: 600, zIndex: 1000, boxShadow: "0 8px 30px rgba(0,0,0,0.35)", fontFamily: FONT_BODY }}>{msg.m}</div>;
const Crd = ({ children, style, onClick: oc, t }) => <div onClick={oc} style={{ background: t.card, border: "1px solid " + t.border, borderRadius: R.lg, padding: 16, cursor: oc ? "pointer" : "default", boxShadow: t.shadow, transition: "transform .15s ease, box-shadow .15s ease", ...style }}>{children}</div>;
const Bdg = ({ l, c }) => { const t = useT(); return <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", padding: "3px 10px", borderRadius: R.pill, background: c + "1f", color: goldToText(t, c) }}>{l}</span>; };
const SecT = ({ children, action, onAction, t }) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, marginTop: 8 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: ".2px" }}>{children}</div>{action && <button onClick={onAction} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: R.sm, border: "none", background: "linear-gradient(135deg," + GO + "," + GL + ")", color: NAVY, fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 16px -8px " + GO }}><PlI sz={13} c={NAVY} /> {action}</button>}</div>;
const Inp = ({ t, ...p }) => <input {...p} style={{ width: "100%", padding: "10px 13px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: FONT_BODY, transition: "border-color .15s ease", ...p.style }} />;
const Sel = ({ options: o, t, ...p }) => <select {...p} style={{ width: "100%", padding: "10px 13px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: FONT_BODY, ...p.style }}>{o.map(x => <option key={x.v} value={x.v}>{x.l}</option>)}</select>;
const Btn = ({ children, v = "primary", t, ...p }) => <button {...p} style={{ padding: "10px 18px", borderRadius: R.sm, border: (v === "primary" || v === "danger") ? "none" : "1px solid " + t.borderSolid, background: v === "primary" ? "linear-gradient(135deg," + GO + "," + GL + ")" : v === "danger" ? RD : t.btnGhost, color: v === "primary" ? NAVY : v === "danger" ? "#F8F7F4" : t.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY, boxShadow: v === "primary" ? "0 6px 16px -8px " + GO : "none", transition: "transform .12s ease", ...p.style }}>{children}</button>;
const Lbl = ({ children }) => { const t = useT(); return <label style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, display: "block", marginBottom: 6, fontFamily: FONT_BODY }}>{children}</label>; };
const Mdl = ({ children, onClose: oc, t }) => <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: t.modalOverlay, backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={oc}><div style={{ background: t.card, borderRadius: 16, border: "1px solid " + t.border, maxWidth: 540, width: "100%", maxHeight: "calc(85vh / var(--zoom, 1))", overflow: "auto", boxShadow: t.popShadow }} onClick={e => e.stopPropagation()}>{children}</div></div>;
const Ini = ({ name: n, sz = 36, color: c = GO }) => { const t = useT(); return <div style={{ width: sz, height: sz, borderRadius: "50%", background: "rgba(231,176,23,0.14)", border: "1.5px solid " + c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.36, fontWeight: 600, color: goldToText(t, c), flexShrink: 0, fontFamily: FONT_HEAD }}>{n?.split(" ").map(x => x[0]).join("")}</div>; };
const SC = ({ label, value, sub, color: c = GO, icon: I, delta, deltaUp, t }) => <Crd t={t} style={{ flex: "1 1 150px", minWidth: 150 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, color: t.textMut, fontWeight: 600 }}>{label}</div><div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 26, fontWeight: 600, color: goldToText(t, c) }}>{value}</div>{delta != null && <span style={{ fontSize: 12, fontWeight: 600, color: deltaUp ? GR : RD }}>{deltaUp ? "+" : "-"}{delta}</span>}</div>{sub && <div style={{ fontSize: 11, color: t.textSec, marginTop: 3 }}>{sub}</div>}</div>{I && <div style={{ width: 34, height: 34, borderRadius: R.sm, background: c + "1f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><I sz={17} c={goldToText(t, c)} /></div>}</div></Crd>;
const PUBLIC_BASE = process.env.PUBLIC_URL || "";
const OCSA_LOGO_URL = (PUBLIC_BASE.indexOf("http") === 0 ? PUBLIC_BASE : window.location.origin + PUBLIC_BASE) + "/ocsa-logo.png";
const TArea = ({ t, ...p }) => <textarea {...p} style={{ width: "100%", padding: "10px 13px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontSize: 13, resize: "vertical", fontFamily: FONT_BODY, ...p.style }} />;
const AdminOnlyNotice = ({ t, onBack }) => <Crd t={t} style={{ padding: 30, textAlign: "center" }}><div style={{ fontSize: 14, color: t.text, marginBottom: 16 }}>This page is for admins.</div><Btn t={t} v="ghost" onClick={onBack}>Back to Dashboard</Btn></Crd>;

// ===== BRANDED CHART TOOLKIT (ApexCharts) =====
const CHART_PALETTE = [GO, BL, GR, OR, TL, RD, GL];
const chartBase = (t, extra) => ({
  chart: { fontFamily: FONT_BODY, foreColor: t.textSec, toolbar: { show: false }, background: "transparent", parentHeightOffset: 0, animations: { easing: "easeinout", speed: 500 } },
  grid: { borderColor: t.border, strokeDashArray: 4, padding: { left: 6, right: 6 } },
  theme: { mode: t.dark ? "dark" : "light" },
  tooltip: { theme: t.dark ? "dark" : "light" },
  dataLabels: { enabled: false },
  legend: { labels: { colors: t.textSec }, fontFamily: FONT_BODY },
  states: { hover: { filter: { type: "lighten", value: 0.06 } } },
  ...extra,
});
const ChartCard = ({ title, sub, t, action, onAction, children }) => <Crd t={t} style={{ padding: 0, overflow: "hidden" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 18px", borderBottom: "1px solid " + t.border }}><div><div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: t.text }}>{title}</div>{sub && <div style={{ fontSize: 11, color: t.textMut, marginTop: 2 }}>{sub}</div>}</div>{action && <button onClick={onAction} style={{ fontSize: 12, fontWeight: 600, color: t.goldText, background: "none", border: "none", cursor: "pointer", fontFamily: FONT_BODY }}>{action}</button>}</div><div style={{ padding: "12px 10px 6px" }}>{children}</div></Crd>;
const BarChartW = ({ categories, values, colors, horizontal = false, height = 260, t, valueSuffix = "", name = "Value" }) => <Chart type="bar" height={height} series={[{ name, data: values }]} options={chartBase(t, { plotOptions: { bar: { horizontal, borderRadius: 6, columnWidth: "52%", distributed: true } }, colors: colors || CHART_PALETTE, xaxis: { categories, labels: { rotate: -25, style: { colors: t.textMut, fontSize: "11px" } } }, yaxis: { labels: { style: { colors: t.textMut, fontSize: "11px" }, ...(horizontal ? {} : { formatter: v => Math.round(v) + valueSuffix }) } }, legend: { show: false } })} />;
const LineChartW = ({ categories, series, height = 260, t, colors }) => <Chart type="area" height={height} series={series} options={chartBase(t, { stroke: { curve: "smooth", width: 2.5 }, colors: colors || CHART_PALETTE, fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.02 } }, xaxis: { categories, labels: { style: { colors: t.textMut, fontSize: "11px" } } }, yaxis: { labels: { style: { colors: t.textMut, fontSize: "11px" }, formatter: v => Math.round(v) } } })} />;
const DonutChartW = ({ labels, values, height = 260, t, colors }) => <Chart type="donut" height={height} series={values} options={chartBase(t, { labels, colors: colors || CHART_PALETTE, stroke: { colors: [t.card], width: 2 }, plotOptions: { pie: { donut: { size: "70%", labels: { show: true, total: { show: true, color: t.textMut, fontSize: "12px" }, value: { color: t.text, fontFamily: FONT_HEAD, fontSize: "22px", fontWeight: 600 } } } } }, legend: { position: "bottom", labels: { colors: t.textSec } } })} />;
const RadialW = ({ value, label, valueText, height = 260, t, color = GO }) => <Chart type="radialBar" height={height} series={[Math.round(value)]} options={chartBase(t, { plotOptions: { radialBar: { hollow: { size: "60%" }, track: { background: t.cardAlt }, dataLabels: { name: { color: t.textMut, fontSize: "12px", offsetY: 22 }, value: { color: t.text, fontSize: "24px", fontWeight: 600, fontFamily: FONT_HEAD, offsetY: -12, formatter: valueText != null ? (() => valueText) : (v => Math.round(v) + "%") } } } }, labels: [label], colors: [color], fill: { type: "gradient", gradient: { shade: "dark", gradientToColors: [GL], stops: [0, 100] } } })} />;

// ===== DATE RANGE PICKER (shared component) =====
function getMonday(d) { const dt = new Date(d); const day = dt.getDay(); const diff = day === 0 ? 6 : day - 1; dt.setDate(dt.getDate() - diff); dt.setHours(0,0,0,0); return dt; }
function fmtRange(s, e) {
  const sd = new Date(s + "T00:00:00"), ed = new Date(e + "T00:00:00");
  const sm = sd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const em = ed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return sm + " - " + em;
}
function toISO(d) { return d.toISOString().split("T")[0]; }

const PRESETS = {
  thisWeek: () => { const m = getMonday(new Date()); const s = new Date(m); s.setDate(s.getDate() + 6); return { start: toISO(m), end: toISO(s) }; },
  lastWeek: () => { const m = getMonday(new Date()); m.setDate(m.getDate() - 7); const s = new Date(m); s.setDate(s.getDate() + 6); return { start: toISO(m), end: toISO(s) }; },
  nextWeek: () => { const m = getMonday(new Date()); m.setDate(m.getDate() + 7); const s = new Date(m); s.setDate(s.getDate() + 6); return { start: toISO(m), end: toISO(s) }; },
  thisMonth: () => { const n = new Date(); return { start: n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-01", end: toISO(n) }; },
  last7: () => { const n = new Date(); const p = new Date(n); p.setDate(p.getDate() - 6); return { start: toISO(p), end: toISO(n) }; },
  last30: () => { const n = new Date(); const p = new Date(n); p.setDate(p.getDate() - 29); return { start: toISO(p), end: toISO(n) }; },
  last60: () => { const n = new Date(); const p = new Date(n); p.setDate(p.getDate() - 59); return { start: toISO(p), end: toISO(n) }; },
  last90: () => { const n = new Date(); const p = new Date(n); p.setDate(p.getDate() - 89); return { start: toISO(p), end: toISO(n) }; },
};

function DateRangePicker({ value, onChange, t, presets }) {
  const [showCustom, setShowCustom] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const pills = presets || [
    { key: "thisWeek", label: "This Week" },
    { key: "lastWeek", label: "Last Week" },
    { key: "thisMonth", label: "This Month" },
    { key: "last30", label: "Last 30 Days" },
    { key: "last90", label: "Last 90 Days" },
  ];
  const pickPreset = (key) => {
    if (PRESETS[key]) { onChange(PRESETS[key]()); setActivePreset(key); setShowCustom(false); }
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text, minWidth: 160, cursor: "pointer" }} onClick={() => setShowCustom(!showCustom)}>
          {fmtRange(value.start, value.end)}
          <span style={{ fontSize: 10, color: t.goldText, marginLeft: 6 }}>&#9662;</span>
        </div>
        {pills.map(p => (
          <button key={p.key} onClick={() => pickPreset(p.key)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: activePreset === p.key ? 700 : 500, cursor: "pointer", background: activePreset === p.key ? t.goldBg : "transparent", color: activePreset === p.key ? t.goldText : t.textMut, border: activePreset === p.key ? "1px solid " + t.goldBorder : "1px solid transparent" }}>{p.label}</button>
        ))}
        <button onClick={() => setShowCustom(!showCustom)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: showCustom ? 700 : 500, cursor: "pointer", background: showCustom ? t.goldBg : "transparent", color: showCustom ? t.goldText : t.textMut, border: showCustom ? "1px solid " + t.goldBorder : "1px solid transparent" }}>Custom</button>
        <button onClick={() => { const r = PRESETS.thisWeek(); onChange(r); setActivePreset("thisWeek"); setShowCustom(false); }} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 500, cursor: "pointer", background: "transparent", color: BL, border: "1px solid " + t.border }}>Today</button>
      </div>
      {showCustom && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <input type="date" value={value.start} onChange={e => { onChange({ ...value, start: e.target.value }); setActivePreset(null); }} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontSize: 12, fontFamily: FONT_BODY }} />
          <span style={{ fontSize: 11, color: t.textMut }}>to</span>
          <input type="date" value={value.end} onChange={e => { onChange({ ...value, end: e.target.value }); setActivePreset(null); }} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontSize: 12, fontFamily: FONT_BODY }} />
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState(null); const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(() => readAuth() !== null);
  const [page, setPage] = useState(() => pageFromHash()); const [route, setRoute] = useState(() => subFromHash()); const [toast, setToast] = useState(null); const [loading, setLoading] = useState(false);
  // A stored choice wins. Without one the computer decides, and dark is the answer when it says
  // nothing at all.
  const [themeMode, setThemeMode] = useState(() => {
    try { const stored = localStorage.getItem("ocsa-theme"); if (stored === "light" || stored === "dark") return stored; } catch {}
    try { if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light"; } catch {}
    return "dark";
  });
  // How large this person reads. Kept in this browser, the way the theme is.
  const [textSize, setTextSize] = useState(() => {
    try { const stored = localStorage.getItem("ocsa-text-size"); if (TEXT_SIZES.some((x) => x.id === stored)) return stored; } catch {}
    return "standard";
  });
  const zoom = textSizeFactor(textSize);
  // At Standard the property is left off the root altogether, so the page is what it always was.
  // Published to the subtree as well: a height or width written against the window is in the
  // window's own pixels, which the zoom then multiplies, so every one of them divides by this.
  const zoomStyle = zoom === 1 ? {} : { zoom, "--zoom": String(zoom) };
  const chooseTextSize = (id) => { setTextSize(id); try { localStorage.setItem("ocsa-text-size", id); } catch {} };
  const [pageNarrow, setPageNarrow] = useState(() => { try { return window.innerWidth / zoom < ONE_COLUMN_PX; } catch (e) { return false; } });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => { try { return localStorage.getItem("ocsa-sb-collapsed") === "true"; } catch { return false; } });
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [navQ, setNavQ] = useState(""); const [navOpen, setNavOpen] = useState(false); const [userMenuOpen, setUserMenuOpen] = useState(false); const [notif, setNotif] = useState(null);
  const toggleSidebar = () => { const next = !sidebarCollapsed; setSidebarCollapsed(next); try { localStorage.setItem("ocsa-sb-collapsed", next); } catch {} };
  // Session 24 hotfix: auto-collapse sidebar on narrow viewports (laptops, small windows).
  // User's localStorage preference is honored when the window is wide enough.
  useEffect(() => {
    const NARROW_BREAKPOINT_PX = 1100;
    const userPreference = () => { try { return localStorage.getItem("ocsa-sb-collapsed") === "true"; } catch { return false; } };
    const applyResponsive = () => {
      if (typeof window === "undefined") return;
      // The page's own width, which is the window's divided by whatever the text is zoomed by.
      const own = window.innerWidth / zoom;
      setPageNarrow(own < ONE_COLUMN_PX);
      if (own < NARROW_BREAKPOINT_PX) setSidebarCollapsed(true);
      else setSidebarCollapsed(userPreference());
    };
    applyResponsive();
    window.addEventListener("resize", applyResponsive);
    return () => window.removeEventListener("resize", applyResponsive);
  }, [zoom]);
  const toggleGroup = (label) => { setCollapsedGroups(prev => { const next = new Set(prev); if (next.has(label)) { next.delete(label); } else { next.add(label); } return next; }); };
  const t = themeMode === "light" ? LIGHT : DARK;
  useEffect(() => {
    try {
      document.body.style.backgroundColor = t.bg;
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", t.bg);
    } catch (e) {}
  }, [t.bg]);
  const toggleTheme = () => { const next = themeMode === "dark" ? "light" : "dark"; setThemeMode(next); try { localStorage.setItem("ocsa-theme", next); } catch {} };
  const textSizeChoice = (compact) => (<div style={{ padding: compact ? "6px 10px 8px" : 0 }}>
    <div style={{ fontSize: 11, color: t.textMut, marginBottom: 6, fontFamily: FONT_BODY }}>Text size</div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {TEXT_SIZES.map(x => { const on = textSize === x.id; return (<button key={x.id} onClick={() => chooseTextSize(x.id)} aria-pressed={on} title={x.label}
        style={{ minWidth: 44, minHeight: 44, padding: "0 10px", borderRadius: R.sm, border: "1px solid " + (on ? GO : t.border), background: on ? t.goldBg : "transparent", color: on ? t.goldText : t.textSec, fontSize: 12, fontWeight: on ? 600 : 500, fontFamily: FONT_BODY, cursor: "pointer" }}>{x.label}</button>); })}
    </div>
  </div>);
  const showToast = useCallback((m, tp = "success") => { setToast({ m, t: tp }); setTimeout(() => setToast(null), 3000); }, []);
  const af = useCallback((path, opts = {}) => apiFetch(path, { ...opts, token }), [token]);
  const uf = useCallback((file, bucket) => apiUpload(file, bucket, token), [token]);
  const isAdmin = user?.role === "admin";
  // The manage permissions capability opens the Roles and Permissions screen, which is the screen it
  // names. One quiet call when the session starts asks the API for this person's own effective
  // capabilities: a 200 answers it, and any other answer leaves them with what their role gives.
  const [canManagePermissions, setCanManagePermissions] = useState(false);
  // One rule for the pages this person can open. The render switch, the sidebar, the user menu and
  // the notice panel read it, so a page is never open in one place and closed in another.
  const canOpenPage = useCallback((id) => {
    if (id === "settings") return isAdmin || canManagePermissions;
    return isAdmin || ADMIN_ONLY_PAGES.indexOf(id) < 0;
  }, [isAdmin, canManagePermissions]);
  const [sites, setSites] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [lookups, setLookups] = useState([]);
  const loadSites = useCallback(async () => { try { const s = await af("/api/sites"); setSites(s); return s; } catch (e) { console.warn("Failed to load sites:", e.message); return []; } }, [af]);
  const loadStaff = useCallback(async () => { try { const s = await af("/api/users?status=active"); setAllStaff(s); return s; } catch (e) { console.warn("Failed to load staff:", e.message); return []; } }, [af]);
  const loadLookups = useCallback(async () => { try { const d = await af("/api/lookups/all"); setLookups(d); } catch (e) { console.warn("Failed to load lookups:", e.message); } }, [af]);
  useEffect(() => { if (token) { loadSites(); loadStaff(); loadLookups(); } }, [token]);
  useEffect(() => {
    const id = user && user.id != null ? String(user.id) : "";
    if (!token || !id || isAdmin) { setCanManagePermissions(false); return; }
    let alive = true;
    af("/api/users/" + encodeURIComponent(id) + "/permissions")
      .then(d => { if (alive) setCanManagePermissions(!!(d && d.effective && d.effective.manage_permissions)); })
      .catch(e => { if (alive) setCanManagePermissions(false); console.warn("Own capabilities:", e.message); });
    return () => { alive = false; };
  }, [token, user, isAdmin, af]);
  useEffect(() => { if (!token) return; let alive = true; af("/api/reports/overview").then(d => { if (alive) setNotif({ openIssues: d.openIssues, pendingStaff: d.pendingStaff }); }).catch(() => {}); return () => { alive = false; }; }, [token, page]);
  // How many Speak Up cases are waiting: unheld, due soon or overdue. Admins only. The route writes no
  // audit row, so it is polled every 60 seconds while the tab is visible and again after a save on the
  // Cases page. A failed poll keeps the last count and logs one warning.
  const [caseQueue, setCaseQueue] = useState(null);
  const loadCaseQueue = useCallback(async () => { try { const d = await af("/api/hr-cases/queue-count"); setCaseQueue({ unassigned: Number(d && d.unassigned) || 0, dueSoon: Number(d && d.dueSoon) || 0, overdue: Number(d && d.overdue) || 0 }); } catch (e) { console.warn("Case queue count:", e.message); } }, [af]);
  // What this person has been told. The count is quiet until the notifications routes are live: any
  // failure hides it and logs one warning, and nothing ever toasts.
  const [unread, setUnread] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const loadUnread = useCallback(async () => { try { const d = await af("/api/notifications/unread-count"); setUnread(Number(d && d.unread) || 0); } catch (e) { setUnread(0); console.warn("Unread notifications:", e.message); } }, [af]);
  // One timer drives the bell and the Cases badge together, so the two polls never stack.
  useEffect(() => {
    if (!token) { setCaseQueue(null); setUnread(0); setBellOpen(false); return; }
    const tick = () => { loadUnread(); if (isAdmin) loadCaseQueue(); };
    tick();
    const iv = setInterval(() => { if (!document.hidden) tick(); }, 60000);
    return () => clearInterval(iv);
  }, [token, isAdmin, loadUnread, loadCaseQueue]);
  const caseQueueCount = caseQueue ? caseQueue.unassigned + caseQueue.dueSoon + caseQueue.overdue : 0;
  // What a badge on the side panel is made of. The light arm is the only thing that changed.
  const badgeRed = themeMode === "light" ? "#C62828" : RD;
  const badgeRedText = themeMode === "light" ? "#FFFFFF" : "#F8F7F4";
  const badgeRing = themeMode === "light" ? { boxShadow: "0 0 0 2px #FFFFFF" } : {};
  const openIssuesCount = notif && Number(notif.openIssues) > 0 ? Number(notif.openIssues) : 0;
  const OpenIssuesBadge = ({ style }) => openIssuesCount > 0 ? <span aria-label={openIssuesCount + " open issues"} style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: badgeRed, color: badgeRedText, fontSize: 10, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, ...badgeRing, ...style }}>{openIssuesCount > 9 ? "9+" : openIssuesCount}</span> : null;
  const CaseQueueBadge = ({ style }) => caseQueueCount > 0 ? <span aria-label={caseQueueCount + " cases need attention"} style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: caseQueue.overdue > 0 ? badgeRed : GO, color: caseQueue.overdue > 0 ? badgeRedText : NAVY, fontSize: 10, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, ...badgeRing, ...style }}>{caseQueueCount > 9 ? "9+" : caseQueueCount}</span> : null;
  const getOpts = useCallback((slug, placeholder) => { const cat = lookups.find(c => c.slug === slug); if (!cat) return placeholder ? [{ v: "", l: placeholder }] : []; const opts = (cat.values || []).filter(v => v.is_active).sort((a, b) => a.sort_order - b.sort_order).map(v => ({ v: v.value, l: v.label })); return placeholder ? [{ v: "", l: placeholder }, ...opts] : opts; }, [lookups]);
  const lkMap = useCallback((slug) => { const cat = lookups.find(c => c.slug === slug); if (!cat) return {}; const m = {}; (cat.values || []).forEach(v => { m[v.value] = v.label; }); return m; }, [lookups]);
  const lkColorMap = useCallback((slug) => { const cat = lookups.find(c => c.slug === slug); if (!cat) return {}; const m = {}; (cat.values || []).forEach(v => { if (v.color) m[v.value] = v.color; }); return m; }, [lookups]);
  const lkHasOther = useCallback((slug, val) => { const cat = lookups.find(c => c.slug === slug); if (!cat) return false; const v = (cat.values || []).find(x => x.value === val); return v?.show_other_input || false; }, [lookups]);
  // One sign-out path, used by every sign-out control and by an expired session: the stored session,
  // the token, the person, the bell's unread count and its open panel all go together.
  const signOut = useCallback(() => { clearAuth(); setToken(null); setUser(null); setUnread(0); setBellOpen(false); }, []);
  useEffect(() => { const h = () => signOut(); window.addEventListener("ocsa-session-expired", h); return () => window.removeEventListener("ocsa-session-expired", h); }, [signOut]);
  // The active page rides in the URL hash, nothing else does. A refresh reopens the same page and
  // the browser back and forward buttons move between pages. The hash is validated against PAGE_IDS
  // and is not a permission: a page shows exactly what it showed the role before.
  useEffect(() => {
    if (!token) return;
    const cur = window.location.hash.replace(/^#/, "");
    if (cur === page || cur.split("/")[0] === page) return;
    if (cur === "") window.history.replaceState(null, "", "#" + page); else window.location.hash = page;
  }, [page, token]);
  useEffect(() => { const h = () => { const next = pageFromHash(); setPage(prev => (prev === next ? prev : next)); setRoute(subFromHash()); }; window.addEventListener("hashchange", h); return () => window.removeEventListener("hashchange", h); }, []);
  // Replacing the hash adds no history entry and fires no hashchange, so the route is set here too.
  const replaceRoute = useCallback((parts) => { const h = "#" + [page, ...parts].join("/"); window.history.replaceState(null, "", h); setRoute(parts); }, [page]);
  useEffect(() => {
    const stored = readAuth();
    if (!stored) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(API + "/api/auth/me", { headers: { "Authorization": "Bearer " + stored.token } });
        if (r.status === 401 || r.status === 403) { clearAuth(); return; }
        if (!r.ok) return;
        const d = await r.json();
        const u = d && d.user;
        if (!u || (u.role !== "admin" && u.role !== "supervisor")) { clearAuth(); return; }
        if (!alive) return;
        writeAuth(stored.token, u);
        setToken(stored.token); setUser(u);
      } catch (e) { console.warn("Session check failed:", e.message); }
      finally { if (alive) setAuthChecking(false); }
    })();
    return () => { alive = false; };
  }, []);
  const handleLogin = async (phone, pin) => {
    setLoading(true);
    try { const d = await apiFetch("/api/auth/login", { method: "POST", body: { phone, pin } }); if (d.user.role !== "admin" && d.user.role !== "supervisor") { showToast("Admin access required", "error"); setLoading(false); return; } writeAuth(d.token, d.user); setToken(d.token); setUser(d.user); showToast("Welcome, " + d.user.firstName); } catch (e) { showToast(e.message, "error"); }
    setLoading(false);
  };
  if (authChecking) return (<div style={{ ...zoomStyle, width: "100%", minHeight: vh(100, zoom), background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, color: t.textMut, fontSize: 13 }}>Loading...</div>);
  if (!token) return (<ThemeCtx.Provider value={t}><div style={{ ...zoomStyle, width: "100%", minHeight: vh(100, zoom), background: themeMode === "dark" ? "radial-gradient(1100px 600px at 50% -12%, #16294a 0%, " + NAVY + " 62%)" : t.bg, fontFamily: FONT_BODY, color: t.text, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "24px" }}>
    <div style={{ width: "100%", maxWidth: 400 }}>
      <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 18, boxShadow: t.popShadow, padding: "34px 30px 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}><div style={{ display: "inline-block", padding: themeMode === "dark" ? "12px 20px" : "0", background: themeMode === "dark" ? "rgba(255,255,255,0.95)" : "transparent", borderRadius: 12 }}><img src={LOGO_LG} alt={clientConfig.company.shortName} style={{ height: 64 }} /></div><div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: t.text, marginTop: 16, letterSpacing: ".3px" }}>Admin Dashboard</div><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: GR, marginTop: 7 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: GR, display: "inline-block" }} />Connected to Live API</div></div>
        <LoginForm onLogin={handleLogin} loading={loading} t={t} />
      </div>
      <div style={{ marginTop: 18, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>{textSizeChoice()}</div>
      <div style={{ textAlign: "center", marginTop: 18 }}><button onClick={toggleTheme} style={{ background: "none", border: "1px solid " + t.border, borderRadius: 8, padding: "7px 14px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, color: t.textMut, fontSize: 11, fontFamily: FONT_BODY }}>{themeMode === "dark" ? <SunI sz={14} c={t.textMut} /> : <MoonI sz={14} c={t.textMut} />}{themeMode === "dark" ? "Light Mode" : "Dark Mode"}</button></div>
    </div>
    {toast && <Tst t={toast} />}
    <style>{`*{box-sizing:border-box}input::placeholder,textarea::placeholder{color:${t.textMut}}select{color-scheme:${themeMode}}:focus-visible{outline:2px solid ${themeMode === "light" ? PANEL_LIGHT : GO};outline-offset:2px}${pageNarrow ? NARROW_GRID_CSS : ""}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
  </div></ThemeCtx.Provider>);  const BxI = p => <Ic d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" {...p} />;
  const VnI = p => <Ic d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" {...p} />;
  const SvI = p => <Ic d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" {...p} />;
  const HsI = p => <Ic d="M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8" {...p} />;
  const GearI = p => <Ic d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" {...p} />;
  const ClpI = p => <Ic d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 12l2 2 4-4" {...p} />;
  const CalI = p => <Ic d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" {...p} />;
  const FmI = p => <Ic d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" {...p} />;
  const HlpI = p => <Ic d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01" {...p} />;

  const sidebarGroups = [
    { label: null, items: [{ id: "overview", l: "Dashboard", i: HmI }] },
    { label: "Operations", items: [
      { id: "operations", l: "Live Ops", i: ClI },
      { id: "sites", l: "Sites", i: MpI },
    ]},
    { label: "Staff", items: [
      ...(isAdmin ? [{ id: "staff", l: "Staff Management", i: UsI }] : []),
      { id: "hr", l: "HR Records", i: FolI },
      ...(isAdmin ? [{ id: "cases", l: "Cases", i: ClpI }] : []),
    ]},
    { label: "Quality", items: [
      { id: "issues", l: "Issues", i: AlI },
      { id: "assigned", l: "Assigned Tasks", i: WkI },
      { id: "inspections", l: "Inspections", i: ClpI },
    ]},
    { label: "Supplies", items: [{ id: "supplies", l: "Inventory", i: BxI }, { id: "vendors", l: "Vendors", i: VnI }] },
    { label: "Services", items: [{ id: "services", l: "Service Catalog", i: SvI }] },
    { label: "Time", items: [{ id: "schedule", l: "Schedule", i: CalI }, { id: "marketplace", l: "Shift Pickup", i: SwpI }] },
    { label: "Reports", items: [{ id: "reports", l: "Reports", i: BrI }] },
    ...(isAdmin ? [{ label: "Integrations", items: [{ id: "forms", l: "Forms", i: FmI }] }] : []),
    ...(canOpenPage("settings") ? [{ label: null, items: [{ id: "settings", l: "Settings", i: StgI }] }] : []),
    { label: null, items: [{ id: "chat", l: "Messages", i: ChI }, { id: "help", l: "Help", i: HlpI }] },
  ].filter(g => g.items.length > 0);

  const pageLabels = { overview: "Dashboard", staff: "Staff Management", hr: "HR Records", sites: "Sites", assigned: "Assigned Tasks", schedule: "Schedule", operations: "Live Operations", issues: "Issue Tracker", supplies: "Supplies & Inventory", vendors: "Vendor Registry", services: "Service Catalog", chat: "Messages", reports: "Reports", inspections: "Inspections", marketplace: "Shift Pickup", forms: "Forms", settings: "Settings", cases: "Cases", help: "Help" };
  const allNavItems = sidebarGroups.flatMap(g => g.items);
  const SB_W_EXPANDED = 220;
  const SB_W_COLLAPSED = 64;
  const SB_W = sidebarCollapsed ? SB_W_COLLAPSED : SB_W_EXPANDED;
  const SB_BG = themeMode === "light" ? PANEL_LIGHT : NAVY_DARK;
  const SB_HOVER = themeMode === "light" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)";
  const SB_ACTIVE = themeMode === "light" ? "rgba(255,255,255,0.92)" : "linear-gradient(90deg, rgba(231,176,23,0.20), rgba(231,176,23,0.04))";
  const SB_BORDER = themeMode === "light" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)";
  const SB_TEXT = themeMode === "light" ? "rgba(255,255,255,0.82)" : "#8899AA";
  const SB_TEXT_ACTIVE = themeMode === "light" ? PANEL_LIGHT : GO;
  const SB_STRIPE = themeMode === "light" ? LIGHT.goldText : GO;

  return (<ThemeCtx.Provider value={t}><div style={{ ...zoomStyle, width: "100%", minHeight: vh(100, zoom), background: t.bg, fontFamily: FONT_BODY, color: t.text, display: "flex" }}>
    {/* ===== SIDEBAR ===== */}
    <div style={{ width: SB_W, height: vh(100, zoom), background: SB_BG, borderRight: "1px solid " + SB_BORDER, display: "flex", flexDirection: "column", flexShrink: 0, position: "fixed", top: 0, left: 0, zIndex: 50, transition: "width 0.2s ease", overflow: "hidden" }}>

      {/* Logo + collapse toggle */}
      <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid " + SB_BORDER, display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 56 }}>
        {!sidebarCollapsed && <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 8px", background: "rgba(255,255,255,0.92)", borderRadius: 6 }}><img src={LOGO_SM} alt={clientConfig.company.shortName} style={{ height: 26 }} /></div>}
        <button onClick={toggleSidebar} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} style={{ marginLeft: sidebarCollapsed ? "auto" : 0, marginRight: sidebarCollapsed ? "auto" : 0, background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: SB_TEXT, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ic d={sidebarCollapsed ? "M13 17l5-5-5-5M6 17l5-5-5-5" : "M11 17l-5-5 5-5M18 17l-5-5 5-5"} sz={16} c={SB_TEXT} />
        </button>
      </div>

      {/* Nav Groups */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}>
        {sidebarGroups.map((group, gi) => {
          const isGroupCollapsed = group.label && collapsedGroups.has(group.label);
          const firstItem = group.items[0];
          const GroupIcon = firstItem?.i;
          const isAnyItemActive = group.items.some(item => page === item.id);

          // COLLAPSED SIDEBAR: show one icon per group, individual icons for label-less items
          if (sidebarCollapsed) {
            if (group.label) {
              // One representative icon for the whole group
              return (
                <div key={gi} style={{ marginBottom: 2 }}>
                  <button
                    title={group.label}
                    onClick={() => { toggleSidebar(); setPage(firstItem.id); setCollapsedGroups(prev => { const next = new Set(prev); next.delete(group.label); return next; }); }}
                    style={{ position: "relative", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0", background: isAnyItemActive ? SB_ACTIVE : "transparent", color: isAnyItemActive ? SB_TEXT_ACTIVE : SB_TEXT, cursor: "pointer", border: "none", borderLeft: isAnyItemActive ? "3px solid " + SB_STRIPE : "3px solid transparent", transition: "all 0.15s ease" }}>
                    {GroupIcon && <GroupIcon sz={18} c={isAnyItemActive ? SB_TEXT_ACTIVE : SB_TEXT} />}
                    {group.items.some(item => item.id === "cases") && <CaseQueueBadge style={{ position: "absolute", top: 4, right: 10 }} />}
                    {group.items.some(item => item.id === "issues") && <OpenIssuesBadge style={{ position: "absolute", top: 4, right: 10 }} />}
                  </button>
                </div>
              );
            } else {
              // No label: show each item icon individually
              return (
                <div key={gi} style={{ marginBottom: 2 }}>
                  {group.items.map(item => {
                    const active = page === item.id;
                    const NavI = item.i;
                    return (
                      <button key={item.id} title={item.l} onClick={() => { toggleSidebar(); setPage(item.id); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0", background: active ? SB_ACTIVE : "transparent", color: active ? SB_TEXT_ACTIVE : SB_TEXT, cursor: "pointer", border: "none", borderLeft: active ? "3px solid " + SB_STRIPE : "3px solid transparent", transition: "all 0.15s ease" }}>
                        <NavI sz={18} c={active ? SB_TEXT_ACTIVE : SB_TEXT} />
                      </button>
                    );
                  })}
                </div>
              );
            }
          }

          // EXPANDED SIDEBAR: full labels + collapsible groups
          return (
            <div key={gi} style={{ marginBottom: 2 }}>
              {group.label && (
                <button onClick={() => toggleGroup(group.label)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 4px", background: "none", border: "none", cursor: "pointer", color: SB_TEXT }}>
                  <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>{group.label}</span>
                  <Ic d={isGroupCollapsed ? "M6 9l6 6 6-6" : "M18 15l-6-6-6 6"} sz={12} c={SB_TEXT} />
                </button>
              )}
              {!isGroupCollapsed && group.items.map(item => {
                const active = page === item.id;
                const NavI = item.i;
                return (
                  <button key={item.id} onClick={() => setPage(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: active ? SB_ACTIVE : "transparent", color: active ? SB_TEXT_ACTIVE : SB_TEXT, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", border: "none", borderLeft: active ? "3px solid " + SB_STRIPE : "3px solid transparent", textAlign: "left", transition: "all 0.15s ease", whiteSpace: "nowrap" }}>
                    <NavI sz={17} c={active ? SB_TEXT_ACTIVE : SB_TEXT} />
                    <span>{item.l}</span>
                    {item.id === "cases" && <CaseQueueBadge style={{ marginLeft: "auto" }} />}
                    {item.id === "issues" && <OpenIssuesBadge style={{ marginLeft: "auto" }} />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom: user + theme + logout */}
      <div style={{ borderTop: "1px solid " + SB_BORDER, padding: sidebarCollapsed ? "10px 0" : "10px 14px" }}>
        <button onClick={toggleTheme} title={sidebarCollapsed ? (themeMode === "dark" ? "Light Mode" : "Dark Mode") : undefined} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "flex-start", gap: 8, padding: sidebarCollapsed ? "7px 0" : "6px 0", background: "none", border: "none", cursor: "pointer", color: SB_TEXT, fontSize: 12 }}>
          {themeMode === "dark" ? <SunI sz={15} c={SB_TEXT} /> : <MoonI sz={15} c={SB_TEXT} />}
          {!sidebarCollapsed && (themeMode === "dark" ? "Light Mode" : "Dark Mode")}
        </button>
        {!sidebarCollapsed ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: themeMode === "light" ? "rgba(255,255,255,0.92)" : "rgba(231,176,23,0.12)", border: "1px solid " + (themeMode === "light" ? PANEL_LIGHT : GO), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: themeMode === "light" ? PANEL_LIGHT : GO, flexShrink: 0 }}>{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
              <div><div style={{ fontSize: 12, fontWeight: 600, color: "#F8F7F4" }}>{user?.firstName}</div><div style={{ fontSize: 9, color: SB_TEXT }}>{isAdmin ? "Admin" : "Supervisor"}</div></div>
            </div>
            <button onClick={signOut} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><LoI sz={15} c={SB_TEXT} /></button>
          </div>
        ) : (
          <button onClick={signOut} title="Logout" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "7px 0", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}><LoI sz={16} c={SB_TEXT} /></button>
        )}
      </div>
    </div>

    {/* ===== MAIN CONTENT ===== */}
    <div style={{ flex: 1, marginLeft: SB_W, minHeight: vh(100, zoom), display: "flex", flexDirection: "column", transition: "margin-left 0.2s ease", ...(zoom === 1 ? {} : { minWidth: 0 }) }}>
      {/* Top Bar */}
      <div style={{ background: t.card, borderBottom: "1px solid " + t.border, padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 40, gap: 16, boxShadow: t.shadow }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: ".2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pageLabels[page] || "Dashboard"}</div>
          <div style={{ fontSize: 11, color: t.textMut, marginTop: 2 }}>{isAdmin ? `${clientConfig.company.shortName} Admin` : `${clientConfig.company.shortName} Supervisor`}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", minWidth: 132 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: t.inputBg, border: "1px solid " + t.inputBorder, borderRadius: 20, padding: "7px 14px", width: 200, maxWidth: "100%" }}>
              <Ic d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35" sz={14} c={t.textMut} />
              <input value={navQ} onChange={e => { setNavQ(e.target.value); setNavOpen(true); setUserMenuOpen(false); }} onFocus={() => { setNavOpen(true); setUserMenuOpen(false); }} placeholder="Search pages" style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: t.text, fontSize: 13, fontFamily: FONT_BODY }} />
            </div>
            {navOpen && navQ.trim() && (() => { const matches = allNavItems.filter(it => it.l.toLowerCase().includes(navQ.trim().toLowerCase())); return (
              <div style={{ position: "absolute", top: 44, right: 0, width: 240, maxWidth: "calc(100vw / var(--zoom, 1) - 32px)", background: t.card, border: "1px solid " + t.border, borderRadius: 12, boxShadow: t.popShadow, padding: 6, zIndex: 41, maxHeight: 320, overflowY: "auto" }}>
                {matches.slice(0, 8).map(it => { const NI = it.i; return (
                  <button key={it.id} onClick={() => { setPage(it.id); setNavQ(""); setNavOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", background: "none", border: "none", borderRadius: 8, cursor: "pointer", color: t.text, fontSize: 13, textAlign: "left" }} onMouseEnter={e => { e.currentTarget.style.background = t.hover; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; }}><NI sz={16} c={t.goldText} /><span>{it.l}</span></button>
                ); })}
                {matches.length === 0 && <div style={{ padding: "10px", fontSize: 12, color: t.textMut }}>No matching pages</div>}
              </div>
            ); })()}
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setBellOpen(o => !o)} aria-label={unread > 0 ? unread + " unread notifications" : "Notifications"} title="Notifications" style={{ position: "relative", width: 38, height: 38, borderRadius: 10, background: t.inputBg, border: "1px solid " + t.inputBorder, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Ic d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" sz={17} c={t.textSec} />
              {unread > 0 && <span style={{ position: "absolute", top: 6, right: 7, minWidth: 16, height: 16, padding: "0 3px", borderRadius: 8, background: RD, color: "#fff", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + t.card }}>{unread > 9 ? "9+" : unread}</span>}
            </button>
            {bellOpen && <NotificationPanel af={af} t={t} unread={unread} onClose={() => { setBellOpen(false); loadUnread(); }} onUnread={setUnread} canOpenPage={canOpenPage} onRefused={() => showToast("That one is for admins. Ask an admin to take a look.", "error")} onOpenPage={id => setPage(id)} onOpenHash={h => { window.location.hash = h; }} />}
          </div>
          <button onClick={toggleTheme} title={themeMode === "dark" ? "Light mode" : "Dark mode"} style={{ width: 38, height: 38, borderRadius: 10, background: t.inputBg, border: "1px solid " + t.inputBorder, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{themeMode === "dark" ? <SunI sz={16} c={t.textSec} /> : <MoonI sz={16} c={t.textSec} />}</button>
          <div style={{ position: "relative" }}>
            <button onClick={() => { setUserMenuOpen(o => !o); setNavOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px 4px 4px", borderRadius: 22, background: t.inputBg, border: "1px solid " + t.inputBorder, cursor: "pointer" }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(231,176,23,0.14)", border: "1.5px solid " + GO, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: t.goldText, fontFamily: FONT_HEAD }}>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{user?.firstName}</span>
              <Ic d="M6 9l6 6 6-6" sz={14} c={t.textMut} />
            </button>
            {userMenuOpen && (
              <div style={{ position: "absolute", top: 48, right: 0, width: 210, maxWidth: "calc(100vw / var(--zoom, 1) - 32px)", background: t.card, border: "1px solid " + t.border, borderRadius: 12, boxShadow: t.popShadow, padding: 6, zIndex: 41 }}>
                <div style={{ padding: "8px 10px", borderBottom: "1px solid " + t.border, marginBottom: 4 }}><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{user?.firstName} {user?.lastName}</div><div style={{ fontSize: 11, color: t.textMut }}>{isAdmin ? "Administrator" : "Supervisor"}</div></div>
                {canOpenPage("settings") && <button onClick={() => { setPage("settings"); setUserMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", background: "none", border: "none", borderRadius: 8, cursor: "pointer", color: t.text, fontSize: 13, textAlign: "left" }} onMouseEnter={e => { e.currentTarget.style.background = t.hover; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; }}><StgI sz={16} c={t.textSec} /> Settings</button>}
                <div style={{ borderTop: "1px solid " + t.border, marginTop: 4, paddingTop: 4 }}>{textSizeChoice(true)}</div>
                <button onClick={signOut} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", background: "none", border: "none", borderRadius: 8, cursor: "pointer", color: RD, fontSize: 13, textAlign: "left" }} onMouseEnter={e => { e.currentTarget.style.background = t.redSubtle; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; }}><LoI sz={16} c={RD} /> Sign Out</button>
              </div>
            )}
          </div>
          <span style={{ fontSize: 9, color: GR, background: "rgba(46,204,113,0.12)", padding: "4px 10px", borderRadius: 10, fontWeight: 600, letterSpacing: ".5px" }}>LIVE</span>
        </div>
      </div>
      {(navOpen || userMenuOpen) && <div onClick={() => { setNavOpen(false); setUserMenuOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 38 }} />}
      {/* Page Content */}
      <div style={{ flex: 1, padding: "16px 24px 30px", display: "flex", flexDirection: "column" }}>
        {page === "overview" && <OverviewPage af={af} showToast={showToast} setPage={setPage} user={user} isAdmin={isAdmin} t={t} />}
        {page === "staff" && (canOpenPage("staff") ? <StaffPage af={af} token={token} showToast={showToast} t={t} sites={sites} allStaff={allStaff} loadStaff={loadStaff} getOpts={getOpts} lkMap={lkMap} uf={uf} /> : <AdminOnlyNotice t={t} onBack={() => setPage("overview")} />)}
        {page === "cases" && (canOpenPage("cases") ? <CasesPage af={af} showToast={showToast} t={t} allStaff={allStaff} user={user} onSaved={loadCaseQueue} /> : <AdminOnlyNotice t={t} onBack={() => setPage("overview")} />)}
        {page === "hr" && <HRRecordsPage af={af} token={token} showToast={showToast} t={t} allStaff={allStaff} uf={uf} getOpts={getOpts} lkMap={lkMap} />}
        {page === "sites" && <SitesPage af={af} showToast={showToast} isAdmin={isAdmin} t={t} sites={sites} allStaff={allStaff} loadSites={loadSites} uf={uf} getOpts={getOpts} lkMap={lkMap} lkColorMap={lkColorMap} />}
        {page === "assigned" && <AssignedTasksAdminPage af={af} showToast={showToast} isAdmin={isAdmin} t={t} sites={sites} allStaff={allStaff} uf={uf} getOpts={getOpts} />}
        {page === "operations" && <OpsPage af={af} t={t} allStaff={allStaff} />}
        {page === "issues" && <IssuesPage af={af} showToast={showToast} t={t} allStaff={allStaff} />}
        {page === "supplies" && <SuppliesAdminPage af={af} showToast={showToast} isAdmin={isAdmin} t={t} getOpts={getOpts} lkHasOther={lkHasOther} />}
        {page === "vendors" && <VendorsPage af={af} showToast={showToast} isAdmin={isAdmin} t={t} />}
        {page === "inspections" && <InspectionsPage af={af} showToast={showToast} isAdmin={isAdmin} t={t} sites={sites} allStaff={allStaff} getOpts={getOpts} lkMap={lkMap} lkColorMap={lkColorMap} />}
        {page === "services" && <ServicesPage af={af} showToast={showToast} isAdmin={isAdmin} t={t} sites={sites} />}
        {page === "schedule" && <SchedulePage af={af} showToast={showToast} isAdmin={isAdmin} t={t} sites={sites} allStaff={allStaff} user={user} getOpts={getOpts} lkMap={lkMap} lkColorMap={lkColorMap} />}
        {page === "marketplace" && <ShiftMarketplacePage af={af} showToast={showToast} isAdmin={isAdmin} t={t} sites={sites} allStaff={allStaff} getOpts={getOpts} lkMap={lkMap} lkColorMap={lkColorMap} />}
        {page === "chat" && <ChatPage af={af} user={user} t={t} />}
        {page === "help" && <HelpPage af={af} uf={uf} showToast={showToast} t={t} />}
        {page === "reports" && <ReportsPage af={af} showToast={showToast} isAdmin={isAdmin} t={t} sites={sites} />}
        {page === "forms" && (canOpenPage("forms") ? <FormsPage af={af} token={token} showToast={showToast} t={t} allStaff={allStaff} sites={sites} user={user} route={route} onRoute={replaceRoute} /> : <AdminOnlyNotice t={t} onBack={() => setPage("overview")} />)}
        {page === "settings" && (canOpenPage("settings") ? <SettingsPage af={af} showToast={showToast} t={t} sites={sites} uf={uf} allStaff={allStaff} isAdmin={isAdmin} /> : <AdminOnlyNotice t={t} onBack={() => setPage("overview")} />)}
      </div>
    </div>

    {toast && <Tst t={toast} />}
    <style>{`*{box-sizing:border-box}input::placeholder,textarea::placeholder{color:${t.textMut}}select{color-scheme:${themeMode}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:2px}:focus-visible{outline:2px solid ${themeMode === "light" ? PANEL_LIGHT : GO};outline-offset:2px}${pageNarrow ? NARROW_GRID_CSS : ""}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
  </div></ThemeCtx.Provider>);
}

function LoginForm({ onLogin, loading, t }) {
  const [ph, setPh] = useState(""); const [pn, setPn] = useState("");
  return (<><div style={{ marginBottom: 16 }}><Lbl>Phone or Email</Lbl><Inp t={t} value={ph} onChange={e => setPh(e.target.value)} placeholder="2150000000 or name@email.com" onKeyDown={e => e.key === "Enter" && onLogin(ph, pn)} /></div>
    <div style={{ marginBottom: 24 }}><Lbl>PIN</Lbl><Inp t={t} value={pn} onChange={e => setPn(e.target.value)} type="password" maxLength={4} style={{ letterSpacing: "8px", textAlign: "center", fontSize: 20 }} onKeyDown={e => e.key === "Enter" && onLogin(ph, pn)} /></div>
    <button onClick={() => onLogin(ph, pn)} disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "linear-gradient(135deg," + GO + "," + GL + ")", color: NAVY, fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1, boxShadow: "0 10px 24px -10px " + GO, fontFamily: FONT_BODY }}>{loading ? "Signing in..." : "Sign In"}</button>
  </>);}

const FilterTabs = ({ tabs, value, onChange, t }) => <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap", borderBottom: "1px solid " + t.border, paddingBottom: 12 }}>{tabs.map(tb => { const on = value === tb.id; const cc = tb.color || t.goldText; return <button key={tb.id} onClick={() => onChange(tb.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: R.sm, background: on ? t.goldBg : "transparent", color: on ? t.goldText : t.textSec, fontSize: 13, fontFamily: FONT_HEAD, fontWeight: on ? 700 : 600, cursor: "pointer", border: on ? "1px solid " + t.goldBorder : "1px solid transparent" }}>{tb.label}{tb.count != null && <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: on ? "rgba(231,176,23,0.18)" : t.cardAlt, color: on ? (t.dark ? t.goldText : t.text) : cc }}>{tb.count}</span>}</button>; })}</div>;

const DataTable = ({ columns, rows, rowKey, onRowClick, empty = "No records found.", footer, t }) => <Crd t={t} style={{ padding: 0, overflow: "hidden" }}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr style={{ background: t.cardAlt }}>{columns.map((c, i) => <th key={i} style={{ padding: "12px 16px", fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: t.textMut, whiteSpace: "nowrap", textAlign: c.align || "left" }}>{c.header}</th>)}</tr></thead><tbody>{rows.length === 0 && <tr><td colSpan={columns.length} style={{ padding: 34, textAlign: "center", color: t.textMut }}>{empty}</td></tr>}{rows.map((row, ri) => <tr key={rowKey ? rowKey(row) : ri} onClick={onRowClick ? () => onRowClick(row) : undefined} style={{ borderTop: "1px solid " + t.border, cursor: onRowClick ? "pointer" : "default", transition: "background 0.12s" }} onMouseEnter={onRowClick ? e => e.currentTarget.style.background = t.hover : undefined} onMouseLeave={onRowClick ? e => e.currentTarget.style.background = "transparent" : undefined}>{columns.map((c, ci) => <td key={ci} style={{ padding: "12px 16px", textAlign: c.align || "left", ...(c.tdStyle || {}) }}>{c.render(row)}</td>)}</tr>)}</tbody></table></div>{footer}</Crd>;

const Pagination = ({ page, perPage, total, onPage, t }) => { const totalPages = Math.max(1, Math.ceil(total / perPage)); const cur = Math.min(page, totalPages); const from = total === 0 ? 0 : (cur - 1) * perPage + 1; const to = Math.min(total, cur * perPage); return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid " + t.border, flexWrap: "wrap", gap: 10 }}><span style={{ fontSize: 12, color: t.textMut }}>Showing {from} to {to} of {total}</span><div style={{ display: "flex", gap: 6, alignItems: "center" }}><button onClick={() => onPage(Math.max(1, cur - 1))} disabled={cur <= 1} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid " + t.border, background: t.card, color: cur <= 1 ? t.textMut : t.text, cursor: cur <= 1 ? "default" : "pointer", fontSize: 12, opacity: cur <= 1 ? 0.5 : 1 }}>Prev</button><span style={{ fontSize: 12, color: t.textSec, fontFamily: FONT_HEAD, fontWeight: 600 }}>Page {cur} / {totalPages}</span><button onClick={() => onPage(Math.min(totalPages, cur + 1))} disabled={cur >= totalPages} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid " + t.border, background: t.card, color: cur >= totalPages ? t.textMut : t.text, cursor: cur >= totalPages ? "default" : "pointer", fontSize: 12, opacity: cur >= totalPages ? 0.5 : 1 }}>Next</button></div></div>; };

const ProfileBanner = ({ t, avatar, name, idCode, subtitle, badges, actions }) => <Crd t={t} style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}><div style={{ height: 92, background: "linear-gradient(120deg, " + GO + " 0%, " + GL + " 55%, " + GO + " 100%)" }} /><div style={{ padding: "0 20px 18px", display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}><div style={{ marginTop: -42, flexShrink: 0, borderRadius: "50%", border: "3px solid " + t.card, background: t.card, lineHeight: 0 }}>{avatar}</div><div style={{ flex: 1, minWidth: 200, paddingTop: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 600, color: t.text }}>{name}</span>{idCode && <span style={{ fontSize: 11, fontFamily: "monospace", color: t.goldText, padding: "2px 8px", borderRadius: 6, background: t.goldBg, border: "1px solid " + t.goldBorder }}>{idCode}</span>}</div>{subtitle && <div style={{ fontSize: 12, color: t.textSec, marginTop: 4 }}>{subtitle}</div>}{badges && <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>{badges}</div>}</div>{actions && <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 12 }}>{actions}</div>}</div></Crd>;

const TimelineRow = ({ t, node, last, onClick, children }) => <div style={{ display: "flex", gap: 12 }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>{node}{!last && <div style={{ flex: 1, width: 2, background: t.border, marginTop: 4, minHeight: 12, borderRadius: 1 }} />}</div><div onClick={onClick} onMouseEnter={onClick ? (e => e.currentTarget.style.background = t.hover) : undefined} onMouseLeave={onClick ? (e => e.currentTarget.style.background = "transparent") : undefined} style={{ flex: 1, minWidth: 0, paddingTop: 2, paddingBottom: 14, paddingLeft: onClick ? 8 : 0, paddingRight: onClick ? 8 : 0, marginLeft: onClick ? -8 : 0, borderRadius: 8, cursor: onClick ? "pointer" : "default", transition: "background 0.12s" }}>{children}</div></div>;

// Shift session helpers. GET /api/shift-sessions/by-site returns { date, sites: [{ siteId, siteName, people: [...] }] }.
// A session records who started a shift where. There is no end time, so these never claim who is on site right now.
const flattenSessions = (d) => ((d && d.sites) || []).flatMap(site => (site.people || []).map(p => ({ ...p, siteName: site.siteName })));
const fmtSessionStart = (ts) => ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
const sessionPlace = (p) => [p.siteName, p.buildingName, p.floorNumber ? "Floor " + p.floorNumber : null].filter(Boolean).join(", ");

function OverviewPage({ af, showToast, setPage, user, isAdmin, t }) {
  const [stats, setStats] = useState(null); const [started, setStarted] = useState([]);
  const [inspSummary, setInspSummary] = useState([]);
  const loadDash = () => {
    af("/api/reports/overview").then(setStats).catch(e => console.warn(e.message));
    af("/api/shift-sessions/by-site").then(d => setStarted(flattenSessions(d))).catch(e => console.warn(e.message));
    af("/api/inspections/analytics/dashboard-summary").then(setInspSummary).catch(e => console.warn(e.message));
  };
  useEffect(() => { loadDash(); const iv = setInterval(loadDash, 45000); return () => clearInterval(iv); }, []);
  if (!stats) return <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Loading...</div>;
  return (<div>
    <div style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 600, marginBottom: 2, color: t.text }}>Welcome back, {user?.firstName || "Admin"}</div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><div style={{ fontSize: 13, color: t.textSec }}>Operations overview.</div><button onClick={loadDash} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: "1px solid " + t.border, background: "transparent", color: t.textMut, fontSize: 11, cursor: "pointer" }}><Ic d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" sz={12} c={t.textMut} /> Refresh</button></div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
      <SC t={t} label="Started today" value={stats.clockedInNow} sub={"of " + stats.activeStaff + " active"} color={GR} icon={CkI} />
      <SC t={t} label="Open Issues" value={stats.openIssues} color={stats.openIssues > 0 ? RD : GR} icon={AlI} />
      {isAdmin && <SC t={t} label="Pending" value={stats.pendingStaff} color={stats.pendingStaff > 0 ? OR : GR} icon={UsI} />}
    </div>
    <SecT t={t}>Started today</SecT>
    <Crd t={t} style={{ marginBottom: 20 }}>
      {started.length === 0 && <div style={{ fontSize: 13, color: t.textMut }}>No shifts started yet today.</div>}
      {started.map(s => { const pct = s.tasksTotal > 0 ? Math.round(s.tasksCompleted / s.tasksTotal * 100) : 0; return (
        <div key={s.sessionId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid " + t.border }}>
          <Ini name={s.name} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{s.name}</div><div style={{ fontSize: 11, color: t.textSec }}>{sessionPlace(s)}</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, fontWeight: 600, color: GR }}>Started {fmtSessionStart(s.startedAt)}</div><div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 3 }}><div style={{ width: 60, height: 4, borderRadius: 2, background: t.cardAlt, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, background: pct === 100 ? GR : GO, width: pct + "%" }} /></div><span style={{ fontSize: 10, color: t.textMut }}>{s.tasksCompleted} of {s.tasksTotal}</span></div></div>
        </div>); })}
    </Crd>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
      <div style={{ flex: "2 1 340px", minWidth: 0 }}>
        <ChartCard t={t} title="Inspection scores by site" sub="Most recent inspection per site" action="View all" onAction={() => setPage("inspections")}>
          {inspSummary.length > 0
            ? <BarChartW t={t} name="Score" categories={inspSummary.map(is => is.site_name)} values={inspSummary.map(is => Math.round(Number(is.score_pct)))} colors={inspSummary.map(is => { const s = Number(is.score_pct); return s >= 80 ? GR : s >= 60 ? OR : RD; })} valueSuffix="%" height={270} />
            : <div style={{ padding: 36, textAlign: "center", color: t.textMut, fontSize: 13 }}>No inspections recorded yet.</div>}
        </ChartCard>
      </div>
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        <ChartCard t={t} title="Started today" sub="Since midnight">
          <RadialW t={t} value={stats.activeStaff > 0 ? (stats.clockedInNow / stats.activeStaff) * 100 : 0} valueText={stats.clockedInNow + " / " + stats.activeStaff} label="Started" color={GR} height={270} />
        </ChartCard>
      </div>
    </div>    {((isAdmin && stats.pendingStaff > 0) || stats.openIssues > 0) && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {isAdmin && stats.pendingStaff > 0 && <button onClick={() => setPage("staff")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: t.orangeSubtle, border: "1px solid " + t.orangeBorder, color: OR, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><UsI sz={16} c={OR} />{stats.pendingStaff} pending</button>}
      {stats.openIssues > 0 && <button onClick={() => setPage("issues")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: t.redSubtle, border: "1px solid " + t.redBorder, color: RD, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><AlI sz={16} c={RD} />{stats.openIssues} open issues</button>}
    </div>}
  </div>);
}

function StaffPage({ af, token, showToast, t, sites, allStaff, loadStaff, getOpts, lkMap, uf }) {
  const [staff, setStaff] = useState([]); const [filter, setFilter] = useState("all"); const [addForm, setAddForm] = useState(null);
  const [q, setQ] = useState(""); const [roleF, setRoleF] = useState("all"); const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(10);
  const [assignForm, setAssignForm] = useState(null);
  const [editForm, setEditForm] = useState(null); const [resetPin, setResetPin] = useState(null); const [newPin, setNewPin] = useState(""); const [addCert, setAddCert] = useState(null);
  // Session 28: inline validation error for the Employee ID field (shared by Add Staff modal and Profile edit form)
  const [empIdError, setEmpIdError] = useState("");
  // Profile view state
  const [profile, setProfile] = useState(null); const [profileTab, setProfileTab] = useState("info");
  const [profileEdit, setProfileEdit] = useState(null); const [photoUploading, setPhotoUploading] = useState(false);
  const [hrDocs, setHrDocs] = useState([]); const [hrTraining, setHrTraining] = useState([]);
  const [hrOnboarding, setHrOnboarding] = useState([]); const [hrLoading, setHrLoading] = useState(false);
  // Timeline state (Session 18)
  const [timeline, setTimeline] = useState([]); const [tlTotal, setTlTotal] = useState(0);
  const [tlCategory, setTlCategory] = useState("all"); const [tlLoading, setTlLoading] = useState(false);
  const [tlStartDate, setTlStartDate] = useState(""); const [tlEndDate, setTlEndDate] = useState("");
  const [tlDetail, setTlDetail] = useState(null); const [tlDetailLoading, setTlDetailLoading] = useState(false);

  const load = () => { af("/api/users").then(setStaff).catch(e => showToast(e.message, "error")); };
  useEffect(() => { load(); }, []);
  const roleLabels = lkMap("staff_roles");
  const filtered = filter === "all" ? staff : staff.filter(s => filter === "inactive" ? (s.status === "inactive" || s.status === "terminated") : s.status === filter);
  const approve = async id => { try { await af("/api/users/" + id + "/approve", { method: "POST" }); showToast("Approved"); load(); loadStaff(); } catch (e) { showToast(e.message, "error"); } };
  const submitAdd = async () => { if (!addForm.firstName || !addForm.phone || !addForm.email) { showToast("Name, phone, and email required", "error"); return; } setEmpIdError(""); try { const d = await af("/api/users", { method: "POST", body: addForm }); showToast("Added. Temp PIN: " + d.tempPin); setAddForm(null); load(); loadStaff(); } catch (e) { if (/employee id/i.test(e.message || "")) { setEmpIdError(e.message); } else { showToast(e.message, "error"); } } };

  // Open full profile
  const openProfile = async (id) => {
    try {
      const d = await af("/api/users/profile/" + id);
      setProfile(d); setProfileTab("info"); setProfileEdit(null); setTimeline([]); setTlTotal(0); setTlCategory("all"); setTlStartDate(""); setTlEndDate(""); setTlDetail(null);
    } catch (e) { showToast(e.message, "error"); }
  };
  const closeProfile = () => { setProfile(null); setProfileEdit(null); };

  // Load HR data for the HR Files tab
  const loadHrData = async (userId) => {
    setHrLoading(true);
    try {
      const [docs, train] = await Promise.all([
        af("/api/hr/documents?user_id=" + userId),
        af("/api/hr/training?user_id=" + userId)
      ]);
      setHrDocs(docs); setHrTraining(train);
      try { const ob = await af("/api/hr/onboarding/" + userId); setHrOnboarding(ob); } catch (e) { setHrOnboarding([]); }
    } catch (e) { showToast(e.message, "error"); }
    setHrLoading(false);
  };
  useEffect(() => { if (profile && profileTab === "hr") loadHrData(profile.user.id); }, [profileTab, profile?.user?.id]);

  // Session 25 Phase 3: open a private-bucket document via the authenticated streaming endpoint.
  // Same pattern used in HRRecordsPage.
  const viewDoc = async (docId) => {
    try {
      const apiBase = (typeof window !== "undefined" && window.OCSA_API_BASE) || "https://ocsa-api-production.up.railway.app";
      const resp = await fetch(apiBase + "/api/jotform/employee-documents/" + docId + "/file?action=view", {
        headers: { Authorization: "Bearer " + (token || "") }
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error("File fetch failed (" + resp.status + "): " + errText.slice(0, 200));
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { showToast(e.message, "error"); }
  };

  // Timeline loader (Session 18)
  const loadTimeline = async (userId, cat, sd, ed) => {
    setTlLoading(true);
    try {
      let url = "/api/users/timeline/" + userId + "?limit=200";
      if (cat && cat !== "all") url += "&category=" + cat;
      if (sd) url += "&startDate=" + sd;
      if (ed) url += "&endDate=" + ed;
      const d = await af(url);
      setTimeline(d.entries || []); setTlTotal(d.total || 0);
    } catch (e) { showToast(e.message, "error"); setTimeline([]); }
    setTlLoading(false);
  };
  useEffect(() => { if (profile && profileTab === "timeline") loadTimeline(profile.user.id, tlCategory, tlStartDate, tlEndDate); }, [profileTab, profile?.user?.id, tlCategory, tlStartDate, tlEndDate]);

  // CSV export for timeline (Session 18)
  const exportTimelineCsv = () => {
    if (timeline.length === 0) { showToast("No data to export", "error"); return; }
    const u = profile.user;
    const rows = [["Date", "Time", "Action", "Description", "Performed By"]];
    timeline.forEach(e => {
      const dt = new Date(e.createdAt);
      rows.push([dt.toLocaleDateString(), dt.toLocaleTimeString(), e.actionType.replace(/_/g, " "), (e.description || "").replace(/,/g, ";"), e.actorName || "System"]);
    });
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = (u.firstName + "_" + u.lastName + "_Timeline_" + new Date().toISOString().split("T")[0] + ".csv").replace(/ /g, "_");
    a.click(); URL.revokeObjectURL(a.href);
    showToast("CSV exported");
  };

  // Fetch timeline entry detail (Session 18)
  const openTimelineDetail = async (entry) => {
    setTlDetailLoading(true);
    try {
      const d = await af("/api/users/timeline-detail/" + entry.entityType + "/" + entry.entityId);
      setTlDetail({ ...d, entry });
    } catch (e) {
      // If detail fetch fails, still show what we have from the activity log
      setTlDetail({ found: false, entry, record: null, photos: [], relatedItems: [] });
    }
    setTlDetailLoading(false);
  };

  // Print detail record (Session 18)
  const printTimelineDetail = () => {
    if (!tlDetail) return;
    const u = profile.user;
    const e = tlDetail.entry;
    const r = tlDetail.record;
    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Record Detail</title><style>';
    html += 'body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:0;padding:0;color:#1a1a1a;font-size:12px}';
    html += '.header{background:' + NAVY + ';color:#F8F7F4;padding:20px 32px;display:flex;align-items:center;justify-content:space-between}';
    html += '.header h1{margin:0;font-size:16px;color:' + GOLD + '}.header .sub{font-size:10px;color:#8899AA;margin-top:4px}';
    html += '.content{padding:24px 32px}.section{margin-bottom:16px}.section-title{font-size:11px;color:' + GOLD + ';text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px;border-bottom:1px solid #e0e0e0;padding-bottom:4px}';
    html += '.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.field{margin-bottom:6px}.field .label{font-size:9px;color:#888;text-transform:uppercase}.field .value{font-size:12px;font-weight:500;margin-top:2px}';
    html += 'table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;background:#f5f5f5;padding:6px 8px;font-size:9px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd}td{padding:5px 8px;border-bottom:1px solid #eee}';
    html += '.photo{max-width:300px;max-height:200px;border-radius:6px;margin:4px}.footer{text-align:center;font-size:9px;color:#999;margin-top:20px;padding-top:10px;border-top:1px solid #e0e0e0}';
    html += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>';
    html += printHeader('Record Detail: ' + e.actionType.replace(/_/g, " "), u.firstName + ' ' + u.lastName + ' | ' + new Date(e.createdAt).toLocaleString(), u.profilePhotoUrl || null);
    html += '<div class="content">';
    html += '<div class="section"><div class="section-title">Activity Description</div><div style="font-size:13px;margin-bottom:8px">' + (e.description || "N/A") + '</div></div>';
    if (r) {
      html += '<div class="section"><div class="section-title">Record Details</div><div class="grid">';
      Object.entries(r).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "" && k !== "id" && !k.endsWith("_hash")) {
          const label = k.replace(/_/g, " ");
          let val = String(v);
          if (typeof v === "object" && !Array.isArray(v)) val = JSON.stringify(v);
          const isImgUrl = typeof v === "string" && (v.includes("supabase") || v.includes("storage")) && (v.includes(".jpg") || v.includes(".jpeg") || v.includes(".png") || v.includes(".webp") || v.includes("profile-photos") || v.includes("issue-photos") || v.includes("task-media"));
          if (isImgUrl) {
            html += '<div class="field" style="grid-column:span 2"><div class="label">' + label + '</div><img src="' + v + '" style="max-width:300px;max-height:200px;border-radius:6px;margin-top:4px" /></div>';
          } else {
            if (val.length > 200) val = val.substring(0, 200) + "...";
            html += '<div class="field"><div class="label">' + label + '</div><div class="value">' + val + '</div></div>';
          }
        }
      });
      html += '</div></div>';
    }
    if (tlDetail.photos && tlDetail.photos.length > 0) {
      html += '<div class="section"><div class="section-title">Photos (' + tlDetail.photos.length + ')</div>';
      tlDetail.photos.forEach(p => { html += '<div style="display:inline-block;margin:4px"><img class="photo" src="' + (p.photo_url || p.file_url || "") + '" /><div style="font-size:9px;color:#888;margin-top:2px">' + (p.caption || p.notes || new Date(p.created_at || "").toLocaleString() || "") + '</div></div>'; });
      html += '</div>';
    }
    if (tlDetail.relatedItems && tlDetail.relatedItems.length > 0) {
      html += '<div class="section"><div class="section-title">Related Items (' + tlDetail.relatedItems.length + ')</div><table><tr>';
      const first = tlDetail.relatedItems[0];
      const cols = Object.keys(first).filter(k => k !== "id" && k !== "items" && !k.endsWith("_id"));
      cols.slice(0, 6).forEach(c => { html += '<th>' + c.replace(/_/g, " ") + '</th>'; });
      html += '</tr>';
      tlDetail.relatedItems.forEach(item => { html += '<tr>'; cols.slice(0, 6).forEach(c => { const v = item[c]; html += '<td>' + (v !== null && v !== undefined ? String(v).substring(0, 100) : "") + '</td>'; }); html += '</tr>'; });
      html += '</table></div>';
    }
    html += '<div class="footer">' + clientConfig.company.footerLine + '</div></div></body></html>';
    const w = window.open("", "_blank"); w.document.write(html); w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  // Print filtered timeline (Session 18)
  const printTimeline = () => {
    if (timeline.length === 0) { showToast("No data to print", "error"); return; }
    const u = profile.user;
    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + u.firstName + ' ' + u.lastName + ' - Activity Timeline</title><style>';
    html += 'body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:0;padding:0;color:#1a1a1a;font-size:11px}';
    html += '.header{background:' + NAVY + ';color:#F8F7F4;padding:20px 32px;display:flex;align-items:center;justify-content:space-between}';
    html += '.header h1{margin:0;font-size:16px;color:' + GOLD + '}.header .sub{font-size:10px;color:#8899AA;margin-top:4px}';
    html += '.content{padding:20px 32px}table{width:100%;border-collapse:collapse}th{text-align:left;background:#f5f5f5;padding:5px 8px;font-size:9px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd}td{padding:4px 8px;border-bottom:1px solid #eee;font-size:11px}';
    html += '.footer{text-align:center;font-size:9px;color:#999;margin-top:16px;padding-top:8px;border-top:1px solid #e0e0e0}';
    html += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>';
    html += printHeader(u.firstName + ' ' + u.lastName + ' - Activity Timeline', timeline.length + ' of ' + tlTotal + ' entries' + (tlCategory !== "all" ? " | Filter: " + tlCategory : "") + (tlStartDate ? " | From: " + tlStartDate : "") + (tlEndDate ? " | To: " + tlEndDate : "") + ' | Generated ' + new Date().toLocaleDateString(), u.profilePhotoUrl || null);
    html += '<div class="content"><table><tr><th>Date</th><th>Time</th><th>Category</th><th>Action</th><th>Description</th><th>By</th></tr>';
    timeline.forEach(e => { const dt = new Date(e.createdAt); html += '<tr><td style="white-space:nowrap">' + dt.toLocaleDateString() + '</td><td>' + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + '</td><td>' + e.entityType.replace(/_/g, " ") + '</td><td>' + e.actionType.replace(/_/g, " ") + '</td><td>' + (e.description || "") + '</td><td>' + (e.actorName || "System") + '</td></tr>'; });
    html += '</table><div class="footer">' + clientConfig.company.name + ' | ' + clientConfig.company.location + ' | Confidential Employee Record</div></div></body></html>';
    const w = window.open("", "_blank"); w.document.write(html); w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  // Print report for employee profile (Session 18)
  const printProfileReport = () => {
    const u = profile.user;
    const fullName = u.firstName + " " + u.lastName;
    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + fullName + ' - Employee Report</title><style>';
    html += 'body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:0;padding:0;color:#1a1a1a;font-size:12px}';
    html += '.header{background:' + NAVY + ';color:#F8F7F4;padding:24px 32px;display:flex;align-items:center;justify-content:space-between}';
    html += '.header h1{margin:0;font-size:18px;color:' + GOLD + '}.header .sub{font-size:10px;color:#8899AA;margin-top:4px}';
    html += '.content{padding:24px 32px}.section{margin-bottom:20px}.section-title{font-size:11px;color:' + GOLD + ';text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px;border-bottom:1px solid #e0e0e0;padding-bottom:4px}';
    html += '.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.field{margin-bottom:6px}.field .label{font-size:9px;color:#888;text-transform:uppercase}.field .value{font-size:12px;font-weight:500;margin-top:2px}';
    html += 'table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;background:#f5f5f5;padding:6px 8px;font-size:9px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd}td{padding:5px 8px;border-bottom:1px solid #eee}';
    html += '.footer{text-align:center;font-size:9px;color:#999;margin-top:20px;padding-top:10px;border-top:1px solid #e0e0e0}';
    html += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>';
    html += printHeader(fullName, 'Employee Report | Generated ' + new Date().toLocaleDateString(), u.profilePhotoUrl || null);
    html += '<div class="content">';
    // Profile info section
    html += '<div class="section"><div class="section-title">Employee Information</div><div class="grid">';
    html += '<div class="field"><div class="label">Role</div><div class="value">' + (u.role || "N/A") + '</div></div>';
    html += '<div class="field"><div class="label">Employment Type</div><div class="value">' + (u.employmentType ? (ET[u.employmentType] || u.employmentType) : "N/A") + '</div></div>';
    html += '<div class="field"><div class="label">Status</div><div class="value">' + (u.status || "N/A") + '</div></div>';
    html += '<div class="field"><div class="label">Hire Date</div><div class="value">' + (u.hireDate ? fmtDate(u.hireDate) : "N/A") + '</div></div>';
    html += '<div class="field"><div class="label">Phone</div><div class="value">' + (u.phone || "N/A") + '</div></div>';
    html += '<div class="field"><div class="label">Email</div><div class="value">' + (u.email || "N/A") + '</div></div>';
    html += '<div class="field"><div class="label">Hourly Rate</div><div class="value">' + (u.hourlyRate ? "$" + parseFloat(u.hourlyRate).toFixed(2) : "N/A") + '</div></div>';
    html += '</div></div>';
    // Assignments
    const activeAssign = (profile.assignments || []).filter(a => a.is_active);
    if (activeAssign.length > 0) {
      html += '<div class="section"><div class="section-title">Site Assignments (' + activeAssign.length + ')</div><table><tr><th>Site</th><th>Role</th><th>Shift</th><th>Hours</th></tr>';
      activeAssign.forEach(a => { html += '<tr><td>' + (a.site_name || "") + '</td><td>' + (a.role_at_site || "") + '</td><td>' + (a.shift_name || "") + '</td><td>' + (a.shift_start ? a.shift_start + " - " + a.shift_end : "") + '</td></tr>'; });
      html += '</table></div>';
    }
    // Certifications
    const certs = profile.certifications || [];
    if (certs.length > 0) {
      html += '<div class="section"><div class="section-title">Certifications (' + certs.length + ')</div><table><tr><th>Name</th><th>Type</th><th>Issuer</th><th>Expiry</th></tr>';
      certs.forEach(c => { html += '<tr><td>' + (c.cert_name || "") + '</td><td>' + (c.cert_type || "") + '</td><td>' + (c.issuing_body || "") + '</td><td>' + (c.expiry_date ? fmtDate(c.expiry_date) : "N/A") + '</td></tr>'; });
      html += '</table></div>';
    }
    // Timeline (if loaded)
    if (timeline.length > 0) {
      html += '<div class="section"><div class="section-title">Activity Timeline (' + timeline.length + ' of ' + tlTotal + ' entries' + (tlCategory !== "all" ? " | Filter: " + tlCategory : "") + ')</div><table><tr><th>Date</th><th>Action</th><th>Description</th><th>By</th></tr>';
      timeline.forEach(e => { const dt = new Date(e.createdAt); html += '<tr><td style="white-space:nowrap">' + dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + '</td><td>' + e.actionType.replace(/_/g, " ") + '</td><td>' + (e.description || "") + '</td><td>' + (e.actorName || "System") + '</td></tr>'; });
      html += '</table></div>';
    }
    html += '<div class="footer">' + clientConfig.company.name + ' | ' + clientConfig.company.location + ' | Confidential Employee Record</div>';
    html += '</div></body></html>';
    const w = window.open("", "_blank");
    w.document.write(html); w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  const updateStatus = async (id, s) => { try { await af("/api/users/" + id, { method: "PATCH", body: { status: s } }); showToast("Updated"); closeProfile(); load(); loadStaff(); } catch (e) { showToast(e.message, "error"); } };
  const assignSite = async () => { if (!assignForm.siteId) { showToast("Select a site", "error"); return; } try { await af("/api/users/" + assignForm.userId + "/assign-site", { method: "POST", body: { siteId: assignForm.siteId, roleAtSite: assignForm.role, shiftName: assignForm.shift, shiftStart: assignForm.start, shiftEnd: assignForm.end } }); showToast("Assigned"); setAssignForm(null); openProfile(assignForm.userId); loadStaff(); } catch (e) { showToast(e.message, "error"); } };
  const unassign = async (uid, sid) => { if (!window.confirm("Remove this site assignment?")) return; try { await af("/api/users/" + uid + "/unassign-site/" + sid, { method: "DELETE" }); showToast("Removed"); openProfile(uid); loadStaff(); } catch (e) { showToast(e.message, "error"); } };
  const submitResetPin = async (userId) => { if (!newPin || newPin.length !== 4) { showToast("PIN must be 4 digits", "error"); return; } try { const d = await af("/api/users/" + userId + "/reset-pin", { method: "POST", body: { newPin } }); showToast(d.message); setResetPin(null); setNewPin(""); } catch (e) { showToast(e.message, "error"); } };
  const submitEdit = async () => { try { await af("/api/users/" + editForm.id, { method: "PATCH", body: editForm }); showToast("Updated"); setEditForm(null); load(); loadStaff(); if (profile) openProfile(editForm.id); } catch (e) { showToast(e.message, "error"); } };

  // Photo upload
  const handlePhotoUpload = async (file, userId) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { showToast("Photo must be under 20MB", "error"); return; }
    setPhotoUploading(true);
    try {
      const compressed = await compressImage(file, 800, 0.85);
      const r = await uf(compressed, "profile-photos");
      await af("/api/users/profile/photo", { method: "POST", body: { userId: userId, photoUrl: r.url } });
      showToast("Photo updated");
      openProfile(userId); load(); loadStaff();
    } catch (e) { showToast(e.message, "error"); }
    setPhotoUploading(false);
  };

  // Save profile personal info
  const saveProfileInfo = async () => {
    if (!profileEdit) return;
    setEmpIdError("");
    try {
      await af("/api/users/" + profile.user.id, { method: "PATCH", body: profileEdit });
      showToast("Profile updated");
      setProfileEdit(null);
      openProfile(profile.user.id); load(); loadStaff();
    } catch (e) {
      if (/employee id/i.test(e.message || "")) { setEmpIdError(e.message); }
      else { showToast(e.message, "error"); }
    }
  };

  // Avatar component with photo support
  const Avatar = ({ user, sz = 36 }) => {
    const name = (user.firstName || user.first_name || "") + " " + (user.lastName || user.last_name || "");
    const url = user.profilePhotoUrl || user.profile_photo_url;
    if (url) return <img src={url} alt={name} style={{ width: sz, height: sz, borderRadius: "50%", objectFit: "cover", border: "1.5px solid " + GO, flexShrink: 0 }} />;
    return <Ini name={name} sz={sz} color={user.status === "pending" ? OR : GO} />;
  };

  const ptabs = [{ id: "info", l: "Profile" }, { id: "hr", l: "HR Files" }, { id: "assign", l: "Assignments" }, { id: "certs", l: "Certifications" }, { id: "timeline", l: "Timeline" }];
  // Shared branded print header builder (Session 18)
  const printHeader = (title, subtitle, photoUrl) => {
    let h = '<div class="header"><div style="display:flex;align-items:center;gap:16px">';
    if (photoUrl) h += '<img src="' + photoUrl + '" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid ' + GOLD + '" />';
    h += '<div><h1>' + title + '</h1><div class="sub">' + subtitle + '</div></div></div>';
    h += '<img src="' + OCSA_LOGO_URL + '" style="height:40px" /></div>';
    return h;
  };
  const fmtDate = d => { if (!d) return "Not set"; const dt = typeof d === "string" ? d.split("T")[0] : new Date(d).toISOString().split("T")[0]; const [y, m, dy] = dt.split("-"); const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return months[parseInt(m) - 1] + " " + parseInt(dy) + ", " + y; };

  // ============================================================
  // PROFILE VIEW
  // ============================================================
  if (profile) {
    const u = profile.user;
    const isEditing = !!profileEdit;
    const pe = profileEdit || {};
    return (<div>
      <button onClick={closeProfile} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "none", background: "transparent", color: t.goldText, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}><Ic d="M15 18l-6-6 6-6" sz={16} c={t.goldText} /> Back to Staff</button>

      {/* Profile Header */}
      <ProfileBanner t={t}
        avatar={<div style={{ position: "relative" }}>
            <Avatar user={u} sz={84} />
            <label style={{ position: "absolute", bottom: -2, right: -2, width: 28, height: 28, borderRadius: "50%", background: GO, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px solid " + t.card }}>
              <Ic d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" sz={14} c={NAVY} />
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f, u.id); }} />
            </label>
            {photoUploading && <div style={{ position: "absolute", top: 0, left: 0, width: 84, height: 84, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#F8F7F4" }}>...</div>}
          </div>}
        name={u.firstName + " " + u.lastName}
        idCode={u.employeeId}
        subtitle={(roleLabels[u.role] || RL[u.role] || u.role) + (u.employmentType ? " (" + (ET[u.employmentType] || u.employmentType) + ")" : "")}
        badges={<Bdg l={u.status} c={u.status === "active" ? GR : u.status === "pending" ? OR : RD} />}
        actions={<>
          <Btn t={t} v="ghost" style={{ fontSize: 11, padding: "6px 12px" }} onClick={printProfileReport}>Print Report</Btn>
          <Btn t={t} v="ghost" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => { setResetPin(u.id); setNewPin(""); }}>Reset PIN</Btn>
          {u.status === "active" && <Btn t={t} v="danger" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => updateStatus(u.id, "inactive")}>Deactivate</Btn>}
          {u.status === "inactive" && <Btn t={t} style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => updateStatus(u.id, "active")}>Reactivate</Btn>}
          {u.status === "pending" && <Btn t={t} style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => { approve(u.id); closeProfile(); }}>Approve</Btn>}
        </>}
      />

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid " + t.border, paddingBottom: 0 }}>
        {ptabs.map(tb => <button key={tb.id} onClick={() => setProfileTab(tb.id)} style={{ padding: "8px 16px", fontSize: 12, fontWeight: profileTab === tb.id ? 700 : 500, color: profileTab === tb.id ? t.goldText : t.textMut, background: "transparent", border: "none", borderBottom: profileTab === tb.id ? "2px solid " + GO : "2px solid transparent", cursor: "pointer", marginBottom: -1 }}>{tb.l}</button>)}
      </div>

      {/* INFO TAB */}
      {profileTab === "info" && <div>
        <Crd t={t} style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Contact Information</div>
            {!isEditing && <button onClick={() => { setEmpIdError(""); setProfileEdit({ firstName: u.firstName, lastName: u.lastName, phone: u.phone, email: u.email, role: u.role, employmentType: u.employmentType || null, employeeId: u.employeeId || "", hourlyRate: u.hourlyRate || "", birthday: u.birthday ? (typeof u.birthday === "string" ? u.birthday.split("T")[0] : "") : "", addressLine1: u.addressLine1 || "", addressLine2: u.addressLine2 || "", city: u.city || "", state: u.state || "", zipCode: u.zipCode || "", emergencyContactName: u.emergencyContactName || "", emergencyContactPhone: u.emergencyContactPhone || "", preferredLanguage: langCode(u.preferredLanguage), personalNotes: u.personalNotes || "" }); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}><EdI sz={10} c={t.goldText} /> Edit</button>}
          </div>
          {!isEditing ? <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ fontSize: 11, color: t.textMut }}>Employee ID<div style={{ color: t.text, fontWeight: 500, marginTop: 2, fontSize: 13, fontFamily: "monospace" }}>{u.employeeId || "Not set"}</div></div>
              <div style={{ fontSize: 11, color: t.textMut }}>Phone<div style={{ color: t.text, fontWeight: 500, marginTop: 2, fontSize: 13 }}>{u.phone || "Not set"}</div></div>
              <div style={{ fontSize: 11, color: t.textMut }}>Email<div style={{ color: t.text, fontWeight: 500, marginTop: 2, fontSize: 13 }}>{u.email || "Not set"}</div></div>
              <div style={{ fontSize: 11, color: t.textMut }}>Hire Date<div style={{ color: t.text, fontWeight: 500, marginTop: 2, fontSize: 13 }}>{u.hireDate ? fmtDate(u.hireDate) : "Not set"}</div></div>
              <div style={{ fontSize: 11, color: t.textMut }}>Birthday<div style={{ color: t.text, fontWeight: 500, marginTop: 2, fontSize: 13 }}>{u.birthday ? fmtDate(u.birthday) : "Not set"}</div></div>
              <div style={{ fontSize: 11, color: t.textMut }}>Hourly Rate<div style={{ color: t.text, fontWeight: 500, marginTop: 2, fontSize: 13 }}>{u.hourlyRate ? "$" + parseFloat(u.hourlyRate).toFixed(2) : "Not set"}</div></div>
              <div style={{ fontSize: 11, color: t.textMut }}>Preferred Language<div style={{ color: t.text, fontWeight: 500, marginTop: 2, fontSize: 13 }}>{langLabel(u.preferredLanguage)}</div></div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: t.textMut }}>Address</div>
              <div style={{ color: t.text, fontWeight: 500, marginTop: 2, fontSize: 13 }}>{u.addressLine1 ? (u.addressLine1 + (u.addressLine2 ? ", " + u.addressLine2 : "") + (u.city ? ", " + u.city : "") + (u.state ? ", " + u.state : "") + (u.zipCode ? " " + u.zipCode : "")) : "Not set"}</div>
            </div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ fontSize: 11, color: t.textMut }}>Emergency Contact<div style={{ color: t.text, fontWeight: 500, marginTop: 2, fontSize: 13 }}>{u.emergencyContactName || "Not set"}</div></div>
              <div style={{ fontSize: 11, color: t.textMut }}>Emergency Phone<div style={{ color: t.text, fontWeight: 500, marginTop: 2, fontSize: 13 }}>{u.emergencyContactPhone || "Not set"}</div></div>
            </div>
            {u.personalNotes && <div style={{ marginTop: 14 }}><div style={{ fontSize: 11, color: t.textMut }}>Notes</div><div style={{ color: t.textSec, marginTop: 2, fontSize: 12, lineHeight: 1.5, padding: "8px 10px", background: t.hover, borderRadius: 6 }}>{u.personalNotes}</div></div>}
          </div> : <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><Lbl>First Name</Lbl><Inp t={t} value={pe.firstName || ""} onChange={e => setProfileEdit({ ...pe, firstName: e.target.value })} /></div>
              <div><Lbl>Last Name</Lbl><Inp t={t} value={pe.lastName || ""} onChange={e => setProfileEdit({ ...pe, lastName: e.target.value })} /></div>
            </div>
            <div style={{ marginBottom: 10 }}><Lbl>Employee ID</Lbl><Inp t={t} value={pe.employeeId || ""} onChange={e => { setProfileEdit({ ...pe, employeeId: e.target.value }); setEmpIdError(""); }} placeholder={`${clientConfig.employee.idPrefix}-0042`} />{empIdError && <div style={{ fontSize: 11, color: RD, marginTop: 4 }}>{empIdError}</div>}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><Lbl>Phone</Lbl><Inp t={t} value={pe.phone || ""} onChange={e => setProfileEdit({ ...pe, phone: e.target.value })} /></div>
              <div><Lbl>Email</Lbl><Inp t={t} value={pe.email || ""} onChange={e => setProfileEdit({ ...pe, email: e.target.value })} type="email" /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><Lbl>Role</Lbl><Sel t={t} value={pe.role || ""} onChange={e => setProfileEdit({ ...pe, role: e.target.value })} options={getOpts("staff_roles")} /></div>
              <div><Lbl>Employment Type</Lbl><Sel t={t} value={pe.employmentType || ""} onChange={e => setProfileEdit({ ...pe, employmentType: e.target.value || null })} options={[{v:"",l:"Unspecified"},{v:"full_time",l:"Full Time"},{v:"part_time",l:"Part Time"},{v:"supplemental",l:"Supplemental"}]} /></div>
              <div><Lbl>Hourly Rate</Lbl><Inp t={t} value={pe.hourlyRate || ""} onChange={e => setProfileEdit({ ...pe, hourlyRate: e.target.value })} type="number" placeholder="0.00" /></div>
              <div><Lbl>Birthday</Lbl><Inp t={t} value={pe.birthday || ""} onChange={e => setProfileEdit({ ...pe, birthday: e.target.value })} type="date" /></div>
            </div>
            <div style={{ marginBottom: 10 }}><Lbl>Address Line 1</Lbl><Inp t={t} value={pe.addressLine1 || ""} onChange={e => setProfileEdit({ ...pe, addressLine1: e.target.value })} placeholder="Street address" /></div>
            <div style={{ marginBottom: 10 }}><Lbl>Address Line 2</Lbl><Inp t={t} value={pe.addressLine2 || ""} onChange={e => setProfileEdit({ ...pe, addressLine2: e.target.value })} placeholder="Apt, suite, etc." /></div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><Lbl>City</Lbl><Inp t={t} value={pe.city || ""} onChange={e => setProfileEdit({ ...pe, city: e.target.value })} /></div>
              <div><Lbl>State</Lbl><Inp t={t} value={pe.state || ""} onChange={e => setProfileEdit({ ...pe, state: e.target.value })} /></div>
              <div><Lbl>Zip</Lbl><Inp t={t} value={pe.zipCode || ""} onChange={e => setProfileEdit({ ...pe, zipCode: e.target.value })} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><Lbl>Emergency Contact</Lbl><Inp t={t} value={pe.emergencyContactName || ""} onChange={e => setProfileEdit({ ...pe, emergencyContactName: e.target.value })} placeholder="Full name" /></div>
              <div><Lbl>Emergency Phone</Lbl><Inp t={t} value={pe.emergencyContactPhone || ""} onChange={e => setProfileEdit({ ...pe, emergencyContactPhone: e.target.value })} placeholder="Phone number" /></div>
            </div>
            <div style={{ marginBottom: 10 }}><Lbl>Preferred Language</Lbl><Sel t={t} aria-label="Preferred Language" value={langCode(pe.preferredLanguage)} onChange={e => setProfileEdit({ ...pe, preferredLanguage: e.target.value })} options={LANG_OPTS} /></div>
            <div style={{ marginBottom: 14 }}><Lbl>Notes</Lbl><TArea t={t} value={pe.personalNotes || ""} onChange={e => setProfileEdit({ ...pe, personalNotes: e.target.value })} rows={3} placeholder="Internal notes about this employee..." /></div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => { setEmpIdError(""); setProfileEdit(null); }}>Cancel</Btn><Btn t={t} onClick={saveProfileInfo}>Save Changes</Btn></div>
          </div>}
        </Crd>
      </div>}

      {/* HR FILES TAB */}
      {profileTab === "hr" && <div>
        {hrLoading ? <div style={{ textAlign: "center", padding: 40, color: t.textMut, fontSize: 13 }}>Loading HR files...</div> : <div>
          <Crd t={t} style={{ marginBottom: 12, padding: 16 }}>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 10 }}>Documents ({hrDocs.length})</div>
            {hrDocs.length === 0 && <div style={{ fontSize: 12, color: t.textMut }}>No documents on file</div>}
            {hrDocs.map((doc, i) => <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: t.hover, borderRadius: 6, marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{HR_CATEGORY_LABEL(doc.category || doc.document_type)}</div>
                <div style={{ fontSize: 10, color: t.textMut, marginTop: 2 }}>{doc.file_name || "No file"}{doc.expiry_date ? " | Exp: " + fmtDate(doc.expiry_date) : ""}</div>
              </div>
              {doc.file_name && <button onClick={() => viewDoc(doc.id)} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + BL, background: "transparent", color: BL, fontSize: 9, cursor: "pointer", fontWeight: 600 }}>View</button>}
            </div>)}
          </Crd>
          <Crd t={t} style={{ marginBottom: 12, padding: 16 }}>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 10 }}>Training Records ({hrTraining.length})</div>
            {hrTraining.length === 0 && <div style={{ fontSize: 12, color: t.textMut }}>No training records</div>}
            {hrTraining.map((tr, i) => <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: t.hover, borderRadius: 6, marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{tr.training_name}</div>
                <div style={{ fontSize: 10, color: t.textMut, marginTop: 2 }}>{tr.training_type || "Training"}{tr.completed_date ? " | Completed: " + fmtDate(tr.completed_date) : ""}{tr.score ? " | Score: " + tr.score : ""}</div>
              </div>
              <Bdg l={tr.status || "completed"} c={tr.status === "failed" ? RD : GR} />
            </div>)}
          </Crd>
          {hrOnboarding.length > 0 && <Crd t={t} style={{ marginBottom: 12, padding: 16 }}>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 10 }}>Onboarding Steps</div>
            {hrOnboarding.map((step, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: t.hover, borderRadius: 6, marginBottom: 3 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: step.completed_at ? GR + "20" : t.cardAlt, border: "1.5px solid " + (step.completed_at ? GR : t.border), display: "flex", alignItems: "center", justifyContent: "center" }}>{step.completed_at && <ChkI sz={10} c={GR} />}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: t.text }}>{step.step_name}</div>{step.completed_at && <div style={{ fontSize: 9, color: t.textMut }}>Completed {fmtDate(step.completed_at)}</div>}</div>
            </div>)}
          </Crd>}
        </div>}
      </div>}

      {/* ASSIGNMENTS TAB */}
      {profileTab === "assign" && <div>
        <Crd t={t} style={{ marginBottom: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Site Assignments</div>
            <button onClick={() => setAssignForm({ userId: u.id, siteId: "", role: "", shift: "", start: "", end: "" })} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}><PlI sz={10} c={t.goldText} /> Assign</button>
          </div>
          {profile.assignments?.filter(a => a.is_active).map((a, i) => <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: t.hover, borderRadius: 8, marginBottom: 6 }}>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{a.site_name || "Site"}</div><div style={{ fontSize: 10, color: t.textMut, marginTop: 2 }}>{a.role_at_site || "No role"} | {a.shift_name || "No shift"}{a.shift_start ? " | " + a.shift_start + " - " + a.shift_end : ""}</div></div>
            <button onClick={() => unassign(u.id, a.site_id)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 10, cursor: "pointer" }}>Remove</button>
          </div>)}
          {(!profile.assignments || profile.assignments.filter(a => a.is_active).length === 0) && <div style={{ fontSize: 12, color: t.textMut }}>No sites assigned</div>}
        </Crd>
      </div>}

      {/* CERTIFICATIONS TAB */}
      {profileTab === "certs" && <div>
        <Crd t={t} style={{ marginBottom: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Certifications</div>
            <button onClick={() => setAddCert({ userId: u.id, certName: "", certType: "certification", issuingBody: "", issuedDate: "", expiryDate: "" })} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}><PlI sz={10} c={t.goldText} /> Add</button>
          </div>
          {(!profile.certifications || profile.certifications.length === 0) && <div style={{ fontSize: 12, color: t.textMut }}>No certifications on file</div>}
          {profile.certifications?.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: t.greenSubtle, borderRadius: 6, marginBottom: 4, border: "1px solid " + t.greenBorder }}>
            <div><div style={{ fontSize: 12, color: GR, fontWeight: 600 }}>{c.cert_name}</div><div style={{ fontSize: 9, color: t.textMut, marginTop: 2 }}>{c.issuing_body || ""}{c.expiry_date ? " | Exp: " + fmtDate(c.expiry_date) : ""}</div></div>
            <button onClick={async () => { if (!window.confirm("Remove this certification?")) return; try { await af("/api/users/" + u.id + "/certifications/" + c.id, { method: "DELETE" }); showToast("Removed"); openProfile(u.id); } catch (e) { showToast(e.message, "error"); } }} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 9, cursor: "pointer" }}>Remove</button>
          </div>)}
        </Crd>
      </div>}

      {/* TIMELINE TAB (Session 18) */}
      {profileTab === "timeline" && <div>
        <Crd t={t} style={{ marginBottom: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Activity Timeline ({tlTotal} total)</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={exportTimelineCsv} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}>Export CSV</button>
              <button onClick={printTimeline} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}>Print</button>
            </div>
          </div>
          {/* Category filter chips */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
            {[{ id: "all", l: "All" }, { id: "clock", l: "Clock" }, { id: "tasks", l: "Tasks" }, { id: "inspections", l: "Inspections" }, { id: "issues", l: "Issues" }, { id: "schedule", l: "Schedule" }, { id: "marketplace", l: "Marketplace" }, { id: "documents", l: "Documents" }, { id: "training", l: "Training" }, { id: "profile", l: "Profile" }, { id: "timesheets", l: "Timesheets" }, { id: "supplies", l: "Supplies" }].map(c => <button key={c.id} onClick={() => setTlCategory(c.id)} style={{ padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: tlCategory === c.id ? 700 : 500, background: tlCategory === c.id ? GO + "20" : "transparent", color: tlCategory === c.id ? t.goldText : t.textMut, border: tlCategory === c.id ? "1px solid " + GO : "1px solid " + t.border, cursor: "pointer" }}>{c.l}</button>)}
          </div>
          {/* Date range filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
            <div style={{ fontSize: 10, color: t.textMut, flexShrink: 0 }}>Date range:</div>
            <input type="date" value={tlStartDate} onChange={e => setTlStartDate(e.target.value)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid " + t.border, background: t.card, color: t.text, fontSize: 11 }} />
            <div style={{ fontSize: 10, color: t.textMut }}>to</div>
            <input type="date" value={tlEndDate} onChange={e => setTlEndDate(e.target.value)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid " + t.border, background: t.card, color: t.text, fontSize: 11 }} />
            {(tlStartDate || tlEndDate) && <button onClick={() => { setTlStartDate(""); setTlEndDate(""); }} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 9, cursor: "pointer" }}>Clear</button>}
          </div>
          {/* Timeline entries */}
          {tlLoading ? <div style={{ textAlign: "center", padding: 30, color: t.textMut, fontSize: 12 }}>Loading timeline...</div> : timeline.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: t.textMut, fontSize: 12 }}>No activity found for this filter.</div> : <div>
            {timeline.map((entry, i) => {
              const dt = new Date(entry.createdAt);
              const prevDt = i > 0 ? new Date(timeline[i - 1].createdAt) : null;
              const showDateHeader = !prevDt || dt.toDateString() !== prevDt.toDateString();
              const catColors = { clock: BL, task: TL, inspection: GO, issue: OR, document: "#9B59B6", training: GR, schedule: BL, pickup: GO, user: TL, certification: GR, shift: BL, supply: OR, message: BL, staff_site_assignment: TL, form: "#9B59B6", vendor: OR, service: TL, lookup: t.textMut, onboarding: GR };
              const dotColor = catColors[entry.entityType] || t.textMut;
              return <div key={entry.id}>{showDateHeader && <div style={{ fontSize: 10, fontWeight: 600, color: t.goldText, padding: "8px 0 4px", borderBottom: "1px solid " + t.border, marginBottom: 6, marginTop: i > 0 ? 10 : 0 }}>{dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>}
                <TimelineRow t={t} last={i === timeline.length - 1} onClick={() => openTimelineDetail(entry)} node={<div style={{ width: 28, height: 28, borderRadius: "50%", background: dotColor + "1F", border: "1.5px solid " + dotColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} /></div>}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: t.text, lineHeight: 1.4 }}>{entry.description || entry.actionType.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 10, color: t.textMut, marginTop: 2 }}>{dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{entry.actorName && entry.actorName !== (u.firstName + " " + u.lastName) ? " by " + entry.actorName : ""}</div>
                    </div>
                    <div style={{ fontSize: 9, color: dotColor, background: dotColor + "15", padding: "2px 6px", borderRadius: 4, flexShrink: 0, textTransform: "capitalize" }}>{entry.entityType.replace(/_/g, " ")}</div>
                  </div>
                </TimelineRow>
              </div>;
            })}
            {timeline.length < tlTotal && <div style={{ textAlign: "center", padding: 12 }}><button onClick={async () => { try { let url = "/api/users/timeline/" + u.id + "?limit=200&offset=" + timeline.length; if (tlCategory !== "all") url += "&category=" + tlCategory; if (tlStartDate) url += "&startDate=" + tlStartDate; if (tlEndDate) url += "&endDate=" + tlEndDate; const d = await af(url); setTimeline([...timeline, ...(d.entries || [])]); } catch (e) { showToast(e.message, "error"); } }} style={{ padding: "6px 16px", borderRadius: 6, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 11, cursor: "pointer" }}>Load More ({tlTotal - timeline.length} remaining)</button></div>}
          </div>}
        </Crd>
      </div>}

      {/* Timeline Detail Modal (Session 18) */}
      {tlDetailLoading && <Mdl t={t} onClose={() => setTlDetailLoading(false)}><div style={{ padding: 40, textAlign: "center", color: t.textMut, fontSize: 13 }}>Loading record details...</div></Mdl>}
      {tlDetail && !tlDetailLoading && <Mdl t={t} onClose={() => setTlDetail(null)}><div style={{ padding: 20, maxHeight: "calc(80vh / var(--zoom, 1))", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Record Detail</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={printTimelineDetail} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}>Print</button>
            <button onClick={() => setTlDetail(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button>
          </div>
        </div>
        {/* Activity summary */}
        <div style={{ padding: 12, background: t.hover, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>{tlDetail.entry?.description || "N/A"}</div>
          <div style={{ fontSize: 11, color: t.textMut }}>{tlDetail.entry ? new Date(tlDetail.entry.createdAt).toLocaleString() : ""}{tlDetail.entry?.actorName ? " by " + tlDetail.entry.actorName : ""}</div>
          <div style={{ marginTop: 6 }}><Bdg l={tlDetail.entry?.actionType?.replace(/_/g, " ") || ""} c={GO} /></div>
        </div>
        {!tlDetail.found && <div style={{ padding: 16, textAlign: "center", color: t.textMut, fontSize: 12 }}>
          <div style={{ marginBottom: 8 }}>The source record could not be found. It may have been deleted or the entry was logged with a temporary reference.</div>
          {tlDetail.entry?.metadata && Object.keys(tlDetail.entry.metadata).length > 0 && <div>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6, marginTop: 12 }}>Available Metadata</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Object.entries(tlDetail.entry.metadata).map(([k, v]) => <div key={k} style={{ fontSize: 11 }}><span style={{ color: t.textMut }}>{k.replace(/_/g, " ")}:</span> <span style={{ color: t.text, fontWeight: 500 }}>{String(v)}</span></div>)}
            </div>
          </div>}
        </div>}
        {tlDetail.found && tlDetail.record && <div>
          <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 10 }}>Record Fields</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {Object.entries(tlDetail.record).filter(([k, v]) => v !== null && v !== undefined && v !== "" && k !== "id" && !k.endsWith("_hash")).map(([k, v]) => {
              const isUrl = typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://"));
              const isObj = typeof v === "object" && !Array.isArray(v);
              return <div key={k} style={{ fontSize: 11 }}>
                <div style={{ color: t.textMut, fontSize: 9, textTransform: "uppercase", marginBottom: 1 }}>{k.replace(/_/g, " ")}</div>
                {isUrl ? <a href={v} target="_blank" rel="noopener noreferrer" style={{ color: BL, fontWeight: 500, wordBreak: "break-all" }}>{v.length > 60 ? "View file" : v}</a>
                  : <div style={{ color: t.text, fontWeight: 500, wordBreak: "break-word" }}>{isObj ? JSON.stringify(v) : String(v).length > 200 ? String(v).substring(0, 200) + "..." : String(v)}</div>}
              </div>;
            })}
          </div>
          {/* Photos */}
          {tlDetail.photos && tlDetail.photos.length > 0 && <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>Photos ({tlDetail.photos.length})</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tlDetail.photos.map((p, i) => <a key={i} href={p.photo_url || p.file_url || ""} target="_blank" rel="noopener noreferrer"><img src={p.photo_url || p.file_url || ""} alt={"Photo " + (i + 1)} style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 6, border: "1px solid " + t.border }} /></a>)}
            </div>
          </div>}
          {/* Related items */}
          {tlDetail.relatedItems && tlDetail.relatedItems.length > 0 && <div>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>Related Items ({tlDetail.relatedItems.length})</div>
            {tlDetail.relatedItems.map((item, i) => <div key={i} style={{ padding: 10, background: t.hover, borderRadius: 6, marginBottom: 4, fontSize: 11 }}>
              {Object.entries(item).filter(([k, v]) => v !== null && v !== undefined && k !== "id" && k !== "items" && !k.endsWith("_id")).slice(0, 6).map(([k, v]) => <span key={k} style={{ marginRight: 12 }}><span style={{ color: t.textMut }}>{k.replace(/_/g, " ")}:</span> <span style={{ color: t.text, fontWeight: 500 }}>{typeof v === "object" ? JSON.stringify(v).substring(0, 80) : String(v).substring(0, 80)}</span></span>)}
            </div>)}
          </div>}
        </div>}
      </div></Mdl>}

      {/* Modals that need to work inside profile view */}
      {resetPin && <Mdl t={t} onClose={() => setResetPin(null)}><div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, marginBottom: 16, color: t.text }}>Reset PIN</div>
        <div style={{ fontSize: 12, color: t.textSec, marginBottom: 12 }}>Enter a new 4-digit PIN for this staff member.</div>
        <div style={{ marginBottom: 16 }}><Lbl>New PIN (4 digits)</Lbl><Inp t={t} value={newPin} onChange={e => setNewPin(e.target.value)} maxLength={4} placeholder="0000" style={{ letterSpacing: "8px", textAlign: "center", fontSize: 20 }} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setResetPin(null)}>Cancel</Btn><Btn t={t} onClick={() => submitResetPin(resetPin)}>Reset PIN</Btn></div>
      </div></Mdl>}
      {assignForm && <Mdl t={t} onClose={() => setAssignForm(null)}><div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, marginBottom: 16, color: t.text }}>Assign to Site</div>
        <div style={{ marginBottom: 12 }}><Lbl>Site *</Lbl><Sel t={t} value={assignForm.siteId} onChange={e => setAssignForm({ ...assignForm, siteId: e.target.value })} options={[{ v: "", l: "Select..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
        <div style={{ marginBottom: 12 }}><Lbl>Role at Site</Lbl><Sel t={t} value={assignForm.role} onChange={e => setAssignForm({ ...assignForm, role: e.target.value })} options={getOpts("site_roles", "Select role...")} /></div>
        <div style={{ marginBottom: 12 }}><Lbl>Shift</Lbl><Sel t={t} value={assignForm.shift} onChange={e => setAssignForm({ ...assignForm, shift: e.target.value })} options={getOpts("shift_names", "Select shift...")} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}><div><Lbl>Start</Lbl><Inp t={t} type="time" value={assignForm.start} onChange={e => setAssignForm({ ...assignForm, start: e.target.value })} /></div><div><Lbl>End</Lbl><Inp t={t} type="time" value={assignForm.end} onChange={e => setAssignForm({ ...assignForm, end: e.target.value })} /></div></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAssignForm(null)}>Cancel</Btn><Btn t={t} onClick={assignSite}>Assign</Btn></div></div></Mdl>}
      {addCert && <Mdl t={t} onClose={() => setAddCert(null)}><div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Add Certification</div><button onClick={() => setAddCert(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
        <div style={{ marginBottom: 12 }}><Lbl>Certification Name *</Lbl><Inp t={t} value={addCert.certName} onChange={e => setAddCert({ ...addCert, certName: e.target.value })} placeholder="e.g. Green Cleaning Fundamentals" /></div>
        <div style={{ marginBottom: 12 }}><Lbl>Type</Lbl><Sel t={t} value={addCert.certType} onChange={e => setAddCert({ ...addCert, certType: e.target.value })} options={getOpts("certification_types")} /></div>
        <div style={{ marginBottom: 12 }}><Lbl>Issuing Body</Lbl><Inp t={t} value={addCert.issuingBody} onChange={e => setAddCert({ ...addCert, issuingBody: e.target.value })} placeholder="e.g. ISSA, OSHA" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div><Lbl>Issued Date</Lbl><Inp t={t} type="date" value={addCert.issuedDate} onChange={e => setAddCert({ ...addCert, issuedDate: e.target.value })} /></div>
          <div><Lbl>Expiry Date</Lbl><Inp t={t} type="date" value={addCert.expiryDate} onChange={e => setAddCert({ ...addCert, expiryDate: e.target.value })} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAddCert(null)}>Cancel</Btn><Btn t={t} onClick={async () => { if (!addCert.certName) { showToast("Name required", "error"); return; } try { await af("/api/users/" + addCert.userId + "/certifications", { method: "POST", body: addCert }); showToast("Certification added"); setAddCert(null); openProfile(addCert.userId); } catch (e) { showToast(e.message, "error"); } }}>Add Certification</Btn></div>
      </div></Mdl>}
    </div>);
  }

  // ============================================================
  // STAFF LIST VIEW
  // ============================================================
  return (<div>
    <SecT t={t} action="Add Staff" onAction={() => { setEmpIdError(""); setAddForm({ firstName: "", lastName: "", phone: "", email: "", employeeId: "", role: "custodial_laborer", employmentType: null }); }}>Staff Management</SecT>
    <FilterTabs t={t} value={filter} onChange={f => { setFilter(f); setPage(1); }} tabs={[{ id: "all", label: "All", count: staff.length, color: t.goldText }, { id: "active", label: "Active", count: staff.filter(s => s.status === "active").length, color: GR }, { id: "pending", label: "Pending", count: staff.filter(s => s.status === "pending").length, color: OR }, { id: "inactive", label: "Inactive", count: staff.filter(s => s.status === "inactive" || s.status === "terminated").length, color: RD }]} />
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ minWidth: 190 }}><Sel t={t} value={roleF} onChange={e => { setRoleF(e.target.value); setPage(1); }} options={[{ v: "all", l: "All roles" }, ...getOpts("staff_roles")]} /></div>
      <div style={{ flex: 1, minWidth: 200, position: "relative" }}><Ic d="M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" sz={16} c={t.textMut} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search name, ID, phone, role" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 36px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13 }} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: t.textMut }}>Show</span><select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} style={{ padding: "9px 10px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>{[10, 25, 50, 100].map(nn => <option key={nn} value={nn}>{nn}</option>)}</select></div>
    </div>
    {(() => {
      const searched = filtered.filter(s => {
        if (roleF !== "all" && s.role !== roleF) return false;
        if (!q.trim()) return true;
        const hay = (s.name + " " + (s.employeeId || "") + " " + (s.phone || "") + " " + (roleLabels[s.role] || RL[s.role] || s.role)).toLowerCase();
        return hay.includes(q.trim().toLowerCase());
      });
      const totalPages = Math.max(1, Math.ceil(searched.length / perPage));
      const cur = Math.min(page, totalPages);
      const items = searched.slice((cur - 1) * perPage, cur * perPage);
      const statusColor = st => st === "active" ? GR : st === "pending" ? OR : (st === "inactive" || st === "terminated") ? RD : t.textMut;
      const columns = [
        { header: "Name", render: s => <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Avatar user={s} sz={38} /><div style={{ minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontWeight: 600, color: t.text }}>{s.name}</span>{s.employeeId && <span style={{ fontSize: 9, fontFamily: "monospace", color: t.goldText, background: t.goldBg, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{s.employeeId}</span>}</div>{s.email && <div style={{ fontSize: 11, color: t.textMut, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{s.email}</div>}</div></div> },
        { header: "Phone", tdStyle: { color: t.textSec, whiteSpace: "nowrap" }, render: s => s.phone || "-" },
        { header: "Status", render: s => <Bdg l={s.status} c={statusColor(s.status)} /> },
        { header: "Role", tdStyle: { color: t.textSec, whiteSpace: "nowrap" }, render: s => roleLabels[s.role] || RL[s.role] || s.role },
        { header: "Employment", tdStyle: { color: t.textSec, whiteSpace: "nowrap" }, render: s => s.employmentType ? (ET[s.employmentType] || s.employmentType) : "-" },
        { header: "Sites", tdStyle: { color: t.textMut, fontSize: 12, maxWidth: 240 }, render: s => s.sites && s.sites.length > 0 ? s.sites.map(x => x.siteName).join(", ") : "No sites" },
        { header: "Actions", align: "right", render: s => <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>{s.status === "pending" && <button onClick={e => { e.stopPropagation(); approve(s.id); }} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: GR, color: "#F8F7F4", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Approve</button>}<button title="Edit" onClick={e => { e.stopPropagation(); setEditForm({ id: s.id, firstName: (s.name || "").split(" ")[0] || "", lastName: (s.name || "").split(" ").slice(1).join(" "), phone: s.phone || "", email: s.email || "", role: s.role, employeeId: s.employeeId || "", hourlyRate: s.hourlyRate || "", employmentType: s.employmentType || null }); }} style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid " + t.blueBorder, background: t.blueSubtle, cursor: "pointer" }}><Ic d="M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" sz={15} c={BL} /></button><button title="View profile" onClick={e => { e.stopPropagation(); openProfile(s.id); }} style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid " + t.goldBorder, background: t.goldBg, cursor: "pointer" }}><Ic d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" sz={15} c={t.goldText} /></button></div> }
      ];
      return <DataTable t={t} columns={columns} rows={items} rowKey={s => s.id} onRowClick={s => openProfile(s.id)} empty="No staff match these filters." footer={<Pagination t={t} page={cur} perPage={perPage} total={searched.length} onPage={setPage} />} />;
    })()}
    {addForm && <Mdl t={t} onClose={() => setAddForm(null)}><div style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Add New Staff</div><button onClick={() => setAddForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      <div style={{ marginBottom: 12 }}><Lbl>First Name *</Lbl><Inp t={t} value={addForm.firstName} onChange={e => setAddForm({ ...addForm, firstName: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Last Name</Lbl><Inp t={t} value={addForm.lastName} onChange={e => setAddForm({ ...addForm, lastName: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Phone *</Lbl><Inp t={t} value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} placeholder="2155550000 (no dashes needed)" /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Email *</Lbl><Inp t={t} value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="name@email.com" type="email" /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Employee ID</Lbl><Inp t={t} value={addForm.employeeId || ""} onChange={e => { setAddForm({ ...addForm, employeeId: e.target.value }); setEmpIdError(""); }} placeholder={`${clientConfig.employee.idPrefix}-0042`} />{empIdError && <div style={{ fontSize: 11, color: RD, marginTop: 4 }}>{empIdError}</div>}</div>
      <div style={{ marginBottom: 12 }}><Lbl>Role</Lbl><Sel t={t} value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} options={getOpts("staff_roles")} /></div>
      <div style={{ marginBottom: 16 }}><Lbl>Employment Type</Lbl><Sel t={t} value={addForm.employmentType || ""} onChange={e => setAddForm({ ...addForm, employmentType: e.target.value || null })} options={[{v:"",l:"Unspecified"},{v:"full_time",l:"Full Time"},{v:"part_time",l:"Part Time"},{v:"supplemental",l:"Supplemental"}]} /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAddForm(null)}>Cancel</Btn><Btn t={t} onClick={submitAdd}>Add Staff</Btn></div></div></Mdl>}
    {editForm && <Mdl t={t} onClose={() => setEditForm(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Edit Staff Info</div><button onClick={() => setEditForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      <div style={{ marginBottom: 12 }}><Lbl>First Name</Lbl><Inp t={t} value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Last Name</Lbl><Inp t={t} value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Phone</Lbl><Inp t={t} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Email</Lbl><Inp t={t} value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} type="email" /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Role</Lbl><Sel t={t} value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} options={getOpts("staff_roles")} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Employment Type</Lbl><Sel t={t} value={editForm.employmentType || ""} onChange={e => setEditForm({ ...editForm, employmentType: e.target.value || null })} options={[{v:"",l:"Unspecified"},{v:"full_time",l:"Full Time"},{v:"part_time",l:"Part Time"},{v:"supplemental",l:"Supplemental"}]} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Employee ID</Lbl><Inp t={t} value={editForm.employeeId || ""} onChange={e => setEditForm({ ...editForm, employeeId: e.target.value })} placeholder={`${clientConfig.employee.idPrefix}-0042`} /></div>
      <div style={{ marginBottom: 16 }}><Lbl>Hourly Rate</Lbl><Inp t={t} value={editForm.hourlyRate} onChange={e => setEditForm({ ...editForm, hourlyRate: e.target.value })} placeholder="0.00" type="number" /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setEditForm(null)}>Cancel</Btn><Btn t={t} onClick={submitEdit}>Save Changes</Btn></div>
    </div></Mdl>}
  </div>);
}


function SitesPage({ af, showToast, isAdmin, t, sites, allStaff, loadSites, uf, getOpts, lkMap, lkColorMap }) {
  const [selectedSite, setSelectedSite] = useState(null);
  const [siteProfile, setSiteProfile] = useState(null);
  const [siteTab, setSiteTab] = useState("general");
  const [st, setSt] = useState([]);
  const [addSite, setAddSite] = useState(null);
  const [addTask, setAddTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [editSite, setEditSite] = useState(null);
  const [statusF, setStatusF] = useState("active"); const [q, setQ] = useState(""); const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteText, setDeleteText] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [tlTotal, setTlTotal] = useState(0);
  const [tlCat, setTlCat] = useState("all");
  const [tlDateRange, setTlDateRange] = useState({ start: "", end: "" });
  const [tlLoading, setTlLoading] = useState(false);
  const [tlOffset, setTlOffset] = useState(0);
  const [floorPlanLabel, setFloorPlanLabel] = useState("Floor Plan");
  const [tlDetail, setTlDetail] = useState(null);
  const [tlDetailLoading, setTlDetailLoading] = useState(false);
  const [siteChat, setSiteChat] = useState([]);
  const [siteChatTotal, setSiteChatTotal] = useState(0);
  const [siteChatChannel, setSiteChatChannel] = useState(null);
  const [siteChatLoading, setSiteChatLoading] = useState(false);
  const [showAddSupply, setShowAddSupply] = useState(false);
  const [availableSupplies, setAvailableSupplies] = useState([]);
  const [addSupplyLoading, setAddSupplyLoading] = useState(false);
  const cimsLabels = lkMap("cims_categories");
  const staffList = allStaff;
  const load = () => loadSites();

  const openProfile = async (siteId) => {
    setSelectedSite(siteId);
    setSiteTab("general");
    setTimeline([]);
    setTlOffset(0);
    setTlCat("all");
    try {
      const p = await af("/api/sites/profile/" + siteId);
      setSiteProfile(p);
      const tasks = await af("/api/sites/" + siteId + "/tasks");
      setSt(tasks);
    } catch (e) { showToast(e.message, "error"); }
  };

  const closeProfile = () => { setSelectedSite(null); setSiteProfile(null); setSt([]); };

  const loadTimeline = async (cat, offset, append) => {
    if (!selectedSite) return;
    setTlLoading(true);
    try {
      let url = "/api/sites/timeline/" + selectedSite + "?limit=100&offset=" + offset;
      if (cat && cat !== "all") url += "&category=" + cat;
      if (tlDateRange.start) url += "&startDate=" + tlDateRange.start;
      if (tlDateRange.end) url += "&endDate=" + tlDateRange.end;
      const d = await af(url);
      setTimeline(append ? prev => [...prev, ...d.entries] : d.entries);
      setTlTotal(d.total);
    } catch (e) { console.warn("Timeline load error:", e); }
    setTlLoading(false);
  };

  useEffect(() => { if (siteTab === "timeline" && selectedSite) { setTlOffset(0); loadTimeline(tlCat, 0, false); } }, [siteTab, tlCat, tlDateRange, selectedSite]);

  const loadMoreTl = () => { const next = tlOffset + 100; setTlOffset(next); loadTimeline(tlCat, next, true); };

  const refreshProfile = async () => { if (selectedSite) { try { const p = await af("/api/sites/profile/" + selectedSite); setSiteProfile(p); } catch (e) { console.warn(e); } } };

  const loadSiteChat = async () => {
    if (!selectedSite) return;
    setSiteChatLoading(true);
    try {
      const d = await af("/api/sites/chat/" + selectedSite + "?limit=200");
      setSiteChat(d.messages || []);
      setSiteChatTotal(d.total || 0);
      setSiteChatChannel(d.channel);
    } catch (e) { console.warn("Site chat load error:", e); setSiteChat([]); }
    setSiteChatLoading(false);
  };

  useEffect(() => { if (siteTab === "chat" && selectedSite) loadSiteChat(); }, [siteTab, selectedSite]);

  const openAddSupply = async () => {
    setAddSupplyLoading(true);
    try {
      const d = await af("/api/sites/" + selectedSite + "/supplies/available");
      setAvailableSupplies(d);
    } catch (e) { showToast("Failed to load supplies", "error"); setAvailableSupplies([]); }
    setAddSupplyLoading(false);
    setShowAddSupply(true);
  };

  const assignSupplyToSite = async (supplyId) => {
    try {
      await af("/api/sites/" + selectedSite + "/supplies", { method: "POST", body: { supplyId } });
      showToast("Supply assigned");
      setAvailableSupplies(prev => prev.filter(s => s.id !== supplyId));
      refreshProfile();
    } catch (e) { showToast(e.message, "error"); }
  };

  const removeSupplyFromSite = async (supplyId) => {
    if (!window.confirm("Remove this supply from the site?")) return;
    try {
      await af("/api/sites/" + selectedSite + "/supplies/" + supplyId, { method: "DELETE" });
      showToast("Supply removed");
      refreshProfile();
    } catch (e) { showToast(e.message, "error"); }
  };

  const printSiteChat = () => {
    if (siteChat.length === 0) { showToast("No messages to print", "error"); return; }
    const siteName = siteProfile?.site?.name || "Site";
    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + siteName + ' - Chat History</title><style>';
    html += 'body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:0;padding:0;color:#1a1a1a;font-size:11px}';
    html += '.header{background:' + NAVY + ';color:#F8F7F4;padding:20px 32px;display:flex;align-items:center;justify-content:space-between}';
    html += '.header h1{margin:0;font-size:16px;color:' + GOLD + '}.header .sub{font-size:10px;color:#8899AA;margin-top:4px}';
    html += '.content{padding:20px 32px}.msg{display:flex;gap:10px;padding:10px 12px;margin-bottom:8px;background:#f9f9f9;border-radius:8px;border-left:3px solid ' + GOLD + '}';
    html += '.msg .avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid ' + GOLD + '}';
    html += '.msg .initials{width:36px;height:36px;border-radius:50%;background:#f0e8d0;border:1.5px solid ' + GOLD + ';display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:' + NAVY + ';flex-shrink:0}';
    html += '.msg .sender{font-weight:700;font-size:12px;color:' + NAVY + '}.msg .time{font-size:9px;color:#888;margin-left:8px}.msg .text{font-size:12px;margin-top:4px;line-height:1.6}';
    html += '.footer{text-align:center;font-size:9px;color:#999;margin-top:16px;padding-top:8px;border-top:1px solid #e0e0e0}';
    html += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>';
    html += sitePrintHeader(siteName + ' - Chat History', siteChatTotal + ' messages | Channel: ' + (siteChatChannel?.name || "Site") + ' | Generated ' + new Date().toLocaleDateString());
    html += '<div class="content">';
    const sorted = [...siteChat].reverse();
    sorted.forEach(m => {
      const dt = new Date(m.sentAt);
      const name = m.senderName || "Unknown";
      const initials = name.split(" ").map(w => w[0] || "").join("").toUpperCase();
      html += '<div class="msg">';
      if (m.profilePhotoUrl) {
        html += '<img class="avatar" src="' + m.profilePhotoUrl + '" />';
      } else {
        html += '<div class="initials">' + initials + '</div>';
      }
      html += '<div><span class="sender">' + name + '</span><span class="time">' + dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + '</span>';
      html += '<div class="text">' + (m.text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</div></div></div>';
    });
    html += '<div class="footer">' + clientConfig.company.name + ' | ' + clientConfig.company.location + ' | Confidential Communication Record</div></div></body></html>';
    const w = window.open("", "_blank"); w.document.write(html); w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  const saveSiteField = async (fieldMap) => {
    try {
      await af("/api/sites/" + selectedSite, { method: "PATCH", body: fieldMap });
      showToast("Saved");
      refreshProfile();
    } catch (e) { showToast(e.message, "error"); }
  };

  const submitSite = async () => {
    if (!addSite.name || !addSite.address) { showToast("Name and address required", "error"); return; }
    try {
      await af("/api/sites", { method: "POST", body: { name: addSite.name, addressLine1: addSite.address, city: addSite.city || "Philadelphia", state: addSite.state || "PA", zipCode: addSite.zip, clientName: addSite.client, contractType: addSite.contract, primeContractor: addSite.prime } });
      showToast("Site created"); setAddSite(null); load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const submitTask = async () => {
    if (!addTask.label || !addTask.zone) { showToast("Label and zone required", "error"); return; }
    try {
      await af("/api/sites/" + addTask.siteId + "/tasks", { method: "POST", body: { label: addTask.label, zone: addTask.zone, cimsCategory: addTask.cims, priority: addTask.pri, assignToUsers: addTask.assign ? [addTask.assign] : [], description: addTask.desc || undefined, mediaUrl: addTask.mediaUrl || undefined, mediaType: addTask.mediaType || undefined, dueDate: addTask.dueDate || undefined, dueTime: addTask.dueTime || undefined, buildingName: addTask.building || undefined, floorNumber: addTask.floor || undefined, taskType: addTask.taskType || "standard" } });
      showToast("Task created"); setAddTask(null);
      const tasks = await af("/api/sites/" + selectedSite + "/tasks"); setSt(tasks);
      refreshProfile();
    } catch (e) { showToast(e.message, "error"); }
  };

  const submitEditTask = async () => {
    try {
      await af("/api/sites/" + editTask.siteId + "/tasks/" + editTask.id, { method: "PATCH", body: { label: editTask.label, zone: editTask.zone, priority: editTask.pri, cimsCategory: editTask.cims, description: editTask.desc, mediaUrl: editTask.mediaUrl, mediaType: editTask.mediaType, dueDate: editTask.dueDate, dueTime: editTask.dueTime, buildingName: editTask.building, floorNumber: editTask.floor, taskType: editTask.taskType } });
      showToast("Task updated"); setEditTask(null);
      const tasks = await af("/api/sites/" + selectedSite + "/tasks"); setSt(tasks);
    } catch (e) { showToast(e.message, "error"); }
  };

  const delTask = async (sid, tid) => {
    try { await af("/api/sites/" + sid + "/tasks/" + tid, { method: "DELETE" }); showToast("Removed"); const tasks = await af("/api/sites/" + sid + "/tasks"); setSt(tasks); refreshProfile(); } catch (e) { showToast(e.message, "error"); }
  };

  const deactivateSite = async (id) => { try { await af("/api/sites/" + id, { method: "PATCH", body: { status: "inactive" } }); showToast("Site deactivated"); closeProfile(); load(); } catch (e) { showToast(e.message, "error"); } };

  const deleteSite = async (id) => { try { await af("/api/sites/" + id, { method: "DELETE" }); showToast("Site permanently deleted"); setDeleteConfirm(null); setDeleteText(""); closeProfile(); load(); } catch (e) { showToast(e.message, "error"); } };

  const uploadFloorPlan = async (file) => {
    if (!file || !selectedSite) return;
    if (file.size > 50 * 1024 * 1024) { showToast("File must be under 50MB", "error"); return; }
    try {
      showToast("Uploading...");
      const r = await uf(file, "site-floor-plans");
      await af("/api/sites/" + selectedSite + "/floor-plans", { method: "POST", body: { label: floorPlanLabel || "Floor Plan", fileUrl: r.url } });
      showToast("Floor plan uploaded");
      setFloorPlanLabel("Floor Plan");
      refreshProfile();
    } catch (e) { showToast("Upload failed: " + e.message, "error"); }
  };

  const deleteFloorPlan = async (planId) => {
    if (!window.confirm("Remove this floor plan?")) return;
    try { await af("/api/sites/" + selectedSite + "/floor-plans/" + planId, { method: "DELETE" }); showToast("Floor plan removed"); refreshProfile(); } catch (e) { showToast(e.message, "error"); }
  };

  const visibleSites = isAdmin ? sites : sites.filter(s => s.status === "active");
  const inactiveCount = sites.filter(s => s.status !== "active").length;

  const tlCats = [
    { k: "all", l: "All" }, { k: "clock", l: "Clock" }, { k: "tasks", l: "Tasks" }, { k: "inspections", l: "Inspections" },
    { k: "issues", l: "Issues" }, { k: "schedule", l: "Schedule" }, { k: "marketplace", l: "Marketplace" },
    { k: "supplies", l: "Supplies" }, { k: "staff", l: "Staff" }, { k: "site", l: "Site" }
  ];

  const tlColorMap = {
    clock: BL, tasks: GR, inspections: TL, issues: RD, schedule: OR, marketplace: GO, supplies: "#9B59B6", staff: BL, chat: "#9B59B6", site: GO
  };

  const getTlCategory = (actionType) => {
    if (actionType.includes("clock") || actionType.includes("manual_clock")) return "clock";
    if (actionType.includes("task")) return "tasks";
    if (actionType.includes("inspection")) return "inspections";
    if (actionType.includes("issue")) return "issues";
    if (actionType.includes("shift_created") || actionType.includes("shift_updated") || actionType.includes("shift_deleted") || actionType.includes("bulk_shifts")) return "schedule";
    if (actionType.includes("drop_") || actionType.includes("claimed") || actionType.includes("released") || actionType.includes("pickup_") || actionType.includes("converted")) return "marketplace";
    if (actionType.includes("supply")) return "supplies";
    if (actionType.includes("site_assigned") || actionType.includes("site_unassigned")) return "staff";
    if (actionType.includes("message_sent") || actionType.includes("chat_dm")) return "chat";
    if (actionType.includes("site_")) return "site";
    return "site";
  };

  // Branded print helpers (duplicated from StaffPage for site context)
  const sitePrintHeader = (title, subtitle) => {
    let h = '<div class="header"><div><h1>' + title + '</h1><div class="sub">' + subtitle + '</div></div>';
    h += '<img src="' + OCSA_LOGO_URL + '" style="height:40px" /></div>';
    return h;
  };

  // Open timeline detail record
  const openTimelineDetail = async (entry) => {
    setTlDetailLoading(true);
    try {
      const d = await af("/api/users/timeline-detail/" + entry.entityType + "/" + entry.entityId);
      setTlDetail({ ...d, entry });
    } catch (e) {
      setTlDetail({ found: false, entry, record: null, photos: [], relatedItems: [] });
    }
    setTlDetailLoading(false);
  };

  // Export timeline CSV
  const exportTimelineCsv = () => {
    if (timeline.length === 0) { showToast("No data to export", "error"); return; }
    const siteName = siteProfile.site.name || "Site";
    const rows = [["Date", "Time", "Action", "Description", "Performed By"]];
    timeline.forEach(e => {
      const dt = new Date(e.createdAt);
      rows.push([dt.toLocaleDateString(), dt.toLocaleTimeString(), e.actionType.replace(/_/g, " "), (e.description || "").replace(/,/g, ";"), e.actorName || "System"]);
    });
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = (siteName + "_Timeline_" + new Date().toISOString().split("T")[0] + ".csv").replace(/ /g, "_");
    a.click(); URL.revokeObjectURL(a.href);
    showToast("CSV exported");
  };

  // Print timeline
  const printSiteTimeline = () => {
    if (timeline.length === 0) { showToast("No data to print", "error"); return; }
    const siteName = siteProfile.site.name || "Site";
    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + siteName + ' - Site Timeline</title><style>';
    html += 'body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:0;padding:0;color:#1a1a1a;font-size:11px}';
    html += '.header{background:' + NAVY + ';color:#F8F7F4;padding:20px 32px;display:flex;align-items:center;justify-content:space-between}';
    html += '.header h1{margin:0;font-size:16px;color:' + GOLD + '}.header .sub{font-size:10px;color:#8899AA;margin-top:4px}';
    html += '.content{padding:20px 32px}table{width:100%;border-collapse:collapse}th{text-align:left;background:#f5f5f5;padding:5px 8px;font-size:9px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd}td{padding:4px 8px;border-bottom:1px solid #eee;font-size:11px}';
    html += '.footer{text-align:center;font-size:9px;color:#999;margin-top:16px;padding-top:8px;border-top:1px solid #e0e0e0}';
    html += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>';
    html += sitePrintHeader(siteName + ' - Site Timeline', timeline.length + ' of ' + tlTotal + ' entries' + (tlCat !== "all" ? " | Filter: " + tlCat : "") + (tlDateRange.start ? " | From: " + tlDateRange.start : "") + (tlDateRange.end ? " | To: " + tlDateRange.end : "") + ' | Generated ' + new Date().toLocaleDateString());
    html += '<div class="content"><table><tr><th>Date</th><th>Time</th><th>Category</th><th>Action</th><th>Description</th><th>By</th></tr>';
    timeline.forEach(e => { const dt = new Date(e.createdAt); html += '<tr><td style="white-space:nowrap">' + dt.toLocaleDateString() + '</td><td>' + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + '</td><td>' + e.entityType.replace(/_/g, " ") + '</td><td>' + e.actionType.replace(/_/g, " ") + '</td><td>' + (e.description || "") + '</td><td>' + (e.actorName || "System") + '</td></tr>'; });
    html += '</table><div class="footer">' + clientConfig.company.name + ' | ' + clientConfig.company.location + ' | Site Record</div></div></body></html>';
    const w = window.open("", "_blank"); w.document.write(html); w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  // Print timeline detail
  const printSiteTimelineDetail = () => {
    if (!tlDetail) return;
    const siteName = siteProfile.site.name || "Site";
    const e = tlDetail.entry;
    const r = tlDetail.record;
    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Record Detail</title><style>';
    html += 'body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:0;padding:0;color:#1a1a1a;font-size:12px}';
    html += '.header{background:' + NAVY + ';color:#F8F7F4;padding:20px 32px;display:flex;align-items:center;justify-content:space-between}';
    html += '.header h1{margin:0;font-size:16px;color:' + GOLD + '}.header .sub{font-size:10px;color:#8899AA;margin-top:4px}';
    html += '.content{padding:24px 32px}.section{margin-bottom:16px}.section-title{font-size:11px;color:' + GOLD + ';text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px;border-bottom:1px solid #e0e0e0;padding-bottom:4px}';
    html += '.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.field{margin-bottom:6px}.field .label{font-size:9px;color:#888;text-transform:uppercase}.field .value{font-size:12px;font-weight:500;margin-top:2px}';
    html += 'table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;background:#f5f5f5;padding:6px 8px;font-size:9px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd}td{padding:5px 8px;border-bottom:1px solid #eee}';
    html += '.photo{max-width:300px;max-height:200px;border-radius:6px;margin:4px}.footer{text-align:center;font-size:9px;color:#999;margin-top:20px;padding-top:10px;border-top:1px solid #e0e0e0}';
    html += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>';
    html += sitePrintHeader('Record Detail: ' + e.actionType.replace(/_/g, " "), siteName + ' | ' + new Date(e.createdAt).toLocaleString());
    html += '<div class="content">';
    html += '<div class="section"><div class="section-title">Activity Description</div><div style="font-size:13px;margin-bottom:8px">' + (e.description || "N/A") + '</div></div>';
    if (r) {
      html += '<div class="section"><div class="section-title">Record Details</div><div class="grid">';
      Object.entries(r).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "" && k !== "id" && !k.endsWith("_hash")) {
          const label = k.replace(/_/g, " ");
          let val = String(v);
          if (typeof v === "object" && !Array.isArray(v)) val = JSON.stringify(v);
          const isImgUrl = typeof v === "string" && (v.includes("supabase") || v.includes("storage")) && (v.includes(".jpg") || v.includes(".jpeg") || v.includes(".png") || v.includes(".webp") || v.includes("profile-photos") || v.includes("issue-photos") || v.includes("task-media"));
          if (isImgUrl) {
            html += '<div class="field" style="grid-column:span 2"><div class="label">' + label + '</div><img src="' + v + '" style="max-width:300px;max-height:200px;border-radius:6px;margin-top:4px" /></div>';
          } else {
            if (val.length > 200) val = val.substring(0, 200) + "...";
            html += '<div class="field"><div class="label">' + label + '</div><div class="value">' + val + '</div></div>';
          }
        }
      });
      html += '</div></div>';
    }
    if (tlDetail.photos && tlDetail.photos.length > 0) {
      html += '<div class="section"><div class="section-title">Photos (' + tlDetail.photos.length + ')</div>';
      tlDetail.photos.forEach(p => { html += '<div style="display:inline-block;margin:4px"><img class="photo" src="' + (p.photo_url || p.file_url || "") + '" /><div style="font-size:9px;color:#888;margin-top:2px">' + (p.caption || p.notes || "") + '</div></div>'; });
      html += '</div>';
    }
    if (tlDetail.relatedItems && tlDetail.relatedItems.length > 0) {
      html += '<div class="section"><div class="section-title">Related Items (' + tlDetail.relatedItems.length + ')</div><table><tr>';
      const first = tlDetail.relatedItems[0];
      const cols = Object.keys(first).filter(k => k !== "id" && k !== "items" && !k.endsWith("_id"));
      cols.slice(0, 6).forEach(c => { html += '<th>' + c.replace(/_/g, " ") + '</th>'; });
      html += '</tr>';
      tlDetail.relatedItems.forEach(item => { html += '<tr>'; cols.slice(0, 6).forEach(c => { const v = item[c]; html += '<td>' + (v !== null && v !== undefined ? String(v).substring(0, 100) : "") + '</td>'; }); html += '</tr>'; });
      html += '</table></div>';
    }
    html += '<div class="footer">' + clientConfig.company.name + ' | ' + clientConfig.company.location + ' | Confidential Site Record</div></div></body></html>';
    const w = window.open("", "_blank"); w.document.write(html); w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  // ---- PROFILE VIEW ----
  if (selectedSite && siteProfile) {
    const sp = siteProfile;
    const s = sp.site;
    const tabs = [
      { k: "general", l: "General Info" }, { k: "tasks", l: "Service Details" },
      { k: "shifts", l: "Shifts & Schedule" }, { k: "supplies", l: "Supplies" },
      { k: "scope", l: "Scope of Work" }, { k: "chat", l: "Chat" }, { k: "timeline", l: "Timeline" }
    ];

    return (<div>
      <button onClick={closeProfile} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", background: "none", border: "none", color: t.goldText, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
        <Ic d="M19 12H5M12 19l-7-7 7-7" sz={16} c={t.goldText} /> Back to Sites
      </button>

      <Crd t={t} style={{ marginBottom: 16, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <MpI sz={24} c={t.goldText} />
              <div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 600, color: t.text }}>{s.name}</div>
              <Bdg l={s.status} c={s.status === "active" ? GR : OR} />
            </div>
            <div style={{ fontSize: 12, color: t.textSec, marginLeft: 34 }}>{s.address_line1}{s.city ? ", " + s.city : ""}{s.state ? " " + s.state : ""} {s.zip_code || ""}</div>
          </div>
          {isAdmin && <div style={{ display: "flex", gap: 6 }}>
            {s.status === "active" && <button onClick={() => { if (window.confirm("Deactivate this site?")) deactivateSite(s.id); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid " + OR, background: "transparent", color: OR, fontSize: 11, cursor: "pointer" }}>Deactivate</button>}
            {s.status !== "active" && <button onClick={async () => { try { await af("/api/sites/" + s.id, { method: "PATCH", body: { status: "active" } }); showToast("Site reactivated"); closeProfile(); load(); } catch (e) { showToast(e.message, "error"); } }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid " + GR, background: "transparent", color: GR, fontSize: 11, cursor: "pointer" }}>Reactivate</button>}
            <button onClick={() => { setDeleteConfirm(s); setDeleteText(""); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 11, cursor: "pointer" }}>Delete</button>
          </div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
          <div style={{ textAlign: "center", padding: "10px 0", background: t.hover, borderRadius: 8 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 600, color: t.goldText }}>{sp.staff.length}</div><div style={{ fontSize: 10, color: t.textMut }}>Staff</div></div>
          <div style={{ textAlign: "center", padding: "10px 0", background: t.hover, borderRadius: 8 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 600, color: BL }}>{sp.taskCount}</div><div style={{ fontSize: 10, color: t.textMut }}>Tasks</div></div>
          <div style={{ textAlign: "center", padding: "10px 0", background: t.hover, borderRadius: 8 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 600, color: TL }}>{sp.inspectionSummary?.avg_score || "N/A"}</div><div style={{ fontSize: 10, color: t.textMut }}>Avg Score (30d)</div></div>
          <div style={{ textAlign: "center", padding: "10px 0", background: t.hover, borderRadius: 8 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 600, color: RD }}>{parseInt(sp.issueSummary?.open_count || 0) + parseInt(sp.issueSummary?.in_progress_count || 0)}</div><div style={{ fontSize: 10, color: t.textMut }}>Open Issues</div></div>
        </div>
      </Crd>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {tabs.map(tab => <button key={tab.k} onClick={() => setSiteTab(tab.k)} style={{ padding: "7px 14px", borderRadius: 8, border: siteTab === tab.k ? "1px solid " + GO : "1px solid transparent", background: siteTab === tab.k ? t.goldBg : "transparent", color: siteTab === tab.k ? t.goldText : t.textMut, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{tab.l}</button>)}
      </div>

      {/* GENERAL INFO TAB */}
      {siteTab === "general" && <div>
        <Crd t={t} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Contract Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><div style={{ fontSize: 10, color: t.textMut }}>Contract Type</div><div style={{ fontSize: 13, color: t.text, fontWeight: 500, marginTop: 2, textTransform: "capitalize" }}>{s.contract_type || "N/A"}</div></div>
            <div><div style={{ fontSize: 10, color: t.textMut }}>Prime Contractor</div><div style={{ fontSize: 13, color: t.text, fontWeight: 500, marginTop: 2 }}>{s.prime_contractor || "N/A"}</div></div>
            <div><div style={{ fontSize: 10, color: t.textMut }}>Client</div><div style={{ fontSize: 13, color: t.text, fontWeight: 500, marginTop: 2 }}>{s.client_name || "N/A"}</div></div>
            <div><div style={{ fontSize: 10, color: t.textMut }}>Monthly Value</div><div style={{ fontSize: 13, color: t.text, fontWeight: 500, marginTop: 2 }}>{s.contract_value_monthly ? "$" + parseFloat(s.contract_value_monthly).toLocaleString() : "N/A"}</div></div>
            <div><div style={{ fontSize: 10, color: t.textMut }}>Billing</div><div style={{ fontSize: 13, color: t.text, fontWeight: 500, marginTop: 2, textTransform: "capitalize" }}>{s.billing_frequency || "monthly"}</div></div>
            <div><div style={{ fontSize: 10, color: t.textMut }}>Contract Dates</div><div style={{ fontSize: 13, color: t.text, fontWeight: 500, marginTop: 2 }}>{s.contract_start_date ? fd(s.contract_start_date) : "N/A"} {s.contract_end_date ? " to " + fd(s.contract_end_date) : ""}</div></div>
          </div>
          {isAdmin && <button onClick={() => setEditSite({
            clientName: s.client_name || "", contractType: s.contract_type || "", primeContractor: s.prime_contractor || "",
            contractValueMonthly: s.contract_value_monthly || "", billingFrequency: s.billing_frequency || "monthly",
            contractStartDate: s.contract_start_date ? (typeof s.contract_start_date === "object" ? s.contract_start_date.toISOString().split("T")[0] : String(s.contract_start_date).split("T")[0]) : "",
            contractEndDate: s.contract_end_date ? (typeof s.contract_end_date === "object" ? s.contract_end_date.toISOString().split("T")[0] : String(s.contract_end_date).split("T")[0]) : "",
            clientContactName: s.client_contact_name || "", clientContactEmail: s.client_contact_email || "", clientContactPhone: s.client_contact_phone || "",
            siteNotes: s.site_notes || "",
            addressLine1: s.address_line1 || "", addressLine2: s.address_line2 || "", city: s.city || "", state: s.state || "", zipCode: s.zip_code || "",
            name: s.name || ""
          })} style={{ marginTop: 12, padding: "6px 14px", borderRadius: 6, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 11, cursor: "pointer" }}>Edit Details</button>}
        </Crd>

        <Crd t={t} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Client Contact</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><div style={{ fontSize: 10, color: t.textMut }}>Name</div><div style={{ fontSize: 13, color: t.text, fontWeight: 500, marginTop: 2 }}>{s.client_contact_name || "N/A"}</div></div>
            <div><div style={{ fontSize: 10, color: t.textMut }}>Email</div><div style={{ fontSize: 13, color: t.text, fontWeight: 500, marginTop: 2 }}>{s.client_contact_email || "N/A"}</div></div>
            <div><div style={{ fontSize: 10, color: t.textMut }}>Phone</div><div style={{ fontSize: 13, color: t.text, fontWeight: 500, marginTop: 2 }}>{s.client_contact_phone || "N/A"}</div></div>
          </div>
        </Crd>

        <Crd t={t} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Assigned Staff ({sp.staff.length})</div>
          {sp.staff.map((st2, i) => <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: t.hover, borderRadius: 8, marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {st2.profile_photo_url ? <img src={st2.profile_photo_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} /> : <Ini name={st2.first_name + " " + st2.last_name} sz={32} />}
              <div><div style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{st2.first_name} {st2.last_name}</div><div style={{ fontSize: 10, color: t.textMut }}>{st2.role_at_site || (lkMap("staff_roles")[st2.role] || RL[st2.role])}</div></div>
            </div>
            {st2.shift_name && <div style={{ fontSize: 10, color: t.textSec }}>{st2.shift_name}{st2.shift_start ? " " + st2.shift_start + " - " + st2.shift_end : ""}</div>}
          </div>)}
          {sp.staff.length === 0 && <div style={{ fontSize: 12, color: t.textMut }}>No staff assigned</div>}
        </Crd>

        {sp.zones.length > 0 && <Crd t={t} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Zones</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{sp.zones.map(z => <span key={z} style={{ padding: "4px 10px", borderRadius: 6, background: t.cardAlt, border: "1px solid " + t.border, fontSize: 11, color: t.textSec }}>{z}</span>)}</div>
        </Crd>}

        <Crd t={t} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text }}>Floor Plans ({sp.floorPlans.length})</div>
          </div>
          {sp.floorPlans.map(fp => <div key={fp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: t.hover, borderRadius: 8, marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Ic d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" sz={16} c={BL} />
              <div><div style={{ fontSize: 12, color: t.text }}>{fp.label}</div><div style={{ fontSize: 10, color: t.textMut }}>{fd(fp.uploaded_at)}</div></div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <a href={fp.file_url} target="_blank" rel="noopener noreferrer" style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + BL, color: BL, fontSize: 10, textDecoration: "none" }}>View</a>
              {isAdmin && <button onClick={() => deleteFloorPlan(fp.id)} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 10, cursor: "pointer" }}>Remove</button>}
            </div>
          </div>)}
          {isAdmin && <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Inp t={t} value={floorPlanLabel} onChange={e => setFloorPlanLabel(e.target.value)} placeholder="Label" style={{ width: 160, fontSize: 11 }} />
            <input type="file" accept="image/*,.pdf" onChange={e => { if (e.target.files?.[0]) uploadFloorPlan(e.target.files[0]); }} style={{ fontSize: 11, color: t.textSec }} />
          </div>}
        </Crd>

        {s.site_notes && <Crd t={t} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 8 }}>Notes</div>
          <div style={{ fontSize: 12, color: t.textSec, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{s.site_notes}</div>
        </Crd>}
      </div>}

      {/* SERVICE DETAILS TAB (Tasks) */}
      {siteTab === "tasks" && <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text }}>Tasks ({st.length})</div>
          <button onClick={() => setAddTask({ siteId: selectedSite, label: "", zone: "", cims: "SD", pri: "standard", assign: "", desc: "", mediaUrl: "", mediaType: "", dueDate: "", dueTime: "", building: "", floor: "", taskType: "standard" })} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 11, fontWeight: 600, cursor: "pointer" }}><PlI sz={12} c={t.goldText} /> Add Task</button>
        </div>
        {st.map((tk, i) => <Crd key={i} t={t} style={{ marginBottom: 6, padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setEditTask({ id: tk.id, siteId: selectedSite, label: tk.label, zone: tk.zone, pri: tk.priority, cims: tk.cims_category, desc: tk.description || "", mediaUrl: tk.media_url || "", mediaType: tk.media_type || "", dueDate: tk.due_date || "", dueTime: tk.due_time || "", building: tk.building_name || "", floor: tk.floor_number || "", taskType: tk.task_type || "standard" })}>
              <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: t.text, fontWeight: 500 }}>{tk.label}{tk.has_details && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: BL }} title="Has details" />}{tk.task_type === "assigned" && <Bdg l="assigned" c={BL} />}</div>
              <div style={{ fontSize: 10, color: t.textMut, marginTop: 3 }}>{tk.building_name ? tk.building_name + " | " : ""}{tk.floor_number ? "Fl " + tk.floor_number + " | " : ""}{tk.zone} | {cimsLabels[tk.cims_category] || CIMS_LABELS[tk.cims_category] || tk.cims_category} | {tk.priority}{tk.due_date ? " | Due: " + fd(tk.due_date) : ""}{tk.assigned_to?.length > 0 ? " | " + tk.assigned_to.map(a => a.name).join(", ") : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
              <button onClick={() => setEditTask({ id: tk.id, siteId: selectedSite, label: tk.label, zone: tk.zone, pri: tk.priority, cims: tk.cims_category, desc: tk.description || "", mediaUrl: tk.media_url || "", mediaType: tk.media_type || "", dueDate: tk.due_date || "", dueTime: tk.due_time || "", building: tk.building_name || "", floor: tk.floor_number || "", taskType: tk.task_type || "standard" })} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 9, cursor: "pointer" }}>Edit</button>
              <button onClick={() => delTask(selectedSite, tk.id)} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 9, cursor: "pointer" }}>Remove</button>
            </div>
          </div>
        </Crd>)}
        {st.length === 0 && <div style={{ fontSize: 12, color: t.textMut, textAlign: "center", padding: 20 }}>No tasks configured for this site</div>}
      </div>}

      {/* SHIFTS & SCHEDULE TAB */}
      {siteTab === "shifts" && <div>
        <Crd t={t} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Marketplace Coverage (Last 30 Days)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ textAlign: "center", padding: 10, background: t.hover, borderRadius: 8 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: t.goldText }}>{sp.marketplaceSummary?.total_pickups || 0}</div><div style={{ fontSize: 10, color: t.textMut }}>Total Pickups</div></div>
            <div style={{ textAlign: "center", padding: 10, background: t.hover, borderRadius: 8 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: GR }}>{sp.marketplaceSummary?.worked || 0}</div><div style={{ fontSize: 10, color: t.textMut }}>Worked</div></div>
            <div style={{ textAlign: "center", padding: 10, background: t.hover, borderRadius: 8 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: OR }}>{sp.marketplaceSummary?.pending || 0}</div><div style={{ fontSize: 10, color: t.textMut }}>Pending</div></div>
          </div>
        </Crd>

        <Crd t={t} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Inspections (Last 30 Days)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ textAlign: "center", padding: 10, background: t.hover, borderRadius: 8 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: TL }}>{sp.inspectionSummary?.total || 0}</div><div style={{ fontSize: 10, color: t.textMut }}>Inspections</div></div>
            <div style={{ textAlign: "center", padding: 10, background: t.hover, borderRadius: 8 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: TL }}>{sp.inspectionSummary?.avg_score || "N/A"}</div><div style={{ fontSize: 10, color: t.textMut }}>Avg Score</div></div>
            <div style={{ textAlign: "center", padding: 10, background: t.hover, borderRadius: 8 }}><div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{sp.inspectionSummary?.last_inspection ? fd(sp.inspectionSummary.last_inspection) : "None"}</div><div style={{ fontSize: 10, color: t.textMut }}>Last Inspection</div></div>
          </div>
        </Crd>

        <Crd t={t} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Upcoming Shifts (Next 7 Days)</div>
          {sp.upcomingShifts.length > 0 ? sp.upcomingShifts.map((sh, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: t.hover, borderRadius: 6, marginBottom: 3 }}>
            <div><div style={{ fontSize: 12, color: t.text }}>{sh.first_name} {sh.last_name}</div><div style={{ fontSize: 10, color: t.textMut }}>{sh.scheduled_date ? fd(sh.scheduled_date) : ""}</div></div>
            <div style={{ fontSize: 11, color: t.textSec }}>{sh.start_time || ""} {sh.end_time ? " - " + sh.end_time : ""}</div>
          </div>) : <div style={{ fontSize: 12, color: t.textMut }}>No upcoming shifts</div>}
        </Crd>
      </div>}

      {/* SUPPLIES TAB */}
      {siteTab === "supplies" && <div>
        <Crd t={t} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text }}>Supplies at This Site ({sp.supplies.length})</div>
            {isAdmin && <button onClick={openAddSupply} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 11, fontWeight: 600, cursor: "pointer" }}><PlI sz={12} c={t.goldText} /> Add Supply</button>}
          </div>
          {sp.supplies.map((sup, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: t.hover, borderRadius: 8, marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 12, color: t.text, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>{sup.name}{sup.is_green_certified && <Bdg l="Green" c={GR} />}</div>
              <div style={{ fontSize: 10, color: t.textMut, marginTop: 2 }}>{sup.category} | {sup.unit}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: sup.current_stock <= sup.low_threshold ? RD : t.text }}>{sup.current_stock}</div>
                <div style={{ fontSize: 9, color: t.textMut }}>Min: {sup.low_threshold}</div>
              </div>
              {isAdmin && <button onClick={() => removeSupplyFromSite(sup.id)} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 9, cursor: "pointer" }}>Remove</button>}
            </div>
          </div>)}
          {sp.supplies.length === 0 && <div style={{ fontSize: 12, color: t.textMut }}>No supplies assigned to this site</div>}
        </Crd>

        {showAddSupply && <Mdl t={t} onClose={() => setShowAddSupply(false)}><div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Add Supply to Site</div><button onClick={() => setShowAddSupply(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
          {addSupplyLoading && <div style={{ fontSize: 12, color: t.textMut, textAlign: "center", padding: 20 }}>Loading...</div>}
          {!addSupplyLoading && availableSupplies.length === 0 && <div style={{ fontSize: 12, color: t.textMut, textAlign: "center", padding: 20 }}>All supplies are already assigned to this site</div>}
          {availableSupplies.map((sup, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: t.hover, borderRadius: 8, marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 13, color: t.text, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>{sup.name}{sup.is_green_certified && <Bdg l="Green" c={GR} />}</div>
              <div style={{ fontSize: 10, color: t.textMut, marginTop: 2 }}>{sup.category} | {sup.unit} | Stock: {sup.current_stock}</div>
            </div>
            <button onClick={() => assignSupplyToSite(sup.id)} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: GO, color: NAVY, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Add</button>
          </div>)}
        </div></Mdl>}
      </div>}

      {/* CHAT TAB */}
      {siteTab === "chat" && <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text }}>Site Channel Messages {siteChatChannel ? "(" + siteChatChannel.name + ")" : ""}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={printSiteChat} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}>Print</button>
          </div>
        </div>
        {siteChatLoading && siteChat.length === 0 && <div style={{ fontSize: 12, color: t.textMut, textAlign: "center", padding: 20 }}>Loading...</div>}
        {!siteChatLoading && siteChat.length === 0 && <div style={{ fontSize: 12, color: t.textMut, textAlign: "center", padding: 20 }}>No messages in this site channel</div>}
        <div style={{ fontSize: 11, color: t.textMut, marginBottom: 10 }}>{siteChatTotal} messages</div>
        {[...siteChat].reverse().map(m => {
          const dt = new Date(m.sentAt);
          return <div key={m.id} style={{ display: "flex", gap: 10, marginBottom: 8, padding: "10px 12px", background: t.hover, borderRadius: 8 }}>
            {m.profilePhotoUrl ? <img src={m.profilePhotoUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : <Ini name={m.senderName || "?"} sz={32} />}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{m.senderName || "Unknown"}</div>
                <div style={{ fontSize: 9, color: t.textMut }}>{dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}</div>
              </div>
              <div style={{ fontSize: 12, color: t.textSec, marginTop: 3, lineHeight: 1.5 }}>{m.text}</div>
            </div>
          </div>;
        })}
      </div>}

      {/* SCOPE OF WORK TAB */}
      {siteTab === "scope" && <div>
        <Crd t={t} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Scope of Work</div>
          {s.scope_of_work ? <div style={{ fontSize: 12, color: t.textSec, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{s.scope_of_work}</div> : <div style={{ fontSize: 12, color: t.textMut, fontStyle: "italic" }}>No scope of work documented yet.</div>}
          {isAdmin && <div style={{ marginTop: 12 }}>
            <TArea t={t} rows={10} defaultValue={s.scope_of_work || ""} id="scopeEdit" placeholder="Document the scope of work for this site..." />
            <Btn t={t} style={{ marginTop: 8 }} onClick={() => { const v = document.getElementById("scopeEdit").value; saveSiteField({ scopeOfWork: v }); }}>Save Scope</Btn>
          </div>}
        </Crd>
      </div>}

      {/* TIMELINE TAB */}
      {siteTab === "timeline" && <div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
          {tlCats.map(c => <button key={c.k} onClick={() => { setTlCat(c.k); setTlOffset(0); }} style={{ padding: "4px 10px", borderRadius: 20, border: tlCat === c.k ? "1px solid " + GO : "1px solid " + t.border, background: tlCat === c.k ? t.goldBg : "transparent", color: tlCat === c.k ? t.goldText : t.textMut, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{c.l}</button>)}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <Inp t={t} type="date" value={tlDateRange.start} onChange={e => setTlDateRange(prev => ({ ...prev, start: e.target.value }))} style={{ width: 140, fontSize: 11 }} />
          <Inp t={t} type="date" value={tlDateRange.end} onChange={e => setTlDateRange(prev => ({ ...prev, end: e.target.value }))} style={{ width: 140, fontSize: 11 }} />
          {(tlDateRange.start || tlDateRange.end) && <button onClick={() => setTlDateRange({ start: "", end: "" })} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid " + t.border, background: "transparent", color: t.textMut, fontSize: 10, cursor: "pointer" }}>Clear</button>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: t.textMut }}>{tlTotal} entries</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={exportTimelineCsv} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}>Export CSV</button>
            <button onClick={printSiteTimeline} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}>Print</button>
          </div>
        </div>
        {tlLoading && timeline.length === 0 && <div style={{ fontSize: 12, color: t.textMut, textAlign: "center", padding: 20 }}>Loading...</div>}
        {(() => {
          const grouped = {};
          timeline.forEach(e => {
            const day = new Date(e.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
            if (!grouped[day]) grouped[day] = [];
            grouped[day].push(e);
          });
          return Object.entries(grouped).map(([day, entries]) => <div key={day} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textMut, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{day}</div>
            {entries.map(e => {
              const cat = getTlCategory(e.actionType);
              const dotColor = tlColorMap[cat] || t.textMut;
              return <div key={e.id} onClick={() => openTimelineDetail(e)} style={{ display: "flex", gap: 10, marginBottom: 4, paddingLeft: 8, borderLeft: "2px solid " + t.border, cursor: "pointer" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: t.text }}>{e.description}</div>
                  <div style={{ fontSize: 10, color: t.textMut, marginTop: 1 }}>{new Date(e.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} | {e.actorName}</div>
                </div>
              </div>;
            })}
          </div>);
        })()}
        {timeline.length < tlTotal && <button onClick={loadMoreTl} style={{ display: "block", margin: "10px auto", padding: "8px 20px", borderRadius: 8, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{tlLoading ? "Loading..." : "Load More"}</button>}
        {!tlLoading && timeline.length === 0 && <div style={{ fontSize: 12, color: t.textMut, textAlign: "center", padding: 20 }}>No activity recorded for this site</div>}
      </div>}

      {/* TIMELINE DETAIL MODAL */}
      {tlDetail && <Mdl t={t} onClose={() => setTlDetail(null)}><div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Record Detail</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={printSiteTimelineDetail} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}>Print</button>
            <button onClick={() => setTlDetail(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button>
          </div>
        </div>
        <div style={{ marginBottom: 12, padding: "10px 12px", background: t.hover, borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{tlDetail.entry?.description || "N/A"}</div>
          <div style={{ fontSize: 10, color: t.textMut, marginTop: 4 }}>{tlDetail.entry ? new Date(tlDetail.entry.createdAt).toLocaleString() : ""} | {tlDetail.entry?.actorName || "System"}</div>
          <div style={{ marginTop: 4 }}><Bdg l={tlDetail.entry?.actionType?.replace(/_/g, " ") || ""} c={GO} /></div>
        </div>
        {tlDetail.record && <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Record Fields</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(tlDetail.record).filter(([k, v]) => v !== null && v !== undefined && v !== "" && k !== "id" && !k.endsWith("_hash")).map(([k, v]) => {
              const isImgUrl = typeof v === "string" && (v.includes("supabase") || v.includes("storage")) && (v.includes(".jpg") || v.includes(".jpeg") || v.includes(".png") || v.includes(".webp") || v.includes("profile-photos") || v.includes("issue-photos") || v.includes("task-media"));
              if (isImgUrl) return <div key={k} style={{ gridColumn: "span 2" }}><div style={{ fontSize: 9, color: t.textMut, textTransform: "uppercase" }}>{k.replace(/_/g, " ")}</div><img src={v} alt="" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginTop: 4 }} /></div>;
              let val = typeof v === "object" ? JSON.stringify(v) : String(v);
              if (val.length > 200) val = val.substring(0, 200) + "...";
              return <div key={k}><div style={{ fontSize: 9, color: t.textMut, textTransform: "uppercase" }}>{k.replace(/_/g, " ")}</div><div style={{ fontSize: 12, color: t.text, marginTop: 2 }}>{val}</div></div>;
            })}
          </div>
        </div>}
        {tlDetail.photos && tlDetail.photos.length > 0 && <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Photos ({tlDetail.photos.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{tlDetail.photos.map((p, i) => <img key={i} src={p.photo_url || p.file_url || ""} alt="" style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8, objectFit: "cover" }} />)}</div>
        </div>}
        {tlDetail.relatedItems && tlDetail.relatedItems.length > 0 && <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Related Items ({tlDetail.relatedItems.length})</div>
          {tlDetail.relatedItems.map((item, i) => <div key={i} style={{ padding: "6px 10px", background: t.hover, borderRadius: 6, marginBottom: 3, fontSize: 11, color: t.textSec }}>{Object.entries(item).filter(([k]) => k !== "id" && k !== "items" && !k.endsWith("_id")).slice(0, 4).map(([k, v]) => k.replace(/_/g, " ") + ": " + (v !== null ? String(v).substring(0, 60) : "")).join(" | ")}</div>)}
        </div>}
        {!tlDetail.found && !tlDetailLoading && <div style={{ fontSize: 12, color: t.textMut, fontStyle: "italic" }}>Source record not found. The original data may have been deleted.</div>}
      </div></Mdl>}

      {/* EDIT SITE MODAL */}
      {editSite && <Mdl t={t} onClose={() => setEditSite(null)}><div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Edit Site Details</div><button onClick={() => setEditSite(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
        <div style={{ marginBottom: 12 }}><Lbl>Site Name</Lbl><Inp t={t} value={editSite.name} onChange={e => setEditSite({ ...editSite, name: e.target.value })} /></div>
        <div style={{ marginBottom: 12 }}><Lbl>Address</Lbl><Inp t={t} value={editSite.addressLine1} onChange={e => setEditSite({ ...editSite, addressLine1: e.target.value })} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>City</Lbl><Inp t={t} value={editSite.city} onChange={e => setEditSite({ ...editSite, city: e.target.value })} /></div><div><Lbl>State</Lbl><Inp t={t} value={editSite.state} onChange={e => setEditSite({ ...editSite, state: e.target.value })} /></div><div><Lbl>Zip</Lbl><Inp t={t} value={editSite.zipCode} onChange={e => setEditSite({ ...editSite, zipCode: e.target.value })} /></div></div>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.goldText, marginBottom: 8, marginTop: 4 }}>Contract</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Contract Type</Lbl><Sel t={t} value={editSite.contractType} onChange={e => setEditSite({ ...editSite, contractType: e.target.value })} options={getOpts("contract_types")} /></div><div><Lbl>Prime Contractor</Lbl><Inp t={t} value={editSite.primeContractor} onChange={e => setEditSite({ ...editSite, primeContractor: e.target.value })} /></div></div>
        <div style={{ marginBottom: 12 }}><Lbl>Client Name</Lbl><Inp t={t} value={editSite.clientName} onChange={e => setEditSite({ ...editSite, clientName: e.target.value })} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Monthly Value ($)</Lbl><Inp t={t} type="number" value={editSite.contractValueMonthly} onChange={e => setEditSite({ ...editSite, contractValueMonthly: e.target.value })} /></div><div><Lbl>Billing</Lbl><Sel t={t} value={editSite.billingFrequency} onChange={e => setEditSite({ ...editSite, billingFrequency: e.target.value })} options={[{ v: "monthly", l: "Monthly" }, { v: "weekly", l: "Weekly" }, { v: "biweekly", l: "Bi-Weekly" }, { v: "quarterly", l: "Quarterly" }, { v: "annual", l: "Annual" }]} /></div><div><Lbl>Start Date</Lbl><Inp t={t} type="date" value={editSite.contractStartDate} onChange={e => setEditSite({ ...editSite, contractStartDate: e.target.value })} /></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 12 }}><div><Lbl>End Date</Lbl><Inp t={t} type="date" value={editSite.contractEndDate} onChange={e => setEditSite({ ...editSite, contractEndDate: e.target.value })} /></div></div>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.goldText, marginBottom: 8, marginTop: 4 }}>Client Contact</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Contact Name</Lbl><Inp t={t} value={editSite.clientContactName} onChange={e => setEditSite({ ...editSite, clientContactName: e.target.value })} /></div><div><Lbl>Email</Lbl><Inp t={t} value={editSite.clientContactEmail} onChange={e => setEditSite({ ...editSite, clientContactEmail: e.target.value })} /></div><div><Lbl>Phone</Lbl><Inp t={t} value={editSite.clientContactPhone} onChange={e => setEditSite({ ...editSite, clientContactPhone: e.target.value })} /></div></div>
        <div style={{ marginBottom: 16 }}><Lbl>Site Notes</Lbl><TArea t={t} value={editSite.siteNotes} onChange={e => setEditSite({ ...editSite, siteNotes: e.target.value })} rows={3} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setEditSite(null)}>Cancel</Btn><Btn t={t} onClick={async () => {
          try {
            await af("/api/sites/" + selectedSite, { method: "PATCH", body: editSite });
            showToast("Site updated"); setEditSite(null); refreshProfile(); load();
          } catch (e) { showToast(e.message, "error"); }
        }}>Save</Btn></div>
      </div></Mdl>}

      {/* ADD TASK MODAL */}
      {addTask && <Mdl t={t} onClose={() => setAddTask(null)}><div style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Add Task</div><button onClick={() => setAddTask(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
        <div style={{ marginBottom: 12 }}><Lbl>Description *</Lbl><Inp t={t} value={addTask.label} onChange={e => setAddTask({ ...addTask, label: e.target.value })} placeholder="e.g. Vacuum carpets" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Building</Lbl><Inp t={t} value={addTask.building} onChange={e => setAddTask({ ...addTask, building: e.target.value })} placeholder="e.g. Main" /></div><div><Lbl>Floor</Lbl><Inp t={t} value={addTask.floor} onChange={e => setAddTask({ ...addTask, floor: e.target.value })} placeholder="e.g. 1, 2, B" /></div><div><Lbl>Zone *</Lbl><Inp t={t} value={addTask.zone} onChange={e => setAddTask({ ...addTask, zone: e.target.value })} placeholder="e.g. Restrooms" /></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Service Category</Lbl><Sel t={t} value={addTask.cims} onChange={e => setAddTask({ ...addTask, cims: e.target.value })} options={getOpts("cims_categories")} /></div><div><Lbl>Priority</Lbl><Sel t={t} value={addTask.pri} onChange={e => setAddTask({ ...addTask, pri: e.target.value })} options={getOpts("task_priorities")} /></div><div><Lbl>Task Type</Lbl><Sel t={t} value={addTask.taskType} onChange={e => setAddTask({ ...addTask, taskType: e.target.value })} options={[{ v: "standard", l: "Daily Checklist" }, { v: "assigned", l: "One-Off Assigned" }]} /></div></div>
        <div style={{ marginBottom: 12 }}><Lbl>Detailed Instructions (optional)</Lbl><TArea t={t} value={addTask.desc || ""} onChange={e => setAddTask({ ...addTask, desc: e.target.value })} placeholder="Step-by-step instructions, tips, or notes for the cleaner..." rows={3} /></div>
        <div style={{ marginBottom: 12 }}><Lbl>Photo/Video (optional)</Lbl>
          <div style={{ display: "flex", gap: 8 }}><Inp t={t} value={addTask.mediaUrl || ""} onChange={e => setAddTask({ ...addTask, mediaUrl: e.target.value, mediaType: e.target.value ? (e.target.value.match(/\.(mp4|mov|webm|avi)/i) ? "video" : "image") : "" })} placeholder="Paste a URL or upload below" style={{ flex: 1 }} /></div>
          <div style={{ marginTop: 6 }}><input type="file" accept="image/*,video/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 50 * 1024 * 1024) { showToast("File must be under 50MB", "error"); return; } try { showToast("Uploading..."); const r = await uf(f, "task-media"); setAddTask(prev => ({ ...prev, mediaUrl: r.url, mediaType: r.type })); showToast("Uploaded"); } catch (err) { showToast("Upload failed", "error"); } }} style={{ fontSize: 11, color: t.textSec }} /><div style={{ fontSize: 9, color: t.textMut, marginTop: 3 }}>Upload a photo or video (up to 50MB), or paste a YouTube link above</div></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Due Date</Lbl><Inp t={t} type="date" value={addTask.dueDate || ""} onChange={e => setAddTask({ ...addTask, dueDate: e.target.value })} /></div><div><Lbl>Due Time</Lbl><Inp t={t} type="time" value={addTask.dueTime || ""} onChange={e => setAddTask({ ...addTask, dueTime: e.target.value })} /></div></div>
        <div style={{ marginBottom: 16 }}><Lbl>Assign To</Lbl><Sel t={t} value={addTask.assign} onChange={e => setAddTask({ ...addTask, assign: e.target.value })} options={[{ v: "", l: "Select (optional)" }, ...staffList.map(s => ({ v: s.id, l: s.name }))]} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAddTask(null)}>Cancel</Btn><Btn t={t} onClick={submitTask}>Create</Btn></div></div></Mdl>}

      {/* EDIT TASK MODAL */}
      {editTask && <Mdl t={t} onClose={() => setEditTask(null)}><div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Edit Task</div><button onClick={() => setEditTask(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
        <div style={{ marginBottom: 12 }}><Lbl>Task Name</Lbl><Inp t={t} value={editTask.label} onChange={e => setEditTask({ ...editTask, label: e.target.value })} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Building</Lbl><Inp t={t} value={editTask.building} onChange={e => setEditTask({ ...editTask, building: e.target.value })} placeholder="e.g. Main" /></div><div><Lbl>Floor</Lbl><Inp t={t} value={editTask.floor} onChange={e => setEditTask({ ...editTask, floor: e.target.value })} placeholder="e.g. 1, 2, B" /></div><div><Lbl>Zone</Lbl><Inp t={t} value={editTask.zone} onChange={e => setEditTask({ ...editTask, zone: e.target.value })} /></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Service Category</Lbl><Sel t={t} value={editTask.cims} onChange={e => setEditTask({ ...editTask, cims: e.target.value })} options={getOpts("cims_categories")} /></div><div><Lbl>Priority</Lbl><Sel t={t} value={editTask.pri} onChange={e => setEditTask({ ...editTask, pri: e.target.value })} options={getOpts("task_priorities")} /></div><div><Lbl>Task Type</Lbl><Sel t={t} value={editTask.taskType} onChange={e => setEditTask({ ...editTask, taskType: e.target.value })} options={[{ v: "standard", l: "Daily Checklist" }, { v: "assigned", l: "One-Off Assigned" }]} /></div></div>
        <div style={{ marginBottom: 12 }}><Lbl>Detailed Instructions</Lbl><TArea t={t} value={editTask.desc} onChange={e => setEditTask({ ...editTask, desc: e.target.value })} placeholder="Step-by-step instructions, tips, or notes..." rows={4} /></div>
        <div style={{ marginBottom: 12 }}><Lbl>Photo/Video</Lbl>
          <div style={{ display: "flex", gap: 8 }}><Inp t={t} value={editTask.mediaUrl} onChange={e => setEditTask({ ...editTask, mediaUrl: e.target.value, mediaType: e.target.value ? (e.target.value.match(/\.(mp4|mov|webm|avi)/i) ? "video" : "image") : "" })} placeholder="Paste a URL or upload below" style={{ flex: 1 }} /></div>
          <div style={{ marginTop: 6 }}><input type="file" accept="image/*,video/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 50 * 1024 * 1024) { showToast("File must be under 50MB", "error"); return; } try { showToast("Uploading..."); const r = await uf(f, "task-media"); setEditTask(prev => ({ ...prev, mediaUrl: r.url, mediaType: r.type })); showToast("Uploaded"); } catch (err) { showToast("Upload failed", "error"); } }} style={{ fontSize: 11, color: t.textSec }} /><div style={{ fontSize: 9, color: t.textMut, marginTop: 3 }}>Upload a photo or video (up to 50MB), or paste a YouTube link above</div></div>
        </div>
        {editTask.mediaUrl && (editTask.mediaType === "video" ? <div style={{ marginBottom: 12 }}><video src={editTask.mediaUrl} controls style={{ width: "100%", borderRadius: 8, maxHeight: 200 }} /></div> : editTask.mediaUrl.includes("youtube") || editTask.mediaUrl.includes("youtu.be") ? <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: BL }}>YouTube link attached</div></div> : <div style={{ marginBottom: 12 }}><img src={editTask.mediaUrl} alt="Task reference" style={{ width: "100%", borderRadius: 8, maxHeight: 200, objectFit: "cover" }} /></div>)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}><div><Lbl>Due Date</Lbl><Inp t={t} type="date" value={editTask.dueDate} onChange={e => setEditTask({ ...editTask, dueDate: e.target.value })} /></div><div><Lbl>Due Time</Lbl><Inp t={t} type="time" value={editTask.dueTime} onChange={e => setEditTask({ ...editTask, dueTime: e.target.value })} /></div></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setEditTask(null)}>Cancel</Btn><Btn t={t} onClick={submitEditTask}>Save Changes</Btn></div>
      </div></Mdl>}

      {/* DELETE SITE MODAL */}
      {deleteConfirm && <Mdl t={t} onClose={() => setDeleteConfirm(null)}><div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: RD, marginBottom: 12 }}>Permanently Delete Site</div>
        <div style={{ fontSize: 13, color: t.textSec, marginBottom: 8, lineHeight: 1.5 }}>This will permanently remove <span style={{ fontWeight: 600, color: t.text }}>{deleteConfirm.name}</span> and all associated tasks, assignments, and data. This action cannot be undone.</div>
        <div style={{ padding: "10px 12px", borderRadius: 8, background: t.redSubtle, border: "1px solid " + t.redBorder, fontSize: 12, color: RD, marginBottom: 14 }}>Type <span style={{ fontWeight: 600 }}>DELETE</span> to confirm.</div>
        <div style={{ marginBottom: 16 }}><Inp t={t} value={deleteText} onChange={e => setDeleteText(e.target.value)} placeholder="Type DELETE here" style={{ textTransform: "uppercase", textAlign: "center", fontSize: 16, letterSpacing: "4px", border: deleteText === "DELETE" ? "1px solid " + RD : "1px solid " + t.inputBorder }} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn t={t} v="ghost" onClick={() => { setDeleteConfirm(null); setDeleteText(""); }}>Cancel</Btn>
          <Btn t={t} v="danger" onClick={() => { if (deleteText === "DELETE") deleteSite(deleteConfirm.id); else showToast("Type DELETE to confirm", "error"); }}>Delete Permanently</Btn>
        </div>
      </div></Mdl>}
    </div>);
  }

  // ---- LIST VIEW ----
  return (<div>
    <SecT t={t} action={isAdmin ? "Add Site" : undefined} onAction={isAdmin ? () => setAddSite({ name: "", address: "", city: "Philadelphia", state: "PA", zip: "", client: "", contract: "subcontractor", prime: "" }) : undefined}>Sites</SecT>
    {isAdmin && <FilterTabs t={t} value={statusF} onChange={f => { setStatusF(f); setPage(1); }} tabs={[{ id: "all", label: "All", count: sites.length, color: t.goldText }, { id: "active", label: "Active", count: sites.length - inactiveCount, color: GR }, { id: "inactive", label: "Inactive", count: inactiveCount, color: OR }]} />}
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 200, position: "relative" }}><Ic d="M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" sz={16} c={t.textMut} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search site, address, contract" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 36px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13 }} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: t.textMut }}>Show</span><select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} style={{ padding: "9px 10px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>{[10, 25, 50, 100].map(nn => <option key={nn} value={nn}>{nn}</option>)}</select></div>
    </div>
    {(() => {
      const base = isAdmin ? (statusF === "all" ? visibleSites : statusF === "inactive" ? visibleSites.filter(s => s.status !== "active") : visibleSites.filter(s => s.status === "active")) : visibleSites;
      const searched = base.filter(s => {
        if (!q.trim()) return true;
        const hay = (s.name + " " + (s.address_line1 || "") + " " + (s.contract_type || "")).toLowerCase();
        return hay.includes(q.trim().toLowerCase());
      });
      const totalPages = Math.max(1, Math.ceil(searched.length / perPage));
      const cur = Math.min(page, totalPages);
      const items = searched.slice((cur - 1) * perPage, cur * perPage);
      const columns = [
        { header: "Site", render: s => <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 38, height: 38, borderRadius: 8, background: t.goldBg, border: "1px solid " + t.goldBorder, display: "grid", placeItems: "center", flexShrink: 0 }}><MpI sz={18} c={t.goldText} /></div><div style={{ minWidth: 0 }}><div style={{ fontFamily: FONT_HEAD, fontWeight: 600, color: t.text }}>{s.name}</div>{s.address_line1 && <div style={{ fontSize: 11, color: t.textMut, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{s.address_line1}</div>}</div></div> },
        { header: "Staff", tdStyle: { color: t.textSec, whiteSpace: "nowrap" }, render: s => s.staff_count != null ? s.staff_count + " staff" : "-" },
        { header: "Tasks", tdStyle: { color: t.textSec, whiteSpace: "nowrap" }, render: s => s.task_count != null ? s.task_count + " tasks" : "-" },
        { header: "Contract", tdStyle: { color: t.textSec, whiteSpace: "nowrap", textTransform: "capitalize" }, render: s => s.contract_type || "-" },
        { header: "Status", render: s => <Bdg l={s.status} c={s.status === "active" ? GR : OR} /> },
        { header: "Actions", align: "right", render: s => <button title="View site" onClick={e => { e.stopPropagation(); openProfile(s.id); }} style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid " + t.goldBorder, background: t.goldBg, cursor: "pointer" }}><Ic d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" sz={15} c={t.goldText} /></button> }
      ];
      return <DataTable t={t} columns={columns} rows={items} rowKey={s => s.id} onRowClick={s => openProfile(s.id)} empty="No sites found." footer={<Pagination t={t} page={cur} perPage={perPage} total={searched.length} onPage={setPage} />} />;
    })()}

    {addSite && <Mdl t={t} onClose={() => setAddSite(null)}><div style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Add Site</div><button onClick={() => setAddSite(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      <div style={{ marginBottom: 12 }}><Lbl>Name *</Lbl><Inp t={t} value={addSite.name} onChange={e => setAddSite({ ...addSite, name: e.target.value })} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Address *</Lbl><Inp t={t} value={addSite.address} onChange={e => setAddSite({ ...addSite, address: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>City</Lbl><Inp t={t} value={addSite.city} onChange={e => setAddSite({ ...addSite, city: e.target.value })} /></div><div><Lbl>State</Lbl><Inp t={t} value={addSite.state} onChange={e => setAddSite({ ...addSite, state: e.target.value })} /></div><div><Lbl>Zip</Lbl><Inp t={t} value={addSite.zip} onChange={e => setAddSite({ ...addSite, zip: e.target.value })} /></div></div>
      <div style={{ marginBottom: 12 }}><Lbl>Client</Lbl><Inp t={t} value={addSite.client} onChange={e => setAddSite({ ...addSite, client: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}><div><Lbl>Contract Type</Lbl><Sel t={t} value={addSite.contract} onChange={e => setAddSite({ ...addSite, contract: e.target.value })} options={getOpts("contract_types")} /></div><div><Lbl>Prime Contractor</Lbl><Inp t={t} value={addSite.prime} onChange={e => setAddSite({ ...addSite, prime: e.target.value })} /></div></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAddSite(null)}>Cancel</Btn><Btn t={t} onClick={submitSite}>Create</Btn></div></div></Mdl>}
  </div>);
}



function OpsPage({ af, t, allStaff }) {
  const [date, setDate] = useState(() => toISO(new Date()));
  const [board, setBoard] = useState({ date: "", sites: [] });
  const [showRest, setShowRest] = useState(false);
  const loadOps = () => { af("/api/shift-sessions/by-site?date=" + date).then(d => setBoard({ date: d.date, sites: d.sites || [] })).catch(e => console.warn("Load shift sessions:", e.message)); };
  useEffect(() => { loadOps(); const iv = setInterval(loadOps, 30000); return () => clearInterval(iv); }, [date]);
  const isToday = date === toISO(new Date());
  const dayLabel = isToday ? "today" : "on " + new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const startedIds = new Set(board.sites.flatMap(site => site.people.map(p => p.userId)));
  const rest = allStaff.filter(u => !startedIds.has(u.id));
  return (<div><SecT t={t} action="Refresh" onAction={loadOps}>Started {dayLabel}</SecT>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Date</span>
      <div style={{ width: 170 }}><Inp t={t} type="date" value={date} onChange={e => { if (e.target.value) setDate(e.target.value); }} /></div>
      <span style={{ fontSize: 12, color: t.textSec }}>{startedIds.size} started {dayLabel}</span>
    </div>
    {board.sites.length === 0 && <Crd t={t} style={{ marginBottom: 20 }}><div style={{ fontSize: 13, color: t.textMut }}>{isToday ? "No shifts started yet today." : "No shifts started " + dayLabel + "."}</div></Crd>}
    {board.sites.map(site => <Crd key={site.siteId} t={t} style={{ marginBottom: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text }}>{site.siteName}</div><Bdg l={site.people.length + " started"} c={GR} /></div>
      {site.people.map(p => { const pct = p.tasksTotal > 0 ? Math.round(p.tasksCompleted / p.tasksTotal * 100) : 0; const place = [p.buildingName, p.floorNumber ? "Floor " + p.floorNumber : null].filter(Boolean).join(", "); return <div key={p.sessionId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid " + t.border }}>
        <Ini name={p.name} sz={36} color={GR} />
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.name}</div><div style={{ fontSize: 11, color: t.textSec }}>{RL[p.role] || p.role}{place ? ", " + place : ""}</div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: GR, fontWeight: 600 }}>Started {fmtSessionStart(p.startedAt)}</div><div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 }}><div style={{ width: 50, height: 4, borderRadius: 2, background: t.cardAlt, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, background: pct === 100 ? GR : GO, width: pct + "%" }} /></div><span style={{ fontSize: 10, color: t.textMut }}>{p.tasksCompleted} of {p.tasksTotal} tasks</span></div></div>
      </div>; })}
    </Crd>)}
    <button onClick={() => setShowRest(!showRest)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", marginTop: 20, marginBottom: 8, padding: "6px 0", background: "none", border: "none", cursor: "pointer", fontFamily: FONT_BODY }}>
      <span style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>No shift started {dayLabel} ({rest.length})</span>
      <span style={{ fontSize: 11, color: t.goldText, fontWeight: 600 }}>{showRest ? "Hide" : "Show"}</span>
    </button>
    {showRest && rest.map(u => <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4, background: t.hover, borderRadius: 8 }}><Ini name={u.name} sz={32} color={t.textMut} /><div style={{ flex: 1 }}><div style={{ fontSize: 13, color: t.textSec }}>{u.name}</div><div style={{ fontSize: 10, color: t.textMut }}>{RL[u.role] || u.role}</div></div></div>)}
  </div>);
}

function IssuesPage({ af, showToast, t, allStaff }) {
  const [issues, setIssues] = useState([]); const [filter, setFilter] = useState("all"); const [sel, setSel] = useState(null);
  const staffList = allStaff; const [assignTask, setAssignTask] = useState(null);
  const [activity, setActivity] = useState([]); const [allPhotos, setAllPhotos] = useState([]);
  const load = () => af("/api/issues").then(setIssues).catch(e => showToast(e.message, "error"));
  useEffect(() => { load(); }, []);
  const openIssue = async (iss) => { setSel(iss); try { const a = await af("/api/issues/" + iss.id + "/activity"); setActivity(a); } catch (e) { setActivity([]); } try { const p = await af("/api/issues/" + iss.id + "/photos"); setAllPhotos(p); } catch (e) { setAllPhotos([]); } };
  const filtered = filter === "all" ? issues : issues.filter(i => i.status === filter);
  const sC = { low: GR, medium: OR, high: RD }; const stC = { open: RD, in_progress: OR, resolved: GR, closed: t.textMut, escalated: "#9B59B6" };
  const upd = async (id, s) => { try { await af("/api/issues/" + id, { method: "PATCH", body: { status: s } }); showToast("Updated"); load(); setSel(null); } catch (e) { showToast(e.message, "error"); } };
  const submitAssignTask = async () => { if (!assignTask.userId) { showToast("Select a staff member", "error"); return; } try { const d = await af("/api/issues/" + assignTask.issueId + "/assign-as-task", { method: "POST", body: { userId: assignTask.userId, note: assignTask.note || undefined } }); showToast(d.message); setAssignTask(null); load(); } catch (e) { showToast(e.message, "error"); } };
  return (<div><SecT t={t}>Issue Tracker</SecT>
    <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>{["all", "open", "in_progress", "escalated", "resolved"].map(f => <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: 6, background: filter === f ? t.goldBg : "transparent", color: filter === f ? t.goldText : t.textMut, fontSize: 11, fontWeight: filter === f ? 700 : 500, cursor: "pointer", border: filter === f ? "1px solid " + t.goldBorder : "1px solid transparent" }}>{f.replace("_", " ")}</button>)}</div>
    {filtered.map(iss => <Crd key={iss.id} t={t} style={{ marginBottom: 8, padding: 14, borderLeft: "3px solid " + (sC[iss.severity] || t.textMut) }} onClick={() => openIssue(iss)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{iss.title}</div><div style={{ fontSize: 11, color: t.textSec, marginTop: 3 }}>{iss.site_name} | {iss.zone}</div></div><div style={{ display: "flex", gap: 6 }}><Bdg l={iss.severity} c={sC[iss.severity]} /><Bdg l={iss.status?.replace("_", " ")} c={stC[iss.status] || t.textMut} /></div></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 10, color: t.textMut }}>{iss.reported_by_name} | {ff(iss.reported_at)}</div>
        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>{iss.status === "open" && <button onClick={() => upd(iss.id, "in_progress")} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + OR, background: "transparent", color: OR, fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Start</button>}{iss.status === "in_progress" && <button onClick={() => upd(iss.id, "resolved")} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + GR, background: "transparent", color: GR, fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Resolve</button>}</div></div>
      {iss.photo_url && <div style={{ fontSize: 10, color: BL, marginTop: 6 }}>Photo attached</div>}
      {iss.assigned_to_name && <div style={{ fontSize: 10, color: BL, marginTop: 4 }}>Assigned to: {iss.assigned_to_name}</div>}
    </Crd>)}
    {sel && <Mdl t={t} onClose={() => setSel(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Issue Detail</div><button onClick={() => setSel(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, marginBottom: 8, color: t.text }}>{sel.title}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><Bdg l={sel.severity} c={sC[sel.severity]} /><Bdg l={sel.status?.replace("_", " ")} c={stC[sel.status] || t.textMut} /></div>
      {sel.description && <div style={{ fontSize: 13, color: t.textSec, marginBottom: 12, lineHeight: 1.5 }}>{sel.description}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: t.textMut }}>Site<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{sel.site_name}</div></div>
        <div style={{ fontSize: 11, color: t.textMut }}>Zone<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{sel.zone || "General"}</div></div>
        <div style={{ fontSize: 11, color: t.textMut }}>Reported By<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{sel.reported_by_name}</div></div>
        <div style={{ fontSize: 11, color: t.textMut }}>Reported At<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{ff(sel.reported_at)}</div></div>
        {sel.assigned_to_name && <div style={{ fontSize: 11, color: t.textMut }}>Assigned To<div style={{ color: BL, fontWeight: 600, marginTop: 2 }}>{sel.assigned_to_name}</div></div>}
        {sel.resolved_at && <div style={{ fontSize: 11, color: t.textMut }}>Resolved At<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{ff(sel.resolved_at)}</div></div>}
      </div>
      {sel.assignment_note && <div style={{ padding: "8px 12px", borderRadius: 6, background: t.blueSubtle, border: "1px solid " + t.blueBorder, fontSize: 11, color: BL, marginBottom: 12 }}>{sel.assignment_note}</div>}
      {allPhotos.length > 0 && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Photos ({allPhotos.length})</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{allPhotos.map((p, i) => <div key={i} style={{ position: "relative" }}><img src={p.photo_url} alt={"Photo " + (i + 1)} style={{ width: allPhotos.length === 1 ? "100%" : 140, height: allPhotos.length === 1 ? "auto" : 100, objectFit: "cover", borderRadius: 8, border: "1px solid " + t.borderSolid }} /><div style={{ position: "absolute", bottom: 4, left: 4, fontSize: 8, background: "rgba(0,0,0,0.7)", color: "#F8F7F4", padding: "2px 6px", borderRadius: 4 }}>{i === 0 ? "Original" : "Resolution"}</div></div>)}</div></div>}
      {allPhotos.length === 0 && sel.photo_url && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Photo</div><img src={sel.photo_url} alt="Issue" style={{ width: "100%", borderRadius: 8, border: "1px solid " + t.borderSolid }} /></div>}
      {activity.length > 0 && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>Activity Timeline</div>
        {activity.map((a, i) => { const actColor = a.action === "reported" ? BL : a.action === "assigned" ? GO : a.action === "reassigned" ? OR : a.action === "started_work" ? BL : a.action === "resolved" ? GR : a.action === "unable_to_resolve" ? RD : a.action === "status_changed" ? t.textSec : a.action === "resolution_photo" ? GR : a.action === "photo_added" ? BL : t.textMut; const actLabel = a.action === "reported" ? "Reported" : a.action === "assigned" ? "Assigned" : a.action === "reassigned" ? "Reassigned" : a.action === "started_work" ? "Work Started" : a.action === "resolved" ? "Resolved" : a.action === "unable_to_resolve" ? "Unable to Resolve" : a.action === "status_changed" ? "Status Changed" : a.action === "resolution_photo" ? "Resolution Photo" : a.action === "photo_added" ? "Photo Added" : a.action; const timeStr = new Date(a.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }); return <TimelineRow key={i} t={t} last={i === activity.length - 1} node={<div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid " + actColor, padding: 1, boxSizing: "border-box", flexShrink: 0 }}><Ini name={a.user_name || "System"} sz={26} /></div>}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}><div style={{ minWidth: 0 }}><span style={{ fontSize: 11, fontWeight: 600, color: actColor }}>{actLabel}</span><span style={{ fontSize: 10, color: t.textMut, marginLeft: 8 }}>by {a.user_name}</span></div><span style={{ fontSize: 9, color: t.textMut, flexShrink: 0 }}>{timeStr}</span></div>{a.details && <div style={{ fontSize: 11, color: t.textSec, marginTop: 3, lineHeight: 1.4 }}>{a.details}</div>}</TimelineRow>; })}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {sel.status === "open" && <Btn t={t} style={{ flex: 1 }} onClick={() => upd(sel.id, "in_progress")}>Start Work</Btn>}
        {sel.status === "in_progress" && <Btn t={t} style={{ flex: 1 }} onClick={() => upd(sel.id, "resolved")}>Resolve</Btn>}
        {sel.status === "escalated" && <Btn t={t} style={{ flex: 1 }} onClick={() => upd(sel.id, "resolved")}>Resolve</Btn>}
        {(sel.status === "open" || sel.status === "in_progress" || sel.status === "escalated") && <Btn t={t} v="ghost" style={{ flex: 1 }} onClick={() => { setAssignTask({ issueId: sel.id, userId: "", note: "", isReassign: !!sel.assigned_to }); setSel(null); }}>{sel.assigned_to ? "Reassign" : "Assign as Task"}</Btn>}
        <Btn t={t} v="ghost" style={{ flex: 1 }} onClick={() => setSel(null)}>Close</Btn>
      </div></div></Mdl>}
    {assignTask && <Mdl t={t} onClose={() => setAssignTask(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>{assignTask.isReassign ? "Reassign Issue" : "Assign Issue as Task"}</div><button onClick={() => setAssignTask(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      {assignTask.isReassign && <div style={{ padding: "8px 12px", borderRadius: 6, background: t.orangeSubtle, border: "1px solid " + t.orangeBorder, fontSize: 11, color: OR, marginBottom: 12 }}>This issue is currently assigned to someone. Selecting a new person will remove the previous assignment.</div>}
      <div style={{ fontSize: 12, color: t.textSec, marginBottom: 16, lineHeight: 1.5 }}>The task will appear in the staff member's "Assigned Tasks" tab where they can mark it as in progress, resolved, or unable to resolve.</div>
      <div style={{ marginBottom: 12 }}><Lbl>Assign To *</Lbl><Sel t={t} value={assignTask.userId} onChange={e => setAssignTask({ ...assignTask, userId: e.target.value })} options={[{ v: "", l: "Select a staff member..." }, ...staffList.map(s => ({ v: s.id, l: s.name }))]} /></div>
      {assignTask.isReassign && <div style={{ marginBottom: 12 }}><Lbl>Note to previous assignee (optional)</Lbl><TArea t={t} value={assignTask.note} onChange={e => setAssignTask({ ...assignTask, note: e.target.value })} placeholder="Explain why this is being reassigned..." rows={3} /></div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAssignTask(null)}>Cancel</Btn><Btn t={t} onClick={submitAssignTask}>{assignTask.isReassign ? "Reassign" : "Assign Task"}</Btn></div>
    </div></Mdl>}
  </div>);
}

function SuppliesAdminPage({ af, showToast, isAdmin, t, getOpts, lkHasOther }) {
  const [supplies, setSupplies] = useState([]); const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState("inventory"); const [addForm, setAddForm] = useState(null);
  const [editForm, setEditForm] = useState(null); const [handleReq, setHandleReq] = useState(null);
  const loadSupplies = () => af("/api/supplies").then(setSupplies).catch(e => showToast(e.message, "error"));
  const loadRequests = () => af("/api/supplies/requests").then(setRequests).catch(e => showToast(e.message, "error"));
  useEffect(() => { loadSupplies(); loadRequests(); }, []);
  const submitAdd = async () => { if (!addForm.name || !addForm.category || !addForm.unit) { showToast("Name, category, and unit required", "error"); return; } try { const d = await af("/api/supplies", { method: "POST", body: addForm }); showToast(d.message); setAddForm(null); loadSupplies(); } catch (e) { showToast(e.message, "error"); } };
  const submitEdit = async () => { try { await af("/api/supplies/" + editForm.id, { method: "PATCH", body: editForm }); showToast("Supply updated"); setEditForm(null); loadSupplies(); } catch (e) { showToast(e.message, "error"); } };
  const deactivate = async (id) => { try { await af("/api/supplies/" + id, { method: "DELETE" }); showToast("Supply removed"); loadSupplies(); } catch (e) { showToast(e.message, "error"); } };
  const submitHandleReq = async () => { try { await af("/api/supplies/requests/" + handleReq.id, { method: "PATCH", body: { status: handleReq.status, adminNotes: handleReq.notes } }); showToast("Request " + handleReq.status); setHandleReq(null); loadRequests(); } catch (e) { showToast(e.message, "error"); } };
  const qrUrl = (code) => "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(API + "/qr/" + code);
  const cats = getOpts("supply_categories");
  const units = getOpts("supply_units");
  const reqColor = { pending: OR, approved: BL, denied: RD, fulfilled: GR };
  const pendingCount = requests.filter(r => r.status === "pending").length;
  return (<div>
    <SecT t={t} action={isAdmin ? "Add Supply" : undefined} onAction={isAdmin ? () => setAddForm({ name: "", category: "chemical", unit: "each", currentStock: "", lowThreshold: "", costPerUnit: "", isGreenCertified: false, greenCertType: "", epaRegNumber: "", manufacturer: "" }) : undefined}>Supplies and Inventory</SecT>
    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
      <button onClick={() => setTab("inventory")} style={{ padding: "5px 12px", borderRadius: 6, background: tab === "inventory" ? t.goldBg : "transparent", color: tab === "inventory" ? t.goldText : t.textMut, fontSize: 11, fontWeight: tab === "inventory" ? 700 : 500, cursor: "pointer", border: tab === "inventory" ? "1px solid " + t.goldBorder : "1px solid transparent" }}>Inventory ({supplies.length})</button>
      <button onClick={() => setTab("requests")} style={{ padding: "5px 12px", borderRadius: 6, background: tab === "requests" ? t.goldBg : "transparent", color: tab === "requests" ? t.goldText : t.textMut, fontSize: 11, fontWeight: tab === "requests" ? 700 : 500, cursor: "pointer", border: tab === "requests" ? "1px solid " + t.goldBorder : "1px solid transparent" }}>Requests {pendingCount > 0 ? "(" + pendingCount + " pending)" : ""}</button>
    </div>
    {tab === "inventory" && supplies.map(s => (<Crd key={s.id} t={t} style={{ marginBottom: 8, padding: 14 }} onClick={isAdmin ? () => setEditForm({ id: s.id, name: s.name, category: s.category, unit: s.unit, currentStock: s.current_stock || 0, lowThreshold: s.low_threshold || 0, costPerUnit: s.cost_per_unit || "", isGreenCertified: s.is_green_certified, greenCertType: s.green_cert_type || "", epaRegNumber: s.epa_reg_number || "", manufacturer: s.manufacturer || "", qrCode: s.qr_code }) : undefined}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 44, height: 44, borderRadius: 8, background: t.goldBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><img src={qrUrl(s.qr_code)} alt="QR" style={{ width: 36, height: 36, borderRadius: 4 }} /></div><div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{s.name}</span>{s.is_green_certified && <Bdg l="Green" c={GR} />}</div><div style={{ fontSize: 11, color: t.textSec, marginTop: 2 }}>{s.category} | {s.unit} | Stock: {s.current_stock}</div><div style={{ fontSize: 10, color: t.textMut, marginTop: 2 }}>QR: {s.qr_code}{s.manufacturer ? " | " + s.manufacturer : ""}</div></div>{s.current_stock <= (s.low_threshold || 0) && <Bdg l="Low Stock" c={RD} />}</div></Crd>))}
    {tab === "inventory" && supplies.length === 0 && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>No supplies configured.{isAdmin ? ' Click "Add Supply" to start.' : ""}</div>}
    {tab === "requests" && requests.map(r => (<Crd key={r.id} t={t} style={{ marginBottom: 8, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{r.request_type === "refill" ? "Refill Request" : r.request_type === "damage_report" ? "Damage Report" : r.request_type === "new_gear" ? "New Gear Request" : "New Supply Request"}</div><div style={{ fontSize: 11, color: t.textSec, marginTop: 2 }}>{r.item_name || r.supply_name || "General"} {r.site_name ? "at " + r.site_name : ""}</div>{r.description && <div style={{ fontSize: 11, color: t.textMut, marginTop: 4 }}>{r.description}</div>}</div><div style={{ display: "flex", gap: 6, flexShrink: 0 }}><Bdg l={r.urgency} c={r.urgency === "urgent" ? RD : r.urgency === "high" ? OR : t.textMut} /><Bdg l={r.status} c={reqColor[r.status] || t.textMut} /></div></div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 10, color: t.textMut }}>{r.requested_by_name} | {fd(r.created_at)}</div>{r.status === "pending" && <div style={{ display: "flex", gap: 4 }}><button onClick={() => setHandleReq({ id: r.id, status: "approved", notes: "" })} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + GR, background: "transparent", color: GR, fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Approve</button><button onClick={() => setHandleReq({ id: r.id, status: "denied", notes: "" })} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Deny</button></div>}</div></Crd>))}
    {tab === "requests" && requests.length === 0 && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>No supply requests yet.</div>}
    {addForm && <Mdl t={t} onClose={() => setAddForm(null)}><div style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Add Supply</div><button onClick={() => setAddForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div><div style={{ padding: "8px 12px", borderRadius: 6, background: t.greenSubtle, border: "1px solid " + t.greenBorder, fontSize: 11, color: GR, marginBottom: 14 }}>A unique QR code will be generated automatically.</div><div style={{ marginBottom: 12 }}><Lbl>Name *</Lbl><Inp t={t} value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="e.g. All-Purpose Cleaner" /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Category *</Lbl><Sel t={t} value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} options={cats} /></div><div><Lbl>Unit *</Lbl><Sel t={t} value={addForm.unit} onChange={e => setAddForm({ ...addForm, unit: e.target.value })} options={units} /></div></div>{lkHasOther("supply_categories", addForm.category) && <div style={{ marginBottom: 12 }}><Lbl>Specify Category</Lbl><Inp t={t} value={addForm.categoryOther || ""} onChange={e => setAddForm({ ...addForm, categoryOther: e.target.value })} placeholder="Describe the category" /></div>}<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Stock</Lbl><Inp t={t} type="number" value={addForm.currentStock} onChange={e => setAddForm({ ...addForm, currentStock: e.target.value })} /></div><div><Lbl>Low Threshold</Lbl><Inp t={t} type="number" value={addForm.lowThreshold} onChange={e => setAddForm({ ...addForm, lowThreshold: e.target.value })} /></div><div><Lbl>Cost/Unit</Lbl><Inp t={t} type="number" value={addForm.costPerUnit} onChange={e => setAddForm({ ...addForm, costPerUnit: e.target.value })} placeholder="$" /></div></div><div style={{ marginBottom: 12 }}><Lbl>Manufacturer</Lbl><Inp t={t} value={addForm.manufacturer} onChange={e => setAddForm({ ...addForm, manufacturer: e.target.value })} /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>EPA Reg #</Lbl><Inp t={t} value={addForm.epaRegNumber} onChange={e => setAddForm({ ...addForm, epaRegNumber: e.target.value })} /></div><div><Lbl>Green Cert Type</Lbl><Inp t={t} value={addForm.greenCertType} onChange={e => setAddForm({ ...addForm, greenCertType: e.target.value })} placeholder="e.g. Green Seal" /></div></div><div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={addForm.isGreenCertified} onChange={e => setAddForm({ ...addForm, isGreenCertified: e.target.checked })} /><span style={{ fontSize: 12, color: t.textSec }}>Green Certified Product</span></div><div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAddForm(null)}>Cancel</Btn><Btn t={t} onClick={submitAdd}>Add Supply</Btn></div></div></Mdl>}
    {editForm && <Mdl t={t} onClose={() => setEditForm(null)}><div style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Edit Supply</div><button onClick={() => setEditForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>{editForm.qrCode && <div style={{ textAlign: "center", marginBottom: 14 }}><img src={qrUrl(editForm.qrCode)} alt="QR" style={{ width: 120, height: 120, borderRadius: 8 }} /><div style={{ fontSize: 11, color: t.goldText, marginTop: 6, fontFamily: "monospace" }}>{editForm.qrCode}</div><div style={{ fontSize: 10, color: t.textMut, marginTop: 2 }}>Print this QR code and attach it to the supply container</div></div>}<div style={{ marginBottom: 12 }}><Lbl>Name</Lbl><Inp t={t} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Category</Lbl><Sel t={t} value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} options={cats} /></div><div><Lbl>Unit</Lbl><Sel t={t} value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })} options={units} /></div></div>{lkHasOther("supply_categories", editForm.category) && <div style={{ marginBottom: 12 }}><Lbl>Specify Category</Lbl><Inp t={t} value={editForm.categoryOther || ""} onChange={e => setEditForm({ ...editForm, categoryOther: e.target.value })} placeholder="Describe the category" /></div>}<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Stock</Lbl><Inp t={t} type="number" value={editForm.currentStock} onChange={e => setEditForm({ ...editForm, currentStock: e.target.value })} /></div><div><Lbl>Low Threshold</Lbl><Inp t={t} type="number" value={editForm.lowThreshold} onChange={e => setEditForm({ ...editForm, lowThreshold: e.target.value })} /></div><div><Lbl>Cost/Unit</Lbl><Inp t={t} type="number" value={editForm.costPerUnit} onChange={e => setEditForm({ ...editForm, costPerUnit: e.target.value })} /></div></div><div style={{ marginBottom: 12 }}><Lbl>Manufacturer</Lbl><Inp t={t} value={editForm.manufacturer} onChange={e => setEditForm({ ...editForm, manufacturer: e.target.value })} /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>EPA Reg #</Lbl><Inp t={t} value={editForm.epaRegNumber} onChange={e => setEditForm({ ...editForm, epaRegNumber: e.target.value })} /></div><div><Lbl>Green Cert Type</Lbl><Inp t={t} value={editForm.greenCertType} onChange={e => setEditForm({ ...editForm, greenCertType: e.target.value })} /></div></div><div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={editForm.isGreenCertified} onChange={e => setEditForm({ ...editForm, isGreenCertified: e.target.checked })} /><span style={{ fontSize: 12, color: t.textSec }}>Green Certified Product</span></div><div style={{ display: "flex", gap: 10 }}><Btn t={t} v="danger" onClick={() => { deactivate(editForm.id); setEditForm(null); }}>Remove</Btn><div style={{ flex: 1 }} /><Btn t={t} v="ghost" onClick={() => setEditForm(null)}>Cancel</Btn><Btn t={t} onClick={submitEdit}>Save</Btn></div></div></Mdl>}
    {handleReq && <Mdl t={t} onClose={() => setHandleReq(null)}><div style={{ padding: 20 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, marginBottom: 16, color: t.text }}>{handleReq.status === "approved" ? "Approve" : "Deny"} Request</div><div style={{ marginBottom: 16 }}><Lbl>Notes (optional)</Lbl><Inp t={t} value={handleReq.notes} onChange={e => setHandleReq({ ...handleReq, notes: e.target.value })} placeholder="Add a note..." /></div><div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setHandleReq(null)}>Cancel</Btn><Btn t={t} onClick={submitHandleReq}>{handleReq.status === "approved" ? "Approve" : "Deny"}</Btn></div></div></Mdl>}
  </div>);
}

function ChatPage({ af, user, t }) {
  const [dms, setDms] = useState([]); const [sel, setSel] = useState(null); const [msgs, setMsgs] = useState([]); const [reply, setReply] = useState(""); const [q, setQ] = useState(""); const endRef = useRef(null);
  useEffect(() => { af("/api/chat/dm-inbox").then(setDms).catch(e => console.warn(e.message)); }, []);
  const open = async id => { setSel(id); try { const m = await af("/api/chat/channels/" + id + "/messages"); setMsgs(m); } catch (e) { console.error(e); } };
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  useEffect(() => { if (!sel) return; const iv = setInterval(async () => { try { const m = await af("/api/chat/channels/" + sel + "/messages"); setMsgs(m); } catch (e) { console.warn("Chat poll:", e.message); } }, 12000); return () => clearInterval(iv); }, [sel]);
  const send = async () => { if (!reply.trim() || !sel) return; try { const d = await af("/api/chat/channels/" + sel + "/messages", { method: "POST", body: { text: reply.trim() } }); setMsgs(p => [...p, d.message]); setReply(""); } catch (e) { console.error(e); } };
  const filtered = dms.filter(dm => (dm.staffName || "").toLowerCase().includes(q.trim().toLowerCase()));
  const activeDm = dms.find(dm => dm.channelId === sel);
  return (<div>
    <SecT t={t}>Messages</SecT>
    <Crd t={t} style={{ padding: 0, overflow: "hidden", display: "flex", height: "calc(100vh / var(--zoom, 1) - 168px)", minHeight: 420 }}>
      <div style={{ width: 300, borderRight: "1px solid " + t.border, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid " + t.border }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 10 }}>Private conversations</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: t.inputBg, border: "1px solid " + t.inputBorder, borderRadius: 20, padding: "7px 12px" }}>
            <Ic d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35" sz={14} c={t.textMut} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search staff" style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: t.text, fontSize: 13, fontFamily: FONT_BODY }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
          {filtered.length === 0 && <div style={{ padding: 30, textAlign: "center", color: t.textMut, fontSize: 12 }}>No conversations.</div>}
          {filtered.map(dm => { const active = dm.channelId === sel; return (
            <button key={dm.channelId} onClick={() => open(dm.channelId)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px", borderRadius: 10, marginBottom: 2, border: "none", cursor: "pointer", textAlign: "left", background: active ? t.goldBg : "transparent" }} onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.hover; }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              <Ini name={dm.staffName} sz={38} color={active ? GO : t.textSec} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13, fontWeight: dm.unreadCount > 0 ? 700 : 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dm.staffName}</span>{dm.lastMessageAt && <span style={{ fontSize: 10, color: t.textMut, flexShrink: 0 }}>{fd(dm.lastMessageAt)}</span>}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginTop: 2 }}><span style={{ fontSize: 11, color: dm.unreadCount > 0 ? t.text : t.textMut, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dm.lastMessage || "No messages yet"}</span>{dm.unreadCount > 0 && <span style={{ width: 18, height: 18, borderRadius: "50%", background: GO, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: NAVY, flexShrink: 0 }}>{dm.unreadCount}</span>}</div>
              </div>
            </button>
          ); })}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {!sel ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: t.textMut, padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: t.goldBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><ChI sz={28} c={t.goldText} /></div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Your messages</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Pick a conversation on the left to start.</div>
          </div>
        ) : (<>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid " + t.border }}>
            <Ini name={activeDm?.staffName} sz={34} />
            <div><div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text }}>{activeDm?.staffName || "Conversation"}</div><div style={{ fontSize: 11, color: t.textMut }}>Private message</div></div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {msgs.length === 0 && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>No messages yet.</div>}
            {msgs.map((m, i) => { const isMe = m.senderRole === "admin" || m.senderRole === "supervisor"; const showN = i === 0 || msgs[i - 1].senderId !== m.senderId; return (
              <div key={m.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 8, marginBottom: showN ? 12 : 4, alignItems: "flex-end" }}>
                {!isMe && showN && <Ini name={m.senderName} sz={28} color={t.textSec} />}{!isMe && !showN && <div style={{ width: 28 }} />}
                <div style={{ maxWidth: "75%" }}>{!isMe && showN && <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 3, color: t.textSec }}>{m.senderName}</div>}<div style={{ padding: "8px 12px", borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isMe ? BL : t.cardAlt, border: isMe ? "none" : "1px solid " + t.border, color: isMe ? "#F8F7F4" : t.text, fontSize: 13, lineHeight: 1.45 }}>{m.text}</div><div style={{ fontSize: 9, color: t.textMut, marginTop: 2, textAlign: isMe ? "right" : "left" }}>{ft(m.sentAt)}</div></div>
              </div>); })}
            <div ref={endRef} />
          </div>
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: "1px solid " + t.border }}>
            <Inp t={t} value={reply} onChange={e => setReply(e.target.value)} placeholder="Type a message" style={{ borderRadius: 20 }} onKeyDown={e => e.key === "Enter" && send()} />
            <button onClick={send} style={{ width: 40, height: 40, borderRadius: "50%", background: reply.trim() ? "linear-gradient(135deg," + GO + "," + GL + ")" : t.cardAlt, border: "none", cursor: reply.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SnI sz={16} c={reply.trim() ? NAVY : t.textMut} /></button>
          </div>
        </>)}
      </div>
    </Crd>
  </div>);
}
// ===== HELP: the assistant the staff portal's Help tab talks to. Same four requests, same screen. =====
// AGENT_HELPERS_START (pure helpers, no React, so they can run as a script against fixtures)
const agentPick = (row, keys) => { for (const k of keys) { if (row && row[k] !== undefined && row[k] !== null) return row[k]; } return undefined; };
const agentListFrom = (res, keys) => { if (Array.isArray(res)) return res; if (res && typeof res === "object") { for (const k of keys) { if (Array.isArray(res[k])) return res[k]; } } return []; };
const agentDraftFrom = (row) => ({
  id: agentPick(row, ["id", "formResponseId", "form_response_id"]),
  name: agentPick(row, ["formName", "formTitle", "form_name", "title", "formCode", "form_code"]) || "Report",
  answered: agentPick(row, ["answered", "answeredCount", "answered_count"]),
  remaining: agentPick(row, ["remaining", "remainingCount", "remaining_count"]),
  conversationId: agentPick(row, ["conversationId", "conversation_id"]),
  formCode: agentPick(row, ["formCode", "form_code"]),
  status: agentPick(row, ["status"]) || "draft",
  nextQuestion: agentPick(row, ["nextQuestion", "next_question"]),
});
const agentAnsweredLine = (answered, remaining) => (answered === undefined || answered === null || remaining === undefined || remaining === null) ? "" : Number(answered) + " of " + (Number(answered) + Number(remaining)) + " answered";
const agentMessageFrom = (m, i) => {
  const role = String(agentPick(m, ["role", "sender"]) || "").toLowerCase() === "user" ? "user" : "assistant";
  const cited = agentPick(m, ["citedDocs", "cited_doc_codes", "citedDocCodes"]);
  return { id: "h" + i, role, text: String(agentPick(m, ["text", "content", "reply"]) || ""), citedDocs: Array.isArray(cited) ? cited : [], degraded: m && m.degraded === true, noProcedure: !!(m && (m.noProcedure === true || m.no_procedure === true)), status: "sent" };
};
const agentKeyToWords = (k) => { const w = String(k || "").replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim().toLowerCase(); return w ? w.charAt(0).toUpperCase() + w.slice(1) : ""; };
// What is still unanswered, for the line on the Help page. The API names the questions when it can:
// missingFields carries a label per key, in the same order as missing, and a label is what a person
// recognizes. Without it, the keys are turned into words the way they always were.
const agentMissingFrom = (err) => {
  const b = err && err.body;
  const named = b && agentPick(b, ["missingFields", "missing_fields"]);
  if (Array.isArray(named) && named.length) {
    const labels = named.map(f => (f && typeof f === "object") ? String(agentPick(f, ["label", "title", "name"]) || "").trim() : "").filter(Boolean);
    if (labels.length === named.length) return labels;
  }
  const arr = b && agentPick(b, ["missing", "missingKeys", "missingFields", "missing_keys", "missing_fields"]);
  return Array.isArray(arr) ? arr.map(agentKeyToWords).filter(Boolean) : null;
};
// A reply may carry numbered steps ("1. ...") and bold ("**text**"). This turns it into lines, each a
// step with its number or a plain line, and each made of inline parts that are plain or bold. An
// unmatched ** stays as literal text; bold never spans lines; blank lines are kept as spacing.
const agentInlineParts = (line) => { const parts = []; let rest = String(line); while (rest.length) { const a = rest.indexOf("**"); const b = a < 0 ? -1 : rest.indexOf("**", a + 2); if (a < 0 || b < 0) { parts.push({ bold: false, text: rest }); break; } if (a > 0) parts.push({ bold: false, text: rest.slice(0, a) }); parts.push({ bold: true, text: rest.slice(a + 2, b) }); rest = rest.slice(b + 2); } return parts; };
const agentReplyParts = (text) => String(text == null ? "" : text).split(/\r?\n/).map(line => { const m = line.match(/^\s*(\d{1,2})\.\s+(.+)$/); return m ? { step: Number(m[1]), parts: agentInlineParts(m[2]) } : { step: null, parts: agentInlineParts(line) }; });
// AGENT_HELPERS_END
// Which app a Help message comes from, so the answer gives steps for this app.
const AGENT_APP = "dashboard";
const AGENT_MAX_PHOTOS = 3;
const AGENT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const AGENT_PHOTO_MAX_EDGE = 1568;
const AGENT_PHOTO_UNREADABLE = "This photo could not be read here. Choose a JPEG or PNG, or take a screenshot of it.";
// Prepares a picked image in the browser before upload: decoded with the orientation baked in, drawn
// to a canvas with the long edge at most 1568 pixels and never enlarged, exported as JPEG at 0.85,
// then 0.7, then 0.5 if still over 5 MB. Drawing through a canvas drops the photo's location and camera
// data, which is intended. Throws when the image will not decode.
async function agentPreparePhoto(file) {
  let source = null, bitmap = null, w = 0, h = 0;
  try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); source = bitmap; w = bitmap.width; h = bitmap.height; }
  catch {
    source = await new Promise((resolve, reject) => { const url = URL.createObjectURL(file); const img = new Image(); img.onload = () => { URL.revokeObjectURL(url); resolve(img); }; img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); }; img.src = url; });
    w = source.naturalWidth; h = source.naturalHeight;
  }
  if (!w || !h) throw new Error("decode");
  const scale = Math.min(1, AGENT_PHOTO_MAX_EDGE / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas"); canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d"); ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, cw, ch); ctx.drawImage(source, 0, 0, cw, ch);
  if (bitmap && bitmap.close) bitmap.close();
  const encode = (q) => new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("encode")), "image/jpeg", q));
  let blob = null;
  for (const q of [0.85, 0.7, 0.5]) { blob = await encode(q); if (blob.size <= AGENT_PHOTO_MAX_BYTES) break; }
  return blob;
}
function HelpPage({ af, uf, showToast, t }) {
  const [drafts, setDrafts] = useState([]);
  const [thread, setThread] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [formResponse, setFormResponse] = useState(null);
  const [missing, setMissing] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState([]);
  const [photoNote, setPhotoNote] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resuming, setResuming] = useState(false);
  const busy = sending || submitting || resuming;
  const endRef = useRef(null);
  const composerRef = useRef(null);
  const fileInputRef = useRef(null);
  const seq = useRef(0);
  const convRef = useRef(null);
  convRef.current = conversationId;
  const photosRef = useRef([]);
  photosRef.current = photos;
  const urlsRef = useRef(new Set());
  const uploadChain = useRef(Promise.resolve());
  // Nothing is kept in the browser: every object URL is revoked when its photo is removed and when the page unmounts.
  useEffect(() => () => { urlsRef.current.forEach(u => { try { URL.revokeObjectURL(u); } catch {} }); urlsRef.current.clear(); }, []);

  const loadDrafts = useCallback(async () => {
    try { const res = await af("/api/agent/drafts"); setDrafts(agentListFrom(res, ["drafts", "items", "rows"]).map(agentDraftFrom)); }
    catch (e) { console.warn("Help drafts:", e.message); setDrafts([]); }
  }, [af]);
  useEffect(() => { loadDrafts(); }, [loadDrafts]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.length, sending]);

  const patchMsg = (id, patch) => setThread(p => p.map(m => m.id === id ? { ...m, ...patch } : m));
  const patchPhoto = (key, patch) => setPhotos(p => p.map(x => x.key === key ? { ...x, ...patch } : x));
  const dropUrl = (url) => { if (!url) return; try { URL.revokeObjectURL(url); } catch {} urlsRef.current.delete(url); };

  // Step one of the contract: POST /api/uploads?bucket=agent-photos&ext=jpg with the raw JPEG bytes. Only path is kept.
  const uploadPhoto = async (key, blob) => {
    patchPhoto(key, { status: "uploading", error: "" });
    try {
      const r = await uf(new File([blob], "photo.jpg", { type: "application/octet-stream" }), "agent-photos");
      if (r && r.path) patchPhoto(key, { status: "done", path: String(r.path), error: "" });
      else patchPhoto(key, { status: "failed", error: "Upload failed" });
    } catch (e) { patchPhoto(key, { status: "failed", error: e.message || "Upload failed" }); }
  };
  // Each picked image is prepared as soon as it is picked; uploads run one at a time in the order picked.
  const addFiles = (files) => {
    setPhotoNote("");
    const room = AGENT_MAX_PHOTOS - photosRef.current.length;
    Array.from(files || []).slice(0, Math.max(0, room)).forEach(file => {
      const key = "p" + (++seq.current);
      const prep = agentPreparePhoto(file).then(blob => { const url = URL.createObjectURL(blob); urlsRef.current.add(url); return { blob, url }; });
      prep.catch(() => {});
      setPhotos(p => [...p, { key, url: "", blob: null, status: "uploading", path: "", error: "" }]);
      uploadChain.current = uploadChain.current.then(async () => {
        let prepared;
        try { prepared = await prep; } catch { setPhotos(p => p.filter(x => x.key !== key)); setPhotoNote(AGENT_PHOTO_UNREADABLE); return; }
        if (!photosRef.current.some(x => x.key === key)) { dropUrl(prepared.url); return; }
        patchPhoto(key, { blob: prepared.blob, url: prepared.url });
        await uploadPhoto(key, prepared.blob);
      });
    });
  };
  const removePhoto = (key) => { const p = photosRef.current.find(x => x.key === key); if (p) dropUrl(p.url); setPhotos(cur => cur.filter(x => x.key !== key)); };
  const retryUpload = (p) => { if (!p.blob) return; uploadChain.current = uploadChain.current.then(() => uploadPhoto(p.key, p.blob)); };
  const onPick = (e) => { const files = e.target.files; if (files && files.length) addFiles(files); e.target.value = ""; };
  const onPaste = (e) => {
    const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
    const files = items.filter(i => i.kind === "file" && /^image\//.test(i.type)).map(i => i.getAsFile()).filter(Boolean);
    if (files.length) { e.preventDefault(); addFiles(files); }
  };

  // Step two of the contract: POST /api/agent/message with text, the app name, photoPaths in thumbnail order, and the conversation id.
  const sendText = async (id, body, paths, keys) => {
    if (busy) return;
    setSending(true);
    patchMsg(id, { status: "sending", error: "" });
    try {
      const payload = { text: body, app: AGENT_APP }; if (paths && paths.length) payload.photoPaths = paths; if (convRef.current) payload.conversationId = convRef.current;
      const d = await af("/api/agent/message", { method: "POST", body: payload });
      const r = d || {};
      if (r.conversationId) setConversationId(r.conversationId);
      const reply = { id: "a" + (++seq.current), role: "assistant", text: typeof r.reply === "string" ? r.reply : (r.reply == null ? "" : String(r.reply)), citedDocs: Array.isArray(r.citedDocs) ? r.citedDocs : [], degraded: r.degraded === true, noProcedure: r.noProcedure === true, status: "sent" };
      if (r.formResponse) { setFormResponse(r.formResponse); setMissing(null); setSubmitted(false); }
      setThread(p => [...p.map(m => m.id === id ? { ...m, status: "sent", error: "" } : m), reply]);
      setText(cur => cur === body ? "" : cur);
      if (keys && keys.length) setPhotos(cur => cur.filter(p => !keys.includes(p.key)));
    } catch (e) {
      patchMsg(id, { status: "failed", error: e.message || "Request failed" });
    } finally { setSending(false); }
  };
  const allUploaded = photos.every(p => p.status === "done");
  const canSend = !busy && allUploaded && (text.trim().length > 0 || photos.length > 0);
  const send = () => {
    if (!canSend) return;
    const body = text;
    const sent = photos.map(p => ({ key: p.key, url: p.url, path: p.path }));
    const paths = sent.map(p => p.path), keys = sent.map(p => p.key);
    const id = "u" + (++seq.current);
    setThread(p => [...p, { id, role: "user", text: body, photos: sent, photoPaths: paths, photoKeys: keys, status: "sending", error: "" }]);
    sendText(id, body, paths, keys);
  };
  // Retry re-sends the same text and the same paths. Nothing is uploaded again.
  const retry = (m) => sendText(m.id, m.text, m.photoPaths || [], m.photoKeys || []);

  const resume = async (d) => {
    if (busy) return;
    setFormResponse({ id: d.id, formName: d.name, answered: d.answered, remaining: d.remaining, formCode: d.formCode, status: d.status, nextQuestion: d.nextQuestion });
    setMissing(null); setSubmitted(false);
    if (!d.conversationId) { setConversationId(null); setTimeout(() => composerRef.current?.querySelector("textarea")?.focus(), 0); return; }
    setResuming(true);
    try {
      const res = await af("/api/agent/conversations/" + encodeURIComponent(d.conversationId));
      setThread(agentListFrom(res, ["messages", "turns", "history"]).map(agentMessageFrom));
      setConversationId(d.conversationId);
    } catch (e) { showToast(e.message || "Request failed", "error"); }
    finally { setResuming(false); setTimeout(() => composerRef.current?.querySelector("textarea")?.focus(), 0); }
  };

  const submit = async () => {
    if (!formResponse || busy) return;
    setSubmitting(true); setMissing(null);
    try {
      await af("/api/agent/drafts/" + encodeURIComponent(formResponse.id) + "/submit", { method: "POST" });
      setFormResponse(null); setSubmitted(true); loadDrafts();
    } catch (e) {
      const list = agentMissingFrom(e);
      setMissing(list && list.length ? list : [e.message || "Request failed"]);
    } finally { setSubmitting(false); }
  };

  const visibleDrafts = drafts.filter(d => !(formResponse && d.id !== undefined && String(d.id) === String(formResponse.id)));
  const cardName = formResponse ? (agentDraftFrom(formResponse).name) : "";
  const cardLine = formResponse ? agentAnsweredLine(agentPick(formResponse, ["answered", "answeredCount", "answered_count"]), agentPick(formResponse, ["remaining", "remainingCount", "remaining_count"])) : "";
  const canSubmit = !!formResponse && !busy && !(Number(formResponse.remaining) > 0);
  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const photosFull = photos.length >= AGENT_MAX_PHOTOS;
  const canPick = !busy && !photosFull;

  return (<div>
    <SecT t={t}>Help</SecT>
    {visibleDrafts.length > 0 && <Crd t={t} style={{ marginBottom: 12 }}>
      <Lbl>Unfinished reports</Lbl>
      {visibleDrafts.map((d, i) => { const line = agentAnsweredLine(d.answered, d.remaining); return (
        <div key={d.id ?? i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid " + t.border }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{d.name}</div>{line && <div style={{ fontSize: 11, color: t.textMut, marginTop: 2 }}>{line}</div>}</div>
          <Btn t={t} v="ghost" onClick={() => resume(d)} disabled={busy} style={{ minHeight: 44 }}>Resume</Btn>
        </div>); })}
    </Crd>}
    {formResponse && <Crd t={t} style={{ marginBottom: 12 }}>
      <Lbl>Report in progress</Lbl>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{cardName}</div>{cardLine && <div style={{ fontSize: 11, color: t.textMut, marginTop: 2 }}>{cardLine}</div>}</div>
        <Btn t={t} onClick={submit} disabled={!canSubmit} style={{ minHeight: 44, opacity: canSubmit ? 1 : 0.6, cursor: canSubmit ? "pointer" : "default" }}>{submitting ? "Submitting..." : "Submit report"}</Btn>
      </div>
      {missing && <div style={{ marginTop: 10, fontSize: 12, color: t.text }}><div style={{ fontWeight: 600, color: RD, marginBottom: 4 }}>Still needed before you can submit:</div><ul style={{ margin: 0, paddingLeft: 18 }}>{missing.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
    </Crd>}
    {submitted && <div style={{ fontSize: 13, fontWeight: 600, color: GR, marginBottom: 12 }}>Report submitted.</div>}
    <Crd t={t} style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "calc(100vh / var(--zoom, 1) - 168px)", minHeight: 360 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {thread.length === 0 && <div style={{ padding: 40, textAlign: "center", color: t.textMut, fontSize: 13 }}>Tell me what happened and I will tell you what to do.</div>}
        {thread.map(m => { const isMe = m.role === "user"; return (
          <div key={m.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", marginBottom: 12 }}>
            <div style={{ maxWidth: "75%", minWidth: 0 }}>
              <div style={{ padding: "8px 12px", borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isMe ? BL : (m.noProcedure ? t.goldBg : t.cardAlt), border: isMe ? "none" : "1px solid " + (m.noProcedure ? GO : t.border), color: isMe ? "#F8F7F4" : t.text, fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word", opacity: m.status === "sending" ? 0.6 : 1 }}>
                {isMe && m.photos && m.photos.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: m.text ? 6 : 0 }}>{m.photos.map((p, i) => <img key={i} src={p.url} alt="" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8, display: "block" }} />)}</div>}
                {isMe ? m.text : agentReplyParts(m.text).map((line, li) => {
                  const inline = line.parts.map((part, pi) => part.bold ? <strong key={pi}>{part.text}</strong> : <Fragment key={pi}>{part.text}</Fragment>);
                  if (line.step !== null) return <div key={li} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}><span style={{ flexShrink: 0, minWidth: 18, textAlign: "right" }}>{line.step}.</span><span style={{ minWidth: 0 }}>{inline}</span></div>;
                  return line.parts.length === 0 ? <div key={li} style={{ height: 8 }} /> : <div key={li}>{inline}</div>;
                })}
              </div>
              {!isMe && m.citedDocs && m.citedDocs.length > 0 && <div style={{ fontSize: 11, color: t.textMut, marginTop: 3 }}>Based on {m.citedDocs.join(", ")}</div>}
              {!isMe && m.degraded && <div style={{ fontSize: 11, color: t.textMut, marginTop: 3 }}>Working from the written procedure only right now.</div>}
              {isMe && m.status === "failed" && <div style={{ fontSize: 11, color: RD, marginTop: 3, textAlign: "right" }}>Not sent. {m.error} <button onClick={() => retry(m)} disabled={busy} style={{ background: "none", border: "none", color: busy ? t.textMut : t.goldText, fontWeight: 600, fontSize: 11, cursor: busy ? "default" : "pointer", fontFamily: FONT_BODY, padding: "4px 6px" }}>Retry</button></div>}
            </div>
          </div>); })}
        <div ref={endRef} />
      </div>
      {(photos.length > 0 || photoNote) && <div style={{ padding: "10px 16px 0", borderTop: "1px solid " + t.border }}>
        {photos.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {photos.map(p => (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 6, padding: 4, borderRadius: R.sm, border: "1px solid " + (p.status === "failed" ? RD : t.border), background: t.cardAlt, maxWidth: "100%" }}>
              {p.url ? <img src={p.url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, display: "block", flexShrink: 0 }} /> : <div style={{ width: 56, height: 56, borderRadius: 6, background: t.hover, flexShrink: 0 }} />}
              <div style={{ fontSize: 11, minWidth: 0, maxWidth: 160 }}>
                {p.status === "uploading" && <div style={{ color: t.textMut }}>Uploading...</div>}
                {p.status === "failed" && <div style={{ color: RD, wordBreak: "break-word" }}>{p.error} <button onClick={() => retryUpload(p)} disabled={busy || !p.blob} style={{ background: "none", border: "none", color: t.goldText, fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: FONT_BODY, padding: "4px 6px" }}>Try again</button></div>}
              </div>
              <button onClick={() => removePhoto(p.key)} aria-label="Remove photo" disabled={busy} style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "transparent", cursor: busy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><XI sz={16} c={t.textSec} /></button>
            </div>
          ))}
        </div>}
        {photoNote && <div style={{ fontSize: 11, color: RD, marginTop: photos.length > 0 ? 8 : 0 }}>{photoNote}</div>}
      </div>}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: photos.length > 0 || photoNote ? "none" : "1px solid " + t.border, alignItems: "flex-end" }}>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onPick} style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current?.click()} aria-label="Add a photo" disabled={!canPick} title={photosFull ? "You can send up to 3 photos with one message." : "Add a photo"} style={{ width: 44, height: 44, borderRadius: "50%", background: t.cardAlt, border: "1px solid " + t.border, cursor: canPick ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: canPick ? 1 : 0.5 }}><CamI sz={18} c={t.textSec} /></button>
        <div ref={composerRef} style={{ flex: 1, minWidth: 0 }}><TArea t={t} value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey} onPaste={onPaste} disabled={busy} rows={1} placeholder="Describe what happened" aria-label="Describe what happened" style={{ minHeight: 44, resize: "none", borderRadius: 14 }} /></div>
        <button onClick={send} aria-label="Send" disabled={!canSend} style={{ width: 44, height: 44, borderRadius: "50%", background: canSend ? "linear-gradient(135deg," + GO + "," + GL + ")" : t.cardAlt, border: "none", cursor: canSend ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SnI sz={16} c={canSend ? NAVY : t.textMut} /></button>
      </div>
    </Crd>
  </div>);
}
// ===== WHO GETS TOLD: the people and addresses told about each kind of report =====
const RECIPIENTS_INTRO = "Choose who hears about each kind of report. People get an email and a notice in the app. Outside addresses get email only. When nobody is set, every admin gets a notice in the app.";
const HR_CASE_NOTE = "Used by Speak Up. People only, never outside addresses. Nothing uses this until the Speak Up update.";
const HR_FALLBACK_NOTE = "Told when everyone else on the team is named in a report.";
const FORM_SUB_NOTE = "These people are told about this form as well as anyone under Every form.";
const FORM_PDF_NOTE = "Every email about this form carries everything the report says, to every person and address on these lists.";
const BOTH_OFF = "Keep at least one of Email or In app on.";
function WhoGetsToldPanel({ af, showToast, t, allStaff = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [picks, setPicks] = useState({});
  const [emails, setEmails] = useState({});
  const [confirming, setConfirming] = useState(null);
  // The choice a form is being moved to, held only while the PATCH is in flight. A refusal drops
  // it, which puts the control back on what the server holds.
  const [deliveryPending, setDeliveryPending] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setFailed("");
    try { const d = await af("/api/notification-recipients"); setData(d || {}); }
    catch (e) { setData(null); setFailed(e.message || "Request failed"); }
    setLoading(false);
  }, [af]);
  useEffect(() => { load(); }, [load]);

  const slotKey = (type, key) => type + "|" + (key || "");
  const setErr = (slot, msg) => setErrors(p => ({ ...p, [slot]: msg }));
  const after = (slot) => { setErr(slot, ""); showToast("Saved"); load(); };
  const post = async (slot, body) => {
    if (busy) return;
    setBusy(true); setErr(slot, "");
    try { await af("/api/notification-recipients", { method: "POST", body }); setPicks(p => ({ ...p, [slot]: "" })); setEmails(p => ({ ...p, [slot]: "" })); after(slot); }
    catch (e) { setErr(slot, e.message || "Request failed"); }
    setBusy(false);
  };
  const patch = async (slot, id, body) => {
    if (busy) return;
    setBusy(true); setErr(slot, "");
    try { await af("/api/notification-recipients/" + encodeURIComponent(id), { method: "PATCH", body }); after(slot); }
    catch (e) { setErr(slot, e.message || "Request failed"); }
    setBusy(false);
  };
  const remove = async (slot, id) => {
    if (busy) return;
    setBusy(true); setErr(slot, "");
    try { await af("/api/notification-recipients/" + encodeURIComponent(id), { method: "DELETE" }); setConfirming(null); after(slot); }
    catch (e) { setErr(slot, e.message || "Request failed"); setConfirming(null); }
    setBusy(false);
  };
  const setFormDelivery = async (slot, code, value) => {
    if (busy) return;
    setBusy(true); setErr(slot, ""); setDeliveryPending(p => ({ ...p, [code]: value }));
    const done = () => setDeliveryPending(p => { const n = { ...p }; delete n[code]; return n; });
    try { await af("/api/notification-recipients/forms/" + encodeURIComponent(code), { method: "PATCH", body: { delivery: value } }); done(); after(slot); }
    catch (e) { done(); setErr(slot, e.message || "Request failed"); }
    setBusy(false);
  };
  const toggle = (slot, r, field) => {
    const next = { viaEmail: r.viaEmail, viaInApp: r.viaInApp, [field]: !r[field] };
    if (!next.viaEmail && !next.viaInApp) { setErr(slot, BOTH_OFF); return; }
    patch(slot, r.id, { [field]: !r[field] });
  };

  const rowsFor = (type, key) => ((data && data.recipients) || []).filter(r => r.isActive && r.subjectType === type && String(r.subjectKey || "") === String(key || ""));
  const staffOptions = (slot, rows) => {
    const taken = new Set(rows.filter(r => r.user).map(r => String(r.user.id)));
    return allStaff.filter(u => u && u.role !== "client_contact" && (!u.status || u.status === "active") && !taken.has(String(u.id)))
      .map(u => ({ v: String(u.id), l: ((u.firstName || "") + " " + (u.lastName || "")).trim() + (u.role ? " (" + u.role + ")" : "") }));
  };

  const deliveryBtn = (slot, form, value, label, ariaName, current) => <button key={value} onClick={() => setFormDelivery(slot, form.code, value)} disabled={busy} aria-label={label + " for " + ariaName} style={{ minHeight: 44, padding: "0 12px", borderRadius: R.sm, border: "1px solid " + (current === value ? GO : t.border), background: current === value ? t.goldBg : "transparent", color: current === value ? t.goldText : t.textMut, fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY, cursor: "pointer" }}>{label}</button>;

  const renderSection = ({ type, key2, title, note, allowEmail, ariaName, form }) => {
    const slot = slotKey(type, key2);
    const rows = rowsFor(type, key2);
    const opts = staffOptions(slot, rows);
    const err = errors[slot];
    // How this form's email carries the report. Every form starts on the link to the app.
    const delivery = form ? (deliveryPending[form.code] || form.delivery || "app_link") : "";
    return (<div key={slot} style={{ marginTop: title ? 14 : 0 }}>
      {title && <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 2 }}>{title}</div>}
      {note && <div style={{ fontSize: 11, color: t.textMut, marginBottom: 8 }}>{note}</div>}
      {form && <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {deliveryBtn(slot, form, "app_link", "Link to the app", ariaName, delivery)}
          {deliveryBtn(slot, form, "pdf", "Attach the filled report as a PDF", ariaName, delivery)}
        </div>
        {delivery === "pdf" && <div style={{ fontSize: 11, color: t.textMut, marginTop: 6 }}>{FORM_PDF_NOTE}</div>}
      </div>}
      {rows.length === 0 && <div style={{ fontSize: 12, color: t.textMut, padding: "6px 0" }}>Nobody set. Every admin gets a notice in the app.</div>}
      {rows.map(r => {
        const who = r.user ? r.user.name + (r.user.role ? " (" + r.user.role + ")" : "") : r.email;
        return (<div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid " + t.border }}>
          <div style={{ flex: 1, minWidth: 140, fontSize: 13, color: t.text }}>{who}</div>
          {r.user ? (<>
            <button onClick={() => toggle(slot, r, "viaEmail")} disabled={busy} style={{ minHeight: 44, padding: "0 12px", borderRadius: R.sm, border: "1px solid " + (r.viaEmail ? GO : t.border), background: r.viaEmail ? t.goldBg : "transparent", color: r.viaEmail ? t.goldText : t.textMut, fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY, cursor: "pointer" }}>Email</button>
            <button onClick={() => toggle(slot, r, "viaInApp")} disabled={busy} style={{ minHeight: 44, padding: "0 12px", borderRadius: R.sm, border: "1px solid " + (r.viaInApp ? GO : t.border), background: r.viaInApp ? t.goldBg : "transparent", color: r.viaInApp ? t.goldText : t.textMut, fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY, cursor: "pointer" }}>In app</button>
          </>) : <span style={{ fontSize: 12, color: t.textMut }}>Email only</span>}
          <button onClick={() => setConfirming({ slot, id: r.id, who })} disabled={busy} style={{ minHeight: 44, padding: "0 12px", background: "none", border: "none", color: RD, fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY, cursor: "pointer" }}>Remove</button>
        </div>);
      })}
      {confirming && confirming.slot === slot && <div style={{ padding: "8px 0", fontSize: 12, color: t.text }}>
        <div style={{ marginBottom: 6 }}>Stop telling {confirming.who} about this?</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn t={t} v="danger" aria-label={"Remove " + confirming.who} onClick={() => remove(slot, confirming.id)} disabled={busy} style={{ minHeight: 44 }}>Remove</Btn>
          <Btn t={t} v="ghost" aria-label={"Cancel removing " + confirming.who} onClick={() => setConfirming(null)} disabled={busy} style={{ minHeight: 44 }}>Cancel</Btn>
        </div>
      </div>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <div style={{ flex: 1, minWidth: 180 }}><Sel t={t} aria-label={"Add a person to " + ariaName} value={picks[slot] || ""} onChange={e => setPicks(p => ({ ...p, [slot]: e.target.value }))} options={[{ v: "", l: "Add a person" }, ...opts]} /></div>
        <Btn t={t} onClick={() => post(slot, { subjectType: type, ...(key2 ? { subjectKey: key2 } : {}), userId: picks[slot] })} disabled={busy || !picks[slot]} style={{ minHeight: 44 }}>Add</Btn>
      </div>
      {allowEmail && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
        <div style={{ flex: 1, minWidth: 180 }}><Inp t={t} type="email" aria-label={"Add an email address to " + ariaName} placeholder="Add an email address" value={emails[slot] || ""} onChange={e => setEmails(p => ({ ...p, [slot]: e.target.value }))} style={{ minHeight: 44 }} /></div>
        <Btn t={t} onClick={() => post(slot, { subjectType: type, ...(key2 ? { subjectKey: key2 } : {}), email: (emails[slot] || "").trim() })} disabled={busy || !(emails[slot] || "").trim()} style={{ minHeight: 44 }}>Add</Btn>
      </div>}
      {err && <div style={{ fontSize: 12, color: RD, marginTop: 8 }}>{err}</div>}
    </div>);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Loading...</div>;
  if (failed) return <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: t.textSec }}>{failed} <button onClick={load} style={{ minHeight: 44, background: "none", border: "none", color: t.goldText, fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY, cursor: "pointer" }}>Try again</button></div>;
  const types = (data && Array.isArray(data.types) ? data.types : []);
  const forms = (data && Array.isArray(data.forms) ? data.forms : []);
  return (<div>
    <div style={{ fontSize: 12, color: t.textSec, marginBottom: 14, lineHeight: 1.5 }}>{RECIPIENTS_INTRO}</div>
    {types.map(ty => (<Crd t={t} key={ty.type} style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text }}>{ty.label}</div>
      {ty.type === "hr_case" && <div style={{ fontSize: 11, color: t.textMut, marginTop: 4 }}>{HR_CASE_NOTE}</div>}
      {ty.type === "hr_case_fallback" && <div style={{ fontSize: 11, color: t.textMut, marginTop: 4 }}>{HR_CASE_NOTE} {HR_FALLBACK_NOTE}</div>}
      {ty.keyed && ty.type === "form" ? (<>
        {renderSection({ type: ty.type, key2: "", title: "Every form", allowEmail: ty.allowOutsideEmail, ariaName: "Every form" })}
        {forms.map(f => renderSection({ type: ty.type, key2: f.code, title: f.title + " (" + f.code + ")", note: FORM_SUB_NOTE, allowEmail: ty.allowOutsideEmail, ariaName: f.title + " (" + f.code + ")", form: f }))}
      </>) : renderSection({ type: ty.type, key2: "", allowEmail: ty.allowOutsideEmail, ariaName: ty.label })}
    </Crd>))}
  </div>);
}

// ===== NOTIFICATIONS: the bell's panel =====
// "5m", "3h", "2d", then a date after 7 days.
const notifAgo = (iso) => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 60) return Math.max(1, mins) + "m";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h";
  const days = Math.floor(hrs / 24);
  return days <= 7 ? days + "d" : fd(iso);
};
// A link inside this dashboard opens its page without a reload; anything else opens in a new tab.
const notifTarget = (link) => {
  if (!link) return { kind: "none" };
  let u; try { u = new URL(link, window.location.href); } catch { return { kind: "none" }; }
  if (u.origin !== window.location.origin) return { kind: "external", href: u.href };
  const id = (u.hash || "").replace(/^#/, "");
  return PAGE_IDS.includes(id) ? { kind: "page", page: id } : { kind: "external", href: u.href };
};
const NOTIF_PAGE_SIZE = 30;
function NotificationPanel({ af, t, unread, onClose, onUnread, onOpenPage, onOpenHash, canOpenPage, onRefused }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  const fetchPage = useCallback(async (before) => {
    setLoading(true); setFailed(false);
    try {
      const d = await af("/api/notifications?limit=" + NOTIF_PAGE_SIZE + (before ? "&before=" + encodeURIComponent(before) : ""));
      const list = d && Array.isArray(d.notifications) ? d.notifications : [];
      setRows(prev => before ? [...prev, ...list] : list);
      setMore(list.length === NOTIF_PAGE_SIZE);
      if (d && d.unread != null) onUnread(Number(d.unread) || 0);
    } catch (e) { if (!before) setRows([]); setFailed(true); console.warn("Notifications:", e.message); }
    setLoading(false);
  }, [af, onUnread]);
  useEffect(() => { fetchPage(null); }, [fetchPage]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // A notice can point at a page this person cannot open. The panel closes and says one line rather
  // than leaving them on a page that draws nothing for them. The notice itself stays in the list.
  const refuse = () => { onClose(); onRefused(); };
  const openRow = async (n) => {
    if (busy) return;
    setBusy(true);
    if (!n.readAt) { try { await af("/api/notifications/" + encodeURIComponent(n.id) + "/read", { method: "POST" }); } catch (e) { console.warn("Mark read:", e.message); } }
    setBusy(false);
    // A form notice carries the report it is about, so it opens that report rather than the page.
    if (n.subjectType === "form" && n.subjectId) { if (!canOpenPage("forms")) { refuse(); return; } onOpenHash("forms/reports/" + n.subjectId); onClose(); return; }
    const target = notifTarget(n.link);
    if (target.kind === "page") { if (!canOpenPage(target.page)) { refuse(); return; } onOpenPage(target.page); }
    else if (target.kind === "external") window.open(target.href, "_blank", "noopener");
    onClose();
  };
  const markAll = async () => {
    if (busy || unread === 0) return;
    setBusy(true);
    try { await af("/api/notifications/read-all", { method: "POST" }); const now = new Date().toISOString(); setRows(prev => prev.map(r => r.readAt ? r : { ...r, readAt: now })); onUnread(0); }
    catch (e) { console.warn("Mark all read:", e.message); }
    setBusy(false);
  };

  return (<>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
    <div ref={boxRef} role="dialog" aria-label="Notifications" style={{ position: "absolute", top: 46, right: 0, width: "min(420px, calc(100vw / var(--zoom, 1) - 32px))", maxHeight: "calc(70vh / var(--zoom, 1))", overflowY: "auto", background: t.card, border: "1px solid " + t.border, borderRadius: 12, boxShadow: t.popShadow, zIndex: 61 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", borderBottom: "1px solid " + t.border, position: "sticky", top: 0, background: t.card }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text }}>Notifications</div>
        <button onClick={markAll} disabled={busy || unread === 0} style={{ minHeight: 44, padding: "0 10px", background: "none", border: "none", color: unread === 0 ? t.textMut : t.goldText, fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY, cursor: unread === 0 ? "default" : "pointer" }}>Mark all read</button>
      </div>
      {failed && rows.length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: t.textSec }}>Notifications did not load. <button onClick={() => fetchPage(null)} style={{ minHeight: 44, background: "none", border: "none", color: t.goldText, fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY, cursor: "pointer" }}>Try again</button></div>}
      {!failed && !loading && rows.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: t.textMut }}>Nothing yet.</div>}
      {loading && rows.length === 0 && !failed && <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: t.textMut }}>Loading...</div>}
      {rows.map(n => (
        <button key={n.id} onClick={() => openRow(n)} disabled={busy} style={{ display: "flex", gap: 10, alignItems: "flex-start", width: "100%", minHeight: 44, padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid " + t.border, textAlign: "left", cursor: busy ? "default" : "pointer", fontFamily: FONT_BODY }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: n.readAt ? "transparent" : GO, flexShrink: 0, marginTop: 6 }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: n.readAt ? 400 : 700, color: t.text }}>{n.title}</span>
            {n.body && <span style={{ display: "block", fontSize: 12, color: t.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{n.body}</span>}
          </span>
          <span style={{ fontSize: 11, color: t.textMut, flexShrink: 0, marginTop: 2 }}>{notifAgo(n.createdAt)}</span>
        </button>
      ))}
      {more && <div style={{ padding: 8, textAlign: "center" }}><button onClick={() => fetchPage(rows[rows.length - 1].createdAt)} disabled={loading} style={{ minHeight: 44, padding: "0 14px", background: "none", border: "none", color: t.goldText, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, cursor: "pointer" }}>{loading ? "Loading..." : "Load more"}</button></div>}
    </div>
  </>);
}

// ===== REPORTING ENGINE: shared helpers, reusable widgets, builder =====
const num = (v, f) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : f; };
const fmtDurMin = (m) => {
  if (m === null || m === undefined) return "n/a";
  if (m < 60) return Math.round(m) + "m";
  if (m < 1440) { const h = Math.floor(m / 60); const mm = Math.round(m % 60); return mm ? (h + "h " + mm + "m") : (h + "h"); }
  const d = Math.floor(m / 1440); const h = Math.floor((m % 1440) / 60); return h ? (d + "d " + h + "h") : (d + "d");
};
const fmtPctVal = (p) => (p === null || p === undefined) ? "n/a" : (p + "%");
const hrsFromMin = (m) => m === null || m === undefined ? null : Math.round(m / 60 * 10) / 10;
const fmtBucketDate = (s) => { try { return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) { return s; } };
const resolvePreset = (key) => (PRESETS[key] ? PRESETS[key]() : PRESETS.last30());

const REPORT_PRESETS = [
  { key: "last30", label: "Last 30 Days" },
  { key: "last60", label: "Last 60 Days" },
  { key: "last90", label: "Last 90 Days" },
  { key: "thisMonth", label: "This Month" },
];

const ISSUE_SOURCE_KEY = "issues_timing";
const ISSUE_SOURCE_ALIASES = ["issues_timing", "issues"];
const isIssueSource = (key) => ISSUE_SOURCE_ALIASES.includes(key);
const REPORT_SOURCES = [
  { key: ISSUE_SOURCE_KEY, label: "Issue Response and Resolution", category: "Service Delivery", available: true },
  { key: "supply_usage", label: "Supply Usage and Cost", category: "Supplies", available: true },
  { key: "inspection_quality", label: "Inspection and Quality", category: "Quality", available: true },
];
const sourceLabel = (key) => { if (isIssueSource(key)) return "Issue Response and Resolution"; const s = REPORT_SOURCES.find(x => x.key === key); return s ? s.label : key; };
const sourceAvailable = (key) => { if (isIssueSource(key)) return true; const s = REPORT_SOURCES.find(x => x.key === key); return s ? s.available : false; };
const prettyCat = (c) => String(c || "Other").replace(/_/g, " ");

const defaultIssueConfig = () => ({
  date_range: { preset: "last30" },
  bucket: "week",
  filters: { site_id: "", severity: "" },
  sla_targets: {
    high: { first_response_minutes: 60, resolution_minutes: 240 },
    medium: { first_response_minutes: 240, resolution_minutes: 1440 },
    low: { first_response_minutes: 1440, resolution_minutes: 4320 },
  },
  output: { trend: true, by_site: true, severity: true, sla: false },
  branding: { use_company_settings: true },
});

const readIssueConfig = (cfg) => {
  const d = defaultIssueConfig();
  const c = cfg && typeof cfg === "object" ? cfg : {};
  const dr = c.date_range && typeof c.date_range === "object" ? c.date_range : {};
  const fl = c.filters && typeof c.filters === "object" ? c.filters : {};
  const st = c.sla_targets && typeof c.sla_targets === "object" ? c.sla_targets : {};
  const sh = st.high || {}, smd = st.medium || {}, sl = st.low || {};
  const ou = c.output && typeof c.output === "object" ? c.output : {};
  const br = c.branding && typeof c.branding === "object" ? c.branding : {};
  return {
    date_range: { preset: dr.preset || d.date_range.preset, start: dr.start || null, end: dr.end || null },
    bucket: c.bucket || d.bucket,
    filters: { site_id: fl.site_id || "", severity: fl.severity || "" },
    sla_targets: {
      high: { first_response_minutes: num(sh.first_response_minutes, d.sla_targets.high.first_response_minutes), resolution_minutes: num(sh.resolution_minutes, d.sla_targets.high.resolution_minutes) },
      medium: { first_response_minutes: num(smd.first_response_minutes, d.sla_targets.medium.first_response_minutes), resolution_minutes: num(smd.resolution_minutes, d.sla_targets.medium.resolution_minutes) },
      low: { first_response_minutes: num(sl.first_response_minutes, d.sla_targets.low.first_response_minutes), resolution_minutes: num(sl.resolution_minutes, d.sla_targets.low.resolution_minutes) },
    },
    output: { trend: ou.trend !== false, by_site: ou.by_site !== false, severity: ou.severity !== false, sla: ou.sla === true },
    branding: { use_company_settings: br.use_company_settings !== false },
  };
};

const SUPPLY_SOURCE_KEY = "supply_usage";
const isSupplySource = (key) => key === SUPPLY_SOURCE_KEY;

const defaultSupplyConfig = () => ({
  date_range: { preset: "last30" },
  bucket: "week",
  filters: { site_id: "", category: "" },
  output: { trend: true, by_site: true, top_supplies: true, green_share: true },
  branding: { use_company_settings: true },
});

const readSupplyConfig = (cfg) => {
  const d = defaultSupplyConfig();
  const c = cfg && typeof cfg === "object" ? cfg : {};
  const dr = c.date_range && typeof c.date_range === "object" ? c.date_range : {};
  const fl = c.filters && typeof c.filters === "object" ? c.filters : {};
  const ou = c.output && typeof c.output === "object" ? c.output : {};
  const br = c.branding && typeof c.branding === "object" ? c.branding : {};
  return {
    date_range: { preset: dr.preset || d.date_range.preset, start: dr.start || null, end: dr.end || null },
    bucket: c.bucket || d.bucket,
    filters: { site_id: fl.site_id || "", category: fl.category || "" },
    output: { trend: ou.trend !== false, by_site: ou.by_site !== false, top_supplies: ou.top_supplies !== false, green_share: ou.green_share !== false },
    branding: { use_company_settings: br.use_company_settings !== false },
  };
};

const INSPECTION_SOURCE_KEY = "inspection_quality";
const isInspectionSource = (key) => key === INSPECTION_SOURCE_KEY;

const defaultInspectionConfig = () => ({
  date_range: { preset: "last90" },
  filters: { site_id: "" },
  output: { trend: true, by_site: true, lowest_items: true },
  branding: { use_company_settings: true },
});

const readInspectionConfig = (cfg) => {
  const d = defaultInspectionConfig();
  const c = cfg && typeof cfg === "object" ? cfg : {};
  const dr = c.date_range && typeof c.date_range === "object" ? c.date_range : {};
  const fl = c.filters && typeof c.filters === "object" ? c.filters : {};
  const ou = c.output && typeof c.output === "object" ? c.output : {};
  const br = c.branding && typeof c.branding === "object" ? c.branding : {};
  return {
    date_range: { preset: dr.preset || d.date_range.preset, start: dr.start || null, end: dr.end || null },
    filters: { site_id: fl.site_id || "" },
    output: { trend: ou.trend !== false, by_site: ou.by_site !== false, lowest_items: ou.lowest_items !== false },
    branding: { use_company_settings: br.use_company_settings !== false },
  };
};

// Reusable presentational widgets. These take an already-fetched issue-timing
// payload and theme, so the same widget renders inside a report and (later) on
// the home dashboard.
const MetricTile = ({ label, value, sub, color, t }) => (
  <div style={{ border: "1px solid " + t.border, borderRadius: R.md, padding: "12px 14px" }}>
    <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600, color: color || t.text }}>{value}</div>
    <div style={{ fontSize: 10.5, color: t.textMut, marginTop: 2 }}>{label}</div>
    {sub ? <div style={{ fontSize: 10, color: OR, marginTop: 1 }}>{sub}</div> : null}
  </div>
);

const IssueTrendWidget = ({ timing, t }) => {
  const trend = (timing && timing.trend) ? timing.trend : [];
  const cats = trend.map(b => fmtBucketDate(b.bucket_start));
  const series = [
    { name: "Resolution (h, median)", data: trend.map(b => hrsFromMin(b.resolution_median_minutes)) },
    { name: "First response (h, median)", data: trend.map(b => hrsFromMin(b.first_response_median_minutes)) },
  ];
  const hasData = series.some(s => s.data.some(v => v !== null && v !== undefined));
  return (
    <ChartCard t={t} title="Resolution and response trend" sub={"Median hours per " + ((timing && timing.bucket) ? timing.bucket : "week")}>
      {cats.length && hasData ? <LineChartW categories={cats} series={series} t={t} colors={[GO, BL]} /> :
        <div style={{ fontSize: 12, color: t.textMut, padding: "12px 2px" }}>Not enough resolved data to chart a trend yet.</div>}
    </ChartCard>
  );
};

const IssueBySiteWidget = ({ timing, t }) => {
  const rows = ((timing && timing.by_site) ? timing.by_site : []).filter(s => s.resolution_median_minutes !== null);
  if (rows.length < 2) return null;
  return (
    <ChartCard t={t} title="Median resolution by site" sub="Hours, lower is better">
      <BarChartW categories={rows.map(s => s.site_name)} values={rows.map(s => hrsFromMin(s.resolution_median_minutes))} t={t} valueSuffix="h" name="Median resolution (h)" />
    </ChartCard>
  );
};

const IssueSeverityWidget = ({ timing, t }) => {
  const sm = timing && timing.summary;
  const vals = sm ? [sm.open_by_severity.high, sm.open_by_severity.medium, sm.open_by_severity.low] : [0, 0, 0];
  if (!vals.some(v => v > 0)) return null;
  return (
    <ChartCard t={t} title="Open issues by severity" sub="Currently open">
      <DonutChartW labels={["High", "Medium", "Low"]} values={vals} t={t} colors={[RD, OR, GO]} />
    </ChartCard>
  );
};

const SlaComplianceTrendWidget = ({ timing, t }) => {
  const trend = (timing && timing.trend) ? timing.trend : [];
  const cats = trend.map(b => fmtBucketDate(b.bucket_start));
  const pct = (v) => (v === null || v === undefined) ? null : v;
  const series = [
    { name: "Resolution SLA %", data: trend.map(b => pct(b.sla_resolution_compliance_pct)) },
    { name: "Response SLA %", data: trend.map(b => pct(b.sla_response_compliance_pct)) },
  ];
  const hasData = series.some(s => s.data.some(v => v !== null && v !== undefined));
  const totalBreaches = trend.reduce((a, b) => a + (b.resolution_breach_count || 0) + (b.response_breach_count || 0), 0);
  return (
    <ChartCard t={t} title="SLA compliance trend" sub={"Resolution and response compliance percent per " + ((timing && timing.bucket) ? timing.bucket : "week")}>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: totalBreaches > 0 ? RD : GR }}>{totalBreaches}</span>
        <span style={{ fontSize: 11, color: t.textMut, marginLeft: 6 }}>SLA breaches in range</span>
      </div>
      {cats.length && hasData ? <LineChartW categories={cats} series={series} t={t} colors={[GR, BL]} /> :
        <div style={{ fontSize: 12, color: t.textMut, padding: "12px 2px" }}>Not enough resolved data to chart compliance yet.</div>}
    </ChartCard>
  );
};

const SlaBySiteWidget = ({ timing, t }) => {
  const rows = ((timing && timing.by_site) ? timing.by_site : []).filter(s => s.sla_resolution_compliance_pct !== null && s.sla_resolution_compliance_pct !== undefined);
  if (rows.length < 2) return null;
  return (
    <ChartCard t={t} title="Resolution SLA by site" sub="Compliance percent, higher is better">
      <BarChartW categories={rows.map(s => s.site_name)} values={rows.map(s => s.sla_resolution_compliance_pct)} t={t} valueSuffix="%" name="Resolution SLA %" />
    </ChartCard>
  );
};

// Composite run view for the issue source. Seeds its controls from the saved
// definition config, applies the saved SLA targets, and renders the widgets.
function IssueTimingReport({ af, t, sites, settings, config, showToast }) {
  const cfg = readIssueConfig(config);
  const [dateRange, setDateRange] = useState(() => (cfg.date_range.start && cfg.date_range.end) ? { start: cfg.date_range.start, end: cfg.date_range.end } : resolvePreset(cfg.date_range.preset));
  const [siteFilter, setSiteFilter] = useState(cfg.filters.site_id || "");
  const [sevFilter, setSevFilter] = useState(cfg.filters.severity || "");
  const [bucket, setBucket] = useState(cfg.bucket || "week");
  const [timing, setTiming] = useState(null);
  const [loading, setLoading] = useState(false);

  const slaQuery = () => {
    const s = cfg.sla_targets;
    return "&hi_fr=" + s.high.first_response_minutes + "&hi_res=" + s.high.resolution_minutes
      + "&med_fr=" + s.medium.first_response_minutes + "&med_res=" + s.medium.resolution_minutes
      + "&low_fr=" + s.low.first_response_minutes + "&low_res=" + s.low.resolution_minutes;
  };

  const load = (range) => {
    const r = range || dateRange;
    setLoading(true);
    let q = "?start_date=" + r.start + "&end_date=" + r.end + "&bucket=" + bucket + slaQuery();
    if (siteFilter) q += "&site_id=" + siteFilter;
    if (sevFilter) q += "&severity=" + sevFilter;
    af("/api/report-engine/issue-timing" + q)
      .then(d => { setTiming(d); setLoading(false); })
      .catch(e => { setLoading(false); showToast("Could not load report: " + e.message, "error"); });
  };

  useEffect(() => { load(); }, [dateRange, siteFilter, sevFilter, bucket]);

  const sm = timing && timing.summary;
  const tgt = timing && timing.sla_targets;
  const hasActivity = !!(sm && (sm.reported_count > 0 || sm.resolved_count > 0 || sm.open_count > 0));
  const out = cfg.output;
  const selSt = { padding: "8px 12px", borderRadius: R.md, border: "1px solid " + t.borderSolid, background: t.card, color: t.text, fontSize: 12, fontFamily: FONT_BODY, cursor: "pointer" };

  const slaColor = (v) => (v === null || v === undefined) ? t.textMut : (v >= 90 ? GR : (v >= 75 ? OR : RD));
  const tiles = sm ? [
    { label: "Median resolution", value: fmtDurMin(sm.resolution_median_minutes), color: t.text },
    { label: "Median first response", value: fmtDurMin(sm.first_response_median_minutes), color: t.text },
    { label: "Resolution SLA", value: fmtPctVal(sm.sla_resolution_compliance_pct), color: slaColor(sm.sla_resolution_compliance_pct) },
    { label: "Response SLA", value: fmtPctVal(sm.sla_response_compliance_pct), color: slaColor(sm.sla_response_compliance_pct) },
    { label: "Open now", value: String(sm.open_count), sub: sm.aging_count + " aging", color: sm.open_count > 0 ? OR : GR },
  ] : [];

  const exportPdf = () => {
    if (!sm) { showToast("No data to export", "error"); return; }
    const useBrand = cfg.branding.use_company_settings;
    const navy = (useBrand && settings && settings.primary_color) || NAVY;
    const gold = (useBrand && settings && settings.secondary_color) || GOLD;
    const cName = (useBrand && settings && (settings.display_name || settings.legal_name)) || clientConfig.company.name;
    const logo = useBrand && settings && settings.logo_url ? settings.logo_url : "";
    const showEin = !!(useBrand && settings && settings.show_ein_on_reports && settings.ein);
    const addr = useBrand && settings && settings.address ? settings.address : "";
    const gen = new Date().toLocaleString();
    const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const siteLabel = siteFilter ? (((sites || []).find(s => s.id === siteFilter) || {}).name || "Selected site") : "All sites";
    const sevLabel = sevFilter ? (sevFilter.charAt(0).toUpperCase() + sevFilter.slice(1)) : "All severities";
    const card = (val, lbl) => '<div class="sc"><div class="v">' + esc(val) + '</div><div class="l">' + esc(lbl) + '</div></div>';
    const summaryCards =
      card(fmtDurMin(sm.resolution_median_minutes), "Median resolution") +
      card(fmtDurMin(sm.first_response_median_minutes), "Median first response") +
      card(fmtPctVal(sm.sla_resolution_compliance_pct), "Resolution SLA") +
      card(fmtPctVal(sm.sla_response_compliance_pct), "Response SLA") +
      card(String(sm.open_count), "Open now") +
      card(String(sm.aging_count), "Aging");
    const trendRows = out.trend ? ((timing && timing.trend ? timing.trend : []).map(b =>
      '<tr><td>' + esc(fmtBucketDate(b.bucket_start)) + '</td><td>' + b.reported_count + '</td><td>' + b.resolved_count + '</td><td>' + fmtDurMin(b.resolution_median_minutes) + '</td><td>' + fmtDurMin(b.first_response_median_minutes) + '</td></tr>'
    ).join("")) : "";
    const trendTable = trendRows ? ('<h2>Trend by ' + esc((timing && timing.bucket) ? timing.bucket : "week") + '</h2><table><thead><tr><th>Period</th><th>Reported</th><th>Resolved</th><th>Median resolution</th><th>Median first response</th></tr></thead><tbody>' + trendRows + '</tbody></table>') : "";
    const tableRows = out.by_site ? ((timing && timing.by_site ? timing.by_site : []).map(s =>
      '<tr><td>' + esc(s.site_name) + '</td><td>' + s.reported_count + '</td><td>' + s.resolved_count + '</td><td>' + s.open_count + '</td><td>' + s.aging_count + '</td><td>' + fmtDurMin(s.resolution_median_minutes) + '</td><td>' + fmtDurMin(s.first_response_median_minutes) + '</td><td>' + fmtPctVal(s.sla_resolution_compliance_pct) + '</td><td>' + fmtPctVal(s.sla_response_compliance_pct) + '</td></tr>'
    ).join("")) : "";
    const siteTable = tableRows ? ('<h2>By site</h2><table><thead><tr><th>Site</th><th>Reported</th><th>Resolved</th><th>Open</th><th>Aging</th><th>Median resolution</th><th>Median first response</th><th>Resolution SLA</th><th>Response SLA</th></tr></thead><tbody>' + tableRows + '</tbody></table>') : "";
    const sv = sm.open_by_severity;
    const sevTable = out.severity ? ('<h2>Open by severity</h2><table><thead><tr><th>High</th><th>Medium</th><th>Low</th></tr></thead><tbody><tr><td>' + sv.high + '</td><td>' + sv.medium + '</td><td>' + sv.low + '</td></tr></tbody></table>') : "";
    const slaPct = (v) => (v === null || v === undefined) ? '-' : (v + '%');
    const slaRows = out.sla ? ((timing && timing.trend ? timing.trend : []).map(b =>
      '<tr><td>' + esc(fmtBucketDate(b.bucket_start)) + '</td><td>' + esc(slaPct(b.sla_resolution_compliance_pct)) + '</td><td>' + esc(slaPct(b.sla_response_compliance_pct)) + '</td><td>' + (b.resolution_breach_count || 0) + '</td><td>' + (b.response_breach_count || 0) + '</td></tr>'
    ).join("")) : "";
    const slaTable = slaRows ? ('<h2>SLA compliance by period</h2><table><thead><tr><th>Period</th><th>Resolution SLA</th><th>Response SLA</th><th>Resolution breaches</th><th>Response breaches</th></tr></thead><tbody>' + slaRows + '</tbody></table>') : "";
    const targetsLine = tgt ? ('<p class="meta">Targets, response then resolution. High ' + fmtDurMin(tgt.high.first_response_minutes) + ' and ' + fmtDurMin(tgt.high.resolution_minutes) + '. Medium ' + fmtDurMin(tgt.medium.first_response_minutes) + ' and ' + fmtDurMin(tgt.medium.resolution_minutes) + '. Low ' + fmtDurMin(tgt.low.first_response_minutes) + ' and ' + fmtDurMin(tgt.low.resolution_minutes) + '. Aging means open past its resolution target.</p>') : "";
    const einLine = showEin ? ('<div>EIN ' + esc(settings.ein) + '</div>') : "";
    const style = '<style>'
      + 'body{font-family:"Segoe UI",Arial,sans-serif;margin:30px;color:#222}'
      + '.brand{display:flex;align-items:center;gap:14px;border-bottom:3px solid ' + gold + ';padding-bottom:10px}'
      + '.brand img{max-height:48px}'
      + '.brand .co{font-size:18px;font-weight:700;color:' + navy + '}'
      + 'h1{color:' + navy + ';font-size:20px;margin:14px 0 2px}'
      + '.meta{font-size:11px;color:#777;margin:2px 0}'
      + 'h2{color:' + navy + ';font-size:15px;margin-top:22px;border-bottom:1px solid #ccc;padding-bottom:4px}'
      + 'table{border-collapse:collapse;width:100%;margin:8px 0}'
      + 'th,td{border:1px solid #ddd;padding:6px 9px;font-size:11px;text-align:left}'
      + 'th{background:' + navy + ';color:' + gold + ';font-weight:600}'
      + 'tr:nth-child(even){background:#f9f9f9}'
      + '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}'
      + '.sc{background:#f5f5f0;border:1px solid #e2e2dc;border-radius:8px;padding:12px;text-align:center}'
      + '.sc .v{font-size:22px;font-weight:700;color:' + navy + '}'
      + '.sc .l{font-size:10px;color:#888;text-transform:uppercase;margin-top:4px}'
      + '.footer{margin-top:28px;border-top:2px solid ' + gold + ';padding-top:8px;font-size:10px;color:#888;text-align:center}'
      + '@media print{body{margin:16px}}'
      + '</style>';
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Issue Response and Resolution</title>'
      + style + '</head><body>'
      + '<div class="brand">' + (logo ? ('<img src="' + esc(logo) + '" />') : '') + '<div class="co">' + esc(cName) + '</div></div>'
      + '<h1>Issue Response and Resolution</h1>'
      + '<p class="meta">' + esc(siteLabel) + ' &middot; ' + esc(sevLabel) + ' &middot; ' + esc(dateRange.start) + ' to ' + esc(dateRange.end) + ' &middot; generated ' + esc(gen) + '</p>'
      + '<div class="grid">' + summaryCards + '</div>'
      + targetsLine + trendTable + siteTable + sevTable + slaTable
      + '<div class="footer">' + esc(cName) + (addr ? (' &middot; ' + esc(addr)) : "") + einLine + '</div>'
      + '</body></html>';
    const w = window.open("", "_blank");
    if (!w) { showToast("Allow pop-ups to export the PDF", "error"); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  return (<div>
    <DateRangePicker value={dateRange} onChange={setDateRange} t={t} presets={REPORT_PRESETS} />
    <div style={{ marginBottom: 16 }}>
      <ChartCard t={t} title="Issue Response and Resolution" sub="Response time, resolution time, and service level compliance" action={hasActivity ? "Export PDF" : null} onAction={exportPdf}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} style={selSt}>
            <option value="">All sites</option>
            {(sites || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} style={selSt}>
            <option value="">All severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={bucket} onChange={e => setBucket(e.target.value)} style={selSt}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
        {loading && !timing ? <div style={{ fontSize: 12, color: t.textMut, padding: "8px 2px" }}>Loading...</div> :
          !hasActivity ? <div style={{ fontSize: 12, color: t.textMut, padding: "8px 2px" }}>No issue activity in this range yet.</div> :
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 8 }}>
              {tiles.map((s, i) => <MetricTile key={i} t={t} label={s.label} value={s.value} sub={s.sub} color={s.color} />)}
            </div>
            {tgt ? <div style={{ fontSize: 10.5, color: t.textMut, marginTop: 6 }}>
              Targets, response then resolution. High {fmtDurMin(tgt.high.first_response_minutes)} and {fmtDurMin(tgt.high.resolution_minutes)}. Medium {fmtDurMin(tgt.medium.first_response_minutes)} and {fmtDurMin(tgt.medium.resolution_minutes)}. Low {fmtDurMin(tgt.low.first_response_minutes)} and {fmtDurMin(tgt.low.resolution_minutes)}. Aging means open past its resolution target.
            </div> : null}
          </div>}
      </ChartCard>
    </div>
    {hasActivity ? <div>
      {out.trend ? <div style={{ marginBottom: 16 }}><IssueTrendWidget timing={timing} t={t} /></div> : null}
      {out.sla ? <div style={{ marginBottom: 16 }}><SlaComplianceTrendWidget timing={timing} t={t} /></div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        {out.by_site ? <IssueBySiteWidget timing={timing} t={t} /> : null}
        {out.sla ? <SlaBySiteWidget timing={timing} t={t} /> : null}
        {out.severity ? <IssueSeverityWidget timing={timing} t={t} /> : null}
      </div>
    </div> : null}
  </div>);
}

const SupplyCostTrendWidget = ({ data, t }) => {
  const trend = (data && data.trend) ? data.trend : [];
  const cats = trend.map(b => fmtBucketDate(b.bucket_start));
  const series = [{ name: "Estimated cost", data: trend.map(b => b.estimated_cost) }];
  const hasData = trend.some(b => b.estimated_cost > 0);
  return (
    <ChartCard t={t} title="Estimated cost trend" sub={"Estimated supply cost per " + ((data && data.bucket) ? data.bucket : "week")}>
      {cats.length && hasData ? <LineChartW categories={cats} series={series} t={t} colors={[GO]} /> :
        <div style={{ fontSize: 12, color: t.textMut, padding: "12px 2px" }}>No supply usage in this range yet.</div>}
    </ChartCard>
  );
};

const SupplyCostBySiteWidget = ({ data, t }) => {
  const rows = ((data && data.by_site) ? data.by_site : []).filter(s => s.estimated_cost > 0);
  if (rows.length < 1) return null;
  return (
    <ChartCard t={t} title="Estimated cost by site" sub="Higher means more spend">
      <BarChartW categories={rows.map(s => s.site_name)} values={rows.map(s => s.estimated_cost)} t={t} name="Estimated cost (USD)" />
    </ChartCard>
  );
};

const SupplyTopSuppliesWidget = ({ data, t }) => {
  const rows = ((data && data.by_supply) ? data.by_supply : []).filter(s => s.estimated_cost > 0).slice(0, 10);
  if (rows.length < 1) return null;
  return (
    <ChartCard t={t} title="Top supplies by cost" sub="Estimated cost, top 10">
      <BarChartW categories={rows.map(s => s.supply_name)} values={rows.map(s => s.estimated_cost)} t={t} horizontal={true} name="Estimated cost (USD)" />
    </ChartCard>
  );
};

const SupplyGreenShareWidget = ({ data, t }) => {
  const gs = data && data.green_split;
  const vals = gs ? [gs.green_cost, gs.non_green_cost] : [0, 0];
  if (!vals.some(v => v > 0)) return null;
  return (
    <ChartCard t={t} title="Green-certified share of cost" sub="Estimated cost split">
      <DonutChartW labels={["Green certified", "Other"]} values={vals} t={t} colors={[GR, OR]} />
    </ChartCard>
  );
};

function SupplyUsageReport({ af, t, sites, settings, config, showToast }) {
  const cfg = readSupplyConfig(config);
  const [dateRange, setDateRange] = useState(() => resolvePreset(cfg.date_range.preset));
  const [siteFilter, setSiteFilter] = useState(cfg.filters.site_id || "");
  const [catFilter, setCatFilter] = useState(cfg.filters.category || "");
  const [bucket, setBucket] = useState(cfg.bucket || "week");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = (range) => {
    const r = range || dateRange;
    setLoading(true);
    let q = "?start_date=" + r.start + "&end_date=" + r.end + "&bucket=" + bucket;
    if (siteFilter) q += "&site_id=" + siteFilter;
    if (catFilter) q += "&category=" + catFilter;
    af("/api/report-engine/supply-usage" + q)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setLoading(false); showToast("Could not load report: " + e.message, "error"); });
  };

  useEffect(() => { load(); }, [dateRange, siteFilter, catFilter, bucket]);

  const sm = data && data.summary;
  const hasActivity = !!(sm && sm.usage_events > 0);
  const out = cfg.output;
  const selSt = { padding: "8px 12px", borderRadius: R.md, border: "1px solid " + t.borderSolid, background: t.card, color: t.text, fontSize: 12, fontFamily: FONT_BODY, cursor: "pointer" };
  const money = (v) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const tiles = sm ? [
    { label: "Estimated cost", value: money(sm.total_estimated_cost), color: t.text },
    { label: "Usage events", value: String(sm.usage_events), color: t.text },
    { label: "Supplies used", value: String(sm.supplies_used), color: t.text },
    { label: "Sites", value: String(sm.sites_active), color: t.text },
  ] : [];

  const exportPdf = () => {
    if (!sm) { showToast("No data to export", "error"); return; }
    const useBrand = cfg.branding.use_company_settings;
    const navy = (useBrand && settings && settings.primary_color) || NAVY;
    const gold = (useBrand && settings && settings.secondary_color) || GOLD;
    const cName = (useBrand && settings && (settings.display_name || settings.legal_name)) || clientConfig.company.name;
    const logo = useBrand && settings && settings.logo_url ? settings.logo_url : "";
    const addr = useBrand && settings && settings.address ? settings.address : "";
    const gen = new Date().toLocaleString();
    const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const m = (v) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const siteLabel = siteFilter ? (((sites || []).find(s => s.id === siteFilter) || {}).name || "Selected site") : "All sites";
    const catLabel = catFilter ? (catFilter.charAt(0).toUpperCase() + catFilter.slice(1)) : "All categories";
    const card = (val, lbl) => '<div class="sc"><div class="v">' + esc(val) + '</div><div class="l">' + esc(lbl) + '</div></div>';
    const summaryCards = card(m(sm.total_estimated_cost), "Estimated cost") + card(String(sm.usage_events), "Usage events") + card(String(sm.supplies_used), "Supplies used") + card(String(sm.sites_active), "Sites");
    const trendRows = out.trend ? ((data && data.trend ? data.trend : []).filter(b => b.usage_events > 0).map(b => '<tr><td>' + esc(fmtBucketDate(b.bucket_start)) + '</td><td>' + esc(m(b.estimated_cost)) + '</td><td>' + esc(String(b.quantity)) + '</td><td>' + esc(String(b.usage_events)) + '</td></tr>').join("")) : "";
    const trendTable = trendRows ? ('<h2>Estimated cost by period</h2><table><thead><tr><th>Period</th><th>Estimated cost</th><th>Quantity</th><th>Events</th></tr></thead><tbody>' + trendRows + '</tbody></table>') : "";
    const siteRows = out.by_site ? ((data && data.by_site ? data.by_site : []).map(s => '<tr><td>' + esc(s.site_name) + '</td><td>' + esc(m(s.estimated_cost)) + '</td><td>' + esc(String(s.usage_events)) + '</td></tr>').join("")) : "";
    const siteTable = siteRows ? ('<h2>Cost by site</h2><table><thead><tr><th>Site</th><th>Estimated cost</th><th>Events</th></tr></thead><tbody>' + siteRows + '</tbody></table>') : "";
    const supRows = out.top_supplies ? ((data && data.by_supply ? data.by_supply : []).slice(0, 20).map(s => '<tr><td>' + esc(s.supply_name) + '</td><td>' + esc(s.category) + '</td><td>' + esc(s.is_green_certified ? "Yes" : "No") + '</td><td>' + esc(m(s.estimated_cost)) + '</td><td>' + esc(String(s.quantity) + " " + (s.unit || "")) + '</td></tr>').join("")) : "";
    const supTable = supRows ? ('<h2>Top supplies by cost</h2><table><thead><tr><th>Supply</th><th>Category</th><th>Green</th><th>Estimated cost</th><th>Quantity</th></tr></thead><tbody>' + supRows + '</tbody></table>') : "";
    const greenLine = out.green_share && data && data.green_split ? ('<p class="meta">Green-certified share of estimated cost: ' + esc(m(data.green_split.green_cost)) + ' of ' + esc(m(sm.total_estimated_cost)) + (sm.green_cost_pct != null ? ' (' + esc(String(sm.green_cost_pct)) + '%)' : '') + '</p>') : "";
    const style = '<style>body{font-family:Arial,Helvetica,sans-serif;margin:28px;color:#222}.brand{display:flex;align-items:center;gap:12px;border-bottom:3px solid ' + gold + ';padding-bottom:10px;margin-bottom:14px}.brand img{height:42px}.co{font-size:20px;font-weight:700;color:' + navy + '}h1{color:' + navy + ';font-size:20px;margin:10px 0 4px}h2{color:' + navy + ';font-size:14px;margin:18px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}.meta{font-size:11px;color:#666;margin:2px 0}table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #ddd;padding:5px 8px;font-size:11px;text-align:left}th{background:' + navy + ';color:' + gold + '}.grid{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.sc{border:1px solid #ddd;border-radius:8px;padding:10px 14px;min-width:120px}.sc .v{font-size:18px;font-weight:700;color:' + navy + '}.sc .l{font-size:10px;color:#888;text-transform:uppercase;margin-top:2px}.footer{margin-top:24px;border-top:2px solid ' + gold + ';padding-top:8px;font-size:10px;color:#888}@media print{body{margin:14px}}</style>';
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Supply Usage and Cost</title>' + style + '</head><body>'
      + '<div class="brand">' + (logo ? '<img src="' + esc(logo) + '" />' : '') + '<div class="co">' + esc(cName) + '</div></div>'
      + '<h1>Supply Usage and Cost</h1>'
      + '<p class="meta">' + esc(siteLabel) + ' &middot; ' + esc(catLabel) + ' &middot; ' + esc(dateRange.start) + ' to ' + esc(dateRange.end) + ' &middot; generated ' + esc(gen) + '</p>'
      + '<p class="meta">Cost is estimated using each supply current cost per unit. Supplies without a price contribute zero cost.</p>'
      + '<div class="grid">' + summaryCards + '</div>'
      + greenLine + trendTable + siteTable + supTable
      + '<div class="footer">' + esc(cName) + (addr ? ' &middot; ' + esc(addr) : "") + '</div>'
      + '</body></html>';
    const w = window.open("", "_blank");
    if (!w) { showToast("Allow pop-ups to export the PDF", "error"); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  return (<div>
    <DateRangePicker value={dateRange} onChange={setDateRange} t={t} presets={REPORT_PRESETS} />
    <div style={{ marginBottom: 16 }}>
      <ChartCard t={t} title="Supply Usage and Cost" sub="Estimated cost from logged usage at current prices" action={hasActivity ? "Export PDF" : null} onAction={exportPdf}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} style={selSt}>
            <option value="">All sites</option>
            {(sites || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={selSt}>
            <option value="">All categories</option>
            <option value="chemical">Chemical</option>
            <option value="supply">Supply</option>
            <option value="equipment">Equipment</option>
            <option value="ppe">PPE</option>
          </select>
          <select value={bucket} onChange={e => setBucket(e.target.value)} style={selSt}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
        {loading && !data ? <div style={{ fontSize: 12, color: t.textMut, padding: "20px 0", textAlign: "center" }}>Loading...</div> :
          !hasActivity ? <div style={{ fontSize: 12, color: t.textMut, padding: "20px 0", textAlign: "center" }}>No supply usage in this range yet.</div> :
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 8 }}>
              {tiles.map((s, i) => <MetricTile key={i} t={t} label={s.label} value={s.value} sub={s.sub} color={s.color} />)}
            </div>
            <div style={{ fontSize: 11, color: t.textMut }}>Cost is estimated using its current cost per unit. Supplies without a price contribute zero cost.</div>
          </div>}
      </ChartCard>
    </div>
    {hasActivity ? <div>
      {out.trend ? <div style={{ marginBottom: 16 }}><SupplyCostTrendWidget data={data} t={t} /></div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        {out.by_site ? <SupplyCostBySiteWidget data={data} t={t} /> : null}
        {out.green_share ? <SupplyGreenShareWidget data={data} t={t} /> : null}
      </div>
      {out.top_supplies ? <div style={{ marginBottom: 16 }}><SupplyTopSuppliesWidget data={data} t={t} /></div> : null}
    </div> : null}
  </div>);
}

const InspectionScoreTrendWidget = ({ rows, t }) => {
  const byDate = {};
  (rows || []).forEach(r => {
    const k = (r.scheduled_date || r.completed_at || "").slice(0, 10);
    if (!k) return;
    if (!byDate[k]) byDate[k] = { sum: 0, max: 0 };
    byDate[k].sum += Number(r.total_score || 0);
    byDate[k].max += Number(r.max_possible_score || 0);
  });
  const keys = Object.keys(byDate).sort();
  const fmt = (dt) => new Date(dt + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const cats = keys.map(fmt);
  const series = [{ name: "Avg score %", data: keys.map(k => byDate[k].max > 0 ? Math.round(1000 * byDate[k].sum / byDate[k].max) / 10 : null) }];
  const hasData = series[0].data.some(v => v !== null);
  return (
    <ChartCard t={t} title="Inspection score trend" sub="Average score percent over time">
      {cats.length && hasData ? <LineChartW categories={cats} series={series} t={t} colors={[GO]} /> :
        <div style={{ fontSize: 12, color: t.textMut, padding: "12px 2px" }}>No completed inspections in this range yet.</div>}
    </ChartCard>
  );
};

const InspectionBySiteWidget = ({ rows, t }) => {
  const data = (rows || []).filter(s => s.avg_score_pct !== null && s.avg_score_pct !== undefined);
  if (data.length < 1) return null;
  return (
    <ChartCard t={t} title="Average score by site" sub="Inspection score percent">
      <BarChartW categories={data.map(s => s.site_name)} values={data.map(s => Number(s.avg_score_pct))} t={t} valueSuffix="%" name="Avg score %" />
    </ChartCard>
  );
};

const InspectionLowestItemsWidget = ({ rows, t }) => {
  const data = (rows || []).filter(s => s.avg_score_pct !== null && s.avg_score_pct !== undefined).slice(0, 10);
  if (data.length < 1) return null;
  return (
    <ChartCard t={t} title="Lowest-scoring items" sub="Average score percent, lowest first">
      <BarChartW categories={data.map(s => s.label)} values={data.map(s => Number(s.avg_score_pct))} t={t} horizontal={true} valueSuffix="%" name="Avg score %" />
    </ChartCard>
  );
};

function InspectionReport({ af, t, sites, settings, config, showToast }) {
  const cfg = readInspectionConfig(config);
  const [dateRange, setDateRange] = useState(() => resolvePreset(cfg.date_range.preset));
  const [siteFilter, setSiteFilter] = useState(cfg.filters.site_id || "");
  const [scores, setScores] = useState(null);
  const [bySite, setBySite] = useState(null);
  const [lowest, setLowest] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = (range) => {
    const r = range || dateRange;
    setLoading(true);
    const base = "?start_date=" + r.start + "&end_date=" + r.end;
    const sq = base + (siteFilter ? "&site_id=" + siteFilter : "");
    Promise.all([
      af("/api/inspections/analytics/scores-over-time" + sq),
      af("/api/inspections/analytics/site-comparison" + base),
      af("/api/inspections/analytics/lowest-items" + sq + "&limit=10"),
    ]).then(([sc, bs, lw]) => {
      setScores(sc); setBySite(bs); setLowest(lw); setLoading(false);
    }).catch(e => { setLoading(false); showToast("Could not load report: " + e.message, "error"); });
  };

  useEffect(() => { load(); }, [dateRange, siteFilter]);

  const out = cfg.output;
  const selSt = { padding: "8px 12px", borderRadius: R.md, border: "1px solid " + t.borderSolid, background: t.card, color: t.text, fontSize: 12, fontFamily: FONT_BODY, cursor: "pointer" };
  const inspRows = scores || [];
  const totMax = inspRows.reduce((a, r) => a + Number(r.max_possible_score || 0), 0);
  const totScore = inspRows.reduce((a, r) => a + Number(r.total_score || 0), 0);
  const avgPct = totMax > 0 ? Math.round(1000 * totScore / totMax) / 10 : null;
  const siteCount = (bySite || []).length;
  const hasActivity = inspRows.length > 0;
  const tiles = [
    { label: "Avg score", value: avgPct === null ? "-" : (avgPct + "%"), color: t.text },
    { label: "Inspections", value: String(inspRows.length), color: t.text },
    { label: "Sites", value: String(siteCount), color: t.text },
  ];

  const exportPdf = () => {
    if (!hasActivity) { showToast("No data to export", "error"); return; }
    const useBrand = cfg.branding.use_company_settings;
    const navy = (useBrand && settings && settings.primary_color) || NAVY;
    const gold = (useBrand && settings && settings.secondary_color) || GOLD;
    const cName = (useBrand && settings && (settings.display_name || settings.legal_name)) || clientConfig.company.name;
    const logo = useBrand && settings && settings.logo_url ? settings.logo_url : "";
    const addr = useBrand && settings && settings.address ? settings.address : "";
    const gen = new Date().toLocaleString();
    const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const pct = (v) => (v == null ? "-" : (v + "%"));
    const siteLabel = siteFilter ? (((sites || []).find(s => s.id === siteFilter) || {}).name || "Selected site") : "All sites";
    const card = (val, lbl) => '<div class="sc"><div class="v">' + esc(val) + '</div><div class="l">' + esc(lbl) + '</div></div>';
    const summaryCards = card(pct(avgPct), "Avg score") + card(String(inspRows.length), "Inspections") + card(String(siteCount), "Sites");
    const siteRows = out.by_site ? ((bySite || []).map(s => '<tr><td>' + esc(s.site_name) + '</td><td>' + esc(String(s.inspection_count)) + '</td><td>' + esc(pct(s.avg_score_pct)) + '</td><td>' + esc(pct(s.latest_score_pct)) + '</td></tr>').join("")) : "";
    const siteTable = siteRows ? ('<h2>Average score by site</h2><table><thead><tr><th>Site</th><th>Inspections</th><th>Avg score</th><th>Latest</th></tr></thead><tbody>' + siteRows + '</tbody></table>') : "";
    const lowRows = out.lowest_items ? ((lowest || []).slice(0, 20).map(s => '<tr><td>' + esc(s.label) + '</td><td>' + esc(s.zone || "") + '</td><td>' + esc(pct(s.avg_score_pct)) + '</td><td>' + esc(String(s.occurrences)) + '</td></tr>').join("")) : "";
    const lowTable = lowRows ? ('<h2>Lowest-scoring items</h2><table><thead><tr><th>Item</th><th>Zone</th><th>Avg score</th><th>Times checked</th></tr></thead><tbody>' + lowRows + '</tbody></table>') : "";
    const inspListRows = out.trend ? ((scores || []).slice(0, 50).map(r => '<tr><td>' + esc((r.scheduled_date || r.completed_at || "").slice(0, 10)) + '</td><td>' + esc(r.site_name) + '</td><td>' + esc(pct(r.score_pct)) + '</td></tr>').join("")) : "";
    const inspListTable = inspListRows ? ('<h2>Inspections in period</h2><table><thead><tr><th>Date</th><th>Site</th><th>Score</th></tr></thead><tbody>' + inspListRows + '</tbody></table>') : "";
    const style = '<style>body{font-family:Arial,Helvetica,sans-serif;margin:28px;color:#222}.brand{display:flex;align-items:center;gap:12px;border-bottom:3px solid ' + gold + ';padding-bottom:10px;margin-bottom:14px}.brand img{height:42px}.co{font-size:20px;font-weight:700;color:' + navy + '}h1{color:' + navy + ';font-size:20px;margin:10px 0 4px}h2{color:' + navy + ';font-size:14px;margin:18px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}.meta{font-size:11px;color:#666;margin:2px 0}table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #ddd;padding:5px 8px;font-size:11px;text-align:left}th{background:' + navy + ';color:' + gold + '}.grid{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.sc{border:1px solid #ddd;border-radius:8px;padding:10px 14px;min-width:120px}.sc .v{font-size:18px;font-weight:700;color:' + navy + '}.sc .l{font-size:10px;color:#888;text-transform:uppercase;margin-top:2px}.footer{margin-top:24px;border-top:2px solid ' + gold + ';padding-top:8px;font-size:10px;color:#888}@media print{body{margin:14px}}</style>';
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Inspection Scores and Quality</title>' + style + '</head><body>'
      + '<div class="brand">' + (logo ? '<img src="' + esc(logo) + '" />' : '') + '<div class="co">' + esc(cName) + '</div></div>'
      + '<h1>Inspection Scores and Quality</h1>'
      + '<p class="meta">' + esc(siteLabel) + ' &middot; ' + esc(dateRange.start) + ' to ' + esc(dateRange.end) + ' &middot; generated ' + esc(gen) + '</p>'
      + '<div class="grid">' + summaryCards + '</div>'
      + siteTable + lowTable + inspListTable
      + '<div class="footer">' + esc(cName) + (addr ? ' &middot; ' + esc(addr) : "") + '</div>'
      + '</body></html>';
    const w = window.open("", "_blank");
    if (!w) { showToast("Allow pop-ups to export the PDF", "error"); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  return (<div>
    <DateRangePicker value={dateRange} onChange={setDateRange} t={t} presets={REPORT_PRESETS} />
    <div style={{ marginBottom: 16 }}>
      <ChartCard t={t} title="Inspection Scores and Quality" sub="Inspection results over the selected period" action={hasActivity ? "Export PDF" : null} onAction={exportPdf}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} style={selSt}>
            <option value="">All sites</option>
            {(sites || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {loading && !scores ? <div style={{ fontSize: 12, color: t.textMut, padding: "20px 0", textAlign: "center" }}>Loading...</div> :
          !hasActivity ? <div style={{ fontSize: 12, color: t.textMut, padding: "20px 0", textAlign: "center" }}>No completed inspections in this range yet.</div> :
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {tiles.map((s, i) => <MetricTile key={i} t={t} label={s.label} value={s.value} color={s.color} />)}
          </div>}
      </ChartCard>
    </div>
    {hasActivity ? <div>
      {out.trend ? <div style={{ marginBottom: 16 }}><InspectionScoreTrendWidget rows={scores} t={t} /></div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        {out.by_site ? <InspectionBySiteWidget rows={bySite} t={t} /> : null}
      </div>
      {out.lowest_items ? <div style={{ marginBottom: 16 }}><InspectionLowestItemsWidget rows={lowest} t={t} /></div> : null}
    </div> : null}
  </div>);
}

// Inline create / edit panel for report definitions.
function ReportEditor({ t, sites, initial, onCancel, onSaved, af, showToast }) {
  const isEdit = !!(initial && initial.id);
  const c0 = readIssueConfig(initial && initial.config);
  const sc0 = readSupplyConfig(initial && initial.config);
  const inc0 = readInspectionConfig(initial && initial.config);
  const toH = (m) => Math.round((m / 60) * 100) / 100;
  const [name, setName] = useState(initial ? (initial.name || "") : "");
  const [description, setDescription] = useState(initial && initial.description ? initial.description : "");
  const [category, setCategory] = useState(initial && initial.category ? initial.category : "Service Delivery");
  const [source, setSource] = useState(initial && initial.source ? initial.source : ISSUE_SOURCE_KEY);
  const [preset, setPreset] = useState(c0.date_range.preset || "last30");
  const [bucket, setBucket] = useState(c0.bucket || "week");
  const [siteId, setSiteId] = useState(c0.filters.site_id || "");
  const [severity, setSeverity] = useState(c0.filters.severity || "");
  const [hiFr, setHiFr] = useState(toH(c0.sla_targets.high.first_response_minutes));
  const [hiRes, setHiRes] = useState(toH(c0.sla_targets.high.resolution_minutes));
  const [medFr, setMedFr] = useState(toH(c0.sla_targets.medium.first_response_minutes));
  const [medRes, setMedRes] = useState(toH(c0.sla_targets.medium.resolution_minutes));
  const [lowFr, setLowFr] = useState(toH(c0.sla_targets.low.first_response_minutes));
  const [lowRes, setLowRes] = useState(toH(c0.sla_targets.low.resolution_minutes));
  const [outTrend, setOutTrend] = useState(c0.output.trend);
  const [outBySite, setOutBySite] = useState(c0.output.by_site);
  const [outSeverity, setOutSeverity] = useState(c0.output.severity);
  const [outSla, setOutSla] = useState(c0.output.sla);
  const [supPreset, setSupPreset] = useState(sc0.date_range.preset || "last30");
  const [supBucket, setSupBucket] = useState(sc0.bucket || "week");
  const [supSiteId, setSupSiteId] = useState(sc0.filters.site_id || "");
  const [supCategory, setSupCategory] = useState(sc0.filters.category || "");
  const [supOutTrend, setSupOutTrend] = useState(sc0.output.trend);
  const [supOutBySite, setSupOutBySite] = useState(sc0.output.by_site);
  const [supOutTop, setSupOutTop] = useState(sc0.output.top_supplies);
  const [supOutGreen, setSupOutGreen] = useState(sc0.output.green_share);
  const [insPreset, setInsPreset] = useState(inc0.date_range.preset || "last90");
  const [insSiteId, setInsSiteId] = useState(inc0.filters.site_id || "");
  const [insOutTrend, setInsOutTrend] = useState(inc0.output.trend);
  const [insOutBySite, setInsOutBySite] = useState(inc0.output.by_site);
  const [insOutLowest, setInsOutLowest] = useState(inc0.output.lowest_items);
  const [brand, setBrand] = useState(c0.branding.use_company_settings);
  const [saving, setSaving] = useState(false);

  const buildConfig = () => {
    if (isSupplySource(source)) {
      return {
        date_range: { preset: supPreset },
        bucket: supBucket,
        filters: { site_id: supSiteId, category: supCategory },
        output: { trend: supOutTrend, by_site: supOutBySite, top_supplies: supOutTop, green_share: supOutGreen },
        branding: { use_company_settings: brand },
      };
    }
    if (isInspectionSource(source)) {
      return {
        date_range: { preset: insPreset },
        filters: { site_id: insSiteId },
        output: { trend: insOutTrend, by_site: insOutBySite, lowest_items: insOutLowest },
        branding: { use_company_settings: brand },
      };
    }
    const h2m = (h) => Math.max(1, Math.round(Number(h) * 60));
    return {
      date_range: { preset },
      bucket,
      filters: { site_id: siteId, severity },
      sla_targets: {
        high: { first_response_minutes: h2m(hiFr), resolution_minutes: h2m(hiRes) },
        medium: { first_response_minutes: h2m(medFr), resolution_minutes: h2m(medRes) },
        low: { first_response_minutes: h2m(lowFr), resolution_minutes: h2m(lowRes) },
      },
      output: { trend: outTrend, by_site: outBySite, severity: outSeverity, sla: outSla },
      branding: { use_company_settings: brand },
    };
  };

  const save = async () => {
    if (!name.trim()) { showToast("A report name is required", "error"); return; }
    setSaving(true);
    const body = { name: name.trim(), description: description.trim(), category: category.trim() || "Custom", source, config: buildConfig(), is_template: true };
    try {
      if (isEdit) await af("/api/report-engine/definitions/" + initial.id, { method: "PUT", body });
      else await af("/api/report-engine/definitions", { method: "POST", body });
      showToast(isEdit ? "Report updated" : "Report created");
      onSaved();
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const slaRow = (lbl, frVal, frSet, resVal, resSet) => (
    <div style={{ display: "grid", gridTemplateColumns: "0.7fr 1fr 1fr", gap: 10, alignItems: "end", marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: t.textSec, fontWeight: 600, paddingBottom: 10 }}>{lbl}</div>
      <div><Lbl>First response (h)</Lbl><Inp t={t} type="number" min="0" step="0.25" value={frVal} onChange={e => frSet(e.target.value)} /></div>
      <div><Lbl>Resolution (h)</Lbl><Inp t={t} type="number" min="0" step="0.25" value={resVal} onChange={e => resSet(e.target.value)} /></div>
    </div>
  );
  const chk = (label, val, set) => (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.text, cursor: "pointer", marginBottom: 6 }}>
      <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} /> {label}
    </label>
  );
  const selStyle = { width: "100%", padding: "10px 13px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: FONT_BODY };

  return (
    <Crd t={t}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>{isEdit ? "Edit report" : "New report"}</div>
        <Btn v="ghost" t={t} onClick={onCancel}>Cancel</Btn>
      </div>
      <div style={{ marginBottom: 12 }}><Lbl>Name</Lbl><Inp t={t} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. High severity weekly" /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Description</Lbl><TArea t={t} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="What this report covers" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><Lbl>Category</Lbl><Inp t={t} value={category} onChange={e => setCategory(e.target.value)} placeholder="Service Delivery" /></div>
        <div><Lbl>Source</Lbl>
          <select value={source} onChange={e => setSource(e.target.value)} style={selStyle}>
            {REPORT_SOURCES.map(s => <option key={s.key} value={s.key} disabled={!s.available}>{s.label}{s.available ? "" : " (arriving with templates)"}</option>)}
          </select>
        </div>
      </div>
      {isIssueSource(source) ?
        <div style={{ borderTop: "1px solid " + t.border, marginTop: 6, paddingTop: 14 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Issue report settings</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><Lbl>Default range</Lbl><Sel t={t} value={preset} onChange={e => setPreset(e.target.value)} options={[{ v: "last30", l: "Last 30 Days" }, { v: "last60", l: "Last 60 Days" }, { v: "last90", l: "Last 90 Days" }, { v: "thisMonth", l: "This Month" }]} /></div>
            <div><Lbl>Trend bucket</Lbl><Sel t={t} value={bucket} onChange={e => setBucket(e.target.value)} options={[{ v: "day", l: "Daily" }, { v: "week", l: "Weekly" }, { v: "month", l: "Monthly" }]} /></div>
            <div><Lbl>Default severity</Lbl><Sel t={t} value={severity} onChange={e => setSeverity(e.target.value)} options={[{ v: "", l: "All severities" }, { v: "high", l: "High" }, { v: "medium", l: "Medium" }, { v: "low", l: "Low" }]} /></div>
          </div>
          <div style={{ marginBottom: 12 }}><Lbl>Default site</Lbl><Sel t={t} value={siteId} onChange={e => setSiteId(e.target.value)} options={[{ v: "", l: "All sites" }, ...(sites || []).map(s => ({ v: s.id, l: s.name }))]} /></div>
          <div style={{ fontSize: 12, color: t.textSec, fontWeight: 600, margin: "10px 0 8px" }}>Service level targets (hours)</div>
          {slaRow("High", hiFr, setHiFr, hiRes, setHiRes)}
          {slaRow("Medium", medFr, setMedFr, medRes, setMedRes)}
          {slaRow("Low", lowFr, setLowFr, lowRes, setLowRes)}
          <div style={{ fontSize: 12, color: t.textSec, fontWeight: 600, margin: "12px 0 4px" }}>Show on report</div>
          <div style={{ fontSize: 11, color: t.textMut, marginBottom: 8 }}>Applies to both the on-screen view and the PDF export.</div>
          {chk("Resolution and response trend", outTrend, setOutTrend)}
          {chk("Per-site breakdown", outBySite, setOutBySite)}
          {chk("Open issues by severity", outSeverity, setOutSeverity)}
          {chk("SLA compliance and breaches", outSla, setOutSla)}
        </div> :
        isSupplySource(source) ?
        <div style={{ borderTop: "1px solid " + t.border, marginTop: 6, paddingTop: 14 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Supply report settings</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><Lbl>Default range</Lbl><Sel t={t} value={supPreset} onChange={e => setSupPreset(e.target.value)} options={[{ v: "last30", l: "Last 30 Days" }, { v: "last60", l: "Last 60 Days" }, { v: "last90", l: "Last 90 Days" }, { v: "thisMonth", l: "This Month" }]} /></div>
            <div><Lbl>Trend bucket</Lbl><Sel t={t} value={supBucket} onChange={e => setSupBucket(e.target.value)} options={[{ v: "day", l: "Daily" }, { v: "week", l: "Weekly" }, { v: "month", l: "Monthly" }]} /></div>
            <div><Lbl>Category</Lbl><Sel t={t} value={supCategory} onChange={e => setSupCategory(e.target.value)} options={[{ v: "", l: "All categories" }, { v: "chemical", l: "Chemical" }, { v: "supply", l: "Supply" }, { v: "equipment", l: "Equipment" }, { v: "ppe", l: "PPE" }]} /></div>
          </div>
          <div style={{ marginBottom: 12 }}><Lbl>Default site</Lbl><Sel t={t} value={supSiteId} onChange={e => setSupSiteId(e.target.value)} options={[{ v: "", l: "All sites" }, ...(sites || []).map(s => ({ v: s.id, l: s.name }))]} /></div>
          <div style={{ fontSize: 12, color: t.textSec, fontWeight: 600, margin: "12px 0 4px" }}>Show on report</div>
          <div style={{ fontSize: 11, color: t.textMut, marginBottom: 8 }}>Applies to both the on-screen view and the PDF export.</div>
          {chk("Cost trend", supOutTrend, setSupOutTrend)}
          {chk("Cost by site", supOutBySite, setSupOutBySite)}
          {chk("Top supplies by cost", supOutTop, setSupOutTop)}
          {chk("Green-certified share", supOutGreen, setSupOutGreen)}
        </div> :
        isInspectionSource(source) ?
        <div style={{ borderTop: "1px solid " + t.border, marginTop: 6, paddingTop: 14 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Inspection report settings</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><Lbl>Default range</Lbl><Sel t={t} value={insPreset} onChange={e => setInsPreset(e.target.value)} options={[{ v: "last30", l: "Last 30 Days" }, { v: "last60", l: "Last 60 Days" }, { v: "last90", l: "Last 90 Days" }, { v: "thisMonth", l: "This Month" }]} /></div>
            <div><Lbl>Default site</Lbl><Sel t={t} value={insSiteId} onChange={e => setInsSiteId(e.target.value)} options={[{ v: "", l: "All sites" }, ...(sites || []).map(s => ({ v: s.id, l: s.name }))]} /></div>
          </div>
          <div style={{ fontSize: 12, color: t.textSec, fontWeight: 600, margin: "12px 0 4px" }}>Show on report</div>
          <div style={{ fontSize: 11, color: t.textMut, marginBottom: 8 }}>Applies to both the on-screen view and the PDF export.</div>
          {chk("Score trend", insOutTrend, setInsOutTrend)}
          {chk("Average score by site", insOutBySite, setInsOutBySite)}
          {chk("Lowest-scoring items", insOutLowest, setInsOutLowest)}
        </div> :
        <div style={{ borderTop: "1px solid " + t.border, marginTop: 6, paddingTop: 14, fontSize: 13, color: t.textMut }}>
          This source arrives with the report templates workstream. You can save the report now, and it will run once its data source ships.
        </div>}
      <div style={{ borderTop: "1px solid " + t.border, marginTop: 14, paddingTop: 14 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Output and export</div>
        {chk("Use company branding on export", brand, setBrand)}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Btn v="ghost" t={t} onClick={onCancel}>Cancel</Btn>
        <Btn v="primary" t={t} onClick={save} disabled={saving}>{saving ? "Saving..." : (isEdit ? "Save changes" : "Create report")}</Btn>
      </div>
    </Crd>
  );
}

function ReportsPage({ af, showToast, isAdmin, t, sites }) {
  const [defs, setDefs] = useState(null);
  const [view, setView] = useState("library");
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(null);
  const [settings, setSettings] = useState(null);
  const [dateRange, setDateRange] = useState(() => PRESETS.last30());
  const [tasks, setTasks] = useState(null);
  const [issS, setIssS] = useState(null);
  const [exp, setExp] = useState(false);

  const loadDefs = () => af("/api/report-engine/definitions").then(setDefs).catch(e => { setDefs([]); showToast("Could not load reports: " + e.message, "error"); });
  const loadSnapshots = (range) => {
    const r = range || dateRange;
    const q = "?start_date=" + r.start + "&end_date=" + r.end;
    af("/api/reports/task-completion" + q).then(setTasks).catch(e => console.warn(e.message));
    af("/api/reports/issues" + q).then(setIssS).catch(e => console.warn(e.message));
  };

  useEffect(() => { loadDefs(); }, []);
  useEffect(() => { af("/api/settings").then(setSettings).catch(() => {}); }, []);
  useEffect(() => { loadSnapshots(); }, [dateRange]);

  const expIss = async () => { setExp(true); try { const d = await af("/api/issues"); dlCSV("ocsa-issues.csv", ["Title", "Site", "Zone", "Severity", "Status", "Reported By", "Date"], d.map(r => [r.title, r.site_name, r.zone, r.severity, r.status, r.reported_by_name, r.reported_at])); showToast("Downloaded"); } catch (e) { showToast(e.message, "error"); } setExp(false); };
  const expChem = async () => { setExp(true); try { const d = await af("/api/reports/chemical-usage"); dlCSV("ocsa-chemicals.csv", ["Chemical", "QR", "Green", "EPA", "Site", "Qty", "Unit"], d.chemicals.map(r => [r.name, r.qr_code, r.is_green_certified, r.epa_reg_number, r.site_name, r.total_quantity, r.unit])); showToast("Downloaded"); } catch (e) { showToast(e.message, "error"); } setExp(false); };

  const runReport = (d) => { setActive(d); setView("run"); };
  const newReport = () => { setEditing(null); setView("edit"); };
  const editReport = (d) => { setEditing(d); setView("edit"); };
  const duplicateReport = (d) => { setEditing({ name: (d.name || "Report") + " (copy)", description: d.description, category: d.category, source: d.source, config: d.config }); setView("edit"); };
  const deleteReport = async (d) => {
    if (!window.confirm("Delete \"" + d.name + "\"? This cannot be undone.")) return;
    try { await af("/api/report-engine/definitions/" + d.id, { method: "DELETE" }); showToast("Report deleted"); loadDefs(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const groups = {};
  (defs || []).forEach(d => { const c = d.category || "Other"; if (!groups[c]) groups[c] = []; groups[c].push(d); });
  const groupNames = Object.keys(groups).sort();

  if (view === "run" && active) {
    return (<div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <Btn v="ghost" t={t} onClick={() => { setView("library"); setActive(null); }}>Back to reports</Btn>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>{active.name}</div>
          {active.description ? <div style={{ fontSize: 11, color: t.textMut }}>{active.description}</div> : null}
        </div>
      </div>
      {isIssueSource(active.source) ?
        <IssueTimingReport key={active.id} af={af} t={t} sites={sites} settings={settings} config={active.config} showToast={showToast} /> :
       isSupplySource(active.source) ?
        <SupplyUsageReport key={active.id} af={af} t={t} sites={sites} settings={settings} config={active.config} showToast={showToast} /> :
       isInspectionSource(active.source) ?
        <InspectionReport key={active.id} af={af} t={t} sites={sites} settings={settings} config={active.config} showToast={showToast} /> :
        <Crd t={t}><div style={{ fontSize: 13, color: t.textMut }}>This report's data source arrives with the report templates workstream. It will run here once that ships.</div></Crd>}
    </div>);
  }

  if (view === "edit") {
    return (<div>
      <ReportEditor t={t} sites={sites} initial={editing} af={af} showToast={showToast}
        onCancel={() => { setView("library"); setEditing(null); }}
        onSaved={() => { setView("library"); setEditing(null); loadDefs(); }} />
    </div>);
  }

  return (<div>
    <SecT t={t} action="New report" onAction={newReport}>Reports</SecT>
    {defs === null ?
      <Crd t={t}><div style={{ fontSize: 12, color: t.textMut }}>Loading reports...</div></Crd> :
      defs.length === 0 ?
        <Crd t={t}><div style={{ fontSize: 13, color: t.textMut }}>No saved reports yet. Use New report to create one.</div></Crd> :
        groupNames.map(cat => (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 12, fontWeight: 600, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{prettyCat(cat)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {groups[cat].map(d => (
                <Crd key={d.id} t={t} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text }}>{d.name}</span>
                      <Bdg l={d.is_system ? "Template" : "Custom"} c={d.is_system ? BL : GO} />
                      {!sourceAvailable(d.source) ? <Bdg l="Coming soon" c={OR} /> : null}
                    </div>
                    <div style={{ fontSize: 11, color: t.textMut, marginTop: 4 }}>{sourceLabel(d.source)}</div>
                    {d.description ? <div style={{ fontSize: 12, color: t.textSec, marginTop: 6 }}>{d.description}</div> : null}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                    <Btn v="primary" t={t} onClick={() => runReport(d)} style={{ padding: "7px 14px", fontSize: 12 }}>Run</Btn>
                    <Btn v="ghost" t={t} onClick={() => duplicateReport(d)} style={{ padding: "7px 12px", fontSize: 12 }}>Duplicate</Btn>
                    {!d.is_system ? <Btn v="ghost" t={t} onClick={() => editReport(d)} style={{ padding: "7px 12px", fontSize: 12 }}>Edit</Btn> : null}
                    {!d.is_system ? <Btn v="ghost" t={t} onClick={() => deleteReport(d)} style={{ padding: "7px 12px", fontSize: 12, color: RD }}>Delete</Btn> : null}
                  </div>
                </Crd>
              ))}
            </div>
          </div>
        ))}

    <div style={{ marginTop: 18 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 12, fontWeight: 600, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Quick snapshots</div>
      <DateRangePicker value={dateRange} onChange={setDateRange} t={t} presets={REPORT_PRESETS} />
      <Crd t={t} style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Task Completion</div>
        {tasks && tasks.sites ? tasks.sites.map((s, i) => <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid " + t.border }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{s.siteName}</span>
            <span style={{ fontSize: 12, color: t.goldText, fontWeight: 600 }}>{s.completedTasks} done</span>
          </div>
        </div>) : null}
        {(!tasks || !tasks.sites || tasks.sites.length === 0) ? <div style={{ fontSize: 12, color: t.textMut }}>No data yet.</div> : null}
      </Crd>
      <Crd t={t} style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Issues Summary</div>
        {issS && issS.summary ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontFamily: FONT_HEAD, fontSize: 24, fontWeight: 600, color: t.text }}>{issS.summary.total}</div><div style={{ fontSize: 10, color: t.textMut }}>Total</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontFamily: FONT_HEAD, fontSize: 24, fontWeight: 600, color: issS.summary.open_count > 0 ? RD : GR }}>{issS.summary.open_count}</div><div style={{ fontSize: 10, color: t.textMut }}>Open</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontFamily: FONT_HEAD, fontSize: 24, fontWeight: 600, color: GR }}>{issS.summary.resolved}</div><div style={{ fontSize: 10, color: t.textMut }}>Resolved</div></div>
        </div> : <div style={{ fontSize: 12, color: t.textMut }}>No data yet.</div>}
      </Crd>
      <Crd t={t}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 4, color: t.text }}>Export data (CSV)</div>
        <div style={{ fontSize: 11, color: t.textMut, marginBottom: 14 }}>Download CSV files for audits and clients.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[{ l: "Issues Report", a: expIss }, { l: "Chemical Usage", a: expChem }].map(r => (
            <button key={r.l} onClick={r.a} disabled={exp} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, border: "1px solid " + t.borderSolid, background: "transparent", color: t.textSec, fontSize: 11, cursor: "pointer" }}>
              <DlI sz={14} c="currentColor" />{r.l}
            </button>
          ))}
        </div>
      </Crd>
    </div>
  </div>);
}

function AssignedTasksAdminPage({ af, showToast, isAdmin, t, sites, allStaff, uf, getOpts }) {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({ site_id: "", building_name: "", floor_number: "", zone: "", user_id: "", status: "" });
  const staffList = allStaff;
  const [sel, setSel] = useState(null); const [activity, setActivity] = useState([]);
  const [reassignForm, setReassignForm] = useState(null); const [createForm, setCreateForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = async (f) => { setLoading(true); try { const params = new URLSearchParams(); const ff = f || filters; if (ff.site_id) params.set("site_id", ff.site_id); if (ff.building_name) params.set("building_name", ff.building_name); if (ff.floor_number) params.set("floor_number", ff.floor_number); if (ff.zone) params.set("zone", ff.zone); if (ff.user_id) params.set("user_id", ff.user_id); if (ff.status) params.set("status", ff.status); const d = await af("/api/clock/tasks/assigned-all?" + params.toString()); setTasks(d); } catch (e) { showToast(e.message, "error"); } setLoading(false); };
  useEffect(() => { load(); }, []);
  const updateFilter = (key, val) => { const nf = { ...filters, [key]: val }; setFilters(nf); load(nf); };
  const clearFilters = () => { const nf = { site_id: "", building_name: "", floor_number: "", zone: "", user_id: "", status: "" }; setFilters(nf); load(nf); };
  const openDetail = async (task) => { setSel(task); try { const a = await af("/api/clock/tasks/activity/" + task.task_id); setActivity(a); } catch (e) { setActivity([]); } };
  const submitReassign = async () => { if (!reassignForm.userId) { showToast("Select a staff member", "error"); return; } if (!reassignForm.note?.trim()) { showToast("A reason for reassignment is required", "error"); return; } try { await af("/api/sites/" + reassignForm.siteId + "/tasks/" + reassignForm.taskId + "/reassign", { method: "POST", body: { userId: reassignForm.userId, note: reassignForm.note.trim() } }); showToast("Task reassigned"); setReassignForm(null); setSel(null); load(); } catch (e) { showToast(e.message, "error"); } };
  const submitCreate = async () => { if (!createForm.siteId || !createForm.label || !createForm.zone || !createForm.assign) { showToast("Site, description, zone, and assignee are required", "error"); return; } try { await af("/api/sites/" + createForm.siteId + "/tasks", { method: "POST", body: { label: createForm.label, zone: createForm.zone, cimsCategory: createForm.cims || "SD", priority: createForm.pri || "standard", description: createForm.desc || undefined, mediaUrl: createForm.mediaUrl || undefined, mediaType: createForm.mediaType || undefined, dueDate: createForm.dueDate || undefined, dueTime: createForm.dueTime || undefined, buildingName: createForm.building || undefined, floorNumber: createForm.floor || undefined, taskType: "assigned", assignToUsers: [createForm.assign] } }); showToast("Task created and assigned"); setCreateForm(null); load(); } catch (e) { showToast(e.message, "error"); } };
  const buildings = [...new Set(tasks.map(tk => tk.building_name).filter(Boolean))];
  const floors = [...new Set(tasks.map(tk => tk.floor_number).filter(Boolean))];
  const zones = [...new Set(tasks.map(tk => tk.zone).filter(Boolean))];
  const stC = { pending: OR, in_progress: BL, resolved: GR, unable_to_resolve: RD };
  const priC = { critical: RD, high: OR, standard: GO };
  const hasFilters = Object.values(filters).some(v => v);
  return (<div>
    <SecT t={t} action="Create Task" onAction={() => setCreateForm({ siteId: "", label: "", zone: "", cims: "SD", pri: "standard", assign: "", desc: "", mediaUrl: "", mediaType: "", dueDate: "", dueTime: "", building: "", floor: "" })}>Assigned Tasks</SecT>
    <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
      <Sel t={t} value={filters.site_id} onChange={e => updateFilter("site_id", e.target.value)} options={[{ v: "", l: "All Sites" }, ...sites.map(s => ({ v: s.id, l: s.name }))]} style={{ flex: 1, minWidth: 120 }} />
      <Sel t={t} value={filters.building_name} onChange={e => updateFilter("building_name", e.target.value)} options={[{ v: "", l: "All Buildings" }, ...buildings.map(b => ({ v: b, l: b }))]} style={{ flex: 1, minWidth: 100 }} />
      <Sel t={t} value={filters.floor_number} onChange={e => updateFilter("floor_number", e.target.value)} options={[{ v: "", l: "All Floors" }, ...floors.map(f => ({ v: f, l: "Floor " + f }))]} style={{ flex: 1, minWidth: 90 }} />
      <Sel t={t} value={filters.zone} onChange={e => updateFilter("zone", e.target.value)} options={[{ v: "", l: "All Zones" }, ...zones.map(z => ({ v: z, l: z }))]} style={{ flex: 1, minWidth: 100 }} />
      <Sel t={t} value={filters.user_id} onChange={e => updateFilter("user_id", e.target.value)} options={[{ v: "", l: "All Staff" }, ...staffList.map(s => ({ v: s.id, l: s.name }))]} style={{ flex: 1, minWidth: 120 }} />
      <Sel t={t} value={filters.status} onChange={e => updateFilter("status", e.target.value)} options={[{ v: "", l: "All Status" }, { v: "pending", l: "Pending" }, { v: "in_progress", l: "In Progress" }, { v: "resolved", l: "Resolved" }, { v: "unable_to_resolve", l: "Unable to Resolve" }]} style={{ flex: 1, minWidth: 110 }} />
      {hasFilters && <button onClick={clearFilters} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid " + OR, background: "transparent", color: OR, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>View All</button>}
    </div>
    {loading && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Loading...</div>}
    {!loading && tasks.length === 0 && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>No assigned tasks found.{hasFilters ? " Try clearing filters." : ' Click "Create Task" to assign one.'}</div>}
    {!loading && tasks.map(task => { const isIssue = !!task.source_issue_id; const title = isIssue ? (task.issue_title || task.label) : task.label; const borderColor = isIssue ? (stC[task.resolution_status] || OR) : (priC[task.priority] || GO); const locParts = [task.site_name]; if (task.building_name) locParts.push(task.building_name); if (task.floor_number) locParts.push("Fl " + task.floor_number); if (task.zone) locParts.push(task.zone); return (
      <Crd key={task.task_id} t={t} style={{ marginBottom: 8, padding: 14, borderLeft: "3px solid " + borderColor }} onClick={() => openDetail(task)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{title}</div><div style={{ fontSize: 10, color: t.textSec, marginTop: 3 }}>{locParts.join(" > ")}</div></div><div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>{isIssue && <Bdg l="Issue" c={RD} />}{task.priority && task.priority !== "standard" && <Bdg l={task.priority} c={priC[task.priority] || GO} />}<Bdg l={task.resolution_status ? task.resolution_status.replace(/_/g, " ") : "pending"} c={stC[task.resolution_status] || OR} /></div></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", gap: 10, fontSize: 10, color: t.textMut }}>{task.assigned_to_name && <span>Assigned to: <span style={{ color: BL, fontWeight: 600 }}>{task.assigned_to_name}</span></span>}<span>By: {task.created_by_name}</span><span>{fd(task.task_created_at)}</span></div>{task.due_date && <span style={{ fontSize: 10, color: OR }}>Due: {fd(task.due_date)}</span>}</div>
      </Crd>); })}
    {sel && <Mdl t={t} onClose={() => setSel(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Task Detail</div><button onClick={() => setSel(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, marginBottom: 8, color: t.text }}>{sel.source_issue_id ? (sel.issue_title || sel.label) : sel.label}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>{sel.source_issue_id && <Bdg l="Issue" c={RD} />}{sel.priority && sel.priority !== "standard" && <Bdg l={sel.priority} c={priC[sel.priority] || GO} />}<Bdg l={sel.resolution_status ? sel.resolution_status.replace(/_/g, " ") : "pending"} c={stC[sel.resolution_status] || OR} /></div>
      {sel.description && <div style={{ fontSize: 13, color: t.textSec, marginBottom: 12, lineHeight: 1.5 }}>{sel.description}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: t.textMut }}>Site<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{sel.site_name}</div></div>
        <div style={{ fontSize: 11, color: t.textMut }}>Zone<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{sel.zone || "General"}</div></div>
        {sel.building_name && <div style={{ fontSize: 11, color: t.textMut }}>Building<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{sel.building_name}</div></div>}
        {sel.floor_number && <div style={{ fontSize: 11, color: t.textMut }}>Floor<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{sel.floor_number}</div></div>}
        <div style={{ fontSize: 11, color: t.textMut }}>Assigned To<div style={{ color: BL, fontWeight: 600, marginTop: 2 }}>{sel.assigned_to_name || "Unassigned"}</div></div>
        <div style={{ fontSize: 11, color: t.textMut }}>Created By<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{sel.created_by_name}</div></div>
        <div style={{ fontSize: 11, color: t.textMut }}>Created<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{ff(sel.task_created_at)}</div></div>
        {sel.due_date && <div style={{ fontSize: 11, color: t.textMut }}>Due Date<div style={{ color: OR, fontWeight: 500, marginTop: 2 }}>{fd(sel.due_date)}{sel.due_time ? " " + sel.due_time : ""}</div></div>}
        {sel.resolved_at && <div style={{ fontSize: 11, color: t.textMut }}>Resolved At<div style={{ color: GR, fontWeight: 500, marginTop: 2 }}>{ff(sel.resolved_at)}</div></div>}
      </div>
      {sel.resolution_note && <div style={{ padding: "8px 12px", borderRadius: 6, background: t.greenSubtle, border: "1px solid " + t.greenBorder, fontSize: 11, color: GR, marginBottom: 12 }}>Resolution: {sel.resolution_note}</div>}
      {sel.media_url && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Attached {sel.media_type === "video" ? "Video" : "Photo"}</div>{sel.media_type === "video" ? <video src={sel.media_url} controls style={{ width: "100%", borderRadius: 8, maxHeight: 200 }} /> : <img src={sel.media_url} alt="Task" style={{ width: "100%", borderRadius: 8, maxHeight: 200, objectFit: "cover", border: "1px solid " + t.borderSolid }} />}</div>}
      {sel.resolution_photo_url && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Resolution Photo</div><img src={sel.resolution_photo_url} alt="Resolution" style={{ width: "100%", borderRadius: 8, maxHeight: 200, objectFit: "cover", border: "1px solid " + t.borderSolid }} /></div>}
      {activity.length > 0 && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>Activity Timeline</div>
        {activity.map((a, i) => { const actColor = a.action === "assigned" ? GO : a.action === "reassigned" ? OR : a.action === "started_work" ? BL : a.action === "resolved" ? GR : a.action === "unable_to_resolve" ? RD : a.action === "resolution_photo" ? GR : t.textMut; const actLabel = a.action === "assigned" ? "Assigned" : a.action === "reassigned" ? "Reassigned" : a.action === "started_work" ? "Work Started" : a.action === "resolved" ? "Resolved" : a.action === "unable_to_resolve" ? "Unable to Resolve" : a.action === "resolution_photo" ? "Photo Attached" : a.action; const timeStr = new Date(a.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }); return <TimelineRow key={i} t={t} last={i === activity.length - 1} node={<div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid " + actColor, padding: 1, boxSizing: "border-box", flexShrink: 0 }}><Ini name={a.user_name || "System"} sz={26} /></div>}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}><div style={{ minWidth: 0 }}><span style={{ fontSize: 11, fontWeight: 600, color: actColor }}>{actLabel}</span><span style={{ fontSize: 10, color: t.textMut, marginLeft: 8 }}>by {a.user_name}</span></div><span style={{ fontSize: 9, color: t.textMut, flexShrink: 0 }}>{timeStr}</span></div>{a.details && <div style={{ fontSize: 11, color: t.textSec, marginTop: 3, lineHeight: 1.4 }}>{a.details}</div>}</TimelineRow>; })}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(sel.resolution_status !== "resolved") && <Btn t={t} v="ghost" style={{ flex: 1 }} onClick={() => { setReassignForm({ taskId: sel.task_id, siteId: sel.site_id, userId: "", note: "", currentAssignee: sel.assigned_to_name }); }}>Reassign</Btn>}
        <Btn t={t} v="ghost" style={{ flex: 1 }} onClick={() => setSel(null)}>Close</Btn>
      </div></div></Mdl>}
    {reassignForm && <Mdl t={t} onClose={() => setReassignForm(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Reassign Task</div><button onClick={() => setReassignForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      {reassignForm.currentAssignee && <div style={{ padding: "8px 12px", borderRadius: 6, background: t.orangeSubtle, border: "1px solid " + t.orangeBorder, fontSize: 11, color: OR, marginBottom: 12 }}>Currently assigned to: <span style={{ fontWeight: 600 }}>{reassignForm.currentAssignee}</span>. They will be notified of the change.</div>}
      <div style={{ marginBottom: 12 }}><Lbl>Reassign To *</Lbl><Sel t={t} value={reassignForm.userId} onChange={e => setReassignForm({ ...reassignForm, userId: e.target.value })} options={[{ v: "", l: "Select a staff member..." }, ...staffList.map(s => ({ v: s.id, l: s.name }))]} /></div>
      <div style={{ marginBottom: 16 }}><Lbl>Reason for Reassignment *</Lbl><TArea t={t} value={reassignForm.note} onChange={e => setReassignForm({ ...reassignForm, note: e.target.value })} placeholder="Explain why this task is being reassigned..." rows={3} /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setReassignForm(null)}>Cancel</Btn><Btn t={t} onClick={submitReassign}>Reassign</Btn></div>
    </div></Mdl>}
    {createForm && <Mdl t={t} onClose={() => setCreateForm(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Create Assigned Task</div><button onClick={() => setCreateForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      <div style={{ marginBottom: 12 }}><Lbl>Site *</Lbl><Sel t={t} value={createForm.siteId} onChange={e => setCreateForm({ ...createForm, siteId: e.target.value })} options={[{ v: "", l: "Select site..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Task Description *</Lbl><Inp t={t} value={createForm.label} onChange={e => setCreateForm({ ...createForm, label: e.target.value })} placeholder="e.g. Clean window blinds in conference room" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Building</Lbl><Inp t={t} value={createForm.building} onChange={e => setCreateForm({ ...createForm, building: e.target.value })} placeholder="e.g. Main" /></div><div><Lbl>Floor</Lbl><Inp t={t} value={createForm.floor} onChange={e => setCreateForm({ ...createForm, floor: e.target.value })} placeholder="e.g. 1" /></div><div><Lbl>Zone *</Lbl><Inp t={t} value={createForm.zone} onChange={e => setCreateForm({ ...createForm, zone: e.target.value })} placeholder="e.g. Offices" /></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}><div><Lbl>Priority</Lbl><Sel t={t} value={createForm.pri} onChange={e => setCreateForm({ ...createForm, pri: e.target.value })} options={getOpts("task_priorities")} /></div><div><Lbl>Assign To *</Lbl><Sel t={t} value={createForm.assign} onChange={e => setCreateForm({ ...createForm, assign: e.target.value })} options={[{ v: "", l: "Select staff..." }, ...staffList.map(s => ({ v: s.id, l: s.name }))]} /></div></div>
      <div style={{ marginBottom: 12 }}><Lbl>Detailed Instructions</Lbl><TArea t={t} value={createForm.desc || ""} onChange={e => setCreateForm({ ...createForm, desc: e.target.value })} placeholder="Step-by-step instructions or notes..." rows={3} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Photo/Video (optional)</Lbl>
        <div style={{ display: "flex", gap: 8 }}><Inp t={t} value={createForm.mediaUrl || ""} onChange={e => setCreateForm({ ...createForm, mediaUrl: e.target.value, mediaType: e.target.value ? (e.target.value.match(/\.(mp4|mov|webm|avi)/i) ? "video" : "image") : "" })} placeholder="Paste a URL or upload below" style={{ flex: 1 }} /></div>
        <div style={{ marginTop: 6 }}><input type="file" accept="image/*,video/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 50 * 1024 * 1024) { showToast("File must be under 50MB", "error"); return; } try { showToast("Uploading..."); const r = await uf(f, "task-media"); setCreateForm(prev => ({ ...prev, mediaUrl: r.url, mediaType: r.type })); showToast("Uploaded"); } catch (err) { showToast("Upload failed", "error"); } }} style={{ fontSize: 11, color: t.textSec }} /><div style={{ fontSize: 9, color: t.textMut, marginTop: 3 }}>Upload a photo or video (up to 50MB), or paste a YouTube link above</div></div>
        {createForm.mediaUrl && (createForm.mediaType === "video" ? <div style={{ marginTop: 8 }}><video src={createForm.mediaUrl} controls style={{ width: "100%", borderRadius: 8, maxHeight: 160 }} /></div> : <div style={{ marginTop: 8 }}><img src={createForm.mediaUrl} alt="Attached" style={{ width: "100%", borderRadius: 8, maxHeight: 160, objectFit: "cover" }} /></div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}><div><Lbl>Due Date</Lbl><Inp t={t} type="date" value={createForm.dueDate} onChange={e => setCreateForm({ ...createForm, dueDate: e.target.value })} /></div><div><Lbl>Due Time</Lbl><Inp t={t} type="time" value={createForm.dueTime} onChange={e => setCreateForm({ ...createForm, dueTime: e.target.value })} /></div></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setCreateForm(null)}>Cancel</Btn><Btn t={t} onClick={submitCreate}>Create and Assign</Btn></div>
    </div></Mdl>}
  </div>);
}

function VendorsPage({ af, showToast, isAdmin, t }) {
  const [vendors, setVendors] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [filter, setFilter] = useState("all");
  const [addForm, setAddForm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [addEval, setAddEval] = useState(null);
  const [linkSupply, setLinkSupply] = useState(null);
  const [q, setQ] = useState(""); const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(10);

  const load = () => af("/api/vendors").then(setVendors).catch(e => showToast(e.message, "error"));
  useEffect(() => { load(); af("/api/supplies").then(setSupplies).catch(e => console.warn(e.message)); }, []);

  const loadDetail = async id => {
    try { const d = await af("/api/vendors/" + id); setDetail(d); } catch (e) { showToast(e.message, "error"); }
  };

  const filtered = filter === "all" ? vendors : vendors.filter(v => v.approval_status === filter);

  const submitAdd = async () => {
    if (!addForm.name) { showToast("Vendor name required", "error"); return; }
    try { await af("/api/vendors", { method: "POST", body: addForm }); showToast("Vendor added"); setAddForm(null); load(); } catch (e) { showToast(e.message, "error"); }
  };

  const submitEdit = async () => {
    try { await af("/api/vendors/" + editForm.id, { method: "PATCH", body: editForm }); showToast("Vendor updated"); setEditForm(null); load(); if (detail) loadDetail(editForm.id); } catch (e) { showToast(e.message, "error"); }
  };

  const deactivate = async id => {
    try { await af("/api/vendors/" + id, { method: "DELETE" }); showToast("Vendor removed"); setDetail(null); load(); } catch (e) { showToast(e.message, "error"); }
  };

  const submitEval = async () => {
    if (!addEval.rating) { showToast("Rating required", "error"); return; }
    try { await af("/api/vendors/" + addEval.vendorId + "/evaluate", { method: "POST", body: { rating: parseInt(addEval.rating), notes: addEval.notes } }); showToast("Evaluation saved"); setAddEval(null); loadDetail(addEval.vendorId); } catch (e) { showToast(e.message, "error"); }
  };

  const submitLinkSupply = async () => {
    if (!linkSupply.supplyId) { showToast("Select a supply", "error"); return; }
    try { await af("/api/vendors/" + linkSupply.vendorId + "/link-supply", { method: "POST", body: { supplyId: linkSupply.supplyId, isPreferred: linkSupply.isPreferred, unitCost: linkSupply.unitCost || null, leadTimeDays: linkSupply.leadTime || null, notes: linkSupply.notes } }); showToast("Supply linked"); setLinkSupply(null); loadDetail(linkSupply.vendorId); } catch (e) { showToast(e.message, "error"); }
  };

  const unlinkSupply = async (vendorId, supplyId) => {
    try { await af("/api/vendors/" + vendorId + "/supply/" + supplyId, { method: "DELETE" }); showToast("Supply unlinked"); loadDetail(vendorId); } catch (e) { showToast(e.message, "error"); }
  };

  const exportAVL = () => {
    const approved = vendors.filter(v => v.approval_status === "approved");
    if (approved.length === 0) { showToast("No approved vendors to export", "error"); return; }
    dlCSV("OCSA_Approved_Vendor_List_" + new Date().toISOString().slice(0, 10) + ".csv",
      ["Vendor Name", "Contact Name", "Phone", "Email", "Address", "Products / Services", "Certification Status", "Contract Terms", "Last Review Date", "Approval Status"],
      approved.map(v => [v.name, v.contact_name || "", v.contact_phone || "", v.contact_email || "",
        [v.address_line1, v.city, v.state, v.zip_code].filter(Boolean).join(", "),
        v.products_services || "", v.certification_status || "", v.contract_terms || "",
        v.last_review_date ? fd(v.last_review_date) : "", v.approval_status])
    );
    showToast("Approved Vendor List exported");
  };

  const inactiveColor = t.dark ? "#8899AA" : "#556677";
  const statusColor = { approved: GR, pending: OR, probation: BL, inactive: inactiveColor };
  const emptyForm = { name: "", contactName: "", contactPhone: "", contactEmail: "", website: "", addressLine1: "", city: "", state: "", zipCode: "", productsServices: "", certificationStatus: "", contractTerms: "", approvalStatus: "pending", lastReviewDate: "" };

  const renderFormFields = (form, setForm) => (<>
    <div style={{ marginBottom: 12 }}><Lbl>Vendor Name *</Lbl><Inp t={t} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Spartan Chemical Company" /></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
      <div><Lbl>Contact Name</Lbl><Inp t={t} value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} /></div>
      <div><Lbl>Contact Phone</Lbl><Inp t={t} value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="2155550000" /></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
      <div><Lbl>Contact Email</Lbl><Inp t={t} value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} type="email" /></div>
      <div><Lbl>Website</Lbl><Inp t={t} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
    </div>
    <div style={{ marginBottom: 12 }}><Lbl>Address</Lbl><Inp t={t} value={form.addressLine1} onChange={e => setForm({ ...form, addressLine1: e.target.value })} placeholder="Street address" /></div>
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
      <div><Lbl>City</Lbl><Inp t={t} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
      <div><Lbl>State</Lbl><Inp t={t} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
      <div><Lbl>ZIP</Lbl><Inp t={t} value={form.zipCode} onChange={e => setForm({ ...form, zipCode: e.target.value })} /></div>
    </div>
    <div style={{ marginBottom: 12 }}><Lbl>Products / Services</Lbl><TArea t={t} value={form.productsServices} onChange={e => setForm({ ...form, productsServices: e.target.value })} rows={2} placeholder="Describe what this vendor supplies..." /></div>
    <div style={{ marginBottom: 12 }}><Lbl>Certification Status</Lbl><Inp t={t} value={form.certificationStatus} onChange={e => setForm({ ...form, certificationStatus: e.target.value })} placeholder="e.g. Green Seal Partner, EPA Safer Choice" /></div>
    <div style={{ marginBottom: 12 }}><Lbl>Contract Terms</Lbl><TArea t={t} value={form.contractTerms} onChange={e => setForm({ ...form, contractTerms: e.target.value })} rows={2} placeholder="Payment terms, minimum order, pricing structure..." /></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
      <div><Lbl>Approval Status</Lbl><Sel t={t} value={form.approvalStatus} onChange={e => setForm({ ...form, approvalStatus: e.target.value })} options={[{ v: "pending", l: "Pending Review" }, { v: "approved", l: "Approved" }, { v: "probation", l: "On Probation" }, { v: "inactive", l: "Inactive" }]} /></div>
      <div><Lbl>Last Review Date</Lbl><Inp t={t} type="date" value={form.lastReviewDate} onChange={e => setForm({ ...form, lastReviewDate: e.target.value })} /></div>
    </div>
  </>);

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 8 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Vendor Registry</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={exportAVL} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid " + t.goldBorder, background: t.goldBg, color: t.goldText, fontSize: 11, fontWeight: 600, cursor: "pointer" }}><DlI sz={13} c={t.goldText} /> Export AVL</button>
        {isAdmin && <button onClick={() => setAddForm({ ...emptyForm })} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "none", background: GO, color: NAVY, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><PlI sz={13} c={NAVY} /> Add Vendor</button>}
      </div>
    </div>

    <FilterTabs t={t} value={filter} onChange={f => { setFilter(f); setPage(1); }} tabs={[{ id: "all", label: "All", count: vendors.length, color: t.goldText }, { id: "approved", label: "Approved", count: vendors.filter(v => v.approval_status === "approved").length, color: GR }, { id: "pending", label: "Pending", count: vendors.filter(v => v.approval_status === "pending").length, color: OR }, { id: "probation", label: "Probation", count: vendors.filter(v => v.approval_status === "probation").length, color: BL }, { id: "inactive", label: "Inactive", count: vendors.filter(v => v.approval_status === "inactive").length, color: inactiveColor }]} />
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 200, position: "relative" }}><Ic d="M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" sz={16} c={t.textMut} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search vendor, contact, phone, email, services" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 36px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13 }} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: t.textMut }}>Show</span><select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} style={{ padding: "9px 10px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>{[10, 25, 50, 100].map(nn => <option key={nn} value={nn}>{nn}</option>)}</select></div>
    </div>

    {(() => {
      const searched = filtered.filter(v => {
        if (!q.trim()) return true;
        const hay = (v.name + " " + (v.contact_name || "") + " " + (v.contact_phone || "") + " " + (v.contact_email || "") + " " + (v.products_services || "")).toLowerCase();
        return hay.includes(q.trim().toLowerCase());
      });
      const totalPages = Math.max(1, Math.ceil(searched.length / perPage));
      const cur = Math.min(page, totalPages);
      const items = searched.slice((cur - 1) * perPage, cur * perPage);
      const columns = [
        { header: "Vendor", render: v => <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ fontFamily: FONT_HEAD, width: 38, height: 38, borderRadius: 8, background: t.goldBg, border: "1px solid " + t.goldBorder, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: t.goldText, flexShrink: 0 }}>{v.name.slice(0, 2).toUpperCase()}</div><div style={{ minWidth: 0 }}><div style={{ fontFamily: FONT_HEAD, fontWeight: 600, color: t.text }}>{v.name}</div>{v.products_services && <div style={{ fontSize: 11, color: t.textMut, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{v.products_services}</div>}{v.last_review_date && <div style={{ fontSize: 10, color: t.textMut, marginTop: 2 }}>Reviewed {fd(v.last_review_date)}</div>}</div></div> },
        { header: "Contact", tdStyle: { maxWidth: 220 }, render: v => <div style={{ minWidth: 0 }}>{v.contact_name && <div style={{ fontSize: 12, color: t.textSec, fontWeight: 500 }}>{v.contact_name}</div>}{v.contact_phone && <div style={{ fontSize: 11, color: t.textMut, marginTop: 1 }}>{v.contact_phone}</div>}{v.contact_email && <div style={{ fontSize: 11, color: t.textMut, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.contact_email}</div>}{!v.contact_name && !v.contact_phone && !v.contact_email && <span style={{ color: t.textMut }}>-</span>}</div> },
        { header: "Status", render: v => <Bdg l={v.approval_status} c={statusColor[v.approval_status] || t.textMut} /> },
        { header: "Rating", tdStyle: { whiteSpace: "nowrap" }, render: v => v.avg_rating ? <span style={{ color: t.goldText, fontSize: 12 }}>{"\u2605".repeat(Math.round(parseFloat(v.avg_rating)))} <span style={{ color: t.textMut }}>({parseFloat(v.avg_rating).toFixed(1)})</span></span> : <span style={{ color: t.textMut }}>-</span> },
        { header: "Supplies", tdStyle: { color: t.textSec, whiteSpace: "nowrap" }, render: v => v.linked_supply_count > 0 ? v.linked_supply_count + " linked" : "-" },
        { header: "Actions", align: "right", render: v => <button title="View vendor" onClick={e => { e.stopPropagation(); loadDetail(v.id); }} style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid " + t.goldBorder, background: t.goldBg, cursor: "pointer" }}><Ic d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" sz={15} c={t.goldText} /></button> }
      ];
      return <DataTable t={t} columns={columns} rows={items} rowKey={v => v.id} onRowClick={v => loadDetail(v.id)} empty={vendors.length === 0 ? "No vendors yet. Use Add Vendor to start." : "No vendors match these filters."} footer={<Pagination t={t} page={cur} perPage={perPage} total={searched.length} onPage={setPage} />} />;
    })()}

    {addForm && <Mdl t={t} onClose={() => setAddForm(null)}>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Add Vendor</div><button onClick={() => setAddForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
        {renderFormFields(addForm, setAddForm)}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAddForm(null)}>Cancel</Btn><Btn t={t} onClick={submitAdd}>Add Vendor</Btn></div>
      </div>
    </Mdl>}

    {detail && <Mdl t={t} onClose={() => setDetail(null)}>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div><div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: t.text }}>{detail.vendor.name}</div><div style={{ marginTop: 4 }}><Bdg l={detail.vendor.approval_status} c={statusColor[detail.vendor.approval_status] || t.textMut} /></div></div>
          <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, padding: 12, background: t.cardAlt, borderRadius: 8 }}>
          {detail.vendor.contact_name && <div style={{ fontSize: 11, color: t.textMut }}>Contact<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{detail.vendor.contact_name}</div></div>}
          {detail.vendor.contact_phone && <div style={{ fontSize: 11, color: t.textMut }}>Phone<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{detail.vendor.contact_phone}</div></div>}
          {detail.vendor.contact_email && <div style={{ fontSize: 11, color: t.textMut }}>Email<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{detail.vendor.contact_email}</div></div>}
          {detail.vendor.website && <div style={{ fontSize: 11, color: t.textMut }}>Website<div style={{ marginTop: 2 }}><a href={detail.vendor.website} target="_blank" rel="noopener noreferrer" style={{ color: BL, fontSize: 11 }}>View Site</a></div></div>}
          {(detail.vendor.address_line1 || detail.vendor.city) && <div style={{ fontSize: 11, color: t.textMut, gridColumn: "1 / -1" }}>Address<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{[detail.vendor.address_line1, detail.vendor.city, detail.vendor.state, detail.vendor.zip_code].filter(Boolean).join(", ")}</div></div>}
        </div>
        {detail.vendor.products_services && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Products and Services</div><div style={{ fontSize: 12, color: t.textSec, lineHeight: 1.5 }}>{detail.vendor.products_services}</div></div>}
        {detail.vendor.certification_status && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Certifications</div><div style={{ fontSize: 12, color: t.textSec }}>{detail.vendor.certification_status}</div></div>}
        {detail.vendor.contract_terms && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Contract Terms</div><div style={{ fontSize: 12, color: t.textSec, lineHeight: 1.5 }}>{detail.vendor.contract_terms}</div></div>}

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Linked Supplies</div>
            {isAdmin && <button onClick={() => setLinkSupply({ vendorId: detail.vendor.id, supplyId: "", isPreferred: false, unitCost: "", leadTime: "", notes: "" })} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}><PlI sz={10} c={t.goldText} /> Link Supply</button>}
          </div>
          {(!detail.linkedSupplies || detail.linkedSupplies.length === 0) && <div style={{ fontSize: 11, color: t.textMut }}>No supplies linked yet</div>}
          {detail.linkedSupplies?.map((ls, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: t.hover, borderRadius: 6, marginBottom: 3 }}>
              <div><div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{ls.supply_name}</div><div style={{ fontSize: 10, color: t.textMut, marginTop: 1 }}>{ls.unit_cost ? "$" + parseFloat(ls.unit_cost).toFixed(2) + "/unit" : ""}{ls.lead_time_days ? (ls.unit_cost ? " | " : "") + ls.lead_time_days + "d lead" : ""}{ls.is_preferred ? <span style={{ color: t.goldText, marginLeft: 6 }}>Preferred</span> : null}</div></div>
              {isAdmin && <button onClick={() => unlinkSupply(detail.vendor.id, ls.supply_id)} style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 8, cursor: "pointer" }}>Unlink</button>}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Evaluations</div>
            <button onClick={() => setAddEval({ vendorId: detail.vendor.id, rating: 0, notes: "" })} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}><PlI sz={10} c={t.goldText} /> Add</button>
          </div>
          {(!detail.evaluations || detail.evaluations.length === 0) && <div style={{ fontSize: 11, color: t.textMut }}>No evaluations on file</div>}
          {detail.evaluations?.map((ev, i) => (
            <div key={i} style={{ padding: 8, background: t.hover, borderRadius: 6, marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: t.goldText, letterSpacing: 2 }}>{"★".repeat(ev.rating)}{"☆".repeat(5 - ev.rating)}</span>
                <span style={{ fontSize: 10, color: t.textMut }}>{fd(ev.evaluation_date)}</span>
              </div>
              {ev.notes && <div style={{ fontSize: 11, color: t.textSec, marginTop: 4 }}>{ev.notes}</div>}
              {ev.evaluator_name && <div style={{ fontSize: 10, color: t.textMut, marginTop: 3 }}>By {ev.evaluator_name}</div>}
            </div>
          ))}
        </div>

        {isAdmin && <div style={{ display: "flex", gap: 8 }}>
          <Btn t={t} v="ghost" style={{ flex: 1 }} onClick={() => setEditForm({ id: detail.vendor.id, name: detail.vendor.name, contactName: detail.vendor.contact_name || "", contactPhone: detail.vendor.contact_phone || "", contactEmail: detail.vendor.contact_email || "", website: detail.vendor.website || "", addressLine1: detail.vendor.address_line1 || "", city: detail.vendor.city || "", state: detail.vendor.state || "", zipCode: detail.vendor.zip_code || "", productsServices: detail.vendor.products_services || "", certificationStatus: detail.vendor.certification_status || "", contractTerms: detail.vendor.contract_terms || "", approvalStatus: detail.vendor.approval_status, lastReviewDate: detail.vendor.last_review_date ? detail.vendor.last_review_date.slice(0, 10) : "" })}>Edit</Btn>
          <Btn t={t} v="danger" style={{ flex: 1 }} onClick={() => { if (window.confirm("Remove this vendor?")) deactivate(detail.vendor.id); }}>Remove</Btn>
        </div>}
      </div>
    </Mdl>}

    {editForm && <Mdl t={t} onClose={() => setEditForm(null)}>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Edit Vendor</div><button onClick={() => setEditForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
        {renderFormFields(editForm, setEditForm)}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setEditForm(null)}>Cancel</Btn><Btn t={t} onClick={submitEdit}>Save Changes</Btn></div>
      </div>
    </Mdl>}

    {addEval && <Mdl t={t} onClose={() => setAddEval(null)}>
      <div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, marginBottom: 16, color: t.text }}>Add Evaluation</div>
        <div style={{ marginBottom: 14 }}><Lbl>Rating *</Lbl>
          <div style={{ display: "flex", gap: 8 }}>
            {[1,2,3,4,5].map(r => (
              <button key={r} onClick={() => setAddEval({ ...addEval, rating: r })} style={{ width: 38, height: 38, borderRadius: 8, border: "1px solid " + (addEval.rating >= r ? GO : t.border), background: addEval.rating >= r ? t.goldBg : "transparent", color: addEval.rating >= r ? t.goldText : t.textMut, fontSize: 20, cursor: "pointer" }}>★</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}><Lbl>Notes</Lbl><TArea t={t} value={addEval.notes} onChange={e => setAddEval({ ...addEval, notes: e.target.value })} rows={3} placeholder="Performance notes, delivery quality, responsiveness..." /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAddEval(null)}>Cancel</Btn><Btn t={t} onClick={submitEval}>Save Evaluation</Btn></div>
      </div>
    </Mdl>}

    {linkSupply && <Mdl t={t} onClose={() => setLinkSupply(null)}>
      <div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, marginBottom: 16, color: t.text }}>Link Supply to Vendor</div>
        <div style={{ marginBottom: 12 }}><Lbl>Supply *</Lbl><Sel t={t} value={linkSupply.supplyId} onChange={e => setLinkSupply({ ...linkSupply, supplyId: e.target.value })} options={[{ v: "", l: "Select a supply..." }, ...supplies.map(s => ({ v: s.id, l: s.name }))]} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><Lbl>Unit Cost</Lbl><Inp t={t} type="number" value={linkSupply.unitCost} onChange={e => setLinkSupply({ ...linkSupply, unitCost: e.target.value })} placeholder="$0.00" /></div>
          <div><Lbl>Lead Time (days)</Lbl><Inp t={t} type="number" value={linkSupply.leadTime} onChange={e => setLinkSupply({ ...linkSupply, leadTime: e.target.value })} /></div>
        </div>
        <div style={{ marginBottom: 12 }}><Lbl>Notes</Lbl><Inp t={t} value={linkSupply.notes} onChange={e => setLinkSupply({ ...linkSupply, notes: e.target.value })} placeholder="Min order, availability notes..." /></div>
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={linkSupply.isPreferred} onChange={e => setLinkSupply({ ...linkSupply, isPreferred: e.target.checked })} /><span style={{ fontSize: 12, color: t.textSec }}>Mark as preferred vendor for this supply</span></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setLinkSupply(null)}>Cancel</Btn><Btn t={t} onClick={submitLinkSupply}>Link Supply</Btn></div>
      </div>
    </Mdl>}
  </div>);
}
function ServicesPage({ af, showToast, isAdmin, t, sites }) {
  const [services, setServices] = useState([]);
  const [detail, setDetail] = useState(null);
  const [addForm, setAddForm] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [linkSite, setLinkSite] = useState(null);

  const load = () => af("/api/services").then(setServices).catch(e => showToast(e.message, "error"));
  useEffect(() => { load(); }, []);

  const loadDetail = async id => {
    try { const d = await af("/api/services/" + id); setDetail(d); } catch (e) { showToast(e.message, "error"); }
  };

  const submitAdd = async () => {
    if (!addForm.name) { showToast("Service name required", "error"); return; }
    try { await af("/api/services", { method: "POST", body: addForm }); showToast("Service added"); setAddForm(null); load(); } catch (e) { showToast(e.message, "error"); }
  };

  const submitEdit = async () => {
    try { await af("/api/services/" + editForm.id, { method: "PATCH", body: editForm }); showToast("Service updated"); setEditForm(null); load(); if (detail) loadDetail(editForm.id); } catch (e) { showToast(e.message, "error"); }
  };

  const deactivate = async id => {
    try { await af("/api/services/" + id, { method: "DELETE" }); showToast("Service removed"); setDetail(null); load(); } catch (e) { showToast(e.message, "error"); }
  };

  const submitLinkSite = async () => {
    if (!linkSite.siteId) { showToast("Select a site", "error"); return; }
    try { await af("/api/services/" + linkSite.serviceId + "/link-site", { method: "POST", body: { siteId: linkSite.siteId, notes: linkSite.notes } }); showToast("Site linked"); setLinkSite(null); loadDetail(linkSite.serviceId); } catch (e) { showToast(e.message, "error"); }
  };

  const unlinkSite = async (serviceId, siteId) => {
    try { await af("/api/services/" + serviceId + "/site/" + siteId, { method: "DELETE" }); showToast("Site unlinked"); loadDetail(serviceId); } catch (e) { showToast(e.message, "error"); }
  };

  const exportCatalog = () => {
    if (services.length === 0) { showToast("No services to export", "error"); return; }
    dlCSV("OCSA_Service_Catalog_" + new Date().toISOString().slice(0, 10) + ".csv",
      ["Service Name", "Description", "Rate Structure", "Required Certifications", "Service Category", "Active Sites"],
      services.map(s => [s.name, s.description || "", s.rate_structure || "", s.required_certifications || "", s.cims_category || "", s.linked_site_count || 0])
    );
    showToast("Service catalog exported");
  };

  const cimsLabel = CIMS_LABELS;
  const cimsColor = { SD: BL, HSE: OR, GB: GR, QS: GO, HR: "#9B59B6", MC: "#1ABC9C" };

  const serviceIcons = {
    "office-cleaning": "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
    "laboratory-cleaning": "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2h-4m-6 0h6",
    "industrial-cleaning": "M2 20h20M6 20V10l6-6 6 6v10M10 20v-5h4v5",
    "biohazard-cleaning": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0v20M2 12h20",
    "post-construction-cleaning": "M2 20h20M4 20V10l8-8 8 8v10M9 20v-6h6v6",
    "disinfection-services": "M12 2L2 22h20L12 2zm0 7v5m0 3h.01",
    "landscaping": "M12 22V12M12 12C12 7 7 3 2 3c0 5 4 9 10 9zm0 0c0-5 5-9 10-9-1 5-5 9-10 9",
    "green-cleaning": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c-4 6-4 14 0 20M12 2c4 6 4 14 0 20",
  };

  const formFields = (form, setForm) => (<>
    <div style={{ marginBottom: 12 }}><Lbl>Service Name *</Lbl><Inp t={t} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office Cleaning" /></div>
    <div style={{ marginBottom: 12 }}><Lbl>Description</Lbl><TArea t={t} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe what this service covers..." /></div>
    <div style={{ marginBottom: 12 }}><Lbl>Rate Structure</Lbl><TArea t={t} value={form.rateStructure || form.rate_structure || ""} onChange={e => setForm({ ...form, rateStructure: e.target.value, rate_structure: e.target.value })} rows={2} placeholder="How is this service priced?" /></div>
    <div style={{ marginBottom: 12 }}><Lbl>Required Certifications</Lbl><TArea t={t} value={form.requiredCertifications || form.required_certifications || ""} onChange={e => setForm({ ...form, requiredCertifications: e.target.value, required_certifications: e.target.value })} rows={2} placeholder="Certifications staff must hold..." /></div>
    <div style={{ marginBottom: 16 }}><Lbl>Service Category</Lbl>
      <Sel t={t} value={form.cimsCategory || form.cims_category || "SD"} onChange={e => setForm({ ...form, cimsCategory: e.target.value, cims_category: e.target.value })}
        options={[{ v: "SD", l: "SD - Service Delivery" }, { v: "HSE", l: "HSE - Health Safety Environmental" }, { v: "GB", l: "GB - Green Buildings" }, { v: "QS", l: "QS - Quality System" }, { v: "HR", l: "HR - Human Resources" }, { v: "MC", l: "MC - Management Commitment" }]} />
    </div>
  </>);

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 8 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Service Catalog</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={exportCatalog} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid " + t.goldBorder, background: t.goldBg, color: t.goldText, fontSize: 11, fontWeight: 600, cursor: "pointer" }}><DlI sz={13} c={t.goldText} /> Export</button>
        {isAdmin && <button onClick={() => setAddForm({ name: "", description: "", rateStructure: "", requiredCertifications: "", cimsCategory: "SD" })} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "none", background: GO, color: NAVY, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><PlI sz={13} c={NAVY} /> Add Service</button>}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
      {services.map(s => (
        <Crd key={s.id} t={t} style={{ padding: 16, cursor: "pointer" }} onClick={() => loadDetail(s.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: (cimsColor[s.cims_category] || GO) + "18", border: "1px solid " + (cimsColor[s.cims_category] || GO) + "40", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic d={serviceIcons[s.slug] || "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"} sz={18} c={cimsColor[s.cims_category] || t.goldText} />
              </div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text, lineHeight: 1.3 }}>{s.name}</div>
            </div>
            <Bdg l={cimsLabel[s.cims_category] || s.cims_category} c={cimsColor[s.cims_category] || GO} />
          </div>
          {s.description && <div style={{ fontSize: 12, color: t.textSec, lineHeight: 1.5, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.description}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid " + t.border }}>
            <span style={{ fontSize: 10, color: t.textMut }}>{cimsLabel[s.cims_category] || s.cims_category}</span>
            {s.linked_site_count > 0 && <span style={{ fontSize: 10, color: GR }}>{s.linked_site_count} site{s.linked_site_count !== 1 ? "s" : ""}</span>}
          </div>
        </Crd>
      ))}
      {services.length === 0 && <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", color: t.textMut }}>No services yet.</div>}
    </div>

    {detail && <Mdl t={t} onClose={() => setDetail(null)}>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: t.text }}>{detail.service.name}</div>
            <div style={{ marginTop: 6 }}><Bdg l={cimsLabel[detail.service.cims_category] || detail.service.cims_category} c={cimsColor[detail.service.cims_category] || GO} /><span style={{ fontSize: 11, color: t.textMut, marginLeft: 8 }}>{cimsLabel[detail.service.cims_category]}</span></div>
          </div>
          <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button>
        </div>

        {detail.service.description && <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Description</div>
          <div style={{ fontSize: 12, color: t.textSec, lineHeight: 1.6 }}>{detail.service.description}</div>
        </div>}

        {detail.service.rate_structure && <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Rate Structure</div>
          <div style={{ fontSize: 12, color: t.textSec, lineHeight: 1.6 }}>{detail.service.rate_structure}</div>
        </div>}

        {detail.service.required_certifications && <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Required Certifications</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {detail.service.required_certifications.split(",").map((c, i) => (
              <span key={i} style={{ padding: "3px 8px", borderRadius: 4, background: t.greenSubtle, border: "1px solid " + t.greenBorder, fontSize: 11, color: GR }}>{c.trim()}</span>
            ))}
          </div>
        </div>}

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Active Sites</div>
            {isAdmin && <button onClick={() => setLinkSite({ serviceId: detail.service.id, siteId: "", notes: "" })} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}><PlI sz={10} c={t.goldText} /> Link Site</button>}
          </div>
          {(!detail.linkedSites || detail.linkedSites.length === 0) && <div style={{ fontSize: 11, color: t.textMut }}>No sites linked yet</div>}
          {detail.linkedSites?.map((ls, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: t.hover, borderRadius: 6, marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{ls.site_name}</div>
                {ls.city && <div style={{ fontSize: 10, color: t.textMut, marginTop: 1 }}>{ls.city}, {ls.state}</div>}
                {ls.notes && <div style={{ fontSize: 10, color: t.textSec, marginTop: 2 }}>{ls.notes}</div>}
              </div>
              {isAdmin && <button onClick={() => unlinkSite(detail.service.id, ls.site_id)} style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 8, cursor: "pointer" }}>Unlink</button>}
            </div>
          ))}
        </div>

        {isAdmin && <div style={{ display: "flex", gap: 8 }}>
          <Btn t={t} v="ghost" style={{ flex: 1 }} onClick={() => setEditForm({ id: detail.service.id, name: detail.service.name, description: detail.service.description || "", rateStructure: detail.service.rate_structure || "", rate_structure: detail.service.rate_structure || "", requiredCertifications: detail.service.required_certifications || "", required_certifications: detail.service.required_certifications || "", cimsCategory: detail.service.cims_category, cims_category: detail.service.cims_category })}>Edit</Btn>
          <Btn t={t} v="danger" style={{ flex: 1 }} onClick={() => { if (window.confirm("Remove this service?")) deactivate(detail.service.id); }}>Remove</Btn>
        </div>}
      </div>
    </Mdl>}

    {addForm && <Mdl t={t} onClose={() => setAddForm(null)}>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Add Service</div><button onClick={() => setAddForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
        {formFields(addForm, setAddForm)}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAddForm(null)}>Cancel</Btn><Btn t={t} onClick={submitAdd}>Add Service</Btn></div>
      </div>
    </Mdl>}

    {editForm && <Mdl t={t} onClose={() => setEditForm(null)}>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Edit Service</div><button onClick={() => setEditForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
        {formFields(editForm, setEditForm)}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setEditForm(null)}>Cancel</Btn><Btn t={t} onClick={submitEdit}>Save Changes</Btn></div>
      </div>
    </Mdl>}

    {linkSite && <Mdl t={t} onClose={() => setLinkSite(null)}>
      <div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, marginBottom: 16, color: t.text }}>Link Site to Service</div>
        <div style={{ marginBottom: 12 }}><Lbl>Site *</Lbl><Sel t={t} value={linkSite.siteId} onChange={e => setLinkSite({ ...linkSite, siteId: e.target.value })} options={[{ v: "", l: "Select a site..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
        <div style={{ marginBottom: 16 }}><Lbl>Notes (optional)</Lbl><Inp t={t} value={linkSite.notes} onChange={e => setLinkSite({ ...linkSite, notes: e.target.value })} placeholder="e.g. Green cleaning only, monthly frequency" /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setLinkSite(null)}>Cancel</Btn><Btn t={t} onClick={submitLinkSite}>Link Site</Btn></div>
      </div>
    </Mdl>}
  </div>);
}

// ===== SCHEDULE PAGE =====
// ===== WEEKLY PATTERNS: a standing pattern the API keeps and refills ahead =====
const PATTERN_DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const PATTERN_DAY_LABELS = { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" };
const patternDays = (days) => (Array.isArray(days) ? days : []).slice().sort((a, b) => PATTERN_DAY_KEYS.indexOf(a) - PATTERN_DAY_KEYS.indexOf(b)).map(d => PATTERN_DAY_LABELS[d] || d).join(", ");
const patternTime = (hhmm) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || "")); if (!m) return String(hhmm || ""); let h = Number(m[1]); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + m[2] + " " + ap; };
const patternHours = (p) => patternTime(p.startTime) + " to " + patternTime(p.endTime) + (p.overnight ? " ends next day" : "");
const patternDate = (d) => d ? new Date(String(d).length <= 10 ? d + "T00:00:00" : d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
// An end time earlier than the start time means the shift runs into the next morning, so the day
// chosen is the day it starts. Zero-padded HH:MM compares correctly as text. Equal times are not
// overnight; the API refuses those on its own.
// The API accepts "en" or "es" and refuses anything else, so every stored spelling is read down to
// one of the two. Blank, unknown or a full language name all resolve; "espa" catches espanol with
// or without its accent.
const LANG_OPTS = [{ v: "en", l: "English" }, { v: "es", l: "Spanish" }];
const langCode = (v) => { const x = String(v == null ? "" : v).trim().toLowerCase(); return (x === "es" || x === "spanish" || x.indexOf("espa") === 0) ? "es" : "en"; };
const langLabel = (v) => langCode(v) === "es" ? "Spanish" : "English";
const runsPastMidnight = (start, end) => !!start && !!end && String(end) < String(start);
const OVERNIGHT_NOTE = "This shift runs past midnight. Pick the day it starts.";
const todayISO = () => { const n = new Date(); return [n.getFullYear(), String(n.getMonth() + 1).padStart(2, "0"), String(n.getDate()).padStart(2, "0")].join("-"); };

function PatternWindow({ af, t, id, sites, allStaff, onClose, onChanged, onOpenOther }) {
  const [pattern, setPattern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [effectiveFrom, setEffectiveFrom] = useState(todayISO());
  const [lastDate, setLastDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const d = await af("/api/schedule/patterns/" + encodeURIComponent(id));
      const p = (d && d.pattern) || null;
      setPattern(p);
      if (p) setForm({ days: Array.isArray(p.days) ? p.days.slice() : [], startTime: p.startTime || "", endTime: p.endTime || "", buildingName: p.buildingName || "", floorNumber: p.floorNumber == null ? "" : String(p.floorNumber), serviceCategory: p.serviceCategory || "", notes: p.notes || "" });
    } catch (e) { setError(e.message || "Request failed"); }
    setLoading(false);
  }, [af, id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleDay = (k) => setForm(f => ({ ...f, days: f.days.includes(k) ? f.days.filter(d => d !== k) : [...f.days, k] }));
  const showResult = (r) => {
    setResult({
      created: Number(r && r.created) || 0, removed: Number(r && r.removed) || 0, keptCount: Number(r && r.keptCount) || 0,
      kept: Array.isArray(r && r.kept) ? r.kept : [], skipped: Array.isArray(r && r.skipped) ? r.skipped : [], skippedCount: Number(r && r.skippedCount) || 0,
    });
    if (r && r.pattern) setPattern(r.pattern);
    if (onChanged) onChanged();
  };
  // Only what changed is sent, plus the date the change starts from.
  const save = async () => {
    if (!pattern || !form || busy) return;
    const body = {};
    const sameDays = form.days.length === (pattern.days || []).length && form.days.every(d => (pattern.days || []).includes(d));
    if (!sameDays) body.days = PATTERN_DAY_KEYS.filter(k => form.days.includes(k));
    if (form.startTime !== (pattern.startTime || "")) body.startTime = form.startTime;
    if (form.endTime !== (pattern.endTime || "")) body.endTime = form.endTime;
    if (form.buildingName !== (pattern.buildingName || "")) body.buildingName = form.buildingName || null;
    if (form.floorNumber !== (pattern.floorNumber == null ? "" : String(pattern.floorNumber))) body.floorNumber = form.floorNumber || null;
    if (form.serviceCategory !== (pattern.serviceCategory || "")) body.serviceCategory = form.serviceCategory || null;
    if (form.notes !== (pattern.notes || "")) body.notes = form.notes || null;
    if (Object.keys(body).length === 0) { setError("Nothing changed yet."); return; }
    body.effectiveFrom = effectiveFrom;
    setBusy(true); setError(""); setResult(null);
    try { showResult(await af("/api/schedule/patterns/" + encodeURIComponent(id), { method: "PATCH", body })); }
    catch (e) { setError(e.message || "Request failed"); }
    setBusy(false);
  };
  const endPattern = async () => {
    if (!pattern || busy) return;
    setBusy(true); setError(""); setResult(null); setConfirming(false);
    try { showResult(await af("/api/schedule/patterns/" + encodeURIComponent(id) + "/end", { method: "POST", body: { lastDate } })); }
    catch (e) { setError(e.message || "Request failed"); }
    setBusy(false);
  };

  const started = pattern && pattern.startsOn && String(pattern.startsOn) <= todayISO();
  return (<Mdl t={t} onClose={onClose}><div style={{ padding: 20 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Weekly pattern</div>
        {pattern && <div style={{ marginTop: 6, fontSize: 12, color: t.textSec, lineHeight: 1.6 }}>
          <div>{pattern.userName} at {pattern.siteName}</div>
          <div>{patternDays(pattern.days)} {patternHours(pattern)}</div>
          <div>Starts {patternDate(pattern.startsOn)}, {pattern.endsOn ? "ends " + patternDate(pattern.endsOn) : "No end"}</div>
          <div>Filled through {patternDate(pattern.generatedThrough)}</div>
          {pattern.replacesPatternId && <button onClick={() => onOpenOther(pattern.replacesPatternId)} style={{ background: "none", border: "none", color: t.goldText, fontWeight: 600, fontSize: 12, fontFamily: FONT_BODY, cursor: "pointer", padding: "4px 0" }}>Replaces an earlier pattern</button>}
        </div>}
      </div>
      <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><XI sz={18} c={t.textMut} /></button>
    </div>
    {loading && <div style={{ padding: 30, textAlign: "center", color: t.textMut, fontSize: 13 }}>Loading...</div>}
    {!loading && pattern && form && (<>
      <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: t.hover, border: "1px solid " + t.border }}>
        <Lbl>Change</Lbl>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
          {PATTERN_DAY_KEYS.map(k => <button key={k} onClick={() => toggleDay(k)} aria-label={PATTERN_DAY_LABELS[k]} aria-pressed={form.days.includes(k)} style={{ width: 44, height: 44, borderRadius: 6, fontSize: 11, fontWeight: form.days.includes(k) ? 700 : 500, cursor: "pointer", background: form.days.includes(k) ? GO : "transparent", color: form.days.includes(k) ? NAVY : t.textMut, border: "1px solid " + (form.days.includes(k) ? GO : t.border), fontFamily: FONT_BODY }}>{PATTERN_DAY_LABELS[k]}</button>)}
        </div>
        {runsPastMidnight(form.startTime, form.endTime) && <div style={{ fontSize: 11, color: t.textMut, marginBottom: 10 }}>{OVERNIGHT_NOTE}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><Lbl>Start time</Lbl><Inp t={t} type="time" aria-label="Start time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} /></div>
          <div><Lbl>End time</Lbl><Inp t={t} type="time" aria-label="End time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><Lbl>Building</Lbl><Inp t={t} aria-label="Building" value={form.buildingName} onChange={e => setForm({ ...form, buildingName: e.target.value })} /></div>
          <div><Lbl>Floor</Lbl><Inp t={t} aria-label="Floor" value={form.floorNumber} onChange={e => setForm({ ...form, floorNumber: e.target.value })} /></div>
        </div>
        <div style={{ marginBottom: 10 }}><Lbl>Service category</Lbl><Inp t={t} aria-label="Service category" value={form.serviceCategory} onChange={e => setForm({ ...form, serviceCategory: e.target.value })} /></div>
        <div style={{ marginBottom: 10 }}><Lbl>Notes</Lbl><Inp t={t} aria-label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        <div style={{ marginBottom: 8 }}><Lbl>Changes start on</Lbl><Inp t={t} type="date" aria-label="Changes start on" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} style={{ width: 170 }} /></div>
        <Btn t={t} onClick={save} disabled={busy} style={{ minHeight: 44 }}>Save changes</Btn>
        {started && <div style={{ fontSize: 11, color: t.textMut, marginTop: 6 }}>Shifts before this date stay as they are. Shifts someone changed or cancelled by hand are kept.</div>}
      </div>
      <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: t.hover, border: "1px solid " + t.border }}>
        <Lbl>End</Lbl>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><Lbl>Last day</Lbl><Inp t={t} type="date" aria-label="Last day" value={lastDate} onChange={e => setLastDate(e.target.value)} style={{ width: 170 }} /></div>
          <Btn t={t} v="danger" onClick={() => setConfirming(true)} disabled={busy} style={{ minHeight: 44 }}>End pattern</Btn>
        </div>
        {confirming && <div style={{ marginTop: 10, fontSize: 12, color: t.text }}>
          <div style={{ marginBottom: 6 }}>End this pattern after {patternDate(lastDate)}? Future shifts it added are removed, except ones changed by hand.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn t={t} v="danger" aria-label="Confirm ending this pattern" onClick={endPattern} disabled={busy} style={{ minHeight: 44 }}>End pattern</Btn>
            <Btn t={t} v="ghost" aria-label="Cancel ending this pattern" onClick={() => setConfirming(false)} disabled={busy} style={{ minHeight: 44 }}>Cancel</Btn>
          </div>
        </div>}
      </div>
    </>)}
    {error && <div style={{ fontSize: 12, color: RD, marginBottom: 10 }}>{error}</div>}
    {result && <div style={{ fontSize: 12, color: t.text, marginBottom: 10 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{result.created} added, {result.removed} removed, {result.keptCount} kept</div>
      {result.kept.map((k, i) => <div key={"k" + i} style={{ color: t.textSec }}>{patternDate(k.date)}: {k.reason}</div>)}
      {result.skipped.map((k, i) => <div key={"s" + i} style={{ color: t.textSec }}>{patternDate(k.date)}: {k.reason}</div>)}
    </div>}
    <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={onClose} style={{ minHeight: 44 }}>Close</Btn></div>
  </div></Mdl>);
}

function PatternsView({ af, t, sites = [], allStaff = [], refreshKey, openId, onOpen, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [status, setStatus] = useState("active");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const q = ["status=" + encodeURIComponent(status)];
    if (userId) q.push("userId=" + encodeURIComponent(userId));
    if (siteId) q.push("siteId=" + encodeURIComponent(siteId));
    try { const d = await af("/api/schedule/patterns?" + q.join("&")); setRows(d && Array.isArray(d.patterns) ? d.patterns : []); }
    catch (e) { setRows([]); setError(e.message || "Request failed"); }
    setLoading(false);
  }, [af, status, userId, siteId]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const columns = [
    { header: "Person", render: p => <span style={{ color: t.text }}>{p.userName}</span> },
    { header: "Site", tdStyle: { color: t.textSec }, render: p => p.siteName },
    { header: "Days", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: p => patternDays(p.days) },
    { header: "Hours", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: p => patternHours(p) },
    { header: "Starts", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: p => patternDate(p.startsOn) },
    { header: "Ends", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: p => p.endsOn ? patternDate(p.endsOn) : "No end" },
    { header: "Upcoming", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: p => Number(p.upcomingShifts) || 0 },
  ];
  const statusBtn = (v, l) => <button key={v} onClick={() => setStatus(v)} style={{ minHeight: 44, padding: "0 14px", borderRadius: 6, fontSize: 12, fontWeight: status === v ? 700 : 500, background: status === v ? t.goldBg : "transparent", color: status === v ? t.goldText : t.textMut, border: "1px solid " + (status === v ? t.goldBorder : t.border), cursor: "pointer", fontFamily: FONT_BODY }}>{l}</button>;

  return (<div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
      <Sel t={t} aria-label="Person" value={userId} onChange={e => setUserId(e.target.value)} options={[{ v: "", l: "All people" }, ...allStaff.map(u => ({ v: u.id, l: u.name || ((u.firstName || "") + " " + (u.lastName || "")).trim() }))]} style={{ width: 200, fontSize: 12 }} />
      <Sel t={t} aria-label="Site" value={siteId} onChange={e => setSiteId(e.target.value)} options={[{ v: "", l: "All sites" }, ...sites.map(s => ({ v: s.id, l: s.name }))]} style={{ width: 200, fontSize: 12 }} />
      <div style={{ display: "flex", gap: 6 }}>{statusBtn("active", "Active")}{statusBtn("ended", "Ended")}{statusBtn("all", "All")}</div>
    </div>
    {loading && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Loading patterns...</div>}
    {!loading && error && <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: t.textSec }}>{error} <button onClick={load} style={{ minHeight: 44, background: "none", border: "none", color: t.goldText, fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY, cursor: "pointer" }}>Try again</button></div>}
    {!loading && !error && <DataTable t={t} columns={columns} rows={rows} rowKey={p => p.id} onRowClick={p => onOpen(p.id)} empty="No patterns yet. Turn on Repeat when adding a shift to create one." />}
    {openId && <PatternWindow af={af} t={t} id={openId} sites={sites} allStaff={allStaff} onClose={onClose} onChanged={load} onOpenOther={onOpen} />}
  </div>);
}

// ===== TIME OFF: what staff asked for, and the decision the approver makes =====
// Every YYYY-MM-DD is split into its parts and built as a local date. Handing the string to
// new Date() reads it as UTC midnight, which is the evening before in Philadelphia, so every
// date would show a day early. Times are read the same way, by arithmetic, with no Date at all.
const timeOffLocal = (ymd) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || "")); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; };
const timeOffDate = (ymd) => { const d = timeOffLocal(ymd); return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""; };
const timeOffDayMonth = (ymd) => { const d = timeOffLocal(ymd); return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""; };
const timeOffWeekday = (ymd) => { const d = timeOffLocal(ymd); return d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : ""; };
// One day, one date. Inside a year, the year is said once at the end. Across years, both carry it.
const timeOffDates = (startsOn, endsOn) => {
  const s = String(startsOn || ""); const e = String(endsOn || "") || s;
  if (!s) return "";
  if (s === e) return timeOffDate(s);
  if (s.slice(0, 4) === e.slice(0, 4)) return timeOffDayMonth(s) + " to " + timeOffDate(e);
  return timeOffDate(s) + " to " + timeOffDate(e);
};
const timeOffTimes = (r) => r && r.partDay && r.startTime && r.endTime ? patternTime(r.startTime) + " to " + patternTime(r.endTime) : "All day";
const timeOffHours = (h) => { if (h == null || h === "") return "Not given"; const n = Number(h); if (!isFinite(n)) return "Not given"; return (Math.round(n * 100) / 100) + (n === 1 ? " hour" : " hours"); };
const timeOffMoment = (iso) => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const TIME_OFF_STATUS_LABELS = { requested: "Requested", approved: "Approved", denied: "Denied", cancelled: "Cancelled" };
const timeOffStatus = (s) => TIME_OFF_STATUS_LABELS[String(s || "")] || String(s || "");
const timeOffShiftLine = (sh) => [timeOffWeekday(sh.date), patternTime(sh.startTime) + " to " + patternTime(sh.endTime), sh.siteName].filter(Boolean).join(", ");
const TIME_OFF_LIMIT = 200;
const timeOffQuery = (status, userId) => "/api/time-off?status=" + encodeURIComponent(status) + "&limit=" + TIME_OFF_LIMIT + (userId ? "&userId=" + encodeURIComponent(userId) : "");
const TIME_OFF_ORDER_NOTE = "Soonest first. Deciding a request leaves the schedule as it is.";
const TIME_OFF_CAPPED = "Showing the first " + TIME_OFF_LIMIT + ". Choose a person to narrow the list.";

const TIME_OFF_SHIFT_NOTE = "Deciding this request leaves these shifts as they are. Change or cover them on the schedule.";
const TIME_OFF_OWN = "Someone else has to decide your own request.";
const TIME_OFF_NOTE_HINT = "The person reads your note in the app. Their notice shows only the dates.";
const TIME_OFF_NOTE_REQUIRED = "Add a note saying why";

// One request, opened from a row, in the same shell as the Pattern window. Approve and Deny are the
// only things it sends. A refusal is shown in the window word for word and nothing closes, so the
// person can read it and try again. A decision that lost a race, answered 409, reloads the request
// so the window shows what is true now.
function TimeOffWindow({ af, t, seed, myId, showToast, onClose, onDecided }) {
  const [req, setReq] = useState(seed);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [noteError, setNoteError] = useState("");
  const sending = useRef(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const reload = async () => {
    try { const d = await af("/api/time-off/" + encodeURIComponent(req.id)); if (d && d.request) setReq(d.request); }
    catch (e) { setError(e.message || "Request failed"); }
  };
  // One send at a time. The ref closes the gap before the disabled buttons redraw, so a double
  // click is one request.
  const decide = async (kind) => {
    if (sending.current) return;
    const trimmed = note.trim();
    if (kind === "deny" && !trimmed) { setNoteError(TIME_OFF_NOTE_REQUIRED); return; }
    sending.current = true; setBusy(true); setError(""); setNoteError("");
    try {
      const d = await af("/api/time-off/" + encodeURIComponent(req.id) + "/" + kind, { method: "POST", body: trimmed ? { note: trimmed } : {} });
      if (d && d.request) setReq(d.request);
      setNote("");
      showToast(kind === "deny" ? "Time off denied. They get a notice in the app." : "Time off approved. They get a notice in the app.");
      if (onDecided) onDecided();
    } catch (e) {
      setError(e.message || "Request failed");
      if (e.status === 409) { await reload(); if (onDecided) onDecided(); }
    }
    sending.current = false; setBusy(false);
  };

  const row = (label, value) => <div key={label} style={{ display: "flex", gap: 10, fontSize: 12, marginBottom: 5 }}><span style={{ minWidth: 86, flexShrink: 0, color: t.textMut }}>{label}</span><span style={{ color: t.text, minWidth: 0 }}>{value}</span></div>;
  const shifts = Array.isArray(req.shifts) ? req.shifts : [];
  const decided = req.status === "approved" || req.status === "denied";
  const mine = !!myId && req.userId != null && String(req.userId) === myId;

  return (<Mdl t={t} onClose={onClose}><div style={{ padding: 20 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Time off request</div>
      <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><XI sz={18} c={t.textMut} /></button>
    </div>
    <div style={{ marginBottom: 14 }}>
      {row("Person", req.userName)}
      {row("Type", req.leaveTypeLabel)}
      {row("Dates", timeOffDates(req.startsOn, req.endsOn))}
      {req.partDay ? row("Time", timeOffTimes(req)) : null}
      {row("Hours", timeOffHours(req.hours))}
      {row("Status", timeOffStatus(req.status))}
      {row("Asked", timeOffMoment(req.createdAt))}
      {row("Reason", req.reason ? String(req.reason) : "No reason given")}
    </div>
    <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: t.hover, border: "1px solid " + t.border }}>
      <Lbl>Shifts on these days</Lbl>
      {shifts.length === 0 && <div style={{ fontSize: 12, color: t.textSec }}>No shifts on these days.</div>}
      {shifts.map((sh, i) => <div key={sh.id || i} style={{ fontSize: 12, color: t.text, marginBottom: 4 }}>{timeOffShiftLine(sh)}{sh.status && sh.status !== "scheduled" ? <span style={{ color: t.textMut }}> {sh.status}</span> : null}</div>)}
      {shifts.length > 0 && <div style={{ fontSize: 11, color: t.textMut, marginTop: 6 }}>{TIME_OFF_SHIFT_NOTE}</div>}
    </div>
    {decided && <div style={{ marginBottom: 14 }}>
      {row("Decided by", req.decidedByName || "")}
      {row("Decided", timeOffMoment(req.decidedAt))}
      {row("Note", req.decisionNote ? String(req.decisionNote) : "No note")}
    </div>}
    {req.status === "cancelled" && <div style={{ marginBottom: 14, fontSize: 12, color: t.text }}>
      <div style={{ marginBottom: 4 }}>Cancelled by the person who asked</div>
      <div style={{ color: t.textSec }}>{timeOffMoment(req.cancelledAt)}</div>
    </div>}
    {req.status === "requested" && mine && <div style={{ marginBottom: 14, fontSize: 12, color: t.textSec }}>{TIME_OFF_OWN}</div>}
    {req.status === "requested" && !mine && <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: t.hover, border: "1px solid " + t.border }}>
      <Lbl>Note</Lbl>
      <TArea t={t} rows={3} aria-label="Note" value={note} onChange={e => { setNote(e.target.value); if (noteError) setNoteError(""); }} placeholder="Optional when approving. Required when denying." />
      {noteError && <div style={{ fontSize: 12, color: RD, marginTop: 6 }}>{noteError}</div>}
      <div style={{ fontSize: 11, color: t.textMut, marginTop: 6, marginBottom: 10 }}>{TIME_OFF_NOTE_HINT}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn t={t} onClick={() => decide("approve")} disabled={busy} style={{ minHeight: 44 }}>Approve</Btn>
        <Btn t={t} v="danger" onClick={() => decide("deny")} disabled={busy} style={{ minHeight: 44 }}>Deny</Btn>
      </div>
    </div>}
    {error && <div style={{ fontSize: 12, color: RD, marginBottom: 10 }}>{error}</div>}
    <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={onClose} style={{ minHeight: 44 }}>Close</Btn></div>
  </div></Mdl>);
}

// The list of requests, with the status buttons and the person picker above it. Every change of a
// filter is one call. A refused call puts the API's words where the table would be and leaves the
// filters working, so the person can try another status without reloading the page.
function TimeOffView({ af, t, allStaff = [], myId, showToast, onCountChange }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("requested");
  const [userId, setUserId] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const d = await af(timeOffQuery(status, userId)); setRows(d && Array.isArray(d.requests) ? d.requests : []); }
    catch (e) { setRows([]); setError(e.message || "Request failed"); }
    setLoading(false);
  }, [af, status, userId]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { header: "Person", render: r => <span style={{ color: t.text }}>{r.userName}</span> },
    { header: "Type", tdStyle: { color: t.textSec }, render: r => r.leaveTypeLabel },
    { header: "Dates", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: r => timeOffDates(r.startsOn, r.endsOn) },
    { header: "Time", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: r => timeOffTimes(r) },
    { header: "Hours", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: r => timeOffHours(r.hours) },
    { header: "Shifts", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: r => Array.isArray(r.shifts) && r.shifts.length > 0 ? r.shifts.length : "None" },
    { header: "Status", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: r => timeOffStatus(r.status) },
    { header: "Asked", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: r => patternDate(r.createdAt) },
  ];
  const statusBtn = (v, l) => <button key={v} onClick={() => setStatus(v)} style={{ minHeight: 44, padding: "0 14px", borderRadius: 6, fontSize: 12, fontWeight: status === v ? 700 : 500, background: status === v ? t.goldBg : "transparent", color: status === v ? t.goldText : t.textMut, border: "1px solid " + (status === v ? t.goldBorder : t.border), cursor: "pointer", fontFamily: FONT_BODY }}>{l}</button>;
  const empty = status === "requested" ? "No time off is waiting for a decision." : "No time off requests to show.";

  return (<div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{statusBtn("requested", "Requested")}{statusBtn("approved", "Approved")}{statusBtn("denied", "Denied")}{statusBtn("cancelled", "Cancelled")}{statusBtn("all", "All")}</div>
      <Sel t={t} aria-label="Person" value={userId} onChange={e => setUserId(e.target.value)} options={[{ v: "", l: "Everyone" }, ...allStaff.map(u => ({ v: u.id, l: u.name || ((u.firstName || "") + " " + (u.lastName || "")).trim() }))]} style={{ width: 200, fontSize: 12 }} />
    </div>
    {status === "requested" && <div style={{ fontSize: 12, color: t.textMut, marginBottom: 10 }}>{TIME_OFF_ORDER_NOTE}</div>}
    {loading && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Loading time off...</div>}
    {!loading && error && <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: t.textSec }}>{error} <button onClick={load} style={{ minHeight: 44, background: "none", border: "none", color: t.goldText, fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY, cursor: "pointer" }}>Try again</button></div>}
    {!loading && !error && <DataTable t={t} columns={columns} rows={rows} rowKey={r => r.id} onRowClick={r => setOpen(r)} empty={empty} />}
    {!loading && !error && rows.length >= TIME_OFF_LIMIT && <div style={{ fontSize: 12, color: t.textMut, marginTop: 10 }}>{TIME_OFF_CAPPED}</div>}
    {open && <TimeOffWindow af={af} t={t} seed={open} myId={myId} showToast={showToast} onClose={() => setOpen(null)} onDecided={() => { load(); if (onCountChange) onCountChange(); }} />}
  </div>);
}

function SchedulePage({ af, showToast, isAdmin, t, sites, allStaff, user, getOpts, lkMap, lkColorMap }) {
  const SERVICE_CATS = [{ v: "", l: "No specific service" }, ...getOpts("service_categories")];
  const [view, setView] = useState("week");
  const [dateRange, setDateRange] = useState(() => PRESETS.thisWeek());
  const [filterSite, setFilterSite] = useState("");
  const [searchStaff, setSearchStaff] = useState("");
  const [schedPage, setSchedPage] = useState(1);
  const [schedRows, setSchedRows] = useState(10);
  const staffList = allStaff;
  const [calData, setCalData] = useState({ scheduled_shifts: [], inspections: [] });
  const [startedByDay, setStartedByDay] = useState({});
  const [startedDetail, setStartedDetail] = useState(null);
  const [openShifts, setOpenShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [createForm, setCreateForm] = useState({ userId: "", siteId: "", startTime: "08:00", endTime: "16:00", notes: "", buildingName: "", floorNumber: "", serviceCategory: "", repeat: false, repeatDays: [], repeatMode: "weeks", repeatWeeks: 4, repeatUntil: "" });
  const [siteLocations, setSiteLocations] = useState({});
  const [inspModal, setInspModal] = useState(null);
  const [inspForm, setInspForm] = useState({ assigned_to: "", scheduled_date: "" });
  const [schedSupervisors, setSchedSupervisors] = useState([]);
  const [pickupDetail, setPickupDetail] = useState(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [patternError, setPatternError] = useState("");
  const [patternConflictId, setPatternConflictId] = useState("");
  const [patternSkipped, setPatternSkipped] = useState(null);
  const [patternsRefresh, setPatternsRefresh] = useState(0);
  const [patternOpenId, setPatternOpenId] = useState(null);
  // Time off. One quiet call when the page opens decides whether this person is offered the view:
  // a 200 means they hold the capability and the count is what is waiting, and any other answer,
  // a 403 without it or a 404 before the routes are live, leaves the page exactly as it was.
  const [timeOffWaiting, setTimeOffWaiting] = useState(null);
  const myId = user && user.id != null ? String(user.id) : "";
  const loadTimeOffCount = useCallback(async () => {
    try { const d = await af(timeOffQuery("requested", "")); setTimeOffWaiting(Array.isArray(d && d.requests) ? d.requests.length : 0); }
    catch (e) { setTimeOffWaiting(null); }
  }, [af]);
  useEffect(() => { loadTimeOffCount(); }, [loadTimeOffCount]);

  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const loadSiteLocations = async (siteId) => {
    if (!siteId || siteLocations[siteId]) return;
    setSiteLocations(prev => ({ ...prev, [siteId]: { loading: true } }));
    try {
      const tasks = await af("/api/sites/" + siteId + "/tasks");
      const bSet = new Set(); const fMap = {};
      (tasks.templates || tasks || []).forEach(tk => {
        const b = tk.building_name || tk.buildingName;
        const f = tk.floor_number || tk.floorNumber;
        if (b) { bSet.add(b); if (!fMap[b]) fMap[b] = new Set(); if (f) fMap[b].add(String(f)); }
      });
      const floors = {};
      Object.keys(fMap).forEach(b => { floors[b] = [...fMap[b]].sort(); });
      setSiteLocations(prev => ({ ...prev, [siteId]: { buildings: [...bSet].sort(), floors } }));
    } catch (e) { console.error("Load site locations error:", e); setSiteLocations(prev => { const next = { ...prev }; delete next[siteId]; return next; }); }
  };

  const getBuildingOpts = (siteId) => {
    const loc = siteLocations[siteId];
    if (loc && loc.loading) return [{ v: "", l: "Loading buildings..." }];
    if (!loc || loc.buildings.length === 0) return [{ v: "", l: "No buildings configured" }];
    return [{ v: "", l: "Select building..." }, ...loc.buildings.map(b => ({ v: b, l: b }))];
  };
  const getFloorOpts = (siteId, building) => {
    const loc = siteLocations[siteId];
    if (!loc || loc.loading || !building || !loc.floors[building] || loc.floors[building].length === 0) return [{ v: "", l: "Select floor..." }];
    return [{ v: "", l: "Select floor..." }, ...loc.floors[building].map(f => ({ v: f, l: "Floor " + f }))];
  };

  // The Started lane. One call per visible range to GET /api/shift-sessions/by-site, grouped by
  // sessionDate in the client. Over a range the API returns one row per person per day, so a person
  // who started on two days appears under both and is never collapsed to one. The day is never
  // derived from startedAt, which is a timestamp in another zone; sessionDate is the plain
  // YYYY-MM-DD string the API projects for exactly this purpose.
  const STARTED_MAX_DAYS = 31;
  const loadStarted = async (range) => {
    const r = range || dateRange;
    if (!r.start || !r.end || r.end < r.start) { setStartedByDay({}); return; }
    const startMs = Date.parse(r.start + "T00:00:00Z");
    let end = r.end;
    if (Math.round((Date.parse(end + "T00:00:00Z") - startMs) / 86400000) + 1 > STARTED_MAX_DAYS) end = toISO(new Date(startMs + (STARTED_MAX_DAYS - 1) * 86400000));
    try {
      const d = await af("/api/shift-sessions/by-site?start_date=" + r.start + "&end_date=" + end);
      const byDay = {};
      (d.sites || []).forEach(site => (site.people || []).forEach(p => {
        if (!p.sessionDate) return;
        if (!byDay[p.sessionDate]) byDay[p.sessionDate] = [];
        byDay[p.sessionDate].push({ ...p, siteId: site.siteId, siteName: site.siteName });
      }));
      setStartedByDay(byDay);
    } catch (e) {
      // A 400 (INVALID_DATE_RANGE) or any other failure leaves the lane empty and quiet. The planned lane is unaffected.
      setStartedByDay({});
      console.warn("Load started shifts:", e.message);
    }
  };

  const loadCalendar = async (range) => {
    setLoading(true);
    const r = range || dateRange;
    loadStarted(r);
    try {
      let url = "/api/schedule/calendar?start_date=" + r.start + "&end_date=" + r.end;
      if (filterSite) url += "&site_id=" + filterSite;
      const [d, pk] = await Promise.all([
        af(url),
        af("/api/pickups?start_date=" + r.start + "&end_date=" + r.end + (filterSite ? "&site_id=" + filterSite : ""))
      ]);
      setCalData(d);
      setOpenShifts(pk.filter(s => s.status === "open" || s.status === "claimed" || s.status === "requested"));
    } catch (e) { showToast(e.message, "error"); }
    setLoading(false);
  };

  useEffect(() => {
    af("/api/users?role=supervisor").then(setSchedSupervisors).catch(e => console.warn("Load supervisors:", e.message));
  }, []);
  useEffect(() => { loadCalendar(); const iv = setInterval(() => loadCalendar(), 45000); return () => clearInterval(iv); }, [dateRange, filterSite]);

  const getWeekDays = () => { const days = []; const start = new Date(dateRange.start + "T00:00:00"); for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); days.push(toISO(d)); } return days; };
  const getMonthDays = () => { const start = new Date(dateRange.start + "T00:00:00"); const year = start.getFullYear(); const month = start.getMonth(); const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0); const startOff = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; const days = []; for (let i = -startOff; i <= lastDay.getDate() + (6 - (lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1)); i++) { const d = new Date(year, month, i + 1); days.push(toISO(d)); } return days; };

  const getShiftsForDay = (dateStr) => (calData.scheduled_shifts || []).filter(s => s.scheduled_date?.slice(0, 10) === dateStr && s.status !== "cancelled");
  const getStartedForDay = (dateStr) => (startedByDay[dateStr] || []).filter(p => !filterSite || String(p.siteId) === String(filterSite));
  const getInspForDay = (dateStr) => (calData.inspections || []).filter(s => s.scheduled_date?.slice(0, 10) === dateStr);
  const getPickupsForDay = (dateStr) => openShifts.filter(s => s.scheduled_date?.slice(0, 10) === dateStr);

  // One matcher for both staff searches, the toolbar box and the picker in the Schedule Shift modal.
  // Both sides are lowercased. It reads first name, last name, the two joined, and the employee id.
  const staffSearchMatch = (s, q) => {
    const needle = (q || "").trim().toLowerCase();
    if (!needle) return true;
    const first = s.firstName || s.first_name || "";
    const last = s.lastName || s.last_name || "";
    return [first, last, (first + " " + last).trim(), s.name, s.employeeId || s.employee_id].some(f => String(f || "").toLowerCase().includes(needle));
  };

  const staffForSite = (() => {
    let list = filterSite ? staffList.filter(s => s.role === "admin" || (Array.isArray(s.sites) && s.sites.some(x => x && String(x.siteId) === String(filterSite)))) : staffList.filter(s => s.role !== "admin");
    if (searchStaff) list = list.filter(s => staffSearchMatch(s, searchStaff));
    return list;
  })();

  // The week grid draws a row for anybody with something on it over the visible week: the roster
  // above, plus anyone with a scheduled shift or a started session who is not on it, such as an
  // admin under All Sites or a person no longer in the active list. Both extra groups come from data
  // already in hand, calData.scheduled_shifts and startedByDay. No second request is made.
  const weekDays = getWeekDays();
  const weekRows = (() => {
    const rows = staffForSite.map(s => ({ ...s, onRoster: true }));
    const seen = new Set(rows.map(s => String(s.id)));
    const add = (id, name, role) => { if (id === null || id === undefined || seen.has(String(id))) return; seen.add(String(id)); rows.push({ id, name, role, onRoster: false }); };
    weekDays.forEach(d => {
      getShiftsForDay(d).forEach(s => add(s.user_id, s.user_name || s.staff_name || [s.first_name, s.last_name].filter(Boolean).join(" ") || "Staff " + s.user_id, s.role || s.user_role));
      getStartedForDay(d).forEach(p => add(p.userId, p.name || "Staff " + p.userId, p.role));
    });
    return rows.filter(s => s.onRoster || staffSearchMatch(s, searchStaff));
  })();

  const schedTotalPages = Math.max(1, Math.ceil(weekRows.length / schedRows));
  const schedCur = Math.min(schedPage, schedTotalPages);
  const pagedStaff = weekRows.slice((schedCur - 1) * schedRows, schedCur * schedRows);

  // The toolbar's Schedule Shift button opens on today when today is in the visible range, and on
  // the first day of the range otherwise. A day cell passes its own date and is unaffected.
  const createDateForRange = () => { const today = toISO(new Date()); return today >= dateRange.start && today <= dateRange.end ? today : dateRange.start; };

  const openCreate = (date, userId) => {
    const dayOfWeek = new Date(date + "T00:00:00").getDay();
    const sId = filterSite || "";
    setCreateForm({ userId: userId || "", siteId: sId, startTime: "08:00", endTime: "16:00", notes: "", buildingName: "", floorNumber: "", serviceCategory: "", repeat: false, repeatDays: [dayOfWeek], repeatMode: "weeks", repeatWeeks: 4, repeatUntil: "" });
    if (sId) loadSiteLocations(sId);
    setPickerSearch("");
    setPatternError(""); setPatternConflictId(""); setPatternSkipped(null);
    setCreateModal({ date, userId });
  };
  const toggleRepeatDay = (dayNum) => { setCreateForm(prev => { const days = prev.repeatDays.includes(dayNum) ? prev.repeatDays.filter(d => d !== dayNum) : [...prev.repeatDays, dayNum]; return { ...prev, repeatDays: days }; }); };

  const submitCreate = async () => {
    if (!createForm.userId || !createForm.siteId || !createForm.startTime || !createForm.endTime) { showToast("Staff, site, start time, and end time are required", "error"); return; }
    setPatternError(""); setPatternConflictId(""); setPatternSkipped(null);
    try {
      // A repeat with no end, or one that runs until a date, is a pattern the API keeps and refills.
      // "For X weeks" still writes each shift once through /bulk, exactly as before.
      if (createForm.repeat && createForm.repeatDays.length > 0 && createForm.repeatMode !== "weeks") {
        const body = {
          userId: createForm.userId, siteId: createForm.siteId,
          days: createForm.repeatDays.slice().sort((a, b) => a - b).map(d => PATTERN_DAY_KEYS[d]),
          startTime: createForm.startTime, endTime: createForm.endTime, startsOn: createModal.date,
        };
        if (createForm.repeatMode === "until" && createForm.repeatUntil) body.endsOn = createForm.repeatUntil;
        if (createForm.buildingName) body.buildingName = createForm.buildingName;
        if (createForm.floorNumber) body.floorNumber = createForm.floorNumber;
        if (createForm.serviceCategory) body.serviceCategory = createForm.serviceCategory;
        if (createForm.notes) body.notes = createForm.notes;
        try {
          const r = await af("/api/schedule/patterns", { method: "POST", body });
          showToast("Pattern saved. " + (Number(r && r.created) || 0) + " shifts added through " + patternDate(r && r.pattern && r.pattern.generatedThrough) + ".");
          loadCalendar(); setPatternsRefresh(n => n + 1);
          if (Number(r && r.skippedCount) > 0) { setPatternSkipped(Array.isArray(r.skipped) ? r.skipped : []); return; }
          setCreateModal(null);
        } catch (e) {
          setPatternError(e.message || "Request failed");
          setPatternConflictId(e && e.body && e.body.patternId ? String(e.body.patternId) : "");
        }
        return;
      }
      if (createForm.repeat && createForm.repeatDays.length > 0) {
        const body = { user_id: createForm.userId, site_id: createForm.siteId, start_time: createForm.startTime, end_time: createForm.endTime, notes: createForm.notes || undefined, building_name: createForm.buildingName || undefined, floor_number: createForm.floorNumber || undefined, service_category: createForm.serviceCategory || undefined, repeat_days: createForm.repeatDays, start_date: createModal.date };
        if (createForm.repeatMode === "until" && createForm.repeatUntil) body.repeat_until = createForm.repeatUntil; else body.repeat_weeks = parseInt(createForm.repeatWeeks) || 4;
        const d = await af("/api/schedule/bulk", { method: "POST", body }); showToast(d.message);
      } else {
        await af("/api/schedule", { method: "POST", body: { user_id: createForm.userId, site_id: createForm.siteId, scheduled_date: createModal.date, start_time: createForm.startTime, end_time: createForm.endTime, notes: createForm.notes || undefined, building_name: createForm.buildingName || undefined, floor_number: createForm.floorNumber || undefined, service_category: createForm.serviceCategory || undefined }});
        showToast("Shift scheduled");
      }
      setCreateModal(null); loadCalendar();
    } catch (e) { showToast(e.message, "error"); }
  };

  const openEdit = (shift) => {
    if (shift.site_id) loadSiteLocations(shift.site_id);
    setEditModal({ ...shift, startTime: shift.start_time?.slice(0, 5), endTime: shift.end_time?.slice(0, 5), buildingName: shift.building_name || "", floorNumber: shift.floor_number || "", serviceCategory: shift.service_category || "" });
  };
  const submitEdit = async () => {
    try {
      await af("/api/schedule/" + editModal.id, { method: "PATCH", body: { user_id: editModal.user_id, site_id: editModal.site_id, start_time: editModal.startTime, end_time: editModal.endTime, notes: editModal.notes, status: editModal.status, building_name: editModal.buildingName, floor_number: editModal.floorNumber, service_category: editModal.serviceCategory }});
      showToast("Schedule updated"); setEditModal(null); loadCalendar();
    } catch (e) { showToast(e.message, "error"); }
  };
  // A shift a pattern wrote is cancelled for that date only; the pattern does not add it again.
  const editPatternId = editModal ? (editModal.shiftPatternId || editModal.shift_pattern_id || null) : null;
  const deleteShift = async (id) => { const fromPattern = !!editPatternId; if (!window.confirm(fromPattern ? "Cancel this shift? The pattern will not add it again." : "Delete this scheduled shift? This cannot be undone.")) return; try { await af("/api/schedule/" + id, { method: "DELETE" }); showToast(fromPattern ? "Shift cancelled" : "Shift removed"); setEditModal(null); loadCalendar(); } catch (e) { showToast(e.message, "error"); } };
  const [convertPickup, setConvertPickup] = useState(null);
  const submitConvertPickup = async () => {
    try {
      await af("/api/pickups/convert/" + convertPickup.id, { method: "POST", body: { origin: convertPickup.origin, notes: convertPickup.notes } });
      showToast("Shift converted to open pickup");
      setConvertPickup(null); setEditModal(null); loadCalendar();
    } catch (e) { showToast(e.message, "error"); }
  };

  const openInspModal = (insp) => {
    setInspForm({ assigned_to: insp.assigned_to || "", scheduled_date: insp.scheduled_date ? insp.scheduled_date.slice(0, 10) : "" });
    setInspModal(insp);
  };
  const submitInspReschedule = async () => {
    if (!inspForm.scheduled_date) { showToast("Date is required", "error"); return; }
    try {
      await af("/api/inspections/scheduled/" + inspModal.id, { method: "PATCH", body: { assigned_to: inspForm.assigned_to || null, scheduled_date: inspForm.scheduled_date } });
      showToast("Inspection rescheduled"); setInspModal(null); loadCalendar();
    } catch (e) { showToast(e.message, "error"); }
  };
  const cancelInspFromSchedule = async (id) => {
    if (!window.confirm("Cancel this inspection?")) return;
    try {
      await af("/api/inspections/scheduled/" + id, { method: "PATCH", body: { status: "cancelled" } });
      showToast("Inspection cancelled"); setInspModal(null); loadCalendar();
    } catch (e) { showToast(e.message, "error"); }
  };

  const fmtShortDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fmtDayLabel = (d) => { const dt = new Date(d + "T00:00:00"); return DAY_NAMES[dt.getDay() === 0 ? 6 : dt.getDay() - 1]; };
  const isToday = (d) => d === toISO(new Date());
  const statusColors = { scheduled: GO, completed: GR, cancelled: "#7A8A9A", no_show: RD };
  const startedLbl = { fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 };

  const renderWeekView = () => (<div style={{ overflowX: "auto", display: "flex", flexDirection: "column", flex: 1 }}>
    <div style={{ display: "grid", gridTemplateColumns: "140px repeat(7, 1fr)", gap: 1, marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid " + t.border }}>
      <div style={{ padding: "8px 10px", fontSize: 10, fontWeight: 600, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px" }}>Staff</div>
      {weekDays.map(d => (<div key={d} style={{ padding: "8px 6px", textAlign: "center", background: isToday(d) ? t.goldBg : "transparent", borderRadius: 6 }}><div style={{ fontSize: 10, fontWeight: 600, color: isToday(d) ? t.goldText : t.textMut }}>{fmtDayLabel(d)}</div><div style={{ fontSize: 12, fontWeight: 600, color: isToday(d) ? t.goldText : t.text }}>{new Date(d + "T00:00:00").getDate()}</div></div>))}
    </div>
    <div style={{ display: "flex", flexDirection: "column" }}>
    {pagedStaff.map(staff => (<div key={staff.id} style={{ display: "grid", gridTemplateColumns: "140px repeat(7, 1fr)", gap: 1, marginBottom: 6, paddingBottom: 6, alignItems: "stretch", borderBottom: "1px solid " + t.border }}>
      <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 9, background: t.cardAlt, borderRadius: 6 }}><Ini name={staff.name || (staff.firstName + " " + staff.lastName)} sz={30} /><div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{staff.name || (staff.firstName + " " + staff.lastName)}</div>{staff.role && <div style={{ fontSize: 9, color: t.textMut, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{staff.role}</div>}</div></div>
      {weekDays.map(d => {
        const sched = getShiftsForDay(d).filter(s => s.user_id === staff.id);
        const startedHere = getStartedForDay(d).filter(p => String(p.userId) === String(staff.id));
        const dayPickups = getPickupsForDay(d);
        const openHere = dayPickups.filter(p => p.status === "open" && String(p.original_user_id) === String(staff.id));
        const claimedByMe = dayPickups.filter(p => p.status === "claimed" && String(p.claimed_by) === String(staff.id));
        const dropReqs = dayPickups.filter(p => p.status === "requested" && String(p.original_user_id) === String(staff.id));
        const hasAny = sched.length > 0 || startedHere.length > 0 || openHere.length > 0 || claimedByMe.length > 0 || dropReqs.length > 0;
        return (<div key={d} onClick={() => !hasAny && openCreate(d, staff.onRoster ? staff.id : "")} style={{ padding: 5, minHeight: 52, background: isToday(d) ? t.goldBg : t.hover, borderRadius: 4, cursor: hasAny ? "default" : "pointer", border: "1px solid " + (isToday(d) ? t.goldBorder : "transparent"), display: "flex", flexDirection: "column" }}>
          {sched.map(s => (<div key={s.id} onClick={e => { e.stopPropagation(); openEdit(s); }} style={{ padding: "3px 5px", marginBottom: 2, borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", background: (statusColors[s.status] || GO) + "18", color: goldToText(t, statusColors[s.status] || GO), border: "1px solid " + (statusColors[s.status] || GO) + "30" }}>
            {s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}
            {s.building_name && <span style={{ marginLeft: 3, opacity: 0.8 }}>{s.building_name}{s.floor_number ? " F" + s.floor_number : ""}</span>}
            {s.site_name && <div style={{ fontSize: 9, opacity: 0.8 }}>{s.site_name}</div>}
            {s.service_category && <div style={{ fontSize: 8, opacity: 0.7, fontStyle: "italic" }}>{s.service_category}</div>}
            {(s.shiftPatternId || s.shift_pattern_id) && <div style={{ fontSize: 8, opacity: 0.75, fontWeight: 500 }}>Repeats</div>}
          </div>))}
          {startedHere.map(p => (<div key={p.sessionId} onClick={e => { e.stopPropagation(); setStartedDetail(p); }} style={{ padding: "3px 5px", marginBottom: 2, borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", background: GR + "18", color: GR, border: "1px solid " + GR + "30" }}>
            Started {fmtSessionStart(p.startedAt)}
            {p.buildingName && <span style={{ marginLeft: 3, opacity: 0.8 }}>{p.buildingName}{p.floorNumber ? " F" + p.floorNumber : ""}</span>}
            {p.siteName && <div style={{ fontSize: 9, opacity: 0.8 }}>{p.siteName}</div>}
            {p.tasksTotal > 0 && <div style={{ fontSize: 8, opacity: 0.7 }}>{p.tasksCompleted} of {p.tasksTotal} tasks</div>}
          </div>))}
          {openHere.map(p => (<div key={p.id} onClick={e => { e.stopPropagation(); setPickupDetail(p); }} style={{ padding: "3px 5px", marginBottom: 2, borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", background: t.cardAlt, color: t.textMut, border: "1px dashed " + t.textMut + "50", opacity: 0.7 }}>
            {String(p.start_time).slice(0, 5)}-{String(p.end_time).slice(0, 5)}
            <span style={{ marginLeft: 3, fontSize: 7, textTransform: "uppercase", padding: "1px 4px", borderRadius: 3, background: t.hover }}>OPEN</span>
            {p.site_name && <div style={{ fontSize: 9, opacity: 0.8 }}>{p.site_name}</div>}
          </div>))}
          {dropReqs.map(p => (<div key={p.id} onClick={e => { e.stopPropagation(); setPickupDetail({ ...p, isDropRequest: true }); }} style={{ padding: "3px 5px", marginBottom: 2, borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", background: "#F1C40F22", color: "#F1C40F", border: "1px dashed #F1C40F60" }}>
            {String(p.start_time).slice(0, 5)}-{String(p.end_time).slice(0, 5)}
            <span style={{ marginLeft: 3, fontSize: 7, textTransform: "uppercase", padding: "1px 4px", borderRadius: 3, background: "#F1C40F30" }}>DROP REQ</span>
            {p.site_name && <div style={{ fontSize: 9, opacity: 0.8 }}>{p.site_name}</div>}
          </div>))}
          {claimedByMe.map(p => (<div key={p.id} onClick={e => { e.stopPropagation(); setPickupDetail(p); }} style={{ padding: "3px 5px", marginBottom: 2, borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", background: OR + "18", color: OR, border: "1px solid " + OR + "30" }}>
            {String(p.start_time).slice(0, 5)}-{String(p.end_time).slice(0, 5)}
            <span style={{ marginLeft: 3, fontSize: 7, textTransform: "uppercase", padding: "1px 4px", borderRadius: 3, background: OR + "25" }}>CLAIMED</span>
            {p.site_name && <div style={{ fontSize: 9, opacity: 0.8 }}>{p.site_name}</div>}
            {p.claimed_by_name && p.claimed_by_name.trim() && <div style={{ fontSize: 8, opacity: 0.7 }}>{p.claimed_by_name}</div>}
          </div>))}
          {!hasAny && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: t.textMut, opacity: 0.3 }}>+</div>}
        </div>);
      })}
    </div>))}
    </div>
    {(calData.inspections || []).length > 0 && (<div style={{ display: "grid", gridTemplateColumns: "140px repeat(7, 1fr)", gap: 1, marginTop: 8, borderTop: "1px solid " + t.border, paddingTop: 8 }}>
      <div style={{ padding: "8px 10px", fontSize: 10, fontWeight: 600, color: BL, textTransform: "uppercase" }}>Inspections</div>
      {weekDays.map(d => { const insp = getInspForDay(d); return (<div key={d} style={{ padding: 4 }}>{insp.map(i => (<div key={i.id} onClick={() => openInspModal(i)} style={{ padding: "3px 5px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: BL + "18", color: BL, marginBottom: 2, cursor: "pointer", border: "1px solid " + BL + "30" }}>{i.template_name}{i.site_name && <div style={{ fontSize: 9, opacity: 0.8 }}>{i.site_name}</div>}{i.assigned_name && <div style={{ fontSize: 8, opacity: 0.7 }}>{i.assigned_name}</div>}</div>))}</div>); })}
    </div>)}
    {weekRows.length > 0 && <Pagination t={t} page={schedCur} perPage={schedRows} total={weekRows.length} onPage={setSchedPage} />}
  </div>);

  const renderMonthView = () => { const monthDays = getMonthDays(); const startMonth = new Date(dateRange.start + "T00:00:00").getMonth(); const startYear = new Date(dateRange.start + "T00:00:00").getFullYear(); const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]; return (<div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <button onClick={() => { const d = new Date(dateRange.start + "T00:00:00"); d.setMonth(d.getMonth() - 1); const first = new Date(d.getFullYear(), d.getMonth(), 1); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0); setDateRange({ start: toISO(first), end: toISO(last) }); }} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", background: "transparent", color: t.textMut, border: "1px solid " + t.border }}>&lt; Prev</button>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>{MONTH_NAMES[startMonth]} {startYear}</div>
      <button onClick={() => { const d = new Date(dateRange.start + "T00:00:00"); d.setMonth(d.getMonth() + 1); const first = new Date(d.getFullYear(), d.getMonth(), 1); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0); setDateRange({ start: toISO(first), end: toISO(last) }); }} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", background: "transparent", color: t.textMut, border: "1px solid " + t.border }}>Next &gt;</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 4 }}>{DAY_NAMES.map(d => <div key={d} style={{ padding: "6px 4px", textAlign: "center", fontSize: 10, fontWeight: 600, color: t.textMut, textTransform: "uppercase" }}>{d}</div>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, flex: 1, gridAutoRows: "1fr" }}>
      {monthDays.map(d => { const dt = new Date(d + "T00:00:00"); const inMonth = dt.getMonth() === startMonth; const sched = getShiftsForDay(d); const startedHere = getStartedForDay(d); const insp = getInspForDay(d); const pks = getPickupsForDay(d);
        return (<div key={d} onClick={() => { setView("week"); const m = getMonday(dt); setDateRange({ start: toISO(m), end: toISO(new Date(m.getTime() + 6 * 86400000)) }); }} style={{ padding: 6, minHeight: 80, background: isToday(d) ? t.goldBg : inMonth ? t.card : t.hover, borderRadius: 4, cursor: "pointer", border: "1px solid " + (isToday(d) ? t.goldBorder : t.border), opacity: inMonth ? 1 : 0.4 }}>
          <div style={{ fontSize: 11, fontWeight: isToday(d) ? 700 : 500, color: isToday(d) ? t.goldText : t.text, marginBottom: 4 }}>{dt.getDate()}</div>
          {sched.length > 0 && <div style={{ fontSize: 8, fontWeight: 600, color: t.goldText, marginBottom: 1 }}>{sched.length} scheduled</div>}
          {startedHere.length > 0 && <div style={{ fontSize: 8, fontWeight: 600, color: GR, marginBottom: 1 }}>{startedHere.length} started</div>}
          {pks.filter(p => p.status === "open").length > 0 && <div style={{ fontSize: 8, fontWeight: 600, color: t.textMut, marginBottom: 1 }}>{pks.filter(p => p.status === "open").length} open</div>}
          {pks.filter(p => p.status === "claimed").length > 0 && <div style={{ fontSize: 8, fontWeight: 600, color: OR, marginBottom: 1 }}>{pks.filter(p => p.status === "claimed").length} claimed</div>}
          {insp.length > 0 && <div style={{ fontSize: 8, fontWeight: 600, color: BL }}>{insp.length} inspection{insp.length > 1 ? "s" : ""}</div>}
        </div>); })}
    </div></div>); };

  const switchToMonth = () => { const n = new Date(dateRange.start + "T00:00:00"); const first = new Date(n.getFullYear(), n.getMonth(), 1); const last = new Date(n.getFullYear(), n.getMonth() + 1, 0); setDateRange({ start: toISO(first), end: toISO(last) }); setView("month"); };

  return (<div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <SecT t={t} action="Refresh" onAction={() => loadCalendar()}>Schedule</SecT>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => setView("week")} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: view === "week" ? 700 : 500, background: view === "week" ? t.goldBg : "transparent", color: view === "week" ? t.goldText : t.textMut, border: view === "week" ? "1px solid " + t.goldBorder : "1px solid transparent", cursor: "pointer" }}>Week</button>
        <button onClick={switchToMonth} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: view === "month" ? 700 : 500, background: view === "month" ? t.goldBg : "transparent", color: view === "month" ? t.goldText : t.textMut, border: view === "month" ? "1px solid " + t.goldBorder : "1px solid transparent", cursor: "pointer" }}>Month</button>
        <button onClick={() => setView("patterns")} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: view === "patterns" ? 700 : 500, background: view === "patterns" ? t.goldBg : "transparent", color: view === "patterns" ? t.goldText : t.textMut, border: view === "patterns" ? "1px solid " + t.goldBorder : "1px solid " + t.border, cursor: "pointer", fontFamily: FONT_BODY }}>Patterns</button>
        {timeOffWaiting !== null && <button onClick={() => setView("timeoff")} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: view === "timeoff" ? 700 : 500, background: view === "timeoff" ? t.goldBg : "transparent", color: view === "timeoff" ? t.goldText : t.textMut, border: view === "timeoff" ? "1px solid " + t.goldBorder : "1px solid " + t.border, cursor: "pointer", fontFamily: FONT_BODY }}>{timeOffWaiting > 0 ? "Time off (" + timeOffWaiting + ")" : "Time off"}</button>}
        <Btn t={t} onClick={() => openCreate(createDateForRange(), "")} style={{ padding: "5px 14px", fontSize: 11 }}><PlI sz={12} c={NAVY} /> Schedule Shift</Btn>
      </div>
    </div>
    {view === "patterns" && <PatternsView af={af} t={t} sites={sites} allStaff={allStaff} refreshKey={patternsRefresh} openId={patternOpenId} onOpen={id => setPatternOpenId(id)} onClose={() => { setPatternOpenId(null); loadCalendar(); }} />}
    {view === "timeoff" && <TimeOffView af={af} t={t} allStaff={allStaff} myId={myId} showToast={showToast} onCountChange={loadTimeOffCount} />}
    {view !== "patterns" && view !== "timeoff" && <>
    {view === "week" && <DateRangePicker value={dateRange} onChange={setDateRange} t={t} presets={[{ key: "thisWeek", label: "This Week" }, { key: "lastWeek", label: "Last Week" }, { key: "nextWeek", label: "Next Week" }]} />}
    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
      <Sel t={t} value={filterSite} onChange={e => { const sid = e.target.value; setFilterSite(sid); setSchedPage(1); if (sid) loadSiteLocations(sid); }} options={[{ v: "", l: "All Sites" }, ...sites.map(s => ({ v: s.id, l: s.name }))]} style={{ width: 200, fontSize: 12 }} />
      <Inp t={t} value={searchStaff} onChange={e => { setSearchStaff(e.target.value); setSchedPage(1); }} placeholder="Search staff..." style={{ width: 160, fontSize: 12 }} />
      {view === "week" && <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}><span style={{ fontSize: 11, color: t.textMut }}>Show</span><select value={schedRows} onChange={e => { setSchedRows(Number(e.target.value)); setSchedPage(1); }} style={{ padding: "7px 10px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 12, cursor: "pointer" }}>{[10, 20, 30, 40, 50].map(nn => <option key={nn} value={nn}>{nn} staff</option>)}</select></div>}
    </div>
    {loading && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Loading schedule...</div>}
    {!loading && <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
      {[{ c: GO, l: "Scheduled" }, { c: GR, l: "Started" }, { c: t.textMut, l: "Open" }, { c: "#F1C40F", l: "Drop Req" }, { c: OR, l: "Claimed" }, { c: BL, l: "Inspection" }].map(lg => (
        <div key={lg.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: lg.c + "30", border: "1px solid " + lg.c }} />
          <span style={{ fontSize: 9, color: t.textMut, fontWeight: 600 }}>{lg.l}</span>
        </div>
      ))}
    </div>}
    {!loading && view === "week" && <Crd t={t} style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column" }}>{renderWeekView()}</Crd>}
    {!loading && view === "month" && <Crd t={t} style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column" }}>{renderMonthView()}</Crd>}

    </>}

    {/* CREATE SHIFT MODAL */}
    {createModal && <Mdl t={t} onClose={() => setCreateModal(null)}><div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Schedule Shift</div><button onClick={() => setCreateModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      <div style={{ padding: "8px 12px", borderRadius: 6, background: t.goldSubtle, border: "1px solid " + t.goldSubtleBorder, fontSize: 11, color: t.goldText, marginBottom: 14 }}>Scheduling for {fmtShortDate(createModal.date)}</div>
      <div style={{ marginBottom: 12 }}><Lbl>Staff Member *</Lbl>
        <Inp t={t} value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Search staff" style={{ marginBottom: 6, fontSize: 12 }} />
        {(() => {
          const matches = staffForSite.filter(s => staffSearchMatch(s, pickerSearch));
          const picked = createForm.userId ? staffForSite.find(s => String(s.id) === String(createForm.userId)) : null;
          const opts = picked && !matches.includes(picked) ? [picked, ...matches] : matches;
          const noMatch = pickerSearch.trim().length > 0 && matches.length === 0;
          return (<>
            {(!noMatch || opts.length > 0) && <Sel t={t} value={createForm.userId} onChange={e => setCreateForm({ ...createForm, userId: e.target.value })} options={[{ v: "", l: "Select staff..." }, ...opts.map(s => ({ v: s.id, l: s.name || (s.firstName + " " + s.lastName) }))]} />}
            {noMatch && <div style={{ fontSize: 12, color: t.textMut, padding: "8px 2px" }}>No staff match that search</div>}
          </>);
        })()}
      </div>
      <div style={{ marginBottom: 12 }}><Lbl>Site *</Lbl><Sel t={t} value={createForm.siteId} onChange={e => { const sid = e.target.value; setCreateForm({ ...createForm, siteId: sid, buildingName: "", floorNumber: "" }); if (sid) loadSiteLocations(sid); }} options={[{ v: "", l: "Select site..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Start Time *</Lbl><Inp t={t} type="time" value={createForm.startTime} onChange={e => setCreateForm({ ...createForm, startTime: e.target.value })} /></div>
        <div><Lbl>End Time *</Lbl><Inp t={t} type="time" value={createForm.endTime} onChange={e => setCreateForm({ ...createForm, endTime: e.target.value })} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Building</Lbl><Sel t={t} value={createForm.buildingName} onChange={e => setCreateForm({ ...createForm, buildingName: e.target.value, floorNumber: "" })} options={getBuildingOpts(createForm.siteId)} /></div>
        <div><Lbl>Floor</Lbl><Sel t={t} value={createForm.floorNumber} onChange={e => setCreateForm({ ...createForm, floorNumber: e.target.value })} options={getFloorOpts(createForm.siteId, createForm.buildingName)} /></div>
      </div>
      <div style={{ marginBottom: 12 }}><Lbl>Service Category</Lbl><Sel t={t} value={createForm.serviceCategory} onChange={e => setCreateForm({ ...createForm, serviceCategory: e.target.value })} options={SERVICE_CATS} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Notes</Lbl><Inp t={t} value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Optional notes" /></div>
      <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: t.hover, border: "1px solid " + t.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: createForm.repeat ? 12 : 0 }}>
          <button onClick={() => setCreateForm({ ...createForm, repeat: !createForm.repeat, repeatMode: !createForm.repeat ? "none" : createForm.repeatMode })} style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (createForm.repeat ? GO : t.textMut), background: createForm.repeat ? GO : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>{createForm.repeat && <ChkI sz={10} c={NAVY} />}</button>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Repeat this shift</span>
        </div>
        {createForm.repeat && (<div>
          <div style={{ marginBottom: 10 }}><Lbl>Repeat on</Lbl><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[{ label: "Sun", val: 0 }, { label: "Mon", val: 1 }, { label: "Tue", val: 2 }, { label: "Wed", val: 3 }, { label: "Thu", val: 4 }, { label: "Fri", val: 5 }, { label: "Sat", val: 6 }].map(d => (
              <button key={d.val} onClick={() => toggleRepeatDay(d.val)} style={{ width: 36, height: 30, borderRadius: 6, fontSize: 10, fontWeight: createForm.repeatDays.includes(d.val) ? 700 : 500, cursor: "pointer", background: createForm.repeatDays.includes(d.val) ? GO : "transparent", color: createForm.repeatDays.includes(d.val) ? NAVY : t.textMut, border: "1px solid " + (createForm.repeatDays.includes(d.val) ? GO : t.border) }}>{d.label}</button>
            ))}</div>
            {runsPastMidnight(createForm.startTime, createForm.endTime) && <div style={{ fontSize: 11, color: t.textMut, marginTop: 6 }}>{OVERNIGHT_NOTE}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <button onClick={() => setCreateForm({ ...createForm, repeatMode: "weeks" })} style={{ padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: createForm.repeatMode === "weeks" ? 700 : 500, background: createForm.repeatMode === "weeks" ? t.goldBg : "transparent", color: createForm.repeatMode === "weeks" ? t.goldText : t.textMut, border: "1px solid " + (createForm.repeatMode === "weeks" ? t.goldBorder : "transparent"), cursor: "pointer" }}>For</button>
            {createForm.repeatMode === "weeks" && (<><Inp t={t} type="number" min="1" max="52" value={createForm.repeatWeeks} onChange={e => setCreateForm({ ...createForm, repeatWeeks: e.target.value })} style={{ width: 60, textAlign: "center" }} /><span style={{ fontSize: 11, color: t.textSec }}>weeks</span></>)}
            <button onClick={() => setCreateForm({ ...createForm, repeatMode: "until" })} style={{ padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: createForm.repeatMode === "until" ? 700 : 500, background: createForm.repeatMode === "until" ? t.goldBg : "transparent", color: createForm.repeatMode === "until" ? t.goldText : t.textMut, border: "1px solid " + (createForm.repeatMode === "until" ? t.goldBorder : "transparent"), cursor: "pointer" }}>Until</button>
            {createForm.repeatMode === "until" && <Inp t={t} type="date" value={createForm.repeatUntil} onChange={e => setCreateForm({ ...createForm, repeatUntil: e.target.value })} style={{ width: 150 }} />}
            <button onClick={() => setCreateForm({ ...createForm, repeatMode: "none" })} style={{ padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: createForm.repeatMode === "none" ? 700 : 500, background: createForm.repeatMode === "none" ? t.goldBg : "transparent", color: createForm.repeatMode === "none" ? t.goldText : t.textMut, border: "1px solid " + (createForm.repeatMode === "none" ? t.goldBorder : t.border), cursor: "pointer", fontFamily: FONT_BODY }}>No end date</button>
          </div>
          {createForm.repeatMode === "none" && <div style={{ fontSize: 11, color: t.textMut, marginTop: 6 }}>The schedule fills 8 weeks ahead and keeps extending until the pattern is ended.</div>}
          {patternError && <div style={{ fontSize: 12, color: RD, marginTop: 10 }}>{patternError}{patternConflictId ? " " : ""}{patternConflictId && <button onClick={() => { setCreateModal(null); setView("patterns"); setPatternOpenId(patternConflictId); }} style={{ background: "none", border: "none", color: t.goldText, fontWeight: 600, fontSize: 12, fontFamily: FONT_BODY, cursor: "pointer", padding: "4px 6px" }}>Open that pattern</button>}</div>}
          {patternSkipped && <div style={{ fontSize: 12, color: t.text, marginTop: 10 }}>
            <div style={{ color: OR, fontWeight: 600, marginBottom: 4 }}>{patternSkipped.length} dates were skipped because this person is already scheduled at that time:</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{patternSkipped.map((sk, i) => <li key={i}>{patternDate(sk.date)}</li>)}</ul>
            <div style={{ marginTop: 8 }}><Btn t={t} onClick={() => { setPatternSkipped(null); setCreateModal(null); }} style={{ minHeight: 44 }}>Done</Btn></div>
          </div>}
        </div>)}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setCreateModal(null)}>Cancel</Btn><Btn t={t} onClick={submitCreate}>{createForm.repeat ? "Schedule All" : "Schedule Shift"}</Btn></div>
    </div></Mdl>}

    {/* EDIT SCHEDULED SHIFT MODAL */}
    {editModal && <Mdl t={t} onClose={() => setEditModal(null)}><div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Edit Scheduled Shift</div><button onClick={() => setEditModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      {editPatternId && <div style={{ marginBottom: 12, fontSize: 12, color: t.textSec }}>Part of a weekly pattern. Changes here apply to this date only. <button onClick={() => { setEditModal(null); setView("patterns"); setPatternOpenId(editPatternId); }} style={{ background: "none", border: "none", color: t.goldText, fontWeight: 600, fontSize: 12, fontFamily: FONT_BODY, cursor: "pointer", padding: "4px 6px" }}>Open the pattern</button></div>}
      <div style={{ marginBottom: 12 }}><Lbl>Staff</Lbl><Sel t={t} value={editModal.user_id} onChange={e => setEditModal({ ...editModal, user_id: e.target.value })} options={[{ v: "", l: "Select staff..." }, ...staffList.filter(s => s.role !== "admin").map(s => ({ v: s.id, l: s.name || (s.firstName + " " + s.lastName) }))]} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Site</Lbl><Sel t={t} value={editModal.site_id} onChange={e => { const sid = e.target.value; setEditModal({ ...editModal, site_id: sid, buildingName: "", floorNumber: "" }); if (sid) loadSiteLocations(sid); }} options={[{ v: "", l: "Select site..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Start Time</Lbl><Inp t={t} type="time" value={editModal.startTime} onChange={e => setEditModal({ ...editModal, startTime: e.target.value })} /></div>
        <div><Lbl>End Time</Lbl><Inp t={t} type="time" value={editModal.endTime} onChange={e => setEditModal({ ...editModal, endTime: e.target.value })} /></div>
      </div>
      <div style={{ marginBottom: 12 }}><Lbl>Status</Lbl><Sel t={t} value={editModal.status} onChange={e => setEditModal({ ...editModal, status: e.target.value })} options={[{ v: "scheduled", l: "Scheduled" }, { v: "completed", l: "Completed" }, { v: "cancelled", l: "Cancelled" }, { v: "no_show", l: "No Show" }]} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Building</Lbl><Sel t={t} value={editModal.buildingName} onChange={e => setEditModal({ ...editModal, buildingName: e.target.value, floorNumber: "" })} options={getBuildingOpts(editModal.site_id)} /></div>
        <div><Lbl>Floor</Lbl><Sel t={t} value={editModal.floorNumber} onChange={e => setEditModal({ ...editModal, floorNumber: e.target.value })} options={getFloorOpts(editModal.site_id, editModal.buildingName)} /></div>
      </div>
      <div style={{ marginBottom: 12 }}><Lbl>Service Category</Lbl><Sel t={t} value={editModal.serviceCategory} onChange={e => setEditModal({ ...editModal, serviceCategory: e.target.value })} options={SERVICE_CATS} /></div>
      <div style={{ marginBottom: 16 }}><Lbl>Notes</Lbl><Inp t={t} value={editModal.notes || ""} onChange={e => setEditModal({ ...editModal, notes: e.target.value })} placeholder="Notes" /></div>

      {convertPickup && convertPickup.id === editModal.id && (
        <div style={{ padding: 12, borderRadius: 8, background: t.orangeSubtle, border: "1px solid " + t.orangeBorder, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: OR, marginBottom: 8 }}>Convert to Open Pickup</div>
          <div style={{ fontSize: 10, color: t.textMut, marginBottom: 10 }}>The scheduled shift will be cancelled and posted as an open shift for eligible staff to claim.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div><Lbl>Reason</Lbl><Sel t={t} value={convertPickup.origin} onChange={e => setConvertPickup({ ...convertPickup, origin: e.target.value })} options={getOpts("shift_origins")} /></div>
            <div><Lbl>Notes</Lbl><Inp t={t} value={convertPickup.notes} onChange={e => setConvertPickup({ ...convertPickup, notes: e.target.value })} placeholder="e.g. Marcus called out" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn t={t} v="ghost" onClick={() => setConvertPickup(null)} style={{ fontSize: 11, padding: "6px 12px" }}>Cancel</Btn>
            <Btn t={t} v="danger" onClick={submitConvertPickup} style={{ fontSize: 11, padding: "6px 12px" }}>Confirm Convert</Btn>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn t={t} v="danger" onClick={() => deleteShift(editModal.id)} style={{ fontSize: 11, padding: "8px 14px" }}>{editPatternId ? "Cancel this date" : "Delete"}</Btn>
          {editModal.status === "scheduled" && !convertPickup && <button onClick={() => setConvertPickup({ id: editModal.id, origin: "callout", notes: "" })} style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderRadius: 8, border: "1px solid " + TL, background: TL + "12", color: TL, fontSize: 11, fontWeight: 600, cursor: "pointer" }}><SwpI sz={12} c={TL} />Pickup</button>}
        </div>
        <div style={{ display: "flex", gap: 10 }}><Btn t={t} v="ghost" onClick={() => setEditModal(null)}>Cancel</Btn><Btn t={t} onClick={submitEdit}>Save</Btn></div>
      </div>
    </div></Mdl>}

    {/* STARTED SHIFT DETAIL MODAL. Read only. A session says who started a shift where; nothing here edits it. */}
    {startedDetail && <Mdl t={t} onClose={() => setStartedDetail(null)}><div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Started Shift</div><button onClick={() => setStartedDetail(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 8, background: GR + "0A", border: "1px solid " + GR + "20", marginBottom: 16 }}><Ini name={startedDetail.name} /><div><div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text }}>{startedDetail.name}</div>{startedDetail.role && <div style={{ fontSize: 11, color: t.textMut, textTransform: "capitalize" }}>{String(startedDetail.role).replace(/_/g, " ")}</div>}</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div><div style={startedLbl}>Site</div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{startedDetail.siteName || "-"}</div></div>
        <div><div style={startedLbl}>Date</div><div style={{ fontSize: 13, color: t.text }}>{startedDetail.sessionDate ? new Date(startedDetail.sessionDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "-"}</div></div>
        <div><div style={startedLbl}>Building</div><div style={{ fontSize: 13, color: t.text }}>{startedDetail.buildingName || "-"}</div></div>
        <div><div style={startedLbl}>Floor</div><div style={{ fontSize: 13, color: t.text }}>{startedDetail.floorNumber ? "Floor " + startedDetail.floorNumber : "-"}</div></div>
        <div><div style={startedLbl}>Started</div><div style={{ fontSize: 13, fontWeight: 600, color: GR }}>{fmtSessionStart(startedDetail.startedAt) || "-"}</div></div>
        <div><div style={startedLbl}>Task progress</div>{(() => { const total = startedDetail.tasksTotal || 0; const done = startedDetail.tasksCompleted || 0; const pct = total > 0 ? Math.round(done / total * 100) : 0; return (<div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 70, height: 5, borderRadius: 3, background: t.cardAlt, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 3, background: pct === 100 ? GR : GO, width: pct + "%" }} /></div><span style={{ fontSize: 13, color: t.text }}>{done} of {total}</span></div>); })()}</div>
      </div>
      <div style={{ fontSize: 11, color: t.textMut, marginBottom: 16 }}>Recorded when the person started the shift in the portal. There is no end time and no hours here.</div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setStartedDetail(null)}>Close</Btn></div>
    </div></Mdl>}

    {/* INSPECTION RESCHEDULE MODAL */}
    {inspModal && <Mdl t={t} onClose={() => setInspModal(null)}><div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Inspection Details</div><button onClick={() => setInspModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      <div style={{ padding: 12, borderRadius: 8, background: BL + "0A", border: "1px solid " + BL + "20", marginBottom: 16 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4 }}>{inspModal.template_name}</div>
        <div style={{ fontSize: 12, color: t.textSec }}>{inspModal.site_name}</div>
        <Bdg l={inspModal.status || "scheduled"} c={inspModal.status === "completed" ? GR : BL} />
      </div>
      <div style={{ marginBottom: 14 }}><Lbl>Assigned Supervisor</Lbl><Sel t={t} value={inspForm.assigned_to} onChange={e => setInspForm({ ...inspForm, assigned_to: e.target.value })} options={[{ v: "", l: "Unassigned" }, ...(Array.isArray(schedSupervisors) ? schedSupervisors : []).map(s => ({ v: s.id, l: (s.firstName || s.first_name) + " " + (s.lastName || s.last_name) }))]} /></div>
      <div style={{ marginBottom: 20 }}><Lbl>Scheduled Date *</Lbl><Inp t={t} type="date" value={inspForm.scheduled_date} onChange={e => setInspForm({ ...inspForm, scheduled_date: e.target.value })} /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
        <Btn t={t} v="danger" onClick={() => cancelInspFromSchedule(inspModal.id)} style={{ fontSize: 11, padding: "8px 14px" }}>Cancel Inspection</Btn>
        <div style={{ display: "flex", gap: 10 }}><Btn t={t} v="ghost" onClick={() => setInspModal(null)}>Close</Btn><Btn t={t} onClick={submitInspReschedule}>Reschedule</Btn></div>
      </div>
    </div></Mdl>}

    {/* PICKUP DETAIL MODAL */}
    {pickupDetail && <Mdl t={t} onClose={() => setPickupDetail(null)}><div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>{pickupDetail.status === "requested" ? "Shift Drop Request" : pickupDetail.status === "open" ? "Open Marketplace Shift" : pickupDetail.status === "claimed" ? "Claimed Pickup Shift" : pickupDetail.status === "approved" ? "Approved Shift" : "Pickup Shift"}</div><button onClick={() => setPickupDetail(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
      {pickupDetail.status === "requested" && <div style={{ padding: "8px 12px", borderRadius: 6, background: "#F1C40F18", border: "1px solid #F1C40F40", fontSize: 11, color: "#F1C40F", fontWeight: 600, marginBottom: 14 }}>A staff member is requesting to drop this shift. Approve to open it for pickup, deny to keep the original assignment, or reassign directly.</div>}
      {pickupDetail.status === "open" && <div style={{ padding: "8px 12px", borderRadius: 6, background: GO + "18", border: "1px solid " + GO + "40", fontSize: 11, color: t.goldText, fontWeight: 600, marginBottom: 14 }}>This shift is open in the marketplace and available for staff to claim.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Site</div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{pickupDetail.site_name}</div></div>
        <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Status</div><div style={{ fontSize: 14, fontWeight: 600, color: pickupDetail.status === "requested" ? "#F1C40F" : pickupDetail.status === "open" ? GO : pickupDetail.status === "claimed" ? BL : pickupDetail.status === "approved" ? GR : OR }}>{(pickupDetail.status || "unknown").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div></div>
        <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Date</div><div style={{ fontSize: 13, color: t.text }}>{pickupDetail.scheduled_date ? new Date(typeof pickupDetail.scheduled_date === "string" ? pickupDetail.scheduled_date.slice(0, 10) + "T00:00:00" : pickupDetail.scheduled_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : ""}</div></div>
        <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Time</div><div style={{ fontSize: 13, color: t.text }}>{String(pickupDetail.start_time).slice(0, 5)} - {String(pickupDetail.end_time).slice(0, 5)}</div></div>
        {pickupDetail.status === "requested" && pickupDetail.original_user_name && pickupDetail.original_user_name.trim() && <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Requested By</div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{pickupDetail.original_user_name}</div></div>}
        {pickupDetail.status === "claimed" && pickupDetail.claimed_by_name && <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Claimed By</div><div style={{ fontSize: 14, fontWeight: 600, color: BL }}>{pickupDetail.claimed_by_name}</div></div>}
        <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Reason</div><div style={{ fontSize: 13, color: t.text }}>{(pickupDetail.origin || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div></div>
        {pickupDetail.original_user_name && pickupDetail.original_user_name.trim() && pickupDetail.status !== "requested" && <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Originally Assigned</div><div style={{ fontSize: 13, color: t.textSec }}>{pickupDetail.original_user_name}</div></div>}
      </div>
      {pickupDetail.ot_warning && <div style={{ padding: "8px 12px", borderRadius: 6, background: t.orangeSubtle, border: "1px solid " + t.orangeBorder, fontSize: 11, color: OR, fontWeight: 600, marginBottom: 14 }}>Overtime risk: claiming this shift may push the worker past 40 weekly hours.</div>}
      {pickupDetail.notes && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Notes</div><div style={{ fontSize: 12, color: t.textSec, fontStyle: "italic" }}>{pickupDetail.notes}</div></div>}
      <div style={{ padding: 12, borderRadius: 8, background: t.hover, border: "1px solid " + t.border, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Reassign To</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><Sel t={t} value={pickupDetail.reassignTo || ""} onChange={e => setPickupDetail({ ...pickupDetail, reassignTo: e.target.value })} options={[{ v: "", l: "Select staff member..." }, ...staffList.filter(s => s.role !== "admin").map(s => ({ v: s.id, l: s.name || (s.firstName + " " + s.lastName) }))]} /></div>
          <Btn t={t} onClick={async () => {
            if (!pickupDetail.reassignTo) { showToast("Select a staff member", "error"); return; }
            try {
              if (pickupDetail.status === "requested") {
                await af("/api/pickups/" + pickupDetail.id + "/approve-drop", { method: "POST" });
              }
              await af("/api/pickups/" + pickupDetail.id + "/assign", { method: "POST", body: { user_id: pickupDetail.reassignTo } });
              showToast("Shift reassigned");
              setPickupDetail(null);
              loadCalendar();
            } catch (e) { showToast(e.message, "error"); }
          }} style={{ padding: "8px 16px", fontSize: 11 }}>Assign</Btn>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
        {pickupDetail.status === "requested" ? (
          <Btn t={t} v="ghost" onClick={async () => { try { await af("/api/pickups/" + pickupDetail.id + "/deny-drop", { method: "POST" }); showToast("Drop request denied"); setPickupDetail(null); loadCalendar(); } catch (e) { showToast(e.message, "error"); } }} style={{ color: RD, borderColor: RD }}>Deny Request</Btn>
        ) : (
          <Btn t={t} v="ghost" onClick={async () => { try { await af("/api/pickups/" + pickupDetail.id + "/release", { method: "POST" }); showToast("Shift released"); setPickupDetail(null); loadCalendar(); } catch (e) { showToast(e.message, "error"); } }} style={{ color: RD, borderColor: RD }}>Release</Btn>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <Btn t={t} v="ghost" onClick={() => setPickupDetail(null)}>Close</Btn>
          {pickupDetail.status === "requested" && (
            <Btn t={t} onClick={async () => { try { await af("/api/pickups/" + pickupDetail.id + "/approve-drop", { method: "POST" }); showToast("Drop approved, shift is now open"); setPickupDetail(null); loadCalendar(); } catch (e) { showToast(e.message, "error"); } }}>Approve Drop</Btn>
          )}
          {pickupDetail.status === "claimed" && (
            <Btn t={t} onClick={async () => { try { await af("/api/pickups/" + pickupDetail.id + "/approve", { method: "POST" }); showToast("Shift approved"); setPickupDetail(null); loadCalendar(); } catch (e) { showToast(e.message, "error"); } }}>Approve</Btn>
          )}
        </div>
      </div>
    </div></Mdl>}
  </div>);
}

function ShiftMarketplacePage({ af, showToast, isAdmin, t, sites, allStaff, getOpts, lkMap, lkColorMap }) {
  const [dateRange, setDateRange] = useState(() => PRESETS.last30());
  const [tab, setTab] = useState("open");
  const [shifts, setShifts] = useState([]);
  const [pkQ, setPkQ] = useState(""); const [pkPage, setPkPage] = useState(1); const [pkPerPage, setPkPerPage] = useState(10);
  const [analytics, setAnalytics] = useState(null);
  const staff = allStaff;
  const [siteFilter, setSiteFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [createForm, setCreateForm] = useState(null);
  const [convertModal, setConvertModal] = useState(false);
  const [schedShifts, setSchedShifts] = useState([]);
  const [convertOrigin, setConvertOrigin] = useState("callout");
  const [convertNotes, setConvertNotes] = useState("");
  const [siteLocations, setSiteLocations] = useState({});
  const [requestCount, setRequestCount] = useState(0);
  const [claimedCount, setClaimedCount] = useState(0);
  const [fillRateData, setFillRateData] = useState(null);
  const [responseTimeData, setResponseTimeData] = useState(null);
  const [patternData, setPatternData] = useState(null);
  const [reliabilityData, setReliabilityData] = useState(null);
  const [analyticsTab, setAnalyticsTab] = useState("overview");
  const svcOpts = getOpts("service_categories");
  const SVCATS = svcOpts.length > 0 ? svcOpts.map(o => o.l) : ["Office Cleaning", "Laboratory Cleaning", "Industrial Cleaning", "Biohazard Cleaning", "Post-Construction", "Disinfection Services", "Landscaping", "Green Cleaning"];
  const roleLabels = lkMap("staff_roles");

  const fmtDt = (d) => { const s = String(d).slice(0, 10); return new Date(s + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };
  const fmtTm = (t) => { const [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; return ((h % 12) || 12) + ":" + String(m).padStart(2, "0") + " " + ap; };

  const statusColor = { open: GO, claimed: BL, approved: GR, filled: GR, expired: "#7A8A9A", cancelled: "#7A8A9A", requested: "#F1C40F" };
  const lkOriginColors = lkColorMap("shift_origins");
  const lkOriginLabels = lkMap("shift_origins");
  const originColor = Object.keys(lkOriginColors).length > 0 ? lkOriginColors : { callout: RD, no_show: RD, extra_coverage: OR, voluntary_drop: BL, new_shift: GO };
  const originLabel = Object.keys(lkOriginLabels).length > 0 ? lkOriginLabels : { callout: "Callout", no_show: "No-Show", extra_coverage: "Extra Coverage", voluntary_drop: "Voluntary Drop", new_shift: "New Shift" };
  const urgencyBg = { urgent: t.redSubtle, normal: "transparent" };
  const urgencyBorder = { urgent: t.redBorder, normal: t.border };
  const [shiftDetail, setShiftDetail] = useState(null);
  const [siteStaff, setSiteStaff] = useState([]);
  const staffName = (s) => s.name || ((s.first_name || s.firstName || "") + " " + (s.last_name || s.lastName || "")).trim() || "Unknown";
  const openDetail = async (s) => {
    setShiftDetail({ ...s });
    setSiteStaff([]);
    if (s.site_id) {
      try {
        const sd = await af("/api/sites/" + s.site_id);
        const sStaff = (sd.staff || []).filter(st => st.role !== "admin");
        if (sStaff.length > 0) {
          setSiteStaff(sStaff);
        } else {
          setSiteStaff(staff.filter(st => st.role !== "admin"));
        }
      } catch {
        setSiteStaff(staff.filter(st => st.role !== "admin"));
      }
    }
  };

  const load = async (range) => {
    setLoading(true);
    const r = range || dateRange;
    let q = "";
    if (tab === "requested") {
      q = "?status=requested";
      if (siteFilter) q += "&site_id=" + siteFilter;
    } else {
      q = "?start_date=" + r.start + "&end_date=" + r.end;
      if (siteFilter) q += "&site_id=" + siteFilter;
      if (originFilter) q += "&origin=" + originFilter;
      if (tab !== "all" && tab !== "analytics") q += "&status=" + (tab === "filled" ? "approved" : tab);
    }
    try {
      const [s, a, reqs, claimed] = await Promise.all([
        af("/api/pickups" + (tab === "all" ? "?start_date=" + r.start + "&end_date=" + r.end + (siteFilter ? "&site_id=" + siteFilter : "") + (originFilter ? "&origin=" + originFilter : "") : q)),
        af("/api/pickups/analytics?start_date=" + r.start + "&end_date=" + r.end),
        af("/api/pickups?status=requested"),
        af("/api/pickups?status=claimed&start_date=" + r.start + "&end_date=" + r.end)
      ]);
      setShifts(s);
      setAnalytics(a);
      setRequestCount(reqs.length);
      setClaimedCount(claimed.length);
      if (tab === "analytics") {
        const dq = "&start_date=" + r.start + "&end_date=" + r.end;
        const [fr, rt, pt, rl] = await Promise.all([
          af("/api/pickups/analytics/fill-rate?" + dq.slice(1)),
          af("/api/pickups/analytics/response-time?" + dq.slice(1)),
          af("/api/pickups/analytics/patterns?" + dq.slice(1)),
          af("/api/pickups/analytics/staff-reliability?" + dq.slice(1))
        ]);
        setFillRateData(fr);
        setResponseTimeData(rt);
        setPatternData(pt);
        setReliabilityData(rl);
      }
    } catch (e) { showToast(e.message, "error"); }
    setLoading(false);
  };

  useEffect(() => { setPkPage(1); load(); const iv = setInterval(() => load(), 45000); return () => clearInterval(iv); }, [dateRange, tab, siteFilter, originFilter]);

  const loadSiteLocations = async (siteId) => {
    if (siteLocations[siteId]) return;
    try {
      const tasks = await af("/api/sites/" + siteId + "/tasks");
      const buildings = [...new Set(tasks.filter(t => t.building_name).map(t => t.building_name))];
      const floors = {};
      buildings.forEach(b => { floors[b] = [...new Set(tasks.filter(t => t.building_name === b && t.floor_number).map(t => t.floor_number))]; });
      setSiteLocations(prev => ({ ...prev, [siteId]: { buildings, floors } }));
    } catch {}
  };

  const postShift = async () => {
    if (!createForm.site_id || !createForm.scheduled_date || !createForm.start_time || !createForm.end_time) {
      showToast("Site, date, and times are required", "error"); return;
    }
    try {
      await af("/api/pickups", { method: "POST", body: createForm });
      showToast("Open shift posted");
      setCreateForm(null);
      load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const convertShift = async (shiftId) => {
    try {
      await af("/api/pickups/convert/" + shiftId, { method: "POST", body: { origin: convertOrigin, notes: convertNotes } });
      showToast("Shift converted to open pickup");
      setConvertModal(false);
      setConvertNotes("");
      load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const approveShift = async (id) => {
    try { await af("/api/pickups/" + id + "/approve", { method: "POST" }); showToast("Shift approved"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const releaseShift = async (id) => {
    if (!window.confirm("Release this shift back to the open pool?")) return;
    try { await af("/api/pickups/" + id + "/release", { method: "POST" }); showToast("Shift released"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const cancelShift = async (id) => {
    if (!window.confirm("Cancel this open shift? It will no longer be available for pickup.")) return;
    try { await af("/api/pickups/" + id, { method: "PATCH", body: { status: "cancelled" } }); showToast("Shift cancelled"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const openConvertModal = async () => {
    setConvertModal(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const future = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
      const r = await af("/api/schedule?start_date=" + today + "&end_date=" + future);
      setSchedShifts(r.filter(s => s.status === "scheduled"));
    } catch { setSchedShifts([]); }
  };

  const tabs = [
    { id: "open", l: "Open", count: analytics?.summary?.open_count },
    { id: "requested", l: "Requests", count: requestCount > 0 ? requestCount : null },
    { id: "claimed", l: "Claimed", count: claimedCount > 0 ? claimedCount : null },
    { id: "filled", l: "Approved", count: null },
    { id: "all", l: "All" },
    { id: "analytics", l: "Analytics" },
  ];

  return (<div>
    <SecT t={t} action="Post Open Shift" onAction={() => setCreateForm({ site_id: "", scheduled_date: "", start_time: "", end_time: "", building_name: "", floor_number: "", service_category: "", origin: "new_shift", urgency: "normal", notes: "" })}>Shift Pickup Board</SecT>
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, marginTop: -6 }}><button onClick={() => load()} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid " + t.border, background: "transparent", color: t.textMut, fontSize: 10, cursor: "pointer" }}><Ic d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" sz={11} c={t.textMut} /> Refresh</button></div>
    <DateRangePicker value={dateRange} onChange={setDateRange} t={t} presets={[
      { key: "thisWeek", label: "This Week" },
      { key: "lastWeek", label: "Last Week" },
      { key: "thisMonth", label: "This Month" },
      { key: "last30", label: "Last 30 Days" },
    ]} />

    {/* Filters row */}
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ flex: "0 0 180px" }}>
        <Sel t={t} value={siteFilter} onChange={e => setSiteFilter(e.target.value)} options={[{ v: "", l: "All Sites" }, ...sites.map(s => ({ v: s.id, l: s.name }))]} />
      </div>
      <div style={{ flex: "0 0 160px" }}>
        <Sel t={t} value={originFilter} onChange={e => setOriginFilter(e.target.value)} options={[{ v: "", l: "All Reasons" }, ...getOpts("shift_origins")]} />
      </div>
      <div style={{ flex: 1 }} />
      <button onClick={openConvertModal} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid " + RD, background: RD + "12", color: RD, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
        <AlI sz={13} c={RD} /> Convert Callout
      </button>
    </div>

    {/* Summary cards */}
    {analytics?.summary && <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
      <SC t={t} label="Open Now" value={analytics.summary.open_count} color={GO} icon={SwpI} />
      <SC t={t} label="Fill Rate" value={analytics.summary.fill_rate + "%"} color={analytics.summary.fill_rate >= 80 ? GR : analytics.summary.fill_rate >= 50 ? OR : RD} icon={ChkI} />
      <SC t={t} label="Avg Fill Time" value={analytics.summary.avg_time_to_fill_minutes > 60 ? Math.round(analytics.summary.avg_time_to_fill_minutes / 60) + "h" : analytics.summary.avg_time_to_fill_minutes + "m"} color={BL} icon={CkI} />
      <SC t={t} label="Callouts" value={analytics.summary.callout_count} sub={analytics.summary.no_show_count > 0 ? analytics.summary.no_show_count + " no-shows" : ""} color={RD} icon={AlI} />
    </div>}

    {/* Tabs */}
    <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid " + t.border, paddingBottom: 2 }}>
      {tabs.map(tb => (
        <button key={tb.id} onClick={() => setTab(tb.id)} style={{
          padding: "8px 14px", borderRadius: "8px 8px 0 0", border: "none",
          background: tab === tb.id ? t.goldBg : "transparent",
          color: tab === tb.id ? t.goldText : t.textMut,
          fontSize: 12, fontWeight: tab === tb.id ? 700 : 500, cursor: "pointer",
          borderBottom: tab === tb.id ? "2px solid " + GO : "2px solid transparent",
          display: "flex", alignItems: "center", gap: 4
        }}>
          {tb.l}
          {tb.count > 0 && <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 8, background: statusColor[tb.id] || GO, color: "#fff" }}>{tb.count}</span>}
        </button>
      ))}
    </div>

    {loading && <div style={{ textAlign: "center", padding: 40, color: t.textMut }}>Loading...</div>}

    {/* SHIFT LIST TABS */}
    {!loading && tab !== "analytics" && (
      <div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}><Ic d="M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" sz={16} c={t.textMut} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input value={pkQ} onChange={e => { setPkQ(e.target.value); setPkPage(1); }} placeholder="Search site, service, staff, notes" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 36px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13 }} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: t.textMut }}>Show</span><select value={pkPerPage} onChange={e => { setPkPerPage(Number(e.target.value)); setPkPage(1); }} style={{ padding: "9px 10px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>{[10, 25, 50, 100].map(nn => <option key={nn} value={nn}>{nn}</option>)}</select></div>
        </div>
        {(() => {
          const searched = shifts.filter(s => {
            if (!pkQ.trim()) return true;
            const hay = ((s.site_name || "") + " " + (s.service_category || "") + " " + (s.claimed_by_name || "") + " " + (s.original_user_name || "") + " " + (s.notes || "")).toLowerCase();
            return hay.includes(pkQ.trim().toLowerCase());
          });
          const totalPages = Math.max(1, Math.ceil(searched.length / pkPerPage));
          const cur = Math.min(pkPage, totalPages);
          const items = searched.slice((cur - 1) * pkPerPage, cur * pkPerPage);
          const columns = [
            { header: "Shift", render: s => <div style={{ minWidth: 0 }}><div style={{ fontFamily: FONT_HEAD, fontWeight: 600, color: t.text }}>{s.site_name}</div><div style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>{fmtDt(s.scheduled_date)}, {fmtTm(s.start_time)} to {fmtTm(s.end_time)}</div><div style={{ display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>{s.building_name && <span style={{ fontSize: 10, color: t.textMut }}>Bldg: {s.building_name}</span>}{s.floor_number && <span style={{ fontSize: 10, color: t.textMut }}>Floor: {s.floor_number}</span>}{s.service_category && <span style={{ fontSize: 10, color: t.textMut }}>{s.service_category}</span>}</div>{s.notes && <div style={{ fontSize: 11, color: t.textSec, marginTop: 4, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>{s.notes}</div>}</div> },
            { header: "Status", render: s => <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}><Bdg l={s.status === "requested" ? "Drop Request" : s.status} c={statusColor[s.status] || GO} /><Bdg l={originLabel[s.origin] || s.origin} c={originColor[s.origin] || GO} />{s.urgency === "urgent" && <Bdg l="URGENT" c={RD} />}{s.ot_warning && <Bdg l="OT Risk" c={OR} />}</div> },
            { header: "Assigned", render: s => (s.claimed_by_name && s.claimed_by_name.trim()) ? <div style={{ fontSize: 12 }}><span style={{ color: BL, fontWeight: 600 }}>{s.claimed_by_name}</span>{s.claimed_by_role && <span style={{ color: t.textMut }}> ({roleLabels[s.claimed_by_role] || RL[s.claimed_by_role] || s.claimed_by_role})</span>}</div> : ((s.original_user_name && s.original_user_name.trim() && s.status === "requested") ? <span style={{ color: "#F1C40F", fontWeight: 600, fontSize: 12 }}>{s.original_user_name}</span> : <span style={{ color: t.textMut }}>-</span>) },
            { header: "Actions", align: "right", render: s => <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>{s.status === "claimed" && <button onClick={() => approveShift(s.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid " + GR, background: "transparent", color: GR, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Approve</button>}{(s.status === "claimed" || s.status === "approved") && <button onClick={() => releaseShift(s.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid " + OR, background: "transparent", color: OR, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Release</button>}{s.status === "open" && <button onClick={() => cancelShift(s.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Cancel</button>}{s.status === "requested" && <button onClick={async () => { try { await af("/api/pickups/" + s.id + "/approve-drop", { method: "POST" }); showToast("Drop approved"); load(); } catch (e) { showToast(e.message, "error"); } }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid " + GR, background: "transparent", color: GR, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Approve</button>}{s.status === "requested" && <button onClick={async () => { try { await af("/api/pickups/" + s.id + "/deny-drop", { method: "POST" }); showToast("Request denied"); load(); } catch (e) { showToast(e.message, "error"); } }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Deny</button>}<button title="View shift" onClick={() => openDetail(s)} style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid " + t.goldBorder, background: t.goldBg, cursor: "pointer" }}><Ic d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" sz={15} c={t.goldText} /></button></div> }
          ];
          return <DataTable t={t} columns={columns} rows={items} rowKey={s => s.id} onRowClick={s => openDetail(s)} empty="No shifts found for this period and filter." footer={<Pagination t={t} page={cur} perPage={pkPerPage} total={searched.length} onPage={setPkPage} />} />;
        })()}
      </div>
    )}

    {/* ANALYTICS TAB */}
    {!loading && tab === "analytics" && analytics && (
      <div>
        {/* Analytics sub-tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {[{ id: "overview", l: "Overview" }, { id: "response", l: "Response Time" }, { id: "patterns", l: "Callout Patterns" }, { id: "reliability", l: "Staff Reliability" }].map(at => (
            <button key={at.id} onClick={() => setAnalyticsTab(at.id)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: analyticsTab === at.id ? 700 : 500, cursor: "pointer", background: analyticsTab === at.id ? t.goldBg : "transparent", color: analyticsTab === at.id ? t.goldText : t.textMut, border: analyticsTab === at.id ? "1px solid " + t.goldBorder : "1px solid " + t.border }}>{at.l}</button>
          ))}
        </div>

        {/* OVERVIEW SUB-TAB */}
        {analyticsTab === "overview" && (<div>
        <Crd t={t} style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Reason Breakdown</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { k: "callout_count", l: "Callouts", c: RD },
              { k: "no_show_count", l: "No-Shows", c: RD },
              { k: "extra_coverage_count", l: "Extra Coverage", c: OR },
              { k: "voluntary_drop_count", l: "Voluntary Drops", c: BL },
              { k: "new_shift_count", l: "New Shifts", c: t.goldText },
            ].map(r => (
              <div key={r.k} style={{ textAlign: "center", minWidth: 80 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600, color: r.c }}>{analytics.summary[r.k]}</div>
                <div style={{ fontSize: 10, color: t.textMut }}>{r.l}</div>
              </div>
            ))}
          </div>
        </Crd>

        {analytics.summary.ot_warning_count > 0 && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: t.orangeSubtle, border: "1px solid " + t.orangeBorder, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <AlI sz={14} c={OR} />
            <span style={{ fontSize: 12, color: OR, fontWeight: 600 }}>{analytics.summary.ot_warning_count} shift{analytics.summary.ot_warning_count !== 1 ? "s" : ""} claimed with overtime risk</span>
          </div>
        )}

        {analytics.sites?.length > 0 && (
          <Crd t={t} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Coverage by Site</div>
            {analytics.sites.map(s => {
              const fillPct = s.total > 0 ? Math.round(s.filled / s.total * 100) : 0;
              return (
                <div key={s.site_id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{s.site_name}</span>
                    <span style={{ fontSize: 11 }}>
                      <span style={{ color: fillPct >= 80 ? GR : fillPct >= 50 ? OR : RD, fontWeight: 600 }}>{fillPct}% filled</span>
                      <span style={{ color: t.textMut, marginLeft: 8 }}>{s.total} total, {s.callouts} callouts</span>
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: t.cardAlt, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: fillPct >= 80 ? GR : fillPct >= 50 ? OR : RD, width: fillPct + "%", transition: "width 0.4s ease" }} />
                  </div>
                </div>
              );
            })}
          </Crd>
        )}

        {/* Fill Rate by Origin */}
        {fillRateData?.by_origin?.length > 0 && (
          <Crd t={t} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Fill Rate by Reason</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {fillRateData.by_origin.map(o => (
                <div key={o.origin} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid " + (originColor[o.origin] || GO) + "40", background: (originColor[o.origin] || GO) + "0A", minWidth: 120, textAlign: "center" }}>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: o.fill_rate >= 80 ? GR : o.fill_rate >= 50 ? OR : RD }}>{o.fill_rate}%</div>
                  <div style={{ fontSize: 10, color: t.textMut, marginBottom: 2 }}>{originLabel[o.origin] || o.origin}</div>
                  <div style={{ fontSize: 9, color: t.textMut }}>{o.filled}/{o.total} filled</div>
                </div>
              ))}
            </div>
          </Crd>
        )}

        {analytics.trends?.length > 0 && (
          <Crd t={t}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Weekly Trend</div>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 100 }}>
              {analytics.trends.map((w, i) => {
                const max = Math.max(...analytics.trends.map(x => x.total));
                const h = max > 0 ? (w.total / max * 80) : 0;
                const fillPct = w.total > 0 ? Math.round(w.filled / w.total * 100) : 0;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontSize: 8, color: t.textMut, marginBottom: 2 }}>{w.total}</div>
                    <div style={{ width: "80%", height: h, borderRadius: "4px 4px 0 0", background: fillPct >= 80 ? GR : fillPct >= 50 ? OR : RD, minHeight: 2 }} />
                    <div style={{ fontSize: 7, color: t.textMut, marginTop: 3, writingMode: "vertical-lr", transform: "rotate(180deg)", height: 40 }}>{fmtDt(w.week_start)}</div>
                  </div>
                );
              })}
            </div>
          </Crd>
        )}
        </div>)}

        {/* RESPONSE TIME SUB-TAB */}
        {analyticsTab === "response" && responseTimeData && (<div>
          <Crd t={t} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Response Time Summary</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { l: "Average", v: responseTimeData.overall?.avg_minutes, u: "min" },
                { l: "Median", v: responseTimeData.overall?.median_minutes, u: "min" },
                { l: "Fastest", v: responseTimeData.overall?.min_minutes, u: "min" },
                { l: "Slowest", v: responseTimeData.overall?.max_minutes, u: "min" },
                { l: "Total Claimed", v: responseTimeData.overall?.claimed_count, u: "" },
              ].map((m, i) => {
                const displayVal = m.u === "min" && m.v > 60 ? Math.round(m.v / 60) + "h " + (m.v % 60) + "m" : (m.v || 0) + (m.u ? " " + m.u : "");
                return (
                  <div key={i} style={{ textAlign: "center", minWidth: 80 }}>
                    <div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 600, color: i === 0 ? BL : i === 1 ? t.goldText : t.text }}>{displayVal}</div>
                    <div style={{ fontSize: 10, color: t.textMut }}>{m.l}</div>
                  </div>
                );
              })}
            </div>
          </Crd>

          {responseTimeData.by_site?.length > 0 && (
            <Crd t={t} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Response Time by Site</div>
              <div style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "2px solid " + t.border }}>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Site</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Avg (min)</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Median (min)</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Claims</th>
                  </tr></thead>
                  <tbody>{responseTimeData.by_site.map(s => (
                    <tr key={s.site_id} style={{ borderBottom: "1px solid " + t.border }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: t.text }}>{s.site_name}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: s.avg_minutes <= 60 ? GR : s.avg_minutes <= 240 ? OR : RD, fontWeight: 600 }}>{s.avg_minutes > 60 ? Math.round(s.avg_minutes / 60) + "h" : s.avg_minutes + "m"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: t.textSec }}>{s.median_minutes > 60 ? Math.round(s.median_minutes / 60) + "h" : s.median_minutes + "m"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: t.textMut }}>{s.claimed_count}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Crd>
          )}

          {responseTimeData.by_urgency?.length > 0 && (
            <Crd t={t}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Response Time by Urgency</div>
              <div style={{ display: "flex", gap: 16 }}>
                {responseTimeData.by_urgency.map(u => (
                  <div key={u.urgency} style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid " + (u.urgency === "urgent" ? RD : GO) + "40", background: (u.urgency === "urgent" ? RD : GO) + "0A", textAlign: "center", minWidth: 120 }}>
                    <div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: u.urgency === "urgent" ? RD : t.goldText }}>{u.avg_minutes > 60 ? Math.round(u.avg_minutes / 60) + "h" : u.avg_minutes + "m"}</div>
                    <div style={{ fontSize: 11, color: t.textMut, textTransform: "capitalize" }}>{u.urgency}</div>
                    <div style={{ fontSize: 9, color: t.textMut }}>{u.claimed_count} claims</div>
                  </div>
                ))}
              </div>
            </Crd>
          )}
        </div>)}

        {/* CALLOUT PATTERNS SUB-TAB */}
        {analyticsTab === "patterns" && patternData && (<div>
          <Crd t={t} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Shifts by Day of Week</div>
            {(() => {
              const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              const maxTotal = Math.max(...(patternData.by_day || []).map(d => d.total), 1);
              return (
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 120 }}>
                  {DOW.map((dayName, di) => {
                    const dd = (patternData.by_day || []).find(d => d.day_of_week === di);
                    const total = dd?.total || 0;
                    const callouts = dd?.callouts || 0;
                    const noShows = dd?.no_shows || 0;
                    const h = maxTotal > 0 ? (total / maxTotal * 90) : 0;
                    const calloutPct = total > 0 ? Math.round(callouts / total * 100) : 0;
                    return (
                      <div key={di} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ fontSize: 8, color: t.textMut, marginBottom: 2 }}>{total}</div>
                        <div style={{ position: "relative", width: "70%", height: h, borderRadius: "4px 4px 0 0", background: GO + "30", minHeight: total > 0 ? 4 : 0, overflow: "hidden" }}>
                          {callouts > 0 && <div style={{ position: "absolute", bottom: 0, width: "100%", height: (callouts / total * 100) + "%", background: RD + "60", borderRadius: "0 0 0 0" }} />}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: t.text, marginTop: 4 }}>{dayName}</div>
                        {calloutPct > 0 && <div style={{ fontSize: 8, color: RD }}>{calloutPct}% callouts</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: GO + "30" }} /><span style={{ fontSize: 9, color: t.textMut }}>Total</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: RD + "60" }} /><span style={{ fontSize: 9, color: t.textMut }}>Callouts</span></div>
            </div>
          </Crd>

          {/* Site x Day heatmap */}
          {patternData.by_site_day?.length > 0 && (() => {
            const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const siteNames = [...new Set(patternData.by_site_day.map(d => d.site_name))];
            const maxVal = Math.max(...patternData.by_site_day.map(d => d.total), 1);
            return (
              <Crd t={t} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Site x Day Heatmap</div>
                <div style={{ overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead><tr>
                      <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: t.textMut }}></th>
                      {DOW.map(d => <th key={d} style={{ textAlign: "center", padding: "6px 4px", fontSize: 10, color: t.textMut, fontWeight: 600 }}>{d}</th>)}
                    </tr></thead>
                    <tbody>{siteNames.map(sn => (
                      <tr key={sn}>
                        <td style={{ padding: "4px 8px", fontWeight: 600, color: t.text, fontSize: 11, whiteSpace: "nowrap" }}>{sn}</td>
                        {DOW.map((_, di) => {
                          const cell = patternData.by_site_day.find(d => d.site_name === sn && d.day_of_week === di);
                          const val = cell?.total || 0;
                          const intensity = maxVal > 0 ? Math.round(val / maxVal * 255) : 0;
                          const bg = val > 0 ? "rgba(" + (cell?.callouts > 0 ? "220,53,69" : "231,176,23") + "," + (0.1 + intensity / 255 * 0.6) + ")" : "transparent";
                          return <td key={di} style={{ textAlign: "center", padding: "6px 4px", background: bg, borderRadius: 4, color: val > 0 ? t.text : t.textMut, fontWeight: val > 0 ? 600 : 400 }}>{val || "-"}</td>;
                        })}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </Crd>
            );
          })()}

          {patternData.by_month?.length > 0 && (
            <Crd t={t}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Monthly Totals</div>
              <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 100 }}>
                {patternData.by_month.map((m, i) => {
                  const maxM = Math.max(...patternData.by_month.map(x => x.total));
                  const h = maxM > 0 ? (m.total / maxM * 80) : 0;
                  const mDate = new Date(m.month_start + "T00:00:00");
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ fontSize: 8, color: t.textMut, marginBottom: 2 }}>{m.total}</div>
                      <div style={{ width: "70%", height: h, borderRadius: "4px 4px 0 0", background: m.callouts > m.total * 0.4 ? RD : GO, minHeight: 2 }} />
                      <div style={{ fontSize: 9, color: t.textMut, marginTop: 3 }}>{mDate.toLocaleDateString("en-US", { month: "short" })}</div>
                    </div>
                  );
                })}
              </div>
            </Crd>
          )}
        </div>)}

        {/* STAFF RELIABILITY SUB-TAB */}
        {analyticsTab === "reliability" && reliabilityData && (<div>
          <Crd t={t}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, marginBottom: 12, color: t.text }}>Staff Reliability Metrics</div>
            {reliabilityData.staff?.length === 0 && <div style={{ padding: 20, textAlign: "center", color: t.textMut, fontSize: 12 }}>No pickup activity found in this period.</div>}
            {reliabilityData.staff?.length > 0 && (
              <div style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "2px solid " + t.border }}>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Staff Member</th>
                    <th style={{ textAlign: "center", padding: "8px 10px", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Claims</th>
                    <th style={{ textAlign: "center", padding: "8px 10px", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Completed</th>
                    <th style={{ textAlign: "center", padding: "8px 10px", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Released</th>
                    <th style={{ textAlign: "center", padding: "8px 10px", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Drop Requests</th>
                    <th style={{ textAlign: "center", padding: "8px 10px", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Reliability</th>
                  </tr></thead>
                  <tbody>{reliabilityData.staff.map(s => {
                    const reliPct = s.total_claims > 0 ? Math.round(s.completed / s.total_claims * 100) : 0;
                    return (
                      <tr key={s.user_id} style={{ borderBottom: "1px solid " + t.border }}>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ fontWeight: 600, color: t.text }}>{s.name}</div>
                          <div style={{ fontSize: 10, color: t.textMut }}>{roleLabels[s.role] || s.role}</div>
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: BL, fontWeight: 600 }}>{s.total_claims}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: GR, fontWeight: 600 }}>{s.completed}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: s.released > 0 ? OR : t.textMut }}>{s.released}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: s.drop_requests > 0 ? RD : t.textMut }}>{s.drop_requests}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: (reliPct >= 80 ? GR : reliPct >= 50 ? OR : RD) + "18", color: reliPct >= 80 ? GR : reliPct >= 50 ? OR : RD }}>{reliPct}%</span>
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </Crd>
        </div>)}
      </div>
    )}

    {/* POST OPEN SHIFT MODAL */}
    {createForm && <Mdl t={t} onClose={() => setCreateForm(null)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Post Open Shift</div><button onClick={() => setCreateForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>

      <div style={{ marginBottom: 12 }}><Lbl>Site *</Lbl><Sel t={t} value={createForm.site_id} onChange={e => { setCreateForm({ ...createForm, site_id: e.target.value, building_name: "", floor_number: "" }); if (e.target.value) loadSiteLocations(e.target.value); }} options={[{ v: "", l: "Select site..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Date *</Lbl><Inp t={t} type="date" value={createForm.scheduled_date} onChange={e => setCreateForm({ ...createForm, scheduled_date: e.target.value })} /></div>
        <div><Lbl>Start Time *</Lbl><Inp t={t} type="time" value={createForm.start_time} onChange={e => setCreateForm({ ...createForm, start_time: e.target.value })} /></div>
        <div><Lbl>End Time *</Lbl><Inp t={t} type="time" value={createForm.end_time} onChange={e => setCreateForm({ ...createForm, end_time: e.target.value })} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Building</Lbl><Sel t={t} value={createForm.building_name} onChange={e => setCreateForm({ ...createForm, building_name: e.target.value, floor_number: "" })} options={[{ v: "", l: "Select..." }, ...(siteLocations[createForm.site_id]?.buildings || []).map(b => ({ v: b, l: b }))]} /></div>
        <div><Lbl>Floor</Lbl><Sel t={t} value={createForm.floor_number} onChange={e => setCreateForm({ ...createForm, floor_number: e.target.value })} options={[{ v: "", l: "Select..." }, ...(siteLocations[createForm.site_id]?.floors?.[createForm.building_name] || []).map(f => ({ v: f, l: f }))]} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><Lbl>Service Category</Lbl><Sel t={t} value={createForm.service_category} onChange={e => setCreateForm({ ...createForm, service_category: e.target.value })} options={[{ v: "", l: "Select..." }, ...SVCATS.map(s => ({ v: s, l: s }))]} /></div>
        <div><Lbl>Reason</Lbl><Sel t={t} value={createForm.origin} onChange={e => setCreateForm({ ...createForm, origin: e.target.value })} options={getOpts("shift_origins")} /></div>
        <div><Lbl>Urgency</Lbl><Sel t={t} value={createForm.urgency} onChange={e => setCreateForm({ ...createForm, urgency: e.target.value })} options={[{ v: "normal", l: "Normal" }, { v: "urgent", l: "Urgent" }]} /></div>
      </div>

      <div style={{ marginBottom: 16 }}><Lbl>Notes</Lbl><TArea t={t} value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Additional details about this shift..." rows={2} /></div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn t={t} v="ghost" onClick={() => setCreateForm(null)}>Cancel</Btn>
        <Btn t={t} onClick={postShift}>Post Shift</Btn>
      </div>
    </div></Mdl>}

    {/* CONVERT CALLOUT MODAL */}
    {convertModal && <Mdl t={t} onClose={() => setConvertModal(false)}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Convert Scheduled Shift to Open Pickup</div><button onClick={() => setConvertModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>

      <div style={{ padding: "8px 12px", borderRadius: 6, background: t.orangeSubtle, border: "1px solid " + t.orangeBorder, fontSize: 11, color: OR, marginBottom: 14 }}>
        Select a scheduled shift below. The original shift will be cancelled and replaced with an open pickup that eligible staff can claim.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div><Lbl>Reason</Lbl><Sel t={t} value={convertOrigin} onChange={e => setConvertOrigin(e.target.value)} options={[{ v: "callout", l: "Callout" }, { v: "no_show", l: "No-Show" }, { v: "voluntary_drop", l: "Voluntary Drop" }, { v: "extra_coverage", l: "Extra Coverage" }]} /></div>
        <div><Lbl>Notes</Lbl><Inp t={t} value={convertNotes} onChange={e => setConvertNotes(e.target.value)} placeholder="e.g. Marcus called out sick" /></div>
      </div>

      <div style={{ maxHeight: 300, overflow: "auto" }}>
        {schedShifts.length === 0 && <div style={{ padding: 20, textAlign: "center", color: t.textMut, fontSize: 12 }}>No upcoming scheduled shifts found.</div>}
        {schedShifts.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid " + t.border, marginBottom: 6, cursor: "pointer" }} onClick={() => convertShift(s.id)}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{s.staff_name || "Unassigned"}</div>
              <div style={{ fontSize: 11, color: t.textSec }}>{s.site_name} | {fmtDt(s.scheduled_date)}</div>
              <div style={{ fontSize: 10, color: t.textMut }}>{fmtTm(s.start_time)} to {fmtTm(s.end_time)}{s.building_name ? " | " + s.building_name : ""}{s.floor_number ? " Fl " + s.floor_number : ""}</div>
            </div>
            <span style={{ fontSize: 10, color: RD, fontWeight: 600, padding: "4px 10px", borderRadius: 6, border: "1px solid " + RD, flexShrink: 0 }}>Convert</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <Btn t={t} v="ghost" onClick={() => setConvertModal(false)}>Close</Btn>
      </div>
    </div></Mdl>}

    {/* SHIFT DETAIL MODAL */}
    {shiftDetail && <Mdl t={t} onClose={() => setShiftDetail(null)}><div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>{shiftDetail.status === "requested" ? "Shift Drop Request" : "Shift Details"}</div>
        <button onClick={() => setShiftDetail(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button>
      </div>
      {shiftDetail.status === "requested" && <div style={{ padding: "8px 12px", borderRadius: 6, background: "#F1C40F18", border: "1px solid #F1C40F40", fontSize: 11, color: "#F1C40F", fontWeight: 600, marginBottom: 14 }}>A staff member is requesting to drop this shift.</div>}

      {!shiftDetail.editing ? (<>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Site</div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{shiftDetail.site_name}</div></div>
          <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Status</div><div style={{ fontSize: 14, fontWeight: 600, color: goldToText(t, statusColor[shiftDetail.status] || GO) }}>{shiftDetail.status === "requested" ? "Drop Requested" : (shiftDetail.status || "").charAt(0).toUpperCase() + (shiftDetail.status || "").slice(1)}</div></div>
          <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Date</div><div style={{ fontSize: 13, color: t.text }}>{fmtDt(shiftDetail.scheduled_date)}</div></div>
          <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Time</div><div style={{ fontSize: 13, color: t.text }}>{fmtTm(shiftDetail.start_time)} to {fmtTm(shiftDetail.end_time)}</div></div>
          <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Reason</div><div style={{ fontSize: 13, color: t.text }}>{originLabel[shiftDetail.origin] || shiftDetail.origin}</div></div>
          <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Urgency</div><div style={{ fontSize: 13, color: t.text }}>{(shiftDetail.urgency || "normal").charAt(0).toUpperCase() + (shiftDetail.urgency || "normal").slice(1)}</div></div>
          {shiftDetail.building_name && <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Building</div><div style={{ fontSize: 13, color: t.text }}>{shiftDetail.building_name}</div></div>}
          {shiftDetail.floor_number && <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Floor</div><div style={{ fontSize: 13, color: t.text }}>{shiftDetail.floor_number}</div></div>}
          {shiftDetail.claimed_by_name && shiftDetail.claimed_by_name.trim() && <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Claimed By</div><div style={{ fontSize: 13, fontWeight: 600, color: BL }}>{shiftDetail.claimed_by_name}</div></div>}
          {shiftDetail.original_user_name && shiftDetail.original_user_name.trim() && <div><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>{shiftDetail.status === "requested" ? "Requested By" : "Originally Assigned"}</div><div style={{ fontSize: 13, color: t.textSec }}>{shiftDetail.original_user_name}</div></div>}
        </div>
        {shiftDetail.notes && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>Notes</div><div style={{ fontSize: 12, color: t.textSec, fontStyle: "italic" }}>{shiftDetail.notes}</div></div>}

        <div style={{ padding: 12, borderRadius: 8, background: t.hover, border: "1px solid " + t.border, marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Reassign To</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><Sel t={t} value={shiftDetail.reassignTo || ""} onChange={e => setShiftDetail({ ...shiftDetail, reassignTo: e.target.value })} options={[{ v: "", l: siteStaff.length > 0 ? "Staff at this site..." : "Select staff member..." }, ...(siteStaff.length > 0 ? siteStaff : staff.filter(s => s.role !== "admin")).map(s => ({ v: s.id || s.user_id, l: staffName(s) }))]} /></div>
            <Btn t={t} onClick={async () => {
              if (!shiftDetail.reassignTo) { showToast("Select a staff member", "error"); return; }
              try {
                if (shiftDetail.status === "requested") await af("/api/pickups/" + shiftDetail.id + "/approve-drop", { method: "POST" });
                await af("/api/pickups/" + shiftDetail.id + "/assign", { method: "POST", body: { user_id: shiftDetail.reassignTo } });
                showToast("Shift assigned"); setShiftDetail(null); load();
              } catch (e) { showToast(e.message, "error"); }
            }} style={{ padding: "8px 16px", fontSize: 11 }}>Assign</Btn>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {shiftDetail.status === "requested" && <Btn t={t} v="ghost" onClick={async () => { try { await af("/api/pickups/" + shiftDetail.id + "/deny-drop", { method: "POST" }); showToast("Request denied"); setShiftDetail(null); load(); } catch (e) { showToast(e.message, "error"); } }} style={{ color: RD, borderColor: RD }}>Deny</Btn>}
            {shiftDetail.status === "open" && <Btn t={t} v="ghost" onClick={async () => { try { await af("/api/pickups/" + shiftDetail.id, { method: "PATCH", body: { status: "cancelled" } }); showToast("Shift cancelled"); setShiftDetail(null); load(); } catch (e) { showToast(e.message, "error"); } }} style={{ color: RD, borderColor: RD }}>Cancel</Btn>}
            {(shiftDetail.status === "claimed" || shiftDetail.status === "approved") && <Btn t={t} v="ghost" onClick={async () => { try { await af("/api/pickups/" + shiftDetail.id + "/release", { method: "POST" }); showToast("Released"); setShiftDetail(null); load(); } catch (e) { showToast(e.message, "error"); } }} style={{ color: OR, borderColor: OR }}>Release</Btn>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn t={t} v="ghost" onClick={() => setShiftDetail({ ...shiftDetail, editing: true, editSite: shiftDetail.site_id, editDate: String(shiftDetail.scheduled_date).slice(0, 10), editStart: String(shiftDetail.start_time).slice(0, 5), editEnd: String(shiftDetail.end_time).slice(0, 5), editBuilding: shiftDetail.building_name || "", editFloor: shiftDetail.floor_number || "", editService: shiftDetail.service_category || "", editOrigin: shiftDetail.origin, editUrgency: shiftDetail.urgency, editNotes: shiftDetail.notes || "" })}>Edit</Btn>
            {shiftDetail.status === "requested" && <Btn t={t} onClick={async () => { try { await af("/api/pickups/" + shiftDetail.id + "/approve-drop", { method: "POST" }); showToast("Drop approved, shift is open"); setShiftDetail(null); load(); } catch (e) { showToast(e.message, "error"); } }}>Approve Drop</Btn>}
            {shiftDetail.status === "claimed" && <Btn t={t} onClick={async () => { try { await af("/api/pickups/" + shiftDetail.id + "/approve", { method: "POST" }); showToast("Shift approved"); setShiftDetail(null); load(); } catch (e) { showToast(e.message, "error"); } }}>Approve</Btn>}
            {shiftDetail.status !== "requested" && shiftDetail.status !== "claimed" && <Btn t={t} v="ghost" onClick={() => setShiftDetail(null)}>Close</Btn>}
          </div>
        </div>
      </>) : (<>
        <div style={{ marginBottom: 12 }}><Lbl>Site</Lbl><Sel t={t} value={shiftDetail.editSite} onChange={e => { setShiftDetail({ ...shiftDetail, editSite: e.target.value }); if (e.target.value) loadSiteLocations(e.target.value); }} options={[{ v: "", l: "Select site..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><Lbl>Date</Lbl><Inp t={t} type="date" value={shiftDetail.editDate} onChange={e => setShiftDetail({ ...shiftDetail, editDate: e.target.value })} /></div>
          <div><Lbl>Start</Lbl><Inp t={t} type="time" value={shiftDetail.editStart} onChange={e => setShiftDetail({ ...shiftDetail, editStart: e.target.value })} /></div>
          <div><Lbl>End</Lbl><Inp t={t} type="time" value={shiftDetail.editEnd} onChange={e => setShiftDetail({ ...shiftDetail, editEnd: e.target.value })} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><Lbl>Building</Lbl><Inp t={t} value={shiftDetail.editBuilding} onChange={e => setShiftDetail({ ...shiftDetail, editBuilding: e.target.value })} /></div>
          <div><Lbl>Floor</Lbl><Inp t={t} value={shiftDetail.editFloor} onChange={e => setShiftDetail({ ...shiftDetail, editFloor: e.target.value })} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><Lbl>Service</Lbl><Sel t={t} value={shiftDetail.editService} onChange={e => setShiftDetail({ ...shiftDetail, editService: e.target.value })} options={[{ v: "", l: "Select..." }, ...SVCATS.map(s => ({ v: s, l: s }))]} /></div>
          <div><Lbl>Reason</Lbl><Sel t={t} value={shiftDetail.editOrigin} onChange={e => setShiftDetail({ ...shiftDetail, editOrigin: e.target.value })} options={[{ v: "callout", l: "Callout" }, { v: "no_show", l: "No-Show" }, { v: "extra_coverage", l: "Extra Coverage" }, { v: "voluntary_drop", l: "Voluntary Drop" }, { v: "new_shift", l: "New Shift" }]} /></div>
          <div><Lbl>Urgency</Lbl><Sel t={t} value={shiftDetail.editUrgency} onChange={e => setShiftDetail({ ...shiftDetail, editUrgency: e.target.value })} options={[{ v: "normal", l: "Normal" }, { v: "urgent", l: "Urgent" }]} /></div>
        </div>
        <div style={{ marginBottom: 14 }}><Lbl>Notes</Lbl><Inp t={t} value={shiftDetail.editNotes} onChange={e => setShiftDetail({ ...shiftDetail, editNotes: e.target.value })} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn t={t} v="ghost" onClick={() => setShiftDetail({ ...shiftDetail, editing: false })}>Cancel</Btn>
          <Btn t={t} onClick={async () => {
            try {
              await af("/api/pickups/" + shiftDetail.id, { method: "PATCH", body: { site_id: shiftDetail.editSite, scheduled_date: shiftDetail.editDate, start_time: shiftDetail.editStart, end_time: shiftDetail.editEnd, building_name: shiftDetail.editBuilding, floor_number: shiftDetail.editFloor, service_category: shiftDetail.editService, origin: shiftDetail.editOrigin, urgency: shiftDetail.editUrgency, notes: shiftDetail.editNotes } });
              showToast("Shift updated"); setShiftDetail(null); load();
            } catch (e) { showToast(e.message, "error"); }
          }}>Save Changes</Btn>
        </div>
      </>)}
    </div></Mdl>}
  </div>);
}

function InspectionsPage({ af, showToast, isAdmin, t, sites, allStaff, getOpts, lkMap, lkColorMap }) {
  const lkCimsColors = lkColorMap("cims_categories");
  const lkCimsLabels = lkMap("cims_categories");
  const CIMS_C = Object.keys(lkCimsColors).length > 0 ? lkCimsColors : { SD: "#24A4F4", HSE: "#F39C12", GB: "#2ECC71", QS: GOLD, HR: "#9B59B6", MC: "#2C3E50" };
  const cimsLabels = Object.keys(lkCimsLabels).length > 0 ? lkCimsLabels : CIMS_LABELS;
  const ZONES = ["General", "Common Areas", "Offices", "Restrooms", "Lobby", "Kitchen/Break Room", "All Areas", "Exterior", "Parking"];
  const cimsOpts = getOpts("cims_categories");
  const CIMS_CATS = cimsOpts.length > 0 ? cimsOpts.map(o => o.v) : ["SD", "HSE", "GB", "QS", "HR", "MC"];
  const STATUS_C = { scheduled: "#24A4F4", in_progress: "#F39C12", completed: "#2ECC71", cancelled: "#7A8A9A" };
  const fmtDate = (d) => d ? new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--";
  const fmtDT = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "--";

  const [tab, setTab] = useState("templates");
  const [templates, setTemplates] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [completed, setCompleted] = useState([]);
  // Analytics state
  const [analyticsRange, setAnalyticsRange] = useState(() => PRESETS.last90());
  const [analyticsSite, setAnalyticsSite] = useState("");
  const [scoreTrend, setScoreTrend] = useState([]);
  const [siteComp, setSiteComp] = useState([]);
  const [catBreakdown, setCatBreakdown] = useState([]);
  const [lowestItems, setLowestItems] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [newTplModal, setNewTplModal] = useState(false);
  const [newTplForm, setNewTplForm] = useState({ name: "", description: "" });
  const [addItemForm, setAddItemForm] = useState({ label: "", zone: "General", cims_category: "SD", max_score: 10 });
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ template_id: "", site_id: "", assigned_to: "", scheduled_date: "" });
  const [detailView, setDetailView] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [editInspModal, setEditInspModal] = useState(null);
  const [editInspForm, setEditInspForm] = useState({ template_id: "", site_id: "", assigned_to: "", scheduled_date: "" });
  const [schedQ, setSchedQ] = useState(""); const [schedStatus, setSchedStatus] = useState("all"); const [schedPage, setSchedPage] = useState(1);
  const [compQ, setCompQ] = useState(""); const [compPage, setCompPage] = useState(1);
  const [inspPerPage, setInspPerPage] = useState(10);

  const loadTemplates = useCallback(async () => {
    try { const d = await af("/api/inspections/templates"); setTemplates(d); } catch (e) { showToast(e.message, "error"); }
  }, [af]);

  const loadScheduled = useCallback(async () => {
    try {
      const all = await af("/api/inspections/scheduled");
      setScheduled(all.filter(s => s.status !== "completed" && s.status !== "cancelled"));
      setCompleted(all.filter(s => s.status === "completed"));
    } catch (e) { showToast(e.message, "error"); }
  }, [af]);

  const loadAnalytics = useCallback(async (range, siteId) => {
    setAnalyticsLoading(true);
    try {
      const q = "?start_date=" + range.start + "&end_date=" + range.end + (siteId ? "&site_id=" + siteId : "");
      const [trend, comp, cats, low] = await Promise.all([
        af("/api/inspections/analytics/scores-over-time" + q),
        af("/api/inspections/analytics/site-comparison" + q),
        af("/api/inspections/analytics/category-breakdown" + q),
        af("/api/inspections/analytics/lowest-items" + q),
      ]);
      setScoreTrend(trend); setSiteComp(comp); setCatBreakdown(cats); setLowestItems(low);
    } catch (e) { showToast("Failed to load analytics: " + e.message, "error"); }
    setAnalyticsLoading(false);
  }, [af]);

  useEffect(() => {
    loadTemplates(); loadScheduled();
    af("/api/users?role=supervisor").then(setSupervisors).catch(e => console.warn("Load supervisors:", e.message));
  }, []);

  useEffect(() => {
    if (tab === "reports") loadAnalytics(analyticsRange, analyticsSite);
  }, [tab, analyticsRange, analyticsSite]);

  const openTemplate = async (id) => {
    try { const d = await af("/api/inspections/templates/" + id); setSelectedTemplate(d); } catch (e) { showToast(e.message, "error"); }
  };

  const createTemplate = async () => {
    if (!newTplForm.name.trim()) { showToast("Name required", "error"); return; }
    try {
      await af("/api/inspections/templates", { method: "POST", body: newTplForm });
      showToast("Template created"); setNewTplModal(false); setNewTplForm({ name: "", description: "" }); loadTemplates();
    } catch (e) { showToast(e.message, "error"); }
  };

  const addItem = async () => {
    if (!addItemForm.label.trim() || !selectedTemplate) return;
    try {
      await af("/api/inspections/templates/" + selectedTemplate.id + "/items", { method: "POST", body: addItemForm });
      showToast("Item added"); setAddItemForm({ label: "", zone: "General", cims_category: "SD", max_score: 10 }); openTemplate(selectedTemplate.id);
    } catch (e) { showToast(e.message, "error"); }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm("Remove this line item?")) return;
    try { await af("/api/inspections/templates/" + selectedTemplate.id + "/items/" + itemId, { method: "DELETE" }); showToast("Item removed"); openTemplate(selectedTemplate.id); } catch (e) { showToast(e.message, "error"); }
  };

  const [editItemId, setEditItemId] = useState(null);
  const [editItemForm, setEditItemForm] = useState({ label: "", zone: "General", cims_category: "SD", max_score: 10 });

  const startEditItem = (item) => {
    setEditItemId(item.id);
    setEditItemForm({ label: item.label, zone: item.zone, cims_category: item.cims_category, max_score: item.max_score });
  };

  const saveItem = async () => {
    if (!editItemForm.label.trim() || !selectedTemplate) return;
    try {
      await af("/api/inspections/templates/" + selectedTemplate.id + "/items/" + editItemId, { method: "PUT", body: editItemForm });
      showToast("Item saved"); setEditItemId(null); openTemplate(selectedTemplate.id);
    } catch (e) { showToast(e.message, "error"); }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm("Delete this template? All scheduled inspections using it will also be removed.")) return;
    try {
      await af("/api/inspections/templates/" + id, { method: "DELETE" });
      showToast("Template deleted"); if (selectedTemplate?.id === id) setSelectedTemplate(null); loadTemplates();
    } catch (e) { showToast(e.message, "error"); }
  };

  const scheduleInspection = async () => {
    if (!scheduleForm.template_id || !scheduleForm.site_id || !scheduleForm.scheduled_date) { showToast("Template, site, and date are required", "error"); return; }
    try {
      await af("/api/inspections/scheduled", { method: "POST", body: scheduleForm });
      showToast("Inspection scheduled"); setScheduleModal(false); setScheduleForm({ template_id: "", site_id: "", assigned_to: "", scheduled_date: "" }); loadScheduled();
    } catch (e) { showToast(e.message, "error"); }
  };

  const openDetail = async (id) => {
    try { const d = await af("/api/inspections/scheduled/" + id); setDetailView(d); setExpandedItems(new Set()); } catch (e) { showToast(e.message, "error"); }
  };

  const deleteScheduled = async (id) => {
    if (!window.confirm("Delete this inspection?")) return;
    try { await af("/api/inspections/scheduled/" + id, { method: "DELETE" }); showToast("Deleted"); loadScheduled(); } catch (e) { showToast(e.message, "error"); }
  };

  const openEditInspection = (si) => {
    setEditInspForm({ template_id: si.template_id, site_id: si.site_id, assigned_to: si.assigned_to || "", scheduled_date: si.scheduled_date ? si.scheduled_date.slice(0, 10) : "" });
    setEditInspModal(si);
  };
  const submitEditInspection = async () => {
    if (!editInspForm.template_id || !editInspForm.site_id || !editInspForm.scheduled_date) { showToast("Template, site, and date are required", "error"); return; }
    try {
      await af("/api/inspections/scheduled/" + editInspModal.id, { method: "PATCH", body: { template_id: editInspForm.template_id, site_id: editInspForm.site_id, assigned_to: editInspForm.assigned_to || null, scheduled_date: editInspForm.scheduled_date } });
      showToast("Inspection updated"); setEditInspModal(null); loadScheduled();
      if (detailView && detailView.id === editInspModal.id) { openDetail(editInspModal.id); }
    } catch (e) { showToast(e.message, "error"); }
  };
  const cancelInspection = async (id) => {
    if (!window.confirm("Cancel this inspection?")) return;
    try {
      await af("/api/inspections/scheduled/" + id, { method: "PATCH", body: { status: "cancelled" } });
      showToast("Inspection cancelled"); setEditInspModal(null); loadScheduled();
      if (detailView && detailView.id === id) setDetailView(null);
    } catch (e) { showToast(e.message, "error"); }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const exportCSV = (d) => {
    const pct = d.result.max_possible_score > 0 ? Math.round((d.result.total_score / d.result.max_possible_score) * 100) : 0;
    const hdr = ["Item", "Zone", "Service Category", "Score", "Max Score", "Percent", "Notes", "Photo URL"];
    const rows = (d.items || []).map(item => {
      const sr = (d.scores || []).find(s => s.template_item_id === item.id);
      const iPct = sr && item.max_score > 0 ? Math.round((sr.score / item.max_score) * 100) + "%" : "--";
      return [item.label, item.zone, cimsLabels[item.cims_category] || item.cims_category, sr ? sr.score : "--", item.max_score, iPct, sr?.notes || "", sr?.photo_url || ""];
    });
    rows.push([], ["TOTAL", "", "", d.result.total_score, d.result.max_possible_score, pct + "%", d.result.overall_notes || "", ""]);
    dlCSV("inspection-" + d.site_name.replace(/\s/g, "-") + "-" + d.scheduled_date + ".csv", hdr, rows);
  };

  const exportPrint = (d) => {
    const pct = d.result.max_possible_score > 0 ? Math.round((d.result.total_score / d.result.max_possible_score) * 100) : 0;
    const scoreColor = pct >= 80 ? "#2ECC71" : pct >= 60 ? "#F39C12" : "#E74C3C";
    const itemRows = (d.items || []).map(item => {
      const sr = (d.scores || []).find(s => s.template_item_id === item.id);
      const iPct = sr && item.max_score > 0 ? Math.round((sr.score / item.max_score) * 100) : 0;
      const iColor = iPct >= 80 ? "#2ECC71" : iPct >= 60 ? "#F39C12" : "#E74C3C";
      const barW = Math.round((iPct / 100) * 200);
      return `
        <tr style="border-bottom:1px solid #eee">
          <td style="padding:10px 8px;font-size:13px;font-weight:600">${item.label}</td>
          <td style="padding:10px 8px;font-size:12px;color:#666">${item.zone}</td>
          <td style="padding:10px 8px;text-align:center">
            <span style="background:${(CIMS_C[item.cims_category] || "#3498DB") + "22"};color:${CIMS_C[item.cims_category] || "#3498DB"};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${cimsLabels[item.cims_category] || item.cims_category}</span>
          </td>
          <td style="padding:10px 8px">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="background:#eee;border-radius:4px;height:8px;width:200px;overflow:hidden">
                <div style="background:${iColor};height:100%;width:${barW}px;border-radius:4px"></div>
              </div>
              <span style="font-weight:700;color:${iColor};font-size:13px">${sr ? sr.score : "--"}<span style="color:#999;font-weight:400;font-size:11px">/${item.max_score}</span></span>
            </div>
          </td>
          <td style="padding:10px 8px;font-size:12px;color:#555;max-width:160px">${sr?.notes || ""}</td>
          <td style="padding:10px 8px;text-align:center">${sr?.photo_url ? `<img src="${sr.photo_url}" style="width:80px;height:60px;object-fit:cover;border-radius:4px" />` : ""}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>Inspection Report</title>
      <style>body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;margin:0;padding:32px}
      table{width:100%;border-collapse:collapse}th{background:${NAVY_DARK};color:#fff;padding:10px 8px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:1px}
      @media print{body{padding:16px}}</style></head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:20px;border-bottom:3px solid ${GOLD}">
          <div>
            <div style="font-size:22px;font-weight:700;color:${NAVY_DARK}">Inspection Report</div>
            <div style="font-size:14px;color:#555;margin-top:4px">${d.template_name}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">${clientConfig.company.name}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px">
          <div style="padding:14px;border:1px solid #e0e0e0;border-radius:8px">
            <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Site</div>
            <div style="font-size:14px;font-weight:600">${d.site_name}</div>
          </div>
          <div style="padding:14px;border:1px solid #e0e0e0;border-radius:8px">
            <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Scheduled Date</div>
            <div style="font-size:14px;font-weight:600">${fmtDate(d.scheduled_date)}</div>
          </div>
          <div style="padding:14px;border:1px solid #e0e0e0;border-radius:8px">
            <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Completed</div>
            <div style="font-size:14px;font-weight:600">${fmtDT(d.result.completed_at)}</div>
          </div>
          <div style="padding:14px;border:1px solid #e0e0e0;border-radius:8px">
            <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Completed By</div>
            <div style="font-size:14px;font-weight:600">${d.result.completed_by_name || "--"}</div>
          </div>
          <div style="padding:14px;border:1px solid #e0e0e0;border-radius:8px">
            <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Overall Score</div>
            <div style="font-size:24px;font-weight:700;color:${scoreColor}">${pct}% <span style="font-size:13px;color:#888;font-weight:400">${d.result.total_score}/${d.result.max_possible_score} pts</span></div>
          </div>
          ${d.result.overall_notes ? `<div style="padding:14px;border:1px solid #e0e0e0;border-radius:8px"><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Notes</div><div style="font-size:13px;color:#333">${d.result.overall_notes}</div></div>` : ""}
        </div>
        <table>
          <thead><tr><th>Item</th><th>Zone</th><th>Category</th><th>Score</th><th>Notes</th><th>Photo</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#aaa;text-align:center">Generated by ${clientConfig.company.shortName} Operations Platform</div>
      </body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  // DETAIL FULL PAGE VIEW
  if (detailView) {
    const d = detailView;
    const isComplete = !!d.result;
    const pct = isComplete && d.result.max_possible_score > 0 ? Math.round((d.result.total_score / d.result.max_possible_score) * 100) : null;
    const scoreColor = pct === null ? t.textMut : pct >= 80 ? GR : pct >= 60 ? OR : RD;

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setDetailView(null)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1px solid " + t.border, background: "transparent", color: t.textSec, fontSize: 12, cursor: "pointer" }}>
            <Ic d="M15 18l-6-6 6-6" sz={14} c={t.textSec} /> Back
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: t.text }}>{d.template_name}</div>
            <div style={{ fontSize: 12, color: t.textSec }}>{d.site_name}</div>
          </div>
          {isComplete && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => exportCSV(d)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1px solid " + t.border, background: "transparent", color: t.textSec, fontSize: 12, cursor: "pointer" }}>
                CSV
              </button>
              <button onClick={() => exportPrint(d)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", background: GO, color: NAVY, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Export PDF
              </button>
            </div>
          )}
          {!isComplete && isAdmin && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => openEditInspection(d)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1px solid " + t.border, background: "transparent", color: t.textSec, fontSize: 12, cursor: "pointer" }}>
                <EdI sz={12} c={t.textSec} /> Edit
              </button>
              <button onClick={() => cancelInspection(d.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1px solid " + RD + "40", background: RD + "10", color: RD, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
          <Crd t={t}><div style={{ fontSize: 9, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Scheduled Date</div><div style={{ fontWeight: 600, color: t.text }}>{fmtDate(d.scheduled_date)}</div></Crd>
          {d.assigned_name && <Crd t={t}><div style={{ fontSize: 9, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Assigned To</div><div style={{ fontWeight: 600, color: t.text }}>{d.assigned_name}</div></Crd>}
          <Crd t={t}><div style={{ fontSize: 9, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Status</div><Bdg l={d.status.replace("_", " ")} c={STATUS_C[d.status] || BL} /></Crd>
          {isComplete && <>
            <Crd t={t}><div style={{ fontSize: 9, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Completed At</div><div style={{ fontFamily: FONT_HEAD, fontWeight: 600, color: t.text, fontSize: 13 }}>{fmtDT(d.result.completed_at)}</div></Crd>
            <Crd t={t}><div style={{ fontSize: 9, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Completed By</div><div style={{ fontWeight: 600, color: t.text }}>{d.result.completed_by_name}</div></Crd>
            <Crd t={t}><div style={{ fontSize: 9, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Overall Score</div><div style={{ fontFamily: FONT_HEAD, fontSize: 26, fontWeight: 600, color: scoreColor, lineHeight: 1 }}>{pct}%</div><div style={{ fontSize: 10, color: t.textMut }}>{d.result.total_score}/{d.result.max_possible_score} pts</div></Crd>
          </>}
        </div>

        {isComplete && d.result.overall_notes && (
          <Crd t={t} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Overall Notes</div>
            <div style={{ fontSize: 13, color: t.textSec, lineHeight: 1.5 }}>{d.result.overall_notes}</div>
          </Crd>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(d.items || []).map(item => {
            const sr = isComplete ? (d.scores || []).find(s => s.template_item_id === item.id) : null;
            const iPct = sr && item.max_score > 0 ? Math.round((sr.score / item.max_score) * 100) : null;
            const iColor = iPct === null ? t.textMut : iPct >= 80 ? GR : iPct >= 60 ? OR : RD;
            const isExp = expandedItems.has(item.id);

            return (
              <Crd key={item.id} t={t} style={{ padding: 0, overflow: "hidden" }}>
                <button onClick={() => toggleExpand(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: (CIMS_C[item.cims_category] || BL) + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: CIMS_C[item.cims_category] || BL, flexShrink: 0 }} title={cimsLabels[item.cims_category]}>{item.cims_category}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: t.textMut }}>{item.zone}</div>
                  </div>
                  {sr && (
                    <div style={{ textAlign: "right", marginRight: 8 }}>
                      <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, color: iColor, fontSize: 18 }}>{sr.score}</span>
                      <span style={{ fontSize: 11, color: t.textMut }}>/{item.max_score}</span>
                    </div>
                  )}
                  {sr && (
                    <div style={{ width: 80, height: 6, background: t.border, borderRadius: 3, overflow: "hidden", marginRight: 8 }}>
                      <div style={{ height: "100%", width: iPct + "%", background: iColor, borderRadius: 3 }} />
                    </div>
                  )}
                  <Ic d={isExp ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} sz={14} c={t.textMut} />
                </button>

                {isExp && (
                  <div style={{ borderTop: "1px solid " + t.border, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {sr ? (
                      <>
                        <div style={{ display: "flex", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Score</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ flex: 1, height: 8, background: t.border, borderRadius: 4, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: iPct + "%", background: iColor, borderRadius: 4 }} />
                              </div>
                              <span style={{ fontWeight: 600, color: iColor }}>{sr.score}/{item.max_score} ({iPct}%)</span>
                            </div>
                          </div>
                        </div>
                        {sr.notes && (
                          <div>
                            <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Notes</div>
                            <div style={{ fontSize: 13, color: t.textSec, lineHeight: 1.5, padding: "8px 12px", background: t.cardAlt, borderRadius: 8 }}>{sr.notes}</div>
                          </div>
                        )}
                        {sr.photo_url ? (
                          <div>
                            <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Attached Photo</div>
                            <a href={sr.photo_url} target="_blank" rel="noreferrer">
                              <img src={sr.photo_url} alt="Inspection photo" style={{ maxWidth: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 8, border: "1px solid " + t.border, cursor: "pointer" }} />
                            </a>
                            <div style={{ fontSize: 10, color: t.textMut, marginTop: 4 }}>Click photo to open full size</div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: t.textMut, fontStyle: "italic" }}>No photo attached for this item.</div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: t.textMut }}>This item was not scored (inspection not yet completed).</div>
                    )}
                  </div>
                )}
              </Crd>
            );
          })}
        </div>

        {editInspModal && <Mdl t={t} onClose={() => setEditInspModal(null)}><div style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Edit Scheduled Inspection</div><button onClick={() => setEditInspModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
          <div style={{ marginBottom: 14 }}><Lbl>Template *</Lbl><Sel t={t} value={editInspForm.template_id} onChange={e => setEditInspForm({ ...editInspForm, template_id: e.target.value })} options={[{ v: "", l: "Select template..." }, ...templates.map(tp => ({ v: tp.id, l: tp.name }))]} /></div>
          <div style={{ marginBottom: 14 }}><Lbl>Site *</Lbl><Sel t={t} value={editInspForm.site_id} onChange={e => setEditInspForm({ ...editInspForm, site_id: e.target.value })} options={[{ v: "", l: "Select site..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
          <div style={{ marginBottom: 14 }}><Lbl>Assigned Supervisor</Lbl><Sel t={t} value={editInspForm.assigned_to} onChange={e => setEditInspForm({ ...editInspForm, assigned_to: e.target.value })} options={[{ v: "", l: "Unassigned" }, ...supervisors.map(s => ({ v: s.id, l: (s.firstName || s.first_name) + " " + (s.lastName || s.last_name) }))]} /></div>
          <div style={{ marginBottom: 20 }}><Lbl>Scheduled Date *</Lbl><Inp t={t} type="date" value={editInspForm.scheduled_date} onChange={e => setEditInspForm({ ...editInspForm, scheduled_date: e.target.value })} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
            <Btn t={t} v="danger" onClick={() => cancelInspection(editInspModal.id)} style={{ fontSize: 11, padding: "8px 14px" }}>Cancel Inspection</Btn>
            <div style={{ display: "flex", gap: 10 }}><Btn t={t} v="ghost" onClick={() => setEditInspModal(null)}>Close</Btn><Btn t={t} onClick={submitEditInspection}>Save</Btn></div>
          </div>
        </div></Mdl>}
      </div>
    );
  }

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid " + t.border }}>
        {[["templates", "Templates"], ["scheduled", "Scheduled"], ["completed", "Completed"], ["reports", "Reports"]].map(([tb, lbl]) => (
          <button key={tb} onClick={() => setTab(tb)} style={{ padding: "8px 18px", background: "none", border: "none", borderBottom: tab === tb ? "2px solid " + GO : "2px solid transparent", color: tab === tb ? t.goldText : t.textSec, fontWeight: tab === tb ? 700 : 400, fontSize: 13, cursor: "pointer" }}>{lbl}{tb === "completed" && completed.length > 0 ? " (" + completed.length + ")" : ""}</button>
        ))}
      </div>

      {/* TEMPLATES TAB */}
      {tab === "templates" && (
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <SecT t={t} action="New Template" onAction={() => setNewTplModal(true)}>Inspection Templates</SecT>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {templates.map(tp => (
                <Crd key={tp.id} t={t} onClick={() => openTemplate(tp.id)} style={{ cursor: "pointer", border: selectedTemplate?.id === tp.id ? "1.5px solid " + GO : "1px solid " + t.border }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, color: t.text, fontSize: 14, flex: 1, marginRight: 8 }}>{tp.name}</div>
                    {isAdmin && <button onClick={e => { e.stopPropagation(); deleteTemplate(tp.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}><XI sz={14} c={RD} /></button>}
                  </div>
                  {tp.description && <div style={{ fontSize: 11, color: t.textSec, marginBottom: 8, lineHeight: 1.4 }}>{tp.description}</div>}
                  <div style={{ fontSize: 10, color: t.textMut }}>{tp.item_count} line items</div>
                </Crd>
              ))}
              {templates.length === 0 && <div style={{ fontSize: 12, color: t.textMut, padding: "20px 0" }}>No templates yet. Create one to get started.</div>}
            </div>
          </div>

          {selectedTemplate && (
            <div style={{ width: 380, flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: t.text }}>{selectedTemplate.name}</div>
                <button onClick={() => setSelectedTemplate(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={16} c={t.textMut} /></button>
              </div>
              <div style={{ marginBottom: 14 }}>
                {(selectedTemplate.items || []).map(item => (
                  <div key={item.id} style={{ borderRadius: 8, background: t.cardAlt, marginBottom: 6, overflow: "hidden" }}>
                    {editItemId === item.id ? (
                      <div style={{ padding: "10px 12px" }}>
                        <div style={{ marginBottom: 6 }}><Inp t={t} value={editItemForm.label} onChange={e => setEditItemForm({ ...editItemForm, label: e.target.value })} placeholder="Item label" style={{ fontSize: 12 }} /></div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                          <Sel t={t} value={editItemForm.zone} onChange={e => setEditItemForm({ ...editItemForm, zone: e.target.value })} options={ZONES.map(z => ({ v: z, l: z }))} />
                          <Sel t={t} value={editItemForm.cims_category} onChange={e => setEditItemForm({ ...editItemForm, cims_category: e.target.value })} options={getOpts("cims_categories")} />
                        </div>
                        <div style={{ marginBottom: 8 }}><Inp t={t} type="number" min="1" max="100" value={editItemForm.max_score} onChange={e => setEditItemForm({ ...editItemForm, max_score: parseInt(e.target.value) || 10 })} placeholder="Max score" style={{ fontSize: 12 }} /></div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Btn t={t} onClick={saveItem} style={{ flex: 1, padding: "6px 10px", fontSize: 11 }}>Save</Btn>
                          <Btn t={t} v="ghost" onClick={() => setEditItemId(null)} style={{ flex: 1, padding: "6px 10px", fontSize: 11 }}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px" }}>
                        <div style={{ width: 26, height: 26, borderRadius: 5, background: (CIMS_C[item.cims_category] || BL) + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: CIMS_C[item.cims_category] || BL, flexShrink: 0 }} title={cimsLabels[item.cims_category]}>{item.cims_category}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{item.label}</div>
                          <div style={{ fontSize: 10, color: t.textMut }}>{item.zone} - max {item.max_score} pts</div>
                        </div>
                        <button onClick={() => startEditItem(item)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4, color: t.textSec, fontSize: 10 }}>Edit</button>
                        <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}><XI sz={12} c={t.textMut} /></button>
                      </div>
                    )}
                  </div>
                ))}
                {(!selectedTemplate.items || selectedTemplate.items.length === 0) && (
                  <div style={{ fontSize: 11, color: t.textMut, padding: "8px 0" }}>No items yet. Add your first line item below.</div>
                )}
              </div>
              <Crd t={t} style={{ padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Add Line Item</div>
                <div style={{ marginBottom: 8 }}><Lbl>Item Label *</Lbl><Inp t={t} value={addItemForm.label} onChange={e => setAddItemForm({ ...addItemForm, label: e.target.value })} placeholder="e.g. Toilets scrubbed and sanitized" onKeyDown={e => e.key === "Enter" && addItem()} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div><Lbl>Zone</Lbl><Sel t={t} value={addItemForm.zone} onChange={e => setAddItemForm({ ...addItemForm, zone: e.target.value })} options={ZONES.map(z => ({ v: z, l: z }))} /></div>
                  <div><Lbl>Service Category</Lbl><Sel t={t} value={addItemForm.cims_category} onChange={e => setAddItemForm({ ...addItemForm, cims_category: e.target.value })} options={getOpts("cims_categories")} /></div>
                </div>
                <div style={{ marginBottom: 10 }}><Lbl>Max Score (points)</Lbl><Inp t={t} type="number" min="1" max="100" value={addItemForm.max_score} onChange={e => setAddItemForm({ ...addItemForm, max_score: parseInt(e.target.value) || 10 })} /></div>
                <Btn t={t} onClick={addItem} style={{ width: "100%" }}>Add Item</Btn>
              </Crd>
            </div>
          )}
        </div>
      )}

      {/* SCHEDULED TAB */}
      {tab === "scheduled" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <Btn t={t} onClick={() => setScheduleModal(true)}>Schedule Inspection</Btn>
          </div>
          <FilterTabs t={t} value={schedStatus} onChange={s => { setSchedStatus(s); setSchedPage(1); }} tabs={[{ id: "all", label: "All", count: scheduled.length, color: t.goldText }, { id: "scheduled", label: "Scheduled", count: scheduled.filter(s => s.status === "scheduled").length, color: BL }, { id: "in_progress", label: "In Progress", count: scheduled.filter(s => s.status === "in_progress").length, color: OR }]} />
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}><Ic d="M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" sz={16} c={t.textMut} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input value={schedQ} onChange={e => { setSchedQ(e.target.value); setSchedPage(1); }} placeholder="Search template, site, assignee" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 36px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13 }} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: t.textMut }}>Show</span><select value={inspPerPage} onChange={e => { setInspPerPage(Number(e.target.value)); setSchedPage(1); }} style={{ padding: "9px 10px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>{[10, 25, 50, 100].map(nn => <option key={nn} value={nn}>{nn}</option>)}</select></div>
          </div>
          {(() => {
            const filtered = schedStatus === "all" ? scheduled : scheduled.filter(s => s.status === schedStatus);
            const searched = filtered.filter(si => {
              if (!schedQ.trim()) return true;
              const hay = ((si.template_name || "") + " " + (si.site_name || "") + " " + (si.assigned_name || "")).toLowerCase();
              return hay.includes(schedQ.trim().toLowerCase());
            });
            const totalPages = Math.max(1, Math.ceil(searched.length / inspPerPage));
            const cur = Math.min(schedPage, totalPages);
            const items = searched.slice((cur - 1) * inspPerPage, cur * inspPerPage);
            const columns = [
              { header: "Inspection", render: si => <div style={{ minWidth: 0 }}><div style={{ fontFamily: FONT_HEAD, fontWeight: 600, color: t.text }}>{si.template_name}</div><div style={{ fontSize: 11, color: t.textMut, marginTop: 2 }}>{si.site_name}</div></div> },
              { header: "Scheduled", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: si => fmtDate(si.scheduled_date) },
              { header: "Assigned", render: si => si.assigned_name ? <span style={{ color: t.textSec }}>{si.assigned_name}</span> : <span style={{ color: t.textMut }}>Unassigned</span> },
              { header: "Status", render: si => <Bdg l={si.status.replace("_", " ")} c={STATUS_C[si.status] || BL} /> },
              { header: "Actions", align: "right", render: si => <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}><button title="View inspection" onClick={e => { e.stopPropagation(); openDetail(si.id); }} style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid " + t.goldBorder, background: t.goldBg, cursor: "pointer" }}><Ic d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" sz={15} c={t.goldText} /></button>{isAdmin && <button title="Edit" onClick={e => { e.stopPropagation(); openEditInspection(si); }} style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid " + t.border, background: "transparent", cursor: "pointer" }}><EdI sz={13} c={t.textMut} /></button>}{isAdmin && <button title="Delete" onClick={e => { e.stopPropagation(); deleteScheduled(si.id); }} style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid " + t.border, background: "transparent", cursor: "pointer" }}><XI sz={14} c={t.textMut} /></button>}</div> }
            ];
            return <DataTable t={t} columns={columns} rows={items} rowKey={si => si.id} onRowClick={si => openDetail(si.id)} empty={scheduled.length === 0 ? "No pending inspections." : "No inspections match these filters."} footer={<Pagination t={t} page={cur} perPage={inspPerPage} total={searched.length} onPage={setSchedPage} />} />;
          })()}
        </div>
      )}

      {/* COMPLETED TAB */}
      {tab === "completed" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}><Ic d="M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" sz={16} c={t.textMut} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input value={compQ} onChange={e => { setCompQ(e.target.value); setCompPage(1); }} placeholder="Search template, site, assignee" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 36px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13 }} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: t.textMut }}>Show</span><select value={inspPerPage} onChange={e => { setInspPerPage(Number(e.target.value)); setCompPage(1); }} style={{ padding: "9px 10px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>{[10, 25, 50, 100].map(nn => <option key={nn} value={nn}>{nn}</option>)}</select></div>
          </div>
          {(() => {
            const searched = completed.filter(si => {
              if (!compQ.trim()) return true;
              const hay = ((si.template_name || "") + " " + (si.site_name || "") + " " + (si.assigned_name || "")).toLowerCase();
              return hay.includes(compQ.trim().toLowerCase());
            });
            const totalPages = Math.max(1, Math.ceil(searched.length / inspPerPage));
            const cur = Math.min(compPage, totalPages);
            const items = searched.slice((cur - 1) * inspPerPage, cur * inspPerPage);
            const columns = [
              { header: "Inspection", render: si => <div style={{ minWidth: 0 }}><div style={{ fontFamily: FONT_HEAD, fontWeight: 600, color: t.text }}>{si.template_name}</div><div style={{ fontSize: 11, color: t.textMut, marginTop: 2 }}>{si.site_name}</div></div> },
              { header: "Scheduled", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: si => fmtDate(si.scheduled_date) },
              { header: "Assigned", render: si => si.assigned_name ? <span style={{ color: t.textSec }}>{si.assigned_name}</span> : <span style={{ color: t.textMut }}>-</span> },
              { header: "Score", align: "right", tdStyle: { whiteSpace: "nowrap" }, render: si => { const pct = si.total_score && si.max_possible_score ? Math.round((si.total_score / si.max_possible_score) * 100) : null; if (pct === null) return <span style={{ color: t.textMut }}>-</span>; const sc = pct >= 80 ? GR : pct >= 60 ? OR : RD; return <div><span style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: sc }}>{pct}%</span><div style={{ fontSize: 10, color: t.textMut }}>{si.total_score}/{si.max_possible_score} pts</div></div>; } },
              { header: "Actions", align: "right", render: si => <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}><button title="View inspection" onClick={e => { e.stopPropagation(); openDetail(si.id); }} style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid " + t.goldBorder, background: t.goldBg, cursor: "pointer" }}><Ic d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" sz={15} c={t.goldText} /></button>{isAdmin && <button title="Delete" onClick={e => { e.stopPropagation(); deleteScheduled(si.id); }} style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid " + t.border, background: "transparent", cursor: "pointer" }}><XI sz={14} c={t.textMut} /></button>}</div> }
            ];
            return <DataTable t={t} columns={columns} rows={items} rowKey={si => si.id} onRowClick={si => openDetail(si.id)} empty={completed.length === 0 ? "No completed inspections yet." : "No inspections match this search."} footer={<Pagination t={t} page={cur} perPage={inspPerPage} total={searched.length} onPage={setCompPage} />} />;
          })()}
        </div>
      )}

      {/* REPORTS TAB */}
      {tab === "reports" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <DateRangePicker value={analyticsRange} onChange={setAnalyticsRange} t={t} presets={[
                { key: "last30", label: "Last 30 Days" },
                { key: "last60", label: "Last 60 Days" },
                { key: "last90", label: "Last 90 Days" },
              ]} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Sel t={t} value={analyticsSite} onChange={e => setAnalyticsSite(e.target.value)} options={[{ v: "", l: "All Sites" }, ...sites.map(s => ({ v: s.id, l: s.name }))]} style={{ width: 180, padding: "5px 10px", fontSize: 11 }} />
              <button onClick={() => {
                const q = "?start_date=" + analyticsRange.start + "&end_date=" + analyticsRange.end + (analyticsSite ? "&site_id=" + analyticsSite : "");
                af("/api/inspections/analytics/export" + q).then(rows => {
                  if (!rows.length) { showToast("No data to export", "error"); return; }
                  const hdr = ["Date", "Site", "Template", "Score", "Max", "Pct", "Notes", "Completed By", "Item", "Zone", "Category", "Item Score", "Item Max", "Item Pct", "Item Notes"];
                  const csvRows = rows.map(r => [r.scheduled_date, r.site_name, r.template_name, r.total_score, r.max_possible_score, r.score_pct + "%", r.overall_notes || "", r.completed_by_name, r.item_label || "", r.item_zone || "", r.item_cims_category ? (cimsLabels[r.item_cims_category] || r.item_cims_category) : "", r.item_score ?? "", r.item_max_score ?? "", r.item_score_pct ? r.item_score_pct + "%" : "", r.item_notes || ""]);
                  dlCSV("inspection-analytics-" + analyticsRange.start + "-to-" + analyticsRange.end + ".csv", hdr, csvRows);
                  showToast("Exported " + rows.length + " rows");
                }).catch(e => showToast(e.message, "error"));
              }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 11, fontWeight: 600, cursor: "pointer" }}><DlI sz={12} c={t.goldText} /> Export CSV</button>
            </div>
          </div>

          {analyticsLoading && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Loading analytics...</div>}

          {!analyticsLoading && (
            <div>
              {/* SITE COMPARISON BARS */}
              {siteComp.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 12 }}>Site Comparison</div>
                  <Crd t={t}>
                    {siteComp.map((sc, i) => {
                      const pct = Number(sc.latest_score_pct);
                      const avg = Number(sc.avg_score_pct);
                      const barColor = pct >= 80 ? GR : pct >= 60 ? OR : RD;
                      return (
                        <div key={sc.site_id} style={{ padding: "12px 0", borderBottom: i < siteComp.length - 1 ? "1px solid " + t.border : "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{sc.site_name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 10, color: t.textMut }}>{sc.inspection_count} inspections, avg {avg}%</span>
                              <span style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: barColor }}>{pct}%</span>
                            </div>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: t.cardAlt, overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 4, background: barColor, width: pct + "%", transition: "width 0.5s ease" }} />
                          </div>
                          <div style={{ fontSize: 10, color: t.textMut, marginTop: 4 }}>Latest: {fmtDate(sc.latest_date)}</div>
                        </div>
                      );
                    })}
                  </Crd>
                </div>
              )}

              {/* SCORE TREND CHART */}
              {scoreTrend.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 12 }}>Score Trend</div>
                  <Crd t={t}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 160, padding: "0 4px" }}>
                      {scoreTrend.map((pt, i) => {
                        const pct = Number(pt.score_pct);
                        const barColor = pct >= 80 ? GR : pct >= 60 ? OR : RD;
                        const barH = Math.max(8, (pct / 100) * 140);
                        return (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }} title={pt.site_name + ": " + pct + "% on " + fmtDate(pt.scheduled_date)}>
                            <div style={{ fontSize: 8, color: t.textMut, marginBottom: 2, writingMode: scoreTrend.length > 12 ? "vertical-rl" : "horizontal-tb", whiteSpace: "nowrap" }}>{pct}%</div>
                            <div style={{ width: "100%", maxWidth: 28, height: barH, borderRadius: 3, background: barColor, minWidth: 6, transition: "height 0.4s ease" }} />
                            <div style={{ fontSize: 7, color: t.textMut, marginTop: 3, textAlign: "center", lineHeight: 1.2 }}>{new Date(pt.scheduled_date.slice(0, 10) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Legend: site colors */}
                    {(() => {
                      const uniqueSites = [...new Set(scoreTrend.map(p => p.site_name))];
                      if (uniqueSites.length <= 1) return null;
                      return (
                        <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 8, borderTop: "1px solid " + t.border }}>
                          {uniqueSites.map(sn => (
                            <div key={sn} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: t.textSec }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: GO }} />
                              {sn}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </Crd>
                </div>
              )}

              {/* SERVICE CATEGORY BREAKDOWN */}
              {catBreakdown.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 12 }}>Score by Service Category</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {catBreakdown.map(cat => {
                      const pct = Number(cat.avg_score_pct);
                      const catColor = CIMS_C[cat.cims_category] || BL;
                      return (
                        <Crd key={cat.cims_category} t={t} style={{ flex: "1 1 160px", minWidth: 140 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", padding: "2px 6px", borderRadius: 3, background: catColor + "18", color: catColor }}>{cimsLabels[cat.cims_category] || cat.cims_category}</span>
                            <span style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 600, color: pct >= 80 ? GR : pct >= 60 ? OR : RD }}>{pct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: t.cardAlt, overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, background: catColor, width: pct + "%" }} />
                          </div>
                          <div style={{ fontSize: 10, color: t.textMut, marginTop: 6 }}>{cat.total_items} items scored, {cat.total_score}/{cat.total_max} pts</div>
                        </Crd>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LOWEST SCORING ITEMS */}
              {lowestItems.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 12 }}>Lowest Scoring Items</div>
                  <Crd t={t} style={{ padding: 0, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: t.cardAlt }}>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Item</th>
                          <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Zone</th>
                          <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Category</th>
                          <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 10, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Avg Score</th>
                          <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 10, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Times Scored</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowestItems.map((li, i) => {
                          const lPct = Number(li.avg_score_pct);
                          const lColor = lPct >= 80 ? GR : lPct >= 60 ? OR : RD;
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid " + t.border }}>
                              <td style={{ padding: "10px 12px", fontWeight: 600, color: t.text }}>{li.label}</td>
                              <td style={{ padding: "10px 8px", color: t.textSec }}>{li.zone}</td>
                              <td style={{ padding: "10px 8px" }}>
                                <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: (CIMS_C[li.cims_category] || BL) + "18", color: CIMS_C[li.cims_category] || BL }}>{cimsLabels[li.cims_category] || li.cims_category}</span>
                              </td>
                              <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 600, color: lColor }}>{lPct}%</td>
                              <td style={{ padding: "10px 8px", textAlign: "center", color: t.textMut }}>{li.occurrences}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Crd>
                </div>
              )}

              {/* Print Report */}
              {siteComp.length > 0 && (
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => {
                    const siteRows = siteComp.map(sc => `<tr><td style="padding:8px 12px;font-size:13px;font-weight:600">${sc.site_name}</td><td style="padding:8px;text-align:center;font-weight:700;color:${Number(sc.latest_score_pct) >= 80 ? '#2ECC71' : Number(sc.latest_score_pct) >= 60 ? '#F39C12' : '#E74C3C'}">${sc.latest_score_pct}%</td><td style="padding:8px;text-align:center">${sc.avg_score_pct}%</td><td style="padding:8px;text-align:center">${sc.inspection_count}</td><td style="padding:8px;font-size:12px;color:#666">${fmtDate(sc.latest_date)}</td></tr>`).join("");
                    const catRows = catBreakdown.map(c => `<tr><td style="padding:8px 12px;font-size:13px;font-weight:600">${cimsLabels[c.cims_category] || c.cims_category}</td><td style="padding:8px;text-align:center;font-weight:700">${c.avg_score_pct}%</td><td style="padding:8px;text-align:center">${c.total_items}</td><td style="padding:8px;text-align:center">${c.total_score}/${c.total_max}</td></tr>`).join("");
                    const lowRows = lowestItems.slice(0, 10).map(l => `<tr><td style="padding:8px 12px;font-size:13px;font-weight:600">${l.label}</td><td style="padding:8px">${l.zone}</td><td style="padding:8px">${cimsLabels[l.cims_category] || l.cims_category}</td><td style="padding:8px;text-align:center;font-weight:700;color:${Number(l.avg_score_pct) >= 80 ? '#2ECC71' : Number(l.avg_score_pct) >= 60 ? '#F39C12' : '#E74C3C'}">${l.avg_score_pct}%</td><td style="padding:8px;text-align:center">${l.occurrences}</td></tr>`).join("");
                    const html = `<!DOCTYPE html><html><head><title>Inspection Analytics Report</title><style>body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;margin:0;padding:32px}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:${NAVY_DARK};color:#fff;padding:10px 8px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:1px}tr{border-bottom:1px solid #eee}@media print{body{padding:16px}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:20px;border-bottom:3px solid ${GOLD}"><div><div style="font-size:22px;font-weight:700;color:${NAVY_DARK}">Inspection Analytics Report</div><div style="font-size:14px;color:#555;margin-top:4px">Last ${analyticsRange.start} to ${analyticsRange.end}${analyticsSite ? "" : " (All Sites)"}</div></div><div style="text-align:right"><div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">${clientConfig.company.name}</div><div style="font-size:12px;color:#666;margin-top:2px">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div></div></div><h3 style="font-size:15px;color:${NAVY_DARK};margin:0 0 12px">Site Performance</h3><table><thead><tr><th>Site</th><th style="text-align:center">Latest Score</th><th style="text-align:center">Average</th><th style="text-align:center">Inspections</th><th>Latest Date</th></tr></thead><tbody>${siteRows}</tbody></table><h3 style="font-size:15px;color:${NAVY_DARK};margin:0 0 12px">Category Breakdown</h3><table><thead><tr><th>Category</th><th style="text-align:center">Avg Score</th><th style="text-align:center">Items Scored</th><th style="text-align:center">Points</th></tr></thead><tbody>${catRows}</tbody></table>${lowRows ? `<h3 style="font-size:15px;color:${NAVY_DARK};margin:0 0 12px">Areas Needing Improvement</h3><table><thead><tr><th>Item</th><th>Zone</th><th>Category</th><th style="text-align:center">Avg Score</th><th style="text-align:center">Occurrences</th></tr></thead><tbody>${lowRows}</tbody></table>` : ""}<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#aaa;text-align:center">Generated by ${clientConfig.company.shortName} Operations Platform</div></body></html>`;
                    const w = window.open("", "_blank");
                    w.document.write(html); w.document.close();
                    setTimeout(() => w.print(), 600);
                  }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: 8, border: "none", background: GO, color: NAVY, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><DlI sz={13} c={NAVY} /> Print Report</button>
                </div>
              )}

              {scoreTrend.length === 0 && siteComp.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>
                  No completed inspections in the selected date range. Complete some inspections to see analytics here.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* NEW TEMPLATE MODAL */}
      {newTplModal && <Mdl t={t} onClose={() => setNewTplModal(false)}><div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>New Inspection Template</div><button onClick={() => setNewTplModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
        <div style={{ marginBottom: 14 }}><Lbl>Template Name *</Lbl><Inp t={t} value={newTplForm.name} onChange={e => setNewTplForm({ ...newTplForm, name: e.target.value })} placeholder="e.g. Standard Office Cleaning" /></div>
        <div style={{ marginBottom: 20 }}><Lbl>Description</Lbl><TArea t={t} rows={3} value={newTplForm.description} onChange={e => setNewTplForm({ ...newTplForm, description: e.target.value })} placeholder="Optional: describe what this template covers" /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setNewTplModal(false)}>Cancel</Btn><Btn t={t} onClick={createTemplate}>Create Template</Btn></div>
      </div></Mdl>}

      {/* SCHEDULE MODAL */}
      {editInspModal && <Mdl t={t} onClose={() => setEditInspModal(null)}><div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Edit Scheduled Inspection</div><button onClick={() => setEditInspModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
        <div style={{ marginBottom: 14 }}><Lbl>Template *</Lbl><Sel t={t} value={editInspForm.template_id} onChange={e => setEditInspForm({ ...editInspForm, template_id: e.target.value })} options={[{ v: "", l: "Select template..." }, ...templates.map(tp => ({ v: tp.id, l: tp.name }))]} /></div>
        <div style={{ marginBottom: 14 }}><Lbl>Site *</Lbl><Sel t={t} value={editInspForm.site_id} onChange={e => setEditInspForm({ ...editInspForm, site_id: e.target.value })} options={[{ v: "", l: "Select site..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
        <div style={{ marginBottom: 14 }}><Lbl>Assigned Supervisor</Lbl><Sel t={t} value={editInspForm.assigned_to} onChange={e => setEditInspForm({ ...editInspForm, assigned_to: e.target.value })} options={[{ v: "", l: "Unassigned" }, ...supervisors.map(s => ({ v: s.id, l: (s.firstName || s.first_name) + " " + (s.lastName || s.last_name) }))]} /></div>
        <div style={{ marginBottom: 20 }}><Lbl>Scheduled Date *</Lbl><Inp t={t} type="date" value={editInspForm.scheduled_date} onChange={e => setEditInspForm({ ...editInspForm, scheduled_date: e.target.value })} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <Btn t={t} v="danger" onClick={() => cancelInspection(editInspModal.id)} style={{ fontSize: 11, padding: "8px 14px" }}>Cancel Inspection</Btn>
          <div style={{ display: "flex", gap: 10 }}><Btn t={t} v="ghost" onClick={() => setEditInspModal(null)}>Close</Btn><Btn t={t} onClick={submitEditInspection}>Save</Btn></div>
        </div>
      </div></Mdl>}
      {scheduleModal && <Mdl t={t} onClose={() => setScheduleModal(false)}><div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Schedule Inspection</div><button onClick={() => setScheduleModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button></div>
        <div style={{ marginBottom: 14 }}><Lbl>Template *</Lbl><Sel t={t} value={scheduleForm.template_id} onChange={e => setScheduleForm({ ...scheduleForm, template_id: e.target.value })} options={[{ v: "", l: "Select template..." }, ...templates.map(tp => ({ v: tp.id, l: tp.name }))]} /></div>
        <div style={{ marginBottom: 14 }}><Lbl>Site *</Lbl><Sel t={t} value={scheduleForm.site_id} onChange={e => setScheduleForm({ ...scheduleForm, site_id: e.target.value })} options={[{ v: "", l: "Select site..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
        <div style={{ marginBottom: 14 }}><Lbl>Assigned Supervisor</Lbl><Sel t={t} value={scheduleForm.assigned_to} onChange={e => setScheduleForm({ ...scheduleForm, assigned_to: e.target.value })} options={[{ v: "", l: "Unassigned" }, ...supervisors.map(s => ({ v: s.id, l: (s.firstName || s.first_name) + " " + (s.lastName || s.last_name) }))]} /></div>
        <div style={{ marginBottom: 20 }}><Lbl>Scheduled Date *</Lbl><Inp t={t} type="date" value={scheduleForm.scheduled_date} onChange={e => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setScheduleModal(false)}>Cancel</Btn><Btn t={t} onClick={scheduleInspection}>Schedule</Btn></div>
      </div></Mdl>}
    </div>
  );
}

function CompanySettingsPanel({ af, uf, showToast, t }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInput = useRef(null);

  const load = async () => {
    setLoading(true);
    try { const d = await af("/api/settings"); setForm(d); }
    catch (e) { showToast(e.message, "error"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const body = {
        legal_name: form.legal_name || null,
        display_name: form.display_name || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        ein: form.ein || null,
        show_ein_on_reports: !!form.show_ein_on_reports,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color || NAVY,
        secondary_color: form.secondary_color || GOLD,
        timezone: form.timezone || "America/New_York",
        pay_period_start_day: form.pay_period_start_day || "Saturday",
      };
      const updated = await af("/api/settings", { method: "PATCH", body });
      setForm(updated);
      showToast("Company settings saved");
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const onLogoPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (logoInput.current) logoInput.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("Logo must be an image file", "error"); return; }
    if (file.size > 10 * 1024 * 1024) { showToast("Logo must be under 10MB", "error"); return; }
    setLogoUploading(true);
    try {
      const r = await uf(file, "profile-photos");
      set("logo_url", r.url);
      showToast("Logo uploaded. Click Save to keep it.");
    } catch (err) { showToast(err.message, "error"); }
    setLogoUploading(false);
  };

  if (loading || !form) return <div style={{ textAlign: "center", padding: 40, color: t.textMut }}>Loading company settings...</div>;

  const inp = { padding: "8px 10px", borderRadius: 6, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: FONT_BODY, width: "100%", boxSizing: "border-box" };
  const lbl = { fontSize: 11, fontWeight: 600, color: t.textSec, marginBottom: 4, display: "block" };
  const sec = { fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 14 };
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const ZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"];

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <Crd t={t} style={{ flex: 1, minWidth: 320, padding: 18 }}>
        <div style={sec}>Company Identity</div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Display name</label>
          <input style={inp} value={form.display_name || ""} onChange={e => set("display_name", e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Legal name</label>
          <input style={inp} value={form.legal_name || ""} onChange={e => set("legal_name", e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Address</label>
          <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.address || ""} onChange={e => set("address", e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, marginBottom: 14 }}>
            <label style={lbl}>Phone</label>
            <input style={inp} value={form.phone || ""} onChange={e => set("phone", e.target.value)} />
          </div>
          <div style={{ flex: 1, marginBottom: 14 }}>
            <label style={lbl}>Email</label>
            <input style={inp} value={form.email || ""} onChange={e => set("email", e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Website</label>
          <input style={inp} value={form.website || ""} onChange={e => set("website", e.target.value)} />
        </div>
      </Crd>

      <Crd t={t} style={{ flex: 1, minWidth: 320, padding: 18 }}>
        <div style={sec}>Branding</div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Logo</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 84, height: 84, borderRadius: 8, border: "1px solid " + t.border, background: t.inputBg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {form.logo_url ? <img src={form.logo_url} alt="logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 10, color: t.textMut }}>No logo</span>}
            </div>
            <div>
              <input ref={logoInput} type="file" accept="image/*" onChange={onLogoPick} style={{ display: "none" }} />
              <button onClick={() => logoInput.current && logoInput.current.click()} disabled={logoUploading} style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid " + GO, background: GO, color: NAVY, fontSize: 12, fontWeight: 600, cursor: logoUploading ? "default" : "pointer", opacity: logoUploading ? 0.6 : 1 }}>{logoUploading ? "Uploading..." : "Upload Logo"}</button>
              {form.logo_url && <button onClick={() => set("logo_url", null)} style={{ marginLeft: 8, padding: "7px 12px", borderRadius: 6, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 12, cursor: "pointer" }}>Remove</button>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, marginBottom: 14 }}>
            <label style={lbl}>Primary color</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="color" value={form.primary_color || NAVY} onChange={e => set("primary_color", e.target.value)} style={{ width: 36, height: 34, padding: 0, border: "1px solid " + t.inputBorder, borderRadius: 6, background: t.inputBg, cursor: "pointer" }} />
              <input style={inp} value={form.primary_color || ""} onChange={e => set("primary_color", e.target.value)} />
            </div>
          </div>
          <div style={{ flex: 1, marginBottom: 14 }}>
            <label style={lbl}>Secondary color</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="color" value={form.secondary_color || GOLD} onChange={e => set("secondary_color", e.target.value)} style={{ width: 36, height: 34, padding: 0, border: "1px solid " + t.inputBorder, borderRadius: 6, background: t.inputBg, cursor: "pointer" }} />
              <input style={inp} value={form.secondary_color || ""} onChange={e => set("secondary_color", e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ ...sec, marginTop: 4 }}>Defaults</div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Timezone</label>
          <select style={inp} value={form.timezone || "America/New_York"} onChange={e => set("timezone", e.target.value)}>{ZONES.map(z => <option key={z} value={z}>{z}</option>)}</select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Pay period start day</label>
          <select style={inp} value={form.pay_period_start_day || "Saturday"} onChange={e => set("pay_period_start_day", e.target.value)}>{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select>
        </div>

        <div style={{ ...sec, marginTop: 4 }}>Reports</div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>EIN / Tax ID</label>
          <input style={inp} value={form.ein || ""} onChange={e => set("ein", e.target.value)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <button onClick={() => set("show_ein_on_reports", !form.show_ein_on_reports)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: form.show_ein_on_reports ? GR : t.btnGhost, position: "relative", cursor: "pointer", flexShrink: 0, padding: 0 }}>
            <span style={{ position: "absolute", top: 2, left: form.show_ein_on_reports ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
          </button>
          <span style={{ fontSize: 12, color: t.textSec }}>Show EIN on report exports by default</span>
        </div>
      </Crd>

      <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={load} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid " + t.border, background: "transparent", color: t.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Reset</button>
        <button onClick={save} disabled={saving} style={{ fontFamily: FONT_HEAD, padding: "9px 22px", borderRadius: 8, border: "none", background: GO, color: NAVY, fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save Company Settings"}</button>
      </div>
    </div>
  );
}

const ACCESS_TIERS = [
  { key: "a", label: "Admin" },
  { key: "s", label: "Supervisor" },
  { key: "st", label: "Staff" },
];

const PERMISSION_GROUPS = [
  { group: "Administration", rows: [
    { cap: "Company settings and branding", a: "Manage", s: "None", st: "None" },
    { cap: "Dropdown and site lookups", a: "Manage", s: "None", st: "None" },
    { cap: "Roles and permissions reference", a: "View", s: "None", st: "None" },
    { cap: "Staff accounts, approvals, PIN resets", a: "Manage", s: "None", st: "None" },
    { cap: "Site records and floor plans", a: "Manage", s: "View", st: "Assigned" },
    { cap: "Integrations and forms", a: "Manage", s: "None", st: "None" },
  ]},
  { group: "Operations", rows: [
    { cap: "Tasks: create, assign, reassign", a: "Manage", s: "Assigned sites", st: "Own tasks" },
    { cap: "Issues: report and track", a: "Manage", s: "Manage", st: "Report" },
    { cap: "Issue to task assignment", a: "Manage", s: "Manage", st: "None" },
    { cap: "Inspections: templates and scheduling", a: "Manage", s: "Manage", st: "Complete assigned" },
    { cap: "Clock in and out", a: "All staff", s: "All staff", st: "Self" },
    { cap: "Manual time entry and shift edits", a: "Manage", s: "None", st: "None" },
    { cap: "Schedule and shift pickups", a: "Manage", s: "Manage", st: "Request" },
  ]},
  { group: "Supplies and vendors", rows: [
    { cap: "Inventory usage and requests", a: "Manage", s: "Manage", st: "Log and request" },
    { cap: "Supply catalog: create, edit, delete", a: "Manage", s: "None", st: "None" },
    { cap: "Vendors: view", a: "View", s: "View", st: "View" },
    { cap: "Vendors: evaluate and export", a: "Manage", s: "Manage", st: "None" },
    { cap: "Vendors: create, edit, delete, link", a: "Manage", s: "None", st: "None" },
    { cap: "Services: view", a: "View", s: "View", st: "View" },
    { cap: "Services: create, edit, delete, link", a: "Manage", s: "None", st: "None" },
  ]},
  { group: "Reporting", rows: [
    { cap: "Reports and report builder", a: "Manage", s: "Manage", st: "None" },
    { cap: "Labor reports", a: "Manage", s: "Manage", st: "None" },
    { cap: "Timesheets", a: "Manage", s: "Manage", st: "None" },
    { cap: "ADP payroll export", a: "Manage", s: "None", st: "None" },
    { cap: "Activity log", a: "View", s: "View", st: "None" },
  ]},
  { group: "Communication", rows: [
    { cap: "Messages", a: "All staff", s: "All staff", st: "All staff" },
    { cap: "Direct message inbox overview", a: "View", s: "View", st: "None" },
  ]},
];

const PERMISSION_NOTES = [
  "Supervisors are scoped to their assigned sites for site-level actions.",
  "Some delete actions within Inspections and Sites are reserved to Admin.",
  "Staff covers custodial and porter roles, and client contacts, who use the staff portal. This shows their access to platform data.",
  "This view reflects the access model in effect today. It is a reference, not an editor.",
];

function PermissionsMatrixPanel({ t }) {
  const lvl = (label) => label === "Manage" ? "full" : (label === "None" ? "none" : "partial");
  const cellColor = (label) => { const l = lvl(label); return l === "full" ? GR : l === "none" ? t.textMut : GO; };
  const cellBg = (label) => { const l = lvl(label); return l === "full" ? GR + "1f" : l === "none" ? "transparent" : GO + "1a"; };

  const printMatrix = () => {
    const navy = NAVY, gold = GOLD, cName = clientConfig.company.name;
    const gen = new Date().toLocaleString();
    const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let body = "";
    PERMISSION_GROUPS.forEach(g => {
      body += '<h2>' + esc(g.group) + '</h2><table><thead><tr><th>Capability</th><th>Admin</th><th>Supervisor</th><th>Staff</th></tr></thead><tbody>';
      g.rows.forEach(r => { body += '<tr><td>' + esc(r.cap) + '</td><td>' + esc(r.a) + '</td><td>' + esc(r.s) + '</td><td>' + esc(r.st) + '</td></tr>'; });
      body += '</tbody></table>';
    });
    let notes = '<ul class="notes">';
    PERMISSION_NOTES.forEach(n => { notes += '<li>' + esc(n) + '</li>'; });
    notes += '</ul>';
    const style = '<style>body{font-family:Arial,Helvetica,sans-serif;margin:28px;color:#222}.brand{display:flex;align-items:center;gap:12px;border-bottom:3px solid ' + gold + ';padding-bottom:10px;margin-bottom:14px}.co{font-size:20px;font-weight:700;color:' + navy + '}h1{color:' + navy + ';font-size:20px;margin:10px 0 4px}h2{color:' + navy + ';font-size:14px;margin:18px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}.meta{font-size:11px;color:#666;margin:2px 0}table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #ddd;padding:5px 8px;font-size:11px;text-align:left}th{background:' + navy + ';color:' + gold + '}.notes{font-size:10px;color:#555;margin-top:16px}.footer{margin-top:24px;border-top:2px solid ' + gold + ';padding-top:8px;font-size:10px;color:#888}@media print{body{margin:14px}}</style>';
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Roles and Permissions</title>' + style + '</head><body>'
      + '<div class="brand"><div class="co">' + esc(cName) + '</div></div>'
      + '<h1>Roles and Permissions</h1>'
      + '<p class="meta">Access reference, generated ' + esc(gen) + '</p>'
      + body + notes
      + '<div class="footer">' + esc(cName) + ' &middot; Access reference</div>'
      + '</body></html>';
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const headCell = { fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 600, color: t.textSec, textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 6px 8px" };
  const capCell = { fontSize: 12.5, color: t.text, padding: "8px 6px", borderTop: "1px solid " + t.border };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12.5, color: t.textSec, maxWidth: 620, lineHeight: 1.5 }}>
          Access each role has in the platform today, by area. Manage means full access, including create, edit, and delete. View means read access. Other labels describe a scoped or limited form of access. This is a reference and does not change access.
        </div>
        <button onClick={printMatrix} style={{ fontFamily: FONT_HEAD, padding: "8px 16px", borderRadius: 8, border: "1px solid " + GO, background: GO + "18", color: t.goldText, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Export PDF</button>
      </div>

      {PERMISSION_GROUPS.map((g, gi) => (
        <Crd key={gi} t={t} style={{ marginBottom: 14, padding: 16 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.goldText, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{g.group}</div>
          <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr" }}>
            <div style={headCell}>Capability</div>
            {ACCESS_TIERS.map(tier => <div key={tier.key} style={{ ...headCell, textAlign: "center" }}>{tier.label}</div>)}
            {g.rows.flatMap((r, ri) => [
              <div key={"cap-" + ri} style={capCell}>{r.cap}</div>,
              ...ACCESS_TIERS.map(tier => (
                <div key={"c-" + ri + "-" + tier.key} style={{ ...capCell, textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 11, fontSize: 11, fontWeight: 600, color: cellColor(r[tier.key]), background: cellBg(r[tier.key]) }}>{r[tier.key]}</span>
                </div>
              )),
            ])}
          </div>
        </Crd>
      ))}

      <Crd t={t} style={{ padding: 16 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 8 }}>Notes</div>
        {PERMISSION_NOTES.map((n, i) => (
          <div key={i} style={{ fontSize: 11.5, color: t.textMut, marginBottom: 5, paddingLeft: 12, position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: t.goldText }}>-</span>{n}
          </div>
        ))}
      </Crd>
    </div>
  );
}

function PermissionsEditorPanel({ af, uf, showToast, t }) {
  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selId, setSelId] = useState("");
  const [detail, setDetail] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingStaff(true);
    af("/api/users")
      .then((d) => {
        const list = Array.isArray(d) ? d : (d && Array.isArray(d.users) ? d.users : []);
        setStaff(list);
        setLoadingStaff(false);
      })
      .catch((e) => { setLoadingStaff(false); showToast("Could not load team: " + e.message, "error"); });
  }, []);

  const loadDetail = (id) => {
    if (!id) { setDetail(null); setOverrides({}); return; }
    setLoadingDetail(true);
    af("/api/users/" + id + "/permissions")
      .then((d) => {
        setDetail(d);
        setOverrides(d && d.overrides && typeof d.overrides === "object" ? Object.assign({}, d.overrides) : {});
        setLoadingDetail(false);
      })
      .catch((e) => { setLoadingDetail(false); showToast("Could not load permissions: " + e.message, "error"); });
  };

  const onSelect = (id) => { setSelId(id); loadDetail(id); };

  const caps = (detail && Array.isArray(detail.capabilities)) ? detail.capabilities : [];
  const role = detail && detail.role;
  const isAdminTarget = role === "admin";
  const tierOf = (r) => (r === "admin" ? "admin" : r === "supervisor" ? "supervisor" : "staff");
  const roleDefault = (c) => !!(c.defaults && c.defaults[tierOf(role)]);

  const effOf = (c) => {
    if (isAdminTarget && c.key === "manage_permissions") return true;
    if (Object.prototype.hasOwnProperty.call(overrides, c.key)) return !!overrides[c.key];
    return roleDefault(c);
  };
  const stateOf = (c) => {
    if (isAdminTarget && c.key === "manage_permissions") return "locked";
    if (Object.prototype.hasOwnProperty.call(overrides, c.key)) return overrides[c.key] ? "allow" : "deny";
    return "default";
  };

  const setDefault = (key) => { const n = Object.assign({}, overrides); delete n[key]; setOverrides(n); };
  const setAllow = (key) => setOverrides(Object.assign({}, overrides, { [key]: true }));
  const setDeny = (key) => setOverrides(Object.assign({}, overrides, { [key]: false }));

  const dirty = detail && JSON.stringify(overrides) !== JSON.stringify(detail.overrides || {});

  const save = () => {
    if (!selId) return;
    setSaving(true);
    af("/api/users/" + selId + "/permissions", { method: "PUT", body: { permissions: overrides } })
      .then((d) => {
        setDetail((prev) => prev ? Object.assign({}, prev, { overrides: (d && d.overrides) || {}, effective: (d && d.effective) || prev.effective }) : prev);
        setOverrides((d && d.overrides) ? Object.assign({}, d.overrides) : {});
        setSaving(false);
        showToast("Permissions saved", "success");
      })
      .catch((e) => { setSaving(false); showToast("Could not save: " + e.message, "error"); });
  };

  const groups = [];
  caps.forEach((c) => {
    let g = groups.find((x) => x.name === c.group);
    if (!g) { g = { name: c.group, items: [] }; groups.push(g); }
    g.items.push(c);
  });

  const card = { background: t.card, border: "1px solid " + t.borderSolid, borderRadius: 10, padding: 18, marginBottom: 16 };
  const selSt = { padding: "8px 12px", borderRadius: 8, border: "1px solid " + t.borderSolid, background: t.card, color: t.text, fontSize: 13, fontFamily: FONT_BODY, cursor: "pointer", minWidth: 260 };
  const segBtn = (active, color) => ({ padding: "5px 10px", borderRadius: 6, border: "1px solid " + (active ? color : t.borderSolid), background: active ? color : "transparent", color: active ? "#fff" : t.textMut, fontSize: 11, fontFamily: FONT_BODY, cursor: "pointer", fontWeight: active ? 700 : 500 });
  const tag = (txt, color) => (<span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: color, border: "1px solid " + color, borderRadius: 4, padding: "1px 5px", marginLeft: 8 }}>{txt}</span>);

  return (
    <div>
      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 4 }}>Per-person permissions</div>
        <div style={{ fontSize: 12, color: t.textMut, marginBottom: 14 }}>Pick a team member, then set each capability to Default, Allow, or Deny. Default follows the person role. An admin can grant the manage permissions capability to let someone else open this screen.</div>
        {loadingStaff ? (
          <div style={{ fontSize: 12, color: t.textMut, padding: "8px 0" }}>Loading team...</div>
        ) : (
          <select value={selId} onChange={(e) => onSelect(e.target.value)} style={selSt}>
            <option value="">Select a team member...</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>{((((u.first_name || u.firstName || "") + " " + (u.last_name || u.lastName || "")).trim() || u.name || u.full_name || u.fullName || u.email || ("User " + u.id)) + (u.role ? "  (" + u.role + ")" : ""))}</option>
            ))}
          </select>
        )}
      </div>

      {loadingDetail ? (
        <div style={{ fontSize: 12, color: t.textMut, padding: "8px 2px" }}>Loading permissions...</div>
      ) : detail ? (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{detail.name}</div>
              <div style={{ fontSize: 11, color: t.textMut }}>Role: {role}. Default follows this role until you override it.</div>
            </div>
            <button onClick={save} disabled={!dirty || saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: (dirty && !saving) ? GO : t.borderSolid, color: (dirty && !saving) ? "#0A1628" : t.textMut, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, cursor: (dirty && !saving) ? "pointer" : "default" }}>{saving ? "Saving..." : "Save changes"}</button>
          </div>

          {groups.map((g) => (
            <div key={g.name} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: t.textMut, marginBottom: 6 }}>{g.name}</div>
              {g.items.map((c) => {
                const st = stateOf(c);
                const eff = effOf(c);
                const locked = st === "locked";
                return (
                  <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + t.borderSolid, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ flex: "1 1 240px" }}>
                      <span style={{ fontSize: 13, color: t.text }}>{c.label}</span>
                      {c.enforced ? tag("Enforced", GR) : tag("Rolling out", OR)}
                      <div style={{ fontSize: 10, color: t.textMut, marginTop: 2 }}>Currently: {eff ? "Allowed" : "Blocked"}{st === "default" ? " (role default)" : st === "locked" ? " (admins always allowed)" : " (override)"}</div>
                    </div>
                    {locked ? (
                      <div style={{ fontSize: 11, color: t.textMut, fontStyle: "italic" }}>Locked on</div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setDefault(c.key)} style={segBtn(st === "default", BL)}>Default</button>
                        <button onClick={() => setAllow(c.key)} style={segBtn(st === "allow", GR)}>Allow</button>
                        <button onClick={() => setDeny(c.key)} style={segBtn(st === "deny", RD)}>Deny</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ fontSize: 10, color: t.textMut, marginTop: 8 }}>Enforced capabilities take effect immediately. Rolling out capabilities are saved against the person now and begin enforcing as each area is wired.</div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: t.textMut, padding: "8px 2px" }}>No team member selected.</div>
      )}
    </div>
  );
}

function SettingsPage({ af, showToast, t, sites, uf, allStaff = [], isAdmin = false }) {
  const [cats, setCats] = useState([]);
  const [selCat, setSelCat] = useState(null);
  // Every tab here is an admin tab but one: the manage permissions capability opens Roles and
  // Permissions and nothing else, so that is the tab it draws and the tab it starts on.
  const TABS = [
    { id: "company", label: "Company", adminOnly: true },
    { id: "global", label: "Dropdown Options", adminOnly: true },
    { id: "site", label: "Site Lookups", adminOnly: true },
    { id: "permissions", label: "Roles and Permissions", adminOnly: false },
    { id: "recipients", label: "Who gets told", adminOnly: true, style: { fontFamily: FONT_BODY } },
  ];
  const tabs = TABS.filter(x => isAdmin || !x.adminOnly);
  const [tab, setTab] = useState(isAdmin ? "company" : "permissions");
  // The Roles and Permissions tab holds two views: what one person can do, and what each role can do.
  const [permView, setPermView] = useState("editor");
  const [addCatForm, setAddCatForm] = useState(null);
  const [editCatForm, setEditCatForm] = useState(null);
  const [addValForm, setAddValForm] = useState(null);
  const [editValForm, setEditValForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selSite, setSelSite] = useState("");
  const [siteLookups, setSiteLookups] = useState({ zones: [], buildings: [], floors: [] });
  const [siteTab, setSiteTab] = useState("zone");
  const [addSiteVal, setAddSiteVal] = useState(null);
  const [editSiteVal, setEditSiteVal] = useState(null);

  const load = async () => { if (!isAdmin) { setLoading(false); return; } try { const d = await af("/api/lookups/all"); setCats(d); if (!selCat && d.length > 0) setSelCat(d[0].id); } catch (e) { showToast(e.message, "error"); } setLoading(false); };
  useEffect(() => { load(); }, []);

  const loadSiteLookups = async (sId) => { if (!sId) return; try { const d = await af("/api/lookups/site/" + sId + "/all"); setSiteLookups(d); } catch (e) { showToast(e.message, "error"); } };
  useEffect(() => { if (tab === "site" && selSite) loadSiteLookups(selSite); }, [tab, selSite]);

  const activeCat = cats.find(c => c.id === selCat);

  // Category CRUD
  const submitAddCat = async () => {
    if (!addCatForm.label || !addCatForm.slug) { showToast("Label and slug required", "error"); return; }
    try { await af("/api/lookups/categories", { method: "POST", body: addCatForm }); showToast("Category created"); setAddCatForm(null); load(); } catch (e) { showToast(e.message, "error"); }
  };
  const submitEditCat = async () => {
    try { await af("/api/lookups/categories/" + editCatForm.id, { method: "PATCH", body: { label: editCatForm.label, description: editCatForm.description } }); showToast("Category updated"); setEditCatForm(null); load(); } catch (e) { showToast(e.message, "error"); }
  };
  const deleteCat = async (id) => {
    if (!window.confirm("Delete this category and all its values?")) return;
    try { await af("/api/lookups/categories/" + id, { method: "DELETE" }); showToast("Category deleted"); if (selCat === id) setSelCat(cats.find(c => c.id !== id)?.id || null); load(); } catch (e) { showToast(e.message, "error"); }
  };
  const toggleCatActive = async (cat) => {
    try { await af("/api/lookups/categories/" + cat.id, { method: "PATCH", body: { is_active: !cat.is_active } }); showToast(cat.is_active ? "Category deactivated" : "Category activated"); load(); } catch (e) { showToast(e.message, "error"); }
  };

  // Value CRUD
  const submitAddVal = async () => {
    if (!addValForm.value || !addValForm.label) { showToast("Value and label required", "error"); return; }
    try { await af("/api/lookups/values", { method: "POST", body: { ...addValForm, category_id: selCat } }); showToast("Value added"); setAddValForm(null); load(); } catch (e) { showToast(e.message, "error"); }
  };
  const submitEditVal = async () => {
    try { await af("/api/lookups/values/" + editValForm.id, { method: "PATCH", body: { label: editValForm.label, value: editValForm.value, color: editValForm.color, show_other_input: editValForm.show_other_input } }); showToast("Value updated"); setEditValForm(null); load(); } catch (e) { showToast(e.message, "error"); }
  };
  const deleteVal = async (id) => {
    if (!window.confirm("Delete this value?")) return;
    try { await af("/api/lookups/values/" + id, { method: "DELETE" }); showToast("Value deleted"); load(); } catch (e) { showToast(e.message, "error"); }
  };
  const toggleValActive = async (val) => {
    try { await af("/api/lookups/values/" + val.id, { method: "PATCH", body: { is_active: !val.is_active } }); load(); } catch (e) { showToast(e.message, "error"); }
  };
  const moveVal = async (val, dir) => {
    const vals = activeCat.values.slice().sort((a, b) => a.sort_order - b.sort_order);
    const idx = vals.findIndex(v => v.id === val.id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === vals.length - 1)) return;
    const swapWith = vals[idx + dir];
    try {
      await af("/api/lookups/reorder", { method: "PATCH", body: { items: [{ id: val.id, sort_order: swapWith.sort_order }, { id: swapWith.id, sort_order: val.sort_order }] } });
      load();
    } catch (e) { showToast(e.message, "error"); }
  };

  // Site lookup CRUD
  const submitAddSiteVal = async () => {
    if (!addSiteVal.value || !addSiteVal.label) { showToast("Value and label required", "error"); return; }
    try { await af("/api/lookups/site/" + selSite, { method: "POST", body: addSiteVal }); showToast("Added"); setAddSiteVal(null); loadSiteLookups(selSite); } catch (e) { showToast(e.message, "error"); }
  };
  const submitEditSiteVal = async () => {
    try { await af("/api/lookups/site/" + selSite + "/" + editSiteVal.id, { method: "PATCH", body: { label: editSiteVal.label, value: editSiteVal.value, lookup_type: editSiteVal.lookup_type } }); showToast("Updated"); setEditSiteVal(null); loadSiteLookups(selSite); } catch (e) { showToast(e.message, "error"); }
  };
  const deleteSiteVal = async (id) => {
    if (!window.confirm("Delete this value?")) return;
    try { await af("/api/lookups/site/" + selSite + "/" + id, { method: "DELETE" }); showToast("Deleted"); loadSiteLookups(selSite); } catch (e) { showToast(e.message, "error"); }
  };
  const toggleSiteValActive = async (val) => {
    try { await af("/api/lookups/site/" + selSite + "/" + val.id, { method: "PATCH", body: { is_active: !val.is_active } }); loadSiteLookups(selSite); } catch (e) { showToast(e.message, "error"); }
  };
  const moveSiteVal = async (val, dir, list) => {
    const sorted = list.slice().sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(v => v.id === val.id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === sorted.length - 1)) return;
    const swapWith = sorted[idx + dir];
    try {
      await af("/api/lookups/site/" + selSite + "/reorder", { method: "PATCH", body: { items: [{ id: val.id, sort_order: swapWith.sort_order }, { id: swapWith.id, sort_order: val.sort_order }] } });
      loadSiteLookups(selSite);
    } catch (e) { showToast(e.message, "error"); }
  };

  const siteTypeLabel = { zone: "Zones", building: "Buildings", floor: "Floors" };
  const currentSiteList = siteTab === "zone" ? siteLookups.zones : siteTab === "building" ? siteLookups.buildings : siteLookups.floors;

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: t.textMut }}>Loading settings...</div>;

  return (
    <div>
      <SecT t={t}>Settings</SecT>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {tabs.map(tb => <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: "6px 14px", borderRadius: 6, border: tab === tb.id ? "2px solid " + GO : "1px solid " + t.border, background: tab === tb.id ? t.goldBg : "transparent", color: tab === tb.id ? t.goldText : t.textSec, fontSize: 12, fontWeight: 600, cursor: "pointer", ...(tb.style || {}) }}>{tb.label}</button>)}
      </div>

      {tab === "company" && isAdmin && <CompanySettingsPanel af={af} uf={uf} showToast={showToast} t={t} />}

      {tab === "permissions" && <div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[{ id: "editor", label: "By person" }, { id: "matrix", label: "Role reference" }].map(pv => <button key={pv.id} onClick={() => setPermView(pv.id)} style={{ padding: "5px 12px", borderRadius: 6, border: permView === pv.id ? "1px solid " + GO : "1px solid " + t.border, background: permView === pv.id ? t.goldBg : "transparent", color: permView === pv.id ? t.goldText : t.textSec, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY }}>{pv.label}</button>)}
        </div>
        {permView === "editor" && <PermissionsEditorPanel af={af} uf={uf} showToast={showToast} t={t} />}
        {permView === "matrix" && <PermissionsMatrixPanel t={t} />}
      </div>}

      {tab === "recipients" && isAdmin && <WhoGetsToldPanel af={af} showToast={showToast} t={t} allStaff={allStaff} />}

      {tab === "global" && isAdmin && <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Category List */}
        <Crd t={t} style={{ width: 260, flexShrink: 0, padding: 0 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text }}>Categories ({cats.length})</div>
            <button onClick={() => setAddCatForm({ label: "", slug: "", description: "" })} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer", fontWeight: 600 }}>+ Add</button>
          </div>
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {cats.map(c => (
              <div key={c.id} onClick={() => setSelCat(c.id)} style={{ padding: "8px 14px", cursor: "pointer", background: selCat === c.id ? t.goldBg : "transparent", borderLeft: selCat === c.id ? "3px solid " + GO : "3px solid transparent", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: selCat === c.id ? 600 : 400, color: selCat === c.id ? t.goldText : t.text }}>{c.label}</div>
                  <div style={{ fontSize: 9, color: t.textMut, fontFamily: "monospace", marginTop: 2 }}>{c.slug} | {c.values?.length || 0} values</div>
                </div>
                {!c.is_active && <Bdg l="off" c={t.textMut} />}
              </div>
            ))}
          </div>
        </Crd>

        {/* Value Management */}
        {activeCat && <Crd t={t} style={{ flex: 1, padding: 0 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.text }}>{activeCat.label}</div>
              <div style={{ fontSize: 10, color: t.textMut, marginTop: 2 }}>{activeCat.description || "No description"}{activeCat.is_system ? " | System category" : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setEditCatForm({ id: activeCat.id, label: activeCat.label, description: activeCat.description || "" })} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 10, cursor: "pointer" }}>Edit</button>
              <button onClick={() => toggleCatActive(activeCat)} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + (activeCat.is_active ? OR : GR), background: "transparent", color: activeCat.is_active ? OR : GR, fontSize: 10, cursor: "pointer" }}>{activeCat.is_active ? "Deactivate" : "Activate"}</button>
              {!activeCat.is_system && <button onClick={() => deleteCat(activeCat.id)} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 10, cursor: "pointer" }}>Delete</button>}
              <button onClick={() => setAddValForm({ value: "", label: "", color: "", show_other_input: false })} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: GO, color: NAVY, fontSize: 10, cursor: "pointer", fontWeight: 600 }}>+ Add Value</button>
            </div>
          </div>
          <div style={{ padding: "8px 0" }}>
            {activeCat.values?.sort((a, b) => a.sort_order - b.sort_order).map((v, i) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderBottom: "1px solid " + t.border, opacity: v.is_active ? 1 : 0.5 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <button onClick={() => moveVal(v, -1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 10, color: t.textMut, lineHeight: 1 }}>&#9650;</button>
                  <button onClick={() => moveVal(v, 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 10, color: t.textMut, lineHeight: 1 }}>&#9660;</button>
                </div>
                {v.color && <div style={{ width: 14, height: 14, borderRadius: 3, background: v.color, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{v.label}</div>
                  <div style={{ fontSize: 9, color: t.textMut, fontFamily: "monospace" }}>{v.value}{v.show_other_input ? " | prompts text input" : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => toggleValActive(v)} style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid " + (v.is_active ? t.textMut : GR), background: "transparent", color: v.is_active ? t.textMut : GR, fontSize: 8, cursor: "pointer" }}>{v.is_active ? "Off" : "On"}</button>
                  <button onClick={() => setEditValForm({ id: v.id, value: v.value, label: v.label, color: v.color || "", show_other_input: v.show_other_input })} style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 8, cursor: "pointer" }}>Edit</button>
                  <button onClick={() => deleteVal(v.id)} style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 8, cursor: "pointer" }}>Del</button>
                </div>
              </div>
            ))}
            {(!activeCat.values || activeCat.values.length === 0) && <div style={{ padding: 20, textAlign: "center", color: t.textMut, fontSize: 12 }}>No values yet. Click "+ Add Value" to add one.</div>}
          </div>
        </Crd>}
      </div>}

      {tab === "site" && isAdmin && <div>
        <div style={{ marginBottom: 12 }}>
          <Sel t={t} value={selSite} onChange={e => { setSelSite(e.target.value); }} options={[{ v: "", l: "Select a site..." }, ...sites.map(s => ({ v: s.id, l: s.name }))]} />
        </div>
        {selSite && <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {["zone", "building", "floor"].map(st => (
              <button key={st} onClick={() => setSiteTab(st)} style={{ padding: "6px 14px", borderRadius: 6, border: siteTab === st ? "2px solid " + GO : "1px solid " + t.border, background: siteTab === st ? t.goldBg : "transparent", color: siteTab === st ? t.goldText : t.textSec, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{siteTypeLabel[st]} ({(st === "zone" ? siteLookups.zones : st === "building" ? siteLookups.buildings : siteLookups.floors).length})</button>
            ))}
          </div>
          <Crd t={t} style={{ padding: 0 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{siteTypeLabel[siteTab]}</div>
              <button onClick={() => setAddSiteVal({ lookup_type: siteTab, value: "", label: "" })} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid " + GO, background: GO, color: NAVY, fontSize: 10, cursor: "pointer", fontWeight: 600 }}>+ Add</button>
            </div>
            {currentSiteList.sort((a, b) => a.sort_order - b.sort_order).map(v => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderBottom: "1px solid " + t.border, opacity: v.is_active ? 1 : 0.5 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <button onClick={() => moveSiteVal(v, -1, currentSiteList)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 10, color: t.textMut, lineHeight: 1 }}>&#9650;</button>
                  <button onClick={() => moveSiteVal(v, 1, currentSiteList)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 10, color: t.textMut, lineHeight: 1 }}>&#9660;</button>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{v.label}</div>
                  <div style={{ fontSize: 9, color: t.textMut, fontFamily: "monospace" }}>{v.value}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => toggleSiteValActive(v)} style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid " + (v.is_active ? t.textMut : GR), background: "transparent", color: v.is_active ? t.textMut : GR, fontSize: 8, cursor: "pointer" }}>{v.is_active ? "Off" : "On"}</button>
                  <button onClick={() => setEditSiteVal({ id: v.id, value: v.value, label: v.label, lookup_type: v.lookup_type })} style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid " + GO, background: "transparent", color: t.goldText, fontSize: 8, cursor: "pointer" }}>Edit</button>
                  <button onClick={() => deleteSiteVal(v.id)} style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid " + RD, background: "transparent", color: RD, fontSize: 8, cursor: "pointer" }}>Del</button>
                </div>
              </div>
            ))}
            {currentSiteList.length === 0 && <div style={{ padding: 20, textAlign: "center", color: t.textMut, fontSize: 12 }}>No {siteTypeLabel[siteTab].toLowerCase()} defined for this site yet.</div>}
          </Crd>
        </div>}
      </div>}

      {/* Add Category Modal */}
      {addCatForm && <Mdl t={t} onClose={() => setAddCatForm(null)}><div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 16 }}>Add Category</div>
        <div style={{ marginBottom: 12 }}><Lbl>Label *</Lbl><Inp t={t} value={addCatForm.label} onChange={e => setAddCatForm({ ...addCatForm, label: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") })} placeholder="e.g. Equipment Types" /></div>
        <div style={{ marginBottom: 12 }}><Lbl>Slug (auto-generated)</Lbl><Inp t={t} value={addCatForm.slug} onChange={e => setAddCatForm({ ...addCatForm, slug: e.target.value })} placeholder="e.g. equipment_types" style={{ fontFamily: "monospace" }} /></div>
        <div style={{ marginBottom: 16 }}><Lbl>Description</Lbl><Inp t={t} value={addCatForm.description} onChange={e => setAddCatForm({ ...addCatForm, description: e.target.value })} placeholder="Optional description" /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAddCatForm(null)}>Cancel</Btn><Btn t={t} onClick={submitAddCat}>Create Category</Btn></div>
      </div></Mdl>}

      {/* Edit Category Modal */}
      {editCatForm && <Mdl t={t} onClose={() => setEditCatForm(null)}><div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 16 }}>Edit Category</div>
        <div style={{ marginBottom: 12 }}><Lbl>Label</Lbl><Inp t={t} value={editCatForm.label} onChange={e => setEditCatForm({ ...editCatForm, label: e.target.value })} /></div>
        <div style={{ marginBottom: 16 }}><Lbl>Description</Lbl><Inp t={t} value={editCatForm.description} onChange={e => setEditCatForm({ ...editCatForm, description: e.target.value })} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setEditCatForm(null)}>Cancel</Btn><Btn t={t} onClick={submitEditCat}>Save</Btn></div>
      </div></Mdl>}

      {/* Add Value Modal */}
      {addValForm && <Mdl t={t} onClose={() => setAddValForm(null)}><div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 16 }}>Add Value to {activeCat?.label}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><Lbl>Value (stored) *</Lbl><Inp t={t} value={addValForm.value} onChange={e => setAddValForm({ ...addValForm, value: e.target.value })} placeholder="e.g. floor_tech" style={{ fontFamily: "monospace" }} /></div>
          <div><Lbl>Label (displayed) *</Lbl><Inp t={t} value={addValForm.label} onChange={e => setAddValForm({ ...addValForm, label: e.target.value })} placeholder="e.g. Floor Technician" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><Lbl>Color (optional)</Lbl><Inp t={t} value={addValForm.color} onChange={e => setAddValForm({ ...addValForm, color: e.target.value })} placeholder="e.g. #24A4F4" /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 22 }}><input type="checkbox" checked={addValForm.show_other_input} onChange={e => setAddValForm({ ...addValForm, show_other_input: e.target.checked })} /><span style={{ fontSize: 12, color: t.textSec }}>Show "Other" text input</span></div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAddValForm(null)}>Cancel</Btn><Btn t={t} onClick={submitAddVal}>Add Value</Btn></div>
      </div></Mdl>}

      {/* Edit Value Modal */}
      {editValForm && <Mdl t={t} onClose={() => setEditValForm(null)}><div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 16 }}>Edit Value</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><Lbl>Value (stored)</Lbl><Inp t={t} value={editValForm.value} onChange={e => setEditValForm({ ...editValForm, value: e.target.value })} style={{ fontFamily: "monospace" }} /></div>
          <div><Lbl>Label (displayed)</Lbl><Inp t={t} value={editValForm.label} onChange={e => setEditValForm({ ...editValForm, label: e.target.value })} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><Lbl>Color</Lbl><Inp t={t} value={editValForm.color} onChange={e => setEditValForm({ ...editValForm, color: e.target.value })} placeholder="e.g. #24A4F4" /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 22 }}><input type="checkbox" checked={editValForm.show_other_input} onChange={e => setEditValForm({ ...editValForm, show_other_input: e.target.checked })} /><span style={{ fontSize: 12, color: t.textSec }}>Show "Other" text input</span></div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setEditValForm(null)}>Cancel</Btn><Btn t={t} onClick={submitEditVal}>Save</Btn></div>
      </div></Mdl>}

      {/* Add Site Lookup Modal */}
      {addSiteVal && <Mdl t={t} onClose={() => setAddSiteVal(null)}><div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 16 }}>Add {siteTypeLabel[addSiteVal.lookup_type] ? siteTypeLabel[addSiteVal.lookup_type].slice(0, -1) : "Value"}</div>
        <div style={{ marginBottom: 12 }}><Lbl>Type</Lbl><Sel t={t} value={addSiteVal.lookup_type} onChange={e => setAddSiteVal({ ...addSiteVal, lookup_type: e.target.value })} options={[{ v: "zone", l: "Zone" }, { v: "building", l: "Building" }, { v: "floor", l: "Floor" }]} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><Lbl>Value *</Lbl><Inp t={t} value={addSiteVal.value} onChange={e => setAddSiteVal({ ...addSiteVal, value: e.target.value, label: e.target.value })} placeholder="e.g. Gymnasium" /></div>
          <div><Lbl>Label</Lbl><Inp t={t} value={addSiteVal.label} onChange={e => setAddSiteVal({ ...addSiteVal, label: e.target.value })} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setAddSiteVal(null)}>Cancel</Btn><Btn t={t} onClick={submitAddSiteVal}>Add</Btn></div>
      </div></Mdl>}

      {/* Edit Site Lookup Modal */}
      {editSiteVal && <Mdl t={t} onClose={() => setEditSiteVal(null)}><div style={{ padding: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 16 }}>Edit Site Lookup</div>
        <div style={{ marginBottom: 12 }}><Lbl>Type</Lbl><Sel t={t} value={editSiteVal.lookup_type} onChange={e => setEditSiteVal({ ...editSiteVal, lookup_type: e.target.value })} options={[{ v: "zone", l: "Zone" }, { v: "building", l: "Building" }, { v: "floor", l: "Floor" }]} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><Lbl>Value</Lbl><Inp t={t} value={editSiteVal.value} onChange={e => setEditSiteVal({ ...editSiteVal, value: e.target.value })} /></div>
          <div><Lbl>Label</Lbl><Inp t={t} value={editSiteVal.label} onChange={e => setEditSiteVal({ ...editSiteVal, label: e.target.value })} /></div>
        </div>
        <div style={{ fontSize: 10, color: t.textMut, marginBottom: 12, padding: "6px 10px", background: t.cardAlt, borderRadius: 4 }}>Changing the type will reclassify this value. For example, changing from "Building" to "Zone" moves it between categories.</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn t={t} v="ghost" onClick={() => setEditSiteVal(null)}>Cancel</Btn><Btn t={t} onClick={submitEditSiteVal}>Save</Btn></div>
      </div></Mdl>}
    </div>
  );
}

// ===== JOTFORM PICKER FIELD (used by HR Documents add modal) =====
// =====================================================
// SESSION 22: Unified HR category taxonomy
// 12 values shared across forms, manual documents, training,
// onboarding, and Jotform submissions in the HR Records folder view.
// =====================================================
const HR_CATEGORY_OPTS = [
  { v: "uncategorized", l: "Uncategorized" },
  { v: "hr_onboarding", l: "HR - Onboarding" },
  { v: "hr_ongoing", l: "HR - Ongoing / Annual" },
  { v: "training", l: "Training" },
  { v: "tax", l: "Tax Forms" },
  { v: "benefits", l: "Benefits / Payroll" },
  { v: "legal", l: "Legal / Consent" },
  { v: "client", l: "Client Forms" },
  { v: "vendor", l: "Vendor / W-9" },
  { v: "operational", l: "Operational" },
  { v: "safety", l: "Safety / Incident" },
  { v: "other", l: "Other" },
];

const HR_CATEGORY_LABEL = (v) => (HR_CATEGORY_OPTS.find(c => c.v === v) || { l: v }).l;

// Color hint per category for badges
const HR_CATEGORY_COLOR = {
  uncategorized: "#94A3B8",
  hr_onboarding: "#24A4F4",
  hr_ongoing: "#1ABC9C",
  training: "#2ECC71",
  tax: "#F39C12",
  benefits: "#9B59B6",
  legal: "#E74C3C",
  client: "#24A4F4",
  vendor: "#F39C12",
  operational: GOLD,
  safety: "#E74C3C",
  other: "#94A3B8",
};

function JotformPickerField({ af, form, setForm, t }) {
  const [pickerOptions, setPickerOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [noKey, setNoKey] = useState(false);

  useEffect(() => {
    if (!form.user_id) { setPickerOptions([]); return; }
    if (form.id) return; // editing, skip picker load
    let cancelled = false;
    setLoading(true);
    af("/api/jotform/submissions?user_id=" + form.user_id + "&linked=false&limit=100")
      .then(res => { if (!cancelled) { setPickerOptions(res.submissions || []); setNoKey(false); } })
      .catch(err => {
        if (cancelled) return;
        if (err.message && err.message.toLowerCase().includes("api key")) setNoKey(true);
        setPickerOptions([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [form.user_id, form.id, af]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  const handlePick = (uuid) => {
    if (!uuid) {
      setForm({ ...form, jotform_reference: "", _submission_uuid_to_link: null, _submission_uuid_preselected: null });
      return;
    }
    const sub = pickerOptions.find(s => s.id === uuid);
    if (!sub) return;
    setForm({
      ...form,
      jotform_reference: sub.jotform_submission_id,
      _submission_uuid_to_link: sub.id,
      _submission_uuid_preselected: uuid
    });
  };

  if (form.id) {
    // Edit mode: show existing jotform_reference as plain text field
    return (
      <div>
        <div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Jotform Reference</div>
        <Inp t={t} placeholder="Jotform submission ID or URL" value={form.jotform_reference || ""} onChange={e => setForm({ ...form, jotform_reference: e.target.value })} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Jotform Submission (optional)</div>
      {!form.user_id && (
        <div style={{ padding: "8px 12px", borderRadius: 6, background: t.hover, fontSize: 11, color: t.textMut }}>Select an employee first to see matching Jotform submissions.</div>
      )}
      {form.user_id && loading && (
        <div style={{ padding: "8px 12px", fontSize: 11, color: t.textMut }}>Loading submissions...</div>
      )}
      {form.user_id && noKey && (
        <div style={{ padding: "8px 12px", borderRadius: 6, background: t.hover, fontSize: 11, color: t.textMut }}>Jotform is not configured. Use the manual entry below.</div>
      )}
      {form.user_id && !loading && !noKey && pickerOptions.length === 0 && (
        <div style={{ padding: "8px 12px", borderRadius: 6, background: t.hover, fontSize: 11, color: t.textMut }}>No unlinked Jotform submissions for this employee. Sync the Forms page if needed, or use manual entry.</div>
      )}
      {form.user_id && !loading && pickerOptions.length > 0 && (
        <Sel
          options={[
            { v: "", l: "Select a synced submission..." },
            ...pickerOptions.map(s => ({
              v: s.id,
              l: (s.form_title || s.jotform_form_id) + " - " + fmtDate(s.submitted_at) + (s.submitter_name ? " (" + s.submitter_name + ")" : "")
            }))
          ]}
          value={form._submission_uuid_preselected || ""}
          onChange={e => handlePick(e.target.value)}
          t={t}
        />
      )}
      <div style={{ marginTop: 6 }}>
        <button type="button" onClick={() => setShowManual(!showManual)} style={{ background: "none", border: "none", color: BL, fontSize: 11, cursor: "pointer", padding: 0 }}>
          {showManual ? "Hide manual entry" : "Or enter manually"}
        </button>
      </div>
      {showManual && (
        <div style={{ marginTop: 6 }}>
          <Inp t={t} placeholder="Jotform submission ID or URL" value={form.jotform_reference || ""} onChange={e => setForm({ ...form, jotform_reference: e.target.value, _submission_uuid_to_link: null, _submission_uuid_preselected: null })} />
        </div>
      )}
    </div>
  );
}

// ===== FORMS PAGE (Session 20: Jotform Integration, Session 21: PDF + Diagnostic) =====
// ===== INCIDENT REPORTS: the reports staff file through the Help chat =====
// Every read of a report writes an audit row, so a report is fetched only when a person opens one,
// once per opening. Nothing here prefetches, refetches on a re-render, or polls.
const IR_PAGE_SIZE = 50;
const IR_NO_ACCESS = "Your account cannot read incident reports.";
const IR_NOT_FOUND = "This report could not be found, or your account cannot open it.";
const IR_RESEND_ASK = "Send this report again to everyone set for this form?";
// Built from the answer: how many emails, how many app notices, and what the email carried.
const irCount = (n, one, many) => n + " " + (n === 1 ? one : many);
const irSentLine = (d) => "Sent again: " + irCount(Number(d && d.email) || 0, "email", "emails")
  + " and " + irCount(Number(d && d.inApp) || 0, "app notice", "app notices")
  + ", " + ((d && d.attached) ? "with the PDF attached" : "with a link to the app") + ".";
const IR_SUPERVISOR_NOTE = "A supervisor completes this part at a desk. The app cannot fill it in yet.";
const irWhen = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "--";
const irDay = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--";

function IncidentReportWindow({ af, token, t, id, row, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // What the footer's own calls say. The report itself is still read once per opening.
  const [actionError, setActionError] = useState("");
  const [downloading, setDownloading] = useState(false);
  // The report the footer is acting on, read by the download without making it a dependency.
  const draftRef = useRef(null);
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentLine, setSentLine] = useState("");
  // One send at a time. The ref closes the gap before the disabled button redraws, so a double click
  // is one request. This is the guard the Time off window uses.
  const sendingRef = useRef(false);
  const fetchedRef = useRef(null);

  useEffect(() => {
    if (!id || fetchedRef.current === id) return;
    fetchedRef.current = id;
    let alive = true;
    setLoading(true); setError(""); setData(null);
    af("/api/forms/responses/" + encodeURIComponent(id))
      .then(d => { if (alive) { setData(d || null); setLoading(false); } })
      .catch(e => { if (alive) { setError(e && e.status === 404 ? IR_NOT_FOUND : (e.message || "Request failed")); setLoading(false); } });
    return () => { alive = false; };
  }, [af, id]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = async () => {
    if (downloading) return;
    setDownloading(true); setActionError("");
    try {
      // A cross-origin response hands JS no Content-Disposition unless the API exposes it, so the
      // same name the API writes is built here as the fallback: the form code and the report.
      const fallback = ((draftRef.current && draftRef.current.formCode) || "report") + "-" + String(id).slice(0, 8) + ".pdf";
      const f = await apiDownload("/api/forms/responses/" + encodeURIComponent(id) + "/pdf", token, fallback);
      const url = URL.createObjectURL(f.blob);
      const a = document.createElement("a");
      a.href = url; a.download = f.filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { setActionError(e.message || "Request failed"); }
    setDownloading(false);
  };

  const resend = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true; setSending(true); setActionError(""); setSentLine("");
    try {
      const d = await af("/api/forms/responses/" + encodeURIComponent(id) + "/resend", { method: "POST", body: {} });
      setAsking(false);
      setSentLine(irSentLine(d));
    } catch (e) {
      const st = e && e.body && e.body.status;
      setActionError((e.message || "Request failed") + (st ? " Status: " + st + "." : ""));
    }
    sendingRef.current = false; setSending(false);
  };

  const draft = data && data.draft;
  draftRef.current = draft;
  const fields = data && Array.isArray(data.fields) ? data.fields : [];
  const agentFields = fields.filter(f => f.half === "agent");
  const supervisorFields = fields.filter(f => f.half === "supervisor");
  const submitted = draft && draft.status === "submitted";
  // The label comes from the API and is shown as sent: some carry required federal wording.
  const fieldRow = (f) => (<div key={f.key} style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, color: t.textMut, marginBottom: 3 }}>{f.label}</div>
    {f.displayValue == null || f.displayValue === ""
      ? <div style={{ fontSize: 13, color: t.textMut, fontStyle: "italic" }}>Not answered</div>
      : <div style={{ fontSize: 13, color: t.text, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5 }}>{String(f.displayValue)}</div>}
  </div>);

  return (<Mdl t={t} onClose={onClose}><div style={{ padding: 20 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>{(draft && draft.formName) || "Report"}</div>
        {draft && <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Bdg l={submitted ? "Submitted" : "Unfinished"} c={submitted ? GR : OR} />
          <span style={{ fontSize: 11, color: t.textMut }}>{draft.siteName || "No site"}</span>
          <span style={{ fontSize: 11, color: t.textMut }}>{submitted ? "Filed " + irWhen(draft.submittedAt) : "Started " + irWhen(draft.createdAt)}</span>
          {row && row.userName && <span style={{ fontSize: 11, color: t.textMut }}>Filed by {row.userName}</span>}
        </div>}
        {draft && !submitted && <div style={{ fontSize: 11, color: t.textSec, marginTop: 6 }}>{Number(draft.answered) || 0} answered, {Number(draft.remaining) || 0} to go</div>}
      </div>
      <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><XI sz={18} c={t.textMut} /></button>
    </div>
    {loading && <div style={{ padding: 30, textAlign: "center", color: t.textMut, fontSize: 13 }}>Loading...</div>}
    {error && <div style={{ padding: 20, textAlign: "center", color: RD, fontSize: 13 }}>{error}</div>}
    {!loading && !error && draft && (<>
      <div style={{ marginBottom: 18 }}>
        <Lbl>What was reported</Lbl>
        {agentFields.length === 0 && <div style={{ fontSize: 12, color: t.textMut }}>Nothing reported yet.</div>}
        {agentFields.map(fieldRow)}
      </div>
      <div>
        <Lbl>Supervisor section</Lbl>
        <div style={{ fontSize: 11, color: t.textMut, marginBottom: 10 }}>{IR_SUPERVISOR_NOTE}</div>
        {supervisorFields.length === 0 && <div style={{ fontSize: 12, color: t.textMut }}>No supervisor questions on this form.</div>}
        {supervisorFields.map(fieldRow)}
      </div>
    </>)}
    {asking && <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: t.hover, border: "1px solid " + t.border }}>
      <div style={{ fontSize: 12, color: t.text, marginBottom: 10 }}>{IR_RESEND_ASK}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn t={t} onClick={resend} disabled={sending} style={{ minHeight: 44 }}>{sending ? "Sending..." : "Send it"}</Btn>
        <Btn t={t} v="ghost" onClick={() => setAsking(false)} disabled={sending} style={{ minHeight: 44 }}>Not yet</Btn>
      </div>
    </div>}
    {sentLine && <div style={{ fontSize: 12, color: GR, marginTop: 14 }}>{sentLine}</div>}
    {actionError && <div style={{ fontSize: 12, color: RD, marginTop: 14 }}>{actionError}</div>}
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
      {!loading && !error && draft && <Btn t={t} v="ghost" onClick={download} disabled={downloading} style={{ minHeight: 44 }}>{downloading ? "Downloading..." : "Download PDF"}</Btn>}
      {!loading && !error && submitted && <Btn t={t} v="ghost" onClick={() => { setAsking(true); setSentLine(""); setActionError(""); }} disabled={sending} style={{ minHeight: 44 }}>Send again</Btn>}
      <Btn t={t} v="ghost" onClick={onClose} style={{ minHeight: 44 }}>Close</Btn>
    </div>
  </div></Mdl>);
}

function IncidentReportsTab({ af, token, t, sites = [], openId, openRow, onOpen, onClose }) {
  const [status, setStatus] = useState("submitted");
  const [formCode, setFormCode] = useState("");
  const [siteId, setSiteId] = useState("");
  const [rows, setRows] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [paging, setPaging] = useState(false);

  // The form list is read once, when the tab first opens. A failure leaves the select with All forms
  // and never stops the list from loading.
  useEffect(() => {
    let alive = true;
    af("/api/forms?locale=en")
      .then(d => { if (alive) setForms(d && Array.isArray(d.forms) ? d.forms : []); })
      .catch(e => { console.warn("Form list:", e.message); if (alive) setForms([]); });
    return () => { alive = false; };
  }, [af]);

  const query = useCallback((before) => {
    const q = ["status=" + encodeURIComponent(status), "limit=" + IR_PAGE_SIZE];
    if (formCode) q.push("formCode=" + encodeURIComponent(formCode));
    if (siteId) q.push("siteId=" + encodeURIComponent(siteId));
    if (before) q.push("before=" + encodeURIComponent(before));
    return "/api/forms/responses?" + q.join("&");
  }, [status, formCode, siteId]);

  const load = useCallback(async (before) => {
    if (before) setPaging(true); else { setLoading(true); setError(null); }
    try {
      const d = await af(query(before));
      const list = d && Array.isArray(d.responses) ? d.responses : [];
      setRows(prev => before ? [...prev, ...list] : list);
      setHasMore(list.length === IR_PAGE_SIZE);
      setError(null);
    } catch (e) {
      if (!before) setRows([]);
      setError({ status: e && e.status, message: e.message || "Request failed" });
    }
    setLoading(false); setPaging(false);
  }, [af, query]);
  useEffect(() => { load(null); }, [load]);

  const loadMore = () => { const last = rows[rows.length - 1]; if (!last) return; load(status === "submitted" ? last.submittedAt : last.createdAt); };

  const submittedCols = [
    { header: "Filed", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: r => irWhen(r.submittedAt) },
    { header: "Form", render: r => <span style={{ color: t.text }}>{r.formName}</span> },
    { header: "Site", tdStyle: { color: t.textSec }, render: r => r.siteName || "No site" },
    { header: "Filed by", tdStyle: { color: t.textSec }, render: r => r.userName || "--" },
  ];
  const draftCols = [
    { header: "Started", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: r => irWhen(r.createdAt) },
    { header: "Form", render: r => <span style={{ color: t.text }}>{r.formName}</span> },
    { header: "Site", tdStyle: { color: t.textSec }, render: r => r.siteName || "No site" },
    { header: "Started by", tdStyle: { color: t.textSec }, render: r => r.userName || "--" },
    { header: "Answered", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: r => (Number(r.answered) || 0) + " of " + ((Number(r.answered) || 0) + (Number(r.remaining) || 0)) },
    { header: "Due", tdStyle: { whiteSpace: "nowrap" }, render: r => {
      if (!r.dueAt) return <span style={{ color: t.textSec }}>--</span>;
      const past = new Date(r.dueAt).getTime() < Date.now();
      return past ? <span style={{ color: RD, fontWeight: 600 }}>Past due {irDay(r.dueAt)}</span> : <span style={{ color: t.textSec }}>{irDay(r.dueAt)}</span>;
    } },
  ];

  const sw = (v, l) => (<button key={v} onClick={() => setStatus(v)} style={{ minHeight: 44, padding: "0 16px", borderRadius: 8, border: "1px solid " + (status === v ? GO : t.border), background: status === v ? t.goldBg : "transparent", color: status === v ? t.goldText : t.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY }}>{l}</button>);

  return (<div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>{sw("submitted", "Submitted")}{sw("draft", "Unfinished")}</div>
      <div style={{ minWidth: 200 }}><Sel t={t} aria-label="Form" value={formCode} onChange={e => setFormCode(e.target.value)} options={[{ v: "", l: "All forms" }, ...forms.map(f => ({ v: f.code, l: f.title }))]} /></div>
      <div style={{ minWidth: 200 }}><Sel t={t} aria-label="Site" value={siteId} onChange={e => setSiteId(e.target.value)} options={[{ v: "", l: "All sites" }, ...sites.map(s => ({ v: s.id, l: s.name }))]} /></div>
    </div>
    {loading && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Loading reports...</div>}
    {!loading && error && error.status === 403 && <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: t.textSec }}>{IR_NO_ACCESS}</div>}
    {!loading && error && error.status !== 403 && <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: t.textSec }}>{error.message} <button onClick={() => load(null)} style={{ minHeight: 44, background: "none", border: "none", color: t.goldText, fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY, cursor: "pointer" }}>Try again</button></div>}
    {!loading && !error && <DataTable t={t} columns={status === "submitted" ? submittedCols : draftCols} rows={rows} rowKey={r => r.id} onRowClick={r => onOpen(r.id, r)} empty={status === "submitted" ? "No reports filed yet." : "No unfinished reports."} />}
    {!loading && !error && hasMore && <div style={{ padding: 10, textAlign: "center" }}><button onClick={loadMore} disabled={paging} style={{ minHeight: 44, padding: "0 16px", background: "none", border: "none", color: t.goldText, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, cursor: "pointer" }}>{paging ? "Loading..." : "Load more"}</button></div>}
    {openId && <IncidentReportWindow af={af} token={token} t={t} id={openId} row={openRow} onClose={onClose} />}
  </div>);
}

function FormsPage({ af, token, showToast, t, allStaff, sites, user, route = [], onRoute }) {
  const [tab, setTab] = useState(() => (route[0] === "reports" ? "incident_reports" : "library"));
  const [irOpenId, setIrOpenId] = useState(() => (route[0] === "reports" && route[1] ? route[1] : null));
  const [irOpenRow, setIrOpenRow] = useState(null);
  // #forms/reports opens this tab, and #forms/reports/<id> opens that report as well. #forms alone
  // behaves as it always has.
  useEffect(() => {
    if (route[0] !== "reports") return;
    setTab("incident_reports");
    setIrOpenId(prev => (route[1] ? route[1] : null));
    if (!route[1]) setIrOpenRow(null);
  }, [route]);
  const [config, setConfig] = useState(null);
  const [forms, setForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsTotal, setSubmissionsTotal] = useState(0);
  const [syncLog, setSyncLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncingForms, setSyncingForms] = useState(false);
  const [syncingSubs, setSyncingSubs] = useState(false);
  const [backfillingPdfs, setBackfillingPdfs] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [autoLinking, setAutoLinking] = useState(false);
  const [usersForLinking, setUsersForLinking] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [detailSub, setDetailSub] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [linkModal, setLinkModal] = useState(null);
  const [fullRefreshModal, setFullRefreshModal] = useState(false);

  // Session 21 additions
  const [pdfAccessLog, setPdfAccessLog] = useState([]);
  const [pdfAccessTotal, setPdfAccessTotal] = useState(0);
  const [pdfFilters, setPdfFilters] = useState({ access_type: "", success: "", date_start: "", date_end: "" });
  const [pdfOffset, setPdfOffset] = useState(0);
  const PDF_LIMIT = 50;
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const [libFilters, setLibFilters] = useState({ category: "", enabled: "", onboarding: "", search: "" });
  const [subFilters, setSubFilters] = useState({ form_id: "", status: "", linked: "", date_start: "", date_end: "", search: "" });
  const [subOffset, setSubOffset] = useState(0);
  const SUB_LIMIT = 50;

  // Session 26: Sync Diagnostic state
  const [diagSummary, setDiagSummary] = useState(null);
  const [diagForms, setDiagForms] = useState([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagGeneratedAt, setDiagGeneratedAt] = useState(null);
  const [expandedFormId, setExpandedFormId] = useState(null);
  const [expandedFormData, setExpandedFormData] = useState(null);
  const [expandedFormLoading, setExpandedFormLoading] = useState(false);
  const [forceFetchingIds, setForceFetchingIds] = useState({});
  const [failures, setFailures] = useState([]);
  const [failuresLoading, setFailuresLoading] = useState(false);
  const [retryingFailureId, setRetryingFailureId] = useState(null);
  const [resolvingFailureId, setResolvingFailureId] = useState(null);
  // Session 27: per-form bulk-resolve in-flight tracking (keyed by form_id)
  const [bulkResolvingFormId, setBulkResolvingFormId] = useState(null);

  // Session 27: Aliases tab state
  const [aliases, setAliases] = useState([]);
  const [aliasesLoading, setAliasesLoading] = useState(false);
  const [aliasAddForm, setAliasAddForm] = useState({ user_id: "", alias_type: "name", alias_value: "", notes: "" });
  const [aliasAddBusy, setAliasAddBusy] = useState(false);
  const [aliasDeletingId, setAliasDeletingId] = useState(null);

  // Session 22: hoisted to module scope as HR_CATEGORY_OPTS so HR Records can share it.
  // The Training value was added in Session 22; existing FormsPage UI still works unchanged.
  const CATEGORY_OPTS = HR_CATEGORY_OPTS;

  const STATUS_OPTS = [
    { v: "", l: "All statuses" },
    { v: "new", l: "New" },
    { v: "reviewed", l: "Reviewed" },
    { v: "linked", l: "Linked" },
    { v: "archived", l: "Archived" },
  ];

  const ENTITY_TYPE_OPTS = [
    { v: "hr_document", l: "HR Document" },
    { v: "hr_training", l: "HR Training Record" },
    { v: "hr_onboarding_step", l: "HR Onboarding Step" },
    { v: "user", l: "Employee" },
    { v: "site", l: "Site" },
    { v: "inspection", l: "Inspection" },
    { v: "issue", l: "Issue" },
    { v: "task", l: "Assigned Task" },
    { v: "shift", l: "Scheduled Shift" },
    { v: "pickup", l: "Shift Pickup" },
  ];

  const fmtDT = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "--";
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--";

  const catLabel = (v) => (CATEGORY_OPTS.find(c => c.v === v) || { l: v }).l;

  const loadConfig = useCallback(async () => {
    try { const d = await af("/api/jotform/config"); setConfig(d); }
    catch (e) { showToast("Config load failed: " + e.message, "error"); }
  }, [af, showToast]);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const q = [];
      if (libFilters.category) q.push("category=" + encodeURIComponent(libFilters.category));
      if (libFilters.enabled) q.push("enabled=" + libFilters.enabled);
      if (libFilters.onboarding) q.push("onboarding=" + libFilters.onboarding);
      if (libFilters.search) q.push("search=" + encodeURIComponent(libFilters.search));
      const d = await af("/api/jotform/forms" + (q.length ? "?" + q.join("&") : ""));
      setForms(d);
    } catch (e) { showToast("Forms load failed: " + e.message, "error"); }
    setLoading(false);
  }, [af, libFilters, showToast]);

  const loadSubmissions = useCallback(async (resetOffset) => {
    setLoading(true);
    try {
      const offset = resetOffset ? 0 : subOffset;
      const q = ["limit=" + SUB_LIMIT, "offset=" + offset];
      if (subFilters.form_id) q.push("form_id=" + subFilters.form_id);
      if (subFilters.status) q.push("status=" + subFilters.status);
      if (subFilters.linked) q.push("linked=" + subFilters.linked);
      if (subFilters.date_start) q.push("date_start=" + subFilters.date_start);
      if (subFilters.date_end) q.push("date_end=" + subFilters.date_end);
      if (subFilters.search) q.push("search=" + encodeURIComponent(subFilters.search));
      const d = await af("/api/jotform/submissions?" + q.join("&"));
      setSubmissions(d.submissions || []);
      setSubmissionsTotal(d.total || 0);
      if (resetOffset) setSubOffset(0);
    } catch (e) { showToast("Submissions load failed: " + e.message, "error"); }
    setLoading(false);
  }, [af, subFilters, subOffset, showToast]);

  const loadSyncLog = useCallback(async () => {
    try { const d = await af("/api/jotform/sync-log?limit=20"); setSyncLog(d); }
    catch (e) { console.warn("Sync log:", e.message); }
  }, [af]);

  const loadPdfAccessLog = useCallback(async (resetOffset) => {
    setLoading(true);
    try {
      const offset = resetOffset ? 0 : pdfOffset;
      const q = ["limit=" + PDF_LIMIT, "offset=" + offset];
      if (pdfFilters.access_type) q.push("access_type=" + pdfFilters.access_type);
      if (pdfFilters.success) q.push("success=" + pdfFilters.success);
      if (pdfFilters.date_start) q.push("date_start=" + pdfFilters.date_start);
      if (pdfFilters.date_end) q.push("date_end=" + pdfFilters.date_end);
      const d = await af("/api/jotform/pdf-access-log?" + q.join("&"));
      setPdfAccessLog(d.entries || []);
      setPdfAccessTotal(d.total || 0);
      if (resetOffset) setPdfOffset(0);
    } catch (e) { showToast("PDF log load failed: " + e.message, "error"); }
    setLoading(false);
  }, [af, pdfFilters, pdfOffset, showToast]);

  const runDiagnostic = useCallback(async () => {
    setRunningDiagnostic(true);
    setDiagnosticResult(null);
    try {
      const d = await af("/api/jotform/diagnostic");
      setDiagnosticResult(d);
      showToast("Diagnostic complete");
    } catch (e) { showToast("Diagnostic failed: " + e.message, "error"); }
    setRunningDiagnostic(false);
  }, [af, showToast]);

  // Session 26: Sync Diagnostic loaders and action helpers
  const loadSyncDiagnostic = useCallback(async () => {
    setDiagLoading(true);
    try {
      const d = await af("/api/jotform/sync-diagnostic");
      setDiagSummary(d.summary || null);
      setDiagForms(d.forms || []);
      setDiagGeneratedAt(d.generated_at || null);
    } catch (e) { showToast("Diagnostic load failed: " + e.message, "error"); }
    setDiagLoading(false);
  }, [af, showToast]);

  const loadFailures = useCallback(async () => {
    setFailuresLoading(true);
    try {
      const d = await af("/api/jotform/submission-failures?is_resolved=false&limit=200");
      setFailures(d.failures || []);
    } catch (e) { showToast("Failures load failed: " + e.message, "error"); }
    setFailuresLoading(false);
  }, [af, showToast]);

  const loadMissingIds = useCallback(async (formId) => {
    setExpandedFormLoading(true);
    setExpandedFormData(null);
    try {
      const d = await af("/api/jotform/sync-diagnostic?form_id=" + formId + "&include_missing=true");
      setExpandedFormData(d);
    } catch (e) { showToast("Missing IDs load failed: " + e.message, "error"); }
    setExpandedFormLoading(false);
  }, [af, showToast]);

  const forceFetchSubmission = useCallback(async (jotformSubmissionId, formIdForRefresh) => {
    setForceFetchingIds(prev => ({ ...prev, [jotformSubmissionId]: true }));
    try {
      const d = await af("/api/jotform/submissions/force-fetch", {
        method: "POST",
        body: { jotform_submission_id: jotformSubmissionId }
      });
      const resolvedNote = d.resolved_failures > 0 ? ", resolved " + d.resolved_failures + " prior failure(s)" : "";
      showToast("Force-fetched " + jotformSubmissionId + " (" + d.action + ")" + resolvedNote);
      if (formIdForRefresh) {
        await loadMissingIds(formIdForRefresh);
      }
      loadSyncDiagnostic();
      loadFailures();
    } catch (e) {
      showToast("Force-fetch failed: " + e.message, "error");
    }
    setForceFetchingIds(prev => {
      const next = { ...prev };
      delete next[jotformSubmissionId];
      return next;
    });
  }, [af, showToast, loadMissingIds, loadSyncDiagnostic, loadFailures]);

  const retryFailure = useCallback(async (failureId) => {
    setRetryingFailureId(failureId);
    try {
      const d = await af("/api/jotform/submission-failures/" + failureId + "/retry", { method: "POST" });
      const resolvedNote = d.resolved_failures > 0 ? ", resolved " + d.resolved_failures + " failure record(s)" : "";
      showToast("Retried (" + d.action + ")" + resolvedNote);
      loadFailures();
      loadSyncDiagnostic();
    } catch (e) { showToast("Retry failed: " + e.message, "error"); }
    setRetryingFailureId(null);
  }, [af, showToast, loadFailures, loadSyncDiagnostic]);

  const resolveFailure = useCallback(async (failureId) => {
    const note = window.prompt("Optional note explaining why this is being resolved manually (e.g. 'duplicate', 'deleted in Jotform', 'intentional skip'). Leave blank if you just want to dismiss without a reason.");
    if (note === null) return;
    setResolvingFailureId(failureId);
    try {
      await af("/api/jotform/submission-failures/" + failureId + "/resolve", {
        method: "POST",
        body: { note }
      });
      showToast("Failure marked resolved.");
      loadFailures();
    } catch (e) { showToast("Resolve failed: " + e.message, "error"); }
    setResolvingFailureId(null);
  }, [af, showToast, loadFailures]);

  // ============================================================
  // SESSION 27: Bulk-resolve failures for a form
  // ============================================================
  // Marks every unresolved failure for the given form as resolved with
  // an optional note. Used by the "Resolve all" button on the Sync
  // Diagnostic per-form gap row when unresolved_failure_count > 0.
  // ============================================================
  const resolveAllFailuresForForm = useCallback(async (formId, formTitle, count) => {
    const note = window.prompt(
      "Bulk-resolve " + count + " unresolved failure" + (count === 1 ? "" : "s") +
      " for form \"" + formTitle + "\".\n\n" +
      "Optional note explaining why (e.g. 'all duplicates', 'all deleted in Jotform', 'fixed manually'). " +
      "Leave blank to dismiss without a reason.\n\n" +
      "Click Cancel to abort."
    );
    if (note === null) return;
    setBulkResolvingFormId(formId);
    try {
      const r = await af("/api/jotform/submission-failures/resolve-all-for-form", {
        method: "POST",
        body: { form_id: formId, note }
      });
      showToast("Bulk-resolved " + r.resolved_count + " failure" + (r.resolved_count === 1 ? "" : "s") + ".");
      loadFailures();
      loadSyncDiagnostic();
    } catch (e) { showToast("Bulk resolve failed: " + e.message, "error"); }
    setBulkResolvingFormId(null);
  }, [af, showToast, loadFailures, loadSyncDiagnostic]);

  // ============================================================
  // SESSION 27: Aliases tab actions
  // ============================================================
  // loadAliases:  fetch the full list (joined with user fields)
  // addAlias:     create a new alias with admin_added source
  // deleteAlias:  permanently remove an alias
  // ============================================================
  const loadAliases = useCallback(async () => {
    setAliasesLoading(true);
    try {
      const r = await af("/api/jotform/user-aliases");
      setAliases(Array.isArray(r) ? r : []);
    } catch (e) {
      showToast("Failed to load aliases: " + e.message, "error");
      setAliases([]);
    }
    setAliasesLoading(false);
  }, [af, showToast]);

  const addAlias = useCallback(async () => {
    const f = aliasAddForm;
    if (!f.user_id) { showToast("Pick a user first", "error"); return; }
    if (!f.alias_value || !f.alias_value.trim()) { showToast("Alias value is required", "error"); return; }
    setAliasAddBusy(true);
    try {
      await af("/api/jotform/user-aliases", {
        method: "POST",
        body: {
          user_id: f.user_id,
          alias_type: f.alias_type,
          alias_value: f.alias_value.trim(),
          notes: f.notes || null,
        }
      });
      showToast("Alias added.");
      setAliasAddForm({ user_id: "", alias_type: "name", alias_value: "", notes: "" });
      loadAliases();
    } catch (e) {
      // The API returns 409 with a clear message when the alias already
      // maps to a different user. Surface it verbatim so the admin sees it.
      showToast(e.message || "Add failed", "error");
    }
    setAliasAddBusy(false);
  }, [af, showToast, aliasAddForm, loadAliases]);

  const deleteAlias = useCallback(async (aliasId, label) => {
    if (!window.confirm("Remove alias " + (label ? "\"" + label + "\"" : "") + "?\n\nThis affects future auto-matching. Existing linked submissions are not changed.")) return;
    setAliasDeletingId(aliasId);
    try {
      await af("/api/jotform/user-aliases/" + aliasId, { method: "DELETE" });
      showToast("Alias removed.");
      loadAliases();
    } catch (e) { showToast("Delete failed: " + e.message, "error"); }
    setAliasDeletingId(null);
  }, [af, showToast, loadAliases]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { if (tab === "library") loadForms(); }, [tab, libFilters]);
  useEffect(() => { if (tab === "submissions") loadSubmissions(true); }, [tab, subFilters]);
  useEffect(() => { if (tab === "pdf_access") loadPdfAccessLog(true); }, [tab, pdfFilters]);
  useEffect(() => { if (tab === "settings") { loadConfig(); loadSyncLog(); } }, [tab]);
  useEffect(() => { if (tab === "sync_diagnostic") { loadSyncDiagnostic(); loadFailures(); } }, [tab]);
  // Session 27: Aliases tab loads on open. Also load users for the add-form dropdown
  // if they haven't been fetched yet (mirrors the submission detail modal pattern).
  useEffect(() => {
    if (tab === "aliases") {
      loadAliases();
      if (usersForLinking.length === 0) {
        af("/api/jotform/users-for-linking").then(us => setUsersForLinking(us || [])).catch(() => {});
      }
    }
  }, [tab]);

  const syncForms = async () => {
    if (!window.confirm("Pull the latest forms from Jotform. Only forms whose title starts with 'OCSA Cleaning_' will be imported. Forms in the app that no longer match this prefix (including any Construction or MCFL forms) will be removed along with their submissions. Continue?")) return;
    setSyncingForms(true);
    try {
      const d = await af("/api/jotform/forms/sync", { method: "POST" });
      const parts = [
        d.created + " new",
        d.updated + " updated",
      ];
      if (d.purgedForms > 0) parts.push(d.purgedForms + " purged (" + d.purgedSubmissions + " submissions removed)");
      if (d.skippedWrongPrefix > 0) parts.push(d.skippedWrongPrefix + " skipped (wrong prefix)");
      showToast("Synced " + d.total + " OCSA Cleaning forms. " + parts.join(", ") + ".");
      loadForms(); loadConfig();
    } catch (e) {
      showToast("Sync failed: " + e.message, "error");
    }
    setSyncingForms(false);
  };

  const syncSubmissions = async (formUuid) => {
    const msg = formUuid ? "Pull new submissions for this form?" : "Pull new submissions for ALL enabled forms? This may take a minute.";
    if (!window.confirm(msg)) return;
    setSyncingSubs(true);
    try {
      const body = formUuid ? { form_id: formUuid } : {};
      const d = await af("/api/jotform/submissions/sync", { method: "POST", body });
      showToast("Synced " + d.totalProcessed + " submissions (" + d.totalCreated + " new, " + d.totalUpdated + " updated) across " + d.formsScanned + " form(s)");
      loadConfig(); loadForms();
      if (tab === "submissions") loadSubmissions(true);
    } catch (e) { showToast("Sync failed: " + e.message, "error"); }
    setSyncingSubs(false);
  };

  const runFullRefresh = async () => {
    setFullRefreshModal(false);
    setSyncingSubs(true);
    try {
      const d = await af("/api/jotform/submissions/sync", { method: "POST", body: { full_refresh: true } });
      showToast("Full refresh complete. Processed " + d.totalProcessed + " submissions (" + d.totalCreated + " new, " + d.totalUpdated + " updated) across " + d.formsScanned + " form(s)");
      loadConfig(); loadForms(); loadSyncLog();
      if (tab === "submissions") loadSubmissions(true);
    } catch (e) { showToast("Full refresh failed: " + e.message, "error"); }
    setSyncingSubs(false);
  };

  // Session 24, Step 6: trigger the PDF backfill that sweeps the
  // jotform@ocsaco.com inbox for all PDF emails (not just unread).
  // This may take several minutes. Run multiple times if the result
  // shows processed === maxMessages (more emails remain).
  const runPdfBackfill = async () => {
    if (!window.confirm("Run PDF backfill?\n\nThis sweeps the entire jotform@ocsaco.com inbox and ingests any PDFs that have not yet been captured. May take a few minutes. Run again if the result shows the max was reached.")) return;
    setBackfillingPdfs(true);
    try {
      const d = await af("/api/jotform/pdf-backfill", { method: "POST", body: { maxMessages: 500 } });
      const s = d.summary || {};
      const parts = [
        "Backfill complete.",
        "Processed: " + (d.processed || 0),
        "Matched: " + (s.matched || 0),
        "Skipped: " + (s.skipped || 0),
        "Errors: " + (s.error || 0),
      ];
      if (s.queued_retry) parts.push("Queued retry: " + s.queued_retry);
      if (s.unmatched) parts.push("Unmatched: " + s.unmatched);
      showToast(parts.join(" "));
      if (tab === "submissions") loadSubmissions(true);
    } catch (e) { showToast("Backfill failed: " + e.message, "error"); }
    setBackfillingPdfs(false);
  };

  // Session 24, Step 5c: bulk upload PDFs downloaded from Jotform's UI
  // to fill historical gaps for forms whose notification emails never
  // carried a PDF attachment. Uses a hidden file input + FormData since
  // multipart uploads need raw fetch (af() expects JSON).
  const runBulkPdfUpload = async (files) => {
    setBulkUploading(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("pdfs", f);
      const apiBase = (process.env.REACT_APP_API_URL || "https://ocsa-api-production.up.railway.app");
      const resp = await fetch(apiBase + "/api/jotform/pdf-bulk-upload", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token },
        body: fd,
      });
      if (resp.status === 401) {
        window.dispatchEvent(new Event("ocsa-session-expired"));
        throw new Error("Session expired");
      }
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || "Upload failed with status " + resp.status);
      }
      const data = await resp.json();
      const s = data.summary || {};
      const parts = [
        "Bulk upload complete.",
        "Uploaded: " + (s.uploaded || 0),
        "Skipped: " + (s.skipped || 0),
        "Unmatched: " + (s.unmatched || 0),
        "Errors: " + (s.error || 0),
      ];
      showToast(parts.join(" "));
      if (tab === "submissions") loadSubmissions(true);
    } catch (e) { showToast("Bulk upload failed: " + e.message, "error"); }
    setBulkUploading(false);
  };

  const handleBulkUploadClick = () => {
    if (bulkUploading) return;
    if (!window.confirm("Bulk Upload PDFs\n\nSelect up to 50 PDF files downloaded from Jotform's Submissions > Download as PDFs feature.\n\nFiles must use Jotform's default naming pattern (the submission ID at the start of each filename) so we can match them to submission records. Submissions that already have a PDF will be skipped.")) return;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "application/pdf,.pdf";
    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      if (files.length > 50) {
        showToast("Too many files. Maximum 50 per upload, you selected " + files.length + ".", "error");
        return;
      }
      runBulkPdfUpload(files);
    };
    input.click();
  };

  // Session 24, end-of-session: re-run the auto-link pass that ties
  // unlinked submissions to existing OCSA users by email or exact name.
  // Original auto-link ran once during Session 21 migration and never
  // again, so submissions from existing users (e.g., Sadon Powell)
  // accumulate as "Unmatched" until this button is clicked.
  const runAutoLink = async () => {
    if (!window.confirm("Re-run Auto-Link?\n\nThis scans every unlinked submission and matches it against the OCSA users table by employee ID, email, or exact full name. Ambiguous matches (multiple users) are left unlinked for manual review. Submitters that don't exist in the users table will also remain unlinked.\n\nThis action is safe to run any number of times.")) return;
    setAutoLinking(true);
    try {
      const d = await af("/api/jotform/auto-link", { method: "POST" });
      const s = d.summary || {};
      const parts = [
        "Auto-link complete.",
        "Matched: " + (s.matched || 0),
        "Ambiguous: " + (s.ambiguous || 0),
        "No match: " + (s.no_match || 0),
      ];
      if (s.skipped) parts.push("Skipped: " + s.skipped);
      if (s.matched > 0 && s.by_tier) {
        const bt = s.by_tier;
        const tierParts = [];
        if (bt.employee_id) tierParts.push("ID " + bt.employee_id);
        if (bt.email) tierParts.push("email " + bt.email);
        if (bt.email_alias) tierParts.push("email-alias " + bt.email_alias);
        if (bt.name) tierParts.push("name " + bt.name);
        if (bt.name_alias) tierParts.push("name-alias " + bt.name_alias);
        if (tierParts.length) parts.push("(via " + tierParts.join(", ") + ")");
      }
      showToast(parts.join(" "));
      if (tab === "submissions") loadSubmissions(true);
    } catch (e) { showToast("Auto-link failed: " + e.message, "error"); }
    setAutoLinking(false);
  };

  const saveFormEdit = async () => {
    try {
      const body = {
        category: editForm.category,
        is_enabled: editForm.is_enabled,
        is_onboarding_form: editForm.is_onboarding_form,
        target_role: editForm.target_role || null,
        expiry_days: editForm.expiry_days ? parseInt(editForm.expiry_days, 10) : null,
        requires_annual_renewal: editForm.requires_annual_renewal,
        requires_signature: editForm.requires_signature,
        has_original_pdf: editForm.has_original_pdf !== false,
        notes: editForm.notes || null,
      };
      await af("/api/jotform/forms/" + editForm.id, { method: "PATCH", body });
      showToast("Form updated");
      setEditForm(null); loadForms();
    } catch (e) { showToast(e.message, "error"); }
  };

  const openSubmissionDetail = async (sub) => {
    setDetailSub(sub); setDetailLoading(true);
    try {
      const d = await af("/api/jotform/submissions/" + sub.id);
      setDetailSub(d);
    } catch (e) { showToast("Detail load failed: " + e.message, "error"); }
    setDetailLoading(false);

    // Load active users for the link-to-user dropdown (one-time, cached for this session)
    if (usersForLinking.length === 0) {
      try {
        const us = await af("/api/jotform/users-for-linking");
        setUsersForLinking(us || []);
      } catch (e) { /* dropdown will just be empty if this fails */ }
    }
  };

  const linkSubmissionToUser = async (submissionId, userId) => {
    try {
      // Session 27: response now includes aliases_recorded with per-field status.
      // Surface conflict warnings so the admin knows an alias is mapped elsewhere.
      const linkResp = await af("/api/jotform/submissions/" + submissionId + "/user", { method: "PATCH", body: { user_id: userId } });
      if (userId && linkResp && linkResp.aliases_recorded) {
        const a = linkResp.aliases_recorded;
        const warnings = [];
        if (a.name === "conflict") warnings.push("name alias already mapped to a different user");
        if (a.email === "conflict") warnings.push("email alias already mapped to a different user");
        if (warnings.length > 0) {
          showToast("Linked. Warning: " + warnings.join("; ") + ". Review the Aliases tab to resolve.", "error");
        } else {
          const added = [];
          if (a.name === "added") added.push("name");
          if (a.email === "added") added.push("email");
          showToast(added.length > 0 ? "Linked. New " + added.join(" + ") + " alias recorded." : "Linked to user");
        }
      } else {
        showToast(userId ? "Linked to user" : "Unlinked");
      }
      // Refresh modal + list
      const d = await af("/api/jotform/submissions/" + submissionId);
      setDetailSub(d);
      loadSubmissions(false);
    } catch (e) { showToast("Link failed: " + e.message, "error"); }
  };

  const updateSubmissionStatus = async (id, status) => {
    try { await af("/api/jotform/submissions/" + id, { method: "PATCH", body: { status } }); showToast("Status updated"); loadSubmissions(false); if (detailSub && detailSub.meta && detailSub.meta.id === id) openSubmissionDetail({ id }); }
    catch (e) { showToast(e.message, "error"); }
  };

  const unlinkSubmission = async (id) => {
    if (!window.confirm("Remove the link for this submission?")) return;
    try { await af("/api/jotform/submissions/" + id + "/link", { method: "DELETE" }); showToast("Unlinked"); loadSubmissions(false); if (detailSub && detailSub.meta) openSubmissionDetail({ id }); }
    catch (e) { showToast(e.message, "error"); }
  };

  const submitLink = async () => {
    if (!linkModal.entity_type || !linkModal.entity_id) { showToast("Select entity type and ID", "error"); return; }
    try {
      await af("/api/jotform/submissions/" + linkModal.submission_id + "/link", {
        method: "POST",
        body: { entity_type: linkModal.entity_type, entity_id: linkModal.entity_id }
      });
      showToast("Linked");
      setLinkModal(null);
      loadSubmissions(false);
    } catch (e) { showToast(e.message, "error"); }
  };

  // Session 21: fetch PDF as blob (binary payload, bypasses af which expects JSON)
  const fetchPdfBlob = async (submissionId, action) => {
    const url = (process.env.REACT_APP_API_URL || "https://ocsa-api-production.up.railway.app") +
      "/api/jotform/submissions/" + submissionId + "/pdf?action=" + action;
    const r = await fetch(url, { headers: { "Authorization": "Bearer " + token } });
    if (r.status === 401) { window.dispatchEvent(new Event("ocsa-session-expired")); throw new Error("Session expired"); }
    // Session 24: 202 means PDF not yet captured by email ingestion (still pending)
    if (r.status === 202) {
      const body = await r.json().catch(() => ({}));
      const err = new Error(body.message || "PDF is being captured, check back in a few minutes.");
      err.pdfPending = true;
      throw err;
    }
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || "PDF fetch failed (status " + r.status + ")");
    }
    return await r.blob();
  };

  const viewPdf = async (submissionId) => {
    setPdfBusy(true);
    try {
      const blob = await fetchPdfBlob(submissionId, "view");
      const blobUrl = URL.createObjectURL(blob);
      const w = window.open(blobUrl, "_blank");
      if (!w) showToast("Popup blocked. Allow popups to view PDFs.", "error");
      // Revoke after a delay so the new tab has time to load
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (e) { showToast(e.message, e.pdfPending ? "success" : "error"); }
    setPdfBusy(false);
  };

  const downloadPdf = async (submissionId, filenameHint) => {
    setPdfBusy(true);
    try {
      const blob = await fetchPdfBlob(submissionId, "download");
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = (filenameHint || "submission") + ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      showToast("Download started");
    } catch (e) { showToast(e.message, e.pdfPending ? "success" : "error"); }
    setPdfBusy(false);
  };

  const printPdf = async (submissionId) => {
    setPdfBusy(true);
    try {
      const blob = await fetchPdfBlob(submissionId, "print");
      const blobUrl = URL.createObjectURL(blob);
      const w = window.open(blobUrl, "_blank");
      if (!w) { showToast("Popup blocked. Allow popups to print PDFs.", "error"); return; }
      // Give the new window time to load the PDF, then trigger print
      w.addEventListener("load", () => { try { w.print(); } catch (e) { /* browser will handle */ } });
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (e) { showToast(e.message, e.pdfPending ? "success" : "error"); }
    setPdfBusy(false);
  };

  const statusBadge = (status) => {
    const colors = { new: BL, reviewed: t.textMut, linked: GR, archived: t.textMut };
    return <Bdg l={status} c={colors[status] || t.textMut} />;
  };

  const tabs = [
    { id: "library", l: "Form Library" },
    { id: "submissions", l: "Submissions" },
    { id: "pdf_access", l: "PDF Access Log" },
    { id: "settings", l: "Settings" },
    { id: "sync_diagnostic", l: "Sync Diagnostic" },
    { id: "aliases", l: "Aliases" },
    { id: "incident_reports", l: "Incident reports" },
  ];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <SecT t={t}>Forms & Jotform Integration</SecT>

      {/* PII WARNING BANNER */}
      <div style={{ padding: "10px 14px", borderRadius: 8, background: t.orangeSubtle, border: "1px solid " + t.orangeBorder, fontSize: 11, color: OR, marginBottom: 14, lineHeight: 1.5 }}>
        <strong>Privacy note.</strong> Submission content (SSN, bank info, dates of birth) is stored only in Jotform. OCSA caches metadata only. Opening a submission detail below fetches the full answers from Jotform in real time. Close the modal when done.
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid " + (tab === tb.id ? GO : t.border), background: tab === tb.id ? t.goldBg : "transparent", color: tab === tb.id ? t.goldText : t.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{tb.l}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {tab === "library" && <Btn t={t} v="ghost" onClick={syncForms} disabled={syncingForms} style={{ fontSize: 12, padding: "8px 14px" }}>{syncingForms ? "Syncing..." : "Sync Forms from Jotform"}</Btn>}
          {tab === "submissions" && <Btn t={t} v="ghost" onClick={() => syncSubmissions(null)} disabled={syncingSubs} style={{ fontSize: 12, padding: "8px 14px" }}>{syncingSubs ? "Syncing..." : "Sync All Submissions"}</Btn>}
          {tab === "submissions" && <Btn t={t} v="ghost" onClick={runAutoLink} disabled={autoLinking} style={{ fontSize: 12, padding: "8px 14px" }}>{autoLinking ? "Linking..." : "Re-run Auto-Link"}</Btn>}
          {tab === "submissions" && <Btn t={t} v="ghost" onClick={runPdfBackfill} disabled={backfillingPdfs} style={{ fontSize: 12, padding: "8px 14px" }}>{backfillingPdfs ? "Backfilling..." : "Run PDF Backfill"}</Btn>}
          {tab === "submissions" && <Btn t={t} v="ghost" onClick={handleBulkUploadClick} disabled={bulkUploading} style={{ fontSize: 12, padding: "8px 14px" }}>{bulkUploading ? "Uploading..." : "Bulk Upload PDFs"}</Btn>}
        </div>
      </div>

      {/* CONFIG STATUS STRIP */}
      {config && (
        <Crd t={t} style={{ marginBottom: 14, padding: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", fontSize: 12 }}>
            <div><span style={{ color: t.textMut }}>Key: </span>{config.hasKey ? (config.keyValid ? <span style={{ color: GR, fontWeight: 600 }}>Valid</span> : <span style={{ color: RD, fontWeight: 600 }}>Invalid</span>) : <span style={{ color: RD, fontWeight: 600 }}>Not set</span>}</div>
            {config.apiUserInfo && <div><span style={{ color: t.textMut }}>Jotform: </span><span style={{ color: t.text }}>{config.apiUserInfo.email}</span></div>}
            <div><span style={{ color: t.textMut }}>Forms: </span><span style={{ color: t.text }}>{config.formsCount}</span> ({config.enabledCount} enabled)</div>
            <div><span style={{ color: t.textMut }}>Submissions: </span><span style={{ color: t.text }}>{config.submissionsCount}</span> ({config.newSubmissionsCount} new)</div>
            <div><span style={{ color: t.textMut }}>Last Sync: </span><span style={{ color: t.text }}>{fmtDT(config.lastFormSync)}</span></div>
          </div>
        </Crd>
      )}

      {config && !config.hasKey && (
        <Crd t={t} style={{ marginBottom: 14, padding: 14, borderLeft: "3px solid " + RD }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: RD, marginBottom: 4 }}>JOTFORM_API_KEY not configured</div>
          <div style={{ fontSize: 12, color: t.textSec, lineHeight: 1.5 }}>Add the environment variable JOTFORM_API_KEY in Railway, then reload this page. Generate a Full Access key from jotform.com under Settings then API.</div>
        </Crd>
      )}

      {/* ================ LIBRARY TAB ================ */}
      {tab === "library" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ minWidth: 200 }}>
              <Sel options={[{ v: "", l: "All categories" }, ...CATEGORY_OPTS]} value={libFilters.category} onChange={e => setLibFilters({ ...libFilters, category: e.target.value })} t={t} />
            </div>
            <div style={{ minWidth: 160 }}>
              <Sel options={[{ v: "", l: "Enabled: Any" }, { v: "true", l: "Enabled only" }, { v: "false", l: "Disabled only" }]} value={libFilters.enabled} onChange={e => setLibFilters({ ...libFilters, enabled: e.target.value })} t={t} />
            </div>
            <div style={{ minWidth: 180 }}>
              <Sel options={[{ v: "", l: "Onboarding: Any" }, { v: "true", l: "Onboarding only" }, { v: "false", l: "Non-onboarding" }]} value={libFilters.onboarding} onChange={e => setLibFilters({ ...libFilters, onboarding: e.target.value })} t={t} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Inp t={t} placeholder="Search titles or notes..." value={libFilters.search} onChange={e => setLibFilters({ ...libFilters, search: e.target.value })} />
            </div>
          </div>

          <div style={{ background: t.card, borderRadius: 12, border: "1px solid " + t.border, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "1px solid " + t.border }}>
                {["Title", "Category", "Status", "Onboarding", "Expiry", "Submissions", "Last Sync", ""].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: t.textMut, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>)}
              </tr></thead>
              <tbody>{forms.map(f => (
                <tr key={f.id} style={{ borderBottom: "1px solid " + t.border }}>
                  <td style={{ padding: "10px 12px", color: t.text, fontWeight: 500 }}>{f.title}</td>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 12 }}>{catLabel(f.category)}</td>
                  <td style={{ padding: "10px 12px" }}>{f.is_enabled ? <Bdg l="Enabled" c={GR} /> : <Bdg l="Disabled" c={t.textMut} />}</td>
                  <td style={{ padding: "10px 12px" }}>{f.is_onboarding_form ? <Bdg l="Onboarding" c={BL} /> : <span style={{ color: t.textMut, fontSize: 11 }}>--</span>}</td>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 12 }}>{f.expiry_days ? f.expiry_days + " days" : (f.requires_annual_renewal ? "Annual" : "--")}</td>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 12 }}>{f.last_submission_count || 0}</td>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 11 }}>{fmtDT(f.last_synced_at)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button onClick={() => syncSubmissions(f.id)} disabled={syncingSubs} style={{ background: "none", border: "none", color: BL, cursor: "pointer", marginRight: 8, fontSize: 12 }}>Pull</button>
                    <button onClick={() => setEditForm({ ...f })} style={{ background: "none", border: "none", color: t.goldText, cursor: "pointer", fontSize: 12 }}>Edit</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {forms.length === 0 && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>No forms found. Click "Sync Forms from Jotform" to pull your account's forms.</div>}
          </div>
        </div>
      )}

      {/* ================ SUBMISSIONS TAB ================ */}
      {tab === "submissions" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ minWidth: 220 }}>
              <Sel options={[{ v: "", l: "All forms" }, ...forms.map(f => ({ v: f.id, l: f.title }))]} value={subFilters.form_id} onChange={e => setSubFilters({ ...subFilters, form_id: e.target.value })} t={t} />
            </div>
            <div style={{ minWidth: 150 }}>
              <Sel options={STATUS_OPTS} value={subFilters.status} onChange={e => setSubFilters({ ...subFilters, status: e.target.value })} t={t} />
            </div>
            <div style={{ minWidth: 150 }}>
              <Sel options={[{ v: "", l: "Link: Any" }, { v: "true", l: "Linked only" }, { v: "false", l: "Unlinked only" }]} value={subFilters.linked} onChange={e => setSubFilters({ ...subFilters, linked: e.target.value })} t={t} />
            </div>
            <Inp t={t} type="date" value={subFilters.date_start} onChange={e => setSubFilters({ ...subFilters, date_start: e.target.value })} style={{ width: 150 }} />
            <Inp t={t} type="date" value={subFilters.date_end} onChange={e => setSubFilters({ ...subFilters, date_end: e.target.value })} style={{ width: 150 }} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <Inp t={t} placeholder="Search name, email, form..." value={subFilters.search} onChange={e => setSubFilters({ ...subFilters, search: e.target.value })} />
            </div>
          </div>

          <div style={{ background: t.card, borderRadius: 12, border: "1px solid " + t.border, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "1px solid " + t.border }}>
                {["Submitted", "Form", "Submitter", "Matched Employee", "Status", "Link", "Expiry", ""].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: t.textMut, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>)}
              </tr></thead>
              <tbody>{submissions.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid " + t.border }}>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 12 }}>{fmtDT(s.submitted_at)}</td>
                  <td style={{ padding: "10px 12px", color: t.text, fontSize: 12 }}>{s.form_title || s.jotform_form_id}</td>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 12 }}>{s.submitter_name || <span style={{ color: t.textMut }}>unknown</span>}<div style={{ fontSize: 10, color: t.textMut }}>{s.submitter_email || ""}</div></td>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 12 }}>{s.user_id ? <span>{s.first_name + " " + s.last_name}{s.user_employee_id ? <div style={{ fontSize: 10, color: t.textMut, fontFamily: "monospace" }}>{s.user_employee_id}</div> : null}</span> : <span style={{ color: OR, fontStyle: "italic" }}>Unmatched</span>}</td>
                  <td style={{ padding: "10px 12px" }}>{statusBadge(s.status)}</td>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 11 }}>{s.linked_entity_type ? <span>{s.linked_entity_type.replace(/_/g, " ")}</span> : <span style={{ color: t.textMut }}>--</span>}</td>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 11 }}>{s.expiry_date ? fmtDate(s.expiry_date) : "--"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button onClick={() => openSubmissionDetail(s)} style={{ background: "none", border: "none", color: BL, cursor: "pointer", fontSize: 12 }}>View</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {submissions.length === 0 && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>No submissions found. Click "Sync All Submissions" above to pull the latest.</div>}
          </div>

          {submissionsTotal > submissions.length && (
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: t.textMut }}>Showing {submissions.length} of {submissionsTotal}</div>
            </div>
          )}
        </div>
      )}

      {/* ================ PDF ACCESS LOG TAB (Session 21) ================ */}
      {tab === "pdf_access" && (
        <div>
          <div style={{ padding: "10px 14px", borderRadius: 8, background: t.greenSubtle, border: "1px solid " + t.greenBorder, fontSize: 11, color: GR, marginBottom: 14, lineHeight: 1.5 }}>
            <strong>Proof of who opened each PDF.</strong> Every view, download, and print of an original Jotform PDF is recorded here with user, timestamp, IP, and success status. This log is append-only and survives submission deletion via text snapshots.
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ minWidth: 160 }}>
              <Sel options={[{ v: "", l: "All actions" }, { v: "view", l: "View" }, { v: "download", l: "Download" }, { v: "print", l: "Print" }]} value={pdfFilters.access_type} onChange={e => setPdfFilters({ ...pdfFilters, access_type: e.target.value })} t={t} />
            </div>
            <div style={{ minWidth: 160 }}>
              <Sel options={[{ v: "", l: "Any result" }, { v: "true", l: "Success only" }, { v: "false", l: "Failed only" }]} value={pdfFilters.success} onChange={e => setPdfFilters({ ...pdfFilters, success: e.target.value })} t={t} />
            </div>
            <Inp t={t} type="date" value={pdfFilters.date_start} onChange={e => setPdfFilters({ ...pdfFilters, date_start: e.target.value })} style={{ width: 150 }} />
            <Inp t={t} type="date" value={pdfFilters.date_end} onChange={e => setPdfFilters({ ...pdfFilters, date_end: e.target.value })} style={{ width: 150 }} />
            <Btn t={t} v="ghost" onClick={() => loadPdfAccessLog(true)} style={{ fontSize: 12, padding: "8px 14px" }}>Refresh</Btn>
          </div>

          <div style={{ background: t.card, borderRadius: 12, border: "1px solid " + t.border, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "1px solid " + t.border }}>
                {["When", "User", "Action", "Form", "Submitter", "Result", "IP"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: t.textMut, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>)}
              </tr></thead>
              <tbody>{pdfAccessLog.map(e => (
                <tr key={e.id} style={{ borderBottom: "1px solid " + t.border }}>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 12 }}>{fmtDT(e.accessed_at)}</td>
                  <td style={{ padding: "10px 12px", color: t.text, fontSize: 12 }}>{e.first_name ? (e.first_name + " " + e.last_name) : <span style={{ color: t.textMut, fontStyle: "italic" }}>deleted user</span>}<div style={{ fontSize: 10, color: t.textMut }}>{e.user_email || ""}</div></td>
                  <td style={{ padding: "10px 12px" }}><Bdg l={e.access_type} c={e.access_type === "view" ? BL : e.access_type === "download" ? GO : TL} /></td>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 12 }}>{e.form_title || <span style={{ color: t.textMut, fontFamily: "monospace", fontSize: 10 }}>{e.jotform_form_id}</span>}</td>
                  <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 12 }}>{e.submitter_name || <span style={{ color: t.textMut }}>--</span>}</td>
                  <td style={{ padding: "10px 12px" }}>{e.success ? <Bdg l="success" c={GR} /> : <Bdg l="failed" c={RD} />}{!e.success && e.error_message && <div style={{ fontSize: 10, color: RD, marginTop: 2, maxWidth: 280 }}>{e.error_message}</div>}</td>
                  <td style={{ padding: "10px 12px", color: t.textMut, fontSize: 11, fontFamily: "monospace" }}>{e.ip_address || "--"}</td>
                </tr>
              ))}</tbody>
            </table>
            {pdfAccessLog.length === 0 && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>No PDF access events recorded yet. Events appear here as soon as anyone views, downloads, or prints a submission PDF.</div>}
          </div>

          {pdfAccessTotal > pdfAccessLog.length && (
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: t.textMut }}>Showing {pdfAccessLog.length} of {pdfAccessTotal}</div>
            </div>
          )}
        </div>
      )}

      {/* ================ SETTINGS TAB ================ */}
      {tab === "settings" && (
        <div>
          <Crd t={t} style={{ marginBottom: 14, padding: 16 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>API Connection</div>
            {config && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                <div><div style={{ color: t.textMut, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Key Status</div><div style={{ color: config.hasKey ? (config.keyValid ? GR : RD) : RD, fontWeight: 600 }}>{config.hasKey ? (config.keyValid ? "Valid" : "Invalid") : "Not set"}</div></div>
                {config.apiUserInfo && (<>
                  <div><div style={{ color: t.textMut, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Jotform Account</div><div style={{ color: t.text }}>{config.apiUserInfo.email}</div></div>
                  <div><div style={{ color: t.textMut, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Account Type</div><div style={{ color: t.text }}>{config.apiUserInfo.accountType}</div></div>
                  <div><div style={{ color: t.textMut, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Username</div><div style={{ color: t.text }}>{config.apiUserInfo.username}</div></div>
                </>)}
              </div>
            )}
          </Crd>

          <Crd t={t} style={{ marginBottom: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text }}>Sync Actions</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn t={t} onClick={syncForms} disabled={syncingForms}>{syncingForms ? "Syncing..." : "Sync Form Catalog"}</Btn>
              <Btn t={t} v="ghost" onClick={() => syncSubmissions(null)} disabled={syncingSubs}>{syncingSubs ? "Syncing..." : "Sync All Submissions"}</Btn>
              <Btn t={t} v="danger" onClick={() => setFullRefreshModal(true)} disabled={syncingSubs}>{syncingSubs ? "Running..." : "Full Refresh"}</Btn>
            </div>
            <div style={{ fontSize: 11, color: t.textMut, marginTop: 8, lineHeight: 1.5 }}>Form catalog sync pulls the list of Jotform forms. Submissions sync pulls only new or updated submissions for enabled forms. Full Refresh bypasses the incremental filter and re-pulls every submission for every enabled form (use sparingly, see warning).</div>
          </Crd>

          {/* ================ DIAGNOSTIC CARD (Session 21 Part B Step 1) ================ */}
          <Crd t={t} style={{ marginBottom: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text }}>Account Capability Diagnostic</div>
              <Btn t={t} v="ghost" onClick={runDiagnostic} disabled={runningDiagnostic} style={{ fontSize: 12, padding: "6px 14px" }}>{runningDiagnostic ? "Probing..." : "Run Diagnostic"}</Btn>
            </div>
            <div style={{ fontSize: 11, color: t.textMut, marginBottom: 10, lineHeight: 1.5 }}>
              Probes the Jotform API to determine which filtering mechanism this account supports: labels, folders, or keyword-based fallback. The recommendation drives how we filter the platform to show OCSA Cleaning forms only (separate from OCSA Construction and My Choice for Living).
            </div>

            {diagnosticResult && (
              <div style={{ marginTop: 12 }}>
                <div style={{ padding: "10px 14px", borderRadius: 8, background: t.goldBg, border: "1px solid " + t.goldBorder, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 4 }}>Recommendation</div>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: t.goldText, marginBottom: 4 }}>{diagnosticResult.recommendation}</div>
                  <div style={{ fontSize: 12, color: t.textSec, lineHeight: 1.5 }}>{diagnosticResult.recommendationReason}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ padding: 10, borderRadius: 8, background: t.hover, border: "1px solid " + t.border }}>
                    <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 4 }}>Labels API</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: diagnosticResult.tests.userLabels && diagnosticResult.tests.userLabels.success ? GR : RD }}>{diagnosticResult.tests.userLabels && diagnosticResult.tests.userLabels.success ? "Works" : "Not available"}</div>
                    <div style={{ fontSize: 11, color: t.textSec, marginTop: 4 }}>{diagnosticResult.tests.userLabels && diagnosticResult.tests.userLabels.success ? (diagnosticResult.tests.userLabels.count + " labels returned") : (diagnosticResult.tests.userLabels && diagnosticResult.tests.userLabels.error ? diagnosticResult.tests.userLabels.error : "--")}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: t.hover, border: "1px solid " + t.border }}>
                    <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 4 }}>Folders API</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: diagnosticResult.tests.userFolders && diagnosticResult.tests.userFolders.success ? GR : RD }}>{diagnosticResult.tests.userFolders && diagnosticResult.tests.userFolders.success ? "Works" : "Not available"}</div>
                    <div style={{ fontSize: 11, color: t.textSec, marginTop: 4 }}>{diagnosticResult.tests.userFolders && diagnosticResult.tests.userFolders.success ? (diagnosticResult.tests.userFolders.count + " folders found") : (diagnosticResult.tests.userFolders && diagnosticResult.tests.userFolders.error ? diagnosticResult.tests.userFolders.error : "--")}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: t.hover, border: "1px solid " + t.border }}>
                    <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 4 }}>Form Detail</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: diagnosticResult.tests.formFull && diagnosticResult.tests.formFull.success ? GR : RD }}>{diagnosticResult.tests.formFull && diagnosticResult.tests.formFull.success ? "Works" : "Not available"}</div>
                    <div style={{ fontSize: 11, color: t.textSec, marginTop: 4 }}>{diagnosticResult.analysis && diagnosticResult.analysis.sampledFormId ? ("Sampled: " + (diagnosticResult.analysis.sampledFormTitle || diagnosticResult.analysis.sampledFormId)) : "--"}</div>
                  </div>
                </div>

                {diagnosticResult.analysis && diagnosticResult.analysis.labelNamesFound && diagnosticResult.analysis.labelNamesFound.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 4 }}>Labels found</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {diagnosticResult.analysis.labelNamesFound.map((n, idx) => (<Bdg key={idx} l={n} c={String(n).toLowerCase().includes("ocsa cleaning") ? GR : t.textMut} />))}
                    </div>
                  </div>
                )}

                {diagnosticResult.analysis && diagnosticResult.analysis.folderNamesFound && diagnosticResult.analysis.folderNamesFound.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 4 }}>Folders found</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {diagnosticResult.analysis.folderNamesFound.map((n, idx) => (<Bdg key={idx} l={n} c={String(n).toLowerCase().includes("ocsa cleaning") ? GR : t.textMut} />))}
                    </div>
                  </div>
                )}

                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer", fontSize: 11, color: t.textMut }}>Raw JSON (paste this back to Claude for Step 2 implementation)</summary>
                  <pre style={{ marginTop: 8, padding: 12, borderRadius: 8, background: t.bg, border: "1px solid " + t.border, fontSize: 10, color: t.textSec, overflow: "auto", maxHeight: 400, fontFamily: "monospace" }}>{JSON.stringify(diagnosticResult, null, 2)}</pre>
                </details>
              </div>
            )}
          </Crd>

          <Crd t={t} style={{ padding: 16 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Recent Sync Log</div>
            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ borderBottom: "1px solid " + t.border }}>
                  {["Started", "Type", "Form", "Status", "Processed", "New", "Updated", "Error", "Triggered By"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>)}
                </tr></thead>
                <tbody>{syncLog.map(l => (
                  <tr key={l.id} style={{ borderBottom: "1px solid " + t.border }}>
                    <td style={{ padding: "8px 10px", color: t.textSec, fontSize: 11 }}>{fmtDT(l.started_at)}</td>
                    <td style={{ padding: "8px 10px", color: t.text, fontSize: 11 }}>{l.sync_type}</td>
                    <td style={{ padding: "8px 10px", color: t.textSec, fontSize: 11 }}>{l.form_title || "--"}</td>
                    <td style={{ padding: "8px 10px" }}><Bdg l={l.status} c={l.status === "success" ? GR : l.status === "failed" ? RD : OR} /></td>
                    <td style={{ padding: "8px 10px", color: t.textSec, fontSize: 11 }}>{l.records_processed}</td>
                    <td style={{ padding: "8px 10px", color: t.textSec, fontSize: 11 }}>{l.records_created}</td>
                    <td style={{ padding: "8px 10px", color: t.textSec, fontSize: 11 }}>{l.records_updated}</td>
                    <td style={{ padding: "8px 10px", color: RD, fontSize: 11 }}>{l.error_message || ""}</td>
                    <td style={{ padding: "8px 10px", color: t.textSec, fontSize: 11 }}>{l.triggered_by_name || "--"}</td>
                  </tr>
                ))}</tbody>
              </table>
              {syncLog.length === 0 && <div style={{ padding: 20, textAlign: "center", color: t.textMut, fontSize: 12 }}>No sync operations yet.</div>}
            </div>
          </Crd>
        </div>
      )}

      {/* ================ SYNC DIAGNOSTIC TAB (Session 26) ================ */}
      {tab === "sync_diagnostic" && (
        <div>
          {/* HEADER WITH REFRESH BUTTON AND TIMESTAMP */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: t.textMut }}>
              {diagGeneratedAt ? "Last refreshed: " + fmtDT(diagGeneratedAt) : (diagLoading ? "Loading..." : "Not yet loaded")}
            </div>
            <Btn t={t} v="ghost" onClick={loadSyncDiagnostic} disabled={diagLoading} style={{ fontSize: 12, padding: "6px 14px" }}>
              {diagLoading ? "Refreshing..." : "Refresh Diagnostic"}
            </Btn>
          </div>

          {/* SUMMARY TILES */}
          {diagSummary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
              <Crd t={t} style={{ padding: 14 }}>
                <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 4 }}>Total Forms</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600, color: t.text }}>{diagSummary.total_forms}</div>
              </Crd>
              <Crd t={t} style={{ padding: 14, borderLeft: "3px solid " + (diagSummary.forms_with_gap > 0 ? OR : GR) }}>
                <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 4 }}>Forms with Gaps</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600, color: diagSummary.forms_with_gap > 0 ? OR : GR }}>{diagSummary.forms_with_gap}</div>
              </Crd>
              <Crd t={t} style={{ padding: 14 }}>
                <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 4 }}>Jotform Submissions</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600, color: t.text }}>{diagSummary.total_jotform_submissions}</div>
              </Crd>
              <Crd t={t} style={{ padding: 14 }}>
                <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 4 }}>Our Submissions</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600, color: t.text }}>{diagSummary.total_our_submissions}</div>
              </Crd>
              <Crd t={t} style={{ padding: 14, borderLeft: "3px solid " + (diagSummary.total_unresolved_failures > 0 ? RD : GR) }}>
                <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 4 }}>Unresolved Failures</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600, color: diagSummary.total_unresolved_failures > 0 ? RD : GR }}>{diagSummary.total_unresolved_failures}</div>
              </Crd>
            </div>
          )}

          {/* HOW TO READ */}
          <div style={{ padding: "10px 14px", borderRadius: 8, background: t.hover, fontSize: 11, color: t.textSec, marginBottom: 14, lineHeight: 1.6 }}>
            <strong style={{ color: t.text }}>How to read this. </strong>
            The Jotform Count is what Jotform's API reports for each form. The Our Count is what we have stored. A positive Delta means Jotform has submissions we never picked up. Click "Show Missing IDs" to see which specific submissions are missing and Force Fetch them one at a time. Unresolved Failures are submissions the sync attempted to insert but errored on. Use the Failures table below to retry or dismiss them.
          </div>

          {/* PER-FORM GAP TABLE */}
          <Crd t={t} style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
            <div style={{ fontFamily: FONT_HEAD, padding: "12px 16px", borderBottom: "1px solid " + t.border, fontSize: 13, fontWeight: 600, color: t.text }}>
              Per-Form Gap Analysis
            </div>
            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ borderBottom: "1px solid " + t.border, background: t.hover }}>
                  {["Form Title", "Last Synced", "Jotform", "Ours", "Delta", "Failures", ""].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {diagForms.map(f => {
                    const isExpanded = expandedFormId === f.form_id;
                    const deltaColor = f.delta === null ? t.textMut : (f.delta > 0 ? OR : (f.delta < 0 ? RD : GR));
                    const deltaText = f.delta === null ? "?" : (f.delta > 0 ? "+" + f.delta : String(f.delta));
                    const accentColor = f.has_gap ? OR : (f.has_overshoot ? RD : (f.not_in_jotform ? t.textMut : "transparent"));
                    return (
                      <Fragment key={f.form_id}>
                        <tr style={{ borderBottom: "1px solid " + t.border, borderLeft: "3px solid " + accentColor }}>
                          <td style={{ padding: "10px 12px", color: t.text, fontWeight: 500 }}>{f.title}</td>
                          <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 11 }}>{fmtDT(f.submissions_last_synced_at)}</td>
                          <td style={{ padding: "10px 12px", color: t.textSec }}>{f.jotform_count === null ? "?" : f.jotform_count}</td>
                          <td style={{ padding: "10px 12px", color: t.textSec }}>{f.our_count}</td>
                          <td style={{ padding: "10px 12px", color: deltaColor, fontWeight: 600 }}>{deltaText}</td>
                          <td style={{ padding: "10px 12px", color: f.unresolved_failure_count > 0 ? RD : t.textMut }}>{f.unresolved_failure_count}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                            {f.unresolved_failure_count > 0 && (
                              <button
                                onClick={() => resolveAllFailuresForForm(f.form_id, f.title, f.unresolved_failure_count)}
                                disabled={bulkResolvingFormId === f.form_id}
                                style={{ background: "none", border: "none", color: OR, cursor: bulkResolvingFormId === f.form_id ? "wait" : "pointer", fontSize: 12, marginRight: 12 }}
                                title={"Bulk-resolve all " + f.unresolved_failure_count + " unresolved failure(s) for this form"}
                              >
                                {bulkResolvingFormId === f.form_id ? "Resolving..." : "Resolve all"}
                              </button>
                            )}
                            <button onClick={() => {
                              if (isExpanded) { setExpandedFormId(null); setExpandedFormData(null); }
                              else { setExpandedFormId(f.form_id); loadMissingIds(f.form_id); }
                            }} style={{ background: "none", border: "none", color: BL, cursor: "pointer", fontSize: 12 }}>
                              {isExpanded ? "Hide" : "Show Missing IDs"}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} style={{ padding: 0, background: t.bg }}>
                              <div style={{ padding: 16 }}>
                                {expandedFormLoading && <div style={{ color: t.textMut, fontSize: 12, padding: 12 }}>Fetching from Jotform. This may take a moment for forms with many submissions...</div>}
                                {!expandedFormLoading && expandedFormData && (
                                  <div>
                                    <div style={{ fontSize: 11, color: t.textSec, marginBottom: 10, padding: "6px 10px", background: t.hover, borderRadius: 6 }}>
                                      Jotform: <strong style={{ color: t.text }}>{expandedFormData.jotform_count}</strong>
                                      {" | "}Ours: <strong style={{ color: t.text }}>{expandedFormData.our_count}</strong>
                                      {" | "}Missing: <strong style={{ color: expandedFormData.missing_count > 0 ? OR : GR }}>{expandedFormData.missing_count}</strong>
                                      {expandedFormData.orphan_count > 0 && <span> {" | "}<span style={{ color: RD }}>Orphan (in our DB but not Jotform): {expandedFormData.orphan_count}</span></span>}
                                      {expandedFormData.fetch_error && <span> {" | "}<span style={{ color: RD }}>Fetch error: {expandedFormData.fetch_error}</span></span>}
                                    </div>
                                    {expandedFormData.missing.length === 0 ? (
                                      <div style={{ padding: 20, textAlign: "center", color: GR, fontSize: 12 }}>No missing submissions. This form is in sync.</div>
                                    ) : (
                                      <div style={{ overflow: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                          <thead><tr style={{ borderBottom: "1px solid " + t.border }}>
                                            {["Jotform Submission ID", "Submitted", "Submitter Name", "Email", ""].map(h => (
                                              <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                                            ))}
                                          </tr></thead>
                                          <tbody>
                                            {expandedFormData.missing.map(m => (
                                              <tr key={m.jotform_submission_id} style={{ borderBottom: "1px solid " + t.border }}>
                                                <td style={{ padding: "8px 10px", color: t.text, fontFamily: "monospace", fontSize: 10 }}>{m.jotform_submission_id}</td>
                                                <td style={{ padding: "8px 10px", color: t.textSec }}>{fmtDT(m.created_at)}</td>
                                                <td style={{ padding: "8px 10px", color: t.textSec }}>{m.submitter_name || "--"}</td>
                                                <td style={{ padding: "8px 10px", color: t.textSec, fontSize: 10 }}>{m.submitter_email || "--"}</td>
                                                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                                                  <button
                                                    onClick={() => forceFetchSubmission(m.jotform_submission_id, f.form_id)}
                                                    disabled={!!forceFetchingIds[m.jotform_submission_id]}
                                                    style={{ background: GO, border: "none", color: NAVY, cursor: forceFetchingIds[m.jotform_submission_id] ? "wait" : "pointer", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6 }}>
                                                    {forceFetchingIds[m.jotform_submission_id] ? "Fetching..." : "Force Fetch"}
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!diagLoading && diagForms.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: t.textMut, fontSize: 12 }}>
                {diagSummary === null ? "Click Refresh Diagnostic to load." : "No enabled forms to diagnose."}
              </div>
            )}
          </Crd>

          {/* UNRESOLVED FAILURES TABLE */}
          <Crd t={t} style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text }}>Unresolved Submission Failures</div>
              <div style={{ fontSize: 11, color: t.textMut }}>{failures.length} {failures.length === 1 ? "failure" : "failures"}</div>
            </div>
            {failures.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: GR, fontSize: 12 }}>
                {failuresLoading ? "Loading..." : "No unresolved failures. Sync is healthy."}
              </div>
            ) : (
              <div style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "1px solid " + t.border, background: t.hover }}>
                    {["Submission ID", "Form", "Stage", "Reason", "Attempted", "Already Synced?", ""].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {failures.map(fl => (
                      <tr key={fl.id} style={{ borderBottom: "1px solid " + t.border }}>
                        <td style={{ padding: "10px 12px", color: t.text, fontFamily: "monospace", fontSize: 10 }}>{fl.jotform_submission_id}</td>
                        <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 11 }}>{fl.form_title || "--"}</td>
                        <td style={{ padding: "10px 12px" }}><Bdg l={fl.failure_stage} c={fl.failure_stage === "fetch" ? OR : RD} /></td>
                        <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 11, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={fl.failure_reason}>{fl.failure_reason}</td>
                        <td style={{ padding: "10px 12px", color: t.textSec, fontSize: 11 }}>{fmtDT(fl.attempted_at)}</td>
                        <td style={{ padding: "10px 12px" }}>{fl.exists_in_submissions ? <Bdg l="Yes" c={GR} /> : <Bdg l="No" c={RD} />}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <button onClick={() => retryFailure(fl.id)} disabled={retryingFailureId === fl.id} style={{ background: "none", border: "none", color: BL, cursor: retryingFailureId === fl.id ? "wait" : "pointer", marginRight: 8, fontSize: 12 }}>
                            {retryingFailureId === fl.id ? "Retrying..." : "Retry"}
                          </button>
                          <button onClick={() => resolveFailure(fl.id)} disabled={resolvingFailureId === fl.id} style={{ background: "none", border: "none", color: t.textMut, cursor: resolvingFailureId === fl.id ? "wait" : "pointer", fontSize: 12 }}>
                            {resolvingFailureId === fl.id ? "..." : "Dismiss"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Crd>
        </div>
      )}

      {/* ================ SESSION 27: ALIASES TAB ================ */}
      {tab === "incident_reports" && <IncidentReportsTab af={af} token={token} t={t} sites={sites} openId={irOpenId} openRow={irOpenRow} onOpen={(id, row) => { setIrOpenId(id); setIrOpenRow(row || null); if (onRoute) onRoute(["reports", id]); }} onClose={() => { setIrOpenId(null); setIrOpenRow(null); if (onRoute) onRoute(["reports"]); }} />}

      {tab === "aliases" && (
        <div>
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: t.textMut }}>
              {aliasesLoading ? "Loading..." : aliases.length + " " + (aliases.length === 1 ? "alias" : "aliases") + " across " + (new Set(aliases.map(a => a.user_id)).size) + " " + (new Set(aliases.map(a => a.user_id)).size === 1 ? "user" : "users")}
            </div>
            <Btn t={t} v="ghost" onClick={loadAliases} disabled={aliasesLoading} style={{ fontSize: 12, padding: "6px 14px" }}>
              {aliasesLoading ? "Refreshing..." : "Refresh"}
            </Btn>
          </div>

          {/* EXPLAINER */}
          <div style={{ padding: "10px 14px", borderRadius: 8, background: t.hover, fontSize: 11, color: t.textSec, marginBottom: 14, lineHeight: 1.6 }}>
            <strong style={{ color: t.text }}>How aliases work. </strong>
            When a submitter's name or email does not exactly match a user record, auto-link falls back to the alias table. Aliases are added in two ways: (a) automatically whenever an admin manually links a submission to a user (source = manual_link), and (b) explicitly in this tab (source = admin_added). The five-tier matching order is: employee ID exact, email exact, email alias, name exact, name alias. Each alias's last_matched_at and match_count show when and how often it has helped.
          </div>

          {/* ADD FORM */}
          <Crd t={t} style={{ marginBottom: 16, padding: 16 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Add Alias</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 1.6fr 1fr auto", gap: 10, alignItems: "end" }}>
              <div>
                <Lbl>User</Lbl>
                <select
                  value={aliasAddForm.user_id}
                  onChange={e => setAliasAddForm({ ...aliasAddForm, user_id: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid " + t.border, background: t.inputBg, color: t.text, fontSize: 12 }}
                >
                  <option value="">Select user...</option>
                  {usersForLinking.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email || u.role || "no email"})</option>
                  ))}
                </select>
              </div>
              <div>
                <Lbl>Type</Lbl>
                <select
                  value={aliasAddForm.alias_type}
                  onChange={e => setAliasAddForm({ ...aliasAddForm, alias_type: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid " + t.border, background: t.inputBg, color: t.text, fontSize: 12 }}
                >
                  <option value="name">name</option>
                  <option value="email">email</option>
                </select>
              </div>
              <div>
                <Lbl>Value (lowercased automatically)</Lbl>
                <Inp
                  t={t}
                  placeholder={aliasAddForm.alias_type === "email" ? "jdoe.personal@gmail.com" : "first last as they submitted"}
                  value={aliasAddForm.alias_value}
                  onChange={e => setAliasAddForm({ ...aliasAddForm, alias_value: e.target.value })}
                />
              </div>
              <div>
                <Lbl>Notes (optional)</Lbl>
                <Inp
                  t={t}
                  placeholder="why is this an alias"
                  value={aliasAddForm.notes}
                  onChange={e => setAliasAddForm({ ...aliasAddForm, notes: e.target.value })}
                />
              </div>
              <Btn t={t} onClick={addAlias} disabled={aliasAddBusy} style={{ fontSize: 12, padding: "9px 16px" }}>
                {aliasAddBusy ? "Adding..." : "Add"}
              </Btn>
            </div>
          </Crd>

          {/* GROUPED TABLE */}
          {aliasesLoading && aliases.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: t.textMut, fontSize: 12 }}>Loading aliases...</div>
          ) : aliases.length === 0 ? (
            <Crd t={t} style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: t.textMut }}>No aliases recorded yet.</div>
              <div style={{ fontSize: 11, color: t.textMut, marginTop: 6 }}>Manually linking a submission via the Submissions tab automatically records aliases. You can also add them above.</div>
            </Crd>
          ) : (() => {
            // Group aliases by user_id while preserving the API's sort order
            // (which is first_name, last_name, alias_type, alias_value).
            const groups = [];
            const seen = new Map();
            for (const a of aliases) {
              if (!seen.has(a.user_id)) {
                const idx = groups.length;
                seen.set(a.user_id, idx);
                groups.push({
                  user_id: a.user_id,
                  first_name: a.first_name,
                  last_name: a.last_name,
                  email: a.email,
                  employee_id: a.employee_id,
                  user_status: a.user_status,
                  rows: [],
                });
              }
              groups[seen.get(a.user_id)].rows.push(a);
            }
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {groups.map(g => (
                  <Crd key={g.user_id} t={t} style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "10px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between", alignItems: "center", background: t.hover }}>
                      <div>
                        <span style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.text }}>{g.first_name} {g.last_name}</span>
                        {g.employee_id && <span style={{ marginLeft: 8, fontSize: 9, fontFamily: "monospace", color: t.goldText, background: t.goldBg, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{g.employee_id}</span>}
                        {g.email && <span style={{ marginLeft: 10, fontSize: 11, color: t.textMut }}>{g.email}</span>}
                        {g.user_status !== "active" && <Bdg l={g.user_status} c={OR} />}
                      </div>
                      <span style={{ fontSize: 11, color: t.textMut }}>{g.rows.length} {g.rows.length === 1 ? "alias" : "aliases"}</span>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ borderBottom: "1px solid " + t.border }}>
                        {["Type", "Value", "Source", "Matches", "Last Matched", "Added", "Added By", "Notes", ""].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: t.textMut, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {g.rows.map(a => (
                          <tr key={a.id} style={{ borderBottom: "1px solid " + t.border }}>
                            <td style={{ padding: "8px 12px" }}><Bdg l={a.alias_type} c={a.alias_type === "email" ? BL : GO} /></td>
                            <td style={{ padding: "8px 12px", color: t.text, fontFamily: "monospace", fontSize: 11 }}>{a.alias_value}</td>
                            <td style={{ padding: "8px 12px", color: t.textSec, fontSize: 11 }}>{a.source}</td>
                            <td style={{ padding: "8px 12px", color: a.match_count > 0 ? GR : t.textMut, fontWeight: a.match_count > 0 ? 600 : 400 }}>{a.match_count}</td>
                            <td style={{ padding: "8px 12px", color: t.textSec, fontSize: 11 }}>{a.last_matched_at ? fmtDT(a.last_matched_at) : <span style={{ color: t.textMut }}>never</span>}</td>
                            <td style={{ padding: "8px 12px", color: t.textSec, fontSize: 11 }}>{fmtDT(a.created_at)}</td>
                            <td style={{ padding: "8px 12px", color: t.textSec, fontSize: 11 }}>{a.created_by_first_name ? a.created_by_first_name + " " + (a.created_by_last_name || "") : <span style={{ color: t.textMut }}>--</span>}</td>
                            <td style={{ padding: "8px 12px", color: t.textSec, fontSize: 11, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.notes || ""}>{a.notes || <span style={{ color: t.textMut }}>--</span>}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <button
                                onClick={() => deleteAlias(a.id, a.alias_value)}
                                disabled={aliasDeletingId === a.id}
                                style={{ background: "none", border: "none", color: RD, cursor: aliasDeletingId === a.id ? "wait" : "pointer", fontSize: 12 }}
                              >
                                {aliasDeletingId === a.id ? "..." : "Remove"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Crd>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ================ FORM EDIT MODAL ================ */}
      {editForm && (
        <Mdl t={t} onClose={() => setEditForm(null)}>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Edit Form</div>
              <button onClick={() => setEditForm(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button>
            </div>
            <div style={{ marginBottom: 12 }}><Lbl>Title</Lbl><div style={{ fontSize: 13, color: t.text, padding: "8px 0" }}>{editForm.title}</div></div>
            <div style={{ marginBottom: 12 }}><Lbl>Jotform Form ID</Lbl><div style={{ fontSize: 12, color: t.textMut, fontFamily: "monospace", padding: "4px 0" }}>{editForm.jotform_form_id}</div></div>
            <div style={{ marginBottom: 12 }}><Lbl>Category</Lbl>
              <Sel options={CATEGORY_OPTS} value={editForm.category || "uncategorized"} onChange={e => setEditForm({ ...editForm, category: e.target.value })} t={t} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: t.textSec, cursor: "pointer" }}>
                <input type="checkbox" checked={editForm.is_enabled} onChange={e => setEditForm({ ...editForm, is_enabled: e.target.checked })} />
                Enabled (included in sync)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: t.textSec, cursor: "pointer" }}>
                <input type="checkbox" checked={editForm.is_onboarding_form} onChange={e => setEditForm({ ...editForm, is_onboarding_form: e.target.checked })} />
                Required for new hire onboarding
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: t.textSec, cursor: "pointer" }}>
                <input type="checkbox" checked={editForm.requires_signature} onChange={e => setEditForm({ ...editForm, requires_signature: e.target.checked })} />
                Requires signature
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: t.textSec, cursor: "pointer" }}>
                <input type="checkbox" checked={editForm.requires_annual_renewal} onChange={e => setEditForm({ ...editForm, requires_annual_renewal: e.target.checked })} />
                Annual renewal required
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: t.textSec, cursor: "pointer" }}>
                <input type="checkbox" checked={editForm.has_original_pdf !== false} onChange={e => setEditForm({ ...editForm, has_original_pdf: e.target.checked })} />
                Has original PDF (show PDF buttons)
              </label>
            </div>
            <div style={{ marginBottom: 12 }}><Lbl>Target Role (optional)</Lbl>
              <Inp t={t} placeholder="e.g. cleaner, supervisor, admin" value={editForm.target_role || ""} onChange={e => setEditForm({ ...editForm, target_role: e.target.value })} />
            </div>
            <div style={{ marginBottom: 12 }}><Lbl>Expiry in days (optional)</Lbl>
              <Inp t={t} type="number" placeholder="e.g. 365 for annual expiration" value={editForm.expiry_days || ""} onChange={e => setEditForm({ ...editForm, expiry_days: e.target.value })} />
              <div style={{ fontSize: 10, color: t.textMut, marginTop: 4 }}>When set, each submission will auto-compute an expiry date.</div>
            </div>
            <div style={{ marginBottom: 16 }}><Lbl>Notes (admin only)</Lbl>
              <textarea value={editForm.notes || ""} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: FONT_BODY, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn t={t} v="ghost" onClick={() => setEditForm(null)}>Cancel</Btn>
              <Btn t={t} onClick={saveFormEdit}>Save</Btn>
            </div>
          </div>
        </Mdl>
      )}

      {/* ================ SUBMISSION DETAIL MODAL ================ */}
      {detailSub && (
        <Mdl t={t} onClose={() => setDetailSub(null)}>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Submission Detail</div>
              <button onClick={() => setDetailSub(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button>
            </div>
            {detailLoading && <div style={{ padding: 30, textAlign: "center", color: t.textMut }}>Loading from Jotform...</div>}
            {!detailLoading && detailSub.meta && (<>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14, fontSize: 12 }}>
                <div><div style={{ color: t.textMut, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Form</div><div style={{ color: t.text }}>{detailSub.meta.form_title || detailSub.meta.jotform_form_id}</div></div>
                <div><div style={{ color: t.textMut, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Submitted</div><div style={{ color: t.text }}>{fmtDT(detailSub.meta.submitted_at)}</div></div>
                <div><div style={{ color: t.textMut, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Submitter</div><div style={{ color: t.text }}>{detailSub.meta.submitter_name || "Unknown"}<div style={{ fontSize: 10, color: t.textMut }}>{detailSub.meta.submitter_email || ""}</div></div></div>
                <div>
                  <div style={{ color: t.textMut, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Matched Employee</div>
                  {detailSub.meta.user_id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ color: t.text }}>{detailSub.meta.first_name + " " + detailSub.meta.last_name}</span>
                      <button onClick={() => linkSubmissionToUser(detailSub.meta.id, null)} style={{ background: "none", border: "none", color: RD, cursor: "pointer", fontSize: 10, textDecoration: "underline", padding: 0 }}>Unlink</button>
                    </div>
                  ) : (
                    <div>
                      <select
                        value=""
                        onChange={e => { if (e.target.value) linkSubmissionToUser(detailSub.meta.id, e.target.value); }}
                        style={{ background: t.bg2 || t.card, color: t.text, border: "1px solid " + t.border, borderRadius: 6, padding: "4px 8px", fontSize: 12, width: "100%", maxWidth: 220 }}
                      >
                        <option value="">Link to user...</option>
                        {usersForLinking.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name}{u.email ? " (" + u.email + ")" : ""}
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: 9, color: OR, fontStyle: "italic", marginTop: 2 }}>Unmatched</div>
                    </div>
                  )}
                </div>
                <div><div style={{ color: t.textMut, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Status</div><div>{statusBadge(detailSub.meta.status)}</div></div>
                {detailSub.meta.expiry_date && <div><div style={{ color: t.textMut, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Expiry</div><div style={{ color: t.text }}>{fmtDate(detailSub.meta.expiry_date)}</div></div>}
              </div>

              {detailSub.meta.linked_entity_type && (
                <div style={{ padding: "8px 12px", borderRadius: 6, background: t.greenSubtle, border: "1px solid " + t.greenBorder, fontSize: 11, color: GR, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Linked to {detailSub.meta.linked_entity_type.replace(/_/g, " ")}{detailSub.meta.linked_by_name ? " by " + detailSub.meta.linked_by_name : ""}{detailSub.meta.linked_at ? " on " + fmtDT(detailSub.meta.linked_at) : ""}</span>
                  <button onClick={() => unlinkSubmission(detailSub.meta.id)} style={{ background: "none", border: "none", color: RD, cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Unlink</button>
                </div>
              )}

              {!detailSub.meta.linked_entity_type && (
                <div style={{ marginBottom: 14 }}>
                  <Btn t={t} v="ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setLinkModal({ submission_id: detailSub.meta.id, entity_type: "hr_document", entity_id: "" })}>Link to Record</Btn>
                </div>
              )}

              <div style={{ marginBottom: 8 }}>
                <Lbl>Live Answers (fetched from Jotform)</Lbl>
              </div>
              {detailSub.fetchError && (
                <div style={{ padding: 12, borderRadius: 6, background: t.redSubtle, border: "1px solid " + t.redBorder, fontSize: 12, color: RD, marginBottom: 10 }}>
                  Could not fetch live content: {detailSub.fetchError.message}
                </div>
              )}
              {detailSub.live && detailSub.live.answers && (
                <div style={{ background: t.hover, borderRadius: 8, padding: 12, maxHeight: 300, overflow: "auto" }}>
                  {Object.keys(detailSub.live.answers).map(key => {
                    const a = detailSub.live.answers[key];
                    if (!a || a.type === "control_head" || a.type === "control_button" || a.type === "control_divider") return null;
                    let displayAnswer = "";
                    if (a.answer === undefined || a.answer === null || a.answer === "") return null;
                    if (typeof a.answer === "object") {
                      if (a.type === "control_fullname") {
                        displayAnswer = [a.answer.first, a.answer.middle, a.answer.last].filter(Boolean).join(" ");
                      } else if (a.type === "control_address") {
                        displayAnswer = [a.answer.addr_line1, a.answer.addr_line2, a.answer.city, a.answer.state, a.answer.postal].filter(Boolean).join(", ");
                      } else {
                        displayAnswer = JSON.stringify(a.answer);
                      }
                    } else {
                      displayAnswer = String(a.answer);
                    }
                    if (!displayAnswer) return null;
                    return (
                      <div key={key} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid " + t.border }}>
                        <div style={{ fontSize: 10, color: t.textMut, textTransform: "uppercase", marginBottom: 2 }}>{a.text || a.name}</div>
                        <div style={{ fontSize: 12, color: t.text, wordBreak: "break-word" }}>{displayAnswer}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {detailSub.meta.status !== "reviewed" && <Btn t={t} v="ghost" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => updateSubmissionStatus(detailSub.meta.id, "reviewed")}>Mark Reviewed</Btn>}
                  {detailSub.meta.status !== "archived" && <Btn t={t} v="ghost" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => updateSubmissionStatus(detailSub.meta.id, "archived")}>Archive</Btn>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {detailSub.meta.has_original_pdf !== false && (
                    <>
                      <Btn t={t} v="ghost" style={{ fontSize: 11, padding: "6px 12px" }} disabled={pdfBusy} onClick={() => viewPdf(detailSub.meta.id)}>{pdfBusy ? "Working..." : "View Original PDF"}</Btn>
                      <Btn t={t} v="ghost" style={{ fontSize: 11, padding: "6px 12px" }} disabled={pdfBusy} onClick={() => downloadPdf(detailSub.meta.id, (detailSub.meta.form_title || "submission") + "_" + (detailSub.meta.submitter_name || "unknown"))}>Download</Btn>
                      <Btn t={t} v="ghost" style={{ fontSize: 11, padding: "6px 12px" }} disabled={pdfBusy} onClick={() => printPdf(detailSub.meta.id)}>Print</Btn>
                    </>
                  )}
                  {detailSub.meta.jotform_view_url && <a href={detailSub.meta.jotform_view_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: BL, textDecoration: "none", padding: "8px 12px", border: "1px solid " + t.border, borderRadius: 6 }}>Open in Jotform</a>}
                  <Btn t={t} onClick={() => setDetailSub(null)}>Close</Btn>
                </div>
              </div>
            </>)}
          </div>
        </Mdl>
      )}

      {/* ================ FULL REFRESH WARNING MODAL ================ */}
      {fullRefreshModal && (
        <Mdl t={t} onClose={() => setFullRefreshModal(false)}>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: RD }}>Full Refresh. Read Before Running.</div>
              <button onClick={() => setFullRefreshModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button>
            </div>

            <div style={{ padding: "10px 14px", borderRadius: 8, background: t.orangeSubtle, border: "1px solid " + t.orangeBorder, fontSize: 12, color: OR, marginBottom: 14, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>What this does</div>
              Pulls every submission from Jotform for every enabled form, ignoring the incremental filter. Existing cached submissions are re-fetched and their metadata is refreshed (submitter name, email, matched employee, expiry). Admin-set fields (status, notes, manual expiry, entity links) are preserved.
            </div>

            <div style={{ padding: "10px 14px", borderRadius: 8, background: t.redSubtle, border: "1px solid " + t.redBorder, fontSize: 12, color: RD, marginBottom: 14, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>When to use this</div>
              Use this only when you have a specific reason, such as: you have made changes in Jotform that are not appearing here, the field-extraction logic has changed, or you suspect the cache is out of sync. For normal daily operations, the regular "Sync All Submissions" button is sufficient.
            </div>

            <div style={{ padding: "10px 14px", borderRadius: 8, background: t.hover, fontSize: 12, color: t.textSec, marginBottom: 14, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: t.text }}>Rate limit note</div>
              Jotform API limits vary by account tier. Free accounts allow 1,000 calls per day. Each enabled form costs one API call, plus one per 1,000 submissions. If you have many forms with many submissions, a full refresh could consume a large portion of your daily quota.
            </div>

            <div style={{ padding: "10px 14px", borderRadius: 8, background: t.hover, fontSize: 12, color: t.textSec, marginBottom: 16, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: t.text }}>Duration</div>
              Typical run time is 1 to 5 minutes depending on volume. Do not close this page while it runs. You can monitor progress in the Sync Log table below after it completes.
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn t={t} v="ghost" onClick={() => setFullRefreshModal(false)}>Cancel</Btn>
              <Btn t={t} v="danger" onClick={runFullRefresh}>Run Full Refresh</Btn>
            </div>
          </div>
        </Mdl>
      )}

      {/* ================ LINK MODAL ================ */}
      {linkModal && (
        <Mdl t={t} onClose={() => setLinkModal(null)}>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Link Submission to Record</div>
              <button onClick={() => setLinkModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button>
            </div>
            <div style={{ marginBottom: 12 }}><Lbl>Entity Type</Lbl>
              <Sel options={ENTITY_TYPE_OPTS} value={linkModal.entity_type} onChange={e => setLinkModal({ ...linkModal, entity_type: e.target.value, entity_id: "" })} t={t} />
            </div>
            <div style={{ marginBottom: 16 }}><Lbl>Record ID (UUID)</Lbl>
              <Inp t={t} placeholder="Paste the UUID of the target record" value={linkModal.entity_id} onChange={e => setLinkModal({ ...linkModal, entity_id: e.target.value })} />
              <div style={{ fontSize: 10, color: t.textMut, marginTop: 4, lineHeight: 1.5 }}>For HR documents, you can also link from the HR Records page by selecting a synced submission in the Add Document modal.</div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn t={t} v="ghost" onClick={() => setLinkModal(null)}>Cancel</Btn>
              <Btn t={t} onClick={submitLink}>Link</Btn>
            </div>
          </div>
        </Mdl>
      )}
    </div>
  );
}

// ===== HR RECORDS PAGE =====
// =====================================================
// SESSION 22: HR Records redesign - Employees tab
// EmployeesGridView and EmployeeFolderView are rendered
// inside HRRecordsPage when the "employees" tab is active.
// =====================================================

function EmployeesGridView({ af, showToast, t, onSelectEmployee }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("last_name_asc");
  const [statusFilter, setStatusFilter] = useState("active");
  const [roleFilter, setRoleFilter] = useState("all");
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [filterExpired, setFilterExpired] = useState(false);
  const [filterOnbIncomplete, setFilterOnbIncomplete] = useState(false);
  const [showTest, setShowTest] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = "?status=" + encodeURIComponent(statusFilter) + (showTest ? "&include_test=true" : "");
      const d = await af("/api/hr/employees-summary" + q);
      setEmployees(d.employees || []);
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [af, showToast, statusFilter, showTest]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const fmtRelDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    const now = new Date();
    const diff = Math.floor((now - dt) / 86400000);
    if (diff <= 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 7) return diff + " days ago";
    if (diff < 30) return Math.floor(diff / 7) + "w ago";
    if (diff < 365) return Math.floor(diff / 30) + "mo ago";
    return Math.floor(diff / 365) + "y ago";
  };

  const roleOptions = useMemo(() => {
    const set = new Set();
    employees.forEach(e => { if (e.role) set.add(e.role); });
    const opts = [{ v: "all", l: "All roles" }];
    Array.from(set).sort().forEach(r => opts.push({ v: r, l: r.charAt(0).toUpperCase() + r.slice(1) }));
    return opts;
  }, [employees]);

  const filtered = useMemo(() => {
    let arr = employees.slice();
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(e => {
        const name = (e.first_name + " " + e.last_name).toLowerCase();
        const email = (e.email || "").toLowerCase();
        const role = (e.role || "").toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q);
      });
    }
    if (roleFilter !== "all") arr = arr.filter(e => e.role === roleFilter);
    if (filterExpiring) arr = arr.filter(e => (e.expiring_doc_count + e.expiring_training_count) > 0);
    if (filterExpired) arr = arr.filter(e => (e.expired_doc_count + e.expired_training_count) > 0);
    if (filterOnbIncomplete) arr = arr.filter(e => e.onboarding_total > 0 && e.onboarding_completed < e.onboarding_total);

    arr.sort((a, b) => {
      const af = (a.first_name || "").toLowerCase();
      const bf = (b.first_name || "").toLowerCase();
      const al = (a.last_name || "").toLowerCase();
      const bl = (b.last_name || "").toLowerCase();
      const ad = a.last_activity_date ? new Date(a.last_activity_date).getTime() : 0;
      const bd = b.last_activity_date ? new Date(b.last_activity_date).getTime() : 0;
      const ah = a.hire_date ? new Date(a.hire_date).getTime() : 0;
      const bh = b.hire_date ? new Date(b.hire_date).getTime() : 0;
      switch (sortBy) {
        case "last_name_asc": return al.localeCompare(bl) || af.localeCompare(bf);
        case "last_name_desc": return bl.localeCompare(al) || bf.localeCompare(af);
        case "first_name_asc": return af.localeCompare(bf) || al.localeCompare(bl);
        case "activity_desc": return bd - ad;
        case "activity_asc": return ad - bd;
        case "hire_desc": return bh - ah;
        case "hire_asc": return ah - bh;
        default: return 0;
      }
    });
    return arr;
  }, [employees, search, sortBy, roleFilter, filterExpiring, filterExpired, filterOnbIncomplete]);

  const sortOpts = [
    { v: "last_name_asc", l: "Last Name A-Z" },
    { v: "last_name_desc", l: "Last Name Z-A" },
    { v: "first_name_asc", l: "First Name A-Z" },
    { v: "activity_desc", l: "Most Recent Activity" },
    { v: "activity_asc", l: "Oldest Activity" },
    { v: "hire_desc", l: "Hire Date (newest)" },
    { v: "hire_asc", l: "Hire Date (oldest)" },
  ];

  const statusOpts = [
    { v: "active", l: "Active only" },
    { v: "inactive", l: "Inactive only" },
    { v: "all", l: "All statuses" },
  ];

  const chip = (label, active, onClick, color) => (
    <button onClick={onClick} style={{ padding: "5px 12px", borderRadius: 16, border: "1px solid " + (active ? (color || GO) : t.border), background: active ? ((color || GO) + "22") : "transparent", color: active ? goldToText(t, color || GO) : t.textSec, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
  );

  return (
    <div>
      {/* Top filter row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ flex: "1 1 260px", minWidth: 200 }}>
          <Inp t={t} placeholder="Search name, email, or role..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ minWidth: 200 }}>
          <Sel options={sortOpts} value={sortBy} onChange={e => setSortBy(e.target.value)} t={t} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <div style={{ minWidth: 140 }}>
          <Sel options={statusOpts} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} t={t} />
        </div>
        <div style={{ minWidth: 140 }}>
          <Sel options={roleOptions} value={roleFilter} onChange={e => setRoleFilter(e.target.value)} t={t} />
        </div>
        {chip("Expiring (30d)", filterExpiring, () => setFilterExpiring(v => !v), OR)}
        {chip("Expired", filterExpired, () => setFilterExpired(v => !v), RD)}
        {chip("Onboarding incomplete", filterOnbIncomplete, () => setFilterOnbIncomplete(v => !v), BL)}
        {chip(showTest ? "Hide test accounts" : "Show test accounts", showTest, () => setShowTest(v => !v), GO)}
      </div>

      {/* Result count */}
      <div style={{ fontSize: 12, color: t.textSec, marginBottom: 12 }}>
        {loading ? "Loading..." : (filtered.length + " employee" + (filtered.length === 1 ? "" : "s"))}
      </div>

      {/* Card grid (3 columns desktop, auto-fit) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {filtered.map(e => {
          const name = (e.first_name || "") + " " + (e.last_name || "");
          const totalItems = (e.doc_count || 0) + (e.training_count || 0) + (e.jotform_count || 0) + (e.onboarding_total || 0);
          const expiring = (e.expiring_doc_count || 0) + (e.expiring_training_count || 0);
          const expired = (e.expired_doc_count || 0) + (e.expired_training_count || 0);
          const onbIncomplete = e.onboarding_total > 0 && e.onboarding_completed < e.onboarding_total;
          return (
            <Crd key={e.id} t={t}
              onClick={() => onSelectEmployee(e)}
              onMouseEnter={ev => { ev.currentTarget.style.transform = "translateY(-3px)"; ev.currentTarget.style.borderColor = t.goldBorder; ev.currentTarget.style.boxShadow = t.popShadow; }}
              onMouseLeave={ev => { ev.currentTarget.style.transform = "none"; ev.currentTarget.style.borderColor = t.border; ev.currentTarget.style.boxShadow = "none"; }}
              style={{ cursor: "pointer", padding: 0, overflow: "hidden", transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease" }}>
              <div style={{ height: 4, background: "linear-gradient(90deg, " + GO + ", " + GL + ")" }} />
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  {e.profile_photo_url
                    ? <img src={e.profile_photo_url} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "1.5px solid " + GO, flexShrink: 0 }} />
                    : <Ini name={name} sz={52} color={e.status === "active" ? GO : "#94A3B8"} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                    <div style={{ fontSize: 11, color: t.textMut, marginTop: 2, textTransform: "capitalize" }}>{e.role || "No role"}{e.status !== "active" ? " . " + e.status : ""}{e.is_test_account ? " . TEST" : ""}</div>
                    {e.employee_id && <span style={{ display: "inline-block", fontSize: 10, fontFamily: "monospace", color: t.goldText, marginTop: 4, padding: "1px 7px", borderRadius: 5, background: t.goldBg, border: "1px solid " + t.goldBorder }}>{e.employee_id}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", borderTop: "1px solid " + t.border, borderBottom: "1px solid " + t.border, margin: "0 -16px 12px", padding: "10px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 600, color: t.text, lineHeight: 1 }}>{totalItems}</div>
                    <div style={{ fontSize: 9, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>Records</div>
                  </div>
                  <div style={{ flex: 1.4, borderLeft: "1px solid " + t.border, paddingLeft: 14 }}>
                    <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: t.textSec, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.last_activity_date ? fmtRelDate(e.last_activity_date) : "None"}</div>
                    <div style={{ fontSize: 9, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>Last activity</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", minHeight: 20 }}>
                  {expired > 0 && <Bdg l={expired + " expired"} c={RD} />}
                  {expiring > 0 && <Bdg l={expiring + " expiring"} c={OR} />}
                  {onbIncomplete && <Bdg l={"Onboarding " + e.onboarding_completed + "/" + e.onboarding_total} c={BL} />}
                  {expired === 0 && expiring === 0 && !onbIncomplete && totalItems > 0 && <Bdg l="All current" c={GR} />}
                  {totalItems === 0 && <Bdg l="Empty" c="#94A3B8" />}
                </div>
              </div>
            </Crd>
          );
        })}
      </div>
      {!loading && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: t.textMut, background: t.card, borderRadius: 12, border: "1px solid " + t.border }}>
          No employees match your filters.
        </div>
      )}
    </div>
  );
}

function EmployeeFolderView({ af, token, showToast, t, userId, refreshKey, onBack, onAddDocument, onEditDocument, onDeleteDocument, onEditTraining, getOpts, lkMap, allStaff }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [pdfBusy, setPdfBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await af("/api/hr/employee-folder/" + userId);
      setData(d);
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [af, userId, showToast]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const docTypeMap = lkMap("document_types");
  const trainingTypeMap = lkMap("training_types");
  const onbCatMap = lkMap("onboarding_categories");

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const fmtTime = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";

  const updateSubCategory = async (submissionUuid, newOverride) => {
    try {
      await af("/api/jotform/submissions/" + submissionUuid, { method: "PATCH", body: { category_override: newOverride === "" ? null : newOverride } });
      showToast("Category updated");
      load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const viewPdf = async (submissionUuid) => {
    setPdfBusy(submissionUuid);
    try {
      // Use raw fetch because apiFetch assumes JSON. PDF endpoint streams a binary blob.
      // The token comes from the App-level React state via props, matching how FormsPage handles its binary fetches.
      const apiBase = (typeof window !== "undefined" && window.OCSA_API_BASE) || "https://ocsa-api-production.up.railway.app";
      const resp = await fetch(apiBase + "/api/jotform/submissions/" + submissionUuid + "/pdf", {
        headers: { Authorization: "Bearer " + (token || "") }
      });
      // Session 24: 202 means PDF not yet captured by email ingestion (still pending)
      if (resp.status === 202) {
        const body = await resp.json().catch(() => ({}));
        showToast(body.message || "PDF is being captured, check back in a few minutes.");
        return;
      }
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error("PDF fetch failed (" + resp.status + "): " + errText.slice(0, 200));
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Revoke after a delay to give the browser time to load
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { showToast(e.message, "error"); }
    finally { setPdfBusy(null); }
  };

  // Session 25 Phase 3: open a private-bucket document via the authenticated streaming endpoint.
  // Mirrors viewPdf above but for employee_documents rows in the folder timeline.
  const viewDoc = async (docId) => {
    try {
      const apiBase = (typeof window !== "undefined" && window.OCSA_API_BASE) || "https://ocsa-api-production.up.railway.app";
      const resp = await fetch(apiBase + "/api/jotform/employee-documents/" + docId + "/file?action=view", {
        headers: { Authorization: "Bearer " + (token || "") }
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error("File fetch failed (" + resp.status + "): " + errText.slice(0, 200));
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { showToast(e.message, "error"); }
  };

  const expiryBadge = (d) => {
    if (!d) return null;
    const dt = new Date(typeof d === "string" ? d.split("T")[0] + "T00:00:00" : d);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((dt - now) / 86400000);
    if (diff < 0) return <Bdg l="Expired" c={RD} />;
    if (diff <= 30) return <Bdg l={"Expires " + diff + "d"} c={OR} />;
    return <Bdg l="Valid" c={GR} />;
  };

  const sourceLabel = (s) => ({
    document: "Document",
    training: "Training",
    onboarding: "Onboarding Step",
    jotform: "Jotform Form",
  })[s] || s;

  const sourceColor = (s) => ({
    document: "#9B59B6",
    training: GR,
    onboarding: BL,
    jotform: GO,
  })[s] || t.textMut;

  if (loading && !data) {
    return <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Loading folder...</div>;
  }
  if (!data) {
    return <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Could not load folder.</div>;
  }

  const e = data.employee;
  const fullName = (e.first_name || "") + " " + (e.last_name || "");
  const items = data.items || [];
  const counts = data.counts_by_category || {};
  const totalItems = data.total_items || 0;

  // Build category pills: "All" first, then any category that has at least one item
  const categoryEntries = HR_CATEGORY_OPTS
    .filter(c => (counts[c.v] || 0) > 0)
    .map(c => ({ ...c, count: counts[c.v] || 0 }));

  const filtered = activeCategory === "all" ? items : items.filter(i => i.category === activeCategory);

  return (
    <div>
      {/* Header: back + employee profile + add document */}
      <button onClick={onBack} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid " + t.border, background: "transparent", color: t.goldText, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <Ic d="M15 18l-6-6 6-6" sz={14} c={t.goldText} /> Back to Employees
      </button>
      <ProfileBanner t={t}
        avatar={e.profile_photo_url
          ? <img src={e.profile_photo_url} alt="" style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover" }} />
          : <Ini name={fullName} sz={84} />}
        name={fullName + (e.is_test_account ? " (TEST)" : "")}
        idCode={e.employee_id}
        subtitle={<span style={{ textTransform: "capitalize" }}>{e.role || "No role"}{e.hire_date ? " . Hired " + fmtDate(e.hire_date) : ""}{(e.email || e.phone) ? <span style={{ textTransform: "none", color: t.textMut }}>{"  .  " + (e.email || "") + (e.email && e.phone ? " . " : "") + (e.phone || "")}</span> : ""}</span>}
        badges={e.status ? <Bdg l={e.status} c={e.status === "active" ? GR : e.status === "pending" ? OR : RD} /> : null}
        actions={<Btn t={t} onClick={() => onAddDocument(userId)}>+ Add Document</Btn>}
      />

      {/* Category pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => setActiveCategory("all")} style={{ padding: "6px 14px", borderRadius: 16, border: "1px solid " + (activeCategory === "all" ? GO : t.border), background: activeCategory === "all" ? t.goldBg : "transparent", color: activeCategory === "all" ? t.goldText : t.textSec, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          All ({totalItems})
        </button>
        {categoryEntries.map(c => {
          const active = activeCategory === c.v;
          const color = HR_CATEGORY_COLOR[c.v] || GO;
          return (
            <button key={c.v} onClick={() => setActiveCategory(c.v)} style={{ padding: "6px 14px", borderRadius: 16, border: "1px solid " + (active ? color : t.border), background: active ? (color + "22") : "transparent", color: active ? color : t.textSec, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {c.l} ({c.count})
            </button>
          );
        })}
      </div>

      {/* Item list */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: t.textMut, background: t.card, borderRadius: 12, border: "1px solid " + t.border }}>
          {totalItems === 0 ? "No HR records on file for this employee yet." : "No items in this category."}
        </div>
      ) : (
        <div style={{ background: t.card, borderRadius: 12, border: "1px solid " + t.border, overflow: "hidden" }}>
          {filtered.map((it, idx) => {
            const isLast = idx === filtered.length - 1;
            const catColor = HR_CATEGORY_COLOR[it.category] || GO;
            const srcColor = sourceColor(it.source);

            return (
              <div key={it.source + "_" + it.source_id} style={{ padding: "12px 16px", borderBottom: isLast ? "none" : "1px solid " + t.border, display: "flex", gap: 12, alignItems: "flex-start" }}>

                {/* Source icon column */}
                <div style={{ width: 30, height: 30, borderRadius: 6, background: srcColor + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }} title={sourceLabel(it.source)}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: srcColor, textTransform: "uppercase" }}>
                    {it.source === "document" ? "DOC" : it.source === "training" ? "TR" : it.source === "onboarding" ? "ONB" : "JF"}
                  </span>
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 3 }}>{it.title}</div>
                      <div style={{ fontSize: 11, color: t.textMut }}>
                        {sourceLabel(it.source)}
                        {it.raw_category_label ? " . " + (
                          it.source === "document" ? (docTypeMap[it.raw_category_label] || it.raw_category_label) :
                          it.source === "training" ? (trainingTypeMap[it.raw_category_label] || it.raw_category_label) :
                          it.source === "onboarding" ? (onbCatMap[it.raw_category_label] || it.raw_category_label) :
                          HR_CATEGORY_LABEL(it.raw_category_label)
                        ) : ""}
                        {it.submitter_name ? " . " + it.submitter_name : ""}
                        {it.administered_by ? " . by " + it.administered_by : ""}
                        {it.status ? " . " + it.status : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: t.textSec, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {fmtTime(it.date)}
                    </div>
                  </div>

                  {/* Row footer: badges + actions */}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>

                    {/* Category badge */}
                    {it.source === "jotform" ? (
                      <select
                        value={it.category_override || ""}
                        onChange={e => updateSubCategory(it.source_id, e.target.value)}
                        style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid " + catColor, background: catColor + "1A", color: catColor, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                        title={it.category_override ? "Override active. Pick blank to revert to form default." : "Inheriting form's category. Pick a value to override."}
                      >
                        <option value="">{it.category_override ? "(use form default)" : ("Form default: " + HR_CATEGORY_LABEL(it.category))}</option>
                        {HR_CATEGORY_OPTS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                      </select>
                    ) : (
                      <span style={{ padding: "3px 8px", borderRadius: 6, background: catColor + "1A", color: catColor, fontSize: 11, fontWeight: 600 }}>{HR_CATEGORY_LABEL(it.category)}</span>
                    )}

                    {/* Expiry badge */}
                    {expiryBadge(it.expiry_date)}

                    {/* Action buttons */}
                    {it.source === "document" && (
                      <button onClick={() => viewDoc(it.source_id)} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid " + t.border, background: "transparent", color: BL, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Open file</button>
                    )}
                    {it.source === "document" && (
                      <button onClick={() => onEditDocument(it.source_id)} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid " + t.border, background: "transparent", color: t.textSec, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Edit</button>
                    )}
                    {it.source === "document" && (
                      <button onClick={() => onDeleteDocument(it.source_id)} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid " + t.border, background: "transparent", color: RD, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Delete</button>
                    )}
                    {it.source === "training" && (
                      <button onClick={() => onEditTraining(it.source_id)} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid " + t.border, background: "transparent", color: t.textSec, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Edit</button>
                    )}
                    {it.source === "jotform" && (
                      <button onClick={() => viewPdf(it.source_id)} disabled={pdfBusy === it.source_id} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid " + t.border, background: "transparent", color: BL, fontSize: 11, cursor: pdfBusy === it.source_id ? "wait" : "pointer", fontWeight: 600 }}>
                        {pdfBusy === it.source_id ? "Loading..." : "View PDF"}
                      </button>
                    )}
                    {it.notes && (
                      <span style={{ fontSize: 11, color: t.textMut, fontStyle: "italic" }} title={it.notes}>note: {it.notes.slice(0, 40)}{it.notes.length > 40 ? "..." : ""}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Cases raised by staff through the portal. Admin only. The API applies the recusal rule in SQL, so a
// case about the person looking never arrives here, and this page keeps no count of anything it did not
// receive. The list shows no summary text; a row is opened to be read.
function CasesPage({ af, showToast, t, allStaff = [], user, onSaved }) {
  const CASE_STATUSES = ["open", "in_review", "escalated", "resolved", "closed"];
  const OPEN_STATUSES = ["open", "in_review", "escalated"];
  const statusLabel = { open: "Open", in_review: "In review", escalated: "Escalated", resolved: "Resolved", closed: "Closed" };
  const statusColor = { open: OR, in_review: BL, escalated: RD, resolved: GR, closed: t.textMut };
  const [cases, setCases] = useState([]);
  const [statusFilter, setStatusFilter] = useState("needs_response");
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [accessLog, setAccessLog] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ status: "", escalatedTo: "", resolutionNotes: "" });
  const [saving, setSaving] = useState(false);
  const [handTo, setHandTo] = useState("");
  const [holdBusy, setHoldBusy] = useState(false);
  const [holdError, setHoldError] = useState("");
  const actionLabel = { hr_case_read: "Read the case", hr_case_list: "Saw it in the list", hr_case_updated: "Updated the case", hr_case_access_log_read: "Read this log", hr_case_escalation_mail: "Escalation email", hr_case_created: "Raised the case", hr_case_filed_mail: "Filing email to the team", hr_case_assignment_mail: "Assignment email", hr_case_due_soon_mail: "48 hour reminder to the team", hr_case_overdue_mail: "72 hour reminder to the team" };

  const load = async (status) => {
    setLoading(true);
    try { const d = await af("/api/hr-cases" + (status && status !== "needs_response" ? "?status=" + status : "")); setCases(d && Array.isArray(d.cases) ? d.cases : []); }
    catch (e) { showToast(e.message, "error"); }
    setLoading(false);
  };
  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const loadAccessLog = (id) => af("/api/hr-cases/" + id + "/access-log").then(l => setAccessLog(l && Array.isArray(l.entries) ? l.entries : [])).catch(() => setAccessLog([]));
  // A case the route will not return, for any reason, is reported as not available and nothing more.
  // The route answers 404 for a recused case on purpose, and this page never says which it was.
  const openCase = async (c) => {
    let d;
    try { d = await af("/api/hr-cases/" + c.id); } catch (e) { showToast("This case is not available.", "error"); return; }
    setDetail(d); setAccessLog([]); setForm({ status: d.status, escalatedTo: "", resolutionNotes: d.resolutionNotes || "" }); setHandTo(""); setHoldError("");
    loadAccessLog(d.id);
    af("/api/contacts/case-subjects").then(r => setSubjects(r && Array.isArray(r.subjects) ? r.subjects : [])).catch(() => setSubjects([]));
  };
  const closeCase = () => { setDetail(null); setAccessLog([]); };
  // The case's own subject is never offered: the route answers 400 for that choice.
  const escalateOptions = detail ? subjects.filter(p => !detail.subject || String(p.id) !== String(detail.subject.id)) : [];
  const save = async () => {
    if (!detail) return;
    const body = {};
    if (form.status !== detail.status) body.status = form.status;
    if (form.escalatedTo) body.escalated_to = form.escalatedTo;
    const notes = (form.resolutionNotes || "").trim();
    if (notes !== (detail.resolutionNotes || "")) body.resolution_notes = notes || null;
    if (Object.keys(body).length === 0) { showToast("Nothing to update", "error"); return; }
    setSaving(true);
    try {
      const d = await af("/api/hr-cases/" + detail.id, { method: "PATCH", body });
      setDetail(d); setForm({ status: d.status, escalatedTo: "", resolutionNotes: d.resolutionNotes || "" });
      showToast("Case updated"); load(statusFilter); loadAccessLog(d.id); if (onSaved) onSaved();
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };
  // Take, hand over or release: one PATCH carrying assigned_to alone. Handing to someone else emails
  // them; taking it yourself or releasing it emails nobody. Any successful save stops the response clock.
  const holdSave = async (assignedTo) => {
    if (!detail || holdBusy) return;
    setHoldBusy(true); setHoldError("");
    try {
      const d = await af("/api/hr-cases/" + detail.id, { method: "PATCH", body: { assigned_to: assignedTo } });
      setDetail(d); setForm({ status: d.status, escalatedTo: "", resolutionNotes: d.resolutionNotes || "" }); setHandTo("");
      showToast("Case updated"); load(statusFilter); loadAccessLog(d.id); if (onSaved) onSaved();
    } catch (e) { setHoldError(e.message || "Request failed"); }
    setHoldBusy(false);
  };
  const myId = user && user.id != null ? String(user.id) : "";
  const holderId = detail && detail.assignedTo && detail.assignedTo.id != null ? String(detail.assignedTo.id) : "";
  const iHold = !!myId && holderId === myId;
  // Every active admin the dashboard already loaded, minus the case's subject and minus the caller.
  const handOptions = detail ? allStaff.filter(p => p && p.role === "admin" && (!p.status || p.status === "active") && String(p.id) !== myId && !(detail.subject && String(p.id) === String(detail.subject.id))) : [];
  const handChosen = handOptions.find(p => String(p.id) === handTo);

  const isOpen = c => OPEN_STATUSES.includes(c.status);
  // The response clock. The team has 72 hours from filing to respond; the API sends ageHours and clock.
  const ageHoursOf = c => { const a = Number(c.ageHours); return Number.isFinite(a) ? a : Math.max(0, (Date.now() - new Date(c.createdAt).getTime()) / 3600000); };
  const clockInfo = c => {
    const h = ageHoursOf(c);
    if (c.clock === "on_time") return { label: "On time", detail: Math.max(0, Math.round(72 - h)) + "h left", color: t.text };
    if (c.clock === "due_soon") return { label: "Due soon", detail: Math.max(0, Math.round(72 - h)) + "h left", color: t.goldText };
    if (c.clock === "overdue") return { label: "Overdue", detail: Math.max(0, Math.round(h - 72)) + "h past", color: RD };
    if (c.clock === "responded") return { label: "Responded", detail: "", color: t.textMut };
    if (c.clock === "closed_without_response") return { label: "Closed, no response", detail: "", color: t.textMut };
    return { label: "", detail: "", color: t.textMut };
  };
  const needsResponse = c => c.clock === "on_time" || c.clock === "due_soon" || c.clock === "overdue";
  const ageText = c => { const h = Math.floor(ageHoursOf(c)); const d = Math.floor(h / 24); const r = h % 24; return d > 0 ? d + "d " + r + "h" : r + "h"; };
  const CLOCK_RANK = { overdue: 0, due_soon: 1, on_time: 2 };
  // Overdue first, then due soon, then on time, each oldest first; then the responded and closed cases,
  // oldest open first as before.
  const rows = [...cases].filter(c => statusFilter !== "needs_response" || needsResponse(c)).sort((a, b) => {
    const ar = CLOCK_RANK[a.clock] ?? 3, br = CLOCK_RANK[b.clock] ?? 3; if (ar !== br) return ar - br;
    const ao = isOpen(a) ? 0 : 1, bo = isOpen(b) ? 0 : 1; if (ao !== bo) return ao - bo;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  const columns = [
    { header: "Response", tdStyle: { whiteSpace: "nowrap" }, render: c => { const k = clockInfo(c); return <span style={{ color: k.color, fontWeight: 600 }}>{k.label}{k.detail ? <span style={{ fontWeight: 400 }}> {k.detail}</span> : null}</span>; } },
    { header: "Age", tdStyle: { whiteSpace: "nowrap", color: t.textSec }, render: c => ageText(c) },
    { header: "Status", render: c => <Bdg l={statusLabel[c.status] || c.status} c={statusColor[c.status] || t.textMut} /> },
    { header: "Received", tdStyle: { color: t.textSec, whiteSpace: "nowrap" }, render: c => ff(c.createdAt) },
    { header: "Subject named", tdStyle: { color: t.textSec }, render: c => c.subject ? "Yes" : "No" },
    { header: "Held by", tdStyle: { color: t.textSec }, render: c => (c.assignedTo && c.assignedTo.name) ? c.assignedTo.name : <span style={{ color: t.goldText, fontWeight: 600 }}>Unheld</span> },
  ];

  return (<div>
    <SecT t={t}>Cases</SecT>
    <FilterTabs t={t} value={statusFilter} onChange={s => setStatusFilter(s)} tabs={[{ id: "needs_response", label: "Needs response" }, { id: "", label: "All" }, ...CASE_STATUSES.map(s => ({ id: s, label: statusLabel[s] }))]} />
    {loading && <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Loading cases...</div>}
    {!loading && <DataTable t={t} columns={columns} rows={rows} rowKey={c => c.id} onRowClick={openCase} empty="No cases." />}

    {detail && <Mdl t={t} onClose={closeCase}><div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div><div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Case</div><div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Bdg l={statusLabel[detail.status] || detail.status} c={statusColor[detail.status] || t.textMut} /><span style={{ fontSize: 11, color: t.textMut }}>Received {ff(detail.createdAt)}</span></div></div>
        <button onClick={closeCase} style={{ background: "none", border: "none", cursor: "pointer" }}><XI sz={18} c={t.textMut} /></button>
      </div>
      {(() => { const k = clockInfo(detail); return (
      <div style={{ marginBottom: 14, padding: 12, background: t.cardAlt, borderRadius: 8 }}>
        <div style={{ fontSize: 11, color: t.textMut }}>Held by<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{(detail.assignedTo && detail.assignedTo.name) || "Nobody yet"}</div></div>
        <div style={{ fontSize: 12, color: t.textSec, marginTop: 8 }}>{detail.firstResponseAt ? <span>Responded {ff(detail.firstResponseAt)}</span> : <span><span style={{ color: k.color, fontWeight: 600 }}>{k.label}{k.detail ? " " + k.detail : ""}</span> The team promised a response within 72 hours of filing.</span>}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          {!iHold && <Btn t={t} onClick={() => holdSave(user.id)} disabled={holdBusy || !myId}>Take this case</Btn>}
          {iHold && <Btn t={t} v="ghost" onClick={() => holdSave(null)} disabled={holdBusy}>Release</Btn>}
          {iHold && <span style={{ fontSize: 11, color: t.textMut }}>The case goes back to the team.</span>}
        </div>
        <div style={{ marginTop: 12 }}><Lbl>Hand to</Lbl>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Sel t={t} aria-label="Hand to" value={handTo} onChange={e => setHandTo(e.target.value)} options={[{ v: "", l: "Choose a person" }, ...handOptions.map(p => ({ v: String(p.id), l: (p.firstName || "") + " " + (p.lastName || "") }))]} />
            <Btn t={t} onClick={() => handChosen && holdSave(handChosen.id)} disabled={holdBusy || !handChosen} style={{ whiteSpace: "nowrap" }}>Hand over</Btn>
          </div>
          <div style={{ fontSize: 11, color: t.textMut, marginTop: 6 }}>They will get an email. The email carries no case text.</div>
        </div>
        {holdError && <div style={{ fontSize: 12, color: RD, marginTop: 8 }}>{holdError}</div>}
      </div>); })()}
      <div style={{ marginBottom: 14 }}><Lbl>Summary</Lbl><div style={{ fontSize: 13, color: t.text, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{detail.summary}</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14, padding: 12, background: t.cardAlt, borderRadius: 8 }}>
        <div style={{ fontSize: 11, color: t.textMut }}>Reported by<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{(detail.reportedBy && detail.reportedBy.name) || "-"}</div></div>
        <div style={{ fontSize: 11, color: t.textMut }}>Subject named<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{(detail.subject && detail.subject.name) || "No"}</div></div>
        <div style={{ fontSize: 11, color: t.textMut }}>Escalated to<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{(detail.escalatedTo && detail.escalatedTo.name) || "-"}</div></div>
        <div style={{ fontSize: 11, color: t.textMut }}>Last updated<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{detail.updatedAt ? ff(detail.updatedAt) : "-"}</div></div>
        <div style={{ fontSize: 11, color: t.textMut }}>Resolved<div style={{ color: t.text, fontWeight: 500, marginTop: 2 }}>{detail.resolvedAt ? ff(detail.resolvedAt) : "-"}</div></div>
      </div>
      <div style={{ marginBottom: 12 }}><Lbl>Status</Lbl><Sel t={t} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} options={CASE_STATUSES.map(v => ({ v, l: statusLabel[v] }))} /></div>
      <div style={{ marginBottom: 12 }}><Lbl>Escalate to</Lbl><Sel t={t} value={form.escalatedTo} onChange={e => setForm({ ...form, escalatedTo: e.target.value })} options={[{ v: "", l: "Do not escalate" }, ...escalateOptions.map(p => ({ v: p.id, l: p.name + (p.title ? ", " + p.title : "") }))]} /><div style={{ fontSize: 11, color: t.textMut, marginTop: 6 }}>Escalating sends that person an email. The email carries no case text.</div></div>
      <div style={{ marginBottom: 14 }}><Lbl>Resolution notes</Lbl><TArea t={t} rows={4} value={form.resolutionNotes} onChange={e => setForm({ ...form, resolutionNotes: e.target.value })} /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 18 }}><Btn t={t} v="ghost" onClick={closeCase}>Close</Btn><Btn t={t} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Btn></div>
      <div><Lbl>Access log</Lbl>
        {accessLog.length === 0 && <div style={{ fontSize: 12, color: t.textMut }}>No entries yet.</div>}
        {accessLog.map(e => (<div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: "1px solid " + t.border, fontSize: 12 }}><span style={{ color: t.text }}>{e.name || "OCSA"}{e.role ? <span style={{ color: t.textMut }}> ({e.role})</span> : null}<span style={{ color: t.textSec }}> {actionLabel[e.action] || e.action}</span></span><span style={{ color: t.textMut, whiteSpace: "nowrap" }}>{ff(e.at)}</span></div>))}
      </div>
    </div></Mdl>}
  </div>);
}

function HRRecordsPage({ af, token, showToast, t, allStaff, uf, getOpts, lkMap }) {
  const [tab, setTab] = useState("employees");
  // Session 22: when set, the Employees tab shows the folder for this user.
  // When null, the Employees tab shows the card grid.
  const [folderUserId, setFolderUserId] = useState(null);
  // Session 22: bump to force EmployeeFolderView to reload after modal saves
  const [folderRefresh, setFolderRefresh] = useState(0);
  const [selUser, setSelUser] = useState("");
  const [docs, setDocs] = useState([]);
  const [training, setTraining] = useState([]);
  const [onboarding, setOnboarding] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [docQ, setDocQ] = useState(""); const [docPage, setDocPage] = useState(1);
  const [trQ, setTrQ] = useState(""); const [trPage, setTrPage] = useState(1);
  const [otQ, setOtQ] = useState(""); const [otPage, setOtPage] = useState(1);
  const [hrPerPage, setHrPerPage] = useState(10);

  const staffOpts = [{ v: "", l: "All Employees" }, ...allStaff.map(s => ({ v: s.id, l: s.firstName + " " + s.lastName }))];
  const docTypeMap = lkMap("document_types");
  const trainingTypeMap = lkMap("training_types");
  const onbCatMap = lkMap("onboarding_categories");
  const docTypeOpts = getOpts("document_types", "Select type...");
  const trainingTypeOpts = getOpts("training_types", "Select type...");
  const onbCatOpts = getOpts("onboarding_categories", "Select category...");

  const loadDocs = useCallback(async () => { try { const q = selUser ? "?user_id=" + selUser : ""; const d = await af("/api/hr/documents" + q); setDocs(d); } catch (e) { showToast(e.message, "error"); } }, [af, selUser, showToast]);
  const loadTraining = useCallback(async () => { try { const q = selUser ? "?user_id=" + selUser : ""; const d = await af("/api/hr/training" + q); setTraining(d); } catch (e) { showToast(e.message, "error"); } }, [af, selUser, showToast]);
  const loadOnboarding = useCallback(async () => { if (!selUser) { setOnboarding([]); return; } try { const d = await af("/api/hr/onboarding/" + selUser); setOnboarding(d); } catch (e) { showToast(e.message, "error"); } }, [af, selUser, showToast]);
  const loadCompliance = useCallback(async () => { try { const d = await af("/api/hr/compliance"); setCompliance(d); } catch (e) { showToast(e.message, "error"); } }, [af, showToast]);

  useEffect(() => { setDocPage(1); setTrPage(1); setOtPage(1); if (tab === "documents" || tab === "other") loadDocs(); else if (tab === "training") loadTraining(); else if (tab === "onboarding") loadOnboarding(); else if (tab === "compliance") loadCompliance(); }, [tab, selUser]);

  const fmtDate = d => { if (!d) return ""; const dt = typeof d === "string" ? d : new Date(d).toISOString(); return dt.split("T")[0]; };

  // Session 25 Phase 3: open a private-bucket document via the authenticated streaming endpoint.
  // Uses raw fetch (not af) because the response is a binary blob, not JSON.
  const viewDoc = async (docId) => {
    try {
      const apiBase = (typeof window !== "undefined" && window.OCSA_API_BASE) || "https://ocsa-api-production.up.railway.app";
      const resp = await fetch(apiBase + "/api/jotform/employee-documents/" + docId + "/file?action=view", {
        headers: { Authorization: "Bearer " + (token || "") }
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error("File fetch failed (" + resp.status + "): " + errText.slice(0, 200));
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { showToast(e.message, "error"); }
  };

  // Session 25 Phase 3: submitDoc routes through the Phase 2 endpoints.
  // Create path uses multipart POST to /api/jotform/employees/:userId/documents.
  // Edit path uses PATCH /api/jotform/employee-documents/:id for metadata only.
  // The legacy uf() public-bucket flow is no longer used.
  const submitDoc = async () => {
    try {
      if (!form.user_id) { showToast("Employee is required", "error"); return; }
      if (!form.category) { showToast("Category is required", "error"); return; }

      let docResult;

      if (form.id) {
        // Edit existing document: metadata only (category, notes, expiry_date)
        const patchBody = {
          category: form.category,
          notes: form.notes || null,
          expiry_date: form.expiry_date || null,
        };
        docResult = await af("/api/jotform/employee-documents/" + form.id, { method: "PATCH", body: patchBody });
        showToast("Document updated");
      } else {
        // Create new document: requires a file upload via multipart
        if (!file) { showToast("Please choose a file to upload", "error"); return; }
        const apiBase = (typeof window !== "undefined" && window.OCSA_API_BASE) || "https://ocsa-api-production.up.railway.app";
        const fd = new FormData();
        fd.append("file", file);
        fd.append("category", form.category);
        if (form.notes) fd.append("notes", form.notes);
        if (form.expiry_date) fd.append("expiry_date", form.expiry_date);
        const resp = await fetch(apiBase + "/api/jotform/employees/" + form.user_id + "/documents", {
          method: "POST",
          headers: { Authorization: "Bearer " + (token || "") },
          body: fd
        });
        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          throw new Error("Upload failed (" + resp.status + "): " + errText.slice(0, 200));
        }
        docResult = await resp.json();
        showToast("Document added");
      }

      // Preserve the Jotform submission link side-effect from Session 22.
      // If a submission UUID was selected via JotformPickerField, link it to this document.
      const submissionUuidToLink = form._submission_uuid_to_link || null;
      if (submissionUuidToLink && docResult && docResult.id) {
        try {
          await af("/api/jotform/submissions/" + submissionUuidToLink + "/link", {
            method: "POST",
            body: { entity_type: "hr_document", entity_id: docResult.id }
          });
        } catch (linkErr) { console.warn("Jotform link failed:", linkErr.message); }
      }

      setShowModal(null); setForm({}); setFile(null); loadDocs();
      if (folderUserId) setFolderRefresh(v => v + 1);
      // Session 25 Phase 3: keep Compliance staff summary in sync with document changes
      if (compliance) loadCompliance();
    } catch (e) { showToast(e.message, "error"); }
  };

  const deleteDoc = async (id) => { if (!window.confirm("Delete this document?")) return; try { await af("/api/jotform/employee-documents/" + id, { method: "DELETE" }); showToast("Document deleted"); loadDocs(); if (folderUserId) setFolderRefresh(v => v + 1); if (compliance) loadCompliance(); } catch (e) { showToast(e.message, "error"); } };

  const submitTraining = async () => {
    try {
      if (!form.user_id || !form.training_name || !form.training_type) { showToast("Employee, name, and type are required", "error"); return; }
      if (form.id) { await af("/api/hr/training/" + form.id, { method: "PUT", body: form }); showToast("Training record updated"); }
      else { await af("/api/hr/training", { method: "POST", body: form }); showToast("Training record added"); }
      setShowModal(null); setForm({}); loadTraining();
      if (folderUserId) setFolderRefresh(v => v + 1);
      if (compliance) loadCompliance();
    } catch (e) { showToast(e.message, "error"); }
  };

  const deleteTraining = async (id) => { if (!window.confirm("Delete this training record?")) return; try { await af("/api/hr/training/" + id, { method: "DELETE" }); showToast("Training record deleted"); loadTraining(); if (folderUserId) setFolderRefresh(v => v + 1); if (compliance) loadCompliance(); } catch (e) { showToast(e.message, "error"); } };

  const initOnboarding = async () => {
    if (!selUser) { showToast("Select an employee first", "error"); return; }
    try { const d = await af("/api/hr/onboarding/initialize", { method: "POST", body: { user_id: selUser } }); setOnboarding(d); showToast("Onboarding initialized"); } catch (e) { showToast(e.message, "error"); }
  };

  const toggleStep = async (step) => {
    try { await af("/api/hr/onboarding/" + step.id, { method: "PATCH", body: { is_completed: !step.is_completed } }); loadOnboarding(); } catch (e) { showToast(e.message, "error"); }
  };

  const addCustomStep = async () => {
    if (!selUser || !form.step_name || !form.step_category) { showToast("Name and category are required", "error"); return; }
    try { await af("/api/hr/onboarding/step", { method: "POST", body: { user_id: selUser, ...form } }); showToast("Step added"); setShowModal(null); setForm({}); loadOnboarding(); } catch (e) { showToast(e.message, "error"); }
  };

  const deleteStep = async (id) => { if (!window.confirm("Delete this step?")) return; try { await af("/api/hr/onboarding/step/" + id, { method: "DELETE" }); showToast("Step deleted"); loadOnboarding(); } catch (e) { showToast(e.message, "error"); } };

  const tabs = [
    { id: "employees", l: "Employees" },
    { id: "documents", l: "Documents" },
    { id: "training", l: "Training" },
    { id: "onboarding", l: "Onboarding" },
    { id: "compliance", l: "Compliance" },
    { id: "other", l: "Other" },
  ];

  const badge = (label, bg, color) => <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: bg, color }}>{label}</span>;
  const expiryBadge = (d) => {
    if (!d) return null;
    const dt = new Date(fmtDate(d) + "T00:00:00");
    const now = new Date(); now.setHours(0,0,0,0);
    const diff = Math.ceil((dt - now) / 86400000);
    if (diff < 0) return badge("Expired", t.redSubtle, RD);
    if (diff <= 30) return badge("Expires in " + diff + "d", t.orangeSubtle, OR);
    return badge("Valid", t.greenSubtle, GR);
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => { setTab(tb.id); if (tb.id !== "employees") setFolderUserId(null); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid " + (tab === tb.id ? GO : t.border), background: tab === tb.id ? t.goldBg : "transparent", color: tab === tb.id ? t.goldText : t.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{tb.l}</button>
        ))}
        {tab !== "employees" && (
          <div style={{ marginLeft: "auto", minWidth: 200 }}>
            <Sel options={staffOpts} value={selUser} onChange={e => setSelUser(e.target.value)} t={t} />
          </div>
        )}
      </div>

      {/* EMPLOYEES TAB (Session 22) */}
      {tab === "employees" && !folderUserId && (
        <EmployeesGridView
          af={af}
          showToast={showToast}
          t={t}
          onSelectEmployee={(emp) => {
            setFolderUserId(emp.id);
            setSelUser(emp.id); // keep the legacy dropdown synced for when user switches to old tabs
          }}
        />
      )}
      {tab === "employees" && folderUserId && (
        <EmployeeFolderView
          af={af}
          token={token}
          showToast={showToast}
          t={t}
          userId={folderUserId}
          refreshKey={folderRefresh}
          allStaff={allStaff}
          getOpts={getOpts}
          lkMap={lkMap}
          onBack={() => setFolderUserId(null)}
          onAddDocument={(uid) => { setForm({ user_id: uid }); setFile(null); setShowModal("doc"); }}
          onEditDocument={async (docId) => {
            try {
              const list = await af("/api/hr/documents?user_id=" + folderUserId);
              const d = (list || []).find(x => x.id === docId);
              if (d) { setForm({ ...d, expiry_date: fmtDate(d.expiry_date) }); setFile(null); setShowModal("doc"); }
              else showToast("Document not found", "error");
            } catch (e) { showToast(e.message, "error"); }
          }}
          onDeleteDocument={(docId) => deleteDoc(docId)}
          onEditTraining={async (trId) => {
            try {
              const list = await af("/api/hr/training?user_id=" + folderUserId);
              const r = (list || []).find(x => x.id === trId);
              if (r) { setForm({ ...r, completed_date: fmtDate(r.completed_date), expiry_date: fmtDate(r.expiry_date) }); setShowModal("training"); }
              else showToast("Training record not found", "error");
            } catch (e) { showToast(e.message, "error"); }
          }}
        />
      )}

      {/* DOCUMENTS TAB */}
      {tab === "documents" && <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: t.textSec }}>{docs.length} document{docs.length !== 1 ? "s" : ""}</div>
          <Btn t={t} onClick={() => { setForm({ user_id: selUser }); setFile(null); setShowModal("doc"); }}>+ Add Document</Btn>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}><Ic d="M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" sz={16} c={t.textMut} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input value={docQ} onChange={e => { setDocQ(e.target.value); setDocPage(1); }} placeholder="Search employee, category, file, uploaded by" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 36px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13 }} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: t.textMut }}>Show</span><select value={hrPerPage} onChange={e => { setHrPerPage(Number(e.target.value)); setDocPage(1); }} style={{ padding: "9px 10px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>{[10, 25, 50, 100].map(nn => <option key={nn} value={nn}>{nn}</option>)}</select></div>
        </div>
        {(() => {
          const searched = docs.filter(d => { if (!docQ.trim()) return true; const hay = ((d.user_name || "") + " " + (HR_CATEGORY_LABEL(d.category) || "") + " " + (d.file_name || "") + " " + (d.uploaded_by_name || "")).toLowerCase(); return hay.includes(docQ.trim().toLowerCase()); });
          const totalPages = Math.max(1, Math.ceil(searched.length / hrPerPage));
          const cur = Math.min(docPage, totalPages);
          const items = searched.slice((cur - 1) * hrPerPage, cur * hrPerPage);
          const columns = [
            { header: "Employee", render: d => <span style={{ color: t.text }}>{d.user_name}</span> },
            { header: "Category", render: d => <span style={{ color: t.text }}>{HR_CATEGORY_LABEL(d.category)}</span> },
            { header: "File", render: d => d.file_name ? <button onClick={() => viewDoc(d.id)} style={{ background: "none", border: "none", color: BL, cursor: "pointer", padding: 0, fontSize: 13, textAlign: "left", fontFamily: "inherit" }}>{d.file_name}</button> : <span style={{ color: t.textMut }}>No file</span> },
            { header: "Expiry", render: d => <span>{expiryBadge(d.expiry_date)}{d.expiry_date ? <span style={{ color: t.textSec, fontSize: 11, marginLeft: 4 }}>{fmtDate(d.expiry_date)}</span> : ""}</span> },
            { header: "Uploaded By", tdStyle: { color: t.textSec }, render: d => d.uploaded_by_name || "" },
            { header: "Date", tdStyle: { color: t.textSec, fontSize: 12, whiteSpace: "nowrap" }, render: d => fd(d.created_at) },
            { header: "", align: "right", render: d => <div style={{ whiteSpace: "nowrap" }}><button onClick={() => { setForm({ ...d, expiry_date: fmtDate(d.expiry_date) }); setFile(null); setShowModal("doc"); }} style={{ background: "none", border: "none", color: BL, cursor: "pointer", marginRight: 8, fontSize: 12 }}>Edit</button><button onClick={() => deleteDoc(d.id)} style={{ background: "none", border: "none", color: RD, cursor: "pointer", fontSize: 12 }}>Delete</button></div> }
          ];
          return <DataTable t={t} columns={columns} rows={items} rowKey={d => d.id} empty={docs.length === 0 ? "No documents found. Use Add Document to upload." : "No documents match this search."} footer={<Pagination t={t} page={cur} perPage={hrPerPage} total={searched.length} onPage={setDocPage} />} />;
        })()}
      </div>}

      {/* TRAINING TAB */}
      {tab === "training" && <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: t.textSec }}>{training.length} record{training.length !== 1 ? "s" : ""}</div>
          <Btn t={t} onClick={() => { setForm({ user_id: selUser }); setShowModal("training"); }}>+ Add Training</Btn>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}><Ic d="M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" sz={16} c={t.textMut} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input value={trQ} onChange={e => { setTrQ(e.target.value); setTrPage(1); }} placeholder="Search employee, training, type, administered by" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 36px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13 }} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: t.textMut }}>Show</span><select value={hrPerPage} onChange={e => { setHrPerPage(Number(e.target.value)); setTrPage(1); }} style={{ padding: "9px 10px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>{[10, 25, 50, 100].map(nn => <option key={nn} value={nn}>{nn}</option>)}</select></div>
        </div>
        {(() => {
          const searched = training.filter(r => { if (!trQ.trim()) return true; const hay = ((r.user_name || "") + " " + (r.training_name || "") + " " + (trainingTypeMap[r.training_type] || r.training_type || "") + " " + (r.administered_by || "")).toLowerCase(); return hay.includes(trQ.trim().toLowerCase()); });
          const totalPages = Math.max(1, Math.ceil(searched.length / hrPerPage));
          const cur = Math.min(trPage, totalPages);
          const items = searched.slice((cur - 1) * hrPerPage, cur * hrPerPage);
          const columns = [
            { header: "Employee", render: r => <span style={{ color: t.text }}>{r.user_name}</span> },
            { header: "Training Name", tdStyle: { color: t.text, fontWeight: 500 }, render: r => r.training_name },
            { header: "Type", tdStyle: { color: t.textSec }, render: r => trainingTypeMap[r.training_type] || r.training_type },
            { header: "Completed", tdStyle: { fontSize: 12, whiteSpace: "nowrap" }, render: r => r.completed_date ? <span style={{ color: t.textSec }}>{fmtDate(r.completed_date)}</span> : <span style={{ color: OR }}>Pending</span> },
            { header: "Expiry", render: r => <span>{expiryBadge(r.expiry_date)}{r.expiry_date ? <span style={{ color: t.textSec, fontSize: 11, marginLeft: 4 }}>{fmtDate(r.expiry_date)}</span> : ""}</span> },
            { header: "Score", tdStyle: { color: t.textSec }, render: r => r.score || "" },
            { header: "Administered By", tdStyle: { color: t.textSec }, render: r => r.administered_by || "" },
            { header: "", align: "right", render: r => <div style={{ whiteSpace: "nowrap" }}><button onClick={() => { setForm({ ...r, completed_date: fmtDate(r.completed_date), expiry_date: fmtDate(r.expiry_date) }); setShowModal("training"); }} style={{ background: "none", border: "none", color: BL, cursor: "pointer", marginRight: 8, fontSize: 12 }}>Edit</button><button onClick={() => deleteTraining(r.id)} style={{ background: "none", border: "none", color: RD, cursor: "pointer", fontSize: 12 }}>Delete</button></div> }
          ];
          return <DataTable t={t} columns={columns} rows={items} rowKey={r => r.id} empty={training.length === 0 ? "No training records found." : "No records match this search."} footer={<Pagination t={t} page={cur} perPage={hrPerPage} total={searched.length} onPage={setTrPage} />} />;
        })()}
      </div>}

      {/* ONBOARDING TAB */}
      {tab === "onboarding" && <div>
        {!selUser ? <div style={{ padding: 40, textAlign: "center", color: t.textMut, background: t.card, borderRadius: 12, border: "1px solid " + t.border }}>Select an employee to view their onboarding checklist.</div> : <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: t.textSec }}>
              {onboarding.length > 0 ? onboarding.filter(s => s.is_completed).length + " of " + onboarding.length + " steps complete" : "No checklist initialized"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {onboarding.length === 0 && <Btn t={t} onClick={initOnboarding}>Initialize Onboarding</Btn>}
              {onboarding.length > 0 && <Btn t={t} v="ghost" onClick={() => { setForm({}); setShowModal("onbStep"); }}>+ Custom Step</Btn>}
            </div>
          </div>
          {onboarding.length > 0 && (() => {
            const cats = [...new Set(onboarding.map(s => s.step_category))];
            return cats.map(cat => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.goldText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{onbCatMap[cat] || cat}</div>
                <div style={{ background: t.card, borderRadius: 12, border: "1px solid " + t.border, overflow: "hidden" }}>
                  {onboarding.filter(s => s.step_category === cat).map(step => (
                    <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: "1px solid " + t.border }}>
                      <input type="checkbox" checked={step.is_completed} onChange={() => toggleStep(step)} style={{ width: 18, height: 18, cursor: "pointer", accentColor: GO }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: step.is_completed ? t.textMut : t.text, textDecoration: step.is_completed ? "line-through" : "none", fontSize: 13 }}>{step.step_name}</div>
                        {step.is_completed && step.completed_date && <div style={{ fontSize: 11, color: t.textMut }}>Completed {fmtDate(step.completed_date)}{step.completed_by_name ? " by " + step.completed_by_name : ""}</div>}
                      </div>
                      <button onClick={() => deleteStep(step.id)} style={{ background: "none", border: "none", color: t.textMut, cursor: "pointer", fontSize: 11 }}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </>}
      </div>}

      {/* COMPLIANCE TAB */}
      {tab === "compliance" && <div>
        {!compliance ? <div style={{ padding: 40, textAlign: "center", color: t.textMut }}>Loading...</div> : <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Expired Documents", val: compliance.expiredDocs.length, bg: t.redSubtle, bdr: t.redBorder, c: RD },
              { label: "Expiring (30 days)", val: compliance.expiringDocs.length + compliance.expiringTraining.length, bg: t.orangeSubtle, bdr: t.orangeBorder, c: OR },
              { label: "Expired Training", val: compliance.expiredTraining.length, bg: t.redSubtle, bdr: t.redBorder, c: RD },
              { label: "Staff with Onboarding", val: compliance.onboardingProgress.length, bg: t.blueSubtle, bdr: t.blueBorder, c: BL },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, border: "1px solid " + s.bdr, borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 28, fontWeight: 600, color: s.c }}>{s.val}</div>
                <div style={{ fontSize: 12, color: t.textSec, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {(compliance.expiredDocs.length > 0 || compliance.expiredTraining.length > 0) && <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: RD, marginBottom: 10 }}>Expired Items</div>
            <div style={{ background: t.card, borderRadius: 12, border: "1px solid " + t.redBorder, overflow: "hidden" }}>
              {compliance.expiredDocs.map(d => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid " + t.border, fontSize: 13 }}>
                  <span style={{ color: t.text }}>{d.user_name}</span>
                  <span style={{ color: t.textSec }}>{HR_CATEGORY_LABEL(d.category || d.document_type)}</span>
                  <span style={{ color: RD }}>{fmtDate(d.expiry_date)}</span>
                </div>
              ))}
              {compliance.expiredTraining.map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid " + t.border, fontSize: 13 }}>
                  <span style={{ color: t.text }}>{r.user_name}</span>
                  <span style={{ color: t.textSec }}>{r.training_name}</span>
                  <span style={{ color: RD }}>{fmtDate(r.expiry_date)}</span>
                </div>
              ))}
            </div>
          </div>}

          {(compliance.expiringDocs.length > 0 || compliance.expiringTraining.length > 0) && <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: OR, marginBottom: 10 }}>Expiring Within 30 Days</div>
            <div style={{ background: t.card, borderRadius: 12, border: "1px solid " + t.orangeBorder, overflow: "hidden" }}>
              {compliance.expiringDocs.map(d => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid " + t.border, fontSize: 13 }}>
                  <span style={{ color: t.text }}>{d.user_name}</span>
                  <span style={{ color: t.textSec }}>{HR_CATEGORY_LABEL(d.category || d.document_type)}</span>
                  <span style={{ color: OR }}>{fmtDate(d.expiry_date)}</span>
                </div>
              ))}
              {compliance.expiringTraining.map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid " + t.border, fontSize: 13 }}>
                  <span style={{ color: t.text }}>{r.user_name}</span>
                  <span style={{ color: t.textSec }}>{r.training_name}</span>
                  <span style={{ color: OR }}>{fmtDate(r.expiry_date)}</span>
                </div>
              ))}
            </div>
          </div>}

          {compliance.onboardingProgress.length > 0 && <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 10 }}>Onboarding Progress</div>
            <div style={{ background: t.card, borderRadius: 12, border: "1px solid " + t.border, overflow: "hidden" }}>
              {compliance.onboardingProgress.map(o => {
                const pct = Math.round((o.completed_steps / o.total_steps) * 100);
                return (
                  <div key={o.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: "1px solid " + t.border }}>
                    <div style={{ flex: 1, color: t.text, fontSize: 13 }}>{o.user_name}</div>
                    <div style={{ width: 120, height: 6, background: t.inputBg, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? GR : GO, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 12, color: pct === 100 ? GR : t.textSec, fontWeight: 600, minWidth: 50, textAlign: "right" }}>{o.completed_steps}/{o.total_steps}</div>
                  </div>
                );
              })}
            </div>
          </div>}

          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 10 }}>Staff Summary</div>
            <div style={{ background: t.card, borderRadius: 12, border: "1px solid " + t.border, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: "1px solid " + t.border }}>
                  {["Employee", "Role", "Documents", "Forms", "Training", "Onboarding", "Aliases", "Expired Docs", "Expired Training"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: t.textMut, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>)}
                </tr></thead>
                <tbody>{compliance.staffSummary.map(s => (
                  <tr key={s.id} style={{ borderBottom: "1px solid " + t.border }}>
                    <td style={{ padding: "10px 12px", color: t.text }}>{s.user_name}</td>
                    <td style={{ padding: "10px 12px", color: t.textSec }}>{s.role}</td>
                    <td style={{ padding: "10px 12px", color: t.textSec }}>{s.doc_count}</td>
                    <td style={{ padding: "10px 12px", color: t.textSec }}>{s.jotform_count || 0}</td>
                    <td style={{ padding: "10px 12px", color: t.textSec }}>{s.training_count}</td>
                    <td style={{ padding: "10px 12px" }}>{(() => {
                      const total = parseInt(s.onb_total) || 0;
                      const completed = parseInt(s.onb_completed) || 0;
                      if (total === 0) return <span style={{ color: t.textMut }}>--</span>;
                      const isComplete = completed === total;
                      const isStarted = completed > 0;
                      const color = isComplete ? GR : (isStarted ? OR : t.textMut);
                      return <span style={{ color, fontWeight: isComplete ? 600 : 400 }}>{completed} / {total}</span>;
                    })()}</td>
                    {/* Session 27: alias_count column. Highlighted when > 0 so admins can
                        see which employees have learned matching mappings. */}
                    <td style={{ padding: "10px 12px" }}>{parseInt(s.alias_count) > 0 ? <span style={{ color: BL, fontWeight: 600 }}>{s.alias_count}</span> : <span style={{ color: t.textMut }}>0</span>}</td>
                    <td style={{ padding: "10px 12px" }}>{parseInt(s.expired_docs) > 0 ? <span style={{ color: RD, fontWeight: 600 }}>{s.expired_docs}</span> : <span style={{ color: t.textMut }}>0</span>}</td>
                    <td style={{ padding: "10px 12px" }}>{parseInt(s.expired_training) > 0 ? <span style={{ color: RD, fontWeight: 600 }}>{s.expired_training}</span> : <span style={{ color: t.textMut }}>0</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>}
      </div>}

      {/* OTHER TAB */}
      {tab === "other" && <div>
        {(() => { const otherDocs = docs.filter(d => d.category === "other"); const searched = otherDocs.filter(d => { if (!otQ.trim()) return true; const hay = ((d.user_name || "") + " " + (d.file_name || "") + " " + (d.notes || "")).toLowerCase(); return hay.includes(otQ.trim().toLowerCase()); }); const totalPages = Math.max(1, Math.ceil(searched.length / hrPerPage)); const cur = Math.min(otPage, totalPages); const items = searched.slice((cur - 1) * hrPerPage, cur * hrPerPage); const columns = [
            { header: "Employee", render: d => <span style={{ color: t.text }}>{d.user_name}</span> },
            { header: "File", render: d => d.file_name ? <button onClick={() => viewDoc(d.id)} style={{ background: "none", border: "none", color: BL, cursor: "pointer", padding: 0, fontSize: 13, textAlign: "left", fontFamily: "inherit" }}>{d.file_name}</button> : <span style={{ color: t.textMut }}>No file</span> },
            { header: "Notes", tdStyle: { color: t.textSec, fontSize: 12, maxWidth: 280 }, render: d => d.notes || "" },
            { header: "Expiry", render: d => <span>{expiryBadge(d.expiry_date)}{d.expiry_date ? <span style={{ color: t.textSec, fontSize: 11, marginLeft: 4 }}>{fmtDate(d.expiry_date)}</span> : ""}</span> },
            { header: "Uploaded By", tdStyle: { color: t.textSec }, render: d => d.uploaded_by_name || "" },
            { header: "Date", tdStyle: { color: t.textSec, fontSize: 12, whiteSpace: "nowrap" }, render: d => fd(d.created_at) },
            { header: "", align: "right", render: d => <div style={{ whiteSpace: "nowrap" }}><button onClick={() => { setForm({ ...d, expiry_date: fmtDate(d.expiry_date) }); setFile(null); setShowModal("doc"); }} style={{ background: "none", border: "none", color: BL, cursor: "pointer", marginRight: 8, fontSize: 12 }}>Edit</button><button onClick={() => deleteDoc(d.id)} style={{ background: "none", border: "none", color: RD, cursor: "pointer", fontSize: 12 }}>Delete</button></div> }
          ]; return (<>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: t.textSec }}>{otherDocs.length} item{otherDocs.length !== 1 ? "s" : ""}</div>
          <Btn t={t} onClick={() => { setForm({ user_id: selUser, category: "other" }); setFile(null); setShowModal("doc"); }}>+ Add Other</Btn>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}><Ic d="M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" sz={16} c={t.textMut} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input value={otQ} onChange={e => { setOtQ(e.target.value); setOtPage(1); }} placeholder="Search employee, file, notes" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 36px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13 }} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: t.textMut }}>Show</span><select value={hrPerPage} onChange={e => { setHrPerPage(Number(e.target.value)); setOtPage(1); }} style={{ padding: "9px 10px", borderRadius: R.sm, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>{[10, 25, 50, 100].map(nn => <option key={nn} value={nn}>{nn}</option>)}</select></div>
        </div>
        <DataTable t={t} columns={columns} rows={items} rowKey={d => d.id} empty={otherDocs.length === 0 ? "No items filed under Other. Use Add Other to upload." : "No items match this search."} footer={<Pagination t={t} page={cur} perPage={hrPerPage} total={searched.length} onPage={setOtPage} />} />
        </>); })()}
      </div>}

      {/* DOCUMENT MODAL */}
      {showModal === "doc" && <Mdl t={t} onClose={() => { setShowModal(null); setForm({}); setFile(null); }}>
        <div style={{ padding: 20 }}><div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>{form.id ? "Edit Document" : "Add Document"}</div>
          <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Employee</div>
            <Sel options={[{ v: "", l: "Select employee..." }, ...staffOpts.filter(s => s.v)]} value={form.user_id || ""} onChange={e => setForm({ ...form, user_id: e.target.value })} t={t} /></div>
          <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Category</div>
            <Sel options={[{ v: "", l: "Select category..." }, ...HR_CATEGORY_OPTS.map(c => ({ v: c.v, l: c.l }))]} value={form.category || ""} onChange={e => setForm({ ...form, category: e.target.value })} t={t} /></div>
          {!form.id && (<div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Upload File</div>
            <input type="file" onChange={e => setFile(e.target.files[0])} style={{ fontSize: 13, color: t.text }} /></div>)}
          <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Expiry Date (optional)</div>
            <Inp t={t} type="date" value={form.expiry_date || ""} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
          <JotformPickerField af={af} form={form} setForm={setForm} t={t} />
          <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Notes (optional)</div>
            <textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: FONT_BODY, resize: "vertical" }} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn t={t} v="ghost" onClick={() => { setShowModal(null); setForm({}); setFile(null); }}>Cancel</Btn>
            <Btn t={t} onClick={submitDoc}>{form.id ? "Save" : "Add"}</Btn>
          </div>
        </div></div>
      </Mdl>}

      {/* TRAINING MODAL */}
      {showModal === "training" && <Mdl t={t} onClose={() => { setShowModal(null); setForm({}); }}>
        <div style={{ padding: 20 }}><div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>{form.id ? "Edit Training Record" : "Add Training Record"}</div>
          <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Employee</div>
            <Sel options={[{ v: "", l: "Select employee..." }, ...staffOpts.filter(s => s.v)]} value={form.user_id || ""} onChange={e => setForm({ ...form, user_id: e.target.value })} t={t} /></div>
          <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Training Name</div>
            <Inp t={t} placeholder="e.g. General Cleaning Training" value={form.training_name || ""} onChange={e => setForm({ ...form, training_name: e.target.value })} /></div>
          <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Training Type</div>
            <Sel options={trainingTypeOpts} value={form.training_type || ""} onChange={e => setForm({ ...form, training_type: e.target.value })} t={t} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Completed Date</div>
              <Inp t={t} type="date" value={form.completed_date || ""} onChange={e => setForm({ ...form, completed_date: e.target.value })} /></div>
            <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Expiry Date</div>
              <Inp t={t} type="date" value={form.expiry_date || ""} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Score</div>
              <Inp t={t} placeholder="e.g. 95% or Pass" value={form.score || ""} onChange={e => setForm({ ...form, score: e.target.value })} /></div>
            <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Administered By</div>
              <Inp t={t} placeholder="e.g. Sameerah" value={form.administered_by || ""} onChange={e => setForm({ ...form, administered_by: e.target.value })} /></div>
          </div>
          <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Notes (optional)</div>
            <textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid " + t.inputBorder, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: FONT_BODY, resize: "vertical" }} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn t={t} v="ghost" onClick={() => { setShowModal(null); setForm({}); }}>Cancel</Btn>
            <Btn t={t} onClick={submitTraining}>{form.id ? "Save" : "Add"}</Btn>
          </div>
        </div></div>
      </Mdl>}

      {/* ONBOARDING STEP MODAL */}
      {showModal === "onbStep" && <Mdl t={t} onClose={() => { setShowModal(null); setForm({}); }}>
        <div style={{ padding: 20 }}><div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: t.text }}>Add Custom Onboarding Step</div>
          <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Step Name</div>
            <Inp t={t} placeholder="e.g. Complete bloodborne pathogens training" value={form.step_name || ""} onChange={e => setForm({ ...form, step_name: e.target.value })} /></div>
          <div><div style={{ fontSize: 11, color: t.textMut, marginBottom: 4 }}>Category</div>
            <Sel options={onbCatOpts} value={form.step_category || ""} onChange={e => setForm({ ...form, step_category: e.target.value })} t={t} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn t={t} v="ghost" onClick={() => { setShowModal(null); setForm({}); }}>Cancel</Btn>
            <Btn t={t} onClick={addCustomStep}>Add Step</Btn>
          </div>
        </div></div>
      </Mdl>}
    </div>
  );
}
