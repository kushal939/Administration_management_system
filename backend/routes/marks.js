const express = require('express');
const router = express.Router();
const { getAllMarks, getMarksByStudentId, addMarks, updateMarks, deleteMarks } = require('../dbHelpers');
const db = require('../database');
const { notifyMarksAdded } = require('../utils/notificationHelper');

// POST /api/marks - Add marks
router.post('/', async (req, res) => {
  try {
    const { studentId, course, marks: marksValue } = req.body;

    // Validate required fields
    if (!studentId || !course || marksValue === undefined || marksValue === null) {
      return res.status(400).json({
        success: false,
        message: 'studentId, course, and marks are required'
      });
    }

    // Validate marks is a valid number
    const numericMarks = Number(marksValue);
    if (isNaN(numericMarks)) {
      return res.status(400).json({
        success: false,
        message: 'Marks must be a valid number'
      });
    }

    // Add marks record to database
    const newMark = await addMarks({
      studentId,
      course,
      marks: numericMarks
    });

    // Send notification to student
    try {
      const studentQuery = 'SELECT name FROM students WHERE studentId = ?';
      db.get(studentQuery, [studentId], (err, student) => {
        if (!err && student) {
          const subject = req.body.subject || course;
          const totalMarks = req.body.totalMarks || req.body.total_marks || 100;
          const teacherName = req.body.teacherName || 'Teacher';
          notifyMarksAdded(studentId, student.name, subject, numericMarks, totalMarks, teacherName);
        }
      });
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Marks added successfully',
      data: newMark
    });

  } catch (error) {
    console.error('Error adding marks:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/marks - Get all marks (with optional filters)
router.get('/', async (req, res) => {
  try {
    // Optional query parameters for filtering
    const { studentId, course } = req.query;

    const filters = {};
    if (studentId) filters.studentId = studentId;
    if (course) filters.course = course;

    const marks = await getAllMarks(filters);

    res.json({
      success: true,
      data: marks,
      count: marks.length
    });
  } catch (error) {
    console.error('Error fetching marks:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/marks/:studentId - Get marks by student
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const studentMarks = await getMarksByStudentId(studentId);

    res.json({
      success: true,
      data: studentMarks,
      count: studentMarks.length
    });
  } catch (error) {
    console.error('Error fetching marks:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/marks/:id - Update marks
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, course, marks: marksValue } = req.body;

    if (!studentId || !course || marksValue === undefined || marksValue === null) {
      return res.status(400).json({
        success: false,
        message: 'studentId, course, and marks are required'
      });
    }

    const numericMarks = Number(marksValue);
    if (isNaN(numericMarks)) {
      return res.status(400).json({
        success: false,
        message: 'Marks must be a valid number'
      });
    }

    // Check if marks record exists
    db.get('SELECT * FROM marks WHERE id = ?', [Number(id)], async (err, mark) => {
      if (err) {
        console.error('Error fetching marks:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }

      if (!mark) {
        return res.status(404).json({
          success: false,
          message: 'Marks record not found'
        });
      }

      try {
        // Update marks
        const updatedMarks = await updateMarks(Number(id), { studentId, course, marks: numericMarks });

        res.json({
          success: true,
          message: 'Marks updated successfully',
          data: updatedMarks
        });
      } catch (error) {
        console.error('Error updating marks:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  } catch (error) {
    console.error('Error updating marks:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/marks/:id - Delete marks record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if marks record exists
    db.get('SELECT * FROM marks WHERE id = ?', [Number(id)], async (err, mark) => {
      if (err) {
        console.error('Error fetching marks:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }

      if (!mark) {
        return res.status(404).json({
          success: false,
          message: 'Marks record not found'
        });
      }

      try {
        // Delete marks
        const result = await deleteMarks(Number(id));

        if (result.deleted) {
          res.json({
            success: true,
            message: 'Marks deleted successfully'
          });
        } else {
          res.status(404).json({
            success: false,
            message: 'Marks record not found'
          });
        }
      } catch (error) {
        console.error('Error deleting marks:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  } catch (error) {
    console.error('Error deleting marks:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
