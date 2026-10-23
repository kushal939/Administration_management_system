import { useState, useEffect, useRef } from 'react';
import Toast from '../components/Toast';
import StudentAvatar from '../components/StudentAvatar';

// ── helpers ──────────────────────────────────────────────────────────────────
const isOverdue = d => d && new Date(d) < new Date();
const daysLeft = d => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const statusBadge = (status) => {
  if (status === 'graded')    return 'bg-emerald-100 text-emerald-700';
  if (status === 'submitted') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-500';
};

const Assignments = () => {
  const [user, setUser]           = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses]     = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast]         = useState({ show: false, msg: '', type: 'success' });

  // teacher form
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState({ title: '', description: '', course: '', due_date: '', total_marks: '100' });

  // filters
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // submission drawer (student)
  const [submitDrawer, setSubmitDrawer] = useState(null); // assignment object
  const [submitText, setSubmitText]     = useState('');
  const [submitFile, setSubmitFile]     = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [mySubmissions, setMySubmissions] = useState({}); // { assignmentId: submission }
  const fileRef = useRef();

  // grading drawer (teacher)
  const [gradeDrawer, setGradeDrawer]   = useState(null); // { assignment, submissions[] }
  const [gradeMap, setGradeMap]         = useState({});   // { subId: { marks, feedback } }
  const [savingGrade, setSavingGrade]   = useState(null);

  // submission list drawer (teacher — view all subs for one assignment)
  const [viewSubs, setViewSubs]         = useState(null); // assignment
  const [subsList, setSubsList]         = useState([]);
  const [subsLoading, setSubsLoading]   = useState(false);

  const showToast = (msg, type = 'success') => setToast({ show: true, msg, type });
  const userRole = user?.role?.toLowerCase() || '';
  const isTeacher = userRole === 'teacher';
  const isStudent = userRole === 'student';
  const isAdmin   = userRole === 'admin' || userRole === 'principal';

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(u);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAssignments();
    if (isTeacher || isAdmin) fetchCourses();
    if (isStudent && user.studentId) fetchMySubmissions();
  }, [user]);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      let url = '/api/assignments';
      if (isTeacher) url = `/api/assignments/teacher/${user.id}`;
      else if (isStudent) url = `/api/assignments/student/${user.studentId}`;
      const res = await fetch(url);
      const d = await res.json();
      if (d.success) setAssignments(d.data || []);
    } catch (e) {} finally { setIsLoading(false); }
  };

  const fetchCourses = async () => {
    try {
      const url = isTeacher ? `/api/teacher-courses/${user.id}` : '/api/courses';
      const res = await fetch(url);
      const d = await res.json();
      setCourses(isTeacher ? (d.courses || []) : (d.data || []).map(c => c.name));
    } catch (e) {}
  };

  const fetchMySubmissions = async () => {
    try {
      const res = await fetch(`/api/submissions/student/${user.studentId}`);
      const d = await res.json();
      const map = {};
      (d.data || []).forEach(s => { map[s.assignment_id] = s; });
      setMySubmissions(map);
    } catch (e) {}
  };

  // ── teacher: create/update assignment ────────────────────────────────────
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form.title || !form.course) return showToast('Title and course required', 'error');
    setIsLoading(true);
    try {
      const url = editing ? `/api/assignments/${editing.id}` : '/api/assignments';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, teacher_id: user.id })
      });
      const d = await res.json();
      if (d.success) {
        showToast(editing ? 'Assignment updated' : 'Assignment created');
        setShowForm(false); setEditing(null);
        setForm({ title: '', description: '', course: '', due_date: '', total_marks: '100' });
        fetchAssignments();
      } else showToast(d.message || 'Failed', 'error');
    } catch (e) { showToast('Network error', 'error'); }
    finally { setIsLoading(false); }
  };

  const handleEdit = (a) => {
    setEditing(a);
    setForm({ title: a.title, description: a.description || '', course: a.course, due_date: a.due_date || '', total_marks: String(a.total_marks) });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment?')) return;
    await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
    showToast('Deleted');
    fetchAssignments();
  };

  // ── student: submit assignment ────────────────────────────────────────────
  const openSubmitDrawer = (a) => { setSubmitDrawer(a); setSubmitText(''); setSubmitFile(null); };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showToast('File too large (max 5MB)', 'error'); return; }
    setSubmitFile(f);
  };

  const handleSubmitAssignment = async () => {
    if (!submitText && !submitFile) return showToast('Add text or attach a file', 'error');
    setSubmitting(true);
    try {
      // get student db id
      const sRes = await fetch(`/api/students`);
      const sData = await sRes.json();
      const student = (sData.data || []).find(s => s.studentId === user.studentId);
      if (!student) return showToast('Student not found', 'error');

      let file_name = null, file_data = null;
      if (submitFile) {
        file_name = submitFile.name;
        file_data = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(submitFile);
        });
      }

      const res = await fetch('/api/submissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: submitDrawer.id, student_db_id: student.id, content: submitText, file_name, file_data })
      });
      const d = await res.json();
      if (d.success) {
        showToast('Submitted successfully');
        setSubmitDrawer(null);
        fetchMySubmissions();
      } else showToast(d.message || 'Failed', 'error');
    } catch (e) { showToast('Network error', 'error'); }
    finally { setSubmitting(false); }
  };

  // ── teacher: view submissions for an assignment ───────────────────────────
  const openViewSubs = async (a) => {
    setViewSubs(a); setSubsLoading(true); setSubsList([]);
    try {
      const res = await fetch(`/api/submissions/assignment/${a.id}`);
      const d = await res.json();
      setSubsList(d.data || []);
      const gm = {};
      (d.data || []).forEach(s => { gm[s.id] = { marks: s.marks_obtained ?? '', feedback: s.feedback || '' }; });
      setGradeMap(gm);
    } catch (e) {} finally { setSubsLoading(false); }
  };

  const handleGrade = async (subId) => {
    const g = gradeMap[subId];
    if (g.marks === '' || g.marks === null) return showToast('Enter marks', 'error');
    setSavingGrade(subId);
    try {
      const res = await fetch(`/api/submissions/${subId}/grade`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks_obtained: Number(g.marks), feedback: g.feedback })
      });
      const d = await res.json();
      if (d.success) {
        showToast('Graded');
        setSubsList(prev => prev.map(s => s.id === subId ? { ...s, status: 'graded', marks_obtained: Number(g.marks), feedback: g.feedback } : s));
      } else showToast('Failed', 'error');
    } catch (e) { showToast('Network error', 'error'); }
    finally { setSavingGrade(null); }
  };

  // ── filters ───────────────────────────────────────────────────────────────
  const filtered = assignments.filter(a => {
    const cm = !filterCourse || a.course === filterCourse;
    const sm = filterStatus === 'all' ||
      (filterStatus === 'overdue' && isOverdue(a.due_date)) ||
      (filterStatus === 'active' && !isOverdue(a.due_date));
    return cm && sm;
  });

  const uniqueCourses = [...new Set(assignments.map(a => a.course))];

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isStudent ? 'My Assignments' : 'Assignments'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isStudent ? 'View, submit, and track your assignments' : 'Create and manage assignments, view submissions'}
          </p>
        </div>
        {isTeacher && (
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ title:'',description:'',course:'',due_date:'',total_marks:'100' }); }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold">
            {showForm ? '✕ Cancel' : '+ New Assignment'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Total', assignments.length, '📚', 'text-gray-900'],
          ['Active', assignments.filter(a => !isOverdue(a.due_date)).length, '✅', 'text-emerald-700'],
          ['Overdue', assignments.filter(a => isOverdue(a.due_date)).length, '⚠️', 'text-red-600'],
          isStudent
            ? ['Submitted', Object.keys(mySubmissions).length, '📤', 'text-indigo-700']
            : ['Courses', uniqueCourses.length, '🎓', 'text-indigo-700'],
        ].map(([l, v, icon, c]) => (
          <div key={l} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{l}</p>
              <p className={`text-2xl font-bold ${c}`}>{v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Teacher create/edit form */}
      {isTeacher && showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">{editing ? '✏️ Edit Assignment' : '➕ New Assignment'}</h2>
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
              placeholder="Assignment title *" required
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
              placeholder="Description / instructions" rows={3}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            <div className="grid grid-cols-3 gap-3">
              <select value={form.course} onChange={e => setForm(p => ({...p, course: e.target.value}))} required
                className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                <option value="">Select course *</option>
                {courses.map((c, i) => <option key={i} value={c}>{c}</option>)}
              </select>
              <input type="date" value={form.due_date} onChange={e => setForm(p => ({...p, due_date: e.target.value}))}
                className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <input type="number" min="1" value={form.total_marks} onChange={e => setForm(p => ({...p, total_marks: e.target.value}))}
                placeholder="Total marks"
                className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isLoading}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50">
                {isLoading ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">All Courses</option>
          {uniqueCourses.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
        </select>
        {(filterCourse || filterStatus !== 'all') && (
          <button onClick={() => { setFilterCourse(''); setFilterStatus('all'); }}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">✕ Clear</button>
        )}
      </div>

      {/* Assignment cards */}
      {isLoading && assignments.length === 0 ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-3">📝</div>
          <p className="text-gray-500 font-medium">{assignments.length === 0 ? 'No assignments yet' : 'No assignments match filters'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const overdue = isOverdue(a.due_date);
            const dl = daysLeft(a.due_date);
            const mySub = mySubmissions[a.id];
            return (
              <div key={a.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-gray-900">{a.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">{a.course}</span>
                        {overdue && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Overdue</span>}
                        {!overdue && dl !== null && dl <= 3 && dl >= 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Due soon</span>}
                        {isStudent && mySub && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge(mySub.status)}`}>
                            {mySub.status === 'graded' ? '✓ Graded' : '📤 Submitted'}
                          </span>
                        )}
                        {isStudent && !mySub && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500">Not submitted</span>}
                      </div>
                      {a.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{a.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>📅 Due: <span className={overdue ? 'text-red-500 font-semibold' : 'text-gray-600'}>{fmtDate(a.due_date)}</span></span>
                        <span>🎯 Marks: <span className="text-gray-700 font-semibold">{a.total_marks}</span></span>
                        {(isAdmin) && a.teacher_email && <span>👨‍🏫 {a.teacher_email}</span>}
                      </div>
                      {/* Student: show grade if graded */}
                      {isStudent && mySub?.status === 'graded' && (
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            Marks: {mySub.marks_obtained}/{a.total_marks}
                          </span>
                          {mySub.grade && (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                              mySub.grade === 'A+' || mySub.grade === 'A' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              mySub.grade === 'B+' || mySub.grade === 'B' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              mySub.grade === 'F' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>Grade: {mySub.grade}</span>
                          )}
                          {mySub.feedback && (
                            <div className="w-full mt-1 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-700 italic">
                              💬 "{mySub.feedback}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isStudent && !mySub && (
                        <button onClick={() => openSubmitDrawer(a)}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-xl hover:bg-indigo-700 font-semibold">
                          📤 Submit
                        </button>
                      )}
                      {isStudent && mySub && (
                        <button onClick={() => openSubmitDrawer(a)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-xl hover:bg-gray-200 font-semibold border border-gray-200">
                          ✏️ Resubmit
                        </button>
                      )}
                      {isTeacher && (
                        <>
                          <button onClick={() => openViewSubs(a)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs rounded-xl hover:bg-indigo-100 font-semibold border border-indigo-200">
                            📋 Submissions
                          </button>
                          <button onClick={() => handleEdit(a)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-xl hover:bg-gray-200 font-semibold border border-gray-200">
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDelete(a.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-xl hover:bg-red-100 font-semibold border border-red-200">
                            🗑️
                          </button>
                        </>
                      )}
                      {isAdmin && (
                        <button onClick={() => openViewSubs(a)}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs rounded-xl hover:bg-indigo-100 font-semibold border border-indigo-200">
                          📋 Submissions
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Student Submit Drawer ── */}
      {submitDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setSubmitDrawer(null)} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">Submit Assignment</p>
                <p className="text-xs text-gray-400">{submitDrawer.title} · {submitDrawer.course}</p>
              </div>
              <button onClick={() => setSubmitDrawer(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 p-6 space-y-4">
              {submitDrawer.description && (
                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 border border-gray-200">
                  <p className="font-semibold text-gray-700 mb-1">Instructions</p>
                  {submitDrawer.description}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your Answer / Text Submission</label>
                <textarea value={submitText} onChange={e => setSubmitText(e.target.value)}
                  rows={6} placeholder="Type your answer here..."
                  className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Attach File (optional, max 5MB)</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => fileRef.current?.click()}
                    className="px-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-600">
                    📎 Choose File
                  </button>
                  {submitFile && <span className="text-xs text-gray-500 truncate max-w-[200px]">{submitFile.name}</span>}
                  {submitFile && <button onClick={() => setSubmitFile(null)} className="text-xs text-red-400 hover:text-red-600">✕</button>}
                </div>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
              </div>
              {mySubmissions[submitDrawer.id] && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  ⚠️ You already submitted this. Resubmitting will replace your previous submission.
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setSubmitDrawer(null)}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmitAssignment} disabled={submitting}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50">
                {submitting ? 'Submitting...' : '📤 Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Teacher: View Submissions Drawer ── */}
      {viewSubs && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setViewSubs(null)} />
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">Submissions — {viewSubs.title}</p>
                <p className="text-xs text-gray-400">{viewSubs.course} · Total marks: {viewSubs.total_marks}</p>
              </div>
              <button onClick={() => setViewSubs(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {subsLoading ? (
                <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent" /></div>
              ) : subsList.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-400 text-sm">No submissions yet</p>
                </div>
              ) : subsList.map(sub => (
                <div key={sub.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <StudentAvatar studentId={sub.student_code} name={sub.student_name} size={8} />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{sub.student_name}</p>
                        <p className="text-xs text-gray-400">{sub.student_code} · Submitted {fmtDate(sub.submitted_at)}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusBadge(sub.status)}`}>
                      {sub.status === 'graded' ? '✓ Graded' : '📤 Submitted'}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {sub.content && (
                      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 border border-gray-100 max-h-32 overflow-y-auto">
                        {sub.content}
                      </div>
                    )}
                    {sub.file_name && (
                      <div className="flex items-center gap-2 text-xs text-indigo-600">
                        <span>📎</span>
                        <span className="font-medium">{sub.file_name}</span>
                        {sub.file_data && (
                          <a href={sub.file_data} download={sub.file_name}
                            className="ml-auto px-2.5 py-1 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 font-semibold">
                            ⬇ Download
                          </a>
                        )}
                      </div>
                    )}
                    {/* Grade inputs with rubric */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-3">
                        <input type="number" min="0" max={viewSubs.total_marks}
                          value={gradeMap[sub.id]?.marks ?? ''}
                          onChange={e => setGradeMap(p => ({...p, [sub.id]: {...(p[sub.id]||{}), marks: e.target.value}}))}
                          placeholder={`Marks /${viewSubs.total_marks}`}
                          className="w-28 px-3 py-1.5 text-xs rounded-xl border-2 border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-center font-bold" />
                        {/* Auto grade badge */}
                        {gradeMap[sub.id]?.marks !== '' && gradeMap[sub.id]?.marks != null && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            gradeMap[sub.id].marks >= 90 ? 'bg-emerald-100 text-emerald-700' :
                            gradeMap[sub.id].marks >= 70 ? 'bg-blue-100 text-blue-700' :
                            gradeMap[sub.id].marks >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {gradeMap[sub.id].marks >= 90 ? 'A+' : gradeMap[sub.id].marks >= 80 ? 'A' : gradeMap[sub.id].marks >= 70 ? 'B+' : gradeMap[sub.id].marks >= 60 ? 'B' : gradeMap[sub.id].marks >= 50 ? 'C+' : gradeMap[sub.id].marks >= 40 ? 'C' : 'F'}
                          </span>
                        )}
                        <button onClick={() => handleGrade(sub.id)} disabled={savingGrade === sub.id}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-xl hover:bg-emerald-700 font-semibold disabled:opacity-50 shrink-0">
                          {savingGrade === sub.id ? '...' : sub.status === 'graded' ? '✓ Update' : '✓ Grade'}
                        </button>
                      </div>
                      <textarea
                        value={gradeMap[sub.id]?.feedback ?? ''}
                        onChange={e => setGradeMap(p => ({...p, [sub.id]: {...(p[sub.id]||{}), feedback: e.target.value}}))}
                        placeholder="Feedback for student (optional) — e.g. Good work on the introduction, but the conclusion needs more detail..."
                        rows={2}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                      {/* Show existing feedback if graded */}
                      {sub.status === 'graded' && sub.feedback && !gradeMap[sub.id]?.feedback && (
                        <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">Previous: "{sub.feedback}"</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {subsList.length} submission{subsList.length !== 1 ? 's' : ''} ·{' '}
                {subsList.filter(s => s.status === 'graded').length} graded
              </p>
              <button onClick={() => setViewSubs(null)}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.msg} type={toast.type} isVisible={toast.show} onClose={() => setToast(p => ({...p, show: false}))} />
    </div>
  );
};

export default Assignments;
