const express = require('express');
const router = express.Router();
const { getAllCourses, addCourse, findCourseByCode, updateCourse, deleteCourse, getCourseById } = require('../dbHelpers');
const db = require('../database');

// GET /api/courses - Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await getAllCourses();
    res.json({
      success: true,
      data: courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/courses - Add a new course
router.post('/', async (req, res) => {
  try {
    const { name, code, department, credits } = req.body;

    // Validate required fields
    if (!name || !code || !department) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, and department are required'
      });
    }

    // Check if course with same code already exists
    const existingCourse = await findCourseByCode(code);

    if (existingCourse) {
      return res.status(409).json({
        success: false,
        message: 'Course with this code already exists'
      });
    }

    // Add course to database
    const newCourse = await addCourse({ name, code, department, credits });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Course added successfully',
      data: newCourse
    });

  } catch (error) {
    console.error('Error adding course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/courses/:id - Update a course
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, department, credits } = req.body;

    if (!name || !code || !department) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, and department are required'
      });
    }

    // Check if course exists
    const existingCourse = await getCourseById(Number(id));
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Update course
    const updatedCourse = await updateCourse(Number(id), { name, code, department, credits });

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/courses/:id - Delete a course
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if course exists
    const existingCourse = await getCourseById(Number(id));
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course has enrollments
    db.get('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?', [Number(id)], async (err, row) => {
      if (err) {
        console.error('Error checking enrollments:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }

      if (row.count > 0) {
        return res.status(409).json({
          success: false,
          message: `Cannot delete course. ${row.count} student(s) are enrolled in this course.`
        });
      }

      try {
        // Delete course
        const result = await deleteCourse(Number(id));

        if (result.deleted) {
          res.json({
            success: true,
            message: 'Course deleted successfully'
          });
        } else {
          res.status(404).json({
            success: false,
            message: 'Course not found'
          });
        }
      } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
