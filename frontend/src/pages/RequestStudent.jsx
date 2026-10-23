import { useState, useEffect, useCallback } from 'react';

const RequestStudent = () => {
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [allDepts, setAllDepts] = useState([]); // full dept objects with codes
  const [myRequests, setMyRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [idGenerating, setIdGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('request');
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const [formData, setFormData] = useState({
    name: '', email: '', studentId: '', department: '', batchYear: '1'
  });
  const [idLocked, setIdLocked] = useState(false); // true once auto-generated

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);
    // Load all departments for code lookup
    fetch('/api/departments').then(r => r.json()).then(d => { if (d.success) setAllDepts(d.data || []); });
    if (userData?.role === 'teacher') {
      fetchTeacherDepartments(userData.id);
      fetchMyRequests(userData.id);
    }
  }, []);

  const fetchTeacherDepartments = async (teacherId) => {
    try {
      const res = await fetch(`/api/teacher/departments/${teacherId}`, { headers: { 'x-user-role': 'teacher' } });
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setDepartments(data.data);
        setFormData(prev => ({ ...prev, department: data.data[0].department }));
      }
    } catch (e) {}
  };

  const fetchMyRequests = async (teacherId) => {
    try {
      const res = await fetch(`/api/teacher/my-requests/${teacherId}`, { headers: { 'x-user-role': 'teacher' } });
      const data = await res.json();
      if (data.success) setMyRequests(data.data || []);
    } catch (e) {}
  };

  // Auto-generate student ID whenever department or batchYear changes
  const generateId = useCallback(async (department, batchYear) => {
    if (!department || !batchYear) return;
    const deptObj = allDepts.find(d => d.name === department);
    if (!deptObj?.code) return;

    setIdGenerating(true);
    setIdLocked(false);
    try {
      const year = 2000 + parseInt(batchYear) + (new Date().getFullYear() - 2000 - parseInt(batchYear) >= 0
        ? 0 : 0); // use actual enrollment year
      // Use current year as the year component
      const enrollYear = new Date().getFullYear();
      const res = await fetch(`/api/students/generate-id?departmentCode=${encodeURIComponent(deptObj.code)}&year=${enrollYear}`);
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, studentId: data.studentId }));
        setIdLocked(true);
      }
    } catch (e) {}
    finally { setIdGenerating(false); }
  }, [allDepts]);

  // Trigger ID generation when dept or batchYear changes
  useEffect(() => {
    if (formData.department && allDepts.length > 0) {
      generateId(formData.department, formData.batchYear);
    }
  }, [formData.department, formData.batchYear, allDepts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/teacher/request-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'teacher' },
        body: JSON.stringify({ ...formData, teacherId: user.id, teacherRole: 'teacher' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Request submitted successfully');
        setFormData({ name: '', email: '', studentId: '', department: departments[0]?.department || '', batchYear: '1' });
        setIdLocked(false);
        fetchMyRequests(user.id);
        setActiveTab('myRequests');
      } else {
        showToast(data.message || 'Failed to submit', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const totalRequests = myRequests.length;
  const pendingCount  = myRequests.filter(r => r.status === 'pending').length;
  const approvedCount = myRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = myRequests.filter(r => r.status === 'rejected').length;

  const statusBadge = (status) => {
    if (status === 'approved') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    if (status === 'pending')  return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    if (status === 'rejected') return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    return 'bg-gray-100 text-gray-500';
  };

  const statusDot = (status) => {
    if (status === 'approved') return 'bg-emerald-500';
    if (status === 'pending')  return 'bg-amber-400';
    if (status === 'rejected') return 'bg-red-500';
    return 'bg-gray-400';
  };

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">

      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border
          ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Request Student</h1>
          <p className="text-sm text-gray-500 mt-0.5">Submit student creation requests for admin approval</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-xs font-semibold text-gray-600">{totalRequests} Total Requests</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending',  value: pendingCount,  color: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-200'  },
          { label: 'Approved', value: approvedCount, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200'},
          { label: 'Rejected', value: rejectedCount, color: 'text-red-600',     bg: 'bg-red-50',     ring: 'ring-red-200'   },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} ring-1 ${s.ring} flex items-center justify-center shrink-0`}>
              <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              <p className={`text-sm font-bold ${s.color}`}>{s.value} request{s.value !== 1 ? 's' : ''}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-2 pt-1">
          {[
            { key: 'request',    label: '✏️ New Request' },
            { key: 'myRequests', label: `📋 My Requests (${totalRequests})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all
                ${activeTab === tab.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── NEW REQUEST TAB ── */}
          {activeTab === 'request' && (
            departments.length === 0 ? (
              <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
                <span className="text-2xl shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Not assigned to any courses yet</p>
                  <p className="text-xs text-amber-600 mt-1">Ask your administrator to assign you to courses before requesting students.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Student Name" required>
                    <input type="text" required value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Full name"
                      className={inputCls} />
                  </Field>
                  <Field label="Email" required>
                    <input type="email" required value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder="student@school.com"
                      className={inputCls} />
                  </Field>
                  <Field label="Student ID" required>
                    <div className="relative">
                      <input type="text" required value={formData.studentId}
                        onChange={e => { setFormData(p => ({ ...p, studentId: e.target.value })); setIdLocked(false); }}
                        placeholder={idGenerating ? 'Generating...' : 'Auto-generated'}
                        className={`${inputCls} pr-24 ${idLocked ? 'bg-indigo-50 text-indigo-700 font-semibold' : ''}`}
                        readOnly={idGenerating}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {idGenerating
                          ? <span className="text-xs text-gray-400 flex items-center gap-1"><span className="animate-spin inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full" />generating</span>
                          : idLocked
                            ? <span className="text-xs text-indigo-600 font-semibold bg-indigo-100 px-2 py-0.5 rounded-full">auto</span>
                            : null
                        }
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Generated from department code + enrollment year + sequence</p>
                  </Field>
                  <Field label="Batch Year" required>
                    <select value={formData.batchYear}
                      onChange={e => setFormData(p => ({ ...p, batchYear: e.target.value }))}
                      className={inputCls}>
                      {['1','2','3','4'].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Department" required>
                  <select required value={formData.department}
                    onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                    className={inputCls}>
                    {departments.map((d, i) => (
                      <option key={i} value={d.department}>{d.department}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Only departments where you teach are shown</p>
                </Field>

                <div className="pt-2">
                  <button type="submit" disabled={isLoading}
                    className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm
                      ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'}`}>
                    {isLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )
          )}

          {/* ── MY REQUESTS TAB ── */}
          {activeTab === 'myRequests' && (
            myRequests.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm font-medium">No requests yet</p>
                <button onClick={() => setActiveTab('request')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs rounded-xl font-semibold hover:bg-indigo-700">
                  + New Request
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map(req => (
                  <div key={req.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                          {req.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{req.name}</p>
                          <p className="text-xs text-gray-400 truncate">{req.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-semibold shrink-0 ${statusBadge(req.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot(req.status)}`} />
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-gray-500">
                      <div><span className="font-medium text-gray-700">ID:</span> {req.studentId}</div>
                      <div><span className="font-medium text-gray-700">Dept:</span> {req.department}</div>
                      <div><span className="font-medium text-gray-700">Year:</span> {req.batchYear}</div>
                    </div>

                    <div className="mt-2 text-xs text-gray-400">
                      Submitted {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    {req.status === 'rejected' && req.rejection_reason && (
                      <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
                        <span className="shrink-0">✗</span>
                        <span>{req.rejection_reason}</span>
                      </div>
                    )}
                    {req.status === 'approved' && (
                      <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs text-emerald-700">
                        <span>✓</span> Student account created successfully
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
};

const inputCls = 'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm';

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
  </div>
);

export default RequestStudent;
