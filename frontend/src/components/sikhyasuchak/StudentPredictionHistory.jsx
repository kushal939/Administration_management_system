/**
 * StudentPredictionHistory.jsx  (Step 5 — Production Ready)
 * Location: src/components/sikhyasuchak/StudentPredictionHistory.jsx
 *
 * Shows prediction history for a student.
 * Primary source: FastAPI /predictions/history/{studentId} (SQLite backend).
 * Fallback: localStorage (from Step 4).
 * Features: filter by date, filter by risk, export CSV, print.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchStudentHistoryFromDB } from './api';
import RiskBadge from './RiskBadge';

const fmtDate = iso => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

const fmtDateShort = iso => {
  if (!iso) return '';
  try { return iso.slice(0, 10); } catch { return iso; }
};

const exportCSV = (rows, studentName) => {
  if (!rows?.length) return;
  const headers = ['date','predicted_grade','risk_level','final_score','confidence_score','model_used'];
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      fmtDateShort(r.prediction_date),
      r.predicted_grade,
      r.risk_level,
      Number(r.final_score).toFixed(1),
      (Number(r.confidence_score) * 100).toFixed(1) + '%',
      r.model_used,
    ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `predictions_${studentName || 'student'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const StudentPredictionHistory = ({ studentId, onClose }) => {
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [riskFilter, setRiskFilter] = useState('all');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [source,     setSource]     = useState('db');  // 'db' | 'local'

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStudentHistoryFromDB(studentId);
      const items = data.predictions || [];
      if (items.length > 0) {
        setHistory(items);
        setSource('db');
      } else {
        // Fallback to localStorage
        const local = JSON.parse(localStorage.getItem(`pred_history_${studentId}`) || '[]');
        setHistory(local);
        setSource('local');
      }
    } catch {
      // Fallback to localStorage
      const local = JSON.parse(localStorage.getItem(`pred_history_${studentId}`) || '[]');
      setHistory(local);
      setSource('local');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const clearLocal = () => {
    localStorage.removeItem(`pred_history_${studentId}`);
    setHistory([]);
    onClose();
  };

  // Apply filters
  const filtered = history.filter(h => {
    if (riskFilter !== 'all' && h.risk_level !== riskFilter) return false;
    if (dateFrom && fmtDateShort(h.prediction_date || h.timestamp) < dateFrom) return false;
    if (dateTo   && fmtDateShort(h.prediction_date || h.timestamp) > dateTo)   return false;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-bold text-slate-800">📜 Prediction History</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {source === 'db' ? '🟢 Synced from server' : '🟡 Local only'} · {history.length} records
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(filtered, studentId)}
            disabled={filtered.length === 0}
            className="text-xs text-blue-600 font-semibold hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-40">
            📥 Export CSV
          </button>
          {source === 'local' && history.length > 0 && (
            <button onClick={clearLocal}
              className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50">
              🗑 Clear
            </button>
          )}
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-slate-400 text-base">
            ✕
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-slate-50 border-b border-gray-100">
        {/* Risk filter */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {['all','low','medium','high'].map(f => (
            <button key={f} onClick={() => setRiskFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                riskFilter === f ? 'bg-[#1E3A8A] text-white shadow' : 'text-slate-500 hover:text-slate-800'
              }`}>
              {f === 'all' ? 'All Risk' : f}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          {(dateFrom || dateTo || riskFilter !== 'all') && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setRiskFilter('all'); }}
              className="text-xs text-slate-400 hover:text-slate-600 underline">Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="divide-y divide-gray-100 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-100 rounded w-8" />
              <div className="h-6 bg-gray-200 rounded-full w-20" />
              <div className="h-4 bg-gray-100 rounded w-12" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-3xl mb-3">📊</div>
          <p className="text-sm text-slate-400">No predictions match your filters</p>
          {history.length === 0 && (
            <p className="text-xs text-slate-300 mt-1">Run a prediction to see your history here</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr>
                {['#','Date','Grade','Risk','Score','Confidence','Model'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((entry, idx) => (
                <tr key={entry.prediction_id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-400 text-xs">{filtered.length - idx}</td>
                  <td className="px-5 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {fmtDate(entry.prediction_date || entry.timestamp)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xl font-black text-slate-800">{entry.predicted_grade ?? '—'}</span>
                  </td>
                  <td className="px-5 py-3"><RiskBadge level={entry.risk_level} size="sm" /></td>
                  <td className="px-5 py-3">
                    <span className={`text-sm font-bold ${
                      (entry.final_score ?? 0) >= 75 ? 'text-green-600' :
                      (entry.final_score ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {entry.final_score != null ? Number(entry.final_score).toFixed(1) : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    {entry.confidence_score != null
                      ? `${(Number(entry.confidence_score) * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">{entry.model_used ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentPredictionHistory;
