import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// PWA Mode Detection
const isPwaMode = () => {
  // Check display mode media query
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check navigator.standalone for older iOS
  if (typeof (navigator as any).standalone === 'boolean') {
    return (navigator as any).standalone;
  }
  
  return false;
};

const updatePwaMode = () => {
  if (isPwaMode()) {
    document.documentElement.classList.add('pwa-mode');
  } else {
    document.documentElement.classList.remove('pwa-mode');
  }
};

// Initial check
updatePwaMode();

// Listen for display mode changes
window.matchMedia('(display-mode: standalone)').addEventListener('change', updatePwaMode);

// Listen for URL changes
window.addEventListener('popstate', updatePwaMode);

// Suppress noisy aborted fetch errors (navigation/rapid refresh)
window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  const msg = String((e as any)?.reason?.message ?? '');
  if (/AbortError|ERR_ABORTED|ERR_INTERNET_DISCONNECTED|Failed to fetch/i.test(msg)) {
    e.preventDefault();
    return;
  }
});

// Suppress resource error events caused by aborted network requests
window.addEventListener('error', (e: ErrorEvent) => {
  const msg = String(e?.message ?? '');
  if (/AbortError|ERR_ABORTED|ERR_INTERNET_DISCONNECTED|Failed to fetch/i.test(msg)) {
    e.preventDefault();
  }
});

// Global console filter to suppress noisy abort/connection-closed errors
const __origConsoleError = console.error.bind(console);
const __origConsoleWarn = console.warn.bind(console);
const __origConsoleLog = console.log.bind(console);

const shouldFilter = (...args: any[]) => {
  try {
    const txt = args.map(a => {
      try {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return String(a.message ?? '') + String(a.stack ?? '');
        if (a && typeof a === 'object') {
          // Check common error properties
          const msg = String((a as any).message ?? '');
          const stack = String((a as any).stack ?? '');
          return msg + ' ' + stack + ' ' + JSON.stringify(a);
        }
        return JSON.stringify(a);
      } catch { return String(a); }
    }).join(' ');
    
    return /AbortError|ERR_ABORTED|ERR_CONNECTION_CLOSED|Failed to fetch|NetworkError|net::ERR_ABORTED|ERR_QUIC_PROTOCOL_ERROR|ERR_INTERNET_DISCONNECTED|The user aborted a request/i.test(txt);
  } catch { return false; }
};

console.error = (...args: any[]) => {
  if (shouldFilter(...args)) return;
  __origConsoleError(...args);
};

console.warn = (...args: any[]) => {
  if (shouldFilter(...args)) return;
  __origConsoleWarn(...args);
};

console.log = (...args: any[]) => {
  if (shouldFilter(...args)) return;
  __origConsoleLog(...args);
};

if (import.meta.env.DEV) {
  root.render(<App />);
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
