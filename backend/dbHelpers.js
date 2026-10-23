const db = require('./database');

// Find user by email
function findUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

// Students functions
function getAllStudents() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM students ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function addStudent(studentData) {
  return new Promise((resolve, reject) => {
    const { name, email, studentId, course, year, department } = studentData;
    db.run('INSERT INTO students (name, email, studentId, course, year, department) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, studentId, course, year, department], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, ...studentData, created_at: new Date().toISOString() });
    });
  });
}

function findStudentByEmailOrId(email, studentId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM students WHERE email = ? OR studentId = ?', [email, studentId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function getStudentById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM students WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Courses functions
function getAllCourses() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM courses ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function addCourse(courseData) {
  return new Promise((resolve, reject) => {
    const { name, code, department, credits } = courseData;
    db.run('INSERT INTO courses (name, code, department, credits) VALUES (?, ?, ?, ?)',
      [name, code, department, credits], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, ...courseData, created_at: new Date().toISOString() });
    });
  });
}

function findCourseByCode(code) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM courses WHERE code = ?', [code], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

// Departments functions
function getAllDepartments() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM departments ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function addDepartment(deptData) {
  return new Promise((resolve, reject) => {
    const { name, code } = deptData;
    db.run('INSERT INTO departments (name, code) VALUES (?, ?)',
      [name, code], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, ...deptData, created_at: new Date().toISOString() });
    });
  });
}

function findDepartmentByName(name) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM departments WHERE LOWER(name) = LOWER(?)', [name], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

// Teacher-course mapping helpers
function assignTeacherToCourse(teacherId, course) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO teacher_courses (teacherId, course) VALUES (?, ?)', [teacherId, course], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, teacherId, course });
    });
  });
}

function getCoursesByTeacherId(teacherId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT course FROM teacher_courses WHERE teacherId = ?', [teacherId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => r.course));
    });
  });
}

// Attendance functions
function getAllAttendance(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM attendance';
    const params = [];
    const conditions = [];

    if (filters.studentId) {
      conditions.push('studentId = ?');
      params.push(filters.studentId);
    }
    if (filters.course) {
      conditions.push('course = ?');
      params.push(filters.course);
    }
    if (filters.date) {
      conditions.push('date = ?');
      params.push(filters.date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function addAttendance(attendanceData) {
  return new Promise((resolve, reject) => {
    const { studentId, course, date, status } = attendanceData;
    db.run('INSERT INTO attendance (studentId, course, date, status) VALUES (?, ?, ?, ?)',
      [studentId, course, date, status], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, ...attendanceData, created_at: new Date().toISOString() });
    });
  });
}

function updateAttendance(id, status) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE attendance SET status = ? WHERE id = ?', [status, id], function(err) {
      if (err) return reject(err);
      resolve({ id, status });
    });
  });
}

// Marks functions
function getAllMarks(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM marks';
    const params = [];
    const conditions = [];

    if (filters.studentId) {
      conditions.push('studentId = ?');
      params.push(filters.studentId);
    }
    if (filters.course) {
      conditions.push('course = ?');
      params.push(filters.course);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function getMarksByStudentId(studentId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM marks WHERE studentId = ? ORDER BY created_at DESC', [studentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function addMarks(marksData) {
  return new Promise((resolve, reject) => {
    const { studentId, course, marks } = marksData;
    db.run('INSERT INTO marks (studentId, course, marks) VALUES (?, ?, ?)',
      [studentId, course, marks], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, ...marksData, created_at: new Date().toISOString() });
    });
  });
}

// Notices functions
function getAllNotices() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM notices ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function addNotice(noticeData) {
  return new Promise((resolve, reject) => {
    const { title, content, author, type, priority } = noticeData;
    db.run('INSERT INTO notices (title, content, author, type, priority) VALUES (?, ?, ?, ?, ?)',
      [title, content, author, type, priority], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, ...noticeData, created_at: new Date().toISOString() });
    });
  });
}

// Fees functions
function getAllFees(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM fees';
    const params = [];
    const conditions = [];

    if (filters.studentId) {
      conditions.push('studentId = ?');
      params.push(filters.studentId);
    }
    if (typeof filters.paid !== 'undefined') {
      conditions.push('paid = ?');
      params.push(filters.paid ? 1 : 0);
    }
    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function addFee(feeData) {
  return new Promise((resolve, reject) => {
    const { studentId, amount, description, due_date, category } = feeData;
    db.run('INSERT INTO fees (studentId, amount, description, category, due_date) VALUES (?, ?, ?, ?, ?)',
      [studentId, amount, description, category || 'general', due_date], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, ...feeData, created_at: new Date().toISOString(), paid: 0 });
    });
  });
}

function markFeePaid(id) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE fees SET paid = 1 WHERE id = ?', [id], function(err) {
      if (err) return reject(err);
      resolve({ id, paid: 1 });
    });
  });
}

// Enrollment functions
function enrollStudentInCourse(studentId, courseId, departmentId) {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR IGNORE INTO enrollments (student_id, course_id, department_id) VALUES (?, ?, ?)',
      [studentId, courseId, departmentId], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, student_id: studentId, course_id: courseId, department_id: departmentId });
    });
  });
}

function getEnrolledStudentsByCourse(courseId) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT s.* FROM students s 
            JOIN enrollments e ON e.student_id = s.id 
            WHERE e.course_id = ? 
            ORDER BY s.name ASC`, [courseId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getStudentEnrollments(studentId) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT c.*, e.enrolled_at, d.name as department_name 
            FROM enrollments e 
            JOIN courses c ON c.id = e.course_id 
            JOIN departments d ON d.id = e.department_id 
            WHERE e.student_id = ?`, [studentId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getCoursesByDepartment(departmentName) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM courses WHERE department = ? ORDER BY name ASC', [departmentName], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getDepartmentByName(name) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM departments WHERE name = ?', [name], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function getCourseById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM courses WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// UPDATE/DELETE functions for CRUD operations

function updateStudent(id, studentData) {
  return new Promise((resolve, reject) => {
    const { name, email, studentId, course, year, department } = studentData;
    db.run('UPDATE students SET name = ?, email = ?, studentId = ?, course = ?, year = ?, department = ? WHERE id = ?',
      [name, email, studentId, course, year, department, id], function(err) {
      if (err) return reject(err);
      resolve({ id, ...studentData });
    });
  });
}

function deleteStudent(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
      if (err) return reject(err);
      resolve({ id, deleted: this.changes > 0 });
    });
  });
}

function updateCourse(id, courseData) {
  return new Promise((resolve, reject) => {
    const { name, code, department, credits } = courseData;
    db.run('UPDATE courses SET name = ?, code = ?, department = ?, credits = ? WHERE id = ?',
      [name, code, department, credits, id], function(err) {
      if (err) return reject(err);
      resolve({ id, ...courseData });
    });
  });
}

function deleteCourse(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM courses WHERE id = ?', [id], function(err) {
      if (err) return reject(err);
      resolve({ id, deleted: this.changes > 0 });
    });
  });
}

function updateDepartment(id, deptData) {
  return new Promise((resolve, reject) => {
    const { name, code } = deptData;
    db.run('UPDATE departments SET name = ?, code = ? WHERE id = ?',
      [name, code, id], function(err) {
      if (err) return reject(err);
      resolve({ id, ...deptData });
    });
  });
}

function deleteDepartment(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM departments WHERE id = ?', [id], function(err) {
      if (err) return reject(err);
      resolve({ id, deleted: this.changes > 0 });
    });
  });
}

function deleteAttendance(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM attendance WHERE id = ?', [id], function(err) {
      if (err) return reject(err);
      resolve({ id, deleted: this.changes > 0 });
    });
  });
}

function updateMarks(id, marksData) {
  return new Promise((resolve, reject) => {
    const { studentId, course, marks } = marksData;
    db.run('UPDATE marks SET studentId = ?, course = ?, marks = ? WHERE id = ?',
      [studentId, course, marks, id], function(err) {
      if (err) return reject(err);
      resolve({ id, ...marksData });
    });
  });
}

function deleteMarks(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM marks WHERE id = ?', [id], function(err) {
      if (err) return reject(err);
      resolve({ id, deleted: this.changes > 0 });
    });
  });
}

function updateNotice(id, noticeData) {
  return new Promise((resolve, reject) => {
    const { title, content, author, type, priority } = noticeData;
    db.run('UPDATE notices SET title = ?, content = ?, author = ?, type = ?, priority = ? WHERE id = ?',
      [title, content, author, type, priority, id], function(err) {
      if (err) return reject(err);
      resolve({ id, ...noticeData });
    });
  });
}

function deleteNotice(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM notices WHERE id = ?', [id], function(err) {
      if (err) return reject(err);
      resolve({ id, deleted: this.changes > 0 });
    });
  });
}

function updateFee(id, feeData) {
  return new Promise((resolve, reject) => {
    const { studentId, amount, description, category, due_date, paid } = feeData;
    db.run('UPDATE fees SET studentId = ?, amount = ?, description = ?, category = ?, due_date = ?, paid = ? WHERE id = ?',
      [studentId, amount, description, category, due_date, paid || 0, id], function(err) {
      if (err) return reject(err);
      resolve({ id, ...feeData });
    });
  });
}

function deleteFee(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM fees WHERE id = ?', [id], function(err) {
      if (err) return reject(err);
      resolve({ id, deleted: this.changes > 0 });
    });
  });
}

module.exports = {
  findUserByEmail,
  getAllStudents,
  addStudent,
  findStudentByEmailOrId,
  getAllCourses,
  addCourse,
  findCourseByCode,
  getAllDepartments,
  addDepartment,
  findDepartmentByName,
  getAllAttendance,
  addAttendance,
  updateAttendance,
  getAllMarks,
  getMarksByStudentId,
  addMarks,
  getAllNotices,
  addNotice,
  assignTeacherToCourse,
  getCoursesByTeacherId,
  getAllFees,
  addFee,
  markFeePaid,
  getStudentById,
  enrollStudentInCourse,
  getEnrolledStudentsByCourse,
  getStudentEnrollments,
  getCoursesByDepartment,
  getDepartmentByName,
  getCourseById,
  // CRUD operations
  updateStudent,
  deleteStudent,
  updateCourse,
  deleteCourse,
  updateDepartment,
  deleteDepartment,
  deleteAttendance,
  updateMarks,
  deleteMarks,
  updateNotice,
  deleteNotice,
  updateFee,
  deleteFee
};
