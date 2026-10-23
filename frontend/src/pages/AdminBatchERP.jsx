import { useState, useEffect } from 'react';
import Toast from '../components/Toast';
import StudentAvatar from '../components/StudentAvatar';

const API = (path) => `/api/admin/erp${path}`;
const H = { 'x-user-role': 'admin', 'Content-Type': 'application/json' };

// ── Small helpers ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    active:    'bg-green-100 text-green-700 ring-green-200',
    completed: 'bg-blue-100 text-blue-700 ring-blue-200',
    upcoming:  'bg-orange-100 text-orange-700 ring-orange-200',
    archived:  'bg-gray-100 text-gray-600 ring-gray-200',
    passed:    'bg-emerald-100 text-emerald-700 ring-emerald-200',
    failed:    'bg-red-100 text-red-700 ring-red-200',
    ongoing:   'bg-purple-100 text-purple-700 ring-purple-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 capitalize ${map[status] || map.upcoming}`}>
      {status}
    </span>
  );
};

const SemesterCard = ({ sem, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md
      ${isActive ? 'border-gray-900 bg-gray-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-400'}`}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="font-bold text-gray-800 text-sm">{sem.name}</span>
      <StatusBadge status={sem.status} />
    </div>
    <div className="grid grid-cols-3 gap-1 text-center">
      <div>
        <p className="text-lg font-bold text-gray-800">{sem.student_count || 0}</p>
        <p className="text-xs text-gray-400">Students</p>
      </div>
      <div>
        <p className="text-lg font-bold text-green-600">{sem.passed_count || 0}</p>
        <p className="text-xs text-gray-400">Passed</p>
      </div>
      <div>
        <p className="text-lg font-bold text-red-500">{sem.failed_count || 0}</p>
        <p className="text-xs text-gray-400">Failed</p>
      </div>
    </div>
  </button>
);

// ── CSV Export helpers ────────────────────────────────────────────────────────
const toCSV = (rows, headers) => {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map(r => r.map(escape).join(','))];
  return lines.join('\n');
};

const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
const AdminBatchERP = ({ batchId, onBack, readOnly = false }) => {
  const [overview, setOverview] = useState(null);
  const [activeSem, setActiveSem] = useState(null);
  const [semStudents, setSemStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [promotionResults, setPromotionResults] = useState({});
  const [timeline, setTimeline] = useState(null);
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [view, setView] = useState(() => sessionStorage.getItem('erpView') || 'semesters');

  const setViewPersisted = (v) => {
    sessionStorage.setItem('erpView', v);
    setView(v);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  // Selective enroll modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [unenrolledStudents, setUnenrolledStudents] = useState([]);
  const [selectedEnroll, setSelectedEnroll] = useState([]);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Inline edit state: { studentId: { result, gpa } }
  const [editingRow, setEditingRow] = useState(null); // student id being edited
  const [editValues, setEditValues] = useState({ result: '', gpa: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Feature 2: search within semester student table
  const [semSearch, setSemSearch] = useState('');

  // Feature 3: bulk result entry
  const [bulkResult, setBulkResult] = useState('');
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  // Feature 8: batch summary (attendance + marks)
  const [summary, setSummary] = useState(null);
  const [summarySearch, setSummarySearch] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ show: true, msg, type });

  // ── Feature 8: fetch batch summary ─────────────────────────────────────────
  const fetchSummary = () => {
    setIsLoadingSummary(true);
    fetch(API(`/batches/${batchId}/summary`), { headers: H })
      .then(r => r.json())
      .then(d => { if (d.success) setSummary(d.data); })
      .finally(() => setIsLoadingSummary(false));
  };

  // ── Feature 3: bulk apply result to all visible semester students ───────────
  const applyBulkResult = async () => {
    if (!bulkResult || !activeSem || semStudents.length === 0) return;
    setIsBulkApplying(true);
    const targets = semStudents.filter(s =>
      !semSearch || s.name.toLowerCase().includes(semSearch.toLowerCase()) ||
      (s.roll_number || s.studentId || '').toLowerCase().includes(semSearch.toLowerCase())
    );
    await Promise.all(targets.map(s =>
      fetch(API(`/batches/${batchId}/students/${s.id}/semester-result`), {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ semester_number: activeSem.semester_number, result: bulkResult })
      })
    ));
    showToast(`Set ${targets.length} students to "${bulkResult}"`);
    setBulkResult('');
    fetchSemStudents(activeSem.semester_number);
    fetchOverview();
    setIsBulkApplying(false);
  };

  // ── Export helpers ──────────────────────────────────────────────────────────
  const exportSemesterCSV = (semName, students) => {
    const headers = ['Name', 'Email', 'Roll No / Student ID', 'Result', 'GPA'];
    const rows = students.map(s => [
      s.name, s.email, s.roll_number || s.studentId || '',
      s.result || 'ongoing', s.gpa || ''
    ]);
    const safe = semName.replace(/[^a-z0-9]/gi, '_');
    downloadCSV(toCSV(rows, headers), `${batch?.batch_name || 'batch'}_${safe}.csv`);
  };

  const exportAllSemestersCSV = () => {
    if (!overview) return;
    const { batch: b, semesters: sems } = overview;

    Promise.all(
      sems.map(sem =>
        fetch(API(`/batches/${batchId}/students?semester=${sem.semester_number}`), { headers: H })
          .then(r => r.json())
          .then(d => ({ sem, students: d.success ? d.data : [] }))
      )
    ).then(results => {
      // Build a map: studentId -> { name, email, studentId, semesters: { semName: { result, gpa } } }
      const studentMap = {};

      results.forEach(({ sem, students }) => {
        students.forEach(s => {
          const key = s.id;
          if (!studentMap[key]) {
            studentMap[key] = {
              name: s.name,
              email: s.email,
              studentId: s.roll_number || s.studentId || '',
              sems: {}
            };
          }
          studentMap[key].sems[sem.name] = {
            result: s.result || 'ongoing',
            gpa: s.gpa || ''
          };
        });
      });

      // Headers: Name, Email, Student ID, then Sem1 Result, Sem1 GPA, Sem2 Result, Sem2 GPA ...
      const semNames = sems.map(s => s.name);
      const headers = [
        'Name', 'Email', 'Student ID',
        ...semNames.flatMap(n => [`${n} Result`, `${n} GPA`])
      ];

      const rows = Object.values(studentMap).map(st => [
        st.name, st.email, st.studentId,
        ...semNames.flatMap(n => [
          st.sems[n]?.result || '',
          st.sems[n]?.gpa || ''
        ])
      ]);

      downloadCSV(toCSV(rows, headers), `${b.batch_name}_all_semesters.csv`);
      showToast('All semesters exported successfully');
    });
  };

  // ── Fetch overview ──────────────────────────────────────────────────────────
  const fetchOverview = () => {
    setIsLoading(true);
    fetch(API(`/batches/${batchId}/overview`), { headers: H })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setOverview(d.data);
          // Auto-select the active semester
          const active = d.data.semesters.find(s => s.status === 'active') || d.data.semesters[0];
          if (active) { setActiveSem(active); fetchSemStudents(active.semester_number); }
        }
      })
      .finally(() => setIsLoading(false));
  };

  const fetchSemStudents = (semNum) => {
    fetch(API(`/batches/${batchId}/students?semester=${semNum}`), { headers: H })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setSemStudents(d.data);
          // Init promotion results
          const init = {};
          d.data.forEach(s => { init[s.id] = { result: s.result === 'passed' ? 'passed' : 'ongoing', gpa: s.gpa || '' }; });
          setPromotionResults(init);
        }
      });
  };

  const fetchAllStudents = () => {
    fetch(API(`/batches/${batchId}/students`), { headers: H })
      .then(r => r.json())
      .then(d => { if (d.success) setAllStudents(d.data); });
  };

  const fetchHistory = () => {
    fetch(API(`/batches/${batchId}/promotions`), { headers: H })
      .then(r => r.json())
      .then(d => { if (d.success) setPromotionHistory(d.data); });
  };

  useEffect(() => {
    fetchOverview();
    // Restore data for persisted tab
    const saved = sessionStorage.getItem('erpView');
    if (saved === 'allStudents') fetchAllStudents();
    if (saved === 'history') fetchHistory();
    if (saved === 'summary') fetchSummary();
  }, [batchId]);

  // ── Open selective enroll modal ─────────────────────────────────────────────
  const openEnrollModal = (semNum) => {
    setSelectedEnroll([]);
    setEnrollSearch('');
    fetch(API(`/batches/${batchId}/students?unenrolled=1&semester=${semNum}`), { headers: H })
      .then(r => r.json())
      .then(d => { if (d.success) setUnenrolledStudents(d.data); });
    setShowEnrollModal(true);
  };

  // ── Enroll all into semester ────────────────────────────────────────────────
  const handleEnrollSemester = (semNum, studentIds) => {
    setIsEnrolling(true);
    const body = { semester_number: semNum };
    if (studentIds) body.student_ids = studentIds;

    fetch(API(`/batches/${batchId}/enroll-semester`), {
      method: 'POST', headers: H, body: JSON.stringify(body)
    })
      .then(r => r.json())
      .then(d => {
        showToast(d.message, d.success ? 'success' : 'error');
        if (d.success) {
          setShowEnrollModal(false);
          fetchOverview();
          fetchSemStudents(semNum);
        }
      })
      .finally(() => setIsEnrolling(false));
  };

  // ── Promote students ────────────────────────────────────────────────────────
  const handlePromote = () => {
    if (!activeSem) return;
    const student_results = Object.entries(promotionResults).map(([student_id, v]) => ({
      student_id: parseInt(student_id),
      result: v.result,   // send as-is: 'passed' | 'failed' | 'ongoing'
      gpa: parseFloat(v.gpa) || null
    }));

    setIsPromoting(true);
    fetch(API(`/batches/${batchId}/promote`), {
      method: 'POST', headers: H,
      body: JSON.stringify({ from_semester: activeSem.semester_number, student_results })
    })
      .then(r => r.json())
      .then(d => {
        showToast(d.message, d.success ? 'success' : 'error');
        if (d.success) { fetchOverview(); }
      })
      .finally(() => setIsPromoting(false));
  };

  // ── Student timeline ────────────────────────────────────────────────────────
  const handleViewTimeline = (student) => {
    fetch(API(`/students/${student.id}/timeline`), { headers: H })
      .then(r => r.json())
      .then(d => { if (d.success) { setTimeline(d.data); setViewPersisted('timeline'); } });
  };

  // ── Inline edit ─────────────────────────────────────────────────────────────
  const startEdit = (s) => {
    setEditingRow(s.id);
    setEditValues({ result: s.result || 'ongoing', gpa: s.gpa || '' });
  };

  const cancelEdit = () => { setEditingRow(null); setEditValues({ result: '', gpa: '' }); };

  const saveEdit = (studentId) => {
    if (!activeSem) return;
    setIsSavingEdit(true);
    fetch(API(`/batches/${batchId}/students/${studentId}/semester-result`), {
      method: 'PATCH', headers: H,
      body: JSON.stringify({
        semester_number: activeSem.semester_number,
        result: editValues.result,
        gpa: editValues.gpa !== '' ? parseFloat(editValues.gpa) : null
      })
    })
      .then(r => r.json())
      .then(d => {
        showToast(d.message, d.success ? 'success' : 'error');
        if (d.success) {
          cancelEdit();
          fetchSemStudents(activeSem.semester_number);
          fetchOverview();
        }
      })
      .finally(() => setIsSavingEdit(false));
  };

  if (isLoading || !overview) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-transparent" />
      </div>
    );
  }

  const { batch, semesters } = overview;
  const capacity = 40;
  const occupancy = Math.min(Math.round((batch.student_count / capacity) * 100), 100);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <button onClick={() => { sessionStorage.removeItem('erpView'); onBack(); }} className="text-gray-400 hover:text-gray-700 text-sm mb-2 flex items-center gap-1 transition-colors">
              ← Back to Batches
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{batch.batch_name}</h1>
            <p className="text-gray-500 text-sm mt-1">{batch.department} · {batch.start_year}–{batch.end_year}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold text-gray-900">{batch.student_count}</p>
              <p className="text-xs text-gray-500">Students</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold text-gray-900">{semesters.length}</p>
              <p className="text-xs text-gray-500">Semesters</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold text-gray-900">{occupancy}%</p>
              <p className="text-xs text-gray-500">Capacity</p>
            </div>
            <button
              onClick={exportAllSemestersCSV}
              className="bg-gray-900 hover:bg-gray-700 transition-colors rounded-lg px-4 py-2 text-center text-white text-sm font-semibold flex items-center gap-2"
            >
              ⬇ Export All
            </button>
          </div>        </div>
      </div>

      {/* ── Nav tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'semesters', label: 'Semester View' },
          { key: 'allStudents', label: 'All Students' },
          { key: 'summary', label: 'Attendance & Marks' },
          { key: 'history', label: 'Promotion History' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setViewPersisted(tab.key);
              if (tab.key === 'allStudents') fetchAllStudents();
              if (tab.key === 'history') fetchHistory();
              if (tab.key === 'summary') fetchSummary();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
              ${view === tab.key
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-gray-900'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Semester View ── */}
      {view === 'semesters' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Semester list */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Semesters</h2>
            {semesters.map(sem => (
              <SemesterCard
                key={sem.id}
                sem={sem}
                isActive={activeSem?.id === sem.id}
                onClick={() => { setActiveSem(sem); fetchSemStudents(sem.semester_number); setViewPersisted('semesters'); }}
              />
            ))}
          </div>

          {/* Semester detail */}
          <div className="lg:col-span-2">
            {activeSem && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{activeSem.name}</h2>
                    <StatusBadge status={activeSem.status} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => fetchSemStudents(activeSem.semester_number)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                      ↻ Refresh
                    </button>
                    <button
                      onClick={() => exportSemesterCSV(activeSem.name, semStudents)}
                      disabled={semStudents.length === 0}
                      className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors disabled:opacity-40 flex items-center gap-1"
                    >
                      ⬇ Export CSV
                    </button>
                    {!readOnly && (
                      <>
                        <button
                          onClick={() => openEnrollModal(activeSem.semester_number)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                        >
                          + Enroll Students
                        </button>
                        <button
                          onClick={() => handleEnrollSemester(activeSem.semester_number)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Enroll All
                        </button>
                        {activeSem.status === 'active' && semStudents.length > 0 && (
                          <button
                            onClick={handlePromote}
                            disabled={isPromoting}
                            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-60"
                          >
                            {isPromoting ? 'Promoting...' : `Promote to Sem ${activeSem.semester_number + 1}`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Feature 2: search + Feature 3: bulk result */}
                <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center bg-gray-50">
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={semSearch}
                    onChange={e => setSemSearch(e.target.value)}
                    className="flex-1 min-w-[160px] px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                  {!readOnly && (
                    <div className="flex items-center gap-2">
                      <select
                        value={bulkResult}
                        onChange={e => setBulkResult(e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                      >
                        <option value="">Bulk set result...</option>
                        <option value="passed">All Passed</option>
                        <option value="failed">All Failed</option>
                        <option value="ongoing">All Ongoing</option>
                      </select>
                      <button
                        onClick={applyBulkResult}
                        disabled={!bulkResult || isBulkApplying || semStudents.length === 0}
                        className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
                      >
                        {isBulkApplying ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                  )}
                </div>

                {semStudents.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <p className="text-lg font-medium">No students enrolled in this semester</p>
                    <p className="text-sm mt-1">Use "+ Enroll Students" to add specific students or "Enroll All" for everyone</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Roll No</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Result</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">GPA</th>
                          {!readOnly && activeSem.status === 'active' && (
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Promote</th>
                          )}
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {semStudents.filter(s => {
                          if (!semSearch) return true;
                          const q = semSearch.toLowerCase();
                          return s.name.toLowerCase().includes(q) ||
                            (s.roll_number || s.studentId || '').toLowerCase().includes(q);
                        }).map(s => {
                          const isEditing = editingRow === s.id;
                          return (
                            <tr key={s.id} className={`transition-colors ${isEditing ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <StudentAvatar studentId={s.studentId} name={s.name} size={8} />
                                  <div>
                                    <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                                    <p className="text-xs text-gray-400">{s.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{s.roll_number || s.studentId}</td>

                              {/* Result cell */}
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <select
                                    value={editValues.result}
                                    onChange={e => setEditValues(v => ({ ...v, result: e.target.value }))}
                                    className="text-xs border-2 border-amber-400 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white"
                                  >
                                    <option value="ongoing">Ongoing</option>
                                    <option value="passed">Passed</option>
                                    <option value="failed">Failed</option>
                                  </select>
                                ) : (
                                  <StatusBadge status={s.result || 'ongoing'} />
                                )}
                              </td>

                              {/* GPA cell */}
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0" max="10" step="0.1"
                                    placeholder="0.0"
                                    value={editValues.gpa}
                                    onChange={e => setEditValues(v => ({ ...v, gpa: e.target.value }))}
                                    className="w-16 text-xs border-2 border-amber-400 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                  />
                                ) : (
                                  <span className="text-sm font-semibold text-gray-700">
                                    {s.gpa ? s.gpa : <span className="text-gray-300">—</span>}
                                  </span>
                                )}
                              </td>

                              {/* Promote dropdowns (active sem only, not editing) */}
                              {!readOnly && activeSem.status === 'active' && (
                                <td className="px-4 py-3">
                                  {!isEditing && (
                                    <select
                                      value={promotionResults[s.id]?.result || 'ongoing'}
                                      onChange={e => setPromotionResults(p => ({ ...p, [s.id]: { ...p[s.id], result: e.target.value } }))}
                                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-gray-400 focus:outline-none bg-white"
                                    >
                                      <option value="ongoing">Ongoing</option>
                                      <option value="passed">Passed</option>
                                      <option value="failed">Failed</option>
                                    </select>
                                  )}
                                </td>
                              )}

                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => saveEdit(s.id)}
                                        disabled={isSavingEdit}
                                        className="text-xs px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-60"
                                      >
                                        {isSavingEdit ? '...' : 'Save'}
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="text-xs px-2.5 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {!readOnly && (
                                        <button
                                          onClick={() => startEdit(s)}
                                          className="text-xs px-2.5 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors font-medium border border-amber-200"
                                        >
                                          Edit
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleViewTimeline(s)}
                                        className="text-xs px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                      >
                                        Timeline
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── All Students View ── */}
      {view === 'allStudents' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-gray-800">All Students in {batch.batch_name}</h2>
              <p className="text-sm text-gray-500 mt-1">{allStudents.length} students enrolled</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={fetchAllStudents}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-1"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => {
                  const headers = ['Name', 'Email', 'Student ID', 'Department', 'Current Semester', 'Status'];
                  const rows = allStudents.map(s => [
                    s.name, s.email, s.studentId || '', s.department || '',
                    s.current_semester || 1, s.enrollment_status || 'active'
                  ]);
                  downloadCSV(toCSV(rows, headers), `${batch.batch_name}_all_students.csv`);
                }}
                disabled={allStudents.length === 0}
                className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors disabled:opacity-40 flex items-center gap-1"
              >
                ⬇ Export CSV
              </button>
            </div>
          </div>
          {allStudents.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No students in this batch</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Current Semester</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allStudents.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <StudentAvatar studentId={s.studentId} name={s.name} size={9} />
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{s.studentId}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.department || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          Sem {s.current_semester || 1}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={s.enrollment_status || 'active'} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleViewTimeline(s)}
                          className="text-xs px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                          View Timeline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Student Timeline View ── */}
      {view === 'timeline' && timeline && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StudentAvatar studentId={timeline.student.studentId} name={timeline.student.name} size={12} />
              <div>
                <h2 className="font-bold text-gray-800 text-lg">{timeline.student.name}</h2>
                <p className="text-sm text-gray-500">{timeline.student.studentId} · {timeline.student.department}</p>
              </div>
            </div>
            <button
              onClick={() => setViewPersisted('semesters')}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Back
            </button>
          </div>

          <div className="p-6">
            {timeline.timeline.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No academic history yet</p>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-4">
                  {timeline.timeline.map((entry, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 z-10 shadow-sm
                        ${entry.result === 'passed' ? 'bg-green-500'
                          : entry.result === 'failed' ? 'bg-red-500'
                          : 'bg-gray-600'}`}>
                        {entry.semester_number}
                      </div>
                      <div className={`flex-1 p-4 rounded-xl border transition-all
                        ${entry.result === 'passed' ? 'bg-green-50 border-green-200'
                          : entry.result === 'failed' ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-bold text-gray-800">{entry.semester_name}</p>
                            <p className="text-xs text-gray-500">{entry.batch_name} · {entry.department}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {entry.gpa && (
                              <span className="text-sm font-bold text-gray-700">GPA: {entry.gpa}</span>
                            )}
                            <StatusBadge status={entry.result || 'ongoing'} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Attendance & Marks Summary View ── */}
      {view === 'summary' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-gray-800">Attendance & Marks Summary</h2>
              <p className="text-sm text-gray-500 mt-0.5">Per-student overview for {batch.batch_name}</p>
            </div>
            {summary && (
              <div className="flex gap-3 flex-wrap items-center">
                <button
                  onClick={fetchSummary}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                  ↻ Refresh
                </button>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-center">
                  <p className="text-lg font-bold text-gray-900">{summary.totals.avg_attendance != null ? `${summary.totals.avg_attendance}%` : '—'}</p>
                  <p className="text-xs text-gray-500">Avg Attendance</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-center">
                  <p className="text-lg font-bold text-gray-900">{summary.totals.avg_marks != null ? summary.totals.avg_marks : '—'}</p>
                  <p className="text-xs text-gray-500">Avg Marks</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-2 text-center">
                  <p className="text-lg font-bold text-red-600">{summary.totals.low_attendance}</p>
                  <p className="text-xs text-gray-500">Below 75%</p>
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <input
              type="text"
              placeholder="Search by name or student ID..."
              value={summarySearch}
              onChange={e => setSummarySearch(e.target.value)}
              className="w-full max-w-sm px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {isLoadingSummary ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-800 border-t-transparent" />
            </div>
          ) : !summary || summary.students.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No student data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Attendance</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Present / Total</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Avg Marks</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Subjects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {summary.students
                    .filter(s => {
                      if (!summarySearch) return true;
                      const q = summarySearch.toLowerCase();
                      return s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q);
                    })
                    .map(s => {
                      const attColor = s.attendance_pct == null ? 'text-gray-400'
                        : s.attendance_pct < 75 ? 'text-red-600 font-bold'
                        : s.attendance_pct < 85 ? 'text-amber-600 font-semibold'
                        : 'text-green-600 font-semibold';
                      const marksColor = s.avg_marks == null ? 'text-gray-400'
                        : s.avg_marks < 40 ? 'text-red-600 font-bold'
                        : s.avg_marks < 60 ? 'text-amber-600 font-semibold'
                        : 'text-green-600 font-semibold';
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.studentId}</p>
                          </td>
                          <td className="px-4 py-3">
                            {s.attendance_pct != null ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${s.attendance_pct < 75 ? 'bg-red-500' : s.attendance_pct < 85 ? 'bg-amber-400' : 'bg-green-500'}`}
                                    style={{ width: `${s.attendance_pct}%` }}
                                  />
                                </div>
                                <span className={`text-sm ${attColor}`}>{s.attendance_pct}%</span>
                              </div>
                            ) : <span className="text-xs text-gray-400">No data</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {s.attendance_total > 0 ? `${s.attendance_present} / ${s.attendance_total}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm ${marksColor}`}>
                              {s.avg_marks != null ? s.avg_marks : <span className="text-gray-400 text-xs">No data</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{s.subjects || '—'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Promotion History ── */}
      {view === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Promotion History</h2>
            <button
              onClick={fetchHistory}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-1"
            >
              ↻ Refresh
            </button>
          </div>
          {promotionHistory.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No promotions recorded yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {promotionHistory.map(p => (
                <div key={p.id} className="p-4 flex items-center justify-between flex-wrap gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-100 text-gray-700 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-gray-500">Sem</p>
                      <p className="font-bold">{p.from_semester} → {p.to_semester}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        Semester {p.from_semester} → Semester {p.to_semester}
                      </p>
                      <p className="text-xs text-gray-400">{new Date(p.promoted_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      {p.promoted_count} Promoted
                    </span>
                    <span className="text-sm font-semibold text-red-500 bg-red-50 px-3 py-1 rounded-full">
                      {p.failed_count} Held Back
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Selective Enroll Modal ── */}
      {showEnrollModal && activeSem && (() => {
        const filtered = unenrolledStudents.filter(s =>
          s.name.toLowerCase().includes(enrollSearch.toLowerCase()) ||
          s.studentId.toLowerCase().includes(enrollSearch.toLowerCase())
        );
        const allSelected = filtered.length > 0 && filtered.every(s => selectedEnroll.includes(s.id));

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
              {/* Modal header */}
              <div className="p-5 border-b border-gray-100 bg-gray-900 rounded-t-2xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Enroll Students</h2>
                    <p className="text-gray-300 text-sm mt-0.5">{activeSem.name} · {unenrolledStudents.length} not yet enrolled</p>
                  </div>
                  <button onClick={() => setShowEnrollModal(false)} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
                </div>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search by name or student ID..."
                  value={enrollSearch}
                  onChange={e => setEnrollSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                />
              </div>

              {/* Select all row */}
              {filtered.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 font-medium">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelectedEnroll(allSelected ? [] : filtered.map(s => s.id))}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-400"
                    />
                    Select all ({filtered.length})
                  </label>
                  <span className="text-xs text-gray-400">{selectedEnroll.length} selected</span>
                </div>
              )}

              {/* Student list */}
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    {unenrolledStudents.length === 0
                      ? 'All batch students are already enrolled in this semester'
                      : 'No students match your search'}
                  </div>
                ) : (
                  filtered.map(s => {
                    const checked = selectedEnroll.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors
                          ${checked ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelectedEnroll(prev =>
                            checked ? prev.filter(id => id !== s.id) : [...prev, s.id]
                          )}
                          className="w-4 h-4 text-green-600 rounded focus:ring-green-400 shrink-0"
                        />
                        <StudentAvatar studentId={s.studentId} name={s.name} size={8} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.studentId} · {s.department || 'No dept'}</p>
                        </div>
                        {checked && <span className="text-green-500 text-xs font-semibold shrink-0">Selected</span>}
                      </label>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => handleEnrollSemester(activeSem.semester_number, selectedEnroll)}
                  disabled={selectedEnroll.length === 0 || isEnrolling}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEnrolling ? 'Enrolling...' : `Enroll ${selectedEnroll.length} Student${selectedEnroll.length !== 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={() => setShowEnrollModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <Toast message={toast.msg} type={toast.type} isVisible={toast.show} onClose={() => setToast(t => ({ ...t, show: false }))} />
    </div>
  );
};

export default AdminBatchERP;
