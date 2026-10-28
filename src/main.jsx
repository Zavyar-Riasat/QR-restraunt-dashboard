import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './services/pwaService.js'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Theme initialization: default to warm light theme, dark mode only when user explicitly toggles it
try {
  const savedTheme = localStorage.getItem('dinehq_theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch (_) {}

// Automatically recover from Vite chunk load errors after a new Vercel deployment
function recoverFromChunkLoadError() {
  try {
    const lastReload = Number(sessionStorage.getItem('dineflow_chunk_reload_ts') || 0);
    if (Date.now() - lastReload > 10000) {
      sessionStorage.setItem('dineflow_chunk_reload_ts', String(Date.now()));
      if ('caches' in window) {
        caches
          .keys()
          .then((names) => Promise.all(names.map((n) => caches.delete(n))))
          .finally(() => window.location.reload());
      } else {
        window.location.reload();
      }
      return true;
    }
  } catch (_) {}
  return false;
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  recoverFromChunkLoadError();
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event?.reason?.message || event?.reason || '');
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  ) {
    if (recoverFromChunkLoadError()) {
      event.preventDefault();
    }
  }
});

window.addEventListener('error', (e) => {
  console.error('[Dineflow Global Error]', e.error || e.message);
  const root = document.getElementById('root');
  if (root && (!root.innerText || root.innerText.trim() === '')) {
    root.innerHTML = `
      <div style="min-height:100vh;background:#FFF9F2;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;">
        <div style="background:#fff;border:1px solid #F0E4D7;border-radius:16px;padding:24px;max-width:600px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
          <h2 style="color:#D92D20;margin:0 0 12px;font-size:18px;">Application Runtime Error</h2>
          <p style="color:#2B2118;font-size:14px;margin-bottom:12px;">${e.message || 'An error occurred during page execution.'}</p>
          <pre style="background:#FDECEC;color:#D92D20;padding:12px;border-radius:8px;font-size:12px;overflow:auto;max-height:250px;">${e.error?.stack || e.message || 'Unknown stack trace'}</pre>
          <button onclick="window.location.reload()" style="margin-top:16px;padding:8px 16px;background:#F26B1D;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Reload Page</button>
        </div>
      </div>
    `;
  }
});

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err) {
    console.error('[Dineflow Render Crash]', err);
    rootElement.innerHTML = `
      <div style="min-height:100vh;background:#FFF9F2;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;">
        <div style="background:#fff;border:1px solid #F0E4D7;border-radius:16px;padding:24px;max-width:600px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
          <h2 style="color:#D92D20;margin:0 0 12px;font-size:18px;">Failed to initialize Dineflow</h2>
          <pre style="background:#FDECEC;color:#D92D20;padding:12px;border-radius:8px;font-size:12px;overflow:auto;">${err.stack || err.message}</pre>
          <button onclick="window.location.reload()" style="margin-top:16px;padding:8px 16px;background:#F26B1D;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Reload Page</button>
        </div>
      </div>
    `;
  }
}
