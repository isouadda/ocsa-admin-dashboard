// Pure rules for the "add to home screen" sheet. No React, no DOM access beyond what is passed in,
// so they can be run as a script against a table of user agents and storage states.

export const INSTALL_PROMPT_KEY = "ocsa-install-prompt";
export const NOT_NOW_DAYS = 7;

// Reads: ua, maxTouchPoints, hasInstallEvent, standalone.
// Returns exactly one of: android_prompt, android_manual, ios_safari, ios_other_browser,
// in_app_browser, none.
export function detectInstallMode(info) {
  const ua = String((info && info.ua) || "");
  const touch = Number((info && info.maxTouchPoints) || 0) > 1;
  if (info && info.standalone) return "none";
  const isIPhone = /iPhone|iPod/.test(ua);
  const isIPadUA = /iPad/.test(ua);
  const isIPadDesktopUA = /Macintosh/.test(ua) && touch;
  const isIOS = isIPhone || isIPadUA || isIPadDesktopUA;
  const isAndroid = /Android/.test(ua);
  if (!isIOS && !isAndroid) return "none";
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|TikTok|Snapchat|LinkedInApp|BytedanceWebview|MicroMessenger|; wv\)/.test(ua);
  if (inApp) return "in_app_browser";
  if (isIOS) {
    const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|Brave|YaBrowser/.test(ua);
    return otherBrowser ? "ios_other_browser" : "ios_safari";
  }
  return info && info.hasInstallEvent ? "android_prompt" : "android_manual";
}

// Reads: standalone, installed, storage (object with getItem), now (ms).
// A storage failure means the sheet shows.
export function shouldShowInstallPrompt(state) {
  if (state && (state.standalone || state.installed)) return false;
  let raw = null;
  try { raw = state && state.storage ? state.storage.getItem(INSTALL_PROMPT_KEY) : null; } catch { return true; }
  if (!raw) return true;
  let saved = null;
  try { saved = JSON.parse(raw); } catch { return true; }
  if (!saved || typeof saved !== "object") return true;
  if (saved.installed || saved.never) return false;
  const notNowAt = Number(saved.notNowAt || 0);
  const now = Number((state && state.now) || Date.now());
  if (notNowAt && now - notNowAt < NOT_NOW_DAYS * 24 * 60 * 60 * 1000) return false;
  return true;
}

export function rememberInstallChoice(storage, choice, now) {
  const value = choice === "never" ? { never: true }
    : choice === "installed" ? { installed: true }
    : { notNowAt: Number(now || Date.now()) };
  try { storage.setItem(INSTALL_PROMPT_KEY, JSON.stringify(value)); } catch {}
}

export const INSTALL_STEPS = {
  android_prompt: ["Tap Install below.", "Confirm on the next screen."],
  android_manual: ["Open the browser menu (the three dots).", "Tap Add to Home screen or Install app.", "Tap Add or Install."],
  ios_safari: ["Tap the Share button at the bottom of the screen.", "Scroll down and tap Add to Home Screen.", "Tap Add."],
  ios_other_browser: ["Tap the Share button in the address bar.", "Tap Add to Home Screen.", "Tap Add."],
  in_app_browser: ["Open this page in Safari or Chrome first.", "Copy the address below and paste it there.", "Then add it to your home screen from that browser."],
  none: []
};
