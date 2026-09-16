import React from 'react';
import ReactDOM from 'react-dom/client';
import { applyCanonicalRedirect } from './canonicalRedirect';
import App from './App';

// One address. When the build names a canonical origin and a host to move away from, a page served
// from that exact host is sent to the same path on the canonical origin before anything renders.
applyCanonicalRedirect();

// Catches an exception thrown during render anywhere below it, so one bad response or one bad
// line no longer unmounts the whole application. It imports nothing from App.js on purpose: a
// boundary that imports from the file that just threw can throw as well. Colors are inline for
// the same reason. It catches render exceptions only. An error inside an event handler, a promise
// or a timer does not reach it.
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, componentStack: '' };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    const componentStack = (info && info.componentStack) || '';
    this.setState({ componentStack });
    console.error('Render error caught at the root:', error, componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const err = this.state.error;
    const message = (err && (err.stack || err.message)) ? String(err.stack || err.message) : String(err);
    const detail = message + (this.state.componentStack ? '\n\nComponent stack:' + this.state.componentStack : '');
    return (
      <div style={{ minHeight: '100vh', background: '#0A1628', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box', fontFamily: '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Something went wrong and the page needs reloading.</div>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#FFFFFF', color: '#0A1628', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Reload</button>
          <pre style={{ marginTop: 18, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', fontFamily: 'Menlo, Consolas, "Courier New", monospace', fontSize: 11, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 320, overflow: 'auto' }}>{detail}</pre>
        </div>
      </div>
    );
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><RootErrorBoundary><App /></RootErrorBoundary></React.StrictMode>);

// Production only. The worker at public/sw.js caches nothing; it exists so Android browsers
// offer to install the app. Registration failure is silent: the app works the same without it.
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(process.env.PUBLIC_URL + '/sw.js').catch(() => {});
  });
}
