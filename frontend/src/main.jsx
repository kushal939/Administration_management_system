import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ── Tab-isolated session patch ────────────────────────────────────────────────
// localStorage is shared across all tabs. This patch makes localStorage
// operations on 'user' use sessionStorage instead, so each tab is fully
// isolated. On refresh, sessionStorage persists (it only clears on tab close).
;(function patchLocalStorageForTabIsolation() {
  const _getItem    = localStorage.getItem.bind(localStorage);
  const _setItem    = localStorage.setItem.bind(localStorage);
  const _removeItem = localStorage.removeItem.bind(localStorage);

  localStorage.getItem = function(key) {
    if (key === 'user') {
      // ONLY return the tab-specific sessionStorage value.
      // Never fall back to localStorage — that would bleed other tabs' sessions in.
      return sessionStorage.getItem('user');
    }
    return _getItem(key);
  };

  localStorage.setItem = function(key, value) {
    if (key === 'user') {
      // Write only to sessionStorage — never pollute other tabs.
      sessionStorage.setItem('user', value);
      return;
    }
    _setItem(key, value);
  };

  localStorage.removeItem = function(key) {
    if (key === 'user') {
      sessionStorage.removeItem('user');
      _removeItem('user'); // also clean up any legacy localStorage entry
      return;
    }
    _removeItem(key);
  };

  // Clean up any stale user entry in localStorage left from before this patch
  _removeItem('user');
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
