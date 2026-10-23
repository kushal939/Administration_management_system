const db = require('../database');

// Admin: Create Batch
const createBatch = (req, res) => {
  const { batch_name, department, start_year, end_year, total_semesters } = req.body;

  if (!batch_name || !department) {
    return res.status(400).json({
      success: false,
      message: 'Batch name and department are required'
    });
  }

  // Auto-add total_semesters column if it doesn't exist (safe migration)
  db.run(`ALTER TABLE batches ADD COLUMN total_semesters INTEGER DEFAULT 8`, () => {
    // Ignore error if column already exists
    const sems = total_semesters ? parseInt(total_semesters) : ((end_year - start_year) * 2) || 8;
    const sql = `
      INSERT INTO batches (batch_name, department, start_year, end_year, status, total_semesters)
      VALUES (?, ?, ?, ?, 'active', ?)
    `;

    db.run(sql, [batch_name, department, start_year, end_year, sems], function(err) {
      if (err) {
        console.error('Error creating batch:', err);
        return res.status(500).json({ success: false, message: 'Failed to create batch' });
      }
      res.status(201).json({
        success: true,
        message: 'Batch created successfully',
        data: { id: this.lastID, batch_name, department, start_year, end_year, status: 'active', total_semesters: sems }
      });
    });
  });
};

// Admin: Get All Batches with Student Count
const getAllBatches = (req, res) => {
  const sql = `
    SELECT 
      b.*,
      COUNT(s.id) as student_count
    FROM batches b
    LEFT JOIN students s ON b.id = s.batch_id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching batches:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch batches'
      });
    }

    res.json({
      success: true,
      data: rows || [],
      count: rows ? rows.length : 0
    });
  });
};

// Admin: Update Batch
const updateBatch = (req, res) => {
  const { id } = req.params;
  const { batch_name, status } = req.body;

  if (!batch_name && !status) {
    return res.status(400).json({
      success: false,
      message: 'At least one field (batch_name or status) is required'
    });
  }

  let sql = 'UPDATE batches SET ';
  const params = [];

  if (batch_name) {
    sql += 'batch_name = ?';
    params.push(batch_name);
  }

  if (status) {
    if (params.length > 0) sql += ', ';
    sql += 'status = ?';
    params.push(status);
  }

  sql += ' WHERE id = ?';
  params.push(id);

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error updating batch:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to update batch'
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    res.json({
      success: true,
      message: 'Batch updated successfully'
    });
  });
};

// Admin: Get Students in Batch
const getBatchStudents = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      s.*,
      b.batch_name,
      b.department as batch_department
    FROM students s
    LEFT JOIN batches b ON s.batch_id = b.id
    WHERE s.batch_id = ?
    ORDER BY s.name
  `;

  db.all(sql, [id], (err, rows) => {
    if (err) {
      console.error('Error fetching batch students:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch students'
      });
    }

    res.json({
      success: true,
      data: rows || [],
      count: rows ? rows.length : 0
    });
  });
};

// Teacher: Get Batches assigned to this teacher (via batch_teachers table)
const getTeacherBatches = (req, res) => {
  const { teacherId } = req.query;

  if (!teacherId) {
    return res.status(400).json({ success: false, message: 'teacherId is required' });
  }

  // Ensure batch_teachers table exists first
  db.run(`CREATE TABLE IF NOT EXISTS batch_teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, teacher_id)
  )`, () => {
    const sql = `
      SELECT DISTINCT b.*, COUNT(DISTINCT s.id) as student_count
      FROM batches b
      LEFT JOIN students s ON s.batch_id = b.id
      WHERE b.id IN (
        SELECT batch_id FROM batch_teachers WHERE teacher_id = ?
        UNION
        SELECT batch_id FROM semester_teachers WHERE teacher_id = ?
      )
      GROUP BY b.id
      ORDER BY b.start_year DESC
    `;
    db.all(sql, [teacherId, teacherId], (err, rows) => {
      if (err) {
        console.error('Error fetching teacher batches:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch batches' });
      }
      res.json({ success: true, data: rows || [], count: rows ? rows.length : 0 });
    });
  });
};

// Principal: Get Batch Statistics
const getPrincipalBatchStats = (req, res) => {
  const sql = `
    SELECT 
      b.id,
      b.batch_name,
      b.department,
      b.start_year,
      b.end_year,
      b.status,
      COUNT(DISTINCT s.id) as student_count,
      ROUND(AVG(CASE WHEN m.marks IS NOT NULL THEN m.marks ELSE 0 END), 2) as average_marks,
      ROUND(
        (COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(a.id), 0)), 2
      ) as average_attendance
    FROM batches b
    LEFT JOIN students s ON b.id = s.batch_id
    LEFT JOIN marks m ON s.studentId = m.studentId
    LEFT JOIN attendance a ON s.studentId = a.studentId
    WHERE b.status = 'active'
    GROUP BY b.id
    ORDER BY b.start_year DESC, b.batch_name
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching batch statistics:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch batch statistics'
      });
    }

    res.json({
      success: true,
      data: rows || [],
      count: rows ? rows.length : 0
    });
  });
};

// Get Batches by Department (for dropdowns)
const getBatchesByDepartment = (req, res) => {
  const { department } = req.query;

  if (!department) {
    return res.status(400).json({
      success: false,
      message: 'Department is required'
    });
  }

  const sql = `
    SELECT id, batch_name, department, start_year, end_year, status
    FROM batches
    WHERE department = ? AND status = 'active'
    ORDER BY start_year DESC
  `;

  db.all(sql, [department], (err, rows) => {
    if (err) {
      console.error('Error fetching batches by department:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch batches'
      });
    }

    res.json({
      success: true,
      data: rows || []
    });
  });
};

// Get Students by Batch (for attendance/marks)
const getStudentsByBatch = (req, res) => {
  const { batchId, courseId } = req.query;

  if (!batchId) {
    return res.status(400).json({
      success: false,
      message: 'Batch ID is required'
    });
  }

  let sql = `
    SELECT 
      s.id,
      s.studentId,
      s.name,
      s.email,
      s.department,
      s.batch_id,
      b.batch_name
    FROM students s
    LEFT JOIN batches b ON s.batch_id = b.id
    WHERE s.batch_id = ?
  `;

  const params = [batchId];

  // If courseId provided, check enrollment
  if (courseId) {
    sql += ` AND EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.student_id = s.id AND e.course_id = ?
    )`;
    params.push(courseId);
  }

  sql += ' ORDER BY s.name';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching students by batch:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch students'
      });
    }

    res.json({
      success: true,
      data: rows || [],
      count: rows ? rows.length : 0
    });
  });
};

// Admin: Delete Batch
const deleteBatch = (req, res) => {
  const { id } = req.params;

  // First check if batch has students
  db.get('SELECT COUNT(*) as count FROM students WHERE batch_id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error checking batch students:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to check batch'
      });
    }

    if (row.count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete batch with ${row.count} student(s). Please reassign or remove students first.`
      });
    }

    // Delete batch
    db.run('DELETE FROM batches WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting batch:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete batch'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Batch not found'
        });
      }

      res.json({
        success: true,
        message: 'Batch deleted successfully'
      });
    });
  });
};

module.exports = {
  createBatch,
  getAllBatches,
  updateBatch,
  getBatchStudents,
  getTeacherBatches,
  getPrincipalBatchStats,
  getBatchesByDepartment,
  getStudentsByBatch,
  deleteBatch
};


// PHASE 1: Core Batch-Student Management

// Step 2: Assign Students to Batch
const assignStudentsToBatch = (req, res) => {
  const { id } = req.params;
  const { studentIds } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Student IDs array is required'
    });
  }

  db.get('SELECT * FROM batches WHERE id = ?', [id], (err, batch) => {
    if (err) {
      console.error('Error checking batch:', err);
      return res.status(500).json({ success: false, message: 'Failed to assign students' });
    }
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const placeholders = studentIds.map(() => '?').join(',');
    const sql = `UPDATE students SET batch_id = ? WHERE id IN (${placeholders})`;
    const params = [id, ...studentIds];

    db.run(sql, params, function(err) {
      if (err) {
        console.error('Error assigning students to batch:', err);
        return res.status(500).json({ success: false, message: 'Failed to assign students to batch' });
      }
      res.json({
        success: true,
        message: `${studentIds.length} student(s) assigned to batch successfully`
      });
    });
  });
};

// Step 3: Remove Students from Batch
const removeStudentsFromBatch = (req, res) => {
  const { id } = req.params;
  const { studentIds } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Student IDs array is required'
    });
  }

  const placeholders = studentIds.map(() => '?').join(',');
  const sql = `UPDATE students SET batch_id = NULL WHERE id IN (${placeholders}) AND batch_id = ?`;
  const params = [...studentIds, id];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error removing students from batch:', err);
      return res.status(500).json({ success: false, message: 'Failed to remove students from batch' });
    }
    res.json({
      success: true,
      message: `${this.changes} student(s) removed from batch successfully`
    });
  });
};

// Get Unassigned Students (for assignment modal)
const getUnassignedStudents = (req, res) => {
  const sql = `
    SELECT 
      s.id,
      s.studentId,
      s.name,
      s.email,
      s.department,
      s.year
    FROM students s
    WHERE s.batch_id IS NULL
    ORDER BY s.name
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching unassigned students:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch unassigned students'
      });
    }

    res.json({
      success: true,
      data: rows || [],
      count: rows ? rows.length : 0
    });
  });
};

// Get All Students with Batch Info (for reassignment)
const getAllStudentsWithBatch = (req, res) => {
  const sql = `
    SELECT 
      s.id,
      s.studentId,
      s.name,
      s.email,
      s.department,
      s.year,
      s.batch_id,
      b.batch_name
    FROM students s
    LEFT JOIN batches b ON s.batch_id = b.id
    ORDER BY s.name
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching students:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch students'
      });
    }

    res.json({
      success: true,
      data: rows || [],
      count: rows ? rows.length : 0
    });
  });
};

module.exports = {
  createBatch,
  getAllBatches,
  updateBatch,
  getBatchStudents,
  getTeacherBatches,
  getPrincipalBatchStats,
  getBatchesByDepartment,
  getStudentsByBatch,
  deleteBatch,
  // Phase 1 exports
  assignStudentsToBatch,
  removeStudentsFromBatch,
  getUnassignedStudents,
  getAllStudentsWithBatch
};


// PHASE 2: Batch Lifecycle Management

// Step 4: Update Batch Status
const updateBatchStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['active', 'completed', 'archived', 'upcoming'];
  
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  db.run(
    'UPDATE batches SET status = ? WHERE id = ?',
    [status, id],
    function(err) {
      if (err) {
        console.error('Error updating batch status:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to update batch status'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Batch not found'
        });
      }

      res.json({
        success: true,
        message: `Batch status updated to ${status}`
      });
    }
  );
};

// Step 5: Clone Batch
const cloneBatch = (req, res) => {
  const { id } = req.params;
  const { batch_name, copy_students } = req.body;

  // Get original batch
  db.get('SELECT * FROM batches WHERE id = ?', [id], (err, originalBatch) => {
    if (err) {
      console.error('Error fetching batch:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch batch'
      });
    }
    
    if (!originalBatch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Create new batch name if not provided
    let newBatchName = batch_name;
    if (!newBatchName) {
      // Auto-increment year in name (e.g., "BCA 2024" -> "BCA 2025")
      const yearMatch = originalBatch.batch_name.match(/(\d{4})/);
      if (yearMatch) {
        const oldYear = parseInt(yearMatch[1]);
        const newYear = oldYear + 1;
        newBatchName = originalBatch.batch_name.replace(oldYear.toString(), newYear.toString());
      } else {
        newBatchName = `${originalBatch.batch_name} (Copy)`;
      }
    }

    // Create new batch
    db.run(
      `INSERT INTO batches (batch_name, department, start_year, end_year, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        newBatchName,
        originalBatch.department,
        originalBatch.start_year + 1,
        originalBatch.end_year + 1,
        'upcoming'
      ],
      function(err) {
        if (err) {
          console.error('Error creating batch:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to clone batch'
          });
        }

        const newBatchId = this.lastID;

        // Copy students if requested
        if (copy_students) {
          db.run(
            `UPDATE students SET batch_id = ? WHERE batch_id = ?`,
            [newBatchId, id],
            (err) => {
              if (err) {
                console.error('Error copying students:', err);
              }
            }
          );
        }

        // Get the new batch with student count
        db.get(
          `SELECT b.*, COUNT(s.id) as student_count
           FROM batches b
           LEFT JOIN students s ON b.id = s.batch_id
           WHERE b.id = ?
           GROUP BY b.id`,
          [newBatchId],
          (err, newBatch) => {
            if (err) {
              console.error('Error fetching new batch:', err);
              return res.status(500).json({
                success: false,
                message: 'Batch cloned but failed to fetch details'
              });
            }

            res.status(201).json({
              success: true,
              message: 'Batch cloned successfully',
              data: newBatch
            });
          }
        );
      }
    );
  });
};

// Phase 3: Step 6 - Export All Batches
const exportAllBatches = (req, res) => {
  const XLSX = require('xlsx');
  
  db.all(`
    SELECT 
      b.id,
      b.batch_name,
      b.department,
      b.start_year,
      b.end_year,
      b.status,
      COUNT(s.id) as student_count,
      b.created_at
    FROM batches b
    LEFT JOIN students s ON s.batch_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `, [], (err, batches) => {
    if (err) {
      console.error('Error fetching batches for export:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to export batches'
      });
    }

    // Format data for Excel
    const exportData = batches.map(batch => ({
      'Batch ID': batch.id,
      'Batch Name': batch.batch_name,
      'Department': batch.department,
      'Start Year': batch.start_year,
      'End Year': batch.end_year,
      'Status': batch.status,
      'Total Students': batch.student_count,
      'Created Date': new Date(batch.created_at).toLocaleDateString()
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 10 }, // Batch ID
      { wch: 25 }, // Batch Name
      { wch: 20 }, // Department
      { wch: 12 }, // Start Year
      { wch: 12 }, // End Year
      { wch: 12 }, // Status
      { wch: 15 }, // Total Students
      { wch: 15 }  // Created Date
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Batches');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename=batches_${Date.now()}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  });
};

// Phase 3: Step 6 - Export Batch Students
const exportBatchStudents = (req, res) => {
  const XLSX = require('xlsx');
  const { id } = req.params;

  // Get batch info
  db.get('SELECT * FROM batches WHERE id = ?', [id], (err, batch) => {
    if (err || !batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Get students
    db.all(`
      SELECT 
        s.id,
        s.studentId,
        s.name,
        s.email,
        s.year,
        s.department,
        s.created_at
      FROM students s
      WHERE s.batch_id = ?
      ORDER BY s.name
    `, [id], (err, students) => {
      if (err) {
        console.error('Error fetching students for export:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to export students'
        });
      }

      // Format data for Excel
      const exportData = students.map(student => ({
        'Student ID': student.studentId,
        'Name': student.name,
        'Email': student.email,
        'Year': student.year,
        'Department': student.department,
        'Enrolled Date': new Date(student.created_at).toLocaleDateString()
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Add batch info sheet
      const batchInfo = [
        ['Batch Information'],
        ['Batch Name', batch.batch_name],
        ['Department', batch.department],
        ['Start Year', batch.start_year],
        ['End Year', batch.end_year],
        ['Status', batch.status],
        ['Total Students', students.length],
        ['Export Date', new Date().toLocaleDateString()]
      ];
      const wsInfo = XLSX.utils.aoa_to_sheet(batchInfo);
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Batch Info');

      // Add students sheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 15 }, // Student ID
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 10 }, // Year
        { wch: 20 }, // Department
        { wch: 15 }  // Enrolled Date
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Students');

      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // Set headers for download
      const filename = `${batch.batch_name.replace(/\s+/g, '_')}_students_${Date.now()}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    });
  });
};

module.exports = {
  createBatch,
  getAllBatches,
  updateBatch,
  getBatchStudents,
  getTeacherBatches,
  getPrincipalBatchStats,
  getBatchesByDepartment,
  getStudentsByBatch,
  deleteBatch,
  // Phase 1 exports
  assignStudentsToBatch,
  removeStudentsFromBatch,
  getUnassignedStudents,
  getAllStudentsWithBatch,
  // Phase 2 exports
  updateBatchStatus,
  cloneBatch,
  // Phase 3 exports
  exportAllBatches,
  exportBatchStudents
};
