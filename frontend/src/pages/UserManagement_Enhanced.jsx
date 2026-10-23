import { useState, useEffect, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [user, setUser] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  // Create Teacher Form
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    assignedCourses: []
  });

  // Create Student Form
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    department: '',
    year: '1'
  });

  // Create Principal Form
  const [principalForm, setPrincipalForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [approvalPassword, setApprovalPassword] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [studentIdGenerating, setStudentIdGenerating] = useState(false);
  const [studentIdAuto, setStudentIdAuto] = useState(false);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteUserName, setDeleteUserName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    department: '',
    year: '',
    studentId: '',
    role: '',
    password: '',
    assignedCourses: []
  });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);
    
    if (userData && userData.role === 'admin') {
      fetchPendingRequests();
      fetchDepartments();
      fetchCourses();
      fetchAllUsers();
    }
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch('/api/admin/student-requests?status=pending', {
        headers: { 'x-user-role': 'admin' }
      });
      const data = await res.json();
      if (data.success) {
        setPendingRequests(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/users', {
        headers: { 'x-user-role': 'admin' }
      });
      const data = await res.json();
      if (data.success) {
        setAllUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      if (data.success) {
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => { setMessage(''); setMessageType(''); }, 3000);
  };

  // Auto-generate student ID when department changes
  const generateStudentId = useCallback(async (deptName) => {
    if (!deptName) return;
    const dept = departments.find(d => d.name === deptName);
    if (!dept?.code) return;
    setStudentIdGenerating(true);
    setStudentIdAuto(false);
    try {
      const year = new Date().getFullYear();
      const res = await fetch(`/api/students/generate-id?departmentCode=${encodeURIComponent(dept.code)}&year=${year}`);
      const data = await res.json();
      if (data.success) {
        setStudentForm(prev => ({ ...prev, studentId: data.studentId }));
        setStudentIdAuto(true);
      }
    } catch (e) {}
    finally { setStudentIdGenerating(false); }
  }, [departments]);

  useEffect(() => {
    if (studentForm.department && departments.length > 0) {
      generateStudentId(studentForm.department);
    }
  }, [studentForm.department, departments]);

  const handleApproveRequest = async (requestId) => {
    if (!approvalPassword) {
      showMessage('Please enter approval password', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/student-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ password: approvalPassword })
      });

      const data = await res.json();
      if (data.success) {
        showMessage('Request approved successfully!', 'success');
        setApprovalPassword('');
        setSelectedRequest(null);
        setShowApprovalModal(false);
        fetchPendingRequests();
        fetchAllUsers();
      } else {
        showMessage(data.message || 'Failed to approve request', 'error');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      showMessage('Network error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    setRejectRequestId(requestId);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectRequestId) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/student-requests/${rejectRequestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        }
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage('Request rejected');
        setToastType('success');
        setShowToast(true);
        fetchPendingRequests();
      } else {
        showMessage(data.message || 'Failed to reject request', 'error');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      showMessage('Network error', 'error');
    } finally {
      setIsLoading(false);
      setRejectRequestId(null);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/create-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({
          ...teacherForm,
          adminRole: 'admin'
        })
      });

      const data = await res.json();
      if (data.success) {
        showMessage('Teacher account created successfully!', 'success');
        setTeacherForm({
          name: '',
          email: '',
          password: '',
          department: '',
          assignedCourses: []
        });
        fetchAllUsers();
      } else {
        showMessage(data.message || 'Failed to create teacher', 'error');
      }
    } catch (error) {
      console.error('Error creating teacher:', error);
      showMessage('Network error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/create-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({
          ...studentForm,
          adminRole: 'admin'
        })
      });

      const data = await res.json();
      if (data.success) {
        showMessage('Student account created successfully!', 'success');
        setStudentForm({
          name: '',
          email: '',
          password: '',
          studentId: '',
          department: '',
          year: '1'
        });
        fetchAllUsers();
      } else {
        showMessage(data.message || 'Failed to create student', 'error');
      }
    } catch (error) {
      console.error('Error creating student:', error);
      showMessage('Network error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePrincipal = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/create-principal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify({ ...principalForm, adminRole: 'admin' })
      });
      const data = await res.json();
      if (data.success) {
        showMessage('Principal account created successfully!', 'success');
        setPrincipalForm({ name: '', email: '', password: '' });
        fetchAllUsers();
      } else {
        showMessage(data.message || 'Failed to create principal', 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.studentId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === '' || user.role === filterRole;
    const matchesDept = filterDepartment === '' || user.department === filterDepartment;
    return matchesSearch && matchesRole && matchesDept;
  });

  const handleDeleteUser = (userId, userName) => {
    setDeleteUserId(userId);
    setDeleteUserName(userName);
    setShowDeleteModal(true);
  };

  const handleEditUser = (userItem) => {
    setEditUser(userItem);
    setEditForm({
      name: userItem.name || '',
      email: userItem.email || '',
      department: userItem.department || '',
      year: userItem.year || '',
      studentId: userItem.studentId || '',
      role: userItem.role || '',
      password: '',
      assignedCourses: []
    });
    setShowEditModal(true);
    
    // Fetch assigned courses for teachers
    if (userItem.role === 'teacher') {
      fetch(`/api/teacher-courses/${userItem.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setEditForm(prev => ({...prev, assignedCourses: data.courses || []}));
          }
        })
        .catch(err => console.error('Error fetching teacher courses:', err));
    }
  };

  const confirmEditUser = async () => {
    if (!editUser) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({
          ...editForm,
          role: editUser.role
        })
      });

      const data = await res.json();
      if (data.success) {
        const msg = data.batchCleared
          ? 'Student updated. Batch assignment cleared due to department change.'
          : 'User updated successfully';
        setToastMessage(msg);
        setToastType(data.batchCleared ? 'error' : 'success');
        setShowToast(true);
        setShowEditModal(false);
        setEditUser(null);
        fetchAllUsers();
      } else {
        showMessage(data.message || 'Failed to update user', 'error');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showMessage('Network error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/users/${deleteUserId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({
          currentUserEmail: user?.email
        })
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage('User deleted successfully');
        setToastType('success');
        setShowToast(true);
        fetchAllUsers();
      } else {
        showMessage(data.message || 'Failed to delete user', 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage('Network error', 'error');
    } finally {
      setIsLoading(false);
      setDeleteUserId(null);
      setDeleteUserName('');
    }
  };

  // Calculate stats
  const stats = {
    total: allUsers.length,
    students: allUsers.filter(u => u.role === 'student').length,
    teachers: allUsers.filter(u => u.role === 'teacher').length,
    pending: pendingRequests.length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 text-sm mt-1">Manage users, approve requests, and create accounts</p>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="text-2xl">👤</div>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.students}</p>
              </div>
              <div className="text-2xl">🎓</div>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Teachers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.teachers}</p>
              </div>
              <div className="text-2xl">👨‍🏫</div>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <div className="text-2xl">⏳</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`${
          messageType === 'success' 
            ? 'bg-green-50 border-green-500 text-green-700' 
            : 'bg-red-50 border-red-500 text-red-700'
        } border-l-4 p-4 rounded-lg shadow-sm`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{messageType === 'success' ? '✓' : '⚠️'}</span>
            <p className="font-medium">{message}</p>
          </div>
        </div>
      )}

      {/* Enhanced Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-4 px-6 font-semibold transition-all relative ${
              activeTab === 'requests'
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              ⏳ Pending Requests
              {stats.pending > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {stats.pending}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('createTeacher')}
            className={`flex-1 py-4 px-6 font-semibold transition-all ${
              activeTab === 'createTeacher'
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            👨‍🏫 Create Teacher
          </button>
          <button
            onClick={() => setActiveTab('createStudent')}
            className={`flex-1 py-4 px-6 font-semibold transition-all ${
              activeTab === 'createStudent'
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            🎓 Create Student
          </button>
          <button
            onClick={() => setActiveTab('createPrincipal')}
            className={`flex-1 py-4 px-6 font-semibold transition-all ${
              activeTab === 'createPrincipal'
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            🏫 Create Principal
          </button>
          <button
            onClick={() => setActiveTab('allUsers')}
            className={`flex-1 py-4 px-6 font-semibold transition-all ${
              activeTab === 'allUsers'
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            👥 All Users
          </button>
        </div>

        <div className="p-6">
          {/* Pending Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Pending Student Requests</h2>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-600 text-lg">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{request.name}</h3>
                          <p className="text-sm text-gray-600">{request.email}</p>
                          <p className="text-sm text-gray-500">Student ID: {request.studentId}</p>
                          <p className="text-sm text-gray-500">Department: {request.department}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApprovalModal(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create Teacher Tab */}
          {activeTab === 'createTeacher' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Create Teacher Account</h2>
              <form onSubmit={handleCreateTeacher} className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({...teacherForm, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({...teacherForm, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={teacherForm.password}
                    onChange={(e) => setTeacherForm({...teacherForm, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={teacherForm.department}
                    onChange={(e) => setTeacherForm({...teacherForm, department: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Teacher Account'}
                </button>
              </form>
            </div>
          )}

          {/* Create Student Tab */}
          {activeTab === 'createStudent' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Create Student Account</h2>
              <form onSubmit={handleCreateStudent} className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={studentForm.password}
                    onChange={(e) => setStudentForm({...studentForm, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentForm.studentId}
                      onChange={(e) => { setStudentForm({...studentForm, studentId: e.target.value}); setStudentIdAuto(false); }}
                      placeholder={studentIdGenerating ? 'Generating...' : 'Select department first'}
                      disabled={studentIdGenerating}
                      className={`w-full px-4 py-2 pr-20 border rounded-lg focus:ring-2 focus:border-transparent transition-all
                        ${studentIdAuto ? 'border-indigo-300 bg-indigo-50 focus:ring-indigo-400' : 'border-gray-300 focus:ring-gray-400'}`}
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {studentIdGenerating
                        ? <span className="text-xs text-gray-400 flex items-center gap-1"><span className="animate-spin inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full"/>gen</span>
                        : studentIdAuto
                          ? <span className="text-xs text-indigo-600 font-semibold bg-indigo-100 px-2 py-0.5 rounded-full">auto ✓</span>
                          : null}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={studentForm.department}
                    onChange={(e) => setStudentForm({...studentForm, department: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={studentForm.year}
                    onChange={(e) => setStudentForm({...studentForm, year: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Student Account'}
                </button>
              </form>
            </div>
          )}

          {/* Create Principal Tab */}
          {activeTab === 'createPrincipal' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Create Principal Account</h2>
              <form onSubmit={handleCreatePrincipal} className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={principalForm.name}
                    onChange={e => setPrincipalForm({ ...principalForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={principalForm.email}
                    onChange={e => setPrincipalForm({ ...principalForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={principalForm.password}
                    onChange={e => setPrincipalForm({ ...principalForm, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Principal Account'}
                </button>
              </form>
            </div>
          )}

          {/* All Users Tab */}
          {activeTab === 'allUsers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">All Users</h2>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent w-64"
                  />
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  >
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="teacher">Teachers</option>
                    <option value="principal">Principals</option>
                    <option value="admin">Admins</option>
                  </select>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-gray-600">Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-6xl mb-4">👤</div>
                  <p className="text-gray-600 text-lg">No users found</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-900 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((userItem) => (
                        <tr key={userItem.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {userItem.studentId || userItem.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{userItem.name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {userItem.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              userItem.role === 'student' ? 'bg-gray-100 text-gray-700' :
                              userItem.role === 'teacher' ? 'bg-gray-100 text-gray-700' :
                              userItem.role === 'principal' ? 'bg-gray-100 text-gray-700' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {userItem.department || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditUser(userItem)}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 hover:shadow-lg transition-all"
                                title="Edit user"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(userItem.id, userItem.name || userItem.email)}
                                disabled={userItem.email === user?.email}
                                className={`px-4 py-2 rounded-lg transition-all ${
                                  userItem.email === user?.email
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg'
                                }`}
                                title={userItem.email === user?.email ? 'Cannot delete your own account' : 'Delete user'}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Approve Student Request</h3>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600"><span className="font-semibold">Name:</span> {selectedRequest.name}</p>
              <p className="text-sm text-gray-600"><span className="font-semibold">Email:</span> {selectedRequest.email}</p>
              <p className="text-sm text-gray-600"><span className="font-semibold">Student ID:</span> {selectedRequest.studentId}</p>
              <p className="text-sm text-gray-600"><span className="font-semibold">Department:</span> {selectedRequest.department}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Set Password</label>
              <input
                type="password"
                value={approvalPassword}
                onChange={(e) => setApprovalPassword(e.target.value)}
                placeholder="Enter password for student account"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                  setApprovalPassword('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveRequest(selectedRequest.id)}
                disabled={!approvalPassword || isLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectRequestId(null);
        }}
        onConfirm={confirmReject}
        title="Reject Request"
        message="Are you sure you want to reject this request?"
        confirmText="Reject"
        cancelText="Cancel"
        confirmColor="red"
      />

      {/* Delete User Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteUserId(null);
          setDeleteUserName('');
        }}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteUserName}? This action cannot be undone. All related records (attendance, marks, assignments, enrollments) will be permanently deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />

      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 my-8 transform transition-all">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">✏️ Edit User Details</h3>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  placeholder="Leave blank to keep current password"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank if you don't want to change the password</p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="principal">Principal</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Student-specific fields */}
              {editForm.role === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                      placeholder="Full Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                    <input
                      type="text"
                      value={editForm.studentId}
                      onChange={(e) => setEditForm({...editForm, studentId: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                      placeholder="e.g., CS20261001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                    <select
                      value={editForm.department}
                      onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                    <select
                      value={editForm.year}
                      onChange={(e) => setEditForm({...editForm, year: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    >
                      <option value="">Select Year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                </>
              )}

              {/* Teacher-specific fields */}
              {editForm.role === 'teacher' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      value={editForm.department}
                      onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Courses</label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
                      {courses.length === 0 ? (
                        <p className="text-sm text-gray-500">No courses available</p>
                      ) : (
                        courses.map(course => (
                          <label key={course.id} className="flex items-center space-x-2 py-1 hover:bg-gray-100 px-2 rounded">
                            <input
                              type="checkbox"
                              checked={editForm.assignedCourses.includes(course.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditForm({
                                    ...editForm,
                                    assignedCourses: [...editForm.assignedCourses, course.name]
                                  });
                                } else {
                                  setEditForm({
                                    ...editForm,
                                    assignedCourses: editForm.assignedCourses.filter(c => c !== course.name)
                                  });
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-gray-400"
                            />
                            <span className="text-sm text-gray-700">{course.name} ({course.code})</span>
                          </label>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Select courses to assign to this teacher</p>
                  </div>
                </>
              )}

              {/* Principal-specific fields */}
              {editForm.role === 'principal' && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700">
                    <strong>Principal Account:</strong> This user has full administrative access to view reports and analytics.
                  </p>
                </div>
              )}

              {/* Admin-specific fields */}
              {editForm.role === 'admin' && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    <strong>⚠️ Admin Account:</strong> This user has full system access. Be careful when editing admin accounts.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditUser(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmEditUser}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
              >
                {isLoading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default UserManagement;



