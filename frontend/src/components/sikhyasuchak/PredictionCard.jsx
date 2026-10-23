/**
 * PredictionCard.jsx — Reusable ML prediction result display
 * Supports both rule-based (3 scores) and ML (full) results.
 */
import RiskBadge from './RiskBadge';
import ScoreBar from './ScoreBar';
import ConfidenceGauge from './ConfidenceGauge';

const recIcon = text => {
  const t = (text || '').toLowerCase();
  if (t.includes('attend'))    return '📅';
  if (t.includes('assign'))    return '📋';
  if (t.includes('quiz'))      return '📝';
  if (t.includes('midterm') || t.includes('exam')) return '📖';
  if (t.includes('lab'))       return '🔬';
  if (t.includes('study'))     return '⏰';
  return '💡';
};

const PredictionCard = ({ result, studentName, isML = false }) => {
  if (!result) return null;

  const {
    marks_score, attendance_score, assignment_score,
    midterm_marks, internal_marks, lab_marks,
    attendance_pct, quiz_score,
    final_score, risk_level, recommendations = [],
    predicted_grade, confidence_score, probability = {},
    feature_importance = {}, model_used,
  } = result;

  const finalColor =
    final_score >= 75 ? 'text-emerald-600' :
    final_score >= 50 ? 'text-amber-600'   : 'text-red-600';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">
              {isML ? 'ML Prediction Result' : 'Prediction Result'}
            </p>
            <h2 className="text-white text-lg font-bold">{studentName || 'Student Analysis'}</h2>
            {isML && model_used && (
              <p className="text-blue-200 text-xs mt-0.5">Model: {model_used}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isML && predicted_grade && (
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center">
                <p className="text-white text-2xl font-black">{predicted_grade}</p>
                <p className="text-blue-200 text-xs">Grade</p>
              </div>
            )}
            <RiskBadge level={risk_level} size="lg" />
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Final score + confidence */}
        <div className="flex items-center gap-4">
          <div className={`flex-1 flex flex-col items-center py-4 rounded-2xl bg-slate-50 border border-slate-200`}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Final Score</p>
            <p className={`text-5xl font-black ${finalColor}`}>{final_score?.toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-1">out of 100</p>
          </div>
          {isML && confidence_score !== undefined && (
            <ConfidenceGauge confidence={confidence_score} />
          )}
        </div>

        {/* Probability bars — ML only */}
        {isML && Object.keys(probability).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Risk Probability
            </p>
            {['low', 'medium', 'high'].map(level => (
              <div key={level} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-16 capitalize">{level}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${((probability[level] || 0) * 100).toFixed(1)}%`,
                      backgroundColor: level === 'low' ? '#22C55E' : level === 'medium' ? '#F59E0B' : '#EF4444',
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 w-10 text-right">
                  {((probability[level] || 0) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Score breakdown */}
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Score Breakdown</p>
          {isML ? (
            <>
              {attendance_pct   !== undefined && <ScoreBar label="Attendance"   score={attendance_pct}   icon="📅" />}
              {midterm_marks    !== undefined && <ScoreBar label="Midterm"      score={midterm_marks}    icon="📖" />}
              {internal_marks   !== undefined && <ScoreBar label="Internal"     score={internal_marks}   icon="📝" />}
              {assignment_score !== undefined && <ScoreBar label="Assignments"  score={assignment_score} icon="📋" />}
              {quiz_score       !== undefined && <ScoreBar label="Quizzes"      score={quiz_score}       icon="❓" />}
              {lab_marks        !== undefined && <ScoreBar label="Lab"          score={lab_marks}        icon="🔬" />}
            </>
          ) : (
            <>
              {marks_score      !== undefined && <ScoreBar label="Marks"       score={marks_score}      icon="📝" />}
              {attendance_score !== undefined && <ScoreBar label="Attendance"  score={attendance_score} icon="📅" />}
              {assignment_score !== undefined && <ScoreBar label="Assignments" score={assignment_score} icon="📋" />}
            </>
          )}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recommendations</p>
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <span className="text-base shrink-0 mt-0.5">{recIcon(rec)}</span>
                <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionCard;
