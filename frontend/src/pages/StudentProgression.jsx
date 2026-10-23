import { useState, useEffect } from 'react';
import StudentAvatar from '../components/StudentAvatar';

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusCfg = {
  ongoing: { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-400',   label: 'Ongoing'  },
  passed:  { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500', label: 'Passed'   },
  failed:  { bg: 'bg-red-50',     text: 'text-red-700',     ring: 'ring-red-200',     dot: 'bg-red-500',     label: 'Failed'   },
};

const StatusBadge = ({ status }) => {
  const c = statusCfg[status] || statusCfg.ongoing;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-semibold ${c.bg} ${c.text} ring-1 ${c.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

const SemBadge = ({ num, result }) => {
  const c = statusCfg[result] || statusCfg.ongoing;
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${c.bg} ${c.text} ring-1 ${c.ring}`} title={`Semester ${num}: ${c.label}`}>
      S{num}
    </span>
  );
};

const KPI = ({ label, value, color = 'text-gray-900', bg = 'bg-white' }) => (
  <div className={`${bg} border border-gray-200 rounded-2xl shadow-sm px-5 py-4 text-center`}>
    <p className={`text-2xl font-bold ${color} leading-none`}>{value ?? '—'}</p>
    <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">{label}</p>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const StudentProgression = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user?.role?.toLowerCase() || '';
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isPrincipal = role === 'principal';
  const isStudent = role === 'student';

  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState('');
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [myJourney, setMyJourney] = useState(null);
  const [principalStats, setPrincipalStats] = useState([]);
  const [search, setSearch] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  useEffect(() => {
    if (isStudent) fetchMyJourney();
    else if (isPrincipal) fetchPrincipalStats();
    else fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setBatchLoading(true);
    const headers = isTeacher ? { 'x-user-role': 'teacher' } : { 'x-user-role': 'admin' };
    const url = isTeacher ? `/api/teacher/batches?teacherId=${user.id}` : '/api/admin/batches';
    try {
      const res = await fetch(url, { headers });
      const d = await res.json();
      if (d.success) setBatches(d.data || []);
    } catch (e) {}
    setBatchLoading(false);
  };

  const fetchMyJourney = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${user.id}/progression`);
      const d = await res.json();
      if (d.success) setMyJourney(d.data);
    } catch (e) {}
    setLoading(false);
  };

  const fetchPrincipalStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/principal/progression-stats', { headers: { 'x-user-role': 'principal' } });
      const d = await res.json();
      if (d.success) setPrincipalStats(d.data || []);
    } catch (e) {}
    setLoading(false);
  };

  const selectBatch = async (batch) => {
    setSelectedBatch(batch);
    setSelectedSem('');
    setStudents([]);
    setStats(null);
    setExpandedStudent(null);
    const res = await fetch(`/api/admin/erp/batches/${batch.id}/overview`, { headers: { 'x-user-role': 'admin' } });
    const d = await res.json();
    if (d.success) setSemesters(d.data.semesters || []);
  };

  const loadProgression = async (batchId, semNum) => {
    setLoading(true);
    setExpandedStudent(null);
    const url = isTeacher
      ? `/api/teacher/batches/${batchId}/progression${semNum ? `?semester_number=${semNum}` : ''}`
      : `/api/admin/batches/${batchId}/progression${semNum ? `?semester_number=${semNum}` : ''}`;
    const headers = isTeacher ? { 'x-user-role': 'teacher' } : { 'x-user-role': 'admin' };
    try {
      const res = await fetch(url, { headers });
      const d = await res.json();
      if (d.success) { setStudents(d.data || []); setStats(d.stats || null); }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    if (selectedBatch) loadProgression(selectedBatch.id, selectedSem);
  }, [selectedBatch, selectedSem]);

  const handlePromote = async () => {
    if (!selectedBatch || !selectedSem) return;
    setPromoting(true);
    const studentResults = students.map(s => {
      const sem = s.semesters?.find(x => x.semester_number === Number(selectedSem));
      return { student_id: s.id, result: sem?.result || s.currentStatus || 'ongoing', gpa: sem?.gpa || null };
    });
    try {
      const res = await fetch(`/api/admin/erp/batches/${selectedBatch.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify({ from_semester: Number(selectedSem), student_results: studentResults })
      });
      const d = await res.json();
      if (d.success) { showToast(`${d.promoted} promoted, ${d.failed} held back`); loadProgression(selectedBatch.id, selectedSem); }
      else showToast(d.message || 'Failed', 'error');
    } catch (e) { showToast('Network error', 'error'); }
    setPromoting(false);
    setShowPromoteModal(false);
  };

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q);
  });

  const passedCount  = students.filter(s => (s.currentStatus || s.result) === 'passed').length;
  const failedCount  = students.filter(s => (s.currentStatus || s.result) === 'failed').length;
  const ongoingCount = students.filter(s => (s.currentStatus || s.result) === 'ongoing').length;

  // ── STUDENT VIEW ─────────────────────────────────────────────────────────────
  if (isStudent) {
    const sems = myJourney?.semesters || [];
    const { passed = 0, failed = 0, cgpa, currentSemester } = myJourney?.summary || {};
    return (
      <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Academic Journey</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your semester-by-semester progression</p>
        </div>
        {loading ? <Spinner /> : !myJourney ? <Empty icon="🎓" text="No academic records yet" /> : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPI label="Semesters" value={sems.length} />
              <KPI label="Passed" value={passed} color="text-emerald-600" />
              <KPI label="Failed" value={failed} color="text-red-500" />
              <KPI label="CGPA" value={cgpa || '—'} color="text-indigo-600" />
            </div>

            {currentSemester && (
              <div className="bg-indigo-600 rounded-2xl px-6 py-4 flex items-center justify-between text-white shadow-sm">
                <div>
                  <p className="text-xs font-semibold opacity-70 uppercase tracking-widest">Currently In</p>
                  <p className="text-xl font-bold mt-0.5">Semester {currentSemester}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">{currentSemester}</div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Semester Timeline</p>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-4">
                  {sems.map((sem, i) => {
                    const c = statusCfg[sem.result] || statusCfg.ongoing;
                    return (
                      <div key={i} className="relative flex items-start gap-5 pl-14">
                        <div className={`absolute left-3 w-5 h-5 rounded-full border-2 border-white shadow-sm ${c.dot} flex items-center justify-center`}>
                          {sem.result === 'passed' && <span className="text-white text-xs">✓</span>}
                          {sem.result === 'failed' && <span className="text-white text-xs">✗</span>}
                        </div>
                        <div className={`flex-1 border rounded-2xl p-4 transition-all ${sem.result === 'ongoing' ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{sem.semester_name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{sem.batch_name} · {sem.department}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {sem.gpa && (
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 ring-1 ring-indigo-200 px-2.5 py-1 rounded-full">
                                  GPA {sem.gpa}
                                </span>
                              )}
                              <StatusBadge status={sem.result} />
                            </div>
                          </div>
                          {sem.promoted_at && (
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                              <span>📅</span>
                              {sem.result === 'passed' ? 'Promoted' : 'Updated'} on {new Date(sem.promoted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── PRINCIPAL VIEW ────────────────────────────────────────────────────────────
  if (isPrincipal) {
    const totalStudents = principalStats.reduce((s, b) => s + (b.total_students || 0), 0);
    const totalPassed   = principalStats.reduce((s, b) => s + (b.passed || 0), 0);
    const totalFailed   = principalStats.reduce((s, b) => s + (b.failed || 0), 0);
    const overallRate   = (totalPassed + totalFailed) > 0
      ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0;

    return (
      <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Progression</h1>
          <p className="text-sm text-gray-400 mt-0.5">Institution-wide pass/fail overview</p>
        </div>
        {loading ? <Spinner /> : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPI label="Total Students" value={totalStudents} />
              <KPI label="Passed" value={totalPassed} color="text-emerald-600" />
              <KPI label="Failed" value={totalFailed} color="text-red-500" />
              <KPI label="Overall Pass Rate" value={`${overallRate}%`} color="text-indigo-600" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {principalStats.map(b => (
                <div key={b.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:border-indigo-200 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{b.batch_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{b.department}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.status === 'active' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                    {[['Total', b.total_students || 0, 'text-gray-800', 'bg-gray-50'],
                      ['Passed', b.passed || 0, 'text-emerald-600', 'bg-emerald-50'],
                      ['Failed', b.failed || 0, 'text-red-500', 'bg-red-50']].map(([l, v, c, bg]) => (
                      <div key={l} className={`${bg} rounded-xl py-2.5`}>
                        <p className={`text-lg font-bold ${c}`}>{v}</p>
                        <p className="text-gray-400">{l}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Pass Rate</span>
                      <span className="font-semibold text-gray-700">{b.pass_rate ?? '—'}%</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${(b.pass_rate || 0) >= 75 ? 'bg-emerald-500' : (b.pass_rate || 0) >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${b.pass_rate || 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── ADMIN / TEACHER VIEW ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">

      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border
          ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {toast.type === 'error' ? '⚠️' : '✓'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Progression</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track semester-by-semester academic progress</p>
        </div>
        {isAdmin && selectedBatch && selectedSem && students.length > 0 && (
          <button onClick={() => setShowPromoteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm transition-all">
            <span>🎓</span> Promote Students
          </button>
        )}
      </div>

      {/* Batch selector cards */}
      {batchLoading ? <Spinner /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {batches.map(b => (
            <button key={b.id} onClick={() => selectBatch(b)}
              className={`text-left p-4 rounded-2xl border transition-all ${selectedBatch?.id === b.id
                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300 shadow-sm'
                : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'}`}>
              <p className={`text-sm font-bold truncate ${selectedBatch?.id === b.id ? 'text-indigo-700' : 'text-gray-900'}`}>{b.batch_name}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{b.department}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
                <span className="text-xs text-gray-400">{b.student_count || 0} students</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedBatch && (
        <>
          {/* Semester tabs */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Semester</p>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              <button onClick={() => setSelectedSem('')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${!selectedSem ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                All
              </button>
              {semesters.map(s => {
                const semStats = students.filter(st => st.semesters?.some(x => x.semester_number === s.semester_number));
                const isActive = String(selectedSem) === String(s.semester_number);
                return (
                  <button key={s.id} onClick={() => setSelectedSem(String(s.semester_number))}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s.name}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                      {s.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* KPI row */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPI label="Total" value={stats.total} />
              <KPI label="Ongoing" value={stats.ongoing || ongoingCount} color="text-amber-600" />
              <KPI label="Passed" value={stats.passed || passedCount} color="text-emerald-600" />
              <KPI label="Failed" value={stats.failed || failedCount} color="text-red-500" />
            </div>
          )}

          {/* Pass rate bar */}
          {stats && stats.total > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500">Pass Rate</p>
                <p className="text-sm font-bold text-gray-800">{stats.passRate ?? 0}%</p>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 gap-0.5">
                {passedCount > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(passedCount / stats.total) * 100}%` }} />}
                {failedCount > 0 && <div className="bg-red-400 transition-all" style={{ width: `${(failedCount / stats.total) * 100}%` }} />}
                {ongoingCount > 0 && <div className="bg-amber-300 transition-all" style={{ width: `${(ongoingCount / stats.total) * 100}%` }} />}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Passed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Failed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300" />Ongoing</span>
              </div>
            </div>
          )}

          {/* Search */}
          {students.length > 0 && (
            <div className="relative">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or student ID…"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm" />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              {search && <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>}
            </div>
          )}

          {/* Student table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">
                {selectedBatch.batch_name}
                {selectedSem ? ` · Semester ${selectedSem}` : ' · All Semesters'}
              </p>
              <span className="text-xs text-gray-400">{filtered.length} students</span>
            </div>

            {loading ? <div className="py-16"><Spinner /></div>
            : filtered.length === 0 ? <Empty icon="🎓" text={students.length === 0 ? 'No progression data for this selection' : 'No students match your search'} />
            : (
              <div className="divide-y divide-gray-50">
                {filtered.map(s => {
                  const status = s.currentStatus || s.result || 'ongoing';
                  const semNum = s.currentSemester || s.semester_number;
                  const gpa = s.gpa || s.semesters?.find(x => x.result === 'ongoing')?.gpa;
                  const isExpanded = expandedStudent === s.id;
                  const c = statusCfg[status] || statusCfg.ongoing;

                  return (
                    <div key={s.id}>
                      <div
                        className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50/60' : ''}`}
                        onClick={() => setExpandedStudent(isExpanded ? null : s.id)}>
                        {/* Left accent */}
                        <div className={`w-1 h-10 rounded-full shrink-0 ${c.dot}`} />

                        <StudentAvatar studentId={s.studentId} name={s.name} size={9} />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                          <p className="text-xs text-gray-400 truncate">{s.studentId} · {s.department || s.email}</p>
                        </div>

                        <div className="hidden sm:flex items-center gap-1 flex-wrap justify-end max-w-[160px]">
                          {(s.semesters || []).map((sem, i) => (
                            <SemBadge key={i} num={sem.semester_number} result={sem.result} />
                          ))}
                        </div>

                        <div className="text-center shrink-0 w-16">
                          <p className="text-xs text-gray-400">Semester</p>
                          <p className="text-sm font-bold text-gray-800">{semNum || '—'}</p>
                        </div>

                        {gpa && (
                          <div className="text-center shrink-0 w-14">
                            <p className="text-xs text-gray-400">GPA</p>
                            <p className="text-sm font-bold text-indigo-600">{gpa}</p>
                          </div>
                        )}

                        <StatusBadge status={status} />

                        <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                      </div>

                      {/* Expanded semester history */}
                      {isExpanded && s.semesters?.length > 0 && (
                        <div className="px-5 pb-4 bg-gray-50/40 border-t border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest py-3">Semester History</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {s.semesters.map((sem, i) => {
                              const sc = statusCfg[sem.result] || statusCfg.ongoing;
                              return (
                                <div key={i} className={`${sc.bg} border ${sc.ring.replace('ring-', 'border-')} rounded-xl p-3`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-semibold text-gray-700">{sem.semester_name}</p>
                                    <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                                  </div>
                                  <p className={`text-xs font-bold ${sc.text}`}>{sc.label}</p>
                                  {sem.gpa && <p className="text-xs text-gray-500 mt-0.5">GPA: {sem.gpa}</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Confirm Promotion</h2>
              <p className="text-sm text-gray-500 mt-1">
                Semester {selectedSem} → Semester {Number(selectedSem) + 1} · {selectedBatch?.batch_name}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['Total', students.length, 'bg-gray-50', 'text-gray-800'],
                ['Will Promote', passedCount, 'bg-emerald-50', 'text-emerald-600'],
                ['Held Back', failedCount, 'bg-red-50', 'text-red-500']].map(([l, v, bg, c]) => (
                <div key={l} className={`${bg} rounded-xl py-4 text-center`}>
                  <p className={`text-2xl font-bold ${c}`}>{v}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              Only students with <strong>Passed</strong> status will advance. Failed students remain in Semester {selectedSem}.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPromoteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={handlePromote} disabled={promoting}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all">
                {promoting ? 'Promoting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Utility components ────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent" />
  </div>
);

const Empty = ({ icon, text }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
    <div className="text-4xl mb-3">{icon}</div>
    <p className="text-sm text-gray-400">{text}</p>
  </div>
);

export default StudentProgression;
