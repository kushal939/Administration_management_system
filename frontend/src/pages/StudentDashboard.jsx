import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentAvatar from '../components/StudentAvatar';

// ── Mini attendance sparkline ─────────────────────────────────────────────────
const AttendanceSparkline = ({ trend }) => {
  if (!trend || trend.length === 0) return <p className="text-xs text-gray-400 text-center py-4">No data in last 30 days</p>;
  const max = Math.max(...trend.map(t => t.total), 1);
  return (
    <div className="flex items-end gap-0.5 h-12">
      {trend.map((t, i) => {
        const pct = t.total > 0 ? (t.present / t.total) : 0;
        const color = pct >= 0.75 ? 'bg-emerald-500' : pct >= 0.5 ? 'bg-amber-400' : 'bg-red-400';
        return (
          <div key={i} className="flex-1 flex flex-col justify-end" title={`${t.date}: ${t.present}/${t.total}`}>
            <div className={`${color} rounded-sm opacity-80 hover:opacity-100 transition-opacity`}
              style={{ height: `${Math.max((t.total / max) * 100, 8)}%` }} />
          </div>
        );
      })}
    </div>
  );
};

// ── Fee countdown ─────────────────────────────────────────────────────────────
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
};

const StudentDashboard = () => {
  const [dashData, setDashData] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (!user?.email) {
        console.error('No user email found');
        return;
      }

      // Load profile photo
      if (user.id) {
        fetch(`/api/profile?userId=${user.id}`).then(r => r.json()).then(d => {
          if (d.success && d.data?.photo_url) setProfilePhoto(d.data.photo_url);
        }).catch(() => {});
      }

      // Find student record
      const studRes = await fetch('/api/students');
      const studData = await studRes.json();
      console.log('Students data:', studData);
      
      if (!studData.success) {
        console.error('Failed to fetch students');
        return;
      }
      
      const student = (studData.data || []).find(s => s.email === user.email);
      console.log('Found student:', student);
      
      if (!student) {
        console.error('Student not found for email:', user.email);
        return;
      }

      // Load all dashboard data in one call
      const dashRes = await fetch(`/api/students/${student.id}/dashboard`);
      const dash = await dashRes.json();
      console.log('Dashboard data:', dash);
      
      if (dash.success) {
        setDashData(dash.data);
      } else {
        console.error('Dashboard API error:', dash.message);
      }
    } catch (e) { 
      console.error('Dashboard load error:', e); 
    }
    finally { setIsLoading(false); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
    </div>
  );

  if (!dashData) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl">
        <p className="font-semibold mb-2">Unable to load your dashboard</p>
        <p className="text-sm">This could be because:</p>
        <ul className="text-sm list-disc ml-5 mt-2 space-y-1">
          <li>Your student record is not set up in the system</li>
          <li>You are not enrolled in any batch or courses</li>
          <li>There is a connection issue with the server</li>
        </ul>
        <p className="text-sm mt-3">Please check the browser console (F12) for more details, or contact the administrator.</p>
      </div>
    </div>
  );

  const { student, attOverall, attTrend, upcomingAssignments, pendingFees, currentSemesterGPA, cgpa } = dashData;
  const totalFees = pendingFees.reduce((s, f) => s + Number(f.amount), 0);
  const nextDue = pendingFees.find(f => f.due_date);
  const daysToNextFee = nextDue ? daysUntil(nextDue.due_date) : null;

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-5">

      {/* Welcome header */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 shrink-0">
            {profilePhoto
              ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-2xl">
                  {student.name.charAt(0).toUpperCase()}
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">Welcome back, {student.name.split(' ')[0]}!</h1>
            <p className="text-sm text-gray-400 mt-0.5">{student.studentId} · {student.department}</p>
          </div>
          {currentSemesterGPA && (
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400 uppercase tracking-widest">Current GPA</p>
              <p className="text-2xl font-bold text-indigo-600">{currentSemesterGPA.gpa || '—'}</p>
              <p className="text-xs text-gray-400">{currentSemesterGPA.semester_name}</p>
            </div>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Attendance', value: `${attOverall.rate}%`, sub: `${attOverall.present}/${attOverall.total} classes`, color: Number(attOverall.rate) >= 75 ? 'text-emerald-600' : 'text-red-500', bg: Number(attOverall.rate) >= 75 ? 'bg-emerald-50' : 'bg-red-50' },
          { label: 'CGPA', value: cgpa || '—', sub: 'Cumulative', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Pending Fees', value: `Rs.${totalFees.toLocaleString()}`, sub: pendingFees.length > 0 ? `${pendingFees.length} due` : 'All clear', color: totalFees > 0 ? 'text-amber-600' : 'text-emerald-600', bg: totalFees > 0 ? 'bg-amber-50' : 'bg-emerald-50' },
          { label: 'Assignments', value: upcomingAssignments.length, sub: 'Due in 14 days', color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
              <span className={`w-2.5 h-2.5 rounded-full ${k.color.replace('text-', 'bg-')}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-widest">{k.label}</p>
              <p className={`text-xl font-bold ${k.color} leading-none mt-0.5`}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Attendance trend */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Attendance — Last 30 Days</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${Number(attOverall.rate) >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {attOverall.rate}%
            </span>
          </div>
          <AttendanceSparkline trend={attTrend} />
          <div className="flex gap-3 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" />≥75%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400" />50-74%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400" />&lt;50%</span>
          </div>
        </div>

        {/* Upcoming assignments */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Upcoming Assignments</p>
            <Link to="/dashboard/assignments" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          {upcomingAssignments.length === 0 ? (
            <div className="text-center py-6 text-gray-300">
              <p className="text-2xl mb-1">✓</p>
              <p className="text-xs">No assignments due in 14 days</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingAssignments.map(a => {
                const days = daysUntil(a.due_date);
                const urgent = days !== null && days <= 2;
                return (
                  <div key={a.id} className={`flex items-start justify-between p-3 rounded-xl border ${urgent ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">{a.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.course}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {a.submission_status === 'graded' ? (
                        <span className="text-xs font-bold text-emerald-600">{a.marks_obtained}/{a.total_marks}</span>
                      ) : a.submission_status === 'submitted' ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Submitted</span>
                      ) : (
                        <span className={`text-xs font-semibold ${urgent ? 'text-red-600' : 'text-gray-500'}`}>
                          {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fee countdown */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fee Status</p>
            <Link to="/dashboard/fees" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          {pendingFees.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-1">✓</p>
              <p className="text-xs text-emerald-600 font-semibold">All fees paid</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingFees.slice(0, 4).map(f => {
                const days = daysUntil(f.due_date);
                const overdue = days !== null && days < 0;
                const urgent = days !== null && days <= 3 && days >= 0;
                return (
                  <div key={f.id} className={`flex items-center justify-between p-3 rounded-xl border ${overdue ? 'border-red-200 bg-red-50' : urgent ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">{f.description}</p>
                      <p className="text-xs text-gray-400 capitalize">{f.category}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs font-bold text-gray-800">Rs.{Number(f.amount).toLocaleString()}</p>
                      {days !== null && (
                        <p className={`text-xs font-semibold ${overdue ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-gray-400'}`}>
                          {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { to: '/dashboard/attendance', icon: '📅', label: 'Attendance' },
          { to: '/dashboard/results',    icon: '🎓', label: 'Results' },
          { to: '/dashboard/assignments',icon: '📚', label: 'Assignments' },
          { to: '/dashboard/fees',       icon: '💰', label: 'Fees' },
          { to: '/dashboard/notices',    icon: '📢', label: 'Notices' },
          { to: '/dashboard/progression',icon: '📈', label: 'Progression' },
        ].map(l => (
          <Link key={l.to} to={l.to}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 text-center hover:border-indigo-200 hover:shadow-md transition-all group">
            <div className="text-2xl mb-1.5">{l.icon}</div>
            <p className="text-xs font-semibold text-gray-600 group-hover:text-indigo-600 transition-colors">{l.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default StudentDashboard;
