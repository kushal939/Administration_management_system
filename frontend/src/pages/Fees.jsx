import { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import StudentFees from './StudentFees';

const Fees = () => {
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [payingFee, setPayingFee] = useState(null);
  const [installmentFee, setInstallmentFee] = useState(null);
  const [applyingTemplate, setApplyingTemplate] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteFeeData, setDeleteFeeData] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [selectedFees, setSelectedFees] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const role = (user && user.role) ? String(user.role).toLowerCase() : 'student';
  const categoryOptions = ['all','tuition','bus','library','lab','hostel','exam','sports','general'];

  // Student view — delegate to StudentFees component
  if (role === 'student') return <StudentFees />;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [fRes, sRes, dRes, cRes, tRes, aRes] = await Promise.all([
        fetch('/api/fees'), fetch('/api/students'), fetch('/api/departments'),
        fetch('/api/courses'), fetch('/api/fees/templates'), fetch('/api/fees/analytics')
      ]);
      const [fD, sD, dD, cD, tD, aD] = await Promise.all([fRes.json(), sRes.json(), dRes.json(), cRes.json(), tRes.json(), aRes.json()]);
      if (fD.success) setFees(fD.data || []);
      if (sD.success) setStudents(sD.data || []);
      if (dD.success) setDepartments(dD.data || []);
      if (cD.success) setCourses(cD.data || []);
      if (tD.success) setTemplates(tD.data || []);
      if (aD.success) setAnalytics(aD.data);
    } catch (e) { setErrorMessage('Network error loading data'); }
    finally { setIsLoading(false); }
  };

  const studentMap = {};
  students.forEach(s => { if (s.studentId) studentMap[s.studentId] = s.name || s.email; });
  const fmtMoney = v => `Rs.${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fmtDate = d => d ? new Date(d).toLocaleDateString() : '-';

  const filteredFees = fees.filter(f => {
    if (filterCategory !== 'all' && (f.category||'general') !== filterCategory) return false;
    if (filterStatus === 'paid' && !f.paid) return false;
    if (filterStatus === 'unpaid' && f.paid) return false;
    if (filterOverdue) { const t = new Date().toISOString().split('T')[0]; if (f.paid||!f.due_date||f.due_date>=t) return false; }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const sn = (studentMap[f.studentId]||'').toLowerCase();
      if (!sn.includes(term) && !(f.studentId||'').toLowerCase().includes(term) && !(f.description||'').toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const totalAmount = filteredFees.reduce((s,f) => s+Number(f.amount),0);
  const unpaidAmount = filteredFees.reduce((s,f) => s+(f.paid?0:Number(f.amount)),0);
  const paidCount = filteredFees.filter(f=>f.paid).length;
  const unpaidCount = filteredFees.filter(f=>!f.paid).length;

  const handleAddFee = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch('/api/fees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId:fd.get('studentId'),amount:parseFloat(fd.get('amount')),description:fd.get('description'),category:fd.get('category'),due_date:fd.get('due_date')})});
      const d = await res.json();
      if (d.success) { setSuccessMessage('Fee added!'); setTimeout(()=>setSuccessMessage(''),3000); setShowAddModal(false); loadAll(); }
      else setErrorMessage(d.message||'Failed');
    } catch { setErrorMessage('Network error'); }
  };

  const handleBulkFee = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch('/api/fees/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:parseFloat(fd.get('amount')),description:fd.get('description'),category:fd.get('category'),due_date:fd.get('due_date'),filter:{type:fd.get('filterType'),value:fd.get('filterValue')}})});
      const d = await res.json();
      if (d.success) { setSuccessMessage(d.message||'Done!'); setTimeout(()=>setSuccessMessage(''),3000); setShowBulkModal(false); loadAll(); }
      else setErrorMessage(d.message||'Failed');
    } catch { setErrorMessage('Network error'); }
  };

  const handleUpdateFee = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch(`/api/fees/${editingFee.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId:fd.get('studentId'),amount:parseFloat(fd.get('amount')),description:fd.get('description'),category:fd.get('category'),due_date:fd.get('due_date'),paid:editingFee.paid})});
      const d = await res.json();
      if (d.success) { setSuccessMessage('Updated!'); setTimeout(()=>setSuccessMessage(''),3000); setShowEditModal(false); setEditingFee(null); loadAll(); }
      else setErrorMessage(d.message||'Failed');
    } catch { setErrorMessage('Network error'); }
  };

  const handleDeleteFee = (feeId, studentId) => { setDeleteFeeData({feeId,studentId}); setShowDeleteModal(true); };
  const confirmDeleteFee = async () => {
    if (!deleteFeeData) return;
    try {
      const res = await fetch(`/api/fees/${deleteFeeData.feeId}`,{method:'DELETE'});
      const d = await res.json();
      if (d.success) { setToastMessage('Deleted!'); setToastType('success'); setShowToast(true); loadAll(); }
      else setErrorMessage(d.message||'Failed');
    } catch { setErrorMessage('Network error'); }
    finally { setDeleteFeeData(null); }
  };

  const handlePayment = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch(`/api/fees/${payingFee.id}/pay`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payment_method:fd.get('payment_method'),transaction_id:fd.get('transaction_id'),payment_date:fd.get('payment_date'),notes:fd.get('notes')})});
      const d = await res.json();
      if (d.success) { setSuccessMessage(`Payment recorded! TXN: ${d.data.transaction_id}`); setTimeout(()=>setSuccessMessage(''),5000); setShowPaymentModal(false); setPayingFee(null); loadAll(); }
      else setErrorMessage(d.message||'Failed');
    } catch { setErrorMessage('Network error'); }
  };

  const handleInstallment = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch(`/api/fees/${installmentFee.id}/installment`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({num_installments:parseInt(fd.get('num_installments')),start_date:fd.get('start_date')})});
      const d = await res.json();
      if (d.success) { setSuccessMessage(d.message||'Done!'); setTimeout(()=>setSuccessMessage(''),3000); setShowInstallmentModal(false); setInstallmentFee(null); loadAll(); }
      else setErrorMessage(d.message||'Failed');
    } catch { setErrorMessage('Network error'); }
  };

  const handleCreateTemplate = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch('/api/fees/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),amount:parseFloat(fd.get('amount')),description:fd.get('description'),category:fd.get('category'),default_due_days:parseInt(fd.get('default_due_days'))})});
      const d = await res.json();
      if (d.success) { setSuccessMessage('Template created!'); setTimeout(()=>setSuccessMessage(''),3000); setShowTemplateModal(false); loadAll(); }
      else setErrorMessage(d.message||'Failed');
    } catch { setErrorMessage('Network error'); }
  };

  const handleApplyTemplate = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch(`/api/fees/templates/${applyingTemplate.id}/apply`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filter:{type:fd.get('filterType'),value:fd.get('filterValue')}})});
      const d = await res.json();
      if (d.success) { setSuccessMessage(d.message||'Applied!'); setTimeout(()=>setSuccessMessage(''),3000); setShowApplyTemplateModal(false); setApplyingTemplate(null); loadAll(); }
      else setErrorMessage(d.message||'Failed');
    } catch { setErrorMessage('Network error'); }
  };

  const handleSelectAll = () => { if (selectAll) { setSelectedFees([]); setSelectAll(false); } else { setSelectedFees(filteredFees.map(f=>f.id)); setSelectAll(true); } };
  const handleSelectOne = feeId => {
    if (selectedFees.includes(feeId)) { setSelectedFees(selectedFees.filter(id=>id!==feeId)); setSelectAll(false); }
    else { const n=[...selectedFees,feeId]; setSelectedFees(n); if(n.length===filteredFees.length) setSelectAll(true); }
  };
  const handleBulkDelete = () => { if(selectedFees.length===0){setErrorMessage('No fees selected');return;} setShowBulkDeleteModal(true); };
  const confirmBulkDelete = async () => {
    try {
      const res = await fetch('/api/fees/bulk',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:selectedFees})});
      const d = await res.json();
      if (d.success) { setToastMessage(`Deleted ${d.deletedCount} record(s)!`); setToastType('success'); setShowToast(true); setSelectedFees([]); setSelectAll(false); loadAll(); }
      else setErrorMessage(d.message||'Failed');
    } catch { setErrorMessage('Network error'); }
  };

  const printReceipt = (fee, payment) => {
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:480px;margin:0 auto}h2{text-align:center;border-bottom:2px solid #000;padding-bottom:10px}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:13px}.total{font-size:18px;font-weight:bold;text-align:center;margin-top:20px;padding:10px;border:2px solid #000}.footer{text-align:center;margin-top:24px;font-size:12px;color:#999}@media print{button{display:none}}</style></head><body><h2>Fee Receipt</h2><div class="row"><span>Student ID</span><span>${fee.studentId}</span></div><div class="row"><span>Description</span><span>${fee.description||'Fee'}</span></div><div class="row"><span>Category</span><span>${(fee.category||'general').toUpperCase()}</span></div><div class="row"><span>Method</span><span>${payment?.payment_method||'Cash'}</span></div><div class="row"><span>Transaction</span><span>${payment?.transaction_id||'—'}</span></div><div class="row"><span>Date</span><span>${payment?.payment_date?new Date(payment.payment_date).toLocaleDateString():new Date().toLocaleDateString()}</span></div><div class="total">Paid: Rs.${Number(fee.amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</div><div class="footer">Thank you for your payment</div><br/><button onclick="window.print()">Print</button></body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>w.print(),300);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fees Management</h1>
            <p className="text-gray-500 text-sm mt-1">Fee tracking and payment management</p>
          </div>
          <div className="flex gap-2">
            {['list','analytics','templates'].map(m => (
              <button key={m} onClick={()=>setViewMode(m)} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all capitalize ${viewMode===m?'bg-gray-900 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      {errorMessage && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center justify-between"><p className="font-medium">{errorMessage}</p><button onClick={()=>setErrorMessage('')} className="text-sm underline">Dismiss</button></div>}
      {successMessage && <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg"><p className="font-medium">{successMessage}</p></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[['Total Amount',fmtMoney(analytics?.total||totalAmount),'💵','All fees combined'],['Paid',fmtMoney(analytics?.paid||(totalAmount-unpaidAmount)),'✓',`${paidCount} records`],['Unpaid',fmtMoney(analytics?.unpaid||unpaidAmount),'⏳',`${unpaidCount} records`],['Overdue',fmtMoney(analytics?.overdue||0),'⚠️','Past due date']].map(([t,v,i,s])=>(
          <div key={t} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div><div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t}</div><div className="text-2xl font-bold text-gray-900 mt-1">{v}</div><div className="text-xs text-gray-500 mt-1">{s}</div></div>
              <div className="bg-gray-100 rounded-lg p-3"><span className="text-2xl">{i}</span></div>
            </div>
          </div>
        ))}
      </div>

      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          {(role==='admin'||role==='principal') && (
            <div className="mb-6 flex gap-3 flex-wrap items-center justify-between">
              <div className="flex gap-3 flex-wrap">
                <button onClick={()=>setShowAddModal(true)} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-medium text-sm">+ Add Fee</button>
                <button onClick={()=>setShowBulkModal(true)} className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 font-medium text-sm">Bulk Create</button>
                <button onClick={()=>setShowTemplateModal(true)} className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 font-medium text-sm">New Template</button>
              </div>
              {selectedFees.length>0 && <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm">Delete Selected ({selectedFees.length})</button>}
            </div>
          )}

          <div className="mb-4 flex flex-wrap gap-3">
            <input type="text" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-48"/>
            <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400">
              {categoryOptions.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400">
              <option value="all">All Status</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={filterOverdue} onChange={e=>setFilterOverdue(e.target.checked)} className="rounded"/>Overdue only
            </label>
          </div>

          {isLoading ? <div className="text-center py-8 text-gray-500">Loading...</div> : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 text-left"><input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded"/></th>
                    {['Student','Description','Category','Amount','Due Date','Status','Actions'].map(h=><th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFees.length===0 ? (
                    <tr><td colSpan="8" className="py-12 text-center text-gray-500">No fees found</td></tr>
                  ) : filteredFees.map(f => {
                    const today = new Date().toISOString().split('T')[0];
                    const isOverdue = !f.paid && f.due_date && f.due_date < today;
                    return (
                      <tr key={f.id} className={`hover:bg-gray-50 transition-colors ${isOverdue?'bg-red-50/30':''}`}>
                        <td className="py-3 px-4"><input type="checkbox" checked={selectedFees.includes(f.id)} onChange={()=>handleSelectOne(f.id)} className="rounded"/></td>
                        <td className="py-3 px-4"><div className="font-medium text-gray-800 text-sm">{studentMap[f.studentId]||f.studentId}</div><div className="text-xs text-gray-500">{f.studentId}</div></td>
                        <td className="py-3 px-4 text-sm text-gray-700">{f.description||'—'}</td>
                        <td className="py-3 px-4"><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{(f.category||'general').toUpperCase()}</span></td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-900">{fmtMoney(f.amount)}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{fmtDate(f.due_date)}</td>
                        <td className="py-3 px-4">
                          {f.paid ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Paid</span>
                          : isOverdue ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Overdue</span>
                          : <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Pending</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1 flex-wrap">
                            {!f.paid && (role==='admin'||role==='principal') && <button onClick={()=>{setPayingFee(f);setShowPaymentModal(true);}} className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 font-medium">Pay</button>}
                            {(role==='admin'||role==='principal') && <button onClick={()=>{setEditingFee(f);setShowEditModal(true);}} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-medium">Edit</button>}
                            {(role==='admin'||role==='principal') && <button onClick={()=>handleDeleteFee(f.id,f.studentId)} className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-medium">Del</button>}
                            {f.paid && <button onClick={()=>printReceipt(f,null)} className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 font-medium">Receipt</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {viewMode === 'analytics' && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Fee Collection Overview</h3>
            <div className="space-y-3">
              {[['Total Billed',analytics.total,'bg-blue-500'],['Collected',analytics.paid,'bg-green-500'],['Pending',analytics.unpaid,'bg-amber-500'],['Overdue',analytics.overdue,'bg-red-500']].map(([l,v,c])=>(
                <div key={l}><div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{l}</span><span className="font-semibold">{fmtMoney(v)}</span></div>
                <div className="h-2 bg-gray-100 rounded-full"><div className={`h-2 ${c} rounded-full`} style={{width:`${analytics.total>0?Math.min((v/analytics.total)*100,100):0}%`}}/></div></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">By Category</h3>
            <div className="space-y-2">
              {(analytics.categories||[]).map(c=>(
                <div key={c.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div><p className="font-medium text-sm capitalize">{c.category}</p><p className="text-xs text-gray-500">{c.count} records</p></div>
                  <div className="text-right"><p className="font-semibold text-sm">{fmtMoney(c.total)}</p><p className="text-xs text-green-600">{fmtMoney(c.paid_amount)} paid</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'templates' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Fee Templates</h3>
            <button onClick={()=>setShowTemplateModal(true)} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-medium text-sm">+ New Template</button>
          </div>
          {templates.length===0 ? <p className="text-gray-500 text-center py-8">No templates yet</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(t=>(
                <div key={t.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900">{t.name}</h4>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">{t.category}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{fmtMoney(t.amount)}</p>
                  <p className="text-sm text-gray-500 mb-3">{t.description}</p>
                  <button onClick={()=>{setApplyingTemplate(t);setShowApplyTemplateModal(true);}} className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-medium text-sm">Apply Template</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Fee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Fee</h3>
            <form onSubmit={handleAddFee} className="space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Student ID *</label><select name="studentId" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"><option value="">Select student</option>{students.map(s=><option key={s.id} value={s.studentId}>{s.name} ({s.studentId})</option>)}</select></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Amount *</label><input type="number" name="amount" step="0.01" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"/></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Description</label><input type="text" name="description" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"/></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Category</label><select name="category" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400">{['tuition','bus','library','lab','hostel','exam','sports','general'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label><input type="date" name="due_date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"/></div>
              <div className="flex gap-3 pt-2"><button type="submit" className="flex-1 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-semibold">Add Fee</button><button type="button" onClick={()=>setShowAddModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && payingFee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-1">Record Payment</h3>
            <p className="text-sm text-gray-500 mb-4">{payingFee.description} — {fmtMoney(payingFee.amount)}</p>
            <form onSubmit={handlePayment} className="space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Payment Method</label><select name="payment_method" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="esewa">eSewa</option></select></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Transaction ID</label><input type="text" name="transaction_id" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"/></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Payment Date</label><input type="date" name="payment_date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"/></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label><input type="text" name="notes" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"/></div>
              <div className="flex gap-3 pt-2"><button type="submit" className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">Record Payment</button><button type="button" onClick={()=>{setShowPaymentModal(false);setPayingFee(null);}} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={showDeleteModal} onClose={()=>{setShowDeleteModal(false);setDeleteFeeData(null);}} onConfirm={confirmDeleteFee} title="Delete Fee" message="Are you sure you want to delete this fee record?" confirmText="Delete" confirmColor="red"/>
      <ConfirmModal isOpen={showBulkDeleteModal} onClose={()=>setShowBulkDeleteModal(false)} onConfirm={confirmBulkDelete} title="Delete Selected Fees" message={`Delete ${selectedFees.length} fee record(s)?`} confirmText="Delete All" confirmColor="red"/>
      <Toast message={toastMessage} type={toastType} isVisible={showToast} onClose={()=>setShowToast(false)}/>
    </div>
  );
};

export default Fees;
