const db = require('./database');

console.log('🎓 Initializing Batch Management System...\n');

// Create batches table
const createBatchesTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_name TEXT NOT NULL,
      department TEXT NOT NULL,
      start_year INTEGER,
      end_year INTEGER,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('❌ Error creating batches table:', err.message);
    } else {
      console.log('✅ Batches table created successfully');
      insertSampleBatches();
    }
  });
};

// Add batch_id column to students table
const addBatchColumnToStudents = () => {
  const sql = `ALTER TABLE students ADD COLUMN batch_id INTEGER`;

  db.run(sql, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✅ batch_id column already exists in students table');
      } else {
        console.error('❌ Error adding batch_id column:', err.message);
      }
    } else {
      console.log('✅ batch_id column added to students table');
    }
  });
};

// Insert sample batches
const insertSampleBatches = () => {
  const sampleBatches = [
    { batch_name: 'BIT 2024', department: 'BIT', start_year: 2024, end_year: 2028, status: 'active' },
    { batch_name: 'BPH 2023', department: 'BPH', start_year: 2023, end_year: 2027, status: 'active' },
    { batch_name: 'Computer Science 2024', department: 'Computer Science', start_year: 2024, end_year: 2028, status: 'active' },
    { batch_name: 'Mathematics 2023', department: 'Mathematics', start_year: 2023, end_year: 2027, status: 'active' },
    { batch_name: 'Physics 2024', department: 'Physics', start_year: 2024, end_year: 2028, status: 'active' }
  ];

  const insertSql = `
    INSERT INTO batches (batch_name, department, start_year, end_year, status)
    VALUES (?, ?, ?, ?, ?)
  `;

  let inserted = 0;
  sampleBatches.forEach((batch) => {
    db.run(insertSql, [batch.batch_name, batch.department, batch.start_year, batch.end_year, batch.status], (err) => {
      if (err) {
        console.log(`⚠️  Batch "${batch.batch_name}" may already exist`);
      } else {
        inserted++;
        console.log(`✅ Created batch: ${batch.batch_name}`);
      }
      
      if (inserted === sampleBatches.length) {
        console.log('\n🎉 Batch system initialization complete!');
        console.log('\n📊 Sample batches created:');
        displayBatches();
      }
    });
  });
};

// Display all batches
const displayBatches = () => {
  db.all('SELECT * FROM batches ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching batches:', err);
    } else {
      console.table(rows);
      process.exit(0);
    }
  });
};

// Initialize
createBatchesTable();
addBatchColumnToStudents();
