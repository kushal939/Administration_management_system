const express = require('express');
const router = express.Router();
const { 
  getAllDepartments, 
  addDepartment, 
  findDepartmentByName,
  getCoursesByDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentByName
} = require('../dbHelpers');
const db = require('../database');

// GET /api/departments - Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await getAllDepartments();
    res.json({
      success: true,
      data: departments,
      count: departments.length
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/departments - Add a new department
router.post('/', async (req, res) => {
  try {
    const { name, code } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    // Check if department with same name already exists
    const existingDepartment = await findDepartmentByName(name);

    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        message: 'Department with this name already exists'
      });
    }

    // Add department to database
    const newDepartment = await addDepartment({ name, code });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Department added successfully',
      data: newDepartment
    });

  } catch (error) {
    console.error('Error adding department:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/departments/:name/courses - Get courses by department
router.get('/:name/courses', async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    const courses = await getCoursesByDepartment(name);

    res.json({
      success: true,
      data: courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error fetching department courses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/departments/:id - Update a department
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    // Check if department exists
    db.get('SELECT * FROM departments WHERE id = ?', [Number(id)], async (err, dept) => {
      if (err) {
        console.error('Error fetching department:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }

      if (!dept) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }

      try {
        // Update department
        const updatedDepartment = await updateDepartment(Number(id), { name, code });

        res.json({
          success: true,
          message: 'Department updated successfully',
          data: updatedDepartment
        });
      } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/departments/:id - Delete a department
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if department exists
    db.get('SELECT * FROM departments WHERE id = ?', [Number(id)], async (err, dept) => {
      if (err) {
        console.error('Error fetching department:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }

      if (!dept) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }

      // Check if department has courses
      const courses = await getCoursesByDepartment(dept.name);
      if (courses.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Cannot delete department. ${courses.length} course(s) belong to this department.`
        });
      }

      try {
        // Delete department
        const result = await deleteDepartment(Number(id));

        if (result.deleted) {
          res.json({
            success: true,
            message: 'Department deleted successfully'
          });
        } else {
          res.status(404).json({
            success: false,
            message: 'Department not found'
          });
        }
      } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
