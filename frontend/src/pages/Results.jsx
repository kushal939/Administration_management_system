import { useState, useEffect } from 'react';
import Toast from '../components/Toast';
import StudentAvatar from '../components/StudentAvatar';

const gradeColor = (g) => {
  if (!g) return 'bg-gray-100 text-gray-500';
  if (g === 'A+' || g === 'A') return 'bg-emerald-100 text-emerald-700';
  if (g === 'B+' || g === 'B') return 'bg-blue-100 text-blue-700';
  if (g === 'C+' || g === 'C') return 'bg-amber-100 text-amber-700';
  if (g === 'D') return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
};

const calcGrade = (obtained, total) => {
  const pct = total > 0 ? (obtained / total) * 100 : 0;
  if (pct >= 90) return { grade: 'A+', gpa: 4.0 };
  if (pct >= 80) return { grade: 'A',  gpa: 3.7 };
  if (pct >= 70) return { grade: 'B+', gpa: 3.3 };
  if (pct >= 60) return { grade: 'B',  gpa: 3.0 };
  if (pct >= 50) return { grade: 'C+', gpa: 2.5 };
  if (pct >= 40) return { grade: 'C',  gpa: 2.0 };
  if (pct >= 33) return { grade: 'D',  gpa: 1.0 };
  return { grade: 'F', gpa: 0.0 };
};

const printReportCard = (student, courses, batchName, semNum, dept) => {
  const totalObt = courses.reduce((s, c) => s + (c.obtained + c.practical), 0);
  const totalMax = courses.reduce((s, c) => s + (c.total + c.totalPractical), 0);
  const pct = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : '0';
  const { grade, gpa } = calcGrade(totalObt, totalMax);
  const rows = courses.map(c => {
    const tot = c.obtained + c.practical;
    const mx = c.total + c.totalPractical;
    const { grade: sg } = calcGrade(tot, mx);
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${c.subject}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${c.obtained}/${c.total}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${c.practical}/${c.totalPractical}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600">${tot}/${mx}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${mx > 0 ? ((tot/mx)*100).toFixed(1) : 0}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
        <span style="background:${sg==='F'?'#fee2e2':'#d1fae5'};color:${sg==='F'?'#b91c1c':'#065f46'};padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:700">${sg}</span>
      </td>
    </tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><title>Report Card</title>
  <style>body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111}table{width:100%;border-collapse:collapse}
  th{background:#1e293b;color:#fff;padding:10px 12px;text-align:left;font-size:13px}@media print{button{display:none}}</style></head><body>
  <div style="text-align:center;margin-bottom:24px;border-bottom:3px solid #1e293b;padding-bottom:16px">
    <div style="font-size:22px;font-weight:800;color:#1e293b">🎓 EK-Mikha</div>
    <div style="font-size:14px;color:#64748b;margin-top:4px">Official Semester Result Card</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;background:#f8fafc;padding:16px;border-radius:8px">
    <div><span style="color:#64748b;font-size:12px">STUDENT NAME</span><div style="font-weight:700;font-size:15px">${student.name}</div></div>
    <div><span style="color:#64748b;font-size:12px">STUDENT ID</span><div style="font-weight:700;font-size:15px">${student.studentId}</div></div>
    <div><span style="color:#64748b;font-size:12px">BATCH</span><div style="font-weight:700">${batchName}</div></div>
    <div><span style="color:#64748b;font-size:12px">DEPARTMENT</span><div style="font-weight:700">${dept}</div></div>
    <div><span style="color:#64748b;font-size:12px">SEMESTER</span><div style="font-weight:700">Semester ${semNum}</div></div>
    <div><span style="color:#64748b;font-size:12px">YEAR</span><div style="font-weight:700">${new Date().getFullYear()}</div></div>
  </div>
  <table><thead><tr><th>Course</th><th style="text-align:center">Theory</th><th style="text-align:center">Practical</th><th style="text-align:center">Total</th><th style="text-align:center">%</th><th style="text-align:center">Grade</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px">
    ${[['Total',`${totalObt}/${totalMax}`],['Percentage',`${pct}%`],['SGPA',gpa.toFixed(2)],['Result',grade!=='F'?'PASS':'FAIL']].map(([l,v])=>`
    <div style="background:${l==='Result'?(grade!=='F'?'#d1fae5':'#fee2e2'):'#f1f5f9'};padding:12px;border-radius:8px;text-align:center">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase">${l}</div>
      <div style="font-size:20px;font-weight:800;color:${l==='Result'?(grade!=='F'?'#065f46':'#b91c1c'):'#1e293b'}">${v}</div>
    </div>`).join('')}
  </div>
  <div style="text-align:center;margin-top:24px">
    <button onclick="window.print()" style="background:#1e293b;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px">🖨 Print / Save as PDF</button>
  </div></body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
};

const Results = () => {
  const [user, setUser] = useState(null);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterDept, setFilterDept] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState(null);
  const [semCourses, setSemCourses] = useState([]);       // courses assigned to semester
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  // marks[studentId][courseKey] = { obtained, total, practical, totalPractical }
  const [marks, setMarks] = useState({});
  const [existingResults, setExistingResults] = useState([]);
  const [publishStatus, setPublishStatus] = useState({ published: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('entry'); // entry | ranking
  const [summary, setSummary] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [myResults, setMyResults] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  // Phase 4 — transcript
  const [transcript, setTranscript] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptStudentId, setTranscriptStudentId] = useState('');
  const [transcriptFetched, setTranscriptFetched] = useState(false); // true after at least one fetch attempt
  const [studentActiveTab, setStudentActiveTab] = useState('results'); // results | transcript

  const showToast = (msg, type = 'success') => setToast({ show: true, msg, type });
  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = userRole === 'admin';
  const isPrincipal = userRole === 'principal';
  const isStudent = userRole === 'student';
  const canEdit = isAdmin;

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(u);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isStudent) { fetchBatches(); fetchDepartments(); }
    else fetchMyResults();
  }, [user]);

  const fetchBatches = async () => {
    const res = await fetch('/api/admin/batches', { headers: { 'x-user-role': 'admin' } });
    const d = await res.json();
    if (d.success) setBatches(d.data || []);
  };

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    const d = await res.json();
    if (d.success) setDepartments(d.data || []);
  };

  const fetchMyResults = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/results/student/${user.studentId || user.id}?role=student`);
      const d = await res.json();
      if (d.success) setMyResults(d.data || []);
    } catch (e) {} finally { setIsLoading(false); }
  };

  const fetchTranscript = async (sid, role) => {
    if (!sid) return;
    setTranscriptLoading(true);
    setTranscriptFetched(false);
    try {
      const effectiveRole = role || userRole || 'admin';
      const res = await fetch(`/api/results/transcript/${sid}?role=${effectiveRole}`);
      const d = await res.json();
      if (d.success) setTranscript(d.data);
      else setTranscript(null);
    } catch (e) { setTranscript(null); }
    finally { setTranscriptLoading(false); setTranscriptFetched(true); }
  };

  const printTranscript = (data) => {
    if (!data) return;
    const semRows = data.semesters.map(sem => {
      const subRows = sem.subjects.map(s => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${s.subject}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px">${s.internal}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px">${s.external}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;font-size:12px">${s.total}/${s.maxTotal}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px">${s.percentage}%</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:center">
            <span style="background:${s.grade==='F'?'#fee2e2':'#d1fae5'};color:${s.grade==='F'?'#b91c1c':'#065f46'};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700">${s.grade}</span>
          </td>
        </tr>`).join('');
      return `
        <div style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <div style="background:#1e293b;color:white;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;font-size:13px">Semester ${sem.semester_number}</span>
            <span style="font-size:12px">SGPA: ${sem.sgpa} &nbsp;|&nbsp; ${sem.percentage}% &nbsp;|&nbsp;
              <span style="background:${sem.passed?'#d1fae5':'#fee2e2'};color:${sem.passed?'#065f46':'#b91c1c'};padding:2px 8px;border-radius:9999px;font-weight:700">${sem.passed?'PASS':'FAIL'}</span>
            </span>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#f8fafc">
              <th style="padding:7px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Subject</th>
              <th style="padding:7px 10px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase">Internal</th>
              <th style="padding:7px 10px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase">External</th>
              <th style="padding:7px 10px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase">Total</th>
              <th style="padding:7px 10px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase">%</th>
              <th style="padding:7px 10px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase">Grade</th>
            </tr></thead>
            <tbody>${subRows}</tbody>
          </table>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><title>Academic Transcript</title>
    <style>body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111}@media print{button{display:none}}</style></head><body>
    <div style="text-align:center;margin-bottom:24px;border-bottom:3px solid #1e293b;padding-bottom:16px">
      <div style="font-size:22px;font-weight:800;color:#1e293b">🎓 EK-Mikha</div>
      <div style="font-size:14px;color:#64748b;margin-top:4px">Official Academic Transcript</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;background:#f8fafc;padding:16px;border-radius:8px">
      <div><span style="color:#64748b;font-size:11px;text-transform:uppercase">Student Name</span><div style="font-weight:700;font-size:15px">${data.student.name}</div></div>
      <div><span style="color:#64748b;font-size:11px;text-transform:uppercase">Student ID</span><div style="font-weight:700;font-size:15px">${data.student.studentId}</div></div>
      <div><span style="color:#64748b;font-size:11px;text-transform:uppercase">Department</span><div style="font-weight:700">${data.student.department || '—'}</div></div>
      <div><span style="color:#64748b;font-size:11px;text-transform:uppercase">Batch</span><div style="font-weight:700">${data.student.batch_name || '—'}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
      ${[['CGPA',data.cgpa,'#4f46e5'],['Semesters',data.totalSemesters,'#1e293b'],['Passed',data.passedSemesters,'#16a34a'],['Failed',data.failedSemesters,'#dc2626']].map(([l,v,c])=>`
      <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:8px;text-align:center">
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:4px">${l}</div>
        <div style="font-size:24px;font-weight:800;color:${c}">${v}</div>
      </div>`).join('')}
    </div>
    ${semRows}
    <div style="text-align:center;margin-top:24px">
      <button onclick="window.print()" style="background:#1e293b;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px">🖨 Print / Save as PDF</button>
    </div></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  };

  const selectBatch = async (batch) => {
    setSelectedBatch(batch);
    setSelectedSem(null);
    setSemCourses([]);
    setSelectedCourse(null);
    setBatchStudents([]);
    setMarks({});
    setSemesters([]);
    setSummary([]);
    setSummaryStats(null);
    const res = await fetch(`/api/admin/erp/batches/${batch.id}/overview`, { headers: { 'x-user-role': 'admin' } });
    const d = await res.json();
    if (d.success) setSemesters(d.data.semesters || []);
  };

  const selectSem = async (sem) => {
    setSelectedSem(sem);
    setSelectedCourse(null);
    setSemCourses([]);
    setMarks({});
    setSummary([]);
    setSummaryStats(null);
    setIsLoading(true);
    try {
      // Load courses assigned to this semester via ERP
      const cRes = await fetch(`/api/admin/erp/batches/${selectedBatch.id}/semesters/${sem.semester_number}/courses`, { headers: { 'x-user-role': 'admin' } });
      const cData = await cRes.json();
      let courses = cData.data || [];

      // Fallback: courses from existing results
      if (courses.length === 0) {
        const rRes = await fetch(`/api/results?batch_id=${selectedBatch.id}&semester_number=${sem.semester_number}&role=admin`);
        const rData = await rRes.json();
        const existing = rData.data || [];
        const seen = new Set();
        courses = existing.filter(r => { if (seen.has(r.subject)) return false; seen.add(r.subject); return true; })
          .map(r => ({ name: r.subject, code: r.subject, course_id: r.subject }));
      }
      setSemCourses(courses);

      // Load all existing results for this batch+sem
      const rRes = await fetch(`/api/results?batch_id=${selectedBatch.id}&semester_number=${sem.semester_number}&role=admin`);
      const rData = await rRes.json();
      setExistingResults(rData.data || []);

      // Only show students who have results in THIS semester (not all batch students)
      const studentIdsInSem = [...new Set((rData.data || []).map(r => r.student_id))];
      let semStudents = [];
      if (studentIdsInSem.length > 0) {
        const allRes = await fetch(`/api/admin/erp/batches/${selectedBatch.id}/students`, { headers: { 'x-user-role': 'admin' } });
        const allData = await allRes.json();
        semStudents = (allData.data || []).filter(s => studentIdsInSem.includes(s.id));
      } else {
        // No results yet — show all batch students for entry
        const allRes = await fetch(`/api/admin/erp/batches/${selectedBatch.id}/students`, { headers: { 'x-user-role': 'admin' } });
        const allData = await allRes.json();
        semStudents = allData.data || [];
      }
      setBatchStudents(semStudents);

      // Build marks map from existing
      const m = {};
      (rData.data || []).forEach(r => {
        if (!m[r.student_id]) m[r.student_id] = {};
        m[r.student_id][r.subject] = {
          obtained: r.internal_marks,
          total: r.max_internal,
          practical: r.external_marks,
          totalPractical: r.max_external,
        };
      });
      setMarks(m);

      // Publish status
      const pRes = await fetch(`/api/results/publish-status?batch_id=${selectedBatch.id}&semester_number=${sem.semester_number}`);
      const pData = await pRes.json();
      setPublishStatus(pData);

      // Auto-reload summary if ranking tab is already active
      if (activeTab === 'ranking') {
        const sRes2 = await fetch(`/api/results/summary?batch_id=${selectedBatch.id}&semester_number=${sem.semester_number}&role=${userRole}`);
        const sData2 = await sRes2.json();
        if (sData2.success) { setSummary(sData2.data || []); setSummaryStats(sData2.stats); }
      }
    } catch (e) {} finally { setIsLoading(false); }
  };

  const updateMark = (studentId, courseKey, field, value) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [courseKey]: {
          obtained: 0, total: 100, practical: 0, totalPractical: 50,
          ...(prev[studentId]?.[courseKey] || {}),
          [field]: value === '' ? '' : Number(value),
        }
      }
    }));
  };

  const getMarkVal = (studentId, courseKey, field, def) => {
    const v = marks[studentId]?.[courseKey]?.[field];
    return v === undefined ? def : v;
  };

  const saveResults = async (status = 'draft') => {
    if (!selectedBatch || !selectedSem || semCourses.length === 0) return;
    setIsSaving(true);
    const entries = [];
    batchStudents.forEach(st => {
      semCourses.forEach(c => {
        const key = c.name;
        const m = marks[st.id]?.[key] || {};
        entries.push({
          student_id: st.id,
          subject: key,
          internal_marks: Number(m.obtained) || 0,
          external_marks: Number(m.practical) || 0,
          max_internal: Number(m.total) || 100,
          max_external: Number(m.totalPractical) || 50,
        });
      });
    });
    try {
      const res = await fetch('/api/results/bulk-save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: selectedBatch.id, semester_number: selectedSem.semester_number, entries, status })
      });
      const d = await res.json();
      if (d.success) showToast(`Saved as ${status}`);
      else showToast('Save failed', 'error');
    } catch (e) { showToast('Network error', 'error'); }
    finally { setIsSaving(false); }
  };

  const publishResults = async (action) => {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/results/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: selectedBatch.id, semester_number: selectedSem.semester_number })
      });
      const d = await res.json();
      if (d.success) { showToast(`Results ${action}ed`); setPublishStatus(p => ({ ...p, published: action === 'publish' })); }
    } catch (e) { showToast('Failed', 'error'); }
    finally { setIsPublishing(false); }
  };

  const loadSummary = async () => {
    if (!selectedBatch || !selectedSem) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/results/summary?batch_id=${selectedBatch.id}&semester_number=${selectedSem.semester_number}&role=${userRole}`);
      const d = await res.json();
      if (d.success) { setSummary(d.data || []); setSummaryStats(d.stats); }
    } catch (e) {} finally { setIsLoading(false); }
  };

  const filteredBatches = filterDept ? batches.filter(b => b.department === filterDept) : batches;

  // ── STUDENT VIEW ─────────────────────────────────────────────────────────────
  if (isStudent) {
    const semGroups = myResults.reduce((acc, r) => {
      const k = `Semester ${r.semester_number}`;
      if (!acc[k]) acc[k] = [];
      acc[k].push(r);
      return acc;
    }, {});
    return (
      <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Results</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your semester-wise academic results</p>
          </div>
        </div>

        {/* Student tab bar */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[{ key: 'results', label: '📊 Semester Results' }, { key: 'transcript', label: '🎓 Full Transcript' }].map(tab => (
              <button key={tab.key}
                onClick={() => {
                  setStudentActiveTab(tab.key);
                  if (tab.key === 'transcript' && !transcript && !transcriptLoading) {
                    fetchTranscript(user.studentId, 'student');
                  }
                }}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${studentActiveTab === tab.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Results tab ── */}
          {studentActiveTab === 'results' && (
            <div className="p-5 space-y-4">
              {isLoading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" /></div>
              : myResults.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-5xl mb-3">📊</div>
                  <p className="text-gray-500 font-medium">No published results yet</p>
                </div>
              ) : Object.entries(semGroups).map(([semLabel, rows]) => {
          const totalObt = rows.reduce((s, r) => s + r.internal_marks + r.external_marks, 0);
          const totalMax = rows.reduce((s, r) => s + r.max_internal + r.max_external, 0);
          const { grade, gpa } = calcGrade(totalObt, totalMax);
          const pct = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : '0';
          return (
            <div key={semLabel} className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">{semLabel}</h2>
                  <p className="text-xs text-gray-400">{rows[0]?.batch_name} · {rows[0]?.department}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right"><p className="text-xs text-gray-400">SGPA</p><p className="text-lg font-bold text-indigo-600">{gpa.toFixed(2)}</p></div>
                  <span className={`px-2.5 py-1 rounded-full text-sm font-bold ${gradeColor(grade)}`}>{grade}</span>
                  <button onClick={() => printReportCard({ name: user.name, studentId: user.studentId },
                    rows.map(r => ({ subject: r.subject, obtained: r.internal_marks, total: r.max_internal, practical: r.external_marks, totalPractical: r.max_external })),
                    rows[0]?.batch_name, rows[0]?.semester_number, rows[0]?.department)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-semibold">🖨 Report Card</button>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[['Total Marks',`${totalObt}/${totalMax}`,'text-gray-900'],['Percentage',`${pct}%`,'text-indigo-600'],['Result',grade==='F'?'FAIL':'PASS',grade==='F'?'text-red-600':'text-emerald-600']].map(([l,v,c])=>(
                    <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">{l}</p>
                      <p className={`text-xl font-bold mt-1 ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>{['Course','Theory Marks','Practical Marks','Total','%','Grade'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.map(r => {
                        const tot = r.internal_marks + r.external_marks;
                        const mx = r.max_internal + r.max_external;
                        const { grade: sg } = calcGrade(tot, mx);
                        const p = mx > 0 ? ((tot/mx)*100).toFixed(1) : '0';
                        return (
                          <tr key={r.id} className="hover:bg-gray-50/80">
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{r.subject}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{r.internal_marks}<span className="text-gray-400">/{r.max_internal}</span></td>
                            <td className="px-4 py-3 text-sm text-gray-600">{r.external_marks}<span className="text-gray-400">/{r.max_external}</span></td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{tot}<span className="text-gray-400 font-normal">/{mx}</span></td>
                            <td className="px-4 py-3 text-sm text-gray-600">{p}%</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(sg)}`}>{sg}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
            </div>
          )}

          {/* ── Transcript tab ── */}
          {studentActiveTab === 'transcript' && (
            <div className="p-5 space-y-4">
              {transcriptLoading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" /></div>
              ) : !transcript ? (
                <div className="py-16 text-center">
                  <div className="text-5xl mb-3">🎓</div>
                  <p className="text-gray-500 font-medium">No transcript data available yet</p>
                  <p className="text-xs text-gray-400 mt-1">Results must be published to appear here</p>
                </div>
              ) : (
                <>
                  {/* CGPA summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      ['CGPA', transcript.cgpa, 'text-indigo-700', 'bg-indigo-50'],
                      ['Semesters', transcript.totalSemesters, 'text-gray-900', 'bg-gray-50'],
                      ['Passed', transcript.passedSemesters, 'text-emerald-700', 'bg-emerald-50'],
                      ['Failed', transcript.failedSemesters, 'text-red-700', 'bg-red-50'],
                    ].map(([l, v, c, bg]) => (
                      <div key={l} className={`${bg} border border-gray-200 rounded-xl p-4 text-center`}>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">{l}</p>
                        <p className={`text-2xl font-bold mt-1 ${c}`}>{v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Semester-by-semester breakdown */}
                  {transcript.semesters.map(sem => (
                    <div key={sem.semester_number} className="border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                        <div>
                          <span className="text-sm font-bold text-gray-900">Semester {sem.semester_number}</span>
                          <span className="ml-2 text-xs text-gray-400">{sem.batch_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">SGPA: <span className="font-bold text-indigo-600">{sem.sgpa}</span></span>
                          <span className="text-xs text-gray-500">{sem.percentage}%</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${sem.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {sem.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-white">
                          <tr>{['Subject','Internal','External','Total','%','Grade'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sem.subjects.map(s => (
                            <tr key={s.subject} className="hover:bg-gray-50/60">
                              <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{s.subject}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-600">{s.internal}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-600">{s.external}</td>
                              <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{s.total}<span className="text-gray-400 font-normal">/{s.maxTotal}</span></td>
                              <td className="px-4 py-2.5 text-sm text-gray-600">{s.percentage}%</td>
                              <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(s.grade)}`}>{s.grade}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {sem.failedSubjects.length > 0 && (
                        <div className="px-5 py-2.5 bg-red-50 border-t border-red-100">
                          <span className="text-xs text-red-600 font-semibold">Failed: </span>
                          <span className="text-xs text-red-500">{sem.failedSubjects.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <button onClick={() => printTranscript(transcript)}
                      className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold">
                      🖨 Print Full Transcript
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <Toast message={toast.msg} type={toast.type} isVisible={toast.show} onClose={() => setToast(p => ({...p, show: false}))} />
      </div>
    );
  }

  // ── ADMIN / PRINCIPAL VIEW ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Result Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Select batch → semester → enter marks per course</p>
        </div>
        {selectedBatch && selectedSem && (
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${publishStatus.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            <span className={`w-2 h-2 rounded-full ${publishStatus.published ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {publishStatus.published ? 'Published' : 'Draft'}
          </span>
        )}
      </div>

      <div className="flex gap-5">
        {/* ── SIDEBAR ── */}
        <div className="w-56 shrink-0 space-y-3">
          {/* Dept filter */}
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>

          {/* Batches */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Batches</p>
            </div>
            <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
              {filteredBatches.length === 0 ? <p className="text-xs text-gray-400 text-center py-5">No batches</p>
              : filteredBatches.map(b => (
                <button key={b.id} onClick={() => selectBatch(b)}
                  className={`w-full text-left px-4 py-2.5 transition-all ${selectedBatch?.id === b.id ? 'bg-indigo-600' : 'hover:bg-gray-50'}`}>
                  <p className={`text-xs font-bold truncate ${selectedBatch?.id === b.id ? 'text-white' : 'text-gray-800'}`}>{b.batch_name}</p>
                  <p className={`text-xs ${selectedBatch?.id === b.id ? 'text-indigo-200' : 'text-gray-400'}`}>{b.department}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Semesters */}
          {selectedBatch && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Semesters</p>
              </div>
              <div className="divide-y divide-gray-50">
                {semesters.length === 0 ? <p className="text-xs text-gray-400 text-center py-5">No semesters</p>
                : semesters.map(sem => (
                  <button key={sem.id} onClick={() => selectSem(sem)}
                    className={`w-full text-left px-4 py-2.5 transition-all ${selectedSem?.id === sem.id ? 'bg-indigo-600' : 'hover:bg-gray-50'}`}>
                    <p className={`text-xs font-bold ${selectedSem?.id === sem.id ? 'text-white' : 'text-gray-800'}`}>{sem.name}</p>
                    <p className={`text-xs capitalize ${selectedSem?.id === sem.id ? 'text-indigo-200' : 'text-gray-400'}`}>{sem.status}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── MAIN PANEL ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {!selectedBatch ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-gray-600 font-semibold">Select a batch to get started</p>
            </div>
          ) : !selectedSem ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
              <div className="text-5xl mb-3">📅</div>
              <p className="text-gray-600 font-semibold">Select a semester</p>
              <p className="text-xs text-gray-400 mt-1">Courses assigned to that semester will appear here</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent" /></div>
          ) : (
            <>
              {/* Tabs + action buttons */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 border-b border-gray-100">
                  <div className="flex">
                    {[{ key: 'entry', label: '✏️ Marks Entry', show: canEdit }, { key: 'ranking', label: '🏆 Results & Ranking', show: true }]
                      .filter(t => t.show).map(tab => (
                      <button key={tab.key} onClick={() => { setActiveTab(tab.key); if (tab.key === 'ranking') loadSummary(); }}
                        className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === tab.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  {canEdit && activeTab === 'entry' && (
                    <div className="flex items-center gap-2 py-2">
                      <button onClick={() => saveResults('draft')} disabled={isSaving}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-xl hover:bg-gray-200 font-semibold border border-gray-200 disabled:opacity-50">
                        {isSaving ? 'Saving...' : '💾 Save Draft'}
                      </button>
                      {publishStatus.published ? (
                        <button onClick={() => publishResults('unpublish')} disabled={isPublishing}
                          className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-xl hover:bg-amber-600 font-semibold disabled:opacity-50">
                          {isPublishing ? '...' : '🔒 Unpublish'}
                        </button>
                      ) : (
                        <button onClick={async () => { await saveResults('published'); await publishResults('publish'); }} disabled={isPublishing || isSaving}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-xl hover:bg-emerald-700 font-semibold disabled:opacity-50">
                          {isPublishing ? '...' : '🚀 Publish'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── MARKS ENTRY ── */}
                {activeTab === 'entry' && canEdit && (
                  <div className="p-5 space-y-4">
                    {semCourses.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl text-gray-400">
                        <div className="text-3xl mb-2">📚</div>
                        <p className="text-sm font-medium">No courses assigned to this semester</p>
                        <p className="text-xs mt-1">Assign courses via Batch ERP first</p>
                      </div>
                    ) : batchStudents.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 text-sm">No students in this batch</div>
                    ) : (
                      <>
                        {/* Course selector pills */}
                        <div className="flex flex-wrap gap-2">
                          {semCourses.map(course => {
                            const isActive = selectedCourse?.name === course.name;
                            return (
                              <button key={course.name} onClick={() => setSelectedCourse(course)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                  isActive
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                                }`}>
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                                  {course.code?.slice(0,2) || course.name?.slice(0,2)}
                                </span>
                                {course.name}
                              </button>
                            );
                          })}
                        </div>

                        {/* No course selected yet */}
                        {!selectedCourse ? (
                          <div className="text-center py-12 border border-dashed border-indigo-200 rounded-xl bg-indigo-50/30">
                            <div className="text-3xl mb-2">👆</div>
                            <p className="text-sm font-medium text-indigo-700">Select a course above to enter marks</p>
                            <p className="text-xs text-indigo-400 mt-1">{semCourses.length} courses in this semester</p>
                          </div>
                        ) : (() => {
                          const courseKey = selectedCourse.name;
                          return (
                            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                              {/* Course header */}
                              <div className="flex items-center justify-between px-5 py-3.5 bg-gray-900 text-white">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center text-xs font-bold shrink-0">
                                    {selectedCourse.code?.slice(0,3) || courseKey.slice(0,2)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold">{selectedCourse.name}</p>
                                    <p className="text-xs text-gray-400">{selectedCourse.code} · {batchStudents.length} students · {selectedSem.name}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  {semCourses.map((c, i) => (
                                    <button key={c.name} onClick={() => setSelectedCourse(c)}
                                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${c.name === courseKey ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                                      {i + 1}. {c.code || c.name.slice(0,6)}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Students marks table */}
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <span className="text-gray-400">Total Course</span><br/>
                                        <span className="text-gray-700 normal-case font-bold">Marks</span>
                                      </th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                                        Obtained<br/>Marks
                                      </th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <span className="text-gray-400">Total</span><br/>
                                        <span className="text-gray-700 normal-case font-bold">Practical</span>
                                      </th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-600 uppercase tracking-wider">
                                        Practical<br/>Marks
                                      </th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">%</th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">GPA</th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50 bg-white">
                                    {batchStudents.map(st => {
                                      const totalCourse = Number(getMarkVal(st.id, courseKey, 'total', 100));
                                      const obtained    = Number(getMarkVal(st.id, courseKey, 'obtained', 0));
                                      const totalPrac   = Number(getMarkVal(st.id, courseKey, 'totalPractical', 50));
                                      const practical   = Number(getMarkVal(st.id, courseKey, 'practical', 0));
                                      const grandTotal  = obtained + practical;
                                      const grandMax    = totalCourse + totalPrac;
                                      const pct         = grandMax > 0 ? ((grandTotal / grandMax) * 100).toFixed(1) : '0';
                                      const { grade, gpa } = calcGrade(grandTotal, grandMax);
                                      return (
                                        <tr key={st.id} className="hover:bg-indigo-50/20 transition-colors">
                                          <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                              <StudentAvatar studentId={st.studentId} name={st.name} size={8} />
                                              <div>
                                                <p className="text-xs font-semibold text-gray-900 whitespace-nowrap">{st.name}</p>
                                                <p className="text-xs text-gray-400">{st.studentId}</p>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <input type="number" min="1" value={getMarkVal(st.id, courseKey, 'total', 100)}
                                              onChange={e => updateMark(st.id, courseKey, 'total', e.target.value)}
                                              className="w-16 px-2 py-1.5 text-xs text-center rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50 font-medium" />
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <input type="number" min="0" max={totalCourse}
                                              value={getMarkVal(st.id, courseKey, 'obtained', '')}
                                              onChange={e => updateMark(st.id, courseKey, 'obtained', e.target.value)}
                                              placeholder="—"
                                              className="w-16 px-2 py-1.5 text-xs text-center rounded-lg border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-indigo-50 font-bold text-indigo-800" />
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <input type="number" min="0" value={getMarkVal(st.id, courseKey, 'totalPractical', 50)}
                                              onChange={e => updateMark(st.id, courseKey, 'totalPractical', e.target.value)}
                                              className="w-16 px-2 py-1.5 text-xs text-center rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50 font-medium" />
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <input type="number" min="0" max={totalPrac}
                                              value={getMarkVal(st.id, courseKey, 'practical', '')}
                                              onChange={e => updateMark(st.id, courseKey, 'practical', e.target.value)}
                                              placeholder="—"
                                              className="w-16 px-2 py-1.5 text-xs text-center rounded-lg border-2 border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50 font-bold text-purple-800" />
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span className="text-sm font-bold text-gray-900">{grandTotal}<span className="text-xs text-gray-400 font-normal">/{grandMax}</span></span>
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span className={`text-sm font-semibold ${Number(pct) >= 33 ? 'text-indigo-600' : 'text-red-500'}`}>{pct}%</span>
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span className="text-sm font-bold text-gray-700">{gpa.toFixed(2)}</span>
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${gradeColor(grade)}`}>{grade}</span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Course nav footer */}
                              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
                                <button
                                  onClick={() => { const i = semCourses.findIndex(c => c.name === courseKey); if (i > 0) setSelectedCourse(semCourses[i-1]); }}
                                  disabled={semCourses.findIndex(c => c.name === courseKey) === 0}
                                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-100 font-semibold text-gray-600 disabled:opacity-40">
                                  ← Previous Course
                                </button>
                                <span className="text-xs text-gray-400">
                                  Course {semCourses.findIndex(c => c.name === courseKey) + 1} of {semCourses.length}
                                </span>
                                <button
                                  onClick={() => { const i = semCourses.findIndex(c => c.name === courseKey); if (i < semCourses.length - 1) setSelectedCourse(semCourses[i+1]); }}
                                  disabled={semCourses.findIndex(c => c.name === courseKey) === semCourses.length - 1}
                                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-100 font-semibold text-gray-600 disabled:opacity-40">
                                  Next Course →
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}

                {/* ── RANKING TAB ── */}
                {activeTab === 'ranking' && (
                  <div className="p-5 space-y-4">
                    {isLoading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" /></div>
                    : summary.length === 0 ? (
                      <div className="text-center py-14 text-gray-400">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-sm font-medium">No results yet — save marks first</p>
                      </div>
                    ) : (
                      <>
                        {summaryStats && (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[['Students', summaryStats.total,'text-gray-900','bg-white'],['Passed',summaryStats.passed,'text-emerald-700','bg-emerald-50'],['Failed',summaryStats.failed,'text-red-700','bg-red-50'],['Pass %',`${summaryStats.passPercent}%`,'text-indigo-700','bg-indigo-50'],['Published',summaryStats.published,'text-amber-700','bg-amber-50']].map(([l,v,c,bg])=>(
                              <div key={l} className={`${bg} border border-gray-200 rounded-xl p-3 text-center shadow-sm`}>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">{l}</p>
                                <p className={`text-xl font-bold mt-1 ${c}`}>{v}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                          <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                              <tr>{['Rank','Student','Total','%','SGPA','Grade','Status','Report'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {summary.map(r => (
                                <tr key={r.student_id} className="hover:bg-gray-50/80">
                                  <td className="px-4 py-3">
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${r.rank===1?'bg-amber-400 text-white':r.rank===2?'bg-gray-300 text-gray-700':r.rank===3?'bg-orange-300 text-white':'bg-gray-100 text-gray-600'}`}>{r.rank}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <StudentAvatar studentId={r.student_code} name={r.student_name} size={7} />
                                      <div><p className="text-xs font-semibold text-gray-900">{r.student_name}</p><p className="text-xs text-gray-400">{r.student_code}</p></div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{r.total_obtained}<span className="text-gray-400 font-normal">/{r.total_max}</span></td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{r.percentage}%</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-indigo-600">{r.sgpa}</td>
                                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(r.grade)}`}>{r.grade}</span></td>
                                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.pass?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{r.pass?'Pass':'Fail'}</span></td>
                                  <td className="px-4 py-3">
                                    <button onClick={() => {
                                      const courses = (r.subject_breakdown||'').split(',').map(s => {
                                        const [name, rest] = s.split(':');
                                        const [obt, mx] = (rest||'0/0').split('/');
                                        return { subject: name, obtained: Number(obt), total: Number(mx), practical: 0, totalPractical: 0 };
                                      });
                                      printReportCard({ name: r.student_name, studentId: r.student_code }, courses, selectedBatch.batch_name, selectedSem.semester_number, selectedBatch.department);
                                    }} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-lg hover:bg-indigo-100 font-semibold border border-indigo-200">🖨 Print</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── TRANSCRIPT LOOKUP (admin/principal) ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">🎓 Transcript Lookup</h2>
          <p className="text-xs text-gray-400 mt-0.5">Enter a student ID to view their full academic transcript and CGPA</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={transcriptStudentId}
              onChange={e => { setTranscriptStudentId(e.target.value); setTranscript(null); setTranscriptFetched(false); }}
              onKeyDown={e => e.key === 'Enter' && fetchTranscript(transcriptStudentId, userRole)}
              placeholder="e.g. STU001"
              className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              onClick={() => fetchTranscript(transcriptStudentId, userRole)}
              disabled={!transcriptStudentId || transcriptLoading}
              className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50">
              {transcriptLoading ? 'Loading...' : 'Fetch'}
            </button>
          </div>

          {transcriptLoading && (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent" /></div>
          )}

          {!transcriptLoading && transcript && (
            <>
              {/* Student info + CGPA cards */}
              <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <p className="text-base font-bold text-gray-900">{transcript.student.name}</p>
                  <p className="text-xs text-gray-400">{transcript.student.studentId} · {transcript.student.department} · {transcript.student.batch_name}</p>
                </div>
                <div className="flex gap-3">
                  {[
                    ['CGPA', transcript.cgpa, 'text-indigo-700'],
                    ['Semesters', transcript.totalSemesters, 'text-gray-900'],
                    ['Passed', transcript.passedSemesters, 'text-emerald-700'],
                    ['Failed', transcript.failedSemesters, 'text-red-700'],
                  ].map(([l, v, c]) => (
                    <div key={l} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-center min-w-[64px]">
                      <p className="text-xs text-gray-400">{l}</p>
                      <p className={`text-xl font-bold ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Semester table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>{['Semester','Subjects','Total','%','SGPA','Result','Failed Subjects'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transcript.semesters.map(sem => (
                      <tr key={sem.semester_number} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">Sem {sem.semester_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sem.subjects.length}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{sem.totalObt}<span className="text-gray-400 font-normal">/{sem.totalMax}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sem.percentage}%</td>
                        <td className="px-4 py-3 text-sm font-bold text-indigo-600">{sem.sgpa}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${sem.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {sem.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-red-500">{sem.failedSubjects.length > 0 ? sem.failedSubjects.join(', ') : <span className="text-gray-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button onClick={() => printTranscript(transcript)}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 font-semibold">
                  🖨 Print Full Transcript
                </button>
              </div>
            </>
          )}

          {!transcriptLoading && transcript === null && transcriptFetched && (
            <p className="text-sm text-gray-400 text-center py-6">No transcript found for "{transcriptStudentId}"</p>
          )}
        </div>
      </div>

      <Toast message={toast.msg} type={toast.type} isVisible={toast.show} onClose={() => setToast(p => ({...p, show: false}))} />
    </div>
  );
};

export default Results;
