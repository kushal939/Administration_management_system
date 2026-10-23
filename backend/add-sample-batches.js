const db = require('./database');

async function addSampleBatches() {
  try {
    console.log('Adding sample batches...');

    const batches = [
      {
        batch_name: 'BCA 2024',
        department: 'Computer Science',
        start_year: 2024,
        end_year: 2027,
        status: 'active'
      },
      {
        batch_name: 'MCA 2023',
        department: 'Computer Science',
        start_year: 2023,
        end_year: 2025,
        status: 'active'
      },
      {
        batch_name: 'MBA 2024',
        department: 'Management',
        start_year: 2024,
        end_year: 2026,
        status: 'active'
      },
      {
        batch_name: 'B.Tech 2022',
        department: 'Engineering',
        start_year: 2022,
        end_year: 2026,
        status: 'active'
      },
      {
        batch_name: 'BBA 2021',
        department: 'Management',
        start_year: 2021,
        end_year: 2024,
        status: 'completed'
      }
    ];

    for (const batch of batches) {
      await db.run(
        `INSERT INTO batches (batch_name, department, start_year, end_year, status, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [batch.batch_name, batch.department, batch.start_year, batch.end_year, batch.status]
      );
      console.log(`✓ Added batch: ${batch.batch_name}`);
    }

    console.log('\n✅ Successfully added 5 sample batches!');
    console.log('\nYou can now view them in the Batch Management section.');
    
  } catch (error) {
    console.error('Error adding batches:', error);
  } finally {
    process.exit(0);
  }
}

addSampleBatches();
