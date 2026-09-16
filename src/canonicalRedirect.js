// One address for the app. When REACT_APP_CANONICAL_ORIGIN and REACT_APP_REDIRECT_FROM_HOST are both
// set at build time, a page served from exactly the named host is sent to the same path and query on
// the canonical origin before anything renders. Preview deployments, localhost and every other host
// are left alone. When either variable is unset, nothing happens.

export function canonicalRedirectTarget(env, location) {
  const origin = String((env && env.REACT_APP_CANONICAL_ORIGIN) || "").trim().replace(/\/+$/, "");
  const fromHost = String((env && env.REACT_APP_REDIRECT_FROM_HOST) || "").trim().toLowerCase();
  if (!origin || !fromHost || !location) return null;
  const host = String(location.host || "").toLowerCase();
  if (host !== fromHost) return null;
  let canonicalHost = "";
  try { canonicalHost = new URL(origin).host.toLowerCase(); } catch { return null; }
  if (!canonicalHost || canonicalHost === host) return null;
  return origin + (location.pathname || "/") + (location.search || "") + (location.hash || "");
}

export function applyCanonicalRedirect() {
  const target = canonicalRedirectTarget(process.env, window.location);
  if (target) window.location.replace(target);
  return !!target;
}
