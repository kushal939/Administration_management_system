/**
 * SikhyaSuchak.jsx
 * Location: src/pages/SikhyaSuchak.jsx
 *
 * Main page wrapper for the Sikhya Suchak ML module.
 * Routes to Student / Teacher / Admin views based on user role.
 * Includes API health check and toast notifications.
 */

import { useState, useEffect } from 'react';
import StudentDashboard from '../components/sikhyasuchak/StudentDashboard';
import TeacherDashboard from '../components/sikhyasuchak/TeacherDashboard';
import AdminDashboard   from '../components/sikhyasuchak/AdminDashboard';
import { fetchHealthCheck, fetchModelStatus } from '../components/sikhyasuchak/api';

// ── Toast notification ────────────────────────────────────────────────────────
const Toast = ({ message, type = 'info', onClose }) => {
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error:   'bg-red-50   border-red-200   text-red-800',
    info:    'bg-blue-50  border-blue-200  text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  };
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-start gap-3 border rounded-2xl px-4 py-3 shadow-lg max-w-sm animate-slide-in ${colors[type]}`}>
      <span className="shrink-0 text-sm">{icons[type]}</span>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onClose} className="text-sm opacity-60 hover:opacity-100 ml-1">✕</button>
    </div>
  );
};

// ── API status pill ───────────────────────────────────────────────────────────
const StatusPill = ({ apiOk, mlReady, checking }) => {
  if (checking) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-xs text-slate-500 font-semibold">
        <span className="w-2.5 h-2.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        Checking API...
      </div>
    );
  }
  if (!apiOk) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 rounded-xl text-xs text-red-700 font-semibold">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        API Offline
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-xl text-xs text-green-700 font-semibold">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        API Online
      </div>
      {mlReady !== null && (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
          mlReady ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${mlReady ? 'bg-blue-500' : 'bg-amber-500'}`} />
          {mlReady ? 'ML Ready' : 'Rule-Based Mode'}
        </div>
      )}
    </div>
  );
};

// ── View definitions ──────────────────────────────────────────────────────────
const VIEWS = {
  student: { label: '🎓 Student View', roles: ['student', 'admin', 'teacher', 'principal'] },
  teacher: { label: '👨‍🏫 Teacher View', roles: ['admin', 'teacher', 'principal'] },
  admin:   { label: '🏛️ Admin View',   roles: ['admin', 'principal'] },
};

// ── Main component ────────────────────────────────────────────────────────────
const SikhyaSuchak = () => {
  const rawUser = sessionStorage.getItem('user') || localStorage.getItem('user');
  const user    = rawUser ? JSON.parse(rawUser) : null;
  const role    = user?.role?.toLowerCase() || 'student';

  // Default view per role
  const defaultView = role === 'student' ? 'student'
    : role === 'admin' || role === 'principal' ? 'admin'
    : 'teacher';

  const [activeView, setActiveView] = useState(defaultView);

  // API health state
  const [apiOk,     setApiOk]     = useState(null);
  const [mlReady,   setMlReady]   = useState(null);
  const [checking,  setChecking]  = useState(true);
  const [toast,     setToast]     = useState(null);

  const showToast = (message, type = 'info', duration = 4000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  // Health check on mount
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setChecking(true);
      try {
        await fetchHealthCheck();
        if (!cancelled) {
          setApiOk(true);
          const status = await fetchModelStatus();
          if (!cancelled) {
            setMlReady(status?.ml_ready ?? false);
            if (!status?.ml_ready) {
              showToast('ML model not loaded — using rule-based prediction.', 'warning', 5000);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setApiOk(false);
          setMlReady(false);
          showToast('Sikhya Suchak API is offline. Start it on port 8001.', 'error', 7000);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  // Available views for this role
  const availableViews = Object.entries(VIEWS).filter(([, v]) => v.roles.includes(role));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Module header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] flex items-center justify-center shadow">
              <span className="text-white text-lg">📊</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Sikhya Suchak</h1>
              <p className="text-xs text-[#64748B] font-medium mt-0.5">
                Academic Performance Prediction System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* API status */}
            <StatusPill apiOk={apiOk} mlReady={mlReady} checking={checking} />

            {/* View toggle — hide for students */}
            {availableViews.length > 1 && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {availableViews.map(([key, v]) => (
                  <button
                    key={key}
                    onClick={() => setActiveView(key)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeView === key
                        ? 'bg-[#1E3A8A] text-white shadow'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">

        {/* Offline warning banner */}
        {apiOk === false && !checking && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
            <span className="text-lg">🚫</span>
            <div>
              <p className="font-bold">Sikhya Suchak API is not running</p>
              <p className="text-xs mt-0.5 opacity-80">
                Please start the FastAPI backend on port 8001 to use predictions.
                Run: <code className="bg-red-100 px-1 rounded font-mono">uvicorn main:app --port 8001</code>
              </p>
            </div>
          </div>
        )}

        {activeView === 'student' && <StudentDashboard />}
        {activeView === 'teacher' && <TeacherDashboard />}
        {activeView === 'admin'   && <AdminDashboard   />}
      </div>
    </div>
  );
};

export default SikhyaSuchak;
