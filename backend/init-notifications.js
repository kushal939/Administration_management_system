const db = require('./database');

// Create notifications table
const createNotificationsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      recipient_role TEXT,
      recipient_id TEXT,
      sender_id TEXT,
      sender_name TEXT,
      related_entity TEXT,
      related_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('Error creating notifications table:', err.message);
    } else {
      console.log('✓ Notifications table created successfully');
    }
  });
};

// Initialize
createNotificationsTable();

console.log('Notification system initialized!');
