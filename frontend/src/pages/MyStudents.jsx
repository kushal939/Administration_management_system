import { useState, useEffect } from 'react';
import StudentAvatar from '../components/StudentAvatar';

const MyStudents = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [studentMarks, setStudentMarks] = useState([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const teacherId = user.id;

  useEffect(() => {
    if (teacherId) {
      fetchMyStudents();
      fetchTeacherCourses();
      fetchTeacherDepartments();
    }
  }, [teacherId]);

  const fetchMyStudents = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterCourse) params.append('course', filterCourse);
      if (filterDepartment) params.append('department', filterDepartment);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/teacher/my-students/${teacherId}?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setStudents(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeacherCourses = async () => {
    try {
      const response = await fetch(`/api/teacher-courses/${teacherId}/courses`);
      const data = await response.json();
      if (data.success) {
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchTeacherDepartments = async () => {
    try {
      const response = await fetch(`/api/teacher/departments/${teacherId}`, {
        headers: { 'x-user-role': 'teacher' }
      });
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchStudentDetails = async (studentId) => {
    try {
      // Fetch attendance
      const attResponse = await fetch(`/api/attendance?studentId=${studentId}`);
      const attData = await attResponse.json();
      if (attData.success) {
        setStudentAttendance(attData.data || []);
      }

      // Fetch marks
      const marksResponse = await fetch(`/api/marks?studentId=${studentId}`);
      const marksData = await marksResponse.json();
      if (marksData.success) {
        setStudentMarks(marksData.data || []);
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    fetchStudentDetails(student.studentId);
    setShowDetailModal(true);
  };

  const handleSearch = () => {
    fetchMyStudents();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterCourse('');
    setFilterDepartment('');
  };

  useEffect(() => {
    if (teacherId) {
      fetchMyStudents();
    }
  }, [filterCourse, filterDepartment]);

  // Clear error after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Calculate statistics
  const totalStudents = students.length;
  const departmentCounts = students.reduce((acc, student) => {
    const dept = student.department || 'Unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});
  const yearCounts = students.reduce((acc, student) => {
    const year = student.year || 'Unknown';
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});

  const getAttendanceRate = (studentId) => {
    const records = studentAttendance.filter(a => a.studentId === studentId);
    if (records.length === 0) return 0;
    const present = records.filter(a => a.status === 'present').length;
    return Math.round((present / records.length) * 100);
  };

  const getAverageMarks = (studentId) => {
    const marks = studentMarks.filter(m => m.studentId === studentId);
    if (marks.length === 0) return 0;
    const total = marks.reduce((sum, m) => sum + m.marks, 0);
    return Math.round(total / marks.length);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="text-4xl">👨‍🎓</span>
              My Students
            </h1>
            <p className="text-purple-100 mt-2">
              View students enrolled in your courses
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4 text-center">
            <div className="text-3xl font-bold">{students.length}</div>
            <div className="text-sm text-purple-100">Total Students</div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          Search & Filter Students
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              placeholder="Name, ID, or email..."
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Course</label>
            <select
              value={filterCourse}
              onChange={e => setFilterCourse(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.name}>{course.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
            <select
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((dept, idx) => (
                <option key={idx} value={dept.department}>{dept.department}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold shadow-md hover:shadow-lg transition-all"
            >
              🔍 Search
            </button>
            <button
              onClick={handleClearFilters}
              className="flex-1 px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold shadow-md hover:shadow-lg transition-all"
            >
              ↻ Clear
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 bg-gray-50">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-xl font-semibold text-gray-700">No students found</p>
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm || filterCourse || filterDepartment 
                ? 'Try adjusting your filters' 
                : 'No students are enrolled in your courses yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    Enrolled Courses
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student, index) => {
                  const courseList = student.courses ? student.courses.split(',') : [];
                  const displayCourses = courseList.slice(0, 2);
                  const remainingCount = courseList.length - 2;

                  return (
                    <tr key={student.id} className={`hover:bg-purple-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <StudentAvatar studentId={student.studentId} name={student.name} size={10} className="flex-shrink-0" />
                          <div className="ml-3">
                            <div className="text-sm font-bold text-gray-900">{student.studentId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {student.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Year {student.year || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {displayCourses.map((course, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200"
                            >
                              {course.trim()}
                            </span>
                          ))}
                          {remainingCount > 0 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              +{remainingCount} more
                            </span>
                          )}
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
    </div>
  );
};

export default MyStudents;
