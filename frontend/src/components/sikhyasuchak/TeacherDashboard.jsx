/**
 * TeacherDashboard.jsx
 * Location: src/components/sikhyasuchak/TeacherDashboard.jsx
 *
 * Upgraded: loads real students from AMS via FastAPI, runs per-student ML
 * predictions, shows full analytics with PredictionModal drawer.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllStudents, fetchStudentPrediction } from './api';
import RiskBadge from './RiskBadge';
import PredictionModal from './PredictionModal';

const RISK_FILTERS = ['all', 'high', 'medium', 'low'];
const SORT_OPTIONS = [
  { value: 'name_asc',   label: 'Name A→Z' },
  { value: 'name_desc',  label: 'Name Z→A' },
  { value: 'risk_high',  label: 'Risk: High first' },
  { value: 'risk_low',   label: 'Risk: Low first' },
  { value: 'score_desc', label: 'Score: High first' },
  { value: 'score_asc',  label: 'Score: Low first' },
  { value: 'att_desc',   label: 'Attendance: High' },
];

// ── Table skeleton ────────────────────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="divide-y divide-gray-100 animate-pulse">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-center gap-4 px-6 py-4">
        <div className="w-9 h-9 rounded-xl bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
        </div>
        <div className="h-4 bg-gray-100 rounded w-20" />
        <div className="h-6 bg-gray-200 rounded-full w-24" />
        <div className="h-8 bg-gray-200 rounded-xl w-20" />
      </div>
    ))}
  </div>
);

// ── Risk sort weight ──────────────────────────────────────────────────────────
const riskWeight = level => ({ high: 3, medium: 2, low: 1 }[level] || 0);

// ── Main component ────────────────────────────────────────────────────────────
const TeacherDashboard = () => {
  const [students,     setStudents]     = useState([]);
  const [loadingList,  setLoadingList]  = useState(true);
  const [listError,    setListError]    = useState('');

  const [predictions,  setPredictions]  = useState({});   // { studentId: resultObj }
  const [loadingId,    setLoadingId]    = useState(null);  // single analyze
  const [runningAll,   setRunningAll]   = useState(false);
  const [runProgress,  setRunProgress]  = useState(0);

  const [selectedData, setSelectedData] = useState(null); // for modal

  const [search,       setSearch]       = useState('');
  const [riskFilter,   setRiskFilter]   = useState('all');
  const [deptFilter,   setDeptFilter]   = useState('all');
  const [sortBy,       setSortBy]       = useState('name_asc');

  // Load students from AMS
  const loadStudents = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const data = await fetchAllStudents();
      // Handles: array, { students: [...] }, { data: [...] }
      const list = Array.isArray(data)
        ? data
        : (data.students || data.data || []);
      // Normalise field names: studentId → student_id, name → student_name
      setStudents(list.map(s => ({
        ...s,
        student_id:   s.student_id   || s.studentId || s.id,
        student_name: s.student_name || s.name      || 'Unknown',
        department:   s.department   || s.dept      || '—',
      })));
    } catch {
      setListError('Could not load students. Make sure the Sikhya Suchak API is running on port 8001.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  // Analyze one student
  const analyzeStudent = useCallback(async (student) => {
    const sid = student.student_id || student.id;
    if (predictions[sid]) {
      setSelectedData(predictions[sid]);
      return;
    }
    setLoadingId(sid);
    try {
      const result = await fetchStudentPrediction(sid);
      setPredictions(p => ({ ...p, [sid]: result }));
      setSelectedData(result);
    } catch {
      alert(`Could not predict for ${student.student_name || student.name}. Check if the API is running.`);
    } finally {
      setLoadingId(null);
    }
  }, [predictions]);

  // Analyze all students
  const analyzeAll = useCallback(async () => {
    setRunningAll(true);
    setRunProgress(0);
    const results = {};
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const sid = s.student_id || s.id;
      if (!predictions[sid]) {
        try {
          results[sid] = await fetchStudentPrediction(sid);
        } catch {}
      }
      setRunProgress(Math.round(((i + 1) / students.length) * 100));
    }
    setPredictions(p => ({ ...p, ...results }));
    setRunningAll(false);
    setRunProgress(0);
  }, [students, predictions]);

  // Unique departments
  const departments = useMemo(() => {
    const deps = [...new Set(students.map(s => s.department || s.dept).filter(Boolean))].sort();
    return deps;
  }, [students]);

  // Summary counts
  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0, pending: 0 };
    students.forEach(s => {
      const p = predictions[s.student_id || s.id];
      if (p) c[p.risk_level] = (c[p.risk_level] || 0) + 1;
      else c.pending++;
    });
    return c;
  }, [students, predictions]);

  // Filtered + sorted list
  const displayStudents = useMemo(() => {
    let list = students.filter(s => {
      const sid = s.student_id || s.id;
      const pred = predictions[sid];
      const dept = s.department || s.dept || '';
      const sname = s.student_name || s.name || '';

      const matchRisk = riskFilter === 'all' || (pred?.risk_level === riskFilter);
      const matchDept = deptFilter === 'all' || dept === deptFilter;
      const matchSearch = !search ||
        sname.toLowerCase().includes(search.toLowerCase()) ||
        String(sid).toLowerCase().includes(search.toLowerCase()) ||
        dept.toLowerCase().includes(search.toLowerCase());

      return matchRisk && matchDept && matchSearch;
    });

    list = [...list].sort((a, b) => {
      const pa = predictions[a.student_id || a.id];
      const pb = predictions[b.student_id || b.id];
      const na = a.student_name || a.name || '';
      const nb = b.student_name || b.name || '';
      switch (sortBy) {
        case 'name_asc':   return na.localeCompare(nb);
        case 'name_desc':  return nb.localeCompare(na);
        case 'risk_high':  return riskWeight(pb?.risk_level) - riskWeight(pa?.risk_level);
        case 'risk_low':   return riskWeight(pa?.risk_level) - riskWeight(pb?.risk_level);
        case 'score_desc': return (pb?.final_score || 0) - (pa?.final_score || 0);
        case 'score_asc':  return (pa?.final_score || 0) - (pb?.final_score || 0);
        case 'att_desc':   return (b.attendance_pct || 0) - (a.attendance_pct || 0);
        default:           return 0;
      }
    });

    return list;
  }, [students, predictions, search, riskFilter, deptFilter, sortBy]);

  const rowRiskStyle = level => {
    if (level === 'high')   return 'border-l-4 border-l-red-400 bg-red-50/30';
    if (level === 'medium') return 'border-l-4 border-l-amber-400 bg-amber-50/30';
    if (level === 'low')    return 'border-l-4 border-l-green-400 bg-green-50/30';
    return 'border-l-4 border-l-gray-200';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* KPI summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'High Risk',    count: counts.high,    color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',   icon: '🔴' },
          { label: 'Medium Risk',  count: counts.medium,  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200', icon: '🟡' },
          { label: 'Low Risk',     count: counts.low,     color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200', icon: '🟢' },
          { label: 'Not Analyzed', count: counts.pending, color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200', icon: '⚪' },
        ].map(({ label, count, color, bg, border, icon }) => (
          <div key={label} className={`${bg} border ${border} rounded-2xl p-5 shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{icon}</span>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            </div>
            <p className={`text-3xl font-black ${color}`}>{count}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {students.length > 0 ? `of ${students.length} students` : 'students'}
            </p>
          </div>
        ))}
      </div>

      {/* Run-all progress bar */}
      {runningAll && (
        <div className="bg-white rounded-2xl border border-blue-200 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-700">⚡ Analyzing all students...</span>
            <span className="font-bold text-blue-600">{runProgress}%</span>
          </div>
          <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${runProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, department..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
        </div>

        {/* Department filter */}
        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Risk filter pills */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {RISK_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setRiskFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                riskFilter === f ? 'bg-[#1E3A8A] text-white shadow' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* Analyze all */}
        <button
          onClick={analyzeAll}
          disabled={runningAll || loadingList || students.length === 0}
          className="px-4 py-2.5 bg-[#1E3A8A] text-white text-xs font-bold rounded-xl
            hover:bg-[#1e40af] transition-all disabled:opacity-50 shadow flex items-center gap-2"
        >
          {runningAll ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Analyzing...</>
          ) : '⚡ Analyze All'}
        </button>

        {/* Refresh */}
        <button
          onClick={loadStudents}
          disabled={loadingList}
          className="px-3 py-2.5 border border-gray-200 bg-white text-slate-500 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          🔄
        </button>
      </div>

      {/* Error */}
      {listError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
          <span className="shrink-0">⚠️</span>
          <div>
            <p className="font-bold">Could not load students</p>
            <p className="text-xs mt-0.5 opacity-80">{listError}</p>
            <button onClick={loadStudents} className="mt-2 text-xs underline font-semibold">Try again</button>
          </div>
        </div>
      )}

      {/* Student table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">
            Students
            <span className="ml-2 text-xs font-normal text-slate-400">
              {displayStudents.length} of {students.length} shown
            </span>
          </p>
          {Object.keys(predictions).length > 0 && (
            <p className="text-xs text-slate-400">
              {Object.keys(predictions).length} analyzed
            </p>
          )}
        </div>

        {loadingList ? (
          <TableSkeleton />
        ) : displayStudents.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm text-slate-500">No students match your filters</p>
            <button onClick={() => { setSearch(''); setRiskFilter('all'); setDeptFilter('all'); }}
              className="mt-3 text-xs text-blue-600 underline font-semibold">Clear filters</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayStudents.map(student => {
              const sid  = student.student_id || student.id;
              const pred = predictions[sid];
              const isLoading = loadingId === sid;
              const sname = student.student_name || student.name || 'Unknown';
              const dept  = student.department || student.dept || '—';
              const att   = student.attendance_pct ?? student.attendance_score;
              const gpa   = student.previous_gpa;

              return (
                <div
                  key={sid}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-all group ${rowRiskStyle(pred?.risk_level)}`}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-[#1E3A8A]">{sname.charAt(0).toUpperCase()}</span>
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{sname}</p>
                    <p className="text-xs text-slate-400">
                      ID: {sid} · {dept}
                      {att  != null && ` · Att: ${Number(att).toFixed(1)}%`}
                      {gpa  != null && ` · GPA: ${Number(gpa).toFixed(2)}`}
                    </p>
                  </div>

                  {/* Attendance mini-bar */}
                  {att != null && (
                    <div className="hidden md:flex items-center gap-2 w-32 shrink-0">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Number(att))}%`,
                            backgroundColor: att >= 75 ? '#22C55E' : att >= 50 ? '#F59E0B' : '#EF4444',
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 w-10 text-right shrink-0">
                        {Number(att).toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {/* Risk + score / Analyze button */}
                  <div className="shrink-0 flex items-center gap-2">
                    {pred ? (
                      <>
                        <RiskBadge level={pred.risk_level} size="sm" />
                        <span className="hidden sm:block text-xs font-black text-slate-600 w-10 text-right">
                          {Number(pred.final_score).toFixed(1)}
                        </span>
                        {pred.predicted_grade && (
                          <span className="hidden sm:block text-xs font-bold text-slate-500 bg-slate-100 rounded-lg px-2 py-0.5">
                            {pred.predicted_grade}
                          </span>
                        )}
                        {pred.confidence_score != null && (
                          <span className="hidden lg:block text-xs text-slate-400 w-12 text-right">
                            {(pred.confidence_score * 100).toFixed(0)}%
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedData(pred)}
                          className="px-3 py-1.5 border border-blue-200 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-50 transition-all"
                        >
                          View
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => analyzeStudent(student)}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-[#3B82F6] text-white text-xs font-bold rounded-xl
                          hover:bg-[#2563eb] transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isLoading ? (
                          <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : '🔮'}
                        {isLoading ? 'Analyzing...' : 'Analyze'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prediction modal */}
      {selectedData && (
        <PredictionModal data={selectedData} onClose={() => setSelectedData(null)} />
      )}
    </div>
  );
};

export default TeacherDashboard;
