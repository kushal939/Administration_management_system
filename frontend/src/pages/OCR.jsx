import { useState, useEffect, useRef } from 'react';
import { getUserRole } from '../utils/roleUtils';

const OCR = () => {
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'marksheet' : 'general');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  // Marksheet scan state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [existingStudent, setExistingStudent] = useState(null);
  const [rawText, setRawText] = useState('');
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedDocs, setSavedDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // New student form
  const [newStudent, setNewStudent] = useState({ name: '', email: '', department: '', year: '1' });
  const [isNewStudent, setIsNewStudent] = useState(false);

  // General OCR state
  const [genResult, setGenResult] = useState(null);
  const [genPreview, setGenPreview] = useState(null);
  const fileRef = useRef();
  const genFileRef = useRef();

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/departments').then(r => r.json()).then(d => { if (d.success) setDepartments(d.data || []); });
      loadSavedDocs();
    }
  }, []);

  const loadSavedDocs = async () => {
    setLoadingDocs(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch('/api/admin/ocr/all-documents', { headers: { 'x-user-data': JSON.stringify(user) } });
      const d = await res.json();
      if (d.success) setSavedDocs(d.data || []);
    } catch (e) {}
    setLoadingDocs(false);
  };

  const handleMarksheetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setExtracted(null); setExistingStudent(null); setRawText(''); setIsNewStudent(false);
    setProcessing(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const form = new FormData();
      form.append('document', file);
      const res = await fetch('/api/admin/ocr/student-document', {
        method: 'POST', headers: { 'x-user-data': JSON.stringify(user) }, body: form
      });
      const d = await res.json();
      if (d.success) {
        setExtracted(d.data);
        setExistingStudent(d.existingStudent);
        setRawText(d.rawText || '');
        if (!d.existingStudent) {
          setIsNewStudent(true);
          setNewStudent(prev => ({ ...prev, name: d.data.name || '' }));
        }
        showToast(d.message);
      } else {
        showToast(d.message || 'Failed to process', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
    setProcessing(false);
  };

  const handleSave = async () => {
    if (!extracted) return;
    if (isNewStudent && (!newStudent.name || !newStudent.email || !newStudent.department)) {
      showToast('Fill in name, email and department for new student', 'error'); return;
    }
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch('/api/admin/ocr/save-marksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-data': JSON.stringify(user) },
        body: JSON.stringify({
          studentId: existingStudent?.id || null,
          extracted: { ...extracted, rawText },
          isNewStudent,
          newStudentData: isNewStudent ? newStudent : null
        })
      });
      const d = await res.json();
      if (d.success) {
        showToast('Saved successfully');
        setExtracted(null); setPreviewUrl(null); setExistingStudent(null);
        setIsNewStudent(false); setRawText('');
        loadSavedDocs();
      } else {
        showToast(d.message || 'Failed to save', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
    setSaving(false);
  };

  const handleGenOcr = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setGenPreview(URL.createObjectURL(file));
    setGenResult(null);
    setProcessing(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/ocr/process', { method: 'POST', body: form });
      const d = await res.json();
      if (d.success) setGenResult(d.data);
      else showToast(d.message || 'Failed', 'error');
    } catch (err) { showToast('Network error', 'error'); }
    setProcessing(false);
  };

  const Field = ({ label, value, onChange, type = 'text', children }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{label}</label>
      {children || (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">

      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border
          ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {toast.type === 'error' ? '⚠️' : '✓'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">OCR Scanner</h1>
          <p className="text-sm text-gray-400 mt-0.5">Extract and save student data from scanned documents</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 px-2 pt-1">
          {isAdmin && (
            <button onClick={() => setActiveTab('marksheet')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'marksheet' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              📄 Scan Marksheet
            </button>
          )}
          <button onClick={() => setActiveTab('general')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'general' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            🔍 General OCR
          </button>
          {isAdmin && (
            <button onClick={() => { setActiveTab('history'); loadSavedDocs(); }}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'history' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              🗂 Saved Records {savedDocs.length > 0 && <span className="ml-1.5 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{savedDocs.length}</span>}
            </button>
          )}
        </div>

        {/* ── MARKSHEET SCAN TAB ── */}
        {activeTab === 'marksheet' && isAdmin && (
          <div className="p-6 space-y-6">
            {/* Upload zone */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer"
                  onClick={() => fileRef.current?.click()}>
                  {previewUrl
                    ? <img src={previewUrl} alt="preview" className="max-h-64 mx-auto rounded-xl object-contain" />
                    : <>
                        <div className="text-4xl mb-3">📄</div>
                        <p className="text-sm font-semibold text-gray-600">Click to upload marksheet</p>
                        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, PDF image — max 10MB</p>
                      </>
                  }
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleMarksheetUpload} />
                </div>
                {processing && (
                  <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent shrink-0" />
                    Extracting data from document…
                  </div>
                )}
              </div>

              {/* Extracted data panel */}
              {extracted && (
                <div className="space-y-4">
                  {/* Student match banner */}
                  {existingStudent ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <span className="text-emerald-600 text-lg">✓</span>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Matched: {existingStudent.name}</p>
                        <p className="text-xs text-emerald-600">{existingStudent.studentId} · {existingStudent.department}</p>
                      </div>
                      <button onClick={() => { setIsNewStudent(true); setExistingStudent(null); }}
                        className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">Save as new instead</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <span className="text-amber-600 text-lg">⚠️</span>
                      <p className="text-sm font-semibold text-amber-800">No existing student matched — will create new</p>
                    </div>
                  )}

                  {/* Extracted fields */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Extracted Data</p>
                    {extracted.name && (
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                          {extracted.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{extracted.name}</p>
                          {extracted.gpa && <p className="text-xs text-indigo-600 font-semibold">GPA: {extracted.gpa}</p>}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ['Symbol No.', extracted.symbolNumber],
                        ['Reg. No.', extracted.registrationNumber],
                        ['Institution', extracted.institution],
                        ['Exam Year', extracted.examYear],
                        ['Percentage', extracted.percentage ? extracted.percentage + '%' : ''],
                        ['Division', extracted.division],
                      ].map(([label, val]) => val ? (
                        <div key={label}>
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="font-semibold text-gray-800 truncate">{val}</p>
                        </div>
                      ) : null)}
                    </div>
                  </div>

                  {/* Subjects table */}
                  {extracted.subjects?.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Subjects ({extracted.subjects.length})</p>
                        {extracted.gpa && (
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">GPA: {extracted.gpa}</span>
                        )}
                      </div>
                      <table className="min-w-full divide-y divide-gray-100 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-400 font-semibold">Code</th>
                            <th className="px-3 py-2 text-left text-gray-400 font-semibold">Subject</th>
                            <th className="px-3 py-2 text-right text-gray-400 font-semibold">Cr.Hr</th>
                            <th className="px-3 py-2 text-right text-gray-400 font-semibold">Gr.Pt</th>
                            <th className="px-3 py-2 text-center text-gray-400 font-semibold">Grade</th>
                            <th className="px-3 py-2 text-center text-gray-400 font-semibold">Final</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {extracted.subjects.map((s, i) => {
                            const gradeColor = {
                              'A+': 'text-emerald-700 bg-emerald-50', 'A': 'text-emerald-600 bg-emerald-50',
                              'B+': 'text-blue-700 bg-blue-50', 'B': 'text-blue-600 bg-blue-50',
                              'C+': 'text-amber-700 bg-amber-50', 'C': 'text-amber-600 bg-amber-50',
                              'D+': 'text-orange-600 bg-orange-50', 'D': 'text-orange-500 bg-orange-50',
                              'E': 'text-red-600 bg-red-50', 'NG': 'text-red-700 bg-red-50',
                            };
                            const gc = gradeColor[s.finalGrade || s.grade] || 'text-gray-600 bg-gray-100';
                            return (
                              <tr key={i} className="hover:bg-gray-50/60">
                                <td className="px-3 py-2 text-gray-400 font-mono">{s.code || '—'}</td>
                                <td className="px-3 py-2 font-medium text-gray-800">{s.subject}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{s.creditHour ?? '—'}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{s.gradePoint ?? s.theory ?? '—'}</td>
                                <td className="px-3 py-2 text-center">
                                  {s.grade ? <span className={`px-1.5 py-0.5 rounded font-bold text-xs ${gc}`}>{s.grade}</span> : '—'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {s.finalGrade ? <span className={`px-1.5 py-0.5 rounded font-bold text-xs ${gc}`}>{s.finalGrade}</span> : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* New student form */}
                  {isNewStudent && (
                    <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">New Student Details</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Full Name" value={newStudent.name} onChange={v => setNewStudent(p => ({ ...p, name: v }))} />
                        <Field label="Email *" value={newStudent.email} onChange={v => setNewStudent(p => ({ ...p, email: v }))} type="email" />
                        <Field label="Department *">
                          <select value={newStudent.department} onChange={e => setNewStudent(p => ({ ...p, department: e.target.value }))}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                            <option value="">Select…</option>
                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                          </select>
                        </Field>
                        <Field label="Year">
                          <select value={newStudent.year} onChange={e => setNewStudent(p => ({ ...p, year: e.target.value }))}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                            {['1','2','3','4'].map(y => <option key={y} value={y}>Year {y}</option>)}
                          </select>
                        </Field>
                      </div>
                      <p className="text-xs text-indigo-500">Student ID will be auto-generated from department + year</p>
                    </div>
                  )}

                  <button onClick={handleSave} disabled={saving}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all
                      ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md'}`}>
                    {saving ? 'Saving…' : '✓ Save to Student Record'}
                  </button>
                </div>
              )}
            </div>

            {/* Raw text toggle */}
            {rawText && (
              <details className="border border-gray-200 rounded-xl overflow-hidden">
                <summary className="px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer bg-gray-50 hover:bg-gray-100">
                  Raw OCR Text (click to expand)
                </summary>
                <pre className="px-4 py-3 text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto bg-white">{rawText}</pre>
              </details>
            )}
          </div>
        )}

        {/* ── GENERAL OCR TAB ── */}
        {activeTab === 'general' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer"
                  onClick={() => genFileRef.current?.click()}>
                  {genPreview
                    ? <img src={genPreview} alt="preview" className="max-h-64 mx-auto rounded-xl object-contain" />
                    : <>
                        <div className="text-4xl mb-3">🔍</div>
                        <p className="text-sm font-semibold text-gray-600">Click to upload image</p>
                        <p className="text-xs text-gray-400 mt-1">Any image — extracts all text</p>
                      </>
                  }
                  <input ref={genFileRef} type="file" accept="image/*" className="hidden" onChange={handleGenOcr} />
                </div>
                {processing && (
                  <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent shrink-0" />
                    Processing…
                  </div>
                )}
              </div>
              <div>
                {genResult ? (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-gray-800">{genResult.confidence}%</p>
                        <p className="text-xs text-gray-400">Confidence</p>
                      </div>
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-gray-800">{genResult.wordCount}</p>
                        <p className="text-xs text-gray-400">Words</p>
                      </div>
                    </div>
                    <textarea value={genResult.text} readOnly rows={14}
                      className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-gray-200 bg-gray-50 focus:outline-none resize-none" />
                    <button onClick={() => navigator.clipboard.writeText(genResult.text).then(() => showToast('Copied!'))}
                      className="w-full py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
                      Copy Text
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-gray-300">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="text-sm">Upload an image to extract text</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && isAdmin && (
          <div className="p-6">
            {loadingDocs ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : savedDocs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">🗂</div>
                <p className="text-sm">No scanned documents yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedDocs.map(doc => (
                  <div key={doc.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                          {(doc.student_name || doc.student_name_db || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{doc.student_name_db || doc.student_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{doc.student_code} · {doc.department}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {doc.gpa && <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">GPA {doc.gpa}</span>}
                        {doc.percentage && <span className="ml-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{doc.percentage}%</span>}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500">
                      {doc.symbol_number && <div><span className="font-medium text-gray-700">Symbol:</span> {doc.symbol_number}</div>}
                      {doc.registration_number && <div><span className="font-medium text-gray-700">Reg:</span> {doc.registration_number}</div>}
                      {doc.exam_year && <div><span className="font-medium text-gray-700">Year:</span> {doc.exam_year}</div>}
                      {doc.institution && <div className="col-span-3"><span className="font-medium text-gray-700">Institution:</span> {doc.institution}</div>}
                    </div>
                    {doc.subjects?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {doc.subjects.map((s, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {s.subject}: {s.finalGrade || s.grade || s.total || s.obtained || '—'}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-300">{new Date(doc.scanned_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OCR;
