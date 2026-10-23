import { useState, useEffect } from 'react';

const fmtTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Notices = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = user?.role?.toLowerCase() || '';
  const canPost = role === 'principal' || role === 'teacher';
  const isAdmin = role === 'admin';

  // General notices (admin view)
  const [notices, setNotices] = useState([]);

  // Targeted notices (teacher/principal)
  const [myNotices, setMyNotices] = useState([]);
  const [visibleNotices, setVisibleNotices] = useState([]);
  const [noticeForm, setNoticeForm] = useState({ title: '', body: '', target_type: 'all', target_value: '' });
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teacherBatches, setTeacherBatches] = useState([]);
  const [posting, setPosting] = useState(false);

  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    if (isAdmin) {
      fetchGeneralNotices();
    } else {
      fetchTargetedNotices();
      fetchMyNotices();
      if (canPost) {
        fetchDepartments();
        if (role === 'principal') {
          fetchBatches();
        } else if (role === 'teacher' && user?.id) {
          // fetch teacher's assigned batches directly
          fetch(`/api/teacher/batches?teacherId=${user.id}`, { headers: { 'x-user-role': 'teacher' } })
            .then(r => r.json())
            .then(d => setTeacherBatches(d.data || []))
            .catch(() => {});
        }
      }
    }
  }, []);

  // ── General notices (admin) ──
  const fetchGeneralNotices = async () => {
    try {
      const res = await fetch('/api/notices');
      const d = await res.json();
      setNotices(d.data || []);
    } catch (e) {}
  };

  // ── Targeted notices ──
  const fetchTargetedNotices = async () => {
    let batch_id = '', department = '';
    if (user?.studentId) {
      try {
        const sr = await fetch('/api/students');
        const sd = await sr.json();
        const st = (sd.data || []).find(s => s.studentId === user.studentId);
        if (st) { batch_id = st.batch_id; department = st.department; }
      } catch (e) {}
    }
    const res = await fetch(`/api/messages/notices?role=${role}&batch_id=${batch_id}&department=${department}`);
    const d = await res.json();
    setVisibleNotices(d.data || []);
  };

  const fetchMyNotices = async () => {
    const res = await fetch(`/api/messages/notices/all?sender_id=${user.id}`);
    const d = await res.json();
    setMyNotices(d.data || []);
  };

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    const d = await res.json();
    setDepartments(d.data || []);
  };

  const fetchBatches = async () => {
    const res = await fetch('/api/admin/batches', { headers: { 'x-user-role': 'admin' } });
    const d = await res.json();
    setBatches(d.data || []);
  };

  const fetchTeacherBatches = async () => {
    if (!user?.id) return;
    const res = await fetch(`/api/teacher/batches?teacherId=${user.id}`, { headers: { 'x-user-role': 'teacher' } });
    const d = await res.json();
    setTeacherBatches(d.data || []);
  };

  const postNotice = async () => {
    if (!noticeForm.title || !noticeForm.body) return showToast('Title and body required');
    setPosting(true);
    try {
      const res = await fetch('/api/messages/notices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: user.id, ...noticeForm })
      });
      const d = await res.json();
      if (d.success) {
        showToast('Notice posted');
        setNoticeForm({ title: '', body: '', target_type: 'all', target_value: '' });
        fetchMyNotices(); fetchTargetedNotices();
      } else showToast('Failed to post');
    } catch (e) { showToast('Network error'); }
    finally { setPosting(false); }
  };

  const deleteNotice = async (id) => {
    await fetch(`/api/messages/notices/${id}`, { method: 'DELETE' });
    fetchMyNotices(); fetchTargetedNotices();
    showToast('Notice deleted');
  };

  const targetLabel = (n) => {
    if (n.target_type === 'all') return '🌐 Everyone';
    if (n.target_type === 'department') return `🏛 ${n.target_value}`;
    if (n.target_type === 'batch') return `👥 Batch`;
    return `👤 ${n.target_value}`;
  };

  const targetBadgeColor = (t) =>
    t === 'all' ? 'bg-gray-100 text-gray-600' :
    t === 'department' ? 'bg-blue-50 text-blue-700' :
    t === 'batch' ? 'bg-emerald-50 text-emerald-700' :
    'bg-purple-50 text-purple-700';

  // ── Admin view: general notices ──
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">
        {toast && <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl shadow-lg">{toast}</div>}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
          <p className="text-sm text-gray-500 mt-0.5">All announcements and updates</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">All Notices ({notices.length})</p>
          </div>
          {notices.length === 0 ? (
            <div className="py-16 text-center"><div className="text-4xl mb-2">📭</div><p className="text-sm text-gray-400">No notices yet</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notices.map(n => (
                <div key={n.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-bold text-gray-900">{n.title}</p>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{n.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${n.priority === 'high' ? 'bg-red-100 text-red-700' : n.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{n.priority}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{n.content}</p>
                  <p className="text-xs text-gray-400 mt-1.5">By {n.author} · {fmtTime(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Teacher / Principal view: targeted notices ──
  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl shadow-lg">{toast}</div>}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
        <p className="text-sm text-gray-500 mt-0.5">Post and view targeted notices</p>
      </div>

      {/* Post form */}
      {canPost && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900">📢 Post Targeted Notice</h2>
          <div className="grid grid-cols-2 gap-3">
            <input value={noticeForm.title} onChange={e => setNoticeForm(p => ({...p, title: e.target.value}))}
              placeholder="Notice title *"
              className="col-span-2 px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <textarea value={noticeForm.body} onChange={e => setNoticeForm(p => ({...p, body: e.target.value}))}
              placeholder="Notice content *" rows={3}
              className="col-span-2 px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Send to</label>
              <select value={noticeForm.target_type} onChange={e => {
                const val = e.target.value;
                setNoticeForm(p => ({...p, target_type: val, target_value: ''}));
                if (val === 'batch' && role === 'teacher' && user?.id) {
                  fetch(`/api/teacher/batches?teacherId=${user.id}`, { headers: { 'x-user-role': 'teacher' } })
                    .then(r => r.json()).then(d => setTeacherBatches(d.data || [])).catch(() => {});
                }
              }}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                <option value="all">Everyone</option>
                <option value="role">By Role</option>
                <option value="department">By Department</option>
                <option value="batch">By Batch</option>
              </select>
            </div>
            {noticeForm.target_type === 'role' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Role</label>
                <select value={noticeForm.target_value} onChange={e => setNoticeForm(p => ({...p, target_value: e.target.value}))}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  <option value="">Select role</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                </select>
              </div>
            )}
            {noticeForm.target_type === 'department' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Department</label>
                <select value={noticeForm.target_value} onChange={e => setNoticeForm(p => ({...p, target_value: e.target.value}))}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            )}
            {noticeForm.target_type === 'batch' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Batch</label>
                <select value={noticeForm.target_value} onChange={e => setNoticeForm(p => ({...p, target_value: e.target.value}))}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  <option value="">Select batch</option>
                  {(role === 'teacher' ? teacherBatches : batches).map(b => (
                    <option key={b.id} value={String(b.id)}>{b.batch_name} — {b.department}</option>
                  ))}
                </select>
                {role === 'teacher' && teacherBatches.length === 0 && (
                  <p className="text-xs text-red-400 mt-1">No assigned batches found</p>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button onClick={postNotice} disabled={posting}
              className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50">
              {posting ? 'Posting...' : '📢 Post Notice'}
            </button>
          </div>
        </div>
      )}

      {/* My posted notices */}
      {myNotices.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">My Posted Notices</p>
          </div>
          <div className="divide-y divide-gray-50">
            {myNotices.map(n => (
              <div key={n.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-900">{n.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${targetBadgeColor(n.target_type)}`}>{targetLabel(n)}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{fmtTime(n.created_at)}</p>
                </div>
                <button onClick={() => deleteNotice(n.id)}
                  className="text-xs text-red-400 hover:text-red-600 shrink-0 px-2 py-1 rounded-lg hover:bg-red-50">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notices visible to this user */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notices For You</p>
        </div>
        {visibleNotices.length === 0 ? (
          <div className="py-14 text-center"><div className="text-4xl mb-2">📭</div><p className="text-sm text-gray-400">No notices yet</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visibleNotices.map(n => (
              <div key={n.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">{n.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${targetBadgeColor(n.target_type)}`}>{targetLabel(n)}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      From <span className="font-medium text-gray-600">{n.sender_name}</span> · {fmtTime(n.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notices;
