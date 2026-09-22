import React, { useEffect, useRef, useState } from 'react';
import { detectInstallMode, shouldShowInstallPrompt, rememberInstallChoice, INSTALL_STEPS } from './installPromptLogic';
import clientConfig from './clientConfig';

// The "add to home screen" sheet. Mounted once at the root, so it appears on every screen including
// sign-in. It imports nothing from App.js and uses the system font, so it renders the same whatever
// the app's theme. Every storage read and write goes through installPromptLogic, wrapped in try/catch.

const SETTLE_MS = 1500;
const INSTALL_EVENT_WAIT_MS = 3000;
const FONT = '-apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const NAVY = '#0A1628';
const BLUE = clientConfig.brand.panelLight;

function isStandalone() {
  try {
    if (window.navigator && window.navigator.standalone === true) return true;
    return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  } catch { return false; }
}

function safeStorage() {
  try { return window.localStorage; } catch { return null; }
}

function deviceInfo(hasInstallEvent) {
  const n = window.navigator || {};
  return {
    ua: n.userAgent || '',
    platform: n.platform || '',
    maxTouchPoints: n.maxTouchPoints || 0,
    hasInstallEvent: !!hasInstallEvent,
    standalone: isStandalone(),
  };
}

// A square with an arrow pointing up out of it. Drawn here, so it belongs to this project.
function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: '-3px', margin: '0 2px' }}>
      <path d="M12 15V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </svg>
  );
}

function StepText({ text }) {
  const idx = text.indexOf('Share button');
  if (idx < 0) return text;
  return <>{text.slice(0, idx)}Share button<ShareIcon />{text.slice(idx + 'Share button'.length)}</>;
}

export default function InstallPrompt() {
  const [mode, setMode] = useState('none');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const installEvent = useRef(null);
  const closedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timers = [];
    const storage = safeStorage();
    const state = () => ({ standalone: isStandalone(), installed: false, storage, now: Date.now() });

    const onBeforeInstall = (e) => {
      e.preventDefault();
      installEvent.current = e;
      if (!cancelled && !closedRef.current && shouldShowInstallPrompt(state())) {
        setMode('android_prompt');
      }
    };
    const onInstalled = () => {
      rememberInstallChoice(storage, 'installed');
      installEvent.current = null;
      closedRef.current = true;
      setOpen(false);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const decide = (hasInstallEvent) => {
      if (cancelled || closedRef.current) return;
      if (!shouldShowInstallPrompt(state())) return;
      const m = detectInstallMode(deviceInfo(hasInstallEvent));
      if (m === 'none') return;
      setMode(m);
      setOpen(true);
    };

    timers.push(setTimeout(() => {
      if (installEvent.current) { decide(true); return; }
      const first = detectInstallMode(deviceInfo(false));
      if (first === 'android_manual') {
        // Give Android Chrome a few seconds to fire beforeinstallprompt before showing manual steps.
        timers.push(setTimeout(() => decide(!!installEvent.current), INSTALL_EVENT_WAIT_MS));
      } else {
        decide(false);
      }
    }, SETTLE_MS));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const close = (choice) => {
    closedRef.current = true;
    rememberInstallChoice(safeStorage(), choice);
    setOpen(false);
  };

  const install = async () => {
    const ev = installEvent.current;
    if (!ev) { setMode('android_manual'); return; }
    try {
      ev.prompt();
      const result = await ev.userChoice;
      if (result && result.outcome === 'accepted') close('installed');
      else close('not_now');
    } catch {
      setMode('android_manual');
    }
    installEvent.current = null;
  };

  const copyAddress = async () => {
    try {
      await window.navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!open || mode === 'none') return null;
  const steps = INSTALL_STEPS[mode] || [];
  const address = (() => { try { return window.location.href; } catch { return ''; } })();

  const btn = {
    minHeight: 44, padding: '0 10px', borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: FONT,
    cursor: 'pointer', flex: '1 1 0', border: '1px solid ' + BLUE,
  };

  return (
    <div
      role="presentation"
      onClick={() => close('not_now')}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(10,22,40,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: FONT }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocsa-install-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', color: NAVY, borderRadius: '20px 20px 0 0', padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', boxShadow: '0 -8px 32px rgba(0,0,0,0.25)', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <img src={process.env.PUBLIC_URL + '/icons/icon-192.png'} alt="" width="56" height="56" style={{ width: 56, height: 56, borderRadius: 14, border: '1px solid rgba(10,22,40,0.12)', flexShrink: 0 }} />
          <div id="ocsa-install-title" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}>Add OCSA Admin to your home screen</div>
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.4, marginBottom: 12, color: '#3A4A60' }}>It opens like an app, one tap from your home screen.</div>
        <ol style={{ margin: '0 0 16px 0', padding: '0 0 0 22px', fontSize: 15, lineHeight: 1.5 }}>
          {steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}><StepText text={s} /></li>)}
        </ol>
        {mode === 'in_app_browser' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '10px 12px', borderRadius: 10, background: '#F1F4F8', border: '1px solid rgba(10,22,40,0.12)', wordBreak: 'break-all', userSelect: 'all', WebkitUserSelect: 'all' }}>{address}</div>
            <button type="button" onClick={copyAddress} style={{ ...btn, flex: '0 0 auto', background: '#FFFFFF', color: BLUE }}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
        )}
        {mode === 'android_prompt' && (
          <button type="button" onClick={install} style={{ ...btn, width: '100%', flex: 'none', background: BLUE, color: '#FFFFFF', marginBottom: 10 }}>Install</button>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => close('not_now')} style={{ ...btn, background: '#FFFFFF', color: BLUE }}>Not now</button>
          <button type="button" onClick={() => close('never')} style={{ ...btn, background: '#FFFFFF', color: '#3A4A60', borderColor: 'rgba(10,22,40,0.2)' }}>Don't show again</button>
        </div>
      </div>
    </div>
  );
}
