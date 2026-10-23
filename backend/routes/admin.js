const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { addStudent, findUserByEmail, findStudentByEmailOrId } = require('../dbHelpers');
const { notifyStudentRequestCreated, notifyStudentRequestStatus } = require('../utils/notificationHelper');

/**
 * Admin Routes
 * Only accessible by users with admin role
 */

// Simple auth check (in production, use proper JWT/session middleware)
const requireAdmin = (req, res, next) => {
  const userRole = req.body.adminRole || req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// POST /api/admin/create-teacher - Admin creates teacher account
router.post('/create-teacher', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, department, assignedCourses } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user account
    db.run(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, 'teacher'],
      function(err) {
        if (err) {
          console.error('Error creating teacher:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to create teacher account'
          });
        }

        const teacherId = this.lastID;

        // Assign courses if provided
        if (assignedCourses && Array.isArray(assignedCourses) && assignedCourses.length > 0) {
          const stmt = db.prepare('INSERT INTO teacher_courses (teacherId, course) VALUES (?, ?)');
          assignedCourses.forEach(courseName => {
            stmt.run(teacherId, courseName);
          });
          stmt.finalize();
        }

        res.json({
          success: true,
          message: 'Teacher account created successfully',
          data: {
            id: teacherId,
            email,
            name,
            role: 'teacher',
            assignedCourses: assignedCourses || []
          }
        });
      }
    );
  } catch (error) {
    console.error('Error in create-teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/admin/create-principal - Admin creates principal account
router.post('/create-principal', requireAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, 'principal'],
      function(err) {
        if (err) {
          console.error('Error creating principal:', err);
          return res.status(500).json({ success: false, message: 'Failed to create principal account' });
        }
        res.json({
          success: true,
          message: 'Principal account created successfully',
          data: { id: this.lastID, email, name, role: 'principal' }
        });
      }
    );
  } catch (error) {
    console.error('Error in create-principal:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/admin/create-student - Admin creates student account directly
router.post('/create-student', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, studentId, department, year } = req.body;

    // Validation
    if (!name || !email || !password || !studentId || !department) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, studentId, and department are required'
      });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if student already exists
    const existingStudent = await findStudentByEmailOrId(email, studentId);
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: 'Student with this email or studentId already exists'
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user account
    db.run(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, 'student'],
      async function(err) {
        if (err) {
          console.error('Error creating student user:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to create student account'
          });
        }

        try {
          // Create student record
          const student = await addStudent({
            name,
            email,
            studentId,
            course: '', // Will be populated via enrollments
            year: year || '1',
            department
          });

          // Auto-enroll in department courses
          db.get('SELECT id FROM departments WHERE name = ?', [department], (err, dept) => {
            if (err || !dept) {
              console.error('Department not found:', department);
              return res.json({
                success: true,
                message: 'Student created but department not found for enrollment',
                data: student
              });
            }

            // Get all courses in this department
            db.all('SELECT id FROM courses WHERE department = ?', [department], (err, courses) => {
              if (err || !courses || courses.length === 0) {
                return res.json({
                  success: true,
                  message: 'Student created but no courses found in department',
                  data: student
                });
              }

              // Enroll student in all department courses
              const stmt = db.prepare('INSERT OR IGNORE INTO enrollments (student_id, course_id, department_id) VALUES (?, ?, ?)');
              courses.forEach(course => {
                stmt.run(student.id, course.id, dept.id);
              });
              stmt.finalize();

              res.json({
                success: true,
                message: `Student created and enrolled in ${courses.length} courses`,
                data: {
                  ...student,
                  department,
                  enrolledCourses: courses.length
                }
              });
            });
          });
        } catch (error) {
          console.error('Error creating student record:', error);
          res.status(500).json({
            success: false,
            message: 'User created but failed to create student record'
          });
        }
      }
    );
  } catch (error) {
    console.error('Error in create-student:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/admin/student-requests - Get all pending student requests
router.get('/student-requests', requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    const statusFilter = status || 'pending';

    const query = `
      SELECT 
        sr.*,
        u.email as requester_email
      FROM student_requests sr
      LEFT JOIN users u ON u.id = sr.requested_by
      WHERE sr.status = ?
      ORDER BY sr.created_at DESC
    `;

    db.all(query, [statusFilter], (err, rows) => {
      if (err) {
        console.error('Error fetching student requests:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch student requests'
        });
      }

      res.json({
        success: true,
        data: rows || [],
        count: rows ? rows.length : 0
      });
    });
  } catch (error) {
    console.error('Error in student-requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/admin/student-requests/count - Get count of pending requests
router.get('/student-requests/count', requireAdmin, (req, res) => {
  try {
    db.get(
      'SELECT COUNT(*) as count FROM student_requests WHERE status = ?',
      ['pending'],
      (err, row) => {
        if (err) {
          console.error('Error counting requests:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to count requests'
          });
        }

        res.json({
          success: true,
          count: row ? row.count : 0
        });
      }
    );
  } catch (error) {
    console.error('Error in count:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/admin/approve-student/:id - Approve student request
router.post('/approve-student/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required for student account'
      });
    }

    // Get the request
    db.get('SELECT * FROM student_requests WHERE id = ?', [id], async (err, request) => {
      if (err) {
        console.error('Error fetching request:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch request'
        });
      }

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Request already ${request.status}`
        });
      }

      // Check if user/student already exists
      const existingUser = await findUserByEmail(request.email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Auto-generate student ID from department code + year if not already set
      let finalStudentId = request.studentId;
      if (!finalStudentId) {
        // Look up department code
        const dept = await new Promise(resolve => {
          db.get('SELECT code FROM departments WHERE name = ?', [request.department], (e, r) => resolve(r));
        });
        if (dept?.code) {
          const yr2 = String(new Date().getFullYear()).slice(-2);
          const prefix = `STU${dept.code.toUpperCase()}${yr2}`;
          const lastRow = await new Promise(resolve => {
            db.get(`SELECT studentId FROM students WHERE studentId LIKE ? ORDER BY studentId DESC LIMIT 1`,
              [`${prefix}%`], (e, r) => resolve(r));
          });
          const seq = lastRow ? (parseInt(lastRow.studentId.slice(prefix.length), 10) || 0) + 1 : 1;
          finalStudentId = `${prefix}${String(seq).padStart(3, '0')}`;
        } else {
          finalStudentId = `STU${Date.now()}`;
        }
      }

      const existingStudent = await findStudentByEmailOrId(request.email, finalStudentId);
      if (existingStudent) {
        return res.status(409).json({
          success: false,
          message: 'Student with this email or studentId already exists'
        });
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Create user account
      db.run(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [request.email, hashedPassword, 'student'],
        async function(err) {
          if (err) {
            console.error('Error creating student user:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to create student account'
            });
          }

          try {
            // Create student record using auto-generated or original ID
            const student = await addStudent({
              name: request.name,
              email: request.email,
              studentId: finalStudentId,
              course: '',
              year: request.batchYear || '1',
              department: request.department
            });

            // Auto-enroll in department courses
            db.get('SELECT id FROM departments WHERE name = ?', [request.department], (err, dept) => {
              if (!err && dept) {
                db.all('SELECT id FROM courses WHERE department = ?', [request.department], (err, courses) => {
                  if (!err && courses && courses.length > 0) {
                    const stmt = db.prepare('INSERT OR IGNORE INTO enrollments (student_id, course_id, department_id) VALUES (?, ?, ?)');
                    courses.forEach(course => {
                      stmt.run(student.id, course.id, dept.id);
                    });
                    stmt.finalize();
                  }
                });
              }
            });

            // Update request status
            db.run(
              'UPDATE student_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              ['approved', id],
              (err) => {
                if (err) {
                  console.error('Error updating request status:', err);
                }

                res.json({
                  success: true,
                  message: 'Student request approved and account created',
                  data: student
                });
              }
            );
          } catch (error) {
            console.error('Error creating student record:', error);
            res.status(500).json({
              success: false,
              message: 'User created but failed to create student record'
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in approve-student:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/admin/reject-student/:id - Reject student request
router.post('/reject-student/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get the request
    db.get('SELECT * FROM student_requests WHERE id = ?', [id], (err, request) => {
      if (err) {
        console.error('Error fetching request:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch request'
        });
      }

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Request already ${request.status}`
        });
      }

      // Update request status
      db.run(
        'UPDATE student_requests SET status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['rejected', reason || 'No reason provided', id],
        (err) => {
          if (err) {
            console.error('Error rejecting request:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to reject request'
            });
          }

          res.json({
            success: true,
            message: 'Student request rejected'
          });
        }
      );
    });
  } catch (error) {
    console.error('Error in reject-student:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;


// GET /api/admin/users - Get all users with their details
router.get('/users', requireAdmin, (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.role,
        CASE 
          WHEN u.role = 'student' THEN s.name
          ELSE u.email
        END as name,
        CASE 
          WHEN u.role = 'student' THEN s.studentId
          ELSE CAST(u.id AS TEXT)
        END as studentId,
        CASE 
          WHEN u.role = 'student' THEN s.department
          WHEN u.role = 'teacher' THEN (
            SELECT GROUP_CONCAT(DISTINCT c.department, ', ')
            FROM semester_teacher_courses stc
            JOIN courses c ON c.id = stc.course_id
            WHERE stc.teacher_id = u.id
          )
          WHEN u.role = 'principal' THEN (
            SELECT GROUP_CONCAT(DISTINCT name, ', ') FROM departments LIMIT 1
          )
          ELSE NULL
        END as department,
        u.created_at
      FROM users u
      LEFT JOIN students s ON u.email = s.email AND u.role = 'student'
      ORDER BY u.created_at DESC
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch users'
        });
      }

      res.json({
        success: true,
        data: rows || []
      });
    });
  } catch (error) {
    console.error('Error in get users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/admin/users/:id - Delete a user and all related records
router.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { currentUserEmail } = req.body;

    // Get user details
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
      if (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch user'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent admin from deleting their own account
      if (user.email === currentUserEmail) {
        return res.status(403).json({
          success: false,
          message: 'You cannot delete your own account'
        });
      }

      // Start transaction-like deletion
      const deleteOperations = [];

      if (user.role === 'student') {
        // Get student record
        db.get('SELECT * FROM students WHERE email = ?', [user.email], (err, student) => {
          if (err) {
            console.error('Error fetching student record:', err);
            return res.status(500).json({
              success: false,
              message: 'Database error'
            });
          }

          // If student record exists, delete all related records
          if (student) {
            // Delete all related records
            db.serialize(() => {
              // Delete attendance records
              db.run('DELETE FROM attendance WHERE studentId = ?', [student.studentId], (err) => {
                if (err) console.error('Error deleting attendance:', err);
              });

              // Delete marks records
              db.run('DELETE FROM marks WHERE studentId = ?', [student.studentId], (err) => {
                if (err) console.error('Error deleting marks:', err);
              });

              // Delete fee records
              db.run('DELETE FROM fees WHERE studentId = ?', [student.studentId], (err) => {
                if (err) console.error('Error deleting fees:', err);
              });

              // Delete enrollments
              db.run('DELETE FROM enrollments WHERE student_id = ?', [student.id], (err) => {
                if (err) console.error('Error deleting enrollments:', err);
              });

              // Delete student record
              db.run('DELETE FROM students WHERE id = ?', [student.id], (err) => {
                if (err) {
                  console.error('Error deleting student:', err);
                  return res.status(500).json({
                    success: false,
                    message: 'Failed to delete student record'
                  });
                }

                // Finally delete user account
                db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
                  if (err) {
                    console.error('Error deleting user:', err);
                    return res.status(500).json({
                      success: false,
                      message: 'Failed to delete user account'
                    });
                  }

                  res.json({
                    success: true,
                    message: 'Student and all related records deleted successfully'
                  });
                });
              });
            });
          } else {
            // No student record found, just delete the user account
            console.log('No student record found for user, deleting user account only');
            db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
              if (err) {
                console.error('Error deleting user:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to delete user account'
                });
              }

              res.json({
                success: true,
                message: 'User account deleted successfully (no student record found)'
              });
            });
          }
        });
      } else if (user.role === 'teacher') {
        // Delete teacher-related records
        db.serialize(() => {
          // Delete teacher-course assignments
          db.run('DELETE FROM teacher_courses WHERE teacherId = ?', [id], (err) => {
            if (err) console.error('Error deleting teacher courses:', err);
          });

          // Delete assignments created by teacher
          db.run('DELETE FROM assignments WHERE teacher_id = ?', [id], (err) => {
            if (err) console.error('Error deleting assignments:', err);
          });

          // Delete user account
          db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
            if (err) {
              console.error('Error deleting user:', err);
              return res.status(500).json({
                success: false,
                message: 'Failed to delete user account'
              });
            }

            res.json({
              success: true,
              message: 'Teacher and all related records deleted successfully'
            });
          });
        });
      } else if (user.role === 'principal') {
        // Delete principal account (no related records typically)
        db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
          if (err) {
            console.error('Error deleting user:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to delete user account'
            });
          }

          res.json({
            success: true,
            message: 'Principal account deleted successfully'
          });
        });
      } else {
        // For other roles, just delete the user
        db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
          if (err) {
            console.error('Error deleting user:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to delete user account'
            });
          }

          res.json({
            success: true,
            message: 'User deleted successfully'
          });
        });
      }
    });
  } catch (error) {
    console.error('Error in delete user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


// PUT /api/admin/users/:id - Update a user's details
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, year, studentId, role, password, assignedCourses } = req.body;

    // Get current user details
    db.get('SELECT * FROM users WHERE id = ?', [id], async (err, user) => {
      if (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch user'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const oldEmail = user.email;
      const oldRole = user.role;

      // Update user account (email, password, role)
      let updateUserQuery = 'UPDATE users SET email = ?, role = ?';
      let updateUserParams = [email, role];

      if (password && password.trim() !== '') {
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync(password, 10);
        updateUserQuery += ', password = ?';
        updateUserParams.push(hashedPassword);
      }

      updateUserQuery += ' WHERE id = ?';
      updateUserParams.push(id);

      db.run(updateUserQuery, updateUserParams, async (err) => {
        if (err) {
          console.error('Error updating user:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to update user account'
          });
        }

        // Handle role-specific updates
        if (role === 'student') {
          // Check if student record exists
          db.get('SELECT * FROM students WHERE email = ?', [oldEmail], (err, student) => {
            if (err) {
              console.error('Error fetching student:', err);
              return res.status(500).json({
                success: false,
                message: 'Database error'
              });
            }

            if (student) {
              // If department changed, clear batch assignment
              const deptChanged = department && student.department !== department;
              const newBatchId = deptChanged ? null : student.batch_id;

              db.run(
                `UPDATE students SET name = ?, email = ?, department = ?, year = ?, studentId = ?, batch_id = ? WHERE id = ?`,
                [name, email, department, year, studentId, newBatchId, student.id],
                (err) => {
                  if (err) {
                    console.error('Error updating student:', err);
                    return res.status(500).json({
                      success: false,
                      message: 'Failed to update student record'
                    });
                  }

                  res.json({
                    success: true,
                    message: deptChanged
                      ? 'Student updated. Batch assignment cleared due to department change.'
                      : 'Student updated successfully',
                    batchCleared: deptChanged
                  });
                }
              );
            } else if (oldRole !== 'student' && role === 'student') {
              // Role changed to student, create student record
              db.run(
                `INSERT INTO students (name, email, studentId, course, year, department) VALUES (?, ?, ?, ?, ?, ?)`,
                [name, email, studentId, '', year, department],
                (err) => {
                  if (err) {
                    console.error('Error creating student record:', err);
                    return res.status(500).json({
                      success: false,
                      message: 'User updated but failed to create student record'
                    });
                  }

                  res.json({
                    success: true,
                    message: 'User converted to student successfully'
                  });
                }
              );
            } else {
              res.json({
                success: true,
                message: 'User updated (no student record found)'
              });
            }
          });
        } else if (role === 'teacher') {
          // Update teacher course assignments
          if (assignedCourses && Array.isArray(assignedCourses)) {
            // Delete existing assignments
            db.run('DELETE FROM teacher_courses WHERE teacherId = ?', [id], (err) => {
              if (err) {
                console.error('Error deleting old assignments:', err);
              }

              // Insert new assignments
              if (assignedCourses.length > 0) {
                const stmt = db.prepare('INSERT INTO teacher_courses (teacherId, course) VALUES (?, ?)');
                assignedCourses.forEach(courseName => {
                  stmt.run(id, courseName);
                });
                stmt.finalize((err) => {
                  if (err) {
                    console.error('Error assigning courses:', err);
                    return res.status(500).json({
                      success: false,
                      message: 'User updated but failed to assign courses'
                    });
                  }

                  res.json({
                    success: true,
                    message: `Teacher updated with ${assignedCourses.length} course(s) assigned`
                  });
                });
              } else {
                res.json({
                  success: true,
                  message: 'Teacher updated successfully'
                });
              }
            });
          } else {
            res.json({
              success: true,
              message: 'Teacher updated successfully'
            });
          }
        } else {
          // For principal and admin, just return success
          res.json({
            success: true,
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} updated successfully`
          });
        }
      });
    });
  } catch (error) {
    console.error('Error in update user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
