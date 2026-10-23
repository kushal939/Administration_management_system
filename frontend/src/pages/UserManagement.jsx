import { useState, useEffect, useCallback } from 'react';

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [user, setUser] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '', department: '', assignedCourses: [] });
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '', studentId: '', department: '', year: '1' });
  const [studentIdGenerating, setStudentIdGenerating] = useState(false);
  const [studentIdAuto, setStudentIdAuto] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [approvalPassword, setApprovalPassword] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);
    
    if (userData && userData.role === 'admin') {
      fetchPendingRequests();
      fetchPendingCount();
      fetchDepartments();
      fetchCourses();
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

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/admin/student-requests/count', {
        headers: { 'x-user-role': 'admin' }
      });
      const data = await res.json();
      if (data.success) {
        setPendingCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching count:', error);
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
        showMessage(`Student created and enrolled in ${data.data.enrolledCourses || 0} courses!`, 'success');
        setStudentForm({ name: '', email: '', password: '', studentId: '', department: '', year: '1' });
        setStudentIdAuto(false);
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

  const handleApproveRequest = async (request) => {
    if (!approvalPassword) {
      showMessage('Please enter a password for the student account', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/approve-student/${request.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({
          password: approvalPassword,
          adminRole: 'admin'
        })
      });

      const data = await res.json();
      if (data.success) {
        showMessage('Student request approved and account created!', 'success');
        setApprovalPassword('');
        setSelectedRequest(null);
        fetchPendingRequests();
        fetchPendingCount();
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

  const handleRejectRequest = async (requestId, reason) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reject-student/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({
          reason: reason || 'No reason provided',
          adminRole: 'admin'
        })
      });

      const data = await res.json();
      if (data.success) {
        showMessage('Student request rejected', 'success');
        fetchPendingRequests();
        fetchPendingCount();
      } else {
        showMessage(data.message || 'Failed to reject request', 'error');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      showMessage('Network error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourseToggle = (courseName) => {
    setTeacherForm(prev => ({
      ...prev,
      assignedCourses: prev.assignedCourses.includes(courseName)
        ? prev.assignedCourses.filter(c => c !== courseName)
        : [...prev.assignedCourses, courseName]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 text-sm mt-1">Create accounts and manage student requests</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
              <div className="text-xs text-gray-500">Pending Request{pendingCount !== 1 ? 's' : ''}</div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`border-l-4 p-4 rounded-lg shadow-sm ${
          messageType === 'success' 
            ? 'bg-green-50 border-green-500 text-green-700' 
            : 'bg-red-50 border-red-500 text-red-700'
        }`}>
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
              Student Requests
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {pendingCount}
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
            Create Teacher
          </button>
          <button
            onClick={() => setActiveTab('createStudent')}
            className={`flex-1 py-4 px-6 font-semibold transition-all ${
              activeTab === 'createStudent'
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Create Student
          </button>
        </div>

        <div className="p-6">
          {/* Student Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Pending Student Requests
              </h2>
              
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <div className="text-5xl mb-3">✅</div>
                  <p className="text-lg font-semibold text-gray-700">No pending requests</p>
                  <p className="text-sm text-gray-500 mt-2">All requests have been processed</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-all">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600 font-semibold">Name</p>
                          <p className="font-bold text-gray-900">{request.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-semibold">Email</p>
                          <p className="font-semibold">{request.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Student ID</p>
                          <p className="font-semibold">{request.studentId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Department</p>
                          <p className="font-semibold">{request.department}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Batch Year</p>
                          <p className="font-semibold">{request.batchYear || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Requested By</p>
                          <p className="font-semibold">{request.requester_email || 'Unknown'}</p>
                        </div>
                      </div>

                      {selectedRequest === request.id ? (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-3">Enter password for student account:</p>
                          <input
                            type="password"
                            placeholder="Enter password"
                            value={approvalPassword}
                            onChange={(e) => setApprovalPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 mb-3"
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleApproveRequest(request)}
                              disabled={isLoading || !approvalPassword}
                              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold shadow-md hover:shadow-lg transition-all"
                            >
                              ✓ Confirm Approval
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(null);
                                setApprovalPassword('');
                              }}
                              className="px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold shadow-md hover:shadow-lg transition-all"
                            >
                              ✕ Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex gap-3 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => setSelectedRequest(request.id)}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold shadow-md hover:shadow-lg transition-all"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id, 'Rejected by admin')}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold shadow-md hover:shadow-lg transition-all"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create Teacher Tab */}
          {activeTab === 'createTeacher' && (
            <form onSubmit={handleCreateTeacher} className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">👨‍🏫</span>
                Create Teacher Account
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({...teacherForm, name: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({...teacherForm, email: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm({...teacherForm, password: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Assign Courses</label>
                <div className="border-2 border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {courses.map(course => (
                    <label key={course.id} className="flex items-center space-x-2 py-2 hover:bg-gray-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={teacherForm.assignedCourses.includes(course.name)}
                        onChange={() => handleCourseToggle(course.name)}
                        className="w-4 h-4"
                      />
                      <span>{course.name} ({course.code}) - {course.department}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {teacherForm.assignedCourses.length} course(s)
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 font-semibold transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : '✓ Create Teacher Account'}
              </button>
            </form>
          )}

          {/* Create Student Tab */}
          {activeTab === 'createStudent' && (
            <form onSubmit={handleCreateStudent} className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">🎓</span>
                Create Student Account
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={studentForm.studentId}
                      onChange={(e) => { setStudentForm({...studentForm, studentId: e.target.value}); setStudentIdAuto(false); }}
                      placeholder={studentIdGenerating ? 'Generating...' : 'Select department first'}
                      disabled={studentIdGenerating}
                      className={`w-full px-4 py-2 pr-20 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all
                        ${studentIdAuto ? 'border-indigo-300 bg-indigo-50 focus:ring-indigo-400' : 'border-gray-300 focus:ring-gray-400'}`}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={studentForm.password}
                    onChange={(e) => setStudentForm({...studentForm, password: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                  <select
                    required
                    value={studentForm.department}
                    onChange={(e) => setStudentForm({...studentForm, department: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-600 mt-1">Student will be auto-enrolled in all department courses</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                  <select
                    value={studentForm.year}
                    onChange={(e) => setStudentForm({...studentForm, year: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 font-semibold transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : '✓ Create Student Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
