const express = require('express');
const router = express.Router();
const db = require('../database');

// ── Init table ────────────────────────────────────────────────────────────────
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    specialization TEXT,
    joining_date TEXT,
    photo_url TEXT,
    bio TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

// ── GET /api/profile/by-student-id/:studentId ────────────────────────────────
router.get('/by-student-id/:studentId', (req, res) => {
  db.get(`
    SELECT p.photo_url
    FROM students s
    JOIN users u ON u.email = s.email
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE s.studentId = ?
  `, [req.params.studentId], (err, row) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, data: row || {} });
  });
});

// ── GET /api/profile?userId= ──────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, message: 'userId required' });

  db.get(`
    SELECT p.*, u.email, u.role,
      CASE WHEN u.role='student' THEN s.name
           ELSE COALESCE(p.full_name, u.email) END as display_name,
      s.studentId, s.department, s.batch_id, s.current_semester, s.roll_number,
      b.batch_name
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN students s ON s.email = u.email AND u.role = 'student'
    LEFT JOIN batches b ON b.id = s.batch_id
    WHERE u.id = ?
  `, [userId], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: row });
  });
});

// ── PUT /api/profile ──────────────────────────────────────────────────────────
router.put('/', (req, res) => {
  const { userId, full_name, phone, address, guardian_name, guardian_phone, specialization, joining_date, bio, photo_url } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId required' });

  db.run(`
    INSERT INTO profiles (user_id, full_name, phone, address, guardian_name, guardian_phone, specialization, joining_date, bio, photo_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      full_name=COALESCE(excluded.full_name, full_name),
      phone=COALESCE(excluded.phone, phone),
      address=COALESCE(excluded.address, address),
      guardian_name=COALESCE(excluded.guardian_name, guardian_name),
      guardian_phone=COALESCE(excluded.guardian_phone, guardian_phone),
      specialization=COALESCE(excluded.specialization, specialization),
      joining_date=COALESCE(excluded.joining_date, joining_date),
      bio=COALESCE(excluded.bio, bio),
      photo_url=COALESCE(excluded.photo_url, photo_url),
      updated_at=CURRENT_TIMESTAMP
  `, [userId, full_name, phone, address, guardian_name, guardian_phone, specialization, joining_date, bio, photo_url],
  function(err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (full_name) {
      db.run(`UPDATE students SET name=? WHERE email=(SELECT email FROM users WHERE id=?)`, [full_name, userId]);
    }
    res.json({ success: true, message: 'Profile saved' });
  });
});

module.exports = router;
