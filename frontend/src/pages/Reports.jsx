import { useState, useEffect } from 'react';
import StudentAvatar from '../components/StudentAvatar';

// ── Mini horizontal bar ───────────────────────────────────────────────────────
const HBar = ({ data = [], valueKey = 'value', labelKey = 'label', accent = 'indigo' }) => {
  const colors = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-400', rose: 'bg-rose-500', violet: 'bg-violet-500' };
  const bar = colors[accent] || colors.indigo;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  if (!data.length) return <p className="text-xs text-gray-400 text-center py-6">No data yet</p>;
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <p className="text-xs text-gray-500 w-28 shrink-0 truncate" title={d[labelKey]}>{d[labelKey]}</p>
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className={`${bar} h-2 rounded-full`} style={{ width: `${(d[valueKey] / max) * 100}%` }} />
          </div>
          <p className="text-xs font-semibold text-gray-600 w-10 text-right shrink-0">{d[valueKey]}</p>
        </div>
      ))}
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const Stat = ({ label, value, sub, accent = 'indigo' }) => {
  const c = { indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100', emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100', amber: 'bg-amber-50 text-amber-600 ring-amber-100', rose: 'bg-rose-50 text-rose-600 ring-rose-100' };
  const cls = c[accent] || c.indigo;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${cls} ring-1 flex items-center justify-center shrink-0`}>
        <span className="w-2.5 h-2.5 rounded-full bg-current" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ── Section card ──────────────────────────────────────────────────────────────
const Card = ({ title, badge, children }) => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {badge && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">{badge}</span>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = user?.role?.toLowerCase() || '';
  const isTeacher = role === 'teacher';

  const tabs = [
    { id: 'overview',    label: 'Overview' },
    { id: 'students',    label: 'Students' },
    { id: 'attendance',  label: 'Attendance' },
    { id: 'marks',       label: 'Marks' },
    ...(!isTeacher ? [{ id: 'fees', label: 'Fees' }] : []),
    { id: 'departments', label: 'Departments' },
  ];

  useEffect(() => {
    if (data[activeTab]) return; // already loaded
    setLoading(true); setError('');
    fetch(`/api/reports/${activeTab}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(prev => ({ ...prev, [activeTab]: d.data }));
        else setError(d.message || 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const d = data[activeTab];

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">System-wide analytics and insights</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 px-2 pt-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all
                ${activeTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <>
              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && d && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Stat label="Students"    value={d.totalStudents}    accent="indigo" />
                    <Stat label="Teachers"    value={d.totalTeachers}    accent="emerald" />
                    <Stat label="Courses"     value={d.totalCourses}     accent="amber" />
                    <Stat label="Departments" value={d.totalDepartments} accent="violet" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card title="Attendance">
                      <div className="flex items-center gap-4 mb-4">
                        <p className="text-3xl font-bold text-emerald-600">{d.attendance.rate}%</p>
                        <p className="text-xs text-gray-400">overall rate</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        {[['Present', d.attendance.present, 'text-emerald-600'], ['Absent', d.attendance.absent, 'text-red-500'], ['Late', d.attendance.late, 'text-amber-500']].map(([l, v, c]) => (
                          <div key={l} className="bg-gray-50 rounded-xl py-2">
                            <p className={`text-lg font-bold ${c}`}>{v}</p>
                            <p className="text-gray-400">{l}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card title="Marks">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        {[['Avg', d.marks.average, 'text-indigo-600'], ['High', d.marks.highest, 'text-emerald-600'], ['Low', d.marks.lowest, 'text-red-500']].map(([l, v, c]) => (
                          <div key={l} className="bg-gray-50 rounded-xl py-3">
                            <p className={`text-lg font-bold ${c}`}>{v}</p>
                            <p className="text-gray-400">{l}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 text-center mt-3">{d.marks.totalRecords} records</p>
                    </Card>
                    {!isTeacher && (
                      <Card title="Fees">
                        <div className="space-y-2 text-sm">
                          {[['Total', d.fees.total, 'text-gray-800'], ['Collected', d.fees.collected, 'text-emerald-600'], ['Pending', d.fees.pending, 'text-red-500']].map(([l, v, c]) => (
                            <div key={l} className="flex justify-between">
                              <span className="text-gray-500">{l}</span>
                              <span className={`font-semibold ${c}`}>Rs.{Number(v).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Collection rate</span><span>{d.fees.collectionRate}%</span>
                            </div>
                            <div className="bg-gray-100 rounded-full h-1.5">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${d.fees.collectionRate}%` }} />
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* ── STUDENTS ── */}
              {activeTab === 'students' && d && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Card title="By Department"><HBar data={d.byDepartment.map(x => ({ label: x.department, value: x.count }))} accent="indigo" /></Card>
                    <Card title="By Year"><HBar data={d.byYear.map(x => ({ label: `Year ${x.year}`, value: x.count }))} accent="emerald" /></Card>
                  </div>
                  <Card title="Enrollment Statistics">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>{['Department','Students','Enrollments','Avg/Student'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {d.enrollmentStats.map((s, i) => (
                          <tr key={i} className="hover:bg-gray-50/60">
                            <td className="px-4 py-3 font-medium text-gray-800">{s.department}</td>
                            <td className="px-4 py-3 text-gray-600">{s.students}</td>
                            <td className="px-4 py-3 text-gray-600">{s.enrollments}</td>
                            <td className="px-4 py-3 text-gray-600">{s.students > 0 ? (s.enrollments / s.students).toFixed(1) : 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                </div>
              )}

              {/* ── ATTENDANCE ── */}
              {activeTab === 'attendance' && d && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Card title="By Status">
                      <div className="space-y-3">
                        {d.byStatus.map((s, i) => {
                          const total = d.byStatus.reduce((sum, x) => sum + x.count, 0);
                          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                          const colors = { present: 'bg-emerald-500', absent: 'bg-red-500', late: 'bg-amber-400', excused: 'bg-blue-400' };
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <p className="text-xs text-gray-500 w-16 capitalize">{s.status}</p>
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div className={`${colors[s.status] || 'bg-gray-400'} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-xs font-semibold text-gray-600 w-16 text-right">{s.count} ({pct}%)</p>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                    <Card title="Rate by Course (%)">
                      <HBar data={d.byCourse.slice(0, 8).map(c => ({ label: c.course, value: Number(c.rate) }))} accent="emerald" />
                    </Card>
                  </div>
                  {d.trend?.length > 0 && (
                    <Card title="Trend — Last 7 Days">
                      <div className="flex items-end gap-2 h-24">
                        {d.trend.map((t, i) => {
                          const pct = t.total > 0 ? (t.present / t.total) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <p className="text-xs text-gray-500 font-semibold">{Math.round(pct)}%</p>
                              <div className="w-full bg-gray-100 rounded-t-lg" style={{ height: '60px' }}>
                                <div className="bg-indigo-500 rounded-t-lg w-full transition-all" style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                              </div>
                              <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* ── MARKS ── */}
              {activeTab === 'marks' && d && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Card title="Score Distribution"><HBar data={d.distribution.map(x => ({ label: x.range, value: x.count }))} accent="violet" /></Card>
                    <Card title="Avg by Subject"><HBar data={d.byCourse.map(x => ({ label: x.course, value: Number(x.average) }))} accent="amber" /></Card>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Card title="Top Performers" badge={`${d.topPerformers.length} students`}>
                      {d.topPerformers.length === 0
                        ? <p className="text-xs text-gray-400 text-center py-6">No data yet</p>
                        : <div className="space-y-2">
                            {d.topPerformers.map((s, i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                                <div className="flex items-center gap-2.5">
                                  <StudentAvatar studentId={s.studentId} name={s.name} size={7} />
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                                    <p className="text-xs text-gray-400">{s.studentId} · {s.department}</p>
                                  </div>
                                </div>
                                <span className="text-sm font-bold text-emerald-600">{s.average}%</span>
                              </div>
                            ))}
                          </div>
                      }
                    </Card>
                    <Card title="At-Risk Students" badge={d.atRisk.length > 0 ? `${d.atRisk.length} students` : undefined}>
                      {d.atRisk.length === 0
                        ? <div className="text-center py-6">
                            <p className="text-emerald-600 text-lg mb-1">✓</p>
                            <p className="text-xs text-gray-500">All students above threshold</p>
                          </div>
                        : <div className="space-y-2">
                            {d.atRisk.map((s, i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-rose-50 rounded-xl">
                                <div className="flex items-center gap-2.5">
                                  <StudentAvatar studentId={s.studentId} name={s.name} size={7} />
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                                    <p className="text-xs text-gray-400">{s.studentId} · {s.department}</p>
                                  </div>
                                </div>
                                <span className="text-sm font-bold text-rose-600">{s.average}%</span>
                              </div>
                            ))}
                          </div>
                      }
                    </Card>
                  </div>
                </div>
              )}

              {/* ── FEES ── */}
              {activeTab === 'fees' && d && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Card title="By Category">
                      <div className="space-y-3">
                        {d.byCategory.map((c, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-gray-700 capitalize">{c.category}</span>
                              <span className="text-gray-500">Rs.{Number(c.collected).toLocaleString()} / Rs.{Number(c.total).toLocaleString()}</span>
                            </div>
                            <div className="bg-gray-100 rounded-full h-1.5">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${c.total > 0 ? (c.collected / c.total) * 100 : 0}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card title="Payment Status">
                      <div className="space-y-3">
                        {d.paymentStatus.map((s, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <span className="text-sm font-medium text-gray-700">{s.status}</span>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">Rs.{Number(s.total).toLocaleString()}</p>
                              <p className="text-xs text-gray-400">{s.count} records</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                  {d.recentPayments?.length > 0 && (
                    <Card title="Recent Payments">
                      <table className="min-w-full divide-y divide-gray-100 text-sm">
                        <thead className="bg-gray-50">
                          <tr>{['Student','Amount','Method','Transaction','Date'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {d.recentPayments.map((p, i) => (
                            <tr key={i} className="hover:bg-gray-50/60">
                              <td className="px-4 py-3 font-medium text-gray-800">{p.student_name || p.student_id}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">Rs.{Number(p.amount).toLocaleString()}</td>
                              <td className="px-4 py-3 text-gray-500">{p.payment_method}</td>
                              <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.transaction_id}</td>
                              <td className="px-4 py-3 text-gray-500">{new Date(p.payment_date).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  )}
                </div>
              )}

              {/* ── DEPARTMENTS ── */}
              {activeTab === 'departments' && d && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {d.map((dept, i) => (
                      <div key={i} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">{dept.code || dept.name?.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{dept.name}</p>
                            <p className="text-xs text-gray-400">{dept.code}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          {[['Students', dept.students], ['Courses', dept.courses], ['Enrollments', dept.enrollments]].map(([l, v]) => (
                            <div key={l} className="flex justify-between">
                              <span className="text-gray-400">{l}</span>
                              <span className="font-semibold text-gray-700">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Card title="Students per Department">
                    <HBar data={d.map(x => ({ label: x.name, value: x.students }))} accent="indigo" />
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
