import { useState, useEffect } from 'react';
import StudentAvatar from '../components/StudentAvatar';

const MyBatches = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const teacherId = user.id;

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    if (!teacherId) return;
    setLoading(true);
    fetch(`/api/teacher/batches?teacherId=${teacherId}`, { headers: { 'x-user-role': 'teacher' } })
      .then(r => r.json())
      .then(d => { if (d.success) setBatches(d.data || []); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [teacherId]);

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
    setStudentSearch('');
    setStudentsLoading(true);
    fetch(`/api/teacher/batches/${batch.id}/students`, { headers: { 'x-user-role': 'teacher' } })
      .then(r => r.json())
      .then(d => { if (d.success) setStudents(d.data || []); })
      .catch(err => console.error(err))
      .finally(() => setStudentsLoading(false));
  };

  const statusColor = (s) => {
    if (s === 'active') return 'bg-green-100 text-green-700';
    if (s === 'upcoming') return 'bg-blue-100 text-blue-700';
    if (s === 'completed') return 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-600';
  };

  const filteredStudents = students.filter(s => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) ||
      (s.studentId || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Batches</h1>
            <p className="text-gray-500 text-sm mt-1">Batches you are assigned to teach</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{batches.length}</div>
            <div className="text-xs text-gray-500">Assigned Batches</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center text-gray-500">
          Loading batches...
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <div className="text-5xl mb-3">🎓</div>
          <p className="text-gray-600 font-medium">No batches assigned yet</p>
          <p className="text-gray-400 text-sm mt-1">Ask your admin to assign you to a batch</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map(batch => (
            <div
              key={batch.id}
              onClick={() => handleSelectBatch(batch)}
              className={`bg-white border rounded-xl shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${
                selectedBatch?.id === batch.id ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="border-l-4 border-gray-900 pl-3">
                  <h3 className="font-bold text-gray-900">{batch.batch_name}</h3>
                  <p className="text-sm text-gray-500">{batch.department}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(batch.status)}`}>
                  {batch.status}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">
                <span>{batch.start_year} – {batch.end_year}</span>
                <span>{batch.student_count || 0} students</span>
                <span>{batch.total_semesters || 8} sems</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Students Panel */}
      {selectedBatch && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5 gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Students in "{selectedBatch.batch_name}"
              </h2>
              <p className="text-sm text-gray-500">{selectedBatch.department} · {filteredStudents.length} shown</p>
            </div>
            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Search students..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full pl-4 pr-8 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:border-gray-400 focus:outline-none text-sm"
              />
              {studentSearch && (
                <button onClick={() => setStudentSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
              )}
            </div>
          </div>

          {studentsLoading ? (
            <div className="text-center py-10 text-gray-500">Loading students...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">👨‍🎓</div>
              <p className="text-gray-500">{studentSearch ? 'No matching students' : 'No students in this batch'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-400">{i + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <StudentAvatar studentId={s.studentId} name={s.name} size={8} />
                          <div>
                            <div className="font-medium text-gray-800 text-sm">{s.name}</div>
                            <div className="text-xs text-gray-400">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{s.studentId || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{s.department || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{s.year ? `Year ${s.year}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyBatches;
