import { useState, useEffect } from 'react';
import StudentAvatar from '../components/StudentAvatar';

const MyBatch = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [batchInfo, setBatchInfo] = useState(null);
  const [myself, setMyself] = useState(null);
  const [classmates, setClassmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.email) { setLoading(false); return; }

    // Fetch all students and find this user by email
    fetch('/api/students')
      .then(r => r.json())
      .then(d => {
        const all = d.data || [];
        const student = all.find(s => s.email === user.email);
        if (student && student.batch_id) {
          setMyself(student);
          // Fetch batch students
          return fetch(`/api/admin/batches/${student.batch_id}/students`, { headers: { 'x-user-role': 'admin' } })
            .then(r => r.json())
            .then(sd => {
              if (sd.success && sd.data && sd.data.length > 0) {
                setBatchInfo({
                  batch_name: sd.data[0].batch_name,
                  batch_department: sd.data[0].batch_department,
                  id: student.batch_id
                });
                setClassmates(sd.data.filter(s => s.id !== student.id));
              }
            });
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const allMembers = myself ? [myself, ...classmates] : classmates;

  const filtered = allMembers.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) || (s.studentId || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center text-gray-500">
        Loading your batch...
      </div>
    );
  }

  if (!batchInfo) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">My Batch</h1>
          <p className="text-gray-500 text-sm mt-1">Your batch enrollment</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <div className="text-5xl mb-3">🎓</div>
          <p className="text-gray-600 font-medium">You are not assigned to any batch yet</p>
          <p className="text-gray-400 text-sm mt-1">Contact your admin to get assigned to a batch</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Batch</h1>
            <p className="text-gray-500 text-sm mt-1">Your current batch and classmates</p>
          </div>
        </div>
      </div>

      {/* Batch Info Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center text-white text-2xl">🎓</div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{batchInfo.batch_name}</h2>
            <p className="text-gray-500 text-sm">{batchInfo.batch_department}</p>
          </div>
          <div className="ml-auto bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center">
            <div className="text-xl font-bold text-gray-900">{allMembers.length}</div>
            <div className="text-xs text-gray-500">Total Students</div>
          </div>
        </div>
      </div>

      {/* Classmates */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5 gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Batch Members ({allMembers.length})</h2>
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search classmates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-4 pr-8 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:border-gray-400 focus:outline-none text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">✕</button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">{search ? 'No matching students' : 'No students in this batch yet'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(s => {
              const isMe = myself && s.id === myself.id;
              return (
                <div key={s.id} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${isMe ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <StudentAvatar studentId={s.studentId} name={s.name} size={9} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-800 text-sm truncate">{s.name}</span>
                      {isMe && <span className="text-xs bg-gray-900 text-white px-1.5 py-0.5 rounded font-semibold shrink-0">You</span>}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{s.studentId || s.email}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBatch;
