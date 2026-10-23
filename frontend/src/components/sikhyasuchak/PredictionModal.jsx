/**
 * PredictionModal.jsx
 * Slide-in drawer showing full ML prediction result for a student.
 * Used by TeacherDashboard when "Analyze" is clicked.
 */
import RiskBadge from './RiskBadge';
import ScoreBar from './ScoreBar';
import ConfidenceGauge from './ConfidenceGauge';
import PerformanceTrendChart from './PerformanceTrendChart';

const recIcon = text => {
  const t = text.toLowerCase();
  if (t.includes('attend'))    return '📅';
  if (t.includes('assign'))    return '📋';
  if (t.includes('quiz'))      return '📝';
  if (t.includes('midterm') || t.includes('exam')) return '📖';
  if (t.includes('lab'))       return '🔬';
  if (t.includes('study'))     return '⏰';
  if (t.includes('gpa'))       return '🎯';
  return '💡';
};

const PredictionModal = ({ data, onClose }) => {
  if (!data) return null;

  const {
    student_name, student_id, department,
    predicted_grade, risk_level, confidence_score,
    probability = {}, final_score, recommendations = [],
    feature_importance = {}, features_used = {}, model_used,
  } = data;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] px-6 py-5 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">ML Prediction</p>
              <h2 className="text-white text-xl font-black mt-0.5">{student_name || student_id}</h2>
              <p className="text-blue-200 text-sm mt-0.5">{department} · {student_id}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
            >
              ✕
            </button>
          </div>

          {/* Grade + Risk row */}
          <div className="flex items-center gap-3 mt-4">
            <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
              <p className="text-white text-3xl font-black">{predicted_grade}</p>
              <p className="text-blue-200 text-xs">Predicted Grade</p>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
              <p className="text-white text-2xl font-black">{final_score?.toFixed(1)}</p>
              <p className="text-blue-200 text-xs">Final Score</p>
            </div>
            <div className="flex-1">
              <RiskBadge level={risk_level} size="lg" />
              <p className="text-blue-200 text-xs mt-1">via {model_used}</p>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Confidence gauge + probabilities */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              Model Confidence
            </p>
            <div className="flex items-center gap-6">
              <ConfidenceGauge confidence={confidence_score} />
              <div className="flex-1 space-y-2">
                {Object.entries(probability).map(([level, prob]) => (
                  <div key={level} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-16 capitalize">{level}</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(prob * 100).toFixed(1)}%`,
                          backgroundColor:
                            level === 'low' ? '#22C55E' :
                            level === 'medium' ? '#F59E0B' : '#EF4444',
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-10 text-right">
                      {(prob * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance chart */}
          {Object.keys(features_used).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Score Breakdown
              </p>
              <PerformanceTrendChart features={features_used} />
            </div>
          )}

          {/* Feature importance */}
          {Object.keys(feature_importance).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Feature Importance
              </p>
              <div className="space-y-2">
                {Object.entries(feature_importance)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([feat, imp]) => (
                    <ScoreBar
                      key={feat}
                      label={feat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      score={imp * 100}
                      showValue={false}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Recommendations
              </p>
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                    <span className="text-base shrink-0 mt-0.5">{recIcon(rec)}</span>
                    <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-400 pb-2">
            Generated by {model_used} · {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PredictionModal;
