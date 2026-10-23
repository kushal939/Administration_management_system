/**
 * ConfidenceGauge.jsx
 * Displays the ML model's confidence score as a circular arc gauge.
 * Pure SVG — no external library needed.
 */

const ConfidenceGauge = ({ confidence = 0 }) => {
  const pct  = Math.min(1, Math.max(0, confidence));
  const deg  = pct * 180; // half-circle gauge
  const r    = 48;
  const cx   = 60;
  const cy   = 60;
  const circ = Math.PI * r; // half circumference

  // SVG arc: strokeDasharray trick on a half-circle path
  const filled = pct * circ;
  const empty  = circ - filled;

  const color =
    pct >= 0.75 ? '#22C55E' :
    pct >= 0.5  ? '#F59E0B' :
    '#EF4444';

  const label =
    pct >= 0.85 ? 'Very High' :
    pct >= 0.70 ? 'High'      :
    pct >= 0.50 ? 'Moderate'  :
    'Low';

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
        Confidence
      </p>
      <svg width="120" height="70" viewBox="0 0 120 75">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${empty}`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        {/* Percentage text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>
          {Math.round(pct * 100)}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94A3B8">
          {label}
        </text>
      </svg>
    </div>
  );
};

export default ConfidenceGauge;
