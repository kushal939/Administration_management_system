import { useState, useEffect } from 'react';

const catIcon = { tuition:'🎓', bus:'🚌', library:'📚', lab:'🔬', hostel:'🏠', exam:'📝', sports:'⚽', general:'💳' };

const badge = {
  paid:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-blue-50 text-blue-700 border-blue-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

const fmtMoney = v => `Rs.${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate  = d => d ? new Date(d).toLocaleDateString() : '—';

const StudentFees = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState({ text: '', type: '' });
  const [esewaLoading, setEL]   = useState(null);
  const [splitModal, setSplit]  = useState(null);
  const [splitAmt, setSplitAmt] = useState('');

  const load = () => {
    if (!user?.studentId) return;
    setLoading(true);
    fetch(`/api/fees/student/${user.studentId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Handle eSewa redirect
    const params = new URLSearchParams(window.location.search);
    const esewaData = params.get('data');
    const esewaFail = params.get('esewa');
    if (esewaData) {
      fetch(`/api/fees/esewa/verify?data=${encodeURIComponent(esewaData)}`)
        .then(r => r.json())
        .then(d => {
          setMsg({ text: d.message || (d.success ? 'Payment successful!' : 'Verification failed'), type: d.success ? 'success' : 'error' });
          if (d.success) load();
        });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (esewaFail === 'failed') {
      setMsg({ text: 'Payment cancelled or failed.', type: 'error' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const pay = async (fee, customAmt) => {
    setEL(fee.id);
    try {
      const body = { feeId: fee.id, studentId: user.studentId };
      if (customAmt) body.splitAmount = customAmt;
      const res = await fetch('/api/fees/esewa/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!d.success) { setMsg({ text: d.message || 'Failed', type: 'error' }); return; }
      const p = d.data;
      const form = document.createElement('form');
      form.method = 'POST'; form.action = p.esewa_url;
      Object.entries({ amount: p.amount, tax_amount: p.tax_amount, total_amount: p.total_amount, transaction_uuid: p.transaction_uuid, product_code: p.product_code, product_service_charge: p.product_service_charge, product_delivery_charge: p.product_delivery_charge, success_url: p.success_url, failure_url: p.failure_url, signed_field_names: p.signed_field_names, signature: p.signature }).forEach(([k, v]) => {
        const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i);
      });
      document.body.appendChild(form); form.submit();
    } catch { setMsg({ text: 'Network error', type: 'error' }); }
    finally { setEL(null); }
  };

  const printReceipt = (fee, payment) => {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:480px;margin:0 auto}h2{text-align:center;border-bottom:2px solid #000;padding-bottom:10px}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:13px}.total{font-size:18px;font-weight:bold;text-align:center;margin-top:20px;padding:10px;border:2px solid #000}.footer{text-align:center;margin-top:24px;font-size:12px;color:#999}@media print{button{display:none}}</style></head><body><h2>Fee Receipt</h2><div class="row"><span>Student ID</span><span>${fee.studentId}</span></div><div class="row"><span>Description</span><span>${fee.description||'Fee'}</span></div><div class="row"><span>Category</span><span>${(fee.category||'general').toUpperCase()}</span></div><div class="row"><span>Method</span><span>${payment?.payment_method||'Cash'}</span></div><div class="row"><span>Transaction</span><span>${payment?.transaction_id||'—'}</span></div><div class="row"><span>Date</span><span>${payment?.payment_date?new Date(payment.payment_date).toLocaleDateString():new Date().toLocaleDateString()}</span></div><div class="total">Paid: Rs.${Number(fee.amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</div><div class="footer">Thank you for your payment</div><br/><button onclick="window.print()">Print</button></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" /></div>;

  const today    = new Date().toISOString().split('T')[0];
  const sfees    = data?.fees || [];
  const spay     = data?.paymentHistory || [];
  const summary  = data?.summary || { total: 0, paid: 0, unpaid: 0 };
  const overdue  = sfees.filter(f => !f.paid && f.due_date && f.due_date < today);
  const pending  = sfees.filter(f => !f.paid);
  const paid     = sfees.filter(f => f.paid);
  const pct      = summary.total > 0 ? Math.round((summary.paid / summary.total) * 100) : 0;
  const getStatus = f => f.paid ? 'paid' : Number(f.amount_paid) > 0 ? 'partial' : (f.due_date && f.due_date < today ? 'overdue' : 'pending');

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fee Account</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your fee records and payment history</p>
      </div>

      {/* Alert */}
      {msg.text && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium border ${msg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          <span>{msg.type === 'error' ? '⚠️' : '✓'}</span>
          <span className="flex-1">{msg.text}</span>
          <button onClick={() => setMsg({ text: '', type: '' })} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Balance card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Outstanding Balance</p>
            <p className={`text-4xl font-bold tracking-tight ${summary.unpaid > 0 ? 'text-gray-900' : 'text-emerald-600'}`}>
              {fmtMoney(summary.unpaid)}
            </p>
            {summary.unpaid === 0 && <p className="text-sm text-emerald-600 font-medium mt-1">All fees cleared ✓</p>}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl">💳</div>
        </div>

        {summary.total > 0 && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Payment progress</span>
              <span className="font-semibold">{pct}% paid</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-500' : 'bg-amber-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            ['Total Billed', fmtMoney(summary.total), 'text-gray-800'],
            ['Paid',         fmtMoney(summary.paid),  'text-emerald-600'],
            ['Pending',      fmtMoney(summary.unpaid), summary.unpaid > 0 ? 'text-red-500' : 'text-emerald-600'],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-gray-50 rounded-xl px-4 py-3 text-center">
              <p className={`text-base font-bold ${c}`}>{v}</p>
              <p className="text-xs text-gray-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-bold text-lg">!</div>
          <div>
            <p className="text-sm font-bold text-red-800">{overdue.length} overdue fee{overdue.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-red-500 mt-0.5">
              {fmtMoney(overdue.reduce((s, f) => s + Number(f.amount) - Number(f.amount_paid || 0), 0))} past due — please clear immediately
            </p>
          </div>
        </div>
      )}

      {/* Pending fees */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Pending Payments</p>
          <div className="space-y-3">
            {pending.map(f => {
              const st  = getStatus(f);
              const rem = Number(f.amount) - Number(f.amount_paid || 0);
              const pp  = Number(f.amount) > 0 ? Math.round((Number(f.amount_paid || 0) / Number(f.amount)) * 100) : 0;
              return (
                <div key={f.id} className={`bg-white border rounded-2xl p-5 shadow-sm ${st === 'overdue' ? 'border-red-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${st === 'overdue' ? 'bg-red-50' : 'bg-gray-50'}`}>
                        {catIcon[f.category] || '💳'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{f.description || 'Fee'}</p>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">
                          {f.category || 'general'}{f.due_date ? ` · Due ${fmtDate(f.due_date)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-gray-900">{fmtMoney(rem)}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge[st]}`}>
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </span>
                    </div>
                  </div>

                  {st === 'partial' && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{fmtMoney(f.amount_paid)} paid of {fmtMoney(f.amount)}</span>
                        <span>{pp}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pp}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => pay(f)} disabled={esewaLoading === f.id}
                      className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                      {esewaLoading === f.id && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Pay {fmtMoney(rem)}
                    </button>
                    <button onClick={() => { setSplit(f); setSplitAmt(''); }}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all">
                      Split
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paid fees */}
      {paid.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Paid Fees</p>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {paid.map((f, i) => {
              const payment = spay.find(p => p.fee_id === f.id);
              return (
                <div key={f.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/40 transition-colors ${i < paid.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-base">
                    {catIcon[f.category] || '💳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{f.description || 'Fee'}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {f.category || 'general'}{payment ? ` · ${fmtDate(payment.payment_date)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-600">{fmtMoney(f.amount)}</p>
                    <p className="text-xs text-emerald-500 font-medium">Paid ✓</p>
                  </div>
                  <button onClick={() => printReceipt(f, payment)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-200 shrink-0 transition-all">
                    Receipt
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment history */}
      {spay.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Payment History</p>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {spay.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-4 px-5 py-4 ${i < spay.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <span className="text-emerald-600 text-sm font-bold">✓</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 capitalize">{p.payment_method || 'Cash'} Payment</p>
                  <p className="text-xs font-mono text-gray-400 truncate mt-0.5">{p.transaction_id}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-emerald-600">{fmtMoney(p.amount)}</p>
                  <p className="text-xs text-gray-400">{fmtDate(p.payment_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sfees.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4">💳</div>
          <p className="text-gray-600 font-semibold">No fee records yet</p>
          <p className="text-gray-400 text-sm mt-1">Your fee records will appear here once assigned</p>
        </div>
      )}

      {/* Split modal */}
      {splitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm space-y-5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">💳</div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Partial Payment</h3>
                <p className="text-xs text-gray-500">{splitModal.description}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
              {[
                ['Total billed',  fmtMoney(splitModal.amount),                                                    'text-gray-800'],
                ['Already paid',  fmtMoney(splitModal.amount_paid || 0),                                          'text-emerald-600'],
                ['Remaining',     fmtMoney(Number(splitModal.amount) - Number(splitModal.amount_paid || 0)),       'text-red-500 font-bold'],
              ].map(([l, v, c]) => (
                <div key={l} className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-gray-500">{l}</span>
                  <span className={c}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Amount to pay now</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rs.</span>
                <input type="number" min="1"
                  max={Number(splitModal.amount) - Number(splitModal.amount_paid || 0)}
                  value={splitAmt} onChange={e => setSplitAmt(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-semibold" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => {
                const amt = parseFloat(splitAmt);
                const max = Number(splitModal.amount) - Number(splitModal.amount_paid || 0);
                if (!amt || amt <= 0 || amt > max) return;
                setSplit(null);
                pay(splitModal, amt);
              }} className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all">
                Pay via eSewa
              </button>
              <button onClick={() => setSplit(null)}
                className="px-5 py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFees;
