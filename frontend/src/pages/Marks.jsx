import { useState, useEffect } from 'react';
import { getUserRole, isReadOnly } from '../utils/roleUtils';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import StudentAvatar from '../components/StudentAvatar';

const Marks = () => {
  const userRole = getUserRole();
  const readOnly = isReadOnly(userRole);
  
  const [marks, setMarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingMark, setEditingMark] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Search and filter states for principal
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMarkData, setDeleteMarkData] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  
  const [formData, setFormData] = useState({
    studentId: '',
    course: '',
    marks: ''
  });

  // Fetch marks, students, and courses on component mount
  useEffect(() => {
    fetchMarks();
    fetchStudents();
    fetchCourses();
  }, []);

  const fetchMarks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/marks');
      const data = await response.json();
      
      if (data.success) {
        setMarks(data.data || []);
      } else {
        setError('Failed to fetch marks');
      }
    } catch (error) {
      console.error('Error fetching marks:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();
      
      if (data.success) {
        setStudents(data.data || []);
      } else {
        setError('Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const data = await response.json();
      
      if (data.success) {
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user makes changes
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate form
    if (!formData.studentId || !formData.course || !formData.marks) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate marks is a valid number
    const marksValue = Number(formData.marks);
    if (isNaN(marksValue) || marksValue < 0 || marksValue > 100) {
      setError('Marks must be a valid number between 0 and 100');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/marks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: formData.studentId,
          course: formData.course,
          marks: marksValue
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Marks added successfully!');
        // Reset form
        setFormData({
          studentId: '',
          course: '',
          marks: ''
        });
        // Refresh marks list
        fetchMarks();
      } else {
        setError(data.message || 'Failed to add marks');
      }
    } catch (error) {
      console.error('Error adding marks:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (mark) => {
    setEditingMark(mark);
    setFormData({
      studentId: mark.studentId,
      course: mark.course,
      marks: mark.marks.toString()
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.studentId || !formData.course || !formData.marks) {
      setError('Please fill in all required fields');
      return;
    }

    const marksValue = Number(formData.marks);
    if (isNaN(marksValue) || marksValue < 0 || marksValue > 100) {
      setError('Marks must be a valid number between 0 and 100');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/marks/${editingMark.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: formData.studentId,
          course: formData.course,
          marks: marksValue
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Marks updated successfully!');
        setShowEditModal(false);
        setEditingMark(null);
        setFormData({
          studentId: '',
          course: '',
          marks: ''
        });
        fetchMarks();
      } else {
        setError(data.message || 'Failed to update marks');
      }
    } catch (error) {
      console.error('Error updating marks:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (markId, studentId, course) => {
    setDeleteMarkData({ markId, studentId, course });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteMarkData) return;

    try {
      const response = await fetch(`/api/marks/${deleteMarkData.markId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage('Marks deleted successfully!');
        setToastType('success');
        setShowToast(true);
        fetchMarks();
      } else {
        setError(data.message || 'Failed to delete marks');
      }
    } catch (error) {
      console.error('Error deleting marks:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setDeleteMarkData(null);
    }
  };

  // Get student name by studentId
  const getStudentName = (studentId) => {
    const student = students.find(s => s.studentId === studentId);
    return student ? student.name : studentId;
  };

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Helper function to calculate grade
  const getGrade = (marksValue) => {
    if (marksValue >= 90) return 'A+';
    if (marksValue >= 80) return 'A';
    if (marksValue >= 70) return 'B';
    if (marksValue >= 60) return 'C';
    if (marksValue >= 50) return 'D';
    return 'F';
  };

  // Filter marks based on search and filters
  const filteredMarks = marks.filter(mark => {
    const student = students.find(s => s.studentId === mark.studentId);
    const studentName = student ? student.name.toLowerCase() : '';
    const matchesSearch = searchTerm === '' ||
      mark.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentName.includes(searchTerm.toLowerCase()) ||
      mark.course.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = filterCourse === '' || mark.course === filterCourse;
    const matchesGrade = filterGrade === '' || getGrade(mark.marks) === filterGrade;
    
    return matchesSearch && matchesCourse && matchesGrade;
  });

  // Calculate statistics
  const calculateStats = () => {
    if (filteredMarks.length === 0) return null;
    
    const total = filteredMarks.reduce((sum, m) => sum + m.marks, 0);
    const average = total / filteredMarks.length;
    const highest = Math.max(...filteredMarks.map(m => m.marks));
    const lowest = Math.min(...filteredMarks.map(m => m.marks));
    const passing = filteredMarks.filter(m => m.marks >= 50).length;
    const failing = filteredMarks.filter(m => m.marks < 50).length;
    
    return { average, highest, lowest, passing, failing, total: filteredMarks.length };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {readOnly ? 'Marks & Performance Directory' : 'Marks Management'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {readOnly ? 'View student marks and performance statistics' : 'Add and manage student marks for courses'}
          </p>
        </div>
      </div>

      {/* Search, Filter and Statistics Section - For Principal */}
      {readOnly && stats && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance Statistics</h2>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500 mt-1">Total Records</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.average.toFixed(2)}%</div>
              <div className="text-xs text-gray-500 mt-1">Average</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.highest}%</div>
              <div className="text-xs text-gray-500 mt-1">Highest</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.lowest}%</div>
              <div className="text-xs text-gray-500 mt-1">Lowest</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-green-600">{stats.passing}</div>
              <div className="text-xs text-gray-500 mt-1">Passing</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-red-600">{stats.failing}</div>
              <div className="text-xs text-gray-500 mt-1">Failing</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                Search by Student or Course
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                placeholder="Type to search..."
              />
            </div>
            <div>
              <label htmlFor="filterCourse" className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Course
              </label>
              <select
                id="filterCourse"
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all"
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.name}>{course.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filterGrade" className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Grade
              </label>
              <select
                id="filterGrade"
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all"
              >
                <option value="">All Grades</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">✓</span>
            <p className="font-medium">{success}</p>
          </div>
        </div>
      )}

      {/* Add Marks Form - Only for non-readonly users */}
      {!readOnly && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Marks</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Student Selection */}
              <div>
                <label htmlFor="studentId" className="block text-sm font-semibold text-gray-700 mb-2">
                  Student <span className="text-red-500">*</span>
                </label>
                <select
                  id="studentId"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all"
                  required
                >
                  <option value="">Select Student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.studentId}>
                      {student.name} ({student.studentId})
                    </option>
                  ))}
                </select>
                {students.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2 flex items-center">
                    <span className="mr-1">⚠️</span>
                    No students available. Please add students first.
                  </p>
                )}
              </div>

              {/* Course Selection */}
              <div>
                <label htmlFor="course" className="block text-sm font-semibold text-gray-700 mb-2">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  id="course"
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.name}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
                {courses.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2 flex items-center">
                    <span className="mr-1">⚠️</span>
                    No courses available. Please add courses first.
                  </p>
                )}
              </div>

              {/* Marks Input */}
              <div>
                <label htmlFor="marks" className="block text-sm font-semibold text-gray-700 mb-2">
                  Marks <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="marks"
                  name="marks"
                  value={formData.marks}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="0-100"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || students.length === 0 || courses.length === 0}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
                isSubmitting || students.length === 0 || courses.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 hover:bg-gray-700'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adding Marks...
                </span>
              ) : (
                '✓ Add Marks'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Marks Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Marks Records</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredMarks.length} {filteredMarks.length === 1 ? 'record' : 'records'} {readOnly ? 'found' : 'total'}
          </p>
        </div>
        
        {isLoading && marks.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-lg font-semibold text-gray-700">Loading marks...</p>
          </div>
        ) : filteredMarks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-xl font-semibold text-gray-700 mb-2">
              {marks.length === 0 ? 'No marks records found' : 'No matches found'}
            </p>
            <p className="text-gray-500">
              {marks.length === 0 ? 'Add your first marks record above' : 'Try adjusting your search criteria'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Marks
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date Added
                  </th>
                  {!readOnly && (
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMarks.map((mark, index) => {
                  const getGradeColor = (grade) => {
                    if (grade === 'A+' || grade === 'A') return 'bg-green-100 text-green-800';
                    if (grade === 'B') return 'bg-blue-100 text-blue-800';
                    if (grade === 'C') return 'bg-yellow-100 text-yellow-800';
                    if (grade === 'D') return 'bg-orange-100 text-orange-800';
                    return 'bg-red-100 text-red-800';
                  };

                  const grade = getGrade(mark.marks);
                  const gradeColor = getGradeColor(grade);

                  return (
                    <tr 
                      key={mark.id} 
                      className="hover:bg-purple-50 transition-colors duration-150"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-indigo-600">{mark.studentId}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <StudentAvatar studentId={mark.studentId} name={getStudentName(mark.studentId)} size={9} className="mr-3" />
                          <span className="text-sm font-semibold text-gray-900">
                            {getStudentName(mark.studentId)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                          {mark.course}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900">
                          {mark.marks.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-sm font-bold rounded-full shadow-md ${gradeColor}`}>
                          {grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {mark.createdAt
                          ? new Date(mark.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      {!readOnly && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleEdit(mark)}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold mr-4 transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(mark.id, mark.studentId, mark.course)}
                            className="text-red-600 hover:text-red-900 font-semibold transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal - Only for non-readonly users */}
      {!readOnly && showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Edit Marks</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMark(null);
                  setFormData({
                    studentId: '',
                    course: '',
                    marks: ''
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label htmlFor="edit-studentId" className="block text-sm font-semibold text-gray-700 mb-2">
                  Student <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit-studentId"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">Select Student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.studentId}>
                      {student.name} ({student.studentId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-course" className="block text-sm font-semibold text-gray-700 mb-2">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit-course"
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.name}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-marks" className="block text-sm font-semibold text-gray-700 mb-2">
                  Marks <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="edit-marks"
                  name="marks"
                  value={formData.marks}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0-100"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-2 rounded-lg font-semibold text-white transition-all ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                  }`}
                >
                  {isSubmitting ? 'Updating...' : 'Update Marks'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMark(null);
                    setFormData({
                      studentId: '',
                      course: '',
                      marks: ''
                    });
                  }}
                  className="flex-1 px-6 py-2 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteMarkData(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Marks"
        message={deleteMarkData ? `Are you sure you want to delete marks for ${deleteMarkData.studentId} in ${deleteMarkData.course}?` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />

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

export default Marks;
