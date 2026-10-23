const express = require('express');
const router = express.Router();
const db = require('../database');
const { notifyAssignmentCreated } = require('../utils/notificationHelper');

// Get all assignments (admin view)
router.get('/', (req, res) => {
  const query = `
    SELECT a.*, u.email as teacher_email
    FROM assignments a
    LEFT JOIN users u ON a.teacher_id = u.id
    ORDER BY a.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching assignments:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: rows || [] });
  });
});

// Get assignments by teacher ID
router.get('/teacher/:teacherId', (req, res) => {
  const { teacherId } = req.params;
  
  const query = `
    SELECT a.*, u.email as teacher_email
    FROM assignments a
    LEFT JOIN users u ON a.teacher_id = u.id
    WHERE a.teacher_id = ?
    ORDER BY a.created_at DESC
  `;
  
  db.all(query, [teacherId], (err, rows) => {
    if (err) {
      console.error('Error fetching teacher assignments:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: rows || [] });
  });
});

// Get assignments for a student — by their batch's semester_courses
router.get('/student/:studentId', (req, res) => {
  const { studentId } = req.params;

  db.get('SELECT id, batch_id FROM students WHERE studentId = ?', [studentId], (err, student) => {
    if (err || !student) return res.json({ success: true, data: [] });

    // Get all course names assigned to this student's batch
    db.all(
      `SELECT DISTINCT c.name as course_name
       FROM semester_courses sc
       JOIN courses c ON c.id = sc.course_id
       WHERE sc.batch_id = ?`,
      [student.batch_id],
      (err2, courses) => {
        if (err2 || !courses || courses.length === 0) {
          return res.json({ success: true, data: [] });
        }

        const courseNames = courses.map(c => c.course_name);
        const placeholders = courseNames.map(() => '?').join(',');

        db.all(
          `SELECT a.*, u.email as teacher_email
           FROM assignments a
           LEFT JOIN users u ON a.teacher_id = u.id
           WHERE a.course IN (${placeholders})
           ORDER BY a.due_date ASC, a.created_at DESC`,
          courseNames,
          (e, rows) => res.json({ success: true, data: rows || [] })
        );
      }
    );
  });
});

// Create new assignment (teacher only)
router.post('/', (req, res) => {
  const { title, description, course, teacher_id, due_date, total_marks } = req.body;
  
  if (!title || !course || !teacher_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Title, course, and teacher ID are required' 
    });
  }
  
  const query = `
    INSERT INTO assignments (title, description, course, teacher_id, due_date, total_marks)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.run(
    query,
    [title, description || null, course, teacher_id, due_date || null, total_marks || 100],
    function(err) {
      if (err) {
        console.error('Error creating assignment:', err);
        return res.status(500).json({ success: false, message: 'Failed to create assignment' });
      }
      
      // Send notification to students
      try {
        const teacherQuery = 'SELECT email FROM users WHERE id = ?';
        db.get(teacherQuery, [teacher_id], (err, teacher) => {
          const teacherName = teacher ? teacher.email.split('@')[0] : 'Teacher';
          notifyAssignmentCreated(course, title, due_date || new Date(), teacherName);
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
      
      res.json({ 
        success: true, 
        message: 'Assignment created successfully',
        assignmentId: this.lastID
      });
    }
  );
});

// Update assignment
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, course, due_date, total_marks } = req.body;
  
  if (!title || !course) {
    return res.status(400).json({ 
      success: false, 
      message: 'Title and course are required' 
    });
  }
  
  const query = `
    UPDATE assignments 
    SET title = ?, description = ?, course = ?, due_date = ?, total_marks = ?
    WHERE id = ?
  `;
  
  db.run(
    query,
    [title, description || null, course, due_date || null, total_marks || 100, id],
    function(err) {
      if (err) {
        console.error('Error updating assignment:', err);
        return res.status(500).json({ success: false, message: 'Failed to update assignment' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }
      
      res.json({ success: true, message: 'Assignment updated successfully' });
    }
  );
});

// DELETE /api/assignments/bulk - Delete multiple assignments
router.delete('/bulk', (req, res) => {
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'ids array is required and must not be empty'
    });
  }
  
  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM assignments WHERE id IN (${placeholders})`;
  
  db.run(query, ids, function(err) {
    if (err) {
      console.error('Error bulk deleting assignments:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete assignments' });
    }
    
    res.json({
      success: true,
      message: `Successfully deleted ${this.changes} assignment(s)`,
      deletedCount: this.changes
    });
  });
});

// Delete assignment
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = 'DELETE FROM assignments WHERE id = ?';
  
  db.run(query, [id], function(err) {
    if (err) {
      console.error('Error deleting assignment:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete assignment' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    
    res.json({ success: true, message: 'Assignment deleted successfully' });
  });
});

module.exports = router;
