const express = require('express');
const router = express.Router();
const db = require('../database');

// Get notifications for current user
router.get('/', (req, res) => {
  try {
    const user = req.session?.user || JSON.parse(req.headers['x-user'] || '{}');
    const userRole = user.role?.toLowerCase();
    const userId = user.id;
    const userEmail = user.email;

    if (!userRole || !userId) {
      return res.json({ success: false, message: 'User not authenticated' });
    }

    // For students: match by studentId (stored in recipient_id) OR by numeric user id OR by role
    // For other roles: match by role OR by user id
    const sql = `
      SELECT * FROM notifications
      WHERE (
        recipient_role = ?
        OR recipient_id = ?
        OR recipient_id = CAST(? AS TEXT)
        OR (? = 'student' AND recipient_id IN (
          SELECT studentId FROM students WHERE email = ?
        ))
      )
      ORDER BY created_at DESC
      LIMIT 50
    `;

    db.all(sql, [userRole, String(userId), String(userId), userRole, userEmail], (err, rows) => {
      if (err) {
        console.error('Error fetching notifications:', err);
        return res.json({ success: false, message: 'Failed to fetch notifications' });
      }
      res.json({ success: true, data: rows || [] });
    });
  } catch (error) {
    console.error('Error in notifications route:', error);
    res.json({ success: false, message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:id/read', (req, res) => {
  const { id } = req.params;

  const sql = 'UPDATE notifications SET is_read = 1 WHERE id = ?';
  
  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error marking notification as read:', err);
      return res.json({ success: false, message: 'Failed to update notification' });
    }
    res.json({ success: true, message: 'Notification marked as read' });
  });
});

// Mark all notifications as read for current user
router.put('/mark-all-read', (req, res) => {
  try {
    const user = req.session?.user || JSON.parse(req.headers['x-user'] || '{}');
    const userRole = user.role?.toLowerCase();
    const userId = user.id;
    const userEmail = user.email;

    const sql = `
      UPDATE notifications
      SET is_read = 1
      WHERE is_read = 0 AND (
        recipient_role = ?
        OR recipient_id = ?
        OR recipient_id = CAST(? AS TEXT)
        OR (? = 'student' AND recipient_id IN (
          SELECT studentId FROM students WHERE email = ?
        ))
      )
    `;

    db.run(sql, [userRole, String(userId), String(userId), userRole, userEmail], function(err) {
      if (err) {
        console.error('Error marking all as read:', err);
        return res.json({ success: false, message: 'Failed to update notifications' });
      }
      res.json({ success: true, message: 'All notifications marked as read', changes: this.changes });
    });
  } catch (error) {
    console.error('Error in mark-all-read route:', error);
    res.json({ success: false, message: 'Server error' });
  }
});

// Delete notification
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM notifications WHERE id = ?';
  
  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error deleting notification:', err);
      return res.json({ success: false, message: 'Failed to delete notification' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  });
});

// Create notification (internal use by other routes)
const createNotification = (data) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO notifications (title, message, type, recipient_role, recipient_id, sender_id, sender_name, related_entity, related_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.title,
      data.message,
      data.type,
      data.recipient_role || null,
      data.recipient_id || null,
      data.sender_id || null,
      data.sender_name || null,
      data.related_entity || null,
      data.related_id || null
    ];

    db.run(sql, values, function(err) {
      if (err) {
        console.error('Error creating notification:', err);
        reject(err);
      } else {
        resolve({ id: this.lastID });
      }
    });
  });
};

module.exports = router;
module.exports.createNotification = createNotification;
