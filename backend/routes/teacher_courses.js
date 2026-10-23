const express = require('express');
const router = express.Router();
const db = require('../database');
const { 
  assignTeacherToCourse, 
  getCoursesByTeacherId, 
  findUserByEmail,
  getAllCourses 
} = require('../dbHelpers');

// POST /api/teacher-courses - assign teacher to course
router.post('/', async (req, res) => {
  try {
    const { teacherId, course, teacherEmail } = req.body;

    let resolvedTeacherId = teacherId;
    if (!resolvedTeacherId && teacherEmail) {
      const user = await findUserByEmail(teacherEmail);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Teacher not found' });
      }
      resolvedTeacherId = user.id;
    }

    if (!resolvedTeacherId || !course) {
      return res.status(400).json({ success: false, message: 'teacherId (or teacherEmail) and course are required' });
    }

    const result = await assignTeacherToCourse(resolvedTeacherId, course);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('Assign teacher course error', err);
    res.status(500).json({ success: false, message: 'Failed to assign teacher to course' });
  }
});

// GET /api/teacher-courses - list all mappings
router.get('/', async (req, res) => {
  try {
    db.all('SELECT tc.id, tc.teacherId, tc.course, u.email as teacherEmail FROM teacher_courses tc LEFT JOIN users u ON tc.teacherId = u.id ORDER BY tc.created_at DESC', (err, rows) => {
      if (err) {
        console.error('List teacher courses error', err);
        return res.status(500).json({ success: false, message: 'Failed to list mappings' });
      }
      res.json({ success: true, data: rows });
    });
  } catch (err) {
    console.error('List teacher courses error', err);
    res.status(500).json({ success: false, message: 'Failed to list mappings' });
  }
});

// GET /api/teacher-courses/teachers - list teacher users (MUST be before /:teacherId)
router.get('/teachers', async (req, res) => {
  try {
    db.all("SELECT id, email, email as name FROM users WHERE LOWER(role) = 'teacher' ORDER BY email ASC", (err, rows) => {
      if (err) {
        console.error('List teachers error', err);
        return res.status(500).json({ success: false, message: 'Failed to list teachers' });
      }
      res.json({ success: true, data: rows });
    });
  } catch (err) {
    console.error('List teachers error', err);
    res.status(500).json({ success: false, message: 'Failed to list teachers' });
  }
});

// GET /api/teacher-courses/:teacherId
router.get('/:teacherId', async (req, res) => {
  try {
    const teacherId = Number(req.params.teacherId);
    if (!teacherId) return res.status(400).json({ success: false, message: 'Invalid teacherId' });
    const courses = await getCoursesByTeacherId(teacherId);
    res.json({ success: true, courses });
  } catch (err) {
    console.error('Get teacher courses error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher courses' });
  }
});

// GET /api/teacher-courses/:teacherId/courses - Get courses assigned to teacher with full details
router.get('/:teacherId/courses', async (req, res) => {
  try {
    const teacherId = Number(req.params.teacherId);
    if (!teacherId) return res.status(400).json({ success: false, message: 'Invalid teacherId' });
    
    // Get course names assigned to teacher
    const courseNames = await getCoursesByTeacherId(teacherId);
    
    // Fetch full course details
    const allCourses = await getAllCourses();
    const teacherCourses = allCourses.filter(c => courseNames.includes(c.name));
    
    res.json({ success: true, data: teacherCourses, count: teacherCourses.length });
  } catch (err) {
    console.error('Get teacher courses error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher courses' });
  }
});

// DELETE /api/teacher-courses/:id - remove mapping
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    db.run('DELETE FROM teacher_courses WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Delete mapping error', err);
        return res.status(500).json({ success: false, message: 'Failed to delete mapping' });
      }
      res.json({ success: true, message: 'Mapping removed' });
    });
  } catch (err) {
    console.error('Delete mapping error', err);
    res.status(500).json({ success: false, message: 'Failed to delete mapping' });
  }
});

module.exports = router;
