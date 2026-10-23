/** RiskBadge.jsx — Reusable risk level badge (unchanged + size prop) */
const config = {
  low:    { label: 'Low Risk',    bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  medium: { label: 'Medium Risk', bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300',   dot: 'bg-amber-500'   },
  high:   { label: 'High Risk',   bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300',     dot: 'bg-red-500'     },
};

const RiskBadge = ({ level = 'medium', size = 'md' }) => {
  const c = config[level?.toLowerCase()] || config.medium;
  const pad = size === 'lg' ? 'px-4 py-1.5 text-sm' : size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${c.bg} ${c.text} ${c.border} ${pad}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

export default RiskBadge;
