/**
 * StudentDashboard.jsx
 * Location: src/components/sikhyasuchak/StudentDashboard.jsx
 *
 * Upgraded student view — pulls real data from AMS via FastAPI bridge.
 * Shows full academic profile + ML-powered grade prediction.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchStudentData, fetchStudentPrediction } from './api';
import PredictionCard from './PredictionCard';
import ScoreBar from './ScoreBar';
import StudentPredictionHistory from './StudentPredictionHistory';
import PerformanceTrendChart from './PerformanceTrendChart';

// ── Skeleton loaders ──────────────────────────────────────────────────────────
const ProfileSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-pulse">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-14 h-14 rounded-2xl bg-gray-200" />
      <div className="space-y-2 flex-1">
        <div className="h-5 bg-gray-200 rounded-lg w-1/2" />
        <div className="h-3 bg-gray-100 rounded-lg w-1/3" />
      </div>
    </div>
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="h-8 bg-gray-100 rounded-xl mb-3" />
    ))}
  </div>
);

const PredictionSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
    <div className="h-24 bg-gray-200" />
    <div className="p-6 space-y-4">
      <div className="h-32 bg-gray-100 rounded-2xl" />
      {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded-xl" />)}
    </div>
  </div>
);

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = 'blue' }) => {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100' },
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-100' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-100' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl p-4 flex flex-col gap-1`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-black ${c.text}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
};

// ── Extra inputs for ML prediction ───────────────────────────────────────────
const ExtraField = ({ label, name, value, onChange, icon, min = 0, max = 10, step = 0.1 }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
      <span>{icon}</span>{label}
    </label>
    <input
      type="number"
      name={name}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      placeholder={`${min} – ${max}`}
      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        text-slate-800 font-semibold placeholder:font-normal placeholder:text-gray-300 transition-all"
    />
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const userRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  // AMS login returns: { id (user db id), studentId (e.g. "STUCS24001"), name, role }
  // FastAPI /student/{id} accepts the string studentId (STUCS24001), not the numeric user id
  const studentId = user?.studentId || user?.student_id || String(user?.id || '');

  const [profile, setProfile]       = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError,   setProfileError]   = useState('');

  const [extra, setExtra] = useState({ previous_gpa: '', study_hours: '', extra_activities: '' });
  const [prediction, setPrediction]   = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  const [predError,   setPredError]   = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Load real student data from AMS bridge
  const loadProfile = useCallback(async () => {
    if (!studentId) { setProfileError('No student ID found. Please log in again.'); setProfileLoading(false); return; }
    setProfileLoading(true);
    setProfileError('');
    try {
      const data = await fetchStudentData(studentId);
      setProfile(data);
    } catch (e) {
      setProfileError('Could not load your academic data. Make sure the Sikhya Suchak API is running on port 8001.');
    } finally {
      setProfileLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleExtraChange = e => {
    setExtra(p => ({ ...p, [e.target.name]: e.target.value }));
    setPredError('');
  };

  const handlePredict = async () => {
    if (!studentId) { setPredError('No student ID found.'); return; }
    setPredLoading(true);
    setPredError('');
    try {
      const extraParams = {};
      if (extra.previous_gpa)     extraParams.previous_gpa     = Number(extra.previous_gpa);
      if (extra.study_hours)      extraParams.study_hours      = Number(extra.study_hours);
      if (extra.extra_activities) extraParams.extra_activities = Number(extra.extra_activities);
      const data = await fetchStudentPrediction(studentId, extraParams);
      setPrediction(data);
      // Persist history to localStorage
      const histKey = `pred_history_${studentId}`;
      const existing = JSON.parse(localStorage.getItem(histKey) || '[]');
      const entry = { ...data, timestamp: new Date().toISOString() };
      localStorage.setItem(histKey, JSON.stringify([entry, ...existing].slice(0, 10)));
    } catch {
      setPredError('Prediction failed. Make sure the Sikhya Suchak API is running on port 8001.');
    } finally {
      setPredLoading(false);
    }
  };

  const handleReset = () => { setPrediction(null); setPredError(''); };

  // ── Derived profile values ─────────────────────────────────────────────────
  // Step 5: backend /student/{id} now returns flat fields directly
  const att    = profile?.attendance_pct        ?? profile?.attendance_score;
  const asgn   = profile?.assignment_score;
  const quiz   = profile?.quiz_score;
  const mid    = profile?.midterm_marks;
  const intr   = profile?.internal_marks;
  const lab    = profile?.lab_marks;
  const gpa    = profile?.previous_gpa;
  const study  = profile?.study_hours;
  const extAct = profile?.extra_activities;
  // Support both flat and nested (aggregated_features) shapes
  const feats  = profile?.aggregated_features || profile || {};
  const att2   = feats.attendance_pct        ?? feats.attendance_score ?? att;
  const asgn2  = feats.assignment_score      ?? asgn;
  const quiz2  = feats.quiz_score            ?? quiz;
  const mid2   = feats.midterm_marks         ?? mid;
  const intr2  = feats.internal_marks        ?? intr;
  const lab2   = feats.lab_marks             ?? lab;
  const dept   = profile?.department ?? profile?.student?.department ?? profile?.dept ?? '—';
  const name   = profile?.student_name ?? profile?.student?.name ?? user?.name ?? 'Student';

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
              🎓
            </div>
            <div>
              <h2 className="text-xl font-black">{name}</h2>
              <p className="text-blue-200 text-sm mt-0.5">
                {dept !== '—' ? `${dept} Department` : 'Academic Performance Prediction'}
                {studentId && <span className="ml-2 opacity-70">· ID: {studentId}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(h => !h)}
              className="px-4 py-2 bg-white/20 text-white text-xs font-bold rounded-xl hover:bg-white/30 transition-all border border-white/20"
            >
              📜 History
            </button>
            <button
              onClick={loadProfile}
              disabled={profileLoading}
              className="px-4 py-2 bg-white/20 text-white text-xs font-bold rounded-xl hover:bg-white/30 transition-all border border-white/20 disabled:opacity-50"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Prediction history drawer */}
      {showHistory && studentId && (
        <StudentPredictionHistory studentId={studentId} onClose={() => setShowHistory(false)} />
      )}

      {/* Profile error */}
      {profileError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <div>
            <p className="font-bold">Could not load academic data</p>
            <p className="text-xs mt-0.5 opacity-80">{profileError}</p>
            <button onClick={loadProfile} className="mt-2 text-xs underline font-semibold">Try again</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left: Profile + score breakdown */}
        <div className="xl:col-span-1 space-y-5">

          {profileLoading ? <ProfileSkeleton /> : profile && (
            <>
              {/* KPI stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon="📅" label="Attendance"   value={att2   != null ? `${Number(att2).toFixed(1)}%`  : '—'} color={att2 >= 75 ? 'green' : att2 >= 50 ? 'amber' : 'red'} />
                <StatCard icon="📝" label="Midterm"      value={mid2   != null ? `${Number(mid2).toFixed(1)}`   : '—'} color={mid2 >= 75 ? 'green' : mid2 >= 50 ? 'amber' : 'red'} />
                <StatCard icon="📋" label="Assignments"  value={asgn2  != null ? `${Number(asgn2).toFixed(1)}%` : '—'} color={asgn2 >= 75 ? 'green' : asgn2 >= 50 ? 'amber' : 'red'} />
                <StatCard icon="❓" label="Quiz"         value={quiz2  != null ? `${Number(quiz2).toFixed(1)}%` : '—'} color={quiz2 >= 75 ? 'green' : quiz2 >= 50 ? 'amber' : 'red'} />
                <StatCard icon="📖" label="Internal"     value={intr2  != null ? `${Number(intr2).toFixed(1)}`  : '—'} color={intr2 >= 75 ? 'green' : intr2 >= 50 ? 'amber' : 'red'} />
                <StatCard icon="🔬" label="Lab"          value={lab2   != null ? `${Number(lab2).toFixed(1)}`   : '—'} color={lab2  >= 75 ? 'green' : lab2  >= 50 ? 'amber' : 'red'} />
                {gpa  != null && <StatCard icon="🎯" label="Prev GPA"    value={Number(gpa).toFixed(2)}  color="purple" />}
                {study != null && <StatCard icon="⏰" label="Study Hrs"  value={`${study}h`}              color="blue"   />}
                {extAct != null && <StatCard icon="🏃" label="Activities" value={extAct}                  color="blue"   />}
              </div>

              {/* Score bars */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Performance Overview</p>
                {att2   != null && <ScoreBar label="Attendance"  score={att2}   icon="📅" />}
                {asgn2  != null && <ScoreBar label="Assignments" score={asgn2}  icon="📋" />}
                {quiz2  != null && <ScoreBar label="Quiz"        score={quiz2}  icon="❓" />}
                {mid2   != null && <ScoreBar label="Midterm"     score={mid2}   icon="📝" />}
                {intr2  != null && <ScoreBar label="Internal"    score={intr2}  icon="📖" />}
                {lab2   != null && <ScoreBar label="Lab"         score={lab2}   icon="🔬" />}
              </div>

              {/* Performance trend chart */}
              {(att2 || asgn2 || quiz2 || mid2 || intr2 || lab2) && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Score Breakdown</p>
                  <PerformanceTrendChart features={{
                    attendance_pct:   att2,
                    assignment_score: asgn2,
                    quiz_score:       quiz2,
                    midterm_marks:    mid2,
                    internal_marks:   intr2,
                    lab_marks:        lab2,
                  }} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Predict panel + result */}
        <div className="xl:col-span-2 space-y-5">

          {/* Prediction control card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800">🔮 ML Performance Prediction</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your academic data is automatically loaded from the system. Optionally fill in the extra fields below for a more accurate prediction.
              </p>
            </div>

            {/* Optional extra inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ExtraField label="Previous GPA"   name="previous_gpa"     icon="🎯" value={extra.previous_gpa}     onChange={handleExtraChange} min={0} max={10}  step={0.01} />
              <ExtraField label="Study Hours/day" name="study_hours"     icon="⏰" value={extra.study_hours}      onChange={handleExtraChange} min={0} max={24}  step={0.5}  />
              <ExtraField label="Extra Activities" name="extra_activities" icon="🏃" value={extra.extra_activities} onChange={handleExtraChange} min={0} max={10}  step={1}    />
            </div>

            {predError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                <span className="mt-0.5">⚠️</span>
                <span>{predError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handlePredict}
                disabled={predLoading || profileLoading || !!profileError}
                className="flex-1 py-3 bg-[#1E3A8A] text-white text-sm font-bold rounded-xl
                  hover:bg-[#1e40af] transition-all disabled:opacity-50 disabled:cursor-not-allowed
                  shadow hover:shadow-md"
              >
                {predLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Predicting...
                  </span>
                ) : '🔮 Predict My Grade'}
              </button>
              {prediction && (
                <button
                  onClick={handleReset}
                  className="px-4 py-3 border border-gray-200 text-slate-500 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Prediction result */}
          {predLoading && <PredictionSkeleton />}

          {!predLoading && prediction && (
            <PredictionCard result={prediction} studentName={name} isML={true} />
          )}

          {!predLoading && !prediction && !predError && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center flex flex-col items-center justify-center gap-3 min-h-[260px]">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl border border-gray-200">
                📊
              </div>
              <p className="text-sm font-semibold text-slate-500">Your ML prediction will appear here</p>
              <p className="text-xs text-gray-400">Click "Predict My Grade" above to run the model</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
