import { useEffect, useState } from 'react';
import Toast from '../components/Toast';

const AssignTeachers = () => {
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedSem, setSelectedSem] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [semCourses, setSemCourses] = useState([]);

  const [assignments, setAssignments] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');

  const [loadingSem, setLoadingSem] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ show: true, msg, type });

  useEffect(() => {
    fetch('/api/departments').then(r => r.json()).then(d => { if (d.success) setDepartments(d.data || []); });
    fetch('/api/admin/batches', { headers: { 'x-user-role': 'admin' } }).then(r => r.json()).then(d => { if (d.success) setBatches(d.data || []); });
    fetch('/api/teacher-courses/teachers').then(r => r.json()).then(d => { if (d.success) setTeachers(d.data || []); });
  }, []);

  const filteredBatches = selectedDept ? batches.filter(b => b.department === selectedDept.name) : [];

  const selectDept = (dept) => {
    setSelectedDept(dept); setSelectedBatch(null); setSelectedSem(null);
    setSelectedCourse(null); setSemesters([]); setSemCourses([]); setAssignments([]);
  };

  const selectBatch = async (batch) => {
    setSelectedBatch(batch); setSelectedSem(null); setSelectedCourse(null);
    setSemCourses([]); setAssignments([]);
    setLoadingSem(true);
    try {
      const res = await fetch(`/api/admin/erp/batches/${batch.id}/overview`, { headers: { 'x-user-role': 'admin' } });
      const d = await res.json();
      if (d.success) setSemesters(d.data.semesters || []);
    } catch (e) { showToast('Failed to load semesters', 'error'); }
    finally { setLoadingSem(false); }
  };

  const selectSem = async (sem) => {
    setSelectedSem(sem); setSelectedCourse(null); setAssignments([]);
    setLoadingCourses(true);
    try {
      const res = await fetch(`/api/admin/erp/batches/${selectedBatch.id}/semesters/${sem.semester_number}/courses`, { headers: { 'x-user-role': 'admin' } });
      const d = await res.json();
      setSemCourses(d.data || []);
    } catch (e) { showToast('Failed to load courses', 'error'); }
    finally { setLoadingCourses(false); }
  };

  const selectCourse = async (course) => {
    setSelectedCourse(course); setSelectedTeacher('');
    await loadAssignments(course);
  };

  const loadAssignments = async (course) => {
    if (!selectedBatch || !selectedSem || !course) return;
    setLoadingAssign(true);
    try {
      const res = await fetch(
        `/api/admin/erp/batches/${selectedBatch.id}/semesters/${selectedSem.semester_number}/teacher-courses`,
        { headers: { 'x-user-role': 'admin' } }
      );
      const d = await res.json();
      const cid = Number(course.course_id || course.id);
      setAssignments((d.data || []).filter(a => Number(a.course_id) === cid));
    } catch (e) { showToast('Failed to load assignments', 'error'); }
    finally { setLoadingAssign(false); }
  };

  const handleAssign = async () => {
    if (!selectedTeacher || !selectedBatch || !selectedSem || !selectedCourse) return;
    setAssigning(true);
    try {
      const courseId = Number(selectedCourse.course_id || selectedCourse.id);
      const res = await fetch(
        `/api/admin/erp/batches/${selectedBatch.id}/semesters/${selectedSem.semester_number}/teacher-courses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
          body: JSON.stringify({ teacherId: Number(selectedTeacher), courseId }),
        }
      );
      const d = await res.json();
      if (d.success) { showToast('Teacher assigned'); setSelectedTeacher(''); await loadAssignments(selectedCourse); }
      else showToast(d.message || 'Failed', 'error');
    } catch (e) { showToast('Network error', 'error'); }
    finally { setAssigning(false); }
  };

  const handleRemove = async (assignId) => {
    try {
      const res = await fetch(
        `/api/admin/erp/batches/${selectedBatch.id}/semesters/${selectedSem.semester_number}/teacher-courses/${assignId}`,
        { method: 'DELETE', headers: { 'x-user-role': 'admin' } }
      );
      const d = await res.json();
      if (d.success) { showToast('Removed'); await loadAssignments(selectedCourse); }
      else showToast(d.message || 'Failed', 'error');
    } catch (e) { showToast('Network error', 'error'); }
  };

  const assignedTeacherIds = assignments.map(a => a.teacher_id);
  const availTeachers = teachers.filter(t => !assignedTeacherIds.includes(t.id));

  const steps = [
    { key: 'dept',   label: 'Department', icon: '🏫', done: !!selectedDept,   value: selectedDept?.name },
    { key: 'batch',  label: 'Batch',      icon: '🎓', done: !!selectedBatch,  value: selectedBatch?.batch_name },
    { key: 'sem',    label: 'Semester',   icon: '📅', done: !!selectedSem,    value: selectedSem?.name },
    { key: 'course', label: 'Course',     icon: '📚', done: !!selectedCourse, value: selectedCourse?.name },
  ];

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Assign Teachers</h1>
        <p className="text-sm text-gray-500 mt-0.5">Select department → batch → semester → course, then assign a teacher</p>
      </div>

      {/* Stepper progress bar */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-4">
        <div className="flex items-center gap-0">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all
                  ${step.done ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                  {step.done ? '✓' : i + 1}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold ${step.done ? 'text-indigo-600' : 'text-gray-400'}`}>{step.label}</p>
                  {step.value && <p className="text-xs text-gray-600 font-medium truncate max-w-[100px]">{step.value}</p>}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all ${step.done ? 'bg-indigo-300' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4-column selector grid — all visible, no scroll */}
      <div className="grid grid-cols-4 gap-4">
        {/* Col 1: Departments */}
        <StepColumn title="Department" icon="🏫">
          {departments.map(d => (
            <StepItem key={d.id} label={d.name} sub={d.code}
              active={selectedDept?.id === d.id} onClick={() => selectDept(d)} />
          ))}
        </StepColumn>

        {/* Col 2: Batches */}
        <StepColumn title="Batch" icon="🎓" locked={!selectedDept} lockMsg="Select a department first">
          {filteredBatches.length === 0 && selectedDept
            ? <p className="text-xs text-gray-400 text-center py-4">No batches in this department</p>
            : filteredBatches.map(b => (
              <StepItem key={b.id} label={b.batch_name} sub={`${b.start_year}–${b.end_year}`}
                active={selectedBatch?.id === b.id} onClick={() => selectBatch(b)} />
            ))}
          {loadingSem && <Spinner />}
        </StepColumn>

        {/* Col 3: Semesters */}
        <StepColumn title="Semester" icon="📅" locked={!selectedBatch} lockMsg="Select a batch first">
          {semesters.map(s => (
            <StepItem key={s.id} label={s.name} sub={s.status}
              active={selectedSem?.id === s.id} onClick={() => selectSem(s)} />
          ))}
          {loadingCourses && <Spinner />}
        </StepColumn>

        {/* Col 4: Courses */}
        <StepColumn title="Course" icon="📚" locked={!selectedSem} lockMsg="Select a semester first">
          {semCourses.length === 0 && selectedSem
            ? <p className="text-xs text-gray-400 text-center py-4">No courses in this semester</p>
            : semCourses.map(c => {
              const cid = Number(c.course_id || c.id);
              const selCid = selectedCourse ? Number(selectedCourse.course_id || selectedCourse.id) : null;
              return (
                <StepItem key={cid} label={c.name} sub={c.code}
                  active={cid === selCid} onClick={() => selectCourse(c)} />
              );
            })}
        </StepColumn>
      </div>

      {/* Assignment panel — only shown when course is selected */}
      {selectedCourse && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-bold text-gray-800">
                Teachers for <span className="text-indigo-600">{selectedCourse.name}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedBatch?.batch_name} · {selectedSem?.name} · {selectedDept?.name}
              </p>
            </div>
            {/* Assign form inline */}
            {availTeachers.length > 0 ? (
              <div className="flex items-center gap-2">
                <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white min-w-[200px]">
                  <option value="">Select a teacher...</option>
                  {availTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.email}</option>
                  ))}
                </select>
                <button onClick={handleAssign} disabled={assigning || !selectedTeacher}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all whitespace-nowrap">
                  {assigning ? 'Assigning...' : '+ Assign'}
                </button>
              </div>
            ) : (
              <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-semibold">
                All teachers assigned
              </span>
            )}
          </div>

          {/* Assigned teachers */}
          {loadingAssign ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-14">
              <div className="text-4xl mb-2">👨‍🏫</div>
              <p className="text-sm text-gray-500 font-medium">No teachers assigned to this course yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                      {(a.teacher_email || 'T').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{a.teacher_email?.split('@')[0]}</p>
                      <p className="text-xs text-gray-400">{a.teacher_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">
                      {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                    <button onClick={() => handleRemove(a.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Toast message={toast.msg} type={toast.type} isVisible={toast.show} onClose={() => setToast(p => ({ ...p, show: false }))} />
    </div>
  );
};

const StepColumn = ({ title, icon, locked, lockMsg, children }) => (
  <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all ${locked ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 shrink-0">
      <span className="text-base">{icon}</span>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{title}</p>
    </div>
    <div className="overflow-y-auto flex-1 max-h-64 divide-y divide-gray-50">
      {locked
        ? <p className="text-xs text-gray-400 text-center py-6 px-3">{lockMsg}</p>
        : children}
    </div>
  </div>
);

const StepItem = ({ label, sub, active, onClick }) => (
  <button onClick={onClick}
    className={`w-full text-left px-4 py-2.5 transition-all flex items-center justify-between group
      ${active ? 'bg-indigo-600' : 'hover:bg-indigo-50'}`}>
    <div className="min-w-0">
      <p className={`text-xs font-semibold truncate ${active ? 'text-white' : 'text-gray-800 group-hover:text-indigo-700'}`}>{label}</p>
      {sub && <p className={`text-xs capitalize ${active ? 'text-indigo-200' : 'text-gray-400'}`}>{sub}</p>}
    </div>
    {active && <span className="text-white text-xs shrink-0 ml-2">✓</span>}
  </button>
);

const Spinner = () => (
  <div className="flex justify-center py-4">
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
  </div>
);

export default AssignTeachers;
