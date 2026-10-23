import { useState, useEffect, useRef } from 'react';
import Toast from '../components/Toast';
import StudentAvatar from '../components/StudentAvatar';

const fmtTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const diff = now - dt;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const roleColor = (role) => {
  if (role === 'teacher') return 'bg-indigo-100 text-indigo-700';
  if (role === 'admin' || role === 'principal') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-600';
};

const Messages = () => {
  const [user, setUser]           = useState(null);
  const [tab, setTab]             = useState('inbox'); // inbox | compose | notices
  const [contacts, setContacts]   = useState([]);
  const [inbox, setInbox]         = useState([]);
  const [sent, setSent]           = useState([]);
  const [conversationContacts, setConversationContacts] = useState([]);
  const [thread, setThread]       = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [unread, setUnread]       = useState(0);
  const [msgBody, setMsgBody]     = useState('');
  const [msgSubject, setMsgSubject] = useState('');
  const [composeTo, setComposeTo] = useState('');
  const [composeToList, setComposeToList] = useState([]); // multi-select for teacher→students
  const [composeBatch, setComposeBatch] = useState('');
  const [teacherBatches, setTeacherBatches] = useState([]);
  const [sending, setSending]     = useState(false);
  const [toast, setToast]         = useState({ show: false, msg: '', type: 'success' });

  // notices
  const [notices, setNotices]     = useState([]);
  const [myNotices, setMyNotices] = useState([]);
  const [noticeForm, setNoticeForm] = useState({ title: '', body: '', target_type: 'all', target_value: '' });
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches]     = useState([]);
  const [postingNotice, setPostingNotice] = useState(false);

  const threadRef = useRef();
  const activeContactRef = useRef(null);
  useEffect(() => { activeContactRef.current = activeContact; }, [activeContact]);
  const showToast = (msg, type = 'success') => setToast({ show: true, msg, type });
  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = userRole === 'admin' || userRole === 'principal';
  const isTeacher = userRole === 'teacher';
  const isStudent = userRole === 'student';

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(u);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchContacts();
    refreshMessages();
    fetchUnread();
    fetchNotices();
    if (isAdmin || isTeacher) { fetchDepartments(); fetchBatches(); fetchMyNotices(); }
    if (isTeacher) { fetchTeacherBatches(user); }

    // Poll for new messages every 5s
    const poll = setInterval(async () => {
      await refreshMessages();
      fetchUnread();
      const current = activeContactRef.current;
      if (current) {
        const r = await fetch(`/api/messages/thread/${user.id}/${current.id}`);
        const d = await r.json();
        if (d.success) setThread(d.data || []);
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [user]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [thread]);

  const fetchContacts = async () => {
    const res = await fetch(`/api/messages/contacts?user_id=${user.id}&role=${userRole}`);
    const d = await res.json();
    setContacts(d.data || []);
  };

  const fetchInbox = async () => {
    const res = await fetch(`/api/messages/inbox/${user.id}`);
    const d = await res.json();
    setInbox(d.data || []);
    return d.data || [];
  };

  const fetchSent = async () => {
    const res = await fetch(`/api/messages/sent/${user.id}`);
    const d = await res.json();
    setSent(d.data || []);
    return d.data || [];
  };

  // fetch both together and update allMessages atomically
  const refreshMessages = async () => {
    const [inboxRes, sentRes] = await Promise.all([
      fetch(`/api/messages/inbox/${user.id}`).then(r => r.json()),
      fetch(`/api/messages/sent/${user.id}`).then(r => r.json()),
    ]);
    const inboxData = inboxRes.data || [];
    const sentData  = sentRes.data  || [];
    setInbox(inboxData);
    setSent(sentData);
  };

  // Allowed contact roles per role
  const allowedRoles = {
    admin:     ['teacher', 'principal'],
    principal: ['teacher', 'admin'],
    teacher:   ['student', 'admin', 'principal'],
    student:   ['teacher', 'principal'],
  };

  // Recompute sidebar conversation list whenever inbox or sent changes
  useEffect(() => {
    const permitted = new Set(allowedRoles[userRole] || []);
    const all = [
      ...inbox
        .filter(m => permitted.has(m.sender_role))
        .map(m => ({
          contactId: m.sender_id, label: m.sender_name, role: m.sender_role,
          email: m.sender_email, lastMsg: m.body, lastTime: m.created_at, unread: !m.is_read
        })),
      ...sent
        .filter(m => permitted.has(m.receiver_role))
        .map(m => ({
          contactId: m.receiver_id, label: m.receiver_name, role: m.receiver_role,
          email: m.receiver_email, lastMsg: m.body, lastTime: m.created_at, unread: false
        })),
    ];
    // sort newest first so Map keeps the latest message per contact
    all.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
    const map = new Map();
    for (const m of all) {
      if (!map.has(m.contactId)) {
        map.set(m.contactId, { id: m.contactId, label: m.label, role: m.role, email: m.email, lastMsg: m.lastMsg, lastTime: m.lastTime });
      }
    }
    // unread = true if ANY inbox message from this contact is unread
    const unreadSet = new Set(inbox.filter(m => !m.is_read).map(m => m.sender_id));
    setConversationContacts([...map.values()].map(c => ({ ...c, unread: unreadSet.has(c.id) })));
  }, [inbox, sent, userRole]);

  const fetchUnread = async () => {
    const res = await fetch(`/api/messages/unread-count/${user.id}`);
    const d = await res.json();
    setUnread(d.count || 0);
  };

  const fetchNotices = async () => {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    // get student batch/dept if student
    let batch_id = '', department = '';
    if (u?.studentId) {
      try {
        const sr = await fetch(`/api/students`);
        const sd = await sr.json();
        const st = (sd.data || []).find(s => s.studentId === u.studentId);
        if (st) { batch_id = st.batch_id; department = st.department; }
      } catch (e) {}
    }
    const res = await fetch(`/api/messages/notices?role=${u?.role}&batch_id=${batch_id}&department=${department}`);
    const d = await res.json();
    setNotices(d.data || []);
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

  const fetchTeacherBatches = async (u) => {
    const uid = u?.id;
    if (!uid) return;
    const res = await fetch(`/api/teacher/batches?teacherId=${uid}`, {
      headers: { 'x-user-role': 'teacher' }
    });
    const d = await res.json();
    setTeacherBatches(d.data || []);
  };

  const openThread = async (contact) => {
    setActiveContact(contact);
    setTab('inbox');
    const res = await fetch(`/api/messages/thread/${user.id}/${contact.id}`);
    const d = await res.json();
    setThread(d.data || []);
    fetchUnread();
    fetchInbox();
  };

  const sendMessage = async () => {
    // For teacher multi-select: composeToList; otherwise single composeTo or activeContact
    const recipients = isTeacher && composeToList.length > 0
      ? composeToList
      : activeContact?.id
        ? [activeContact.id]
        : composeTo ? [composeTo] : [];

    if (recipients.length === 0 || !msgBody.trim()) return showToast('Select recipient and write a message', 'error');
    setSending(true);
    const bodyToSend = msgBody;
    const subjectToSend = msgSubject;
    setMsgBody(''); setMsgSubject('');
    try {
      await Promise.all(recipients.map(toId =>
        fetch('/api/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender_id: user.id, receiver_id: toId, subject: subjectToSend, body: bodyToSend })
        }).then(r => r.json())
      ));
      showToast(recipients.length > 1 ? `Sent to ${recipients.length} recipients` : 'Message sent');
      await refreshMessages();
      if (activeContact) {
        const tr = await fetch(`/api/messages/thread/${user.id}/${activeContact.id}`).then(r => r.json());
        if (tr?.success) setThread(tr.data || []);
      }
      if (tab === 'compose') { setTab('inbox'); setComposeTo(''); setComposeToList([]); setComposeBatch(''); }
    } catch (e) { showToast('Network error', 'error'); setMsgBody(bodyToSend); }
    finally { setSending(false); }
  };

  const deleteMessage = async (id) => {
    await fetch(`/api/messages/${id}`, { method: 'DELETE' });
    fetchInbox(); fetchSent();
    if (activeContact) {
      const tr = await fetch(`/api/messages/thread/${user.id}/${activeContact.id}`);
      const td = await tr.json();
      setThread(td.data || []);
    }
  };

  const postNotice = async () => {
    if (!noticeForm.title || !noticeForm.body) return showToast('Title and body required', 'error');
    setPostingNotice(true);
    try {
      const res = await fetch('/api/messages/notices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: user.id, ...noticeForm })
      });
      const d = await res.json();
      if (d.success) {
        showToast('Notice posted');
        setNoticeForm({ title: '', body: '', target_type: 'all', target_value: '' });
        fetchMyNotices(); fetchNotices();
      } else showToast('Failed', 'error');
    } catch (e) { showToast('Network error', 'error'); }
    finally { setPostingNotice(false); }
  };

  const deleteNotice = async (id) => {
    await fetch(`/api/messages/notices/${id}`, { method: 'DELETE' });
    fetchMyNotices(); fetchNotices();
    showToast('Notice deleted');
  };

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Direct messages and targeted notices</p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">{unread} unread</span>
          )}
          <button onClick={() => { setTab('compose'); setActiveContact(null); }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold">
            ✉️ New Message
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm w-fit">
        {[
          { key: 'inbox', label: `📥 Inbox${unread > 0 ? ` (${unread})` : ''}` },
          { key: 'compose', label: '✉️ Compose' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key !== 'inbox') setActiveContact(null); }}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── INBOX / THREAD ── */}
      {tab === 'inbox' && (
        <div className="flex gap-4 h-[600px]">
          {/* Contact list */}
          <div className="w-64 shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {/* Conversations */}
              {conversationContacts.map(c => (
                <button key={c.id} onClick={() => openThread(c)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-all ${activeContact?.id === c.id ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${c.unread ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {(c.label || c.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate ${c.unread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{c.label || c.email}</p>
                        <span className="text-xs text-gray-400 shrink-0 ml-1">{fmtTime(c.lastTime)}</span>
                      </div>
                      <p className={`text-xs truncate ${c.unread ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>{c.lastMsg}</p>
                    </div>
                    {c.unread && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                  </div>
                </button>
              ))}

              {/* All Contacts — batch-grouped for teachers, flat list for others */}
              {isTeacher ? (() => {
                const batchMap = new Map();
                for (const b of teacherBatches) batchMap.set(String(b.id), b.batch_name);

                const staff = contacts.filter(c => c.role === 'admin' || c.role === 'principal');
                const grouped = {};
                for (const b of teacherBatches) grouped[b.batch_name] = [];
                for (const s of contacts.filter(c => c.role === 'student')) {
                  const bname = batchMap.get(String(s.batch_id));
                  if (bname) grouped[bname].push(s);
                }

                const hasAnyContact = staff.length > 0 || Object.values(grouped).some(g => g.length > 0);

                return hasAnyContact ? (
                  <>
                    <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">All Contacts</p>
                    </div>
                    {/* Batch sections */}
                    {Object.entries(grouped).map(([batchName, bStudents]) => (
                      <div key={batchName}>
                        <div className="px-4 py-1.5 bg-indigo-50">
                          <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">🎓 {batchName}</p>
                        </div>
                        {bStudents.map(c => (
                          <button key={c.id} onClick={() => openThread(c)}
                            className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-all ${activeContact?.id === c.id ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${conversationContacts.find(cc=>cc.id===c.id)?.unread ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {(c.label || c.email || '?')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-gray-700 truncate">{c.label || c.email}</p>
                                {conversationContacts.find(cc=>cc.id===c.id) && (
                                  <p className="text-xs text-gray-400 truncate">{conversationContacts.find(cc=>cc.id===c.id).lastMsg}</p>
                                )}
                              </div>
                              {conversationContacts.find(cc=>cc.id===c.id)?.unread && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                            </div>
                          </button>
                        ))}
                        {bStudents.length === 0 && (
                          <p className="text-xs text-gray-400 px-4 py-2">No students enrolled</p>
                        )}
                      </div>
                    ))}
                    {/* Staff */}
                    {staff.length > 0 && (
                      <div>
                        <div className="px-4 py-1.5 bg-purple-50">
                          <p className="text-xs font-bold text-purple-500 uppercase tracking-widest">👔 Staff</p>
                        </div>
                        {staff.map(c => (
                          <button key={c.id} onClick={() => openThread(c)}
                            className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-all ${activeContact?.id === c.id ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0">
                                {(c.label || c.email || '?')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-700 truncate">{c.label || c.email}</p>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColor(c.role)}`}>{c.role}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : null;
              })() : (
                <>
                  {contacts.filter(c => !conversationContacts.find(cc => cc.id === c.id)).length > 0 && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">All Contacts</p>
                    </div>
                  )}
                  {contacts.filter(c => !conversationContacts.find(cc => cc.id === c.id)).map(c => (
                    <button key={c.id} onClick={() => openThread(c)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-all ${activeContact?.id === c.id ? 'bg-indigo-50' : ''}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                          {(c.label || c.email || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{c.label || c.email}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColor(c.role)}`}>{c.role}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {contacts.length === 0 && conversationContacts.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">No contacts available</p>
              )}
            </div>
          </div>

          {/* Thread / message area */}
          <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            {!activeContact ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <div className="text-5xl mb-3">💬</div>
                <p className="text-sm font-medium">Select a contact to start messaging</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                    {(activeContact.label || activeContact.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{activeContact.label || activeContact.email}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColor(activeContact.role)}`}>{activeContact.role}</span>
                  </div>
                </div>

                {/* Messages */}
                <div ref={threadRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {thread.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <p className="text-sm">No messages yet — say hello!</p>
                    </div>
                  ) : thread.map(m => {
                    const isMine = m.sender_id === user.id;
                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] group relative`}>
                          {m.subject && <p className="text-xs font-bold text-gray-500 mb-0.5 px-1">{m.subject}</p>}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                            {m.body}
                          </div>
                          <div className={`flex items-center gap-2 mt-0.5 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-gray-400">{fmtTime(m.created_at)}</span>
                            {isMine && (
                              <button onClick={() => deleteMessage(m.id)}
                                className="text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply box */}
                <div className="px-4 py-3 border-t border-gray-100 flex gap-2 items-end">
                  <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message… (Enter to send)"
                    rows={2}
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                  <button onClick={sendMessage} disabled={sending || !msgBody.trim()}
                    className="px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50 shrink-0">
                    {sending ? '...' : '➤'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── COMPOSE ── */}
      {tab === 'compose' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 max-w-2xl space-y-4">
          <h2 className="text-sm font-bold text-gray-900">New Message</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">To</label>

            {/* Teacher: batch picker then filtered students */}
            {isTeacher ? (
              <div className="space-y-2">
                <select value={composeBatch} onChange={e => { setComposeBatch(e.target.value); setComposeTo(''); setComposeToList([]); }}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  <option value="">— Select batch —</option>
                  {teacherBatches.map(b => (
                    <option key={b.id} value={b.id}>{b.batch_name} ({b.department})</option>
                  ))}
                  <option value="__staff__">Admin / Principal</option>
                </select>

                {composeBatch && composeBatch !== '__staff__' && (() => {
                  const batchStudents = contacts.filter(c => c.role === 'student' && String(c.batch_id) === String(composeBatch));
                  const allSelected = batchStudents.length > 0 && batchStudents.every(c => composeToList.includes(c.id));
                  const toggleStudent = (id) => setComposeToList(prev =>
                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                  );
                  return (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Select all */}
                      <label className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100">
                        <input type="checkbox" checked={allSelected}
                          onChange={() => setComposeToList(allSelected ? [] : batchStudents.map(c => c.id))}
                          className="w-3.5 h-3.5 accent-indigo-600" />
                        <span className="text-xs font-bold text-gray-600">Select all ({batchStudents.length})</span>
                      </label>
                      {batchStudents.length === 0 && (
                        <p className="text-xs text-gray-400 px-3 py-2">No students in this batch</p>
                      )}
                      {batchStudents.map(c => (
                        <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-indigo-50 border-b border-gray-50 last:border-0">
                          <input type="checkbox" checked={composeToList.includes(c.id)}
                            onChange={() => toggleStudent(c.id)}
                            className="w-3.5 h-3.5 accent-indigo-600" />
                          <span className="text-xs text-gray-700">{c.label || c.email}</span>
                        </label>
                      ))}
                      {composeToList.length > 0 && (
                        <div className="px-3 py-1.5 bg-indigo-50 text-xs text-indigo-700 font-semibold">
                          {composeToList.length} student{composeToList.length > 1 ? 's' : ''} selected
                        </div>
                      )}
                    </div>
                  );
                })()}

                {composeBatch === '__staff__' && (
                  <select value={composeTo} onChange={e => setComposeTo(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                    <option value="">— Select recipient —</option>
                    {contacts
                      .filter(c => c.role === 'admin' || c.role === 'principal')
                      .map(c => <option key={c.id} value={c.id}>{c.label || c.email} ({c.role})</option>)
                    }
                  </select>
                )}
              </div>
            ) : (
              <select value={composeTo} onChange={e => setComposeTo(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                <option value="">Select recipient</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.label || c.email} ({c.role})</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject (optional)</label>
            <input value={msgSubject} onChange={e => setMsgSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message</label>
            <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)}
              placeholder="Write your message..." rows={5}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setTab('inbox')}
              className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => { if (!isTeacher) setActiveContact(contacts.find(c => String(c.id) === String(composeTo))); sendMessage(); }}
              disabled={sending || (!composeTo && composeToList.length === 0) || !msgBody.trim()}
              className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50">
              {sending ? 'Sending...' : '➤ Send'}
            </button>
          </div>
        </div>
      )}

      {/* ── NOTICES ── */}
      {tab === 'notices' && (
        <div className="space-y-4">
          {/* Post notice form — admin/teacher only */}
          {(isAdmin || isTeacher) && (
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
                  <select value={noticeForm.target_type} onChange={e => setNoticeForm(p => ({...p, target_type: e.target.value, target_value: ''}))}
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
                      {batches.map(b => <option key={b.id} value={String(b.id)}>{b.batch_name} — {b.department}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button onClick={postNotice} disabled={postingNotice}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50">
                  {postingNotice ? 'Posting...' : '📢 Post Notice'}
                </button>
              </div>
            </div>
          )}

          {/* My posted notices (admin/teacher) */}
          {(isAdmin || isTeacher) && myNotices.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">My Posted Notices</p>
              </div>
              <div className="divide-y divide-gray-50">
                {myNotices.map(n => (
                  <div key={n.id} className="px-5 py-3 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-gray-900">{n.title}</p>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {n.target_type === 'all' ? 'Everyone' : `${n.target_type}: ${n.target_value}`}
                        </span>
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

          {/* Notices visible to current user */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notices for You</p>
            </div>
            {notices.length === 0 ? (
              <div className="py-14 text-center">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-sm text-gray-400">No notices yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notices.map(n => (
                  <div key={n.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-gray-900">{n.title}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            n.target_type === 'all' ? 'bg-gray-100 text-gray-600' :
                            n.target_type === 'department' ? 'bg-blue-50 text-blue-700' :
                            n.target_type === 'batch' ? 'bg-emerald-50 text-emerald-700' :
                            'bg-purple-50 text-purple-700'
                          }`}>
                            {n.target_type === 'all' ? '🌐 Everyone' :
                             n.target_type === 'department' ? `🏛 ${n.target_value}` :
                             n.target_type === 'batch' ? `👥 Batch` :
                             `👤 ${n.target_value}`}
                          </span>
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
      )}

      <Toast message={toast.msg} type={toast.type} isVisible={toast.show} onClose={() => setToast(p => ({...p, show: false}))} />
    </div>
  );
};

export default Messages;
