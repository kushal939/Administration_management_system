const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { findUserByEmail, addStudent, findStudentByEmailOrId } = require('../dbHelpers');

const ALLOWED_ROLES = ['student', 'teacher', 'admin', 'principal'];

// POST /login
router.post('/login', async (req, res) => {
  try {
    let { email, password, role } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and role are required'
      });
    }

    email = String(email).trim();
    role = String(role).trim().toLowerCase();

    // Validate role
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`
      });
    }

    // Find user by email
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Normalize stored role and compare
    const storedRole = String(user.role || '').trim().toLowerCase();

    if (storedRole !== role) {
      return res.status(403).json({
        success: false,
        message: 'Role mismatch: provided role does not match user role'
      });
    }

    // Return success response with role
    let studentId = null;
    let studentName = null;
    if (storedRole === 'student') {
      const studentRow = await new Promise((resolve) => {
        db.get('SELECT studentId, name FROM students WHERE email = ?', [email], (err, row) => resolve(row || null));
      });
      studentId = studentRow?.studentId || null;
      studentName = studentRow?.name || null;
    }

    res.json({
      success: true,
      message: 'Login successful',
      role: user.role,
      email: user.email,
      id: user.id,
      name: studentName || user.email,
      studentId
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /register - DISABLED FOR PUBLIC USE
// Public registration is not allowed in institutional AMS
// Only admin can create accounts directly
router.post('/register', async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Public registration is disabled. Please contact your administrator to create an account.'
  });
});

module.exports = router;

