const express = require('express');
const cors = require('cors');
require('express-async-errors'); // Handle async errors in routes
const { initDatabase } = require('./initDatabase');
const db = require('./database');

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Import routes
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const coursesRoutes = require('./routes/courses');
const departmentsRoutes = require('./routes/departments');
const attendanceRoutes = require('./routes/attendance');
const marksRoutes = require('./routes/marks');
const noticesRoutes = require('./routes/notices');
const analyticsRoutes = require('./routes/analytics');
const teacherCoursesRoutes = require('./routes/teacher_courses');
const feesRoutes = require('./routes/fees');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const reportsRoutes = require('./routes/reports');
const assignmentsRoutes = require('./routes/assignments');
const ocrRoutes = require('./routes/ocr');
const adminOcrRoutes = require('./routes/adminOcrRoutes');
const teacherOcrRoutes = require('./routes/teacherOcrRoutes');
const notificationsRoutes = require('./routes/notifications');
const adminBatchRoutes = require('./routes/adminBatchRoutes');
const teacherBatchRoutes = require('./routes/teacherBatchRoutes');
const principalBatchRoutes = require('./routes/principalBatchRoutes');
const erpRoutes = require('./routes/erpRoutes');
const resultsRoutes = require('./routes/results');
const profilesRoutes = require('./routes/profiles');
const submissionsRoutes = require('./routes/submissions');
const messagesRoutes = require('./routes/messages');

const app = express();

// Enable CORS
app.use(cors());

// Enable JSON parsing — 5MB limit to support base64 photo uploads
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/teacher-courses', teacherCoursesRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminOcrRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/teacher', teacherOcrRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminBatchRoutes);
app.use('/api/teacher', teacherBatchRoutes);
app.use('/api/principal', principalBatchRoutes);
app.use('/api/admin/erp', erpRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/profile', profilesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/messages', messagesRoutes);

// Log registered routes (for debugging)
console.log('Registered API routes:');
console.log('  - /api/auth');
console.log('  - /api/students');
console.log('  - /api/courses');
console.log('  - /api/departments');
console.log('  - /api/attendance');
console.log('  - /api/marks');
console.log('  - /api/notices');
console.log('  - /api/analytics');
console.log('  - /api/teacher-courses');
console.log('  - /api/fees');
console.log('  - /api/admin');
console.log('  - /api/admin/ocr/student-document ✨ NEW');
console.log('  - /api/teacher');
console.log('  - /api/teacher/ocr/marksheet ✨ NEW');
console.log('  - /api/reports');
console.log('  - /api/assignments ✨ NEW');
console.log('  - /api/ocr ✨ NEW');
console.log('  - /api/notifications ✨ NEW');
console.log('  - /api/admin/batches ✨ BATCH MANAGEMENT');
console.log('  - /api/teacher/batches ✨ BATCH MANAGEMENT');
console.log('  - /api/principal/batch-stats ✨ BATCH MANAGEMENT');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware (must be after routes)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Serve built frontend (for production/demo)
const path = require('path');
const fs = require('fs');
const frontendBuild = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
} else {
  // 404 handler (dev mode — no build)
  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });
}

// Initialize database and start server
const PORT = process.env.PORT || 3001;

initDatabase()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    
    // Handle server errors
    server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nClosing database connection...');
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database closed.');
        }
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\nClosing database connection...');
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database closed.');
        }
        process.exit(0);
      });
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
