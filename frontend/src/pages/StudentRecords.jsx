import { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import StudentAvatar from '../components/StudentAvatar';

const StudentRecords = () => {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Department expand state
  const [selectedDept, setSelectedDept] = useState(null);

  // Drawer state
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [batchStudentsLoading, setBatchStudentsLoading] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');

  // Edit modal
  const [editingStudent, setEditingStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStudentData, setDeleteStudentData] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    fetchStudents();
    fetchDepartments();
    fetchBatches();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) setDepartments(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) setStudents(data.data || []);
      else setError(data.message || 'Failed to fetch students');
    } catch (e) { setError('Failed to fetch students'); }
    finally { setIsLoading(false); }
  };

  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      const res = await fetch('/api/admin/batches', { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      if (data.success) setBatches(data.data || []);
    } catch (e) { console.error(e); }
    finally { setBatchesLoading(false); }
  };

  const openBatchDrawer = async (batch) => {
    setSelectedBatch(batch);
    setDrawerSearch('');
    setBatchStudents([]);
    setBatchStudentsLoading(true);
    try {
      const res = await fetch(`/api/admin/batches/${batch.id}/students`, { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      if (data.success) setBatchStudents(data.data || []);
    } catch (e) { console.error(e); }
    finally { setBatchStudentsLoading(false); }
  };

  const handleDelete = (student) => {
    setDeleteStudentData({ id: student.id, name: student.name, studentId: student.studentId });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteStudentData) return;
    try {
      const res = await fetch(`/api/students/${deleteStudentData.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setToastMessage('Student deleted successfully');
        setToastType('success');
        setShowToast(true);
        fetchStudents();
        fetchBatches();
        // refresh drawer if open
        if (selectedBatch) openBatchDrawer(selectedBatch);
      } else { setError(data.message || 'Failed to delete'); }
    } catch (e) { setError('Failed to delete student'); }
    finally { setDeleteStudentData(null); }
  };

  const handleEdit = (student) => {
    setEditingStudent({ ...student });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent.name || !editingStudent.email) { setError('Name and email are required'); return; }
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingStudent.name,
          email: editingStudent.email,
          studentId: editingStudent.studentId,
          department: editingStudent.department,
          year: editingStudent.year
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Student updated successfully');
        setShowEditModal(false);
        setEditingStudent(null);
        fetchStudents();
        if (selectedBatch) openBatchDrawer(selectedBatch);
      } else { setError(data.message || 'Failed to update'); }
    } catch (e) { setError('Failed to update student'); }
  };

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(''); setSuccess(''); }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const recentStudents = [...students]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  const recentBatches = [...batches]
    .filter(b => b.status === 'active')
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Student Records</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-medium tracking-wide uppercase">Browse by department and batch</p>
          </div>
          <button onClick={() => { fetchStudents(); fetchBatches(); }} disabled={isLoading || batchesLoading}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-all disabled:opacity-50">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg">
          <p className="font-medium">{success}</p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Students</p>
          <p className="text-3xl font-bold text-gray-900">{students.length}</p>
          <p className="text-xs text-gray-400 mt-1">Enrolled in system</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Departments</p>
          <p className="text-3xl font-bold text-gray-900">{departments.length}</p>
          <p className="text-xs text-gray-400 mt-1">Active departments</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Batches</p>
          <p className="text-3xl font-bold text-gray-900">{batches.length}</p>
          <p className="text-xs text-gray-400 mt-1">{batches.filter(b => b.status === 'active').length} active</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Unassigned</p>
          <p className="text-3xl font-bold text-gray-900">
            {students.filter(s => !s.department).length}
          </p>
          <p className="text-xs text-gray-400 mt-1">No department</p>
        </div>
      </div>

      {/* Recent Enrollments */}
      {recentStudents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">Recent Enrollments</h3>
            <span className="text-xs text-gray-400">Last 5 students added</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentStudents.map(s => (
              <div key={s.id} className="flex-shrink-0 bg-gray-50 border border-gray-200 rounded-xl p-3 w-44">
                <div className="flex items-center gap-2 mb-2">
                  <StudentAvatar studentId={s.studentId} name={s.name} size={7} />
                  <p className="text-xs font-semibold text-gray-800 truncate">{s.name}</p>
                </div>
                <p className="text-xs text-gray-500 font-mono truncate">{s.studentId}</p>
                <p className="text-xs text-gray-400 truncate">{s.department || 'No dept'}</p>
                <p className="text-xs text-gray-300 mt-1">
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Active Batches */}
      {recentBatches.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">Recent Batch Assignments</h3>
            <span className="text-xs text-gray-400">Active batches</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentBatches.map(b => (
              <div key={b.id}
                onClick={() => { setSelectedDept(b.department); openBatchDrawer(b); }}
                className="flex-shrink-0 bg-gray-50 border border-gray-200 rounded-xl p-3 w-44 cursor-pointer hover:border-gray-400 hover:shadow transition-all">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <p className="text-xs font-semibold text-gray-800 truncate">{b.batch_name}</p>
                </div>
                <p className="text-xs text-gray-500 truncate">{b.department || 'No dept'}</p>
                <p className="text-xs text-gray-400">{b.start_year}–{b.end_year}</p>
                <p className="text-xs font-bold text-gray-700 mt-1">{b.student_count || 0} students</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Department Cards */}
      <div className="bg-white border border-gray-200 rounded-xl shadow p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Browse by Department</h3>

        {isLoading || batchesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-800 border-t-transparent" />
          </div>
        ) : departments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No departments found</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(dept => {
              const deptBatches = batches.filter(b => b.department === dept.name);
              const deptStudents = students.filter(s => s.department === dept.name);
              const isSelected = selectedDept === dept.name;
              return (
                <div key={dept.id}>
                  {/* Department Card */}
                  <div
                    onClick={() => setSelectedDept(isSelected ? null : dept.name)}
                    className={`rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden ${
                      isSelected ? 'border-gray-900 shadow-md' : 'border-gray-200 shadow hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="h-1 bg-gray-900" />
                    <div className="p-4 bg-white">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{dept.name}</h4>
                          <p className="text-xs text-gray-400 font-mono">{dept.code}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-all ${
                          isSelected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isSelected ? '▲ Hide' : '▼ Show'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{deptStudents.length}</p>
                          <p className="text-xs text-gray-400">Students</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{deptBatches.length}</p>
                          <p className="text-xs text-gray-400">Batches</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{deptBatches.filter(b => b.status === 'active').length}</p>
                          <p className="text-xs text-gray-400">Active</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Batch rows when expanded */}
                  {isSelected && (
                    <div className="mt-2 ml-2 space-y-2">
                      {deptBatches.length === 0 ? (
                        <p className="text-xs text-gray-400 px-3 py-2">No batches in this department</p>
                      ) : deptBatches.map(batch => {
                        const sc = {
                          active:    { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 ring-green-200' },
                          completed: { dot: 'bg-blue-500',  badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
                          upcoming:  { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
                          archived:  { dot: 'bg-gray-400',  badge: 'bg-gray-100 text-gray-500 ring-gray-200' },
                        }[batch.status] || { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-500 ring-gray-200' };
                        return (
                          <div key={batch.id}
                            onClick={() => openBatchDrawer(batch)}
                            className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-gray-400 hover:shadow transition-all flex items-center justify-between gap-3 group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{batch.batch_name}</p>
                              <p className="text-xs text-gray-400">{batch.start_year}–{batch.end_year} · {batch.student_count || 0} students</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${sc.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{batch.status}
                              </span>
                              <span className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-xs group-hover:bg-gray-900 group-hover:text-white transition-all">→</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Batch Drawer */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedBatch(null)} />
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedBatch.batch_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedBatch.department} · {selectedBatch.start_year}–{selectedBatch.end_year}
                  {!batchStudentsLoading && ` · ${batchStudents.length} students`}
                </p>
              </div>
              <button onClick={() => setSelectedBatch(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
              <input
                type="text"
                placeholder="Search by name, ID or email..."
                value={drawerSearch}
                onChange={e => setDrawerSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {batchStudentsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-800 border-t-transparent" />
                </div>
              ) : batchStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <p className="font-medium text-gray-600">No students in this batch</p>
                </div>
              ) : (
                <>
                  <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
                    {batchStudents.filter(s => {
                      if (!drawerSearch) return true;
                      const q = drawerSearch.toLowerCase();
                      return s.name.toLowerCase().includes(q) || (s.studentId||'').toLowerCase().includes(q) || (s.email||'').toLowerCase().includes(q);
                    }).length} of {batchStudents.length} shown
                  </div>
                  <table className="min-w-full">
                    <thead className="bg-gray-900 text-white sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide">Year</th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {batchStudents
                        .filter(s => {
                          if (!drawerSearch) return true;
                          const q = drawerSearch.toLowerCase();
                          return s.name.toLowerCase().includes(q) || (s.studentId||'').toLowerCase().includes(q) || (s.email||'').toLowerCase().includes(q);
                        })
                        .map(s => (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <StudentAvatar studentId={s.studentId} name={s.name} size={8} />
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                                  <p className="text-xs text-gray-400">{s.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600 font-mono">{s.studentId}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{s.year || '—'}</td>
                            <td className="px-6 py-3">
                              <div className="flex gap-1.5">
                                <button onClick={() => { setSelectedBatch(null); handleEdit(s); }}
                                  className="px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700 font-medium">Edit</button>
                                <button onClick={() => { setSelectedBatch(null); handleDelete(s); }}
                                  className="px-2.5 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 font-medium">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Edit Student</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input type="text" value={editingStudent.name}
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input type="email" value={editingStudent.email}
                  onChange={e => setEditingStudent({...editingStudent, email: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                <select value={editingStudent.department || ''}
                  onChange={e => setEditingStudent({...editingStudent, department: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white">
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                <select value={editingStudent.year || ''}
                  onChange={e => setEditingStudent({...editingStudent, year: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white">
                  <option value="">Select Year</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveEdit}
                className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-semibold transition-all">
                Save Changes
              </button>
              <button onClick={() => { setShowEditModal(false); setEditingStudent(null); }}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteStudentData(null); }}
        onConfirm={confirmDelete}
        title="Delete Student"
        message={deleteStudentData ? `Are you sure you want to delete ${deleteStudentData.name} (${deleteStudentData.studentId})? This will also remove all their records.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />

      <Toast message={toastMessage} type={toastType} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default StudentRecords;
