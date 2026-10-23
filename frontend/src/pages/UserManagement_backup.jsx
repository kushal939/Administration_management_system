import { useState, useEffect } from 'react';

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [user, setUser] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

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
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
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
        setStudentForm({
          name: '',
          email: '',
          password: '',
          studentId: '',
          department: '',
          year: '1'
        });
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-600 mt-1">Create accounts and manage student requests</p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold animate-pulse">
            {pendingCount} Pending Request{pendingCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className={`border-l-4 p-4 rounded ${
          messageType === 'success' 
            ? 'bg-green-50 border-green-500 text-green-700' 
            : 'bg-red-50 border-red-500 text-red-700'
        }`}>
          <p className="font-medium">{message}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex gap-0 border-b">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors relative ${
              activeTab === 'requests'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Student Requests
            {pendingCount > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('createTeacher')}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
              activeTab === 'createTeacher'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Create Teacher
          </button>
          <button
            onClick={() => setActiveTab('createStudent')}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
              activeTab === 'createStudent'
                ? 'bg-blue-600 text-white'
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
              <h2 className="text-xl font-semibold text-gray-800">Pending Student Requests</h2>
              
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-semibold">{request.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
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
                        <div className="mt-4 space-y-3">
                          <input
                            type="password"
                            placeholder="Enter password for student account"
                            value={approvalPassword}
                            onChange={(e) => setApprovalPassword(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveRequest(request)}
                              disabled={isLoading || !approvalPassword}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                            >
                              Confirm Approval
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(null);
                                setApprovalPassword('');
                              }}
                              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => setSelectedRequest(request.id)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id, 'Rejected by admin')}
                            disabled={isLoading}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                          >
                            Reject
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
            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Create Teacher Account</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({...teacherForm, name: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({...teacherForm, email: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
              >
                {isLoading ? 'Creating...' : 'Create Teacher Account'}
              </button>
            </form>
          )}

          {/* Create Student Tab */}
          {activeTab === 'createStudent' && (
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Create Student Account</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
                  <input
                    type="text"
                    required
                    value={studentForm.studentId}
                    onChange={(e) => setStudentForm({...studentForm, studentId: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={studentForm.password}
                    onChange={(e) => setStudentForm({...studentForm, password: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
              >
                {isLoading ? 'Creating...' : 'Create Student Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
