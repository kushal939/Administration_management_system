/** ScoreBar.jsx — Animated score progress bar */
const ScoreBar = ({ label, score = 0, icon, showValue = true }) => {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 75 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          {icon && <span className="text-sm">{icon}</span>}{label}
        </span>
        {showValue && <span className="text-xs font-bold text-slate-700">{pct.toFixed(1)}%</span>}
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default ScoreBar;
