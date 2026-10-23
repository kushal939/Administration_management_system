import { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import AdminBatchERP from './AdminBatchERP';
import StudentAvatar from '../components/StudentAvatar';

// Small inline component for assigning a single orphaned student to a specific batch
const OrphanAssignRow = ({ student, deptBatches, onAssigned }) => {
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    if (!selectedBatchId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/batches/${selectedBatchId}/assign-students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify({ studentIds: [student.id] })
      });
      const d = await res.json();
      if (d.success) onAssigned();
    } catch (e) { console.error(e); }
    finally { setAssigning(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedBatchId}
        onChange={e => setSelectedBatchId(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-gray-400 max-w-[160px]"
      >
        <option value="">Pick batch...</option>
        {deptBatches.map(b => (
          <option key={b.id} value={b.id}>{b.batch_name}</option>
        ))}
      </select>
      <button
        onClick={handleAssign}
        disabled={!selectedBatchId || assigning}
        className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
      >
        {assigning ? '...' : 'Assign'}
      </button>
    </div>
  );
};

const AdminBatchManagement = () => {
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [error, setError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteBatchData, setDeleteBatchData] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const [selectedBatches, setSelectedBatches] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Phase 1: Student Management States
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerTab, setDrawerTab] = useState('enrolled'); // 'enrolled' | 'add' | 'transfer'
  const [transferableStudents, setTransferableStudents] = useState([]);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [showOrphanedDrawer, setShowOrphanedDrawer] = useState(false);
  const [orphanedStudents, setOrphanedStudents] = useState([]);
  const [showAllStudentsDrawer, setShowAllStudentsDrawer] = useState(false);
  const [allStudentsList, setAllStudentsList] = useState([]);
  const [allStudentsSearch, setAllStudentsSearch] = useState('');

  // Phase 2: Lifecycle Management States
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // ERP drill-down � persisted in sessionStorage so refresh stays on ERP view
  const [erpBatchId, setErpBatchIdRaw] = useState(() => {
    const saved = sessionStorage.getItem('erpBatchId');
    return saved ? parseInt(saved) : null;
  });

  const setErpBatchId = (id) => {
    if (id) sessionStorage.setItem('erpBatchId', id);
    else sessionStorage.removeItem('erpBatchId');
    setErpBatchIdRaw(id);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  const [cloneBatchData, setCloneBatchData] = useState({ batch_name: '', copy_students: false });

  const [formData, setFormData] = useState({
    batch_name: '',
    department: '',
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 4,
    total_semesters: 8
  });

  useEffect(() => {
    fetchBatches();
    fetchDepartments();
    fetchOrphanedCount();
  }, []);

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/batches', {
        headers: { 'x-user-role': 'admin' }
      });
      const data = await response.json();
      if (data.success) {
        setBatches(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      setError('Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchOrphanedCount = async () => {
    try {
      const res = await fetch('/api/admin/batches/orphaned-students', { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      if (data.success) setOrphanedCount(data.count || 0);
    } catch (e) { console.error(e); }
  };

  const handleViewOrphaned = async () => {
    setShowOrphanedDrawer(true);
    try {
      const res = await fetch('/api/admin/batches/orphaned-students', { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      if (data.success) setOrphanedStudents(data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleAutoAssign = async () => {
    try {
      const res = await fetch('/api/admin/batches/auto-assign', {
        method: 'POST',
        headers: { 'x-user-role': 'admin', 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message);
        setToastType('success');
        setShowToast(true);
        fetchBatches();
        fetchOrphanedCount();
        if (showOrphanedDrawer) handleViewOrphaned();
      } else {
        setToastMessage(data.message || 'Auto-assign failed');
        setToastType('error');
        setShowToast(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleViewAllStudents = async () => {
    setShowAllStudentsDrawer(true);
    try {
      const res = await fetch('/api/admin/batches/all-students', { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      if (data.success) setAllStudentsList(data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleFetchTransferable = async (batch) => {
    setIsLoadingStudents(true);
    try {
      const res = await fetch(`/api/admin/batches/${batch.id}/transferable-students`, { headers: { 'x-user-role': 'admin' } });
      const data = await res.json();
      if (data.success) setTransferableStudents(data.data || []);
    } catch (e) { console.error(e); } finally { setIsLoadingStudents(false); }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage('Batch created successfully!');
        setToastType('success');
        setShowToast(true);
        setShowCreateModal(false);
        setFormData({
          batch_name: '',
          department: '',
          start_year: new Date().getFullYear(),
          end_year: new Date().getFullYear() + 4,
          total_semesters: 8
        });
        fetchBatches();
      } else {
        setError(data.message || 'Failed to create batch');
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      setError('Network error. Please try again.');
    }
  };

  const handleEditBatch = (batch) => {
    setEditingBatch(batch);
    setFormData({
      batch_name: batch.batch_name,
      department: batch.department,
      start_year: batch.start_year,
      end_year: batch.end_year
    });
    setShowEditModal(true);
  };

  const handleUpdateBatch = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`/api/admin/batches/${editingBatch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ batch_name: formData.batch_name })
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage('Batch updated successfully!');
        setToastType('success');
        setShowToast(true);
        setShowEditModal(false);
        setEditingBatch(null);
        fetchBatches();
      } else {
        setError(data.message || 'Failed to update batch');
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      setError('Network error. Please try again.');
    }
  };

  const handleDeleteBatch = (batch) => {
    setDeleteBatchData(batch);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteBatchData) return;

    try {
      const response = await fetch(`/api/admin/batches/${deleteBatchData.id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'admin' }
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage('Batch deleted successfully!');
        setToastType('success');
        setShowToast(true);
        fetchBatches();
      } else {
        setError(data.message || 'Failed to delete batch');
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      setError('Network error. Please try again.');
    } finally {
      setDeleteBatchData(null);
    }
  };

  const handleSelectBatch = (batchId) => {
    if (selectedBatches.includes(batchId)) {
      setSelectedBatches(selectedBatches.filter(id => id !== batchId));
    } else {
      setSelectedBatches([...selectedBatches, batchId]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedBatches.length === 0) {
      setError('Please select at least one batch');
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const response = await fetch('/api/admin/batches/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ ids: selectedBatches })
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage(`${selectedBatches.length} batch(es) deleted successfully!`);
        setToastType('success');
        setShowToast(true);
        setSelectedBatches([]);
        fetchBatches();
      } else {
        setError(data.message || 'Failed to delete batches');
      }
    } catch (error) {
      console.error('Error deleting batches:', error);
      setError('Failed to delete batches');
    } finally {
      setShowBulkDeleteModal(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Phase 1: Student Management Functions
  const handleViewStudents = async (batch) => {
    setCurrentBatch(batch);
    setIsLoadingStudents(true);
    setShowStudentsModal(true);
    setShowAssignModal(false);
    setSelectedStudents([]);
    setAvailableStudents([]);
    setTransferableStudents([]);
    setDrawerSearch('');
    setDrawerTab('enrolled');
    
    try {
      const response = await fetch(`/api/admin/batches/${batch.id}/students`, {
        headers: { 'x-user-role': 'admin' }
      });
      const data = await response.json();
      
      if (data.success) {
        setBatchStudents(data.data || []);
      } else {
        setError(data.message || 'Failed to load students');
      }
    } catch (error) {
      console.error('Error fetching batch students:', error);
      setError('Failed to load students');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleOpenAssignModal = async (batch) => {
    setCurrentBatch(batch);
    setIsLoadingStudents(true);
    setShowAssignModal(true);
    
    try {
      const response = await fetch('/api/admin/batches/unassigned-students', {
        headers: { 'x-user-role': 'admin' }
      });
      const data = await response.json();
      
      if (data.success) {
        // Filter to only show students matching the batch's department
        const filtered = (data.data || []).filter(s =>
          !batch.department || !s.department || s.department === batch.department
        );
        setAvailableStudents(filtered);
      } else {
        setError(data.message || 'Failed to load students');
      }
    } catch (error) {
      console.error('Error fetching available students:', error);
      setError('Failed to load students');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleAssignStudents = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student');
      return;
    }

    try {
      const response = await fetch(`/api/admin/batches/${currentBatch.id}/assign-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ studentIds: selectedStudents })
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage(`${selectedStudents.length} student(s) assigned successfully!`);
        setToastType('success');
        setShowToast(true);
        setShowAssignModal(false);
        setSelectedStudents([]);
        fetchBatches();
        fetchOrphanedCount();
        // Refresh enrolled list
        handleViewStudents(currentBatch);
      } else {
        setError(data.message || 'Failed to assign students');
      }
    } catch (error) {
      console.error('Error assigning students:', error);
      setError('Failed to assign students');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      const response = await fetch(`/api/admin/batches/${currentBatch.id}/remove-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ studentIds: [studentId] })
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage('Student removed from batch successfully!');
        setToastType('success');
        setShowToast(true);
        // Refresh student list, batch counts, and unassigned card
        handleViewStudents(currentBatch);
        fetchBatches();
        fetchOrphanedCount();
      } else {
        setError(data.message || 'Failed to remove student');
      }
    } catch (error) {
      console.error('Error removing student:', error);
      setError('Failed to remove student');
    }
  };

  const toggleStudentSelection = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  // Phase 2: Lifecycle Management Functions
  const handleChangeStatus = (batch) => {
    setCurrentBatch(batch);
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    console.log('Updating status to:', newStatus);
    console.log('Current batch:', currentBatch);
    
    try {
      const response = await fetch(`/api/admin/batches/${currentBatch.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      console.log('Response:', data);

      if (data.success) {
        setToastMessage(`Batch status updated to ${newStatus}!`);
        setToastType('success');
        setShowToast(true);
        setShowStatusModal(false);
        fetchBatches();
      } else {
        console.error('Update failed:', data.message);
        setToastMessage(data.message || 'Failed to update status');
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setToastMessage('Failed to update status');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleOpenCloneModal = (batch) => {
    setCurrentBatch(batch);
    // Auto-generate new batch name
    const yearMatch = batch.batch_name.match(/(\d{4})/);
    let suggestedName = batch.batch_name;
    if (yearMatch) {
      const oldYear = parseInt(yearMatch[1]);
      const newYear = oldYear + 1;
      suggestedName = batch.batch_name.replace(oldYear.toString(), newYear.toString());
    } else {
      suggestedName = `${batch.batch_name} (Copy)`;
    }
    setCloneBatchData({ batch_name: suggestedName, copy_students: false });
    setShowCloneModal(true);
  };

  // Phase 3: Export Functions
  const handleExportAll = async () => {
    try {
      const response = await fetch('/api/admin/batches/export', {
        headers: { 'x-user-role': 'admin' }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batches_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setToastMessage('Batches exported successfully!');
        setToastType('success');
        setShowToast(true);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting batches:', error);
      setToastMessage('Failed to export batches');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleExportBatchStudents = async (batchId, batchName) => {
    try {
      const response = await fetch(`/api/admin/batches/${batchId}/export-students`, {
        headers: { 'x-user-role': 'admin' }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${batchName.replace(/\s+/g, '_')}_students_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setToastMessage('Students exported successfully!');
        setToastType('success');
        setShowToast(true);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting students:', error);
      setToastMessage('Failed to export students');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleCloneBatch = async () => {
    try {
      const response = await fetch(`/api/admin/batches/${currentBatch.id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify(cloneBatchData)
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage('Batch cloned successfully!');
        setToastType('success');
        setShowToast(true);
        setShowCloneModal(false);
        fetchBatches();
      } else {
        setError(data.message || 'Failed to clone batch');
      }
    } catch (error) {
      console.error('Error cloning batch:', error);
      setError('Failed to clone batch');
    }
  };

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = searchQuery === '' || 
      batch.batch_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDepartment === '' || batch.department === filterDepartment;
    const matchesStatus = filterStatus === '' || batch.status === filterStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  // Department-first view state
  const [selectedDept, setSelectedDept] = useState(null);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptFormData, setDeptFormData] = useState({ name: '', code: '' });
  const [deptFormLoading, setDeptFormLoading] = useState(false);

  // Unique departments derived from both the departments list and batches
  const allDeptNames = [...new Set([
    ...departments.map(d => d.name),
    ...batches.map(b => b.department).filter(Boolean)
  ])];

  const deptList = allDeptNames.map(name => {
    const deptObj = departments.find(d => d.name === name);
    const deptBatches = batches.filter(b => b.department === name);
    return {
      id: deptObj?.id,
      name,
      code: deptObj?.code || '',
      batches: deptBatches,
      activeCount: deptBatches.filter(b => b.status === 'active').length,
      studentCount: deptBatches.reduce((s, b) => s + (b.student_count || 0), 0),
    };
  });

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptFormData.name.trim()) return;
    setDeptFormLoading(true);
    try {
      const url = editingDept ? `/api/departments/${editingDept.id}` : '/api/departments';
      const method = editingDept ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deptFormData.name.trim(), code: deptFormData.code.trim() || null })
      });
      const d = await res.json();
      if (d.success) {
        setToastMessage(editingDept ? 'Department updated!' : 'Department created!');
        setToastType('success');
        setShowToast(true);
        setShowDeptForm(false);
        setEditingDept(null);
        setDeptFormData({ name: '', code: '' });
        fetchDepartments();
      } else {
        setError(d.message || 'Failed to save department');
      }
    } catch (err) { setError('Network error'); }
    finally { setDeptFormLoading(false); }
  };

  const handleDeleteDept = async (dept) => {
    if (dept.batches.length > 0) {
      setError(`Cannot delete "${dept.name}" — it has ${dept.batches.length} batch(es). Delete or reassign them first.`);
      return;
    }
    if (!dept.id) { setError('Department not found in database'); return; }
    if (!window.confirm(`Delete department "${dept.name}"?`)) return;
    try {
      const res = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        setToastMessage('Department deleted');
        setToastType('success');
        setShowToast(true);
        if (selectedDept === dept.name) setSelectedDept(null);
        fetchDepartments();
      } else setError(d.message || 'Failed to delete');
    } catch (err) { setError('Network error'); }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);


  // Batches for selected dept, filtered by search/status
  const visibleBatches = selectedDept
    ? batches.filter(b => {
        const matchesDept = b.department === selectedDept;
        const matchesSearch = !searchQuery || b.batch_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !filterStatus || b.status === filterStatus;
        return matchesDept && matchesSearch && matchesStatus;
      })
    : [];

  const totalBatches = batches.length;
  const activeBatches = batches.filter(b => b.status === 'active').length;

  return (
    <div className="space-y-5 bg-gray-100 min-h-screen -m-6 p-6">
      {erpBatchId && <AdminBatchERP batchId={erpBatchId} onBack={() => setErpBatchId(null)} />}
      {!erpBatchId && (<>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 shadow">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Batch Management</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-medium tracking-wide uppercase">Departments → Batches → Students</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium border border-gray-200 text-sm hover:bg-gray-200 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export
            </button>
            <button onClick={() => { setShowDeptForm(true); setEditingDept(null); setDeptFormData({ name: '', code: '' }); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium border border-gray-200 text-sm hover:bg-gray-200 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Department
            </button>
            <button onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold text-sm hover:bg-gray-700 transition-all shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create Batch
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Departments</p>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{deptList.length}</p>
          <p className="text-xs text-gray-400 mt-1">Total departments</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Batches</p>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalBatches}</p>
          <p className="text-xs text-gray-400 mt-1">{activeBatches} active</p>
        </div>
        <div onClick={handleViewAllStudents}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow cursor-pointer hover:border-gray-400 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Students</p>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-all">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{batches.reduce((s, b) => s + (b.student_count || 0), 0)}</p>
          <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-600 transition-colors">Click to view all →</p>
        </div>
        <div onClick={orphanedCount > 0 ? handleViewOrphaned : undefined}
          className={`bg-white border rounded-xl p-5 shadow transition-all ${orphanedCount > 0 ? 'border-amber-200 cursor-pointer hover:border-amber-400 hover:shadow-md group' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unassigned</p>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${orphanedCount > 0 ? 'bg-amber-50 group-hover:bg-amber-100' : 'bg-gray-100'} transition-all`}>
              <svg className={`w-4 h-4 ${orphanedCount > 0 ? 'text-amber-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
          </div>
          <p className={`text-3xl font-bold ${orphanedCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{orphanedCount}</p>
          <p className={`text-xs mt-1 ${orphanedCount > 0 ? 'text-amber-500 group-hover:text-amber-600' : 'text-gray-400'} transition-colors`}>{orphanedCount > 0 ? 'Click to assign →' : 'All assigned'}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-center gap-2"><svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>{error}</div>}

      {/* Add/Edit Department Form */}
      {showDeptForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">{editingDept ? 'Edit Department' : 'New Department'}</h2>
            <button onClick={() => { setShowDeptForm(false); setEditingDept(null); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <form onSubmit={handleSaveDept} className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Name <span className="text-red-500">*</span></label>
              <input type="text" value={deptFormData.name} onChange={e => setDeptFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. BIT" required
                className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-gray-400 text-sm w-48" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Code (optional)</label>
              <input type="text" value={deptFormData.code} onChange={e => setDeptFormData(p => ({ ...p, code: e.target.value }))}
                placeholder="e.g. BIT01"
                className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-gray-400 text-sm w-32" />
            </div>
            <button type="submit" disabled={deptFormLoading}
              className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-all">
              {deptFormLoading ? 'Saving...' : editingDept ? 'Update' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {/* Department Cards */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-800 border-t-transparent" />
          <p className="mt-3 text-gray-500 text-sm font-medium">Loading...</p>
        </div>
      ) : deptList.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <p className="text-gray-700 font-semibold">No departments yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Department" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {deptList.map(dept => (
            <div key={dept.name}
              onClick={() => setSelectedDept(selectedDept === dept.name ? null : dept.name)}
              className={`bg-white border rounded-xl shadow cursor-pointer transition-all hover:shadow-md overflow-hidden
                ${selectedDept === dept.name ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-1' : 'border-gray-200 hover:border-gray-400'}`}>
              <div className="h-1 bg-gray-900" />
              <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{dept.name}</h3>
                  {dept.code && <p className="text-xs text-gray-400 mt-0.5 font-mono">{dept.code}</p>}
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <button onClick={e => { e.stopPropagation(); setEditingDept(dept); setDeptFormData({ name: dept.name, code: dept.code || '' }); setShowDeptForm(true); }}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-all text-sm">✎</button>
                  <button onClick={e => { e.stopPropagation(); handleDeleteDept(dept); }}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-all text-sm">✕</button>
                </div>
              </div>
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <div className="flex-1 text-center">
                  <p className="text-xl font-bold text-gray-900">{dept.batches.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Batches</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="flex-1 text-center">
                  <p className="text-xl font-bold text-gray-900">{dept.activeCount}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Active</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="flex-1 text-center">
                  <p className="text-xl font-bold text-gray-900">{dept.studentCount}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Students</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center font-medium">{selectedDept === dept.name ? '▲ Collapse' : '▼ View batches'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Batches for selected department */}
      {selectedDept && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-gray-900 rounded-full" />
                  <h2 className="text-base font-bold text-gray-900">{selectedDept}</h2>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{visibleBatches.length} batch{visibleBatches.length !== 1 ? 'es' : ''}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search batches..."
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:border-gray-400 w-44" />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:border-gray-400">
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                {(searchQuery || filterStatus) && (
                  <button onClick={() => { setSearchQuery(''); setFilterStatus(''); }}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-all">Clear</button>
                )}
              </div>
            </div>
          </div>

          {selectedBatches.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex items-center justify-between">
              <span className="text-gray-700 font-medium text-sm">{selectedBatches.length} selected</span>
              <div className="flex gap-2">
                <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Delete Selected</button>
                <button onClick={() => setSelectedBatches([])} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium">Clear</button>
              </div>
            </div>
          )}

          {visibleBatches.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <p className="text-gray-700 font-semibold">No batches in {selectedDept}</p>
              <p className="text-gray-400 text-sm mt-1">Create a batch and assign it to this department</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleBatches.map(batch => {
                const capacity = 40;
                const studentCount = batch.student_count || 0;
                const occupancy = Math.min(Math.round((studentCount / capacity) * 100), 100);
                const isNearFull = occupancy >= 80;
                const barColor = occupancy >= 90 ? 'bg-red-500' : occupancy >= 80 ? 'bg-orange-400' : 'bg-emerald-500';
                const statusConfig = {
                  active:    { label: 'Active',    dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700 ring-green-200' },
                  completed: { label: 'Completed', dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
                  upcoming:  { label: 'Upcoming',  dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 ring-orange-200' },
                  archived:  { label: 'Archived',  dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-500 ring-gray-200' },
                };
                const sc = statusConfig[batch.status] || statusConfig.archived;
                const accentColor = batch.status === 'active' ? 'bg-green-500'
                  : batch.status === 'completed' ? 'bg-blue-500'
                  : batch.status === 'upcoming'  ? 'bg-amber-400'
                  : 'bg-gray-300';
                return (
                  <div key={batch.id}
                    className={`group bg-white rounded-xl flex flex-col shadow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border border-gray-200 overflow-hidden
                      ${selectedBatches.includes(batch.id) ? 'ring-2 ring-gray-400 ring-offset-1' : ''}`}>
                    <div className={`h-1 ${accentColor}`} />
                    <div className="p-5 flex flex-col gap-4 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 leading-tight truncate">{batch.batch_name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{batch.start_year}–{batch.end_year} · {batch.total_semesters || 8} semesters</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${sc.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                          </span>
                          <input type="checkbox" checked={selectedBatches.includes(batch.id)}
                            onChange={() => handleSelectBatch(batch.id)} className="w-4 h-4 rounded cursor-pointer" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                          <p className="text-gray-400 text-xs font-medium">Students</p>
                          <p className="font-bold text-gray-800 text-lg leading-tight">{studentCount}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                          <p className="text-gray-400 text-xs font-medium">Teachers</p>
                          <p className="font-bold text-gray-800 text-lg leading-tight">{batch.teacher_count || 0}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-400 font-medium">Capacity</span>
                          <span className={`font-semibold ${isNearFull ? 'text-orange-500' : 'text-gray-500'}`}>{studentCount}/{capacity} · {occupancy}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${occupancy}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-1 mt-auto pt-3 border-t border-gray-100">
                        <button onClick={() => handleViewStudents(batch)} title="Students" className="py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-800 hover:text-white transition-all">👥</button>
                        <button onClick={() => handleEditBatch(batch)} title="Edit" className="py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-800 hover:text-white transition-all">✎</button>
                        <button onClick={() => handleDeleteBatch(batch)} title="Delete" className="py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition-all">🗑</button>
                        <button onClick={() => handleOpenCloneModal(batch)} title="Clone" className="py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-800 hover:text-white transition-all">⧉</button>
                        <button onClick={() => setErpBatchId(batch.id)} title="ERP" className="py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-all">ERP</button>
                      </div>
                      <button onClick={() => handleChangeStatus(batch)} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors text-center py-0.5 rounded hover:bg-gray-50">Change Status</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Create New Batch</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
            </div>
            <form onSubmit={handleCreateBatch} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Name <span className="text-red-500">*</span></label>
                <input type="text" name="batch_name" value={formData.batch_name} onChange={handleChange} required placeholder="e.g. BIT 2026"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-gray-400 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Department <span className="text-red-500">*</span></label>
                <select name="department" value={formData.department} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-gray-400 text-sm">
                  <option value="">Select department...</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Year</label>
                  <input type="number" name="start_year" value={formData.start_year} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-gray-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Year</label>
                  <input type="number" name="end_year" value={formData.end_year} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-gray-400 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Total Semesters</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {[2,3,4,5,6,7,8,10,12].map(n => (
                    <button key={n} type="button" onClick={() => setFormData(p => ({ ...p, total_semesters: n }))}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-all ${formData.total_semesters === n ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <input type="number" min="1" max="20" value={formData.total_semesters}
                  onChange={e => setFormData(p => ({ ...p, total_semesters: parseInt(e.target.value) || 8 }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-gray-400 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all text-sm">Create Batch</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {showEditModal && editingBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Edit Batch</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
            </div>
            <form onSubmit={handleUpdateBatch} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Name</label>
                <input type="text" name="batch_name" value={formData.batch_name} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-gray-400 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all text-sm">Update</button>
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Students Side Drawer */}
      {showStudentsModal && currentBatch && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setShowStudentsModal(false); setShowAssignModal(false); setSelectedStudents([]); }} />
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{currentBatch.batch_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{currentBatch.department} · {batchStudents.length} enrolled</p>
              </div>
              <button onClick={() => { setShowStudentsModal(false); setShowAssignModal(false); setSelectedStudents([]); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="flex border-b border-gray-200 px-6">
              <button onClick={() => { setDrawerTab('enrolled'); setShowAssignModal(false); }}
                className={`py-3 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors ${drawerTab === 'enrolled' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                Enrolled ({batchStudents.length})
              </button>
              <button onClick={() => { setDrawerTab('add'); setShowAssignModal(true); if (availableStudents.length === 0) handleOpenAssignModal(currentBatch); }}
                className={`py-3 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors ${drawerTab === 'add' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                + Add Students
              </button>
              <button onClick={() => { setDrawerTab('transfer'); setShowAssignModal(false); if (transferableStudents.length === 0) handleFetchTransferable(currentBatch); }}
                className={`py-3 px-1 text-sm font-semibold border-b-2 transition-colors ${drawerTab === 'transfer' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                ⇄ Transfer
              </button>
            </div>
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
              <input type="text" placeholder={drawerTab === 'add' ? 'Search unassigned students...' : drawerTab === 'transfer' ? 'Search students to transfer...' : 'Search enrolled students...'}
                value={drawerSearch} onChange={e => setDrawerSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div className="flex-1 overflow-y-auto">

              {drawerTab === 'enrolled' && (
                isLoadingStudents ? <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-800 border-t-transparent" /></div>
                : batchStudents.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p className="font-medium text-gray-600">No students yet</p></div>
                : <table className="min-w-full"><thead className="bg-gray-50 sticky top-0"><tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {batchStudents.filter(s => { if (!drawerSearch) return true; const q = drawerSearch.toLowerCase(); return s.name.toLowerCase().includes(q) || (s.studentId||'').toLowerCase().includes(q) || (s.email||'').toLowerCase().includes(q); }).map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <StudentAvatar studentId={s.studentId} name={s.name} size={8} />
                            <div><p className="text-sm font-semibold text-gray-800">{s.name}</p><p className="text-xs text-gray-400">{s.email}</p></div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600 font-mono">{s.studentId}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">Yr {s.year}</td>
                        <td className="px-6 py-3 text-right"><button onClick={() => handleRemoveStudent(s.id)} className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-100 font-medium">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {drawerTab === 'add' && (
                isLoadingStudents ? <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-800 border-t-transparent" /></div>
                : availableStudents.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p className="font-medium text-gray-600">No unassigned students in {currentBatch.department}</p></div>
                : <table className="min-w-full"><thead className="bg-gray-50 sticky top-0"><tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Select</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Dept</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {availableStudents.filter(s => { if (!drawerSearch) return true; const q = drawerSearch.toLowerCase(); return s.name.toLowerCase().includes(q) || (s.studentId||'').toLowerCase().includes(q); }).map(s => (
                      <tr key={s.id} className={`hover:bg-gray-50 cursor-pointer ${selectedStudents.includes(s.id) ? 'bg-gray-50' : ''}`} onClick={() => toggleStudentSelection(s.id)}>
                        <td className="px-6 py-3"><input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudentSelection(s.id)} className="w-4 h-4 rounded" /></td>
                        <td className="px-6 py-3"><p className="text-sm font-semibold text-gray-800">{s.name}</p><p className="text-xs text-gray-400">{s.email}</p></td>
                        <td className="px-6 py-3 text-sm text-gray-600">{s.department}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {drawerTab === 'transfer' && (
                isLoadingStudents ? <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-800 border-t-transparent" /></div>
                : transferableStudents.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p className="font-medium text-gray-600">No students to transfer</p></div>
                : <table className="min-w-full"><thead className="bg-gray-50 sticky top-0"><tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Select</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Current Batch</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {transferableStudents.filter(s => { if (!drawerSearch) return true; const q = drawerSearch.toLowerCase(); return s.name.toLowerCase().includes(q) || (s.studentId||'').toLowerCase().includes(q); }).map(s => (
                      <tr key={s.id} className={`hover:bg-gray-50 cursor-pointer ${selectedStudents.includes(s.id) ? 'bg-gray-50' : ''}`} onClick={() => toggleStudentSelection(s.id)}>
                        <td className="px-6 py-3"><input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudentSelection(s.id)} className="w-4 h-4 rounded" /></td>
                        <td className="px-6 py-3"><p className="text-sm font-semibold text-gray-800">{s.name}</p><p className="text-xs text-gray-400">{s.email}</p></td>
                        <td className="px-6 py-3 text-sm text-gray-500">{s.current_batch_name ? <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.current_batch_name}</span> : <span className="text-xs text-amber-500">Unassigned</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {(drawerTab === 'add' || drawerTab === 'transfer') && selectedStudents.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
                <span className="text-sm text-gray-600">{selectedStudents.length} selected</span>
                <button onClick={handleAssignStudents} className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">
                  {drawerTab === 'transfer' ? 'Transfer to Batch' : 'Assign to Batch'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Students Drawer */}
      {showAllStudentsDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setShowAllStudentsDrawer(false); setAllStudentsSearch(''); }} />
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div><h2 className="text-lg font-bold text-gray-900">All Students</h2><p className="text-sm text-gray-500 mt-0.5">{allStudentsList.length} total</p></div>
              <button onClick={() => { setShowAllStudentsDrawer(false); setAllStudentsSearch(''); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
              <input type="text" placeholder="Search students..." value={allStudentsSearch} onChange={e => setAllStudentsSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="min-w-full"><thead className="bg-gray-50 sticky top-0"><tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Dept</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Batch</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {allStudentsList.filter(s => { if (!allStudentsSearch) return true; const q = allStudentsSearch.toLowerCase(); return (s.name||'').toLowerCase().includes(q) || (s.studentId||'').toLowerCase().includes(q) || (s.email||'').toLowerCase().includes(q); }).map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3"><p className="text-sm font-semibold text-gray-800">{s.name}</p><p className="text-xs text-gray-400">{s.email}</p></td>
                    <td className="px-6 py-3 text-sm text-gray-600">{s.department}</td>
                    <td className="px-6 py-3">{s.batch_name ? <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.batch_name}</span> : <span className="text-xs text-amber-500">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>
        </div>
      )}

      {/* Orphaned Students Drawer */}
      {showOrphanedDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowOrphanedDrawer(false)} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div><h2 className="text-lg font-bold text-gray-900">Unassigned Students</h2><p className="text-sm text-gray-500 mt-0.5">{orphanedStudents.length} students with no batch</p></div>
              <button onClick={() => setShowOrphanedDrawer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {orphanedStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p className="font-medium text-gray-600">No unassigned students</p></div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orphanedStudents.map(s => {
                    const deptBatches = batches.filter(b => b.department === s.department && b.status === 'active');
                    return (
                      <div key={s.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.email}</p>
                            <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{s.department || 'No dept'}</span>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-2">
                            {deptBatches.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">No active batch for {s.department || 'this dept'}</span>
                            ) : (
                              <OrphanAssignRow student={s} deptBatches={deptBatches} onAssigned={() => { handleViewOrphaned(); fetchBatches(); fetchOrphanedCount(); }} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">Only active batches matching the student's department are shown.</p>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {showStatusModal && currentBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Change Status</h2>
            <p className="text-gray-500 text-sm mb-5">{currentBatch.batch_name}</p>
            <div className="grid grid-cols-2 gap-3">
              {['active','upcoming','completed','archived'].map(s => (
                <button key={s} onClick={() => handleUpdateStatus(s)}
                  className="py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all capitalize">
                  {s}
                </button>
              ))}
            </div>
            <button onClick={() => setShowStatusModal(false)} className="w-full mt-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-all">Cancel</button>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {showCloneModal && currentBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Clone Batch</h2>
            <p className="text-gray-500 text-sm mb-5">{currentBatch.batch_name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">New Batch Name (optional)</label>
                <input type="text" value={cloneBatchData.batch_name} onChange={e => setCloneBatchData(p => ({ ...p, batch_name: e.target.value }))}
                  placeholder="Leave blank to auto-generate"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-gray-400 text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cloneBatchData.copy_students} onChange={e => setCloneBatchData(p => ({ ...p, copy_students: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">Copy students to new batch</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleCloneBatch} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700 text-sm transition-all">Clone Batch</button>
              <button onClick={() => setShowCloneModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={confirmDelete}
        title="Delete Batch" message={`Delete "${deleteBatchData?.batch_name}"? This cannot be undone.`} confirmText="Delete" cancelText="Cancel" confirmColor="red" />
      <ConfirmModal isOpen={showBulkDeleteModal} onClose={() => setShowBulkDeleteModal(false)} onConfirm={confirmBulkDelete}
        title="Delete Batches" message={`Delete ${selectedBatches.length} selected batch(es)?`} confirmText="Delete All" cancelText="Cancel" confirmColor="red" />

      <Toast message={toastMessage} type={toastType} isVisible={showToast} onClose={() => setShowToast(false)} />
      </>)}
    </div>
  );
};

export default AdminBatchManagement;
