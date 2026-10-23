import { useState, useEffect } from 'react';
import AdminBatchERP from './AdminBatchERP';
import Toast from '../components/Toast';
import StudentAvatar from '../components/StudentAvatar';

const PrincipalBatchManagement = () => {
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedDept, setSelectedDept] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showAllStudentsDrawer, setShowAllStudentsDrawer] = useState(false);
  const [allStudentsList, setAllStudentsList] = useState([]);
  const [allStudentsSearch, setAllStudentsSearch] = useState('');
  const [showStudentsDrawer, setShowStudentsDrawer] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [erpBatchId, setErpBatchIdRaw] = useState(() => {
    const saved = sessionStorage.getItem('principalErpBatchId');
    return saved ? parseInt(saved) : null;
  });

  const setErpBatchId = (id) => {
    if (id) sessionStorage.setItem('principalErpBatchId', id);
    else sessionStorage.removeItem('principalErpBatchId');
    setErpBatchIdRaw(id);
  };

  useEffect(() => {
    fetchBatches();
    fetchDepartments();
  }, []);

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/batches', { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      if (data.success) setBatches(data.data || []);
    } catch (e) { setError('Failed to load batches'); }
    finally { setIsLoading(false); }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) setDepartments(data.data || []);
    } catch (e) { console.error(e); }
  };


  const handleViewAllStudents = async () => {
    setShowAllStudentsDrawer(true);
    try {
      const res = await fetch('/api/admin/batches/all-students', { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      if (data.success) setAllStudentsList(data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleViewStudents = async (batch) => {
    setCurrentBatch(batch);
    setIsLoadingStudents(true);
    setShowStudentsDrawer(true);
    setDrawerSearch('');
    try {
      const res = await fetch(`/api/admin/batches/${batch.id}/students`, { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      if (data.success) setBatchStudents(data.data || []);
    } catch (e) { console.error(e); }
    finally { setIsLoadingStudents(false); }
  };

  const handleExportAll = async () => {
    try {
      const res = await fetch('/api/admin/batches/export', { headers: { 'x-user-role': 'admin' } });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `batches_${Date.now()}.xlsx`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
        setToastMessage('Exported successfully!'); setToastType('success'); setShowToast(true);
      }
    } catch (e) { setToastMessage('Export failed'); setToastType('error'); setShowToast(true); }
  };

  const handleExportBatchStudents = async (batchId, batchName) => {
    try {
      const res = await fetch(`/api/admin/batches/${batchId}/export-students`, { headers: { 'x-user-role': 'admin' } });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${batchName.replace(/\s+/g, '_')}_students_${Date.now()}.xlsx`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
        setToastMessage('Students exported!'); setToastType('success'); setShowToast(true);
      }
    } catch (e) { setToastMessage('Export failed'); setToastType('error'); setShowToast(true); }
  };

  const allDeptNames = [...new Set([
    ...departments.map(d => d.name),
    ...batches.map(b => b.department).filter(Boolean)
  ])];

  const deptList = allDeptNames.map(name => {
    const deptObj = departments.find(d => d.name === name);
    const deptBatches = batches.filter(b => b.department === name);
    return {
      id: deptObj?.id, name, code: deptObj?.code || '',
      batches: deptBatches,
      activeCount: deptBatches.filter(b => b.status === 'active').length,
      studentCount: deptBatches.reduce((s, b) => s + (b.student_count || 0), 0),
    };
  });

  const visibleBatches = selectedDept
    ? batches.filter(b => {
        const matchesDept = b.department === selectedDept;
        const matchesSearch = !searchQuery || b.batch_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !filterStatus || b.status === filterStatus;
        return matchesDept && matchesSearch && matchesStatus;
      })
    : [];

  const totalBatches = batches.length;
  const activeBatches = batches.filter(b => b.status === 'active').length;


  return (
    <div className="space-y-5 bg-gray-100 min-h-screen -m-6 p-6">
      {erpBatchId && <AdminBatchERP batchId={erpBatchId} onBack={() => { sessionStorage.removeItem('erpView'); setErpBatchId(null); }} readOnly={true} />}
      {!erpBatchId && (<>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 shadow">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Batch Management</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-medium tracking-wide uppercase">View Only — Departments → Batches → Students</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg font-medium">👁 View Only</span>
            <button onClick={handleExportAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 text-white rounded-lg font-semibold text-sm hover:bg-gray-700 transition-all shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export All
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Departments</p>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{deptList.length}</p>
          <p className="text-xs text-gray-400 mt-1">Total departments</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Batches</p>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalBatches}</p>
          <p className="text-xs text-gray-400 mt-1">{activeBatches} active</p>
        </div>
        <div onClick={handleViewAllStudents}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow cursor-pointer hover:border-gray-400 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Students</p>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-all">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{batches.reduce((s, b) => s + (b.student_count || 0), 0)}</p>
          <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-600 transition-colors">Click to view all →</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">{error}</div>}


      {/* Department Cards */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-800 border-t-transparent" />
          <p className="mt-3 text-gray-500 text-sm font-medium">Loading...</p>
        </div>
      ) : deptList.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow">
          <p className="text-gray-700 font-semibold">No departments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {deptList.map(dept => (
            <div key={dept.name}
              onClick={() => setSelectedDept(selectedDept === dept.name ? null : dept.name)}
              className={`bg-white border rounded-xl shadow cursor-pointer transition-all hover:shadow-md overflow-hidden
                ${selectedDept === dept.name ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-1' : 'border-gray-200 hover:border-gray-400'}`}>
              <div className="h-1 bg-gray-900" />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{dept.name}</h3>
                    {dept.code && <p className="text-xs text-gray-400 mt-0.5 font-mono">{dept.code}</p>}
                  </div>
                </div>
                <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex-1 text-center">
                    <p className="text-xl font-bold text-gray-900">{dept.batches.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Batches</p>
                  </div>
                  <div className="w-px bg-gray-100" />
                  <div className="flex-1 text-center">
                    <p className="text-xl font-bold text-gray-900">{dept.activeCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Active</p>
                  </div>
                  <div className="w-px bg-gray-100" />
                  <div className="flex-1 text-center">
                    <p className="text-xl font-bold text-gray-900">{dept.studentCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Students</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center font-medium">{selectedDept === dept.name ? '▲ Collapse' : '▼ View batches'}</p>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Batches for selected department */}
      {selectedDept && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-gray-900 rounded-full" />
                <h2 className="text-base font-bold text-gray-900">{selectedDept}</h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{visibleBatches.length} batch{visibleBatches.length !== 1 ? 'es' : ''}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search batches..."
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:border-gray-400 w-44" />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:border-gray-400">
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                {(searchQuery || filterStatus) && (
                  <button onClick={() => { setSearchQuery(''); setFilterStatus(''); }}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-all">Clear</button>
                )}
              </div>
            </div>
          </div>

          {visibleBatches.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow">
              <p className="text-gray-700 font-semibold">No batches in {selectedDept}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleBatches.map(batch => {
                const capacity = 40;
                const studentCount = batch.student_count || 0;
                const occupancy = Math.min(Math.round((studentCount / capacity) * 100), 100);
                const isNearFull = occupancy >= 80;
                const barColor = occupancy >= 90 ? 'bg-red-500' : occupancy >= 80 ? 'bg-orange-400' : 'bg-emerald-500';
                const statusConfig = {
                  active:    { label: 'Active',    dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700 ring-green-200' },
                  completed: { label: 'Completed', dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
                  upcoming:  { label: 'Upcoming',  dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 ring-orange-200' },
                  archived:  { label: 'Archived',  dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-500 ring-gray-200' },
                };
                const sc = statusConfig[batch.status] || statusConfig.archived;
                const accentColor = batch.status === 'active' ? 'bg-green-500'
                  : batch.status === 'completed' ? 'bg-blue-500'
                  : batch.status === 'upcoming'  ? 'bg-amber-400'
                  : 'bg-gray-300';
                return (
                  <div key={batch.id} className="bg-white rounded-xl flex flex-col shadow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border border-gray-200 overflow-hidden">
                    <div className={`h-1 ${accentColor}`} />
                    <div className="p-5 flex flex-col gap-4 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 leading-tight truncate">{batch.batch_name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{batch.start_year}–{batch.end_year} · {batch.total_semesters || 8} semesters</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${sc.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                          <p className="text-gray-400 text-xs font-medium">Students</p>
                          <p className="font-bold text-gray-800 text-lg leading-tight">{studentCount}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                          <p className="text-gray-400 text-xs font-medium">Teachers</p>
                          <p className="font-bold text-gray-800 text-lg leading-tight">{batch.teacher_count || 0}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-400 font-medium">Capacity</span>
                          <span className={`font-semibold ${isNearFull ? 'text-orange-500' : 'text-gray-500'}`}>{studentCount}/{capacity} · {occupancy}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${occupancy}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 mt-auto pt-3 border-t border-gray-100">
                        <button onClick={() => handleViewStudents(batch)} title="View Students"
                          className="py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-800 hover:text-white transition-all">👥 Students</button>
                        <button onClick={() => handleExportBatchStudents(batch.id, batch.batch_name)} title="Export"
                          className="py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-800 hover:text-white transition-all">⬇ Export</button>
                        <button onClick={() => setErpBatchId(batch.id)} title="ERP"
                          className="py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-all">ERP</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* Students Drawer (read-only) */}
      {showStudentsDrawer && currentBatch && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setShowStudentsDrawer(false); }} />
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{currentBatch.batch_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{currentBatch.department} · {batchStudents.length} enrolled</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleExportBatchStudents(currentBatch.id, currentBatch.batch_name)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-all">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export
                </button>
                <button onClick={() => setShowStudentsDrawer(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl">×</button>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
              <input type="text" placeholder="Search students..." value={drawerSearch} onChange={e => setDrawerSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoadingStudents
                ? <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-800 border-t-transparent" /></div>
                : batchStudents.length === 0
                  ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p className="font-medium text-gray-600">No students enrolled</p></div>
                  : <table className="min-w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Year</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {batchStudents
                          .filter(s => { if (!drawerSearch) return true; const q = drawerSearch.toLowerCase(); return s.name.toLowerCase().includes(q) || (s.studentId||'').toLowerCase().includes(q) || (s.email||'').toLowerCase().includes(q); })
                          .map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  <StudentAvatar studentId={s.studentId} name={s.name} size={8} />
                                  <div><p className="text-sm font-semibold text-gray-800">{s.name}</p><p className="text-xs text-gray-400">{s.email}</p></div>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-600 font-mono">{s.studentId}</td>
                              <td className="px-6 py-3 text-sm text-gray-600">Yr {s.year}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
              }
            </div>
          </div>
        </div>
      )}

      {/* All Students Drawer */}
      {showAllStudentsDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setShowAllStudentsDrawer(false); setAllStudentsSearch(''); }} />
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div><h2 className="text-lg font-bold text-gray-900">All Students</h2><p className="text-sm text-gray-500 mt-0.5">{allStudentsList.length} total</p></div>
              <button onClick={() => { setShowAllStudentsDrawer(false); setAllStudentsSearch(''); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
              <input type="text" placeholder="Search students..." value={allStudentsSearch} onChange={e => setAllStudentsSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 sticky top-0"><tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Dept</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Batch</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {allStudentsList
                    .filter(s => { if (!allStudentsSearch) return true; const q = allStudentsSearch.toLowerCase(); return (s.name||'').toLowerCase().includes(q) || (s.studentId||'').toLowerCase().includes(q) || (s.email||'').toLowerCase().includes(q); })
                    .map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3"><p className="text-sm font-semibold text-gray-800">{s.name}</p><p className="text-xs text-gray-400">{s.email}</p></td>
                        <td className="px-6 py-3 text-sm text-gray-600">{s.department}</td>
                        <td className="px-6 py-3">{s.batch_name ? <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.batch_name}</span> : <span className="text-xs text-amber-500">Unassigned</span>}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMessage} type={toastType} isVisible={showToast} onClose={() => setShowToast(false)} />
      </>)}
    </div>
  );
};

export default PrincipalBatchManagement;
