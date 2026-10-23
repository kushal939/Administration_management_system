import { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

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

  // Phase 2: Lifecycle Management States
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneBatchData, setCloneBatchData] = useState({ batch_name: '', copy_students: false });

  const [formData, setFormData] = useState({
    batch_name: '',
    department: '',
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 4
  });

  useEffect(() => {
    fetchBatches();
    fetchDepartments();
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
          end_year: new Date().getFullYear() + 4
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
        setAvailableStudents(data.data || []);
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
        // Refresh student list
        handleViewStudents(currentBatch);
        fetchBatches();
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

      if (data.success) {
        setToastMessage(`Batch status updated to ${newStatus}!`);
        setToastType('success');
        setShowToast(true);
        setShowStatusModal(false);
        fetchBatches();
      } else {
        setError(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status');
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

  const totalBatches = batches.length;
  const activeBatches = batches.filter(b => b.status === 'active').length;
  const completedBatches = batches.filter(b => b.status === 'completed').length;

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="text-4xl">🎓</span>
              Batch Management
            </h1>
            <p className="text-purple-100 mt-2">
              Organize and manage student batches by academic years
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Create New Batch
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 font-medium">Total Batches</p>
              <p className="text-4xl font-bold mt-2">{totalBatches}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">📚</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 font-medium">Active Batches</p>
              <p className="text-4xl font-bold mt-2">{activeBatches}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">✓</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 font-medium">Completed</p>
              <p className="text-4xl font-bold mt-2">{completedBatches}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">🎯</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 font-medium">Total Students</p>
              <p className="text-4xl font-bold mt-2">{batches.reduce((sum, b) => sum + (b.student_count || 0), 0)}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">👨‍🎓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">🔍</span>
            Search & Filter Batches
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Batch</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
            <select
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterDepartment('');
                setFilterStatus('');
              }}
              className="w-full px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold shadow-md hover:shadow-lg transition-all"
            >
              ↻ Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedBatches.length > 0 && (
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg flex items-center justify-between">
          <span className="text-purple-800 font-semibold flex items-center gap-2">
            <span className="bg-purple-100 px-3 py-1 rounded-full text-sm">{selectedBatches.length} selected</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg font-semibold"
            >
              🗑️ Delete Selected
            </button>
            <button
              onClick={() => setSelectedBatches([])}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow-md font-semibold"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Batches Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading batches...</p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">🎓</div>
          <p className="text-xl font-semibold text-gray-700">No batches found</p>
          <p className="text-gray-500 mt-2">
            {batches.length === 0 ? 'Create your first batch to get started' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${
                selectedBatches.includes(batch.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="checkbox"
                    checked={selectedBatches.includes(batch.id)}
                    onChange={() => handleSelectBatch(batch.id)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 mt-1"
                  />
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    batch.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {batch.status === 'active' ? '✓ Active' : '○ Completed'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-2">{batch.batch_name}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Department:</span>
                    <span className="text-gray-800">{batch.department}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Duration:</span>
                    <span className="text-gray-800">{batch.start_year} - {batch.end_year}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Students:</span>
                    <span className="text-gray-800 font-semibold">{batch.student_count || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200 mb-2">
                  <button
                    onClick={() => handleViewStudents(batch)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    title="View Students"
                  >
                    👥 Students
                  </button>
                  <button
                    onClick={() => handleEditBatch(batch)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBatch(batch)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    🗑️ Delete
                  </button>
                </div>

                {/* Phase 2: Additional Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleChangeStatus(batch)}
                    className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium"
                    title="Change Status"
                  >
                    🔄 Status
                  </button>
                  <button
                    onClick={() => handleOpenCloneModal(batch)}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
                    title="Clone Batch"
                  >
                    📋 Clone
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-3xl">➕</span>
                Create New Batch
              </h2>
            </div>
            
            <form onSubmit={handleCreateBatch} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Batch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="batch_name"
                  value={formData.batch_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., BCA 2024"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Year</label>
                  <input
                    type="number"
                    name="start_year"
                    value={formData.start_year}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    min="2020"
                    max="2030"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Year</label>
                  <input
                    type="number"
                    name="end_year"
                    value={formData.end_year}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    min="2020"
                    max="2035"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  Create Batch
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-3xl">✏️</span>
                Edit Batch
              </h2>
            </div>
            
            <form onSubmit={handleUpdateBatch} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Batch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="batch_name"
                  value={formData.batch_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  Update Batch
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBatch(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteBatchData(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Batch"
        message={deleteBatchData ? `Are you sure you want to delete "${deleteBatchData.batch_name}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Multiple Batches"
        message={`Are you sure you want to delete ${selectedBatches.length} batch(es)? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        confirmColor="red"
      />

      {/* Phase 1: View Students Modal */}
      {showStudentsModal && currentBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-3xl">👥</span>
                    Students in {currentBatch.batch_name}
                  </h2>
                  <p className="text-purple-100 mt-1">{batchStudents.length} student(s) enrolled</p>
                </div>
                <button
                  onClick={() => setShowStudentsModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => handleOpenAssignModal(currentBatch)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  + Assign Students
                </button>
              </div>

              {isLoadingStudents ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
                  <p className="mt-4 text-gray-600">Loading students...</p>
                </div>
              ) : batchStudents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-6xl mb-4">📚</div>
                  <p className="text-xl font-semibold text-gray-700">No students in this batch</p>
                  <p className="text-gray-500 mt-2">Click "Assign Students" to add students</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[500px]">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Student ID</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Year</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {batchStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.studentId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            Year {student.year}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleRemoveStudent(student.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phase 1: Assign Students Modal */}
      {showAssignModal && currentBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-3xl">➕</span>
                    Assign Students to {currentBatch.batch_name}
                  </h2>
                  <p className="text-green-100 mt-1">Select students to assign to this batch</p>
                </div>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedStudents([]);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {selectedStudents.length > 0 && (
                <div className="mb-4 bg-green-50 border border-green-200 p-4 rounded-lg flex items-center justify-between">
                  <span className="text-green-800 font-medium">{selectedStudents.length} student(s) selected</span>
                  <button
                    onClick={handleAssignStudents}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Assign Selected
                  </button>
                </div>
              )}

              {isLoadingStudents ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
                  <p className="mt-4 text-gray-600">Loading students...</p>
                </div>
              ) : availableStudents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-6xl mb-4">✓</div>
                  <p className="text-xl font-semibold text-gray-700">No unassigned students</p>
                  <p className="text-gray-500 mt-2">All students are already assigned to batches</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[500px]">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedStudents.length === availableStudents.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents(availableStudents.map(s => s.id));
                              } else {
                                setSelectedStudents([]);
                              }
                            }}
                            className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Student ID</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Year</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {availableStudents.map((student) => (
                        <tr 
                          key={student.id} 
                          className={`hover:bg-gray-50 cursor-pointer ${selectedStudents.includes(student.id) ? 'bg-green-50' : ''}`}
                          onClick={() => toggleStudentSelection(student.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.studentId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            Year {student.year}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default AdminBatchManagement;

      {/* Phase 2: Change Status Modal */}
      {showStatusModal && currentBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-600 to-orange-700 text-white">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">🔄</span>
                Change Batch Status
              </h2>
              <p className="text-orange-100 mt-1">{currentBatch.batch_name}</p>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">Select new status for this batch:</p>
              <div className="space-y-3">
                <button
                  onClick={() => handleUpdateStatus('active')}
                  className="w-full px-4 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors font-medium text-left flex items-center gap-3"
                >
                  <span className="text-2xl">✓</span>
                  <div>
                    <div className="font-bold">Active</div>
                    <div className="text-sm">Currently running batch</div>
                  </div>
                </button>

                <button
                  onClick={() => handleUpdateStatus('completed')}
                  className="w-full px-4 py-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors font-medium text-left flex items-center gap-3"
                >
                  <span className="text-2xl">✓</span>
                  <div>
                    <div className="font-bold">Completed</div>
                    <div className="text-sm">Finished batch</div>
                  </div>
                </button>

                <button
                  onClick={() => handleUpdateStatus('archived')}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors font-medium text-left flex items-center gap-3"
                >
                  <span className="text-2xl">📦</span>
                  <div>
                    <div className="font-bold">Archived</div>
                    <div className="text-sm">Old batch (hidden from main view)</div>
                  </div>
                </button>

                <button
                  onClick={() => handleUpdateStatus('upcoming')}
                  className="w-full px-4 py-3 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors font-medium text-left flex items-center gap-3"
                >
                  <span className="text-2xl">🔜</span>
                  <div>
                    <div className="font-bold">Upcoming</div>
                    <div className="text-sm">Future batch</div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowStatusModal(false)}
                className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: Clone Batch Modal */}
      {showCloneModal && currentBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">📋</span>
                Clone Batch
              </h2>
              <p className="text-purple-100 mt-1">Create a copy of {currentBatch.batch_name}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Batch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cloneBatchData.batch_name}
                  onChange={(e) => setCloneBatchData({ ...cloneBatchData, batch_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., BCA 2025"
                />
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cloneBatchData.copy_students}
                    onChange={(e) => setCloneBatchData({ ...cloneBatchData, copy_students: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-semibold text-gray-800">Copy Students</div>
                    <div className="text-sm text-gray-600">Move all students to the new batch</div>
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The new batch will be created with status "Upcoming" and years will be incremented by 1.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCloneBatch}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  Clone Batch
                </button>
                <button
                  onClick={() => setShowCloneModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default AdminBatchManagement;
