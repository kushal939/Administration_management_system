import { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import StudentAvatar from '../components/StudentAvatar';

const Attendance = () => {
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [allTeacherStudents, setAllTeacherStudents] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('mark');
  const [attendanceData, setAttendanceData] = useState({});
  const [recordFilters, setRecordFilters] = useState({ studentName: '', department: '', course: '', studentId: '', date: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [submittedKeys, setSubmittedKeys] = useState(new Set());
  const [adminPage, setAdminPage] = useState(1);
  const PAGE_SIZE = 20;

  // Teacher semester assignments state
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null); // { batch_id, semester_number, batch_name, courses, students }
  const [selectedTeacherCourse, setSelectedTeacherCourse] = useState(null);

  // Phase 3 — Attendance Intelligence state
  const [lowAttendance, setLowAttendance] = useState([]);
  const [lowAttLoading, setLowAttLoading] = useState(false);
  const [batchReport, setBatchReport] = useState(null);
  const [batchReportLoading, setBatchReportLoading] = useState(false);
  const [reportBatchId, setReportBatchId] = useState('');
  const [reportDept, setReportDept] = useState('');
  const [studentSummary, setStudentSummary] = useState(null);
  const [studentSummaryLoading, setStudentSummaryLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [summaryStudentId, setSummaryStudentId] = useState('');

  // Admin/Principal hierarchy state
  const [batches, setBatches] = useState([]);
  const [expandedDept, setExpandedDept] = useState(null);
  const [selectedAdminBatch, setSelectedAdminBatch] = useState(null);
  const [batchSemData, setBatchSemData] = useState({});
  const [selectedAdminSem, setSelectedAdminSem] = useState(null);
  const [semCoursesData, setSemCoursesData] = useState({});
  const [selectedAdminCourse, setSelectedAdminCourse] = useState(null);
  const [courseAttendance, setCourseAttendance] = useState({ records: [], loading: false });

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || 'null');
      setUser(userData);
      const userRole = userData?.role?.toLowerCase();
      if (userRole === 'admin' || userRole === 'principal') {
        fetchDepartments();
        fetchBatchesForAdmin();
      } else if (userRole === 'student') {
        setActiveTab('records');
        fetchStudentAttendance(userData.email);
        if (userData.studentId) {
          fetchStudentSummary(userData.studentId);
        }
      } else if (userRole === 'teacher' && userData.id) {
        setActiveTab('mark');
        fetchTeacherSemesterAssignments(userData.id);
        fetchRecords({}, userData.id);
      }
    } catch (e) { console.error('Error parsing user data:', e); }
  }, []);

  const fetchBatchesForAdmin = async () => {
    try {
      const res = await fetch('/api/admin/batches', { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      if (data.success) setBatches(data.data || []);
    } catch (e) {}
  };

  const fetchTeacherSemesterAssignments = async (teacherId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/teacher/my-semester-assignments/${teacherId}`);
      const data = await response.json();
      if (data.success) {
        setTeacherAssignments(data.data || []);
        // Auto-select first assignment if only one
        if (data.data && data.data.length === 1) {
          setSelectedAssignment(data.data[0]);
          if (data.data[0].courses.length === 1) {
            setSelectedTeacherCourse(data.data[0].courses[0]);
            const init = {};
            data.data[0].students.forEach(s => { init[s.studentId] = 'present'; });
            setAttendanceData(init);
          }
        }
      }
    } catch (e) { setError('Failed to load your semester assignments'); }
    finally { setIsLoading(false); }
  };

  const fetchTeacherCoursesOnLoad = async (teacherId) => {
    try {
      const response = await fetch(`/api/teacher-courses/${teacherId}/courses`);
      const data = await response.json();
      if (data.success) {
        setCourses(data.data || []);
        if (data.data && data.data.length > 0) fetchAllTeacherStudents(teacherId);
      }
    } catch (e) {}
  };

  const fetchStudentAttendance = async (email) => {
    try {
      setIsLoading(true);
      const studentsRes = await fetch('/api/students');
      const studentsData = await studentsRes.json();
      if (studentsData.success) {
        const student = (studentsData.data || []).find(s => s.email === email);
        if (student) {
          const response = await fetch(`/api/attendance?studentId=${student.studentId}`);
          const data = await response.json();
          if (data.success) setRecords(data.data || []);
        }
      }
    } catch (e) { setError('Failed to load attendance records'); }
    finally { setIsLoading(false); }
  };

  const fetchAllTeacherStudents = async (teacherId) => {
    try {
      const response = await fetch(`/api/teacher/my-students/${teacherId}`);
      const data = await response.json();
      if (data.success) setAllTeacherStudents(data.data || []);
    } catch (e) {}
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      if (data.success) setDepartments(data.data || []);
    } catch (e) {}
  };

  const fetchDepartmentCourses = async (departmentName) => {
    try {
      setIsLoading(true);
      if (user && user.role && user.role.toLowerCase() === 'teacher' && user.id) {
        const response = await fetch(`/api/teacher-courses/${user.id}/courses`);
        const data = await response.json();
        if (data.success) setCourses((data.data || []).filter(c => c.department === departmentName));
      } else {
        const response = await fetch(`/api/departments/${encodeURIComponent(departmentName)}/courses`);
        const data = await response.json();
        if (data.success) setCourses(data.data || []);
      }
    } catch (e) { setError('Failed to load courses'); }
    finally { setIsLoading(false); }
  };

  const fetchEnrolledStudents = async (courseId) => {
    try {
      setIsLoading(true);
      const teacherId = user && user.role && user.role.toLowerCase() === 'teacher' ? user.id : '';
      const url = `/api/attendance/students?courseId=${courseId}${teacherId ? `&teacherId=${teacherId}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setStudents(data.data || []);
        const init = {};
        (data.data || []).forEach(s => { init[s.studentId] = 'present'; });
        setAttendanceData(init);
      } else { setError(data.message || 'Failed to load students'); setStudents([]); }
    } catch (e) { setError('Failed to load enrolled students'); setStudents([]); }
    finally { setIsLoading(false); }
  };

  const fetchRecords = async (filters = {}, teacherId = null) => {
    try {
      const filterObj = { ...filters };
      // always pass teacherId for teachers so records are scoped to their courses
      const tid = teacherId ?? (user?.role?.toLowerCase() === 'teacher' ? user?.id : null);
      if (tid) filterObj.teacherId = tid;
      const query = new URLSearchParams(Object.fromEntries(Object.entries(filterObj).filter(([, v]) => v))).toString();
      const response = await fetch(`/api/attendance${query ? '?' + query : ''}`);
      const data = await response.json();
      if (data.success) setRecords(data.data || []);
    } catch (e) {}
  };

  const fetchLowAttendance = async () => {
    setLowAttLoading(true);
    try {
      const res = await fetch('/api/attendance/low-attendance?threshold=75');
      const data = await res.json();
      if (data.success) setLowAttendance(data.data || []);
    } catch (e) {}
    finally { setLowAttLoading(false); }
  };

  const fetchBatchReport = async () => {
    if (!reportBatchId && !reportDept) return;
    setBatchReportLoading(true);
    try {
      const params = reportBatchId ? `batchId=${reportBatchId}` : `department=${encodeURIComponent(reportDept)}`;
      const res = await fetch(`/api/attendance/batch-report?${params}`);
      const data = await res.json();
      if (data.success) setBatchReport(data.data);
    } catch (e) {}
    finally { setBatchReportLoading(false); }
  };

  const fetchStudentSummary = async (sid) => {
    if (!sid) return;
    setStudentSummaryLoading(true);
    try {
      const [sumRes, monRes] = await Promise.all([
        fetch(`/api/attendance/summary/${sid}`),
        fetch(`/api/attendance/monthly/${sid}`)
      ]);
      const [sumData, monData] = await Promise.all([sumRes.json(), monRes.json()]);
      if (sumData.success) setStudentSummary(sumData.data);
      if (monData.success) setMonthlyData(monData.data);
    } catch (e) {}
    finally { setStudentSummaryLoading(false); }
  };

  const downloadBatchReportCSV = () => {
    if (!batchReport) return;
    const rows = [
      ['Student ID', 'Name', 'Department', 'Total Classes', 'Present', 'Absent', 'Late', 'Attendance %', 'Status'],
      ...batchReport.students.map(s => [
        s.studentId, s.name, s.department, s.total, s.present, s.absent, s.late,
        s.percentage + '%', s.belowThreshold ? 'BELOW 75%' : 'OK'
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${reportBatchId || reportDept}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printBatchReport = () => {
    if (!batchReport) return;
    const w = window.open('', '_blank');
    const rows = batchReport.students.map(s => `
      <tr style="background:${s.belowThreshold ? '#fff5f5' : 'white'}">
        <td>${s.studentId}</td><td>${s.name}</td><td>${s.department || '—'}</td>
        <td>${s.total}</td><td>${s.present}</td><td>${s.absent}</td>
        <td style="font-weight:bold;color:${s.percentage < 75 ? '#dc2626' : s.percentage < 85 ? '#d97706' : '#16a34a'}">${s.percentage}%</td>
        <td>${s.belowThreshold ? '<span style="color:red;font-weight:bold">⚠ Below 75%</span>' : '✓ OK'}</td>
      </tr>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Attendance Report</title>
      <style>body{font-family:Arial,sans-serif;padding:30px}table{width:100%;border-collapse:collapse}
      th{background:#1f2937;color:white;padding:8px;text-align:left;font-size:12px}
      td{padding:7px 8px;border-bottom:1px solid #e5e7eb;font-size:12px}
      h2{margin-bottom:5px}p{color:#666;font-size:13px;margin-bottom:20px}
      @media print{button{display:none}}</style></head><body>
      <h2>Attendance Report</h2>
      <p>Generated: ${new Date().toLocaleDateString()} · ${batchReport.total} students · ${batchReport.belowCount} below 75%</p>
      <button onclick="window.print()" style="margin-bottom:15px;padding:6px 14px;background:#1f2937;color:white;border:none;border-radius:6px;cursor:pointer">Print</button>
      <table><thead><tr><th>Student ID</th><th>Name</th><th>Department</th><th>Total</th><th>Present</th><th>Absent</th><th>%</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const selectAdminBatch = async (batch) => {
    setSelectedAdminBatch(batch);
    setSelectedAdminSem(null);
    setSelectedAdminCourse(null);
    setCourseAttendance({ records: [], loading: false });
    if (!batchSemData[batch.id]) {
      setBatchSemData(prev => ({ ...prev, [batch.id]: { semesters: [], loading: true } }));
      try {
        const res = await fetch(`/api/admin/erp/batches/${batch.id}/overview`, { headers: { 'x-user-role': 'admin' } });
        const data = await res.json();
        setBatchSemData(prev => ({ ...prev, [batch.id]: { semesters: data.success ? (data.data.semesters || []) : [], loading: false } }));
      } catch (e) {
        setBatchSemData(prev => ({ ...prev, [batch.id]: { semesters: [], loading: false } }));
      }
    }
  };

  const selectAdminSem = async (sem) => {
    setSelectedAdminSem(sem);
    setSelectedAdminCourse(null);
    setCourseAttendance({ records: [], loading: false });
    const key = `${selectedAdminBatch.id}-${sem.semester_number}`;
    if (!semCoursesData[key]) {
      setSemCoursesData(prev => ({ ...prev, [key]: { courses: [], loading: true } }));
      try {
        const res = await fetch(`/api/admin/erp/batches/${selectedAdminBatch.id}/semesters/${sem.semester_number}/courses`, { headers: { 'x-user-role': 'admin' } });
        const data = await res.json();
        let courseList = data.data || [];
        if (courseList.length === 0) {
          const attRes = await fetch(`/api/attendance?batchId=${selectedAdminBatch.id}`);
          const attData = await attRes.json();
          if (attData.success && attData.data?.length > 0) {
            courseList = [...new Map((attData.data || []).map(r => [r.course, { name: r.course, code: r.course, course_id: r.course }])).values()];
          }
        }
        setSemCoursesData(prev => ({ ...prev, [key]: { courses: courseList, loading: false } }));
      } catch (e) {
        setSemCoursesData(prev => ({ ...prev, [key]: { courses: [], loading: false } }));
      }
    }
  };

  const selectAdminCourse = async (course) => {
    setSelectedAdminCourse(course);
    setAdminPage(1);
    setSelectedRecords([]);
    setSelectAll(false);
    setCourseAttendance({ records: [], loading: true });
    try {
      const params = new URLSearchParams();
      if (!course._all) params.set('course', course.name);
      if (selectedAdminBatch?.id) params.set('batchId', selectedAdminBatch.id);
      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();
      setCourseAttendance({ records: data.success ? (data.data || []) : [], loading: false });
    } catch (e) {
      setCourseAttendance({ records: [], loading: false });
    }
  };

  useEffect(() => {
    if (selectedDepartment) fetchDepartmentCourses(selectedDepartment);
    else { setCourses([]); setSelectedCourse(null); setStudents([]); }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedCourse) fetchEnrolledStudents(selectedCourse.id);
    else { setStudents([]); setAttendanceData({}); }
  }, [selectedCourse]);

  const handleDepartmentChange = (e) => { setSelectedDepartment(e.target.value); setSelectedCourse(null); setStudents([]); setAttendanceData({}); setError(''); setSuccess(''); };
  const handleCourseChange = (e) => { const course = courses.find(c => c.id === Number(e.target.value)); setSelectedCourse(course); setError(''); setSuccess(''); };
  const handleAttendanceChange = (studentId, status) => setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  const handleMarkAll = (status) => { const n = {}; students.forEach(s => { n[s.studentId] = status; }); setAttendanceData(n); };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!selectedCourse) { setError('Please select a course'); return; }
    if (students.length === 0) { setError('No students enrolled in this course'); return; }
    try {
      setIsSubmitting(true);
      const promises = students.map(student =>
        fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: student.studentId, course: selectedCourse.name, date: selectedDate, status: attendanceData[student.studentId] || 'present', teacherId: user?.id, courseId: selectedCourse.id }),
        })
      );
      const responses = await Promise.all(promises);
      if (responses.every(r => r.ok)) {
        setSuccess(`Attendance marked for ${students.length} students!`);
        fetchRecords();
        const key = `${selectedCourse.id}_${selectedDate}`;
        setSubmittedKeys(prev => new Set([...prev, key]));
        const reset = {}; students.forEach(s => { reset[s.studentId] = 'present'; }); setAttendanceData(reset);
      } else { setError('Some attendance records failed to save'); }
    } catch (e) { setError('Network error. Please check your connection.'); }
    finally { setIsSubmitting(false); }
  };

  const handleStatusUpdate = async (recordId, newStatus) => {
    try {
      const res = await fetch(`/api/attendance/${recordId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      const data = await res.json();
      if (data.success) {
        setSuccess('Updated!');
        if (selectedAdminCourse) selectAdminCourse(selectedAdminCourse);
        else fetchRecords(recordFilters);
      } else setError(data.message || 'Failed to update');
    } catch (e) { setError('Network error'); }
  };

  const handleFilterApply = () => { setAdminPage(1); fetchRecords(recordFilters, user?.role?.toLowerCase() === 'teacher' ? user?.id : null); };
  const handleDeleteRecord = (recordId) => { setDeleteRecordId(recordId); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    if (!deleteRecordId) return;
    try {
      const response = await fetch(`/api/attendance/${deleteRecordId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setToastMessage('Record deleted!'); setToastType('success'); setShowToast(true);
        if (selectedAdminCourse) selectAdminCourse(selectedAdminCourse);
        else fetchRecords(recordFilters);
      } else setError(data.message || 'Failed to delete record');
    } catch (e) { setError('Failed to delete record'); }
    finally { setDeleteRecordId(null); }
  };

  const handleSelectAll = () => {
    const recs = selectedAdminCourse ? courseAttendance.records : records;
    if (selectAll) { setSelectedRecords([]); setSelectAll(false); }
    else { setSelectedRecords(recs.map(r => r.id)); setSelectAll(true); }
  };

  const handleSelectOne = (recordId) => {
    const recs = selectedAdminCourse ? courseAttendance.records : records;
    if (selectedRecords.includes(recordId)) { setSelectedRecords(selectedRecords.filter(id => id !== recordId)); setSelectAll(false); }
    else { const n = [...selectedRecords, recordId]; setSelectedRecords(n); if (n.length === recs.length) setSelectAll(true); }
  };

  const handleBulkDelete = () => { if (selectedRecords.length === 0) { setError('No records selected'); return; } setShowBulkDeleteModal(true); };

  const confirmBulkDelete = async () => {
    try {
      const response = await fetch('/api/attendance/bulk', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedRecords }) });
      const data = await response.json();
      if (data.success) {
        setToastMessage(`Deleted ${data.deletedCount} record(s)!`); setToastType('success'); setShowToast(true);
        setSelectedRecords([]); setSelectAll(false);
        if (selectedAdminCourse) selectAdminCourse(selectedAdminCourse);
        else fetchRecords(recordFilters);
      } else setError(data.message || 'Failed to delete records');
    } catch (e) { setError('Failed to delete records'); }
  };

  useEffect(() => {
    if (error || success) { const t = setTimeout(() => { setError(''); setSuccess(''); }, 3000); return () => clearTimeout(t); }
  }, [error, success]);

  const statusOptions = ['present', 'absent', 'late', 'excused'];
  const statusColors = { present: 'bg-emerald-100 text-emerald-700', absent: 'bg-red-100 text-red-700', late: 'bg-amber-100 text-amber-700', excused: 'bg-blue-100 text-blue-700' };
  const statusDot = { present: 'bg-emerald-500', absent: 'bg-red-500', late: 'bg-amber-500', excused: 'bg-blue-500' };

  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = userRole === 'admin';
  const isPrincipal = userRole === 'principal';
  const isStudent = userRole === 'student';

  // Dept card color palette
  const deptPalette = [
    { bg: 'bg-violet-500', light: 'bg-violet-50', ring: 'ring-violet-200', text: 'text-violet-700' },
    { bg: 'bg-blue-500',   light: 'bg-blue-50',   ring: 'ring-blue-200',   text: 'text-blue-700' },
    { bg: 'bg-emerald-500',light: 'bg-emerald-50', ring: 'ring-emerald-200',text: 'text-emerald-700' },
    { bg: 'bg-rose-500',   light: 'bg-rose-50',    ring: 'ring-rose-200',   text: 'text-rose-700' },
    { bg: 'bg-amber-500',  light: 'bg-amber-50',   ring: 'ring-amber-200',  text: 'text-amber-700' },
    { bg: 'bg-cyan-500',   light: 'bg-cyan-50',    ring: 'ring-cyan-200',   text: 'text-cyan-700' },
    { bg: 'bg-pink-500',   light: 'bg-pink-50',    ring: 'ring-pink-200',   text: 'text-pink-700' },
    { bg: 'bg-indigo-500', light: 'bg-indigo-50',  ring: 'ring-indigo-200', text: 'text-indigo-700' },
  ];

  const statusConfig = {
    active:    { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', label: 'Active' },
    completed: { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',          label: 'Completed' },
    upcoming:  { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',       label: 'Upcoming' },
    archived:  { dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',         label: 'Archived' },
  };

  const sd = selectedAdminBatch ? batchSemData[selectedAdminBatch.id] : null;
  const semKey = selectedAdminBatch && selectedAdminSem ? `${selectedAdminBatch.id}-${selectedAdminSem.semester_number}` : null;
  const currentSemCourses = semKey ? semCoursesData[semKey] : null;

  const attRecords = courseAttendance.records;
  const attTotalPages = Math.ceil(attRecords.length / PAGE_SIZE);
  const attPageRecords = attRecords.slice((adminPage - 1) * PAGE_SIZE, adminPage * PAGE_SIZE);

  const PaginationBar = ({ page, totalPages, setPage }) => {
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
      .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc; }, []);
    return (
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 font-medium text-gray-600">← Prev</button>
        {pages.map((p, i) => p === '...' ? <span key={i} className="px-2 text-xs text-gray-400">…</span> : (
          <button key={p} onClick={() => setPage(p)}
            className={`w-8 h-8 text-xs rounded-lg border font-semibold transition-all ${page === p ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'}`}>{p}</button>
        ))}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 font-medium text-gray-600">Next →</button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isAdmin || isPrincipal ? 'Attendance' : isStudent ? 'My Attendance' : 'Attendance'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin || isPrincipal ? 'Browse records by department → batch → semester → course'
              : isStudent ? 'Track your attendance across all courses'
              : 'Mark and manage student attendance'}
          </p>
        </div>
        {(isAdmin || isPrincipal) && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-gray-600">{departments.length} Departments</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs font-semibold text-gray-600">{batches.length} Batches</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm shadow-sm">
          <span className="text-base">⚠️</span> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm shadow-sm">
          <span className="text-base">✓</span> {success}
        </div>
      )}

      {/* ══════════════════════════════════════════
          ADMIN / PRINCIPAL VIEW
      ══════════════════════════════════════════ */}
      {(isAdmin || isPrincipal) && (
        <>
          {departments.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
              <div className="text-5xl mb-3">🏫</div>
              <p className="text-gray-400 font-medium">No departments found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
              {departments.map((dept, idx) => {
                const palette = deptPalette[idx % deptPalette.length];
                const deptBatches = batches.filter(b => b.department === dept.name);
                const activeBatches = deptBatches.filter(b => b.status === 'active').length;
                const isOpen = expandedDept === dept.id;
                return (
                  <div key={dept.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    {/* Card header */}
                    <div
                      onClick={() => setExpandedDept(isOpen ? null : dept.id)}
                      className="p-5 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 ${palette.bg} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0`}>
                          {(dept.code || dept.name?.charAt(0) || '?').slice(0, 4)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{dept.name}</h3>
                          <p className="text-xs text-gray-400">{deptBatches.length} batches total</p>
                        </div>
                      </div>
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${palette.light} ${palette.text} ring-1 ${palette.ring}`}>
                        {activeBatches} active
                      </span>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400">View batches</span>
                        <span className={`text-xs font-bold transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} inline-block text-gray-400`}>▼</span>
                      </div>
                    </div>

                    {/* Expanded batch list */}
                    {isOpen && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                        {deptBatches.length === 0 ? (
                          <p className="text-xs text-gray-400 py-2 text-center">No batches</p>
                        ) : (
                          <div className="space-y-2">
                            {deptBatches.map(batch => {
                              const sc = statusConfig[batch.status] || statusConfig.archived;
                              return (
                                <div key={batch.id}
                                  onClick={e => { e.stopPropagation(); selectAdminBatch(batch); }}
                                  className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-3 py-2.5 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all group">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-indigo-700">{batch.batch_name}</p>
                                      <p className="text-xs text-gray-400">{batch.start_year}–{batch.end_year}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.badge}`}>{sc.label}</span>
                                    <span className="text-gray-300 group-hover:text-indigo-400 text-xs">→</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── HOW IT WORKS GUIDE ── */}
          {!selectedAdminBatch && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">How to view attendance</h3>
                <p className="text-xs text-gray-400 mt-0.5">Follow these steps to drill into any course's records</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {[
                  { step: '01', icon: '🏫', title: 'Pick a Department', desc: 'Click any department card above to expand its batches.' },
                  { step: '02', icon: '📦', title: 'Select a Batch', desc: 'Choose a batch from the expanded list to open the detail drawer.' },
                  { step: '03', icon: '📅', title: 'Choose a Semester', desc: 'Select the semester from the left panel inside the drawer.' },
                  { step: '04', icon: '📋', title: 'View Course Records', desc: 'Pick a course to see all attendance records with stats.' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-4 px-6 py-5">
                    <div className="shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">{s.icon}</div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-400 mb-0.5">Step {s.step}</p>
                      <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SLIDE-IN DRAWER ── */}
          {selectedAdminBatch && (
            <div className="fixed inset-0 z-50 flex">
              <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => { setSelectedAdminBatch(null); setSelectedAdminSem(null); setSelectedAdminCourse(null); }} />
              <div className="w-full max-w-5xl bg-white shadow-2xl flex flex-col h-full">

                {/* Drawer header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow">
                      {selectedAdminBatch.batch_name?.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">{selectedAdminBatch.batch_name}</h2>
                      <p className="text-xs text-gray-500">{selectedAdminBatch.department} · {selectedAdminBatch.start_year}–{selectedAdminBatch.end_year}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedAdminBatch(null); setSelectedAdminSem(null); setSelectedAdminCourse(null); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-lg font-light">✕</button>
                </div>

                <div className="flex flex-1 overflow-hidden">

                  {/* Semester column */}
                  <div className="w-48 shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/80">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Semesters</p>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2">
                      {!sd || sd.loading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
                        </div>
                      ) : sd.semesters.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8 px-3">No semesters found</p>
                      ) : sd.semesters.map(sem => {
                        const semSc = statusConfig[sem.status] || statusConfig.archived;
                        const isActive = selectedAdminSem?.id === sem.id;
                        return (
                          <button key={sem.id} onClick={() => selectAdminSem(sem)}
                            className={`w-full text-left px-3 py-3 mx-2 mb-1 rounded-xl transition-all ${isActive ? 'bg-indigo-600 shadow-sm' : 'hover:bg-white hover:shadow-sm'}`}
                            style={{ width: 'calc(100% - 16px)' }}>
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-700 shadow-sm border border-gray-200'}`}>
                                S{sem.semester_number}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-gray-700'}`}>{sem.name || `Semester ${sem.semester_number}`}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${semSc.dot}`} />
                                  <span className={`text-xs ${isActive ? 'text-indigo-200' : 'text-gray-400'}`}>{semSc.label}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Course column */}
                  <div className="w-56 shrink-0 border-r border-gray-100 flex flex-col bg-white">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Courses</p>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2">
                      {!selectedAdminSem ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl mb-2">📚</div>
                          <p className="text-xs text-gray-400">Select a semester first</p>
                        </div>
                      ) : !currentSemCourses || currentSemCourses.loading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
                        </div>
                      ) : (
                        <>
                          <button onClick={() => selectAdminCourse({ name: '__ALL__', code: 'ALL', _all: true })}
                            className={`w-full text-left px-3 py-3 mx-2 mb-1 rounded-xl transition-all ${selectedAdminCourse?._all ? 'bg-indigo-600 shadow-sm' : 'hover:bg-gray-50'}`}
                            style={{ width: 'calc(100% - 16px)' }}>
                            <p className={`text-xs font-bold font-mono ${selectedAdminCourse?._all ? 'text-indigo-200' : 'text-gray-400'}`}>ALL</p>
                            <p className={`text-xs font-semibold mt-0.5 ${selectedAdminCourse?._all ? 'text-white' : 'text-gray-700'}`}>All Courses</p>
                          </button>
                          {currentSemCourses.courses.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4 px-3">No courses found</p>
                          ) : currentSemCourses.courses.map(c => {
                            const isActive = !selectedAdminCourse?._all && (selectedAdminCourse?.course_id === c.course_id || selectedAdminCourse?.name === c.name);
                            return (
                              <button key={c.course_id || c.name} onClick={() => selectAdminCourse(c)}
                                className={`w-full text-left px-3 py-3 mx-2 mb-1 rounded-xl transition-all ${isActive ? 'bg-indigo-600 shadow-sm' : 'hover:bg-gray-50'}`}
                                style={{ width: 'calc(100% - 16px)' }}>
                                <p className={`text-xs font-bold font-mono ${isActive ? 'text-indigo-200' : 'text-gray-400'}`}>{c.code}</p>
                                <p className={`text-xs font-semibold mt-0.5 leading-tight ${isActive ? 'text-white' : 'text-gray-700'}`}>{c.name}</p>
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Records panel */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/40">
                    {!selectedAdminCourse ? (
                      <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <div className="w-16 h-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm">📋</div>
                        <p className="text-sm font-semibold text-gray-700">Select a course</p>
                        <p className="text-xs text-gray-400 mt-1">Choose a course from the left to view attendance records</p>
                      </div>
                    ) : (
                      <>
                        {/* Records header */}
                        <div className="px-5 py-4 border-b border-gray-100 bg-white shrink-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-gray-900">{selectedAdminCourse._all ? 'All Courses' : selectedAdminCourse.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{selectedAdminCourse._all ? `All records · ${selectedAdminBatch?.batch_name}` : `${selectedAdminCourse.code} · ${selectedAdminSem?.name}`}</p>
                            </div>
                            {isAdmin && selectedRecords.length > 0 && (
                              <button onClick={handleBulkDelete}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 font-semibold shadow-sm">
                                🗑 Delete ({selectedRecords.length})
                              </button>
                            )}
                          </div>
                          {attRecords.length > 0 && (
                            <div className="flex gap-4 mt-3">
                              {[
                                { label: 'Present', val: attRecords.filter(r => r.status === 'present').length, color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
                                { label: 'Absent',  val: attRecords.filter(r => r.status === 'absent').length,  color: 'text-red-600',     bg: 'bg-red-50',     dot: 'bg-red-500' },
                                { label: 'Late',    val: attRecords.filter(r => r.status === 'late').length,    color: 'text-amber-600',   bg: 'bg-amber-50',   dot: 'bg-amber-500' },
                                { label: 'Total',   val: attRecords.length,                                     color: 'text-gray-700',    bg: 'bg-gray-100',   dot: 'bg-gray-400' },
                              ].map(s => (
                                <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.bg}`}>
                                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                                  <span className={`text-xs font-bold ${s.color}`}>{s.val}</span>
                                  <span className="text-xs text-gray-400">{s.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Records table */}
                        <div className="flex-1 overflow-y-auto p-4">
                          {courseAttendance.loading ? (
                            <div className="flex items-center justify-center py-16">
                              <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent" />
                            </div>
                          ) : attRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <div className="text-4xl mb-3">📭</div>
                              <p className="text-sm font-medium text-gray-500">No attendance records</p>
                              <p className="text-xs text-gray-400 mt-1">No records found for this course</p>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs text-gray-400">
                                  {attRecords.length > PAGE_SIZE
                                    ? `Showing ${(adminPage - 1) * PAGE_SIZE + 1}–${Math.min(adminPage * PAGE_SIZE, attRecords.length)} of ${attRecords.length} records`
                                    : `${attRecords.length} records`}
                                </p>
                                <PaginationBar page={adminPage} totalPages={attTotalPages} setPage={setAdminPage} />
                              </div>
                              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="min-w-full divide-y divide-gray-100">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      {isAdmin && <th className="px-4 py-3 text-left"><input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="w-4 h-4 rounded border-gray-300 text-indigo-600 cursor-pointer" /></th>}
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                                      {selectedAdminCourse?._all && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>}
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                      {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {attPageRecords.map((record) => (
                                      <tr key={record.id} className="hover:bg-gray-50/80 transition-colors">
                                        {isAdmin && <td className="px-4 py-3"><input type="checkbox" checked={selectedRecords.includes(record.id)} onChange={() => handleSelectOne(record.id)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 cursor-pointer" /></td>}
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2.5">
                                            <StudentAvatar studentId={record.studentId} name={record.studentName || record.studentId} size={7} />
                                            <div>
                                              <p className="text-xs font-semibold text-gray-900">{record.studentName || record.studentId}</p>
                                              <p className="text-xs text-gray-400">{record.studentId}</p>
                                            </div>
                                          </div>
                                        </td>
                                        {selectedAdminCourse?._all && <td className="px-4 py-3 text-xs text-gray-600 font-medium">{record.course}</td>}
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                                        <td className="px-4 py-3">
                                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-semibold ${statusColors[record.status]}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[record.status]}`} />
                                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                          </span>
                                        </td>
                                        {isAdmin && (
                                          <td className="px-4 py-3">
                                            <button onClick={() => handleDeleteRecord(record.id)}
                                              className="px-2.5 py-1 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 font-semibold border border-red-200 transition-colors">Delete</button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </>
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

      {/* ══════════════════════════════════════════
          STUDENT VIEW
      ══════════════════════════════════════════ */}
      {isStudent && (
        <>
          {records.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Classes', value: records.length, icon: '📅', color: 'text-gray-900', bg: 'bg-white', border: 'border-gray-200' },
                { label: 'Present', value: records.filter(r => r.status === 'present').length, icon: '✅', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                { label: 'Absent', value: records.filter(r => r.status === 'absent').length, icon: '❌', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
                { label: 'Attendance Rate', value: `${records.length > 0 ? ((records.filter(r => r.status === 'present').length / records.length) * 100).toFixed(1) : 0}%`, icon: '📊', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5 shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
                    <span className="text-lg">{s.icon}</span>
                  </div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Below 75% alert for student */}
          {studentSummary && studentSummary.overall.percentage < 75 && studentSummary.overall.total > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl mt-0.5">⚠</span>
              <div>
                <p className="font-bold text-red-700">Attendance shortage warning</p>
                <p className="text-sm text-red-600 mt-0.5">Your attendance is {studentSummary.overall.percentage}% — below the required 75%. Please contact your department.</p>
              </div>
            </div>
          )}

          {/* Monthly breakdown for student */}
          {monthlyData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Monthly Attendance</h3>
              <div className="space-y-3">
                {monthlyData.map(m => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 shrink-0 font-medium">{m.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div className={`h-3 rounded-full transition-all ${m.percentage < 75 ? 'bg-red-500' : m.percentage < 85 ? 'bg-amber-400' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(m.percentage, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-12 text-right ${m.percentage < 75 ? 'text-red-600' : m.percentage < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                      {m.percentage}%
                    </span>
                    <span className="text-xs text-gray-400 w-20 text-right">{m.present}/{m.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Course-wise breakdown for student */}
          {studentSummary && studentSummary.perCourse.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Course-wise Attendance</h3>
              <div className="space-y-3">
                {studentSummary.perCourse.map(c => (
                  <div key={c.course} className="flex items-center gap-3">
                    <span className="text-xs text-gray-700 font-medium w-44 truncate shrink-0">{c.course}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div className={`h-3 rounded-full ${c.percentage < 75 ? 'bg-red-500' : c.percentage < 85 ? 'bg-amber-400' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(c.percentage, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-12 text-right ${c.percentage < 75 ? 'text-red-600' : c.percentage < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                      {c.percentage}%
                    </span>
                    <span className="text-xs text-gray-400 w-20 text-right">{c.present}/{c.total}</span>
                    {c.percentage < 75 && <span className="text-xs text-red-500 font-bold">⚠</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Attendance History</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">{records.length} records</span>
            </div>
            <div className="p-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent" />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-14">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm text-gray-500 font-medium">No attendance records yet</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recorded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {records.map(record => (
                        <tr key={record.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{record.course}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-semibold ${statusColors[record.status]}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDot[record.status]}`} />
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{new Date(record.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          ADMIN REPORTS PANEL
      ══════════════════════════════════════════ */}
      {(isAdmin || isPrincipal) && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 cursor-pointer select-none"
            onClick={() => { if (!lowAttendance.length) fetchLowAttendance(); }}>
            <div>
              <h2 className="text-sm font-bold text-gray-900">📊 Attendance Intelligence Reports</h2>
              <p className="text-xs text-gray-400 mt-0.5">Below-75% alerts · Batch reports · Per-student summary</p>
            </div>
            <button onClick={e => { e.stopPropagation(); fetchLowAttendance(); }} disabled={lowAttLoading}
              className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700 font-medium disabled:opacity-50">
              {lowAttLoading ? 'Loading...' : '↻ Refresh Alerts'}
            </button>
          </div>

          <div className="p-6 space-y-6">

            {/* Below 75% Alert */}
            <div>
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">⚠ Students Below 75% Attendance</h3>
              {lowAttLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-800 border-t-transparent" />
                </div>
              ) : lowAttendance.length === 0 ? (
                <div className="text-center py-8 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-2xl mb-1">✓</p>
                  <p className="text-sm font-medium text-green-700">All students are above 75%</p>
                  <p className="text-xs text-green-500 mt-1">Click "Refresh Alerts" to check</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-900 text-white">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide">Student</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide">Department</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide">Total</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide">Present</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lowAttendance.map(s => (
                        <tr key={s.studentId} className="hover:bg-red-50/40 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <StudentAvatar studentId={s.studentId} name={s.name} size={7} />
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                                <p className="text-xs text-gray-400 font-mono">{s.studentId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600">{s.department || '—'}</td>
                          <td className="px-5 py-3 text-sm text-gray-600">{s.total}</td>
                          <td className="px-5 py-3 text-sm text-gray-600">{s.present}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-24">
                                <div className="h-2 rounded-full bg-red-500" style={{ width: `${s.percentage}%` }} />
                              </div>
                              <span className="text-sm font-bold text-red-600">{s.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Batch Report */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">📋 Batch / Department Report</h3>
              <div className="flex flex-wrap gap-3 items-end mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Department</label>
                  <select value={reportDept} onChange={e => { setReportDept(e.target.value); setReportBatchId(''); setBatchReport(null); }}
                    className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm min-w-44">
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Or Batch</label>
                  <select value={reportBatchId} onChange={e => { setReportBatchId(e.target.value); setReportDept(''); setBatchReport(null); }}
                    className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm min-w-44">
                    <option value="">Select batch</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.department})</option>)}
                  </select>
                </div>
                <button onClick={fetchBatchReport} disabled={batchReportLoading || (!reportBatchId && !reportDept)}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 font-semibold disabled:opacity-50 transition-all">
                  {batchReportLoading ? 'Loading...' : 'Generate'}
                </button>
                {batchReport && (
                  <>
                    <button onClick={downloadBatchReportCSV}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 font-semibold transition-all">
                      ↓ CSV
                    </button>
                    <button onClick={printBatchReport}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold transition-all">
                      🖨 Print
                    </button>
                  </>
                )}
              </div>

              {batchReport && (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900">{batchReport.total}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Below 75%</p>
                      <p className="text-2xl font-bold text-red-600">{batchReport.belowCount}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">Above 75%</p>
                      <p className="text-2xl font-bold text-green-600">{batchReport.total - batchReport.belowCount}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Student</th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Dept</th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Present</th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Absent</th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {batchReport.students.map(s => (
                          <tr key={s.studentId} className={`hover:bg-gray-50 transition-colors ${s.belowThreshold ? 'bg-red-50/40' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <StudentAvatar studentId={s.studentId} name={s.name} size={7} />
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                                  <p className="text-xs text-gray-400 font-mono">{s.studentId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{s.department || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{s.total}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{s.present}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{s.absent}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-20">
                                  <div className={`h-2 rounded-full ${s.percentage < 75 ? 'bg-red-500' : s.percentage < 85 ? 'bg-amber-400' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(s.percentage, 100)}%` }} />
                                </div>
                                <span className={`text-sm font-bold ${s.percentage < 75 ? 'text-red-600' : s.percentage < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                                  {s.percentage}%
                                </span>
                                {s.belowThreshold && <span className="text-xs text-red-500 font-semibold">⚠</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Per-student summary */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">👤 Per-Student Summary</h3>
              <div className="flex gap-3 items-end mb-4">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Student ID</label>
                  <input type="text" value={summaryStudentId} onChange={e => setSummaryStudentId(e.target.value)}
                    placeholder="e.g. STUCS24001"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm" />
                </div>
                <button onClick={() => fetchStudentSummary(summaryStudentId)} disabled={studentSummaryLoading || !summaryStudentId}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 font-semibold disabled:opacity-50 transition-all">
                  {studentSummaryLoading ? 'Loading...' : 'View Summary'}
                </button>
              </div>

              {studentSummary && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Classes', val: studentSummary.overall.total, color: 'text-gray-900' },
                      { label: 'Present', val: studentSummary.overall.present, color: 'text-green-600' },
                      { label: 'Absent', val: studentSummary.overall.absent, color: 'text-red-600' },
                      { label: 'Overall %', val: studentSummary.overall.percentage + '%', color: studentSummary.overall.percentage < 75 ? 'text-red-600' : 'text-green-600' },
                    ].map(c => (
                      <div key={c.label} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{c.label}</p>
                        <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
                      </div>
                    ))}
                  </div>

                  {studentSummary.overall.percentage < 75 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-red-500">⚠</span>
                      <p className="text-sm font-semibold text-red-700">Attendance below 75% — at risk of shortage</p>
                    </div>
                  )}

                  {monthlyData.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Monthly Breakdown</p>
                      <div className="space-y-2">
                        {monthlyData.map(m => (
                          <div key={m.month} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-16 shrink-0">{m.month}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-3">
                              <div className={`h-3 rounded-full transition-all ${m.percentage < 75 ? 'bg-red-500' : m.percentage < 85 ? 'bg-amber-400' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(m.percentage, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-bold w-12 text-right ${m.percentage < 75 ? 'text-red-600' : m.percentage < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                              {m.percentage}%
                            </span>
                            <span className="text-xs text-gray-400 w-20 text-right">{m.present}/{m.total} classes</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {studentSummary.perCourse.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Course-wise Breakdown</p>
                      <div className="space-y-2">
                        {studentSummary.perCourse.map(c => (
                          <div key={c.course} className="flex items-center gap-3">
                            <span className="text-xs text-gray-700 font-medium w-44 truncate shrink-0">{c.course}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-3">
                              <div className={`h-3 rounded-full ${c.percentage < 75 ? 'bg-red-500' : c.percentage < 85 ? 'bg-amber-400' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(c.percentage, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-bold w-12 text-right ${c.percentage < 75 ? 'text-red-600' : c.percentage < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                              {c.percentage}%
                            </span>
                            <span className="text-xs text-gray-400 w-20 text-right">{c.present}/{c.total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TEACHER VIEW
      ══════════════════════════════════════════ */}
      {!isAdmin && !isPrincipal && !isStudent && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'My Courses', value: courses.length, icon: '📚', sub: 'Assigned to me' },
              { label: 'My Students', value: allTeacherStudents.length, icon: '👥', sub: 'Across all courses' },
              { label: "Today's Records", value: records.filter(r => r.date === new Date().toISOString().split('T')[0]).length, icon: '📅', sub: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
              { label: 'Total Records', value: records.length, icon: '📊', sub: 'All time' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{s.label}</p>
                  <span className="text-lg">{s.icon}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-2 pt-1">
              {[{ key: 'mark', label: '✏️ Mark Attendance' }, { key: 'records', label: '📋 Records' }, { key: 'reports', label: '📊 Reports' }].map(tab => (
                <button key={tab.key} onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key === 'reports') fetchLowAttendance();
                }}
                  className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === tab.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'mark' && (
                <div>
                  {/* Semester/Batch selector */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-100">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Batch / Semester</label>
                      <select
                        value={selectedAssignment ? `${selectedAssignment.batch_id}_${selectedAssignment.semester_number}` : ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (!val) { setSelectedAssignment(null); setSelectedTeacherCourse(null); setStudents([]); setAttendanceData({}); return; }
                          const [bid, sem] = val.split('_');
                          const asgn = teacherAssignments.find(a => a.batch_id === Number(bid) && a.semester_number === Number(sem));
                          setSelectedAssignment(asgn || null);
                          setSelectedTeacherCourse(null);
                          setStudents(asgn ? asgn.students : []);
                          const init = {};
                          (asgn?.students || []).forEach(s => { init[s.studentId] = 'present'; });
                          setAttendanceData(init);
                        }}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm">
                        <option value="">Select batch / semester</option>
                        {teacherAssignments.map(a => (
                          <option key={`${a.batch_id}_${a.semester_number}`} value={`${a.batch_id}_${a.semester_number}`}>
                            {a.batch_name} — Semester {a.semester_number}
                          </option>
                        ))}
                      </select>
                      {teacherAssignments.length === 0 && !isLoading && (
                        <p className="text-xs text-amber-600 mt-1">No semester assignments found. Ask admin to assign you.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Course</label>
                      <select
                        value={selectedTeacherCourse?.id || ''}
                        onChange={e => {
                          const course = (selectedAssignment?.courses || []).find(c => c.id === Number(e.target.value));
                          setSelectedTeacherCourse(course || null);
                        }}
                        disabled={!selectedAssignment || (selectedAssignment?.courses || []).length === 0}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm disabled:opacity-50 disabled:bg-gray-50">
                        <option value="">Select course</option>
                        {(selectedAssignment?.courses || []).map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                        ))}
                      </select>
                      {selectedAssignment && (selectedAssignment?.courses || []).length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">No courses assigned to this semester yet.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
                      <div className="flex gap-2">
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                          className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm" />
                        <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                          className="px-3 py-2.5 bg-gray-100 text-gray-600 text-xs rounded-xl hover:bg-gray-200 border border-gray-200 font-semibold whitespace-nowrap">Today</button>
                      </div>
                    </div>
                  </div>

                  {selectedTeacherCourse && selectedAssignment && (
                    <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm">{selectedTeacherCourse.code?.slice(0,2) || 'C'}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{selectedTeacherCourse.name}</p>
                        <p className="text-xs text-indigo-600">{selectedTeacherCourse.code} · {selectedAssignment.batch_name} · Sem {selectedAssignment.semester_number} · {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                      </div>
                      <span className="text-xs text-indigo-600 bg-white border border-indigo-200 px-2.5 py-1 rounded-full font-semibold">{(selectedAssignment?.students || []).length} students</span>
                    </div>
                  )}

                  {!selectedTeacherCourse ? (
                    <div className="text-center py-16 text-gray-400">
                      <div className="text-4xl mb-3">📋</div>
                      <p className="text-sm font-medium">Select a batch/semester and course above</p>
                    </div>
                  ) : (() => {
                    const batchStudents = selectedAssignment?.students || [];
                    const submittedKey = `${selectedTeacherCourse.id}_${selectedDate}`;
                    const alreadySubmitted = submittedKeys.has(submittedKey);
                    return alreadySubmitted ? (
                      <div className="text-center py-12 border border-emerald-200 rounded-2xl bg-emerald-50">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600 text-xl">✓</div>
                        <p className="text-sm font-semibold text-gray-800">Attendance submitted</p>
                        <p className="text-xs text-gray-500 mt-1">{selectedTeacherCourse.name} · {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                        <button onClick={() => { const k = `${selectedTeacherCourse.id}_${selectedDate}`; setSubmittedKeys(prev => { const s = new Set(prev); s.delete(k); return s; }); }}
                          className="mt-4 px-4 py-2 text-xs border border-gray-300 rounded-xl text-gray-600 hover:bg-white font-medium">Edit / Re-submit</button>
                      </div>
                    ) : batchStudents.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 text-sm border border-gray-200 rounded-2xl">No students found in this batch. Ask admin to assign students to the batch.</div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs text-gray-500 font-medium">{batchStudents.length} students in batch</span>
                          <div className="flex gap-2">
                            <button onClick={() => handleMarkAll('present')} className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 border border-emerald-200 font-semibold">All Present</button>
                            <button onClick={() => handleMarkAll('absent')} className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 font-semibold">All Absent</button>
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="grid grid-cols-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <span className="col-span-2">Student</span><span className="text-right pr-2">Email</span><span className="text-right">Status</span>
                          </div>
                          {batchStudents.map((student, index) => (
                            <div key={student.id} className={`flex items-center px-4 py-3 gap-3 ${index !== batchStudents.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50/80 transition-colors`}>
                              <StudentAvatar studentId={student.studentId} name={student.name} size={8} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{student.name}</p>
                                <p className="text-xs text-gray-400">{student.studentId}</p>
                              </div>
                              <div className="hidden md:block flex-1 min-w-0">
                                <p className="text-xs text-gray-400 truncate">{student.email}</p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {statusOptions.map(s => (
                                  <button key={s} onClick={() => handleAttendanceChange(student.studentId, s)} title={s.charAt(0).toUpperCase() + s.slice(1)}
                                    className={`w-8 h-8 text-xs rounded-lg font-bold transition-all ${(attendanceData[student.studentId] || 'present') === s
                                      ? s === 'present' ? 'bg-emerald-500 text-white shadow-sm' : s === 'absent' ? 'bg-red-500 text-white shadow-sm' : s === 'late' ? 'bg-amber-500 text-white shadow-sm' : 'bg-blue-500 text-white shadow-sm'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                    {s.charAt(0).toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-5 flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {[['P','bg-emerald-500','Present'],['A','bg-red-500','Absent'],['L','bg-amber-500','Late'],['E','bg-blue-500','Excused']].map(([l,c,t]) => (
                              <span key={l} className="flex items-center gap-1.5">
                                <span className={`w-5 h-5 rounded-lg ${c} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>{l}</span>
                                <span className="text-gray-500">{t}</span>
                              </span>
                            ))}
                          </div>
                          <button onClick={async (e) => {
                            e.preventDefault(); setError(''); setSuccess('');
                            if (!selectedTeacherCourse) { setError('Please select a course'); return; }
                            const batchStudents = selectedAssignment?.students || [];
                            if (batchStudents.length === 0) { setError('No students in this batch'); return; }
                            try {
                              setIsSubmitting(true);
                              const promises = batchStudents.map(student =>
                                fetch('/api/attendance', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ studentId: student.studentId, course: selectedTeacherCourse.name, date: selectedDate, status: attendanceData[student.studentId] || 'present', teacherId: user?.id, courseId: selectedTeacherCourse.id }),
                                })
                              );
                              const responses = await Promise.all(promises);
                              if (responses.every(r => r.ok)) {
                                setSuccess(`Attendance marked for ${batchStudents.length} students!`);
                                fetchRecords({}, user?.id);
                                const key = `${selectedTeacherCourse.id}_${selectedDate}`;
                                setSubmittedKeys(prev => new Set([...prev, key]));
                              } else { setError('Some attendance records failed to save'); }
                            } catch (e) { setError('Network error. Please check your connection.'); }
                            finally { setIsSubmitting(false); }
                          }} disabled={isSubmitting}
                            className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'}`}>
                            {isSubmitting ? 'Submitting...' : `Submit · ${(selectedAssignment?.students || []).length} students`}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'records' && (
                <div className="space-y-5">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Filter Records</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Student ID</label>
                        <input type="text" value={recordFilters.studentId} onChange={e => setRecordFilters(prev => ({...prev, studentId: e.target.value}))} placeholder="e.g., CS2024001"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Course</label>
                        <input type="text" value={recordFilters.course} onChange={e => setRecordFilters(prev => ({...prev, course: e.target.value}))} placeholder="Course name"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                        <input type="date" value={recordFilters.date} onChange={e => setRecordFilters(prev => ({...prev, date: e.target.value}))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm" />
                      </div>
                      <div className="flex items-end gap-2">
                        <button onClick={handleFilterApply} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold shadow-sm">Search</button>
                        <button onClick={() => { setRecordFilters({ studentName: '', department: '', course: '', studentId: '', date: '' }); setAdminPage(1); fetchRecords({}); }}
                          className="px-4 py-2 bg-white text-gray-600 text-sm rounded-xl hover:bg-gray-100 font-semibold border border-gray-200">↻</button>
                        {userRole === 'teacher' && (
                          <button onClick={() => {
                            const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(recordFilters).filter(([,v])=>v)), teacherId: user?.id || '' });
                            window.location.href = `/api/attendance/export?${params.toString()}`;
                          }} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 font-semibold">
                            ↓ CSV
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {records.length === 0 ? (
                    <div className="text-center py-14 text-gray-400">
                      <div className="text-4xl mb-3">📋</div>
                      <p className="text-sm font-medium">No records found</p>
                    </div>
                  ) : (() => {
                    const totalPages = Math.ceil(records.length / PAGE_SIZE);
                    const pageRecords = records.slice((adminPage - 1) * PAGE_SIZE, adminPage * PAGE_SIZE);
                    // Build set of course names this teacher is allowed to edit
                    const teacherCourseNames = userRole === 'teacher'
                      ? new Set(teacherAssignments.flatMap(a => a.courses.map(c => c.name)))
                      : null; // null = no restriction (admin/principal)
                    return (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-gray-400">Showing {(adminPage - 1) * PAGE_SIZE + 1}–{Math.min(adminPage * PAGE_SIZE, records.length)} of {records.length}</p>
                          <PaginationBar page={adminPage} totalPages={totalPages} setPage={setAdminPage} />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student ID</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {pageRecords.map(record => {
                                const canEdit = !teacherCourseNames || teacherCourseNames.has(record.course);
                                return (
                                  <tr key={record.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2.5">
                                        <StudentAvatar studentId={record.studentId} name={record.studentId} size={7} />
                                        <span className="text-sm font-semibold text-gray-900">{record.studentId}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{record.course}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-semibold ${statusColors[record.status]}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot[record.status]}`} />
                                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {canEdit ? (
                                        <div className="flex gap-1">
                                          {['present','absent','late'].map(s => (
                                            <button key={s} onClick={() => handleStatusUpdate(record.id, s)}
                                              className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-all ${record.status === s
                                                ? s === 'present' ? 'bg-emerald-500 text-white shadow-sm' : s === 'absent' ? 'bg-red-500 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                                              {s === 'present' ? '✓ P' : s === 'absent' ? '✗ A' : '⏰ L'}
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-300 italic">View only</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="space-y-6">

                  {/* Below 75% Alert */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">⚠ Students Below 75% Attendance</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Auto-detected from all attendance records</p>
                      </div>
                      <button onClick={fetchLowAttendance} disabled={lowAttLoading}
                        className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700 font-medium disabled:opacity-50">
                        {lowAttLoading ? 'Loading...' : '↻ Refresh'}
                      </button>
                    </div>
                    {lowAttLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-800 border-t-transparent" />
                      </div>
                    ) : lowAttendance.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <p className="text-2xl mb-2">✓</p>
                        <p className="text-sm font-medium text-gray-600">All students are above 75%</p>
                      </div>
                    ) : (
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Total</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Present</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Attendance %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lowAttendance.map(s => (
                            <tr key={s.studentId} className="hover:bg-red-50/40 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                  <StudentAvatar studentId={s.studentId} name={s.name} size={7} />
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                                    <p className="text-xs text-gray-400 font-mono">{s.studentId}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-600">{s.department || '—'}</td>
                              <td className="px-5 py-3 text-sm text-gray-600">{s.total}</td>
                              <td className="px-5 py-3 text-sm text-gray-600">{s.present}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-24">
                                    <div className="h-2 rounded-full bg-red-500" style={{ width: `${s.percentage}%` }} />
                                  </div>
                                  <span className="text-sm font-bold text-red-600">{s.percentage}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Batch Report */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h3 className="text-sm font-bold text-gray-800">📋 Batch / Department Report</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Download or print attendance report for a batch</p>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Department</label>
                          <select value={reportDept} onChange={e => { setReportDept(e.target.value); setReportBatchId(''); }}
                            className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm min-w-40">
                            <option value="">Select department</option>
                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Or Batch</label>
                          <select value={reportBatchId} onChange={e => { setReportBatchId(e.target.value); setReportDept(''); }}
                            className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm min-w-40">
                            <option value="">Select batch</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.department})</option>)}
                          </select>
                        </div>
                        <button onClick={fetchBatchReport} disabled={batchReportLoading || (!reportBatchId && !reportDept)}
                          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 font-semibold disabled:opacity-50 transition-all">
                          {batchReportLoading ? 'Loading...' : 'Generate Report'}
                        </button>
                        {batchReport && (
                          <>
                            <button onClick={downloadBatchReportCSV}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 font-semibold transition-all">
                              ↓ CSV
                            </button>
                            <button onClick={printBatchReport}
                              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold transition-all">
                              🖨 Print
                            </button>
                          </>
                        )}
                      </div>

                      {batchReport && (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Students</p>
                              <p className="text-2xl font-bold text-gray-900">{batchReport.total}</p>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Below 75%</p>
                              <p className="text-2xl font-bold text-red-600">{batchReport.belowCount}</p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">Above 75%</p>
                              <p className="text-2xl font-bold text-green-600">{batchReport.total - batchReport.belowCount}</p>
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="min-w-full">
                              <thead className="bg-gray-900 text-white">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Student</th>
                                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Dept</th>
                                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Total</th>
                                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Present</th>
                                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Absent</th>
                                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Attendance %</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {batchReport.students.map(s => (
                                  <tr key={s.studentId} className={`hover:bg-gray-50 transition-colors ${s.belowThreshold ? 'bg-red-50/40' : ''}`}>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2.5">
                                        <StudentAvatar studentId={s.studentId} name={s.name} size={7} />
                                        <div>
                                          <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                                          <p className="text-xs text-gray-400 font-mono">{s.studentId}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{s.department || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{s.total}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{s.present}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{s.absent}</td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-20">
                                          <div className={`h-2 rounded-full ${s.percentage < 75 ? 'bg-red-500' : s.percentage < 85 ? 'bg-amber-400' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(s.percentage, 100)}%` }} />
                                        </div>
                                        <span className={`text-sm font-bold ${s.percentage < 75 ? 'text-red-600' : s.percentage < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                                          {s.percentage}%
                                        </span>
                                        {s.belowThreshold && <span className="text-xs text-red-500 font-semibold">⚠</span>}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Per-student summary */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h3 className="text-sm font-bold text-gray-800">👤 Per-Student Summary</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Monthly breakdown and course-wise attendance</p>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1 max-w-xs">
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Student ID</label>
                          <input type="text" value={summaryStudentId} onChange={e => setSummaryStudentId(e.target.value)}
                            placeholder="e.g. CS2024001"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm" />
                        </div>
                        <button onClick={() => fetchStudentSummary(summaryStudentId)} disabled={studentSummaryLoading || !summaryStudentId}
                          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 font-semibold disabled:opacity-50 transition-all">
                          {studentSummaryLoading ? 'Loading...' : 'View Summary'}
                        </button>
                      </div>

                      {studentSummary && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: 'Total Classes', val: studentSummary.overall.total, color: 'text-gray-900' },
                              { label: 'Present', val: studentSummary.overall.present, color: 'text-green-600' },
                              { label: 'Absent', val: studentSummary.overall.absent, color: 'text-red-600' },
                              { label: 'Overall %', val: studentSummary.overall.percentage + '%', color: studentSummary.overall.percentage < 75 ? 'text-red-600' : 'text-green-600' },
                            ].map(c => (
                              <div key={c.label} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{c.label}</p>
                                <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
                              </div>
                            ))}
                          </div>

                          {studentSummary.overall.percentage < 75 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                              <span className="text-red-500">⚠</span>
                              <p className="text-sm font-semibold text-red-700">Attendance below 75% — at risk of shortage</p>
                            </div>
                          )}

                          {monthlyData.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Monthly Breakdown</p>
                              <div className="space-y-2">
                                {monthlyData.map(m => (
                                  <div key={m.month} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500 w-16 shrink-0">{m.month}</span>
                                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                                      <div className={`h-3 rounded-full transition-all ${m.percentage < 75 ? 'bg-red-500' : m.percentage < 85 ? 'bg-amber-400' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(m.percentage, 100)}%` }} />
                                    </div>
                                    <span className={`text-xs font-bold w-12 text-right ${m.percentage < 75 ? 'text-red-600' : m.percentage < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                                      {m.percentage}%
                                    </span>
                                    <span className="text-xs text-gray-400 w-20 text-right">{m.present}/{m.total} classes</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {studentSummary.perCourse.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Course-wise Breakdown</p>
                              <div className="space-y-2">
                                {studentSummary.perCourse.map(c => (
                                  <div key={c.course} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-700 font-medium w-40 truncate shrink-0">{c.course}</span>
                                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                                      <div className={`h-3 rounded-full ${c.percentage < 75 ? 'bg-red-500' : c.percentage < 85 ? 'bg-amber-400' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(c.percentage, 100)}%` }} />
                                    </div>
                                    <span className={`text-xs font-bold w-12 text-right ${c.percentage < 75 ? 'text-red-600' : c.percentage < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                                      {c.percentage}%
                                    </span>
                                    <span className="text-xs text-gray-400 w-20 text-right">{c.present}/{c.total}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmModal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteRecordId(null); }} onConfirm={confirmDelete} title="Delete Record" message="Delete this attendance record? This cannot be undone." confirmText="Delete" cancelText="Cancel" confirmColor="red" />
      <ConfirmModal isOpen={showBulkDeleteModal} onClose={() => setShowBulkDeleteModal(false)} onConfirm={() => { confirmBulkDelete(); setShowBulkDeleteModal(false); }} title="Delete Multiple Records" message={`Delete ${selectedRecords.length} record(s)? This cannot be undone.`} confirmText="Delete All" cancelText="Cancel" confirmColor="red" />
      <Toast message={toastMessage} type={toastType} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default Attendance;
