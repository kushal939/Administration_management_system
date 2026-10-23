const express = require('express');
const router = express.Router();
const db = require('../database');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS targeted_notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// ── GET /api/messages/contacts — list of people the current user can message
router.get('/contacts', (req, res) => {
  const { user_id, role } = req.query;
  let sql;

  if (role === 'admin') {
    // admin → teachers + principal
    sql = `SELECT u.id, u.email, u.role,
             COALESCE(p.full_name, u.email) as label
           FROM users u
           LEFT JOIN profiles p ON p.user_id = u.id
           WHERE u.role IN ('teacher','principal') AND u.id != ${Number(user_id)}
           ORDER BY u.role, label`;

  } else if (role === 'principal') {
    // principal → teachers + admin
    sql = `SELECT u.id, u.email, u.role,
             COALESCE(p.full_name, u.email) as label
           FROM users u
           LEFT JOIN profiles p ON p.user_id = u.id
           WHERE u.role IN ('teacher','admin') AND u.id != ${Number(user_id)}
           ORDER BY u.role, label`;

  } else if (role === 'teacher') {
    // teacher → students (assigned batches only) + admin + principal (NO other teachers)
    sql = `
      SELECT u.id, u.email, u.role,
        COALESCE(s.name, u.email) as label,
        s.batch_id as batch_id
      FROM users u
      LEFT JOIN students s ON s.email = u.email
      WHERE u.role = 'student'
        AND u.id != ${Number(user_id)}
        AND s.batch_id IN (
          SELECT batch_id FROM batch_teachers WHERE teacher_id = ${Number(user_id)}
          UNION
          SELECT batch_id FROM semester_teachers WHERE teacher_id = ${Number(user_id)}
        )
      UNION
      SELECT id, email, role, email as label, NULL as batch_id
      FROM users WHERE role IN ('admin','principal') AND id != ${Number(user_id)}
      ORDER BY role, label
    `;

  } else if (role === 'student') {
    // student → all teachers + principal
    sql = `
      SELECT u.id, u.email, u.role,
        COALESCE(p.full_name, u.email) as label
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.role IN ('teacher','principal') AND u.id != ${Number(user_id)}
      ORDER BY u.role, label
    `;

  } else {
    sql = `SELECT id, email, role, email as label FROM users WHERE id != ${Number(user_id)} ORDER BY role, email`;
  }

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows || [] });
  });
});

// ── GET /api/messages/inbox/:userId
router.get('/inbox/:userId', (req, res) => {
  db.all(`
    SELECT m.*, u.email as sender_email,
      COALESCE(s.name, u.email) as sender_name, u.role as sender_role
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    LEFT JOIN students s ON s.email = u.email
    WHERE m.receiver_id = ?
    ORDER BY m.created_at DESC
  `, [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows || [] });
  });
});

// ── GET /api/messages/sent/:userId
router.get('/sent/:userId', (req, res) => {
  db.all(`
    SELECT m.*, u.email as receiver_email,
      COALESCE(s.name, u.email) as receiver_name, u.role as receiver_role
    FROM messages m
    JOIN users u ON u.id = m.receiver_id
    LEFT JOIN students s ON s.email = u.email
    WHERE m.sender_id = ?
    ORDER BY m.created_at DESC
  `, [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows || [] });
  });
});

// ── GET /api/messages/thread/:userId/:otherId — conversation between two users
router.get('/thread/:userId/:otherId', (req, res) => {
  const { userId, otherId } = req.params;
  db.all(`
    SELECT m.*,
      su.email as sender_email, COALESCE(ss.name, su.email) as sender_name,
      ru.email as receiver_email, COALESCE(rs.name, ru.email) as receiver_name
    FROM messages m
    JOIN users su ON su.id = m.sender_id
    LEFT JOIN students ss ON ss.email = su.email
    JOIN users ru ON ru.id = m.receiver_id
    LEFT JOIN students rs ON rs.email = ru.email
    WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?)
    ORDER BY m.created_at ASC
  `, [userId, otherId, otherId, userId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    // mark as read
    db.run(`UPDATE messages SET is_read=1 WHERE receiver_id=? AND sender_id=?`, [userId, otherId]);
    res.json({ success: true, data: rows || [] });
  });
});

// ── POST /api/messages — send a message
router.post('/', (req, res) => {
  const { sender_id, receiver_id, subject, body } = req.body;
  if (!sender_id || !receiver_id || !body) {
    return res.status(400).json({ success: false, message: 'sender_id, receiver_id, body required' });
  }
  db.run(`INSERT INTO messages (sender_id, receiver_id, subject, body) VALUES (?,?,?,?)`,
    [sender_id, receiver_id, subject || null, body],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// ── PUT /api/messages/:id/read
router.put('/:id/read', (req, res) => {
  db.run(`UPDATE messages SET is_read=1 WHERE id=?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

// ── DELETE /api/messages/:id
router.delete('/:id', (req, res) => {
  db.run(`DELETE FROM messages WHERE id=?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

// ── GET /api/messages/unread-count/:userId
router.get('/unread-count/:userId', (req, res) => {
  db.get(`SELECT COUNT(*) as count FROM messages WHERE receiver_id=? AND is_read=0`,
    [req.params.userId], (err, row) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true, count: row?.count || 0 });
    }
  );
});

// ── TARGETED NOTICES ──────────────────────────────────────────────────────────

// GET /api/messages/notices — get targeted notices visible to current user
router.get('/notices', (req, res) => {
  const { role, batch_id, department } = req.query;
  db.all(`
    SELECT tn.*, u.email as sender_email, COALESCE(s.name, u.email) as sender_name
    FROM targeted_notices tn
    JOIN users u ON u.id = tn.sender_id
    LEFT JOIN students s ON s.email = u.email
    WHERE tn.target_type='all'
      OR (tn.target_type='role' AND tn.target_value=?)
      OR (tn.target_type='department' AND tn.target_value=?)
      OR (tn.target_type='batch' AND tn.target_value=?)
    ORDER BY tn.created_at DESC
  `, [role || '', department || '', batch_id || ''], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows || [] });
  });
});

// GET /api/messages/notices/all — admin sees all notices they sent
router.get('/notices/all', (req, res) => {
  const { sender_id } = req.query;
  db.all(`
    SELECT tn.*, u.email as sender_email
    FROM targeted_notices tn
    JOIN users u ON u.id = tn.sender_id
    ${sender_id ? 'WHERE tn.sender_id=?' : ''}
    ORDER BY tn.created_at DESC
  `, sender_id ? [sender_id] : [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows || [] });
  });
});

// POST /api/messages/notices — create targeted notice
router.post('/notices', (req, res) => {
  const { sender_id, title, body, target_type, target_value } = req.body;
  if (!sender_id || !title || !body || !target_type) {
    return res.status(400).json({ success: false, message: 'sender_id, title, body, target_type required' });
  }
  db.run(`INSERT INTO targeted_notices (sender_id, title, body, target_type, target_value) VALUES (?,?,?,?,?)`,
    [sender_id, title, body, target_type, target_value || null],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// DELETE /api/messages/notices/:id
router.delete('/notices/:id', (req, res) => {
  db.run(`DELETE FROM targeted_notices WHERE id=?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
