import { useState, useEffect } from 'react';
import { getUserRole, isReadOnly } from '../utils/roleUtils';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const Courses = () => {
  const userRole = getUserRole();
  const readOnly = isReadOnly(userRole);

  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('batch');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedSem, setSelectedSem] = useState(null);
  const [semTab, setSemTab] = useState('courses');
  const [expandedDept, setExpandedDept] = useState(null);
  const [semesterData, setSemesterData] = useState({});
  const [semCourses, setSemCourses] = useState({});
  const [semTeachers, setSemTeachers] = useState({});
  const [assignCourseModal, setAssignCourseModal] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [assignTeacherModal, setAssignTeacherModal] = useState(null);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [deleteCourseData, setDeleteCourseData] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseFormData, setCourseFormData] = useState({ name: '', code: '', department: '', credits: '' });

  useEffect(() => { fetchCourses(); fetchDepartments(); fetchBatches(); }, []);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      if (data.success) setCourses(data.data || []);
    } catch (e) { setError('Network error'); }
    finally { setIsLoading(false); }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) setDepartments(data.data || []);
    } catch (e) {}
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/admin/batches', { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      if (data.success) setBatches(data.data || []);
    } catch (e) {}
  };

  const selectBatch = async (batch) => {
    setSelectedBatch(batch);
    setSelectedSem(null);
    setSemTab('courses');
    if (!semesterData[batch.id]) {
      setSemesterData(prev => ({ ...prev, [batch.id]: { semesters: [], loading: true } }));
      try {
        const res = await fetch(`/api/admin/erp/batches/${batch.id}/overview`, { headers: { 'x-user-role': 'admin' } });
        const data = await res.json();
        if (data.success) {
          setSemesterData(prev => ({ ...prev, [batch.id]: { semesters: data.data.semesters || [], loading: false } }));
        }
      } catch (e) {
        setSemesterData(prev => ({ ...prev, [batch.id]: { semesters: [], loading: false } }));
      }
    }
  };

  const selectSem = (sem) => {
    setSelectedSem(sem);
    setSemTab('courses');
    loadSemCourses(selectedBatch.id, sem.semester_number);
  };

  const loadSemCourses = async (batchId, semNum) => {
    const key = `${batchId}-${semNum}`;
    if (semCourses[key] && !semCourses[key].reload) return;
    setSemCourses(prev => ({ ...prev, [key]: { courses: [], loading: true } }));
    try {
      const res = await fetch(`/api/admin/erp/batches/${batchId}/semesters/${semNum}/courses`, { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      setSemCourses(prev => ({ ...prev, [key]: { courses: data.data || [], loading: false } }));
    } catch (e) {
      setSemCourses(prev => ({ ...prev, [key]: { courses: [], loading: false } }));
    }
  };

  const loadSemTeachers = async (batchId, semNum) => {
    const key = `${batchId}-${semNum}`;
    if (semTeachers[key] && !semTeachers[key].reload) return;
    setSemTeachers(prev => ({ ...prev, [key]: { teachers: [], loading: true } }));
    try {
      const res = await fetch(`/api/admin/erp/batches/${batchId}/semesters/${semNum}/teachers`, { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      setSemTeachers(prev => ({ ...prev, [key]: { teachers: data.data || [], loading: false } }));
    } catch (e) {
      setSemTeachers(prev => ({ ...prev, [key]: { teachers: [], loading: false } }));
    }
  };

  const handleSemTab = (tab) => {
    setSemTab(tab);
    if (!selectedBatch || !selectedSem) return;
    if (tab === 'courses') loadSemCourses(selectedBatch.id, selectedSem.semester_number);
    if (tab === 'teachers') loadSemTeachers(selectedBatch.id, selectedSem.semester_number);
  };

  const openAssignCourse = async () => {
    if (!selectedBatch || !selectedSem) return;
    setAssignCourseModal({ batchId: selectedBatch.id, semNum: selectedSem.semester_number });
    setSelectedCourseIds([]);
    try {
      const res = await fetch(`/api/admin/erp/batches/${selectedBatch.id}/semesters/${selectedSem.semester_number}/available-courses`, { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      setAvailableCourses(data.data || []);
    } catch (e) { setAvailableCourses([]); }
  };

  const confirmAssignCourses = async () => {
    if (!assignCourseModal || selectedCourseIds.length === 0) return;
    const { batchId, semNum } = assignCourseModal;
    try {
      const res = await fetch(`/api/admin/erp/batches/${batchId}/semesters/${semNum}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify({ courseIds: selectedCourseIds })
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message); setToastType('success'); setShowToast(true);
        const key = `${batchId}-${semNum}`;
        setSemCourses(prev => ({ ...prev, [key]: { ...prev[key], reload: true } }));
        loadSemCourses(batchId, semNum);
        setAssignCourseModal(null);
      } else setError(data.message);
    } catch (e) { setError('Network error'); }
  };

  const removeSemCourse = async (courseId) => {
    if (!selectedBatch || !selectedSem) return;
    const { id: batchId } = selectedBatch;
    const semNum = selectedSem.semester_number;
    try {
      await fetch(`/api/admin/erp/batches/${batchId}/semesters/${semNum}/courses/${courseId}`, { method: 'DELETE', headers: { 'x-user-role': 'admin' } });
      const key = `${batchId}-${semNum}`;
      setSemCourses(prev => ({ ...prev, [key]: { ...prev[key], reload: true } }));
      loadSemCourses(batchId, semNum);
    } catch (e) { setError('Network error'); }
  };

  const openAssignTeacher = async () => {
    if (!selectedBatch || !selectedSem) return;
    setAssignTeacherModal({ batchId: selectedBatch.id, semNum: selectedSem.semester_number });
    setSelectedTeacherIds([]);
    try {
      const res = await fetch(`/api/admin/erp/batches/${selectedBatch.id}/semesters/${selectedSem.semester_number}/available-teachers`, { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      setAvailableTeachers(data.data || []);
    } catch (e) { setAvailableTeachers([]); }
  };

  const confirmAssignTeachers = async () => {
    if (!assignTeacherModal || selectedTeacherIds.length === 0) return;
    const { batchId, semNum } = assignTeacherModal;
    try {
      const res = await fetch(`/api/admin/erp/batches/${batchId}/semesters/${semNum}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify({ teacherIds: selectedTeacherIds })
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message); setToastType('success'); setShowToast(true);
        const key = `${batchId}-${semNum}`;
        setSemTeachers(prev => ({ ...prev, [key]: { ...prev[key], reload: true } }));
        loadSemTeachers(batchId, semNum);
        setAssignTeacherModal(null);
      } else setError(data.message);
    } catch (e) { setError('Network error'); }
  };

  const removeSemTeacher = async (teacherId) => {
    if (!selectedBatch || !selectedSem) return;
    const { id: batchId } = selectedBatch;
    const semNum = selectedSem.semester_number;
    try {
      await fetch(`/api/admin/erp/batches/${batchId}/semesters/${semNum}/teachers/${teacherId}`, { method: 'DELETE', headers: { 'x-user-role': 'admin' } });
      const key = `${batchId}-${semNum}`;
      setSemTeachers(prev => ({ ...prev, [key]: { ...prev[key], reload: true } }));
      loadSemTeachers(batchId, semNum);
    } catch (e) { setError('Network error'); }
  };

  const handleCourseChange = (e) => setCourseFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAddCourse = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!courseFormData.name || !courseFormData.code || !courseFormData.department) { setError('Fill all required fields'); return; }
    try {
      setIsLoading(true);
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : '/api/courses';
      const res = await fetch(url, {
        method: editingCourse ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: courseFormData.name, code: courseFormData.code, department: courseFormData.department, credits: courseFormData.credits || null })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(editingCourse ? 'Course updated!' : 'Course added!');
        setCourseFormData({ name: '', code: '', department: '', credits: '' });
        setShowCourseForm(false); setEditingCourse(null);
        fetchCourses();
      } else setError(data.message || 'Failed');
    } catch (e) { setError('Network error'); }
    finally { setIsLoading(false); }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setCourseFormData({ name: course.name, code: course.code, department: course.department, credits: course.credits || '' });
    setShowCourseForm(true);
  };

  const confirmDeleteCourse = async () => {
    if (!deleteCourseData) return;
    try {
      const res = await fetch(`/api/courses/${deleteCourseData.courseId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { setToastMessage('Course deleted'); setToastType('success'); setShowToast(true); fetchCourses(); }
      else setError(data.message || 'Failed');
    } catch (e) { setError('Network error'); }
    finally { setDeleteCourseData(null); }
  };

  useEffect(() => {
    if (error || success) { const t = setTimeout(() => { setError(''); setSuccess(''); }, 3000); return () => clearTimeout(t); }
  }, [error, success]);

  const statusConfig = {
    active:    { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 ring-green-200',  label: 'Active' },
    completed: { dot: 'bg-blue-500',  badge: 'bg-blue-50 text-blue-700 ring-blue-200',    label: 'Completed' },
    upcoming:  { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 ring-amber-200', label: 'Upcoming' },
    archived:  { dot: 'bg-gray-400',  badge: 'bg-gray-100 text-gray-500 ring-gray-200',   label: 'Archived' },
  };

  const sd = selectedBatch ? semesterData[selectedBatch.id] : null;
  const semKey = selectedBatch && selectedSem ? `${selectedBatch.id}-${selectedSem.semester_number}` : null;
  const currentSemCourses = semKey ? semCourses[semKey] : null;
  const currentSemTeachers = semKey ? semTeachers[semKey] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Courses</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-medium tracking-wide uppercase">Semester-wise course and teacher management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              <button onClick={() => { setViewMode('batch'); setSelectedBatch(null); setSelectedSem(null); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'batch' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                By Batch
              </button>
              <button onClick={() => setViewMode('department')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'department' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                By Department
              </button>
            </div>
            {!readOnly && (
              <button onClick={() => { setShowCourseForm(!showCourseForm); setEditingCourse(null); setCourseFormData({ name: '', code: '', department: '', credits: '' }); }}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-all font-medium text-sm">
                {showCourseForm ? 'Cancel' : '+ Add Course'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg"><p className="font-medium">{error}</p></div>}
      {success && <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg"><p className="font-medium">{success}</p></div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Courses', value: courses.length, sub: 'in system' },
          { label: 'Departments', value: departments.length, sub: 'active' },
          { label: 'Total Batches', value: batches.length, sub: `${batches.filter(b => b.status === 'active').length} active` },
          { label: 'Avg / Dept', value: departments.length ? Math.round(courses.length / departments.length) : 0, sub: 'courses' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5 shadow">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Add/Edit Course Form */}
      {!readOnly && showCourseForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">{editingCourse ? 'Edit Course' : 'Add New Course'}</h2>
          <form onSubmit={handleAddCourse} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={courseFormData.name} onChange={handleCourseChange}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="e.g., Data Structures" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Code <span className="text-red-500">*</span></label>
                <input type="text" name="code" value={courseFormData.code} onChange={handleCourseChange}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="e.g., CS201" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Department <span className="text-red-500">*</span></label>
                <select name="department" value={courseFormData.department} onChange={handleCourseChange}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white" required>
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}{d.code ? ` (${d.code})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Credits (optional)</label>
                <input type="number" name="credits" value={courseFormData.credits} onChange={handleCourseChange} min="1"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400" placeholder="e.g., 3" />
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-semibold transition-all disabled:opacity-50">
              {isLoading ? 'Saving...' : editingCourse ? 'Update Course' : 'Add Course'}
            </button>
          </form>
        </div>
      )}

      {/* BATCH VIEW */}
      {viewMode === 'batch' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-800 border-t-transparent" />
            </div>
          ) : batches.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow">
              <p className="text-gray-500">No batches found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {batches.map(batch => {
                const sc = statusConfig[batch.status] || statusConfig.archived;
                const accentColor = batch.status === 'active' ? 'bg-green-500'
                  : batch.status === 'completed' ? 'bg-blue-500'
                  : batch.status === 'upcoming' ? 'bg-amber-400' : 'bg-gray-300';
                return (
                  <div key={batch.id} onClick={() => selectBatch(batch)}
                    className="bg-white rounded-xl border border-gray-200 shadow hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden group">
                    <div className={`h-1 ${accentColor}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{batch.batch_name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{batch.start_year} - {batch.end_year}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 shrink-0 ${sc.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-4 truncate">{batch.department || 'No department'}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-xl font-bold text-gray-900">{batch.student_count || 0}</p>
                          <p className="text-xs text-gray-400">Students</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-gray-900">{batch.total_semesters || 8}</p>
                          <p className="text-xs text-gray-400">Semesters</p>
                        </div>
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-all text-gray-500 text-sm font-bold">
                          {'>'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Slide-in Drawer */}
          {selectedBatch && (
            <div className="fixed inset-0 z-50 flex">
              <div className="flex-1 bg-black/40" onClick={() => { setSelectedBatch(null); setSelectedSem(null); }} />
              <div className="w-full max-w-3xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

                {/* Drawer header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedBatch.batch_name}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedBatch.department} {selectedBatch.start_year ? `· ${selectedBatch.start_year} - ${selectedBatch.end_year}` : ''} · {selectedBatch.student_count || 0} students
                    </p>
                  </div>
                  <button onClick={() => { setSelectedBatch(null); setSelectedSem(null); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl">x</button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                  {/* Semester list */}
                  <div className="w-48 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Semesters</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {!sd || sd.loading ? (
                        <div className="flex items-center justify-center py-10">
                          <div className="animate-spin rounded-full h-5 w-5 border-4 border-gray-800 border-t-transparent" />
                        </div>
                      ) : sd.semesters.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6 px-3">No semesters found</p>
                      ) : sd.semesters.map(sem => {
                        const semSc = statusConfig[sem.status] || statusConfig.archived;
                        const isActive = selectedSem?.id === sem.id;
                        return (
                          <button key={sem.id} onClick={() => selectSem(sem)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-all ${isActive ? 'bg-white border-l-2 border-l-gray-900' : 'hover:bg-white'}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                S{sem.semester_number}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold truncate ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{sem.name}</p>
                                <div className="inline-flex items-center gap-1 text-xs mt-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${semSc.dot}`} />
                                  <span className="text-gray-400">{semSc.label}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detail panel */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {!selectedSem ? (
                      <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl mb-3">📚</div>
                        <p className="text-sm font-semibold text-gray-600">Select a semester</p>
                        <p className="text-xs text-gray-400 mt-1">Choose a semester to manage its courses and teachers</p>
                      </div>
                    ) : (
                      <>
                        <div className="px-5 py-3 border-b border-gray-200 bg-white shrink-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-gray-900">{selectedSem.name}</p>
                              <p className="text-xs text-gray-400">{selectedSem.student_count || 0} students enrolled</p>
                            </div>
                            {!readOnly && (
                              <div className="flex gap-2">
                                {semTab === 'courses' && (
                                  <button onClick={openAssignCourse}
                                    className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700 font-semibold">
                                    + Assign Course
                                  </button>
                                )}
                                {semTab === 'teachers' && (
                                  <button onClick={openAssignTeacher}
                                    className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700 font-semibold">
                                    + Assign Teacher
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 mt-2">
                            {['courses', 'teachers'].map(tab => (
                              <button key={tab} onClick={() => handleSemTab(tab)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${semTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {tab === 'courses' ? '📚 Courses' : '👨‍🏫 Teachers'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5">
                          {semTab === 'courses' && (
                            !currentSemCourses || currentSemCourses.loading ? (
                              <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-800 border-t-transparent" />
                              </div>
                            ) : currentSemCourses.courses.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-12 text-center">
                                <p className="text-sm text-gray-500">No courses assigned yet</p>
                                {!readOnly && <button onClick={openAssignCourse} className="mt-2 text-xs text-gray-600 underline hover:text-gray-900">Assign courses</button>}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {currentSemCourses.courses.map(c => (
                                  <div key={c.course_id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-gray-400 font-mono">{c.code}</p>
                                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{c.name}</p>
                                      {c.credits && <p className="text-xs text-gray-400 mt-1">{c.credits} credits</p>}
                                    </div>
                                    {!readOnly && (
                                      <button onClick={() => removeSemCourse(c.course_id)}
                                        className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all text-lg leading-none shrink-0">x</button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                          {semTab === 'teachers' && (
                            !currentSemTeachers || currentSemTeachers.loading ? (
                              <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-800 border-t-transparent" />
                              </div>
                            ) : currentSemTeachers.teachers.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-12 text-center">
                                <p className="text-sm text-gray-500">No teachers assigned yet</p>
                                {!readOnly && <button onClick={openAssignTeacher} className="mt-2 text-xs text-gray-600 underline hover:text-gray-900">Assign teachers</button>}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {currentSemTeachers.teachers.map(t => (
                                  <div key={t.teacher_id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 text-sm font-bold shrink-0">
                                        {(t.teacher_name || t.teacher_email || 'T').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        {t.teacher_name && <p className="text-sm font-semibold text-gray-800">{t.teacher_name}</p>}
                                        <p className="text-xs text-gray-500">{t.teacher_email}</p>
                                      </div>
                                    </div>
                                    {!readOnly && (
                                      <button onClick={() => removeSemTeacher(t.teacher_id)}
                                        className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all text-lg leading-none">x</button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* DEPARTMENT VIEW */}
      {viewMode === 'department' && (
        <div className="space-y-3">
          {departments.map(dept => {
            const deptCourses = courses.filter(c => c.department === dept.name);
            const deptBatches = batches.filter(b => b.department === dept.name);
            const isOpen = expandedDept === dept.id;
            return (
              <div key={dept.id} className="bg-white border border-gray-200 rounded-xl shadow overflow-hidden">
                <div onClick={() => setExpandedDept(isOpen ? null : dept.id)}
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {dept.code || dept.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{dept.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{deptBatches.length} batches · {deptBatches.filter(b => b.status === 'active').length} active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{deptCourses.length}</p>
                      <p className="text-xs text-gray-400">courses</p>
                    </div>
                    <span className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm font-bold">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    {deptCourses.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No courses in this department</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {deptCourses.map(course => (
                          <div key={course.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow transition-all">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="text-xs font-bold text-gray-500 font-mono">{course.code}</p>
                                <p className="text-sm font-semibold text-gray-800 mt-0.5">{course.name}</p>
                              </div>
                              {course.credits && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium shrink-0">{course.credits}cr</span>
                              )}
                            </div>
                            {!readOnly && (
                              <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100">
                                <button onClick={() => handleEditCourse(course)}
                                  className="flex-1 px-2 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700 font-medium">Edit</button>
                                <button onClick={() => { setDeleteCourseData({ courseId: course.id, courseName: course.name }); setShowDeleteCourseModal(true); }}
                                  className="flex-1 px-2 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 font-medium">Delete</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Course Modal */}
      {assignCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-bold text-gray-900">Assign Courses</h2>
                <p className="text-xs text-gray-500 mt-0.5">Semester {assignCourseModal.semNum} · {selectedBatch?.department}</p>
              </div>
              <button onClick={() => setAssignCourseModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">x</button>
            </div>
            <div className="p-6">
              {availableCourses.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">All department courses are already assigned to this semester</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {availableCourses.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selectedCourseIds.includes(c.id)}
                        onChange={e => setSelectedCourseIds(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))}
                        className="w-4 h-4 rounded border-gray-300" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{c.code}{c.credits ? ` · ${c.credits}cr` : ''}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={confirmAssignCourses} disabled={selectedCourseIds.length === 0}
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50">
                  Assign {selectedCourseIds.length > 0 ? `(${selectedCourseIds.length})` : ''}
                </button>
                <button onClick={() => setAssignCourseModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {assignTeacherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-bold text-gray-900">Assign Teachers</h2>
                <p className="text-xs text-gray-500 mt-0.5">Semester {assignTeacherModal.semNum} · {selectedBatch?.batch_name}</p>
              </div>
              <button onClick={() => setAssignTeacherModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">x</button>
            </div>
            <div className="p-6">
              {availableTeachers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No available teachers to assign</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {availableTeachers.map(t => (
                    <label key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selectedTeacherIds.includes(t.id)}
                        onChange={e => setSelectedTeacherIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))}
                        className="w-4 h-4 rounded border-gray-300" />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 text-xs font-bold shrink-0">
                          {(t.name || t.email || 'T').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          {t.name && <p className="text-sm font-semibold text-gray-800">{t.name}</p>}
                          <p className="text-xs text-gray-500">{t.email}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={confirmAssignTeachers} disabled={selectedTeacherIds.length === 0}
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50">
                  Assign {selectedTeacherIds.length > 0 ? `(${selectedTeacherIds.length})` : ''}
                </button>
                <button onClick={() => setAssignTeacherModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteCourseModal}
        onClose={() => { setShowDeleteCourseModal(false); setDeleteCourseData(null); }}
        onConfirm={confirmDeleteCourse}
        title="Delete Course"
        message={deleteCourseData ? `Delete "${deleteCourseData.courseName}"? This cannot be undone.` : ''}
        confirmText="Delete" cancelText="Cancel" confirmColor="red"
      />
      <Toast message={toastMessage} type={toastType} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default Courses;
