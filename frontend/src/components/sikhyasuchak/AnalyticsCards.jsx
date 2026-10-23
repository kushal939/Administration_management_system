/**
 * AnalyticsCards.jsx
 * Displays 4 KPI cards: Total Students, High Risk, Medium Risk, Low Risk.
 * Used by AdminDashboard and TeacherDashboard.
 */

const cards = [
  { key: 'total',  label: 'Total Analyzed', color: 'bg-blue-50  border-blue-200',  text: 'text-blue-700',   dot: 'bg-blue-500'   },
  { key: 'high',   label: 'High Risk',       color: 'bg-red-50   border-red-200',    text: 'text-red-700',    dot: 'bg-red-500'    },
  { key: 'medium', label: 'Medium Risk',     color: 'bg-amber-50 border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  { key: 'low',    label: 'Low Risk',        color: 'bg-green-50 border-green-200',  text: 'text-green-700',  dot: 'bg-green-500'  },
];

const AnalyticsCards = ({ analytics }) => {
  if (!analytics) return null;

  const { risk_distribution = {}, analyzed_students = 0, averages = {} } = analytics;
  const low    = risk_distribution.low?.count    || 0;
  const medium = risk_distribution.medium?.count || 0;
  const high   = risk_distribution.high?.count   || 0;

  const values = { total: analyzed_students, high, medium, low };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ key, label, color, text, dot }) => (
        <div key={key} className={`border rounded-2xl p-5 ${color}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
          </div>
          <p className={`text-3xl font-black ${text}`}>{values[key]}</p>
          {key !== 'total' && analyzed_students > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {((values[key] / analyzed_students) * 100).toFixed(1)}% of total
            </p>
          )}
        </div>
      ))}

      {/* Average cards */}
      {averages.attendance_pct !== undefined && (
        <div className="border border-slate-200 bg-slate-50 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Avg Attendance</p>
          <p className="text-3xl font-black text-slate-700">{averages.attendance_pct?.toFixed(1)}%</p>
        </div>
      )}
      {averages.final_score !== undefined && (
        <div className="border border-slate-200 bg-slate-50 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Avg Score</p>
          <p className="text-3xl font-black text-slate-700">{averages.final_score?.toFixed(1)}</p>
        </div>
      )}
      {averages.confidence !== undefined && (
        <div className="border border-slate-200 bg-slate-50 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Avg Confidence</p>
          <p className="text-3xl font-black text-slate-700">{(averages.confidence * 100)?.toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsCards;
