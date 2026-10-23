import { useState, useEffect, useCallback } from 'react';
import StudentAvatar from '../components/StudentAvatar';

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent = 'indigo' }) => {
  const c = {
    indigo:  { dot: 'bg-indigo-500',  text: 'text-indigo-600',  bg: 'bg-indigo-50',  ring: 'ring-indigo-100'  },
    emerald: { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
    amber:   { dot: 'bg-amber-400',   text: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-100'   },
    rose:    { dot: 'bg-rose-500',    text: 'text-rose-600',    bg: 'bg-rose-50',    ring: 'ring-rose-100'    },
  }[accent] || { dot: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100' };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-5 flex items-center gap-5">
      <div className={`w-10 h-10 rounded-xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center shrink-0`}>
        <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${c.text} leading-none`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
};

// ── Horizontal bar ────────────────────────────────────────────────────────────
const HBar = ({ data = [], labelKey = 'label', valueKey = 'value', accent = 'indigo', suffix = '' }) => {
  const bar = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-400', rose: 'bg-rose-500' }[accent] || 'bg-indigo-500';
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-300">
      <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">No data yet</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {data.slice(0, 10).map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <p className="text-xs text-gray-500 w-36 shrink-0 truncate" title={d[labelKey]}>{d[labelKey]}</p>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div className={`${bar} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${(d[valueKey] / max) * 100}%` }} />
          </div>
          <p className="text-xs font-semibold text-gray-600 w-12 text-right shrink-0">{d[valueKey]}{suffix}</p>
        </div>
      ))}
      {data.length > 10 && <p className="text-xs text-gray-400 pt-1">+{data.length - 10} more</p>}
    </div>
  );
};

// ── Attendance ring ───────────────────────────────────────────────────────────
const AttendanceRing = ({ rate }) => {
  const pct = Math.min(Math.max(rate || 0, 0), 100);
  const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const r = 36, circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round" transform="rotate(-90 44 44)" />
        <text x="44" y="49" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>{pct.toFixed(1)}%</text>
      </svg>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Attendance Rate</p>
        <p className="text-sm font-semibold text-gray-700">{pct >= 75 ? 'Good standing' : pct >= 50 ? 'Needs attention' : 'Critical'}</p>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const Analytics = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = user?.role?.toLowerCase() || '';
  const isAdmin = role === 'admin' || role === 'principal';

  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filterDept, setFilterDept] = useState('');
  const [filterBatch, setFilterBatch] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/departments').then(r => r.json()).then(d => { if (d.success) setDepartments(d.data || []); });
      fetch('/api/admin/batches', { headers: { 'x-user-role': 'admin' } }).then(r => r.json()).then(d => { if (d.success) setBatches(d.data || []); });
    }
  }, []);

  const loadAnalytics = useCallback(() => {
    setIsLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (role === 'teacher' && user?.id) params.set('teacherId', user.id);
    if (filterDept)  params.set('department', filterDept);
    if (filterBatch) params.set('batchId', filterBatch);
    const url = `/api/analytics/overview${params.toString() ? '?' + params.toString() : ''}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { if (d.success) setAnalytics(d.overview); else setError(d.message || 'Failed'); })
      .catch(() => setError('Network error'))
      .finally(() => setIsLoading(false));
  }, [filterDept, filterBatch, role, user?.id]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  // Filtered batches for dropdown
  const filteredBatches = filterDept ? batches.filter(b => b.department === filterDept) : batches;

  const att = analytics?.attendance;
  const enrollments = (analytics?.courseEnrollments || []).map(c => ({ label: c.course || 'Unknown', value: c.count }));
  const marksDist = (analytics?.marksDistribution || []).map(m => ({ label: `${m.range_start}–${(m.range_start || 0) + 9}`, value: m.count }));
  const atRisk = analytics?.atRiskStudents || [];
  const byDept = (analytics?.attendanceByDept || []).map(d => ({ label: d.department, value: Number(d.rate) }));
  const byBatch = (analytics?.attendanceByBatch || []).map(b => ({ label: b.batch_name, value: Number(b.rate) }));

  const activeFilter = filterDept || filterBatch;

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeFilter ? 'Filtered view' : 'Institution-wide overview'} · students, attendance and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFilter && (
            <button onClick={() => { setFilterDept(''); setFilterBatch(''); }}
              className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-all">
              ✕ Clear filters
            </button>
          )}
          {!isLoading && analytics && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-gray-500">Live data</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter bar — admin/principal only */}
      {isAdmin && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest shrink-0">Filter by</p>
            <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterBatch(''); }}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white min-w-[180px]">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white min-w-[180px]">
              <option value="">All Batches</option>
              {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
            </select>
            {activeFilter && (
              <div className="flex items-center gap-2 flex-wrap">
                {filterDept && <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">{filterDept}</span>}
                {filterBatch && <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">{filteredBatches.find(b => String(b.id) === filterBatch)?.batch_name}</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          ⚠️ {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
          <span className="text-sm">Loading analytics…</span>
        </div>
      ) : analytics && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Students"   value={analytics.totalStudents ?? '—'} accent="indigo" />
            <StatCard label="Attendance Rate"  value={att ? `${att.rate.toFixed(1)}%` : '—'} sub={att ? `${att.present} / ${att.total} present` : ''} accent="emerald" />
            <StatCard label="Average Marks"    value={analytics.avgMarks ?? '—'} accent="amber" />
            <StatCard label="At-Risk Students" value={atRisk.length} sub="Below 40% avg" accent="rose" />
          </div>

          {/* Attendance ring + course enrollments */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Attendance Overview</p>
              <AttendanceRing rate={att?.rate || 0} />
              {att && (
                <div className="mt-5 grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                  {[['Present', att.present, 'text-emerald-600'], ['Absent', (att.total || 0) - (att.present || 0), 'text-red-500'], ['Total', att.total, 'text-gray-700']].map(([l, v, c]) => (
                    <div key={l} className="text-center">
                      <p className={`text-lg font-bold ${c}`}>{v}</p>
                      <p className="text-xs text-gray-400">{l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Course Enrollments</p>
                {enrollments.length > 0 && <span className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-semibold">{enrollments.length} courses</span>}
              </div>
              <HBar data={enrollments} accent="indigo" />
            </div>
          </div>

          {/* Attendance by Department & Batch — only when not already filtered to one batch */}
          {isAdmin && (byDept.length > 1 || byBatch.length > 1) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {byDept.length > 1 && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Attendance by Department</p>
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">% rate</span>
                  </div>
                  <HBar data={byDept} accent="emerald" suffix="%" />
                </div>
              )}
              {byBatch.length > 1 && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Attendance by Batch</p>
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-semibold">% rate</span>
                  </div>
                  <HBar data={byBatch} accent="indigo" suffix="%" />
                </div>
              )}
            </div>
          )}

          {/* Marks distribution */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Marks Distribution</p>
              <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-semibold">Score ranges</span>
            </div>
            <HBar data={marksDist} accent="amber" />
          </div>

          {/* At-risk students */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">At-Risk Students</p>
                <p className="text-xs text-gray-400 mt-0.5">Average below 40%{activeFilter ? ' · filtered view' : ''}</p>
              </div>
              {atRisk.length > 0 && (
                <span className="text-xs text-rose-600 bg-rose-50 ring-1 ring-rose-200 px-2.5 py-1 rounded-full font-semibold">{atRisk.length} students</span>
              )}
            </div>
            {atRisk.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-emerald-500 text-xl">✓</span>
                </div>
                <p className="text-sm font-semibold text-gray-700">All students performing well</p>
                <p className="text-xs text-gray-400 mt-1">No students below the 40% threshold{activeFilter ? ' in this filter' : ''}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Student', 'ID', 'Department', 'Batch', 'Avg %'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {atRisk.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <StudentAvatar studentId={s.studentId} name={s.name} size={8} />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                              <p className="text-xs text-gray-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{s.studentId}</span></td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{s.department || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{s.batch_name || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-semibold bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {s.avgPct != null ? `${s.avgPct}%` : `${Number(s.avgMarks).toFixed(1)}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
