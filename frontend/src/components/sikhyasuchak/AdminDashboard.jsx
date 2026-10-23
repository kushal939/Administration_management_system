/**
 * AdminDashboard.jsx  (Step 5 — Production Ready)
 * Location: src/components/sikhyasuchak/AdminDashboard.jsx
 *
 * Displays:
 *  - Model evaluation: accuracy, precision, recall, F1, ROC-AUC, prediction count
 *  - Risk distribution pie, dept comparison bar, attendance trend
 *  - Recent predictions from /predictions/history
 *  - Export to Excel/CSV, Print, PDF stub
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchAnalytics, fetchModelMetrics, fetchAllStudents,
  fetchPredictionHistory,
} from './api';
import AnalyticsCards from './AnalyticsCards';
import RiskPieChart   from './RiskPieChart';
import RiskBadge      from './RiskBadge';

import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Title, Tooltip, Legend, Filler);

// ── Helpers ───────────────────────────────────────────────────────────────────
const pct = v => (v != null ? `${Number(v).toFixed(1)}%` : '—');
const num = v => (v != null ? Number(v).toFixed(2) : '—');
const fmtDate = iso => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN',
    { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return iso; }
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skel = ({ h = 'h-28', cls = '' }) => (
  <div className={`${h} ${cls} bg-gray-100 rounded-2xl animate-pulse`} />
);

// ── Metric tile ───────────────────────────────────────────────────────────────
const Tile = ({ icon, label, value, sub, color = 'blue' }) => {
  const C = {
    blue:   'bg-blue-50   border-blue-100   text-blue-700',
    green:  'bg-green-50  border-green-100  text-green-700',
    amber:  'bg-amber-50  border-amber-100  text-amber-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    red:    'bg-red-50    border-red-100    text-red-700',
    slate:  'bg-slate-50  border-slate-200  text-slate-700',
  }[color] || 'bg-blue-50 border-blue-100 text-blue-700';
  return (
    <div className={`border rounded-2xl p-5 ${C}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
      </div>
      <p className="text-2xl font-black">{value ?? '—'}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
};

// ── Model metrics panel ───────────────────────────────────────────────────────
const ModelMetricsPanel = ({ metrics }) => {
  if (!metrics) return <Skel h="h-64" />;

  const best = metrics.models?.find(m => m.name === metrics.best_model) || metrics.models?.[0];
  const classLabels = metrics.confusion_matrix_labels || ['high','low','medium'];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">🤖 Model Evaluation</h3>
          <p className="text-xs text-slate-500 mt-0.5">Best model: <strong>{metrics.best_model}</strong></p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-full">
            v{metrics.api_version || '3.0.0'}
          </span>
        </div>
      </div>

      {/* Primary metrics row */}
      {best && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Accuracy',  value: pct(best.accuracy),  color: 'green'  },
            { label: 'Precision', value: pct(best.precision), color: 'blue'   },
            { label: 'Recall',    value: pct(best.recall),    color: 'purple' },
            { label: 'F1 Score',  value: pct(best.f1),        color: 'amber'  },
            { label: 'ROC-AUC',   value: best.roc_auc !== 'N/A' ? pct(best.roc_auc) : '—', color: 'slate' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`text-center p-3 rounded-xl border ${
              color === 'green'  ? 'bg-green-50 border-green-200'  :
              color === 'blue'   ? 'bg-blue-50  border-blue-200'   :
              color === 'purple' ? 'bg-purple-50 border-purple-200':
              color === 'amber'  ? 'bg-amber-50 border-amber-200'  :
              'bg-slate-50 border-slate-200'
            }`}>
              <p className={`text-xl font-black ${
                color === 'green'  ? 'text-green-700'  :
                color === 'blue'   ? 'text-blue-700'   :
                color === 'purple' ? 'text-purple-700' :
                color === 'amber'  ? 'text-amber-700'  :
                'text-slate-700'
              }`}>{value}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Prediction count + confidence */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
          <p className="text-2xl font-black text-slate-800">{metrics.prediction_count ?? 0}</p>
          <p className="text-xs text-slate-500">Total Predictions</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
          <p className="text-2xl font-black text-slate-800">
            {metrics.average_confidence ? pct(metrics.average_confidence * 100) : '—'}
          </p>
          <p className="text-xs text-slate-500">Avg Confidence</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
          <p className="text-2xl font-black text-slate-800">
            {best?.cv_score ? pct(best.cv_score) : '—'}
          </p>
          <p className="text-xs text-slate-500">Cross-Val Score</p>
        </div>
      </div>

      {/* All-models comparison table */}
      {metrics.models && metrics.models.length > 1 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Model Comparison
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  {['Model','Accuracy','Precision','Recall','F1','ROC-AUC','CV'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.models.map(m => (
                  <tr key={m.name} className={`hover:bg-slate-50 transition-colors ${m.name === metrics.best_model ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-3 py-2 font-semibold text-slate-800 flex items-center gap-1.5">
                      {m.name === metrics.best_model && <span className="text-amber-500">★</span>}
                      {m.name}
                    </td>
                    <td className="px-3 py-2 text-green-700 font-bold">{pct(m.accuracy)}</td>
                    <td className="px-3 py-2 text-blue-700 font-bold">{pct(m.precision)}</td>
                    <td className="px-3 py-2 text-purple-700 font-bold">{pct(m.recall)}</td>
                    <td className="px-3 py-2 text-amber-700 font-bold">{pct(m.f1)}</td>
                    <td className="px-3 py-2 text-slate-600">{m.roc_auc !== 'N/A' ? pct(m.roc_auc) : '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{m.cv_score ? pct(m.cv_score) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature names */}
      {metrics.feature_names && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Input Features ({metrics.feature_names.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {metrics.feature_names.map(f => (
              <span key={f} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-mono">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Dept comparison bar chart ─────────────────────────────────────────────────
const DeptChart = ({ deptData }) => {
  if (!deptData || !Object.keys(deptData).length)
    return <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No department data</div>;

  const labels   = Object.keys(deptData);
  const avgAtt   = labels.map(d => Number(deptData[d].avg_attendance  || 0).toFixed(1));
  const avgScore = labels.map(d => Number(deptData[d].avg_final_score || 0).toFixed(1));
  const hiRisk   = labels.map(d => {
    const dist = deptData[d]; const t = dist.total || 1;
    return Number(((dist.high || 0) / t * 100).toFixed(1));
  });

  const data = {
    labels,
    datasets: [
      { label:'Avg Attendance %', data: avgAtt,   backgroundColor:'rgba(59,130,246,0.7)',  borderRadius:5 },
      { label:'Avg Final Score',  data: avgScore, backgroundColor:'rgba(34,197,94,0.7)',   borderRadius:5 },
      { label:'High Risk %',      data: hiRisk,   backgroundColor:'rgba(239,68,68,0.6)',   borderRadius:5 },
    ],
  };
  return (
    <Bar data={data} options={{
      responsive:true,
      scales:{
        y:{ beginAtZero:true, max:100, ticks:{font:{size:11}}, grid:{color:'#F1F5F9'} },
        x:{ ticks:{font:{size:11}}, grid:{display:false} },
      },
      plugins:{
        legend:{ position:'top', labels:{font:{size:11},padding:12} },
        tooltip:{ callbacks:{ label: ctx => ` ${ctx.parsed.y}%` } },
      },
    }} />
  );
};

// ── Attendance trend bar ──────────────────────────────────────────────────────
const AttTrend = ({ students }) => {
  if (!students?.length) return null;
  const sorted = [...students].filter(s=>s.attendance_pct!=null)
    .sort((a,b) => b.attendance_pct - a.attendance_pct).slice(0,15);

  const data = {
    labels: sorted.map(s => (s.student_name||'?').split(' ')[0]),
    datasets:[{ label:'Attendance %',
      data: sorted.map(s => Number(s.attendance_pct||0).toFixed(1)),
      backgroundColor: sorted.map(s =>
        s.attendance_pct>=75?'rgba(34,197,94,0.7)':
        s.attendance_pct>=50?'rgba(245,158,11,0.7)':'rgba(239,68,68,0.7)'),
      borderRadius:5, borderWidth:0,
    }],
  };
  return (
    <Bar data={data} options={{
      responsive:true,
      scales:{
        y:{beginAtZero:true,max:100,ticks:{font:{size:10}},grid:{color:'#F1F5F9'}},
        x:{ticks:{font:{size:9}},grid:{display:false}},
      },
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.y}%`}} },
    }} />
  );
};

// ── Export helpers ────────────────────────────────────────────────────────────
const exportCSV = (rows, filename) => {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h]||'').replace(/"/g,'""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const printSection = () => window.print();

// ── Main component ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [analytics,  setAnalytics]  = useState(null);
  const [metrics,    setMetrics]    = useState(null);
  const [students,   setStudents]   = useState([]);
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState({ analytics:true, metrics:true, students:true, history:true });
  const [error,      setError]      = useState('');
  const [activeTab,  setActiveTab]  = useState('overview');  // overview | model | history

  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }));

  const loadAll = useCallback(async () => {
    setError('');

    setLoad('analytics', true);
    fetchAnalytics()
      .then(setAnalytics)
      .catch(() => setError('Analytics unavailable — check Sikhya Suchak API on port 8001.'))
      .finally(() => setLoad('analytics', false));

    setLoad('metrics', true);
    fetchModelMetrics()
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoad('metrics', false));

    setLoad('students', true);
    fetchAllStudents()
      .then(d => setStudents(Array.isArray(d) ? d : (d.students || [])))
      .catch(() => {})
      .finally(() => setLoad('students', false));

    setLoad('history', true);
    fetchPredictionHistory({ limit: 20 })
      .then(d => setHistory(d.predictions || []))
      .catch(() => {})
      .finally(() => setLoad('history', false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const riskDist  = analytics?.risk_distribution   || {};
  const deptBreak = analytics?.department_breakdown || {};
  const avgs      = analytics?.averages             || {};
  const totalStudents = analytics?.total_students   ?? students.length;

  const TABS = [
    { key: 'overview', label: '📊 Overview'       },
    { key: 'model',    label: '🤖 Model Metrics'   },
    { key: 'history',  label: '📜 Prediction Log'  },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 print:space-y-4" id="admin-dashboard-print">

      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] rounded-2xl p-6 text-white shadow-lg print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🏛️</div>
            <div>
              <h2 className="text-xl font-black">Admin Analytics Dashboard</h2>
              <p className="text-blue-200 text-sm mt-0.5">Sikhya Suchak — AI Performance Prediction System</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => exportCSV(history, 'prediction_history.csv')}
              className="px-3 py-2 bg-white/20 text-white text-xs font-bold rounded-xl hover:bg-white/30 transition-all border border-white/20">
              📥 Export CSV
            </button>
            <button onClick={printSection}
              className="px-3 py-2 bg-white/20 text-white text-xs font-bold rounded-xl hover:bg-white/30 transition-all border border-white/20">
              🖨️ Print
            </button>
            <button onClick={loadAll}
              className="px-3 py-2 bg-white/20 text-white text-xs font-bold rounded-xl hover:bg-white/30 transition-all border border-white/20">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
          <span>⚠️</span>
          <div>
            <p className="font-bold">{error}</p>
            <button onClick={loadAll} className="mt-1 text-xs underline font-semibold">Retry</button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit print:hidden">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.key ? 'bg-[#1E3A8A] text-white shadow' : 'text-slate-500 hover:text-slate-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {loading.analytics ? [1,2,3,4,5,6].map(i => <Skel key={i} h="h-24" />) : (
              <>
                <Tile icon="👥" label="Total Students"  value={totalStudents}                      color="blue"   />
                <Tile icon="🟢" label="Low Risk"        value={riskDist.low?.count ?? 0}           color="green"  />
                <Tile icon="🟡" label="Medium Risk"     value={riskDist.medium?.count ?? 0}        color="amber"  />
                <Tile icon="🔴" label="High Risk"       value={riskDist.high?.count ?? 0}          color="red"    />
                <Tile icon="📅" label="Avg Attendance"  value={avgs.attendance_pct != null ? pct(avgs.attendance_pct) : '—'} color="slate" />
                <Tile icon="🎯" label="Avg Score"       value={avgs.final_score    != null ? num(avgs.final_score)    : '—'} color="slate" />
              </>
            )}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <p className="text-sm font-bold text-slate-800 mb-4">Risk Distribution</p>
              {loading.analytics ? <Skel h="h-52" /> : (
                <RiskPieChart
                  low={riskDist.low?.count || 0}
                  medium={riskDist.medium?.count || 0}
                  high={riskDist.high?.count || 0}
                />
              )}
            </div>
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <p className="text-sm font-bold text-slate-800 mb-4">Department Comparison</p>
              {loading.analytics ? <Skel h="h-52" /> : <DeptChart deptData={deptBreak} />}
            </div>
          </div>

          {/* Attendance trend */}
          {students.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <p className="text-sm font-bold text-slate-800 mb-4">Attendance Distribution (Top 15)</p>
              {loading.students ? <Skel h="h-44" /> : <AttTrend students={students} />}
            </div>
          )}

          {/* Analytics cards */}
          {!loading.analytics && analytics && (
            <div>
              <p className="text-sm font-bold text-slate-800 mb-3">Detailed Risk Breakdown</p>
              <AnalyticsCards analytics={analytics} />
            </div>
          )}

          {/* Dept table */}
          {!loading.analytics && Object.keys(deptBreak).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-sm font-bold text-slate-800">Department Summary</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-gray-100">
                    <tr>{['Department','Students','Avg Attendance','Avg Score','High Risk %','Low Risk %'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(deptBreak).map(([dept, d]) => {
                      const t = d.total || 1;
                      return (
                        <tr key={dept} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-800">{dept}</td>
                          <td className="px-5 py-3 text-slate-600">{d.total ?? 0}</td>
                          <td className="px-5 py-3 text-slate-600">{d.avg_attendance?.toFixed(1) ?? '—'}%</td>
                          <td className="px-5 py-3 font-semibold text-slate-700">{d.avg_final_score?.toFixed(1) ?? '—'}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-bold ${(d.high||0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                              {((d.high||0)/t*100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-5 py-3"><span className="text-xs font-bold text-green-600">{((d.low||0)/t*100).toFixed(0)}%</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB: MODEL METRICS ── */}
      {activeTab === 'model' && (
        <>
          {loading.metrics ? <Skel h="h-80" /> : <ModelMetricsPanel metrics={metrics} />}
        </>
      )}

      {/* ── TAB: PREDICTION HISTORY ── */}
      {activeTab === 'history' && (
        <PredictionHistoryTable
          history={history}
          loading={loading.history}
          onExport={() => exportCSV(history, 'prediction_history.csv')}
          onRefresh={loadAll}
        />
      )}
    </div>
  );
};

// ── Prediction history table (used inside admin tab) ──────────────────────────
const PredictionHistoryTable = ({ history, loading, onExport, onRefresh }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <p className="text-sm font-bold text-slate-800">
        Prediction Log
        <span className="ml-2 text-xs font-normal text-slate-400">({history.length} shown)</span>
      </p>
      <div className="flex gap-2">
        <button onClick={onExport} className="text-xs text-blue-600 font-semibold hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-50">
          📥 Export CSV
        </button>
        <button onClick={onRefresh} className="text-xs text-slate-500 font-semibold hover:underline">
          ↻ Refresh
        </button>
      </div>
    </div>

    {loading ? (
      <div className="divide-y divide-gray-100 animate-pulse">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <div className="w-8 h-8 rounded-xl bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
            <div className="h-6 bg-gray-100 rounded-full w-20" />
          </div>
        ))}
      </div>
    ) : history.length === 0 ? (
      <div className="py-12 text-center">
        <div className="text-3xl mb-3">📊</div>
        <p className="text-sm text-slate-400">No predictions stored yet</p>
        <p className="text-xs text-slate-300 mt-1">Run ML predictions to see history here</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-gray-100">
            <tr>
              {['Date','Student','Department','Grade','Risk','Score','Confidence','Model'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {history.map(p => (
              <tr key={p.prediction_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(p.prediction_date)}</td>
                <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{p.student_name || p.student_id}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{p.department || '—'}</td>
                <td className="px-4 py-3 text-lg font-black text-slate-800">{p.predicted_grade}</td>
                <td className="px-4 py-3"><RiskBadge level={p.risk_level} size="sm" /></td>
                <td className="px-4 py-3 font-bold text-slate-700">{Number(p.final_score).toFixed(1)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{(p.confidence_score*100).toFixed(0)}%</td>
                <td className="px-4 py-3 text-xs text-slate-400">{p.model_used}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default AdminDashboard;
